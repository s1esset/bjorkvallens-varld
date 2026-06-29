import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Barnspel — offline-first PWA för barn 2–5 år.
// Service worker: generateSW (Workbox) i "prompt"-läge. Vi promptar ALDRIG barnet —
// uppdateringen läggs på vänt och appliceras först vid biblioteks-/menygränsen (se src/lib/pwa.js).
export default defineConfig({
  base: './',
  // Bind till alla nätverkskort så appen går att testa från t.ex. en telefon på
  // samma Tailscale-nät. allowedHosts släpper in MagicDNS-namnet (*.ts.net) som
  // används vid `tailscale serve` (HTTPS -> krävs för PWA-install/offline).
  server: {
    host: true,
    allowedHosts: ['.ts.net'],
  },
  preview: {
    host: true,
    allowedHosts: ['.ts.net'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // vi registrerar själva i src/lib/pwa.js
      includeAssets: ['icons/*.png', 'fonts/*.woff2', 'fonts/OFL.txt'],
      manifest: {
        name: 'Barnspel',
        short_name: 'Barnspel',
        description: 'Roliga och lärorika minispel för barn 2–5 år. Ingen reklam, ingen spårning.',
        lang: 'sv',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#FDF6E3',
        theme_color: '#FF8A3D',
        categories: ['games', 'education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2,json,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'spel-bilder',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'spel-ljud',
              rangeRequests: true,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // sätt true för att testa SW i dev
      },
    }),
  ],
})
