'use client';

import { useState, useEffect } from 'react';

interface AdminRoom {
  id: string;
  code: string;
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  venue: string | null;
  matchDate: string;
  createdAt: string;
  playerCount: number;
  players: { id: string; displayName: string; totalPoints: number; isCreator: boolean }[];
  matchStatus: string;
  homeScore: number | null;
  awayScore: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NS: { label: 'Not Started', color: 'bg-blue-500/20 text-blue-400' },
  '1H': { label: '1st Half', color: 'bg-green-500/20 text-green-400' },
  HT: { label: 'Half Time', color: 'bg-yellow-500/20 text-yellow-400' },
  '2H': { label: '2nd Half', color: 'bg-green-500/20 text-green-400' },
  ET: { label: 'Extra Time', color: 'bg-green-500/20 text-green-400' },
  FT: { label: 'Full Time', color: 'bg-white/10 text-white/50' },
  AET: { label: 'After ET', color: 'bg-white/10 text-white/50' },
  PEN: { label: 'Penalties', color: 'bg-white/10 text-white/50' },
  PST: { label: 'Postponed', color: 'bg-red-500/20 text-red-400' },
  CANC: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
  LIVE: { label: 'Live', color: 'bg-green-500/20 text-green-400' },
};

function getStatusDisplay(status: string) {
  return STATUS_LABELS[status] || { label: status, color: 'bg-white/10 text-white/40' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPage() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');

  async function fetchRooms() {
    try {
      const res = await fetch('/api/admin/rooms');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRooms(data.rooms);
      setLoading(false);
    } catch {
      setError('Failed to load rooms');
      setLoading(false);
    }
  }

  useEffect(() => { fetchRooms(); }, []);

  async function handleDelete(roomId: string, roomCode: string) {
    if (!confirm(`Delete game ${roomCode}? This cannot be undone.`)) return;
    setDeleting(roomId);
    try {
      const res = await fetch(`/api/admin/rooms?id=${roomId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch {
      alert('Failed to delete room');
    } finally {
      setDeleting(null);
    }
  }

  const filteredRooms = rooms.filter(room => {
    if (filter === 'upcoming') return room.matchStatus === 'NS';
    if (filter === 'live') return ['1H', 'HT', '2H', 'ET', 'LIVE'].includes(room.matchStatus);
    if (filter === 'finished') return ['FT', 'AET', 'PEN'].includes(room.matchStatus);
    return true;
  });

  const counts = {
    all: rooms.length,
    upcoming: rooms.filter(r => r.matchStatus === 'NS').length,
    live: rooms.filter(r => ['1H', 'HT', '2H', 'ET', 'LIVE'].includes(r.matchStatus)).length,
    finished: rooms.filter(r => ['FT', 'AET', 'PEN'].includes(r.matchStatus)).length,
  };

  return (
    <div className="flex flex-col flex-1 min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-baseline">
              <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
              <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
            </a>
            <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-1 rounded">ADMIN</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchRooms(); }}
            className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'live', label: 'Live' },
              { key: 'finished', label: 'Finished' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`py-2 rounded-lg text-center transition-all ${
                filter === key
                  ? 'bg-accent/20 text-accent ring-1 ring-accent/30'
                  : 'bg-charcoal text-white/50 hover:bg-charcoal/80'
              }`}
            >
              <div className="text-lg font-black">{counts[key]}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-live-red text-sm">{error}</p>
        </div>
      )}

      {/* Room list */}
      {!loading && !error && (
        <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto pb-8">
          {filteredRooms.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-white/40 text-sm">No games found</p>
            </div>
          )}

          {filteredRooms.map(room => {
            const statusDisplay = getStatusDisplay(room.matchStatus);
            const isDeleting = deleting === room.id;

            return (
              <div
                key={room.id}
                className="bg-charcoal/60 rounded-xl p-4 border border-white/5"
              >
                {/* Top row: teams + status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {room.homeTeamLogo && (
                      <img src={room.homeTeamLogo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                    )}
                    <span className="text-sm font-bold text-white truncate">
                      {room.homeTeamName}
                    </span>
                    {room.homeScore !== null && room.awayScore !== null && (
                      <span className="text-sm font-black text-accent mx-1">
                        {room.homeScore} - {room.awayScore}
                      </span>
                    )}
                    <span className="text-sm font-bold text-white truncate">
                      {room.awayTeamName}
                    </span>
                    {room.awayTeamLogo && (
                      <img src={room.awayTeamLogo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${statusDisplay.color}`}>
                    {statusDisplay.label}
                  </span>
                </div>

                {/* Info row */}
                <div className="flex items-center gap-4 text-[11px] text-white/40 mb-3">
                  <span>Code: <span className="font-mono text-white/60">{room.code}</span></span>
                  <span>{room.playerCount} player{room.playerCount !== 1 ? 's' : ''}</span>
                  <span>{formatDate(room.matchDate)}</span>
                </div>

                {/* Players */}
                {room.players.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {room.players.map(p => (
                      <span
                        key={p.id}
                        className="text-[10px] font-medium text-white/50 bg-navy/60 px-2 py-0.5 rounded-full"
                      >
                        {p.displayName}
                        {p.isCreator && <span className="text-accent/60 ml-1">host</span>}
                        {p.totalPoints !== 0 && (
                          <span className={`ml-1 ${p.totalPoints > 0 ? 'text-accent' : 'text-live-red'}`}>
                            {p.totalPoints > 0 ? '+' : ''}{p.totalPoints}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={`/room/${room.code}`}
                    className="text-[11px] font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(room.id, room.code)}
                    disabled={isDeleting}
                    className="text-[11px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
