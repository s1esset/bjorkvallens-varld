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

// Finns en redan nedladdad uppdatering som bara väntar på att aktiveras?
export function hasPendingUpdate() {
  return pending
}

export function applyPendingUpdateAtMenu() {
  if (pending) {
    pending = false
    updateSW(true) // laddar om till nya versionen vid en lugn punkt
  }
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

// TVINGA fram senaste versionen (förälder-knapp i menyn). Strategi:
//  1) Väntar redan en uppdatering -> aktivera den direkt.
//  2) Annars fråga servern efter en ny service worker (reg.update()); om en hittas,
//     vänta in att den installeras och aktivera + ladda om.
//  3) Hittades ingen ny version -> ladda ändå om sidan (hämtar färska sidresurser),
//     så knappen alltid känns som att den "gör något".
// Returnerar 'updating' (ny version aktiveras) eller 'reloaded' (ingen ny hittad).
export async function forceUpdate() {
  if (pending) {
    pending = false
    await safeUpdate()
    return 'updating'
  }
  try {
    const reg = swRegistration || (await navigator.serviceWorker?.getRegistration?.())
    if (reg) {
      await reg.update()
      const fresh = reg.installing || reg.waiting
      if (fresh) {
        await waitInstalled(fresh, 4000)
        pending = false
        await safeUpdate()
        return 'updating'
      }
    }
  } catch (e) {
    console.warn('Uppdateringskoll misslyckades', e)
  }
  fallbackReload()
  return 'reloaded'
}

// updateSW(true) skickar SKIP_WAITING och laddar om på controllerchange. Skydda med
// en fallback-reload om något oväntat kastar.
async function safeUpdate() {
  try {
    await updateSW(true)
  } catch (e) {
    console.warn('Kunde inte aktivera uppdateringen', e)
    fallbackReload()
  }
}

// Vänta tills en (ny)installerande SW är färdiginstallerad (blir "waiting"), max timeoutMs.
function waitInstalled(worker, timeoutMs) {
  if (!worker || worker.state === 'installed' || worker.state === 'activated') return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      worker.removeEventListener('statechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (worker.state === 'installed' || worker.state === 'activated') finish()
    }
    worker.addEventListener('statechange', onChange)
    setTimeout(finish, timeoutMs)
  })
}

function fallbackReload() {
  try {
    window.location.reload()
  } catch {
    /* noop */
  }
}
