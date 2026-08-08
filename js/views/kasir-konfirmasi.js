// js/views/kasir-konfirmasi.js — Layar Cek Pesanan (F-04, elemen tanda pengenal
// di docs/03-DESIGN.md §1) + pembayaran (F-08) + simpan pesanan (B-01, B-08).
import { buatPesanan, catatPembayaran } from '../api.js';
import * as store from '../store.js';
import { rupiah } from '../format.js';
import { el, sembunyikanShell, tampilkanShell } from '../ui.js';

/**
 * @param {HTMLElement} container
 * @param {{kanal: string, keranjang: object[]}} pesanan
 * @param {{onUbah: Function, onSelesai: Function}} callbacks
 */
export function tampilkanKonfirmasi(container, { kanal, keranjang }, { onUbah, onSelesai }) {
  sembunyikanShell();
  renderStruk(container, kanal, keranjang, {
    onUbah: () => {
      tampilkanShell();
      onUbah();
    },
    onLanjut: () => renderPembayaran(container, kanal, keranjang, onSelesai),
  });
}

function renderStruk(container, kanal, keranjang, { onUbah, onLanjut }) {
  const total = keranjang.reduce((t, i) => t + i.subtotal, 0);
  const waktu = new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });

  const daftarItem = keranjang.map((item) =>
    el('div', { class: 'struk__item' }, [
      el('div', { class: 'struk__item-baris' }, [
        el('span', {}, `${item.jumlah}× ${item.nama_produk}`),
        el('span', {}, rupiah(item.subtotal)),
      ]),
      ...(item.opsi || []).map((o) =>
        el('div', { class: 'struk__item-varian' }, `${o.nama_opsi}`)
      ),
    ])
  );

  container.innerHTML = '';
  container.appendChild(
    el('div', { class: 'konfirmasi-layar' }, [
      el('div', { class: 'struk' }, [
        el('div', { class: 'struk__merek' }, 'NYUMIL DIMSUM'),
        el('div', { class: 'struk__meta' }, `${kanal === 'DINE_IN' ? 'Dine In' : 'Bungkus'} · ${waktu}`),
        el('hr', { class: 'struk__garis' }),
        ...daftarItem,
        el('hr', { class: 'struk__garis' }),
        el('div', { class: 'struk__total' }, [el('span', {}, 'TOTAL'), el('span', {}, rupiah(total))]),
      ]),
      el('div', { class: 'konfirmasi-pertanyaan' }, 'Sudah benar?'),
      el('div', { class: 'konfirmasi-tombol-baris' }, [
        el('button', { class: 'btn btn--kedua', onclick: onUbah }, 'Ubah'),
        el('button', { class: 'btn btn--utama', onclick: onLanjut }, 'Ya, Buat Pesanan'),
      ]),
    ])
  );
}

function renderPembayaran(container, kanal, keranjang, onSelesai) {
  const total = keranjang.reduce((t, i) => t + i.subtotal, 0);
  let metode = 'TUNAI';
  let uangDiterima = 0;
  let namaKasbon = '';
  let pendingAktif = null; // dibuat sekali, dipakai ulang kalau tombol Coba Lagi ditekan (idempotensi client_ref)

  container.innerHTML = '';
  const elGalat = el('div', { class: 'bayar-galat' });
  const elKembalian = el('div', { class: 'kembalian-besar' });
  const inputUang = el('input', { type: 'number', inputmode: 'numeric', class: 'input', placeholder: 'Uang diterima' });
  const inputNama = el('input', { type: 'text', class: 'input', placeholder: 'Nama pelanggan (wajib untuk kasbon)' });
  const areaMetodeKhusus = el('div', {});
  const tombolSimpan = el('button', { class: 'btn btn--utama login-tombol' }, 'Simpan');

  const opsiMetode = [
    ['TUNAI', 'Tunai'], ['QRIS', 'QRIS'], ['TRANSFER', 'Transfer'], ['BELUM_BAYAR', 'Bayar Nanti'],
  ];
  const tombolMetode = opsiMetode.map(([nilai, label]) =>
    el('button', {
      class: `bayar-metode__opsi${nilai === metode ? ' bayar-metode__opsi--aktif' : ''}`,
      onclick: () => { metode = nilai; gambarUlang(); },
    }, label)
  );
  const barisMetode = el('div', { class: 'bayar-metode' }, tombolMetode);

  function gambarUlang() {
    tombolMetode.forEach((btn, i) => {
      btn.className = `bayar-metode__opsi${opsiMetode[i][0] === metode ? ' bayar-metode__opsi--aktif' : ''}`;
    });
    areaMetodeKhusus.innerHTML = '';
    if (metode === 'TUNAI') {
      areaMetodeKhusus.appendChild(inputUang);
      areaMetodeKhusus.appendChild(elKembalian);
      hitungKembalian();
    } else if (metode === 'BELUM_BAYAR') {
      areaMetodeKhusus.appendChild(inputNama);
    }
  }

  function hitungKembalian() {
    const kembali = uangDiterima - total;
    elKembalian.textContent = uangDiterima > 0 ? `Kembali ${rupiah(Math.max(kembali, 0))}` : '';
  }

  inputUang.addEventListener('input', () => {
    uangDiterima = Number(inputUang.value) || 0;
    hitungKembalian();
  });
  inputNama.addEventListener('input', () => { namaKasbon = inputNama.value.trim(); });

  tombolSimpan.addEventListener('click', async () => {
    if (metode === 'BELUM_BAYAR' && !namaKasbon) {
      elGalat.textContent = 'Nama pelanggan wajib diisi untuk kasbon.';
      return;
    }
    if (!pendingAktif) {
      pendingAktif = buatPendingBaru(kanal, keranjang, metode, uangDiterima, total, namaKasbon);
      store.simpanPendingOrder(pendingAktif);
    }
    await simpanPesanan(pendingAktif, { tombolSimpan, elGalat, container, onSelesai });
  });

  container.appendChild(
    el('div', { class: 'bayar-layar' }, [
      el('div', { class: 'sheet__judul' }, 'Pembayaran'),
      el('div', { class: 'struk__total' }, [el('span', {}, 'Total'), el('span', {}, rupiah(total))]),
      barisMetode,
      areaMetodeKhusus,
      elGalat,
      tombolSimpan,
    ])
  );
  gambarUlang();
}

function buatPendingBaru(kanal, keranjang, metode, uangDiterima, total, namaKasbon) {
  return {
    payload: {
      client_ref: crypto.randomUUID(),
      kanal,
      nama_pelanggan: metode === 'BELUM_BAYAR' ? namaKasbon : null,
      kasbon: metode === 'BELUM_BAYAR',
      items: keranjang.map((item) => ({
        produk_id: item.produk_id,
        jumlah: item.jumlah,
        catatan: item.catatan || null,
        opsi: (item.opsi || []).map((o) => ({ opsi_id: o.opsi_id })),
      })),
    },
    metode, uangDiterima, total,
  };
}

async function simpanPesanan(pending, { tombolSimpan, elGalat, container, onSelesai }) {
  elGalat.textContent = '';
  tombolSimpan.disabled = true;
  tombolSimpan.textContent = 'Menyimpan...';

  try {
    const pesanan = await buatPesanan(pending.payload);

    if (pending.metode !== 'BELUM_BAYAR') {
      try {
        await catatPembayaran(pesanan.id, {
          metode: pending.metode,
          jumlah: pesanan.total,
          uang_diterima: pending.metode === 'TUNAI' ? pending.uangDiterima : null,
        });
      } catch {
        elGalat.textContent = 'Pesanan tersimpan, tapi pembayaran gagal dicatat — catat manual nanti.';
      }
    }

    store.kosongkanKeranjang();
    store.hapusPendingOrder();
    tampilkanNomorAntrian(container, pesanan.nomor_antrian, onSelesai);
  } catch (error) {
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = 'Coba Lagi';
    elGalat.textContent = 'Gagal simpan. Cek sinyal, lalu tekan Coba Lagi. Pesanan masih tersimpan di HP.';
  }
}

function tampilkanNomorAntrian(container, nomor, onSelesai) {
  container.innerHTML = '';
  container.appendChild(
    el('div', { class: 'nomor-antrian-layar' }, [
      el('div', { class: 'nomor-antrian-layar__label' }, 'Nomor antrian'),
      el('div', { class: 'nomor-antrian-layar__angka' }, `#${nomor}`),
    ])
  );
  setTimeout(() => {
    tampilkanShell();
    onSelesai();
  }, 1500);
}

/** Dipanggil dari kasir.js kalau ada pending_order yang belum berhasil terkirim (app tertutup di tengah jalan). */
export function kirimUlangPending(container, pending, onSelesai) {
  sembunyikanShell();
  container.innerHTML = '';
  const elGalat = el('div', { class: 'bayar-galat' });
  const tombolSimpan = el('button', { class: 'btn btn--utama login-tombol' }, 'Coba Lagi');
  tombolSimpan.addEventListener('click', () =>
    simpanPesanan(pending, { tombolSimpan, elGalat, container, onSelesai })
  );
  container.appendChild(
    el('div', { class: 'bayar-layar' }, [
      el('div', { class: 'sheet__judul' }, 'Ada pesanan belum tersimpan'),
      el('div', {}, `Total ${rupiah(pending.total)} — coba kirim lagi sekarang.`),
      elGalat,
      tombolSimpan,
    ])
  );
}
