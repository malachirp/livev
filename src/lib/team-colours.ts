// Comprehensive team kit colours database
// Two lookup strategies:
//   1. By team ID (reliable for clubs whose IDs are well-known)
//   2. By team name (reliable for national teams, used as fallback)
//
// getTeamColours(id, name?) checks ID first, then name, then returns default.

type Colours = { primary: string; secondary: string };

// ============================================================
// ID-BASED MAP — club teams with well-known API-Football IDs
// ============================================================
const TEAM_COLOURS_BY_ID: Record<number, Colours> = {

  // PREMIER LEAGUE 2025-26 (league 39)
  33: { primary: '#DA291C', secondary: '#FFFFFF' },   // Manchester United
  34: { primary: '#6CABDD', secondary: '#FFFFFF' },   // Manchester City
  40: { primary: '#C8102E', secondary: '#FFFFFF' },   // Liverpool
  42: { primary: '#EF0107', secondary: '#FFFFFF' },   // Arsenal
  47: { primary: '#132257', secondary: '#FFFFFF' },   // Tottenham Hotspur
  49: { primary: '#034694', secondary: '#FFFFFF' },   // Chelsea
  35: { primary: '#7A263A', secondary: '#59C2E6' },   // West Ham United
  66: { primary: '#670E36', secondary: '#95BFE5' },   // Aston Villa
  36: { primary: '#FDB913', secondary: '#231F20' },   // Wolverhampton Wanderers
  45: { primary: '#003399', secondary: '#FFFFFF' },   // Everton
  46: { primary: '#003090', secondary: '#FDBE11' },   // Leicester City
  50: { primary: '#1B458F', secondary: '#C4122E' },   // Crystal Palace
  51: { primary: '#0057B8', secondary: '#FFFFFF' },   // Brighton & Hove Albion
  52: { primary: '#DD0000', secondary: '#FFFFFF' },   // Nottingham Forest
  55: { primary: '#E30613', secondary: '#FFFFFF' },   // Brentford
  63: { primary: '#000000', secondary: '#FFFFFF' },   // Fulham
  41: { primary: '#D71920', secondary: '#FFFFFF' },   // Southampton
  38: { primary: '#241F20', secondary: '#FFFFFF' },   // Newcastle United
  76: { primary: '#3A64A3', secondary: '#FFFFFF' },   // Ipswich Town
  1359: { primary: '#DA291C', secondary: '#000000' }, // AFC Bournemouth

  // EFL CHAMPIONSHIP (league 40)
  67: { primary: '#FFFFFF', secondary: '#1D428A' },   // Leeds United
  62: { primary: '#6C1D45', secondary: '#99D6EA' },   // Burnley
  71: { primary: '#FFF200', secondary: '#00A650' },   // Norwich City
  57: { primary: '#EE2737', secondary: '#FFFFFF' },   // Sheffield United
  74: { primary: '#EB172B', secondary: '#FFFFFF' },   // Sunderland
  68: { primary: '#DC002E', secondary: '#FFFFFF' },   // Middlesbrough
  73: { primary: '#122F67', secondary: '#FFFFFF' },   // West Bromwich Albion
  60: { primary: '#FBEE23', secondary: '#000000' },   // Watford
  64: { primary: '#FFFFFF', secondary: '#000000' },   // Swansea City
  65: { primary: '#F5A623', secondary: '#000000' },   // Hull City
  56: { primary: '#0066B2', secondary: '#FFFFFF' },   // Sheffield Wednesday
  70: { primary: '#FFFFFF', secondary: '#000000' },   // Derby County
  59: { primary: '#003DA5', secondary: '#FFFFFF' },   // Blackburn Rovers
  753: { primary: '#001489', secondary: '#FFFFFF' },  // Portsmouth
  1130: { primary: '#F5D130', secondary: '#002D62' }, // Oxford United
  746: { primary: '#62B5E5', secondary: '#FFFFFF' },  // Coventry City
  1196: { primary: '#E21836', secondary: '#FFFFFF' }, // Bristol City
  740: { primary: '#001D5E', secondary: '#FFFFFF' },  // Millwall
  743: { primary: '#FFFFFF', secondary: '#1E3A5F' },  // Preston North End
  754: { primary: '#003E2F', secondary: '#FFFFFF' },  // Plymouth Argyle
  58: { primary: '#1D5BA4', secondary: '#FFFFFF' },   // QPR
  78: { primary: '#E03A3E', secondary: '#FFFFFF' },   // Stoke City

  // LA LIGA (league 140)
  85: { primary: '#FFFFFF', secondary: '#FEBE10' },   // Real Madrid
  529: { primary: '#A50044', secondary: '#004D98' },  // FC Barcelona
  530: { primary: '#CB3524', secondary: '#FFFFFF' },  // Atletico Madrid
  531: { primary: '#EE2523', secondary: '#FFFFFF' },  // Athletic Bilbao
  532: { primary: '#FFFFFF', secondary: '#000000' },  // Valencia CF
  533: { primary: '#FFCD00', secondary: '#005BAA' },  // Villarreal CF
  534: { primary: '#003DA5', secondary: '#FFFFFF' },  // Deportivo Alaves
  535: { primary: '#D91A2A', secondary: '#0A1E5C' },  // CA Osasuna
  536: { primary: '#FFFFFF', secondary: '#D20515' },  // Sevilla FC
  538: { primary: '#8AC3EE', secondary: '#FFFFFF' },  // RC Celta Vigo
  540: { primary: '#007FC8', secondary: '#FFFFFF' },  // RCD Espanyol
  541: { primary: '#004170', secondary: '#DA291C' },  // Paris Saint Germain
  543: { primary: '#00954C', secondary: '#FFFFFF' },  // Real Betis
  548: { primary: '#003DA5', secondary: '#FFFFFF' },  // Real Sociedad
  727: { primary: '#FFDD00', secondary: '#003DA5' },  // UD Las Palmas
  728: { primary: '#CC2635', secondary: '#FFFFFF' },  // Girona FC
  798: { primary: '#E03C31', secondary: '#000000' },  // RCD Mallorca
  546: { primary: '#005999', secondary: '#FFFFFF' },  // Getafe CF
  542: { primary: '#6B3FA0', secondary: '#FFFFFF' },  // Real Valladolid

  // BUNDESLIGA (league 78)
  157: { primary: '#DC052D', secondary: '#FFFFFF' },  // Bayern Munich
  165: { primary: '#000000', secondary: '#1FA149' },  // Borussia Monchengladbach
  174: { primary: '#FDE100', secondary: '#000000' },  // Borussia Dortmund
  172: { primary: '#E32221', secondary: '#000000' },  // Bayer Leverkusen
  173: { primary: '#DD0741', secondary: '#FFFFFF' },  // RB Leipzig
  169: { primary: '#E1000F', secondary: '#FFFFFF' },  // Eintracht Frankfurt
  168: { primary: '#E30613', secondary: '#FFFFFF' },  // SC Freiburg
  170: { primary: '#FFFFFF', secondary: '#E32219' },  // VfB Stuttgart
  167: { primary: '#1C63B7', secondary: '#FFFFFF' },  // TSG Hoffenheim
  171: { primary: '#65B32E', secondary: '#FFFFFF' },  // VfL Wolfsburg
  162: { primary: '#1D9053', secondary: '#FFFFFF' },  // Werder Bremen
  163: { primary: '#EB1923', secondary: '#FFFFFF' },  // 1. FC Union Berlin
  164: { primary: '#BA3733', secondary: '#2E6B34' },  // FC Augsburg
  176: { primary: '#005BA1', secondary: '#FFFFFF' },  // VfL Bochum
  166: { primary: '#D40511', secondary: '#003DA5' },  // 1. FC Heidenheim
  175: { primary: '#004E9E', secondary: '#FFFFFF' },  // SV Darmstadt 98
  178: { primary: '#6E3B23', secondary: '#FFFFFF' },  // FC St. Pauli
  191: { primary: '#003DA5', secondary: '#FFFFFF' },  // Holstein Kiel
  161: { primary: '#FFFFFF', secondary: '#CC0000' },  // 1. FC Koln
  159: { primary: '#005DAC', secondary: '#FFFFFF' },  // Hertha BSC

  // SERIE A / ITALIAN CLUBS
  489: { primary: '#FB090B', secondary: '#000000' },  // AC Milan
  496: { primary: '#000000', secondary: '#FFFFFF' },  // Juventus
  505: { primary: '#009DDC', secondary: '#000000' },  // Inter Milan
  492: { primary: '#12A0D7', secondary: '#FFFFFF' },  // Napoli
  497: { primary: '#8E1F2F', secondary: '#F5A623' },  // AS Roma
  499: { primary: '#1E71B8', secondary: '#000000' },  // Atalanta
  500: { primary: '#1A2C5B', secondary: '#A71C2F' },  // Bologna
  502: { primary: '#482E92', secondary: '#FFFFFF' },  // Fiorentina
  503: { primary: '#8B1C2F', secondary: '#FFFFFF' },  // Torino
  504: { primary: '#87CEEB', secondary: '#FFFFFF' },  // Lazio
  498: { primary: '#00563F', secondary: '#000000' },  // Sassuolo

  // LIGUE 1 / FRENCH CLUBS
  80: { primary: '#D2122E', secondary: '#00529F' },   // Olympique Lyonnais
  81: { primary: '#2FAEE0', secondary: '#FFFFFF' },   // Olympique de Marseille
  79: { primary: '#DA291C', secondary: '#FFFFFF' },   // Lille OSC
  91: { primary: '#E30613', secondary: '#FFFFFF' },   // AS Monaco
  82: { primary: '#00694C', secondary: '#FFFFFF' },   // AS Saint-Etienne
  83: { primary: '#FCDD09', secondary: '#00843D' },   // FC Nantes
  84: { primary: '#CC0000', secondary: '#000000' },   // OGC Nice
  93: { primary: '#B22222', secondary: '#FFFFFF' },   // Stade de Reims
  94: { primary: '#DA291C', secondary: '#000000' },   // Stade Rennais
  116: { primary: '#CC0000', secondary: '#FFD700' },  // RC Lens

  // PRIMEIRA LIGA / PORTUGUESE CLUBS (league 94)
  211: { primary: '#E20714', secondary: '#FFFFFF' },  // SL Benfica
  212: { primary: '#006847', secondary: '#FFFFFF' },  // Sporting CP
  228: { primary: '#003DA5', secondary: '#FFFFFF' },  // FC Porto

  // SCOTTISH
  247: { primary: '#00843D', secondary: '#FFFFFF' },  // Celtic
  248: { primary: '#0000FF', secondary: '#FFFFFF' },  // Rangers
};

// ============================================================
// NAME-BASED MAP — all teams, especially reliable for nationals
// Names should match what API-Football returns in fixture responses.
// Includes common variations.
// ============================================================
const TEAM_COLOURS_BY_NAME: Record<string, Colours> = {

  // --- INTERNATIONAL: Home Nations + Ireland ---
  'england': { primary: '#FFFFFF', secondary: '#002395' },
  'scotland': { primary: '#003087', secondary: '#FFFFFF' },
  'wales': { primary: '#D20515', secondary: '#FFFFFF' },
  'northern ireland': { primary: '#006847', secondary: '#FFFFFF' },
  'republic of ireland': { primary: '#009A49', secondary: '#FFFFFF' },
  'ireland': { primary: '#009A49', secondary: '#FFFFFF' },

  // --- INTERNATIONAL: Europe ---
  'france': { primary: '#002395', secondary: '#FFFFFF' },
  'germany': { primary: '#FFFFFF', secondary: '#000000' },
  'spain': { primary: '#DA291C', secondary: '#FFCD00' },
  'italy': { primary: '#0066CC', secondary: '#FFFFFF' },
  'portugal': { primary: '#DA291C', secondary: '#006847' },
  'netherlands': { primary: '#FF6600', secondary: '#FFFFFF' },
  'holland': { primary: '#FF6600', secondary: '#FFFFFF' },
  'belgium': { primary: '#CC0000', secondary: '#FFCD00' },
  'croatia': { primary: '#FF0000', secondary: '#FFFFFF' },
  'denmark': { primary: '#DA291C', secondary: '#FFFFFF' },
  'turkey': { primary: '#CE1124', secondary: '#FFFFFF' },
  'sweden': { primary: '#FFCD00', secondary: '#003DA5' },
  'poland': { primary: '#FFFFFF', secondary: '#DC143C' },
  'austria': { primary: '#DC143C', secondary: '#FFFFFF' },
  'switzerland': { primary: '#DA291C', secondary: '#FFFFFF' },
  'serbia': { primary: '#DA291C', secondary: '#003DA5' },
  'ukraine': { primary: '#FFCD00', secondary: '#003DA5' },
  'romania': { primary: '#FFCD00', secondary: '#003DA5' },
  'greece': { primary: '#005DAC', secondary: '#FFFFFF' },
  'norway': { primary: '#DA291C', secondary: '#FFFFFF' },
  'czech republic': { primary: '#003087', secondary: '#FFFFFF' },
  'czechia': { primary: '#003087', secondary: '#FFFFFF' },
  'hungary': { primary: '#CE2939', secondary: '#477050' },
  'finland': { primary: '#FFFFFF', secondary: '#003580' },
  'iceland': { primary: '#003897', secondary: '#D72828' },
  'slovenia': { primary: '#005DA5', secondary: '#FFFFFF' },
  'slovakia': { primary: '#003DA5', secondary: '#FFFFFF' },
  'albania': { primary: '#DA291C', secondary: '#000000' },
  'georgia': { primary: '#FFFFFF', secondary: '#DA291C' },
  'bosnia and herzegovina': { primary: '#003DA5', secondary: '#FFCD00' },
  'bosnia & herzegovina': { primary: '#003DA5', secondary: '#FFCD00' },
  'montenegro': { primary: '#CC0000', secondary: '#FFD700' },
  'north macedonia': { primary: '#CC0000', secondary: '#FFCD00' },
  'bulgaria': { primary: '#FFFFFF', secondary: '#00966E' },
  'russia': { primary: '#FFFFFF', secondary: '#DA291C' },
  'kosovo': { primary: '#003DA5', secondary: '#FFD700' },
  'luxembourg': { primary: '#DA291C', secondary: '#009FDA' },

  // --- INTERNATIONAL: South America ---
  'brazil': { primary: '#FFCC00', secondary: '#009B3A' },
  'argentina': { primary: '#75AADB', secondary: '#FFFFFF' },
  'colombia': { primary: '#FFCC00', secondary: '#003DA5' },
  'uruguay': { primary: '#75AADB', secondary: '#FFFFFF' },
  'chile': { primary: '#CC0000', secondary: '#FFFFFF' },
  'paraguay': { primary: '#CC0000', secondary: '#003DA5' },
  'peru': { primary: '#FFFFFF', secondary: '#CC0000' },
  'ecuador': { primary: '#FFCD00', secondary: '#003DA5' },
  'venezuela': { primary: '#8D1B3D', secondary: '#FFFFFF' },
  'bolivia': { primary: '#007A33', secondary: '#FFCD00' },

  // --- INTERNATIONAL: Asia ---
  'japan': { primary: '#003087', secondary: '#FFFFFF' },
  'south korea': { primary: '#CC0000', secondary: '#003DA5' },
  'korea republic': { primary: '#CC0000', secondary: '#003DA5' },
  'iran': { primary: '#FFFFFF', secondary: '#CC0000' },
  'saudi arabia': { primary: '#009639', secondary: '#FFFFFF' },
  'qatar': { primary: '#8D1B3D', secondary: '#FFFFFF' },
  'australia': { primary: '#FFB81C', secondary: '#00843D' },
  'uzbekistan': { primary: '#FFFFFF', secondary: '#009FDA' },
  'iraq': { primary: '#FFFFFF', secondary: '#007A33' },
  'china': { primary: '#CC0000', secondary: '#FFCD00' },
  'china pr': { primary: '#CC0000', secondary: '#FFCD00' },
  'united arab emirates': { primary: '#FFFFFF', secondary: '#CC0000' },

  // --- INTERNATIONAL: Africa ---
  'morocco': { primary: '#CC0000', secondary: '#009900' },
  'cameroon': { primary: '#007A33', secondary: '#CC0000' },
  'south africa': { primary: '#007749', secondary: '#FFB81C' },
  'egypt': { primary: '#CC0000', secondary: '#FFFFFF' },
  'nigeria': { primary: '#006600', secondary: '#FFFFFF' },
  'senegal': { primary: '#006600', secondary: '#FFCD00' },
  'ghana': { primary: '#FFFFFF', secondary: '#006B3F' },
  'tunisia': { primary: '#CC0000', secondary: '#FFFFFF' },
  'algeria': { primary: '#006633', secondary: '#FFFFFF' },
  'ivory coast': { primary: '#FF6600', secondary: '#009E49' },
  "cote d'ivoire": { primary: '#FF6600', secondary: '#009E49' },
  'mali': { primary: '#006600', secondary: '#FFCD00' },
  'dr congo': { primary: '#007FFF', secondary: '#CC0000' },
  'congo dr': { primary: '#007FFF', secondary: '#CC0000' },

  // --- INTERNATIONAL: CONCACAF ---
  'mexico': { primary: '#006847', secondary: '#FFFFFF' },
  'usa': { primary: '#FFFFFF', secondary: '#003DA5' },
  'united states': { primary: '#FFFFFF', secondary: '#003DA5' },
  'canada': { primary: '#CC0000', secondary: '#FFFFFF' },
  'costa rica': { primary: '#CC0000', secondary: '#003DA5' },
  'jamaica': { primary: '#FFB81C', secondary: '#009B3A' },
  'panama': { primary: '#CC0000', secondary: '#003DA5' },
  'honduras': { primary: '#003DA5', secondary: '#FFFFFF' },
  'new zealand': { primary: '#FFFFFF', secondary: '#000000' },

  // --- CLUBS (name variants for fallback) ---
  'manchester united': { primary: '#DA291C', secondary: '#FFFFFF' },
  'manchester city': { primary: '#6CABDD', secondary: '#FFFFFF' },
  'liverpool': { primary: '#C8102E', secondary: '#FFFFFF' },
  'arsenal': { primary: '#EF0107', secondary: '#FFFFFF' },
  'tottenham': { primary: '#132257', secondary: '#FFFFFF' },
  'tottenham hotspur': { primary: '#132257', secondary: '#FFFFFF' },
  'chelsea': { primary: '#034694', secondary: '#FFFFFF' },
  'west ham': { primary: '#7A263A', secondary: '#59C2E6' },
  'west ham united': { primary: '#7A263A', secondary: '#59C2E6' },
  'aston villa': { primary: '#670E36', secondary: '#95BFE5' },
  'wolverhampton wanderers': { primary: '#FDB913', secondary: '#231F20' },
  'wolves': { primary: '#FDB913', secondary: '#231F20' },
  'everton': { primary: '#003399', secondary: '#FFFFFF' },
  'leicester city': { primary: '#003090', secondary: '#FDBE11' },
  'leicester': { primary: '#003090', secondary: '#FDBE11' },
  'crystal palace': { primary: '#1B458F', secondary: '#C4122E' },
  'brighton': { primary: '#0057B8', secondary: '#FFFFFF' },
  'brighton & hove albion': { primary: '#0057B8', secondary: '#FFFFFF' },
  'brighton and hove albion': { primary: '#0057B8', secondary: '#FFFFFF' },
  'nottingham forest': { primary: '#DD0000', secondary: '#FFFFFF' },
  'brentford': { primary: '#E30613', secondary: '#FFFFFF' },
  'fulham': { primary: '#000000', secondary: '#FFFFFF' },
  'southampton': { primary: '#D71920', secondary: '#FFFFFF' },
  'newcastle': { primary: '#241F20', secondary: '#FFFFFF' },
  'newcastle united': { primary: '#241F20', secondary: '#FFFFFF' },
  'ipswich town': { primary: '#3A64A3', secondary: '#FFFFFF' },
  'ipswich': { primary: '#3A64A3', secondary: '#FFFFFF' },
  'bournemouth': { primary: '#DA291C', secondary: '#000000' },
  'afc bournemouth': { primary: '#DA291C', secondary: '#000000' },
  'leeds united': { primary: '#FFFFFF', secondary: '#1D428A' },
  'leeds': { primary: '#FFFFFF', secondary: '#1D428A' },
  'burnley': { primary: '#6C1D45', secondary: '#99D6EA' },
  'norwich city': { primary: '#FFF200', secondary: '#00A650' },
  'norwich': { primary: '#FFF200', secondary: '#00A650' },
  'sheffield united': { primary: '#EE2737', secondary: '#FFFFFF' },
  'sunderland': { primary: '#EB172B', secondary: '#FFFFFF' },
  'middlesbrough': { primary: '#DC002E', secondary: '#FFFFFF' },
  'west bromwich albion': { primary: '#122F67', secondary: '#FFFFFF' },
  'west brom': { primary: '#122F67', secondary: '#FFFFFF' },
  'watford': { primary: '#FBEE23', secondary: '#000000' },
  'swansea city': { primary: '#FFFFFF', secondary: '#000000' },
  'hull city': { primary: '#F5A623', secondary: '#000000' },
  'sheffield wednesday': { primary: '#0066B2', secondary: '#FFFFFF' },
  'derby county': { primary: '#FFFFFF', secondary: '#000000' },
  'blackburn rovers': { primary: '#003DA5', secondary: '#FFFFFF' },
  'portsmouth': { primary: '#001489', secondary: '#FFFFFF' },
  'oxford united': { primary: '#F5D130', secondary: '#002D62' },
  'coventry city': { primary: '#62B5E5', secondary: '#FFFFFF' },
  'bristol city': { primary: '#E21836', secondary: '#FFFFFF' },
  'millwall': { primary: '#001D5E', secondary: '#FFFFFF' },
  'preston north end': { primary: '#FFFFFF', secondary: '#1E3A5F' },
  'plymouth argyle': { primary: '#003E2F', secondary: '#FFFFFF' },
  'qpr': { primary: '#1D5BA4', secondary: '#FFFFFF' },
  'queens park rangers': { primary: '#1D5BA4', secondary: '#FFFFFF' },
  'stoke city': { primary: '#E03A3E', secondary: '#FFFFFF' },
  'real madrid': { primary: '#FFFFFF', secondary: '#FEBE10' },
  'barcelona': { primary: '#A50044', secondary: '#004D98' },
  'atletico madrid': { primary: '#CB3524', secondary: '#FFFFFF' },
  'athletic bilbao': { primary: '#EE2523', secondary: '#FFFFFF' },
  'athletic club': { primary: '#EE2523', secondary: '#FFFFFF' },
  'bayern munich': { primary: '#DC052D', secondary: '#FFFFFF' },
  'bayern munchen': { primary: '#DC052D', secondary: '#FFFFFF' },
  'borussia dortmund': { primary: '#FDE100', secondary: '#000000' },
  'bayer leverkusen': { primary: '#E32221', secondary: '#000000' },
  'rb leipzig': { primary: '#DD0741', secondary: '#FFFFFF' },
  'juventus': { primary: '#000000', secondary: '#FFFFFF' },
  'ac milan': { primary: '#FB090B', secondary: '#000000' },
  'inter milan': { primary: '#009DDC', secondary: '#000000' },
  'inter': { primary: '#009DDC', secondary: '#000000' },
  'napoli': { primary: '#12A0D7', secondary: '#FFFFFF' },
  'as roma': { primary: '#8E1F2F', secondary: '#F5A623' },
  'roma': { primary: '#8E1F2F', secondary: '#F5A623' },
  'paris saint germain': { primary: '#004170', secondary: '#DA291C' },
  'psg': { primary: '#004170', secondary: '#DA291C' },
  'benfica': { primary: '#E20714', secondary: '#FFFFFF' },
  'sporting cp': { primary: '#006847', secondary: '#FFFFFF' },
  'porto': { primary: '#003DA5', secondary: '#FFFFFF' },
  'fc porto': { primary: '#003DA5', secondary: '#FFFFFF' },
  'celtic': { primary: '#00843D', secondary: '#FFFFFF' },
  'rangers': { primary: '#0000FF', secondary: '#FFFFFF' },
};

const DEFAULT_COLOURS: Colours = { primary: '#334155', secondary: '#94a3b8' };

export function getTeamColours(teamId: number, teamName?: string): Colours {
  // Try ID first
  const byId = TEAM_COLOURS_BY_ID[teamId];
  if (byId) return byId;

  // Try name (case-insensitive)
  if (teamName) {
    const byName = TEAM_COLOURS_BY_NAME[teamName.toLowerCase()];
    if (byName) return byName;
  }

  return DEFAULT_COLOURS;
}

export function getTeamGradient(homeTeamId: number, awayTeamId: number, homeTeamName?: string, awayTeamName?: string): string {
  const home = getTeamColours(homeTeamId, homeTeamName);
  const away = getTeamColours(awayTeamId, awayTeamName);
  return `linear-gradient(135deg, ${home.primary}40 0%, transparent 50%, ${away.primary}40 100%)`;
}
