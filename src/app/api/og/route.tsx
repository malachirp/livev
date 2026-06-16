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
              background: '#050810',
            }}>
              {/* Home team atmospheric glow */}
              <div style={{
                position: 'absolute', left: -60, top: -60, width: 520, height: 540,
                background: `radial-gradient(ellipse at center, ${hc.primary}38 0%, ${hc.primary}12 40%, transparent 70%)`,
                display: 'flex',
              }} />

              {/* Away team atmospheric glow */}
              <div style={{
                position: 'absolute', right: -60, top: -60, width: 520, height: 540,
                background: `radial-gradient(ellipse at center, ${ac.primary}38 0%, ${ac.primary}12 40%, transparent 70%)`,
                display: 'flex',
              }} />

              {/* Center focal glow */}
              <div style={{
                position: 'absolute', left: 250, top: 60, width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
                display: 'flex',
              }} />

              {/* Upper atmosphere */}
              <div style={{
                position: 'absolute', left: 200, top: -80, width: 400, height: 250,
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.025) 0%, transparent 70%)',
                display: 'flex',
              }} />

              {/* Diagonal light wash — left */}
              <div style={{
                position: 'absolute', left: 0, top: 0, width: 450, height: 420,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.015) 0%, transparent 50%)',
                display: 'flex',
              }} />

              {/* Diagonal light wash — right */}
              <div style={{
                position: 'absolute', right: 0, top: 0, width: 450, height: 420,
                background: 'linear-gradient(225deg, rgba(255,255,255,0.015) 0%, transparent 50%)',
                display: 'flex',
              }} />

              {/* Radiating energy lines from center */}
              <svg width="800" height="420" viewBox="0 0 800 420" style={{ position: 'absolute', top: 0, left: 0 }}>
                <line x1="400" y1="210" x2="-50" y2="-30" stroke="white" strokeWidth="35" opacity="0.006" />
                <line x1="400" y1="210" x2="850" y2="-30" stroke="white" strokeWidth="35" opacity="0.006" />
                <line x1="400" y1="210" x2="-50" y2="450" stroke="white" strokeWidth="35" opacity="0.006" />
                <line x1="400" y1="210" x2="850" y2="450" stroke="white" strokeWidth="35" opacity="0.006" />
                <line x1="400" y1="210" x2="-50" y2="210" stroke="white" strokeWidth="20" opacity="0.004" />
                <line x1="400" y1="210" x2="850" y2="210" stroke="white" strokeWidth="20" opacity="0.004" />
              </svg>

              {/* Energy divider — outer aura */}
              <div style={{
                position: 'absolute', left: 386, top: 0, width: 28, height: 420,
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.04) 15%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 85%, transparent 100%)',
                display: 'flex',
              }} />

              {/* Energy divider — mid glow */}
              <div style={{
                position: 'absolute', left: 393, top: 15, width: 14, height: 390,
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.12) 18%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.12) 82%, transparent 100%)',
                display: 'flex',
              }} />

              {/* Energy divider — bright core */}
              <div style={{
                position: 'absolute', left: 398, top: 35, width: 4, height: 350,
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.45) 15%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.45) 85%, transparent 100%)',
                borderRadius: 2,
                display: 'flex',
              }} />

              {/* Center energy burst */}
              <div style={{
                position: 'absolute', left: 385, top: 190, width: 30, height: 40,
                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                display: 'flex',
              }} />

              {/* Vignette — top/bottom */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(180deg, rgba(5,8,16,0.45) 0%, transparent 18%, transparent 82%, rgba(5,8,16,0.45) 100%)',
                display: 'flex',
              }} />

              {/* Vignette — left/right */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(90deg, rgba(5,8,16,0.25) 0%, transparent 12%, transparent 88%, rgba(5,8,16,0.25) 100%)',
                display: 'flex',
              }} />

              {/* Home team logo */}
              {room.homeTeamLogo && (
                <img src={room.homeTeamLogo} width={260} height={260} style={{
                  position: 'absolute', left: 45, top: 35,
                  objectFit: 'contain',
                }} />
              )}

              {/* Away team logo */}
              {room.awayTeamLogo && (
                <img src={room.awayTeamLogo} width={260} height={260} style={{
                  position: 'absolute', left: 495, top: 35,
                  objectFit: 'contain',
                }} />
              )}

              {/* LIVE V badge */}
              <div style={{
                position: 'absolute', left: 305, top: 348,
                width: 190, height: 58,
                background: 'rgba(5, 8, 16, 0.92)',
                borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'Inter', fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-0.8px', lineHeight: 1 }}>
                  LIVE
                </span>
                <span style={{ fontFamily: 'InterItalic', fontSize: 34, fontWeight: 900, color: '#00f5a0', letterSpacing: '-0.8px', lineHeight: 1, fontStyle: 'italic' }}>
                  V
                </span>
              </div>
            </div>
          ),
          { width: 800, height: 420, fonts: FONTS },
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
