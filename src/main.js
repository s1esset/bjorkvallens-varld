// Björkvallens Värld — bootstrap. Skapar Pixi-appen, alla tjänster och skärm-routern,
// och startar på splash-skärmen.
import './styles.css'
import { createApp } from './shell/App.js'
import { Nav } from './shell/Nav.js'
import { loadFonts } from './lib/fonts.js'
import { showToast } from './lib/toast.js'
import { SaveService } from './services/SaveService.js'
import { ProfileService } from './services/ProfileService.js'
import { AudioService } from './services/AudioService.js'
import { VoiceService } from './services/VoiceService.js'
import { AssetService } from './services/AssetService.js'
import { StickerService } from './services/StickerService.js'
import { ParentalGate } from './services/ParentalGate.js'
import { createSplashScreen } from './shell/screens/SplashScreen.js'
import { createMenuScreen } from './shell/screens/MenuScreen.js'
import { createSettingsScreen } from './shell/screens/SettingsScreen.js'
import { createLibraryScreen } from './shell/screens/LibraryScreen.js'
import { createGameHost } from './shell/screens/GameHost.js'
import { onOfflineReady, applyPendingUpdateAtMenu } from './lib/pwa.js'

async function boot() {
  await loadFonts()

  const mountEl = document.getElementById('app')
  const ctx = await createApp(mountEl)

  const save = new SaveService()
  const profiles = new ProfileService(save)
  const audio = new AudioService(save)
  const voice = new VoiceService(save)
  const assets = new AssetService()
  await assets.init()
  const stickers = new StickerService(save, profiles)
  const nav = new Nav(ctx)
  const gate = new ParentalGate(ctx.gateLayer, null)

  const services = {
    app: ctx.app,
    world: ctx.world,
    fxLayer: ctx.fxLayer,
    gateLayer: ctx.gateLayer,
    scaler: ctx.scaler,
    save,
    profiles,
    audio,
    voice,
    assets,
    stickers,
    gate,
    nav,
    applyPendingUpdateAtMenu,
    toast: (msg) => showToast(ctx.gateLayer, msg),
  }
  gate.services = services
  nav.services = services

  nav.register('splash', createSplashScreen)
  nav.register('menu', createMenuScreen)
  nav.register('settings', createSettingsScreen)
  nav.register('library', createLibraryScreen)
  nav.register('game', createGameHost)

  onOfflineReady(() => services.toast('Klar att spela offline'))

  await nav.go('splash')

  // Praktiskt för felsökning i konsolen.
  if (import.meta.env?.DEV) window.__barnspel = services
}

boot().catch((err) => {
  console.error('Kunde inte starta Björkvallens Värld', err)
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML =
      '<div style="display:flex;height:100%;align-items:center;justify-content:center;font-family:sans-serif;color:#7a6657;text-align:center;padding:24px">Något gick fel när appen skulle starta.<br>Ladda om sidan.</div>'
  }
})
