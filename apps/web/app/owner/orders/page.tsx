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
import { Search, Download, FileText, XCircle, RotateCcw } from "lucide-react";

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOrders = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    apiFetch(`/cashier/orders?${params.toString()}`)
      .then((res) => {
        const list = res.orders || [];
        setOrders(list);
        if (list.length > 0 && !selectedOrder) setSelectedOrder(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleOwnerRefund = async (order: any) => {
    const reason = window.prompt(
      `Masukkan alasan pembatalan / refund untuk Order ${order.order_number}:`,
      "Koreksi transaksi oleh Owner"
    );
    if (!reason) return;

    try {
      const res = await apiFetch(`/cashier/orders/${order.id}/refund`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          pin: "9999",
          restore_stock: true,
        }),
      });
      setFeedback(res.message);
      setSelectedOrder(res.order);
      loadOrders();
    } catch (err: any) {
      alert(err.message || "Gagal memproses refund.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso">
            Daftar Transaksi &amp; Pesanan
          </h1>
          <p className="text-xs text-text-muted">
            Audit seluruh transaksi QR meja dan POS manual, catatan item, HPP resep, dan refund
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/v1/owner/exports?type=sales&format=csv"
            className="h-11 px-4 rounded-xl bg-surface-cream border border-border-sand hover:bg-surface-variant text-xs font-bold text-nav-espresso flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-primary-container" />
            <span>Ekspor CSV Penjualan (AC-35)</span>
          </a>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold">
          {feedback}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "Semua" },
            { id: "NEW", label: "Menunggu" },
            { id: "PREPARING", label: "Diracik" },
            { id: "READY", label: "Siap" },
            { id: "COMPLETED", label: "Selesai" },
            { id: "CANCELLED", label: "Dibatalkan" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusFilter(t.id)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold cursor-pointer ${
                statusFilter === t.id
                  ? "bg-nav-espresso text-canvas-cream"
                  : "bg-surface-variant text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
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

      {/* Split Table & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-surface-cream border border-border-sand rounded-2xl overflow-hidden soft-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Meja / Sumber</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Pembayaran</th>
                  <th className="py-3.5 px-4 text-right">HPP Resep</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-text-muted">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    const sBadge = getOrderStatusLabel(ord.status);
                    const pBadge = getPaymentStatusLabel(ord.payment_status);
                    const isSel = selectedOrder?.id === ord.id;
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className={`cursor-pointer transition-colors ${
                          isSel
                            ? "bg-secondary-container/40 font-semibold"
                            : "hover:bg-surface-container-low/60"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-nav-espresso tabular-nums">
                          {ord.order_number}
                          <span className="block text-[10px] font-normal text-text-muted">
                            {formatDateTimeWIB(ord.created_at)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {ord.table_name_snapshot} ({ord.source})
                          <span className="block text-[10px] text-text-muted">
                            {ord.customer_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${sBadge.bgClass} ${sBadge.textClass}`}
                          >
                            {sBadge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${pBadge.bgClass} ${pBadge.textClass}`}
                          >
                            {ord.payment_method}: {pBadge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-text-muted tabular-nums">
                          {formatRupiah(ord.cogs_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-nav-espresso tabular-nums">
                          {formatRupiah(ord.total_amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Panel */}
        <aside className="lg:col-span-4 bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-4">
          {!selectedOrder ? (
            <p className="text-xs text-text-muted">
              Pilih baris transaksi untuk melihat rincian.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div>
                  <h2 className="text-lg font-bold text-nav-espresso tabular-nums">
                    Order {selectedOrder.order_number}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {selectedOrder.table_name_snapshot} • {selectedOrder.public_code}
                  </p>
                </div>
                <Link
                  href={`/order/${selectedOrder.public_code}`}
                  target="_blank"
                  className="text-xs font-bold text-primary-container hover:underline"
                >
                  Struk Publik →
                </Link>
              </div>

              <div className="space-y-2">
                {selectedOrder.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-canvas-cream border border-border-sand text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold text-nav-espresso">
                      <span>
                        {item.quantity}x {item.product_name_snapshot}
                      </span>
                      <span className="tabular-nums">
                        {formatRupiah(item.line_total)}
                      </span>
                    </div>
                    {item.item_note && (
                      <div className="flex items-center gap-1 text-on-primary-subtle font-medium">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>&ldquo;{item.item_note}&rdquo;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Total Tagihan</span>
                  <span className="font-bold tabular-nums">
                    {formatRupiah(selectedOrder.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>HPP Resep Terpakai</span>
                  <span className="tabular-nums">
                    {formatRupiah(selectedOrder.cogs_amount)}
                  </span>
                </div>
              </div>

              {selectedOrder.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => handleOwnerRefund(selectedOrder)}
                  className="w-full h-11 rounded-xl bg-error-subtle hover:bg-error/20 text-error text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Batalkan / Refund Transaksi (Owner)</span>
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
