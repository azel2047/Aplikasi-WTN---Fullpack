import type { MetadataRoute } from "next";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let businessName = "Warkop Teras Nenek";
  let hasCustomLogo = false;
  let logoUpdatedAt: string | null = null;

  try {
    const db = await readDb();
    businessName = db.system_settings?.business_name || businessName;
    hasCustomLogo = Boolean(db.system_settings?.logo_image_data_url);
    logoUpdatedAt = db.system_settings?.logo_updated_at || null;
  } catch {
    // Fallback to static defaults if DB unavailable during build
  }

  const dynamicLogoUrl = logoUpdatedAt
    ? `/api/v1/public/logo?v=${encodeURIComponent(logoUpdatedAt)}`
    : "/api/v1/public/logo";

  return {
    name: `${businessName} — Kasir POS & Owner`,
    short_name: businessName,
    description: `Aplikasi Kasir POS, Antrean Dapur, dan Dashboard Owner ${businessName}.`,
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F6F8F7",
    theme_color: "#10A352",
    icons: hasCustomLogo
      ? [
          {
            src: dynamicLogoUrl,
            sizes: "192x192",
            type: "image/webp",
            purpose: "any",
          },
          {
            src: dynamicLogoUrl,
            sizes: "512x512",
            type: "image/webp",
            purpose: "any",
          },
        ]
      : [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
  };
}
