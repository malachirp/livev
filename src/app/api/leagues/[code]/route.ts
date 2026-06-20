import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getMemberToken } from '@/lib/utils';
import { LEAGUES } from '@/lib/api-football';
import { refreshMatchDataIfStale } from '@/lib/match-refresh';
import { buildLeagueData } from '@/lib/league-standings';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const league = await prisma.league.findUnique({
      where: { code: params.code },
      include: { members: { select: { id: true, memberToken: true } }, rooms: { select: { fixtureId: true, matchDate: true } } },
    });

    if (!league) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    const competition = LEAGUES.find(l => l.id === league.competitionId);

    // Identify the current member from the league cookie
    const cookieStore = cookies();
    const memberToken = getMemberToken(cookieStore.get('livev_leagues')?.value, params.code);
    const currentMember = memberToken
      ? league.members.find(m => m.memberToken === memberToken)
      : null;

    // Non-members get only enough to render a join card — no standings are leaked.
    if (!currentMember) {
      return NextResponse.json({
        exists: true,
        isMember: false,
        name: league.name,
        competitionName: competition?.name ?? 'Competition',
        memberCount: league.members.length,
      });
    }

    // Refresh any rooms whose scores could still be moving so standings are current.
    // refreshMatchDataIfStale is a no-op when the cache is fresh or the match is long finished.
    const fixtureIds = Array.from(new Set(league.rooms.map(r => r.fixtureId)));
    await Promise.all(fixtureIds.map(id => refreshMatchDataIfStale(id).catch(() => null)));

    const data = await buildLeagueData(league.id, currentMember.id);
    const fullMember = await prisma.leagueMember.findUnique({ where: { id: currentMember.id } });

    return NextResponse.json({
      exists: true,
      isMember: true,
      league: {
        code: league.code,
        name: league.name,
        competitionId: league.competitionId,
        competitionName: competition?.name ?? 'Competition',
        season: league.season,
        memberCount: league.members.length,
      },
      currentMember: fullMember
        ? { id: fullMember.id, displayName: fullMember.displayName, isAdmin: fullMember.isAdmin }
        : null,
      standings: data.standings,
      games: data.games,
      awards: data.awards,
      totals: data.totals,
    });
  } catch (error) {
    console.error('Failed to fetch league:', error);
    return NextResponse.json({ error: 'Failed to fetch league' }, { status: 500 });
  }
}
