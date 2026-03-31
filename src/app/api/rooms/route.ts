import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRoomCode, generateSessionToken } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fixtureId, leagueId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo, venue, matchDate, displayName } = body;

    if (!fixtureId || !displayName || !homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.trim().length > 20) {
      return NextResponse.json({ error: 'Display name must be 1-20 characters' }, { status: 400 });
    }

    if (!matchDate || isNaN(new Date(matchDate).getTime())) {
      return NextResponse.json({ error: 'Invalid match date' }, { status: 400 });
    }

    const sessionToken = generateSessionToken();

    // Retry room creation with a new code on collision (unique constraint)
    let room;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const code = generateRoomCode();
        room = await prisma.room.create({
          data: {
            code,
            fixtureId,
            leagueId,
            homeTeamId,
            awayTeamId,
            homeTeamName,
            awayTeamName,
            homeTeamLogo: homeTeamLogo || null,
            awayTeamLogo: awayTeamLogo || null,
            venue: venue || null,
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
        break;
      } catch (e: any) {
        // P2002 = Prisma unique constraint violation
        if (e?.code !== 'P2002' || attempt === 4) throw e;
      }
    }

    const response = NextResponse.json({ code: room!.code, sessionToken });

    // Set session cookie
    response.cookies.set('livev_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
