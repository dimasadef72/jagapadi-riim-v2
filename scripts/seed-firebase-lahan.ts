import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.storageBucket ||
  !firebaseConfig.messagingSenderId ||
  !firebaseConfig.appId
) {
  throw new Error("Konfigurasi Firebase belum lengkap di .env.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROW_COUNT = 5;
const COL_COUNT = 10;
const INSPECTION_POINT_COUNT = 4;
const GRID_COUNT_PER_LAHAN = ROW_COUNT * COL_COUNT;
const rowLabels = "ABCDE".split("");

type LatLngPoint = {
  lat: number;
  lng: number;
};

type FieldCorners = {
  topLeft: LatLngPoint;
  topRight: LatLngPoint;
  bottomRight: LatLngPoint;
  bottomLeft: LatLngPoint;
};

type GridSeed = {
  gridCode: string;
  rowIndex: number;
  colIndex: number;
  bounds: FieldCorners & {
    centerLat: number;
    centerLng: number;
  };
  ndviMean: number;
  clusterId: string;
  clusterLabel: "hijau" | "kuning" | "merah";
  stress: number;
};

const lahanSeedData = [
  {
    fieldCode: "SW001",
    sourceName: "seed_SW001_20260512",
    layers: {
      rgb: "Sawah1_RGB.jpg",
      ndvi: "Sawah1_NDVI.png",
      cluster: "Sawah1_Cluster.png",
    },
    corners: {
      topLeft: { lat: -8.151919744981786, lng: 113.7375974115912 },
      topRight: { lat: -8.152064708104465, lng: 113.73795447632318 },
      bottomRight: { lat: -8.152329532795992, lng: 113.73784475507549 },
      bottomLeft: { lat: -8.152184569673313, lng: 113.7374876903435 },
    },
    capturedAt: new Date("2026-05-12T03:00:00.000Z"),
    hama: {
      gridIndex: 112,
      areaName: "Sawah 1 - Petak Hama",
      status: "terindikasi" as const,
      jenisHama: "Bercak Cokelat",
      tingkatSerangan: "sedang" as const,
      rekomendasi:
        "Pantau kelembapan kanopi dan lakukan pengamatan ulang pada rumpun sekitar titik temuan.",
      imageUrl: "Hama_Bercak Cokelat.png",
    },
  },
  {
    fieldCode: "SW002",
    sourceName: "seed_SW002_20260513",
    layers: {
      rgb: "Sawah2_RGB.jpg",
      ndvi: "Sawah2_NDVI.png",
      cluster: "Sawah2_Cluster.png",
    },
    corners: {
      topLeft: { lat: -8.152197509794002, lng: 113.73759407564437 },
      topRight: { lat: -8.152385635969544, lng: 113.73792998208953 },
      bottomRight: { lat: -8.152634767983775, lng: 113.7377875910223 },
      bottomLeft: { lat: -8.152446641808233, lng: 113.73745168457714 },
    },
    capturedAt: new Date("2026-05-13T03:00:00.000Z"),
    hama: {
      gridIndex: 266,
      areaName: "Sawah 2 - Petak Hama",
      status: "kritis" as const,
      jenisHama: "Blas",
      tingkatSerangan: "tinggi" as const,
      rekomendasi:
        "Prioritaskan inspeksi lapangan, isolasi area terdampak, dan siapkan pengendalian terpadu.",
      imageUrl: "Hama_Blas.png",
    },
  },
  {
    fieldCode: "SW003",
    sourceName: "seed_SW003_20260514",
    layers: {
      rgb: "Sawah3_RGB.jpg",
      ndvi: "Sawah3_NDVI.png",
      cluster: "Sawah3_Cluster.png",
    },
    corners: {
      topLeft: { lat: -8.172965881903263, lng: 113.73935852638311 },
      topRight: { lat: -8.172634171762198, lng: 113.73955044779257 },
      bottomRight: { lat: -8.172776506985624, lng: 113.73980152917244 },
      bottomLeft: { lat: -8.17310821712669, lng: 113.73960960776299 },
    },
    capturedAt: new Date("2026-05-14T03:00:00.000Z"),
    hama: {
      gridIndex: 388,
      areaName: "Sawah 3 - Petak Hama",
      status: "terindikasi" as const,
      jenisHama: "Hawar Daun",
      tingkatSerangan: "sedang" as const,
      rekomendasi:
        "Kurangi genangan berlebih dan cek sebaran gejala pada baris tanam terdekat.",
      imageUrl: "Hama_Hawar Daun.png",
    },
  },
  {
    fieldCode: "SW004",
    sourceName: "seed_SW004_20260515",
    layers: {
      rgb: "Sawah4_RGB.jpg",
      ndvi: "Sawah4_NDVI.png",
      cluster: "Sawah4_Cluster.png",
    },
    corners: {
      topLeft: { lat: -8.151830826353764, lng: 113.73763391796103 },
      topRight: { lat: -8.15197487408249, lng: 113.7379904992979 },
      bottomRight: { lat: -8.152239340312901, lng: 113.73788147092785 },
      bottomLeft: { lat: -8.152095292584175, lng: 113.73752488959099 },
    },
    capturedAt: new Date("2026-05-15T03:00:00.000Z"),
    hama: {
      gridIndex: 183,
      areaName: "Sawah 4 - Petak Hama",
      status: "terindikasi" as const,
      jenisHama: "Bercak Cokelat",
      tingkatSerangan: "rendah" as const,
      rekomendasi:
        "Lakukan pemantauan ulang pada area bercak dan jaga sirkulasi udara kanopi.",
      imageUrl: "Hama_Bercak Cokelat.png",
    },
  },
];

function round(value: number, digits = 6) {
  return Number(value.toFixed(digits));
}

function gridCode(rowIndex: number, colIndex: number) {
  return `G${rowLabels[rowIndex]}${String(colIndex + 1).padStart(3, "0")}`;
}

function captureId(index: number) {
  return `CAP${String(index).padStart(3, "0")}`;
}

function deterministicNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function interpolatePoint(start: LatLngPoint, end: LatLngPoint, ratio: number) {
  return {
    lat: start.lat + (end.lat - start.lat) * ratio,
    lng: start.lng + (end.lng - start.lng) * ratio,
  };
}

function classifyNdvi(ndvi: number) {
  if (ndvi < 0.21) return "merah" as const;
  if (ndvi < 0.4) return "kuning" as const;
  return "hijau" as const;
}

function makeNdviMean(lahanIndex: number, rowIndex: number, colIndex: number) {
  const rowRatio = rowIndex / (ROW_COUNT - 1);
  const colRatio = colIndex / (COL_COUNT - 1);
  const wave =
    Math.sin((rowRatio * Math.PI + lahanIndex) * 2.2) * 0.16 +
    Math.cos((colRatio * Math.PI + lahanIndex) * 2.8) * 0.13;
  const noise =
    (deterministicNoise((lahanIndex + 1) * 10000 + rowIndex * 97 + colIndex) - 0.5) *
    0.16;

  return round(clamp(0.56 + wave + noise, 0.05, 0.92), 3);
}

function makeGridBounds(field: FieldCorners, rowIndex: number, colIndex: number) {
  const rowStartRatio = rowIndex / ROW_COUNT;
  const rowEndRatio = (rowIndex + 1) / ROW_COUNT;
  const colStartRatio = colIndex / COL_COUNT;
  const colEndRatio = (colIndex + 1) / COL_COUNT;
  const rowTopLeft = interpolatePoint(field.topLeft, field.bottomLeft, rowStartRatio);
  const rowTopRight = interpolatePoint(field.topRight, field.bottomRight, rowStartRatio);
  const rowBottomLeft = interpolatePoint(field.topLeft, field.bottomLeft, rowEndRatio);
  const rowBottomRight = interpolatePoint(field.topRight, field.bottomRight, rowEndRatio);
  const cellTopLeft = interpolatePoint(rowTopLeft, rowTopRight, colStartRatio);
  const cellTopRight = interpolatePoint(rowTopLeft, rowTopRight, colEndRatio);
  const cellBottomLeft = interpolatePoint(rowBottomLeft, rowBottomRight, colStartRatio);
  const cellBottomRight = interpolatePoint(rowBottomLeft, rowBottomRight, colEndRatio);
  const latValues = [
    cellTopLeft.lat,
    cellTopRight.lat,
    cellBottomRight.lat,
    cellBottomLeft.lat,
  ];
  const lngValues = [
    cellTopLeft.lng,
    cellTopRight.lng,
    cellBottomRight.lng,
    cellBottomLeft.lng,
  ];

  return {
    topLeft: { lat: round(cellTopLeft.lat, 12), lng: round(cellTopLeft.lng, 12) },
    topRight: { lat: round(cellTopRight.lat, 12), lng: round(cellTopRight.lng, 12) },
    bottomRight: {
      lat: round(cellBottomRight.lat, 12),
      lng: round(cellBottomRight.lng, 12),
    },
    bottomLeft: {
      lat: round(cellBottomLeft.lat, 12),
      lng: round(cellBottomLeft.lng, 12),
    },
    centerLat: round(latValues.reduce((sum, value) => sum + value, 0) / 4, 12),
    centerLng: round(lngValues.reduce((sum, value) => sum + value, 0) / 4, 12),
  };
}

function centerFromCorners(corners: FieldCorners) {
  const points = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ];

  return {
    lat: round(points.reduce((sum, point) => sum + point.lat, 0) / points.length, 12),
    lng: round(points.reduce((sum, point) => sum + point.lng, 0) / points.length, 12),
  };
}

function imagePath(
  fieldCode: string,
  capId: string,
  type: "rgb" | "ndvi" | "cluster" | "hama",
  fileName: string,
) {
  return `gs://${firebaseConfig.storageBucket}/lahan/${fieldCode}/captures/${capId}/${type}/${fileName}`;
}

async function deleteCollection(path: string) {
  const snapshot = await getDocs(collection(db, path));
  const deletePromises = snapshot.docs.map((item) => deleteDoc(item.ref));

  await Promise.all(deletePromises);
}

async function deleteExistingSeedData() {
  for (const field of lahanSeedData) {
    const fieldPath = `lahan/${field.fieldCode}`;
    const legacyPoints = await getDocs(collection(db, fieldPath, "inspection_points"));
    const captures = await getDocs(collection(db, fieldPath, "captures"));

    await Promise.all(
      legacyPoints.docs.map((point) =>
        deleteCollection(`${fieldPath}/inspection_points/${point.id}/sensor_readings`),
      ),
    );

    await Promise.all(
      captures.docs.map(async (capture) => {
        const capturePath = `${fieldPath}/captures/${capture.id}`;
        const points = await getDocs(collection(db, capturePath, "inspection_points"));

        await Promise.all(
          points.docs.map((point) =>
            deleteCollection(`${capturePath}/inspection_points/${point.id}/sensor_readings`),
          ),
        );

        await Promise.all([
          deleteCollection(`${capturePath}/inspection_points`),
          deleteCollection(`${capturePath}/hama_detections`),
          deleteCollection(`${capturePath}/grids`),
        ]);
      }),
    );

    await Promise.all([
      deleteCollection(`${fieldPath}/captures`),
      deleteCollection(`${fieldPath}/meta`),
      deleteCollection(`${fieldPath}/inspection_points`),
      deleteCollection(`${fieldPath}/hama_detections`),
      deleteCollection(`${fieldPath}/grids`),
    ]);

    await deleteDoc(doc(db, "lahan", field.fieldCode));
    await deleteDoc(doc(db, "_meta", `src_${field.sourceName}`));
  }

  await deleteDoc(doc(db, "_meta", "sawah_counter"));
}

async function commitInChunks(writes: Array<(batch: ReturnType<typeof writeBatch>) => void>) {
  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    const chunk = writes.slice(index, index + 450);

    chunk.forEach((write) => write(batch));
    await batch.commit();
  }
}

function buildGridRows(lahanIndex: number, corners: FieldCorners) {
  const gridRows: GridSeed[] = [];
  const groupSize = Math.ceil(GRID_COUNT_PER_LAHAN / INSPECTION_POINT_COUNT);

  for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
    for (let colIndex = 0; colIndex < COL_COUNT; colIndex += 1) {
      const gridNumber = rowIndex * COL_COUNT + colIndex;
      const pointIndex = Math.min(
        INSPECTION_POINT_COUNT - 1,
        Math.floor(gridNumber / groupSize),
      );
      const ndviMean = makeNdviMean(lahanIndex, rowIndex, colIndex);
      const clusterId = `C${pointIndex + 1}`;
      const clusterLabel = classifyNdvi(ndviMean);

      gridRows.push({
        gridCode: gridCode(rowIndex, colIndex),
        rowIndex,
        colIndex,
        bounds: makeGridBounds(corners, rowIndex, colIndex),
        ndviMean,
        clusterId,
        clusterLabel,
        stress: 1 - ndviMean,
      });
    }
  }

  return gridRows;
}

function makeSensorReading(
  point: GridSeed,
  pointCode: string,
  lahanIndex: number,
  pointIndex: number,
  readingIndex: number,
) {
  const seed = (lahanIndex + 1) * 1000 + (pointIndex + 1) * 100 + readingIndex;
  const stress = point.stress;

  return {
    pointCode,
    co2Ppm: round(405 + stress * 190 + deterministicNoise(seed + 11) * 35, 1),
    nh3Ppm: round(0.08 + stress * 0.7 + deterministicNoise(seed + 23) * 0.08, 3),
    coPpm: round(0.35 + stress * 1.7 + deterministicNoise(seed + 37) * 0.2, 3),
    no2Ppm: round(0.02 + stress * 0.18 + deterministicNoise(seed + 41) * 0.025, 3),
    temperatureC: round(27.2 + stress * 6.2 + deterministicNoise(seed + 53) * 1.1, 1),
    humidityPct: round(84 - stress * 22 - deterministicNoise(seed + 67) * 4, 1),
    recordedAt: new Date(Date.UTC(2026, 4, 15 + lahanIndex, 2 + readingIndex, pointIndex * 7)),
  };
}

async function seedLahan() {
  await deleteExistingSeedData();

  let totalGrids = 0;
  let totalSensors = 0;
  let totalHama = 0;
  let totalInspectionPoints = 0;

  const metaWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [
    (batch) => {
      batch.set(doc(db, "_meta", "sawah_counter"), {
        lastNumber: lahanSeedData.length,
        updatedAt: new Date(),
      });
    },
  ];

  for (const [lahanIndex, field] of lahanSeedData.entries()) {
    const fieldRef = doc(db, "lahan", field.fieldCode);
    const capId = captureId(1);
    const captureRef = doc(db, "lahan", field.fieldCode, "captures", capId);
    const center = centerFromCorners(field.corners);
    const gridRows = buildGridRows(lahanIndex, field.corners);

    metaWrites.push((batch) => {
      batch.set(doc(db, "_meta", `src_${field.sourceName}`), {
        sawahId: field.fieldCode,
        captureId: capId,
        updatedAt: new Date(),
      });
    });

    const rootWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [
      (batch) => {
        batch.set(fieldRef, {
          fieldCode: field.fieldCode,
          topLeft: field.corners.topLeft,
          topRight: field.corners.topRight,
          bottomRight: field.corners.bottomRight,
          bottomLeft: field.corners.bottomLeft,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      },
      (batch) => {
        batch.set(doc(db, "lahan", field.fieldCode, "meta", "capture_counter"), {
          lastNumber: 1,
          updatedAt: new Date(),
        });
      },
      (batch) => {
        batch.set(captureRef, {
          captureId: capId,
          fieldCode: field.fieldCode,
          gsd: null,
          gsdUnit: "cm/pixel",
          imageBounds: field.corners,
          centerLat: center.lat,
          centerLng: center.lng,
          rgbUrl: imagePath(field.fieldCode, capId, "rgb", field.layers.rgb),
          ndviUrl: imagePath(field.fieldCode, capId, "ndvi", field.layers.ndvi),
          clusterUrl: imagePath(field.fieldCode, capId, "cluster", field.layers.cluster),
          capturedAt: field.capturedAt,
          createdAt: new Date(),
        });
      },
    ];

    const gridWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    gridRows.forEach((grid, gridIndex) => {
      const spread = round(0.035 + deterministicNoise(lahanIndex * 5000 + gridIndex) * 0.04, 3);
      const median = round(
        clamp(grid.ndviMean + (deterministicNoise(gridIndex + 1) - 0.5) * 0.025, 0, 1),
        3,
      );

      gridWrites.push((batch) => {
        batch.set(
          doc(db, "lahan", field.fieldCode, "captures", capId, "grids", grid.gridCode),
          {
            gridCode: grid.gridCode,
            rowIndex: grid.rowIndex,
            colIndex: grid.colIndex,
            topLeft: grid.bounds.topLeft,
            topRight: grid.bounds.topRight,
            bottomRight: grid.bounds.bottomRight,
            bottomLeft: grid.bounds.bottomLeft,
            clusterId: grid.clusterId,
            clusterLabel: grid.clusterLabel,
            spatialClusterId: grid.clusterId,
            ndviMean: grid.ndviMean,
            ndviMin: round(clamp(grid.ndviMean - spread, 0, 1), 3),
            ndviMax: round(clamp(grid.ndviMean + spread, 0, 1), 3),
            ndviStddev: round(spread / 2, 3),
            ndviMedian: median,
            ndviVariance: round((spread / 2) ** 2, 5),
            ndviP25: round(clamp(grid.ndviMean - spread / 2, 0, 1), 3),
            ndviP50: median,
            ndviP75: round(clamp(grid.ndviMean + spread / 2, 0, 1), 3),
            createdAt: new Date(),
          },
        );
      });
    });

    const inspectionWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    const sensorWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    const groupSize = Math.ceil(gridRows.length / INSPECTION_POINT_COUNT);

    for (let pointIndex = 0; pointIndex < INSPECTION_POINT_COUNT; pointIndex += 1) {
      const pointCode = `P${pointIndex + 1}`;
      const clusterId = `C${pointIndex + 1}`;
      const pointGrids = gridRows.slice(pointIndex * groupSize, (pointIndex + 1) * groupSize);
      const worstGrid = pointGrids.reduce((current, next) =>
        next.ndviMean < current.ndviMean ? next : current,
      );

      inspectionWrites.push((batch) => {
        batch.set(
          doc(db, "lahan", field.fieldCode, "captures", capId, "inspection_points", pointCode),
          {
            pointCode,
            clusterId,
            clusterLabel: worstGrid.clusterLabel,
            inspectionLat: worstGrid.bounds.centerLat,
            inspectionLng: worstGrid.bounds.centerLng,
            representativeGridCodes: pointGrids.map((grid) => grid.gridCode),
            createdAt: new Date(),
          },
        );
      });

      for (let readingIndex = 0; readingIndex < 2; readingIndex += 1) {
        const reading = makeSensorReading(
          worstGrid,
          pointCode,
          lahanIndex,
          pointIndex,
          readingIndex,
        );
        const readingId = String(reading.recordedAt.getTime());

        sensorWrites.push((batch) => {
          batch.set(
            doc(
              db,
              "lahan",
              field.fieldCode,
              "captures",
              capId,
              "inspection_points",
              pointCode,
              "sensor_readings",
              readingId,
            ),
            reading,
          );
        });
      }
    }

    const hamaGrid = gridRows[field.hama.gridIndex % gridRows.length];

    if (!hamaGrid) {
      throw new Error(`Grid hama tidak ditemukan untuk ${field.fieldCode}`);
    }

    const hamaWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [
      (batch) => {
        batch.set(
          doc(db, "lahan", field.fieldCode, "captures", capId, "hama_detections", "detection_001"),
          {
            gridCode: hamaGrid.gridCode,
            latitude: hamaGrid.bounds.centerLat,
            longitude: hamaGrid.bounds.centerLng,
            areaName: field.hama.areaName,
            status: field.hama.status,
            jenisHama: field.hama.jenisHama,
            tingkatSerangan: field.hama.tingkatSerangan,
            rekomendasi: field.hama.rekomendasi,
            imageUrl: imagePath(field.fieldCode, capId, "hama", field.hama.imageUrl),
            detectedAt: new Date(Date.UTC(2026, 4, 18 + lahanIndex, 3, 0)),
          },
        );
      },
    ];

    await commitInChunks([
      ...rootWrites,
      ...gridWrites,
      ...inspectionWrites,
      ...sensorWrites,
      ...hamaWrites,
    ]);

    totalGrids += gridRows.length;
    totalSensors += sensorWrites.length;
    totalInspectionPoints += inspectionWrites.length;
    totalHama += hamaWrites.length;
  }

  await commitInChunks(metaWrites);

  console.log(
    [
      "Seed Firebase lahan selesai.",
      `Lahan: ${lahanSeedData.length}`,
      `Capture per lahan: 1`,
      `Grid: ${totalGrids}`,
      `Inspection point: ${totalInspectionPoints}`,
      `Sensor reading: ${totalSensors}`,
      `Hama detection: ${totalHama}`,
      `Grid per lahan: ${GRID_COUNT_PER_LAHAN}`,
    ].join("\n"),
  );
}

seedLahan().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
