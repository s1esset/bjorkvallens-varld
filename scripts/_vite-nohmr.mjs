// _vite-nohmr.mjs — en andra dev-server UTAN omladdning, för parallella agenter.
//
//   npx vite --config scripts/_vite-nohmr.mjs        → http://localhost:5174
//
// När flera agenter redigerar src/ samtidigt laddar :5173 om VARJE öppen sida vid varje
// sparning (registret importerar alla spel), och en test- eller sondkörning dör mitt i
// eller mäter en ny sidas nollor. Här når ingen ändring en sida som redan är öppen; nästa
// page.goto får den nya koden.
import base from '../vite.config.js'

export default {
  ...base,
  // Egen förbyggnadskatalog: en delad `.vite` byggs om av den andra servern och ger då
  // :5173:s öppna sidor "outdated optimize dep" mitt i en körning.
  cacheDir: 'node_modules/.vite-nohmr',
  server: { ...(base.server || {}), hmr: false, port: 5174, strictPort: true },
}
