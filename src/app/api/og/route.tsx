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

// Canvas 1000x525 (1.9:1). Crests are deliberately huge — ~415px each — so they
// fill the frame and read large in WhatsApp/iMessage previews.
const W = 1000;
const H = 525;
const LOGO = 415;

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
        const logoTop = 78;
        const logoCenterY = logoTop + LOGO / 2;

        return new ImageResponse(
          (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              position: 'relative', overflow: 'hidden',
              background: '#080b14',
            }}>
              {/* Home colour glow — left */}
              <div style={{
                position: 'absolute', left: -120, top: -80, width: 640, height: 685,
                background: `radial-gradient(ellipse at center, ${hc.primary}40 0%, ${hc.primary}14 45%, transparent 72%)`,
                display: 'flex',
              }} />
              {/* Away colour glow — right */}
              <div style={{
                position: 'absolute', right: -120, top: -80, width: 640, height: 685,
                background: `radial-gradient(ellipse at center, ${ac.primary}40 0%, ${ac.primary}14 45%, transparent 72%)`,
                display: 'flex',
              }} />

              {/* Soft central light seam */}
              <div style={{
                position: 'absolute', left: W / 2 - 60, top: 0, width: 120, height: H,
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, transparent 70%)',
                display: 'flex',
              }} />

              {/* Vignette */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(180deg, rgba(8,11,20,0.55) 0%, transparent 22%, transparent 78%, rgba(8,11,20,0.65) 100%)',
                display: 'flex',
              }} />

              {/* Home crest — huge */}
              {room.homeTeamLogo && (
                <img src={room.homeTeamLogo} width={LOGO} height={LOGO} style={{
                  position: 'absolute', left: 28, top: logoTop, objectFit: 'contain',
                }} />
              )}
              {/* Away crest — huge */}
              {room.awayTeamLogo && (
                <img src={room.awayTeamLogo} width={LOGO} height={LOGO} style={{
                  position: 'absolute', left: W - 28 - LOGO, top: logoTop, objectFit: 'contain',
                }} />
              )}

              {/* VS badge — clean circle on the seam */}
              <div style={{
                position: 'absolute', left: W / 2 - 46, top: logoCenterY - 46,
                width: 92, height: 92, borderRadius: 92,
                background: 'rgba(8,11,20,0.82)',
                border: '3px solid rgba(255,255,255,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'Inter', fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                  VS
                </span>
              </div>

              {/* LIVE V wordmark — top centre */}
              <div style={{
                position: 'absolute', top: 22, left: 0, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'Inter', fontSize: 38, fontWeight: 900, color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>
                  LIVE
                </span>
                <span style={{ fontFamily: 'InterItalic', fontSize: 38, fontWeight: 900, color: '#00f5a0', letterSpacing: '-1px', lineHeight: 1, fontStyle: 'italic' }}>
                  V
                </span>
              </div>
            </div>
          ),
          { width: W, height: H, fonts: FONTS },
        );
      }
    } catch {
      // Fall through to default
    }
  }

  // Default: generic LiveV OG image
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
