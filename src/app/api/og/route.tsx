import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET() {
  // Load Inter Black (900) for the logo — without this, Satori uses a default
  // font that doesn't match the website's font-black weight
  const interBlack = await fetch(
    'https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ90OcKqm3.woff2'
  ).then(res => res.arrayBuffer());

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
        <span style={{ fontSize: 64, fontFamily: 'Inter', fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
          LIVE
        </span>
        <span style={{ fontSize: 64, fontFamily: 'Inter', fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.025em', lineHeight: 1, fontStyle: 'italic', transform: 'skewX(-8deg)' }}>
          V
        </span>
      </div>
    ),
    {
      width: 400,
      height: 210,
      fonts: [
        {
          name: 'Inter',
          data: interBlack,
          weight: 900,
          style: 'normal',
        },
      ],
    },
  );
}
