# Rencana Data OPT Hama Penyakit

## Tujuan

Menu `Fase 2 > Hama Penyakit` akan menampilkan datasheet historis pengamatan OPT padi Kabupaten Jember dari file Excel `Data OPT Padi Kab. Jember th 2021-2026.xlsx`.

Data ini berbeda dari data `lahan/captures` yang sudah ada. Data existing `lahan` berhubungan dengan drone, grid, inspeksi, dan capture per sawah. Data OPT historis berhubungan dengan laporan per tahun, bulan, kecamatan, desa, OPT, luas serangan, pengendalian, dan koordinat.

## Keputusan Struktur

Gunakan kombinasi Firestore dan Google Cloud Storage:

- Firestore untuk metadata/link file per tahun.
- GCS untuk isi data tabel dalam format JSON per tahun.

Struktur final yang dipilih:

```txt
Firestore
  opt_years
    2021
    2022
    2023
    2024
    2025
    2026

Google Cloud Storage
  gs://riim-opt/opt/years/2021.json
  gs://riim-opt/opt/years/2022.json
  gs://riim-opt/opt/years/2023.json
  gs://riim-opt/opt/years/2024.json
  gs://riim-opt/opt/years/2025.json
  gs://riim-opt/opt/years/2026.json
```

Firestore tidak menyimpan semua baris tabel. Firestore hanya menyimpan metadata/link GCS per tahun.

## Alasan

- Total data sekitar 11 ribu baris dan ukuran file kecil, sekitar 1.8 MB.
- Data bersifat historis dan lebih cocok sebagai arsip/datasheet.
- Menghindari 1 dokumen Firestore per baris agar read tidak dihitung per row.
- Polanya mirip data grid yang sudah ada, yaitu metadata di Firestore dan JSON besar di Storage.
- Filter utama secara natural adalah tahun.
- Setelah JSON tahun dipilih di-load, filter lain seperti bulan, kecamatan, desa, dan OPT bisa dilakukan di frontend.

## Firestore Collection

Collection:

```txt
opt_years
```

Contoh dokumen:

```txt
opt_years/2021
```

```json
{
  "tahun": 2021,
  "rowCount": 2577,
  "bucket": "riim-opt",
  "storagePath": "opt/years/2021.json",
  "fileName": "2021.json",
  "publicUrl": "https://storage.googleapis.com/riim-opt/opt/years/2021.json",
  "fileSizeBytes": 1884122,
  "sourceFile": "Data OPT Padi Kab. Jember th 2021-2026.xlsx",
  "updatedAt": "Timestamp"
}
```

Field:

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `tahun` | number | Tahun data OPT |
| `rowCount` | number | Jumlah baris di file JSON tahun tersebut |
| `bucket` | string | Nama bucket GCS |
| `storagePath` | string | Path file JSON di GCS |
| `fileName` | string | Nama file JSON tahun |
| `publicUrl` | string | URL publik file JSON |
| `fileSizeBytes` | number | Ukuran file JSON |
| `updatedAt` | Timestamp | Waktu metadata/file terakhir diperbarui |

## GCS JSON

Contoh path:

```txt
gs://riim-opt/opt/years/2021.json
```

Isi file:

```json
[
  {
    "tahun": 2021,
    "bulan": 1,
    "periode": 1,
    "mt": "MP. 2020/2021",
    "kabupaten": "Jember",
    "kecamatan": "Sumberjambe",
    "desa": "Randuagung",
    "latitude": -8.534,
    "longitude": 113.5247,
    "komoditas": "Padi",
    "lt": 8,
    "opt": "PBP",
    "ssr": 0.4,
    "sss": 0,
    "ssb": 0,
    "ssp": 0,
    "ssj": 0.4,
    "terkendali": 0,
    "panen": 0,
    "intensitas": 0,
    "ltsr": 0,
    "ltss": 0,
    "ltsb": 0,
    "ltsp": 0,
    "ltsj": 0,
    "kimia": 0,
    "hayati": 0,
    "eradikasi": 0,
    "cl": 0,
    "jumlahPengendali": 0,
    "lksr": 0.4,
    "lkss": 0,
    "lksb": 0,
    "lksp": 0,
    "lksj": 0.4,
    "waspada": 0
  }
]
```

## Kolom Tabel UI

Tabel memakai header dan sub-header.

| Header | Sub-header |
| --- | --- |
| Waktu | Tahun, Bulan, Periode, MT |
| Lokasi | Kabupaten, Kecamatan, Desa, Latitude, Longitude |
| Objek Pengamatan | Komoditas, LT, OPT |
| Serangan | SSR, SSS, SSB, SSP, SSJ, Terkendali, PANEN, % |
| Luas Tambah Serangan | LTSR, LTSS, LTSB, LTSP, LTSJ |
| Pengendalian | Kimia, Hayati, Eradikasi, CL, Jumlah Pengendali |
| Keadaan Serangan | LKSR, LKSS, LKSB, LKSP, LKSJ, Waspada |
| Aksi | Marker |

Kolom `Marker` memakai `latitude` dan `longitude` untuk menuju peta.

## Keterangan Singkatan

| Singkatan | Keterangan |
| --- | --- |
| LT | Luas Tanam (ha) |
| OPT | Organisme Pengganggu Tumbuhan yang diamati |
| SSR | Serangan Sangat Ringan (ha) |
| SSS | Serangan Ringan (ha) |
| SSB | Serangan Sedang (ha) |
| SSP | Serangan Berat (ha) |
| SSJ | Serangan Puso/Sangat Berat (ha) |
| Terkendali | Luas serangan yang berhasil dikendalikan (ha) |
| PANEN | Luas panen terdampak (ha) |
| % | Persentase intensitas serangan |
| LTSR | Luas Tambah Serangan Ringan (ha) |
| LTSS | Luas Tambah Serangan Sedang (ha) |
| LTSB | Luas Tambah Serangan Berat (ha) |
| LTSP | Luas Tambah Serangan Puso (ha) |
| LTSJ | Luas Tambah Serangan Jumlah (ha) |
| Kimia | Luas pengendalian dengan pestisida kimia (ha) |
| Hayati | Luas pengendalian menggunakan agen hayati (ha) |
| Eradikasi | Luas pengendalian dengan eradikasi/pemusnahan (ha) |
| CL | Cultural Control / pengendalian kultur teknis (ha) |
| Jumlah Pengendali | Total luas pengendalian seluruh metode (ha) |
| LKSR | Luas Keadaan Serangan Ringan (ha) |
| LKSS | Luas Keadaan Serangan Sedang (ha) |
| LKSB | Luas Keadaan Serangan Berat (ha) |
| LKSP | Luas Keadaan Serangan Puso (ha) |
| LKSJ | Luas Keadaan Serangan Jumlah / total serangan saat pengamatan (ha) |
| Waspada | Luas area waspada/potensi serangan (ha) |
| Latitude | Koordinat lintang lokasi pengamatan |
| Longitude | Koordinat bujur lokasi pengamatan |

## Flow Frontend

1. Halaman `Fase 2 > Hama Penyakit` dibuka.
2. App membaca collection `opt_years` dari Firestore.
3. App menampilkan pilihan tahun dari dokumen Firestore yang tersedia.
4. User memilih tahun, misalnya `2021`.
5. App mengambil `publicUrl` dari dokumen `opt_years/{tahun}`.
6. App download JSON dari GCS.
7. Data JSON disimpan di state/cache frontend.
8. Filter `bulan`, `kecamatan`, `desa`, `OPT`, dan search dilakukan di frontend.
9. Pagination dilakukan di frontend, misalnya 25 atau 50 row per page.
10. Tombol marker mengirim `latitude` dan `longitude` ke halaman peta.

## Catatan Performa

- Jangan render semua 11 ribu baris sekaligus.
- Data boleh di-load per tahun ke memory, tetapi DOM tabel hanya merender row sesuai pagination.
- Default rows per page disarankan 25 atau 50.
- Search bisa dibuat client-side. Jika nanti terasa berat, tambahkan debounce 200-300 ms.
- Marker peta sebaiknya hanya menampilkan data yang sudah difilter, bukan semua data lintas tahun sekaligus.

## Tahapan Implementasi

1. Buat script konversi Excel ke JSON per tahun.
2. Validasi hasil konversi: jumlah row, daftar tahun, dan sample row.
3. Upload file JSON per tahun ke GCS.
4. Tulis metadata/link GCS per tahun ke Firestore `opt_years`.
5. Buat service frontend untuk membaca `opt_years`.
6. Buat service frontend untuk download JSON tahun dari GCS.
7. Hubungkan halaman `Fase 2 > Hama Penyakit` ke data JSON per tahun.
8. Tambahkan filter tahun, bulan, kecamatan, desa, OPT, search, dan pagination.
9. Hubungkan tombol marker ke halaman peta menggunakan koordinat row.

## Keputusan Yang Ditunda

- CRUD per row belum dipilih untuk tahap awal.
- Jika nanti data perlu sering diedit, pertimbangkan pendekatan hybrid:
  - Firestore per row untuk admin/edit.
  - Storage JSON sebagai cache baca cepat untuk tabel publik.
- Kamus `opt_types` belum wajib. Untuk awal `opt` tetap mengikuti isi Excel.
