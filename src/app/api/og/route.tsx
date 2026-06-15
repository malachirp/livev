import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/db';
import { getTeamColours } from '@/lib/team-colours';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const interBlack = readFileSync(join(process.cwd(), 'public/fonts/inter-latin-900-normal.woff'));
const interBlackItalic = readFileSync(join(process.cwd(), 'public/fonts/inter-latin-900-italic.woff'));

const FONTS = [
  { name: 'Inter', data: interBlack, weight: 900 as const, style: 'normal' as const },
  { name: 'InterItalic', data: interBlackItalic, weight: 900 as const, style: 'italic' as const },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const room = await prisma.room.findUnique({
      where: { code },
      select: { homeTeamName: true, awayTeamName: true, homeTeamLogo: true, awayTeamLogo: true, homeTeamId: true, awayTeamId: true },
    });

    if (room) {
      const homeColours = getTeamColours(room.homeTeamId, room.homeTeamName);
      const awayColours = getTeamColours(room.awayTeamId, room.awayTeamName);

      return new ImageResponse(
        (
          <div
            style={{
              background: '#0f172a',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Colour wash from each team */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              background: `linear-gradient(135deg, ${homeColours.primary}25 0%, transparent 40%, transparent 60%, ${awayColours.primary}25 100%)`,
            }} />

            {/* LIVE V branding at top */}
            <div style={{ display: 'flex', marginBottom: 40 }}>
              <span style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
                LIVE
              </span>
              <span style={{ fontFamily: 'InterItalic', fontSize: 32, fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.025em', lineHeight: 1, fontStyle: 'italic' }}>
                V
              </span>
            </div>

            {/* Teams row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 40,
            }}>
              {/* Home team */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {room.homeTeamLogo && (
                  <img src={room.homeTeamLogo} width={80} height={80} style={{ objectFit: 'contain' }} />
                )}
                <span style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 140 }}>
                  {room.homeTeamName}
                </span>
              </div>

              {/* VS */}
              <span style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>
                vs
              </span>

              {/* Away team */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {room.awayTeamLogo && (
                  <img src={room.awayTeamLogo} width={80} height={80} style={{ objectFit: 'contain' }} />
                )}
                <span style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 140 }}>
                  {room.awayTeamName}
                </span>
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 630, fonts: FONTS },
      );
    }
  }

  // Default: generic LiveV OG image
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
    { width: 1200, height: 630, fonts: FONTS },
  );
}
