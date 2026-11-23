"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatRupiah, getStoredAuth } from "@/lib/api";
import { Lock, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";

export default function CashierClosingPage() {
  const [summary, setSummary] = useState<any>(null);
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [shiftName, setShiftName] = useState<string>("Shift Pagi (07.00 - 15.00)");
  const [actualCash, setActualCash] = useState<string>("");
  const [varianceReason, setVarianceReason] = useState<string>("");
  const [pin, setPin] = useState<string>("1234");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    const auth = getStoredAuth();
    if (auth?.shiftName) setShiftName(auth.shiftName);

    apiFetch("/cashier/closings")
      .then((res) => {
        setSummary(res.summary);
        setClosings(res.closings || []);
        if (res.summary?.expected_closing_cash !== undefined) {
          setActualCash(String(res.summary.expected_closing_cash));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const expectedNum = Number(summary?.expected_closing_cash || 0);
  const actualNum = Number(actualCash || 0);
  const variance = actualNum - expectedNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch("/cashier/closings", {
        method: "POST",
        body: JSON.stringify({
          shift_name: shiftName,
          actual_physical_cash: actualNum,
          variance_reason: varianceReason.trim() || null,
          pin: pin.trim(),
        }),
      });
      setFeedback(res.message);
      setVarianceReason("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan penutupan kas.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Closing Form */}
      <section className="lg:col-span-6 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary-container flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-nav-espresso">
              Penutupan Kas (Cash Closing Shift)
            </h1>
            <p className="text-xs text-text-muted">
              Rekonsiliasi saldo kas sistem vs uang tunai fisik di laci kasir
            </p>
          </div>
        </div>

        {summary && (
          <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Modal Awal Kas Tunai</span>
              <span className="font-semibold tabular-nums">
                {formatRupiah(summary.opening_cash_balance)}
              </span>
            </div>
            <div className="flex justify-between text-tertiary">
              <span>+ Penjualan Tunai (Cash)</span>
              <span className="font-semibold tabular-nums">
                +{formatRupiah(summary.cash_sales_amount)}
              </span>
            </div>
            <div className="flex justify-between text-error">
              <span>− Pengeluaran Operasional Tunai</span>
              <span className="font-semibold tabular-nums">
                −{formatRupiah(summary.cash_expenses_amount)}
              </span>
            </div>
            {summary.cash_refunds_amount > 0 && (
              <div className="flex justify-between text-error">
                <span>− Refund Tunai</span>
                <span className="font-semibold tabular-nums">
                  −{formatRupiah(summary.cash_refunds_amount)}
                </span>
              </div>
            )}
            <div className="border-t border-border-sand pt-2 flex justify-between items-baseline">
              <span className="font-bold text-nav-espresso">
                Saldo Kas Fisik Seharusnya (Sistem)
              </span>
              <span className="text-base font-bold text-primary-container tabular-nums">
                {formatRupiah(summary.expected_closing_cash)}
              </span>
            </div>
            <div className="pt-1 flex justify-between text-[11px] text-text-muted">
              <span>Info Penjualan QRIS (Masuk Rekening Bank)</span>
              <span className="font-semibold tabular-nums">
                {formatRupiah(summary.qris_sales_amount)}
              </span>
            </div>
          </div>
        )}

        {feedback && (
          <div className="p-3 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Shift yang Ditutup
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-semibold text-nav-espresso"
            >
              <option value="Shift Pagi (07.00 - 15.00)">
                Shift Pagi (07.00 - 15.00)
              </option>
              <option value="Shift Sore (15.00 - 22.00)">
                Shift Sore (15.00 - 22.00)
              </option>
              <option value="Full Day Operasional">
                Full Day Operasional
              </option>
            </select>
          </div>

          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Hasil Hitung Uang Tunai Fisik di Laci (Rp)
            </label>
            <input
              type="number"
              min={0}
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-base font-bold tabular-nums"
            />
          </div>

          {/* Variance Box */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              variance === 0
                ? "bg-success-subtle border-tertiary/30 text-tertiary"
                : "bg-warning-subtle border-warning/40 text-warning"
            }`}
          >
            <span className="font-bold">Selisih Kas (Fisik − Sistem):</span>
            <span className="text-base font-bold tabular-nums">
              {variance === 0
                ? "Rp 0 (Seimbang)"
                : (variance > 0 ? "+" : "") + formatRupiah(variance)}
            </span>
          </div>

          {variance !== 0 && (
            <div>
              <label className="font-bold text-error block mb-1">
                Alasan Selisih Kas (Wajib Diisi)
              </label>
              <textarea
                rows={2}
                required
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                placeholder="Jelaskan penyebab selisih uang fisik di laci..."
                className="w-full rounded-xl bg-canvas-cream border border-error p-3"
              />
            </div>
          )}

          <div>
            <label className="font-bold text-nav-espresso flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-primary-container" />
              <span>PIN Konfirmasi Petugas (Demo: 1234)</span>
            </label>
            <input
              type="password"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-canvas-cream border border-border-sand font-bold tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>
              {submitting ? "Menyimpan..." : "Kirim Rekap Penutupan Kas"}
            </span>
          </button>
        </form>
      </section>

      {/* Right Closing History */}
      <aside className="lg:col-span-6 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
        <h2 className="text-sm font-bold text-nav-espresso">
          Riwayat Penutupan Kas (Closing)
        </h2>
        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-text-muted">Memuat riwayat closing...</p>
          ) : closings.length === 0 ? (
            <p className="text-xs text-text-muted">
              Belum ada riwayat penutupan kas.
            </p>
          ) : (
            closings.map((cls) => (
              <div
                key={cls.id}
                className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-nav-espresso">
                      {cls.closing_code} • {String(cls.closing_date).slice(0, 10)}
                    </span>
                    <span className="text-text-muted block">
                      {cls.shift_name} • Petugas: {cls.actor_name}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      cls.status === "LOCKED"
                        ? "bg-success-subtle text-tertiary"
                        : "bg-warning-subtle text-warning"
                    }`}
                  >
                    {cls.status === "LOCKED" ? "Dikunci Owner" : "Terkirim"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-sand/60 tabular-nums">
                  <div>
                    <span className="text-[10px] text-text-muted block">
                      Seharusnya
                    </span>
                    <span className="font-bold">
                      {formatRupiah(cls.expected_closing_cash)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">
                      Fisik Laci
                    </span>
                    <span className="font-bold">
                      {formatRupiah(cls.actual_Physical_cash)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">
                      Selisih
                    </span>
                    <span
                      className={`font-bold ${
                        cls.variance_amount === 0
                          ? "text-tertiary"
                          : "text-error"
                      }`}
                    >
                      {formatRupiah(cls.variance_amount)}
                    </span>
                  </div>
                </div>
                {cls.variance_reason && (
                  <p className="text-text-muted italic">
                    Alasan selisih: &ldquo;{cls.variance_reason}&rdquo;
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
