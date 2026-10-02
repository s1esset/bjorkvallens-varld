// SKIKTENS BILD — var luften har vilket håll. Varje skikt (vindskikt.js) ritas som en ljus remsa tvärs över
// himlen med vita luftdrag som blåser ÅT skiktets håll, tätare och snabbare ju starkare det blåser; ett
// lugnt skikt får bara sin svaga remsa. Det är samma tal som fysiken läser (`falt.luft.x · falt.styrka`),
// så bilden sväller och lägger sig tillsammans med byn. Ingen gsap och inga timers: allt ritas i
// `uppdatera` (spelets ticker), en container äger allt och rivs i `destroy()`.
import { Container, Graphics } from 'pixi.js'
import { SKIKT_Y, ANTAL_SKIKT } from './vindskikt.js'

const X0 = -260 // bredare än luftrummet: en bred telefon ska också se vinden
const X1 = 1540
const BRED = X1 - X0
const DRAG_PER_SKIKT = 6

export class Skiktbild {
  constructor(parent) {
    this._alive = true
    this._t = 0
    this.rot = new Container()
    this.rot.eventMode = 'none'
    this.rot.interactiveChildren = false
    parent.addChild(this.rot)
    this._remsor = new Graphics()
    this._drag = new Graphics()
    this.rot.addChild(this._remsor, this._drag)
    // Dragens fasta personlighet (rad, längd, fart, fas): inga slumptal per bildruta.
    this._d = []
    for (let l = 0; l < ANTAL_SKIKT; l++) {
      for (let i = 0; i < DRAG_PER_SKIKT; i++) {
        const k = l * DRAG_PER_SKIKT + i
        this._d.push({
          l,
          rad: (((k * 7 + 2) % DRAG_PER_SKIKT) / (DRAG_PER_SKIKT - 1)) * 1.5 - 0.75,
          len: 70 + ((k * 37) % 8) * 12,
          fart: 0.8 + ((k * 23) % 7) / 12,
          fas: (i + 0.37 * l) / DRAG_PER_SKIKT,
          bred: 4 + (k % 3) * 1.4,
        })
      }
    }
  }

  // dt i sekunder. `sk` = skiktet (vindskikt.js). `nu` = vilket skikt fallskärmen är i (-1 = inget): det får en
  // lite tydligare remsa, så barnet ser VILKEN luft det flyger i.
  uppdatera(dt, sk, nu = -1) {
    if (!this._alive || this.rot.destroyed || !sk) return
    this._t += dt
    const r = this._remsor.clear()
    const g = this._drag.clear()
    for (let l = 0; l < ANTAL_SKIKT; l++) {
      const f = sk.falt[l]
      const v = f.luft.x * f.styrka // px/bildruta, tecknet = håll
      const a = Math.min(1, Math.abs(v) / 3)
      const c = SKIKT_Y[l]
      r.roundRect(X0, c - 46, BRED, 92, 46).fill({ color: 0xffffff, alpha: 0.05 + 0.07 * a + (l === nu ? 0.05 : 0) })
    }
    for (const d of this._d) {
      const f = sk.falt[d.l]
      const v = f.luft.x * f.styrka
      const a = Math.min(1, Math.abs(v) / 3)
      if (a < 0.1) continue
      const dir = v < 0 ? -1 : 1
      const kalla = dir > 0 ? X0 : X1
      const p = (this._t * d.fart * (0.045 + 0.05 * Math.abs(v)) + d.fas) % 1
      const x = kalla + dir * p * BRED
      const y = SKIKT_Y[d.l] + d.rad * 34
      const al = (0.35 + 0.5 * a) * Math.min(1, p * 8) * Math.min(1, (1 - p) * 8)
      g.moveTo(x - dir * d.len, y)
        .lineTo(x, y)
        .quadraticCurveTo(x + dir * 16, y, x + dir * 11, y + 13)
        .stroke({ width: d.bred, color: 0xffffff, alpha: al, cap: 'round', join: 'round' })
    }
  }

  destroy() {
    this._alive = false
    if (this.rot && !this.rot.destroyed) this.rot.destroy({ children: true })
  }
}
