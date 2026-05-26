import {
  collection,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  doc,
} from "firebase/firestore";

import { getFirebaseDb, hasFirebaseConfig } from "@/lib/firebase";
import type {
  HamaDetection,
  InspectionPoint,
  Lahan,
  LahanGrid,
  SensorReading,
} from "@/types/lahan";

function readData<T>(snapshot: { data: () => unknown }): T {
  return snapshot.data() as T;
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

export async function getGrids(fieldCode: string) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, "lahan", fieldCode, "grids"));

  return snapshot.docs.map((item) => ({
    ...readData<LahanGrid>(item),
    gridCode: readData<LahanGrid>(item).gridCode || item.id,
  })).sort((a, b) => a.rowIndex - b.rowIndex || a.colIndex - b.colIndex);
}

export async function getInspectionPoints(fieldCode: string) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, "lahan", fieldCode, "inspection_points"));

  return snapshot.docs.map((item) => ({
    ...readData<InspectionPoint>(item),
    pointCode: readData<InspectionPoint>(item).pointCode || item.id,
  }));
}

export async function getSensorReadings(fieldCode: string, pointCode: string) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    query(
      collection(db, "lahan", fieldCode, "inspection_points", pointCode, "sensor_readings"),
      orderBy("recordedAt", "desc"),
      limit(1),
    ),
  );

  return snapshot.docs.map((item) => readData<SensorReading>(item));
}

export async function getHamaDetections(fieldCode: string) {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, "lahan", fieldCode, "hama_detections"));

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...readData<HamaDetection>(item),
  }));
}

export async function getLatestSensorReadingsByGrid(fieldCode: string) {
  const inspectionPoints = await getInspectionPoints(fieldCode);
  const sensorEntries = await Promise.all(
    inspectionPoints.map(async (point) => {
      const readings = await getSensorReadings(fieldCode, point.pointCode);
      const latestReading = readings[0] ?? null;

      return point.representativeGridCodes.map((gridCode) => [gridCode, latestReading] as const);
    }),
  );

  return new Map(sensorEntries.flat());
}
