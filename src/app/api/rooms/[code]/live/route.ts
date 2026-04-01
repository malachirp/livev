import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFixtureDetails, getFixtureEvents, getFixturePlayerStats } from '@/lib/api-football';
import { calculatePlayerPoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 55_000; // 55 seconds — aligned with 1-min client polling

// Grace period after FT to keep refreshing for final events/stats
const FINISHED_GRACE_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory lock to prevent thundering herd on the same fixture
const refreshLocks = new Map<number, Promise<void>>();

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
    const fixture = await getFixtureDetails(fixtureId);
    const status = fixture.fixture.status.short;
    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;
    const minute = fixture.fixture.status.elapsed;

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

            // Captain gets 2x points
            const isCaptain = pick.slotIndex === player.captainSlot;
            const finalPoints = isCaptain ? total * 2 : total;

            await prisma.pick.update({
              where: { id: pick.id },
              data: {
                points: finalPoints,
                pointsBreakdown: breakdown as any,
              },
            });

            playerTotalPoints += finalPoints;
          }

          await prisma.player.update({
            where: { id: player.id },
            data: { totalPoints: playerTotalPoints },
          });
        }
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
    const withinGracePeriod = isFinished && matchCache && (now.getTime() - matchCache.updatedAt.getTime()) < FINISHED_GRACE_MS;
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
    });
  } catch (error) {
    console.error('Failed to fetch live data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live data' },
      { status: 500 }
    );
  }
}
