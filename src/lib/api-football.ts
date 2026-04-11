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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10 second timeout

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'x-apisports-key': getApiKey(),
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`[API-Football] API errors for ${endpoint}:`, data.errors);
      // If we got errors and no results, throw so callers know the data is bad
      if (!data.response || data.response.length === 0) {
        throw new Error(`API-Football returned errors for ${endpoint}: ${JSON.stringify(data.errors)}`);
      }
    }

    console.log(`[API-Football] ${endpoint} returned ${data.results ?? 0} results`);
    return data.response as T[];
  } finally {
    clearTimeout(timeout);
  }
}

// --- In-memory caches ---

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const fixtureCache = new Map<string, CacheEntry<ApiFixture[]>>();
const squadCache = new Map<number, CacheEntry<ApiSquadResponse>>();
const lineupCache = new Map<number, CacheEntry<ApiLineupResponse[] | null>>();
const fixtureDetailsCache = new Map<number, CacheEntry<ApiFixture>>();
const fixtureEventsCache = new Map<number, CacheEntry<ApiFixtureEvent[]>>();
const fixturePlayerStatsCache = new Map<number, CacheEntry<ApiFixturePlayersResponse[]>>();

// Player season stats cache: keyed by "teamId-season"
// Stores a map of playerId -> { teamAppearances, otherAppearances }
// "team" = the team we queried (could be club or national team)
// "other" = all other teams (international duty if queried club, club if queried national team)
export interface PlayerSeasonStats {
  teamAppearances: number;
  otherAppearances: number;
}
const playerStatsCache = new Map<string, CacheEntry<Map<number, PlayerSeasonStats>>>();

const FIXTURE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const SQUAD_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const PLAYER_STATS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — season stats change slowly
const LINEUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (short so we pick up lineups when released)
const FIXTURE_DETAILS_CACHE_TTL = 55 * 1000; // 55 seconds — aligned with 1-min client polling
const FIXTURE_EVENTS_CACHE_TTL = 55 * 1000; // 55 seconds
const FIXTURE_PLAYER_STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — player stats don't change frequently

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
  { id: 525, name: "Women's Champions League", season: 2025 },
  { id: 32, name: 'WC Qualifiers', season: 2026 },
  { id: 10, name: 'Friendlies', season: 2026 },
];


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

  let fixtures = await apiFetch<ApiFixture>('/fixtures', {
    league: leagueId,
    season: league.season,
    from,
    to,
  });

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
  const fixtures: ApiFixture[] = [];

  // Fetch leagues sequentially with a delay to avoid hitting API rate limits
  for (const league of LEAGUES) {
    try {
      const result = await getFixturesByLeague(league.id, from, to);
      fixtures.push(...result);
    } catch (err) {
      console.error(`[API-Football] Failed to fetch league ${league.name}:`, err);
    }
    // Small delay between requests (skipped if cache hit since no API call was made)
    await new Promise(resolve => setTimeout(resolve, 250));
  }

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
  const cached = getCached(fixtureDetailsCache, fixtureId);
  if (cached) {
    console.log(`[API-Football] Cache hit for fixture details: fixture=${fixtureId}`);
    return cached;
  }

  const results = await apiFetch<ApiFixture>('/fixtures', { id: fixtureId });
  if (!results.length) throw new Error(`Fixture ${fixtureId} not found`);

  fixtureDetailsCache.set(fixtureId, { data: results[0], expiresAt: Date.now() + FIXTURE_DETAILS_CACHE_TTL });
  return results[0];
}

export async function getFixtureEvents(fixtureId: number): Promise<ApiFixtureEvent[]> {
  const cached = getCached(fixtureEventsCache, fixtureId);
  if (cached) {
    console.log(`[API-Football] Cache hit for fixture events: fixture=${fixtureId}`);
    return cached;
  }

  const results = await apiFetch<ApiFixtureEvent>('/fixtures/events', { fixture: fixtureId });
  fixtureEventsCache.set(fixtureId, { data: results, expiresAt: Date.now() + FIXTURE_EVENTS_CACHE_TTL });
  return results;
}

// Clear in-memory caches for a fixture (used when match finishes to force fresh final stats)
export function clearFixtureCaches(fixtureId: number) {
  fixtureDetailsCache.delete(fixtureId);
  fixtureEventsCache.delete(fixtureId);
  fixturePlayerStatsCache.delete(fixtureId);
}

export async function getFixturePlayerStats(fixtureId: number): Promise<ApiFixturePlayersResponse[]> {
  const cached = getCached(fixturePlayerStatsCache, fixtureId);
  if (cached) {
    console.log(`[API-Football] Cache hit for player stats: fixture=${fixtureId}`);
    return cached;
  }

  const results = await apiFetch<ApiFixturePlayersResponse>('/fixtures/players', { fixture: fixtureId });
  fixturePlayerStatsCache.set(fixtureId, { data: results, expiresAt: Date.now() + FIXTURE_PLAYER_STATS_CACHE_TTL });
  return results;
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

// ── Player season stats (appearances, goals, assists) ──

interface ApiPlayerStatsResponse {
  player: { id: number; name: string };
  statistics: Array<{
    team: { id: number };
    league: { id: number; season: number };
    games: { appearences: number | null; minutes: number | null }; // API typo: "appearences"
    goals: { total: number | null; assists: number | null };
  }>;
}

/**
 * Fetch season stats for all players in a team for a given season.
 * No league filter — we get all competitions and sum club vs international.
 * Handles pagination (API returns 20 per page). Returns a Map of playerId -> stats.
 */
export async function getTeamPlayerStats(
  teamId: number,
  season: number,
): Promise<Map<number, PlayerSeasonStats>> {
  const cacheKey = `${teamId}-${season}`;
  const cached = getCached(playerStatsCache, cacheKey);
  if (cached) {
    console.log(`[API-Football] Cache hit for player stats: team=${teamId}`);
    return cached;
  }

  const statsMap = new Map<number, PlayerSeasonStats>();

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${API_BASE}/players`);
      url.searchParams.set('team', String(teamId));
      url.searchParams.set('season', String(season));
      url.searchParams.set('page', String(page));

      console.log(`[API-Football] Fetching player stats: team=${teamId} season=${season} page=${page}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetch(url.toString(), {
          headers: { 'x-apisports-key': getApiKey() },
          signal: controller.signal,
          next: { revalidate: 0 },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          console.error(`[API-Football] Player stats error: ${res.status}`);
          break;
        }

        const data = await res.json();
        const results: ApiPlayerStatsResponse[] = data.response || [];
        const paging = data.paging || { current: 1, total: 1 };

        for (const entry of results) {
          if (entry.statistics && entry.statistics.length > 0) {
            let clubApps = 0;
            let intlApps = 0;
            for (const stat of entry.statistics) {
              const apps = stat.games.appearences ?? 0;
              // If the stat's team matches the team we queried, it's "for this team"
              // Otherwise it's appearances for another team (international duty etc.)
              if (stat.team.id === teamId) {
                clubApps += apps;
              } else {
                intlApps += apps;
              }
            }
            statsMap.set(entry.player.id, {
              teamAppearances: clubApps,
              otherAppearances: intlApps,
            });
          }
        }

        hasMore = paging.current < paging.total;
        page++;

        // Rate-limit: delay between pages
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error(`[API-Football] Player stats page ${page} failed:`, err);
        break;
      }
    }
  } catch (err) {
    console.error(`[API-Football] Failed to fetch player stats for team ${teamId}:`, err);
  }

  playerStatsCache.set(cacheKey, { data: statsMap, expiresAt: Date.now() + PLAYER_STATS_CACHE_TTL });
  return statsMap;
}

// ── Background pre-fetch for player season stats ──

let prefetchRunning = false;

/**
 * Pre-fetch player season stats for all teams in the given fixtures.
 * Runs in the background with delays between API calls to avoid flooding.
 * Safe to call multiple times — skips if already running or data is cached.
 */
export function prefetchPlayerStats(fixtures: ApiFixture[]) {
  if (prefetchRunning) return;

  // Collect unique team+season combos
  const toFetch: { teamId: number; season: number }[] = [];
  const seen = new Set<string>();

  for (const f of fixtures) {
    const league = LEAGUES.find(l => l.id === f.league.id);
    if (!league) continue;

    for (const teamId of [f.teams.home.id, f.teams.away.id]) {
      const key = `${teamId}-${league.season}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip if already cached
      const cached = getCached(playerStatsCache, key);
      if (cached) continue;

      toFetch.push({ teamId, season: league.season });
    }
  }

  if (toFetch.length === 0) return;

  prefetchRunning = true;
  console.log(`[API-Football] Background prefetch: ${toFetch.length} team stats to fetch`);

  // Run in background — sequential with delays
  (async () => {
    for (let i = 0; i < toFetch.length; i++) {
      const { teamId, season } = toFetch[i];
      try {
        await getTeamPlayerStats(teamId, season);
      } catch (err) {
        console.error(`[API-Football] Prefetch failed for team ${teamId}:`, err);
      }
      // 2 second delay between teams
      if (i < toFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    prefetchRunning = false;
    console.log(`[API-Football] Background prefetch complete`);
  })();
}
