import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { getFirebaseDb, hasFirebaseConfig } from "@/lib/firebase";
import type {
  OptActiveItem,
  OptReportRow,
  OptWeather,
  OptYearMetadata,
} from "@/types/opt-report";

type OptHistoryPayload = {
  tahun?: number;
  bulan?: Record<string, unknown>;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function readActiveOpt(value: unknown): OptActiveItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const payload = item as Partial<OptActiveItem>;
      return {
        nama: toText(payload.nama),
        luas: toNumber(payload.luas),
      };
    })
    .filter((item) => item.nama);
}

function readWeather(value: unknown): OptWeather {
  const payload = value as Partial<OptWeather>;

  return {
    temp: toNumber(payload.temp),
    humidity: toNumber(payload.humidity),
    precip: toNumber(payload.precip),
    windspeed: toNumber(payload.windspeed),
    vpd: toNumber(payload.vpd),
    lwd: toNumber(payload.lwd),
  };
}

function readNewRow(row: unknown, tahun: number): OptReportRow | null {
  if (!row || typeof row !== "object") return null;

  const payload = row as Record<string, unknown>;
  const luas = (payload.luas ?? {}) as Record<string, unknown>;
  const pengendalian = (payload.pengendalian ?? {}) as Record<string, unknown>;
  const cuaca = readWeather(payload.cuaca);
  const aktifOpt = readActiveOpt(payload.aktifOpt);
  const lksj = toNumber(luas.lksj);
  const ssr = toNumber(luas.ssr);
  const sss = toNumber(luas.sss);
  const ssb = toNumber(luas.ssb);
  const ssp = toNumber(luas.ssp);

  return {
    id: toText(payload.id),
    sourceRowNumber: 0,
    tahun,
    bulan: toNumber(payload.bulan),
    periode: toText(payload.periode),
    mt: "",
    kabupaten: toText(payload.kabupaten),
    kecamatan: toText(payload.kecamatan),
    desa: toText(payload.desa),
    latitude: toNumber(payload.latitude),
    longitude: toNumber(payload.longitude),
    komoditas: toText(payload.komoditas),
    lt: toNumber(luas.lt),
    opt: aktifOpt.map((item) => item.nama).join(", "),
    ssr,
    sss,
    ssb,
    ssp,
    ssj: toNumber(luas.ssj),
    terkendali: toNumber(luas.terkendali),
    panen: 0,
    intensitas: 0,
    ltsr: 0,
    ltss: 0,
    ltsb: 0,
    ltsp: 0,
    ltsj: 0,
    kimia: toNumber(pengendalian.kimia),
    hayati: toNumber(pengendalian.hayati),
    eradikasi: toNumber(pengendalian.eradikasi),
    cl: toNumber(pengendalian.cl),
    jumlahPengendali: toNumber(pengendalian.jumlah),
    lksr: ssr,
    lkss: sss,
    lksb: ssb,
    lksp: ssp,
    lksj,
    waspada: 0,
    tingkatKeparahan: toText(payload.tingkatKeparahan),
    aktifOpt,
    cuaca,
    temp: cuaca.temp,
    humidity: cuaca.humidity,
    precip: cuaca.precip,
    windspeed: cuaca.windspeed,
    vpd: cuaca.vpd,
    lwd: cuaca.lwd,
  };
}

function validateRows(value: unknown): OptReportRow[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const payload = value as OptHistoryPayload;
    const tahun = toNumber(payload.tahun);
    const months = Object.values(payload.bulan ?? {});

    return months
      .flatMap((rows) => (Array.isArray(rows) ? rows : []))
      .map((row) => readNewRow(row, tahun))
      .filter((row): row is OptReportRow => Boolean(row?.id));
  }

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
    schemaVersion: Number(payload.schemaVersion ?? 1),
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
