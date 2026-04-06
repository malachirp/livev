'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function HelpModal({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) {
      currentTranslateY.current = dy;
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (currentTranslateY.current > 100) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0)';
      sheetRef.current.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
      }, 200);
    }
    dragStartY.current = null;
    currentTranslateY.current = 0;
  };

  return (
    <div className="fixed inset-0 z-[999] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sheet"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative bg-navy border-t border-white/10 rounded-t-3xl animate-slide-up max-h-[85vh] overflow-y-auto"
      >
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pb-8">
          <h2 className="text-lg font-black text-white mb-1">How to Play</h2>
          <p className="text-xs text-white/40 mb-4">
            Pick 5 players, watch them score live, beat your mates.
          </p>

          <div className="space-y-4">
            {/* How it works */}
            <div>
              <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">The Game</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Pick a real match, build a 5-a-side dream team (1 GK, 1 DEF, 2 MID, 1 FWD),
                choose a captain for 2x points, then share the link and challenge your friends.
                Points update live as the match plays out. Max 3 players from one team.
              </p>
            </div>

            {/* Scoring */}
            <div>
              <h3 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Scoring</h3>
              <div className="space-y-0.5">
                <ScoreRow label="Appearance" value="+2" />
                <ScoreRow label="Goal" value="+10" />
                <ScoreRow label="Assist" value="+6" />
                <ScoreRow label="Shot on Target" value="+1" />
                <ScoreRow label="Key Pass" value="+1" />
                <ScoreRow label="Tackle" value="+1" />
                <ScoreRow label="Interception" value="+1" />
                <ScoreRow label="Successful Dribble" value="+1" />
                <ScoreRow label="Save (GK)" value="+1" />
                <ScoreRow label="Clean Sheet (GK)" value="+6" />
                <ScoreRow label="Clean Sheet (DEF)" value="+4" />
                <ScoreRow label="Penalty Save" value="+6" />
                <ScoreRow label="Win Bonus" value="+2" />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-live-red uppercase tracking-wider mb-2">Deductions</h3>
              <div className="space-y-0.5">
                <ScoreRow label="Foul Committed" value="-1" negative />
                <ScoreRow label="Goals Conceded 3+ (GK)" value="-2" negative />
                <ScoreRow label="Yellow Card" value="-2" negative />
                <ScoreRow label="Red Card" value="-4" negative />
                <ScoreRow label="Own Goal" value="-4" negative />
                <ScoreRow label="Penalty Miss" value="-4" negative />
                <ScoreRow label="Loss Penalty" value="-2" negative />
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Good to know</h3>
              <ul className="text-xs text-white/40 space-y-1.5 list-disc list-inside">
                <li>Clean sheets, goals conceded, and win/loss bonuses are awarded at full time</li>
                <li>Everything else updates live during the match</li>
                <li>Captain gets 2x total points</li>
                <li>Teams lock 5 minutes before kick off — no edits after that</li>
                <li>Other players&apos; teams are hidden until lock, then everyone&apos;s picks are revealed</li>
                <li>For smaller fixtures, some detailed stats (tackles, dribbles etc.) may not be available — the basics like goals and assists will always work</li>
              </ul>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 rounded-2xl font-bold text-sm bg-charcoal text-white/70 active:scale-[0.98] transition-all border border-white/10"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-charcoal text-white/60 hover:text-white transition-colors text-sm font-black"
        aria-label="How to play"
      >
        ?
      </button>

      {open && mounted && createPortal(
        <HelpModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

function ScoreRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 px-3 rounded bg-charcoal/40">
      <span className="text-[11px] text-white/60">{label}</span>
      <span className={`text-[11px] font-bold ${negative ? 'text-live-red' : 'text-accent'}`}>{value}</span>
    </div>
  );
}
