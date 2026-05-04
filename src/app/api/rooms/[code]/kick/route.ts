import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSessionToken } from '@/lib/utils';

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { playerId } = await request.json();

    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: params.code },
      include: { players: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const cookieStore = cookies();
    const sessionToken = getSessionToken(cookieStore.get('livev_session')?.value, params.code);
    const currentPlayer = sessionToken
      ? room.players.find(p => p.sessionToken === sessionToken)
      : null;

    if (!currentPlayer?.isCreator) {
      return NextResponse.json({ error: 'Only the host can remove players' }, { status: 403 });
    }

    const target = room.players.find(p => p.id === playerId);
    if (!target) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (target.isCreator) {
      return NextResponse.json({ error: 'Cannot remove the host' }, { status: 400 });
    }

    // Cascade delete handles picks
    await prisma.player.delete({ where: { id: playerId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to kick player:', error);
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 });
  }
}
