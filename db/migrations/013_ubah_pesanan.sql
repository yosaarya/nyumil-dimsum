-- db/migrations/013_ubah_pesanan.sql
-- F-04 acceptance: "Setelah dikonfirmasi, perubahan item hanya bisa lewat
-- tombol 'Ubah Pesanan' yang wajib isi alasan." B-06: setiap perubahan
-- pesanan setelah DIKONFIRMASI dicatat di pesanan_log (siapa, kapan, dari
-- apa ke apa, alasannya) -- pesanan_log.kejadian sudah menyediakan nilai
-- 'UBAH_SETELAH_KONFIRMASI' sejak 001_schema.sql, dipakai di sini.
--
-- Item lama tidak "dihapus" dalam artian B-05 (hilang tanpa jejak) -- baris
-- pesanan_item memang diganti (pola sama seperti resep_item di
-- 011_simpan_resep.sql), tapi isi lengkapnya sebelum diubah disalin ke
-- pesanan_log.detail sebagai snapshot, jadi tetap bisa ditelusuri.
--
-- kanal & kasbon sengaja tidak bisa diubah lewat sini: kanal (Kedai/WA)
-- bukan sesuatu yang wajar berubah di tengah pesanan, kasbon itu urusan
-- pembayaran (lewat catat_pembayaran / tab Finance), bukan isi pesanan.

create or replace function ubah_pesanan(p jsonb)
returns pesanan
language plpgsql
security definer
as $$
declare
  v_pesanan     pesanan;
  v_total_lama  integer;
  v_item_lama   jsonb;
  v_item        jsonb;
  v_opsi        jsonb;
  v_produk      produk;
  v_item_id     bigint;
  v_harga       integer;
  v_subtotal    integer;
  v_total       integer := 0;
  v_alasan      text := nullif(trim(p->>'alasan'), '');
  v_opsi_jumlah integer;
begin
  select * into v_pesanan from pesanan where id = (p->>'pesanan_id')::bigint;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  if v_pesanan.status in ('SELESAI', 'BATAL') then
    raise exception 'Pesanan berstatus % tidak bisa diubah', v_pesanan.status;
  end if;

  if v_alasan is null or length(v_alasan) < 5 then
    raise exception 'Alasan perubahan wajib diisi (minimal 5 karakter)';
  end if;

  v_total_lama := v_pesanan.total;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nama_produk', pi.nama_produk, 'jumlah', pi.jumlah,
           'harga_satuan', pi.harga_satuan, 'subtotal', pi.subtotal,
           'opsi', (select coalesce(jsonb_agg(jsonb_build_object(
                      'nama_opsi', pio.nama_opsi, 'harga_tambahan', pio.harga_tambahan, 'jumlah', pio.jumlah
                    )), '[]'::jsonb)
                    from pesanan_item_opsi pio where pio.item_id = pi.id)
         )), '[]'::jsonb)
    into v_item_lama
    from pesanan_item pi
   where pi.pesanan_id = v_pesanan.id;

  update pesanan set
    nama_pelanggan = nullif(p->>'nama_pelanggan', ''),
    no_wa          = nullif(p->>'no_wa', ''),
    waktu_ambil    = nullif(p->>'waktu_ambil', '')::timestamptz,
    diantar        = coalesce((p->>'diantar')::boolean, false),
    alamat_antar   = nullif(p->>'alamat_antar', ''),
    catatan        = nullif(p->>'catatan', '')
  where id = v_pesanan.id;

  delete from pesanan_item where pesanan_id = v_pesanan.id;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_produk from produk where id = (v_item->>'produk_id')::int;
    if not found then raise exception 'Produk tidak ditemukan: %', v_item->>'produk_id'; end if;

    v_harga := v_produk.harga;

    insert into pesanan_item (pesanan_id, produk_id, nama_produk, harga_satuan, jumlah, catatan)
    values (v_pesanan.id, v_produk.id, v_produk.nama, v_harga,
            (v_item->>'jumlah')::int, nullif(v_item->>'catatan', ''))
    returning id into v_item_id;

    for v_opsi in select * from jsonb_array_elements(coalesce(v_item->'opsi', '[]'::jsonb)) loop
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

  if v_total = 0 then raise exception 'Pesanan tidak boleh kosong'; end if;

  update pesanan set total = v_total where id = v_pesanan.id returning * into v_pesanan;

  insert into pesanan_log (pesanan_id, kejadian, dari_status, ke_status, alasan, detail, oleh)
  values (
    v_pesanan.id, 'UBAH_SETELAH_KONFIRMASI', v_pesanan.status, v_pesanan.status, v_alasan,
    jsonb_build_object('total_lama', v_total_lama, 'total_baru', v_total, 'item_lama', v_item_lama),
    auth.uid()
  );

  return v_pesanan;
end $$;

grant execute on function ubah_pesanan(jsonb) to authenticated;
