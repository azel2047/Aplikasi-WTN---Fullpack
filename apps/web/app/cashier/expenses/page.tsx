"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatRupiah } from "@/lib/api";
import { Wallet, PlusCircle, CheckCircle2, AlertTriangle } from "lucide-react";

export default function CashierExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState<number>(1);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS_BANK">("CASH");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    apiFetch("/cashier/expenses")
      .then((res) => {
        setExpenses(res.expenses || []);
        const cats = res.categories || [];
        setCategories(cats);
        if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
        setAccounts(res.cash_accounts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch("/cashier/expenses", {
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
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mencatat pengeluaran.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Form */}
      <section className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary-container flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-nav-espresso">
              Catat Pengeluaran Operasional
            </h1>
            <p className="text-xs text-text-muted">
              Listrik, gas elpiji, es kristal, kebersihan, atau biaya toko (AC-22)
            </p>
          </div>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Kategori Pengeluaran
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-semibold text-nav-espresso"
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
              Nominal Pengeluaran (Rp)
            </label>
            <input
              type="number"
              min={100}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 22000"
              className="w-full h-11 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-sm font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Sumber Kas Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`h-10 rounded-xl border font-bold cursor-pointer ${
                  paymentMethod === "CASH"
                    ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                    : "bg-canvas-cream text-on-surface border-border-sand"
                }`}
              >
                Kas Tunai Laci
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS_BANK")}
                className={`h-10 rounded-xl border font-bold cursor-pointer ${
                  paymentMethod === "QRIS_BANK"
                    ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                    : "bg-canvas-cream text-on-surface border-border-sand"
                }`}
              >
                Rekening Bank
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-nav-espresso block mb-1">
              Keterangan / Deskripsi
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Beli tabung gas LPG 3kg dapur / es batu kristal 2 karung..."
              className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{submitting ? "Menyimpan..." : "Simpan Pengeluaran"}</span>
          </button>
        </form>
      </section>

      {/* Right List */}
      <section className="lg:col-span-7 space-y-4">
        {/* Cash Account Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-surface-cream border border-border-sand rounded-2xl p-4 soft-shadow"
            >
              <span className="text-xs text-text-muted block">{acc.name}</span>
              <span className="text-lg font-bold text-nav-espresso tabular-nums mt-1 block">
                {formatRupiah(acc.current_balance)}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-3">
          <h2 className="text-sm font-bold text-nav-espresso">
            Riwayat Pengeluaran Operasional
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Deskripsi</th>
                  <th className="py-3 px-3">Petugas</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-text-muted">
                      Memuat data...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-text-muted">
                      Belum ada catatan pengeluaran.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-3 px-3 tabular-nums text-text-muted">
                        {String(exp.expense_date).slice(0, 10)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-nav-espresso">
                        {exp.category?.name || "-"}
                      </td>
                      <td className="py-3 px-3">{exp.description}</td>
                      <td className="py-3 px-3 text-text-muted">{exp.actor_name}</td>
                      <td className="py-3 px-3 text-right font-bold text-error tabular-nums">
                        −{formatRupiah(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
