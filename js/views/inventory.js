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
  const tombolImport = el('button', { class: 'btn btn--kedua', style: 'margin-bottom:var(--s3);' }, '📥 Import Bahan dari CSV');
  tombolImport.addEventListener('click', () => bukaImportCsv(() => render(container)));
  bungkus.appendChild(tombolImport);

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

// =========================================================================
// Import CSV — F-13 lanjutan: masuk banyak bahan sekaligus tanpa isi satu
// per satu. Diproses di HP (tanpa library CSV pihak ketiga, lihat B2 di
// CLAUDE.md), lalu tiap baris dikirim lewat tambah_stok_bahan() yang sama
// dengan form manual -- jadi bahan yang namanya sudah ada otomatis
// digabung stoknya, bukan dobel (lihat 008_tambah_stok_bahan.sql).
// =========================================================================
const KOLOM_WAJIB = ['nama', 'kategori', 'satuan', 'tempat', 'jumlah'];
const KOLOM_OPSIONAL = ['tgl_expired', 'stok_minimum'];
const CONTOH_CSV =
  'nama,kategori,satuan,tempat,jumlah,tgl_expired,stok_minimum\n' +
  'Ayam Fillet,PROTEIN,KG,FREEZER,10,2026-12-31,2\n' +
  'Kulit Pangsit,KARBO,PAK,FREEZER,50,,5\n';

function parseBarisCsv(baris) {
  const hasil = [];
  let field = '';
  let dalamKutip = false;
  for (let i = 0; i < baris.length; i++) {
    const c = baris[i];
    if (dalamKutip) {
      if (c === '"') {
        if (baris[i + 1] === '"') { field += '"'; i++; } else dalamKutip = false;
      } else field += c;
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === ',') {
      hasil.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  hasil.push(field);
  return hasil.map((f) => f.trim());
}

/** @returns {{ok:true, valid:object[], gagal:{baris:number,alasan:string}[]}|{ok:false, alasan:string}} */
function parseDanValidasiCsv(teks) {
  const baris = teks.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((b) => b.trim() !== '');
  if (baris.length === 0) return { ok: false, alasan: 'File kosong.' };

  const header = parseBarisCsv(baris[0]).map((h) => h.toLowerCase());
  const kolomHilang = KOLOM_WAJIB.filter((k) => !header.includes(k));
  if (kolomHilang.length > 0) {
    return { ok: false, alasan: `Kolom wajib tidak ada di header: ${kolomHilang.join(', ')}.` };
  }

  const valid = [];
  const gagal = [];
  for (let i = 1; i < baris.length; i++) {
    const nomorBaris = i + 1; // nomor baris asli di file (1 = header)
    const kolom = parseBarisCsv(baris[i]);
    const ambil = (nama) => {
      const idx = header.indexOf(nama);
      return idx >= 0 ? (kolom[idx] || '').trim() : '';
    };

    const nama = ambil('nama');
    const kategori = ambil('kategori').toUpperCase();
    const satuan = ambil('satuan').toUpperCase();
    const tempat = ambil('tempat').toUpperCase();
    const jumlahTeks = ambil('jumlah');
    const tglExpired = ambil('tgl_expired');
    const stokMinTeks = ambil('stok_minimum');

    if (!nama) { gagal.push({ baris: nomorBaris, alasan: 'Nama bahan kosong.' }); continue; }
    if (!KATEGORI_BAHAN.some((k) => k.nilai === kategori)) {
      gagal.push({ baris: nomorBaris, alasan: `Kategori "${kategori}" tidak dikenal.` }); continue;
    }
    if (!SATUAN.includes(satuan)) {
      gagal.push({ baris: nomorBaris, alasan: `Satuan "${satuan}" tidak dikenal.` }); continue;
    }
    if (!TEMPAT.some((t) => t.nilai === tempat)) {
      gagal.push({ baris: nomorBaris, alasan: `Tempat simpan "${tempat}" tidak dikenal.` }); continue;
    }
    const jumlah = Number(jumlahTeks);
    if (!jumlah || jumlah <= 0) {
      gagal.push({ baris: nomorBaris, alasan: `Jumlah "${jumlahTeks}" harus angka lebih dari 0.` }); continue;
    }
    if (tglExpired && !/^\d{4}-\d{2}-\d{2}$/.test(tglExpired)) {
      gagal.push({ baris: nomorBaris, alasan: `Tanggal expired "${tglExpired}" harus format YYYY-MM-DD.` }); continue;
    }
    if (stokMinTeks && (Number.isNaN(Number(stokMinTeks)) || Number(stokMinTeks) < 0)) {
      gagal.push({ baris: nomorBaris, alasan: `Batas stok menipis "${stokMinTeks}" harus angka.` }); continue;
    }

    valid.push({
      nama, kategori, satuan, tempat, jumlah,
      tgl_expired: tglExpired || null,
      stok_minimum: stokMinTeks || null,
    });
  }

  return { ok: true, valid, gagal };
}

function unduhContohCsv() {
  const blob = new Blob([CONTOH_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'contoh-import-bahan.csv' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bukaImportCsv(onSukses) {
  const kolomKeterangan =
    `Kolom wajib: ${KOLOM_WAJIB.join(', ')}. Kolom opsional: ${KOLOM_OPSIONAL.join(', ')}. ` +
    `Kategori: ${KATEGORI_BAHAN.map((k) => k.nilai).join('/')}. Satuan: ${SATUAN.join('/')}. ` +
    `Tempat: ${TEMPAT.map((t) => t.nilai).join('/')}.`;

  const inputFile = el('input', { class: 'input', type: 'file', accept: '.csv,text/csv' });
  const tombolContoh = el('button', { class: 'btn btn--kedua', style: 'margin-top:var(--s2);' }, 'Unduh Contoh CSV');
  tombolContoh.addEventListener('click', unduhContohCsv);

  const bungkusPreview = el('div', { style: 'margin-top:var(--s3);' });
  const elGalat = el('div', { class: 'bayar-galat' });
  const tombolImport = el('button', { class: 'btn btn--nonaktif login-tombol', style: 'margin-top:var(--s3);' }, 'Pilih file dulu');
  tombolImport.disabled = true;

  let barisValid = null;

  inputFile.addEventListener('change', async () => {
    const file = inputFile.files?.[0];
    bungkusPreview.innerHTML = '';
    elGalat.textContent = '';
    barisValid = null;
    tombolImport.disabled = true;
    tombolImport.className = 'btn btn--nonaktif login-tombol';
    tombolImport.textContent = 'Pilih file dulu';
    if (!file) return;

    const teks = await file.text();
    const hasil = parseDanValidasiCsv(teks);
    if (!hasil.ok) {
      elGalat.textContent = hasil.alasan;
      return;
    }
    barisValid = hasil.valid;

    bungkusPreview.appendChild(
      el('div', { class: 'baris-ringkas' }, [
        el('span', {}, 'Baris valid'),
        el('span', { style: 'color:var(--daun-bawang);font-weight:700;' }, String(hasil.valid.length)),
      ])
    );
    if (hasil.gagal.length > 0) {
      bungkusPreview.appendChild(
        el('div', { class: 'baris-ringkas' }, [
          el('span', {}, 'Baris gagal (dilewati)'),
          el('span', { style: 'color:var(--sambal);font-weight:700;' }, String(hasil.gagal.length)),
        ])
      );
      hasil.gagal.slice(0, 8).forEach((g) => {
        bungkusPreview.appendChild(
          el('div', { style: 'font-size:var(--t-xs);color:var(--sambal);padding:var(--s1) 0;' },
            `Baris ${g.baris}: ${g.alasan}`)
        );
      });
      if (hasil.gagal.length > 8) {
        bungkusPreview.appendChild(
          el('div', { style: 'font-size:var(--t-xs);color:var(--abu-kabut);' }, `...dan ${hasil.gagal.length - 8} baris lainnya.`)
        );
      }
    }

    if (hasil.valid.length > 0) {
      tombolImport.disabled = false;
      tombolImport.className = 'btn btn--utama login-tombol';
      tombolImport.textContent = `Import ${hasil.valid.length} Bahan`;
    } else {
      tombolImport.textContent = 'Tidak ada baris valid';
    }
  });

  tombolImport.addEventListener('click', async () => {
    if (!barisValid || barisValid.length === 0) return;
    tombolImport.disabled = true;
    let sukses = 0;
    const gagalKirim = [];
    for (let i = 0; i < barisValid.length; i++) {
      tombolImport.textContent = `Mengimpor ${i + 1}/${barisValid.length}...`;
      try {
        await tambahStokBahan(barisValid[i]);
        sukses++;
      } catch (error) {
        gagalKirim.push(`${barisValid[i].nama}: ${error?.message || error}`);
      }
    }

    bungkusPreview.innerHTML = '';
    bungkusPreview.appendChild(
      el('div', { class: 'baris-ringkas' }, [el('span', {}, 'Berhasil diimpor'), el('span', { style: 'font-weight:700;' }, String(sukses))])
    );
    if (gagalKirim.length > 0) {
      bungkusPreview.appendChild(
        el('div', { class: 'baris-ringkas' }, [el('span', {}, 'Gagal'), el('span', { style: 'color:var(--sambal);font-weight:700;' }, String(gagalKirim.length))])
      );
      gagalKirim.forEach((g) => bungkusPreview.appendChild(el('div', { style: 'font-size:var(--t-xs);color:var(--sambal);padding:var(--s1) 0;' }, g)));
    }

    tombolImport.style.display = 'none';
    inputFile.style.display = 'none';
    tombolContoh.style.display = 'none';
    toast(`${sukses} bahan berhasil diimpor.`);
    onSukses();

    const tombolSelesai = el('button', { class: 'btn btn--kedua login-tombol', style: 'margin-top:var(--s3);' }, 'Tutup');
    tombolSelesai.addEventListener('click', () => overlay.remove());
    bungkusPreview.appendChild(tombolSelesai);
  });

  const overlay = bukaSheet(
    el('div', {}, [
      el('div', { class: 'sheet__judul' }, 'Import Bahan dari CSV'),
      el('div', { style: 'color:var(--abu-kabut);font-size:var(--t-xs);margin-bottom:var(--s3);' }, kolomKeterangan),
      tombolContoh,
      el('div', { class: 'langkah-judul' }, 'Pilih File CSV'),
      inputFile,
      bungkusPreview,
      elGalat,
      tombolImport,
    ])
  );
}
