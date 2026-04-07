import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const home = searchParams.get('home');
  const away = searchParams.get('away');
  const hasMatch = home && away;

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
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: hasMatch ? 32 : 24 }}>
          <span style={{ fontSize: hasMatch ? 80 : 120, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
            LIVE
          </span>
          <span style={{ fontSize: hasMatch ? 80 : 120, fontWeight: 900, color: '#00f5a0', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            V
          </span>
        </div>

        {hasMatch ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: 'white' }}>
                {home}
              </span>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                vs
              </span>
              <span style={{ fontSize: 44, fontWeight: 800, color: 'white' }}>
                {away}
              </span>
            </div>
            <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Pick your 5-a-side fantasy team and compete live
            </span>
          </>
        ) : (
          <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Pick 5 players. Watch them score live. Beat your mates.
          </span>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
