"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, formatDateTimeWIB, formatRupiah } from "@/lib/api";
import { Star } from "lucide-react";

export default function OwnerRatingsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<number | "ALL">("ALL");

  useEffect(() => {
    apiFetch("/owner/ratings")
      .then((res) => {
        setSummary(res.summary);
        setRatings(res.ratings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <div className="h-44 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
        <div className="h-64 rounded-2xl bg-surface-cream border border-border-sand animate-pulse" />
      </div>
    );
  }

  const filteredRatings =
    starFilter === "ALL"
      ? ratings
      : ratings.filter((r) => r.stars === starFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nav-espresso tracking-tight">
          Rating Pelanggan
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Evaluasi kepuasan pelanggan keseluruhan (1–5 bintang) dari pesanan yang
          telah selesai (AC-27, AC-28, AC-29).
        </p>
      </div>

      {/* Summary Row matching Stitch Rating */}
      <section className="bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Overall Score */}
          <div className="lg:col-span-5 flex flex-col gap-2 lg:pr-8 lg:border-r border-border-sand">
            <span className="text-xs uppercase tracking-wider text-text-muted font-bold">
              Skor Kepuasan Keseluruhan
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-nav-espresso tabular-nums">
                {summary.average_stars || "0.0"}
              </span>
              <span className="text-lg text-text-muted font-semibold">
                / 5.0
              </span>
            </div>
            <div className="flex items-center gap-1 my-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <Star
                  key={num}
                  className={`w-6 h-6 ${
                    num <= Math.round(summary.average_stars || 0)
                      ? "text-accent-terracotta fill-accent-terracotta"
                      : "text-border-sand"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-nav-espresso tabular-nums">
              {summary.total_ratings} rating dari pesanan selesai
            </span>
            <span className="text-[11px] text-text-muted">
              Skala 1–5 • Hanya 1 rating per order selesai (AC-28)
            </span>
          </div>

          {/* Right Distribution Breakdown */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-secondary uppercase tracking-wider">
                Distribusi Bintang
              </span>
              <span className="text-text-muted">
                Berdasarkan {summary.total_ratings} ulasan aktual
              </span>
            </div>

            {summary.distribution?.map((row: any) => (
              <div
                key={row.stars}
                className="flex items-center gap-3 text-xs"
              >
                <div className="w-16 text-right font-bold text-nav-espresso flex items-center justify-end gap-1">
                  <span>{row.stars}</span>
                  <Star className="w-3.5 h-3.5 text-accent-terracotta fill-accent-terracotta" />
                </div>
                <div className="flex-1 h-3 rounded-full bg-border-sand/40 overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full"
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
                <div className="w-24 text-right tabular-nums font-bold text-nav-espresso">
                  {row.count}{" "}
                  <span className="text-text-muted font-normal">
                    ({row.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews List */}
      <section className="bg-surface-cream border border-border-sand rounded-[20px] p-6 soft-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-nav-espresso">
            Ulasan &amp; Komentar Pelanggan ({filteredRatings.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStarFilter("ALL")}
              className={`h-9 px-3.5 rounded-full text-xs font-bold cursor-pointer ${
                starFilter === "ALL"
                  ? "bg-nav-espresso text-canvas-cream"
                  : "bg-surface-variant text-secondary"
              }`}
            >
              Semua ({ratings.length})
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStarFilter(s)}
                className={`h-9 px-3.5 rounded-full text-xs font-bold cursor-pointer ${
                  starFilter === s
                    ? "bg-nav-espresso text-canvas-cream"
                    : "bg-surface-variant text-secondary"
                }`}
              >
                {s} Bintang
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-surface-variant">
          {filteredRatings.length === 0 ? (
            <p className="py-6 text-xs text-text-muted text-center">
              Belum ada ulasan pada filter ini.
            </p>
          ) : (
            filteredRatings.map((r) => (
              <article
                key={r.id}
                className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      {[...Array(r.stars)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 text-accent-terracotta fill-accent-terracotta"
                        />
                      ))}
                    </div>
                    <span className="font-bold text-nav-espresso tabular-nums">
                      {r.stars}.0 / 5
                    </span>
                    <span className="text-text-muted">•</span>
                    <span className="font-bold text-nav-espresso">
                      {r.customer_display_name}
                    </span>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-muted">
                      {formatDateTimeWIB(r.created_at)}
                    </span>
                  </div>

                  {r.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.tags.map((t: string) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-full bg-surface-variant text-secondary text-[11px] font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.comment && (
                    <p className="text-sm text-on-surface leading-relaxed">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                </div>

                {r.order && (
                  <div className="p-3 rounded-xl bg-canvas-cream border border-border-sand shrink-0 text-right">
                    <span className="font-bold text-nav-espresso block tabular-nums">
                      Order {r.order.order_number}
                    </span>
                    <span className="text-primary-container font-bold tabular-nums">
                      {formatRupiah(r.order.total_amount)}
                    </span>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
