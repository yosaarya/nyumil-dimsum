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
  let query = supabase.from('v_stok_bahan').select('*');
  if (kategori) query = query.eq('kategori', kategori);
  const { data, error } = await query;
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

export async function daftarKategori() {
  const { data, error } = await supabase
    .from('kategori_produk')
    .select('*')
    .eq('aktif', true)
    .order('urutan');
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
