# Catatan migrasi

Aturan: file yang sudah pernah dijalankan **tidak pernah diedit**. Perubahan berikutnya = file baru bernomor di `db/migrations/`.

| No. | File | Sudah dijalankan di Supabase? | Tanggal |
|---|---|---|---|
| 001 | `001_schema.sql` | ☑ Sudah | 8 Agu 2026 |
| 002 | `002_functions.sql` | ☑ Sudah | 8 Agu 2026 |
| 003 | `003_rls.sql` | ☑ Sudah (versi awal gagal, versi perbaikan berhasil) | 8 Agu 2026 |
| 004 | `004_seed.sql` | ☑ Sudah | 8 Agu 2026 |
| 005 | `migrations/005_jaga_status_security_definer.sql` | ☑ Sudah | 8 Agu 2026 |
| 006 | `migrations/006_menu_asli.sql` | ☑ Sudah | 8 Agu 2026 |
| 007 | `migrations/007_grant_akses_dasar.sql` | ☑ Sudah | 8 Agu 2026 |
| 008 | `migrations/008_tambah_stok_bahan.sql` | ☐ Belum | |
| 009 | `migrations/009_topping_pilih_banyak.sql` | ☐ Belum | |
| 010 | `migrations/010_jumlah_opsi_addon.sql` | ☐ Belum | |

**Migrasi terakhir yang sudah jalan di Supabase: 007.**

Cara jalankan: buka Supabase SQL Editor → tempel isi file berurutan → Run. Update tabel di atas setiap selesai menjalankan satu file.

**Catatan penting (007):** saat setup project, opsi "Automatically expose new tables" di dashboard Supabase dimatikan. Ternyata itu juga mematikan GRANT dasar Postgres untuk tabel baru ke role `authenticated` — bukan cuma soal RLS. Tanpa `007`, semua query ke tabel (produk, pesanan, dst) akan selalu gagal dengan "permission denied" walau RLS-nya benar. **007 wajib dijalankan** sebelum aplikasi bisa dipakai sama sekali, dan berlaku juga otomatis untuk tabel/fungsi yang ditambahkan di migrasi berikutnya (lewat `alter default privileges`).
