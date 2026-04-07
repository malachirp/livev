'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PitchPicker from '@/components/PitchPicker';
import ShareButton from '@/components/ShareButton';
import HelpButton from '@/components/HelpButton';
import type { NormalizedPlayer, PickData, RoomData } from '@/types';

export default function PickTeamPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [players, setPlayers] = useState<NormalizedPlayer[]>([]);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [existingPicks, setExistingPicks] = useState<PickData[]>([]);
  const [existingCaptainSlot, setExistingCaptainSlot] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLineups, setHasLineups] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [hadExistingPicks, setHadExistingPicks] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const lineupPollRef = useRef<NodeJS.Timeout | null>(null);
  const fixtureIdRef = useRef<number | null>(null);

  const squadsUrlRef = useRef<string | null>(null);

  // Poll for lineup updates when close to kickoff
  const refreshSquads = useCallback(async () => {
    if (!squadsUrlRef.current) return;
    try {
      const squadsRes = await fetch(squadsUrlRef.current);
      if (!squadsRes.ok) return;
      const squadsData = await squadsRes.json();
      if (squadsData.players) {
        setPlayers(squadsData.players);
      }
      if (squadsData.hasLineups && !hasLineups) {
        setHasLineups(true);
        // Stop polling — we got the lineups
        if (lineupPollRef.current) {
          clearInterval(lineupPollRef.current);
          lineupPollRef.current = null;
        }
      }
    } catch {
      // Silently fail on background refresh
    }
  }, [hasLineups]);

  useEffect(() => {
    async function load() {
      try {
        const roomRes = await fetch(`/api/rooms/${code}`);
        const roomData = await roomRes.json();

        if (!roomData.room) {
          setError('Room not found');
          setLoading(false);
          return;
        }

        setRoom(roomData.room);
        fixtureIdRef.current = roomData.room.fixtureId;

        // Redirect back if teams are already locked (5 min before kickoff)
        if (roomData.room.teamsLocked) {
          router.replace(`/room/${code}`);
          return;
        }

        if (roomData.currentPlayer?.isCreator) setIsCreator(true);
        if (roomData.currentPlayer?.hasPicks) {
          setHadExistingPicks(true);
          const playerData = roomData.room.players.find(
            (p: any) => p.id === roomData.currentPlayer.id
          );
          if (playerData?.picks) {
            setExistingPicks(playerData.picks);
          }
          if (roomData.currentPlayer.captainSlot !== undefined) {
            setExistingCaptainSlot(roomData.currentPlayer.captainSlot);
          }
        }

        // Build squad URL with room data to avoid an extra API call on the server
        const squadsUrl = `/api/squads/${roomData.room.fixtureId}?homeTeamId=${roomData.room.homeTeamId}&awayTeamId=${roomData.room.awayTeamId}&matchDate=${encodeURIComponent(roomData.room.matchDate)}`;
        squadsUrlRef.current = squadsUrl;

        const squadsRes = await fetch(squadsUrl);
        if (!squadsRes.ok) {
          // Retry once after a short delay
          await new Promise(r => setTimeout(r, 2000));
          const retryRes = await fetch(squadsUrl);
          if (!retryRes.ok) throw new Error('Failed to load squads');
          const retryData = await retryRes.json();
          setPlayers(retryData.players || []);
          setHasLineups(retryData.hasLineups || false);
        } else {
          const squadsData = await squadsRes.json();
          setPlayers(squadsData.players || []);
          setHasLineups(squadsData.hasLineups || false);
        }

        // Start polling for lineups if within 90 min of kickoff and lineups not yet available
        const kickoff = new Date(roomData.room.matchDate).getTime();
        const msUntilKickoff = kickoff - Date.now();
        if (msUntilKickoff <= 90 * 60 * 1000 && msUntilKickoff > 0 && !hasLineups) {
          // Poll every 2 minutes for lineup release
          lineupPollRef.current = setInterval(refreshSquads, 2 * 60 * 1000);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load');
        setLoading(false);
      }
    }

    load();

    return () => {
      if (lineupPollRef.current) clearInterval(lineupPollRef.current);
    };
  }, [code, refreshSquads]);

  const handleSubmit = async (picks: PickData[], captainSlot: number) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${code}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks, captainSlot }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save picks');
      }

      // Show share prompt for host's first pick
      if (isCreator && !hadExistingPicks) {
        setShowSharePrompt(true);
        setSubmitting(false);
        return;
      }

      router.push(`/room/${code}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between px-4 py-3 bg-navy/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
          <a href="/" className="flex items-baseline">
            <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
            <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
          </a>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-white/40">Loading squads...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between px-4 py-3 bg-navy/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
          <a href="/" className="flex items-baseline">
            <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
            <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
          </a>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-live-red text-sm">{error}</p>
            <button onClick={() => router.push('/')} className="mt-3 text-sm text-accent font-semibold">
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header with logo + share */}
      <header className="flex items-center justify-between px-4 py-3 bg-navy/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
        <a href="/" className="flex items-baseline">
          <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
          <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
        </a>
        <div className="flex items-center gap-2">
          <ShareButton roomCode={code} matchTitle={room ? `${room.homeTeamName} vs ${room.awayTeamName}` : undefined} />
          <HelpButton />
        </div>
      </header>

      {/* Title */}
      <div className="px-4 pt-3 pb-1">
        <h1 className="text-lg font-black text-white">Pick Your Team</h1>
        {room && (
          <p className="text-xs text-white/40 mt-0.5">
            {room.homeTeamName} vs {room.awayTeamName}
          </p>
        )}
      </div>

      {error && (
        <div className="px-4 py-2">
          <p className="text-live-red text-xs bg-live-red/10 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {room && (
        <PitchPicker
          players={players}
          homeTeamId={room.homeTeamId}
          awayTeamId={room.awayTeamId}
          homeTeamName={room.homeTeamName}
          awayTeamName={room.awayTeamName}
          existingPicks={existingPicks}
          onSubmit={handleSubmit}
          submitting={submitting}
          roomCode={code}
          existingCaptainSlot={existingCaptainSlot}
          hasLineups={hasLineups}
        />
      )}

      {/* Share prompt overlay for host after first pick */}
      {showSharePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm bg-navy border border-white/10 rounded-3xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f5a0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white mb-2">Team locked in!</h2>
            <p className="text-sm text-white/50 mb-6">
              Share your game room so your mates can pick their squads
            </p>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/room/${code}`;
                if (navigator.share) {
                  try { await navigator.share({ url }); } catch { /* cancelled */ }
                } else {
                  await navigator.clipboard.writeText(url);
                }
                router.push(`/room/${code}`);
              }}
              className="w-full py-4 rounded-2xl bg-accent text-navy font-black text-base active:scale-[0.98] transition-all mb-3"
            >
              Share with friends
            </button>
            <button
              onClick={() => router.push(`/room/${code}`)}
              className="text-sm text-white/40 font-medium"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
