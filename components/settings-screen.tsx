"use client";

import { Settings as SettingsIcon, Globe, Map, Moon, HelpCircle } from "lucide-react";

export default function SettingsScreen() {
  return (
    <div className="w-full h-full bg-gray-50 flex flex-col pt-24 px-8 pb-8 overflow-y-auto">
      <div className="flex flex-col gap-1 mb-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-gray-400" />
          Pengaturan Umum
        </h2>
        <p className="text-gray-500 text-[15px]">Konfigurasi dasar aplikasi.</p>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full space-y-4">
        
        {/* Tampilan */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-600">
              <Moon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-gray-900">Mode Gelap</h3>
              <p className="text-[13px] text-gray-500">Ubah tampilan menjadi gelap.</p>
            </div>
          </div>
          <button className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer" aria-label="Toggle dark mode">
            <span className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></span>
          </button>
        </div>

        {/* Bahasa */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
              <Globe className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-gray-900">Bahasa</h3>
              <p className="text-[13px] text-gray-500">Pilih bahasa aplikasi.</p>
            </div>
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none bg-white cursor-pointer">
            <option>Indonesia</option>
            <option>English</option>
          </select>
        </div>

        {/* Satuan Area */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
              <Map className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-gray-900">Satuan Luas</h3>
              <p className="text-[13px] text-gray-500">Unit pengukuran lahan.</p>
            </div>
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none bg-white cursor-pointer">
            <option>Hektar (ha)</option>
            <option>Meter Persegi (m²)</option>
          </select>
        </div>

        {/* Info */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[16px] font-medium text-gray-900">Tentang Aplikasi</h3>
              <p className="text-[13px] text-gray-500">Versi 1.0.0</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
