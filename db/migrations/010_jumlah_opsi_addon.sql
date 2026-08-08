-- db/migrations/010_jumlah_opsi_addon.sql
-- Add On sekarang bisa punya jumlah (mis. Tobiko x3), bukan cuma
-- dipilih/tidak. Tambah kolom jumlah di pesanan_item_opsi, lalu
-- buat_pesanan() ditulis ulang (CREATE OR REPLACE, fungsi yang sama)
-- supaya harga_tambahan dikalikan jumlah opsi itu.

alter table pesanan_item_opsi
  add column jumlah integer not null default 1 check (jumlah > 0);

create or replace function buat_pesanan(p jsonb)
returns pesanan
language plpgsql
security definer
as $$
declare
  v_pesanan     pesanan;
  v_tanggal     date := (now() at time zone 'Asia/Jakarta')::date;
  v_item        jsonb;
  v_opsi        jsonb;
  v_produk      produk;
  v_item_id     bigint;
  v_harga       integer;
  v_subtotal    integer;
  v_total       integer := 0;
  v_ref         uuid := nullif(p->>'client_ref','')::uuid;
  v_opsi_jumlah integer;
begin
  -- idempotensi: kalau sudah pernah tersimpan, kembalikan yang lama
  if v_ref is not null then
    select * into v_pesanan from pesanan where client_ref = v_ref;
    if found then return v_pesanan; end if;
  end if;

  insert into pesanan (
    client_ref, nomor_antrian, tanggal_operasi, kanal, status,
    pelanggan_id, nama_pelanggan, no_wa, waktu_ambil, diantar, alamat_antar,
    catatan, kasbon, created_by
  ) values (
    v_ref,
    nomor_antrian_berikutnya(v_tanggal),
    v_tanggal,
    (p->>'kanal')::kanal_pesanan,
    'DIKONFIRMASI',
    nullif(p->>'pelanggan_id','')::int,
    nullif(p->>'nama_pelanggan',''),
    nullif(p->>'no_wa',''),
    nullif(p->>'waktu_ambil','')::timestamptz,
    coalesce((p->>'diantar')::boolean, false),
    nullif(p->>'alamat_antar',''),
    nullif(p->>'catatan',''),
    coalesce((p->>'kasbon')::boolean, false),
    auth.uid()
  ) returning * into v_pesanan;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_produk from produk where id = (v_item->>'produk_id')::int;
    if not found then raise exception 'Produk tidak ditemukan: %', v_item->>'produk_id'; end if;

    v_harga := v_produk.harga;

    insert into pesanan_item (pesanan_id, produk_id, nama_produk, harga_satuan, jumlah, catatan)
    values (v_pesanan.id, v_produk.id, v_produk.nama, v_harga,
            (v_item->>'jumlah')::int, nullif(v_item->>'catatan',''))
    returning id into v_item_id;

    -- opsi/varian: snapshot nama grup + nama opsi + harga tambahan (x jumlah, mis. Tobiko x3)
    for v_opsi in select * from jsonb_array_elements(coalesce(v_item->'opsi','[]'::jsonb)) loop
      v_opsi_jumlah := coalesce((v_opsi->>'jumlah')::int, 1);

      insert into pesanan_item_opsi (item_id, opsi_id, nama_grup, nama_opsi, harga_tambahan, jumlah)
      select v_item_id, o.id, g.nama, o.nama, o.harga_tambahan, v_opsi_jumlah
      from opsi_pilihan o join grup_pilihan g on g.id = o.grup_id
      where o.id = (v_opsi->>'opsi_id')::int;

      v_harga := v_harga + coalesce(
        (select harga_tambahan from opsi_pilihan where id = (v_opsi->>'opsi_id')::int), 0) * v_opsi_jumlah;
    end loop;

    v_subtotal := v_harga * (v_item->>'jumlah')::int;
    update pesanan_item
       set harga_satuan = v_harga, subtotal = v_subtotal
     where id = v_item_id;

    v_total := v_total + v_subtotal;
  end loop;

  if v_total = 0 then raise exception 'Pesanan kosong'; end if;

  update pesanan set total = v_total where id = v_pesanan.id returning * into v_pesanan;

  insert into pesanan_log (pesanan_id, kejadian, ke_status, oleh)
  values (v_pesanan.id, 'DIBUAT', 'DIKONFIRMASI', auth.uid());

  return v_pesanan;
end $$;
