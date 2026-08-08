// js/format.js — rupiah, tanggal, jam (id-ID, Asia/Jakarta). Lihat docs/02-ARCHITECTURE.md §7.

export function rupiah(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID');
}

export function tanggalId(tanggal) {
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

export function jamId(waktu) {
  return new Date(waktu).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
  });
}
