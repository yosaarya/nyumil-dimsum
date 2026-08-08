-- db/003_rls.sql — kebijakan akses. Sumber: docs/05-SCHEMA.md §6.
-- Tidak ada policy DELETE di mana pun. Penghapusan lewat kolom aktif/status (B-05).
--
-- Prinsip (docs/02-ARCHITECTURE.md §5): siapa pun yang login boleh baca-tulis
-- data operasional; hanya PEMILIK/ADMIN yang boleh ubah harga/katalog dan
-- lihat/kelola keuangan.

-- Postgres tidak mendukung "alter table a, b, c enable row level security" —
-- harus satu per satu.
alter table profil              enable row level security;
alter table kategori_produk     enable row level security;
alter table produk              enable row level security;
alter table grup_pilihan        enable row level security;
alter table opsi_pilihan        enable row level security;
alter table pelanggan           enable row level security;
alter table pesanan             enable row level security;
alter table pesanan_item        enable row level security;
alter table pesanan_item_opsi   enable row level security;
alter table pembayaran          enable row level security;
alter table pesanan_log         enable row level security;
alter table bahan               enable row level security;
alter table bahan_batch         enable row level security;
alter table pergerakan_stok     enable row level security;
alter table resep               enable row level security;
alter table resep_item          enable row level security;
alter table produksi            enable row level security;
alter table pengeluaran         enable row level security;
alter table tutup_kasir         enable row level security;
alter table pengaturan          enable row level security;
alter table counter_harian      enable row level security;

create or replace function peran_saya()
returns peran_pengguna language sql stable security definer as $$
  select peran from profil where id = auth.uid()
$$;

-- =========================================================================
-- Profil: lihat/ubah punya sendiri; PEMILIK/ADMIN boleh lihat/ubah semua
-- (perlu untuk kelola staf nanti)
-- =========================================================================
create policy profil_baca on profil for select
  using (auth.uid() = id or peran_saya() in ('PEMILIK','ADMIN'));
create policy profil_ubah on profil for update
  using (auth.uid() = id or peran_saya() in ('PEMILIK','ADMIN'));

-- =========================================================================
-- Operasional: siapa pun yang login boleh baca-tulis (pesanan sudah ada di
-- versi sebelumnya, ini melengkapi tabel lain dengan pola yang sama)
-- =========================================================================
create policy operasional_baca on pesanan for select
  using (auth.uid() is not null);
create policy operasional_tulis on pesanan for insert
  with check (auth.uid() is not null);
create policy operasional_ubah on pesanan for update
  using (auth.uid() is not null);

create policy operasional_baca on pesanan_item for select using (auth.uid() is not null);
create policy operasional_tulis on pesanan_item for insert with check (auth.uid() is not null);
create policy operasional_ubah on pesanan_item for update using (auth.uid() is not null);

create policy operasional_baca on pesanan_item_opsi for select using (auth.uid() is not null);
create policy operasional_tulis on pesanan_item_opsi for insert with check (auth.uid() is not null);

create policy operasional_baca on pembayaran for select using (auth.uid() is not null);
create policy operasional_tulis on pembayaran for insert with check (auth.uid() is not null);

create policy operasional_baca on pelanggan for select using (auth.uid() is not null);
create policy operasional_tulis on pelanggan for insert with check (auth.uid() is not null);
create policy operasional_ubah on pelanggan for update using (auth.uid() is not null);

create policy operasional_baca on bahan for select using (auth.uid() is not null);
create policy operasional_tulis on bahan for insert with check (auth.uid() is not null);
create policy operasional_ubah on bahan for update using (auth.uid() is not null);

create policy operasional_baca on bahan_batch for select using (auth.uid() is not null);
create policy operasional_tulis on bahan_batch for insert with check (auth.uid() is not null);

create policy operasional_baca on pergerakan_stok for select using (auth.uid() is not null);
create policy operasional_tulis on pergerakan_stok for insert with check (auth.uid() is not null);

create policy operasional_baca on produksi for select using (auth.uid() is not null);
create policy operasional_tulis on produksi for insert with check (auth.uid() is not null);

-- =========================================================================
-- Katalog: baca terbuka untuk yang login, ubah (harga/menu/resep) hanya
-- PEMILIK/ADMIN
-- =========================================================================
create policy katalog_baca on kategori_produk for select using (auth.uid() is not null);
create policy katalog_kelola on kategori_produk for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy katalog_baca on produk for select using (auth.uid() is not null);
create policy katalog_kelola on produk for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy katalog_baca on grup_pilihan for select using (auth.uid() is not null);
create policy katalog_kelola on grup_pilihan for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy katalog_baca on opsi_pilihan for select using (auth.uid() is not null);
create policy katalog_kelola on opsi_pilihan for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy katalog_baca on resep for select using (auth.uid() is not null);
create policy katalog_kelola on resep for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy katalog_baca on resep_item for select using (auth.uid() is not null);
create policy katalog_kelola on resep_item for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

-- =========================================================================
-- Keuangan: hanya PEMILIK/ADMIN
-- =========================================================================
create policy keuangan on tutup_kasir for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy keuangan on pengeluaran for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

create policy keuangan on pengaturan for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

-- =========================================================================
-- Log & counter: tidak ada policy insert/update/delete untuk siapa pun.
-- Ditulis hanya lewat fungsi SECURITY DEFINER (buat_pesanan, dan trigger
-- jaga_status_pesanan yang akan diperbaiki jadi SECURITY DEFINER di migrasi
-- berikutnya supaya bisa menulis log meski RLS aktif).
-- =========================================================================
create policy log_baca on pesanan_log for select using (auth.uid() is not null);
-- counter_harian sengaja tanpa policy sama sekali: hanya diakses dari dalam
-- fungsi buat_pesanan() yang SECURITY DEFINER.
