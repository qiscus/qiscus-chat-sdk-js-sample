importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

// Cache the Google Fonts stylesheets with a stale while revalidate strategy.
workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  }),
);

// Cache the Google Fonts webfont files with a cache first strategy for 1 year.
workbox.routing.registerRoute(
  /^https:\/\/fonts\.gstatic\.com/,
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.Plugin({
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

workbox.routing.registerRoute(
  /\.(?:js|css)$/,
  new workbox.strategies.StaleWhileRevalidate(),
);


workbox.routing.registerRoute(
  // Match common image extensions.
  new RegExp('\\.(?:png|gif|jpg|jpeg|svg|heic)$'),
  // Use a cache-first strategy with the following config:
  new workbox.strategies.CacheFirst({
    // You need to provide a cache name when using expiration.
    cacheName: 'images',
    plugins: [
      new workbox.expiration.Plugin({
        // Keep at most 50 entries.
        maxEntries: 50,
        // Don't keep any entries for more than 30 days.
        maxAgeSeconds: 30 * 24 * 60 * 60,
        // Automatically cleanup if quota is exceeded.
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// NOT READY YET!!
// const bgSyncPlugin = new workbox.backgroundSync.Plugin('myQueueName', {
//   maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
// });

// workbox.routing.registerRoute(
//   /https?:\/\/api\.qiscus\.com\/.*/gmi,
//   new workbox.strategies.NetworkOnly({
//     plugins: [bgSyncPlugin]
//   }),
//   'POST'
// );
