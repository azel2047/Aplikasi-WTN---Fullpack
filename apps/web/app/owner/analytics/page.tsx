"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch, formatRupiah } from "@/lib/api";
import { Info, Download, Zap, RefreshCw } from "lucide-react";

export default function OwnerAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = () => {
    setLoading(true);
    apiFetch("/owner/analytics/traffic")
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
        <div className="h-72 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
      </div>
    );
  }

  const period = data.period || {};
  const funnel = data.funnel || {};
  const hourly = data.hourly_distribution || [];
  const products = data.product_performance || [];
  const tables = data.table_utilization || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
            Analitik Traffic &amp; Performa Usaha
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Analisis jam operasional, pola kunjungan QR vs transaksi lunas, dan
            performa menu berbasis data aktual database (AC-30, AC-31).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAnalytics}
            className="h-11 px-3.5 rounded-xl bg-surface-cream border border-border-sand text-xs font-bold text-nav-espresso flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <a
            href="/api/v1/owner/exports?type=sales&format=csv"
            className="h-11 px-4 rounded-xl bg-surface-cream border border-border-sand text-xs font-bold text-nav-espresso flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-primary-container" />
            <span>Ekspor CSV</span>
          </a>
        </div>
      </div>

      {/* Data Sufficiency & Anti-Slop Honesty Disclosure Banner (AC-31) */}
      <div
        className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
          period.has_sufficient_history
            ? "bg-success-subtle border-tertiary/30 text-tertiary"
            : "bg-warning-subtle border-warning/40 text-warning"
        }`}
      >
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block">
            {period.has_sufficient_history
              ? "Sampel Data Historis Memadai"
              : "Label kejujuran data: Data historis belum cukup panjang (AC-31)"}
          </span>
          <p className="leading-relaxed">{period.disclosure_message}</p>
        </div>
      </div>

      {/* Insight Strip */}
      <div className="p-3.5 rounded-xl bg-surface-variant border border-border-sand flex items-center gap-3 text-xs text-secondary">
        <div className="w-7 h-7 rounded-full bg-surface-cream flex items-center justify-center text-primary-container shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <p>
          <strong>Jam ramai tercatat:</strong>{" "}
          <span className="text-primary-container font-bold tabular-nums">
            {data.peak_hour
              ? `Pukul ${data.peak_hour.hour} (${data.peak_hour.orders_created} order)`
              : "Data belum cukup"}
          </span>{" "}
          • <strong>Jam paling tenang:</strong>{" "}
          <span className="font-bold tabular-nums">
            {data.quiet_hour
              ? `Pukul ${data.quiet_hour.hour} (${data.quiet_hour.orders_created} order)`
              : "Data belum cukup"}
          </span>
        </p>
      </div>

      {/* Traffic Funnel KPI Strip (Distinguishing QR Scans vs Orders vs Paid vs Completed) */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-surface-cream border border-border-sand soft-shadow">
          <span className="text-xs text-text-muted block">
            Kunjungan Scan QR Meja
          </span>
          <span className="text-2xl font-bold text-nav-espresso tabular-nums mt-1 block">
            {funnel.qr_menu_visits}
          </span>
          <span className="text-[10px] text-text-muted">
            Indikator minat (bukan omzet)
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface-cream border border-border-sand soft-shadow">
          <span className="text-xs text-text-muted block">Order Dibuat</span>
          <span className="text-2xl font-bold text-nav-espresso tabular-nums mt-1 block">
            {funnel.orders_created}
          </span>
          <span className="text-[10px] text-text-muted">
            QR &amp; POS Manual
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface-cream border border-border-sand soft-shadow">
          <span className="text-xs text-text-muted block">Order Dibayar</span>
          <span className="text-2xl font-bold text-tertiary tabular-nums mt-1 block">
            {funnel.orders_paid}
          </span>
          <span className="text-[10px] text-text-muted">
            {funnel.orders_completed} selesai • {funnel.orders_cancelled} batal
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface-cream border border-border-sand soft-shadow">
          <span className="text-xs text-text-muted block">Total Omzet</span>
          <span className="text-xl font-bold text-primary-container tabular-nums mt-1 block">
            {formatRupiah(funnel.total_revenue)}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-surface-cream border border-border-sand soft-shadow">
          <span className="text-xs text-text-muted block">
            Rata-rata Transaksi (AOV)
          </span>
          <span className="text-xl font-bold text-nav-espresso tabular-nums mt-1 block">
            {formatRupiah(funnel.average_order_value)}
          </span>
        </div>
      </section>

      {/* Two-Column Charts: Order & Visit per Hour vs Revenue per Hour (AC-30) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <div>
            <h2 className="text-base font-bold text-nav-espresso">
              Distribusi Order &amp; Scan QR per Jam (08.00 – 22.00)
            </h2>
            <p className="text-xs text-text-muted">
              Perbandingan jumlah scan QR menu dan order aktual yang dibuat
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "#7A6757" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#7A6757" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFCF7",
                    borderColor: "#D9C5AA",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="qr_visits"
                  name="Scan QR Menu"
                  fill="#D9C5AA"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="orders_created"
                  name="Order Dibuat"
                  fill="#3B2922"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <div>
            <h2 className="text-base font-bold text-nav-espresso">
              Omzet Aktual per Jam Operasional
            </h2>
            <p className="text-xs text-text-muted">
              Akumulasi nilai transaksi lunas per jam
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "#7A6757" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#7A6757" }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(val: any) => [
                    formatRupiah(Number(val)),
                    "Omzet Lunas",
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFCF7",
                    borderColor: "#D9C5AA",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Omzet (Rp)"
                  fill="#A3593A"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Bottom Row: Product Performance & 9-Table Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <h2 className="text-base font-bold text-nav-espresso">
            Performa Produk (Kuantitas &amp; Omzet Aktual)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3 text-right">Terjual</th>
                  <th className="py-2.5 px-3 text-right">Kontribusi Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {products.map((p: any) => (
                  <tr key={p.name}>
                    <td className="py-2.5 px-3 font-bold text-nav-espresso">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {p.total_qty} porsi
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary-container tabular-nums">
                      {formatRupiah(p.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-6 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <h2 className="text-base font-bold text-nav-espresso">
            Pemanfaatan 9 Meja &amp; Durasi Sesi
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-2.5 px-3">Meja</th>
                  <th className="py-2.5 px-3 text-right">Order Lunas</th>
                  <th className="py-2.5 px-3 text-right">Rata-rata Durasi</th>
                  <th className="py-2.5 px-3 text-right">Omzet Meja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {tables.map((t: any) => (
                  <tr key={t.table_code}>
                    <td className="py-2.5 px-3 font-bold text-nav-espresso">
                      {t.table_name} ({t.table_code})
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {t.paid_orders_count} order
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-muted tabular-nums">
                      {t.avg_session_minutes
                        ? `${t.avg_session_minutes} mnt`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary-container tabular-nums">
                      {formatRupiah(t.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
