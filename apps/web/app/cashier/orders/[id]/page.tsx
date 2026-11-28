"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiFetch,
  formatDateTimeWIB,
  formatRupiah,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/lib/api";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function CashierOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/cashier/orders/${id}`)
      .then((res) => setOrder(res.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-sm text-text-muted">Memuat detail pesanan...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 space-y-3">
        <p className="text-sm font-bold text-nav-espresso">Pesanan tidak ditemukan.</p>
        <Link href="/cashier/orders" className="text-xs text-primary-container underline">
          Kembali ke Antrean Kasir
        </Link>
      </div>
    );
  }

  const statusBadge = getOrderStatusLabel(order.status);
  const payBadge = getPaymentStatusLabel(order.payment_status);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/cashier/orders")}
          className="h-10 px-3.5 rounded-xl bg-surface-cream border border-border-sand text-xs font-bold text-nav-espresso flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Antrean Terpadu</span>
        </button>

        <Link
          href={`/order/${order.public_code}`}
          target="_blank"
          className="h-10 px-3.5 rounded-xl bg-surface-variant text-xs font-bold text-nav-espresso flex items-center gap-1.5"
        >
          <span>Halaman Tracking Pelanggan</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <section className="bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-variant pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-nav-espresso tabular-nums">
                Order {order.order_number}
              </h1>
              <span className="px-3 py-1 rounded-lg bg-nav-espresso text-canvas-cream text-xs font-bold">
                {order.table_name_snapshot}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Kode Publik: <code className="font-mono font-bold">{order.public_code}</code> •{" "}
              {formatDateTimeWIB(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${payBadge.bgClass} ${payBadge.textClass}`}
            >
              {order.payment_method}: {payBadge.label}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.bgClass} ${statusBadge.textClass}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-nav-espresso uppercase tracking-wider">
            Daftar Item &amp; Catatan Khusus
          </h2>
          {order.items?.map((item: any) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-bold text-nav-espresso">
                    {item.quantity}x {item.product_name_snapshot}
                  </span>
                  {item.options?.length > 0 && (
                    <p className="text-xs text-secondary">
                      {item.options
                        .map((o: any) => `${o.option_name_snapshot}: ${o.option_value_snapshot}`)
                        .join(" • ")}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-nav-espresso tabular-nums">
                  {formatRupiah(item.line_total)}
                </span>
              </div>
              {item.item_note && (
                <div className="p-2.5 rounded-lg bg-primary-subtle text-on-primary-subtle text-xs font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Catatan: &ldquo;{item.item_note}&rdquo;</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold tabular-nums">
              {formatRupiah(order.subtotal_amount)}
            </span>
          </div>
          <div className="border-t border-border-sand pt-2 flex justify-between text-base font-bold text-nav-espresso">
            <span>Total</span>
            <span className="text-primary-container tabular-nums">
              {formatRupiah(order.total_amount)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-nav-espresso uppercase tracking-wider">
            Riwayat Perubahan Status (AC-11)
          </h3>
          <div className="space-y-2">
            {order.status_histories?.map((h: any) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-canvas-cream border border-border-sand flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />
                  <div>
                    <span className="font-bold text-nav-espresso">
                      {h.previous_status ? `${h.previous_status} → ` : ""}
                      {h.next_status}
                    </span>
                    <span className="text-text-muted block">{h.reason}</span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-text-muted">
                  <span className="font-semibold text-on-surface block">
                    {h.actor_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTimeWIB(h.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
