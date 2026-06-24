import { Storage } from "@google-cloud/storage";

const GCS_BUCKET = "riim-opt";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS belum diset. Isi dengan path service account JSON untuk mengatur CORS bucket.",
  );
}

const storage = new Storage();

await storage.bucket(GCS_BUCKET).setCorsConfiguration([
  {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://storage.googleapis.com",
    ],
    method: ["GET", "HEAD", "OPTIONS"],
    responseHeader: ["Content-Type", "Cache-Control"],
    maxAgeSeconds: 3600,
  },
]);

console.log(`CORS bucket gs://${GCS_BUCKET} berhasil diperbarui.`);
