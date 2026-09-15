const ICON_URL = "https://ik.imagekit.io/uqjrsrvfw/aeec4733da0d58b9ff27750f74c71f8a.jpeg?updatedAt=1776365051398";
const CACHE_NAME = 'arex-network-v1';
const STATIC_CACHE_NAME = 'arex-static-v1';
const DYNAMIC_CACHE_NAME = 'arex-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
];

// Cache strategies
const CACHE_FIRST = 'cache-first';
const NETWORK_FIRST = 'network-first';
const STALE_WHILE_REVALIDATE = 'stale-while-revalidate';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except for known CDN domains)
  const isKnownCdn = url.hostname.includes('imagekit.io') ||
                     url.hostname.includes('supabase.co') ||
                     url.hostname.includes('garena.vn') ||
                     url.hostname.includes('ytimg.com') ||
                     url.hostname.includes('discordapp.com') ||
                     url.hostname.includes('wikimedia.org') ||
                     url.hostname.includes('flagcdn.com');

  if (url.origin !== self.location.origin && !isKnownCdn) return;

  // Determine strategy based on request type
  let strategy = STALE_WHILE_REVALIDATE;

  // HTML pages - network first for fresh content
  if (request.headers.get('accept')?.includes('text/html')) {
    strategy = NETWORK_FIRST;
  }
  // Static assets - cache first
  else if (request.destination === 'image' || 
           request.destination === 'font' ||
           request.destination === 'style' ||
           request.destination === 'script') {
    strategy = CACHE_FIRST;
  }
  // API calls - network first with fallback
  else if (url.pathname.startsWith('/api/')) {
    strategy = NETWORK_FIRST;
  }

  event.respondWith(handleRequest(request, strategy));
});

async function handleRequest(request, strategy) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);

  switch (strategy) {
    case CACHE_FIRST:
      return cacheFirst(request, cache);
    case NETWORK_FIRST:
      return networkFirst(request, cache);
    case STALE_WHILE_REVALIDATE:
    default:
      return staleWhileRevalidate(request, cache);
  }
}

async function cacheFirst(request, cache) {
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return fallbackResponse(request);
  }
}

async function networkFirst(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return fallbackResponse(request);
  }
}

async function staleWhileRevalidate(request, cache) {
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

function fallbackResponse(request) {
  const url = new URL(request.url);

  // For HTML pages, return offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    return caches.match('/offline') || new Response('Offline', { status: 503 });
  }

  // For images, return placeholder
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#1a1a1a" width="200" height="200"/><text x="100" y="100" text-anchor="middle" fill="#555" font-family="system-ui" font-size="14">Offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  // For other resources, return empty response
  return new Response('', { status: 503 });
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Arex', {
      body: data.body ?? '',
      icon: data.icon ?? ICON_URL,
      badge: ICON_URL,
      data: { url: data.url ?? '/' },
      vibrate: [100, 50, 100],
      requireInteraction: true,
      actions: data.actions ?? [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync any pending notifications when back online
  console.log('Syncing notifications...');
}

// Message from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});