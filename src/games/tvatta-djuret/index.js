// Tvätta Djuret — motorik / dra (2–4 år). Ett gladlynt men LERIGT djur (Alissas
// ponny / en glad gris / Lovas valp, cyklas per nivå) väntar på bad. Barnet gör det
// rent i TVÅ steg med två verktyg, och båda krävs för 100 %:
//   1) Svampen 🧽: dra (eller tap-tap) över kroppen → lerklumparna under svampen
//      suddas bort och avtäcker ren päls; varje borttagen klump lämnar en skum-fläck.
//   2) Duschen 🚿: dra över kroppen → egna vattendroppar regnar, skummet sköljs bort
//      och den glänsande pälsen träder fram med gnistror.
// Renhets-mätaren fylls av båda: renhet = 0.6·skrubbat + 0.4·sköljt. När all lera är
// borta OCH allt skum sköljt → djuret skakar av sig vatten, glittrar, klistermärke +
// progress.complete(), sedan nästa (lerigare) djur. Oändlig, lugn lek.
//
// NO-FAIL: att dra utanför djuret ger bara en mjuk såpbubbla, aldrig straff. Skrubb
// går ENDAST framåt, mätaren sjunker aldrig, och mjuk auto-hjälp (idle-vink + att de
// sista fläckarna städas själva när framsteg uteblir) garanterar att 100 % alltid nås.
//
// Verktygen följer fingret KONTINUERLIGT via egen pekspårning (pointerdown på verktyget
// + globalpointermove/pointerup på verktyget, som i pruttbad/valpens-bajs) — INTE
// DragController (som bara snäpper till mål). Tap-tap-fallback bakas in för de minsta.
// Vattendroppar är en egen, exit-säker ticker-integrator (ingen GSAP på droppar; allt
// ritas av lib/vatska.js). Lerklumpar/skum suddas via {}-proxy-mönstret; partiklar/firande
// går via lib/feedback.js (redan exit-säkra).
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, puff, sparkle, burst, breathe, floatText, shake, bigCelebration , kvittera} from '../../lib/feedback.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { FluidWorld, FluidView, FLUIDS } from '../../lib/vatska.js'
import { topLightFill } from '../../lib/form.js'
import { drawIcon } from '../../lib/artikoner.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Duschvattnet (lib/vatska.js) -----------------------------------------
const FLUID_MAX = 240        // partikeltak
const TUB_BOTTEN = 596       // karets innerbotten: vattnet lägger sig här
const SPRAY_FART = 9         // px/steg ur munstycket (taket är radius·0,6 = 14,4)
// Täthet. ⚠️ DEN SÄTTER SPELETS SVÅRIGHET, inte bara bilden: sköljningen utlöses per
// partikel som kommer in i silhuetten, så halva takten är halva sköljhastigheten.
// HEAD födde 2–3 droppar per bildruta; 1 gav 506 bildrutor mot HEADs 248 på samma
// skum. 2 per steg lägger dessutom grannarna ~4,5 px isär, alltså långt inom
// interaktionsradien 24 — en sammanhängande stråle.
const SPRAY_PER_STEG = 2
// Hur länge vatten får ligga KVAR på djuret innan det räknas som avrunnet. ⚠️ Utan
// den här gränsen växer en blå platta på ryggen: kupolens topp är nästan plan, så
// tillflödet är större än avrinningen och SPH:ns eget yttryck håller ihop klumpen.
// HEADs droppar togs bort i samma stund de träffade; ett halvt sekunds fönster ger
// samma ändlighet men hinner visa vattnet rinna ner längs sidan.
const VATTEN_MARGINAL = 14
const SPRAY_BREDD = 34       // duschmunstyckets bredd: strålen föds över ett BAND
const KAR_DRAIN = 2          // partiklar per bildruta ur karet (avlopp)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Geometri (designkoordinater).
const CX = 640
const CY = 430
const FACE_X = 470 // ansiktets mitt (== huvud-ellipsen)
const FACE_Y = 330
const FACE_R = 82 // lerfri ruta runt ansiktet så minen ALLTID syns under tvätten
const MUD = 0x8a5a3b // lera (== COLORS.brown)
const DARKMUD = 0x6b4429 // mörkare lera (prickar + dubbel-lager)
// KLADDLERA: blöt, blank och seg. Svampen biter inte på den — den måste sköljas MJUK först,
// sen skrubbas. Det är det som gör *vilket* verktyg till ett val i stället för samma svep två
// gånger. Egen färg + blank dager + en rinnande droppe = läsbart utan ett ord text.
// KALL slate, inte mörkbrun: DARKMUD (0x6b4429) betyder redan "dubbelt lager, skrubba två
// gånger". En mörkbrun kladd hade alltså burit två olika regler i nästan samma färg. Kall
// gråblå + stark blank dager läser "blöt och seg" mot den varma leran.
const CLAY = 0x4f5b64
const CLAY_GLOSS = 0xbcd6de
const STICKY_HINT_MS = 2600 // hur ofta kladd-tipset får upprepas (aldrig tjat)
// GÖMDA FYND: en sak per djur ligger under en lerklump. Ritade föremål ur ikonbiblioteket
// (P0 ASSETS: fristående form, aldrig en emoji i en ruta).
// (Alla fyra är verifierade nycklar i artikoner.js — en nyckel som saknas ritas som en
// tyst grå cirkel, utan konsolfel.)
const FIND_KEYS = ['⭐', '❤️', '💎', '🐚']
const FIND_GLIM_MS = 2400 // hur ofta gömstället glimmar till (tellen som gör det HITTBART)

// Djurtyper per nivå.
const TYPES = [
  { kind: 'pony', color: 0xe9d2a8, dark: 0xcbb085, emoji: '🐴', sample: 'hast', step: 44 },
  { kind: 'pig', color: COLORS.pink, dark: 0xe87fa6, emoji: '🐷', sample: 'gris', step: 38, scale: 1.05 },
  { kind: 'puppy', color: 0xcaa472, dark: 0xa9824f, emoji: '🐶', sample: 'hund', step: 32, doubles: true },
]

export default {
  id: 'tvatta-djuret',
  titleSv: 'Tvätta Djuret',
  icon: '🧽',
  category: 'motorik',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'tvatta-djuret',
  voiceIntro: 'Tvätta djuret rent! Dra svampen över kroppen.',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._held = null
    this._selectedTool = null
    this._sprayOn = false
    this._moved = false
    this._idle = 0
    this._noProgress = 0
    this._foam = []
    this._flakes = []
    this._bubbles = [] // stigande tvålbubblor i karet (ritas i this._tubFx)
    this._waterT = 0 // fas för skvalpande vattenskimmer
    this._face = null // ansikts-emoji (djurets min) — reagerar på beröring
    this._lastScrubPt = null // för "kittlad"-hopp när man gnuggar samma ställe
    this._tweens = []
    this._zones = [] // kladd-zoner, sätts per runda i _genZones
    this._totalMud = 0
    this._scrubbed = 0
    this._rinsed = 0
    this._scrubCount = 0
    this._gaugeFillW = 0
    this._lastScrubSnd = 0
    this._lastRinseSnd = 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn).
    this._root.addChild(createScene('meadow'))

    this._buildTub()

    // Osynlig tap-yta över djuret (tap-tap-fallback). Ligger under de eventMode-'none'
    // visuella lagren men fångar tap eftersom de släpper igenom hit-testet.
    const area = new Container()
    area.hitArea = new Rectangle(300, 180, 680, 430)
    area.eventMode = 'static'
    this._animalTapH = (e) => this._animalTap(ctx, e)
    area.on('pointertap', this._animalTapH)
    this._animalArea = area
    this._root.addChild(area)

    // Lager (bakifrån): rent djur → lera → skum → vattenspray.
    this._clean = new Container()
    this._clean.eventMode = 'none'
    this._mudLayer = new Container()
    this._mudLayer.eventMode = 'none'
    this._foamLayer = new Container()
    this._foamLayer.eventMode = 'none'
    // DUSCHVATTNET (lib/vatska.js). Sprayen var 24 egna droppar på 4 px radie i
    // blekblått — uppmätt 6,8 px till närmaste granne, alltså långt inom en
    // metaboll-radie, men ritade var för sig och därmed i praktiken OSYNLIGA mot
    // lerans brunt. Halva spelets loop syntes inte. Nu är det en sammanhängande
    // stråle som rinner ner över djuret och ner i karet.
    //
    // ⚠️ MEKANIKEN LEVER I SAMMA VATTEN. Sköljningen drivs av partiklar som just
    // KOMMIT IN i silhuetten (`_silh`) — samma ellipser som `_onAnimal` provar mot.
    // Bild och regel är alltså samma sak, inte två system som kan säga emot varandra.
    // Levande bad-kuliss: skvalpande vattenskimmer + stigande tvålbubblor vid vattenlinjen.
    // Ett enda Graphics ovanpå djuret (men under verktygen), ritas om i _update — exit-säkert.
    this._tubFx = new Graphics()
    this._tubFx.eventMode = 'none'
    // Fyndlagret ligger ÖVERST och tomt: precis en sak i taget bor här, det som gömde sig
    // under leran. Eget lager så det aldrig hamnar bakom skum eller spray — och så det går
    // att mäta för sig (dölj allt annat, räkna pixlar).
    this._findLayer = new Container()
    this._findLayer.eventMode = 'none'
    this._root.addChild(this._clean, this._mudLayer, this._foamLayer, this._tubFx, this._findLayer)

    this._fluid = new FluidWorld({
      max: FLUID_MAX,
      radius: 24,
      gravityY: 0.5,
      rho0: FLUIDS.tval.rho0,
      sigma: FLUIDS.tval.sigma,
      beta: FLUIDS.tval.beta,
      // Vattnet ska rinna AV djuret, inte bli liggande som en filt över leran.
      restitution: 0.18,
      wallFriction: 0.08,
      // Karets botten är golvet; sidorna släpper igenom så spill rinner ur bild i
      // stället för att samlas i en pöl bakom kanten.
      walls: { left: false, right: false, bottom: true, top: false },
      bounds: { left: -200, right: 1480, top: -200, bottom: TUB_BOTTEN },
    })
    // Tröskeln är satt för en STRÅLE, inte för ett fyllt kärl (N3-regel 2).
    this._fluidView = new FluidView(this._root, this._fluid, {
      color: FLUIDS.vatten.color,
      edge: 0xeaf9ff,
      alpha: 0.85,
      blobScale: 1.0,
      threshold: 0.38,
      soft: 0.1,
      blur: 6,
      quality: 2,
      resolution: 0.5,
      area: new Rectangle(240, 100, 800, TUB_BOTTEN - 60),
    })
    this._fluidView.layer.eventMode = 'none'
    this._fluidView.layer.interactiveChildren = false
    // Vattnet hör hemma där sprayen låg: över lera och skum, under kar-skimret.
    // Vattnet hör hemma över lera och skum, under kar-skimret.
    this._root.addChildAt(this._fluidView.layer, this._root.getChildIndex(this._tubFx))
    this._sprayAcc = 0
    this._inneFore = new Uint8Array(FLUID_MAX)
    this._karVaggar = [
      this._fluid.addBox(366, 545, 22, 150),   // karets vänstra vägg
      this._fluid.addBox(914, 545, 22, 150),   // ...och högra
    ]

    // Verktyg (svamp/dusch) ovanför djuret.
    this._sponge = { kind: 'sponge', view: this._makeSponge(), home: { x: 165, y: 630 } }
    this._shower = { kind: 'shower', view: this._makeShower(), home: { x: 1115, y: 630 } }
    this._tools = [this._sponge, this._shower]
    for (const tool of this._tools) {
      tool.view.position.set(tool.home.x, tool.home.y)
      tool._downH = (e) => this._toolDown(ctx, tool, e)
      tool.view.on('pointerdown', tool._downH)
      this._root.addChild(tool.view)
    }
    this._moveH = (e) => this._toolMove(ctx, e)
    this._upH = () => this._toolUp(ctx)

    // Renhets-mätare (överst).
    this._buildGauge()

    // Bygg första djuret + lerlager.
    this._buildAnimal(ctx)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._noProgress = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen (en gång) ----------------------------------------------

  _buildTub() {
    const g = new Graphics()
    g.roundRect(360, 470, 560, 150, 60).fill({ color: COLORS.blue, alpha: 0.3 }).stroke({ width: 8, color: COLORS.blue, alpha: 0.5 })
    g.roundRect(372, 482, 536, 26, 16).fill({ color: 0xffffff, alpha: 0.35 }) // ljusare vattenrand
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildGauge() {
    const c = new Container()
    c.eventMode = 'none'
    c.addChild(new Graphics().roundRect(470, 90, 340, 28, 14).fill({ color: 0x000000, alpha: 0.12 }))
    this._gaugeFill = new Graphics()
    c.addChild(this._gaugeFill)
    // RITAD tvål (P0 ASSETS) — var en 🧼-emoji.
    const icon = new Graphics()
    icon.roundRect(-20, -13, 40, 26, 9).fill(0xbfe9ff).stroke({ width: 3, color: 0x8fc9de })
    icon.roundRect(-20, -13, 40, 9, 6).fill({ color: 0xffffff, alpha: 0.6 })
    icon.circle(9, 3, 5).fill({ color: 0xffffff, alpha: 0.7 })
    icon.position.set(444, 104)
    c.addChild(icon)
    this._gauge = c
    this._root.addChild(c)
    this._drawGaugeFill()
  },

  _drawGaugeFill() {
    const g = this._gaugeFill
    if (!g || g.destroyed) return
    g.clear()
    const w = clamp(this._gaugeFillW, 0, 340)
    if (w > 2) g.roundRect(470, 90, w, 28, 14).fill(COLORS.green)
  },

  _makeSponge() {
    const c = new Container()
    c.addChild(new Graphics().ellipse(0, 42, 54, 14).fill({ color: 0x000000, alpha: 0.15 }))
    c.addChild(new Graphics().roundRect(-50, -36, 100, 72, 18).fill(0xe9e36a).stroke({ width: 5, color: 0x7fbf4d }))
    c.addChild(new Graphics().roundRect(-50, 2, 100, 34, 16).fill({ color: 0xa9d96a, alpha: 0.9 }))
    // RITAD svamp (P0 ASSETS) med porer och en skumkant — var en 🧽-emoji.
    const e = new Graphics()
    e.roundRect(-42, -30, 84, 60, 14).fill(0xffd35c)
    e.roundRect(-42, -30, 84, 22, 12).fill(0xffe9a8)
    for (let i = 0; i < 16; i++) {
      e.circle(-34 + Math.random() * 68, -18 + Math.random() * 42, 3 + Math.random() * 4)
        .fill({ color: 0xe0a92c, alpha: 0.6 })
    }
    e.roundRect(-42, 16, 84, 14, 8).fill({ color: 0xff9ec4, alpha: 0.9 })
    e.eventMode = 'none'
    c.addChild(e)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.interactiveChildren = false
    c.hitArea = new Circle(0, 0, 72) // träffyta-diameter 144px ≫ 96px
    return c
  },

  _makeShower() {
    const c = new Container()
    c.addChild(new Graphics().ellipse(0, 48, 46, 12).fill({ color: 0x000000, alpha: 0.15 }))
    c.addChild(new Graphics().roundRect(-8, -42, 16, 40, 6).fill(0xb8c4cc))
    // RITAT duschmunstycke (P0 ASSETS) — var en 🚿-emoji.
    const e = new Graphics()
    e.moveTo(30, -44).quadraticCurveTo(56, -22, 48, 12).stroke({ width: 13, color: 0x6f7880, cap: 'round' })
    e.roundRect(-44, -50, 82, 26, 12).fill(0x4aa3df).stroke({ width: 4, color: 0x2f7cb0 })
    e.moveTo(-44, -26).lineTo(38, -26).lineTo(28, 4).lineTo(-34, 4).closePath()
      .fill(0x57c8c3).stroke({ width: 4, color: 0x2f9c98 })
    e.roundRect(-36, 0, 64, 16, 8).fill(0x2f7cb0)
    for (let i = 0; i < 5; i++) e.circle(-24 + i * 12, 20, 4).fill(0x1f5f8a)
    e.roundRect(-40, -47, 74, 8, 4).fill({ color: 0xffffff, alpha: 0.45 })
    for (let i = 0; i < 5; i++) {
      e.moveTo(-24 + i * 12, 26).lineTo(-26 + i * 12, 44).stroke({ width: 3, color: 0x9fe4f8, alpha: 0.8, cap: 'round' })
    }
    e.eventMode = 'none'
    c.addChild(e)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.interactiveChildren = false
    c.hitArea = new Circle(0, 0, 72)
    c.alpha = 0.45 // inaktiv/halvtransparent tills leran är mestadels borta
    return c
  },

  // ---- Nivå + djur-/lerbygge ---------------------------------------------

  _levelType() {
    const lvl = this._level
    if (lvl <= 1) return TYPES[0]
    if (lvl <= 3) return TYPES[1]
    if (lvl <= 5) return TYPES[2]
    return randomFrom(TYPES)
  },

  _buildAnimal(ctx) {
    if (!this._alive) return
    this._clearRound()

    this._resolving = false
    this._held = null
    this._selectedTool = null
    this._sprayOn = false
    this._scrubbed = 0
    this._rinsed = 0
    this._scrubCount = 0
    this._firstScrub = false
    this._firstRinse = false
    this._firstSoften = false
    this._lastStickyHint = 0
    this._lastStickySnd = 0
    this._showerReady = false
    this._idle = 0
    this._noProgress = 0
    this._foam = []

    const t = this._levelType()
    this._type = t
    const s = t.scale || 1
    this._silh = [
      { cx: 640, cy: 440, rx: 230 * s, ry: 150 * s },
      { cx: 470, cy: 330, rx: 115 * s, ry: 115 * s },
      { cx: 820, cy: 410, rx: 120 * s, ry: 120 * s },
    ]

    this._drawClean(t)
    this._genZones()
    this._genMud(t)
    this._hasSticky = this._flakes.some((f) => f.kind === 'klibb')
    this._hideFind()

    // Duschen åter inaktiv/dim tills ~70 % skrubbat.
    this._showerFade?.kill()
    this._shower._breatheTween?.kill()
    this._shower._breatheTween = null
    gsap.killTweensOf(this._shower.view)
    gsap.killTweensOf(this._shower.view.scale)
    this._shower.view.scale.set(1)
    this._shower.view.alpha = 0.45
    // Finns kladdlera på banan är duschen INTE låst bakom 70 %-regeln — den behövs direkt.
    if (this._hasSticky) this._revealShower(ctx)

    // Svampen andas som "börja här".
    this._sponge._breatheTween?.kill()
    gsap.killTweensOf(this._sponge.view.scale)
    this._sponge.view.scale.set(1)
    this._sponge._breatheTween = breathe(this._sponge.view, { scale: 1.06, duration: 1.0 })

    // Mätaren till 0 (nytt djur — inte en sänkning mitt i en uppgift).
    this._gaugeTween?.kill()
    this._gaugeFillW = 0
    this._drawGaugeFill()
  },

  _drawClean(t) {
    const c = this._clean
    const shadow = new Graphics().ellipse(640, 600, 250, 40).fill({ color: 0x000000, alpha: 0.18 })
    shadow.eventMode = 'none'

    const g = new Graphics()
    // Ben (bakom kroppen).
    for (const lx of [-150, -60, 60, 150]) {
      g.roundRect(640 + lx - 26, 500, 52, 110, 20).fill(t.color).stroke({ width: 6, color: t.dark })
      g.roundRect(640 + lx - 24, 590, 48, 30, 12).fill(t.dark) // hov
    }
    // Öra + svans/man (mörkare ton, bakom kroppen).
    g.ellipse(440, 232, 30, 48).fill(t.dark)
    g.ellipse(910, 360, 40, 74).fill(t.dark)
    // Silhuett-ellipser.
    for (const e of this._silh) g.ellipse(e.cx, e.cy, e.rx, e.ry).fill(t.color)
    // Glansig högdager uppe-vänster på kroppen.
    g.circle(560, 380, 72).fill({ color: 0xffffff, alpha: 0.18 })
    g.eventMode = 'none'

    // RITAT ansikte (P0 ASSETS) — var en 🐴/🐷/🐶-emoji. Djuret ska vara en varelse,
    // inte en form med en klistermärkes-min.
    const face = makeFace(t.kind, t.color, t.dark)
    face.position.set(FACE_X, FACE_Y)
    this._face = face // spara minen så den kan reagera på beröring

    c.addChild(shadow, g, face)
  },

  _bbox() {
    let minX = 1e9
    let minY = 1e9
    let maxX = -1e9
    let maxY = -1e9
    for (const e of this._silh) {
      minX = Math.min(minX, e.cx - e.rx)
      maxX = Math.max(maxX, e.cx + e.rx)
      minY = Math.min(minY, e.cy - e.ry)
      maxY = Math.max(maxY, e.cy + e.ry)
    }
    return { minX, minY, maxX, maxY }
  },

  // ⚠️ DJURET ÄR INTE ETT HINDER FÖR VATTNET — och det är ett MÄTT beslut, inte lättja.
  // Kroppen byggdes först som hinder ur silhuetten (en konvex kupol per ellips) så
  // vattnet skulle skölja ner längs sidorna. Det föll på hur spelet faktiskt spelas:
  // barnet håller duschmunstycket MOT den smutsiga fläcken, alltså inuti kroppen. En
  // partikel som föds inuti ett hinder kastas ut till dess yta i samma steg — vattnet
  // teleporterades upp på ryggen, långt från skummet, och sköljningen dog.
  // Uppmätt: allt skum bort på **248 bildrutor** utan hinder (= HEADs egen siffra) mot
  // **över 1 200** med kroppen som hinder. Bara karets väggar är hinder nu; vattnet
  // faller genom silhuetten precis som HEADs droppar gjorde, syns över djuret, och
  // samlas i karet i stället för att försvinna vid första kontakt.

  // Samma prövning som `_onAnimal`, men med marginal — se VATTEN_MARGINAL.
  _vattenPaDjur(x, y) {
    for (const e of this._silh) {
      const dx = (x - e.cx) / (e.rx + VATTEN_MARGINAL)
      const dy = (y - e.cy) / (e.ry + VATTEN_MARGINAL)
      if (dx * dx + dy * dy <= 1) return true
    }
    return false
  },

  _onAnimal(x, y) {
    for (const e of this._silh) {
      const dx = (x - e.cx) / e.rx
      const dy = (y - e.cy) / e.ry
      if (dx * dx + dy * dy <= 1) return true
    }
    return false
  },

  // 1–3 kladd-zoner på djurets kropp. Antalet växer med nivån och har ett TAK (P0 MOTGÅNG:
  // hindret får sakta ner, aldrig stoppa; bara så mycket kan gå fel samtidigt). Nivå 0 får
  // noll zoner — svampen ska läras in ensam först.
  _genZones() {
    this._zones = []
    if (this._level <= 0) return
    const n = Math.min(3, 1 + Math.floor(this._level / 2))
    for (let i = 0; i < n; i++) {
      const s = this._silh[Math.floor(Math.random() * this._silh.length)]
      const a = Math.random() * Math.PI * 2
      const d = Math.random() * 0.55
      const x = s.cx + Math.cos(a) * s.rx * d
      const y = s.cy + Math.sin(a) * s.ry * d
      // Aldrig över ansiktet — minen ska alltid synas (samma regel som lerrutorna).
      if (Math.hypot(x - FACE_X, y - FACE_Y) < FACE_R + 40) continue
      this._zones.push({ x, y, r: 62 + Math.random() * 34 })
    }
  },

  _genMud(t) {
    const bb = this._bbox()
    const step = t.step
    const flakes = []
    for (let y = bb.minY; y <= bb.maxY; y += step) {
      for (let x = bb.minX; x <= bb.maxX; x += step) {
        const jx = x + (Math.random() * 20 - 10)
        const jy = y + (Math.random() * 20 - 10)
        if (!this._onAnimal(jx, jy)) continue
        // Håll en lerfri ruta runt ansiktet — minen ska alltid synas.
        if (Math.hypot(jx - FACE_X, jy - FACE_Y) < FACE_R) continue
        const need = t.doubles && Math.random() < 0.3 ? 2 : 1
        // Kladden ligger i ZONER, inte som slumpprickar: en fläck är kladdig om den ligger
        // inne i en av rundans kladd-zoner (satta i _genZones). I.i.d.-slump per ruta gav
        // enstaka grå prickar mitt i brunt — det läste "prickigt", inte "ett annat material
        // HÄR", och då är det inget verkligt val var man tar vilket verktyg.
        const sticky = this._zones.some((z) => Math.hypot(jx - z.x, jy - z.y) < z.r)
        const r = 24 + Math.random() * 6
        const view = new Graphics()
        view.eventMode = 'none'
        view.position.set(jx, jy)
        // Slumpen ligger i BUMPARNAS vinkel, inte i `view.rotation`. Samma siluett-
        // variation som forut, men vyn star ratt — och det ar forutsattningen for att
        // klumparna ska kunna bara en gradient: en roterad Graphics roterar aven sin
        // fyllning, sa varje flack hade fatt sin egen slumpmassiga ljusriktning.
        const rot = Math.random() * Math.PI
        const rx = (x, y) => x * Math.cos(rot) - y * Math.sin(rot)
        const ry = (x, y) => x * Math.sin(rot) + y * Math.cos(rot)
        const flake = {
          view,
          x: jx,
          y: jy,
          r,
          need,
          kind: sticky ? 'klibb' : 'torr',
          hits: 0,
          _clean: false,
          _lastHit: 0,
          bumps: [
            { x: rx(-r * 0.5, r * 0.2), y: ry(-r * 0.5, r * 0.2), r: r * 0.6 },
            { x: rx(r * 0.55, -r * 0.15), y: ry(r * 0.55, -r * 0.15), r: r * 0.55 },
          ],
          dots: [
            { x: rx(-r * 0.2, -r * 0.2), y: ry(-r * 0.2, -r * 0.2), r: 4 },
            { x: rx(r * 0.25, r * 0.25), y: ry(r * 0.25, r * 0.25), r: 5 },
            { x: rx(0, r * 0.05), y: ry(0, r * 0.05), r: 3 },
          ],
        }
        this._paintFlake(flake, need === 2 ? DARKMUD : MUD)
        this._mudLayer.addChild(view)
        bounceIn(view, { duration: 0.3, delay: Math.random() * 0.25 })
        flakes.push(flake)
      }
    }
    this._flakes = flakes
    this._totalMud = flakes.length
  },

  _paintFlake(flake, color) {
    const g = flake.view
    if (!g || g.destroyed) return
    g.clear()
    if (flake.kind === 'klibb') {
      // Blank kladd: mörkare bas, ljus dager uppe till vänster och en droppe som rinner.
      g.circle(0, 0, flake.r).fill(CLAY)
      for (const b of flake.bumps) g.circle(b.x, b.y, b.r).fill(CLAY)
      g.ellipse(-flake.r * 0.28, -flake.r * 0.34, flake.r * 0.4, flake.r * 0.24).fill({ color: CLAY_GLOSS, alpha: 0.9 })
      g.circle(flake.r * 0.16, flake.r * 0.72, flake.r * 0.26).fill(CLAY)
      g.circle(flake.r * 0.16, flake.r * 0.96, flake.r * 0.15).fill(CLAY)
      return
    }
    // Leran lag pa 111 592 px i EN ton (`_plattprobe --medbakgrund`) — storsta faltet i
    // hela D1-nivan, och till skillnad fran markplanerna ar det MANGA foremal som delar
    // tonen. En klump ar r=24..30 plus tva bumps, alltsa ~54 px bred: stort nog att bara
    // en toning. Fyllningen cachas per farg, sa alla flackar kostar TVA gradienter
    // (MUD + DARKMUD), inte tva per flack.
    //
    // ⚠️ INTE `sphereFill`, och det ar provat: radiella klot gav varje bump en egen
    // glansdager, och tre klot per flack lasted som en hog CHOKLADKULOR pa djuret i
    // stallet for lera. Talet var utmarkt (111 592 -> 30 048) och bilden sa nagot annat.
    // Lera vill ha LAG inre kontrast och ett ljus uppifran — en klumpig jordkaka, inte
    // ett godis. Darfor `topLightFill` med dampad ramp.
    const lera = topLightFill(color, { highlight: 0.14, dark: 0.2 })
    g.circle(0, 0, flake.r).fill(lera)
    for (const b of flake.bumps) g.circle(b.x, b.y, b.r).fill(lera)
    for (const d of flake.dots) g.circle(d.x, d.y, d.r).fill(DARKMUD)
  },

  // ---- Verktygs-drag (egen pekspårning) ----------------------------------

  _toolDown(ctx, tool, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    this._held = tool
    this._moved = false
    this._downPoint = { x: p.x, y: p.y }
    this._grab = { dx: tool.view.x - p.x, dy: tool.view.y - p.y }
    gsap.killTweensOf(tool.view)
    tool._breatheTween?.kill()
    gsap.killTweensOf(tool.view.scale)
    tool.view.scale.set(1)
    pop(tool.view)
    ctx.services.audio.sfx('tap')
    if (tool.kind === 'shower') {
      this._sprayOn = true
      this._nozzle = { x: tool.view.x, y: tool.view.y + 34 }
    }
    // Lyssnare på verktyget (global → överlever att fingret lämnar svampen).
    tool.view.on('globalpointermove', this._moveH)
    tool.view.on('pointerup', this._upH)
    tool.view.on('pointerupoutside', this._upH)
  },

  _toolMove(ctx, e) {
    if (!this._alive || !this._held) return
    const p = this._root.toLocal(e.global)
    if (!this._moved && Math.hypot(p.x - this._downPoint.x, p.y - this._downPoint.y) > 8) this._moved = true
    const x = clamp(p.x + this._grab.dx, 60, ctx.width - 60)
    const y = clamp(p.y + this._grab.dy, 60, ctx.height - 60)
    this._held.view.position.set(x, y)
    this._idle = 0
    if (this._held.kind === 'sponge') {
      this._scrubAt(ctx, { x, y }, 70)
    } else {
      this._sprayOn = true
      this._nozzle = { x, y: y + 34 }
      this._rinseAt(ctx, { x, y }, 80)
    }
  },

  _toolUp(ctx) {
    const tool = this._held
    if (tool && tool.view && !tool.view.destroyed) {
      tool.view.off('globalpointermove', this._moveH)
      tool.view.off('pointerup', this._upH)
      tool.view.off('pointerupoutside', this._upH)
    }
    this._held = null
    this._sprayOn = false
    if (!tool) return
    if (!this._moved) {
      // Tap → välj verktyget för tap-tap (tap på djuret kör dess verkan).
      this._selectedTool = tool
      pop(tool.view)
    } else {
      this._selectedTool = null
    }
    // Glid mjukt tillbaka till brickan.
    if (tool.view && !tool.view.destroyed) {
      gsap.killTweensOf(tool.view)
      gsap.to(tool.view, { x: tool.home.x, y: tool.home.y, duration: 0.4, ease: 'back.out(1.4)' })
    }
    // Återuppta lugn puls på lediga verktyg.
    if (tool.kind === 'sponge') {
      tool._breatheTween?.kill()
      tool._breatheTween = breathe(tool.view, { scale: 1.06, duration: 1.0 })
    } else if (this._showerReady) {
      tool._breatheTween?.kill()
      tool._breatheTween = breathe(tool.view, { scale: 1.08, duration: 0.9 })
    }
  },

  // ---- Tap-tap på djuret --------------------------------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _animalTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    const p = this._root.toLocal(e.global)
    const sel = this._selectedTool
    if (sel?.kind === 'sponge') {
      this._scrubAt(ctx, p, 110)
    } else if (sel?.kind === 'shower') {
      this._rinseAt(ctx, p, 110)
      this._burstDrops(p)
    } else if (this._onAnimal(p.x, p.y)) {
      puff(ctx.fxLayer, p.x, p.y, { count: 3, color: 0xffffff })
      ctx.services.audio.sfx('soft')
    }
  },

  // ---- Djuret reagerar på beröring ---------------------------------------

  // Gör tvättobjektet till en varelse: minen rys/njuter under svampen ('happy'),
  // blundar vid sköljning ('blink') och gör ett kittlat hopp om man gnuggar samma
  // ställe ('giggle'). Allt via {}-proxy kopierat bara om minen lever + spårat i
  // this._tweens (dödas i _clearRound/destroy) → exit-säkert.
  _reactFace(kind, ctx) {
    const f = this._face
    if (!f || f.destroyed || this._resolving) return
    const now = performance.now()
    if (kind === 'giggle') {
      if (now - (this._lastGiggle || 0) < 1400) return
      this._lastGiggle = now
      floatText(ctx.fxLayer, FACE_X, FACE_Y - 84, randomFrom(['Hihi!', 'Kittlas!', 'Hehe!']), { fontSize: 40 })
      const st = { dy: 0 }
      const tw = gsap.to(st, {
        dy: -16,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
        onUpdate: () => {
          if (f.destroyed) return tw.kill()
          f.y = FACE_Y + st.dy
        },
        onComplete: () => {
          if (!f.destroyed) f.y = FACE_Y
        },
      })
      this._tweens.push(tw)
      return
    }
    if (now - (this._lastFaceReact || 0) < 280) return
    this._lastFaceReact = now
    const blink = kind === 'blink'
    const st = { s: 1 }
    const tw = gsap.to(st, {
      s: blink ? 0.2 : 1.12,
      duration: blink ? 0.1 : 0.13,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (f.destroyed) return tw.kill()
        if (blink) f.scale.set(1, st.s) // ögonblink = lodrät hopklämning
        else f.scale.set(st.s) // njutande liten puls
      },
      onComplete: () => {
        if (!f.destroyed) f.scale.set(1)
      },
    })
    this._tweens.push(tw)
  },

  // ---- Skrubba / skölj ----------------------------------------------------

  _scrubAt(ctx, p, radius) {
    if (this._resolving || !this._alive) return
    const now = performance.now()
    let did = false
    let stuck = null // rörde svampen kladdlera? (då behövs duschen först)
    for (const f of this._flakes) {
      if (f._clean) continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      if (dx * dx + dy * dy > radius * radius) continue
      if (now - f._lastHit < 180) continue
      // Kladdlera går inte att skrubba bort — den KLIBBAR fast och guppar bara. Roligt,
      // aldrig en tillsägelse: ingen summer, inget kryss, mätaren rör sig inte bakåt.
      if (f.kind === 'klibb') {
        stuck = f
        this._wobbleFlake(f)
        continue
      }
      f._lastHit = now
      f.hits += 1
      if (f.hits < f.need) {
        // Dubbel-lager: första passet ljusnar leran (bara mer skrubb, aldrig fel).
        this._paintFlake(f, MUD)
        puff(ctx.fxLayer, f.x, f.y, { count: 3, color: 0xffffff })
        did = true
        continue
      }
      this._removeFlake(ctx, f)
      this._scrubCount += 1
      if (this._scrubCount % 6 === 0) {
        ctx.services.audio.sfx('pop')
        floatText(ctx.fxLayer, f.x, f.y - 16, '🫧', { fontSize: 40 })
      }
      did = true
    }
    if (!did) {
      // Bara kladd under svampen: visa VARFÖR och peka på duschen — en gång i taget.
      if (stuck) {
        this._idle = 0
        this._revealShower(ctx)
        if (now - (this._lastStickySnd || 0) > 320) {
          this._lastStickySnd = now
          // EGEN låg, seg ton — inte samma `soft` som en lyckad skrubb. Örat ska kunna
          // höra skillnad på "det lossnade" och "den sitter fast" utan att titta.
          ctx.services.audio.tone({ freq: 180, dur: 0.13, type: 'sine', vol: 0.3, slideTo: 148 })
        }
        if (now - (this._lastStickyHint || 0) > STICKY_HINT_MS) {
          this._lastStickyHint = now
          ctx.services.voice.say('Den är kladdig! Skölj den med duschen först.')
          this._pulseShower()
        }
      }
      return
    }
    this._idle = 0
    // Minen reagerar: kittlat hopp om man gnuggar samma ställe, annars njutande puls.
    const lp = this._lastScrubPt
    this._lastScrubPt = { x: p.x, y: p.y }
    this._reactFace(lp && Math.hypot(p.x - lp.x, p.y - lp.y) < 46 ? 'giggle' : 'happy', ctx)
    this._updateGauge()
    if (now - this._lastScrubSnd > 140) {
      this._lastScrubSnd = now
      ctx.services.audio.sfx('soft')
    }
    if (!this._firstScrub) {
      this._firstScrub = true
      ctx.services.voice.say('Så ja, gnugga gnugga!')
    }
    this._maybeRevealShower(ctx)
    this._checkDone(ctx)
  },

  // Tona ut + krymp en vy via {a,s}-proxy och förstör den (exit-säker). Delas av
  // lerklump-/skum-borttagning; toScale styr slutskalan. Tween:en spåras i _tweens.
  _fadeOut(view, toScale) {
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    const st = { a: 1, s: 1 }
    const tw = gsap.to(st, {
      a: 0,
      s: toScale,
      duration: 0.25,
      ease: 'power1.out',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.alpha = st.a
        view.scale.set(st.s)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy()
      },
    })
    this._tweens.push(tw)
  },

  _removeFlake(ctx, flake) {
    if (flake._clean) return
    flake._clean = true
    this._scrubbed += 1
    this._noProgress = 0
    this._spawnFoam(flake.x, flake.y)
    this._fadeOut(flake.view, 0.4)
    puff(ctx.fxLayer, flake.x, flake.y, { count: 4, color: 0xffffff })
    if (flake === this._findFlake) this._revealFind(ctx, flake)
  },

  // ---- Gömda fynd under leran --------------------------------------------
  //
  // EN sak per djur ligger gömd under en lerklump. Den ska gå att HITTA, inte bara råka
  // ut för: klumpen glimmar då och då (`_update`), så ett barn som tittar kan gå på just
  // den. Och den får ta tid — ett sällsynt ögonblick som far förbi på 0,3 s är ingen
  // belöning, det är en miss (samma lärdom som guldfrukten i `fanga-frukten`).
  _hideFind() {
    this._findFlake = null
    this._findGlim = 0
    this._findView = null
    // Bara TORR lera: en kladdfläck kräver duschen först, och då hade fyndet legat bakom
    // ett hinder i stället för under en upptäckt.
    const kandidater = this._flakes.filter((f) => f.kind === 'torr' && !f._clean)
    if (kandidater.length < 4) return // för få klumpar → ingen gömma värd namnet
    this._findFlake = randomFrom(kandidater)
    this._findKey = randomFrom(FIND_KEYS)
  },

  _revealFind(ctx, flake) {
    this._findFlake = null
    if (!this._alive || !this._findLayer || this._findLayer.destroyed) return
    // Fyndet får ett SKEN bakom sig. Utan det låg en röd hjärtform mot brun lera — mätbart
    // synlig, men den försvann i bruset i bilden. Tre ringar med avtagande alfa; en radiell
    // FillGradient går inte (den kan inte ha genomskinlig mitt).
    const view = new Container()
    view.eventMode = 'none'
    const sken = new Graphics()
    sken.circle(0, 0, 96).fill({ color: 0xfff6d8, alpha: 0.22 })
    sken.circle(0, 0, 68).fill({ color: 0xfff6d8, alpha: 0.3 })
    sken.circle(0, 0, 44).fill({ color: 0xffffff, alpha: 0.42 })
    sken.eventMode = 'none'
    const ikon = drawIcon(this._findKey || '⭐', 132)
    ikon.eventMode = 'none'
    view.addChild(sken, ikon)
    view.position.set(flake.x, flake.y)
    view.scale.set(0.2)
    view.alpha = 0
    this._findLayer.addChild(view)
    this._findView = view

    // Komiskt "ploink": en snabb uppåtglidande ton + en klar klang ovanpå.
    ctx.services.audio.tone({ freq: 300, dur: 0.16, type: 'sine', vol: 0.26, slideTo: 900 })
    ctx.services.audio.tone({ freq: 1320, dur: 0.2, type: 'triangle', vol: 0.14, delay: 0.12 })
    sparkle(ctx.fxLayer, flake.x, flake.y, { count: 12 })
    this._reactFace('happy', ctx)
    ctx.services.voice.say('Titta! Något låg gömt i leran!')

    // Upp ur leran, vänd sig så man hinner se den, och sedan iväg med en gnista.
    const st = { a: 0, s: 0.2 }
    const tl = gsap.timeline()
    tl.to(view, { y: flake.y - 96, duration: 0.55, ease: 'back.out(1.5)' })
    tl.to(st, {
      a: 1,
      s: 1,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        if (view.destroyed) return
        view.alpha = st.a
        view.scale.set(st.s)
      },
    }, '<')
    tl.to(view, { rotation: 0.5, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 })
    tl.to(view, { y: flake.y - 150, duration: 0.5, ease: 'power1.in' })
    tl.to(st, {
      a: 0,
      s: 0.7,
      duration: 0.5,
      ease: 'power1.in',
      onUpdate: () => {
        if (view.destroyed) return
        view.alpha = st.a
        view.scale.set(st.s)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy()
        if (this._findView === view) this._findView = null
      },
    }, '<')
    this._tweens.push(tl)
  },

  _spawnFoam(x, y) {
    const g = new Graphics()
    g.circle(0, 0, 22).fill({ color: 0xeaf6ff, alpha: 0.9 })
    g.circle(-8, -6, 7).fill({ color: 0xffffff, alpha: 0.95 })
    g.circle(10, 5, 5).fill({ color: 0xffffff, alpha: 0.9 })
    g.position.set(x, y)
    g.eventMode = 'none'
    this._foamLayer.addChild(g)
    bounceIn(g, { duration: 0.25 })
    this._foam.push({ view: g, x, y, _rinsed: false })
  },

  _rinseAt(ctx, p, radius) {
    if (this._resolving || !this._alive) return
    let did = false
    // Duschen MJUKAR UPP kladdlera till vanlig lera — svampen biter sen. Det är hela
    // poängen med två verktyg: ordningen spelar roll på just de här fläckarna.
    let softened = 0
    for (const f of this._flakes) {
      if (f._clean || f.kind !== 'klibb') continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      if (dx * dx + dy * dy > radius * radius) continue
      f.kind = 'torr'
      this._paintFlake(f, f.need > f.hits + 1 ? DARKMUD : MUD)
      sparkle(ctx.fxLayer, f.x, f.y)
      this._wobbleFlake(f)
      softened += 1
      did = true
    }
    if (softened && !this._firstSoften) {
      this._firstSoften = true
      ctx.services.voice.say('Nu blev den mjuk! Ta svampen.')
    }
    for (const f of this._foam) {
      if (f._rinsed) continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      if (dx * dx + dy * dy <= radius * radius) {
        this._rinseFoam(ctx, f)
        did = true
      }
    }
    if (!did) return
    this._idle = 0
    this._reactFace('blink', ctx) // djuret blundar njutande i sköljvattnet
    this._updateGauge()
    const now = performance.now()
    if (now - this._lastRinseSnd > 160) {
      this._lastRinseSnd = now
      ctx.services.audio.sfx(Math.random() < 0.5 ? 'whoosh' : 'pop')
    }
    if (!this._firstRinse) {
      this._firstRinse = true
      ctx.services.voice.say('Skölj rent!')
    }
    this._checkDone(ctx)
  },

  _rinseFoam(ctx, foam) {
    if (foam._rinsed) return
    foam._rinsed = true
    this._rinsed += 1
    this._noProgress = 0
    this._fadeOut(foam.view, 0.3)
    sparkle(ctx.fxLayer, foam.x, foam.y)
    if (Math.random() < 0.25) floatText(ctx.fxLayer, foam.x, foam.y - 20, '🫧', { fontSize: 40 })
  },

  _maybeRevealShower(ctx) {
    if (this._showerReady || this._totalMud === 0) return
    if (this._scrubbed / this._totalMud < 0.7) return
    this._revealShower(ctx, 'Bra! Ta duschen och skölj.')
  },

  // Duschen tänds. Finns kladdlera på banan MÅSTE den vara tillgänglig direkt — annars
  // låser 70 %-regeln bort det enda verktyg som biter på just de fläckarna.
  _revealShower(ctx, line) {
    if (this._showerReady) return
    this._showerReady = true
    this._showerFade?.kill()
    this._showerFade = gsap.to(this._shower.view, { alpha: 1, duration: 0.4 })
    this._shower._breatheTween?.kill()
    this._shower._breatheTween = breathe(this._shower.view, { scale: 1.08, duration: 0.9 })
    if (line) ctx.services.voice.say(line)
  },

  // Liten uppmärksamhetspuls på duschen (utan att döda vilo-andningen).
  _pulseShower() {
    const v = this._shower?.view
    if (!v || v.destroyed) return
    pop(v, { scale: 1.22 })
  },

  // Kladdklumpen guppar segt när svampen tar i — "den sitter fast", inte "du gjorde fel".
  _wobbleFlake(f) {
    const v = f.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v.scale)
    const tw = gsap.to(v.scale, { x: 1.16, y: 0.86, duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    this._tweens.push(tw)
  },

  _renhet() {
    const total = Math.max(1, this._totalMud)
    const scrubFrac = this._scrubbed / total
    const rinseFrac = this._rinsed / total
    return 0.6 * scrubFrac + 0.4 * rinseFrac
  },

  _updateGauge() {
    const target = this._renhet() * 340
    this._gaugeTween?.kill()
    const st = { w: this._gaugeFillW }
    this._gaugeTween = gsap.to(st, {
      w: target,
      duration: 0.3,
      ease: 'power1.out',
      onUpdate: () => {
        this._gaugeFillW = st.w
        this._drawGaugeFill()
      },
    })
  },

  _checkDone(ctx) {
    if (this._resolving) return
    if (this._totalMud > 0 && this._scrubbed >= this._totalMud && this._rinsed >= this._totalMud) {
      this._onComplete(ctx)
    }
  },

  // ---- Duschvattnet ------------------------------------------------------

  _burstDrops(p) {
    const f = this._fluid
    if (!f) return
    // Föd över ett BAND, aldrig i en punkt: en tät punktkälla är ett tryckskott som
    // SPH:ns närtryck spränger isär (N3-regel 5, mätt i `pruttbad`).
    for (let i = 0; i < 8; i++) {
      const k = f.spawn(p.x + (Math.random() - 0.5) * SPRAY_BREDD, p.y - 60, {
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 2,
      })
      this._inneFore[k] = 0
    }
  },

  // Vattnet per bildruta: föd vid munstycket, stega, skölj där det TRÄFFAR djuret,
  // och låt karets avlopp hålla pölen ändlig.
  _vattenTick(ctx, dt) {
    const f = this._fluid
    if (!f) return

    if (this._sprayOn && !this._resolving && this._nozzle) {
      const n = this._nozzle
      this._sprayAcc += dt
      let steg = Math.floor(this._sprayAcc)
      this._sprayAcc -= steg
      steg = Math.min(steg, 3) // en tappad bildruta får inte spruta en klump
      for (let i = 0; i < steg * SPRAY_PER_STEG; i++) {
        // ⚠️ NOLLSTÄLL `_inneFore` PÅ PLATSEN. När taket nås återanvänder FluidWorld
        // den äldsta platsen, och en ny droppe som föds INUTI silhuetten på en plats
        // som redan stod som "inne" hade aldrig utlöst sin sköljning — duschen blev
        // långsammare ju längre barnet höll den. `spawn` returnerar index.
        const k = f.spawn(n.x + (Math.random() - 0.5) * SPRAY_BREDD, n.y, {
          vx: (Math.random() - 0.5) * 1.6,
          vy: SPRAY_FART * (0.9 + Math.random() * 0.2),
        })
        this._inneFore[k] = 0
      }
    }

    f.update(dt * (1000 / 60))

    // SKÖLJNINGEN. Den utlöses av partiklar som just KOMMIT IN i silhuetten — alltså
    // i samma stund vattnet syns träffa djuret. En partikel som redan ligger på ryggen
    // sköljer inte om och om igen; `_inneFore` bär förra bildrutans läge per index.
    // ⚠️ `inne` MÅSTE NOLLSTÄLLAS PER INDEX när en plats återanvänds. Partikeltaket
    // återanvänder den äldsta platsen, och en ny droppe som föds inuti silhuetten på
    // en plats som redan stod som "inne" hade aldrig utlöst sin sköljning.
    const inne = this._inneFore
    for (let i = 0; i < f.count; i++) {
      const pa = this._vattenPaDjur(f.x[i], f.y[i]) ? 1 : 0
      if (pa && !inne[i] && !this._resolving) this._rinseAt(ctx, { x: f.x[i], y: f.y[i] }, 44)
      inne[i] = pa
    }

    // Karets avlopp: utan det växer pölen tills taket nås, och då börjar duschen
    // återanvända sina EGNA partiklar mitt i luften och tunnas ut medan barnet spolar.
    f.drain(640, TUB_BOTTEN - 10, 620, 46, { max: KAR_DRAIN })
    this._fluidView.update()
  },

  _update(ctx, tk) {
    if (!this._alive) return
    const dt = Math.min(2.5, tk.deltaMS / 16.67)

    this._vattenTick(ctx, dt)


    // Levande kar: skvalpande vattenskimmer + stigande tvålbubblor vid vattenlinjen.
    this._waterT += dt
    if (this._bubbles.length < 12 && Math.random() < 0.07 * dt) {
      this._bubbles.push({
        x: 400 + Math.random() * 480,
        y: 560 + Math.random() * 25,
        vy: 0.4 + Math.random() * 0.7,
        r: 4 + Math.random() * 8,
        ph: Math.random() * Math.PI * 2,
      })
    }
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      b.y -= b.vy * dt
      b.ph += 0.07 * dt
      if (b.y < 486) {
        // Poppar mjukt vid vattenytan.
        if (Math.random() < 0.4) puff(ctx.fxLayer, b.x, b.y, { count: 2, color: 0xeaf6ff })
        this._bubbles.splice(i, 1)
      }
    }
    const tg = this._tubFx
    if (tg && !tg.destroyed) {
      tg.clear()
      for (let i = 0; i < 3; i++) {
        const hx = 470 + i * 150 + Math.sin(this._waterT * 0.03 + i) * 22
        const hy = 496 + Math.sin(this._waterT * 0.05 + i * 2) * 3
        tg.ellipse(hx, hy, 72, 9).fill({ color: 0xffffff, alpha: 0.14 })
      }
      for (const b of this._bubbles) {
        const bx = b.x + Math.sin(b.ph) * 8
        const a = clamp((b.y - 476) / 60, 0, 1) // tona in nära ytan
        tg.circle(bx, b.y, b.r).fill({ color: 0xcdeffb, alpha: 0.5 * a })
        tg.circle(bx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4).fill({ color: 0xffffff, alpha: 0.85 * a })
      }
    }

    // Gömstället glimmar till med jämna mellanrum: tellen som gör fyndet HITTBART i stället
    // för en slump. Ligger FÖRE resolving-grenen så den slocknar när djuret är klart.
    if (this._findFlake && !this._findFlake._clean && !this._resolving) {
      this._findGlim += tk.deltaMS
      if (this._findGlim >= FIND_GLIM_MS) {
        this._findGlim = 0
        sparkle(ctx.fxLayer, this._findFlake.x, this._findFlake.y, { count: 3 })
      }
    }

    // Idle-vink + auto-hjälp (garanterar 100 % utan precision).
    if (this._resolving) return
    const ds = tk.deltaMS / 1000
    this._idle += ds
    this._noProgress += ds
    if (this._idle > 6) {
      this._idle = 0
      this._idleCue(ctx)
    }
    if (this._noProgress > 9) {
      this._noProgress = 0
      this._autoHelp(ctx)
    }
  },

  // ---- Idle-vink + auto-hjälp ---------------------------------------------

  _nearestToCenter(list) {
    let best = null
    let bd = 1e9
    for (const it of list) {
      const dx = it.x - CX
      const dy = it.y - CY
      const d = dx * dx + dy * dy
      if (d < bd) {
        bd = d
        best = it
      }
    }
    return best
  },

  _idleCue(ctx) {
    if (this._resolving) return
    const mudLeft = this._flakes.filter((f) => !f._clean)
    // Ledtråden MÅSTE peka på rätt verktyg. Den valde förut närmaste fläck oavsett sort och
    // sa alltid "dra svampen" — på en bana med upp till 40 % kladd kunde spelets egen hjälp
    // alltså säga fel handling i precis det ögonblick barnet pausat och behöver den mest.
    const dryLeft = mudLeft.filter((f) => f.kind !== 'klibb')
    if (dryLeft.length) {
      ctx.services.voice.say(this.voiceIntro)
      const f = this._nearestToCenter(dryLeft)
      if (f?.view && !f.view.destroyed) wiggle(f.view)
      pop(this._sponge.view)
      return
    }
    if (mudLeft.length) {
      // Bara kladd kvar → peka på duschen, inte svampen.
      this._revealShower(ctx)
      ctx.services.voice.say('Den är kladdig! Skölj den med duschen först.')
      const f = this._nearestToCenter(mudLeft)
      if (f?.view && !f.view.destroyed) wiggle(f.view)
      this._pulseShower()
      return
    }
    const foamLeft = this._foam.filter((f) => !f._rinsed)
    if (foamLeft.length) {
      ctx.services.voice.say('Ta duschen och skölj!')
      const f = this._nearestToCenter(foamLeft)
      if (f?.view && !f.view.destroyed) wiggle(f.view)
      pop(this._shower.view)
    }
  },

  _autoHelp(ctx) {
    if (this._resolving || !this._alive) return
    const mudLeft = this._flakes.filter((f) => !f._clean)
    // Hjälpen VISAR ordningen i stället för att hoppa över den: en kladdfläck sköljs mjuk,
    // och en redan torr fläck tas bort — i samma tick. Två skilda fläckar, så sekvensen
    // "skölj → skrubba" syns som två handlingar; och eftersom en fläck faktiskt FÖRSVINNER
    // varje tick ser ett barn som pausar hela tiden att det går framåt.
    const stickyLeft = mudLeft.filter((f) => f.kind === 'klibb')
    let softened = null
    if (stickyLeft.length) {
      softened = this._nearestToCenter(stickyLeft)
      this._revealShower(ctx)
      softened.kind = 'torr'
      this._paintFlake(softened, MUD)
      sparkle(ctx.fxLayer, softened.x, softened.y)
      this._wobbleFlake(softened)
      ctx.services.audio.sfx('soft')
    }
    const removable = softened ? mudLeft.filter((f) => f !== softened) : mudLeft
    if (removable.length) {
      const f = this._nearestToCenter(removable)
      f.hits = f.need
      this._removeFlake(ctx, f)
      this._scrubCount += 1
      ctx.services.audio.sfx('soft')
      sparkle(ctx.fxLayer, f.x, f.y)
      this._updateGauge()
      this._maybeRevealShower(ctx)
      this._checkDone(ctx)
      return
    }
    const foamLeft = this._foam.filter((f) => !f._rinsed)
    if (foamLeft.length) {
      const f = this._nearestToCenter(foamLeft)
      this._rinseFoam(ctx, f)
      ctx.services.audio.sfx('soft')
      this._updateGauge()
      this._checkDone(ctx)
    }
  },

  // ---- Klart → firande → nästa djur --------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._held = null
    this._sprayOn = false
    this._selectedTool = null
    // Vattnet töms när nivån/rundan byter — annars hänger förra rundans pöl kvar.
    this._fluid?.clear()
    this._inneFore?.fill(0)

    // Djuret skakar av sig vatten + en ring vattendroppar.
    shake(this._clean, { intensity: 10, duration: 0.5 })
    burst(ctx.fxLayer, 640, 430, { count: 18, colors: [0x9ed8f5, 0xeaf6ff] })
    sparkle(ctx.fxLayer, 560, 380, { count: 8 })
    sparkle(ctx.fxLayer, 760, 420, { count: 8 })
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    ctx.services.audio.sample('djur_' + this._type.sample) // tyst fallback om klippet saknas
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('badade', (ctx.progress.get().custom?.badade | 0) + 1)

    this._nextCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildAnimal(ctx)
    })
  },

  // ---- Städning -----------------------------------------------------------

  _clearRound() {
    this._tweens?.forEach((t) => t?.kill())
    this._tweens = []
    this._gaugeTween?.kill()
    this._nextCall?.kill()
    if (this._mudLayer) {
      this._mudLayer.removeChildren().forEach((o) => {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
        o.destroy()
      })
    }
    if (this._foamLayer) {
      this._foamLayer.removeChildren().forEach((o) => {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
        o.destroy()
      })
    }
    if (this._findLayer) {
      this._findLayer.removeChildren().forEach((o) => {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
        o.destroy({ children: true })
      })
    }
    this._findFlake = null
    this._findView = null
    if (this._clean) this._clean.removeChildren().forEach((o) => o.destroy({ children: true }))
    if (this._clean && !this._clean.destroyed) {
      gsap.killTweensOf(this._clean)
      this._clean.position.set(0, 0)
    }
    this._flakes = []
    this._foam = []
  },

  destroy(ctx) {
    this._alive = false
    this._held = null
    this._sprayOn = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)

    this._tweens?.forEach((t) => t?.kill())
    this._tweens = []
    this._nextCall?.kill()
    this._gaugeTween?.kill()
    this._showerFade?.kill()

    // Verktygs-lyssnare + tweens.
    for (const tool of this._tools || []) {
      if (tool.view && !tool.view.destroyed) {
        tool.view.off('pointerdown', tool._downH)
        tool.view.off('globalpointermove', this._moveH)
        tool.view.off('pointerup', this._upH)
        tool.view.off('pointerupoutside', this._upH)
        gsap.killTweensOf(tool.view)
        gsap.killTweensOf(tool.view.scale)
      }
      tool._breatheTween?.kill()
    }
    if (this._animalArea && !this._animalArea.destroyed) this._animalArea.off('pointertap', this._animalTapH)

    // Levande klumpar/skum: döda tweens medan de lever.
    this._flakes?.forEach((f) => {
      if (f.view && !f.view.destroyed) {
        gsap.killTweensOf(f.view)
        gsap.killTweensOf(f.view.scale)
      }
    })
    this._foam?.forEach((f) => {
      if (f.view && !f.view.destroyed) {
        gsap.killTweensOf(f.view)
        gsap.killTweensOf(f.view.scale)
      }
    })
    if (this._clean && !this._clean.destroyed) gsap.killTweensOf(this._clean)
    gsap.killTweensOf(this._gaugeFill)

    ctx?.services?.voice?.cancel()
    // Vätskan FÖRE roten: vyn äger ett filter och en renderingstextur som inte rivs
    // av att föräldern förstörs.
    this._fluidView?.destroy()
    this._fluid?.destroy()
    this._fluidView = null
    this._fluid = null
    this._karVaggar = []
    this._root?.destroy({ children: true })
    this._root = null
  },
}

// Ritat ansikte per art (P0 ASSETS). Djuret var tidigare en form med en emoji-min;
// nu har det egna ögon, nos och öron som kan blinka och le.
function makeFace(kind, color, dark) {
  const c = new Container()
  const g = new Graphics()
  const R = 56
  if (kind === 'pig') {
    g.moveTo(-R * 0.86, -R * 0.5).lineTo(-R * 0.5, -R * 1.02).lineTo(-R * 0.22, -R * 0.5).closePath().fill(dark)
    g.moveTo(R * 0.86, -R * 0.5).lineTo(R * 0.5, -R * 1.02).lineTo(R * 0.22, -R * 0.5).closePath().fill(dark)
    g.circle(0, 0, R * 0.88).fill(color)
    g.ellipse(0, R * 0.3, R * 0.42, R * 0.32).fill(dark) // tryne
    g.circle(-R * 0.14, R * 0.3, R * 0.08).fill(0x8a4a55)
    g.circle(R * 0.14, R * 0.3, R * 0.08).fill(0x8a4a55)
  } else if (kind === 'puppy') {
    g.ellipse(-R * 0.86, -R * 0.06, R * 0.3, R * 0.56).fill(dark) // hängöron
    g.ellipse(R * 0.86, -R * 0.06, R * 0.3, R * 0.56).fill(dark)
    g.circle(0, 0, R * 0.88).fill(color)
    g.ellipse(0, R * 0.34, R * 0.4, R * 0.3).fill(0xf0e2cc) // nosparti
    g.ellipse(0, R * 0.2, R * 0.16, R * 0.12).fill(0x33291f)
  } else {
    // ponny
    g.moveTo(-R * 0.72, -R * 0.6).lineTo(-R * 0.46, -R * 1.1).lineTo(-R * 0.2, -R * 0.56).closePath().fill(dark)
    g.moveTo(R * 0.72, -R * 0.6).lineTo(R * 0.46, -R * 1.1).lineTo(R * 0.2, -R * 0.56).closePath().fill(dark)
    g.ellipse(0, -R * 0.1, R * 0.8, R * 0.86).fill(color)
    g.ellipse(0, R * 0.5, R * 0.44, R * 0.34).fill(dark) // mule
    g.circle(-R * 0.16, R * 0.48, R * 0.08).fill(0x5a4326)
    g.circle(R * 0.16, R * 0.48, R * 0.08).fill(0x5a4326)
    g.moveTo(-R * 0.5, -R * 0.9).quadraticCurveTo(R * 0.1, -R * 1.2, R * 0.4, -R * 0.5)
      .stroke({ width: R * 0.22, color: 0x8a5a3b, cap: 'round' }) // man
  }
  // ögon + leende (samma för alla)
  g.circle(-R * 0.3, -R * 0.16, R * 0.15).fill(0xfffdf7)
  g.circle(R * 0.3, -R * 0.16, R * 0.15).fill(0xfffdf7)
  g.circle(-R * 0.28, -R * 0.14, R * 0.09).fill(0x33291f)
  g.circle(R * 0.32, -R * 0.14, R * 0.09).fill(0x33291f)
  g.circle(-R * 0.31, -R * 0.18, R * 0.035).fill(0xffffff)
  g.circle(R * 0.29, -R * 0.18, R * 0.035).fill(0xffffff)
  g.circle(-R * 0.56, R * 0.1, R * 0.13).fill({ color: 0xff9ec4, alpha: 0.6 })
  g.circle(R * 0.56, R * 0.1, R * 0.13).fill({ color: 0xff9ec4, alpha: 0.6 })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
