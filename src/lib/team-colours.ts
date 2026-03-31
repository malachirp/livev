// Primary and secondary colours for major teams (home kit)
// Keyed by API-Football team ID
const TEAM_COLOURS: Record<number, { primary: string; secondary: string }> = {
  // Premier League
  33: { primary: '#DA291C', secondary: '#FFFFFF' }, // Manchester United - red/white
  34: { primary: '#6CABDD', secondary: '#FFFFFF' }, // Manchester City - sky blue/white
  40: { primary: '#C8102E', secondary: '#FFFFFF' }, // Liverpool - red/white
  42: { primary: '#EF0107', secondary: '#FFFFFF' }, // Arsenal - red/white
  47: { primary: '#132257', secondary: '#FFFFFF' }, // Tottenham - navy/white
  49: { primary: '#034694', secondary: '#FFFFFF' }, // Chelsea - blue/white
  35: { primary: '#7A263A', secondary: '#59C2E6' }, // West Ham - claret/blue
  66: { primary: '#670E36', secondary: '#95BFE5' }, // Aston Villa - claret/blue
  36: { primary: '#FDB913', secondary: '#231F20' }, // Wolves - gold/black
  45: { primary: '#003399', secondary: '#FFFFFF' }, // Everton - blue/white
  46: { primary: '#003090', secondary: '#FDBE11' }, // Leicester - blue/gold
  50: { primary: '#1B458F', secondary: '#C4122E' }, // Crystal Palace - blue/red
  51: { primary: '#0057B8', secondary: '#FFFFFF' }, // Brighton - blue/white
  52: { primary: '#DD0000', secondary: '#FFFFFF' }, // Nottingham Forest - red/white
  55: { primary: '#E30613', secondary: '#FFFFFF' }, // Brentford - red/white
  63: { primary: '#000000', secondary: '#FFFFFF' }, // Fulham - black/white
  41: { primary: '#D71920', secondary: '#FFFFFF' }, // Southampton - red/white
  71: { primary: '#FFF200', secondary: '#00A650' }, // Norwich - yellow/green
  38: { primary: '#241F20', secondary: '#FFFFFF' }, // Newcastle - black/white
  62: { primary: '#6C1D45', secondary: '#99D6EA' }, // Burnley - claret/blue
  44: { primary: '#6C1D45', secondary: '#99D6EA' }, // Burnley alt ID
  57: { primary: '#EE2737', secondary: '#FFFFFF' }, // Sheffield United - red/white
  76: { primary: '#3A64A3', secondary: '#FFFFFF' }, // Ipswich - blue/white
  1359: { primary: '#DA291C', secondary: '#000000' }, // Bournemouth - red/black
  67: { primary: '#FFFFFF', secondary: '#1D428A' }, // Leeds United - white/blue
  39: { primary: '#1D428A', secondary: '#FFFFFF' }, // Leeds alt ID (if different)

  // Champions League / European teams
  85: { primary: '#FFFFFF', secondary: '#FEBE10' }, // Real Madrid - white/gold
  529: { primary: '#A50044', secondary: '#004D98' }, // Barcelona - maroon/blue
  157: { primary: '#DC052D', secondary: '#FFFFFF' }, // Bayern Munich - red/white
  489: { primary: '#FB090B', secondary: '#000000' }, // AC Milan - red/black
  496: { primary: '#000000', secondary: '#FFFFFF' }, // Juventus - black/white
  505: { primary: '#009DDC', secondary: '#000000' }, // Inter Milan - blue/black
  530: { primary: '#CB3524', secondary: '#FFFFFF' }, // Atletico Madrid - red/white
  174: { primary: '#FDE100', secondary: '#000000' }, // Borussia Dortmund - yellow/black
  80: { primary: '#DA291C', secondary: '#00529F' }, // Lyon - red/blue
  81: { primary: '#2FAEE0', secondary: '#FFFFFF' }, // Marseille - light blue/white
  541: { primary: '#004170', secondary: '#DA291C' }, // PSG - navy/red
  211: { primary: '#E20714', secondary: '#FFFFFF' }, // Benfica - red/white
  212: { primary: '#006847', secondary: '#FFFFFF' }, // Sporting CP - green/white
  228: { primary: '#003DA5', secondary: '#FFFFFF' }, // Porto - blue/white
  532: { primary: '#FECB00', secondary: '#004996' }, // Valencia - yellow/blue
  548: { primary: '#EE2523', secondary: '#FFFFFF' }, // Real Sociedad - red/white/blue
  546: { primary: '#FFFFFF', secondary: '#B5A36A' }, // Sevilla - white/gold
  165: { primary: '#E32221', secondary: '#FFFFFF' }, // Borussia Monchengladbach - red/white
  169: { primary: '#E30613', secondary: '#FFFFFF' }, // Eintracht Frankfurt - red/white
  173: { primary: '#004B9B', secondary: '#FFFFFF' }, // RB Leipzig - blue/white
  172: { primary: '#004E95', secondary: '#FFFFFF' }, // Bayer Leverkusen - red/black
  168: { primary: '#E30613', secondary: '#004B9B' }, // Freiburg
  492: { primary: '#12A0D7', secondary: '#FFFFFF' }, // Napoli - sky blue/white
  497: { primary: '#8E1F2F', secondary: '#F5A623' }, // Roma - maroon/gold
  499: { primary: '#472F8E', secondary: '#FFFFFF' }, // Atalanta
  500: { primary: '#1A2C5B', secondary: '#A71C2F' }, // Bologna - blue/red
  502: { primary: '#A7166F', secondary: '#FFFFFF' }, // Fiorentina - purple/white
  503: { primary: '#8B1C2F', secondary: '#FFFFFF' }, // Torino - maroon/white
  94: { primary: '#0064A3', secondary: '#FFFFFF' }, // Villarreal - yellow
  79: { primary: '#DA291C', secondary: '#FFFFFF' }, // Lille - red/white
  95: { primary: '#FECB00', secondary: '#004996' }, // Villarreal - yellow
  78: { primary: '#1D1D1B', secondary: '#DA291C' }, // Bordeaux
  77: { primary: '#E30613', secondary: '#000000' }, // Angers

  // Scottish / other
  247: { primary: '#00843D', secondary: '#FFFFFF' }, // Celtic - green/white
  248: { primary: '#0000FF', secondary: '#FFFFFF' }, // Rangers - blue/white

  // International
  1: { primary: '#FFFFFF', secondary: '#002F6C' }, // France (placeholder)
  10: { primary: '#009A44', secondary: '#FFFFFF' }, // Brazil-ish (placeholder)
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
