'use client';

export interface LeagueStanding {
  rank: number;
  memberId: string;
  displayName: string;
  isAdmin: boolean;
  totalPoints: number;
  gamesPlayed: number;
  isYou: boolean;
  gold: number;
  silver: number;
  bronze: number;
  form: { finishRank: number; points: number }[];
}

function FinishDot({ rank }: { rank: number }) {
  if (rank === 1) return <span title="1st">🥇</span>;
  if (rank === 2) return <span title="2nd">🥈</span>;
  if (rank === 3) return <span title="3rd">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/5 text-[9px] font-bold text-white/40">
      {rank}
    </span>
  );
}

export default function LeagueLeaderboard({ standings }: { standings: LeagueStanding[] }) {
  if (standings.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-white/40 text-sm">No members yet. Share the league to get the gang in!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">League Table</h3>
      {standings.map(s => (
        <div
          key={s.memberId}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl relative overflow-hidden ${
            s.isYou ? 'ring-1 ring-accent/30 bg-accent/5' : 'bg-charcoal/40'
          }`}
        >
          {/* Rank */}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
            s.rank === 1 ? 'bg-points-gold/20 text-points-gold' :
            s.rank === 2 ? 'bg-white/10 text-white/60' :
            s.rank === 3 ? 'bg-orange-500/10 text-orange-400' :
            'bg-white/5 text-white/30'
          }`}>
            {s.rank}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">{s.displayName}</span>
              {s.isYou && <span className="text-[10px] font-bold text-accent">YOU</span>}
              {s.isAdmin && <span className="text-[10px] font-medium text-white/30 uppercase">Host</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/30">{s.gamesPlayed} {s.gamesPlayed === 1 ? 'game' : 'games'}</span>
              {(s.gold + s.silver + s.bronze) > 0 && (
                <span className="text-[10px] text-white/40">
                  {s.gold > 0 && `🥇${s.gold} `}{s.silver > 0 && `🥈${s.silver} `}{s.bronze > 0 && `🥉${s.bronze}`}
                </span>
              )}
              {s.form.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  {s.form.map((f, i) => <FinishDot key={i} rank={f.finishRank} />)}
                </span>
              )}
            </div>
          </div>

          {/* Points */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-lg font-black ${
              s.totalPoints > 0 ? 'text-accent' : s.totalPoints < 0 ? 'text-live-red' : 'text-white/40'
            }`}>
              {s.totalPoints}
            </span>
            <span className="text-[10px] text-white/30 font-medium">pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
