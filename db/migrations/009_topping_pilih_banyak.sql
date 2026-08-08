-- db/migrations/009_topping_pilih_banyak.sql
-- Topping semula cuma boleh pilih 1 (pilih_banyak=false). Pemilik minta
-- pelanggan bisa pilih topping lebih dari satu -- tetap wajib pilih
-- minimal satu (grup ini tetap wajib=true), cuma sekarang boleh lebih.

update grup_pilihan set pilih_banyak = true where nama = 'Topping';
