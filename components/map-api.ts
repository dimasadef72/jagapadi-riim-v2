"use client";

import { getDownloadURL, ref } from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase";
import {
  canUseFirebaseLahanService,
  getGrids,
  getHamaDetections,
  getInspectionPoints,
  getLahan,
  getLahanList,
  getLatestCapture,
  getSensor7In1Readings,
  getSensorReadings,
} from "@/services/lahan-service";
import type {
  HamaDetection,
  InspectionPoint,
  Lahan,
  LahanCapture,
  LahanGrid,
  Sensor7In1Reading,
  SensorReading,
} from "@/types/lahan";

export type LahanOption = {
  id: string;
  fieldCode: string;
  name: string;
};

export type ApiBounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type MapImageLayer = {
  type: "rgb" | "ndvi" | "cluster";
  url: string;
  bounds: ApiBounds;
  corners?: LayerCorners;
  capturedAt?: string | null;
};

export type LayerCorners = {
  topLeft: { lat: number; lng: number };
  topRight: { lat: number; lng: number };
  bottomRight: { lat: number; lng: number };
  bottomLeft: { lat: number; lng: number };
};

export type MapGrid = {
  gridId: string;
  gridCode: string;
  rowIndex: number;
  colIndex: number;
  bounds: ApiBounds;
  corners: LayerCorners;
  center: {
    lat: number;
    lng: number;
  };
  inspection: {
    lat: number;
    lng: number;
  } | null;
  ndvi: {
    clusterLabel: string;
    gridColor: string | null;
    isPlant: boolean | null;
    spatialClusterId: string | number | null;
    mean: number | null;
    min: number | null;
    max: number | null;
    stddev: number | null;
    median: number | null;
    variance: number | null;
    p25: number | null;
    p50: number | null;
    p75: number | null;
  } | null;
  sensor: {
    co2Ppm: number | null;
    nh3Ppm: number | null;
    coPpm: number | null;
    no2Ppm: number | null;
    temperatureC: number | null;
    humidityPct: number | null;
    recordedAt: string;
  } | null;
  sensorReadings: MapSensorReading[];
  latestSensor7In1: MapSensor7In1Reading | null;
  sensor7In1Readings: MapSensor7In1Reading[];
};

export type MapHama = {
  id: string;
  gridId: string | null;
  gridCode: string;
  latitude: number;
  longitude: number;
  areaName: string | null;
  status: string;
  jenisHama: string | null;
  tingkatSerangan: string | null;
  rekomendasi: string | null;
  imageUrl: string | null;
  detectedAt: string;
};

export type MapSensorReading = {
  readingId: string;
  co2Ppm: number | null;
  nh3Ppm: number | null;
  coPpm: number | null;
  no2Ppm: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  recordedAt: string;
};

export type MapSensor7In1Reading = {
  readingId: string;
  nitrogenPpm: number | null;
  phosphorusPpm: number | null;
  potassiumPpm: number | null;
  ph: number | null;
  ecDsM: number | null;
  humidityPct: number | null;
  temperatureC: number | null;
  recordedAt: string;
};

export type MapInspectionPoint = {
  pointCode: string;
  clusterId: string | number | null;
  clusterLabel: string;
  inspectionLat: number;
  inspectionLng: number;
  representativeGridCodes: string[];
  latestSensor: MapSensorReading | null;
  sensorReadings: MapSensorReading[];
  latestSensor7In1: MapSensor7In1Reading | null;
  sensor7In1Readings: MapSensor7In1Reading[];
};

export type LahanMapData = {
  lahan: LahanOption & {
    captureId: string;
    bounds: ApiBounds;
    center: {
      lat: number;
      lng: number;
    };
    capturedAt: string | null;
  };
  layers: {
    rgb: MapImageLayer | null;
    ndvi: MapImageLayer | null;
    cluster: MapImageLayer | null;
  };
  grids: MapGrid[];
  inspectionPoints: MapInspectionPoint[];
  hama: MapHama[];
};

export type PhaseTableRow = {
  grid: string;
  coordinates: [number, number];
  raw: MapGrid | MapInspectionPoint | MapHama;
  ndvi?: string;
  mean?: string;
  min?: string;
  max?: string;
  stddev?: string;
  median?: string;
  variance?: string;
  p25?: string;
  p50?: string;
  p75?: string;
  cluster?: string;
  co2?: string;
  nh3?: string;
  co?: string;
  no2?: string;
  temp?: string;
  humidity?: string;
  area?: string;
  status?: string;
  jenis?: string;
  tingkat?: string;
  rekomendasi?: string;
  imageUrl?: string;
  representedGrids?: string;
  representedCount?: string;
  sensorStatus?: string;
  recordedAt?: string;
};

const mockLahan: LahanOption[] = [
  {
    id: "SW001",
    fieldCode: "SW001",
    name: "Sawah Demo Surabaya",
  },
];

const mockBounds: ApiBounds = {
  minLat: -7.2522,
  minLng: 112.7676,
  maxLat: -7.2486,
  maxLng: 112.7712,
};

const mockCorners: LayerCorners = {
  topLeft: { lat: mockBounds.maxLat, lng: mockBounds.minLng },
  topRight: { lat: mockBounds.maxLat, lng: mockBounds.maxLng },
  bottomRight: { lat: mockBounds.minLat, lng: mockBounds.maxLng },
  bottomLeft: { lat: mockBounds.minLat, lng: mockBounds.minLng },
};

function createMockGrid(
  gridCode: string,
  rowIndex: number,
  colIndex: number,
  center: { lat: number; lng: number },
  clusterLabel: string,
  mean: number,
): MapGrid {
  const latStep = 0.00065;
  const lngStep = 0.00065;
  const top = center.lat + latStep / 2;
  const bottom = center.lat - latStep / 2;
  const left = center.lng - lngStep / 2;
  const right = center.lng + lngStep / 2;

  return {
    gridId: gridCode,
    gridCode,
    rowIndex,
    colIndex,
    bounds: {
      minLat: bottom,
      minLng: left,
      maxLat: top,
      maxLng: right,
    },
    corners: {
      topLeft: { lat: top, lng: left },
      topRight: { lat: top, lng: right },
      bottomRight: { lat: bottom, lng: right },
      bottomLeft: { lat: bottom, lng: left },
    },
    center,
    inspection: {
      lat: center.lat,
      lng: center.lng,
    },
    ndvi: {
      clusterLabel,
      gridColor:
        clusterLabel === "merah"
          ? "Red"
          : clusterLabel === "kuning"
            ? "Yellow"
            : "Green",
      isPlant: true,
      spatialClusterId: null,
      mean,
      min: mean - 0.04,
      max: mean + 0.04,
      stddev: 0.03,
      median: mean + 0.01,
      variance: 0.0009,
      p25: mean - 0.02,
      p50: mean + 0.01,
      p75: mean + 0.02,
    },
    sensor: {
      co2Ppm: 410 + rowIndex * 12,
      nh3Ppm:
        clusterLabel === "merah" ? 5.1 : clusterLabel === "kuning" ? 2.8 : 1.1,
      coPpm: clusterLabel === "merah" ? 1.2 : 0.4,
      no2Ppm: clusterLabel === "merah" ? 0.09 : 0.03,
      temperatureC:
        clusterLabel === "merah" ? 33 : clusterLabel === "kuning" ? 30 : 28,
      humidityPct:
        clusterLabel === "merah" ? 32 : clusterLabel === "kuning" ? 48 : 66,
      recordedAt: "2026-05-26T08:00:00.000Z",
    },
    sensorReadings: [
      {
        readingId: `${gridCode}-S1`,
        co2Ppm: 410 + rowIndex * 12,
        nh3Ppm:
          clusterLabel === "merah"
            ? 5.1
            : clusterLabel === "kuning"
              ? 2.8
              : 1.1,
        coPpm: clusterLabel === "merah" ? 1.2 : 0.4,
        no2Ppm: clusterLabel === "merah" ? 0.09 : 0.03,
        temperatureC:
          clusterLabel === "merah" ? 33 : clusterLabel === "kuning" ? 30 : 28,
        humidityPct:
          clusterLabel === "merah" ? 32 : clusterLabel === "kuning" ? 48 : 66,
        recordedAt: "2026-05-26T08:00:00.000Z",
      },
    ],
    latestSensor7In1: null,
    sensor7In1Readings: [],
  };
}

const mockMapData: LahanMapData = {
  lahan: {
    ...mockLahan[0],
    captureId: "CAP001",
    bounds: mockBounds,
    center: {
      lat: -7.2504,
      lng: 112.7694,
    },
    capturedAt: "2026-05-26T08:00:00.000Z",
  },
  layers: {
    rgb: {
      type: "rgb",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/17066/26647",
      bounds: mockBounds,
      corners: mockCorners,
      capturedAt: "2026-05-26T08:00:00.000Z",
    },
    ndvi: {
      type: "ndvi",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/17066/26648",
      bounds: mockBounds,
      corners: mockCorners,
      capturedAt: "2026-05-26T08:00:00.000Z",
    },
    cluster: null,
  },
  inspectionPoints: [
    {
      pointCode: "P1",
      clusterId: "C1",
      clusterLabel: "merah",
      inspectionLat: -7.2503,
      inspectionLng: 112.7686,
      representativeGridCodes: ["G-B1"],
      latestSensor: {
        readingId: "mock-p1-1",
        co2Ppm: 434,
        nh3Ppm: 5.1,
        coPpm: 1.2,
        no2Ppm: 0.09,
        temperatureC: 33,
        humidityPct: 32,
        recordedAt: "2026-05-26T08:00:00.000Z",
      },
      sensorReadings: [
        {
          readingId: "mock-p1-1",
          co2Ppm: 434,
          nh3Ppm: 5.1,
          coPpm: 1.2,
          no2Ppm: 0.09,
          temperatureC: 33,
          humidityPct: 32,
          recordedAt: "2026-05-26T08:00:00.000Z",
        },
        {
          readingId: "mock-p1-2",
          co2Ppm: 426,
          nh3Ppm: 4.7,
          coPpm: 1.1,
          no2Ppm: 0.08,
          temperatureC: 32.4,
          humidityPct: 35,
          recordedAt: "2026-05-26T07:00:00.000Z",
        },
      ],
      latestSensor7In1: {
        readingId: "mock-p1-7in1-1",
        nitrogenPpm: 22,
        phosphorusPpm: 14,
        potassiumPpm: 31,
        ph: 6.4,
        ecDsM: 1.2,
        humidityPct: 46,
        temperatureC: 29.8,
        recordedAt: "2026-05-26T08:05:00.000Z",
      },
      sensor7In1Readings: [
        {
          readingId: "mock-p1-7in1-1",
          nitrogenPpm: 22,
          phosphorusPpm: 14,
          potassiumPpm: 31,
          ph: 6.4,
          ecDsM: 1.2,
          humidityPct: 46,
          temperatureC: 29.8,
          recordedAt: "2026-05-26T08:05:00.000Z",
        },
      ],
    },
    {
      pointCode: "P2",
      clusterId: "C2",
      clusterLabel: "kuning",
      inspectionLat: -7.2494,
      inspectionLng: 112.7695,
      representativeGridCodes: ["G-A2", "G-C1"],
      latestSensor: {
        readingId: "mock-p2-1",
        co2Ppm: 410,
        nh3Ppm: 2.8,
        coPpm: 0.4,
        no2Ppm: 0.03,
        temperatureC: 30,
        humidityPct: 48,
        recordedAt: "2026-05-26T08:10:00.000Z",
      },
      sensorReadings: [
        {
          readingId: "mock-p2-1",
          co2Ppm: 410,
          nh3Ppm: 2.8,
          coPpm: 0.4,
          no2Ppm: 0.03,
          temperatureC: 30,
          humidityPct: 48,
          recordedAt: "2026-05-26T08:10:00.000Z",
        },
      ],
      latestSensor7In1: null,
      sensor7In1Readings: [],
    },
    {
      pointCode: "P3",
      clusterId: "C3",
      clusterLabel: "hijau",
      inspectionLat: -7.2512,
      inspectionLng: 112.7695,
      representativeGridCodes: ["G-A1", "G-B2", "G-C2"],
      latestSensor: null,
      sensorReadings: [],
      latestSensor7In1: null,
      sensor7In1Readings: [],
    },
  ],
  grids: [
    createMockGrid("G-A1", 0, 0, { lat: -7.2494, lng: 112.7686 }, "hijau", 0.8),
    createMockGrid(
      "G-A2",
      0,
      1,
      { lat: -7.2494, lng: 112.7695 },
      "kuning",
      0.42,
    ),
    createMockGrid(
      "G-B1",
      1,
      0,
      { lat: -7.2503, lng: 112.7686 },
      "merah",
      0.18,
    ),
    createMockGrid(
      "G-B2",
      1,
      1,
      { lat: -7.2503, lng: 112.7695 },
      "hijau",
      0.75,
    ),
    createMockGrid(
      "G-C1",
      2,
      0,
      { lat: -7.2512, lng: 112.7686 },
      "kuning",
      0.48,
    ),
    createMockGrid(
      "G-C2",
      2,
      1,
      { lat: -7.2512, lng: 112.7695 },
      "hijau",
      0.66,
    ),
  ],
  hama: [
    {
      id: "H-001",
      gridId: "G-A2",
      gridCode: "G-A2",
      latitude: -7.2494,
      longitude: 112.7695,
      areaName: "Sektor Utara",
      status: "terindikasi",
      jenisHama: "Wereng Coklat",
      tingkatSerangan: "sedang",
      rekomendasi:
        "Pantau ulang dan lakukan penyemprotan organik dosis rendah.",
      imageUrl: null,
      detectedAt: "2026-05-26T08:00:00.000Z",
    },
    {
      id: "H-002",
      gridId: "G-B1",
      gridCode: "G-B1",
      latitude: -7.2503,
      longitude: 112.7686,
      areaName: "Sektor Tengah",
      status: "kritis",
      jenisHama: "Penggerek Batang",
      tingkatSerangan: "tinggi",
      rekomendasi: "Prioritaskan inspeksi lapangan dan isolasi area terdampak.",
      imageUrl: null,
      detectedAt: "2026-05-26T08:20:00.000Z",
    },
  ],
};

function getServerUrl() {
  return process.env.NEXT_PUBLIC_SERVER_URL;
}

async function fetchApi<T>(path: string): Promise<T> {
  const serverUrl = getServerUrl();

  if (!serverUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URL belum dikonfigurasi.");
  }

  const response = await fetch(`${serverUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Gagal mengambil data API: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchLahan() {
  if (getServerUrl()) {
    return fetchApi<LahanOption[]>("/lahan");
  }

  if (canUseFirebaseLahanService()) {
    return getLahanList().catch(() => mockLahan);
  }

  return Promise.resolve(mockLahan);
}

function timestampToString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

function boundsFromCorners(corners: LayerCorners): ApiBounds {
  const lats = [
    corners.topLeft.lat,
    corners.topRight.lat,
    corners.bottomRight.lat,
    corners.bottomLeft.lat,
  ];
  const lngs = [
    corners.topLeft.lng,
    corners.topRight.lng,
    corners.bottomRight.lng,
    corners.bottomLeft.lng,
  ];

  return {
    minLat: Math.min(...lats),
    minLng: Math.min(...lngs),
    maxLat: Math.max(...lats),
    maxLng: Math.max(...lngs),
  };
}

function centerFromBounds(bounds: ApiBounds) {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

async function resolveImageUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (url.startsWith("gs://")) {
    const [, path] = url.split("gs://");
    const slashIndex = path.indexOf("/");

    if (slashIndex > 0) {
      const bucket = path.slice(0, slashIndex);
      const objectPath = path.slice(slashIndex + 1);
      return `https://storage.googleapis.com/${bucket}/${objectPath}`;
    }

    try {
      return await getDownloadURL(ref(getFirebaseStorage(), url));
    } catch {
      return null;
    }
  }

  return url;
}

function toLayerCorners(
  data: Pick<
    Lahan | LahanGrid,
    "topLeft" | "topRight" | "bottomRight" | "bottomLeft"
  >,
): LayerCorners {
  return {
    topLeft: data.topLeft,
    topRight: data.topRight,
    bottomRight: data.bottomRight,
    bottomLeft: data.bottomLeft,
  };
}

function getCaptureCorners(lahan: Lahan, capture: LahanCapture): LayerCorners {
  if (capture.imageBounds) {
    return toLayerCorners(capture.imageBounds);
  }

  return toLayerCorners(lahan);
}

async function toImageLayer(
  type: MapImageLayer["type"],
  url: string | null | undefined,
  corners: LayerCorners,
  capturedAt: unknown,
): Promise<MapImageLayer | null> {
  const normalizedUrl = await resolveImageUrl(url);

  if (!normalizedUrl) {
    return null;
  }

  return {
    type,
    url: normalizedUrl,
    bounds: boundsFromCorners(corners),
    corners,
    capturedAt: timestampToString(capturedAt),
  };
}

function toMapGrid(
  grid: LahanGrid,
  sensorReadings: SensorReading[] | null | undefined,
  sensor7In1Readings: Sensor7In1Reading[] | null | undefined = [],
): MapGrid {
  const corners = toLayerCorners(grid);
  const bounds = boundsFromCorners(corners);
  const mappedSensorReadings = (sensorReadings ?? [])
    .map(toMapSensorReading)
    .filter((reading): reading is MapSensorReading => Boolean(reading));
  const mappedSensor7In1Readings = (sensor7In1Readings ?? [])
    .map(toMapSensor7In1Reading)
    .filter(
      (reading): reading is MapSensor7In1Reading => Boolean(reading),
    );
  const latestSensor = sensorReadings?.[0] ?? null;

  return {
    gridId: grid.gridCode,
    gridCode: grid.gridCode,
    rowIndex: grid.rowIndex,
    colIndex: grid.colIndex,
    bounds,
    corners,
    center: centerFromBounds(bounds),
    inspection: null,
    ndvi: {
      clusterLabel: grid.clusterLabel || "-",
      gridColor: grid.gridColor ?? null,
      isPlant: grid.isPlant ?? null,
      spatialClusterId: grid.spatialClusterId ?? null,
      mean: grid.ndviMean,
      min: grid.ndviMin ?? null,
      max: grid.ndviMax ?? null,
      stddev: grid.ndviStddev ?? null,
      median: grid.ndviMedian ?? null,
      variance: grid.ndviVariance ?? null,
      p25: grid.ndviP25 ?? null,
      p50: grid.ndviP50 ?? grid.ndviMedian ?? null,
      p75: grid.ndviP75 ?? null,
    },
    sensor: latestSensor
      ? {
          co2Ppm: latestSensor.co2Ppm ?? null,
          nh3Ppm: latestSensor.nh3Ppm ?? null,
          coPpm: latestSensor.coPpm ?? null,
          no2Ppm: latestSensor.no2Ppm ?? null,
          temperatureC: latestSensor.temperatureC ?? null,
          humidityPct: latestSensor.humidityPct ?? null,
          recordedAt: timestampToString(latestSensor.recordedAt) ?? "",
        }
      : null,
    sensorReadings: mappedSensorReadings,
    latestSensor7In1: mappedSensor7In1Readings[0] ?? null,
    sensor7In1Readings: mappedSensor7In1Readings,
  };
}

async function toMapHama(
  item: HamaDetection & { id: string },
): Promise<MapHama> {
  return {
    id: item.id,
    gridId: item.gridCode ?? null,
    gridCode: item.gridCode ?? "-",
    latitude: item.latitude,
    longitude: item.longitude,
    areaName: item.areaName ?? null,
    status: item.status,
    jenisHama: item.jenisHama ?? null,
    tingkatSerangan: item.tingkatSerangan ?? null,
    rekomendasi: item.rekomendasi ?? null,
    imageUrl: await resolveImageUrl(item.imageUrl),
    detectedAt: timestampToString(item.detectedAt) ?? "",
  };
}

export function toMapSensorReading(
  reading: SensorReading | null | undefined,
): MapSensorReading | null {
  if (!reading) {
    return null;
  }

  return {
    readingId: reading.readingId ?? "",
    co2Ppm: reading.co2Ppm ?? null,
    nh3Ppm: reading.nh3Ppm ?? null,
    coPpm: reading.coPpm ?? null,
    no2Ppm: reading.no2Ppm ?? null,
    temperatureC: reading.temperatureC ?? null,
    humidityPct: reading.humidityPct ?? null,
    recordedAt: timestampToString(reading.recordedAt) ?? "",
  };
}

export function toMapSensor7In1Reading(
  reading: Sensor7In1Reading | null | undefined,
): MapSensor7In1Reading | null {
  if (!reading) {
    return null;
  }

  return {
    readingId: reading.readingId ?? "",
    nitrogenPpm: reading.nitrogenPpm ?? null,
    phosphorusPpm: reading.phosphorusPpm ?? null,
    potassiumPpm: reading.potassiumPpm ?? null,
    ph: reading.ph ?? null,
    ecDsM: reading.ecDsM ?? null,
    humidityPct: reading.humidityPct ?? null,
    temperatureC: reading.temperatureC ?? null,
    recordedAt: timestampToString(reading.recordedAt) ?? "",
  };
}

function toMapInspectionPoint(
  point: InspectionPoint,
  sensorReadings: SensorReading[],
  sensor7In1Readings: Sensor7In1Reading[] = [],
): MapInspectionPoint {
  const mappedSensorReadings = sensorReadings
    .map(toMapSensorReading)
    .filter((reading): reading is MapSensorReading => Boolean(reading));
  const mappedSensor7In1Readings = sensor7In1Readings
    .map(toMapSensor7In1Reading)
    .filter(
      (reading): reading is MapSensor7In1Reading => Boolean(reading),
    );

  return {
    pointCode: point.pointCode,
    clusterId: point.clusterId,
    clusterLabel: point.clusterLabel,
    inspectionLat: point.inspectionLat,
    inspectionLng: point.inspectionLng,
    representativeGridCodes: point.representativeGridCodes,
    latestSensor: mappedSensorReadings[0] ?? null,
    sensorReadings: mappedSensorReadings,
    latestSensor7In1: mappedSensor7In1Readings[0] ?? null,
    sensor7In1Readings: mappedSensor7In1Readings,
  };
}

async function fetchFirebaseLahanMapData(
  lahanId: string,
): Promise<LahanMapData> {
  const [lahan, capture] = await Promise.all([
    getLahan(lahanId),
    getLatestCapture(lahanId),
  ]);

  if (!lahan) {
    throw new Error(`Data lahan ${lahanId} tidak ditemukan di Firestore.`);
  }

  if (!capture) {
    throw new Error(
      `Capture terbaru untuk ${lahanId} tidak ditemukan di Firestore.`,
    );
  }

  const [grids, inspectionPoints, hama] = await Promise.all([
    getGrids(lahanId, capture.captureId, capture.gridsJsonUrl),
    getInspectionPoints(lahanId, capture.captureId),
    getHamaDetections(lahanId, capture.captureId),
  ]);

  const corners = getCaptureCorners(lahan, capture);
  const bounds = boundsFromCorners(corners);
  const fieldCode = lahan.fieldCode || lahanId;
  const inspectionSensorEntries = await Promise.all(
    inspectionPoints.map(async (point) => {
      const readings = await getSensorReadings(
        lahanId,
        capture.captureId,
        point.pointCode,
        10,
      );
      return [point.pointCode, readings] as const;
    }),
  );
  const inspectionSensor7In1Entries = await Promise.all(
    inspectionPoints.map(async (point) => {
      const readings = await getSensor7In1Readings(
        lahanId,
        capture.captureId,
        point.pointCode,
        10,
      );
      return [point.pointCode, readings] as const;
    }),
  );
  const sensorByPoint = new Map(inspectionSensorEntries);
  const sensor7In1ByPoint = new Map(inspectionSensor7In1Entries);
  const sensorReadingsByGrid = new Map<string, SensorReading[]>();
  const sensorReadingsBySpatialCluster = new Map<string, SensorReading[]>();
  const sensor7In1ReadingsByGrid = new Map<string, Sensor7In1Reading[]>();
  const sensor7In1ReadingsBySpatialCluster = new Map<
    string,
    Sensor7In1Reading[]
  >();

  inspectionPoints.forEach((point) => {
    const readings = sensorByPoint.get(point.pointCode) ?? [];
    const sensor7In1Readings = sensor7In1ByPoint.get(point.pointCode) ?? [];
    if (point.clusterId !== null && point.clusterId !== undefined) {
      sensorReadingsBySpatialCluster.set(String(point.clusterId), readings);
      sensor7In1ReadingsBySpatialCluster.set(
        String(point.clusterId),
        sensor7In1Readings,
      );
    }

    point.representativeGridCodes.forEach((gridCode) => {
      sensorReadingsByGrid.set(gridCode, readings);
      sensor7In1ReadingsByGrid.set(gridCode, sensor7In1Readings);
    });
  });

  const [rgb, ndvi, cluster, hamaRows] = await Promise.all([
    toImageLayer("rgb", capture.rgbUrl, corners, capture.capturedAt),
    toImageLayer("ndvi", capture.ndviUrl, corners, capture.capturedAt),
    toImageLayer("cluster", capture.clusterUrl, corners, capture.capturedAt),
    Promise.all(hama.map(toMapHama)),
  ]);

  return {
    lahan: {
      id: fieldCode,
      fieldCode,
      name: fieldCode,
      captureId: capture.captureId,
      bounds,
      center:
        typeof capture.centerLat === "number" &&
        typeof capture.centerLng === "number"
          ? { lat: capture.centerLat, lng: capture.centerLng }
          : centerFromBounds(bounds),
      capturedAt: timestampToString(capture.capturedAt),
    },
    layers: {
      rgb,
      ndvi,
      cluster,
    },
    grids: grids.map((grid) =>
      toMapGrid(
        grid,
        sensorReadingsByGrid.get(grid.gridCode) ??
          (grid.spatialClusterId !== null && grid.spatialClusterId !== undefined
            ? sensorReadingsBySpatialCluster.get(String(grid.spatialClusterId))
            : undefined),
        sensor7In1ReadingsByGrid.get(grid.gridCode) ??
          (grid.spatialClusterId !== null && grid.spatialClusterId !== undefined
            ? sensor7In1ReadingsBySpatialCluster.get(
                String(grid.spatialClusterId),
              )
            : undefined),
      ),
    ),
    inspectionPoints: inspectionPoints.map((point) =>
      toMapInspectionPoint(
        point,
        sensorByPoint.get(point.pointCode) ?? [],
        sensor7In1ByPoint.get(point.pointCode) ?? [],
      ),
    ),
    hama: hamaRows,
  };
}

function fetchMockLahanMapData(lahanId: string) {
  return Promise.resolve({
    ...mockMapData,
    lahan: {
      ...mockMapData.lahan,
      id: lahanId,
      fieldCode: lahanId,
    },
  });
}

export function fetchLahanMapData(lahanId: string) {
  if (!getServerUrl()) {
    if (canUseFirebaseLahanService()) {
      return fetchFirebaseLahanMapData(lahanId);
    }

    return fetchMockLahanMapData(lahanId);
  }

  return fetchApi<LahanMapData>(
    `/lahan/${encodeURIComponent(lahanId)}/map-data`,
  );
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return Number(value.toFixed(digits)).toString();
}

function formatCluster(clusterLabel?: string | null) {
  if (!clusterLabel) {
    return "";
  }

  const rawLabel = clusterLabel.trim();
  const label = rawLabel.toLowerCase();
  const title = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  if (
    label === "non-tanaman" ||
    label === "non tanaman" ||
    label === "non-plant"
  ) {
    return "Non-Tanaman";
  }
  if (label.includes("kritis")) return "Kritis";
  if (label.includes("stres") || label.includes("stress")) return "Stres";
  if (label.includes("sedang")) return "Sedang";
  if (label.includes("cukup")) return "Cukup";
  if (label.includes("sehat")) return "Sehat";
  if (label === "hijau") return `Cluster ${title} (Tinggi)`;
  if (label === "green") return "Cluster Hijau (Tinggi)";
  if (label === "kuning") return `Cluster ${title} (Sedang)`;
  if (label === "yellow") return "Cluster Kuning (Sedang)";
  if (label === "merah") return `Cluster ${title} (Rendah)`;
  if (label === "red") return "Cluster Merah (Rendah)";

  return title;
}

export function toNdviTableRow(grid: MapGrid): PhaseTableRow {
  return {
    grid: grid.gridCode,
    coordinates: [grid.center.lat, grid.center.lng],
    raw: grid,
    ndvi: formatNumber(grid.ndvi?.mean, 3),
    mean: formatNumber(grid.ndvi?.mean, 3),
    min: formatNumber(grid.ndvi?.min, 3),
    max: formatNumber(grid.ndvi?.max, 3),
    stddev: formatNumber(grid.ndvi?.stddev, 3),
    median: formatNumber(grid.ndvi?.median, 3),
    variance: formatNumber(grid.ndvi?.variance, 5),
    p25: formatNumber(grid.ndvi?.p25, 3),
    p50: formatNumber(grid.ndvi?.p50, 3),
    p75: formatNumber(grid.ndvi?.p75, 3),
    cluster: formatCluster(grid.ndvi?.clusterLabel),
    co2: formatNumber(grid.sensor?.co2Ppm, 1),
    nh3: formatNumber(grid.sensor?.nh3Ppm, 3),
    co: formatNumber(grid.sensor?.coPpm, 3),
    no2: formatNumber(grid.sensor?.no2Ppm, 3),
    temp: formatNumber(grid.sensor?.temperatureC, 1),
    humidity:
      grid.sensor?.humidityPct === null ||
      grid.sensor?.humidityPct === undefined
        ? ""
        : `${formatNumber(grid.sensor.humidityPct, 1)}%`,
    recordedAt: grid.sensor?.recordedAt ?? "",
  };
}

export function toHamaTableRow(hama: MapHama): PhaseTableRow {
  return {
    grid: hama.gridCode,
    coordinates: [hama.latitude, hama.longitude],
    raw: hama,
    area: hama.areaName ?? "",
    status: hama.status,
    jenis: hama.jenisHama ?? "",
    tingkat: hama.tingkatSerangan ?? "",
    rekomendasi: hama.rekomendasi ?? "",
    imageUrl: hama.imageUrl ?? "",
  };
}

export function toInspectionTableRow(point: MapInspectionPoint): PhaseTableRow {
  return {
    grid: point.pointCode,
    coordinates: [point.inspectionLat, point.inspectionLng],
    raw: point,
    cluster: formatCluster(point.clusterLabel),
    representedGrids: point.representativeGridCodes.join(", "),
    representedCount: point.representativeGridCodes.length.toString(),
    sensorStatus: point.latestSensor ? "Sudah ada" : "Belum ada",
    recordedAt: point.latestSensor?.recordedAt ?? "",
    co2: formatNumber(point.latestSensor?.co2Ppm, 1),
    nh3: formatNumber(point.latestSensor?.nh3Ppm, 3),
    co: formatNumber(point.latestSensor?.coPpm, 3),
    no2: formatNumber(point.latestSensor?.no2Ppm, 3),
    temp: formatNumber(point.latestSensor?.temperatureC, 1),
    humidity:
      point.latestSensor?.humidityPct === null ||
      point.latestSensor?.humidityPct === undefined
        ? ""
        : `${formatNumber(point.latestSensor.humidityPct, 1)}%`,
  };
}

export function getGridRectangleStyle(gridColor?: string | null) {
  const normalizedColor = (gridColor ?? "").toLowerCase();

  if (normalizedColor.includes("red") || normalizedColor.includes("merah")) {
    return { color: "#dc2626", fillColor: "#ef4444" };
  }

  if (
    normalizedColor.includes("yellow") ||
    normalizedColor.includes("kuning")
  ) {
    return { color: "#eab308", fillColor: "#fde047" };
  }

  if (normalizedColor.includes("green") || normalizedColor.includes("hijau")) {
    return { color: "#059669", fillColor: "#34d399" };
  }

  return { color: "#64748b", fillColor: "#94a3b8" };
}
