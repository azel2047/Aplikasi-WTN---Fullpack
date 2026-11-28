"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, formatRupiah } from "@/lib/api";
import { ThermalReceipt } from "@/components/ThermalReceipt";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Utensils,
  ShoppingBag,
  X,
  Wallet,
  QrCode,
  Printer,
  Coffee,
  CupSoda,
  UtensilsCrossed,
  Cookie,
  LayoutGrid,
  FileText,
} from "lucide-react";

function getCategoryIcon(slug: string) {
  if (slug.includes("kopi") && !slug.includes("non")) return Coffee;
  if (slug.includes("teh") || slug.includes("non")) return CupSoda;
  if (slug.includes("makan")) return UtensilsCrossed;
  if (slug.includes("camil")) return Cookie;
  return LayoutGrid;
}

export default function CashierManualPosPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [originUrl, setOriginUrl] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Active Ticket
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<number>(4);
  const [customerName, setCustomerName] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cart, setCart] = useState<any[]>([]);

  // Product Options & Note Modal
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalOptionIds, setModalOptionIds] = useState<number[]>([]);
  const [modalNote, setModalNote] = useState<string>("");

  // Payment Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Printable Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOriginUrl(window.location.origin);
    apiFetch("/cashier/pos/catalog")
      .then((res) => {
        setCategories(res.categories || []);
        const tbls = res.tables || [];
        setTables(tbls);
        if (tbls.length > 0) setSelectedTableId(tbls[3]?.id || tbls[0].id);
        if (res.settings) setSettings(res.settings);
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

  const removeCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const filteredProducts = useMemo(() => {
    const all: any[] = [];
    categories.forEach((cat) => {
      if (selectedCategory !== "ALL" && cat.slug !== selectedCategory) return;
      cat.products?.forEach((p: any) => {
        if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return;
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
      const optDelta = item.selectedOptions.reduce((acc: number, o: any) => acc + o.price_delta, 0);
      subtotal += (item.product.price + optDelta) * item.quantity;
    });
    const discount = Math.min(subtotal, Math.max(0, discountAmount));
    const taxable = subtotal - discount;
    const tax = 0;
    const total = taxable;
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
          customerName.trim() || (orderType === "DINE_IN" ? "Pelanggan Meja" : "Bawa Pulang"),
        payment_method: paymentMethod,
        discount_amount: totals.discount,
        pay_immediately: payImmediately,
        amount_received:
          paymentMethod === "CASH" ? Number(cashReceived || totals.total) : totals.total,
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
      if (res.settings) setSettings(res.settings);

      if (payImmediately) {
        setCompletedOrder(res.order);
      } else {
        router.push("/cashier/orders");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left/Center Catalog matching image.png */}
      <section className="lg:col-span-8 space-y-5 no-print">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10A352]"
          />
        </div>

        {/* Category Icon Tiles (Exact match to image.png) */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900">Kategori</h2>
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`min-w-[88px] h-20 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                selectedCategory === "ALL"
                  ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E] font-bold"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-xs">Semua</span>
            </button>

            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.slug);
              const active = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`min-w-[92px] h-20 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    active
                      ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E] font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs truncate max-w-[80px]">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid matching image.png */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-900">Menu</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const available = product.effective_available;
                return (
                  <div
                    key={product.id}
                    onClick={() => available && openProductCustomizer(product)}
                    className={`bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center text-center justify-between gap-2.5 transition-all ${
                      available
                        ? "hover:border-[#10A352] hover:shadow-sm cursor-pointer"
                        : "opacity-55 cursor-not-allowed"
                    }`}
                  >
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={`w-full h-full object-cover ${!available ? "grayscale" : ""}`}
                        />
                      )}
                      {!available && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                          Habis
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 w-full">
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs font-bold text-slate-700 tabular-nums">
                        {formatRupiah(product.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!available}
                      className="w-full h-9 rounded-full bg-[#10A352] hover:bg-[#0D8A44] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Right Active Ticket Panel matching image.png */}
      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 sticky top-20 space-y-4 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Pesanan Aktif</h2>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
            >
              Hapus Semua
            </button>
          )}
        </div>

        {/* Dine-in / Takeaway Toggle Pills */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrderType("DINE_IN")}
            className={`h-9 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              orderType === "DINE_IN"
                ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E]"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Makan di Tempat</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderType("TAKEAWAY")}
            className={`h-9 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              orderType === "TAKEAWAY"
                ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E]"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bawa Pulang</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {orderType === "DINE_IN" && (
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(Number(e.target.value))}
              className="h-10 px-3 rounded-xl bg-[#F6F8F7] border border-slate-200 text-xs font-semibold text-slate-900"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nama pelanggan..."
            className={`h-10 px-3 rounded-xl bg-[#F6F8F7] border border-slate-200 text-xs text-slate-900 ${
              orderType === "DINE_IN" ? "" : "col-span-2"
            }`}
          />
        </div>

        {/* Cart Items List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 border-y border-slate-100 py-3">
          {cart.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Belum ada item dipilih
            </p>
          ) : (
            cart.map((item) => {
              const optDelta = item.selectedOptions.reduce((a: number, o: any) => a + o.price_delta, 0);
              const lineTotal = (item.product.price + optDelta) * item.quantity;
              return (
                <div key={item.cartId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.cartId, -1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-4 text-center font-bold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.cartId, 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 truncate block">
                          {item.product.name}
                        </span>
                        {item.selectedOptions.length > 0 && (
                          <span className="text-[10px] text-slate-500 truncate block">
                            {item.selectedOptions.map((o: any) => o.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatRupiah(lineTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cartId)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {item.itemNote && (
                    <div className="pl-16 text-[11px] text-[#0D7A3E] flex items-center gap-1">
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.itemNote}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatRupiah(totals.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Diskon</span>
            <input
              type="number"
              min={0}
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Number(e.target.value || 0))}
              placeholder="Rp 0"
              className="w-24 h-7 px-2 rounded-lg bg-[#F6F8F7] border border-slate-200 text-right text-xs font-semibold tabular-nums text-red-600"
            />
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatRupiah(totals.total)}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Two Clean Pill Buttons matching image.png */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={() => submitPosOrder(false)}
            className="w-full h-11 rounded-full bg-[#E8F7F0] hover:bg-[#d5f2e4] disabled:opacity-40 text-[#0D7A3E] text-xs font-bold cursor-pointer transition-colors"
          >
            Simpan ke Antrean
          </button>
          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={() => {
              setCashReceived(String(totals.total));
              setIsCheckoutModalOpen(true);
            }}
            className="w-full h-11 rounded-full bg-[#10A352] hover:bg-[#0D8A44] disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Bayar {formatRupiah(totals.total)}
          </button>
        </div>
      </aside>

      {/* Product Customizer Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs font-bold text-[#10A352] tabular-nums">
                  {formatRupiah(customizingProduct.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customizingProduct.options?.map((opt: any) => (
              <div key={opt.id} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">{opt.name}</label>
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
                            ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E]"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="truncate">{val.name}</span>
                        {val.price_delta > 0 && (
                          <span className="tabular-nums">+{formatRupiah(val.price_delta)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <label className="font-bold text-slate-700">Catatan Item</label>
                <span className="text-slate-400 tabular-nums">{modalNote.length}/250</span>
              </div>
              <textarea
                rows={2}
                maxLength={250}
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder="Contoh: Es sedikit, gula 50%, sambal dipisah..."
                className="w-full rounded-xl bg-[#F6F8F7] border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-[#10A352]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold tabular-nums">{modalQty}</span>
                <button
                  type="button"
                  onClick={() => setModalQty((q) => q + 1)}
                  className="w-9 h-9 rounded-full bg-[#10A352] text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={addCustomizedToCart}
                className="h-10 px-5 rounded-full bg-[#10A352] hover:bg-[#0D8A44] text-white text-xs font-bold cursor-pointer"
              >
                Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Payment Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Pembayaran ({formatRupiah(totals.total)})
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
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
                    ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E]"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Tunai</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "bg-[#E8F7F0] border-[#10A352] text-[#0D7A3E]"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS</span>
              </button>
            </div>

            {paymentMethod === "CASH" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    min={totals.total}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F6F8F7] border border-slate-200 text-base font-bold tabular-nums"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[totals.total, 20000, 50000, 100000].map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setCashReceived(String(nom))}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold tabular-nums cursor-pointer"
                    >
                      {nom === totals.total ? "Pas" : formatRupiah(nom)}
                    </button>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-[#E8F7F0] flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#0D7A3E]">Kembalian</span>
                  <span className="text-base font-bold text-[#0D7A3E] tabular-nums">
                    {formatRupiah(Math.max(0, Number(cashReceived || 0) - totals.total))}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={
                submitting ||
                (paymentMethod === "CASH" && Number(cashReceived || 0) < totals.total)
              }
              onClick={() => submitPosOrder(true)}
              className="w-full h-11 rounded-full bg-[#10A352] hover:bg-[#0D8A44] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              {submitting ? "Memproses..." : "Selesaikan & Tampilkan Struk"}
            </button>
          </div>
        </div>
      )}

      {/* REAL PRINTABLE 80MM THERMAL RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between no-print">
              <span className="text-sm font-bold text-slate-900">
                Struk Transaksi {completedOrder.order_number}
              </span>
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ThermalReceipt
              order={completedOrder}
              settings={settings}
              originUrl={originUrl}
            />

            <div className="grid grid-cols-2 gap-2 pt-1 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 rounded-full bg-[#10A352] hover:bg-[#0D8A44] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="h-11 rounded-full bg-[#E8F7F0] hover:bg-[#d5f2e4] text-[#0D7A3E] text-xs font-bold cursor-pointer"
              >
                Ke Antrean
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
