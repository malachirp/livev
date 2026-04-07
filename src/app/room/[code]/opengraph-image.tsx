import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const alt = 'LIVE V — Mini Fantasy Football';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: { code: string } }) {
  const room = await prisma.room.findUnique({
    where: { code: params.code },
  });

  const home = room?.homeTeamName ?? 'Home';
  const away = room?.awayTeamName ?? 'Away';

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
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 32 }}>
          <span style={{ fontSize: 80, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
            LIVE
          </span>
          <span style={{ fontSize: 80, fontWeight: 900, color: '#00f5a0', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            V
          </span>
        </div>
        {/* Match */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: 'white' }}>
            {home}
          </span>
          <span style={{ fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
            vs
          </span>
          <span style={{ fontSize: 48, fontWeight: 800, color: 'white' }}>
            {away}
          </span>
        </div>
        {/* CTA */}
        <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
          Pick your 5-a-side fantasy team and compete live
        </span>
      </div>
    ),
    { ...size }
  );
}
