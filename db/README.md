# Catatan migrasi

Aturan: file yang sudah pernah dijalankan **tidak pernah diedit**. Perubahan berikutnya = file baru bernomor di `db/migrations/`.

| No. | File | Sudah dijalankan di Supabase? | Tanggal |
|---|---|---|---|
| 001 | `001_schema.sql` | ☑ Sudah | 8 Agu 2026 |
| 002 | `002_functions.sql` | ☑ Sudah | 8 Agu 2026 |
| 003 | `003_rls.sql` | ☐ Belum — versi awal gagal (syntax error `alter table a, b, c`), sudah diperbaiki, tempel ulang versi terbaru | |
| 004 | `004_seed.sql` | ☐ Belum | |
| 005 | `migrations/005_jaga_status_security_definer.sql` | ☐ Belum — jalankan setelah 004 | |

**Migrasi terakhir yang sudah jalan di Supabase: 002.**

Cara jalankan: buka Supabase SQL Editor → tempel isi file berurutan (001 → 002 → 003 → 004 → 005) → Run. Update tabel di atas setiap selesai menjalankan satu file.
