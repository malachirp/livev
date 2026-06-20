import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getLeagueMap } from '@/lib/utils';
import { LEAGUES } from '@/lib/api-football';
import { buildLeagueData } from '@/lib/league-standings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const leagueMap = getLeagueMap(cookieStore.get('livev_leagues')?.value);
    const tokens = Object.values(leagueMap);

    if (tokens.length === 0) {
      return NextResponse.json({ leagues: [] });
    }

    const members = await prisma.leagueMember.findMany({
      where: { memberToken: { in: tokens } },
      include: { league: { include: { _count: { select: { members: true } } } } },
      orderBy: { createdAt: 'desc' }, // most recently joined leagues first
    });

    const leagues = await Promise.all(
      members.map(async m => {
        const data = await buildLeagueData(m.leagueId, m.id);
        const me = data.standings.find(s => s.memberId === m.id);
        const competition = LEAGUES.find(l => l.id === m.league.competitionId);
        return {
          code: m.league.code,
          name: m.league.name,
          competitionName: competition?.name ?? 'Competition',
          memberCount: m.league._count.members,
          gamesPlayed: data.totals.gamesPlayed,
          myPoints: me?.totalPoints ?? 0,
          myRank: me?.rank ?? null,
        };
      })
    );

    return NextResponse.json({ leagues });
  } catch (error) {
    console.error('Failed to fetch user leagues:', error);
    return NextResponse.json({ leagues: [] });
  }
}
