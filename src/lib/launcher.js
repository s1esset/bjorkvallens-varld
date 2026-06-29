// AimLauncher — återanvändbar "sikta & skjut"-kontroll för fysikspel (2–5 år).
// Barnet GREPPAR ett objekt och drar för att välja RIKTNING + KRAFT (acceleration);
// en prickad bana visar var skottet hamnar; vid släpp skjuts kroppen iväg med fart
// ∝ dragvektorn (clampad). Liten dragning = tap → skjut mot ett default-mål med lagom
// kraft (tap-fallback, så även de minsta klarar det). Allt no-fail och förlåtande.
//
// Kontrollen sköter BARA input + prickad förhandsvisning. Spelet gör det visuella via
// callbacks (onGrab/onAim/onLaunch) och äger fysik-kroppen.
//
// Användning:
//   this._launcher = new AimLauncher({
//     target: this._projectile,           // Pixi-display barnet greppar (ankrad i mitten)
//     root: this._root,                    // container att rita banan i
//     audio: ctx.services.audio,
//     slingshot: true,                     // dra bakåt -> skjut framåt (slangbella)
//     maxPower: 26, powerScale: 0.16,
//     getOrigin: () => ({ x: this._projectile.x, y: this._projectile.y }),
//     previewGravity: 0.5, bounds: { floorY: 640, leftX: 40, rightX: 1240 },
//     defaultAim: () => ({ x: this._goal.x, y: this._goal.y }),
//     onLaunch: ({ vx, vy, power }) => this._fire(vx, vy, power),
//   })
//   ...destroy(): this._launcher.destroy()
import { Graphics, Circle } from 'pixi.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export class AimLauncher {
  constructor(opts = {}) {
    this.target = opts.target
    this.root = opts.root
    this.audio = opts.audio || null
    this.hitRadius = opts.hitRadius ?? 90
    this.maxPower = opts.maxPower ?? 26
    this.minPower = opts.minPower ?? 7
    this.powerScale = opts.powerScale ?? 0.16
    this.slingshot = opts.slingshot ?? false // true: dra bakåt -> skjut motsatt håll
    this.getOrigin = opts.getOrigin || (() => ({ x: this.target?.x ?? 0, y: this.target?.y ?? 0 }))
    this.previewGravity = opts.previewGravity ?? 0.5
    this.previewWind = opts.previewWind ?? 0
    this.bounds = opts.bounds || null
    this.defaultAim = opts.defaultAim || null // () => ({x,y}) för tap-fallback
    this.tapPower = opts.tapPower ?? 0.62 // andel av maxPower vid tap
    this.onGrab = opts.onGrab || null
    this.onAim = opts.onAim || null
    this.onLaunch = opts.onLaunch || null
    this.trailColor = opts.trailColor ?? 0xffffff

    this.enabled = true
    this._alive = true
    this._aiming = false
    this._down = null

    this._trail = new Graphics()
    this._trail.eventMode = 'none'
    this._trail.visible = false
    this.root.addChild(this._trail)

    this._onDown = (e) => this._pointerDown(e)
    this._onMove = (e) => this._pointerMove(e)
    this._onUp = (e) => this._pointerUp(e)
    this._bind()
  }

  _bind() {
    const t = this.target
    if (!t) return
    t.eventMode = 'static'
    t.cursor = 'pointer'
    if (this.hitRadius) t.hitArea = new Circle(0, 0, this.hitRadius)
    t.on('pointerdown', this._onDown)
  }

  // Tillåt/förbjud sikte (t.ex. medan ett skott är i luften).
  setEnabled(on) {
    this.enabled = on
    if (!on) this._cancel()
  }

  setPreview({ gravity, wind, bounds } = {}) {
    if (gravity != null) this.previewGravity = gravity
    if (wind != null) this.previewWind = wind
    if (bounds) this.bounds = bounds
  }

  _pointerDown(e) {
    if (!this._alive || !this.enabled || !this.target || this.target.destroyed) return
    this._aiming = true
    this._down = this.root.toLocal(e.global)
    this.audio?.sfx('tap')
    this.onGrab?.()
    this.target.on('globalpointermove', this._onMove)
    this.target.on('pointerup', this._onUp)
    this.target.on('pointerupoutside', this._onUp)
  }

  // Beräkna skott-hastighet från drag-vektor (down -> nu).
  _velFrom(p) {
    let dx = p.x - this._down.x
    let dy = p.y - this._down.y
    if (this.slingshot) {
      dx = -dx
      dy = -dy
    }
    let vx = dx * this.powerScale
    let vy = dy * this.powerScale
    const mag = Math.hypot(vx, vy)
    if (mag > this.maxPower) {
      const k = this.maxPower / mag
      vx *= k
      vy *= k
    }
    return { vx, vy, power: Math.min(mag, this.maxPower) }
  }

  _pointerMove(e) {
    if (!this._aiming) return
    const p = this.root.toLocal(e.global)
    const v = this._velFrom(p)
    this._drawTrail(v.vx, v.vy)
    this.onAim?.(v)
  }

  _pointerUp(e) {
    if (!this._aiming) return
    this._aiming = false
    this._detach()
    this._hideTrail()
    const p = this.root.toLocal(e.global)
    const dragLen = Math.hypot(p.x - this._down.x, p.y - this._down.y)

    if (dragLen < 16) {
      // Tap-fallback: skjut mot default-målet med lagom kraft (no-fail för de minsta).
      const aim = typeof this.defaultAim === 'function' ? this.defaultAim() : this.defaultAim
      if (!aim) return
      const o = this.getOrigin()
      let dx = aim.x - o.x
      let dy = aim.y - o.y
      const len = Math.hypot(dx, dy) || 1
      const power = this.maxPower * this.tapPower
      const v = { vx: (dx / len) * power, vy: (dy / len) * power, power }
      this._launch(v)
      return
    }

    const v = this._velFrom(p)
    if (v.power < this.minPower) {
      // för svagt -> ge ändå ett lagom skott i samma riktning (förlåtande)
      const k = this.minPower / (v.power || 1)
      v.vx *= k
      v.vy *= k
      v.power = this.minPower
    }
    this._launch(v)
  }

  _launch(v) {
    this.audio?.sfx('whoosh')
    this.onLaunch?.(v)
  }

  _drawTrail(vx, vy) {
    const o = this.getOrigin()
    const b = this.bounds || {}
    const pts = predict(o.x, o.y, vx, vy, this.previewGravity, this.previewWind, b)
    const g = this._trail
    g.clear()
    if (!pts.length) {
      g.visible = false
      return
    }
    g.visible = true
    for (let i = 0; i < pts.length; i++) {
      const r = Math.max(3, 9 - 6 * (i / pts.length))
      const a = 0.8 - 0.5 * (i / pts.length)
      g.circle(pts[i].x, pts[i].y, r).fill({ color: this.trailColor, alpha: a })
    }
  }

  _hideTrail() {
    if (this._trail && !this._trail.destroyed) {
      this._trail.clear()
      this._trail.visible = false
    }
  }

  _detach() {
    const t = this.target
    if (t && !t.destroyed) {
      t.off('globalpointermove', this._onMove)
      t.off('pointerup', this._onUp)
      t.off('pointerupoutside', this._onUp)
    }
  }

  _cancel() {
    this._aiming = false
    this._detach()
    this._hideTrail()
  }

  destroy() {
    this._alive = false
    this._cancel()
    const t = this.target
    if (t && !t.destroyed) t.off('pointerdown', this._onDown)
    if (this._trail && !this._trail.destroyed) this._trail.destroy()
    this._trail = null
    this.target = null
  }
}

// Lättviktig banprediktion (visuell guide) — punktmassa under gravitation + vind, med
// studs mot golv/väggar. Stannar tidigt om den lämnar skärmen åt sidorna utan väggar.
function predict(x, y, vx, vy, gy, wx, bounds) {
  const pts = []
  const { floorY = null, leftX = null, rightX = null, restitution = 0.55 } = bounds || {}
  let px = x
  let py = y
  let pvx = vx
  let pvy = vy
  const steps = 64
  for (let i = 0; i < steps; i++) {
    pvy += gy
    pvx += wx
    px += pvx
    py += pvy
    if (floorY != null && py > floorY) {
      py = floorY
      pvy = -Math.abs(pvy) * restitution
    }
    if (leftX != null && px < leftX) {
      px = leftX
      pvx = Math.abs(pvx) * restitution
    }
    if (rightX != null && px > rightX) {
      px = rightX
      pvx = -Math.abs(pvx) * restitution
    }
    if (i % 3 === 0) pts.push({ x: px, y: py })
    // sluta om den åkt långt under skärmen
    if (py > 900) break
  }
  return pts
}
