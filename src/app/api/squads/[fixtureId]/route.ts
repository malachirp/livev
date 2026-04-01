import { NextResponse } from 'next/server';
import { getSquad, getFixtureDetails, getFixtureLineups } from '@/lib/api-football';
import { normalizePosition, normalizeLineupPosition, sanitizePlayerName } from '@/lib/utils';
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

    // Get fixture to find team IDs and kickoff time
    const fixture = await getFixtureDetails(fixtureId);
    const homeTeamId = fixture.teams.home.id;
    const awayTeamId = fixture.teams.away.id;

    // Fetch squads in parallel, and try lineups if within ~90 min of kickoff
    const kickoff = new Date(fixture.fixture.date).getTime();
    const msUntilKickoff = kickoff - Date.now();
    const shouldCheckLineups = msUntilKickoff <= 90 * 60 * 1000; // 90 minutes

    const [homeSquad, awaySquad, lineups] = await Promise.all([
      getSquad(homeTeamId),
      getSquad(awayTeamId),
      shouldCheckLineups ? getFixtureLineups(fixtureId) : Promise.resolve(null),
    ]);

    // Build a map of lineup players by team for merging
    const lineupPlayerMap = new Map<string, { number: number; pos: string; status: 'starter' | 'bench' }>();
    const lineupPlayerIds = new Set<number>();
    let hasLineups = false;

    if (lineups && lineups.length > 0) {
      hasLineups = true;
      for (const teamLineup of lineups) {
        for (const { player: p } of teamLineup.startXI) {
          lineupPlayerIds.add(p.id);
          lineupPlayerMap.set(`${teamLineup.team.id}-${p.id}`, {
            number: p.number,
            pos: p.pos,
            status: 'starter',
          });
        }
        for (const { player: p } of teamLineup.substitutes) {
          lineupPlayerIds.add(p.id);
          lineupPlayerMap.set(`${teamLineup.team.id}-${p.id}`, {
            number: p.number,
            pos: p.pos,
            status: 'bench',
          });
        }
      }
    }

    const normalize = (squad: typeof homeSquad): NormalizedPlayer[] =>
      squad.players.map(p => {
        // If lineups are available, check if this player has updated info
        const lineupInfo = lineupPlayerMap.get(`${squad.team.id}-${p.id}`);
        const position = lineupInfo
          ? normalizeLineupPosition(lineupInfo.pos)
          : normalizePosition(p.position);
        const number = lineupInfo ? lineupInfo.number : p.number;

        return {
          id: p.id,
          name: sanitizePlayerName(p.name),
          position,
          number,
          photo: p.photo,
          teamId: squad.team.id,
          teamName: squad.team.name,
          teamLogo: squad.team.logo,
          lineupStatus: lineupInfo ? lineupInfo.status : (hasLineups ? null : null),
        };
      });

    // Start with squad players
    let players: NormalizedPlayer[] = [
      ...normalize(homeSquad),
      ...normalize(awaySquad),
    ];

    // Add any lineup players not in the squad (late call-ups, etc.)
    if (hasLineups && lineups) {
      const existingIds = new Set(players.map(p => p.id));
      for (const teamLineup of lineups) {
        const starterIds = new Set(teamLineup.startXI.map(s => s.player.id));
        const allLinePlayers = [
          ...teamLineup.startXI.map(p => p.player),
          ...teamLineup.substitutes.map(p => p.player),
        ];
        for (const p of allLinePlayers) {
          if (!existingIds.has(p.id)) {
            players.push({
              id: p.id,
              name: sanitizePlayerName(p.name),
              position: normalizeLineupPosition(p.pos),
              number: p.number,
              photo: '', // lineup endpoint doesn't include photos
              teamId: teamLineup.team.id,
              teamName: teamLineup.team.name,
              teamLogo: teamLineup.team.logo,
              lineupStatus: starterIds.has(p.id) ? 'starter' : 'bench',
            });
            existingIds.add(p.id);
          }
        }
      }

      // Sort: lineup players first (they're actually in the match-day squad), then the rest
      players.sort((a, b) => {
        const aInLineup = lineupPlayerIds.has(a.id) ? 0 : 1;
        const bInLineup = lineupPlayerIds.has(b.id) ? 0 : 1;
        return aInLineup - bInLineup;
      });
    }

    return NextResponse.json({
      players,
      hasLineups,
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
