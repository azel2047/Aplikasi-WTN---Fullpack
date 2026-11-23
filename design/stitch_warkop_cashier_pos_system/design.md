name: Warkop Teras Nenek description: Sistem QR ordering, kasir, dan dashboard owner dengan arah visual Rustic Modern (hangat, natural, sederhana) dan sentuhan Soft UI yang ringan. colors: primary: "#A3593A" on-primary: "#FFFCF7" primary-hover: "#8F4C31" primary-subtle: "#F3DDD0" on-primary-subtle: "#7A3F27" accent: "#B76E4B" secondary: "#5A4032" on-secondary: "#F6F0E6" background: "#F6F0E6" on-background: "#292724" surface: "#FFFCF7" on-surface: "#292724" surface-variant: "#EFE6D8" on-surface-variant: "#5A4032" nav: "#3B2922" on-nav: "#F6F0E6" on-nav-muted: "#B3A08C" text-primary: "#292724" text-secondary: "#5A4032" text-muted: "#7A6757" border: "#D9C5AA" border-strong: "#9C8570" success: "#556048" on-success: "#FFFCF7" success-subtle: "#E4E8DA" warning: "#7A5A0A" warning-subtle: "#F6E7BF" error: "#B3402E" on-error: "#FFFCF7" error-subtle: "#F5DAD3" on-error-subtle: "#8F3D2E" typography: h1: fontFamily: "Plus Jakarta Sans" fontSize: 2rem fontWeight: 700 lineHeight: 1.25 letterSpacing: -0.01em h2: fontFamily: "Plus Jakarta Sans" fontSize: 1.5rem fontWeight: 700 lineHeight: 1.33 title: fontFamily: "Plus Jakarta Sans" fontSize: 1.25rem fontWeight: 600 lineHeight: 1.2 body-md: fontFamily: "Plus Jakarta Sans" fontSize: 1rem fontWeight: 400 lineHeight: 1.5 label-md: fontFamily: "Plus Jakarta Sans" fontSize: 0.875rem fontWeight: 600 lineHeight: 1.43 caption: fontFamily: "Plus Jakarta Sans" fontSize: 0.75rem fontWeight: 500 lineHeight: 1.33 rounded: sm: 8px md: 12px lg: 20px full: 9999px spacing: xs: 4px sm: 8px md: 12px lg: 16px xl: 24px 2xl: 32px 3xl: 48px components: button-primary: backgroundColor: "{colors.primary}" textColor: "{colors.on-primary}" rounded: "{rounded.md}" height: 48px padding: "12px 24px" button-primary-hover: backgroundColor: "{colors.primary-hover}" button-secondary: backgroundColor: "{colors.surface}" textColor: "{colors.text-primary}" rounded: "{rounded.md}" height: 48px card: backgroundColor: "{colors.surface}" rounded: "{rounded.lg}" padding: "{spacing.md}" card-image: rounded: "{rounded.sm}" input: backgroundColor: "{colors.surface}" textColor: "{colors.text-primary}" rounded: "{rounded.md}" height: 48px padding: "12px 16px" chip: backgroundColor: "{colors.surface-variant}" textColor: "{colors.on-surface-variant}" rounded: "{rounded.full}" height: 40px chip-selected: backgroundColor: "{colors.nav}" textColor: "{colors.on-nav}" sidebar: backgroundColor: "{colors.nav}" textColor: "{colors.on-nav}"
Overview
Warkop Teras Nenek adalah warung kopi hangat dengan identitas yang terasa lokal, bukan template dashboard generik. Antarmuka dipakai kasir dan karyawan di tablet atau ponsel dalam kondisi sibuk, jadi prioritasnya keterbacaan, target sentuh besar, dan status yang jelas sekilas. Nuansanya hangat, natural, dan sederhana, dengan sentuhan Soft UI yang sangat ringan (card terang di atas canvas krem, shadow lembut). Semua teks antarmuka berbahasa Indonesia.
Colors
Struktur 3 tingkat. Primitive adalah warna mentah dari palet PRD (Espresso #3B2922, Dark Walnut #5A4032, Warm Cream #F6F0E6, Sand Beige #D9C5AA, Terracotta #B76E4B, Olive #69735A, Charcoal #292724). Semantic adalah token di frontmatter, dinamai menurut fungsi. Component memakai semantic lewat referensi {colors.*}.


primary (#A3593A) adalah Terracotta yang digelapkan agar teks on-primary lolos 4,5:1. Dipakai untuk satu aksi utama per layar (Bayar, Tandai Lunas, Mulai Proses).

accent (#B76E4B, Terracotta asli) hanya untuk ikon, indikator aktif, dan elemen grafis. Tidak untuk teks kecil karena kontrasnya di bawah AA.

nav (Espresso) untuk sidebar dan chip terpilih. background (Warm Cream) untuk canvas, surface (#FFFCF7, putih hangat) untuk card.

text-muted hanya di atas background atau surface. Di atas surface-variant pakai text-secondary.

Status selalu memakai pasangan warna + teks + ikon, tidak pernah warna saja. success (Olive yang digelapkan), warning, error, masing-masing punya varian -subtle untuk latar badge.

Tidak pernah memakai #000000 atau #FFFFFF sebagai background atau teks utama.
Typography
Plus Jakarta Sans untuk semua level. Skala dense product UI dengan rasio sekitar 1,2-1,33. Body 16px agar nyaman di tablet. Label dan caption tidak boleh di bawah 12px. Angka uang memakai tabular figures (font-variant-numeric: tabular-nums) dan format Rupiah Indonesia, contoh Rp 62.700. Line-height dipakai unitless dan dibulatkan ke kelipatan 4 saat dihitung ke piksel.
Spacing & Layout
Base 4px grid (dense tool). Skala: 4, 8, 12, 16, 24, 32, 48. Target sentuh minimal 44px, tinggi tombol dan input kasir 48px. Tablet landscape (1280×800): sidebar tetap 88px, area konten fleksibel, panel samping tetap 360px. Gap antar card 16-24px. Ponsel memakai satu kolom dengan bottom navigation. Row dan card berisi teks variabel memakai height auto + min-height + padding konsisten, bukan tinggi fixed.
Shapes
Radius mengikuti ukuran komponen dan rumus nested r_inner = r_outer − padding: card 20px dengan padding 12px berarti foto di dalamnya 8px. Tombol dan input 12px. Chip, stepper, badge, dan avatar memakai pill/lingkaran penuh.
Elevation & Depth
Dominan flat: kedalaman dari kontras warna (card surface di atas background) dan border Sand 1px. Shadow hanya satu level lembut untuk card dan panel: 0 1px 2px rgba(59,41,34,0.06), 0 8px 24px rgba(59,41,34,0.06). Tanpa glow, tanpa blur transparan, tanpa gradient.
Components


Button: primary (satu per layar), secondary (surface + border), ghost. Tinggi 48px, label 14px semibold. Hover gelap satu langkah, focus ring 2px primary offset 2px, disabled memakai opasitas dan label alasan.

Chip filter: pill 40px, tidak terpilih surface-variant, terpilih nav dengan teks on-nav.

Product card: foto 4:3 konsisten (hangat, tidak jenuh), nama, harga, tombol + lingkaran 44px. Stok bahan habis: foto dibuat pudar, badge "Stok habis", tombol nonaktif.

Stepper jumlah: tombol − dan + lingkaran 44px dengan outline primary.

Baris item order: foto kecil, nama, harga, stepper, dan catatan item (maks. 250 karakter) tampil jelas di bawah nama dengan ikon catatan.

Badge status order: Menunggu Pembayaran (warning), Dikonfirmasi (secondary), Diproses (primary-subtle), Siap Disajikan (success), Selesai (surface-variant), Dibatalkan (error). Badge pembayaran: Belum Dibayar, Bukti Diunggah, Diverifikasi, Lunas, Ditolak, Dikembalikan.

Modal dan bottom sheet: konfirmasi aksi sensitif (batal, refund, koreksi) meminta PIN dan alasan.

State wajib: empty state, skeleton loading, error dengan tombol coba lagi, indikator koneksi realtime (terhubung / memuat ulang berkala).
Rules to Never Break


Jangan glow, glassmorphism, neon, gradient mencolok, atau dekorasi yang mengganggu.

Jangan terlalu banyak card. Pakai satu level card, tidak ada card di dalam card.

Jangan menandai pembayaran QRIS sebagai Lunas hanya karena bukti diunggah. Verifikasi kasir wajib, dengan nama petugas dan waktu.

Jangan menampilkan data dummy sebagai fakta di analitik. Pakai label "data belum cukup".

Jangan pakai #000000 atau #FFFFFF sebagai background atau teks utama.

Jangan pakai warna saja untuk menyampaikan status. Selalu sertakan teks dan ikon.

Jangan pakai lorem ipsum. Selalu pakai konten warkop yang nyata dengan harga Rupiah.

Selalu pastikan kontras teks ≥ 4,5:1 dan elemen non-teks (border input, ikon, focus ring) ≥ 3:1.

Selalu pakai target sentuh ≥ 44px dan label form yang jelas.