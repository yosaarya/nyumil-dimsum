// js/views/produksi.js — tab Kitchen. F-14/F-15: resep per produk + produksi
// yang otomatis potong stok bahan lewat catat_produksi() (B-22: kalau resep
// belum diatur, produksi tetap tercatat tapi stok tidak berkurang).
// Lihat docs/01-PRD.md §3.5 (Alur E).
import {
  stokBahan, produkUntukProduksi, resepProduk, simpanResep, catatProduksi, daftarProduksi,
} from '../api.js';
import { el, bukaSheet, toast } from '../ui.js';
import { jamId, labelHari } from '../format.js';

let riwayatCache = null;

export async function render(container) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat produksi...</div>';
  try {
    riwayatCache = await daftarProduksi();
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat riwayat produksi. Cek sinyal.'),
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
  const bungkus = el('div', { style: 'padding: var(--s4) var(--s4) 96px;' });
  bungkus.appendChild(el('div', { class: 'judul-seksi' }, 'Riwayat Produksi'));

  if (riwayatCache.length === 0) {
    bungkus.appendChild(
      el('div', { style: 'padding:var(--s6) 0;text-align:center;color:var(--abu-kabut);' },
        'Belum ada produksi tercatat. Mulai dari tombol + di bawah.')
    );
  } else {
    riwayatCache.forEach((p) => bungkus.appendChild(kartuProduksi(p)));
  }

  container.appendChild(bungkus);

  const fab = el('button', { class: 'wa-fab', 'aria-label': 'Produksi Baru' }, '+');
  fab.addEventListener('click', () => bukaPilihProduk(container));
  container.appendChild(fab);
}

function kartuProduksi(p) {
  return el('div', { class: 'kartu-dapur' }, [
    el('div', { class: 'kartu-dapur__header' }, [
      el('span', {}, `${p.produk?.nama || 'Produk'} ×${p.jumlah_hasil}`),
      el('span', { class: `lencana ${p.potong_stok ? 'lencana--aman' : 'lencana--menipis'}` },
        p.potong_stok ? 'Stok terpotong' : 'Tanpa resep'),
    ]),
    el('div', { class: 'kartu-dapur__meta', style: 'text-align:left;margin-top:var(--s1);' },
      `${labelHari(p.created_at)} ${jamId(p.created_at)}${p.catatan ? ' · ' + p.catatan : ''}`),
  ]);
}

function bukaPilihProduk(container) {
  const konten = el('div', {}, [
    el('div', { class: 'sheet__judul' }, 'Produksi Baru — Pilih Produk'),
    el('div', { style: 'padding:var(--s4) 0;color:var(--abu-kabut);' }, 'Memuat menu...'),
  ]);
  const overlay = bukaSheet(konten);

  produkUntukProduksi()
    .then((produkList) => {
      konten.innerHTML = '';
      konten.appendChild(el('div', { class: 'sheet__judul' }, 'Produksi Baru — Pilih Produk'));
      const kartuList = produkList.map((p) => {
        const kartu = el('button', { class: 'kartu-produk' }, [
          el('span', { class: 'kartu-produk__nama' }, p.nama),
        ]);
        kartu.addEventListener('click', () => {
          overlay.remove();
          bukaFormProduksi(container, p);
        });
        return kartu;
      });
      konten.appendChild(el('div', { class: 'grid-produk', style: 'margin-top:var(--s3);' }, kartuList));
    })
    .catch((error) => {
      konten.innerHTML = '';
      konten.appendChild(el('div', { style: 'color:var(--sambal);' }, 'Gagal memuat menu: ' + (error?.message || error)));
    });
}

async function bukaFormProduksi(container, produk) {
  const konten = el('div', {}, [
    el('div', { class: 'sheet__judul' }, produk.nama),
    el('div', { style: 'padding:var(--s4) 0;color:var(--abu-kabut);' }, 'Memuat resep...'),
  ]);
  const overlay = bukaSheet(konten);

  let resep, stokList;
  try {
    [resep, stokList] = await Promise.all([resepProduk(produk.id), stokBahan()]);
  } catch (error) {
    konten.innerHTML = '';
    konten.appendChild(el('div', { style: 'color:var(--sambal);' }, 'Gagal memuat resep: ' + (error?.message || error)));
    return;
  }

  if (resep) {
    gambarFormProduksiDenganResep(konten, overlay, container, produk, resep, stokList);
  } else {
    gambarTawaranAturResep(konten, overlay, container, produk, stokList);
  }
}

function gambarFormProduksiDenganResep(konten, overlay, container, produk, resep, stokList) {
  konten.innerHTML = '';
  const stokById = Object.fromEntries(stokList.map((b) => [b.id, b]));

  const inputJumlah = el('input', {
    class: 'input', type: 'number', inputmode: 'numeric', min: '1',
    value: String(resep.hasil_jumlah),
  });
  const bungkusPreview = el('div', { style: 'margin-top:var(--s3);' });
  const inputCatatan = el('input', { class: 'input', placeholder: 'Catatan (opsional)' });
  const elGalat = el('div', { class: 'bayar-galat' });

  function gambarPreview() {
    const jumlahHasil = Number(inputJumlah.value) || 0;
    bungkusPreview.innerHTML = '';
    let adaKurang = false;
    for (const ri of resep.resep_item) {
      const pakai = (ri.jumlah * jumlahHasil) / Math.max(resep.hasil_jumlah, 1);
      const tersedia = Number(stokById[ri.bahan_id]?.stok ?? 0);
      const kurang = pakai > tersedia;
      if (kurang) adaKurang = true;
      bungkusPreview.appendChild(
        el('div', {
          class: 'baris-ringkas',
          style: kurang ? 'color:var(--sambal);' : '',
        }, [
          el('span', {}, ri.bahan?.nama || `Bahan #${ri.bahan_id}`),
          el('span', {}, `${pakai.toLocaleString('id-ID', { maximumFractionDigits: 3 })} ${ri.bahan?.satuan || ''} (stok ${tersedia.toLocaleString('id-ID', { maximumFractionDigits: 3 })})`),
        ])
      );
    }
    elGalat.textContent = adaKurang ? 'Stok sebagian bahan tidak cukup — tetap bisa dicatat, tapi stok bisa jadi minus.' : '';
  }
  inputJumlah.addEventListener('input', gambarPreview);
  gambarPreview();

  const tombolSimpan = el('button', { class: 'btn btn--utama login-tombol', style: 'margin-top:var(--s4);' }, 'Catat Produksi');
  tombolSimpan.addEventListener('click', async () => {
    const jumlahHasil = Number(inputJumlah.value);
    if (!jumlahHasil || jumlahHasil <= 0) return;
    tombolSimpan.disabled = true;
    tombolSimpan.textContent = 'Menyimpan...';
    try {
      await catatProduksi(produk.id, jumlahHasil, inputCatatan.value.trim() || null);
      overlay.remove();
      toast('Produksi tercatat, stok bahan terpotong.');
      render(container);
    } catch (error) {
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = 'Catat Produksi';
      elGalat.textContent = 'Gagal simpan: ' + (error?.message || error);
    }
  });

  konten.appendChild(el('div', { class: 'sheet__judul' }, produk.nama));
  konten.appendChild(el('div', { class: 'langkah-judul' }, 'Jumlah Hasil'));
  konten.appendChild(inputJumlah);
  konten.appendChild(el('div', { class: 'langkah-judul' }, `Bahan Terpakai (resep per ${resep.hasil_jumlah})`));
  konten.appendChild(bungkusPreview);
  konten.appendChild(el('div', { class: 'langkah-judul' }, 'Catatan'));
  konten.appendChild(inputCatatan);
  konten.appendChild(elGalat);
  konten.appendChild(tombolSimpan);
  konten.appendChild(
    el('button', {
      class: 'btn btn--kedua', style: 'margin-top:var(--s2);',
      onclick: () => gambarFormAturResep(konten, overlay, container, produk, resep, stokList),
    }, 'Ubah Resep')
  );
}

function gambarTawaranAturResep(konten, overlay, container, produk, stokList) {
  konten.innerHTML = '';
  konten.appendChild(el('div', { class: 'sheet__judul' }, produk.nama));
  konten.appendChild(
    el('div', { style: 'padding:var(--s3) 0;color:var(--abu-kabut);' },
      'Resep belum diatur untuk produk ini. Atur dulu supaya stok bahan otomatis terpotong tiap produksi, atau catat produksi tanpa potong stok.')
  );

  konten.appendChild(
    el('button', {
      class: 'btn btn--utama login-tombol',
      onclick: () => gambarFormAturResep(konten, overlay, container, produk, null, stokList),
    }, 'Atur Resep')
  );
  konten.appendChild(
    el('button', {
      class: 'btn btn--kedua', style: 'margin-top:var(--s2);',
      onclick: () => gambarFormProduksiTanpaResep(konten, overlay, container, produk),
    }, 'Catat Tanpa Resep')
  );
}

function gambarFormProduksiTanpaResep(konten, overlay, container, produk) {
  konten.innerHTML = '';
  const inputJumlah = el('input', { class: 'input', type: 'number', inputmode: 'numeric', min: '1', placeholder: 'Jumlah hasil' });
  const inputCatatan = el('input', { class: 'input', placeholder: 'Catatan (opsional)' });
  const elGalat = el('div', { class: 'bayar-galat' });

  const tombolSimpan = el('button', { class: 'btn btn--utama login-tombol', style: 'margin-top:var(--s4);' }, 'Catat Produksi');
  tombolSimpan.addEventListener('click', async () => {
    const jumlahHasil = Number(inputJumlah.value);
    if (!jumlahHasil || jumlahHasil <= 0) {
      elGalat.textContent = 'Jumlah hasil wajib diisi lebih dari 0.';
      return;
    }
    tombolSimpan.disabled = true;
    tombolSimpan.textContent = 'Menyimpan...';
    try {
      await catatProduksi(produk.id, jumlahHasil, inputCatatan.value.trim() || null);
      overlay.remove();
      toast('Produksi tercatat (stok bahan tidak dipotong, belum ada resep).');
      render(container);
    } catch (error) {
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = 'Catat Produksi';
      elGalat.textContent = 'Gagal simpan: ' + (error?.message || error);
    }
  });

  konten.appendChild(el('div', { class: 'sheet__judul' }, produk.nama));
  konten.appendChild(el('div', { class: 'langkah-judul' }, 'Jumlah Hasil'));
  konten.appendChild(inputJumlah);
  konten.appendChild(el('div', { class: 'langkah-judul' }, 'Catatan'));
  konten.appendChild(inputCatatan);
  konten.appendChild(elGalat);
  konten.appendChild(tombolSimpan);
}

function gambarFormAturResep(konten, overlay, container, produk, resepLama, stokList) {
  konten.innerHTML = '';
  const baris = []; // { bahan_id, elJumlah }
  const bungkusBaris = el('div', {});

  function tambahBaris(bahanIdAwal, jumlahAwal) {
    const selectBahan = el('select', { class: 'input', style: 'flex:2;' },
      stokList.map((b) => el('option', { value: b.id }, `${b.nama} (${b.satuan})`)));
    if (bahanIdAwal) selectBahan.value = String(bahanIdAwal);
    const inputJumlah = el('input', {
      class: 'input', type: 'number', inputmode: 'decimal', placeholder: 'Jumlah', style: 'flex:1;',
      value: jumlahAwal != null ? String(jumlahAwal) : '',
    });
    const tombolHapus = el('button', { class: 'baris-keranjang__hapus', 'aria-label': 'Hapus bahan' }, '✕');
    const baris1 = { selectBahan, inputJumlah };
    tombolHapus.addEventListener('click', () => {
      const idx = baris.indexOf(baris1);
      if (idx >= 0) baris.splice(idx, 1);
      elBaris.remove();
    });
    const elBaris = el('div', { style: 'display:flex;gap:var(--s2);align-items:center;margin-bottom:var(--s2);' },
      [selectBahan, inputJumlah, tombolHapus]);
    baris.push(baris1);
    bungkusBaris.appendChild(elBaris);
  }

  if (resepLama && resepLama.resep_item.length > 0) {
    resepLama.resep_item.forEach((ri) => tambahBaris(ri.bahan_id, ri.jumlah));
  } else {
    tambahBaris(null, null);
  }

  const tombolTambahBaris = el('button', { class: 'btn btn--kedua', style: 'margin-bottom:var(--s3);' }, '+ Tambah Bahan');
  tombolTambahBaris.addEventListener('click', () => tambahBaris(null, null));

  const inputHasilJumlah = el('input', {
    class: 'input', type: 'number', inputmode: 'numeric', min: '1',
    value: String(resepLama?.hasil_jumlah || 1),
  });
  const elGalat = el('div', { class: 'bayar-galat' });

  const tombolSimpan = el('button', { class: 'btn btn--utama login-tombol', style: 'margin-top:var(--s4);' }, 'Simpan Resep');
  tombolSimpan.addEventListener('click', async () => {
    const hasilJumlah = Number(inputHasilJumlah.value);
    if (!hasilJumlah || hasilJumlah <= 0) {
      elGalat.textContent = 'Jumlah hasil resep wajib diisi lebih dari 0.';
      return;
    }
    const items = baris
      .map((b) => ({ bahan_id: Number(b.selectBahan.value), jumlah: Number(b.inputJumlah.value) }))
      .filter((it) => it.bahan_id && it.jumlah > 0);
    if (items.length === 0) {
      elGalat.textContent = 'Isi minimal satu bahan dengan jumlah lebih dari 0.';
      return;
    }
    elGalat.textContent = '';
    tombolSimpan.disabled = true;
    tombolSimpan.textContent = 'Menyimpan...';
    try {
      const resepBaru = await simpanResep({ produk_id: produk.id, hasil_jumlah: hasilJumlah, items });
      toast('Resep tersimpan.');
      const resepLengkap = await resepProduk(produk.id);
      gambarFormProduksiDenganResep(konten, overlay, container, produk, resepLengkap, stokList);
    } catch (error) {
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = 'Simpan Resep';
      elGalat.textContent = 'Gagal simpan: ' + (error?.message || error);
    }
  });

  konten.appendChild(el('div', { class: 'sheet__judul' }, `Resep — ${produk.nama}`));
  konten.appendChild(el('div', { class: 'langkah-judul' }, 'Bahan per Batch'));
  konten.appendChild(bungkusBaris);
  konten.appendChild(tombolTambahBaris);
  konten.appendChild(el('div', { class: 'langkah-judul' }, 'Resep Ini Menghasilkan'));
  konten.appendChild(inputHasilJumlah);
  konten.appendChild(elGalat);
  konten.appendChild(tombolSimpan);
}
