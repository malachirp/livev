'use client';

import type { League } from '@/types';

interface Props {
  leagues: League[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  availableLeagueIds: number[];
}

export default function LeagueFilter({ leagues, selected, onSelect, availableLeagueIds }: Props) {
  const available = leagues.filter(l => availableLeagueIds.includes(l.id));

  if (available.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          selected === null
            ? 'bg-accent text-navy'
            : 'bg-charcoal text-white/70 hover:text-white'
        }`}
      >
        All
      </button>
      {available.map(league => (
        <button
          key={league.id}
          onClick={() => onSelect(league.id === selected ? null : league.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            selected === league.id
              ? 'bg-accent text-navy'
              : 'bg-charcoal text-white/70 hover:text-white'
          }`}
        >
          {league.name}
        </button>
      ))}
    </div>
  );
}
