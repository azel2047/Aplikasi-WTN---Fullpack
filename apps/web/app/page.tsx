"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  QrCode,
  MonitorCheck,
  LayoutDashboard,
  ArrowRight,
  Search,
  Coffee,
} from "lucide-react";

interface PublicTable {
  id: number;
  code: string;
  name: string;
  area: string;
  capacity: number;
  qr_token: string;
  is_active: boolean;
}

export default function HomePage() {
  const [tables, setTables] = useState<PublicTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackCode, setTrackCode] = useState("");

  useEffect(() => {
    apiFetch<{ tables: PublicTable[] }>("/public/tables")
      .then((res) => setTables(res.tables || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex flex-col">
      {/* Clean Minimal Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10A352] text-white flex items-center justify-center">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              Warkop Teras Nenek
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/cashier/pos"
              className="h-9 px-3.5 rounded-lg bg-[#E8F7F0] hover:bg-[#d5f2e4] text-[#0D7A3E] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MonitorCheck className="w-4 h-4" />
              <span>Kasir POS</span>
            </Link>
            <Link
              href="/owner"
              className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Owner</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Clean Minimal Hero + Order Tracker */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Pilih Meja untuk Memesan
            </h1>
            <p className="text-sm text-slate-500">
              Pesan langsung dari meja tanpa antre, atau lacak status pesanan aktif Anda.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (trackCode.trim()) {
                window.location.href = `/order/${encodeURIComponent(trackCode.trim())}`;
              }
            }}
            className="flex gap-2 w-full lg:w-auto lg:min-w-[360px]"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                placeholder="Masukkan kode pesanan (ORD-...)"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#F6F8F7] border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#10A352]"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-[#10A352] hover:bg-[#0D8A44] text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              Lacak
            </button>
          </form>
        </section>

        {/* 9 Tables Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Daftar Meja (1–9)</h2>
            <span className="text-xs text-slate-500">{tables.length} meja aktif</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tables.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.qr_token}`}
                  className="group bg-white border border-slate-200 hover:border-[#10A352] rounded-2xl p-5 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-base font-bold text-slate-900 group-hover:text-[#10A352] transition-colors block">
                        {t.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {t.area} • {t.capacity} kursi
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#E8F7F0] text-[#10A352] flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-[#10A352]">
                    <span>Buka Menu</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
