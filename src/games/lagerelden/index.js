// Lägerelden — Zacke bygger en lägereld i skymningen (2–4 år). Barnet DRAR vedpinnar
// till bålplatsen (mer bränsle → högre, varaktigare låga), PUMPAR/SVEPER en bälg för
// att blåsa luft (lågan flammar upp, blir gulare/vitare och högre) och HÅLLER Zacke's
// marshmallow över glöden (drag) tills den blir GYLLENE. Tre kontroller påverkar
// utfallet: ved (_fuel), luft (_air) och marshmallowens läge — uppfyller ≥2-kravet.
//
// INGEN fara, INGET game-over: mer ved/luft ger bara en STÖRRE, gladare eld och
// SNABBARE gyllene-rostning. Lågan klampas (fyller aldrig skärmen) och dör aldrig
// (_fuel ≥ basnivå). Marshmallowen blir aldrig svart (färgmål = gyllene) och _toast
// sjunker aldrig. Missar är roliga (vingel + mjukt ljud). Mjuk auto-hjälp (idle-vindpust,
// basvärme, och en garanterad värme-boost efter ~25s) gör att succén alltid kommer.
//
// EXIT-SÄKERHET: hela eld-partikel-integratorn är TICKER-driven (egna hastigheter i en
// pool), ALDRIG gsap på en partikel — particlarna lever/dör i _update och hela
// _fireLayer rensas i destroy(). De få gsap-tweens som finns (bälg-squash, marshmallow-
// återgång, glöd-andning, firande) går via lib/feedback.js (exit-säkra) eller dödas i
// destroy(). Tickern tas bort och _root.destroy({children:true}) körs i destroy().
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { puff, sparkle, burst, pop, wiggle, breathe, floatText, bigCelebration , kvittera} from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { Mjukkropp } from '../../lib/mjukkropp.js'

// --- Layout (designkoordinater 1280×720) ---
// Marken är HÖG (210px) så att bålet, veden, bälgen och Zacke står PÅ marken i stället
// för att sväva över horisonten — det var det som fick lägerplatsen att se klippt ut.
const GROUND_H = 210
const GROUND_Y = 720 - GROUND_H // 510
const FIRE_X = 640
const FIRE_BASE_Y = 566
const ZACKE = { x: 1152, y: 446 }
const HAND = { x: 1082, y: 506 } // Zacke's hand där pinnen + maten sitter
const MARSH_REST = { x: 944, y: 486 } // matens viloposition framför Zacke

// --- Eld-tillstånd ---
const BASE_FUEL = 0.6 // _fuel faller aldrig under detta → elden dör aldrig
const BASE_HEAT = 0.6
const AIR_MAX = 3
const PART_CAP = 90 // mjukt partikeltak för prestanda

// --- Vad som rostas (roteras per order) ---------------------------------------
// Samma rost-modell för alla, men varje order känns ny och barnet lär sig att olika
// saker "blir klara" på olika sätt. Allt ritat — aldrig en emoji som helt spelobjekt.
const ROAST_KINDS = ['marshmallow', 'korv', 'majs', 'apple']

const IDLE_MS = 6000 // ms utan handling → vänlig röst-repris + vink
const ROAST_BOOST_MS = 25000 // håller man länge utan mål → garanterad värme-boost

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'lagerelden',
  titleSv: 'Lägerelden',
  icon: '🔥',
  category: 'roligt',
  input: 'mixed',
  ageRange: [2, 4],
  bundle: 'lagerelden',
  voiceIntro: 'Rosta marshmallows gyllene! Håll den över elden tills den blir gyllene.',

  init(ctx) {
    this._alive = true
    this._resolving = false

    // Tillstånd. Bålet startar med två pinnar redan pålagda — en ynklig gnista i en stor
    // stenring läser som "trasigt", inte som "lägg på ved".
    this._fuel = BASE_FUEL + 1.2
    this._air = 0
    this._toast = 0
    this._heat = BASE_HEAT
    this._airLean = 0
    this._boost = 0
    this._idle = 0
    this._roastMs = 0
    this._holding = false

    // Engångs-röstrepliker
    this._saidFuel = false
    this._saidPump = false
    this._saidHalf = false

    // Ljud-strypning
    this._lastWhoosh = 0
    this._lastRoastSfx = 0
    this._lastSparkle = 0
    this._lastMarshDraw = -1

    // Partiklar
    this._parts = [] // { g, x, y, vx, vy, life, maxLife, r0 }
    this._pool = []
    this._pileLogs = []

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    const cfg = this._levelConfig(this._level)
    this._fuelMax = cfg.fuelMax
    this._hotR = cfg.hotR
    this._theme = cfg.theme
    this._order = cfg.order
    this._kind = cfg.kind
    this._filled = 0
    this._windAmp = cfg.windAmp
    this._windFreq = cfg.windFreq
    this._windPhase = Math.random() * Math.PI * 2
    this._time = 0
    this._hotX = FIRE_X // lågans heta zon (svajar i sidled med vinden)

    this._flameTopY = FIRE_BASE_Y - 100

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Bakgrund (varm skymning + HÖG mark) som FÖRSTA barn — bålet ska stå PÅ marken.
    this._bg = createScene(this._theme, { ground: true, groundH: GROUND_H })
    this._root.addChild(this._bg)

    // 1b) Lägerplatsen bakom bålet: tält, granar, buskar (+ eldflugor i natten).
    this._camp = makeCamp(this._theme === 'night')
    this._camp.eventMode = 'none'
    this._camp.interactiveChildren = false
    this._root.addChild(this._camp)
    this._fireflies = []
    this._fireflyLayer = new Container()
    this._fireflyLayer.eventMode = 'none'
    this._fireflyLayer.interactiveChildren = false
    this._root.addChild(this._fireflyLayer)
    this._buildFireflies()

    // 2) Eldstad: mörk markskugga + ring av stenar kring bålet.
    this._hearth = makeHearth(this._hotR > 150 ? 152 : 138)
    this._hearth.eventMode = 'none'
    this._hearth.interactiveChildren = false
    this._root.addChild(this._hearth)

    // 3) Vedstapel-lager (korslagda vedpinnar som växer när man lägger på).
    this._pileLayer = new Container()
    this._pileLayer.position.set(0, 0)
    this._pileLayer.eventMode = 'none'
    this._pileLayer.interactiveChildren = false
    this._root.addChild(this._pileLayer)

    // 3b) Glödbädd som växer i bredd med veden — ligger över vedhögen, under lågan.
    this._embers = new Graphics()
    this._embers.position.set(FIRE_X, FIRE_BASE_Y)
    this._embers.eventMode = 'none'
    this._lastEmber = -1
    this._fuelRatio = 0
    this._root.addChild(this._embers)
    this._seedPile(2)

    // 4) Bål-dropzon (osynlig, stor träffyta för DragController-veden + tap-tap).
    this._dropZone = new Graphics().circle(0, 0, 150).fill({ color: 0xffffff, alpha: 0 })
    this._dropZone.position.set(FIRE_X, FIRE_BASE_Y - 30)
    this._root.addChild(this._dropZone)

    // 5) Eld-lager: glödhalo (andas) + partiklar. Ovanpå veden, under marshmallow/bälg.
    this._fireLayer = new Container()
    this._fireLayer.position.set(FIRE_X, FIRE_BASE_Y)
    this._fireLayer.eventMode = 'none'
    this._fireLayer.interactiveChildren = false
    this._glow = new Graphics().circle(0, 0, 90).fill({ color: COLORS.orange, alpha: 0.18 })
    this._glow.eventMode = 'none'
    this._fireLayer.addChild(this._glow)
    this._root.addChild(this._fireLayer)
    this._glowBreathe = breathe(this._glow, { scale: 1.12, duration: 1.1 })

    // 6) "Het zon"-markör: en TYDLIG glödande "rosta här"-ring över lågans topp som följer
    //    vinden och pulsar — barnet ser vart marshmallowen ska.
    this._hotMark = new Graphics()
      .ellipse(0, 0, 44, 24)
      .fill({ color: 0xffe27a, alpha: 0.22 })
      .ellipse(0, 0, 44, 24)
      .stroke({ width: 5, color: 0xffd35c, alpha: 0.85 })
    this._hotMark.position.set(FIRE_X, 470)
    this._hotMark.eventMode = 'none'
    this._root.addChild(this._hotMark)

    // 7) Vedhög (källa): drag-bara pinnar nere till vänster (direkta _root-barn → root-koord).
    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._dropZone, (d) => d?.kind === 'ved', { hitRadius: 170 })
    this._logs = []
    const homes = [
      { x: 150, y: 630, rot: -0.22 },
      { x: 208, y: 600, rot: 0.14 },
      { x: 262, y: 634, rot: 0.34 },
    ]
    for (const h of homes) {
      const log = makeLog()
      log.position.set(h.x, h.y)
      log.rotation = h.rot
      log.hitArea = new Circle(0, 0, 62) // ≥96px träffyta
      this._root.addChild(log)
      const rec = this._drag.addItem(log, { kind: 'ved' }, {
        onCorrect: () => this._onWoodDropped(ctx, rec),
        onWrong: () => wiggle(log),
      })
      this._logs.push(rec)
    }

    // 8) Bälg (kontroll) nere till höger.
    this._bellows = makeBellows()
    this._bellows.position.set(1064, 612)
    this._bellows.hitArea = new Circle(0, 0, 100)
    this._bellows.eventMode = 'static'
    this._bellows.cursor = 'pointer'
    this._bellowsTop = this._bellows.getChildByLabel('top')
    this._onBellowsDown = (e) => this._bellowsDown(ctx, e)
    this._bellows.on('pointerdown', this._onBellowsDown)
    this._root.addChild(this._bellows)

    // 8b) Vindpust: en böjd luftlinje från pipen in i lågan när man svepar bälgen.
    this._gust = new Graphics()
    this._gust.eventMode = 'none'
    this._gustT = 0
    this._root.addChild(this._gust)

    // 9) Zacke + pinne + mat (till höger, vänd mot elden).
    this._zacke = makeZacke()
    this._zacke.position.set(ZACKE.x, ZACKE.y)
    this._zacke.eventMode = 'none'
    this._zackeEyes = this._zacke.getChildByLabel('eyes')
    this._zackeSmile = this._zacke.getChildByLabel('smile')
    this._lastSmile = -1
    this._root.addChild(this._zacke)

    this._stick = new Graphics()
    this._stick.eventMode = 'none'
    this._root.addChild(this._stick)

    this._marsh = new Container()
    this._marshGfx = new Graphics()
    this._marshGfx.eventMode = 'none'
    this._marsh.addChild(this._marshGfx)
    // Kroppen lever i marshmallowens LOKALA rum (origo = pinnen), så behållarens
    // position sköter världsläget och kroppen aldrig behöver flyttas.
    this._soft = null
    if (this._kind === 'marshmallow') {
      this._soft = new Mjukkropp({ x: 0, y: 0, w: 40, h: 52, punkter: 14, grav: 0.34, damp: 0.9, iter: 6 })
      this._soft.fast(this._soft.mitt, 0, 0) // pinnen håller mitten
    }
    this._drawMarsh(0)
    this._marsh.position.set(MARSH_REST.x, MARSH_REST.y)
    this._marsh.hitArea = new Circle(0, 0, 64) // ≥96px träffyta
    this._marsh.eventMode = 'static'
    this._marsh.cursor = 'pointer'
    this._onMarshDown = () => this._marshDown(ctx)
    this._marsh.on('pointerdown', this._onMarshDown)
    this._root.addChild(this._marsh)

    // 10) Hungrig mottagare: Bobo håller fram fatet och mumsar varje levererad bit
    //     (pattern #2 — en adressat för det man rostar). Armen ritas UNDER fatet.
    this._boboArm = new Graphics()
    this._boboArm.eventMode = 'none'
    this._root.addChild(this._boboArm)
    this._boboBase = { x: 520, y: 118 }
    // Riggen i en YTTRE container: spelet äger `y` (firandets fyra hopp) och `pop`,
    // riggen sin egen `view.scale` (andningen). `kropp: false` — Bobo tittar fram
    // över ett moln och håller fatet med en ritad arm; en björnkropp hade hängt ner
    // GENOM molnet i stället för att ersätta något.
    this._bobo = new Container()
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._kar = makeKaraktar({ r: 54, kropp: false })
    this._bobo.addChild(this._kar.view)
    this._bobo.position.set(this._boboBase.x, this._boboBase.y)
    this._kar.setMood('hungrig') // han VÄNTAR på mat — det är hans roll i spelet
    this._root.addChild(this._bobo)

    // 11) Order-fat uppe i mitten: tomma platser som fylls med färdigrostad mat.
    this._orderLayer = new Container()
    this._orderLayer.eventMode = 'none'
    this._orderLayer.interactiveChildren = false
    this._root.addChild(this._orderLayer)
    this._buildOrder()

    this._lastCrackle = 0

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    if (this._kind === 'marshmallow') ctx.services.voice.say(this.voiceIntro)
    else this._sayKind(ctx)
  },

  // ---- Nivå-konfiguration -------------------------------------------------
  // MÅL: rosta `order` marshmallows GYLLENE (syns som tomma platser på fatet uppe).
  // Slumpad svårighet per nivå: antal i ordern + hur mycket vinden får lågan att
  // svaja i sidled (man håller marshmallowen där lågan ÄR just nu). Allt förlåtande.

  _levelConfig(level) {
    const theme = level <= 1 ? 'sunset' : 'night'
    const fuelMax = level <= 1 ? 4 : 6
    const hotR = level <= 1 ? 150 : level <= 3 ? 160 : 172
    // Order växer med nivån men med slump: 1–2 lågt, upp mot 3–4 senare.
    const base = 1 + Math.floor(level / 2)
    const order = clamp(base + (Math.random() < 0.5 ? 0 : 1), 1, 4)
    // Vind: ingen på nivå 0, sedan slumpad amplitud/fart som ökar lugnt med nivån.
    const windAmp = level === 0 ? 0 : clamp(24 + level * 12 + Math.random() * 30, 0, 120)
    const windFreq = 0.5 + Math.random() * 0.5 // svängningar/sek (lugnt)
    // Vad ordern gäller roteras — nivå 0 är alltid marshmallow (det man känner igen).
    const kind = level === 0 ? 'marshmallow' : ROAST_KINDS[level % ROAST_KINDS.length]
    return { fuelMax, hotR, theme, order, windAmp, windFreq, kind }
  },

  // Talad rubrik för vad ordern gäller. Hela repliker som literaler — annars kan
  // /rost aldrig generera ett klipp för dem.
  _sayKind(ctx) {
    const v = ctx.services.voice
    if (this._kind === 'korv') v.say('Nu grillar vi korv över elden!')
    else if (this._kind === 'majs') v.say('Nu rostar vi majskolvar över elden!')
    else if (this._kind === 'apple') v.say('Nu rostar vi äpplen över elden!')
    else v.say('Nu rostar vi marshmallows över elden!')
  },

  _sayReady(ctx) {
    const v = ctx.services.voice
    if (this._kind === 'korv') v.say('Korven är klar!')
    else if (this._kind === 'majs') v.say('Majskolven är klar!')
    else if (this._kind === 'apple') v.say('Äpplet är klart!')
    else v.say(randomFrom(['Gyllene!', 'Den är klar!', 'Mums, gyllene!']))
  },

  // Eldflugor i natten — små ambient-detaljer som gör att man vill sitta kvar.
  _buildFireflies() {
    if (!this._fireflyLayer || this._fireflyLayer.destroyed) return
    this._fireflyLayer.removeChildren().forEach((c) => c.destroy())
    this._fireflies = []
    if (this._theme !== 'night') return
    for (let i = 0; i < 12; i++) {
      const g = new Graphics()
        .circle(0, 0, 8).fill({ color: 0xffe27a, alpha: 0.18 })
        .circle(0, 0, 3.4).fill(0xfff2a8)
      g.eventMode = 'none'
      this._fireflyLayer.addChild(g)
      this._fireflies.push({
        g,
        x: 60 + Math.random() * 1160,
        y: GROUND_Y - 130 + Math.random() * 200,
        ax: 26 + Math.random() * 44, ay: 12 + Math.random() * 22,
        sx: 0.22 + Math.random() * 0.34, sy: 0.36 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
      })
    }
  },

  // ---- Order-fat (synligt mål) --------------------------------------------

  _buildOrder() {
    if (!this._orderLayer || this._orderLayer.destroyed) return
    this._orderLayer.removeChildren().forEach((c) => c.destroy({ children: true }))
    this._slots = []
    const n = this._order
    const gap = 78
    const totalW = (n - 1) * gap
    const x0 = FIRE_X - totalW / 2
    const y = 96
    // Brickan har en minsta bredd — en order på 1 ska inte krympa till en liten bricka.
    const plateW = Math.max(totalW + 104, 200)
    const plateX = FIRE_X - plateW / 2
    this._plateLeft = plateX
    // Fat: en riktig träbricka med rim och glansstreck (inte en brun pilla).
    const plate = new Graphics()
      .roundRect(plateX, y - 26, plateW, 66, 26).fill(0x5b3820)
      .roundRect(plateX, y - 32, plateW, 60, 26).fill(0x8a5a3b)
      .roundRect(plateX + 10, y - 24, plateW - 20, 16, 10).fill({ color: 0xffffff, alpha: 0.16 })
      .roundRect(plateX + 10, y + 12, plateW - 20, 8, 5).fill({ color: 0x4a2c19, alpha: 0.3 })
    plate.eventMode = 'none'
    this._orderLayer.addChild(plate)
    for (let i = 0; i < n; i++) {
      const slot = new Container()
      slot.position.set(x0 + i * gap, y + 2)
      slot.scale.set(0.7)
      // Tom plats = blek silhuett av EXAKT den mat ordern gäller.
      // Fördjupning i brickan + blek men LÄSBAR silhuett av rätt mat.
      // Fördjupning: mörk rand + ljus botten, så även en vit marshmallow-silhuett syns.
      const well = new Graphics()
        .ellipse(0, 6, 33, 36).fill({ color: 0x3f2513, alpha: 0.5 })
        .ellipse(0, 2, 33, 36).fill({ color: 0xc9a179, alpha: 0.55 })
        .ellipse(0, 2, 26, 29).fill({ color: 0xf0dcc2, alpha: 0.5 })
      const ghost = new Container()
      ghost.label = 'ghost'
      const ghostGfx = new Graphics()
      drawRoast(ghostGfx, this._kind, 0)
      ghost.addChild(ghostGfx)
      ghost.alpha = 0.7
      slot.addChild(well)
      const fill = new Graphics() // ritas färdigrostad när platsen fylls
      fill.label = 'fill'
      fill.visible = false
      slot.addChild(ghost, fill)
      this._orderLayer.addChild(slot)
      this._slots.push(slot)
    }
    this._placeBobo()
  },

  // Bobo står bredvid fatet och HÅLLER FRAM det — mottagaren och målet hör ihop.
  _placeBobo() {
    const b = this._bobo
    if (!b || b.destroyed) return
    const left = this._plateLeft ?? 594
    this._boboBase = { x: Math.max(108, left - 78), y: 122 }
    b.position.set(this._boboBase.x, this._boboBase.y)
    // Ny order = tomt fat = hungrig igen. Utan den här raden hade `stolt` från förra
    // firandet blivit hans permanenta min.
    this._kar?.setMood('hungrig')
    // Armen kommer UNDER huvudet (annars läser den som en pratbubbleflik) och har en
    // mörk kontur + tass, så den syns som en arm som håller upp fatet.
    const arm = this._boboArm
    if (arm && !arm.destroyed) {
      const sx = this._boboBase.x + 18
      const sy = this._boboBase.y + 50
      const px = left + 16
      const py = 132
      arm.clear()
        .moveTo(sx, sy).quadraticCurveTo(sx + 34, sy + 14, px, py)
        .stroke({ width: 20, color: COLORS.orangeDark, cap: 'round' })
        .moveTo(sx, sy).quadraticCurveTo(sx + 34, sy + 14, px, py)
        .stroke({ width: 14, color: COLORS.cream, cap: 'round' })
        .circle(px, py, 14).fill(COLORS.orangeDark)
        .circle(px, py, 11).fill(COLORS.cream)
        .circle(px - 4, py - 4, 2.6).fill({ color: COLORS.pink, alpha: 0.7 })
        .circle(px + 2, py - 5, 2.6).fill({ color: COLORS.pink, alpha: 0.7 })
    }
  },

  _fillSlot(ctx, i) {
    const slot = this._slots?.[i]
    if (!slot || slot.destroyed) return
    const ghost = slot.getChildByLabel('ghost')
    const fill = slot.getChildByLabel('fill')
    if (ghost) ghost.visible = false
    if (fill && !fill.destroyed) {
      drawRoast(fill, this._kind, 1)
      fill.visible = true
      pop(slot, { scale: 1.35 })
    }
    sparkle(ctx.fxLayer, slot.x, slot.y, { count: 6 })
    this._boboChomp(ctx) // Bobo mumsar det som levererats
  },

  // Hungriga Bobo mumsar en levererad marshmallow (mottagaren för det man rostat).
  // Tuggandet är riggens `nam` — munnen öppnas och stängs fyra gånger — i stället för
  // en skal-puls på lådan runt honom. Det är skillnaden mot att bara studsa: en figur
  // som ÄTER är ett svar på det barnet gjorde.
  _boboChomp(ctx) {
    const b = this._bobo
    if (!b || b.destroyed) return
    this._kar?.react('nam')
    floatText(ctx.fxLayer, b.x, b.y - 44, randomFrom(['😋', 'Mums!', '❤️']), { fontSize: 40 })
    if (Math.random() < 0.6) ctx.services.voice.say(randomFrom(['Mums!', 'Så gott!', 'Tack!']))
  },

  // ---- Ved → bål ----------------------------------------------------------

  _onWoodDropped(ctx, rec) {
    this._addFuel(ctx)
    this._recycleLog(rec)
  },

  _addFuel(ctx) {
    if (!this._alive) return
    this._idle = 0
    this._fuel = Math.min(this._fuelMax, this._fuel + 1)

    // En korslagd RITAD vedpinne läggs synligt på högen.
    const log = drawLogInto(new Graphics(), 72 + Math.random() * 18, 15)
    log.position.set(FIRE_X + (Math.random() * 64 - 32), FIRE_BASE_Y + 6 + (Math.random() * 10 - 5))
    log.rotation = Math.random() * 0.9 - 0.45
    log.eventMode = 'none'
    this._pileLayer.addChild(log)
    this._pileLogs.push(log)

    // Lågan hoppar till av nytt bränsle.
    this._air = Math.min(AIR_MAX, this._air + 0.25)
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, FIRE_X, 560, { count: 8, color: COLORS.orange })
    for (let i = 0; i < 6; i++) this._spawnParticle()
    if (!this._saidFuel) {
      this._saidFuel = true
      ctx.services.voice.say('Mer ved gör elden stor!')
    }
  },

  // Startved i bålet så elden ser byggd ut från första bilden.
  _seedPile(n) {
    if (!this._pileLayer || this._pileLayer.destroyed) return
    for (let i = 0; i < n; i++) {
      const log = drawLogInto(new Graphics(), 76 + Math.random() * 16, 15)
      log.position.set(FIRE_X + (Math.random() * 56 - 28), FIRE_BASE_Y + 8 + (Math.random() * 8 - 4))
      log.rotation = Math.random() * 0.8 - 0.4
      log.eventMode = 'none'
      this._pileLayer.addChild(log)
      this._pileLogs.push(log)
    }
  },

  // Veden glider mjukt tillbaka till vedhögen → tar aldrig slut.
  _recycleLog(rec) {
    if (!this._alive || rec.view.destroyed) return
    rec.placed = false
    rec.view.eventMode = 'static'
    rec.view.alpha = 1
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.32, ease: 'back.out(1.4)' })
  },

  // ---- Bälg: tryck (liten pust) + svep (stor pust) ------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e, mal) {
    const p = mal && !mal.destroyed ? ctx.fxLayer.toLocal(mal.getGlobalPosition())
      : e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _bellowsDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._bellowsStart = { x: e.global.x, y: e.global.y }
    this._bellowsMax = 0
    this._onBellowsMove = (ev) => {
      const d = Math.hypot(ev.global.x - this._bellowsStart.x, ev.global.y - this._bellowsStart.y)
      if (d > this._bellowsMax) this._bellowsMax = d
    }
    this._onBellowsUp = () => this._bellowsUp(ctx)
    this._bellows.on('globalpointermove', this._onBellowsMove)
    this._bellows.on('pointerup', this._onBellowsUp)
    this._bellows.on('pointerupoutside', this._onBellowsUp)
  },

  _bellowsUp(ctx) {
    this._detachBellows()
    const strength = clamp(this._bellowsMax / 120, 0.4, 1.6)
    this._pump(ctx, strength)
  },

  _detachBellows() {
    if (this._onBellowsMove) this._bellows.off('globalpointermove', this._onBellowsMove)
    if (this._onBellowsUp) {
      this._bellows.off('pointerup', this._onBellowsUp)
      this._bellows.off('pointerupoutside', this._onBellowsUp)
    }
    this._onBellowsMove = this._onBellowsUp = null
  },

  _pump(ctx, strength) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._air = Math.min(AIR_MAX, this._air + 0.5 * strength)
    this._airLean = (Math.random() * 2 - 1) * 0.5
    this._gustT = 1 // pusten får en synlig riktning (ritas i _update)

    // Bälg-handtaget trycks ihop och studsar tillbaka.
    if (this._bellowsTop && !this._bellowsTop.destroyed) {
      gsap.killTweensOf(this._bellowsTop.scale)
      gsap.timeline()
        .to(this._bellowsTop.scale, { y: 0.55, duration: 0.07, ease: 'power2.in' })
        .to(this._bellowsTop.scale, { y: 1, duration: 0.2, ease: 'back.out(2.2)' })
    }

    // Direkt visuell respons (<100ms): ett svall av extra eldpartiklar uppåt.
    const extra = 6 + ((strength * 6) | 0)
    for (let i = 0; i < extra; i++) this._spawnParticle(true)

    const now = performance.now()
    if (now - this._lastWhoosh > 120) {
      this._lastWhoosh = now
      ctx.services.audio.sfx('whoosh')
    }
    if (!this._saidPump) {
      this._saidPump = true
      ctx.services.voice.say('Blås på elden — titta så den växer!')
    }
  },

  // ---- Marshmallow: eget pekar-grepp (fri placering över elden) -----------

  _marshDown(ctx) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx)
    this._idle = 0
    this._holding = true
    this._marshMoved = false
    gsap.killTweensOf(this._marsh)
    gsap.killTweensOf(this._marsh.scale)
    gsap.to(this._marsh.scale, { x: 1.1, y: 1.1, duration: 0.12 })
    ctx.services.audio.sfx('tap')
    this._onMarshMove = (ev) => {
      if (!this._holding) return
      const p = this._root.toLocal(ev.global)
      if (Math.hypot(p.x - this._marsh.x, p.y - this._marsh.y) > 10) this._marshMoved = true
      this._marsh.x = clamp(p.x, 120, 1180)
      this._marsh.y = clamp(p.y, 120, 660)
    }
    this._onMarshUp = () => this._marshUp(ctx)
    this._marsh.on('globalpointermove', this._onMarshMove)
    this._marsh.on('pointerup', this._onMarshUp)
    this._marsh.on('pointerupoutside', this._onMarshUp)
  },

  _marshUp() {
    if (!this._alive) return
    this._holding = false
    this._detachMarsh()
    gsap.to(this._marsh.scale, { x: 1, y: 1, duration: 0.15 })
    const hotY = this._flameTopY + 20
    const d = Math.hypot(this._marsh.x - this._hotX, this._marsh.y - hotY)

    // TAP-FALLBACK (P0 GESTER): ett barn som bara TRYCKER på maten ska också komma vidare.
    // Ett tryck utan rörelse skickar maten till elden — och nästa tryck hämtar hem den.
    if (!this._marshMoved) {
      const away = d >= this._hotR
      gsap.to(this._marsh, {
        x: away ? this._hotX + 40 : MARSH_REST.x,
        y: away ? this._flameTopY + 14 : MARSH_REST.y,
        duration: 0.36, ease: 'power2.out',
      })
      return
    }

    if (d < this._hotR) {
      // Släppt nära den heta zonen → hänger kvar och fortsätter rostas (auto-hjälp).
      gsap.to(this._marsh, { x: this._hotX + 50, y: this._flameTopY + 10, duration: 0.3, ease: 'power2.out' })
    } else {
      // Annars glider den mjukt tillbaka till vilopositionen (men _toast behålls).
      gsap.to(this._marsh, { x: MARSH_REST.x, y: MARSH_REST.y, duration: 0.5, ease: 'power2.inOut' })
    }
  },

  _detachMarsh() {
    if (this._onMarshMove) this._marsh.off('globalpointermove', this._onMarshMove)
    if (this._onMarshUp) {
      this._marsh.off('pointerup', this._onMarshUp)
      this._marsh.off('pointerupoutside', this._onMarshUp)
    }
    this._onMarshMove = this._onMarshUp = null
  },

  // Marshmallowen är en MJUK KROPP (lib/mjukkropp.js, LYFTPLAN rad 11), inte en
  // roundRect som byter färg. Att sockret sjunker ihop när det blir varmt ÄR den
  // här nivåns mekanik — barnet ska SE att den mjuknar, inte bara att den gulnar.
  // Pinnen går rakt igenom, alltså är mittpunkten fast; värmen sätter mjukheten.
  // Korv, majs och äpple är fasta saker och ritas som förut.
  _drawMarsh(toast) {
    if (this._soft) {
      this._lastMarshDraw = toast
      drawMarshSoft(this._marshGfx, this._soft, toast)
      return
    }
    if (Math.abs(toast - this._lastMarshDraw) < 0.015 && this._lastMarshDraw >= 0) return
    this._lastMarshDraw = toast
    drawRoast(this._marshGfx, this._kind, toast)
  },

  // Glödbädden under lågan: bredare och ljusare ju mer ved som ligger på.
  _drawEmbers(fuelRatio, hot) {
    const g = this._embers
    if (!g || g.destroyed) return
    const bucket = Math.round(fuelRatio * 8) * 8 + Math.round(hot * 5)
    if (bucket === this._lastEmber) return
    this._lastEmber = bucket
    const w = 56 + fuelRatio * 70
    g.clear()
    g.ellipse(0, -2, w, 13).fill({ color: COLORS.orange, alpha: 0.4 + hot * 0.28 })
    g.ellipse(0, -5, w * 0.64, 9).fill({ color: COLORS.yellow, alpha: 0.45 + hot * 0.3 })
    g.ellipse(0, -8, w * 0.32, 5).fill({ color: 0xfff3b0, alpha: 0.5 + hot * 0.28 })
  },

  // Zacke reagerar: blicken följer maten, leendet växer mot klart.
  _zackeReact(toast) {
    const eyes = this._zackeEyes
    if (eyes && !eyes.destroyed) {
      const dx = clamp((this._marsh.x - ZACKE.x) / 240, -1, 0.5)
      const dy = clamp((this._marsh.y - ZACKE.y) / 240, -0.9, 0.9)
      eyes.clear()
        .ellipse(-16, -2, 7.5, 8.5).fill(0xfffdf7)
        .ellipse(7, -2, 7.5, 8.5).fill(0xfffdf7)
        .circle(-16 + dx * 4, -2 + dy * 3, 4.4).fill(COLORS.ink)
        .circle(7 + dx * 4, -2 + dy * 3, 4.4).fill(COLORS.ink)
    }
    const bucket = Math.round(toast * 4)
    if (bucket === this._lastSmile) return
    this._lastSmile = bucket
    const s = this._zackeSmile
    if (s && !s.destroyed) {
      s.clear()
        .arc(-5, 9, 11 + toast * 9, 0.12 * Math.PI, 0.88 * Math.PI)
        .stroke({ width: 4, color: COLORS.ink, cap: 'round' })
    }
  },

  // ---- Eld-partiklar (ticker-driven pool, ALDRIG gsap) --------------------

  _spawnParticle(fromPump = false) {
    if (this._parts.length >= PART_CAP) return
    let g = this._pool.pop()
    if (!g) {
      g = new Graphics()
      g.eventMode = 'none'
      this._fireLayer.addChild(g)
    }
    g.visible = true
    const heat = this._heat
    // Feta, överlappande partiklar → en LÅGA. Små glesa prickar läste som konfetti.
    const r0 = 8 + Math.random() * 9
    // Lågan blir BREDARE av ved, inte bara tätare — "stockeld" syns.
    const spread = 17 + (this._fuelRatio || 0) * 32
    const x = (Math.random() * 2 - 1) * (spread + Math.random() * 22)
    const vy = -(1.6 + heat * 1.4 + Math.random() * 0.8) * (fromPump ? 1.25 : 1)
    const vx = (Math.random() * 2 - 1) * 0.5
    this._parts.push({ g, x, y: 0, vx, vy, life: 0, maxLife: 26 + Math.random() * 20, r0 })
  },

  // Vit-gul kärna → gul → orange. INGEN grå röksvans: den gjorde lågan till
  // utspridda röda bär. Döden bärs av alfan i stället.
  _flameColor(t, heat) {
    const hot = clamp((heat - BASE_HEAT) / 2.2, 0, 1)
    const start = lerpColor(0xfff3b0, 0xffffff, hot * 0.55)
    if (t < 0.35) return lerpColor(start, COLORS.yellow, t / 0.35)
    if (t < 0.7) return lerpColor(COLORS.yellow, COLORS.orange, (t - 0.35) / 0.35)
    return lerpColor(COLORS.orange, 0xef5a26, (t - 0.7) / 0.3)
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = clamp(ticker.deltaMS / 16.67, 0, 3)

    // Den hungrige följer maten med blicken — över elden, hela vägen upp till fatet.
    // Det gör väntan till något man SER, inte bara ett tomt fat att fylla.
    if (this._kar && this._bobo && !this._bobo.destroyed && this._marsh && !this._marsh.destroyed) {
      const p = this._bobo.toLocal(this._marsh.getGlobalPosition())
      this._kar.look(p.x, p.y)
    }

    // Decay: luft pyser ut, ved sjunker långsamt (aldrig under basnivå).
    this._air *= Math.pow(0.96, dt)
    this._fuel = Math.max(BASE_FUEL, this._fuel - 0.0008 * dt)
    this._airLean *= Math.pow(0.92, dt)

    // Härledd värme + mjukt lerpad lågtopp. VEDEN väger nu tyngst vid full stock
    // (0.30 per pinne mot luftens 0.45 som pyser ut på ett par sekunder) → "lägg på ved"
    // är ett kännbart val, inte kosmetik. Fortfarande no-fail: elden dör aldrig.
    const fuelRatio = clamp((this._fuel - BASE_FUEL) / Math.max(0.001, this._fuelMax - BASE_FUEL), 0, 1)
    this._fuelRatio = fuelRatio
    const heat = BASE_HEAT + this._fuel * 0.3 + this._air * 0.45 + this._boost
    this._heat = heat
    const flameH = Math.min(64 + heat * 66, 300)
    const target = FIRE_BASE_Y - flameH
    this._flameTopY += (target - this._flameTopY) * Math.min(1, 0.1 * dt)

    // Vind: lågans heta zon svajar mjukt i sidled (man håller marshmallowen DÄR lågan är).
    this._time += ticker.deltaMS / 1000
    const windX = this._windAmp * Math.sin(this._time * this._windFreq * Math.PI * 2 + this._windPhase)
    this._hotX += (FIRE_X + windX - this._hotX) * Math.min(1, 0.15 * dt)
    if (this._fireLayer && !this._fireLayer.destroyed) this._fireLayer.x = this._hotX
    // Lågan lutar i vindens riktning (utöver pust-flickret).
    if (this._windAmp > 0) {
      const lean = Math.cos(this._time * this._windFreq * Math.PI * 2 + this._windPhase) * (this._windAmp / 120) * 0.5
      this._airLean += (lean - this._airLean) * Math.min(1, 0.1 * dt)
    }

    // Glöd + het-zon-markör lyser med värmen och följer den heta zonen.
    const hot = clamp((heat - BASE_HEAT) / 2.2, 0, 1)
    if (this._glow && !this._glow.destroyed) this._glow.alpha = 0.16 + hot * 0.12
    this._drawEmbers(fuelRatio, hot)
    // Ringen sitter på EXAKT den punkt rostningen mäts ifrån (flameTopY + 20) och växer
    // med lågan — det man ser är det som gäller.
    if (this._hotMark && !this._hotMark.destroyed) {
      this._hotMark.x = this._hotX
      this._hotMark.y = this._flameTopY + 20
      this._hotMark.alpha = 0.5 + hot * 0.35
      this._hotMark.scale.set((1 + fuelRatio * 0.28) * (1 + Math.sin(this._time * 4) * 0.06))
    }

    // Eldflugor (bara i natt-temat) — mjuk ambient som gör lägerplatsen levande.
    for (const f of this._fireflies || []) {
      if (f.g.destroyed) continue
      f.g.x = f.x + Math.sin(this._time * f.sx + f.ph) * f.ax
      f.g.y = f.y + Math.cos(this._time * f.sy + f.ph * 1.7) * f.ay
      f.g.alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this._time * 2.2 + f.ph))
    }

    // Vindpust: en kort böjd luftlinje från bälgens pip in i lågan.
    if (this._gust && !this._gust.destroyed) {
      this._gust.clear()
      if (this._gustT > 0) {
        this._gustT = Math.max(0, this._gustT - dt / 28)
        const a = this._gustT
        const sx = this._bellows.x - 144
        const sy = this._bellows.y - 4
        const ex = this._hotX + 74
        const ey = FIRE_BASE_Y - 40
        for (let i = 0; i < 3; i++) {
          const off = (i - 1) * 15
          this._gust
            .moveTo(sx, sy + off * 0.45)
            .quadraticCurveTo((sx + ex) / 2, sy - 74 + off, ex, ey + off)
            .stroke({ width: 5 - i * 0.9, color: 0xffffff, alpha: 0.45 * a, cap: 'round' })
        }
      }
    }

    // Sprakande eld (subtil ambient): små knaster-blipp vars täthet skalar med värmen.
    const nowC = performance.now()
    if (hot > 0.12 && nowC - this._lastCrackle > 300 - hot * 130) {
      this._lastCrackle = nowC
      ctx.services.audio.tone({ freq: 700 + Math.random() * 700, dur: 0.025, type: 'square', vol: 0.03 })
    }

    // Spawna nya partiklar (mängd skalar med värmen, klampat av PART_CAP).
    let spawn = Math.round((1.0 + heat * 1.6) * dt)
    while (spawn-- > 0) this._spawnParticle()

    // Integrera + rita om + döda partiklar.
    for (let i = this._parts.length - 1; i >= 0; i--) {
      const p = this._parts[i]
      p.life += dt
      const t = p.life / p.maxLife
      if (t >= 1 || p.g.destroyed) {
        if (!p.g.destroyed) {
          p.g.visible = false
          this._pool.push(p.g)
        }
        this._parts.splice(i, 1)
        continue
      }
      p.vx += this._airLean * 0.08 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy *= Math.pow(0.985, dt)
      const r = Math.max(0.5, p.r0 * (1 - 0.55 * t))
      const col = this._flameColor(t, heat)
      // Kontinuerlig fade — den gamla kurvan hoppade från 0.70 till 0.22 vid t=0.75.
      const alpha = t < 0.55 ? 0.92 : Math.max(0, 0.92 * (1 - (t - 0.55) / 0.45))
      const g = p.g
      g.clear().circle(0, 0, r).fill({ color: col, alpha })
      if (t < 0.5) g.circle(0, 0, r * 0.45).fill({ color: 0xfff7d0, alpha: alpha * 0.7 }) // glansig kärna
      g.position.set(p.x, p.y)
    }

    // Rita om Zacke's pinne (hand → marshmallow) varje frame. Göms medan en
    // gyllene marshmallow flyger till fatet (_resolving) så pinnen inte sträcks dit upp.
    if (this._stick && !this._stick.destroyed) {
      this._stick.clear()
      if (!this._resolving) {
        this._stick
          .moveTo(HAND.x, HAND.y).lineTo(this._marsh.x, this._marsh.y).stroke({ width: 7, color: COLORS.brown })
          .moveTo(HAND.x, HAND.y).lineTo(this._marsh.x, this._marsh.y).stroke({ width: 2.5, color: 0xb98a5c, alpha: 0.7 })
      }
    }

    // Zacke är ingen staty: blicken följer maten och leendet växer mot klart.
    this._zackeReact(this._toast)

    // Den mjuka kroppen lever varje bildruta, inte bara när _toast ändras — annars
    // fryser sockret mitt i sin rörelse så fort barnet lyfter bort den från elden.
    if (this._soft) {
      this._soft.mjukhet(this._toast * 0.9)
      this._soft.steg(clamp(ticker.deltaMS / (1000 / 60), 0.5, 2))
      this._drawMarsh(this._toast)
    }

    // Marshmallow-rostning: nära den (svajande) heta zonen + het eld = snabbare. _toast sjunker ALDRIG.
    if (!this._resolving) {
      const hotY = this._flameTopY + 20
      const dist = Math.hypot(this._marsh.x - this._hotX, this._marsh.y - hotY)
      if (dist < this._hotR) {
        const proximity = 1 - dist / this._hotR
        this._toast = Math.min(1, this._toast + (0.1 + heat * 0.18) * proximity * (dt / 60))
        this._drawMarsh(this._toast)
        this._roastMs += ticker.deltaMS
        this._idle = 0

        // Mjuk röst + gnistor medan den rostas.
        const now = performance.now()
        if (now - this._lastSparkle > 700) {
          this._lastSparkle = now
          sparkle(ctx.fxLayer, this._marsh.x, this._marsh.y, { count: 4 })
        }
        if (now - this._lastRoastSfx > 900) {
          this._lastRoastSfx = now
          ctx.services.audio.tone({ freq: 380 + this._toast * 480, dur: 0.16, type: 'sine', vol: 0.12 }) // rostnings-fräs stiger mot gyllene
        }
        if (!this._saidHalf && this._toast >= 0.5) {
          this._saidHalf = true
          ctx.services.voice.say('Snart är den klar!')
        }

        // Auto-hjälp: håller man länge utan mål → garanterad värme-boost ("elden tar fart").
        if (this._roastMs > ROAST_BOOST_MS && this._toast < 1) this._boost = 0.9
      }
      if (this._toast >= 1) this._onGolden(ctx)
    }

    // Idle: vänlig röst-repris + vink på närmaste kontroll + liten hjälpsam vindpust.
    if (!this._resolving) {
      this._idle += ticker.deltaMS
      if (this._idle >= IDLE_MS) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._air = Math.min(AIR_MAX, this._air + 0.4) // en hjälpsam gust → elden växer lite
        if (this._toast > 0.05 && !this._marsh.destroyed) pop(this._marsh)
        else if (this._logs[0] && !this._logs[0].view.destroyed) wiggle(this._logs[0].view)
      }
    }
  },

  // ---- Mål: en marshmallow gyllene → flyger till fatet; hela ordern klar → firande ---

  _onGolden(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._holding = false
    this._detachMarsh()
    this._drawMarsh(1)

    if (!this._marsh.destroyed) pop(this._marsh, { scale: 1.25 })
    sparkle(ctx.fxLayer, this._marsh.x, this._marsh.y, { count: 8 })
    ctx.services.audio.sfx('reveal')
    this._sayReady(ctx)

    // Marshmallowen flyger upp till sin plats på fatet.
    const slot = this._slots?.[this._filled]
    const tx = slot ? slot.x : FIRE_X
    const ty = slot ? slot.y : 96
    gsap.killTweensOf(this._marsh)
    this._flyTimer = gsap.to(this._marsh, {
      x: tx, y: ty, duration: 0.6, ease: 'power2.inOut',
      onComplete: () => {
        if (!this._alive) return
        this._fillSlot(ctx, this._filled)
        this._filled++
        if (this._filled >= this._order) {
          this._winOrder(ctx)
        } else {
          // Ny vit marshmallow att rosta för nästa plats.
          this._toast = 0
          this._lastMarshDraw = -1
          this._drawMarsh(0)
          this._saidHalf = false
          if (!this._marsh.destroyed) {
            this._marsh.position.set(MARSH_REST.x, MARSH_REST.y)
            this._marsh.scale.set(1)
            pop(this._marsh)
          }
          this._resolving = false
          this._idle = 0
          ctx.services.voice.say('En till! Rosta nästa.')
        }
      },
    })
  },

  // Hela ordern klar → stort firande + ny (svårare, slumpad) eld/order.
  _winOrder(ctx) {
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, FIRE_X, 110, { count: 16 })
    floatText(ctx.fxLayer, FIRE_X, 64, '😋', { fontSize: 64 })
    if (this._bobo && !this._bobo.destroyed) {
      // Spelets fyra hopp på 40 px är STÖRRE än riggens `jubel` (0,5·r = 27) och äger
      // därför `y`. Riggen bidrar med minen i stället — annars hade två tweens skrivit
      // samma tal och hoppet blivit hackigt.
      this._kar?.setMood('stolt')
      gsap.killTweensOf(this._bobo)
      gsap.to(this._bobo, { y: this._boboBase.y - 40, duration: 0.24, yoyo: true, repeat: 3, ease: 'power2.out', onComplete: () => { if (this._bobo && !this._bobo.destroyed) this._bobo.y = this._boboBase.y } })
    }

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('marshmallows', (ctx.progress.get().custom?.marshmallows || 0) + this._order)
    ctx.progress.complete()

    this._goldenTimer = gsap.delayedCall(1.8, () => {
      if (this._alive) this._nextFire(ctx)
    })
  },

  _nextFire(ctx) {
    if (!this._alive) return
    this._level += 1
    const prevKind = this._kind
    const cfg = this._levelConfig(this._level)

    // Ev. ny stämning/eldstadsstorlek på högre nivåer — lägerplatsen följer med.
    if (cfg.theme !== this._theme) {
      this._theme = cfg.theme
      if (this._bg && !this._bg.destroyed) this._bg.destroy({ children: true })
      this._bg = createScene(this._theme, { ground: true, groundH: GROUND_H })
      this._root.addChildAt(this._bg, 0)
      if (this._camp && !this._camp.destroyed) this._camp.destroy({ children: true })
      this._camp = makeCamp(this._theme === 'night')
      this._camp.eventMode = 'none'
      this._camp.interactiveChildren = false
      this._root.addChildAt(this._camp, 1)
      this._buildFireflies()
    }
    this._fuelMax = cfg.fuelMax
    this._hotR = cfg.hotR

    // Ny, slumpad order + vind + ny sorts mat för den här nivån.
    this._order = cfg.order
    this._kind = cfg.kind
    this._filled = 0
    this._windAmp = cfg.windAmp
    this._windFreq = cfg.windFreq
    this._windPhase = Math.random() * Math.PI * 2
    this._buildOrder()

    // Nollställ rosten — en ny, vit marshmallow. Inga sjunkande värden, ingen poäng.
    this._toast = 0
    this._lastMarshDraw = -1
    this._drawMarsh(0)
    this._fuel = BASE_FUEL + 1.2
    this._boost = 0
    this._roastMs = 0
    this._saidHalf = false
    this._lastEmber = -1
    this._lastSmile = -1

    // Töm vedhögen tillbaka till bas (ny eld att bygga upp) — men aldrig till tomt.
    for (const log of this._pileLogs) if (!log.destroyed) log.destroy()
    this._pileLogs = []
    this._seedPile(2)

    gsap.killTweensOf(this._marsh)
    this._marsh.position.set(MARSH_REST.x, MARSH_REST.y)
    this._marsh.scale.set(1)

    this._resolving = false
    this._idle = 0
    // Ny sorts mat får sin egen rubrik; annars den vanliga "ny eld"-repliken.
    if (cfg.kind !== prevKind) this._sayKind(ctx)
    else ctx.services.voice.say('En ny eld! Lägg på ved igen.')
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._soft?.destroy()
    this._soft = null

    this._goldenTimer?.kill?.()
    this._flyTimer?.kill?.()
    this._glowBreathe?.kill?.()

    this._detachBellows()
    this._detachMarsh()
    if (this._bellows && !this._bellows.destroyed) {
      this._bellows.off('pointerdown', this._onBellowsDown)
      if (this._bellowsTop && !this._bellowsTop.destroyed) gsap.killTweensOf(this._bellowsTop.scale)
    }
    if (this._marsh && !this._marsh.destroyed) {
      this._marsh.off('pointerdown', this._onMarshDown)
      gsap.killTweensOf(this._marsh)
      gsap.killTweensOf(this._marsh.scale)
    }
    if (this._glow && !this._glow.destroyed) gsap.killTweensOf(this._glow)
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    for (const rec of this._logs || []) {
      if (rec.view && !rec.view.destroyed) gsap.killTweensOf(rec.view)
    }
    this._drag?.destroy()

    // Eldpartiklar och eldflugor lever bara i tickern → säkert att nolla referenserna.
    this._parts = []
    this._pool = []
    this._pileLogs = []
    this._fireflies = []

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Eldstad: mjuk markskugga + ring av varmgrå stenar i ellipsbåge.
function makeHearth(rx = 150) {
  const c = new Container()
  const ry = 42
  const shadow = new Graphics().ellipse(FIRE_X, FIRE_BASE_Y + 14, rx + 26, ry + 12).fill({ color: 0x4a3526, alpha: 0.14 })
  c.addChild(shadow)
  // Askbädd innanför stenringen — bålet står i något, inte på ingenting.
  const ash = new Graphics()
    .ellipse(FIRE_X, FIRE_BASE_Y + 8, rx * 0.72, ry * 0.62).fill({ color: 0x6f6157, alpha: 0.55 })
    .ellipse(FIRE_X, FIRE_BASE_Y + 6, rx * 0.44, ry * 0.36).fill({ color: 0x3a2f28, alpha: 0.5 })
  c.addChild(ash)
  const n = 7
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.08 + (0.84 * i) / (n - 1)) // främre båge
    const sx = FIRE_X + Math.cos(a) * rx
    const sy = FIRE_BASE_Y + 20 + Math.sin(a) * ry
    const r = 22 + Math.random() * 8
    const base = lerpColor(0x8d8178, 0xb6aaa0, Math.random())
    const stone = new Graphics()
      .ellipse(0, 2, r, r * 0.86).fill({ color: 0x5f544c, alpha: 0.45 })
      .ellipse(0, 0, r, r * 0.86).fill(base)
      .ellipse(-r * 0.28, -r * 0.3, r * 0.42, r * 0.3).fill({ color: 0xffffff, alpha: 0.28 })
    stone.position.set(sx, sy)
    c.addChild(stone)
  }
  return c
}

// Lägerplats i bakgrunden: tält + två granar + buskar. Gör att man vill sitta kvar.
function makeCamp(night) {
  const c = new Container()
  const treeDark = night ? 0x1f4a3a : 0x2f6b4f
  const treeLit = night ? 0x2a5f49 : 0x3f8a63
  const trunk = 0x6b4326

  // Grästäcke över temats markremsa — 'sunset' har lila mark, och lila gräs på en
  // lägerplats läser fel. Vågig överkant så horisonten inte blir en rak linje.
  const grassCol = night ? 0x2b4a3b : 0x74a860
  const grassLit = night ? 0x365c48 : 0x8cbf74
  const grass = new Graphics()
  grass.moveTo(-40, 760).lineTo(-40, GROUND_Y + 10)
  for (let x = -40; x <= 1320; x += 110) grass.quadraticCurveTo(x + 55, GROUND_Y - 8, x + 110, GROUND_Y + 10)
  grass.lineTo(1320, 760).closePath().fill(grassCol)
  grass.moveTo(-40, GROUND_Y + 12)
  for (let x = -40; x <= 1320; x += 110) grass.quadraticCurveTo(x + 55, GROUND_Y - 6, x + 110, GROUND_Y + 12)
  grass.stroke({ width: 7, color: grassLit, alpha: 0.7 })
  c.addChild(grass)
  // Grässtrån längs kanten.
  for (let i = 0; i < 26; i++) {
    const gx = 20 + i * 50 + Math.random() * 20
    const h = 10 + Math.random() * 14
    c.addChild(new Graphics()
      .moveTo(gx, GROUND_Y + 16)
      .quadraticCurveTo(gx + 4, GROUND_Y + 16 - h * 0.7, gx + (Math.random() * 10 - 5), GROUND_Y + 16 - h)
      .stroke({ width: 3, color: grassLit, alpha: 0.8, cap: 'round' }))
  }

  const tree = (x, y, s, dark) => {
    const t = new Container()
    t.addChild(new Graphics().roundRect(-7 * s, 0, 14 * s, 46 * s, 5).fill(trunk))
    for (let i = 0; i < 3; i++) {
      const w = (64 - i * 14) * s
      const yy = -i * 40 * s
      t.addChild(new Graphics()
        .moveTo(0, yy - 74 * s).lineTo(w, yy + 6 * s).lineTo(-w, yy + 6 * s).closePath()
        .fill(i === 2 ? dark : lerpColor(dark, treeLit, 0.25 + i * 0.2)))
    }
    t.position.set(x, y)
    return t
  }

  // Tält (enkelt A-tält med öppning).
  const tent = new Container()
  const tw = 96
  tent.addChild(new Graphics().ellipse(0, 6, tw + 14, 16).fill({ color: 0x4a3526, alpha: 0.16 }))
  tent.addChild(new Graphics()
    .moveTo(0, -104).lineTo(tw, 6).lineTo(-tw, 6).closePath().fill(night ? 0x3b5f7a : 0x59a3c9))
  tent.addChild(new Graphics()
    .moveTo(0, -104).lineTo(tw, 6).lineTo(tw - 34, 6).lineTo(0, -78).closePath()
    .fill({ color: 0x000000, alpha: 0.16 }))
  // Öppning — en mörk vik med uppvikt flik.
  tent.addChild(new Graphics()
    .moveTo(-14, 6).lineTo(0, -62).lineTo(16, 6).closePath().fill(night ? 0x18283a : 0x2c4a63))
  tent.addChild(new Graphics()
    .moveTo(0, -62).lineTo(16, 6).lineTo(38, 6).closePath().fill(night ? 0x4a7391 : 0x7cbde0))
  tent.position.set(352, GROUND_Y + 42)

  c.addChild(tree(96, GROUND_Y + 34, 0.85, treeDark), tree(470, GROUND_Y + 20, 0.62, treeDark), tent)

  // Låga buskar längs marklinjen — bryter den raka horisonten.
  for (const [bx, br] of [[210, 26], [560, 20], [830, 24], [1010, 18], [1230, 28]]) {
    c.addChild(new Graphics()
      .circle(bx - br * 0.6, GROUND_Y + 16, br * 0.75).fill({ color: treeDark, alpha: 0.75 })
      .circle(bx + br * 0.6, GROUND_Y + 16, br * 0.7).fill({ color: treeDark, alpha: 0.75 })
      .circle(bx, GROUND_Y + 8, br).fill({ color: treeLit, alpha: 0.8 }))
  }
  return c
}

// En dragbar vedpinne — RITAD (bark, räfflor, ändträ med årsringar). Aldrig en emoji.
function makeLog(len = 84, r = 18) {
  const c = new Container()
  c.addChild(drawLogInto(new Graphics(), len, r))
  return c
}

function drawLogInto(g, len = 84, r = 18) {
  const bark = 0x7a4a2c
  const barkDark = 0x54301b
  g.ellipse(2, r * 0.5, len * 0.5, r * 0.72).fill({ color: 0x4a3526, alpha: 0.15 })
  g.roundRect(-len / 2, -r, len, r * 2, r * 0.7).fill(bark)
  // Bark-räfflor (moveTo startar alltid en ny väg → inget streck från förra formen).
  g.moveTo(-len / 2 + 14, -r * 0.42).lineTo(len / 2 - 22, -r * 0.52).stroke({ width: 3, color: barkDark, alpha: 0.5 })
  g.moveTo(-len / 2 + 10, r * 0.16).lineTo(len / 2 - 26, r * 0.24).stroke({ width: 3, color: barkDark, alpha: 0.4 })
  g.moveTo(-len / 2 + 20, r * 0.62).lineTo(len / 2 - 30, r * 0.58).stroke({ width: 2.5, color: barkDark, alpha: 0.3 })
  // Ändträ med årsringar.
  const ex = len / 2 - 5
  g.ellipse(ex, 0, 10, r * 0.94).fill(0xd9a875)
  g.ellipse(ex, 0, 6.2, r * 0.6).stroke({ width: 2, color: 0xb07f52 })
  g.ellipse(ex, 0, 2.6, r * 0.26).stroke({ width: 2, color: 0xb07f52 })
  return g
}

// Bälg: två träpaddlar med lädersvep emellan, pip mot elden, rörlig ovanhalva (label "top").
function makeBellows() {
  const c = new Container()
  const wood = COLORS.brown
  const woodDark = 0x5e3720

  // Rund lädersbälg med pip — långsmala träpaddlar läste som ännu en vedtrave bredvid
  // vedhögen. Rund kropp + rör = otvetydigt "något man trycker på så det blåser".
  const shadow = new Graphics().ellipse(0, 56, 70, 14).fill({ color: 0x4a3526, alpha: 0.18 })
  // Pip mot elden (vänster).
  const nozzle = new Graphics()
    .roundRect(-120, -6, 66, 17, 8).fill(woodDark)
    .roundRect(-138, -11, 22, 27, 9).fill(0x46281a)
    .roundRect(-114, -3, 44, 5, 3).fill({ color: 0xffffff, alpha: 0.2 })
  // Läderkropp med koncentriska veck.
  const leather = new Graphics()
    .ellipse(0, 6, 68, 45).fill(0x9c5a30)
    .ellipse(0, 6, 68, 45).stroke({ width: 4, color: 0x5e3018 })
  for (let i = 1; i <= 3; i++) {
    leather.ellipse(0, 6 + i * 2, 68 - i * 16, 45 - i * 11).stroke({ width: 3, color: 0x5e3018, alpha: 0.4 })
  }
  leather.ellipse(-24, -12, 20, 10).fill({ color: 0xffffff, alpha: 0.14 })
  // Nedre fasta träplatta.
  const base = new Graphics()
    .ellipse(0, 46, 62, 15).fill(wood)
    .ellipse(0, 46, 62, 15).stroke({ width: 3, color: woodDark })
  // Övre rörliga träplatta + handtag (squashas vid pump).
  const top = new Graphics()
  top.label = 'top'
  top.ellipse(0, -34, 62, 16).fill(lerpColor(wood, 0xffffff, 0.22))
  top.ellipse(0, -34, 62, 16).stroke({ width: 3, color: woodDark })
  top.roundRect(-15, -58, 30, 22, 10).fill(woodDark)
  top.roundRect(-9, -54, 18, 8, 4).fill({ color: 0xffffff, alpha: 0.22 })
  // Ritad luft-hint vid pipen (tre böjda streck) — inte en emoji.
  const hint = new Graphics()
  for (let i = 0; i < 3; i++) {
    const yy = -12 + i * 12
    hint.moveTo(-148, yy).quadraticCurveTo(-166, yy - 5, -180, yy + 2)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.4, cap: 'round' })
  }
  c.addChild(shadow, nozzle, leather, base, top, hint)
  return c
}

// Zacke: glad pojke vänd mot elden (vänster). Kropp centrerad under huvudet, hår OVANPÅ
// huvudet, en riktig arm ut mot handen där pinnen sitter. Ögon + mun ritas om vid reaktion.
function makeZacke() {
  const c = new Container()
  const skin = 0xf6b78a
  const shirt = COLORS.blue
  const pants = 0x3f6f9e

  // Ben + skor.
  const legs = new Graphics()
    .roundRect(-22, 88, 18, 28, 9).fill(pants)
    .roundRect(6, 88, 18, 28, 9).fill(pants)
    .roundRect(-30, 110, 30, 14, 7).fill(0x4a3526)
    .roundRect(2, 110, 30, 14, 7).fill(0x4a3526)
  // Kropp, centrerad under huvudet.
  const body = new Graphics()
    .roundRect(-30, 28, 60, 66, 24).fill(shirt)
    .roundRect(-30, 62, 60, 12, 6).fill({ color: 0xffffff, alpha: 0.18 })
  // Arm ut mot handen (lokala koordinater för HAND).
  const hx = HAND.x - ZACKE.x
  const hy = HAND.y - ZACKE.y
  const arm = new Graphics()
    .moveTo(-24, 46).lineTo(hx, hy).stroke({ width: 15, color: shirt, cap: 'round' })
    .circle(hx, hy, 11).fill(skin)
  // Huvud + öra.
  const head = new Graphics()
    .circle(-34, 4, 8).fill(skin)
    .circle(0, 0, 38).fill(skin)
  // Hår ovanpå huvudet (lugg mot elden).
  const hair = new Graphics()
    .ellipse(0, -20, 40, 26).fill(0x5a3a23)
    .ellipse(-28, -8, 13, 17).fill(0x5a3a23)
    .ellipse(28, -6, 12, 16).fill(0x5a3a23)
    .ellipse(-14, -30, 22, 12).fill(0x6d492e)
  const cheek = new Graphics()
    .circle(-24, 12, 8).fill({ color: COLORS.pink, alpha: 0.45 })
    .circle(16, 12, 7).fill({ color: COLORS.pink, alpha: 0.35 })
  const eyes = new Graphics()
  eyes.label = 'eyes'
  const smile = new Graphics()
  smile.label = 'smile'
  c.addChild(legs, body, arm, head, hair, cheek, eyes, smile)
  return c
}

// =================== Det som rostas (allt ritat) ===================

// Ritar den valda maten i `g` vid rost-graden t (0 = rå, 1 = klar).
// Marshmallowen ritad ur den mjuka kroppens egen kontur. Samma färgtrappa och
// samma rostfläckar som den fasta versionen — det ENDA som ändrats är att formen
// kommer från fysiken i stället för från en roundRect. Dagern och fläckarna sitter
// kvar i lokala koordinater: de ska följa sockret, inte simma runt i det.
function drawMarshSoft(g, soft, t) {
  if (g.destroyed) return
  const col = lerpColor(0xfff7e6, 0xe8a93c, t)
  const edge = lerpColor(0xe8dcc0, 0xb9842b, t)
  g.clear()
  soft.path(g).fill(col).stroke({ width: 3, color: edge })
  const c = soft.centrum
  g.roundRect(c.x - 12, c.y - 20, 11, 22, 6).fill({ color: 0xffffff, alpha: 0.35 * (1 - t * 0.6) })
  if (t > 0.5) {
    const a = (t - 0.5) * 1.5
    g.circle(c.x + 7, c.y - 8, 4.5).fill({ color: 0xc98a2e, alpha: a * 0.8 })
    g.circle(c.x - 2, c.y + 12, 3.5).fill({ color: 0xc98a2e, alpha: a * 0.6 })
    g.circle(c.x + 10, c.y + 8, 2.8).fill({ color: 0xb9752a, alpha: a * 0.5 })
  }
}

function drawRoast(g, kind, t) {
  if (g.destroyed) return
  g.clear()
  if (kind === 'korv') {
    const col = lerpColor(0xe98a72, 0x8d4a25, t)
    const edge = lerpColor(0xc96a58, 0x532c13, t)
    g.roundRect(-32, -15, 64, 30, 15).fill(col).stroke({ width: 3, color: edge })
    g.roundRect(-24, -10, 28, 8, 4).fill({ color: 0xffffff, alpha: 0.24 * (1 - t * 0.7) })
    // Grillränder växer fram.
    if (t > 0.35) {
      const a = Math.min(0.85, (t - 0.35) * 1.9)
      for (let i = 0; i < 3; i++) {
        g.roundRect(-18 + i * 16, -13, 6, 26, 3).fill({ color: 0x40220e, alpha: a })
      }
    }
  } else if (kind === 'majs') {
    const col = lerpColor(0xffe27a, 0xdf9f22, t)
    const edge = lerpColor(0xe8c85a, 0xa06f14, t)
    // Blad först (bakom kolven).
    g.moveTo(-4, 22).quadraticCurveTo(-26, 36, -12, 50).quadraticCurveTo(-2, 36, -4, 22).fill(0x5bbf6a)
    g.moveTo(4, 22).quadraticCurveTo(26, 36, 12, 50).quadraticCurveTo(2, 36, 4, 22).fill(0x49a657)
    g.ellipse(0, 0, 18, 31).fill(col).stroke({ width: 3, color: edge })
    // Kärnor.
    for (let r = -3; r <= 3; r++) {
      for (let k = -1; k <= 1; k++) {
        const kx = k * 9 + (r % 2 ? 4.5 : 0)
        if (Math.abs(kx) > 12) continue
        g.circle(kx, r * 8, 3.1).fill({ color: lerpColor(0xffef9f, 0x9c6a12, t), alpha: 0.75 })
      }
    }
    if (t > 0.5) g.circle(7, -12, 4).fill({ color: 0x5c3c0c, alpha: (t - 0.5) * 1.4 })
  } else if (kind === 'apple') {
    const col = lerpColor(0xff6b6b, 0xa8431f, t)
    const edge = lerpColor(0xd94f4f, 0x6f2a10, t)
    g.circle(-9, 4, 17).fill(col)
    g.circle(9, 4, 17).fill(col)
    g.ellipse(0, 8, 21, 17).fill(col)
    g.ellipse(0, 4, 23, 21).stroke({ width: 3, color: edge })
    g.roundRect(-3, -26, 6, 16, 3).fill(0x6b4326)
    g.moveTo(2, -22).quadraticCurveTo(20, -30, 22, -16).quadraticCurveTo(8, -12, 2, -22).fill(0x5bbf6a)
    g.ellipse(-9, -2, 5, 8).fill({ color: 0xffffff, alpha: 0.34 * (1 - t * 0.6) })
    if (t > 0.6) g.ellipse(6, 12, 9, 6).fill({ color: 0x5c2a0c, alpha: (t - 0.6) * 1.6 })
  } else {
    // Marshmallow: sväller lite, får bubblor och en glansig droppe mot gyllene.
    const col = lerpColor(0xfff7e6, 0xe8a93c, t)
    const edge = lerpColor(0xe8dcc0, 0xb9842b, t)
    const s = 1 + t * 0.14
    g.roundRect(-20 * s, -26 * s, 40 * s, 52 * s, 16).fill(col).stroke({ width: 3, color: edge })
    g.roundRect(-12, -20, 11, 22, 6).fill({ color: 0xffffff, alpha: 0.35 * (1 - t * 0.6) })
    if (t > 0.5) {
      const a = (t - 0.5) * 1.5
      g.circle(7, -8, 4.5).fill({ color: 0xc98a2e, alpha: a * 0.8 })
      g.circle(-2, 12, 3.5).fill({ color: 0xc98a2e, alpha: a * 0.6 })
      g.circle(10, 8, 2.8).fill({ color: 0xb9752a, alpha: a * 0.5 })
    }
    if (t > 0.85) g.ellipse(0, 30 * s, 6, 9).fill({ color: 0xe8a93c, alpha: (t - 0.85) * 5 })
  }
}
