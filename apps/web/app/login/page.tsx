"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, setStoredAuth } from "@/lib/api";
import {
  Coffee,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  KeyRound,
  Clock,
} from "lucide-react";

interface EmployeeProfile {
  id: number;
  name: string;
  code: string;
  role_title: string;
  default_shift: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"employee" | "owner">("employee");
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
  const [shiftName, setShiftName] = useState<string>("Shift Pagi (07.00 - 15.00)");

  const [email, setEmail] = useState<string>("kasir@warkopterasnenek.id");
  const [password, setPassword] = useState<string>("kasir123");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ profiles: EmployeeProfile[] }>("/auth/employee-profiles")
      .then((res) => {
        const list = res.profiles || [];
        setProfiles(list);
        if (list.length > 0) {
          setSelectedProfileId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const switchMode = (newMode: "employee" | "owner") => {
    setMode(newMode);
    setErrorMsg(null);
    if (newMode === "employee") {
      setEmail("kasir@warkopterasnenek.id");
      setPassword("kasir123");
    } else {
      setEmail("owner@warkopterasnenek.id");
      setPassword("owner123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          employee_profile_id: mode === "employee" ? selectedProfileId : null,
          shift_name: mode === "employee" ? shiftName : null,
        }),
      });

      setStoredAuth(res.token, res.user, res.employee_profile, shiftName);

      if (res.user.role === "owner" && mode === "owner") {
        router.push("/owner");
      } else {
        router.push("/cashier/orders");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk. Periksa email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-cream text-on-surface flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-nav-espresso"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda &amp; QR Meja</span>
        </Link>
      </div>

      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-surface-cream border border-border-sand rounded-2xl p-6 sm:p-8 soft-shadow space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-nav-espresso text-canvas-cream flex items-center justify-center font-bold text-base">
              WTN
            </div>
            <div>
              <h1 className="text-lg font-bold text-nav-espresso leading-tight">
                Warkop Teras Nenek
              </h1>
              <p className="text-xs text-text-muted">
                Masuk Operasional Kasir &amp; Owner Dashboard
              </p>
            </div>
          </div>

          {/* Role Switch Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-variant">
            <button
              type="button"
              onClick={() => switchMode("employee")}
              className={`h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "employee"
                  ? "bg-nav-espresso text-canvas-cream shadow-sm"
                  : "text-secondary hover:text-nav-espresso"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Kasir (Akun Bersama)</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("owner")}
              className={`h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === "owner"
                  ? "bg-nav-espresso text-canvas-cream shadow-sm"
                  : "text-secondary hover:text-nav-espresso"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Owner Workspace</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-error-subtle text-error text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-nav-espresso block">
                Email Akun {mode === "employee" ? "Karyawan Bersama" : "Owner"}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-sm text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-nav-espresso block">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-sm text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>

            {/* Shared Employee Shift Identity Selection (PRD Section 5 & 12) */}
            {mode === "employee" && (
              <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-nav-espresso flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary-container" />
                    <span>Pilih Identitas Petugas Shift</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary-subtle text-on-primary-subtle font-bold">
                    Audit Attribution
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Sesuai keputusan operasional, kasir menggunakan satu akun login bersama.
                  Pilih identitas Anda agar setiap aksi kasir &amp; audit log tercatat atas nama
                  petugas shift yang bertugas.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary block">
                    Nama Petugas
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-surface-cream border border-border-sand text-xs font-semibold text-nav-espresso focus:outline-none focus:border-primary-container"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code} — {p.role_title})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Jadwal Shift</span>
                  </label>
                  <select
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-cream border border-border-sand text-xs font-semibold text-nav-espresso focus:outline-none focus:border-primary-container"
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
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {loading
                  ? "Memverifikasi..."
                  : mode === "employee"
                  ? "Masuk & Mulai Shift Kasir"
                  : "Masuk ke Dashboard Owner"}
              </span>
            </button>
          </form>

          {/* Quick Demo Credentials Info */}
          <div className="pt-3 border-t border-surface-variant text-[11px] text-text-muted space-y-1">
            <div className="font-bold text-nav-espresso">
              Info Akun Demo (Pre-filled):
            </div>
            <div>
              • <strong>Kasir Bersama:</strong>{" "}
              <code>kasir@warkopterasnenek.id</code> / <code>kasir123</code> (PIN Aksi Sensitif:{" "}
              <code>1234</code>)
            </div>
            <div>
              • <strong>Owner:</strong> <code>owner@warkopterasnenek.id</code> /{" "}
              <code>owner123</code> (PIN: <code>9999</code>)
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-text-muted pb-2">
        Warkop Teras Nenek — Sistem Operasional Terintegrasi
      </footer>
    </div>
  );
}
