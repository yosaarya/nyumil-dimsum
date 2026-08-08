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
