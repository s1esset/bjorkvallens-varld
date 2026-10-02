// BLÄCKFISKEN OTTO — armarna. Åtta rep (lib/rep.js, 14 punkter vardera) som stegas med fast takt.
// En arm är TELESKOPISK: segmentlängden följer avståndet till målet (×1,1), så en arm som sträcker sig
// kort är rak och spänstig i stället för en hög av slack — och en arm i vila krymper ihop på botten.
import { Graphics } from 'pixi.js'
import { Rep } from '../../lib/rep.js'

export const ARM_N = 14
export const SEG_MAX = 40
export const SEG_MIN = 12
export const REACH = (ARM_N - 1) * SEG_MAX * 0.94 // längsta räckvidd (px) från armens rot

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Arm {
  constructor(i, golvY) {
    this.i = i
    this.sida = i < 4 ? -1 : 1
    const k = i < 4 ? 3 - i : i - 4 // 0 = innerst
    this.restDx = this.sida * (110 + k * 62)
    // vilolängd: sträckan ut till kullen + själva kullen
    this.restSeg = (Math.abs(this.restDx) + 120) / (ARM_N - 1)
    this.seg = this.restSeg
    this.segMal = this.restSeg
    this.golvY = golvY
    this.rep = new Rep({ n: ARM_N, seg: this.restSeg, grav: 0.45, damp: 0.93, iter: 6, maxSpeed: 40, golv: golvY - 6, golvFriktion: 0.8 })
    this.g = new Graphics()
    this.g.eventMode = 'none'
    this.fas = Math.random() * 6.28
    this.mode = 'vila' // vila · dra · natt · hall · bar · peka
    this.tryck = 0 // sugkoppens tryck 0..1 (ritas)
    this.rorelse = 0 // tillryggalagd spetsväg sedan starten (sugkoppen fastnar först efter ~80 px)
    this.pekT = 0
    this.pekMal = null
    this._sist = null
  }

  // Där armen sitter fast i Ottos kropp.
  rot(ox, oy) {
    return { x: ox + (this.i - 3.5) * 17, y: oy + 52 }
  }

  bygg(ox, oy) {
    const r = this.rot(ox, oy)
    this.seg = this.segMal = this.restSeg
    this.rep.seg = this.restSeg
    this.rep.bygg(r.x, r.y, () => (this.sida < 0 ? Math.PI - 0.35 : 0.35), 80)
    this._sist = null
  }

  get spets() {
    return this.rep.pts[this.rep.sista]
  }

  // Spetsens vilomål: ligger på botten med en lätt vaggning och ibland en liten ringling uppåt.
  vilaMal(ox, tid) {
    const s = Math.sin(tid * 0.6 + this.fas)
    return {
      x: ox + this.restDx + Math.sin(tid * 0.9 + this.fas * 1.7) * 14,
      y: this.golvY - 12 - 54 * Math.max(0, s) * Math.max(0, s),
    }
  }

  // VILA: armen ligger på botten och rullar ihop spetsen i en spiral uppåt (de sista sex punkterna dras
  // mot en spiral runt en kulle). Andas lite långsamt, så Otto ser ut att vila — inte som en linjal.
  krulla(ox, tid) {
    const rep = this.rep
    const rmax = clamp(this.seg * 2.6, 30, 54)
    const cx = ox + this.restDx + Math.sin(tid * 0.8 + this.fas) * 8
    const cy = this.golvY - rmax - 8 - Math.max(0, Math.sin(tid * 0.6 + this.fas * 1.3)) * 14
    const ang0 = (this.sida > 0 ? Math.PI : 0) + this.sida * Math.sin(tid * 0.5 + this.fas) * 0.25
    for (let e = 0; e <= 5; e++) {
      const idx = rep.sista - e
      const a = ang0 + this.sida * (5 - e) * 0.95
      const r = (rmax * (e + 0.6)) / 5.6
      rep.dra(idx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.12, 8)
    }
  }

  // Ett steg per bildruta. `mal` = spetsens mål (eller null), `k` = hur hårt spetsen dras dit.
  steg(ox, oy, dtMs, mal, k) {
    const r = this.rot(ox, oy)
    const rep = this.rep
    rep.fast(0, r.x, r.y)
    this.seg += clamp(this.segMal - this.seg, -3.2, 3.2)
    rep.seg = this.seg
    if (mal) rep.dra(rep.sista, mal.x, mal.y, k, 34)
    rep.uppdatera(dtMs)
    const t = this.spets
    if (this._sist) this.rorelse += Math.hypot(t.x - this._sist.x, t.y - this._sist.y)
    else this._sist = { x: t.x, y: t.y }
    this._sist.x = t.x
    this._sist.y = t.y
  }

  // Segmentlängd som ger ~10 % slack mot avståndet dit armen ska.
  langdMotAvstand(ox, oy, mx, my) {
    const r = this.rot(ox, oy)
    const d = Math.hypot(mx - r.x, my - r.y)
    this.segMal = clamp((d * 1.1) / (ARM_N - 1), SEG_MIN, SEG_MAX)
  }

  vilaLangd() {
    this.segMal = this.restSeg
  }

  // Klipp ett mål till räckvidden sett från armens rot.
  klipp(ox, oy, mx, my) {
    const r = this.rot(ox, oy)
    const dx = mx - r.x
    const dy = my - r.y
    const d = Math.hypot(dx, dy)
    const max = REACH * 0.96
    if (d <= max || d === 0) return { x: mx, y: my }
    return { x: r.x + (dx / d) * max, y: r.y + (dy / d) * max }
  }

  nollstall() {
    this.mode = 'vila'
    this.sak = null
    this.tryck = 0
    this.pekT = 0
    this.pekMal = null
    this.rorelse = 0
  }

  destroy() {
    this.rep.destroy()
    if (this.g && !this.g.destroyed) this.g.destroy()
  }
}
