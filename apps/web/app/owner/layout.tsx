"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  apiFetch,
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
  StoredAuth,
} from "@/lib/api";
import { BrandLogo, useBranding } from "@/components/BrandLogo";
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  QrCode,
  Package,
  Wallet,
  FileBarChart,
  Star,
  BarChart3,
  Settings,
  History,
  LogOut,
  MonitorCheck,
  Coffee,
  Menu,
  X,
} from "lucide-react";

interface OwnerNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  matchPrefix?: string;
}

const OWNER_NAV_GROUPS: Array<{ title: string; items: OwnerNavItem[] }> = [
  {
    title: "OPERASIONAL",
    items: [
      { href: "/owner", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/owner/orders", label: "Pesanan", icon: Receipt },
      { href: "/owner/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/owner/tables", label: "Meja & QR", icon: QrCode },
    ],
  },
  {
    title: "STOK & KEUANGAN",
    items: [
      { href: "/owner/inventory/ingredients", label: "Inventory", icon: Package, matchPrefix: "/owner/inventory" },
      { href: "/owner/finance", label: "Keuangan", icon: Wallet },
      { href: "/owner/expenses", label: "Pengeluaran", icon: Receipt },
    ],
  },
  {
    title: "LAPORAN",
    items: [
      { href: "/owner/reports", label: "Laporan Harian", icon: FileBarChart },
      { href: "/owner/ratings", label: "Rating", icon: Star },
      { href: "/owner/analytics", label: "Analitik", icon: BarChart3 },
    ],
  },
  {
    title: "SISTEM",
    items: [
      { href: "/owner/settings", label: "Pengaturan & Profil", icon: Settings },
      { href: "/owner/audit-logs", label: "Audit Log", icon: History },
    ],
  },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const branding = useBranding();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      const stored = getStoredAuth();
      if (!stored || stored.user.role !== "owner") {
        router.replace("/login");
        return;
      }
      setAuth(stored);
      setReady(true);
    };
    syncAuth();
    window.addEventListener("wtn-auth-updated", syncAuth);
    return () => window.removeEventListener("wtn-auth-updated", syncAuth);
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
        Memuat Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex">
      {/* Clean White Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white border-r border-slate-200 z-40 flex-col justify-between no-print">
        <div className="flex-1 overflow-y-auto py-5">
          <Link href="/owner" className="px-5 mb-6 flex items-center gap-2.5">
            <BrandLogo
              className="w-9 h-9 rounded-xl"
              iconClassName="w-5 h-5"
              fallbackBgClass="bg-[#10A352] text-white"
            />
            <div className="min-w-0">
              <span className="font-bold text-sm text-slate-900 block leading-tight truncate">
                {branding.business_name}
              </span>
              <span className="text-[11px] text-slate-500 block">Owner</span>
            </div>
          </Link>

          <nav className="px-3 space-y-5">
            {OWNER_NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {group.title}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : item.matchPrefix
                    ? pathname?.startsWith(item.matchPrefix)
                    : pathname === item.href || pathname?.startsWith(item.href + "/");

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
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#10A352] text-white flex items-center justify-center text-xs font-bold shrink-0">
              NS
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate block">
                {auth?.user?.name || "Nenek Sari"}
              </span>
              <span className="text-[10px] text-slate-500 block">Owner</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 flex no-print">
          <div className="w-64 bg-white h-full flex flex-col justify-between p-4 border-r border-slate-200">
            <div className="overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900">Teras Nenek</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {OWNER_NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {group.title}
                  </span>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#E8F7F0] hover:text-[#10A352]"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="h-10 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 lg:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F7F0] text-[#0D7A3E] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10A352]" />
              <span>Buka</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/cashier/pos"
              className="h-9 px-3.5 rounded-lg bg-[#E8F7F0] hover:bg-[#d5f2e4] text-[#0D7A3E] text-xs font-semibold flex items-center gap-1.5"
            >
              <MonitorCheck className="w-4 h-4" />
              <span>Kasir POS</span>
            </Link>
            <Link
              href="/owner/tables"
              className="h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold hidden sm:flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Meja</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
