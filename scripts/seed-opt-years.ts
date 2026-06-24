import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { Storage } from "@google-cloud/storage";
import { initializeApp } from "firebase/app";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

import type { OptReportRow, OptYearMetadata } from "../types/opt-report";

const EXCEL_PATH = "datasebaranhama/Data OPT Padi Kab. Jember th 2021-2026.xlsx";
const OUTPUT_DIR = ".generated/opt/years";
const GCS_BUCKET = "riim-opt";
const GCS_PREFIX = "opt/years";
const PUBLIC_BASE_URL = `https://storage.googleapis.com/${GCS_BUCKET}/${GCS_PREFIX}`;
const storage = new Storage();
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirestoreDb() {
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

  return getFirestore(initializeApp(firebaseConfig));
}

function normalizeKey(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue = Number(String(value).replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function makeRowId(year: number, sourceRowNumber: number) {
  return `OPT-${year}-${String(sourceRowNumber).padStart(5, "0")}`;
}

function readWorkbookRows() {
  const workbook = XLSX.read(readFileSync(EXCEL_PATH), {
    cellDates: false,
    type: "buffer",
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const headers = rows[0].map(normalizeKey);

  return rows.slice(1).map((row, rowIndex) => {
    const sourceRowNumber = rowIndex + 2;
    const values = Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? ""]),
    );
    const tahun = toNumber(values.Tahun);

    return {
      id: makeRowId(tahun, sourceRowNumber),
      sourceRowNumber,
      tahun,
      bulan: toNumber(values.Bulan),
      periode: toNumber(values.periode),
      mt: toText(values.MT),
      kabupaten: toText(values.Kabupaten),
      kecamatan: toText(values.Kecamatan),
      desa: toText(values.Desa),
      komoditas: toText(values.Komoditas),
      lt: toNumber(values.LT),
      opt: toText(values.OPT),
      ssr: toNumber(values.SSR),
      sss: toNumber(values.SSS),
      ssb: toNumber(values.SSB),
      ssp: toNumber(values.SSP),
      ssj: toNumber(values.SSJ),
      terkendali: toNumber(values.Terkendali),
      panen: toNumber(values.PANEN),
      intensitas: toNumber(values["%"]),
      ltsr: toNumber(values.LTSR),
      ltss: toNumber(values.LTSS),
      ltsb: toNumber(values.LTSB),
      ltsp: toNumber(values.LTSP),
      ltsj: toNumber(values.LTSJ),
      kimia: toNumber(values.Kimia),
      hayati: toNumber(values.Hayati),
      eradikasi: toNumber(values.Eradikasi),
      cl: toNumber(values.CL),
      jumlahPengendali: toNumber(values["Jumlah pengendali"]),
      lksr: toNumber(values.LKSR),
      lkss: toNumber(values.LKSS),
      lksb: toNumber(values.LKSB),
      lksp: toNumber(values.LKSP),
      lksj: toNumber(values.LKSJ),
      waspada: toNumber(values.Waspada),
      latitude: toNumber(values.Latitude),
      longitude: toNumber(values.Longitude),
    } satisfies OptReportRow;
  });
}

async function uploadToGcs(localPath: string, objectName: string) {
  const destination = `${GCS_PREFIX}/${objectName}`;

  await storage.bucket(GCS_BUCKET).upload(localPath, {
    destination,
    contentType: "application/json; charset=utf-8",
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=300",
    },
  });

  console.log(`Uploaded ${localPath} -> gs://${GCS_BUCKET}/${destination}`);
}

async function build() {
  const shouldUpload = process.argv.includes("--upload");
  if (shouldUpload && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS belum diset. Isi dengan path service account JSON untuk upload ke GCS.",
    );
  }

  const rows = readWorkbookRows().filter((row) => row.tahun > 0);
  const rowsByYear = new Map<number, OptReportRow[]>();
  const updatedAt = new Date().toISOString();
  const db = shouldUpload ? getFirestoreDb() : null;

  rows.forEach((row) => {
    rowsByYear.set(row.tahun, [...(rowsByYear.get(row.tahun) ?? []), row]);
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const index: OptYearMetadata[] = [];

  for (const [year, yearRows] of [...rowsByYear.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    const fileName = `${year}.json`;
    const localPath = join(OUTPUT_DIR, fileName);
    const json = JSON.stringify(yearRows, null, 2);

    writeFileSync(localPath, json);

    index.push({
      tahun: year,
      rowCount: yearRows.length,
      bucket: GCS_BUCKET,
      storagePath: `${GCS_PREFIX}/${fileName}`,
      fileName,
      publicUrl: `${PUBLIC_BASE_URL}/${fileName}`,
      fileSizeBytes: Buffer.byteLength(json, "utf8"),
      sourceFile: basename(EXCEL_PATH),
      updatedAt,
    });

    console.log(`Built ${localPath} (${yearRows.length} rows)`);

    if (shouldUpload) {
      await uploadToGcs(localPath, fileName);
      await setDoc(doc(db!, "opt_years", String(year)), {
        tahun: year,
        rowCount: yearRows.length,
        bucket: GCS_BUCKET,
        storagePath: `${GCS_PREFIX}/${fileName}`,
        fileName,
        publicUrl: `${PUBLIC_BASE_URL}/${fileName}`,
        fileSizeBytes: Buffer.byteLength(json, "utf8"),
        sourceFile: basename(EXCEL_PATH),
        updatedAt: serverTimestamp(),
      });
      console.log(`Updated Firestore opt_years/${year}`);
    }
  }

  const indexPath = join(OUTPUT_DIR, "index.json");
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`Built ${indexPath} (${index.length} years)`);

  if (shouldUpload) {
    await uploadToGcs(indexPath, "index.json");
  }

  console.log(`Done. Built ${rows.length} OPT rows.`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
