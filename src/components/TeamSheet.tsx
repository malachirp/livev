'use client';

import { useState } from 'react';
import type { PickSlot } from '@/types';
import { getTeamColours } from '@/lib/team-colours';

interface Props {
  picks: PickSlot[];
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName?: string;
  awayTeamName?: string;
  captainSlot?: number;
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};

// Order and labels for the breakdown — scoring items only
const BREAKDOWN_ITEMS: { key: string; label: string }[] = [
  { key: 'appearance', label: 'Appearance' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'shotsOnTarget', label: 'Shots on Target' },
  { key: 'keyPasses', label: 'Key Passes' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
  { key: 'dribblesWon', label: 'Dribbles Won' },
  { key: 'foulsCommitted', label: 'Fouls Committed' },
  { key: 'cleanSheet', label: 'Clean Sheet' },
  { key: 'saves', label: 'Saves Bonus' },
  { key: 'penaltySave', label: 'Penalty Save' },
  { key: 'yellowCard', label: 'Yellow Card' },
  { key: 'redCard', label: 'Red Card' },
  { key: 'ownGoal', label: 'Own Goal' },
  { key: 'penaltyMiss', label: 'Penalty Miss' },
  { key: 'resultBonus', label: 'Result Bonus' },
];

export default function TeamSheet({ picks, homeTeamId, awayTeamId, homeTeamName, awayTeamName, captainSlot }: Props) {
  const sorted = [...picks].sort((a, b) => a.slotIndex - b.slotIndex);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  function resolveTeamName(teamId: number): string | undefined {
    if (teamId === homeTeamId) return homeTeamName;
    if (teamId === awayTeamId) return awayTeamName;
    return undefined;
  }

  return (
    <div className="bg-charcoal/40 rounded-xl p-3 space-y-1.5">
      {sorted.map(pick => {
        const teamColours = getTeamColours(pick.teamId, resolveTeamName(pick.teamId));
        const points = pick.points;
        const isCaptain = captainSlot !== undefined && pick.slotIndex === captainSlot;
        const isExpanded = expandedSlot === pick.slotIndex;
        const breakdown = pick.pointsBreakdown as (Record<string, any> | null);

        return (
          <div key={pick.slotIndex}>
            <button
              onClick={() => breakdown && setExpandedSlot(isExpanded ? null : pick.slotIndex)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-navy/40"
            >
              {/* Position badge */}
              <span
                className="text-[10px] font-black uppercase w-8 text-center py-0.5 rounded"
                style={{ backgroundColor: `${teamColours.primary}30`, color: teamColours.primary }}
              >
                {POSITION_LABELS[pick.position] || pick.position}
              </span>

              {/* Team colour dot */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: teamColours.primary }}
              />

              {/* Name + captain badge */}
              <span className="text-xs font-semibold text-white/80 flex-1 truncate text-left">
                {pick.footballPlayerName}
                {isCaptain && (
                  <span className="ml-1.5 text-[9px] font-black text-points-gold bg-points-gold/15 px-1.5 py-0.5 rounded">
                    C ×1.5
                  </span>
                )}
              </span>

              {/* Points */}
              <span className={`text-sm font-black ${
                points > 0 ? 'text-accent' : points < 0 ? 'text-live-red' : 'text-white/30'
              }`}>
                {points > 0 ? '+' : ''}{points}
              </span>

              {/* Expand indicator */}
              {breakdown && (
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-white/20 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>

            {/* Expanded breakdown */}
            {isExpanded && breakdown && (
              <div className="mx-3 mt-1 mb-1 bg-navy/60 rounded-lg px-3 py-2 animate-slide-up">
                {/* Minutes + rating header */}
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

                {/* All scoring items */}
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
