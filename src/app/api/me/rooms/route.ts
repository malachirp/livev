import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSessionMap } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionMap = getSessionMap(cookieStore.get('livev_session')?.value);

    if (Object.keys(sessionMap).length === 0) {
      return NextResponse.json({ rooms: [], hasMore: false });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 5, 20);
    const offset = Number(url.searchParams.get('offset')) || 0;

    // Find rooms the user is in, with their player data
    const players = await prisma.player.findMany({
      where: {
        sessionToken: { in: Object.values(sessionMap) },
      },
      include: {
        room: {
          select: {
            code: true,
            homeTeamName: true,
            awayTeamName: true,
            homeTeamLogo: true,
            awayTeamLogo: true,
            matchDate: true,
            fixtureId: true,
          },
        },
      },
      orderBy: { room: { matchDate: 'desc' } },
      skip: offset,
      take: limit + 1, // fetch one extra to check if there are more
    });

    const hasMore = players.length > limit;
    const trimmed = players.slice(0, limit);

    // Get match status for each fixture
    const fixtureIds = Array.from(new Set(trimmed.map(p => p.room.fixtureId)));
    const caches = fixtureIds.length > 0
      ? await prisma.matchCache.findMany({
          where: { fixtureId: { in: fixtureIds } },
          select: { fixtureId: true, status: true, homeScore: true, awayScore: true },
        })
      : [];
    const cacheMap = Object.fromEntries(caches.map(c => [c.fixtureId, c]));

    const rooms = trimmed.map(p => {
      const cache = cacheMap[p.room.fixtureId];
      return {
        code: p.room.code,
        homeTeamName: p.room.homeTeamName,
        awayTeamName: p.room.awayTeamName,
        homeTeamLogo: p.room.homeTeamLogo,
        awayTeamLogo: p.room.awayTeamLogo,
        matchDate: p.room.matchDate.toISOString(),
        matchStatus: cache?.status || 'NS',
        homeScore: cache?.homeScore ?? null,
        awayScore: cache?.awayScore ?? null,
        userDisplayName: p.displayName,
        userPoints: p.totalPoints,
      };
    });

    return NextResponse.json({ rooms, hasMore });
  } catch (error) {
    console.error('Failed to fetch user rooms:', error);
    return NextResponse.json({ rooms: [], hasMore: false });
  }
}
