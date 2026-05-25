"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { MapMode, SelectedMapFeature } from "./types";
import MapUIClient from "./map-ui-client";

function getFeatureFromParams(featureId: string | null, mode: string | null): SelectedMapFeature | null {
  if (!featureId || !mode) {
    return null;
  }

  const normalizedMode = mode as MapMode;

  if (!["default", "fase1", "fase2-ndvi", "fase2-hama"].includes(normalizedMode)) {
    return null;
  }

  try {
    const storedFeature = window.sessionStorage.getItem("selectedMapFeature");
    const parsedFeature = storedFeature
      ? (JSON.parse(storedFeature) as SelectedMapFeature)
      : null;

    if (parsedFeature?.id === featureId && parsedFeature.mode === normalizedMode) {
      return parsedFeature;
    }
  } catch {
    window.sessionStorage.removeItem("selectedMapFeature");
  }

  return null;
}

export default function MapsPageClient() {
  const searchParams = useSearchParams();
  const [isFeatureClosed, setIsFeatureClosed] = useState(false);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedMapFeature | null>(null);
  const featureId = searchParams.get("feature");
  const mode = searchParams.get("mode");
  const featureKey = `${featureId ?? ""}-${mode ?? ""}`;

  useEffect(() => {
    setIsFeatureClosed(false);
    setSelectedFeature(getFeatureFromParams(featureId, mode));
  }, [featureKey]);

  return (
    <MapUIClient
      selectedFeature={isFeatureClosed ? null : selectedFeature}
      onCloseFeature={() => setIsFeatureClosed(true)}
    />
  );
}
