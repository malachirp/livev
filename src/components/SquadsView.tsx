'use client';

import { useState, useEffect, useRef } from 'react';
import { getTeamColours } from '@/lib/team-colours';
import PointsBreakdown from './PointsBreakdown';

interface SquadPlayer {
  id: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  lineupStatus: 'starter' | 'bench';
  points: number;
  breakdown: Record<string, any> | null;
  minutesPlayed: number | null;
}

interface TeamSquad {
  teamId: number;
  teamName: string;
  teamLogo: string;
  players: SquadPlayer[];
}

interface SquadsData {
  available: boolean;
  home: TeamSquad | null;
  away: TeamSquad | null;
}

interface Props {
  code: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}

const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

export default function SquadsView({ code, homeTeamId, awayTeamId, homeTeamName, awayTeamName }: Props) {
  const [data, setData] = useState<SquadsData | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function fetchSquads() {
      fetch(`/api/rooms/${code}/squads`)
        .then(res => res.json())
        .then(d => setData(d))
        .catch(() => {});
    }

    fetchSquads();
    pollRef.current = setInterval(fetchSquads, 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [code]);

  if (!data) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="w-8 h-8 mx-auto border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data.available) {
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
        <p className="text-white/60 text-sm font-bold">Squads not yet announced</p>
        <p className="text-white/25 text-xs mt-1">Lineups appear ~1 hour before kick-off</p>
      </div>
    );
  }

  function renderTeamColumn(team: TeamSquad | null, teamId: number, teamName: string) {
    if (!team) return <div className="flex-1" />;

    const colours = getTeamColours(teamId, teamName);
    const starters = team.players.filter(p => p.lineupStatus === 'starter');
    const bench = team.players.filter(p => p.lineupStatus === 'bench');

    return (
      <div className="flex-1 min-w-0">
        {/* Team header */}
        <div className="flex items-center gap-2 px-2 pb-2 mb-1">
          {team.teamLogo && (
            <img src={team.teamLogo} alt="" className="w-5 h-5 object-contain" />
          )}
          <span className="text-[11px] font-bold text-white/70 truncate">{team.teamName}</span>
        </div>

        {/* Starters */}
        {starters.map(p => (
          <PlayerRow key={p.id} player={p} colours={colours} expanded={expandedId === p.id} onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)} />
        ))}

        {bench.length > 0 && (
          <>
            <div className="px-2 py-1.5 mt-1">
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider">Bench</span>
            </div>
            {bench.map(p => (
              <PlayerRow key={p.id} player={p} colours={colours} expanded={expandedId === p.id} onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)} />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex gap-2">
        {renderTeamColumn(data.home, homeTeamId, homeTeamName)}
        {renderTeamColumn(data.away, awayTeamId, awayTeamName)}
      </div>
    </div>
  );
}

function PlayerRow({ player, colours, expanded, onToggle }: {
  player: SquadPlayer;
  colours: { primary: string; secondary: string };
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={() => player.breakdown && onToggle()}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <span
          className="text-[8px] font-black uppercase w-6 text-center py-0.5 rounded flex-shrink-0"
          style={{ backgroundColor: `${colours.primary}30`, color: colours.primary }}
        >
          {player.position}
        </span>
        <span className="text-[11px] font-semibold text-white/70 flex-1 truncate text-left">
          {player.name.split(' ').pop()}
        </span>
        <span className={`text-[11px] font-black flex-shrink-0 ${
          player.points > 0 ? 'text-accent' : player.points < 0 ? 'text-live-red' : 'text-white/20'
        }`}>
          {player.points > 0 ? '+' : ''}{player.points}
        </span>
        {player.breakdown && (
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-white/15 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>
      {expanded && player.breakdown && (
        <div className="ml-1 mr-0">
          <PointsBreakdown breakdown={player.breakdown} />
        </div>
      )}
    </div>
  );
}
