import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSessionToken } from '@/lib/utils';
import { buildGlobalLeaderboard } from '@/lib/global-leaderboard';
import { refreshMatchDataIfStale } from '@/lib/match-refresh';

export const dynamic = 'force-dynamic';

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

    const matchCache = await refreshMatchDataIfStale(room.fixtureId);

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

    const cookieStore = cookies();
    const sessionToken = getSessionToken(cookieStore.get('livev_session')?.value, params.code);
    const currentPlayer = sessionToken && updatedRoom
      ? updatedRoom.players.find(p => p.sessionToken === sessionToken)
      : null;

    const globalLeaderboard = await buildGlobalLeaderboard(
      room.fixtureId,
      teamsLocked,
      currentPlayer?.id || null,
    );

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
      globalLeaderboard,
    });
  } catch (error) {
    console.error('Failed to fetch live data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live data' },
      { status: 500 }
    );
  }
}
