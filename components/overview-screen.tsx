"use client";

import {
  Map as MapIcon,
  Target,
  Microscope,
  Activity,
  Cpu,
  Camera,
  Radio,
  Zap,
  Radar,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

export default function OverviewScreen() {
  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 flex flex-col pt-10 lg:pt-8 px-6 lg:px-8 pb-10 overflow-y-auto relative selection:bg-emerald-200/50">
      {/* Background subtle mesh/glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-300/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto space-y-6">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl p-8 lg:p-12 border border-slate-200 shadow-sm overflow-hidden bg-white"
        >
          {/* Abstract Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8 mt-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 mb-6 backdrop-blur-sm">
                <Microscope className="w-3.5 h-3.5" /> RIIM - Riset & Inovasi
                untuk Indonesia Maju
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter text-slate-900 mb-6">
                JAGA{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">
                  PADI
                </span>
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl font-light">
                Platform Cerdas Pemantauan Pertumbuhan Padi dan Deteksi Dini
                Anomali Hama Berbasis Citra Drone Multispektral, Jaringan IoT,
                dan Model Pembelajaran Mesin.
              </p>
            </div>

            <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-4">
              <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-600">
                  System Online
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Main Focus Area - Span 2x2 on large screens */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 xl:col-span-2 xl:row-span-2 bg-white border border-slate-200 shadow-sm p-8 rounded-3xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Fokus Riset Utama
              </h3>
            </div>

            <div className="relative z-10 pt-4">
              {/* Timeline Container */}
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-10 pb-4">
                {/* Fase 1 */}
                <div className="relative pl-10 group">
                  {/* Dot */}
                  <div className="absolute w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center -left-[21px] top-[-4px] ring-4 ring-white border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group-hover:border-emerald-200 transition-colors">
                    <h4 className="font-bold text-slate-900 text-lg mb-2 flex items-center flex-wrap gap-2">
                      Fase 1 <ChevronRight className="w-4 h-4 text-slate-300" />{" "}
                      <span className="text-emerald-700 text-base">
                        Baseline Lahan
                      </span>
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Pengumpulan data spasial tingkat kehijauan lahan (NDVI)
                      menggunakan citra drone DJI Mavic 3 Multispektral.
                      Memetakan kondisi eksisting area persawahan sebagai acuan
                      dasar (baseline) tingkat kesehatan tanaman.
                    </p>
                  </div>
                </div>

                {/* Fase 2 */}
                <div className="relative pl-10 group">
                  {/* Dot */}
                  <div className="absolute w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center -left-[21px] top-[-4px] ring-4 ring-white border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group-hover:border-indigo-200 transition-colors">
                    <h4 className="font-bold text-slate-900 text-lg mb-2 flex items-center flex-wrap gap-2">
                      Fase 2 <ChevronRight className="w-4 h-4 text-slate-300" />{" "}
                      <span className="text-indigo-700 text-base">
                        Analitik & Peringatan Dini
                      </span>
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Integrasi silang data lapangan dari sensor mikroklimat
                      (Suhu, Kelembaban, CO₂, NH₃) dan anomali hama. Menggunakan
                      AI untuk menghasilkan sistem prediksi dan peringatan dini
                      serangan hama terpadu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Box 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] p-6 rounded-3xl flex flex-col justify-between group hover:border-emerald-200 transition-all hover:-translate-y-1 hover:shadow-emerald-900/5 duration-300 relative overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-emerald-100 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-mono text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Zonasi Lahan
              </h3>
              <MapIcon className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors group-hover:scale-110" />
            </div>
            <div className="relative z-10">
              <div className="text-5xl font-light text-slate-900 mb-2 tracking-tighter">
                96
              </div>
              <div className="text-sm font-medium text-slate-500">
                Total Grid Pengamatan
              </div>
            </div>
          </motion.div>

          {/* Stats Box 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] p-6 rounded-3xl flex flex-col justify-between group hover:border-indigo-200 transition-all hover:-translate-y-1 hover:shadow-indigo-900/5 duration-300 relative overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-indigo-100 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-mono text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Area Cakupan
              </h3>
              <Radar className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors group-hover:scale-110" />
            </div>
            <div className="relative z-10">
              <div className="text-5xl font-light text-slate-900 mb-2 tracking-tighter flex items-baseline gap-1">
                250<span className="text-2xl font-bold text-slate-400">Ha</span>
              </div>
              <div className="text-sm font-medium text-slate-500">
                Luas Persawahan Aktif
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-2 xl:col-span-2 bg-gradient-to-br from-indigo-50 to-white border border-slate-200 shadow-sm p-8 rounded-3xl flex flex-col justify-between overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-100/50 blur-[60px] rounded-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Arsitektur Ekosistem
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
              {[
                {
                  icon: Camera,
                  title: "Remote Sensing",
                  desc: "Drone DJI Mavic 3 Multispektral",
                  color: "emerald",
                  bg: "bg-emerald-50",
                  text: "text-emerald-600",
                },
                {
                  icon: Radio,
                  title: "IoT Nodes",
                  desc: "Sensor Tanika & Mikro-iklim Terdistribusi",
                  color: "indigo",
                  bg: "bg-indigo-50",
                  text: "text-indigo-600",
                },
                {
                  icon: Zap,
                  title: "Machine Learning",
                  desc: "Spatiotemporal AI & Anomaly Detection",
                  color: "amber",
                  bg: "bg-amber-50",
                  text: "text-amber-600",
                },
              ].map((tek, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col h-full hover:border-slate-200 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${tek.bg} flex items-center justify-center mb-4`}
                  >
                    <tek.icon className={`w-5 h-5 ${tek.text}`} />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm mb-1.5">
                    {tek.title}
                  </h5>
                  <p className="text-[13px] text-slate-500 leading-relaxed font-medium mt-auto">
                    {tek.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
