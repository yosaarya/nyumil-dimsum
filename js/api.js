// js/api.js — SATU-SATUNYA file yang boleh memanggil Supabase langsung.
// Isinya fungsi domain, bukan query mentah. Lihat docs/02-ARCHITECTURE.md §3.1
// dan aturan B3 di CLAUDE.md: jangan taruh service_role key di sini, hanya anon key.
//
// createClient diambil dari js/vendor/supabase-js.umd.js (dimuat lewat <script>
// biasa di index.html sebelum file ini), bukan CDN esm.sh — supaya aplikasi
// tidak gagal total kalau sinyal seluler lemot pas dibuka pertama kali.

const { createClient } = window.supabase;

const SUPABASE_URL = 'https://wdzhvboiinpfqwbhvxda.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZkwB6t5Qqtc3d40FF0jLDA_v14bABtK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true }, // jangan pernah paksa login ulang tiap buka aplikasi
});

/** @param {object} payload lihat bentuk di docs/05-SCHEMA.md §8 */
export async function buatPesanan(payload) {
  const { data, error } = await supabase.rpc('buat_pesanan', { p: payload });
  if (error) throw error;
  return data;
}

/**
 * Antrian dapur lengkap dengan item + opsi (bukan cuma ringkasan v_antrian_dapur).
 * Pesanan WA yang belum ditandai "pelanggan sudah konfirmasi" sengaja tidak
 * ikut muncul di sini (B-09) — itu baru kelihatan di tab WA.
 */
export async function antrianDapur() {
  const { data, error } = await supabase
    .from('pesanan')
    .select('*, pesanan_item(*, pesanan_item_opsi(*))')
    .in('status', ['DIKONFIRMASI', 'DIBUAT', 'SIAP'])
    .or('kanal.neq.WA,dikonfirmasi_pelanggan.eq.true')
    .order('created_at');
  if (error) throw error;
  return data;
}

/** Daftar pesanan WA yang masih aktif (belum selesai/batal), untuk tab WA. */
export async function daftarPesananWa() {
  const { data, error } = await supabase
    .from('pesanan')
    .select('*, pesanan_item(*, pesanan_item_opsi(*))')
    .eq('kanal', 'WA')
    .not('status', 'in', '(SELESAI,BATAL)')
    .order('created_at');
  if (error) throw error;
  return data;
}

/** B-09: baru boleh masuk dapur (DIBUAT) setelah ini dipanggil. */
export async function konfirmasiPelangganWa(pesananId) {
  const { error } = await supabase
    .from('pesanan')
    .update({ dikonfirmasi_pelanggan: true })
    .eq('id', pesananId);
  if (error) throw error;
}

export async function tandaiItemSelesai(itemId, selesai = true) {
  const { error } = await supabase
    .from('pesanan_item')
    .update({ selesai_dibuat: selesai })
    .eq('id', itemId);
  if (error) throw error;
}

/** Perpindahan status dijaga trigger jaga_status_pesanan() di database (B-10, B-11). */
export async function ubahStatusPesanan(pesananId, status) {
  const { error } = await supabase.from('pesanan').update({ status }).eq('id', pesananId);
  if (error) throw error;
}

export async function stokBahan({ kategori } = {}) {
  let query = supabase.from('v_stok_bahan').select('*').order('nama');
  if (kategori) query = query.eq('kategori', kategori);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** @param {object} p lihat db/migrations/008_tambah_stok_bahan.sql untuk bentuknya */
export async function tambahStokBahan(p) {
  const { data, error } = await supabase.rpc('tambah_stok_bahan', { p });
  if (error) throw error;
  return data;
}

export async function katalogProduk() {
  const { data, error } = await supabase
    .from('produk')
    .select('*, grup_pilihan(*, opsi_pilihan(*))')
    .eq('aktif', true)
    .order('urutan');
  if (error) throw error;
  return data;
}

/** Semua produk termasuk yang tidak dijual (mis. Chili Oil), untuk pilihan di tab Kitchen. */
export async function produkUntukProduksi() {
  const { data, error } = await supabase.from('produk').select('id, nama').order('nama');
  if (error) throw error;
  return data;
}

/** Resep produk (bahan + jumlah per batch), untuk tab Kitchen. null kalau belum diatur. */
export async function resepProduk(produkId) {
  const { data, error } = await supabase
    .from('resep')
    .select('*, resep_item(*, bahan(nama, satuan))')
    .eq('produk_id', produkId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** @param {object} p lihat db/migrations/011_simpan_resep.sql untuk bentuknya */
export async function simpanResep(p) {
  const { data, error } = await supabase.rpc('simpan_resep', { p });
  if (error) throw error;
  return data;
}

/** F-15: catat produksi — otomatis potong stok bahan lewat resep kalau sudah diatur (B-22). */
export async function catatProduksi(produkId, jumlah, catatan) {
  const { data, error } = await supabase.rpc('catat_produksi', {
    p_produk_id: produkId,
    p_jumlah: jumlah,
    p_catatan: catatan || null,
  });
  if (error) throw error;
  return data;
}

/** Riwayat produksi terbaru, untuk tab Kitchen. */
export async function daftarProduksi() {
  const { data, error } = await supabase
    .from('produksi')
    .select('*, produk(nama)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/** @param {object} p { metode, jumlah, uang_diterima?, referensi? } — lihat B-13/B-14 di CLAUDE.md */
export async function catatPembayaran(pesananId, p) {
  const { error } = await supabase.from('pembayaran').insert({
    pesanan_id: pesananId,
    metode: p.metode,
    jumlah: p.jumlah,
    uang_diterima: p.uang_diterima ?? null,
    referensi: p.referensi ?? null,
  });
  if (error) throw error;
}

/** Ringkasan tab Home — null kalau belum ada pesanan SELESAI hari ini (B-24: hari ini = Asia/Jakarta). */
export async function ringkasanHariIni() {
  const hariIni = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const { data, error } = await supabase
    .from('v_penjualan_harian')
    .select('*')
    .eq('tanggal', hariIni)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Total pengeluaran hari ini, dasar hitung laba bersih kasar (omzet - pengeluaran). RLS: PEMILIK/ADMIN saja. */
export async function pengeluaranHariIni() {
  const hariIni = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const { data, error } = await supabase.from('pengeluaran').select('jumlah').eq('tanggal', hariIni);
  if (error) throw error;
  return data.reduce((t, r) => t + r.jumlah, 0);
}

/** Bahan yang stoknya di bawah batas minimum (v_stok_bahan.menipis), untuk Home. */
export async function bahanMenipis() {
  const { data, error } = await supabase
    .from('v_stok_bahan')
    .select('*')
    .eq('menipis', true)
    .order('nama')
    .limit(5);
  if (error) throw error;
  return data;
}

/** Order WA terdekat yang sudah ada jadwal ambil/kirim, belum selesai/batal, untuk Home. */
export async function orderTerdekat() {
  const { data, error } = await supabase
    .from('pesanan')
    .select('id, nomor_antrian, nama_pelanggan, waktu_ambil, diantar')
    .eq('kanal', 'WA')
    .not('status', 'in', '(SELESAI,BATAL)')
    .not('waktu_ambil', 'is', null)
    .order('waktu_ambil')
    .limit(5);
  if (error) throw error;
  return data;
}

/** @param {string} tanggal 'YYYY-MM-DD' — dasar tab Finance. null kalau belum ada pesanan SELESAI. */
export async function ringkasanTanggal(tanggal) {
  const { data, error } = await supabase.from('v_penjualan_harian').select('*').eq('tanggal', tanggal).maybeSingle();
  if (error) throw error;
  return data;
}

export async function produkTerlarisTanggal(tanggal) {
  const { data, error } = await supabase
    .from('v_produk_terlaris')
    .select('*')
    .eq('tanggal_operasi', tanggal)
    .order('terjual', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data;
}

/** Total per metode bayar (TUNAI/QRIS/TRANSFER/BELUM_BAYAR) untuk satu tanggal_operasi. */
export async function rincianPembayaranTanggal(tanggal) {
  const { data, error } = await supabase
    .from('pembayaran')
    .select('metode, jumlah, pesanan!inner(tanggal_operasi)')
    .eq('pesanan.tanggal_operasi', tanggal);
  if (error) throw error;
  const total = { TUNAI: 0, QRIS: 0, TRANSFER: 0 };
  for (const baris of data) total[baris.metode] = (total[baris.metode] || 0) + baris.jumlah;
  return total;
}

export async function ambilTutupKasir(tanggal) {
  const { data, error } = await supabase.from('tutup_kasir').select('*').eq('tanggal', tanggal).maybeSingle();
  if (error) throw error;
  return data;
}

/** tanggal terkunci otomatis lewat primary key tutup_kasir.tanggal — tidak bisa ditutup dua kali. */
export async function simpanTutupKasir(p) {
  const { data: userData, error: errorUser } = await supabase.auth.getUser();
  if (errorUser) throw errorUser;

  const { data, error } = await supabase
    .from('tutup_kasir')
    .insert({
      tanggal: p.tanggal,
      total_omzet: p.totalOmzet,
      total_tunai: p.totalTunai,
      total_qris: p.totalQris,
      total_transfer: p.totalTransfer,
      jumlah_pesanan: p.jumlahPesanan,
      uang_fisik: p.uangFisik,
      selisih: p.uangFisik - p.totalTunai,
      catatan: p.catatan || null,
      ditutup_oleh: userData.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
