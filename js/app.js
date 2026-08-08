// js/app.js — bootstrap, routing tab, gate login. Lihat docs/02-ARCHITECTURE.md §2, §5.
import { supabase } from './api.js';
import { renderLogin, keluar } from './auth.js';
import * as kasir from './views/kasir.js';
import * as wa from './views/wa.js';
import * as dapur from './views/dapur.js';
import * as stok from './views/stok.js';
import * as laporan from './views/laporan.js';

const VIEWS = { kasir, wa, dapur, stok, laporan };

const barAtas = document.getElementById('bar-atas');
const isiTab = document.getElementById('isi-tab');
const tabBar = document.getElementById('tab-bar');
const btnProfil = document.getElementById('btn-profil');

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

function tampilkanAplikasi() {
  barAtas.hidden = false;
  tabBar.hidden = false;
  bukaTab(location.hash.replace('#', '') || 'kasir');
}

function tampilkanLogin() {
  barAtas.hidden = true;
  tabBar.hidden = true;
  renderLogin(isiTab);
}

tabBar.addEventListener('click', (e) => {
  const tombol = e.target.closest('.tab-bar__item');
  if (tombol) bukaTab(tombol.dataset.tab);
});

btnProfil.addEventListener('click', keluar);

// persistSession: true di api.js — sesi ini yang menentukan tampilan login
// atau tab bar, bukan pengecekan manual tiap buka aplikasi.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) tampilkanAplikasi();
  else tampilkanLogin();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
