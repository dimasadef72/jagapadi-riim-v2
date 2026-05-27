"use client";

import {
  MapContainer,
  TileLayer,
  useMap,
  ZoomControl,
  useMapEvents,
  Marker,
  Popup,
  ImageOverlay,
  Polygon,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Search,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  LocateFixed,
  Layers,
  X,
  Filter,
  Sprout,
  Beaker,
  Bug,
  ThermometerSun,
  Droplets,
  Wind,
  FlaskConical,
  Activity,
  MapPinned,
} from "lucide-react";

import FilterSelect from "./filter-select";
import LahanSelector from "./lahan-selector";
import RowsPerPageSelect from "./rows-per-page-select";
import {
  fetchLahan,
  fetchLahanMapData,
  getGridRectangleStyle,
  toHamaTableRow,
  toInspectionTableRow,
  toMapSensorReading,
  toNdviTableRow,
  type LahanMapData,
  type LahanOption,
  type MapImageLayer,
  type MapInspectionPoint,
  type MapSensorReading,
  type PhaseTableRow,
} from "./map-api";
import type { SelectedMapFeature } from "./types";
import {
  addSensorReading,
  canUseFirebaseLahanService,
  deleteSensorReading,
  subscribeSensorReadings,
  updateSensorReading,
} from "@/services/lahan-service";

// ... existing code down to MapClickHandler ...

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    if (map.getContainer()) {
      resizeObserver.observe(map.getContainer());
    }

    return () => resizeObserver.disconnect();
  }, [map]);

  return null;
}

function SelectedFeatureMarker({
  feature,
  onClose,
  onOpenSensorModal,
  autoFocus = true,
}: {
  feature: SelectedMapFeature;
  onClose: () => void;
  onOpenSensorModal?: (
    feature: SelectedMapFeature,
    reading?: MapSensorReading,
  ) => void;
  autoFocus?: boolean;
}) {
  const markerRef = useRef<L.Marker>(null);
  const [address, setAddress] = useState<string>("Mencari lokasi...");
  const [showFase1Stats, setShowFase1Stats] = useState(true);
  const [showFase2NdviStats, setShowFase2NdviStats] = useState(true);
  const [showFase2SensorStats, setShowFase2SensorStats] = useState(true);
  const [sensorHistoryIndex, setSensorHistoryIndex] = useState(0);
  const map = useMap();

  const updatePopupLayout = () => {
    markerRef.current?.getPopup()?.update();
  };

  useEffect(() => {
    if (feature && autoFocus) {
      const timer = setTimeout(() => {
        markerRef.current?.openPopup();
      }, 150);

      if (
        feature.mode === "default" &&
        feature.data?.type === "lahan" &&
        feature.data.bounds
      ) {
        map.fitBounds(
          [
            [feature.data.bounds.minLat, feature.data.bounds.minLng],
            [feature.data.bounds.maxLat, feature.data.bounds.maxLng],
          ],
          { padding: [80, 80], animate: true, maxZoom: 17 },
        );
      }

      setAddress("Mencari lokasi...");
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${feature.coordinates[0]}&lon=${feature.coordinates[1]}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress("Tidak ada data lokasi di titik ini.");
          }
        })
        .catch(() => setAddress("Gagal mengambil lokasi"));

      return () => {
        clearTimeout(timer);
      };
    }
  }, [autoFocus, feature, map]);

  useEffect(() => {
    setSensorHistoryIndex(0);
  }, [feature.data?.recordedAt, feature.id, feature.mode]);

  useEffect(() => {
    if (!markerRef.current?.isPopupOpen()) {
      return;
    }

    const frame = requestAnimationFrame(updatePopupLayout);
    return () => cancelAnimationFrame(frame);
  }, [address]);

  if (!feature) return null;

  // Custom Icon for Selected Grid
  let colorStart = "#4B7C63";
  let colorEnd = "#2a4a39";

  if (feature.mode === "fase2-hama") {
    colorStart = "#e11d48";
    colorEnd = "#881337";
  }

  const customMarkerIcon = new L.DivIcon({
    html: `<div class="relative flex flex-col items-center">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 4px rgba(0,0,0,0.4));">
        <defs>
          <linearGradient id="grad-${feature.mode}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colorStart}" />
            <stop offset="100%" stop-color="${colorEnd}" />
          </linearGradient>
          <radialGradient id="highlight-${feature.mode}" cx="35%" cy="30%" r="45%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M16,0 C7.163,0 0,7.163 0,16 C0,24 16,40 16,40 C16,40 32,24 32,16 C32,7.163 24.837,0 16,0 Z" fill="url(#grad-${feature.mode})" />
        <path d="M16,0 C7.163,0 0,7.163 0,16 C0,24 16,40 16,40 C16,40 32,24 32,16 C32,7.163 24.837,0 16,0 Z" fill="url(#highlight-${feature.mode})" />
        <circle cx="16" cy="14" r="6" fill="#ffffff" />
      </svg>
      <div class="absolute -bottom-1.5 w-5 h-2 bg-black/30 blur-[2px] rounded-[100%] scale-y-50"></div>
    </div>`,
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  });

  return (
    <Marker
      position={feature.coordinates}
      ref={markerRef}
      icon={customMarkerIcon}
    >
      <Popup
        closeButton={false}
        className="custom-popup"
        minWidth={320}
        eventHandlers={{ remove: onClose }}
      >
        <div className="px-5 pb-1 pt-5 font-sans min-w-[320px] relative bg-white rounded-2xl">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute right-5 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5 stroke-[3px]" />
          </button>

          {/* Phase Information First */}
          {feature.mode === "default" && feature.data?.type === "lahan" && (
            <div className="mb-3 mt-1">
              <div className="flex items-start justify-between gap-3 pr-14">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold uppercase tracking-widest text-[10px]">
                    <div className="bg-emerald-100/80 p-1.5 rounded-md shadow-sm">
                      <MapPinned className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                    Lokasi Lahan
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 leading-tight">
                    {feature.data.fieldCode} - {feature.data.name}
                  </h3>
                </div>
                <span className="mt-5 shrink-0 px-2.5 py-1.5 bg-emerald-700 text-white shadow-sm text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {feature.data.fieldCode}
                </span>
              </div>
            </div>
          )}

          {feature.mode === "fase1" && (
            <div className="mb-3 mt-1">
              <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                <div className="flex items-center gap-2 text-emerald-700 font-bold uppercase tracking-widest text-[10px]">
                  <div className="bg-emerald-100/80 p-1.5 rounded-md shadow-sm">
                    <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  Fase 1: Data Awal
                </div>
                <span className="flex h-7 shrink-0 items-center rounded-lg bg-emerald-800 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {feature.id}
                </span>
              </div>

              <div className="bg-white border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] rounded-xl p-3 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"></div>
                <div className="flex justify-between items-end mb-3">
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                      Nilai NDVI
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-black text-3xl text-slate-800 tracking-tighter leading-none">
                        {feature.data.ndvi || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                      Cluster Area
                    </p>
                    {(() => {
                      const cluster = getClusterStyles(feature.data.cluster);
                      const rawCluster = feature.data.cluster || "";
                      const subText =
                        rawCluster && rawCluster.includes("(")
                          ? rawCluster.split("(")[1].replace(")", "")
                          : "";

                      return (
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`px-2 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 ${cluster.chip}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${cluster.dot} ${feature.data.cluster ? "animate-pulse" : ""}`}
                            ></span>
                            {cluster.label}
                          </div>
                          {subText && (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {subText}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-90"></div>
                  <div
                    className="absolute top-0 right-0 h-full bg-slate-100 transition-all duration-1000 ease-out z-10"
                    style={{
                      width: `${feature.data.ndvi && !isNaN(parseFloat(feature.data.ndvi)) ? 100 - Math.max(0, Math.min(100, parseFloat(feature.data.ndvi) * 100)) : 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowFase1Stats((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50/60"
                  aria-expanded={showFase1Stats}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <Activity className="h-3.5 w-3.5" />
                    Statistik NDVI
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-emerald-700 transition-transform ${
                      showFase1Stats ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showFase1Stats && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                    {[
                      { label: "Mean", value: feature.data.mean, tone: "ndvi" },
                      {
                        label: "Median",
                        value: feature.data.median,
                        tone: "ndvi",
                      },
                      { label: "Min", value: feature.data.min, tone: "ndvi" },
                      { label: "P25", value: feature.data.p25, tone: "ndvi" },
                      { label: "Max", value: feature.data.max, tone: "ndvi" },
                      { label: "P75", value: feature.data.p75, tone: "ndvi" },
                      {
                        label: "Stddev",
                        value: feature.data.stddev,
                        tone: "spread",
                      },
                      {
                        label: "Variance",
                        value: feature.data.variance,
                        tone: "spread",
                      },
                    ].map((stat) => {
                      const numericValue = parseFloat(stat.value || "");
                      let valueClass = "text-slate-600";

                      if (!Number.isNaN(numericValue)) {
                        if (stat.tone === "spread") {
                          valueClass =
                            numericValue <= 0.05
                              ? "text-emerald-700"
                              : numericValue <= 0.1
                                ? "text-amber-700"
                                : "text-rose-700";
                        } else {
                          valueClass =
                            numericValue < 0.33
                              ? "text-rose-700"
                              : numericValue < 0.66
                                ? "text-amber-700"
                                : "text-emerald-700";
                        }
                      }

                      return (
                        <div
                          key={stat.label}
                          className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {stat.label}
                          </span>
                          <span
                            className={`text-[12px] font-black tabular-nums ${valueClass}`}
                          >
                            {stat.value || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {feature.mode === "fase2-ndvi" && (
            <div className="mb-3 mt-1">
              <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-widest text-[10px]">
                  <div className="bg-indigo-100/80 p-1.5 rounded-md shadow-sm">
                    <Beaker className="w-3.5 h-3.5 text-indigo-700" />
                  </div>
                  Fase 2: Analitik
                </div>
                <span className="flex h-7 shrink-0 items-center rounded-lg bg-indigo-800 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {feature.id}
                </span>
              </div>

              <div className="bg-white border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] rounded-xl p-3 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"></div>
                <div className="flex justify-between items-end mb-3">
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                      Nilai NDVI
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-black text-3xl text-slate-800 tracking-tighter leading-none">
                        {feature.data.ndvi || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                      Cluster Area
                    </p>
                    {(() => {
                      const cluster = getClusterStyles(feature.data.cluster);
                      const rawCluster = feature.data.cluster || "";
                      const subText =
                        rawCluster && rawCluster.includes("(")
                          ? rawCluster.split("(")[1].replace(")", "")
                          : "";

                      return (
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`px-2 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 ${cluster.chip}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${cluster.dot} ${feature.data.cluster ? "animate-pulse" : ""}`}
                            ></span>
                            {cluster.label}
                          </div>
                          {subText && (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {subText}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-90"></div>
                  <div
                    className="absolute top-0 right-0 h-full bg-slate-100 transition-all duration-1000 ease-out z-10"
                    style={{
                      width: `${feature.data.ndvi && !isNaN(parseFloat(feature.data.ndvi)) ? 100 - Math.max(0, Math.min(100, parseFloat(feature.data.ndvi) * 100)) : 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setShowFase2NdviStats((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50/60"
                    aria-expanded={showFase2NdviStats}
                  >
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      <Activity className="h-3.5 w-3.5" />
                      Statistik NDVI
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-emerald-700 transition-transform ${
                        showFase2NdviStats ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showFase2NdviStats && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                      {[
                        {
                          label: "Mean",
                          value: feature.data.mean,
                          tone: "ndvi",
                        },
                        {
                          label: "Median",
                          value: feature.data.median,
                          tone: "ndvi",
                        },
                        { label: "Min", value: feature.data.min, tone: "ndvi" },
                        { label: "P25", value: feature.data.p25, tone: "ndvi" },
                        { label: "Max", value: feature.data.max, tone: "ndvi" },
                        { label: "P75", value: feature.data.p75, tone: "ndvi" },
                        {
                          label: "Stddev",
                          value: feature.data.stddev,
                          tone: "spread",
                        },
                        {
                          label: "Variance",
                          value: feature.data.variance,
                          tone: "spread",
                        },
                      ].map((stat) => {
                        const numericValue = parseFloat(stat.value || "");
                        let valueClass = "text-slate-600";

                        if (!Number.isNaN(numericValue)) {
                          if (stat.tone === "spread") {
                            valueClass =
                              numericValue <= 0.05
                                ? "text-emerald-700"
                                : numericValue <= 0.1
                                  ? "text-amber-700"
                                  : "text-rose-700";
                          } else {
                            valueClass =
                              numericValue < 0.33
                                ? "text-rose-700"
                                : numericValue < 0.66
                                  ? "text-amber-700"
                                  : "text-emerald-700";
                          }
                        }

                        return (
                          <div
                            key={stat.label}
                            className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {stat.label}
                            </span>
                            <span
                              className={`text-[12px] font-black tabular-nums ${valueClass}`}
                            >
                              {stat.value || "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() =>
                      setShowFase2SensorStats((current) => !current)
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-sky-50/70"
                    aria-expanded={showFase2SensorStats}
                  >
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                      <ThermometerSun className="h-3.5 w-3.5" />
                      Sensor Lingkungan
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-sky-700 transition-transform ${
                        showFase2SensorStats ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showFase2SensorStats && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                      {[
                        {
                          label: "Suhu",
                          value: feature.data.temp
                            ? `${feature.data.temp}°C`
                            : "-",
                          color: "text-rose-700",
                        },
                        {
                          label: "Humidity",
                          value: feature.data.humidity || "-",
                          color: "text-blue-700",
                        },
                        {
                          label: "CO2",
                          value: feature.data.co2
                            ? `${feature.data.co2} ppm`
                            : "-",
                          color: "text-emerald-700",
                        },
                        {
                          label: "NH3",
                          value: feature.data.nh3
                            ? `${feature.data.nh3} ppm`
                            : "-",
                          color: "text-violet-700",
                        },
                        {
                          label: "CO",
                          value: feature.data.co
                            ? `${feature.data.co} ppm`
                            : "-",
                          color: "text-slate-700",
                        },
                        {
                          label: "NO2",
                          value: feature.data.no2
                            ? `${feature.data.no2} ppm`
                            : "-",
                          color: "text-cyan-700",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {stat.label}
                          </span>
                          <span
                            className={`text-[12px] font-black tabular-nums ${stat.color}`}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {feature.mode === "inspection" && (
            <div className="mb-3 mt-1">
              <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                <div className="flex items-center gap-2 text-sky-700 font-bold uppercase tracking-widest text-[10px]">
                  <div className="bg-sky-100/80 p-1.5 rounded-md shadow-sm">
                    <MapPinned className="w-3.5 h-3.5 text-sky-700" />
                  </div>
                  Titik Inspeksi
                </div>
                <span className="flex h-7 shrink-0 items-center rounded-lg bg-sky-800 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {feature.id}
                </span>
              </div>

              {(() => {
                const cluster = getClusterStyles(feature.data.cluster);

                return (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2.5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)]">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Cluster
                    </p>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold ${cluster.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cluster.dot}`}
                      />
                      {cluster.label}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const sensorReadings: MapSensorReading[] = Array.isArray(
                  feature.data?.raw?.sensorReadings,
                )
                  ? feature.data.raw.sensorReadings
                  : [];
                const safeSensorIndex =
                  sensorReadings.length === 0
                    ? 0
                    : Math.min(sensorHistoryIndex, sensorReadings.length - 1);
                const activeSensor = sensorReadings[safeSensorIndex] ?? null;
                const canShowHistoryNav = sensorReadings.length > 1;

                return (
                  <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
                      <span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                          <ThermometerSun className="h-3.5 w-3.5" />
                          Sensor Lingkungan
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          {canShowHistoryNav && (
                            <button
                              type="button"
                              onClick={() =>
                                setSensorHistoryIndex((current) =>
                                  Math.min(
                                    current + 1,
                                    sensorReadings.length - 1,
                                  ),
                                )
                              }
                              disabled={
                                safeSensorIndex >= sensorReadings.length - 1
                              }
                              className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Sensor lebih lama"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span>
                            {formatSensorRecordedAt(
                              activeSensor?.recordedAt ??
                                feature.data.recordedAt,
                            )}
                          </span>
                          {canShowHistoryNav && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setSensorHistoryIndex((current) =>
                                    Math.max(current - 1, 0),
                                  )
                                }
                                disabled={safeSensorIndex === 0}
                                className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label="Sensor lebih baru"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                              <span className="rounded-md bg-white px-1.5 py-0.5 text-[9px] font-black text-slate-500">
                                {safeSensorIndex + 1}/{sensorReadings.length}
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            activeSensor &&
                            onOpenSensorModal?.(feature, activeSensor)
                          }
                          disabled={!activeSensor?.readingId}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Edit sensor"
                        >
                          <Pencil className="h-3.5 w-3.5 stroke-[2.5px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenSensorModal?.(feature)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                          aria-label="Catat sensor"
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[3px]" />
                        </button>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                      {[
                        {
                          label: "Suhu",
                          value: activeSensor
                            ? `${formatSensorNumber(activeSensor.temperatureC, 1)}°C`
                            : feature.data.temp
                              ? `${feature.data.temp}°C`
                              : "-",
                          color: "text-rose-700",
                        },
                        {
                          label: "Humidity",
                          value: activeSensor
                            ? `${formatSensorNumber(activeSensor.humidityPct, 1)}%`
                            : feature.data.humidity || "-",
                          color: "text-blue-700",
                        },
                        {
                          label: "CO2",
                          value: activeSensor
                            ? `${formatSensorNumber(activeSensor.co2Ppm, 1)} ppm`
                            : feature.data.co2
                              ? `${feature.data.co2} ppm`
                              : "-",
                          color: "text-emerald-700",
                        },
                        {
                          label: "NH3",
                          value: activeSensor
                            ? `${formatSensorNumber(activeSensor.nh3Ppm, 3)} ppm`
                            : feature.data.nh3
                              ? `${feature.data.nh3} ppm`
                              : "-",
                          color: "text-violet-700",
                        },
                        {
                          label: "CO",
                          value: activeSensor
                            ? `${formatSensorNumber(activeSensor.coPpm, 3)} ppm`
                            : feature.data.co
                              ? `${feature.data.co} ppm`
                              : "-",
                          color: "text-slate-700",
                        },
                        {
                          label: "NO2",
                          value: activeSensor
                            ? `${formatSensorNumber(activeSensor.no2Ppm, 3)} ppm`
                            : feature.data.no2
                              ? `${feature.data.no2} ppm`
                              : "-",
                          color: "text-cyan-700",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {stat.label}
                          </span>
                          <span
                            className={`text-[12px] font-black tabular-nums ${stat.color}`}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {feature.mode === "fase2-hama" && (
            <div className="mb-2 mt-1">
              <div className="mb-3 flex items-center justify-between gap-3 pr-10">
                <div className="flex items-center gap-2 text-rose-700 font-bold uppercase tracking-widest text-[10px]">
                  <div className="bg-rose-100/80 p-1.5 rounded-md shadow-sm">
                    <Bug className="w-3.5 h-3.5 text-rose-700" />
                  </div>
                  Fase 2: Hama
                </div>
                <span className="flex h-7 shrink-0 items-center rounded-lg bg-rose-800 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {feature.id}
                </span>
              </div>

              {feature.data.imageUrl && (
                <div className="mb-2 overflow-hidden rounded-xl border border-rose-100 bg-slate-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.16)]">
                  <div className="relative aspect-[16/9]">
                    <img
                      src={feature.data.imageUrl}
                      alt={`Gambar penyakit ${feature.data.jenis || feature.id}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 rounded-lg border border-white/50 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700 shadow-sm backdrop-blur">
                      {feature.data.jenis || "Deteksi Hama"}
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const level = String(feature.data.tingkat || "").toLowerCase();
                const status = String(feature.data.status || "");
                let cardStyle = "border-slate-200 bg-white";
                let statusStyle = "text-slate-800";
                let chipStyle = "bg-slate-100 text-slate-700 border-slate-200";
                let dotStyle = "bg-slate-400";
                let levelText = feature.data.tingkat || "-";

                if (
                  level.includes("tinggi") ||
                  status.toLowerCase().includes("kritis")
                ) {
                  cardStyle = "border-rose-100 bg-rose-50/40";
                  statusStyle = "text-rose-900";
                  chipStyle = "bg-rose-50 text-rose-700 border-rose-200";
                  dotStyle = "bg-rose-500";
                } else if (level.includes("sedang")) {
                  cardStyle = "border-amber-100 bg-amber-50/40";
                  statusStyle = "text-amber-900";
                  chipStyle = "bg-amber-50 text-amber-700 border-amber-200";
                  dotStyle = "bg-amber-500";
                } else if (level.includes("rendah")) {
                  cardStyle = "border-emerald-100 bg-emerald-50/40";
                  statusStyle = "text-emerald-900";
                  chipStyle =
                    "bg-emerald-50 text-emerald-700 border-emerald-200";
                  dotStyle = "bg-emerald-500";
                }

                return (
                  <div
                    className={`mb-2 rounded-xl border px-3 py-2.5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] ${cardStyle}`}
                  >
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Status Hama
                        </p>
                        <div
                          className={`mt-0.5 text-[25px] font-black leading-none tracking-tighter ${statusStyle}`}
                        >
                          {feature.data.status || "-"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Risiko
                        </p>
                        <div
                          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold ${chipStyle}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${dotStyle}`}
                          />
                          {levelText}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-y-1 rounded-lg border border-white/70 bg-white/75 px-3 py-1.5">
                      {[
                        { label: "Jenis", value: feature.data.jenis },
                        { label: "Area", value: feature.data.area },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-0.5 last:border-b-0"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.label}
                          </span>
                          <span className="max-w-[190px] text-right text-[12px] font-black text-slate-800">
                            {item.value || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-xl border border-rose-100 bg-white px-3 py-2 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.16)]">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  <Bug className="h-3.5 w-3.5" />
                  Rekomendasi
                </div>
                <p className="m-0 text-[12px] font-semibold leading-[1.35] text-slate-800">
                  {feature.data.rekomendasi || "-"}
                </p>
              </div>
            </div>
          )}

          <div
            className={`h-[1px] w-full bg-gray-200 ${feature.mode === "fase2-hama" ? "mb-2" : "mb-3"}`}
          />

          {/* Location Info */}
          <div className={feature.mode === "fase2-hama" ? "mb-3" : "mb-4"}>
            <div className="flex items-center gap-1 text-[#4B7C63] font-bold uppercase tracking-widest text-[9px]">
              <MapPin className="w-3 h-3" /> Lokasi
            </div>
            <p
              className="text-[12px] font-bold text-gray-900 leading-[1.4] m-0"
              style={{ marginTop: "3px" }}
            >
              {address}
            </p>
          </div>

          <div
            className={`h-[1px] w-full bg-gray-200 ${feature.mode === "fase2-hama" ? "mb-2" : "mb-3"}`}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-[#4B7C63] font-bold uppercase tracking-widest text-[9px]">
                <div className="w-3 h-3 rounded-full border-[1.5px] border-current flex items-center justify-center">
                  <div className="w-2 h-[1.5px] bg-current" />
                </div>
                LAT
              </div>
              <p
                className="font-extrabold text-gray-900 text-[12px] leading-tight m-0"
                style={{ marginTop: "1px" }}
              >
                {feature.coordinates[0].toFixed(6)}
              </p>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-[#4B7C63] font-bold uppercase tracking-widest text-[9px]">
                <div className="w-3 h-3 rounded-full border-[1.5px] border-current flex items-center justify-center">
                  <div className="w-2 h-[1.5px] bg-current rotate-90" />
                </div>
                LONG
              </div>
              <p
                className="font-extrabold text-gray-900 text-[12px] leading-tight m-0"
                style={{ marginTop: "1px" }}
              >
                {feature.coordinates[1].toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

interface MapUIProps {
  selectedFeature?: SelectedMapFeature | null;
  onCloseFeature?: () => void;
}

type ImageLayerType = "rgb" | "ndvi";

function MapSearchOverlay() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = async (searchText: string) => {
    if (!searchText.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchText.trim(),
        )}&limit=5&countrycodes=id`, // Optimizing for Indonesian defaults
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Fetch suggestions error:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowSuggestions(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 400); // 400ms debounce
  };

  const handleSelectSuggestion = (place: any) => {
    setQuery(place.display_name);
    setShowSuggestions(false);

    if (place.boundingbox) {
      map.fitBounds(
        [
          [parseFloat(place.boundingbox[0]), parseFloat(place.boundingbox[2])],
          [parseFloat(place.boundingbox[1]), parseFloat(place.boundingbox[3])],
        ],
        { animate: true, duration: 1.5 },
      );
    } else {
      map.flyTo([parseFloat(place.lat), parseFloat(place.lon)], 15, {
        duration: 1.5,
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // If suggestions exist and user presses enter, select the top one
    if (showSuggestions && suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&limit=1`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon, boundingbox } = data[0];
        if (boundingbox) {
          map.fitBounds(
            [
              [boundingbox[0], boundingbox[2]],
              [boundingbox[1], boundingbox[3]],
            ],
            { animate: true, duration: 1.5 },
          );
        } else {
          map.flyTo([parseFloat(lat), parseFloat(lon)], 15, { duration: 1.5 });
        }
      } else {
        setError("Lokasi tidak ditemukan");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan, coba lagi.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-[16px] sm:top-6 left-[82px] sm:left-6 right-[16px] sm:right-auto z-[500] w-auto sm:w-[340px] no-map-click">
      <div className="relative">
        <form
          onSubmit={handleSearch}
          className={`relative flex items-center w-full h-[52px] bg-white transition-all shadow-[0_8px_30px_rgba(0,0,0,0.12)] focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.16)] ${
            showSuggestions && suggestions.length > 0
              ? "rounded-t-[20px] rounded-b-none border-b border-gray-100"
              : "rounded-[20px]"
          }`}
        >
          <div className="pl-5 pr-3 text-[#4B7C63]">
            <MapPin className="w-[22px] h-[22px] stroke-[1.5px]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              // Delay hiding to allow clicking suggestions
              setTimeout(() => setShowSuggestions(false), 250);
            }}
            placeholder="Cari lokasi lahan..."
            className="flex-1 h-full bg-transparent outline-none text-gray-800 placeholder:text-gray-400 font-medium text-[15px] min-w-0 w-full"
          />
          <div className="flex-shrink-0 pr-1.5 py-1.5 h-full flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-[40px] h-[40px] bg-[#4B7C63] hover:bg-[#3B6650] text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 rounded-[14px] flex items-center justify-center shrink-0"
            >
              {loading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <Search className="w-[18px] h-[18px] stroke-[2px]" />
              )}
            </button>
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-white rounded-b-[24px] shadow-[0_16px_30px_rgba(0,0,0,0.12)] border-t-0 overflow-hidden divide-y divide-gray-100 z-[500]">
            {suggestions.map((place, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(place)}
                className="px-5 py-3.5 hover:bg-emerald-50/50 cursor-pointer transition-colors flex items-start gap-3 group"
              >
                <div className="mt-0.5 text-gray-400 group-hover:text-[#4B7C63] transition-colors shrink-0">
                  <MapPin className="w-4 h-4 stroke-[2px]" />
                </div>
                <div className="flex flex-col flex-1 line-clamp-2">
                  <span className="text-[14px] text-gray-800 font-medium leading-tight mb-0.5">
                    {place.display_name.split(",")[0]}
                  </span>
                  <span className="text-[12px] text-gray-500 truncate leading-tight">
                    {place.display_name.split(",").slice(1).join(",").trim()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="absolute top-[calc(100%+12px)] left-0 bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-md whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}

function LocateUserButton() {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latlng: L.LatLng;
    accuracy: number;
  } | null>(null);

  const userLocationIcon = useMemo(
    () =>
      new L.DivIcon({
        html: `<div class="relative flex h-10 w-10 items-center justify-center">
          <div class="absolute h-10 w-10 animate-ping rounded-full bg-[#4B7C63]/35"></div>
          <div class="absolute h-7 w-7 rounded-full bg-[#4B7C63]/20"></div>
          <div class="relative h-4 w-4 rounded-full border-2 border-white bg-[#4B7C63] shadow-[0_4px_14px_rgba(15,23,42,0.35)]"></div>
        </div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    [],
  );

  useMapEvents({
    locationfound(event) {
      setLoading(false);
      setUserLocation({
        latlng: event.latlng,
        accuracy: event.accuracy,
      });
    },
    locationerror() {
      setLoading(false);
      alert("Tidak dapat menemukan lokasi. Pastikan izin lokasi aktif.");
    },
  });

  const handleLocate = () => {
    setLoading(true);
    map.locate({
      setView: true,
      maxZoom: 17,
      enableHighAccuracy: true,
    });
  };

  return (
    <>
      {userLocation && (
        <>
          <Circle
            center={userLocation.latlng}
            radius={userLocation.accuracy}
            pathOptions={{
              color: "#4B7C63",
              fillColor: "#4B7C63",
              fillOpacity: 0.12,
              opacity: 0.35,
              weight: 1,
            }}
          />
          <Marker
            position={userLocation.latlng}
            icon={userLocationIcon}
            interactive={false}
          />
        </>
      )}

      <div className="absolute bottom-6 right-[16px] sm:right-6 z-[500] no-map-click">
        <button
          onClick={handleLocate}
          disabled={loading}
          className="w-12 h-12 bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4B7C63]/50 transition-all text-[#4B7C63] disabled:text-gray-400"
          title="Lokasi saya"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5 stroke-[2px]" />
          )}
        </button>
      </div>
    </>
  );
}

type MapType = "default" | "satellite" | "terrain";
type OverlayType = "rgb" | "ndvi" | "fase1" | "inspection" | "fase2" | "hama";

function CustomLayerControl({
  baseLayer,
  setBaseLayer,
  activeOverlays,
  toggleOverlay,
}: {
  baseLayer: MapType;
  setBaseLayer: (m: MapType) => void;
  activeOverlays: OverlayType[];
  toggleOverlay: (o: OverlayType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-[198px] sm:top-[128px] right-[16px] sm:right-6 z-[500] no-map-click">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center hover:bg-gray-50 transition-colors text-[#4B7C63]"
        title="Lapisan Peta"
      >
        <Layers className="w-[22px] h-[22px] stroke-[2px]" />
      </button>

      {isOpen && (
        <div className="absolute top-0 right-16 w-[calc(100vw-90px)] max-w-[340px] bg-white text-gray-800 rounded-2xl p-3 shadow-2xl z-[500] border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[15px] font-semibold text-gray-900">
              Map type
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              {
                id: "default",
                label: "Default",
                img: "https://a.tile.openstreetmap.org/5/26/16.png",
              },
              {
                id: "satellite",
                label: "Satellite",
                img: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/16/26",
              },
              {
                id: "terrain",
                label: "Terrain",
                img: "https://a.tile.opentopomap.org/5/26/16.png",
              },
            ].map((type) => (
              <div
                key={type.id}
                className="flex flex-col items-center gap-1 cursor-pointer group"
                onClick={() => setBaseLayer(type.id as MapType)}
              >
                <div
                  className={`w-[60px] h-[60px] rounded-[16px] overflow-hidden p-[2px] transition-all ${baseLayer === type.id ? "ring-2 ring-emerald-500" : "ring-1 ring-gray-200 group-hover:ring-gray-300"}`}
                >
                  <div className="w-full h-full rounded-[12px] overflow-hidden bg-gray-100">
                    <img
                      src={type.img}
                      alt={type.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold ${baseLayer === type.id ? "text-emerald-700" : "text-gray-500"}`}
                >
                  {type.label}
                </span>
              </div>
            ))}
          </div>

          <div className="h-[1px] w-full bg-gray-100 my-2.5" />

          <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">
            Map details
          </h3>

          <div className="grid grid-cols-4 gap-2 mb-2">
            {[
              {
                id: "rgb",
                label: "RGB",
                bgClass:
                  "bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600",
                icon: Layers,
              },
              {
                id: "ndvi",
                label: "NDVI",
                bgClass:
                  "bg-gradient-to-br from-green-100 to-yellow-100 text-emerald-700",
                icon: Layers,
              },
            ].map((layer) => {
              const ContentIcon = layer.icon;
              return (
                <div
                  key={layer.id}
                  className="flex flex-col items-center gap-1 cursor-pointer group relative"
                  onClick={() => toggleOverlay(layer.id as OverlayType)}
                >
                  <div
                    className={`w-[60px] h-[60px] rounded-[16px] overflow-hidden p-[2px] transition-all ${activeOverlays.includes(layer.id as OverlayType) ? "ring-2 ring-emerald-500" : "ring-1 ring-gray-200 group-hover:ring-gray-300"}`}
                  >
                    <div
                      className={`w-full h-full rounded-[12px] ${layer.bgClass} flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]`}
                    >
                      <span className="font-black tracking-wider text-[12px]">
                        {layer.label}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${activeOverlays.includes(layer.id as OverlayType) ? "text-emerald-700" : "text-gray-500"}`}
                  >
                    {layer.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="h-[1px] w-full bg-gray-100 my-2.5" />

          <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">
            Fase details
          </h3>

          <div className="grid grid-cols-4 gap-2">
            {[
              {
                id: "fase1",
                label: "Fase 1",
                bgClass:
                  "bg-gradient-to-br from-emerald-50 to-emerald-100 text-[#4B7C63]",
                icon: Sprout,
              },
              {
                id: "inspection",
                label: "Inspection",
                bgClass:
                  "bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600",
                icon: MapPinned,
              },
              {
                id: "fase2",
                label: "Fase 2",
                bgClass:
                  "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600",
                icon: Beaker,
              },
              {
                id: "hama",
                label: "Hama",
                bgClass:
                  "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600",
                icon: Bug,
              },
            ].map((layer) => {
              const ContentIcon = layer.icon;
              return (
                <div
                  key={layer.id}
                  className="flex flex-col items-center gap-1 cursor-pointer group relative"
                  onClick={() => toggleOverlay(layer.id as OverlayType)}
                >
                  <div
                    className={`w-[60px] h-[60px] rounded-[16px] overflow-hidden p-[2px] transition-all ${activeOverlays.includes(layer.id as OverlayType) ? "ring-2 ring-emerald-500" : "ring-1 ring-gray-200 group-hover:ring-gray-300"}`}
                  >
                    <div
                      className={`w-full h-full rounded-[12px] ${layer.bgClass} flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]`}
                    >
                      <ContentIcon className="w-6 h-6 stroke-[2px]" />
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${activeOverlays.includes(layer.id as OverlayType) ? "text-emerald-700" : "text-gray-500"}`}
                  >
                    {layer.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type PhaseLayer = "fase1" | "inspection" | "fase2" | "hama";
type SheetState = "collapsed" | "expanded";
type PanelSortKey = "mean" | "cluster";
type PanelSortDirection = "asc" | "desc";

function panelNumericValue(value: string | undefined) {
  return Number(String(value ?? "").replace("%", "")) || 0;
}

function getClusterStyles(cluster?: string) {
  const normalized = (cluster || "").toLowerCase();
  const label = cluster?.trim() || "-";

  if (normalized.includes("non-tanaman") || normalized.includes("non tanaman") || normalized.includes("non-plant")) {
    return {
      label: "Non-Tanaman",
      chip: "bg-slate-50 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    };
  }

  if (normalized.includes("sehat") || normalized.includes("hijau") || normalized.includes("green")) {
    return {
      label: normalized.includes("sehat") ? label : "Hijau",
      chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  if (normalized.includes("cukup")) {
    return {
      label,
      chip: "bg-lime-50 text-lime-700 border-lime-200",
      dot: "bg-lime-500",
    };
  }

  if (normalized.includes("sedang") || normalized.includes("kuning") || normalized.includes("yellow")) {
    return {
      label: normalized.includes("sedang") ? label : "Kuning",
      chip: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    };
  }

  if (normalized.includes("stres") || normalized.includes("stress")) {
    return {
      label,
      chip: "bg-orange-50 text-orange-700 border-orange-200",
      dot: "bg-orange-500",
    };
  }

  if (normalized.includes("kritis") || normalized.includes("merah") || normalized.includes("red")) {
    return {
      label: normalized.includes("kritis") ? label : "Merah",
      chip: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    };
  }

  return {
    label,
    chip: "bg-slate-50 text-slate-500 border-slate-200",
    dot: "bg-slate-300",
  };
}

function getClusterSortRank(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("non-tanaman") || normalized.includes("non tanaman")) return 0;
  if (normalized.includes("kritis")) return 1;
  if (normalized.includes("stres") || normalized.includes("stress")) return 2;
  if (normalized.includes("sedang")) return 3;
  if (normalized.includes("cukup")) return 4;
  if (normalized.includes("sehat")) return 5;
  if (normalized.includes("merah")) return 1;
  if (normalized.includes("kuning")) return 3;
  if (normalized.includes("hijau")) return 5;

  return 99;
}

function compareClusterLabels(a: string, b: string) {
  const aZone = a.match(/^zona\s+(\d+)$/i);
  const bZone = b.match(/^zona\s+(\d+)$/i);

  if (aZone && bZone) {
    return Number(aZone[1]) - Number(bZone[1]);
  }

  return a.localeCompare(b, undefined, { numeric: true });
}

function getPhaseRows(
  activePhase: PhaseLayer,
  mapData?: LahanMapData | null,
): PhaseTableRow[] {
  if (!mapData) return [];
  if (activePhase === "hama") return mapData.hama.map(toHamaTableRow);
  if (activePhase === "inspection") {
    return mapData.inspectionPoints.map(toInspectionTableRow);
  }
  return mapData.grids.map(toNdviTableRow);
}

function getPhaseMode(activePhase: PhaseLayer) {
  if (activePhase === "fase1") return "fase1";
  if (activePhase === "inspection") return "inspection";
  if (activePhase === "fase2") return "fase2-ndvi";
  return "fase2-hama";
}

function getHamaRiskStyles(level?: string, status?: string) {
  const normalized = `${level || ""} ${status || ""}`.toLowerCase();

  if (normalized.includes("tinggi") || normalized.includes("kritis")) {
    return {
      label: level || "Tinggi",
      chip: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    };
  }

  if (normalized.includes("sedang") || normalized.includes("terindikasi")) {
    return {
      label: level || "Sedang",
      chip: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    };
  }

  if (normalized.includes("rendah")) {
    return {
      label: level || "Rendah",
      chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  return {
    label: level || "-",
    chip: "bg-slate-50 text-slate-500 border-slate-200",
    dot: "bg-slate-300",
  };
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.%-]+/g, "");
}

function LayerDataPanel({
  activeOverlays,
  lahanOptions,
  selectedLahan,
  mapData,
  isMapDataLoading,
  selectedFeature,
  onSelectLahan,
  onSelectFeature,
  onCloseLayer,
}: {
  activeOverlays: OverlayType[];
  lahanOptions: LahanOption[];
  selectedLahan?: LahanOption | null;
  mapData?: LahanMapData | null;
  isMapDataLoading?: boolean;
  selectedFeature?: SelectedMapFeature | null;
  onSelectLahan: (lahan: LahanOption) => void;
  onSelectFeature: (feature: SelectedMapFeature) => void;
  onCloseLayer: (phase: PhaseLayer) => void;
}) {
  const availablePhases = useMemo(
    () =>
      activeOverlays.filter(
        (overlay): overlay is PhaseLayer =>
          overlay === "fase1" ||
          overlay === "inspection" ||
          overlay === "fase2" ||
          overlay === "hama",
      ),
    [activeOverlays],
  );
  const [activePhase, setActivePhase] = useState<PhaseLayer>("fase1");
  const [query, setQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState("semua");
  const [sortKey, setSortKey] = useState<PanelSortKey | null>(null);
  const [sortDirection, setSortDirection] =
    useState<PanelSortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sheetState, setSheetState] = useState<SheetState>("expanded");

  useEffect(() => {
    if (availablePhases.length > 0 && !availablePhases.includes(activePhase)) {
      setActivePhase(availablePhases[0]);
    }
  }, [activePhase, availablePhases]);

  useEffect(() => {
    setQuery("");
    setClusterFilter("semua");
    setSortKey(null);
    setSortDirection("desc");
    setPage(1);
  }, [activePhase]);

  const rows = useMemo(
    () => getPhaseRows(activePhase, mapData),
    [activePhase, mapData],
  );
  const clusterOptions = useMemo(() => {
    if (activePhase === "hama") {
      return [
        { value: "rendah", label: "Rendah" },
        { value: "sedang", label: "Sedang" },
        { value: "tinggi", label: "Tinggi" },
      ];
    }

    const options = new Map<string, string>();

    rows.forEach((row) => {
      const label = getClusterStyles(row.cluster).label;
      const value = label.toLowerCase();

      if (label !== "-" && !options.has(value)) {
        options.set(value, label);
      }
    });

    return Array.from(options, ([value, label]) => ({ value, label })).sort(
      (a, b) =>
        getClusterSortRank(a.label) - getClusterSortRank(b.label) ||
        compareClusterLabels(a.label, b.label),
    );
  }, [activePhase, rows]);
  const mode = getPhaseMode(activePhase);
  const selectedGrid =
    selectedFeature?.mode === mode ? selectedFeature.id : null;
  const phaseLabel =
    activePhase === "fase1"
      ? "Fase 1"
      : activePhase === "inspection"
        ? "Inspection"
        : activePhase === "fase2"
          ? "Fase 2"
          : "Hama";
  const phaseDescription =
    activePhase === "fase1"
      ? "Data awal NDVI drone"
      : activePhase === "inspection"
        ? "Titik cek lapangan"
        : activePhase === "fase2"
          ? "Analitik NDVI & sensor"
          : "Indikasi hama & rekomendasi";
  const normalizedQuery = normalizeSearchText(query);
  const filteredRows = rows.filter((row) => {
    const rowData = row;
    const cluster =
      activePhase === "hama"
        ? getHamaRiskStyles(rowData.tingkat, rowData.status).label
        : getClusterStyles(rowData.cluster).label;
    const coordinates = row.coordinates;
    const searchableText = [
      row.grid,
      row.grid.replace("-", ""),
      rowData.mean,
      rowData.min,
      rowData.max,
      rowData.stddev,
      cluster,
      rowData.status,
      rowData.tingkat,
      rowData.jenis,
      rowData.area,
      rowData.rekomendasi,
      rowData.representedGrids,
      rowData.sensorStatus,
      coordinates?.[1],
      coordinates?.[0],
      activePhase === "fase2" || activePhase === "inspection"
        ? rowData.co2
        : "",
      activePhase === "fase2" || activePhase === "inspection"
        ? rowData.temp
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery ||
        normalizeSearchText(searchableText).includes(normalizedQuery)) &&
      (clusterFilter === "semua" || cluster.toLowerCase() === clusterFilter)
    );
  }).sort((a, b) => {
    if (!sortKey) {
      return 0;
    }

    let sortValue = 0;

    if (sortKey === "mean") {
      sortValue = panelNumericValue(a.mean) - panelNumericValue(b.mean);
    } else if (sortKey === "cluster") {
      const aCluster =
        activePhase === "hama"
          ? getHamaRiskStyles(a.tingkat, a.status).label
          : getClusterStyles(a.cluster).label;
      const bCluster =
        activePhase === "hama"
          ? getHamaRiskStyles(b.tingkat, b.status).label
          : getClusterStyles(b.cluster).label;

      sortValue =
        getClusterSortRank(aCluster) - getClusterSortRank(bCluster) ||
        compareClusterLabels(aCluster, bCluster);
    }

    return sortDirection === "asc" ? sortValue : -sortValue;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const isTableLoading = Boolean(isMapDataLoading && selectedLahan);

	  const handleSelectGrid = (row: (typeof rows)[number]) => {
	    onSelectFeature({
	      id: row.grid,
	      mode,
	      coordinates: row.coordinates,
	      data: row,
	    });

	    if (window.matchMedia("(max-width: 639px)").matches) {
	      setSheetState("collapsed");
	    }
	  };

  const handleSort = (key: PanelSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }

    setPage(1);
  };

  const renderSortIcon = (key: PanelSortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-emerald-700" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-700" />
    );
  };

  const renderSortableHeader = (key: PanelSortKey, label: string) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="mx-auto inline-flex min-w-0 items-center justify-center gap-1 font-bold uppercase tracking-wider text-slate-500 transition hover:text-emerald-700"
      title={`Sort ${label}`}
    >
      <span className="truncate">{label}</span>
      {renderSortIcon(key)}
    </button>
  );

  const handleSelectLahan = () => {
    if (!mapData) {
      return;
    }

	    onSelectFeature({
	      id: mapData.lahan.fieldCode,
	      mode: "default",
	      coordinates: [mapData.lahan.center.lat, mapData.lahan.center.lng],
      data: {
        type: "lahan",
        ...mapData.lahan,
	        center: [mapData.lahan.center.lat, mapData.lahan.center.lng],
	      },
	    });

	    if (window.matchMedia("(max-width: 639px)").matches) {
	      setSheetState("collapsed");
	    }
	  };

  if (availablePhases.length === 0) {
    return null;
  }

  return (
    <aside
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      className={`absolute inset-x-0 bottom-0 z-[1200] flex w-full flex-col overflow-visible rounded-t-[26px] border border-white/70 bg-white/95 shadow-[0_-18px_50px_rgba(15,23,42,0.20)] backdrop-blur-xl transition-[max-height,width] duration-300 ease-out sm:left-6 sm:right-auto sm:top-[100px] sm:rounded-2xl sm:shadow-[0_18px_50px_rgba(15,23,42,0.18)] no-map-click ${
        sheetState === "expanded"
          ? "max-h-[86dvh] sm:bottom-6 sm:max-h-none sm:w-[380px]"
          : "max-h-[15dvh] sm:bottom-auto sm:w-[64px]"
      }`}
    >
      {sheetState === "collapsed" && (
        <div className="hidden flex-col items-center gap-3 px-2 py-3 sm:flex">
          <button
            type="button"
            onClick={() => setSheetState("expanded")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
            title="Besarkan panel layer"
            aria-label="Besarkan panel layer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-emerald-700 ring-1 ring-slate-100">
            <MapPinned className="h-4 w-4" />
          </div>
          <div className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
            {activePhase === "fase1"
              ? "F1"
              : activePhase === "inspection"
                ? "IN"
                : activePhase === "fase2"
                  ? "F2"
                  : "H"}
          </div>
        </div>
      )}

      <div
        className={`shrink-0 border-b border-slate-100 px-4 pb-3 pt-2 sm:py-3 ${
          sheetState === "collapsed" ? "sm:hidden" : ""
        }`}
      >
        <button
          type="button"
          onClick={() =>
            setSheetState((current) => {
              return current === "collapsed" ? "expanded" : "collapsed";
            })
          }
          className="mx-auto mb-2 flex h-6 w-16 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:hidden"
          aria-label={
            sheetState === "expanded" ? "Kecilkan panel" : "Besarkan panel"
          }
        >
          {sheetState === "expanded" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <MapPinned className="h-3.5 w-3.5" />
              Layer aktif
            </div>
            <h2 className="mt-1 text-[18px] font-black leading-tight text-slate-950">
              Data {phaseLabel}
            </h2>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
              {phaseDescription}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetState("collapsed")}
              className="hidden h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 sm:flex"
              title="Kecilkan panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {availablePhases.length > 1 && (
              <div className="flex rounded-xl bg-slate-100 p-1">
                {availablePhases.map((phase) => (
                  <button
                    key={phase}
                    onClick={() => setActivePhase(phase)}
                    className={`h-8 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${
                      activePhase === phase
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {phase === "fase1"
                      ? "F1"
                      : phase === "inspection"
                        ? "IN"
                        : phase === "fase2"
                          ? "F2"
                          : "H"}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onCloseLayer(activePhase)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              title="Tutup layer aktif"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pilih Lahan
          </p>
          {selectedLahan ? (
            <LahanSelector
              options={lahanOptions}
              value={selectedLahan}
              onChange={onSelectLahan}
            />
          ) : (
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-400">
              Memuat lahan...
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Lokasi Lahan
              </p>
              <p className="mt-0.5 text-[12px] font-black text-slate-700">
                {mapData
                  ? `${mapData.lahan.center.lng.toFixed(5)}, ${mapData.lahan.center.lat.toFixed(5)}`
                  : isMapDataLoading
                    ? "Memuat koordinat..."
                    : "-"}
              </p>
            </div>
            <button
              onClick={handleSelectLahan}
              disabled={!mapData}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
              title="Lihat lokasi lahan"
            >
              <MapPin className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_150px] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={
                activePhase === "inspection" ? "Cari titik..." : "Cari grid..."
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-900/20"
            />
          </div>
          <FilterSelect
            icon={<Filter className="h-4 w-4 text-slate-400" />}
            value={clusterFilter}
            onChange={(value) => {
              setClusterFilter(value);
              setPage(1);
            }}
            options={[
              { value: "semua", label: "Semua" },
              ...clusterOptions,
            ]}
          />
        </div>
      </div>

      <div
        className={`table-scrollbar min-h-0 flex-1 overflow-y-auto bg-white ${
          sheetState === "collapsed" ? "sm:hidden" : ""
        }`}
      >
        <div
          className={`sticky top-0 z-10 grid border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${
            activePhase === "hama"
              ? "grid-cols-[58px_1fr_66px_42px]"
              : activePhase === "inspection"
                ? "grid-cols-[58px_1fr_62px_42px]"
                : activePhase === "fase1"
                  ? "grid-cols-[74px_58px_1fr_42px]"
                  : "grid-cols-[56px_54px_54px_1fr_38px]"
          }`}
        >
          {activePhase === "hama" ? (
            <>
              <span className="text-center">Grid</span>
              <span className="text-center">Status</span>
              <span className="text-center">Risiko</span>
              <span className="text-center">Aksi</span>
            </>
          ) : activePhase === "inspection" ? (
            <>
              <span className="text-center">Point</span>
              {renderSortableHeader("cluster", "Cluster")}
              <span className="text-center">Grid</span>
              <span className="text-center">Aksi</span>
            </>
          ) : activePhase === "fase1" ? (
            <>
              <span className="text-center">Grid Area</span>
              {renderSortableHeader("mean", "NDVI")}
              {renderSortableHeader("cluster", "Cluster")}
              <span className="text-center">Aksi</span>
            </>
          ) : (
            <>
              <span className="text-center">Grid</span>
              {renderSortableHeader("mean", "NDVI")}
              <span className="text-center">CO2</span>
              {renderSortableHeader("cluster", "Cluster")}
              <span className="text-center">Aksi</span>
            </>
          )}
        </div>

        {isTableLoading ? (
          <div className="relative min-h-[300px] px-4 py-4">
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: pageSize }).map((_, index) => (
                <div
                  key={index}
                  className={`grid w-full items-center gap-3 rounded-xl bg-white py-2 ${
                    activePhase === "hama"
                      ? "grid-cols-[58px_1fr_66px_42px]"
                      : activePhase === "inspection"
                        ? "grid-cols-[58px_1fr_62px_42px]"
                        : activePhase === "fase1"
                          ? "grid-cols-[74px_58px_1fr_42px]"
                          : "grid-cols-[56px_54px_54px_1fr_38px]"
                  }`}
                >
                  <span className="h-5 animate-pulse rounded-md bg-slate-100" />
                  <span className="h-5 animate-pulse rounded-md bg-slate-100" />
                  <span className="h-5 animate-pulse rounded-md bg-slate-100" />
                  {activePhase === "fase2" && (
                    <span className="h-5 animate-pulse rounded-md bg-slate-100" />
                  )}
                  <span className="mx-auto h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          pagedRows.map((row) => {
            const rowData = row;
            const cluster =
              activePhase === "hama"
                ? getHamaRiskStyles(rowData.tingkat, rowData.status)
                : getClusterStyles(rowData.cluster);
            const isSelected = selectedGrid === row.grid;

            return (
              <div
                key={`${activePhase}-${row.grid}`}
                className={`grid w-full items-center gap-0 border-b border-slate-100 px-4 py-3 text-center transition-colors last:border-b-0 ${
                  activePhase === "hama"
                    ? "grid-cols-[58px_1fr_66px_42px]"
                    : activePhase === "inspection"
                      ? "grid-cols-[58px_1fr_62px_42px]"
                      : activePhase === "fase1"
                        ? "grid-cols-[74px_58px_1fr_42px]"
                        : "grid-cols-[56px_54px_54px_1fr_38px]"
                } ${
                  isSelected ? "bg-emerald-50/80" : "bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-center font-black text-[13px] text-slate-900">
                  {row.grid}
                </span>
                {activePhase === "hama" ? (
                  <>
                    <span className="min-w-0 px-1 text-center text-[12px] font-black text-slate-800">
                      {rowData.status || "-"}
                    </span>
                    <span
                      className={`mx-auto inline-flex w-fit items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${cluster.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cluster.dot}`}
                      />
                      {cluster.label}
                    </span>
                    <span className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleSelectGrid(row)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-700/30 bg-white text-rose-700 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-rose-50"
                        title="Lihat lokasi hama"
                      >
                        <Bug className="h-4 w-4" />
                      </button>
                    </span>
                  </>
                ) : activePhase === "inspection" ? (
                  <>
                    <span
                      className={`mx-auto inline-flex w-fit items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${cluster.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cluster.dot}`}
                      />
                      {cluster.label}
                    </span>
                    <span className="text-center text-[13px] font-black text-slate-800">
                      {rowData.representedCount || "0"}
                    </span>
                    <span className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleSelectGrid(row)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
                        title="Lihat titik inspeksi"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    </span>
                  </>
                ) : activePhase === "fase1" ? (
                  <>
                    <span className="text-center text-[13px] font-black text-slate-800">
                      {rowData.mean}
                    </span>
                    <span
                      className={`mx-auto inline-flex w-fit items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${cluster.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cluster.dot}`}
                      />
                      {cluster.label}
                    </span>
                    <span className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleSelectGrid(row)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
                        title="Lihat lokasi grid"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-center text-[13px] font-black text-slate-800">
                      {rowData.mean}
                    </span>
                    <span className="text-center text-[13px] font-black text-slate-800">
                      {rowData.co2}
                    </span>
                    <span
                      className={`mx-auto inline-flex w-fit items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${cluster.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cluster.dot}`}
                      />
                      {cluster.label}
                    </span>
                    <span className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleSelectGrid(row)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
                        title="Lihat lokasi grid"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    </span>
                  </>
                )}
              </div>
            );
          })
        )}
        {!isTableLoading && filteredRows.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] font-bold text-slate-700">
              {activePhase === "inspection"
                ? "Titik inspeksi tidak ditemukan"
                : "Grid tidak ditemukan"}
            </p>
            <p className="mt-1 text-[12px] font-medium text-slate-400">
              Coba kata kunci lain.
            </p>
          </div>
        )}
      </div>
      <div
        className={`shrink-0 rounded-b-2xl border-t border-slate-100 bg-white/95 px-4 py-2 ${
          sheetState === "collapsed" ? "sm:hidden" : ""
        }`}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <div className="flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-500">
            <span>Rows</span>
            <RowsPerPageSelect
              value={pageSize}
              onChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
              className="w-[72px]"
              placement="top"
            />
          </div>
          <span className="inline-flex justify-self-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
            {isTableLoading ? "..." : `${currentPage}/${totalPages}`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              title="Halaman pertama"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              title="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(totalPages)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              title="Halaman terakhir"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MapClickHandler({
  activeOverlays,
  selectedFeature,
}: {
  activeOverlays: OverlayType[];
  selectedFeature?: SelectedMapFeature | null;
}) {
  const [pos, setPos] = useState<L.LatLng | null>(null);
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showFase1Stats, setShowFase1Stats] = useState(true);
  const [showFase2NdviStats, setShowFase2NdviStats] = useState(true);
  const [showFase2SensorStats, setShowFase2SensorStats] = useState(true);
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (pos && markerRef.current) {
      const timer = setTimeout(() => {
        markerRef.current?.openPopup();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pos]);

  useEffect(() => {
    if (selectedFeature) {
      setPos(null);
      setAddress("");
    }
  }, [selectedFeature]);

  useMapEvents({
    click(e) {
      const target = e.originalEvent?.target as HTMLElement | null;
      if (
        target?.closest(".leaflet-control-container") ||
        target?.closest(".no-map-click") ||
        target?.closest(".leaflet-popup") ||
        target?.closest(".leaflet-interactive")
      ) {
        return;
      }

      setPos(e.latlng);
      setLoading(true);
      setAddress("Mencari informasi lokasi...");
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress("Tidak ada data lokasi di titik ini.");
          }
        })
        .catch(() => {
          setAddress("Gagal memuat alamat.");
        })
        .finally(() => {
          setLoading(false);
        });
    },
  });

  if (!pos) return null;

  const customMarkerIcon = new L.DivIcon({
    html: `<div class="relative flex flex-col items-center">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 4px rgba(0,0,0,0.4));">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4B7C63" />
            <stop offset="100%" stop-color="#2a4a39" />
          </linearGradient>
          <radialGradient id="highlight" cx="35%" cy="30%" r="45%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M16,0 C7.163,0 0,7.163 0,16 C0,24 16,40 16,40 C16,40 32,24 32,16 C32,7.163 24.837,0 16,0 Z" fill="url(#grad)" />
        <path d="M16,0 C7.163,0 0,7.163 0,16 C0,24 16,40 16,40 C16,40 32,24 32,16 C32,7.163 24.837,0 16,0 Z" fill="url(#highlight)" />
        <circle cx="16" cy="14" r="6" fill="#ffffff" />
      </svg>
      <div class="absolute -bottom-1.5 w-5 h-2 bg-black/30 blur-[2px] rounded-[100%] scale-y-50"></div>
    </div>`,
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  });

  return (
    <Marker position={pos} ref={markerRef} icon={customMarkerIcon}>
      <Popup closeButton={false} className="custom-popup" minWidth={320}>
        {loading ? (
          <div className="p-5 font-sans min-w-[320px] flex flex-col items-center justify-center min-h-[130px] gap-3 bg-white rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-[#4B7C63]" />
            <span className="text-[12px] font-medium text-gray-500">
              Loading...
            </span>
          </div>
        ) : (
          <div className="px-5 pb-1 pt-5 font-sans min-w-[320px] relative bg-white rounded-2xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPos(null);
                setAddress("");
              }}
              className="absolute right-5 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5 stroke-[3px]" />
            </button>

            {/* Additional info based on active overlays */}
            {activeOverlays.includes("fase1") && (
              <>
                <div className="mb-3 mt-1">
                  <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold uppercase tracking-widest text-[10px]">
                      <div className="bg-emerald-100/80 p-1.5 rounded-md shadow-sm">
                        <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      Fase 1: Data Awal
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] rounded-xl p-3 mb-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-50"></div>
                    <div className="flex justify-between items-end mb-3">
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                          Nilai NDVI
                        </p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-black text-3xl text-slate-300 tracking-tighter leading-none">
                            -
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                          Cluster Area
                        </p>
                        <div className="flex flex-col items-end gap-1">
                          <div className="px-2 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 bg-slate-50 text-slate-400 border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            -
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-50"></div>
                      <div className="absolute top-0 right-0 h-full w-full bg-slate-100 z-10"></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() => setShowFase1Stats((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50/60"
                      aria-expanded={showFase1Stats}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <Activity className="h-3.5 w-3.5" />
                        Statistik NDVI
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-emerald-700 transition-transform ${
                          showFase1Stats ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showFase1Stats && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                        {[
                          "Mean",
                          "Median",
                          "Min",
                          "P25",
                          "Max",
                          "P75",
                          "Stddev",
                          "Variance",
                        ].map((label) => (
                          <div
                            key={label}
                            className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {label}
                            </span>
                            <span className="text-[12px] font-black tabular-nums text-slate-400">
                              -
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[1px] w-full bg-gray-200 mb-3" />
              </>
            )}

            {activeOverlays.includes("fase2") && (
              <>
                <div className="mb-3 mt-1">
                  <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-widest text-[10px]">
                      <div className="bg-indigo-100/80 p-1.5 rounded-md shadow-sm">
                        <Beaker className="w-3.5 h-3.5 text-indigo-700" />
                      </div>
                      Fase 2: Analitik
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] rounded-xl p-3 mb-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-50"></div>
                    <div className="flex justify-between items-end mb-3">
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                          Nilai NDVI
                        </p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-black text-3xl text-slate-300 tracking-tighter leading-none">
                            -
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                          Cluster Area
                        </p>
                        <div className="flex flex-col items-end gap-1">
                          <div className="px-2 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 bg-slate-50 text-slate-400 border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            -
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-50"></div>
                      <div className="absolute top-0 right-0 h-full w-full bg-slate-100 z-10"></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70">
                      <button
                        type="button"
                        onClick={() =>
                          setShowFase2NdviStats((current) => !current)
                        }
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-emerald-50/60"
                        aria-expanded={showFase2NdviStats}
                      >
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Activity className="h-3.5 w-3.5" />
                          Statistik NDVI
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-emerald-700 transition-transform ${
                            showFase2NdviStats ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showFase2NdviStats && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                          {[
                            "Mean",
                            "Median",
                            "Min",
                            "P25",
                            "Max",
                            "P75",
                            "Stddev",
                            "Variance",
                          ].map((label) => (
                            <div
                              key={label}
                              className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {label}
                              </span>
                              <span className="text-[12px] font-black tabular-nums text-slate-400">
                                -
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70">
                      <button
                        type="button"
                        onClick={() =>
                          setShowFase2SensorStats((current) => !current)
                        }
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-sky-50/70"
                        aria-expanded={showFase2SensorStats}
                      >
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                          <ThermometerSun className="h-3.5 w-3.5" />
                          Sensor Lingkungan
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-sky-700 transition-transform ${
                            showFase2SensorStats ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showFase2SensorStats && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 pb-2 pt-1.5">
                          {["Suhu", "Humidity", "CO2", "NH3", "CO", "NO2"].map(
                            (label) => (
                              <div
                                key={label}
                                className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-1 last:border-b-0 [&:nth-last-child(2)]:border-b-0"
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {label}
                                </span>
                                <span className="text-[12px] font-black tabular-nums text-slate-400">
                                  -
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-gray-200 mb-3" />
              </>
            )}

            <div
              className={`mb-4 ${!activeOverlays.includes("fase1") && !activeOverlays.includes("fase2") ? "pr-6" : ""}`}
            >
              <div className="flex items-center gap-1 text-[#4B7C63] font-bold uppercase tracking-widest text-[9px]">
                <MapPin className="w-3 h-3" /> Lokasi
              </div>
              <p
                className="text-[12px] font-bold text-gray-900 leading-[1.4] m-0"
                style={{ marginTop: "3px" }}
              >
                {address}
              </p>
            </div>

            <div className="h-[1px] w-full bg-gray-200 mb-3" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[#4B7C63] font-bold uppercase tracking-widest text-[9px]">
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-current flex items-center justify-center">
                    <div className="w-2 h-[1.5px] bg-current" />
                  </div>
                  LAT
                </div>
                <p
                  className="font-extrabold text-gray-900 text-[12px] leading-tight m-0"
                  style={{ marginTop: "1px" }}
                >
                  {pos.lat.toFixed(6)}
                </p>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[#4B7C63] font-bold uppercase tracking-widest text-[9px]">
                  <div className="w-3 h-3 rounded-full border-[1.5px] border-current flex items-center justify-center">
                    <div className="w-2 h-[1.5px] bg-current rotate-90" />
                  </div>
                  LONG
                </div>
                <p
                  className="font-extrabold text-gray-900 text-[12px] leading-tight m-0"
                  style={{ marginTop: "1px" }}
                >
                  {pos.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Popup>
    </Marker>
  );
}

function getImageLayerBounds(layer: MapImageLayer): L.LatLngBoundsExpression {
  return [
    [layer.bounds.minLat, layer.bounds.minLng],
    [layer.bounds.maxLat, layer.bounds.maxLng],
  ];
}

function RotatedImageOverlay({
  layer,
  opacity,
}: {
  layer: MapImageLayer;
  opacity: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!layer.corners) {
      return;
    }

    const image = document.createElement("img");
    image.src = layer.url;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    image.style.position = "absolute";
    image.style.left = "0";
    image.style.top = "0";
    image.style.display = "block";
    image.style.maxWidth = "none";
    image.style.maxHeight = "none";
    image.style.opacity = String(opacity);
    image.style.transformOrigin = "0 0";
    image.style.pointerEvents = "none";
    image.style.willChange = "transform";
    image.style.zIndex = "1";

    const pane = map.getPanes().overlayPane;
    pane.appendChild(image);

    const update = () => {
      const imageWidth = image.naturalWidth || 1;
      const imageHeight = image.naturalHeight || 1;
      const topLeft = map.latLngToLayerPoint([
        layer.corners!.topLeft.lat,
        layer.corners!.topLeft.lng,
      ]);
      const topRight = map.latLngToLayerPoint([
        layer.corners!.topRight.lat,
        layer.corners!.topRight.lng,
      ]);
      const bottomLeft = map.latLngToLayerPoint([
        layer.corners!.bottomLeft.lat,
        layer.corners!.bottomLeft.lng,
      ]);
      const xAxis = topRight.subtract(topLeft);
      const yAxis = bottomLeft.subtract(topLeft);

      image.style.width = `${imageWidth}px`;
      image.style.height = `${imageHeight}px`;
      image.style.transform = `matrix(${xAxis.x / imageWidth}, ${
        xAxis.y / imageWidth
      }, ${yAxis.x / imageHeight}, ${yAxis.y / imageHeight}, ${topLeft.x}, ${
        topLeft.y
      })`;
    };

    image.addEventListener("load", update);
    map.on("move zoom viewreset resize zoomend moveend", update);
    update();

    return () => {
      image.removeEventListener("load", update);
      map.off("move zoom viewreset resize zoomend moveend", update);
      image.remove();
    };
  }, [layer, map, opacity]);

  return null;
}

function LahanImageOverlays({
  layers,
  activeOverlays,
}: {
  layers: Partial<Record<ImageLayerType, MapImageLayer>>;
  activeOverlays: OverlayType[];
}) {
  const map = useMap();
  const rgbLayer = layers.rgb;
  const ndviLayer = layers.ndvi;
  const rgbBounds = rgbLayer ? getImageLayerBounds(rgbLayer) : null;
  const ndviBounds = ndviLayer ? getImageLayerBounds(ndviLayer) : null;

  useEffect(() => {
    const activeBounds =
      activeOverlays.includes("ndvi") && ndviBounds
        ? ndviBounds
        : activeOverlays.includes("rgb") && rgbBounds
          ? rgbBounds
          : null;

    if (activeBounds) {
      map.fitBounds(activeBounds, { padding: [40, 40], animate: true });
    }
  }, [activeOverlays, map, ndviBounds, rgbBounds]);

  return (
    <>
      {activeOverlays.includes("rgb") &&
        rgbLayer &&
        rgbBounds &&
        (rgbLayer.corners ? (
          <RotatedImageOverlay layer={rgbLayer} opacity={0.78} />
        ) : (
          <ImageOverlay url={rgbLayer.url} bounds={rgbBounds} opacity={0.78} />
        ))}
      {activeOverlays.includes("ndvi") &&
        ndviLayer &&
        ndviBounds &&
        (ndviLayer.corners ? (
          <RotatedImageOverlay layer={ndviLayer} opacity={0.74} />
        ) : (
          <ImageOverlay
            url={ndviLayer.url}
            bounds={ndviBounds}
            opacity={0.74}
          />
        ))}
    </>
  );
}

function getInspectionMarkerTone(clusterLabel?: string | null) {
  if (clusterLabel === "merah") {
    return { bg: "#e11d48", ring: "rgba(225,29,72,0.22)" };
  }

  if (clusterLabel === "kuning") {
    return { bg: "#d97706", ring: "rgba(217,119,6,0.22)" };
  }

  return { bg: "#059669", ring: "rgba(5,150,105,0.22)" };
}

function InspectionPointMarkers({
  mapData,
  activeOverlays,
  onSelectFeature,
}: {
  mapData?: LahanMapData | null;
  activeOverlays: OverlayType[];
  onSelectFeature: (feature: SelectedMapFeature) => void;
}) {
  const map = useMap();
  const shouldRender =
    Boolean(mapData) && activeOverlays.includes("inspection");

  useEffect(() => {
    if (!mapData || !shouldRender) {
      return;
    }

    map.fitBounds(
      [
        [mapData.lahan.bounds.minLat, mapData.lahan.bounds.minLng],
        [mapData.lahan.bounds.maxLat, mapData.lahan.bounds.maxLng],
      ],
      { padding: [40, 40], animate: true },
    );
  }, [map, mapData, shouldRender]);

  if (!mapData || !activeOverlays.includes("inspection")) {
    return null;
  }

  return (
    <>
      {mapData.inspectionPoints.map((point) => {
        const tone = getInspectionMarkerTone(point.clusterLabel);
        const row = toInspectionTableRow(point);
        const icon = new L.DivIcon({
          html: `<div class="relative flex h-11 w-11 items-center justify-center">
            <div class="absolute h-11 w-11 rounded-full" style="background:${tone.ring}"></div>
            <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-black text-white shadow-[0_8px_18px_rgba(15,23,42,0.28)]" style="background:${tone.bg}">
              ${point.pointCode}
            </div>
          </div>`,
          className: "",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        return (
          <Marker
            key={`inspection-${point.pointCode}`}
            position={[point.inspectionLat, point.inspectionLng]}
            icon={icon}
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event.originalEvent);
                onSelectFeature({
                  id: point.pointCode,
                  mode: "inspection",
                  coordinates: row.coordinates,
                  data: row,
                });
              },
            }}
          />
        );
      })}
    </>
  );
}

function LahanGridRectangles({
  mapData,
  activeOverlays,
  selectedFeature,
  onSelectFeature,
}: {
  mapData?: LahanMapData | null;
  activeOverlays: OverlayType[];
  selectedFeature?: SelectedMapFeature | null;
  onSelectFeature: (feature: SelectedMapFeature) => void;
}) {
  const map = useMap();
  const shouldRender =
    Boolean(mapData) &&
    (activeOverlays.includes("fase1") || activeOverlays.includes("fase2"));

  useEffect(() => {
    if (!mapData || !shouldRender) {
      return;
    }

    map.fitBounds(
      [
        [mapData.lahan.bounds.minLat, mapData.lahan.bounds.minLng],
        [mapData.lahan.bounds.maxLat, mapData.lahan.bounds.maxLng],
      ],
      { padding: [40, 40], animate: true },
    );
  }, [map, mapData, shouldRender]);

  if (
    !mapData ||
    (!activeOverlays.includes("fase1") && !activeOverlays.includes("fase2"))
  ) {
    return null;
  }

  const mode = activeOverlays.includes("fase2") ? "fase2-ndvi" : "fase1";
  const hasImageOverlay =
    activeOverlays.includes("rgb") || activeOverlays.includes("ndvi");

  return (
    <>
      {mapData.grids.map((grid) => {
        const style = getGridRectangleStyle(
          grid.ndvi?.clusterLabel,
          grid.ndvi?.gridColor,
          grid.ndvi?.isPlant,
        );
        const row = toNdviTableRow(grid);
        const isRepresentedBySelectedInspection =
          selectedFeature?.mode === "inspection" &&
          Array.isArray(selectedFeature.data?.raw?.representativeGridCodes) &&
          selectedFeature.data.raw.representativeGridCodes.includes(
            grid.gridCode,
          );

        return (
          <Polygon
            key={`${mode}-${grid.gridId}`}
            positions={[
              [grid.corners.topLeft.lat, grid.corners.topLeft.lng],
              [grid.corners.topRight.lat, grid.corners.topRight.lng],
              [grid.corners.bottomRight.lat, grid.corners.bottomRight.lng],
              [grid.corners.bottomLeft.lat, grid.corners.bottomLeft.lng],
            ]}
            pathOptions={{
              color: style.color,
              weight: isRepresentedBySelectedInspection ? 3 : 1,
              opacity: isRepresentedBySelectedInspection ? 1 : 0.85,
              fillColor: style.fillColor,
              fillOpacity: isRepresentedBySelectedInspection
                ? 0.36
                : hasImageOverlay
                  ? 0.12
                  : 0.22,
              bubblingMouseEvents: false,
            }}
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event.originalEvent);
                onSelectFeature({
                  id: row.grid,
                  mode,
                  coordinates: row.coordinates,
                  data: row,
                });
              },
            }}
          />
        );
      })}
    </>
  );
}

type SensorModalTarget = {
  pointCode: string;
  mode: "create" | "edit";
  readingId?: string;
  initialValues?: SensorFormValues;
};

type SensorFormValues = {
  temperatureC: string;
  humidityPct: string;
  co2Ppm: string;
  nh3Ppm: string;
  coPpm: string;
  no2Ppm: string;
};

const emptySensorForm: SensorFormValues = {
  temperatureC: "",
  humidityPct: "",
  co2Ppm: "",
  nh3Ppm: "",
  coPpm: "",
  no2Ppm: "",
};

function sensorReadingToFormValues(
  reading: MapSensorReading,
): SensorFormValues {
  return {
    temperatureC:
      reading.temperatureC === null || reading.temperatureC === undefined
        ? ""
        : reading.temperatureC.toString(),
    humidityPct:
      reading.humidityPct === null || reading.humidityPct === undefined
        ? ""
        : reading.humidityPct.toString(),
    co2Ppm:
      reading.co2Ppm === null || reading.co2Ppm === undefined
        ? ""
        : reading.co2Ppm.toString(),
    nh3Ppm:
      reading.nh3Ppm === null || reading.nh3Ppm === undefined
        ? ""
        : reading.nh3Ppm.toString(),
    coPpm:
      reading.coPpm === null || reading.coPpm === undefined
        ? ""
        : reading.coPpm.toString(),
    no2Ppm:
      reading.no2Ppm === null || reading.no2Ppm === undefined
        ? ""
        : reading.no2Ppm.toString(),
  };
}

function parseSensorNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSensorRecordedAt(value?: string | null) {
  if (!value) {
    return "Belum ada data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Belum ada data";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(" pukul ", " ");
}

function formatSensorNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return Number(value.toFixed(digits)).toString();
}

function SensorReadingModal({
  target,
  isSaving,
  error,
  onClose,
  onSubmit,
  onDelete,
}: {
  target: SensorModalTarget | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: SensorFormValues) => Promise<void>;
  onDelete: () => void;
}) {
  const [values, setValues] = useState<SensorFormValues>(emptySensorForm);

  useEffect(() => {
    if (target) {
      setValues(target.initialValues ?? emptySensorForm);
    }
  }, [target]);

  if (!target) {
    return null;
  }

  const fields: Array<{
    key: keyof SensorFormValues;
    label: string;
    unit: string;
    step: string;
  }> = [
    { key: "temperatureC", label: "Suhu", unit: "C", step: "0.1" },
    { key: "humidityPct", label: "Humidity", unit: "%", step: "0.1" },
    { key: "co2Ppm", label: "CO2", unit: "ppm", step: "0.1" },
    { key: "nh3Ppm", label: "NH3", unit: "ppm", step: "0.001" },
    { key: "coPpm", label: "CO", unit: "ppm", step: "0.001" },
    { key: "no2Ppm", label: "NO2", unit: "ppm", step: "0.001" },
  ];

  const hasAnyValue = Object.values(values).some((value) => value.trim());
  const isEditMode = target.mode === "edit";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">
              {isEditMode ? "Edit Sensor" : "Catat Sensor"}
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Titik {target.pointCode}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[78vh] overflow-y-auto px-5 py-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
              <label key={field.key} className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {field.label}
                </span>
                <div className="mt-1 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-300 focus-within:bg-white">
                  <input
                    value={values[field.key]}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    type="number"
                    inputMode="decimal"
                    step={field.step}
                    className="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-900 outline-none [appearance:textfield] sm:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">
                    {field.unit}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            {isEditMode && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving}
                className="mr-auto flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-[12px] font-black uppercase tracking-wider text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-[12px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !hasAnyValue}
              className="flex h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-[12px] font-black uppercase tracking-wider text-white shadow-[0_10px_22px_rgba(2,132,199,0.24)] transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MapUI({
  selectedFeature,
  onCloseFeature,
}: MapUIProps = {}) {
  const queryClient = useQueryClient();
  const [baseLayer, setBaseLayer] = useState<MapType>("satellite");
  const [activeOverlays, setActiveOverlays] = useState<OverlayType[]>([]);
  const [selectedLahanId, setSelectedLahanId] = useState<string | null>(null);
  const [panelSelectedFeature, setPanelSelectedFeature] =
    useState<SelectedMapFeature | null>(null);
  const [sensorModalTarget, setSensorModalTarget] =
    useState<SensorModalTarget | null>(null);
  const [sensorModalError, setSensorModalError] = useState<string | null>(null);
  const [isSavingSensor, setIsSavingSensor] = useState(false);
  const [showDeleteSensorConfirm, setShowDeleteSensorConfirm] = useState(false);
  const focusedFeature = panelSelectedFeature ?? selectedFeature;
  const shouldLoadMapData =
    Boolean(selectedLahanId) &&
    (activeOverlays.length > 0 || Boolean(focusedFeature));
  const lahanQuery = useQuery({
    queryKey: ["lahan"],
    queryFn: fetchLahan,
    staleTime: 5 * 60 * 1000,
  });
  const mapDataQuery = useQuery({
    queryKey: ["map-data", selectedLahanId],
    queryFn: () => fetchLahanMapData(selectedLahanId as string),
    enabled: shouldLoadMapData,
    staleTime: 60 * 1000,
  });
  const lahanOptions = lahanQuery.data ?? [];
  const selectedLahan =
    lahanOptions.find((option) => option.id === selectedLahanId) ?? null;
  const imageLayers = {
    rgb: mapDataQuery.data?.layers.rgb ?? undefined,
    ndvi: mapDataQuery.data?.layers.ndvi ?? undefined,
  };
  const activeInspectionPointCode =
    focusedFeature?.mode === "inspection"
      ? focusedFeature.data?.raw && "pointCode" in focusedFeature.data.raw
        ? focusedFeature.data.raw.pointCode
        : focusedFeature.id
      : null;
  const activeCaptureId = mapDataQuery.data?.lahan.captureId ?? null;

  useEffect(() => {
    if (selectedLahanId || lahanOptions.length === 0) {
      return;
    }

    const savedLahanId = window.localStorage.getItem("selectedLahanId");
    const savedOption = lahanOptions.find(
      (option) => option.id === savedLahanId,
    );
    setSelectedLahanId((savedOption ?? lahanOptions[0]).id);
  }, [lahanOptions, selectedLahanId]);

  useEffect(() => {
    if (!selectedFeature || selectedFeature.mode === "default") {
      return;
    }

    const requiredOverlay =
      selectedFeature.mode === "fase1"
        ? "fase1"
        : selectedFeature.mode === "inspection"
          ? "inspection"
          : selectedFeature.mode === "fase2-hama"
            ? "hama"
            : "fase2";

    setActiveOverlays((current) =>
      current.includes(requiredOverlay)
        ? current
        : [...current, requiredOverlay],
    );
  }, [selectedFeature]);

  useEffect(() => {
    if (!panelSelectedFeature) {
      return;
    }

    const requiredOverlay =
      panelSelectedFeature.mode === "fase1"
        ? "fase1"
        : panelSelectedFeature.mode === "inspection"
          ? "inspection"
          : panelSelectedFeature.mode === "fase2-hama"
            ? "hama"
            : "fase2";

    if (!activeOverlays.includes(requiredOverlay)) {
      setPanelSelectedFeature(null);
    }
  }, [activeOverlays, panelSelectedFeature]);

  useEffect(() => {
    if (
      !selectedLahanId ||
      !activeCaptureId ||
      !activeInspectionPointCode ||
      !canUseFirebaseLahanService()
    ) {
      return;
    }

    const unsubscribe = subscribeSensorReadings(
      selectedLahanId,
      activeCaptureId,
      activeInspectionPointCode,
      (readings) => {
        const sensorReadings = readings
          .map(toMapSensorReading)
          .filter((reading): reading is MapSensorReading => Boolean(reading));
        const latestSensor = sensorReadings[0] ?? null;
        const queryKey = ["map-data", selectedLahanId] as const;
        const currentMapData = queryClient.getQueryData<LahanMapData>(queryKey);
        const currentPoint = currentMapData?.inspectionPoints.find(
          (point) => point.pointCode === activeInspectionPointCode,
        );

        if (!currentPoint) {
          return;
        }

        const updatedPoint: MapInspectionPoint = {
          ...currentPoint,
          latestSensor,
          sensorReadings,
        };

        queryClient.setQueryData<LahanMapData>(queryKey, (current) => {
          if (!current) {
            return current;
          }

          const inspectionPoints = current.inspectionPoints.map((point) => {
            if (point.pointCode !== activeInspectionPointCode) {
              return point;
            }

            return updatedPoint;
          });

          const representedGridCodes = new Set(
            updatedPoint.representativeGridCodes,
          );
          const grids = current.grids.map((grid) =>
            representedGridCodes.has(grid.gridCode)
              ? { ...grid, sensor: latestSensor }
              : grid,
          );

          return {
            ...current,
            grids,
            inspectionPoints,
          };
        });

        const row = toInspectionTableRow(updatedPoint);

        setPanelSelectedFeature({
          id: updatedPoint.pointCode,
          mode: "inspection",
          coordinates: row.coordinates,
          data: row,
        });
      },
      (error) => {
        console.error("Sensor realtime subscription error:", error);
      },
    );

    return () => unsubscribe();
  }, [
    activeCaptureId,
    activeInspectionPointCode,
    queryClient,
    selectedLahanId,
  ]);

  const toggleOverlay = (id: OverlayType) => {
    setActiveOverlays((prev) => {
      const isActive = prev.includes(id);

      return isActive ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const handleSelectLahan = (option: LahanOption) => {
    setSelectedLahanId(option.id);
    window.localStorage.setItem("selectedLahanId", option.id);
    setPanelSelectedFeature(null);
    setSensorModalTarget(null);
  };

  const handleOpenSensorModal = (
    feature: SelectedMapFeature,
    reading?: MapSensorReading,
  ) => {
    const point = feature.data?.raw;

    setSensorModalError(null);
    setShowDeleteSensorConfirm(false);
    setSensorModalTarget({
      pointCode: point?.pointCode ?? feature.id,
      mode: reading ? "edit" : "create",
      readingId: reading?.readingId,
      initialValues: reading ? sensorReadingToFormValues(reading) : undefined,
    });
  };

  const handleSubmitSensorReading = async (values: SensorFormValues) => {
    if (
      !sensorModalTarget ||
      !selectedLahanId ||
      !mapDataQuery.data?.lahan.captureId
    ) {
      setSensorModalError("Data titik inspeksi belum lengkap.");
      return;
    }

    const payload = {
      pointCode: sensorModalTarget.pointCode,
      temperatureC: parseSensorNumber(values.temperatureC),
      humidityPct: parseSensorNumber(values.humidityPct),
      co2Ppm: parseSensorNumber(values.co2Ppm),
      nh3Ppm: parseSensorNumber(values.nh3Ppm),
      coPpm: parseSensorNumber(values.coPpm),
      no2Ppm: parseSensorNumber(values.no2Ppm),
    };

    const hasAnySensorValue = [
      payload.temperatureC,
      payload.humidityPct,
      payload.co2Ppm,
      payload.nh3Ppm,
      payload.coPpm,
      payload.no2Ppm,
    ].some((value) => value !== null);

    if (!hasAnySensorValue) {
      setSensorModalError("Isi minimal satu nilai sensor dulu.");
      return;
    }

    setIsSavingSensor(true);
    setSensorModalError(null);

    try {
      if (sensorModalTarget.mode === "edit" && sensorModalTarget.readingId) {
        await updateSensorReading(
          selectedLahanId,
          mapDataQuery.data.lahan.captureId,
          sensorModalTarget.pointCode,
          sensorModalTarget.readingId,
          {
            temperatureC: payload.temperatureC,
            humidityPct: payload.humidityPct,
            co2Ppm: payload.co2Ppm,
            nh3Ppm: payload.nh3Ppm,
            coPpm: payload.coPpm,
            no2Ppm: payload.no2Ppm,
          },
        );
      } else {
        await addSensorReading(
          selectedLahanId,
          mapDataQuery.data.lahan.captureId,
          payload,
        );
      }

      setSensorModalTarget(null);
    } catch {
      setSensorModalError("Gagal menyimpan data sensor.");
    } finally {
      setIsSavingSensor(false);
    }
  };

  const handleDeleteSensorReading = async () => {
    if (
      !sensorModalTarget ||
      sensorModalTarget.mode !== "edit" ||
      !sensorModalTarget.readingId ||
      !selectedLahanId ||
      !mapDataQuery.data?.lahan.captureId
    ) {
      setSensorModalError("Data sensor belum lengkap.");
      return;
    }

    setIsSavingSensor(true);
    setSensorModalError(null);

    try {
      await deleteSensorReading(
        selectedLahanId,
        mapDataQuery.data.lahan.captureId,
        sensorModalTarget.pointCode,
        sensorModalTarget.readingId,
      );
      setShowDeleteSensorConfirm(false);
      setSensorModalTarget(null);
    } catch {
      setSensorModalError("Gagal menghapus data sensor.");
    } finally {
      setIsSavingSensor(false);
    }
  };

  const handleRequestDeleteSensorReading = () => {
    setSensorModalError(null);
    setShowDeleteSensorConfirm(true);
  };

  return (
    <div className="absolute inset-0 w-full h-full z-[0] pointer-events-auto">
      <MapContainer
        center={[-2.5489, 118.0149]} // Centered on Indonesia
        zoom={5}
        maxZoom={24}
        zoomControl={false}
        className="h-full w-full pb-[72dvh] sm:pb-0"
      >
        <MapResizer />
        {focusedFeature && (
          <SelectedFeatureMarker
            feature={focusedFeature}
            onOpenSensorModal={handleOpenSensorModal}
            onClose={() => {
              if (panelSelectedFeature) {
                setPanelSelectedFeature(null);
                return;
              }

              onCloseFeature?.();
            }}
          />
        )}

        <LahanGridRectangles
          mapData={mapDataQuery.data}
          activeOverlays={activeOverlays}
          selectedFeature={focusedFeature}
          onSelectFeature={setPanelSelectedFeature}
        />
        <InspectionPointMarkers
          mapData={mapDataQuery.data}
          activeOverlays={activeOverlays}
          onSelectFeature={setPanelSelectedFeature}
        />
        {activeOverlays.includes("hama") &&
          mapDataQuery.data?.hama.map((item) => {
            const row = toHamaTableRow(item);

            return (
              <SelectedFeatureMarker
                key={`hama-${item.id}`}
                feature={{
                  id: row.grid,
                  mode: "fase2-hama" as const,
                  coordinates: row.coordinates,
                  data: row,
                }}
                onClose={() => {}}
                onOpenSensorModal={handleOpenSensorModal}
                autoFocus={false}
              />
            );
          })}

        <MapClickHandler
          activeOverlays={activeOverlays}
          selectedFeature={focusedFeature}
        />
        <LahanImageOverlays
          layers={imageLayers}
          activeOverlays={activeOverlays}
        />
        <ZoomControl position="topright" />
        <MapSearchOverlay />
        <LocateUserButton />

        <CustomLayerControl
          baseLayer={baseLayer}
          setBaseLayer={setBaseLayer}
          activeOverlays={activeOverlays}
          toggleOverlay={toggleOverlay}
        />

        {baseLayer === "default" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxNativeZoom={19}
            maxZoom={24}
          />
        )}

        {baseLayer === "satellite" && (
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={24}
          />
        )}

        {baseLayer === "terrain" && (
          <TileLayer
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxNativeZoom={17}
            maxZoom={24}
          />
        )}
      </MapContainer>

      <LayerDataPanel
        activeOverlays={activeOverlays}
        lahanOptions={lahanOptions}
        selectedLahan={selectedLahan}
        mapData={mapDataQuery.data}
        isMapDataLoading={mapDataQuery.isLoading}
        selectedFeature={focusedFeature}
        onSelectLahan={handleSelectLahan}
        onSelectFeature={setPanelSelectedFeature}
        onCloseLayer={toggleOverlay}
      />
      <SensorReadingModal
        target={sensorModalTarget}
        isSaving={isSavingSensor}
        error={sensorModalError}
        onClose={() => {
          if (isSavingSensor) {
            return;
          }

          setShowDeleteSensorConfirm(false);
          setSensorModalTarget(null);
          setSensorModalError(null);
        }}
        onSubmit={handleSubmitSensorReading}
        onDelete={handleRequestDeleteSensorReading}
      />
      {showDeleteSensorConfirm && sensorModalTarget?.mode === "edit" && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                Hapus Sensor
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">
                Hapus data sensor ini?
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Data reading yang dipilih akan dihapus dari riwayat titik{" "}
                {sensorModalTarget.pointCode}.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowDeleteSensorConfirm(false)}
                disabled={isSavingSensor}
                className="h-10 rounded-xl px-4 text-[12px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSensorReading}
                disabled={isSavingSensor}
                className="flex h-10 items-center gap-2 rounded-xl bg-rose-700 px-4 text-[12px] font-black uppercase tracking-wider text-white shadow-[0_10px_22px_rgba(190,18,60,0.22)] transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSavingSensor && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
