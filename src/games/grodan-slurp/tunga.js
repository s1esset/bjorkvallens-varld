// Tungan (grodan-slurp) — skott, fäste, dragning, indragning och bild.
//
// Tillstånd:  av → ut → (fast | bar | in) → av
//   ut    spetsen flyger från munnen mot målet (36 px/steg). Varje steg provas sträckan
//         förra spetsen → nya spetsen mot insekter och mot klibbiga kroppar; det som ligger
//         NÄRMAST förra spetsen vinner. Vattnet stoppar tungan (plask, tillbaka).
//   fast  spetsen sitter på en kropp. En FJÄDER drar, och det är här ägarens idé bor:
//         "tyngre saker med mer massa så åker grodan mot det fortare". Spänningen verkar lika
//         på båda (Newtons tredje), så grodans acceleration är T/M och sakens T/m. Fast/tung
//         sak → grodan flyger dit. Lätt sak → saken kommer. Ingen specialkod per föremål.
//         Fjädern stäms mot den REDUCERADE massan μ = M·m/(M+m), så den relativa rörelsen
//         känns likadan oavsett vad tungan fastnat i — bara FÖRDELNINGEN ändras.
//   bar   en insekt sitter på spetsen och rullas in till munnen (onAt när den är framme).
//   in    tungan dras tillbaka tom (bom, släpp, vatten).
//
// Allt fysikaliskt körs i `steg()`, EN gång per fast fysiksteg (spelet kopplar den till
// phys.beforeStep). `rita()` är bara bild, per bildruta.
import { Graphics } from 'pixi.js'
import { Matter, STEG2 } from '../../lib/physics.js'

const { Body } = Matter

const UT_FART = 36 // px/steg
const IN_FART = 44
const BAR_FART = 24
const L_MIN = 64 // tungans kortaste vilolängd när den drar
const RULLA = 8 // hur fort vilolängden dras in (px/steg)
const K = 0.006 // relativ acceleration per px sträckning (px/steg²/px)
const C = 0.07 // dämpning längs tungan
const A_MAX = 2.1 // tak för den relativa accelerationen (px/steg²)
const MAX_FAST_STEG = 60 * 7 // släpper av sig själv efter 7 s

export const RACKVIDD = 420

export class Tunga {
  // hitta: { kropp(ax, ay, bx, by) → { body, x, y } | null, insekt(ax, ay, bx, by) → insekt | null }
  // pa:    { traffKropp(body, x, y), traffInsekt(insekt), at(insekt), bom(x, y), vatten(x, y), slappt() }
  constructor({ groda, lager, ytY = 560, hitta, pa }) {
    this.groda = groda
    this.ytY = ytY
    this.hitta = hitta
    this.pa = pa
    this.lage = 'av'
    this._alive = true
    this.g = new Graphics()
    this.g.eventMode = 'none'
    lager.addChild(this.g)
    this.spets = { x: 0, y: 0 }
    this._s = 0
    this._dir = { x: 1, y: 0 }
    this._sMax = RACKVIDD
    this.body = null
    this._lokal = { x: 0, y: 0 }
    this._L = 0
    this.insekt = null
    this._fastSteg = 0
  }

  get upptagen() {
    return this.lage === 'ut' || this.lage === 'bar'
  }

  get fast() {
    return this.lage === 'fast'
  }

  // Skjut mot (x, y). Räckvidden klipps; tungan går lite förbi målpunkten så ett tryck PÅ en
  // kant fastnar även om fingret landade precis innanför den.
  skjut(x, y) {
    if (!this._alive) return false
    if (this.lage === 'fast') this._lossa()
    const m = this.groda.mun()
    const dx = x - m.x
    const dy = y - m.y
    const d = Math.hypot(dx, dy) || 1
    this._dir = { x: dx / d, y: dy / d }
    this._sMax = Math.min(RACKVIDD, d + 46)
    this._s = 0
    this.spets = { x: m.x, y: m.y }
    this.lage = 'ut'
    this.insekt = null
    // Det munnen redan sitter inne i (vass grodan simmar bland) går tungan igenom —
    // annars fastnade varje skott direkt vid munnen.
    this._undanta = this.hitta.inuti ? this.hitta.inuti(m.x, m.y, x, y) : []
    this.groda.oppnaMun(1)
    return true
  }

  // Fäst tungan direkt i en kropp (humlan: en fångad insekt som blir en dragare).
  fastPa(body) {
    this.body = body
    this._lokal = { x: 0, y: 0 }
    const m = this.groda.mun()
    this._L = Math.hypot(body.position.x - m.x, body.position.y - m.y)
    this._fastSteg = 0
    this.insekt = null
    this.spets = { x: body.position.x, y: body.position.y }
    this.lage = 'fast'
  }

  slapp() {
    if (this.lage === 'fast') {
      this._lossa()
      this.lage = 'in'
      this.pa.slappt?.()
    }
  }

  // Avbryt allt direkt (respawn, runda slut).
  nollstall() {
    this._lossa()
    if (this.insekt) this.insekt = null
    this.lage = 'av'
    this.groda.oppnaMun(0)
    this.g.clear()
  }

  _lossa() {
    this.body = null
    this.groda.lage = this.groda.lage === 'dingla' ? 'luft' : this.groda.lage
  }

  _ankare() {
    const b = this.body
    const a = b.angle
    return {
      x: b.position.x + Math.cos(a) * this._lokal.x - Math.sin(a) * this._lokal.y,
      y: b.position.y + Math.sin(a) * this._lokal.x + Math.cos(a) * this._lokal.y,
    }
  }

  steg() {
    if (!this._alive || this.lage === 'av') return
    const m = this.groda.mun()
    if (this.lage === 'ut') {
      const fore = { x: this.spets.x, y: this.spets.y }
      this._s = Math.min(this._sMax, this._s + UT_FART)
      const ny = { x: m.x + this._dir.x * this._s, y: m.y + this._dir.y * this._s }
      // Insekter och kroppar längs sträckan — närmast förra spetsen vinner.
      const ins = this.hitta.insekt(fore.x, fore.y, ny.x, ny.y)
      const kr = this.hitta.kropp(fore.x, fore.y, ny.x, ny.y, this._undanta)
      const dIns = ins ? Math.hypot(ins.x - fore.x, ins.y - fore.y) : Infinity
      const dKr = kr ? Math.hypot(kr.x - fore.x, kr.y - fore.y) : Infinity
      if (ins && dIns <= dKr) {
        this.insekt = ins
        this.spets = { x: ins.x, y: ins.y }
        this.lage = 'bar'
        this.pa.traffInsekt(ins)
        return
      }
      if (kr) {
        this.body = kr.body
        const a = -kr.body.angle
        const rx = kr.x - kr.body.position.x
        const ry = kr.y - kr.body.position.y
        this._lokal = { x: Math.cos(a) * rx - Math.sin(a) * ry, y: Math.sin(a) * rx + Math.cos(a) * ry }
        this._L = Math.hypot(kr.x - m.x, kr.y - m.y)
        this._fastSteg = 0
        this.spets = { x: kr.x, y: kr.y }
        this.lage = 'fast'
        this.pa.traffKropp(kr.body, kr.x, kr.y)
        return
      }
      // Vattnet: tungan kan inte fastna i vatten — plask och tillbaka.
      if (ny.y > this.ytY + 10 && m.y < this.ytY) {
        this.spets = ny
        this.lage = 'in'
        this.pa.vatten(ny.x, this.ytY)
        return
      }
      this.spets = ny
      if (this._s >= this._sMax) {
        this.lage = 'in'
        this.pa.bom(ny.x, ny.y)
      }
      return
    }

    if (this.lage === 'fast') {
      const b = this.body
      if (!b || !b.position || !Number.isFinite(b.position.x)) {
        this.slapp()
        return
      }
      const A = this._ankare()
      this.spets = A
      const dx = A.x - m.x
      const dy = A.y - m.y
      const dist = Math.hypot(dx, dy) || 1
      const ux = dx / dist
      const uy = dy / dist
      this._L = Math.max(L_MIN, this._L - RULLA)
      const statisk = b.isStatic
      const hv = this.groda.b.huvud.velocity
      const tv = statisk ? { x: 0, y: 0 } : b.velocity
      const narmar = (hv.x - tv.x) * ux + (hv.y - tv.y) * uy
      const strack = dist - this._L
      let a = strack > 0 ? K * strack - C * narmar : 0
      a = Math.max(0, Math.min(A_MAX, a))
      if (a > 0) {
        const M = this.groda.massa
        const mm = statisk ? Infinity : b.mass
        const mu = statisk ? M : (M * mm) / (M + mm)
        const F = (mu * a) / STEG2
        this.groda.dra(ux * F, uy * F, 0.5)
        if (!statisk) Body.applyForce(b, A, { x: -ux * F, y: -uy * F })
      }
      this._fastSteg++
      // En LÄTT sak som dragits hela vägen fram släpps — den fortsätter på sin egen fart
      // (en kotte kan alltså komma farande och bonka grodan i huvudet).
      if (!statisk && !b.plugin?.hallFast && b.mass < this.groda.massa * 0.7 && dist < L_MIN + 26 && this._fastSteg > 8) this.slapp()
      else if (this._fastSteg > MAX_FAST_STEG) this.slapp()
      return
    }

    if (this.lage === 'bar') {
      const dx = this.spets.x - m.x
      const dy = this.spets.y - m.y
      const d = Math.hypot(dx, dy)
      const ny = Math.max(0, d - BAR_FART)
      if (ny < 16) {
        const ins = this.insekt
        this.insekt = null
        this.lage = 'av'
        this.groda.oppnaMun(0)
        this.pa.at(ins)
        return
      }
      this.spets = { x: m.x + (dx / (d || 1)) * ny, y: m.y + (dy / (d || 1)) * ny }
      if (this.insekt) {
        this.insekt.x = this.spets.x
        this.insekt.y = this.spets.y
      }
      return
    }

    if (this.lage === 'in') {
      const dx = this.spets.x - m.x
      const dy = this.spets.y - m.y
      const d = Math.hypot(dx, dy)
      const ny = d - IN_FART
      if (ny <= 0) {
        this.lage = 'av'
        this.groda.oppnaMun(0)
        return
      }
      this.spets = { x: m.x + (dx / (d || 1)) * ny, y: m.y + (dy / (d || 1)) * ny }
    }
  }

  // Tungans längd just nu (för ljud/bild).
  get langd() {
    const m = this.groda.mun()
    return Math.hypot(this.spets.x - m.x, this.spets.y - m.y)
  }

  rita() {
    if (!this._alive) return
    const g = this.g
    g.clear()
    if (this.lage === 'av') return
    const m = this.groda.mun()
    const t = this.spets
    const dx = t.x - m.x
    const dy = t.y - m.y
    const d = Math.hypot(dx, dy)
    if (d < 2) return
    const ux = dx / d
    const uy = dy / d
    // Häng: en slak tunga buktar nedåt, en spänd är nästan rak.
    let px = -uy
    let py = ux
    if (py < 0) {
      px = -px
      py = -py
    }
    let sag = 5
    if (this.lage === 'fast') sag = Math.max(3, (this._L - d) * 0.5 + 4)
    else if (this.lage === 'in') sag = 10
    sag = Math.min(sag, 60)
    const cx = (m.x + t.x) / 2 + px * sag
    const cy = (m.y + t.y) / 2 + py * sag
    const bredd = Math.max(7, 12 - d / 110)
    g.moveTo(m.x, m.y).quadraticCurveTo(cx, cy, t.x, t.y).stroke({ width: bredd + 3, color: 0xa8324f, cap: 'round' })
    g.moveTo(m.x, m.y).quadraticCurveTo(cx, cy, t.x, t.y).stroke({ width: bredd, color: 0xe0607e, cap: 'round' })
    g.moveTo(m.x - px * 2, m.y - py * 2).quadraticCurveTo(cx - px * 2.5, cy - py * 2.5, t.x - px * 2, t.y - py * 2)
      .stroke({ width: Math.max(2, bredd * 0.3), color: 0xf7b0c2, alpha: 0.8, cap: 'round' })
    // Den klibbiga spetsen.
    const r = this.lage === 'fast' ? 11 : 9
    g.circle(t.x, t.y, r).fill(0xe8708f).stroke({ width: 2.5, color: 0xa8324f })
    g.circle(t.x - r * 0.35, t.y - r * 0.35, r * 0.32).fill({ color: 0xffffff, alpha: 0.75 })
    if (this.lage === 'fast') {
      // Lite klister som sprätt runt fästet.
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.4
        g.circle(t.x + Math.cos(a) * 13, t.y + Math.sin(a) * 13, 2.6).fill({ color: 0xf29ab0, alpha: 0.85 })
      }
    }
  }

  destroy() {
    this._alive = false
    this.body = null
    this.insekt = null
    if (!this.g.destroyed) this.g.destroy()
  }
}
