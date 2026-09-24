// Motgången i dammen (grodan-slurp) — EN åt gången, och alltid med en tydlig orsak.
//
//   kotte       faller från trädkronan. Lätt (≈ 1/11 av grodan): träffar den grodan tumlar
//               grodan, och fastnar tungan i den kommer den farande TILL grodan (bonk).
//   skoldpadda  simmar längs ytan med ett hårt skal (studsar). Tungan i skalet → grodan
//               bogseras över dammen: vattenskidor.
//   fisk        hoppar i en båge ur vattnet. Den som står i vägen får en knuff.
//   vind        en pust i sidled: insekterna blåser, en flygande groda driver.
//   anka        sällsynt. Simmar förbi som sköldpaddan, större — samma vattenskidor.
//
// Sköldpaddan, fisken och ankan är KINEMATISKA: statiska kroppar som flyttas varje fysiksteg
// med `setPosition(…, true)`, så att deras fart är just förflyttningen per steg (då knuffar de
// rätt när de krockar). Kotten är en vanlig dynamisk kropp som flyter.
import { Container, Graphics } from 'pixi.js'
import { Matter, mat } from '../../lib/physics.js'
import { sphereFill } from '../../lib/form.js'

const { Body } = Matter

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)

function ritaKotte(g) {
  g.clear()
  g.ellipse(0, 0, 13, 19).fill(sphereFill(0x8a5a32, { lightX: 0.35, lightY: 0.3, dark: 0.4 })).stroke({ width: 2, color: 0x4a2c14 })
  // Fjällen: små överlappande bågar i rader.
  for (let rad = -3; rad <= 3; rad++) {
    const y = rad * 5.2
    const bredd = 12 * Math.sqrt(Math.max(0.1, 1 - (y / 19) ** 2))
    for (let x = -bredd + 4; x <= bredd - 3; x += 7) {
      const xx = x + (rad % 2 ? 3.5 : 0)
      g.moveTo(xx - 4, y - 1).quadraticCurveTo(xx, y + 4, xx + 4, y - 1).stroke({ width: 1.8, color: 0x5a3519, alpha: 0.85 })
    }
  }
  g.moveTo(0, -19).lineTo(1, -25).stroke({ width: 2.5, color: 0x6b4423, cap: 'round' })
}

// Snöbollen (isbiomen): kottens kropp och bana, men en vit boll med blå skugga och glitter.
function ritaSnoboll(g) {
  g.clear()
  g.circle(0, 0, 16).fill(sphereFill(0xf6fbff, { lightX: 0.35, lightY: 0.3, dark: 0.22 })).stroke({ width: 2, color: 0xa9c6dc })
  for (const [x, y, r] of [[-5, -6, 3], [6, 2, 2.4], [-2, 7, 2]]) g.circle(x, y, r).fill({ color: 0xdbe9f5, alpha: 0.9 })
  g.circle(-6, -8, 2.2).fill({ color: 0xffffff, alpha: 0.95 })
}

function ritaSkoldpadda(c) {
  // Huvud och fenor bakom skalet, skalet överst.
  const kropp = new Graphics()
  kropp.ellipse(80, 2, 20, 14).fill(0x7fb069).stroke({ width: 2.5, color: 0x3f6b35 })
  kropp.circle(90, -3, 3.4).fill(0x1c1c1c)
  kropp.circle(89, -4.2, 1.2).fill(0xffffff)
  kropp.moveTo(88, 8).quadraticCurveTo(94, 11, 99, 7).stroke({ width: 2, color: 0x3f6b35, cap: 'round' })
  const fenaF = new Graphics().ellipse(0, 0, 20, 8).fill(0x7fb069).stroke({ width: 2, color: 0x3f6b35 })
  fenaF.position.set(46, 18)
  const fenaB = new Graphics().ellipse(0, 0, 16, 7).fill(0x6fa05b).stroke({ width: 2, color: 0x3f6b35 })
  fenaB.position.set(-50, 16)
  const skal = new Graphics()
  skal.moveTo(-74, 12).bezierCurveTo(-70, -34, 70, -34, 74, 12).closePath()
    .fill(sphereFill(0x5d8a3a, { lightX: 0.45, lightY: 0.2, dark: 0.35 })).stroke({ width: 3, color: 0x2f4d1e })
  for (const [x, y, r] of [[-38, -6, 15], [0, -14, 17], [38, -6, 15]]) {
    const pts = []
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 6
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7)
    }
    skal.poly(pts).fill({ color: 0x7ba64d, alpha: 0.8 }).stroke({ width: 2, color: 0x3a5c24, alpha: 0.9 })
  }
  skal.moveTo(-74, 12).lineTo(74, 12).stroke({ width: 5, color: 0xc9b26b })
  c.addChild(fenaB, kropp, fenaF, skal)
  return { fenaF, fenaB }
}

function ritaAnka(c) {
  const kropp = new Graphics()
  kropp.moveTo(-70, 0).bezierCurveTo(-80, -30, -40, -40, 0, -32).bezierCurveTo(40, -30, 62, -14, 60, 4)
    .bezierCurveTo(40, 22, -40, 22, -70, 0).closePath()
    .fill(sphereFill(0xf5f1e6, { lightX: 0.4, lightY: 0.25, dark: 0.22 })).stroke({ width: 3, color: 0x9a9384 })
  kropp.moveTo(-70, 0).lineTo(-86, -14).lineTo(-66, -12).closePath().fill(0xf5f1e6).stroke({ width: 2.5, color: 0x9a9384 })
  kropp.moveTo(-30, -18).bezierCurveTo(-6, -30, 22, -24, 30, -12).stroke({ width: 3, color: 0xcfc8b6, cap: 'round' })
  const huvud = new Container()
  const hg = new Graphics()
  hg.moveTo(40, -24).lineTo(46, -52).stroke({ width: 18, color: 0xf5f1e6, cap: 'round' })
  hg.circle(50, -60, 19).fill(sphereFill(0x2f8a4e, { lightX: 0.4, lightY: 0.3, dark: 0.3 })).stroke({ width: 2.5, color: 0x1e5a33 })
  hg.moveTo(40, -40).lineTo(52, -40).stroke({ width: 6, color: 0xffffff, cap: 'round' })
  hg.moveTo(64, -62).quadraticCurveTo(84, -60, 86, -52).quadraticCurveTo(76, -50, 64, -53).closePath().fill(0xf2a93b).stroke({ width: 2, color: 0xb87418 })
  hg.circle(56, -66, 3.6).fill(0x151515)
  hg.circle(55, -67.4, 1.3).fill(0xffffff)
  huvud.addChild(hg)
  c.addChild(kropp, huvud)
  return { huvud }
}

function ritaFisk(c) {
  const g = new Graphics()
  g.moveTo(-34, 0).lineTo(-52, -16).lineTo(-48, 0).lineTo(-52, 16).closePath().fill(0xf08a3c).stroke({ width: 2, color: 0xa4521a })
  g.ellipse(0, 0, 38, 17).fill(sphereFill(0xf29a4a, { lightX: 0.4, lightY: 0.25, dark: 0.35 })).stroke({ width: 2.5, color: 0xa4521a })
  g.moveTo(-6, -16).quadraticCurveTo(4, -28, 16, -15).stroke({ width: 3, color: 0xd9722a, cap: 'round' })
  for (const x of [-14, -2, 10]) g.moveTo(x, -12).quadraticCurveTo(x + 5, 0, x, 12).stroke({ width: 1.6, color: 0xc86424, alpha: 0.7 })
  g.circle(24, -4, 5.5).fill(0xffffff).stroke({ width: 1.5, color: 0x6b3310 })
  g.circle(25.5, -4, 3).fill(0x151515)
  g.moveTo(34, 5).quadraticCurveTo(30, 9, 26, 7).stroke({ width: 2, color: 0x6b3310, cap: 'round' })
  c.addChild(g)
}

export class Hinder {
  // lager: { bakom, fram } · dammen: Dammen (för ytY, plask och flytvolym)
  // pa: { borta(body) } — spelet släpper tungan om den satt i något som försvinner
  // vy: () => synlig världsyta (L4-kameran) — hindren kommer in där barnet TITTAR, inte i en
  // fast skärmruta. Utan vy gäller skärmen 0–1280 som förut.
  constructor({ phys, lager, dammen, ytY = 560, pa = {}, vy = null }) {
    this._vyFn = vy
    this._phys = phys
    this._lager = lager
    this._dammen = dammen
    this.ytY = ytY
    this.pa = pa
    this.aktiv = null
    this._alive = true
    this._vind = 0
    this._lov = []
  }

  _vy() {
    const v = this._vyFn?.()
    return v && Number.isFinite(v.left) ? v : { left: 0, right: 1280, top: 0, bottom: 720 }
  }

  get _vw() {
    return this._dammen?.VW || 1280
  }

  kroppar() {
    return this.aktiv?.body ? [this.aktiv.body] : []
  }

  ar(body) {
    return !!this.aktiv && this.aktiv.body === body
  }

  // Starta en händelse. grodX = var grodan är (kotten siktar ibland nära henne).
  starta(typ, grodX = 640) {
    if (!this._alive || this.aktiv) return null
    const view = new Container()
    view.eventMode = 'none'
    let h = null
    const v = this._vy()
    if (typ === 'kotte' || typ === 'snoboll') {
      // (Snöbollen har kottens etikett — samma smäll, samma regler i index.js.)
      const x = Math.random() < 0.55 ? grodX + rnd(-110, 110) : rnd(v.left + 240, v.right - 240)
      const body = this._phys.circle(Math.max(160, Math.min(this._vw - 160, x)), v.top - 30, 15, { ...mat('tra'), density: 0.0022, frictionAir: 0.012, restitution: 0.35, label: 'kotte' })
      Body.setAngularVelocity(body, rnd(-0.08, 0.08))
      const g = new Graphics()
      if (typ === 'snoboll') ritaSnoboll(g)
      else ritaKotte(g)
      view.addChild(g)
      this._lager.bakom.addChild(view)
      this._phys.link(body, view)
      this._dammen.flytvolym.lagg(body, { flyt: 1.7 })
      h = { typ: 'kotte', variant: typ, body, view, tid: 0, liv: 60 * 12 }
    } else if (typ === 'skoldpadda' || typ === 'anka') {
      const fran = Math.random() < 0.5 ? -1 : 1
      const x0 = fran < 0 ? v.left - 140 : v.right + 140
      const anka = typ === 'anka'
      const y = this.ytY + (anka ? -6 : 6)
      const body = anka
        ? this._phys.rectangle(x0, y, 150, 44, { isStatic: true, studs: 0.5, chamfer: { radius: 20 }, label: 'anka' })
        : this._phys.rectangle(x0, y, 150, 40, { isStatic: true, studs: 0.7, chamfer: { radius: 18 }, ...mat('sten'), label: 'skoldpadda' })
      const inner = new Container()
      const delar = anka ? ritaAnka(inner) : ritaSkoldpadda(inner)
      inner.scale.x = -fran // tittar åt det håll den simmar
      view.addChild(inner)
      this._lager.bakom.addChild(view)
      h = { typ, body, view, inner, delar, tid: 0, dir: -fran, fart: anka ? 1.5 : 1.9, x: x0, y0: y }
    } else if (typ === 'fisk') {
      const x0 = Math.max(300, Math.min(this._vw - 300, grodX + rnd(-340, 340)))
      const dir = Math.random() < 0.5 ? -1 : 1
      const body = this._phys.rectangle(x0, this.ytY + 40, 76, 32, { isStatic: true, studs: 0.5, chamfer: { radius: 14 }, label: 'fisk' })
      const inner = new Container()
      ritaFisk(inner)
      inner.scale.x = dir
      view.addChild(inner)
      this._lager.bakom.addChild(view)
      h = { typ, body, view, inner, tid: 0, x0, dir, bredd: rnd(200, 300), hojd: rnd(170, 250), steg: 84, plaskat: false }
    } else if (typ === 'vind') {
      const dir = Math.random() < 0.5 ? -1 : 1
      h = { typ, body: null, view, tid: 0, dir, liv: 60 * 2.6 }
      this._lager.fram.addChild(view)
      // Löv som blåser över bilden — bara bild.
      for (let i = 0; i < 9; i++) {
        const l = new Graphics()
        const f = [0x7dbf4f, 0xe0a33a, 0xc8662e][i % 3]
        l.moveTo(-9, 0).quadraticCurveTo(0, -8, 9, 0).quadraticCurveTo(0, 8, -9, 0).closePath().fill(f).stroke({ width: 1.2, color: 0x4a6a2a, alpha: 0.6 })
        l.moveTo(-9, 0).lineTo(9, 0).stroke({ width: 1, color: 0x4a6a2a, alpha: 0.5 })
        l.position.set(dir > 0 ? v.left + rnd(-300, -20) : v.right + rnd(20, 300), v.top + rnd(80, 520))
        l.rotation = rnd(0, TAU)
        view.addChild(l)
        this._lov.push({ g: l, v: rnd(9, 15), fas: rnd(0, TAU) })
      }
    }
    this.aktiv = h
    return h
  }

  // Avsluta direkt (finish, ny runda).
  avsluta() {
    if (!this.aktiv) return
    const h = this.aktiv
    this.aktiv = null
    if (h.body) {
      this.pa.borta?.(h.body)
      this._dammen?.flytvolym?.ta(h.body)
      this._phys.removeBody(h.body)
    }
    if (h.typ === 'vind') this._vind = 0
    this._lov = []
    if (!h.view.destroyed) h.view.destroy({ children: true })
  }

  get vind() {
    return this._vind
  }

  // Ett fast fysiksteg: kinematiska rörelser.
  steg() {
    if (!this._alive || !this.aktiv) return
    const h = this.aktiv
    h.tid++
    if (h.typ === 'skoldpadda' || h.typ === 'anka') {
      h.x += h.dir * h.fart
      const y = h.y0 + Math.sin(h.tid / 22) * 2.5
      Body.setPosition(h.body, { x: h.x, y }, true)
      // Ute ur bild åt sitt håll (eller ur världen) → borta.
      const v = this._vy()
      if ((h.dir > 0 && (h.x > v.right + 240 || h.x > this._vw + 200)) || (h.dir < 0 && (h.x < v.left - 240 || h.x < -200))) this.avsluta()
    } else if (h.typ === 'fisk') {
      const u = h.tid / h.steg // 0 → 1 över bågen
      const x = h.x0 + h.dir * (u - 0.5) * h.bredd
      const y = this.ytY + 40 - Math.sin(Math.PI * u) * (h.hojd + 40)
      const dxdu = h.dir * h.bredd
      const dydu = -Math.PI * Math.cos(Math.PI * u) * (h.hojd + 40)
      Body.setPosition(h.body, { x, y }, true)
      Body.setAngle(h.body, Math.atan2(dydu, dxdu))
      if (u >= 1) this.avsluta()
    } else if (h.typ === 'kotte') {
      if (h.tid > h.liv) this.avsluta()
    } else if (h.typ === 'vind') {
      const u = h.tid / h.liv
      this._vind = h.dir * Math.sin(Math.PI * Math.min(1, u)) // 0 → 1 → 0
      if (u >= 1) this.avsluta()
    }
  }

  // Per bildruta: bild som inte följer en kropp automatiskt.
  rita(dtS, t) {
    if (!this._alive || !this.aktiv) return
    const h = this.aktiv
    if (h.view.destroyed) return
    if (h.body && h.typ !== 'kotte') {
      h.view.position.set(h.body.position.x, h.body.position.y)
      if (h.typ === 'fisk') {
        h.view.rotation = h.body.angle - (h.dir < 0 ? Math.PI : 0)
        const iLuft = h.body.position.y < this.ytY
        if (iLuft !== h.iLuft) {
          if (h.iLuft !== undefined) this._dammen.plask(h.body.position.x, 0.55)
          h.iLuft = iLuft
          h.nyss = iLuft ? 'upp' : 'ned'
        }
      }
    }
    if (h.delar?.fenaF) {
      h.delar.fenaF.rotation = Math.sin(t * 5) * 0.5
      h.delar.fenaB.rotation = -Math.sin(t * 5) * 0.4
    }
    if (h.delar?.huvud) h.delar.huvud.rotation = Math.sin(t * 2.6) * 0.06
    if (h.typ === 'kotte' && h.tid > h.liv - 40) h.view.alpha = Math.max(0, (h.liv - h.tid) / 40)
    if (h.typ === 'vind') {
      for (const l of this._lov) {
        l.g.x += h.dir * l.v * 60 * dtS * (0.4 + Math.abs(this._vind))
        l.g.y += Math.sin(t * 3 + l.fas) * 1.4
        l.g.rotation += 0.08 * h.dir
      }
    }
  }

  destroy() {
    this._alive = false
    this.avsluta()
    this._lov = []
  }
}
