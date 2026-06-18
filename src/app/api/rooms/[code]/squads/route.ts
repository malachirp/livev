import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFixtureLineups, getSquad, getTeamPlayerStats, LEAGUES } from '@/lib/api-football';
import { calculatePlayerPoints } from '@/lib/scoring';
import { normalizeLineupPosition, normalizePosition } from '@/lib/utils';
import type { ApiLineupResponse, ApiFixturePlayersResponse, ApiFixtureEvent } from '@/types';

export const dynamic = 'force-dynamic';

interface SquadPlayer {
  id: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  lineupStatus: 'starter' | 'bench' | null;
  points: number;
  breakdown: Record<string, any> | null;
  minutesPlayed: number | null;
  appearances?: number;
}

interface TeamSquad {
  teamId: number;
  teamName: string;
  teamLogo: string;
  players: SquadPlayer[];
}

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: params.code },
      select: { fixtureId: true, leagueId: true, homeTeamId: true, awayTeamId: true, homeTeamName: true, awayTeamName: true, homeTeamLogo: true, awayTeamLogo: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const matchCache = await prisma.matchCache.findUnique({ where: { fixtureId: room.fixtureId } });

    const lineups: ApiLineupResponse[] | null = await getFixtureLineups(room.fixtureId).catch(() => null);

    // Pre-release: lineups not announced yet — show each full squad with season
    // appearances so there's something useful to browse before the team sheet drops.
    if (!lineups || lineups.length === 0) {
      const preRelease = await buildPreReleaseSquads(room);
      return NextResponse.json({
        available: true,
        preRelease: true,
        matchStarted: false,
        home: preRelease.home,
        away: preRelease.away,
      });
    }

    const status = matchCache?.status || 'NS';
    const homeScore = matchCache?.homeScore ?? null;
    const awayScore = matchCache?.awayScore ?? null;
    const events = (matchCache?.events as unknown as ApiFixtureEvent[]) || [];
    const playerStats = (matchCache?.playerStats as unknown as ApiFixturePlayersResponse[]) || [];

    const matchStarted = !['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(status);

    const buildTeamSquad = (lineup: ApiLineupResponse, teamId: number, teamName: string, teamLogo: string): TeamSquad => {
      const players: SquadPlayer[] = [];

      const processPlayers = (list: Array<{ player: { id: number; name: string; number: number; pos: string; grid: string | null } }>, lineupStatus: 'starter' | 'bench') => {
        for (const entry of list) {
          const p = entry.player;
          const position = normalizeLineupPosition(p.pos);

          let points = 0;
          let breakdown: Record<string, any> | null = null;
          let minutesPlayed: number | null = null;

          if (matchStarted && (events.length > 0 || playerStats.length > 0)) {
            const result = calculatePlayerPoints(
              p.id, position, teamId, events, playerStats,
              status, homeScore, awayScore, room.homeTeamId, room.awayTeamId,
            );
            points = result.total;
            breakdown = result.breakdown;
            minutesPlayed = result.breakdown.minutesPlayed;
          }

          players.push({ id: p.id, name: p.name, position, lineupStatus, points, breakdown, minutesPlayed });
        }
      };

      processPlayers(lineup.startXI || [], 'starter');
      processPlayers(lineup.substitutes || [], 'bench');

      const positionOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
      players.sort((a, b) => {
        if (a.lineupStatus !== b.lineupStatus) return a.lineupStatus === 'starter' ? -1 : 1;
        // Once underway, surface top performers; pre-match keep natural team-sheet order
        if (matchStarted) return b.points - a.points;
        return positionOrder[a.position] - positionOrder[b.position];
      });

      return { teamId, teamName, teamLogo: teamLogo || lineup.team.logo, players };
    };

    const homeLineup = lineups.find(l => l.team.id === room.homeTeamId);
    const awayLineup = lineups.find(l => l.team.id === room.awayTeamId);

    const home = homeLineup
      ? buildTeamSquad(homeLineup, room.homeTeamId, room.homeTeamName, room.homeTeamLogo || '')
      : null;
    const away = awayLineup
      ? buildTeamSquad(awayLineup, room.awayTeamId, room.awayTeamName, room.awayTeamLogo || '')
      : null;

    return NextResponse.json({ available: true, preRelease: false, matchStarted, home, away });
  } catch (error) {
    console.error('Failed to fetch squads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch squads' },
      { status: 500 }
    );
  }
}

interface PreReleaseRoom {
  leagueId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

async function buildPreReleaseSquads(room: PreReleaseRoom): Promise<{ home: TeamSquad | null; away: TeamSquad | null }> {
  const buildTeam = async (teamId: number, teamName: string, teamLogo: string | null): Promise<TeamSquad | null> => {
    const squad = await getSquad(teamId).catch(() => null);
    if (!squad) return null;
    const players: SquadPlayer[] = squad.players.map(p => ({
      id: p.id,
      name: p.name,
      position: normalizePosition(p.position),
      lineupStatus: null,
      points: 0,
      breakdown: null,
      minutesPlayed: null,
    }));
    return { teamId, teamName, teamLogo: teamLogo || squad.team.logo, players };
  };

  const [home, away] = await Promise.all([
    buildTeam(room.homeTeamId, room.homeTeamName, room.homeTeamLogo),
    buildTeam(room.awayTeamId, room.awayTeamName, room.awayTeamLogo),
  ]);

  // Merge season appearances where the league season is known. Fetch sequentially
  // to avoid API rate-limiting when neither team is cached.
  const league = LEAGUES.find(l => l.id === room.leagueId);
  if (league) {
    try {
      const homeStats = await getTeamPlayerStats(room.homeTeamId, league.season);
      const awayStats = await getTeamPlayerStats(room.awayTeamId, league.season);
      if (home) for (const p of home.players) p.appearances = homeStats.get(p.id) ?? 0;
      if (away) for (const p of away.players) p.appearances = awayStats.get(p.id) ?? 0;
    } catch (err) {
      console.error('[Squads] pre-release appearances failed:', err);
    }
  }

  // Surface the most-capped players first; falls back to natural order without stats.
  const sortByApps = (t: TeamSquad | null) => {
    if (t) t.players.sort((a, b) => (b.appearances ?? 0) - (a.appearances ?? 0));
  };
  sortByApps(home);
  sortByApps(away);

  return { home, away };
}
