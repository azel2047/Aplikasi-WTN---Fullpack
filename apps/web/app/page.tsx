"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coffee, QrCode, Search, Clock, MapPin, LogIn } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [trackCode, setTrackCode] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = trackCode.trim();
    if (!cleaned) return;
    router.push(`/order/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex flex-col">
      {/* Minimalist Top Bar */}
      <header className="bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10A352] text-white flex items-center justify-center">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Warkop Teras Nenek
            </span>
          </div>

          <Link
            href="/login"
            className="h-9 px-3.5 rounded-lg bg-[#E8F7F0] hover:bg-[#d5f2e4] text-[#0D7A3E] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk Staf</span>
          </Link>
        </div>
      </header>

      {/* Main Centered Real-World Storefront Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-7 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F7F0] text-[#10A352] flex items-center justify-center mx-auto">
            <QrCode className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pesan dari Meja
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan QR Code yang tersedia di meja Anda menggunakan kamera HP untuk
              membuka menu dan memesan langsung.
            </p>
          </div>

          {/* Order Tracker */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5 text-left">
            <label
              htmlFor="track-order"
              className="text-xs font-semibold text-slate-700 block"
            >
              Sudah memesan? Lacak status pesanan
            </label>
            <form onSubmit={handleTrackSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="track-order"
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder="Kode pesanan (ORD-...)"
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
          </div>

          {/* Store Info */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#10A352]" />
              08.00 – 22.00 WIB
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#10A352]" />
              Yogyakarta
            </span>
          </div>
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-400">
        Warkop Teras Nenek
      </footer>
    </div>
  );
}
