import { NextResponse } from 'next/server';
import { getSquad, getFixtureDetails } from '@/lib/api-football';
import { normalizePosition } from '@/lib/utils';
import type { NormalizedPlayer } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { fixtureId: string } }
) {
  try {
    const fixtureId = parseInt(params.fixtureId, 10);
    if (isNaN(fixtureId)) {
      return NextResponse.json({ error: 'Invalid fixture ID' }, { status: 400 });
    }

    // Get fixture to find team IDs
    const fixture = await getFixtureDetails(fixtureId);
    const homeTeamId = fixture.teams.home.id;
    const awayTeamId = fixture.teams.away.id;

    // Fetch both squads in parallel
    const [homeSquad, awaySquad] = await Promise.all([
      getSquad(homeTeamId),
      getSquad(awayTeamId),
    ]);

    const normalize = (squad: typeof homeSquad): NormalizedPlayer[] =>
      squad.players.map(p => ({
        id: p.id,
        name: p.name,
        position: normalizePosition(p.position),
        number: p.number,
        photo: p.photo,
        teamId: squad.team.id,
        teamName: squad.team.name,
        teamLogo: squad.team.logo,
      }));

    const players: NormalizedPlayer[] = [
      ...normalize(homeSquad),
      ...normalize(awaySquad),
    ];

    return NextResponse.json({
      players,
      homeTeam: {
        id: homeSquad.team.id,
        name: homeSquad.team.name,
        logo: homeSquad.team.logo,
      },
      awayTeam: {
        id: awaySquad.team.id,
        name: awaySquad.team.name,
        logo: awaySquad.team.logo,
      },
    });
  } catch (error) {
    console.error('Failed to fetch squads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch squads' },
      { status: 500 }
    );
  }
}
