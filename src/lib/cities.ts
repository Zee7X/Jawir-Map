import { calculateDistanceKm } from '@/lib/geo';

// Cities where Jawir pins tend to land, used to name a pin's "kutha" for the city ranking.
// Pins farther than CITY_RADIUS_KM from every entry are left out of that ranking.
const CITIES: { name: string; lat: number; lng: number }[] = [
  // Jawa & Madura
  { name: 'Jakarta', lat: -6.2, lng: 106.85 },
  { name: 'Bekasi', lat: -6.24, lng: 107.0 },
  { name: 'Tangerang', lat: -6.18, lng: 106.63 },
  { name: 'Depok', lat: -6.4, lng: 106.82 },
  { name: 'Bogor', lat: -6.6, lng: 106.8 },
  { name: 'Bandung', lat: -6.91, lng: 107.61 },
  { name: 'Cirebon', lat: -6.71, lng: 108.56 },
  { name: 'Tegal', lat: -6.87, lng: 109.14 },
  { name: 'Purwokerto', lat: -7.42, lng: 109.24 },
  { name: 'Cilacap', lat: -7.73, lng: 109.0 },
  { name: 'Pekalongan', lat: -6.89, lng: 109.68 },
  { name: 'Semarang', lat: -6.97, lng: 110.42 },
  { name: 'Kudus', lat: -6.8, lng: 110.84 },
  { name: 'Magelang', lat: -7.47, lng: 110.22 },
  { name: 'Yogyakarta', lat: -7.8, lng: 110.36 },
  { name: 'Solo', lat: -7.57, lng: 110.82 },
  { name: 'Lawu', lat: -7.63, lng: 111.19 },
  { name: 'Madiun', lat: -7.63, lng: 111.52 },
  { name: 'Ponorogo', lat: -7.87, lng: 111.46 },
  { name: 'Kediri', lat: -7.82, lng: 112.01 },
  { name: 'Blitar', lat: -8.1, lng: 112.17 },
  { name: 'Malang', lat: -7.98, lng: 112.63 },
  { name: 'Surabaya', lat: -7.26, lng: 112.75 },
  { name: 'Madura', lat: -7.05, lng: 113.4 },
  { name: 'Jember', lat: -8.17, lng: 113.7 },
  { name: 'Banyuwangi', lat: -8.22, lng: 114.37 },
  // Nusantara
  { name: 'Medan', lat: 3.6, lng: 98.67 },
  { name: 'Pekanbaru', lat: 0.51, lng: 101.45 },
  { name: 'Batam', lat: 1.1, lng: 104.03 },
  { name: 'Palembang', lat: -2.98, lng: 104.76 },
  { name: 'Lampung', lat: -5.43, lng: 105.26 },
  { name: 'Pontianak', lat: -0.03, lng: 109.33 },
  { name: 'Banjarmasin', lat: -3.32, lng: 114.59 },
  { name: 'Balikpapan', lat: -1.27, lng: 116.83 },
  { name: 'IKN', lat: -0.97, lng: 116.71 },
  { name: 'Samarinda', lat: -0.5, lng: 117.15 },
  { name: 'Makassar', lat: -5.15, lng: 119.43 },
  { name: 'Manado', lat: 1.47, lng: 124.84 },
  { name: 'Denpasar', lat: -8.65, lng: 115.22 },
  { name: 'Mataram', lat: -8.58, lng: 116.12 },
  { name: 'Jayapura', lat: -2.53, lng: 140.72 },
  // Manca negara
  { name: 'Kuala Lumpur', lat: 3.14, lng: 101.69 },
  { name: 'Singapura', lat: 1.35, lng: 103.82 },
  { name: 'Hong Kong', lat: 22.32, lng: 114.17 },
  { name: 'Taipei', lat: 25.03, lng: 121.56 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Osaka', lat: 34.69, lng: 135.5 },
  { name: 'Seoul', lat: 37.57, lng: 126.98 },
  { name: 'Jeddah', lat: 21.49, lng: 39.19 },
  { name: 'Riyadh', lat: 24.71, lng: 46.68 },
  { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Melbourne', lat: -37.81, lng: 144.96 },
  { name: 'Perth', lat: -31.95, lng: 115.86 },
  { name: 'Nouméa', lat: -22.27, lng: 166.45 },
  { name: 'Amsterdam', lat: 52.37, lng: 4.9 },
  { name: 'Den Haag', lat: 52.08, lng: 4.3 },
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Berlin', lat: 52.52, lng: 13.4 },
  { name: 'Paramaribo', lat: 5.85, lng: -55.2 },
  { name: 'New York', lat: 40.71, lng: -74.0 },
  { name: 'Los Angeles', lat: 34.05, lng: -118.24 },
  { name: 'Toronto', lat: 43.65, lng: -79.38 },
];

const CITY_RADIUS_KM = 40;

export function nearestCity(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = CITY_RADIUS_KM;
  for (const c of CITIES) {
    const km = calculateDistanceKm(lat, lng, c.lat, c.lng);
    if (km <= bestKm) {
      bestKm = km;
      best = c.name;
    }
  }
  return best;
}
