import type { TagCategory, TrahType, RegionStatusType } from '@/lib/geo';

export interface JawirTagItem {
  id: string;
  jawirNumber: number;
  nickname: string;
  statusTag: string;
  category: TagCategory;
  trah: TrahType;
  regionStatus: RegionStatusType;
  lat: number;
  lng: number;
  distanceKm: number;
  coffeeCount: number;
  createdAt: string;
  deviceHash?: string;
  ipHash?: string;
  ownerHash?: string | null;
}

// What the API may send to browsers: never the device, IP or owner hashes.
export type PublicTag = Omit<JawirTagItem, 'deviceHash' | 'ipHash' | 'ownerHash'>;

// Shared across route bundles; globalThis keeps one copy per server process.
const g = globalThis as unknown as {
  __jawirMemoryStore?: JawirTagItem[];
  __jawirCoffeeVotes?: Set<string>;
  __jawirCoffeeLog?: { ipHash: string; at: number }[];
  __jawirLastNumber?: number;
};

// Mirrors the database counter: only grows, so deleting the newest pin never frees its number.
export function nextMemoryJawirNumber(): number {
  const max = memoryStore.reduce((m, t) => Math.max(m, t.jawirNumber), 0);
  g.__jawirLastNumber = Math.max(g.__jawirLastNumber ?? 0, max) + 1;
  return g.__jawirLastNumber;
}

export const memoryStore: JawirTagItem[] = (g.__jawirMemoryStore ??= [
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df001',
    jawirNumber: 1,
    nickname: 'Mas Agus (Toronto)',
    statusTag: 'Nguli neng Toronto adhem pol lur, butuh wedang jahe sachet.',
    category: 'pejuang_rupiah',
    trah: 'ngapak',
    regionStatus: 'internasional',
    lat: 43.6532,
    lng: -79.3832,
    distanceKm: 14820,
    coffeeCount: 18,
    createdAt: '2026-11-02T15:30:00.000Z',
    deviceHash: 'mock-hash-1',
  },
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df002',
    jawirNumber: 2,
    nickname: 'Cak Dimas',
    statusTag: 'Shinjuku rame nanging sepi tanpamu dek. Sopo gelem mabar?',
    category: 'cari_kawan',
    trah: 'arekan',
    regionStatus: 'internasional',
    lat: 35.6762,
    lng: 139.6503,
    distanceKm: 5420,
    coffeeCount: 31,
    createdAt: '2026-11-02T18:15:00.000Z',
    deviceHash: 'mock-hash-2',
  },
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df003',
    jawirNumber: 3,
    nickname: 'Kang Tejo',
    statusTag: 'Ngopi flat white rasa kopi tubruk klotok. Salam arek rantau!',
    category: 'eksis',
    trah: 'mataraman',
    regionStatus: 'internasional',
    lat: -37.8136,
    lng: 144.9631,
    distanceKm: 4810,
    coffeeCount: 12,
    createdAt: '2026-11-03T02:00:00.000Z',
    deviceHash: 'mock-hash-3',
  },
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df004',
    jawirNumber: 4,
    nickname: 'Budi Kos',
    statusTag: 'Infokan loker Golang/Nextjs area Jaksel lur, kosan meh entek.',
    category: 'pejuang_rupiah',
    trah: 'ngapak',
    regionStatus: 'sunda_empire',
    lat: -6.2088,
    lng: 106.8456,
    distanceKm: 502,
    coffeeCount: 45,
    createdAt: '2026-11-03T07:10:00.000Z',
    deviceHash: 'mock-hash-4',
  },
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df005',
    jawirNumber: 5,
    nickname: 'Mbak Rina IKN',
    statusTag: 'Pejuang proyek Nusantara gaspol. Infokan es teh jumbo cedhak kene!',
    category: 'butuh_info',
    trah: 'pantura',
    regionStatus: 'antarpulau',
    lat: -1.2421,
    lng: 116.8529,
    distanceKm: 940,
    coffeeCount: 22,
    createdAt: '2026-11-03T08:25:00.000Z',
    deviceHash: 'mock-hash-5',
  },
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df006',
    jawirNumber: 6,
    nickname: 'Pakde Bowo',
    statusTag: 'Cak, bebek sinjay sek buka po ora iki? Luwe pol.',
    category: 'cari_kawan',
    trah: 'arekan',
    regionStatus: 'kandang',
    lat: -7.2575,
    lng: 112.7521,
    distanceKm: 178,
    coffeeCount: 9,
    createdAt: '2026-11-03T09:00:00.000Z',
    deviceHash: 'mock-hash-6',
  },
  {
    id: 'f941fba3-34e7-4b72-b7e1-9571fa0df007',
    jawirNumber: 7,
    nickname: 'Mas Joko Kaki Lawu',
    statusTag: 'Monggo pinarak neng warung Mbok Yem lur. Anget-anget sego pecel.',
    category: 'eksis',
    trah: 'mataraman',
    regionStatus: 'kandang',
    lat: -7.631,
    lng: 111.191,
    distanceKm: 1,
    coffeeCount: 77,
    createdAt: '2026-11-03T09:40:00.000Z',
    deviceHash: 'mock-hash-7',
  },
]);

// Keys are `${tagId}:${deviceHash}`.
export const memoryCoffeeVotes: Set<string> = (g.__jawirCoffeeVotes ??= new Set<string>());

// Vote times per IP hash, for the hourly coffee limit.
export const memoryCoffeeLog: { ipHash: string; at: number }[] = (g.__jawirCoffeeLog ??= []);
