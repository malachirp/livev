'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import LeagueFilter from '@/components/LeagueFilter';
import FixtureCard from '@/components/FixtureCard';
import type { ApiFixture, League } from '@/types';
import { formatMatchDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/track';
import { isMatchLive, isMatchFinished } from '@/types';

interface FixturesResponse {
  fixtures: ApiFixture[];
  leagues: League[];
  availableLeagueIds: number[];
}

interface MyRoom {
  code: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  matchDate: string;
  matchStatus: string;
  homeScore: number | null;
  awayScore: number | null;
  userDisplayName: string;
  userPoints: number;
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
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [myRoomsDismissed, setMyRoomsDismissed] = useState(false);
  const [myRoomsHasMore, setMyRoomsHasMore] = useState(false);
  const [myRoomsLoading, setMyRoomsLoading] = useState(false);

  // Drag-to-dismiss for fixture bottom sheet
  const fixtureSheetRef = useRef<HTMLDivElement>(null);
  const fixtureDragStartY = useRef<number | null>(null);
  const fixtureTranslateY = useRef(0);

  const handleFixtureTouchStart = (e: React.TouchEvent) => {
    fixtureDragStartY.current = e.touches[0].clientY;
  };
  const handleFixtureTouchMove = (e: React.TouchEvent) => {
    if (fixtureDragStartY.current === null || !fixtureSheetRef.current) return;
    const dy = e.touches[0].clientY - fixtureDragStartY.current;
    if (dy > 0) {
      fixtureTranslateY.current = dy;
      fixtureSheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleFixtureTouchEnd = () => {
    if (fixtureTranslateY.current > 100) {
      setSelectedFixture(null);
      setError(null);
    } else if (fixtureSheetRef.current) {
      fixtureSheetRef.current.style.transform = 'translateY(0)';
      fixtureSheetRef.current.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (fixtureSheetRef.current) fixtureSheetRef.current.style.transition = '';
      }, 200);
    }
    fixtureDragStartY.current = null;
    fixtureTranslateY.current = 0;
  };

  useEffect(() => { track('page_view', { entry_type: 'direct' }); }, []);

  // Fetch user's existing games
  useEffect(() => {
    fetch('/api/me/rooms?limit=5&offset=0')
      .then(res => res.json())
      .then(data => {
        if (data.rooms?.length) setMyRooms(data.rooms);
        setMyRoomsHasMore(!!data.hasMore);
      })
      .catch(() => {});
  }, []);

  const loadMoreRooms = () => {
    setMyRoomsLoading(true);
    fetch(`/api/me/rooms?limit=5&offset=${myRooms.length}`)
      .then(res => res.json())
      .then(data => {
        if (data.rooms?.length) setMyRooms(prev => [...prev, ...data.rooms]);
        setMyRoomsHasMore(!!data.hasMore);
      })
      .catch(() => {})
      .finally(() => setMyRoomsLoading(false));
  };

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

  const filteredFixtures = data?.fixtures.filter(f => {
    // Hide fixtures past kickoff (cache may still have them as NS)
    if (new Date(f.fixture.date).getTime() <= Date.now()) return false;
    return selectedLeague ? f.league.id === selectedLeague : true;
  }) || [];

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
          homeTeamLogo: selectedFixture.teams.home.logo,
          awayTeamLogo: selectedFixture.teams.away.logo,
          venue: selectedFixture.fixture.venue?.name || null,
          matchDate: selectedFixture.fixture.date,
          displayName: displayName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const { code } = await res.json();
      track('game_created', { code, leagueId: selectedFixture.league.id, leagueName: selectedFixture.league.name });
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
          Create a 5-a-side fantasy game with friends
        </p>
      </div>

      {/* Your Games */}
      {myRooms.length > 0 && !myRoomsDismissed && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-accent uppercase tracking-wider">Your Games</h3>
            <button
              onClick={() => setMyRoomsDismissed(true)}
              className="text-white/20 hover:text-white/40 transition-colors p-1"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {myRooms.map(room => {
              const roomLive = isMatchLive(room.matchStatus);
              const roomFinished = isMatchFinished(room.matchStatus);
              return (
                <a
                  key={room.code}
                  href={`/room/${room.code}`}
                  className="flex-shrink-0 bg-charcoal/60 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all min-w-[180px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {room.homeTeamLogo && (
                      <img src={room.homeTeamLogo} alt="" className="w-5 h-5 object-contain" />
                    )}
                    <span className="text-[11px] font-bold text-white/60 truncate">{room.homeTeamName}</span>
                    {roomFinished && room.homeScore !== null && room.awayScore !== null ? (
                      <span className="text-[11px] font-black text-accent">{room.homeScore}-{room.awayScore}</span>
                    ) : (
                      <span className="text-[11px] text-white/20">vs</span>
                    )}
                    <span className="text-[11px] font-bold text-white/60 truncate">{room.awayTeamName}</span>
                    {room.awayTeamLogo && (
                      <img src={room.awayTeamLogo} alt="" className="w-5 h-5 object-contain" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    {roomLive ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-live-red live-dot" />
                        <span className="text-[10px] font-bold text-live-red uppercase">Live</span>
                      </span>
                    ) : roomFinished ? (
                      <span className="text-[10px] font-bold text-white/30">
                        FT · {room.userPoints} pts
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/30">
                        {new Date(room.matchDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-accent">Return →</span>
                  </div>
                </a>
              );
            })}
            {myRoomsHasMore && (
              <button
                onClick={loadMoreRooms}
                disabled={myRoomsLoading}
                className="flex-shrink-0 bg-charcoal/40 rounded-xl p-3 border border-white/5 hover:border-accent/20 transition-all min-w-[100px] flex items-center justify-center"
              >
                <span className="text-[11px] font-bold text-accent">
                  {myRoomsLoading ? 'Loading...' : 'More →'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

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
          <div ref={fixtureSheetRef} className="relative bg-navy border-t border-white/10 rounded-t-3xl animate-slide-up">
            <div
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleFixtureTouchStart}
              onTouchMove={handleFixtureTouchMove}
              onTouchEnd={handleFixtureTouchEnd}
            >
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
