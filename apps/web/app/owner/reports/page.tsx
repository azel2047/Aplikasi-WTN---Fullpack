"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatDateTimeWIB, formatRupiah } from "@/lib/api";
import {
  FileBarChart,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function OwnerReportsReviewPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ownerFeedback, setOwnerFeedback] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadReports = () => {
    setLoading(true);
    apiFetch("/owner/employee-reports")
      .then((res) => {
        const list = res.reports || [];
        setReports(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
          setOwnerFeedback(list[0].owner_feedback || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const selectedReport =
    reports.find((r) => r.id === selectedId) || reports[0] || null;

  const handleReview = async (status: "reviewed" | "needs_revision") => {
    if (!selectedReport || submitting) return;
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await apiFetch(
        `/owner/employee-reports/${selectedReport.id}/review`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            owner_feedback: ownerFeedback.trim() || null,
          }),
        }
      );
      setFeedbackMsg(res.message);
      loadReports();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
          Laporan Karyawan
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Tinjau rekap operasional per shift, catatan kondisi stok/kendala
          lapangan, dan berikan catatan tindak lanjut (AC-24, AC-25, AC-26).
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <aside className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-6 bg-surface-cream rounded-2xl border border-border-sand text-xs text-text-muted">
              Memuat laporan karyawan...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-6 bg-surface-cream rounded-2xl border border-border-sand text-xs text-text-muted">
              Belum ada laporan harian yang dikirim karyawan.
            </div>
          ) : (
            reports.map((rpt) => {
              const isSel = selectedReport?.id === rpt.id;
              return (
                <article
                  key={rpt.id}
                  onClick={() => {
                    setSelectedId(rpt.id);
                    setOwnerFeedback(rpt.owner_feedback || "");
                  }}
                  className={`p-4 rounded-2xl bg-surface-cream border cursor-pointer transition-all space-y-2 soft-shadow ${
                    isSel
                      ? "border-nav-espresso ring-2 ring-nav-espresso"
                      : "border-border-sand hover:border-primary-container"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-nav-espresso block">
                        {String(rpt.report_date).slice(0, 10)} •{" "}
                        {rpt.employee_name}
                      </span>
                      <span className="text-xs text-text-muted">
                        {rpt.shift_name}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        rpt.status === "reviewed"
                          ? "bg-success-subtle text-tertiary"
                          : rpt.status === "needs_revision"
                          ? "bg-error-subtle text-error"
                          : "bg-warning-subtle text-warning"
                      }`}
                    >
                      {rpt.status === "reviewed"
                        ? "Ditinjau"
                        : rpt.status === "needs_revision"
                        ? "Perlu Revisi"
                        : "Perlu Ditinjau"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-variant">
                    <span className="text-text-muted">
                      {rpt.total_orders_count} Order • Kondisi:{" "}
                      <strong className="capitalize text-on-surface">
                        {rpt.crowd_condition}
                      </strong>
                    </span>
                    <span className="font-bold text-primary-container tabular-nums">
                      {formatRupiah(rpt.gross_revenue_amount)}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </aside>

        {/* Right Detail Inspector */}
        <section className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
          {!selectedReport ? (
            <p className="text-xs text-text-muted">
              Pilih laporan di sebelah kiri untuk meninjau detail.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm">
                    {selectedReport.employee_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-nav-espresso">
                      Laporan {selectedReport.shift_name} —{" "}
                      {selectedReport.employee_name}
                    </h2>
                    <span className="text-xs text-text-muted">
                      Tanggal: {String(selectedReport.report_date).slice(0, 10)}{" "}
                      • Dikirim {formatDateTimeWIB(selectedReport.submitted_at)}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-variant text-xs font-semibold text-secondary">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Angka Sistem Terverifikasi (AC-25)</span>
                </span>
              </div>

              {/* 4 System Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="text-text-muted block">Total Order</span>
                  <span className="text-base font-bold text-nav-espresso tabular-nums">
                    {selectedReport.total_orders_count} Order
                  </span>
                  <span className="text-[10px] text-tertiary block">
                    {selectedReport.completed_orders_count} selesai •{" "}
                    {selectedReport.cancelled_orders_count} batal
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="text-text-muted block">Total Omzet</span>
                  <span className="text-base font-bold text-primary-container tabular-nums">
                    {formatRupiah(selectedReport.gross_revenue_amount)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="text-text-muted block">Tunai Laci</span>
                  <span className="text-base font-bold text-nav-espresso tabular-nums">
                    {formatRupiah(selectedReport.cash_revenue_amount)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="text-text-muted block">QRIS Non-Tunai</span>
                  <span className="text-base font-bold text-nav-espresso tabular-nums">
                    {formatRupiah(selectedReport.qris_revenue_amount)}
                  </span>
                </div>
              </div>

              {/* Field Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-1">
                  <span className="text-text-muted font-bold uppercase">
                    Kondisi Kunjungan Usaha
                  </span>
                  <span className="text-sm font-bold text-nav-espresso capitalize block">
                    {selectedReport.crowd_condition}
                  </span>
                  {selectedReport.crowd_peak_note && (
                    <p className="text-on-surface-variant">
                      {selectedReport.crowd_peak_note}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-1">
                  <span className="text-text-muted font-bold uppercase">
                    Kondisi Stok Bahan Baku
                  </span>
                  <span className="text-sm font-bold text-nav-espresso capitalize block">
                    {selectedReport.stock_condition}
                  </span>
                  {selectedReport.stock_concerns && (
                    <p className="text-on-surface-variant">
                      {selectedReport.stock_concerns}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="font-bold text-nav-espresso block mb-1">
                    Kendala Operasional:
                  </span>
                  <p className="text-on-surface-variant">
                    {selectedReport.operational_issues ||
                      "Tidak ada kendala operasional yang dilaporkan."}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand">
                  <span className="font-bold text-nav-espresso block mb-1">
                    Catatan Tambahan Petugas:
                  </span>
                  <p className="text-on-surface-variant">
                    {selectedReport.additional_notes || "-"}
                  </p>
                </div>
              </div>

              {/* Owner Feedback & Review Actions (AC-26) */}
              <div className="pt-4 border-t border-surface-variant space-y-3 text-xs">
                <label className="font-bold text-nav-espresso block">
                  Catatan Tindak Lanjut Owner (Nenek Sari)
                </label>
                <textarea
                  rows={2}
                  value={ownerFeedback}
                  onChange={(e) => setOwnerFeedback(e.target.value)}
                  placeholder="Tulis arahan tindak lanjut untuk kasir/barista..."
                  className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
                />
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReview("reviewed")}
                    className="h-11 px-5 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui &amp; Tandai Ditinjau</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReview("needs_revision")}
                    className="h-11 px-4 rounded-xl bg-error-subtle text-error font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Minta Revisi</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
