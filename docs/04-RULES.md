# Rules — Nyumil Dimsum

**Versi:** 1.0 · 7 Agustus 2026

Dokumen ini dibagi dua: **aturan bisnis** (perilaku aplikasi yang tidak boleh dilanggar) dan **aturan pengembangan** (cara menulis kodenya). File ini juga dipakai sebagai konteks kalau minta bantuan AI menulis kode — tempel isinya sebagai `CLAUDE.md` / `.cursorrules` di akar repo.

---

# BAGIAN A — Aturan bisnis

## A1. Pesanan (paling penting — ini akar masalahnya)

| Kode | Aturan |
|---|---|
| **B-01** | Tidak ada pesanan yang bisa tersimpan tanpa melewati layar **Cek Pesanan**. Tidak ada jalan pintas, tidak ada tombol "simpan cepat", tidak ada pengaturan untuk mematikannya. |
| **B-02** | Produk yang punya kelompok pilihan wajib tidak bisa masuk keranjang sebelum pilihannya dipilih. Tidak ada nilai bawaan diam-diam. |
| **B-03** | Varian dan catatan item **selalu** ditampilkan di layar konfirmasi, di dapur, dan di struk — termasuk saat nilainya "Original". |
| **B-04** | Nomor pesanan dibuat di database, urut, dan reset setiap hari jam 00.00 WIB. Dua perangkat yang menyimpan bersamaan tidak boleh mendapat nomor yang sama. |
| **B-05** | Pesanan tidak pernah dihapus. Yang ada hanya status **BATAL** dengan alasan wajib diisi (minimal 5 karakter). |
| **B-06** | Setiap perubahan pesanan setelah status `DIKONFIRMASI` dicatat di log kejadian: siapa, kapan, dari apa ke apa, alasannya. |
| **B-07** | Harga dan nama produk disalin ke baris pesanan saat pesanan dibuat. Mengubah harga produk tidak boleh mengubah pesanan yang sudah ada. |
| **B-08** | Total dihitung ulang di database dari baris item. Angka total yang dikirim dari HP hanya untuk ditampilkan, tidak pernah dipercaya. |
| **B-09** | Pesanan WA tidak bisa berpindah ke status `DIBUAT` sebelum ditandai **pelanggan sudah konfirmasi**. |
| **B-10** | Pesanan hanya bisa berstatus `SIAP` kalau seluruh itemnya sudah dicentang di dapur. |
| **B-11** | Pesanan hanya bisa `SELESAI` kalau pembayarannya `LUNAS` atau ditandai eksplisit sebagai **kasbon** dengan nama pelanggan terisi. |

### Alur status yang sah
```
DRAFT ──► DIKONFIRMASI ──► DIBUAT ──► SIAP ──► SELESAI
  │            │              │          │
  └────────────┴──────────────┴──────────┴──────► BATAL (wajib alasan)
```
Perpindahan lain ditolak oleh database, bukan cuma disembunyikan di antarmuka. Mundur satu langkah (mis. `SIAP` → `DIBUAT`) hanya boleh oleh peran `PEMILIK`/`ADMIN` dan wajib alasan.

## A2. Uang

| Kode | Aturan |
|---|---|
| **B-12** | Semua nilai uang disimpan sebagai bilangan bulat rupiah. Tidak ada pecahan, tidak ada tipe `float`. |
| **B-13** | Metode bayar: `TUNAI`, `QRIS`, `TRANSFER`, `BELUM_BAYAR`. Satu pesanan boleh punya lebih dari satu pembayaran (bayar sebagian). |
| **B-14** | `LUNAS` ditentukan dari jumlah pembayaran ≥ total pesanan, bukan dari centang manual. |
| **B-15** | Kembalian dihitung aplikasi dan ditampilkan besar-besar. Tidak dihitung di kepala. |
| **B-16** | Hari yang sudah **Tutup Kasir** terkunci. Mengubah pesanan di hari terkunci butuh peran `PEMILIK` + alasan, dan tercatat di log. |

## A3. Stok & produksi

| Kode | Aturan |
|---|---|
| **B-17** | Stok bahan tidak pernah diubah dengan menimpa angka. Semua perubahan lewat baris **pergerakan stok** (`MASUK`, `KELUAR`, `PRODUKSI`, `PENYESUAIAN`, `RUSAK`). Stok saat ini = jumlah pergerakan. |
| **B-18** | Penyesuaian manual (`PENYESUAIAN`) wajib diisi alasan. |
| **B-19** | Stok boleh minus, tapi diberi tanda merah — karena di kedai nyata bahan kadang terpakai duluan baru dicatat. Jangan menghalangi pekerjaan, cukup beri tanda. |
| **B-20** | Bahan dicatat per batch dengan tanggal kedaluwarsa sendiri. Pemakaian mengambil batch yang kedaluwarsa paling dekat lebih dulu (FIFO). |
| **B-21** | Kategori bahan tetap tujuh: `PROTEIN`, `SAYURAN`, `BUMBU`, `BUAH`, `DAIRY`, `KARBO`, `LAINNYA`. Tidak bisa ditambah pengguna (supaya laporannya konsisten). |
| **B-22** | Produksi memotong bahan berdasarkan resep. Kalau resep belum ada, produksi tetap bisa dicatat tanpa potong bahan — dengan peringatan "resep belum diisi". |
| **B-23** | Menjual produk **tidak** langsung memotong stok bahan. Yang memotong bahan adalah produksi. Ini sesuai cara kerja nyata: dimsum dibuat sekaligus banyak, lalu dijual satuan. |

## A4. Data & waktu

| Kode | Aturan |
|---|---|
| **B-24** | Zona waktu operasional **Asia/Jakarta**. Semua pengelompokan "hari ini" memakai `(waktu AT TIME ZONE 'Asia/Jakarta')::date`. |
| **B-25** | Semua tabel punya `created_at`, `updated_at`, dan `created_by`. |
| **B-26** | Nomor WA disimpan dalam format `628xxxxxxxxxx` (dinormalkan saat disimpan: buang spasi, tanda hubung, ubah awalan `0` dan `+62`). |
| **B-27** | Nama pelanggan tidak wajib untuk pesanan kedai, tapi **wajib** untuk pesanan WA dan kasbon. |

---

# BAGIAN B — Aturan pengembangan

## B1. Prinsip

1. **Yang paling sedikit bisa rusak, itu yang dipilih.** Ini aplikasi yang dipakai tiap hari oleh satu orang non-teknis. Tidak ada yang mengurusnya kalau bermasalah jam 7 malam.
2. **Selesaikan Fase 1 sampai dipakai nyata sebelum menyentuh Fase 2.** Aplikasi setengah jadi yang lengkap fiturnya lebih buruk daripada kasir sederhana yang benar-benar dipakai.
3. **Kalau ragu antara "pintar" dan "jelas", pilih jelas.**

## B2. Kode

- JavaScript vanilla, modul ES (`<script type="module">`). **Tanpa framework, tanpa proses build** di Fase 1–2.
- Tanpa TypeScript untuk sekarang; pakai JSDoc untuk fungsi yang bentuk datanya penting.
- Satu berkas maksimal ±400 baris. Lewat itu, pecah per view.
- Nama fungsi & variabel: **Bahasa Inggris** untuk hal teknis (`fetchOrders`, `renderCart`), **Bahasa Indonesia** untuk istilah domain yang tidak ada padanan pasnya (`ritase`, `bungkus`, `kasbon`). Konsisten, jangan campur dalam satu nama.
- Nama tabel & kolom database: **snake_case Bahasa Indonesia** (`pesanan`, `nomor_antrian`, `harga_satuan`) — supaya kalau nanti butuh baca data mentah lewat SQL, masih bisa dimengerti.
- Tidak ada `var`. Pakai `const` dulu, `let` kalau memang berubah.
- Tidak ada perpustakaan pihak ketiga kecuali: `supabase-js`, dan (kalau perlu struk) `html2canvas` + `jspdf` dengan versi dikunci.

## B3. Larangan keras

```
❌ JANGAN menghitung total di frontend lalu menyimpan angka itu sebagai kebenaran
❌ JANGAN memakai toISOString() untuk menentukan tanggal operasional
❌ JANGAN menyimpan uang sebagai float atau string
❌ JANGAN menambah endpoint/tabel baru tanpa memperbarui 05-SCHEMA.md
❌ JANGAN menghapus baris (DELETE). Pakai status/soft delete
❌ JANGAN membuat nomor antrian di JavaScript
❌ JANGAN mengosongkan keranjang sebelum server memastikan pesanan tersimpan
❌ JANGAN menaruh kunci service_role Supabase di frontend (hanya anon key)
❌ JANGAN memaksa login ulang setiap membuka aplikasi
❌ JANGAN mengedit file migrasi SQL yang sudah pernah dijalankan
```

## B4. Alur kerja

- Sumber kebenaran adalah repo GitHub. **Sebelum mengedit di komputer/sesi baru, tarik dulu versi terbaru.** Jangan pernah mengedit di atas salinan lama — ini pernah menyebabkan fitur yang sudah jadi hilang di proyek sebelumnya.
- Satu commit = satu perubahan yang bisa dijelaskan dalam satu kalimat.
- Migrasi SQL bernomor urut, tidak pernah diedit ulang, dan nomor terakhir yang sudah dijalankan dicatat di `db/README.md`.
- Sebelum deploy perubahan yang menyentuh pesanan atau uang: uji ulang daftar di B6.

## B5. Kalau minta bantuan AI menulis kode

Tempel bagian ini beserta `05-SCHEMA.md` sebagai konteks. Aturan tambahan:
- Berikan **file utuh yang siap ditimpa**, bukan potongan diff atau petunjuk cari-ganti.
- Sebutkan file mana saja yang berubah dan letaknya di folder.
- Jangan mengubah skema database tanpa menuliskan file migrasi barunya sekalian.
- Jangan mengganti pendekatan yang sudah dipakai (mis. mengubah vanilla JS jadi React) tanpa diminta.
- Kalau ada bagian dokumen ini yang bertabrakan dengan permintaan, sebutkan tabrakannya, jangan diam-diam dilanggar.

## B6. Daftar uji sebelum rilis (jalankan di iPhone sungguhan)

**Kasir**
- [ ] Tambah 3 produk, salah satunya punya varian wajib → varian tidak bisa dilewati
- [ ] Layar Cek Pesanan menampilkan semua varian
- [ ] Simpan → nomor antrian keluar, muncul di tab Dapur
- [ ] Matikan data seluler → simpan → muncul pesan galat, **keranjang tidak hilang** → hidupkan data → Coba Lagi → berhasil, dan pesanan **hanya satu**
- [ ] Tekan tombol simpan dua kali cepat → tetap satu pesanan

**Dapur**
- [ ] Tombol Siap terkunci sampai semua item dicentang
- [ ] Pesanan lewat jam ambil diberi tanda merah

**WA**
- [ ] Rekap tersalin ke clipboard dengan sekali ketuk dan bisa ditempel di WhatsApp
- [ ] Pesanan tidak bisa masuk dapur sebelum ditandai dikonfirmasi pelanggan

**Uang**
- [ ] Bayar tunai Rp 100.000 untuk total Rp 58.000 → kembalian Rp 42.000
- [ ] Laporan harian jam 23.50 dan jam 00.10 memisahkan hari dengan benar

**iPhone**
- [ ] Bisa dipasang ke layar utama dan terbuka tanpa bar Safari
- [ ] Tidak ada input yang bikin layar zoom sendiri
- [ ] Tab bar tidak tertutup indikator home
- [ ] Setelah deploy versi baru, aplikasi memuat versi baru (bukan cache lama)
