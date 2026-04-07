import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
          LIVE
        </span>
        <span style={{ fontSize: 64, fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.025em', lineHeight: 1, transform: 'skewX(-8deg)' }}>
          V
        </span>
      </div>
    ),
    { width: 400, height: 210 },
  );
}
