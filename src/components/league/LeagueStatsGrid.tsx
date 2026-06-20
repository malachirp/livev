'use client';

export interface LeagueAward {
  key: string;
  emoji: string;
  label: string;
  memberName: string | null;
  detail: string;
}

export default function LeagueStatsGrid({ awards }: { awards: LeagueAward[] }) {
  if (awards.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Awards & Oddities</h3>
      <div className="grid grid-cols-2 gap-2">
        {awards.map(a => (
          <div key={a.key} className="bg-charcoal/40 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base leading-none">{a.emoji}</span>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider truncate">{a.label}</span>
            </div>
            <p className="text-sm font-black text-white truncate">{a.memberName ?? '—'}</p>
            <p className="text-[10px] text-white/40 truncate">{a.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
