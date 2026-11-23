"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  apiFetch,
  formatDateTimeWIB,
  formatRupiah,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/lib/api";
import { Search, Eye, CheckCircle2 } from "lucide-react";

export default function CashierPaymentsHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const loadOrders = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (paymentFilter !== "ALL") params.set("payment_status", paymentFilter);
    if (search.trim()) params.set("search", search.trim());

    apiFetch(`/cashier/orders?${params.toString()}`)
      .then((res) => setOrders(res.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [paymentFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-nav-espresso">
            Riwayat Transaksi &amp; Verifikasi Pembayaran
          </h1>
          <p className="text-xs text-text-muted">
            Daftar seluruh transaksi QR meja dan POS manual beserta status pembayaran
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadOrders();
          }}
          className="flex gap-2"
        >
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari #order, meja..."
              className="h-10 pl-9 pr-3 rounded-xl bg-surface-cream border border-border-sand text-xs"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-nav-espresso text-canvas-cream text-xs font-bold cursor-pointer"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "ALL", label: "Semua Status" },
          { id: "PROOF_UPLOADED", label: "Bukti QRIS Diunggah" },
          { id: "UNPAID", label: "Belum Dibayar" },
          { id: "PAID", label: "Lunas" },
          { id: "REJECTED", label: "Ditolak" },
          { id: "REFUNDED", label: "Refund" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setPaymentFilter(f.id)}
            className={`h-9 px-3.5 rounded-full text-xs font-bold cursor-pointer ${
              paymentFilter === f.id
                ? "bg-nav-espresso text-canvas-cream"
                : "bg-surface-variant text-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-cream border border-border-sand rounded-2xl overflow-hidden soft-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-text-muted uppercase border-b border-border-sand">
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Meja / Sumber</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4">Status Bayar</th>
                <th className="py-3.5 px-4">Status Order</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-text-muted">
                    Memuat riwayat transaksi...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-text-muted">
                    Belum ada transaksi pada filter ini.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const pBadge = getPaymentStatusLabel(ord.payment_status);
                  const oBadge = getOrderStatusLabel(ord.status);
                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-nav-espresso tabular-nums">
                        {ord.order_number}
                        <span className="block text-[10px] font-normal text-text-muted">
                          {ord.customer_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-muted tabular-nums">
                        {formatDateTimeWIB(ord.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {ord.table_name_snapshot}{" "}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-variant">
                          {ord.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">{ord.payment_method}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pBadge.bgClass} ${pBadge.textClass}`}
                        >
                          {pBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${oBadge.bgClass} ${oBadge.textClass}`}
                        >
                          {oBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-nav-espresso tabular-nums">
                        {formatRupiah(ord.total_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/cashier/orders/${ord.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-variant hover:bg-border-sand text-nav-espresso font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
