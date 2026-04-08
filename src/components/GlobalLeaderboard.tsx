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
  const [showLeaderTeam, setShowLeaderTeam] = useState(false);

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

  const leader = topTeams[0];
  // The user's team: either they're in the top teams, or pinned separately
  const userTeam = topTeams.find(t => t.isYourTeam) || currentUserTeam;
  const userIsLeader = userTeam?.rank === 1;
  const leaderPicksVisible = teamsLocked && leader.picks.length > 0;

  // Percentile: what % of players you're ahead of
  const userPercentile = userTeam
    ? Math.max(1, Math.round(((totalPlayers - userTeam.rank) / totalPlayers) * 100))
    : null;

  // Position bar: 0 = last, 1 = first
  const userPosition = userTeam
    ? totalPlayers > 1 ? (totalPlayers - userTeam.rank) / (totalPlayers - 1) : 1
    : null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Your rank card */}
      {userTeam ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(30,41,59,0.6)' }}>
          <div className="px-5 pt-5 pb-4">
            {/* Rank headline */}
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-3xl font-black text-white">#{userTeam.rank}</span>
              <span className="text-sm text-white/30 font-medium">out of {totalPlayers}</span>
              {userPercentile !== null && userPercentile >= 50 && (
                <span className="ml-auto text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  Top {100 - userPercentile + 1}%
                </span>
              )}
            </div>

            {/* Position bar */}
            {userPosition !== null && (
              <div className="relative h-2 rounded-full bg-white/5 mb-4">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-accent/40 to-accent"
                  style={{ width: `${Math.max(2, userPosition * 100)}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-2 border-navy"
                  style={{ left: `${Math.max(2, userPosition * 100)}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
            )}

            {/* Points comparison */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Leader</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-lg font-black ${leader.totalPoints > 0 ? 'text-points-gold' : 'text-white/40'}`}>
                    {leader.totalPoints}
                  </span>
                  <span className="text-[10px] text-white/30">pts</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-accent/60 uppercase tracking-wider">Your points</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-lg font-black ${userTeam.totalPoints > 0 ? 'text-accent' : userTeam.totalPoints < 0 ? 'text-live-red' : 'text-white/40'}`}>
                    {userTeam.totalPoints}
                  </span>
                  <span className="text-[10px] text-white/30">pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Not in a game — show overview */
        <div className="rounded-2xl px-5 py-5 text-center" style={{ background: 'rgba(30,41,59,0.6)' }}>
          <span className="text-3xl font-black text-white">{totalPlayers}</span>
          <p className="text-sm text-white/40 mt-1">players competing</p>
          {leader && (
            <p className="text-xs text-white/25 mt-2">
              Leader: <span className="text-points-gold font-bold">{leader.totalPoints} pts</span>
            </p>
          )}
        </div>
      )}

      {/* Winning team — expandable */}
      {leaderPicksVisible && !userIsLeader && (
        <button
          onClick={() => setShowLeaderTeam(!showLeaderTeam)}
          className="w-full px-4 py-3 rounded-xl transition-all hover:brightness-110"
          style={{ background: 'rgba(30,41,59,0.4)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-points-gold text-sm">👑</span>
              <span className="text-xs font-bold text-white/50">Winning team</span>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-white/30 transition-transform ${showLeaderTeam ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>
      )}

      {showLeaderTeam && leaderPicksVisible && !userIsLeader && (
        <div className="animate-slide-up -mt-2">
          <TeamSheet
            picks={leader.picks}
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            captainSlot={leader.captainSlot}
          />
        </div>
      )}

      {/* If user IS the leader, show their own team */}
      {leaderPicksVisible && userIsLeader && (
        <>
          <button
            onClick={() => setShowLeaderTeam(!showLeaderTeam)}
            className="w-full px-4 py-3 rounded-xl transition-all hover:brightness-110"
            style={{ background: 'rgba(0,245,160,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-accent text-sm">👑</span>
                <span className="text-xs font-bold text-accent/60">Your team — the one to beat</span>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-accent/40 transition-transform ${showLeaderTeam ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </button>
          {showLeaderTeam && (
            <div className="animate-slide-up -mt-2">
              <TeamSheet
                picks={leader.picks}
                homeTeamId={homeTeamId}
                awayTeamId={awayTeamId}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
                captainSlot={leader.captainSlot}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
