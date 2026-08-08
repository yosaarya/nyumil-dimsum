// js/views/home.js — dashboard ringkas, isinya inti dari tab lain.
// Struktur mengikuti catatan pemilik: penjualan hari ini, omzet + laba
// bersih, stok menipis, jadwal order terdekat.
import { ringkasanHariIni, pengeluaranHariIni, bahanMenipis, orderTerdekat } from '../api.js';
import { rupiah, jamId, labelHari } from '../format.js';
import { el } from '../ui.js';

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat ringkasan...</div>';

  const [rRingkasan, rPengeluaran, rBahan, rOrder] = await Promise.allSettled([
    ringkasanHariIni(),
    pengeluaranHariIni(),
    bahanMenipis(),
    orderTerdekat(),
  ]);

  if (rRingkasan.status === 'rejected') {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat ringkasan. Cek sinyal.'),
        el('button', {
          class: 'btn btn--kedua', style: 'margin-top:var(--s3);',
          onclick: () => render(container),
        }, 'Coba Lagi'),
      ])
    );
    return;
  }

  const ringkasan = rRingkasan.value;
  const omzet = ringkasan?.omzet || 0;
  // Laba bersih di sini kasar: omzet - pengeluaran hari ini (belum potong HPP
  // bahan, karena resep & produksi belum dibangun — lihat catatan di bawah).
  const labaBersih = rPengeluaran.status === 'fulfilled' ? omzet - rPengeluaran.value : null;
  const bahanTipis = rBahan.status === 'fulfilled' ? rBahan.value : [];
  const orderDekat = rOrder.status === 'fulfilled' ? rOrder.value : [];

  container.innerHTML = '';
  container.appendChild(
    el('div', { style: 'padding:var(--s5) var(--s5) var(--s7);' }, [
      el('div', { class: 'sheet__judul' }, 'Ringkasan Hari Ini'),
      el('div', { class: 'stat-grid' }, [
        kartuStat('Pesanan Selesai', ringkasan ? String(ringkasan.jumlah_pesanan) : '0'),
        kartuStat('Omzet', rupiah(omzet)),
        kartuStat('Laba Bersih', labaBersih !== null ? rupiah(labaBersih) : '—'),
      ]),
      labaBersih === null
        ? el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s1);' },
            'Laba bersih cuma kelihatan untuk akun Pemilik/Admin.')
        : el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s1);' },
            'Laba bersih = omzet − pengeluaran hari ini. Belum potong harga bahan (HPP) karena resep & produksi belum dibangun.'),

      el('div', { class: 'judul-seksi' }, 'Stok Menipis'),
      bahanTipis.length > 0
        ? el('div', {}, bahanTipis.map((b) =>
            el('div', { class: 'baris-ringkas' }, [
              el('span', {}, b.nama),
              el('span', { class: 'lencana lencana--tunggu' }, `${b.stok} ${b.satuan}`),
            ])
          ))
        : el('div', { style: 'color:var(--abu-kabut);font-size:var(--t-sm);padding:var(--s2) 0;' },
            'Belum ada bahan tercatat. Mulai dari yang di freezer.'),
      el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s1);' },
        'Stok produk jadi belum dilacak — sengaja belum dibuat (lihat docs/05-SCHEMA.md §9), menyusul di Fase 3.'),

      el('div', { class: 'judul-seksi' }, 'Order Terdekat'),
      orderDekat.length > 0
        ? el('div', {}, orderDekat.map((p) =>
            el('div', { class: 'baris-ringkas' }, [
              el('span', {}, `#${p.nomor_antrian} ${p.nama_pelanggan || ''}`),
              el('span', {}, `${p.diantar ? 'kirim' : 'ambil'} ${labelHari(p.waktu_ambil)} ${jamId(p.waktu_ambil)}`),
            ])
          ))
        : el('div', { style: 'color:var(--abu-kabut);font-size:var(--t-sm);padding:var(--s2) 0;' },
            'Tidak ada order terjadwal.'),
    ])
  );
}

function kartuStat(label, nilai) {
  return el('div', { class: 'kartu-stat' }, [
    el('div', { class: 'kartu-stat__nilai' }, nilai),
    el('div', { class: 'kartu-stat__label' }, label),
  ]);
}
