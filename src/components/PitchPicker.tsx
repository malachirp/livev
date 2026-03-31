'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NormalizedPlayer, PickData } from '@/types';
import { getTeamColours } from '@/lib/team-colours';
import ShirtIcon from './ShirtIcon';

interface SlotConfig {
  index: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  label: string;
}

const SLOTS: SlotConfig[] = [
  { index: 0, position: 'FWD', label: 'ST' },
  { index: 1, position: 'MID', label: 'MID' },
  { index: 2, position: 'MID', label: 'MID' },
  { index: 3, position: 'DEF', label: 'DEF' },
  { index: 4, position: 'GK', label: 'GK' },
];

interface Props {
  players: NormalizedPlayer[];
  homeTeamId: number;
  awayTeamId: number;
  existingPicks?: PickData[];
  onSubmit: (picks: PickData[], captainSlot: number) => void;
  submitting: boolean;
  roomCode: string;
  existingCaptainSlot?: number;
}

export default function PitchPicker({ players, homeTeamId, awayTeamId, existingPicks, onSubmit, submitting, roomCode, existingCaptainSlot }: Props) {
  const [picks, setPicks] = useState<(PickData | null)[]>([null, null, null, null, null]);
  const [captainSlot, setCaptainSlot] = useState<number>(0);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (existingPicks && existingPicks.length > 0) {
      const filled: (PickData | null)[] = [null, null, null, null, null];
      existingPicks.forEach(p => { filled[p.slotIndex] = p; });
      setPicks(filled);
    }
    if (existingCaptainSlot !== undefined) {
      setCaptainSlot(existingCaptainSlot);
    }
  }, [existingPicks, existingCaptainSlot]);

  const getTeamCount = useCallback((teamId: number) => {
    return picks.filter(p => p && p.teamId === teamId).length;
  }, [picks]);

  const canPickFromTeam = useCallback((teamId: number, slotIndex: number) => {
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
        .sort((a, b) => a.name.localeCompare(b.name))
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

  const handleToggleCaptain = (slotIndex: number) => {
    if (picks[slotIndex]) {
      setCaptainSlot(slotIndex);
    }
  };

  const allFilled = picks.every(p => p !== null);
  const homeCount = getTeamCount(homeTeamId);
  const awayCount = getTeamCount(awayTeamId);

  const handleSubmit = () => {
    if (!allFilled) return;
    onSubmit(picks.filter(Boolean) as PickData[], captainSlot);
  };

  const getPlayerNumber = (footballPlayerId: number): number | null => {
    const p = players.find(pl => pl.id === footballPlayerId);
    return p?.number ?? null;
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Team balance - centered */}
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

      {/* Captain hint */}
      <p className="text-[10px] text-white/30 text-center px-4 pb-2">
        Tap a player to make them captain (C) for 1.5x points
      </p>

      {/* Pitch - tighter aspect ratio to fit on screen */}
      <div className="pitch-bg rounded-2xl mx-3 relative" style={{ paddingBottom: '105%' }}>
        {/* Pitch markings */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-14 border-b border-l border-r border-white/10 rounded-b-lg" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-14 border-t border-l border-r border-white/10 rounded-t-lg" />
        </div>

        {/* FWD - top */}
        <div className="absolute top-[6%] left-0 right-0 flex justify-center">
          {renderSlot(0)}
        </div>

        {/* MID - spread */}
        <div className="absolute top-[30%] left-0 right-0 flex justify-between px-[15%]">
          {renderSlot(1)}
          {renderSlot(2)}
        </div>

        {/* DEF */}
        <div className="absolute top-[55%] left-0 right-0 flex justify-center">
          {renderSlot(3)}
        </div>

        {/* GK */}
        <div className="absolute top-[78%] left-0 right-0 flex justify-center">
          {renderSlot(4)}
        </div>
      </div>

      {/* Bottom sheet - player selector */}
      {activeSlot !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sheet"
            onClick={() => { setActiveSlot(null); setSearchQuery(''); }}
          />

          <div className="relative bg-navy border-t border-white/10 rounded-t-3xl max-h-[65vh] flex flex-col animate-slide-up">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-4 pb-2">
              <h3 className="text-sm font-bold text-white/60 mb-2">
                Select {SLOTS[activeSlot].label}
              </h3>
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-6">
              {filteredPlayers.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-6">No players available</p>
              ) : (
                <div className="space-y-1 mt-2">
                  {filteredPlayers.map(player => {
                    const teamColours = getTeamColours(player.teamId);
                    const isAlreadyPicked = picks.some(p => p?.footballPlayerId === player.id);

                    return (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(player)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${
                          isAlreadyPicked
                            ? 'bg-accent/10 ring-1 ring-accent/30'
                            : 'bg-charcoal/40 hover:bg-charcoal/60'
                        }`}
                      >
                        <ShirtIcon
                          primaryColor={teamColours.primary}
                          secondaryColor={teamColours.secondary}
                          number={player.number}
                          size={32}
                        />
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-semibold text-white block truncate">
                            {player.name}
                          </span>
                          <span className="text-[10px] text-white/40">{player.teamName}</span>
                        </div>
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
      <div className="sticky bottom-0 px-4 py-3 bg-gradient-to-t from-navy via-navy to-transparent">
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

  function renderSlot(slotIndex: number) {
    const slot = SLOTS[slotIndex];
    const pick = picks[slotIndex];
    const isCaptain = captainSlot === slotIndex && pick !== null;
    const teamColours = pick ? getTeamColours(pick.teamId) : null;
    const playerNumber = pick ? getPlayerNumber(pick.footballPlayerId) : null;

    return (
      <button
        key={slot.index}
        onClick={() => {
          if (pick) {
            handleToggleCaptain(slotIndex);
          } else {
            setActiveSlot(slotIndex);
            setSearchQuery('');
          }
        }}
        onDoubleClick={() => {
          setActiveSlot(slotIndex);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center transition-all active:scale-95 ${
          activeSlot === slotIndex ? 'scale-110' : ''
        }`}
      >
        {pick ? (
          <div className="relative">
            <ShirtIcon
              primaryColor={teamColours!.primary}
              secondaryColor={teamColours!.secondary}
              number={playerNumber}
              size={64}
            />
            {isCaptain && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-points-gold flex items-center justify-center shadow-lg">
                <span className="text-[11px] font-black text-navy">C</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/30 bg-white/5 flex items-center justify-center">
            <span className="text-sm font-bold text-white/40">{slot.label}</span>
          </div>
        )}

        <span className={`text-[11px] font-semibold mt-1 max-w-[80px] truncate text-center ${
          isCaptain ? 'text-points-gold' : 'text-white/70'
        }`}>
          {pick ? pick.footballPlayerName.split(' ').pop() : slot.label}
        </span>
      </button>
    );
  }
}
