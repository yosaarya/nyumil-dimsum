// js/views/order.js — F-06: daftar pesanan WA/preorder, dikelompokkan.
// Lihat docs/01-PRD.md §3.2. Nama tab "Order" (bukan "Preorder") atas
// permintaan pemilik.
import { daftarPesananWa, konfirmasiPelangganWa } from '../api.js';
import { rupiah, jamId, labelHari } from '../format.js';
import { el, toast } from '../ui.js';
import { mulaiPesananBaru } from './order-pesanan.js';
import { renderAntrian } from './antrian-dapur.js';

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat order...</div>';
  try {
    await gambarUlang(container);
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat order. Cek sinyal.'),
        el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s2);' },
          error?.message || String(error)),
        el('button', { class: 'btn btn--kedua', style: 'margin-top:var(--s3);', onclick: () => render(container) }, 'Coba Lagi'),
      ])
    );
  }
}

async function gambarUlang(container) {
  const semua = await daftarPesananWa();

  const tungguKonfirmasi = semua.filter((p) => !p.dikonfirmasi_pelanggan);
  const sudahKonfirmasi = semua.filter((p) => p.dikonfirmasi_pelanggan);
  const hariIni = sudahKonfirmasi.filter((p) => !p.waktu_ambil || labelHari(p.waktu_ambil) === 'hari ini');
  const besok = sudahKonfirmasi.filter((p) => labelHari(p.waktu_ambil) === 'besok');
  const nanti = sudahKonfirmasi.filter((p) => !hariIni.includes(p) && !besok.includes(p));

  container.innerHTML = '';
  const bungkus = el('div', { style: 'padding:var(--s4);' });
  container.appendChild(bungkus);

  if (semua.length === 0) {
    bungkus.appendChild(
      el('div', { style: 'padding:var(--s6) 0;text-align:center;color:var(--abu-kabut);' },
        'Belum ada order. Ketuk + untuk buat yang pertama.')
    );
  }

  const seksi = (judul, daftar) => {
    if (daftar.length === 0) return;
    bungkus.appendChild(el('div', { class: 'judul-seksi' }, judul));
    daftar.forEach((p) => bungkus.appendChild(kartuOrder(p, container)));
  };
  seksi('Tunggu Konfirmasi', tungguKonfirmasi);
  seksi('Hari Ini', hariIni);
  seksi('Besok', besok);
  seksi('Nanti', nanti);

  const bagianDapur = el('div', {});
  bungkus.appendChild(bagianDapur);
  renderAntrian(bagianDapur, (p) => p.kanal === 'WA');

  const fab = el('button', { class: 'wa-fab', 'aria-label': 'Order Baru' }, '+');
  fab.addEventListener('click', () => mulaiPesananBaru(container, () => render(container)));
  container.appendChild(fab);
}

function kartuOrder(p, container) {
  const total = (p.pesanan_item || []).reduce((t, i) => t + i.subtotal, 0);
  const badge = !p.dikonfirmasi_pelanggan
    ? el('span', { class: 'lencana lencana--tunggu' }, 'Tunggu Konfirmasi')
    : el('span', { class: 'lencana lencana--dibuat' }, 'Dikonfirmasi');

  const waktuTeks = p.waktu_ambil
    ? `${p.diantar ? 'kirim' : 'ambil'} ${labelHari(p.waktu_ambil)} ${jamId(p.waktu_ambil)}`
    : 'jam belum ditentukan';

  const kartu = el('div', { class: 'kartu-dapur' }, [
    el('div', { class: 'kartu-dapur__header' }, [
      el('span', { class: 'kartu-dapur__nomor' }, `#${p.nomor_antrian}`),
      badge,
    ]),
    el('div', { class: 'kartu-dapur__meta', style: 'text-align:left;margin-top:var(--s1);' },
      `${p.nama_pelanggan || '-'} · ${waktuTeks}`),
    el('div', { style: 'margin-top:var(--s2);font-family:var(--font-angka);font-weight:600;' }, rupiah(total)),
  ]);

  if (!p.dikonfirmasi_pelanggan) {
    const tombol = el('button', { class: 'btn btn--utama tombol-siap' }, 'Pelanggan Sudah Konfirmasi');
    tombol.addEventListener('click', async () => {
      tombol.disabled = true;
      try {
        await konfirmasiPelangganWa(p.id);
        await render(container);
      } catch (error) {
        tombol.disabled = false;
        toast('Gagal menandai konfirmasi: ' + (error?.message || error));
      }
    });
    kartu.appendChild(tombol);
  }

  return kartu;
}
