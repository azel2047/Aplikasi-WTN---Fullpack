# Warkop Teras Nenek — QR Ordering, Cashier POS & Owner Dashboard

Aplikasi web full-stack terintegrasi untuk operasional **Warkop Teras Nenek** (Pemesanan QR 9 Meja, Kasir POS, Antrean Dapur, Struk Thermal 80mm, Stok Bahan Baku & Resep, Keuangan, Laporan Shift, Rating, dan Dashboard Owner).

Dirancang sebagai **1 aplikasi Full-Stack Next.js (`apps/web`)** agar bisa langsung dijalankan cukup dengan 1 terminal dan **1-click deploy ke Vercel atau Netlify** tanpa perlu server backend terpisah.

---

## Cara Menjalankan Lokal (1 Terminal)

```bash
cd apps/web
npm install
npm run dev
```

Buka **`http://localhost:3000`** di browser.

---

## Cara Deploy Gratis (Vercel / Netlify)

1. Hubungkan repository GitHub ini ke **Vercel** atau **Netlify**.
2. Atur **Root Directory** ke `apps/web`.
3. Biarkan build command default (`npm run build`) lalu klik **Deploy**.
4. Seluruh frontend dan API (`/api/v1/*`) otomatis aktif dalam 1 domain yang sama.

> **Catatan Production / VPS:** Folder `apps/api` (Laravel REST API + PostgreSQL/SQLite) tetap disediakan di repository ini sebagai opsi migrasi ke VPS / database PostgreSQL penuh saat sistem siap dipakai operasional jangka panjang.

---

## Fitur Utama

- **Customer Ordering (`/t/[token]`, `/order/[publicCode]`):** 9 QR meja unik (`TBL-01`–`TBL-09`), katalog menu + varian/opsi, catatan per item (maks. 250 karakter), checkout Tunai / QRIS + unggah bukti bayar, tracking pesanan, dan rating 1–5 bintang.
- **Kasir & POS (`/cashier/pos`, `/cashier/orders`, `/cashier/payments`, `/cashier/expenses`, `/cashier/daily-report`, `/cashier/closing`):** POS manual, antrean terpadu QR & POS, kalkulator kembalian tunai, verifikasi QRIS manual, **cetak struk thermal 80mm**, pengeluaran operasional, laporan harian shift, dan closing kas dengan PIN.
- **Owner Dashboard (`/owner`):** Overview omzet, manajemen menu & 9 meja (cetak/ganti QR), stok bahan baku & resep otomatis, laporan keuangan & arus kas, review laporan karyawan, rating pelanggan, analitik jam ramai/sepi, ekspor CSV, dan audit log.

---

## Akun Default

| Peran | Email | Password | PIN Aksi Sensitif |
|---|---|---|---|
| **Kasir (Akun Bersama)** | `kasir@warkopterasnenek.id` | `kasir123` | `1234` (Rina), `2345` (Budi), `3456` (Riko) |
| **Owner** | `owner@warkopterasnenek.id` | `owner123` | `9999` |
