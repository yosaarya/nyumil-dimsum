-- db/migrations/007_grant_akses_dasar.sql
-- Perbaikan: saat setup proyek, opsi "Automatically expose new tables" di
-- Supabase sengaja dimatikan (biar kontrol akses eksplisit lewat RLS, bukan
-- default terbuka). Efek sampingnya baru ketahuan sekarang: mematikan opsi
-- itu juga mematikan GRANT dasar Postgres ke role `authenticated`/`anon`
-- untuk tabel BARU. Tanpa GRANT itu, permintaan ditolak "permission denied"
-- SEBELUM RLS sempat dicek sama sekali -- makanya katalog gagal dimuat
-- padahal policy RLS-nya sendiri sudah benar.
--
-- Diverifikasi lokal: sebelum migrasi ini, `SET ROLE authenticated; SELECT
-- * FROM produk;` -> "permission denied for table produk". Sesudahnya,
-- sama persis tapi berhasil (RLS yang lanjut menyaring baris).

grant usage on schema public to anon, authenticated;

grant select, insert, update on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon (belum login) sengaja TIDAK diberi akses tabel apa pun -- semua RLS
-- di 003_rls.sql mensyaratkan auth.uid() is not null, jadi anon memang
-- tidak boleh baca apa-apa (aturan dev: login wajib untuk operasi harian).

grant execute on function buat_pesanan(jsonb) to authenticated;
grant execute on function catat_produksi(int, int, text) to authenticated;
grant execute on function nomor_antrian_berikutnya(date) to authenticated;
grant execute on function peran_saya() to authenticated;

-- Supaya tabel & fungsi yang dibuat lewat migrasi berikutnya otomatis
-- kebagian GRANT yang sama tanpa perlu diulang manual tiap kali.
alter default privileges in schema public
  grant select, insert, update on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;
