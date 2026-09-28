/**
 * Dewangan Photo & Videography – Invoice Management System
 * Service Worker for PWA Offline Caching & Instant Multi-Device Sync
 */

const CACHE_NAME = 'dpv-invoice-v1.3.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/invoice.css',
  './css/print.css',
  './js/vendor/lucide.min.js',
  './js/vendor/qrcode.min.js',
  './js/vendor/html2pdf.bundle.min.js',
  './js/store.js',
  './js/auth.js',
  './js/invoice-engine.js',
  './js/qr-helper.js',
  './js/pdf-generator.js',
  './js/calendar.js',
  './js/backup.js',
  './js/firebase-config.js',
  './js/app.js',
  './assets/dpv-logo.svg',
  './assets/dpv-official-logo.png',
  './assets/header-banner-perfect.png',
  './assets/footer-banner-perfect.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[DPV ServiceWorker] Pre-caching core application shell');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[DPV ServiceWorker] Cache addAll warning (will continue):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[DPV ServiceWorker] Clearing legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-First for HTML navigation and JS/CSS scripts so code updates instantly
  if (event.request.mode === 'navigate' || event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cached) => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : null));
      })
    );
    return;
  }

  // Cache-first for images, icons, and static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
