import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { getFirebaseDb, hasFirebaseConfig } from "@/lib/firebase";
import type { OptReportRow, OptYearMetadata } from "@/types/opt-report";

function validateRows(value: unknown): OptReportRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((row): row is OptReportRow => {
    if (!row || typeof row !== "object") return false;
    const item = row as Partial<OptReportRow>;
    return (
      typeof item.id === "string" &&
      typeof item.tahun === "number" &&
      typeof item.latitude === "number" &&
      typeof item.longitude === "number"
    );
  });
}

function readYearMetadata(id: string, data: unknown): OptYearMetadata {
  const payload = data as Partial<OptYearMetadata>;
  const tahun = Number(payload.tahun ?? id);
  const fileName = payload.fileName ?? `${tahun}.json`;
  const bucket = payload.bucket ?? "riim-opt";
  const storagePath = payload.storagePath ?? `opt/years/${fileName}`;

  return {
    tahun,
    rowCount: Number(payload.rowCount ?? 0),
    bucket,
    storagePath,
    fileName,
    publicUrl:
      payload.publicUrl ??
      `https://storage.googleapis.com/${bucket}/${storagePath}`,
    fileSizeBytes: Number(payload.fileSizeBytes ?? 0),
    sourceFile: payload.sourceFile,
    updatedAt:
      typeof payload.updatedAt === "string" ? payload.updatedAt : "",
  };
}

export async function fetchOptYears() {
  if (!hasFirebaseConfig()) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(getFirebaseDb(), "opt_years"), orderBy("tahun", "desc")),
  );

  return snapshot.docs.map((item) => readYearMetadata(item.id, item.data()));
}

export async function fetchOptRowsFromMetadata(metadata: OptYearMetadata) {
  const response = await fetch(metadata.publicUrl);

  if (!response.ok) {
    throw new Error(
      `Gagal mengambil data OPT ${metadata.tahun}: ${response.status}`,
    );
  }

  return validateRows(await response.json());
}
