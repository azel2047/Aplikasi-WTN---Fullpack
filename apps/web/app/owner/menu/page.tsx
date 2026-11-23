"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, formatRupiah } from "@/lib/api";
import {
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  UtensilsCrossed,
} from "lucide-react";

export default function OwnerMenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<number | "ALL">("ALL");

  // Modal state for Add/Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [catId, setCatId] = useState<number>(1);
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [unitLabel, setUnitLabel] = useState<string>("porsi");
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [trackInventory, setTrackInventory] = useState<boolean>(true);

  // Add Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMenu = () => {
    setLoading(true);
    apiFetch("/owner/products")
      .then((res) => {
        const cats = res.categories || [];
        setCategories(cats);
        setProducts(res.products || []);
        if (cats.length > 0 && !catId) setCatId(cats[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const openAddProduct = () => {
    setEditingProduct(null);
    setCatId(categories[0]?.id || 1);
    setName("");
    setPrice("12000");
    setDescription("");
    setImageUrl(
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"
    );
    setUnitLabel("porsi");
    setIsAvailable(true);
    setTrackInventory(true);
    setIsModalOpen(true);
  };

  const openEditProduct = (p: any) => {
    setEditingProduct(p);
    setCatId(p.category_id);
    setName(p.name);
    setPrice(String(p.price));
    setDescription(p.description || "");
    setImageUrl(p.image_url || "");
    setUnitLabel(p.unit_label || "porsi");
    setIsAvailable(Boolean(p.is_available));
    setTrackInventory(Boolean(p.track_inventory));
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        category_id: catId,
        name: name.trim(),
        price: Number(price),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        unit_label: unitLabel.trim() || "porsi",
        is_available: isAvailable,
        track_inventory: trackInventory,
      };

      if (editingProduct) {
        const res = await apiFetch(`/owner/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setFeedback(res.message);
      } else {
        const res = await apiFetch("/owner/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFeedback(res.message);
      }
      setIsModalOpen(false);
      loadMenu();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (p: any) => {
    try {
      await apiFetch(`/owner/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: !p.is_available }),
      });
      loadMenu();
    } catch {}
  };

  const handleDeleteProduct = async (p: any) => {
    if (!window.confirm(`Hapus produk "${p.name}" dari katalog menu?`)) return;
    try {
      const res = await apiFetch(`/owner/products/${p.id}`, {
        method: "DELETE",
      });
      setFeedback(res.message);
      loadMenu();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await apiFetch("/owner/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      setFeedback(res.message);
      setNewCatName("");
      setIsCatModalOpen(false);
      loadMenu();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredProducts =
    selectedCatId === "ALL"
      ? products
      : products.filter((p) => p.category_id === selectedCatId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso">
            Manajemen Katalog Menu &amp; Harga
          </h1>
          <p className="text-xs text-text-muted">
            Kelola kategori, produk, harga, ketersediaan, serta tautan resep bahan
            baku
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCatModalOpen(true)}
            className="h-11 px-4 rounded-xl bg-surface-cream border border-border-sand hover:bg-surface-variant text-xs font-bold text-nav-espresso cursor-pointer"
          >
            + Tambah Kategori
          </button>
          <button
            type="button"
            onClick={openAddProduct}
            className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Menu Baru</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCatId("ALL")}
          className={`h-10 px-4 rounded-full text-xs font-bold shrink-0 cursor-pointer ${
            selectedCatId === "ALL"
              ? "bg-nav-espresso text-canvas-cream"
              : "bg-surface-variant text-secondary"
          }`}
        >
          Semua ({products.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCatId(c.id)}
            className={`h-10 px-4 rounded-full text-xs font-bold shrink-0 cursor-pointer ${
              selectedCatId === c.id
                ? "bg-nav-espresso text-canvas-cream"
                : "bg-surface-variant text-secondary"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-surface-cream border border-border-sand animate-pulse"
            />
          ))
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-surface-cream border border-border-sand rounded-2xl p-4 soft-shadow flex flex-col justify-between gap-3"
            >
              <div className="space-y-2.5">
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-surface-variant">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className={`w-full h-full object-cover ${
                        !p.effective_available ? "grayscale opacity-50" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <UtensilsCrossed className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-nav-espresso text-canvas-cream text-[10px] font-bold">
                      {p.category?.name}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.effective_available
                          ? "bg-success-subtle text-tertiary"
                          : "bg-error text-on-error"
                      }`}
                    >
                      {p.effective_available
                        ? "Tersedia"
                        : p.stock_status_reason || "Nonaktif"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-nav-espresso truncate">
                      {p.name}
                    </h3>
                    <span className="text-xs font-mono text-text-muted">
                      {p.sku}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2 mt-0.5">
                    {p.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-text-muted block">
                      Harga Jual
                    </span>
                    <span className="text-base font-bold text-primary-container tabular-nums">
                      {formatRupiah(p.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-text-muted block">
                      Estimasi HPP Resep
                    </span>
                    <span className="text-xs font-bold text-secondary tabular-nums">
                      {p.recipe
                        ? formatRupiah(p.recipe.estimated_cogs)
                        : "Tanpa Resep"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-variant flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(p)}
                  className={`h-9 px-3 rounded-lg font-bold cursor-pointer ${
                    p.is_available
                      ? "bg-surface-variant text-secondary"
                      : "bg-success-subtle text-tertiary"
                  }`}
                >
                  {p.is_available ? "Nonaktifkan" : "Aktifkan"}
                </button>

                <div className="flex items-center gap-1.5">
                  <Link
                    href="/owner/inventory/recipes"
                    className="h-9 px-2.5 rounded-lg bg-surface-variant hover:bg-border-sand text-nav-espresso font-bold flex items-center"
                  >
                    Resep
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEditProduct(p)}
                    className="w-9 h-9 rounded-lg bg-primary-subtle text-primary-container flex items-center justify-center cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p)}
                    className="w-9 h-9 rounded-lg bg-error-subtle text-error flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-nav-espresso">
                {editingProduct ? `Edit Menu: ${editingProduct.name}` : "Tambah Menu Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nav-espresso block mb-1">
                    Kategori Menu
                  </label>
                  <select
                    value={catId}
                    onChange={(e) => setCatId(Number(e.target.value))}
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
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Tubruk Jahe"
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3"
                />
              </div>

              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  URL Foto Produk
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>

              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-primary-container"
                  />
                  <span className="font-semibold">Tersedia Dijual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackInventory}
                    onChange={(e) => setTrackInventory(e.target.checked)}
                    className="w-4 h-4 accent-primary-container"
                  />
                  <span className="font-semibold">Potong Stok Bahan Resep</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-4 rounded-xl bg-surface-variant text-secondary font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-5 rounded-xl bg-primary-container text-on-primary font-bold cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-nav-espresso">
              Tambah Kategori Menu
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Contoh: Minuman Tradisional"
                className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-variant text-secondary font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-primary-container text-on-primary font-bold cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
