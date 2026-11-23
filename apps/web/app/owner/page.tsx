"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  apiFetch,
  formatRupiah,
  formatTimeWIB,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/lib/api";
import {
  TrendingUp,
  AlertTriangle,
  Star,
  FileBarChart,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function OwnerOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = () => {
    setLoading(true);
    apiFetch("/owner/dashboard")
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
        <div className="h-72 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
      </div>
    );
  }

  const kpis = data.kpis || {};
  const hourlySales = data.hourly_sales || [];
  const topProducts = data.top_products || [];
  const lowStock = data.low_stock_ingredients || [];
  const recentOrders = data.recent_orders || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
            Overview
          </h1>
          <p className="text-xs text-text-muted">
            Ringkasan operasional aktual hari ini ({kpis.date})
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className="h-10 px-3.5 rounded-xl bg-surface-cream border border-border-sand hover:bg-surface-variant text-xs font-bold text-nav-espresso flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* KPI Strip: Single Panel divided into 4 columns per Stitch Overview */}
      <section className="bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-0">
          {/* Col 1 */}
          <div className="flex flex-col justify-between md:pr-6">
            <span className="text-xs font-bold text-text-muted">
              Omzet hari ini
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-nav-espresso tabular-nums">
              {formatRupiah(kpis.today_revenue)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-tertiary font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>Total {kpis.all_time_paid_orders} transaksi lunas tercatat</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col justify-between md:px-6 md:border-l border-border-sand">
            <span className="text-xs font-bold text-text-muted">
              Order dibayar hari ini
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-nav-espresso tabular-nums">
              {kpis.today_paid_orders}
            </div>
            <div className="mt-2 text-xs text-text-muted tabular-nums">
              {kpis.today_pending_orders} menunggu • {kpis.today_cancelled_orders}{" "}
              dibatalkan
            </div>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col justify-between md:px-6 md:border-l border-border-sand">
            <span className="text-xs font-bold text-text-muted">
              Rata-rata transaksi (AOV)
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-nav-espresso tabular-nums">
              {formatRupiah(kpis.today_aov)}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Per struk lunas hari ini
            </div>
          </div>

          {/* Col 4 */}
          <div className="flex flex-col justify-between md:pl-6 md:border-l border-border-sand">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted">
                Saldo kas &amp; bank
              </span>
              <span className="px-2 py-0.5 rounded-full bg-warning-subtle text-warning text-[10px] font-bold">
                Bukan laba
              </span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-nav-espresso tabular-nums">
              {formatRupiah(kpis.total_cash_balance)}
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Akumulasi laci tunai &amp; rekening QRIS
            </div>
          </div>
        </div>
      </section>

      {/* Low Stock Alert Strip */}
      {lowStock.length > 0 && (
        <div className="p-4 rounded-2xl bg-warning-subtle border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-warning">
              <span className="font-bold block">
                Peringatan Stok Bahan Baku ({lowStock.length} bahan menipis/habis)
              </span>
              <span>
                {lowStock
                  .map(
                    (i: any) =>
                      `${i.name} (${i.display_current_stock} ${i.display_unit})`
                  )
                  .join(" • ")}
              </span>
            </div>
          </div>
          <Link
            href="/owner/inventory/ingredients"
            className="h-9 px-3.5 rounded-xl bg-nav-espresso text-canvas-cream text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>Kelola Stok &amp; Restock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Row: 2/3 Left (Omzet per jam) & 1/3 Right (Produk terlaris) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Omzet per jam (Recharts actual data) */}
        <div className="lg:col-span-2 bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-nav-espresso">
                Omzet per jam (08.00 – 22.00 WIB)
              </h2>
              <p className="text-xs text-text-muted">
                Dihitung langsung dari transaksi lunas pada database
              </p>
            </div>
            <Link
              href="/owner/analytics"
              className="text-xs font-bold text-primary-container hover:underline flex items-center gap-1"
            >
              <span>Analitik Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlySales}>
                <XAxis
                  dataKey="short_hour"
                  tick={{ fontSize: 11, fill: "#7A6757" }}
                  axisLine={{ stroke: "#D9C5AA" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#7A6757" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: any) => [
                    formatRupiah(Number(value)),
                    "Omzet Lunas",
                  ]}
                  labelFormatter={(label) => `Pukul ${label}.00 WIB`}
                  contentStyle={{
                    backgroundColor: "#FFFCF7",
                    borderColor: "#D9C5AA",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#A3593A"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Panel: Produk Terlaris */}
        <div className="bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-nav-espresso">
                Produk Terlaris
              </h2>
              <Link
                href="/owner/menu"
                className="text-xs font-bold text-primary-container hover:underline"
              >
                Kelola Menu
              </Link>
            </div>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-xs text-text-muted py-4">
                  Belum ada penjualan produk tercatat.
                </p>
              ) : (
                topProducts.map((p: any, idx: number) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-2 pb-2.5 border-b border-surface-variant last:border-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-primary-subtle text-on-primary-subtle text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-nav-espresso truncate block">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-text-muted tabular-nums">
                          {p.total_qty} porsi terjual
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary-container tabular-nums shrink-0">
                      {formatRupiah(p.total_revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Status Cards */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-surface-variant">
            <Link
              href="/owner/reports"
              className="p-3 rounded-xl bg-canvas-cream border border-border-sand hover:border-primary-container text-xs"
            >
              <div className="flex items-center gap-1 text-text-muted">
                <FileBarChart className="w-3.5 h-3.5 text-primary-container" />
                <span>Laporan Shift</span>
              </div>
              <span className="text-sm font-bold text-nav-espresso mt-1 block">
                {kpis.pending_reports_count} Perlu Tinjau
              </span>
            </Link>
            <Link
              href="/owner/ratings"
              className="p-3 rounded-xl bg-canvas-cream border border-border-sand hover:border-primary-container text-xs"
            >
              <div className="flex items-center gap-1 text-text-muted">
                <Star className="w-3.5 h-3.5 text-accent-terracotta fill-accent-terracotta" />
                <span>Rating</span>
              </div>
              <span className="text-sm font-bold text-nav-espresso mt-1 block tabular-nums">
                {kpis.avg_rating || "0.0"} / 5 ({kpis.total_ratings})
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom Row: Recent Orders Table */}
      <section className="bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-nav-espresso">
              Transaksi Terbaru
            </h2>
            <p className="text-xs text-text-muted">
              Pesanan QR meja dan POS manual yang masuk ke antrean kasir
            </p>
          </div>
          <Link
            href="/owner/orders"
            className="text-xs font-bold text-primary-container hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Meja / Sumber</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Status Order</th>
                <th className="py-3 px-4">Pembayaran</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {recentOrders.map((ord: any) => {
                const sBadge = getOrderStatusLabel(ord.status);
                const pBadge = getPaymentStatusLabel(ord.payment_status);
                return (
                  <tr key={ord.id}>
                    <td className="py-3 px-4 font-bold text-nav-espresso tabular-nums">
                      {ord.order_number}
                      <span className="block text-[10px] font-normal text-text-muted">
                        {formatTimeWIB(ord.created_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {ord.table_name_snapshot} ({ord.source})
                    </td>
                    <td className="py-3 px-4">{ord.customer_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sBadge.bgClass} ${sBadge.textClass}`}
                      >
                        {sBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pBadge.bgClass} ${pBadge.textClass}`}
                      >
                        {ord.payment_method}: {pBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-nav-espresso tabular-nums">
                      {formatRupiah(ord.total_amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
