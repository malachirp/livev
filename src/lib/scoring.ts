import type { ApiFixtureEvent, ApiFixturePlayersResponse, ApiPlayerStats } from '@/types';

export interface PointsBreakdown {
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  saves: number;
  penaltySave: number;
  yellowCard: number;
  redCard: number;
  ownGoal: number;
  penaltyMiss: number;
}

export const SCORING = {
  APPEARANCE: 1,
  GOAL: 6,
  ASSIST: 4,
  CLEAN_SHEET_GK: 5,
  CLEAN_SHEET_DEF: 3,
  SAVES_PER_3: 2,
  PENALTY_SAVE: 5,
  YELLOW_CARD: -1,
  RED_CARD: -3,
  OWN_GOAL: -3,
  PENALTY_MISS: -3,
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
    cleanSheet: 0,
    saves: 0,
    penaltySave: 0,
    yellowCard: 0,
    redCard: 0,
    ownGoal: 0,
    penaltyMiss: 0,
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

  // GK/DEF specific: saves and clean sheets
  if (playerStats && playerStats.statistics[0]) {
    const stats = playerStats.statistics[0];

    // Saves (GK only)
    if (pickPosition === 'GK' && stats.goals.saves) {
      const savesBonuses = Math.floor(stats.goals.saves / 3);
      breakdown.saves = savesBonuses * SCORING.SAVES_PER_3;
    }

    // Penalty saves
    if (stats.penalty.saved && stats.penalty.saved > 0) {
      breakdown.penaltySave = stats.penalty.saved * SCORING.PENALTY_SAVE;
    }
  }

  // Clean sheet check: only at FT/AET/PEN, player must have appeared
  const isFinished = ['FT', 'AET', 'PEN'].includes(matchStatus);
  if (isFinished && breakdown.appearance > 0) {
    // Determine if the player's team kept a clean sheet
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

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { total, breakdown };
}
