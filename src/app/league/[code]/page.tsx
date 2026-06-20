'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import ShareButton from '@/components/ShareButton';
import HelpButton from '@/components/HelpButton';
import ContactButton from '@/components/ContactButton';
import HomeButton from '@/components/HomeButton';
import UpcomingGamesRibbon from '@/components/UpcomingGamesRibbon';
import LeagueLeaderboard, { type LeagueStanding } from '@/components/league/LeagueLeaderboard';
import LeagueGamesList, { type LeagueGame } from '@/components/league/LeagueGamesList';
import LeagueStatsGrid, { type LeagueAward } from '@/components/league/LeagueStatsGrid';
import LeagueJoinCard from '@/components/league/LeagueJoinCard';
import { track } from '@/lib/track';
import type { ApiFixture } from '@/types';

interface LeagueResponse {
  exists: boolean;
  isMember: boolean;
  name?: string;
  competitionName?: string;
  memberCount?: number;
  league?: {
    code: string;
    name: string;
    competitionId: number;
    competitionName: string;
    season: number;
    memberCount: number;
  };
  currentMember?: { id: string; displayName: string; isAdmin: boolean } | null;
  standings?: LeagueStanding[];
  games?: LeagueGame[];
  awards?: LeagueAward[];
  totals?: { members: number; gamesPlayed: number; gamesFinished: number };
}

export default function LeaguePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [data, setData] = useState<LeagueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${code}`);
      if (!res.ok && res.status !== 404) throw new Error('Failed');
      const json: LeagueResponse = await res.json();
      setData(json);
    } catch {
      setData({ exists: false, isMember: false });
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { track('page_view', { entry_type: 'league' }); }, []);
  useEffect(() => { load(); }, [load]);

  const handleHost = async (fixture: ApiFixture) => {
    if (creating || !data?.currentMember) return;
    setCreating(true);
    setHostError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId: fixture.fixture.id,
          leagueId: fixture.league.id,
          homeTeamId: fixture.teams.home.id,
          awayTeamId: fixture.teams.away.id,
          homeTeamName: fixture.teams.home.name,
          awayTeamName: fixture.teams.away.name,
          homeTeamLogo: fixture.teams.home.logo,
          awayTeamLogo: fixture.teams.away.logo,
          venue: fixture.fixture.venue?.name || null,
          matchDate: fixture.fixture.date,
          displayName: data.currentMember.displayName,
          leagueCode: code,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create game');
      track('league_game_created', { code, leagueGame: json.code });
      router.push(`/room/${json.code}/pick`);
    } catch (err: any) {
      setHostError(err.message);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || !data.exists) {
    return (
      <div className="flex flex-col flex-1">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-white/60 text-lg font-bold mb-2">League not found</p>
            <button onClick={() => router.push('/')} className="text-accent font-semibold text-sm">
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-member: one-time sign-up to the league
  if (!data.isMember) {
    return (
      <div className="flex flex-col flex-1">
        <Header />
        <LeagueJoinCard
          code={code}
          leagueName={data.name || 'League'}
          competitionName={data.competitionName || 'Competition'}
          memberCount={data.memberCount || 0}
          onJoined={() => { setLoading(true); load(); }}
        />
      </div>
    );
  }

  const league = data.league!;

  return (
    <div className="flex flex-col flex-1 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 bg-navy/80 backdrop-blur-sm">
          <a href="/" onClick={() => track('logo_clicked')} className="flex items-baseline">
            <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
            <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
          </a>
          <div className="flex items-center gap-2">
            <ShareButton roomCode="" url={`/league/${code}`} />
            <HelpButton />
            <ContactButton />
            <HomeButton />
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-accent via-accent/40 to-accent" />
      </header>

      {/* League title bar */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-black text-white leading-tight">{league.name}</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {league.competitionName} · {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'} · {data.totals?.gamesPlayed || 0} {data.totals?.gamesPlayed === 1 ? 'game' : 'games'}
        </p>
      </div>

      {/* Host a game from this league (competition-scoped) */}
      <UpcomingGamesRibbon
        competitionId={league.competitionId}
        onSelectFixture={handleHost}
        excludeFixtureIds={(data.games || []).map(g => g.fixtureId)}
      />
      {creating && (
        <p className="px-4 py-2 text-xs text-accent">Creating game…</p>
      )}
      {hostError && (
        <p className="px-4 py-2 text-xs text-live-red">{hostError}</p>
      )}

      {/* Games in this league */}
      <LeagueGamesList games={data.games || []} />

      {/* Accumulated standings */}
      <LeagueLeaderboard standings={data.standings || []} />

      {/* Awards & fun stats */}
      <LeagueStatsGrid awards={data.awards || []} />
    </div>
  );
}
