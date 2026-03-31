import type { ApiFixtureEvent, ApiFixturePlayersResponse, ApiPlayerStats } from '@/types';

export interface PointsBreakdown {
  appearance: number;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  dribblesWon: number;
  foulsCommitted: number;
  cleanSheet: number;
  saves: number;
  penaltySave: number;
  yellowCard: number;
  redCard: number;
  ownGoal: number;
  penaltyMiss: number;
  resultBonus: number;
  minutesPlayed: number | null;
  rating: string | null;
}

export const SCORING = {
  APPEARANCE: 2,
  GOAL: 8,
  ASSIST: 5,
  SHOT_ON_TARGET: 1,
  KEY_PASS: 1,
  TACKLES_PER_3: 1,
  INTERCEPTIONS_PER_3: 1,
  DRIBBLES_PER_2: 1,
  FOULS_COMMITTED_PER_3: -1,
  CLEAN_SHEET_GK: 6,
  CLEAN_SHEET_DEF: 4,
  SAVES_PER_3: 2,
  PENALTY_SAVE: 6,
  YELLOW_CARD: -2,
  RED_CARD: -4,
  OWN_GOAL: -4,
  PENALTY_MISS: -4,
  WIN_BONUS: 2,
  LOSS_PENALTY: -2,
} as const;

export function calculatePlayerPoints(
  footballPlayerId: number,
  pickPosition: string,
  pickTeamId: number,
  events: ApiFixtureEvent[],
  teamPlayerStats: ApiFixturePlayersResponse[],
  matchStatus: string,
  homeScore: number | null,
  awayScore: number | null,
  homeTeamId: number,
  awayTeamId: number
): { total: number; breakdown: PointsBreakdown } {
  const breakdown: PointsBreakdown = {
    appearance: 0,
    goals: 0,
    assists: 0,
    shotsOnTarget: 0,
    keyPasses: 0,
    tackles: 0,
    interceptions: 0,
    dribblesWon: 0,
    foulsCommitted: 0,
    cleanSheet: 0,
    saves: 0,
    penaltySave: 0,
    yellowCard: 0,
    redCard: 0,
    ownGoal: 0,
    penaltyMiss: 0,
    resultBonus: 0,
    minutesPlayed: null,
    rating: null,
  };

  // Find player stats
  let playerStats: ApiPlayerStats | null = null;
  for (const team of teamPlayerStats) {
    const found = team.players.find(p => p.player.id === footballPlayerId);
    if (found) {
      playerStats = found;
      break;
    }
  }

  // Appearance: played any minutes
  if (playerStats && playerStats.statistics[0]?.games.minutes) {
    breakdown.appearance = SCORING.APPEARANCE;
    breakdown.minutesPlayed = playerStats.statistics[0].games.minutes;
    breakdown.rating = playerStats.statistics[0].games.rating;
  }

  // Goals from events (more reliable than stats for real-time)
  const playerGoals = events.filter(
    e => e.player.id === footballPlayerId && e.type === 'Goal' && e.detail !== 'Own Goal' && e.detail !== 'Missed Penalty'
  );
  breakdown.goals = playerGoals.length * SCORING.GOAL;

  // Assists from events
  const playerAssists = events.filter(
    e => e.assist.id === footballPlayerId && e.type === 'Goal' && e.detail !== 'Own Goal'
  );
  breakdown.assists = playerAssists.length * SCORING.ASSIST;

  // Own goals
  const ownGoals = events.filter(
    e => e.player.id === footballPlayerId && e.type === 'Goal' && e.detail === 'Own Goal'
  );
  breakdown.ownGoal = ownGoals.length * SCORING.OWN_GOAL;

  // Penalty misses
  const penaltyMisses = events.filter(
    e => e.player.id === footballPlayerId && e.type === 'Goal' && e.detail === 'Missed Penalty'
  );
  breakdown.penaltyMiss = penaltyMisses.length * SCORING.PENALTY_MISS;

  // Cards from events
  const yellowCards = events.filter(
    e => e.player.id === footballPlayerId && e.type === 'Card' && e.detail === 'Yellow Card'
  );
  breakdown.yellowCard = yellowCards.length * SCORING.YELLOW_CARD;

  const redCards = events.filter(
    e => e.player.id === footballPlayerId && e.type === 'Card' && (e.detail === 'Red Card' || e.detail === 'Second Yellow card')
  );
  breakdown.redCard = redCards.length * SCORING.RED_CARD;

  // Stats-based scoring
  if (playerStats && playerStats.statistics[0]) {
    const stats = playerStats.statistics[0];

    // Shots on target
    const shotsOn = stats.shots?.on ?? 0;
    if (shotsOn > 0) {
      breakdown.shotsOnTarget = shotsOn * SCORING.SHOT_ON_TARGET;
    }

    // Key passes
    const keyPasses = stats.passes.key ?? 0;
    if (keyPasses > 0) {
      breakdown.keyPasses = keyPasses * SCORING.KEY_PASS;
    }

    // Tackles (every 3)
    const tacklesTotal = stats.tackles.total ?? 0;
    if (tacklesTotal >= 3) {
      breakdown.tackles = Math.floor(tacklesTotal / 3) * SCORING.TACKLES_PER_3;
    }

    // Interceptions (every 3)
    const interceptionsTotal = stats.tackles.interceptions ?? 0;
    if (interceptionsTotal >= 3) {
      breakdown.interceptions = Math.floor(interceptionsTotal / 3) * SCORING.INTERCEPTIONS_PER_3;
    }

    // Successful dribbles (every 2)
    const dribblesSuccess = stats.dribbles.success ?? 0;
    if (dribblesSuccess >= 2) {
      breakdown.dribblesWon = Math.floor(dribblesSuccess / 2) * SCORING.DRIBBLES_PER_2;
    }

    // Fouls committed (every 3 = -1)
    const foulsCommitted = stats.fouls.committed ?? 0;
    if (foulsCommitted >= 3) {
      breakdown.foulsCommitted = Math.floor(foulsCommitted / 3) * SCORING.FOULS_COMMITTED_PER_3;
    }

    // Saves (GK only, every 3)
    if (pickPosition === 'GK' && stats.goals.saves) {
      const savesBonuses = Math.floor(stats.goals.saves / 3);
      breakdown.saves = savesBonuses * SCORING.SAVES_PER_3;
    }

    // Penalty saves
    if (stats.penalty.saved && stats.penalty.saved > 0) {
      breakdown.penaltySave = stats.penalty.saved * SCORING.PENALTY_SAVE;
    }
  }

  const isFinished = ['FT', 'AET', 'PEN'].includes(matchStatus);

  // Clean sheet check: only at FT/AET/PEN, player must have appeared
  if (isFinished && breakdown.appearance > 0) {
    const isHome = pickTeamId === homeTeamId;
    const goalsAgainst = isHome ? awayScore : homeScore;

    if (goalsAgainst === 0) {
      if (pickPosition === 'GK') {
        breakdown.cleanSheet = SCORING.CLEAN_SHEET_GK;
      } else if (pickPosition === 'DEF') {
        breakdown.cleanSheet = SCORING.CLEAN_SHEET_DEF;
      }
    }
  }

  // Win/loss bonus: only at FT/AET/PEN, player must have appeared
  if (isFinished && breakdown.appearance > 0 && homeScore !== null && awayScore !== null) {
    const isHome = pickTeamId === homeTeamId;
    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;

    if (teamScore > opponentScore) {
      breakdown.resultBonus = SCORING.WIN_BONUS;
    } else if (teamScore < opponentScore) {
      breakdown.resultBonus = SCORING.LOSS_PENALTY;
    }
  }

  // Total: sum only the numeric scoring fields (exclude minutesPlayed and rating)
  const { minutesPlayed: _m, rating: _r, ...scoringFields } = breakdown;
  const total = Object.values(scoringFields).reduce((sum, v) => sum + (v as number), 0);
  return { total, breakdown };
}
