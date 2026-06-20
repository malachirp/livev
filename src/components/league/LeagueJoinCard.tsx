'use client';

import { useState } from 'react';

interface Props {
  leagueName: string;
  competitionName: string;
  memberCount: number;
  onJoined: () => void;
  code: string;
}

export default function LeagueJoinCard({ leagueName, competitionName, memberCount, onJoined, code }: Props) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!name.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      onJoined();
    } catch (err: any) {
      setError(err.message);
      setJoining(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-3">🏆</div>
        <h1 className="text-2xl font-black text-white mb-1">{leagueName}</h1>
        <p className="text-sm text-white/40 mb-1">{competitionName} · {memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
        <p className="text-xs text-white/30 mb-6">
          Join once and you&apos;ll be recognised in every game in this league — no re-entering your name.
        </p>

        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2 text-left">
          Your name
        </label>
        <input
          type="text"
          placeholder="Enter your display name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          autoFocus
          className="w-full px-4 py-3.5 rounded-xl bg-charcoal text-white text-base font-medium placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/30 mb-2"
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleJoin(); }}
        />
        {error && <p className="text-live-red text-xs mb-2 text-left">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={!name.trim() || joining}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all mt-2 ${
            name.trim() ? 'bg-accent text-navy active:scale-[0.98]' : 'bg-charcoal text-white/30 cursor-not-allowed'
          }`}
        >
          {joining ? 'Joining...' : 'Join League'}
        </button>
      </div>
    </div>
  );
}
