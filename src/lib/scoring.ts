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
  goalsConceded: number;
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
  GOAL: 10,
  ASSIST: 6,
  SHOT_ON_TARGET: 1,
  KEY_PASS: 1,
  TACKLE: 1,
  INTERCEPTION: 1,
  DRIBBLE: 1,
  FOUL_COMMITTED: -1,
  SAVE: 1,
  CLEAN_SHEET_GK: 6,
  CLEAN_SHEET_DEF: 4,
  PENALTY_SAVE: 6,
  GOALS_CONCEDED_3_PLUS: -3, // GK penalty when team concedes 3+ goals
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
    goalsConceded: 0,
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
    breakdown.rating = playerStats.statistics[0].games.rating;

    // Show the match minute when this player's stats were last updated.
    // games.minutes = playing time (minutes since they entered the pitch).
    // For starters (on from minute 0), games.minutes IS the match minute.
    // For subs, we add the minute they came on to get the actual match minute.
    const playingMinutes = playerStats.statistics[0].games.minutes;
    const subEvent = events.find(
      e => e.type === 'subst' && e.assist.id === footballPlayerId
    );
    const subOnMinute = subEvent ? subEvent.time.elapsed : 0;
    breakdown.minutesPlayed = subOnMinute + playingMinutes;
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

  // Stats-based scoring — only if player has appeared (played minutes)
  if (playerStats && playerStats.statistics[0] && breakdown.appearance > 0) {
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

    // Tackles
    const tacklesTotal = stats.tackles.total ?? 0;
    if (tacklesTotal > 0) {
      breakdown.tackles = tacklesTotal * SCORING.TACKLE;
    }

    // Interceptions
    const interceptionsTotal = stats.tackles.interceptions ?? 0;
    if (interceptionsTotal > 0) {
      breakdown.interceptions = interceptionsTotal * SCORING.INTERCEPTION;
    }

    // Successful dribbles
    const dribblesSuccess = stats.dribbles.success ?? 0;
    if (dribblesSuccess > 0) {
      breakdown.dribblesWon = dribblesSuccess * SCORING.DRIBBLE;
    }

    // Fouls committed
    const foulsCommitted = stats.fouls.committed ?? 0;
    if (foulsCommitted > 0) {
      breakdown.foulsCommitted = foulsCommitted * SCORING.FOUL_COMMITTED;
    }

    // Saves (GK only)
    if (pickPosition === 'GK' && stats.goals.saves) {
      breakdown.saves = stats.goals.saves * SCORING.SAVE;
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

    // GK penalty for conceding 3+ goals
    if (pickPosition === 'GK' && goalsAgainst !== null && goalsAgainst >= 3) {
      breakdown.goalsConceded = SCORING.GOALS_CONCEDED_3_PLUS;
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
