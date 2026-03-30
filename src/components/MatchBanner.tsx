'use client';

import Image from 'next/image';
import { getTeamColours } from '@/lib/team-colours';
import { isMatchLive, isMatchFinished, isMatchNotStarted } from '@/types';
import { timeUntilKickoff } from '@/lib/utils';

interface Props {
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  matchDate: string;
}

export default function MatchBanner({
  homeTeamId, awayTeamId, homeTeamName, awayTeamName,
  homeTeamLogo, awayTeamLogo,
  homeScore, awayScore, status, minute, matchDate,
}: Props) {
  const homeColours = getTeamColours(homeTeamId);
  const awayColours = getTeamColours(awayTeamId);
  const live = isMatchLive(status);
  const finished = isMatchFinished(status);
  const notStarted = isMatchNotStarted(status);

  return (
    <div
      className="relative overflow-hidden rounded-2xl mx-4 mt-3"
      style={{
        background: `linear-gradient(135deg, ${homeColours.primary}30 0%, #1e293b 45%, #1e293b 55%, ${awayColours.primary}30 100%)`,
      }}
    >
      {/* Live indicator */}
      {live && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-live-red/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-live-red live-dot" />
          <span className="text-xs font-bold text-live-red uppercase">{minute}&apos;</span>
        </div>
      )}

      {finished && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold text-white/50 uppercase bg-white/5 px-3 py-1 rounded-full">
            Full Time
          </span>
        </div>
      )}

      {status === 'HT' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold text-points-gold uppercase bg-points-gold/10 px-3 py-1 rounded-full">
            Half Time
          </span>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-6 pt-10">
        {/* Home */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {homeTeamLogo && (
            <div className="w-14 h-14 relative">
              <Image src={homeTeamLogo} alt={homeTeamName} fill className="object-contain" sizes="56px" />
            </div>
          )}
          <span className="text-xs font-bold text-white/80 text-center leading-tight max-w-[80px]">
            {homeTeamName}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          {notStarted ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white/30">VS</span>
              <span className="text-xs text-white/40 mt-1">{timeUntilKickoff(matchDate)}</span>
            </div>
          ) : (
            <>
              <span className={`text-4xl font-black ${live ? 'text-white animate-score-pop' : 'text-white'}`}>
                {homeScore ?? 0}
              </span>
              <span className="text-lg font-bold text-white/20">-</span>
              <span className={`text-4xl font-black ${live ? 'text-white animate-score-pop' : 'text-white'}`}>
                {awayScore ?? 0}
              </span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {awayTeamLogo && (
            <div className="w-14 h-14 relative">
              <Image src={awayTeamLogo} alt={awayTeamName} fill className="object-contain" sizes="56px" />
            </div>
          )}
          <span className="text-xs font-bold text-white/80 text-center leading-tight max-w-[80px]">
            {awayTeamName}
          </span>
        </div>
      </div>
    </div>
  );
}
