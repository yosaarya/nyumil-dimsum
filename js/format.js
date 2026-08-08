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

function tanggalJakarta(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** "hari ini" / "besok" / tanggal biasa — dibandingkan di zona Asia/Jakarta (B-24). */
export function labelHari(waktuIso) {
  if (!waktuIso) return '';
  const tglTarget = tanggalJakarta(new Date(waktuIso));
  const tglSekarang = tanggalJakarta(new Date());
  if (tglTarget === tglSekarang) return 'hari ini';
  const besok = new Date(new Date(`${tglSekarang}T00:00:00Z`).getTime() + 86400000);
  if (tanggalJakarta(besok) === tglTarget) return 'besok';
  return tanggalId(waktuIso);
}

/** Format 628xxxxxxxxxx: buang spasi/hubung, ubah awalan 0 atau +62 (B-26). */
export function normalisasiNoWa(input) {
  let s = (input || '').replace(/[\s-]/g, '');
  if (s.startsWith('+62')) s = `62${s.slice(3)}`;
  else if (s.startsWith('0')) s = `62${s.slice(1)}`;
  else if (!s.startsWith('62')) s = `62${s}`;
  return s;
}
