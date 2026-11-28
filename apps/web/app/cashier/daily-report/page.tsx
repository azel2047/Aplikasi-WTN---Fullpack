"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatRupiah, getStoredAuth } from "@/lib/api";
import {
  FileBarChart,
  Lock,
  Send,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function CashierDailyReportPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [shiftName, setShiftName] = useState<string>("Operasional Harian (Fullday)");
  const [crowdCondition, setCrowdCondition] = useState<"ramai" | "normal" | "sepi">("normal");
  const [crowdPeakNote, setCrowdPeakNote] = useState<string>("");
  const [stockCondition, setStockCondition] = useState<"aman" | "menipis" | "habis">("aman");
  const [stockConcerns, setStockConcerns] = useState<string>("");
  const [operationalIssues, setOperationalIssues] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadContext = () => {
    setLoading(true);
    const auth = getStoredAuth();
    if (auth?.shiftName) setShiftName(auth.shiftName);

    apiFetch("/cashier/daily-reports")
      .then((res) => {
        setMetrics(res.system_metrics);
        setReports(res.reports || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContext();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch("/cashier/daily-reports", {
        method: "POST",
        body: JSON.stringify({
          shift_name: shiftName,
          crowd_condition: crowdCondition,
          crowd_peak_note: crowdPeakNote.trim() || null,
          stock_condition: stockCondition,
          stock_concerns: stockConcerns.trim() || null,
          operational_issues: operationalIssues.trim() || null,
          additional_notes: additionalNotes.trim() || null,
          status: "submitted",
        }),
      });
      setFeedback(res.message);
      loadContext();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengirim laporan harian.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Daily Report Form */}
      <section className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
        <div className="flex items-center justify-between border-b border-surface-variant pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary-container flex items-center justify-center">
              <FileBarChart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-nav-espresso">
                Laporan Harian Kasir (Fullday)
              </h1>
              <p className="text-xs text-text-muted">
                Rekap transaksi otomatis sistem + laporan kondisi lapangan ke Owner
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-variant text-xs font-semibold text-secondary">
            <Lock className="w-3.5 h-3.5" />
            <span>Angka Sistem Terkunci</span>
          </span>
        </div>

        {/* System-generated transaction metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
              <span className="text-[11px] text-text-muted block">
                Total Order Hari Ini
              </span>
              <span className="text-base font-bold text-nav-espresso tabular-nums">
                {metrics.total_orders_count} Order
              </span>
              <span className="text-[10px] text-tertiary block">
                {metrics.completed_orders_count} selesai •{" "}
                {metrics.cancelled_orders_count} batal
              </span>
            </div>
            <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
              <span className="text-[11px] text-text-muted block">
                Omzet Lunas
              </span>
              <span className="text-base font-bold text-primary-container tabular-nums">
                {formatRupiah(metrics.gross_revenue_amount)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
              <span className="text-[11px] text-text-muted block">
                Tunai / QRIS
              </span>
              <span className="text-xs font-bold text-nav-espresso tabular-nums block">
                Tunai: {formatRupiah(metrics.cash_revenue_amount)}
              </span>
              <span className="text-xs font-bold text-secondary tabular-nums block">
                QRIS: {formatRupiah(metrics.qris_revenue_amount)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand">
              <span className="text-[11px] text-text-muted block">
                Pengeluaran Kas
              </span>
              <span className="text-base font-bold text-error tabular-nums">
                {formatRupiah(metrics.expenses_amount)}
              </span>
            </div>
          </div>
        )}

        {feedback && (
          <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-subtle text-error text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Kondisi Kunjungan Usaha
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["ramai", "normal", "sepi"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCrowdCondition(c)}
                    className={`h-11 rounded-xl border font-bold capitalize cursor-pointer ${
                      crowdCondition === c
                        ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Kondisi Stok Bahan Baku
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["aman", "menipis", "habis"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStockCondition(s)}
                    className={`h-11 rounded-xl border font-bold capitalize cursor-pointer ${
                      stockCondition === s
                        ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Catatan Jam Ramai (Opsional)
              </label>
              <input
                type="text"
                value={crowdPeakNote}
                onChange={(e) => setCrowdPeakNote(e.target.value)}
                placeholder="Contoh: Ramai jam 12.00 - 13.30 WIB"
                className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Catatan Bahan Baku Menipis / Perlu Restock
            </label>
            <textarea
              rows={2}
              value={stockConcerns}
              onChange={(e) => setStockConcerns(e.target.value)}
              placeholder="Contoh: Susu cair full cream sisa 2 liter, gula aren perlu beli besok pagi..."
              className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
            />
          </div>

          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Kendala Operasional (Peralatan / Pelayanan / Kebersihan)
            </label>
            <textarea
              rows={2}
              value={operationalIssues}
              onChange={(e) => setOperationalIssues(e.target.value)}
              placeholder="Contoh: Grinder kopi sempat macet sebentar, sudah dibersihkan..."
              className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
            />
          </div>

          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Catatan Tambahan untuk Owner
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Catatan serah terima shift..."
              className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting ? "Mengirim Laporan..." : "Kirim Laporan Harian ke Owner"}
            </span>
          </button>
        </form>
      </section>

      {/* Right: Submitted Reports History & Owner Review Feedback */}
      <aside className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
        <h2 className="text-sm font-bold text-nav-espresso">
          Riwayat Laporan Harian &amp; Tanggapan Owner
        </h2>
        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-text-muted">Memuat riwayat laporan...</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada laporan harian.</p>
          ) : (
            reports.map((rpt) => (
              <article
                key={rpt.id}
                className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-nav-espresso block">
                      {String(rpt.report_date).slice(0, 10)} • {rpt.shift_name}
                    </span>
                    <span className="text-text-muted">
                      Petugas: <strong>{rpt.employee_name}</strong>
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
                      ? "Ditinjau Owner"
                      : rpt.status === "needs_revision"
                      ? "Perlu Revisi"
                      : "Menunggu Review"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border-sand/60">
                  <span>
                    {rpt.total_orders_count} Order • Kondisi:{" "}
                    <strong className="capitalize">{rpt.crowd_condition}</strong>
                  </span>
                  <span className="font-bold text-primary-container tabular-nums">
                    {formatRupiah(rpt.gross_revenue_amount)}
                  </span>
                </div>

                {rpt.stock_concerns && (
                  <p className="text-on-surface-variant">
                    <strong>Stok:</strong> {rpt.stock_concerns}
                  </p>
                )}
                {rpt.operational_issues && (
                  <p className="text-on-surface-variant">
                    <strong>Kendala:</strong> {rpt.operational_issues}
                  </p>
                )}

                {rpt.owner_feedback && (
                  <div className="p-2.5 rounded-lg bg-primary-subtle text-on-primary-subtle font-medium">
                    <strong>Tindak Lanjut Owner ({rpt.reviewed_by || "Owner"}):</strong>{" "}
                    {rpt.owner_feedback}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
