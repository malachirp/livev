import { prisma } from '@/lib/db';

// Create a key representing a distinct team: sorted footballPlayerIds + captain
function teamKey(picks: { footballPlayerId: number; slotIndex: number }[], captainSlot: number): string {
  const captainId = picks.find(p => p.slotIndex === captainSlot)?.footballPlayerId ?? 0;
  const ids = picks.map(p => p.footballPlayerId).sort((a, b) => a - b);
  return `${ids.join(',')}|c:${captainId}`;
}

interface TeamGroup {
  key: string;
  totalPoints: number;
  playerCount: number;
  isYourTeam: boolean;
  sampleNames: string[];
  captainSlot: number;
  picks: {
    footballPlayerId: number;
    footballPlayerName: string;
    teamId: number;
    position: string;
    slotIndex: number;
    points: number;
    pointsBreakdown: any;
  }[];
}

export async function buildGlobalLeaderboard(fixtureId: number, teamsLocked: boolean, currentPlayerId: string | null) {
  const totalPlayers = await prisma.player.count({ where: { room: { fixtureId } } });

  const allPlayers = await prisma.player.findMany({
    where: { room: { fixtureId }, picks: { some: {} } },
    include: { picks: true },
    orderBy: { totalPoints: 'desc' },
  });

  // Group by distinct team composition
  const groups = new Map<string, TeamGroup>();
  let currentUserKey: string | null = null;

  for (const p of allPlayers) {
    const key = teamKey(p.picks, p.captainSlot);
    const isYou = p.id === currentPlayerId;
    if (isYou) currentUserKey = key;

    const existing = groups.get(key);
    if (existing) {
      existing.playerCount++;
      if (isYou) existing.isYourTeam = true;
      if (existing.sampleNames.length < 3) existing.sampleNames.push(p.displayName);
    } else {
      groups.set(key, {
        key,
        totalPoints: p.totalPoints,
        playerCount: 1,
        isYourTeam: isYou,
        sampleNames: [p.displayName],
        captainSlot: p.captainSlot,
        picks: teamsLocked ? p.picks.map(pick => ({
          footballPlayerId: pick.footballPlayerId,
          footballPlayerName: pick.footballPlayerName,
          teamId: pick.teamId,
          position: pick.position,
          slotIndex: pick.slotIndex,
          points: pick.points,
          pointsBreakdown: pick.pointsBreakdown,
        })) : [],
      });
    }
  }

  // Sort groups by points desc, then by player count desc (tiebreak)
  const sorted = Array.from(groups.values()).sort((a, b) =>
    b.totalPoints - a.totalPoints || b.playerCount - a.playerCount
  );

  // Assign competition ranks
  const rankedTeams: (TeamGroup & { rank: number })[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const rank = i === 0 ? 1 :
      sorted[i].totalPoints === sorted[i - 1].totalPoints ? rankedTeams[i - 1].rank : i + 1;
    rankedTeams.push({ ...sorted[i], rank });
  }

  const topTeams = rankedTeams.slice(0, 3);

  // Current user's team if not in top 3
  let currentUserTeam = null;
  if (currentUserKey && !topTeams.some(t => t.key === currentUserKey)) {
    const team = rankedTeams.find(t => t.key === currentUserKey);
    if (team) currentUserTeam = team;
  }

  const clean = (t: typeof rankedTeams[0]) => ({
    rank: t.rank,
    totalPoints: t.totalPoints,
    playerCount: t.playerCount,
    isYourTeam: t.isYourTeam,
    sampleNames: t.sampleNames,
    captainSlot: t.captainSlot,
    picks: t.picks,
  });

  return {
    totalPlayers,
    totalTeams: rankedTeams.length,
    topTeams: topTeams.map(clean),
    currentUserTeam: currentUserTeam ? clean(currentUserTeam) : null,
  };
}
