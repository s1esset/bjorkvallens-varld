// Service worker-registrering. Vi använder "prompt"-läge men promptar ALDRIG barnet:
// en väntande uppdatering appliceras först vid menyn/biblioteket (se applyPendingUpdateAtMenu).
import { registerSW } from 'virtual:pwa-register'

let pending = false
let offlineReadyCb = null

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    pending = true // stash — applicera vid lugn gräns, inte mitt i ett spel
  },
  onOfflineReady() {
    offlineReadyCb?.()
  },
  onRegisterError(err) {
    console.warn('SW kunde inte registreras', err)
  },
})

export function onOfflineReady(cb) {
  offlineReadyCb = cb
}

export function applyPendingUpdateAtMenu() {
  if (pending) {
    pending = false
    updateSW(true) // laddar om till nya versionen vid en lugn punkt
  }
}
