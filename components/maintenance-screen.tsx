import { Terminal } from "lucide-react";

export default function MaintenanceScreen() {
  return (
    <main className="fixed inset-0 z-[10000] overflow-hidden bg-[#030706] text-emerald-50">
      <section className="relative flex min-h-[100dvh] items-center justify-center px-5 py-8">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(45,212,191,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(52,211,153,0.075)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(20,184,166,0.24),transparent_34%),linear-gradient(120deg,rgba(6,182,212,0.14),transparent_45%,rgba(132,204,22,0.1))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0,transparent_48%,rgba(52,211,153,0.12)_50%,transparent_52%,transparent_100%)] bg-[length:100%_8px] opacity-35" />
        <div className="absolute inset-x-0 top-0 h-px bg-cyan-300/70 shadow-[0_0_42px_rgba(34,211,238,0.85)]" />

        <div className="relative z-10 w-full max-w-lg">
          <div className="relative overflow-hidden rounded-md border border-cyan-300/25 bg-[#03090d]/92 shadow-[0_0_70px_rgba(34,211,238,0.14),0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300" />

            <div className="flex items-center justify-between border-b border-cyan-300/20 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase text-cyan-100">
                <Terminal className="h-4 w-4 text-cyan-300" strokeWidth={1.8} />
                maintenance.sh
              </div>
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
            </div>

            <div className="px-4 py-5 font-mono sm:px-6 sm:py-6">
              <div className="space-y-2 text-xs leading-6 text-emerald-100/85 sm:text-sm">
                <p>
                  <span className="text-cyan-300">jagapadi@system:~$</span>{" "}
                  ./maintenance.sh
                </p>
                <p>
                  <span className="text-slate-500">[scan]</span> checking public
                  route...
                </p>
                <p>
                  <span className="text-slate-500">[lock]</span>{" "}
                  <span className="text-amber-200">public access disabled</span>
                </p>
              </div>

              <pre
                aria-label="System maintenance"
                className="mt-6 overflow-hidden whitespace-pre text-[clamp(6px,1.25vw,10px)] font-bold leading-[1.12] bg-gradient-to-r from-cyan-300 via-emerald-300 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.55)] sm:text-[10px]"
              >{String.raw`
 ____  __   __ ____  _____  _____  __  __
/ ___| \ \ / // ___||_   _|| ____||  \/  |
\___ \  \ V / \___ \  | |  |  _|  | |\/| |
 ___) |  | |   ___) | | |  | |___ | |  | |
|____/   |_|  |____/  |_|  |_____ |_|  |_|

 __  __    _    ___ _   _ _____ _____ _   _    _    _   _  ____ _____
|  \/  |  / \  |_ _| \ | |_   _| ____| \ | |  / \  | \ | |/ ___| ____|
| |\/| | / _ \  | ||  \| | | | |  _| |  \| | / _ \ |  \| | |   |  _|
| |  | |/ ___ \ | || |\  | | | | |___| |\  |/ ___ \| |\  | |___| |___
|_|  |_/_/   \_\___|_| \_| |_| |_____|_| \_/_/   \_\_| \_|\____|_____|
`}</pre>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Sistem sedang dalam mode maintenance.
              </p>

              <div className="mt-4 space-y-1 text-xs leading-6 text-slate-300 sm:text-sm">
                <p>
                  <span className="text-cyan-300">&gt;</span> status:{" "}
                  <span className="text-emerald-300">maintenance_mode</span>
                </p>
                <p>
                  <span className="text-cyan-300">&gt;</span> route:{" "}
                  <span className="text-amber-200">disabled</span>
                  <span className="mx-2 text-slate-600">/</span>
                  uptime: <span className="text-emerald-300">standby</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
