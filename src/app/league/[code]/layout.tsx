import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { LEAGUES } from '@/lib/api-football';

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const league = await prisma.league.findUnique({
    where: { code: params.code },
    select: { name: true, competitionId: true, _count: { select: { members: true } } },
  });

  const competition = league ? LEAGUES.find(l => l.id === league.competitionId) : null;
  const title = league ? `LIVE V — ${league.name}` : 'LIVE V — League';
  const description = league
    ? `Join ${league.name} on LIVE V — a ${competition?.name ?? 'fantasy'} league with ${league._count.members} ${league._count.members === 1 ? 'member' : 'members'}. Pick your 5-a-side team and compete across the tournament.`
    : 'Join this fantasy league on LIVE V and compete with friends across the tournament.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'LIVE V',
      type: 'website',
      images: [{ url: '/api/og', width: 400, height: 210, alt: 'LIVE V' }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/api/og'],
    },
  };
}

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
