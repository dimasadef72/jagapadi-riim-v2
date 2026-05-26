# Kontrak Data Firebase Function Danan

Dokumen ini menjelaskan data yang perlu dibuat oleh Firebase Function setelah Android mengupload gambar sawah. Fokusnya adalah menyamakan kebutuhan antara:

- Android: generate `fieldCode` lalu upload gambar.
- Firebase Function fase 1: memakai `fieldCode` dari Android, proses NDVI/cluster, simpan hasil.
- Sensor lingkungan fase 2: datang ke titik inspeksi dan mengirim hasil pembacaan sensor.
- Web dashboard: membaca data lahan, grid, hasil NDVI, titik inspeksi, dan hasil sensor.

Referensi schema sementara ada di `packages/db/src/schema/lahan.ts`.

## Ringkasan Alur

```txt
Fase 1:
Android generate fieldCode
-> Android upload gambar dengan fieldCode
-> Firebase Storage menerima file
-> Firebase Function trigger
-> Function membaca fieldCode dari path/metadata upload
-> Function proses NDVI dan cluster
-> Function menghasilkan grid, NDVI per grid, dan titik inspeksi
-> Function simpan hasil ke Firestore/Storage

Fase 2:
Petugas/alat turun ke titik inspeksi
-> Sensor lingkungan mengambil nilai di titik tersebut
-> Hasil sensor disimpan di inspection point

Terpisah:
Deteksi hama disimpan sebagai event sendiri di level capture
```

Android wajib mengirim `fieldCode` saat upload agar Function tahu document lahan yang harus dibuat atau diperbarui.

## Identitas Lahan dari Android

Identitas lahan dibuat dari sisi Android. Function tidak membuat counter `SW001`, `SW002`, dan seterusnya.

Minimal metadata upload dari Android:

```txt
fieldCode = SW001
```

Ada dua cara yang disarankan.

1. Simpan `fieldCode` di path Storage:

```txt
uploads/lahan/SW001/raw/original.png
```

2. Simpan `fieldCode` sebagai custom metadata file upload:

```txt
metadata.fieldCode = SW001
```

Function harus membaca `fieldCode` dari path atau metadata tersebut, lalu menulis hasil ke:

```txt
lahan/{fieldCode}
lahan/{fieldCode}/captures/{captureId}
```

Catatan:

- Jika Android membuat format berurutan seperti `SW001`, Android harus memastikan tidak ada duplikasi.
- Jika ingin lebih aman dari bentrok, Android bisa memakai ID unik seperti UUID, misalnya `SW-9F1A7C`.
- `fieldCode` adalah identitas utama yang dipakai dashboard untuk membaca data.

## Struktur Firestore yang Disarankan

Gunakan `fieldCode` sebagai document ID lahan.

```txt
lahan/{fieldCode}
lahan/{fieldCode}/meta/capture_counter
lahan/{fieldCode}/captures/{captureId}
lahan/{fieldCode}/captures/{captureId}/grids/{gridCode}
lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}
lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}/sensor_readings/{readingId}
lahan/{fieldCode}/captures/{captureId}/hama_detections/{detectionId}
```

Contoh:

```txt
lahan/SW001
lahan/SW001/meta/capture_counter
lahan/SW001/captures/CAP001
lahan/SW001/captures/CAP001/grids/G-A01
lahan/SW001/captures/CAP001/inspection_points/P1
lahan/SW001/captures/CAP001/inspection_points/P1/sensor_readings/reading_001
```

Struktur visual di Firestore:

```txt
lahan                                      collection
  SW001                                    document
    fieldCode
    topLeft
    topRight
    bottomRight
    bottomLeft
    createdAt
    updatedAt

    meta                                   subcollection
      capture_counter                      document
        lastNumber
        updatedAt

    captures                               subcollection
      CAP001                               document
        captureId
        fieldCode
        rgbUrl
        ndviUrl
        clusterUrl
        capturedAt
        createdAt

        grids                              subcollection
          G-A01                            document
            gridCode
            rowIndex
            colIndex
            topLeft
            topRight
            bottomRight
            bottomLeft
            clusterId
            clusterLabel
            ndviMean
            ndviMin
            ndviMax
            ndviStddev
            ndviMedian
            ndviVariance
            ndviP25
            ndviP50
            ndviP75
            createdAt

        inspection_points                  subcollection
          P1                               document
            pointCode
            clusterId
            clusterLabel
            inspectionLat
            inspectionLng
            representativeGridCodes
            createdAt

            sensor_readings                subcollection
              reading_001                  document
                pointCode
                latitude
                longitude
                co2Ppm
                nh3Ppm
                coPpm
                no2Ppm
                temperatureC
                humidityPct
                recordedAt

        hama_detections                    subcollection
          detection_001                    document
            gridCode
            latitude
            longitude
            areaName
            status
            jenisHama
            tingkatSerangan
            rekomendasi
            imageUrl
            detectedAt
```

Aturan penting:

- Firestore selalu berurutan `collection/document/collection/document`.
- `lahan` adalah collection utama.
- `SW001` adalah document ID yang sama dengan `fieldCode` dari Android.
- `captures` menyimpan riwayat/time series pengambilan data untuk satu lahan.
- `meta/capture_counter` menyimpan nomor capture terakhir untuk membuat ID seperti `CAP001`, `CAP002`, dan seterusnya.
- Capture terbaru bisa diambil dengan query `captures` berdasarkan `capturedAt` descending dan `limit(1)`.
- `grids`, `inspection_points`, dan `hama_detections` adalah subcollection di dalam document capture.
- `sensor_readings` adalah subcollection di dalam document titik inspeksi.

## Collection: `lahan`

Data identitas satu sawah/lahan. Hasil analisis time series disimpan di subcollection `captures`, bukan langsung di document ini.

Path:

```txt
lahan/{fieldCode}
```

Contoh document:

```json
{
  "fieldCode": "SW001",
  "topLeft": { "lat": -8.151919744981786, "lng": 113.7375974115912 },
  "topRight": { "lat": -8.152064708104465, "lng": 113.73795447632318 },
  "bottomRight": { "lat": -8.152329532795992, "lng": 113.73784475507549 },
  "bottomLeft": { "lat": -8.152184569673313, "lng": 113.7374876903435 },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Field wajib:

| Field | Tipe | Dibuat oleh | Catatan |
| --- | --- | --- | --- |
| `fieldCode` | string | Android | Contoh `SW001`. Sama dengan document ID. |
| `topLeft` | object `{ lat, lng }` | Function | Sudut kiri atas lahan/gambar georeferenced. |
| `topRight` | object `{ lat, lng }` | Function | Sudut kanan atas. |
| `bottomRight` | object `{ lat, lng }` | Function | Sudut kanan bawah. |
| `bottomLeft` | object `{ lat, lng }` | Function | Sudut kiri bawah. |
| `createdAt` | timestamp | Function | Waktu record dibuat. |
| `updatedAt` | timestamp | Function | Waktu record terakhir diubah. |

Catatan penting:

- Kalau gambar upload tidak punya koordinat/georeference, Function perlu sumber lain untuk mengisi 4 sudut lahan.
- Web dashboard butuh 4 sudut ini untuk menaruh overlay gambar di peta.
- Jika lahan yang sama diupload lagi di minggu/hari berbeda, jangan overwrite grid lama. Buat document baru di `captures`.

## Subcollection: `meta`

Metadata internal per lahan. Untuk sequence capture, Function cukup memakai counter per `fieldCode`.

Path:

```txt
lahan/{fieldCode}/meta/capture_counter
```

Contoh document:

```json
{
  "lastNumber": 1,
  "updatedAt": "serverTimestamp"
}
```

Cara pakai:

```txt
Function baca lastNumber dengan transaction
nextNumber = lastNumber + 1
captureId = CAP + nextNumber tiga digit
contoh: CAP001, CAP002, CAP003
Function update lastNumber
Function tulis hasil ke lahan/{fieldCode}/captures/{captureId}
```

Catatan:

- Counter ini harus diupdate dengan transaction agar dua upload bersamaan tidak mendapat `captureId` yang sama.
- Counter ini hanya untuk membuat ID capture yang rapi.
- Untuk mengambil capture terbaru, tetap pakai `capturedAt`, bukan `lastNumber`.

## Subcollection: `captures`

Capture adalah satu hasil pengambilan/proses data untuk satu lahan pada waktu tertentu. Ini dipakai untuk time series.

Path:

```txt
lahan/{fieldCode}/captures/{captureId}
```

Contoh document:

```json
{
  "captureId": "CAP001",
  "fieldCode": "SW001",
  "rgbUrl": "gs://bucket/lahan/SW001/captures/CAP001/rgb.png",
  "ndviUrl": "gs://bucket/lahan/SW001/captures/CAP001/ndvi.png",
  "clusterUrl": "gs://bucket/lahan/SW001/captures/CAP001/cluster.png",
  "capturedAt": "2026-05-25T03:00:00.000Z",
  "createdAt": "serverTimestamp"
}
```

Field wajib:

| Field | Tipe | Catatan |
| --- | --- | --- |
| `captureId` | string | Sama dengan document ID capture. Contoh `CAP001`. |
| `fieldCode` | string | Kode lahan pemilik capture. |
| `capturedAt` | timestamp | Waktu gambar/data diambil. Dipakai untuk sort time series. |
| `createdAt` | timestamp | Waktu record dibuat. |

Field hasil file/proses:

| Field | Tipe | Wajib? | Catatan |
| --- | --- | --- | --- |
| `rgbUrl` | string/null | Opsional | URL gambar RGB/original untuk capture ini. |
| `ndviUrl` | string/null | Opsional | URL hasil NDVI untuk capture ini. |
| `clusterUrl` | string/null | Opsional | URL gambar visual cluster untuk capture ini. |

Catatan:

- `captureId` dibuat dari counter per lahan, misalnya `CAP001`, `CAP002`, dan seterusnya.
- Capture terbaru tidak perlu disimpan di parent lahan. Dashboard bisa query `captures` dengan `orderBy("capturedAt", "desc")` dan `limit(1)`.
- Field `capturedAt` wajib konsisten karena dipakai untuk mengambil capture terbaru dan membuat grafik time series.

Contoh query capture terbaru di web:

```ts
query(
  collection(db, "lahan", fieldCode, "captures"),
  orderBy("capturedAt", "desc"),
  limit(1),
);
```

## Subcollection: `grids`

Grid adalah pecahan area lahan untuk satu capture. Grid bukan titik inspeksi.

Path:

```txt
lahan/{fieldCode}/captures/{captureId}/grids/{gridCode}
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
  "clusterId": "C1",
  "clusterLabel": "hijau",
  "ndviMean": 0.56,
  "ndviMin": 0.51,
  "ndviMax": 0.62,
  "ndviStddev": 0.02,
  "ndviMedian": 0.56,
  "ndviVariance": 0.0004,
  "ndviP25": 0.53,
  "ndviP50": 0.56,
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
| `clusterId` | string | ID cluster/titik inspeksi yang mewakili grid ini. Contoh `C1`. |

Field hasil NDVI per grid:

| Field | Tipe | Wajib? | Catatan |
| --- | --- | --- | --- |
| `clusterId` | string | Wajib | Harus sama dengan salah satu `inspection_points.{pointCode}.clusterId`. |
| `clusterLabel` | string | Wajib | Nilai: `hijau`, `kuning`, atau `merah`. |
| `ndviMean` | number/null | Minimal wajib | Nilai rata-rata NDVI grid. |
| `ndviMin` | number/null | Opsional | Nilai minimum NDVI grid. |
| `ndviMax` | number/null | Opsional | Nilai maksimum NDVI grid. |
| `ndviStddev` | number/null | Opsional | Standar deviasi NDVI. |
| `ndviMedian` | number/null | Opsional | Median NDVI. |
| `ndviVariance` | number/null | Opsional | Variance NDVI. |
| `ndviP25` | number/null | Opsional | Percentile 25. |
| `ndviP50` | number/null | Opsional | Percentile 50. Biasanya sama atau dekat dengan median. |
| `ndviP75` | number/null | Opsional | Percentile 75. |

Catatan:

- Di schema SQL saat ini, hasil cluster per grid ada di tabel `grid_cluster_result`.
- Untuk Firestore, hasil cluster per grid boleh digabung langsung ke document grid agar query web lebih sederhana.
- `clusterId` menghubungkan grid ke cluster/titik inspeksi. Banyak grid bisa memiliki `clusterId` yang sama.
- Grid dipakai untuk visualisasi sebaran NDVI/cluster di peta.

## Subcollection: `inspection_points`

Titik inspeksi adalah hasil clusterisasi pada level capture. Satu capture biasanya punya 3-4 titik inspeksi, bukan satu titik per grid. Titik ini menjadi target fase 2: petugas/alat turun ke titik tersebut untuk mengambil data sensor lingkungan.

Path:

```txt
lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}
```

Contoh document:

```json
{
  "pointCode": "P1",
  "clusterId": "C1",
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
| `clusterId` | string | ID cluster yang diwakili titik inspeksi ini. Contoh `C1`. |
| `clusterLabel` | string | Nilai: `hijau`, `kuning`, atau `merah`. |
| `inspectionLat` | number | Latitude titik inspeksi hasil clusterisasi. |
| `inspectionLng` | number | Longitude titik inspeksi hasil clusterisasi. |
| `representativeGridCodes` | string[] | Daftar grid yang diwakili oleh titik inspeksi ini. |
| `createdAt` | timestamp | Waktu record dibuat. |

Catatan:

- Jangan simpan `inspectionLat` dan `inspectionLng` di setiap grid.
- Titik inspeksi adalah centroid/rekomendasi kunjungan lapangan hasil clusterisasi.
- Setiap titik inspeksi punya `clusterId`.
- Setiap grid yang masuk cluster tersebut wajib menyimpan `clusterId` yang sama.
- `representativeGridCodes` dipakai untuk menjelaskan sensor di titik ini mewakili grid mana saja.
- Contoh: jika `P1.representativeGridCodes = ["G-A12"]`, maka detail grid tersebut ada di `lahan/SW001/captures/{captureId}/grids/G-A12`.
- Contoh relasi: `inspection_points/P1.clusterId = "C1"` dan grid `G-A12.clusterId = "C1"`.

## Subcollection: `sensor_readings`

Data sensor adalah hasil fase 2. Sensor lingkungan diambil di titik inspeksi, lalu hasilnya disimpan sebagai subcollection dari `inspection_points`.

Path:

```txt
lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}/sensor_readings/{readingId}
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

Data hama disimpan terpisah sebagai event/temuan di level capture. Detection tidak wajib persis berada di titik inspeksi, jadi tidak perlu menjadi child dari `inspection_points`.

Path:

```txt
lahan/{fieldCode}/captures/{captureId}/hama_detections/{detectionId}
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
  "imageUrl": "gs://bucket/lahan/SW001/captures/CAP001/hama/hama-001.png",
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
- topLeft
- topRight
- bottomRight
- bottomLeft
- createdAt
- updatedAt

lahan/{fieldCode}/meta/capture_counter
- lastNumber
- updatedAt

lahan/{fieldCode}/captures/{captureId}
- captureId
- fieldCode
- capturedAt
- rgbUrl atau raw image URL
- ndviUrl
- clusterUrl
- createdAt

lahan/{fieldCode}/captures/{captureId}/grids/{gridCode}
- gridCode
- rowIndex
- colIndex
- topLeft
- topRight
- bottomRight
- bottomLeft
- clusterId
- clusterLabel
- ndviMean

lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}
- pointCode
- clusterId
- clusterLabel
- inspectionLat
- inspectionLng
- representativeGridCodes
```

Output sensor fase 2:

```txt
lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}/sensor_readings/{readingId}
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

Simpan file hasil upload dan hasil proses per `fieldCode` dan `captureId`.

```txt
lahan/SW001/captures/CAP001/raw/original.png
lahan/SW001/captures/CAP001/rgb/rgb.png
lahan/SW001/captures/CAP001/ndvi/ndvi.png
lahan/SW001/captures/CAP001/cluster/cluster.png
lahan/SW001/captures/CAP001/hama/hama-001.png
```

Firestore cukup menyimpan URL atau path file tersebut.

## Catatan Koordinasi Penting

Hal yang perlu dipastikan dengan Danan:

1. Bagaimana Android membuat `fieldCode` dan memastikan tidak duplikat?
2. Apakah Function bisa menghasilkan 4 sudut lahan: `topLeft`, `topRight`, `bottomRight`, `bottomLeft`?
3. Berapa ukuran grid yang dipakai: tetap `20 x 25` atau dinamis?
4. Apakah hasil cluster per grid hanya butuh `clusterId`, `clusterLabel`, dan `ndviMean`, atau semua statistik NDVI?
5. Berapa jumlah titik inspeksi yang dihasilkan: tetap 3 atau bisa 3-4?
6. Apakah titik inspeksi diambil dari centroid cluster, grid terburuk, atau metode lain?
7. Bagaimana cara Function menentukan `clusterId` dan `representativeGridCodes` untuk tiap titik inspeksi?
8. Apakah `clusterUrl` adalah gambar overlay cluster final yang siap ditampilkan di map?
9. Apakah sensor fase 2 akan mengirim `fieldCode`, `captureId`, dan `pointCode` agar hasilnya bisa disimpan ke inspection point yang benar?

## Ringkasan untuk Danan

Function fase 1 menerima upload gambar, lalu harus membuat:

```txt
1. Lahan
   - fieldCode dari Android, misalnya SW001
   - 4 sudut koordinat lahan

2. Counter capture
   - Function cek `lahan/{fieldCode}/meta/capture_counter`
   - Function membuat captureId berurutan, misalnya CAP001, CAP002, CAP003

3. Capture
   - captureId dari sequence per lahan, misalnya CAP001
   - capturedAt sebagai waktu utama untuk sort time series
   - URL gambar RGB, NDVI, dan cluster

4. Grid
   - daftar grid dalam capture
   - kode grid, index baris/kolom, dan 4 sudut grid
   - clusterId, label cluster, dan minimal ndviMean per grid

5. Titik inspeksi
   - 3-4 titik per capture
   - pointCode, clusterId, clusterLabel, inspectionLat, inspectionLng
   - representativeGridCodes, yaitu daftar grid yang diwakili titik tersebut
```

Sensor fase 2 mengirim hasil pembacaan ke titik inspeksi:

```txt
lahan/{fieldCode}/captures/{captureId}/inspection_points/{pointCode}/sensor_readings/{readingId}
```

Deteksi hama disimpan terpisah sebagai event:

```txt
lahan/{fieldCode}/captures/{captureId}/hama_detections/{detectionId}
```
