// Network-only: no caching of credentials, photos, API calls or client records.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
