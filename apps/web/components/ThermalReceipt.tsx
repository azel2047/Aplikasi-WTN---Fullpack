"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatDateTimeWIB, formatRupiah } from "@/lib/api";

interface ThermalReceiptProps {
  order: any;
  settings?: any;
  originUrl?: string;
}

export function ThermalReceipt({
  order,
  settings = {},
  originUrl = "",
}: ThermalReceiptProps) {
  if (!order) return null;

  const resolvedOrigin =
    originUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const trackUrl = resolvedOrigin
    ? `${resolvedOrigin}/order/${order.public_code}`
    : `/order/${order.public_code}`;

  const payment = order.latest_payment || {};
  const businessName = settings?.business_name || "WARKOP TERAS NENEK";
  const address = settings?.business_address || "Jl. Teras Rindang No. 14, Yogyakarta";
  const phone = settings?.business_phone || "0812-3456-7890";
  const wifiSsid = settings?.wifi_ssid || "WarkopTeras_5G";
  const wifiPass = settings?.wifi_password || "ngopidulu123";

  const paymentStatusText =
    order.payment_status === "PAID"
      ? "Lunas"
      : order.payment_status === "PROOF_UPLOADED"
      ? "Menunggu Verifikasi"
      : order.payment_status === "REFUNDED"
      ? "Refund"
      : "Belum Bayar";

  return (
    <div
      id="thermal-receipt-print"
      className="bg-white text-slate-900 font-mono text-[11px] leading-relaxed p-5 rounded-xl border border-slate-200 w-full max-w-[300px] mx-auto"
    >
      {/* Store Header */}
      <div className="text-center pb-3 border-b border-dashed border-slate-300">
        <div className="text-sm font-bold tracking-wide uppercase">
          {businessName}
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5">{address}</div>
        <div className="text-[10px] text-slate-600">Telp: {phone}</div>
      </div>

      {/* Transaction Metadata */}
      <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">No. Order</span>
          <span className="font-bold">{order.order_number}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Tanggal</span>
          <span>{formatDateTimeWIB(order.created_at)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Layanan</span>
          <span className="font-bold">{order.table_name_snapshot}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Pelanggan</span>
          <span>{order.customer_name || "Walk-in"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Kasir</span>
          <span>{payment.verified_by_name || order.created_by_actor || "Kasir"}</span>
        </div>
      </div>

      {/* Itemized Order Lines */}
      <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
        {(order.items || []).map((item: any) => (
          <div key={item.id} className="space-y-0.5">
            <div className="flex justify-between gap-2 font-semibold">
              <span>
                {item.quantity}x {item.product_name_snapshot}
              </span>
              <span className="tabular-nums shrink-0 whitespace-nowrap">
                {formatRupiah(item.line_total)}
              </span>
            </div>
            {item.options?.length > 0 && (
              <div className="text-[10px] text-slate-500 pl-3">
                + {item.options.map((o: any) => o.option_value_snapshot).join(", ")}
              </div>
            )}
            {item.item_note && (
              <div className="text-[10px] text-slate-600 italic pl-3">
                Catatan: {item.item_note}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals & Payment Details */}
      <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Subtotal</span>
          <span className="tabular-nums whitespace-nowrap">{formatRupiah(order.subtotal_amount)}</span>
        </div>
        {Number(order.discount_amount) > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Diskon</span>
            <span className="tabular-nums whitespace-nowrap">-{formatRupiah(order.discount_amount)}</span>
          </div>
        )}
        {Number(order.tax_amount) > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">PB1 (10%)</span>
            <span className="tabular-nums whitespace-nowrap">{formatRupiah(order.tax_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-bold pt-1.5 mt-1 border-t border-slate-200">
          <span>TOTAL</span>
          <span className="tabular-nums whitespace-nowrap">{formatRupiah(order.total_amount)}</span>
        </div>

        <div className="pt-1.5 space-y-0.5 text-[10px]">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Pembayaran</span>
            <span className="font-bold text-right">
              {order.payment_method} ({paymentStatusText})
            </span>
          </div>
          {order.payment_method === "CASH" && Number(payment.amount_received) > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Tunai Diterima</span>
                <span className="tabular-nums whitespace-nowrap">{formatRupiah(payment.amount_received)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Kembalian</span>
                <span className="tabular-nums whitespace-nowrap">{formatRupiah(payment.change_amount || 0)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* QR Code for Order Tracking & Rating + WiFi */}
      <div className="pt-3 text-center space-y-2">
        <div className="inline-block p-1.5 bg-white border border-slate-200 rounded-lg">
          <QRCodeSVG value={trackUrl} size={84} bgColor="#FFFFFF" fgColor="#000000" />
        </div>
        <div className="text-[10px] space-y-0.5">
          <div className="font-bold">Kode: {order.public_code}</div>
          <div className="text-slate-500">Scan QR untuk status &amp; ulasan</div>
        </div>
        <div className="text-[10px] text-slate-600 pt-2 border-t border-dashed border-slate-200 space-y-0.5">
          <div>
            WiFi: <strong>{wifiSsid}</strong>
          </div>
          <div>
            Password: <strong>{wifiPass}</strong>
          </div>
        </div>
        <div className="text-[10px] font-bold pt-1">
          Terima kasih telah berkunjung!
        </div>
      </div>
    </div>
  );
}
