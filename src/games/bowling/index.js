// Bobos Bowling — top-down fysik-bowling (3–5 år). Barnet SIKTAR (riktning) +
// LADDAR (kraft) genom att dra det tunga klotet bakåt (slangbella) och släppa —
// klotet rullar uppför banan och välter käglorna 🎳 med riktig matter.js-fysik
// (kollision + momentum). MÅL: slå ALLA käglor. TVÅ kontroller styr utfallet:
//   (a) sikte + kraft via dragvektorn (AimLauncher, prickad bana visar flykten),
//   (b) en BUMPER-knapp (Kantstöd): på = lysande studsräcken längs kanterna så
//       klotet aldrig hamnar i rännstenen; av = öppen bana men mjuk auto-hjälp.
// INGET misslyckande: står käglor kvar efter kastet SERVERAS klotet igen för ett glatt
// andra kast (spare) — barnets sikte avgör. Står de kvar även då räddar en glad "vindpust"
// + knuff de sista (backstop). Bobo hejar vid kast och jublar vid strike.
//
// Kalibrering (uppmätt mot matter vid fast 1/60-steg): top-down => gravityY = 0, så
// previewGravity = 0.2778 × 0 = 0 (rak pricklinje). Klotets frictionAir = 0.012 dämpar
// farten ~(1 - 0.012) per steg, så previewDamp = 1 - 0.012 = 0.988 får pricklinjen att
// bromsa in på exakt samma punkt som klotet. Skott-farten (Body.setVelocity) är samma
// vektor som launchern matar förhandsvisningen med, och bounds = väggarnas inneryta +
// klotradien, så den prickade banan följer klotets verkliga, raka, lätt-bromsande
// studsbana (mot bumper-/rännstenskanterna) till ~några px. Allt ritas programmatiskt.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, nudge, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { createScene } from '../../lib/scene.js'
import { makeBoll, makeStjarna } from '../../lib/foremal.js'
import { bigCelebration, burst, puff, sparkle, pop } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Layout (designkoordinater 1280×720) ---
const BALL_R = 46
const BALL_START = { x: 640, y: 600 }
const BALL_FA = 0.012 // klotets frictionAir -> previewDamp = 1 - BALL_FA
const PIN_R = 26 // kägel-kroppens radie (mindre än emojin, men välter realistiskt)
const KNOCK_DIST = 38 // förskjutning (px) innan en kägla räknas som vält
const STRIKE_SAY = [
  'Bravo! Alla käglor!',
  'Hurra! Alla käglor!',
  'Toppen! Alla käglor!',
  'Wow! Alla käglor!',
]
const BOBO_POS = { x: 150, y: 540 }

// Banans mått (används av markeringar, räcken och stämplar).
const LANE = { x: 340, y: 110, w: 600, h: 580 }
const LANE_X2 = LANE.x + LANE.w // 940
const FOUL_Y = 648 // fellinjen — klotet startar bakom den
const DECK_Y = 372 // kägeldäckets nedre kant (området käglorna står på)

// Banteman per nivå: bakgrunden OCH banans accentfärg byts, så nivå 4 inte ser
// identisk ut med nivå 1. Cyklas i _themeFor(); scenen korsfadas i _setTheme().
const THEMES = [
  { scene: 'warm', accent: COLORS.yellow, lane: COLORS.cream, mark: 0xe0b877 },
  { scene: 'candy', accent: 0xff9ec4, lane: 0xfff4fa, mark: 0xf0a8c8 },
  { scene: 'water', accent: 0x4aa3df, lane: 0xf2fbff, mark: 0x8fc9e8 },
  { scene: 'night', accent: 0x8b7dd8, lane: 0xf4f1ff, mark: 0xb3a6e8 },
]

const MAX_TROPHIES = 8 // pokalhyllans bredd (fler strikes fyller på från början igen)

// Pentatonisk C-dur-stege, en ton per kägla i samma ras (10 käglor = hela stegen).
// Pentatonik kan aldrig låta fel oavsett i vilken ordning käglorna faller.
const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760]

export default {
  id: 'bowling',
  titleSv: 'Bobos Bowling',
  icon: '🎳',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'bowling',
  voiceIntro: 'Dra klotet bakåt och släpp — slå alla käglor!',

  init(ctx) {
    this._alive = true
    this._phase = 'aim' // aim | rolling | helping | strike
    this._resolving = false
    this._bumperOn = true
    this._bumperBodies = []
    this._rails = []
    this._pins = []
    this._meterDots = []
    this._standingCount = 0
    this._pinCenter = { x: 640, y: 300 }
    this._idle = 0
    this._rollT = 0
    this._restT = 0
    this._throws = 0 // kast på nuvarande triangel (spare = andra kastet, sen backstop)
    this._lastPinSound = 0
    this._pinSoundN = 0
    this._themeI = -1 // aktivt bantema (index i THEMES); -1 = inget satt än
    this._sceneNode = null // aktiv bakgrund (korsfadas vid temabyte)
    this._oldScenes = [] // bakgrunder på väg ut — måste kunna dödas vid exit
    this._trophies = [] // pokalhyllans stjärnor bredvid Bobo
    this._shakeAmp = 0 // skärmskak-amplitud (dämpas i _update)
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: top-down => INGEN gravitation, inga standardväggar (vi bygger egna).
    this._phys = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })

    this._buildScene(ctx)
    this._buildLaneWalls()

    // Klot-kropp: tungt (mycket momentum genom käglorna) men mjukt bromsat av luften.
    // Lås tröghetsmomentet så klotets vita högdager/skugga inte snurrar (toppvy-puck).
    this._ballBody = this._phys.circle(BALL_START.x, BALL_START.y, BALL_R, {
      ...MATERIALS.heavy,
      frictionAir: BALL_FA,
      label: 'ball',
    })
    Body.setInertia(this._ballBody, Infinity)
    this._phys.link(this._ballBody, this._ball)

    // Sikte + kraft (slangbella): dra klotet NEDÅT/bakåt -> det skjuts UPPÅT mot käglorna.
    this._launcher = new AimLauncher({
      target: this._ball,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: true,
      maxPower: 30,
      minPower: 9,
      powerScale: 0.16,
      hitRadius: 90,
      tapPower: 0.62, // litet tryck -> ~62% kraft mot kägeltriangelns front (träffar alltid)
      trailColor: COLORS.blue,
      previewGravity: 0, // top-down: ingen nedåtkurva i pricklinjen
      previewWind: 0,
      previewDamp: 1 - BALL_FA, // = klotets luftbroms -> linjen stannar där klotet stannar
      bounds: this._previewBounds(),
      getOrigin: () => ({ x: this._ball.x, y: this._ball.y }),
      defaultAim: () => ({ x: this._pinCenter.x, y: this._pinCenter.y }),
      onGrab: () => {
        this._idle = 0
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      },
      onAim: () => {
        this._idle = 0
      },
      onLaunch: (v) => this._fire(ctx, v),
    })

    // Klotet överst (ovanför pricklinjen, käglorna och banan).
    this._root.addChild(this._ball)

    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen --------------------------------------------------------

  _buildScene(ctx) {
    // Bakgrunden bor i ett eget lager så den kan korsfadas vid temabyte.
    this._sceneLayer = new Container()
    this._sceneLayer.eventMode = 'none'
    this._root.addChild(this._sceneLayer)

    // Osynlig fångare: tomma tryck ger en liten glad puff (varje pekning syns).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onTapField = (e) => {
      if (!this._alive || this._phase !== 'aim') return
      const p = this._root.toLocal(e.global)
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, p.x, p.y, { count: 3 })
      this._idle = 0
    }
    this._catcher.on('pointertap', this._onTapField)
    this._root.addChild(this._catcher)

    // Publik på en bänk till höger om banan — hallen ska myllra, inte gapa tom.
    this._crowd = makeCrowd()
    this._crowd.position.set(1128, 300)
    this._root.addChild(this._crowd)

    // Rännstenar (dekor) — mörka kanaler utanför banan.
    const gutters = new Graphics()
    gutters.roundRect(300, LANE.y, 44, LANE.h, 18).fill({ color: COLORS.brown, alpha: 0.3 })
    gutters.roundRect(936, LANE.y, 44, LANE.h, 18).fill({ color: COLORS.brown, alpha: 0.3 })
    gutters.eventMode = 'none'
    this._root.addChild(gutters)

    // Banan: ljus, glansig rektangel med mitt-glansstrimma. Färgen byts per bantema.
    this._lane = new Graphics()
    this._lane.eventMode = 'none'
    this._root.addChild(this._lane)

    // Banmarkeringar: kägeldäck, fellinje, siktpilar och avståndsprickar. Utan dem är
    // mittfältet 600×580 px tom yta — och pilarna hjälper faktiskt siktet.
    this._marks = new Graphics()
    this._marks.eventMode = 'none'
    this._root.addChild(this._marks)

    // Mjuk målzon runt huvudkäglan (flyttas per nivå i _loadLevel).
    this._aimGlow = new Graphics()
      .circle(0, 0, 58)
      .fill({ color: 0xffffff, alpha: 0.5 })
      .circle(0, 0, 40)
      .fill({ color: 0xffffff, alpha: 0.45 })
    this._aimGlow.eventMode = 'none'
    this._root.addChild(this._aimGlow)
    this._glowTween = gsap.to(this._aimGlow, { alpha: 0.45, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Bumper-räcken. PÅ = massiv lysande stapel med uppåtpilar (klotet styrs in mot
    // käglorna). AV = tunn streckad kontur. Två OLIKA former, inte bara alpha, så en
    // 3-åring utan ljud ser skillnaden i stillbild.
    this._rails = []
    for (const x of [346, 920]) {
      const rail = new Container()
      rail.eventMode = 'none'
      const on = new Graphics()
      on.roundRect(0, 0, 14, 540, 7).fill({ color: COLORS.teal })
      for (let i = 0; i < 6; i++) {
        const y = 60 + i * 86
        on.moveTo(1, y + 13).lineTo(7, y).lineTo(13, y + 13).stroke({ width: 4, color: 0xffffff, alpha: 0.8, cap: 'round' })
      }
      const off = new Graphics()
      for (let i = 0; i < 18; i++) {
        off.roundRect(4.5, i * 30, 5, 16, 2.5).fill({ color: COLORS.brown, alpha: 0.28 })
      }
      rail.addChild(on, off)
      rail.position.set(x, 130)
      rail._on = on
      rail._off = off
      this._rails.push(rail)
      this._root.addChild(rail)
    }

    // Kantstöds-stämpel vid banans nedre ände: två pilar som pekar INÅT när stödet är
    // på. Läses utan text och utan ljud.
    this._stamps = []
    for (const [x, dir] of [[372, 1], [908, -1]]) {
      const s = new Graphics()
      s.moveTo(-9 * dir, -12).lineTo(9 * dir, 0).lineTo(-9 * dir, 12).fill({ color: COLORS.teal })
      s.eventMode = 'none'
      s.position.set(x, 668)
      this._stamps.push(s)
      this._root.addChild(s)
    }

    // Lager för käglor (under klotet, ovanför banan).
    this._pinLayer = new Container()
    this._pinLayer.eventMode = 'none'
    this._root.addChild(this._pinLayer)

    // Klot (skapas men läggs överst i init efter launchern).
    this._ball = makeBall()
    this._ball.position.set(BALL_START.x, BALL_START.y)
    this._root.addChild(this._ball)

    // Kägelmätare uppe till vänster.
    this._meterLayer = new Container()
    this._meterLayer.position.set(150, 150)
    this._meterLayer.eventMode = 'none'
    this._root.addChild(this._meterLayer)

    // Bumper-knapp nere till höger.
    this._bumperBtn = new Button({
      icon: '🛟',
      label: 'Kantstöd',
      width: 160,
      height: 132,
      color: COLORS.teal,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._toggleBumper(ctx),
    })
    this._bumperBtn.position.set(1130, 626)
    this._root.addChild(this._bumperBtn)

    // Maskoten Bobo nere till vänster (hejar/jublar).
    // Bobo hade bara ett svävande huvud i hörnet. Nu står han med ritad kropp och
    // hejar på kastet.
    this._bobo = new Container()
    const bbody = new Graphics()
    bbody.ellipse(0, 122, 36, 11).fill({ color: 0x000000, alpha: 0.16 })
    bbody.ellipse(-18, 112, 15, 9).fill(COLORS.orangeDark)
    bbody.ellipse(18, 112, 15, 9).fill(COLORS.orangeDark)
    bbody.ellipse(0, 70, 38, 44).fill(COLORS.orange)
    bbody.ellipse(0, 76, 24, 24).fill({ color: COLORS.cream, alpha: 0.92 })
    // Armarna satt tidigare på y≈10 — rakt bakom det 58 px stora huvudet, så Bobo såg
    // armlös ut. De hänger nu utanför huvudets silhuett och syns.
    bbody.moveTo(-30, 60).quadraticCurveTo(-52, 58, -58, 42).stroke({ width: 14, color: COLORS.orange, cap: 'round' })
    bbody.moveTo(30, 60).quadraticCurveTo(52, 58, 58, 42).stroke({ width: 14, color: COLORS.orange, cap: 'round' })
    bbody.circle(-58, 42, 11).fill(COLORS.cream)
    bbody.circle(58, 42, 11).fill(COLORS.cream)
    bbody.eventMode = 'none'
    this._bobo.addChild(bbody)
    this._bobo.addChild(makeMascot(58))
    this._bobo.interactiveChildren = false
    this._bobo.position.set(BOBO_POS.x, BOBO_POS.y)
    this._root.addChild(this._bobo)

    // Bobos pokalhylla ovanför honom: en stjärna per strike (custom.strikes), så det
    // finns något att komma tillbaka till mellan omgångarna.
    // Hyllan hänger mellan kägelmätaren och Bobo (y 300) — inte ovanpå hans huvud.
    this._shelfLayer = new Container()
    this._shelfLayer.eventMode = 'none'
    this._shelfLayer.position.set(BOBO_POS.x, 300)
    const plank = new Graphics()
      .roundRect(-112, 16, 224, 13, 6)
      .fill(COLORS.brown)
      .roundRect(-112, 16, 224, 5, 2.5)
      .fill({ color: 0xffffff, alpha: 0.22 })
      .roundRect(-96, 29, 10, 16, 4)
      .fill({ color: 0x6d452c })
      .roundRect(86, 29, 10, 16, 4)
      .fill({ color: 0x6d452c })
    this._shelfLayer.addChild(plank)
    // Tomma stjärnfack: hyllan ser ut som en samling att fylla, aldrig som en tom bräda.
    for (let i = 0; i < MAX_TROPHIES; i++) {
      const socket = makeStar()
      socket.alpha = 0.22
      socket.position.set((i - (MAX_TROPHIES - 1) / 2) * 26, 0)
      this._shelfLayer.addChild(socket)
    }
    this._starLayer = new Container()
    this._shelfLayer.addChild(this._starLayer)
    this._root.addChild(this._shelfLayer)
    this._drawTrophies(ctx.progress.get().custom?.strikes || 0)

    // STRIKE-skylt (dold tills alla käglor faller).
    this._banner = new Container()
    this._banner.eventMode = 'none'
    const plate = new Graphics()
      .roundRect(-150, -52, 300, 104, 30)
      .fill(COLORS.orange)
      .stroke({ width: 7, color: 0xffffff })
    const bannerText = new Text({
      text: 'ALLA!',
      style: { fontFamily: FONT.display, fontSize: 62, fill: 0xffffff, fontWeight: '700' },
    })
    bannerText.anchor.set(0.5)
    this._banner.addChild(plate, bannerText)
    this._banner.position.set(640, 390)
    this._banner.visible = false
    this._banner.scale.set(0)
    this._root.addChild(this._banner)
  },

  // ---- Bantema (bakgrund + banans färger cyklar per nivå) -------------------

  _themeFor(level) {
    return THEMES[Math.max(0, level) % THEMES.length]
  },

  // Måla banan, markeringarna, räckena och stämplarna i temats färger, och korsfada
  // in en ny bakgrund om temat faktiskt bytts.
  _setTheme(ctx, level) {
    const i = Math.max(0, level) % THEMES.length
    if (i === this._themeI) return
    this._themeI = i
    const t = THEMES[i]

    // Ny bakgrund in, gammal ut (och bort).
    const next = createScene(t.scene, { width: ctx.width, height: ctx.height, ground: false })
    const prev = this._sceneNode
    this._sceneNode = next
    this._sceneLayer.addChild(next)
    if (prev) {
      next.alpha = 0
      gsap.to(next, { alpha: 1, duration: 0.5 })
      this._oldScenes.push(prev)
      gsap.to(prev, {
        alpha: 0,
        duration: 0.5,
        onComplete: () => {
          this._oldScenes = this._oldScenes.filter((s) => s !== prev)
          if (!prev.destroyed) prev.destroy({ children: true })
        },
      })
    }

    // Banan.
    this._lane
      .clear()
      .roundRect(LANE.x, LANE.y, LANE.w, LANE.h, 28)
      .fill(t.lane)
      .stroke({ width: 8, color: t.accent })
    this._lane.roundRect(620, 120, 40, 560, 20).fill({ color: 0xffffff, alpha: 0.35 })

    // Markeringar: kägeldäck, fellinje, siktpilar, avståndsprickar.
    const m = this._marks.clear()
    m.roundRect(LANE.x + 10, LANE.y + 8, LANE.w - 20, DECK_Y - LANE.y, 22).fill({ color: t.mark, alpha: 0.14 })
    m.moveTo(LANE.x + 14, DECK_Y).lineTo(LANE_X2 - 14, DECK_Y).stroke({ width: 3, color: t.mark, alpha: 0.5 })
    m.moveTo(LANE.x + 14, FOUL_Y).lineTo(LANE_X2 - 14, FOUL_Y).stroke({ width: 6, color: t.mark, alpha: 0.7 })
    for (let k = -3; k <= 3; k++) {
      const x = 640 + k * 66
      const y = 508 + Math.abs(k) * 16 // klassisk pilbåge: ytterpilarna sitter lägre
      m.moveTo(x - 13, y + 20).lineTo(x, y).lineTo(x + 13, y + 20).fill({ color: t.mark, alpha: 0.62 })
    }
    for (let k = -2; k <= 2; k++) {
      m.circle(640 + k * 84, 592, 6).fill({ color: t.mark, alpha: 0.45 })
    }

    // Räcken + stämplar följer temat bara i ljushet — kantstödet behåller sin teal
    // signalfärg så av/på aldrig förväxlas med "ny nivå".
    if (this._banner && !this._banner.destroyed) this._banner.children[0].tint = t.accent
  },

  // ---- Pokalhylla ----------------------------------------------------------

  _drawTrophies(n) {
    const layer = this._starLayer
    if (!layer || layer.destroyed) return
    for (const s of this._trophies) {
      if (s && !s.destroyed) {
        gsap.killTweensOf(s)
        gsap.killTweensOf(s.scale)
        s.destroy()
      }
    }
    this._trophies = []
    // Hyllan rymmer MAX_TROPHIES; därefter börjar raden om (och ingen siffra sjunker).
    const shown = n <= 0 ? 0 : ((n - 1) % MAX_TROPHIES) + 1
    for (let i = 0; i < shown; i++) {
      const st = makeStar()
      // Fyller facken från vänster — samma raster som de tomma stjärnfacken.
      st.position.set((i - (MAX_TROPHIES - 1) / 2) * 26, 0)
      layer.addChild(st)
      this._trophies.push(st)
    }
  },

  // Två tjocka, statiska lane-väggar (alltid på) vid banans yttergräns (rännstenens utsida).
  _buildLaneWalls() {
    this._phys.rectangle(312, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
    this._phys.rectangle(968, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
  },

  // Förhandsvisningens väggar (klotets MITT studsar här). Med bumper PÅ smalnar fältet
  // (klotet studsar in mot käglorna). Värden = väggkropparnas inneryta + klotradien, så
  // pricklinjen matchar klotets verkliga studs.
  _previewBounds() {
    return this._bumperOn
      ? { leftX: 368 + BALL_R, rightX: 912 - BALL_R, restitution: 0.75 } // bumper-inneryta 368/912
      : { leftX: 324 + BALL_R, rightX: 956 - BALL_R, restitution: 0.2 } // lane-väggens inneryta 324/956
  },

  // ---- Nivå ----------------------------------------------------------------

  // Triangel, apex (huvudkägla) närmast barnet (störst y). Rader 60px isär, käglor 64px.
  _pinLayout(level) {
    let pts
    if (level <= 1) {
      pts = [
        { x: 640, y: 300 },
        { x: 596, y: 236 },
        { x: 684, y: 236 },
      ]
    } else if (level <= 3) {
      pts = [
        { x: 640, y: 310 },
        { x: 608, y: 250 },
        { x: 672, y: 250 },
        { x: 576, y: 190 },
        { x: 640, y: 190 },
        { x: 704, y: 190 },
      ]
    } else {
      pts = [
        { x: 640, y: 330 },
        { x: 608, y: 270 },
        { x: 672, y: 270 },
        { x: 576, y: 210 },
        { x: 640, y: 210 },
        { x: 704, y: 210 },
        { x: 544, y: 150 },
        { x: 608, y: 150 },
        { x: 672, y: 150 },
        { x: 736, y: 150 },
      ]
      if (level >= 6) pts = pts.map((p) => ({ x: p.x + (Math.random() * 12 - 6), y: p.y + (Math.random() * 12 - 6) }))
    }
    return pts
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._phase = 'aim'
    this._resolving = false
    this._rollT = 0
    this._restT = 0
    this._idle = 0
    this._throws = 0
    this._helpTimer?.kill()
    this._phys.setWind(0, 0)
    this._setTheme(ctx, level)

    // Rensa gamla käglor (kroppar + vyer).
    for (const p of this._pins) {
      this._phys.removeBody(p.body)
      if (p.view && !p.view.destroyed) {
        gsap.killTweensOf(p.view)
        gsap.killTweensOf(p.view.scale)
        p.view.destroy()
      }
    }
    this._pins = []

    // Bygg ny triangel.
    const layout = this._pinLayout(level)
    let front = layout[0]
    for (const pos of layout) {
      if (pos.y > front.y) front = pos
      const view = makePin()
      view.position.set(pos.x, pos.y)
      this._pinLayer.addChild(view)
      const body = this._phys.circle(pos.x, pos.y, PIN_R, { ...MATERIALS.light, frictionAir: 0.02, label: 'pin' })
      this._phys.link(body, view)
      this._pins.push({ body, view, sx: pos.x, sy: pos.y, down: false, gone: false })
      view.scale.set(0)
      gsap.to(view.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' })
    }
    this._standingCount = this._pins.length
    this._pinCenter = { x: front.x, y: front.y } // sikta på huvudkäglan vid tap-fallback
    if (this._aimGlow && !this._aimGlow.destroyed) {
      this._aimGlow.position.set(front.x, front.y)
      this._aimGlow.visible = true
    }

    // Återställ klotet till start.
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setPosition(this._ballBody, { x: BALL_START.x, y: BALL_START.y })
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball.scale)
      this._ball.scale.set(1)
      this._ball.position.set(BALL_START.x, BALL_START.y)
    }

    this._drawMeter()

    // Bumper-default per nivå: PÅ för låga nivåer (lär ut kastet), AV från nivå 4.
    this._setBumper(ctx, level <= 3, { silent: true })

    this._launcher?.setEnabled(true)
    if (this._ball && !this._ball.destroyed) pop(this._ball)
  },

  // ---- Kägelmätare ---------------------------------------------------------

  _drawMeter() {
    const layer = this._meterLayer
    if (!layer || layer.destroyed) return
    for (const d of this._meterDots) {
      if (d && !d.destroyed) {
        gsap.killTweensOf(d)
        d.destroy()
      }
    }
    this._meterDots = []
    const total = this._pins.length
    const perRow = 5
    const gap = 34
    const rowGap = 38
    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / perRow)
      const inRow = Math.min(perRow, total - row * perRow)
      const col = i % perRow
      // RITAD mini-kägla i poängraden (P0 ASSETS) — var en 🎳-emoji.
      const d = makePin()
      d.scale.set(0.42)
      d.position.set((col - (inRow - 1) / 2) * gap, row * rowGap)
      d.eventMode = 'none'
      d.alpha = this._pins[i].down ? 0.26 : 1
      layer.addChild(d)
      this._meterDots.push(d)
    }
  },

  // ---- Kontroll: bumper (Kantstöd) -----------------------------------------

  _toggleBumper(ctx) {
    this._setBumper(ctx, !this._bumperOn)
    ctx.services.voice.say(this._bumperOn ? 'Kantstöd på!' : 'Kantstöd av!')
  },

  // Sätt bumper på/av: lägg till/ta bort de studsiga väggkropparna, tända/släck räckena,
  // och uppdatera pricklinjens bounds så förhandsvisningen matchar de nya kanterna.
  _setBumper(ctx, on, { silent = false } = {}) {
    this._bumperOn = on

    if (on && this._bumperBodies.length === 0) {
      const l = this._phys.rectangle(360, 400, 16, 540, { isStatic: true, restitution: 0.75, friction: 0.1, label: 'bumper' })
      const r = this._phys.rectangle(920, 400, 16, 540, { isStatic: true, restitution: 0.75, friction: 0.1, label: 'bumper' })
      this._bumperBodies = [l, r]
    } else if (!on && this._bumperBodies.length) {
      for (const b of this._bumperBodies) this._phys.removeBody(b)
      this._bumperBodies = []
    }

    // Räcken: massiv stapel med pilar när PÅ, streckad kontur när AV — två olika
    // former, så skillnaden syns i en stillbild utan text och utan ljud.
    this._railTween?.kill()
    for (const rail of this._rails) {
      if (!rail || rail.destroyed) continue
      gsap.killTweensOf(rail)
      rail.alpha = 1
      rail._on.alpha = 1
      rail._on.visible = on
      rail._off.visible = !on
    }
    if (on) {
      this._railTween = gsap.to(
        this._rails.map((r) => r._on),
        { alpha: 0.7, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' },
      )
    } else {
      for (const rail of this._rails) if (rail && !rail.destroyed) rail._on.alpha = 1
    }

    // Stämpeln vid banänden: inåtpekande pilar tända när stödet är på.
    for (const s of this._stamps) {
      if (!s || s.destroyed) continue
      gsap.killTweensOf(s)
      gsap.to(s, { alpha: on ? 1 : 0.16, duration: 0.25 })
    }

    // Pricklinjen följer de nya väggarna.
    this._launcher?.setPreview({ bounds: this._previewBounds() })

    if (!silent) {
      ctx.services.audio.sfx('pop')
      if (this._bumperBtn && !this._bumperBtn.destroyed) pop(this._bumperBtn)
    }
  },

  // ---- Kast ----------------------------------------------------------------

  _fire(ctx, v) {
    if (!this._alive || this._phase !== 'aim') return
    this._phase = 'rolling'
    this._throws++
    this._pinSoundN = 0 // kombo-stegen börjar om vid varje nytt kast
    this._rollT = 0
    this._restT = 0
    this._idle = 0
    this._launcher.setEnabled(false)

    // Säkerhets-clamp på max-fart (launchern clampar redan, men var extra säker).
    let vx = v.vx
    let vy = v.vy
    const sp = Math.hypot(vx, vy)
    if (sp > 30) {
      const k = 30 / sp
      vx *= k
      vy *= k
    }
    nudge(this._ballBody, vx, vy) // launchern spelar 'whoosh'
    this._boboCheer()
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5, color: COLORS.blue })
  },

  // En kägla välte -> ljud (var 3:e 'pling', annars 'pop'), puff, tona mätarpricken.
  _knockPin(ctx, i) {
    const p = this._pins[i]
    if (!p || p.down) return
    p.down = true
    this._standingCount--

    // Kägel-ljudbild: en låg, kort "trä-klonk" (sågtand som glider nedåt) plus en
    // KOMBO-ton som klättrar en pentatonisk stege för varje kägla i samma ras — tio
    // käglor i rad blir en stigande fanfar i stället för tio likadana blipp.
    const now = performance.now()
    if (now - this._lastPinSound > 70) {
      this._lastPinSound = now
      const step = Math.min(this._pinSoundN, PENTA.length - 1)
      this._pinSoundN++
      const audio = ctx.services.audio
      audio.tone({ freq: 190, slideTo: 96, dur: 0.09, type: 'sawtooth', vol: 0.14 })
      audio.tone({ freq: PENTA[step], dur: 0.2, type: 'triangle', vol: 0.2, delay: 0.02 })
    }
    // Kombo: varje kägla i följd skakar rutan lite mer — en massvält KÄNNS.
    const fallen = this._pins.length - this._standingCount
    this._shakeAmp = Math.min(9, this._shakeAmp + 2.2 + fallen * 0.25)
    if (p.view && !p.view.destroyed) puff(ctx.fxLayer, p.view.x, p.view.y, { count: 6, color: COLORS.yellow })
    const dot = this._meterDots[i]
    if (dot && !dot.destroyed) {
      gsap.killTweensOf(dot)
      gsap.to(dot, { alpha: 0.26, duration: 0.3 })
    }

    if (this._standingCount <= 0) this._strike(ctx)
  },

  // Spare: käglor kvar efter kastet → servera klotet igen för ett glatt ANDRA kast så
  // barnet får sikta en gång till mot den kvarvarande klungan (i stället för att vinden
  // gör jobbet). Tap-fallback + pricklinje riktas mot käglorna som står kvar.
  _serveSpare(ctx) {
    if (!this._alive) return
    this._phase = 'aim'
    this._rollT = 0
    this._restT = 0
    this._idle = 0

    const standing = this._pins.filter((p) => !p.down)
    if (standing.length) {
      this._pinCenter = {
        x: standing.reduce((s, p) => s + p.body.position.x, 0) / standing.length,
        y: standing.reduce((s, p) => s + p.body.position.y, 0) / standing.length,
      }
    }
    // Målzonen MÅSTE flytta med — annars lyser den kvar över den fallna frontkäglans
    // tomma fläck på precis det kast där barnet bäst behöver se vart det ska sikta.
    if (this._aimGlow && !this._aimGlow.destroyed) {
      this._aimGlow.visible = standing.length > 0
      this._aimGlow.position.set(this._pinCenter.x, this._pinCenter.y)
    }

    // Återställ klotet till start.
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setPosition(this._ballBody, { x: BALL_START.x, y: BALL_START.y })
    if (this._ball && !this._ball.destroyed) {
      this._ball.position.set(BALL_START.x, BALL_START.y)
      pop(this._ball)
    }

    ctx.services.audio.sfx('pop')
    ctx.services.voice.say('Ett kast till! Sikta på käglorna som står kvar.')
    this._launcher?.setEnabled(true)
  },

  // Auto-hjälp (no-fail-backstop efter andra kastet): käglor står kvar -> en glad vindpust
  // mot de kvarvarande + en knuff som garanterat välter dem. Knock-detektionen fångar
  // fallet -> strike firas ändå. Ser ut som en rolig pust, känns aldrig som fusk.
  _autoHelp(ctx) {
    if (!this._alive || this._phase === 'strike') return
    this._phase = 'helping'
    const remaining = this._pins.filter((p) => !p.down)
    if (remaining.length === 0) {
      this._strike(ctx)
      return
    }
    const avgX = remaining.reduce((s, p) => s + p.body.position.x, 0) / remaining.length
    const dir = avgX < 640 ? -1 : 1
    this._phys.setWind(0.0006 * dir, -0.0004)
    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('Nästan! Pust — där föll de!')
    for (const p of remaining) {
      const ang = Math.random() * Math.PI * 2
      nudge(p.body, Math.cos(ang) * 9, Math.sin(ang) * 9 - 3) // garanterar förskjutning > KNOCK_DIST
      if (p.view && !p.view.destroyed) sparkle(ctx.fxLayer, p.view.x, p.view.y, { count: 5 })
    }
    // Nollställ vinden strax; eventuella eftersläntrare tippas direkt (garanterad strike).
    this._helpTimer?.kill()
    this._helpTimer = gsap.delayedCall(1.0, () => {
      if (!this._alive) return
      this._phys.setWind(0, 0)
      if (this._phase === 'helping') {
        for (let i = 0; i < this._pins.length; i++) if (!this._pins[i].down) this._knockPin(ctx, i)
      }
    })
  },

  // ---- Strike: firande + nästa nivå ----------------------------------------

  _strike(ctx) {
    if (this._phase === 'strike' || this._resolving) return
    this._resolving = true
    this._phase = 'strike'
    this._launcher.setEnabled(false)
    this._helpTimer?.kill()
    this._phys.setWind(0, 0)

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    // Hela repliken som literal (inte konkatenerad) så check.mjs hittar den och /rost
    // kan generera ett klipp.
    ctx.services.voice.say(randomFrom(STRIKE_SAY))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, 640, 300, { count: 18 })
    this._showBanner()
    this._shakeAmp = Math.min(14, this._shakeAmp + 10)
    this._boboDance()
    this._cheerCrowd()
    if (this._aimGlow && !this._aimGlow.destroyed) this._aimGlow.visible = false

    const cur = ctx.progress.get()
    const strikes = (cur.custom?.strikes || 0) + 1
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('strikes', strikes)
    ctx.progress.complete()
    this._level += 1
    this._drawTrophies(strikes)
    const fresh = this._trophies[this._trophies.length - 1]
    if (fresh && !fresh.destroyed) {
      fresh.scale.set(0)
      gsap.to(fresh.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(3)', delay: 0.25 })
    }
    // Hyllan rymmer MAX_TROPHIES. Den nionde strejken börjar en NY hylla — utan en egen
    // markering ser det ut som att stjärnorna försvann. Fira i stället att hyllan blev full.
    if (strikes > 1 && strikes % MAX_TROPHIES === 1 && this._shelfLayer && !this._shelfLayer.destroyed) {
      sparkle(ctx.fxLayer, this._shelfLayer.x, this._shelfLayer.y, { count: 14 })
      ctx.services.audio.sfx('pling')
    }

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(1.8, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- STRIKE-skylt ---------------------------------------------------------

  _showBanner() {
    const b = this._banner
    if (!b || b.destroyed) return
    this._bannerTl?.kill()
    gsap.killTweensOf(b.scale)
    gsap.killTweensOf(b)
    b.visible = true
    b.alpha = 1
    b.scale.set(0)
    b.rotation = -0.06
    this._bannerTl = gsap
      .timeline()
      .to(b.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(3)' })
      .to(b, { rotation: 0.06, duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.42)
      .to(b, { alpha: 0, duration: 0.35 }, 1.5)
      .add(() => {
        if (b && !b.destroyed) b.visible = false
      })
  },

  // ---- Bobo & publik --------------------------------------------------------

  _boboCheer() {
    if (this._bobo && !this._bobo.destroyed) pop(this._bobo)
  },

  // Strike: Bobo reser sig, hoppar och snurrar i en egen liten dans (inte bara ett hopp).
  _boboDance() {
    const b = this._bobo
    if (!b || b.destroyed) return
    this._danceTl?.kill()
    gsap.killTweensOf(b)
    this._danceTl = gsap
      .timeline()
      .to(b, { y: BOBO_POS.y - 52, rotation: -0.22, duration: 0.22, ease: 'power2.out' })
      .to(b, { y: BOBO_POS.y, rotation: 0.2, duration: 0.36, ease: 'bounce.out' })
      .to(b, { y: BOBO_POS.y - 30, rotation: -0.16, duration: 0.2, ease: 'power2.out' })
      .to(b, { y: BOBO_POS.y, rotation: 0, duration: 0.34, ease: 'bounce.out' })
    pop(b)
  },

  // Publiken hoppar till på bänken.
  _cheerCrowd() {
    const c = this._crowd
    if (!c || c.destroyed) return
    for (const [i, f] of c.fans.entries()) {
      if (!f || f.destroyed) continue
      gsap.killTweensOf(f)
      gsap
        .timeline({ delay: i * 0.08 })
        .to(f, { y: f._baseY - 26, duration: 0.2, ease: 'power2.out' })
        .to(f, { y: f._baseY, duration: 0.36, ease: 'bounce.out' })
    }
  },

  // ---- Ticker: fysik, vält-detektion, kast-klart, idle ---------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._phys.update(ticker.deltaMS)

    // Skärmskak: dämpas mot noll, roten flyttas bara några px. Aldrig under 0.05 px,
    // annars ligger banan kvar snett efter sista bildrutan.
    if (this._shakeAmp > 0.05) {
      this._shakeAmp *= Math.pow(0.0016, dt) // ~halveras var 0,1 s
      this._root.x = (Math.random() * 2 - 1) * this._shakeAmp
      this._root.y = (Math.random() * 2 - 1) * this._shakeAmp
    } else if (this._shakeAmp !== 0) {
      this._shakeAmp = 0
      this._root.position.set(0, 0)
    }

    // Käglorna lever: ögonen följer klotet och spärras upp när det närmar sig.
    const bx = this._ball && !this._ball.destroyed ? this._ball.x : BALL_START.x
    const by = this._ball && !this._ball.destroyed ? this._ball.y : BALL_START.y
    for (const p of this._pins) {
      const v = p.view
      if (p.down || !v || v.destroyed || !v.pupils) continue
      const dx = bx - v.x
      const dy = by - v.y
      const d = Math.hypot(dx, dy) || 1
      v.pupils.position.set((dx / d) * 2.4, (dy / d) * 2.4 - 12)
      // Nära klot -> uppspärrade ögon. Kroppens skala rörs medvetet INTE: intro-tweenen
      // (back.out på scale) äger den, och två skrivare om samma värde blir hackigt.
      const near = Math.max(0, Math.min(1, (240 - d) / 160))
      v.pupils.scale.set(1 + near * 0.55)
    }

    // Bobo som domare: följer klotet med hela kroppen medan det rullar.
    if (this._bobo && !this._bobo.destroyed && this._phase !== 'strike') {
      const want = Math.max(-0.18, Math.min(0.18, (bx - BOBO_POS.x) / 1400 + (this._phase === 'rolling' ? 0.06 : 0)))
      this._bobo.rotation += (want - this._bobo.rotation) * Math.min(1, dt * 5)
    }

    // Vält-detektion (under kast eller auto-hjälp): positionsförskjutning = robustast.
    if (this._phase === 'rolling' || this._phase === 'helping') {
      for (let i = 0; i < this._pins.length; i++) {
        const p = this._pins[i]
        if (p.down) continue
        const dx = p.body.position.x - p.sx
        const dy = p.body.position.y - p.sy
        if (dx * dx + dy * dy > KNOCK_DIST * KNOCK_DIST || p.body.speed > 6.5) this._knockPin(ctx, i)
      }
    }

    // Käglor som slungas HELT ut ur banan tonar bort i stället för att bli liggande
    // ovanpå bakgrunden (och skalets hörnknappar) resten av omgången.
    for (const p of this._pins) {
      if (!p.down || p.gone) continue
      const v = p.view
      if (!v || v.destroyed) continue
      if (v.x < 296 || v.x > 984 || v.y < 124 || v.y > 704) {
        p.gone = true
        this._phys.removeBody(p.body)
        gsap.to(v, {
          alpha: 0,
          duration: 0.35,
          onComplete: () => {
            if (!v.destroyed) v.visible = false
          },
        })
      }
    }

    // Kast klart? (klotet passerar toppen ELLER har stannat). Står käglor kvar -> auto-hjälp.
    if (this._phase === 'rolling') {
      const b = this._ballBody
      this._rollT += dt
      const spd = Math.hypot(b.velocity.x, b.velocity.y)
      if (spd < 0.4) this._restT += dt
      else this._restT = 0
      if (b.position.y < 110 || this._restT > 0.6 || this._rollT > 6) {
        // Käglor kvar? Första kastet → servera klotet igen (spare, barnet siktar om);
        // efter andra kastet träder auto-hjälpen in som backstop (no-fail).
        if (this._standingCount > 0) {
          if (this._throws >= 2) this._autoHelp(ctx)
          else this._serveSpare(ctx)
        }
      }
    }

    // Idle-recue: stilla för länge -> upprepa instruktionen + en puls på klotet.
    if (this._phase === 'aim') {
      this._idle += dt
      if (this._idle >= 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      }
    }
  },

  // ---- Städning (exit-säkert) ----------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._launcher?.destroy()
    this._nextTimer?.kill()
    this._helpTimer?.kill()
    this._railTween?.kill()
    this._glowTween?.kill()
    this._bannerTl?.kill()
    this._danceTl?.kill()

    if (this._aimGlow && !this._aimGlow.destroyed) gsap.killTweensOf(this._aimGlow)
    if (this._banner && !this._banner.destroyed) {
      gsap.killTweensOf(this._banner)
      gsap.killTweensOf(this._banner.scale)
    }
    for (const s of this._stamps || []) if (s && !s.destroyed) gsap.killTweensOf(s)
    for (const rail of this._rails) {
      if (!rail || rail.destroyed) continue
      gsap.killTweensOf(rail._on)
      gsap.killTweensOf(rail._off)
    }
    for (const st of this._trophies) {
      if (st && !st.destroyed) {
        gsap.killTweensOf(st)
        gsap.killTweensOf(st.scale)
      }
    }
    if (this._crowd && !this._crowd.destroyed) for (const f of this._crowd.fans) if (f && !f.destroyed) gsap.killTweensOf(f)
    // Bakgrunder: den aktiva + eventuella som korsfadar ut just nu.
    if (this._sceneNode && !this._sceneNode.destroyed) gsap.killTweensOf(this._sceneNode)
    for (const s of this._oldScenes) if (s && !s.destroyed) gsap.killTweensOf(s)
    this._oldScenes = []

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onTapField)
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
    }
    for (const rail of this._rails) if (rail && !rail.destroyed) gsap.killTweensOf(rail)
    for (const p of this._pins) {
      if (p.view && !p.view.destroyed) {
        gsap.killTweensOf(p.view)
        gsap.killTweensOf(p.view.scale)
      }
    }
    for (const d of this._meterDots) if (d && !d.destroyed) gsap.killTweensOf(d)
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    if (this._bumperBtn && !this._bumperBtn.destroyed) gsap.killTweensOf(this._bumperBtn.scale)

    this._phys?.setWind?.(0, 0)
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Glansigt blått klot: markskugga + glansig cirkel + vit högdager + 3 fingerhål.
function makeBall() {
  // Delad klotboll (lib/foremal.js) — glansellipsen är borta, gradienten är dagern.
  const c = makeBoll(BALL_R, COLORS.blue, {
    kontur: 0x2c7cb5,
    konturBredd: 4,
    konturAlpha: 1,
    skugga: { y: 52, rx: 44, ry: 15 },
  })
  c.kropp.circle(3, -7, 5).fill({ color: 0x1f5a86 })
  c.kropp.circle(14, 3, 5).fill({ color: 0x1f5a86 })
  c.kropp.circle(1, 11, 5).fill({ color: 0x1f5a86 })
  c.hitArea = new Circle(0, 0, 90) // ≥96px osynlig träffyta (launchern sätter samma)
  return c
}

// En RITAD kägla (P0 ASSETS): flaskform med halsband och glans. 🎳-emojin visade
// dessutom en boll OCH käglor i varje "kägla" — helt fel föremål.
// Containern roteras av matter-länken när den välts.
export function makePin() {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, 30, 22, 9).fill({ color: 0x000000, alpha: 0.16 })
  shadow.eventMode = 'none'
  const e = new Graphics()
  e.moveTo(-9, -30)
    .quadraticCurveTo(-13, -18, -8, -10)
    .quadraticCurveTo(-22, 4, -16, 20)
    .quadraticCurveTo(-14, 28, 0, 28)
    .quadraticCurveTo(14, 28, 16, 20)
    .quadraticCurveTo(22, 4, 8, -10)
    .quadraticCurveTo(13, -18, 9, -30)
    .quadraticCurveTo(0, -35, -9, -30)
    .fill(0xfffdf7)
    .stroke({ width: 2.5, color: 0xd8d2c6 })
  e.moveTo(-11, -6).quadraticCurveTo(0, -2, 11, -6).stroke({ width: 5, color: 0xff6b6b })
  e.moveTo(-12, 2).quadraticCurveTo(0, 6, 12, 2).stroke({ width: 5, color: 0xff6b6b })
  e.moveTo(-8, -24).quadraticCurveTo(-12, -8, -9, 6).stroke({ width: 3, color: 0xffffff, alpha: 0.85 })
  e.eventMode = 'none'
  c.addChild(shadow, e)

  // Ansikte: ögonvitor sitter still, pupillerna bor i ett eget lager som spelet
  // riktar mot klotet (och spärrar upp när det närmar sig). Levande mål > rekvisita.
  const white = new Graphics()
  white.circle(-4.6, -20, 4.2).fill(0xffffff)
  white.circle(4.6, -20, 4.2).fill(0xffffff)
  white.stroke({ width: 1, color: 0xd8d2c6 })
  white.eventMode = 'none'
  const pupils = new Graphics()
  pupils.circle(-4.6, -8, 2.3).fill(0x3a3226)
  pupils.circle(4.6, -8, 2.3).fill(0x3a3226)
  pupils.eventMode = 'none'
  pupils.position.set(0, -12)
  const mouth = new Graphics()
  mouth.moveTo(-3.4, -14).quadraticCurveTo(0, -11, 3.4, -14).stroke({ width: 1.6, color: 0x3a3226, cap: 'round' })
  mouth.eventMode = 'none'
  c.addChild(white, pupils, mouth)
  c.pupils = pupils

  c.eventMode = 'none'
  return c
}

// Publik på en bänk: tre ritade åskådare (kropp, huvud, luva) som hoppar vid strike.
function makeCrowd() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false

  const bench = new Graphics()
  bench.roundRect(-104, 46, 208, 16, 8).fill(COLORS.brown)
  bench.roundRect(-86, 62, 14, 40, 6).fill(0x8a6a48)
  bench.roundRect(72, 62, 14, 40, 6).fill(0x8a6a48)
  bench.roundRect(-104, 6, 208, 12, 6).fill({ color: 0x8a6a48, alpha: 0.85 })
  c.addChild(bench)

  const fans = []
  const palette = [COLORS.blue, COLORS.pink, COLORS.teal]
  for (let i = 0; i < 3; i++) {
    const f = new Container()
    f.eventMode = 'none'
    const g = new Graphics()
    g.ellipse(0, 30, 20, 24).fill(palette[i % palette.length]) // kropp
    g.circle(0, -2, 19).fill(0xffe0bd) // huvud
    g.moveTo(-19, -6).quadraticCurveTo(0, -30, 19, -6).fill(palette[(i + 1) % palette.length]) // mössa
    g.circle(-6.5, -1, 2.6).fill(0x3a3226)
    g.circle(6.5, -1, 2.6).fill(0x3a3226)
    g.moveTo(-5, 7).quadraticCurveTo(0, 12, 5, 7).stroke({ width: 2, color: 0x3a3226, cap: 'round' })
    g.eventMode = 'none'
    f.addChild(g)
    f.position.set((i - 1) * 62, 0)
    f._baseY = 0
    c.addChild(f)
    fans.push(f)
  }
  c.fans = fans
  return c
}

// En pokal-stjärna till Bobos hylla.
function makeStar() {
  const c = makeStjarna(11, { farg: COLORS.yellow, kontur: 0xe0a83c, konturBredd: 2, innerKvot: 4.6 / 11 })
  c.eventMode = 'none'
  return c
}
