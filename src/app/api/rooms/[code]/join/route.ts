import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSessionToken, getSessionToken, getSessionMap, getMemberToken } from '@/lib/utils';
import { checkDisplayName } from '@/lib/name-filter';
import { cookies } from 'next/headers';

function setSessionCookie(response: NextResponse, cookieValue: string | undefined, code: string, token: string) {
  const sessions = getSessionMap(cookieValue);
  sessions[code] = token;
  response.cookies.set('livev_session', JSON.stringify(sessions), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { displayName, auto } = body;

    const room = await prisma.room.findUnique({
      where: { code: params.code },
      include: { players: { select: { displayName: true } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('livev_session')?.value;

    // Already in this room with an existing session? (idempotent — works for everyone)
    const existingToken = getSessionToken(sessionCookie, params.code);
    if (existingToken) {
      const existingPlayer = await prisma.player.findFirst({
        where: { roomId: room.id, sessionToken: existingToken },
      });
      if (existingPlayer) {
        return NextResponse.json({
          sessionToken: existingToken,
          playerId: existingPlayer.id,
          alreadyJoined: true,
        });
      }
    }

    // ── League auto-recognition ──────────────────────────────────────────────
    // If this room belongs to a league the caller is a member of, join them with
    // their league identity (no name entry needed).
    if (room.leagueGroupId) {
      // Resolve the league's code so we can read the caller's member token from the cookie.
      const league = await prisma.league.findUnique({
        where: { id: room.leagueGroupId },
        select: { code: true },
      });
      const token = league ? getMemberToken(cookieStore.get('livev_leagues')?.value, league.code) : null;
      const member = token
        ? await prisma.leagueMember.findFirst({ where: { leagueId: room.leagueGroupId, memberToken: token } })
        : null;

      if (member && (auto || !displayName?.trim())) {
        // Idempotency: already joined this room via league identity?
        const existingLeaguePlayer = await prisma.player.findFirst({
          where: { roomId: room.id, leagueMemberId: member.id },
        });
        if (existingLeaguePlayer) {
          const response = NextResponse.json({
            sessionToken: existingLeaguePlayer.sessionToken,
            playerId: existingLeaguePlayer.id,
            alreadyJoined: true,
            viaLeague: true,
          });
          setSessionCookie(response, sessionCookie, params.code, existingLeaguePlayer.sessionToken);
          return response;
        }

        // Pick a free room display name (an outsider may already hold the exact name).
        const taken = new Set(room.players.map(p => p.displayName.toLowerCase()));
        let name = member.displayName;
        let n = 2;
        while (taken.has(name.toLowerCase())) {
          name = `${member.displayName} (${n++})`;
        }

        const sessionToken = generateSessionToken();
        const player = await prisma.player.create({
          data: {
            roomId: room.id,
            displayName: name,
            sessionToken,
            isCreator: false,
            leagueMemberId: member.id,
          },
        });

        const response = NextResponse.json({
          sessionToken,
          playerId: player.id,
          alreadyJoined: false,
          viaLeague: true,
        });
        setSessionCookie(response, sessionCookie, params.code, sessionToken);
        return response;
      }
    }

    // ── Normal name-entry join (outsiders + non-auto) ─────────────────────────
    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const nameError = checkDisplayName(displayName);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const trimmed = displayName.trim();
    const nameExists = room.players.some(p => p.displayName.toLowerCase() === trimmed.toLowerCase());
    if (nameExists) {
      return NextResponse.json({ error: 'That name is already taken in this room' }, { status: 409 });
    }

    const sessionToken = generateSessionToken();
    const player = await prisma.player.create({
      data: { roomId: room.id, displayName: trimmed, sessionToken, isCreator: false },
    });

    const response = NextResponse.json({ sessionToken, playerId: player.id, alreadyJoined: false });
    setSessionCookie(response, sessionCookie, params.code, sessionToken);
    return response;
  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
