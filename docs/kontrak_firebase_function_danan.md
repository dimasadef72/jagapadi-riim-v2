# Kontrak Data Firebase Function Danan

Dokumen ini menjelaskan data yang perlu dibuat oleh Firebase Function setelah Android mengupload gambar sawah. Fokusnya adalah menyamakan kebutuhan antara:

- Android: hanya upload gambar.
- Firebase Function fase 1: generate identitas lahan, proses NDVI/cluster, simpan hasil.
- Sensor lingkungan fase 2: datang ke titik inspeksi dan mengirim hasil pembacaan sensor.
- Web dashboard: membaca data lahan, grid, hasil NDVI, titik inspeksi, dan hasil sensor.

Referensi schema sementara ada di `packages/db/src/schema/lahan.ts`.

## Ringkasan Alur

```txt
Fase 1:
Android upload gambar
-> Firebase Storage menerima file
-> Firebase Function trigger
-> Function generate fieldCode dan name
-> Function proses NDVI dan cluster
-> Function menghasilkan grid, NDVI per grid, dan titik inspeksi
-> Function simpan hasil ke Firestore/Storage

Fase 2:
Petugas/alat turun ke titik inspeksi
-> Sensor lingkungan mengambil nilai di titik tersebut
-> Hasil sensor disimpan di inspection point

Terpisah:
Deteksi hama disimpan sebagai event sendiri di level lahan
```

Android tidak perlu mengirim `fieldCode` atau `name`.

## Generate Identitas Lahan

Karena Android hanya upload gambar, identitas lahan dibuat otomatis oleh Function.

Gunakan counter di Firestore:

```txt
counters/lahan
{
  lastNumber: 0
}
```

Saat upload baru:

```txt
lastNumber = 0
nextNumber = 1
fieldCode = SW001
name = Sawah 1
```

Saat upload berikutnya:

```txt
fieldCode = SW002
name = Sawah 2
```

Counter harus diupdate dengan transaction agar tidak ada dua upload yang mendapat kode sama.

## Struktur Firestore yang Disarankan

Gunakan `fieldCode` sebagai document ID lahan.

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
lahan/SW001/inspection_points/P1/sensor_readings/reading_001
```

## Collection: `lahan`

Data utama satu sawah/lahan.

Path:

```txt
lahan/{fieldCode}
```

Contoh document:

```json
{
  "fieldCode": "SW001",
  "name": "Sawah 1",
  "topLeft": { "lat": -8.151919744981786, "lng": 113.7375974115912 },
  "topRight": { "lat": -8.152064708104465, "lng": 113.73795447632318 },
  "bottomRight": { "lat": -8.152329532795992, "lng": 113.73784475507549 },
  "bottomLeft": { "lat": -8.152184569673313, "lng": 113.7374876903435 },
  "rgbUrl": "gs://bucket/lahan/SW001/rgb.png",
  "ndviUrl": "gs://bucket/lahan/SW001/ndvi.png",
  "clusterUrl": "gs://bucket/lahan/SW001/cluster.png",
  "capturedAt": "2026-05-25T03:00:00.000Z",
  "createdAt": "serverTimestamp"
}
```

Field wajib:

| Field | Tipe | Dibuat oleh | Catatan |
| --- | --- | --- | --- |
| `fieldCode` | string | Function | Contoh `SW001`. Sama dengan document ID. |
| `name` | string | Function | Contoh `Sawah 1`. |
| `topLeft` | object `{ lat, lng }` | Function | Sudut kiri atas lahan/gambar georeferenced. |
| `topRight` | object `{ lat, lng }` | Function | Sudut kanan atas. |
| `bottomRight` | object `{ lat, lng }` | Function | Sudut kanan bawah. |
| `bottomLeft` | object `{ lat, lng }` | Function | Sudut kiri bawah. |
| `createdAt` | timestamp | Function | Waktu record dibuat. |

Field hasil file/proses:

| Field | Tipe | Wajib? | Catatan |
| --- | --- | --- | --- |
| `rgbUrl` | string/null | Opsional | URL gambar RGB/original. |
| `ndviUrl` | string/null | Opsional | URL hasil NDVI. |
| `clusterUrl` | string/null | Opsional | URL gambar visual cluster. |
| `capturedAt` | timestamp/null | Opsional | Kalau ada metadata waktu capture gambar. |

Catatan penting:

- Kalau gambar upload tidak punya koordinat/georeference, Function perlu sumber lain untuk mengisi 4 sudut lahan.
- Web dashboard butuh 4 sudut ini untuk menaruh overlay gambar di peta.

## Subcollection: `grids`

Grid adalah pecahan area lahan. Grid bukan titik inspeksi.

Path:

```txt
lahan/{fieldCode}/grids/{gridCode}
```

Contoh document:

```json
{
  "gridCode": "G-A01",
  "rowIndex": 0,
  "colIndex": 0,
  "topLeft": { "lat": -8.151919744982, "lng": 113.737597411591 },
  "topRight": { "lat": -8.151925543507, "lng": 113.737611694180 },
  "bottomRight": { "lat": -8.151938784742, "lng": 113.737606208117 },
  "bottomLeft": { "lat": -8.151932986217, "lng": 113.737591925528 },
  "clusterLabel": "hijau",
  "ndviMean": 0.56,
  "ndviMin": 0.51,
  "ndviMax": 0.62,
  "ndviStddev": 0.02,
  "ndviMedian": 0.56,
  "ndviVariance": 0.0004,
  "ndviP25": 0.53,
  "ndviP75": 0.59,
  "createdAt": "serverTimestamp"
}
```

Field wajib:

| Field | Tipe | Catatan |
| --- | --- | --- |
| `gridCode` | string | Contoh `G-A01`. Sama dengan document ID. |
| `rowIndex` | number | Index baris mulai dari 0. |
| `colIndex` | number | Index kolom mulai dari 0. |
| `topLeft` | object `{ lat, lng }` | Sudut kiri atas grid. |
| `topRight` | object `{ lat, lng }` | Sudut kanan atas grid. |
| `bottomRight` | object `{ lat, lng }` | Sudut kanan bawah grid. |
| `bottomLeft` | object `{ lat, lng }` | Sudut kiri bawah grid. |

Field hasil NDVI per grid:

| Field | Tipe | Wajib? | Catatan |
| --- | --- | --- | --- |
| `clusterLabel` | string | Wajib | Nilai: `hijau`, `kuning`, atau `merah`. |
| `ndviMean` | number/null | Minimal wajib | Nilai rata-rata NDVI grid. |
| `ndviMin` | number/null | Opsional | Nilai minimum NDVI grid. |
| `ndviMax` | number/null | Opsional | Nilai maksimum NDVI grid. |
| `ndviStddev` | number/null | Opsional | Standar deviasi NDVI. |
| `ndviMedian` | number/null | Opsional | Median NDVI. |
| `ndviVariance` | number/null | Opsional | Variance NDVI. |
| `ndviP25` | number/null | Opsional | Percentile 25. |
| `ndviP75` | number/null | Opsional | Percentile 75. |

Catatan:

- Di schema SQL saat ini, hasil cluster per grid ada di tabel `grid_cluster_result`.
- Untuk Firestore, hasil cluster per grid boleh digabung langsung ke document grid agar query web lebih sederhana.
- Grid dipakai untuk visualisasi sebaran NDVI/cluster di peta.

## Subcollection: `inspection_points`

Titik inspeksi adalah hasil clusterisasi pada level lahan. Satu lahan biasanya punya 3-4 titik inspeksi, bukan satu titik per grid. Titik ini menjadi target fase 2: petugas/alat turun ke titik tersebut untuk mengambil data sensor lingkungan.

Path:

```txt
lahan/{fieldCode}/inspection_points/{pointCode}
```

Contoh document:

```json
{
  "pointCode": "P1",
  "clusterLabel": "merah",
  "inspectionLat": -8.15198,
  "inspectionLng": 113.73768,
  "representativeGridCodes": ["G-A12", "G-A13", "G-B12", "G-B13"],
  "createdAt": "serverTimestamp"
}
```

Field wajib:

| Field | Tipe | Catatan |
| --- | --- | --- |
| `pointCode` | string | Contoh `P1`, `P2`, `P3`. Sama dengan document ID. |
| `clusterLabel` | string | Nilai: `hijau`, `kuning`, atau `merah`. |
| `inspectionLat` | number | Latitude titik inspeksi hasil clusterisasi. |
| `inspectionLng` | number | Longitude titik inspeksi hasil clusterisasi. |
| `representativeGridCodes` | string[] | Daftar grid yang diwakili oleh titik inspeksi ini. |
| `createdAt` | timestamp | Waktu record dibuat. |

Catatan:

- Jangan simpan `inspectionLat` dan `inspectionLng` di setiap grid.
- Titik inspeksi adalah centroid/rekomendasi kunjungan lapangan hasil clusterisasi.
- `representativeGridCodes` dipakai untuk menjelaskan sensor di titik ini mewakili grid mana saja.
- Contoh: jika `P1.representativeGridCodes = ["G-A12"]`, maka detail grid tersebut ada di `lahan/SW001/grids/G-A12`.

## Subcollection: `sensor_readings`

Data sensor adalah hasil fase 2. Sensor lingkungan diambil di titik inspeksi, lalu hasilnya disimpan sebagai subcollection dari `inspection_points`.

Path:

```txt
lahan/{fieldCode}/inspection_points/{pointCode}/sensor_readings/{readingId}
```

Contoh:

```json
{
  "pointCode": "P1",
  "latitude": -8.15193,
  "longitude": 113.73760,
  "co2Ppm": 420.5,
  "nh3Ppm": 0.12,
  "coPpm": 0.42,
  "no2Ppm": 0.03,
  "temperatureC": 29.1,
  "humidityPct": 78.5,
  "recordedAt": "2026-05-25T03:00:00.000Z"
}
```

Field:

| Field | Tipe | Wajib? | Catatan |
| --- | --- | --- | --- |
| `pointCode` | string | Disarankan | Kode titik inspeksi tempat sensor diambil. |
| `latitude` | number | Wajib | Latitude aktual pembacaan sensor. |
| `longitude` | number | Wajib | Longitude aktual pembacaan sensor. |
| `co2Ppm` | number/null | Opsional | CO2 dalam ppm. |
| `nh3Ppm` | number/null | Opsional | NH3 dalam ppm. |
| `coPpm` | number/null | Opsional | CO dalam ppm. |
| `no2Ppm` | number/null | Opsional | NO2 dalam ppm. |
| `temperatureC` | number/null | Opsional | Suhu dalam Celcius. |
| `humidityPct` | number/null | Opsional | Kelembapan dalam persen. |
| `recordedAt` | timestamp | Wajib | Waktu pembacaan sensor. |

Catatan:

- Sensor reading tidak disimpan langsung di grid.
- Sensor reading disimpan di inspection point karena alat turun ke titik inspeksi hasil fase 1.
- Nilai sensor di titik inspeksi dianggap merepresentasikan kondisi grid yang ada di `representativeGridCodes`.

## Optional: `hama_detections`

Data hama disimpan terpisah sebagai event/temuan di level lahan. Detection tidak wajib persis berada di titik inspeksi, jadi tidak perlu menjadi child dari `inspection_points`.

Path:

```txt
lahan/{fieldCode}/hama_detections/{detectionId}
```

Contoh:

```json
{
  "gridCode": "G-A12",
  "latitude": -8.15201,
  "longitude": 113.73771,
  "areaName": "Sawah 1 - Petak Hama",
  "status": "terindikasi",
  "jenisHama": "Bercak Cokelat",
  "tingkatSerangan": "sedang",
  "rekomendasi": "Pantau kelembapan kanopi dan lakukan pengamatan ulang.",
  "imageUrl": "gs://bucket/lahan/SW001/hama/hama-001.png",
  "detectedAt": "2026-05-25T03:00:00.000Z"
}
```

Enum:

```txt
status: aman | terindikasi | kritis
tingkatSerangan: rendah | sedang | tinggi
```

Catatan:

- `gridCode` opsional, dipakai jika lokasi detection bisa dipetakan ke grid tertentu.
- Hama detection tetap bisa dikembangkan belakangan jika fase awal hanya fokus NDVI dan sensor lingkungan.

## Minimal Output Function

Kalau Function ingin dibuat bertahap, minimal data yang harus tersedia untuk dashboard peta:

```txt
lahan/{fieldCode}
- fieldCode
- name
- topLeft
- topRight
- bottomRight
- bottomLeft
- rgbUrl atau raw image URL
- ndviUrl
- clusterUrl
- createdAt

lahan/{fieldCode}/grids/{gridCode}
- gridCode
- rowIndex
- colIndex
- topLeft
- topRight
- bottomRight
- bottomLeft
- clusterLabel
- ndviMean

lahan/{fieldCode}/inspection_points/{pointCode}
- pointCode
- clusterLabel
- inspectionLat
- inspectionLng
- representativeGridCodes
```

Output sensor fase 2:

```txt
lahan/{fieldCode}/inspection_points/{pointCode}/sensor_readings/{readingId}
- latitude
- longitude
- co2Ppm
- nh3Ppm
- coPpm
- no2Ppm
- temperatureC
- humidityPct
- recordedAt
```

## Storage Path yang Disarankan

Simpan file hasil upload dan hasil proses per `fieldCode`.

```txt
lahan/SW001/raw/original.png
lahan/SW001/rgb/rgb.png
lahan/SW001/ndvi/ndvi.png
lahan/SW001/cluster/cluster.png
lahan/SW001/hama/hama-001.png
```

Firestore cukup menyimpan URL atau path file tersebut.

## Catatan Koordinasi Penting

Hal yang perlu dipastikan dengan Danan:

1. Apakah gambar upload punya metadata koordinat/georeference?
2. Apakah Function bisa menghasilkan 4 sudut lahan: `topLeft`, `topRight`, `bottomRight`, `bottomLeft`?
3. Berapa ukuran grid yang dipakai: tetap `20 x 25` atau dinamis?
4. Apakah hasil cluster per grid hanya butuh `clusterLabel` dan `ndviMean`, atau semua statistik NDVI?
5. Berapa jumlah titik inspeksi yang dihasilkan: tetap 3 atau bisa 3-4?
6. Apakah titik inspeksi diambil dari centroid cluster, grid terburuk, atau metode lain?
7. Bagaimana cara Function menentukan `representativeGridCodes` untuk tiap titik inspeksi?
8. Apakah `clusterUrl` adalah gambar overlay cluster final yang siap ditampilkan di map?
9. Apakah sensor fase 2 akan mengirim `fieldCode` dan `pointCode` agar hasilnya bisa disimpan ke inspection point yang benar?

## Ringkasan untuk Danan

Function fase 1 menerima upload gambar, lalu harus membuat:

```txt
1. Lahan
   - fieldCode otomatis dari counter, misalnya SW001
   - name otomatis, misalnya Sawah 1
   - 4 sudut koordinat lahan
   - URL gambar RGB, NDVI, dan cluster

2. Grid
   - daftar grid dalam lahan
   - kode grid, index baris/kolom, dan 4 sudut grid
   - label cluster dan minimal ndviMean per grid

3. Titik inspeksi
   - 3-4 titik per lahan
   - pointCode, clusterLabel, inspectionLat, inspectionLng
   - representativeGridCodes, yaitu daftar grid yang diwakili titik tersebut
```

Sensor fase 2 mengirim hasil pembacaan ke titik inspeksi:

```txt
lahan/{fieldCode}/inspection_points/{pointCode}/sensor_readings/{readingId}
```

Deteksi hama disimpan terpisah sebagai event:

```txt
lahan/{fieldCode}/hama_detections/{detectionId}
```
