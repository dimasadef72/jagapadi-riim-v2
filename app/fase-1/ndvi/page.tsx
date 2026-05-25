"use client";

import { useRouter } from "next/navigation";

import Fase1NdviScreen from "@/components/fase-1-ndvi-screen";
import type { SelectedMapFeature } from "@/components/types";

export default function Fase1NdviPage() {
  const router = useRouter();

  const handleNavigateToMap = (feature: SelectedMapFeature) => {
    window.sessionStorage.setItem("selectedMapFeature", JSON.stringify(feature));
    router.push(`/maps?feature=${encodeURIComponent(feature.id)}&mode=${feature.mode}`);
  };

  return <Fase1NdviScreen onNavigateToMap={handleNavigateToMap} />;
}
