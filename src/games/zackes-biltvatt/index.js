// Zackes Biltvätt — tvätta smutsiga fordon i TVÅ FASER medan fåglar flyger förbi
// och bajsar (2–5 år).
//
// KÄRNLOOP (båda verktygen krävs, i ordning):
//   smuts/bajs --svampen (flera drag)--> SKUM --slangen (spola)--> REN YTA
// Svampen löser aldrig upp smutsen rakt av: den skrubbar loss den till lödder som
// ligger kvar på plåten. Först när skummet är bortspolat är ytan ren. Att bara ha
// ett verktyg räcker alltså inte — valet "vilket verktyg nu?" har ett riktigt svar
// som ändras hela tiden.
//
// Slangen är en RIKTIG slang: en vattenpost står i scenen och slangen är en
// verlet-kedja (20 punkter, avståndsvillkor + gravitation + dämpning) som släpar
// efter munstycket som ett rep. Vatten sprutar medan barnet håller i munstycket,
// i den riktning sista segmentet pekar. Kedjans längd är räckvidden — den tar
// mjukt stopp.
//
// MOTGÅNG (se P0 i CLAUDE.md): fågelbajs är ett äkta bakslag men med hårt tak —
// max 3 bajsfläckar på bilen samtidigt, därefter missar fåglarna och bajset plaskar
// bredvid. Ursprungssmutsen kommer aldrig tillbaka, så arbetet kan bara sakta ner,
// aldrig växa ifrån barnet. Ingen timer, ingen poäng, inget misslyckande.
//
// FRISTÅENDE OBJEKT (P0 ASSETS / DESIGN.md §8.1): svamp, slang, munstycke,
// vattenpost, hink, ägare och fordon är ritade föremål med egen silhuett — inga
// brickor, inga emoji-som-objekt. Träffytorna är osynliga hitArea-halon.
//
// All transient effekt går via lib/feedback.js (exit-säkert) eller {}-proxy-tweens,
// och allt fördröjt är vaktat av this._alive. Slangfysiken är ren matematik i
// tickern + en Graphics → dör med roten i destroy().
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { puff, sparkle, floatText, ripple, wiggle, shake } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { FONT } from '../../lib/theme.js'

// --- Fordon: karossform + färg + en ritad detalj. Allt programmatiskt. ---
const VEHICLES = [
  { key: 'bil', namn: 'bilen', color: 0xe94f4f, w: 340, h: 130, roof: 0.58, roofW: 0.52, wheels: [-0.28, 0.3] },
  { key: 'buss', namn: 'bussen', color: 0xf5b73d, w: 420, h: 165, roof: 0.9, roofW: 0.9, wheels: [-0.32, 0.32] },
  { key: 'brandbil', namn: 'brandbilen', color: 0xd93c3c, w: 400, h: 150, roof: 0.62, roofW: 0.4, wheels: [-0.33, 0.3] },
  { key: 'traktor', namn: 'traktorn', color: 0x5bbf6a, w: 300, h: 140, roof: 0.7, roofW: 0.42, wheels: [-0.3, 0.32], bigRear: true },
  { key: 'glassbil', namn: 'glassbilen', color: 0x63c7d6, w: 360, h: 150, roof: 0.72, roofW: 0.6, wheels: [-0.3, 0.3] },
  { key: 'lastbil', namn: 'lastbilen', color: 0x6b8dd6, w: 420, h: 155, roof: 0.64, roofW: 0.38, wheels: [-0.34, 0.28] },
]

// --- Fåglar: storlek + bajsnyans + hur segt bajset sitter (skrubbsteg = seg*2). ---
const BIRDS = [
  { key: 'sparv', namn: 'sparven', size: 0.62, body: 0x9b7653, poop: 0xf4f2e6, poopR: 24, seg: 1, ljud: 'djur_hona' },
  { key: 'duva', namn: 'duvan', size: 0.82, body: 0x9aa4b0, poop: 0xdcdcd0, poopR: 31, seg: 1, ljud: 'djur_uggla' },
  { key: 'mas', namn: 'måsen', size: 1.0, body: 0xf2f2f2, poop: 0xd6e2ba, poopR: 39, seg: 2, ljud: 'djur_anka' },
  { key: 'gas', namn: 'gåsen', size: 1.22, body: 0xe8e4d8, poop: 0xa9814f, poopR: 47, seg: 3, ljud: 'djur_tupp' },
]
const RAINBOW_BIRD = {
  key: 'regnbage', namn: 'regnbågsfågeln', size: 1.05, body: 0xffffff,
  poop: 0xffd7f2, poopR: 35, seg: 1, ljud: 'magi', glitter: true,
}

// --- Ägare: ritade djur (ingen emoji som föremål). ---
const OWNERS = [
  { key: 'hund', fur: 0xc98a4b, dark: 0xa06d38, klader: 0x4aa3df, ear: 'flop', nos: 0x3a2a1e, mule: 0xf0d3a8 },
  { key: 'ko', fur: 0xf6f2ec, dark: 0x3a3a3a, klader: 0xef8f5b, ear: 'side', nos: 0x9a5f6b, mule: 0xffc7d0, flackar: true, horn: true },
  { key: 'gris', fur: 0xf7a8c0, dark: 0xe07fa0, klader: 0x7bc47f, ear: 'point', nos: 0x8a4a63, mule: 0xf58fb0 },
  { key: 'kanin', fur: 0xeae4dc, dark: 0xcfc6ba, klader: 0xb08bd8, ear: 'long', nos: 0xd98aa0, mule: 0xffffff },
]

// C-dur pentatonisk — varje ren yta klättrar ett steg → en bil = en liten melodi.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1568.0]

const MAX_BAJS = 3        // taket: så många bajsfläckar kan finnas på bilen samtidigt
const CAR_X = 560
const CAR_Y = 425
const FLOOR_Y = 620       // slangen/munstycket kan aldrig sjunka under tvätthallsgolvet

// Vattenposten + slangen (verlet-kedja).
const HYDRANT = { x: 112, y: 558 }
const ANCHOR = { x: 164, y: 548 }   // där slangen sitter fast i posten (= HYDRANT + höger stos)
const HOSE_N = 20                   // punkter i kedjan
const HOSE_SEG = 42                 // px per segment → 19 × 42 = 798 px slang
// Greppet (punkt n-2) kan aldrig komma längre från posten än kedjan räcker — lite
// marginal så slangen alltid behåller en mjuk båge i stället för att bli ett rakt spö.
const HOSE_REACH = (HOSE_N - 2) * HOSE_SEG * 0.94
const HOSE_GRAV = 0.62              // px per fast steg²
const HOSE_DAMP = 0.93
const JET_LEN = 235                 // strålens längd

// Svampen: hur mycket arbete ett skrubbsteg kostar.
const SCRUB_PX = 78                 // px svamprörelse per steg
const SCRUB_HOLD = 0.5              // steg/s bara av att hålla still (säkerhetsnät)
const SCRUB_R = 74                  // hur nära svampen måste vara fläckens kant
const RINSE_RATE = 3.1              // skumsteg per sekund i strålen
const SPONGE_HOME = { x: 300, y: 506 }

const rnd = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'zackes-biltvatt',
  titleSv: 'Zackes Biltvätt',
  icon: '🚗',
  category: 'roligt',
  input: 'mixed',
  bundle: 'zackes-biltvatt',
  ageRange: [2, 5],
  voiceIntro: 'Zacke tvättar bilar! Skrubba med svampen och spola sedan bort skummet.',

  init(ctx) {
    this._alive = true
    this._started = false
    this._t = 0
    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._idle = 0
    this._birdTimer = 0
    this._spots = []
    this._fading = []
    this._birds = []

    // Svamp-tillstånd (modulobjektet återanvänds mellan besök — nollställ ALLT här)
    this._spongeDrag = false
    this._spongePos = { x: SPONGE_HOME.x, y: SPONGE_HOME.y }
    this._spongePrev = { x: SPONGE_HOME.x, y: SPONGE_HOME.y }
    this._spBaseX = SPONGE_HOME.x
    this._spBaseY = SPONGE_HOME.y
    this._spTap = null
    this._spPress = 1

    // Slang-tillstånd
    this._hoseDrag = false
    this._hoseTarget = null
    this._hoseAuto = null
    this._nozPress = 1
    this._jetSound = 0
    this._dropT = 0
    this._splashT = 0
    this._wetCue = 0
    this._foamCue = 0

    this._selected = null      // 'svamp' | 'slang' | null (tap-tap-fallback)
    this._cleanedInCar = 0
    // Engångs-cues (nollställs vid varje besök så de faktiskt hörs igen)
    this._hosedBird = false
    this._hintedHose = false
    this._saidFoam = false
    this._saidFoamHose = false
    this._saidScrubFirst = false
    this._foamIdleCue = 0

    this._buildScene(ctx)
    this._nextCar(ctx, false)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---------------------------------------------------------------- scen

  _buildScene(ctx) {
    this._root.addChild(createScene('meadow'))

    // Tvätthallens golv (mörkare platta under bilen).
    const floor = new Graphics()
      .roundRect(120, 505, 1040, 120, 28)
      .fill({ color: 0x8fa0a8, alpha: 0.55 })
      .stroke({ width: 5, color: 0x6f8189, alpha: 0.5 })
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Osynlig heltäckande träffyta: fångar ALLA tryck på ytan (tap-tap-fallbacken).
    // Ligger bakom allt annat interaktivt (fåglar, svamp, munstycke vinner).
    const catcher = new Container()
    catcher.eventMode = 'static'
    catcher.hitArea = { contains: (x, y) => x >= 0 && x <= 1280 && y >= 0 && y <= 720 }
    catcher._tap = (e) => {
      const p = this._root.toLocal(e.global)
      this._tapAt(ctx, p.x, p.y)
    }
    catcher.on('pointertap', catcher._tap)
    this._catcher = catcher
    this._root.addChild(catcher)

    // Glansbågen till höger — bilen rullar ut genom den när den är ren.
    this._arch = this._makeArch()
    this._arch.position.set(1105, 400)
    this._root.addChild(this._arch)

    this._carLayer = new Container()
    this._carLayer.eventMode = 'none'
    this._root.addChild(this._carLayer)

    // Ägaren väntar vid bågen.
    this._owner = new Container()
    this._owner.eventMode = 'none'
    this._owner.position.set(1000, 442)
    this._ownerHomeY = 442
    this._root.addChild(this._owner)

    // Zacke — hejar när en yta blir ren.
    this._zacke = this._makeZacke()
    this._zacke.position.set(186, 448)
    this._root.addChild(this._zacke)

    // Hinken som svampen vilar på (ritat föremål, ingen bricka).
    this._bucket = this._makeBucket()
    this._bucket.position.set(300, 556)
    this._root.addChild(this._bucket)

    // Vattenposten + slangen.
    this._hydrant = this._makeHydrant()
    this._hydrant.position.set(HYDRANT.x, HYDRANT.y)
    this._root.addChild(this._hydrant)

    this._hoseG = new Graphics()
    this._hoseG.eventMode = 'none'
    this._root.addChild(this._hoseG)
    this._initHose()

    // Fåglarna flyger ovanför allt utom verktyg/fx.
    this._birdLayer = new Container()
    this._root.addChild(this._birdLayer)

    // Verktygen (fristående föremål med osynlig träffyta).
    this._toolLayer = new Container()
    this._root.addChild(this._toolLayer)
    this._nozzle = this._makeNozzle()
    this._svamp = this._makeSponge()
    this._svamp.position.set(SPONGE_HOME.x, SPONGE_HOME.y)
    this._toolLayer.addChild(this._nozzle, this._svamp)
    this._bindSponge(ctx)
    this._bindNozzle(ctx)

    // FX överst (stråle, droppar, puffar).
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._jet = new Graphics()
    this._jet.eventMode = 'none'
    this._fx.addChild(this._jet)
    this._root.addChild(this._fx)

    this._drawHose()
  },

  _makeArch() {
    const c = new Container()
    const g = new Graphics()
    g.roundRect(-62, -190, 26, 380, 12).fill(0xbfd4dc)
    g.roundRect(36, -190, 26, 380, 12).fill(0xbfd4dc)
    g.roundRect(-62, -212, 124, 34, 14).fill(0x9dbcc7)
    c.addChild(g)
    // Glittrande "glans"-droppar i bågen.
    for (let i = 0; i < 5; i++) {
      const d = new Graphics().circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.75 })
      d.position.set(-40 + i * 20, -170 + (i % 2) * 14)
      c.addChild(d)
      const proxy = { a: 0.3 + Math.random() * 0.5 }
      gsap.to(proxy, {
        a: 0.9, duration: 0.7 + Math.random() * 0.6, yoyo: true, repeat: -1,
        ease: 'sine.inOut', delay: i * 0.12,
        onUpdate: () => { if (!d.destroyed) d.alpha = proxy.a },
      })
      d._twinkleProxy = proxy
    }
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Zacke — enkel figur (huvud, kropp, arm) som kan reagera.
  _makeZacke() {
    const c = new Container()
    const g = new Graphics()
    g.ellipse(0, 54, 40, 10).fill({ color: 0x000000, alpha: 0.14 })   // skugga
    g.roundRect(-30, -40, 60, 92, 22).fill(0x4aa3df)                  // overall
    g.roundRect(-30, 6, 60, 14, 6).fill(0x3f8fc6)                     // bälte
    g.circle(0, -72, 36).fill(0xf7d9b8)                               // huvud
    g.roundRect(-38, -104, 76, 26, 12).fill(0xffd35c)                 // keps
    g.roundRect(-42, -86, 26, 10, 5).fill(0xffd35c)                   // kepsskärm
    g.circle(-13, -74, 5).fill(0x2b2b2b)
    g.circle(13, -74, 5).fill(0x2b2b2b)
    c.addChild(g)
    // Munnen i EGEN Graphics: en .arc() efter andra former i samma Graphics drar en
    // anslutningslinje från förra punkten (streck tvärs över ansiktet).
    const mouth = new Graphics()
      .arc(0, -66, 15, 0.15 * Math.PI, 0.85 * Math.PI)
      .stroke({ width: 5, color: 0x2b2b2b, cap: 'round' })
    c.addChild(mouth)
    const arm = new Graphics().roundRect(-9, -10, 18, 62, 9).fill(0x4aa3df)
    arm.position.set(30, -28)
    c.addChild(arm)
    c._arm = arm
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Hink med tvålvatten — svampens hem (ritat föremål).
  _makeBucket() {
    const c = new Container()
    const g = new Graphics()
    g.ellipse(0, 46, 46, 10).fill({ color: 0x000000, alpha: 0.16 })
    g.poly([-42, -44, 42, -44, 32, 44, -32, 44]).fill(0x4aa3df)          // kropp
    g.poly([-42, -44, -22, -44, -14, 44, -32, 44]).fill({ color: 0xffffff, alpha: 0.18 })
    g.ellipse(0, -44, 42, 12).fill(0x3f8fc6)                             // kant
    g.ellipse(0, -44, 34, 8).fill(0xdff3fb)                              // vattenyta
    c.addChild(g)
    // Skumkupol i hinken.
    const foam = new Graphics()
    for (let i = 0; i < 9; i++) {
      const bx = rnd(-26, 26)
      const by = -46 - Math.random() * 8
      const br = rnd(6, 13)
      foam.circle(bx, by, br).fill({ color: 0xf6fdff, alpha: 0.9 })
      foam.circle(bx - br * 0.3, by - br * 0.32, br * 0.26).fill({ color: 0xffffff, alpha: 0.9 })
    }
    c.addChild(foam)
    // Handtag i egen Graphics (arc-fällan).
    const bygel = new Graphics()
      .arc(0, -44, 44, Math.PI * 1.08, Math.PI * 1.92)
      .stroke({ width: 6, color: 0x2f6f97, cap: 'round' })
    c.addChild(bygel)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Vattenpost — fristående ritat föremål som slangen sitter fast i.
  _makeHydrant() {
    const c = new Container()
    const g = new Graphics()
    g.ellipse(0, 68, 54, 12).fill({ color: 0x000000, alpha: 0.18 })
    g.roundRect(-48, 44, 96, 24, 10).fill(0xb83a3a)              // fotplatta
    g.roundRect(-30, -54, 60, 104, 24).fill(0xd94a4a)            // kropp
    g.roundRect(-26, -50, 16, 92, 8).fill({ color: 0xffffff, alpha: 0.18 })
    g.roundRect(-56, -24, 26, 28, 10).fill(0xb83a3a)             // vänster stos
    g.circle(-56, -10, 13).fill(0xe86a6a)
    g.roundRect(30, -24, 28, 28, 10).fill(0xb83a3a)              // höger stos (slangen)
    g.circle(56, -10, 14).fill(0xe86a6a)
    g.roundRect(-26, -78, 52, 28, 12).fill(0xb83a3a)             // topplock
    g.circle(0, -84, 12).fill(0xe86a6a)
    g.circle(0, -84, 5).fill(0xb83a3a)
    for (let i = 0; i < 4; i++) g.circle(-18 + i * 12, 14, 3).fill({ color: 0x8f2c2c, alpha: 0.7 })
    c.addChild(g)
    // Slangkoppling där kedjan börjar (ANCHOR ligger här i världskoordinater).
    const koppling = new Graphics()
    koppling.circle(ANCHOR.x - HYDRANT.x, ANCHOR.y - HYDRANT.y, 15).fill(0x2f6f97)
    koppling.circle(ANCHOR.x - HYDRANT.x, ANCHOR.y - HYDRANT.y, 9).fill(0x4aa3df)
    c.addChild(koppling)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // ------------------------------------------------------- verktyg (föremål)

  // Riktig disksvamp: gul kropp med porer + grön skursida + mjuk skugga.
  _makeSponge() {
    const c = new Container()
    const shadow = new Graphics().ellipse(0, 36, 46, 10).fill({ color: 0x000000, alpha: 0.16 })
    c.addChild(shadow)
    const g = new Graphics()
    g.roundRect(-50, -24, 100, 52, 16).fill(0xf0b73a)                 // gul kropp (skuggsida)
    g.roundRect(-50, -24, 100, 40, 16).fill(0xffd35c)
    g.roundRect(-50, -42, 100, 26, 12).fill(0x53b877)                 // grön skursida
    g.roundRect(-50, -42, 100, 12, 10).fill({ color: 0x6fcf90, alpha: 0.75 })
    c.addChild(g)
    // Porer + skurkorn (ritad textur, inte en bricka).
    const tex = new Graphics()
    for (let i = 0; i < 14; i++) {
      tex.ellipse(rnd(-42, 42), rnd(-14, 20), rnd(2.5, 6), rnd(2, 4.5))
        .fill({ color: 0xd39a1f, alpha: 0.55 })
    }
    for (let i = 0; i < 16; i++) {
      tex.circle(rnd(-44, 44), rnd(-38, -20), rnd(1.2, 2.6)).fill({ color: 0x2f8f57, alpha: 0.6 })
    }
    tex.ellipse(-24, -8, 16, 5).fill({ color: 0xffffff, alpha: 0.35 })
    c.addChild(tex)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    // Osynlig halo → effektiv träffyta 152×136 px (P0-golvet är 96).
    c.hitArea = { contains: (px, py) => Math.abs(px) <= 76 && Math.abs(py) <= 68 }
    return c
  },

  // Riktigt munstycke: greppdel, blå kropp, metallpip och gummikrage mot slangen.
  _makeNozzle() {
    const c = new Container()
    const g = new Graphics()
    g.roundRect(-30, 6, 28, 42, 11).fill(0x2f6f97)                    // handtag
    g.roundRect(-26, 10, 10, 32, 5).fill({ color: 0xffffff, alpha: 0.16 })
    g.poly([-4, 4, 10, 4, 4, 22, -6, 20]).fill(0x2b2b2b)              // avtryckare
    g.roundRect(-38, -16, 68, 32, 13).fill(0x4aa3df)                  // kropp
    g.roundRect(-34, -14, 58, 11, 6).fill({ color: 0xbfe6fa, alpha: 0.6 })
    g.circle(-38, 0, 14).fill(0x2f6f97)                               // krage mot slangen
    g.roundRect(28, -10, 28, 20, 8).fill(0xc8d6dd)                    // metallpip
    g.roundRect(52, -13, 10, 26, 5).fill(0x9fb4bf)                    // munstycksring
    g.circle(58, 0, 5).fill(0x6f8189)
    c.addChild(g)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    // Osynlig halo → effektiv träffyta 132×120 px.
    c.hitArea = { contains: (px, py) => Math.abs(px) <= 66 && Math.abs(py) <= 60 }
    return c
  },

  _bindSponge(ctx) {
    const s = this._svamp
    s._down = (e) => {
      if (!this._alive || this._locked) return
      this._idle = 0
      this._spongeDrag = true
      this._spTap = null
      this._spPress = 1.16
      const p = this._root.toLocal(e.global)
      s._startX = p.x
      s._startY = p.y
      s._moved = false
      this._spongePos = { x: p.x, y: p.y }
      this._spongePrev = { x: p.x, y: p.y }
      ctx.services.audio.sfx('tap')
      s._move = (ev) => {
        if (!this._alive || !this._spongeDrag) return
        const q = this._root.toLocal(ev.global)
        if (!s._moved && Math.hypot(q.x - s._startX, q.y - s._startY) > 10) {
          s._moved = true
          this._deselect()
        }
        this._spongePos = { x: q.x, y: q.y }
      }
      s._up = () => {
        if (!this._spongeDrag) return
        this._spongeDrag = false
        this._detach(s)
        if (!s._moved) this._toggleSelect(ctx, 'svamp')
      }
      s.on('globalpointermove', s._move)
      s.on('pointerup', s._up)
      s.on('pointerupoutside', s._up)
    }
    s.on('pointerdown', s._down)
  },

  _bindNozzle(ctx) {
    const n = this._nozzle
    n._down = (e) => {
      if (!this._alive || this._locked) return
      this._idle = 0
      this._hoseDrag = true
      this._hoseAuto = null
      this._nozPress = 1.18
      const p = this._root.toLocal(e.global)
      n._startX = p.x
      n._startY = p.y
      n._moved = false
      this._hoseTarget = { x: p.x, y: p.y }
      ctx.services.audio.sfx('tap')
      n._move = (ev) => {
        if (!this._alive || !this._hoseDrag) return
        const q = this._root.toLocal(ev.global)
        if (!n._moved && Math.hypot(q.x - n._startX, q.y - n._startY) > 10) {
          n._moved = true
          this._deselect()
        }
        this._hoseTarget = { x: q.x, y: q.y }
      }
      n._up = () => {
        if (!this._hoseDrag) return
        this._hoseDrag = false
        this._hoseTarget = null
        this._detach(n)
        if (!n._moved) this._toggleSelect(ctx, 'slang')
      }
      n.on('globalpointermove', n._move)
      n.on('pointerup', n._up)
      n.on('pointerupoutside', n._up)
    }
    n.on('pointerdown', n._down)
  },

  _detach(o) {
    if (!o) return
    if (o._move) o.off('globalpointermove', o._move)
    if (o._up) {
      o.off('pointerup', o._up)
      o.off('pointerupoutside', o._up)
    }
    o._move = o._up = null
  },

  _toggleSelect(ctx, kind) {
    if (this._selected === kind) {
      this._deselect()
      ctx.services.audio.sfx('soft')
      return
    }
    this._selected = kind
    ctx.services.audio.sfx('tap')
    ctx.services.voice.say(kind === 'svamp' ? 'Skrubba smutsen med svampen!' : 'Spola med slangen!')
  },

  _deselect() {
    this._selected = null
  },

  // Tryck på ytan (tap-tap-fallbacken). Alltid en positiv reaktion.
  _tapAt(ctx, x, y) {
    if (!this._alive || this._locked) return
    this._idle = 0
    const spot = this._nearestSpot(x, y, 110)

    if (this._selected === 'slang') {
      // Slangen spolar dit en stund.
      this._hoseAuto = { x, y, t: 1.9 }
      ctx.services.audio.sfx('whoosh')
      ripple(this._fx, x, y, { color: 0xbfe6fa, maxR: 90, width: 5, alpha: 0.55 })
      return
    }
    if (this._selected === 'svamp') {
      // Svampen far dit och tar EXAKT ETT skrubbsteg (inte hela fläcken).
      // Medan den är ute släpper den igenom tryck (annars lägger den sig ovanpå
      // fläcken och äter nästa tryck) — den blir tryckbar igen när den är hemma.
      this._spTap = { x, y, spot, done: false, hold: 0 }
      if (this._svamp && !this._svamp.destroyed) this._svamp.eventMode = 'none'
      return
    }

    // Inget verktyg valt: mjuk vägledning som pekar på rätt verktyg för läget.
    ctx.services.audio.sfx('soft')
    if (spot && !spot.view.destroyed) wiggle(spot.view)
    else ripple(this._fx, x, y, { color: 0xffffff, maxR: 60, width: 4, alpha: 0.4 })
    const skum = spot ? spot.fas === 'skum' : this._spots.some((s) => s.fas === 'skum')
    if (skum) {
      ctx.services.voice.say('Ta slangen och spola bort skummet!')
      this._nudgeNozzle()
    } else {
      ctx.services.voice.say('Ta svampen och skrubba!')
      wiggle(this._svamp)
    }
  },

  // Puttar till munstycket så barnet ser var slangen är (ingen wiggle — det är fysik).
  _nudgeNozzle() {
    const pts = this._hose?.pts
    if (!pts) return
    const last = pts[pts.length - 1]
    last.px = last.x + 5
    last.py = last.y + 3
    this._nozPress = 1.2
  },

  _nearestSpot(x, y, extra = 0) {
    let best = null
    let bd = Infinity
    for (const s of this._spots) {
      if (s.view.destroyed) continue
      const w = this._spotWorld(s)
      const d = Math.hypot(w.x - x, w.y - y)
      if (d < s.r + extra && d < bd) {
        bd = d
        best = s
      }
    }
    return best
  },

  // -------------------------------------------------------------- slangfysik

  // Bygger kedjan med exakta segmentlängder (vinkelsekvens) och låter den sätta sig.
  _initHose() {
    const pts = []
    let x = ANCHOR.x
    let y = ANCHOR.y
    pts.push({ x, y, px: x, py: y })
    for (let i = 0; i < HOSE_N - 1; i++) {
      let a
      if (i < 3) a = -0.3                       // ut ur posten, snett uppåt
      else if (i < 7) a = 0.78                  // ner mot marken
      else a = Math.sin(i * 1.7) * 0.95         // slak våg längs marken
      x += Math.cos(a) * HOSE_SEG
      y += Math.sin(a) * HOSE_SEG
      pts.push({ x, y, px: x, py: y })
    }
    this._hose = { pts }
    for (let i = 0; i < 60; i++) this._hoseSubstep()   // låt den falla till ro
  },

  // Barnet håller i slangen strax BAKOM munstycket (näst sista punkten). Munstycket
  // dinglar fritt i sista segmentet → det pekar naturligt nedåt/framåt, precis som en
  // riktig slang man håller i. Därför sprutar vattnet dit barnet siktar, inte rakt upp.
  _hoseTargetPoint() {
    let t = null
    if (this._hoseDrag && this._hoseTarget) {
      t = { x: this._hoseTarget.x, y: this._hoseTarget.y - 34 }
    } else if (this._hoseAuto) {
      // Auto-spolning: greppet ställer sig ovanför måltavlan så strålen faller ner på den.
      const a = this._hoseAuto
      t = { x: a.x, y: Math.max(70, a.y - 205) }
    }
    if (!t) return null
    // Räckviddsstopp: målet klipps till kedjans längd → slangen tänjs aldrig, den
    // tar bara mjukt stopp (barnet kan fortsätta dra, slangen följer inte längre).
    const dx = t.x - ANCHOR.x
    const dy = t.y - ANCHOR.y
    const d = Math.hypot(dx, dy)
    if (d > HOSE_REACH) {
      t = { x: ANCHOR.x + (dx / d) * HOSE_REACH, y: ANCHOR.y + (dy / d) * HOSE_REACH }
    }
    return t
  },

  _hoseSubstep() {
    const pts = this._hose?.pts
    if (!pts) return
    // 1. Verlet-integration (gravitation + dämpning), punkt 0 är fast.
    //    Munstycket är tungt → extra gravitation, så det DINGLAR nedåt när handen
    //    står still (annars pekar strålen dit slangen råkar ligga).
    const sista = pts.length - 1
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]
      let vx = (p.x - p.px) * HOSE_DAMP
      let vy = (p.y - p.py) * HOSE_DAMP
      const sp = Math.hypot(vx, vy)
      if (sp > 70) { vx = (vx / sp) * 70; vy = (vy / sp) * 70 }   // aldrig explodera
      p.px = p.x
      p.py = p.y
      p.x += vx
      p.y += vy + (i === sista ? HOSE_GRAV * 3.2 : HOSE_GRAV)
    }
    // 2. Greppet (näst sista punkten) dras mjukt mot fingret → resten släpar efter
    //    som ett rep och munstycket dinglar i änden.
    const target = this._hoseTargetPoint()
    if (target) {
      const grip = pts[sista - 1]
      grip.x += (target.x - grip.x) * 0.4
      grip.y += (target.y - grip.y) * 0.4
    }
    // 3. Avståndsvillkor (Jakobsen-relaxation). Posten är hårt fast, resten drar i
    //    varandra symmetriskt → drar barnet för långt rätas slangen ut och tar
    //    MJUKT stopp vid kedjans totala längd (19 × 38 = 722 px).
    for (let it = 0; it < 8; it++) {
      pts[0].x = ANCHOR.x
      pts[0].y = ANCHOR.y
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.0001
        const diff = (d - HOSE_SEG) / d
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff }
        else {
          a.x += dx * diff * 0.5
          a.y += dy * diff * 0.5
          b.x -= dx * diff * 0.5
          b.y -= dy * diff * 0.5
        }
      }
    }
    // 4. Marken (lätt friktion så slangen kan släpas).
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]
      if (p.y > FLOOR_Y) {
        p.y = FLOOR_Y
        p.px = p.x - (p.x - p.px) * 0.82
        p.py = p.y
      }
    }
  },

  _stepHose(dt) {
    if (!this._hose) return
    const steps = clamp(Math.round(dt * 60), 1, 3)
    for (let i = 0; i < steps; i++) this._hoseSubstep()
    this._drawHose()
  },

  _hosePath(g) {
    const pts = this._hose.pts
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
    }
    const last = pts[pts.length - 1]
    g.lineTo(last.x, last.y)
  },

  _drawHose() {
    const g = this._hoseG
    if (!g || g.destroyed || !this._hose) return
    g.clear()
    this._hosePath(g)
    g.stroke({ width: 24, color: 0x24607f, cap: 'round', join: 'round' })
    this._hosePath(g)
    g.stroke({ width: 17, color: 0x4aa3df, cap: 'round', join: 'round' })
    this._hosePath(g)
    g.stroke({ width: 5, color: 0xd8f2ff, alpha: 0.45, cap: 'round', join: 'round' })

    // Munstycket sitter i sista punkten och pekar längs sista segmentet.
    const { dir } = this._nozzleTip()
    const pts = this._hose.pts
    const last = pts[pts.length - 1]
    const n = this._nozzle
    if (n && !n.destroyed) {
      n.position.set(last.x, last.y)
      n.rotation = Math.atan2(dir.y, dir.x)
      const flip = Math.abs(n.rotation) > Math.PI / 2 ? -1 : 1
      const sel = this._selected === 'slang' ? 1 + Math.sin(this._t * 7) * 0.07 : 1
      n.scale.set(this._nozPress * sel, this._nozPress * sel * flip)
    }
  },

  _nozzleTip() {
    const pts = this._hose.pts
    const last = pts[pts.length - 1]
    const prev = pts[pts.length - 2]
    let dx = last.x - prev.x
    let dy = last.y - prev.y
    let d = Math.hypot(dx, dy) || 1
    let dir = { x: dx / d, y: dy / d }
    if (this._hoseAuto) {
      // Mjuk siktehjälp i tap-tap-läget så pendlande munstycke ändå träffar.
      const ax = this._hoseAuto.x - last.x
      const ay = this._hoseAuto.y - last.y
      const ad = Math.hypot(ax, ay)
      if (ad > 26) {
        const bx = dir.x + (ax / ad - dir.x) * 0.6
        const by = dir.y + (ay / ad - dir.y) * 0.6
        const bd = Math.hypot(bx, by) || 1
        dir = { x: bx / bd, y: by / bd }
      }
    }
    return { tip: { x: last.x + dir.x * 40, y: last.y + dir.y * 40 }, dir }
  },

  // Ligger punkten (wx,wy) med radie r i vattenstrålen?
  _inJet(tip, dir, wx, wy, r) {
    const vx = wx - tip.x
    const vy = wy - tip.y
    const t = vx * dir.x + vy * dir.y
    if (t < -14 || t > JET_LEN) return false
    const perp = Math.abs(vx * -dir.y + vy * dir.x)
    return perp <= 30 + t * 0.26 + r * 0.85
  },

  // ------------------------------------------------------------------ bil

  _nextCar(ctx, announce = true) {
    if (!this._alive) return
    this._locked = false
    this._cleanedInCar = 0

    const n = this._carsDone || 0
    const v = VEHICLES[n % VEHICLES.length]
    this._vehicle = v

    if (this._car && !this._car.destroyed) {
      gsap.killTweensOf(this._car)
      this._car.destroy({ children: true })
    }
    this._spots = []

    this._car = this._makeVehicle(v)
    this._car.position.set(-360, CAR_Y)
    this._carLayer.addChild(this._car)

    this._makeOwner(n)

    // Smutsfläckar: växer lugnt med antal tvättade bilar (två faser tar tid).
    const antal = Math.min(3 + Math.floor(n * 0.8), 8)
    for (let i = 0; i < antal; i++) {
      const r = 26 + Math.random() * 20
      this._addSpot(ctx, this._randomSpotPos(v, r), 'smuts', null, r)
    }

    gsap.to(this._car, {
      x: CAR_X, duration: 1.05, ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) return
        if (announce && this._started) {
          ctx.services.voice.say(`Här kommer ${v.namn}! Tvätta den ren.`)
        }
      },
    })

    // Takt: fåglarna kommer tätare på senare bilar, men aldrig snabbare än 6 s.
    this._birdInterval = Math.max(6, 9 - n * 0.4)
    this._birdTimer = this._birdInterval * 0.7
    this._idle = 0
  },

  _makeVehicle(v) {
    const c = new Container()
    const w = v.w
    const h = v.h
    const g = new Graphics()

    // Hjul
    const wheelR = v.key === 'traktor' ? 40 : 32
    for (let i = 0; i < v.wheels.length; i++) {
      const wx = v.wheels[i] * w
      const r = v.bigRear && i === 1 ? wheelR * 1.35 : wheelR
      g.circle(wx, h / 2 + 6, r).fill(0x2f3640)
      g.circle(wx, h / 2 + 6, r * 0.45).fill(0xb2bec3)
    }
    // Kaross
    g.roundRect(-w / 2, -h / 2, w, h, 26).fill(v.color)
    // Tak/hytt
    const rw = w * v.roofW
    const rh = h * v.roof
    const rx = -rw / 2 - w * 0.08
    g.roundRect(rx, -h / 2 - rh + 8, rw, rh, 18).fill(v.color)
    // Fönster
    g.roundRect(rx + 12, -h / 2 - rh + 20, rw - 24, rh - 30, 12)
      .fill({ color: 0xdff3fb, alpha: 0.95 })
    // Ljus
    g.circle(w / 2 - 18, -h * 0.1, 13).fill(0xfff3c4)
    g.circle(-w / 2 + 18, -h * 0.1, 11).fill(0xffb3b3)
    c.addChild(g)

    // Ritad detalj per fordon (variation utan emoji-som-objekt).
    const d = new Graphics()
    const roofTop = -h / 2 - rh + 8
    if (v.key === 'brandbil') {
      d.roundRect(rx + rw * 0.1, roofTop - 16, rw * 0.8, 14, 7).fill(0x8f2c2c)
      d.circle(rx + rw * 0.3, roofTop - 14, 8).fill(0x4aa3df)
      d.circle(rx + rw * 0.6, roofTop - 14, 8).fill(0xffd35c)
      d.roundRect(-w / 2 + 10, 6, w - 20, 12, 6).fill({ color: 0xffffff, alpha: 0.85 })
    } else if (v.key === 'traktor') {
      d.roundRect(rx - 18, roofTop - 34, 16, 46, 7).fill(0x3f3f3f)     // avgasrör
      d.circle(rx - 10, roofTop - 40, 10).fill({ color: 0xbcbcbc, alpha: 0.5 })
    } else if (v.key === 'glassbil') {
      // Ritad glasstrut på taket.
      d.poly([-14, roofTop - 6, 14, roofTop - 6, 0, roofTop + 26]).fill(0xe0a45c)
      d.circle(-7, roofTop - 14, 15).fill(0xfff0b8)
      d.circle(8, roofTop - 12, 14).fill(0xffb3d9)
      d.circle(0, roofTop - 28, 13).fill(0xfff6e0)
      d.circle(0, roofTop - 40, 6).fill(0xe94f4f)
      d.roundRect(-w / 2 + 14, -6, w - 28, 26, 10).fill({ color: 0xffffff, alpha: 0.8 })
    } else if (v.key === 'buss') {
      d.roundRect(rx + 14, roofTop + 4, 74, 20, 8).fill({ color: 0x2f3640, alpha: 0.75 })
      d.roundRect(-w / 2 + 10, 14, w - 20, 10, 5).fill({ color: 0xffffff, alpha: 0.7 })
    } else if (v.key === 'lastbil') {
      const bx = rx + rw + 8
      const bw = w / 2 - 10 - bx
      d.roundRect(bx, -h / 2 - 46, bw, h + 40, 14).fill(0xd8dee9)
      d.roundRect(bx + 9, -h / 2 - 37, bw - 18, h + 22, 10)
        .stroke({ width: 5, color: 0xa9b4c2 })
    } else {
      d.roundRect(rx + 6, roofTop - 10, rw - 12, 10, 5).fill({ color: 0xffffff, alpha: 0.55 })
    }
    c.addChild(d)

    // Glans-svep (används i finishen).
    const shine = new Graphics().roundRect(-w / 2, -h / 2 - h * v.roof, 60, h * (1 + v.roof) + 20, 20)
      .fill({ color: 0xffffff, alpha: 0.55 })
    shine.alpha = 0
    c.addChild(shine)
    c._shine = shine
    c._w = w
    c._h = h

    const spotLayer = new Container()
    c.addChild(spotLayer)
    c._spotLayer = spotLayer

    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Slumpad plats PÅ karossen (lokala koordinater i bilen). Fläckens radie vägs in
  // så att inget hänger utanför plåten.
  _randomSpotPos(v, r = 30) {
    const w = v.w
    const h = v.h
    const rw = w * v.roofW
    const rh = h * v.roof
    const roofCx = -w * 0.08
    const pad = 8
    const rr = (min, max) => min + Math.random() * Math.max(0, max - min)

    const roofY0 = -h / 2 - rh + pad + r + 4
    const roofY1 = -h / 2 - r - 6
    const roofHalf = rw / 2 - r - pad
    if (roofHalf > 12 && roofY1 > roofY0 && Math.random() < 0.3) {
      return { x: roofCx + (Math.random() - 0.5) * roofHalf * 2, y: rr(roofY0, roofY1) }
    }
    const halfX = Math.max(10, w / 2 - r - 14)
    return {
      x: (Math.random() - 0.5) * halfX * 2,
      y: rr(-h / 2 + r + pad, h / 2 - r - pad),
    }
  },

  // Ägaren: Bobo var tredje bil, annars ett RITAT djur (inga emoji-huvuden).
  _makeOwner(n) {
    this._owner.removeChildren().forEach((c) => c.destroy({ children: true }))
    const c = new Container()
    if (n % 3 === 0) {
      c.addChild(new Graphics().roundRect(-32, 34, 64, 74, 24).fill(0x8f6bd8))
      c.addChild(new Graphics().roundRect(-30, 96, 24, 16, 7).fill(0x5f4a94))
      c.addChild(new Graphics().roundRect(6, 96, 24, 16, 7).fill(0x5f4a94))
      c.addChild(makeMascot(52))
    } else {
      c.addChild(this._makeAnimal(OWNERS[n % OWNERS.length]))
    }
    this._owner.addChild(c)
    this._ownerBob?.kill()
    this._ownerBob = gsap.to(this._owner, {
      y: '-=10', duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  },

  _makeAnimal(a) {
    const c = new Container()
    const g = new Graphics()
    g.ellipse(0, 116, 40, 10).fill({ color: 0x000000, alpha: 0.16 })    // skugga
    g.roundRect(-34, 30, 68, 78, 26).fill(a.klader)                     // kropp/kläder
    g.roundRect(-34, 30, 68, 18, 16).fill({ color: 0xffffff, alpha: 0.18 })
    g.roundRect(-32, 98, 26, 16, 7).fill(a.dark)                        // fötter
    g.roundRect(6, 98, 26, 16, 7).fill(a.dark)
    g.roundRect(-48, 40, 18, 48, 9).fill(a.fur)                         // armar
    g.roundRect(30, 40, 18, 48, 9).fill(a.fur)
    // Öron (ritas före huvudet så de hamnar bakom)
    if (a.ear === 'long') {
      g.ellipse(-16, -62, 10, 32).fill(a.fur)
      g.ellipse(16, -62, 10, 32).fill(a.fur)
      g.ellipse(-16, -62, 5, 22).fill(a.nos)
      g.ellipse(16, -62, 5, 22).fill(a.nos)
    } else if (a.ear === 'point') {
      g.poly([-40, -34, -16, -50, -18, -20]).fill(a.fur)
      g.poly([40, -34, 16, -50, 18, -20]).fill(a.fur)
    } else if (a.ear === 'side') {
      g.ellipse(-42, -18, 16, 10).fill(a.fur)
      g.ellipse(42, -18, 16, 10).fill(a.fur)
    }
    if (a.horn) {
      g.circle(-26, -46, 8).fill(0xf1e3c0)
      g.circle(26, -46, 8).fill(0xf1e3c0)
    }
    g.circle(0, -14, 42).fill(a.fur)                                     // huvud
    if (a.ear === 'flop') {
      g.ellipse(-40, -8, 13, 26).fill(a.dark)
      g.ellipse(40, -8, 13, 26).fill(a.dark)
    }
    if (a.flackar) {
      g.ellipse(-24, -32, 13, 9).fill({ color: a.dark, alpha: 0.9 })
      g.ellipse(26, -6, 10, 7).fill({ color: a.dark, alpha: 0.9 })
    }
    g.ellipse(0, 6, 24, 17).fill(a.mule)                                 // nos/mule
    g.ellipse(-7, 3, 4, 5).fill(a.nos)
    g.ellipse(7, 3, 4, 5).fill(a.nos)
    g.circle(-15, -22, 6).fill(0x2b2b2b)                                 // ögon
    g.circle(15, -22, 6).fill(0x2b2b2b)
    g.circle(-13, -24, 2.2).fill(0xffffff)
    g.circle(17, -24, 2.2).fill(0xffffff)
    c.addChild(g)
    // Glatt leende i EGEN Graphics (arc-fällan).
    const mun = new Graphics()
      .arc(0, 12, 13, 0.15 * Math.PI, 0.85 * Math.PI)
      .stroke({ width: 4, color: 0x6b4a3a, cap: 'round' })
    c.addChild(mun)
    return c
  },

  // ---------------------------------------------------------------- fläckar

  _addSpot(ctx, pos, typ, bird = null, r = 30) {
    if (!this._alive || !this._car || this._car.destroyed) return null
    // Skrubbmotstånd: tjocka klickar (mås/gås) tar märkbart längre tid.
    const smutsSteg = typ === 'bajs' ? bird.seg * 2 : (r > 36 ? 3 : 2)
    const color = typ === 'bajs' ? bird.poop : 0x8a6b45

    const view = new Container()
    view.eventMode = 'none'
    const dirtG = new Graphics()
    // Oregelbunden klick: några överlappande cirklar.
    dirtG.circle(0, 0, r).fill({ color, alpha: 0.92 })
    dirtG.circle(r * 0.5, -r * 0.35, r * 0.55).fill({ color, alpha: 0.9 })
    dirtG.circle(-r * 0.45, r * 0.3, r * 0.5).fill({ color, alpha: 0.9 })
    if (typ === 'bajs') {
      dirtG.ellipse(r * 0.15, r * 0.85, r * 0.28, r * 0.42).fill({ color, alpha: 0.85 })
      dirtG.circle(-r * 0.2, -r * 0.2, r * 0.22).fill({ color: 0xffffff, alpha: 0.35 })
    }
    const foamG = new Graphics()          // skum som byggs upp medan man skrubbar
    view.addChild(dirtG, foamG)
    view.position.set(pos.x, pos.y)
    view.scale.set(0.25)

    const spot = {
      view, dirtG, foamG, typ, r, pos, bird,
      glitter: !!bird?.glitter,
      fas: 'smuts',
      smutsSteg, smutsKvar: smutsSteg,
      skumSteg: 0, skumKvar: 0,
      bubblor: [], forbubblor: [],
      arbete: 0, sc: 0.25, scTarget: 1, wet: false,
      phase: Math.random() * 6.28,
      color,
    }
    this._car._spotLayer.addChild(view)
    this._spots.push(spot)
    return spot
  },

  _spotWorld(spot) {
    const car = this._car
    if (!car || car.destroyed) return { x: spot.pos.x + CAR_X, y: spot.pos.y + CAR_Y }
    return { x: car.x + spot.pos.x, y: car.y + spot.pos.y }
  },

  // --- fas 1: skrubba smuts → skum -------------------------------------

  _spongeTick(ctx, dt) {
    const s = this._svamp
    if (!s || s.destroyed) return

    // Bas-mål: fingret vid drag, tap-tap-målet, annars hinken.
    let bx = SPONGE_HOME.x
    let by = SPONGE_HOME.y
    let snabb = 0.18
    if (this._spongeDrag) {
      bx = this._spongePos.x
      by = this._spongePos.y
      snabb = 1
    } else if (this._spTap) {
      bx = this._spTap.x
      by = this._spTap.y
      snabb = 0.32
    }
    if (this._spBaseX === undefined) { this._spBaseX = bx; this._spBaseY = by }
    this._spBaseX += (bx - this._spBaseX) * snabb
    this._spBaseY += (by - this._spBaseY) * snabb

    // Rörelsemängd (bara riktigt drag räknas som skrubbarbete).
    const dxm = this._spBaseX - this._spongePrev.x
    let moved = 0
    if (this._spongeDrag) {
      moved = Math.hypot(dxm, this._spBaseY - this._spongePrev.y)
    }
    this._spongePrev = { x: this._spBaseX, y: this._spBaseY }

    // Vilo-guppning + lutning + tryck-squash (eget liv, ingen bricka).
    const rest = this._spongeDrag ? 0 : Math.sin(this._t * 2.1) * 4
    const sel = this._selected === 'svamp' ? 1 + Math.sin(this._t * 7) * 0.06 : 1
    this._spPress += (1 - this._spPress) * Math.min(1, dt * 9)
    s.position.set(this._spBaseX, this._spBaseY + rest)
    s.rotation = this._spongeDrag ? clamp(dxm * 0.012, -0.22, 0.22)
      : Math.sin(this._t * 1.5) * 0.05
    const sq = this._spongeDrag && moved > 1.5 ? 1.06 : 1
    s.scale.set(this._spPress * sel * sq, (this._spPress * sel) / sq)

    // Tap-tap: ETT skrubbsteg när svampen kommit fram.
    if (this._spTap && !this._spTap.done) {
      const d = Math.hypot(this._spBaseX - this._spTap.x, this._spBaseY - this._spTap.y)
      if (d < 18) {
        this._spTap.done = true
        this._spPress = 1.2
        const target = this._spTap.spot && !this._spTap.spot.view.destroyed
          ? this._spTap.spot
          : this._nearestSpot(this._spTap.x, this._spTap.y, 90)
        if (target && target.fas === 'smuts') this._scrubStep(ctx, target, this._spTap.x, this._spTap.y)
        else if (target && target.fas === 'skum') this._foamPokeHint(ctx, target)
        else ctx.services.audio.sfx('soft')
      }
    }
    if (this._spTap?.done) {
      this._spTap.hold += dt
      if (this._spTap.hold > 0.3) this._spTap = null
    }
    if (!this._spTap && !this._spongeDrag && s.eventMode === 'none'
      && Math.hypot(this._spBaseX - SPONGE_HOME.x, this._spBaseY - SPONGE_HOME.y) < 40) {
      s.eventMode = 'static'
    }

    // Skrubbarbete på fläckar i närheten.
    if (!this._spongeDrag || this._locked) return
    const px = this._spBaseX
    const py = this._spBaseY
    for (const spot of [...this._spots]) {
      if (spot.view.destroyed) continue
      const w = this._spotWorld(spot)
      if (Math.hypot(w.x - px, w.y - py) > SCRUB_R + spot.r) continue
      if (spot.fas === 'skum') { this._foamPokeHint(ctx, spot); continue }
      const bonus = spot.wet ? 1.3 : 1                 // blött smuts lossnar lite lättare
      // Max ett steg per bildruta: ett enda blixtsnabbt svep ska aldrig kunna
      // rensa en fläck — det ska kännas som gnuggande.
      spot.arbete += Math.min(1, ((moved / SCRUB_PX) + dt * SCRUB_HOLD) * bonus)
      while (spot.arbete >= 1 && spot.fas === 'smuts') {
        spot.arbete -= 1
        this._scrubStep(ctx, spot, px, py)
      }
    }
  },

  // Svampen på färdigt skum: bubblorna guppar till, men skum kräver slangen.
  _foamPokeHint(ctx, spot) {
    if (this._foamCue > 0) return
    this._foamCue = 0.9
    ctx.services.audio.sfx('soft')
    const w = this._spotWorld(spot)
    puff(this._fx, w.x, w.y, { count: 4, color: 0xf6fdff })
    if (!this._saidFoamHose && this._started) {
      this._saidFoamHose = true
      ctx.services.voice.say('Ta slangen och spola bort skummet!')
      this._nudgeNozzle()
    }
  },

  _scrubStep(ctx, spot, px, py) {
    if (!this._alive || spot.fas !== 'smuts') return
    spot.smutsKvar -= 1
    this._idle = 0
    const frac = Math.max(0, spot.smutsKvar / spot.smutsSteg)

    // Skummet börjar synas redan medan man skrubbar (framsteget syns direkt).
    for (let i = 0; i < 3; i++) {
      spot.forbubblor.push({
        x: rnd(-spot.r, spot.r) * 0.95,
        y: rnd(-spot.r, spot.r) * 0.8,
        r: rnd(6, Math.max(9, spot.r * 0.34)),
        a: rnd(0.55, 0.85),
      })
    }
    this._drawFoam(spot.foamG, spot.forbubblor, spot.glitter ? 0xffe4f6 : 0xf6fdff)
    spot.scTarget = 0.62 + 0.38 * frac
    if (!spot.dirtG.destroyed) spot.dirtG.alpha = 0.45 + 0.55 * frac

    // Skrubbljud: låg, stigande "gnugg".
    ctx.services.audio.tone({
      freq: 190 + (spot.smutsSteg - spot.smutsKvar) * 26,
      dur: 0.07, type: 'triangle', vol: 0.11, slideTo: 150,
    })
    ctx.services.audio.sfx('soft')
    puff(this._fx, px, py, { count: 4, color: spot.color })

    if (spot.smutsKvar <= 0) this._toFoam(ctx, spot)
  },

  // Fas 1 klar: fläcken är nu ett lödder som ligger kvar på plåten.
  _toFoam(ctx, spot) {
    spot.fas = 'skum'
    spot.arbete = 0
    spot.skumSteg = clamp(2 + Math.round(spot.r / 24), 2, 4)
    spot.skumKvar = spot.skumSteg
    const tint = spot.glitter ? 0xffe4f6 : 0xf6fdff

    // Skum: många överlappande halvgenomskinliga bubblor i olika storlek.
    const n = 12 + Math.round(spot.r / 3.6)
    const bubblor = [...spot.forbubblor]
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = Math.sqrt(Math.random()) * spot.r * 1.15
      bubblor.push({
        x: Math.cos(ang) * rad,
        y: Math.sin(ang) * rad * 0.88,
        r: rnd(7, Math.max(11, spot.r * 0.46)),
        a: rnd(0.5, 0.88),
      })
    }
    bubblor.sort((a, b) => b.r - a.r)
    spot.bubblor = bubblor
    spot.forbubblor = []
    if (!spot.dirtG.destroyed) spot.dirtG.clear()
    this._drawFoam(spot.foamG, bubblor, tint)
    spot.sc = 0.78
    spot.scTarget = 1

    ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: 392, dur: 0.14, type: 'sine', vol: 0.14, slideTo: 523.25 })
    const w = this._spotWorld(spot)
    puff(this._fx, w.x, w.y, { count: 6, color: tint })
    this._zackeCheer()

    if (!this._saidFoam && this._started) {
      this._saidFoam = true
      this._saidFoamHose = true
      ctx.services.voice.say('Titta! Smutsen blev skum. Ta slangen och spola bort det!')
      this._nudgeNozzle()
    }
  },

  // Ritar löddret: fyllda bubblor + ljus kant + liten glansprick = riktigt skum.
  _drawFoam(g, bubblor, tint) {
    if (!g || g.destroyed) return
    g.clear()
    for (const b of bubblor) g.circle(b.x, b.y, b.r).fill({ color: tint, alpha: b.a * 0.8 })
    for (const b of bubblor) {
      g.circle(b.x, b.y, b.r).stroke({ width: 1.6, color: 0xffffff, alpha: 0.5 })
      if (b.r > 10) {
        g.circle(b.x - b.r * 0.33, b.y - b.r * 0.35, b.r * 0.24).fill({ color: 0xffffff, alpha: 0.85 })
      }
    }
  },

  // --- fas 2: spola bort skummet ---------------------------------------

  _rinseStep(ctx, spot) {
    if (!this._alive || spot.fas !== 'skum') return
    spot.skumKvar -= 1
    this._idle = 0
    const w = this._spotWorld(spot)
    const tint = spot.glitter ? 0xffe4f6 : 0xf6fdff

    // Ta bort en klunga bubblor — skummet sköljs synligt bort.
    const kvar = Math.max(0, spot.skumKvar)
    const antal = kvar === 0 ? spot.bubblor.length : Math.ceil(spot.bubblor.length / (kvar + 1))
    for (let i = 0; i < antal && spot.bubblor.length; i++) {
      const idx = (Math.random() * spot.bubblor.length) | 0
      const b = spot.bubblor.splice(idx, 1)[0]
      if (Math.random() < 0.45) puff(this._fx, w.x + b.x, w.y + b.y, { count: 2, color: tint })
    }
    this._drawFoam(spot.foamG, spot.bubblor, tint)
    ctx.services.audio.tone({ freq: rnd(720, 980), dur: 0.06, type: 'sine', vol: 0.07 })

    if (spot.skumKvar > 0) {
      spot.scTarget = 0.72 + 0.28 * (spot.skumKvar / spot.skumSteg)
      return
    }
    this._surfaceClean(ctx, spot)
  },

  // Ytan är REN (båda faserna klara).
  _surfaceClean(ctx, spot) {
    const idx = this._spots.indexOf(spot)
    if (idx >= 0) this._spots.splice(idx, 1)
    const w = this._spotWorld(spot)

    ctx.services.audio.sfx('pop')
    const note = SCALE[Math.min(this._cleanedInCar, SCALE.length - 1)]
    ctx.services.audio.tone({ freq: note, dur: 0.18, type: 'sine', vol: 0.2 })
    this._cleanedInCar++

    puff(this._fx, w.x, w.y, { count: 9, color: 0xd8f2ff })
    ripple(this._fx, w.x, w.y, { color: 0xffffff, maxR: spot.r * 2.2, width: 4, alpha: 0.65 })
    if (spot.glitter) {
      sparkle(this._fx, w.x, w.y, { count: 12 })
      floatText(this._fx, w.x, w.y - 20, '✨', { fontSize: 52 })
    }
    this._zackeCheer()

    spot.scTarget = 0
    this._fading.push({ view: spot.view, sc: spot.sc })
    this._checkClean(ctx)
  },

  // Vatten på oskrubbad smuts: den blir blöt (lossnar lättare) men försvinner inte.
  _wetDirt(ctx, spot) {
    if (!spot.wet) {
      spot.wet = true
      if (!spot.dirtG.destroyed) spot.dirtG.tint = 0xc8c0b4
    }
    if (this._wetCue > 0) return
    this._wetCue = 1.4
    if (!spot.view.destroyed) wiggle(spot.view)
    const w = this._spotWorld(spot)
    ripple(this._fx, w.x, w.y, { color: 0xbfe6fa, maxR: spot.r * 1.8, width: 4, alpha: 0.5 })
    if (!this._saidScrubFirst && this._started) {
      this._saidScrubFirst = true
      ctx.services.voice.say('Skrubba med svampen först, sedan spolar du!')
      wiggle(this._svamp)
    }
  },

  _zackeCheer() {
    const arm = this._zacke?._arm
    if (!arm || arm.destroyed) return
    gsap.killTweensOf(arm)
    gsap.fromTo(arm, { rotation: 0 }, { rotation: -0.9, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })
  },

  // ---------------------------------------------------------------- stråle

  _jetTick(ctx, dt) {
    const jet = this._jet
    if (!jet || jet.destroyed) return
    this._foamCue = Math.max(0, (this._foamCue || 0) - dt)
    this._wetCue = Math.max(0, this._wetCue - dt)

    if (this._hoseAuto) {
      this._hoseAuto.t -= dt
      if (this._hoseAuto.t <= 0) this._hoseAuto = null
    }
    this._nozPress += (1 - this._nozPress) * Math.min(1, dt * 9)

    const on = (this._hoseDrag || !!this._hoseAuto) && !this._locked
    if (!on) {
      jet.clear()
      this._jetSound = 0
      return
    }
    this._idle = 0
    const { tip, dir } = this._nozzleTip()

    // Strålen: mjuka överlappande droppmoln som breddas utåt.
    jet.clear()
    // Yttre dis (bred, svag) …
    for (let i = 0; i < 14; i++) {
      const t = 10 + i * 17
      const jx = tip.x + dir.x * t + rnd(-5, 5)
      const jy = tip.y + dir.y * t + rnd(-5, 5)
      jet.circle(jx, jy, 9 + i * 2.6).fill({ color: 0x8fd6ee, alpha: 0.3 })
    }
    // … och en tät vit kärna som tunnas ut utåt.
    for (let i = 0; i < 14; i++) {
      const t = 8 + i * 17
      const jx = tip.x + dir.x * t + rnd(-3, 3)
      const jy = tip.y + dir.y * t + rnd(-3, 3)
      jet.circle(jx, jy, 7 + i * 1.1).fill({ color: 0xffffff, alpha: 0.5 - i * 0.03 })
    }

    // Droppar + ljud.
    this._dropT -= dt
    if (this._dropT <= 0) {
      this._dropT = 0.05
      this._droplets(tip, dir)
    }
    this._jetSound -= dt
    if (this._jetSound <= 0) {
      this._jetSound = 0.5
      ctx.services.audio.sfx('whoosh')
    }

    // Skölj skum / blöt ner smuts.
    for (const spot of [...this._spots]) {
      if (spot.view.destroyed) continue
      const w = this._spotWorld(spot)
      if (!this._inJet(tip, dir, w.x, w.y, spot.r)) continue
      if (spot.fas === 'skum') {
        spot.arbete += dt * RINSE_RATE
        while (spot.arbete >= 1 && spot.fas === 'skum') {
          spot.arbete -= 1
          this._rinseStep(ctx, spot)
        }
      } else {
        this._wetDirt(ctx, spot)
      }
    }

    // Plask där strålen träffar bilen.
    this._splashT -= dt
    if (this._splashT <= 0 && this._car && !this._car.destroyed) {
      this._splashT = 0.22
      const hx = tip.x + dir.x * JET_LEN * 0.6
      const hy = tip.y + dir.y * JET_LEN * 0.6
      const v = this._vehicle
      const inCar = Math.abs(hx - this._car.x) < v.w / 2 + 20
        && hy > this._car.y - v.h / 2 - v.h * v.roof - 20 && hy < this._car.y + v.h / 2 + 20
      if (inCar) ripple(this._fx, hx, hy, { color: 0xffffff, maxR: 46, width: 3, alpha: 0.4 })
    }

    // Fåglar i strålen flyr utan att hinna bajsa.
    for (const b of [...this._birds]) {
      if (b._gone || b.view.destroyed) continue
      const nz = this._hose.pts[this._hose.pts.length - 1]
      const nara = Math.hypot(b.view.x - nz.x, b.view.y - nz.y) < 130
      if (nara || this._inJet(tip, dir, b.view.x, b.view.y, 46)) this._scareBird(ctx, b, true)
    }
  },

  _droplets(tip, dir) {
    for (let i = 0; i < 3; i++) {
      const d = new Graphics().circle(0, 0, rnd(4, 9)).fill({ color: 0xbfe6fa, alpha: 0.9 })
      d.position.set(tip.x, tip.y)
      d.eventMode = 'none'
      this._fx.addChild(d)
      const spread = rnd(-0.3, 0.3)
      const len = rnd(110, JET_LEN)
      const dx = dir.x * Math.cos(spread) - dir.y * Math.sin(spread)
      const dy = dir.x * Math.sin(spread) + dir.y * Math.cos(spread)
      const st = { x: tip.x, y: tip.y, a: 0.9, s: 1 }
      const tw = gsap.to(st, {
        x: tip.x + dx * len,
        y: tip.y + dy * len + 40,
        a: 0,
        s: 0.4,
        duration: rnd(0.3, 0.5),
        ease: 'power1.out',
        onUpdate: () => {
          if (d.destroyed) { tw.kill(); return }
          d.position.set(st.x, st.y)
          d.alpha = st.a
          d.scale.set(st.s)
        },
        onComplete: () => { if (!d.destroyed) d.destroy() },
      })
    }
  },

  // ---------------------------------------------------------------- fåglar

  _spawnBird(ctx) {
    if (!this._alive || this._locked) return
    const n = this._carsDone || 0
    const maxTyp = Math.min(1 + Math.floor(n * 0.7), BIRDS.length - 1)
    let art = BIRDS[(Math.random() * (maxTyp + 1)) | 0]
    if (n >= 2 && Math.random() < 0.08) art = RAINBOW_BIRD

    const fromLeft = Math.random() < 0.5
    const y = 110 + Math.random() * 90
    const view = this._makeBird(art)
    view.position.set(fromLeft ? -90 : 1370, y)
    view.scale.x = fromLeft ? 1 : -1
    this._birdLayer.addChild(view)

    const bird = { view, art, _gone: false, _pooped: false, fromLeft, baseY: y }
    this._birds.push(bird)
    view._tap = () => this._tapBird(ctx, bird)
    view.on('pointertap', view._tap)

    const targetX = fromLeft ? 1400 : -120
    bird.flight = gsap.to(view, {
      x: targetX,
      duration: 7.5 + Math.random() * 2,
      ease: 'none',
      onComplete: () => this._removeBird(bird),
    })
    bird.bob = gsap.to(view, {
      y: y + 22, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })

    if (art.ljud) ctx.services.audio.sample(art.ljud)
    if (art.glitter && this._started) {
      ctx.services.voice.say('En regnbågsfågel! Den bajsade glitter!')
    } else if (!this._hintedHose && this._started) {
      this._hintedHose = true
      ctx.services.voice.say('Spola på fågeln så flyger den iväg!')
      this._nudgeNozzle()
    }
  },

  _makeBird(art) {
    const c = new Container()
    const s = art.size
    const g = new Graphics()
    g.ellipse(0, 0, 34 * s, 22 * s).fill(art.body)
    g.circle(26 * s, -8 * s, 15 * s).fill(art.body)
    g.poly([38 * s, -8 * s, 56 * s, -3 * s, 38 * s, 2 * s]).fill(0xf5a623)
    g.circle(30 * s, -12 * s, 3.4 * s).fill(0x2b2b2b)
    g.poly([-30 * s, 2 * s, -56 * s, 14 * s, -18 * s, 12 * s]).fill(art.body)
    c.addChild(g)

    const wing = new Graphics().ellipse(0, 0, 24 * s, 12 * s).fill({ color: 0x000000, alpha: 0.18 })
    const wing2 = new Graphics().ellipse(0, 0, 22 * s, 11 * s).fill(art.body)
    const wingC = new Container()
    wingC.addChild(wing, wing2)
    wingC.position.set(-2 * s, -10 * s)
    c.addChild(wingC)
    c._wing = wingC
    gsap.to(wingC.scale, { y: 0.35, duration: 0.26, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    if (art.glitter) {
      // Regnbågsdetalj OVANPÅ den ritade fågeln (tillåten som detalj).
      const rb = new Text({ text: '🌈', style: { fontFamily: FONT.body, fontSize: 34 } })
      rb.anchor.set(0.5)
      rb.position.set(-6 * s, -26 * s)
      c.addChild(rb)
    }

    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = { contains: (px, py) => Math.abs(px) <= 60 && Math.abs(py) <= 52 }
    return c
  },

  _tapBird(ctx, bird) {
    if (!this._alive || bird._gone) return
    this._idle = 0
    ctx.services.audio.sfx('boing')
    if (bird.art.ljud) ctx.services.audio.sample(bird.art.ljud)
    wiggle(bird.view)
    // Trycket GÖR något: fågeln stiger, skyndar på och MISSAR bilen.
    bird._missar = true
    if (bird.flight) bird.flight.timeScale(1.9)
    if (!bird.view.destroyed) {
      bird.bob?.kill()
      gsap.to(bird.view, { y: Math.max(60, bird.baseY - 55), duration: 0.3, ease: 'power2.out' })
    }
    floatText(this._fx, bird.view.x, bird.view.y - 30, '💨', { fontSize: 40 })
  },

  _scareBird(ctx, bird, byHose) {
    if (!this._alive || bird._gone) return
    bird._gone = true
    bird._pooped = true
    ctx.services.audio.sfx('whoosh')
    if (bird.art.ljud) ctx.services.audio.sample(bird.art.ljud)
    floatText(this._fx, bird.view.x, bird.view.y - 30, '💦', { fontSize: 44 })

    bird.flight?.kill()
    bird.bob?.kill()
    const v = bird.view
    gsap.to(v, {
      x: v.x + (bird.fromLeft ? 320 : -320),
      y: -140,
      duration: 0.85,
      ease: 'power2.in',
      onComplete: () => this._removeBird(bird),
    })

    if (byHose && !this._hosedBird) {
      this._hosedBird = true
      ctx.services.voice.say('Bra spolat! Den hann inte bajsa.')
    }
  },

  _birdPoop(ctx, bird) {
    if (!this._alive || bird._pooped || bird._gone) return
    bird._pooped = true

    // TAKET: max 3 bajsfläckar på bilen samtidigt (oavsett fas). Är det fullt missar
    // fågeln — bajset plaskar bredvid på marken. Motgången kan aldrig skena.
    const aktivaBajs = this._spots.filter((s) => s.typ === 'bajs').length
    const traffar = aktivaBajs < MAX_BAJS && !this._locked && !bird._missar

    const startX = bird.view.x
    const startY = bird.view.y + 16
    const art = bird.art

    const drop = new Graphics()
      .circle(0, 0, art.poopR * 0.42)
      .fill({ color: art.poop, alpha: 0.95 })
    drop.position.set(startX, startY)
    drop.eventMode = 'none'
    this._fx.addChild(drop)

    let landX
    let landY
    let pos = null
    if (traffar) {
      pos = this._randomSpotPos(this._vehicle, art.poopR)
      landX = CAR_X + pos.x
      landY = CAR_Y + pos.y
    } else {
      landX = startX < CAR_X ? CAR_X - this._vehicle.w / 2 - 90 : CAR_X + this._vehicle.w / 2 + 90
      landX = clamp(landX, 180, 1080)
      landY = 560
    }

    const proxy = { x: startX, y: startY }
    gsap.to(proxy, {
      x: landX,
      y: landY,
      duration: 0.62,
      ease: 'power2.in',
      onUpdate: () => {
        if (drop.destroyed) return
        drop.position.set(proxy.x, proxy.y)
      },
      onComplete: () => {
        if (!drop.destroyed) drop.destroy()
        if (!this._alive) return
        ctx.services.audio.sample('plopp') || ctx.services.audio.sfx('pop')
        if (traffar && this._car && !this._car.destroyed && !this._locked) {
          this._addSpot(ctx, pos, 'bajs', art, art.poopR)
          shake(this._car, { intensity: 4, duration: 0.3 })
          if (this._started) ctx.services.voice.say('Akta! Fågeln bajsade på bilen!')
        } else {
          puff(this._fx, landX, landY, { count: 8, color: art.poop })
          if (this._started) ctx.services.voice.say('Puh! Den missade bilen!')
        }
      },
    })
  },

  _removeBird(bird) {
    bird.flight?.kill()
    bird.bob?.kill()
    const i = this._birds.indexOf(bird)
    if (i >= 0) this._birds.splice(i, 1)
    const v = bird.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      if (v._wing && !v._wing.destroyed) gsap.killTweensOf(v._wing.scale)
      if (v._tap) v.off('pointertap', v._tap)
      v.destroy({ children: true })
    }
  },

  // ---------------------------------------------------------------- finish

  _checkClean(ctx) {
    if (!this._alive || this._locked) return
    if (this._spots.length > 0) return
    this._locked = true
    this._deselect()
    this._hoseDrag = false
    this._hoseAuto = null
    this._hoseTarget = null
    this._spongeDrag = false
    this._spTap = null

    const v = this._vehicle
    const car = this._car

    // 1. Glans-svep över lacken.
    if (car && !car.destroyed && car._shine) {
      const shine = car._shine
      shine.alpha = 0.75
      gsap.fromTo(shine, { x: -v.w / 2 }, {
        x: v.w / 2, duration: 0.55, ease: 'power1.inOut',
        onComplete: () => { if (!shine.destroyed) shine.alpha = 0 },
      })
    }
    sparkle(this._fx, CAR_X - 90, CAR_Y - 60, { count: 10 })
    sparkle(this._fx, CAR_X + 90, CAR_Y - 40, { count: 10 })
    ctx.services.audio.sfx('reveal')

    // 2. Tuta — riktig tvåtons-signal.
    gsap.delayedCall(0.45, () => {
      if (!this._alive) return
      ctx.services.audio.tone({ freq: 392, dur: 0.22, type: 'square', vol: 0.16 })
      ctx.services.audio.tone({ freq: 523.25, dur: 0.3, type: 'square', vol: 0.16, delay: 0.16 })
      if (car && !car.destroyed) {
        gsap.fromTo(car, { y: CAR_Y }, { y: CAR_Y - 16, duration: 0.14, yoyo: true, repeat: 3, ease: 'power2.out' })
      }
    })

    // 3. Ägaren jublar.
    gsap.delayedCall(0.7, () => {
      if (!this._alive) return
      const o = this._owner
      if (o && !o.destroyed) {
        this._ownerBob?.kill()
        gsap.to(o, { y: this._ownerHomeY - 46, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' })
        floatText(this._fx, o.x, o.y - 90, '🎉', { fontSize: 54 })
      }
      ctx.services.voice.say('Bilen är skinande ren! Bra jobbat!')
    })

    // 4. Bilen rullar ut genom glansbågen. progress.complete() säger ett slumpat
    //    beröm och voice.say avbryter pågående tal — därför ligger den långt efter.
    gsap.delayedCall(2.2, () => {
      if (!this._alive) return
      const o = this._owner
      if (o && !o.destroyed) gsap.to(o, { alpha: 0, duration: 0.3 })
      if (car && !car.destroyed) {
        gsap.to(car, {
          x: 1500, duration: 1.5, ease: 'power2.in',
          onUpdate: () => {
            if (!this._alive || car.destroyed) return
            if (Math.random() < 0.25) sparkle(this._fx, car.x, CAR_Y - 40, { count: 3 })
          },
        })
      }
      this._carsDone = (this._carsDone || 0) + 1
      ctx.progress.setLevel(this._carsDone)
      ctx.progress.setCustom('tvattade', this._carsDone)
      ctx.progress.complete()
    })

    // 5. Nästa bil rullar in.
    gsap.delayedCall(4.2, () => {
      if (!this._alive) return
      if (this._owner && !this._owner.destroyed) {
        this._owner.alpha = 1
        this._owner.y = this._ownerHomeY
      }
      this._nextCar(ctx, true)
    })
  },

  // ---------------------------------------------------------------- loop

  _spotsTick(dt) {
    const k = Math.min(1, dt * 12)
    for (const s of this._spots) {
      if (s.view.destroyed) continue
      s.sc += (s.scTarget - s.sc) * k
      const w = s.fas === 'skum' ? 1 + Math.sin(this._t * 2.6 + s.phase) * 0.035 : 1
      s.view.scale.set(s.sc * w)
    }
    for (const f of [...this._fading]) {
      f.sc -= dt * 4.5
      if (f.view.destroyed || f.sc <= 0.03) {
        if (!f.view.destroyed) f.view.destroy({ children: true })
        const i = this._fading.indexOf(f)
        if (i >= 0) this._fading.splice(i, 1)
      } else f.view.scale.set(f.sc)
    }
  },

  _birdsTick(ctx, dt) {
    for (const b of [...this._birds]) {
      if (b._gone || b._pooped || b.view.destroyed) continue
      if (Math.abs(b.view.x - CAR_X) < 70) this._birdPoop(ctx, b)
    }
    if (!this._locked) {
      this._birdTimer -= dt
      if (this._birdTimer <= 0) {
        this._birdTimer = this._birdInterval
        this._spawnBird(ctx)
      }
    }
  },

  _idleTick(ctx, dt) {
    this._idle += dt
    if (this._idle <= 6 || this._locked || this._spots.length === 0) return
    this._idle = 0
    const skum = this._spots.find((s) => s.fas === 'skum')
    const bajs = this._spots.find((s) => s.typ === 'bajs' && s.fas === 'smuts')
    const s = skum || bajs || this._spots[0]
    if (s && !s.view.destroyed) wiggle(s.view)
    if (skum) {
      // Varannan gång: peka ut HUR slangen används (munstycket är dragbart).
      this._foamIdleCue = (this._foamIdleCue + 1) % 2
      if (this._foamIdleCue === 1) ctx.services.voice.say('Ta slangen och spola bort skummet!')
      else ctx.services.voice.say('Dra i munstycket så sprutar vattnet!')
      this._nudgeNozzle()
    } else if (bajs) {
      ctx.services.voice.say('Skrubba bort bajset med svampen!')
      wiggle(this._svamp)
    } else {
      ctx.services.voice.say('Skrubba smutsen med svampen!')
      wiggle(this._svamp)
    }
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(ticker.deltaMS, 50) / 1000
    this._t += dt

    this._stepHose(dt)
    this._spongeTick(ctx, dt)
    this._jetTick(ctx, dt)
    this._spotsTick(dt)
    this._birdsTick(ctx, dt)
    this._idleTick(ctx, dt)
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)

    // Slangfysiken är ren matematik — släpp den så tickern inte kan röra den igen.
    this._hose = null
    this._hoseDrag = false
    this._hoseAuto = null
    this._hoseTarget = null
    this._spongeDrag = false
    this._spTap = null

    // Verktyg: lossa lyssnare.
    for (const t of [this._svamp, this._nozzle]) {
      if (!t) continue
      this._detach(t)
      if (t._down) t.off('pointerdown', t._down)
      if (!t.destroyed) {
        gsap.killTweensOf(t)
        gsap.killTweensOf(t.scale)
      }
    }
    if (this._catcher && this._catcher._tap) this._catcher.off('pointertap', this._catcher._tap)

    // Fåglar
    for (const b of [...(this._birds || [])]) {
      b.flight?.kill()
      b.bob?.kill()
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        if (b.view._wing && !b.view._wing.destroyed) gsap.killTweensOf(b.view._wing.scale)
        if (b.view._tap) b.view.off('pointertap', b.view._tap)
      }
    }
    // Fläckar (skala lerpas i tickern, men wiggle() tweenar rotation)
    for (const s of [...(this._spots || []), ...(this._fading || [])]) {
      if (s.view && !s.view.destroyed) {
        gsap.killTweensOf(s.view)
        gsap.killTweensOf(s.view.scale)
      }
    }
    this._ownerBob?.kill()
    if (this._owner && !this._owner.destroyed) gsap.killTweensOf(this._owner)
    if (this._car && !this._car.destroyed) {
      gsap.killTweensOf(this._car)
      if (this._car._shine && !this._car._shine.destroyed) gsap.killTweensOf(this._car._shine)
    }
    if (this._zacke?._arm && !this._zacke._arm.destroyed) gsap.killTweensOf(this._zacke._arm)
    // Bågens glimt-tweens (proxy-baserade).
    if (this._arch && !this._arch.destroyed) {
      for (const d of this._arch.children) if (d._twinkleProxy) gsap.killTweensOf(d._twinkleProxy)
    }
    gsap.killTweensOf(this._root)

    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._car = null
    this._fx = null
    this._jet = null
    this._hoseG = null
    this._svamp = null
    this._nozzle = null
    this._catcher = null
    this._spots = []
    this._fading = []
    this._birds = []
    this._selected = null
  },
}
