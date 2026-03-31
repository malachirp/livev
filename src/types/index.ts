// API-Football response types

export interface ApiFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    venue?: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
    status: {
      long: string;
      short: string; // NS, 1H, HT, 2H, ET, FT, etc.
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
  };
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface ApiTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface ApiSquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string; // Goalkeeper, Defender, Midfielder, Attacker
  photo: string;
}

export interface ApiSquadResponse {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  players: ApiSquadPlayer[];
}

export interface ApiFixtureEvent {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number;
    name: string;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: string; // Goal, Card, subst, Var
  detail: string; // Normal Goal, Yellow Card, Red Card, Penalty, Own Goal, Missed Penalty, etc.
}

export interface ApiPlayerStats {
  player: {
    id: number;
    name: string;
    photo: string;
  };
  statistics: Array<{
    games: {
      minutes: number | null;
      number: number;
      position: string;
      rating: string | null;
    };
    goals: {
      total: number | null;
      conceded: number | null;
      assists: number | null;
      saves: number | null;
    };
    passes: {
      total: number | null;
      key: number | null;
      accuracy: string | null;
    };
    shots: {
      total: number | null;
      on: number | null;
    };
    tackles: {
      total: number | null;
      blocks: number | null;
      interceptions: number | null;
    };
    duels: {
      total: number | null;
      won: number | null;
    };
    dribbles: {
      attempts: number | null;
      success: number | null;
    };
    fouls: {
      drawn: number | null;
      committed: number | null;
    };
    cards: {
      yellow: number;
      red: number;
    };
    penalty: {
      won: number | null;
      commited: number | null;
      scored: number | null;
      missed: number | null;
      saved: number | null;
    };
  }>;
}

export interface ApiFixturePlayersResponse {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  players: ApiPlayerStats[];
}

// App types

export interface League {
  id: number;
  name: string;
  season: number;
  logo?: string;
}

export interface NormalizedPlayer {
  id: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  number: number | null;
  photo: string;
  teamId: number;
  teamName: string;
  teamLogo: string;
}

export interface PickData {
  footballPlayerId: number;
  footballPlayerName: string;
  teamId: number;
  position: string;
  slotIndex: number;
}

export interface RoomData {
  id: string;
  code: string;
  fixtureId: number;
  leagueId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  venue?: string | null;
  matchDate: string;
  players: PlayerData[];
}

export interface PlayerData {
  id: string;
  displayName: string;
  isCreator: boolean;
  totalPoints: number;
  captainSlot: number;
  picks: PickSlot[];
}

export interface PickSlot {
  footballPlayerId: number;
  footballPlayerName: string;
  teamId: number;
  position: string;
  slotIndex: number;
  points: number;
  pointsBreakdown: Record<string, number> | null;
}

export interface LiveData {
  match: {
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    minute: number | null;
    events: ApiFixtureEvent[];
  };
  leaderboard: PlayerData[];
}

export type MatchStatus = 'NS' | '1H' | 'HT' | '2H' | 'ET' | 'FT' | 'AET' | 'PEN' | 'SUSP' | 'INT' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' | 'LIVE';

export function isMatchLive(status: string): boolean {
  return ['1H', '2H', 'ET', 'LIVE'].includes(status);
}

export function isMatchFinished(status: string): boolean {
  return ['FT', 'AET', 'PEN'].includes(status);
}

export function isMatchNotStarted(status: string): boolean {
  return status === 'NS';
}
