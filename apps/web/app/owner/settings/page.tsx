"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notifyBrandingUpdated } from "@/components/BrandLogo";
import {
  Save,
  Upload,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Image as ImageIcon,
  UserCircle2,
} from "lucide-react";

export default function OwnerSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [hasQrisImage, setHasQrisImage] = useState(false);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [hasCustomLogo, setHasCustomLogo] = useState(false);
  const [logoUpdatedAt, setLogoUpdatedAt] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Owner Profile Form
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettings = () => {
    setLoading(true);
    apiFetch("/owner/settings")
      .then((res) => {
        setSettings(res.settings || {});
        setHasQrisImage(Boolean(res.has_official_qris_image));
        setHasCustomLogo(Boolean(res.has_custom_logo));
        setLogoUpdatedAt(res.logo_updated_at || null);
        if (res.profile) {
          setProfileName(res.profile.name || "");
          setProfileEmail(res.profile.email || "");
        }
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

  const trimAndConvertLogoToWebp = async (file: File): Promise<File> => {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Gagal membaca file logo."));
        el.src = imgUrl;
      });

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = w;
      srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) return file;
      srcCtx.drawImage(img, 0, 0);
      const { data } = srcCtx.getImageData(0, 0, w, h);

      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          const isEmpty = a < 20 || (r > 245 && g > 245 && b > 245);
          if (!isEmpty) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      const cropX = minX <= maxX ? minX : 0;
      const cropY = minY <= maxY ? minY : 0;
      const cropW = minX <= maxX ? maxX - minX + 1 : w;
      const cropH = minY <= maxY ? maxY - minY + 1 : h;
      const outSize = Math.min(512, Math.max(cropW, cropH));

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outSize;
      outCanvas.height = outSize;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) return file;
      const drawW = Math.round((cropW / Math.max(cropW, cropH)) * outSize);
      const drawH = Math.round((cropH / Math.max(cropW, cropH)) * outSize);
      outCtx.drawImage(
        srcCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        Math.round((outSize - drawW) / 2),
        Math.round((outSize - drawH) / 2),
        drawW,
        drawH
      );

      const blob: Blob = await new Promise((resolve, reject) => {
        outCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Gagal memproses logo."))),
          "image/webp",
          0.9
        );
      });
      return new File([blob], "logo-warkop.webp", { type: "image/webp" });
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  const handleLogoFileChange = async (file: File | null) => {
    setErrorMsg(null);
    if (!file) {
      setLogoFile(null);
      setLogoPreviewUrl(null);
      return;
    }
    try {
      const processed = await trimAndConvertLogoToWebp(file);
      setLogoFile(processed);
      setLogoPreviewUrl(URL.createObjectURL(processed));
    } catch {
      setLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
    }
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
      if (logoFile) {
        formData.append("logo_image", logoFile);
      }

      const res = await apiFetch("/owner/settings", {
        method: "POST",
        body: formData,
      });

      setSettings(res.settings || {});
      setHasQrisImage(Boolean(res.has_official_qris_image));
      setHasCustomLogo(Boolean(res.has_custom_logo));
      setLogoUpdatedAt(res.logo_updated_at || null);
      setQrisFile(null);
      setQrisPreviewUrl(null);
      setLogoFile(null);
      setLogoPreviewUrl(null);
      notifyBrandingUpdated();
      setFeedback(res.message);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      const payload: any = {
        name: profileName.trim(),
        email: profileEmail.trim(),
      };
      if (newPassword.trim()) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword.trim();
      }
      const res = await apiFetch("/owner/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res.profile && typeof window !== "undefined") {
        localStorage.setItem("wtn_user", JSON.stringify(res.profile));
      }
      setCurrentPassword("");
      setNewPassword("");
      setFeedback(res.message);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingProfile(false);
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
          Pengaturan Usaha, Logo, QRIS &amp; Profil Owner
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Ubah identitas dan logo warkop (otomatis terupdate di halaman pelanggan,
          kasir, dan owner), unggah QRIS resmi, serta kelola akun owner.
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
            </div>

            {/* Dynamic Logo Configuration Block */}
            <div className="p-4 rounded-xl bg-canvas-cream border border-border-sand space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-nav-espresso flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary-container" />
                  <span>Logo Warkop (Otomatis Berubah di Semua Halaman)</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    hasCustomLogo
                      ? "bg-success-subtle text-tertiary"
                      : "bg-surface-variant text-text-muted"
                  }`}
                >
                  {hasCustomLogo ? "Logo Kustom Aktif" : "Logo Default"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-transparent overflow-hidden flex items-center justify-center shrink-0">
                  {logoPreviewUrl || hasCustomLogo ? (
                    <img
                      src={
                        logoPreviewUrl ||
                        (logoUpdatedAt
                          ? `/api/v1/public/logo?v=${encodeURIComponent(logoUpdatedAt)}`
                          : "/api/v1/public/logo")
                      }
                      alt="Logo Warkop"
                      className="w-full h-full object-cover scale-[1.08]"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-text-muted" />
                  )}
                </div>

                <label className="flex-1 h-11 px-3 rounded-xl bg-surface-cream border border-dashed border-border-strong flex items-center justify-center gap-2 cursor-pointer hover:bg-surface-variant">
                  <Upload className="w-4 h-4 text-primary-container" />
                  <span className="truncate">
                    {logoFile
                      ? logoFile.name
                      : "Pilih Logo Baru (PNG / JPG / WEBP, maks 2MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      handleLogoFileChange(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-text-muted">
                Logo yang diunggah akan langsung berubah di halaman login,
                dashboard owner, kasir, dan menu pelanggan.
              </p>
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

        {/* Right: Owner Profile Management */}
        <aside className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-2xl p-6 soft-shadow space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-subtle text-on-primary-subtle flex items-center justify-center shrink-0">
              <UserCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-nav-espresso">
                Profil Akun Owner
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Perbarui nama tampilan, email login, atau kata sandi akun owner.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Nama Lengkap Owner
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Contoh: Pemilik Warkop Teras Nenek"
                className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand focus:outline-none focus:border-primary-container"
              />
            </div>

            <div>
              <label className="font-bold text-nav-espresso block mb-1">
                Email Login Owner
              </label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="owner@warkopterasnenek.id"
                className="w-full h-11 px-3 rounded-xl bg-canvas-cream border border-border-sand focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="pt-3 border-t border-surface-variant space-y-3">
              <span className="font-bold text-nav-espresso block">
                Ganti Kata Sandi (Opsional)
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Kata sandi saat ini"
                className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand focus:outline-none focus:border-primary-container"
              />
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi baru (minimal 6 karakter)"
                className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand focus:outline-none focus:border-primary-container"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full h-11 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {savingProfile ? "Menyimpan Profil..." : "Simpan Profil Owner"}
              </span>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
