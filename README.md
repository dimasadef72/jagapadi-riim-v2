# Jaga Padi Dashboard

WebGIS dashboard untuk monitoring lahan padi, visualisasi NDVI, titik inspeksi, sensor lingkungan, dan indikasi hama berbasis Firebase.

```txt
Next.js 16  |  React 19  |  Firebase  |  Firestore  |  Leaflet  |  TanStack Query
```

## Overview

Jaga Padi Dashboard menampilkan data pemantauan sawah dalam peta interaktif dan tabel operasional. Aplikasi membaca data dari Firestore, menampilkan overlay peta, grid NDVI, data sensor fase 2, dan temuan hama.

Fokus utama aplikasi:

- Peta interaktif untuk memilih lahan dan layer analisis.
- Dashboard NDVI fase 1.
- Dashboard NDVI dan sensor fase 2.
- Dashboard deteksi hama dan rekomendasi.
- Health check koneksi Firebase.
- Seed data dummy untuk development.

## Tech Stack

| Area | Tooling |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS v4 |
| Data fetching | TanStack Query |
| Map | Leaflet, React Leaflet |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| Runtime/package manager | Bun |

## Getting Started

Install dependencies:

```bash
bun install
```

Create `.env` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Run the app:

```bash
bun run dev
```

Open:

```txt
http://localhost:3000
```

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start local development server |
| `bun run build` | Build production bundle |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run seed:firebase` | Seed Firestore with dummy lahan data |

## Environment

Firebase config is read from `.env`.

`.env.example` is committed as a template. Real env files are ignored by Git.

The dashboard can still render without Firestore data because the UI has a local mock fallback. Once Firebase config and Firestore data are ready, the app reads from Firestore automatically.

## Health Check

Endpoint:

```txt
GET /api/health
```

Example:

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

The endpoint only returns connection status and document counts. It does not expose API keys or document contents.

## Data Flow

```txt
UI components
  -> components/map-api.ts
  -> services/lahan-service.ts
  -> lib/firebase.ts
  -> Cloud Firestore
```

`components/map-api.ts` acts as a compatibility adapter for the UI. It keeps the screen components stable while the backing data source changes.

Data source priority:

1. Legacy API if `NEXT_PUBLIC_SERVER_URL` is configured.
2. Firestore if Firebase env values are complete.
3. Local mock data if Firebase is not ready or data fetch fails.

## Firestore Model

```txt
lahan/{fieldCode}
lahan/{fieldCode}/grids/{gridCode}
lahan/{fieldCode}/inspection_points/{pointCode}
lahan/{fieldCode}/inspection_points/{pointCode}/sensor_readings/{readingId}
lahan/{fieldCode}/hama_detections/{detectionId}
```

Example:

```txt
lahan/SW001
lahan/SW001/grids/G-A01
lahan/SW001/inspection_points/P1
lahan/SW001/inspection_points/P1/sensor_readings/reading_G-A01
lahan/SW001/hama_detections/detection_001
```

Firestore creates collections and documents automatically when data is written. There is no schema migration step like SQL databases.

## Firebase Services

```txt
lib/firebase.ts
```

Initializes Firebase app, Firestore, and Storage.

```txt
services/lahan-service.ts
```

Contains Firestore reads for:

- lahan list
- single lahan detail
- grids
- inspection points
- latest sensor readings
- hama detections

```txt
types/lahan.ts
```

Defines the TypeScript contract for Firestore documents.

## Seeding Data

Before seeding, make sure:

- Firestore Database has been created.
- Firestore rules allow writes during development.
- `.env` contains valid Firebase config.

Run:

```bash
bun run seed:firebase
```

The seed creates:

- 4 lahan documents
- 20 x 25 grids per lahan
- NDVI and cluster values on each grid
- 4 inspection points per lahan
- sensor readings under inspection points
- 1 hama detection per lahan

## Security Notes

Development mode can temporarily use permissive Firestore rules. Do not keep permissive rules in production.

Production direction:

- Dashboard should read only the data it needs.
- Writes should come from trusted Firebase Functions or Admin SDK.
- User-based access should use Firebase Auth and custom claims when login is introduced.

## Storage Notes

The dashboard can display direct HTTP/HTTPS image URLs.

If Firestore stores `gs://...` paths, the browser cannot render them directly. In that case either:

- Firebase Functions should store download URLs, or
- the frontend should convert Storage paths to download URLs with Firebase Storage SDK.

## Project Map

```txt
app/
  api/health/route.ts
  maps/page.tsx
  overview/page.tsx
  fase-1/ndvi/page.tsx
  fase-2/ndvi/page.tsx
  fase-2/hama/page.tsx
  settings/page.tsx

components/
  map-ui.tsx
  map-api.ts
  app-shell.tsx
  sidebar.tsx

lib/
  firebase.ts

services/
  lahan-service.ts

scripts/
  seed-firebase-lahan.ts

types/
  lahan.ts

docs/
  kontrak_firebase_function_danan.md
  panduan_migrasi_repo_firebase.md
```

## Documentation

- Data contract: `docs/kontrak_firebase_function_danan.md`
- Migration guide: `docs/panduan_migrasi_repo_firebase.md`
- Next.js local docs: `node_modules/next/dist/docs/`
