// Skalar världen till en fast designupplösning (1280x720) med "contain"-letterbox,
// centrerar den och målar bakgrunden så att kanterna ser avsiktliga ut.
import { DESIGN_W, DESIGN_H, COLORS } from '../lib/theme.js'

export class Scaler {
  constructor(app, world, bgLayer) {
    this.app = app
    this.world = world
    this.bgLayer = bgLayer
    this.scale = 1
    this._cbs = new Set()
    this._onResize = () => this.layout()
    app.renderer.on('resize', this._onResize)
    window.addEventListener('resize', this._onResize)
    window.addEventListener('orientationchange', this._onResize)
  }

  onResize(cb) {
    this._cbs.add(cb)
    return () => this._cbs.delete(cb)
  }

  layout() {
    const w = this.app.screen.width
    const h = this.app.screen.height
    const s = Math.min(w / DESIGN_W, h / DESIGN_H)
    this.scale = s
    this.world.scale.set(s)
    this.world.x = Math.round((w - DESIGN_W * s) / 2)
    this.world.y = Math.round((h - DESIGN_H * s) / 2)
    this.bgLayer.clear().rect(0, 0, w, h).fill(COLORS.bg)
    this._cbs.forEach((cb) => cb(w, h, s))
  }

  destroy() {
    this.app.renderer.off('resize', this._onResize)
    window.removeEventListener('resize', this._onResize)
    window.removeEventListener('orientationchange', this._onResize)
    this._cbs.clear()
  }
}
