"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MultiYearSelectProps {
  disabled?: boolean;
  onChange: (years: string[]) => void;
  options: string[];
  value: string[];
}

export default function MultiYearSelect({
  disabled = false,
  onChange,
  options,
  value,
}: MultiYearSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSet = new Set(value);
  const label =
    value.length === 0
      ? "Pilih Tahun"
      : value.length === options.length
        ? "Semua Tahun"
        : value.length === 1
          ? value[0]
          : `${value.length} Tahun`;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const toggleYear = (year: string) => {
    const next = selectedSet.has(year)
      ? value.filter((item) => item !== year)
      : [...value, year].sort((a, b) => Number(b) - Number(a));

    onChange(next);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((current) => !current);
        }}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 text-left text-[13px] font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-900/15 disabled:cursor-not-allowed disabled:text-slate-400 ${
          isOpen ? "border-rose-600 ring-2 ring-rose-900/15" : "border-slate-200"
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-rose-700 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
          <button
            type="button"
            onClick={() => onChange(options)}
            className={`mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition ${
              value.length === options.length
                ? "bg-rose-50 text-rose-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-rose-900"
            }`}
          >
            <span>Semua Tahun</span>
            {value.length === options.length && <Check className="h-4 w-4" />}
          </button>

          {options.map((year) => {
            const isSelected = selectedSet.has(year);

            return (
              <button
                key={year}
                type="button"
                onClick={() => toggleYear(year)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition ${
                  isSelected
                    ? "bg-rose-50 text-rose-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-rose-900"
                }`}
              >
                <span>{year}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    isSelected
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
