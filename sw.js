// Cache app shell. Naikkan versi CACHE setiap deploy supaya iOS tidak nyangkut di versi lama.
const CACHE = 'nyumil-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/js/vendor/supabase-js.umd.js',
  '/js/app.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/store.js',
  '/js/format.js',
  '/js/views/kasir.js',
  '/js/views/kasir-varian.js',
  '/js/views/kasir-konfirmasi.js',
  '/js/views/wa.js',
  '/js/views/dapur.js',
  '/js/views/stok.js',
  '/js/views/produksi.js',
  '/js/views/laporan.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
