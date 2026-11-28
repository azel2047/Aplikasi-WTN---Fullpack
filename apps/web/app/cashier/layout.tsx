"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  apiFetch,
  clearStoredAuth,
  getStoredAuth,
  StoredAuth,
} from "@/lib/api";
import { BrandLogo, useBranding } from "@/components/BrandLogo";
import {
  Clock,
  ShoppingCart,
  Receipt,
  Wallet,
  FileBarChart,
  Lock,
  LogOut,
  LayoutDashboard,
  Coffee,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/cashier/orders", label: "Antrean", icon: Clock },
  { href: "/cashier/pos", label: "POS Kasir", icon: ShoppingCart },
  { href: "/cashier/payments", label: "Riwayat", icon: Receipt },
  { href: "/cashier/expenses", label: "Pengeluaran", icon: Wallet },
  { href: "/cashier/daily-report", label: "Laporan", icon: FileBarChart },
  { href: "/cashier/closing", label: "Closing", icon: Lock },
];

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setAuth(stored);
    setReady(true);
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    clearStoredAuth();
    router.replace("/login");
  };

  if (!ready || !auth) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center text-xs text-slate-500">
        Memuat Kasir...
      </div>
    );
  }

  const displayRoleName = auth.user.role === "owner" ? auth.user.name : "Kasir";

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex flex-col md:flex-row">
      {/* Clean White Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-white border-r border-slate-200 z-40 flex-col justify-between py-5 px-3 no-print">
        <div className="space-y-6">
          <Link href="/cashier/orders" className="px-2.5 flex items-center gap-2.5">
            <BrandLogo
              className="w-9 h-9 rounded-xl"
              iconClassName="w-5 h-5"
              fallbackBgClass="bg-[#10A352] text-white"
            />
            <div>
              <span className="font-bold text-sm text-slate-900 block leading-tight">
                Teras Nenek
              </span>
              <span className="text-[11px] text-slate-500 block">Kasir POS</span>
            </div>
          </Link>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#E8F7F0] text-[#10A352] font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 pt-4 border-t border-slate-100">
          {auth.user.role === "owner" && (
            <Link
              href="/owner"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Owner</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 md:pl-56 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-slate-900 md:hidden">
              Warkop Teras Nenek
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F7F0] text-[#0D7A3E] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10A352]" />
              <span>Online</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-9 px-3 rounded-xl bg-[#F6F8F7] border border-slate-200 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#10A352] text-white flex items-center justify-center text-[11px] font-bold">
                {displayRoleName.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-800">
                {displayRoleName}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar"
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-slate-200 grid grid-cols-6 no-print">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] ${
                isActive ? "text-[#10A352] font-bold" : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
