-- db/migrations/011_simpan_resep.sql
-- F-14/F-15: fungsi buat isi/ubah resep produk (dipakai tab Kitchen sebelum
-- produksi bisa memotong stok bahan otomatis lewat catat_produksi() yang
-- sudah ada sejak 002_functions.sql).
--
-- resep_item bukan data transaksi (bukan snapshot pesanan) -- ini definisi
-- resep yang sewajarnya diedit ulang, jadi dihapus+insert ulang tiap simpan
-- itu tidak melanggar semangat B-05 (yang soal pesanan tidak pernah
-- dihapus).

create or replace function simpan_resep(p jsonb)
returns resep
language plpgsql
security definer
as $$
declare
  v_resep resep;
begin
  insert into resep (produk_id, hasil_jumlah, catatan)
  values (
    (p->>'produk_id')::int,
    greatest(coalesce((p->>'hasil_jumlah')::int, 1), 1),
    nullif(p->>'catatan','')
  )
  on conflict (produk_id) do update
    set hasil_jumlah = excluded.hasil_jumlah,
        catatan = excluded.catatan
  returning * into v_resep;

  delete from resep_item where resep_id = v_resep.id;

  insert into resep_item (resep_id, bahan_id, jumlah)
  select v_resep.id, (item->>'bahan_id')::int, (item->>'jumlah')::numeric
  from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) as item;

  return v_resep;
end $$;

grant execute on function simpan_resep(jsonb) to authenticated;
