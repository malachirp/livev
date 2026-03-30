import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
          orderBy: { totalPoints: 'desc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const cookieStore = cookies();
    const sessionToken = cookieStore.get('livev_session')?.value;

    // Find if current user is in the room
    const currentPlayer = sessionToken
      ? room.players.find(p => p.sessionToken === sessionToken)
      : null;

    // Get cached match data if available
    const matchCache = await prisma.matchCache.findUnique({
      where: { fixtureId: room.fixtureId },
    });

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        fixtureId: room.fixtureId,
        leagueId: room.leagueId,
        homeTeamId: room.homeTeamId,
        awayTeamId: room.awayTeamId,
        homeTeamName: room.homeTeamName,
        awayTeamName: room.awayTeamName,
        matchDate: room.matchDate.toISOString(),
        players: room.players.map(p => ({
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
        })),
      },
      currentPlayer: currentPlayer
        ? { id: currentPlayer.id, displayName: currentPlayer.displayName, hasPicks: currentPlayer.picks.length > 0 }
        : null,
      match: matchCache
        ? {
            status: matchCache.status,
            homeScore: matchCache.homeScore,
            awayScore: matchCache.awayScore,
            minute: matchCache.minute,
          }
        : { status: 'NS', homeScore: null, awayScore: null, minute: null },
    });
  } catch (error) {
    console.error('Failed to fetch room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}
