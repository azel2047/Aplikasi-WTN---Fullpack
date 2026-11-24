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
  Coffee,
  X,
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

  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
  const [selectedShift, setSelectedShift] = useState<string>("Shift Pagi (07.00 - 15.00)");
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "kasir@warkopterasnenek.id",
          password: "kasir123",
          shift_name: "Shift Pagi (07.00 - 15.00)",
        }),
      })
        .then((res) => {
          setStoredAuth(res.token, res.user, res.employee_profile, "Shift Pagi (07.00 - 15.00)");
          setAuth(getStoredAuth());
        })
        .catch(() => router.push("/login"))
        .finally(() => setReady(true));
    } else {
      setAuth(stored);
      setReady(true);
    }

    apiFetch("/auth/employee-profiles")
      .then((res) => setProfiles(res.profiles || []))
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
      setStoredAuth(auth.token, auth.user, res.employee_profile, selectedShift);
      setAuth(getStoredAuth());
      setIsSwitchOpen(false);
    } finally {
      setSwitching(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center text-xs text-slate-500">
        Memuat Kasir...
      </div>
    );
  }

  const activeOperatorName = auth?.employeeProfile?.name || auth?.user?.name || "Rina Wulandari";
  const activeShiftName = auth?.shiftName || "Shift Pagi";

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex flex-col md:flex-row">
      {/* Clean White Sidebar matching image.png */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-white border-r border-slate-200 z-40 flex-col justify-between py-5 px-3 no-print">
        <div className="space-y-6">
          <Link href="/" className="px-2.5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10A352] text-white flex items-center justify-center">
              <Coffee className="w-5 h-5" />
            </div>
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
          <Link
            href="/owner"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Owner</span>
          </Link>
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

          <button
            type="button"
            onClick={() => {
              if (auth?.employeeProfile?.id) setSelectedProfileId(auth.employeeProfile.id);
              setSelectedShift(activeShiftName);
              setIsSwitchOpen(true);
            }}
            className="h-10 px-3 rounded-xl bg-[#F6F8F7] border border-slate-200 hover:border-[#10A352] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#10A352] text-white flex items-center justify-center text-xs font-bold">
              {activeOperatorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {activeOperatorName}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {activeShiftName}
              </span>
            </div>
          </button>
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

      {/* Shift Switch Modal */}
      {isSwitchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#10A352]" />
                <h3 className="text-base font-bold text-slate-900">Ganti Petugas Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitchOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSwitchShift} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Petugas</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl bg-[#F6F8F7] border border-slate-200 font-semibold"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Shift</label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#F6F8F7] border border-slate-200 font-semibold"
                >
                  <option value="Shift Pagi (07.00 - 15.00)">Shift Pagi (07.00 - 15.00)</option>
                  <option value="Shift Sore (15.00 - 22.00)">Shift Sore (15.00 - 22.00)</option>
                  <option value="Full Day">Full Day</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwitchOpen(false)}
                  className="h-10 px-4 rounded-xl bg-slate-100 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={switching}
                  className="h-10 px-5 rounded-xl bg-[#10A352] text-white font-bold cursor-pointer"
                >
                  {switching ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
