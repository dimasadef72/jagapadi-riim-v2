"use client";

import {
  Bug,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Info,
  MapPin,
  Search,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import FilterSelect from "./filter-select";
import MultiYearSelect from "./multi-year-select";
import RowsPerPageSelect from "./rows-per-page-select";
import {
  fetchOptRowsFromMetadata,
  fetchOptYears,
} from "@/services/opt-report-service";
import type { SelectedMapFeature } from "./types";
import type { OptReportRow } from "@/types/opt-report";

interface Fase2HamaScreenProps {
  onNavigateToMap: (feature: SelectedMapFeature) => void;
}

type ColumnKey = keyof OptReportRow;

const columnHelp: Partial<Record<ColumnKey, string>> = {
  lt: "Luas Tanam (ha)",
  opt: "Organisme Pengganggu Tumbuhan yang diamati",
  ssr: "Serangan Sangat Ringan (ha)",
  sss: "Serangan Ringan (ha)",
  ssb: "Serangan Sedang (ha)",
  ssp: "Serangan Berat (ha)",
  ssj: "Serangan Puso/Sangat Berat (ha)",
  terkendali: "Luas serangan yang berhasil dikendalikan (ha)",
  panen: "Luas panen terdampak (ha)",
  intensitas: "Persentase intensitas serangan",
  ltsr: "Luas Tambah Serangan Ringan (ha)",
  ltss: "Luas Tambah Serangan Sedang (ha)",
  ltsb: "Luas Tambah Serangan Berat (ha)",
  ltsp: "Luas Tambah Serangan Puso (ha)",
  ltsj: "Luas Tambah Serangan Jumlah (ha)",
  kimia: "Luas pengendalian dengan pestisida kimia (ha)",
  hayati: "Luas pengendalian menggunakan agen hayati (ha)",
  eradikasi: "Luas pengendalian dengan eradikasi/pemusnahan (ha)",
  cl: "Cultural Control / pengendalian kultur teknis (ha)",
  jumlahPengendali: "Total luas pengendalian seluruh metode (ha)",
  lksr: "Luas Keadaan Serangan Ringan (ha)",
  lkss: "Luas Keadaan Serangan Sedang (ha)",
  lksb: "Luas Keadaan Serangan Berat (ha)",
  lksp: "Luas Keadaan Serangan Puso (ha)",
  lksj: "Luas Keadaan Serangan Jumlah (ha)",
  waspada: "Luas area waspada/potensi serangan (ha)",
  latitude: "Koordinat lintang lokasi pengamatan",
  longitude: "Koordinat bujur lokasi pengamatan",
};

const columnGroups: {
  label: string;
  tone: string;
  columns: { key: ColumnKey; label: string; width?: string }[];
}[] = [
  {
    label: "Waktu",
    tone: "bg-slate-100 text-slate-700",
    columns: [
      { key: "tahun", label: "Tahun", width: "min-w-[80px]" },
      { key: "bulan", label: "Bulan", width: "min-w-[80px]" },
      { key: "periode", label: "Periode", width: "min-w-[90px]" },
      { key: "mt", label: "MT", width: "min-w-[140px]" },
    ],
  },
  {
    label: "Lokasi",
    tone: "bg-sky-50 text-sky-800",
    columns: [
      { key: "kabupaten", label: "Kabupaten", width: "min-w-[120px]" },
      { key: "kecamatan", label: "Kecamatan", width: "min-w-[130px]" },
      { key: "desa", label: "Desa", width: "min-w-[140px]" },
      { key: "latitude", label: "Latitude", width: "min-w-[110px]" },
      { key: "longitude", label: "Longitude", width: "min-w-[120px]" },
    ],
  },
  {
    label: "Objek Pengamatan",
    tone: "bg-emerald-50 text-emerald-800",
    columns: [
      { key: "komoditas", label: "Komoditas", width: "min-w-[110px]" },
      { key: "lt", label: "LT", width: "min-w-[80px]" },
      { key: "opt", label: "OPT", width: "min-w-[100px]" },
    ],
  },
  {
    label: "Serangan",
    tone: "bg-rose-50 text-rose-800",
    columns: [
      { key: "ssr", label: "SSR" },
      { key: "sss", label: "SSS" },
      { key: "ssb", label: "SSB" },
      { key: "ssp", label: "SSP" },
      { key: "ssj", label: "SSJ" },
      { key: "terkendali", label: "Terkendali", width: "min-w-[120px]" },
      { key: "panen", label: "PANEN", width: "min-w-[95px]" },
      { key: "intensitas", label: "%", width: "min-w-[70px]" },
    ],
  },
  {
    label: "Luas Tambah Serangan",
    tone: "bg-amber-50 text-amber-800",
    columns: [
      { key: "ltsr", label: "LTSR" },
      { key: "ltss", label: "LTSS" },
      { key: "ltsb", label: "LTSB" },
      { key: "ltsp", label: "LTSP" },
      { key: "ltsj", label: "LTSJ" },
    ],
  },
  {
    label: "Pengendalian",
    tone: "bg-lime-50 text-lime-800",
    columns: [
      { key: "kimia", label: "Kimia", width: "min-w-[85px]" },
      { key: "hayati", label: "Hayati", width: "min-w-[85px]" },
      { key: "eradikasi", label: "Eradikasi", width: "min-w-[105px]" },
      { key: "cl", label: "CL", width: "min-w-[70px]" },
      {
        key: "jumlahPengendali",
        label: "Jumlah Pengendali",
        width: "min-w-[160px]",
      },
    ],
  },
  {
    label: "Keadaan Serangan",
    tone: "bg-orange-50 text-orange-800",
    columns: [
      { key: "lksr", label: "LKSR" },
      { key: "lkss", label: "LKSS" },
      { key: "lksb", label: "LKSB" },
      { key: "lksp", label: "LKSP" },
      { key: "lksj", label: "LKSJ" },
      { key: "waspada", label: "Waspada", width: "min-w-[105px]" },
    ],
  },
];

function formatNumber(value: string | number) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 4,
  }).format(value);
}

function getCellValue(row: OptReportRow, key: ColumnKey) {
  if (key === "tahun" || key === "bulan" || key === "periode") {
    return String(row[key]);
  }

  return formatNumber(row[key] as string | number);
}

function HeaderLabel({
  label,
  help,
}: {
  label: string;
  help?: string;
}) {
  if (!help) {
    return <span>{label}</span>;
  }

  return (
    <span className="group/tooltip relative inline-flex items-center justify-center gap-1.5">
      <span>{label}</span>
      <span
        tabIndex={0}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 outline-none transition hover:bg-white hover:text-rose-700 focus:bg-white focus:text-rose-700"
        aria-label={`Keterangan ${label}: ${help}`}
      >
        <Info className="h-3 w-3" />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-40 hidden w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[12px] font-semibold leading-relaxed normal-case tracking-normal text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.16)] group-hover/tooltip:block group-focus-within/tooltip:block">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-rose-700">
          {label}
        </span>
        {help}
      </span>
    </span>
  );
}

export default function Fase2HamaScreen({
  onNavigateToMap,
}: Fase2HamaScreenProps) {
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string[] | null>(null);
  const [monthFilter, setMonthFilter] = useState("semua");
  const [kecamatanFilter, setKecamatanFilter] = useState("semua");
  const [optFilter, setOptFilter] = useState("semua");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const yearsQuery = useQuery({
    queryKey: ["opt-years"],
    queryFn: fetchOptYears,
    staleTime: 10 * 60 * 1000,
  });
  const yearOptions = yearsQuery.data ?? [];
  const yearOptionValues = useMemo(
    () => yearOptions.map((item) => String(item.tahun)),
    [yearOptions],
  );
  const selectedYears = yearFilter ?? yearOptionValues.slice(0, 1);
  const selectedYearMetadata = yearOptions.filter((item) =>
    selectedYears.includes(String(item.tahun)),
  );

  useEffect(() => {
    if (yearFilter !== null || yearOptionValues.length === 0) return;
    setYearFilter([yearOptionValues[0]]);
  }, [yearFilter, yearOptionValues]);

  const rowsQuery = useQuery({
    queryKey: ["opt-rows", selectedYears],
    queryFn: async () => {
      const rowsByYear = await Promise.all(
        selectedYearMetadata.map((metadata) =>
          fetchOptRowsFromMetadata(metadata),
        ),
      );
      return rowsByYear.flat();
    },
    enabled: selectedYearMetadata.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  const rows = rowsQuery.data ?? [];
  const isYearFetching = rowsQuery.isFetching && !rowsQuery.isLoading;
  const monthOptions = useMemo(
    () => [...new Set(rows.map((row) => row.bulan))].sort((a, b) => a - b),
    [rows],
  );
  const kecamatanOptions = useMemo(
    () => [...new Set(rows.map((row) => row.kecamatan))].sort(),
    [rows],
  );
  const optOptions = useMemo(
    () => [...new Set(rows.map((row) => row.opt))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const searchableText = [
        row.tahun,
        row.bulan,
        row.periode,
        row.mt,
        row.kabupaten,
        row.kecamatan,
        row.desa,
        row.komoditas,
        row.opt,
        row.latitude,
        row.longitude,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (monthFilter === "semua" || String(row.bulan) === monthFilter) &&
        (kecamatanFilter === "semua" ||
          row.kecamatan === kecamatanFilter) &&
        (optFilter === "semua" || row.opt === optFilter)
      );
    });
  }, [kecamatanFilter, monthFilter, optFilter, query, rows]);

  const totals = useMemo(
    () => ({
      rows: rows.length,
      filteredRows: filteredRows.length,
      lksj: filteredRows.reduce((sum, row) => sum + row.lksj, 0),
      terkendali: filteredRows.reduce((sum, row) => sum + row.terkendali, 0),
      waspada: filteredRows.reduce((sum, row) => sum + row.waspada, 0),
    }),
    [filteredRows, rows.length],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const displayFrom =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayTo = Math.min(currentPage * pageSize, filteredRows.length);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleNavigateToMap = (row: OptReportRow) => {
    onNavigateToMap({
      id: row.id,
      mode: "fase2-hama",
      coordinates: [row.latitude, row.longitude],
      data: {
        type: "hama-history",
        ...row,
        area: `${row.desa}, ${row.kecamatan}`,
        jenis: row.opt,
        rekomendasi: `LKSJ ${formatNumber(row.lksj)} ha, terkendali ${formatNumber(row.terkendali)} ha, waspada ${formatNumber(row.waspada)} ha.`,
        status: row.lksj > 0 ? "Historis OPT" : "Tidak ada serangan",
        tingkat:
          row.ssj > 0
            ? "Puso/Sangat Berat"
            : row.ssp > 0
              ? "Berat"
              : row.ssb > 0
                ? "Sedang"
                : row.sss > 0
                  ? "Ringan"
                  : row.ssr > 0
                    ? "Sangat Ringan"
                    : "-",
      },
    });
  };

  const isLoading = yearsQuery.isLoading || rowsQuery.isLoading;
  const noYearsSelected = yearFilter !== null && selectedYears.length === 0;
  const errorMessage =
    yearsQuery.error instanceof Error
      ? yearsQuery.error.message
      : rowsQuery.error instanceof Error
        ? rowsQuery.error.message
        : "";

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-slate-50 px-6 pb-10 pt-16 lg:px-8 lg:pt-12">
      <div className="mb-7 flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Fase 2:{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
            Hama & Penyakit
          </span>
        </h2>
        <p className="max-w-4xl text-[15px] leading-relaxed text-slate-500">
          Datasheet historis pengamatan OPT padi Kabupaten Jember berdasarkan
          waktu, lokasi, luas serangan, pengendalian, dan titik koordinat.
        </p>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Data Tahun", value: `${totals.rows} Baris` },
          { label: "Data Terfilter", value: `${totals.filteredRows} Baris` },
          { label: "Total LKSJ", value: `${formatNumber(totals.lksj)} ha` },
          {
            label: "Total Terkendali",
            value: `${formatNumber(totals.terkendali)} ha`,
          },
        ].map((item) => (
          <section
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {item.value}
            </p>
          </section>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-700">
              <Bug className="h-4 w-4" />
              Arsip OPT Historis
            </div>
            <h3 className="mt-1 text-[17px] font-bold text-slate-900">
              Tabel Pengamatan Hama dan Penyakit
            </h3>
            {isYearFetching && (
              <p className="mt-1 text-[12px] font-semibold text-slate-400">
                Memperbarui data tahun {selectedYears.join(", ")}...
              </p>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-[260px_150px_130px_170px_150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari desa, kecamatan, OPT..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <div className="pl-7">
                <MultiYearSelect
                  disabled={yearOptionValues.length === 0}
                  options={yearOptionValues}
                  value={selectedYears}
                  onChange={(value) => {
                    setYearFilter(value);
                    setMonthFilter("semua");
                    setKecamatanFilter("semua");
                    setOptFilter("semua");
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <FilterSelect
              accent="rose"
              value={monthFilter}
              onChange={(value) => {
                setMonthFilter(value);
                setPage(1);
              }}
              options={[
                { value: "semua", label: "Semua Bulan" },
                ...monthOptions.map((month) => ({
                  value: String(month),
                  label: `Bulan ${month}`,
                })),
              ]}
            />

            <FilterSelect
              accent="rose"
              value={kecamatanFilter}
              onChange={(value) => {
                setKecamatanFilter(value);
                setPage(1);
              }}
              options={[
                { value: "semua", label: "Semua Kecamatan" },
                ...kecamatanOptions.map((kecamatan) => ({
                  value: kecamatan,
                  label: kecamatan,
                })),
              ]}
            />

            <FilterSelect
              accent="rose"
              value={optFilter}
              onChange={(value) => {
                setOptFilter(value);
                setPage(1);
              }}
              options={[
                { value: "semua", label: "Semua OPT" },
                ...optOptions.map((opt) => ({ value: opt, label: opt })),
              ]}
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="px-5 py-8 text-center text-[13px] font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : noYearsSelected ? (
          <div className="px-5 py-8 text-center text-[13px] font-semibold text-slate-500">
            Pilih minimal satu tahun untuk menampilkan data OPT.
          </div>
        ) : isLoading ? (
          <div className="px-5 py-8 text-center text-[13px] font-semibold text-slate-500">
            Memuat data OPT...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] font-semibold text-slate-500">
            Data OPT belum tersedia. Jalankan seed untuk mengisi `opt_years`
            dan file JSON Storage.
          </div>
        ) : (
          <div className="table-scrollbar overflow-x-auto">
            <table className="min-w-[3420px] border-collapse text-center">
              <thead>
                <tr className="border-b border-slate-300">
                  {columnGroups.map((group) => (
                    <th
                      key={group.label}
                      colSpan={group.columns.length}
                      className={`border-r border-slate-300 px-5 py-3 text-center text-[12px] font-black uppercase tracking-wider ${group.tone}`}
                    >
                      {group.label}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="sticky right-0 z-20 border-l border-slate-300 bg-white px-5 py-3 text-center text-[12px] font-black uppercase tracking-wider text-slate-700 shadow-[-8px_0_18px_rgba(15,23,42,0.08)]"
                  >
                    Marker
                  </th>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-100">
                  {columnGroups.flatMap((group) =>
                    group.columns.map((column) => (
                      <th
                        key={column.key}
                        title={columnHelp[column.key]}
                        className={`border-r border-slate-300 px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 ${column.width ?? "min-w-[78px]"}`}
                      >
                        <HeaderLabel
                          label={column.label}
                          help={columnHelp[column.key]}
                        />
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-slate-50"
                  >
                    {columnGroups.flatMap((group) =>
                      group.columns.map((column) => (
                        <td
                          key={`${row.id}-${column.key}`}
                          className="border-r border-slate-100 px-3 py-3 text-center text-[13px] font-semibold text-slate-600"
                        >
                          {getCellValue(row, column.key)}
                        </td>
                      )),
                    )}
                    <td className="sticky right-0 border-l border-slate-100 bg-white px-5 py-3 text-center shadow-[-8px_0_18px_rgba(15,23,42,0.06)] group-hover:bg-slate-50">
                      <button
                        onClick={() => handleNavigateToMap(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700/40 bg-white text-emerald-800 shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition hover:bg-emerald-900/5"
                        title={`Lihat ${row.desa} di peta`}
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-[13px] text-slate-600 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-500">
            <span>Rows per page</span>
            <RowsPerPageSelect
              value={pageSize}
              options={[25, 50, 100]}
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
