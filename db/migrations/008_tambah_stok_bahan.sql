-- db/migrations/008_tambah_stok_bahan.sql
-- F-13: satu fungsi atomik untuk "+ Tambah Bahan" di tab Inventory.
-- Kalau nama+satuan bahan sudah ada, tidak bikin baris bahan baru --
-- cukup tambah batch + pergerakan MASUK ke bahan yang sama (B-17: stok
-- tidak pernah ditimpa, selalu lewat baris pergerakan_stok).

create or replace function tambah_stok_bahan(p jsonb)
returns bahan
language plpgsql
security definer
as $$
declare
  v_bahan    bahan;
  v_batch_id bigint;
begin
  select * into v_bahan from bahan
   where lower(nama) = lower(p->>'nama')
     and satuan = (p->>'satuan')::satuan_ukur;

  if not found then
    insert into bahan (nama, kategori, satuan, tempat, stok_minimum)
    values (
      p->>'nama',
      (p->>'kategori')::kategori_bahan,
      (p->>'satuan')::satuan_ukur,
      (p->>'tempat')::tempat_simpan,
      coalesce(nullif(p->>'stok_minimum','')::numeric, 0)
    )
    returning * into v_bahan;
  end if;

  insert into bahan_batch (bahan_id, tgl_expired, harga_beli, catatan)
  values (
    v_bahan.id,
    nullif(p->>'tgl_expired','')::date,
    nullif(p->>'harga_beli','')::integer,
    nullif(p->>'catatan','')
  )
  returning id into v_batch_id;

  insert into pergerakan_stok (bahan_id, batch_id, jenis, jumlah, created_by)
  values (v_bahan.id, v_batch_id, 'MASUK', (p->>'jumlah')::numeric, auth.uid());

  return v_bahan;
end $$;

grant execute on function tambah_stok_bahan(jsonb) to authenticated;
