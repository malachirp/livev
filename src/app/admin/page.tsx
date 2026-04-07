'use client';

import { useState, useEffect } from 'react';

const DEFAULT_ADMIN_PASSWORD = 'admin';

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

interface Analytics {
  summary: {
    totalRooms: number;
    totalPlayers: number;
    totalPicks: number;
    uniqueFixtures: number;
    activeFixtures: number;
    finishedFixtures: number;
    avgPlayersPerGame: number;
    maxPlayersInGame: number;
  };
  dailyGames: { date: string; count: number }[];
  dailyPlayers: { date: string; count: number }[];
  weeklyGames: { date: string; total: number }[];
  weeklyPlayers: { date: string; total: number }[];
  topFixtures: { match: string; games: number }[];
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

// --- Chart components ---

function BarChart({ data, color = '#00f5a0', label }: { data: { date: string; count: number }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const chartH = 120;
  const barW = Math.max(4, Math.floor((100 / data.length) * 0.7));
  const gap = Math.max(1, Math.floor((100 / data.length) * 0.3));

  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-3 overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${data.length * (barW + gap)} ${chartH + 20}`} preserveAspectRatio="none">
          {data.map((d, i) => {
            const h = (d.count / max) * chartH;
            const x = i * (barW + gap);
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={chartH - h}
                  width={barW}
                  height={Math.max(h, 0.5)}
                  rx={1.5}
                  fill={d.count > 0 ? color : 'rgba(255,255,255,0.05)'}
                  opacity={d.count > 0 ? 0.8 : 1}
                />
                {/* Show label for every 7th day */}
                {i % 7 === 0 && (
                  <text
                    x={x + barW / 2}
                    y={chartH + 14}
                    textAnchor="middle"
                    fontSize="6"
                    fill="rgba(255,255,255,0.3)"
                  >
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

function LineChart({ data, color = '#00f5a0', label }: { data: { date: string; total: number }[]; color?: string; label: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  const w = 300;
  const h = 120;
  const padY = 10;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: padY + (h - 2 * padY) - ((d.total / max) * (h - 2 * padY)),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-3">
        <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path d={areaD} fill={`url(#grad-${label.replace(/\s/g, '')})`} />
          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
          {/* End point */}
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
          {/* Current value label */}
          <text
            x={points[points.length - 1].x - 5}
            y={points[points.length - 1].y - 8}
            fontSize="10"
            fill={color}
            fontWeight="bold"
            textAnchor="end"
          >
            {data[data.length - 1].total}
          </text>
          {/* Date labels */}
          {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d, idx) => {
            const i = idx === 0 ? 0 : idx === 1 ? Math.floor(data.length / 2) : data.length - 1;
            return (
              <text
                key={d.date}
                x={points[i].x}
                y={h + 14}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                fontSize="7"
                fill="rgba(255,255,255,0.3)"
              >
                {d.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="bg-charcoal/60 rounded-xl p-3 border border-white/5">
      <div className={`text-xl font-black ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

// --- Main page ---

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
  const [tab, setTab] = useState<'games' | 'analytics'>('games');

  // Check sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('livev_admin') === 'true') {
      const storedPw = sessionStorage.getItem('livev_admin_pw') || '';
      setAdminPassword(storedPw);
      setAuthenticated(true);
    }
  }, []);

  async function handleLogin() {
    try {
      const res = await fetch('/api/admin/rooms', {
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        setAuthenticated(true);
        setPasswordError(false);
        setAdminPassword(password);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('livev_admin', 'true');
          sessionStorage.setItem('livev_admin_pw', password);
        }
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    }
  }

  async function fetchRooms(pw?: string) {
    const authPw = pw || adminPassword;
    try {
      const res = await fetch('/api/admin/rooms', {
        headers: { 'x-admin-password': authPw },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRooms(data.rooms);
      setLoading(false);
    } catch {
      setError('Failed to load rooms');
      setLoading(false);
    }
  }

  async function fetchAnalytics(pw?: string) {
    const authPw = pw || adminPassword;
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'x-admin-password': authPw },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAnalytics(data);
    } catch {
      // Silently fail — analytics is non-critical
    }
  }

  useEffect(() => {
    if (authenticated && adminPassword) {
      fetchRooms(adminPassword);
      fetchAnalytics(adminPassword);
    }
  }, [authenticated, adminPassword]);

  // Auto-refresh when returning to the page
  useEffect(() => {
    if (!authenticated || !adminPassword) return;
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchRooms(adminPassword);
        fetchAnalytics(adminPassword);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [authenticated, adminPassword]);

  async function handleDelete(roomId: string, roomCode: string) {
    if (!confirm(`Delete game ${roomCode}? This cannot be undone.`)) return;
    setDeleting(roomId);
    try {
      const res = await fetch(`/api/admin/rooms?id=${roomId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch {
      alert('Failed to delete room');
    } finally {
      setDeleting(null);
    }
  }

  // Password gate
  if (!authenticated) {
    return (
      <div className="flex flex-col flex-1 min-h-dvh items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-center gap-2 mb-8">
            <a href="/" className="flex items-baseline">
              <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
              <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
            </a>
            <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-1 rounded">ADMIN</span>
          </div>

          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
            placeholder="Enter admin password"
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl bg-charcoal text-white text-base font-medium placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/30 mb-3"
          />

          {passwordError && (
            <p className="text-live-red text-xs mb-3">Incorrect password</p>
          )}

          <button
            onClick={handleLogin}
            disabled={!password}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
              password
                ? 'bg-accent text-navy active:scale-[0.98]'
                : 'bg-charcoal text-white/30 cursor-not-allowed'
            }`}
          >
            Log In
          </button>
        </div>
      </div>
    );
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
            onClick={() => { setLoading(true); fetchRooms(adminPassword); fetchAnalytics(adminPassword); }}
            className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
          >
            Refresh
          </button>
        </div>
        {/* Tabs */}
        <div className="flex px-4 gap-1 pb-2">
          <button
            onClick={() => setTab('games')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'games' ? 'bg-accent/20 text-accent' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'analytics' ? 'bg-accent/20 text-accent' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Analytics
          </button>
        </div>
      </header>

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

      {/* Games tab */}
      {!loading && !error && tab === 'games' && (
        <>
          {/* Filter bar */}
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

          {/* Room list */}
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

                  <div className="flex items-center gap-4 text-[11px] text-white/40 mb-3">
                    <span>Code: <span className="font-mono text-white/60">{room.code}</span></span>
                    <span>{room.playerCount} player{room.playerCount !== 1 ? 's' : ''}</span>
                    <span>{formatDate(room.matchDate)}</span>
                  </div>

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
        </>
      )}

      {/* Analytics tab */}
      {!loading && !error && tab === 'analytics' && (
        <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto pb-8">
          {!analytics ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div>
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Overview</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard value={analytics.summary.totalRooms} label="Total Games" accent />
                  <StatCard value={analytics.summary.totalPlayers} label="Total Players" accent />
                  <StatCard value={analytics.summary.uniqueFixtures} label="Unique Fixtures" />
                  <StatCard value={analytics.summary.activeFixtures} label="Live Now" />
                  <StatCard value={analytics.summary.avgPlayersPerGame} label="Avg Players/Game" />
                  <StatCard value={analytics.summary.maxPlayersInGame} label="Most in One Game" />
                  <StatCard value={analytics.summary.totalPicks} label="Total Picks Made" />
                  <StatCard value={analytics.summary.finishedFixtures} label="Completed Fixtures" />
                </div>
              </div>

              {/* Daily activity (last 30 days) */}
              <BarChart data={analytics.dailyGames} color="#00f5a0" label="Games Created (Last 30 Days)" />
              <BarChart data={analytics.dailyPlayers} color="#60a5fa" label="Players Joined (Last 30 Days)" />

              {/* Cumulative growth */}
              {analytics.weeklyGames.length >= 2 && (
                <LineChart data={analytics.weeklyGames} color="#00f5a0" label="Total Games (Cumulative)" />
              )}
              {analytics.weeklyPlayers.length >= 2 && (
                <LineChart data={analytics.weeklyPlayers} color="#60a5fa" label="Total Players (Cumulative)" />
              )}

              {/* Top fixtures */}
              {analytics.topFixtures.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Most Popular Fixtures</h4>
                  <div className="bg-charcoal/40 rounded-xl p-3 space-y-1.5">
                    {analytics.topFixtures.map((f, i) => {
                      const maxGames = analytics.topFixtures[0].games;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-white/30 w-4 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white/80 truncate">{f.match}</span>
                              <span className="text-[10px] font-bold text-accent flex-shrink-0">{f.games} game{f.games !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="mt-0.5 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent/40"
                                style={{ width: `${(f.games / maxGames) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
