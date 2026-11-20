# Development

Catatan teknis Jawir Map. Untuk gambaran produk, lihat [README](../README.md).

## Stack

Next.js 14 (App Router), React 18, Tailwind CSS, Leaflet (peta Esri World Topo), Drizzle ORM, dan TiDB Cloud Serverless (`@tidbcloud/serverless`, lewat HTTPS sehingga cocok untuk serverless). Hosting di Vercel.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL dan HASH_SALT, atau kosongkan DATABASE_URL untuk mode demo
npm run dev
```

Tanpa `DATABASE_URL`, API memakai data demo di memori yang hilang setiap restart.

Uji filter kata: `node --experimental-strip-types scripts/filter-cases.mjs`

## Environment variables

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya (produksi) | Connection string TiDB, harus diawali `mysql://`. |
| `HASH_SALT` | Ya | String acak panjang untuk hash perangkat dan IP. Jangan diganti setelah launch. |
| `NEXT_PUBLIC_SITE_URL` | Tidak | Default `https://jawirmap.lumelo.my.id`. Dipakai untuk canonical dan preview link. |
| `MAX_PINS_PER_IP_PER_DAY` | Tidak | Default `10`. |
| `MAX_COFFEE_PER_IP_PER_HOUR` | Tidak | Default `150`. |

Membuat `HASH_SALT`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Database

Tabel `jawir_tags`, `jawir_coffee_votes`, dan `jawir_counters` dibuat otomatis pada request pertama di setiap instance server (`ensureTable` di `src/db/index.ts`). Tabel dari versi lama hanya ditambah kolom atau indeks yang belum ada (`owner_hash`, `ip_hash`, dan lainnya), dan unique index lama `idx_unique_device` dihapus. Penghapusan ini praktis permanen: begitu ada dua pin dengan `device_hash` sama, index itu tidak bisa dipasang lagi tanpa membersihkan data.

Nomor Jawir diambil dari baris `jawir_number` di `jawir_counters` yang hanya naik, jadi nomor pin yang dihapus tidak pernah dipakai lagi. Skema Drizzle ada di `src/db/schema.ts`.

## Identitas pemilik pin dan suara kopi

- Saat pin dibuat, server memberi token acak lewat cookie `jawir_owner` (httpOnly, 400 hari, diperpanjang setiap kunjungan). Database hanya menyimpan hash-nya. Cookie inilah yang menentukan "pinku": Paspor Jawirku, hapus pin, dan larangan titip kopi ke pin sendiri.
- Suara kopi memakai cookie `jawir_voter` (httpOnly, satu per browser), sehingga dua HP dengan fingerprint sama tetap punya suara masing-masing.
- Fingerprint perangkat (FingerprintJS) tidak lagi membatasi pembuatan pin, karena HP dengan model sama sering punya fingerprint sama. Fingerprint hanya dipakai untuk mengenali pin lama yang belum punya `owner_hash`.
- Form pin mengirim `submissionId` acak yang dipakai sebagai id pin, jadi tap ganda atau kirim ulang dari form yang sama tidak membuat pin kedua.

## Link share

Pin dibagikan lewat `/p/<id>`. Halaman itu berisi metadata Open Graph per pin, dengan gambar dari `/og?tag=<id>`. Halaman utama `/` tetap statis. Link lama `/?tag=<id>` masih dibuka di browser, tapi tidak punya preview per pin.

## Deploy ke Vercel

1. Import repo ini di Vercel (framework Next.js terdeteksi otomatis). Setiap push ke `main` otomatis deploy ke produksi.
2. Isi environment variables di atas pada **Project → Settings → Environment Variables**.
3. Tambahkan domain di **Project → Settings → Domains**, lalu buat record DNS `CNAME` ke nilai yang ditampilkan Vercel.

Function berjalan di `sin1` (Singapura, lihat `vercel.json`), sama dengan region TiDB, supaya query tidak menyeberang benua.

Cache: `GET /api/tags` di CDN 15 detik (`s-maxage=15, stale-while-revalidate=60`), halaman `/p/<id>` 5 menit (ISR), gambar OG 1 jam.
