# Schema — Nyumil Dimsum

**Versi:** 1.0 · 7 Agustus 2026 · PostgreSQL 15 (Supabase)

Nama tabel & kolom memakai Bahasa Indonesia snake_case supaya data mentahnya tetap bisa dibaca lewat SQL tanpa kamus.

---

## 1. Peta hubungan

```
profil
  └─ mencatat ──► pesanan ──┬─► pesanan_item ──► pesanan_item_opsi
                            ├─► pembayaran
                            └─► pesanan_log

kategori_produk ──► produk ──┬─► grup_pilihan ──► opsi_pilihan
                             ├─► resep ──► resep_item ──► bahan
                             └─► produksi

pelanggan ──► pesanan

bahan ──┬─► bahan_batch ──► pergerakan_stok
        └─► resep_item

counter_harian     (nomor antrian per hari)
pengeluaran        (belanja bahan & operasional)
tutup_kasir        (rekap + kunci hari)
pengaturan         (nama kedai, rekening, batas stok, dll)
```

---

## 2. Enum

```sql
-- db/001_schema.sql
create type peran_pengguna    as enum ('PEMILIK', 'KASIR', 'ADMIN');
create type kanal_pesanan     as enum ('DINE_IN', 'BUNGKUS', 'WA');
create type status_pesanan    as enum ('DRAFT','DIKONFIRMASI','DIBUAT','SIAP','SELESAI','BATAL');
create type metode_bayar      as enum ('TUNAI','QRIS','TRANSFER','BELUM_BAYAR');
create type kategori_bahan    as enum ('PROTEIN','SAYURAN','BUMBU','BUAH','DAIRY','KARBO','LAINNYA');
create type tempat_simpan     as enum ('FREEZER','KULKAS','SUHU_RUANG');
create type jenis_pergerakan  as enum ('MASUK','KELUAR','PRODUKSI','PENYESUAIAN','RUSAK');
create type satuan_ukur       as enum ('KG','GRAM','LITER','ML','PCS','BUNGKUS','PAK','IKAT');
```

---

## 3. Tabel inti

### 3.1 Pengguna
```sql
create table profil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  peran       peran_pengguna not null default 'KASIR',
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### 3.2 Katalog
```sql
create table kategori_produk (
  id         serial primary key,
  nama       text not null unique,
  urutan     int not null default 0,
  ikon       text,
  aktif      boolean not null default true
);

create table produk (
  id            serial primary key,
  kategori_id   int not null references kategori_produk(id),
  nama          text not null,
  harga         integer not null check (harga >= 0),   -- rupiah bulat
  satuan_jual   text not null default 'porsi',          -- porsi / pcs / pack
  gambar_url    text,
  urutan        int not null default 0,
  aktif         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on produk (kategori_id) where aktif;

-- Kelompok pilihan, contoh: "Cara Masak" (wajib), "Level Pedas" (wajib), "Tambahan" (opsional)
create table grup_pilihan (
  id           serial primary key,
  produk_id    int not null references produk(id) on delete cascade,
  nama         text not null,
  wajib        boolean not null default true,
  pilih_banyak boolean not null default false,
  urutan       int not null default 0
);

create table opsi_pilihan (
  id             serial primary key,
  grup_id        int not null references grup_pilihan(id) on delete cascade,
  nama           text not null,
  harga_tambahan integer not null default 0 check (harga_tambahan >= 0),
  urutan         int not null default 0,
  aktif          boolean not null default true
);
```

### 3.3 Pelanggan
```sql
create table pelanggan (
  id          serial primary key,
  nama        text not null,
  no_wa       text unique,                -- format 628xxxxxxxxxx, dinormalkan sebelum simpan
  alamat      text,
  catatan     text,                       -- "biasanya minta pedas banget"
  created_at  timestamptz not null default now()
);
```

### 3.4 Pesanan
```sql
create table counter_harian (
  tanggal        date primary key,
  nomor_terakhir int not null default 0
);

create table pesanan (
  id                 bigserial primary key,
  client_ref         uuid unique,               -- anti dobel-simpan dari HP
  nomor_antrian      int not null,
  tanggal_operasi    date not null,             -- tanggal WIB, dasar semua laporan harian
  kanal              kanal_pesanan not null,
  status             status_pesanan not null default 'DIKONFIRMASI',

  pelanggan_id       int references pelanggan(id),
  nama_pelanggan     text,
  no_wa              text,
  waktu_ambil        timestamptz,
  diantar            boolean not null default false,
  alamat_antar       text,

  total              integer not null default 0 check (total >= 0),
  dibayar            integer not null default 0 check (dibayar >= 0),
  lunas              boolean not null default false,
  kasbon             boolean not null default false,

  dikonfirmasi_pelanggan boolean not null default false,  -- khusus kanal WA
  catatan            text,
  alasan_batal       text,

  created_by         uuid references profil(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (tanggal_operasi, nomor_antrian),
  constraint wa_wajib_identitas check (
    kanal <> 'WA' or (nama_pelanggan is not null and no_wa is not null)
  ),
  constraint batal_wajib_alasan check (
    status <> 'BATAL' or (alasan_batal is not null and length(alasan_batal) >= 5)
  ),
  constraint kasbon_wajib_nama check (
    not kasbon or nama_pelanggan is not null
  )
);
create index on pesanan (tanggal_operasi, status);
create index on pesanan (status) where status in ('DIKONFIRMASI','DIBUAT','SIAP');

create table pesanan_item (
  id             bigserial primary key,
  pesanan_id     bigint not null references pesanan(id) on delete cascade,
  produk_id      int references produk(id),          -- referensi saja, bukan sumber data
  nama_produk    text not null,                      -- SNAPSHOT
  harga_satuan   integer not null,                   -- SNAPSHOT (sudah termasuk 0 opsi)
  jumlah         int not null check (jumlah > 0),
  catatan        text,
  subtotal       integer not null default 0,
  selesai_dibuat boolean not null default false,     -- centang di layar dapur
  urutan         int not null default 0
);
create index on pesanan_item (pesanan_id);

create table pesanan_item_opsi (
  id              bigserial primary key,
  item_id         bigint not null references pesanan_item(id) on delete cascade,
  opsi_id         int references opsi_pilihan(id),
  nama_grup       text not null,      -- SNAPSHOT, mis. "Level Pedas"
  nama_opsi       text not null,      -- SNAPSHOT, mis. "Pedas Sedang"
  harga_tambahan  integer not null default 0
);
create index on pesanan_item_opsi (item_id);

create table pembayaran (
  id          bigserial primary key,
  pesanan_id  bigint not null references pesanan(id) on delete cascade,
  metode      metode_bayar not null,
  jumlah      integer not null check (jumlah > 0),
  uang_diterima integer,                -- untuk tunai, dasar hitung kembalian
  referensi   text,                     -- no. transfer / catatan QRIS
  created_by  uuid references profil(id),
  created_at  timestamptz not null default now()
);
create index on pembayaran (pesanan_id);

create table pesanan_log (
  id           bigserial primary key,
  pesanan_id   bigint not null references pesanan(id) on delete cascade,
  kejadian     text not null,          -- 'DIBUAT','UBAH_STATUS','UBAH_ITEM','BATAL','UBAH_SETELAH_KONFIRMASI'
  dari_status  status_pesanan,
  ke_status    status_pesanan,
  alasan       text,
  detail       jsonb,
  oleh         uuid references profil(id),
  created_at   timestamptz not null default now()
);
create index on pesanan_log (pesanan_id, created_at);
```

### 3.5 Bahan & stok
```sql
create table bahan (
  id             serial primary key,
  nama           text not null,
  kategori       kategori_bahan not null,
  satuan         satuan_ukur not null,
  tempat         tempat_simpan not null default 'FREEZER',
  stok_minimum   numeric(12,3) not null default 0,
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (nama, satuan)
);
create index on bahan (kategori) where aktif;

create table bahan_batch (
  id           bigserial primary key,
  bahan_id     int not null references bahan(id),
  tgl_masuk    date not null default (now() at time zone 'Asia/Jakarta')::date,
  tgl_expired  date,
  harga_beli   integer,                       -- total rupiah batch ini, untuk hitung modal
  catatan      text,
  created_at   timestamptz not null default now()
);
create index on bahan_batch (bahan_id, tgl_expired nulls last);

create table pergerakan_stok (
  id           bigserial primary key,
  bahan_id     int not null references bahan(id),
  batch_id     bigint references bahan_batch(id),
  jenis        jenis_pergerakan not null,
  jumlah       numeric(12,3) not null,   -- positif = masuk, negatif = keluar
  alasan       text,
  produksi_id  bigint,                   -- diisi kalau jenis = PRODUKSI
  created_by   uuid references profil(id),
  created_at   timestamptz not null default now(),
  constraint penyesuaian_wajib_alasan check (
    jenis <> 'PENYESUAIAN' or (alasan is not null and length(alasan) >= 3)
  ),
  constraint arah_jumlah check (
    (jenis = 'MASUK' and jumlah > 0)
    or (jenis in ('KELUAR','PRODUKSI','RUSAK') and jumlah < 0)
    or (jenis = 'PENYESUAIAN')
  )
);
create index on pergerakan_stok (bahan_id, created_at);
```

### 3.6 Resep & produksi
```sql
create table resep (
  id            serial primary key,
  produk_id     int not null unique references produk(id) on delete cascade,
  hasil_jumlah  int not null default 1,     -- satu resep menghasilkan berapa porsi/pcs
  catatan       text
);

create table resep_item (
  id         serial primary key,
  resep_id   int not null references resep(id) on delete cascade,
  bahan_id   int not null references bahan(id),
  jumlah     numeric(12,3) not null check (jumlah > 0),
  unique (resep_id, bahan_id)
);

create table produksi (
  id            bigserial primary key,
  produk_id     int not null references produk(id),
  jumlah_hasil  int not null check (jumlah_hasil > 0),
  tanggal       date not null default (now() at time zone 'Asia/Jakarta')::date,
  potong_stok   boolean not null default true,
  catatan       text,
  created_by    uuid references profil(id),
  created_at    timestamptz not null default now()
);
```

### 3.7 Keuangan & pengaturan
```sql
create table pengeluaran (
  id          bigserial primary key,
  tanggal     date not null default (now() at time zone 'Asia/Jakarta')::date,
  keterangan  text not null,
  kategori    text not null default 'BAHAN',   -- BAHAN / OPERASIONAL / LAINNYA
  jumlah      integer not null check (jumlah > 0),
  created_by  uuid references profil(id),
  created_at  timestamptz not null default now()
);

create table tutup_kasir (
  tanggal          date primary key,
  total_omzet      integer not null,
  total_tunai      integer not null,
  total_qris       integer not null,
  total_transfer   integer not null,
  jumlah_pesanan   int not null,
  uang_fisik       integer,
  selisih          integer,
  catatan          text,
  ditutup_oleh     uuid references profil(id),
  ditutup_at       timestamptz not null default now()
);

create table pengaturan (
  kunci  text primary key,
  nilai  jsonb not null
);
-- contoh isi: nama_kedai, alamat, rekening, teks_footer_struk, batas_expired_hari
```

---

## 4. Fungsi

### 4.1 Nomor antrian (anti nomor dobel)
```sql
-- db/002_functions.sql
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
```
`INSERT ... ON CONFLICT DO UPDATE` mengunci baris counter di dalam satu pernyataan, jadi dua perangkat yang menyimpan bersamaan tidak mungkin mendapat nomor sama. Kalau transaksi gagal setelah nomor terambil, nomor itu hangus — dan itu memang diinginkan: nomor antrian boleh bolong, yang tidak boleh adalah nomor kembar.

### 4.2 Buat pesanan (satu transaksi utuh)
```sql
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
```

**Catatan:** total dihitung di sini dari harga produk dan opsi di database — angka total yang dikirim HP tidak dipakai sama sekali (aturan B-08).

### 4.3 Penjaga alur status
```sql
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
```

### 4.4 Pembayaran menentukan lunas
```sql
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
```

### 4.5 Produksi memotong bahan (FIFO batch terdekat expired)
```sql
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
```

### 4.6 `updated_at` otomatis
```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger trg_produk_updated  before update on produk  for each row execute function set_updated_at();
create trigger trg_pesanan_updated before update on pesanan for each row execute function set_updated_at();
create trigger trg_profil_updated  before update on profil  for each row execute function set_updated_at();
```

---

## 5. View untuk layar

```sql
-- Antrian dapur
create view v_antrian_dapur as
select p.id, p.nomor_antrian, p.kanal, p.status, p.nama_pelanggan, p.waktu_ambil,
       count(i.id)                            as total_item,
       count(i.id) filter (where i.selesai_dibuat) as item_selesai,
       p.created_at
from pesanan p
join pesanan_item i on i.pesanan_id = p.id
where p.status in ('DIKONFIRMASI','DIBUAT')
group by p.id
order by p.created_at;

-- Stok bahan saat ini
create view v_stok_bahan as
select b.id, b.nama, b.kategori, b.satuan, b.tempat, b.stok_minimum,
       coalesce(sum(g.jumlah), 0) as stok,
       (coalesce(sum(g.jumlah),0) <= b.stok_minimum) as menipis,
       (select min(tgl_expired) from bahan_batch bb
         where bb.bahan_id = b.id and bb.tgl_expired is not null) as expired_terdekat
from bahan b
left join pergerakan_stok g on g.bahan_id = b.id
where b.aktif
group by b.id;

-- Penjualan harian
create view v_penjualan_harian as
select tanggal_operasi as tanggal,
       count(*)                                          as jumlah_pesanan,
       sum(total)                                        as omzet,
       sum(total) filter (where kanal = 'WA')            as omzet_wa,
       sum(total) filter (where kanal <> 'WA')           as omzet_kedai,
       sum(total) filter (where not lunas)               as belum_terbayar
from pesanan
where status = 'SELESAI'
group by tanggal_operasi;

-- Produk terlaris
create view v_produk_terlaris as
select i.nama_produk,
       sum(i.jumlah)   as terjual,
       sum(i.subtotal) as omzet,
       p.tanggal_operasi
from pesanan_item i
join pesanan p on p.id = i.pesanan_id
where p.status = 'SELESAI'
group by i.nama_produk, p.tanggal_operasi;
```

---

## 6. Row Level Security

```sql
-- db/003_rls.sql
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
```

**Tidak ada policy `DELETE` di mana pun.** Penghapusan dilakukan lewat kolom `aktif`/status (aturan B-05).

---

## 7. Data awal

```sql
-- db/004_seed.sql
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
```
**Harga dan menu di atas hanya contoh — ganti dengan harga asli sebelum dipakai.**

---

## 8. Bentuk payload dari HP

```jsonc
// dikirim ke rpc('buat_pesanan', { p: ... })
{
  "client_ref": "0f4b2a1e-...",     // dibuat di HP dengan crypto.randomUUID()
  "kanal": "WA",
  "nama_pelanggan": "Rina",
  "no_wa": "6281234567890",
  "waktu_ambil": "2026-08-07T16:00:00+07:00",
  "diantar": false,
  "catatan": "sausnya dipisah",
  "items": [
    { "produk_id": 1, "jumlah": 2, "catatan": null,
      "opsi": [{ "opsi_id": 1 }, { "opsi_id": 5 }] },
    { "produk_id": 5, "jumlah": 1, "opsi": [] }
  ]
}
```
Total sengaja tidak dikirim.

---

## 9. Yang sengaja belum dibuat

- Stok produk jadi (berapa dimsum siap jual tersisa) — butuh disiplin catat yang belum tentu sanggup di awal. Ditambahkan di Fase 3 kalau produksi sudah rutin dicatat.
- Diskon & promo — belum ada kebutuhannya, dan menambah kolom diskon sekarang bikin hitungan total lebih rumit tanpa alasan.
- Multi-cabang — tidak ada rencananya.

Kalau nanti dibuat, tambahkan sebagai file migrasi baru; jangan mengubah `001_schema.sql`.
