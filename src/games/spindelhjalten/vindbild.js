// Vindbandets BILD: luften ritas som en ljus remsa på himlen, streck som blåser längs den och löv som
// virvlar med — ett barn ska se var vinden finns och åt vilket håll den går. Fysiken (Vindfalt) bor i
// vindband.js; här finns bara Pixi. Allt ägs av en container som rivs i `destroy()`; inga tweens, så
// inget kan överleva en rivning (löven rör sig i `uppdatera`, som tickern driver).
import { Container, Graphics } from 'pixi.js'
import { BAND_X0, BAND_X1, BAND_LANGD } from './vindband.js'

const LOV_FARGER = [0x7cc36b, 0x9fd45a, 0xe8b44c, 0xd9803f, 0x5fb36a]
const ANTAL_LOV = 9

// Ett löv med egen silhuett: spetsigt ovalt blad, ett skaft och ett nerv-streck. Mittpunkt i origo.
function ritaLov(farg) {
  const c = new Container()
  const blad = new Graphics()
    .moveTo(-17, 0)
    .quadraticCurveTo(-2, -15, 19, -1)
    .quadraticCurveTo(0, 14, -17, 0)
    .fill(farg)
    .stroke({ width: 2, color: 0x2f6b3a, alpha: 0.45 })
  const nerv = new Graphics().moveTo(-20, 1).lineTo(14, -1).stroke({ width: 2, color: 0x2f6b3a, alpha: 0.55, cap: 'round' })
  c.addChild(blad, nerv)
  c.eventMode = 'none'
  return c
}

export class Vindbild {
  constructor(parent) {
    this._alive = true
    this._t = 0
    this._dir = 0
    this._y = 300
    this._halv = 118
    this._luft = 30
    this._visa = 0 // 0..1 — tonar in/ut när knappen växlar
    this.rot = new Container()
    this.rot.eventMode = 'none'
    this.rot.interactiveChildren = false
    this.rot.visible = false
    parent.addChild(this.rot)

    this._remsa = new Graphics()
    this._streck = new Graphics()
    this.rot.addChild(this._remsa, this._streck)

    this._lov = []
    for (let i = 0; i < ANTAL_LOV; i++) {
      const v = ritaLov(LOV_FARGER[i % LOV_FARGER.length])
      const s = 0.8 + ((i * 37) % 10) / 20 // 0,8 … 1,25 — olika stora
      v.scale.set(s)
      this.rot.addChild(v)
      this._lov.push({ v, s, p: i / ANTAL_LOV, rad: (((i * 53) % 17) / 17) * 1.5 - 0.75, fas: i * 1.7, fart: 0.8 + ((i * 29) % 7) / 14 })
    }
  }

  // Ställ bandet (riktning −1/0/1, höjd, halvhöjd, luftens fart). Ritar remsan om.
  stall({ dir, y, halv, luft }) {
    if (!this._alive) return
    // Höger → vänster direkt: löven skulle hoppa till andra sidan — tona in bandet på nytt i stället.
    if (dir !== 0 && this._dir !== 0 && dir !== this._dir) this._visa = 0
    this._dir = dir
    if (y != null) this._y = y
    if (halv != null) this._halv = halv
    if (luft != null) this._luft = luft
    this._ritaRemsa()
  }

  // Remsan: tre lager med minskande alfa ger mjuka kanter utan gradient. Vänd åt det håll vinden blåser (tätare vid källan).
  _ritaRemsa() {
    const g = this._remsa
    if (g.destroyed) return
    g.clear()
    const h = this._halv
    for (const [pad, al] of [[0, 0.1], [-20, 0.1], [-44, 0.12]]) {
      const hh = h + pad
      if (hh < 30) continue
      g.roundRect(BAND_X0 - 20 - pad * 0.3, this._y - hh, BAND_LANGD + 40 + pad * 0.6, hh * 2, hh).fill({ color: 0xbff3f5, alpha: al * 1.6 })
    }
  }

  // dt i sekunder. `vind` = Vindfalt (rita-bågarna läser dess form). `view` = ctx.view (löven vandrar inom bandet).
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
    // streck: Vindfalt.rita ritar bågar som vandrar längs strömmen och tonar bort
    this._streck.clear()
    if (vind) vind.rita(this._streck, { t: this._t, antal: 4, fran: 60, till: BAND_LANGD - 40, bag: 34, hojd0: 0.18, hojd1: 0.5, farg: 0xffffff, bredd: 7, alpha: 0.85, takt: 0.34 })
    // löv: virvlar framåt, guppar, tumlar — tätare mot källan, tonar bort mot slutet
    const fartPx = 230 + this._luft * 3.2
    for (const l of this._lov) {
      l.p += (dt * fartPx * l.fart) / BAND_LANGD
      if (l.p >= 1) l.p -= 1
      const x = kalla + d * l.p * BAND_LANGD
      const y = this._y + l.rad * this._halv * 0.78 + Math.sin(this._t * 2.1 + l.fas) * 17
      l.v.position.set(x, y)
      l.v.rotation = d * 0.15 + Math.sin(this._t * 3.1 + l.fas) * 0.95
      const sy = Math.cos(this._t * 4.3 + l.fas) // vänder bladet — ser ut som en tumlande lövyta
      l.v.scale.set(l.s * d, l.s * (0.55 + 0.45 * Math.abs(sy)))
      l.v.alpha = Math.min(1, l.p * 7) * Math.min(1, (1 - l.p) * 4)
    }
  }

  destroy() {
    this._alive = false
    this._lov = []
    if (this.rot && !this.rot.destroyed) this.rot.destroy({ children: true })
  }
}
