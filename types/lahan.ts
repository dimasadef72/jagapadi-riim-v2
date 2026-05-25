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
  capturedAt: unknown;
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
  createdAt?: unknown;
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
