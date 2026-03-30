'use client';

import { useState } from 'react';
import type { PlayerData } from '@/types';
import TeamSheet from './TeamSheet';

interface Props {
  players: PlayerData[];
  currentSessionToken?: string;
  homeTeamId: number;
  awayTeamId: number;
}

export default function Leaderboard({ players, currentSessionToken, homeTeamId, awayTeamId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...players].sort((a, b) => b.totalPoints - a.totalPoints);

  if (sorted.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-white/40 text-sm">No players yet. Share the link to invite friends!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Leaderboard</h3>
      {sorted.map((player, index) => {
        const isExpanded = expandedId === player.id;
        const hasPicks = player.picks.length > 0;
        const rank = index + 1;

        return (
          <div key={player.id} className="animate-fade-in">
            <button
              onClick={() => hasPicks && setExpandedId(isExpanded ? null : player.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isExpanded ? 'bg-charcoal ring-1 ring-accent/20' : 'bg-charcoal/60 hover:bg-charcoal'
              }`}
            >
              {/* Rank */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                rank === 1 ? 'bg-points-gold/20 text-points-gold' :
                rank === 2 ? 'bg-white/10 text-white/60' :
                rank === 3 ? 'bg-orange-500/10 text-orange-400' :
                'bg-white/5 text-white/30'
              }`}>
                {rank}
              </div>

              {/* Name */}
              <div className="flex-1 text-left min-w-0">
                <span className="text-sm font-bold text-white truncate block">
                  {player.displayName}
                  {player.isCreator && (
                    <span className="ml-1.5 text-[10px] font-medium text-accent/60 uppercase">Host</span>
                  )}
                </span>
                {!hasPicks && (
                  <span className="text-[10px] text-white/30">Picking team...</span>
                )}
              </div>

              {/* Points */}
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${
                  player.totalPoints > 0 ? 'text-accent' : player.totalPoints < 0 ? 'text-live-red' : 'text-white/40'
                }`}>
                  {player.totalPoints}
                </span>
                <span className="text-[10px] text-white/30 font-medium">pts</span>
              </div>

              {/* Expand arrow */}
              {hasPicks && (
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-white/30 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>

            {/* Expanded team sheet */}
            {isExpanded && hasPicks && (
              <div className="mt-1 animate-slide-up">
                <TeamSheet picks={player.picks} homeTeamId={homeTeamId} awayTeamId={awayTeamId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
