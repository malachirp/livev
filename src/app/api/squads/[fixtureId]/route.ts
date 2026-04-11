import { NextResponse } from 'next/server';
import { getSquad, getFixtureDetails, getFixtureLineups, getTeamPlayerStats, LEAGUES, INTERNATIONAL_LEAGUE_IDS } from '@/lib/api-football';
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

    const url = new URL(_request.url);
    const homeTeamIdParam = url.searchParams.get('homeTeamId');
    const awayTeamIdParam = url.searchParams.get('awayTeamId');
    const matchDateParam = url.searchParams.get('matchDate');

    const leagueIdParam = url.searchParams.get('leagueId');

    let homeTeamId: number;
    let awayTeamId: number;
    let kickoff: number;
    let leagueId: number | null = leagueIdParam ? parseInt(leagueIdParam, 10) : null;

    // Use query params if provided (avoids an API call to getFixtureDetails)
    if (homeTeamIdParam && awayTeamIdParam && matchDateParam) {
      homeTeamId = parseInt(homeTeamIdParam, 10);
      awayTeamId = parseInt(awayTeamIdParam, 10);
      kickoff = new Date(matchDateParam).getTime();
    } else {
      // Fallback: fetch fixture details from API
      const fixture = await getFixtureDetails(fixtureId);
      homeTeamId = fixture.teams.home.id;
      awayTeamId = fixture.teams.away.id;
      kickoff = new Date(fixture.fixture.date).getTime();
      if (!leagueId) leagueId = fixture.league.id;
    }
    const msUntilKickoff = kickoff - Date.now();
    const shouldCheckLineups = msUntilKickoff <= 90 * 60 * 1000; // 90 minutes

    const [homeSquad, awaySquad, lineups] = await Promise.all([
      getSquad(homeTeamId),
      getSquad(awayTeamId),
      shouldCheckLineups ? getFixtureLineups(fixtureId) : Promise.resolve(null),
    ]);

    // Build a map of lineup players keyed by player ID (globally unique in API-Football)
    // Previously keyed by "${teamId}-${playerId}" which broke when team IDs differed between endpoints
    const lineupPlayerMap = new Map<number, { number: number; pos: string; status: 'starter' | 'bench'; teamId: number }>();
    const lineupPlayerIds = new Set<number>();

    if (lineups && lineups.length > 0) {
      for (const teamLineup of lineups) {
        if (teamLineup.startXI) {
          for (const { player: p } of teamLineup.startXI) {
            lineupPlayerIds.add(p.id);
            lineupPlayerMap.set(p.id, {
              number: p.number,
              pos: p.pos,
              status: 'starter',
              teamId: teamLineup.team.id,
            });
          }
        }
        if (teamLineup.substitutes) {
          for (const { player: p } of teamLineup.substitutes) {
            lineupPlayerIds.add(p.id);
            lineupPlayerMap.set(p.id, {
              number: p.number,
              pos: p.pos,
              status: 'bench',
              teamId: teamLineup.team.id,
            });
          }
        }
      }
    }

    // Only report lineups available if we actually found players
    const hasLineups = lineupPlayerMap.size > 0;

    const normalize = (squad: typeof homeSquad): NormalizedPlayer[] =>
      squad.players.map(p => {
        const lineupInfo = lineupPlayerMap.get(p.id);
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
          lineupStatus: lineupInfo ? lineupInfo.status : null,
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
        const starters = teamLineup.startXI || [];
        const subs = teamLineup.substitutes || [];
        const starterIds = new Set(starters.map(s => s.player.id));
        const allLinePlayers = [
          ...starters.map(p => p.player),
          ...subs.map(p => p.player),
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

    // Merge player season stats if available (pre-fetched in background)
    const league = leagueId ? LEAGUES.find(l => l.id === leagueId) : null;
    const isInternationalFixture = leagueId ? INTERNATIONAL_LEAGUE_IDS.has(leagueId) : false;

    if (league) {
      try {
        const [homeStats, awayStats] = await Promise.all([
          getTeamPlayerStats(homeTeamId, league.season),
          getTeamPlayerStats(awayTeamId, league.season),
        ]);

        for (const p of players) {
          const stats = p.teamId === homeTeamId
            ? homeStats.get(p.id)
            : awayStats.get(p.id);
          p.clubAppearances = stats?.clubAppearances ?? 0;
          p.internationalAppearances = stats?.internationalAppearances ?? 0;
        }

        // Sort by relevant appearances (highest first), keeping lineup players on top
        players.sort((a, b) => {
          const aLineup = a.lineupStatus === 'starter' ? 0 : a.lineupStatus === 'bench' ? 1 : 2;
          const bLineup = b.lineupStatus === 'starter' ? 0 : b.lineupStatus === 'bench' ? 1 : 2;
          if (aLineup !== bLineup) return aLineup - bLineup;
          // Sort by the relevant appearance type for this fixture
          const aApps = isInternationalFixture ? (a.internationalAppearances ?? 0) : (a.clubAppearances ?? 0);
          const bApps = isInternationalFixture ? (b.internationalAppearances ?? 0) : (b.clubAppearances ?? 0);
          return bApps - aApps;
        });
      } catch (err) {
        console.error('[Squads] Failed to merge player stats:', err);
      }
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
