'use client';

import { useState } from 'react';
import type { PickSlot } from '@/types';
import TeamSheet from './TeamSheet';

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
  totalTeams: number;
  topTeams: TeamEntry[];
  currentUserTeam: TeamEntry | null;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  teamsLocked: boolean;
  matchStarted: boolean;
}

function TeamCard({
  team,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  teamsLocked,
  expanded,
  onToggle,
}: {
  team: TeamEntry;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  teamsLocked: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const picksVisible = teamsLocked && team.picks.length > 0;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => picksVisible && onToggle()}
        className={`w-full px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
          team.isYourTeam ? 'ring-1 ring-accent/30' : ''
        } ${expanded ? 'ring-1 ring-accent/20' : 'hover:brightness-110'}`}
        style={{
          background: team.isYourTeam
            ? 'rgba(0,245,160,0.06)'
            : 'rgba(30,41,59,0.6)',
        }}
      >
        {team.isYourTeam && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-accent" />
        )}

        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
            team.rank === 1 ? 'bg-points-gold/20 text-points-gold' :
            team.rank === 2 ? 'bg-white/10 text-white/60' :
            team.rank === 3 ? 'bg-orange-500/10 text-orange-400' :
            'bg-white/5 text-white/30'
          }`}>
            {team.rank}
          </div>

          {/* Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">
                {team.playerCount} {team.playerCount === 1 ? 'player' : 'players'}
              </span>
              {team.isYourTeam && (
                <span className="text-[10px] font-medium text-accent uppercase">Your team</span>
              )}
            </div>
            <span className="text-[10px] text-white/30 truncate block">
              {team.sampleNames.join(', ')}{team.playerCount > team.sampleNames.length ? ` +${team.playerCount - team.sampleNames.length} more` : ''}
            </span>
          </div>

          {/* Points */}
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black ${
              team.totalPoints > 0 ? 'text-accent' : team.totalPoints < 0 ? 'text-live-red' : 'text-white/40'
            }`}>
              {team.totalPoints}
            </span>
            <span className="text-[10px] text-white/30 font-medium">pts</span>
          </div>

          {picksVisible && (
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-white/30 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>
      </button>

      {expanded && picksVisible && (
        <div className="mt-1 animate-slide-up">
          <TeamSheet
            picks={team.picks}
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            captainSlot={team.captainSlot}
          />
        </div>
      )}
    </div>
  );
}

export default function GlobalLeaderboard({
  totalPlayers,
  totalTeams,
  topTeams,
  currentUserTeam,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  teamsLocked,
  matchStarted,
}: Props) {
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null);

  // Before gameplay: just show count
  if (!matchStarted) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-white/60 text-sm font-bold">
          <span className="text-accent">{totalPlayers}</span> {totalPlayers === 1 ? 'player' : 'players'} competing in this match
        </p>
        <p className="text-white/25 text-xs mt-1">Global rankings appear once the match begins</p>
      </div>
    );
  }

  if (topTeams.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-white/40 text-sm">No teams picked yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Top Teams</h3>
        <span className="text-[10px] font-bold text-white/25">
          {totalTeams} {totalTeams === 1 ? 'team' : 'distinct teams'} · {totalPlayers} players
        </span>
      </div>

      {topTeams.map((team, i) => (
        <TeamCard
          key={`top-${i}`}
          team={team}
          homeTeamId={homeTeamId}
          awayTeamId={awayTeamId}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          teamsLocked={teamsLocked}
          expanded={expandedIdx === `top-${i}`}
          onToggle={() => setExpandedIdx(expandedIdx === `top-${i}` ? null : `top-${i}`)}
        />
      ))}

      {/* Current user's team pinned at bottom if not in top 3 */}
      {currentUserTeam && (
        <>
          <div className="flex items-center gap-2 py-1 px-4">
            <div className="flex-1 border-t border-white/5" />
            <span className="text-[10px] text-white/20 font-medium">···</span>
            <div className="flex-1 border-t border-white/5" />
          </div>
          <TeamCard
            team={currentUserTeam}
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            teamsLocked={teamsLocked}
            expanded={expandedIdx === 'you'}
            onToggle={() => setExpandedIdx(expandedIdx === 'you' ? null : 'you')}
          />
        </>
      )}
    </div>
  );
}
