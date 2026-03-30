'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NormalizedPlayer, PickData } from '@/types';
import { getTeamColours } from '@/lib/team-colours';

interface SlotConfig {
  index: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  label: string;
  row: number;
  col: number;
}

const SLOTS: SlotConfig[] = [
  { index: 0, position: 'FWD', label: 'ST', row: 0, col: 1 },
  { index: 1, position: 'MID', label: 'MID', row: 1, col: 0 },
  { index: 2, position: 'MID', label: 'MID', row: 1, col: 2 },
  { index: 3, position: 'DEF', label: 'DEF', row: 2, col: 1 },
  { index: 4, position: 'GK', label: 'GK', row: 3, col: 1 },
];

interface Props {
  players: NormalizedPlayer[];
  homeTeamId: number;
  awayTeamId: number;
  existingPicks?: PickData[];
  onSubmit: (picks: PickData[]) => void;
  submitting: boolean;
}

export default function PitchPicker({ players, homeTeamId, awayTeamId, existingPicks, onSubmit, submitting }: Props) {
  const [picks, setPicks] = useState<(PickData | null)[]>([null, null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (existingPicks && existingPicks.length > 0) {
      const filled: (PickData | null)[] = [null, null, null, null, null];
      existingPicks.forEach(p => { filled[p.slotIndex] = p; });
      setPicks(filled);
    }
  }, [existingPicks]);

  const getTeamCount = useCallback((teamId: number) => {
    return picks.filter(p => p && p.teamId === teamId).length;
  }, [picks]);

  const canPickFromTeam = useCallback((teamId: number, slotIndex: number) => {
    const currentPick = picks[slotIndex];
    const otherPicks = picks.filter((p, i) => i !== slotIndex && p !== null);
    const teamCount = otherPicks.filter(p => p!.teamId === teamId).length;
    return teamCount < 3;
  }, [picks]);

  const filteredPlayers = activeSlot !== null
    ? players
        .filter(p => p.position === SLOTS[activeSlot].position)
        .filter(p => canPickFromTeam(p.teamId, activeSlot))
        .filter(p => {
          if (!searchQuery) return true;
          return p.name.toLowerCase().includes(searchQuery.toLowerCase());
        })
    : [];

  const handleSelectPlayer = (player: NormalizedPlayer) => {
    if (activeSlot === null) return;
    const slot = SLOTS[activeSlot];
    const pick: PickData = {
      footballPlayerId: player.id,
      footballPlayerName: player.name,
      teamId: player.teamId,
      position: slot.position,
      slotIndex: slot.index,
    };
    const newPicks = [...picks];
    newPicks[activeSlot] = pick;
    setPicks(newPicks);
    setActiveSlot(null);
    setSearchQuery('');
  };

  const allFilled = picks.every(p => p !== null);
  const homeCount = getTeamCount(homeTeamId);
  const awayCount = getTeamCount(awayTeamId);

  const handleSubmit = () => {
    if (!allFilled) return;
    onSubmit(picks.filter(Boolean) as PickData[]);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Team balance indicator */}
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getTeamColours(homeTeamId).primary }} />
          <span className="text-xs font-bold text-white/60">{homeCount}</span>
        </div>
        <span className="text-[10px] text-white/30 font-medium">TEAM BALANCE</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white/60">{awayCount}</span>
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getTeamColours(awayTeamId).primary }} />
        </div>
      </div>

      {/* Pitch */}
      <div className="pitch-bg rounded-2xl mx-4 p-4 flex-1 min-h-[340px] relative">
        {/* Pitch markings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full border border-white/10" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-b border-l border-r border-white/10 rounded-b-lg" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-t border-l border-r border-white/10 rounded-t-lg" />

        {/* Position slots */}
        <div className="relative z-10 h-full flex flex-col justify-between py-2">
          {[0, 1, 2, 3].map(row => (
            <div key={row} className="flex justify-center gap-8">
              {SLOTS.filter(s => s.row === row).map(slot => {
                const pick = picks[slot.index];
                const teamColours = pick ? getTeamColours(pick.teamId) : null;

                return (
                  <button
                    key={slot.index}
                    onClick={() => { setActiveSlot(slot.index); setSearchQuery(''); }}
                    className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
                      activeSlot === slot.index ? 'scale-110' : ''
                    }`}
                  >
                    {/* Circle */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        pick
                          ? 'bg-navy/80 shadow-lg'
                          : 'border-2 border-dashed border-white/30 bg-white/5'
                      }`}
                      style={pick ? { boxShadow: `0 0 0 2px ${teamColours?.primary}` } : {}}
                    >
                      {pick ? (
                        <span className="text-[10px] font-bold text-white text-center leading-tight px-1 line-clamp-2">
                          {pick.footballPlayerName.split(' ').pop()}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-white/40">{slot.label}</span>
                      )}
                    </div>
                    {pick && (
                      <span className="text-[9px] font-semibold text-white/50 max-w-[60px] truncate text-center">
                        {pick.footballPlayerName.split(' ').slice(0, -1).join(' ').charAt(0)}.{' '}
                        {pick.footballPlayerName.split(' ').pop()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom sheet - player selector */}
      {activeSlot !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sheet"
            onClick={() => { setActiveSlot(null); setSearchQuery(''); }}
          />

          {/* Sheet */}
          <div className="relative bg-navy border-t border-white/10 rounded-t-3xl max-h-[65vh] flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-4 pb-2">
              <h3 className="text-sm font-bold text-white/60 mb-2">
                Select {SLOTS[activeSlot].label}
              </h3>
              {/* Search */}
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Player list */}
            <div className="overflow-y-auto flex-1 px-4 pb-6">
              {filteredPlayers.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-6">No players available</p>
              ) : (
                <div className="space-y-1 mt-2">
                  {filteredPlayers.map(player => {
                    const teamColours = getTeamColours(player.teamId);
                    const isSelected = picks.some(p => p?.footballPlayerId === player.id && p?.slotIndex === activeSlot);

                    return (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(player)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${
                          isSelected
                            ? 'bg-accent/10 ring-1 ring-accent/30'
                            : 'bg-charcoal/40 hover:bg-charcoal/60'
                        }`}
                      >
                        {/* Team colour dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: teamColours.primary }}
                        />

                        {/* Player info */}
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-semibold text-white block truncate">
                            {player.name}
                          </span>
                          <span className="text-[10px] text-white/40">{player.teamName}</span>
                        </div>

                        {/* Number */}
                        {player.number && (
                          <span className="text-xs font-bold text-white/20">#{player.number}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="sticky bottom-0 px-4 py-4 bg-gradient-to-t from-navy via-navy to-transparent">
        <button
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
            allFilled
              ? 'bg-accent text-navy active:scale-[0.98] hover:bg-accent-bright'
              : 'bg-charcoal text-white/30 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Locking in...' : allFilled ? 'Lock In Team' : `Pick ${5 - picks.filter(Boolean).length} more`}
        </button>
      </div>
    </div>
  );
}
