"use client";

import { useRouter } from "next/navigation";

import Fase2NdviScreen from "@/components/fase-2-ndvi-screen";
import type { SelectedMapFeature } from "@/components/types";

export default function Fase2NdviPage() {
  const router = useRouter();

  const handleNavigateToMap = (feature: SelectedMapFeature) => {
    window.sessionStorage.setItem("selectedMapFeature", JSON.stringify(feature));
    router.push(`/maps?feature=${encodeURIComponent(feature.id)}&mode=${feature.mode}`);
  };

  return <Fase2NdviScreen onNavigateToMap={handleNavigateToMap} />;
}
