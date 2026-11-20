// Indonesian for the chrome strings. Keys are the exact Javanese source strings; {name} placeholders must match.
// Strings that read the same in Indonesian (Klasemen, Batal, Tutup, Titikku, Paspor Jawirku, ...) have no entry and fall back.
export const ID_CHROME: Record<string, string> = {
  // TopStatsBar
  'Ngitung sedulur…': 'Menghitung sedulur…',
  kacathet: 'tercatat',
  'Mabur menyang rekor paling adoh': 'Terbang ke rekor terjauh',
  'Rekor paling adoh': 'Rekor terjauh',
  'Golek sedulur lan saring peta': 'Cari sedulur dan saring peta',
  Golek: 'Cari',
  '{n} saringan aktif': '{n} filter aktif',

  // BottomActionBar
  'Milih titik neng peta': 'Memilih titik di peta',
  '{km} km saka Lawu': '{km} km dari Lawu',
  'Maca peta…': 'Membaca peta…',
  'Zoom-in dhisik, ben ora salah kecamatan.': 'Zoom-in dulu, biar nggak salah kecamatan.',
  'Titik bakal digeser ±500 m kanggo privasimu.': 'Titik bakal digeser ±500 m demi privasimu.',
  'Pasang neng kene': 'Pasang di sini',
  'nitip kopi wiwit kowe mampir pungkasan. Saiki total': 'nitip kopi sejak kamu terakhir mampir. Sekarang total',
  Deleng: 'Lihat',
  ana: 'ada',
  'neng radius {km} km! Ayo ngopi bareng.': 'dalam radius {km} km! Yuk ngopi bareng.',
  'sepi nyenyet. Sedulur paling cedhak': 'sepi banget. Sedulur terdekat',
  'Menyang titikku': 'Ke titikku',
  'Tancepke pin': 'Tancap pin',
  'Menyang Pucak Lawu': 'Ke Puncak Lawu',
  'Mlumpat menyang Jawir sembarang': 'Lompat ke Jawir acak',
  Ngacak: 'Acak',

  // MapWrapper loading screen
  'Sabar lur, petane lagi digelar…': 'Sabar ya, petanya lagi digelar…',
  'Pin-pin sedulur lagi dikumpulke': 'Pin-pin sedulur lagi dikumpulin',

  // JawirMapApp: error banner, filter pill, news ticker, handler fallbacks
  'Pin-pin sedulur gagal diundhuh. Sinyalmu utawa servere lagi ngadat.':
    'Pin-pin sedulur gagal diunduh. Sinyalmu atau servernya lagi ngadat.',
  'Jajal maneh': 'Coba lagi',
  '🔎 Nyaring:': '🔎 Menyaring:',
  saka: 'dari',
  '{name}, {km} km saka Lawu.': '{name}, {km} km dari Lawu.',
  Mabur: 'Terbang',
  'Pine gagal dibusak. Jajal maneh, lur.': 'Pin gagal dihapus. Coba lagi ya, bro.',
  'Laporane gagal dikirim. Jajal maneh.': 'Laporan gagal dikirim. Coba lagi.',

  // leaderboard.ts trahWarLine
  '{icon} {trah} lagi mimpin, {n} bala. Trahmu endi?': '{icon} {trah} lagi memimpin, {n} pasukan. Trahmu mana?',
  '{trahs} imbang mimpin, {n} bala. Trahmu endi?': '{trahs} imbang di puncak, {n} pasukan. Trahmu mana?',
  '⚔ {trahs} imbang {n} bala. Ajak konco ben {trah} menang!': '⚔ {trahs} imbang {n} pasukan. Ajak teman biar {trah} menang!',
  '👑 {trah} lagi mimpin, unggul {n} bala. Jaga, ajak konco!': '👑 {trah} lagi memimpin, unggul {n} pasukan. Pertahankan, ajak teman!',
  '⚔ {trah} kalah {n} bala karo {leader}. Ayo nancep, ajak konco!':
    '⚔ {trah} kalah {n} pasukan dari {leader}. Ayo tancap pin, ajak teman!',

  // share.ts challengeText
  'Trah {trah} butuh bala, tancepke pinmu!': 'Trah {trah} butuh pasukan, tancapkan pinmu!',
  'Tancepke pinmu!': 'Tancapkan pinmu!',
  'Aku mung {km} km saka Pucak Lawu, isih mambu belerang. Kowe adoh piro?':
    'Aku cuma {km} km dari Puncak Lawu, masih bau belerang. Kamu sejauh apa?',
  'Aku {km} km saka Pucak Lawu. Kowe piro?': 'Aku {km} km dari Puncak Lawu. Kamu berapa?',
};
