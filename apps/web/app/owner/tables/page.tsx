"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch, formatTimeWIB } from "@/lib/api";
import {
  QrCode,
  Printer,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Power,
} from "lucide-react";

export default function OwnerTablesAndQrPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<number>(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [originUrl, setOriginUrl] = useState<string>("http://localhost:3000");

  const loadTables = () => {
    setLoading(true);
    apiFetch("/owner/tables")
      .then((res) => {
        const list = res.tables || [];
        setTables(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
    loadTables();
  }, []);

  const selectedTable =
    tables.find((t) => t.id === selectedTableId) || tables[0] || null;

  const handleRegenerateQr = async (table: any) => {
    if (
      !window.confirm(
        `Ganti token QR untuk ${table.name} (${table.code})? QR Code lama yang sudah dicetak akan otomatis dicabut dan tidak bisa membuat pesanan baru (AC-03).`
      )
    ) {
      return;
    }

    try {
      const res = await apiFetch(`/owner/tables/${table.id}/regenerate-qr`, {
        method: "POST",
        body: JSON.stringify({ close_session: false }),
      });
      setFeedback(res.message);
      loadTables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTable = async (table: any) => {
    try {
      const res = await apiFetch(`/owner/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !table.is_active }),
      });
      setFeedback(res.message);
      loadTables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header matching Stitch Meja & QR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
              Meja &amp; QR
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-subtle text-tertiary text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span>{tables.filter((t) => t.is_active).length} meja aktif</span>
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Kelola 9 meja pelanggan dan konfigurasi unik QR stand meja yang dapat
            dicetak atau dicabut (AC-01, AC-02, AC-03, AC-32).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak QR Stand Meja</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-success-subtle text-tertiary text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main 2-Column Layout per Stitch Meja & QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9 Tables List */}
        <div className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-[20px] overflow-hidden soft-shadow">
          <div className="p-5 border-b border-surface-variant flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-nav-espresso">
                Daftar 9 Meja &amp; Status Sesi
              </h2>
              <span className="text-xs text-text-muted">
                Klik baris meja untuk melihat, menguji, atau mengganti QR token
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-variant/60 text-text-muted font-bold border-b border-border-sand">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Meja</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Status QR</th>
                  <th className="py-3 px-4">Sesi Meja</th>
                  <th className="py-3 px-4">Scan Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-text-muted">
                      Memuat daftar 9 meja...
                    </td>
                  </tr>
                ) : (
                  tables.map((t) => {
                    const isSelected = selectedTable?.id === t.id;
                    const hasActiveSession = Boolean(t.active_session);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTableId(t.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-secondary-container/40 font-bold"
                            : "hover:bg-surface-container-low/60"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-nav-espresso tabular-nums">
                          {t.code}
                        </td>
                        <td className="py-3.5 px-4 text-nav-espresso">{t.name}</td>
                        <td className="py-3.5 px-4 text-text-muted">{t.area}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              t.is_active
                                ? "bg-success-subtle text-tertiary"
                                : "bg-error-subtle text-error"
                            }`}
                          >
                            {t.is_active ? "Aktif" : "Dicabut / Nonaktif"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              hasActiveSession
                                ? "bg-primary-subtle text-on-primary-subtle"
                                : "bg-surface-variant text-text-muted"
                            }`}
                          >
                            {hasActiveSession ? "Terisi" : "Kosong"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-text-muted tabular-nums">
                          {formatTimeWIB(t.last_scanned_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Printable QR Stand Card Preview & Token Actions */}
        <aside className="lg:col-span-5 bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow space-y-5">
          {selectedTable && (
            <>
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div>
                  <span className="text-xs font-bold text-primary-container">
                    {selectedTable.code} • {selectedTable.area}
                  </span>
                  <h2 className="text-lg font-bold text-nav-espresso">
                    Preview Stand QR — {selectedTable.name}
                  </h2>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedTable.is_active
                      ? "bg-success-subtle text-tertiary"
                      : "bg-error-subtle text-error"
                  }`}
                >
                  {selectedTable.is_active ? "QR Aktif" : "QR Nonaktif"}
                </span>
              </div>

              {/* Printable Stand Card Visual */}
              <div className="p-6 rounded-2xl bg-canvas-cream border-2 border-nav-espresso text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nav-espresso text-canvas-cream text-xs font-bold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>WARKOP TERAS NENEK</span>
                </div>

                <h3 className="text-xl font-bold text-nav-espresso">
                  {selectedTable.name.toUpperCase()} ({selectedTable.code})
                </h3>
                <p className="text-xs text-secondary">
                  Scan QR untuk lihat menu &amp; pesan langsung dari meja tanpa antre
                </p>

                <div className="p-4 bg-surface-cream rounded-2xl border border-border-sand inline-block mx-auto shadow-sm">
                  <QRCodeSVG
                    value={`${originUrl}/t/${selectedTable.qr_token}`}
                    size={176}
                    bgColor="#FFFCF7"
                    fgColor="#292724"
                  />
                </div>

                <div className="text-[11px] font-mono text-text-muted break-all px-2">
                  Token: {selectedTable.qr_token}
                </div>
              </div>

              {/* QR Management Controls */}
              <div className="space-y-2.5 text-xs">
                <Link
                  href={`/t/${selectedTable.qr_token}`}
                  target="_blank"
                  className="w-full h-11 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream font-bold flex items-center justify-center gap-2"
                >
                  <span>Simulasi Buka Link QR {selectedTable.name}</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRegenerateQr(selectedTable)}
                    className="h-11 px-3 rounded-xl bg-primary-subtle hover:bg-secondary-container text-on-primary-subtle font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Ganti Token QR Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleTable(selectedTable)}
                    className={`h-11 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedTable.is_active
                        ? "bg-error-subtle text-error"
                        : "bg-success-subtle text-tertiary"
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>
                      {selectedTable.is_active
                        ? "Cabut / Nonaktifkan"
                        : "Aktifkan Kembali"}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
