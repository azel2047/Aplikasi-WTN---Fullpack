# Dokumentasi API & Panduan Deployment Produksi — Warkop Teras Nenek

## 1. Konvensi API (`/api/v1`)

Seluruh endpoint REST API berada di bawah prefix `/api/v1` pada aplikasi Laravel (`apps/api`).

- **Format Response:** JSON (`application/json`).
- **Autentikasi:** Bearer Token (`Laravel Sanctum`) pada header `Authorization: Bearer <token>`.
- **Atribusi Shift Kasir:** Header `X-Employee-Profile-Id: <id>` dikirim otomatis oleh aplikasi kasir untuk mencatat identitas petugas shift aktif pada akun karyawan bersama.
- **Idempotensi:** Endpoint pembuatan order menerima `idempotency_key` pada body atau header `Idempotency-Key` untuk mencegah duplikasi order/pembayaran saat jaringan tidak stabil.

### 1.1 Endpoint Publik (Customer Ordering Website)
| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/v1/public/tables` | Daftar 9 meja aktif untuk halaman direktori QR |
| `GET` | `/api/v1/public/tables/{token}/menu` | Validasi token QR meja, buat/ambil sesi meja, catat event kunjungan QR, dan ambil menu beserta opsi & status stok resep |
| `POST` | `/api/v1/public/orders` | Buat pesanan customer beserta opsi dan catatan per item (maks 250 karakter); kalkulasi harga & pajak murni di backend |
| `GET` | `/api/v1/public/orders/{publicCode}` | Ambil status pesanan realtime, rincian item, catatan item, dan status pembayaran |
| `POST` | `/api/v1/public/orders/{publicCode}/payment-proof` | Unggah bukti pembayaran QRIS ke private storage (`PROOF_UPLOADED`, tidak otomatis `PAID`) |
| `POST` | `/api/v1/public/orders/{publicCode}/call-waiter` | Kirim notifikasi panggilan bantuan meja ke kasir |
| `POST` | `/api/v1/public/orders/{publicCode}/rating` | Kirim rating keseluruhan 1–5 bintang (hanya setelah `COMPLETED`, maks 1 rating per order) |
| `GET` | `/api/v1/public/qris-image` | Tampilkan gambar QRIS statis resmi yang diunggah Owner |

### 1.2 Endpoint Autentikasi & Shift
| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/v1/auth/employee-profiles` | Daftar profil identitas karyawan shift aktif |
| `POST` | `/api/v1/auth/login` | Login akun bersama karyawan (dengan pilihan petugas shift) atau akun Owner |
| `GET` | `/api/v1/auth/me` | Profil user dan sesi shift aktif saat ini |
| `POST` | `/api/v1/auth/switch-shift` | Ganti identitas petugas shift aktif pada terminal kasir |
| `POST` | `/api/v1/auth/logout` | Cabut token sesi aktif |

### 1.3 Endpoint Kasir (`/api/v1/cashier/*`)
| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/v1/cashier/orders` | Ambil antrean pesanan terpadu (QR meja & POS manual) dengan filter status & pencarian |
| `GET` | `/api/v1/cashier/orders/{id}` | Detail lengkap pesanan, catatan per item, dan riwayat status |
| `PATCH` | `/api/v1/cashier/orders/{id}/status` | Ubah status pesanan (`CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED` dengan PIN & alasan) |
| `POST` | `/api/v1/cashier/orders/{id}/payments` | Verifikasi pembayaran Tunai (hitung kembalian otomatis) atau verifikasi/tolak bukti QRIS manual + potong stok bahan resep secara atomik |
| `POST` | `/api/v1/cashier/orders/{id}/refund` | Proses refund tercatat dengan PIN & alasan serta pengembalian stok |
| `GET` | `/api/v1/cashier/pos/catalog` | Ambil katalog menu & daftar 9 meja untuk POS manual |
| `POST` | `/api/v1/cashier/pos/orders` | Buat pesanan POS manual (Dine-in / Bawa Pulang) ke antrean terpadu |
| `GET/POST` | `/api/v1/cashier/expenses` | Daftar & catat pengeluaran operasional harian |
| `GET/POST` | `/api/v1/cashier/daily-reports` | Ambil angka rekap sistem terkunci & kirim laporan harian shift |
| `GET/POST` | `/api/v1/cashier/closings` | Rekonsiliasi saldo kas sistem vs kas fisik laci (Closing Kasir) |

### 1.4 Endpoint Owner (`/api/v1/owner/*`)
| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/v1/owner/dashboard` | KPI omzet hari ini, jumlah order, AOV, saldo kas, grafik omzet per jam, produk terlaris, dan peringatan stok |
| `GET/POST/PUT/DELETE` | `/api/v1/owner/products` & `/categories` | CRUD katalog produk, kategori, harga, opsi, dan status ketersediaan |
| `GET/PATCH/POST` | `/api/v1/owner/tables` & `/{id}/regenerate-qr` | Kelola 9 meja, cetak QR, aktif/nonaktifkan, dan cabut/ganti token QR |
| `GET/POST/PUT` | `/api/v1/owner/inventory` & `/ingredients` & `/recipes` | CRUD bahan baku, konversi satuan, resep produk, pembelian restock, dan stock opname |
| `GET` | `/api/v1/owner/finance/cash-flow` | Laporan Laba/Rugi operasional, HPP resep, pengeluaran, pembelian persediaan, dan posisi kas tanpa double-counting |
| `PATCH` | `/api/v1/owner/closings/{id}/review` | Tinjau dan kunci rekap penutupan kas (closing) |
| `GET/PATCH` | `/api/v1/owner/employee-reports` | Tinjau laporan harian karyawan dan beri catatan tindak lanjut |
| `GET` | `/api/v1/owner/ratings` | Ringkasan skor rating keseluruhan, distribusi bintang, dan komentar pelanggan |
| `GET` | `/api/v1/owner/analytics/traffic` | Analitik jam ramai/sepi, funnel scan QR vs order, performa produk, dan utilisasi 9 meja |
| `GET/POST` | `/api/v1/owner/settings` & `/employees` | Konfigurasi profil usaha, pajak PB1, WiFi, upload gambar QRIS resmi, dan tambah profil petugas shift |
| `GET` | `/api/v1/owner/audit-logs` | Jejak audit seluruh aksi sensitif |
| `GET` | `/api/v1/owner/exports` | Ekspor laporan CSV (`type=sales|expenses|inventory`) lengkap dengan metadata periode |

---

## 2. Panduan Konfigurasi & Deployment Produksi

### 2.1 Database Produksi (PostgreSQL)
Saat deploy ke server VPS / produksi, ubah konfigurasi database pada `apps/api/.env` ke PostgreSQL:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.warkopterasnenek.id

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=warkop_teras_nenek
DB_USERNAME=wtn_prod_user
DB_PASSWORD=GantiDenganPasswordKuat
```

Jalankan migrasi produksi:
```bash
cd apps/api
php artisan migrate --force
```

### 2.2 Checklist Data Operasional Go-Live (Diisi oleh Owner)
Sebelum sistem dipakai operasional nyata di Warkop Teras Nenek:
1. Login ke `/login` sebagai Owner, lalu segera ganti password default akun Owner dan akun bersama karyawan.
2. Buka `/owner/settings`:
   - Unggah gambar **QRIS Statis Resmi Warkop Teras Nenek** beserta Nama Merchant dan NMID asli.
   - Sesuaikan alamat, nomor kontak, SSID WiFi, dan persentase PB1.
   - Daftarkan nama petugas kasir/barista sebenarnya beserta PIN masing-masing.
3. Buka `/owner/inventory/ingredients` & `/owner/inventory/recipes`:
   - Sesuaikan stok awal fisik bahan baku melalui **Stock Opname** dan pastikan resep setiap produk tervalidasi.
4. Buka `/owner/tables`:
   - Klik **Ganti Token QR Baru** untuk ke-9 meja agar token demo tidak digunakan lagi, lalu klik **Cetak QR Stand Meja** dan tempelkan di Meja 1 s/d Meja 9.
