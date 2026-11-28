"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getStoredAuth, setStoredAuth } from "@/lib/api";
import { BrandLogo, useBranding } from "@/components/BrandLogo";
import { AlertTriangle, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const branding = useBranding();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const existing = getStoredAuth();
    if (existing?.user?.role === "owner") {
      router.replace("/owner");
    } else if (existing?.user?.role === "employee") {
      router.replace("/cashier/orders");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      setStoredAuth(res.token, res.user, null);

      if (res.user.role === "owner") {
        router.push("/owner");
      } else {
        router.push("/cashier/orders");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Email atau kata sandi tidak sesuai.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 flex items-center justify-center p-4">
      <main className="w-full max-w-sm">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2.5">
            <BrandLogo
              className="w-12 h-12 rounded-2xl mx-auto shadow-xs"
              iconClassName="w-6 h-6"
              fallbackBgClass="bg-[#10A352] text-white"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {branding.business_name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Masuk ke sistem operasional
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-semibold text-slate-700 block"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email akun"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F6F8F7] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#10A352] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-700 block"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#F6F8F7] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#10A352] transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#10A352] hover:bg-[#0D8A44] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Memproses..." : "Masuk"}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
