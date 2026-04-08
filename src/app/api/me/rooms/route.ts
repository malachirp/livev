import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSessionMap } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionMap = getSessionMap(cookieStore.get('livev_session')?.value);
    const roomCodes = Object.keys(sessionMap);

    if (roomCodes.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    // Find all rooms the user is in, with their player data
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
      take: 10,
    });

    // Get match status for each fixture
    const fixtureIds = Array.from(new Set(players.map(p => p.room.fixtureId)));
    const caches = fixtureIds.length > 0
      ? await prisma.matchCache.findMany({
          where: { fixtureId: { in: fixtureIds } },
          select: { fixtureId: true, status: true, homeScore: true, awayScore: true },
        })
      : [];
    const cacheMap = Object.fromEntries(caches.map(c => [c.fixtureId, c]));

    const rooms = players.map(p => {
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

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Failed to fetch user rooms:', error);
    return NextResponse.json({ rooms: [] });
  }
}
