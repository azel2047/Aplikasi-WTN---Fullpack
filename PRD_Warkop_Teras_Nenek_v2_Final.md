# PRODUCT REQUIREMENTS DOCUMENT

## WARKOP TERAS NENEK

**Integrated QR Ordering, Cashier & Business Management System**

| | |
|---|---|
| **Versi** | 2.0, Final |
| **Status** | Baseline kebutuhan produk |
| **Platform** | Customer Website · Cashier Web App · Owner Dashboard |
| **Konsep UI/UX** | Rustic Modern |
| **Meja** | 9 meja dengan QR unik per meja |

Dokumen kebutuhan produk untuk membangun sistem pemesanan berbasis QR, operasional kasir, pengelolaan stok bahan, pencatatan keuangan, dan pemantauan performa usaha Warkop Teras Nenek.

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang dan Permasalahan](#2-latar-belakang-dan-permasalahan)
3. [Tujuan, Sasaran, dan Indikator Keberhasilan](#3-tujuan-sasaran-dan-indikator-keberhasilan)
4. [Ruang Lingkup Produk](#4-ruang-lingkup-produk)
5. [Pengguna dan Hak Akses](#5-pengguna-dan-hak-akses)
6. [Struktur Meja dan QR Ordering](#6-struktur-meja-dan-qr-ordering)
7. [Alur Pemesanan Customer](#7-alur-pemesanan-customer)
8. [Aplikasi Kasir dan Pengelolaan Pesanan](#8-aplikasi-kasir-dan-pengelolaan-pesanan)
9. [Pembayaran Cash dan QRIS](#9-pembayaran-cash-dan-qris)
10. [Manajemen Stok Berbasis Bahan](#10-manajemen-stok-berbasis-bahan)
11. [Keuangan, Arus Kas, dan Pengeluaran](#11-keuangan-arus-kas-dan-pengeluaran)
12. [Laporan Harian Karyawan](#12-laporan-harian-karyawan)
13. [Rating Customer](#13-rating-customer)
14. [Analitik Traffic dan Performa Usaha](#14-analitik-traffic-dan-performa-usaha)
15. [Owner Dashboard](#15-owner-dashboard)
16. [Prinsip UI/UX Rustic Modern](#16-prinsip-uiux-rustic-modern)
17. [Rekomendasi Arsitektur dan Teknologi](#17-rekomendasi-arsitektur-dan-teknologi)
18. [Struktur Data dan Entitas Database](#18-struktur-data-dan-entitas-database)
19. [Rancangan API](#19-rancangan-api)
20. [Keamanan dan Audit](#20-keamanan-dan-audit)
21. [Non-Functional Requirements](#21-non-functional-requirements)
22. [Laporan dan Ekspor Data](#22-laporan-dan-ekspor-data)
23. [Acceptance Criteria](#23-acceptance-criteria)
24. [Strategi Pengujian](#24-strategi-pengujian)
25. [Tahapan Implementasi](#25-tahapan-implementasi)
26. [Risiko dan Mitigasi](#26-risiko-dan-mitigasi)
27. [Ketentuan Go-Live](#27-ketentuan-go-live)

> **Catatan:** dokumen ini menjadi baseline kebutuhan. Detail harga, resep, saldo awal, identitas pegawai, dan akun QRIS resmi harus diisi berdasarkan kondisi operasional sebenarnya sebelum sistem digunakan.

---

## 1. Ringkasan Eksekutif

Warkop Teras Nenek membutuhkan sistem operasional terintegrasi yang menghubungkan pemesanan customer melalui QR Code di meja, aplikasi kasir untuk mengelola seluruh pesanan, serta dashboard owner untuk memantau penjualan dan kondisi usaha. Sistem dirancang sebagai aplikasi web responsif agar dapat digunakan melalui ponsel, tablet, maupun komputer tanpa instalasi aplikasi native.

Setiap dari 9 meja memiliki QR Code unik. Customer memindai QR untuk membuka menu dan membuat pesanan yang otomatis terhubung dengan nomor meja. Semua pesanan masuk ke aplikasi kasir. Pembayaran mendukung tunai dan QRIS. Sistem juga mengelola stok berdasarkan bahan baku dan resep, pengeluaran operasional, arus kas, laporan harian karyawan, rating keseluruhan, serta analitik jam ramai dan sepi.

**Prinsip utama:** satu sumber data untuk transaksi dan operasional, alur sesederhana mungkin bagi karyawan, serta laporan owner yang berdasarkan transaksi aktual. Notifikasi dan analitik tidak boleh menampilkan data simulasi sebagai fakta.

## 2. Latar Belakang dan Permasalahan

- Preferensi customer berbeda-beda sehingga setiap item pesanan perlu memiliki catatan khusus, misalnya tingkat gula, es, pedas, topping, atau instruksi penyajian.
- Owner membutuhkan laporan harian yang konsisten dari karyawan, bukan informasi yang tersebar di chat.
- Catatan pemasukan, pengeluaran, pembelian bahan, dan saldo kas perlu dipisahkan agar kondisi keuangan terbaca dengan benar.
- Stok perlu dihitung berdasarkan bahan baku yang benar-benar digunakan, bukan hanya status produk tersedia atau habis.
- Biaya operasional seperti listrik, gas, air, kebersihan, dan kebutuhan lain harus tercatat.
- Owner membutuhkan umpan balik customer melalui rating keseluruhan.
- Owner belum memiliki gambaran berbasis data mengenai jam ramai, jam sepi, dan pola kunjungan.

## 3. Tujuan, Sasaran, dan Indikator Keberhasilan

### Tujuan

- Mempercepat dan merapikan proses pemesanan melalui QR Code.
- Mengurangi kesalahan pencatatan pesanan dan memastikan catatan per item diteruskan ke kasir/dapur.
- Memusatkan seluruh pesanan pada satu aplikasi kasir.
- Meningkatkan akurasi stok bahan dan pencatatan keuangan.
- Menyediakan laporan operasional harian serta dashboard owner.

### Indikator keberhasilan

| Indikator | Target awal |
|---|---|
| QR ordering | QR pada seluruh 9 meja dapat membuka halaman meja yang benar. |
| Sinkronisasi pesanan | Pesanan baru tampil pada aplikasi kasir maksimal 5 detik pada kondisi jaringan normal. |
| Akurasi transaksi | Total pesanan, pembayaran, dan laporan harian konsisten. |
| Stok bahan | Pengurangan stok dilakukan berdasarkan resep yang sudah dikonfigurasi. |
| Kontrol stok | Stok tidak boleh menjadi negatif akibat transaksi normal. |
| Pelaporan | Laporan harian dapat dibuat dan ditinjau owner. |
| Analitik | Grafik jam ramai/sepi dihitung dari data transaksi aktual. |

## 4. Ruang Lingkup Produk

### Termasuk dalam ruang lingkup

- **Website customer:** akses menu melalui QR, pilihan produk/varian, catatan per item, keranjang, checkout, dan status pesanan.
- **Aplikasi kasir:** daftar pesanan, konfirmasi pembayaran, perubahan status pesanan, input pesanan langsung, dan penutupan transaksi.
- **Owner dashboard:** ringkasan penjualan, pesanan, stok, pengeluaran, arus kas, rating, laporan harian, serta analitik traffic.
- Manajemen 9 meja dan QR Code unik.
- Pembayaran cash dan QRIS dengan verifikasi pembayaran.
- Stok bahan baku, resep produk, mutasi stok, pembelian/restock, dan peringatan stok minimum.
- Laporan harian karyawan dan rating keseluruhan customer.

### Di luar ruang lingkup versi ini

- Aplikasi native Android/iOS.
- Integrasi payment gateway otomatis atau settlement bank otomatis.
- Akuntansi pajak lengkap, payroll, dan pembukuan perusahaan tingkat lanjut.
- Program loyalty, poin, voucher kompleks, dan CRM.
- Integrasi supplier otomatis atau pemesanan bahan ke pemasok.
- Multi-cabang dan multi-outlet.

## 5. Pengguna dan Hak Akses

| Peran | Akses utama | Batasan |
|---|---|---|
| Customer | Melihat menu, membuat pesanan, mengirim catatan item, melihat status, memberi rating. | Tidak dapat mengakses data internal atau pesanan meja lain. |
| Karyawan | Menggunakan satu akun karyawan bersama untuk mengelola pesanan dan aktivitas kasir. | Aksi penting dicatat dengan identitas petugas/shift yang dipilih. |
| Owner | Mengakses dashboard, laporan, keuangan, stok, menu, pengaturan, dan audit. | Akses penuh hanya untuk owner. |

**Ketentuan akun karyawan:** sistem menggunakan satu akun login bersama sesuai keputusan operasional. Untuk menjaga jejak tanggung jawab, saat memulai shift karyawan memilih identitasnya. Aksi sensitif, misalnya pembatalan transaksi, koreksi stok, atau pengeluaran, dapat meminta PIN konfirmasi. Sistem menyimpan actor/identitas shift pada audit log. Mekanisme ini meningkatkan akuntabilitas, tetapi tidak setara dengan akun individual.

### Hak akses ringkas

- Customer hanya mengakses sesi meja melalui token QR yang valid.
- Karyawan dapat mengelola antrean pesanan, pembayaran, status, dan laporan harian sesuai izin.
- Owner dapat melihat dan mengubah seluruh data bisnis serta mengelola konfigurasi.
- Perubahan harga, penghapusan data, refund, dan koreksi stok harus memiliki audit trail.

## 6. Struktur Meja dan QR Ordering

Sistem menyediakan tepat 9 meja aktif pada konfigurasi awal. Setiap meja memiliki kode meja dan QR token unik yang tidak mudah ditebak.

| Kode | Nama tampilan | QR |
|---|---|---|
| TBL-01 | Meja 1 | QR unik dan dapat dicetak |
| TBL-02 | Meja 2 | QR unik dan dapat dicetak |
| TBL-03 | Meja 3 | QR unik dan dapat dicetak |
| TBL-04 | Meja 4 | QR unik dan dapat dicetak |
| TBL-05 | Meja 5 | QR unik dan dapat dicetak |
| TBL-06 | Meja 6 | QR unik dan dapat dicetak |
| TBL-07 | Meja 7 | QR unik dan dapat dicetak |
| TBL-08 | Meja 8 | QR unik dan dapat dicetak |
| TBL-09 | Meja 9 | QR unik dan dapat dicetak |

- QR mengarah ke URL customer dengan token acak; nomor meja tidak boleh hanya mengandalkan parameter yang mudah diubah.
- Owner/kasir dapat mengaktifkan, menonaktifkan, atau mencetak ulang QR.
- QR yang dicabut atau diganti tidak boleh membuka sesi baru.
- Customer yang memindai QR akan masuk ke sesi meja aktif atau membuat sesi baru sesuai aturan operasional.
- Satu sesi meja dapat memiliki beberapa order. Setiap order tetap memiliki identitas transaksi dan pembayaran sendiri pada versi ini.
- Penutupan sesi meja dilakukan ketika seluruh order dalam sesi sudah selesai dan tidak ada kewajiban pembayaran tersisa.

## 7. Alur Pemesanan Customer

### Alur utama

1. Customer memindai QR pada meja.
2. Website membuka halaman menu dengan konteks meja yang tervalidasi.
3. Customer memilih kategori, produk, jumlah, varian, dan opsi tambahan.
4. Customer mengisi catatan khusus untuk setiap item, maksimal 250 karakter per item.
5. Customer meninjau keranjang dan total pesanan.
6. Customer memilih metode pembayaran cash atau QRIS.
7. Pesanan dikirim ke aplikasi kasir dan memperoleh nomor order.
8. Customer dapat melihat status pesanan sampai selesai.

### Ketentuan catatan item

- Catatan melekat pada baris item, bukan hanya pada keseluruhan order.
- Contoh: 'es sedikit', 'gula 50%', 'sambal dipisah', atau 'tanpa bawang'.
- Catatan ditampilkan jelas pada detail pesanan kasir dan tampilan persiapan.
- Catatan tidak boleh hilang ketika order diperbarui atau status berubah.
- Jika customer mengubah item setelah order dikonfirmasi, perubahan harus melalui persetujuan kasir.

### Status order

| Status | Makna |
|---|---|
| `PENDING_PAYMENT` | Pesanan dibuat dan menunggu pembayaran/konfirmasi. |
| `CONFIRMED` | Pembayaran diterima atau pesanan tunai disetujui kasir. |
| `PREPARING` | Pesanan sedang dibuat. |
| `READY` | Pesanan siap disajikan/diambil. |
| `COMPLETED` | Pesanan telah diserahkan atau selesai. |
| `CANCELLED` | Pesanan dibatalkan dengan alasan dan jejak audit. |

## 8. Aplikasi Kasir dan Pengelolaan Pesanan

- Menampilkan antrean pesanan baru, pesanan berjalan, siap disajikan, selesai, dan dibatalkan.
- Menampilkan nomor order, meja, waktu, daftar item, jumlah, varian, catatan item, total, dan status pembayaran.
- Kasir dapat menerima/menolak pesanan dengan alasan yang tercatat.
- Kasir dapat memperbarui status pesanan sesuai alur.
- Kasir dapat membuat pesanan langsung dari POS untuk customer yang tidak menggunakan QR.
- Kasir dapat mencari transaksi berdasarkan nomor order, tanggal, atau meja.
- Perubahan status disimpan dalam riwayat dengan waktu dan identitas petugas.
- Antrean diperbarui secara realtime; polling menjadi fallback bila koneksi realtime terputus.

Semua order, baik dari QR maupun input langsung, dikelola melalui aplikasi kasir. Tidak ada sistem pesanan terpisah yang membuat karyawan harus memantau banyak perangkat.

## 9. Pembayaran Cash dan QRIS

### Cash

- Kasir memilih pembayaran tunai dan memasukkan nominal uang yang diterima.
- Sistem menghitung kembalian secara otomatis.
- Transaksi tidak dapat ditandai lunas bila nominal diterima kurang dari total tagihan.
- Pembayaran tunai tercatat pada akun kas yang sesuai.

### QRIS

- Customer melihat QRIS statis resmi milik usaha.
- Customer melakukan pembayaran melalui aplikasi pembayaran masing-masing.
- Customer dapat mengunggah bukti pembayaran jika alur ini diaktifkan.
- Kasir memverifikasi pembayaran terhadap notifikasi/riwayat merchant atau bukti settlement yang dapat dipercaya.
- Unggahan gambar saja tidak otomatis membuktikan dana telah diterima.
- Kasir menandai lunas setelah verifikasi dan sistem menyimpan petugas serta waktu verifikasi.

### Status pembayaran

| Status pembayaran | Deskripsi |
|---|---|
| `UNPAID` | Belum dibayar. |
| `PROOF_UPLOADED` | Bukti pembayaran diunggah customer. |
| `VERIFYING` | Sedang diperiksa kasir. |
| `PAID` | Pembayaran terverifikasi. |
| `REJECTED` | Pembayaran/bukti ditolak; alasan wajib dicatat. |
| `REFUNDED` | Dana telah dikembalikan dan dicatat. |

> **Penting:** QRIS statis pada versi ini bukan integrasi otomatis. Sistem tidak boleh menganggap pembayaran berhasil hanya karena customer menekan tombol 'sudah bayar'.

## 10. Manajemen Stok Berbasis Bahan

Stok dihitung pada tingkat bahan baku. Produk menu terhubung ke resep yang menentukan jumlah bahan yang digunakan untuk setiap porsi.

### Data bahan baku

- Nama bahan, kategori, satuan dasar, stok saat ini, batas minimum, harga beli terakhir/rata-rata, dan status aktif.
- Satuan harus konsisten; konversi satuan seperti kilogram ke gram atau liter ke mililiter harus didefinisikan.
- Setiap bahan memiliki histori mutasi stok.

### Resep produk

- Setiap produk dapat memiliki satu atau lebih komponen resep.
- Resep menentukan kuantitas bahan untuk satu unit produk.
- Owner dapat mengubah resep dan menyimpan histori perubahan.
- Produk yang belum memiliki resep tidak boleh mengurangi stok bahan secara otomatis.

### Pengurangan dan koreksi stok

- Stok dikurangi ketika order dikonfirmasi sesuai kebijakan final yang ditetapkan saat implementasi; rekomendasi: setelah pembayaran terverifikasi/diterima.
- Pengurangan dilakukan secara atomik agar dua transaksi bersamaan tidak membuat stok minus.
- Jika stok bahan tidak mencukupi, sistem memberi peringatan dan mencegah konfirmasi item yang membutuhkan bahan tersebut, kecuali owner mengizinkan override tercatat.
- Pembatalan setelah bahan terpakai harus menggunakan prosedur penyesuaian/retur yang tercatat, bukan menghapus histori.
- Stock opname mencatat stok sistem, stok fisik, selisih, alasan, dan petugas.

### Pembelian/restock

- Kasir/owner dapat mencatat pembelian bahan: pemasok (opsional), tanggal, bahan, kuantitas, harga, total, dan bukti.
- Restock menambah stok melalui inventory movement.
- Pembelian stok dicatat sebagai arus kas keluar/pembelian persediaan; tidak otomatis dianggap seluruhnya sebagai HPP.

## 11. Keuangan, Arus Kas, dan Pengeluaran

### Pemasukan

- Penjualan tercatat dari order yang telah dibayar.
- Metode pembayaran dan akun penerimaan dibedakan: kas tunai dan QRIS/bank.
- Pembatalan, refund, diskon, dan koreksi transaksi memiliki catatan tersendiri.

### Pengeluaran operasional

- Kategori contoh: listrik, gas, air, kebersihan, transportasi, perawatan, perlengkapan, dan biaya lain.
- Setiap pengeluaran menyimpan tanggal, kategori, nominal, deskripsi, metode pembayaran, petugas, serta bukti opsional.
- Pengeluaran berulang dapat diberi pengingat, tetapi tetap perlu dikonfirmasi saat benar-benar dibayar.

### Konsep keuangan yang wajib dibedakan

| Komponen | Perlakuan |
|---|---|
| Penjualan | Pendapatan dari order yang telah dibayar, setelah memperhitungkan diskon/refund. |
| Pembelian persediaan | Arus kas keluar untuk menambah stok bahan. |
| HPP/COGS | Biaya bahan yang benar-benar dikonsumsi untuk produk terjual, berdasarkan resep dan metode biaya. |
| Biaya operasional | Biaya usaha selain bahan yang menjadi HPP, misalnya listrik dan gas operasional. |
| Saldo kas | Uang yang tersedia pada akun kas/bank; bukan sinonim laba. |
| Laba/rugi operasional | Pendapatan dikurangi HPP dan biaya operasional pada periode yang sama. |

Sistem harus mencegah double-counting: pembelian bahan tidak boleh sekaligus dicatat penuh sebagai HPP bila bahan tersebut masih menjadi persediaan. Perhitungan HPP membutuhkan data resep dan harga bahan yang memadai.

### Penutupan kas

- Kasir dapat melakukan rekap per shift/hari: saldo awal, pemasukan cash, pengeluaran cash, refund, saldo seharusnya, dan saldo fisik.
- Selisih kas dicatat beserta alasan.
- Owner dapat meninjau dan mengunci closing agar tidak berubah tanpa koreksi yang tercatat.

## 12. Laporan Harian Karyawan

Satu laporan harian dikirim untuk operasional hari tersebut. Sistem dapat mengisi otomatis angka transaksi dan karyawan melengkapi kondisi lapangan.

- Tanggal dan shift, identitas karyawan yang bertugas, serta waktu pengiriman.
- Ringkasan transaksi otomatis: jumlah order, omzet, metode pembayaran, pembatalan, dan refund.
- Kondisi usaha: ramai, normal, atau sepi.
- Kondisi stok: bahan menipis, habis, atau aman.
- Kendala operasional: peralatan, pelayanan, kebersihan, supplier, atau masalah lain.
- Pengeluaran harian yang belum tercatat, catatan tambahan, dan lampiran bukti opsional.
- Status laporan: `draft`, `submitted`, `reviewed`, atau `needs_revision`.
- Owner dapat memberi catatan tindak lanjut.

## 13. Rating Customer

- Customer dapat memberi rating keseluruhan 1-5 bintang setelah order berstatus `COMPLETED`.
- Satu rating per order; customer tidak dapat mengirim rating berulang untuk order yang sama.
- Komentar bersifat opsional.
- Owner melihat rata-rata rating, jumlah rating, distribusi bintang, tren, dan komentar.
- Rating tidak dipecah per produk pada versi ini.
- Rating harus dikaitkan dengan order valid untuk mengurangi spam.

## 14. Analitik Traffic dan Performa Usaha

Analitik membantu owner memahami pola kunjungan dan penjualan. Sistem membedakan aktivitas scan QR, order dibuat, order dibayar, dan order selesai agar traffic tidak disamakan dengan omzet.

### Metrik

- Jumlah scan/kunjungan menu per jam dan hari, jika event analytics diaktifkan.
- Jumlah order dibuat, dibayar, selesai, dan dibatalkan.
- Omzet per jam, hari, dan periode.
- Jam ramai dan sepi berdasarkan jumlah order atau transaksi.
- Rata-rata nilai transaksi (average order value).
- Performa produk berdasarkan kuantitas dan omzet.
- Pemanfaatan meja dan durasi sesi meja, jika pencatatan sesi digunakan konsisten.
- Perbandingan hari kerja dan akhir pekan.

### Aturan interpretasi

- Jam ramai/sepi harus dihitung dari data aktual, bukan angka dummy.
- Jika data belum cukup, tampilkan label 'data belum cukup' dan rentang tanggal yang tersedia.
- Scan QR tidak selalu berarti ada customer yang datang; metrik scan adalah indikator minat, bukan jumlah pengunjung pasti.
- Owner dapat memilih rentang tanggal dan membandingkan periode.

## 15. Owner Dashboard

| Modul | Informasi/fungsi utama |
|---|---|
| Overview | Omzet hari ini, jumlah order, rata-rata transaksi, status operasional, dan ringkasan tren. |
| Pesanan | Daftar transaksi, pencarian, detail, status, pembatalan, dan refund. |
| Menu | Kategori, produk, harga, foto, varian, opsi, status tersedia, dan resep. |
| Meja & QR | 9 meja, status aktif, token QR, cetak/unduh QR, dan penggantian QR. |
| Inventory | Bahan baku, resep, stok minimum, mutasi, pembelian, dan stock opname. |
| Keuangan | Pemasukan, pengeluaran, akun kas, arus kas, closing, dan ringkasan laba/rugi. |
| Laporan karyawan | Laporan harian, status review, kendala, dan tindak lanjut. |
| Rating | Rata-rata rating, distribusi bintang, komentar, dan tren. |
| Analitik | Jam ramai/sepi, order per jam, performa produk, dan tren periode. |
| Pengaturan | Profil usaha, akun, metode pembayaran, kategori, dan konfigurasi sistem. |
| Audit log | Riwayat aksi penting, perubahan data, pembatalan, koreksi stok, dan refund. |

## 16. Prinsip UI/UX Rustic Modern

Arah visual Rustic Modern menggabungkan nuansa hangat, natural, sederhana, dan tetap modern. Tampilan harus terasa seperti identitas warkop, bukan template dashboard generik.

### Palet warna

| Token | Warna | Penggunaan |
|---|---|---|
| Espresso Brown | `#3B2922` | Warna utama, navigasi, judul. |
| Dark Walnut | `#5A4032` | Aksen dan elemen sekunder. |
| Warm Cream | `#F6F0E6` | Latar utama dan area konten. |
| Sand Beige | `#D9C5AA` | Border, permukaan lembut, pemisah. |
| Terracotta | `#B76E4B` | Aksi utama dan highlight terukur. |
| Olive | `#69735A` | Status positif/elemen natural. |
| Charcoal | `#292724` | Teks utama. |

### Tipografi dan komponen

- Gunakan Plus Jakarta Sans, Inter, atau DM Sans dengan hierarki yang jelas.
- Utamakan keterbacaan pada layar ponsel untuk customer dan kasir.
- Gunakan foto menu yang konsisten, tombol besar, status pesanan yang mudah dipahami, serta form singkat.
- Dashboard owner mengutamakan informasi penting dan grafik yang mudah dibaca.
- Hindari glow, glassmorphism berlebihan, neon, gradient mencolok, dekorasi yang mengganggu, dan terlalu banyak kartu.
- Komponen harus konsisten: button, input, modal, tabel, badge status, empty state, loading, error, dan konfirmasi aksi.

### Daftar layar minimum

| Area | Layar |
|---|---|
| Customer | Landing/menu meja, kategori, detail produk, opsi/catatan item, keranjang, checkout, instruksi QRIS, status pesanan, rating. |
| Kasir | Login, pilih identitas shift, dashboard antrean, detail order, verifikasi pembayaran, POS manual, riwayat transaksi, input pengeluaran, laporan harian, closing kas. |
| Owner | Login, overview, pesanan, detail transaksi, menu/kategori, meja & QR, bahan baku, resep, pembelian, stock opname, keuangan, laporan karyawan, rating, analitik, pengaturan, audit log. |

## 17. Rekomendasi Arsitektur dan Teknologi

Arsitektur yang disarankan adalah frontend web responsif yang berkomunikasi dengan backend REST API. Backend menjadi sumber kebenaran untuk transaksi, pembayaran, stok, dan laporan.

| Lapisan | Teknologi rekomendasi | Catatan |
|---|---|---|
| Customer & Owner UI | Next.js + TypeScript | Website responsif; dapat memakai satu codebase dengan route dan layout terpisah. |
| Cashier UI | Next.js + TypeScript | Mode operasional dengan tampilan antrean yang ringkas. |
| Styling | Tailwind CSS | Design tokens Rustic Modern dan komponen reusable. |
| Backend API | Laravel | Validasi bisnis, autentikasi, transaksi database, dan API versioning. |
| Database | PostgreSQL | Relasi transaksi, stok, keuangan, dan laporan. |
| Auth | Laravel Sanctum | Session/token sesuai kebutuhan web dan API. |
| Realtime | Laravel Reverb | Update order dan status; sediakan polling fallback. |
| Queue | Laravel Queue | Notifikasi, ekspor, dan pekerjaan latar belakang. |
| Chart | Recharts | Grafik owner dashboard. |
| Storage | Private object storage | Bukti pembayaran dan lampiran laporan; akses melalui URL sementara. |
| Deployment | VPS + Nginx + HTTPS | Backup terjadwal, monitoring, dan environment terpisah. |

Stack di atas adalah rekomendasi implementasi, bukan ketergantungan mutlak. Pemilihan akhir perlu mempertimbangkan kemampuan tim, biaya hosting, dan kebutuhan pemeliharaan.

## 18. Struktur Data dan Entitas Database

| Kelompok | Entitas utama | Keterangan |
|---|---|---|
| Akun & audit | `users`, `employee_profiles`, `employee_sessions`, `audit_logs` | Owner, akun bersama karyawan, identitas shift, dan jejak aktivitas. |
| Meja | `dining_tables`, `table_sessions` | Meja, QR token, dan sesi meja. |
| Menu | `categories`, `products`, `product_options`, `product_option_values` | Kategori, produk, varian, dan opsi. |
| Order | `orders`, `order_items`, `order_item_options`, `order_status_histories` | Transaksi dan catatan per item. |
| Pembayaran | `payments`, `cash_accounts`, `cash_transactions` | Pembayaran per order dan arus kas. |
| Inventory | `ingredient_categories`, `ingredients`, `recipes`, `recipe_items`, `inventory_movements`, `stock_adjustments` | Bahan, resep, mutasi, dan koreksi stok. |
| Pembelian | `stock_purchases`, `stock_purchase_items` | Restock dan harga pembelian. |
| Keuangan | `expense_categories`, `expenses`, `cash_closings` | Pengeluaran dan penutupan kas. |
| Laporan | `employee_reports`, `employee_report_attachments` | Laporan harian dan lampiran. |
| Rating | `ratings` | Satu rating keseluruhan per order. |
| Sistem | `notifications`, `system_settings` | Notifikasi dan konfigurasi. |

### Aturan relasi dan integritas

- Setiap order terhubung ke `table_session` atau ditandai sebagai order non-meja dari POS.
- Setiap order memiliki satu atau lebih `order_items`.
- Setiap `order_item` menyimpan snapshot nama produk, harga, opsi, dan catatan saat transaksi agar histori tidak berubah ketika menu diedit.
- Pembayaran pada versi ini melekat pada order; beberapa order dalam satu sesi meja dapat dibayar terpisah.
- Setiap inventory movement menyimpan sumber transaksi, bahan, kuantitas masuk/keluar, saldo sebelum/sesudah, waktu, dan actor.
- Setiap perubahan resep berlaku ke transaksi mendatang; transaksi lampau mempertahankan snapshot pemakaian bahan jika dibutuhkan untuk audit.
- Nilai uang disimpan dalam tipe decimal/integer rupiah yang konsisten, bukan floating point.

## 19. Rancangan API

Semua endpoint menggunakan prefix `/api/v1`. Endpoint di bawah merupakan rancangan awal dan dapat disesuaikan saat desain teknis.

| Area | Endpoint contoh | Fungsi |
|---|---|---|
| Customer | `GET /public/tables/{token}/menu` | Validasi QR dan mengambil menu. |
| Customer | `POST /public/orders` | Membuat order beserta item, opsi, dan catatan. |
| Customer | `GET /public/orders/{public_code}` | Melihat status order. |
| Customer | `POST /public/orders/{id}/rating` | Mengirim rating setelah order selesai. |
| Kasir | `GET /cashier/orders` | Mengambil antrean order. |
| Kasir | `PATCH /cashier/orders/{id}/status` | Mengubah status order. |
| Kasir | `POST /cashier/orders/{id}/payments` | Mencatat/verifikasi pembayaran. |
| Kasir | `POST /cashier/pos/orders` | Membuat order langsung dari kasir. |
| Kasir | `POST /cashier/reports/daily` | Mengirim laporan harian. |
| Owner | `GET /owner/dashboard` | Ringkasan dashboard. |
| Owner | `CRUD /owner/products` | Mengelola produk dan kategori. |
| Owner | `CRUD /owner/ingredients` | Mengelola bahan baku. |
| Owner | `CRUD /owner/recipes` | Mengelola resep. |
| Owner | `GET /owner/finance/cash-flow` | Mengambil arus kas. |
| Owner | `GET /owner/analytics/traffic` | Mengambil analitik traffic. |

API harus menerapkan validasi request, pagination, filter tanggal, format error konsisten, rate limiting untuk endpoint publik, dan otorisasi per role.

## 20. Keamanan dan Audit

- Semua akses internal menggunakan HTTPS.
- Password disimpan dengan hashing yang aman; jangan pernah menyimpan password plaintext.
- Token QR menggunakan nilai acak yang sulit ditebak, dapat dicabut, dan tidak memuat data sensitif.
- Endpoint customer hanya mengembalikan data publik milik order tersebut.
- Validasi harga dan total dilakukan di backend; frontend tidak dipercaya sebagai sumber nominal.
- Pembayaran QRIS harus diverifikasi oleh kasir; bukti upload tidak otomatis mengubah status menjadi `PAID`.
- Upload file membatasi tipe, ukuran, dan nama file; file privat tidak boleh dapat diakses publik tanpa otorisasi.
- Gunakan database transaction untuk konfirmasi order, pembayaran, dan pengurangan stok.
- Catat audit log untuk perubahan harga, status, refund, pengeluaran, resep, stok, dan konfigurasi QR.
- Backup database secara berkala dan uji proses restore.
- Gunakan proteksi CSRF/session sesuai mekanisme autentikasi dan rate limiting untuk login.

## 21. Non-Functional Requirements

| Aspek | Target awal |
|---|---|
| Performa menu | Halaman menu dapat digunakan dalam ≤3 detik pada koneksi normal. |
| Performa API | API operasional umum p95 ≤800 ms pada beban awal yang disepakati. |
| Realtime | Order baru tampil pada kasir ≤5 detik pada jaringan normal. |
| Ketersediaan | Target awal availability bulanan 99%, di luar pemeliharaan terjadwal. |
| Responsif | Customer mendukung ponsel; kasir dan owner mendukung tablet/desktop. |
| Keandalan transaksi | Tidak boleh ada pembayaran ganda atau pengurangan stok ganda akibat retry. |
| Backup | Backup database harian dan prosedur restore terdokumentasi. |
| Audit | Aksi sensitif memiliki actor, timestamp, objek, dan nilai perubahan. |
| Aksesibilitas | Kontras teks memadai, ukuran target sentuh nyaman, dan label form jelas. |

## 22. Laporan dan Ekspor Data

- Laporan penjualan harian, mingguan, bulanan, dan rentang tanggal.
- Rincian transaksi berdasarkan metode pembayaran, status, dan meja.
- Rekap pengeluaran berdasarkan kategori.
- Rekap stok bahan, mutasi, pembelian, dan hasil stock opname.
- Ringkasan HPP dan laba/rugi berdasarkan data resep dan harga bahan yang tersedia.
- Laporan harian karyawan dan rating customer.
- Ekspor PDF, CSV, dan XLSX untuk laporan yang relevan.
- Setiap ekspor mencantumkan periode, waktu pembuatan, dan filter yang digunakan.

## 23. Acceptance Criteria

- **AC-01:** Sistem menyediakan 9 meja aktif dengan identitas unik.
- **AC-02:** Setiap meja memiliki QR token unik yang dapat dicetak.
- **AC-03:** QR yang tidak valid atau dicabut tidak dapat membuat order.
- **AC-04:** Customer dapat melihat menu dari QR tanpa login.
- **AC-05:** Customer dapat memilih produk, jumlah, varian, dan opsi.
- **AC-06:** Catatan dapat disimpan per item dengan batas 250 karakter.
- **AC-07:** Catatan item tampil utuh pada detail order kasir.
- **AC-08:** Customer dapat mengirim order dan menerima kode order.
- **AC-09:** Order QR dan POS masuk ke satu antrean kasir.
- **AC-10:** Kasir dapat mengubah status sesuai alur yang diizinkan.
- **AC-11:** Riwayat perubahan status tersimpan.
- **AC-12:** Pembayaran cash menghitung kembalian dengan benar.
- **AC-13:** Pembayaran QRIS tidak otomatis lunas hanya karena bukti diunggah.
- **AC-14:** Kasir dapat memverifikasi atau menolak bukti pembayaran dengan alasan.
- **AC-15:** Owner dapat membuat dan mengubah data bahan baku.
- **AC-16:** Owner dapat mengatur resep per produk.
- **AC-17:** Produk tanpa resep tidak mengurangi stok bahan otomatis.
- **AC-18:** Pengurangan stok dilakukan satu kali untuk transaksi yang sah.
- **AC-19:** Stok tidak menjadi negatif melalui proses transaksi normal.
- **AC-20:** Mutasi stok menyimpan sumber dan actor.
- **AC-21:** Pembelian bahan menambah stok dan tercatat sebagai arus kas keluar.
- **AC-22:** Pengeluaran operasional dapat dicatat per kategori.
- **AC-23:** Dashboard membedakan penjualan, pembelian persediaan, HPP, biaya, dan saldo kas.
- **AC-24:** Laporan harian dapat dikirim satu kali per tanggal/shift sesuai aturan.
- **AC-25:** Angka transaksi pada laporan harian berasal dari data sistem.
- **AC-26:** Owner dapat meninjau laporan harian.
- **AC-27:** Customer dapat memberi rating 1-5 setelah order selesai.
- **AC-28:** Satu order hanya dapat memiliki satu rating.
- **AC-29:** Owner dapat melihat ringkasan rating keseluruhan.
- **AC-30:** Owner dapat melihat jumlah order dan omzet per jam/hari.
- **AC-31:** Analitik menampilkan periode data dan tidak mengarang data historis.
- **AC-32:** Owner dapat melihat daftar 9 meja dan status QR.
- **AC-33:** Hak akses customer, karyawan, dan owner dibatasi sesuai role.
- **AC-34:** Aksi sensitif tercatat pada audit log.
- **AC-35:** Laporan utama dapat diekspor sesuai format yang disediakan.

## 24. Strategi Pengujian

| Jenis tes | Fokus |
|---|---|
| Unit test | Perhitungan total, diskon, kembalian, resep, konversi satuan, dan validasi. |
| Integration test | Pembuatan order, pembayaran, pengurangan stok, mutasi, refund, dan closing. |
| End-to-end | Scan QR → pilih menu → checkout → kasir → pembayaran → selesai → rating. |
| Concurrency | Dua order bersamaan yang memakai bahan baku terbatas. |
| Security | Manipulasi harga, akses order lain, token QR, upload file, dan otorisasi. |
| Usability | Customer di ponsel dan kasir pada kondisi operasional nyata. |
| Recovery | Backup, restore, koneksi terputus, retry, dan pencegahan transaksi ganda. |

## 25. Tahapan Implementasi

| Fase | Fokus pekerjaan | Hasil |
|---|---|---|
| 1. Fondasi | Setup repository, database, auth, role, design system, konfigurasi usaha. | Fondasi aplikasi dan UI kit. |
| 2. Menu & QR | Meja, token QR, kategori, produk, opsi, halaman customer. | Customer dapat membuat order dari QR. |
| 3. Kasir & transaksi | Antrean, POS manual, status, cash, QRIS manual verification. | Siklus transaksi berjalan end-to-end. |
| 4. Inventory | Bahan baku, satuan, resep, mutasi, pembelian, stock opname. | Stok berbasis bahan berfungsi. |
| 5. Keuangan | Pengeluaran, akun kas, cash flow, closing, ringkasan laba/rugi. | Keuangan operasional tercatat. |
| 6. Laporan & rating | Laporan harian karyawan, review owner, rating customer. | Kontrol operasional dan feedback. |
| 7. Analitik | Grafik jam, tren order, produk, meja, dan periode. | Dashboard owner berbasis data aktual. |
| 8. QA & go-live | UAT, security, backup, training, migrasi menu/resep, cetak QR. | Sistem siap digunakan. |

## 26. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Resep belum lengkap | Stok otomatis tidak akurat. | Validasi resep sebelum fitur pengurangan stok diaktifkan. |
| QRIS statis sulit diverifikasi otomatis | Status pembayaran bisa salah. | Verifikasi manual oleh kasir terhadap kanal merchant. |
| Akun karyawan bersama | Sulit menelusuri pelaku aksi. | Pilih identitas shift, PIN aksi sensitif, audit log. |
| Internet terputus | Order/status terlambat tersinkron. | Polling fallback, indikator koneksi, prosedur operasional sementara. |
| Data analitik masih sedikit | Kesimpulan jam ramai belum kuat. | Tampilkan rentang data dan label data belum cukup. |
| Harga bahan berubah | HPP tidak akurat. | Simpan histori harga pembelian dan metode biaya yang konsisten. |
| Input pengeluaran terlewat | Arus kas tidak lengkap. | Form singkat, laporan harian, dan review owner. |

## 27. Ketentuan Go-Live

Sebelum sistem digunakan secara resmi, owner perlu menyiapkan dan memvalidasi data operasional berikut:

- Daftar menu final: nama, kategori, deskripsi, harga, foto, opsi, dan status tersedia.
- Daftar bahan baku: nama, satuan, stok fisik awal, batas minimum, dan harga beli.
- Resep untuk setiap produk yang akan memakai pengurangan stok otomatis.
- Daftar identitas karyawan untuk pemilihan shift pada akun bersama.
- QRIS resmi milik Warkop Teras Nenek dan prosedur verifikasi pembayaran.
- Saldo awal setiap akun kas/bank.
- Kategori pengeluaran dan aturan penutupan kas.
- Cetakan QR untuk 9 meja dan uji scan di lokasi.
- Pelatihan kasir dan simulasi transaksi dari awal sampai akhir.

Fitur analitik traffic akan semakin bermakna setelah terkumpul beberapa minggu data operasional. Jangan menggunakan data dummy untuk menyimpulkan jam ramai/sepi atau mengambil keputusan bisnis.

Urutan implementasi yang disarankan: selesaikan pemesanan customer dan kasir terlebih dahulu, lanjutkan inventory dan keuangan, kemudian laporan harian, rating, dan analitik owner.

---

## Definisi Produk Akhir

Warkop Teras Nenek memiliki satu sistem terintegrasi yang memungkinkan customer memesan melalui QR unik di 9 meja, karyawan mengelola seluruh transaksi melalui satu aplikasi kasir, dan owner memantau operasional melalui dashboard. Sistem mendukung catatan per item, pembayaran cash dan QRIS, stok bahan berbasis resep, pengeluaran, arus kas, laporan harian, rating keseluruhan, serta analitik traffic berdasarkan data aktual.

Keberhasilan implementasi tidak hanya diukur dari aplikasi yang dapat dibuka, tetapi dari konsistensi transaksi, akurasi stok, keterlacakan aktivitas karyawan, dan laporan yang benar-benar dapat dipakai owner untuk mengambil keputusan.
