// js/views/order-pesanan.js — F-06: form order WA -> pilih menu -> Cek Pesanan -> rekap.
// Lihat docs/01-PRD.md §3.2 (Alur B), CLAUDE.md B-26/B-27.
import { katalogProduk, daftarKategori, buatPesanan } from '../api.js';
import { rupiah, jamId, labelHari, normalisasiNoWa } from '../format.js';
import { el, sembunyikanShell, tampilkanShell, toast } from '../ui.js';
import { pilihVarian } from './produk-varian.js';

let produkCache = null;
let kategoriCache = null;
let kategoriAktif = null;

export function mulaiPesananBaru(container, onSelesai) {
  sembunyikanShell();
  renderForm(container, onSelesai);
}

function renderForm(container, onSelesai) {
  const data = { nama: '', noWa: '', waktu: '', diantar: false, alamat: '', catatanBayar: '' };

  const inputNama = el('input', { class: 'input', placeholder: 'Nama pelanggan' });
  const inputNoWa = el('input', { class: 'input', type: 'tel', placeholder: 'No. WA, contoh 08123456789' });
  const inputWaktu = el('input', { class: 'input', type: 'datetime-local' });
  const inputAlamat = el('input', { class: 'input', placeholder: 'Alamat antar' });
  const bungkusAlamat = el('div', { style: 'margin-top:var(--s2);display:none;' }, [inputAlamat]);
  const inputBayar = el('input', { class: 'input', placeholder: 'Info pembayaran (opsional)' });
  const elGalat = el('div', { class: 'bayar-galat' });

  const tombolAmbil = el('button', { class: 'pill pill--aktif' }, 'Ambil Sendiri');
  const tombolAntar = el('button', { class: 'pill' }, 'Diantar');
  tombolAmbil.addEventListener('click', () => {
    data.diantar = false;
    tombolAmbil.className = 'pill pill--aktif';
    tombolAntar.className = 'pill';
    bungkusAlamat.style.display = 'none';
  });
  tombolAntar.addEventListener('click', () => {
    data.diantar = true;
    tombolAntar.className = 'pill pill--aktif';
    tombolAmbil.className = 'pill';
    bungkusAlamat.style.display = 'block';
  });

  const tombolLanjut = el('button', { class: 'btn btn--utama login-tombol' }, 'Lanjut Pilih Menu');
  tombolLanjut.addEventListener('click', () => {
    data.nama = inputNama.value.trim();
    data.noWa = inputNoWa.value.trim();
    data.waktu = inputWaktu.value;
    data.alamat = inputAlamat.value.trim();
    data.catatanBayar = inputBayar.value.trim();

    if (!data.nama) { elGalat.textContent = 'Nama pelanggan wajib diisi (B-27).'; return; }
    if (!data.noWa) { elGalat.textContent = 'Nomor WA wajib diisi.'; return; }
    if (data.diantar && !data.alamat) { elGalat.textContent = 'Alamat antar wajib diisi.'; return; }
    elGalat.textContent = '';
    renderKatalog(container, data, [], onSelesai);
  });

  const tombolBatal = el('button', { class: 'btn btn--ketiga' }, 'Batal');
  tombolBatal.addEventListener('click', () => {
    tampilkanShell();
    onSelesai();
  });

  container.innerHTML = '';
  container.appendChild(
    el('div', { style: 'padding:var(--s5);' }, [
      el('div', { class: 'sheet__judul' }, 'Order Baru'),
      el('div', { style: 'margin-bottom:var(--s3);' }, [inputNama]),
      el('div', { style: 'margin-bottom:var(--s3);' }, [inputNoWa]),
      el('div', { style: 'margin-bottom:var(--s3);' }, [inputWaktu]),
      el('div', { class: 'kasir-toggle-kanal', style: 'padding:0;margin-bottom:var(--s3);' }, [tombolAmbil, tombolAntar]),
      bungkusAlamat,
      el('div', { style: 'margin: var(--s3) 0;' }, [inputBayar]),
      elGalat,
      tombolLanjut,
      tombolBatal,
    ])
  );
}

async function renderKatalog(container, data, keranjang, onSelesai) {
  container.innerHTML =
    '<div style="padding:var(--s5);text-align:center;color:var(--abu-kabut);">Memuat menu...</div>';
  try {
    if (!produkCache) {
      [produkCache, kategoriCache] = await Promise.all([katalogProduk(), daftarKategori()]);
    }
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { style: 'padding:var(--s5);text-align:center;color:var(--sambal);' }, [
        el('div', {}, 'Gagal memuat menu. Cek sinyal.'),
        el('button', {
          class: 'btn btn--kedua', style: 'margin-top:var(--s3);',
          onclick: () => { produkCache = null; renderKatalog(container, data, keranjang, onSelesai); },
        }, 'Coba Lagi'),
      ])
    );
    return;
  }
  gambarKatalog(container, data, keranjang, onSelesai);
}

function gambarKatalog(container, data, keranjang, onSelesai) {
  container.innerHTML = '';

  const chipSemua = el('button', {
    class: `kategori-chip${kategoriAktif === null ? ' kategori-chip--aktif' : ''}`,
    onclick: () => { kategoriAktif = null; gambarKatalog(container, data, keranjang, onSelesai); },
  }, 'Semua');
  const chipKategori = kategoriCache.map((kat) =>
    el('button', {
      class: `kategori-chip${kategoriAktif === kat.id ? ' kategori-chip--aktif' : ''}`,
      onclick: () => { kategoriAktif = kat.id; gambarKatalog(container, data, keranjang, onSelesai); },
    }, `${kat.ikon || ''} ${kat.nama}`.trim())
  );

  const daftarProduk = kategoriAktif ? produkCache.filter((p) => p.kategori_id === kategoriAktif) : produkCache;
  const kartuProduk = daftarProduk.map((produk) => kartuProdukWa(produk, container, data, keranjang, onSelesai));

  container.appendChild(el('div', { class: 'kategori-baris' }, [chipSemua, ...chipKategori]));
  container.appendChild(el('div', { class: 'grid-produk' }, kartuProduk));

  if (keranjang.length > 0) {
    const total = keranjang.reduce((t, i) => t + i.subtotal, 0);
    const jumlahItem = keranjang.reduce((t, i) => t + i.jumlah, 0);
    const tombolLanjut = el('button', { class: 'btn btn--utama bar-pesanan__tombol' }, 'CEK PESANAN');
    tombolLanjut.addEventListener('click', () => renderKonfirmasi(container, data, keranjang, onSelesai));
    container.appendChild(
      el('div', { class: 'bar-pesanan' }, [
        el('div', { class: 'bar-pesanan__ringkas' }, [el('span', {}, `${jumlahItem} item`), el('span', {}, rupiah(total))]),
        tombolLanjut,
      ])
    );
  }
}

function kartuProdukWa(produk, container, data, keranjang, onSelesai) {
  const adaVarian = produk.grup_pilihan.length > 0;
  const qty = keranjang.filter((i) => i.produk_id === produk.id).reduce((t, i) => t + i.jumlah, 0);

  const kartu = el('button', { class: 'kartu-produk' }, [
    produk.grup_pilihan.some((g) => g.wajib) ? el('span', { class: 'kartu-produk__tanda-varian' }) : '',
    qty > 0 ? el('span', { class: 'kartu-produk__lencana-qty' }, String(qty)) : '',
    el('span', { class: 'kartu-produk__nama' }, produk.nama),
    el('span', { class: 'kartu-produk__harga' }, rupiah(produk.harga)),
  ]);

  kartu.addEventListener('click', () => {
    if (adaVarian) {
      pilihVarian(produk, (item) => {
        tambahAtauGabungLokal(keranjang, item);
        gambarKatalog(container, data, keranjang, onSelesai);
      });
    } else {
      tambahAtauGabungLokal(keranjang, {
        produk_id: produk.id, nama_produk: produk.nama, harga_satuan: produk.harga,
        jumlah: 1, opsi: [], catatan: null, subtotal: produk.harga,
      });
      gambarKatalog(container, data, keranjang, onSelesai);
    }
  });

  return kartu;
}

function tambahAtauGabungLokal(keranjang, itemBaru) {
  const kunci = (i) => (i.opsi || []).map((o) => o.opsi_id).sort().join(',');
  const sama = keranjang.find(
    (i) => i.produk_id === itemBaru.produk_id && kunci(i) === kunci(itemBaru) && (i.catatan || null) === (itemBaru.catatan || null)
  );
  if (sama) {
    sama.jumlah += itemBaru.jumlah;
    sama.subtotal = sama.harga_satuan * sama.jumlah;
  } else {
    keranjang.push(itemBaru);
  }
}

function renderKonfirmasi(container, data, keranjang, onSelesai) {
  data.clientRef = crypto.randomUUID(); // sekali per isi keranjang yang dikonfirmasi, dipakai ulang kalau retry

  const total = keranjang.reduce((t, i) => t + i.subtotal, 0);
  const daftarItem = keranjang.map((item) =>
    el('div', { class: 'struk__item' }, [
      el('div', { class: 'struk__item-baris' }, [
        el('span', {}, `${item.jumlah}× ${item.nama_produk}`),
        el('span', {}, rupiah(item.subtotal)),
      ]),
      ...(item.opsi || []).map((o) => el('div', { class: 'struk__item-varian' }, o.nama_opsi)),
    ])
  );

  const waktuTeks = data.waktu
    ? `${data.diantar ? 'Kirim' : 'Ambil'} ${labelHari(data.waktu)} ${jamId(data.waktu)}`
    : `${data.diantar ? 'Kirim' : 'Ambil'} jam menyusul`;

  const tombolUbah = el('button', { class: 'btn btn--kedua' }, 'Ubah');
  tombolUbah.addEventListener('click', () => gambarKatalog(container, data, keranjang, onSelesai));

  const tombolSimpan = el('button', { class: 'btn btn--utama' }, 'Simpan & Buat Rekap');
  tombolSimpan.addEventListener('click', () => simpanDanRekap(container, data, keranjang, onSelesai, tombolSimpan));

  container.innerHTML = '';
  container.appendChild(
    el('div', { class: 'konfirmasi-layar' }, [
      el('div', { class: 'struk' }, [
        el('div', { class: 'struk__merek' }, 'NYUMIL DIMSUM'),
        el('div', { class: 'struk__meta' }, `WA · ${data.nama} · ${waktuTeks}`),
        el('hr', { class: 'struk__garis' }),
        ...daftarItem,
        el('hr', { class: 'struk__garis' }),
        el('div', { class: 'struk__total' }, [el('span', {}, 'TOTAL'), el('span', {}, rupiah(total))]),
      ]),
      el('div', { class: 'konfirmasi-pertanyaan' }, 'Sudah benar?'),
      el('div', { class: 'konfirmasi-tombol-baris' }, [tombolUbah, tombolSimpan]),
    ])
  );
}

async function simpanDanRekap(container, data, keranjang, onSelesai, tombolSimpan) {
  tombolSimpan.disabled = true;
  tombolSimpan.textContent = 'Menyimpan...';

  const payload = {
    client_ref: data.clientRef,
    kanal: 'WA',
    nama_pelanggan: data.nama,
    no_wa: normalisasiNoWa(data.noWa),
    waktu_ambil: data.waktu ? new Date(data.waktu).toISOString() : null,
    diantar: data.diantar,
    alamat_antar: data.diantar ? data.alamat : null,
    items: keranjang.map((item) => ({
      produk_id: item.produk_id,
      jumlah: item.jumlah,
      catatan: item.catatan || null,
      opsi: (item.opsi || []).map((o) => ({ opsi_id: o.opsi_id })),
    })),
  };

  try {
    const pesanan = await buatPesanan(payload);
    renderRekap(container, data, keranjang, pesanan, onSelesai);
  } catch (error) {
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = 'Coba Lagi';
    toast('Gagal simpan. Cek sinyal, lalu tekan Coba Lagi.');
  }
}

function bangunTeksRekap(data, keranjang, pesanan) {
  const lebar = 38;
  const barisDenganTitik = (kiri, kananAngka) => {
    const kanan = kananAngka.toLocaleString('id-ID');
    const jumlahTitik = Math.max(3, lebar - kiri.length - kanan.length);
    return `${kiri} ${'.'.repeat(jumlahTitik)} ${kanan}`;
  };

  const baris = keranjang.map((item, i) => {
    const varian = (item.opsi || []).map((o) => o.nama_opsi).join(', ');
    const namaLengkap = varian ? `${item.nama_produk} (${varian})` : item.nama_produk;
    return barisDenganTitik(`${i + 1}. ${namaLengkap} x${item.jumlah}`, item.subtotal);
  });

  const waktuTeks = data.waktu
    ? `${data.diantar ? 'Kirim' : 'Ambil'}: ${labelHari(data.waktu)}, ${jamId(data.waktu)}`
    : `${data.diantar ? 'Kirim' : 'Ambil'}: menyusul, dikabari lagi`;

  const namaDepan = data.nama.split(' ')[0];

  return [
    `Halo Kak ${namaDepan} 🙏`,
    `Pesanan Nyumil Dimsum #${pesanan.nomor_antrian}`,
    '',
    ...baris,
    '',
    barisDenganTitik('Total', pesanan.total),
    waktuTeks,
    data.catatanBayar ? `Bayar: ${data.catatanBayar}` : null,
    '',
    'Mohon dicek dulu ya Kak, kalau sudah betul balas "OK"',
    'biar langsung kami buat 😊',
  ].filter((baris) => baris !== null).join('\n');
}

function renderRekap(container, data, keranjang, pesanan, onSelesai) {
  const teks = bangunTeksRekap(data, keranjang, pesanan);

  const kotakTeks = el('pre', {
    style: 'white-space:pre-wrap;background:var(--putih-gading);border-radius:var(--r-md);' +
      'padding:var(--s4);font-family:var(--font-angka);font-size:var(--t-sm);' +
      'box-shadow:var(--bayang-kartu);margin-bottom:var(--s4);',
  }, teks);

  const tombolSalin = el('button', { class: 'btn btn--utama login-tombol' }, 'Salin Rekap');
  tombolSalin.addEventListener('click', () => {
    // Wajib sinkron di dalam event ketukan (iOS) — teks sudah disiapkan di atas,
    // bukan diambil lewat await di sini. Lihat docs/02-ARCHITECTURE.md §6.
    navigator.clipboard.writeText(teks).then(
      () => toast('Rekap tersalin. Tempel di WhatsApp.'),
      () => toast('Gagal menyalin otomatis — salin manual dari kotak teks di atas.')
    );
  });

  const tombolSelesai = el('button', { class: 'btn btn--kedua login-tombol' }, 'Kembali ke Daftar WA');
  tombolSelesai.addEventListener('click', () => {
    tampilkanShell();
    onSelesai();
  });

  container.innerHTML = '';
  container.appendChild(
    el('div', { style: 'padding:var(--s5);' }, [
      el('div', { class: 'sheet__judul' }, `Pesanan #${pesanan.nomor_antrian} tersimpan`),
      el('div', { style: 'color:var(--abu-kabut);margin-bottom:var(--s3);' },
        'Salin rekap ini, tempel & kirim ke pelanggan lewat WhatsApp. Status "Tunggu Konfirmasi" sampai pelanggan balas setuju.'),
      kotakTeks,
      tombolSalin,
      tombolSelesai,
    ])
  );
}
