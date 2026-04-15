'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@/lib/track';

function ContactModal({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);
  const [copied, setCopied] = useState(false);

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

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('hello@livev.app');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sheet"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative bg-navy border-t border-white/10 rounded-t-3xl animate-slide-up"
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
          <h2 className="text-lg font-black text-white mb-1">Get in touch</h2>
          <p className="text-xs text-white/40 mb-5">
            Questions, bugs, or feedback — we&apos;d love to hear from you.
          </p>

          <div className="space-y-2">
            {/* Email */}
            <a
              href="mailto:hello@livev.app"
              onClick={() => track('contact_email_clicked')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-charcoal/60 hover:bg-charcoal/80 active:scale-[0.98] transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f5a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Email</div>
                <div className="text-sm font-semibold text-white truncate">hello@livev.app</div>
              </div>
            </a>

            {/* Copy email */}
            <button
              onClick={copyEmail}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-charcoal/60 hover:bg-charcoal/80 active:scale-[0.98] transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">
                  {copied ? 'Copied!' : 'Copy email address'}
                </div>
              </div>
            </button>

            {/* Twitter / X */}
            <a
              href="https://twitter.com/LIVEV_APP"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('contact_twitter_clicked')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-charcoal/60 hover:bg-charcoal/80 active:scale-[0.98] transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">X / Twitter</div>
                <div className="text-sm font-semibold text-white truncate">@LIVEV_APP</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 flex-shrink-0">
                <path d="M7 17L17 7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 rounded-2xl font-bold text-sm bg-charcoal text-white/70 active:scale-[0.98] transition-all border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        onClick={() => { track('contact_opened'); setOpen(true); }}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-charcoal text-white/60 hover:text-white transition-colors"
        aria-label="Contact us"
      >
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <ContactModal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}
