import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFixtureDetails, getFixtureEvents, getFixturePlayerStats } from '@/lib/api-football';
import { calculatePlayerPoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 25_000; // 25 seconds

// Simple in-memory lock to prevent thundering herd on the same fixture
const refreshLocks = new Map<number, Promise<void>>();

async function refreshMatchData(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  // If already refreshing this fixture, wait for it
  const existing = refreshLocks.get(fixtureId);
  if (existing) {
    await existing;
    return;
  }

  const refreshPromise = (async () => {
    try {
      const fixture = await getFixtureDetails(fixtureId);
      const status = fixture.fixture.status.short;
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      const minute = fixture.fixture.status.elapsed;

      let events: any[] = [];
      let playerStats: any[] = [];

      const matchStarted = !['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(status);
      if (matchStarted) {
        [events, playerStats] = await Promise.all([
          getFixtureEvents(fixtureId).catch(() => []),
          getFixturePlayerStats(fixtureId).catch(() => []),
        ]);
      }

      // Upsert match cache
      await prisma.matchCache.upsert({
        where: { fixtureId },
        update: { status, homeScore, awayScore, minute, events, playerStats },
        create: { fixtureId, status, homeScore, awayScore, minute, events, playerStats },
      });

      // Recalculate points for ALL rooms using this fixture
      // Trigger on events OR playerStats — stats contain appearance/minutes data
      if (matchStarted && (events.length > 0 || playerStats.length > 0)) {
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
                events,
                playerStats,
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
    }
  })();

  refreshLocks.set(fixtureId, refreshPromise);
  await refreshPromise;
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
    const isLiveOrRecent = !matchCache || ['NS', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(matchCache.status);

    if (isStale && isLiveOrRecent) {
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

    return NextResponse.json({
      match: {
        status: matchCache?.status || 'NS',
        homeScore: matchCache?.homeScore ?? null,
        awayScore: matchCache?.awayScore ?? null,
        minute: matchCache?.minute ?? null,
        events,
      },
      leaderboard: updatedRoom?.players.map(p => ({
        id: p.id,
        displayName: p.displayName,
        isCreator: p.isCreator,
        totalPoints: p.totalPoints,
        captainSlot: p.captainSlot,
        picks: p.picks.map(pick => ({
          footballPlayerId: pick.footballPlayerId,
          footballPlayerName: pick.footballPlayerName,
          teamId: pick.teamId,
          position: pick.position,
          slotIndex: pick.slotIndex,
          points: pick.points,
          pointsBreakdown: pick.pointsBreakdown,
        })),
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
