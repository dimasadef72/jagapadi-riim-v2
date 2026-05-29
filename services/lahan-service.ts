import {
  collection,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseDb, hasFirebaseConfig } from "@/lib/firebase";
import type {
  HamaDetection,
  InspectionPoint,
  Lahan,
  LahanCapture,
  LahanGrid,
  SensorReading,
} from "@/types/lahan";

function readData<T>(snapshot: { data: () => unknown }): T {
  return snapshot.data() as T;
}

function readSensorReading(snapshot: {
  id: string;
  data: () => unknown;
}): SensorReading {
  return {
    ...readData<SensorReading>(snapshot),
    readingId: snapshot.id,
  };
}

async function resolveStorageDownloadUrl(url: string) {
  if (!url.startsWith("gs://")) {
    return url;
  }

  const path = url.slice("gs://".length);
  const slashIndex = path.indexOf("/");

  if (slashIndex <= 0) {
    throw new Error(`URL Storage tidak valid: ${url}`);
  }

  const bucket = path.slice(0, slashIndex);
  const objectPath = path
    .slice(slashIndex + 1)
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `https://storage.googleapis.com/${bucket}/${objectPath}`;
}

function normalizeGrid(item: LahanGrid): LahanGrid {
  return {
    ...item,
    clusterLabel: item.clusterLabel || "-",
  };
}

async function getGridsFromJson(gridsJsonUrl: string) {
  const downloadUrl = await resolveStorageDownloadUrl(gridsJsonUrl);
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Gagal mengambil grid JSON (${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  const grids = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        "grids" in payload &&
        Array.isArray(payload.grids)
      ? payload.grids
      : [];

  return grids
    .map((item) => normalizeGrid(item as LahanGrid))
    .sort((a, b) => a.rowIndex - b.rowIndex || a.colIndex - b.colIndex);
}

export function canUseFirebaseLahanService() {
  return hasFirebaseConfig();
}

export async function getLahanList() {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, "lahan"));

  return snapshot.docs.map((item) => {
    const data = readData<Lahan>(item);
    const fieldCode = data.fieldCode || item.id;

    return {
      id: fieldCode,
      fieldCode,
      name: fieldCode,
    };
  });
}

export async function getLahan(fieldCode: string) {
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, "lahan", fieldCode));

  return snapshot.exists() ? readData<Lahan>(snapshot) : null;
}

export async function getLatestCapture(fieldCode: string) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    query(
      collection(db, "lahan", fieldCode, "captures"),
      orderBy("capturedAt", "desc"),
      limit(1),
    ),
  );

  const capture = snapshot.docs[0];

  if (!capture) {
    return null;
  }

  return {
    ...readData<LahanCapture>(capture),
    captureId: readData<LahanCapture>(capture).captureId || capture.id,
  };
}

export async function getGrids(
  _fieldCode: string,
  captureId: string,
  gridsJsonUrl?: string | null,
) {
  if (!gridsJsonUrl) {
    throw new Error(`Capture ${captureId} belum memiliki gridsJsonUrl.`);
  }

  return getGridsFromJson(gridsJsonUrl);
}

export async function getInspectionPoints(
  fieldCode: string,
  captureId: string,
) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    collection(
      db,
      "lahan",
      fieldCode,
      "captures",
      captureId,
      "inspection_points",
    ),
  );

  return snapshot.docs.map((item) => ({
    ...readData<InspectionPoint>(item),
    pointCode: readData<InspectionPoint>(item).pointCode || item.id,
  }));
}

export async function getSensorReadings(
  fieldCode: string,
  captureId: string,
  pointCode: string,
  maxResults = 1,
) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    query(
      collection(
        db,
        "lahan",
        fieldCode,
        "captures",
        captureId,
        "inspection_points",
        pointCode,
        "sensor_readings",
      ),
      orderBy("recordedAt", "desc"),
      limit(maxResults),
    ),
  );

  return snapshot.docs.map(readSensorReading);
}

export function subscribeSensorReadings(
  fieldCode: string,
  captureId: string,
  pointCode: string,
  onReadings: (readings: SensorReading[]) => void,
  onError?: (error: Error) => void,
  maxResults = 10,
): Unsubscribe {
  const db = getFirebaseDb();

  return onSnapshot(
    query(
      collection(
        db,
        "lahan",
        fieldCode,
        "captures",
        captureId,
        "inspection_points",
        pointCode,
        "sensor_readings",
      ),
      orderBy("recordedAt", "desc"),
      limit(maxResults),
    ),
    (snapshot) => {
      onReadings(snapshot.docs.map(readSensorReading));
    },
    onError,
  );
}

export type SensorReadingInput = {
  pointCode: string;
  co2Ppm?: number | null;
  nh3Ppm?: number | null;
  coPpm?: number | null;
  no2Ppm?: number | null;
  temperatureC?: number | null;
  humidityPct?: number | null;
};

export async function addSensorReading(
  fieldCode: string,
  captureId: string,
  input: SensorReadingInput,
) {
  const db = getFirebaseDb();
  const recordedAtMillis = Date.now();
  const readingId = recordedAtMillis.toString();

  await setDoc(
    doc(
      db,
      "lahan",
      fieldCode,
      "captures",
      captureId,
      "inspection_points",
      input.pointCode,
      "sensor_readings",
      readingId,
    ),
    {
      ...input,
      recordedAt: Timestamp.fromMillis(recordedAtMillis),
    },
  );

  return readingId;
}

export async function updateSensorReading(
  fieldCode: string,
  captureId: string,
  pointCode: string,
  readingId: string,
  input: Omit<SensorReadingInput, "pointCode">,
) {
  const db = getFirebaseDb();

  await updateDoc(
    doc(
      db,
      "lahan",
      fieldCode,
      "captures",
      captureId,
      "inspection_points",
      pointCode,
      "sensor_readings",
      readingId,
    ),
    {
      ...input,
      pointCode,
      updatedAt: Timestamp.fromMillis(Date.now()),
    },
  );
}

export async function deleteSensorReading(
  fieldCode: string,
  captureId: string,
  pointCode: string,
  readingId: string,
) {
  const db = getFirebaseDb();

  await deleteDoc(
    doc(
      db,
      "lahan",
      fieldCode,
      "captures",
      captureId,
      "inspection_points",
      pointCode,
      "sensor_readings",
      readingId,
    ),
  );
}

export async function getHamaDetections(fieldCode: string, captureId: string) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    collection(
      db,
      "lahan",
      fieldCode,
      "captures",
      captureId,
      "hama_detections",
    ),
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...readData<HamaDetection>(item),
  }));
}

export async function getLatestSensorReadingsByGrid(
  fieldCode: string,
  captureId: string,
) {
  const inspectionPoints = await getInspectionPoints(fieldCode, captureId);
  const sensorEntries = await Promise.all(
    inspectionPoints.map(async (point) => {
      const readings = await getSensorReadings(
        fieldCode,
        captureId,
        point.pointCode,
      );
      const latestReading = readings[0] ?? null;

      return point.representativeGridCodes.map(
        (gridCode) => [gridCode, latestReading] as const,
      );
    }),
  );

  return new Map(sensorEntries.flat());
}
