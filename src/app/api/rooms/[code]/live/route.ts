import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFixtureDetails, getFixtureEvents, getFixturePlayerStats } from '@/lib/api-football';
import { calculatePlayerPoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 25_000; // 25 seconds

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: params.code },
      include: {
        players: {
          include: { picks: true },
        },
      },
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
        // Fetch fresh data from API-Football
        const fixture = await getFixtureDetails(room.fixtureId);
        const status = fixture.fixture.status.short;
        const homeScore = fixture.goals.home;
        const awayScore = fixture.goals.away;
        const minute = fixture.fixture.status.elapsed;

        let events: any[] = [];
        let playerStats: any[] = [];

        // Only fetch events/stats if match has started
        const matchStarted = !['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(status);
        if (matchStarted) {
          [events, playerStats] = await Promise.all([
            getFixtureEvents(room.fixtureId).catch(() => []),
            getFixturePlayerStats(room.fixtureId).catch(() => []),
          ]);
        }

        // Upsert match cache
        matchCache = await prisma.matchCache.upsert({
          where: { fixtureId: room.fixtureId },
          update: {
            status,
            homeScore,
            awayScore,
            minute,
            events,
            playerStats,
          },
          create: {
            fixtureId: room.fixtureId,
            status,
            homeScore,
            awayScore,
            minute,
            events,
            playerStats,
          },
        });

        // Recalculate points for all picks if match has started
        if (matchStarted && events.length > 0) {
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

              await prisma.pick.update({
                where: { id: pick.id },
                data: { points: total, pointsBreakdown: breakdown as any },
              });

              playerTotalPoints += total;
            }

            await prisma.player.update({
              where: { id: player.id },
              data: { totalPoints: playerTotalPoints },
            });
          }
        }
      } catch (apiError) {
        console.error('API-Football fetch failed, using cached data:', apiError);
        // Continue with existing cached data
      }
    }

    // Re-fetch room with updated scores
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
