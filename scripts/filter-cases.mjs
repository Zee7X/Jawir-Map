// Run: node --experimental-strip-types scripts/filter-cases.mjs
import { readFileSync } from 'node:fs';
import { isCleanText } from '../src/lib/filter.ts';

const BLOCK = [
  // kasar, plus leet/separator/repeat variants
  'anjing', '4njing', 'anjiiing', 'a.n.j.i.n.g', 'a n j i n g', 'ANJING', 'dasar anjing kowe',
  'anjir', '4su', 'asu', 'a s u', 'asuuu', 'a.s.u', 'asumu', 'bangsat', 'bajingan', 'dasar babi',
  'kontol', 'memek', 'ngentot', 'jembut', 'tolol', 'goblok', 'kampret', 'jancok', 'j4nc0k',
  'j.a.n.c.o.k', 'jancuk', 'dancok', 'cok', 'cuk', 'jamput', 'matamu', 'ndasmu', 'tai', 'taek',
  'kimak', 'pukimak', 'lonte', 'pelacur', 'bencong', 'bokep', 'open bo', 'kowe bego', 'asu!',
  // SARA
  'dasar kafir', 'cina babi', 'bunuh cina', 'bakar gereja', 'pribumi asli', 'antek asing', 'aseng', 'nigga', 'n1gg3r',
  'teroris',
  // judi
  'slot', 's l o t', 'slot gacor', 'g4c0r', 'maxwin', 'scatter hitam', 'zeus', 'olympus', 'pragmatic', 'togel', 't0gel',
  'toto', 'judi online', 'judol', 'casino', 'poker', 'domino qq', 'dominoqq', 'bandarq', 'sbobet', 'parlay',
  'taruhan', 'jackpot', 'rtp live', 'depo 10rb', 'wd cepat', 'link alternatif',
  // narkoba
  'ganja', 'g@nja', 'gele', 'cimeng', 'marijuana', 'weed', 'sabu', 'sabu-sabu', 'shabu', 'meth', 'ekstasi', 'inex',
  'kokain', 'cocaine', 'heroin', 'putaw', 'tembakau gorila', 'sinte', 'pil koplo', 'tramadol', 'xanax', '420',
  // spam/contact
  'https://x.id', 'www.toko', 'wa.me/62812', 'toko.com', '0812-3456-7890', '0812 3456 7890', '+62 812 3456 7890', '@jawirshop',
  'wa 08123456789',
  // spelling gaps: final t/d, k/q/g, e/i, dropped vowels, reduplication
  'ngentod', 'ngentd', 'entod', 'ngewe', 'kontl', 'kntl', 'memeq', 'jancuq', 'bangsad', 'anjeng', 'anjrit', 'sabu2',
  'sabu-sabu', 'jancoq', 'jancog', 'memeg', 'bangsatt', 'anjenk', 'anjeeeng', 'n g e n t o d', 'n9ent0d',
  'dasar bangsad', 'tai chi anjing', 'Sabu2 murah', 'g4nja2', 'kowe jancoq', 'dancoq', 'kimaq', 'goblog', 'asu-ransi',
];

const ALLOW = [
  'masuk angin', 'pasukan', 'kasur', 'kasus', 'asuransi', 'Asuhan', 'tasbih', 'sabun', 'ganjal', 'Depok', 'Bandung',
  'Semarang', 'Tiongkok', 'Cinere', 'slotan', 'bakso', 'kopi tubruk', 'kangen omah', 'Toronto', 'Shinjuku', 'Mas Agus',
  'Cak Dimas', 'Kang Tejo', 'Pakde Bowo', 'cook', 'perekonomian', 'ban cinta', 'ayam bakar', 'babi guling', 'Tahun 2024',
  'Lantai 3 no 12', 'Salam utawa kabarmu kanggo sedulur rantau', 'Gajian isih adoh', 'Sego pecel', 'Kangen sambel bawang',
  'Mbak Rina IKN', 'Budi Kos', 'Jl. Kaliurang km 5', 'Halo! Piye kabare?', 'Pak Eko dari Bekasi',
  'Tai Chi', 'tai-chi', 'taichi', 'Thai', 'Thai tea', 'Masuk angin', 'Mas Cokro', 'Cakra', 'pancasila',
  'cokelat', 'kamar2', 'warung2 enak', 'jalan2 sore', 'Anjani', 'Sabda', 'Bangsa Indonesia', 'ban cinta',
];

// Every seed nickname/statusTag, read straight from the source so the list never drifts.
for (const file of ['../src/lib/memoryStore.ts', '../src/lib/geo.ts']) {
  const src = readFileSync(new URL(file, import.meta.url), 'utf8');
  for (const m of src.matchAll(/(?:nickname|statusTag): '((?:[^'\\]|\\.)*)'/g)) ALLOW.push(m[1].replace(/\\'/g, "'"));
}

let failed = 0;
const run = (list, wantClean) => {
  for (const text of list) {
    const r = isCleanText(text);
    const ok = r.clean === wantClean && (wantClean || !!r.reason);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${wantClean ? 'allow' : 'block'} ${JSON.stringify(text)}${wantClean ? '' : ` -> ${r.reason ?? 'NOT BLOCKED'}`}`);
  }
};
run(BLOCK, false);
run(ALLOW, true);
console.log(`\n${BLOCK.length} block + ${ALLOW.length} allow cases, ${failed} failed`);
process.exit(failed ? 1 : 0);
