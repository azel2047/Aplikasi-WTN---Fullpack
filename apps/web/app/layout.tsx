import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PwaRegistrar } from "@/components/PwaRegistrar";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Warkop Teras Nenek — QR Ordering, Kasir POS & Owner Dashboard",
  description:
    "Sistem pemesanan QR meja, operasional kasir terpadu, manajemen stok resep bahan baku, dan keuangan Warkop Teras Nenek.",
  applicationName: "Teras Nenek",
  appleWebApp: {
    capable: true,
    title: "Teras Nenek",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10A352",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas-cream text-on-surface">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
