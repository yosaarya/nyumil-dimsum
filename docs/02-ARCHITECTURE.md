# Architecture — Nyumil Dimsum

**Versi:** 1.0 · 7 Agustus 2026

---

## 1. Keputusan besar (dan alasannya)

Konteksnya: satu pengembang, waktu terbatas, akses komputer cuma di kantor, aplikasi harus **hidup terus** di iPhone istri tanpa perlu diurus tiap minggu. Jadi kriteria nomor satu bukan "canggih", tapi **paling sedikit yang bisa rusak**.

### Rekomendasi: PWA statis + Supabase (managed Postgres)

```
iPhone (Safari, PWA)
        │  HTTPS
        ▼
Frontend statis (HTML + CSS + JS vanilla, modul ES)
di-hosting di Vercel / Netlify / Cloudflare Pages  ← gratis, auto-SSL, deploy dari GitHub
        │  supabase-js
        ▼
Supabase
 ├── PostgreSQL 15 (data + fungsi + trigger + RLS)
 ├── Auth (email + password, 2 akun)
 ├── PostgREST (REST API otomatis dari tabel — tidak perlu tulis backend)
 └── Backup harian otomatis
```

**Kenapa ini, bukan yang seperti Surat Bongkar (Express + Docker + VPS):**

| Aspek | VPS + Docker + Express | Supabase + hosting statis |
|---|---|---|
| Biaya | Sewa VPS bulanan | Rp 0 di tier gratis |
| Perawatan | SSL, update OS, restart container, backup manual | Tidak ada |
| Kalau mati jam 7 malam pas ramai | Harus buka laptop — tapi laptop cuma ada di kantor | Bukan urusan kita |
| Backup | Perlu cron sendiri | Otomatis |
| Yang harus ditulis | Frontend + backend + SQL | Frontend + SQL |

Untuk aplikasi berdua yang jalan tiap hari, beban perawatan itu risiko terbesarnya. Yang tidak berubah: tetap **JS vanilla + Postgres + SQL** — pola yang sudah dikuasai dari Surat Bongkar. Yang hilang cuma lapisan Express dan Docker, dan itu memang yang paling makan waktu.

**Alternatif kalau ingin kendali penuh (Opsi B):** tetap pakai pola Surat Bongkar (frontend statis + Express + Postgres + Docker Compose di VPS). Semua desain, aturan, dan skema di dokumen ini tetap berlaku — yang berubah cuma cara frontend memanggil data (`fetch('/api/...')` ke Express, bukan `supabase.from(...)`). Pisahkan itu di satu file `api.js` supaya bisa ditukar tanpa bongkar seluruh aplikasi.

---

## 2. Struktur folder

```
nyumil-dimsum/
├── index.html                  # satu halaman, tab di bawah (SPA sederhana)
├── manifest.webmanifest
├── sw.js                       # service worker: cache app shell
├── assets/
│   ├── icon-180.png            # apple-touch-icon
│   ├── icon-512.png
│   └── logo.svg
├── css/
│   ├── tokens.css              # variabel warna, spasi, tipografi
│   ├── base.css                # reset + elemen dasar
│   └── components.css          # kartu, tombol, sheet, badge
└── js/
    ├── app.js                  # bootstrap, routing tab, session
    ├── api.js                  # SATU-SATUNYA file yang tahu soal Supabase
    ├── store.js                # state keranjang di memori + localStorage
    ├── format.js               # rupiah, tanggal, jam (id-ID, Asia/Jakarta)
    ├── ui.js                   # helper render, toast, modal, sheet
    └── views/
        ├── kasir.js
        ├── wa.js
        ├── dapur.js
        ├── stok.js
        ├── produksi.js
        └── laporan.js

db/
├── 001_schema.sql              # tabel, enum, index
├── 002_functions.sql           # nomor antrian, potong stok
├── 003_rls.sql                 # kebijakan akses
├── 004_seed.sql                # kategori + menu awal
└── migrations/                 # perubahan berikutnya, bernomor, tidak pernah diedit ulang
```

Aturan: **satu view = satu file JS**, tidak ada file lebih dari ±400 baris. Kalau lewat, pecah.

---

## 3. Lapisan data

### 3.1 Semua akses lewat `api.js`
Tidak ada file lain yang boleh memanggil Supabase langsung. Isinya fungsi-fungsi domain, bukan query mentah:

```js
// api.js — contoh bentuk
export async function buatPesanan(payload) { ... }   // panggil RPC create_order
export async function daftarAntrian() { ... }
export async function tandaiItemSelesai(itemId) { ... }
export async function stokBahan({ kategori }) { ... }
```

Kalau nanti pindah ke Express, cuma file ini yang ditulis ulang.

### 3.2 Operasi kritis dilakukan di database, bukan di JS
Yang **wajib** jadi fungsi PostgreSQL (`SECURITY DEFINER`), karena tidak boleh salah walau ada dua perangkat menyimpan bersamaan:

| Fungsi | Kenapa harus di DB |
|---|---|
| `create_order(...)` | Nomor antrian + simpan item + snapshot harga harus jadi satu transaksi utuh |
| `next_order_number(tgl)` | Pakai `SELECT ... FOR UPDATE` pada tabel counter — pola yang sama dengan No. SJ di Surat Bongkar |
| `catat_produksi(...)` | Potong banyak baris stok bahan + tambah stok produk, harus atomik |
| `batalkan_pesanan(id, alasan)` | Wajib menulis alasan ke log; tidak boleh ada jalur hapus |

JS tidak boleh menghitung total sendiri lalu mengirim angkanya. **Total dihitung ulang di database** dari harga item; angka dari frontend hanya untuk ditampilkan.

### 3.3 Snapshot, bukan referensi
`order_items` menyimpan `nama_produk` dan `harga_satuan` **sebagai teks/angka saat itu**, bukan cuma `product_id`. Kalau harga naik bulan depan, struk lama tidak ikut berubah.

---

## 4. Alur transaksi kasir (teknis)

```
[keranjang di memori + localStorage]
        │ tombol "Cek Pesanan"
        ▼
[layar konfirmasi]  ← tidak ada panggilan jaringan di sini
        │ tombol "Ya, Buat Pesanan"
        ▼
supabase.rpc('create_order', { channel, customer, items, payment })
        │
        ├── sukses → kosongkan keranjang, tampilkan nomor antrian
        └── gagal  → JANGAN kosongkan keranjang.
                     Tampilkan: "Gagal simpan. Cek sinyal, lalu coba lagi."
                     Tombol [Coba Lagi] mengirim payload yang sama.
```

Payload disimpan di `localStorage` dengan kunci `pending_order` sampai berhasil. Kalau aplikasi tertutup di tengah jalan, saat dibuka lagi muncul: *"Ada 1 pesanan belum tersimpan. Kirim sekarang?"*

**Idempotensi:** payload menyertakan `client_ref` (UUID dibuat di HP). Kolom `orders.client_ref` UNIQUE — kalau tombol tertekan dua kali karena koneksi lambat, pesanan tetap satu.

---

## 5. Autentikasi & hak akses

- Supabase Auth, email + password. Dua akun: pemilik dan admin.
- Tabel `profiles` menyimpan `role` (`PEMILIK`, `KASIR`, `ADMIN`).
- Sesi disimpan panjang (`persistSession: true`) — **jangan pernah paksa login ulang tiap buka aplikasi**; kalau tiap pagi harus login, aplikasinya akan ditinggalkan.
- Row Level Security aktif di semua tabel. Aturannya sederhana dan jujur: pengguna yang login boleh baca-tulis data operasional; hanya `PEMILIK`/`ADMIN` yang boleh ubah harga produk dan lihat laporan keuangan.

---

## 6. PWA & hal khusus iPhone

`manifest.webmanifest`:
```json
{
  "name": "Nyumil Dimsum",
  "short_name": "Nyumil",
  "start_url": "/?src=pwa",
  "display": "standalone",
  "background_color": "#0E3B2E",
  "theme_color": "#0E3B2E",
  "orientation": "portrait",
  "icons": [
    { "src": "/assets/icon-180.png", "sizes": "180x180", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Yang harus ada di `index.html` supaya benar di iOS:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/assets/icon-180.png">
```

Catatan iOS yang sering bikin masalah:
- **Safari otomatis zoom** kalau `font-size` input < 16px → semua input minimal `16px`.
- Pakai `100dvh`, bukan `100vh` (bar Safari bikin `100vh` meleset).
- Tab bar bawah wajib `padding-bottom: env(safe-area-inset-bottom)`.
- Cache service worker harus punya versi (`CACHE = 'nyumil-v3'`). Kalau tidak, versi lama nempel dan bingung sendiri kenapa perubahan tidak muncul.
- Notifikasi push hanya jalan di iOS 16.4+ **dan** setelah dipasang ke layar utama. Jangan andalkan ini di Fase 1.
- Clipboard (`navigator.clipboard.writeText`) di iOS **harus dipanggil langsung di dalam event ketukan**, bukan setelah `await`. Siapkan teks rekapnya dulu, baru salin saat tombol ditekan.

---

## 7. Waktu & angka

Dua sumber bug yang sudah pernah kejadian di proyek sebelumnya — jangan diulang:

- **Zona waktu:** semua kolom waktu `timestamptz`. Setiap query yang berhubungan dengan "hari ini" wajib pakai `(created_at AT TIME ZONE 'Asia/Jakarta')::date`. Jangan pernah pakai `toISOString()` untuk menentukan tanggal — itu UTC, dan laporan harian akan berganti jam 07.00 pagi.
- **Uang:** disimpan sebagai `integer` rupiah penuh. Tidak ada `float`. Tampilkan dengan `toLocaleString('id-ID')`.
- **Jumlah stok:** `numeric(12,3)` (karena ada 0,5 kg dan 250 gram).

---

## 8. Deploy

```
Komputer kantor ──git push──► GitHub ──auto──► Vercel (frontend, live <1 menit)
                                     
SQL: buka Supabase SQL Editor → tempel isi file migrasi bernomor → Run
```

Aturan migrasi: file yang sudah pernah dijalankan **tidak pernah diedit**. Perubahan berikutnya = file baru `migrations/005_....sql`. Simpan catatan nomor migrasi terakhir yang sudah jalan di `db/README.md`.

**Sumber kebenaran adalah repo GitHub.** Sebelum mengedit kode di sesi/komputer baru, tarik dulu versi terbaru dari repo — jangan pernah mengedit di atas salinan lokal lama.

---

## 9. Backup

| Lapisan | Cara | Frekuensi |
|---|---|---|
| Otomatis | Backup bawaan Supabase | Harian |
| Manual | Tombol **Ekspor Data** di tab Laporan → unduh CSV pesanan + stok | Mingguan (ingatkan lewat badge di app) |
| Kode | GitHub | Tiap kali diubah |

---

## 10. Peta jalan teknis

| Tahap | Isi | Perkiraan |
|---|---|---|
| 0 | Buat proyek Supabase, jalankan `001`–`004`, isi menu asli | 1 hari |
| 1 | Kerangka PWA: tab, login, tokens.css, `api.js` | 3 hari |
| 2 | Kasir + layar konfirmasi + `create_order` | 1 minggu |
| 3 | Dapur + pesanan WA + rekap salin | 1 minggu |
| 4 | Laporan harian + riwayat | 3 hari |
| 5 | **Dipakai di kedai seminggu penuh. Perbaiki keluhan. Tidak menambah fitur.** | 1 minggu |
| 6 | Stok bahan + resep + produksi | 1–2 minggu |
| 7 | Struk, pengeluaran, tutup kasir | 1 minggu |

Tahap 5 tidak boleh dilewati.
