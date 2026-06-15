import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: '#1a8f3c',
        'pitch-dark': '#14702e',
        navy: '#0f172a',
        charcoal: '#1e293b',
        'charcoal-light': '#334155',
        accent: '#22c55e',
        'accent-bright': '#4ade80',
        'live-red': '#ef4444',
        'points-gold': '#fbbf24',
      },
      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'score-pop': 'score-pop 0.4s ease-out',
        'flash-hint': 'flash-hint 2s ease-in-out forwards',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'score-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'flash-hint': {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '15%': { opacity: '1', transform: 'translateY(0)' },
          '75%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
