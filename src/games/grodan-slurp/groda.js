// Grodan — en AKTIV RAGDOLL i matter.js (grodan-slurp).
//
// Tolv kroppar: kropp, huvud, och per sida (nära/bortre) överarm + underarm och lår + underben
// + fot. Lederna är matter-`Constraint` med längd 0 mellan ankarpunkter på grannarna (stift-
// leder). Matter har inga vinkelgränser och inga motorer, så två saker görs här för hand, EN
// gång per fast fysiksteg (`steg()` anropas ur `phys.beforeStep`, aldrig per bildruta):
//
//   1. VINKELGRÄNSER — varje led har [lo, hi] för den relativa vinkeln barn − förälder. Går den
//      utanför skjuts den relativa vinkelhastigheten tillbaka med en impuls. Gränserna gäller
//      alltid (anatomi), även när musklerna är slaka.
//   2. MUSKLER — en PD-regulator per led mot en MÅLPOSE (sitt · hopp · flyg · landa · sim-in ·
//      sim-ut · dingla). Muskelkraften `kraft` (0…1) faller mot noll vid en hård smäll och kryper
//      tillbaka — det är ragdoll-tumlet: äkta fysik medan den är slak, en groda som samlar sig
//      när den återhämtar sig. Inget i rörelsen är en förinspelad animation.
//
// Momenten läggs som ett PAR (lika och motsatt på barn och förälder), så musklerna kan inte
// snurra grodan i luften av egen kraft — bara ändra dess form. Det enda yttre momentet är
// "bålstödet" när grodan står på något (marken tar emot), som håller sittvinkeln och vänder en
// groda som landat på rygg.
//
// SPEGLING (vänd). En 2D-ragdoll kan inte vända sig om — knäna böjer åt ett håll. Grodan
// speglas därför i ETT steg: läge x → 2·px − x, vinkel a → π − a, farten i x byter tecken och
// varje leds lokala ankarpunkt får y negerat. Bilden speglas med `scale.y = riktning` per
// kroppsdel. Vändningen döljs i ett litet vändhopp (så gör riktiga grodor också).
//
// Koordinater: kanonisk groda tittar åt +x, y nedåt. En kroppsdels långa axel ligger längs dess
// lokala x. Vinklar i radianer, medurs positivt (skärmens y nedåt).
import { Container, Graphics } from 'pixi.js'
import { Matter } from '../../lib/physics.js'
import { sphereFill } from '../../lib/form.js'

const { Body, Constraint, Composite } = Matter

const TAU = Math.PI * 2
const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Grodans färger — en grön lövgroda med ljus buk och mörka tvärband på benen.
const F = {
  bas: 0x69bd4c,
  mork: 0x2c6629,
  rygg: 0x4f9e3c,
  prick: 0x356f2e,
  band: 0x3f7c35,
  buk: 0xf1ecbf,
  hals: 0xe3eeb0,
  tass: 0x9fd77a,
  simhud: 0x8fcf6c,
  ogon: 0xf2c440,
  mun: 0xc2455e,
  sack: 0xf6f3d6,
}

// Kroppsdelarna: längd (lokal x) × tjocklek, täthet, avrundning. Massan blir ~18 (matter-enheter).
const DELAR = {
  kropp: { w: 86, h: 52, d: 0.0016, r: 22 },
  huvud: { w: 64, h: 46, d: 0.0014, r: 20 },
  overarm: { w: 26, h: 12, d: 0.0012, r: 5 },
  underarm: { w: 26, h: 11, d: 0.0012, r: 5 },
  lar: { w: 44, h: 20, d: 0.0014, r: 9 },
  vad: { w: 44, h: 15, d: 0.0012, r: 7 },
  fot: { w: 48, h: 10, d: 0.0012, r: 4 },
}

// Lederna: förälder, barn, ankare i förälderns och barnets lokala rum, vinkelgränser [lo, hi]
// för (barn − förälder) sett från en högervänd groda.
//   Sittposen (kontroll av tabellen): kroppen lutar −0,45 (framänden upp); låret pekar framåt-
//   nedåt (0,25), underbenet bakåt (2,79), foten framåt längs marken (0,05) — grodans Z-vikning.
const LEDER = [
  { namn: 'nacke', a: 'kropp', b: 'huvud', pa: [36, -8], pb: [-22, 6], lo: -0.35, hi: 0.6, k: 0.16, c: 0.4 },
  { namn: 'axelN', a: 'kropp', b: 'overarmN', pa: [24, 14], pb: [-11, 0], lo: -0.5, hi: 2.5, k: 0.22, c: 0.5 },
  { namn: 'armbageN', a: 'overarmN', b: 'underarmN', pa: [11, 0], pb: [-11, 0], lo: -1.8, hi: 0.5, k: 0.22, c: 0.5 },
  { namn: 'axelB', a: 'kropp', b: 'overarmB', pa: [20, 12], pb: [-11, 0], lo: -0.5, hi: 2.5, k: 0.22, c: 0.5 },
  { namn: 'armbageB', a: 'overarmB', b: 'underarmB', pa: [11, 0], pb: [-11, 0], lo: -1.8, hi: 0.5, k: 0.22, c: 0.5 },
  { namn: 'hoftN', a: 'kropp', b: 'larN', pa: [-34, 6], pb: [-19, 0], lo: 0.3, hi: 3.1, k: 0.2, c: 0.45 },
  { namn: 'knaN', a: 'larN', b: 'vadN', pa: [19, 0], pb: [-19, 0], lo: -0.1, hi: 2.9, k: 0.2, c: 0.45 },
  { namn: 'fotledN', a: 'vadN', b: 'fotN', pa: [19, 0], pb: [-21, 0], lo: -2.95, hi: 0.35, k: 0.18, c: 0.42 },
  { namn: 'hoftB', a: 'kropp', b: 'larB', pa: [-30, 4], pb: [-19, 0], lo: 0.3, hi: 3.1, k: 0.2, c: 0.45 },
  { namn: 'knaB', a: 'larB', b: 'vadB', pa: [19, 0], pb: [-19, 0], lo: -0.1, hi: 2.9, k: 0.2, c: 0.45 },
  { namn: 'fotledB', a: 'vadB', b: 'fotB', pa: [19, 0], pb: [-21, 0], lo: -2.95, hi: 0.35, k: 0.18, c: 0.42 },
]
for (const l of LEDER) l.mitt = (l.lo + l.hi) / 2

// Målposer: relativa ledvinklar (högervänd). N och B delar pose; den bortre sidan får en liten
// förskjutning i `_malFor` så benen inte ligger exakt på varandra i bild.
const POSER = {
  sitt: { nacke: 0.38, axel: 1.85, armbage: -0.15, hoft: 0.75, kna: 2.8, fotled: -2.88 },
  hopp: { nacke: -0.1, axel: 0.35, armbage: -0.2, hoft: 2.85, kna: 0.08, fotled: -0.1 },
  flyg: { nacke: 0.05, axel: 0.55, armbage: -0.45, hoft: 2.45, kna: 0.45, fotled: -0.4 },
  landa: { nacke: 0.25, axel: 1.25, armbage: -0.55, hoft: 1.05, kna: 1.7, fotled: -1.9 },
  simIn: { nacke: 0.25, axel: 1.4, armbage: -0.9, hoft: 1.0, kna: 2.4, fotled: -2.4 },
  simUt: { nacke: 0.05, axel: 0.5, armbage: -0.3, hoft: 2.8, kna: 0.12, fotled: -0.15 },
  dingla: { nacke: 0.35, axel: 1.7, armbage: -0.7, hoft: 1.9, kna: 1.25, fotled: -1.3 },
}

// Bålens mål-vinkel när grodan sitter (framänden upp).
const SITT_VINKEL = -0.62
const HUVUD_SKALA = 1.12
export const GRODA_MASSA_UNGEFAR = 18

// ── Ritning av kroppsdelarna (lokalt rum, högervänd) ────────────────────────────────────────

function ritaKropp(g, mage) {
  const b = 4 + mage * 40 // bukens utbuktning
  g.clear()
  // Skugga/under-ton först (bortre bukkanten), sedan huvudformen.
  g.moveTo(40, -16)
    .bezierCurveTo(20, -30, -4, -35, -20, -30)
    .bezierCurveTo(-36, -26, -48, -12, -46, 2)
    .bezierCurveTo(-45, 14, -36, 22 + b * 0.3, -24, 25 + b * 0.5)
    .bezierCurveTo(-10, 28 + b, 20, 29 + b * 0.8, 36, 18)
    .bezierCurveTo(46, 10, 48, -8, 40, -16)
    .closePath()
    .fill(sphereFill(F.bas, { lightX: 0.4, lightY: 0.22, spread: 0.62, dark: 0.3 }))
    .stroke({ width: 3, color: F.mork, alpha: 0.9, join: 'round' })
  // Ljus buk.
  g.moveTo(-30, 17)
    .bezierCurveTo(-14, 25 + b, 18, 27 + b * 0.8, 34, 15)
    .bezierCurveTo(20, 11 + b * 0.25, -8, 10 + b * 0.25, -30, 17)
    .closePath()
    .fill({ color: F.buk, alpha: 0.95 })
  // Ryggen mörkare, med prickar och den ljusa sidolisten.
  g.moveTo(38, -15)
    .bezierCurveTo(20, -29, -4, -33, -20, -29)
    .bezierCurveTo(-34, -25, -44, -14, -44, -4)
    .bezierCurveTo(-30, -14, 10, -18, 38, -15)
    .closePath()
    .fill({ color: F.rygg, alpha: 0.55 })
  g.moveTo(36, -11).bezierCurveTo(14, -18, -18, -18, -38, -6).stroke({ width: 3, color: 0xb9e39a, alpha: 0.55, cap: 'round' })
  for (const [x, y, rx, ry] of [[-14, -24, 7, 5], [6, -24, 5, 4], [-31, -14, 6, 4], [20, -19, 4, 3], [-24, -4, 4, 3]]) {
    g.ellipse(x, y, rx, ry).fill({ color: F.prick, alpha: 0.75 })
  }
}

function ritaHuvud(v) {
  // v = { bakOga, huvud, munInre, kake, sack, oga, lock, pupill } — alla skapade i _byggVyer.
  // Bortre ögat (bakom huvudet): mindre och mörkare.
  v.bakOga.clear()
  v.bakOga.circle(0, 0, 12.5).fill(sphereFill(F.ogon, { lightX: 0.35, lightY: 0.3, dark: 0.45 })).stroke({ width: 2.5, color: F.mork })
  v.bakOga.ellipse(1.5, 0.5, 5.6, 3.3).fill(0x1b1b1b)
  v.bakOga.tint = 0xb8c4a8

  const g = v.huvud
  g.clear()
  // Övre huvudet: nacke → hjässa → nos → munlinjen tillbaka.
  g.moveTo(-31, 10)
    .bezierCurveTo(-35, -6, -24, -19, -6, -19)
    .bezierCurveTo(12, -19, 28, -12, 33, -2)
    .bezierCurveTo(36, 4, 33, 9, 27, 9)
    .bezierCurveTo(14, 11, 0, 9, -12, 6)
    .bezierCurveTo(-20, 7, -26, 10, -31, 10)
    .closePath()
    .fill(sphereFill(F.bas, { lightX: 0.45, lightY: 0.2, spread: 0.6, dark: 0.28 }))
    .stroke({ width: 3, color: F.mork, alpha: 0.9, join: 'round' })
  // Trumhinnan bakom ögat.
  g.circle(-17, -1, 8).fill({ color: F.rygg, alpha: 0.9 }).stroke({ width: 2, color: F.mork, alpha: 0.6 })
  g.circle(-17, -1, 4.5).fill({ color: 0x8ccd68, alpha: 0.7 })
  // Näsborre och en liten ljus nos-glans.
  g.ellipse(25, -7, 2.4, 1.6).fill(F.mork)
  g.ellipse(14, -13, 7, 3).fill({ color: 0xffffff, alpha: 0.22 })
  // Munlinjen — ett brett, glatt grodleende som slutar i en uppåtböjd mungipa.
  g.moveTo(29, 8).bezierCurveTo(14, 11, 0, 9, -12, 6).bezierCurveTo(-15, 5, -16, 3, -15, 1)
    .stroke({ width: 2.6, color: F.mork, cap: 'round', join: 'round' })

  // Munnens insida (syns bara när käken fälls ned).
  v.munInre.clear()
  v.munInre.moveTo(-12, 6).bezierCurveTo(4, 8, 18, 9, 28, 8).bezierCurveTo(24, 20, 6, 24, -8, 14).closePath().fill(F.mun)
  v.munInre.ellipse(8, 14, 9, 4).fill({ color: 0xe57c94, alpha: 0.9 })

  // Underkäken + den bleka strupen, med pivå i mungipan.
  const k = v.kake
  k.clear()
  k.moveTo(0, 0) // mungipan (-12, 6) i huvudets rum
    .bezierCurveTo(14, 3, 28, 3, 40, 2)
    .bezierCurveTo(44, 6, 38, 11, 30, 13)
    .bezierCurveTo(18, 17, -4, 16, -15, 8)
    .bezierCurveTo(-11, 5, -6, 2, 0, 0)
    .closePath()
    .fill(F.hals)
    .stroke({ width: 2.5, color: F.mork, alpha: 0.85, join: 'round' })

  // Halssäcken (kvackbubblan) — skalas upp när grodan kvackar.
  v.sack.clear()
  v.sack.circle(0, 10, 13).fill({ color: F.sack, alpha: 0.95 }).stroke({ width: 2, color: 0xd6d2a6 })
  v.sack.ellipse(-4, 5, 5, 3).fill({ color: 0xffffff, alpha: 0.7 })

  // Nära ögat: gyllene iris, liggande pupill, glans. Pupillen är ett eget barn (följer målet).
  v.oga.clear()
  v.oga.circle(0, 0, 15).fill(sphereFill(F.ogon, { lightX: 0.35, lightY: 0.28, dark: 0.4 })).stroke({ width: 3, color: F.mork })
  v.oga.circle(0, 0, 11.5).stroke({ width: 1.2, color: 0xc9951c, alpha: 0.7 })
  v.pupill.clear()
  v.pupill.ellipse(0, 0, 7.5, 4.4).fill(0x151515)
  v.pupill.circle(-3, -2.4, 2).fill({ color: 0xffffff, alpha: 0.9 })
  v.glans.clear()
  v.glans.circle(-5.5, -6, 3.6).fill({ color: 0xffffff, alpha: 0.9 })
  // Ögonlocket: ritat nedåt från ögats topp, skalas i y (0,25 vila → 1 stängt).
  v.lock.clear()
  v.lock.ellipse(0, 15.5, 16.5, 16).fill(F.bas)
  v.lock.moveTo(-16, 15.5).bezierCurveTo(-11, 32, 11, 32, 16, 15.5).stroke({ width: 2.4, color: F.mork, alpha: 0.9 })
}

// En lem-kapsel med tvärband.
function ritaLem(g, len, th, band = 2, farg = F.bas) {
  g.clear()
  g.roundRect(-len / 2 - th * 0.2, -th / 2, len + th * 0.4, th, th / 2)
    .fill(sphereFill(farg, { lightX: 0.4, lightY: 0.25, spread: 0.6, dark: 0.3 }))
    .stroke({ width: 2.5, color: F.mork, alpha: 0.9 })
  for (let i = 0; i < band; i++) {
    const x = -len * 0.22 + (i * len * 0.44) / Math.max(1, band - 1)
    g.moveTo(x - 3, -th / 2 + 2).bezierCurveTo(x + 1, -th * 0.15, x + 1, th * 0.15, x - 3, th / 2 - 2)
      .stroke({ width: Math.max(3, th * 0.28), color: F.band, alpha: 0.7, cap: 'round' })
  }
}

function ritaLar(g) {
  g.clear()
  // Köttigt lår: bredare mot höften.
  g.moveTo(-24, -9).bezierCurveTo(-10, -14, 12, -11, 25, -5).bezierCurveTo(29, 0, 27, 6, 22, 7)
    .bezierCurveTo(8, 10, -12, 13, -24, 8).bezierCurveTo(-30, 4, -30, -5, -24, -9).closePath()
    .fill(sphereFill(F.bas, { lightX: 0.45, lightY: 0.2, spread: 0.6, dark: 0.32 }))
    .stroke({ width: 2.8, color: F.mork, alpha: 0.9, join: 'round' })
  for (const x of [-8, 9]) {
    g.moveTo(x - 2, -10).bezierCurveTo(x + 3, -3, x + 3, 3, x - 1, 9).stroke({ width: 4.5, color: F.band, alpha: 0.7, cap: 'round' })
  }
}

function ritaFot(g) {
  g.clear()
  // Simhuden mellan tårna först, sedan vristen och tårna ovanpå.
  g.moveTo(2, -4).lineTo(25, -9).lineTo(29, 0).lineTo(25, 9).lineTo(2, 4).closePath().fill({ color: F.simhud, alpha: 0.85 })
    .stroke({ width: 1.5, color: F.mork, alpha: 0.4 })
  g.roundRect(-27, -5, 33, 10, 5).fill(sphereFill(F.bas, { lightX: 0.4, lightY: 0.25, dark: 0.3 })).stroke({ width: 2.4, color: F.mork, alpha: 0.9 })
  g.moveTo(-12, -4.5).bezierCurveTo(-9, -1, -9, 1, -12, 4.5).stroke({ width: 3.5, color: F.band, alpha: 0.6, cap: 'round' })
  for (const [x, y] of [[25, -9], [29, 0], [25, 9]]) {
    g.moveTo(3, y * 0.3).lineTo(x, y).stroke({ width: 4, color: F.bas, cap: 'round' })
    g.moveTo(3, y * 0.3).lineTo(x, y).stroke({ width: 1.2, color: F.mork, alpha: 0.45, cap: 'round' })
    g.circle(x, y, 3.4).fill(F.tass).stroke({ width: 1.2, color: F.mork, alpha: 0.7 })
  }
}

function ritaUnderarm(g) {
  ritaLem(g, 26, 11, 1)
  // Handen: tre fingrar med runda sugkuddar (inga simhudar fram).
  for (const [x, y] of [[20, -5], [23, 0], [20, 5]]) {
    g.moveTo(11, y * 0.2).lineTo(x, y).stroke({ width: 3.4, color: F.bas, cap: 'round' })
    g.circle(x, y, 2.9).fill(F.tass).stroke({ width: 1.1, color: F.mork, alpha: 0.7 })
  }
}

export class Groda {
  // phys: PhysicsWorld · lager: { bak, mitt, fram } (Containers i rätt ordning, ägs av spelet)
  constructor(phys, lager, { x = 400, y = 480, riktning = 1 } = {}) {
    this._phys = phys
    this._alive = true
    this.riktning = riktning
    this.kraft = 1 // muskelkraft 0…1
    this._kraftPaus = 0 // steg kvar innan musklerna börjar samla sig efter en smäll
    this.pose = 'sitt'
    this.lage = 'sitt' // sitt | luft | vatten | slak | dingla
    this.mage = 0 // 0…1, växer för varje insekt
    this._t = 0
    this._mark = 0 // steg sedan senaste markkontakt (0 = står på något nu)
    this._simFas = 0
    this._poseTid = 0 // steg kvar av en tvingad pose (hoppets frånskjut)
    this._tvingadPose = null
    this.ytY = 560

    this._byggKroppar(x, y)
    this._byggVyer(lager)
    this.stall('sitt', x, y)
  }

  // ── Fysik ────────────────────────────────────────────────────────────────────────────────

  _byggKroppar(x, y) {
    this._grupp = Body.nextGroup(true) // negativ grupp: delarna krockar aldrig med varandra
    this.b = {}
    const skapa = (namn, typ) => {
      const d = DELAR[typ]
      const body = this._phys.rectangle(x, y, d.w, d.h, {
        chamfer: { radius: d.r },
        density: d.d,
        friction: 0.7,
        frictionStatic: 0.9,
        frictionAir: 0.012,
        restitution: 0.12,
        collisionFilter: { group: this._grupp },
        label: 'groda',
      })
      body.plugin = body.plugin || {}
      body.plugin.grodDel = namn
      this.b[namn] = body
      return body
    }
    skapa('kropp', 'kropp')
    skapa('huvud', 'huvud')
    for (const s of ['N', 'B']) {
      skapa('overarm' + s, 'overarm')
      skapa('underarm' + s, 'underarm')
      skapa('lar' + s, 'lar')
      skapa('vad' + s, 'vad')
      skapa('fot' + s, 'fot')
    }
    this.delar = Object.values(this.b)
    this._delSet = new Set(this.delar)
    this.massa = this.delar.reduce((s, b) => s + b.mass, 0)

    this.leder = LEDER.map((l) => {
      const A = this.b[l.a]
      const B = this.b[l.b]
      const c = Constraint.create({
        bodyA: A,
        bodyB: B,
        pointA: { x: l.pa[0], y: l.pa[1] },
        pointB: { x: l.pb[0], y: l.pb[1] },
        length: 0,
        stiffness: 0.95,
        damping: 0.08,
        label: 'grodled',
      })
      Composite.add(this._phys.world, c)
      return { ...l, A, B, led: c, typ: l.namn.replace(/[NB]$/, ''), sida: l.namn.endsWith('B') ? 'B' : 'N' }
    })
  }

  ar(body) {
    return this._delSet.has(body)
  }

  // Lägg alla kroppar i en pose via framåtkinematik från bålen, i läget (x, y) = bålens mitt.
  stall(pose, x, y, bolVinkel = SITT_VINKEL) {
    const P = POSER[pose] || POSER.sitt
    const f = this.riktning
    const vinklar = { kropp: bolVinkel }
    const lagen = { kropp: { x: 0, y: 0 } }
    for (const l of this.leder) {
      const rel = this._malFor(l, P)
      const aP = vinklar[l.a]
      const aB = aP + rel
      vinklar[l.b] = aB
      const pP = lagen[l.a]
      const jx = pP.x + Math.cos(aP) * l.pa[0] - Math.sin(aP) * l.pa[1]
      const jy = pP.y + Math.sin(aP) * l.pa[0] + Math.cos(aP) * l.pa[1]
      lagen[l.b] = { x: jx - (Math.cos(aB) * l.pb[0] - Math.sin(aB) * l.pb[1]), y: jy - (Math.sin(aB) * l.pb[0] + Math.cos(aB) * l.pb[1]) }
    }
    for (const [namn, body] of Object.entries(this.b)) {
      const p = lagen[namn]
      const a = vinklar[namn]
      Body.setPosition(body, { x: x + p.x * f, y: y + p.y })
      Body.setAngle(body, f === 1 ? a : Math.PI - a)
      Body.setVelocity(body, { x: 0, y: 0 })
      Body.setAngularVelocity(body, 0)
    }
    this._synkaLeder()
    this.pose = pose
  }

  // Sätt ledernas ankarpunkter ur nuvarande vinklar (efter stall/vänd — matter roterar dem
  // annars bara inkrementellt från den vinkel de skapades vid).
  _synkaLeder() {
    const f = this.riktning
    for (const l of this.leder) {
      const rot = (b, p) => {
        const a = b.angle
        const px = p[0]
        const py = p[1] * f
        return { x: Math.cos(a) * px - Math.sin(a) * py, y: Math.sin(a) * px + Math.cos(a) * py }
      }
      l.led.pointA = rot(l.A, l.pa)
      l.led.angleA = l.A.angle
      l.led.pointB = rot(l.B, l.pb)
      l.led.angleB = l.B.angle
    }
  }

  _malFor(l, P) {
    let v = P[l.typ] ?? 0
    if (l.sida === 'B') v += l.typ === 'hoft' ? -0.08 : l.typ === 'kna' ? 0.06 : 0.04
    return v
  }

  // Den relativa ledvinkeln sedd från en högervänd groda, centrerad kring ledens mitt.
  _rel(l) {
    return wrap(this.riktning * (l.B.angle - l.A.angle) - l.mitt)
  }

  get pos() {
    return this.b.kropp.position
  }

  get fart() {
    const v = this.b.kropp.velocity
    return Math.hypot(v.x, v.y)
  }

  // Munnens läge i världen (där tungan kommer ut).
  mun() {
    const h = this.b.huvud
    const a = h.angle
    const px = 27 * HUVUD_SKALA
    const py = 8 * HUVUD_SKALA * this.riktning
    return { x: h.position.x + Math.cos(a) * px - Math.sin(a) * py, y: h.position.y + Math.sin(a) * px + Math.cos(a) * py }
  }

  get iVatten() {
    return this.b.kropp.position.y > this.ytY - 6
  }

  get paMark() {
    return this._mark < 4
  }

  // En hård smäll: musklerna slaknar (ragdoll) och samlar sig igen.
  slappna(styrka = 1) {
    this.kraft = Math.min(this.kraft, 0.08 + (1 - styrka) * 0.25)
    this._kraftPaus = Math.round(18 + styrka * 22)
    this._tvingadPose = null
    this._poseTid = 0
  }

  // Tungan (eller något annat) drar i grodan: kraften delas så att huvudet LEDER (en andel
  // läggs vid huvudet) och resten fördelas efter massa — grodan åker som en kropp men med
  // huvudet först och benen släpande efter. fx/fy i matters kraftenheter.
  dra(fx, fy, huvudAndel = 0.5) {
    const h = this.b.huvud
    Body.applyForce(h, h.position, { x: fx * huvudAndel, y: fy * huvudAndel })
    const rest = 1 - huvudAndel
    for (const b of this.delar) {
      const s = (b.mass / this.massa) * rest
      Body.applyForce(b, b.position, { x: fx * s, y: fy * s })
    }
  }

  // Ge alla delar samma fart (hopp, knuff). Behåller formen.
  knuffa(vx, vy, blanda = 1) {
    for (const b of this.delar) {
      Body.setVelocity(b, { x: b.velocity.x * (1 - blanda) + vx * blanda, y: b.velocity.y * (1 - blanda) + vy * blanda })
    }
  }

  // Hoppa (bara från något eller ur vattnet). Returnerar true om hoppet blev av.
  hoppa(dirX = this.riktning) {
    const iV = this.iVatten
    if (!this.paMark && !iV) return false
    if (Math.sign(dirX) !== this.riktning && this.paMark) this.vand()
    const s = Math.sign(dirX) || this.riktning
    this.kraft = Math.max(this.kraft, 0.9)
    this._kraftPaus = 0
    this._tvingadPose = 'hopp'
    this._poseTid = 14
    if (iV) this.knuffa(s * 3.6, -9.6, 1)
    else this.knuffa(s * 5.2, -11.8, 1)
    // En liten extra vridning bakåt på bålen så den reser sig i hoppet.
    Body.setAngularVelocity(this.b.kropp, -0.03 * s)
    this._mark = 99
    return true
  }

  // Spegla grodan i x kring bålens mitt (se huvudet i filen).
  vand() {
    const px = this.b.kropp.position.x
    for (const b of this.delar) {
      const nx = 2 * px - b.position.x
      const vx = -b.velocity.x
      const vy = b.velocity.y
      const w = -b.angularVelocity
      Body.setPosition(b, { x: nx, y: b.position.y })
      Body.setAngle(b, Math.PI - b.angle)
      Body.setVelocity(b, { x: vx, y: vy })
      Body.setAngularVelocity(b, w)
    }
    this.riktning = -this.riktning
    this._synkaLeder()
    for (const v of this._delVyer) if (!v.view.destroyed) v.view.scale.y = this.riktning
  }

  // Flytta hela grodan (respawn). Läget = bålens mitt.
  teleportera(x, y, riktning = this.riktning) {
    if (riktning !== this.riktning) {
      this.riktning = riktning
      for (const v of this._delVyer) if (!v.view.destroyed) v.view.scale.y = this.riktning
    }
    this.kraft = 1
    this._kraftPaus = 0
    this._tvingadPose = null
    this.stall('sitt', x, y)
  }

  // Ett fast fysiksteg: kontakt, läge, pose, muskler, gränser, bålstöd, fartspärr.
  steg() {
    if (!this._alive) return
    this._t++
    this._kollaKontakt()

    const iV = this.iVatten
    if (this._kraftPaus > 0) this._kraftPaus--
    else this.kraft = Math.min(1, this.kraft + 1 / 70)

    if (this._poseTid > 0 && --this._poseTid === 0) this._tvingadPose = null

    // Välj läge + pose.
    if (this.lage === 'dingla') this.pose = 'dingla'
    else if (this.kraft < 0.45) this.lage = 'slak'
    else if (iV) this.lage = 'vatten'
    else if (this.paMark) this.lage = 'sitt'
    else this.lage = 'luft'

    if (this._tvingadPose) this.pose = this._tvingadPose
    else if (this.lage === 'sitt') this.pose = 'sitt'
    else if (this.lage === 'luft') this.pose = this.b.kropp.velocity.y < 1.5 ? 'flyg' : 'landa'
    else if (this.lage === 'vatten') {
      this._simFas += 1 / 50
      this.pose = Math.sin(this._simFas * TAU) > 0 ? 'simUt' : 'simIn'
    }

    this._muskler()
    this._grans()
    if (this.paMark && this.kraft > 0.5 && this.lage === 'sitt' && !this._tvingadPose) this._balstod()
    if (this.lage === 'vatten' && this.kraft > 0.5) this._simStod()

    // Fartspärr: inget får tunnla genom en tunn kant mellan två steg.
    for (const b of this.delar) {
      const v = b.velocity
      const s = Math.hypot(v.x, v.y)
      if (s > 26) Body.setVelocity(b, { x: (v.x / s) * 26, y: (v.y / s) * 26 })
      if (Math.abs(b.angularVelocity) > 0.6) Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.6)
    }
  }

  _kollaKontakt() {
    this._mark++
    const par = this._phys.engine.pairs.list
    for (let i = 0; i < par.length; i++) {
      const p = par[i]
      if (!p.isActive || p.isSensor) continue
      const a = p.bodyA.parent || p.bodyA
      const b = p.bodyB.parent || p.bodyB
      const aG = this._delSet.has(a)
      const bG = this._delSet.has(b)
      if (aG === bG) continue
      const annan = aG ? b : a
      if (annan.label === 'wall') continue
      this._mark = 0
      this.underlag = annan
      return
    }
  }

  // PD mot målposen, som ett moment-PAR på barn och förälder (inre krafter).
  _muskler() {
    const k = this.kraft
    if (k <= 0.02) return
    const P = POSER[this.pose] || POSER.sitt
    const f = this.riktning
    for (const l of this.leder) {
      const d = this._rel(l)
      const mal = wrap(this._malFor(l, P) - l.mitt)
      const e = clamp(mal - d, -1.2, 1.2)
      const wRel = f * (l.B.angularVelocity - l.A.angularVelocity)
      const styv = this._tvingadPose === 'hopp' ? 1.6 : 1
      const delta = k * (l.k * styv * e - l.c * wRel)
      this._vridPar(l, delta)
    }
  }

  _grans() {
    const f = this.riktning
    for (const l of this.leder) {
      const d = this._rel(l)
      const lo = l.lo - l.mitt
      const hi = l.hi - l.mitt
      const over = d > hi ? d - hi : d < lo ? d - lo : 0
      if (!over) continue
      const wRel = f * (l.B.angularVelocity - l.A.angularVelocity)
      const mal = -over * 0.35
      if ((over > 0 && wRel > mal) || (over < 0 && wRel < mal)) this._vridPar(l, mal - wRel)
    }
  }

  // Ändra den relativa vinkelhastigheten (högervänd) med delta, fördelat efter tröghet.
  _vridPar(l, delta) {
    const iA = l.A.inverseInertia
    const iB = l.B.inverseInertia
    const sum = iA + iB
    if (!(sum > 0)) return
    const J = delta / sum
    const f = this.riktning
    Body.setAngularVelocity(l.B, l.B.angularVelocity + f * J * iB)
    Body.setAngularVelocity(l.A, l.A.angularVelocity - f * J * iA)
  }

  // Bålstödet: marken tar emot — håll sittvinkeln, vänd en groda som landat på rygg.
  _balstod() {
    const kr = this.b.kropp
    const aR = this.riktning === 1 ? kr.angle : Math.PI - kr.angle
    const e = wrap(SITT_VINKEL - aR)
    const wR = this.riktning * kr.angularVelocity
    const d = clamp(0.05 * e - 0.25 * wR, -0.05, 0.05) * this.kraft
    Body.setAngularVelocity(kr, kr.angularVelocity + this.riktning * d)
    // En groda som ligger på rygg får en liten skuts uppåt så benen hinner under den.
    if (Math.abs(e) > 1.9 && this._t % 40 === 0) {
      for (const b of this.delar) Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y - 3.2 })
    }
  }

  // I vattnet: håll bålen vågrät, huvudet uppe; varje utspark ger ett litet simtag framåt.
  _simStod() {
    const kr = this.b.kropp
    const aR = this.riktning === 1 ? kr.angle : Math.PI - kr.angle
    const e = wrap(-0.15 - aR)
    const wR = this.riktning * kr.angularVelocity
    Body.setAngularVelocity(kr, kr.angularVelocity + this.riktning * clamp(0.03 * e - 0.2 * wR, -0.03, 0.03))
  }

  // Ett simtag i riktning dirX (anropas av spelet i takt med simcykeln när grodan ska någonstans).
  simtag(dirX) {
    for (const b of this.delar) {
      Body.applyForce(b, b.position, { x: (b.mass * 0.9 * Math.sign(dirX)) / 277.78, y: (-b.mass * 0.25) / 277.78 })
    }
  }

  // ── Bild ────────────────────────────────────────────────────────────────────────────────

  _byggVyer(lager) {
    this._lager = lager
    this._delVyer = []
    const del = (namn, parent, tint = 0xffffff) => {
      const view = new Container()
      view.eventMode = 'none'
      if (tint !== 0xffffff) view.tint = tint
      parent.addChild(view)
      this._delVyer.push({ body: this.b[namn], view })
      return view
    }
    const BORT = 0xa9bb9a
    // Bortre lemmar bakom kroppen.
    const bakLar = del('larB', lager.bak, BORT)
    const bakVad = del('vadB', lager.bak, BORT)
    const bakFot = del('fotB', lager.bak, BORT)
    const bakOver = del('overarmB', lager.bak, BORT)
    const bakUnder = del('underarmB', lager.bak, BORT)
    for (const [v, fn] of [[bakFot, ritaFot], [bakVad, (g) => ritaLem(g, 44, 15, 2)], [bakLar, ritaLar], [bakOver, (g) => ritaLem(g, 26, 12, 1)], [bakUnder, ritaUnderarm]]) {
      const g = new Graphics()
      fn(g)
      v.addChild(g)
    }
    // Bålen.
    const kroppV = del('kropp', lager.mitt)
    this._kroppG = new Graphics()
    kroppV.addChild(this._kroppG)
    ritaKropp(this._kroppG, 0)
    this._ritadMage = 0

    // Nära lemmar framför bålen (underben/fot först, låret över).
    const narVad = del('vadN', lager.mitt)
    const narFot = del('fotN', lager.mitt)
    const narLar = del('larN', lager.mitt)
    const narOver = del('overarmN', lager.fram)
    const narUnder = del('underarmN', lager.fram)
    for (const [v, fn] of [[narFot, ritaFot], [narVad, (g) => ritaLem(g, 44, 15, 2)], [narLar, ritaLar], [narOver, (g) => ritaLem(g, 26, 12, 1)], [narUnder, ritaUnderarm]]) {
      const g = new Graphics()
      fn(g)
      v.addChild(g)
    }

    // Huvudet — överst, med levande delar.
    const huvudV = del('huvud', lager.fram)
    const h = {
      bakOga: new Graphics(),
      munInre: new Graphics(),
      huvud: new Graphics(),
      kakeC: new Container(),
      kake: new Graphics(),
      sackC: new Container(),
      sack: new Graphics(),
      ogaC: new Container(),
      oga: new Graphics(),
      pupill: new Graphics(),
      glans: new Graphics(),
      lockC: new Container(),
      lock: new Graphics(),
      yrC: new Container(),
    }
    h.bakOga.position.set(-10, -23)
    h.kakeC.position.set(-12, 6)
    h.kakeC.addChild(h.kake)
    h.sackC.position.set(4, 12)
    h.sackC.addChild(h.sack)
    h.sackC.scale.set(0.2)
    h.sackC.alpha = 0
    h.ogaC.position.set(3, -21)
    h.lockC.position.set(0, -15.5)
    h.lockC.addChild(h.lock)
    h.ogaC.addChild(h.oga, h.pupill, h.glans, h.lockC)
    // Grodor har STORA huvuden: bilden skalas upp något kring kroppens mitt (kroppen själv
    // är oförändrad — munpunkten i mun() skalas med HUVUD_SKALA).
    const huvudInre = new Container()
    huvudInre.scale.set(HUVUD_SKALA)
    huvudInre.addChild(h.bakOga, h.munInre, h.huvud, h.sackC, h.kakeC, h.ogaC)
    huvudV.addChild(huvudInre)
    ritaHuvud(h)
    h.lockC.scale.y = 0.14
    this._h = h

    // Yrsel-stjärnor över huvudet efter en hård smäll (ritas i världsrum i fram-lagret).
    this._yr = new Container()
    this._yr.eventMode = 'none'
    this._yr.visible = false
    lager.fram.addChild(this._yr)
    this._yrStjarnor = []
    for (let i = 0; i < 3; i++) {
      const s = new Graphics()
      const pts = []
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 3.2 : 7.5
        const a = (k / 10) * TAU - Math.PI / 2
        pts.push(Math.cos(a) * r, Math.sin(a) * r)
      }
      s.poly(pts).fill(0xffe25a).stroke({ width: 1.5, color: 0xc98f12 })
      this._yr.addChild(s)
      this._yrStjarnor.push(s)
    }

    this._munOppen = 0 // 0…1 (mål)
    this._munNu = 0
    this._blink = 0 // >0 = blinkar
    this._nastaBlink = 2 + Math.random() * 3
    this._sackNu = 0
    this._sackMal = 0
    this._svalj = 0 // sväljningens fas (ögonen trycks ned)
    this._yrTid = 0
    this.tittMal = null
    for (const v of this._delVyer) v.view.scale.y = this.riktning
  }

  // Munnen: 0 stängd … 1 vidöppen (tungan ute, äter).
  oppnaMun(v) {
    this._munOppen = v
  }

  blinka() {
    this._blink = 0.16
  }

  kvacka() {
    this._sackMal = 1
    this._sackTid = 0.42
  }

  svalj() {
    this._svalj = 1
  }

  yr(sek = 1.4) {
    this._yrTid = sek
  }

  setMage(v) {
    this.mage = clamp(v, 0, 1)
  }

  // Per bildruta: vyer följer kroppar, ansiktet lever.
  rita(dtS) {
    if (!this._alive) return
    this._tS = (this._tS || 0) + dtS
    for (const d of this._delVyer) {
      const v = d.view
      if (v.destroyed) continue
      v.position.set(d.body.position.x, d.body.position.y)
      v.rotation = d.body.angle
    }
    // Magen: rita om bålen bara när den ändrats märkbart.
    const m = this._ritadMage + (this.mage - this._ritadMage) * Math.min(1, dtS * 4)
    if (Math.abs(m - this._ritadMage) > 0.01) {
      this._ritadMage = m
      ritaKropp(this._kroppG, m)
      // En mätt groda är RUND: hela bålen sväller lite, inte bara buken.
      this._kroppG.scale.set(1 + m * 0.24, 1 + m * 0.42)
    }
    const h = this._h
    // Munnen.
    this._munNu += (this._munOppen - this._munNu) * Math.min(1, dtS * 18)
    h.kakeC.rotation = this._munNu * 0.42
    // Halssäcken.
    if (this._sackTid > 0) {
      this._sackTid -= dtS
      if (this._sackTid <= 0) this._sackMal = 0
    }
    this._sackNu += (this._sackMal - this._sackNu) * Math.min(1, dtS * 14)
    h.sackC.alpha = this._sackNu > 0.03 ? 1 : 0
    h.sackC.scale.set(0.2 + this._sackNu * 1.05)
    // Blink + sväljning (grodor trycker ned ögonen när de sväljer).
    this._nastaBlink -= dtS
    if (this._nastaBlink <= 0) {
      this._blink = 0.16
      this._nastaBlink = 2 + Math.random() * 4
    }
    let lock = 0.14
    if (this._blink > 0) {
      this._blink -= dtS
      lock = 1
    }
    if (this.kraft < 0.3) lock = 0.72 // omtöcknad
    if (this._svalj > 0) {
      this._svalj = Math.max(0, this._svalj - dtS * 2.2)
      lock = Math.max(lock, 0.9)
    }
    h.lockC.scale.y += (lock - h.lockC.scale.y) * Math.min(1, dtS * 30)
    h.ogaC.position.y = -21 + Math.sin(Math.min(1, this._svalj) * Math.PI) * 7
    h.ogaC.scale.set(1 - Math.sin(Math.min(1, this._svalj) * Math.PI) * 0.12)
    // Pupillen tittar mot målet.
    const huvud = this.b.huvud
    if (this.tittMal) {
      const dx = this.tittMal.x - huvud.position.x
      const dy = this.tittMal.y - huvud.position.y
      const a = -huvud.angle
      let lx = Math.cos(a) * dx - Math.sin(a) * dy
      let ly = (Math.sin(a) * dx + Math.cos(a) * dy) * this.riktning
      const n = Math.hypot(lx, ly) || 1
      lx = (lx / n) * 5
      ly = (ly / n) * 4.5
      h.pupill.position.x += (lx - h.pupill.position.x) * Math.min(1, dtS * 12)
      h.pupill.position.y += (ly - h.pupill.position.y) * Math.min(1, dtS * 12)
    }
    // Yrsel.
    if (this._yrTid > 0) {
      this._yrTid -= dtS
      this._yr.visible = true
      const cx = huvud.position.x
      const cy = huvud.position.y - 42
      this._yrStjarnor.forEach((s, i) => {
        const a = this._tS * 5 + (i * TAU) / 3
        s.position.set(cx + Math.cos(a) * 26, cy + Math.sin(a) * 8)
        s.rotation = this._tS * 3
        s.alpha = Math.min(1, this._yrTid * 2)
      })
    } else if (this._yr.visible) this._yr.visible = false
  }

  // Hur långt en punkt ligger från grodans kropp eller huvud (för tryck PÅ grodan).
  avstand(x, y) {
    const k = this.b.kropp.position
    const h = this.b.huvud.position
    return Math.min(Math.hypot(x - k.x, y - k.y), Math.hypot(x - h.x, y - h.y))
  }

  // Något i grodan har rymt / blivit NaN?
  trasig() {
    for (const b of this.delar) {
      if (!Number.isFinite(b.position.x) || !Number.isFinite(b.position.y)) return true
    }
    const k = this.b.kropp.position
    for (const b of this.delar) if (Math.hypot(b.position.x - k.x, b.position.y - k.y) > 190) return true
    return false
  }

  destroy() {
    this._alive = false
    for (const l of this.leder || []) Composite.remove(this._phys.world, l.led)
    for (const b of this.delar || []) this._phys.removeBody(b)
    for (const d of this._delVyer || []) if (!d.view.destroyed) d.view.destroy({ children: true })
    if (this._yr && !this._yr.destroyed) this._yr.destroy({ children: true })
    this._delVyer = []
    this.leder = []
    this.delar = []
  }
}

export { POSER }
