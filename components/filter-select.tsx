"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectProps {
  accent?: "emerald" | "rose";
  disabled?: boolean;
  icon?: ReactNode;
  onChange: (value: string) => void;
  options: FilterOption[];
  value: string;
}

export default function FilterSelect({
  accent = "emerald",
  disabled = false,
  icon,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const accentClasses =
    accent === "rose"
      ? {
          focus: "focus:border-rose-600 focus:ring-rose-900/15",
          open: "border-rose-600 ring-2 ring-rose-900/15",
          selected: "bg-rose-50 text-rose-900",
          hover: "hover:text-rose-900",
          dot: "bg-rose-600",
          chevron: "text-rose-700",
        }
      : {
          focus: "focus:border-emerald-700 focus:ring-emerald-900/20",
          open: "border-emerald-700 ring-2 ring-emerald-900/20",
          selected: "bg-emerald-50 text-emerald-900",
          hover: "hover:text-emerald-900",
          dot: "bg-emerald-700",
          chevron: "text-emerald-800",
        };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((current) => !current);
        }}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 text-left text-[13px] font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:ring-2 disabled:cursor-not-allowed disabled:text-slate-400 ${accentClasses.focus} ${
          isOpen ? accentClasses.open : "border-slate-200"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${accentClasses.chevron} ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition ${
                  isSelected
                    ? accentClasses.selected
                    : `text-slate-600 hover:bg-slate-50 ${accentClasses.hover}`
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? accentClasses.dot : "bg-slate-300"
                  }`}
                />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
