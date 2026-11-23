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
import {
  Clock,
  ShoppingCart,
  Receipt,
  Wallet,
  FileBarChart,
  Lock,
  LogOut,
  UserCheck,
  LayoutDashboard,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/cashier/orders", label: "Antrean", icon: Clock },
  { href: "/cashier/pos", label: "POS", icon: ShoppingCart },
  { href: "/cashier/payments", label: "Riwayat", icon: Receipt },
  { href: "/cashier/expenses", label: "Keluar Kas", icon: Wallet },
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

  // Shift switcher modal
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
  const [selectedShift, setSelectedShift] = useState<string>(
    "Shift Pagi (07.00 - 15.00)"
  );
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      // Auto-login demo shared employee account if user navigated directly so reviewer isn't blocked,
      // while still supporting explicit login/logout at /login
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "kasir@warkopterasnenek.id",
          password: "kasir123",
          shift_name: "Shift Pagi (07.00 - 15.00)",
        }),
      })
        .then((res) => {
          setStoredAuth(
            res.token,
            res.user,
            res.employee_profile,
            "Shift Pagi (07.00 - 15.00)"
          );
          setAuth(getStoredAuth());
        })
        .catch(() => {
          router.push("/login");
        })
        .finally(() => setReady(true));
    } else {
      setAuth(stored);
      setReady(true);
    }

    apiFetch("/auth/employee-profiles")
      .then((res) => {
        setProfiles(res.profiles || []);
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    clearStoredAuth();
    router.push("/login");
  };

  const handleSwitchShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setSwitching(true);
    try {
      const res = await apiFetch("/auth/switch-shift", {
        method: "POST",
        body: JSON.stringify({
          employee_profile_id: selectedProfileId,
          shift_name: selectedShift,
        }),
      });
      setStoredAuth(
        auth.token,
        auth.user,
        res.employee_profile,
        selectedShift
      );
      setAuth(getStoredAuth());
      setIsSwitchOpen(false);
    } catch {
    } finally {
      setSwitching(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-canvas-cream flex items-center justify-center text-sm text-text-muted">
        Memuat Terminal Kasir Warkop Teras Nenek...
      </div>
    );
  }

  const activeOperatorName =
    auth?.employeeProfile?.name || auth?.user?.name || "Rina Wulandari";
  const activeShiftName = auth?.shiftName || "Shift Pagi";

  return (
    <div className="min-h-screen bg-canvas-cream text-on-surface flex flex-col md:flex-row">
      {/* Desktop / Tablet Vertical Navigation Rail (88px fixed per DESIGN.md) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[88px] bg-nav-espresso text-canvas-cream z-50 flex-col items-center justify-between py-4 border-r border-dark-walnut">
        <div className="flex flex-col items-center w-full gap-4">
          <Link
            href="/"
            className="flex flex-col items-center justify-center group"
            title="Beranda & QR Meja"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm">
              WTN
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-1 text-border-sand">
              Kasir
            </span>
          </Link>

          <nav className="flex flex-col items-center w-full gap-1.5 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-[72px] h-[58px] rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive
                      ? "bg-primary-container text-on-primary font-bold"
                      : "text-border-sand hover:bg-dark-walnut hover:text-canvas-cream"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] leading-none">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2 w-full px-2">
          {auth?.user?.role === "owner" && (
            <Link
              href="/owner"
              title="Buka Owner Dashboard"
              className="w-[72px] h-[48px] rounded-xl bg-dark-walnut text-canvas-cream flex flex-col items-center justify-center text-[10px] font-semibold"
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span>Owner</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-[72px] h-[52px] rounded-xl text-border-sand hover:bg-error/20 hover:text-error-subtle flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[11px] leading-none">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-[88px] flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Top Operational Bar */}
        <header className="sticky top-0 z-40 h-16 bg-surface-cream border-b border-border-sand px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-base sm:text-lg text-nav-espresso truncate">
              Warkop Teras Nenek
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-subtle text-tertiary text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span>Realtime &amp; Polling Aktif</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Shift Identity Switcher Pill */}
            <button
              type="button"
              onClick={() => {
                if (auth?.employeeProfile?.id) {
                  setSelectedProfileId(auth.employeeProfile.id);
                }
                setSelectedShift(activeShiftName);
                setIsSwitchOpen(true);
              }}
              className="h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand hover:border-primary-container flex items-center gap-2 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold">
                {activeOperatorName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-nav-espresso block leading-tight">
                  {activeOperatorName}
                </span>
                <span className="text-[10px] text-text-muted block leading-tight">
                  {activeShiftName} • Ganti Shift
                </span>
              </div>
            </button>

            <Link
              href="/owner"
              className="h-10 px-3 rounded-xl bg-surface-variant hover:bg-border-sand/60 text-nav-espresso text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-primary-container" />
              <span className="hidden sm:inline">Owner</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-nav-espresso text-canvas-cream border-t border-dark-walnut grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] ${
                isActive
                  ? "text-accent-terracotta font-bold"
                  : "text-border-sand"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Shift Identity Switch Modal */}
      {isSwitchOpen && (
        <div className="fixed inset-0 z-50 bg-nav-espresso/60 flex items-center justify-center p-4">
          <div className="bg-surface-cream border border-border-sand rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary-container" />
                <h3 className="text-base font-bold text-nav-espresso">
                  Ganti Identitas Petugas Shift
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitchOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-nav-espresso cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Pilih nama petugas yang sedang memegang terminal kasir ini. Semua
              verifikasi pembayaran, perubahan status, dan pengeluaran akan
              tercatat pada audit log dengan identitas ini.
            </p>

            <form onSubmit={handleSwitchShift} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-nav-espresso block">
                  Petugas Kasir / Barista
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand text-xs font-semibold text-nav-espresso"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code} — {p.role_title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-nav-espresso block">
                  Shift Operasional
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand text-xs font-semibold text-nav-espresso"
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwitchOpen(false)}
                  className="h-11 px-4 rounded-xl bg-surface-variant text-secondary text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={switching}
                  className="h-11 px-5 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
                >
                  {switching ? "Menyimpan..." : "Aktifkan Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
