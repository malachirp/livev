// Blocked words/patterns for display names shown on the global leaderboard.
// Checks for exact matches, substring matches, and common evasion tricks
// (letter substitution, spacing, etc).

const BLOCKED_EXACT = new Set([
  // Racial slurs
  'nigger', 'nigga', 'niggers', 'niggas', 'nig', 'n1gger', 'n1gga',
  'coon', 'coons', 'darkie', 'darkies', 'spic', 'spics', 'spick',
  'wetback', 'wetbacks', 'beaner', 'beaners', 'chink', 'chinks',
  'gook', 'gooks', 'paki', 'pakis', 'raghead', 'ragheads',
  'towelhead', 'towelheads', 'redskin', 'redskins', 'kike', 'kikes',
  'jigaboo', 'jiggaboo', 'sambo', 'wog', 'wogs', 'zipperhead',
  // Homophobic slurs
  'faggot', 'faggots', 'fag', 'fags', 'faggy', 'f4ggot', 'f4g',
  'dyke', 'dykes', 'tranny', 'trannies', 'shemale', 'shemales',
  'battyboy', 'batty boy', 'bender', 'poofter', 'poofters', 'poof',
  // Profanity
  'fuck', 'fucker', 'fuckers', 'fucking', 'fucked', 'fck', 'fuk',
  'shit', 'shitty', 'sh1t', 'bullshit',
  'cunt', 'cunts', 'c0nt', 'c0nts',
  'bitch', 'bitches', 'b1tch',
  'dick', 'dicks', 'dickhead', 'dickheads',
  'cock', 'cocks', 'cocksucker', 'cocksuckers',
  'ass', 'arse', 'asshole', 'assholes', 'arsehole', 'arseholes',
  'wanker', 'wankers', 'tosser', 'tossers',
  'twat', 'twats', 'bellend', 'bellends',
  'bastard', 'bastards',
  'whore', 'whores', 'slut', 'sluts',
  'retard', 'retards', 'retarded',
  // Sexual
  'penis', 'vagina', 'pussy', 'pussies',
  // Other offensive
  'nazi', 'nazis', 'hitler', 'holocaust',
]);

// Substrings that should be caught anywhere within the name
const BLOCKED_SUBSTRINGS = [
  'nigge', 'nigg4', 'n1gg', 'fagg', 'f4gg',
];

// Common letter substitutions used to evade filters
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

/** Normalize a string: lowercase, strip non-alphanumeric, apply leet-speak reversal */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map(c => LEET_MAP[c] || c)
    .join('')
    .replace(/[^a-z]/g, '');
}

/**
 * Check if a display name contains blocked content.
 * Returns the reason string if blocked, or null if clean.
 */
export function checkDisplayName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length === 0) return 'Name cannot be empty';
  if (trimmed.length > 20) return 'Name must be 20 characters or less';

  const normalized = normalize(trimmed);

  // Check exact matches
  if (BLOCKED_EXACT.has(normalized)) {
    return 'That name is not allowed. Please choose another.';
  }

  // Check if the lowercased (but un-normalized) version matches
  // (catches things like "fu ck" which normalize to "fuck")
  const lowerNoSpaces = trimmed.toLowerCase().replace(/[\s_\-\.]+/g, '');
  if (BLOCKED_EXACT.has(lowerNoSpaces)) {
    return 'That name is not allowed. Please choose another.';
  }

  // Check substrings in normalized form
  for (const sub of BLOCKED_SUBSTRINGS) {
    if (normalized.includes(sub)) {
      return 'That name is not allowed. Please choose another.';
    }
  }

  return null;
}
