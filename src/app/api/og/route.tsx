import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Load fonts once at module level
const interBlack = readFileSync(join(process.cwd(), 'public/fonts/inter-latin-900-normal.woff'));
const interBlackItalic = readFileSync(join(process.cwd(), 'public/fonts/inter-latin-900-italic.woff'));

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
        <span style={{ fontFamily: 'Inter', fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
          LIVE
        </span>
        <span style={{ fontFamily: 'InterItalic', fontSize: 64, fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.025em', lineHeight: 1, fontStyle: 'italic' }}>
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
        {
          name: 'InterItalic',
          data: interBlackItalic,
          weight: 900,
          style: 'italic',
        },
      ],
    },
  );
}
