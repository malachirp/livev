import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import type { PickData } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('livev_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const room = await prisma.room.findUnique({
      where: { code: params.code },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if match has started
    const matchCache = await prisma.matchCache.findUnique({
      where: { fixtureId: room.fixtureId },
    });

    if (matchCache && !['NS'].includes(matchCache.status)) {
      return NextResponse.json(
        { error: 'Cannot pick team after match has started' },
        { status: 400 }
      );
    }

    const player = await prisma.player.findFirst({
      where: { roomId: room.id, sessionToken },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found in this room' }, { status: 403 });
    }

    const body = await request.json();
    const picks: PickData[] = body.picks;
    const captainSlot: number = typeof body.captainSlot === 'number' ? body.captainSlot : 0;

    // Validate picks
    if (!picks || picks.length !== 5) {
      return NextResponse.json({ error: 'Must pick exactly 5 players' }, { status: 400 });
    }

    // Validate captain slot
    if (captainSlot < 0 || captainSlot > 4) {
      return NextResponse.json({ error: 'Invalid captain slot' }, { status: 400 });
    }

    // Validate positions
    const positions = picks.map(p => p.position);
    const gkCount = positions.filter(p => p === 'GK').length;
    const defCount = positions.filter(p => p === 'DEF').length;
    const midCount = positions.filter(p => p === 'MID').length;
    const fwdCount = positions.filter(p => p === 'FWD').length;

    if (gkCount !== 1 || defCount !== 1 || midCount !== 2 || fwdCount !== 1) {
      return NextResponse.json(
        { error: 'Invalid formation: need 1 GK, 1 DEF, 2 MID, 1 FWD' },
        { status: 400 }
      );
    }

    // Validate team balance (max 3 from one team)
    const teamCounts: Record<number, number> = {};
    picks.forEach(p => {
      teamCounts[p.teamId] = (teamCounts[p.teamId] || 0) + 1;
    });

    if (Object.values(teamCounts).some(count => count > 3)) {
      return NextResponse.json(
        { error: 'Max 3 players from one team' },
        { status: 400 }
      );
    }

    // Delete existing picks and create new ones (allows re-picking before kickoff)
    await prisma.pick.deleteMany({
      where: { playerId: player.id },
    });

    await Promise.all([
      prisma.pick.createMany({
        data: picks.map(pick => ({
          playerId: player.id,
          footballPlayerId: pick.footballPlayerId,
          footballPlayerName: pick.footballPlayerName,
          teamId: pick.teamId,
          position: pick.position,
          slotIndex: pick.slotIndex,
          points: 0,
        })),
      }),
      prisma.player.update({
        where: { id: player.id },
        data: { captainSlot },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save picks:', error);
    return NextResponse.json(
      { error: 'Failed to save picks' },
      { status: 500 }
    );
  }
}
