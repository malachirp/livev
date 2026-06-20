'use client';

import { isMatchLive, isMatchFinished } from '@/types';

export interface LeagueGame {
  code: string;
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  matchDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  memberCount: number;
  leaderName: string | null;
}

function GameCard({ game }: { game: LeagueGame }) {
  const live = isMatchLive(game.status);
  const finished = isMatchFinished(game.status);
  const hasScore = game.homeScore !== null && game.awayScore !== null;

  return (
    <a
      href={`/room/${game.code}`}
      className="block bg-charcoal/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {game.homeTeamLogo && <img src={game.homeTeamLogo} alt="" className="w-5 h-5 object-contain" />}
        <span className="text-[12px] font-bold text-white/80 truncate">{game.homeTeamName}</span>
        {(live || finished) && hasScore ? (
          <span className="text-[12px] font-black text-accent">{game.homeScore}-{game.awayScore}</span>
        ) : (
          <span className="text-[11px] text-white/20">vs</span>
        )}
        <span className="text-[12px] font-bold text-white/80 truncate">{game.awayTeamName}</span>
        {game.awayTeamLogo && <img src={game.awayTeamLogo} alt="" className="w-5 h-5 object-contain" />}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {live ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-live-red live-dot" />
              <span className="text-[10px] font-bold text-live-red uppercase">Live</span>
            </span>
          ) : finished ? (
            <span className="text-[10px] font-bold text-white/30">FT</span>
          ) : (
            <span className="text-[10px] text-white/30">
              {new Date(game.matchDate).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="text-[10px] text-white/25">{game.memberCount} in</span>
          {game.leaderName && (live || finished) && (
            <span className="text-[10px] text-points-gold/70">👑 {game.leaderName}</span>
          )}
        </span>
        <span className="text-[10px] font-bold text-accent">Open →</span>
      </div>
    </a>
  );
}

export default function LeagueGamesList({ games }: { games: LeagueGame[] }) {
  const live = games.filter(g => isMatchLive(g.status));
  const upcoming = games.filter(g => !isMatchLive(g.status) && !isMatchFinished(g.status))
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  const finished = games.filter(g => isMatchFinished(g.status))
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

  if (games.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-white/40 text-sm">No games yet — host one from the ribbon above.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {live.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-live-red uppercase tracking-wider">Live now</h3>
          {live.map(g => <GameCard key={g.code} game={g} />)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Upcoming games</h3>
          {upcoming.map(g => <GameCard key={g.code} game={g} />)}
        </div>
      )}
      {finished.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Results</h3>
          {finished.map(g => <GameCard key={g.code} game={g} />)}
        </div>
      )}
    </div>
  );
}
