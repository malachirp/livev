import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { calculatePlayerPoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

function checkAdminAuth(): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const headersList = headers();
  const authHeader = headersList.get('x-admin-password');
  return authHeader === adminPassword;
}

export async function GET(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

// Recalculate points/breakdowns for all finished games using stored MatchCache data (no API calls)
export async function POST(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const finishedCaches = await prisma.matchCache.findMany({
      where: { status: { in: ['FT', 'AET', 'PEN'] } },
    });

    let roomsUpdated = 0;
    let picksUpdated = 0;

    for (const cache of finishedCaches) {
      const events = (cache.events as any[]) || [];
      const playerStats = (cache.playerStats as any[]) || [];
      if (events.length === 0 && playerStats.length === 0) continue;

      const rooms = await prisma.room.findMany({
        where: { fixtureId: cache.fixtureId },
        include: { players: { include: { picks: true } } },
      });

      for (const room of rooms) {
        roomsUpdated++;
        for (const player of room.players) {
          let playerTotalPoints = 0;

          for (const pick of player.picks) {
            const { total, breakdown } = calculatePlayerPoints(
              pick.footballPlayerId,
              pick.position,
              pick.teamId,
              events,
              playerStats,
              cache.status,
              cache.homeScore,
              cache.awayScore,
              room.homeTeamId,
              room.awayTeamId
            );

            const isCaptain = pick.slotIndex === player.captainSlot;
            const finalPoints = isCaptain ? total * 2 : total;

            await prisma.pick.update({
              where: { id: pick.id },
              data: { points: finalPoints, pointsBreakdown: breakdown as any },
            });

            playerTotalPoints += finalPoints;
            picksUpdated++;
          }

          await prisma.player.update({
            where: { id: player.id },
            data: { totalPoints: playerTotalPoints },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      recalculated: { rooms: roomsUpdated, picks: picksUpdated, fixtures: finishedCaches.length },
    });
  } catch (error) {
    console.error('Failed to recalculate:', error);
    return NextResponse.json({ error: 'Failed to recalculate' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
