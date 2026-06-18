'use client';

interface Props {
  breakdown: Record<string, any>;
  isCaptain?: boolean;
}

const BREAKDOWN_ITEMS: { key: string; label: string }[] = [
  // Positives by magnitude
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'cleanSheet', label: 'Clean Sheet' },
  { key: 'penaltySave', label: 'Penalty Save' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'resultBonus', label: 'Result Bonus' },
  { key: 'shotsOnTarget', label: 'Shots on Target' },
  { key: 'keyPasses', label: 'Key Passes' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
  { key: 'dribblesWon', label: 'Dribbles Won' },
  { key: 'saves', label: 'Saves Bonus' },
  // Negatives by magnitude
  { key: 'redCard', label: 'Red Card' },
  { key: 'ownGoal', label: 'Own Goal' },
  { key: 'penaltyMiss', label: 'Penalty Miss' },
  { key: 'goalsConceded', label: 'Goals Conceded (3+)' },
  { key: 'yellowCard', label: 'Yellow Card' },
  { key: 'foulsCommitted', label: 'Fouls Committed' },
];

export { BREAKDOWN_ITEMS };

export default function PointsBreakdown({ breakdown, isCaptain }: Props) {
  return (
    <div className="mx-3 mt-1 mb-1 bg-navy/60 rounded-lg px-3 py-2 animate-slide-up">
      {(breakdown.minutesPlayed || breakdown.rating) && (
        <div className="flex items-center gap-3 mb-1.5 pb-1.5 border-b border-white/5">
          {breakdown.minutesPlayed && (
            <span className="text-[10px] text-white/50">
              <span className="text-white/30">Min</span> {breakdown.minutesPlayed}&apos;
            </span>
          )}
          {breakdown.rating && (
            <span className="text-[10px] text-white/50">
              <span className="text-white/30">Rating</span> {breakdown.rating}
            </span>
          )}
        </div>
      )}

      {BREAKDOWN_ITEMS.map(({ key, label }) => {
        const val = breakdown[key];
        if (!val || val === 0) return null;
        return (
          <div key={key} className="flex justify-between items-center py-0.5">
            <span className="text-[10px] text-white/40">{label}</span>
            <span className={`text-[10px] font-bold ${val > 0 ? 'text-accent' : 'text-live-red'}`}>
              {val > 0 ? '+' : ''}{val}
            </span>
          </div>
        );
      })}

      {isCaptain && (
        <div className="flex justify-between items-center py-0.5 mt-1 pt-1 border-t border-white/5">
          <span className="text-[10px] text-points-gold font-bold">Captain ×2</span>
          <span className="text-[10px] font-bold text-points-gold">×2</span>
        </div>
      )}
    </div>
  );
}
