// Self-destroying service worker to permanently unregister legacy PWA service workers on all devices.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      // Release control without force reloading
    })
  );
});
