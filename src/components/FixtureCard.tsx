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
      className="w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98] hover:ring-2 hover:ring-accent/30"
      style={{
        background: `linear-gradient(135deg, ${homeColours.primary}15 0%, #1e293b 40%, #1e293b 60%, ${awayColours.primary}15 100%)`,
      }}
    >
      <div className="px-4 py-4">
        {/* League + Time */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
            {fixture.league.name}
          </span>
          <span className="text-xs font-bold text-accent">
            {formatKickoffTime(fixture.fixture.date)}
          </span>
        </div>

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

          {/* VS */}
          <div className="px-3">
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
