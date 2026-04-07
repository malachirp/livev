import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'LIVE V — Mini Fantasy Football';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 24 }}>
          <span style={{ fontSize: 120, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
            LIVE
          </span>
          <span style={{ fontSize: 120, fontWeight: 900, color: '#00f5a0', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            V
          </span>
        </div>
        {/* Tagline */}
        <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
          Pick 5 players. Watch them score live. Beat your mates.
        </span>
      </div>
    ),
    { ...size }
  );
}
