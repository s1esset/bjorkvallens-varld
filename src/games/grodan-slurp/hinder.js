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

// L6/L7 (docs §4i): samma sju mekaniker, olika bild — bilderna i djur.js (DJUR). Saknas en
// bildfunktion ritas en enkel reserv, så att ett hinder går att spela innan dess konst finns.
//   FALLA   faller ovanifrån (dynamisk): kotte, snoboll, droppe
//   RULLA   rullar/studsar in från bildens kant (dynamisk): buskboll, badboll, apelsin, leksaksboll, tval
//   GA      går längs marken (kinematisk): krabba, pillerbagge, katt
//   SIMMA   simmar i ytan (kinematisk): skoldpadda, anka — och badanka, som stannar i badkaret
//   BAGE    en båge (kinematisk): fisk och gädda upp ur vattnet, måsen ned ur luften, pappersflygplanet tvärs
//   VIND    en pust i sidled: vind (löv), sandvind (sand), flakt (papperslappar), anga (ånga)
//   BUBBLA  gasbubbla (stiger ur dyn och spricker vid ytan) · sapbubbla (svävar förbi, spricker vid grodan)
//   VAG     en stor våg (stranden): strömmen puffar mot land och havet sväller
const RULLA = {
  buskboll: { r: 28, rita: 'ritaBuskboll', farg: 0xb08a4a, density: 0.0007, restitution: 0.55, frictionAir: 0.008, fart: 5.2, hopp: -4, flyt: 2.2 },
  badboll: { r: 26, rita: 'ritaBadboll', farg: 0xf25a5a, density: 0.0005, restitution: 0.85, frictionAir: 0.006, fart: 4.6, hopp: -7, flyt: 3 },
  apelsin: { r: 18, rita: 'ritaApelsin', farg: 0xf5962a, density: 0.0018, restitution: 0.3, frictionAir: 0.004, fart: 4.4, hopp: -2, flyt: 1.4 },
  leksaksboll: { r: 22, rita: 'ritaLeksaksboll', farg: 0x4f8ff2, density: 0.0009, restitution: 0.8, frictionAir: 0.005, fart: 5, hopp: -6, flyt: 2.4 },
  tval: { r: 14, w: 52, h: 28, rita: 'ritaTval', farg: 0xf4a6c6, density: 0.002, restitution: 0.1, frictionAir: 0.002, fart: 7, hopp: 0, flyt: 1.6, friction: 0.004 },
}
const GA = {
  krabba: { w: 110, h: 44, rita: 'ritaKrabba', farg: 0xe8603a, fart: 1.5, studs: 0.6, land: true },
  pillerbagge: { w: 160, h: 60, rita: 'ritaPillerbagge', farg: 0x2d3a5a, fart: 1.2, studs: 0.5 },
  katt: { w: 260, h: 120, rita: 'ritaKatt', farg: 0xe89a4a, fart: 2.1, studs: 0.4 },
}
const BAGE = {
  gadda: { w: 110, h: 32, rita: 'ritaGadda', farg: 0x6f9a4a, upp: true },
  mas: { w: 80, h: 34, rita: 'ritaMas', farg: 0xf2f2ee, ned: true },
  pappersflygplan: { w: 80, h: 30, rita: 'ritaPappersflygplan', farg: 0xf6f2e6, tvars: true },
}
const VINDAR = {
  vind: { farger: [0x7dbf4f, 0xe0a33a, 0xc8662e], form: 'lov' },
  sandvind: { farger: [0xe8c890, 0xd9b070, 0xf0dcae], form: 'korn' },
  flakt: { farger: [0xffffff, 0xf6e7a8, 0xbfe3ff], form: 'lapp' },
  anga: { farger: [0xffffff, 0xf2f6fa, 0xe6eef6], form: 'moln' },
}

export class Hinder {
  // lager: { bakom, fram } · dammen: Dammen (för ytY, plask och flytvolym)
  // pa: { borta(body), bubbla(x, y, r) } — spelet släpper tungan om den satt i något som
  // försvinner, och knuffar grodan när en bubbla spricker nära den
  // vy: () => synlig världsyta (L4-kameran) — hindren kommer in där barnet TITTAR, inte i en
  // fast skärmruta. Utan vy gäller skärmen 0–1280 som förut.
  // djur: bildfunktionerna (djur.js) — { ritaKrabba(c), ritaBadboll(g), … }
  // grodPos: () => { x, y } — var grodan är (sapbubblan spricker när grodan kommer nära)
  constructor({ phys, lager, dammen, ytY = 560, pa = {}, vy = null, djur = {}, grodPos = null }) {
    this._vyFn = vy
    this._phys = phys
    this._lager = lager
    this._dammen = dammen
    this.ytY = ytY
    this.pa = pa
    this._djur = djur
    this._grodPos = grodPos
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

  // En bild ur djur.js (eller reserven). `c` är en Container; djurets bild ritas centrerad kring
  // origo med nosen mot +x. Returnerar { uppdatera } eller null.
  _bild(namn, c, reserv) {
    const f = this._djur?.[namn]
    if (typeof f === 'function') {
      try {
        if (/^rita(Kokosnot|Buskboll|Badboll|Apelsin|Leksaksboll|Droppe|Tval|Sapbubbla|Gasbubbla)$/.test(namn)) {
          const g = new Graphics()
          c.addChild(g)
          return f(g) || null
        }
        return f(c) || null
      } catch (e) {
        console.warn('[grodan-slurp] djuret ' + namn + ' föll:', e)
      }
    }
    reserv?.(c)
    return null
  }

  // Marken (eller vattnet) under x — där rullande och gående saker rör sig.
  _golvVid(x) {
    const d = this._dammen
    return d?.markVid ? d.markVid(x) : this.ytY
  }

  // Starta en händelse. grodX = var grodan är (kotten siktar ibland nära henne).
  starta(typ, grodX = 640) {
    if (!this._alive || this.aktiv) return null
    const view = new Container()
    view.eventMode = 'none'
    let h = null
    const v = this._vy()
    const grod = this._grodPos?.() || { x: grodX, y: this.ytY - 40 }
    if (typ === 'kotte' || typ === 'snoboll' || typ === 'droppe') {
      // (Snöbollen och droppen har kottens etikett — samma smäll, samma regler i index.js.)
      const x = Math.random() < 0.55 ? grodX + rnd(-110, 110) : rnd(v.left + 240, v.right - 240)
      const droppe = typ === 'droppe'
      const body = this._phys.circle(Math.max(160, Math.min(this._vw - 160, x)), v.top - 30, droppe ? 11 : 15, { ...mat('tra'), density: droppe ? 0.0016 : 0.0022, frictionAir: 0.012, restitution: droppe ? 0 : 0.35, label: 'kotte' })
      Body.setAngularVelocity(body, droppe ? 0 : rnd(-0.08, 0.08))
      if (droppe) Body.setInertia(body, Infinity) // droppen står upprätt (spetsen uppåt)
      if (droppe) this._bild('ritaDroppe', view, (c) => c.addChild(new Graphics().circle(0, 0, 11).fill({ color: 0xbfe8ff, alpha: 0.85 })))
      else {
        const g = new Graphics()
        if (typ === 'snoboll') ritaSnoboll(g)
        else ritaKotte(g)
        view.addChild(g)
      }
      this._lager.bakom.addChild(view)
      this._phys.link(body, view)
      if (!droppe) this._dammen.flytvolym.lagg(body, { flyt: 1.7 })
      h = { typ: 'kotte', variant: typ, body, view, tid: 0, liv: 60 * 12, fartForra: 0 }
    } else if (RULLA[typ]) {
      // Rullar in från bildens kant mot grodan, längs marken (eller ytan).
      const R = RULLA[typ]
      const fran = grod.x < (v.left + v.right) / 2 ? 1 : -1 // från den kant grodan är längst ifrån
      const x0 = fran > 0 ? v.right + 60 : v.left - 60
      const xk = Math.max(80, Math.min(this._vw - 80, x0))
      const y0 = this._golvVid(xk) - R.r - (R.hopp ? 60 : 4)
      const opts = { ...mat('tra'), density: R.density, frictionAir: R.frictionAir, restitution: R.restitution, label: 'kotte' }
      if (R.friction != null) opts.friction = R.friction
      const body = R.w ? this._phys.rectangle(xk, y0, R.w, R.h, { ...opts, chamfer: { radius: 10 } }) : this._phys.circle(xk, y0, R.r, opts)
      Body.setVelocity(body, { x: -fran * R.fart, y: R.hopp })
      if (!R.w) Body.setAngularVelocity(body, -fran * R.fart / R.r)
      const liv = this._bild(R.rita, view, (c) => {
        const g = new Graphics()
        if (R.w) g.roundRect(-R.w / 2, -R.h / 2, R.w, R.h, 10).fill(sphereFill(R.farg, { lightX: 0.35, lightY: 0.3, dark: 0.3 }))
        else g.circle(0, 0, R.r).fill(sphereFill(R.farg, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 2, color: 0x6b4a2a })
        c.addChild(g)
      })
      this._lager.bakom.addChild(view)
      this._phys.link(body, view)
      this._dammen.flytvolym.lagg(body, { flyt: R.flyt })
      h = { typ: 'kotte', variant: typ, body, view, tid: 0, liv: 60 * 11, liv2: liv }
    } else if (GA[typ]) {
      // Går längs marken genom bilden. Krabban bara på land (stranden): syns inget land, ingen krabba.
      const G = GA[typ]
      let dir = Math.random() < 0.5 ? -1 : 1
      let x0 = dir > 0 ? v.left - G.w : v.right + G.w
      if (G.land) {
        const d = this._dammen
        const k = d?._plan?.kustU
        if (k == null) return null
        const kx = d._x(k - 40)
        const landV = d._sgn > 0 // landet till vänster om kusten
        const synligt = landV ? v.left < kx - 200 : v.right > kx + 200
        if (!synligt) return null
        // Från världens kant (landets ytterkant) mot kusten och tillbaka ut.
        dir = landV ? 1 : -1
        x0 = landV ? Math.max(v.left - G.w, -G.w) : Math.min(v.right + G.w, this._vw + G.w)
        h = { granser: landV ? [-G.w * 2, kx] : [kx, this._vw + G.w * 2] }
      }
      const y = this._golvVid(Math.max(0, Math.min(this._vw, x0))) - G.h / 2 + 4
      const body = this._phys.rectangle(x0, y, G.w, G.h, { isStatic: true, studs: G.studs, chamfer: { radius: Math.min(G.h / 2 - 2, 20) }, label: typ })
      const inner = new Container()
      const liv = this._bild(G.rita, inner, (c) => c.addChild(new Graphics().roundRect(-G.w / 2, -G.h / 2, G.w, G.h, 18).fill(sphereFill(G.farg, { lightX: 0.4, lightY: 0.25, dark: 0.3 }))))
      inner.scale.x = typ === 'krabba' ? 1 : dir // krabban går sidlänges — den vänds inte
      view.addChild(inner)
      this._lager.bakom.addChild(view)
      h = { ...(h || {}), typ, body, view, inner, tid: 0, dir, fart: G.fart, x: x0, h: G.h, liv2: liv, vandor: 0 }
    } else if (typ === 'skoldpadda' || typ === 'anka' || typ === 'badanka') {
      const badanka = typ === 'badanka'
      const G = this._dammen?._plan?.gol
      if (badanka && !G) return null
      const fran = Math.random() < 0.5 ? -1 : 1
      const x0 = badanka ? (fran < 0 ? G.x0 + 90 : G.x1 - 90) : fran < 0 ? v.left - 140 : v.right + 140
      const anka = typ !== 'skoldpadda'
      const y = this.ytY + (anka ? -6 : 6)
      const body = anka
        ? this._phys.rectangle(x0, y, 150, 44, { isStatic: true, studs: 0.5, chamfer: { radius: 20 }, label: 'anka' })
        : this._phys.rectangle(x0, y, 150, 40, { isStatic: true, studs: 0.7, chamfer: { radius: 18 }, ...mat('sten'), label: 'skoldpadda' })
      const inner = new Container()
      let delar = null
      let liv = null
      if (badanka) liv = this._bild('ritaBadanka', inner, (c) => ritaAnka(c))
      else delar = anka ? ritaAnka(inner) : ritaSkoldpadda(inner)
      inner.scale.x = -fran // tittar åt det håll den simmar
      view.addChild(inner)
      if (badanka) view.alpha = 0
      this._lager.bakom.addChild(view)
      h = { typ, body, view, inner, delar, liv2: liv, tid: 0, dir: -fran, fart: anka ? 1.5 : 1.9, x: x0, y0: y, badkar: badanka ? [G.x0 + 90, G.x1 - 90] : null, vandor: 0 }
    } else if (typ === 'fisk' || BAGE[typ]) {
      const B = BAGE[typ]
      const dir = Math.random() < 0.5 ? -1 : 1
      if (!B || B.upp) {
        const x0 = Math.max(300, Math.min(this._vw - 300, grodX + rnd(-340, 340)))
        const body = this._phys.rectangle(x0, this.ytY + 40, B ? B.w : 76, B ? B.h : 32, { isStatic: true, studs: 0.5, chamfer: { radius: 14 }, label: 'fisk' })
        const inner = new Container()
        let liv = null
        if (B) liv = this._bild(B.rita, inner, (c) => ritaFisk(c))
        else ritaFisk(inner)
        inner.scale.x = dir
        view.addChild(inner)
        this._lager.bakom.addChild(view)
        h = { typ: 'fisk', variant: typ, body, view, inner, liv2: liv, tid: 0, x0, dir, bredd: rnd(200, 300), hojd: rnd(170, 250), steg: 84, plaskat: false }
      } else {
        // Måsen dyker ned mot grodan och upp igen; pappersflygplanet glider tvärs över bilden.
        const x0 = dir > 0 ? v.left - 80 : v.right + 80
        const bredd = v.right - v.left + 160
        const y0 = B.ned ? Math.max(v.top + 70, grod.y - 320) : Math.max(v.top + 90, grod.y - rnd(160, 240))
        const djup = B.ned ? Math.max(120, grod.y - 50 - y0) : rnd(60, 130)
        const body = this._phys.rectangle(x0, y0, B.w, B.h, { isStatic: true, studs: 0.3, chamfer: { radius: 12 }, label: B.ned ? 'mas' : 'papper' })
        const inner = new Container()
        const liv = this._bild(B.rita, inner, (c) => c.addChild(new Graphics().ellipse(0, 0, B.w / 2, B.h / 2).fill(B.farg)))
        inner.scale.x = dir
        view.addChild(inner)
        this._lager.bakom.addChild(view)
        h = { typ: 'flyg', variant: typ, body, view, inner, liv2: liv, tid: 0, x0, dir, bredd, y0, djup, steg: B.ned ? 150 : 230, ned: !!B.ned }
      }
    } else if (VINDAR[typ]) {
      const V = VINDAR[typ]
      const dir = Math.random() < 0.5 ? -1 : 1
      h = { typ: 'vind', variant: typ, body: null, view, tid: 0, dir, liv: 60 * 2.6 }
      this._lager.fram.addChild(view)
      // Det som blåser över bilden — bara bild.
      for (let i = 0; i < (V.form === 'korn' ? 22 : 9); i++) {
        const l = new Graphics()
        const f = V.farger[i % 3]
        if (V.form === 'lov') {
          l.moveTo(-9, 0).quadraticCurveTo(0, -8, 9, 0).quadraticCurveTo(0, 8, -9, 0).closePath().fill(f).stroke({ width: 1.2, color: 0x4a6a2a, alpha: 0.6 })
          l.moveTo(-9, 0).lineTo(9, 0).stroke({ width: 1, color: 0x4a6a2a, alpha: 0.5 })
        } else if (V.form === 'korn') l.ellipse(0, 0, rnd(2, 4), rnd(1.5, 2.5)).fill({ color: f, alpha: 0.9 })
        else if (V.form === 'lapp') l.rect(-8, -6, 16, 12).fill(f).stroke({ width: 1, color: 0x9aa4b0, alpha: 0.6 })
        else l.circle(0, 0, rnd(14, 26)).fill({ color: f, alpha: 0.45 })
        l.position.set(dir > 0 ? v.left + rnd(-300, -20) : v.right + rnd(20, 300), v.top + rnd(80, 520))
        l.rotation = rnd(0, TAU)
        view.addChild(l)
        this._lov.push({ g: l, v: rnd(9, 15), fas: rnd(0, TAU), snurr: V.form !== 'moln' })
      }
    } else if (typ === 'gasbubbla') {
      // Stiger ur dyn nära grodan och spricker vid ytan — det som flyter där får en knuff.
      const x = Math.max(120, Math.min(this._vw - 120, grod.x + rnd(-70, 70)))
      const g = new Container()
      this._bild('ritaGasbubbla', g, (c) => c.addChild(new Graphics().circle(0, 0, 26).fill({ color: 0x9aa860, alpha: 0.45 }).stroke({ width: 2, color: 0xdfe8b0, alpha: 0.7 })))
      view.addChild(g)
      view.position.set(x, 710)
      view.scale.set(0.35)
      this._lager.bakom.addChild(view)
      h = { typ: 'gasbubbla', body: null, view, tid: 0, x, y: 710, sma: [] }
      for (let i = 0; i < 5; i++) h.sma.push({ dx: rnd(-30, 30), y: 720 + i * 30, r: rnd(3, 6) })
    } else if (typ === 'sapbubbla') {
      // Svävar sakta tvärs över bilden i grodans höjd och spricker när grodan kommer nära.
      const dir = grod.x < (v.left + v.right) / 2 ? -1 : 1
      const x0 = dir < 0 ? v.right + 60 : v.left - 60
      const y0 = Math.max(v.top + 140, Math.min(grod.y - 40, 470))
      const body = this._phys.circle(x0, y0, 32, { isStatic: true, isSensor: true, label: 'bubbla' })
      this._bild('ritaSapbubbla', view, (c) => c.addChild(new Graphics().circle(0, 0, 34).fill({ color: 0xe8f6ff, alpha: 0.25 }).stroke({ width: 2.5, color: 0xbfe0ff, alpha: 0.8 })))
      this._lager.bakom.addChild(view)
      h = { typ: 'sapbubbla', body, view, tid: 0, x: x0, y0, dir: -dir, fas: rnd(0, TAU) }
    } else if (typ === 'vag') {
      if (!this._dammen?.biom?.vagor) return null
      this._dammen.storVag(1)
      h = { typ: 'vag', body: null, view, tid: 0, liv: 60 * 3 }
      this._lager.fram.addChild(view)
    }
    if (!h) {
      if (!view.destroyed) view.destroy({ children: true })
      return null
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

  // Spräck bubblan (tungan nådde den, grodan kom nära): glitter + en knuff åt spelet.
  poppa() {
    const h = this.aktiv
    if (!h || (h.typ !== 'sapbubbla' && h.typ !== 'gasbubbla')) return false
    const x = h.body ? h.body.position.x : h.x
    const y = h.body ? h.body.position.y : this.ytY
    this.pa.bubbla?.(x, y, h.typ === 'sapbubbla' ? 90 : 120)
    this.avsluta()
    return true
  }

  get vind() {
    return this._vind
  }

  // Ett fast fysiksteg: kinematiska rörelser.
  steg() {
    if (!this._alive || !this.aktiv) return
    const h = this.aktiv
    h.tid++
    const v = this._vy()
    if (h.typ === 'skoldpadda' || h.typ === 'anka' || h.typ === 'badanka') {
      h.x += h.dir * h.fart
      const y = h.y0 + Math.sin(h.tid / 22) * 2.5
      Body.setPosition(h.body, { x: h.x, y }, true)
      if (h.badkar) {
        // Badankan paddlar fram och tillbaka i badkaret två gånger, sedan bleknar den bort.
        if ((h.dir > 0 && h.x > h.badkar[1]) || (h.dir < 0 && h.x < h.badkar[0])) {
          h.dir = -h.dir
          h.vandor++
          h.inner.scale.x = -h.inner.scale.x
        }
        if (h.vandor >= 3) this.avsluta()
        return
      }
      // Ute ur bild åt sitt håll (eller ur världen) → borta.
      if ((h.dir > 0 && (h.x > v.right + 240 || h.x > this._vw + 200)) || (h.dir < 0 && (h.x < v.left - 240 || h.x < -200))) this.avsluta()
    } else if (GA[h.typ]) {
      h.x += h.dir * h.fart
      const y = this._golvVid(Math.max(0, Math.min(this._vw, h.x))) - h.h / 2 + 4 + Math.abs(Math.sin(h.tid / 9)) * -1.5
      Body.setPosition(h.body, { x: h.x, y }, true)
      if (h.granser) {
        // Krabban: till kusten och tillbaka ut (den går inte ut i havet).
        if ((h.dir > 0 && h.x > h.granser[1]) || (h.dir < 0 && h.x < h.granser[0])) {
          if (h.vandor++ >= 1) return this.avsluta()
          h.dir = -h.dir
        }
        return
      }
      if ((h.dir > 0 && (h.x > v.right + 300 || h.x > this._vw + 300)) || (h.dir < 0 && (h.x < v.left - 300 || h.x < -300))) this.avsluta()
    } else if (h.typ === 'fisk') {
      const u = h.tid / h.steg // 0 → 1 över bågen
      const x = h.x0 + h.dir * (u - 0.5) * h.bredd
      const y = this.ytY + 40 - Math.sin(Math.PI * u) * (h.hojd + 40)
      const dxdu = h.dir * h.bredd
      const dydu = -Math.PI * Math.cos(Math.PI * u) * (h.hojd + 40)
      Body.setPosition(h.body, { x, y }, true)
      Body.setAngle(h.body, Math.atan2(dydu, dxdu))
      if (u >= 1) this.avsluta()
    } else if (h.typ === 'flyg') {
      const u = h.tid / h.steg
      const x = h.x0 + h.dir * u * h.bredd
      const y = h.ned ? h.y0 + Math.sin(Math.PI * u) * h.djup : h.y0 + u * h.djup + Math.sin(u * TAU * 1.5) * 18
      Body.setPosition(h.body, { x, y }, true)
      if (u >= 1) this.avsluta()
    } else if (h.typ === 'kotte') {
      if (h.variant === 'droppe') {
        // Droppen stänker sönder när den slår i något (farten försvinner) eller i vattnet.
        const b = h.body
        const sp = Math.hypot(b.velocity.x, b.velocity.y)
        const d = this._dammen
        const iVatten = b.position.x > d._vx0 && b.position.x < d._vx1 && b.position.y > d.ytaVid(b.position.x) - 4
        if (h.tid > 6 && (sp < h.fartForra * 0.45 || iVatten)) {
          d.plask(b.position.x, iVatten ? 0.3 : 0.15)
          this.pa.droppe?.(b.position.x, b.position.y)
          return this.avsluta()
        }
        h.fartForra = sp
      }
      if (h.tid > h.liv) this.avsluta()
    } else if (h.typ === 'vind') {
      const u = h.tid / h.liv
      this._vind = h.dir * Math.sin(Math.PI * Math.min(1, u)) // 0 → 1 → 0
      if (u >= 1) this.avsluta()
    } else if (h.typ === 'gasbubbla') {
      // Stiger ur dyn (2 s) och spricker vid ytan.
      h.y = 710 - (h.tid / 120) * (710 - this.ytY + 6)
      if (h.tid >= 120) {
        this._dammen.plask(h.x, 0.55)
        this.poppa()
      }
    } else if (h.typ === 'sapbubbla') {
      h.x += h.dir * 1.25
      const y = h.y0 + Math.sin(h.tid / 40 + h.fas) * 26
      Body.setPosition(h.body, { x: h.x, y }, true)
      const g = this._grodPos?.()
      if (g && Math.hypot(g.x - h.x, g.y - y) < 70) return this.poppa()
      if ((h.dir > 0 && h.x > v.right + 120) || (h.dir < 0 && h.x < v.left - 120) || h.tid > 60 * 20) this.avsluta()
    } else if (h.typ === 'vag') {
      if (h.tid > h.liv) this.avsluta()
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
    if (h.liv2?.uppdatera) {
      try {
        h.liv2.uppdatera(t, dtS, (h.fart || 0) * 60) // tredje: gångfarten i px/s (pillerbaggens boll rullar i takt)
      } catch {
        h.liv2 = null
      }
    }
    if (h.typ === 'badanka') {
      // Badankan tonar in och ut i badkaret (den kommer inte från bildens kant).
      const ut = h.vandor >= 2 ? 1 : 0
      h.view.alpha = Math.min(1, h.tid / 40) * (ut ? Math.max(0, 1 - Math.abs(h.x - (h.dir > 0 ? h.badkar[1] : h.badkar[0])) / 400) : 1)
    }
    if (h.typ === 'kotte' && h.tid > h.liv - 40) h.view.alpha = Math.max(0, (h.liv - h.tid) / 40)
    if (h.typ === 'vind') {
      for (const l of this._lov) {
        l.g.x += h.dir * l.v * 60 * dtS * (0.4 + Math.abs(this._vind))
        l.g.y += Math.sin(t * 3 + l.fas) * 1.4
        if (l.snurr) l.g.rotation += 0.08 * h.dir
      }
    }
    if (h.typ === 'gasbubbla') {
      h.view.position.set(h.x + Math.sin(h.tid / 9) * 4, h.y)
      h.view.scale.set(0.35 + 0.65 * Math.min(1, h.tid / 110))
    }
  }

  destroy() {
    this._alive = false
    this.avsluta()
    this._lov = []
  }
}
