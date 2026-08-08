# PRD — Nyumil Dimsum

**Versi:** 1.0
**Tanggal:** 7 Agustus 2026
**Pemilik produk:** Istri (pemilik kedai)
**Pengembang:** Yosa (solo)
**Status:** Draft untuk disetujui

---

## 1. Ringkasan

Nyumil Dimsum adalah kedai dimsum yang jualan lewat dua jalur: **offline di kedai** (makan di tempat / bungkus) dan **pesanan WhatsApp**. Saat ini semua dicatat manual, dan beberapa hari lalu terjadi **salah buat pesanan** — pesanan yang dimasak tidak sesuai yang diminta pelanggan.

Aplikasi ini adalah aplikasi *all-in-one* berbasis web (PWA) yang dipasang di layar utama iPhone, isinya:

1. **Kasir (POS)** — catat pesanan kedai, hitung otomatis, cetak/kirim struk
2. **Pesanan WA** — ubah chat jadi pesanan terstruktur + rekap balasan untuk dikonfirmasi pelanggan
3. **Dapur** — daftar antrian yang harus dibuat, dicentang per item
4. **Stok Bahan** — stok freezer/kulkas per kategori bahan + peringatan kedaluwarsa
5. **Produksi** — catat produksi dimsum harian, otomatis potong stok bahan
6. **Laporan** — omzet harian, produk terlaris, tutup kasir

### Masalah utama yang diselesaikan
| # | Masalah sekarang | Dampak |
|---|---|---|
| M1 | Pesanan dicatat di kepala / kertas / chat WA yang ketumpuk | **Salah buat pesanan** → rugi bahan, pelanggan kecewa |
| M2 | Pesanan WA & pesanan kedai campur, tidak ada antrian jelas | Pesanan kelewat / dobel |
| M3 | Hitung total manual | Salah hitung uang |
| M4 | Stok bahan freezer tidak tercatat | Bahan habis mendadak / basi tanpa ketahuan |
| M5 | Tidak tahu omzet & menu terlaris | Susah ambil keputusan belanja |

### Tujuan yang bisa diukur (3 bulan setelah dipakai)
- **T1 — Nol salah pesanan.** Setiap pesanan wajib lewat layar konfirmasi sebelum masuk dapur.
- **T2 — Catat pesanan kedai ≤ 30 detik** dari mulai buka aplikasi sampai tersimpan.
- **T3 — 100% pesanan WA punya rekap tertulis** yang dikirim balik ke pelanggan sebelum dimasak.
- **T4 — Omzet harian selalu ada angkanya**, tanpa perlu menghitung ulang manual.

### Bukan tujuan (jangan dikerjakan dulu)
- Bukan aplikasi untuk pelanggan (pelanggan tetap pesan lewat WA/datang langsung)
- Belum ada integrasi otomatis dengan WhatsApp Business API (biaya + verifikasi bisnis)
- Belum ada ojek online (GoFood/GrabFood) — itu tetap di aplikasi masing-masing
- Belum ada multi-cabang, multi-karyawan dengan shift rumit
- Belum ada akuntansi lengkap (jurnal, pajak)

---

## 2. Pengguna

| Peran | Siapa | Alat | Yang dilakukan |
|---|---|---|---|
| **Pemilik** | Istri | iPhone (utama) | Semua: kasir, WA, dapur, stok, laporan, ubah harga |
| **Pembantu kedai** *(nanti)* | Karyawan | HP Android / tablet | Kasir + dapur saja. Tidak bisa lihat laporan & ubah harga |
| **Admin teknis** | Yosa | Komputer kantor | Backup, perbaikan, ubah menu awal |

**Catatan penting:** perangkat utama adalah **iPhone**, dipakai satu tangan, sambil berdiri, kadang tangan kotor/basah. Ini menentukan semua keputusan desain (tombol besar, jarang mengetik, konfirmasi jelas).

---

## 3. Alur utama

### 3.1 Alur A — Pesanan di kedai (kasir)
```
Buka app → tab KASIR
  → pilih [Dine In] atau [Bungkus]
  → ketuk kartu produk (tambah 1 qty per ketukan)
  → kalau produk punya pilihan wajib (mis. Kukus/Goreng, level pedas)
      → sheet pilihan muncul, wajib dipilih
  → panel kanan/bawah menampilkan daftar + total berjalan
  → tombol [CEK PESANAN]
  → LAYAR KONFIRMASI (huruf besar, satu layar penuh)
      → "Sudah benar?" [Ubah] [Ya, Buat Pesanan]
  → pilih pembayaran: Tunai / QRIS / Transfer / Bayar Nanti
      → kalau Tunai: input uang diterima → tampil kembalian besar
  → SIMPAN → nomor antrian keluar → pesanan masuk tab DAPUR
```

### 3.2 Alur B — Pesanan WhatsApp
```
Chat masuk di WA → buka app → tab PESANAN WA → [+ Pesanan Baru]
  → nama pelanggan + nomor WA (bisa pilih dari pelanggan tersimpan)
  → jam ambil / jam kirim + [Ambil sendiri / Diantar]
  → tambah item (sama seperti kasir)
  → LAYAR KONFIRMASI
  → [Salin Rekap] → teks rekap tersalin → tempel & kirim di WA
  → status pesanan: MENUNGGU KONFIRMASI
  → pelanggan bales "iya betul" → ketuk [Pelanggan Sudah Konfirmasi]
  → baru masuk tab DAPUR
```

**Format rekap yang disalin:**
```
Halo Kak Rina 🙏
Pesanan Nyumil Dimsum #12

1. Dimsum Ayam (Kukus) x2 ........ 30.000
2. Lumpia Udang (Pedas) x1 ....... 18.000
3. Es Teh x2 ...................... 10.000

Total .......................... 58.000
Ambil: hari ini, 16.00
Bayar: Transfer BCA 1234567890 a.n. ...

Mohon dicek dulu ya Kak, kalau sudah betul balas "OK"
biar langsung kami buat 😊
```

### 3.3 Alur C — Dapur
```
Tab DAPUR → daftar antrian urut waktu masuk
  → kartu pesanan: #12 · WA · Rina · ambil 16.00
  → centang tiap item saat selesai dibuat
  → tombol [SIAP] TERKUNCI sampai semua item dicentang
  → [SIAP] → status SIAP → muncul di layar kasir untuk diserahkan
  → [SELESAI] saat sudah diambil/diantar & lunas
```

### 3.4 Alur D — Stok bahan (mengikuti gambar referensi 1)
```
Tab STOK → [+ Tambah Manual] atau [Tambah Cepat]
  1. Pilih Kategori: Protein / Sayuran / Bumbu / Buah / Dairy / Karbo / Lainnya
  2. Nama Bahan (contoh: ayam fillet, udang, kulit pangsit)
  3. Jumlah + satuan (kg / gr / pcs / bungkus / liter)
  4. Tempat simpan: Freezer / Kulkas / Suhu Ruang
  5. Tanggal kedaluwarsa (opsional, tombol [Cek Expired])
  → Simpan
```
Daftar stok menampilkan badge: **Aman** / **Menipis** (di bawah batas minimum) / **Dekat Expired** (≤3 hari) / **Expired**.

### 3.5 Alur E — Produksi
```
Tab PRODUKSI → [Buat Produksi]
  → pilih produk (mis. Dimsum Ayam) → jumlah hasil (mis. 100 pcs)
  → app menampilkan bahan yang akan terpotong dari resep
  → [Simpan] → stok bahan berkurang otomatis, stok produk siap jual bertambah
```

### 3.6 Alur F — Tutup kasir
```
Tab LAPORAN → [Tutup Kasir Hari Ini]
  → tampil: total omzet, rincian per metode bayar, jumlah pesanan, produk terlaris
  → input uang tunai fisik di laci → app hitung selisih
  → [Simpan Tutup Kasir] → hari terkunci (tidak bisa diubah tanpa alasan)
```

---

## 4. Daftar fitur & prioritas

Prioritas memakai MoSCoW. **Fase 1 harus selesai dulu sebelum yang lain disentuh.**

### Fase 1 — Wajib (MVP, target ±3–4 minggu)
| ID | Fitur | Kenapa |
|---|---|---|
| F-01 | Katalog produk + kategori + harga | Dasar semuanya |
| F-02 | Pilihan/varian produk wajib (kukus/goreng, level pedas, saus) | **Penyebab langsung salah pesanan** |
| F-03 | Kasir: dine in / bungkus, hitung otomatis | M1, M3 |
| F-04 | **Layar Cek Pesanan sebelum simpan** | **T1 — fitur paling penting** |
| F-05 | Nomor antrian harian otomatis, tanpa dobel | M2 |
| F-06 | Pesanan WA + rekap teks siap salin | M1, T3 |
| F-07 | Tab Dapur + centang per item | M1 |
| F-08 | Pembayaran + kembalian | M3 |
| F-09 | Riwayat pesanan hari ini + batal (wajib alasan) | Telusur kalau ada masalah |
| F-10 | Laporan omzet harian sederhana | M5, T4 |
| F-11 | PWA bisa dipasang di layar utama iPhone | Syarat dipakai sehari-hari |
| F-12 | Login (2 akun: pemilik & admin) | Keamanan data |

### Fase 2 — Sebaiknya ada (±2–3 minggu)
| ID | Fitur |
|---|---|
| F-13 | Stok bahan per kategori + expired (gambar referensi 1) |
| F-14 | Resep per produk |
| F-15 | Produksi → potong stok bahan otomatis |
| F-16 | Data pelanggan WA + riwayat pesanan mereka |
| F-17 | Catatan pengeluaran (belanja bahan) |
| F-18 | Tutup kasir + hitung selisih uang |
| F-19 | Struk: cetak PDF / bagikan gambar lewat WA |

### Fase 3 — Boleh ada (nanti)
| ID | Fitur |
|---|---|
| F-20 | Mode offline penuh (antrian tersimpan lokal saat internet mati) |
| F-21 | Grafik penjualan mingguan/bulanan |
| F-22 | Diskon & promo (paket, potongan) |
| F-23 | Stok produk jadi (frozen pack) + peringatan habis |
| F-24 | Akun karyawan dengan hak terbatas |
| F-25 | Backup otomatis ke email/Drive |

### Tidak dikerjakan
Integrasi WhatsApp API otomatis, aplikasi pelanggan, loyalty point, kartu member fisik, marketplace.

---

## 5. Kriteria terima (acceptance criteria) fitur kunci

**F-04 Layar Cek Pesanan**
- Muncul selalu, tidak bisa dilewati, untuk semua jalur pesanan (kedai maupun WA)
- Ukuran huruf item minimal 18px, nama varian ditampilkan di baris terpisah dengan warna berbeda
- Tombol utama bertuliskan **"Ya, Buat Pesanan"** (bukan "Simpan"/"Submit")
- Tombol "Ubah" mengembalikan ke keranjang tanpa kehilangan data
- Setelah dikonfirmasi, perubahan item hanya bisa lewat tombol "Ubah Pesanan" yang **wajib isi alasan**

**F-05 Nomor antrian**
- Format `#1`, `#2`, … reset tiap hari jam 00.00 WIB
- Dua perangkat menyimpan bersamaan tidak boleh menghasilkan nomor sama (dijamin di level database, bukan di aplikasi)

**F-07 Tab Dapur**
- Tombol "Siap" nonaktif (abu-abu) selama masih ada item belum dicentang
- Kartu pesanan menampilkan sumber (Kedai / WA) dan jam ambil kalau ada
- Pesanan yang lewat jam ambil diberi tanda merah

**F-06 Rekap WA**
- Satu ketukan menyalin seluruh teks rekap ke clipboard iPhone
- Rekap memuat: nama pelanggan, nomor pesanan, semua item + varian, total, jam ambil, cara bayar
- Status pesanan tidak bisa jadi "dibuat" sebelum ditandai **pelanggan sudah konfirmasi**

---

## 6. Batasan & asumsi

- **Perangkat:** iPhone (Safari). Aplikasi dipasang lewat *Share → Add to Home Screen*.
- **Internet:** kedai pakai data seluler, kadang lemot. Aplikasi harus tetap bisa dibuka cepat; kalau gagal simpan, tampilkan pesan jelas dan jangan hilangkan isi keranjang.
- **Bahasa & format:** semua Bahasa Indonesia, rupiah tanpa desimal (`Rp 58.000`), tanggal `07 Agu 2026`, jam 24 jam, zona waktu **Asia/Jakarta**.
- **Pengembang tunggal:** satu orang, waktu terbatas (akses komputer hanya di kantor). Arsitektur harus yang paling sedikit perawatannya.
- **Biaya:** target biaya bulanan **Rp 0** di awal (pakai tier gratis), maksimal harga domain per tahun.

---

## 7. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Aplikasi malah bikin lambat saat ramai | Ditinggalkan, balik ke kertas | Uji: 1 pesanan 3 item harus ≤30 detik. Kalau gagal, sederhanakan alur |
| Internet mati saat jam ramai | Tidak bisa transaksi | Fase 3 mode offline; sementara: keranjang tersimpan di HP, kirim ulang saat sinyal balik |
| Data hilang | Fatal | Backup otomatis harian dari penyedia database + ekspor manual mingguan |
| Fitur kebanyakan sebelum dipakai | Proyek mandek | Kunci Fase 1. Jangan sentuh stok/produksi sebelum kasir dipakai seminggu penuh |
| Istri tidak nyaman dengan alurnya | Tidak terpakai | Uji langsung di kedai dengan pesanan asli sebelum Fase 2 dimulai |

---

## 8. Ukuran keberhasilan

Dicek setelah 2 minggu pemakaian nyata:
- Jumlah salah pesanan per minggu: **target 0** (sebelumnya ada kejadian)
- Persentase pesanan yang dicatat di aplikasi (bukan di kertas): **target >90%**
- Istri masih pakai aplikasinya tanpa disuruh di hari ke-14: **ya/tidak** ← ini indikator paling jujur
