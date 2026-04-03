import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSessionToken } from '@/lib/utils';

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
    const sessionToken = getSessionToken(cookieStore.get('livev_session')?.value, params.code);

    // Find if current user is in the room
    const currentPlayer = sessionToken
      ? room.players.find(p => p.sessionToken === sessionToken)
      : null;

    // Get cached match data if available
    const matchCache = await prisma.matchCache.findUnique({
      where: { fixtureId: room.fixtureId },
    });

    // Teams are revealed 5 minutes before kickoff
    const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000;
    const kickoffTime = new Date(room.matchDate).getTime();
    const teamsLocked = Date.now() >= kickoffTime - LOCK_BEFORE_KICKOFF_MS;

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
        homeTeamLogo: room.homeTeamLogo,
        awayTeamLogo: room.awayTeamLogo,
        venue: room.venue,
        matchDate: room.matchDate.toISOString(),
        teamsLocked,
        lockTime: new Date(kickoffTime - LOCK_BEFORE_KICKOFF_MS).toISOString(),
        players: room.players.map(p => {
          const isCurrentPlayer = currentPlayer && p.id === currentPlayer.id;
          return {
            id: p.id,
            displayName: p.displayName,
            isCreator: p.isCreator,
            totalPoints: p.totalPoints,
            captainSlot: p.captainSlot,
            hasPicks: p.picks.length > 0,
            // Only show picks to the player themselves before lock, everyone after lock
            picks: (teamsLocked || isCurrentPlayer) ? p.picks.map(pick => ({
              footballPlayerId: pick.footballPlayerId,
              footballPlayerName: pick.footballPlayerName,
              teamId: pick.teamId,
              position: pick.position,
              slotIndex: pick.slotIndex,
              points: pick.points,
              pointsBreakdown: pick.pointsBreakdown,
            })) : [],
          };
        }),
      },
      currentPlayer: currentPlayer
        ? {
            id: currentPlayer.id,
            displayName: currentPlayer.displayName,
            hasPicks: currentPlayer.picks.length > 0,
            captainSlot: currentPlayer.captainSlot,
          }
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
