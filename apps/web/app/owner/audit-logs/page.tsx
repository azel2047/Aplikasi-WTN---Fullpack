"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatDateTimeWIB } from "@/lib/api";
import { History, ShieldAlert } from "lucide-react";

export default function OwnerAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/owner/audit-logs")
      .then((res) => setLogs(res.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
            Audit Log &amp; Jejak Aktivitas Sensitif
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Riwayat aksi sensitif: perubahan harga menu, verifikasi pembayaran,
            pembatalan/refund, koreksi stok opname, resep, pengeluaran, dan
            regenerasi QR meja (AC-34).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle text-on-primary-subtle text-xs font-bold">
          <ShieldAlert className="w-4 h-4" />
          <span>Append-Only Security Log</span>
        </span>
      </div>

      <div className="bg-surface-cream border border-border-sand rounded-2xl overflow-hidden soft-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-text-muted uppercase border-b border-border-sand">
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Aksi</th>
                <th className="py-3.5 px-4">Actor &amp; Peran</th>
                <th className="py-3.5 px-4">Objek Entitas</th>
                <th className="py-3.5 px-4">Ringkasan Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-text-muted">
                    Memuat jejak audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-text-muted">
                    Belum ada catatan audit log.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3.5 px-4 text-text-muted tabular-nums whitespace-nowrap">
                      {formatDateTimeWIB(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-surface-variant text-nav-espresso font-mono font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-nav-espresso block">
                        {log.actor_name}
                      </span>
                      <span className="text-[10px] text-text-muted uppercase">
                        {log.actor_role}{" "}
                        {log.shift_info ? `• ${log.shift_info}` : ""}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-secondary">
                      {log.entity_type} #{log.entity_id || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface">
                      {log.summary}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
