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
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Awards</h3>
      <div className="space-y-1">
        {awards.map(a => (
          <div key={a.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-charcoal/30">
            <span className="text-sm text-white/25 w-5 text-center flex-shrink-0">{a.emoji}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{a.label}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-white truncate">{a.memberName ?? '—'}</span>
                <span className="text-[10px] text-white/30 truncate">{a.detail}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
