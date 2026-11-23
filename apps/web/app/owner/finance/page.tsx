"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, formatDateTimeWIB, formatRupiah } from "@/lib/api";
import {
  Info,
  Download,
  Lock,
  CheckCircle2,
  PlusCircle,
  Wallet,
} from "lucide-react";

export default function OwnerFinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "summary" | "cashflow" | "closings"
  >("summary");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadFinance = () => {
    setLoading(true);
    apiFetch("/owner/finance/cash-flow")
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const handleLockClosing = async (closing: any) => {
    try {
      const res = await apiFetch(`/owner/closings/${closing.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "LOCKED",
          owner_notes: "Direkonsiliasi dan dikunci oleh Owner.",
        }),
      });
      setFeedback(res.message);
      loadFinance();
    } catch (err: any) {
      alert(err.message);
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

  const pnl = data.profit_and_loss || {};
  const cashPos = data.cash_position_and_inventory_outflow || {};
  const transactions = data.cash_transactions || [];
  const closings = data.closings || [];

  return (
    <div className="space-y-6">
      {/* Header matching Stitch Keuangan */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
              Keuangan
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-subtle text-tertiary text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Buku Seimbang</span>
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Pantau laba rugi operasional, pembukuan HPP resep, dan rekonsiliasi
            arus kas warkop tanpa double-counting (AC-23).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/v1/owner/exports?type=sales&format=csv"
            className="h-11 px-4 rounded-xl bg-surface-cream border border-border-sand text-xs font-bold text-nav-espresso flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-primary-container" />
            <span>Ekspor CSV Penjualan</span>
          </a>
          <Link
            href="/owner/expenses"
            className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Kelola Pengeluaran</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-border-sand">
        {[
          { id: "summary", label: "Ringkasan Laba/Rugi & Posisi Kas" },
          { id: "cashflow", label: "Mutasi Arus Kas" },
          { id: "closings", label: "Penutupan Kas (Closing Kasir)" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === t.id
                ? "border-primary-container text-primary-container"
                : "border-transparent text-text-muted hover:text-nav-espresso"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Accounting Callout Banner (AC-23) */}
      <div className="p-4 rounded-2xl bg-warning-subtle/80 border border-warning/30 flex items-start gap-3 text-xs text-warning">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">
            Prinsip Akuntansi Warkop: HPP Resep vs Pembelian Bahan &amp; Saldo Kas
          </span>
          <p className="mt-0.5 leading-relaxed">
            Pembelian bahan baku (PO) dicatat sebagai arus kas keluar dan
            penambah persediaan gudang, <strong>tidak</strong> langsung dihitung
            penuh sebagai HPP agar tidak terjadi double-counting. HPP hanya
            dihitung dari takaran resep produk yang benar-benar terjual. Saldo
            kas juga bukan sinonim laba.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold">
          {feedback}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Operating Profit & Loss Statement */}
          <div className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
            <div className="flex items-center justify-between border-b border-surface-variant pb-3">
              <div>
                <h2 className="text-base font-bold text-nav-espresso">
                  Ringkasan Laba / Rugi Operasional
                </h2>
                <p className="text-xs text-text-muted">
                  Periode {data.period?.start_date} s/d {data.period?.end_date}
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-variant text-secondary">
                {pnl.paid_transactions_count} Transaksi Lunas
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-cream border border-border-sand">
                <div>
                  <span className="text-sm font-bold text-nav-espresso block">
                    Penjualan (Omzet Lunas)
                  </span>
                  <span className="text-text-muted">
                    Tunai: {formatRupiah(pnl.cash_sales_revenue)} • QRIS:{" "}
                    {formatRupiah(pnl.qris_sales_revenue)}
                  </span>
                </div>
                <span className="text-base font-bold text-nav-espresso tabular-nums">
                  {formatRupiah(pnl.gross_sales_revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-cream border border-border-sand">
                <div>
                  <span className="text-sm font-bold text-nav-espresso block">
                    HPP Terpakai (Konsumsi Resep Menu Terjual)
                  </span>
                  <span className="text-text-muted">
                    Biaya bahan baku yang benar-benar dikonsumsi untuk order lunas
                  </span>
                </div>
                <span className="text-base font-bold text-error tabular-nums">
                  −{formatRupiah(pnl.recipe_cogs_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-cream border border-border-sand">
                <div>
                  <span className="text-sm font-bold text-nav-espresso block">
                    Biaya Operasional Toko
                  </span>
                  <span className="text-text-muted">
                    Gas elpiji, listrik, kebersihan, dan operasional non-bahan
                    baku
                  </span>
                </div>
                <span className="text-base font-bold text-error tabular-nums">
                  −{formatRupiah(pnl.operating_expenses_amount)}
                </span>
              </div>

              {pnl.refunds_amount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="font-bold text-nav-espresso">
                    Total Refund Tercatat
                  </span>
                  <span className="font-bold text-error tabular-nums">
                    {formatRupiah(pnl.refunds_amount)}
                  </span>
                </div>
              )}

              {/* Highlight Net Operating Profit */}
              <div className="p-4 rounded-2xl bg-success-subtle border border-tertiary/30 flex items-center justify-between">
                <div>
                  <span className="text-base font-bold text-nav-espresso block">
                    Laba / Rugi Operasional Bersih
                  </span>
                  <span className="text-xs text-tertiary">
                    Penjualan − HPP Resep − Biaya Operasional
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-tertiary tabular-nums block">
                    {formatRupiah(pnl.operating_profit_amount)}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-tertiary text-surface-cream">
                    Margin {pnl.operating_margin_percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Separate Cash Position & Inventory Outflow (Outside P&L) */}
          <aside className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
            <div>
              <h2 className="text-base font-bold text-nav-espresso">
                Di Luar Laba / Rugi (Posisi Kas &amp; Belanja Persediaan)
              </h2>
              <p className="text-xs text-text-muted">
                Dipisahkan secara tegas dari perhitungan laba operasional
              </p>
            </div>

            <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Total Pembelian Persediaan Bahan (PO)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface-variant text-secondary text-[10px] font-bold">
                  Arus Kas Keluar
                </span>
              </div>
              <span className="text-lg font-bold text-nav-espresso tabular-nums block">
                {formatRupiah(cashPos.stock_purchases_outflow_amount)}
              </span>
              <p className="text-[11px] text-text-muted leading-snug">
                Belanja restock bahan baku yang masih tersimpan sebagai nilai
                persediaan di gudang.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Total Saldo Kas &amp; Bank Tersedia
                </span>
                <span className="px-2 py-0.5 rounded-full bg-warning-subtle text-warning text-[10px] font-bold">
                  Bukan Laba
                </span>
              </div>
              <span className="text-xl font-bold text-nav-espresso tabular-nums block">
                {formatRupiah(cashPos.total_cash_and_bank_balance)}
              </span>

              <div className="space-y-1.5 pt-2 border-t border-border-sand/60 text-xs">
                {cashPos.cash_accounts?.map((acc: any) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-secondary flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-primary-container" />
                      {acc.name}
                    </span>
                    <span className="font-bold text-nav-espresso tabular-nums">
                      {formatRupiah(acc.current_balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div className="bg-surface-cream border border-border-sand rounded-2xl overflow-hidden soft-shadow">
          <div className="p-5 border-b border-surface-variant">
            <h2 className="text-base font-bold text-nav-espresso">
              Buku Besar Mutasi Arus Kas &amp; Bank
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Akun Kas</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {transactions.map((trx: any) => (
                  <tr key={trx.id}>
                    <td className="py-3 px-4 text-text-muted tabular-nums">
                      {formatDateTimeWIB(trx.occurred_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-nav-espresso">
                      {trx.cash_account?.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          trx.direction === "IN"
                            ? "bg-success-subtle text-tertiary"
                            : "bg-error-subtle text-error"
                        }`}
                      >
                        {trx.direction} • {trx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {trx.description}
                      <span className="block text-[10px] text-text-muted">
                        Actor: {trx.actor_name}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold tabular-nums ${
                        trx.direction === "IN" ? "text-tertiary" : "text-error"
                      }`}
                    >
                      {trx.direction === "IN" ? "+" : "−"}
                      {formatRupiah(trx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums">
                      {formatRupiah(trx.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "closings" && (
        <div className="bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <h2 className="text-base font-bold text-nav-espresso">
            Tinjauan &amp; Penguncian Penutupan Kas (Closing Kasir)
          </h2>
          {closings.length === 0 ? (
            <p className="text-xs text-text-muted">
              Belum ada rekap closing kasir yang dikirim.
            </p>
          ) : (
            <div className="space-y-3">
              {closings.map((cls: any) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl bg-canvas-cream border border-border-sand flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-nav-espresso">
                        {cls.closing_code} •{" "}
                        {String(cls.closing_date).slice(0, 10)} ({cls.shift_name}
                        )
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          cls.status === "LOCKED"
                            ? "bg-success-subtle text-tertiary"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {cls.status}
                      </span>
                    </div>
                    <p className="text-text-muted">
                      Petugas: <strong>{cls.actor_name}</strong> • Seharusnya:{" "}
                      {formatRupiah(cls.expected_closing_cash)} • Fisik:{" "}
                      {formatRupiah(cls.actual_Physical_cash)} • Selisih:{" "}
                      <strong
                        className={
                          cls.variance_amount === 0
                            ? "text-tertiary"
                            : "text-error"
                        }
                      >
                        {formatRupiah(cls.variance_amount)}
                      </strong>
                    </p>
                    {cls.variance_reason && (
                      <p className="italic text-on-surface-variant">
                        Alasan: &ldquo;{cls.variance_reason}&rdquo;
                      </p>
                    )}
                  </div>

                  {cls.status !== "LOCKED" && (
                    <button
                      type="button"
                      onClick={() => handleLockClosing(cls)}
                      className="h-10 px-4 rounded-xl bg-nav-espresso text-canvas-cream font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Closing Ini</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
