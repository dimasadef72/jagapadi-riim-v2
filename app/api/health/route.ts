import { collection, getCountFromServer } from "firebase/firestore";
import { NextResponse } from "next/server";

import { getFirebaseDb, hasFirebaseConfig } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasFirebaseConfig()) {
    return NextResponse.json(
      {
        ok: false,
        service: "firebase",
        status: "missing_config",
      },
      { status: 500 },
    );
  }

  try {
    const db = getFirebaseDb();
    const snapshot = await getCountFromServer(collection(db, "lahan"));

    return NextResponse.json({
      ok: true,
      service: "firebase",
      status: "connected",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      collections: {
        lahan: snapshot.data().count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firebase error";

    return NextResponse.json(
      {
        ok: false,
        service: "firebase",
        status: "unreachable",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        error: message,
      },
      { status: 500 },
    );
  }
}
