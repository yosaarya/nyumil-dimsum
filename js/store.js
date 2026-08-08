// js/store.js — state keranjang di memori + localStorage.
// Lihat docs/02-ARCHITECTURE.md §4: JANGAN kosongkan keranjang sebelum server
// memastikan pesanan tersimpan.

const KUNCI_KERANJANG = 'keranjang';
const KUNCI_PENDING = 'pending_order';

let keranjang = muatKeranjang();

function muatKeranjang() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_KERANJANG)) || [];
  } catch {
    return [];
  }
}

function simpanKeranjang() {
  localStorage.setItem(KUNCI_KERANJANG, JSON.stringify(keranjang));
}

export function isiKeranjang() {
  return keranjang;
}

export function tambahItem(item) {
  keranjang.push(item);
  simpanKeranjang();
}

function kunciOpsi(item) {
  return (item.opsi || [])
    .map((o) => `${o.opsi_id}:${o.jumlah || 1}`)
    .sort()
    .join(',');
}

/** Gabung ke baris yang sudah ada kalau produk + varian + catatannya sama persis, kalau tidak tambah baris baru. */
export function tambahAtauGabung(itemBaru) {
  const sama = keranjang.find(
    (item) =>
      item.produk_id === itemBaru.produk_id &&
      kunciOpsi(item) === kunciOpsi(itemBaru) &&
      (item.catatan || null) === (itemBaru.catatan || null)
  );
  if (sama) {
    sama.jumlah += itemBaru.jumlah;
    sama.subtotal = sama.harga_satuan * sama.jumlah;
  } else {
    keranjang.push(itemBaru);
  }
  simpanKeranjang();
}

export function ubahJumlah(index, delta) {
  const item = keranjang[index];
  if (!item) return;
  item.jumlah += delta;
  if (item.jumlah <= 0) {
    keranjang.splice(index, 1);
  } else {
    item.subtotal = item.harga_satuan * item.jumlah;
  }
  simpanKeranjang();
}

export function hapusItem(index) {
  keranjang.splice(index, 1);
  simpanKeranjang();
}

export function kosongkanKeranjang() {
  keranjang = [];
  simpanKeranjang();
}

export function totalKeranjang() {
  return keranjang.reduce((total, item) => total + item.subtotal, 0);
}

export function simpanPendingOrder(payload) {
  localStorage.setItem(KUNCI_PENDING, JSON.stringify(payload));
}

export function ambilPendingOrder() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_PENDING));
  } catch {
    return null;
  }
}

export function hapusPendingOrder() {
  localStorage.removeItem(KUNCI_PENDING);
}
