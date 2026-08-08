-- db/migrations/012_produk_olahan_dapur.sql
-- Tab Kitchen: selain dimsum (sudah ada di tabel produk), istri juga bikin
-- olahan dapur sendiri (mis. Chili Oil) dari bahan mentah -- bukan barang
-- yang dijual langsung, jadi tidak boleh muncul di katalog Sales/Order
-- (yang cuma tampilkan produk aktif=true). Disimpan sebagai baris produk
-- aktif=false supaya resep/produksi tetap bisa dipakai (keduanya di-keyed
-- ke produk_id) tanpa nambah konsep baru di skema.

insert into kategori_produk (nama, urutan, ikon, aktif)
values ('Olahan Dapur', 99, '🫙', false);

insert into produk (kategori_id, nama, harga, satuan_jual, urutan, aktif)
select id, 'Chili Oil', 0, 'batch', 1, false
from kategori_produk where nama = 'Olahan Dapur';
