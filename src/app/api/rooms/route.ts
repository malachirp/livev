import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRoomCode, generateSessionToken } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fixtureId, leagueId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, matchDate, displayName } = body;

    if (!fixtureId || !displayName || !homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const code = generateRoomCode();
    const sessionToken = generateSessionToken();

    const room = await prisma.room.create({
      data: {
        code,
        fixtureId,
        leagueId,
        homeTeamId,
        awayTeamId,
        homeTeamName,
        awayTeamName,
        matchDate: new Date(matchDate),
        players: {
          create: {
            displayName: displayName.trim(),
            sessionToken,
            isCreator: true,
          },
        },
      },
    });

    const response = NextResponse.json({ code: room.code, sessionToken });

    // Set session cookie
    response.cookies.set('livev_session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}
