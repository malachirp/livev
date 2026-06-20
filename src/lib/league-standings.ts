import { prisma } from '@/lib/db';
import { isMatchFinished, isMatchLive } from '@/types';

// ── Output shapes ────────────────────────────────────────────────────────────

export interface LeagueStanding {
  rank: number;
  memberId: string;
  displayName: string;
  isAdmin: boolean;
  totalPoints: number;
  gamesPlayed: number;
  isYou: boolean;
  gold: number;
  silver: number;
  bronze: number;
  form: { finishRank: number; points: number }[]; // most-recent finishes first, up to 5
}

export interface LeagueGame {
  code: string;
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  matchDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  memberCount: number;       // league members who joined this room
  leaderName: string | null; // top member in this game (live/finished)
}

export interface LeagueAward {
  key: string;
  emoji: string;
  label: string;
  memberName: string | null;
  detail: string;
}

export interface LeagueData {
  standings: LeagueStanding[];
  games: LeagueGame[];
  awards: LeagueAward[];
  totals: { members: number; gamesPlayed: number; gamesFinished: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Standard competition ranking: tied entries share a rank, next rank skips.
function assignRanks<T>(sorted: T[], points: (t: T) => number): number[] {
  const ranks: number[] = [];
  sorted.forEach((item, i) => {
    if (i === 0) ranks.push(1);
    else ranks.push(points(item) === points(sorted[i - 1]) ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function buildLeagueData(leagueId: string, currentMemberId: string | null): Promise<LeagueData> {
  const [rooms, members] = await Promise.all([
    prisma.room.findMany({
      where: { leagueGroupId: leagueId },
      // Only league-linked players count toward league stats — outsiders are excluded.
      include: { players: { where: { leagueMemberId: { not: null } }, include: { picks: true } } },
      orderBy: { matchDate: 'asc' },
    }),
    prisma.leagueMember.findMany({ where: { leagueId } }),
  ]);

  const fixtureIds = Array.from(new Set(rooms.map(r => r.fixtureId)));
  const caches = fixtureIds.length
    ? await prisma.matchCache.findMany({
        where: { fixtureId: { in: fixtureIds } },
        select: { fixtureId: true, status: true, homeScore: true, awayScore: true },
      })
    : [];
  const cacheByFixture = new Map(caches.map(c => [c.fixtureId, c]));

  // Per-member accumulators
  interface Acc {
    memberId: string;
    displayName: string;
    isAdmin: boolean;
    totalPoints: number;
    gamesPlayed: number;
    captainPoints: number;
    finishedPoints: number[];                          // points in each finished game
    finishes: { matchDate: number; finishRank: number; points: number }[];
    gold: number;
    silver: number;
    bronze: number;
  }
  const acc = new Map<string, Acc>();
  for (const m of members) {
    acc.set(m.id, {
      memberId: m.id,
      displayName: m.displayName,
      isAdmin: m.isAdmin,
      totalPoints: 0,
      gamesPlayed: 0,
      captainPoints: 0,
      finishedPoints: [],
      finishes: [],
      gold: 0,
      silver: 0,
      bronze: 0,
    });
  }

  const pickCounts = new Map<number, { name: string; count: number }>(); // footballPlayerId → tally
  let bestHaul = { points: -Infinity, memberName: '', opponent: '' };

  const games: LeagueGame[] = [];

  for (const room of rooms) {
    const cache = cacheByFixture.get(room.fixtureId);
    const status = cache?.status ?? 'NS';
    const finished = isMatchFinished(status);
    const committed = room.players.filter(p => p.picks.length > 0);

    // League leader within this game (for the games list)
    const sortedInRoom = [...committed].sort((a, b) => b.totalPoints - a.totalPoints);
    const roomRanks = assignRanks(sortedInRoom, p => p.totalPoints);

    games.push({
      code: room.code,
      fixtureId: room.fixtureId,
      homeTeamName: room.homeTeamName,
      awayTeamName: room.awayTeamName,
      homeTeamLogo: room.homeTeamLogo,
      awayTeamLogo: room.awayTeamLogo,
      matchDate: room.matchDate.toISOString(),
      status,
      homeScore: cache?.homeScore ?? null,
      awayScore: cache?.awayScore ?? null,
      memberCount: committed.length,
      leaderName: (finished || isMatchLive(status)) && sortedInRoom.length > 0 ? sortedInRoom[0].displayName : null,
    });

    sortedInRoom.forEach((player, i) => {
      const a = acc.get(player.leagueMemberId!);
      if (!a) return;
      a.totalPoints += player.totalPoints;
      a.gamesPlayed += 1;

      // Captain contribution (stored captain pick points are already doubled)
      const captainPick = player.picks.find(pk => pk.slotIndex === player.captainSlot);
      if (captainPick) a.captainPoints += captainPick.points;

      // Most-picked footballer across the league
      for (const pk of player.picks) {
        const entry = pickCounts.get(pk.footballPlayerId) ?? { name: pk.footballPlayerName, count: 0 };
        entry.count += 1;
        pickCounts.set(pk.footballPlayerId, entry);
      }

      if (finished) {
        const finishRank = roomRanks[i];
        a.finishedPoints.push(player.totalPoints);
        a.finishes.push({ matchDate: room.matchDate.getTime(), finishRank, points: player.totalPoints });
        if (finishRank === 1) a.gold += 1;
        else if (finishRank === 2) a.silver += 1;
        else if (finishRank === 3) a.bronze += 1;

        if (player.totalPoints > bestHaul.points) {
          bestHaul = {
            points: player.totalPoints,
            memberName: player.displayName,
            opponent: `${room.homeTeamName} v ${room.awayTeamName}`,
          };
        }
      }
    });
  }

  // ── Standings ──────────────────────────────────────────────────────────────
  const accList = Array.from(acc.values()).sort(
    (a, b) => b.totalPoints - a.totalPoints || b.gamesPlayed - a.gamesPlayed,
  );
  const standingRanks = assignRanks(accList, a => a.totalPoints);
  const standings: LeagueStanding[] = accList.map((a, i) => ({
    rank: standingRanks[i],
    memberId: a.memberId,
    displayName: a.displayName,
    isAdmin: a.isAdmin,
    totalPoints: a.totalPoints,
    gamesPlayed: a.gamesPlayed,
    isYou: a.memberId === currentMemberId,
    gold: a.gold,
    silver: a.silver,
    bronze: a.bronze,
    form: a.finishes
      .sort((x, y) => y.matchDate - x.matchDate)
      .slice(0, 5)
      .map(f => ({ finishRank: f.finishRank, points: f.points })),
  }));

  // ── Awards ───────────────────────────────────────────────────────────────
  const awards: LeagueAward[] = [];
  const played = accList.filter(a => a.gamesPlayed > 0);

  if (played.length > 0) {
    const leader = played[0];
    awards.push({ key: 'leader', emoji: '👑', label: 'League Leader', memberName: leader.displayName, detail: `${leader.totalPoints} pts` });
  }

  if (bestHaul.points > -Infinity) {
    awards.push({ key: 'bestHaul', emoji: '🔥', label: 'Best Single Game', memberName: bestHaul.memberName, detail: `${bestHaul.points} pts · ${bestHaul.opponent}` });
  }

  // Mr Consistent — lowest spread of points across finished games (min 3 games)
  const consistent = played
    .filter(a => a.finishedPoints.length >= 3)
    .map(a => {
      const mean = a.finishedPoints.reduce((s, n) => s + n, 0) / a.finishedPoints.length;
      const variance = a.finishedPoints.reduce((s, n) => s + (n - mean) ** 2, 0) / a.finishedPoints.length;
      return { a, std: Math.sqrt(variance) };
    })
    .sort((x, y) => x.std - y.std)[0];
  if (consistent) {
    awards.push({ key: 'consistent', emoji: '🎯', label: 'Mr Consistent', memberName: consistent.a.displayName, detail: `±${consistent.std.toFixed(1)} pts` });
  }

  // Captain King — most points earned from captain picks
  const captain = [...played].sort((a, b) => b.captainPoints - a.captainPoints)[0];
  if (captain && captain.captainPoints > 0) {
    awards.push({ key: 'captain', emoji: '🧢', label: 'Captain King', memberName: captain.displayName, detail: `${captain.captainPoints} pts from captains` });
  }

  // Ever-Present — most games entered
  const active = [...played].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];
  if (active) {
    awards.push({ key: 'active', emoji: '📅', label: 'Ever-Present', memberName: active.displayName, detail: `${active.gamesPlayed} games` });
  }

  // Cult Hero — most-picked footballer across the league
  let cultHero: { name: string; count: number } | null = null;
  Array.from(pickCounts.values()).forEach(e => {
    if (!cultHero || e.count > cultHero.count) cultHero = e;
  });
  if (cultHero) {
    awards.push({ key: 'cultHero', emoji: '⭐', label: 'Cult Hero', memberName: (cultHero as { name: string }).name, detail: `picked ${(cultHero as { count: number }).count}×` });
  }

  // Wooden Spoon — last in the table (needs ≥2 players who've played)
  if (played.length >= 2) {
    const spoon = played[played.length - 1];
    awards.push({ key: 'spoon', emoji: '🥄', label: 'Wooden Spoon', memberName: spoon.displayName, detail: `${spoon.totalPoints} pts` });
  }

  const gamesFinished = games.filter(g => isMatchFinished(g.status)).length;
  const gamesPlayedTotal = games.length;

  return {
    standings,
    games,
    awards,
    totals: { members: members.length, gamesPlayed: gamesPlayedTotal, gamesFinished },
  };
}
