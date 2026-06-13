'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatKickoffTime, formatMatchDate } from '@/lib/utils';
import { track } from '@/lib/track';
import type { ApiFixture } from '@/types';

interface Props {
  currentLeagueId?: number;
}

export default function NextMatchCTA({ currentLeagueId }: Props) {
  const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/fixtures')
      .then(res => res.json())
      .then(data => {
        if (!data.fixtures?.length) {
          setLoaded(true);
          return;
        }

        const upcoming = (data.fixtures as ApiFixture[])
          .filter(f => ['NS', 'TBD'].includes(f.fixture.status.short))
          .filter(f => new Date(f.fixture.date).getTime() > Date.now());

        upcoming.sort((a, b) => {
          const aLeague = a.league.id === currentLeagueId ? 0 : 1;
          const bLeague = b.league.id === currentLeagueId ? 0 : 1;
          if (aLeague !== bLeague) return aLeague - bLeague;
          return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
        });

        setFixtures(upcoming.slice(0, 3));
        setLoaded(true);

        if (upcoming.length > 0) {
          track('ft_cta_shown');
        }
      })
      .catch(() => setLoaded(true));
  }, [currentLeagueId]);

  if (!loaded || fixtures.length === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-charcoal/60 border border-white/5 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-black text-white">Play again?</h3>
        <p className="text-[11px] text-white/40 mt-0.5">Pick your squad for an upcoming match</p>
      </div>

      <div className="px-3 pb-2 space-y-1">
        {fixtures.map(f => {
          const home = f.teams.home;
          const away = f.teams.away;
          const kickoffDate = new Date(f.fixture.date);
          const isToday = kickoffDate.toDateString() === new Date().toDateString();
          const timeLabel = isToday
            ? formatKickoffTime(f.fixture.date)
            : `${formatMatchDate(f.fixture.date)}, ${formatKickoffTime(f.fixture.date)}`;

          return (
            <a
              key={f.fixture.id}
              href={`/?fixture=${f.fixture.id}`}
              onClick={() => track('ft_cta_clicked', { fixtureId: f.fixture.id, leagueId: f.league.id })}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-6 h-6 relative flex-shrink-0">
                  <Image src={home.logo} alt={home.name} fill className="object-contain" sizes="24px" />
                </div>
                <span className="text-[11px] font-bold text-white/70 truncate">{home.name}</span>
                <span className="text-[10px] text-white/20">vs</span>
                <span className="text-[11px] font-bold text-white/70 truncate">{away.name}</span>
                <div className="w-6 h-6 relative flex-shrink-0">
                  <Image src={away.logo} alt={away.name} fill className="object-contain" sizes="24px" />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-white/30">{timeLabel}</span>
                <span className="text-[10px] font-bold text-accent">Create →</span>
              </div>
            </a>
          );
        })}
      </div>

      <div className="px-3 pb-3">
        <a
          href="/"
          onClick={() => track('ft_cta_see_more')}
          className="block text-center text-xs text-accent/60 font-semibold py-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          See more games →
        </a>
      </div>
    </div>
  );
}
