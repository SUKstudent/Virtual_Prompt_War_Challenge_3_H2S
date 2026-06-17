/* ============================================
   EcoTrack Service Worker
   Handles: Caching, Push Notifications, Background Sync
   ============================================ */

const CACHE_NAME = 'ecotrack-v1.2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// ---- INSTALL: Cache all assets ----
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
});

// ---- ACTIVATE: Clean old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: Network-first, fallback to cache ----
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---- PUSH NOTIFICATIONS ----
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🌱 EcoTrack Reminder';
  const options = {
    body: data.body || "Don't forget to log today's eco actions!",
    icon: './icon-192.svg',
    badge: './icon-192.svg',
    tag: 'ecotrack-daily',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'log', title: '✅ Log Today' },
      { action: 'dismiss', title: 'Later' },
    ],
    data: { url: './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ---- NOTIFICATION CLICK ----
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'log') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.focus();
          client.postMessage({ type: 'LOG_TODAY' });
        } else {
          clients.openWindow('./#tracker');
        }
      })
    );
  }
});

// ---- SCHEDULED NOTIFICATION (via setTimeout in SW) ----
// This fires a daily local notification
function scheduleDailyNotification() {
  const now = new Date();
  const next = new Date();
  next.setHours(20, 0, 0, 0); // 8 PM daily
  if (next <= now) next.setDate(next.getDate() + 1);
  const msUntilNext = next - now;

  setTimeout(() => {
    self.registration.showNotification('🌍 EcoTrack Daily Check-in', {
      body: "Time to log today's eco actions and keep your streak alive! 🔥",
      icon: './icon-192.svg',
      badge: './icon-192.svg',
      tag: 'ecotrack-daily',
      actions: [
        { action: 'log', title: '✅ Log Now' },
        { action: 'dismiss', title: 'Skip Today' }
      ]
    });
    scheduleDailyNotification(); // reschedule for tomorrow
  }, msUntilNext);
}

self.addEventListener('activate', () => {
  scheduleDailyNotification();
});
