-- db/001_schema.sql — enum, tabel, index, view.
-- Sumber: docs/05-SCHEMA.md. Jangan pernah mengedit file ini setelah dijalankan
-- di Supabase — perubahan berikutnya jadi migrations/00N_....sql baru.

-- =========================================================================
-- 2. Enum
-- =========================================================================
create type peran_pengguna    as enum ('PEMILIK', 'KASIR', 'ADMIN');
create type kanal_pesanan     as enum ('DINE_IN', 'BUNGKUS', 'WA');
create type status_pesanan    as enum ('DRAFT','DIKONFIRMASI','DIBUAT','SIAP','SELESAI','BATAL');
create type metode_bayar      as enum ('TUNAI','QRIS','TRANSFER','BELUM_BAYAR');
create type kategori_bahan    as enum ('PROTEIN','SAYURAN','BUMBU','BUAH','DAIRY','KARBO','LAINNYA');
create type tempat_simpan     as enum ('FREEZER','KULKAS','SUHU_RUANG');
create type jenis_pergerakan  as enum ('MASUK','KELUAR','PRODUKSI','PENYESUAIAN','RUSAK');
create type satuan_ukur       as enum ('KG','GRAM','LITER','ML','PCS','BUNGKUS','PAK','IKAT');

-- =========================================================================
-- 3.1 Pengguna
-- =========================================================================
create table profil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  peran       peran_pengguna not null default 'KASIR',
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =========================================================================
-- 3.2 Katalog
-- =========================================================================
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

-- =========================================================================
-- 3.3 Pelanggan
-- =========================================================================
create table pelanggan (
  id          serial primary key,
  nama        text not null,
  no_wa       text unique,                -- format 628xxxxxxxxxx, dinormalkan sebelum simpan
  alamat      text,
  catatan     text,                       -- "biasanya minta pedas banget"
  created_at  timestamptz not null default now()
);

-- =========================================================================
-- 3.4 Pesanan
-- =========================================================================
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

-- =========================================================================
-- 3.5 Bahan & stok
-- =========================================================================
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

-- =========================================================================
-- 3.6 Resep & produksi
-- =========================================================================
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

-- =========================================================================
-- 3.7 Keuangan & pengaturan
-- =========================================================================
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

-- =========================================================================
-- 5. View untuk layar
-- =========================================================================
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

create view v_produk_terlaris as
select i.nama_produk,
       sum(i.jumlah)   as terjual,
       sum(i.subtotal) as omzet,
       p.tanggal_operasi
from pesanan_item i
join pesanan p on p.id = i.pesanan_id
where p.status = 'SELESAI'
group by i.nama_produk, p.tanggal_operasi;
