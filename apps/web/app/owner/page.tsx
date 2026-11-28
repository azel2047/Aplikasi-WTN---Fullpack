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
  Target,
  Bell,
  BellRing,
  Volume2,
  CheckCircle2,
} from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function playTargetChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.11);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.11 + 0.35
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.11);
      osc.stop(ctx.currentTime + i * 0.11 + 0.36);
    });
  } catch {
    // Ignore autoplay restriction errors
  }
}

export default function OwnerOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetInput, setTargetInput] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNotice, setPushNotice] = useState<string | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    apiFetch("/owner/dashboard")
      .then((res) => {
        setData(res);
        if (res?.kpis?.daily_revenue_target !== undefined) {
          setTargetInput(String(res.kpis.daily_revenue_target));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushSubscribed(Boolean(sub)))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!data?.kpis?.daily_target_reached || !data?.kpis?.date) return;
    const key = `wtn_target_chime_${data.kpis.date}`;
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      playTargetChime();
    }
  }, [data]);

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(String(targetInput).replace(/\D/g, ""));
    if (!Number.isFinite(numeric) || numeric < 0) return;
    setSavingTarget(true);
    setPushNotice(null);
    try {
      const res = await apiFetch("/owner/target", {
        method: "POST",
        body: JSON.stringify({ daily_revenue_target: numeric }),
      });
      setPushNotice(res.message);
      loadDashboard();
    } catch (err: any) {
      setPushNotice(err.message || "Gagal menyimpan target harian.");
    } finally {
      setSavingTarget(false);
    }
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    setPushNotice(null);
    try {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setPushNotice(
          "Browser belum mendukung Web Push. Di iPhone/iPad, silakan install web ini dulu lewat Share → Add to Home Screen lalu buka dari ikon layar utama."
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushNotice(
          "Izin notifikasi ditolak. Aktifkan izin notifikasi di pengaturan browser/HP untuk menerima alarm target."
        );
        return;
      }

      const { publicKey } = await apiFetch("/owner/push/vapid-key");
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await apiFetch("/owner/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setPushSubscribed(true);
      setPushNotice(res.message);
      loadDashboard();
    } catch (err: any) {
      setPushNotice(
        err?.message ||
          "Gagal mengaktifkan notifikasi HP. Pastikan diakses via HTTPS atau PWA terinstall."
      );
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestSoundAndPush = async () => {
    playTargetChime();
    setPushBusy(true);
    setPushNotice(null);
    try {
      const res = await apiFetch("/owner/push/test", { method: "POST" });
      setPushNotice(res.message);
    } catch (err: any) {
      setPushNotice(
        err?.message || "Bunyi tes diputar (notifikasi HP belum diaktifkan)."
      );
    } finally {
      setPushBusy(false);
    }
  };

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
  const dailyTarget = Number(kpis.daily_revenue_target || 0);
  const targetPct =
    dailyTarget > 0
      ? Math.min(100, Math.round((Number(kpis.today_revenue || 0) / dailyTarget) * 100))
      : 0;

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

      {/* Daily Revenue Target & PWA Push Notification Card */}
      <section className="bg-surface-cream border border-border-sand rounded-[20px] p-5 soft-shadow space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Target className="w-4 h-4 text-primary-container" />
              <h2 className="text-sm font-bold text-nav-espresso">
                Target Omzet Harian &amp; Notifikasi HP
              </h2>
              {kpis.daily_target_reached ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-subtle text-tertiary text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Target Tercapai!
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-variant text-text-muted text-[11px] font-bold tabular-nums">
                  {targetPct}% tercapai
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted">
              Omzet hari ini{" "}
              <strong className="text-nav-espresso tabular-nums">
                {formatRupiah(kpis.today_revenue)}
              </strong>{" "}
              dari target{" "}
              <strong className="text-nav-espresso tabular-nums">
                {formatRupiah(dailyTarget)}
              </strong>
              . HP owner otomatis berbunyi saat target tersentuh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSaveTarget} className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="h-10 w-36 pl-9 pr-3 rounded-xl bg-canvas-cream border border-border-sand text-xs font-bold text-nav-espresso tabular-nums focus:outline-none focus:border-primary-container"
                  placeholder="500000"
                />
              </div>
              <button
                type="submit"
                disabled={savingTarget}
                className="h-10 px-3.5 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingTarget ? "Menyimpan..." : "Simpan Target"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushBusy}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                pushSubscribed
                  ? "bg-success-subtle text-tertiary"
                  : "bg-primary-container hover:bg-primary-hover text-on-primary"
              }`}
            >
              {pushSubscribed ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>
                {pushSubscribed
                  ? `Notifikasi HP Aktif (${kpis.push_subscriptions_count || 1})`
                  : "Aktifkan Notifikasi HP"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestSoundAndPush}
              disabled={pushBusy}
              className="h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand hover:bg-surface-variant text-nav-espresso text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4" />
              <span>Tes Bunyi</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-surface-variant overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-container transition-all duration-500"
            style={{ width: `${targetPct}%` }}
          />
        </div>

        {pushNotice && (
          <div className="text-xs font-semibold text-tertiary bg-success-subtle px-3.5 py-2.5 rounded-xl">
            {pushNotice}
          </div>
        )}
      </section>

      {/* Low Stock Alert Strip */}
      {lowStock.length > 0 && (
        <div className="p-4 rounded-2xl bg-warning-subtle border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-warning min-w-0 flex-1 break-words">
              <span className="font-bold block">
                Stok Bahan Menipis ({lowStock.length} bahan)
              </span>
              <span className="block leading-relaxed">
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
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
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
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E5E7EB",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#10A352"
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
                <span>Laporan Harian</span>
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
