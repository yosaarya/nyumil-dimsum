// js/app.js — bootstrap, routing tab. Lihat docs/02-ARCHITECTURE.md §2.
import * as kasir from './views/kasir.js';
import * as wa from './views/wa.js';
import * as dapur from './views/dapur.js';
import * as stok from './views/stok.js';
import * as laporan from './views/laporan.js';

const VIEWS = { kasir, wa, dapur, stok, laporan };

const isiTab = document.getElementById('isi-tab');
const tabBar = document.getElementById('tab-bar');

function bukaTab(nama) {
  const view = VIEWS[nama];
  if (!view) return;

  for (const tombol of tabBar.querySelectorAll('.tab-bar__item')) {
    if (tombol.dataset.tab === nama) tombol.setAttribute('aria-current', 'page');
    else tombol.removeAttribute('aria-current');
  }

  view.render(isiTab);
  history.replaceState(null, '', `#${nama}`);
}

tabBar.addEventListener('click', (e) => {
  const tombol = e.target.closest('.tab-bar__item');
  if (tombol) bukaTab(tombol.dataset.tab);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

bukaTab(location.hash.replace('#', '') || 'kasir');
