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
