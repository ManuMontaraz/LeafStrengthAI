const CACHE_NAME = 'leafstrength-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/site.webmanifest',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Fetch event - Stale While Revalidate strategy
self.addEventListener('fetch', event => {
    // Skip non-GET requests and external URLs
    if (event.request.method !== 'GET') return;
    
    // Skip cross-origin requests except for known CDNs
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin && 
        !url.href.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached version immediately (stale)
                const fetchPromise = fetch(event.request)
                    .then(networkResponse => {
                        // Check if valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // Clone the response
                        const responseToCache = networkResponse.clone();
                        
                        // Update cache with fresh version
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch(error => {
                        console.log('Fetch failed, returning cached version:', error);
                        // If network fails, we already have cachedResponse
                        return cachedResponse;
                    });
                
                // Return cached version immediately, or fetch if not cached
                return cachedResponse || fetchPromise;
            })
    );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Listen for message from client to skip waiting
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});