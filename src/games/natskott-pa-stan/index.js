// Nätskott på stan — förstapersons-fysikspel (2–5 år). Barnet sitter i bilen och ser
// Spindel-Zackes egen arm nere i bild. Staden rullar förbi i tre parallaxdjup
// (hus-siluetter · gata med hus · vägkant) och skiftar gradvis stad→förort. Tryck
// VAR SOM HELST → ett nät skjuts från handen dit (thwip + rekyl <100 ms).
//
// TVÅ nätlägen via en STOR växelknapp (egna ritade ikoner — inga emojis):
//   • KLIBBNÄT — det som träffas fastnar där det är (statisk kropp, scrollar med).
//   • DRAGNÄT  — det som träffas dras hem till bilen och landar i BAKSÄTET, där de
//     insamlade sitter som små jublande huvuden (mottagaren).
//
// Mål som passerar (matter.js-kroppar, städas utanför bild): katt, hund, fågel,
// paket, blomkruka i fönsterbleck, ballong (flyter uppåt), monster. INGA människor.
// Fönster kan träffas → krossas i tecknat glitter-splitter, självlagas med skimmer
// efter ~5 s, ibland vinkar ett litet monster ur hålet. TAK: max 2 krossade rutor —
// därutöver studsar nätet av med en gnista.
//
// Uppdragsrundor som roterar och KRÄVER båda näten ("fånga katten med dragnätet" ·
// "fäst paketen" · "hämta 3 ballonger"); fri lek däremellan räknas också. Motgång
// MED TAK: vindby som blåser loss fästa paket (max 2 lösa samtidigt) + en skata som
// knycker ett paket (1 åt gången, går att näta ner). Sällsynt wow ~1 på 8: guldpaket
// som regnar stjärnor. Rund-final efter 3 uppdrag: HEMKOMSTEN — parallaxen saktar in,
// ett hus glider fram, bilen stannar och alla insamlade hoppar ur och firar.
//
// Fysikskala: matter-kraft = a·277,78 px/steg — här styrs allt i px/steg via
// setVelocity (kalibrerat, aldrig gissade krafter). Kroppar följer scrollen genom att
// Body.setPosition translaterar dem varje bildruta (positionPrev följer med → farten
// bevaras). Exit-säkert: _alive-flagga, ctx.later för ALLT fördröjt, proxy-tweens med
// destroyed-vakter, feedback.js för transienta partiklar.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { pop, wiggle, sparkle, puff, burst, floatText, ripple, bounceIn, breathe } from '../../lib/feedback.js'
import { lerpColor } from '../../lib/scene.js'
import { FONT, COLORS, shade, tint } from '../../lib/theme.js'
import { shuffle } from '../../lib/swedish.js'

// ---- Layout (designkoordinater 1280×720) -----------------------------------
const FAR_BASE = 470 // avlägsna siluetter står här
const STREET_TOP = 430 // bakomliggande gatuband (statiskt)
const SIDEWALK_TOP = 555
const SIDEWALK_BOT = 612
const NEAR_BOT = 664
const GROUND = 591 // fötternas vilonivå (fysikgolvets ovansida)
const CAR_TOP = 650 // dörrkantens överkant
const CAR_PULL = { x: 790, y: 640 } // hit dras kroppar av dragnätet
const SEAT = { x: 1150, y: 606 } // baksätets mitt (huvudena)
const ARM_PIVOT = { x: 505, y: 790 }
const HAND_LEN = 242

const MAX_TARGETS = 7 // tak på aktiva fysik-kroppar (perf + lagom täthet)
const MAX_BROKEN = 2 // tak: max 2 krossade rutor samtidigt
const HEAL_AFTER = 5.2 // s tills en ruta självlagas
const IDLE_DELAY = 6 // s utan tryck innan mjuk om-cue
const SHOT_MS = 85 // nätets flygtid hand → träffpunkt

// Kulissfärger (stad → förort)
const CITY_WALLS = [0x9aa3b5, 0xb08a75, 0x8f9aa8, 0xa88f9b, 0x93a89a]
const SUBURB_WALLS = [0xf2c94c, 0xe98fb0, 0x8fd0c8, 0xffb27a, 0xb5d98a]
const KATT_TINTS = [0xffb15c, 0x9aa2b0, 0xc9a06a]
const BALLONG_TINTS = [0xff6b6b, 0xffd35c, 0x4aa3df, 0xa78bfa, 0x5bbf6a, 0xff9ec4]
const MONSTER_TINTS = [0x9bd06b, 0xa78bfa, 0x57c8c3, 0xff9ec4]

// Pentatonisk skala för hemkomst-skutten + samla-plingar (stämda, aldrig blipp)
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

// ---- Ritade spelobjekt (P0 ASSETS: egen silhuett, aldrig emoji-i-ruta) -----

function drawKatt(tintC) {
  const c = new Container()
  const p = tintC ?? KATT_TINTS[(Math.random() * KATT_TINTS.length) | 0]
  const g = new Graphics()
  // svans (bakom kroppen, viftar uppåt)
  g.moveTo(30, 16).quadraticCurveTo(56, 4, 50, -22).stroke({ width: 9, color: shade(p, 0.14), cap: 'round' })
  // ben
  g.roundRect(-16, 24, 10, 16, 4).fill(shade(p, 0.1))
  g.roundRect(2, 24, 10, 16, 4).fill(shade(p, 0.1))
  g.roundRect(16, 24, 10, 16, 4).fill(shade(p, 0.1))
  // kropp
  g.ellipse(4, 14, 32, 20).fill(p)
  // huvud med öron
  g.moveTo(-40, -18).lineTo(-32, -38).lineTo(-22, -20).closePath().fill(p)
  g.moveTo(-18, -20).lineTo(-10, -38).lineTo(-2, -18).closePath().fill(p)
  g.moveTo(-36, -20).lineTo(-31, -32).lineTo(-26, -21).closePath().fill(0xf6c2d3)
  g.circle(-21, -6, 19).fill(tint(p, 0.08))
  // ansikte (vänd åt vänster — han går ditåt)
  g.circle(-29, -10, 3.4).fill(0x33291f)
  g.circle(-14, -10, 3.4).fill(0x33291f)
  g.moveTo(-24, -2).lineTo(-18, -2).lineTo(-21, 2).closePath().fill(0xe79ab0)
  g.moveTo(-21, 2).quadraticCurveTo(-27, 7, -31, 4).stroke({ width: 2.4, color: 0x6e5335, cap: 'round' })
  g.moveTo(-21, 2).quadraticCurveTo(-15, 7, -11, 4).stroke({ width: 2.4, color: 0x6e5335, cap: 'round' })
  g.moveTo(-38, -4).lineTo(-48, -6).moveTo(-38, 0).lineTo(-48, 2).stroke({ width: 1.6, color: 0x6e5335 })
  g.circle(-34, -1, 3.6).fill({ color: 0xff9ec4, alpha: 0.6 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawHund() {
  const c = new Container()
  const p = 0xa8744f
  const g = new Graphics()
  g.moveTo(34, 8).quadraticCurveTo(54, -2, 50, -20).stroke({ width: 10, color: shade(p, 0.12), cap: 'round' })
  g.roundRect(-20, 26, 12, 18, 5).fill(shade(p, 0.1))
  g.roundRect(0, 26, 12, 18, 5).fill(shade(p, 0.1))
  g.roundRect(18, 26, 12, 18, 5).fill(shade(p, 0.1))
  g.ellipse(6, 14, 36, 22).fill(p)
  g.ellipse(16, 8, 14, 10).fill(0xd9b28a) // fläck
  g.circle(-24, -10, 21).fill(p)
  // hängande öron
  g.ellipse(-42, -8, 8, 15).fill(shade(p, 0.2))
  g.ellipse(-7, -8, 8, 15).fill(shade(p, 0.2))
  g.circle(-31, -14, 3.6).fill(0x33291f)
  g.circle(-16, -14, 3.6).fill(0x33291f)
  g.ellipse(-25, -3, 6.5, 5).fill(0x4a3526) // nos
  g.moveTo(-25, 2).quadraticCurveTo(-25, 8, -18, 8).stroke({ width: 2.6, color: 0x4a3526, cap: 'round' })
  g.ellipse(-18, 12, 5, 7).fill(0xff8aa0) // tunga
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawFagel() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(18, 2).lineTo(34, -4).lineTo(32, 8).closePath().fill(0x3f78ad) // stjärt
  g.ellipse(0, 0, 19, 15).fill(0x5db1e8)
  g.ellipse(-2, 6, 11, 8).fill(0xfff3d6) // mage
  g.circle(-14, -6, 10).fill(0x5db1e8)
  g.moveTo(-23, -6).lineTo(-32, -3).lineTo(-23, -1).closePath().fill(0xffa63d) // näbb
  g.circle(-16, -8, 2.8).fill(0x33291f)
  g.eventMode = 'none'
  c.addChild(g)
  const wing = new Graphics()
  wing.ellipse(0, -7, 13, 8).fill(0x3f78ad)
  wing.position.set(3, -2)
  wing.pivot.set(0, 1)
  wing.eventMode = 'none'
  c.addChild(wing)
  c._wxWing = wing
  return c
}

function drawMonster(tintC) {
  const c = new Container()
  const p = tintC ?? MONSTER_TINTS[(Math.random() * MONSTER_TINTS.length) | 0]
  const g = new Graphics()
  // luddig rund kropp: taggig päls runt en boll
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r1 = 30
    const r2 = 39
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 + 2)
      .lineTo(Math.cos(a + 0.26) * r2, Math.sin(a + 0.26) * r2 + 2)
      .lineTo(Math.cos(a + 0.52) * r1, Math.sin(a + 0.52) * r1 + 2)
      .closePath().fill(shade(p, 0.12))
  }
  g.circle(0, 2, 31).fill(p)
  // små horn
  g.moveTo(-14, -26).lineTo(-10, -40).lineTo(-4, -27).closePath().fill(0xfff3d6)
  g.moveTo(14, -26).lineTo(10, -40).lineTo(4, -27).closePath().fill(0xfff3d6)
  // ett stort glatt öga + mun med en tand
  g.circle(0, -6, 12).fill(0xffffff)
  g.circle(2, -5, 6).fill(0x4a3f6b)
  g.circle(4, -7, 2).fill(0xffffff)
  g.moveTo(-12, 12).quadraticCurveTo(0, 22, 12, 12).stroke({ width: 3, color: 0x33291f, cap: 'round' })
  g.moveTo(-3, 15).lineTo(3, 15).lineTo(0, 21).closePath().fill(0xffffff)
  // fötter
  g.ellipse(-12, 38, 9, 5).fill(shade(p, 0.2))
  g.ellipse(12, 38, 9, 5).fill(shade(p, 0.2))
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawPaket(golden) {
  const c = new Container()
  const g = new Graphics()
  const w = 72
  const h = 60
  const box = golden ? 0xffd35c : 0xc98d5a
  const band = golden ? 0xff6b6b : 0x8a5a3b
  if (golden) g.circle(0, 0, 52).stroke({ width: 5, color: 0xfff3b0, alpha: 0.5 }) // glöd-ring
  g.roundRect(-w / 2, -h / 2, w, h, 7).fill(box).stroke({ width: 3, color: shade(box, 0.25) })
  g.rect(-w / 2, -h / 2 + 12, w, 5).fill({ color: 0xffffff, alpha: 0.25 }) // locklinje
  g.rect(-6, -h / 2, 12, h).fill(band)
  g.rect(-w / 2, -7, w, 12).fill(band)
  // rosett
  g.ellipse(-9, -h / 2 - 5, 8, 6).fill(band)
  g.ellipse(9, -h / 2 - 5, 8, 6).fill(band)
  g.circle(0, -h / 2 - 4, 4.5).fill(shade(band, 0.2))
  if (golden) {
    g.star?.(-20, 8, 5, 8, 3.6)
    if (g.star) g.fill(0xfff3b0)
    g.star?.(22, -12, 5, 6, 2.6)
    if (g.star) g.fill(0xfff3b0)
  } else {
    g.circle(-20, 10, 2.5).fill({ color: 0xffffff, alpha: 0.4 })
  }
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawKruka() {
  const c = new Container()
  const g = new Graphics()
  // blomma
  g.moveTo(0, -6).lineTo(0, -26).stroke({ width: 4, color: 0x49a657, cap: 'round' })
  g.ellipse(-7, -14, 7, 4).fill(0x5bbf6a)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2
    g.circle(Math.cos(a) * 9, -32 + Math.sin(a) * 9, 6.5).fill(0xff9ec4)
  }
  g.circle(0, -32, 5).fill(0xffd35c)
  // kruka
  g.roundRect(-26, -8, 52, 12, 4).fill(0xd4785a)
  g.moveTo(-22, 4).lineTo(22, 4).lineTo(16, 27).lineTo(-16, 27).closePath().fill(0xc4684a)
  g.ellipse(-8, 12, 5, 8).fill({ color: 0xffffff, alpha: 0.18 })
  g.eventMode = 'none'
  c.addChild(g)
  c._wxWing = g // hela krukan svajar lite (blomman följer)
  return c
}

function drawBallong(tintC) {
  const c = new Container()
  const p = tintC ?? BALLONG_TINTS[(Math.random() * BALLONG_TINTS.length) | 0]
  const g = new Graphics()
  g.moveTo(0, 28).quadraticCurveTo(10, 46, 2, 64).stroke({ width: 2.4, color: 0x8a8578 }) // snöre
  g.ellipse(0, -4, 26, 31).fill(p).stroke({ width: 2.5, color: shade(p, 0.18) })
  g.ellipse(-9, -14, 8, 12).fill({ color: 0xffffff, alpha: 0.45 })
  g.moveTo(-6, 24).lineTo(6, 24).lineTo(0, 32).closePath().fill(shade(p, 0.15)) // knut
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawSkata() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(20, -2).lineTo(54, 6).lineTo(48, 14).lineTo(18, 8).closePath().fill(0x394252) // lång stjärt
  g.ellipse(0, 0, 26, 16).fill(0x2b2f38)
  g.ellipse(4, 7, 13, 8).fill(0xf2f4f7) // vit mage
  g.ellipse(10, -6, 9, 5).fill(0xdfe6ee) // vit axelfläck
  g.circle(-20, -9, 12).fill(0x2b2f38)
  g.moveTo(-30, -9).lineTo(-41, -6).lineTo(-30, -3).closePath().fill(0x555d68) // näbb
  g.circle(-23, -11, 3).fill(0xffffff)
  g.circle(-22, -11, 1.8).fill(0x111318)
  g.moveTo(-4, 14).lineTo(-6, 24).moveTo(6, 14).lineTo(6, 24).stroke({ width: 3, color: 0x555d68, cap: 'round' }) // klor
  g.eventMode = 'none'
  c.addChild(g)
  const wing = new Graphics()
  wing.ellipse(4, -8, 18, 9).fill(0x394252)
  wing.ellipse(12, -8, 8, 5).fill(0x5b8fb5)
  wing.position.set(-2, -3)
  wing.eventMode = 'none'
  c.addChild(wing)
  c._wxWing = wing
  return c
}

const KIND_DRAW = {
  katt: () => drawKatt(),
  hund: () => drawHund(),
  fagel: () => drawFagel(),
  monster: () => drawMonster(),
  paket: () => drawPaket(false),
  guldpaket: () => drawPaket(true),
  kruka: () => drawKruka(),
  ballong: () => drawBallong(),
  skata: () => drawSkata(),
}

// Ritat spindelnät (används av skott, klibb-överdrag och växelknappens ikoner).
function drawWebNet(g, r, { color = 0xf6f6f2, alpha = 0.95, width = 3 } = {}) {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    g.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.stroke({ width, color, alpha })
  for (let ring = 1; ring <= 3; ring++) {
    const rr = (r * ring) / 3.2
    for (let k = 0; k < 8; k++) {
      const a1 = (k / 8) * Math.PI * 2
      const a2 = ((k + 1) / 8) * Math.PI * 2
      const am = (a1 + a2) / 2
      g.moveTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
        .quadraticCurveTo(Math.cos(am) * rr * 0.82, Math.sin(am) * rr * 0.82, Math.cos(a2) * rr, Math.sin(a2) * rr)
    }
  }
  g.stroke({ width: Math.max(1.6, width * 0.7), color, alpha: alpha * 0.8 })
}

// Växelknappens ikoner: klibbnät (droppe + glans) / dragnät (pil hem).
function makeNetIcon(mode, netColor = 0xffffff) {
  const c = new Container()
  const g = new Graphics()
  drawWebNet(g, 26, { color: netColor, alpha: 0.95, width: 3 })
  if (mode === 'klibb') {
    g.moveTo(14, 8).quadraticCurveTo(20, 16, 14, 22).quadraticCurveTo(8, 16, 14, 8).closePath().fill(0x9adcf0)
    g.circle(12, 14, 2).fill({ color: 0xffffff, alpha: 0.8 })
    g.moveTo(-16, -14).quadraticCurveTo(-8, -20, 0, -18).stroke({ width: 3, color: 0xd6f4ff, alpha: 0.8, cap: 'round' })
  } else {
    g.moveTo(20, -4).lineTo(20, 16).stroke({ width: 6, color: 0xffd35c, cap: 'round' })
    g.moveTo(12, 12).lineTo(28, 12).lineTo(20, 26).closePath().fill(0xffd35c)
  }
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)

export default {
  id: 'natskott-pa-stan',
  titleSv: 'Nätskott på stan',
  icon: '🚙',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'natskott-pa-stan',
  voiceIntro: 'Tryck där du vill skjuta nätet!',

  // ------------------------------------------------------------------ livscykel
  init(ctx) {
    if (import.meta.env?.DEV) window.__natdbg = this // sond-handtag (bara dev-bygget)
    this._alive = true
    this._t = 0
    this._idle = 0
    this._phase = 'drive' // 'drive' | 'arrive'
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._scrollBase = 2.1 + Math.min(1.0, this._level * 0.12)
    this._scroll = this._scrollBase
    this._journey = 0
    this._biomeFlip = this._level % 2 === 1
    this._mode = 'drag' // 'klibb' | 'drag'
    this._everToggled = false
    this._targets = []
    this._shots = []
    this._far = []
    this._mid = []
    this._brokenCount = 0
    this._seatList = [] // insamlade vänner (kinds) — visas som huvuden i baksätet
    this._seatHeads = []
    this._outFriends = []
    this._skata = null
    this._tws = [] // proxy-tweens som dödas i destroy
    this._spawnTimer = 1.0
    this._gustTimer = 11
    this._skataTimer = 16
    this._paketSinceGold = 0
    this._lastRutaSaid = -99
    this._lastBytSaid = -99
    this._missionActive = false
    this._missionsDone = 0
    this._missionOrder = shuffle(['katt', 'paket', 'ballong'])
    this._armAim = 0
    this._recoil = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildSky(ctx)
    this._buildStreetBase()

    this._farLayer = new Container()
    this._farLayer.eventMode = 'none'
    this._farLayer.interactiveChildren = false
    this._root.addChild(this._farLayer)

    this._midLayer = new Container()
    this._midLayer.eventMode = 'none'
    this._midLayer.interactiveChildren = false
    this._root.addChild(this._midLayer)

    // Statisk trottoar + dynamiska skarvar/vägkant (ritas om varje bildruta).
    this._buildGround()

    this._targetLayer = new Container()
    this._targetLayer.eventMode = 'none'
    this._targetLayer.interactiveChildren = false
    this._root.addChild(this._targetLayer)

    this._skataLayer = new Container()
    this._skataLayer.eventMode = 'none'
    this._skataLayer.interactiveChildren = false
    this._root.addChild(this._skataLayer)

    // Nät-grafik (skott + rep) ovanpå målen.
    this._netG = new Graphics()
    this._netG.eventMode = 'none'
    this._root.addChild(this._netG)

    this._buildCar(ctx)
    this._buildArm()
    this._buildToggle(ctx)
    this._buildMissionPanel()

    // Tryckyta över allt spelbart (UI-knapparna ligger ovanpå och vinner).
    this._surface = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0xffffff, alpha: 0.001 })
    this._surface.eventMode = 'static'
    this._surface.hitArea = new Rectangle(0, 0, ctx.width, ctx.height)
    this._onTapH = (e) => this._onTap(ctx, e)
    this._surface.on('pointertap', this._onTapH)
    this._root.addChildAt(this._surface, this._root.getChildIndex(this._toggle))

    // Fysik: sidovy med gravitation + eget mark-golv (trottoaren). Inga standardväggar.
    this._phys = new PhysicsWorld({ gravityY: 1.15, walls: [] })
    this._phys.rectangle(640, GROUND + 46, 4400, 92, { isStatic: true, friction: 0.9, restitution: 0.18, label: 'mark' })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Sådd: kuliss över hela bredden + några mål direkt (scenen ska leva från ruta 1).
    this._seedLayers(ctx)
    this._spawnTarget(ctx, 'katt', 840)
    this._spawnTarget(ctx, 'paket', 1080)
    this._spawnTarget(ctx, 'ballong', 1190)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    if (this._arm && !this._arm.destroyed) pop(this._arm, { scale: 1.05 })
    // Första uppdraget efter en stunds fri lek.
    ctx.later(4.6, () => this._announce(ctx))
  },

  // ------------------------------------------------------------------ kuliss
  _buildSky(ctx) {
    const g = new Graphics()
    const top = 0x8ecdf0
    const bot = 0xdff2fb
    for (let i = 0; i < 8; i++) {
      g.rect(0, i * 60, ctx.width, 62).fill(lerpColor(top, bot, i / 7))
    }
    // sol med strålar
    g.circle(985, 108, 42).fill(0xffe28a)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.moveTo(985 + Math.cos(a) * 52, 108 + Math.sin(a) * 52)
        .lineTo(985 + Math.cos(a) * 66, 108 + Math.sin(a) * 66)
    }
    g.stroke({ width: 5, color: 0xffe28a, alpha: 0.7 })
    g.eventMode = 'none'
    this._root.addChild(g)
    // två drivande moln (ritas, driver långsamt i tick)
    this._clouds = []
    for (const [cx, cy, s] of [[300, 90, 1], [760, 150, 0.7]]) {
      const m = new Graphics()
      m.circle(-34, 4, 24).fill(0xffffff)
      m.circle(0, -8, 30).fill(0xffffff)
      m.circle(34, 4, 25).fill(0xffffff)
      m.roundRect(-52, 0, 104, 26, 13).fill(0xffffff)
      m.alpha = 0.85
      m.scale.set(s)
      m.position.set(cx, cy)
      m.eventMode = 'none'
      this._root.addChild(m)
      this._clouds.push(m)
    }
    // varm förorts-ton som tonas in med resan
    this._biomeTint = new Graphics().rect(0, 0, ctx.width, SIDEWALK_BOT).fill(0xffd9a0)
    this._biomeTint.alpha = 0
    this._biomeTint.eventMode = 'none'
  },

  _buildStreetBase() {
    // Avlägset gatuband bakom mellanlagret (syns i gluggarna mellan husen).
    const g = new Graphics()
    g.rect(0, STREET_TOP, 1280, SIDEWALK_TOP - STREET_TOP).fill(0xa8bcc2)
    g.rect(0, STREET_TOP, 1280, 10).fill({ color: 0x8ba3aa, alpha: 0.7 })
    for (let x = 30; x < 1280; x += 160) {
      g.ellipse(x, STREET_TOP + 46, 34, 16).fill({ color: 0x7fae84, alpha: 0.45 }) // häckar
    }
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildGround() {
    const g = new Graphics()
    g.rect(0, SIDEWALK_TOP, 1280, SIDEWALK_BOT - SIDEWALK_TOP).fill(0xd8d3c8) // trottoar
    g.rect(0, SIDEWALK_TOP, 1280, 5).fill({ color: 0xffffff, alpha: 0.35 })
    g.rect(0, SIDEWALK_BOT, 1280, NEAR_BOT - SIDEWALK_BOT).fill(0x565d66) // vägkant/asfalt
    g.rect(0, SIDEWALK_BOT, 1280, 7).fill(0x9aa1a8) // kantsten
    g.eventMode = 'none'
    this._root.addChild(g)
    this._root.addChild(this._biomeTint)
    // dynamiska skarvar + fartstreck (ritas om i tick)
    this._groundG = new Graphics()
    this._groundG.eventMode = 'none'
    this._root.addChild(this._groundG)
  },

  _biomeT() {
    const t = clamp(this._journey / 6200, 0, 1)
    return this._biomeFlip ? 1 - t : t
  },

  _seedLayers(ctx) {
    let x = -60
    while (x < 1500) {
      const s = this._mkFarSeg(this._biomeT())
      s.c.x = x
      this._farLayer.addChild(s.c)
      this._far.push(s)
      x += s.w
    }
    x = -80
    while (x < 1560) {
      const s = this._mkMidSeg(ctx, this._biomeT(), x < 1200)
      s.c.x = x
      this._midLayer.addChild(s.c)
      this._mid.push(s)
      if (s._wxPotAt) this._spawnPotAt(ctx, s)
      x += s.w
    }
  },

  _mkFarSeg(bt) {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const w = rnd(240, 340)
    const col = lerpColor(0x7d8aa5, 0x8fbe8f, clamp(bt + rnd(-0.12, 0.12), 0, 1))
    if (Math.random() > bt) {
      // stadssiluett: kantiga hus i olika höjd + antenn
      let bx = 0
      while (bx < w - 60) {
        const bw = rnd(60, 110)
        const bh = rnd(150, 270)
        g.rect(bx, FAR_BASE - bh, bw, bh).fill(col)
        if (Math.random() < 0.4) g.rect(bx + bw * 0.3, FAR_BASE - bh - 18, 4, 18).fill(col)
        for (let wy = FAR_BASE - bh + 22; wy < FAR_BASE - 30; wy += 34) {
          g.rect(bx + 12, wy, 10, 12).fill({ color: 0xfff3d6, alpha: 0.35 })
          if (bw > 80) g.rect(bx + bw - 24, wy, 10, 12).fill({ color: 0xfff3d6, alpha: 0.35 })
        }
        bx += bw + rnd(4, 18)
      }
    } else {
      // förort: kulle + träd + liten stuga
      g.ellipse(w * 0.5, FAR_BASE + 24, w * 0.62, 64).fill(col)
      for (let i = 0; i < 3; i++) {
        const tx = rnd(30, w - 30)
        g.rect(tx - 3, FAR_BASE - 46, 6, 26).fill(shade(col, 0.3))
        g.circle(tx, FAR_BASE - 56, 20).fill(tint(col, 0.1))
      }
      const hx = rnd(40, w - 80)
      g.rect(hx, FAR_BASE - 52, 54, 34).fill(shade(col, 0.12))
      g.moveTo(hx - 6, FAR_BASE - 52).lineTo(hx + 27, FAR_BASE - 76).lineTo(hx + 60, FAR_BASE - 52).closePath().fill(shade(col, 0.24))
    }
    g.eventMode = 'none'
    c.addChild(g)
    return { c, w }
  },

  // Mellanlagrets hus (med krossbara fönster). Returnerar segment-rec.
  _mkMidSeg(ctx, bt, seeded = false) {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const gap = rnd(36, 110)
    const wins = []
    const city = Math.random() > bt
    let bw
    if (city) {
      bw = rnd(190, 250)
      const bh = rnd(285, 370)
      const wall = CITY_WALLS[(Math.random() * CITY_WALLS.length) | 0]
      const topY = SIDEWALK_TOP - bh
      g.rect(gap, topY, bw, bh).fill(wall).stroke({ width: 3, color: shade(wall, 0.25) })
      g.rect(gap - 6, topY - 12, bw + 12, 14).fill(shade(wall, 0.2)) // taklist
      g.rect(gap, SIDEWALK_TOP - 26, bw, 26).fill(shade(wall, 0.14)) // sockel
      // dörr
      g.roundRect(gap + bw / 2 - 26, SIDEWALK_TOP - 88, 52, 88, 6).fill(shade(wall, 0.35))
      g.circle(gap + bw / 2 + 14, SIDEWALK_TOP - 44, 4).fill(0xffd35c)
      // fönster-rutnät
      const cols = bw > 220 ? 3 : 2
      const rows = 3
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          const wx = gap + bw * ((cx + 1) / (cols + 1))
          const wy = topY + 56 + ry * 78
          if (wy > SIDEWALK_TOP - 130) continue
          wins.push(this._mkWindow(c, wx, wy, 46, 56, shade(wall, 0.3)))
        }
      }
    } else {
      bw = rnd(210, 270)
      const bh = rnd(175, 235)
      const wall = SUBURB_WALLS[(Math.random() * SUBURB_WALLS.length) | 0]
      const topY = SIDEWALK_TOP - bh
      g.rect(gap, topY, bw, bh).fill(wall).stroke({ width: 3, color: shade(wall, 0.22) })
      // sadeltak med överhäng
      g.moveTo(gap - 16, topY).lineTo(gap + bw / 2, topY - 62).lineTo(gap + bw + 16, topY).closePath().fill(0xc0574f)
      g.rect(gap + bw * 0.68, topY - 44, 18, 40).fill(0x8a5a3b) // skorsten
      // dörr + trappsteg
      g.roundRect(gap + bw * 0.62, SIDEWALK_TOP - 82, 48, 82, 6).fill(0x8a5a3b)
      g.circle(gap + bw * 0.62 + 38, SIDEWALK_TOP - 42, 4).fill(0xffd35c)
      g.rect(gap + bw * 0.62 - 6, SIDEWALK_TOP - 8, 60, 8).fill(shade(wall, 0.3))
      // buske + staket-bit
      g.circle(gap + bw + 14, SIDEWALK_TOP - 14, 16).fill(0x7fae84)
      g.circle(gap - 18, SIDEWALK_TOP - 12, 13).fill(0x8fbe8f)
      wins.push(this._mkWindow(c, gap + bw * 0.24, topY + 66, 52, 56, 0xfffdf7))
      if (bw > 240) wins.push(this._mkWindow(c, gap + bw * 0.45, topY + 66, 52, 56, 0xfffdf7))
    }
    g.eventMode = 'none'
    c.addChildAt(g, 0)
    const w = gap + bw + rnd(10, 30)
    const seg = { c, w, wins }
    // Ibland en blomkruka i ett fönsterbleck (riktig fysik-målkropp som följer huset).
    if (!seeded && ctx && this._targets.length < MAX_TARGETS && wins.length && Math.random() < 0.4 && this._phase === 'drive') {
      const win = wins[(Math.random() * wins.length) | 0]
      seg._wxPotAt = win // kopplas när segmentet fått sin slut-x (se _recycle)
    }
    return seg
  },

  // Ett fönster = egen liten Graphics (kan ritas om till kross/helt). cy är absolut.
  _mkWindow(parent, lx, cy, w, h, frame) {
    const g = new Graphics()
    g.position.set(lx, cy)
    g.eventMode = 'none'
    parent.addChild(g)
    const win = { g, lx, cy, w, h, frame, state: 'ok', brokenAt: 0, mc: null, seed: Math.random() * 9 }
    this._drawWindow(win)
    return win
  },

  _drawWindow(win) {
    const { g, w, h, frame } = win
    if (!g || g.destroyed) return
    g.clear()
    g.roundRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 4).fill(frame)
    if (win.state === 'ok') {
      g.roundRect(-w / 2, -h / 2, w, h, 3).fill(0xbfe4f2)
      g.moveTo(0, -h / 2).lineTo(0, h / 2).moveTo(-w / 2, 0).lineTo(w / 2, 0).stroke({ width: 3, color: frame })
      g.moveTo(-w * 0.34, h * 0.3).lineTo(w * 0.1, -h * 0.42).stroke({ width: 5, color: 0xffffff, alpha: 0.4 })
    } else {
      // krossad: mörkt hål + tecknade skärvor längs kanten
      g.roundRect(-w / 2, -h / 2, w, h, 3).fill(0x2e2632)
      const sh = [[-w / 2, -h / 2, 0.4], [w / 2, -h / 2, -0.4], [-w / 2, h / 2, 0.3], [w / 2, h / 2, -0.3], [0, -h / 2, 0.1], [0, h / 2, -0.1]]
      for (const [sx, sy, d] of sh) {
        g.moveTo(sx, sy).lineTo(sx * 0.55 + d * 14, sy * 0.5).lineTo(sx * 0.72, sy * 0.78).closePath().fill(0xd8f0fa)
      }
      g.circle(-w * 0.2, h * 0.18, 2).fill(0xfff3b0)
      g.circle(w * 0.16, -h * 0.14, 2).fill(0xfff3b0)
    }
    // fönsterbleck
    g.roundRect(-w / 2 - 9, h / 2 + 4, w + 18, 8, 3).fill(shade(frame, 0.18))
  },

  // ------------------------------------------------------------------ bil + arm
  _buildCar(ctx) {
    // Antydd dörrkant/fönsterkarm nertill (P0-beslut 6: smal ram, gatan får ytan).
    const g = new Graphics()
    g.rect(0, CAR_TOP - 10, ctx.width, 10).fill({ color: 0x33291f, alpha: 0.55 }) // gummilist
    g.roundRect(-20, CAR_TOP, ctx.width + 40, 90, 18).fill(0xd2554f)
    g.rect(0, CAR_TOP + 6, ctx.width, 8).fill({ color: 0xffffff, alpha: 0.28 }) // glansremsa
    g.rect(0, CAR_TOP + 46, ctx.width, 5).fill({ color: 0x8f2f2c, alpha: 0.8 }) // karosslinje
    g.eventMode = 'none'
    this._root.addChild(g)

    // Baksätets hörn nere till höger: ryggstöd (bakom) + huvuden + sittdyna (framför).
    const back = new Graphics()
    back.roundRect(1032, 574, 260, 150, 20).fill(0x7a4a3d)
    back.roundRect(1032, 574, 260, 26, 13).fill({ color: 0x936053, alpha: 0.9 })
    back.moveTo(1112, 580).lineTo(1112, 700).moveTo(1198, 580).lineTo(1198, 700).stroke({ width: 4, color: 0x5e382e, alpha: 0.7 })
    back.eventMode = 'none'
    this._root.addChild(back)
    this._friendLayer = new Container()
    this._friendLayer.eventMode = 'none'
    this._friendLayer.interactiveChildren = false
    this._root.addChild(this._friendLayer)
    const front = new Graphics()
    front.roundRect(1020, 648, 280, 90, 22).fill(0x8a5548)
    front.roundRect(1020, 648, 280, 20, 10).fill({ color: 0xa3695a, alpha: 0.9 })
    front.eventMode = 'none'
    this._root.addChild(front)
  },

  _buildArm() {
    // Spindel-Zackes arm i webb-skjutar-pose (P0 ASSETS: helt ritad, eget liv).
    // Förstaperson: underarmen är bred närmast betraktaren och smalnar mot handen.
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    // underarm — röd dräkt med svarta nätlinjer
    g.moveTo(-84, 80).quadraticCurveTo(-64, -60, -42, -150).lineTo(42, -150)
      .quadraticCurveTo(64, -60, 84, 80).closePath().fill(COLORS.red)
    g.moveTo(-84, 80).quadraticCurveTo(-64, -60, -42, -150).moveTo(84, 80).quadraticCurveTo(64, -60, 42, -150)
      .stroke({ width: 5, color: shade(COLORS.red, 0.28) })
    // nätmönster: mittspindel på armens rygg + radiella trådar + tvärbågar
    for (let i = -2; i <= 2; i++) {
      g.moveTo(i * 15, -150).lineTo(i * 30, 80)
    }
    g.stroke({ width: 2.4, color: 0x33291f, alpha: 0.7 })
    for (let ry = -130; ry <= 60; ry += 46) {
      const half = 42 + (ry + 150) * 0.17
      g.moveTo(-half, ry).quadraticCurveTo(0, ry + 17, half, ry).stroke({ width: 2.4, color: 0x33291f, alpha: 0.7 })
    }
    // blått muddband vid handleden (dräktens accent)
    g.moveTo(-46, -148).lineTo(46, -148).lineTo(42, -172).lineTo(-42, -172).closePath().fill(COLORS.blue)
    g.rect(-43, -158, 86, 5).fill({ color: 0xffffff, alpha: 0.25 })
    // handflata (röd handske, tydlig kontur)
    g.roundRect(-36, -234, 72, 66, 24).fill(COLORS.red).stroke({ width: 3.5, color: shade(COLORS.red, 0.3) })
    // vikta lång- och ringfingrar = två knogar mot handflatan
    g.circle(-4, -228, 11).fill(shade(COLORS.red, 0.16))
    g.circle(14, -226, 10).fill(shade(COLORS.red, 0.16))
    // pekfinger + lillfinger ut (webb-skjutar-posen), tumme åt sidan
    g.moveTo(-22, -224).lineTo(-44, -282).stroke({ width: 18, color: COLORS.red, cap: 'round' })
    g.moveTo(26, -222).lineTo(44, -270).stroke({ width: 15, color: COLORS.red, cap: 'round' })
    g.moveTo(-32, -196).lineTo(-58, -206).stroke({ width: 16, color: COLORS.red, cap: 'round' })
    // litet nät på handens rygg
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      g.moveTo(-2, -202).lineTo(-2 + Math.cos(a) * 24, -202 + Math.sin(a) * 24)
    }
    g.stroke({ width: 1.8, color: 0x33291f, alpha: 0.65 })
    g.circle(-2, -202, 13).stroke({ width: 1.8, color: 0x33291f, alpha: 0.55 })
    g.eventMode = 'none'
    c.addChild(g)
    c.position.set(ARM_PIVOT.x, ARM_PIVOT.y)
    this._arm = c
    this._root.addChild(c)
  },

  _handPos() {
    const a = this._arm.rotation
    return { x: this._arm.x + Math.sin(a) * HAND_LEN, y: this._arm.y - Math.cos(a) * HAND_LEN }
  },

  // ------------------------------------------------------------------ växelknapp
  _buildToggle(ctx) {
    const c = new Container()
    const W = 216
    const H = 122
    this._toggleFace = new Graphics()
    c.addChild(this._toggleFace)
    this._iconKlibb = makeNetIcon('klibb')
    this._iconDrag = makeNetIcon('drag')
    this._iconKlibb.position.set(0, -20)
    this._iconDrag.position.set(0, -20)
    c.addChild(this._iconKlibb, this._iconDrag)
    this._toggleLabel = new Text({
      text: '',
      style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '800', fill: COLORS.white },
    })
    this._toggleLabel.anchor.set(0.5)
    this._toggleLabel.position.set(0, 38)
    this._toggleLabel.eventMode = 'none'
    c.addChild(this._toggleLabel)
    c.position.set(168, 648)
    c.hitArea = new Rectangle(-W / 2 - 24, -H / 2 - 24, W + 48, H + 48)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    this._onToggleDown = () => gsap.to(c.scale, { x: 0.92, y: 0.92, duration: 0.08, ease: 'power2.out' })
    this._onToggleUp = () => gsap.to(c.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(3)' })
    this._onToggleTap = () => this._toggleMode(ctx)
    c.on('pointerdown', this._onToggleDown)
    c.on('pointerup', this._onToggleUp)
    c.on('pointerupoutside', this._onToggleUp)
    c.on('pointertap', this._onToggleTap)
    this._toggle = c
    this._root.addChild(c)
    this._applyMode(true)
  },

  _applyMode(silent = false) {
    const klibb = this._mode === 'klibb'
    const col = klibb ? COLORS.green : COLORS.blue
    const W = 216
    const H = 122
    const f = this._toggleFace
    if (!f || f.destroyed) return
    f.clear()
    f.roundRect(-W / 2, -H / 2 + 8, W, H, 34).fill(shade(col, 0.2))
    f.roundRect(-W / 2, -H / 2, W, H - 6, 34).fill(col)
    f.roundRect(-W / 2 + 10, -H / 2 + 8, W - 20, H * 0.3, 22).fill({ color: 0xffffff, alpha: 0.18 })
    this._iconKlibb.visible = klibb
    this._iconDrag.visible = !klibb
    if (this._toggleLabel && !this._toggleLabel.destroyed) this._toggleLabel.text = klibb ? 'Klibbnät' : 'Dragnät'
    if (!silent) pop(this._toggle)
  },

  _toggleMode(ctx) {
    if (!this._alive) return
    this._idle = 0
    this._everToggled = true
    this._stopTogglePulse()
    this._mode = this._mode === 'klibb' ? 'drag' : 'klibb'
    ctx.services.audio.sfx('flip')
    this._applyMode()
    sparkle(ctx.fxLayer, this._toggle.x, this._toggle.y - 70, { count: 5 })
  },

  _pulseToggle(ctx) {
    if (!this._toggle || this._toggle.destroyed) return
    this._stopTogglePulse()
    this._togglePulse = breathe(this._toggle, { scale: 1.1, duration: 0.5 })
    ctx.later(3.6, () => this._stopTogglePulse())
  },

  _stopTogglePulse() {
    if (this._togglePulse) {
      this._togglePulse.kill()
      this._togglePulse = null
      if (this._toggle && !this._toggle.destroyed) this._toggle.scale.set(1)
    }
  },

  // ------------------------------------------------------------------ uppdrag
  _needFor(key) {
    if (key === 'katt') return this._level >= 4 ? 2 : 1
    if (key === 'paket') return this._level >= 2 ? 3 : 2
    return 3
  },

  _missionDef(key) {
    if (key === 'katt') return { net: 'drag', kinds: ['katt'] }
    if (key === 'paket') return { net: 'klibb', kinds: ['paket', 'guldpaket'] }
    return { net: 'drag', kinds: ['ballong'] }
  },

  _buildMissionPanel() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._panelBg = new Graphics()
    c.addChild(this._panelBg)
    this._panelContent = new Container()
    this._panelContent.eventMode = 'none'
    c.addChild(this._panelContent)
    c.position.set(640, 92)
    c.alpha = 0
    this._panel = c
    this._root.addChild(c)
  },

  _announce(ctx) {
    if (!this._alive || this._phase !== 'drive' || this._missionActive) return
    const key = this._missionOrder[this._missionsDone % 3]
    this._missionKey = key
    this._missionNeed = this._needFor(key)
    this._missionGot = 0
    this._missionActive = true
    this._missionT = 0
    this._wrongNet = 0
    this._hintedNet = false
    // Ikon-först-panel: ritad symbol + nätikon + pluppar (panelen får bära UI, aldrig spelobjekt).
    this._drawPanel()
    if (this._panel && !this._panel.destroyed) {
      gsap.killTweensOf(this._panel)
      this._panel.alpha = 1
      bounceIn(this._panel)
    }
    ctx.services.audio.sfx('reveal')
    // Literala repliker (aldrig ternärer i say — check.mjs ser bara literaler).
    if (key === 'katt') {
      ctx.services.voice.say('Fånga katten med dragnätet!')
    } else if (key === 'paket') {
      ctx.services.voice.say('Fäst paketen så de inte blåser iväg!')
    } else {
      ctx.services.voice.say('Hämta hem tre ballonger!')
    }
    // Aldrig bytt nät efter 2 uppdrag → visa vägen till växelknappen.
    if (this._missionsDone >= 2 && !this._everToggled) {
      ctx.later(2.8, () => this._sayByt(ctx))
    }
  },

  _drawPanel() {
    if (!this._panel || this._panel.destroyed) return
    const def = this._missionDef(this._missionKey)
    const need = this._missionNeed
    const w = 190 + need * 34
    const bg = this._panelBg
    bg.clear()
    bg.roundRect(-w / 2, -46, w, 92, 26).fill({ color: 0xfffdf7, alpha: 0.94 }).stroke({ width: 4, color: shade(def.net === 'klibb' ? COLORS.green : COLORS.blue, 0.1) })
    for (const ch of this._panelContent.removeChildren()) ch.destroy({ children: true })
    // ritad mål-symbol
    const icon = KIND_DRAW[this._missionKey === 'paket' ? 'paket' : this._missionKey]()
    icon.scale.set(0.62)
    icon.position.set(-w / 2 + 52, 8)
    icon.eventMode = 'none'
    this._panelContent.addChild(icon)
    // nätläges-ikon (vilket nät uppdraget vill ha)
    const net = makeNetIcon(def.net, 0x7a6657)
    net.scale.set(0.72)
    net.position.set(-w / 2 + 118, 0)
    this._panelContent.addChild(net)
    const ring = new Graphics().circle(-w / 2 + 118, 0, 27).stroke({ width: 3, color: def.net === 'klibb' ? COLORS.green : COLORS.blue, alpha: 0.8 })
    ring.eventMode = 'none'
    this._panelContent.addChild(ring)
    // pluppar (fylls i takt med framsteg)
    this._panelPips = new Graphics()
    this._panelPips.eventMode = 'none'
    this._panelContent.addChild(this._panelPips)
    this._drawPips()
  },

  _drawPips() {
    const g = this._panelPips
    if (!g || g.destroyed) return
    const def = this._missionDef(this._missionKey)
    const col = def.net === 'klibb' ? COLORS.green : COLORS.blue
    const need = this._missionNeed
    const w = 190 + need * 34
    g.clear()
    for (let i = 0; i < need; i++) {
      const x = -w / 2 + 168 + i * 34
      const done = i < this._missionGot
      g.circle(x, 0, 13).fill({ color: done ? col : 0xffffff, alpha: done ? 1 : 0.5 }).stroke({ width: 3, color: shade(col, 0.15) })
      if (done) g.circle(x, 0, 5).fill(0xfffdf7)
    }
  },

  // Rätt nät på rätt mål under aktivt uppdrag → framsteg (räknas KUMULATIVT,
  // vindbyn kan aldrig sänka en siffra — P0: poäng sjunker aldrig).
  _credit(ctx, net, kind) {
    if (!this._alive || !this._missionActive || this._phase !== 'drive') return
    const def = this._missionDef(this._missionKey)
    if (def.net !== net || !def.kinds.includes(kind)) {
      // fel nät på uppdrags-målet? Roligt ändå — men efter 2 ggr: visa växelknappen.
      if (def.kinds.includes(kind)) {
        this._wrongNet++
        if (this._wrongNet >= 2 && !this._hintedNet) {
          this._hintedNet = true
          this._sayByt(ctx)
        }
      }
      return
    }
    this._missionGot++
    this._missionT = 0
    this._drawPips()
    if (this._panel && !this._panel.destroyed) pop(this._panel)
    ctx.services.audio.tone({ freq: NOTES[Math.min(this._missionGot, NOTES.length - 1)], dur: 0.16, type: 'triangle', vol: 0.2 })
    if (this._missionGot >= this._missionNeed) this._missionDone(ctx)
  },

  _sayByt(ctx) {
    if (!this._alive || this._t - this._lastBytSaid < 18) return
    this._lastBytSaid = this._t
    ctx.services.voice.say('Byt nät med den stora knappen!')
    this._pulseToggle(ctx)
  },

  _missionDone(ctx) {
    this._missionActive = false
    this._missionsDone++
    ctx.services.audio.sfx('match')
    if (this._panel && !this._panel.destroyed) {
      burst(ctx.fxLayer, this._panel.x, this._panel.y, { count: 14 })
      pop(this._panel, { scale: 1.3 })
    }
    if (this._missionsDone >= 3) {
      ctx.later(1.1, () => this._homecoming(ctx))
    } else {
      ctx.later(0.7, () => {
        if (this._alive) ctx.services.voice.say('Titta, baksätet blir fullt med vänner!')
      })
      ctx.later(2.4, () => {
        if (this._panel && !this._panel.destroyed) {
          gsap.killTweensOf(this._panel)
          this._panelFade = gsap.to(this._panel, { alpha: 0, duration: 0.5 })
        }
      })
      ctx.later(6.0, () => this._announce(ctx))
    }
  },

  // ------------------------------------------------------------------ mål (spawn)
  _spawnTarget(ctx, kind, atX = 1380) {
    if (!this._alive || this._targets.length >= MAX_TARGETS) return null
    let golden = false
    if (kind === 'paket') {
      this._paketSinceGold++
      if (Math.random() < 0.125 || this._paketSinceGold >= 9) {
        golden = true
        this._paketSinceGold = 0
      }
    }
    const view = new Container()
    view.eventMode = 'none'
    view.interactiveChildren = false
    const inner = new Container()
    inner.eventMode = 'none'
    const art = KIND_DRAW[golden ? 'guldpaket' : kind]()
    inner.addChild(art)
    let r = 40
    let body
    const rec = { kind, golden, view, inner, r: 40, stuck: false, netted: false, loosened: false, seed: Math.random() * 9, walkV: 0, netG: null, pullV: 0 }
    if (kind === 'katt' || kind === 'hund' || kind === 'monster') {
      r = kind === 'hund' ? 44 : kind === 'monster' ? 42 : 40
      body = this._phys.circle(atX, GROUND - r, r, { friction: 0.6, frictionAir: 0.02, restitution: 0.1, density: 0.0016, label: kind, collisionFilter: { group: -1 } })
      Body.setInertia(body, Infinity)
      rec.walkV = rnd(0.2, 0.7) * (Math.random() < 0.7 ? 1 : -1)
      const sh = new Graphics().ellipse(0, r - 3, r * 0.9, 9).fill({ color: 0x000000, alpha: 0.15 })
      sh.eventMode = 'none'
      view.addChild(sh)
    } else if (kind === 'paket') {
      r = 44
      body = this._phys.rectangle(atX, GROUND - 30, 72, 60, { friction: 0.7, frictionAir: 0.015, restitution: 0.25, density: 0.0018, label: 'paket', collisionFilter: { group: -1 } })
      const sh = new Graphics().ellipse(0, 32, 40, 8).fill({ color: 0x000000, alpha: 0.15 })
      sh.eventMode = 'none'
      view.addChild(sh)
    } else if (kind === 'kruka') {
      r = 40
      body = this._phys.rectangle(atX, GROUND - 27, 56, 54, { isStatic: true, friction: 0.7, restitution: 0.2, density: 0.002, label: 'kruka', collisionFilter: { group: -1 } })
      rec.sill = true
    } else if (kind === 'fagel') {
      r = 30
      body = this._phys.circle(atX, rnd(230, 360), 26, { isSensor: true, frictionAir: 0.02, density: 0.0008, label: 'fagel', collisionFilter: { group: -1 } })
      Body.setInertia(body, Infinity)
    } else {
      // ballong — flyter uppåt
      r = 40
      body = this._phys.circle(atX, rnd(560, 640), 34, { isSensor: true, frictionAir: 0.02, density: 0.0006, label: 'ballong', collisionFilter: { group: -1 } })
      Body.setInertia(body, Infinity)
    }
    rec.r = r
    rec.body = body
    view.addChild(inner)
    view.position.set(body.position.x, body.position.y)
    this._targetLayer.addChild(view)
    this._phys.link(body, view)
    this._targets.push(rec)
    return rec
  },

  // Blomkruka på ett fönsterbleck i ett nyskapat hus-segment.
  _spawnPotAt(ctx, seg) {
    const win = seg._wxPotAt
    seg._wxPotAt = null
    if (!win || !this._alive || this._targets.length >= MAX_TARGETS) return
    const x = seg.c.x + win.lx
    const y = win.cy + win.h / 2 + 8 - 27
    const rec = this._spawnTarget(ctx, 'kruka', 1380)
    if (rec) Body.setPosition(rec.body, { x, y })
  },

  _spawnTick(ctx) {
    // uppdrags-mål prioriteras så barnet aldrig blir stående utan
    let kind = null
    if (this._missionActive) {
      const def = this._missionDef(this._missionKey)
      const alive = this._targets.filter((r) => def.kinds.includes(r.kind) && !r.stuck && !r.netted).length
      if (alive < 2 && Math.random() < 0.7) kind = this._missionKey === 'paket' ? 'paket' : this._missionKey
    }
    if (!kind) {
      const pool = ['katt', 'hund', 'paket', 'paket', 'ballong', 'fagel', 'monster']
      kind = pool[(Math.random() * pool.length) | 0]
    }
    this._spawnTarget(ctx, kind)
  },

  // ------------------------------------------------------------------ tryck → nät
  _onTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    const hand = this._handPos()
    // <100 ms: ljud + rekyl + ring direkt vid pekningen
    if (!ctx.services.audio.sample('thwip')) ctx.services.audio.sfx('whoosh')
    ripple(ctx.fxLayer, p.x, p.y, { maxR: 54, duration: 0.35, color: 0xffffff })
    this._armAim = clamp(Math.atan2(p.x - ARM_PIVOT.x, ARM_PIVOT.y - p.y) * 0.5, -0.3, 0.34)
    this._recoil = 1

    // träff-prioritet: skata → mål (närmast) → fönster → husvägg (miss)
    const shot = { x0: hand.x, y0: hand.y, ex: p.x, ey: p.y, p: 0, phase: 'fly', life: 1, rec: null, win: null, seg: null, skata: false, mode: this._mode }
    if (this._skata && this._skata.phase !== 'flee' && Math.hypot(p.x - this._skata.c.x, p.y - this._skata.c.y) < 90) {
      shot.skata = true
    } else {
      let best = null
      let bd = 1e9
      for (const rec of this._targets) {
        if (rec.netted) continue
        const d = Math.hypot(p.x - rec.view.x, p.y - rec.view.y)
        if (d < rec.r + 42 && d < bd) {
          bd = d
          best = rec
        }
      }
      if (best) {
        shot.rec = best
      } else {
        const w = this._windowAt(p.x, p.y)
        if (w) {
          shot.win = w.win
          shot.seg = w.seg
        }
      }
    }
    this._shots.push(shot)
  },

  _windowAt(px, py) {
    for (const seg of this._mid) {
      for (const win of seg.wins) {
        const wx = seg.c.x + win.lx
        if (Math.abs(px - wx) < win.w / 2 + 26 && Math.abs(py - win.cy) < win.h / 2 + 26) {
          return { seg, win }
        }
      }
    }
    return null
  },

  // Skottet framme → tillämpa nätets effekt.
  _resolveShot(ctx, s) {
    if (s.skata) {
      this._netSkata(ctx)
      return
    }
    if (s.rec) {
      this._hitTarget(ctx, s.rec)
      return
    }
    if (s.win) {
      this._hitWindow(ctx, s.seg, s.win)
      return
    }
    // tomt tryck: nätet fäster kort på husväggen och tonar bort — mjukt, aldrig straff
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, s.ex, s.ey, { count: 4, color: 0xd8d3c8 })
    s.phase = 'wall'
    s.life = 1
  },

  _hitTarget(ctx, rec) {
    if (!this._alive || !this._targets.includes(rec)) return
    this._soundFor(ctx, rec.kind)
    if (rec.inner && !rec.inner.destroyed) pop(rec.inner, { scale: 1.25 })
    sparkle(ctx.fxLayer, rec.view.x, rec.view.y, { count: 5 })
    if (this._mode === 'klibb') {
      const first = !rec.stuck
      if (first) {
        Body.setVelocity(rec.body, { x: 0, y: 0 })
        Body.setStatic(rec.body, true)
        rec.stuck = true
        rec.loosened = false
        const net = new Graphics()
        drawWebNet(net, rec.r * 1.25)
        net.eventMode = 'none'
        rec.inner.addChild(net)
        rec.netG = net
        bounceIn(net)
        this._credit(ctx, 'klibb', rec.kind === 'paket' && rec.golden ? 'guldpaket' : rec.kind)
        // fågeln är för pigg för nätet: sprattlar loss efter en stund och flyger vidare
        if (rec.kind === 'fagel') {
          ctx.later(2.3, () => {
            if (!this._alive || !this._targets.includes(rec) || !rec.stuck) return
            rec.stuck = false
            Body.setStatic(rec.body, false)
            Body.setVelocity(rec.body, { x: 2, y: -4 })
            if (rec.netG && !rec.netG.destroyed) rec.netG.destroy()
            rec.netG = null
            puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 6, color: 0x5db1e8 })
            if (!ctx.services.audio.sample('djur_uggla')) ctx.services.audio.sfx('pling')
          })
        }
      } else if (rec.inner && !rec.inner.destroyed) {
        wiggle(rec.inner) // redan fast: extra nät = bara busigt
      }
    } else {
      // dragnät: kroppen dras hem mot bilen
      rec.netted = true
      rec.pullV = 5
      if (rec.stuck || rec.sill) Body.setStatic(rec.body, false)
      rec.stuck = false
      rec.body.isSensor = true
      if (rec.kind === 'ballong') {
        ctx.services.audio.tone({ freq: 523.25, dur: 0.14, type: 'triangle', vol: 0.2 })
        ctx.services.audio.tone({ freq: 659.25, dur: 0.2, type: 'triangle', vol: 0.2, delay: 0.12 })
      }
      // fel-näts-räknaren (klibb-uppdrag men barnet drar) hanteras i _credit vid hemkomsten
    }
  },

  _soundFor(ctx, kind) {
    const a = ctx.services.audio
    if (kind === 'katt' && a.sample('djur_katt')) return
    if (kind === 'hund' && a.sample('djur_hund')) return
    if (kind === 'fagel' && a.sample('djur_uggla')) return
    if (kind === 'monster' && a.sample('boing')) return
    if ((kind === 'paket' || kind === 'kruka') && a.sample('plopp')) return
    if (kind === 'ballong') {
      a.sfx('pop')
      return
    }
    a.sfx('pop')
  },

  _hitWindow(ctx, seg, win) {
    if (!this._alive || win.state !== 'ok' || win.g.destroyed) return
    const wx = seg.c.x + win.lx
    if (this._brokenCount >= MAX_BROKEN) {
      // TAK: nätet studsar av med en gnista — rutan klarar sig
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, wx, win.cy, { count: 6 })
      return
    }
    win.state = 'broken'
    win.brokenAt = this._t
    this._brokenCount++
    this._drawWindow(win)
    // tecknat glitter-splitter + glatt ljud (stämda höga toner, inget surr)
    burst(ctx.fxLayer, wx, win.cy, { count: 12, colors: [0xd8f0fa, 0xffffff, 0xbfe4f2, 0xfff3b0] })
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: 1046.5, dur: 0.12, type: 'sine', vol: 0.16 })
    ctx.services.audio.tone({ freq: 1318.5, dur: 0.16, type: 'sine', vol: 0.14, delay: 0.07 })
    if (this._t - this._lastRutaSaid > 14 && Math.random() < 0.5) {
      this._lastRutaSaid = this._t
      ctx.services.voice.say('Hoppsan! Där rök en ruta!')
    }
    // ibland tittar ett litet monster ut ur hålet och vinkar
    if (Math.random() < 0.34) {
      const mc = new Container()
      mc.eventMode = 'none'
      const mg = new Graphics()
      const tintC = MONSTER_TINTS[(Math.random() * MONSTER_TINTS.length) | 0]
      mg.circle(0, 6, 15).fill(tintC)
      mg.moveTo(-8, -6).lineTo(-5, -16).lineTo(0, -7).closePath().fill(0xfff3d6)
      mg.circle(-4, 3, 5.5).fill(0xffffff)
      mg.circle(-3, 4, 2.8).fill(0x4a3f6b)
      mg.moveTo(-8, 12).quadraticCurveTo(0, 17, 8, 12).stroke({ width: 2.4, color: 0x33291f, cap: 'round' })
      mg.eventMode = 'none'
      mc.addChild(mg)
      const arm = new Graphics()
      arm.moveTo(0, 0).lineTo(10, -12).stroke({ width: 5, color: tintC, cap: 'round' })
      arm.circle(10, -12, 4).fill(tintC)
      arm.position.set(12, 6)
      arm.eventMode = 'none'
      mc.addChild(arm)
      mc._wxArm = arm
      mc.position.set(win.lx, win.cy + 6)
      seg.c.addChild(mc)
      win.mc = mc
      bounceIn(mc)
      ctx.services.audio.sfx('boing')
    }
  },

  _healWindows(ctx) {
    for (const seg of this._mid) {
      for (const win of seg.wins) {
        if (win.state !== 'broken') continue
        if (this._t - win.brokenAt > HEAL_AFTER) {
          win.state = 'ok'
          this._brokenCount = Math.max(0, this._brokenCount - 1)
          this._drawWindow(win)
          if (win.mc && !win.mc.destroyed) win.mc.destroy({ children: true })
          win.mc = null
          const wx = seg.c.x + win.lx
          if (wx > -60 && wx < 1340) {
            sparkle(ctx.fxLayer, wx, win.cy, { count: 6 })
            ctx.services.audio.sfx('reveal')
          }
        } else if (win.mc && !win.mc.destroyed && win.mc._wxArm && !win.mc._wxArm.destroyed) {
          win.mc._wxArm.rotation = Math.sin(this._t * 7 + win.seed) * 0.5 // monstret vinkar
        }
      }
    }
  },

  // ------------------------------------------------------------------ dragning hem
  _collect(ctx, rec) {
    const idx = this._targets.indexOf(rec)
    if (idx < 0) return
    this._targets.splice(idx, 1)
    this._phys.removeBody(rec.body)
    const kind = rec.kind === 'paket' && rec.golden ? 'guldpaket' : rec.kind
    this._credit(ctx, 'drag', kind)
    this._soundFor(ctx, rec.kind)
    puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 6 })
    // vy:n seglar i en båge ner i baksätet (exit-säker proxy)
    const view = rec.view
    const sx = view.x
    const sy = view.y
    const tx = SEAT.x + rnd(-60, 50)
    const ty = SEAT.y + rnd(-6, 10)
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: 1,
      duration: 0.5,
      ease: 'power1.in',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.x = sx + (tx - sx) * st.p
        view.y = sy + (ty - sy) * st.p - Math.sin(st.p * Math.PI) * 120
        view.scale.set(1 - st.p * 0.45)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy({ children: true })
        if (!this._alive) return
        this._landFriend(ctx, rec.kind, rec.golden)
      },
    })
    this._tws.push(tw)
  },

  // Landning i baksätet: huvud dyker upp, alla jublar (mottagaren!).
  _landFriend(ctx, kind, golden) {
    this._seatList.push(kind)
    ctx.progress.setCustom('vanner', (ctx.progress.get().custom?.vanner || 0) + 1)
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: NOTES[this._seatList.length % NOTES.length], dur: 0.18, type: 'triangle', vol: 0.2 })
    const head = KIND_DRAW[golden ? 'guldpaket' : kind]()
    head.scale.set(0.5)
    const n = this._seatHeads.length
    const hx = 1076 + (n % 5) * 44 + rnd(-6, 6)
    const hy = SEAT.y + (n >= 5 ? -26 : 0) + rnd(-4, 4)
    head.position.set(hx, hy)
    head.eventMode = 'none'
    this._friendLayer.addChild(head)
    this._seatHeads.push({ c: head, seed: Math.random() * 9, by: hy })
    bounceIn(head)
    // alla i sätet gör en glad liten hoppvåg
    for (const h of this._seatHeads) {
      if (h.c && !h.c.destroyed) pop(h.c, { scale: 1.15 })
    }
    if (this._seatHeads.length > 9) {
      const old = this._seatHeads.shift()
      if (old.c && !old.c.destroyed) old.c.destroy({ children: true })
    }
    if (golden) {
      // WOW: guldpaketet regnar stjärnor
      ctx.services.audio.sfx('magi')
      ctx.services.audio.tone({ freq: 523.25, dur: 0.14, type: 'triangle', vol: 0.22 })
      ctx.services.audio.tone({ freq: 659.25, dur: 0.14, type: 'triangle', vol: 0.22, delay: 0.11 })
      ctx.services.audio.tone({ freq: 783.99, dur: 0.14, type: 'triangle', vol: 0.22, delay: 0.22 })
      ctx.services.audio.tone({ freq: 1046.5, dur: 0.24, type: 'triangle', vol: 0.24, delay: 0.33 })
      burst(ctx.fxLayer, hx, hy - 40, { count: 18, colors: [0xffd35c, 0xfff3b0, 0xffe28a] })
      for (let i = 0; i < 5; i++) {
        floatText(ctx.fxLayer, hx + rnd(-70, 70), hy - rnd(10, 60), '⭐', { fontSize: 34 + rnd(0, 20), rise: 110, duration: 1.1 })
      }
    }
  },

  // ------------------------------------------------------------------ skata + vindby
  _spawnSkata(ctx) {
    if (this._skata || this._phase !== 'drive') return
    const prey = this._targets.find((r) => (r.kind === 'paket') && !r.netted) // knycker paket (helst fästa)
    if (!prey) return
    const c = drawSkata()
    c.position.set(1360, 140)
    this._skataLayer.addChild(c)
    this._skata = { c, phase: 'in', prey, vx: 0, vy: 0, holdT: 0 }
    ctx.services.audio.tone({ freq: 740, dur: 0.1, type: 'sawtooth', vol: 0.12 })
    ctx.services.audio.tone({ freq: 620, dur: 0.12, type: 'sawtooth', vol: 0.12, delay: 0.12 })
  },

  _updateSkata(ctx, dtF) {
    const s = this._skata
    if (!s) return
    const c = s.c
    if (!c || c.destroyed) {
      this._skata = null
      return
    }
    if (c._wxWing && !c._wxWing.destroyed) c._wxWing.rotation = Math.sin(this._t * 16) * 0.55
    if (s.phase === 'in') {
      const preyOk = s.prey && this._targets.includes(s.prey) && !s.prey.netted
      if (!preyOk) {
        s.phase = 'flee'
      } else {
        const tx = s.prey.view.x
        const ty = s.prey.view.y - 46
        const d = Math.hypot(tx - c.x, ty - c.y)
        c.x += ((tx - c.x) / (d || 1)) * 4.6 * dtF
        c.y += ((ty - c.y) / (d || 1)) * 4.6 * dtF
        if (d < 18) {
          s.phase = 'carry'
          // paketet lyfts: statiskt och bärs av skatan
          Body.setStatic(s.prey.body, true)
          s.prey.stuck = false
          if (s.prey.netG && !s.prey.netG.destroyed) s.prey.netG.destroy()
          s.prey.netG = null
          if (!ctx.services.audio.sample('djur_uggla')) ctx.services.audio.sfx('flip')
          if (s.prey.inner && !s.prey.inner.destroyed) wiggle(s.prey.inner)
        }
      }
    } else if (s.phase === 'carry') {
      const preyOk = s.prey && this._targets.includes(s.prey)
      c.x += 1.1 * dtF
      c.y -= 0.85 * dtF
      if (preyOk) Body.setPosition(s.prey.body, { x: c.x + 2, y: c.y + 58 })
      if (c.y < -120 || c.x > 1420) {
        // kom undan med paketet (nya paket kommer — aldrig ett straff)
        if (preyOk) this._removeTarget(s.prey)
        if (!c.destroyed) c.destroy({ children: true })
        this._skata = null
      }
    } else {
      // flee: släpper allt och flaxar iväg
      c.x += 7 * dtF
      c.y -= 5 * dtF
      if (c.y < -120 || c.x > 1420) {
        if (!c.destroyed) c.destroy({ children: true })
        this._skata = null
      }
    }
  },

  _netSkata(ctx) {
    const s = this._skata
    if (!s || !s.c || s.c.destroyed) return
    ctx.services.audio.sfx('boing')
    puff(ctx.fxLayer, s.c.x, s.c.y, { count: 8, color: 0x394252 })
    sparkle(ctx.fxLayer, s.c.x, s.c.y, { count: 6 })
    if (s.phase === 'carry' && s.prey && this._targets.includes(s.prey)) {
      // paketet släpps och studsar ner på trottoaren igen
      Body.setStatic(s.prey.body, false)
      Body.setVelocity(s.prey.body, { x: rnd(-1, 1), y: 2 })
      s.prey.loosened = true
    }
    s.phase = 'flee'
    this._idle = 0
  },

  _gust(ctx) {
    // vindby: blåser loss fästa paket — MEN max 2 lösa samtidigt (tak)
    const loose = this._targets.filter((r) => (r.kind === 'paket') && r.loosened && !r.stuck && !r.netted).length
    if (loose >= 2) return
    const stuck = this._targets.filter((r) => r.kind === 'paket' && r.stuck && r.view.x > 80 && r.view.x < 1240)
    if (!stuck.length) return
    ctx.services.audio.sfx('whoosh')
    const n = Math.min(stuck.length, 2 - loose)
    const picked = stuck.slice(0, n)
    // synliga vind-streck som sveper förbi (exit-säkra proxy-tweens) — de första
    // förankras i höjd med paketen som blåser loss, så orsaken går att SE
    for (let i = 0; i < 3; i++) {
      const anchor = picked[i]?.view && !picked[i].view.destroyed ? picked[i].view.y - 6 : null
      const y = anchor ?? rnd(240, 520)
      const g = new Graphics()
      g.moveTo(0, 0).quadraticCurveTo(60, -14, 130, 0).stroke({ width: 5, color: 0xffffff, alpha: 0.55, cap: 'round' })
      g.position.set(1320, y)
      g.eventMode = 'none'
      ctx.fxLayer.addChild(g)
      const st = { x: 1320 }
      const tw = gsap.to(st, {
        x: -220,
        duration: rnd(0.7, 1.0),
        delay: i * 0.1,
        ease: 'power1.in',
        onUpdate: () => {
          if (g.destroyed) {
            tw.kill()
            return
          }
          g.x = st.x
          g.alpha = 0.7 - Math.abs(640 - st.x) / 1400
        },
        onComplete: () => {
          if (!g.destroyed) g.destroy()
        },
      })
      this._tws.push(tw)
    }
    // Lossningen sker NÄR strecket hunnit fram till paketet (~0,35 s) — inte i
    // samma frame som det dyker upp vid kanten. Orsak före verkan.
    ctx.later(0.35, () => {
      for (const rec of picked) {
        if (!rec.view || rec.view.destroyed || !rec.stuck) continue
        rec.stuck = false
        rec.loosened = true
        Body.setStatic(rec.body, false)
        Body.setVelocity(rec.body, { x: rnd(-4, -2), y: rnd(-7, -4) })
        Body.setAngularVelocity(rec.body, rnd(-0.12, 0.12))
        if (rec.netG && !rec.netG.destroyed) rec.netG.destroy()
        rec.netG = null
        if (rec.inner && !rec.inner.destroyed) wiggle(rec.inner)
      }
    })
  },

  // ------------------------------------------------------------------ hemkomsten
  _homecoming(ctx) {
    if (!this._alive || this._phase !== 'drive') return
    this._phase = 'arrive'
    this._missionActive = false
    this._stopTogglePulse()
    if (this._skata) this._skata.phase = 'flee'
    if (this._panel && !this._panel.destroyed) {
      gsap.killTweensOf(this._panel)
      this._panelFade = gsap.to(this._panel, { alpha: 0, duration: 0.4 })
    }
    // Gatan töms när bilen bromsar (alla "går hem") — kvarglömda strövare ska inte
    // stå bredvid paradfigurerna och konkurrera om finalögonblicket. Pågående
    // hemdrag (netted) får löpa klart och landa i sätet.
    for (const rec of [...this._targets]) {
      if (rec.netted) {
        rec.walkV = 0
        continue
      }
      if (rec.view && !rec.view.destroyed) puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 4 })
      this._removeTarget(rec)
    }
    // parallaxen saktar in (proxy-tween på scrollvärdet)
    const st = { v: this._scroll }
    const tw = gsap.to(st, {
      v: 0,
      duration: 1.9,
      ease: 'power2.out',
      onUpdate: () => {
        if (!this._alive) {
          tw.kill()
          return
        }
        this._scroll = st.v
      },
    })
    this._tws.push(tw)
    // hemmet glider fram och stannar mitt i bild
    const house = this._mkHomeHouse()
    house.x = 1560
    this._midLayer.addChild(house)
    this._homeHouse = house
    const hs = { x: 1560 }
    const tw2 = gsap.to(hs, {
      x: 700,
      duration: 1.9,
      ease: 'power2.out',
      onUpdate: () => {
        if (house.destroyed) {
          tw2.kill()
          return
        }
        house.x = hs.x
      },
    })
    this._tws.push(tw2)
    ctx.later(2.1, () => {
      if (!this._alive) return
      ctx.services.voice.say('Nu är vi hemma — vilket äventyr!')
      ctx.services.audio.sfx('reveal')
      this._hopOut(ctx)
    })
    // complete säger PRAISE och avbryter tal — spelets replik måste hinna klart
    ctx.later(3.9, () => {
      if (!this._alive) return
      this._level += 1
      ctx.progress.setLevel(this._level)
      ctx.progress.complete()
    })
    ctx.later(6.8, () => this._startRound(ctx))
  },

  _mkHomeHouse() {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const bw = 330
    const bh = 215
    const topY = SIDEWALK_TOP - bh
    g.rect(0, topY, bw, bh).fill(0xffe3a9).stroke({ width: 4, color: 0xd9a021 })
    g.moveTo(-20, topY).lineTo(bw / 2, topY - 78).lineTo(bw + 20, topY).closePath().fill(0xc0574f)
    g.rect(bw * 0.72, topY - 52, 20, 46).fill(0x8a5a3b)
    // dörr med runt fönster + trappa
    g.roundRect(bw / 2 - 34, SIDEWALK_TOP - 104, 68, 104, 8).fill(0x8a5a3b)
    g.circle(bw / 2, SIDEWALK_TOP - 76, 12).fill(0xffe9b0)
    g.circle(bw / 2 + 22, SIDEWALK_TOP - 52, 4.5).fill(0xffd35c)
    g.rect(bw / 2 - 44, SIDEWALK_TOP - 10, 88, 10).fill(0xd9c9a8)
    // varma fönster med blomlådor
    for (const wx of [bw * 0.2, bw * 0.8]) {
      g.roundRect(wx - 28, topY + 62, 56, 60, 4).fill(0xffe9b0).stroke({ width: 4, color: 0xfffdf7 })
      g.moveTo(wx, topY + 62).lineTo(wx, topY + 122).moveTo(wx - 28, topY + 92).lineTo(wx + 28, topY + 92).stroke({ width: 3, color: 0xfffdf7 })
      g.roundRect(wx - 32, topY + 122, 64, 10, 4).fill(0x8a5a3b)
      for (let i = 0; i < 3; i++) g.circle(wx - 18 + i * 18, topY + 120, 6).fill([0xff9ec4, 0xff6b6b, 0xffd35c][i])
    }
    // buskar + lykta
    g.circle(-24, SIDEWALK_TOP - 16, 18).fill(0x7fae84)
    g.circle(bw + 26, SIDEWALK_TOP - 14, 15).fill(0x8fbe8f)
    g.eventMode = 'none'
    c.addChild(g)
    return c
  },

  _hopOut(ctx) {
    // alla insamlade hoppar ur och firar framför huset — spelets EGEN finalscen
    const list = this._seatList.slice(-8)
    // huvudena i sätet försvinner (de "hoppar ur")
    for (const h of this._seatHeads) {
      if (h.c && !h.c.destroyed) h.c.destroy({ children: true })
    }
    this._seatHeads = []
    list.forEach((kind, i) => {
      ctx.later(0.18 * i, () => {
        if (!this._alive) return
        const fig = KIND_DRAW[kind]()
        fig.scale.set(0.7)
        fig.position.set(SEAT.x - 40, SEAT.y)
        fig.eventMode = 'none'
        this._targetLayer.addChild(fig)
        const tx = 660 + i * 56 + rnd(-10, 10)
        const ty = GROUND - 6
        const sx = fig.x
        const sy = fig.y
        const st = { p: 0 }
        const tw = gsap.to(st, {
          p: 1,
          duration: 0.6,
          ease: 'power1.inOut',
          onUpdate: () => {
            if (fig.destroyed) {
              tw.kill()
              return
            }
            fig.x = sx + (tx - sx) * st.p
            fig.y = sy + (ty - sy) * st.p - Math.sin(st.p * Math.PI) * 150
          },
          onComplete: () => {
            if (fig.destroyed) return
            puff(ctx.fxLayer, fig.x, fig.y + 16, { count: 5 })
            if (this._alive) ctx.services.audio.tone({ freq: NOTES[i % NOTES.length], dur: 0.16, type: 'triangle', vol: 0.2 })
          },
        })
        this._tws.push(tw)
        this._outFriends.push({ c: fig, seed: Math.random() * 9, by: ty })
      })
    })
    if (list.length === 0) {
      // inget insamlat (ovanligt men möjligt): huset firar ändå
      sparkle(ctx.fxLayer, 860, 420, { count: 10 })
    }
  },

  _startRound(ctx) {
    if (!this._alive) return
    this._phase = 'drive'
    this._missionsDone = 0
    this._missionActive = false
    this._missionOrder = shuffle(['katt', 'paket', 'ballong'])
    this._journey = 0
    this._biomeFlip = !this._biomeFlip
    this._scrollBase = 2.1 + Math.min(1.0, this._level * 0.12)
    this._seatList = []
    // gatan töms mjukt (de som blev kvar går hem — puff och borta)
    for (const rec of [...this._targets]) {
      if (rec.view && !rec.view.destroyed) puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 4 })
      this._removeTarget(rec)
    }
    for (const f of this._outFriends) {
      if (f.c && !f.c.destroyed) {
        puff(ctx.fxLayer, f.c.x, f.c.y, { count: 4 })
        f.c.destroy({ children: true })
      }
    }
    this._outFriends = []
    // hemmets hus lämnas kvar som segment och scrollar av skärmen naturligt
    if (this._homeHouse && !this._homeHouse.destroyed) {
      this._mid.push({ c: this._homeHouse, w: 380, wins: [] })
    }
    this._homeHouse = null
    // farten tillbaka upp
    const st = { v: 0 }
    const tw = gsap.to(st, {
      v: this._scrollBase,
      duration: 1.6,
      ease: 'power1.in',
      onUpdate: () => {
        if (!this._alive) {
          tw.kill()
          return
        }
        this._scroll = st.v
      },
    })
    this._tws.push(tw)
    this._spawnTimer = 1.4
    this._gustTimer = 12
    this._skataTimer = 18
    ctx.later(3.4, () => this._announce(ctx))
  },

  // ------------------------------------------------------------------ tick
  _update(ctx, tk) {
    if (!this._alive) return
    const dtF = Math.min(tk.deltaTime, 2)
    const dtMS = Math.min(tk.deltaMS, 40)
    const dt = dtMS / 1000
    this._t += dt
    const sc = this._scroll * dtF
    this._journey += sc

    this._scrollLayers(ctx, sc)
    this._drawGroundStrips()
    this._shiftBodies(sc)
    this._behave(ctx, dtF)
    this._phys.update(dtMS)
    this._afterPhysics(ctx, dtF)
    this._advanceShots(ctx, dtMS, sc)
    this._drawNets()
    this._healWindows(ctx)
    this._updateSkata(ctx, dtF)
    this._updateArm(dt, dtF)

    // sätes-vännerna guppar lugnt
    for (const h of this._seatHeads) {
      if (h.c && !h.c.destroyed) h.c.y = h.by + Math.sin(this._t * 3 + h.seed) * 3
    }
    // utsläppta vänner studsar av glädje under hemkomsten
    for (const f of this._outFriends) {
      if (f.c && !f.c.destroyed && Math.abs(f.c.y - f.by) < 30) f.c.y = f.by - Math.abs(Math.sin(this._t * 4 + f.seed)) * 10
    }
    // moln driver
    for (const m of this._clouds) {
      if (m.destroyed) continue
      m.x -= 0.16 * dtF
      if (m.x < -140) m.x = 1420
    }
    if (this._biomeTint && !this._biomeTint.destroyed) this._biomeTint.alpha = this._biomeT() * 0.1

    if (this._phase === 'drive') {
      this._spawnTimer -= dt
      if (this._spawnTimer <= 0) {
        this._spawnTimer = rnd(2.2, 3.4)
        this._spawnTick(ctx)
      }
      this._gustTimer -= dt
      if (this._gustTimer <= 0) {
        this._gustTimer = rnd(12, 17)
        this._gust(ctx)
      }
      this._skataTimer -= dt
      if (this._skataTimer <= 0) {
        this._skataTimer = rnd(19, 26)
        this._spawnSkata(ctx)
      }
      if (this._missionActive) {
        this._missionT += dt
        if (this._missionT > 24) {
          this._missionT = 0
          // mjuk hjälp, sent och synligt: peka ut ett uppdrags-mål + repetera repliken
          const def = this._missionDef(this._missionKey)
          const m = this._targets.find((r) => def.kinds.includes(r.kind) && !r.netted && r.view.x > 100 && r.view.x < 1200)
          if (m) {
            sparkle(ctx.fxLayer, m.view.x, m.view.y - 30, { count: 8 })
            floatText(ctx.fxLayer, m.view.x, m.view.y - 70, '👆', { fontSize: 56 })
          } else {
            this._spawnTarget(ctx, this._missionKey === 'paket' ? 'paket' : this._missionKey, 1340)
          }
          ctx.services.voice.replayLast()
        }
      }
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.replayLast()
        const m = this._targets.find((r) => !r.netted && r.view.x > 200 && r.view.x < 1100)
        if (m) {
          sparkle(ctx.fxLayer, m.view.x, m.view.y - 20, { count: 6 })
          floatText(ctx.fxLayer, m.view.x, m.view.y - 66, '👆', { fontSize: 56 })
        }
      }
    }
  },

  _scrollLayers(ctx, sc) {
    // fjärran siluetter
    for (const s of this._far) s.c.x -= sc * 0.35
    while (this._far.length && this._far[0].c.x + this._far[0].w < -80) {
      const s = this._far.shift()
      s.c.destroy({ children: true })
    }
    let farEdge = this._far.length ? this._far[this._far.length - 1].c.x + this._far[this._far.length - 1].w : 1400
    while (farEdge < 1500) {
      const s = this._mkFarSeg(this._biomeT())
      s.c.x = farEdge
      this._farLayer.addChild(s.c)
      this._far.push(s)
      farEdge += s.w
    }
    // gatuplanets hus
    for (const s of this._mid) s.c.x -= sc
    while (this._mid.length && this._mid[0].c.x + this._mid[0].w < -120) {
      const s = this._mid.shift()
      for (const win of s.wins) {
        if (win.state === 'broken') this._brokenCount = Math.max(0, this._brokenCount - 1)
      }
      s.c.destroy({ children: true })
    }
    let midEdge = this._mid.length ? this._mid[this._mid.length - 1].c.x + this._mid[this._mid.length - 1].w : 1400
    while (midEdge < 1560) {
      const s = this._mkMidSeg(ctx, this._biomeT())
      s.c.x = midEdge
      this._midLayer.addChild(s.c)
      this._mid.push(s)
      if (s._wxPotAt) this._spawnPotAt(ctx, s)
      midEdge += s.w
    }
  },

  _drawGroundStrips() {
    const g = this._groundG
    if (!g || g.destroyed) return
    g.clear()
    // trottoar-skarvar (gatuplanets fart)
    const off1 = this._journey % 96
    for (let x = -off1; x < 1300; x += 96) {
      g.moveTo(x, SIDEWALK_TOP + 6).lineTo(x - 6, SIDEWALK_BOT - 2).stroke({ width: 3, color: 0xb9b3a6, alpha: 0.7 })
    }
    // vägkantens streck (närmast → snabbast)
    const off2 = (this._journey * 1.7) % 140
    for (let x = -off2; x < 1320; x += 140) {
      g.roundRect(x, SIDEWALK_BOT + 26, 58, 9, 4).fill({ color: 0xd8d3c8, alpha: 0.6 })
    }
    // små fartstreck vid kantstenen
    const off3 = (this._journey * 1.7) % 64
    for (let x = -off3; x < 1300; x += 64) {
      g.moveTo(x, SIDEWALK_BOT + 3).lineTo(x + 20, SIDEWALK_BOT + 3).stroke({ width: 3, color: 0xffffff, alpha: 0.2 })
    }
  },

  // Kameran åker framåt = världen (alla kroppar) flyttas bakåt. setPosition
  // translaterar positionPrev med → farten bevaras (matter 0.20).
  _shiftBodies(sc) {
    if (sc === 0) return
    for (const rec of this._targets) {
      const p = rec.body.position
      Body.setPosition(rec.body, { x: p.x - sc, y: p.y })
    }
  },

  _behave(ctx, dtF) {
    for (const rec of this._targets) {
      const b = rec.body
      if (rec.netted) {
        // dragnätet: kroppen accelererar hem mot bilen
        rec.pullV = Math.min(rec.pullV + 0.6 * dtF, 17)
        const dx = CAR_PULL.x - b.position.x
        const dy = CAR_PULL.y - b.position.y
        const d = Math.hypot(dx, dy) || 1
        if (d < 120) {
          this._collect(ctx, rec)
          continue
        }
        Body.setVelocity(b, { x: (dx / d) * rec.pullV, y: (dy / d) * rec.pullV })
        continue
      }
      if (rec.stuck) continue
      if (rec.kind === 'fagel') {
        Body.setVelocity(b, { x: -0.5, y: Math.sin(this._t * 2.4 + rec.seed) * 0.9 })
      } else if (rec.kind === 'ballong') {
        Body.setVelocity(b, { x: Math.sin(this._t * 1.6 + rec.seed) * 0.4, y: -0.75 })
      } else if (rec.walkV !== 0 && this._phase === 'drive') {
        // promenad på trottoaren (bara när kroppen står nästan stilla vertikalt)
        if (Math.abs(b.velocity.y) < 1.2) Body.setVelocity(b, { x: rec.walkV, y: b.velocity.y })
      }
    }
  },

  _afterPhysics(ctx, dtF) {
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const rec = this._targets[i]
      const { x, y } = rec.body.position
      // städning utanför bild
      if (x < -180 || x > 1560 || y < -170 || y > 880) {
        this._removeTarget(rec)
        continue
      }
      // eget liv: gupp, vingslag, guld-glitter
      if (rec.inner && !rec.inner.destroyed) {
        if (rec.stuck) {
          rec.inner.rotation = Math.sin(this._t * 2.2 + rec.seed) * 0.05
        } else if (rec.kind !== 'paket' && rec.kind !== 'kruka') {
          rec.inner.y = Math.sin(this._t * 3.2 + rec.seed) * 2.5
        }
        const wing = rec.inner.children[0]?._wxWing
        if (wing && !wing.destroyed) {
          if (rec.kind === 'fagel') wing.rotation = Math.sin(this._t * 15 + rec.seed) * 0.6
          else wing.rotation = Math.sin(this._t * 1.8 + rec.seed) * 0.05 // krukans blomma svajar
        }
      }
      if (rec.golden && this._t - (rec.sparkAt || 0) > 1.1) {
        rec.sparkAt = this._t
        if (rec.view.x > -20 && rec.view.x < 1300) sparkle(ctx.fxLayer, rec.view.x + rnd(-20, 20), rec.view.y - rnd(0, 30), { count: 2 })
      }
    }
  },

  _removeTarget(rec) {
    const i = this._targets.indexOf(rec)
    if (i >= 0) this._targets.splice(i, 1)
    this._phys.removeBody(rec.body)
    if (rec.view && !rec.view.destroyed) {
      gsap.killTweensOf(rec.view)
      rec.view.destroy({ children: true })
    }
  },

  // ------------------------------------------------------------------ skott-animering
  _advanceShots(ctx, dtMS, sc) {
    for (let i = this._shots.length - 1; i >= 0; i--) {
      const s = this._shots[i]
      if (s.phase === 'fly') {
        // följ målet under flykten (nätet "jagar" träffpunkten)
        if (s.rec && this._targets.includes(s.rec)) {
          s.ex = s.rec.view.x
          s.ey = s.rec.view.y
        } else if (s.win) {
          s.ex = s.seg.c.x + s.win.lx
          s.ey = s.win.cy
        } else if (s.skata && this._skata && !this._skata.c.destroyed) {
          s.ex = this._skata.c.x
          s.ey = this._skata.c.y
        }
        s.p += dtMS / SHOT_MS
        if (s.p >= 1) {
          s.p = 1
          this._resolveShot(ctx, s)
          if (s.phase === 'fly') this._shots.splice(i, 1) // träff hanterad → skottet klart
        }
      } else if (s.phase === 'wall') {
        s.ex -= sc // missnätet sitter på husväggen och åker med
        s.life -= dtMS / 900
        if (s.life <= 0) this._shots.splice(i, 1)
      }
    }
  },

  _drawNets() {
    const g = this._netG
    if (!g || g.destroyed) return
    g.clear()
    const hand = this._handPos()
    for (const s of this._shots) {
      if (s.phase === 'fly') {
        const x = hand.x + (s.ex - hand.x) * s.p
        const y = hand.y + (s.ey - hand.y) * s.p
        const mx = (hand.x + x) / 2
        const my = (hand.y + y) / 2 + 14 * (1 - s.p)
        g.moveTo(hand.x, hand.y).quadraticCurveTo(mx, my, x, y).stroke({ width: 5, color: 0xf6f6f2, alpha: 0.9 })
        g.circle(x, y, 7 + s.p * 5).fill({ color: 0xffffff, alpha: 0.9 })
      } else {
        // kort fastnat nät på väggen som tonar bort
        const a = Math.max(0, s.life)
        g.moveTo(0, 0) // säkra att inget implicit streck dras från origo
        const r = 34
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2
          g.moveTo(s.ex, s.ey).lineTo(s.ex + Math.cos(ang) * r, s.ey + Math.sin(ang) * r)
        }
        g.stroke({ width: 3, color: 0xf6f6f2, alpha: 0.8 * a })
        g.circle(s.ex, s.ey, r * 0.55).stroke({ width: 2, color: 0xf6f6f2, alpha: 0.6 * a })
      }
    }
    // dragnätets rep: hand → varje kropp på väg hem
    for (const rec of this._targets) {
      if (!rec.netted) continue
      const mx = (hand.x + rec.view.x) / 2
      const my = (hand.y + rec.view.y) / 2 + 22
      g.moveTo(hand.x, hand.y).quadraticCurveTo(mx, my, rec.view.x, rec.view.y).stroke({ width: 4, color: 0xf6f6f2, alpha: 0.85 })
    }
  },

  _updateArm(dt, dtF) {
    const a = this._arm
    if (!a || a.destroyed) return
    this._armAim *= Math.max(0, 1 - 2.2 * dt)
    a.rotation += (this._armAim - a.rotation) * Math.min(1, 0.3 * dtF)
    this._recoil = Math.max(0, this._recoil - 5.5 * dt)
    const bob = Math.sin(this._t * 1.7) * 5 // vilo-guppning
    a.y = ARM_PIVOT.y + bob + this._recoil * 26
  },

  // ------------------------------------------------------------------ kollisioner
  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      const mark = a.label === 'mark' ? a : b.label === 'mark' ? b : null
      if (!mark) continue
      const other = mark === a ? b : a
      const spd = Math.hypot(other.velocity.x, other.velocity.y)
      if (spd > 3.5 && this._t - (this._lastBoing || 0) > 0.25) {
        this._lastBoing = this._t
        if (!ctx.services.audio.sample('boing')) ctx.services.audio.sfx('pop')
        const rec = this._targets.find((r) => r.body === other)
        if (rec && rec.view && !rec.view.destroyed) {
          puff(ctx.fxLayer, rec.view.x, rec.view.y + rec.r * 0.6, { count: 4, color: 0xd8d3c8 })
          if (rec.inner && !rec.inner.destroyed) wiggle(rec.inner)
        }
      }
    }
  },

  // ------------------------------------------------------------------ städning
  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    for (const tw of this._tws) tw?.kill()
    this._tws = []
    this._stopTogglePulse()
    this._panelFade?.kill()
    if (this._surface && !this._surface.destroyed) this._surface.off('pointertap', this._onTapH)
    if (this._toggle && !this._toggle.destroyed) {
      this._toggle.off('pointerdown', this._onToggleDown)
      this._toggle.off('pointerup', this._onToggleUp)
      this._toggle.off('pointerupoutside', this._onToggleUp)
      this._toggle.off('pointertap', this._onToggleTap)
      gsap.killTweensOf(this._toggle)
      gsap.killTweensOf(this._toggle.scale)
    }
    if (this._panel && !this._panel.destroyed) {
      gsap.killTweensOf(this._panel)
      gsap.killTweensOf(this._panel.scale)
    }
    if (this._arm && !this._arm.destroyed) {
      gsap.killTweensOf(this._arm)
      gsap.killTweensOf(this._arm.scale)
    }
    for (const rec of this._targets) {
      if (rec.view) {
        gsap.killTweensOf(rec.view)
        if (rec.view.scale) gsap.killTweensOf(rec.view.scale)
      }
      if (rec.inner) {
        gsap.killTweensOf(rec.inner)
        if (rec.inner.scale) gsap.killTweensOf(rec.inner.scale)
      }
      if (rec.netG && rec.netG.scale) gsap.killTweensOf(rec.netG.scale)
    }
    for (const seg of this._mid) {
      for (const win of seg.wins || []) {
        if (win.mc && win.mc.scale) gsap.killTweensOf(win.mc.scale)
      }
    }
    for (const h of this._seatHeads) {
      if (h.c) {
        gsap.killTweensOf(h.c)
        if (h.c.scale) gsap.killTweensOf(h.c.scale)
      }
    }
    for (const f of this._outFriends) {
      if (f.c) {
        gsap.killTweensOf(f.c)
        if (f.c.scale) gsap.killTweensOf(f.c.scale)
      }
    }
    if (this._skata?.c?.scale) gsap.killTweensOf(this._skata.c.scale)
    this._targets = []
    this._shots = []
    this._far = []
    this._mid = []
    this._seatHeads = []
    this._outFriends = []
    this._skata = null
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
