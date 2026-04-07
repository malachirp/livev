import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { getFixtureDetails } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

function checkAdminAuth(): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const headersList = headers();
  const authHeader = headersList.get('x-admin-password');
  return authHeader === adminPassword;
}

const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'PST', 'AWD', 'WO'];

export async function GET(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rooms = await prisma.room.findMany({
      include: {
        players: {
          select: { id: true, displayName: true, totalPoints: true, isCreator: true },
        },
        _count: { select: { players: true } },
      },
      orderBy: { matchDate: 'asc' },
    });

    // Fetch match statuses for all fixtures
    const fixtureIds = Array.from(new Set(rooms.map(r => r.fixtureId)));
    const matchCaches = await prisma.matchCache.findMany({
      where: { fixtureId: { in: fixtureIds } },
    });
    const statusMap = new Map(matchCaches.map(mc => [mc.fixtureId, mc]));

    // Find fixtures with stale statuses that need refreshing:
    // - Match date was >3 hours ago but status isn't finished
    // - Or no cache entry exists and match date has passed
    const now = Date.now();
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const fixtureMap = new Map(rooms.map(r => [r.fixtureId, r]));
    const staleFixtureIds: number[] = [];

    for (const fixtureId of fixtureIds) {
      const room = fixtureMap.get(fixtureId);
      if (!room) continue;
      const kickoff = new Date(room.matchDate).getTime();
      const matchShouldBeOver = now > kickoff + THREE_HOURS;
      const cache = statusMap.get(fixtureId);

      if (matchShouldBeOver && (!cache || !FINISHED_STATUSES.includes(cache.status))) {
        staleFixtureIds.push(fixtureId);
      } else if (!cache && now > kickoff) {
        // Match started but no cache at all
        staleFixtureIds.push(fixtureId);
      }
    }

    // Refresh stale fixtures (limit to 5 to avoid slamming the API)
    if (staleFixtureIds.length > 0) {
      const toRefresh = staleFixtureIds.slice(0, 5);
      const results = await Promise.allSettled(
        toRefresh.map(async (fixtureId) => {
          try {
            const fixture = await getFixtureDetails(fixtureId);
            const status = fixture.fixture.status.short;
            const homeScore = fixture.goals.home;
            const awayScore = fixture.goals.away;
            const minute = fixture.fixture.status.elapsed;

            await prisma.matchCache.upsert({
              where: { fixtureId },
              update: { status, homeScore, awayScore, minute },
              create: { fixtureId, status, homeScore, awayScore, minute, events: [], playerStats: [] },
            });

            statusMap.set(fixtureId, { status, homeScore, awayScore, minute } as any);
          } catch (err) {
            console.error(`[Admin] Failed to refresh fixture ${fixtureId}:`, err);
          }
        })
      );
    }

    const roomsData = rooms.map(room => {
      const cache = statusMap.get(room.fixtureId);
      return {
        id: room.id,
        code: room.code,
        fixtureId: room.fixtureId,
        homeTeamName: room.homeTeamName,
        awayTeamName: room.awayTeamName,
        homeTeamLogo: room.homeTeamLogo,
        awayTeamLogo: room.awayTeamLogo,
        venue: room.venue,
        matchDate: room.matchDate.toISOString(),
        createdAt: room.createdAt.toISOString(),
        playerCount: room._count.players,
        players: room.players,
        matchStatus: cache?.status || 'NS',
        homeScore: cache?.homeScore ?? null,
        awayScore: cache?.awayScore ?? null,
      };
    });

    return NextResponse.json({ rooms: roomsData });
  } catch (error) {
    console.error('Failed to fetch admin rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Cascade delete handles players and picks
    await prisma.room.delete({ where: { id: roomId } });

    return NextResponse.json({ success: true, deleted: roomId });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
