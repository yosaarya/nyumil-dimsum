// js/api.js — SATU-SATUNYA file yang boleh memanggil Supabase langsung.
// Isinya fungsi domain, bukan query mentah. Lihat docs/02-ARCHITECTURE.md §3.1
// dan aturan B3 di CLAUDE.md: jangan taruh service_role key di sini, hanya anon key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wdzhvboiinpfqwbhvxda.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZkwB6t5Qqtc3d40FF0jLDA_v14bABtK'; // TODO: isi anon key (bukan service_role)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true }, // jangan pernah paksa login ulang tiap buka aplikasi
});

/** @param {object} payload lihat bentuk di docs/05-SCHEMA.md §8 */
export async function buatPesanan(payload) {
  const { data, error } = await supabase.rpc('buat_pesanan', { p: payload });
  if (error) throw error;
  return data;
}

export async function daftarAntrian() {
  const { data, error } = await supabase.from('v_antrian_dapur').select('*');
  if (error) throw error;
  return data;
}

export async function tandaiItemSelesai(itemId, selesai = true) {
  const { error } = await supabase
    .from('pesanan_item')
    .update({ selesai_dibuat: selesai })
    .eq('id', itemId);
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
