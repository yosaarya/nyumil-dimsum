// js/views/home.js — dashboard ringkas. Isinya inti dari tab lain (Sales,
// Order, Inventory, Finance), bukan fitur baru — sesuai permintaan pemilik.
import { ringkasanHariIni } from '../api.js';
import { rupiah } from '../format.js';
import { el } from '../ui.js';

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat ringkasan...</div>';

  let ringkasan = null;
  try {
    ringkasan = await ringkasanHariIni();
  } catch (error) {
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

  container.innerHTML = '';
  container.appendChild(
    el('div', { style: 'padding:var(--s5);' }, [
      el('div', { class: 'sheet__judul' }, 'Ringkasan Hari Ini'),
      el('div', { class: 'stat-grid' }, [
        kartuStat('Pesanan Selesai', ringkasan ? String(ringkasan.jumlah_pesanan) : '0'),
        kartuStat('Omzet', rupiah(ringkasan?.omzet || 0)),
      ]),
      el('div', { style: 'margin-top:var(--s5);color:var(--abu-kabut);font-size:var(--t-sm);' },
        'Stok menipis, laba bersih, dan jadwal order terdekat menyusul setelah tab Inventory & Finance selesai dibangun.'),
    ])
  );
}

function kartuStat(label, nilai) {
  return el('div', { class: 'kartu-stat' }, [
    el('div', { class: 'kartu-stat__nilai' }, nilai),
    el('div', { class: 'kartu-stat__label' }, label),
  ]);
}
