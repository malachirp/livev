import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function generateRoomCode(): string {
  return nanoid();
}

export function generateSessionToken(): string {
  return customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 32)();
}

export function normalizePosition(apiPosition: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  switch (apiPosition) {
    case 'Goalkeeper':
      return 'GK';
    case 'Defender':
      return 'DEF';
    case 'Midfielder':
      return 'MID';
    case 'Attacker':
      return 'FWD';
    default:
      return 'MID';
  }
}

// Normalize position codes from the /fixtures/lineups endpoint (G, D, M, F)
export function normalizeLineupPosition(pos: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  switch (pos) {
    case 'G':
      return 'GK';
    case 'D':
      return 'DEF';
    case 'M':
      return 'MID';
    case 'F':
      return 'FWD';
    default:
      return 'MID';
  }
}

// Sanitize player names from the API — fix HTML entities and encoding issues
export function sanitizePlayerName(name: string): string {
  return name
    .replace(/&apos;|&oapos;|&#0?39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

export function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatKickoffTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Session helpers — store a JSON map of roomCode → sessionToken in a single cookie
// so players can be in multiple rooms without losing their identity.
export function getSessionMap(cookieValue: string | undefined): Record<string, string> {
  if (!cookieValue) return {};
  try {
    const parsed = JSON.parse(cookieValue);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Not JSON — treat as a legacy single token (migration)
  }
  return {};
}

export function getSessionToken(cookieValue: string | undefined, roomCode: string): string | null {
  if (!cookieValue) return null;
  // Try new format first (JSON map)
  const map = getSessionMap(cookieValue);
  if (map[roomCode]) return map[roomCode];
  // Fallback: old single-token format — check if it's a plain token string
  if (cookieValue && !cookieValue.startsWith('{')) return cookieValue;
  return null;
}

export function timeUntilKickoff(matchDate: string): string {
  const now = new Date();
  const kick = new Date(matchDate);
  const diff = kick.getTime() - now.getTime();

  if (diff <= 0) return 'Started';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
