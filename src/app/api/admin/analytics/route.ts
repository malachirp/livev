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

export async function GET(request: Request) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const deepDive = url.searchParams.get('deepdive') === '1';

  try {
    // ── Headline metrics (always returned) ──

    const [totalRooms, totalPlayers] = await Promise.all([
      prisma.room.count(),
      prisma.player.count(),
    ]);

    // Players per game distribution
    const roomsWithCounts = await prisma.room.findMany({
      select: { _count: { select: { players: true } } },
    });
    const playerCounts = roomsWithCounts.map(r => r._count.players);
    const avgPlayersPerGame = playerCounts.length > 0
      ? Math.round((playerCounts.reduce((a, b) => a + b, 0) / playerCounts.length) * 10) / 10
      : 0;

    // Games created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const gamesThisWeek = await prisma.room.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // ── Charts: daily games (last 30 days) + cumulative users ──

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRooms = await prisma.room.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build daily buckets
    const dailyGames: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      dailyGames[d.toISOString().slice(0, 10)] = 0;
    }
    for (const r of recentRooms) {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (dailyGames[key] !== undefined) dailyGames[key]++;
    }

    // Cumulative users (all time, weekly buckets)
    const allPlayers = await prisma.player.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const cumulativeUsers: { date: string; total: number }[] = [];
    if (allPlayers.length > 0) {
      const start = allPlayers[0].createdAt;
      const now = new Date();
      let cursor = new Date(start);
      cursor.setDate(cursor.getDate() - cursor.getDay()); // align to Sunday
      let playerIdx = 0;

      while (cursor <= now) {
        const weekEnd = new Date(cursor);
        weekEnd.setDate(weekEnd.getDate() + 7);
        while (playerIdx < allPlayers.length && allPlayers[playerIdx].createdAt < weekEnd) playerIdx++;
        cumulativeUsers.push({ date: cursor.toISOString().slice(0, 10), total: playerIdx });
        cursor = weekEnd;
      }
    }

    const response: any = {
      summary: {
        totalGames: totalRooms,
        totalPlayers,
        avgPlayersPerGame,
        gamesThisWeek,
      },
      dailyGames: Object.entries(dailyGames).map(([date, count]) => ({ date, count })),
      cumulativeUsers,
    };

    // ── Deep dive (only when requested, heavier queries) ──

    if (deepDive) {
      // Event-based analytics from the AnalyticsEvent table
      let hasEventTable = true;
      let eventCounts: Record<string, number> = {};
      let dailyVisitors: { date: string; count: number }[] = [];
      let pageViews: { page: string; count: number }[] = [];
      let hourlyActivity: { hour: number; count: number }[] = [];
      let conversionFunnel: { step: string; label: string; description: string; count: number }[] = [];

      try {
        // Total counts by event type
        const eventGroups = await prisma.analyticsEvent.groupBy({
          by: ['event'],
          _count: { id: true },
        });
        eventCounts = Object.fromEntries(eventGroups.map(g => [g.event, g._count.id]));

        // Daily unique visitors (unique sessions per day, last 30 days)
        const thirtyAgo = new Date();
        thirtyAgo.setDate(thirtyAgo.getDate() - 30);

        const dailyVisitorRows = await prisma.$queryRawUnsafe<{ day: string; visitors: bigint }[]>(
          `SELECT DATE("createdAt") as day, COUNT(DISTINCT "sessionId") as visitors
           FROM "AnalyticsEvent"
           WHERE "createdAt" >= $1
           GROUP BY DATE("createdAt")
           ORDER BY day ASC`,
          thirtyAgo
        );

        // Fill in all 30 days
        const visitorMap: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          visitorMap[d.toISOString().slice(0, 10)] = 0;
        }
        for (const row of dailyVisitorRows) {
          const key = typeof row.day === 'string' ? row.day.slice(0, 10) : new Date(row.day).toISOString().slice(0, 10);
          if (visitorMap[key] !== undefined) visitorMap[key] = Number(row.visitors);
        }
        dailyVisitors = Object.entries(visitorMap).map(([date, count]) => ({ date, count }));

        // Page views by page (top pages, normalise room codes)
        const pageViewRows = await prisma.analyticsEvent.findMany({
          where: { event: 'page_view' },
          select: { page: true },
        });

        const pageCounts: Record<string, number> = {};
        for (const row of pageViewRows) {
          // Normalise: /room/ABC123 → /room/[code], /room/ABC123/pick → /room/[code]/pick
          let p = row.page || '/';
          p = p.replace(/^\/room\/[A-Za-z0-9]+\/pick$/, '/room/[code]/pick');
          p = p.replace(/^\/room\/[A-Za-z0-9]+$/, '/room/[code]');
          pageCounts[p] = (pageCounts[p] || 0) + 1;
        }
        pageViews = Object.entries(pageCounts)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Hourly activity (hour of day UTC)
        const hourlyRows = await prisma.$queryRawUnsafe<{ hour: number; cnt: bigint }[]>(
          `SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*) as cnt
           FROM "AnalyticsEvent"
           WHERE event = 'page_view'
           GROUP BY hour
           ORDER BY hour ASC`
        );
        const hourMap: Record<number, number> = {};
        for (let h = 0; h < 24; h++) hourMap[h] = 0;
        for (const row of hourlyRows) hourMap[row.hour] = Number(row.cnt);
        hourlyActivity = Object.entries(hourMap).map(([h, count]) => ({ hour: Number(h), count }));

        // Conversion funnel: unique sessions that did each action
        const funnelSteps = [
          { event: 'page_view', step: 'visitors', label: 'Site Visitors', description: 'Unique people who visited any page' },
          { event: 'game_created', step: 'creators', label: 'Games Created', description: 'Unique people who created a game room' },
          { event: 'game_joined', step: 'joiners', label: 'Players Joined', description: 'Unique people who joined someone else\'s game' },
          { event: 'team_saved', step: 'pickers', label: 'Teams Saved', description: 'Unique people who saved their team picks' },
          { event: 'share_clicked', step: 'sharers', label: 'Shares', description: 'Unique people who tapped the share button' },
        ];

        for (const s of funnelSteps) {
          const count = await prisma.analyticsEvent.groupBy({
            by: ['sessionId'],
            where: { event: s.event },
          });
          conversionFunnel.push({ step: s.step, label: s.label, description: s.description, count: count.length });
        }
      } catch {
        // AnalyticsEvent table might not exist yet (pre-migration)
        hasEventTable = false;
      }

      // Return rate: sessions that visited on more than one distinct day
      let returnRate = 0;
      if (hasEventTable) {
        try {
          const returnRows = await prisma.$queryRawUnsafe<{ returning: bigint; total: bigint }[]>(
            `SELECT
               COUNT(*) FILTER (WHERE day_count > 1) as returning,
               COUNT(*) as total
             FROM (
               SELECT "sessionId", COUNT(DISTINCT DATE("createdAt")) as day_count
               FROM "AnalyticsEvent"
               WHERE event = 'page_view'
               GROUP BY "sessionId"
             ) sub`
          );
          if (returnRows.length > 0 && Number(returnRows[0].total) > 0) {
            returnRate = Math.round((Number(returnRows[0].returning) / Number(returnRows[0].total)) * 100);
          }
        } catch {
          // Ignore if query fails
        }
      }

      response.deepDive = {
        hasEventData: hasEventTable && Object.keys(eventCounts).length > 0,
        eventCounts,
        dailyVisitors,
        pageViews,
        hourlyActivity,
        conversionFunnel,
        returnRate,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
