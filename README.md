# Nyumil Dimsum

Aplikasi kasir/POS all-in-one untuk kedai dimsum **Nyumil Dimsum**: kasir, pesanan WhatsApp, dapur, stok bahan, produksi, dan laporan. PWA di iPhone.

## Dokumen perencanaan

| File | Isi |
|---|---|
| [`docs/01-PRD.md`](docs/01-PRD.md) | Masalah, pengguna, alur, daftar fitur + prioritas fase |
| [`docs/02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md) | Pilihan teknologi, struktur folder, deploy |
| [`docs/03-DESIGN.md`](docs/03-DESIGN.md) | Warna, tipografi, komponen, tata letak layar |
| [`docs/04-RULES.md`](docs/04-RULES.md) | Aturan bisnis (B-01…B-27) + aturan pengembangan (juga jadi [`CLAUDE.md`](CLAUDE.md) di akar repo) |
| [`docs/05-SCHEMA.md`](docs/05-SCHEMA.md) | Skema PostgreSQL: tabel, fungsi, trigger, RLS, data awal |

## Stack

- **Frontend**: PWA — HTML + CSS + JavaScript vanilla (modul ES), tanpa framework/build step di Fase 1–2
- **Backend**: Supabase (PostgreSQL 15 + Auth + PostgREST) — tidak ada server yang ditulis sendiri
- **Hosting**: statis (Vercel/Netlify/Cloudflare Pages), gratis, auto-deploy dari GitHub

## Struktur proyek

```
nyumil-dimsum/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
├── css/
│   ├── tokens.css
│   ├── base.css
│   └── components.css
├── js/
│   ├── app.js
│   ├── api.js          # satu-satunya file yang tahu soal Supabase
│   ├── store.js
│   ├── format.js
│   ├── ui.js
│   └── views/
│       ├── kasir.js
│       ├── wa.js
│       ├── dapur.js
│       ├── stok.js
│       ├── produksi.js
│       └── laporan.js
└── db/
    ├── 001_schema.sql
    ├── 002_functions.sql
    ├── 003_rls.sql
    ├── 004_seed.sql
    ├── README.md        # catatan nomor migrasi terakhir yang sudah jalan
    └── migrations/
```

## Langkah pertama

1. Baca `docs/01-PRD.md` bareng istri, terutama bagian **3. Alur utama**.
2. Kumpulkan menu asli + harga asli + semua varian.
3. Buat proyek Supabase, jalankan `db/001_schema.sql` sampai `db/004_seed.sql` di SQL Editor.
4. Isi kredensial Supabase (URL + anon key) di `js/api.js`.
5. Mulai dari tab Kasir (Fase 1). Jangan bikin tab Stok dulu — lihat `docs/01-PRD.md` §4.

## Aturan penting

Sebelum menulis kode apa pun, baca `CLAUDE.md` (aturan bisnis B-01…B-27 dan larangan keras di bagian B3). Dokumen ini juga dipakai sebagai konteks kalau minta bantuan AI menulis kode.
