import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSessionToken } from '@/lib/utils';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { displayName } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: params.code },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user already exists with this session
    const cookieStore = cookies();
    const existingToken = cookieStore.get('livev_session')?.value;

    if (existingToken) {
      const existingPlayer = await prisma.player.findFirst({
        where: { roomId: room.id, sessionToken: existingToken },
      });
      if (existingPlayer) {
        return NextResponse.json({
          sessionToken: existingToken,
          playerId: existingPlayer.id,
          alreadyJoined: true,
        });
      }
    }

    // Check for duplicate display name
    const nameExists = await prisma.player.findFirst({
      where: { roomId: room.id, displayName: displayName.trim() },
    });

    if (nameExists) {
      return NextResponse.json(
        { error: 'That name is already taken in this room' },
        { status: 409 }
      );
    }

    const sessionToken = generateSessionToken();

    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        displayName: displayName.trim(),
        sessionToken,
        isCreator: false,
      },
    });

    const response = NextResponse.json({
      sessionToken,
      playerId: player.id,
      alreadyJoined: false,
    });

    response.cookies.set('livev_session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}
