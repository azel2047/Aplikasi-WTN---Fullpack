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
  Plus,
  Trash2,
  X,
} from "lucide-react";

export default function OwnerTablesAndQrPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<number>(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [originUrl, setOriginUrl] = useState<string>("http://localhost:3000");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("Indoor");
  const [newCapacity, setNewCapacity] = useState("4");
  const [submitting, setSubmitting] = useState(false);

  const loadTables = (selectId?: number) => {
    setLoading(true);
    apiFetch("/owner/tables")
      .then((res) => {
        const list = res.tables || [];
        setTables(list);
        if (selectId) setSelectedTableId(selectId);
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

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/owner/tables", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          area: newArea.trim() || "Indoor",
          seat_capacity: Number(newCapacity) || 4,
        }),
      });
      setShowAddModal(false);
      setNewName("");
      setNewArea("Indoor");
      setNewCapacity("4");
      setFeedback(res.message);
      loadTables(res.table?.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async (table: any) => {
    if (
      !window.confirm(
        `Hapus ${table.name} (${table.code}) secara permanen? QR Code meja ini tidak akan bisa digunakan lagi.`
      )
    ) {
      return;
    }
    try {
      const res = await apiFetch(`/owner/tables/${table.id}`, {
        method: "DELETE",
      });
      setFeedback(res.message);
      loadTables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegenerateQr = async (table: any) => {
    if (
      !window.confirm(
        `Ganti token QR untuk ${table.name} (${table.code})? QR Code lama yang sudah dicetak akan otomatis dicabut dan tidak bisa membuat pesanan baru.`
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
      {/* Page Header */}
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
            Kelola {tables.length} meja pelanggan, tambah meja baru otomatis
            dengan QR stand siap cetak, atau cabut QR lama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setNewName(`Meja ${tables.length + 1}`);
              setShowAddModal(true);
            }}
            className="h-11 px-4 rounded-xl bg-nav-espresso hover:bg-dark-walnut text-canvas-cream text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Meja</span>
          </button>
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tables List */}
        <div className="lg:col-span-7 bg-surface-cream border border-border-sand rounded-[20px] overflow-hidden soft-shadow">
          <div className="p-5 border-b border-surface-variant flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-nav-espresso">
                Daftar {tables.length} Meja &amp; Status Sesi
              </h2>
              <span className="text-xs text-text-muted">
                Klik baris meja untuk melihat, mencetak, atau mengganti QR token
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
                      Memuat daftar meja...
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
              <div
                id="table-qr-print"
                className="p-6 rounded-2xl bg-canvas-cream border-2 border-nav-espresso text-center space-y-3"
              >
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
                    bgColor="#FFFFFF"
                    fgColor="#0F172A"
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
                  <span>Buka Menu {selectedTable.name}</span>
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

                <button
                  type="button"
                  onClick={() => handleDeleteTable(selectedTable)}
                  className="w-full h-10 rounded-xl border border-border-sand hover:bg-error-subtle hover:text-error text-text-muted font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus {selectedTable.name}</span>
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-cream border border-border-sand rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-nav-espresso">
                  Tambah Meja Baru
                </h3>
                <p className="text-xs text-text-muted">
                  Kode meja dan QR Code unik akan dibuat otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-variant flex items-center justify-center text-text-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-nav-espresso block">
                  Nama Meja
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Meja 10 atau Meja VIP"
                  className="w-full h-10 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-nav-espresso focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-nav-espresso block">
                    Area
                  </label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-canvas-cream border border-border-sand text-nav-espresso focus:outline-none focus:border-primary-container"
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Teras">Teras</option>
                    <option value="Lantai 2">Lantai 2</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-nav-espresso block">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-canvas-cream border border-border-sand text-nav-espresso tabular-nums focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-xl border border-border-sand text-text-muted font-bold hover:bg-surface-variant cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary-hover text-on-primary font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Membuat..." : "Simpan & Buat QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
