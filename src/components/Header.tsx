'use client';

import Link from 'next/link';
import HelpButton from './HelpButton';
import HomeButton from './HomeButton';
import ShareButton from './ShareButton';
import { track } from '@/lib/track';

export default function Header({ showBack, backHref }: { showBack?: boolean; backHref?: string }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-navy/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
      <div className="flex items-center gap-2">
        {showBack && backHref && (
          <Link
            href={backHref}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-charcoal text-white/70 hover:text-white transition-colors mr-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        <Link href="/" onClick={() => track('logo_clicked')} className="flex items-baseline">
          <span className="text-2xl font-black tracking-tight text-white">LIVE</span>
          <span className="text-2xl font-black tracking-tight text-accent italic">V</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ShareButton roomCode="" />
        <HelpButton />
        <HomeButton />
      </div>
    </header>
  );
}
