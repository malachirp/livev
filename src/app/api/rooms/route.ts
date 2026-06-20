import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRoomCode, generateSessionToken, getSessionMap, getMemberToken } from '@/lib/utils';
import { checkDisplayName } from '@/lib/name-filter';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fixtureId, leagueId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo, venue, matchDate, displayName, leagueCode } = body;

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

    const cookieStore = cookies();

    // If this game is hosted under a league, the host must be a member and the
    // fixture must belong to the league's chosen competition.
    let leagueGroupId: string | null = null;
    let leagueMemberId: string | null = null;
    let creatorName = displayName.trim();
    if (leagueCode) {
      const league = await prisma.league.findUnique({
        where: { code: leagueCode },
        include: { members: true },
      });
      if (!league) {
        return NextResponse.json({ error: 'League not found' }, { status: 404 });
      }
      const memberToken = getMemberToken(cookieStore.get('livev_leagues')?.value, leagueCode);
      const member = memberToken ? league.members.find(m => m.memberToken === memberToken) : null;
      if (!member) {
        return NextResponse.json({ error: 'You are not a member of this league' }, { status: 403 });
      }
      if (leagueId !== league.competitionId) {
        return NextResponse.json({ error: "Game must be in the league's competition" }, { status: 400 });
      }
      leagueGroupId = league.id;
      leagueMemberId = member.id;
      creatorName = member.displayName; // keep the host's league identity
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
            leagueGroupId,
            players: {
              create: {
                displayName: creatorName,
                sessionToken,
                isCreator: true,
                leagueMemberId,
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
