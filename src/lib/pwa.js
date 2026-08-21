// Service worker-registrering. Vi använder "prompt"-läge men promptar ALDRIG barnet:
// en väntande uppdatering appliceras först vid menyn/biblioteket (se applyPendingUpdateAtMenu).
// En förälder kan dock TVINGA fram senaste versionen via knappen i menyn (forceUpdate).
import { registerSW } from 'virtual:pwa-register'

let pending = false
let offlineReadyCb = null
let swRegistration = null

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    pending = true // stash — applicera vid lugn gräns, inte mitt i ett spel
  },
  onOfflineReady() {
    offlineReadyCb?.()
  },
  onRegisteredSW(_swUrl, reg) {
    swRegistration = reg || null
  },
  onRegisterError(err) {
    console.warn('SW kunde inte registreras', err)
  },
})

export function onOfflineReady(cb) {
  offlineReadyCb = cb
}

// Körs appen som INSTALLERAD app (från hemskärmen) eller i en vanlig webbläsarflik?
export function isStandalone() {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      navigator.standalone === true
    )
  } catch {
    return false
  }
}

// Helskärm + låst landskapsläge när appen körs i en FLIK.
//
// Den installerade appen får det gratis ur manifestet (`display: fullscreen` +
// `orientation: landscape`) — en flik får ingenting av det, och ingen sida kan låsa
// orienteringen utan att först vara i helskärm. Ordningen är alltså tvingande:
// helskärm FÖRST, lås sedan.
//
// MÅSTE anropas synkront från en användargest (splashens första tryck), annars
// avvisar webbläsaren begäran. Allt är best-effort och tyst: iOS Safari saknar båda
// API:erna, och `lock()` avvisar på dator — inget av det får hindra barnet från att
// komma in i appen, och inget av det får bli ett konsolfel (testet räknar dem).
export function enterImmersive() {
  // DEV = testharnessen. En helskärm mitt i en körning byter viewport och skulle
  // störa bildkollen i 80 spel; funktionen hör hemma på riktiga enheter.
  if (import.meta.env?.DEV) return
  if (isStandalone()) return
  try {
    const el = document.documentElement
    if (!el?.requestFullscreen) return
    const p = el.requestFullscreen({ navigationUI: 'hide' })
    if (p?.then) p.then(lockLandscape, () => {})
    else lockLandscape()
  } catch {
    /* helskärm nekad — appen fungerar precis lika bra i stående flik */
  }
}

function lockLandscape() {
  try {
    const r = screen.orientation?.lock?.('landscape')
    r?.catch?.(() => {}) // dator: NotSupportedError, helt väntat
  } catch {
    /* noop */
  }
}

// Finns en redan nedladdad uppdatering som bara väntar på att aktiveras?
export function hasPendingUpdate() {
  return pending
}

export function applyPendingUpdateAtMenu() {
  if (!pending) return
  pending = false
  const w = swRegistration?.waiting
  // Egen aktivering när vi har en väntande SW: `updateSW(true)` laddar bara om sidan om
  // pluginets `controlling`-lyssnare hunnit sättas (se `forceUpdate`). Här HAR den det —
  // `pending` sattes av just den vägen — men vi går samma väg för att bara ha ETT beteende.
  if (w) aktivera(w)
  else updateSW(true)
}

// Kort versionsstämpel "vM.NN" (MINOR zero-paddat, se docs/DESIGN.md §9). Visas som
// etikett på menyns uppdateringsknapp så en förälder med en blick ser om "Hämta
// senaste" gav en ny version. Källa: package.json version (via define i vite.config.js).
export function appVersion() {
  const v = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
  const [major = '0', minor = '0'] = v.split('.')
  return `v${major}.${minor.padStart(2, '0')}`
}

// Full teknisk stämpel (semver + byggtidsstämpel) för felsökning/vuxenytor.
export function appVersionFull() {
  const v = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
  const b = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
  return `v${v} · ${b}`
}

// TVINGA fram senaste versionen (förälder-knapp i menyn).
//
// ⚠️ VARFÖR DEN HÄR INTE GÅR VIA `updateSW(true)` NÄR INGEN UPPDATERING REDAN VÄNTAR:
// det var HELA orsaken till "man måste trycka två gånger". I prompt-läge lägger
// vite-plugin-pwa sin omladdningslyssnare först INNE i `showSkipWaitingPrompt`, som körs
// på workbox `waiting`-händelsen — alltså samma stund som `onNeedRefresh` sätter `pending`
// (`node_modules/vite-plugin-pwa/dist/client/build/register.js`). Första trycket, när inget
// väntade ännu, skickade därför SKIP_WAITING utan att någon lyssnade på `controlling`:
// sidan laddades aldrig om. Strax efter kom `waiting`, `pending` blev sann, och ANDRA
// trycket gick den redan fungerande vägen. Den gamla koden gav dessutom installationen
// **4 sekunder** — appen precachar 84 spel med ljud, så tidsgränsen löpte i praktiken alltid
// ut, och `safeUpdate()` skickade SKIP_WAITING till en SW som fortfarande installerade.
//
// Nu äger vi hela kedjan: fråga servern → vänta in att den nya arbetaren blir `waiting` →
// skicka SKIP_WAITING själva → ladda om på `controllerchange` (med en tidsgräns som
// skyddsnät). `onSteg` får 'letar' / 'laddar' så menyn kan säga vad som händer.
//
// Returnerar 'updating' (ny version aktiveras, sidan laddas om), 'aktuell' (ingen nyare
// version finns — ingen omladdning, för en oväntad omstart är dyrare än en avi) eller
// 'reloaded' (ingen service worker alls, t.ex. i en vanlig flik utan HTTPS).
const INSTALL_TIMEOUT = 60000

export async function forceUpdate(onSteg) {
  let reg = swRegistration
  try {
    if (!reg) reg = await navigator.serviceWorker?.getRegistration?.()
  } catch {
    reg = null
  }
  if (!reg) {
    fallbackReload()
    return 'reloaded'
  }

  let w = reg.waiting
  if (!w) {
    onSteg?.('letar')
    try {
      await reg.update()
    } catch (e) {
      console.warn('Uppdateringskoll misslyckades', e)
    }
    w = reg.waiting
    if (!w && reg.installing) {
      onSteg?.('laddar')
      w = await vantaPaWaiting(reg, INSTALL_TIMEOUT)
    }
  }
  pending = false
  if (!w) return 'aktuell'

  onSteg?.('byter')
  await aktivera(w)
  return 'updating'
}

// Vänta tills den installerande arbetaren blivit `waiting` (= färdig och redo att ta över).
// Ger `null` om den blir `redundant` (installationen föll) eller om tiden tar slut.
function vantaPaWaiting(reg, timeoutMs) {
  const worker = reg.installing
  if (!worker) return Promise.resolve(reg.waiting || null)
  return new Promise((resolve) => {
    let klar = false
    const slut = (v) => {
      if (klar) return
      klar = true
      worker.removeEventListener('statechange', onChange)
      resolve(v)
    }
    const onChange = () => {
      if (worker.state === 'installed' || worker.state === 'activated') slut(reg.waiting || worker)
      else if (worker.state === 'redundant') slut(null)
    }
    worker.addEventListener('statechange', onChange)
    setTimeout(() => slut(reg.waiting || null), timeoutMs)
  })
}

// Låt den väntande arbetaren ta över och ladda om sidan. SKIP_WAITING är exakt det
// meddelande workbox egen `messageSkipWaiting()` skickar, och den genererade servicearbetaren
// lyssnar på det. Tidsgränsen är skyddsnätet: byter den ändå inte, ladda om — den nya
// arbetaren tar då över vid nästa start.
function aktivera(w) {
  return new Promise((resolve) => {
    let klar = false
    const ladda = () => {
      if (klar) return
      klar = true
      fallbackReload()
      resolve()
    }
    try {
      navigator.serviceWorker?.addEventListener?.('controllerchange', ladda, { once: true })
    } catch {
      /* ingen serviceWorker-yta — tidsgränsen nedan tar hand om det */
    }
    setTimeout(ladda, 5000)
    try {
      w.postMessage({ type: 'SKIP_WAITING' })
    } catch (e) {
      console.warn('Kunde inte aktivera uppdateringen', e)
      ladda()
    }
  })
}

function fallbackReload() {
  try {
    window.location.reload()
  } catch {
    /* noop */
  }
}
