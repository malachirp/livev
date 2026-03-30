'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LeagueFilter from '@/components/LeagueFilter';
import FixtureCard from '@/components/FixtureCard';
import type { ApiFixture, League } from '@/types';
import { formatMatchDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface FixturesResponse {
  fixtures: ApiFixture[];
  leagues: League[];
  availableLeagueIds: number[];
}

export default function CreateGamePage() {
  const router = useRouter();
  const [data, setData] = useState<FixturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/fixtures')
      .then(async res => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.detail || json.error || 'Failed to load fixtures');
        }
        return json;
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load fixtures');
        setLoading(false);
      });
  }, []);

  const filteredFixtures = data?.fixtures.filter(f =>
    selectedLeague ? f.league.id === selectedLeague : true
  ) || [];

  // Group by date
  const grouped = filteredFixtures.reduce<Record<string, ApiFixture[]>>((acc, f) => {
    const dateKey = f.fixture.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(f);
    return acc;
  }, {});

  const handleCreateGame = async () => {
    if (!selectedFixture || !displayName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId: selectedFixture.fixture.id,
          leagueId: selectedFixture.league.id,
          homeTeamId: selectedFixture.teams.home.id,
          awayTeamId: selectedFixture.teams.away.id,
          homeTeamName: selectedFixture.teams.home.name,
          awayTeamName: selectedFixture.teams.away.name,
          matchDate: selectedFixture.fixture.date,
          displayName: displayName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const { code } = await res.json();
      router.push(`/room/${code}/pick`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Header />

      {/* Hero */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-white leading-tight">
          Pick a match
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Create a 5-a-side game with friends
        </p>
      </div>

      {/* League filters */}
      {data && data.availableLeagueIds.length > 0 && (
        <LeagueFilter
          leagues={data.leagues}
          selected={selectedLeague}
          onSelect={setSelectedLeague}
          availableLeagueIds={data.availableLeagueIds}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-white/40">Loading fixtures...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-live-red text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-accent font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {/* Fixtures list */}
      {!loading && !error && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          {Object.keys(grouped).length === 0 && (
            <div className="py-12 text-center">
              <p className="text-white/40 text-sm">No upcoming fixtures found</p>
            </div>
          )}

          {Object.entries(grouped).map(([dateKey, fixtures]) => (
            <div key={dateKey}>
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                {formatMatchDate(fixtures[0].fixture.date)}
              </h3>
              <div className="space-y-2">
                {fixtures.map(fixture => (
                  <FixtureCard
                    key={fixture.fixture.id}
                    fixture={fixture}
                    onSelect={setSelectedFixture}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom sheet: Name entry */}
      {selectedFixture && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sheet"
            onClick={() => { setSelectedFixture(null); setError(null); }}
          />
          <div className="relative bg-navy border-t border-white/10 rounded-t-3xl animate-slide-up">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-8">
              {/* Selected match preview */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <img
                    src={selectedFixture.teams.home.logo}
                    alt={selectedFixture.teams.home.name}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-sm font-bold text-white">
                    {selectedFixture.teams.home.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-white/30">VS</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {selectedFixture.teams.away.name}
                  </span>
                  <img
                    src={selectedFixture.teams.away.logo}
                    alt={selectedFixture.teams.away.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>

              {/* Name input */}
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
                Your name
              </label>
              <input
                type="text"
                placeholder="Enter your display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-charcoal text-white text-base font-medium placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/30 mb-4"
                onKeyDown={e => {
                  if (e.key === 'Enter' && displayName.trim()) handleCreateGame();
                }}
              />

              <button
                onClick={handleCreateGame}
                disabled={!displayName.trim() || creating}
                className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
                  displayName.trim()
                    ? 'bg-accent text-navy active:scale-[0.98]'
                    : 'bg-charcoal text-white/30 cursor-not-allowed'
                }`}
              >
                {creating ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
