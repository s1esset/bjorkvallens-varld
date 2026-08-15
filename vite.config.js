import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Version + bygg-id stämplas in vid byggtid så en förälder kan se VILKEN version som
// körs (och bekräfta att "Hämta senaste" faktiskt hämtade en nyare). Bygg-id = tidsstämpel.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const _now = new Date()
const _p = (n) => String(n).padStart(2, '0')
const BUILD_ID = `${String(_now.getFullYear()).slice(2)}${_p(_now.getMonth() + 1)}${_p(_now.getDate())}-${_p(_now.getHours())}${_p(_now.getMinutes())}`

// Björkvallens Värld — offline-first PWA för barn 2–5 år.
// Service worker: generateSW (Workbox) i "prompt"-läge. Vi promptar ALDRIG barnet —
// uppdateringen läggs på vänt och appliceras först vid biblioteks-/menygränsen (se src/lib/pwa.js).
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  // Bind till alla nätverkskort så bygget går att titta på från en annan enhet på
  // samma wifi. Skarp leverans går via GitHub Pages (`npm run deploy`) — PWA-install,
  // service worker och offline-läge kräver HTTPS och kan bara provas där.
  server: { host: true },
  preview: { host: true },
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
        name: 'Björkvallens Värld',
        short_name: 'Björkvallen',
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
        // Föräldrasidan får ALDRIG bli appen. navigateFallback fångar varje
        // navigering i scope som inte finns i precachen — och `start.html?vad-som-helst`
        // matchar inte precache-posten `start.html`, så en delad länk med frågesträng
        // serverade spelet med installationssidans adress i fältet (uppmätt 2026-08-15).
        navigateFallbackDenylist: [/start\.html/],
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
