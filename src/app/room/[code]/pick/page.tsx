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
  const lineupPollRef = useRef<NodeJS.Timeout | null>(null);
  const fixtureIdRef = useRef<number | null>(null);

  // Poll for lineup updates when close to kickoff
  const refreshSquads = useCallback(async () => {
    if (!fixtureIdRef.current) return;
    try {
      const squadsRes = await fetch(`/api/squads/${fixtureIdRef.current}`);
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

        if (roomData.currentPlayer?.hasPicks) {
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

        const squadsRes = await fetch(`/api/squads/${roomData.room.fixtureId}`);
        const squadsData = await squadsRes.json();
        setPlayers(squadsData.players || []);
        setHasLineups(squadsData.hasLineups || false);

        // Start polling for lineups if within 90 min of kickoff and lineups not yet available
        const kickoff = new Date(roomData.room.matchDate).getTime();
        const msUntilKickoff = kickoff - Date.now();
        if (msUntilKickoff <= 90 * 60 * 1000 && msUntilKickoff > 0 && !squadsData.hasLineups) {
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
        />
      )}
    </div>
  );
}
