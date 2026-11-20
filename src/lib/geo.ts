export const LAWU_CENTER = {
  name: 'Pucak Gunung Lawu',
  fullName: 'Pucak Gunung Lawu (Titik 0 Tanah Jawa)',
  lat: -7.625,
  lng: 111.1925,
  elevation: '3.265 mdpl',
  lore: 'Pusering kabudayan Tanah Jawi, wonten ing tapel wates Karanganyar kaliyan Magetan. Benang abrit saha tebihipun sedaya Jawir dipunukur saking pucak punika.',
};

export function fuzzCoordinate(coord: number): number {
  const minOffset = 0.0025;
  const maxOffset = 0.0065;
  const sign = Math.random() < 0.5 ? -1 : 1;
  const offset = minOffset + Math.random() * (maxOffset - minOffset);
  return Number((coord + sign * offset).toFixed(6));
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Radius bumi dalam KM
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calculateDistanceFromLawu(lat: number, lng: number): number {
  return calculateDistanceKm(lat, lng, LAWU_CENTER.lat, LAWU_CENTER.lng);
}

export type RegionStatusType = 'kandang' | 'sunda_empire' | 'antarpulau' | 'internasional';

export function detectRegionStatus(lat: number, lng: number): RegionStatusType {
  // 1. Cek apakah berada di dalam Pulau Jawa & Madura
  const isInsideJavaIsland = lat >= -8.85 && lat <= -5.8 && lng >= 105.0 && lng <= 114.65;

  if (isInsideJavaIsland) {
    // Garis batas kultural Sunda-Jawa di sekitar bujur 108.80 (Brebes/Cilacap ke barat)
    if (lng < 108.8) {
      return 'sunda_empire'; // Jawa Barat, DKI Jakarta, Banten
    }
    return 'kandang'; // Jawa Tengah, DIY, Jawa Timur, Madura
  }

  // 2. Cek apakah di dalam wilayah Kepulauan Indonesia (Nusantara)
  const isInsideIndonesia = lat >= -11.2 && lat <= 6.1 && lng >= 95.0 && lng <= 141.05;
  const isSingaporeOrJohor = lat >= 1.15 && lat <= 6.5 && lng >= 100.0 && lng <= 104.5;
  const isEastMalaysiaOrBrunei =
    lat >= 1.5 && lat <= 7.0 && lng >= 109.5 && lng <= 119.5 && (lat > 4.2 || lng < 115.5);

  if (isInsideIndonesia && !isSingaporeOrJohor && !isEastMalaysiaOrBrunei) {
    return 'antarpulau';
  }

  // 3. Luar Negeri
  return 'internasional';
}

// One neutral chip style: region is told apart by icon and label, not by hue.
const CHIP = 'bg-[#f5f0e6] text-[#44403c] border-[#d6c7b2]';

export const REGION_BADGE_MAP: Record<
  RegionStatusType,
  { label: string; badgeClass: string; icon: string; desc: string }
> = {
  kandang: {
    label: 'Jawir Kandang',
    icon: '🏠',
    badgeClass: CHIP,
    desc: 'Isih neng kandang dhewe: Jateng, DIY, Jatim, Madura. Mulih cukup numpak bis.',
  },
  sunda_empire: {
    label: 'Rantau Lv.1 (Sunda Empire)',
    icon: '🏕️',
    badgeClass: CHIP,
    desc: 'Jabar, Banten, Jabodetabek. Wis wani adoh saka sambel bawang.',
  },
  antarpulau: {
    label: 'Rantau Nyabrang Pulo',
    icon: '⛴️',
    badgeClass: CHIP,
    desc: 'Sumatra, Kalimantan, Sulawesi, Bali, nganti Papua. Mulih kudu nyabrang segara.',
  },
  internasional: {
    label: 'Cabang Manca Negara',
    icon: '🌍',
    badgeClass: CHIP,
    desc: 'Asia, Australia, Timur Tengah, Eropa, Amerika. Mulih kudu nabung setaun.',
  },
};

// Great-circle points from a to b, longitudes unwrapped so Leaflet draws one continuous arc.
export function greatCirclePath(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  steps = 64
): [number, number][] {
  const r = Math.PI / 180;
  const [φ1, λ1, φ2, λ2] = [a.lat * r, a.lng * r, b.lat * r, b.lng * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d < 1e-6) return [[a.lat, a.lng], [b.lat, b.lng]];

  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    let lng = Math.atan2(y, x) / r;
    if (pts.length) {
      const prev = pts[pts.length - 1][1];
      while (lng - prev > 180) lng -= 360;
      while (lng - prev < -180) lng += 360;
    }
    pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / r, lng]);
  }
  return pts;
}

export type TagCategory = 'pejuang_rupiah' | 'cari_kawan' | 'butuh_info' | 'eksis';

export const CATEGORY_MAP: Record<
  TagCategory,
  { label: string; icon: string; color: string; badgeClass: string; pinHex: string }
> = {
  pejuang_rupiah: {
    label: 'Nyambut Gawe',
    icon: '💼',
    color: 'amber',
    badgeClass: CHIP,
    pinHex: '#b45309',
  },
  cari_kawan: {
    label: 'Golek Konco',
    icon: '☕',
    color: 'orange',
    badgeClass: CHIP,
    pinHex: '#c2410c',
  },
  butuh_info: {
    label: 'Butuh Info',
    icon: '🙋',
    color: 'red',
    badgeClass: CHIP,
    pinHex: '#991b1b',
  },
  eksis: {
    label: 'Mung Absen',
    icon: '🗿',
    color: 'stone',
    badgeClass: CHIP,
    pinHex: '#57534e',
  },
};

export type TrahType = 'mataraman' | 'ngapak' | 'arekan' | 'pantura' | 'rantau_lahir' | 'simpatisan';

export const TRAH_MAP: Record<
  TrahType,
  { label: string; icon: string; desc: string; badgeClass: string }
> = {
  mataraman: {
    label: 'Trah Mataraman',
    icon: '⚔️',
    desc: 'Solo, Jogja, Madiun, Kediri, sakubenge Lawu',
    badgeClass: CHIP,
  },
  ngapak: {
    label: 'Trah Ngapak',
    icon: '🗣️',
    desc: 'Banyumas, Tegal, Brebes, Cilacap, Kebumen',
    badgeClass: CHIP,
  },
  arekan: {
    label: 'Trah Arekan & Tapal Kuda',
    icon: '🔥',
    desc: 'Surabaya, Malang, Jember, Banyuwangi',
    badgeClass: CHIP,
  },
  pantura: {
    label: 'Trah Pantura & Muria',
    icon: '🌊',
    desc: 'Semarang, Kudus, Pati, Pekalongan, Rembang',
    badgeClass: CHIP,
  },
  rantau_lahir: {
    label: 'Lair neng Rantau',
    icon: '🌱',
    desc: 'Getih Jawa, lair neng rantau, basa Jawane rada kaku',
    badgeClass: CHIP,
  },
  simpatisan: {
    label: 'Simpatisan / Dudu Jawir',
    icon: '🤝',
    desc: 'Dudu Jawa, nanging wis doyan sambel lan tresna Jawa',
    badgeClass: CHIP,
  },
};

export interface NpcPin {
  id: string;
  isNpc: true;
  jawirNumber?: number;
  nickname: string;
  title: string;
  glyph: string;
  lore: string;
  unlockHint: string;
  statusTag: string;
  category: TagCategory;
  trah: TrahType;
  regionStatus: RegionStatusType;
  lat: number;
  lng: number;
  distanceKm: number;
  coffeeCount: number;
  createdAt: string;
}

export const NPC_PINS: NpcPin[] = [
  {
    id: 'npc-bermuda',
    isNpc: true,
    nickname: 'Mbah Bejo (Bermuda)',
    title: 'Juru Kunci Segitiga Bermuda',
    glyph: '🌀',
    lore:
      'Jarene kapal lan pesawat sing liwat kene ilang tanpa pamit. Mbah Bejo mung ngguyu, sing ilang kuwi mesthi lagi ngaso ngopi neng angkringan sing ora ana neng peta.',
    unlockHint: 'Disowan 1x, entuk cap visa',
    statusTag: 'Sampeyan nyasar kadohan lur, cepet balik kanan saiki!',
    category: 'eksis',
    trah: 'mataraman',
    regionStatus: 'internasional',
    lat: 25.0,
    lng: -71.0,
    distanceKm: calculateDistanceFromLawu(25.0, -71.0),
    coffeeCount: 42,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'npc-antarctica',
    isNpc: true,
    nickname: 'Pengurus Cabang Penguin',
    title: 'Juru Kunci Cabang Antartika',
    glyph: '🐧',
    lore:
      'Papan paling adem sak donya, nanging paguyuban Jawir isih wae tau rapat neng kene. Sing teka dikon nggawa sarung lan wedang jahe dewe.',
    unlockHint: 'Disowan 1x, entuk cap visa',
    statusTag: 'Paguyuban Cabang Antartika. Infokan angkringan paling cedhak, adem pol!',
    category: 'butuh_info',
    trah: 'arekan',
    regionStatus: 'internasional',
    lat: -82.8628,
    lng: 135.0,
    distanceKm: calculateDistanceFromLawu(-82.8628, 135.0),
    coffeeCount: 88,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'npc-area51',
    isNpc: true,
    nickname: 'Agen Rahasia Ngapak',
    title: 'Juru Kunci Area 51',
    glyph: '🛸',
    lore:
      'Pager dhuwur, papan larangan, nanging gudeg kaleng isih kudu mlebu. Agen Ngapak kandha, alien kuwi ya sedulur, mung durung kenal sambel.',
    unlockHint: 'Disowan 1x, entuk cap visa',
    statusTag: 'Lagi nyamar dadi alien lur. Infokan gudeg kaleng kirim mrene.',
    category: 'pejuang_rupiah',
    trah: 'ngapak',
    regionStatus: 'internasional',
    lat: 37.2431,
    lng: -115.793,
    distanceKm: calculateDistanceFromLawu(37.2431, -115.793),
    coffeeCount: 65,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'npc-pyongyang',
    isNpc: true,
    nickname: 'Slamet Sumber Kencono',
    title: 'Juru Kunci Terminal Pyongyang',
    glyph: '🚌',
    lore:
      'Bus Sumber Kencono sing salah jurusan kuwi ngerti dalan nganti tekan kene. Sopire isih ngenteni penumpang sing arep mulih menyang Jawa.',
    unlockHint: 'Disowan 1x, entuk cap visa',
    statusTag: 'Gak iso mulih lur, salah numpak bus Sumber Kencono bablas tekan Pyongyang.',
    category: 'cari_kawan',
    trah: 'pantura',
    regionStatus: 'internasional',
    lat: 39.0392,
    lng: 125.7625,
    distanceKm: calculateDistanceFromLawu(39.0392, 125.7625),
    coffeeCount: 99,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
];
