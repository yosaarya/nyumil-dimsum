# Catatan migrasi

Aturan: file yang sudah pernah dijalankan **tidak pernah diedit**. Perubahan berikutnya = file baru bernomor di `db/migrations/`.

| No. | File | Sudah dijalankan di Supabase? | Tanggal |
|---|---|---|---|
| 001 | `001_schema.sql` | ☑ Sudah | 8 Agu 2026 |
| 002 | `002_functions.sql` | ☑ Sudah | 8 Agu 2026 |
| 003 | `003_rls.sql` | ☑ Sudah (versi awal gagal, versi perbaikan berhasil) | 8 Agu 2026 |
| 004 | `004_seed.sql` | ☑ Sudah | 8 Agu 2026 |
| 005 | `migrations/005_jaga_status_security_definer.sql` | ☑ Sudah | 8 Agu 2026 |

**Migrasi terakhir yang sudah jalan di Supabase: 005.**

Cara jalankan: buka Supabase SQL Editor → tempel isi file berurutan (001 → 002 → 003 → 004 → 005) → Run. Update tabel di atas setiap selesai menjalankan satu file.
