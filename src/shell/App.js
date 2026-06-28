// Skapar den enda Pixi-applikationen och lager-strukturen.
// Lager (alla i "world", som skalas av Scaler i designkoordinater):
//   bgLayer  – fyller skärmen med bakgrundsfärg (letterbox-kanter)
//   world
//     screenHolder – aktuell skärm/spel
//     fxLayer      – konfetti/firande ovanpå (icke-interaktivt)
//     gateLayer    – föräldra-grind, dialoger, avier (överst)
import { Application, Container, Graphics } from 'pixi.js'
import { Scaler } from '../services/Scaler.js'

export async function createApp(mountEl) {
  const app = new Application()
  await app.init({
    resizeTo: window,
    preference: 'webgl',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    backgroundAlpha: 0,
    powerPreference: 'high-performance',
  })
  app.ticker.maxFPS = 60
  mountEl.appendChild(app.canvas)

  const bgLayer = new Graphics()
  bgLayer.eventMode = 'none'

  const world = new Container()
  const screenHolder = new Container()
  const fxLayer = new Container()
  fxLayer.eventMode = 'none'
  fxLayer.interactiveChildren = false
  const gateLayer = new Container()

  world.addChild(screenHolder, fxLayer, gateLayer)
  app.stage.addChild(bgLayer, world)

  const scaler = new Scaler(app, world, bgLayer)
  scaler.layout()

  // Blockera webbläsarens kontextmeny (långtryck) på canvasen.
  app.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  return { app, world, screenHolder, fxLayer, gateLayer, scaler }
}
