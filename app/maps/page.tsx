import { Suspense } from "react";

import MapsPageClient from "@/components/maps-page-client";

export default function MapsPage() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-slate-950" />}>
      <MapsPageClient />
    </Suspense>
  );
}
