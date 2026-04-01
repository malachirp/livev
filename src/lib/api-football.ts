import type {
  ApiFixture,
  ApiSquadResponse,
  ApiFixtureEvent,
  ApiFixturePlayersResponse,
  ApiLineupResponse,
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

  console.log(`[API-Football] Fetching: ${endpoint}`, params);

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

  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error(`[API-Football] API errors for ${endpoint}:`, data.errors);
  }

  console.log(`[API-Football] ${endpoint} returned ${data.results ?? 0} results`);
  return data.response as T[];
}

// --- In-memory caches ---

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const fixtureCache = new Map<string, CacheEntry<ApiFixture[]>>();
const squadCache = new Map<number, CacheEntry<ApiSquadResponse>>();
const lineupCache = new Map<number, CacheEntry<ApiLineupResponse[] | null>>();

const FIXTURE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const SQUAD_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const LINEUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (short so we pick up lineups when released)

function getCached<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

// Leagues we support — season = year the season started (2025 = 2025-26 season)
// We include current and previous season to handle the transition period
export const LEAGUES: League[] = [
  { id: 1, name: 'World Cup', season: 2026 },
  { id: 2, name: 'Champions League', season: 2025 },
  { id: 39, name: 'Premier League', season: 2025 },
  { id: 45, name: 'FA Cup', season: 2025 },
  { id: 41, name: 'League One', season: 2025 },
  { id: 40, name: 'Championship', season: 2025 },
  { id: 140, name: 'La Liga', season: 2025 },
  { id: 78, name: 'Bundesliga', season: 2025 },
  { id: 94, name: 'Primeira Liga', season: 2025 },
  { id: 3, name: 'Europa League', season: 2025 },
  { id: 761, name: "Women's Champions League", season: 2025 },
  { id: 32, name: 'WC Qualifiers', season: 2026 },
  { id: 10, name: 'Friendlies', season: 2026 },
];

// Fallback seasons to try if primary returns no results
const FALLBACK_SEASONS: Record<number, number> = {
  2: 2024,
  39: 2024,
  40: 2024,
  41: 2024,
  45: 2024,
  140: 2024,
  78: 2024,
  94: 2024,
  3: 2024,
  761: 2024,
  32: 2024,
  10: 2025,
};

// Relevant nations for friendlies filtering:
// Home nations + Republic of Ireland, plus all 2026 World Cup qualified/qualifying nations
const RELEVANT_FRIENDLY_NATIONS = new Set([
  // Home nations + Ireland
  'england', 'scotland', 'wales', 'northern ireland', 'republic of ireland', 'ireland',
  // Europe
  'france', 'germany', 'spain', 'italy', 'portugal', 'netherlands', 'belgium',
  'croatia', 'denmark', 'turkey', 'sweden', 'poland', 'austria', 'switzerland',
  'serbia', 'ukraine', 'romania', 'greece', 'czech republic', 'czechia', 'hungary',
  'norway', 'finland', 'iceland', 'slovenia', 'slovakia', 'albania', 'georgia',
  'bosnia and herzegovina', 'montenegro', 'north macedonia', 'bulgaria',
  // South America
  'brazil', 'argentina', 'colombia', 'uruguay', 'chile', 'paraguay', 'peru', 'ecuador',
  'venezuela', 'bolivia',
  // Asia
  'japan', 'south korea', 'korea republic', 'iran', 'saudi arabia', 'qatar',
  'australia', 'uzbekistan', 'iraq', 'china',
  // Africa
  'morocco', 'cameroon', 'south africa', 'egypt', 'nigeria', 'senegal', 'ghana',
  'tunisia', 'algeria', 'ivory coast', 'cote d\'ivoire', 'mali', 'dr congo',
  // CONCACAF
  'mexico', 'usa', 'united states', 'canada', 'costa rica', 'jamaica', 'panama', 'honduras',
]);

// Patterns that indicate age-group or non-senior friendlies
const AGE_GROUP_PATTERN = /\bU\d{2}\b|Under[ -]?\d{2}|Olympic|Women|U-\d{2}/i;

function isRelevantFriendly(fixture: ApiFixture): boolean {
  const homeName = fixture.teams.home.name;
  const awayName = fixture.teams.away.name;

  // Exclude age-group teams
  if (AGE_GROUP_PATTERN.test(homeName) || AGE_GROUP_PATTERN.test(awayName)) {
    return false;
  }

  // At least one team must be a relevant nation
  const homeRelevant = RELEVANT_FRIENDLY_NATIONS.has(homeName.toLowerCase());
  const awayRelevant = RELEVANT_FRIENDLY_NATIONS.has(awayName.toLowerCase());

  return homeRelevant || awayRelevant;
}

export async function getFixturesByLeague(
  leagueId: number,
  from: string,
  to: string
): Promise<ApiFixture[]> {
  const league = LEAGUES.find(l => l.id === leagueId);
  if (!league) throw new Error(`Unknown league ID: ${leagueId}`);

  const cacheKey = `${leagueId}-${from}-${to}`;
  const cached = getCached(fixtureCache, cacheKey);
  if (cached) {
    console.log(`[API-Football] Cache hit for fixtures: league=${leagueId}`);
    return cached;
  }

  // Try primary season
  let fixtures = await apiFetch<ApiFixture>('/fixtures', {
    league: leagueId,
    season: league.season,
    from,
    to,
  });

  // If no results and there's a fallback season, try that
  if (fixtures.length === 0 && FALLBACK_SEASONS[leagueId]) {
    console.log(`[API-Football] No fixtures for league ${leagueId} season ${league.season}, trying fallback season ${FALLBACK_SEASONS[leagueId]}`);
    fixtures = await apiFetch<ApiFixture>('/fixtures', {
      league: leagueId,
      season: FALLBACK_SEASONS[leagueId],
      from,
      to,
    });
  }

  // Filter friendlies to only show relevant senior international matches
  if (leagueId === 10) {
    const before = fixtures.length;
    fixtures = fixtures.filter(isRelevantFriendly);
    console.log(`[API-Football] Filtered friendlies: ${before} -> ${fixtures.length} relevant matches`);
  }

  fixtureCache.set(cacheKey, { data: fixtures, expiresAt: Date.now() + FIXTURE_CACHE_TTL });
  return fixtures;
}

export async function getAllUpcomingFixtures(from: string, to: string): Promise<ApiFixture[]> {
  const results = await Promise.allSettled(
    LEAGUES.map(league => getFixturesByLeague(league.id, from, to))
  );

  const fixtures: ApiFixture[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      fixtures.push(...result.value);
    } else {
      console.error(`[API-Football] Failed to fetch league ${LEAGUES[i].name}:`, result.reason);
    }
  });

  // Sort by date
  fixtures.sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
  return fixtures;
}

export async function getSquad(teamId: number): Promise<ApiSquadResponse> {
  const cached = getCached(squadCache, teamId);
  if (cached) {
    console.log(`[API-Football] Cache hit for squad: team=${teamId}`);
    return cached;
  }

  const results = await apiFetch<ApiSquadResponse>('/players/squads', { team: teamId });
  if (!results.length) throw new Error(`No squad found for team ${teamId}`);

  squadCache.set(teamId, { data: results[0], expiresAt: Date.now() + SQUAD_CACHE_TTL });
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

export async function getFixtureLineups(fixtureId: number): Promise<ApiLineupResponse[] | null> {
  // Check cache manually since getCached can't distinguish "cached null" from "not cached"
  const entry = lineupCache.get(fixtureId);
  if (entry && Date.now() <= entry.expiresAt) {
    console.log(`[API-Football] Cache hit for lineups: fixture=${fixtureId}`);
    return entry.data;
  }
  if (entry) lineupCache.delete(fixtureId);

  try {
    const results = await apiFetch<ApiLineupResponse>('/fixtures/lineups', { fixture: fixtureId });
    if (!results.length) {
      // No lineups released yet — cache the empty result briefly so we don't hammer the API
      lineupCache.set(fixtureId, { data: null, expiresAt: Date.now() + LINEUP_CACHE_TTL });
      return null;
    }
    lineupCache.set(fixtureId, { data: results, expiresAt: Date.now() + LINEUP_CACHE_TTL });
    return results;
  } catch (err) {
    console.error(`[API-Football] Failed to fetch lineups for fixture ${fixtureId}:`, err);
    return null;
  }
}
