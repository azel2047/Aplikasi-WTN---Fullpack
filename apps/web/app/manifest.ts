import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Warkop Teras Nenek — Kasir POS & Owner",
    short_name: "Teras Nenek",
    description: "Aplikasi Kasir POS, Antrean Dapur, dan Dashboard Owner Warkop Teras Nenek.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F6F8F7",
    theme_color: "#10A352",
    icons: [
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
