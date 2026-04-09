'use client';

import { useRouter, usePathname } from 'next/navigation';
import { track } from '@/lib/track';

export default function HomeButton() {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    track('home_button_clicked');
    if (pathname === '/') {
      router.refresh();
    } else {
      router.push('/');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 flex items-center justify-center rounded-full bg-charcoal text-white/60 hover:text-white transition-colors"
      aria-label="Home"
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
      </svg>
    </button>
  );
}
