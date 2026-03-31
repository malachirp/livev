import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        players: {
          select: { id: true, displayName: true, totalPoints: true, isCreator: true },
        },
        _count: { select: { players: true } },
      },
      orderBy: { matchDate: 'asc' },
    });

    // Fetch match statuses for all fixtures
    const fixtureIds = Array.from(new Set(rooms.map(r => r.fixtureId)));
    const matchCaches = await prisma.matchCache.findMany({
      where: { fixtureId: { in: fixtureIds } },
    });
    const statusMap = new Map(matchCaches.map(mc => [mc.fixtureId, mc]));

    const roomsData = rooms.map(room => {
      const cache = statusMap.get(room.fixtureId);
      return {
        id: room.id,
        code: room.code,
        fixtureId: room.fixtureId,
        homeTeamName: room.homeTeamName,
        awayTeamName: room.awayTeamName,
        homeTeamLogo: room.homeTeamLogo,
        awayTeamLogo: room.awayTeamLogo,
        venue: room.venue,
        matchDate: room.matchDate.toISOString(),
        createdAt: room.createdAt.toISOString(),
        playerCount: room._count.players,
        players: room.players,
        matchStatus: cache?.status || 'NS',
        homeScore: cache?.homeScore ?? null,
        awayScore: cache?.awayScore ?? null,
      };
    });

    return NextResponse.json({ rooms: roomsData });
  } catch (error) {
    console.error('Failed to fetch admin rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Cascade delete handles players and picks
    await prisma.room.delete({ where: { id: roomId } });

    return NextResponse.json({ success: true, deleted: roomId });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
