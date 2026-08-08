// js/views/inventory.js — F-13: stok bahan per kategori + expired.
// Lihat docs/01-PRD.md §3.4 (Alur D), §5 badge status, CLAUDE.md B-17/B-19/B-20/B-21.
import { stokBahan, tambahStokBahan } from '../api.js';
import { el, bukaSheet, toast } from '../ui.js';

const KATEGORI_BAHAN = [
  { nilai: 'PROTEIN', label: 'Protein', ikon: '🥩', warna: '#E86A4A', bg: 'rgba(232,106,74,.12)' },
  { nilai: 'SAYURAN', label: 'Sayuran', ikon: '🥬', warna: '#5FA97C', bg: 'rgba(95,169,124,.12)' },
  { nilai: 'BUMBU', label: 'Bumbu', ikon: '🧂', warna: '#E0A93C', bg: 'rgba(224,169,60,.12)' },
  { nilai: 'BUAH', label: 'Buah', ikon: '🍎', warna: '#E15C6B', bg: 'rgba(225,92,107,.12)' },
  { nilai: 'DAIRY', label: 'Dairy', ikon: '🥛', warna: '#6FA8D6', bg: 'rgba(111,168,214,.12)' },
  { nilai: 'KARBO', label: 'Karbo', ikon: '🍚', warna: '#C08BD1', bg: 'rgba(192,139,209,.12)' },
  { nilai: 'LAINNYA', label: 'Lainnya', ikon: '📦', warna: '#9A9184', bg: 'rgba(154,145,132,.12)' },
];
const SATUAN = ['KG', 'GRAM', 'LITER', 'ML', 'PCS', 'BUNGKUS', 'PAK', 'IKAT'];
const TEMPAT = [
  { nilai: 'FREEZER', label: 'Freezer' },
  { nilai: 'KULKAS', label: 'Kulkas' },
  { nilai: 'SUHU_RUANG', label: 'Suhu Ruang' },
];

let bahanCache = null;
let kategoriAktif = null;

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat stok...</div>';
  try {
    bahanCache = await stokBahan();
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat stok. Cek sinyal.'),
        el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);margin-top:var(--s2);' },
          error?.message || String(error)),
        el('button', { class: 'btn btn--kedua', style: 'margin-top:var(--s3);', onclick: () => render(container) }, 'Coba Lagi'),
      ])
    );
    return;
  }
  gambarDaftar(container);
}

function gambarDaftar(container) {
  container.innerHTML = '';
  const bungkus = el('div', { style: 'padding: 0 var(--s4) 96px;' });

  const chipSemua = el('button', {
    class: `kategori-chip${kategoriAktif === null ? ' kategori-chip--aktif' : ''}`,
    onclick: () => { kategoriAktif = null; gambarDaftar(container); },
  }, 'Semua');
  const chipKategori = KATEGORI_BAHAN.map((k) =>
    el('button', {
      class: `kategori-chip${kategoriAktif === k.nilai ? ' kategori-chip--aktif' : ''}`,
      onclick: () => { kategoriAktif = k.nilai; gambarDaftar(container); },
    }, `${k.ikon} ${k.label}`)
  );
  bungkus.appendChild(el('div', { class: 'kategori-baris' }, [chipSemua, ...chipKategori]));

  const daftarTerfilter = kategoriAktif ? bahanCache.filter((b) => b.kategori === kategoriAktif) : bahanCache;

  if (daftarTerfilter.length === 0) {
    bungkus.appendChild(
      el('div', { style: 'padding:var(--s6) 0;text-align:center;color:var(--abu-kabut);' },
        'Belum ada bahan tercatat. Mulai dari yang di freezer.')
    );
  } else {
    daftarTerfilter.forEach((b) => bungkus.appendChild(kartuBahan(b)));
  }

  container.appendChild(bungkus);

  const fab = el('button', { class: 'wa-fab', 'aria-label': 'Tambah Bahan' }, '+');
  fab.addEventListener('click', () => bukaTambahBahan(() => render(container)));
  container.appendChild(fab);
}

function statusBahan(b) {
  if (b.expired_terdekat) {
    const hariLagi = Math.ceil((new Date(b.expired_terdekat) - new Date()) / 86400000);
    if (hariLagi < 0) return { label: 'Expired', kelas: 'lencana--expired' };
    if (hariLagi <= 3) return { label: `Sisa ${hariLagi} hari`, kelas: 'lencana--expired' };
  }
  if (b.menipis) return { label: 'Menipis', kelas: 'lencana--menipis' };
  return { label: 'Aman', kelas: 'lencana--aman' };
}

function labelTempat(t) {
  return { FREEZER: 'Freezer', KULKAS: 'Kulkas', SUHU_RUANG: 'Suhu Ruang' }[t] || t;
}

function kartuBahan(b) {
  const status = statusBahan(b);
  const kat = KATEGORI_BAHAN.find((k) => k.nilai === b.kategori);
  const stok = Number(b.stok);
  const stokNegatif = stok < 0;

  return el('div', { class: 'kartu-dapur' }, [
    el('div', { class: 'kartu-dapur__header' }, [
      el('span', {}, `${kat?.ikon || ''} ${b.nama}`),
      el('span', { class: `lencana ${status.kelas}` }, status.label),
    ]),
    el('div', {
      class: 'kartu-dapur__meta',
      style: `text-align:left;margin-top:var(--s1);${stokNegatif ? 'color:var(--sambal);font-weight:700;' : ''}`,
    }, `${stok.toLocaleString('id-ID', { maximumFractionDigits: 3 })} ${b.satuan} · ${labelTempat(b.tempat)}`),
  ]);
}

function bukaTambahBahan(onSukses) {
  const data = { kategori: null, tempat: 'FREEZER' };
  const tombolUbin = [];

  function pilihKategori(nilai) {
    data.kategori = nilai;
    tombolUbin.forEach((btn, i) => {
      const k = KATEGORI_BAHAN[i];
      const aktif = k.nilai === nilai;
      btn.style.background = aktif ? k.warna : k.bg;
      btn.style.color = aktif ? '#fff' : 'var(--arang)';
    });
    perbaruiTombolSimpan();
  }

  KATEGORI_BAHAN.forEach((k) => {
    const btn = el('button', {
      class: 'ubin-kategori__item', style: `background:${k.bg};color:var(--arang);`,
      onclick: () => pilihKategori(k.nilai),
    }, [el('span', { class: 'ikon' }, k.ikon), el('span', {}, k.label)]);
    tombolUbin.push(btn);
  });

  const inputNama = el('input', { class: 'input', placeholder: 'Contoh: ayam fillet, udang, kulit pangsit' });
  const inputJumlah = el('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: 'Jumlah', style: 'flex:1;' });
  const selectSatuan = el('select', { class: 'input', style: 'flex:1;' }, SATUAN.map((s) => el('option', { value: s }, s)));
  const inputExpired = el('input', { class: 'input', type: 'date' });
  const inputStokMin = el('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: 'Batas menipis (opsional)' });

  const tombolTempat = TEMPAT.map((t, i) =>
    el('button', {
      class: `pill${t.nilai === data.tempat ? ' pill--aktif' : ''}`,
      onclick: () => {
        data.tempat = t.nilai;
        tombolTempat.forEach((b, j) => { b.className = `pill${TEMPAT[j].nilai === data.tempat ? ' pill--aktif' : ''}`; });
      },
    }, t.label)
  );

  const elGalat = el('div', { class: 'bayar-galat' });
  const tombolSimpan = el('button', { class: 'btn btn--nonaktif login-tombol' }, 'Pilih kategori dulu');

  function perbaruiTombolSimpan() {
    const nama = inputNama.value.trim();
    const siap = data.kategori && nama;
    tombolSimpan.className = `btn login-tombol ${siap ? 'btn--utama' : 'btn--nonaktif'}`;
    tombolSimpan.textContent = siap ? 'Simpan Bahan' : (!data.kategori ? 'Pilih kategori dulu' : 'Isi nama bahan dulu');
  }
  inputNama.addEventListener('input', perbaruiTombolSimpan);

  tombolSimpan.addEventListener('click', async () => {
    const nama = inputNama.value.trim();
    if (!data.kategori || !nama) return;
    const jumlah = Number(inputJumlah.value);
    if (!jumlah || jumlah <= 0) {
      elGalat.textContent = 'Jumlah wajib diisi lebih dari 0.';
      return;
    }
    elGalat.textContent = '';
    tombolSimpan.disabled = true;
    tombolSimpan.textContent = 'Menyimpan...';
    try {
      await tambahStokBahan({
        nama,
        kategori: data.kategori,
        satuan: selectSatuan.value,
        tempat: data.tempat,
        jumlah,
        tgl_expired: inputExpired.value || null,
        stok_minimum: inputStokMin.value || null,
      });
      overlay.remove();
      toast('Bahan tersimpan.');
      onSukses();
    } catch (error) {
      tombolSimpan.disabled = false;
      perbaruiTombolSimpan();
      elGalat.textContent = 'Gagal simpan: ' + (error?.message || error);
    }
  });

  const overlay = bukaSheet(
    el('div', {}, [
      el('div', { class: 'sheet__judul' }, 'Tambah Bahan'),
      el('div', { class: 'langkah-judul' }, '1  Pilih Kategori'),
      el('div', { class: 'ubin-kategori' }, tombolUbin),
      el('div', { class: 'langkah-judul' }, '2  Nama Bahan'),
      inputNama,
      el('div', { class: 'langkah-judul' }, '3  Jumlah'),
      el('div', { style: 'display:flex;gap:var(--s2);' }, [inputJumlah, selectSatuan]),
      el('div', { class: 'langkah-judul' }, 'Tempat Simpan'),
      el('div', { class: 'kasir-toggle-kanal', style: 'padding:0;' }, tombolTempat),
      el('div', { class: 'langkah-judul' }, 'Tanggal Kedaluwarsa (opsional)'),
      inputExpired,
      el('div', { class: 'langkah-judul' }, 'Batas Stok Menipis (opsional)'),
      inputStokMin,
      elGalat,
      tombolSimpan,
    ])
  );
}
