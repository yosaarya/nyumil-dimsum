-- db/migrations/006_menu_asli.sql
-- Ganti menu contoh (seed di 004_seed.sql) dengan menu asli Nyumil Dimsum,
-- diambil dari kartu menu "Special Menu Mentai" + katalog WA pemilik.
--
-- Menu contoh dinonaktifkan lewat kolom aktif, BUKAN dihapus (B-05/B3 di
-- CLAUDE.md: tidak pernah DELETE baris). katalogProduk()/daftarKategori()
-- di js/api.js sudah filter .eq('aktif', true) jadi otomatis hilang dari
-- Kasir begitu dinonaktifkan.
--
-- Catatan pemodelan (lihat percakapan): "Isi" (ukuran paket, harga beda
-- tiap tingkat) dimodelkan sebagai grup_pilihan wajib per produk, bukan
-- produk terpisah per ukuran. Add On (Chili Oil dkk) sebagai grup_pilihan
-- opsional (pilih_banyak) yang diulang di produk yang relevan.
--
-- Belum dimasukkan (bukan barang katalog harga tetap, perlu nego manual):
-- Birthday Package, Wedding/Event Package. Delivery Rp2000/km disimpan di
-- pengaturan untuk referensi, belum dihitung otomatis di Fase 1.

update produk set aktif = false where aktif = true;
update kategori_produk set aktif = false where aktif = true;

do $$
declare
  v_kat_mentai   int;
  v_kat_original int;
  v_produk       int;
  v_grup         int;
begin
  insert into kategori_produk (nama, urutan, ikon) values ('Mentai', 1, '🍱') returning id into v_kat_mentai;
  insert into kategori_produk (nama, urutan, ikon) values ('Original', 2, '🥟') returning id into v_kat_original;

  -- 1. Dimsum Mentai Original (free chili oil, topping pilih 1)
  insert into produk (kategori_id, nama, harga, satuan_jual, urutan)
  values (v_kat_mentai, 'Dimsum Mentai Original', 16000, 'porsi', 1)
  returning id into v_produk;

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Isi', true, false, 1) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Isi 3', 0, 1), (v_grup, 'Isi 4', 4000, 2), (v_grup, 'Isi 6', 12000, 3), (v_grup, 'Isi 16', 62000, 4);

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Topping', true, false, 2) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Nori', 0, 1), (v_grup, 'Boncabe', 0, 2), (v_grup, 'Katsuobushi', 0, 3), (v_grup, 'Mix', 0, 4);

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Add On', false, true, 3) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Saos Bangkok', 2000, 1), (v_grup, 'Mozzarella', 1000, 2), (v_grup, 'Tobiko', 3000, 3);

  -- 2. Dimsum Mentai Cheesy (topping full mozzarella, tidak perlu pilih topping)
  insert into produk (kategori_id, nama, harga, satuan_jual, urutan)
  values (v_kat_mentai, 'Dimsum Mentai Cheesy', 19000, 'porsi', 2)
  returning id into v_produk;

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Isi', true, false, 1) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Isi 3', 0, 1), (v_grup, 'Isi 4', 5000, 2), (v_grup, 'Isi 6', 15000, 3), (v_grup, 'Isi 16', 75000, 4);

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Add On', false, true, 2) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Saos Bangkok', 2000, 1), (v_grup, 'Tobiko', 3000, 2);

  -- 3. Gyoza Mentai
  insert into produk (kategori_id, nama, harga, satuan_jual, urutan)
  values (v_kat_mentai, 'Gyoza Mentai', 16000, 'porsi', 3)
  returning id into v_produk;

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Isi', true, false, 1) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Isi 5', 0, 1), (v_grup, 'Isi 8', 8000, 2);

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Topping', true, false, 2) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Nori', 0, 1), (v_grup, 'Boncabe', 0, 2), (v_grup, 'Katsuobushi', 0, 3);

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Add On', false, true, 3) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Saos Bangkok', 2000, 1), (v_grup, 'Mozzarella', 1000, 2), (v_grup, 'Tobiko', 3000, 3);

  -- 4. Dimsum Original (dijual per pcs, free saos bangkok, minimal 6 pcs)
  insert into produk (kategori_id, nama, harga, satuan_jual, urutan)
  values (v_kat_original, 'Dimsum Original (min 6 pcs)', 3000, 'pcs', 1)
  returning id into v_produk;

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Add On', false, true, 1) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Chili Oil', 3000, 1), (v_grup, 'Saos Bangkok', 2000, 2), (v_grup, 'Mozzarella', 1000, 3), (v_grup, 'Tobiko', 3000, 4);

  -- 5. Gyoza (dijual per pcs, free saos bangkok, minimal 10 pcs)
  insert into produk (kategori_id, nama, harga, satuan_jual, urutan)
  values (v_kat_original, 'Gyoza (min 10 pcs)', 2000, 'pcs', 2)
  returning id into v_produk;

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Add On', false, true, 1) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Chili Oil', 3000, 1), (v_grup, 'Saos Bangkok', 2000, 2), (v_grup, 'Mozzarella', 1000, 3), (v_grup, 'Tobiko', 3000, 4);

  -- 6. Kuah Keju (harga sama baik basis gyoza isi 6 atau dimsum isi 4)
  insert into produk (kategori_id, nama, harga, satuan_jual, urutan)
  values (v_kat_original, 'Kuah Keju', 20000, 'porsi', 3)
  returning id into v_produk;

  insert into grup_pilihan (produk_id, nama, wajib, pilih_banyak, urutan)
  values (v_produk, 'Pilih', true, false, 1) returning id into v_grup;
  insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
    (v_grup, 'Gyoza (isi 6)', 0, 1), (v_grup, 'Dimsum (isi 4)', 0, 2);
end $$;

insert into pengaturan (kunci, nilai) values
  ('alamat', '"Nyumil Dimsum (Toko Wisa), Mindahan, Batealit, Jepara"'),
  ('kontak_wa', '"6282142859165"'),
  ('instagram_tiktok', '"@nyumil.dimsum"'),
  ('ongkir_per_km', '2000')
on conflict (kunci) do update set nilai = excluded.nilai;
