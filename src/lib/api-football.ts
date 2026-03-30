import type {
  ApiFixture,
  ApiSquadResponse,
  ApiFixtureEvent,
  ApiFixturePlayersResponse,
  League,
} from '@/types';

const API_BASE = 'https://v3.football.api-sports.io';

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY environment variable is not set');
  return key;
}

async function apiFetch<T>(endpoint: string, params: Record<string, string | number>): Promise<T[]> {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': getApiKey(),
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.response as T[];
}

// Leagues we support
export const LEAGUES: League[] = [
  { id: 39, name: 'Premier League', season: 2024 },
  { id: 2, name: 'Champions League', season: 2024 },
  { id: 3, name: 'Europa League', season: 2024 },
  { id: 45, name: 'FA Cup', season: 2024 },
  { id: 1, name: 'World Cup', season: 2026 },
];

export async function getFixturesByLeague(
  leagueId: number,
  from: string,
  to: string
): Promise<ApiFixture[]> {
  const league = LEAGUES.find(l => l.id === leagueId);
  if (!league) throw new Error(`Unknown league ID: ${leagueId}`);

  return apiFetch<ApiFixture>('/fixtures', {
    league: leagueId,
    season: league.season,
    from,
    to,
  });
}

export async function getAllUpcomingFixtures(from: string, to: string): Promise<ApiFixture[]> {
  const results = await Promise.allSettled(
    LEAGUES.map(league => getFixturesByLeague(league.id, from, to))
  );

  const fixtures: ApiFixture[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      fixtures.push(...result.value);
    }
  });

  // Sort by date
  fixtures.sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
  return fixtures;
}

export async function getSquad(teamId: number): Promise<ApiSquadResponse> {
  const results = await apiFetch<ApiSquadResponse>('/players/squads', { team: teamId });
  if (!results.length) throw new Error(`No squad found for team ${teamId}`);
  return results[0];
}

export async function getFixtureDetails(fixtureId: number): Promise<ApiFixture> {
  const results = await apiFetch<ApiFixture>('/fixtures', { id: fixtureId });
  if (!results.length) throw new Error(`Fixture ${fixtureId} not found`);
  return results[0];
}

export async function getFixtureEvents(fixtureId: number): Promise<ApiFixtureEvent[]> {
  return apiFetch<ApiFixtureEvent>('/fixtures/events', { fixture: fixtureId });
}

export async function getFixturePlayerStats(fixtureId: number): Promise<ApiFixturePlayersResponse[]> {
  return apiFetch<ApiFixturePlayersResponse>('/fixtures/players', { fixture: fixtureId });
}
