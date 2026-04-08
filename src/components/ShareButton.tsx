'use client';

import { useState } from 'react';
import { track } from '@/lib/track';

export default function ShareButton({ roomCode, matchTitle }: { roomCode: string; matchTitle?: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    track('share_clicked', { roomCode });
    const url = roomCode ? `${window.location.origin}/room/${roomCode}` : window.location.origin;

    if (navigator.share) {
      try {
        // Only share the URL — WhatsApp/Twitter pull title + description + image
        // from the OG meta tags. Sending text/title here creates duplicate content
        // outside the link preview card.
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled or share not supported, fall through to copy
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal text-white/70 hover:text-white transition-all text-sm font-semibold"
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
