"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Save,
  Upload,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  QrCode,
} from "lucide-react";

export default function OwnerSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [hasQrisImage, setHasQrisImage] = useState(false);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Employee Shift Profile Form
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Kasir & Barista");
  const [empShift, setEmpShift] = useState("Shift Pagi");
  const [empPin, setEmpPin] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettings = () => {
    setLoading(true);
    apiFetch("/owner/settings")
      .then((res) => {
        setSettings(res.settings || {});
        setEmployees(res.employees || []);
        setHasQrisImage(Boolean(res.has_official_qris_image));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const [qrisPreviewUrl, setQrisPreviewUrl] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);

  const convertPdfToPngFile = async (pdfFile: File): Promise<File> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = Math.min(1100, Math.max(700, baseViewport.width * 2));
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia di browser.");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Gagal mengonversi PDF ke gambar."))),
        "image/png"
      );
    });

    const baseName = pdfFile.name.replace(/\.pdf$/i, "") || "qris-resmi";
    return new File([blob], `${baseName}.png`, { type: "image/png" });
  };

  const handleQrisFileChange = async (file: File | null) => {
    setErrorMsg(null);
    if (!file) {
      setQrisFile(null);
      setQrisPreviewUrl(null);
      return;
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setConvertingPdf(true);
      try {
        const pngFile = await convertPdfToPngFile(file);
        setQrisFile(pngFile);
        setQrisPreviewUrl(URL.createObjectURL(pngFile));
      } catch (err: any) {
        setErrorMsg(
          err?.message ||
            "Gagal membaca file PDF QRIS. Pastikan file PDF tidak terkunci password."
        );
        setQrisFile(null);
        setQrisPreviewUrl(null);
      } finally {
        setConvertingPdf(false);
      }
      return;
    }

    setQrisFile(file);
    setQrisPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      [
        "business_name",
        "business_tagline",
        "business_address",
        "business_phone",
        "wifi_ssid",
        "wifi_password",
        "tax_pb1_percentage",
        "qris_merchant_name",
        "qris_nmid",
        "qris_bank_info",
      ].forEach((k) => {
        if (settings[k] !== undefined && settings[k] !== null) {
          formData.append(k, String(settings[k]));
        }
      });

      if (qrisFile) {
        formData.append("qris_image", qrisFile);
      }

      const res = await apiFetch("/owner/settings", {
        method: "POST",
        body: formData,
      });

      setSettings(res.settings || {});
      setHasQrisImage(Boolean(res.has_official_qris_image));
      setQrisFile(null);
      setQrisPreviewUrl(null);
      setFeedback(res.message);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/owner/employees", {
        method: "POST",
        body: JSON.stringify({
          name: empName.trim(),
          role_title: empRole.trim(),
          default_shift: empShift,
          pin: empPin.trim(),
        }),
      });
      setFeedback(res.message);
      setEmpName("");
      setEmpPin("");
      loadSettings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-xs text-text-muted">
        Memuat pengaturan usaha...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
          Pengaturan Usaha, QRIS Resmi &amp; Petugas Shift
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Konfigurasi profil Warkop Teras Nenek, unggah gambar QRIS statis resmi
          merchant, dan kelola daftar identitas karyawan pada akun bersama.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-error-subtle text-error text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Business & Official QRIS Configuration */}
        <section className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
          <h2 className="text-base font-bold text-nav-espresso">
            Profil Usaha &amp; Konfigurasi QRIS Statis Resmi
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Nama Usaha
                </label>
                <input
                  type="text"
                  value={settings.business_name || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, business_name: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={settings.business_phone || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, business_phone: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Alamat Lengkap Warkop
              </label>
              <input
                type="text"
                value={settings.business_address || ""}
                onChange={(e) =>
                  setSettings({ ...settings, business_address: e.target.value })
                }
                className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  SSID WiFi Pelanggan
                </label>
                <input
                  type="text"
                  value={settings.wifi_ssid || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, wifi_ssid: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Sandi WiFi Pelanggan
                </label>
                <input
                  type="text"
                  value={settings.wifi_password || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, wifi_password: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand"
                />
              </div>
              <div>
                <label className="font-bold text-nav-espresso block mb-1">
                  Pajak Restoran PB1 (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={settings.tax_pb1_percentage ?? 10}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tax_pb1_percentage: e.target.value,
                    })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand font-bold tabular-nums"
                />
              </div>
            </div>

            {/* Official QRIS Configuration Block */}
            <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-nav-espresso flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-primary-container" />
                  <span>Konfigurasi QRIS Statis Resmi Merchant</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    hasQrisImage
                      ? "bg-success-subtle text-tertiary"
                      : "bg-warning-subtle text-warning"
                  }`}
                >
                  {hasQrisImage
                    ? "Gambar QRIS Resmi Terpasang"
                    : "Menggunakan QRIS Demo"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-secondary block mb-1">
                    Nama Merchant QRIS
                  </label>
                  <input
                    type="text"
                    value={settings.qris_merchant_name || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        qris_merchant_name: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-surface-cream border border-border-sand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-secondary block mb-1">
                    NMID QRIS
                  </label>
                  <input
                    type="text"
                    value={settings.qris_nmid || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, qris_nmid: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg bg-surface-cream border border-border-sand font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-secondary block mb-1">
                  Unggah Stand QRIS Resmi (PDF / JPG / PNG)
                </label>
                <label className="h-11 px-3 rounded-xl bg-surface-cream border border-dashed border-border-strong flex items-center justify-center gap-2 cursor-pointer hover:bg-surface-variant">
                  <Upload className="w-4 h-4 text-primary-container" />
                  <span>
                    {convertingPdf
                      ? "Mengonversi PDF QRIS menjadi gambar..."
                      : qrisFile
                      ? qrisFile.name
                      : "Pilih File PDF atau Gambar QRIS Resmi Merchant"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      handleQrisFileChange(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>

                {(qrisPreviewUrl || hasQrisImage) && (
                  <div className="mt-3 p-3 rounded-xl bg-surface-cream border border-border-sand flex flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-text-muted">
                      {qrisPreviewUrl
                        ? "Preview QRIS Baru (siap disimpan)"
                        : "QRIS Resmi Aktif Saat Ini"}
                    </span>
                    <img
                      src={qrisPreviewUrl || "/api/v1/public/qris-image"}
                      alt="Preview QRIS Resmi"
                      className="max-h-56 w-auto rounded-lg object-contain border border-border-sand"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || convertingPdf}
              className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? "Menyimpan..."
                  : convertingPdf
                  ? "Memproses PDF..."
                  : "Simpan Pengaturan Usaha & QRIS"}
              </span>
            </button>
          </form>
        </section>

        {/* Right: Employee Shift Profiles on Shared Account */}
        <aside className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
          <div>
            <h2 className="text-base font-bold text-nav-espresso">
              Daftar Identitas Petugas Shift (Akun Bersama)
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Daftar karyawan yang dapat dipilih saat login kasir beserta PIN
              konfirmasi aksi sensitif.
            </p>
          </div>

          <div className="space-y-2.5">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="p-3.5 rounded-xl bg-canvas-cream border border-border-sand flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-nav-espresso block">
                    {emp.name} ({emp.code})
                  </span>
                  <span className="text-text-muted">
                    {emp.role_title} • Default: {emp.default_shift}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-success-subtle text-tertiary text-[11px] font-bold">
                  Aktif
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddEmployee}
            className="pt-4 border-t border-surface-variant space-y-3 text-xs"
          >
            <h3 className="font-bold text-nav-espresso">
              Tambah Identitas Karyawan Baru
            </h3>
            <input
              type="text"
              required
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              placeholder="Nama Lengkap Karyawan"
              className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                placeholder="Jabatan (mis. Barista)"
                className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand"
              />
              <input
                type="password"
                required
                minLength={4}
                maxLength={8}
                value={empPin}
                onChange={(e) => setEmpPin(e.target.value)}
                placeholder="PIN 4-6 Digit"
                className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-nav-espresso text-canvas-cream font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Profil Petugas Shift</span>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
