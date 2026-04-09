'use client';

import { useState, useEffect } from 'react';
import HomeButton from '@/components/HomeButton';

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
    totalGames: number;
    totalPlayers: number;
    avgPlayersPerGame: number;
    gamesThisWeek: number;
  };
  dailyGames: { date: string; count: number }[];
  cumulativeUsers: { date: string; total: number }[];
  deepDive?: DeepDive;
}

interface DeepDive {
  hasEventData: boolean;
  eventCounts: Record<string, number>;
  dailyVisitors: { date: string; count: number }[];
  pageViews: { page: string; count: number }[];
  hourlyActivity: { hour: number; count: number }[];
  conversionFunnel: { step: string; label: string; description: string; count: number }[];
  returnRate: number;
  uniqueVisitors: number;
  leagueBreakdown: { leagueName: string; count: number }[];
  entryTypes: { type: string; count: number }[];
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

// ── Chart components ──

function BarChart({ data, color = '#00f5a0', label }: { data: { date: string; count: number }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const padL = 28;
  const padR = 8;
  const padT = 16;
  const padB = 18;
  const chartW = 280;
  const chartH = 100;
  const totalW = padL + chartW + padR;
  const totalH = padT + chartH + padB;
  const barW = (chartW / data.length) * 0.7;
  const step = chartW / data.length;

  const yTicks = max <= 3 ? [0, 1, 2, 3].filter(v => v <= max) : [0, Math.round(max / 2), max];

  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-3">
        <svg width="100%" viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="xMidYMid meet">
          {yTicks.map(v => {
            const y = padT + chartH - (v / max) * chartH;
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.3)">{v}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = (d.count / max) * chartH;
            const x = padL + i * step + (step - barW) / 2;
            return (
              <g key={d.date}>
                <rect
                  x={x} y={padT + chartH - h} width={barW} height={Math.max(h, 0.5)}
                  rx={1.5} fill={d.count > 0 ? color : 'rgba(255,255,255,0.05)'} opacity={d.count > 0 ? 0.8 : 1}
                />
                {i % 7 === 0 && (
                  <text x={x + barW / 2} y={padT + chartH + 12} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.3)">
                    {d.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function LineChart({ data, color = '#00f5a0', label }: { data: { date: string; total: number }[]; color?: string; label: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  const padL = 32;
  const padR = 12;
  const padT = 20;
  const padB = 18;
  const chartW = 260;
  const chartH = 100;
  const totalW = padL + chartW + padR;
  const totalH = padT + chartH + padB;

  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - ((d.total / max) * chartH),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${padL + chartW} ${padT + chartH} L ${padL} ${padT + chartH} Z`;

  const yTicks = [0, Math.round(max / 2), max];

  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-3">
        <svg width="100%" viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map(v => {
            const y = padT + chartH - (v / max) * chartH;
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.3)">{v}</text>
              </g>
            );
          })}
          <path d={areaD} fill={`url(#grad-${label.replace(/\s/g, '')})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
          <text
            x={points[points.length - 1].x} y={points[points.length - 1].y - 8}
            fontSize="9" fill={color} fontWeight="bold" textAnchor="middle"
          >
            {data[data.length - 1].total}
          </text>
          <text x={padL} y={padT + chartH + 14} textAnchor="start" fontSize="7" fill="rgba(255,255,255,0.3)">
            {data[0].date.slice(5)}
          </text>
          <text x={padL + chartW} y={padT + chartH + 14} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.3)">
            {data[data.length - 1].date.slice(5)}
          </text>
        </svg>
      </div>
    </div>
  );
}

function StatCard({ value, label, description, accent }: { value: string | number; label: string; description: string; accent?: boolean }) {
  return (
    <div className="bg-charcoal/60 rounded-xl p-3 border border-white/5" title={description}>
      <div className={`text-xl font-black ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
      <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{description}</div>
    </div>
  );
}

// ── Deep dive chart: horizontal bar ──

function HorizontalBar({ data, color = '#00f5a0', label }: { data: { label: string; value: number; description?: string }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-4 space-y-2">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-white/70" title={d.description}>{d.label}</span>
              <span className="text-xs font-bold" style={{ color }}>{d.value.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color, opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hourly heatmap ──

function HourlyChart({ data, label }: { data: { hour: number; count: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-4">
        <div className="flex gap-[2px] items-end h-16">
          {data.map(d => (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max((d.count / max) * 56, 2)}px`,
                  backgroundColor: d.count > 0 ? `rgba(0,245,160,${0.2 + (d.count / max) * 0.6})` : 'rgba(255,255,255,0.03)',
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-white/25">00:00</span>
          <span className="text-[8px] text-white/25">06:00</span>
          <span className="text-[8px] text-white/25">12:00</span>
          <span className="text-[8px] text-white/25">18:00</span>
          <span className="text-[8px] text-white/25">23:00</span>
        </div>
        <p className="text-[9px] text-white/25 mt-1 text-center">Hour of day (UTC)</p>
      </div>
    </div>
  );
}

// ── Funnel chart ──

function FunnelChart({ data, label }: { data: { label: string; description: string; count: number }[]; label: string }) {
  if (data.length === 0) return null;
  const max = data[0].count || 1;
  return (
    <div>
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{label}</h4>
      <div className="bg-charcoal/40 rounded-xl p-4 space-y-1">
        {data.map((d, i) => {
          const pct = max > 0 ? Math.round((d.count / max) * 100) : 0;
          return (
            <div key={i} title={d.description}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-white/70">{d.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-accent">{d.count.toLocaleString()}</span>
                  {i > 0 && <span className="text-[10px] text-white/30">{pct}%</span>}
                </div>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/50 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {d.description && (
                <p className="text-[9px] text-white/20 mt-0.5">{d.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [deepDive, setDeepDive] = useState<DeepDive | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
  const [tab, setTab] = useState<'games' | 'analytics'>('games');
  const [visibleCount, setVisibleCount] = useState(20);

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
      // Silently fail
    }
  }

  async function fetchDeepDive() {
    setLoadingDeepDive(true);
    try {
      const res = await fetch('/api/admin/analytics?deepdive=1', {
        headers: { 'x-admin-password': adminPassword },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDeepDive(data.deepDive || null);
    } catch {
      // Silently fail
    } finally {
      setLoadingDeepDive(false);
    }
  }

  useEffect(() => {
    if (authenticated && adminPassword) {
      fetchRooms(adminPassword);
      fetchAnalytics(adminPassword);
    }
  }, [authenticated, adminPassword]);

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
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const visibleRooms = filteredRooms.slice(0, visibleCount);
  const hasMore = filteredRooms.length > visibleCount;

  const counts = {
    all: rooms.length,
    upcoming: rooms.filter(r => r.matchStatus === 'NS').length,
    live: rooms.filter(r => ['1H', 'HT', '2H', 'ET', 'LIVE'].includes(r.matchStatus)).length,
    finished: rooms.filter(r => ['FT', 'AET', 'PEN'].includes(r.matchStatus)).length,
  };

  const PAGE_LABELS: Record<string, string> = {
    '/': 'Homepage',
    '/room/[code]': 'Game Room',
    '/room/[code]/pick': 'Pick Team',
    '/admin': 'Admin',
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); fetchRooms(adminPassword); fetchAnalytics(adminPassword); }}
              className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
            >
              Refresh
            </button>
            <HomeButton />
          </div>
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
                  onClick={() => { setFilter(key); setVisibleCount(20); }}
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

            {visibleRooms.map(room => {
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

            {hasMore && (
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="w-full py-3 rounded-xl font-bold text-sm bg-charcoal text-white/50 active:scale-[0.98] transition-all border border-white/10 hover:border-white/20 hover:text-white/70"
              >
                Load More ({filteredRooms.length - visibleCount} remaining)
              </button>
            )}
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
              {/* ── Headline metrics: 4 cards ── */}
              <div>
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Overview</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    value={analytics.summary.totalGames}
                    label="Total Games"
                    description="Total game rooms created (not unique creators)"
                    accent
                  />
                  <StatCard
                    value={analytics.summary.totalPlayers}
                    label="Total Entries"
                    description="Total player entries across all games (one person joining 3 games = 3 entries)"
                    accent
                  />
                  <StatCard
                    value={analytics.summary.avgPlayersPerGame}
                    label="Avg Group Size"
                    description="Total player entries / total games"
                  />
                  <StatCard
                    value={analytics.summary.gamesThisWeek}
                    label="Games This Week"
                    description="Games created in the last 7 days"
                  />
                </div>
              </div>

              {/* ── Chart 1: Daily game activity ── */}
              <BarChart
                data={analytics.dailyGames}
                color="#00f5a0"
                label="New Games per Day (Last 30 Days)"
              />

              {/* ── Chart 2: Cumulative user growth ── */}
              {analytics.cumulativeUsers.length >= 2 && (
                <LineChart
                  data={analytics.cumulativeUsers}
                  color="#60a5fa"
                  label="Total Users Over Time (Cumulative, Weekly)"
                />
              )}

              {/* ── Deep Dive button ── */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!showDeepDive) {
                      setShowDeepDive(true);
                      if (!deepDive) fetchDeepDive();
                    } else {
                      setShowDeepDive(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-charcoal text-white/70 active:scale-[0.98] transition-all border border-white/10 hover:border-white/20"
                >
                  {showDeepDive ? 'Hide Deep Dive' : 'Deep Dive Analytics'}
                </button>
                {!showDeepDive && (
                  <p className="text-[10px] text-white/25 text-center mt-1">Detailed user behaviour analytics — best viewed on desktop</p>
                )}
              </div>

              {/* ── Deep Dive section ── */}
              {showDeepDive && (
                <div className="space-y-5 pt-2 border-t border-white/10">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-wider">Deep Dive Analytics</h3>
                  <p className="text-[10px] text-white/30 -mt-3">
                    Behaviour data from lightweight event tracking. &quot;Unique visitor&quot; = one browser with localStorage (persists across tabs &amp; sessions, but not across devices or incognito).
                  </p>

                  {loadingDeepDive ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    </div>
                  ) : !deepDive || !deepDive.hasEventData ? (
                    <div className="bg-charcoal/40 rounded-xl p-6 text-center">
                      <p className="text-white/40 text-sm font-semibold mb-1">No event data yet</p>
                      <p className="text-white/25 text-xs">
                        Event tracking starts collecting data after deploy. Check back after users have visited the site.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ── 1. Visitor overview ── */}
                      <div>
                        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Visitor Overview</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-accent">{(deepDive.uniqueVisitors || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Unique Visitors</div>
                            <div className="text-[8px] text-white/20">Distinct browser IDs (localStorage)</div>
                          </div>
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-accent">{deepDive.returnRate}%</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Return Rate</div>
                            <div className="text-[8px] text-white/20">Visitors who came back on a different day</div>
                          </div>
                        </div>
                      </div>

                      {/* ── 2. Event counts ── */}
                      <div>
                        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Event Counts (All Time)</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-white">{(deepDive.eventCounts.page_view || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Page Views</div>
                            <div className="text-[8px] text-white/20">Total page loads</div>
                          </div>
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-white">{(deepDive.eventCounts.share_clicked || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Shares</div>
                            <div className="text-[8px] text-white/20">Share button taps</div>
                          </div>
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-white">{(deepDive.eventCounts.help_opened || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Help Opens</div>
                            <div className="text-[8px] text-white/20">? button taps</div>
                          </div>
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-white">{(deepDive.eventCounts.logo_clicked || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Logo Clicks</div>
                            <div className="text-[8px] text-white/20">LIVE V logo → home</div>
                          </div>
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-white">{(deepDive.eventCounts.game_created || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Games Created</div>
                            <div className="text-[8px] text-white/20">Total (not unique)</div>
                          </div>
                          <div className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                            <div className="text-lg font-black text-white">{(deepDive.eventCounts.team_saved || 0).toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase">Teams Saved</div>
                            <div className="text-[8px] text-white/20">Includes edits</div>
                          </div>
                        </div>
                      </div>

                      {/* ── 3. Entry type: direct vs shared link ── */}
                      {deepDive.entryTypes.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">How Visitors Arrive (Unique Visitors)</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {deepDive.entryTypes.map(e => (
                              <div key={e.type} className="bg-charcoal/60 rounded-lg p-2.5 border border-white/5">
                                <div className="text-lg font-black text-white">{e.count.toLocaleString()}</div>
                                <div className="text-[9px] font-bold text-white/30 uppercase">
                                  {e.type === 'direct' ? 'Direct (Homepage)' : e.type === 'shared_link' ? 'Shared Link' : e.type}
                                </div>
                                <div className="text-[8px] text-white/20">
                                  {e.type === 'direct' ? 'Landed on homepage first' : 'Opened a game room link'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── 4. Daily unique visitors ── */}
                      <BarChart
                        data={deepDive.dailyVisitors}
                        color="#a78bfa"
                        label="Daily Unique Visitors (Last 30 Days)"
                      />

                      {/* ── 5. Conversion funnel ── */}
                      <FunnelChart
                        data={deepDive.conversionFunnel}
                        label="Conversion Funnel (All Time, Unique Visitors)"
                      />

                      {/* ── 6. Games per league ── */}
                      {deepDive.leagueBreakdown.length > 0 && (
                        <HorizontalBar
                          data={deepDive.leagueBreakdown.map(l => ({
                            label: l.leagueName,
                            value: l.count,
                          }))}
                          color="#f59e0b"
                          label="Games Created by League"
                        />
                      )}

                      {/* ── 7. Page views breakdown ── */}
                      <HorizontalBar
                        data={deepDive.pageViews.map(p => ({
                          label: PAGE_LABELS[p.page] || p.page,
                          value: p.count,
                          description: `Views of ${p.page}`,
                        }))}
                        color="#60a5fa"
                        label="Page Views by Page"
                      />

                      {/* ── 8. Hourly activity ── */}
                      <HourlyChart
                        data={deepDive.hourlyActivity}
                        label="Activity by Hour of Day (When Users Are Online)"
                      />

                      {/* ── Definitions ── */}
                      <div>
                        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Definitions</h4>
                        <div className="bg-charcoal/40 rounded-xl p-4 space-y-2 text-[10px] text-white/30 leading-relaxed">
                          <p><span className="text-white/50 font-bold">Unique Visitor:</span> Identified by a random ID stored in the browser&apos;s localStorage. Persists across tabs, page reloads, and browser restarts. However, a person using incognito mode, a different browser, or a different device will be counted as a separate visitor. There is no login system.</p>
                          <p><span className="text-white/50 font-bold">Return Rate:</span> % of unique visitors who visited on more than one calendar day.</p>
                          <p><span className="text-white/50 font-bold">Total Entries (headline):</span> Total player rows in the database — one person joining 3 separate games counts as 3 entries. Not deduplicated.</p>
                          <p><span className="text-white/50 font-bold">Avg Group Size (headline):</span> Total player entries divided by total games. Updates as new games and players are added.</p>
                          <p><span className="text-white/50 font-bold">Direct vs Shared Link:</span> &quot;Direct&quot; means they first loaded the homepage. &quot;Shared Link&quot; means they first loaded a /room/ page (from a friend&apos;s link).</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
