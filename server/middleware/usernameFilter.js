/**
 * Username & Display Name Filter
 *
 * Blocks usernames that look like real names, contain PII patterns,
 * or match common name databases. Designed for COPPA compliance.
 */

const COMMON_FIRST_NAMES = new Set([
  'james','john','robert','michael','david','william','richard','joseph','thomas','charles',
  'christopher','daniel','matthew','anthony','mark','donald','steven','paul','andrew','joshua',
  'kenneth','kevin','brian','george','timothy','ronald','edward','jason','jeffrey','ryan',
  'jacob','gary','nicholas','eric','jonathan','stephen','larry','justin','scott','brandon',
  'benjamin','samuel','raymond','gregory','frank','alexander','patrick','jack','dennis','jerry',
  'tyler','aaron','jose','adam','nathan','henry','peter','zachary','douglas','harold',
  'mary','patricia','jennifer','linda','barbara','elizabeth','susan','jessica','sarah','karen',
  'lisa','nancy','betty','margaret','sandra','ashley','dorothy','kimberly','emily','donna',
  'michelle','carol','amanda','melissa','deborah','stephanie','rebecca','sharon','laura','cynthia',
  'kathleen','amy','angela','shirley','anna','brenda','pamela','emma','nicole','helen',
  'samantha','katherine','christine','debra','rachel','carolyn','janet','catherine','maria','heather',
  'diane','ruth','julie','olivia','joyce','virginia','victoria','kelly','lauren','christina',
  'sophia','isabella','mia','charlotte','amelia','harper','evelyn','abigail','ella','avery',
  'scarlett','grace','chloe','riley','layla','zoey','nora','lily','eleanor','hannah',
  'lillian','addison','aubrey','ellie','stella','natalie','zoe','leah','hazel','violet',
  'aurora','savannah','audrey','brooklyn','bella','claire','skylar','lucy','paisley','everly',
  'liam','noah','oliver','elijah','lucas','mason','logan','aiden','ethan','jackson',
  'sebastian','caleb','owen','wyatt','luke','jayden','dylan','grayson','levi','isaac',
  'gabriel','julian','mateo','anthony','jaxon','lincoln','leo','asher','cooper','ezra',
  'maverick','adrian','carson','nolan','jordan','colton','evan','parker','connor','miles',
  'jake','max','ben','sam','alex','charlie','finn','kai','zane','cole',
  'kate','maddie','izzy','ally','abby','sara','anna','emma','mia','ava',
]);

const COMMON_LAST_NAMES = new Set([
  'smith','johnson','williams','brown','jones','garcia','miller','davis','rodriguez','martinez',
  'hernandez','lopez','gonzalez','wilson','anderson','thomas','taylor','moore','jackson','martin',
  'lee','perez','thompson','white','harris','sanchez','clark','ramirez','lewis','robinson',
  'walker','young','allen','king','wright','scott','torres','nguyen','hill','flores',
  'green','adams','nelson','baker','hall','rivera','campbell','mitchell','carter','roberts',
]);

const LAST_NAME_PATTERNS = [
  /^(mc|mac|o'|de|van|von|al|el|la|le|di|da|du|st)\s*[a-z]+$/i,
];

// Patterns that suggest PII in a username
const PII_PATTERNS = [
  /\b\d{5}\b/,              // ZIP code
  /\d{3}[\-.]?\d{4}/,       // partial phone
  /\b(19|20)\d{2}\b/,       // birth year
  /\b(1st|2nd|3rd|\d+th)\s*grade/i,
  /\b(school|elementary|middle|high)\b/i,
];

/**
 * Check if a username or display name looks like a real name or contains PII.
 * Returns { blocked: boolean, reason?: string }
 */
export function filterUsername(name) {
  if (!name || typeof name !== 'string') return { blocked: false };

  const lower = name.toLowerCase().trim();

  // Split on separators AND camelCase boundaries (e.g., "JohnSmith" → ["john","smith"])
  const camelSplit = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  const parts = camelSplit.toLowerCase().replace(/[_\-\.]/g, ' ').split(/\s+/).filter(Boolean);

  // Two-part name where first is a common first name and second is a first or last name
  if (parts.length === 2) {
    const isFirstName = COMMON_FIRST_NAMES.has(parts[0]);
    const secondIsName = COMMON_FIRST_NAMES.has(parts[1]) || COMMON_LAST_NAMES.has(parts[1]);
    if (isFirstName && secondIsName) {
      return { blocked: true, reason: 'This looks like a real name. Pick a fun nickname instead!' };
    }
    if (isFirstName) {
      for (const re of LAST_NAME_PATTERNS) {
        if (re.test(parts[1])) {
          return { blocked: true, reason: 'This looks like a real name. Pick a fun nickname instead!' };
        }
      }
    }
  }

  // Single common first name combined with numbers (like "sarah2013")
  const nameOnly = lower.replace(/[0-9_\-\.]/g, '');
  const numbers = lower.replace(/[^0-9]/g, '');
  if (nameOnly.length >= 3 && COMMON_FIRST_NAMES.has(nameOnly) && numbers.length >= 4) {
    const yearNum = parseInt(numbers.slice(0, 4), 10);
    if (yearNum >= 2005 && yearNum <= 2025) {
      return { blocked: true, reason: 'Avoid using your real name and birth year. Pick something creative!' };
    }
  }

  // PII patterns
  for (const re of PII_PATTERNS) {
    if (re.test(lower)) {
      return { blocked: true, reason: 'Your username contains personal information. Pick something that doesn\'t reveal info about you!' };
    }
  }

  return { blocked: false };
}
