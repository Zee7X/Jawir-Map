// Shared by the TagModal (live check) and /api/tags (authoritative check). Keep it dependency-free.

const URL_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\b[a-zA-Z0-9-]+\.(com|org|net|xyz|me|vip|top|live|site|id|cc|info|app|online)\b/i,
  /t\.me\//i,
  /wa\.me\//i,
  /bit\.ly\//i,
];

// 9+ digits once spaces, dots and dashes are ignored: 0812 3456 7890, +62-812-3456-7890
const PHONE_PATTERN = /\+?\d(?:[\s.\-]?\d){8,}/;
// @handle at a word start; "g@nja" does not count because a letter precedes the @
const HANDLE_PATTERN = /(?:^|[^a-z0-9_])@[a-z0-9_.]{3,}/i;

const JUDOL_KEYWORDS = [
  'slot',
  'gacor',
  'maxwin',
  'zeus',
  'pragmatic',
  'depo',
  'wd',
  'scatter',
  'judol',
  'judi',
  'togel',
  'toto',
  'jackpot',
  'rtp',
  'sensasional',
  'olympus',
  'mahjong ways',
  'link alternatif',
  'casino',
  'kasino',
  'poker',
  'domino qq',
  'dominoqq',
  'bandarq',
  'sbobet',
  'parlay',
  'taruhan',
];

const NARKOBA_KEYWORDS = [
  'ganja',
  'gele',
  'cimeng',
  'marijuana',
  'weed',
  'sabu',
  'sabu-sabu',
  'shabu',
  'meth',
  'ekstasi',
  'ekstasy',
  'inex',
  'kokain',
  'cocaine',
  'heroin',
  'putaw',
  'tembakau gorila',
  'sinte',
  'pil koplo',
  'tramadol',
  'xanax',
];

// Conservative on purpose: slurs and calls for violence only.
const SARA_KEYWORDS = [
  'kafir',
  'cina babi',
  'cindo',
  'pribumi asli',
  'antek asing',
  'aseng',
  'arab onta',
  'onta arab',
  'dasar onta',
  'nigga',
  'nigger',
  'teroris',
];

const PROHIBITED_WORDS = [
  'anjing',
  'anjir',
  'anjay',
  'asu',
  'bangsat',
  'bajingan',
  'kontol',
  'memek',
  'ngentot',
  'entot',
  'jembut',
  'pepek',
  'peler',
  'titit',
  'tolol',
  'goblok',
  'goblog',
  'bego',
  'idiot',
  'kampret',
  'jancok',
  'jancuk',
  'dancok',
  'cok',
  'cuk',
  'jamput',
  'matamu',
  'raimu',
  'ndasmu',
  'gathel',
  'tai',
  'taek',
  'telek',
  'kimak',
  'pukimak',
  'perek',
  'lonte',
  'pelacur',
  'bencong',
  'banci',
  'open bo',
  'bokep',
  'sange',
  'ngewe',
  'anjrit',
  'kontl',
  'kntl',
  'ngentd',
  'ngntd',
];

// Spelling variants of the kasar list, built once at load: final t/d and k/q/g swap, and e/i in
// the last vowel (ngentot/ngentod, jancok/jancoq, anjing/anjeng). "g" is skipped on short words
// so "cok" does not grow "cog".
const FINAL_SWAPS: Record<string, string[]> = { t: ['d'], d: ['t'], k: ['q', 'g'], q: ['k', 'g'], g: ['k', 'q'] };
const VOWEL_SWAPS: Record<string, string> = { e: 'i', i: 'e' };

function withSpellingVariants(words: string[]): string[] {
  const out = new Set(words);
  for (const w of words) {
    if (!/^[a-z]+$/.test(w)) continue;
    const bases = [w];
    const m = w.match(/^(.*)([aeiou])([^aeiou]*)$/);
    if (m && VOWEL_SWAPS[m[2]]) bases.push(m[1] + VOWEL_SWAPS[m[2]] + m[3]);
    for (const b of bases) {
      out.add(b);
      for (const s of FINAL_SWAPS[b.slice(-1)] ?? []) {
        if (s !== 'g' || b.length >= 5) out.add(b.slice(0, -1) + s);
      }
    }
  }
  return Array.from(out);
}

// Real phrases that contain a listed term ("tai chi"); removed before matching.
const ALLOW_PHRASES = /\b(?:tai[\s-]?chi|thai)\b/g;

// Phrases checked against the space-joined tokens. "bakar" and "babi" are everyday words,
// so only calls for violence against a target and insult shapes are blocked.
const SARA_PATTERNS = [
  /\b(bunuh|bakar|gorok|habisi) (cina|china|cindo|kafir|aseng|jawa|batak|madura|papua|tionghoa|gereja|masjid|pura|vihara|klenteng|orang|mereka)\b/,
];
const INSULT_PATTERNS = [
  /\b(dasar|kamu|kowe|koe|kon|kau|lu|lo|elu|si|anjing) babi\b/,
  /\bbabi (lu|lo|kau|kamu|kowe|koe|ngepet|jancok|banget)\b/,
  /^ babi $/,
];

const REASON_LINK = 'Ojo nyebar link, lur. Iki peta, dudu grup WA.';
const REASON_CONTACT = 'Ojo nyelipke nomer HP utawa akun medsos, lur. Iki peta, dudu papan iklan.';
const REASON_JUDOL = 'Ana mambu promosi utawa judol. Ditolak.';
const REASON_NARKOBA = 'Ojo nyebut barang haram neng kene, lur. Ditolak.';
const REASON_SARA = 'Ojo ngina suku, agama, utawa wong liya, lur. Peta iki kanggo kabeh sedulur.';
const REASON_SARU = 'Ana tembung sing saru. Mbok yo sing sopan, lur.';

// Real words that would collapse into a listed term ("cook" -> "cok"); never collapsed.
const SAFE_TOKENS = new Set(['cook', 'cooks', 'peeler', 'heroine', 'heroines']);
// Endings people glue on: asumu, anjingne, tainya, kontolku.
const SUFFIXES = ['mu', 'ne', 'nya', 'ku'];

const LEET: Record<string, string> = {
  '4': 'a', '@': 'a', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '0': 'o',
  '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g', '2': 'z',
};
const SYMBOL_LEET = '@!|$';

// Lowercase, strip diacritics and zero-width chars, map leetspeak chunk by chunk.
// symbols=false treats @ ! | $ as separators, so "asu!" stays "asu".
function fold(raw: string, symbols: boolean): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u00ad\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(ALLOW_PHRASES, ' ')
    // trailing "2" is reduplication ("sabu2"), not leet "z"; this must run before the leet map
    .replace(/\b([a-z][a-z0-9@$!|]{2,})2\b/g, '$1')
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s*$/.test(chunk)) return ' ';
      // chunks without letters ("2024", "0812-3456") would only add leet noise
      if (!/[a-z]/.test(chunk)) return ' ';
      return Array.from(chunk, (c) => (c in LEET && (symbols || !SYMBOL_LEET.includes(c)) ? LEET[c] : c)).join('');
    })
    .join('');
}

const COLLAPSERS: Array<(t: string) => string> = [
  (t) => t,
  (t) => t.replace(/([a-z])\1{2,}/g, '$1'),
  (t) => t.replace(/([a-z])\1{2,}/g, '$1$1'),
  (t) => t.replace(/([a-z])\1+/g, '$1'),
];
const FULL_COLLAPSE = 3;

interface Variant {
  tokens: string[];
  full: boolean;
}

function variantsOf(raw: string): Variant[] {
  const out: Variant[] = [];
  for (const symbols of [true, false]) {
    const base = fold(raw, symbols).split(/[^a-z]+/).filter(Boolean);
    COLLAPSERS.forEach((collapse, i) => {
      out.push({ tokens: base.map((t) => (SAFE_TOKENS.has(t) ? t : collapse(t))), full: i === FULL_COLLAPSE });
    });
  }
  return out;
}

// "a s u" / "j.a.n.c.o.k": runs of single letters joined into one word.
function singleLetterRuns(tokens: string[]): string[] {
  const runs: string[] = [];
  let cur = '';
  for (const t of [...tokens, '']) {
    if (t.length === 1) {
      cur += t;
      continue;
    }
    if (cur.length > 1) runs.push(cur);
    cur = '';
  }
  return runs;
}

interface Matcher {
  reason: string;
  short: string[]; // up to 4 letters: whole-token match only
  long: string[]; // 5+ letters, spaces removed, repeats collapsed: compact match
}

function matcher(reason: string, words: string[]): Matcher {
  const short: string[] = [];
  const long: string[] = [];
  for (const w of words) {
    const letters = w.replace(/[^a-z]/g, '');
    if (letters.length <= 4) short.push(letters);
    else long.push(letters.replace(/([a-z])\1+/g, '$1'));
  }
  return { reason, short, long };
}

const withSuffix = (tok: string, term: string) => tok === term || SUFFIXES.some((s) => tok === term + s);

function shortHit(m: Matcher, tokens: string[]): boolean {
  const cands = [...tokens, ...singleLetterRuns(tokens)];
  return m.short.some((w) => cands.some((t) => withSuffix(t, w)));
}

// Compact pass over the collapsed text. A match inside one token needs 6+ letters (or the exact
// word plus a suffix), so "ganjal" and "perekonomian" survive. A match across tokens must start
// and end on token edges: "a.n.j.i.n.g" is caught, "ban cinta" does not become "banci".
function longHit(m: Matcher, tokens: string[]): boolean {
  const compact = tokens.join('');
  const owner: number[] = [];
  tokens.forEach((t, i) => {
    for (let k = 0; k < t.length; k++) owner.push(i);
  });
  for (const term of m.long) {
    for (let s = compact.indexOf(term); s >= 0; s = compact.indexOf(term, s + 1)) {
      const e = s + term.length - 1;
      const a = owner[s];
      const b = owner[e];
      if (a === b) {
        if (term.length >= 6 || withSuffix(tokens[a], term)) return true;
      } else if ((s === 0 || owner[s - 1] !== a) && (e === owner.length - 1 || owner[e + 1] !== b)) {
        return true;
      }
    }
  }
  return false;
}

const GROUPS = [
  matcher(REASON_JUDOL, JUDOL_KEYWORDS),
  matcher(REASON_NARKOBA, NARKOBA_KEYWORDS),
  matcher(REASON_SARA, SARA_KEYWORDS),
  matcher(REASON_SARU, withSpellingVariants(PROHIBITED_WORDS)),
];

export function isCleanText(text: string): { clean: boolean; reason?: string } {
  const trimmed = text.trim();

  for (const pattern of URL_PATTERNS) {
    if (pattern.test(trimmed)) return { clean: false, reason: REASON_LINK };
  }

  if (PHONE_PATTERN.test(trimmed) || HANDLE_PATTERN.test(trimmed)) {
    return { clean: false, reason: REASON_CONTACT };
  }

  // fold() drops digit-only chunks, so the bare number 420 is checked on the raw text.
  if (/(^|[^\d])420([^\d]|$)/.test(trimmed)) return { clean: false, reason: REASON_NARKOBA };

  const variants = variantsOf(trimmed);

  for (const g of GROUPS) {
    if (variants.some((v) => shortHit(g, v.tokens) || (v.full && longHit(g, v.tokens)))) {
      return { clean: false, reason: g.reason };
    }
  }

  for (const v of variants) {
    const spaced = ` ${v.tokens.join(' ')} `;
    if (SARA_PATTERNS.some((p) => p.test(spaced))) return { clean: false, reason: REASON_SARA };
    if (INSULT_PATTERNS.some((p) => p.test(spaced))) return { clean: false, reason: REASON_SARU };
  }

  return { clean: true };
}
