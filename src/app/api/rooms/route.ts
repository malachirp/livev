import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRoomCode, generateSessionToken, getSessionMap } from '@/lib/utils';
import { checkDisplayName } from '@/lib/name-filter';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fixtureId, leagueId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo, venue, matchDate, displayName } = body;

    if (!fixtureId || !displayName || !homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const nameError = checkDisplayName(displayName);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
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

    // Add to session map (preserves tokens for other rooms)
    const cookieStore = cookies();
    const sessions = getSessionMap(cookieStore.get('livev_session')?.value);
    sessions[room!.code] = sessionToken;

    response.cookies.set('livev_session', JSON.stringify(sessions), {
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
