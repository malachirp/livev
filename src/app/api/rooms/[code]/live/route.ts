import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFixtureDetails, getFixtureEvents, getFixturePlayerStats, clearFixtureCaches } from '@/lib/api-football';
import { calculatePlayerPoints } from '@/lib/scoring';
import { cookies } from 'next/headers';
import { getSessionToken } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 55_000; // 55 seconds — aligned with 1-min client polling

// Grace period after FT to keep refreshing for final events/stats
const FINISHED_GRACE_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory lock to prevent thundering herd on the same fixture
const refreshLocks = new Map<number, Promise<void>>();

// Track when each fixture was first detected as finished, so the grace period actually expires
const finishedAt = new Map<number, number>();

async function refreshMatchData(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  // If already refreshing this fixture, wait for it
  const existing = refreshLocks.get(fixtureId);
  if (existing) {
    await existing;
    return;
  }

  // Set lock BEFORE creating the async work to close the race window
  let resolve!: () => void;
  const lockPromise = new Promise<void>(r => { resolve = r; });
  refreshLocks.set(fixtureId, lockPromise);

  try {
    // Check previous status to detect transition to finished
    const prevCache = await prisma.matchCache.findUnique({ where: { fixtureId } });
    const prevStatus = prevCache?.status;

    const fixture = await getFixtureDetails(fixtureId);
    const status = fixture.fixture.status.short;
    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;
    const elapsed = fixture.fixture.status.elapsed ?? 0;
    const extra = fixture.fixture.status.extra ?? 0;
    const minute = elapsed + extra || null;

    // When match just finished, clear in-memory caches to force fresh final stats from API
    const isNowFinished = ['FT', 'AET', 'PEN'].includes(status);
    const wasNotFinished = !prevStatus || !['FT', 'AET', 'PEN'].includes(prevStatus);
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

    // Only update cache if we got valid data (don't overwrite good data with failed fetches)
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

    // Recalculate points for ALL rooms using this fixture
    const safeEvents = hasEvents ? events! : ((await prisma.matchCache.findUnique({ where: { fixtureId } }))?.events as any[] ?? []);
    const safeStats = hasStats ? playerStats! : ((await prisma.matchCache.findUnique({ where: { fixtureId } }))?.playerStats as any[] ?? []);

    if (matchStarted && (safeEvents.length > 0 || safeStats.length > 0)) {
      const rooms = await prisma.room.findMany({
        where: { fixtureId },
        include: { players: { include: { picks: true } } },
      });

      // Batch all DB writes into a single transaction to avoid
      // 60+ sequential round-trips that block the DB connection pool
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
              room.awayTeamId
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

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: params.code },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if cache needs refresh
    let matchCache = await prisma.matchCache.findUnique({
      where: { fixtureId: room.fixtureId },
    });

    const now = new Date();
    const isStale = !matchCache || (now.getTime() - matchCache.updatedAt.getTime()) > CACHE_TTL_MS;

    // Keep refreshing for live matches, pre-match, and recently finished (grace period for final stats)
    const isFinished = matchCache && ['FT', 'AET', 'PEN'].includes(matchCache.status);
    // Seed finishedAt from DB if server restarted after match ended
    if (isFinished && !finishedAt.has(room.fixtureId) && matchCache) {
      finishedAt.set(room.fixtureId, matchCache.updatedAt.getTime());
    }
    const finishTime = finishedAt.get(room.fixtureId);
    const withinGracePeriod = isFinished && finishTime != null && (now.getTime() - finishTime) < FINISHED_GRACE_MS;
    const isLiveOrPending = !matchCache || ['NS', 'TBD', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(matchCache.status);
    const shouldRefresh = isLiveOrPending || withinGracePeriod;

    if (isStale && shouldRefresh) {
      try {
        await refreshMatchData(room.fixtureId, room.homeTeamId, room.awayTeamId);
        // Re-read cache after refresh
        matchCache = await prisma.matchCache.findUnique({
          where: { fixtureId: room.fixtureId },
        });
      } catch (apiError) {
        console.error('API-Football fetch failed, using cached data:', apiError);
      }
    }

    // Fetch this room's leaderboard
    const updatedRoom = await prisma.room.findUnique({
      where: { code: params.code },
      include: {
        players: {
          include: { picks: true },
          orderBy: { totalPoints: 'desc' },
        },
      },
    });

    const events = (matchCache?.events as any[]) || [];

    // Teams are revealed 5 minutes before kickoff
    const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000;
    const kickoffTime = new Date(room.matchDate).getTime();
    const teamsLocked = Date.now() >= kickoffTime - LOCK_BEFORE_KICKOFF_MS;

    // Identify current player for global leaderboard
    const cookieStore = cookies();
    const sessionToken = getSessionToken(cookieStore.get('livev_session')?.value, params.code);
    const currentPlayer = sessionToken && updatedRoom
      ? updatedRoom.players.find(p => p.sessionToken === sessionToken)
      : null;

    // Build global leaderboard
    const [globalTotal, globalTopPlayers] = await Promise.all([
      prisma.player.count({ where: { room: { fixtureId: room.fixtureId } } }),
      prisma.player.findMany({
        where: { room: { fixtureId: room.fixtureId } },
        include: { picks: true },
        orderBy: { totalPoints: 'desc' },
        take: 5,
      }),
    ]);

    const mapGlobalEntry = (p: typeof globalTopPlayers[0], rank: number) => ({
      displayName: p.displayName,
      totalPoints: p.totalPoints,
      rank,
      hasPicks: p.picks.length > 0,
      isYou: currentPlayer ? p.id === currentPlayer.id : false,
      picks: teamsLocked ? p.picks.map(pick => ({
        footballPlayerId: pick.footballPlayerId,
        footballPlayerName: pick.footballPlayerName,
        teamId: pick.teamId,
        position: pick.position,
        slotIndex: pick.slotIndex,
        points: pick.points,
        pointsBreakdown: pick.pointsBreakdown,
      })) : [],
    });

    const globalTop: ReturnType<typeof mapGlobalEntry>[] = [];
    for (let i = 0; i < globalTopPlayers.length; i++) {
      const rank = i === 0 ? 1 :
        globalTopPlayers[i].totalPoints === globalTopPlayers[i - 1].totalPoints ? globalTop[i - 1].rank : i + 1;
      globalTop.push(mapGlobalEntry(globalTopPlayers[i], rank));
    }

    let globalCurrentUser = null;
    if (currentPlayer && !globalTopPlayers.some(p => p.id === currentPlayer.id)) {
      const playersAbove = await prisma.player.count({
        where: { room: { fixtureId: room.fixtureId }, totalPoints: { gt: currentPlayer.totalPoints } },
      });
      const fullPlayer = await prisma.player.findUnique({
        where: { id: currentPlayer.id },
        include: { picks: true },
      });
      if (fullPlayer) {
        globalCurrentUser = mapGlobalEntry(fullPlayer, playersAbove + 1);
      }
    }

    return NextResponse.json({
      match: {
        status: matchCache?.status || 'NS',
        homeScore: matchCache?.homeScore ?? null,
        awayScore: matchCache?.awayScore ?? null,
        minute: matchCache?.minute ?? null,
        events,
      },
      teamsLocked,
      leaderboard: updatedRoom?.players.map(p => ({
        id: p.id,
        displayName: p.displayName,
        isCreator: p.isCreator,
        totalPoints: p.totalPoints,
        captainSlot: p.captainSlot,
        hasPicks: p.picks.length > 0,
        // Hide other players' picks before lock
        picks: teamsLocked ? p.picks.map(pick => ({
          footballPlayerId: pick.footballPlayerId,
          footballPlayerName: pick.footballPlayerName,
          teamId: pick.teamId,
          position: pick.position,
          slotIndex: pick.slotIndex,
          points: pick.points,
          pointsBreakdown: pick.pointsBreakdown,
        })) : [],
      })) || [],
      globalLeaderboard: {
        totalPlayers: globalTotal,
        top: globalTop,
        currentUser: globalCurrentUser,
      },
    });
  } catch (error) {
    console.error('Failed to fetch live data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live data' },
      { status: 500 }
    );
  }
}
