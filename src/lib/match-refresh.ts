import { prisma } from '@/lib/db';
import { getFixtureDetails, getFixtureEvents, getFixturePlayerStats, clearFixtureCaches } from '@/lib/api-football';
import { calculatePlayerPoints } from '@/lib/scoring';

export const LIVE_CACHE_TTL_MS = 55_000; // 55 seconds — aligned with 1-min client polling

// Grace period after FT during which we keep refreshing.
// API-Football final stats (ratings, complete event list) can take 20+ min
// to fully settle, so we must keep refreshing for a while past FT.
export const FINISHED_GRACE_MS = 30 * 60 * 1000; // 30 minutes

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

// Simple in-memory lock to prevent thundering herd on the same fixture
const refreshLocks = new Map<number, Promise<void>>();

// Track when each fixture was first detected as finished, so the grace period
// actually expires (rather than being reset by every poll while status===FT)
const finishedAt = new Map<number, number>();

async function refreshMatchData(fixtureId: number) {
  const existing = refreshLocks.get(fixtureId);
  if (existing) {
    await existing;
    return;
  }

  let resolve!: () => void;
  const lockPromise = new Promise<void>(r => { resolve = r; });
  refreshLocks.set(fixtureId, lockPromise);

  try {
    const prevCache = await prisma.matchCache.findUnique({ where: { fixtureId } });
    const prevStatus = prevCache?.status;

    const fixture = await getFixtureDetails(fixtureId);
    const status = fixture.fixture.status.short;
    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;
    const elapsed = fixture.fixture.status.elapsed ?? 0;
    const extra = fixture.fixture.status.extra ?? 0;
    const minute = elapsed + extra || null;

    const isNowFinished = FINISHED_STATUSES.has(status);
    const wasNotFinished = !prevStatus || !FINISHED_STATUSES.has(prevStatus);
    if (isNowFinished && wasNotFinished) {
      console.log(`[Live] Match ${fixtureId} just finished (${status}), clearing caches for final stats`);
      clearFixtureCaches(fixtureId);
      if (!finishedAt.has(fixtureId)) {
        finishedAt.set(fixtureId, Date.now());
      }
    }

    let events: any[] | null = null;
    let playerStats: any[] | null = null;

    const matchStarted = !['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(status);
    if (matchStarted) {
      [events, playerStats] = await Promise.all([
        getFixtureEvents(fixtureId).catch(() => null),
        getFixturePlayerStats(fixtureId).catch(() => null),
      ]);
    }

    const hasEvents = events !== null;
    const hasStats = playerStats !== null;

    const updateData: any = { status, homeScore, awayScore, minute };
    if (hasEvents) updateData.events = events;
    if (hasStats) updateData.playerStats = playerStats;

    await prisma.matchCache.upsert({
      where: { fixtureId },
      update: updateData,
      create: {
        fixtureId, status, homeScore, awayScore, minute,
        events: events ?? [],
        playerStats: playerStats ?? [],
      },
    });

    const safeEvents = hasEvents ? events! : ((await prisma.matchCache.findUnique({ where: { fixtureId } }))?.events as any[] ?? []);
    const safeStats = hasStats ? playerStats! : ((await prisma.matchCache.findUnique({ where: { fixtureId } }))?.playerStats as any[] ?? []);

    if (matchStarted && (safeEvents.length > 0 || safeStats.length > 0)) {
      const rooms = await prisma.room.findMany({
        where: { fixtureId },
        include: { players: { include: { picks: true } } },
      });

      const dbOps: any[] = [];

      for (const room of rooms) {
        for (const player of room.players) {
          let playerTotalPoints = 0;

          for (const pick of player.picks) {
            const { total, breakdown } = calculatePlayerPoints(
              pick.footballPlayerId,
              pick.position,
              pick.teamId,
              safeEvents,
              safeStats,
              status,
              homeScore,
              awayScore,
              room.homeTeamId,
              room.awayTeamId,
            );

            const isCaptain = pick.slotIndex === player.captainSlot;
            const finalPoints = isCaptain ? total * 2 : total;

            dbOps.push(prisma.pick.update({
              where: { id: pick.id },
              data: {
                points: finalPoints,
                pointsBreakdown: breakdown as any,
              },
            }));

            playerTotalPoints += finalPoints;
          }

          dbOps.push(prisma.player.update({
            where: { id: player.id },
            data: { totalPoints: playerTotalPoints },
          }));
        }
      }

      if (dbOps.length > 0) {
        await prisma.$transaction(dbOps);
      }
    }
  } finally {
    refreshLocks.delete(fixtureId);
    resolve();
  }
}

/**
 * Refresh match data if it's stale and we should be refreshing it.
 * Used by both the live polling endpoint and the initial room load endpoint
 * so that the first paint shows fresh data.
 *
 * Returns the (possibly refreshed) MatchCache row, or null if there's no cache.
 */
export async function refreshMatchDataIfStale(fixtureId: number) {
  let matchCache = await prisma.matchCache.findUnique({ where: { fixtureId } });

  const now = Date.now();
  const isStale = !matchCache || (now - matchCache.updatedAt.getTime()) > LIVE_CACHE_TTL_MS;

  const isFinished = matchCache && FINISHED_STATUSES.has(matchCache.status);
  // Seed finishedAt from DB if server restarted after match ended.
  // If the match has been finished for a while and we just don't know when it
  // started, fall back to "as soon as we noticed" — so the grace can still
  // expire even on a fresh server.
  if (isFinished && !finishedAt.has(fixtureId) && matchCache) {
    finishedAt.set(fixtureId, matchCache.updatedAt.getTime());
  }
  const finishTime = finishedAt.get(fixtureId);
  const withinGracePeriod = !!isFinished && finishTime != null && (now - finishTime) < FINISHED_GRACE_MS;
  const isLiveOrPending = !matchCache || ['NS', 'TBD', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(matchCache.status);
  const shouldRefresh = isLiveOrPending || withinGracePeriod;

  if (isStale && shouldRefresh) {
    try {
      await refreshMatchData(fixtureId);
      matchCache = await prisma.matchCache.findUnique({ where: { fixtureId } });
    } catch (apiError) {
      console.error('API-Football fetch failed, using cached data:', apiError);
    }
  }

  return matchCache;
}
