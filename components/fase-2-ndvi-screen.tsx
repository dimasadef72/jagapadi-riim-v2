"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Beaker,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  Grid3X3,
  MapPin,
  Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import FilterSelect from "./filter-select";
import LahanSelector from "./lahan-selector";
import {
  fetchLahan,
  fetchLahanMapData,
  getGridRectangleStyle,
  type MapGrid,
  type PhaseTableRow,
  toNdviTableRow,
} from "./map-api";
import RowsPerPageSelect from "./rows-per-page-select";
import type { SelectedMapFeature } from "./types";

interface Fase2NdviScreenProps {
  onNavigateToMap: (feature: SelectedMapFeature) => void;
}

type SortKey =
  | "mean"
  | "min"
  | "max"
  | "stddev"
  | "median"
  | "variance"
  | "p25"
  | "p50"
  | "p75"
  | "co2"
  | "nh3"
  | "co"
  | "no2"
  | "temp"
  | "humidity"
  | "nitrogen"
  | "phosphorus"
  | "potassium"
  | "ec"
  | "temp7In1"
  | "humidity7In1"
  | "ph"
  | "cluster";
type SortDirection = "asc" | "desc";

function numericValue(value: string | undefined) {
  return Number(String(value ?? "").replace("%", "")) || 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function getClusterLabel(cluster: string | undefined) {
  const normalized = (cluster || "").toLowerCase();

  if (!cluster) return "-";
  if (
    normalized.includes("non-tanaman") ||
    normalized.includes("non tanaman") ||
    normalized.includes("non-plant")
  ) {
    return "Non-Tanaman";
  }
  if (normalized.includes("kritis")) return "Kritis";
  if (normalized.includes("stres") || normalized.includes("stress")) return "Stres";
  if (normalized.includes("sedang")) return "Sedang";
  if (normalized.includes("cukup")) return "Cukup";
  if (normalized.includes("sehat")) return "Sehat";
  if (normalized.includes("merah") || normalized.includes("red")) return "Merah";
  if (normalized.includes("kuning") || normalized.includes("yellow")) return "Kuning";
  if (normalized.includes("hijau") || normalized.includes("green")) return "Hijau";

  return cluster.trim();
}

function getClusterClass(cluster: string | undefined) {
  const normalized = getClusterLabel(cluster).toLowerCase();

  if (normalized === "-") return "bg-slate-50 text-slate-500 border-slate-100";
  if (normalized.includes("non-tanaman"))
    return "bg-slate-50 text-slate-600 border-slate-200";
  if (normalized.includes("kritis") || normalized.includes("merah"))
    return "bg-rose-50 text-rose-700 border-rose-100";
  if (normalized.includes("stres"))
    return "bg-orange-50 text-orange-700 border-orange-100";
  if (normalized.includes("sedang") || normalized.includes("kuning"))
    return "bg-amber-50 text-amber-700 border-amber-100";
  if (normalized.includes("cukup"))
    return "bg-lime-50 text-lime-700 border-lime-100";

  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

function getClusterSortRank(cluster: string) {
  const normalized = cluster.toLowerCase();

  if (normalized.includes("non-tanaman")) return 0;
  if (normalized.includes("kritis") || normalized.includes("merah")) return 1;
  if (normalized.includes("stres")) return 2;
  if (normalized.includes("sedang") || normalized.includes("kuning")) return 3;
  if (normalized.includes("cukup")) return 4;
  if (normalized.includes("sehat") || normalized.includes("hijau")) return 5;

  return 99;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getGridSwatchStyle(row: PhaseTableRow) {
  const grid = row.raw as MapGrid;
  const style = getGridRectangleStyle(grid.ndvi?.gridColor);

  return {
    backgroundColor: hexToRgba(style.fillColor, 0.18),
    borderColor: style.color,
  };
}

function formatSensorValue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return value.toString();
}

function formatXlsxValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "-") return "";

  return value;
}

function getGrid(row: PhaseTableRow) {
  return row.raw as MapGrid;
}

function toXlsxRecord(row: PhaseTableRow) {
  const grid = getGrid(row);
  const sensor = grid.sensor;
  const sensor7In1 = grid.latestSensor7In1;

  return [
    row.grid,
    row.coordinates[1],
    row.coordinates[0],
    formatXlsxValue(row.mean),
    formatXlsxValue(row.min),
    formatXlsxValue(row.max),
    formatXlsxValue(row.stddev),
    formatXlsxValue(row.median),
    formatXlsxValue(row.variance),
    formatXlsxValue(row.p25),
    formatXlsxValue(row.p50),
    formatXlsxValue(row.p75),
    formatXlsxValue(sensor?.temperatureC),
    formatXlsxValue(sensor?.humidityPct),
    formatXlsxValue(sensor?.co2Ppm),
    formatXlsxValue(sensor?.nh3Ppm),
    formatXlsxValue(sensor?.coPpm),
    formatXlsxValue(sensor?.no2Ppm),
    formatXlsxValue(sensor7In1?.nitrogenPpm),
    formatXlsxValue(sensor7In1?.phosphorusPpm),
    formatXlsxValue(sensor7In1?.potassiumPpm),
    formatXlsxValue(sensor7In1?.ecDsM),
    formatXlsxValue(sensor7In1?.temperatureC),
    formatXlsxValue(sensor7In1?.humidityPct),
    formatXlsxValue(sensor7In1?.ph),
    getClusterLabel(row.cluster),
  ];
}

function getSortValue(row: PhaseTableRow, key: SortKey) {
  const grid = getGrid(row);

  if (key === "cluster") {
    return getClusterLabel(row.cluster);
  }

  const ndviSortValues: Partial<Record<SortKey, string | undefined>> = {
    mean: row.mean,
    min: row.min,
    max: row.max,
    stddev: row.stddev,
    median: row.median,
    variance: row.variance,
    p25: row.p25,
    p50: row.p50,
    p75: row.p75,
  };

  const sensor7In1 = grid.latestSensor7In1;
  const sensorSortValues: Partial<Record<SortKey, number | null | undefined>> = {
    co2: grid.sensor?.co2Ppm,
    nh3: grid.sensor?.nh3Ppm,
    co: grid.sensor?.coPpm,
    no2: grid.sensor?.no2Ppm,
    temp: grid.sensor?.temperatureC,
    humidity: grid.sensor?.humidityPct,
    nitrogen: sensor7In1?.nitrogenPpm,
    phosphorus: sensor7In1?.phosphorusPpm,
    potassium: sensor7In1?.potassiumPpm,
    ec: sensor7In1?.ecDsM,
    temp7In1: sensor7In1?.temperatureC,
    humidity7In1: sensor7In1?.humidityPct,
    ph: sensor7In1?.ph,
  };

  if (key in sensorSortValues) {
    return sensorSortValues[key] ?? Number.NEGATIVE_INFINITY;
  }

  return numericValue(ndviSortValues[key]);
}

export default function Fase2NdviScreen({
  onNavigateToMap,
}: Fase2NdviScreenProps) {
  const [query, setQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState("semua");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedLahanId, setSelectedLahanId] = useState<string | null>(null);
  const lahanQuery = useQuery({
    queryKey: ["lahan"],
    queryFn: fetchLahan,
    staleTime: 5 * 60 * 1000,
  });
  const mapDataQuery = useQuery({
    queryKey: ["map-data", selectedLahanId],
    queryFn: () => fetchLahanMapData(selectedLahanId as string),
    enabled: Boolean(selectedLahanId),
    staleTime: 60 * 1000,
  });
  const lahanOptions = lahanQuery.data ?? [];
  const selectedLahanOption =
    lahanOptions.find((option) => option.id === selectedLahanId) ??
    lahanOptions[0] ??
    null;
  const selectedLahan = mapDataQuery.data?.lahan;
  const rows = useMemo(
    () => mapDataQuery.data?.grids.map(toNdviTableRow) ?? [],
    [mapDataQuery.data],
  );
  const clusterOptions = useMemo(() => {
    const options = new Map<string, string>();

    rows.forEach((row) => {
      const label = getClusterLabel(row.cluster);
      const value = label.toLowerCase();

      if (label !== "-" && !options.has(value)) {
        options.set(value, label);
      }
    });

    return Array.from(options, ([value, label]) => ({ value, label })).sort(
      (a, b) =>
        getClusterSortRank(a.label) - getClusterSortRank(b.label) ||
        a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
  }, [rows]);

  useEffect(() => {
    if (selectedLahanId || lahanOptions.length === 0) {
      return;
    }

    const savedLahanId = window.localStorage.getItem("selectedLahanId");
    const savedOption = lahanOptions.find((option) => option.id === savedLahanId);
    setSelectedLahanId((savedOption ?? lahanOptions[0]).id);
  }, [lahanOptions, selectedLahanId]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const cluster = getClusterLabel(row.cluster).toLowerCase();
      const grid = getGrid(row);
      const sensor = grid.sensor;
      const sensor7In1 = grid.latestSensor7In1;
      const searchableText = [
        row.grid,
        row.coordinates[1],
        row.coordinates[0],
        row.mean,
        row.min,
        row.max,
        row.stddev,
        row.median,
        row.variance,
        row.p25,
        row.p50,
        row.p75,
        sensor?.temperatureC,
        sensor?.humidityPct,
        sensor?.co2Ppm,
        sensor?.nh3Ppm,
        sensor?.coPpm,
        sensor?.no2Ppm,
        sensor7In1?.nitrogenPpm,
        sensor7In1?.phosphorusPpm,
        sensor7In1?.potassiumPpm,
        sensor7In1?.ecDsM,
        sensor7In1?.temperatureC,
        sensor7In1?.humidityPct,
        sensor7In1?.ph,
        getClusterLabel(row.cluster),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (clusterFilter === "semua" || cluster === clusterFilter)
      );
    });

    return [...filtered].sort((a, b) => {
      if (!sortKey) return a.grid.localeCompare(b.grid);

      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      const sortValue =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, {
              numeric: true,
            });

      return sortDirection === "asc" ? sortValue : -sortValue;
    });
  }, [clusterFilter, query, rows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const displayFrom =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayTo = Math.min(currentPage * pageSize, filteredRows.length);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const isMapLoading = lahanQuery.isLoading || mapDataQuery.isLoading;
  const xlsxGroupHeaders = [
    "Grid Area",
    "Center Grid",
    "",
    "NDVI",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Sensor Lingkungan",
    "",
    "",
    "",
    "",
    "",
    "Sensor 7 in 1",
    "",
    "",
    "",
    "",
    "",
    "",
    "Cluster",
  ];
  const xlsxColumnHeaders = [
    "",
    "Long",
    "Lat",
    "Mean",
    "Min",
    "Max",
    "Std Dev",
    "Median",
    "Variance",
    "P25",
    "P50",
    "P75",
    "Suhu (°C)",
    "Humidity (%)",
    "CO2 (ppm)",
    "NH3 (ppm)",
    "CO (ppm)",
    "NO2 (ppm)",
    "N (ppm)",
    "P (ppm)",
    "K (ppm)",
    "EC (dS/m)",
    "Suhu (°C)",
    "Humidity (%)",
    "PH",
    "",
  ];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }

    setPage(1);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key)
      return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-emerald-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-600" />
    );
  };

  const renderSortableHeader = (key: SortKey, label: string) => (
    <button
      onClick={() => handleSort(key)}
      className="mx-auto inline-flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 transition hover:text-emerald-700"
      title={`Sort ${label}`}
    >
      <span>{label}</span>
      {renderSortIcon(key)}
    </button>
  );

  const renderSortableSensorHeader = (
    key: SortKey,
    label: string,
    unit: string,
  ) => (
    <button
      onClick={() => handleSort(key)}
      className="mx-auto inline-flex flex-col items-center gap-0.5 font-bold uppercase tracking-wider text-slate-600 transition hover:text-emerald-700"
      title={`Sort ${label}`}
    >
      <span className="inline-flex items-center gap-1">
        <span>{label}</span>
        {renderSortIcon(key)}
      </span>
      {unit && (
        <span className="text-[10px] font-semibold normal-case tracking-normal text-slate-400">
          {unit}
        </span>
      )}
    </button>
  );

  const handleNavigateToMap = (row: PhaseTableRow) => {
    onNavigateToMap({
      id: row.grid,
      mode: "fase2-ndvi",
      coordinates: row.coordinates,
      data: row,
    });
  };

  const handleDownloadXlsx = () => {
    const sheetRows = [
      xlsxGroupHeaders,
      xlsxColumnHeaders,
      ...filteredRows.map((row) => toXlsxRecord(row)),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    const date = new Date().toISOString().slice(0, 10);
    const fieldCode = selectedLahanOption?.fieldCode ?? "lahan";

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 11 } },
      { s: { r: 0, c: 12 }, e: { r: 0, c: 17 } },
      { s: { r: 0, c: 18 }, e: { r: 0, c: 24 } },
      { s: { r: 0, c: 25 }, e: { r: 1, c: 25 } },
    ];
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Final Fase 2");
    XLSX.writeFile(workbook, `data-final-fase-2-${fieldCode}-${date}.xlsx`);
  };

  const handleNavigateToLahan = () => {
    if (!selectedLahan) return;

    onNavigateToMap({
      id: selectedLahan.fieldCode,
      mode: "default",
      coordinates: [selectedLahan.center.lat, selectedLahan.center.lng],
      data: {
        type: "lahan",
        ...selectedLahan,
        center: [selectedLahan.center.lat, selectedLahan.center.lng],
      },
    });
  };

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col pt-16 lg:pt-12 px-6 lg:px-8 pb-10 overflow-y-auto">
      <div className="mb-7 flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Fase 2:{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
            Data Final NDVI
          </span>
        </h2>
        <p className="max-w-3xl text-[15px] leading-relaxed text-slate-500">
          Integrasi hasil NDVI akhir dengan pembacaan multisensor IoT per grid.
        </p>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <label className="mb-5 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pilih Lahan
            </span>
            {selectedLahanOption ? (
              <LahanSelector
                options={lahanOptions}
                value={selectedLahanOption}
                onChange={(option) => {
                  setSelectedLahanId(option.id ?? null);
                  if (option.id) window.localStorage.setItem("selectedLahanId", option.id);
                  setPage(1);
                }}
              />
            ) : (
              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-500">
                Memuat lahan...
              </div>
            )}
          </label>

          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                <Beaker className="h-4 w-4" />
                Info Lahan
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {selectedLahanOption
                  ? `${selectedLahanOption.fieldCode} - ${selectedLahanOption.name}`
                  : "-"}
              </h3>
            </div>
            <span className="rounded-xl bg-emerald-700 px-3 py-2 text-[12px] font-black text-white shadow-sm">
              {selectedLahanOption?.fieldCode ?? "-"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Kode Lahan", value: selectedLahanOption?.fieldCode ?? "-" },
              { label: "Nama Lahan", value: selectedLahanOption?.name ?? "-" },
              { label: "Total Grid", value: `${rows.length} Grid` },
              { label: "Captured At", value: formatDate(selectedLahan?.capturedAt) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-[15px] font-black text-slate-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Lokasi Lahan
              </p>
              <p className="mt-1 text-[13px] font-black text-slate-800">
                {selectedLahan
                  ? `${selectedLahan.center.lng.toFixed(5)}, ${selectedLahan.center.lat.toFixed(5)}`
                  : "-"}
              </p>
            </div>
            <button
              onClick={handleNavigateToLahan}
              disabled={!selectedLahan}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
              title="Lihat lokasi lahan"
            >
              <MapPin className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="flex min-h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="relative min-h-[260px] flex-1 bg-slate-950">
            {isMapLoading ? (
              <div className="absolute inset-0 animate-pulse bg-slate-200">
                <div className="absolute inset-x-10 top-10 h-6 rounded-full bg-white/50" />
                <div className="absolute inset-x-16 top-24 h-32 rounded-2xl bg-white/40" />
                <div className="absolute bottom-10 left-10 h-5 w-1/2 rounded-full bg-white/50" />
              </div>
            ) : mapDataQuery.data?.layers.ndvi?.url ? (
              <img
                src={mapDataQuery.data.layers.ndvi.url}
                alt={`NDVI ${selectedLahanOption?.name ?? "lahan"}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] font-semibold text-slate-400">
                NDVI lahan belum tersedia.
              </div>
            )}
            <div className="absolute left-4 top-4 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700 shadow-sm backdrop-blur">
              NDVI Lahan
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              <Grid3X3 className="h-4 w-4" />
              Grid dalam lahan
            </div>
            <h3 className="mt-1 text-[17px] font-bold text-slate-900">
              Tabel Data Final Fase 2
            </h3>
          </div>
          <div className="grid gap-2 md:grid-cols-[300px_170px_132px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                disabled={isMapLoading}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari grid, sensor, NDVI, cluster..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:text-slate-400"
              />
            </div>

            <FilterSelect
              icon={<Filter className="h-4 w-4 text-slate-400" />}
              value={clusterFilter}
              disabled={isMapLoading}
              onChange={(value) => {
                setClusterFilter(value);
                setPage(1);
              }}
              options={[
                { value: "semua", label: "Semua Cluster" },
                ...clusterOptions,
              ]}
            />
            <button
              onClick={handleDownloadXlsx}
              disabled={isMapLoading || filteredRows.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-700/40 bg-white px-4 text-[13px] font-bold text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition hover:bg-emerald-900/5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:shadow-none"
              title="Download XLSX"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>

        <div className="table-scrollbar overflow-x-auto">
          <table className="w-full min-w-[2320px] border-collapse text-center">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th
                  rowSpan={2}
                  className="border-r border-slate-300 px-5 py-4 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Grid Area
                </th>
                <th
                  colSpan={2}
                  className="border-r border-b border-slate-300 px-5 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Center Grid
                </th>
                <th
                  colSpan={9}
                  className="border-r border-b border-slate-300 px-5 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  NDVI
                </th>
                <th
                  colSpan={6}
                  className="border-r border-b border-slate-300 px-5 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Sensor Lingkungan
                </th>
                <th
                  colSpan={7}
                  className="border-r border-b border-slate-300 px-5 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Sensor 7 in 1
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-300 px-5 py-4 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  {renderSortableHeader("cluster", "Cluster")}
                </th>
                <th
                  rowSpan={2}
                  className="px-5 py-4 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Aksi
                </th>
              </tr>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th className="border-r border-slate-300 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Long
                </th>
                <th className="border-r border-slate-300 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Lat
                </th>
                {[
                  ["mean", "Mean"],
                  ["min", "Min"],
                  ["max", "Max"],
                  ["stddev", "Std Dev"],
                  ["median", "Median"],
                  ["variance", "Variance"],
                  ["p25", "P25"],
                  ["p50", "P50"],
                  ["p75", "P75"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className="border-r border-slate-300 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    {renderSortableHeader(key as SortKey, label)}
                  </th>
                ))}
                {[
                  ["temp", "Suhu", "°C"],
                  ["humidity", "Humidity", "%"],
                  ["co2", "CO2", "ppm"],
                  ["nh3", "NH3", "ppm"],
                  ["co", "CO", "ppm"],
                  ["no2", "NO2", "ppm"],
                  ["nitrogen", "N", "ppm"],
                  ["phosphorus", "P", "ppm"],
                  ["potassium", "K", "ppm"],
                  ["ec", "EC", "dS/m"],
                  ["temp7In1", "Suhu", "°C"],
                  ["humidity7In1", "Humidity", "%"],
                  ["ph", "PH", ""],
                ].map(([key, label, unit]) => (
                  <th
                    key={key}
                    className="border-r border-slate-300 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    {renderSortableSensorHeader(
                      key as SortKey,
                      label,
                      unit,
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isMapLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={`loading-${index}`}>
                    <td colSpan={29} className="px-5 py-4">
                      <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={29}
                    className="px-5 py-12 text-center text-[13px] font-semibold text-slate-500"
                  >
                    Data final grid belum tersedia.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => {
                const grid = getGrid(row);
                const sensor = grid.sensor;
                const sensor7In1 = grid.latestSensor7In1;

                return (
                  <tr
                    key={row.grid}
                    className="group transition-colors hover:bg-slate-50"
                  >
                    <td className="border-r border-slate-100 px-5 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] font-black text-slate-900"
                          style={getGridSwatchStyle(row)}
                        >
                          {row.grid.split("-")[1]}
                        </div>
                        <span className="font-bold text-slate-900">
                          {row.grid}
                        </span>
                      </div>
                    </td>
                    <td className="border-r border-slate-100 px-4 py-4 text-center text-[13px] font-semibold text-slate-600">
                      {row.coordinates[1].toFixed(5)}
                    </td>
                    <td className="border-r border-slate-100 px-4 py-4 text-center text-[13px] font-semibold text-slate-600">
                      {row.coordinates[0].toFixed(5)}
                    </td>
                    <td className="border-r border-slate-100 px-4 py-4 text-center">
                      <span className="inline-flex min-w-[56px] justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-black text-slate-800">
                        {row.mean}
                      </span>
                    </td>
                    {[
                      row.min,
                      row.max,
                      row.stddev,
                      row.median,
                      row.variance,
                      row.p25,
                      row.p50,
                      row.p75,
                      formatSensorValue(sensor?.temperatureC),
                      formatSensorValue(sensor?.humidityPct),
                      formatSensorValue(sensor?.co2Ppm),
                      formatSensorValue(sensor?.nh3Ppm),
                      formatSensorValue(sensor?.coPpm),
                      formatSensorValue(sensor?.no2Ppm),
                      formatSensorValue(sensor7In1?.nitrogenPpm),
                      formatSensorValue(sensor7In1?.phosphorusPpm),
                      formatSensorValue(sensor7In1?.potassiumPpm),
                      formatSensorValue(sensor7In1?.ecDsM),
                      formatSensorValue(sensor7In1?.temperatureC),
                      formatSensorValue(sensor7In1?.humidityPct),
                      formatSensorValue(sensor7In1?.ph),
                    ].map((value, index) => (
                      <td
                        key={index}
                        className="border-r border-slate-100 px-4 py-4 text-center text-[13px] font-semibold text-slate-600"
                      >
                        {value}
                      </td>
                    ))}
                    <td className="border-r border-slate-100 px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-bold ${getClusterClass(row.cluster)}`}
                      >
                        {getClusterLabel(row.cluster)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleNavigateToMap(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
                        title="Lihat di Peta"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-[13px] text-slate-600 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-500">
            <span>Rows per page</span>
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
          <div className="flex flex-wrap items-center justify-start gap-2 md:justify-center">
            <span className="text-[12px] font-semibold text-slate-500">
              Menampilkan {displayFrom}-{displayTo} dari {filteredRows.length}
            </span>
            <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
              {currentPage}/{totalPages}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(totalPages)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
