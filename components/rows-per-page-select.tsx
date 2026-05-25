"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface RowsPerPageSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  label?: string;
  className?: string;
  placement?: "top" | "bottom";
}

export default function RowsPerPageSelect({
  value,
  onChange,
  options = [5, 10, 20],
  label = "Rows per page",
  className = "",
  placement = "bottom",
}: RowsPerPageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-9 items-center justify-between gap-2 rounded-2xl border bg-white px-3 text-left text-[12px] font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-emerald-700/40 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-900/20 ${
          isOpen
            ? "border-emerald-700 ring-2 ring-emerald-900/20"
            : "border-slate-200"
        }`}
        aria-label={label}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-emerald-800 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-30 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)] ${
            placement === "top"
              ? "bottom-[calc(100%+8px)]"
              : "top-[calc(100%+8px)]"
          }`}
        >
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-emerald-900"
                }`}
              >
                <span>{option}</span>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
