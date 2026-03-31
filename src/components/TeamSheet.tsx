'use client';

import type { PickSlot } from '@/types';
import { getTeamColours } from '@/lib/team-colours';

interface Props {
  picks: PickSlot[];
  homeTeamId: number;
  awayTeamId: number;
  captainSlot?: number;
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};

export default function TeamSheet({ picks, homeTeamId, awayTeamId, captainSlot }: Props) {
  const sorted = [...picks].sort((a, b) => a.slotIndex - b.slotIndex);

  return (
    <div className="bg-charcoal/40 rounded-xl p-3 space-y-1.5">
      {sorted.map(pick => {
        const teamColours = getTeamColours(pick.teamId);
        const points = pick.points;
        const isCaptain = captainSlot !== undefined && pick.slotIndex === captainSlot;

        return (
          <div
            key={pick.slotIndex}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-navy/40"
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
            <span className="text-xs font-semibold text-white/80 flex-1 truncate">
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
          </div>
        );
      })}
    </div>
  );
}
