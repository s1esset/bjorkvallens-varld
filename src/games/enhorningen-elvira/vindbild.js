// Elviras vindbild: luften SYNS som en lätt strömmande dis, streck som blåser längs den och pastellblommor
// som virvlar med (regnbågens egna färger) — barnet ser både att det blåser och åt vilket håll. Fysiken
// (Vindfalt) bor i vindband.js; här finns bara Pixi. Allt ägs av en container som rivs i `destroy()`;
// inga tweens — blommorna rör sig i `uppdatera`, som tickern driver, så inget kan överleva en rivning.
import { Container, Graphics } from 'pixi.js'
import { BAND_X0, BAND_X1, BAND_LANGD } from './vindband.js'

const BLOMFARGER = [0xff8fb8, 0xb487ff, 0xffe14d, 0x7fdc9a, 0x7fc4ff]
const ANTAL_BLOMMOR = 11

// En blomma med egen silhuett: fem rundade kronblad runt en gul mitt. Mittpunkt i origo.
function ritaBlomma(farg) {
  const g = new Graphics()
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2
    g.circle(Math.cos(a) * 9, Math.sin(a) * 9, 7).fill(farg)
  }
  g.circle(0, 0, 5.5).fill(0xfff2a8)
  g.circle(0, 0, 5.5).stroke({ width: 1.5, color: 0xd9a441, alpha: 0.5 })
  g.eventMode = 'none'
  return g
}

export class Vindbild {
  constructor(parent) {
    this._alive = true
    this._t = 0
    this._dir = 0
    this._y = 330
    this._halv = 215
    this._luft = 10.5
    this._visa = 0 // 0..1 — tonar in/ut när knappen växlar
    this.rot = new Container()
    this.rot.eventMode = 'none'
    this.rot.interactiveChildren = false
    this.rot.visible = false
    parent.addChild(this.rot)

    this._dis = new Graphics()
    this._streck = new Graphics()
    this.rot.addChild(this._dis, this._streck)

    this._blommor = []
    for (let i = 0; i < ANTAL_BLOMMOR; i++) {
      const v = ritaBlomma(BLOMFARGER[i % BLOMFARGER.length])
      const s = 0.75 + ((i * 41) % 10) / 22 // 0,75 … 1,2 — olika stora
      v.scale.set(s)
      this.rot.addChild(v)
      this._blommor.push({ v, s, p: i / ANTAL_BLOMMOR, rad: (((i * 59) % 19) / 19) * 1.7 - 0.85, fas: i * 1.9, fart: 0.75 + ((i * 31) % 7) / 14 })
    }
  }

  // Ställ bandet (riktning −1/0/1, höjd, halvhöjd, luftens fart). Ritar disen om.
  stall({ dir, y, halv, luft }) {
    if (!this._alive) return
    // Höger → vänster direkt: blommorna skulle hoppa till andra sidan — tona in bandet på nytt i stället.
    if (dir !== 0 && this._dir !== 0 && dir !== this._dir) this._visa = 0
    this._dir = dir
    if (y != null) this._y = y
    if (halv != null) this._halv = halv
    if (luft != null) this._luft = luft
    this._ritaDis()
  }

  // Disen: tre ellipser med minskande höjd ger mjuka kanter utan gradient (rundade rektanglar lästes som en
  // panel bakom scenen). Svag — scenen är redan pastell; blommorna och strecken bär vinden.
  _ritaDis() {
    const g = this._dis
    if (g.destroyed) return
    g.clear()
    const h = this._halv
    for (const [pad, al] of [[0, 0.07], [-46, 0.07], [-96, 0.08]]) {
      const hh = h + pad
      if (hh < 30) continue
      g.ellipse(BAND_X0 + BAND_LANGD / 2, this._y, BAND_LANGD / 2 + 10 + pad, hh).fill({ color: 0x9fd0ff, alpha: al })
    }
  }

  // dt i sekunder. `vind` = Vindfalt (rita-bågarna läser dess form).
  uppdatera(dt, vind) {
    if (!this._alive || this.rot.destroyed) return
    this._t += dt
    const mal = this._dir !== 0 ? 1 : 0
    this._visa += (mal - this._visa) * Math.min(1, dt * 6)
    if (Math.abs(mal - this._visa) < 0.01) this._visa = mal
    this.rot.visible = this._visa > 0.01
    if (!this.rot.visible) return
    this.rot.alpha = this._visa
    const d = this._dir || 1
    const kalla = d > 0 ? BAND_X0 : BAND_X1
    // streck: Vindfalt.rita ritar bågar som vandrar längs strömmen och tonar bort. Blå-lila — vit försvinner i pastellen.
    this._streck.clear()
    if (vind) vind.rita(this._streck, { t: this._t, antal: 4, fran: 70, till: BAND_LANGD - 60, bag: 44, hojd0: 0.16, hojd1: 0.42, farg: 0x7a9cf0, bredd: 8, alpha: 0.6, takt: 0.3 })
    // blommor: virvlar framåt, guppar, snurrar — tonar in vid källan och bort mot slutet
    const fartPx = 210 + this._luft * 9
    for (const b of this._blommor) {
      b.p += (dt * fartPx * b.fart) / BAND_LANGD
      if (b.p >= 1) b.p -= 1
      b.v.position.set(kalla + d * b.p * BAND_LANGD, this._y + b.rad * this._halv * 0.8 + Math.sin(this._t * 1.8 + b.fas) * 20)
      b.v.rotation = d * this._t * 2.2 * b.fart + b.fas
      b.v.scale.set(b.s * (0.9 + 0.1 * Math.sin(this._t * 5 + b.fas)))
      b.v.alpha = Math.min(1, b.p * 7) * Math.min(1, (1 - b.p) * 4) * 0.95
    }
  }

  destroy() {
    this._alive = false
    this._blommor = []
    if (this.rot && !this.rot.destroyed) this.rot.destroy({ children: true })
  }
}
