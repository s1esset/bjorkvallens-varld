// Vindbyns BILD: en ljus luftremsa tvärs över kägeldäcket, svepande bågar och snabba streck som blåser
// ÅT samma håll som käglorna knuffas. Allt styrs av `vind.faktor` — samma tal som fysiken använder —
// så bilden är som starkast när luften är det (en by som sväller, toppar och lägger sig). Ingen gsap,
// inga timers: allt ritas i `uppdatera` (tickern), och en container äger allt som `destroy()` river.
import { Container, Graphics } from 'pixi.js'
import { BANDKANT_X, BANDKANT_X2, BAND_RACKVIDD } from './vindby.js'

const ANTAL_STRECK = 11

export class Vindbild {
  constructor(parent) {
    this._alive = true
    this._t = 0
    this.rot = new Container()
    this.rot.eventMode = 'none'
    this.rot.interactiveChildren = false
    this.rot.visible = false
    parent.addChild(this.rot)
    this._remsa = new Graphics()
    this._bagar = new Graphics()
    this._streck = new Graphics()
    this.rot.addChild(this._remsa, this._bagar, this._streck)
    // Streckens fasta personlighet: rad, längd, fart, fas — inga slumptal per bildruta.
    this._s = []
    for (let i = 0; i < ANTAL_STRECK; i++) {
      this._s.push({
        rad: (((i * 7 + 3) % ANTAL_STRECK) / (ANTAL_STRECK - 1)) * 1.7 - 0.85,
        len: 54 + ((i * 41) % 9) * 9,
        fart: 0.85 + ((i * 29) % 7) / 10,
        fas: i / ANTAL_STRECK,
        bred: 4 + (i % 3) * 1.5,
      })
    }
  }

  get synlig() {
    return !this.rot.destroyed && this.rot.visible
  }

  // dt i sekunder. `vind` = byns Vindfalt (form, riktning och faktor läses ur den).
  uppdatera(dt, vind) {
    if (!this._alive || this.rot.destroyed) return
    const f = vind ? Math.min(1.3, vind.faktor) : 0
    if (f < 0.015) {
      if (this.rot.visible) {
        this.rot.visible = false
        this._remsa.clear()
        this._bagar.clear()
        this._streck.clear()
      }
      return
    }
    this._t += dt
    this.rot.visible = true
    const fm = vind.form
    const dir = vind.luft.x < 0 ? -1 : 1
    const kalla = dir < 0 ? BANDKANT_X2 : BANDKANT_X
    const halv = fm.halvhojd
    const y = fm.y
    const a = Math.min(1, f)

    // Luftremsan: tre mjuka lager (ingen gradient) — vit-blå, tätast vid byns topp.
    const r = this._remsa.clear()
    for (const [pad, al] of [[0, 0.1], [-26, 0.11], [-52, 0.13]]) {
      const hh = halv + pad
      if (hh < 24) continue
      r.rect(BANDKANT_X, y - hh, BANDKANT_X2 - BANDKANT_X, hh * 2).fill({ color: 0xdff6ff, alpha: al * a * 1.1 }) // inom banan, ingen ruta över rännorna
    }

    // Bågar som vandrar utåt från källan (Vindfalt.rita): strömmens form, åt rätt håll.
    const b = this._bagar.clear()
    vind.rita(b, { t: this._t, antal: 4, fran: 30, till: BAND_RACKVIDD - 30, bag: 46, hojd0: 0.3, hojd1: 0.62, farg: 0xffffff, bredd: 9, alpha: 0.9, takt: 0.7 })
    this._bagar.alpha = a

    // Streck som blåser längs bandet, snabbare ju starkare byn är — med en liten krok i spetsen.
    const g = this._streck.clear()
    for (const s of this._s) {
      const p = (this._t * 0.85 * s.fart * (0.5 + 0.5 * a) + s.fas) % 1
      const x = kalla + dir * p * BAND_RACKVIDD
      const yy = y + s.rad * halv * 0.86
      const al = a * 0.85 * Math.min(1, p * 6) * Math.min(1, (1 - p) * 5)
      if (al < 0.02) continue
      g.moveTo(x - dir * s.len, yy)
        .lineTo(x, yy)
        .quadraticCurveTo(x + dir * 14, yy, x + dir * 10, yy + 12)
        .stroke({ width: s.bred, color: 0xffffff, alpha: al, cap: 'round', join: 'round' })
    }
  }

  destroy() {
    this._alive = false
    if (this.rot && !this.rot.destroyed) this.rot.destroy({ children: true })
  }
}
