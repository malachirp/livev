import { NextResponse } from 'next/server';
import { getAllUpcomingFixtures, LEAGUES, prefetchPlayerStats } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const allFixtures = await getAllUpcomingFixtures(from, to);

    // Only show fixtures that haven't started yet
    const fixtures = allFixtures.filter(f => f.fixture.status.short === 'NS' || f.fixture.status.short === 'TBD');

    // Determine which leagues actually have fixtures
    const availableLeagueIds = Array.from(new Set(fixtures.map(f => f.league.id)));

    // Background pre-fetch player season stats for all teams in the window
    // Non-blocking — fires and forgets, data warms into cache for when pickers open
    prefetchPlayerStats(allFixtures);

    return NextResponse.json({
      fixtures,
      leagues: LEAGUES,
      availableLeagueIds,
    });
  } catch (error) {
    console.error('Failed to fetch fixtures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixtures', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
