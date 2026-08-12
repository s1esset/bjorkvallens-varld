// Plantera Frön — lugn dra + vattna-lek (2–4 år). Tre steg utan press:
//   1. Så:    dra (eller tap-tap) frön ner i jordhålen → de snäpper ner, jordhög.
//             Riktigt "plopp"-klipp när fröet landar i jorden.
//   2. Vattna: när allt är sått dyker vattenkannan upp. Barnet DRAR kannan över en
//              planta och håller kvar → kannan lutar, vattendroppar rinner (mjukt
//              porlande vattenljud), jorden mörknar av fukt och plantan VÄXER över tid
//              (grodd → stjälk → blad → svällande knopp).
//   3. Blomning: när en planta vattnats klart är knoppen full → den SPRICKER och
//              kronbladen vecklar ut sig ETT i taget (stigande ton) innan blomman
//              poppar in med ett magi-klipp, gnistror och pollen-pluff — klimax.
//   4. Klart: när alla plantor blommat fladdrar fjärilar in → firande + klistermärke,
//              ny runda. Inga felsteg: vattnet växer alltid. Pausar barnet vinkar
//              kannan först (bara röst+gest); först SENARE hjälper en mjuk auto-vattning
//              lite (svagare dos), så barnets hållande faktiskt avgör — men det blir
//              alltid klart.
// Inga felsteg, ingen timer, ingen poäng. Allt ritas programmatiskt (Pixi + emoji).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, puff, sparkle , kvittera} from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT, tint } from '../../lib/theme.js'
import { verticalFill } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Himlen var tidigare den platta tonen 0xbfe6ff; de två nedan spänner om den.
const SKY_TOP = 0xa7dbfd
const SKY_HORIZON = 0xd8f1ff
const HOLE_Y = 560 // jordhålens y (i jordrabatten)
const SEED_Y = 210 // fröförrådets y (uppe i himlen)
const FLOWERS = ['🌸', '🌺', '🌻', '🌷', '🌼', '🌹']
const BUD_COLORS = [0x6fbf73, 0x88c98a, 0x7bc043]
// Kronbladsfärger (programmatiska petals som vecklar ut vid blomning).
const PETAL_COLORS = [0xff8ab0, 0xffd35c, 0xff6b6b, 0xa78bfa, 0xff9ec4, 0xffb84d, 0xff8a3d]
const POLLEN = 0xffe08a
const DROP_BLUE = 0x6fc3ef
const STEM_H = 150 // full stjälkhöjd
const POUR_MS = 2600 // ms sammanhängande vattning för att blomma en planta
const SPROUT0 = 0.06 // liten startgrodd så det syns något att vattna
const CAN_HOME_X = 640
const CAN_HOME_Y = 150
const SPOUT_LOCAL = { x: -104, y: -12 } // pip-spetsen i kannans lokala koordinater

// --- Liv i jorden ---------------------------------------------------------
// `_stillaprobe` mätte spelet som ett äkta TABLEAU: 17 noder, **0** i rörelse,
// största utslag **0,0 px i tre svep**. Trädgården stod helt stilla medan barnet
// tittade på den. §4 [Quick]: "Liv i jorden vid sådd."
// ⚠️ Docen skrev masken som 🪱. P0 ASSETS förbjuder en emoji som HELA föremålet —
// masken nedan är RITAD, med egen silhuett och eget ansikte.
// Masken är inte dekor: den DYKER när ett frö plumsar ner, och kraften avtar med
// avståndet, så barnet ser att det bor något i jorden som känner av vad hen gör.
const WORM_RISE = 52 // px masken reser sig ur jorden när den kikar upp
const WORM_RANGE = 420 // px: inom denna radie skräms masken av ett nedslag
// ⚠️ Maskarna placeras RELATIVT hålraden, inte på fasta punkter. Första versionen
// hade fasta gläntor vid x=170/1110 — på nivå 0 finns BARA ETT hål (x=640), alltså
// låg närmaste mask 471 px bort och hamnade utanför WORM_RANGE: skrämseln var död
// på precis den nivå en tvååring spelar. Avstånden nedan mäts från hålradens ändar.
const WORM_OFFS = [150, 300] // px utanför hålraden — en nära mask och en bortre
const WORM_YS = [606, 644]

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t) => t * t * (3 - 2 * t) // mjuk 0→1

// Mörkare variant av en färg (jordkant, konturer).
function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

export default {
  id: 'plantera-fron',
  titleSv: 'Plantera Frön',
  icon: '🌱',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'plantera-fron',
  voiceIntro: 'Dra fröna ner i jorden!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._pouring = false
    this._resolving = false
    this._saidPlopp = false
    this._saidWater = false
    this._drops = [] // aktiva vattendroppar (ticker-drivna)
    this._plants = [] // per-runda-plantor
    this._worms = [] // maskarna i jorden (ticker-drivna, per runda)
    this._tweened = [] // per-runda-objekt vars tweens måste dödas vid städ/exit
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildDecor(ctx)

    this._round = new Container() // all per-runda-grafik (frön/hål/plantor/kanna/droppar)
    this._root.addChild(this._round)

    this._drag = new DragController({ space: this._round, services: ctx.services })

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bakgrund: himmel + jordrabatt + sol/moln. Allt dekorativt (fångar ingen tap).
  _buildDecor(ctx) {
    const decor = new Container()
    decor.eventMode = 'none'
    decor.interactiveChildren = false

    // Himmel och jord breddas med BLEED så en bred telefon (full bleed) aldrig ser
    // creme-kanter. Jordgradienten breddas BARA i sidled — samma lodräta spann
    // (440..740) som förut, så den synliga färgmappningen är oförändrad — och remsan
    // under 740 (plattor högre än 16:9) är en helfärgad rect i gradientens slutton.
    // Himlen låg på 495 283 px — 54 % av skärmen — i EN ton (`_plattprobe --medbakgrund`),
    // medan jorden under redan var tonad. Toningen går djupare upptill och blekare mot
    // horisonten, som en riktig himmel, och spänner om den gamla platta SKY-tonen.
    // Cachad per färgpar — noll texturbakningar per montering.
    decor.addChild(new Graphics().rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, 460 + BLEED_Y).fill(verticalFill(SKY_TOP, SKY_HORIZON)))
    // Jorden mörknar nedåt, som en riktig jordprofil gör. Var EN brun ton over 301 000 px —
    // appens storsta enfargade yta dar platt faktiskt var fel (scripts/_plattprobe.mjs).
    decor.addChild(new Graphics().roundRect(-20 - BLEED_X, 440, ctx.width + 40 + 2 * BLEED_X, 300, 36).fill(verticalFill(tint(COLORS.brown, 0.16), shade(COLORS.brown, 0.3))))
    decor.addChild(new Graphics().rect(-20 - BLEED_X, 740, ctx.width + 40 + 2 * BLEED_X, BLEED_Y).fill(shade(COLORS.brown, 0.3)))
    // Matjordskanten. Så fort himlen slutade vara platt blev DEN här remsan spelets
    // största enfärgade fält (57 152 px) — samma fynd, ny plats. Tonas som resten.
    decor.addChild(new Graphics().roundRect(-20 - BLEED_X, 432, ctx.width + 40 + 2 * BLEED_X, 46, 24).fill(verticalFill(shade(COLORS.brown, 0.1), shade(COLORS.brown, 0.3))))

    // Ritad sol med strålar och ansikte (var en ☀️-emoji).
    const sun = new Graphics()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      sun.moveTo(Math.cos(a) * 38, Math.sin(a) * 38).lineTo(Math.cos(a) * 54, Math.sin(a) * 54)
      sun.stroke({ width: 7, color: 0xffc93c, cap: 'round' })
    }
    sun.circle(0, 0, 38).fill(0xffd35c).stroke({ width: 4, color: 0xe0a94f })
    sun.circle(-13, -6, 4).fill(0x8a6a2a)
    sun.circle(13, -6, 4).fill(0x8a6a2a)
    sun.arc(0, 2, 14, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 3.5, color: 0x8a6a2a })
    sun.circle(-24, 8, 6).fill({ color: 0xff9d9d, alpha: 0.5 })
    sun.circle(24, 8, 6).fill({ color: 0xff9d9d, alpha: 0.5 })
    sun.position.set(1080, 132) // medvetet undan hörn-knapparna
    decor.addChild(sun)

    // Riktiga puffiga moln (var rundade rektanglar som läste som tomma etiketter).
    const clouds = new Graphics()
    for (const [cx, cy, s] of [[330, 120, 1], [640, 90, 0.8], [880, 150, 0.7]]) {
      clouds.circle(cx - 42 * s, cy + 6 * s, 24 * s).fill({ color: COLORS.white, alpha: 0.92 })
      clouds.circle(cx, cy - 12 * s, 34 * s).fill({ color: COLORS.white, alpha: 0.92 })
      clouds.circle(cx + 44 * s, cy + 6 * s, 26 * s).fill({ color: COLORS.white, alpha: 0.92 })
      clouds.roundRect(cx - 66 * s, cy, 132 * s, 28 * s, 14 * s).fill({ color: COLORS.white, alpha: 0.92 })
    }
    decor.addChild(clouds)

    // Trädgården fick en värld: kullar bakom rabatten, gräskant och småsten i
    // jorden. Marken var förut en platt brun platta utan ett enda kännetecken.
    const hills = new Graphics()
    hills.ellipse(180, 500, 260, 90).fill(0x8fd07a)
    hills.ellipse(640, 512, 320, 100).fill(0x9fd88a)
    hills.ellipse(1120, 498, 240, 86).fill(0x8fd07a)
    decor.addChildAt(hills, 1)

    const soil = new Graphics()
    // De fyra yttersta stråna ligger i bleed-zonen (utanför 0..1280) så gräskanten
    // inte tar slut mitt i bilden på en bred telefon; på 16:9 syns de aldrig.
    for (const [gx, gh] of [[-160, 18], [-55, 21], [60, 20], [150, 15], [255, 22], [400, 16], [520, 19], [760, 17], [900, 22], [1030, 15], [1180, 20], [1335, 19], [1430, 16]]) {
      soil.moveTo(gx, 452).quadraticCurveTo(gx - 5, 452 - gh, gx - 11, 452 - gh + 4)
      soil.moveTo(gx, 452).quadraticCurveTo(gx + 2, 452 - gh - 3, gx + 8, 452 - gh + 2)
      soil.stroke({ width: 4, color: 0x6fb85c, cap: 'round' })
    }
    for (const [px, py, pr] of [[190, 560, 7], [420, 640, 5], [880, 590, 6], [1090, 660, 8], [330, 690, 5], [720, 700, 6]]) {
      soil.ellipse(px, py, pr, pr * 0.7).fill({ color: 0x6f4a2e, alpha: 0.55 })
    }
    decor.addChild(soil)

    this._root.addChild(decor)
  },

  // Ny runda: töm förra rundan, bygg hål + frön. Kannan skapas först vid vattenfasen.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()
    this._phase = 'sow'
    this._cuePhrase = this.voiceIntro
    this._pouring = false
    this._resolving = false
    this._sown = 0
    this._bloomed = 0
    this._idle = 0
    this._holeCount = Math.min(3, 1 + Math.floor(this._level / 2)) // 1–3 hål, mjuk trappa

    // INGEN panel bakom fröna. Här låg förut en vit rundad ruta — spelobjekt i en
    // bricka, vilket P0 ASSETS förbjuder. En ritad korg testades men svävade
    // synligt i himlen (fröraden ligger på y≈210, högt över marken). Fröna står
    // nu fritt med sin egen skugga, som ett riktigt föremål ska.

    // Jordhål (mål): jämnt fördelade kring x=640 med 230px mellanrum.
    this._holes = []
    const hStart = 640 - ((this._holeCount - 1) * 230) / 2

    // Maskarna först i _round → de ritas BAKOM hål, frön och plantor.
    this._addWorms(hStart, hStart + (this._holeCount - 1) * 230)
    for (let i = 0; i < this._holeCount; i++) {
      const hx = hStart + i * 230
      const hole = this._makeHole()
      hole.position.set(hx, HOLE_Y)
      hole._filled = false
      this._round.addChild(hole)
      this._holes.push({ view: hole, x: hx, y: HOLE_Y })
      this._drag.addTarget(hole, () => !hole._filled, { hitRadius: 160 })
    }

    // Frön (källa): lika många som hålen, alltid lösbart.
    const sStart = 640 - ((this._holeCount - 1) * 120) / 2
    for (let i = 0; i < this._holeCount; i++) {
      const seed = this._makeSeed()
      seed.position.set(sStart + i * 120, SEED_Y)
      this._round.addChild(seed)
      bounceIn(seed, { delay: i * 0.08 })
      this._drag.addItem(
        seed,
        { idx: i },
        { onCorrect: (rec, target) => this._onSow(ctx, rec, target), onWrong: (rec) => this._onMiss(ctx, rec) }
      )
    }
  },

  // Töm förra rundans noder + döda alla per-runda-tweens (exit/round-säkert).
  _clearRound() {
    this._drag.clear()
    this._canBob?.kill()
    this._canBob = null
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._tweened = []
    this._drops = [] // droppar ligger i _round och förstörs nedan; nolla referenserna
    this._plants = []
    this._worms = [] // maskarna ligger också i _round — nolla före rivningen
    this._can = null
    this._dropLayer = null
    this._pouring = false
    this._round.removeChildren().forEach((o) => o.destroy({ children: true }))
  },

  _track(obj) {
    this._tweened.push(obj)
    return obj
  },

  // P0 ASSETS: fröet är ett FRISTÅENDE ritat ollon — låg tidigare som en
  // 🌰-emoji inuti en vit cirkel, alltså en ikon i en bricka.
  _makeSeed() {
    const c = new Container()
    const sh = new Graphics().ellipse(0, 34, 30, 9).fill({ color: 0x000000, alpha: 0.15 })
    const g = new Graphics()
    g.ellipse(0, 6, 26, 30).fill(0xc98a4b).stroke({ width: 4, color: 0x9a5c33 }) // nöten
    g.ellipse(-8, -2, 9, 13).fill({ color: 0xe0aa72, alpha: 0.7 }) // glans
    g.moveTo(-27, -12).quadraticCurveTo(0, -34, 27, -12).quadraticCurveTo(0, 0, -27, -12).closePath()
    g.fill(0x7a4a28).stroke({ width: 4, color: 0x5c3720 }) // hattens brätte
    g.roundRect(-5, -40, 10, 12, 5).fill(0x5c3720) // stjälk
    for (let i = -2; i <= 2; i++) g.circle(i * 9, -18, 2.2).fill({ color: 0x5c3720, alpha: 0.55 })
    // Litet ansikte → eget liv (P0: egen silhuett OCH egen personlighet).
    g.circle(-8, 8, 3.5).fill(0x3a2616)
    g.circle(8, 8, 3.5).fill(0x3a2616)
    g.arc(0, 12, 7, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2.5, color: 0x3a2616 })
    c.addChild(sh, g)
    c.hitArea = new Circle(0, 0, 70) // hit-halo ≥96px Ø
    return c
  },

  _makeHole() {
    const c = new Container()
    c.addChild(new Graphics().ellipse(0, 0, 75, 30).fill(0x3a2616).stroke({ width: 4, color: shade(COLORS.brown, 0.35) }))
    c.hitArea = new Circle(0, 0, 90) // generös träffyta för tap-tap
    return c
  },

  // En ritad daggmask som kikar upp ur jorden.
  // ⚠️ Kroppen MÅSTE klippas mot marknivån. Första versionen litade på att den
  // ritade jordkanten skulle dölja foten — men kanten är 12 px och kroppen 60,
  // så en nedåkt mask stack ut UNDER sitt eget hål. Testet var grönt; det var
  // skärmdumpen som visade det. Masken nedan klipper allt under marknivån.
  _makeWorm() {
    const c = new Container()
    c.eventMode = 'none'
    c.scale.set(1.35) // ritad i små mått; skalas upp så den läses som ett djur, inte en prick
    c.addChild(new Graphics().ellipse(0, 0, 27, 11).fill(0x2b1a0f)) // gånghålet

    const body = new Container()
    const g = new Graphics()
    // Kroppen nedifrån och upp — smalnar mot huvudet så silhuetten blir en mask,
    // inte en korv. Varje ring är ett eget fill-anrop (flera former i EN Graphics
    // med ett gemensamt fill tar den första färgen — se `_makeSeed`).
    for (const [sy, r] of [[2, 12.5], [-11, 12], [-23, 11.2], [-34, 10.4], [-44, 9.8]]) {
      g.circle(0, sy, r).fill(0xd98a90)
    }
    g.ellipse(-3.5, -26, 4.5, 20).fill({ color: 0xeeaeb2, alpha: 0.75 }) // ljusstrimma
    for (const sy of [-6, -17, -28]) { // ledringarna
      g.moveTo(-10, sy).quadraticCurveTo(0, sy + 4, 10, sy).stroke({ width: 2, color: 0xb46b73, alpha: 0.7 })
    }
    g.circle(0, -46, 10).fill(0xdf959b) // huvudet
    g.circle(-3.6, -48, 2.4).fill(0x3a2616)
    g.circle(3.6, -48, 2.4).fill(0x3a2616)
    g.arc(0, -45, 5, 0.2 * Math.PI, 0.8 * Math.PI).stroke({ width: 2, color: 0x7d4a4e })
    body.addChild(g)
    body.y = WORM_RISE // börjar nere i jorden
    c.addChild(body)

    // Marknivån: allt under y=+3 är under jorden och ska inte synas.
    const klipp = new Graphics().rect(-46, -150, 92, 153).fill(0xffffff)
    c.addChild(klipp)
    body.mask = klipp

    c.addChild(new Graphics() // jordkanten runt gånghålet
      .ellipse(0, 3, 30, 11).fill(shade(COLORS.brown, 0.12))
      .ellipse(0, 1, 23, 7).fill({ color: 0x2b1a0f, alpha: 0.55 }))
    c._body = body
    return c
  },

  // 1–2 maskar per runda, placerade UTANFÖR hålraden (aldrig i vägen för en
  // planta som växer) och på olika avstånd — en nära, en bortre. Sida, avstånd
  // och antal slumpas så ingen runda ser exakt likadan ut, vilket är §4-punkten.
  _addWorms(hStart, hEnd) {
    this._worms = []
    const antal = Math.random() < 0.4 ? 1 : 2
    const vandNara = Math.random() < 0.5 // vilken sida som får den nära masken
    const valda = []
    for (let i = 0; i < antal; i++) {
      const vanster = (i === 0) === vandNara
      const off = WORM_OFFS[i]
      const x = vanster ? hStart - off : hEnd + off
      valda.push([Math.max(130, Math.min(1150, x)), WORM_YS[i % WORM_YS.length]])
    }
    for (let i = 0; i < valda.length; i++) {
      const [wx, wy] = valda[i]
      const view = this._makeWorm()
      view.position.set(wx, wy)
      this._round.addChild(view)
      this._worms.push({
        view,
        body: view._body,
        x: wx,
        y: wy,
        t: i * 2.6, // fasförskjutning så de två inte kikar upp i takt
        period: 7.5 + Math.random() * 2,
        ut: 0, // 0 = nere i jorden, 1 = helt uppe
        duckT: 0, // s kvar av skrämseln
        duckAmt: 0, // hur djupt den här skrämseln trycker ner masken (0..1)
        sway: 1.5 + Math.random() * 0.5,
      })
    }
  },

  // Ett frö som plumsar ner skrämmer maskarna. Kraften avtar med avståndet —
  // det är skillnaden mot en slumpvis vibration: barnet ser att det var DESS
  // nedslag som gjorde det, och att den närmaste masken blev mest rädd.
  _scareWorms(x, y) {
    for (const w of this._worms) {
      const d = Math.hypot(w.x - x, w.y - y)
      const k = clamp01(1 - d / WORM_RANGE)
      if (k <= 0.02) continue
      w.duckAmt = Math.max(w.duckAmt, k)
      w.duckT = Math.max(w.duckT, 0.5 + k * 1.6)
    }
  },

  // Per-frame: kikcykeln + skrämseln. Uppdykandet är LÅNGSAMT (nyfikenhet) och
  // nerdykandet SNABBT (rädsla) — asymmetrin är det som gör masken levande.
  _stepWorms(dt) {
    for (const w of this._worms) {
      if (!w.view || w.view.destroyed) continue
      w.t += dt
      if (w.duckT > 0) w.duckT = Math.max(0, w.duckT - dt)

      // Kikcykeln: uppe drygt halva varvet, med mjuk resning och sjunkning.
      const u = (w.t % w.period) / w.period
      let mal = 0
      if (u > 0.12 && u < 0.72) mal = Math.sin(((u - 0.12) / 0.6) * Math.PI)
      if (w.duckT > 0) mal *= 1 - w.duckAmt
      else w.duckAmt = 0

      // Ner fort (rädsla), upp sakta (nyfikenhet). Uppfarten låg först på 1,1 och
      // då hann masken bara till 0,89 av full höjd innan cykeln vände — den kom
      // aldrig HELT upp. 1,7 räcker till full resning och behåller asymmetrin.
      const takt = mal < w.ut ? 4.5 : 1.7
      w.ut += (mal - w.ut) * Math.min(1, takt * dt)
      w.body.y = (1 - w.ut) * WORM_RISE
      w.body.rotation = Math.sin(w.t * w.sway) * 0.22 * w.ut
    }
  },

  // Frö ner i hål: plopp, jordhög, puff, göm fröet. Allt är "rätt".
  _onSow(ctx, rec, target) {
    if (!this._alive) return
    const hole = target.view
    hole._filled = true
    this._idle = 0
    ctx.services.audio.sfx('plopp') // riktigt "plopp"-klipp i jorden (ersätter TTS-"Plopp!")
    this._scareWorms(hole.x, hole.y) // maskarna känner nedslaget

    const mound = new Graphics()
      .ellipse(0, 0, 60, 26)
      .fill(shade(COLORS.brown, 0.15))
      .stroke({ width: 3, color: shade(COLORS.brown, 0.32) })
    mound.eventMode = 'none'
    mound.position.set(hole.x, hole.y - 6)
    this._round.addChild(mound)
    this._track(mound)
    pop(mound)
    puff(ctx.fxLayer, hole.x, hole.y, { count: 6, color: COLORS.brown })

    gsap.to(rec.view, {
      alpha: 0,
      duration: 0.2,
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })

    this._sown++
    if (this._sown >= this._holeCount) this._startWatering(ctx)
  },

  // Miss (sikta bredvid alla hål): lekfull vingel. DragControllern spelar 'soft'.
  _onMiss(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    wiggle(rec.view)
  },

  // Allt sått → bygg kollapsade plantor + vattenkanna att dra och vattna med.
  _startWatering(ctx) {
    if (!this._alive) return
    this._phase = 'water'
    this._cuePhrase = 'Dra vattenkannan över blommorna!'
    this._idle = 0
    this._helpStage = 0 // 0=ingen hjälp, 1=vinkat, 2+=auto-vattnat (mjuk trappa)
    this._bloomed = 0

    // Plantor (kollapsade, liten startgrodd).
    this._plants = this._holes.map((h) => this._makePlant(h))
    for (const p of this._plants) {
      p.grow = SPROUT0
      this._renderPlant(p)
    }

    // Droppar-lager (ticker-drivna partiklar). Eget lager så de inte fångar tap.
    this._dropLayer = new Container()
    this._dropLayer.eventMode = 'none'
    this._dropLayer.interactiveChildren = false
    this._round.addChild(this._dropLayer)

    // Vattenkanna (dragbar). Skapas ovanför plantorna och studsar mjukt för att locka.
    this._can = this._makeCan(ctx)
    this._can.position.set(CAN_HOME_X, CAN_HOME_Y)
    this._round.addChild(this._can)
    // Håll dropparna överst (ovanför kannan) så vattnet syns rinna ur pipen.
    this._round.setChildIndex(this._dropLayer, this._round.children.length - 1)

    bounceIn(this._can)
    this._track(this._can)
    this._canBob = gsap.to(this._can, { y: '-=12', duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    ctx.services.voice.say(this._cuePhrase)
  },

  // Bygg en planta (kollapsad) ovanpå ett hål: stjälk + blad + knopp + blomma.
  // Växer kontinuerligt via _renderPlant(grow 0→1).
  _makePlant(h) {
    const node = new Container()
    node.position.set(h.x, h.y - 8)
    node.eventMode = 'none'
    const dark = shade(COLORS.green, 0.22)

    // Fuktig jord: mörk fläck runt basen som växer/mörknar medan man vattnar (bakom allt).
    const damp = new Graphics().ellipse(0, 10, 52, 18).fill(shade(COLORS.brown, 0.42))
    damp.alpha = 0

    const stem = new Graphics().roundRect(-7, -STEM_H, 14, STEM_H + 2, 7).fill(COLORS.green).stroke({ width: 3, color: dark })
    stem.scale.set(1, 0) // växer uppåt (skala y 0→1)

    const leftLeaf = new Graphics().ellipse(0, 0, 26, 12).fill(COLORS.green).stroke({ width: 3, color: dark })
    leftLeaf.rotation = -0.5
    leftLeaf.scale.set(0)
    const rightLeaf = new Graphics().ellipse(0, 0, 26, 12).fill(COLORS.green).stroke({ width: 3, color: dark })
    rightLeaf.rotation = 0.5
    rightLeaf.scale.set(0)

    const bud = new Graphics().circle(0, 0, 20).fill(randomFrom(BUD_COLORS)).stroke({ width: 3, color: dark })
    bud.scale.set(0)

    // Programmatiska kronblad (petals) som vecklar ut sig ett i taget vid blomning.
    // Ellipsen ritas med basen i (0,0) och spetsen uppåt → rotation pekar utåt,
    // scale 0→1 växer ut från blomcentrum.
    const petals = new Container()
    petals.eventMode = 'none'
    const petalColor = randomFrom(PETAL_COLORS)
    const petalDark = shade(petalColor, 0.24)
    const petalN = 5 + ((Math.random() * 3) | 0) // 5–7 kronblad
    for (let i = 0; i < petalN; i++) {
      const pet = new Graphics().ellipse(0, -24, 13, 24).fill(petalColor).stroke({ width: 2, color: petalDark })
      pet.rotation = (i / petalN) * Math.PI * 2
      pet.scale.set(0)
      petals.addChild(pet)
      this._track(pet)
    }

    const flower = new Text({ text: randomFrom(FLOWERS), style: { fontFamily: FONT.body, fontSize: 92, align: 'center' } })
    flower.anchor.set(0.5)
    flower.scale.set(0)

    node.addChild(damp, stem, leftLeaf, rightLeaf, bud, petals, flower)
    this._round.addChild(node)
    this._track(stem)
    this._track(leftLeaf)
    this._track(rightLeaf)
    this._track(bud)
    this._track(flower)
    return { node, damp, stem, leftLeaf, rightLeaf, bud, petals, flower, hy: h.y, x: h.x, flowerY: h.y - 8 - STEM_H, grow: 0, done: false }
  },

  // Rita plantan utifrån dess grow-värde (0→1). Kontinuerligt: stjälk → blad → svällande
  // knopp. Kronbladen/blomman styrs INTE här — de vecklar ut sig i _bloom (klimax).
  _renderPlant(p) {
    const g = p.grow
    // Smoothstep varje delfas så växten skjuter upp organiskt (mjuk start/stopp)
    // i stället för linjärt — knoppen når ändå FULL vid grow=1 (smooth(1)=1).
    const stemFrac = smooth(clamp01(g / 0.5))
    const leafFrac = smooth(clamp01((g - 0.25) / 0.35))
    const budFrac = smooth(clamp01((g - 0.42) / 0.58)) // knoppen sväller till FULL vid grow=1
    const topY = -STEM_H * stemFrac

    p.stem.scale.y = stemFrac

    const midY = topY * 0.55
    p.leftLeaf.y = midY
    p.leftLeaf.x = -4
    p.leftLeaf.scale.set(leafFrac)
    p.rightLeaf.y = midY
    p.rightLeaf.x = 4
    p.rightLeaf.scale.set(leafFrac)

    // Fuktig jord: växer och mörknar med vattnandet.
    p.damp.scale.set(0.5 + g * 0.85)
    p.damp.alpha = Math.min(0.5, g * 0.62)

    // Toppnoderna följer stjälkspetsen.
    p.bud.y = topY
    p.petals.y = topY
    p.flower.y = topY
    if (!p.done) {
      p.bud.alpha = 1
      p.bud.scale.set(budFrac)
    }

    p.flowerY = p.node.y + topY // för gnistror i toppen
  },

  // Vattenkanna ritad programmatiskt (pip + kropp + handtag + stril). Dragbar.
  _makeCan(ctx) {
    const can = new Container()
    const blue = COLORS.blue
    const dark = shade(blue, 0.26)
    const g = new Graphics()

    // pip (rör) ut åt vänster-ned + stril i änden
    g.poly([-40, -8, -98, -28, -108, -12, -50, 20]).fill(blue).stroke({ width: 5, color: dark })
    g.circle(-104, -19, 13).fill(dark)
    // kropp
    g.roundRect(-46, -34, 92, 74, 22).fill(blue).stroke({ width: 5, color: dark })
    // övre kant (öppning)
    g.ellipse(0, -34, 44, 13).fill(shade(blue, 0.08)).stroke({ width: 5, color: dark })
    // glansremsa
    g.roundRect(-34, -20, 22, 42, 11).fill({ color: COLORS.white, alpha: 0.22 })
    can.addChild(g)
    // handtag (båge över toppen)
    const handle = new Graphics()
    handle.moveTo(-26, -30)
    handle.quadraticCurveTo(0, -82, 30, -28)
    handle.stroke({ width: 11, color: dark })
    can.addChild(handle)

    can.hitArea = new Circle(0, 0, 80) // träffyta Ø160 (≥96px)
    can.eventMode = 'static'
    can.cursor = 'pointer'
    can._spout = SPOUT_LOCAL
    can.on('pointerdown', (e) => this._canDown(ctx, e))
    return can
  },

  // Greppa kannan → börja vattna (luta + droppar). Draget följer fingret.
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _canDown(ctx, e) {
    if (!this._alive) return
    // Kannan går inte att använda i fel fas eller under firandet — men ett tryck
    // får aldrig vara stumt (P0 ÅTERKOPPLING).
    if (this._phase !== 'water' || this._resolving) return this._kvitto(ctx, e)
    if (!this._can || this._can.destroyed) return
    this._pouring = true
    this._idle = 0
    this._helpStage = 0 // barnet vattnar själv → nollställ auto-hjälpstrappan
    this._pourAccum = 0
    this._gurgleAccum = 0
    this._canBob?.kill()
    this._canBob = null

    const p = this._round.toLocal(e.global)
    this._can._grabDX = this._can.x - p.x
    this._can._grabDY = this._can.y - p.y
    gsap.killTweensOf(this._can)
    gsap.to(this._can, { rotation: -0.32, duration: 0.18, ease: 'power2.out' })
    ctx.services.audio.sfx('whoosh')
    if (!this._saidWater) {
      this._saidWater = true
      ctx.services.voice.say('Vattna blommorna!')
    }

    this._can._move = (ev) => this._canMove(ev)
    this._can._up = () => this._canUp()
    this._can.on('globalpointermove', this._can._move)
    this._can.on('pointerup', this._can._up)
    this._can.on('pointerupoutside', this._can._up)
  },

  _canMove(e) {
    if (!this._alive || !this._pouring || !this._can || this._can.destroyed) return
    const p = this._round.toLocal(e.global)
    const x = Math.max(150, Math.min(1130, p.x + this._can._grabDX))
    const y = Math.max(120, Math.min(470, p.y + this._can._grabDY)) // håll pipen ovanför jorden
    this._can.x = x
    this._can.y = y
  },

  _canUp() {
    this._pouring = false
    const can = this._can
    if (!can || can.destroyed) return
    if (can._move) can.off('globalpointermove', can._move)
    if (can._up) {
      can.off('pointerup', can._up)
      can.off('pointerupoutside', can._up)
    }
    can._move = can._up = null
    gsap.to(can, { rotation: 0, duration: 0.3, ease: 'power2.inOut' })
  },

  // Pågående vattning (varje tick medan kannan hålls): droppar + väx plantan under pipen.
  _pourTick(ctx, dt) {
    if (!this._can || this._can.destroyed || !this._dropLayer) return
    const sp = this._round.toLocal(this._can.toGlobal(this._can._spout))

    // Spreja droppar i en jämn takt (ticker-drivet, oberoende av FPS).
    this._pourAccum += dt
    while (this._pourAccum >= 45) {
      this._pourAccum -= 45
      this._spawnDrop(sp.x, sp.y)
    }

    // Mjukt porlande vattenljud medan kannan hålls (låg, lätt slumpad ton).
    this._gurgleAccum += dt
    if (this._gurgleAccum >= 190) {
      this._gurgleAccum -= 190
      const wf = 190 + Math.random() * 170
      ctx.services.audio.tone({ freq: wf, dur: 0.17, type: 'sine', vol: 0.06, slideTo: wf * 0.65 })
    }

    // Närmaste ovattnade planta vars hål ligger nedanför pipen.
    let best = null
    let bd = 150
    for (const p of this._plants) {
      if (p.done) continue
      const dx = Math.abs(p.x - sp.x)
      if (p.hy > sp.y && dx < bd) {
        bd = dx
        best = p
      }
    }
    if (best) {
      best.grow = Math.min(1, best.grow + dt / POUR_MS)
      this._renderPlant(best)
      if (best.grow >= 1) this._bloom(ctx, best)
    }
  },

  // En vattendroppe (ticker-driven, exit-säker): ingen gsap, ren positions-integration.
  _spawnDrop(x, y) {
    if (!this._dropLayer || this._dropLayer.destroyed) return
    const d = new Graphics().ellipse(0, 0, 4, 7).fill({ color: DROP_BLUE, alpha: 0.92 })
    d.position.set(x + (Math.random() * 10 - 5), y)
    d.eventMode = 'none'
    this._dropLayer.addChild(d)
    this._drops.push({
      g: d,
      vx: Math.random() * 1.2 - 0.6,
      vy: 1.5 + Math.random() * 1.5,
      gy: 562 + Math.random() * 10,
    })
  },

  // Flytta alla droppar nedåt med "gravitation"; landar de → liten plask + förstör.
  // Exit-säkert: bara levande Pixi-objekt rörs, förstörda droppar släpps tyst.
  _stepDrops(ctx, dt) {
    if (!this._drops.length) return
    const f = dt / 16.667 // normalisera mot 60 fps
    const keep = []
    for (const dr of this._drops) {
      if (dr.g.destroyed) continue
      dr.vy += 0.55 * f
      dr.g.x += dr.vx * f
      dr.g.y += dr.vy * f
      if (dr.g.y >= dr.gy) {
        if (Math.random() < 0.22) puff(ctx.fxLayer, dr.g.x, dr.gy, { count: 2, color: DROP_BLUE })
        dr.g.destroy()
      } else {
        keep.push(dr)
      }
    }
    this._drops = keep
  },

  // En planta är fullvuxen → BLOMNING som ett litet skådespel (spelets klimax):
  // knoppen spricker, kronbladen vecklar ut sig ett i taget (stigande ton), och
  // blomman poppar in med magi-klipp + gnistror + pollen-pluff. Räkna mot firande.
  // Exit/round-säkert: alla objekt är _track:ade (tweens dödas vid clear/destroy);
  // fxLayer-hjälparna (sparkle/puff) är exit-säkra av sig själva.
  _bloom(ctx, p) {
    if (p.done) return
    p.grow = 1
    this._renderPlant(p) // stjälk/blad/knopp/fukt till fullt (done ännu false)
    p.done = true

    // 1) Knoppen spricker: en snabb squash, sedan tonar den bort.
    ctx.services.audio.sfx('pop')
    gsap.killTweensOf(p.bud.scale)
    gsap.to(p.bud.scale, { x: 1.35, y: 0.7, duration: 0.12, ease: 'power2.out' })
    gsap.to(p.bud, { alpha: 0, duration: 0.28, delay: 0.12 })

    // 2) Kronbladen vecklar ut sig ETT i taget, med en stigande liten "pling".
    const petals = p.petals.children
    petals.forEach((pet, i) => {
      gsap.killTweensOf(pet.scale)
      pet.scale.set(0)
      const d = 0.16 + i * 0.09
      gsap.to(pet.scale, { x: 1, y: 1, duration: 0.34, delay: d, ease: 'back.out(2.4)' })
      ctx.services.audio.tone({ freq: 480 + i * 70, dur: 0.13, type: 'sine', vol: 0.13, delay: d })
    })

    // 3) Blomman (ansiktet) poppar in överst + magi-klipp, gnistror och pollen-pluff.
    const faceDelay = 0.16 + petals.length * 0.09 + 0.06
    gsap.killTweensOf(p.flower.scale)
    p.flower.scale.set(0)
    gsap.to(p.flower.scale, {
      x: 1,
      y: 1,
      duration: 0.42,
      delay: faceDelay,
      ease: 'back.out(2.6)',
      onStart: () => {
        if (!this._alive) return
        ctx.services.audio.sfx('magi')
        sparkle(ctx.fxLayer, p.node.x, p.flowerY)
        puff(ctx.fxLayer, p.node.x, p.flowerY, { count: 8, color: POLLEN })
      },
    })

    this._bloomed++
    if (this._bloomed >= this._holeCount) this._finishRound(ctx)
  },

  // Alla blommor ute: fjärilar + delat firande + klistermärke, sedan ny runda.
  // _resolving säkrar att complete() bara körs EN gång per runda.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._phase = 'done'
    this._pouring = false
    this._canBob?.kill()
    this._canBob = null

    this._flyButterflies(ctx, 2 + ((Math.random() * 3) | 0))
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('flowers', (ctx.progress.get().custom?.flowers || 0) + this._holeCount)
    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke
    this._newRoundCall = gsap.delayedCall(1.4, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Mjuk, TRAPPAD auto-hjälp så barnets eget hållande avgör: första idle-stöten
  // vinkar bara kannan + röst (ingen vattning) — barnet får chansen. Först SENARE
  // (stadie ≥2) vattnar vi på riktigt, synligt och uttalat, med en SVAGARE dos.
  // Aldrig ett felsteg — bara en hjälpande hand, och det blir alltid klart.
  _autoHelp(ctx) {
    if (!this._alive || this._phase !== 'water' || this._resolving || this._pouring) return
    let best = null
    for (const p of this._plants) {
      if (p.done) continue
      if (!best || p.grow < best.grow) best = p
    }
    if (!best) return

    this._helpStage = (this._helpStage || 0) + 1

    // Vinka kannan mot plantan och luta den lite (rent visuellt) — i alla stadier.
    if (this._can && !this._can.destroyed) {
      this._canBob?.kill()
      this._canBob = null
      gsap.killTweensOf(this._can)
      gsap.to(this._can, { x: best.x, y: 380, duration: 0.5, ease: 'power2.inOut' })
      gsap.to(this._can, { rotation: -0.28, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }

    // Stadie 1: BARA en vinkande kanna + röst — ge barnet chansen att vattna själv.
    if (this._helpStage < 2) {
      ctx.services.voice.say('Håll kannan över blomman!')
      return
    }

    // Stadie ≥2: nu hjälper vi till på riktigt — synligt och uttalat, men med en
    // svagare dos än förr (0.16) så barnets eget hållande fortfarande avgör mest.
    ctx.services.voice.say('Jag hjälper till lite!')
    for (let i = 0; i < 6; i++) this._spawnDrop(best.x + (Math.random() * 30 - 15), 400)
    ctx.services.audio.sfx('whoosh')
    best.grow = Math.min(1, best.grow + 0.16)
    this._renderPlant(best)
    if (best.grow >= 1) this._bloom(ctx, best)
  },

  // Fjärilar som fladdrar in i fxLayer (exit-säkert: proxy + kopiera bara om levande).
  _flyButterflies(ctx, n) {
    for (let i = 0; i < n; i++) {
      // Ritad fjäril (var 🦋): fyra vingar, kropp och antenner.
      const b = new Graphics()
      const wing = [0xa78bfa, 0xf7b9e4, 0x6ad0ff, 0xffd35c][i % 4]
      b.ellipse(-13, -8, 13, 15).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.ellipse(13, -8, 13, 15).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.ellipse(-11, 9, 10, 11).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.ellipse(11, 9, 10, 11).fill(wing).stroke({ width: 2.5, color: 0x6b4fc4 })
      b.roundRect(-3, -14, 6, 30, 3).fill(0x4a3728)
      b.moveTo(-2, -14).quadraticCurveTo(-8, -24, -12, -22).stroke({ width: 2, color: 0x4a3728 })
      b.moveTo(2, -14).quadraticCurveTo(8, -24, 12, -22).stroke({ width: 2, color: 0x4a3728 })
      b.eventMode = 'none'
      const startX = 180 + Math.random() * 220
      const baseY = 300 + Math.random() * 150
      const endX = startX + 480 + Math.random() * 320
      const amp = 38 + Math.random() * 34
      b.position.set(startX, baseY)
      ctx.fxLayer.addChild(b)
      const st = { p: 0 }
      const tw = gsap.to(st, {
        p: 1,
        duration: 2.6 + Math.random() * 0.8,
        delay: i * 0.12,
        ease: 'none',
        onUpdate: () => {
          if (b.destroyed) {
            tw.kill()
            return
          }
          b.x = startX + (endX - startX) * st.p
          b.y = baseY + Math.sin(st.p * Math.PI * 4) * amp
          b.alpha = st.p > 0.8 ? (1 - st.p) / 0.2 : 1
        },
        onComplete: () => {
          if (!b.destroyed) b.destroy()
        },
      })
    }
  },

  // Per-frame: flytta droppar; vattna medan kannan hålls; annars räkna idle → auto-hjälp/recue.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS
    this._stepDrops(ctx, dt)
    this._stepWorms(dt / 1000)

    if (this._phase === 'water') {
      if (this._pouring) {
        this._idle = 0
        this._pourTick(ctx, dt)
      } else {
        this._idle += dt / 1000
        if (this._idle > 9) {
          // Högre tröskel (9s) så barnet hinner engagera sig innan hjälpen vinkar.
          this._idle = 0
          this._autoHelp(ctx)
        }
      }
    } else if (this._phase === 'sow') {
      this._idle += dt / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this._cuePhrase)
        const live = this._drag.items.find((r) => !r.placed && !r.view.destroyed)
        if (live) wiggle(live.view)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    this._pouring = false
    ctx.ticker.remove(this._tick)
    this._newRoundCall?.kill()
    this._canBob?.kill()
    this._drag?.destroy()
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._drops = []
    this._plants = []
    this._worms = []
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
