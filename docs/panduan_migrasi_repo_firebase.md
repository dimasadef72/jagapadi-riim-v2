# Panduan Migrasi ke Repo Firebase

Dokumen ini adalah checklist migrasi dari repo lama `jagapadi-riim` ke repo baru yang lebih bersih untuk versi Firebase.

Tujuan migrasi:

- Repo baru hanya berisi Next.js dashboard + Firebase.
- UI dari `apps/web` tetap dipakai.
- Backend lama `apps/server`, Drizzle, Postgres, dan package DB tidak dibawa.
- Firebase Function Danan menjadi sumber data utama lewat Firestore/Storage.

## Gambaran Akhir

Repo lama:

```txt
jagapadi-riim/
  apps/web
  apps/server
  packages/db
  packages/auth
  packages/ui
  docs
```

Repo baru:

```txt
jagapadi-firebase/
  docs/
  public/
  src/
    app/
    components/
    lib/
      firebase.ts
    services/
      lahan-service.ts
    types/
      lahan.ts
  .env.example
  package.json
  next.config.ts
```

Catatan:

- UI Next.js sudah ada di `apps/web` repo lama.
- Pada repo baru, UI tersebut dicopy ulang lalu disesuaikan agar membaca data dari Firebase, bukan dari `apps/server`.

## Langkah 1: Buat Repo Baru

Buat repo/folder baru, misalnya:

```txt
jagapadi-firebase
```

Inisialisasi Next.js baru atau copy penuh `apps/web` dari repo lama.

Opsi yang disarankan:

```txt
Copy apps/web dari repo lama ke root repo baru
```

Contoh:

```txt
repo lama:
jagapadi-riim/apps/web

repo baru:
jagapadi-firebase/
```

Hasilnya, isi `apps/web` menjadi root repo baru.

## Langkah 2: Copy File UI dari `apps/web`

Copy bagian ini dari repo lama:

```txt
apps/web/src
apps/web/public
apps/web/package.json
apps/web/next.config.ts
apps/web/tsconfig.json
apps/web/postcss.config.mjs
apps/web/components.json
```

Kalau ada file config lain yang dipakai Next.js/Tailwind, ikut copy juga.

Jangan copy:

```txt
apps/server
packages/db
packages/auth
database migrations
Drizzle config
Postgres env
```

## Langkah 3: Copy Package UI Jika Dibutuhkan

Repo lama memakai package workspace seperti:

```txt
@jagapadi-riim/ui
@jagapadi-riim/auth
@jagapadi-riim/db
@jagapadi-riim/env
```

Di repo baru, workspace ini tidak ada. Jadi cek import di `src`.

Cari:

```txt
@jagapadi-riim/
```

Jika ada import dari `@jagapadi-riim/ui`, ada dua pilihan:

1. Copy komponen UI yang dibutuhkan ke repo baru.
2. Ganti import ke komponen lokal di `src/components/ui`.

Target akhir:

```txt
Tidak ada import @jagapadi-riim/*
```

## Langkah 4: Copy Dokumen Kontrak Firebase

Copy dokumen ini ke repo baru:

```txt
docs/kontrak_firebase_function_danan.md
```

Dokumen ini menjadi acuan struktur Firestore yang akan dibaca dashboard.

## Langkah 5: Pasang Firebase SDK

Install Firebase SDK di repo baru.

Dengan bun:

```bash
bun add firebase
```

Atau dengan npm:

```bash
npm install firebase
```

## Langkah 6: Buat Environment Variable Firebase

Buat file:

```txt
.env.example
```

Isi:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Lalu buat `.env.local` untuk nilai asli dari Firebase Console.

Jangan commit `.env.local`.

## Langkah 7: Buat Firebase Client

Buat file:

```txt
src/lib/firebase.ts
```

Isi contoh:

```ts
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
```

## Langkah 8: Buat Type Data Firebase

Buat file:

```txt
src/types/lahan.ts
```

Isi type utama sesuai kontrak:

```ts
export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type ClusterLabel = "hijau" | "kuning" | "merah";

export type Lahan = {
  fieldCode: string;
  name: string;
  topLeft: LatLngPoint;
  topRight: LatLngPoint;
  bottomRight: LatLngPoint;
  bottomLeft: LatLngPoint;
  rgbUrl: string | null;
  ndviUrl: string | null;
  clusterUrl: string | null;
  capturedAt: string | null;
  createdAt: unknown;
};

export type LahanGrid = {
  gridCode: string;
  rowIndex: number;
  colIndex: number;
  topLeft: LatLngPoint;
  topRight: LatLngPoint;
  bottomRight: LatLngPoint;
  bottomLeft: LatLngPoint;
  clusterLabel: ClusterLabel;
  ndviMean: number | null;
  ndviMin?: number | null;
  ndviMax?: number | null;
  ndviStddev?: number | null;
  ndviMedian?: number | null;
  ndviVariance?: number | null;
  ndviP25?: number | null;
  ndviP75?: number | null;
};

export type InspectionPoint = {
  pointCode: string;
  clusterLabel: ClusterLabel;
  inspectionLat: number;
  inspectionLng: number;
  representativeGridCodes: string[];
  createdAt: unknown;
};

export type SensorReading = {
  pointCode?: string;
  latitude: number;
  longitude: number;
  co2Ppm?: number | null;
  nh3Ppm?: number | null;
  coPpm?: number | null;
  no2Ppm?: number | null;
  temperatureC?: number | null;
  humidityPct?: number | null;
  recordedAt: unknown;
};

export type HamaDetection = {
  gridCode?: string | null;
  latitude: number;
  longitude: number;
  areaName?: string | null;
  status: "aman" | "terindikasi" | "kritis";
  jenisHama?: string | null;
  tingkatSerangan?: "rendah" | "sedang" | "tinggi" | null;
  rekomendasi?: string | null;
  imageUrl?: string | null;
  detectedAt: unknown;
};
```

## Langkah 9: Buat Service Firestore

Buat file:

```txt
src/services/lahan-service.ts
```

Fungsi yang dibutuhkan dashboard:

```txt
getLahanList()
getLahanMapData(fieldCode)
getGrids(fieldCode)
getInspectionPoints(fieldCode)
getSensorReadings(fieldCode, pointCode)
getHamaDetections(fieldCode)
```

Konsep path Firestore:

```txt
lahan/{fieldCode}
lahan/{fieldCode}/grids/{gridCode}
lahan/{fieldCode}/inspection_points/{pointCode}
lahan/{fieldCode}/inspection_points/{pointCode}/sensor_readings/{readingId}
lahan/{fieldCode}/hama_detections/{detectionId}
```

## Langkah 10: Ganti API Lama ke Firebase Service

Di repo lama, UI kemungkinan masih mengambil data dari:

```txt
NEXT_PUBLIC_SERVER_URL
apps/server
fetchLahan()
fetchLahanMapData()
```

Di repo baru, ubah agar membaca dari:

```txt
src/services/lahan-service.ts
```

Target:

```txt
Tidak perlu apps/server
Tidak perlu NEXT_PUBLIC_SERVER_URL
Tidak perlu Postgres
```

## Langkah 11: Sesuaikan URL Gambar

Jika Firestore menyimpan URL berbentuk `gs://...`, browser tidak bisa langsung menampilkan itu sebagai image URL.

Ada dua opsi:

1. Function Danan menyimpan download URL HTTPS langsung.
2. Frontend mengubah Storage path menjadi download URL menggunakan Firebase Storage SDK.

Yang paling mudah untuk dashboard:

```txt
Function simpan URL HTTPS di rgbUrl, ndviUrl, clusterUrl, imageUrl
```

Jika tetap pakai `gs://`, frontend perlu helper untuk convert ke download URL.

## Langkah 12: Jalankan dan Bersihkan Error

Install dependency:

```bash
bun install
```

Jalankan dev server:

```bash
bun dev
```

Perbaiki error satu per satu:

```txt
1. Import workspace lama
2. Env lama seperti NEXT_PUBLIC_SERVER_URL
3. Type data API lama
4. Komponen yang masih menunggu response dari apps/server
```

## Langkah 13: Data Dummy Firestore

Sebelum Function Danan selesai, buat data dummy manual di Firestore sesuai kontrak:

```txt
lahan/SW001
lahan/SW001/grids/G-A01
lahan/SW001/inspection_points/P1
lahan/SW001/inspection_points/P1/sensor_readings/reading_001
lahan/SW001/hama_detections/detection_001
```

Ini membuat dashboard bisa dites tanpa menunggu Function final.

## Checklist Migrasi

- [ ] Repo baru dibuat.
- [ ] Isi `apps/web` lama dicopy ke repo baru.
- [ ] Import `@jagapadi-riim/*` sudah dihapus atau diganti lokal.
- [ ] Firebase SDK sudah dipasang.
- [ ] `.env.example` dan `.env.local` sudah dibuat.
- [ ] `src/lib/firebase.ts` sudah ada.
- [ ] `src/types/lahan.ts` sudah ada.
- [ ] `src/services/lahan-service.ts` sudah ada.
- [ ] UI tidak lagi fetch ke `apps/server`.
- [ ] Data dummy Firestore sudah dibuat.
- [ ] Map/dashboard bisa membaca data dari Firestore.
- [ ] Gambar dari Storage bisa tampil.

## Yang Tidak Dibawa ke Repo Baru

Jangan bawa bagian ini kecuali memang dibutuhkan sebagai referensi:

```txt
apps/server
packages/db
packages/auth
Drizzle migrations
Postgres config
seed-lahan.ts
```

Repo lama tetap disimpan sebagai backup/reference.

## Urutan Kerja yang Disarankan

```txt
1. Copy apps/web ke repo baru.
2. Pastikan Next.js bisa run dulu.
3. Hapus/ganti import workspace lama.
4. Tambahkan Firebase config.
5. Buat type dan service Firestore.
6. Buat data dummy di Firestore.
7. Ganti data source UI dari API lama ke Firebase.
8. Tes map, layer image, grid, inspection point, sensor, dan hama.
9. Koordinasi dengan Danan supaya output Function mengikuti kontrak.
```

