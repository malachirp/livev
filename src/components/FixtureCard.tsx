'use client';

import Image from 'next/image';
import type { ApiFixture } from '@/types';
import { formatKickoffTime } from '@/lib/utils';
import { getTeamColours } from '@/lib/team-colours';

interface Props {
  fixture: ApiFixture;
  onSelect: (fixture: ApiFixture) => void;
}

export default function FixtureCard({ fixture, onSelect }: Props) {
  const home = fixture.teams.home;
  const away = fixture.teams.away;
  const homeColours = getTeamColours(home.id);
  const awayColours = getTeamColours(away.id);

  return (
    <button
      onClick={() => onSelect(fixture)}
      className="w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98] hover:ring-2 hover:ring-accent/30 relative"
    >
      {/* Colour wash background */}
      <div className="absolute inset-0 bg-charcoal" />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(120deg, ${homeColours.primary}25 0%, transparent 35%, transparent 65%, ${awayColours.primary}25 100%)`,
        }}
      />
      {/* Top colour bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${homeColours.primary} 0%, ${homeColours.primary}40 40%, ${awayColours.primary}40 60%, ${awayColours.primary} 100%)`,
        }}
      />

      <div className="relative px-4 py-4">
        {/* League + Time */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
            {fixture.league.name}
          </span>
          <span className="text-xs font-bold text-accent">
            {formatKickoffTime(fixture.fixture.date)}
          </span>
        </div>
        {fixture.fixture.venue?.name && (
          <p className="text-[10px] text-white/30 mb-2 truncate">
            {fixture.fixture.venue.name}{fixture.fixture.venue.city ? `, ${fixture.fixture.venue.city}` : ''}
          </p>
        )}

        {/* Teams */}
        <div className="flex items-center justify-between">
          {/* Home */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 relative">
              <Image
                src={home.logo}
                alt={home.name}
                fill
                className="object-contain"
                sizes="40px"
              />
            </div>
            <span className="text-sm font-bold text-white truncate">{home.name}</span>
          </div>

          {/* VS divider */}
          <div className="px-3 flex flex-col items-center">
            <span className="text-xs font-bold text-white/30">VS</span>
          </div>

          {/* Away */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <span className="text-sm font-bold text-white truncate text-right">{away.name}</span>
            <div className="w-10 h-10 flex-shrink-0 relative">
              <Image
                src={away.logo}
                alt={away.name}
                fill
                className="object-contain"
                sizes="40px"
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
