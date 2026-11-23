"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch, formatDateTimeWIB, formatRupiah } from "@/lib/api";
import {
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  X,
  Trash2,
} from "lucide-react";

const INVENTORY_TABS = [
  { id: "ingredients", label: "Bahan Baku", href: "/owner/inventory/ingredients" },
  { id: "recipes", label: "Resep Menu", href: "/owner/inventory/recipes" },
  { id: "movements", label: "Mutasi Stok", href: "/owner/inventory/movements" },
  { id: "purchases", label: "Pembelian / Restock", href: "/owner/inventory/purchases" },
  { id: "opname", label: "Stock Opname", href: "/owner/inventory/stock-opname" },
];

export function InventoryWorkspace({
  defaultTab = "ingredients",
}: {
  defaultTab?: "ingredients" | "recipes" | "movements" | "purchases" | "opname";
}) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Add Ingredient Modal
  const [isAddIngOpen, setIsAddIngOpen] = useState(false);
  const [ingCatId, setIngCatId] = useState<number>(1);
  const [ingName, setIngName] = useState("");
  const [ingBaseUnit, setIngBaseUnit] = useState("gram");
  const [ingDisplayUnit, setIngDisplayUnit] = useState("kg");
  const [ingFactor, setIngFactor] = useState("1000");
  const [ingCurrentStock, setIngCurrentStock] = useState("2000");
  const [ingMinStock, setIngMinStock] = useState("1000");
  const [ingLastPrice, setIngLastPrice] = useState("50000");

  // Recipe Editor state
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [recipeItems, setRecipeItems] = useState<
    Array<{ ingredient_id: number; quantity: number }>
  >([]);
  const [recipeNotes, setRecipeNotes] = useState("");

  // Purchase Restock Form state
  const [supplierName, setSupplierName] = useState("Grosir Sembako & Kopi Pak Slamet");
  const [purchaseMethod, setPurchaseMethod] = useState<"CASH" | "QRIS_BANK">("CASH");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ ingredient_id: number; display_quantity: number; unit_price: number }>
  >([]);

  // Stock Opname Form state
  const [opnameIngId, setOpnameIngId] = useState<number>(0);
  const [opnamePhysicalBase, setOpnamePhysicalBase] = useState<string>("");
  const [opnameReason, setOpnameReason] = useState<string>(
    "Penyesuaian hitung fisik mingguan"
  );

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([apiFetch("/owner/inventory"), apiFetch("/owner/products")])
      .then(([invRes, prodRes]) => {
        const ings = invRes.ingredients || [];
        setIngredients(ings);
        setCategories(invRes.ingredient_categories || []);
        setRecipes(invRes.recipes || []);
        setMovements(invRes.movements || []);
        setPurchases(invRes.purchases || []);
        setAdjustments(invRes.adjustments || []);

        const prods = prodRes.products || [];
        setProducts(prods);

        if (ings.length > 0) {
          if (!opnameIngId) {
            setOpnameIngId(ings[0].id);
            setOpnamePhysicalBase(String(ings[0].current_stock));
          }
          if (purchaseItems.length === 0) {
            setPurchaseItems([
              {
                ingredient_id: ings[0].id,
                display_quantity: 1,
                unit_price: ings[0].last_purchase_price_per_display_unit || 50000,
              },
            ]);
          }
        }

        if (prods.length > 0 && !selectedProductId) {
          selectProductForRecipe(prods[0].id, invRes.recipes || [], ings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadData();
  }, []);

  const selectProductForRecipe = (
    prodId: number,
    allRecipes = recipes,
    allIngs = ingredients
  ) => {
    setSelectedProductId(prodId);
    const existing = allRecipes.find((r: any) => r.product_id === prodId);
    if (existing) {
      setRecipeNotes(existing.notes || "");
      setRecipeItems(
        existing.items.map((it: any) => ({
          ingredient_id: it.ingredient_id,
          quantity: Number(it.quantity),
        }))
      );
    } else {
      setRecipeNotes("");
      setRecipeItems(
        allIngs.length > 0 ? [{ ingredient_id: allIngs[0].id, quantity: 10 }] : []
      );
    }
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/owner/ingredients", {
        method: "POST",
        body: JSON.stringify({
          ingredient_category_id: ingCatId,
          name: ingName.trim(),
          base_unit: ingBaseUnit,
          display_unit: ingDisplayUnit,
          display_conversion_factor: Number(ingFactor),
          current_stock: Number(ingCurrentStock),
          minimum_stock: Number(ingMinStock),
          last_purchase_price_per_display_unit: Number(ingLastPrice),
        }),
      });
      setFeedback(res.message);
      setIsAddIngOpen(false);
      setIngName("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/owner/recipes", {
        method: "POST",
        body: JSON.stringify({
          product_id: selectedProductId,
          is_validated: true,
          notes: recipeNotes.trim() || null,
          items: recipeItems,
        }),
      });
      setFeedback(res.message);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0 || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/owner/inventory/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplier_name: supplierName.trim(),
          payment_method: purchaseMethod,
          notes: purchaseNotes.trim() || null,
          items: purchaseItems,
        }),
      });
      setFeedback(res.message);
      setPurchaseNotes("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameIngId || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/owner/inventory/stock-opname", {
        method: "POST",
        body: JSON.stringify({
          ingredient_id: opnameIngId,
          physical_stock_in_base_unit: Number(opnamePhysicalBase),
          reason: opnameReason.trim(),
        }),
      });
      setFeedback(res.message);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const lowCount = ingredients.filter((i) => i.stock_status === "MENIPIS").length;
  const outCount = ingredients.filter((i) => i.stock_status === "HABIS").length;
  const safeCount = ingredients.filter((i) => i.stock_status === "AMAN").length;

  const filteredIngredients =
    statusFilter === "ALL"
      ? ingredients
      : ingredients.filter((i) => i.stock_status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header matching Stitch Inventory */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso">Inventory</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Kelola stok bahan baku, konversi takaran resep, mutasi, pembelian
            restock, dan stock opname (AC-15 s/d AC-21).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/v1/owner/exports?type=inventory&format=csv"
            className="h-11 px-4 rounded-xl bg-surface-cream border border-border-sand text-xs font-bold text-nav-espresso flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-primary-container" />
            <span>Ekspor CSV Stok</span>
          </a>
          <button
            type="button"
            onClick={() => setIsAddIngOpen(true)}
            className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Bahan Baku</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-border-sand overflow-x-auto">
        {INVENTORY_TABS.map((tab) => {
          const isActive =
            activeTab === tab.id || pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary-container text-primary-container"
                  : "border-transparent text-text-muted hover:text-nav-espresso"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Warning Banner */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="p-4 rounded-xl bg-warning-subtle border border-warning/30 flex items-center justify-between gap-3 text-xs text-warning">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              <strong>
                {lowCount} bahan menipis, {outCount} bahan habis.
              </strong>{" "}
              Menu yang memakai bahan habis otomatis terkunci di kasir dan QR
              meja untuk mencegah stok negatif (AC-19).
            </span>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-subtle text-error text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: INGREDIENTS MASTER */}
      {activeTab === "ingredients" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: `Semua (${ingredients.length})` },
              { id: "AMAN", label: `Aman (${safeCount})` },
              { id: "MENIPIS", label: `Menipis (${lowCount})` },
              { id: "HABIS", label: `Habis (${outCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`h-9 px-4 rounded-full text-xs font-bold cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-nav-espresso text-canvas-cream"
                    : "bg-surface-variant text-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-surface-cream border border-border-sand rounded-2xl overflow-hidden soft-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-text-muted uppercase border-b border-border-sand">
                    <th className="py-3.5 px-4">Bahan Baku</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4 text-right">
                      Stok (Satuan Tampil)
                    </th>
                    <th className="py-3.5 px-4 text-right">
                      Stok (Satuan Dasar Resep)
                    </th>
                    <th className="py-3.5 px-4 text-right">Batas Min.</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">
                      Harga Beli Terakhir
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-text-muted">
                        Memuat bahan baku...
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => (
                      <tr key={ing.id}>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-nav-espresso block">
                            {ing.name}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            {ing.code} • {ing.notes}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-secondary">
                          {ing.category?.name || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-nav-espresso tabular-nums">
                          {ing.display_current_stock} {ing.display_unit}
                        </td>
                        <td className="py-3.5 px-4 text-right text-text-muted tabular-nums">
                          {Number(ing.current_stock).toLocaleString("id-ID")}{" "}
                          {ing.base_unit}
                        </td>
                        <td className="py-3.5 px-4 text-right text-text-muted tabular-nums">
                          {ing.display_minimum_stock} {ing.display_unit}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              ing.stock_status === "AMAN"
                                ? "bg-success-subtle text-tertiary"
                                : ing.stock_status === "MENIPIS"
                                ? "bg-warning-subtle text-warning"
                                : "bg-error-subtle text-error"
                            }`}
                          >
                            {ing.stock_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                          {formatRupiah(
                            ing.last_purchase_price_per_display_unit
                          )}
                          /{ing.display_unit}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECIPES EDITOR (AC-16, AC-17) */}
      {activeTab === "recipes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Product List */}
          <div className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow space-y-3">
            <h2 className="text-sm font-bold text-nav-espresso">
              Pilih Produk Menu untuk Atur Resep
            </h2>
            <p className="text-xs text-text-muted">
              Produk tanpa resep tervalidasi tidak akan mengurangi stok bahan
              baku secara otomatis (AC-17).
            </p>
            <div className="space-y-2">
              {products.map((p) => {
                const rec = recipes.find((r) => r.product_id === p.id);
                const isSel = selectedProductId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProductForRecipe(p.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs cursor-pointer ${
                      isSel
                        ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    <div>
                      <span className="font-bold block">{p.name}</span>
                      <span
                        className={`text-[11px] ${
                          isSel ? "text-border-sand" : "text-text-muted"
                        }`}
                      >
                        Harga Jual: {formatRupiah(p.price)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec
                          ? "bg-success-subtle text-tertiary"
                          : "bg-warning-subtle text-warning"
                      }`}
                    >
                      {rec
                        ? `${rec.items?.length || 0} Bahan (HPP ${formatRupiah(
                            rec.estimated_cogs
                          )})`
                        : "Non-Resep"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe Form */}
          <div className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
            <h2 className="text-base font-bold text-nav-espresso">
              Komposisi Resep per 1 Porsi Produk
            </h2>
            <form onSubmit={handleSaveRecipe} className="space-y-4 text-xs">
              <div className="space-y-2.5">
                {recipeItems.map((row, idx) => {
                  const ing = ingredients.find(
                    (i) => i.id === row.ingredient_id
                  );
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas-cream border border-border-sand"
                    >
                      <select
                        value={row.ingredient_id}
                        onChange={(e) => {
                          const updated = [...recipeItems];
                          updated[idx].ingredient_id = Number(e.target.value);
                          setRecipeItems(updated);
                        }}
                        className="flex-1 h-10 px-2.5 rounded-lg bg-surface-cream border border-border-sand font-semibold"
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Satuan: {i.base_unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min={0.1}
                        required
                        value={row.quantity}
                        onChange={(e) => {
                          const updated = [...recipeItems];
                          updated[idx].quantity = Number(e.target.value);
                          setRecipeItems(updated);
                        }}
                        className="w-24 h-10 px-2.5 rounded-lg bg-surface-cream border border-border-sand text-right font-bold tabular-nums"
                      />
                      <span className="w-12 text-text-muted font-semibold">
                        {ing?.base_unit || "unit"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRecipeItems((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="w-9 h-9 rounded-lg bg-error-subtle text-error flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  ingredients.length > 0 &&
                  setRecipeItems((prev) => [
                    ...prev,
                    { ingredient_id: ingredients[0].id, quantity: 10 },
                  ])
                }
                className="h-9 px-3.5 rounded-lg bg-surface-variant text-nav-espresso font-bold cursor-pointer"
              >
                + Tambah Komponen Bahan
              </button>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Catatan Standar Takaran Barista / Dapur
                </label>
                <input
                  type="text"
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  placeholder="Contoh: 15g kopi robusta, 120ml susu cair, 25ml gula aren"
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold cursor-pointer"
              >
                {submitting ? "Menyimpan Resep..." : "Simpan & Validasi Resep"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY MOVEMENTS (AC-20) */}
      {activeTab === "movements" && (
        <div className="bg-surface-cream border border-border-sand rounded-2xl overflow-hidden soft-shadow">
          <div className="p-5 border-b border-surface-variant">
            <h2 className="text-base font-bold text-nav-espresso">
              Histori Mutasi Stok Bahan Baku (Append-Only Audit Trail)
            </h2>
            <p className="text-xs text-text-muted">
              Mencatat setiap pemotongan stok resep order, pembelian restock,
              pengembalian pembatalan, dan stock opname beserta actor (AC-20).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-text-muted border-b border-border-sand">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Bahan Baku</th>
                  <th className="py-3 px-4">Tipe Mutasi</th>
                  <th className="py-3 px-4 text-right">Kuantitas</th>
                  <th className="py-3 px-4 text-right">Saldo Sebelum</th>
                  <th className="py-3 px-4 text-right">Saldo Sesudah</th>
                  <th className="py-3 px-4">Keterangan &amp; Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 px-4 text-text-muted tabular-nums">
                      {formatDateTimeWIB(m.created_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-nav-espresso">
                      {m.ingredient?.name || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          m.direction === "IN"
                            ? "bg-success-subtle text-tertiary"
                            : "bg-primary-subtle text-on-primary-subtle"
                        }`}
                      >
                        {m.direction} • {m.movement_type}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold tabular-nums ${
                        m.direction === "IN" ? "text-tertiary" : "text-error"
                      }`}
                    >
                      {m.direction === "IN" ? "+" : "−"}
                      {m.quantity} {m.ingredient?.base_unit}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-text-muted">
                      {m.stock_before} {m.ingredient?.base_unit}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">
                      {m.stock_after} {m.ingredient?.base_unit}
                    </td>
                    <td className="py-3 px-4">
                      <span className="block">{m.notes}</span>
                      <span className="text-[10px] text-text-muted">
                        Oleh: <strong>{m.actor_name}</strong>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK PURCHASES / RESTOCK (AC-21) */}
      {activeTab === "purchases" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
            <h2 className="text-base font-bold text-nav-espresso">
              Catat Pembelian / Restock Bahan Baku (AC-21)
            </h2>
            <p className="text-xs text-text-muted">
              Menambah stok gudang melalui mutasi stok dan mencatat arus kas
              keluar pembelian persediaan (tidak dihitung ganda sebagai HPP).
            </p>

            <form onSubmit={handleCreatePurchase} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Nama Pemasok / Toko
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Sumber Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurchaseMethod("CASH")}
                    className={`h-10 rounded-xl border font-bold cursor-pointer ${
                      purchaseMethod === "CASH"
                        ? "bg-nav-espresso text-canvas-cream"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    Kas Tunai Laci
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseMethod("QRIS_BANK")}
                    className={`h-10 rounded-xl border font-bold cursor-pointer ${
                      purchaseMethod === "QRIS_BANK"
                        ? "bg-nav-espresso text-canvas-cream"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    Transfer Rekening
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-nav-espresso block">
                  Item Bahan yang Dibeli
                </label>
                {purchaseItems.map((row, idx) => {
                  const ing = ingredients.find(
                    (i) => i.id === row.ingredient_id
                  );
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-canvas-cream border border-border-sand space-y-2"
                    >
                      <select
                        value={row.ingredient_id}
                        onChange={(e) => {
                          const newId = Number(e.target.value);
                          const target = ingredients.find((i) => i.id === newId);
                          const updated = [...purchaseItems];
                          updated[idx].ingredient_id = newId;
                          if (target) {
                            updated[idx].unit_price =
                              target.last_purchase_price_per_display_unit;
                          }
                          setPurchaseItems(updated);
                        }}
                        className="w-full h-10 px-2.5 rounded-lg bg-surface-cream border border-border-sand font-semibold"
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ( per {i.display_unit})
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-text-muted block">
                            Kuantitas ({ing?.display_unit})
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            min={0.1}
                            required
                            value={row.display_quantity}
                            onChange={(e) => {
                              const updated = [...purchaseItems];
                              updated[idx].display_quantity = Number(
                                e.target.value
                              );
                              setPurchaseItems(updated);
                            }}
                            className="w-full h-9 px-2.5 rounded-lg bg-surface-cream border border-border-sand font-bold tabular-nums"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">
                            Harga / {ing?.display_unit} (Rp)
                          </span>
                          <input
                            type="number"
                            min={0}
                            required
                            value={row.unit_price}
                            onChange={(e) => {
                              const updated = [...purchaseItems];
                              updated[idx].unit_price = Number(e.target.value);
                              setPurchaseItems(updated);
                            }}
                            className="w-full h-9 px-2.5 rounded-lg bg-surface-cream border border-border-sand font-bold tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold cursor-pointer"
              >
                {submitting ? "Menyimpan..." : "Simpan Pembelian & Tambah Stok"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
            <h2 className="text-base font-bold text-nav-espresso">
              Riwayat Pembelian Bahan Baku
            </h2>
            <div className="space-y-3">
              {purchases.map((po) => (
                <div
                  key={po.id}
                  className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-nav-espresso">
                        {po.purchase_code} • {po.supplier_name}
                      </span>
                      <span className="text-text-muted block">
                        Tanggal: {String(po.purchase_date).slice(0, 10)} • Oleh:{" "}
                        {po.actor_name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-primary-container tabular-nums">
                      {formatRupiah(po.total_amount)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border-sand/60 space-y-1">
                    {po.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          {it.ingredient?.name} ({it.display_quantity}{" "}
                          {it.display_unit})
                        </span>
                        <span className="tabular-nums font-semibold">
                          {formatRupiah(it.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STOCK OPNAME */}
      {activeTab === "opname" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
            <h2 className="text-base font-bold text-nav-espresso">
              Rekonsiliasi Fisik (Stock Opname)
            </h2>
            <p className="text-xs text-text-muted">
              Mencatat stok sistem, hasil hitung fisik di dapur, selisih, alasan,
              dan petugas ke dalam audit trail.
            </p>

            <form onSubmit={handleCreateOpname} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Pilih Bahan Baku
                </label>
                <select
                  value={opnameIngId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setOpnameIngId(id);
                    const target = ingredients.find((i) => i.id === id);
                    if (target) setOpnamePhysicalBase(String(target.current_stock));
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-semibold"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Sistem: {i.current_stock} {i.base_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Stok Fisik Aktual (Dalam Satuan Dasar Resep)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  required
                  value={opnamePhysicalBase}
                  onChange={(e) => setOpnamePhysicalBase(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Alasan Penyesuaian / Opname (Wajib)
                </label>
                <input
                  type="text"
                  required
                  value={opnameReason}
                  onChange={(e) => setOpnameReason(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold cursor-pointer"
              >
                {submitting ? "Menyimpan..." : "Simpan Hasil Stock Opname"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-4">
            <h2 className="text-base font-bold text-nav-espresso">
              Riwayat Stock Opname &amp; Penyesuaian
            </h2>
            {adjustments.length === 0 ? (
              <p className="text-xs text-text-muted">
                Belum ada catatan stock opname.
              </p>
            ) : (
              <div className="space-y-3">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="p-4 rounded-xl bg-canvas-cream border border-border-sand text-xs space-y-1.5"
                  >
                    <div className="flex justify-between font-bold text-nav-espresso">
                      <span>
                        {adj.adjustment_code} • {adj.ingredient?.name}
                      </span>
                      <span className="tabular-nums">
                        Selisih: {adj.difference > 0 ? "+" : ""}
                        {adj.difference} {adj.ingredient?.base_unit}
                      </span>
                    </div>
                    <p className="text-text-muted">
                      Stok Sistem: {adj.system_stock} → Fisik:{" "}
                      <strong>{adj.physical_stock}</strong>{" "}
                      {adj.ingredient?.base_unit}
                    </p>
                    <p>
                      Alasan: <strong>{adj.reason}</strong> (Oleh:{" "}
                      {adj.actor_name})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {isAddIngOpen && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-nav-espresso">
                Tambah Bahan Baku Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddIngOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateIngredient} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Nama Bahan Baku
                </label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="Contoh: Cokelat Meses Ceres"
                  className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold block mb-1">Satuan Resep</label>
                  <input
                    type="text"
                    required
                    value={ingBaseUnit}
                    onChange={(e) => setIngBaseUnit(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Satuan Beli</label>
                  <input
                    type="text"
                    required
                    value={ingDisplayUnit}
                    onChange={(e) => setIngDisplayUnit(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Konversi</label>
                  <input
                    type="number"
                    required
                    value={ingFactor}
                    onChange={(e) => setIngFactor(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold block mb-1">
                    Stok Awal ({ingBaseUnit})
                  </label>
                  <input
                    type="number"
                    required
                    value={ingCurrentStock}
                    onChange={(e) => setIngCurrentStock(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">
                    Min ({ingBaseUnit})
                  </label>
                  <input
                    type="number"
                    required
                    value={ingMinStock}
                    onChange={(e) => setIngMinStock(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">
                    Harga/{ingDisplayUnit}
                  </label>
                  <input
                    type="number"
                    required
                    value={ingLastPrice}
                    onChange={(e) => setIngLastPrice(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddIngOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-variant font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-4 rounded-xl bg-primary-container text-on-primary font-bold cursor-pointer"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
