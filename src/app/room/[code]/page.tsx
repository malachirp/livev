'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import MatchBanner from '@/components/MatchBanner';
import Leaderboard from '@/components/Leaderboard';
import ShareButton from '@/components/ShareButton';
import { getTeamColours } from '@/lib/team-colours';
import { isMatchLive, isMatchFinished } from '@/types';
import type { RoomData, PlayerData, ApiFixtureEvent } from '@/types';
import HelpButton from '@/components/HelpButton';

interface RoomResponse {
  room: RoomData & { teamsLocked: boolean; lockTime: string };
  currentPlayer: { id: string; displayName: string; hasPicks: boolean } | null;
  match: { status: string; homeScore: number | null; awayScore: number | null; minute: number | null };
}

interface LiveResponse {
  match: {
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    minute: number | null;
    events: ApiFixtureEvent[];
  };
  teamsLocked: boolean;
  leaderboard: PlayerData[];
}

export default function LiveRoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<RoomResponse['currentPlayer']>(null);
  const [match, setMatch] = useState<RoomResponse['match']>({ status: 'NS', homeScore: null, awayScore: null, minute: null });
  const [leaderboard, setLeaderboard] = useState<PlayerData[]>([]);
  const [events, setEvents] = useState<ApiFixtureEvent[]>([]);
  const [teamsLocked, setTeamsLocked] = useState(false);
  const [lockTime, setLockTime] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join form state
  const [showJoin, setShowJoin] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Drag-to-dismiss for join bottom sheet
  const joinSheetRef = useRef<HTMLDivElement>(null);
  const joinDragStartY = useRef<number | null>(null);
  const joinTranslateY = useRef(0);

  const handleJoinTouchStart = (e: React.TouchEvent) => {
    joinDragStartY.current = e.touches[0].clientY;
  };
  const handleJoinTouchMove = (e: React.TouchEvent) => {
    if (joinDragStartY.current === null || !joinSheetRef.current) return;
    const dy = e.touches[0].clientY - joinDragStartY.current;
    if (dy > 0) {
      joinTranslateY.current = dy;
      joinSheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleJoinTouchEnd = () => {
    if (joinTranslateY.current > 100) {
      setShowJoin(false);
      setJoinError(null);
    } else if (joinSheetRef.current) {
      joinSheetRef.current.style.transform = 'translateY(0)';
      joinSheetRef.current.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (joinSheetRef.current) joinSheetRef.current.style.transition = '';
      }, 200);
    }
    joinDragStartY.current = null;
    joinTranslateY.current = 0;
  };

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) throw new Error('Room not found');

        const data: RoomResponse = await res.json();
        setRoom(data.room);
        setCurrentPlayer(data.currentPlayer);
        setMatch(data.match);
        setLeaderboard(data.room.players);
        setTeamsLocked(data.room.teamsLocked);
        setLockTime(data.room.lockTime);
        setLoading(false);
      } catch {
        setError('Room not found');
        setLoading(false);
      }
    }

    load();
  }, [code]);

  // Polling for live data
  const pollLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}/live`);
      if (!res.ok) return;

      const data: LiveResponse = await res.json();
      setMatch(data.match);
      setLeaderboard(data.leaderboard);
      if (data.match.events) setEvents(data.match.events);
      if (data.teamsLocked !== undefined) setTeamsLocked(data.teamsLocked);
    } catch {
      // Silently fail on poll errors
    }
  }, [code]);

  useEffect(() => {
    if (!room) return;

    const status = match.status;
    let interval: number;

    if (isMatchLive(status)) {
      interval = 60_000; // 1 min during live match (includes HT, ET, penalties, etc.)
    } else if (isMatchFinished(status)) {
      // Keep polling for 5 minutes after FT to pick up final events/stats
      pollLive();
      interval = 60_000;
    } else {
      // Smart pre-match polling: faster as kickoff approaches
      const kickoff = new Date(room.matchDate).getTime();
      const msUntilKickoff = kickoff - Date.now();

      if (msUntilKickoff <= 0) {
        interval = 60_000; // Should be live soon, poll every minute
      } else if (msUntilKickoff <= 30 * 60 * 1000) {
        interval = 60_000; // Within 30min: every minute
      } else {
        interval = 300_000; // More than 30min out: every 5min
      }
    }

    pollRef.current = setInterval(pollLive, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [room, match.status, pollLive]);

  // Countdown timer to lock time
  useEffect(() => {
    if (!lockTime || teamsLocked) {
      setLockCountdown(null);
      return;
    }

    function updateCountdown() {
      const diff = new Date(lockTime!).getTime() - Date.now();
      if (diff <= 0) {
        setLockCountdown(null);
        setTeamsLocked(true);
        // Immediately fetch revealed picks
        pollLive();
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      if (h > 0) setLockCountdown(`${h}h ${m}m`);
      else if (m > 0) setLockCountdown(`${m}m ${s}s`);
      else setLockCountdown(`${s}s`);
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockTime, teamsLocked, pollLive]);

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: joinName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join');
      }

      setCurrentPlayer({ id: data.playerId, displayName: joinName.trim(), hasPicks: false });
      setShowJoin(false);

      // Redirect to pick team
      router.push(`/room/${code}/pick`);
    } catch (err: any) {
      setJoinError(err.message);
      setJoining(false);
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

  if (error || !room) {
    return (
      <div className="flex flex-col flex-1">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-white/60 text-lg font-bold mb-2">Room not found</p>
            <button onClick={() => router.push('/')} className="text-accent font-semibold text-sm">
              Create a new game
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isInGame = !!currentPlayer;
  const hasPicks = currentPlayer?.hasPicks ?? false;
  const live = isMatchLive(match.status);
  const finished = isMatchFinished(match.status);
  const notStarted = match.status === 'NS';
  const canEdit = !teamsLocked; // Editing closes 5 min before kickoff

  return (
    <div className="flex flex-col flex-1 pb-24">
      {/* Header with share */}
      <header className="sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 bg-navy/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-baseline">
              <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
              <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
            </a>
            {live && (
              <span className="ml-2 flex items-center gap-1 bg-live-red/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-live-red live-dot" />
                <span className="text-[10px] font-bold text-live-red uppercase">Live</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ShareButton roomCode={code} matchTitle={`${room.homeTeamName} vs ${room.awayTeamName}`} />
            <HelpButton />
          </div>
        </div>
        {/* Team colour gradient bar */}
        <div
          className="h-[2px]"
          style={{
            background: `linear-gradient(90deg, ${getTeamColours(room.homeTeamId, room.homeTeamName).primary} 0%, ${getTeamColours(room.homeTeamId, room.homeTeamName).primary}40 40%, ${getTeamColours(room.awayTeamId, room.awayTeamName).primary}40 60%, ${getTeamColours(room.awayTeamId, room.awayTeamName).primary} 100%)`,
          }}
        />
      </header>

      {/* Match Banner */}
      <MatchBanner
        homeTeamId={room.homeTeamId}
        awayTeamId={room.awayTeamId}
        homeTeamName={room.homeTeamName}
        awayTeamName={room.awayTeamName}
        homeTeamLogo={room.homeTeamLogo || undefined}
        awayTeamLogo={room.awayTeamLogo || undefined}
        venue={room.venue}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        status={match.status}
        minute={match.minute}
        matchDate={room.matchDate}
        events={events}
      />

      {/* Player count + lock status */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
          {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
        </span>
        {finished ? (
          <span className="text-xs font-bold text-points-gold bg-points-gold/10 px-3 py-1 rounded-full">
            Final Results
          </span>
        ) : !teamsLocked && lockCountdown ? (
          <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full">
            Teams reveal in {lockCountdown}
          </span>
        ) : teamsLocked && notStarted ? (
          <span className="text-xs font-bold text-accent bg-accent/10 px-3 py-1 rounded-full">
            Teams revealed
          </span>
        ) : null}
      </div>

      {/* Leaderboard */}
      <Leaderboard
        players={leaderboard}
        homeTeamId={room.homeTeamId}
        awayTeamId={room.awayTeamId}
        homeTeamName={room.homeTeamName}
        awayTeamName={room.awayTeamName}
        teamsLocked={teamsLocked}
      />

      {/* Bottom action bar — only show join/pick/edit before teams lock (5 min before KO) */}
      {!isInGame && canEdit && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto px-4 py-4 bg-gradient-to-t from-navy via-navy/95 to-transparent">
            <button
              onClick={() => setShowJoin(true)}
              className="w-full py-4 rounded-2xl font-black text-base bg-accent text-navy active:scale-[0.98] transition-all"
            >
              Join Game & Pick Your Team
            </button>
          </div>
        </div>
      )}

      {isInGame && !hasPicks && canEdit && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto px-4 py-4 bg-gradient-to-t from-navy via-navy/95 to-transparent">
            <button
              onClick={() => router.push(`/room/${code}/pick`)}
              className="w-full py-4 rounded-2xl font-black text-base bg-accent text-navy active:scale-[0.98] transition-all"
            >
              Pick Your Team
            </button>
          </div>
        </div>
      )}

      {isInGame && hasPicks && canEdit && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto px-4 py-4 bg-gradient-to-t from-navy via-navy/95 to-transparent">
            <button
              onClick={() => router.push(`/room/${code}/pick`)}
              className="w-full py-3 rounded-2xl font-bold text-sm bg-charcoal text-white/70 active:scale-[0.98] transition-all border border-white/10"
            >
              Edit Team
            </button>
          </div>
        </div>
      )}

      {/* Join bottom sheet */}
      {showJoin && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sheet"
            onClick={() => { setShowJoin(false); setJoinError(null); }}
          />
          <div ref={joinSheetRef} className="relative bg-navy border-t border-white/10 rounded-t-3xl animate-slide-up">
            <div
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleJoinTouchStart}
              onTouchMove={handleJoinTouchMove}
              onTouchEnd={handleJoinTouchEnd}
            >
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-8">
              <h3 className="text-lg font-black text-white mb-1">Join Game</h3>
              <p className="text-xs text-white/40 mb-5">
                {room.homeTeamName} vs {room.awayTeamName}
              </p>

              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
                Your name
              </label>
              <input
                type="text"
                placeholder="Enter your display name"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-charcoal text-white text-base font-medium placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/30 mb-2"
                onKeyDown={e => {
                  if (e.key === 'Enter' && joinName.trim()) handleJoin();
                }}
              />

              {joinError && (
                <p className="text-live-red text-xs mb-2">{joinError}</p>
              )}

              <button
                onClick={handleJoin}
                disabled={!joinName.trim() || joining}
                className={`w-full py-4 rounded-2xl font-black text-base transition-all mt-2 ${
                  joinName.trim()
                    ? 'bg-accent text-navy active:scale-[0.98]'
                    : 'bg-charcoal text-white/30 cursor-not-allowed'
                }`}
              >
                {joining ? 'Joining...' : 'Join & Pick Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
