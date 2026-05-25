import { AlertTriangle, Binary, Home, Map, RadioTower, RotateCcw, Terminal } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050a08] text-emerald-50">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(16,185,129,0.22),transparent_42%),radial-gradient(circle_at_80%_85%,rgba(251,191,36,0.12),transparent_34%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[linear-gradient(to_bottom,transparent_0,transparent_48%,#34d399_50%,transparent_52%,transparent_100%)] bg-[length:100%_6px]" />

      <main className="relative z-10 flex h-full items-center justify-center px-5 py-10">
        <section className="w-full max-w-5xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.12)]">
            <RadioTower className="h-4 w-4" />
            System alert
          </div>

          <div className="grid overflow-hidden rounded-[28px] border border-emerald-400/20 bg-slate-950/72 shadow-[0_30px_120px_rgba(0,0,0,0.45),0_0_80px_rgba(16,185,129,0.12)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative p-7 sm:p-10 lg:p-12">
              <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-200">
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.9)]" />
                404
              </div>

              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.14)]">
                <AlertTriangle className="h-8 w-8" strokeWidth={1.7} />
              </div>

              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                404 Error Not Found
              </h1>
              <p className="mt-5 max-w-2xl font-mono text-sm uppercase tracking-[0.18em] text-emerald-300/70 sm:text-base">
                Requested route unavailable
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/maps"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-emerald-950 shadow-[0_0_28px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300"
                >
                  <Map className="h-4 w-4" />
                  Buka Maps
                </Link>
                <Link
                  href="/overview"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-white/5 px-5 text-sm font-bold text-emerald-100 transition hover:bg-white/10"
                >
                  <Home className="h-4 w-4" />
                  Overview
                </Link>
              </div>
            </div>

            <div className="border-t border-emerald-400/15 bg-black/35 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-emerald-400/20 bg-[#03110c] p-4 font-mono shadow-[inset_0_0_40px_rgba(16,185,129,0.05)]">
                <div className="mb-4 flex items-center justify-between border-b border-emerald-400/15 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                    <Terminal className="h-4 w-4" />
                    console
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
                  </div>
                </div>

                <div className="space-y-3 text-[12px] leading-6 text-emerald-200/80 sm:text-[13px]">
                  <p>
                    <span className="text-emerald-400">$</span> scan route --current
                  </p>
                  <p className="text-red-200/90">404_ERROR_NOT_FOUND</p>
                  <p>
                    <span className="text-emerald-400">$</span> fallback --suggest
                  </p>
                  <p className="text-emerald-100/75">available: /maps, /overview, /fase-1/ndvi, /fase-2/ndvi, /fase-2/hama</p>
                  <div className="flex items-center gap-2 pt-2 text-amber-200/90">
                    <Binary className="h-4 w-4" />
                    <span>01001010 01000001 01000111 01000001 00100000 01010000 01000001 01000100 01001001</span>
                  </div>
                </div>
              </div>

              <Link
                href="/maps"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/15"
              >
                <RotateCcw className="h-4 w-4" />
                Reconnect route
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
