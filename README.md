# Warkop Teras Nenek — Integrated QR Ordering, Cashier POS & Owner Dashboard

Sistem web operasional terintegrasi untuk **Warkop Teras Nenek** dengan arah visual **Rustic Modern** (Espresso Brown, Dark Walnut, Warm Cream, Sand Beige, Terracotta, Olive, Charcoal, dan font Plus Jakarta Sans).

## Fitur Utama

1. **Customer Ordering Website (`/t/[token]`, `/order/[publicCode]`, `/rating/[publicCode]`):**
   - Pemesanan mandiri tanpa wajib registrasi akun melalui **9 QR Code meja unik** (`TBL-01` s/d `TBL-09`) yang dapat dicabut/diganti tokennya.
   - Katalog menu per kategori, pencarian menu, kustomisasi varian/opsi produk, dan **catatan khusus per item (maksimal 250 karakter)**.
   - Keranjang belanja, checkout dengan pilihan **Tunai (Cash)** atau **QRIS Statis**, unggah bukti pembayaran QRIS ke private storage, pelacakan status pesanan realtime, panggilan bantuan kasir, dan **rating keseluruhan 1–5 bintang** setelah pesanan selesai.
2. **Aplikasi Kasir Terpadu (`/login`, `/cashier/orders`, `/cashier/pos`, `/cashier/payments`, `/cashier/expenses`, `/cashier/daily-report`, `/cashier/closing`):**
   - Login satu akun karyawan bersama dengan **pemilihan identitas petugas per shift** dan proteksi **PIN** untuk aksi sensitif (pembatalan/refund/closing).
   - Satu antrean terpadu untuk pesanan QR meja dan POS manual, menampilkan catatan khusus per item secara menonjol.
   - Kalkulator pembayaran tunai dengan perhitungan kembalian otomatis di backend, serta **verifikasi manual bukti QRIS** (tidak otomatis lunas hanya karena bukti diunggah).
   - Pencatatan pengeluaran operasional, pengiriman **1 laporan harian karyawan per tanggal/shift** (dengan angka transaksi terkunci dari sistem), dan penutupan kas (closing).
3. **Owner Dashboard (`/owner`, `/owner/orders`, `/owner/menu`, `/owner/tables`, `/owner/inventory/*`, `/owner/finance`, `/owner/expenses`, `/owner/reports`, `/owner/ratings`, `/owner/analytics`, `/owner/settings`, `/owner/audit-logs`):**
   - Overview bisnis realtime, manajemen katalog menu & kategori, serta manajemen 9 meja & cetak QR.
   - **Manajemen Stok Berbasis Bahan Baku & Resep:** konversi satuan, pengurangan stok atomik & idempotent saat pembayaran dikonfirmasi, pencegahan stok negatif, pembelian/restock, mutasi stok append-only, dan stock opname.
   - **Keuangan & Akuntansi Warkop:** memisahkan dengan tegas Penjualan Lunas, HPP Resep Terpakai (COGS), Biaya Operasional, Laba Operasional, Pembelian Persediaan (PO), dan Posisi Saldo Kas/Bank tanpa double-counting.
   - Tinjauan laporan harian karyawan, statistik rating pelanggan, analitik jam ramai/sepi berbasis transaksi aktual (lengkap dengan label kejujuran kecukupan data), konfigurasi upload QRIS resmi, ekspor laporan CSV, dan audit log.

---

## Struktur Monorepo

```text
warkop-teras-nenek/
├── apps/
│   ├── api/                 # Backend: Laravel 12 REST API (/api/v1), Sanctum, Reverb, SQLite/PostgreSQL
│   └── web/                 # Frontend: Next.js App Router, TypeScript, Tailwind CSS, Recharts
├── design/                  # Referensi desain Stitch & DESIGN.md
├── docs/
│   └── API_AND_DEPLOYMENT.md
├── skills/
│   └── warkop-teras-nenek/
├── AGENT.md
├── ARCHITECTURE.md
├── PRD_Warkop_Teras_Nenek_v2_Final.md
└── README.md
```

---

## Cara Menjalankan Sistem (Development)

### 1. Menjalankan Backend API (`apps/api`)
```bash
cd apps/api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate:fresh --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Menjalankan pengujian otomatis backend:
```bash
cd apps/api
php artisan test
```

### 2. Menjalankan Frontend Web (`apps/web`)
```bash
cd apps/web
npm install
npm run dev -- --port 3000
```

Buka **`http://localhost:3000`** di browser. Seluruh permintaan ke `/api/v1/*` dari Next.js otomatis diteruskan ke backend Laravel pada port `8000`.

---

## Akun Demo & Akses Cepat

Data awal hasil seeder ditandai dengan jelas sebagai **Data Demo**.

| Peran | Email | Password | PIN Aksi Sensitif |
|---|---|---|---|
| **Owner** | `owner@warkopterasnenek.id` | `owner123` | `9999` |
| **Kasir (Akun Bersama)** | `kasir@warkopterasnenek.id` | `kasir123` | `1234` (Rina), `2345` (Budi), `3456` (Riko) |

### Link Cepat Simulasi QR Meja
- Halaman Direktori 9 QR Meja: `http://localhost:3000`
- QR Meja 4 (`TBL-04`): `http://localhost:3000/t/wtn_tbl04_4a5b6c7d8e9f0a1b2c`
- Tracking Order Demo `#0042` (Meja 4): `http://localhost:3000/order/ORD-0042-DEMO4`

Dokumentasi endpoint API lengkap dan panduan deployment produksi tersedia pada [`docs/API_AND_DEPLOYMENT.md`](docs/API_AND_DEPLOYMENT.md).
