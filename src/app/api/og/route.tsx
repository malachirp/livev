import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

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
        <span style={{ fontSize: 140, fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
          LIVE
        </span>
        <span style={{ fontSize: 140, fontWeight: 900, color: '#00f5a0', fontStyle: 'italic', letterSpacing: '-0.025em', lineHeight: 1 }}>
          V
        </span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
