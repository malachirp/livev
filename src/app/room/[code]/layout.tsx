import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const room = await prisma.room.findUnique({
    where: { code: params.code },
    select: { homeTeamName: true, awayTeamName: true },
  });

  const matchTitle = room
    ? `${room.homeTeamName} vs ${room.awayTeamName}`
    : 'Join Game';

  const ogImageUrl = room
    ? `/api/og?home=${encodeURIComponent(room.homeTeamName)}&away=${encodeURIComponent(room.awayTeamName)}`
    : '/api/og';

  return {
    title: `LIVE V — ${matchTitle}`,
    description: `Pick your 5-a-side fantasy team for ${matchTitle} and compete with friends live.`,
    openGraph: {
      title: `LIVE V — ${matchTitle}`,
      description: `Pick your 5-a-side fantasy team for ${matchTitle} and compete with friends live.`,
      siteName: 'LIVE V',
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `LIVE V — ${matchTitle}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `LIVE V — ${matchTitle}`,
      description: `Pick your 5-a-side fantasy team for ${matchTitle} and compete with friends live.`,
      images: [ogImageUrl],
    },
  };
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
