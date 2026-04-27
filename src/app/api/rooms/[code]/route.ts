import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSessionToken } from '@/lib/utils';
import { buildGlobalLeaderboard } from '@/lib/global-leaderboard';
import { checkDisplayName } from '@/lib/name-filter';
import { refreshMatchDataIfStale } from '@/lib/match-refresh';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    // Look up the fixture id first so we can refresh stale match data
    // BEFORE reading the players — otherwise the first paint shows stale
    // points and users have to hard refresh.
    const baseRoom = await prisma.room.findUnique({
      where: { code: params.code },
      select: { fixtureId: true },
    });

    if (!baseRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const matchCache = await refreshMatchDataIfStale(baseRoom.fixtureId);

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

    // Teams are revealed 5 minutes before kickoff
    const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000;
    const kickoffTime = new Date(room.matchDate).getTime();
    const teamsLocked = Date.now() >= kickoffTime - LOCK_BEFORE_KICKOFF_MS;

    // Build global leaderboard
    const globalLeaderboard = await buildGlobalLeaderboard(
      room.fixtureId,
      teamsLocked,
      currentPlayer?.id || null,
    );

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
            isCreator: currentPlayer.isCreator,
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
      globalLeaderboard,
    });
  } catch (error) {
    console.error('Failed to fetch room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { displayName } = await request.json();

    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const trimmed = displayName.trim();
    if (trimmed.length > 20) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 });
    }

    const nameError = checkDisplayName(trimmed);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: params.code },
      include: { players: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000;
    const kickoffTime = new Date(room.matchDate).getTime();
    if (Date.now() >= kickoffTime - LOCK_BEFORE_KICKOFF_MS) {
      return NextResponse.json({ error: 'Teams are locked' }, { status: 403 });
    }

    const cookieStore = cookies();
    const sessionToken = getSessionToken(cookieStore.get('livev_session')?.value, params.code);
    const currentPlayer = sessionToken
      ? room.players.find(p => p.sessionToken === sessionToken)
      : null;

    if (!currentPlayer) {
      return NextResponse.json({ error: 'Not in this room' }, { status: 403 });
    }

    if (room.players.some(p => p.id !== currentPlayer.id && p.displayName.toLowerCase() === trimmed.toLowerCase())) {
      return NextResponse.json({ error: 'Name already taken in this room' }, { status: 409 });
    }

    await prisma.player.update({
      where: { id: currentPlayer.id },
      data: { displayName: trimmed },
    });

    return NextResponse.json({ ok: true, displayName: trimmed });
  } catch (error) {
    console.error('Failed to update display name:', error);
    return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
  }
}
