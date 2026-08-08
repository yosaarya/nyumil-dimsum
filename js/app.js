// js/app.js — bootstrap, routing tab, gate login. Lihat docs/02-ARCHITECTURE.md §2, §5.
import { supabase } from './api.js';
import { renderLogin, keluar } from './auth.js';
import * as home from './views/home.js';
import * as sales from './views/sales.js';
import * as order from './views/order.js';
import * as kitchen from './views/produksi.js';
import * as inventory from './views/inventory.js';
import * as finance from './views/finance.js';

const VIEWS = { home, sales, order, kitchen, inventory, finance };

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
  bukaTab(location.hash.replace('#', '') || 'home');
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
