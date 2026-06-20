import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { LEAGUES } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

function checkAdminAuth(): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const headersList = headers();
  const authHeader = headersList.get('x-admin-password');
  return authHeader === adminPassword;
}

export async function GET() {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const leagues = await prisma.league.findMany({
      include: {
        _count: { select: { members: true, rooms: true } },
        members: {
          select: { displayName: true, isAdmin: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      leagues: leagues.map(l => {
        const comp = LEAGUES.find(c => c.id === l.competitionId);
        return {
          id: l.id,
          code: l.code,
          name: l.name,
          competitionName: comp?.name ?? `ID ${l.competitionId}`,
          season: l.season,
          createdAt: l.createdAt.toISOString(),
          memberCount: l._count.members,
          gameCount: l._count.rooms,
          members: l.members.map(m => ({ name: m.displayName, isAdmin: m.isAdmin })),
        };
      }),
    });
  } catch (error) {
    console.error('Failed to fetch admin leagues:', error);
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('id');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    await prisma.league.delete({ where: { id: leagueId } });

    return NextResponse.json({ success: true, deleted: leagueId });
  } catch (error) {
    console.error('Failed to delete league:', error);
    return NextResponse.json({ error: 'Failed to delete league' }, { status: 500 });
  }
}
