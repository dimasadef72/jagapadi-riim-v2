import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
  total: number;
}

const navigationButtons = [
  { label: "First page", icon: ChevronsLeft },
  { label: "Previous page", icon: ChevronLeft },
  { label: "Next page", icon: ChevronRight },
  { label: "Last page", icon: ChevronsRight },
];

export default function TablePagination({ total }: TablePaginationProps) {
  return (
    <div className="border border-slate-200/80 border-t-0 rounded-b-xl bg-white px-4 py-3 text-[13px] text-slate-600">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-center sm:text-left">
          Menampilkan <span className="font-semibold text-slate-800">{total}</span> dari{" "}
          <span className="font-semibold text-slate-800">{total}</span> data
        </span>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <span className="text-slate-500">Baris</span>
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 font-medium text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                aria-label="Rows per page"
              >
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <span className="whitespace-nowrap font-medium text-slate-700">
              Halaman 1 dari {total > 0 ? "1" : "0"}
            </span>
            <div className="flex items-center gap-1.5">
              {navigationButtons.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 opacity-70 cursor-not-allowed"
                  aria-label={label}
                  disabled
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
