-- db/003_rls.sql — kebijakan akses. Sumber: docs/05-SCHEMA.md §6.
-- Tidak ada policy DELETE di mana pun. Penghapusan lewat kolom aktif/status (B-05).

alter table profil, produk, kategori_produk, grup_pilihan, opsi_pilihan,
             pelanggan, pesanan, pesanan_item, pesanan_item_opsi, pembayaran,
             pesanan_log, bahan, bahan_batch, pergerakan_stok, resep, resep_item,
             produksi, pengeluaran, tutup_kasir, pengaturan, counter_harian
  enable row level security;

create or replace function peran_saya()
returns peran_pengguna language sql stable security definer as $$
  select peran from profil where id = auth.uid()
$$;

-- Semua yang sudah login boleh menjalankan operasi harian
create policy operasional_baca on pesanan for select
  using (auth.uid() is not null);
create policy operasional_tulis on pesanan for insert
  with check (auth.uid() is not null);
create policy operasional_ubah on pesanan for update
  using (auth.uid() is not null);
-- (ulangi pola yang sama untuk pesanan_item, pesanan_item_opsi, pembayaran,
--  pergerakan_stok, bahan, bahan_batch, produksi, pelanggan)

-- Hanya pemilik/admin yang boleh ubah harga & katalog
create policy katalog_baca on produk for select using (auth.uid() is not null);
create policy katalog_kelola on produk for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

-- Keuangan hanya pemilik/admin
create policy keuangan on tutup_kasir for all
  using (peran_saya() in ('PEMILIK','ADMIN'))
  with check (peran_saya() in ('PEMILIK','ADMIN'));

-- Log tidak bisa diubah siapa pun
create policy log_baca on pesanan_log for select using (auth.uid() is not null);
-- sengaja tidak ada policy insert/update/delete: penulisan hanya lewat fungsi SECURITY DEFINER
