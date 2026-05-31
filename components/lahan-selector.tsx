"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface LahanOption {
  id?: string;
  fieldCode: string;
  name: string;
}

interface LahanSelectorProps<TOption extends LahanOption> {
  options: TOption[];
  value: TOption;
  onChange?: (option: TOption) => void;
}

export default function LahanSelector<TOption extends LahanOption>({
  options,
  value,
  onChange,
}: LahanSelectorProps<TOption>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel =
    value.name && value.name !== value.fieldCode
      ? `${value.fieldCode} - ${value.name}`
      : value.fieldCode;

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
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-[14px] font-semibold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_2px_rgba(15,23,42,0.04)] outline-none transition hover:border-emerald-700/40 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-900/20 ${
          isOpen ? "border-emerald-700 ring-2 ring-emerald-900/20" : "border-slate-200"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-emerald-800 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-emerald-900/10 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="max-h-72 overflow-y-auto overscroll-contain custom-scrollbar pr-1 flex flex-col gap-0.5">
            {options.map((option) => {
            const isSelected = option.fieldCode === value.fieldCode;
            const hasDistinctName =
              option.name && option.name !== option.fieldCode;

            return (
              <button
                key={option.id ?? option.fieldCode}
                type="button"
                onClick={() => {
                  onChange?.(option);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-slate-700 hover:bg-slate-50 hover:text-emerald-900"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[13px] font-black">
                    {option.fieldCode}
                  </span>
                  {hasDistinctName && (
                    <span className="truncate text-[13px] font-semibold text-slate-500">
                      {option.name}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
