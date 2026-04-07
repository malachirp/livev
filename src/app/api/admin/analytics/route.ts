import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

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
    // Summary counts
    const [totalRooms, totalPlayers, totalPicks] = await Promise.all([
      prisma.room.count(),
      prisma.player.count(),
      prisma.pick.count(),
    ]);

    // Match status breakdown — cross-reference with room match dates to avoid stale counts
    const matchCaches = await prisma.matchCache.findMany({
      select: { fixtureId: true, status: true },
    });
    const statusByFixture = new Map(matchCaches.map(mc => [mc.fixtureId, mc.status]));

    // Get all rooms with match dates to correct stale statuses
    const allRoomsForStatus = await prisma.room.findMany({
      select: { fixtureId: true, matchDate: true },
    });
    const fixtureMatchDates = new Map<number, Date>();
    for (const r of allRoomsForStatus) {
      fixtureMatchDates.set(r.fixtureId, r.matchDate);
    }

    const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
    const finishedStatuses = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'PST', 'AWD', 'WO'];
    const now = Date.now();
    const THREE_HOURS = 3 * 60 * 60 * 1000;

    // Correct status counts: if a match should be over (kickoff +3h ago) but cache
    // still shows live/NS, count it as finished instead
    let activeFixtures = 0;
    let finishedFixtures = 0;
    const uniqueFixtures = new Set([...statusByFixture.keys(), ...fixtureMatchDates.keys()]).size;

    for (const [fixtureId, status] of statusByFixture) {
      const matchDate = fixtureMatchDates.get(fixtureId);
      const shouldBeOver = matchDate && (now > matchDate.getTime() + THREE_HOURS);

      if (finishedStatuses.includes(status)) {
        finishedFixtures++;
      } else if (shouldBeOver) {
        // Stale — match should be finished by now, don't count as live
        finishedFixtures++;
      } else if (liveStatuses.includes(status)) {
        activeFixtures++;
      }
    }

    // Players per game distribution
    const roomsWithCounts = await prisma.room.findMany({
      select: { _count: { select: { players: true } } },
    });
    const playerCounts = roomsWithCounts.map(r => r._count.players);
    const avgPlayersPerGame = playerCounts.length > 0
      ? Math.round((playerCounts.reduce((a, b) => a + b, 0) / playerCounts.length) * 10) / 10
      : 0;
    const maxPlayersInGame = playerCounts.length > 0 ? Math.max(...playerCounts) : 0;

    // Games created per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rooms = await prisma.room.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const players = await prisma.player.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build daily buckets for last 30 days
    const dailyGames: Record<string, number> = {};
    const dailyPlayers: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      dailyGames[key] = 0;
      dailyPlayers[key] = 0;
    }

    for (const r of rooms) {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (dailyGames[key] !== undefined) dailyGames[key]++;
    }
    for (const p of players) {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (dailyPlayers[key] !== undefined) dailyPlayers[key]++;
    }

    // Most popular fixtures (by number of rooms)
    const fixtureRoomCounts = await prisma.room.groupBy({
      by: ['fixtureId', 'homeTeamName', 'awayTeamName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topFixtures = fixtureRoomCounts.map(f => ({
      match: `${f.homeTeamName} vs ${f.awayTeamName}`,
      games: f._count.id,
    }));

    // Cumulative totals over time
    const allRooms = await prisma.room.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const allPlayers = await prisma.player.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build weekly cumulative data (all time, bucketed by week)
    const weeklyGames: { date: string; total: number }[] = [];
    const weeklyPlayers: { date: string; total: number }[] = [];

    if (allRooms.length > 0) {
      const start = allRooms[0].createdAt;
      const now = new Date();
      let cursor = new Date(start);
      cursor.setDate(cursor.getDate() - cursor.getDay()); // align to Sunday
      let roomIdx = 0;
      let playerIdx = 0;

      while (cursor <= now) {
        const weekEnd = new Date(cursor);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const label = cursor.toISOString().slice(0, 10);

        while (roomIdx < allRooms.length && allRooms[roomIdx].createdAt < weekEnd) roomIdx++;
        while (playerIdx < allPlayers.length && allPlayers[playerIdx].createdAt < weekEnd) playerIdx++;

        weeklyGames.push({ date: label, total: roomIdx });
        weeklyPlayers.push({ date: label, total: playerIdx });
        cursor = weekEnd;
      }
    }

    return NextResponse.json({
      summary: {
        totalRooms,
        totalPlayers,
        totalPicks,
        uniqueFixtures,
        activeFixtures,
        finishedFixtures,
        avgPlayersPerGame,
        maxPlayersInGame,
      },
      dailyGames: Object.entries(dailyGames).map(([date, count]) => ({ date, count })),
      dailyPlayers: Object.entries(dailyPlayers).map(([date, count]) => ({ date, count })),
      weeklyGames,
      weeklyPlayers,
      topFixtures,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
