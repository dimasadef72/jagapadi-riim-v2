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
  Filter,
  Grid3X3,
  MapPin,
  Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import FilterSelect from "./filter-select";
import LahanSelector from "./lahan-selector";
import {
  fetchLahan,
  fetchLahanMapData,
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
  | "p75"
  | "co2"
  | "nh3"
  | "co"
  | "no2"
  | "temp"
  | "humidity"
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
  if (!cluster) return "-";
  if (cluster.includes("Merah")) return "Merah";
  if (cluster.includes("Kuning")) return "Kuning";
  return "Hijau";
}

function getClusterClass(cluster: string | undefined) {
  if (!cluster) return "bg-slate-50 text-slate-500 border-slate-100";
  if (cluster.includes("Merah"))
    return "bg-rose-50 text-rose-700 border-rose-100";
  if (cluster.includes("Kuning"))
    return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
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
        row.p75,
        row.co2,
        row.nh3,
        row.co,
        row.no2,
        row.temp,
        row.humidity,
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

      const sortValue =
        sortKey === "cluster"
          ? getClusterLabel(a.cluster).localeCompare(getClusterLabel(b.cluster))
          : numericValue(a[sortKey]) - numericValue(b[sortKey]);

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

  const handleNavigateToMap = (row: PhaseTableRow) => {
    onNavigateToMap({
      id: row.grid,
      mode: "fase2-ndvi",
      coordinates: row.coordinates,
      data: row,
    });
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
            {mapDataQuery.data?.layers.ndvi?.url ? (
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
          <div className="grid gap-2 md:grid-cols-[300px_170px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari grid, sensor, NDVI, cluster..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
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
                { value: "semua", label: "Semua Cluster" },
                { value: "hijau", label: "Hijau" },
                { value: "kuning", label: "Kuning" },
                { value: "merah", label: "Merah" },
              ]}
            />
          </div>
        </div>

        <div className="table-scrollbar overflow-x-auto">
          <table className="w-full min-w-[1760px] border-collapse text-center">
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
                  colSpan={8}
                  className="border-r border-b border-slate-300 px-5 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  NDVI
                </th>
                <th
                  colSpan={6}
                  className="border-r border-b border-slate-300 px-5 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-slate-700"
                >
                  Sensor
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
                  ["p75", "P75"],
                  ["co2", "CO2"],
                  ["nh3", "NH3"],
                  ["co", "CO"],
                  ["no2", "NO2"],
                  ["temp", "Temp"],
                  ["humidity", "Humidity"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className="border-r border-slate-300 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    {renderSortableHeader(key as SortKey, label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((row) => {
                return (
                  <tr
                    key={row.grid}
                    className="group transition-colors hover:bg-slate-50"
                  >
                    <td className="border-r border-slate-100 px-5 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-[13px] font-black text-emerald-700">
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
                      row.p75,
                      row.co2,
                      row.nh3,
                      row.co,
                      row.no2,
                      row.temp,
                      row.humidity,
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
              })}
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
