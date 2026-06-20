'use client';

import { useState, useEffect } from 'react';
import { formatKickoffTime, formatMatchDate } from '@/lib/utils';
import { track } from '@/lib/track';
import { getTeamColours } from '@/lib/team-colours';
import type { ApiFixture } from '@/types';

const LEAGUE_PRESTIGE: Record<number, number> = {
  1: 0, 2: 1, 39: 2, 45: 3, 41: 4, 40: 5, 140: 6, 78: 7, 94: 8, 3: 9, 525: 10, 32: 11, 10: 12,
};

interface Props {
  currentFixtureId?: number;
  competitionId?: number;
  heading?: string;
  onSelectFixture?: (fixture: ApiFixture) => void;
  excludeFixtureIds?: number[];
}

export default function UpcomingGamesRibbon({ currentFixtureId, competitionId, heading = 'Host a Game', onSelectFixture, excludeFixtureIds }: Props) {
  const [fixtures, setFixtures] = useState<ApiFixture[] | null>(null);
  const leagueMode = !!onSelectFixture;

  useEffect(() => {
    fetch('/api/fixtures')
      .then(res => res.json())
      .then(data => {
        if (!data.fixtures?.length) {
          setFixtures([]);
          return;
        }

        const upcoming = (data.fixtures as ApiFixture[])
          .filter(f => f.fixture.id !== currentFixtureId)
          .filter(f => competitionId == null || f.league.id === competitionId)
          .filter(f => ['NS', 'TBD'].includes(f.fixture.status.short))
          .filter(f => new Date(f.fixture.date).getTime() > Date.now())
          .filter(f => !(excludeFixtureIds || []).includes(f.fixture.id));

        upcoming.sort((a, b) => {
          const timeDiff = a.fixture.timestamp - b.fixture.timestamp;
          if (timeDiff !== 0) return timeDiff;
          const aPrestige = LEAGUE_PRESTIGE[a.league.id] ?? 99;
          const bPrestige = LEAGUE_PRESTIGE[b.league.id] ?? 99;
          return aPrestige - bPrestige;
        });

        setFixtures(upcoming.slice(0, 12));
        if (upcoming.length > 0) track('ribbon_shown');
      })
      .catch(() => setFixtures([]));
  }, [currentFixtureId, competitionId]);

  // Default (room) mode hides entirely when there's nothing to show.
  // League host mode keeps the band and shows an empty note so members know where to host.
  if (fixtures !== null && fixtures.length === 0 && !leagueMode) return null;

  return (
    <div className="bg-black/20 border-y border-white/5 mb-1">
     <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-accent uppercase tracking-wider">{heading}</h3>
        {!leagueMode && (
          <a
            href="/"
            onClick={() => track('ribbon_see_more')}
            className="text-[11px] font-semibold text-accent/60 hover:text-accent transition-colors"
          >
            See all →
          </a>
        )}
      </div>

      {fixtures !== null && fixtures.length === 0 && leagueMode ? (
        <div className="h-[70px] flex items-center">
          <span className="text-[11px] text-white/30">No upcoming fixtures in the next 7 days.</span>
        </div>
      ) : (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {fixtures === null ? (
          /* Reserve the band's final height while loading — no mismatched skeleton pills */
          <div className="h-[70px]" />
        ) : (
          <>
            {fixtures.map(f => {
              const home = f.teams.home;
              const away = f.teams.away;
              const homeColours = getTeamColours(home.id, home.name);
              const awayColours = getTeamColours(away.id, away.name);
              const kickoffDate = new Date(f.fixture.date);
              const isToday = kickoffDate.toDateString() === new Date().toDateString();
              const timeLabel = isToday
                ? formatKickoffTime(f.fixture.date)
                : `${formatMatchDate(f.fixture.date)}, ${formatKickoffTime(f.fixture.date)}`;

              const inner = (
                <>
                  <div className="absolute inset-0 bg-charcoal/60" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(120deg, ${homeColours.primary}15 0%, transparent 40%, transparent 60%, ${awayColours.primary}15 100%)`,
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={home.logo} alt="" className="w-5 h-5 object-contain transition-opacity duration-200" loading="eager" />
                      <span className="text-[11px] font-bold text-white/60 truncate">{home.name}</span>
                      <span className="text-[11px] text-white/20">vs</span>
                      <span className="text-[11px] font-bold text-white/60 truncate">{away.name}</span>
                      <img src={away.logo} alt="" className="w-5 h-5 object-contain transition-opacity duration-200" loading="eager" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30">{timeLabel}</span>
                      <span className="text-[10px] font-bold text-accent">Create →</span>
                    </div>
                  </div>
                </>
              );

              const className =
                'flex-shrink-0 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all min-w-[180px] h-[70px] relative overflow-hidden text-left';

              return leagueMode ? (
                <button key={f.fixture.id} onClick={() => onSelectFixture!(f)} className={className}>
                  {inner}
                </button>
              ) : (
                <a
                  key={f.fixture.id}
                  href={`/?fixture=${f.fixture.id}`}
                  onClick={() => track('ribbon_fixture_clicked', { fixtureId: f.fixture.id, leagueId: f.league.id })}
                  className={className}
                >
                  {inner}
                </a>
              );
            })}
            {!leagueMode && (
              <a
                href="/"
                onClick={() => track('ribbon_see_more')}
                className="flex-shrink-0 bg-charcoal/40 rounded-xl p-3 border border-white/5 hover:border-accent/20 transition-all min-w-[100px] h-[70px] flex items-center justify-center"
              >
                <span className="text-[11px] font-bold text-accent">More →</span>
              </a>
            )}
          </>
        )}
      </div>
      )}
     </div>
    </div>
  );
}
