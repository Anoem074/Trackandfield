const CACHE_NAME = 'training-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache all static assets
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Cache addAll error:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other unsupported protocols
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        // Make network request
        return fetch(fetchRequest)
          .then((response) => {
            // Check if response is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it can only be used once
            const responseToCache = response.clone();

            // Add response to cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache same-origin requests
                if (fetchRequest.url.startsWith(self.location.origin)) {
                  cache.put(fetchRequest, responseToCache);
                }
              })
              .catch((error) => {
                console.error('Cache put error:', error);
              });

            return response;
          })
          .catch((error) => {
            console.error('Fetch error:', error);
            // Return cached response as fallback if available
            return caches.match(event.request);
          });
      })
  );
}); 