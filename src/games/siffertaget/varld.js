// Siffertågets VÄRLD: landskapet som rullar förbi när tåget åker, och stationen som tar emot.
//
// Tåget står still på skärmen — det är världen som glider. En enda skrollvariabel `s`
// (px, växer åt HÖGER = tåget kör åt vänster) styr alla lager, var och ett med sin faktor:
// avlägsna kullar rör sig långsamt, telefonstolpar och sliprar i takt med marken. Lagren är
// PERIODISKA (samma mönster upprepat), så en enda `x = (s * faktor) mod period` räcker —
// ingen tween per föremål, inget som kan överleva ett utträde.
//
// Stationen är EN behållare som glider in från vänster (dit tåget är på väg), stannar exakt
// bakom tåget och tar emot: bakre halvan (byggnaden) ligger bakom rälsen, främre halvan
// (perrongen med kanin, Bobo och björn) framför tåget.
//
// Exit: `destroy()` dödar alla tweens på djurens armar/kroppar och rigg-Bobo INNAN scenen
// rivs (gsap skriver annars på förstörda noder — killTweensOf(roten) når inte barnen).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS } from '../../lib/theme.js'
import { liv, squash, sparkle, stegra } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { BLEED_X } from '../../lib/view.js'

export const STATION_X = 640 // stationens mitt när tåget stannat
export const STATION_HALV = 340 // perrongens halva bredd + marginal (för in-/utkörning)
// Barnets egen figur på perrongen (LYFTPLAN §10): en fjärde gäst mellan Bobo och björnen.
export const GAST_X = 100
export const GAST_HOJD = 104
export const GAST_BREDD = 84

const BAS_Y = 296 // horisonten / rälsens bakkant (samma som HORIZON_Y i index.js)
const C_HILL_FAR = 0xd9e8bf
const C_HILL_NEAR = 0xc3dc9f
const C_TRAD = 0x7fbf68
const C_TRAD_LJUS = 0x9dd280
const C_STRA = 0x7fb35c

// Ett lager som upprepar `ritaEn(g, ox)` med perioden `period` över hela den synliga bredden
// (inklusive bleed på båda sidor), och flyttas som en helhet. Ritas i ETT Graphics inuti en
// Container — det är containern som förflyttas, inte en Graphics med stor position.
function periodiskt(period, faktor, ritaEn) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const g = new Graphics()
  g.eventMode = 'none'
  const fran = -BLEED_X - period
  const till = 1280 + BLEED_X + period
  for (let ox = fran; ox < till; ox += period) ritaEn(g, ox)
  c.addChild(g)
  return { c, faktor, period }
}

// Halv-ellips (kulle) med kurvan uppåt och plan botten vid y — aldrig en hel ellips, för
// nedre halvan hade lagt sig över marken.
function kulle(g, cx, y, rx, ry, farg) {
  g.moveTo(cx - rx, y)
    .bezierCurveTo(cx - rx, y - ry * 1.333, cx + rx, y - ry * 1.333, cx + rx, y)
    .closePath()
    .fill(farg)
}

function trad(g, x, bas, h) {
  g.rect(x - 7, bas - h * 0.55, 14, h * 0.55).fill(COLORS.brown)
  g.circle(x, bas - h * 0.68, h * 0.3).fill(C_TRAD)
  g.circle(x - h * 0.2, bas - h * 0.52, h * 0.22).fill(C_TRAD)
  g.circle(x + h * 0.2, bas - h * 0.52, h * 0.22).fill(C_TRAD)
  g.circle(x - h * 0.08, bas - h * 0.76, h * 0.14).fill({ color: C_TRAD_LJUS, alpha: 0.75 })
}

function ritaKullarLangt(g, ox) {
  kulle(g, ox + 180, BAS_Y + 4, 300, 190, C_HILL_FAR)
  kulle(g, ox + 640, BAS_Y + 4, 360, 150, C_HILL_FAR)
  kulle(g, ox + 920, BAS_Y + 4, 230, 118, C_HILL_FAR)
}

function ritaKullarNara(g, ox) {
  kulle(g, ox + 120, BAS_Y + 4, 230, 150, C_HILL_NEAR)
  kulle(g, ox + 470, BAS_Y + 4, 300, 122, C_HILL_NEAR)
}

function ritaTrad(g, ox) {
  trad(g, ox + 90, BAS_Y, 165)
  trad(g, ox + 300, BAS_Y, 118)
  trad(g, ox + 560, BAS_Y, 178)
}

// Telefonstolpe med två trådar som hänger ner mot nästa stolpe — trådarna är det som ger
// hastighetskänslan (en lång vågrät linje som glider förbi).
function ritaStolpar(g, ox) {
  const x = ox + 60
  const P = 520
  g.rect(x - 5, 84, 10, 212).fill(COLORS.brown)
  g.roundRect(x - 34, 96, 68, 8, 3).fill(COLORS.brown)
  g.circle(x - 24, 94, 4).fill(COLORS.ink)
  g.circle(x + 24, 94, 4).fill(COLORS.ink)
  g.moveTo(x - 24, 96).quadraticCurveTo(x - 24 + P / 2, 134, x - 24 + P, 96)
  g.moveTo(x + 24, 96).quadraticCurveTo(x + 24 + P / 2, 134, x + 24 + P, 96)
  g.stroke({ width: 2, color: COLORS.ink, alpha: 0.45 })
}

function ritaSliprar(g, ox) {
  g.rect(ox + 70 - 7, BAS_Y + 4 - 4, 14, 30).fill({ color: COLORS.brown, alpha: 0.55 })
}

// Förgrundens strån och blommor (nedre halvan, där ingen vagn hamnar under slutfirandet).
function ritaForgrund(g, ox) {
  const tuva = (x, y, h) => {
    for (const dx of [-5, 0, 5]) g.moveTo(x + dx, y).quadraticCurveTo(x + dx + 2, y - h * 0.7, x + dx * 1.8, y - h)
  }
  tuva(ox + 60, 470, 16)
  tuva(ox + 190, 610, 20)
  tuva(ox + 300, 530, 14)
  tuva(ox + 410, 670, 18)
  g.stroke({ width: 3, color: C_STRA, alpha: 0.6, cap: 'round' })
  const blomma = (x, y, farg) => {
    g.moveTo(x, y + 22).lineTo(x, y).stroke({ width: 2.5, color: C_STRA, alpha: 0.7 })
    g.circle(x, y, 7).fill({ color: farg, alpha: 0.85 })
    g.circle(x, y, 3).fill({ color: COLORS.yellow, alpha: 0.95 })
  }
  blomma(ox + 130, 545, 0xffffff)
  blomma(ox + 350, 630, COLORS.pink)
  blomma(ox + 445, 500, 0xffffff)
}

// --- stationen ---------------------------------------------------------------

function ritaStationsHus() {
  const g = new Graphics()
  g.eventMode = 'none'
  // Skorsten ritas före taket så takets sluttning täcker foten.
  g.rect(92, 58, 28, 60).fill(0xb8704c)
  g.rect(88, 54, 36, 8).fill(0x9c5c3c)
  // Vägg, tegelsockel med fogar.
  g.roundRect(-210, 150, 420, 146, 6).fill(0xf6e0b8)
  g.rect(-210, 246, 420, 50).fill(0xd08a62)
  g.rect(-210, 262, 420, 2).fill({ color: 0xb8704c, alpha: 0.6 })
  g.rect(-210, 278, 420, 2).fill({ color: 0xb8704c, alpha: 0.6 })
  // Dörr med välvd överkant och fönster med spröjs.
  g.roundRect(-32, 190, 64, 106, 30).fill(COLORS.brown)
  g.circle(18, 246, 4).fill(COLORS.yellow)
  for (const x of [-150, 80]) {
    g.roundRect(x, 176, 70, 62, 8).fill(0xbfe6f5).stroke({ width: 5, color: 0xffffff })
    g.rect(x + 33, 176, 4, 62).fill(0xffffff)
    g.rect(x, 203, 70, 4).fill(0xffffff)
  }
  // Skylt över dörren.
  g.roundRect(-56, 160, 112, 22, 8).fill(COLORS.blue).stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
  for (const x of [-24, 0, 24]) g.circle(x, 171, 4).fill(0xffffff)
  // Tak (gavel) med kantlist.
  g.poly([-244, 156, 0, 52, 244, 156]).fill(COLORS.red)
  g.poly([-244, 156, 0, 52, 0, 70, -222, 156]).fill({ color: 0xffffff, alpha: 0.14 })
  g.roundRect(-252, 150, 504, 12, 6).fill(COLORS.orangeDark)
  // Klocka i gaveln.
  g.circle(0, 112, 25).fill(0xffffff).stroke({ width: 5, color: COLORS.brown })
  g.moveTo(0, 112).lineTo(0, 96).moveTo(0, 112).lineTo(11, 118)
  g.stroke({ width: 3, color: COLORS.ink, cap: 'round' })
  return g
}

function ritaPerrong() {
  const g = new Graphics()
  g.eventMode = 'none'
  g.rect(-330, 396, 660, 34).fill(0xb9a98a) // frontsida
  g.roundRect(-330, 352, 660, 56, 10).fill(0xe6dbc3) // ovansida
  g.rect(-322, 358, 644, 5).fill({ color: COLORS.yellow, alpha: 0.9 }) // varningslinje
  for (const x of [-300, 300]) {
    g.rect(x - 3, 268, 6, 92).fill(COLORS.ink)
    g.circle(x, 262, 12).fill(COLORS.yellow).stroke({ width: 3, color: 0xffffff, alpha: 0.6 })
  }
  return g
}

// Ett djur: origo = fötterna. `arm` är en egen nod i axeln (vinkningen är en rotation).
function djur(x, ritaKropp) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c.position.set(x, 398)
  const inner = new Container()
  const arm = new Container()
  ritaKropp(inner, arm)
  inner.addChild(arm)
  c.addChild(inner)
  return { c, inner, arm }
}

function kanin(inner, arm) {
  const P = 0xf4eef2
  const PS = 0xe3d6de
  const g = new Graphics()
  g.ellipse(-11, -3, 12, 6).fill(PS)
  g.ellipse(11, -3, 12, 6).fill(PS)
  g.ellipse(-10, -108, 7, 22).fill(P)
  g.ellipse(10, -108, 7, 22).fill(P)
  g.ellipse(-10, -106, 3.5, 15).fill(COLORS.pink)
  g.ellipse(10, -106, 3.5, 15).fill(COLORS.pink)
  g.ellipse(0, -32, 22, 30).fill(P)
  g.ellipse(0, -26, 12, 18).fill(0xffffff)
  g.ellipse(-20, -32, 6, 14).fill(P)
  g.circle(0, -72, 21).fill(P)
  g.circle(-7, -74, 3).fill(COLORS.ink)
  g.circle(7, -74, 3).fill(COLORS.ink)
  g.ellipse(0, -66, 3.5, 2.5).fill(COLORS.pink)
  g.moveTo(-5, -61).quadraticCurveTo(0, -57, 5, -61).stroke({ width: 2, color: COLORS.ink, cap: 'round' })
  inner.addChild(g)
  arm.position.set(17, -46)
  arm.addChild(
    new Graphics()
      .moveTo(0, 0)
      .lineTo(14, -22)
      .stroke({ width: 9, color: P, cap: 'round' })
      .circle(14, -22, 6)
      .fill(P),
  )
  inner.scale.set(0.8)
}

function bjorn(inner, arm) {
  const B = 0xb47a4a
  const BL = 0xe7c8a0
  const g = new Graphics()
  g.ellipse(-13, -3, 13, 7).fill(0x9a6438)
  g.ellipse(13, -3, 13, 7).fill(0x9a6438)
  g.ellipse(0, -34, 27, 32).fill(B)
  g.ellipse(0, -30, 16, 20).fill(BL)
  g.ellipse(-24, -34, 7, 15).fill(B)
  g.circle(-18, -100, 9).fill(B)
  g.circle(18, -100, 9).fill(B)
  g.circle(-18, -100, 4.5).fill(BL)
  g.circle(18, -100, 4.5).fill(BL)
  g.circle(0, -78, 24).fill(B)
  g.ellipse(0, -70, 11, 9).fill(BL)
  g.ellipse(0, -73, 4.5, 3.2).fill(COLORS.ink)
  g.circle(-9, -84, 3).fill(COLORS.ink)
  g.circle(9, -84, 3).fill(COLORS.ink)
  g.moveTo(-4, -65).quadraticCurveTo(0, -61, 4, -65).stroke({ width: 2, color: COLORS.ink, cap: 'round' })
  inner.addChild(g)
  arm.position.set(20, -48)
  arm.addChild(
    new Graphics()
      .moveTo(0, 0)
      .lineTo(15, -22)
      .stroke({ width: 10, color: B, cap: 'round' })
      .circle(15, -22, 7)
      .fill(B),
  )
  inner.scale.set(0.82)
}

export class Varld {
  constructor(ctx) {
    this._alive = true
    this._view = ctx.view // levande objekt — läses vid användning
    this._lager = []
    this._st = null // { x0, s0 } medan stationen är framme
    this._djur = []
    this._bobo = null
    this._egen = null // barnets figur på perrongen (EgenFigur) — bara medan stationen står
    this._malX = 0

    // BAK: ligger mellan scenen och banvallen (kullar, träd, stolpar, stationshuset).
    this.bak = new Container()
    this.bak.eventMode = 'none'
    this.bak.interactiveChildren = false
    for (const [period, faktor, rita] of [
      [1000, 0.08, ritaKullarLangt],
      [800, 0.18, ritaKullarNara],
      [700, 0.42, ritaTrad],
      [520, 0.85, ritaStolpar],
    ]) {
      const l = periodiskt(period, faktor, rita)
      this._lager.push(l)
      this.bak.addChild(l.c)
    }
    this._stBak = new Container()
    this._stBak.eventMode = 'none'
    this._stBak.visible = false
    this._stBak.addChild(ritaStationsHus())
    this.bak.addChild(this._stBak)

    // SLIPRAR: efter banvallen, före rälsbalken.
    const sl = periodiskt(60, 1, ritaSliprar)
    this._lager.push(sl)
    this.slipers = sl.c

    // FÖRGRUND: strån och blommor, under vagnarna men över marken.
    const fg = periodiskt(480, 1.15, ritaForgrund)
    this._lager.push(fg)
    this.gras = fg.c

    // FRAM: perrongen med sina gäster, framför tåget.
    this.fram = new Container()
    this.fram.eventMode = 'none'
    this.fram.interactiveChildren = false
    this.fram.visible = false
    this._stFram = this.fram
    this.fram.addChild(ritaPerrong())
    this._byggGaster()
  }

  _byggGaster() {
    const k = djur(-200, kanin)
    const b = djur(200, bjorn)
    for (const d of [k, b]) {
      this.fram.addChild(d.c)
      d.dx = d.c.x
      liv(d.inner, { bob: 2.5, sway: 0.02, duration: 2 + Math.random() * 0.8, phase: Math.random() })
      this._djur.push(d)
    }
    // Bobo som stationsföreståndare: en riktig rigg som kan jubla.
    this._bobo = makeKaraktar({ r: 26 })
    this._bobo.view.position.set(0, 398 - 61)
    this._bobo.dx = 0
    this.fram.addChild(this._bobo.view)
  }

  // Alla lager läser samma `s`. Stationen följer marken (faktor 1) och göms när den
  // gått ur bild åt höger.
  sattScroll(s) {
    if (!this._alive) return
    for (const l of this._lager) {
      if (l.c.destroyed) continue
      l.c.x = (((s * l.faktor) % l.period) + l.period) % l.period
    }
    const st = this._st
    if (!st) return
    const x = st.x0 + (s - st.s0)
    this._stBak.x = x
    this._stFram.x = x
    // Gästen tittar mot tåget (look() räknar i förälderns rum: perrongens).
    if (this._egen?._alive) this._egen.look(this._malX - x, 250)
    if (x > this._view.right + STATION_HALV + 40) this.stationDolj()
  }

  // Stationen dyker upp utanför vänsterkanten (x0) och följer sedan skrollen.
  stationVisa(s, x0) {
    if (!this._alive) return
    this._st = { x0, s0: s }
    this._stBak.x = x0
    this._stFram.x = x0
    this._stBak.visible = true
    this._stFram.visible = true
  }

  /** Ställ barnets figur på perrongen (ersätter en som står kvar). malX = där tåget står. */
  sattGast(fig, malX) {
    this._rivGast()
    if (!this._alive || !fig) return
    this._egen = fig
    this._malX = malX
    fig.view.position.set(GAST_X, 398)
    this.fram.addChild(fig.view)
  }

  _rivGast() {
    const e = this._egen
    this._egen = null
    if (!e) return
    if (e.view && !e.view.destroyed) {
      gsap.killTweensOf(e.view)
      gsap.killTweensOf(e.view.scale)
    }
    e.destroy()
  }

  stationDolj() {
    // Figuren följer med stationen ut ur bild — den rivs när perrongen gömts, aldrig mitt i bild.
    this._rivGast()
    this._st = null
    if (this._stBak && !this._stBak.destroyed) this._stBak.visible = false
    if (this._stFram && !this._stFram.destroyed) this._stFram.visible = false
  }

  stationSynlig() {
    return !!this._st
  }

  stationX() {
    return this._st ? this._stFram.x : null
  }

  // Tåget har kommit fram: alla vinkar, hoppar och jublar, Bobo med.
  hurra(ctx) {
    if (!this._alive || !this._st) return
    const audio = ctx.services.audio
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      audio.tone({ freq: f, dur: 0.22, type: 'sine', vol: 0.12, delay: i * 0.11 }),
    )
    this._djur.forEach((d, i) => {
      if (d.arm.destroyed) return
      gsap.killTweensOf(d.arm)
      gsap.to(d.arm, {
        rotation: -0.65,
        duration: 0.17,
        yoyo: true,
        repeat: 7,
        ease: 'sine.inOut',
        delay: i * 0.12,
        onComplete: () => {
          if (!d.arm.destroyed) d.arm.rotation = 0
        },
      })
    })
    stegra(
      this._djur.map((d) => d.inner),
      squash,
      { intensity: 1.1 },
    )
    // Barnets figur vinkar med de andra: en kompis med armen, ett knytt med ett skutt.
    this._egen?.react('hej')
    this._bobo?.react('jubel')
    const x = this._stFram.x
    for (const [dx, y] of [[-200, 320], [0, 300], [200, 320]]) sparkle(ctx.fxLayer, x + dx, y, { count: 5 })
  }

  destroy() {
    this._alive = false
    for (const d of this._djur) {
      d.inner._fxLiv?.kill()
      d.inner._fxSquashTl?.kill()
      d.inner._fxHopTl?.kill()
      for (const n of [d.arm, d.inner, d.c]) {
        if (!n || n.destroyed) continue
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
      }
    }
    this._rivGast()
    this._bobo?.destroy()
    this._bobo = null
    this._djur = []
    this._lager = []
    this._st = null
  }
}
