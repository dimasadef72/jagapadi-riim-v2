"use client";

import { useRouter } from "next/navigation";

import Fase1InspectionScreen from "@/components/fase-1-inspection-screen";
import type { SelectedMapFeature } from "@/components/types";

export default function Fase1InspectionPage() {
  const router = useRouter();

  const handleNavigateToMap = (feature: SelectedMapFeature) => {
    window.sessionStorage.setItem("selectedMapFeature", JSON.stringify(feature));
    router.push(`/maps?feature=${encodeURIComponent(feature.id)}&mode=${feature.mode}`);
  };

  return <Fase1InspectionScreen onNavigateToMap={handleNavigateToMap} />;
}
