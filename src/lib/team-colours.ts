// Primary and secondary colours for major teams
// Keyed by API-Football team ID
const TEAM_COLOURS: Record<number, { primary: string; secondary: string }> = {
  // Premier League
  33: { primary: '#DA291C', secondary: '#FBE122' }, // Manchester United
  34: { primary: '#6CABDD', secondary: '#1C2C5B' }, // Manchester City
  40: { primary: '#C8102E', secondary: '#00B2A9' }, // Liverpool
  42: { primary: '#003090', secondary: '#FFFFFF' }, // Arsenal
  47: { primary: '#132257', secondary: '#FFFFFF' }, // Tottenham
  49: { primary: '#034694', secondary: '#FFFFFF' }, // Chelsea
  35: { primary: '#7A263A', secondary: '#95BFE5' }, // West Ham
  66: { primary: '#003399', secondary: '#FFFFFF' }, // Aston Villa
  36: { primary: '#241F20', secondary: '#F7A600' }, // Wolverhampton (Wolves)
  39: { primary: '#003399', secondary: '#EAD045' }, // Wolverhampton alt
  45: { primary: '#003090', secondary: '#FFFFFF' }, // Everton
  46: { primary: '#FDB913', secondary: '#000000' }, // Leicester
  48: { primary: '#6C1D45', secondary: '#95BFE5' }, // West Ham alt
  50: { primary: '#ED1A3B', secondary: '#1B458F' }, // Crystal Palace
  51: { primary: '#0057B8', secondary: '#FFFFFF' }, // Brighton
  52: { primary: '#E03A3E', secondary: '#1B1B1B' }, // Nottingham Forest
  55: { primary: '#B7B2B0', secondary: '#000000' }, // Brentford
  63: { primary: '#EE2737', secondary: '#FFFFFF' }, // Fulham
  65: { primary: '#241F20', secondary: '#FFFFFF' }, // Nottingham Forest alt
  41: { primary: '#DA291C', secondary: '#1B1B1B' }, // Southampton
  71: { primary: '#FBEE23', secondary: '#000000' }, // Norwich
  38: { primary: '#FFFFFF', secondary: '#000000' }, // Newcastle (black/white)
  62: { primary: '#670E36', secondary: '#99D6EA' }, // Burnley (same as Aston Villa-ish)
  44: { primary: '#670E36', secondary: '#99D6EA' }, // Burnley
  57: { primary: '#D71920', secondary: '#FFFFFF' }, // Sheffield United
  76: { primary: '#FFFFFF', secondary: '#1B458F' }, // Ipswich
  1359: { primary: '#E03A3E', secondary: '#1B1B1B' }, // AFC Bournemouth

  // Champions League notable teams
  85: { primary: '#FFFFFF', secondary: '#00529F' }, // Real Madrid
  529: { primary: '#A50044', secondary: '#004D98' }, // Barcelona
  157: { primary: '#003153', secondary: '#D4AF37' }, // Bayern Munich
  489: { primary: '#000000', secondary: '#FFFFFF' }, // AC Milan
  496: { primary: '#0068A8', secondary: '#000000' }, // Juventus
  505: { primary: '#0068A8', secondary: '#FFFFFF' }, // Inter Milan
  530: { primary: '#272E61', secondary: '#CD122D' }, // Atletico Madrid
  174: { primary: '#E30613', secondary: '#FFED00' }, // Borussia Dortmund
  165: { primary: '#DA291C', secondary: '#1B1B1B' }, // Borussia Dortmund alt
  80: { primary: '#004170', secondary: '#DBA111' }, // Lyon
  81: { primary: '#004170', secondary: '#FFFFFF' }, // Marseille
  541: { primary: '#004170', secondary: '#DA291C' }, // PSG
  211: { primary: '#FF4500', secondary: '#FFFFFF' }, // Benfica
  212: { primary: '#006747', secondary: '#FFFFFF' }, // Sporting CP
  228: { primary: '#003DA5', secondary: '#DA291C' }, // Porto
};

const DEFAULT_COLOURS = { primary: '#334155', secondary: '#94a3b8' };

export function getTeamColours(teamId: number): { primary: string; secondary: string } {
  return TEAM_COLOURS[teamId] || DEFAULT_COLOURS;
}

export function getTeamGradient(homeTeamId: number, awayTeamId: number): string {
  const home = getTeamColours(homeTeamId);
  const away = getTeamColours(awayTeamId);
  return `linear-gradient(135deg, ${home.primary}40 0%, transparent 50%, ${away.primary}40 100%)`;
}
