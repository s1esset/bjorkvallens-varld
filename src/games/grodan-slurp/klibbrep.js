// Klibbrepet (grodan-slurp) — tungan mitt i ett SUPERHOPP.
//
// Den vanliga tungan (tunga.js) är ett skott mot en punkt och en fjäder. Mitt i ett superhopp
// åker tungan i stället bara UT och blir ett mjukt rep: en kedja av små matter-kroppar som
// flänger med grodan, krockar med dammen på riktigt och KLIBBAR. Insekter som nuddar repet
// fastnar och följer sin länk. Saker repet slår i fastnar med en fjädrande led: en gren eller
// sten blir ett ankare som grodan dinglar i, och en kotte hänger med som en släpvagn.
//
// När grodan vaknat efter tumlandet SLURPAS repet in som spagetti. Den fysiska kedjan byts mot
// sin egen form, en polylinje fäst vid munnen, som glider in längs sig själv. Varje insekt äts
// när den når munnen. Allt annat släpps redan när slurpen börjar.
//
// Länkarna ligger i grodans egen negativa kollisionsgrupp: de krockar aldrig med grodan eller
// med varandra, men med allt annat. Fysiken körs i `steg()` (phys.beforeStep), bilden och
// slurpen i `rita()`. Tak: högst MAX_SAKER fastklibbade saker (P0: tak på hur mycket som
// händer samtidigt). Insekter har inget tak, för varje insekt på repet är ett GULP till.
import { Graphics } from 'pixi.js'
import { Matter } from '../../lib/physics.js'

const { Body, Constraint, Composite, Query } = Matter

const N = 13 // länkar
const SEG_L = 15 // vilolängd per länk (px) → ett rep på ~195 px
const SEG_R = 6
const MAX_SAKER = 2
const VAXT = 2.5 // px/steg: så fort länkarna fälls ut ur munnen
const SLURP_V0 = 260 // px/s
const SLURP_ACC = 2400 // px/s²
const SLURP_MAX = 1100

export class Klibbrep {
  // hitta: { maskKroppar() → kroppar som inget krockar med men som repet ändå fastnar i (vass) }
  // pa:    { fastnade(body, x, y), fangade(ins), at(ins), klar() }
  constructor({ phys, groda, lager, flytvolym, svarm, hitta = {}, pa = {} }) {
    this._phys = phys
    this.groda = groda
    this._flyt = flytvolym
    this._svarm = svarm
    this.hitta = hitta
    this.pa = pa
    this._alive = true
    this.lage = 'av' // av | fysik | slurp | klar
    this.lankar = []
    this._leder = []
    this._mun = null
    this._saker = new Map() // body → constraint
    this._insekter = [] // { ins, i, ox, oy, s }
    this._L = 1
    this._n = 0
    this.g = new Graphics()
    this.g.eventMode = 'none'
    lager.addChild(this.g)
  }

  get klar() {
    return this.lage === 'klar' || this.lage === 'av'
  }

  get antalInsekter() {
    return this._insekter.length
  }

  // Skjut ut repet i riktningen (ux, uy). Länkarna startar hopklumpade i munnen med en fart som
  // växer mot spetsen, och ledlängderna växer till SEG_L — repet vecklar ut sig själv.
  skjut(ux, uy) {
    if (!this._alive || this.lage !== 'av') return false
    const g = this.groda
    const m = g.mun()
    const h = g.b.huvud
    const hv = h.velocity
    for (let i = 0; i < N; i++) {
      const b = this._phys.circle(m.x + ux * i * 1.5, m.y + uy * i * 1.5, SEG_R, {
        density: 0.0018,
        friction: 0.6,
        frictionAir: 0.035,
        restitution: 0.1,
        collisionFilter: { group: g._grupp },
        label: 'rep',
      })
      b.plugin = b.plugin || {}
      b.plugin.repLank = true
      const f = 6 + (13 * i) / (N - 1)
      Body.setVelocity(b, { x: hv.x + ux * f, y: hv.y + uy * f })
      this._flyt?.lagg(b, { flyt: 2.2, liv: false })
      this.lankar.push(b)
    }
    const w = this._phys.world
    this._mun = Constraint.create({
      bodyA: h,
      pointA: { x: m.x - h.position.x, y: m.y - h.position.y },
      bodyB: this.lankar[0],
      length: 0,
      stiffness: 0.8,
      damping: 0.05,
      label: 'repmun',
    })
    Composite.add(w, this._mun)
    for (let i = 0; i < N - 1; i++) {
      const c = Constraint.create({ bodyA: this.lankar[i], bodyB: this.lankar[i + 1], length: 1.5, stiffness: 0.85, damping: 0.04, label: 'replank' })
      Composite.add(w, c)
      this._leder.push(c)
    }
    this._L = 1.5
    this._n = 0
    this.lage = 'fysik'
    return true
  }

  // Grodan bytte vy (sidovy ↔ stjärnläge): munnen sitter på ett annat ställe på huvudet.
  nyMun() {
    if (this.lage !== 'fysik' || !this._mun) return
    const h = this.groda.b.huvud
    const m = this.groda.mun()
    this._mun.pointA = { x: m.x - h.position.x, y: m.y - h.position.y }
    this._mun.angleA = h.angle
  }

  // Ett tryck mitt i superhoppet: spetsen snärtar mot fingret.
  snart(x, y) {
    if (this.lage !== 'fysik') return
    const n = this.lankar.length
    for (let k = 0; k < 5 && k < n; k++) {
      const b = this.lankar[n - 1 - k]
      const dx = x - b.position.x
      const dy = y - b.position.y
      const d = Math.hypot(dx, dy) || 1
      const f = 9 - k * 1.4
      Body.setVelocity(b, { x: b.velocity.x * 0.4 + (dx / d) * f, y: b.velocity.y * 0.4 + (dy / d) * f })
    }
  }

  // Något som klibbade försvinner ur dammen (hindret simmade iväg) → släpp det.
  lossa(body) {
    const c = this._saker.get(body)
    if (!c) return
    Composite.remove(this._phys.world, c)
    this._saker.delete(body)
  }

  // Ett fast fysiksteg.
  steg() {
    if (!this._alive || this.lage !== 'fysik') return
    this._n++
    if (this._L < SEG_L) {
      this._L = Math.min(SEG_L, this._L + VAXT)
      for (const c of this._leder) c.length = this._L
    }
    for (const body of [...this._saker.keys()]) {
      if (!body.position || !Number.isFinite(body.position.x)) this.lossa(body)
    }
    // De första stegen ligger repet i munnen: det ska inte klibba fast i det grodan står på.
    if (this._n > 3) this._klibba()
    this._fangaInsekter()
    this._foljInsekter()
  }

  _klibba() {
    if (this._saker.size < MAX_SAKER) {
      const par = this._phys.engine.pairs.list
      for (let i = 0; i < par.length; i++) {
        const p = par[i]
        if (!p.isActive || p.isSensor) continue
        const a = p.bodyA.parent || p.bodyA
        const b = p.bodyB.parent || p.bodyB
        const aL = !!a.plugin?.repLank
        const bL = !!b.plugin?.repLank
        if (aL === bL) continue
        const lank = aL ? a : b
        const annan = aL ? b : a
        if (annan.label === 'wall' || this.groda.ar(annan) || this._saker.has(annan)) continue
        this._fast(lank, annan)
        if (this._saker.size >= MAX_SAKER) return
      }
    }
    // Vassen krockar inte med något (mask 0) — den provas som punkt mot länkarna.
    if (this._saker.size >= MAX_SAKER || this._n % 3) return
    const mask = this.hitta.maskKroppar?.() || []
    if (!mask.length) return
    for (const l of this.lankar) {
      const t = Query.point(mask, l.position)
      if (!t.length) continue
      const body = t[0].parent || t[0]
      if (this._saker.has(body)) continue
      this._fast(l, body)
      return
    }
  }

  _fast(lank, body) {
    const c = Constraint.create({
      bodyA: lank,
      bodyB: body,
      pointB: { x: lank.position.x - body.position.x, y: lank.position.y - body.position.y },
      length: 0,
      stiffness: body.isStatic ? 0.5 : 0.3,
      damping: 0.05,
      label: 'repklibb',
    })
    Composite.add(this._phys.world, c)
    this._saker.set(body, c)
    this.pa.fastnade?.(body, lank.position.x, lank.position.y)
  }

  // Håller något grodan kvar i luften (en fast sak, eller en som är tyngre än grodan)?
  get ankrad() {
    for (const b of this._saker.keys()) if (b.isStatic || b.mass > this.groda.massa * 0.7) return true
    return false
  }

  _fangaInsekter() {
    const lista = this._svarm.lista
    if (!lista.length) return
    for (const ins of lista) {
      for (let i = 0; i < this.lankar.length; i++) {
        const p = this.lankar[i].position
        const dx = ins.x - p.x
        const dy = ins.y - p.y
        const R = ins.r * 0.8 + SEG_R + 4
        if (dx * dx + dy * dy >= R * R) continue
        this._svarm.fanga(ins)
        const d = Math.hypot(dx, dy) || 1
        const o = Math.min(d, 9)
        this._insekter.push({ ins, i, ox: (dx / d) * o, oy: (dy / d) * o, s: 0 })
        this.pa.fangade?.(ins)
        break
      }
    }
  }

  _foljInsekter() {
    for (const f of this._insekter) {
      if (f.ins.dod) continue
      const p = this.lankar[f.i]?.position
      if (!p) continue
      f.ins.x = p.x + f.ox
      f.ins.y = p.y + f.oy
    }
  }

  // Grodan har vaknat: släpp allt som inte går att äta och slurpa in repet med insekterna.
  slurpa() {
    if (this.lage !== 'fysik') {
      if (this.lage === 'av') this.lage = 'klar'
      return
    }
    const m = this.groda.mun()
    const pts = [{ x: 0, y: 0 }]
    for (const l of this.lankar) pts.push({ x: l.position.x - m.x, y: l.position.y - m.y })
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
    this._pts = pts
    this._cum = cum
    this._langd = cum[cum.length - 1]
    for (const f of this._insekter) f.s = cum[f.i + 1] ?? this._langd
    this._insekter.sort((a, b) => a.s - b.s)
    this._rivKedja()
    this._d = 0
    this._v = SLURP_V0
    this.lage = 'slurp'
    this.groda.oppnaMun(1)
  }

  // Punkten `s` px in längs den sparade formen (relativt munnen).
  _punkt(s) {
    const pts = this._pts
    const cum = this._cum
    if (s <= 0) return pts[0]
    for (let i = 1; i < pts.length; i++) {
      if (cum[i] >= s) {
        const u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u }
      }
    }
    return pts[pts.length - 1]
  }

  _slurpSteg(dtS) {
    this._v = Math.min(SLURP_MAX, this._v + SLURP_ACC * dtS)
    this._d += this._v * dtS
    const m = this.groda.mun()
    while (this._insekter.length && this._insekter[0].s - this._d <= 6) {
      const f = this._insekter.shift()
      if (f.ins.dod) continue
      f.ins.x = m.x
      f.ins.y = m.y
      this.pa.at?.(f.ins)
      if (!this._alive || this.lage !== 'slurp') return
    }
    for (const f of this._insekter) {
      const p = this._punkt(f.s - this._d)
      f.ins.x = m.x + p.x
      f.ins.y = m.y + p.y
    }
    if (this._d >= this._langd) {
      this.lage = 'klar'
      this.groda.oppnaMun(0)
      this.pa.klar?.()
    }
  }

  // Det synliga repet under slurpen: formens första (längd − d) px, fäst vid munnen.
  _synligt() {
    const m = this.groda.mun()
    const kvar = this._langd - this._d
    const ut = [{ x: m.x, y: m.y }]
    for (let i = 1; i < this._pts.length; i++) {
      if (this._cum[i] >= kvar) {
        const p = this._punkt(kvar)
        ut.push({ x: m.x + p.x, y: m.y + p.y })
        break
      }
      ut.push({ x: m.x + this._pts[i].x, y: m.y + this._pts[i].y })
    }
    return ut
  }

  _rivKedja() {
    const w = this._phys.world
    for (const c of this._saker.values()) Composite.remove(w, c)
    this._saker.clear()
    if (this._mun) Composite.remove(w, this._mun)
    this._mun = null
    for (const c of this._leder) Composite.remove(w, c)
    this._leder = []
    for (const b of this.lankar) {
      this._flyt?.ta(b)
      this._phys.removeBody(b)
    }
    this.lankar = []
  }

  rita(dtS) {
    if (!this._alive) return
    const g = this.g
    g.clear()
    if (this.lage === 'slurp') this._slurpSteg(dtS)
    let pts = null
    if (this.lage === 'fysik') {
      const m = this.groda.mun()
      pts = [m]
      for (const l of this.lankar) pts.push(l.position)
    } else if (this.lage === 'slurp') pts = this._synligt()
    if (!pts || pts.length < 2) return
    const vag = () => {
      g.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        g.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
      }
      const s = pts[pts.length - 1]
      g.lineTo(s.x, s.y)
    }
    vag()
    g.stroke({ width: 12, color: 0xa8324f, cap: 'round', join: 'round' })
    vag()
    g.stroke({ width: 9, color: 0xe0607e, cap: 'round', join: 'round' })
    vag()
    g.stroke({ width: 2.6, color: 0xf7b0c2, alpha: 0.75, cap: 'round', join: 'round' })
    // Den klibbiga spetsen, och klister där något fastnat.
    const t = pts[pts.length - 1]
    g.circle(t.x, t.y, 9.5).fill(0xe8708f).stroke({ width: 2.5, color: 0xa8324f })
    g.circle(t.x - 3.2, t.y - 3.2, 3).fill({ color: 0xffffff, alpha: 0.75 })
    for (const c of this._saker.values()) {
      const p = c.bodyA.position
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.4
        g.circle(p.x + Math.cos(a) * 11, p.y + Math.sin(a) * 11, 2.6).fill({ color: 0xf29ab0, alpha: 0.85 })
      }
    }
  }

  // Avbryt allt (grodan kallas hem, runda slut): insekterna flyger fria, sakerna faller.
  slapp() {
    for (const f of this._insekter) if (!f.ins.dod) this._svarm?.slapp(f.ins)
    this._insekter = []
    this._rivKedja()
    if (this.lage !== 'av') this.lage = 'klar'
    if (!this.g.destroyed) this.g.clear()
  }

  destroy() {
    if (!this._alive) return
    this.slapp()
    this._alive = false
    if (!this.g.destroyed) this.g.destroy()
  }
}
