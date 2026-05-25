"use client";

import { useRouter } from "next/navigation";

import Fase2HamaScreen from "@/components/fase-2-hama-screen";
import type { SelectedMapFeature } from "@/components/types";

export default function Fase2HamaPage() {
  const router = useRouter();

  const handleNavigateToMap = (feature: SelectedMapFeature) => {
    window.sessionStorage.setItem("selectedMapFeature", JSON.stringify(feature));
    router.push(`/maps?feature=${encodeURIComponent(feature.id)}&mode=${feature.mode}`);
  };

  return <Fase2HamaScreen onNavigateToMap={handleNavigateToMap} />;
}
