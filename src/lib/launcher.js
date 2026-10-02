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
//
// SKUGGVÄRLD (FYSIKPLAN G3a, opt-in): `skuggvarld: { varld: this._phys, kula: this._ballBody }` ritar
// banan genom en liten matter-motor med världens STATISKA kroppar (deras `studs`/`friktion`) och en
// provkula med den riktiga kulans egna tal, i stället för punktmassan i `predict()`. Se `Skuggvarld`.
// Utan nyckeln är förhandsvisningen byte-för-byte `predict()`.
import { Graphics, Circle } from 'pixi.js'
import { Matter, Body, Composite, Bodies } from './physics.js'
import { logAim } from './gamelog.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// PEKAR-ID (FYSIKPLAN K2): greppet minns fingrets `pointerId`; ett andra finger (eller en
// handflata) som rör sig eller lyfts får varken sikta eller skjuta. Saknas id släpps händelsen
// igenom (syntetiska händelser) — dagens beteende.
const GREPP_FASTNAT = 2000 // ms utan rörelse — då har släppet aldrig nått fram (se `_pointerDown`)

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
    // Luftmotstånd i förhandsvisningen (1 = inget). matter.js dämpar farten ~(1-frictionAir)
    // per steg; utan detta överskattar pricklinjen räckvidden rejält på långa skott.
    this.previewDamp = opts.previewDamp ?? 1
    this.bounds = opts.bounds || null
    this.defaultAim = opts.defaultAim || null // () => ({x,y}) för tap-fallback
    this.tapPower = opts.tapPower ?? 0.62 // andel av maxPower vid tap
    this.onGrab = opts.onGrab || null
    this.onAim = opts.onAim || null
    this.onLaunch = opts.onLaunch || null
    this.trailColor = opts.trailColor ?? 0xffffff
    // Skuggvärlden (G3a): { varld, kula, filter?, vindMinFart?, steg? } eller en färdig `Skuggvarld`.
    // AimLauncher äger den och river den i destroy().
    this.skuggvarld = opts.skuggvarld ? (opts.skuggvarld instanceof Skuggvarld ? opts.skuggvarld : new Skuggvarld(opts.skuggvarld)) : null
    this._skuggT = -1e9 // när skuggbanan senast räknades (högst en gång per bildruta)
    this._skuggVantar = null // senaste dragvektorn som väntar på nästa bildruta
    this._skuggTimer = null

    this.enabled = true
    this._alive = true
    this._aiming = false
    this._down = null
    this._pid = null
    this._senastRort = 0

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

  setPreview({ gravity, wind, bounds, damp } = {}) {
    if (gravity != null) this.previewGravity = gravity
    if (wind != null) this.previewWind = wind
    if (damp != null) this.previewDamp = damp
    if (bounds) this.bounds = bounds
  }

  _pointerDown(e) {
    if (!this._alive || !this.enabled || !this.target || this.target.destroyed) return
    if (this._aiming) {
      // Ett finger i taget. Skyddsnät: har greppet stått kvar > 2 s utan rörelse kom det gamla
      // fingrets släpp aldrig fram — avbryt det (inget skott) och låt det nya tryckandet börja om.
      if (performance.now() - this._senastRort < GREPP_FASTNAT) return
      this._cancel()
    }
    this._aiming = true
    this._pid = e.pointerId ?? null
    this._senastRort = performance.now()
    this._down = this.root.toLocal(e.global)
    logAim('sikte-start', { x: Math.round(this._down.x), y: Math.round(this._down.y) })
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
    if (!this._aiming || this._annatFinger(e)) return
    this._senastRort = performance.now()
    const p = this.root.toLocal(e.global)
    const v = this._velFrom(p)
    if (this.skuggvarld) this._ritaSkugg(v)
    else this._drawTrail(v.vx, v.vy)
    this.onAim?.(v)
  }

  // Skuggbanan kostar 64 motorsteg: högst EN omräkning per bildruta. Första rörelsen i en bildruta
  // räknas direkt (ingen fördröjning); en rörelse som kommer < 14 ms efter den köas och ritas av
  // nästa bildruta, så sista fingerläget aldrig tappas.
  _ritaSkugg(v) {
    const nu = performance.now()
    if (nu - this._skuggT >= 14) {
      this._skuggT = nu
      this._skuggVantar = null
      this._drawTrail(v.vx, v.vy)
      return
    }
    this._skuggVantar = v
    if (this._skuggTimer != null) return
    const flush = () => {
      this._skuggTimer = null
      const k = this._skuggVantar
      this._skuggVantar = null
      if (!k || !this._alive || !this._aiming) return
      this._skuggT = performance.now()
      this._drawTrail(k.vx, k.vy)
    }
    this._skuggTimer = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(flush) : setTimeout(flush, 16)
  }

  _stoppaSkugg() {
    this._skuggVantar = null
    if (this._skuggTimer == null) return
    // rAF- och timeout-id:n är olika namnrymder: avbryt med SAMMA slags anrop som schemalade.
    if (typeof requestAnimationFrame === 'function') cancelAnimationFrame(this._skuggTimer)
    else clearTimeout(this._skuggTimer)
    this._skuggTimer = null
  }

  _annatFinger(e) {
    return this._pid != null && e && e.pointerId != null && e.pointerId !== this._pid
  }

  _pointerUp(e) {
    if (!this._aiming || this._annatFinger(e)) return
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
    const o = this.getOrigin()
    logAim('skott', {
      vx: Math.round(v.vx),
      vy: Math.round(v.vy),
      kraft: Math.round(v.power),
      maxKraft: this.maxPower,
      fran: { x: Math.round(o.x), y: Math.round(o.y) },
      slangbella: !!this.slingshot,
      forhandsGravitation: this.previewGravity,
      forhandsVind: this.previewWind,
    })
    this.audio?.sfx('whoosh')
    this.onLaunch?.(v)
  }

  _drawTrail(vx, vy) {
    const o = this.getOrigin()
    const b = this.bounds || {}
    let pts = null
    if (this.skuggvarld) pts = this.skuggvarld.bana(o.x, o.y, vx, vy, { gy: this.previewGravity, wx: this.previewWind })
    // Skuggvärlden kan ge null (motorn föll, NaN): då ritar den gamla punktmassan i stället för ingenting.
    if (!pts) pts = predict(o.x, o.y, vx, vy, this.previewGravity, this.previewWind, b, this.previewDamp)
    // `bounds.topY` (opt-in): banan slutar där spelplanen tar slut, så prickarna inte vandrar upp i dekoren.
    if (b?.topY != null) {
      const i = pts.findIndex((p) => p.y < b.topY)
      if (i >= 0) pts = pts.slice(0, i)
    }
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
    this._stoppaSkugg()
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
    this._pid = null
    this._detach()
    this._hideTrail()
  }

  destroy() {
    this._alive = false
    this._cancel()
    this._stoppaSkugg()
    this.skuggvarld?.destroy()
    this.skuggvarld = null
    const t = this.target
    if (t && !t.destroyed) t.off('pointerdown', this._onDown)
    if (this._trail && !this._trail.destroyed) this._trail.destroy()
    this._trail = null
    this.target = null
  }
}

// Lättviktig banprediktion (visuell guide) — punktmassa under gravitation + vind, med
// studs mot golv/väggar. Stannar tidigt om den lämnar skärmen åt sidorna utan väggar.
// damp (<1) = luftmotstånd per steg så pricklinjen matchar matter.js verkliga inbromsning.
export function predict(x, y, vx, vy, gy, wx, bounds, damp = 1, every = 3) {
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
    if (damp !== 1) {
      pvx *= damp
      pvy *= damp
    }
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
    if (i % every === 0) pts.push({ x: px, y: py })
    // sluta om den åkt långt under skärmen
    if (py > 900) break
  }
  return pts
}

// ---------------------------------------------------------------------------------------------
// SKUGGVÄRLD (FYSIKPLAN G3a) — banan genom spelets egna statiska kroppar.
//
// `predict()` är en punktmassa som bara känner golv och väggar: en ramp, en platta eller ett
// räcke ritas fel, och tre spel handtrimmade runt det. Skuggvärlden är i stället en LITEN
// matter-motor med samma statiska kroppar (de DELAS med spelets värld — deras `studs`/`friktion`
// och ev. rörelse följer med utan kopiering) och EN provkula som tar den riktiga kulans tal. Samma
// motor + samma tal + samma 1/60-steg = samma bana, så pricklinjen kan inte avvika på en yta som
// handtrimningen aldrig kände till.
//
//   new AimLauncher({ …, skuggvarld: { varld: this._phys, kula: this._ballBody } })
//
//   varld        PhysicsWorld — statiska kroppar OCH gravitationen läses ur den (live), så
//                skuggvärlden aldrig kan ärva en egen gammal gravitationslögn. Utelämnad: kropparna
//                ges med `kroppar: () => Body[]` och gravitationen kommer ur launcherns
//                `previewGravity` (px/steg², 0,2778 × motorns gravityY).
//   kula         den riktiga kulans matter-kropp (läses LIVE vid varje bana: restitution, friktion,
//                frictionAir — en yta som byts mitt i spelet följer med), eller ett objekt
//                `{ r, restitution, friction, frictionAir, density, ineria }`, eller en funktion
//                som ger ett av dem.
//   filter(b)    valfritt — false = kroppen är inte med. Förval: alla statiska, icke-sensor-kroppar.
//                (rulla-bollen-hem tar bara 'wall': hindren är medvetet INTE med i pricklinjen.)
//   vindMinFart  px/steg — vinden verkar bara medan kulans fart ≥ detta (spelets egen vindavstängning).
//   steg · hoppa antal motorsteg (förval 64) · var `hoppa`:e steg ger en prick (förval 3, som predict).
//
// `forhandsStopp`: en kropp med egna impulser som skuggvärlden inte kan veta något om (en studsmoln-
// sensor som skjuter kulan uppåt, en flipperdyna) markeras `{ forhandsStopp: true }` när den skapas. Den
// tas med OCH banan SLUTAR där kulan nuddar den — hellre en kort ärlig bana än en som ljuger. En
// sensor tas annars aldrig med (den påverkar inte kulan).
//
// ⚠️ Skuggvärlden kör ALDRIG spelets värld: den har egen motor, egen tidslinje och egen provkula, och
// de delade statiska kropparna rörs inte av ett steg (matter hoppar över dem i integrationen och
// räknar om en fart som redan står där — mätt i `_skuggprobe`: spelets bana är bit-identisk med och
// utan skuggsteg emellan). Riv den: `destroy()` (AimLauncher.destroy gör det).
const STEG2 = (1000 / 60) ** 2

export class Skuggvarld {
  constructor({ varld = null, kroppar = null, kula = null, filter = null, vindMinFart = 0, steg = 64, hoppa = 3 } = {}) {
    this.varld = varld
    this.kroppar = kroppar
    this.kula = kula
    this.filter = filter
    this.vindMinFart = vindMinFart
    this.steg = steg
    this.hoppa = Math.max(1, hoppa | 0)
    this.engine = Matter.Engine.create()
    this.engine.gravity.x = 0
    this.engine.gravity.y = 0
    const k = varld?.engine
    if (k) {
      this.engine.positionIterations = k.positionIterations
      this.engine.velocityIterations = k.velocityIterations
      this.engine.constraintIterations = k.constraintIterations
    }
    this._alive = true
    this._lista = [] // de statiska kroppar som ligger i skuggvärlden just nu
    this._prov = null
    this._provR = -1
    this._provIn = false // ligger provkulan i motorns värld?
    this._stopp = false
    this._onStart = (e) => {
      for (const p of e.pairs) {
        if (stoppar(p.bodyA) || stoppar(p.bodyB)) this._stopp = true
      }
    }
    Matter.Events.on(this.engine, 'collisionStart', this._onStart)
  }

  // De statiska kroppar som ska vara med just nu.
  _kallor() {
    const alla = this.kroppar ? this.kroppar() : this.varld ? Composite.allBodies(this.varld.world) : []
    const ut = []
    for (let i = 0; i < alla.length; i++) {
      const b = alla[i]
      if (!b.isStatic) continue
      if (b.isSensor && !stoppar(b)) continue
      if (this.filter && !this.filter(b)) continue
      ut.push(b)
    }
    return ut
  }

  // Läs den riktiga kulans tal (live) och lägg dem på provkulan; bygg om provkulan bara om radien ändrats.
  _kula() {
    let k = typeof this.kula === 'function' ? this.kula() : this.kula
    if (!k) k = { r: 30 }
    const kropp = k.position != null && k.vertices != null // en matter-kropp
    const r = kropp ? k.circleRadius || (k.bounds.max.x - k.bounds.min.x) / 2 : k.r ?? 30
    if (!this._prov || this._provR !== r) {
      this._prov = Bodies.circle(0, 0, r, { label: 'skuggkula' })
      this._provR = r
      this._provIn = false // den nya provkulan måste in i världen (_synk)
    }
    const p = this._prov
    p.restitution = k.restitution ?? 0.45
    p.friction = k.friction ?? 0.1
    p.frictionStatic = k.frictionStatic ?? 0.5
    p.frictionAir = k.frictionAir ?? 0.01
    p.slop = k.slop ?? p.slop
    if (kropp) {
      p.collisionFilter.category = k.collisionFilter.category
      p.collisionFilter.mask = k.collisionFilter.mask
      p.collisionFilter.group = k.collisionFilter.group
    }
    const dens = k.density ?? 0.001
    if (p.density !== dens) Body.setDensity(p, dens)
    // Ett låst tröghetsmoment (toppvyns puck) ska vara låst även här — annars snurrar provkulan på friktionen.
    const stel = kropp ? k.inertia === Infinity : k.ineria === Infinity
    if (stel) Body.setInertia(p, Infinity)
    else if (p.inertia === Infinity) Body.setInertia(p, (p.mass * r * r) / 2)
    return p
  }

  _synk(prov) {
    const nu = this._kallor()
    const gamla = this._lista
    let lika = this._provIn && gamla.length === nu.length
    for (let i = 0; lika && i < nu.length; i++) if (gamla[i] !== nu[i]) lika = false
    if (lika) return
    const w = this.engine.world
    Composite.clear(w, false)
    if (nu.length) Composite.add(w, nu)
    Composite.add(w, prov)
    this._lista = nu
    this._provIn = true
  }

  // Banan som prickar [{x, y}, …] — var `hoppa`:e motorsteg. `gy`/`wx`/`wy` i px/steg² (launcherns
  // previewGravity/previewWind), `gy` bara när ingen `varld` ger gravitationen. null = motorn föll.
  bana(x, y, vx, vy, { gy = 0, wx = 0, wy = 0, steg = this.steg, hoppa = this.hoppa } = {}) {
    if (!this._alive) return null
    try {
      const e = this.engine
      const prov = this._kula()
      this._synk(prov)
      const g = this.varld ? this.varld.engine.gravity : null
      e.gravity.x = g ? g.x : 0
      e.gravity.y = g ? g.y : gy / (0.001 * STEG2)
      e.gravity.scale = g?.scale ?? 0.001
      Matter.Engine.clear(e)
      // Engine.clear tömmer DETEKTORNS kroppslista, och matter fyller den bara igen när världen är ändrad —
      // utan raden kolliderade bara FÖRSTA banan efter en _synk, och varje omritning under draget gick rakt
      // genom räcket (uppmätt i spelet: 407 px; en färsk värld per skott i Node såg det aldrig).
      Matter.Composite.setModified(e.world, true, false, false)
      this._stopp = false
      Body.setPosition(prov, { x, y })
      Body.setAngle(prov, 0)
      Body.setVelocity(prov, { x: vx, y: vy })
      Body.setAngularVelocity(prov, 0)
      const vind = wx !== 0 || wy !== 0
      const pts = []
      for (let i = 0; i < steg; i++) {
        if (vind && Math.hypot(prov.velocity.x, prov.velocity.y) >= this.vindMinFart) {
          Body.applyForce(prov, prov.position, { x: (prov.mass * wx) / STEG2, y: (prov.mass * wy) / STEG2 })
        }
        Matter.Engine.update(e, 1000 / 60)
        const px = prov.position.x
        const py = prov.position.y
        if (!(Math.abs(px) < 1e5 && Math.abs(py) < 1e5)) return null // NaN eller skenat
        if (i % hoppa === 0) pts.push({ x: px, y: py })
        if (this._stopp) {
          pts.push({ x: px, y: py }) // slutar vid kroppen med egna impulser
          break
        }
        if (py > 900) break // som predict: åkt långt under skärmen
        if (prov.speed < 0.02) break // stilla — fler prickar på samma ställe tillför inget
      }
      return pts
    } catch {
      return null
    }
  }

  destroy() {
    this._alive = false
    try {
      Matter.Events.off(this.engine)
      Composite.clear(this.engine.world, false) // river bara listorna — de delade kropparna rörs inte
      Matter.Engine.clear(this.engine)
    } catch {
      /* noop */
    }
    this._lista = []
    this._prov = null
    this._provIn = false
    this.varld = null
    this.kroppar = null
    this.kula = null
  }
}

// En kropp (eller dess förälder, för en sammansatt) med egna impulser skuggvärlden inte kan veta något om.
function stoppar(b) {
  return !!(b && (b.forhandsStopp || b.parent?.forhandsStopp))
}
