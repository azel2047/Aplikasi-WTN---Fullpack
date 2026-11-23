"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  Coffee,
  QrCode,
  MonitorCheck,
  LayoutDashboard,
  ArrowRight,
  Search,
  MapPin,
  Wifi,
  CheckCircle2,
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
  const [trackCode, setTrackCode] = useState("ORD-0042-DEMO4");

  useEffect(() => {
    apiFetch<{ tables: PublicTable[] }>("/public/tables")
      .then((res) => setTables(res.tables || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-canvas-cream text-on-surface flex flex-col">
      {/* Top Navbar */}
      <header className="bg-nav-espresso text-canvas-cream border-b border-dark-walnut">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-base">
              WTN
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight">
                Warkop Teras Nenek
              </span>
              <span className="text-xs text-border-sand block">
                Kopi Tubruk, Susu Aren &amp; Masakan Hangat Teras
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="h-11 px-4 rounded-xl bg-dark-walnut hover:bg-primary-container text-surface-cream text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <MonitorCheck className="w-4 h-4" />
              <span>Portal Kasir &amp; Owner</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Welcome Surface */}
        <section className="bg-surface-cream border border-border-sand rounded-[20px] p-6 sm:p-8 soft-shadow">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-subtle text-on-primary-subtle text-xs font-semibold">
                <Coffee className="w-3.5 h-3.5" />
                <span>Pemesanan Mandiri Tanpa Registrasi Akun</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-nav-espresso tracking-tight leading-snug">
                Selamat Datang di Teras Nenek. Pilih Meja atau Pindai QR untuk Memesan.
              </h1>
              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                Nikmati racikan kopi tubruk robusta, kopi susu gula aren murni, teh tarik, dan
                indomie hangat. Setiap item pesanan dapat dilengkapi catatan khusus (takaran
                gula, es, tingkat pedas) langsung ke barista &amp; dapur kami.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-container" />
                  Jl. Teras Rindang No. 14, Yogyakarta
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-tertiary" />
                  WiFi: <strong className="text-on-surface">WarkopTeras_5G</strong> (Sandi:{" "}
                  <code className="bg-surface-variant px-1.5 py-0.5 rounded text-nav-espresso font-semibold">
                    ngopidulu123
                  </code>
                  )
                </span>
              </div>
            </div>

            {/* Quick Order Tracking Box */}
            <div className="lg:col-span-5 bg-canvas-cream border border-border-sand rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-nav-espresso">
                  Cek Status Pesanan Aktif
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-success-subtle text-tertiary font-semibold">
                  Realtime
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Masukkan kode pesanan Anda (contoh: <code className="font-mono font-semibold">ORD-0042-DEMO4</code> atau <code className="font-mono font-semibold">ORD-0040-DEMO1</code>) untuk memantau status atau memberi rating.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (trackCode.trim()) {
                    window.location.href = `/order/${encodeURIComponent(trackCode.trim())}`;
                  }
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value)}
                    placeholder="Kode Order (mis. ORD-0042-DEMO4)"
                    className="w-full h-12 pl-10 pr-3 rounded-xl bg-surface-cream border border-border-sand text-sm font-medium text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-5 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-sm font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  Lacak
                </button>
              </form>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/order/ORD-0042-DEMO4"
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-cream border border-border-sand hover:border-primary-container text-secondary font-medium transition-colors"
                >
                  Demo #0042 (Meja 4 · Bukti QRIS)
                </Link>
                <Link
                  href="/order/ORD-0041-DEMO2"
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-cream border border-border-sand hover:border-primary-container text-secondary font-medium transition-colors"
                >
                  Demo #0041 (Meja 7 · Diracik)
                </Link>
                <Link
                  href="/order/ORD-0040-DEMO1"
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-cream border border-border-sand hover:border-primary-container text-secondary font-medium transition-colors"
                >
                  Demo #0040 (Meja 2 · Selesai &amp; Rating)
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 9 Table QR Simulators (AC-01, AC-02, AC-04) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-nav-espresso">
                9 Meja Pelanggan — Simulasi Scan QR Meja
              </h2>
              <p className="text-xs sm:text-sm text-text-muted">
                Klik salah satu meja di bawah untuk membuka halaman pemesanan QR unik meja tersebut.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-subtle text-tertiary text-xs font-semibold self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>9 Meja Aktif Terdaftar</span>
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-surface-cream border border-border-sand animate-pulse p-5"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tables.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.qr_token}`}
                  className="group bg-surface-cream border border-border-sand hover:border-primary-container rounded-2xl p-5 soft-shadow transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-surface-variant text-nav-espresso tabular-nums">
                          {t.code}
                        </span>
                        <span className="text-base font-bold text-nav-espresso group-hover:text-primary-container transition-colors">
                          {t.name}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {t.area} • Kapasitas {t.capacity} kursi
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary-subtle text-on-primary-subtle flex items-center justify-center shrink-0 group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
                      <QrCode className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-variant text-xs font-semibold text-primary-container">
                    <span>Buka Menu {t.name}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Role Portals Card Strip */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-surface-cream border border-border-sand rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-nav-espresso text-canvas-cream flex items-center justify-center">
                <MonitorCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-nav-espresso">
                Aplikasi Kasir &amp; Barista (Cashier Web App)
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Satu antrean terpadu untuk pesanan QR meja dan POS manual. Verifikasi pembayaran
                tunai &amp; QRIS statis, ubah status racikan, catat pengeluaran, laporan harian shift,
                dan closing kas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/cashier/orders"
                className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Buka Antrean Kasir</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/cashier/pos"
                className="h-11 px-4 rounded-xl bg-surface-variant hover:bg-border-sand/50 text-nav-espresso text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>POS Manual</span>
              </Link>
            </div>
          </div>

          <div className="bg-surface-cream border border-border-sand rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-dark-walnut text-canvas-cream flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-nav-espresso">
                Owner Dashboard &amp; Manajemen Usaha
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Pantau omzet aktual, kelola katalog menu, cetak QR 9 meja, stok bahan baku &amp;
                resep produk, laporan laba/rugi &amp; HPP tanpa double-counting, laporan karyawan,
                rating pelanggan, serta analitik jam ramai/sepi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/owner"
                className="h-11 px-4 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Buka Dashboard Owner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/owner/tables"
                className="h-11 px-4 rounded-xl bg-surface-variant hover:bg-border-sand/50 text-nav-espresso text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Kelola 9 Meja &amp; QR</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
