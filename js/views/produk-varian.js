// js/views/produk-varian.js — sheet pilihan varian wajib/opsional (F-02, B-02).
// Dipakai bersama oleh tab Sales dan Order — bukan spesifik satu tab.
// Produk dengan grup_pilihan wajib tidak bisa masuk keranjang sebelum dipilih.
//
// Tiga gaya pilihan tergantung sifat grupnya:
//  - wajib, pilih satu   (mis. Isi)     -> tombol toggle, pilih salah satu
//  - wajib, pilih banyak (mis. Topping) -> tombol toggle, boleh lebih dari satu
//  - opsional, pilih banyak (Add On)    -> stepper +/- (boleh Tobiko x3)
import { el, bukaSheet } from '../ui.js';
import { rupiah } from '../format.js';

export function pilihVarian(produk, onTambah) {
  const pilihan = {}; // grup_id -> Map<opsi_id, jumlah>
  const grupList = [...produk.grup_pilihan].sort((a, b) => a.urutan - b.urutan);
  const uiOpsi = {}; // opsi_id -> { tipe: 'stepper' | 'toggle', ... elemen }

  function semuaWajibTerisi() {
    return grupList.filter((g) => g.wajib).every((g) => [...pilihan[g.id].values()].some((j) => j > 0));
  }

  function perbaruiTombol() {
    const siap = semuaWajibTerisi();
    tombolTambah.disabled = !siap;
    tombolTambah.className = `btn login-tombol ${siap ? 'btn--utama' : 'btn--nonaktif'}`;
  }

  function gambarUlangOpsi(grup) {
    const map = pilihan[grup.id];
    for (const opsi of grup.opsi_pilihan) {
      const ui = uiOpsi[opsi.id];
      const jumlah = map.get(opsi.id) || 0;
      if (ui.tipe === 'stepper') {
        ui.elJumlah.textContent = String(jumlah);
        ui.baris.className = `opsi-varian${jumlah > 0 ? ' opsi-varian--terpilih' : ''}`;
      } else {
        ui.tombol.className = `opsi-varian${jumlah > 0 ? ' opsi-varian--terpilih' : ''}`;
      }
    }
  }

  function setJumlah(grup, opsi, jumlahBaru) {
    const map = pilihan[grup.id];
    jumlahBaru = Math.max(0, jumlahBaru);

    if (!grup.pilih_banyak) {
      // wajib pilih satu: pilih opsi ini, matikan yang lain di grup yang sama
      for (const oid of map.keys()) map.set(oid, 0);
      if (jumlahBaru > 0) map.set(opsi.id, 1);
    } else if (grup.wajib) {
      // wajib pilih banyak (Topping): toggle 0/1 per opsi, tanpa kuantitas
      map.set(opsi.id, jumlahBaru > 0 ? 1 : 0);
    } else {
      // opsional pilih banyak (Add On): kuantitas bebas
      map.set(opsi.id, jumlahBaru);
    }
    gambarUlangOpsi(grup);
    perbaruiTombol();
  }

  const grupEls = grupList.map((grup) => {
    pilihan[grup.id] = new Map(grup.opsi_pilihan.map((o) => [o.id, 0]));
    const opsiSorted = [...grup.opsi_pilihan].sort((a, b) => a.urutan - b.urutan);
    const addOnStepper = grup.pilih_banyak && !grup.wajib;

    const elemenOpsi = opsiSorted.map((opsi) => {
      if (addOnStepper) {
        const elJumlah = el('span', { style: 'min-width:22px;text-align:center;font-weight:700;' }, '0');
        const tombolMinus = el('button', {
          class: 'qty-tombol',
          onclick: () => setJumlah(grup, opsi, (pilihan[grup.id].get(opsi.id) || 0) - 1),
        }, '−');
        const tombolPlus = el('button', {
          class: 'qty-tombol',
          onclick: () => setJumlah(grup, opsi, (pilihan[grup.id].get(opsi.id) || 0) + 1),
        }, '+');
        const baris = el('div', { class: 'opsi-varian' }, [
          el('span', {}, opsi.nama),
          opsi.harga_tambahan > 0 ? el('span', { class: 'opsi-varian__harga' }, `+${rupiah(opsi.harga_tambahan)}`) : '',
          el('div', { style: 'display:flex;align-items:center;gap:var(--s2);margin-left:auto;' }, [tombolMinus, elJumlah, tombolPlus]),
        ]);
        uiOpsi[opsi.id] = { tipe: 'stepper', elJumlah, baris };
        return baris;
      }

      const tombol = el('button', {
        class: 'opsi-varian',
        onclick: () => setJumlah(grup, opsi, (pilihan[grup.id].get(opsi.id) || 0) > 0 ? 0 : 1),
      }, [
        el('span', {}, opsi.nama),
        el('span', { class: 'opsi-varian__harga' }, opsi.harga_tambahan > 0 ? `+${rupiah(opsi.harga_tambahan)}` : ''),
      ]);
      uiOpsi[opsi.id] = { tipe: 'toggle', tombol };
      return tombol;
    });

    return el('div', { class: 'grup-varian' }, [
      el('div', { class: 'grup-varian__judul' }, [
        grup.nama,
        grup.wajib ? el('span', { class: 'grup-varian__wajib' }, ' • wajib pilih') : '',
      ]),
      ...elemenOpsi,
    ]);
  });

  function submit() {
    if (!semuaWajibTerisi()) return;
    const opsiTerpilih = [];
    let hargaTambahan = 0;
    for (const grup of grupList) {
      for (const [opsiId, jumlah] of pilihan[grup.id]) {
        if (jumlah <= 0) continue;
        const opsi = grup.opsi_pilihan.find((o) => o.id === opsiId);
        opsiTerpilih.push({
          opsi_id: opsi.id, nama_grup: grup.nama, nama_opsi: opsi.nama,
          harga_tambahan: opsi.harga_tambahan, jumlah,
        });
        hargaTambahan += opsi.harga_tambahan * jumlah;
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
