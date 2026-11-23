# Warkop Teras Nenek — AI Blueprint Pack

## Isi
- `AGENT.md` — instruksi utama coding agent.
- `ARCHITECTURE.md` — arsitektur, route, domain, data model, API, dan tahapan implementasi.
- `skills/warkop-teras-nenek/SKILL.md` — skill khusus proyek.

## Cara pakai
1. Extract ZIP ke root repository Warkop Teras Nenek.
2. Pastikan `AGENT.md` berada di root repository.
3. Letakkan `ARCHITECTURE.md` di root atau sesuaikan path pada `AGENT.md`.
4. Simpan skill di `skills/warkop-teras-nenek/SKILL.md`.
5. Buka repository dengan coding agent.
6. Minta agent membaca `AGENT.md` sebelum coding.

## Prompt awal untuk coding agent

Baca `AGENT.md`, `ARCHITECTURE.md`, dan `skills/warkop-teras-nenek/SKILL.md` secara menyeluruh. Temukan dan baca skill Anti-Slop, Caveman, dan Modern Web Guidance yang benar-benar tersedia di environment ini. Jangan mengarang skill yang tidak ditemukan.

Audit repository yang ada. Jangan langsung menimpa atau membuat ulang project. Laporkan:
1. Stack dan struktur project saat ini.
2. Fitur yang sudah ada dan belum ada.
3. Kesesuaian dengan arsitektur dan PRD.
4. Risiko atau keputusan yang masih ambigu.
5. Rencana implementasi bertahap, mulai dari customer QR ordering sampai order masuk ke cashier queue.

Jangan mulai coding sebelum audit dan rencana selesai.
