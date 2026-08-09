// Cache app shell. Naikkan versi CACHE setiap deploy supaya iOS tidak nyangkut di versi lama.
const CACHE = 'nyumil-v12';
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
  '/js/views/home.js',
  '/js/views/sales.js',
  '/js/views/produk-varian.js',
  '/js/views/sales-konfirmasi.js',
  '/js/views/order.js',
  '/js/views/order-pesanan.js',
  '/js/views/antrian-dapur.js',
  '/js/views/inventory.js',
  '/js/views/produksi.js',
  '/js/views/finance.js',
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
