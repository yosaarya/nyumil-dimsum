// js/views/kasir.js — F-01..F-05, F-08: katalog, keranjang, cek pesanan.
// Lihat docs/01-PRD.md §3.1 (Alur A) dan §4 (Fase 1).
import { katalogProduk, daftarKategori } from '../api.js';
import * as store from '../store.js';
import { rupiah } from '../format.js';
import { el, bukaSheet } from '../ui.js';
import { pilihVarian } from './kasir-varian.js';
import { tampilkanKonfirmasi, kirimUlangPending } from './kasir-konfirmasi.js';

let kanal = 'DINE_IN';
let kategoriAktif = null;
let produkCache = null;
let kategoriCache = null;

export async function render(container) {
  const pending = store.ambilPendingOrder();
  if (pending) {
    kirimUlangPending(container, pending, () => render(container));
    return;
  }

  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat menu...</div>';

  try {
    if (!produkCache) {
      [produkCache, kategoriCache] = await Promise.all([katalogProduk(), daftarKategori()]);
    }
  } catch (error) {
    console.error('Gagal memuat katalog:', error);
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat menu. Cek sinyal.'),
        el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s2);' },
          error?.message || String(error)),
        el('button', {
          class: 'btn btn--kedua', style: 'margin-top:var(--s3);',
          onclick: () => { produkCache = null; render(container); },
        }, 'Coba Lagi'),
      ])
    );
    return;
  }

  gambarKatalog(container);
}

function produkTerfilter() {
  return kategoriAktif ? produkCache.filter((p) => p.kategori_id === kategoriAktif) : produkCache;
}

function jumlahDiKeranjang(produkId) {
  return store
    .isiKeranjang()
    .filter((i) => i.produk_id === produkId)
    .reduce((t, i) => t + i.jumlah, 0);
}

function gambarKatalog(container) {
  container.innerHTML = '';

  const tombolKanal = ['DINE_IN', 'BUNGKUS'].map((k) =>
    el(
      'button',
      {
        class: `pill${kanal === k ? ' pill--aktif' : ''}`,
        onclick: () => { kanal = k; gambarKatalog(container); },
      },
      k === 'DINE_IN' ? 'Dine In' : 'Bungkus'
    )
  );

  const chipSemua = el(
    'button',
    {
      class: `kategori-chip${kategoriAktif === null ? ' kategori-chip--aktif' : ''}`,
      onclick: () => { kategoriAktif = null; gambarKatalog(container); },
    },
    'Semua'
  );
  const chipKategori = kategoriCache.map((kat) =>
    el(
      'button',
      {
        class: `kategori-chip${kategoriAktif === kat.id ? ' kategori-chip--aktif' : ''}`,
        onclick: () => { kategoriAktif = kat.id; gambarKatalog(container); },
      },
      `${kat.ikon || ''} ${kat.nama}`.trim()
    )
  );

  const kartuProduk = produkTerfilter().map((produk) => renderKartuProduk(produk, container));

  container.appendChild(el('div', { class: 'kasir-toggle-kanal' }, tombolKanal));
  container.appendChild(el('div', { class: 'kategori-baris' }, [chipSemua, ...chipKategori]));
  container.appendChild(el('div', { class: 'grid-produk' }, kartuProduk));

  gambarBarPesanan(container);
}

function renderKartuProduk(produk, container) {
  const adaVarian = produk.grup_pilihan.length > 0;
  const adaVarianWajib = produk.grup_pilihan.some((g) => g.wajib);
  const qty = jumlahDiKeranjang(produk.id);

  const kartu = el('button', { class: 'kartu-produk' }, [
    adaVarianWajib ? el('span', { class: 'kartu-produk__tanda-varian' }) : '',
    qty > 0 ? el('span', { class: 'kartu-produk__lencana-qty' }, String(qty)) : '',
    el('span', { class: 'kartu-produk__nama' }, produk.nama),
    el('span', { class: 'kartu-produk__harga' }, rupiah(produk.harga)),
  ]);

  kartu.addEventListener('click', () => {
    if (adaVarian) {
      pilihVarian(produk, (item) => {
        store.tambahAtauGabung(item);
        gambarKatalog(container);
      });
    } else {
      store.tambahAtauGabung({
        produk_id: produk.id,
        nama_produk: produk.nama,
        harga_satuan: produk.harga,
        jumlah: 1,
        opsi: [],
        catatan: null,
        subtotal: produk.harga,
      });
      gambarKatalog(container);
    }
  });

  return kartu;
}

function gambarBarPesanan(container) {
  const keranjang = store.isiKeranjang();
  if (keranjang.length === 0) return;

  const total = store.totalKeranjang();
  const jumlahItem = keranjang.reduce((t, i) => t + i.jumlah, 0);

  const tombolLihat = el('button', { class: 'btn btn--utama bar-pesanan__tombol' }, 'CEK PESANAN');
  tombolLihat.addEventListener('click', () => bukaKeranjang(container));

  container.appendChild(
    el('div', { class: 'bar-pesanan' }, [
      el('div', { class: 'bar-pesanan__ringkas' }, [
        el('span', {}, `${jumlahItem} item`),
        el('span', {}, rupiah(total)),
      ]),
      tombolLihat,
    ])
  );
}

function bukaKeranjang(container) {
  const kontenSheet = el('div', {});
  const overlay = bukaSheet(kontenSheet);
  gambarIsiKeranjang(kontenSheet, container, overlay);
}

function gambarIsiKeranjang(kontenSheet, container, overlay) {
  kontenSheet.innerHTML = '';
  const keranjang = store.isiKeranjang();

  if (keranjang.length === 0) {
    overlay.remove();
    gambarKatalog(container);
    return;
  }

  const baris = keranjang.map((item, index) =>
    el('div', { class: 'baris-keranjang' }, [
      el('div', { class: 'baris-keranjang__info' }, [
        el('div', { class: 'baris-keranjang__nama' }, item.nama_produk),
        ...(item.opsi || []).map((o) => el('div', { class: 'baris-keranjang__varian' }, o.nama_opsi)),
      ]),
      el('div', { class: 'baris-keranjang__qty' }, [
        el('button', {
          class: 'qty-tombol',
          onclick: () => { store.ubahJumlah(index, -1); gambarIsiKeranjang(kontenSheet, container, overlay); },
        }, '−'),
        el('span', {}, String(item.jumlah)),
        el('button', {
          class: 'qty-tombol',
          onclick: () => { store.ubahJumlah(index, 1); gambarIsiKeranjang(kontenSheet, container, overlay); },
        }, '+'),
      ]),
      el('span', { class: 'baris-keranjang__harga' }, rupiah(item.subtotal)),
      el('button', {
        class: 'baris-keranjang__hapus', 'aria-label': 'Hapus item',
        onclick: () => { store.hapusItem(index); gambarIsiKeranjang(kontenSheet, container, overlay); },
      }, '✕'),
    ])
  );

  const total = store.totalKeranjang();
  const tombolCek = el('button', { class: 'btn btn--utama login-tombol', style: 'margin-top:var(--s4);' }, 'CEK PESANAN');
  tombolCek.addEventListener('click', () => {
    overlay.remove();
    tampilkanKonfirmasi(
      container,
      { kanal, keranjang: store.isiKeranjang() },
      { onUbah: () => render(container), onSelesai: () => render(container) }
    );
  });

  kontenSheet.appendChild(el('div', { class: 'sheet__judul' }, 'Keranjang'));
  baris.forEach((b) => kontenSheet.appendChild(b));
  kontenSheet.appendChild(
    el('div', { class: 'struk__total', style: 'margin-top:var(--s4);' }, [
      el('span', {}, 'Total'),
      el('span', {}, rupiah(total)),
    ])
  );
  kontenSheet.appendChild(tombolCek);
}
