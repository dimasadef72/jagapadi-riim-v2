"use client";

import {
  canUseFirebaseLahanService,
  getGrids,
  getHamaDetections,
  getLahan,
  getLahanList,
  getLatestSensorReadingsByGrid,
} from "@/services/lahan-service";
import type { HamaDetection, Lahan, LahanGrid, SensorReading } from "@/types/lahan";

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
    clusterLabel: "hijau" | "kuning" | "merah";
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

export type LahanMapData = {
  lahan: LahanOption & {
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
  hama: MapHama[];
};

export type PhaseTableRow = {
  grid: string;
  coordinates: [number, number];
  raw: MapGrid | MapHama;
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
  clusterLabel: "hijau" | "kuning" | "merah",
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
      nh3Ppm: clusterLabel === "merah" ? 5.1 : clusterLabel === "kuning" ? 2.8 : 1.1,
      coPpm: clusterLabel === "merah" ? 1.2 : 0.4,
      no2Ppm: clusterLabel === "merah" ? 0.09 : 0.03,
      temperatureC: clusterLabel === "merah" ? 33 : clusterLabel === "kuning" ? 30 : 28,
      humidityPct: clusterLabel === "merah" ? 32 : clusterLabel === "kuning" ? 48 : 66,
      recordedAt: "2026-05-26T08:00:00.000Z",
    },
  };
}

const mockMapData: LahanMapData = {
  lahan: {
    ...mockLahan[0],
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
  grids: [
    createMockGrid("G-A1", 0, 0, { lat: -7.2494, lng: 112.7686 }, "hijau", 0.8),
    createMockGrid("G-A2", 0, 1, { lat: -7.2494, lng: 112.7695 }, "kuning", 0.42),
    createMockGrid("G-B1", 1, 0, { lat: -7.2503, lng: 112.7686 }, "merah", 0.18),
    createMockGrid("G-B2", 1, 1, { lat: -7.2503, lng: 112.7695 }, "hijau", 0.75),
    createMockGrid("G-C1", 2, 0, { lat: -7.2512, lng: 112.7686 }, "kuning", 0.48),
    createMockGrid("G-C2", 2, 1, { lat: -7.2512, lng: 112.7695 }, "hijau", 0.66),
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
      rekomendasi: "Pantau ulang dan lakukan penyemprotan organik dosis rendah.",
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

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
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

function normalizeImageUrl(url: string | null | undefined) {
  if (!url || url.startsWith("gs://")) {
    return null;
  }

  return url;
}

function toLayerCorners(data: Pick<Lahan | LahanGrid, "topLeft" | "topRight" | "bottomRight" | "bottomLeft">): LayerCorners {
  return {
    topLeft: data.topLeft,
    topRight: data.topRight,
    bottomRight: data.bottomRight,
    bottomLeft: data.bottomLeft,
  };
}

function toImageLayer(
  type: MapImageLayer["type"],
  url: string | null | undefined,
  lahan: Lahan,
): MapImageLayer | null {
  const normalizedUrl = normalizeImageUrl(url);

  if (!normalizedUrl) {
    return null;
  }

  const corners = toLayerCorners(lahan);

  return {
    type,
    url: normalizedUrl,
    bounds: boundsFromCorners(corners),
    corners,
    capturedAt: timestampToString(lahan.capturedAt),
  };
}

function toMapGrid(
  grid: LahanGrid,
  latestSensor: SensorReading | null | undefined,
): MapGrid {
  const corners = toLayerCorners(grid);
  const bounds = boundsFromCorners(corners);

  return {
    gridId: grid.gridCode,
    gridCode: grid.gridCode,
    rowIndex: grid.rowIndex,
    colIndex: grid.colIndex,
    bounds,
    corners,
    center: centerFromBounds(bounds),
    inspection: latestSensor
      ? {
          lat: latestSensor.latitude,
          lng: latestSensor.longitude,
        }
      : null,
    ndvi: {
      clusterLabel: grid.clusterLabel,
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
  };
}

function toMapHama(item: HamaDetection & { id: string }): MapHama {
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
    imageUrl: normalizeImageUrl(item.imageUrl) ?? null,
    detectedAt: timestampToString(item.detectedAt) ?? "",
  };
}

async function fetchFirebaseLahanMapData(lahanId: string): Promise<LahanMapData> {
  const [lahan, grids, sensorByGrid, hama] = await Promise.all([
    getLahan(lahanId),
    getGrids(lahanId),
    getLatestSensorReadingsByGrid(lahanId),
    getHamaDetections(lahanId),
  ]);

  if (!lahan) {
    throw new Error(`Data lahan ${lahanId} tidak ditemukan di Firestore.`);
  }

  const corners = toLayerCorners(lahan);
  const bounds = boundsFromCorners(corners);
  const fieldCode = lahan.fieldCode || lahanId;

  return {
    lahan: {
      id: fieldCode,
      fieldCode,
      name: fieldCode,
      bounds,
      center: centerFromBounds(bounds),
      capturedAt: timestampToString(lahan.capturedAt),
    },
    layers: {
      rgb: toImageLayer("rgb", lahan.rgbUrl, lahan),
      ndvi: toImageLayer("ndvi", lahan.ndviUrl, lahan),
      cluster: toImageLayer("cluster", lahan.clusterUrl, lahan),
    },
    grids: grids.map((grid) => toMapGrid(grid, sensorByGrid.get(grid.gridCode))),
    hama: hama.map(toMapHama),
  };
}

function fetchMockLahanMapData(lahanId: string) {
  return Promise.resolve({
    ...mockMapData,
    lahan: {
      ...mockMapData.lahan,
      fieldCode: lahanId,
    },
  });
}

export function fetchLahanMapData(lahanId: string) {
  if (!getServerUrl()) {
    if (canUseFirebaseLahanService()) {
      return fetchFirebaseLahanMapData(lahanId).catch(() => fetchMockLahanMapData(lahanId));
    }

    return fetchMockLahanMapData(lahanId);
  }

  return fetchApi<LahanMapData>(`/lahan/${encodeURIComponent(lahanId)}/map-data`);
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

  const label = clusterLabel.toLowerCase();
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  if (label === "hijau") return `Cluster ${title} (Tinggi)`;
  if (label === "kuning") return `Cluster ${title} (Sedang)`;
  if (label === "merah") return `Cluster ${title} (Rendah)`;

  return `Cluster ${title}`;
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
      grid.sensor?.humidityPct === null || grid.sensor?.humidityPct === undefined
        ? ""
        : `${formatNumber(grid.sensor.humidityPct, 1)}%`,
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

export function getGridRectangleStyle(clusterLabel?: string | null) {
  if (clusterLabel === "merah") {
    return { color: "#e11d48", fillColor: "#fb7185" };
  }

  if (clusterLabel === "kuning") {
    return { color: "#d97706", fillColor: "#fbbf24" };
  }

  return { color: "#059669", fillColor: "#34d399" };
}
