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

const BOLT = 'M 210 0 L 182 30 L 222 58 L 172 92 L 228 122 L 176 154 L 218 184 L 190 210';
const BOLT_FILL = `${BOLT} L 400 210 L 400 0 Z`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const room = await prisma.room.findUnique({
        where: { code },
        select: { homeTeamLogo: true, awayTeamLogo: true, homeTeamId: true, awayTeamId: true, homeTeamName: true, awayTeamName: true },
      });

      if (room) {
        const hc = getTeamColours(room.homeTeamId, room.homeTeamName);
        const ac = getTeamColours(room.awayTeamId, room.awayTeamName);

        return new ImageResponse(
          (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              position: 'relative', overflow: 'hidden',
              background: hc.primary,
            }}>
              {/* Away half with lightning bolt edge */}
              <svg width="400" height="210" viewBox="0 0 400 210" style={{ position: 'absolute', top: 0, left: 0 }}>
                <path d={BOLT_FILL} fill={ac.primary} />
                <path d={BOLT} stroke="rgba(255,255,255,0.08)" strokeWidth="14" fill="none" />
                <path d={BOLT} stroke="rgba(255,255,255,0.25)" strokeWidth="5" fill="none" />
                <path d={BOLT} stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" fill="none" />
              </svg>

              {/* Edge darkening */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.2) 100%)',
                display: 'flex',
              }} />

              {/* Home logo — big, filling left half */}
              {room.homeTeamLogo && (
                <img src={room.homeTeamLogo} width={160} height={160} style={{
                  position: 'absolute', left: 12, top: 25, objectFit: 'contain',
                }} />
              )}

              {/* Away logo — big, filling right half */}
              {room.awayTeamLogo && (
                <img src={room.awayTeamLogo} width={160} height={160} style={{
                  position: 'absolute', left: 228, top: 25, objectFit: 'contain',
                }} />
              )}

              {/* LIVE V badge — centered on the bolt */}
              <div style={{
                position: 'absolute', left: 160, top: 80,
                width: 80, height: 50,
                background: 'rgba(15, 23, 42, 0.92)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
                  LIVE
                </span>
                <span style={{ fontFamily: 'InterItalic', fontSize: 18, fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.025em', lineHeight: 1, fontStyle: 'italic' }}>
                  V
                </span>
              </div>
            </div>
          ),
          { width: 400, height: 210, fonts: FONTS },
        );
      }
    } catch {
      // Fall through to default
    }
  }

  return new ImageResponse(
    (
      <div style={{
        background: '#0f172a', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Inter', fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-0.025em', lineHeight: 1 }}>
          LIVE
        </span>
        <span style={{ fontFamily: 'InterItalic', fontSize: 64, fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.025em', lineHeight: 1, fontStyle: 'italic' }}>
          V
        </span>
      </div>
    ),
    { width: 400, height: 210, fonts: FONTS },
  );
}
