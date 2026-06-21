import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { generateMemberToken, getLeagueMap, getMemberToken } from '@/lib/utils';
import { checkDisplayName } from '@/lib/name-filter';

const LEAGUE_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

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

    const nameError = checkDisplayName(displayName);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const league = await prisma.league.findUnique({ where: { code: params.code } });
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const cookieStore = cookies();
    const cookieValue = cookieStore.get('livev_leagues')?.value;

    // Already a member? (idempotent)
    const existingToken = getMemberToken(cookieValue, params.code);
    if (existingToken) {
      const existing = await prisma.leagueMember.findFirst({
        where: { leagueId: league.id, memberToken: existingToken },
      });
      if (existing) {
        return NextResponse.json({ memberToken: existingToken, memberId: existing.id, alreadyJoined: true });
      }
    }

    const trimmed = displayName.trim();
    const nameExists = await prisma.leagueMember.findFirst({
      where: { leagueId: league.id, displayName: trimmed },
    });
    if (nameExists) {
      return NextResponse.json({ error: 'That name is already taken in this league' }, { status: 409 });
    }

    const memberToken = generateMemberToken();
    const member = await prisma.leagueMember.create({
      data: { leagueId: league.id, displayName: trimmed, memberToken, isAdmin: false },
    });

    // Retroactively link any Players this person already has in league rooms.
    // Matches on exact display name where leagueMemberId is still null.
    const leagueRoomIds = await prisma.room.findMany({
      where: { leagueGroupId: league.id },
      select: { id: true },
    });
    if (leagueRoomIds.length > 0) {
      await prisma.player.updateMany({
        where: {
          roomId: { in: leagueRoomIds.map(r => r.id) },
          displayName: trimmed,
          leagueMemberId: null,
        },
        data: { leagueMemberId: member.id },
      });
    }

    const response = NextResponse.json({ memberToken, memberId: member.id, alreadyJoined: false });

    const leagues = getLeagueMap(cookieValue);
    leagues[params.code] = memberToken;
    response.cookies.set('livev_leagues', JSON.stringify(leagues), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: LEAGUE_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Failed to join league:', error);
    return NextResponse.json({ error: 'Failed to join league' }, { status: 500 });
  }
}
