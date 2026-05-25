# Jaga Padi Firebase Dashboard

Dashboard WebGIS Jaga Padi berbasis Next.js dan Firebase. Repo ini adalah versi bersih dari UI lama yang sebelumnya berada di monorepo, dengan target data utama dari Firestore dan Storage.

## Tujuan Repo

- Menjalankan dashboard Next.js sebagai repo tunggal.
- Memakai UI dari repo lama tanpa membawa backend PostgreSQL/Drizzle.
- Membaca data lahan, grid NDVI, titik inspeksi, sensor, dan hama dari Firebase.
- Menyediakan fallback mock agar UI tetap bisa dibuka sebelum Firestore berisi data.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Firebase Web SDK
- Firestore
- Firebase Storage
- TanStack Query
- Leaflet dan React Leaflet
- Tailwind CSS v4
- Bun

## Struktur Penting

```txt
app/
  api/health/route.ts        Health check Firestore
  maps/page.tsx              Halaman peta
  fase-1/ndvi/page.tsx       Tabel NDVI fase 1
  fase-2/ndvi/page.tsx       Tabel NDVI + sensor fase 2
  fase-2/hama/page.tsx       Tabel hama

components/
  map-api.ts                 Adaptor data untuk UI lama
  map-ui.tsx                 UI peta dan panel layer

lib/
  firebase.ts                Inisialisasi Firebase app/db/storage

services/
  lahan-service.ts           Query Firestore untuk domain lahan

types/
  lahan.ts                   Kontrak tipe data Firestore

scripts/
  seed-firebase-lahan.ts     Seed dummy Firestore
  seed-lahan.ts              Referensi seed PostgreSQL lama, tidak dipakai

docs/
  kontrak_firebase_function_danan.md
  panduan_migrasi_repo_firebase.md
```

## Setup

Install dependency:

```bash
bun install
```

Buat file `.env` di root project. Contoh variabel tersedia di `.env.example`.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Jalankan dev server:

```bash
bun run dev
```

Buka:

```txt
http://localhost:3000
```

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run seed:firebase
```

`seed:firebase` akan membuat data dummy Firestore untuk beberapa lahan, grid, titik inspeksi, sensor, dan hama.

## Health Check

Endpoint:

```txt
/api/health
```

Contoh response sukses:

```json
{
  "ok": true,
  "service": "firebase",
  "status": "connected",
  "projectId": "testing-458813",
  "collections": {
    "lahan": 4
  }
}
```

Endpoint ini hanya menampilkan status koneksi, project ID, dan jumlah dokumen `lahan`. Tidak menampilkan API key atau isi data.

## Sumber Data UI

UI lama tetap memanggil fungsi di `components/map-api.ts`. File ini menjadi adaptor agar UI tidak perlu tahu sumber data mentahnya.

Urutan sumber data:

1. Jika `NEXT_PUBLIC_SERVER_URL` ada, pakai API server lama.
2. Jika env Firebase lengkap, pakai Firestore melalui `services/lahan-service.ts`.
3. Jika gagal atau belum ada data, fallback ke mock `Sawah Demo`.

Alur:

```txt
UI
-> components/map-api.ts
-> services/lahan-service.ts
-> lib/firebase.ts
-> Firestore
```

## Struktur Firestore

Firestore tidak membutuhkan schema migration seperti PostgreSQL. Collection dan document dibuat otomatis saat data pertama ditulis.

Struktur utama:

```txt
lahan/{fieldCode}
lahan/{fieldCode}/grids/{gridCode}
lahan/{fieldCode}/inspection_points/{pointCode}
lahan/{fieldCode}/inspection_points/{pointCode}/sensor_readings/{readingId}
lahan/{fieldCode}/hama_detections/{detectionId}
```

Contoh:

```txt
lahan/SW001
lahan/SW001/grids/G-A01
lahan/SW001/inspection_points/P1
lahan/SW001/inspection_points/P1/sensor_readings/reading_G-A01
lahan/SW001/hama_detections/detection_001
```

Kontrak lengkap ada di:

```txt
docs/kontrak_firebase_function_danan.md
```

## Seeding Firestore

Pastikan Firestore Database sudah dibuat dan rules development mengizinkan write. Untuk seed awal:

```bash
bun run seed:firebase
```

Script ini akan:

- Menghapus data seed `SW001` sampai `SW004` jika ada.
- Membuat dokumen `lahan`.
- Membuat 20 x 25 grid per lahan.
- Menaruh hasil NDVI/cluster langsung di dokumen grid.
- Membuat 4 titik inspeksi per lahan.
- Membuat sensor readings di bawah setiap inspection point.
- Membuat 1 hama detection per lahan.

Catatan: script seed memakai Firebase Web SDK, jadi operasi write mengikuti Firestore Security Rules. Untuk production, lebih baik seed/admin write memakai Admin SDK atau Firebase Function.

## Security Rules

Untuk development, test mode boleh dipakai sementara agar seed dan dashboard bisa berjalan.

Untuk production, jangan biarkan:

```txt
allow read, write: if true;
```

Target production yang lebih aman:

- Dashboard hanya read.
- Write dilakukan oleh Firebase Function/Admin SDK.
- Jika ada login, read/write dibatasi berdasarkan Firebase Auth dan custom claims.

## Storage URL

Dashboard hanya bisa menampilkan URL gambar HTTP/HTTPS langsung. Jika Firestore menyimpan `gs://...`, browser tidak bisa langsung memuatnya sebagai gambar.

Pilihan yang disarankan:

- Firebase Function menyimpan download URL HTTPS di `rgbUrl`, `ndviUrl`, `clusterUrl`, dan `imageUrl`.
- Atau frontend menambahkan helper untuk mengubah `gs://` menjadi download URL via Firebase Storage SDK.

Untuk saat ini, URL `gs://` dianggap belum siap ditampilkan dan akan diabaikan oleh adaptor UI.

## Repo Lama

`old_repo/` hanya dipakai sebagai referensi migrasi lokal dan di-ignore oleh Git. Source aplikasi aktif ada di root repo ini.

## Catatan Next.js

Project ini memakai Next.js 16. Jika perlu mengubah API Next, baca dulu dokumentasi lokal di:

```txt
node_modules/next/dist/docs/
```

Instruksi ini mengikuti `AGENTS.md` repo.
# jagapadi-riim-v2
