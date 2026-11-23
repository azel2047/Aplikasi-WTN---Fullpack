"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, formatRupiah, getOrderStatusLabel } from "@/lib/api";
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  X,
  Check,
  AlertTriangle,
  Utensils,
  FileText,
  Wifi,
  ArrowLeft,
  Flame,
  Clock,
  QrCode,
  Wallet,
  ChevronRight,
} from "lucide-react";

interface OptionValue {
  id: number;
  name: string;
  price_delta: number;
  is_default: boolean;
  is_available: boolean;
}

interface ProductOption {
  id: number;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  values: OptionValue[];
}

interface Product {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  unit_label: string;
  is_available: boolean;
  effective_available: boolean;
  stock_status_reason: string | null;
  options: ProductOption[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
  products: Product[];
}

interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedOptions: OptionValue[];
  itemNote: string;
}

export default function CustomerTableMenuPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token || "";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [table, setTable] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    business_name: "Warkop Teras Nenek",
    tax_enabled: true,
    tax_pb1_percentage: 10,
    wifi_ssid: "WarkopTeras_5G",
    wifi_password: "ngopidulu123",
  });

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart state persisted per table token in sessionStorage for UX convenience
  const [cart, setCart] = useState<CartItem[]>([]);

  // Product Customization Modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalOptionIds, setModalOptionIds] = useState<number[]>([]);
  const [modalNote, setModalNote] = useState<string>("");

  // Cart & Checkout Drawer state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "CASH">("QRIS");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);

    apiFetch(`/public/tables/${encodeURIComponent(token)}/menu`)
      .then((res) => {
        setTable(res.table);
        setCategories(res.categories || []);
        setActiveOrders(res.active_orders || []);
        if (res.settings) setSettings(res.settings);

        const saved = sessionStorage.getItem(`wtn_cart_${token}`);
        if (saved) {
          try {
            setCart(JSON.parse(saved));
          } catch {}
        }
      })
      .catch((err) => {
        setErrorMsg(
          err.message ||
            "QR Code meja ini tidak valid atau sudah dinonaktifkan. Silakan pindai QR terbaru di meja Anda."
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (token && !loading && !errorMsg) {
      sessionStorage.setItem(`wtn_cart_${token}`, JSON.stringify(cart));
    }
  }, [cart, token, loading, errorMsg]);

  const openProductModal = (product: Product, existingItem?: CartItem) => {
    if (!product.effective_available) return;
    setCustomizingProduct(product);
    if (existingItem) {
      setEditingCartItemId(existingItem.cartItemId);
      setModalQty(existingItem.quantity);
      setModalOptionIds(existingItem.selectedOptions.map((o) => o.id));
      setModalNote(existingItem.itemNote || "");
    } else {
      setEditingCartItemId(null);
      setModalQty(1);
      const defaults: number[] = [];
      product.options?.forEach((opt) => {
        const defVal = opt.values.find((v) => v.is_default) || (opt.is_required ? opt.values[0] : null);
        if (defVal) defaults.push(defVal.id);
      });
      setModalOptionIds(defaults);
      setModalNote("");
    }
  };

  const toggleOptionValue = (option: ProductOption, val: OptionValue) => {
    if (option.selection_type === "single") {
      const siblingIds = option.values.map((v) => v.id);
      setModalOptionIds((prev) => [
        ...prev.filter((id) => !siblingIds.includes(id)),
        val.id,
      ]);
    } else {
      setModalOptionIds((prev) =>
        prev.includes(val.id) ? prev.filter((id) => id !== val.id) : [...prev, val.id]
      );
    }
  };

  const saveProductToCart = () => {
    if (!customizingProduct) return;
    const allOptionValues: OptionValue[] = [];
    customizingProduct.options?.forEach((opt) => {
      opt.values.forEach((v) => {
        if (modalOptionIds.includes(v.id)) {
          allOptionValues.push(v);
        }
      });
    });

    const trimmedNote = modalNote.trim().slice(0, 250);

    if (editingCartItemId) {
      setCart((prev) =>
        prev.map((item) =>
          item.cartItemId === editingCartItemId
            ? {
                ...item,
                quantity: modalQty,
                selectedOptions: allOptionValues,
                itemNote: trimmedNote,
              }
            : item
        )
      );
    } else {
      const signature = `${customizingProduct.id}_${allOptionValues
        .map((o) => o.id)
        .sort()
        .join("-")}_${trimmedNote.toLowerCase()}`;

      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.cartItemId === signature);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + modalQty,
          };
          return updated;
        }
        return [
          ...prev,
          {
            cartItemId: signature + "_" + Date.now(),
            product: customizingProduct,
            quantity: modalQty,
            selectedOptions: allOptionValues,
            itemNote: trimmedNote,
          },
        ];
      });
    }

    setCustomizingProduct(null);
    setEditingCartItemId(null);
  };

  const updateCartItemQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => selectedCategorySlug === "ALL" || c.slug === selectedCategorySlug)
      .map((c) => ({
        ...c,
        products: c.products.filter((p) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
          );
        }),
      }))
      .filter((c) => c.products.length > 0);
  }, [categories, selectedCategorySlug, searchQuery]);

  const cartTotals = useMemo(() => {
    let totalItems = 0;
    let subtotal = 0;
    cart.forEach((item) => {
      totalItems += item.quantity;
      const optPrice = item.selectedOptions.reduce((acc, o) => acc + o.price_delta, 0);
      subtotal += (item.product.price + optPrice) * item.quantity;
    });
    const taxPct = settings.tax_enabled ? Number(settings.tax_pb1_percentage || 10) : 0;
    const tax = Math.round(subtotal * (taxPct / 100));
    const total = subtotal + tax;
    return { totalItems, subtotal, taxPct, tax, total };
  }, [cart, settings]);

  const getProductCartCount = (productId: number) => {
    return cart
      .filter((i) => i.product.id === productId)
      .reduce((acc, i) => acc + i.quantity, 0);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const idempotencyKey = `qr_${token}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const payload = {
        table_token: token,
        customer_name: customerName.trim() || `Pelanggan ${table?.name || "QR"}`,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          option_value_ids: item.selectedOptions.map((o) => o.id),
          item_note: item.itemNote || null,
        })),
      };

      const res = await apiFetch<{ order: { public_code: string } }>("/public/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      sessionStorage.removeItem(`wtn_cart_${token}`);
      setCart([]);
      setIsCartOpen(false);
      router.push(`/order/${res.order.public_code}`);
    } catch (err: any) {
      setSubmitError(err.message || "Gagal mengirim pesanan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-cream flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[420px] space-y-4">
          <div className="h-20 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
          <div className="h-12 rounded-full bg-surface-cream border border-border-sand animate-pulse" />
          <div className="h-64 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorMsg || !table) {
    return (
      <div className="min-h-screen bg-canvas-cream flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface-cream border border-border-sand rounded-2xl p-6 text-center space-y-4 soft-shadow">
          <div className="w-14 h-14 rounded-2xl bg-error-subtle text-error flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-nav-espresso">
            QR Meja Tidak Valid atau Dicabut
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {errorMsg ||
              "Token QR meja tidak dapat diverifikasi. Mohon pindai QR Code terbaru pada meja Anda atau minta bantuan kasir."}
          </p>
          <Link
            href="/"
            className="h-12 w-full rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Meja</span>
          </Link>
        </div>
      </div>
    );
  }

  const modalOptionsPrice = customizingProduct
    ? customizingProduct.options.reduce((acc, opt) => {
        const selected = opt.values.filter((v) => modalOptionIds.includes(v.id));
        return acc + selected.reduce((s, v) => s + v.price_delta, 0);
      }, 0)
    : 0;
  const modalTotalLinePrice = customizingProduct
    ? (customizingProduct.price + modalOptionsPrice) * modalQty
    : 0;

  return (
    <div className="min-h-screen bg-canvas-cream text-on-surface flex flex-col">
      {/* Sticky Header (Solid Warm Surface — No Glassmorphism per DESIGN.md) */}
      <header className="sticky top-0 z-40 bg-canvas-cream border-b border-border-sand">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                href="/"
                aria-label="Kembali ke Beranda"
                className="w-11 h-11 -ml-1 rounded-full hover:bg-surface-variant flex items-center justify-center text-nav-espresso shrink-0 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-8 h-8 rounded-lg bg-nav-espresso text-surface-cream flex items-center justify-center font-bold text-xs shrink-0">
                WTN
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-base text-nav-espresso truncate leading-tight">
                  {settings.business_name || "Warkop Teras Nenek"}
                </h1>
                <p className="text-xs text-text-muted truncate">
                  Pilih menu &amp; catatan item, kirim ke kasir
                </p>
              </div>
            </div>

            {/* Table Context Pill */}
            <div className="flex items-center gap-1.5 bg-surface-cream border border-border-sand px-3 py-1.5 rounded-full shrink-0">
              <Utensils className="w-3.5 h-3.5 text-accent-terracotta" />
              <span className="text-xs font-bold text-nav-espresso">
                {table.name}
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kopi, teh tarik, indomie, camilan..."
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-cream border border-border-sand text-sm text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-nav-espresso"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontal Category Filter Chips */}
          <div
            role="tablist"
            aria-label="Kategori Menu"
            className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategorySlug === "ALL"}
              onClick={() => setSelectedCategorySlug("ALL")}
              className={`h-10 px-4 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                selectedCategorySlug === "ALL"
                  ? "bg-nav-espresso text-canvas-cream"
                  : "bg-surface-variant text-on-surface-variant hover:bg-border-sand/50"
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategorySlug === cat.slug}
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={`h-10 px-4 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  selectedCategorySlug === cat.slug
                    ? "bg-nav-espresso text-canvas-cream"
                    : "bg-surface-variant text-on-surface-variant hover:bg-border-sand/50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Container (Mobile-first 480px centered column) */}
      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 pt-3 pb-36 space-y-4">
        {/* Active Orders Banner for this table */}
        {activeOrders.length > 0 && (
          <div className="bg-surface-cream border border-primary-container rounded-xl p-3.5 space-y-2 soft-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-nav-espresso flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-container" />
                Pesanan Aktif di {table.name}
              </span>
              <span className="text-[11px] text-text-muted">
                {activeOrders.length} pesanan
              </span>
            </div>
            <div className="space-y-1.5">
              {activeOrders.map((ord) => {
                const badge = getOrderStatusLabel(ord.status);
                return (
                  <Link
                    key={ord.id}
                    href={`/order/${ord.public_code}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-canvas-cream hover:bg-surface-variant transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-nav-espresso tabular-nums">
                        {ord.order_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.bgClass} ${badge.textClass}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-primary-container tabular-nums">
                      <span>{formatRupiah(ord.total_amount)}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Notice Banner: Suasana Teras Warkop */}
        <div className="p-3.5 rounded-xl bg-surface-cream border border-border-sand flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-subtle text-on-primary-subtle flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant truncate">
              Pesanan langsung diantar hangat ke{" "}
              <strong className="text-nav-espresso">{table.name}</strong> ({table.area}).
            </p>
          </div>
          <span className="text-xs text-primary font-semibold shrink-0">
            Warkop Asli
          </span>
        </div>

        {/* Menu Content Surface (Single Unified Surface with Structural Dividing Strips per DESIGN.md) */}
        {filteredCategories.length === 0 ? (
          <div className="bg-surface-cream border border-border-sand rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-nav-espresso">
              Menu tidak ditemukan
            </p>
            <p className="text-xs text-text-muted">
              Coba kata kunci lain atau pilih kategori &ldquo;Semua&rdquo;.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategories.map((cat) => (
              <section
                key={cat.id}
                className="bg-surface-cream border border-border-sand rounded-2xl px-4 py-3 soft-shadow"
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-variant">
                  <h2 className="text-base font-bold text-nav-espresso tracking-tight">
                    {cat.name}
                  </h2>
                  <span className="text-xs text-text-muted">
                    {cat.products.length} Pilihan
                  </span>
                </div>

                <div className="divide-y divide-surface-container-highest">
                  {cat.products.map((product) => {
                    const countInCart = getProductCartCount(product.id);
                    const available = product.effective_available;

                    return (
                      <article
                        key={product.id}
                        onClick={() => available && openProductModal(product)}
                        className={`py-3.5 flex items-center justify-between gap-3.5 relative ${
                          available ? "cursor-pointer" : "opacity-65 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          {countInCart > 0 && (
                            <div className="inline-flex items-center gap-1 bg-primary-subtle text-on-primary-subtle px-2.5 py-0.5 rounded-full text-xs font-semibold mb-1">
                              <Check className="w-3 h-3" />
                              <span>{countInCart} di keranjang</span>
                            </div>
                          )}
                          {!available && (
                            <div className="inline-flex items-center gap-1 bg-error-subtle text-error px-2.5 py-0.5 rounded-full text-xs font-semibold mb-1">
                              <span>
                                {product.stock_status_reason || "Stok Habis"}
                              </span>
                            </div>
                          )}
                          <h3 className="text-base font-semibold text-on-surface leading-snug">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-base font-bold text-primary-container tabular-nums">
                              {formatRupiah(product.price)}
                            </span>
                            {product.options?.length > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-variant text-secondary font-medium">
                                Ada opsi
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="relative w-[88px] h-[88px] shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className={`w-[88px] h-[88px] rounded-xl object-cover bg-surface-container border border-border-sand/50 ${
                                !available ? "grayscale opacity-50" : ""
                              }`}
                            />
                          ) : (
                            <div className="w-[88px] h-[88px] rounded-xl bg-surface-variant flex items-center justify-center text-text-muted text-xs">
                              Menu
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={!available}
                            aria-label={`Tambah ${product.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openProductModal(product);
                            }}
                            className={`absolute -bottom-1 -right-1 w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-transform ${
                              available
                                ? "bg-primary-container hover:bg-primary-hover text-on-primary active:scale-95 cursor-pointer"
                                : "bg-surface-variant text-text-muted cursor-not-allowed"
                            }`}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Hospitality WiFi Footer Card */}
        <section className="flex items-center gap-3 bg-surface-cream border border-border-sand rounded-xl p-3.5 text-on-surface">
          <div className="w-10 h-10 rounded-full bg-primary-subtle text-primary-container flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-xs">
            <span className="font-bold text-nav-espresso block">
              WiFi Teras Nenek
            </span>
            <span className="text-text-muted">
              SSID: <strong className="text-on-surface">{settings.wifi_ssid}</strong> •
              Sandi:{" "}
              <code className="bg-surface-variant px-1.5 py-0.5 rounded font-bold text-nav-espresso">
                {settings.wifi_password}
              </code>
            </span>
          </div>
        </section>
      </main>

      {/* Sticky Bottom Summary Bar (48px+ touch target) */}
      {cartTotals.totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-canvas-cream border-t border-border-sand p-3">
          <div className="max-w-[480px] mx-auto">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full h-14 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary flex items-center justify-between shadow-lg transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-nav-espresso text-canvas-cream flex items-center justify-center font-bold text-xs tabular-nums">
                  {cartTotals.totalItems}
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold block leading-tight">
                    Lihat Keranjang &amp; Checkout ({table.name})
                  </span>
                  <span className="text-[11px] opacity-90 block">
                    Termasuk catatan khusus per item
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-base tabular-nums">
                <span>{formatRupiah(cartTotals.total)}</span>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL, OPTIONS & PER-ITEM NOTE MODAL (AC-05, AC-06) */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-cream w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl border border-border-sand max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-surface-variant flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {customizingProduct.image_url && (
                  <img
                    src={customizingProduct.image_url}
                    alt={customizingProduct.name}
                    className="w-14 h-14 rounded-xl object-cover border border-border-sand shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-nav-espresso truncate">
                    {customizingProduct.name}
                  </h3>
                  <p className="text-sm font-bold text-primary-container tabular-nums">
                    {formatRupiah(customizingProduct.price)} / {customizingProduct.unit_label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="w-10 h-10 rounded-full bg-surface-variant text-nav-espresso flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1">
              {customizingProduct.description && (
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {customizingProduct.description}
                </p>
              )}

              {/* Product Options */}
              {customizingProduct.options?.map((option) => (
                <div key={option.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-nav-espresso">
                      {option.name}
                    </label>
                    <span className="text-[11px] text-text-muted">
                      {option.selection_type === "single"
                        ? "Pilih 1"
                        : "Boleh pilih lebih dari 1"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {option.values.map((val) => {
                      const isSelected = modalOptionIds.includes(val.id);
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => toggleOptionValue(option, val)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                              : "bg-canvas-cream text-on-surface border-border-sand hover:border-primary-container"
                          }`}
                        >
                          <span className="truncate">{val.name}</span>
                          {val.price_delta > 0 && (
                            <span
                              className={`tabular-nums shrink-0 ${
                                isSelected ? "text-primary-subtle" : "text-primary-container"
                              }`}
                            >
                              +{formatRupiah(val.price_delta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Per-Item Special Note (Max 250 Characters — AC-06) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="item-note-input"
                    className="text-xs font-bold text-nav-espresso flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary-container" />
                    <span>Catatan Khusus Item Ini</span>
                  </label>
                  <span className="text-[11px] text-text-muted tabular-nums">
                    {modalNote.length}/250
                  </span>
                </div>
                <textarea
                  id="item-note-input"
                  rows={2}
                  maxLength={250}
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value.slice(0, 250))}
                  placeholder="Contoh: Es sedikit, gula 50%, sambal dipisah, tanpa bawang..."
                  className="w-full rounded-xl bg-canvas-cream border border-border-sand p-3 text-xs text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container"
                />
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Es sedikit",
                    "Gula 50%",
                    "Sambal dipisah",
                    "Tanpa bawang",
                    "Telur setengah matang",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setModalNote((prev) =>
                          prev
                            ? `${prev}, ${preset}`.slice(0, 250)
                            : preset
                        )
                      }
                      className="text-[11px] px-2.5 py-1 rounded-full bg-surface-variant hover:bg-border-sand/60 text-secondary font-medium cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper (44px+ buttons) */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-variant">
                <span className="text-xs font-bold text-nav-espresso">
                  Jumlah Porsi
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Kurangi jumlah"
                    onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-full border-2 border-primary-container text-primary-container flex items-center justify-center font-bold active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-base font-bold text-nav-espresso tabular-nums">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah jumlah"
                    onClick={() => setModalQty((q) => q + 1)}
                    className="w-11 h-11 rounded-full border-2 border-primary-container bg-primary-container text-on-primary flex items-center justify-center font-bold active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-surface-variant bg-canvas-cream">
              <button
                type="button"
                onClick={saveProductToCart}
                className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold text-sm flex items-center justify-between px-5 shadow-md transition-colors cursor-pointer"
              >
                <span>
                  {editingCartItemId ? "Simpan Perubahan" : "Tambah ke Keranjang"}
                </span>
                <span className="tabular-nums">{formatRupiah(modalTotalLinePrice)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART & CHECKOUT DRAWER / MODAL (AC-06, AC-08) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-cream w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl border border-border-sand max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-surface-variant flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-nav-espresso">
                  Keranjang &amp; Checkout — {table.name}
                </h2>
                <p className="text-xs text-text-muted">
                  Periksa kembali item, catatan khusus, dan metode pembayaran
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 rounded-full bg-surface-variant text-nav-espresso flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCheckoutSubmit}
              className="flex-1 overflow-y-auto p-4 space-y-5"
            >
              {submitError && (
                <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Cart Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-nav-espresso uppercase tracking-wider">
                    Daftar Pesanan ({cartTotals.totalItems} Item)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCart([]);
                      setIsCartOpen(false);
                    }}
                    className="text-xs text-error font-semibold hover:underline cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>

                {cart.map((item) => {
                  const optDelta = item.selectedOptions.reduce(
                    (a, o) => a + o.price_delta,
                    0
                  );
                  const lineTotal = (item.product.price + optDelta) * item.quantity;

                  return (
                    <div
                      key={item.cartItemId}
                      className="p-3 rounded-xl bg-canvas-cream border border-border-sand space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-nav-espresso">
                            {item.product.name}
                          </h4>
                          {item.selectedOptions.length > 0 && (
                            <p className="text-xs text-secondary mt-0.5">
                              {item.selectedOptions.map((o) => o.name).join(" • ")}
                            </p>
                          )}
                          <p className="text-xs font-bold text-primary-container tabular-nums mt-1">
                            {formatRupiah(lineTotal)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.cartItemId, -1)}
                            className="w-9 h-9 rounded-full bg-surface-cream border border-border-sand flex items-center justify-center text-nav-espresso cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.cartItemId, 1)}
                            className="w-9 h-9 rounded-full bg-surface-cream border border-border-sand flex items-center justify-center text-nav-espresso cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Note Display & Edit Trigger */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border-sand/60 text-xs">
                        <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
                          <FileText className="w-3.5 h-3.5 text-primary-container shrink-0" />
                          <span className="truncate">
                            {item.itemNote ? (
                              <strong className="font-medium text-nav-espresso">
                                &ldquo;{item.itemNote}&rdquo;
                              </strong>
                            ) : (
                              <span className="text-text-muted italic">
                                Tanpa catatan khusus
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openProductModal(item.product, item)}
                          className="text-xs font-semibold text-primary-container hover:underline shrink-0 cursor-pointer"
                        >
                          Ubah Opsi/Catatan
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Customer Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="customer-name-input"
                  className="text-xs font-bold text-nav-espresso block"
                >
                  Nama Panggilan (Opsional — Tanpa Login)
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  maxLength={80}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={`Contoh: Kak Raka (${table.name})`}
                  className="w-full h-12 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-sm text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary-container"
                />
              </div>

              {/* Payment Method Choice: QRIS or CASH */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-nav-espresso block">
                  Pilih Metode Pembayaran
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("QRIS")}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMethod === "QRIS"
                        ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <QrCode className="w-5 h-5 text-accent-terracotta" />
                      {paymentMethod === "QRIS" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-bold">
                          Terpilih
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold mt-1">QRIS Statis</span>
                    <span
                      className={`text-[11px] ${
                        paymentMethod === "QRIS" ? "text-border-sand" : "text-text-muted"
                      }`}
                    >
                      Scan QRIS &amp; unggah bukti bayar
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMethod === "CASH"
                        ? "bg-nav-espresso text-canvas-cream border-nav-espresso"
                        : "bg-canvas-cream text-on-surface border-border-sand"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Wallet className="w-5 h-5 text-accent-terracotta" />
                      {paymentMethod === "CASH" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-bold">
                          Terpilih
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold mt-1">Tunai (Cash)</span>
                    <span
                      className={`text-[11px] ${
                        paymentMethod === "CASH" ? "text-border-sand" : "text-text-muted"
                      }`}
                    >
                      Bayar tunai langsung di kasir
                    </span>
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-2 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal ({cartTotals.totalItems} item)</span>
                  <span className="font-semibold text-nav-espresso tabular-nums">
                    {formatRupiah(cartTotals.subtotal)}
                  </span>
                </div>
                {cartTotals.taxPct > 0 && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>PB1 (Pajak Restoran {cartTotals.taxPct}%)</span>
                    <span className="font-semibold text-nav-espresso tabular-nums">
                      {formatRupiah(cartTotals.tax)}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-border-strong/50 pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-nav-espresso">
                    Total Pembayaran
                  </span>
                  <span className="text-lg font-bold text-primary-container tabular-nums">
                    {formatRupiah(cartTotals.total)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full h-13 rounded-xl bg-primary-container hover:bg-primary-hover disabled:opacity-50 text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <span>
                  {submitting
                    ? "Mengirim Pesanan ke Kasir..."
                    : `Kirim Pesanan (${formatRupiah(cartTotals.total)})`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
