'use client';

import Image from 'next/image';
import { getTeamColours } from '@/lib/team-colours';
import { isMatchLive, isMatchFinished, isMatchNotStarted } from '@/types';
import type { ApiFixtureEvent } from '@/types';
import { formatKickoffTime, formatMatchDate } from '@/lib/utils';

interface Props {
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  venue?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  matchDate: string;
  events?: ApiFixtureEvent[];
}

export default function MatchBanner({
  homeTeamId, awayTeamId, homeTeamName, awayTeamName,
  homeTeamLogo, awayTeamLogo, venue,
  homeScore, awayScore, status, minute, matchDate, events = [],
}: Props) {
  const homeColours = getTeamColours(homeTeamId, homeTeamName);
  const awayColours = getTeamColours(awayTeamId, awayTeamName);

  // Extract goal scorers per team from events
  const homeGoals = events.filter(
    e => e.type === 'Goal' && e.team.id === homeTeamId && e.detail !== 'Missed Penalty'
  );
  const awayGoals = events.filter(
    e => e.type === 'Goal' && e.team.id === awayTeamId && e.detail !== 'Missed Penalty'
  );

  // Format kickoff for pre-match display
  const kickoffDate = new Date(matchDate);
  const isToday = kickoffDate.toDateString() === new Date().toDateString();
  const kickoffDisplay = isToday
    ? formatKickoffTime(matchDate)
    : `${formatMatchDate(matchDate)}, ${formatKickoffTime(matchDate)}`;
  const live = isMatchLive(status);
  const finished = isMatchFinished(status);
  const notStarted = isMatchNotStarted(status);

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-3">
      {/* Half-and-half background */}
      <div className="absolute inset-0">
        {/* Home colour wash - left side */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(125deg, ${homeColours.primary}50 0%, ${homeColours.primary}20 35%, transparent 50%)`,
          }}
        />
        {/* Away colour wash - right side */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(305deg, ${awayColours.primary}50 0%, ${awayColours.primary}20 35%, transparent 50%)`,
          }}
        />
        {/* Dark center seam */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.7) 50%, rgba(15,23,42,0.3) 100%)',
          }}
        />
        {/* Top/bottom colour bars */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, ${homeColours.primary} 0%, ${homeColours.primary}60 40%, ${awayColours.primary}60 60%, ${awayColours.primary} 100%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, ${homeColours.primary}40 0%, transparent 40%, transparent 60%, ${awayColours.primary}40 100%)`,
          }}
        />
        {/* Base */}
        <div className="absolute inset-0 bg-navy/40" />
      </div>

      {/* Live indicator */}
      {live && (
        <div className="relative z-10 flex justify-center pt-3">
          <div className="flex items-center gap-1.5 bg-live-red/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-live-red live-dot" />
            <span className="text-xs font-bold text-live-red uppercase">{minute}&apos;</span>
          </div>
        </div>
      )}

      {finished && (
        <div className="relative z-10 flex justify-center pt-3">
          <span className="text-xs font-bold text-white/50 uppercase bg-white/5 backdrop-blur-sm px-3 py-1 rounded-full">
            Full Time
          </span>
        </div>
      )}

      {status === 'HT' && (
        <div className="relative z-10 flex justify-center pt-3">
          <span className="text-xs font-bold text-points-gold uppercase bg-points-gold/10 backdrop-blur-sm px-3 py-1 rounded-full">
            Half Time
          </span>
        </div>
      )}

      <div className={`relative z-10 flex items-center justify-between px-5 py-6 ${(live || finished || status === 'HT') ? 'pt-3' : 'pt-6'}`}>
        {/* Home */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {homeTeamLogo && (
            <div className="w-14 h-14 relative drop-shadow-lg">
              <Image src={homeTeamLogo} alt={homeTeamName} fill className="object-contain" sizes="56px" />
            </div>
          )}
          <span className="text-xs font-bold text-white/90 text-center leading-tight max-w-[80px]">
            {homeTeamName}
          </span>
          {homeGoals.length > 0 && (
            <div className="flex flex-col items-center gap-0.5 max-w-[90px]">
              {homeGoals.map((g, i) => (
                <span key={i} className="text-[9px] text-white/50 leading-tight text-center">
                  {g.player.name.split(' ').pop()} {g.time.elapsed}&apos;{g.detail === 'Penalty' ? ' (P)' : g.detail === 'Own Goal' ? ' (OG)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          {notStarted ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white/30">VS</span>
              <span className="text-xs text-white/40 mt-1">{kickoffDisplay}</span>
            </div>
          ) : (
            <>
              <span
                className={`text-4xl font-black text-white ${live ? 'animate-score-pop' : ''}`}
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                {homeScore ?? 0}
              </span>
              <span className="text-lg font-bold text-white/20">-</span>
              <span
                className={`text-4xl font-black text-white ${live ? 'animate-score-pop' : ''}`}
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                {awayScore ?? 0}
              </span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {awayTeamLogo && (
            <div className="w-14 h-14 relative drop-shadow-lg">
              <Image src={awayTeamLogo} alt={awayTeamName} fill className="object-contain" sizes="56px" />
            </div>
          )}
          <span className="text-xs font-bold text-white/90 text-center leading-tight max-w-[80px]">
            {awayTeamName}
          </span>
          {awayGoals.length > 0 && (
            <div className="flex flex-col items-center gap-0.5 max-w-[90px]">
              {awayGoals.map((g, i) => (
                <span key={i} className="text-[9px] text-white/50 leading-tight text-center">
                  {g.player.name.split(' ').pop()} {g.time.elapsed}&apos;{g.detail === 'Penalty' ? ' (P)' : g.detail === 'Own Goal' ? ' (OG)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Venue */}
      {venue && (
        <div className="relative z-10 text-center pb-3 -mt-1">
          <span className="text-[10px] text-white/40">{venue}</span>
        </div>
      )}
    </div>
  );
}
