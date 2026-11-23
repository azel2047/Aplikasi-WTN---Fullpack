"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, formatRupiah } from "@/lib/api";
import {
  Search,
  Plus,
  Minus,
  FileText,
  Utensils,
  ShoppingBag,
  CheckCircle2,
  X,
  Wallet,
  QrCode,
  Printer,
} from "lucide-react";

export default function CashierManualPosPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ticket Configuration
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<number>(4);
  const [customerName, setCustomerName] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<any[]>([]);

  // Note / Options Modal
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalOptionIds, setModalOptionIds] = useState<number[]>([]);
  const [modalNote, setModalNote] = useState<string>("");

  // Payment Confirmation Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    apiFetch("/cashier/pos/catalog")
      .then((res) => {
        setCategories(res.categories || []);
        const tbls = res.tables || [];
        setTables(tbls);
        if (tbls.length > 0) setSelectedTableId(tbls[3]?.id || tbls[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openProductCustomizer = (product: any) => {
    if (!product.effective_available) return;
    setCustomizingProduct(product);
    setModalQty(1);
    const defaults: number[] = [];
    product.options?.forEach((opt: any) => {
      const def = opt.values.find((v: any) => v.is_default) || opt.values[0];
      if (def) defaults.push(def.id);
    });
    setModalOptionIds(defaults);
    setModalNote("");
  };

  const addCustomizedToCart = () => {
    if (!customizingProduct) return;
    const selectedOptions: any[] = [];
    customizingProduct.options?.forEach((opt: any) => {
      opt.values.forEach((v: any) => {
        if (modalOptionIds.includes(v.id)) selectedOptions.push(v);
      });
    });

    setCart((prev) => [
      ...prev,
      {
        cartId: `${customizingProduct.id}_${Date.now()}`,
        product: customizingProduct,
        quantity: modalQty,
        selectedOptions,
        itemNote: modalNote.trim().slice(0, 250),
      },
    ]);
    setCustomizingProduct(null);
  };

  const updateCartQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const filteredProducts = useMemo(() => {
    const all: any[] = [];
    categories.forEach((cat) => {
      if (selectedCategory !== "ALL" && cat.slug !== selectedCategory) return;
      cat.products?.forEach((p: any) => {
        if (
          searchQuery.trim() &&
          !p.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return;
        }
        all.push(p);
      });
    });
    return all;
  }, [categories, selectedCategory, searchQuery]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let itemCount = 0;
    cart.forEach((item) => {
      itemCount += item.quantity;
      const optDelta = item.selectedOptions.reduce(
        (acc: number, o: any) => acc + o.price_delta,
        0
      );
      subtotal += (item.product.price + optDelta) * item.quantity;
    });
    const discount = Math.min(subtotal, Math.max(0, discountAmount));
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * 0.1);
    const total = taxable + tax;
    return { itemCount, subtotal, discount, tax, total };
  }, [cart, discountAmount]);

  const submitPosOrder = async (payImmediately: boolean) => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        order_type: orderType,
        dining_table_id: orderType === "DINE_IN" ? selectedTableId : null,
        customer_name:
          customerName.trim() ||
          (orderType === "DINE_IN" ? "Pelanggan Dine-in POS" : "Pelanggan Bawa Pulang"),
        payment_method: paymentMethod,
        discount_amount: totals.discount,
        pay_immediately: payImmediately,
        amount_received:
          paymentMethod === "CASH"
            ? Number(cashReceived || totals.total)
            : totals.total,
        idempotency_key: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          option_value_ids: i.selectedOptions.map((o: any) => o.id),
          item_note: i.itemNote || null,
        })),
      };

      const res = await apiFetch("/cashier/pos/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCart([]);
      setCustomerName("");
      setDiscountAmount(0);
      setIsCheckoutModalOpen(false);

      if (payImmediately) {
        setCompletedOrder(res.order);
      } else {
        router.push("/cashier/orders");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat pesanan POS.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left/Center Catalog */}
      <section className="lg:col-span-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-nav-espresso">
              POS Manual Kasir
            </h1>
            <p className="text-xs text-text-muted">
              Input pesanan langsung untuk pelanggan walk-in atau meja (masuk ke
              antrean terpadu)
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu..."
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-cream border border-border-sand text-xs text-on-surface"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`h-10 px-4 rounded-full text-xs font-bold shrink-0 cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-nav-espresso text-canvas-cream"
                : "bg-surface-variant text-secondary"
            }`}
          >
            Semua Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`h-10 px-4 rounded-full text-xs font-bold shrink-0 cursor-pointer ${
                selectedCategory === cat.slug
                  ? "bg-nav-espresso text-canvas-cream"
                  : "bg-surface-variant text-secondary"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-surface-cream border border-border-sand animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const available = product.effective_available;
              return (
                <div
                  key={product.id}
                  onClick={() => available && openProductCustomizer(product)}
                  className={`bg-surface-cream border border-border-sand rounded-2xl p-3 flex flex-col justify-between soft-shadow transition-all ${
                    available
                      ? "hover:border-primary-container cursor-pointer"
                      : "opacity-65 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-surface-variant">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={`w-full h-full object-cover ${
                            !available ? "grayscale opacity-40" : ""
                          }`}
                        />
                      )}
                      {!available && (
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-error text-on-error text-[10px] font-bold">
                          Stok Habis
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-nav-espresso mt-2.5 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-text-muted truncate">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary-container tabular-nums">
                      {formatRupiah(product.price)}
                    </span>
                    <button
                      type="button"
                      disabled={!available}
                      className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Right Active POS Ticket Panel (360px equivalent) */}
      <aside className="lg:col-span-4 bg-surface-cream border border-border-sand rounded-2xl p-5 soft-shadow sticky top-20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-nav-espresso">
              Tiket POS Baru
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-primary-subtle text-on-primary-subtle text-[11px] font-bold">
              POS
            </span>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-bold text-error hover:underline cursor-pointer"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Dine-in vs Takeaway Switch */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-variant">
          <button
            type="button"
            onClick={() => setOrderType("DINE_IN")}
            className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
              orderType === "DINE_IN"
                ? "bg-surface-cream text-nav-espresso shadow-sm"
                : "text-secondary"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Makan di Meja</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderType("TAKEAWAY")}
            className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
              orderType === "TAKEAWAY"
                ? "bg-surface-cream text-nav-espresso shadow-sm"
                : "text-secondary"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bawa Pulang</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {orderType === "DINE_IN" && (
            <div>
              <label className="text-[11px] font-bold text-secondary block mb-1">
                Pilih Meja
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(Number(e.target.value))}
                className="w-full h-10 px-2.5 rounded-xl bg-canvas-cream border border-border-sand text-xs font-bold text-nav-espresso"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={orderType === "DINE_IN" ? "" : "col-span-2"}>
            <label className="text-[11px] font-bold text-secondary block mb-1">
              Nama Pelanggan
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Pak Budi"
              className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand text-xs text-on-surface"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border-sand rounded-xl">
              Klik produk di katalog untuk menambahkan ke tiket pesanan.
            </div>
          ) : (
            cart.map((item) => {
              const optDelta = item.selectedOptions.reduce(
                (a: number, o: any) => a + o.price_delta,
                0
              );
              const lineTotal = (item.product.price + optDelta) * item.quantity;
              return (
                <div
                  key={item.cartId}
                  className="p-2.5 rounded-xl bg-canvas-cream border border-border-sand space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-nav-espresso truncate">
                        {item.product.name}
                      </h4>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-[11px] text-secondary truncate">
                          {item.selectedOptions.map((o: any) => o.name).join(" • ")}
                        </p>
                      )}
                      <span className="text-xs font-bold text-primary-container tabular-nums">
                        {formatRupiah(lineTotal)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.cartId, -1)}
                        className="w-7 h-7 rounded-full bg-surface-cream border border-border-sand flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.cartId, 1)}
                        className="w-7 h-7 rounded-full bg-surface-cream border border-border-sand flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {item.itemNote && (
                    <div className="px-2 py-1 rounded bg-surface-variant text-[11px] text-on-surface-variant flex items-center gap-1">
                      <FileText className="w-3 h-3 text-primary-container shrink-0" />
                      <span className="truncate">{item.itemNote}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Financial Block */}
        <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span>Subtotal ({totals.itemCount} item)</span>
            <span className="font-semibold tabular-nums">
              {formatRupiah(totals.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Diskon (Rp)</span>
            <input
              type="number"
              min={0}
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Number(e.target.value || 0))}
              placeholder="0"
              className="w-24 h-7 px-2 rounded bg-surface-cream border border-border-sand text-right text-xs font-semibold tabular-nums"
            />
          </div>
          <div className="flex justify-between">
            <span>PB1 (10%)</span>
            <span className="font-semibold tabular-nums">
              {formatRupiah(totals.tax)}
            </span>
          </div>
          <div className="border-t border-dashed border-border-strong/50 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-bold text-nav-espresso">
              Total Tagihan
            </span>
            <span className="text-lg font-bold text-primary-container tabular-nums">
              {formatRupiah(totals.total)}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={() => {
              setCashReceived(String(totals.total));
              setIsCheckoutModalOpen(true);
            }}
            className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover disabled:opacity-40 text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Bayar Sekarang ({formatRupiah(totals.total)})</span>
          </button>

          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={() => submitPosOrder(false)}
            className="w-full h-10 rounded-xl bg-surface-variant hover:bg-border-sand/60 disabled:opacity-40 text-nav-espresso text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Simpan ke Antrean (Bayar Nanti)</span>
          </button>
        </div>
      </aside>

      {/* Product Customizer & Item Note Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-nav-espresso">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs font-bold text-primary-container tabular-nums">
                  {formatRupiah(customizingProduct.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customizingProduct.options?.map((opt: any) => (
              <div key={opt.id} className="space-y-1.5">
                <label className="text-xs font-bold text-nav-espresso block">
                  {opt.name}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {opt.values.map((val: any) => {
                    const selected = modalOptionIds.includes(val.id);
                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => {
                          if (opt.selection_type === "single") {
                            const sibs = opt.values.map((v: any) => v.id);
                            setModalOptionIds((prev) => [
                              ...prev.filter((id) => !sibs.includes(id)),
                              val.id,
                            ]);
                          } else {
                            setModalOptionIds((prev) =>
                              prev.includes(val.id)
                                ? prev.filter((id) => id !== val.id)
                                : [...prev, val.id]
                            );
                          }
                        }}
                        className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                          selected
                            ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                            : "bg-canvas-cream text-on-surface border-border-sand"
                        }`}
                      >
                        <span className="truncate">{val.name}</span>
                        {val.price_delta > 0 && (
                          <span className="tabular-nums">
                            +{formatRupiah(val.price_delta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-bold text-nav-espresso">
                  Catatan Khusus Item (Maks 250 Karakter)
                </label>
                <span className="text-text-muted tabular-nums">
                  {modalNote.length}/250
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={250}
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder="Contoh: Es sedikit, gula 50%, sambal dipisah..."
                className="w-full rounded-xl bg-canvas-cream border border-border-sand p-2.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border border-primary-container text-primary-container flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold tabular-nums">
                  {modalQty}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQty((q) => q + 1)}
                  className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={addCustomizedToCart}
                className="h-11 px-5 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
              >
                Tambahkan ke Tiket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Payment Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-nav-espresso">
                Konfirmasi Pembayaran POS ({formatRupiah(totals.total)})
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === "CASH"
                    ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                    : "bg-canvas-cream text-on-surface border-border-sand"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Tunai (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                    : "bg-canvas-cream text-on-surface border-border-sand"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS Terverifikasi</span>
              </button>
            </div>

            {paymentMethod === "CASH" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-nav-espresso block mb-1">
                    Nominal Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    min={totals.total}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-base font-bold tabular-nums"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[totals.total, 20000, 50000, 100000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setCashReceived(String(nom))}
                      className="px-3 py-1.5 rounded-lg bg-surface-variant text-xs font-bold tabular-nums cursor-pointer"
                    >
                      {nom === totals.total ? "Uang Pas" : formatRupiah(nom)}
                    </button>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand flex justify-between items-center">
                  <span className="text-xs font-bold text-secondary">
                    Kembalian:
                  </span>
                  <span className="text-base font-bold text-tertiary tabular-nums">
                    {formatRupiah(
                      Math.max(0, Number(cashReceived || 0) - totals.total)
                    )}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={
                submitting ||
                (paymentMethod === "CASH" &&
                  Number(cashReceived || 0) < totals.total)
              }
              onClick={() => submitPosOrder(true)}
              className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover disabled:opacity-40 text-on-primary text-xs font-bold cursor-pointer"
            >
              {submitting
                ? "Memproses Transaksi..."
                : "Selesaikan Pembayaran & Cetak Struk"}
            </button>
          </div>
        </div>
      )}

      {/* Completed Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-success-subtle text-tertiary flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-nav-espresso">
                Transaksi Berhasil — {completedOrder.order_number}
              </h3>
              <p className="text-xs text-text-muted">
                {completedOrder.table_name_snapshot} • Pembayaran{" "}
                {completedOrder.payment_method} Lunas
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span>Total Tagihan</span>
                <span className="font-bold tabular-nums">
                  {formatRupiah(completedOrder.total_amount)}
                </span>
              </div>
              {completedOrder.latest_payment?.method === "CASH" && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima</span>
                    <span className="tabular-nums">
                      {formatRupiah(
                        completedOrder.latest_payment.amount_received
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-tertiary">
                    <span>Kembalian</span>
                    <span className="tabular-nums">
                      {formatRupiah(completedOrder.latest_payment.change_amount)}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 rounded-xl bg-surface-variant text-nav-espresso text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  router.push("/cashier/orders");
                }}
                className="h-11 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
              >
                Lihat di Antrean
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
