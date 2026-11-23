"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatRupiah } from "@/lib/api";
import { PlusCircle, Download, CheckCircle2, AlertTriangle } from "lucide-react";

export default function OwnerExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState<number>(1);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS_BANK">("CASH");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadExpenses = () => {
    setLoading(true);
    apiFetch("/owner/expenses")
      .then((res) => {
        setExpenses(res.expenses || []);
        const cats = res.categories || [];
        setCategories(cats);
        if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/owner/expenses", {
        method: "POST",
        body: JSON.stringify({
          expense_category_id: categoryId,
          amount: Number(amount),
          payment_method: paymentMethod,
          description: description.trim(),
        }),
      });
      setFeedback(res.message);
      setAmount("");
      setDescription("");
      loadExpenses();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso">
            Manajemen Pengeluaran Operasional
          </h1>
          <p className="text-xs text-text-muted">
            Catat dan ekspor biaya operasional toko per kategori (AC-22, AC-35)
          </p>
        </div>
        <a
          href="/api/v1/owner/exports?type=expenses&format=csv"
          className="h-11 px-4 rounded-xl bg-surface-cream border border-border-sand text-xs font-bold text-nav-espresso flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-primary-container" />
          <span>Ekspor CSV Pengeluaran</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <h2 className="text-base font-bold text-nav-espresso">
            Catat Pengeluaran Baru
          </h2>

          {feedback && (
            <div className="p-3 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedback}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Nominal (Rp)
              </label>
              <input
                type="number"
                min={100}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-canvas-cream border border-border-sand font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`h-10 rounded-xl border font-bold cursor-pointer ${
                    paymentMethod === "CASH"
                      ? "bg-nav-espresso text-canvas-cream"
                      : "bg-canvas-cream border-border-sand"
                  }`}
                >
                  Kas Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS_BANK")}
                  className={`h-10 rounded-xl border font-bold cursor-pointer ${
                    paymentMethod === "QRIS_BANK"
                      ? "bg-nav-espresso text-canvas-cream"
                      : "bg-canvas-cream border-border-sand"
                  }`}
                >
                  Rekening Bank
                </button>
              </div>
            </div>
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Deskripsi
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? "Menyimpan..." : "Simpan Pengeluaran"}</span>
            </button>
          </form>
        </section>

        <section className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
          <h2 className="text-base font-bold text-nav-espresso">
            Daftar Pengeluaran Tercatat
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-3 px-3">Kode</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Deskripsi</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-text-muted">
                      Memuat...
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-3 px-3 font-mono font-bold">
                        {exp.expense_code}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-text-muted">
                        {String(exp.expense_date).slice(0, 10)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-nav-espresso">
                        {exp.category?.name}
                      </td>
                      <td className="py-3 px-3">
                        {exp.description}
                        <span className="block text-[10px] text-text-muted">
                          Oleh: {exp.actor_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-error tabular-nums">
                        −{formatRupiah(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
