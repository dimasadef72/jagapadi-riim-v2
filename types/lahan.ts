export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type ClusterLabel = string;

export type Lahan = {
  fieldCode: string;
  topLeft: LatLngPoint;
  topRight: LatLngPoint;
  bottomRight: LatLngPoint;
  bottomLeft: LatLngPoint;
  createdAt: unknown;
  updatedAt?: unknown;
};

export type LahanCapture = {
  captureId: string;
  fieldCode: string;
  gsd?: number | null;
  gsdUnit?: string | null;
  imageBounds?: {
    topLeft: LatLngPoint;
    topRight: LatLngPoint;
    bottomRight: LatLngPoint;
    bottomLeft: LatLngPoint;
  } | null;
  centerLat?: number | null;
  centerLng?: number | null;
  rgbUrl: string | null;
  ndviUrl: string | null;
  clusterUrl: string | null;
  gridsJsonUrl?: string | null;
  capturedAt: unknown;
  createdAt: unknown;
  updatedAt?: unknown;
};

export type LahanGrid = {
  gridCode: string;
  rowIndex: number;
  colIndex: number;
  topLeft: LatLngPoint;
  topRight: LatLngPoint;
  bottomRight: LatLngPoint;
  bottomLeft: LatLngPoint;
  clusterId: string | number | null;
  clusterLabel: ClusterLabel;
  gridColor?: "Red" | "Yellow" | "Green" | string | null;
  isPlant?: boolean | null;
  spatialClusterId?: string | number | null;
  ndviMean: number | null;
  ndviMin?: number | null;
  ndviMax?: number | null;
  ndviStddev?: number | null;
  ndviMedian?: number | null;
  ndviVariance?: number | null;
  ndviP25?: number | null;
  ndviP50?: number | null;
  ndviP75?: number | null;
  createdAt?: unknown;
};

export type InspectionPoint = {
  pointCode: string;
  clusterId: string | number | null;
  clusterLabel: ClusterLabel;
  inspectionLat: number;
  inspectionLng: number;
  representativeGridCodes: string[];
  createdAt: unknown;
};

export type SensorReading = {
  readingId?: string;
  pointCode?: string;
  latitude?: number | null;
  longitude?: number | null;
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
