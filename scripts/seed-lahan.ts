import dotenv from "dotenv";
import { inArray } from "drizzle-orm";

dotenv.config({
  path: new URL("../../../apps/server/.env", import.meta.url),
});

const { createDb } = await import("./index");
const {
  gridClusterResult,
  lahan,
  lahanGrid,
  lahanHamaDetection,
  lahanSensorReading,
} = await import("./schema/lahan");

const db = createDb();

const ROW_COUNT = 20;
const COL_COUNT = 25;
const GRID_COUNT_PER_LAHAN = ROW_COUNT * COL_COUNT;

const rowLabels = "ABCDEFGHIJKLMNOPQRST".split("");

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

const lahanSeedData = [
  {
    fieldCode: "SW001",
    name: "Sawah 1",
    layers: {
      rgb: "Sawah1_RGB.jpg",
      ndvi: "Sawah1_NDVI.png",
    },
    corners: {
      topLeft: {
        lat: -8.151919744981786,
        lng: 113.7375974115912,
      },
      topRight: {
        lat: -8.152064708104465,
        lng: 113.73795447632318,
      },
      bottomRight: {
        lat: -8.152329532795992,
        lng: 113.73784475507549,
      },
      bottomLeft: {
        lat: -8.152184569673313,
        lng: 113.7374876903435,
      },
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
    name: "Sawah 2",
    layers: {
      rgb: "Sawah2_RGB.jpg",
      ndvi: "Sawah2_NDVI.png",
    },
    corners: {
      topLeft: {
        lat: -8.152197509794002,
        lng: 113.73759407564437,
      },
      topRight: {
        lat: -8.152385635969544,
        lng: 113.73792998208953,
      },
      bottomRight: {
        lat: -8.152634767983775,
        lng: 113.7377875910223,
      },
      bottomLeft: {
        lat: -8.152446641808233,
        lng: 113.73745168457714,
      },
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
    name: "Sawah 3",
    layers: {
      rgb: "Sawah3_RGB.jpg",
      ndvi: "Sawah3_NDVI.png",
    },
    corners: {
      topLeft: {
        lat: -8.172965881903263,
        lng: 113.73935852638311,
      },
      topRight: {
        lat: -8.172634171762198,
        lng: 113.73955044779257,
      },
      bottomRight: {
        lat: -8.172776506985624,
        lng: 113.73980152917244,
      },
      bottomLeft: {
        lat: -8.17310821712669,
        lng: 113.73960960776299,
      },
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
    name: "Sawah 4",
    layers: {
      rgb: "Sawah4_RGB.jpg",
      ndvi: "Sawah4_NDVI.png",
    },
    corners: {
      topLeft: {
        lat: -8.151830826353764,
        lng: 113.73763391796103,
      },
      topRight: {
        lat: -8.15197487408249,
        lng: 113.7379904992979,
      },
      bottomRight: {
        lat: -8.152239340312901,
        lng: 113.73788147092785,
      },
      bottomLeft: {
        lat: -8.152095292584175,
        lng: 113.73752488959099,
      },
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
  return `G-${rowLabels[rowIndex]}${String(colIndex + 1).padStart(2, "0")}`;
}

function deterministicNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function interpolatePoint(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  ratio: number,
) {
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
  const noise = (deterministicNoise((lahanIndex + 1) * 10000 + rowIndex * 97 + colIndex) - 0.5) * 0.16;

  return round(clamp(0.56 + wave + noise, 0.05, 0.92), 3);
}

function makeGridBounds(
  field: FieldCorners,
  rowIndex: number,
  colIndex: number,
) {
  const rowStartRatio = rowIndex / ROW_COUNT;
  const rowEndRatio = (rowIndex + 1) / ROW_COUNT;
  const colStartRatio = colIndex / COL_COUNT;
  const colEndRatio = (colIndex + 1) / COL_COUNT;
  const { topLeft, topRight, bottomRight, bottomLeft } = field;
  const rowTopLeft = interpolatePoint(topLeft, bottomLeft, rowStartRatio);
  const rowTopRight = interpolatePoint(topRight, bottomRight, rowStartRatio);
  const rowBottomLeft = interpolatePoint(topLeft, bottomLeft, rowEndRatio);
  const rowBottomRight = interpolatePoint(topRight, bottomRight, rowEndRatio);
  const cellTopLeft = interpolatePoint(rowTopLeft, rowTopRight, colStartRatio);
  const cellTopRight = interpolatePoint(rowTopLeft, rowTopRight, colEndRatio);
  const cellBottomLeft = interpolatePoint(
    rowBottomLeft,
    rowBottomRight,
    colStartRatio,
  );
  const cellBottomRight = interpolatePoint(
    rowBottomLeft,
    rowBottomRight,
    colEndRatio,
  );
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
    topLeft: {
      lat: round(cellTopLeft.lat, 12),
      lng: round(cellTopLeft.lng, 12),
    },
    topRight: {
      lat: round(cellTopRight.lat, 12),
      lng: round(cellTopRight.lng, 12),
    },
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

function getFieldCorners(field: (typeof lahanSeedData)[number]) {
  return field.corners;
}

async function deleteExistingSeedData() {
  const existingLahan = await db
    .select({ id: lahan.id })
    .from(lahan)
    .where(
      inArray(
        lahan.fieldCode,
        lahanSeedData.map((field) => field.fieldCode),
      ),
    );

  const lahanIds = existingLahan.map((field) => field.id);

  if (lahanIds.length === 0) {
    return;
  }

  const existingGrids = await db
    .select({ id: lahanGrid.id })
    .from(lahanGrid)
    .where(inArray(lahanGrid.lahanId, lahanIds));

  const gridIds = existingGrids.map((grid) => grid.id);

  if (gridIds.length > 0) {
    await db
      .delete(lahanHamaDetection)
      .where(inArray(lahanHamaDetection.gridId, gridIds));
    await db
      .delete(lahanSensorReading)
      .where(inArray(lahanSensorReading.gridId, gridIds));
    await db
      .delete(gridClusterResult)
      .where(inArray(gridClusterResult.gridId, gridIds));
  }

  await db.delete(lahan).where(inArray(lahan.id, lahanIds));
}

async function seedLahan() {
  await deleteExistingSeedData();

  let totalGrids = 0;
  let totalClusters = 0;
  let totalSensors = 0;
  let totalHama = 0;

  for (const [lahanIndex, field] of lahanSeedData.entries()) {
    const [createdLahan] = await db
      .insert(lahan)
      .values({
        fieldCode: field.fieldCode,
        name: field.name,
        ...field.corners,
        rgbUrl: field.layers.rgb,
        ndviUrl: field.layers.ndvi,
        clusterUrl: null,
        capturedAt: field.capturedAt,
      })
      .returning({ id: lahan.id });

    if (!createdLahan) {
      throw new Error(`Gagal membuat lahan ${field.fieldCode}`);
    }

    const gridRows = [];
    const fieldCorners = getFieldCorners(field);

    for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
      for (let colIndex = 0; colIndex < COL_COUNT; colIndex += 1) {
        const bounds = makeGridBounds(fieldCorners, rowIndex, colIndex);

        gridRows.push({
          lahanId: createdLahan.id,
          rowIndex,
          colIndex,
          gridCode: gridCode(rowIndex, colIndex),
          topLeft: bounds.topLeft,
          topRight: bounds.topRight,
          bottomRight: bounds.bottomRight,
          bottomLeft: bounds.bottomLeft,
          inspectionLat: null,
          inspectionLng: null,
        });
      }
    }

    const createdGrids = await db
      .insert(lahanGrid)
      .values(gridRows)
      .returning({
        id: lahanGrid.id,
        rowIndex: lahanGrid.rowIndex,
        colIndex: lahanGrid.colIndex,
        gridCode: lahanGrid.gridCode,
        topLeft: lahanGrid.topLeft,
        topRight: lahanGrid.topRight,
        bottomRight: lahanGrid.bottomRight,
        bottomLeft: lahanGrid.bottomLeft,
      });

    const clusterRows = [];
    const sensorRows = [];

    for (const grid of createdGrids) {
      const gridNumber = grid.rowIndex * COL_COUNT + grid.colIndex + 1;
      const ndviMean = makeNdviMean(lahanIndex, grid.rowIndex, grid.colIndex);
      const spread = round(0.035 + deterministicNoise(lahanIndex * 5000 + gridNumber) * 0.04, 3);
      const stress = 1 - ndviMean;
      const centerLat =
        (grid.topLeft.lat +
          grid.topRight.lat +
          grid.bottomRight.lat +
          grid.bottomLeft.lat) /
        4;
      const centerLng =
        (grid.topLeft.lng +
          grid.topRight.lng +
          grid.bottomRight.lng +
          grid.bottomLeft.lng) /
        4;

      clusterRows.push({
        gridId: grid.id,
        clusterLabel: classifyNdvi(ndviMean),
        ndviMean,
        ndviMin: round(clamp(ndviMean - spread, 0, 1), 3),
        ndviMax: round(clamp(ndviMean + spread, 0, 1), 3),
        ndviStddev: round(spread / 2, 3),
        ndviMedian: round(clamp(ndviMean + (deterministicNoise(gridNumber) - 0.5) * 0.025, 0, 1), 3),
        ndviVariance: round((spread / 2) ** 2, 5),
        ndviP25: round(clamp(ndviMean - spread / 2, 0, 1), 3),
        ndviP75: round(clamp(ndviMean + spread / 2, 0, 1), 3),
      });

      sensorRows.push({
        gridId: grid.id,
        latitude: round(centerLat, 12),
        longitude: round(centerLng, 12),
        co2Ppm: round(405 + stress * 190 + deterministicNoise(gridNumber + 11) * 35, 1),
        nh3Ppm: round(0.08 + stress * 0.7 + deterministicNoise(gridNumber + 23) * 0.08, 3),
        coPpm: round(0.35 + stress * 1.7 + deterministicNoise(gridNumber + 37) * 0.2, 3),
        no2Ppm: round(0.02 + stress * 0.18 + deterministicNoise(gridNumber + 41) * 0.025, 3),
        temperatureC: round(27.2 + stress * 6.2 + deterministicNoise(gridNumber + 53) * 1.1, 1),
        humidityPct: round(84 - stress * 22 - deterministicNoise(gridNumber + 67) * 4, 1),
        recordedAt: new Date(Date.UTC(2026, 4, 15 + lahanIndex, 2, gridNumber % 60)),
      });
    }

    await db.insert(gridClusterResult).values(clusterRows);
    await db.insert(lahanSensorReading).values(sensorRows);

    const hamaGrid = createdGrids[field.hama.gridIndex];

    if (!hamaGrid) {
      throw new Error(`Grid hama tidak ditemukan untuk ${field.fieldCode}`);
    }

    await db.insert(lahanHamaDetection).values({
      gridId: hamaGrid.id,
      latitude: round(
        (hamaGrid.topLeft.lat +
          hamaGrid.topRight.lat +
          hamaGrid.bottomRight.lat +
          hamaGrid.bottomLeft.lat) /
          4,
        12,
      ),
      longitude: round(
        (hamaGrid.topLeft.lng +
          hamaGrid.topRight.lng +
          hamaGrid.bottomRight.lng +
          hamaGrid.bottomLeft.lng) /
          4,
        12,
      ),
      areaName: field.hama.areaName,
      status: field.hama.status,
      jenisHama: field.hama.jenisHama,
      tingkatSerangan: field.hama.tingkatSerangan,
      rekomendasi: field.hama.rekomendasi,
      imageUrl: field.hama.imageUrl,
      detectedAt: new Date(Date.UTC(2026, 4, 18 + lahanIndex, 3, 0)),
    });

    totalGrids += createdGrids.length;
    totalClusters += clusterRows.length;
    totalSensors += sensorRows.length;
    totalHama += 1;
  }

  console.log(
    [
      "Seed lahan selesai.",
      `Lahan: ${lahanSeedData.length}`,
      `Grid: ${totalGrids}`,
      `Cluster NDVI: ${totalClusters}`,
      `Sensor reading: ${totalSensors}`,
      `Hama detection: ${totalHama}`,
      `Grid per lahan: ${GRID_COUNT_PER_LAHAN}`,
    ].join("\n"),
  );
}

seedLahan()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
