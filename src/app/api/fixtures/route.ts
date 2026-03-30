import { NextResponse } from 'next/server';
import { getAllUpcomingFixtures, LEAGUES } from '@/lib/api-football';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fixtures = await getAllUpcomingFixtures(from, to);

    // Determine which leagues actually have fixtures
    const availableLeagueIds = Array.from(new Set(fixtures.map(f => f.league.id)));

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
