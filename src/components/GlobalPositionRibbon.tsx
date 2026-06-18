'use client';

import type { PickSlot } from '@/types';

interface TeamEntry {
  rank: number;
  totalPoints: number;
  playerCount: number;
  isYourTeam: boolean;
  sampleNames: string[];
  captainSlot: number;
  picks: PickSlot[];
}

interface Props {
  totalPlayers: number;
  topTeams: TeamEntry[];
  currentUserTeam: TeamEntry | null;
  matchStarted: boolean;
}

export default function GlobalPositionRibbon({
  totalPlayers,
  topTeams,
  currentUserTeam,
  matchStarted,
}: Props) {
  if (totalPlayers === 0) return null;

  const leader = topTeams[0] ?? null;
  const userTeam = topTeams.find(t => t.isYourTeam) || currentUserTeam;

  // Before kick-off: nobody has a meaningful rank yet — just show the field size.
  if (!matchStarted) {
    return (
      <div className="px-4 pt-3">
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-center gap-1.5" style={{ background: 'rgba(30,41,59,0.6)' }}>
          <span className="text-sm font-black text-accent">{totalPlayers}</span>
          <span className="text-xs text-white/40 font-medium">
            {totalPlayers === 1 ? 'player' : 'players'} competing globally
          </span>
        </div>
      </div>
    );
  }

  // Spectator (not in a game): compact overview.
  if (!userTeam) {
    return (
      <div className="px-4 pt-3">
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: 'rgba(30,41,59,0.6)' }}>
          <span className="text-xs text-white/40 font-medium">
            <span className="text-white font-black">{totalPlayers}</span> competing globally
          </span>
          {leader && (
            <span className="text-xs text-white/30">
              Leader <span className="text-points-gold font-bold">{leader.totalPoints} pts</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  const userPercentile = Math.max(1, Math.round(((totalPlayers - userTeam.rank) / totalPlayers) * 100));
  const userPosition = totalPlayers > 1 ? (totalPlayers - userTeam.rank) / (totalPlayers - 1) : 1;
  const barPct = Math.max(2, userPosition * 100);

  return (
    <div className="px-4 pt-3">
      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(30,41,59,0.6)' }}>
        {/* Rank + points on one compact line */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white">#{userTeam.rank}</span>
            <span className="text-[11px] text-white/30 font-medium">of {totalPlayers} globally</span>
            {userPercentile >= 50 && (
              <span className="ml-1 text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                Top {100 - userPercentile + 1}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="leading-tight">
              <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Leader</div>
              <div className={`text-sm font-black ${leader && leader.totalPoints > 0 ? 'text-points-gold' : 'text-white/40'}`}>
                {leader ? leader.totalPoints : 0}
              </div>
            </div>
            <div className="w-px h-7 bg-white/10" />
            <div className="leading-tight">
              <div className="text-[9px] font-bold text-accent/60 uppercase tracking-wider">You</div>
              <div className={`text-sm font-black ${userTeam.totalPoints > 0 ? 'text-accent' : userTeam.totalPoints < 0 ? 'text-live-red' : 'text-white/40'}`}>
                {userTeam.totalPoints}
              </div>
            </div>
          </div>
        </div>

        {/* Position bar */}
        <div className="relative h-1.5 rounded-full bg-white/5">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-accent/40 to-accent"
            style={{ width: `${barPct}%` }}
          />
          <div
            className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-navy"
            style={{ left: `${barPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
    </div>
  );
}
