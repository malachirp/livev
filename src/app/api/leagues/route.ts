import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { generateLeagueCode, generateMemberToken, getLeagueMap } from '@/lib/utils';
import { checkDisplayName } from '@/lib/name-filter';
import { LEAGUES } from '@/lib/api-football';

const LEAGUE_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days — a tournament outlives the 7-day session cookie

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, competitionId, displayName } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'League name is required' }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json({ error: 'League name too long' }, { status: 400 });
    }

    const competition = LEAGUES.find(l => l.id === competitionId);
    if (!competition) {
      return NextResponse.json({ error: 'Unknown competition' }, { status: 400 });
    }

    const nameError = checkDisplayName(displayName ?? '');
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const memberToken = generateMemberToken();

    // Retry on code collision (unique constraint)
    let league;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        league = await prisma.league.create({
          data: {
            code: generateLeagueCode(),
            name: name.trim(),
            competitionId: competition.id,
            season: competition.season,
            members: {
              create: {
                displayName: displayName.trim(),
                memberToken,
                isAdmin: true,
              },
            },
          },
        });
        break;
      } catch (e: any) {
        if (e?.code !== 'P2002' || attempt === 4) throw e;
      }
    }

    const response = NextResponse.json({ code: league!.code, memberToken });

    const cookieStore = cookies();
    const leagues = getLeagueMap(cookieStore.get('livev_leagues')?.value);
    leagues[league!.code] = memberToken;
    response.cookies.set('livev_leagues', JSON.stringify(leagues), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: LEAGUE_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Failed to create league:', error);
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 });
  }
}
