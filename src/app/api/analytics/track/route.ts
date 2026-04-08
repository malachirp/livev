import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, page, sessionId, metadata } = body;

    if (!event || !sessionId) {
      return new Response(null, { status: 204 });
    }

    // Fire-and-forget: don't await — return immediately so tracking never blocks
    prisma.analyticsEvent.create({
      data: {
        event: String(event).slice(0, 50),
        page: page ? String(page).slice(0, 200) : null,
        sessionId: String(sessionId).slice(0, 100),
        metadata: metadata || null,
      },
    }).catch(() => {});

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
