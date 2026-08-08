# Design — Nyumil Dimsum

**Versi:** 1.0 · 7 Agustus 2026

---

## 1. Arah visual

Dua gambar acuan bicara dua hal berbeda, dan keduanya dipakai:

- **Gambar 2 (POS hijau tua)** → dipakai untuk **cara kerja**: kartu produk besar, panel pesanan yang selalu terlihat, tab kategori di atas, tombol aksi tunggal yang jelas.
- **Gambar 1 (layar bahan, krem hangat, kartu kategori berwarna)** → dipakai untuk **rasa**: latar hangat, kartu berwarna per kategori, tab bar di bawah, langkah bernomor (1 · 2 · 3).

Gabungannya: **merah marun sebagai warna merek dan permukaan aksi; krem hangat sebagai latar kerja sehari-hari.** Marun muncul di bar atas, tab aktif, panel pesanan, dan tombol utama. Sisanya krem supaya layar tidak berat dibaca berjam-jam di kedai yang terang.

> **Update:** warna merek awalnya hijau tua (dari dua gambar acuan generik di atas), lalu diganti **merah marun** supaya cocok dengan logo asli Nyumil Dimsum (marun + emas/putih, maskot kelinci). Prinsip tata letak & komponen di bawah tidak berubah, cuma warnanya — lihat token di §2.

Gambar 2 itu tata letak layar lebar (panel kanan). iPhone portrait tidak muat begitu — panel pesanan jadi **bar melayang di bawah yang bisa ditarik jadi lembar penuh**. Isinya sama persis, cuma posisinya pindah.

**Elemen tanda pengenal (signature):** layar **Cek Pesanan** ditampilkan sebagai **struk kertas** — latar putih gading, huruf mono, tepi bergerigi seperti kertas sobek, titik-titik penghubung antara nama item dan harga. Ini bukan hiasan: bentuk struk membuat orang otomatis membacanya sebagai sesuatu yang harus **diperiksa**, bukan sekadar layar yang di-*next*. Layar inilah yang mencegah salah pesanan, jadi di sinilah keberanian desain dihabiskan. Layar lain dibuat tenang.

---

## 2. Token

```css
/* css/tokens.css */
:root {
  /* --- Warna inti (mengikuti logo asli Nyumil Dimsum) --- */
  --merah-marun:    #7A1F2B;  /* merek, bar atas, panel pesanan, tombol utama */
  --merah-bata:     #A32E3E;  /* permukaan merah lebih terang, kartu di atas marun */
  --merah-muda-terang: #E8A0AC; /* garis, ikon di atas marun, status aktif */
  --krem-kukus:     #FBF3EA;  /* latar aplikasi */
  --putih-gading:   #FFFCF7;  /* kartu, sheet, struk */
  --arang:          #23201C;  /* teks utama di atas krem */
  --abu-kabut:      #8C857C;  /* teks sekunder, label */
  --garis:          #E8DFD2;  /* pembatas */

  /* --- Aksen (dipakai hemat) --- */
  --sambal:         #D6452B;  /* pedas, batal, peringatan, tanda wajib */
  --wijen:          #F2A93B;  /* goreng, stok menipis, jam ambil mendekat */
  --daun-bawang:    #2E8B57;  /* lunas, siap, stok aman */

  /* --- Warna kategori bahan (mengikuti gambar acuan 1) --- */
  --kat-protein:    #E86A4A;
  --kat-sayuran:    #5FA97C;
  --kat-bumbu:      #E0A93C;
  --kat-buah:       #E15C6B;
  --kat-dairy:      #6FA8D6;
  --kat-karbo:      #C08BD1;
  --kat-lainnya:    #9A9184;

  /* --- Tipografi --- */
  --font-merek: "Fraunces", Georgia, serif;              /* judul & nama merek saja */
  --font-ui:    "Plus Jakarta Sans", -apple-system, sans-serif;
  --font-angka: "DM Mono", "Courier New", monospace;     /* harga, nomor antrian, struk */

  --t-xs: 12px;  --t-sm: 14px;  --t-md: 16px;
  --t-lg: 20px;  --t-xl: 26px;  --t-2xl: 34px;  --t-3xl: 46px;

  /* --- Jarak (kelipatan 4) --- */
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px;
  --s5: 24px; --s6: 32px; --s7: 48px;

  /* --- Bentuk --- */
  --r-sm: 10px; --r-md: 16px; --r-lg: 22px; --r-pill: 999px;
  --bayang-kartu: 0 1px 2px rgba(35,32,28,.06), 0 4px 12px rgba(35,32,28,.05);
  --bayang-panel: 0 -8px 28px rgba(14,59,46,.16);

  /* --- Ukuran sentuh --- */
  --sentuh-min: 48px;
  --sentuh-utama: 56px;
}
```

**Kenapa font ini.** *Plus Jakarta Sans* dibuat foundry Indonesia, sangat terbaca di ukuran kecil, dan angkanya rapi — pas untuk seluruh antarmuka. *Fraunces* dipakai **hanya** untuk nama merek dan judul layar: bentuknya agak gemuk dan hangat, cocok dengan makanan, tapi kalau dipakai di mana-mana jadi berisik. *DM Mono* dipakai untuk semua angka uang, nomor antrian, dan layar struk — angka sejajar rapi ke bawah sehingga total gampang diperiksa sekilas, dan ini yang bikin layar struk terasa seperti struk.

Muat font seperlunya: Fraunces hanya berat 600, Plus Jakarta Sans 400/600/800, DM Mono 400/500.

---

## 3. Komponen

### Tombol
| Jenis | Tampilan | Dipakai untuk |
|---|---|---|
| Utama | latar `--merah-marun`, teks putih, tinggi 56px, radius `--r-md`, huruf 18px/700 | satu per layar: "Ya, Buat Pesanan", "Simpan" |
| Kedua | latar transparan, garis 1.5px `--merah-marun`, teks marun | "Ubah", "Kembali" |
| Bahaya | teks & garis `--sambal` | "Batalkan Pesanan" |
| Ketiga | teks marun tanpa garis | aksi jarang |
| Nonaktif | latar `--garis`, teks `--abu-kabut`, **tanpa** transparansi | tombol "Siap" yang masih terkunci |

Tombol nonaktif harus terlihat jelas nonaktif tapi tetap terbaca, dan menekannya menampilkan alasan: *"Centang semua item dulu."* Tombol mati yang diam saja bikin orang mengira aplikasinya rusak.

### Kartu produk (layar Kasir)
```
┌─────────────────────────┐
│  ┌───────────────────┐  │   • latar --putih-gading
│  │      gambar       │  │   • radius --r-md, bayangan kartu
│  │   (1:1, opsional) │  │   • ketuk = +1
│  └───────────────────┘  │   • kalau qty > 0: garis 2px marun
│  Dimsum Ayam            │     + lencana angka marun di pojok kanan atas
│  Rp 15.000        ⑵     │   • kalau punya pilihan wajib: titik --sambal
└─────────────────────────┘     di pojok kiri atas + label "pilih varian"
```
Grid 2 kolom di iPhone, 3–4 kolom di tablet. Tinggi kartu minimal 120px.

### Bar pesanan (bawah, selalu terlihat kalau keranjang terisi)
```
╭───────────────────────────────────────────╮
│  3 item                    Rp 58.000   ▲  │   latar --merah-marun
│  [        CEK PESANAN               ]     │   teks putih, sudut atas --r-lg
╰───────────────────────────────────────────╯   bayangan panel
```
Ditarik ke atas → jadi lembar berisi daftar item lengkap dengan tombol +/− per baris (ukuran 44×44) dan tombol hapus per baris.

### Layar Cek Pesanan (elemen tanda pengenal)
```
        ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲          ← tepi bergerigi
   ┌──────────────────────────────┐
   │      NYUMIL DIMSUM           │   Fraunces 600, 20px
   │      Bungkus · 07 Agu 16.04  │   mono 12px, --abu-kabut
   │  ──────────────────────────  │
   │  2× Dimsum Ayam                  │   16px/600
   │     Kukus · Pedas Sedang          │   14px, --merah-bata  ← varian selalu tampil
   │                    Rp 30.000      │   mono, rata kanan
   │                                   │
   │  1× Lumpia Udang                  │
   │     Saus Extra                    │
   │                    Rp 18.000      │
   │  ──────────────────────────  │
   │  TOTAL             Rp 58.000 │   mono 26px/500
   └──────────────────────────────┘
        ╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱

     Sudah benar?
   [  Ubah  ]   [ Ya, Buat Pesanan ]
```
Aturan layar ini: latar `--putih-gading`, satu layar penuh, **tidak ada elemen lain**, tanpa tab bar, tanpa notifikasi, tanpa animasi masuk yang lama. Varian **selalu** ditulis, walaupun cuma "Original" — supaya kebiasaan membacanya terbentuk.

### Kartu antrian dapur
```
┌────────────────────────────────────────┐
│ #12   ● WA        Rina · ambil 16.00   │  ← lencana sumber: WA merah muda, Kedai abu
│ ────────────────────────────────────── │
│ ☐  2× Dimsum Ayam · Kukus · Pedas      │  ← baris ketuk, tinggi 48px
│ ☑  1× Lumpia Udang · Saus Extra        │  ← dicentang: teks tercoret, --abu-kabut
│ ☐  2× Es Teh                           │
│ ────────────────────────────────────── │
│ [           SIAP (1/3)             ]   │  ← terkunci sampai 3/3
└────────────────────────────────────────┘
```
Lewat jam ambil → garis kiri kartu 4px `--sambal` + label "TELAT 12 menit".

### Kartu kategori bahan (mengikuti gambar acuan 1)
Ubin persegi, radius `--r-md`, latar warna kategori 12% opasitas, ikon 28px berwarna penuh, label 13px/600. Yang terpilih: latar penuh, ikon & teks putih.

### Lencana status
| Status | Warna | Teks |
|---|---|---|
| Menunggu konfirmasi | `--wijen` | Tunggu Konfirmasi |
| Dibuat | `--merah-bata` | Dibuat |
| Siap | `--daun-bawang` | Siap Diambil |
| Selesai | `--abu-kabut` | Selesai |
| Batal | `--sambal` | Batal |
| Stok aman | `--daun-bawang` | Aman |
| Stok menipis | `--wijen` | Menipis |
| Dekat expired | `--sambal` | Sisa 2 hari |

Status tidak pernah cuma warna — selalu warna **plus** teks.

---

## 4. Tata letak layar

### Kerangka global
```
┌──────────────────────────────────┐
│  Nyumil Dimsum          🔔  👤   │ ← bar atas, --merah-marun, tinggi 56 + safe-area
├──────────────────────────────────┤
│                                  │
│           isi tab                │ ← latar --krem-kukus, dapat digulir
│                                  │
├──────────────────────────────────┤
│  🧾     💬     🍳     ❄️     📊  │ ← tab bar, --putih-gading, garis atas --garis
│ Kasir  WA   Dapur  Stok  Laporan │   tab aktif: ikon + label --merah-marun,
└──────────────────────────────────┘   pil merah muda di belakang ikon
```
Tab bar: tinggi 56px + `env(safe-area-inset-bottom)`. Lencana angka merah di tab Dapur kalau ada antrian belum selesai.

### Tab Kasir
```
[ Dine In ][ Bungkus ]            ← dua pil besar, salah satu selalu aktif
[ Semua ][ Dimsum ][ Gorengan ][ Minuman ]   ← gulir mendatar
┌──────────┐ ┌──────────┐
│  produk  │ │  produk  │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│  produk  │ │  produk  │
└──────────┘ └──────────┘
╭──────────────────────────────╮
│ 3 item          Rp 58.000  ▲ │
│ [       CEK PESANAN        ] │
╰──────────────────────────────╯
```

### Tab Pesanan WA
Daftar pesanan WA dikelompokkan: **Tunggu Konfirmasi** di atas (paling butuh perhatian), lalu **Hari Ini**, lalu **Besok**. Tombol melayang `+ Pesanan Baru` di kanan bawah, di atas tab bar.

### Tab Stok
Persis pola gambar acuan 1: langkah bernomor **1 Pilih Kategori → 2 Nama Bahan → 3 Jumlah**, tombol simpan di bawah yang tetap nonaktif sampai kategori dan nama terisi, dengan teks berubah dari *"Isi nama bahan dulu"* menjadi *"Simpan Bahan"*. Nomor langkah di sini dipakai karena memang urutan pengisiannya berurutan — bukan hiasan.

---

## 5. Gerak

Sedikit dan bertujuan:
- Ketuk kartu produk → lencana angka membesar sebentar (120ms) + getar halus (`navigator.vibrate` tidak ada di iOS; pakai umpan balik visual saja, jangan mengandalkan getar)
- Bar pesanan muncul menggeser dari bawah, 180ms, `cubic-bezier(.2,.8,.2,1)`
- Layar Cek Pesanan **tanpa animasi masuk** — harus terasa berhenti, bukan mengalir
- Berhasil simpan → nomor antrian muncul di tengah layar, angka mono 46px, tahan 1,5 detik
- Hormati `prefers-reduced-motion: reduce` → matikan semua transisi

---

## 6. Aturan tulisan di antarmuka

- Bahasa Indonesia sehari-hari, kalimat biasa (bukan HURUF BESAR SEMUA kecuali tombol utama)
- Tombol menyebut apa yang terjadi: **"Ya, Buat Pesanan"**, bukan "Submit". **"Simpan Bahan"**, bukan "OK"
- Satu kata untuk satu hal, dipakai konsisten di seluruh aplikasi: *pesanan* (bukan order/transaksi), *bahan* (bukan ingredient/item), *bungkus* (bukan takeaway), *kedai* (bukan outlet)
- Pesan galat menyebutkan apa yang terjadi dan apa yang harus dilakukan:
  - ✅ "Gagal simpan, sinyal terputus. Pesanan masih tersimpan di HP — tekan Coba Lagi."
  - ❌ "Terjadi kesalahan. Silakan coba lagi nanti."
- Layar kosong adalah ajakan, bukan keluhan:
  - Dapur kosong: **"Belum ada pesanan. Enak nih, santai dulu."**
  - Stok kosong: **"Belum ada bahan tercatat. Mulai dari yang di freezer."**
- Angka uang selalu `Rp 58.000` (ada spasi, titik ribuan, tanpa koma desimal)

---

## 7. Batas mutu

Sebelum sebuah layar dianggap selesai:
- [ ] Semua tombol dan baris yang bisa diketuk minimal 48×48px
- [ ] Semua `<input>` `font-size: 16px` (kalau kurang, Safari akan zoom sendiri)
- [ ] Bisa dipakai satu tangan: aksi utama berada di sepertiga bawah layar
- [ ] Terbaca dengan kecerahan layar 50% di ruangan terang
- [ ] Rasio kontras teks minimal 4.5:1
- [ ] Fokus keyboard terlihat (garis 2px `--merah-muda-terang`)
- [ ] Tidak ada informasi yang hanya disampaikan lewat warna
- [ ] `prefers-reduced-motion` dihormati
- [ ] Tidak ada yang tertutup notch atau indikator home (`env(safe-area-inset-*)`)
