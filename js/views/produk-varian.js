// js/views/produk-varian.js — sheet pilihan varian wajib/opsional (F-02, B-02).
// Dipakai bersama oleh tab Sales dan Order — bukan spesifik satu tab.
// Produk dengan grup_pilihan wajib tidak bisa masuk keranjang sebelum dipilih.
import { el, bukaSheet } from '../ui.js';
import { rupiah } from '../format.js';

export function pilihVarian(produk, onTambah) {
  const pilihan = {}; // grup_id -> Set<opsi_id>
  const grupList = [...produk.grup_pilihan].sort((a, b) => a.urutan - b.urutan);
  const opsiButtonsPerGrup = {};

  function semuaWajibTerisi() {
    return grupList.filter((g) => g.wajib).every((g) => pilihan[g.id] && pilihan[g.id].size > 0);
  }

  function perbaruiTombol() {
    const siap = semuaWajibTerisi();
    tombolTambah.disabled = !siap;
    tombolTambah.className = `btn login-tombol ${siap ? 'btn--utama' : 'btn--nonaktif'}`;
  }

  function pilihOpsi(grup, opsi) {
    if (grup.pilih_banyak) {
      if (pilihan[grup.id].has(opsi.id)) pilihan[grup.id].delete(opsi.id);
      else pilihan[grup.id].add(opsi.id);
    } else {
      pilihan[grup.id] = new Set([opsi.id]);
    }
    opsiButtonsPerGrup[grup.id].forEach(({ opsiId, tombol }) => {
      tombol.className = `opsi-varian${pilihan[grup.id].has(opsiId) ? ' opsi-varian--terpilih' : ''}`;
    });
    perbaruiTombol();
  }

  const grupEls = grupList.map((grup) => {
    pilihan[grup.id] = new Set();
    const opsiSorted = [...grup.opsi_pilihan].sort((a, b) => a.urutan - b.urutan);
    opsiButtonsPerGrup[grup.id] = [];

    const tombolOpsi = opsiSorted.map((opsi) => {
      const tombol = el('button', { class: 'opsi-varian', onclick: () => pilihOpsi(grup, opsi) }, [
        el('span', {}, opsi.nama),
        el('span', { class: 'opsi-varian__harga' }, opsi.harga_tambahan > 0 ? `+${rupiah(opsi.harga_tambahan)}` : ''),
      ]);
      opsiButtonsPerGrup[grup.id].push({ opsiId: opsi.id, tombol });
      return tombol;
    });

    return el('div', { class: 'grup-varian' }, [
      el('div', { class: 'grup-varian__judul' }, [
        grup.nama,
        grup.wajib ? el('span', { class: 'grup-varian__wajib' }, ' • wajib pilih') : '',
      ]),
      ...tombolOpsi,
    ]);
  });

  function submit() {
    if (!semuaWajibTerisi()) return;
    const opsiTerpilih = [];
    let hargaTambahan = 0;
    for (const grup of grupList) {
      for (const opsiId of pilihan[grup.id]) {
        const opsi = grup.opsi_pilihan.find((o) => o.id === opsiId);
        opsiTerpilih.push({ opsi_id: opsi.id, nama_grup: grup.nama, nama_opsi: opsi.nama, harga_tambahan: opsi.harga_tambahan });
        hargaTambahan += opsi.harga_tambahan;
      }
    }
    const hargaSatuan = produk.harga + hargaTambahan;
    onTambah({
      produk_id: produk.id,
      nama_produk: produk.nama,
      harga_satuan: hargaSatuan,
      jumlah: 1,
      opsi: opsiTerpilih,
      catatan: null,
      subtotal: hargaSatuan,
    });
    overlay.remove();
  }

  const tombolTambah = el('button', { class: 'btn login-tombol', onclick: submit }, 'Tambah ke Keranjang');

  const overlay = bukaSheet(
    el('div', {}, [el('div', { class: 'sheet__judul' }, produk.nama), ...grupEls, tombolTambah])
  );
  perbaruiTombol();
}
