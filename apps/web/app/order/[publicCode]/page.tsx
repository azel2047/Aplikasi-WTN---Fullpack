"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  apiFetch,
  formatDateTimeWIB,
  formatRupiah,
  formatTimeWIB,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/lib/api";
import {
  RefreshCw,
  Check,
  Clock,
  Coffee,
  Bell,
  FileText,
  Upload,
  Star,
  Send,
  Wifi,
  AlertTriangle,
  PlusCircle,
  QrCode,
  Wallet,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const FEEDBACK_CHIPS = [
  "Kopi Pas Mantap",
  "Pelayanan Ramah & Cepat",
  "Tempat Teduh & Nyaman",
  "Indomie Juara",
  "Musik Asik",
];

export default function CustomerOrderTrackingPage() {
  const params = useParams<{ publicCode: string }>();
  const publicCode = params?.publicCode || "";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});

  // QRIS Proof upload form state
  const [proofReference, setProofReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofFeedback, setProofFeedback] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  // Call waiter state
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterMessage, setWaiterMessage] = useState<string | null>(null);

  // Rating form state (AC-27, AC-28)
  const [stars, setStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Kopi Pas Mantap",
    "Pelayanan Ramah & Cepat",
  ]);
  const [comment, setComment] = useState("");
  const [isPublicWall, setIsPublicWall] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!publicCode) return;
      if (!silent) setLoading(true);
      try {
        const res = await apiFetch(`/public/orders/${encodeURIComponent(publicCode)}`);
        setOrder(res.order);
        if (res.settings) setSettings(res.settings);
        setErrorMsg(null);
      } catch (err: any) {
        if (!silent) {
          setErrorMsg(err.message || "Kode pesanan tidak ditemukan.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [publicCode]
  );

  useEffect(() => {
    fetchOrder(false);
    // Automatic polling every 6 seconds for realtime updates
    const interval = setInterval(() => fetchOrder(true), 6000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || uploadingProof) return;

    setUploadingProof(true);
    setProofError(null);
    setProofFeedback(null);

    try {
      const formData = new FormData();
      if (proofFile) {
        formData.append("proof_file", proofFile);
      }
      if (proofReference.trim()) {
        formData.append("proof_reference", proofReference.trim());
      }

      const res = await apiFetch(
        `/public/orders/${encodeURIComponent(publicCode)}/payment-proof`,
        {
          method: "POST",
          body: formData,
        }
      );

      setOrder(res.order);
      setProofFeedback(
        res.message ||
          "Bukti pembayaran terkirim. Kasir sedang memeriksa mutasi sebelum pesanan diracik."
      );
      setProofFile(null);
    } catch (err: any) {
      setProofError(err.message || "Gagal mengunggah bukti pembayaran.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCallWaiter = async () => {
    if (!order || callingWaiter) return;
    setCallingWaiter(true);
    try {
      const res = await apiFetch(
        `/public/orders/${encodeURIComponent(publicCode)}/call-waiter`,
        { method: "POST" }
      );
      setWaiterMessage(res.message || "Kasir/barista telah diberi tahu.");
    } catch (err: any) {
      setWaiterMessage(err.message || "Gagal mengirim panggilan.");
    } finally {
      setCallingWaiter(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || submittingRating) return;

    setSubmittingRating(true);
    setRatingError(null);
    setRatingFeedback(null);

    try {
      const res = await apiFetch(
        `/public/orders/${encodeURIComponent(publicCode)}/rating`,
        {
          method: "POST",
          body: JSON.stringify({
            stars,
            tags: selectedTags,
            comment: comment.trim() || null,
            is_public_wall: isPublicWall,
          }),
        }
      );
      setOrder(res.order);
      setRatingFeedback(
        res.message || "Matur suwun! Ulasanmu sudah masuk ke catatan Nenek."
      );
    } catch (err: any) {
      setRatingError(err.message || "Gagal mengirim ulasan.");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-cream flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[460px] space-y-4">
          <div className="h-24 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
          <div className="h-48 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
          <div className="h-64 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-canvas-cream flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface-cream border border-border-sand rounded-2xl p-6 text-center space-y-4 soft-shadow">
          <div className="w-12 h-12 rounded-2xl bg-error-subtle text-error flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-nav-espresso">
            Pesanan Tidak Ditemukan
          </h1>
          <p className="text-xs text-on-surface-variant">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const orderStatusBadge = getOrderStatusLabel(order.status);
  const paymentStatusBadge = getPaymentStatusLabel(order.payment_status);

  // Determine 4-step progress
  const stepIndex =
    order.status === "COMPLETED"
      ? 4
      : order.status === "READY"
      ? 3
      : order.status === "PREPARING" || order.status === "CONFIRMED"
      ? 2
      : 1;

  const starLabels: Record<number, string> = {
    1: "1 dari 5 • Kurang Memuaskan",
    2: "2 dari 5 • Perlu Perbaikan",
    3: "3 dari 5 • Cukup Baik",
    4: "4 dari 5 • Mantap & Nyaman",
    5: "5 dari 5 • Sempurna & Puas Banget!",
  };

  return (
    <div className="min-h-screen bg-canvas-cream text-on-surface flex flex-col">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-canvas-cream border-b border-border-sand">
        <div className="max-w-[480px] mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-base">
              W
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-nav-espresso">
                  {settings.business_name || "Warkop Teras Nenek"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-[11px] font-semibold">
                  {order.table_name_snapshot || "Walk-in"}
                </span>
              </div>
              <span className="text-xs text-text-muted block">
                Status &amp; Rincian Pesanan
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchOrder(false)}
            aria-label="Muat ulang status pesanan"
            className="w-11 h-11 rounded-full hover:bg-surface-variant flex items-center justify-center text-secondary cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 py-4 pb-24 space-y-4">
        {/* Top Context / Order Bar */}
        <section className="bg-surface-cream border border-border-sand rounded-2xl p-4 soft-shadow space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-nav-espresso tabular-nums">
                Order {order.order_number}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-xs font-semibold">
                {order.table_name_snapshot}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-surface-variant text-on-surface-variant text-xs font-semibold">
              {order.source === "QR" ? "Pesanan QR" : "POS Kasir"}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-secondary" />
              <span>{formatDateTimeWIB(order.created_at)}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-subtle text-tertiary font-semibold">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span>Terhubung ke Kasir · Otomatis</span>
            </div>
          </div>
          <div className="text-[11px] text-text-muted">
            Kode Lacak Publik:{" "}
            <code className="font-mono font-bold text-nav-espresso bg-canvas-cream px-1.5 py-0.5 rounded">
              {order.public_code}
            </code>
          </div>
        </section>

        {/* Dual-Status Highlight Hero Card */}
        <section className="bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${orderStatusBadge.bgClass} ${orderStatusBadge.textClass}`}
            >
              <span>{orderStatusBadge.label}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${paymentStatusBadge.bgClass} ${paymentStatusBadge.textClass}`}
            >
              <span>
                {order.payment_method}: {paymentStatusBadge.label}
              </span>
            </span>
          </div>

          {order.status === "CANCELLED" ? (
            <div className="p-3 rounded-xl bg-error-subtle text-error text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                <span>Pesanan Dibatalkan</span>
              </div>
              <p>Alasan: {order.cancel_reason || "Dibatalkan oleh kasir."}</p>
            </div>
          ) : order.status === "READY" ? (
            <div className="space-y-1">
              <h2 className="text-base font-bold text-tertiary flex items-center gap-1.5">
                <Bell className="w-5 h-5" />
                <span>Pesanan Siap Diantar ke {order.table_name_snapshot}!</span>
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Menu pesanan Anda sudah selesai diracik dan siap disajikan hangat ke meja Anda.
              </p>
            </div>
          ) : order.status === "COMPLETED" ? (
            <div className="space-y-1">
              <h2 className="text-base font-bold text-nav-espresso flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-tertiary" />
                <span>Pesanan Telah Disajikan &amp; Dinikmati</span>
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Terima kasih telah bersantai di Teras Nenek! Silakan berikan rating dan ulasan
                pengalaman ngopi Anda di bawah ini.
              </p>
            </div>
          ) : order.payment_status === "REJECTED" ? (
            <div className="p-3 rounded-xl bg-error-subtle text-error text-xs space-y-1">
              <span className="font-bold block">
                Bukti Pembayaran Ditolak oleh Kasir
              </span>
              <span>
                Alasan:{" "}
                {order.latest_payment?.rejection_reason ||
                  "Bukti tidak terbaca atau nominal belum masuk. Silakan unggah ulang bukti yang valid."}
              </span>
            </div>
          ) : order.payment_status === "PROOF_UPLOADED" ? (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Bukti transfer QRIS sudah diterima. Kasir sedang memverifikasi pembayaran Anda.
            </p>
          ) : order.payment_status === "PAID" ? (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Pembayaran telah terverifikasi Lunas oleh{" "}
              <strong className="text-nav-espresso">
                {order.latest_payment?.verified_by_name || "Kasir"}
              </strong>
              . Barista dan dapur sedang meracik pesanan Anda.
            </p>
          ) : (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {order.payment_method === "QRIS"
                ? "Silakan selesaikan pembayaran QRIS dan unggah bukti transfer di bawah ini agar kasir dapat segera memverifikasi."
                : `Silakan sebutkan nomor order ${order.order_number} dan bayar tunai sebesar ${formatRupiah(
                    order.total_amount
                  )} di meja kasir.`}
            </p>
          )}
        </section>

        {/* Visual Progress Stepper */}
        {order.status !== "CANCELLED" && (
          <section className="bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-nav-espresso">
                Alur Perjalanan Pesanan
              </h2>
              <span className="text-xs text-text-muted font-semibold">
                Tahap {stepIndex} dari 4
              </span>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-success-subtle text-tertiary flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-nav-espresso">
                      1. Pesanan Dikirim
                    </span>
                    <span className="text-text-muted">
                      {formatTimeWIB(order.created_at)}
                    </span>
                  </div>
                  <p className="text-text-muted">
                    Tercatat di antrean kasir Warkop Teras Nenek.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    order.payment_status === "PAID"
                      ? "bg-success-subtle text-tertiary"
                      : "bg-primary-container text-on-primary"
                  }`}
                >
                  {order.payment_status === "PAID" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-nav-espresso">
                      2. Verifikasi Pembayaran Kasir
                    </span>
                    <span className="text-text-muted">
                      {order.confirmed_at ? formatTimeWIB(order.confirmed_at) : "Menunggu"}
                    </span>
                  </div>
                  <p className="text-text-muted">
                    {order.payment_status === "PAID"
                      ? `Terverifikasi Lunas (${order.payment_method})`
                      : "Menunggu konfirmasi kasir"}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`flex items-start gap-3 ${
                  stepIndex < 2 ? "opacity-55" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    stepIndex >= 3
                      ? "bg-success-subtle text-tertiary"
                      : order.status === "PREPARING"
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-variant text-text-muted"
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-nav-espresso">
                      3. Diracik di Bar &amp; Dapur
                    </span>
                    <span className="text-text-muted">
                      {order.preparing_at ? formatTimeWIB(order.preparing_at) : "-"}
                    </span>
                  </div>
                  <p className="text-text-muted">
                    Barista menyiapkan pesanan sesuai catatan item Anda.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div
                className={`flex items-start gap-3 ${
                  stepIndex < 3 ? "opacity-55" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    order.status === "COMPLETED"
                      ? "bg-success-subtle text-tertiary"
                      : order.status === "READY"
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-variant text-text-muted"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-nav-espresso">
                      4. Disajikan di {order.table_name_snapshot}
                    </span>
                    <span className="text-text-muted">
                      {order.completed_at
                        ? formatTimeWIB(order.completed_at)
                        : order.ready_at
                        ? formatTimeWIB(order.ready_at)
                        : "-"}
                    </span>
                  </div>
                  <p className="text-text-muted">
                    {order.status === "COMPLETED"
                      ? "Pesanan telah selesai disajikan."
                      : order.status === "READY"
                      ? "Pesanan siap diantar ke meja Anda!"
                      : "Diantar hangat ke meja Anda."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* QRIS / CASH PAYMENT INSTRUCTION & MANUAL PROOF UPLOAD (AC-13) */}
        {order.status !== "CANCELLED" && order.payment_status !== "PAID" && (
          <section className="bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-surface-variant pb-3">
              <div className="min-w-0">
                <span className="text-xs text-text-muted block">
                  Metode Pembayaran
                </span>
                <span className="text-sm font-bold text-nav-espresso flex items-center gap-1.5">
                  {order.payment_method === "QRIS" ? (
                    <>
                      <QrCode className="w-4 h-4 text-primary-container shrink-0" />
                      <span className="truncate">QRIS Warkop Teras Nenek</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 text-primary-container shrink-0" />
                      <span>Tunai (Bayar di Kasir)</span>
                    </>
                  )}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-text-muted block">
                  Total Tagihan
                </span>
                <span className="text-lg font-bold text-primary-container tabular-nums whitespace-nowrap">
                  {formatRupiah(order.total_amount)}
                </span>
              </div>
            </div>

            {order.payment_method === "QRIS" ? (
              <div className="space-y-4">
                {/* Official QRIS Display */}
                <div className="bg-canvas-cream border border-border-sand rounded-xl p-4 flex flex-col items-center text-center space-y-2.5">
                  <span className="text-xs font-bold text-nav-espresso">
                    {settings.qris_merchant_name ||
                      "WARKOP TERAS NENEK (QRIS STATIS)"}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    NMID: {settings.qris_nmid || "ID1026000000000"}
                  </span>

                  <div className="p-3 bg-surface-cream rounded-xl border border-border-sand">
                    {settings.has_official_qris_image ? (
                      <img
                        src="/api/v1/public/qris-image"
                        alt="QRIS Resmi Warkop Teras Nenek"
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <QRCodeSVG
                        value={`00020101021126580014ID.CO.QRIS.WWW01189360001400000000005204581253033605802ID5918WARKOP TERAS NENEK6010YOGYAKARTA6304${order.order_number}`}
                        size={168}
                        bgColor="#FFFFFF"
                        fgColor="#0F172A"
                      />
                    )}
                  </div>

                  <p className="text-[11px] text-on-surface-variant max-w-xs leading-relaxed">
                    Scan kode QRIS di atas dengan m-Banking / e-Wallet Anda dan masukkan
                    nominal tepat{" "}
                    <strong className="text-nav-espresso tabular-nums">
                      {formatRupiah(order.total_amount)}
                    </strong>
                    .
                  </p>
                </div>

                {/* Upload Proof Form */}
                <form onSubmit={handleUploadProof} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-nav-espresso block">
                      Unggah Bukti Transfer / Catatan Referensi
                    </label>
                    <p className="text-[11px] text-text-muted">
                      Penting: Unggahan bukti tidak otomatis melunasi pesanan. Kasir akan
                      memverifikasi mutasi merchant secara manual.
                    </p>
                  </div>

                  {proofFeedback && (
                    <div className="p-3 rounded-xl bg-success-subtle text-tertiary text-xs font-semibold">
                      {proofFeedback}
                    </div>
                  )}
                  {proofError && (
                    <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-semibold">
                      {proofError}
                    </div>
                  )}

                  {order.latest_payment?.proof_reference && (
                    <div className="p-3 rounded-xl bg-surface-variant text-xs space-y-1">
                      <span className="font-bold text-nav-espresso block">
                        Bukti Terakhir Tercatat:
                      </span>
                      <span className="font-mono text-on-surface-variant block">
                        {order.latest_payment.proof_reference}
                      </span>
                    </div>
                  )}

                  <input
                    type="text"
                    value={proofReference}
                    onChange={(e) => setProofReference(e.target.value)}
                    placeholder="Contoh: BCA m-Transfer a.n. Raka Ref 983120"
                    className="w-full h-11 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />

                  <div className="flex items-center gap-2">
                    <label className="flex-1 h-11 px-3 rounded-xl bg-canvas-cream border border-dashed border-border-strong text-xs font-semibold text-secondary flex items-center justify-center gap-2 cursor-pointer hover:bg-surface-variant">
                      <Upload className="w-4 h-4 text-primary-container" />
                      <span className="truncate">
                        {proofFile
                          ? proofFile.name
                          : "Pilih Gambar Bukti (JPG/PNG)"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) =>
                          setProofFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingProof}
                    className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadingProof
                        ? "Mengirim Bukti..."
                        : order.payment_status === "PROOF_UPLOADED"
                        ? "Perbarui Bukti Pembayaran QRIS"
                        : "Kirim Bukti Pembayaran QRIS"}
                    </span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand text-xs text-on-surface-variant space-y-1.5">
                <p className="font-semibold text-nav-espresso">
                  Instruksi Pembayaran Tunai:
                </p>
                <p>
                  Silakan menuju meja kasir dan sebutkan{" "}
                  <strong className="text-nav-espresso">
                    Order {order.order_number} ({order.table_name_snapshot})
                  </strong>
                  . Setelah kasir menerima pembayaran tunai Anda, status pesanan di
                  layar ini akan otomatis berubah menjadi{" "}
                  <strong className="text-tertiary">Lunas &amp; Sedang Diracik</strong>.
                </p>
              </div>
            )}
          </section>
        )}

        {/* RATING & REVIEW SECTION (Only visible when status === COMPLETED — AC-27, AC-28) */}
        {order.status === "COMPLETED" && (
          <section
            id="rating"
            className="bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-accent-terracotta fill-accent-terracotta" />
                <h2 className="text-base font-bold text-nav-espresso">
                  Bagaimana Pengalaman Ngopimu Hari Ini?
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                Satu rating keseluruhan (1–5 bintang) untuk pesanan selesai ini.
              </p>
            </div>

            {order.rating ? (
              <div className="p-4 rounded-xl bg-success-subtle text-tertiary space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    Matur suwun! Rating Anda ({order.rating.stars} / 5 Bintang) Tersimpan
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(order.rating.stars)].map((_, idx) => (
                      <Star
                        key={idx}
                        className="w-4 h-4 text-accent-terracotta fill-accent-terracotta"
                      />
                    ))}
                  </div>
                </div>
                {order.rating.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {order.rating.tags.map((t: string) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-surface-cream text-nav-espresso text-[11px] font-semibold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {order.rating.comment && (
                  <p className="italic text-on-surface">
                    &ldquo;{order.rating.comment}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-4">
                {ratingFeedback && (
                  <div className="p-3 rounded-xl bg-success-subtle text-tertiary text-xs font-semibold">
                    {ratingFeedback}
                  </div>
                )}
                {ratingError && (
                  <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-semibold">
                    {ratingError}
                  </div>
                )}

                {/* Star Rating Selector */}
                <div className="flex flex-col items-center justify-center py-3 bg-canvas-cream rounded-xl border border-border-sand">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        aria-label={`Bintang ${num}`}
                        onClick={() => setStars(num)}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            num <= stars
                              ? "text-accent-terracotta fill-accent-terracotta"
                              : "text-border-sand"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-on-primary-subtle mt-1">
                    {starLabels[stars]}
                  </span>
                </div>

                {/* Quick Feedback Tag Chips */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-nav-espresso block">
                    Apa yang paling kamu sukai?
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_CHIPS.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setSelectedTags((prev) =>
                              prev.includes(tag)
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag]
                            )
                          }
                          className={`h-9 px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? "bg-nav-espresso text-canvas-cream"
                              : "bg-surface-variant text-secondary"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Comment */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="rating-comment"
                    className="text-xs font-bold text-nav-espresso block"
                  >
                    Catatan atau Cerita untuk Nenek (Opsional)
                  </label>
                  <textarea
                    id="rating-comment"
                    rows={3}
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tulis kesan singkat mengenai rasa kopi, indomie, atau pelayanan kami..."
                    className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicWall}
                    onChange={(e) => setIsPublicWall(e.target.checked)}
                    className="w-4 h-4 accent-primary-container rounded"
                  />
                  <span className="text-on-surface-variant">
                    Tampilkan sebagai ulasan pengunjung {order.table_name_snapshot}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submittingRating}
                  className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submittingRating
                      ? "Mengirim Ulasan..."
                      : "Kirim Ulasan & Rating"}
                  </span>
                </button>
              </form>
            )}
          </section>
        )}

        {/* Order Items & Per-Item Notes Summary (AC-07) */}
        <section className="bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-nav-espresso">
              Rincian Menu &amp; Catatan Item
            </h2>
            <span className="text-xs text-text-muted">
              {order.items?.length || 0} Baris Item
            </span>
          </div>

          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-canvas-cream border border-border-sand/70 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-primary-container tabular-nums">
                      {item.quantity}x
                    </span>
                    <div>
                      <span className="text-xs font-bold text-nav-espresso block">
                        {item.product_name_snapshot}
                      </span>
                      {item.options?.length > 0 && (
                        <span className="text-[11px] text-secondary block">
                          {item.options
                            .map((o: any) => `${o.option_name_snapshot}: ${o.option_value_snapshot}`)
                            .join(" • ")}
                        </span>
                      )}
                      <span className="text-[11px] text-text-muted tabular-nums">
                        {formatRupiah(
                          item.unit_price_snapshot + item.options_price_snapshot
                        )}{" "}
                        / porsi
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-nav-espresso tabular-nums">
                    {formatRupiah(item.line_total)}
                  </span>
                </div>

                {item.item_note && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-variant text-on-surface-variant text-xs">
                    <FileText className="w-3.5 h-3.5 text-primary-container shrink-0" />
                    <span>{item.item_note}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bill Breakdown */}
          <div className="p-3.5 rounded-xl bg-surface-variant/60 space-y-1.5 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal Pesanan</span>
              <span className="font-semibold text-nav-espresso tabular-nums">
                {formatRupiah(order.subtotal_amount)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-tertiary">
                <span>Diskon</span>
                <span className="font-semibold tabular-nums">
                  −{formatRupiah(order.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-on-surface-variant">
              <span>PB1 (Pajak Restoran)</span>
              <span className="font-semibold text-nav-espresso tabular-nums">
                {formatRupiah(order.tax_amount)}
              </span>
            </div>
            <div className="border-t border-border-sand pt-2 flex justify-between items-baseline">
              <span className="text-sm font-bold text-nav-espresso">
                Total Akhir
              </span>
              <span className="text-base font-bold text-primary-container tabular-nums">
                {formatRupiah(order.total_amount)}
              </span>
            </div>
          </div>
        </section>

        {/* Actions: Call Waiter & Order More */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCallWaiter}
            disabled={callingWaiter}
            className="h-12 px-4 rounded-xl bg-surface-cream border border-border-sand hover:bg-surface-variant text-nav-espresso text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4 text-primary-container" />
            <span>
              {callingWaiter
                ? "Memanggil..."
                : waiterMessage
                ? "Kasir Dipanggil ✓"
                : "Panggil Bantuan Kasir"}
            </span>
          </button>

          {order.dining_table?.qr_token && (
            <Link
              href={`/t/${order.dining_table.qr_token}`}
              className="h-12 px-4 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Pesanan Baru</span>
            </Link>
          )}
        </section>

        {waiterMessage && (
          <p className="text-center text-xs text-tertiary font-semibold">
            {waiterMessage}
          </p>
        )}

        {/* WiFi Card */}
        <section className="flex items-center gap-3 bg-surface-cream border border-border-sand rounded-xl p-3.5">
          <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary-container flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-nav-espresso block">
              WiFi Santai Warkop
            </span>
            <span className="text-text-muted">
              SSID:{" "}
              <strong className="text-on-surface">
                {settings.wifi_ssid || "WarkopTeras_5G"}
              </strong>{" "}
              • Sandi:{" "}
              <code className="bg-surface-variant px-1.5 py-0.5 rounded font-bold text-nav-espresso">
                {settings.wifi_password || "ngopidulu123"}
              </code>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
