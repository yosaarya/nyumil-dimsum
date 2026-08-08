// js/views/finance.js — F-10 (laporan harian) + Alur F (tutup kasir).
// Lihat docs/01-PRD.md §3.6, CLAUDE.md B-14/B-16.
import { ringkasanTanggal, produkTerlarisTanggal, rincianPembayaranTanggal, ambilTutupKasir, simpanTutupKasir } from '../api.js';
import { rupiah } from '../format.js';
import { el, bukaSheet, toast } from '../ui.js';

function tanggalHariIni() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat laporan...</div>';

  const tanggal = tanggalHariIni();
  const [rRingkasan, rTerlaris, rRincian, rTutup] = await Promise.allSettled([
    ringkasanTanggal(tanggal),
    produkTerlarisTanggal(tanggal),
    rincianPembayaranTanggal(tanggal),
    ambilTutupKasir(tanggal),
  ]);

  if (rRingkasan.status === 'rejected') {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat laporan. Cek sinyal.'),
        el('button', { class: 'btn btn--kedua', style: 'margin-top:var(--s3);', onclick: () => render(container) }, 'Coba Lagi'),
      ])
    );
    return;
  }

  const ringkasan = rRingkasan.value;
  const terlaris = rTerlaris.status === 'fulfilled' ? rTerlaris.value : [];
  const rincian = rRincian.status === 'fulfilled' ? rRincian.value : { TUNAI: 0, QRIS: 0, TRANSFER: 0 };
  const tutup = rTutup.status === 'fulfilled' ? rTutup.value : undefined;

  container.innerHTML = '';
  const bungkus = el('div', { style: 'padding:var(--s5) var(--s5) var(--s7);' });
  container.appendChild(bungkus);

  bungkus.appendChild(el('div', { class: 'sheet__judul' }, 'Laporan Hari Ini'));
  bungkus.appendChild(
    el('div', { class: 'stat-grid' }, [
      kartuStat('Omzet', rupiah(ringkasan?.omzet || 0)),
      kartuStat('Pesanan', String(ringkasan?.jumlah_pesanan || 0)),
    ])
  );

  bungkus.appendChild(el('div', { class: 'judul-seksi' }, 'Rincian Pembayaran'));
  bungkus.appendChild(
    el('div', {}, [
      el('div', { class: 'baris-ringkas' }, [el('span', {}, 'Tunai'), el('span', {}, rupiah(rincian.TUNAI))]),
      el('div', { class: 'baris-ringkas' }, [el('span', {}, 'QRIS'), el('span', {}, rupiah(rincian.QRIS))]),
      el('div', { class: 'baris-ringkas' }, [el('span', {}, 'Transfer'), el('span', {}, rupiah(rincian.TRANSFER))]),
    ])
  );

  bungkus.appendChild(el('div', { class: 'judul-seksi' }, 'Produk Terlaris'));
  bungkus.appendChild(
    terlaris.length > 0
      ? el('div', {}, terlaris.map((p) =>
          el('div', { class: 'baris-ringkas' }, [
            el('span', {}, `${p.nama_produk} × ${p.terjual}`),
            el('span', {}, rupiah(p.omzet)),
          ])
        ))
      : el('div', { style: 'color:var(--abu-kabut);font-size:var(--t-sm);padding:var(--s2) 0;' },
          'Belum ada pesanan selesai hari ini.')
  );

  bungkus.appendChild(el('div', { class: 'judul-seksi' }, 'Tutup Kasir'));
  if (tutup) {
    bungkus.appendChild(
      el('div', { class: 'kartu-dapur' }, [
        el('span', { class: 'lencana lencana--dibuat' }, 'Sudah Ditutup'),
        el('div', { class: 'baris-ringkas' }, [el('span', {}, 'Uang fisik di laci'), el('span', {}, rupiah(tutup.uang_fisik))]),
        el('div', { class: 'baris-ringkas' }, [
          el('span', {}, 'Selisih'),
          el('span', { style: tutup.selisih < 0 ? 'color:var(--sambal);font-weight:700;' : 'font-weight:700;' }, rupiah(tutup.selisih)),
        ]),
      ])
    );
  } else if (rTutup.status === 'rejected') {
    bungkus.appendChild(
      el('div', { style: 'color:var(--abu-kabut);font-size:var(--t-sm);' }, 'Tutup kasir cuma bisa dilihat/diisi oleh akun Pemilik/Admin.')
    );
  } else {
    const tombolTutup = el('button', { class: 'btn btn--utama login-tombol' }, 'Tutup Kasir Hari Ini');
    tombolTutup.addEventListener('click', () => bukaFormTutupKasir(bungkus, tanggal, ringkasan, rincian, () => render(container)));
    bungkus.appendChild(tombolTutup);
  }
}

function kartuStat(label, nilai) {
  return el('div', { class: 'kartu-stat' }, [
    el('div', { class: 'kartu-stat__nilai' }, nilai),
    el('div', { class: 'kartu-stat__label' }, label),
  ]);
}

function bukaFormTutupKasir(bungkus, tanggal, ringkasan, rincian, onSelesai) {
  const totalOmzet = ringkasan?.omzet || 0;
  const jumlahPesanan = ringkasan?.jumlah_pesanan || 0;

  let overlay;
  const inputUangFisik = el('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: 'Uang tunai fisik di laci' });
  const elSelisih = el('div', { class: 'kembalian-besar' }, '');
  const inputCatatan = el('input', { class: 'input', placeholder: 'Catatan (opsional)' });
  const elGalat = el('div', { class: 'bayar-galat' });

  function hitungSelisih() {
    const uangFisik = Number(inputUangFisik.value) || 0;
    const selisih = uangFisik - rincian.TUNAI;
    elSelisih.textContent = inputUangFisik.value ? `Selisih ${rupiah(selisih)}` : '';
    elSelisih.style.color = selisih < 0 ? 'var(--sambal)' : 'var(--daun-bawang)';
  }
  inputUangFisik.addEventListener('input', hitungSelisih);

  const tombolSimpan = el('button', { class: 'btn btn--utama login-tombol' }, 'Simpan Tutup Kasir');
  tombolSimpan.addEventListener('click', async () => {
    if (!inputUangFisik.value) {
      elGalat.textContent = 'Isi uang fisik di laci dulu.';
      return;
    }
    elGalat.textContent = '';
    tombolSimpan.disabled = true;
    tombolSimpan.textContent = 'Menyimpan...';
    try {
      await simpanTutupKasir({
        tanggal,
        totalOmzet,
        totalTunai: rincian.TUNAI,
        totalQris: rincian.QRIS,
        totalTransfer: rincian.TRANSFER,
        jumlahPesanan,
        uangFisik: Number(inputUangFisik.value),
        catatan: inputCatatan.value.trim(),
      });
      overlay.remove();
      toast('Tutup kasir tersimpan.');
      onSelesai();
    } catch (error) {
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = 'Simpan Tutup Kasir';
      elGalat.textContent = 'Gagal simpan: ' + (error?.message || error);
    }
  });

  overlay = bukaSheet(
    el('div', {}, [
      el('div', { class: 'sheet__judul' }, 'Tutup Kasir Hari Ini'),
      el('div', { class: 'baris-ringkas', style: 'font-weight:600;' }, [el('span', {}, 'Tunai seharusnya'), el('span', {}, rupiah(rincian.TUNAI))]),
      el('div', { style: 'margin:var(--s4) 0 var(--s2);font-weight:700;' }, 'Uang tunai fisik di laci'),
      inputUangFisik,
      elSelisih,
      el('div', { style: 'margin:var(--s3) 0 var(--s2);font-weight:600;' }, 'Catatan'),
      inputCatatan,
      elGalat,
      tombolSimpan,
    ])
  );
}
