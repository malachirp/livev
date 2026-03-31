'use client';

import { useState } from 'react';
import type { PickSlot } from '@/types';
import { getTeamColours } from '@/lib/team-colours';

interface DetailedStats {
  minutesPlayed?: number | null;
  rating?: string | null;
  shotsTotal?: number | null;
  shotsOnTarget?: number | null;
  passesTotal?: number | null;
  passesKey?: number | null;
  passAccuracy?: string | null;
  tacklesTotal?: number | null;
  interceptions?: number | null;
  blocks?: number | null;
  duelsTotal?: number | null;
  duelsWon?: number | null;
  dribblesAttempted?: number | null;
  dribblesSuccessful?: number | null;
  foulsDrawn?: number | null;
  foulsCommitted?: number | null;
  goalsScored?: number | null;
  goalsConceded?: number | null;
  assistsTotal?: number | null;
  savesTotal?: number | null;
}

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

const BREAKDOWN_LABELS: Record<string, string> = {
  appearance: 'Appearance',
  goals: 'Goals',
  assists: 'Assists',
  cleanSheet: 'Clean Sheet',
  saves: 'Saves Bonus',
  penaltySave: 'Penalty Save',
  yellowCard: 'Yellow Card',
  redCard: 'Red Card',
  ownGoal: 'Own Goal',
  penaltyMiss: 'Penalty Miss',
  resultBonus: 'Result Bonus',
};

function StatRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[10px] text-white/40">{label}</span>
      <span className="text-[10px] font-semibold text-white/60">{value}</span>
    </div>
  );
}

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
        const detailedStats: DetailedStats | null = breakdown?.detailedStats ?? null;
        const hasDetails = breakdown || detailedStats;

        return (
          <div key={pick.slotIndex}>
            <button
              onClick={() => hasDetails && setExpandedSlot(isExpanded ? null : pick.slotIndex)}
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
              {hasDetails && (
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-white/20 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>

            {/* Expanded detail */}
            {isExpanded && hasDetails && (
              <div className="mx-3 mt-1 mb-1 bg-navy/60 rounded-lg px-3 py-2 animate-slide-up">
                {/* Points breakdown */}
                {breakdown && (
                  <div className="mb-2">
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Points</div>
                    {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => {
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

                {/* Detailed match stats */}
                {detailedStats && (
                  <div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1 mt-1 border-t border-white/5 pt-2">
                      Match Stats
                    </div>
                    <StatRow label="Minutes" value={detailedStats.minutesPlayed} />
                    <StatRow label="Rating" value={detailedStats.rating} />
                    <StatRow label="Shots" value={detailedStats.shotsTotal} />
                    <StatRow label="Shots on Target" value={detailedStats.shotsOnTarget} />
                    <StatRow label="Passes" value={detailedStats.passesTotal} />
                    <StatRow label="Key Passes" value={detailedStats.passesKey} />
                    <StatRow label="Pass Accuracy" value={detailedStats.passAccuracy ? `${detailedStats.passAccuracy}%` : null} />
                    <StatRow label="Tackles" value={detailedStats.tacklesTotal} />
                    <StatRow label="Interceptions" value={detailedStats.interceptions} />
                    <StatRow label="Blocks" value={detailedStats.blocks} />
                    <StatRow label="Duels Won" value={
                      detailedStats.duelsWon !== null && detailedStats.duelsTotal !== null
                        ? `${detailedStats.duelsWon}/${detailedStats.duelsTotal}`
                        : null
                    } />
                    <StatRow label="Dribbles" value={
                      detailedStats.dribblesSuccessful !== null && detailedStats.dribblesAttempted !== null
                        ? `${detailedStats.dribblesSuccessful}/${detailedStats.dribblesAttempted}`
                        : null
                    } />
                    <StatRow label="Fouls Drawn" value={detailedStats.foulsDrawn} />
                    <StatRow label="Fouls Committed" value={detailedStats.foulsCommitted} />
                    <StatRow label="Saves" value={detailedStats.savesTotal} />
                    <StatRow label="Goals Conceded" value={detailedStats.goalsConceded} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
