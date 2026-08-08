-- db/004_seed.sql — kategori + menu awal. Sumber: docs/05-SCHEMA.md §7.
-- Harga dan menu di bawah hanya contoh — ganti dengan harga asli sebelum dipakai.

insert into kategori_produk (nama, urutan, ikon) values
  ('Dimsum Kukus', 1, '🥟'),
  ('Gorengan',     2, '🍤'),
  ('Frozen Pack',  3, '❄️'),
  ('Minuman',      4, '🥤');

insert into produk (kategori_id, nama, harga, satuan_jual, urutan) values
  (1, 'Dimsum Ayam',        15000, 'porsi', 1),
  (1, 'Dimsum Ayam Keju',   18000, 'porsi', 2),
  (1, 'Dimsum Mentai',      22000, 'porsi', 3),
  (1, 'Siomay Ayam',        15000, 'porsi', 4),
  (2, 'Lumpia Udang',       18000, 'porsi', 1),
  (2, 'Ekado',              18000, 'porsi', 2),
  (2, 'Pangsit Goreng',     13000, 'porsi', 3),
  (3, 'Dimsum Ayam Frozen isi 10', 45000, 'pack', 1),
  (4, 'Es Teh',              5000, 'gelas', 1),
  (4, 'Teh Hangat',          4000, 'gelas', 2),
  (4, 'Es Jeruk',            7000, 'gelas', 3);

-- contoh pilihan wajib untuk Dimsum Ayam
insert into grup_pilihan (produk_id, nama, wajib, urutan) values (1, 'Cara Masak', true, 1);
insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
  (1, 'Kukus', 0, 1), (1, 'Goreng', 2000, 2);

insert into grup_pilihan (produk_id, nama, wajib, urutan) values (1, 'Level Saus', true, 2);
insert into opsi_pilihan (grup_id, nama, harga_tambahan, urutan) values
  (2, 'Original', 0, 1), (2, 'Pedas Sedang', 0, 2), (2, 'Pedas Banget', 0, 3);

insert into pengaturan (kunci, nilai) values
  ('nama_kedai',       '"Nyumil Dimsum"'),
  ('teks_footer_struk','"Terima kasih, ditunggu pesanan berikutnya 🙏"'),
  ('batas_expired_hari','3');
