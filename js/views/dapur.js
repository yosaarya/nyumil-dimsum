// js/views/dapur.js — F-07: antrian dapur, centang per item, Siap -> Selesai.
// Lihat docs/01-PRD.md §3.3 (Alur C), §5 (acceptance F-07), CLAUDE.md B-10/B-11.
import { antrianDapur, tandaiItemSelesai, ubahStatusPesanan } from '../api.js';
import { jamId } from '../format.js';
import { el, toast } from '../ui.js';

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat antrian...</div>';
  try {
    await gambarUlang(container);
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat antrian dapur. Cek sinyal.'),
        el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s2);' },
          error?.message || String(error)),
        el('button', { class: 'btn btn--kedua', style: 'margin-top:var(--s3);', onclick: () => render(container) }, 'Coba Lagi'),
      ])
    );
  }
}

async function gambarUlang(container) {
  const semua = await antrianDapur();
  const berjalan = semua.filter((p) => p.status === 'DIKONFIRMASI' || p.status === 'DIBUAT');
  const siap = semua.filter((p) => p.status === 'SIAP');

  container.innerHTML = '';

  if (semua.length === 0) {
    container.appendChild(
      el('div', { style: 'padding:var(--s6) var(--s5);text-align:center;color:var(--abu-kabut);' },
        'Belum ada pesanan. Enak nih, santai dulu.')
    );
    return;
  }

  const bungkus = el('div', { style: 'padding:var(--s4);' });
  container.appendChild(bungkus);

  if (berjalan.length > 0) {
    bungkus.appendChild(el('div', { class: 'judul-seksi' }, 'Sedang Disiapkan'));
    berjalan.forEach((p) => bungkus.appendChild(kartuBerjalan(p, container)));
  }

  if (siap.length > 0) {
    bungkus.appendChild(el('div', { class: 'judul-seksi' }, 'Siap Diambil'));
    siap.forEach((p) => bungkus.appendChild(kartuSiap(p, container)));
  }
}

function infoTelat(p) {
  if (!p.waktu_ambil) return null;
  const bedaMenit = Math.floor((Date.now() - new Date(p.waktu_ambil).getTime()) / 60000);
  return bedaMenit > 0 ? bedaMenit : null;
}

function headerKartu(p) {
  const telat = infoTelat(p);
  const sumber =
    p.kanal === 'WA'
      ? el('span', { class: 'lencana lencana--wa' }, '● WA')
      : el('span', { class: 'lencana lencana--kedai' }, '● Kedai');

  const meta = [sumber];
  if (p.nama_pelanggan) meta.push(p.nama_pelanggan);
  if (p.waktu_ambil) meta.push(`ambil ${jamId(p.waktu_ambil)}`);

  const header = el('div', { class: 'kartu-dapur__header' }, [
    el('span', { class: 'kartu-dapur__nomor' }, `#${p.nomor_antrian}`),
    el('div', { class: 'kartu-dapur__meta' }, meta.flatMap((m, i) => (i > 0 ? [' · ', m] : [m]))),
  ]);

  return { header, telat };
}

function kartuBerjalan(p, container) {
  const { header, telat } = headerKartu(p);
  const items = [...p.pesanan_item].sort((a, b) => a.urutan - b.urutan);
  const semuaSelesai = () => items.every((i) => i.selesai_dibuat);

  const tombolSiap = el('button', { class: 'btn tombol-siap' }, '');

  function perbaruiTombol() {
    const jumlahSelesai = items.filter((i) => i.selesai_dibuat).length;
    tombolSiap.textContent = `SIAP (${jumlahSelesai}/${items.length})`;
    tombolSiap.className = `btn tombol-siap ${semuaSelesai() ? 'btn--utama' : 'btn--nonaktif'}`;
  }

  const barisItem = items.map((item) => {
    const baris = el('button', { class: 'item-dapur' }, [
      el('span', { class: 'item-dapur__cek' }, ''),
      el('div', {}, [
        el('div', { class: 'item-dapur__nama' }, `${item.jumlah}× ${item.nama_produk}`),
        ...(item.pesanan_item_opsi || []).map((o) => el('div', { class: 'item-dapur__varian' }, o.nama_opsi)),
      ]),
    ]);

    function gambarUlangBaris() {
      baris.className = `item-dapur${item.selesai_dibuat ? ' item-dapur--selesai' : ''}`;
      const cek = baris.querySelector('.item-dapur__cek');
      cek.textContent = item.selesai_dibuat ? '✓' : '';
      cek.className = `item-dapur__cek${item.selesai_dibuat ? ' item-dapur__cek--selesai' : ''}`;
    }
    gambarUlangBaris();

    baris.addEventListener('click', async () => {
      const sebelumnya = item.selesai_dibuat;
      item.selesai_dibuat = !sebelumnya;
      gambarUlangBaris();
      perbaruiTombol();
      try {
        await tandaiItemSelesai(item.id, item.selesai_dibuat);
        if (item.selesai_dibuat && p.status === 'DIKONFIRMASI') {
          await ubahStatusPesanan(p.id, 'DIBUAT');
          p.status = 'DIBUAT';
        }
      } catch (error) {
        item.selesai_dibuat = sebelumnya;
        gambarUlangBaris();
        perbaruiTombol();
        toast('Gagal simpan centang. Cek sinyal, coba lagi.');
      }
    });
    return baris;
  });

  tombolSiap.addEventListener('click', async () => {
    if (!semuaSelesai()) {
      toast('Centang semua item dulu.');
      return;
    }
    tombolSiap.disabled = true;
    try {
      await ubahStatusPesanan(p.id, 'SIAP');
      await render(container);
    } catch (error) {
      tombolSiap.disabled = false;
      toast('Gagal ubah status: ' + (error?.message || error));
    }
  });

  perbaruiTombol();

  return el('div', { class: `kartu-dapur${telat != null ? ' kartu-dapur--telat' : ''}` }, [
    header,
    telat != null ? el('div', { class: 'kartu-dapur__telat-label' }, `TELAT ${telat} menit`) : '',
    el('hr', { class: 'kartu-dapur__garis' }),
    ...barisItem,
    el('hr', { class: 'kartu-dapur__garis' }),
    tombolSiap,
  ]);
}

function kartuSiap(p, container) {
  const { header, telat } = headerKartu(p);
  const tombolSelesai = el('button', { class: 'btn btn--utama tombol-siap' }, 'SELESAI (sudah diambil & lunas)');
  tombolSelesai.addEventListener('click', async () => {
    tombolSelesai.disabled = true;
    try {
      await ubahStatusPesanan(p.id, 'SELESAI');
      await render(container);
    } catch (error) {
      tombolSelesai.disabled = false;
      toast('Belum bisa diselesaikan: ' + (error?.message || error));
    }
  });

  return el('div', { class: `kartu-dapur${telat != null ? ' kartu-dapur--telat' : ''}` }, [
    header,
    telat != null ? el('div', { class: 'kartu-dapur__telat-label' }, `TELAT ${telat} menit`) : '',
    el('span', { class: 'lencana lencana--siap' }, 'Siap Diambil'),
    tombolSelesai,
  ]);
}
