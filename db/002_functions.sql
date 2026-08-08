-- db/002_functions.sql — nomor antrian, buat pesanan, penjaga status, potong stok.
-- Sumber: docs/05-SCHEMA.md §4. Jalankan setelah 001_schema.sql.

-- =========================================================================
-- 4.1 Nomor antrian (anti nomor dobel)
-- =========================================================================
create or replace function nomor_antrian_berikutnya(p_tanggal date)
returns int
language plpgsql
as $$
declare v_nomor int;
begin
  insert into counter_harian (tanggal, nomor_terakhir)
  values (p_tanggal, 1)
  on conflict (tanggal)
  do update set nomor_terakhir = counter_harian.nomor_terakhir + 1
  returning nomor_terakhir into v_nomor;
  return v_nomor;
end $$;

-- =========================================================================
-- 4.2 Buat pesanan (satu transaksi utuh)
-- =========================================================================
create or replace function buat_pesanan(p jsonb)
returns pesanan
language plpgsql
security definer
as $$
declare
  v_pesanan   pesanan;
  v_tanggal   date := (now() at time zone 'Asia/Jakarta')::date;
  v_item      jsonb;
  v_opsi      jsonb;
  v_produk    produk;
  v_item_id   bigint;
  v_harga     integer;
  v_subtotal  integer;
  v_total     integer := 0;
  v_ref       uuid := nullif(p->>'client_ref','')::uuid;
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

    -- opsi/varian: snapshot nama grup + nama opsi + harga tambahan
    for v_opsi in select * from jsonb_array_elements(coalesce(v_item->'opsi','[]'::jsonb)) loop
      insert into pesanan_item_opsi (item_id, opsi_id, nama_grup, nama_opsi, harga_tambahan)
      select v_item_id, o.id, g.nama, o.nama, o.harga_tambahan
      from opsi_pilihan o join grup_pilihan g on g.id = o.grup_id
      where o.id = (v_opsi->>'opsi_id')::int;

      v_harga := v_harga + coalesce(
        (select harga_tambahan from opsi_pilihan where id = (v_opsi->>'opsi_id')::int), 0);
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

-- =========================================================================
-- 4.3 Penjaga alur status
-- =========================================================================
create or replace function jaga_status_pesanan()
returns trigger language plpgsql as $$
declare v_belum int;
begin
  if new.status = old.status then return new; end if;

  -- transisi yang sah
  if not (
      (old.status = 'DRAFT'        and new.status in ('DIKONFIRMASI','BATAL'))
   or (old.status = 'DIKONFIRMASI' and new.status in ('DIBUAT','BATAL'))
   or (old.status = 'DIBUAT'       and new.status in ('SIAP','BATAL'))
   or (old.status = 'SIAP'         and new.status in ('SELESAI','BATAL'))
  ) then
    raise exception 'Perpindahan status tidak diizinkan: % -> %', old.status, new.status;
  end if;

  -- B-09: pesanan WA wajib dikonfirmasi pelanggan sebelum dibuat
  if new.status = 'DIBUAT' and old.kanal = 'WA' and not new.dikonfirmasi_pelanggan then
    raise exception 'Pesanan WA belum dikonfirmasi pelanggan';
  end if;

  -- B-10: semua item harus dicentang sebelum SIAP
  if new.status = 'SIAP' then
    select count(*) into v_belum
      from pesanan_item where pesanan_id = new.id and not selesai_dibuat;
    if v_belum > 0 then
      raise exception 'Masih ada % item belum selesai dibuat', v_belum;
    end if;
  end if;

  -- B-11: selesai harus lunas atau kasbon bernama
  if new.status = 'SELESAI' and not new.lunas and not new.kasbon then
    raise exception 'Pesanan belum lunas dan tidak ditandai kasbon';
  end if;

  insert into pesanan_log (pesanan_id, kejadian, dari_status, ke_status, alasan, oleh)
  values (new.id, 'UBAH_STATUS', old.status, new.status, new.alasan_batal, auth.uid());

  return new;
end $$;

create trigger trg_jaga_status
  before update of status on pesanan
  for each row execute function jaga_status_pesanan();

-- =========================================================================
-- 4.4 Pembayaran menentukan lunas
-- =========================================================================
create or replace function hitung_lunas()
returns trigger language plpgsql as $$
declare v_dibayar integer;
begin
  select coalesce(sum(jumlah),0) into v_dibayar
    from pembayaran where pesanan_id = new.pesanan_id;
  update pesanan
     set dibayar = v_dibayar,
         lunas   = (v_dibayar >= total)
   where id = new.pesanan_id;
  return new;
end $$;

create trigger trg_hitung_lunas
  after insert or update or delete on pembayaran
  for each row execute function hitung_lunas();

-- =========================================================================
-- 4.5 Produksi memotong bahan (FIFO batch terdekat expired)
-- =========================================================================
create or replace function catat_produksi(
  p_produk_id int, p_jumlah int, p_catatan text default null
) returns bigint
language plpgsql security definer
as $$
declare
  v_produksi_id bigint;
  v_resep       resep;
  v_ri          record;
  v_pakai       numeric(12,3);
  v_batch       bigint;
begin
  select * into v_resep from resep where produk_id = p_produk_id;

  insert into produksi (produk_id, jumlah_hasil, potong_stok, catatan, created_by)
  values (p_produk_id, p_jumlah, found, p_catatan, auth.uid())
  returning id into v_produksi_id;

  if not found then
    return v_produksi_id;   -- B-22: resep belum ada, produksi tetap tercatat tanpa potong stok
  end if;

  for v_ri in select * from resep_item where resep_id = v_resep.id loop
    v_pakai := v_ri.jumlah * p_jumlah / greatest(v_resep.hasil_jumlah, 1);

    select id into v_batch
      from bahan_batch
     where bahan_id = v_ri.bahan_id
     order by tgl_expired nulls last, tgl_masuk
     limit 1;

    insert into pergerakan_stok (bahan_id, batch_id, jenis, jumlah, produksi_id, created_by)
    values (v_ri.bahan_id, v_batch, 'PRODUKSI', -v_pakai, v_produksi_id, auth.uid());
  end loop;

  return v_produksi_id;
end $$;

-- =========================================================================
-- 4.6 updated_at otomatis
-- =========================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger trg_produk_updated  before update on produk  for each row execute function set_updated_at();
create trigger trg_pesanan_updated before update on pesanan for each row execute function set_updated_at();
create trigger trg_profil_updated  before update on profil  for each row execute function set_updated_at();
