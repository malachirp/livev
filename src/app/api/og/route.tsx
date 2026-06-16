import { NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/db';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const interBlack = readFileSync(join(process.cwd(), 'public/fonts/inter-latin-900-normal.woff'));
const interBlackItalic = readFileSync(join(process.cwd(), 'public/fonts/inter-latin-900-italic.woff'));

const FONTS = [
  { name: 'Inter', data: interBlack, weight: 900 as const, style: 'normal' as const },
  { name: 'InterItalic', data: interBlackItalic, weight: 900 as const, style: 'italic' as const },
];

const W = 1200;
const H = 630;
const LOGO_SIZE = 420;
const LOGO_TOP = Math.round((H - LOGO_SIZE) / 2 + 30);
const HOME_LEFT = Math.round((W / 2 - LOGO_SIZE) / 2);
const AWAY_LEFT = Math.round(W / 2 + (W / 2 - LOGO_SIZE) / 2);

let templateBuffer: Buffer | null = null;

async function getTemplate(): Promise<Buffer> {
  if (templateBuffer) return templateBuffer;

  const response = new ImageResponse(
    (
      <div style={{
        background: '#0f172a', width: '100%', height: '100%',
        display: 'flex', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 32, left: 0, width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'Inter', fontSize: 56, fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1 }}>
            LIVE
          </span>
          <span style={{ fontFamily: 'InterItalic', fontSize: 56, fontWeight: 900, color: '#00f5a0', letterSpacing: '-1.5px', lineHeight: 1, fontStyle: 'italic' }}>
            V
          </span>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: FONTS },
  );

  templateBuffer = Buffer.from(await response.arrayBuffer());
  return templateBuffer;
}

const imageCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cached = imageCache.get(code);
    if (cached && Date.now() < cached.expiresAt) {
      return new NextResponse(cached.buffer as unknown as BodyInit, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
      });
    }

    try {
      const room = await prisma.room.findUnique({
        where: { code },
        select: { homeTeamLogo: true, awayTeamLogo: true },
      });

      if (room?.homeTeamLogo && room?.awayTeamLogo) {
        const [template, homeRaw, awayRaw] = await Promise.all([
          getTemplate(),
          fetchImage(room.homeTeamLogo),
          fetchImage(room.awayTeamLogo),
        ]);

        if (homeRaw && awayRaw) {
          const [homePng, awayPng] = await Promise.all([
            sharp(homeRaw).resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
            sharp(awayRaw).resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
          ]);

          const result = await sharp(template)
            .composite([
              { input: homePng, left: HOME_LEFT, top: LOGO_TOP },
              { input: awayPng, left: AWAY_LEFT, top: LOGO_TOP },
            ])
            .png()
            .toBuffer();

          if (imageCache.size > 500) {
            Array.from(imageCache.entries()).forEach(([k, v]) => { if (Date.now() > v.expiresAt) imageCache.delete(k); });
          }
          imageCache.set(code, { buffer: result, expiresAt: Date.now() + CACHE_TTL });

          return new NextResponse(result as unknown as BodyInit, {
            headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
          });
        }
      }
    } catch (err) {
      console.error('OG image generation failed:', err);
    }
  }

  // Default: plain LIVE V logo
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
