// Pruttbubbelbad — fnitter-fysik (2–4 år). Zacke sitter i ett skummande bubbelbad;
// barnet trycker (eller HÅLLER) på hans mage → PRRRT! En luftbubbla föds vid
// tryckpunkten och stiger gungande genom vattnet, vobblar i sidled och POPPAR vid
// ytan med ett fniss + skumplask. Ju längre man håller, desto större bubbla
// (stiger snabbare, poppar högre, mer skum). En gul gummianka man kan DRA gör att
// bubblorna studsar åt nya håll. Mål: poppa bubblor tills skummet fyller badet upp
// till den prickade skumlinjen → firande + nytt, lite högre mål (oändlig lek).
//
// No-fail betyder att INGET straffar barnet — inte att badet fyller sig självt.
// Tomma tryck finns inte (vatten ger plopp+ring, magen ger alltid en bubbla) och
// skummet växer monotont, men skum kommer ENDAST från bubblor barnet skapat.
// Vid idle BJUDER Zacke in (prutt, min, pekande hand, upprepad röst) — han spelar
// aldrig åt barnet. Anti-stuck-vakten lossar bara barnets egna fastnade bubblor.
//
// Bubblorna är vanliga Pixi-objekt som ENDAST rörs av ticker-integratorn (ingen matter.js,
// ingen GSAP på bubbel-objekt) → exit-säkra utan extra skydd. Partiklar/plask går via
// lib/feedback.js (redan exit-säkra). GSAP rör endast Zacke/anka/skum + {}-proxies.
import { Container, Graphics, Circle, Rectangle, FillGradient } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { puff, sparkle, ripple, floatText, pop, wiggle, bigCelebration, breathe , kvittera} from '../../lib/feedback.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// DJUP I VATTNET. `_plattprobe --medbakgrund` mätte badvattnet till 270 576 px — 29 % av
// skärmen — i EN ton. Vatten är ljusare vid ytan och mörknar nedåt, och det gick inte att
// lösa med `verticalFill`: vattnet ritas med `alpha` (Zacke och ankan ska synas nedsänkta),
// och alpha går inte att kombinera med en gradientfyllning. Lösningen ligger i STOPPEN —
// `addColorStop` kör dem genom `Color.toHexa()`, så '#rrggbbaa' är ett giltigt stopp och
// toningen kan bära genomskinligheten själv. Cachad per badsort (5 st), så en omritning
// vid badbyte bakar noll nya texturer.
const _djupCache = new Map()
function djupFill(color, a0 = 0x22, a1 = 0x74) {
  const key = `${color}|${a0}|${a1}`
  let g = _djupCache.get(key)
  if (g) return g
  const hex = `#${color.toString(16).padStart(6, '0')}`
  const aa = (a) => a.toString(16).padStart(2, '0')
  g = new FillGradient({ colorStops: [{ offset: 0, color: `${hex}${aa(a0)}` }, { offset: 1, color: `${hex}${aa(a1)}` }] })
  _djupCache.set(key, g)
  return g
}

// arc() i en Graphics som redan har former fortsätter den AKTUELLA vägen — utan ett
// moveTo till bågens startpunkt ritas ett streck från förra formen till bågen.
const arcPath = (g, cx, cy, r, a0, a1) => g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1)

// ---- Geometri (designkoordinater) ---------------------------------------
const SURFACE_Y = 330 // vattenytan = pop-linje + lyftkraftens nollinje
const WALL_L = 230 // logiska väggar (bubbel-studs)
const WALL_R = 1050
const FLOOR = 650
const ZACKE_X = 430
const ZACKE_Y = SURFACE_Y // Zackes origo ligger i vattenytan → magen hamnar i vattenbrynet
const DUCK_R = 66 // ankans kollisionsradie
const DUCK_HOME = { x: 780, y: 430 }
const SPOUT = { x: 970, y: 248 } // kranens pip — droppen faller härifrån

// ---- Bubblor -------------------------------------------------------------
const BASE = 40 // ritradie; view.scale = r / BASE
const R_MIN = 28 // snabbt tap ger ändå en rolig bubbla
const R_MAX = 70
const FOAM_K = 0.9 // skum-tillskott per pop = r * FOAM_K
const MAX_V = 14 // hastighetstak — inget kan skjuta ur karet

// ---- Zacke (ritad karaktär, inte en boll) --------------------------------
// Badsorter — en per runda, cyklade på nivån. Rundorna såg tidigare IDENTISKA ut (bara
// mållinjen flyttades och bubblorna blev några px större), vilket var precis det kritikern
// underkände: "variation" och "mjuk progression" delvis uppfyllda så länge rundorna ser lika
// ut. Nu byter vattnet, toningen och skummet färg — skillnaden syns på en halv sekund.
const BATHS = [
  { id: 'bubbel', water: COLORS.blue, tint: 0x4aa3df, foam: 0xffffff, say: 'Vanligt bubbelbad!' },
  { id: 'jordgubb', water: 0xff7ba5, tint: 0xe0518a, foam: 0xffe6f0, say: 'Jordgubbsbad!' },
  { id: 'blabar', water: 0x8f80e6, tint: 0x6f5fd0, foam: 0xeae4ff, say: 'Blåbärsbad!' },
  { id: 'citron', water: 0xf5c542, tint: 0xdfa81b, foam: 0xfff7db, say: 'Citronbad!' },
  { id: 'mint', water: 0x4fd6b8, tint: 0x2fbfa0, foam: 0xe0fbf4, say: 'Mintbad!' },
]

const TREASURES = [
  { id: 'boat', say: 'Titta, en båt!' },
  { id: 'star', say: 'En stjärna i skummet!' },
  { id: 'fish', say: 'En liten fisk!' },
  { id: 'ball', say: 'En badboll!' },
  { id: 'crab', say: 'En krabba!' },
]

const SKIN = 0xffe0bd
const SKIN_DARK = 0xefc79c
const SKIN_OUT = 0xd79f6a // egen kontur — hud mot vitt porslin/skum är annars nästan osynlig
const HAIR = 0x7a4a25

export default {
  id: 'pruttbad',
  titleSv: 'Pruttbubbelbad',
  icon: '🛁',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'pruttbad',
  voiceIntro: 'Tryck på Zackes mage så bubblar det! Fyll badet med skum ända upp till linjen.',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._ctx = ctx // _drawFoam saknar ctx men behöver den för fyndets ljud/röst
    this._bubbles = []
    this._foam = { level: 0 }
    this._held = false
    this._charging = null
    this._resolving = false
    this._idle = 0
    this._sinceFoam = 0 // anti-stuck-vakt: sekunder sedan skummet senast växte
    this._firstPrutt = false
    this._tweens = [] // fynd-tweens (bl.a. en repeat:-1-gungning som MÅSTE dödas)
    this._treasure = null
    this._treasureBob = null
    this._touched = false // har barnet rört spelet? styr inbjudande handen
    this._duckPhase = 0
    this._duckActive = false
    this._duckMoved = false
    this._duckSelected = false
    this._duckBase = { x: DUCK_HOME.x, y: DUCK_HOME.y }
    this._foamPhase = 0
    this._foamAcc = 0
    this._drip = { y: SPOUT.y, wait: 1.2 }
    this._mood = 'glad'
    this._moodHold = 0
    this._lastSfx = {} // per-ljud strypning (min-intervall) → aldrig sfx varje tick

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._applyLevel()

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn) — mjuk badrums-gradient under kaklet.
    const scene = createScene('water', { ground: false })
    this._root.addChild(scene)

    // Z-ordning: badrum → kar+vatten → mållinje → vatten-träffyta → Zacke → anka →
    // vattentoning → bubblor → skum → kar-kant (framför alla) → mätare.
    // Mållinjen ligger BAKOM Zacke (annars ritas en prickrad tvärs över hans ansikte)
    // och kar-kanten ligger FRAMFÖR honom (då sitter han i karet, inte på det).
    this._buildBathroom()
    this._buildTub()
    this._buildGoal()
    this._buildWaterTap(ctx)
    this._buildZacke(ctx)
    this._buildTint()
    this._buildDuck(ctx) // ovanför toningen: en badanka MÅSTE läsas som gul, inte olivgrön
    this._buildBubbleLayer()
    this._buildFoam()
    // Fynd-lagret ligger FRAMFÖR skummet: leksaken ska se ut att lyftas upp av skummet.
    this._treasureLayer = new Container()
    this._treasureLayer.eventMode = 'none'
    this._treasureLayer.interactiveChildren = false
    this._root.addChild(this._treasureLayer)
    this._placeTreasure()
    this._buildTubRim()
    this._buildHint()
    this._buildProgress()

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivå-skalning ------------------------------------------------------

  _applyLevel() {
    this._bathNow = BATHS[Math.abs(this._level | 0) % BATHS.length]
    this._goalFoam = 70 + this._level * 18
    // Linjen får inte krypa upp i kar-kanten. Skummet ritas i ANDEL av vägen hit
    // (se _drawFoam), så mätaren och skummet når linjen exakt samtidigt — förr
    // bottnade linjen på hög nivå medan _goalFoam fortsatte växa, och då såg badet
    // fullt ut långt innan det var klart.
    this._goalY = clamp(SURFACE_Y - this._goalFoam, 248, SURFACE_Y - 40)
    this._levelBoost = Math.min(this._level * 4, 20) // större standardbubblor på högre nivå
    this._drawTub(this._tubGfx)
    this._drawTint(this._tintGfx)
    this._placeTreasure()
  },

  // ---- Gömt fynd i skummet ------------------------------------------------
  // En badleksak ligger gömd i skummet. När skummet stigit förbi den dyker den upp med
  // gnistor och flyter kvar resten av rundan. Leksakssorten cyklar per nivå, så varje
  // runda har NÅGOT NYTT att upptäcka — det var den andra halvan av kritikerns invändning
  // (rundorna såg likadana ut OCH hade inget nytt i sig).
  _placeTreasure() {
    // Döda gungningen FÖRE vyn rivs — annars skriver den .y på ett förstört objekt.
    this._treasureBob?.kill()
    this._treasureBob = null
    if (this._treasure?.view && !this._treasure.view.destroyed) this._treasure.view.destroy()
    if (!this._treasureLayer || this._treasureLayer.destroyed) return
    const kind = TREASURES[Math.abs(this._level | 0) % TREASURES.length]
    const view = makeTreasure(kind.id)
    // Mellan 35 % och 80 % av vägen upp → alltid efter en stunds spelande, aldrig sist.
    const f = 0.35 + Math.random() * 0.45
    const y = SURFACE_Y - (SURFACE_Y - this._goalY) * f
    // Hoppa över ett band kring Zacke (ZACKE_X 430) — annars ritas leksaken rakt ovanpå
    // honom i stället för bredvid i skummet i ungefär var femte runda.
    const x = Math.random() < 0.35 ? 250 + Math.random() * 90 : 545 + Math.random() * 480
    view.position.set(x, y)
    view.visible = false
    view.eventMode = 'none'
    this._treasureLayer.addChild(view)
    // `armed` först när skummet setts UNDER fyndet. Utan den triggades nästa rundas fynd
    // direkt av FÖRRA rundans överskottsskum: _onComplete pumpar in en pruttsvärm som driver
    // _foam.level långt förbi målet, och _newRound placerar det nya fyndet innan drän-tweenen
    // hunnit tömma skummet — leksaken avslöjade sig själv i ett tomt kar. Att kräva "först
    // under, sedan över" är oberoende av tajmingen mellan _resolving, tweens och nivåbytet.
    this._treasure = { view, y, kind, found: false, armed: false }
  },

  _checkTreasure(ctx, foamTop) {
    const t = this._treasure
    if (!t || t.found || !t.view || t.view.destroyed) return
    if (foamTop > t.y) {
      t.armed = true // skummet ligger under fyndet — nu räknas en stigning förbi det
      return
    }
    if (!t.armed) return
    t.found = true
    t.view.visible = true
    t.view.scale.set(0.3)
    const tw = gsap.to(t.view.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(2.2)' })
    this._tweens?.push(tw)
    sparkle(ctx.fxLayer, t.view.x, t.view.y, { count: 12 })
    puff(ctx.fxLayer, t.view.x, t.view.y, { count: 8 })
    this._sound(ctx, null, 'reveal', 'reveal', 0)
    ctx.services.voice.say(t.kind.say)
    const bob = gsap.to(t.view, { y: t.view.y - 10, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._tweens?.push(bob)
    this._treasureBob = bob
  },

  // ---- Ljud med min-intervall (anti-distorsion) ---------------------------
  // Strypt per nyckel så att tick-/kontakt-ljud (pop, studs) ALDRIG kan staplas
  // 60 ggr/s till klippning/distorsion. sample-klipp först, annars syntes-fallback.
  _sound(ctx, sampleKey, fallback, key = sampleKey || fallback, minMs = 120) {
    if (!this._alive) return
    const now = performance.now()
    const last = this._lastSfx[key] || 0
    if (now - last < minMs) return
    this._lastSfx[key] = now
    const a = ctx?.services?.audio
    if (!a) return
    if (!sampleKey || !a.sample(sampleKey)) a.sfx(fallback)
  },

  // ---- Scenbyggen ---------------------------------------------------------

  // Kaklat badrum: kakelvägg, golv, hylla med badgrejer, handduk och en kran
  // som droppar ner i badet. Scenen ska kännas som ett rum, inte en gradient.
  _buildBathroom() {
    const g = new Graphics()

    // Kakelvägg — förskjutna rader, mjuka fogar (gradienten lyser svagt igenom).
    const TILE = 82
    for (let row = -2; row * TILE < 660; row++) {
      const ty = row * TILE
      const off = (row & 1) * (TILE / 2)
      for (let col = -1; col * TILE + off < 1300; col++) {
        const tx = col * TILE + off
        g.roundRect(tx + 3, ty + 3, TILE - 6, TILE - 6, 10).fill({ color: 0xeaf6fb, alpha: 0.9 })
      }
    }

    // Golv.
    g.rect(0, 622, 1280, 98).fill(0xdfe7ea)
    g.rect(0, 622, 1280, 9).fill(0xc4d5dc)
    for (let x = 40; x < 1280; x += 128) g.rect(x, 631, 5, 89).fill({ color: 0xc4d5dc, alpha: 0.7 })

    // Hylla ovanför karet (fri från Zackes hår och mållinjens flagga).
    g.roundRect(560, 150, 262, 15, 7).fill(0xe8d3b0).stroke({ width: 3, color: 0xc9ac82 })
    // Schampoflaska.
    g.roundRect(584, 96, 42, 54, 13).fill(COLORS.purple).stroke({ width: 3, color: 0x8b6fe0 })
    g.roundRect(596, 82, 18, 16, 6).fill(0x8b6fe0)
    g.roundRect(592, 112, 26, 20, 6).fill({ color: 0xffffff, alpha: 0.75 })
    // Tvål med skumglans.
    g.roundRect(648, 120, 56, 30, 14).fill(0xfff3c4).stroke({ width: 3, color: 0xe2cf8e })
    g.ellipse(666, 130, 12, 6).fill({ color: 0xffffff, alpha: 0.8 })
    // Leksaksbåt.
    g.moveTo(730, 150).lineTo(806, 150).lineTo(794, 126).lineTo(742, 126).closePath().fill(COLORS.red).stroke({ width: 3, color: 0xd8504f })
    g.roundRect(764, 84, 5, 42, 2).fill(0x9a7a55)
    g.moveTo(769, 86).lineTo(800, 112).lineTo(769, 122).closePath().fill(COLORS.white).stroke({ width: 3, color: 0xd3dde2 })

    // Handduk på stång (fyller den tomma vänsterväggen).
    g.roundRect(46, 150, 128, 13, 6).fill(0xc9d6dd).stroke({ width: 3, color: 0xa2b4bd })
    g.circle(48, 156, 8).fill(0xa2b4bd)
    g.circle(172, 156, 8).fill(0xa2b4bd)
    g.roundRect(56, 158, 108, 214, 20).fill(0xffd9e6).stroke({ width: 4, color: 0xf0adc8 })
    g.roundRect(80, 164, 9, 200, 4).fill({ color: 0xf0adc8, alpha: 0.55 })
    g.roundRect(112, 164, 9, 200, 4).fill({ color: 0xf0adc8, alpha: 0.55 })
    g.roundRect(64, 348, 92, 16, 8).fill({ color: 0xf0adc8, alpha: 0.45 })

    // Kran över badet — pip pekar ner i vattnet (droppen ritas separat).
    g.roundRect(880, 184, 36, 36, 11).fill(0xc9d6dd).stroke({ width: 3, color: 0x9fb2bb })
    g.roundRect(898, 194, 88, 17, 8).fill(0xe4edf1).stroke({ width: 3, color: 0xb4c4cc })
    g.roundRect(962, 202, 17, 46, 8).fill(0xe4edf1).stroke({ width: 3, color: 0xb4c4cc })
    g.circle(898, 176, 16).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.circle(898, 176, 6).fill({ color: 0xffffff, alpha: 0.6 })

    g.eventMode = 'none'
    this._root.addChild(g)

    this._dripGfx = new Graphics()
    this._dripGfx.eventMode = 'none'
    this._root.addChild(this._dripGfx)
  },

  // Badsorten läses ur ett LAGRAT värde, inte ur this._level direkt. _level ökar i samma
  // stund rundan klaras, men karet målas om först 1,5 s senare i _newRound — läste skummet
  // nivån live blev det rosa skum över blått vatten under hela firandet. Nu byter allt
  // samtidigt, i _applyLevel.
  _bath() {
    return this._bathNow || BATHS[0]
  },

  _buildTub() {
    const g = new Graphics()
    this._tubGfx = g
    this._drawTub(g)
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  // Bryts ut ur _buildTub så badet kan MÅLAS OM när nivån byts (badsorten cyklar).
  _drawTub(g) {
    if (!g || g.destroyed) return
    g.clear()
    // Porslinskar (kropp + fötter).
    g.roundRect(150, 596, 44, 74, 16).fill(0xdfe7ea).stroke({ width: 5, color: 0xb9cbd2 })
    g.roundRect(1086, 596, 44, 74, 16).fill(0xdfe7ea).stroke({ width: 5, color: 0xb9cbd2 })
    g.roundRect(170, 250, 940, 430, 90).fill(COLORS.white)
    // Innerskål i svag blåton. Utan den ritas VITT skum mot VITT porslin och blir
    // praktiskt taget osynligt — bara skummets bubbeltoppar syntes.
    g.roundRect(194, 256, 892, 420, 68).fill(0xdaeaf3)
    // Vatten — badsortens färg.
    // Vattnet bär sitt djup i toningens STOPP (se djupFill) — ljusare vid ytan, mörkare
    // mot botten, med samma genomskinlighet som den gamla platta alpha 0.5 i mitten.
    g.roundRect(200, SURFACE_Y, 880, 340, 60).fill(djupFill(this._bath().water, 0x4d, 0x9e))
  },

  // Vattentoning över allt som är UNDER ytan → Zackes kropp och ankan ser
  // nedsänkta ut, medan huvudet ovanför ytan förblir skarpt.
  _buildTint() {
    const g = new Graphics()
    this._tintGfx = g
    this._drawTint(g)
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _drawTint(g) {
    if (!g || g.destroyed) return
    g.clear()
    g.roundRect(200, SURFACE_Y, 880, 340, 60).fill({ color: this._bath().tint, alpha: 0.28 })
    g.roundRect(200, SURFACE_Y, 880, 7, 4).fill({ color: 0xffffff, alpha: 0.3 }) // ytlinje (mjuk, inte en vit hylla)
  },

  // Kar-kanten ritas SIST av kar-delarna, framför Zacke och skummet: då sitter han
  // i karet och skummet kan inte rinna ut över kanten visuellt.
  _buildTubRim() {
    const g = new Graphics()
    g.roundRect(170, 250, 940, 430, 90).stroke({ width: 13, color: COLORS.teal })
    g.roundRect(186, 245, 908, 8, 4).fill({ color: 0xffffff, alpha: 0.55 }) // kant-glans (ovanför mållinjen)
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildBubbleLayer() {
    this._bubbleLayer = new Container()
    this._bubbleLayer.eventMode = 'passive' // 'none' skär bort hela subträdet från händelser
    this._root.addChild(this._bubbleLayer)
  },

  _buildGoal() {
    this._goalGfx = new Graphics()
    this._goalGfx.eventMode = 'none'
    this._root.addChild(this._goalGfx)

    // Ritad målflagga (rutig duk på stång) i stället för en 🏁-emoji.
    const flag = new Container()
    const f = new Graphics()
    f.roundRect(-3, -56, 6, 62, 3).fill(0xb9832f) // stång
    const CS = 11
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const dark = (r + c) % 2 === 0
        f.rect(3 + c * CS, -54 + r * CS, CS, CS).fill(dark ? COLORS.ink : COLORS.white)
      }
    }
    f.rect(3, -54, 4 * CS, 3 * CS).stroke({ width: 2.5, color: COLORS.ink, alpha: 0.55 })
    f.circle(0, -58, 5).fill(COLORS.orange)
    f.eventMode = 'none'
    flag.addChild(f)
    flag.eventMode = 'none'
    this._goalMarker = flag
    this._root.addChild(flag)

    this._drawGoal()
    this._goalPulse = breathe(this._goalMarker, { scale: 1.16, duration: 1 }) // drar blicken till mållinjen
  },

  _drawGoal() {
    const g = this._goalGfx
    if (!g || g.destroyed) return
    g.clear()
    // Tydlig prickad mållinje "fyll skummet hit" — mörk kärna så den syns mot porslinet.
    for (let x = 240; x <= 1006; x += 30) {
      g.circle(x, this._goalY, 7).fill({ color: COLORS.teal, alpha: 0.85 })
      g.circle(x, this._goalY, 4).fill({ color: COLORS.white, alpha: 0.95 })
    }
    if (this._goalMarker && !this._goalMarker.destroyed) this._goalMarker.position.set(1042, this._goalY)
  },

  // Skum-mätare till höger om karet: en tydlig "hur full är jag"-stapel utan läsning.
  // Stjärnan i toppen = målet; den vita fyllningen stiger mot den när skummet växer.
  _buildProgress() {
    this._progGfx = new Graphics()
    this._progGfx.eventMode = 'none'
    this._root.addChild(this._progGfx)

    // Ritad stjärna i stället för ⭐-emoji.
    const s = new Graphics()
    s.star(0, 0, 5, 25, 12).fill(COLORS.yellow).stroke({ width: 4, color: 0xe0a92c })
    s.star(0, -3, 5, 12, 6).fill({ color: 0xfff0b8, alpha: 0.85 })
    s.eventMode = 'none'
    s.position.set(1164, 230)
    this._progStar = s
    this._root.addChild(s)

    this._drawProgress()
  },

  _drawProgress() {
    const g = this._progGfx
    if (!g || g.destroyed) return
    const X = 1146,
      W = 36,
      TOP = 262,
      BOT = 604,
      H = BOT - TOP
    g.clear()
    g.roundRect(X, TOP, W, H, 18).fill({ color: COLORS.white, alpha: 0.55 }).stroke({ width: 5, color: COLORS.teal, alpha: 0.7 })
    const frac = clamp((this._foam.level || 0) / (this._goalFoam || 1), 0, 1)
    const fh = H * frac
    if (fh > 3) {
      g.roundRect(X + 4, BOT - fh, W - 8, fh, 12).fill({ color: 0xffffff, alpha: 0.97 })
      g.circle(X + W / 2, BOT - fh, 12).fill({ color: 0xffffff, alpha: 0.99 }) // bubblig topp
      g.circle(X + W / 2 - 7, BOT - fh - 6, 6).fill({ color: 0xffffff, alpha: 0.9 })
    }
  },

  _buildFoam() {
    this._foamGfx = new Graphics()
    this._foamGfx.eventMode = 'none'
    this._root.addChild(this._foamGfx)
    this._drawFoam()
  },

  // Skummet JÄSER: ytan är en rad överlappande bubbeltoppar vars radier andas med
  // _foamPhase, plus mikrobubblor som poppar upp i kroppen. Aldrig en vit klump.
  _drawFoam() {
    this._drawProgress()
    const g = this._foamGfx
    if (!g || g.destroyed) return
    g.clear()
    if (this._foam.level <= 0) return
    // Andel av vägen till linjen — samma tal som mätaren visar. CROWN är hur högt
    // bubbeltopparna sticker upp över skumkroppen; dras av här så att KRONAN (det
    // öga faktiskt läser som "skummets höjd") möter linjen exakt när mätaren är full.
    const CROWN = 20
    const frac = clamp(this._foam.level / (this._goalFoam || 1), 0, 1)
    const top = SURFACE_Y - (SURFACE_Y - this._goalY - CROWN) * frac
    // Har skummet stigit förbi det gömda fyndet? Då dyker det upp.
    if (this._ctx) this._checkTreasure(this._ctx, top)
    const ph = this._foamPhase

    // Skumkropp.
    g.roundRect(208, top, 864, SURFACE_Y - top + 30, 26).fill({ color: this._bath().foam, alpha: 0.88 })
    // Jäsande toppar (håller sig innanför kar-kanten även när badet är fullt).
    for (let i = 0; i * 42 <= 836; i++) {
      const x = 232 + i * 42
      const r = 20 + Math.sin(ph * 1.6 + i * 0.9) * 5
      g.circle(x, top + 8 + Math.sin(ph + i * 0.55) * 3, r).fill({ color: this._bath().foam, alpha: 0.94 })
    }
    // Mikrobubblor inuti skummet.
    const depth = SURFACE_Y - top + 24
    for (let i = 0; i < 16; i++) {
      const x = 240 + ((i * 337) % 800)
      const t = (ph * 0.5 + i * 0.37) % 1
      const y = top + 12 + t * depth
      if (y > SURFACE_Y + 26) continue
      g.circle(x, y, 3.5 + (i % 3)).fill({ color: 0xd8f0fa, alpha: 0.55 * (1 - t) + 0.2 })
    }
  },

  // Osynlig träffzon över vattnet — alltid kul plopp (ligger UNDER Zacke/anka i z).
  _buildWaterTap(ctx) {
    const area = new Container()
    area.hitArea = new Rectangle(200, SURFACE_Y, 880, FLOOR - SURFACE_Y + 20)
    area.eventMode = 'static'
    this._waterTapHandler = (e) => this._waterTap(ctx, e)
    area.on('pointertap', this._waterTapHandler)
    this._waterArea = area
    this._root.addChild(area)
  },

  // ---- Zacke: en riktig unge i badet, inte en orange boll -----------------

  _buildZacke(ctx) {
    const z = new Container()
    z.position.set(ZACKE_X, ZACKE_Y)

    const b = new Graphics()
    const OUT = SKIN_OUT
    // Kropp.
    b.roundRect(-64, -78, 128, 168, 46).fill(SKIN).stroke({ width: 5, color: OUT })
    // Mage-glans = "tryck här" (liten och mjuk; en stor ljus fläck blekte ut hela kroppen).
    b.circle(0, 10, 38).fill({ color: 0xfff3e2, alpha: 0.5 })
    b.circle(-15, -2, 14).fill({ color: 0xffffff, alpha: 0.4 })
    // Navel.
    b.circle(0, 24, 7).fill({ color: OUT, alpha: 0.95 })
    // Hals.
    b.roundRect(-21, -104, 42, 40, 15).fill(SKIN_DARK)
    // Öron (bakom huvudet).
    b.circle(-54, -134, 15).fill(SKIN).stroke({ width: 4, color: OUT })
    b.circle(54, -134, 15).fill(SKIN).stroke({ width: 4, color: OUT })
    // Huvud.
    b.circle(0, -140, 54).fill(SKIN).stroke({ width: 5, color: OUT })
    z.addChild(b)

    // Armar FRAMFÖR kroppen (bakom den syntes bara händerna som två nubbar) — egna
    // containrar med axeln som pivot så de kan plaska.
    this._armL = this._makeArm(1)
    this._armL.position.set(-52, -50)
    this._armL.rotation = 0.5
    this._armR = this._makeArm(-1)
    this._armR.position.set(52, -50)
    this._armR.rotation = -0.5
    z.addChild(this._armL, this._armR)

    // Ansikte (egen Graphics — ritas om per min).
    const face = new Graphics()
    face.eventMode = 'none'
    z.addChild(face)
    this._face = face

    // Vått, tofsigt hår. Kalotten följer SKALLEN (en ellips-kalott lägger sig antingen
    // över ögonen eller lämnar tinningarna kala) och luggen slutar en bit ovanför dem.
    const h = new Graphics()
    arcPath(h, 0, -140, 57, 2.79, 6.63)
      .quadraticCurveTo(30, -152, 6, -172)
      .quadraticCurveTo(-18, -152, -52, -121)
      .closePath()
      .fill(HAIR)
    h.moveTo(-30, -186).quadraticCurveTo(-30, -222, -4, -200).closePath().fill(HAIR)
    h.moveTo(-2, -196).quadraticCurveTo(14, -226, 32, -192).closePath().fill(HAIR)
    h.moveTo(26, -190).quadraticCurveTo(52, -206, 50, -176).closePath().fill(HAIR)
    h.moveTo(-50, -176).quadraticCurveTo(-56, -202, -32, -190).closePath().fill(HAIR)
    h.ellipse(-16, -180, 16, 7).fill({ color: 0xffffff, alpha: 0.25 }) // blöt glans
    h.eventMode = 'none'
    z.addChild(h)

    // Skum-skägg (visas när badet nästan är fullt).
    const beard = new Graphics()
    beard.circle(-36, -94, 17).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(-13, -85, 20).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(13, -85, 20).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(36, -94, 17).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(0, -72, 16).fill({ color: 0xffffff, alpha: 0.95 })
    beard.eventMode = 'none'
    beard.visible = false
    this._beard = beard
    z.addChild(beard)

    this._drawFace('glad')

    z.eventMode = 'static'
    z.cursor = 'pointer'
    z.hitArea = new Circle(0, -20, 96) // träffyta-diameter 192px ≫ 96px
    this._zackeDown = (e) => this._zackePointerDown(ctx, e)
    this._zackeUp = () => this._releaseBubble(ctx)
    z.on('pointerdown', this._zackeDown)
    z.on('pointerup', this._zackeUp)
    z.on('pointerupoutside', this._zackeUp)
    this._zacke = z
    this._root.addChild(z)
  },

  _makeArm(side) {
    const c = new Container()
    const g = new Graphics()
    // Samma konturstyrka som kroppen — en ljusare stroke här gjorde att armarna
    // smälte ihop med torson till en enda blek klump under vattentoningen.
    g.roundRect(-12, -12, 24, 78, 12).fill(SKIN).stroke({ width: 5, color: SKIN_OUT })
    g.circle(0, 72, 16).fill(SKIN).stroke({ width: 5, color: SKIN_OUT })
    g.circle(side * 4, 70, 5).fill({ color: SKIN_OUT, alpha: 0.6 })
    g.eventMode = 'none'
    c.addChild(g)
    c.eventMode = 'none'
    return c
  },

  // Fyra riktiga miner: glad (vila) · fniss (pop) · wow (jättebubbla) · jubel (fullt bad).
  _drawFace(mood) {
    const g = this._face
    if (!g || g.destroyed) return
    this._mood = mood
    const ink = COLORS.ink
    const cheek = { color: 0xffb0b0, alpha: 0.65 }
    const HY = -140 // huvudets centrum
    g.clear()

    if (mood === 'wow') {
      g.circle(-21, HY - 2, 11).fill(COLORS.white).circle(21, HY - 2, 11).fill(COLORS.white)
      g.circle(-21, HY - 2, 6).fill(ink).circle(21, HY - 2, 6).fill(ink)
      g.circle(-37, HY + 14, 11).fill(cheek).circle(37, HY + 14, 11).fill(cheek)
      g.ellipse(0, HY + 22, 11, 14).fill(0x9a5b3b)
      return
    }

    if (mood === 'jubel') {
      arcPath(g, -21, HY, 10, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      arcPath(g, 21, HY, 10, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      g.circle(-38, HY + 14, 12).fill(cheek).circle(38, HY + 14, 12).fill(cheek)
      g.moveTo(-22, HY + 12).quadraticCurveTo(0, HY + 40, 22, HY + 12).closePath().fill(0x9a5b3b)
      g.moveTo(-11, HY + 26).quadraticCurveTo(0, HY + 36, 11, HY + 26).closePath().fill(COLORS.pink)
      return
    }

    if (mood === 'fniss') {
      arcPath(g, -21, HY, 9, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      arcPath(g, 21, HY, 9, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      g.circle(-38, HY + 14, 12).fill(cheek).circle(38, HY + 14, 12).fill(cheek)
      g.moveTo(-17, HY + 14).quadraticCurveTo(0, HY + 34, 17, HY + 14).closePath().fill(0x9a5b3b)
      return
    }

    // glad (vila)
    g.circle(-21, HY - 2, 10).fill(COLORS.white).circle(21, HY - 2, 10).fill(COLORS.white)
    g.circle(-20, HY, 6).fill(ink).circle(22, HY, 6).fill(ink)
    g.circle(-23, HY - 4, 3).fill(COLORS.white).circle(19, HY - 4, 3).fill(COLORS.white)
    g.circle(-37, HY + 14, 11).fill(cheek).circle(37, HY + 14, 11).fill(cheek)
    arcPath(g, 0, HY + 10, 19, 0.16 * Math.PI, 0.84 * Math.PI).stroke({ width: 6, color: ink, cap: 'round' })
  },

  // Sätt min i N sekunder, återgå sedan till glad (tickern räknar ner).
  _setMood(mood, hold = 1.1) {
    if (!this._alive) return
    this._drawFace(mood)
    this._moodHold = hold
  },

  // ---- Inbjudande hand (visas vid idle, försvinner vid första trycket) ----

  _buildHint() {
    const c = new Container()
    const g = new Graphics()
    g.circle(0, 0, 46).fill({ color: 0xffffff, alpha: 0.3 })
    g.circle(0, 0, 46).stroke({ width: 5, color: 0xffffff, alpha: 0.85 })
    // Pekande hand.
    g.roundRect(-13, -6, 26, 34, 13).fill(0xffe0bd).stroke({ width: 3.5, color: 0xdca873 })
    g.roundRect(-7, -34, 14, 30, 7).fill(0xffe0bd).stroke({ width: 3.5, color: 0xdca873 })
    g.eventMode = 'none'
    c.addChild(g)
    c.position.set(ZACKE_X, ZACKE_Y + 10)
    c.eventMode = 'none'
    c.visible = false
    this._hint = c
    this._root.addChild(c)
  },

  _showHint() {
    const h = this._hint
    if (!h || h.destroyed || h.visible) return
    h.visible = true
    h.alpha = 0
    h.scale.set(0.8)
    gsap.to(h, { alpha: 1, duration: 0.25 })
    gsap.to(h.scale, { x: 1.12, y: 1.12, duration: 0.62, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _hideHint() {
    const h = this._hint
    if (!h || h.destroyed || !h.visible) return
    gsap.killTweensOf(h.scale)
    gsap.to(h, { alpha: 0, duration: 0.2, onComplete: () => !h.destroyed && (h.visible = false) })
  },

  // ---- Mage: tryck/håll → bubbla -----------------------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _zackePointerDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, WALL_L + 30, WALL_R - 30)
    this._held = true
    // Laddnings-bubbla vid tryckpunkten på karbotten.
    const view = this._makeBubbleView()
    const r = R_MIN + this._levelBoost
    view.scale.set(r / BASE)
    view.position.set(x, FLOOR - 30)
    this._bubbleLayer.addChild(view)
    this._charging = { x, r, view }
    // Riktig prutt (<100ms) eller mjuk syntes — strypt så snabba tryck inte staplas.
    this._sound(ctx, 'fart', 'soft', 'fart', 70)
    pop(this._zacke)
    this._setMood('fniss', 0.9)
    this._splash()
    if (!this._firstPrutt) {
      this._firstPrutt = true
      ctx.services.voice.say('Pruttbubblor!')
    }
  },

  // Armarna plaskar till i vattnet.
  _splash() {
    for (const [arm, dir] of [
      [this._armL, 1],
      [this._armR, -1],
    ]) {
      if (!arm || arm.destroyed) continue
      gsap.killTweensOf(arm)
      gsap.fromTo(arm, { rotation: dir * 0.5 }, { rotation: dir * 0.86, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
  },

  _releaseBubble(ctx) {
    if (!this._held) return
    this._held = false
    const c = this._charging
    this._charging = null
    if (!c) return
    if (c.view && !c.view.destroyed) c.view.destroy()
    if (this._resolving) return
    this._idle = 0
    this._spawnBubble(c.x, c.r)
    // Dubbel-prutt på högre nivå → mer skum per tryck (lättare, inte svårare).
    if (this._level >= 2 && Math.random() < 0.35) {
      this._spawnBubble(clamp(c.x + (Math.random() - 0.5) * 120, WALL_L + 30, WALL_R - 30), Math.max(R_MIN, c.r * 0.7))
    }
    this._sound(ctx, null, 'whoosh', 'whoosh', 90)
  },

  _makeBubbleView(kind = 'normal') {
    const v = new Container()
    const g = new Graphics()
      .circle(0, 0, BASE)
      .fill({ color: kind === 'glitter' ? 0xfff0b8 : 0xbfefff, alpha: kind === 'glitter' ? 0.55 : 0.5 })
      .stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
    // Giant-bubbla (belönar att HÅLLA): regnbågs-sheen-bågar → syns tydligt värd besväret.
    // arcPath, inte arc — annars dras ett streck från glansprickens väg till varje båge.
    if (kind === 'giant') {
      const hues = [COLORS.red, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.purple]
      for (let i = 0; i < hues.length; i++) {
        const a0 = -2.4 + i * 0.5
        arcPath(g, 0, 0, BASE * 0.86, a0, a0 + 0.42).stroke({ width: 5, color: hues[i], alpha: 0.6, cap: 'round' })
      }
    }
    g.circle(-BASE * 0.34, -BASE * 0.34, BASE * 0.22).fill({ color: 0xffffff, alpha: 0.85 }) // glansprick
    v.addChild(g)
    v.eventMode = 'none'
    return v
  },

  _spawnBubble(x, r) {
    if (!this._alive || this._resolving) return
    r = clamp(r, R_MIN, R_MAX + this._levelBoost)
    x = clamp(x, WALL_L + r, WALL_R - r)
    // En hålld/stor bubbla blir en GIANT (dubbelt skum); annars ibland en glitterbubbla.
    const kind = r >= (R_MAX + this._levelBoost) * 0.86 ? 'giant' : Math.random() < 0.1 ? 'glitter' : 'normal'
    if (kind === 'giant') this._setMood('wow', 1.3)
    this._pushBubble(x, r, 0, kind)
  },

  // Skapa en bubbel-view + lägg i listan (delas av _spawnBubble och firande-svärmen,
  // som kör medan _resolving=true och därför inte kan gå via _spawnBubble-gardet).
  _pushBubble(x, r, vy = 0, kind = 'normal') {
    const view = this._makeBubbleView(kind)
    view.scale.set(r / BASE)
    view.position.set(x, FLOOR - 30)
    this._bubbleLayer.addChild(view)
    this._bubbles.push({ view, x, y: FLOOR - 30, r, vx: 0, vy, phase: Math.random() * 6, age: 0, kind })
  },

  // ---- Anka: dra → flytta studshindret -----------------------------------

  _setDuckPos(x, y) {
    this._duckBase.x = clamp(x, WALL_L + DUCK_R, WALL_R - DUCK_R)
    this._duckBase.y = clamp(y, SURFACE_Y + 20, FLOOR - DUCK_R)
  },

  // Ritad gul gummianka (🦆-emojin renderas som en GRÄSAND — grönt huvud, brun
  // bringa — alltså inte alls badankan spelet lovar).
  _buildDuck(ctx) {
    const d = new Container()
    const g = new Graphics()
    // Stjärt.
    g.moveTo(-34, 2).lineTo(-62, -26).lineTo(-48, 14).closePath().fill(0xffd93d).stroke({ width: 4, color: 0xe0a91a })
    // Kropp.
    g.ellipse(0, 8, 48, 34).fill(0xffd93d).stroke({ width: 4, color: 0xe0a91a })
    // Vinge.
    g.ellipse(-6, 12, 22, 15).fill(0xffe98a).stroke({ width: 3.5, color: 0xe0a91a })
    // Hals + huvud.
    g.roundRect(14, -30, 26, 34, 13).fill(0xffd93d)
    g.circle(30, -26, 25).fill(0xffd93d).stroke({ width: 4, color: 0xe0a91a })
    // Näbb.
    g.moveTo(50, -30).lineTo(72, -22).lineTo(50, -14).closePath().fill(COLORS.orange).stroke({ width: 3.5, color: COLORS.orangeDark })
    // Öga.
    g.circle(36, -32, 7).fill(COLORS.white)
    g.circle(37, -31, 4.5).fill(COLORS.ink)
    g.circle(35, -34, 1.8).fill(COLORS.white)
    // Glans.
    g.ellipse(-10, -6, 16, 8).fill({ color: 0xffffff, alpha: 0.45 })
    g.eventMode = 'none'
    d.addChild(g)

    d.position.set(this._duckBase.x, this._duckBase.y)
    d.eventMode = 'static'
    d.cursor = 'pointer'
    d.hitArea = new Circle(0, 0, 80) // träffyta-diameter 160px
    this._duckDownH = (ev) => this._duckDown(ctx, ev)
    this._duckMoveH = (ev) => this._duckMove(ev)
    this._duckUpH = () => this._duckUp(ctx)
    d.on('pointerdown', this._duckDownH)
    this._duck = d
    this._root.addChild(d)
  },

  _duckDown(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    this._touched = true
    this._hideHint()
    const p = this._root.toLocal(e.global)
    this._duckActive = true
    this._duckMoved = false
    this._duckStart = { x: p.x, y: p.y }
    this._duckGrab = { dx: this._duckBase.x - p.x, dy: this._duckBase.y - p.y }
    this._duckCtx = ctx
    this._duck.on('globalpointermove', this._duckMoveH)
    this._duck.on('pointerup', this._duckUpH)
    this._duck.on('pointerupoutside', this._duckUpH)
  },

  _duckMove(e) {
    if (!this._duckActive || !this._alive) return
    const p = this._root.toLocal(e.global)
    if (!this._duckMoved && Math.hypot(p.x - this._duckStart.x, p.y - this._duckStart.y) > 12) this._duckMoved = true
    if (this._duckMoved) {
      this._setDuckPos(p.x + this._duckGrab.dx, p.y + this._duckGrab.dy)
      if (!this._lastSfx['quack'] || performance.now() - this._lastSfx['quack'] >= 220) {
        this._sound(this._duckCtx, 'djur_anka', 'pop', 'quack', 220)
        if (this._duck && !this._duck.destroyed) pop(this._duck)
      }
      this._idle = 0
    }
  },

  _duckUp(ctx) {
    if (!this._duckActive) return
    this._duckActive = false
    this._duck.off('globalpointermove', this._duckMoveH)
    this._duck.off('pointerup', this._duckUpH)
    this._duck.off('pointerupoutside', this._duckUpH)
    if (!this._duckMoved) {
      // Tap → tap-tap: markera ankan, nästa vatten-tryck glider den dit.
      this._duckSelected = !this._duckSelected
      this._sound(ctx, 'djur_anka', 'pop', 'quack', 180)
      pop(this._duck)
    } else {
      this._duckSelected = false
    }
  },

  // ---- Vatten-tryck (alltid kul) -----------------------------------------

  _waterTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    const p = this._root.toLocal(e.global)
    // Tap-tap-släpp av ankan: glid den till tryckpunkten.
    if (this._duckSelected) {
      this._duckSelected = false
      const tx = clamp(p.x, WALL_L + DUCK_R, WALL_R - DUCK_R)
      const ty = clamp(p.y, SURFACE_Y + 20, FLOOR - DUCK_R)
      const st = { x: this._duckBase.x, y: this._duckBase.y }
      this._duckGlide?.kill()
      this._duckGlide = gsap.to(st, {
        x: tx,
        y: ty,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => this._setDuckPos(st.x, st.y),
      })
      this._sound(ctx, 'djur_anka', 'pop', 'quack', 180)
      return
    }
    ripple(ctx.fxLayer, p.x, p.y, { color: COLORS.white, maxR: 64 })
    this._sound(ctx, 'plopp', 'pop', 'plopp', 110)
    // Närliggande bubblor får en liten knuff.
    for (const b of this._bubbles) {
      if (Math.abs(b.x - p.x) < 120 && Math.abs(b.y - p.y) < 140) {
        b.vx += (Math.random() - 0.5) * 2
        b.vy -= 1.5
      }
    }
  },

  // ---- Tick: laddning, bubbel-integrator, anka-gupp, idle-inbjudan --------

  _update(ctx, tk) {
    if (!this._alive) return
    const dt = Math.min(2.5, tk.deltaMS / 16.67)
    const dts = dt / 60 // sekunder

    // Håll-laddning: bubblan växer synligt (direktmanipulation, ingen dold gest).
    if (this._held && this._charging) {
      this._charging.r = Math.min(R_MAX + this._levelBoost, this._charging.r + (26 / 60) * dt)
      const v = this._charging.view
      if (v && !v.destroyed) v.scale.set(this._charging.r / BASE)
    }

    // Min tillbaka till vila.
    if (this._moodHold > 0) {
      this._moodHold -= dts
      if (this._moodHold <= 0 && this._mood !== 'glad') this._drawFace('glad')
    }

    // Anka guppar lätt på ytan.
    this._duckPhase += 0.05 * dt
    if (this._duck && !this._duck.destroyed) {
      this._duck.position.set(this._duckBase.x, this._duckBase.y + Math.sin(this._duckPhase) * 5)
      this._duck.rotation = Math.sin(this._duckPhase * 0.7) * 0.06
    }

    this._updateDrip(dts)

    // Skummet jäser — omritning strypt till ~12 fps (billigt, men tydligt levande).
    if (this._foam.level > 0) {
      this._foamPhase += dt * 0.05
      this._foamAcc += dts
      if (this._foamAcc > 0.08) {
        this._foamAcc = 0
        this._drawFoam()
      }
    }
    // Skum-skägg när badet nästan är fullt.
    if (this._beard && !this._beard.destroyed) {
      this._beard.visible = this._foam.level >= this._goalFoam * 0.78
    }

    // Bubbel-integrator.
    const duckX = this._duckBase.x
    const duckY = this._duckBase.y
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      const vyT = -(0.11 * b.r) // terminalfart uppåt ∝ radie
      b.vy += (vyT - b.vy) * 0.08 * dt
      b.vy *= 0.97
      b.vx *= 0.92
      b.phase += 0.12 * dt
      b.vx += Math.sin(b.phase) * 0.5 * dt
      // Hastighetstak.
      const sp = Math.hypot(b.vx, b.vy)
      if (sp > MAX_V) {
        b.vx = (b.vx / sp) * MAX_V
        b.vy = (b.vy / sp) * MAX_V
      }
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.age += dt

      // Väggstuds.
      if (b.x < WALL_L + b.r) {
        b.x = WALL_L + b.r
        b.vx *= -0.5
      } else if (b.x > WALL_R - b.r) {
        b.x = WALL_R - b.r
        b.vx *= -0.5
      }

      // Anka-kollision → studs (ankans placering ändrar bubblornas väg).
      const dx = b.x - duckX
      const dy = b.y - duckY
      const d = Math.hypot(dx, dy)
      const minD = b.r + DUCK_R
      if (d < minD && d > 0.01) {
        const nx = dx / d
        const ny = dy / d
        b.x = duckX + nx * minD
        b.y = duckY + ny * minD
        const dot = b.vx * nx + b.vy * ny
        b.vx = (b.vx - 2 * dot * nx) * 0.6
        b.vy = (b.vy - 2 * dot * ny) * 0.6
        // Ljud ENDAST vid en verklig stöt (bubblan är på väg in mot ankan), inte när
        // en instängd bubbla skaver mot ankan varje frame → ingen distorsion. Plus
        // strypning som backstop.
        if (dot < -0.6) {
          this._sound(ctx, 'boing', 'soft', 'boing', 150)
          if (this._duck && !this._duck.destroyed) wiggle(this._duck)
          b.vy -= 3 // ankan sparkar upp bubblan …
          b.duckBoost = true // … och ger bonus-skum vid pop → placeringen betyder något
        }
      }

      if (b.view && !b.view.destroyed) b.view.position.set(b.x, b.y)

      // Pop vid ytan (bubblans topp når ytan) eller efter max-livslängd.
      if (b.y - b.r <= SURFACE_Y || b.age > 360) {
        this._popBubble(ctx, b, i)
      }
    }

    // Idle → INBJUDAN, aldrig framsteg. Zacke pruttar av sig själv, byter min och
    // en pekande hand pulserar över magen. Mätaren rör sig inte förrän barnet trycker.
    this._idle += dts
    if (!this._resolving && this._idle > 5) {
      this._idle = 0
      this._invite(ctx)
    }

    // Anti-stuck-vakt: har barnets egna bubblor slutat ge skum på ~4 s (t.ex. fastnat
    // under ankan) lossar vi den äldsta. Skum trollas ALDRIG fram ur tomma intet —
    // finns inga bubblor finns inget att lossa, och då står mätaren still (som den ska).
    if (!this._resolving) {
      if (this._bubbles.length) {
        this._sinceFoam += dts
        if (this._sinceFoam > 4 && this._foam.level < this._goalFoam) {
          this._sinceFoam = 0
          this._popBubble(ctx, this._bubbles[0], 0)
        }
      } else {
        this._sinceFoam = 0
      }
    }
  },

  // Droppande kran: ren dekor (aldrig skum) — ger rummet liv och ljudlöst tempo.
  _updateDrip(dts) {
    const g = this._dripGfx
    if (!g || g.destroyed) return
    const d = this._drip
    if (d.wait > 0) {
      d.wait -= dts
      if (d.wait <= 0) d.y = SPOUT.y
      g.clear()
      // En droppe som samlas i pipen mellan fallen.
      if (d.wait > 0 && d.wait < 0.5) g.circle(SPOUT.x, SPOUT.y - 2, 4 + (0.5 - d.wait) * 6).fill({ color: 0xbfe9fb, alpha: 0.9 })
      return
    }
    d.y += 640 * dts
    g.clear()
    if (d.y >= SURFACE_Y) {
      d.wait = 1.6 + Math.random() * 1.4
      if (this._alive && this._root && !this._root.destroyed) {
        const r = new Graphics()
        r.circle(0, 0, 8).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
        r.position.set(SPOUT.x, SURFACE_Y + 4)
        r.eventMode = 'none'
        this._root.addChild(r)
        gsap.to(r.scale, { x: 3.4, y: 1.4, duration: 0.5, ease: 'power2.out' })
        gsap.to(r, { alpha: 0, duration: 0.5, onComplete: () => !r.destroyed && r.destroy() })
      }
      return
    }
    g.ellipse(SPOUT.x, d.y, 5, 8).fill({ color: 0xbfe9fb, alpha: 0.9 })
  },

  _popBubble(ctx, b, i) {
    this._bubbles.splice(i, 1)
    if (b.view && !b.view.destroyed) b.view.destroy()
    if (!this._alive) return
    const big = b.r / 10
    puff(ctx.fxLayer, b.x, SURFACE_Y, { count: 6 + (big | 0), color: 0xffffff })
    sparkle(ctx.fxLayer, b.x, SURFACE_Y)
    ripple(ctx.fxLayer, b.x, SURFACE_Y, { color: COLORS.white, maxR: 40 + b.r * 1.4, alpha: 0.6 }) // större bubbla plaskar högre
    // Stigande crescendo: poppet klättrar i tonhöjd ju fullare badet är.
    const frac = clamp((this._foam.level || 0) / (this._goalFoam || 1), 0, 1)
    ctx.services.audio.tone({ freq: 360 + frac * 520, dur: 0.12, type: 'sine', vol: 0.16, slideTo: 180 })
    this._sound(ctx, 'plopp', 'pop', 'plopp', 110)
    if (this._mood !== 'wow') this._setMood('fniss', 0.7)
    // Specialbubblor: giant = dubbelt skum + regnbågsplask; glitter = stjärnor; anka-boost = bonus.
    let mul = 1
    if (b.kind === 'giant') {
      mul = 2
      sparkle(ctx.fxLayer, b.x, SURFACE_Y, { count: 10 })
      sparkle(ctx.fxLayer, b.x, SURFACE_Y - 40, { count: 8 })
    } else if (b.kind === 'glitter') {
      mul = 1.5
      sparkle(ctx.fxLayer, b.x, SURFACE_Y - 12, { count: 9 })
    }
    // Anka-boosten får en EGEN florish i ankans gula färg, och ankan studsar till.
    // Utan den syns aldrig att placeringen gav extra skum — kausaliteten "jag styrde
    // bubblan hit, DÄRFÖR blev det mer skum" fanns bara i koden, inte för barnet.
    if (b.duckBoost) {
      mul += 0.5
      puff(ctx.fxLayer, b.x, SURFACE_Y, { count: 9, color: 0xffd93d })
      sparkle(ctx.fxLayer, b.x, SURFACE_Y - 8, { count: 7 })
      ctx.services.audio.tone({ freq: 620, dur: 0.18, type: 'triangle', vol: 0.14, slideTo: 940 })
      if (this._duck && !this._duck.destroyed) pop(this._duck)
    }
    if (Math.random() < 0.3) floatText(ctx.fxLayer, b.x, SURFACE_Y - 10, randomFrom(['Hihi!', 'Pluff!', 'Blubb!', 'Prrt!']))
    this._addFoam(ctx, b.r * mul)
  },

  _addFoam(ctx, r) {
    this._foam.level += r * FOAM_K
    this._sinceFoam = 0 // skummet växte → nollställ anti-stuck-vakten
    this._drawFoam()
    if (!this._resolving && this._foam.level >= this._goalFoam) this._onComplete(ctx)
  },

  // Inbjudan vid idle — INGEN bubbla, INGET skum. Zacke gör sig påmind, barnet spelar.
  _invite(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast()
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke)
    this._setMood('fniss', 1.2)
    this._splash()
    // Ren FX-prutt vid magen: bubbelpuff som ser rolig ut men aldrig fyller badet.
    puff(ctx.fxLayer, ZACKE_X, ZACKE_Y + 30, { count: 7, color: 0xbfefff })
    ripple(ctx.fxLayer, ZACKE_X, ZACKE_Y + 10, { color: COLORS.white, maxR: 70, alpha: 0.5 })
    this._sound(ctx, 'fart', 'soft', 'fart', 70)
    if (!this._touched) this._showHint()
  },

  // ---- Klart → firande → nytt bad ----------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._held = false
    if (this._charging?.view && !this._charging.view.destroyed) this._charging.view.destroy()
    this._charging = null
    this._hideHint()
    this._sound(ctx, null, 'celebrate', 'celebrate', 300)
    ctx.services.voice.say(randomFrom(PRAISE))
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke)
    this._setMood('jubel', 2.4)
    this._splash()
    // En glad pruttsvärm.
    this._foam.level = this._goalFoam // håll skummet på linjen under firandet
    this._drawFoam()
    for (let i = 0; i < 8; i++) {
      const r = 30 + Math.random() * 30
      const x = WALL_L + 60 + Math.random() * (WALL_R - WALL_L - 120)
      this._pushBubble(x, r, -2 - Math.random() * 2)
    }
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('bad', (ctx.progress.get().custom?.bad | 0) + 1)
    this._roundTimer = gsap.delayedCall(1.5, () => this._alive && this._newRound())
  },

  _newRound() {
    if (!this._alive) return
    this._applyLevel()
    // Säg vilket bad det blev — den hörbara halvan av "runda 2 ≠ runda 1".
    this._ctx?.services?.voice?.say(this._bath().say)
    this._drawGoal()
    // Rensa kvarvarande firande-bubblor så de inte direkt poppar och fyller det nya
    // badet igen (det skapade en re-complete-loop = upprepade firanden + ljud-distorsion).
    this._bubbles.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
    this._bubbles.length = 0
    // Töm skummet mjukt — och RE-ARMA rundan (resolving=false) först NÄR det är tomt,
    // så en sen pop under tömningen inte kan trigga _onComplete på nytt.
    this._foamTween?.kill()
    const st = { v: this._foam.level }
    this._foamTween = gsap.to(st, {
      v: 0,
      duration: 0.6,
      ease: 'power1.in',
      onUpdate: () => {
        this._foam.level = st.v
        this._drawFoam()
      },
      onComplete: () => {
        if (!this._alive) return
        this._foam.level = 0
        this._drawFoam()
        this._idle = 0
        this._sinceFoam = 0
        this._firstPrutt = true // röst-cue redan given denna session
        this._resolving = false
      },
    })
  },

  // ---- Städning -----------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._held = false
    this._charging = null

    this._roundTimer?.kill()
    this._foamTween?.kill()
    this._duckGlide?.kill()
    this._goalPulse?.kill() // breathe() tweenar en proxy → måste dödas explicit
    // Fyndets gungning är repeat:-1 och skriver .y på vyn — lever den vidare efter
    // destroy kastar settern varje bildruta (jfr bajs-och-kiss). OVILLKORLIGT.
    this._treasureBob?.kill()
    this._tweens?.forEach((t) => t?.kill())
    if (this._tweens) this._tweens.length = 0

    // Bubblor är bara ticker-styrda Pixi-objekt → räcker att förstöra dem.
    this._bubbles?.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
    if (this._bubbles) this._bubbles.length = 0

    // Pekar-lyssnare.
    if (this._zacke && !this._zacke.destroyed) {
      this._zacke.off('pointerdown', this._zackeDown)
      this._zacke.off('pointerup', this._zackeUp)
      this._zacke.off('pointerupoutside', this._zackeUp)
    }
    if (this._waterArea && !this._waterArea.destroyed) this._waterArea.off('pointertap', this._waterTapHandler)
    if (this._duck && !this._duck.destroyed) {
      this._duck.off('pointerdown', this._duckDownH)
      this._duck.off('globalpointermove', this._duckMoveH)
      this._duck.off('pointerup', this._duckUpH)
      this._duck.off('pointerupoutside', this._duckUpH)
    }

    gsap.killTweensOf(this._zacke)
    gsap.killTweensOf(this._zacke?.scale)
    gsap.killTweensOf(this._duck)
    gsap.killTweensOf(this._duck?.scale)
    gsap.killTweensOf(this._armL)
    gsap.killTweensOf(this._armR)
    gsap.killTweensOf(this._hint)
    gsap.killTweensOf(this._hint?.scale)
    gsap.killTweensOf(this._foamGfx)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Badleksaker att hitta i skummet. Ritade fristående former (P0 ASSETS) — egen silhuett,
// ingen emoji i en ruta. Hålls små (~34px) så de läser som "leksak i skummet", inte som
// ett nytt spelobjekt att trycka på.
function makeTreasure(kind) {
  const c = new Container()
  if (kind === 'boat') {
    const hull = new Graphics()
    hull.moveTo(-30, 4).lineTo(30, 4).lineTo(20, 22).lineTo(-20, 22).closePath()
      .fill(0xe8503f).stroke({ width: 3, color: 0xb93a2c })
    const mast = new Graphics().roundRect(-2, -30, 4, 34, 2).fill(0x9a7a55)
    const sail = new Graphics()
    sail.moveTo(2, -28).lineTo(24, -6).lineTo(2, -2).closePath().fill(0xfffdf7).stroke({ width: 3, color: 0xd3dde2 })
    c.addChild(hull, mast, sail)
  } else if (kind === 'star') {
    const g = new Graphics()
    g.moveTo(0, -26).quadraticCurveTo(6, -8, 25, -8).quadraticCurveTo(10, 4, 16, 24)
      .quadraticCurveTo(0, 12, -16, 24).quadraticCurveTo(-10, 4, -25, -8)
      .quadraticCurveTo(-6, -8, 0, -26).fill(0xffd24a).stroke({ width: 3, color: 0xe0ac1e })
    const gloss = new Graphics().circle(-6, -6, 5).fill({ color: 0xffffff, alpha: 0.75 })
    c.addChild(g, gloss)
  } else if (kind === 'fish') {
    const body = new Graphics().ellipse(0, 0, 26, 17).fill(0xff9f4d).stroke({ width: 3, color: 0xdd7f2e })
    const tail = new Graphics()
    tail.moveTo(-24, 0).lineTo(-40, -13).lineTo(-40, 13).closePath().fill(0xff9f4d).stroke({ width: 3, color: 0xdd7f2e })
    const eye = new Graphics().circle(12, -5, 4.5).fill(0x3a2b35)
    const dot = new Graphics().circle(13.5, -6.5, 1.7).fill(0xffffff)
    c.addChild(tail, body, eye, dot)
  } else if (kind === 'ball') {
    const g = new Graphics().circle(0, 0, 22).fill(0xfffdf7).stroke({ width: 3, color: 0xd3dde2 })
    const a = new Graphics().moveTo(0, -22).quadraticCurveTo(14, 0, 0, 22).quadraticCurveTo(6, 0, 0, -22).fill(0xe8503f)
    const b = new Graphics().moveTo(0, -22).quadraticCurveTo(-14, 0, 0, 22).quadraticCurveTo(-6, 0, 0, -22).fill(0x4aa3df)
    const gloss = new Graphics().circle(-7, -8, 5).fill({ color: 0xffffff, alpha: 0.8 })
    c.addChild(g, a, b, gloss)
  } else {
    // crab
    const body = new Graphics().ellipse(0, 0, 24, 17).fill(0xf2603f).stroke({ width: 3, color: 0xc4472b })
    const legs = new Graphics()
    for (const sx of [-1, 1]) {
      legs.roundRect(sx * 16, 8, 4, 12, 2).fill(0xc4472b)
      legs.roundRect(sx * 24, 4, 4, 12, 2).fill(0xc4472b)
    }
    const claw1 = new Graphics().circle(-27, -6, 8).fill(0xf2603f).stroke({ width: 3, color: 0xc4472b })
    const claw2 = new Graphics().circle(27, -6, 8).fill(0xf2603f).stroke({ width: 3, color: 0xc4472b })
    const e1 = new Graphics().circle(-8, -8, 4).fill(0xffffff)
    const e2 = new Graphics().circle(8, -8, 4).fill(0xffffff)
    const p1 = new Graphics().circle(-8, -8, 2).fill(0x3a2b35)
    const p2 = new Graphics().circle(8, -8, 2).fill(0x3a2b35)
    c.addChild(legs, claw1, claw2, body, e1, e2, p1, p2)
  }
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
