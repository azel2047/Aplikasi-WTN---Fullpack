"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  apiFetch,
  formatDateTimeWIB,
  formatRupiah,
  formatTimeWIB,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/lib/api";
import {
  Search,
  RefreshCw,
  QrCode,
  Monitor,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  Bell,
  Wallet,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  RotateCcw,
  Printer,
} from "lucide-react";
import { ThermalReceipt } from "@/components/ThermalReceipt";

export default function CashierOrdersQueuePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({
    new: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
    proof_uploaded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Payment Verification Modal state
  const [paymentModalOrder, setPaymentModalOrder] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<"CASH" | "QRIS">("CASH");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejectingProof, setIsRejectingProof] = useState(false);

  // Sensitive Cancel / Refund Modal state (Requires PIN + Reason)
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [sensitivePin, setSensitivePin] = useState<string>("1234");
  const [restoreStockOnCancel, setRestoreStockOnCancel] = useState<boolean>(true);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await apiFetch(`/cashier/orders?${params.toString()}`);
        const list = res.orders || [];
        setOrders(list);
        if (res.counts) setCounts(res.counts);

        setSelectedOrderId((prev) => {
          if (prev && list.some((o: any) => o.id === prev)) return prev;
          return list.length > 0 ? list[0].id : null;
        });
      } catch (err: any) {
        if (!silent) setErrorMsg(err.message || "Gagal memuat antrean pesanan.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [statusFilter, searchQuery]
  );

  useEffect(() => {
    fetchQueue(false);
    const interval = setInterval(() => fetchQueue(true), 6000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || orders[0] || null;

  const openPaymentModal = (order: any) => {
    setPaymentModalOrder(order);
    setPayMethod(order.payment_method === "QRIS" ? "QRIS" : "CASH");
    setCashTendered(String(order.total_amount));
    setRejectReason("");
    setIsRejectingProof(false);
    setErrorMsg(null);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder || actionLoading) return;

    setActionLoading(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    try {
      const payload = isRejectingProof
        ? {
            action: "REJECT_PROOF",
            rejection_reason: rejectReason.trim(),
          }
        : {
            action: "VERIFY_PAID",
            method: payMethod,
            amount_received:
              payMethod === "CASH"
                ? Number(cashTendered || 0)
                : paymentModalOrder.total_amount,
          };

      const res = await apiFetch(
        `/cashier/orders/${paymentModalOrder.id}/payments`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      setFeedbackMsg(res.message);
      setPaymentModalOrder(null);
      await fetchQueue(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses pembayaran.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusTransition = async (orderId: number, nextStatus: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    try {
      const res = await apiFetch(`/cashier/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setFeedbackMsg(res.message);
      await fetchQueue(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui status pesanan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder || actionLoading) return;

    setActionLoading(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    try {
      const res = await apiFetch(
        `/cashier/orders/${cancelModalOrder.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "CANCELLED",
            reason: cancelReason.trim(),
            pin: sensitivePin.trim(),
            restore_stock: restoreStockOnCancel,
          }),
        }
      );
      setFeedbackMsg(res.message);
      setCancelModalOrder(null);
      setCancelReason("");
      await fetchQueue(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membatalkan pesanan.");
    } finally {
      setActionLoading(false);
    }
  };

  const tenderAmountNum = Number(cashTendered || 0);
  const dueAmountNum = Number(paymentModalOrder?.total_amount || 0);
  const calculatedChange = Math.max(0, tenderAmountNum - dueAmountNum);

  return (
    <div className="space-y-5">
      {/* Top Filter & Search Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: "Semua Antrean", count: null },
            { id: "NEW", label: "Baru / Menunggu", count: counts.new },
            { id: "PREPARING", label: "Sedang Diracik", count: counts.preparing },
            { id: "READY", label: "Siap Disajikan", count: counts.ready },
            { id: "COMPLETED", label: "Selesai", count: counts.completed },
            { id: "CANCELLED", label: "Dibatalkan", count: counts.cancelled },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`h-10 px-4 rounded-full text-xs font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
                  active
                    ? "bg-nav-espresso text-canvas-cream shadow-sm"
                    : "bg-surface-variant text-on-surface-variant hover:bg-border-sand/50"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums ${
                      active
                        ? "bg-primary-container text-on-primary"
                        : "bg-border-sand text-nav-espresso"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari #order, meja, pelanggan..."
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-cream border border-border-sand text-xs text-on-surface focus:outline-none focus:border-primary-container"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchQueue(false)}
            className="h-11 px-3.5 rounded-xl bg-surface-cream border border-border-sand hover:bg-surface-variant text-nav-espresso text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback & Error Alerts */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-subtle text-error text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Split View: Orders Grid (Left) + Active Order Detail Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Orders Stream Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-surface-cream border border-border-sand animate-pulse p-5"
              />
            ))
          ) : orders.length === 0 ? (
            <div className="md:col-span-2 bg-surface-cream border border-border-sand rounded-2xl p-10 text-center space-y-2">
              <p className="text-base font-bold text-nav-espresso">
                Tidak ada pesanan pada filter ini
              </p>
              <p className="text-xs text-text-muted">
                Pesanan baru dari QR meja maupun POS manual akan otomatis muncul di
                sini.
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id;
              const statusBadge = getOrderStatusLabel(ord.status);
              const payBadge = getPaymentStatusLabel(ord.payment_status);
              const firstNoteItem = ord.items?.find((i: any) => i.item_note);

              return (
                <article
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`p-5 rounded-2xl bg-surface-cream border transition-all cursor-pointer flex flex-col justify-between gap-4 soft-shadow ${
                    isSelected
                      ? "border-nav-espresso ring-2 ring-nav-espresso"
                      : "border-border-sand hover:border-primary-container"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-lg font-bold text-nav-espresso tabular-nums">
                          {ord.order_number}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-surface-variant text-nav-espresso text-xs font-bold">
                          {ord.table_name_snapshot}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                            ord.source === "QR"
                              ? "bg-primary-subtle text-on-primary-subtle"
                              : "bg-secondary-container text-on-secondary-fixed"
                          }`}
                        >
                          {ord.source === "QR" ? (
                            <QrCode className="w-3 h-3" />
                          ) : (
                            <Monitor className="w-3 h-3" />
                          )}
                          <span>{ord.source}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted tabular-nums shrink-0">
                        {formatTimeWIB(ord.created_at)}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="space-y-1 text-xs">
                      {ord.items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-on-surface"
                        >
                          <span className="truncate pr-2">
                            <strong className="text-primary-container font-bold tabular-nums">
                              {item.quantity}x
                            </strong>{" "}
                            {item.product_name_snapshot}
                          </span>
                          <span className="text-text-muted tabular-nums shrink-0">
                            {formatRupiah(item.line_total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Highlight Per-Item Note Snippet (AC-07) */}
                    {firstNoteItem && (
                      <div className="p-2.5 rounded-xl bg-surface-variant flex items-center gap-2 text-xs text-on-surface-variant">
                        <FileText className="w-4 h-4 text-primary-container shrink-0" />
                        <span className="truncate font-medium">
                          {firstNoteItem.item_note}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-surface-variant space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-[11px] text-text-muted block">
                          Total ({ord.payment_method})
                        </span>
                        <span className="text-base font-bold text-nav-espresso tabular-nums">
                          {formatRupiah(ord.total_amount)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${payBadge.bgClass} ${payBadge.textClass}`}
                        >
                          {payBadge.label}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge.bgClass} ${statusBadge.textClass}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>

                    {ord.payment_status !== "PAID" &&
                      ord.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentModal(ord);
                          }}
                          className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {ord.payment_status === "PROOF_UPLOADED"
                              ? "Verifikasi Bukti QRIS"
                              : `Terima Pembayaran (${ord.payment_method})`}
                          </span>
                        </button>
                      )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Active Order Detail Inspector Panel */}
        <aside className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-5 sm:p-6 soft-shadow sticky top-20 space-y-5">
          {!selectedOrder ? (
            <div className="py-12 text-center text-xs text-text-muted">
              Pilih salah satu kartu pesanan di sebelah kiri untuk melihat detail,
              catatan item, dan aksi kasir.
            </div>
          ) : (
            <>
              {/* Inspector Header */}
              <div className="flex items-start justify-between gap-3 border-b border-surface-variant pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-nav-espresso tabular-nums">
                      Order {selectedOrder.order_number}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg bg-nav-espresso text-canvas-cream text-xs font-bold">
                      {selectedOrder.table_name_snapshot}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Pelanggan:{" "}
                    <strong className="text-on-surface">
                      {selectedOrder.customer_name || "Pelanggan"}
                    </strong>{" "}
                    • {formatDateTimeWIB(selectedOrder.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setReceiptOrder(selectedOrder)}
                    className="h-9 px-3 rounded-lg bg-[#E8F7F0] hover:bg-[#d5f2e4] text-[#0D7A3E] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Struk</span>
                  </button>
                  <Link
                    href={`/order/${selectedOrder.public_code}`}
                    target="_blank"
                    className="h-9 px-3 rounded-lg bg-surface-variant hover:bg-border-sand/60 text-nav-espresso text-xs font-semibold flex items-center gap-1"
                  >
                    <span>Lacak</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Status & Payment Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="text-[11px] text-text-muted block">
                    Status Pesanan
                  </span>
                  <span className="text-xs font-bold text-nav-espresso mt-0.5 block">
                    {getOrderStatusLabel(selectedOrder.status).label}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="text-[11px] text-text-muted block">
                    Pembayaran ({selectedOrder.payment_method})
                  </span>
                  <span className="text-xs font-bold text-nav-espresso mt-0.5 block">
                    {getPaymentStatusLabel(selectedOrder.payment_status).label}
                  </span>
                </div>
              </div>

              {/* QRIS Payment Proof Notice if uploaded */}
              {selectedOrder.latest_payment?.proof_reference && (
                <div className="p-3.5 rounded-xl bg-warning-subtle/70 border border-warning/30 text-xs space-y-1.5">
                  <div className="font-bold text-warning flex items-center justify-between">
                    <span>Bukti Pembayaran QRIS Pelanggan</span>
                    <span>{selectedOrder.payment_status}</span>
                  </div>
                  <p className="font-mono text-on-surface bg-surface-cream p-2 rounded-lg">
                    {selectedOrder.latest_payment.proof_reference}
                  </p>
                  <p className="text-[11px] text-warning">
                    Verifikasi mutasi merchant secara manual sebelum menekan tombol
                    &ldquo;Tandai Lunas&rdquo;.
                  </p>
                </div>
              )}

              {/* Full Item List with Prominent Per-Item Notes (AC-07) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-nav-espresso uppercase tracking-wider">
                    Rincian Item &amp; Catatan Dapur ({selectedOrder.items?.length || 0})
                  </h3>
                  {selectedOrder.stock_deducted && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-success-subtle text-tertiary font-semibold">
                      Stok Resep Terpotong ✓
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-canvas-cream border border-border-sand space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-bold text-primary-container tabular-nums">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="text-sm font-bold text-nav-espresso block leading-snug">
                              {item.product_name_snapshot}
                            </span>
                            {item.options?.length > 0 && (
                              <span className="text-xs text-secondary block mt-0.5">
                                {item.options
                                  .map(
                                    (o: any) =>
                                      `${o.option_name_snapshot}: ${o.option_value_snapshot}`
                                  )
                                  .join(" • ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-nav-espresso tabular-nums">
                          {formatRupiah(item.line_total)}
                        </span>
                      </div>

                      {/* Prominent Item Note for Barista/Kitchen */}
                      {item.item_note ? (
                        <div className="p-2.5 rounded-lg bg-primary-subtle text-on-primary-subtle text-xs font-semibold flex items-start gap-2">
                          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Catatan Item: &ldquo;{item.item_note}&rdquo;</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-text-muted italic pl-6">
                          Tanpa catatan khusus
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand space-y-1.5 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="font-semibold tabular-nums">
                    {formatRupiah(selectedOrder.subtotal_amount)}
                  </span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-tertiary">
                    <span>Diskon</span>
                    <span className="font-semibold tabular-nums">
                      −{formatRupiah(selectedOrder.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant">
                  <span>PB1 (10%)</span>
                  <span className="font-semibold tabular-nums">
                    {formatRupiah(selectedOrder.tax_amount)}
                  </span>
                </div>
                <div className="border-t border-border-sand pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-nav-espresso">
                    Total Tagihan
                  </span>
                  <span className="text-lg font-bold text-primary-container tabular-nums">
                    {formatRupiah(selectedOrder.total_amount)}
                  </span>
                </div>
                {selectedOrder.payment_status === "PAID" &&
                  selectedOrder.latest_payment?.method === "CASH" && (
                    <div className="pt-1 text-[11px] text-tertiary flex justify-between">
                      <span>
                        Tunai Diterima:{" "}
                        {formatRupiah(
                          selectedOrder.latest_payment.amount_received
                        )}
                      </span>
                      <span className="font-bold">
                        Kembalian:{" "}
                        {formatRupiah(selectedOrder.latest_payment.change_amount)}
                      </span>
                    </div>
                  )}
              </div>

              {/* Cashier Operational Action Buttons */}
              {selectedOrder.status !== "CANCELLED" && (
                <div className="space-y-2.5 pt-1">
                  {selectedOrder.payment_status !== "PAID" && (
                    <button
                      type="button"
                      onClick={() => openPaymentModal(selectedOrder)}
                      className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>
                        Verifikasi / Terima Pembayaran (
                        {formatRupiah(selectedOrder.total_amount)})
                      </span>
                    </button>
                  )}

                  {/* Workflow Step Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {(selectedOrder.status === "PENDING_PAYMENT" ||
                      selectedOrder.status === "CONFIRMED") && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          handleStatusTransition(selectedOrder.id, "PREPARING")
                        }
                        className="h-11 px-3 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Coffee className="w-4 h-4" />
                        <span>Mulai Racik (Dapur)</span>
                      </button>
                    )}

                    {selectedOrder.status === "PREPARING" && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          handleStatusTransition(selectedOrder.id, "READY")
                        }
                        className="h-11 px-3 rounded-xl bg-tertiary hover:opacity-90 text-surface-cream text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Tandai Siap Disajikan</span>
                      </button>
                    )}

                    {(selectedOrder.status === "READY" ||
                      selectedOrder.status === "PREPARING") && (
                      <button
                        type="button"
                        disabled={
                          actionLoading ||
                          selectedOrder.payment_status !== "PAID"
                        }
                        title={
                          selectedOrder.payment_status !== "PAID"
                            ? "Verifikasi pembayaran terlebih dahulu sebelum menandai selesai"
                            : "Selesaikan pesanan"
                        }
                        onClick={() =>
                          handleStatusTransition(selectedOrder.id, "COMPLETED")
                        }
                        className="h-11 px-3 rounded-xl bg-primary-container hover:bg-primary-hover disabled:opacity-40 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesai Disajikan</span>
                      </button>
                    )}

                    {selectedOrder.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalOrder(selectedOrder);
                          setCancelReason("");
                          setSensitivePin("1234");
                        }}
                        className="h-11 px-3 rounded-xl bg-error-subtle hover:bg-error/20 text-error text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Batalkan / Refund</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* PAYMENT VERIFICATION MODAL (Cash Calculator & Manual QRIS Verification — AC-12, AC-13, AC-14) */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-variant pb-3">
              <div>
                <h3 className="text-base font-bold text-nav-espresso">
                  Konfirmasi Pembayaran — Order {paymentModalOrder.order_number}
                </h3>
                <p className="text-xs text-text-muted">
                  {paymentModalOrder.table_name_snapshot} • Total Tagihan{" "}
                  <strong className="text-primary-container tabular-nums">
                    {formatRupiah(paymentModalOrder.total_amount)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-nav-espresso cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Method Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-variant">
              <button
                type="button"
                onClick={() => {
                  setPayMethod("CASH");
                  setIsRejectingProof(false);
                }}
                className={`h-10 rounded-lg text-xs font-bold cursor-pointer ${
                  payMethod === "CASH" && !isRejectingProof
                    ? "bg-nav-espresso text-canvas-cream"
                    : "text-secondary"
                }`}
              >
                Tunai (Cash)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayMethod("QRIS");
                  setIsRejectingProof(false);
                }}
                className={`h-10 rounded-lg text-xs font-bold cursor-pointer ${
                  payMethod === "QRIS" && !isRejectingProof
                    ? "bg-nav-espresso text-canvas-cream"
                    : "text-secondary"
                }`}
              >
                Verifikasi QRIS Manual
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {payMethod === "CASH" && !isRejectingProof ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-nav-espresso block">
                      Nominal Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      min={dueAmountNum}
                      required
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-base font-bold text-nav-espresso tabular-nums focus:outline-none focus:border-primary-container"
                    />
                  </div>

                  {/* Quick Cash Denominations */}
                  <div className="flex flex-wrap gap-1.5">
                    {[dueAmountNum, 20000, 50000, 100000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => setCashTendered(String(nom))}
                        className="px-3 py-1.5 rounded-lg bg-surface-variant hover:bg-border-sand/60 text-xs font-bold text-nav-espresso tabular-nums cursor-pointer"
                      >
                        {nom === dueAmountNum ? "Uang Pas" : formatRupiah(nom)}
                      </button>
                    ))}
                  </div>

                  {/* Automatic Change Calculation Box (AC-12) */}
                  <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand flex items-center justify-between">
                    <span className="text-xs font-bold text-secondary">
                      Kembalian Otomatis:
                    </span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        tenderAmountNum < dueAmountNum
                          ? "text-error"
                          : "text-tertiary"
                      }`}
                    >
                      {tenderAmountNum < dueAmountNum
                        ? "Nominal Kurang"
                        : formatRupiah(calculatedChange)}
                    </span>
                  </div>
                </div>
              ) : !isRejectingProof ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand space-y-1.5">
                    <span className="font-bold text-nav-espresso block">
                      Prosedur Verifikasi QRIS Statis (AC-13 &amp; AC-14):
                    </span>
                    <p className="text-on-surface-variant leading-relaxed">
                      1. Periksa aplikasi merchant resmi / mutasi bank Warkop Teras
                      Nenek sebesar{" "}
                      <strong className="text-nav-espresso tabular-nums">
                        {formatRupiah(dueAmountNum)}
                      </strong>
                      .
                    </p>
                    {paymentModalOrder.latest_payment?.proof_reference && (
                      <p className="font-mono bg-surface-cream p-2 rounded border border-border-sand">
                        Ref Pelanggan:{" "}
                        {paymentModalOrder.latest_payment.proof_reference}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRejectingProof(true)}
                    className="text-xs font-bold text-error hover:underline cursor-pointer"
                  >
                    Dana belum masuk / bukti tidak valid? Tolak Bukti Pembayaran →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-error block">
                    Alasan Penolakan Bukti QRIS (Wajib)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Dana belum masuk di mutasi merchant BCA / foto bukti buram..."
                    className="w-full rounded-xl bg-canvas-cream border border-error p-3 text-xs text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={() => setIsRejectingProof(false)}
                    className="text-xs text-secondary underline cursor-pointer"
                  >
                    ← Kembali ke Verifikasi Lunas
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="h-11 px-4 rounded-xl bg-surface-variant text-secondary text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    (!isRejectingProof &&
                      payMethod === "CASH" &&
                      tenderAmountNum < dueAmountNum)
                  }
                  className={`h-11 px-5 rounded-xl text-on-primary text-xs font-bold cursor-pointer ${
                    isRejectingProof
                      ? "bg-error hover:opacity-90"
                      : "bg-primary-container hover:bg-primary-hover"
                  }`}
                >
                  {actionLoading
                    ? "Memproses..."
                    : isRejectingProof
                    ? "Tolak Bukti Pembayaran"
                    : "Tandai Lunas & Potong Stok Resep"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SENSITIVE CANCEL / REFUND MODAL WITH PIN & REASON */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">
                  Batalkan Order {cancelModalOrder.order_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-nav-espresso cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancelOrRefund} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-nav-espresso block">
                  Alasan Pembatalan / Refund (Wajib Audit Log)
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Pelanggan membatalkan pesanan / salah input item..."
                  className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3 text-xs text-on-surface"
                />
              </div>

              {cancelModalOrder.stock_deducted && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-canvas-cream border border-border-sand text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreStockOnCancel}
                    onChange={(e) => setRestoreStockOnCancel(e.target.checked)}
                    className="w-4 h-4 accent-primary-container rounded"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-nav-espresso block flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-primary-container" />
                      <span>Kembalikan Stok Bahan Resep (Belum Terpakai)</span>
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Mencatat mutasi masuk pengembalian bahan untuk order ini
                    </span>
                  </div>
                </label>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-nav-espresso flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary-container" />
                  <span>PIN Konfirmasi Petugas</span>
                </label>
                <input
                  type="password"
                  required
                  value={sensitivePin}
                  onChange={(e) => setSensitivePin(e.target.value)}
                  placeholder="Masukkan 4 digit PIN"
                  className="w-full h-11 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-sm font-bold tracking-widest text-nav-espresso"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="h-11 px-4 rounded-xl bg-surface-variant text-secondary text-xs font-semibold cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-5 rounded-xl bg-error text-on-error text-xs font-bold cursor-pointer"
                >
                  {actionLoading ? "Memproses..." : "Konfirmasi Batalkan Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT MODAL */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between no-print">
              <span className="text-sm font-bold text-slate-900">
                Struk Transaksi
              </span>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#F6F8F7] rounded-2xl p-3 border border-slate-200 flex justify-center">
              <ThermalReceipt order={receiptOrder} />
            </div>

            <div className="grid grid-cols-2 gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 rounded-full bg-[#10A352] hover:bg-[#0D8A44] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="h-11 rounded-full bg-[#E8F7F0] hover:bg-[#d5f2e4] text-[#0D7A3E] text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
