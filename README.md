[![GitGotchi](https://gitgochi.lumelo.my.id/api/badge/zee7x/jawir-map.svg)](https://gitgochi.lumelo.my.id/pet/zee7x/jawir-map)

# Jawir Map

**Peta Sedulur Jawir Sedonya.** Tancapkan satu pin di peta dunia, dapatkan Paspor Jawir digital, dan lihat seberapa jauh kamu dari Titik 0 Puncak Gunung Lawu.

Live: <https://jawirmap.lumelo.my.id>

## Fitur

- Peta dunia (Leaflet + Esri World Topo) dengan pin ter-cluster, benang merah ke Lawu, dan 4 situs legenda (NPC).
- Satu perangkat satu pin. Lokasi digeser acak ±250–650 m demi privasi.
- Paspor Jawir (PNG untuk Story), klasemen, sensus trah dan wilayah, "Titip kopi", radar sedulur radius 3 km.
- Link `/?tag=<id>` menampilkan preview kartu paspor di WhatsApp, X, Telegram (gambar dari `/og?tag=<id>`).
- Pemilik pin bisa menghapus pinnya sendiri dari "KTP Jawirku".

## Stack

Next.js 14 (App Router), React 18, Tailwind CSS, Drizzle ORM, TiDB Cloud Serverless (`@tidbcloud/serverless`, lewat HTTPS sehingga cocok untuk serverless).

## Development

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL dan HASH_SALT, atau kosongkan DATABASE_URL untuk mode demo
npm run dev
```

Tanpa `DATABASE_URL`, API memakai data demo di memori yang hilang setiap restart.

## Environment variables

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya (produksi) | Connection string TiDB, harus diawali `mysql://`. |
| `HASH_SALT` | Ya | String acak panjang untuk hash perangkat dan IP. Jangan diganti setelah launch. |
| `NEXT_PUBLIC_SITE_URL` | Tidak | Default `https://jawirmap.lumelo.my.id`. Dipakai untuk canonical dan preview link. |
| `MAX_PINS_PER_IP_PER_DAY` | Tidak | Default `10`. |
| `MAX_COFFEE_PER_IP_PER_HOUR` | Tidak | Default `60`. |

Membuat `HASH_SALT`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Database

Tabel `jawir_tags` dan `jawir_coffee_votes` dibuat otomatis pada request pertama di setiap instance server (`ensureTable` di `src/db/index.ts`). Tabel dari versi lama hanya ditambah kolom atau indeks yang belum ada (`owner_hash`, `ip_hash`, dan lainnya). Skema Drizzle ada di `src/db/schema.ts`.

## Identitas pemilik pin

Saat pin dibuat, server memberi token acak lewat cookie `jawir_owner` (httpOnly, 400 hari, diperpanjang setiap kunjungan). Database hanya menyimpan hash-nya. Cookie inilah yang menentukan "pinku": KTP, hapus pin, dan larangan titip kopi ke pin sendiri. Fingerprint perangkat hanya dipakai untuk batas satu pin per perangkat, dan data pin orang lain tidak pernah dikirim ke perangkat yang kebetulan punya fingerprint sama.

## Deploy ke Vercel

1. Import repo ini di Vercel (framework Next.js terdeteksi otomatis).
2. Isi environment variables di atas pada **Project → Settings → Environment Variables**.
3. Tambahkan domain `jawirmap.lumelo.my.id` di **Project → Settings → Domains**, lalu buat record DNS `CNAME jawirmap` ke nilai yang ditampilkan Vercel.

`GET /api/tags` di-cache CDN 15 detik (`s-maxage=15, stale-while-revalidate=60`), gambar OG 1 jam.

## Lisensi

MIT, lihat [LICENSE](LICENSE).
