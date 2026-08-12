// Kugghjulen — barnet bygger en liten maskin: dra färgglada kugghjul på pinnarna
// så de GREPPAR (mesh) hela vägen från veven (vänster) till målhjulet/vinschen
// (höger). När kedjan är obruten glöder hjulen ("Den greppar!"), och när barnet
// VEVAR snurrar HELA raden på en gång (granne åt motsatt håll, snabbare ju mindre
// hjul) — målhjulet hissar Elviras flagga 🚩 och snurrar karusellen 🎠.
//
// Ingen matter.js: ren geometrisk rotationskoppling (mesh när mittavstånd ≈ r1+r2,
// BFS från veven ger djup → riktning (−1)^djup och fart r0/r). Allt deterministiskt
// och exit-säkert i ticker + GSAP. INGET misslyckande: fel hjul snurrar bara fritt,
// en glödande spök-kugg pekar på nästa pinne, rätt dispenser vinkar, och efter
// idle/missar flyger rätt hjul själv dit. Vinschen hissar flaggan oavsett vevriktning.
//
// Endast Pixi Graphics + emoji (inga filer). Elvira = enda avbildade människan.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { Rep, ritaRep } from '../../lib/rep.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, puff, sparkle, burst, breathe, bigCelebration, floatText, ripple , kvittera} from '../../lib/feedback.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { groundFill } from '../../lib/form.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Layout & fysikkonstanter (designkoordinater 1280×720) -----------------
const C = { x: 230, y: 360 } // vevens centrum (fast)
const R0 = 66 // vevens radie
const RT = 66 // målhjulets radie
const MESH_TOL = 14 // |dist − (rA+rB)| < detta ⇒ två hjul greppar
const FULL = Math.PI * 6 // total målrotation som hissar flaggan helt (≈3 varv)
const FLAG_TOP_Y = 150
const IDLE_RECUE = 6 // s utan interaktion → mjuk röst-recue
const IDLE_HELP = 14 // s utan interaktion → auto-hjälp flyger rätt hjul dit
const STUCK_HELP = 3 // antal placeringar utan framsteg → auto-hjälp

// Tre hjulstorlekar (radie + färg = storleks-ledtråd).
const SIZES = {
  S: { r: 50, color: COLORS.blue, x: 540 },
  M: { r: 66, color: COLORS.orange, x: 700 },
  L: { r: 84, color: COLORS.green, x: 860 },
}
// 660 klippte det stora L-kugghjulet (r=84 + kuggar) mot skärmkanten på 720.
const TRAY_Y = 624
const REM_X = 1030 // remmens plats på hyllan (170 px från L → 30 px mellan träffytorna)

// --- Drivremmen (`lib/rep.js`) --------------------------------------------
//
// Kugghjul kan bara greppa granne mot granne. Remmen är spelets FÖRSTA del som
// överbryggar ett GAP: två hjul som inte rör varandra kopplas ändå ihop — och de
// snurrar då åt SAMMA håll i stället för åt motsatt, vilket är hela dess poäng
// och det enda stället i spelet där riktningen bryter mönstret.
const REM_GAP = 190 // px mellan kuggkransarna i ett remspann (se `_buildChainPegs`)
const REM_COLOR = 0x4a4f5c // mörkt gummi
const REM_LUGG = 0x8b95a3 // ribborna som gör farten synlig
const REM_BREDD = 13 // remmens tjocklek
const REM_LUGG_AVST = 30 // px mellan ribborna
const REM_TROGHET = 0.55 // remmen väger också något (mätt i `_remprobe.mjs`)
const REM_SPAND = 0.99 // `Rep.spann`-sag när remmen greppar: nästan spikrak
const REM_SLAK = 1.3 // ...och när ett hjul saknas: den hänger synligt slak
const REM_PUNKTER = 12 // punkter per remspann (två spann när den greppar)
const REM_SNAPP = 70 // släpp-radie för remspåret (pinnarnas är 80 → ingen överlappning)
// ⚠️ REMMEN MÅSTE LÖPA UTANFÖR KUGGARNA FÖR ATT SYNAS. Först ritades omslaget på
// hjulets egen radie — och eftersom hjulen ligger i ett lager OVANFÖR remmen var
// bågarna helt dolda: banden slutade tvärt vid varje fälg i stället för att gå runt.
// Kuggarnas ytterkant ligger på r + 0,12·r (8 px vid r = 66), så 9 px lyfter bandet
// precis utanför dem. Utväxlingen räknas fortfarande på hjulens RIKTIGA radier.
const REM_LYFT = 9

// --- Dubbelhjulet (grenen + fläkten) --------------------------------------
const GREN_VINKEL = 1.15 // rad, uppåt-ut från basshjulet (~66°)
// ⚠️ 100 var FÖR NÄRA och det syntes bara på bilden: axeln mellan grenhjulet och
// fläkten blev 44 px, och fläktens vänstra blad (radie 38) täckte nästan hela den.
// 132 lämnar ~38 px synlig axel och håller sig ändå 58 px från flaggstången.
const FLAKT_DX = 132 // fläktens plats räknat från grenpinnen
const FLAKT_DY = -18
const FLAKT_R = 38 // bladradie (ytterkant 38 + nav → ryms över kedjan)

// Maskinens tröghet (se `_stegMaskin`). Talen är mätta i `scripts/_vevprobe.mjs`.
// ⚠️ KOPPLINGEN MÅSTE ORKA DRA DET TYNGSTA BYGGET SJÄLV. Med 0,12 blev momentet vid
// glapptaket bara 0,30·0,12/5,77 = 0,006 rad/ruta² — då var det den hårda klämman som
// släpade maskinen framåt, inte fjädern, och det tunga bygget nådde bara 0,054 rad/ruta
// mot fingrets 0,18. Kravet: gap·K/J ska bära fingrets fart även vid J = 5,77, alltså
// K ≥ 0,18·(1−damp)·J/gap = 0,52. 0,9 ger marginal och ett glapp på ~10° på tungt bygge,
// ~2° på en tom vev.
const VEV_SNABB = 1.2 // glapp → önskad fart (ger ~9° släp vid normalt vevtempo)
const VEV_MOMENT = 0.05 // hur mycket farten får ändras per bildruta vid tröghet 1
const VEV_MAXGAP = 0.3 // ~17°: hårt tak på hur långt handtaget får hamna efter fingret
const VEV_FRIKTION = 0.9 // svänghjulets avklingning per bildruta (delas med trögheten)
const VEV_MAXFART = 0.5 // rad/bildruta — taket, så inget kan skena

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const wrapAngle = (d) => Math.atan2(Math.sin(d), Math.cos(d))

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

export default {
  id: 'kugghjulen',
  titleSv: 'Kugghjulen',
  icon: '⚙️',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'kugghjulen',
  voiceIntro: 'Sätt kugghjulen på pinnarna så de greppar — veva sedan!',

  init(ctx) {
    this._alive = true
    this._gears = []
    this._pegViews = []
    this._solutionPegs = []
    this._dispensers = {}
    this._crankAngle = 0
    this._crankVel = 0 // maskinens fart (rad/bildruta) — svänghjulet
    this._fingerAngle = 0 // fingrets ackumulerade vinkel — veven dras mot den
    this._fingerVel = 0 // fingrets fart (framkoppling, se `_stegMaskin`)
    this._targetFactor = 0
    this._chainComplete = false
    this._resolving = false
    this._flagProgress = 0
    this._prevTargetAngle = 0
    this._lastFlagSpark = 0
    this._idle = 0
    this._helpIdle = 0
    this._stuck = 0
    this._cranking = false
    this._lastCrankSound = 0
    this._jitter = false
    this._rem = null

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST (varm verkstadston).
    this._root.addChild(createScene('warm', { ground: false, width: ctx.width, height: ctx.height }))

    // Osynlig fångare för tomma tryck (mjuk ring + ljud — aldrig en bestraffning).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onEmptyTap = (e) => {
      if (e.target !== this._catcher || !this._alive || this._resolving) return
      const p = this._root.toLocal(e.global)
      ctx.services.audio.sfx('soft')
      ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 60 })
      this._idle = 0
    }
    this._catcher.on('pointertap', this._onEmptyTap)
    this._root.addChild(this._catcher)

    // Pegboard-panel (träbrun verkstadsskiva) + håldekor.
    const panel = new Graphics()
    // Bradan lag pa 83 792 px i EN ton (`_plattprobe --medbakgrund`) — spelets storsta falt.
    //
    // ⚠️ Rampen ar HARD har, och det ar rakning och inte smak: fyllningen ar brun men ligger
    // pa alpha 0,16, sa den SYNLIGA kontrasten blir rampen GANGER alfan. Standardvardena
    // (0,14/0,28) hade slappt igenom en dryg tiondel av sitt spann och knappt rort talet.
    // Regeln att bara med sig: en lag alpha dampar toningen lika mycket som den dampar
    // fargen, sa en genomskinlig yta behover en HARDARE ramp an en tackande for samma
    // verkan. Alpha-vagen, se lib/form.js.
    panel.roundRect(120, 110, 1040, 470, 30).fill(groundFill(COLORS.brown, { light: 0.25, dark: 0.45, alpha: 0.16 })).stroke({ width: 8, color: COLORS.brown, alpha: 0.5 })
    for (let x = 150; x < 1160; x += 60) {
      for (let y = 140; y < 580; y += 60) {
        panel.circle(x, y, 4).fill({ color: COLORS.brown, alpha: 0.18 })
      }
    }
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Lager (alla i origo → designkoordinater matchar DragControllers _root-space).
    this._pole = new Graphics()
    this._pole.eventMode = 'none'
    this._root.addChild(this._pole)

    this._pegLayer = new Container()
    this._root.addChild(this._pegLayer)

    // Remmen ligger UNDER hjulen: den ska försvinna in bakom kuggkransen där den
    // löper runt, precis som en riktig rem gör.
    this._remLayer = new Container()
    this._remLayer.eventMode = 'none'
    this._remLayer.interactiveChildren = false
    this._root.addChild(this._remLayer)

    this._gearLayer = new Container()
    this._root.addChild(this._gearLayer)

    this._machineLayer = new Container()
    this._root.addChild(this._machineLayer)

    this._flagLayer = new Container()
    this._flagLayer.eventMode = 'none'
    this._flagLayer.interactiveChildren = false
    this._root.addChild(this._flagLayer)

    this._trayLayer = new Container()
    this._root.addChild(this._trayLayer)

    // Vev (fast, vänster) = rött kugghjul med gult handtag.
    this._crank = makeGear(R0, COLORS.red)
    const handle = new Graphics().circle(0, 0, 22).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white })
    handle.position.set(0.7 * R0, 0)
    handle.eventMode = 'none'
    this._crank.addChild(handle)
    this._crank.position.set(C.x, C.y)
    this._crank.eventMode = 'static'
    this._crank.cursor = 'pointer'
    this._crank.hitArea = new Circle(0, 0, 72)
    this._onCrankDown = (e) => this._crankDown(ctx, e)
    this._onCrankMove = (e) => this._crankMove(ctx, e)
    this._onCrankUp = () => this._crankUp(ctx)
    this._crank.on('pointerdown', this._onCrankDown)
    this._machineLayer.addChild(this._crank)

    // Målhjul / vinsch (fast, lila) — position sätts per nivå.
    this._targetWheel = makeGear(RT, COLORS.purple)
    const band = new Graphics().circle(0, 0, RT + 6).stroke({ width: 4, color: COLORS.purple, alpha: 0.5 })
    band.eventMode = 'none'
    this._targetWheel.addChildAt(band, 0)
    this._targetWheel.eventMode = 'none'
    this._machineLayer.addChild(this._targetWheel)

    // Karusell 🎠 + Elvira 👧 (belöning/dekor till höger om målet).
    // RITAD karusell (var 🎠): tak med vimplar, stolpe och en gunghäst.
    this._carousel = new Graphics()
    this._carousel.moveTo(-46, -14).lineTo(0, -54).lineTo(46, -14).closePath()
    this._carousel.fill(0xe0574f).stroke({ width: 4, color: 0xb03f3a })
    for (let i = -3; i <= 3; i++) this._carousel.moveTo(i * 13, -14).lineTo(i * 13 + 6, -4).lineTo(i * 13 + 12, -14).stroke({ width: 3, color: 0xfff0d8 })
    this._carousel.circle(0, -58, 6).fill(0xffd35c)
    this._carousel.roundRect(-4, -14, 8, 56, 4).fill(0xd9925e).stroke({ width: 3, color: 0x9a5c33 })
    this._carousel.roundRect(-34, 38, 68, 10, 5).fill(0xc98a4b).stroke({ width: 3, color: 0x9a5c33 })
    this._carousel.ellipse(-22, 16, 17, 12).fill(0xf0d7ae).stroke({ width: 3, color: 0xc98a4b }) // häst
    this._carousel.circle(-34, 4, 10).fill(0xf0d7ae).stroke({ width: 3, color: 0xc98a4b })
    this._carousel.circle(-37, 2, 2.5).fill(0x2b2b2b)
    this._carousel.roundRect(-30, 24, 5, 14, 2).fill(0xf0d7ae)
    this._carousel.roundRect(-16, 24, 5, 14, 2).fill(0xf0d7ae)
    this._carousel.eventMode = 'none'
    this._machineLayer.addChild(this._carousel)

    // RITAD fläkt — dubbelhjulets ANDRA gren (P0 ASSETS: fristående föremål, ingen
    // ikon i en ruta). Stativet står stilla och BLADEN snurrar, därför två Graphics:
    // en rotation på hela fläkten hade snurrat foten också.
    // Axeln mellan grenhjulet och fläkten. Utan den låg fläkten bara "i närheten" av
    // ett hjul — och hela spelet handlar om SYNLIG orsak. Den ritas i designkoordinater
    // (position 0,0) och bara i luckan mellan hjulets kuggkrans och fläktnavet, så den
    // aldrig lägger sig över kuggarna.
    this._flaktAxel = new Graphics()
    this._flaktAxel.eventMode = 'none'
    this._flaktAxel.visible = false
    this._machineLayer.addChild(this._flaktAxel)

    this._flaktStativ = new Graphics()
    this._flaktStativ.roundRect(-5, 4, 10, 62, 5).fill(0x8f97a5).stroke({ width: 3, color: 0x6b7280 })
    this._flaktStativ.ellipse(0, 70, 30, 9).fill(0xa8b0bd).stroke({ width: 3, color: 0x6b7280 })
    this._flaktStativ.circle(0, 0, 14).fill(0x6b7280)
    this._flaktStativ.eventMode = 'none'
    this._flaktStativ.visible = false
    this._machineLayer.addChild(this._flaktStativ)

    this._flaktBlad = new Graphics()
    // Bladen roteras i FÖRVÄG i geometrin (egna polygoner), inte med en transform per
    // form — Graphics har ingen per-form-rotation, och `_flaktBlad.rotation` är
    // reserverad för fläktens FART.
    const vrid = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      const p = []
      for (const [x, y] of [[13, -4], [FLAKT_R, -15], [FLAKT_R, 11], [13, 4]]) p.push(...vrid(x, y, a))
      this._flaktBlad.poly(p).fill(0xbfd8ef).stroke({ width: 2.5, color: 0x7a9cc0 })
    }
    this._flaktBlad.circle(0, 0, 9).fill(0xe8eef6).stroke({ width: 3, color: 0x7a9cc0 })
    this._flaktBlad.eventMode = 'none'
    this._flaktBlad.visible = false
    this._machineLayer.addChild(this._flaktBlad)

    // RITAD Elvira med KROPP (var en 👧-emoji, alltså ett svävande huvud).
    this._elvira = new Graphics()
    this._elvira.roundRect(-13, 14, 10, 24, 5).fill(0x7b5bd6)
    this._elvira.roundRect(3, 14, 10, 24, 5).fill(0x7b5bd6)
    this._elvira.roundRect(-17, 34, 15, 8, 4).fill(0x5c3720)
    this._elvira.roundRect(2, 34, 15, 8, 4).fill(0x5c3720)
    this._elvira.moveTo(-14, -12).lineTo(14, -12).lineTo(21, 18).lineTo(-21, 18).closePath()
    this._elvira.fill(0xef6aa8).stroke({ width: 3, color: 0xc4487f })
    this._elvira.roundRect(-25, -10, 9, 26, 4).fill(0xef6aa8).stroke({ width: 3, color: 0xc4487f })
    this._elvira.roundRect(16, -10, 9, 26, 4).fill(0xef6aa8).stroke({ width: 3, color: 0xc4487f })
    this._elvira.circle(0, -30, 20).fill(0xffd7b0).stroke({ width: 3, color: 0xe0b48c })
    this._elvira.arc(0, -30, 21, Math.PI, 0).fill(0xf2c14e)
    this._elvira.circle(-22, -24, 9).fill(0xf2c14e)
    this._elvira.circle(22, -24, 9).fill(0xf2c14e)
    this._elvira.circle(-7, -30, 3.5).fill(0x2b2b2b)
    this._elvira.circle(7, -30, 3.5).fill(0x2b2b2b)
    this._elvira.arc(0, -25, 7, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2.5, color: 0xb5504f })
    this._elvira.eventMode = 'none'
    this._machineLayer.addChild(this._elvira)

    // Flagga 🚩 (klättrar längs stången).
    // RITAD flagga (var 🚩).
    this._flag = new Graphics()
    this._flag.roundRect(-4, -30, 7, 60, 3).fill(0x8a5a3b).stroke({ width: 2.5, color: 0x6f4a2e })
    this._flag.moveTo(3, -28).lineTo(34, -14).lineTo(3, 0).closePath()
    this._flag.fill(0xe0392b).stroke({ width: 3, color: 0xb02b20 })
    this._flag.eventMode = 'none'
    this._flagLayer.addChild(this._flag)

    // Bricka (oändliga dispensrar i tre storlekar).
    const shelf = new Graphics().roundRect(120, 596, 1040, 104, 24).fill({ color: COLORS.brown, alpha: 0.22 })
    shelf.eventMode = 'none'
    this._trayLayer.addChild(shelf)
    for (const size of ['S', 'M', 'L']) {
      const def = SIZES[size]
      const view = makeGear(def.r, def.color)
      view.position.set(def.x, TRAY_Y)
      view.eventMode = 'static'
      view.cursor = 'pointer'
      view.hitArea = new Circle(0, 0, 70)
      this._trayLayer.addChild(view)
      this._dispensers[size] = { view, size, home: { x: def.x, y: TRAY_Y }, rec: null, hint: null }
    }
    // Remmen i hyllan — en hoprullad gummirem, ritad fristående (P0 ASSETS).
    // Syns bara på de nivåer som HAR ett gap; annars är den en död yta.
    const remView = makeRemRulle()
    remView.position.set(REM_X, TRAY_Y)
    remView.eventMode = 'none'
    remView.cursor = 'pointer'
    remView.hitArea = new Circle(0, 0, 70)
    remView.visible = false
    this._trayLayer.addChild(remView)
    this._dispensers.REM = { view: remView, size: 'REM', home: { x: REM_X, y: TRAY_Y }, rec: null, hint: null }

    this._drag = new DragController({ space: this._root, services: ctx.services, skugga: true })

    // Startnivå (cappad 1–5; cyklar längre/jittrade kedjor efteråt).
    this._level = clamp((ctx.progress.get().highestLevel | 0) || 1, 1, 5)
    this._buildLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivåuppbyggnad -----------------------------------------------------

  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._clearLevel(ctx)
    this._crankAngle = 0
    this._crankVel = 0 // maskinens fart (rad/bildruta) — svänghjulet
    this._fingerAngle = 0 // fingrets ackumulerade vinkel — veven dras mot den
    this._fingerVel = 0 // fingrets fart (framkoppling, se `_stegMaskin`)
    this._targetFactor = 0
    this._chainComplete = false
    this._resolving = false
    this._flagProgress = 0
    this._prevTargetAngle = 0
    this._lastFlagSpark = 0
    this._idle = 0
    this._helpIdle = 0
    this._stuck = 0
    this._jitter = level > 5

    const { solution, T, decoys, rem, gren } = this._buildChainPegs(level)
    this._solutionPegs = solution
    this._T = T
    this._gren = gren
    this._grenDrevFore = false

    // Rita pinn-hål + registrera som drop-mål. `accepts` skiljer nu på delarna:
    // ett kugghjul hör hemma på en pinne, remmen i sitt spår (och tvärtom).
    const allPegs = [...solution.map((s) => s.peg), ...decoys, ...(gren ? [gren.peg] : [])]
    for (const peg of allPegs) {
      const hole = new Graphics()
        .circle(0, 0, 16)
        .fill({ color: COLORS.inkSoft, alpha: 0.35 })
        .stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.5 })
      hole.position.set(peg.x, peg.y)
      hole.hitArea = new Circle(0, 0, 70)
      hole._peg = peg
      this._pegLayer.addChild(hole)
      this._pegViews.push(hole)
      this._drag.addTarget(hole, (d) => !this._resolving && !!d?.size, { hitRadius: 80 })
    }

    this._positionMachine()
    if (rem) this._setupRem(ctx, rem)

    // (Åter)registrera dispensrar som drag-källor.
    for (const size of ['S', 'M', 'L']) {
      const d = this._dispensers[size]
      gsap.killTweensOf(d.view)
      gsap.killTweensOf(d.view.scale)
      d.view.position.set(d.home.x, d.home.y)
      d.view.scale.set(1)
      d.view.rotation = 0
      d.view.eventMode = 'static'
      d.rec = this._drag.addItem(d.view, { size }, {
        onCorrect: (rec, target) => this._placeFromDispenser(ctx, rec, target),
        onMiss: (rec) => this._missDispenser(ctx, rec),
      })
    }
    const dr = this._dispensers.REM
    gsap.killTweensOf(dr.view)
    gsap.killTweensOf(dr.view.scale)
    dr.view.position.set(dr.home.x, dr.home.y)
    dr.view.scale.set(1)
    dr.view.rotation = 0
    dr.view.visible = !!rem
    dr.view.eventMode = rem ? 'static' : 'none'
    dr.rec = rem
      ? this._drag.addItem(dr.view, { rem: true }, {
        onCorrect: (rec) => this._placeRemFromDispenser(ctx, rec),
        onMiss: (rec) => this._missDispenser(ctx, rec),
      })
      : null

    this._rebuildMesh(ctx)
  },

  _clearLevel(ctx) {
    this._drag?.clear()
    this._autoCrankTween?.kill()
    for (const g of this._gears) this._killGearTweens(g)
    for (const g of this._gears) if (g.view && !g.view.destroyed) g.view.destroy()
    this._gears = []
    this._ghostBreathe?.kill()
    this._ghostBreathe = null
    if (this._ghost && !this._ghost.destroyed) this._ghost.destroy()
    this._ghost = null
    this._stopDispenserHints()
    this._clearRem()
    for (const v of this._pegViews) if (v && !v.destroyed) v.destroy()
    this._pegViews = []
    this._gren = null
    this._grenDrevFore = false
    for (const o of [this._carousel, this._elvira, this._flag, this._targetWheel, this._flaktBlad, this._flaktStativ, this._flaktAxel]) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
  },

  // Marschera pinnar från veven: varje granne-par greppar (mittavstånd = r_a+r_b).
  // EN länk kan i stället vara ett REMSPANN: då läggs `REM_GAP` till avståndet, så
  // hjulen omöjligt kan nå varandra och remmen är den enda vägen över.
  //
  // Länk k kopplar nod k till nod k+1, där nod 0 = veven, nod j = `solution[j-1]`
  // och sista noden = målhjulet. `pat.rem` är alltså ett LÄNK-index, inte ett hjul.
  _buildChainPegs(level) {
    const pat = this._pattern(level)
    const sizes = pat.sizes
    const remLink = pat.rem == null ? -1 : pat.rem
    let px = C.x
    let py = C.y
    let pr = R0
    const solution = []
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i]
      const r = SIZES[size].r
      const belt = i === remLink
      const d = pr + r + (belt ? REM_GAP : 0) // mittavstånd som ger exakt mesh (eller gap)
      // Remspannet lutas tydligt: en rem som går snett LÄSER som en rem, en vågrät
      // läser som ett streck mellan två hjul.
      const alpha = belt
        ? (i % 2 === 0 ? -1 : 1) * 0.2
        : (i % 2 === 0 ? 1 : -1) * 0.05 + (this._jitter ? (Math.random() * 2 - 1) * 0.02 : 0)
      px += d * Math.cos(alpha)
      py += d * Math.sin(alpha)
      const peg = { x: px, y: clamp(py, 210, 560), gear: null }
      py = peg.y
      solution.push({ peg, size })
      pr = r
    }
    // Målhjulet så avståndet från sista hjulet = r_sista + RT (greppar).
    const dT = pr + RT + (remLink === sizes.length ? REM_GAP : 0)
    const T = { x: px + dT * Math.cos(0.04), y: clamp(py + dT * Math.sin(0.04), 210, 540) }

    // Decoy-pinnar (lock): en extra tom väg som inte leder till målet.
    const decoys = []
    const nDecoy = pat.decoys == null ? (level >= 5 ? 2 : level >= 4 ? 1 : 0) : pat.decoys
    for (let k = 0; k < nDecoy; k++) {
      const base = solution[Math.min(solution.length - 1, 1 + k)].peg
      const off = (k % 2 === 0 ? 1 : -1) * 130
      decoys.push({ x: clamp(base.x + (Math.random() * 40 - 20), 200, 1120), y: clamp(base.y + off, 210, 560), gear: null })
    }

    const rem = remLink < 0 ? null : {
      link: remLink,
      aRef: remLink === 0 ? { kind: 'crank' } : { kind: 'gear', index: remLink - 1 },
      bRef: remLink === sizes.length ? { kind: 'target' } : { kind: 'gear', index: remLink },
    }

    // DUBBELHJULET: en pinne som hänger på ETT av kedjans hjul, så det hjulet driver
    // TVÅ vägar — kedjan vidare mot målet OCH en fläkt. Mesh-grafen behövde inte
    // ändras en rad: `_rebuildMesh` länkar rent geometriskt och BFS:en bär riktning
    // och utväxling på LÄNKEN, så en gren drivs redan korrekt (ω = ω_bas · r_bas/r_gren,
    // motsatt håll). Det enda som saknades var en pinne på rätt avstånd.
    //
    // Grenen ligger UTANFÖR `solution`, alltså utanför frontier, spök-hinten,
    // auto-hjälpen och vinstvillkoret: den är en BONUS barnet kan upptäcka, aldrig
    // ett krav. No-fail-garantin är därför orörd.
    let gren = null
    if (pat.gren) {
      const bas = solution[pat.gren.at]
      const d = SIZES[bas.size].r + SIZES[pat.gren.size].r // exakt mesh-avstånd
      // Uppåt (se `_pattern`). GREN_VINKEL lutar den ut från kedjan så grenhjulet
      // varken skymmer eller RÅKAR greppa nästa hjul i raden (uppmätt marginal:
      // 33,7 px mot MESH_TOL 14 för nivå 8:s geometri).
      gren = {
        size: pat.gren.size,
        basIndex: pat.gren.at,
        peg: {
          x: bas.peg.x + d * Math.cos(GREN_VINKEL),
          y: bas.peg.y - d * Math.sin(GREN_VINKEL),
          gear: null,
        },
      }
    }
    return { solution, T, decoys, rem, gren }
  },

  // Nivå 5 byter det gamla femhjulsbygget mot remmen: senare nivåer ska bli
  // KVALITATIVT nya, inte bara längre. Det långa bygget finns kvar som nivå 6.
  _pattern(level) {
    const base = {
      1: { sizes: ['M'] },
      2: { sizes: ['M', 'L'] },
      3: { sizes: ['L', 'M', 'L'] },
      4: { sizes: ['M', 'L', 'S', 'M'] },
      5: { sizes: ['M', 'S', 'M'], rem: 1, decoys: 1 }, // remmen introduceras ensam
      6: { sizes: ['M', 'L', 'M', 'L', 'M'] }, // det långa bygget (var nivå 5)
      7: { sizes: ['L', 'M', 'S'], rem: 2, decoys: 2 }, // rem + lock tillsammans
      // Nivå 8: DUBBELHJULET introduceras ensamt (samma skäl som remmen på 5).
      // `gren.at` = index i `sizes` för det hjul som ska driva TVÅ vägar.
      // Grenen går UPPÅT: utrymmet under kedjan är bara ~60 px innan brickan
      // (TRAY_Y 624, L-hjulets ytterkant 540), så en gren nedåt hade krockat.
      // `decoys: 0` är inte kosmetik: utan den ärver nivån 2 automatiska lock, och
      // ett av dem hamnade 98 px från grenpinnen (mätt i `_grenprobe`). Ett S-hjul
      // där hade greppat grenhjulet (96 px mot radiesumman 100 — under MESH_TOL 14)
      // och gjort locket drivet. Dubbelhjulet introduceras ensamt, precis som remmen.
      8: { sizes: ['M', 'L', 'M'], gren: { at: 1, size: 'S' }, decoys: 0 },
    }
    if (level <= 8) return base[level]
    return randomFrom([base[4], base[5], base[6], base[7], base[8]])
  },

  _positionMachine() {
    const T = this._T
    this._targetWheel.position.set(T.x, T.y)
    this._carousel.position.set(T.x + 96, T.y + 96)
    this._elviraHome = { x: T.x + 150, y: T.y + 96 }
    if (this._elvira && !this._elvira.destroyed) {
      this._elvira.text = '👧'
      this._elvira.position.set(this._elviraHome.x, this._elviraHome.y)
    }
    this._pole.clear()
    this._pole.moveTo(T.x, T.y - 30).lineTo(T.x, FLAG_TOP_Y).stroke({ width: 10, color: COLORS.inkSoft })
    this._flagBottom = T.y - 40
    this._flag.position.set(T.x, this._flagBottom)

    // Fläkten står bredvid grenpinnen (samma konvention som karusellen bredvid
    // målhjulet) och finns bara på nivåer med ett dubbelhjul.
    const gren = this._gren
    for (const o of [this._flaktStativ, this._flaktBlad]) {
      if (!o || o.destroyed) continue
      o.visible = !!gren
      if (gren) o.position.set(gren.peg.x + FLAKT_DX, gren.peg.y + FLAKT_DY)
    }
    if (this._flaktBlad && !this._flaktBlad.destroyed) this._flaktBlad.rotation = 0
    if (this._flaktAxel && !this._flaktAxel.destroyed) {
      this._flaktAxel.clear()
      this._flaktAxel.visible = !!gren
      if (gren) {
        const L = Math.hypot(FLAKT_DX, FLAKT_DY)
        const ux = FLAKT_DX / L
        const uy = FLAKT_DY / L
        const r0 = SIZES[gren.size].r + 6 // strax utanför kuggkransen
        this._flaktAxel
          .moveTo(gren.peg.x + ux * r0, gren.peg.y + uy * r0)
          .lineTo(gren.peg.x + FLAKT_DX, gren.peg.y + FLAKT_DY)
          .stroke({ width: 9, color: 0x8f97a5, cap: 'round' })
      }
    }
  },

  // ---- Drivremmen ---------------------------------------------------------
  //
  // Kugghjulen kan bara greppa granne mot granne, så maskinen har hittills alltid
  // varit en obruten rad. Remmen är den första delen som bryter det: den kopplar
  // två hjul som INTE rör varandra, och den gör det med SAMMA rotationsriktning
  // (kuggar vänder, en rem behåller). Utväxlingen är densamma — ytfarten är
  // gemensam, alltså ω_b = ω_a · r_a / r_b — så det enda som skiljer är tecknet.
  //
  // Remmen ritas ur `lib/rep.js`: två verlet-spann mellan tangentpunkterna plus
  // omslagsbågarna på hjulen. Det ger gratis den enda egenskap som gör en rem
  // läsbar för ett barn: när ett hjul saknas HÄNGER den slak, och i samma stund
  // den greppar spänns den.

  _setupRem(ctx, rem) {
    const A = this._remNod(rem.aRef)
    const B = this._remNod(rem.bRef)
    rem.slot = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
    rem.placed = false
    rem.gripping = false
    rem._greppFore = false
    rem._seedad = false
    rem.phase = 0
    const repOpt = { n: REM_PUNKTER, grav: 0.3, damp: 0.94, iter: 10, maxSpeed: 40 }
    rem.repA = new Rep(repOpt)
    rem.repB = new Rep(repOpt)

    rem.ghost = new Graphics()
    this._remLayer.addChild(rem.ghost)
    rem.view = new Graphics()
    rem.view.visible = false
    this._remLayer.addChild(rem.view)

    // Remspåret: dit remmen ska. Ritad markör (≥96 px träffyta) som andas lugnt.
    const slot = new Graphics()
    slot.circle(0, 0, 34).stroke({ width: 5, color: COLORS.inkSoft, alpha: 0.55 })
    slot.circle(0, 0, 21).stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.35 })
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      slot.moveTo(Math.cos(a) * 21, Math.sin(a) * 21).lineTo(Math.cos(a) * 34, Math.sin(a) * 34)
    }
    slot.stroke({ width: 3, color: COLORS.inkSoft, alpha: 0.35 })
    slot.position.set(rem.slot.x, rem.slot.y)
    slot.hitArea = new Circle(0, 0, 50)
    this._pegLayer.addChild(slot)
    rem.slotView = slot
    rem.slotBreathe = null
    rem._sagt = false
    // ⚠️ REMSPÅRETS RING FÅR INTE ANDAS FRÅN NIVÅSTART. Då pulsar den samtidigt som
    // spök-kuggen på första pinnen, och två pulserande mål tävlar om blicken innan
    // barnet ens lagt sitt första hjul. Den vaknar i `_updateHint`, när remmen
    // FAKTISKT är nästa del. (Vänd-ringen nedan lyder samma regel, se
    // `_uppdateraVandRing`.)
    this._drag.addTarget(slot, (d) => !this._resolving && !!d?.rem, { hitRadius: REM_SNAPP })

    // VÄND-YTAN: ett tryck mitt på remmen korsar den (och tvärtom). Två skilda noder
    // med flit — ringen andas, och en träffyta som guppar flyttar sig undan fingret
    // (samma fälla som `sortera-skrap`s tunnor: animera aldrig noden som bär hitArea).
    // Ytan ligger på `rem.slot`, alltså exakt där remspårets P0-luft redan är mätt.
    const vand = new Graphics()
    vand.position.set(rem.slot.x, rem.slot.y)
    vand.hitArea = new Circle(0, 0, 50) // 100 px träffyta ≥ P0:s 96
    vand.eventMode = 'none' // vaknar först när remmen greppar (`_rebuildMesh`)
    vand.cursor = 'pointer'
    this._pegLayer.addChild(vand)
    rem.vandZon = vand

    const ring = new Graphics()
    ring.position.set(rem.slot.x, rem.slot.y)
    ring.eventMode = 'none'
    ring.visible = false
    this._pegLayer.addChild(ring)
    rem.vandRing = ring
    rem.vandPuls = null
    rem.vandad = false
    rem.korsad = false
    rem._korsadFore = false
    rem._vandSagt = false
    rem._onVand = () => this._vandRem(ctx)
    vand.on('pointerdown', rem._onVand)

    this._rem = rem
  },

  _clearRem() {
    const rem = this._rem
    this._rem = null
    if (!rem) return
    rem.slotBreathe?.kill?.()
    rem.hint?.kill?.()
    rem.flyg?.kill?.()
    rem.vandPuls?.kill?.()
    rem.vandPuls = null
    if (rem.vandZon && !rem.vandZon.destroyed) {
      rem.vandZon.eventMode = 'none'
      if (rem._onVand) rem.vandZon.off('pointerdown', rem._onVand)
    }
    for (const v of [rem.view, rem.ghost, rem.slotView, rem.vandZon, rem.vandRing]) {
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    rem.repA?.destroy?.()
    rem.repB?.destroy?.()
  },

  // Var remmens ände sitter just nu. `ok` = det finns ett hjul att löpa runt;
  // utan hjul faller radien ihop till pinnen och remmen hänger slak därifrån.
  _remNod(ref) {
    if (ref.kind === 'crank') return { x: C.x, y: C.y, r: R0, ok: true }
    if (ref.kind === 'target') return { x: this._T.x, y: this._T.y, r: RT, ok: true }
    const peg = this._solutionPegs[ref.index]?.peg
    if (!peg) return { x: C.x, y: C.y, r: 16, ok: false }
    // Vilket hjul som helst duger — en rem bryr sig inte om kuggar, bara om en fälg.
    return { x: peg.x, y: peg.y, r: peg.gear ? peg.gear.r : 16, ok: !!peg.gear }
  },

  _remNodIndex(ref, nodes) {
    if (ref.kind === 'crank') return 0
    if (ref.kind === 'target') return nodes.length - 1
    const peg = this._solutionPegs[ref.index]?.peg
    if (!peg || !peg.gear) return -1
    return nodes.findIndex((nd) => nd.peg === peg)
  },

  // Vinkelfarten hos en ände (rad/bildruta) — remmens ytfart är ω · r.
  _remOmega(ref) {
    if (ref.kind === 'crank') return this._crankVel
    if (ref.kind === 'target') return this._crankVel * this._targetFactor
    const g = this._solutionPegs[ref.index]?.peg?.gear
    if (!g) return 0
    return g.driven ? this._crankVel * g.factor : g.freeVel
  },

  _placeRemFromDispenser(ctx, rec) {
    this._resetDispenser(rec)
    if (!this._alive) return
    this._placeRem(ctx)
  },

  _placeRem(ctx) {
    const rem = this._rem
    if (!this._alive || !rem || rem.placed) return
    rem.placed = true
    rem._seedad = false
    rem.view.visible = true
    if (rem.ghost && !rem.ghost.destroyed) rem.ghost.visible = false
    rem.slotBreathe?.kill()
    rem.slotBreathe = null
    if (rem.slotView && !rem.slotView.destroyed) {
      rem.slotView.visible = false
      rem.slotView.eventMode = 'none'
    }
    // Remmen är förbrukad — hyllplatsen ska inte bli en död yta att trycka på.
    const dr = this._dispensers.REM
    if (dr?.view && !dr.view.destroyed) {
      dr.hint?.kill()
      dr.hint = null
      dr.view.visible = false
      dr.view.eventMode = 'none'
    }
    this._idle = 0
    this._helpIdle = 0
    this._stuck = 0
    ctx.services.audio.sfx('pop')
    sparkle(ctx.fxLayer, rem.slot.x, rem.slot.y, { count: 6 })
    this._rebuildMesh(ctx)
  },

  // ---- Vänd remmen: rak ⇄ korsad ------------------------------------------
  //
  // Kuggar vänder alltid riktningen, så en kedja av dem kan bara ge de två håll
  // pariteten råkar ge. Remmen är den enda del som kan välja: rak behåller hållet,
  // korsad vänder det. Barnet ser ett X och karusellen som byter håll — mekaniskt
  // sant och begripligt utan ett ord.
  //
  // Vinstvillkoret rörs INTE: flaggan hissas på |Δvinkel|, alltså åt båda hållen
  // (`_stegMaskin`). Att vända kan därför aldrig ta bort framsteg — no-fail står.
  _vandRem(ctx) {
    const rem = this._rem
    if (!this._alive || this._resolving || !rem || !rem.placed || !rem.gripping) return
    rem.korsad = !rem.korsad
    rem.vandad = true
    this._idle = 0
    this._helpIdle = 0
    this._slackVandRing()

    // Återkoppling <100 ms: ljud + bild i samma bildruta som trycket.
    ctx.services.audio.sfx('flip')
    ctx.services.audio.tone?.(rem.korsad
      ? { freq: 150, slideTo: 330, dur: 0.2, type: 'sine', vol: 0.4 }
      : { freq: 330, slideTo: 150, dur: 0.2, type: 'sine', vol: 0.4 })
    sparkle(ctx.fxLayer, rem.slot.x, rem.slot.y, { count: 7 })

    // Riktningen räknas om direkt: BFS:en läser `rem.korsad` på länken.
    this._rebuildMesh(ctx)

    // Karusellen är det barnet tittar på — låt den kvittera med en liten studs.
    if (this._carousel && !this._carousel.destroyed) this._popScale(this._carousel, 1.14)
    this._setElvira(rem.korsad ? '😮' : '😊')
    if (!rem._vandSagt) {
      rem._vandSagt = true
      ctx.services.voice.say('Nu snurrar den åt andra hållet!')
    }
  },

  // Ringen som visar att remmen går att trycka på. Den vaknar först när maskinen
  // FAKTISKT går — under bygget tävlar den annars med spök-kuggen om blicken,
  // precis som remspårets egen ring en gång gjorde.
  _uppdateraVandRing() {
    const rem = this._rem
    if (!rem || !rem.vandRing || rem.vandRing.destroyed) return
    const vill = !!rem.placed && !!rem.gripping && !rem.vandad && !this._resolving && this._chainComplete
    if (vill === !!rem.vandPuls) return
    if (!vill) return this._slackVandRing()

    // Två bågar med var sin pilspets, 180° isär: den vedertagna "vänd"-symbolen.
    // Pilspetsen sitter i bågens SLUT och pekar längs tangenten — en pil ritad på
    // radien pekar in mot mitten och läser som ett streck, inte som en riktning.
    const g = rem.vandRing.clear()
    const R = 40
    const A0 = 0.55
    const A1 = 2.5
    for (const v of [0, Math.PI]) {
      g.moveTo(Math.cos(A0 + v) * R, Math.sin(A0 + v) * R).arc(0, 0, R, A0 + v, A1 + v)
    }
    g.stroke({ width: 7, color: COLORS.inkSoft, alpha: 0.5, cap: 'round' })
    for (const v of [0, Math.PI]) {
      const a = A1 + v
      const px = Math.cos(a) * R
      const py = Math.sin(a) * R
      const tx = -Math.sin(a) // tangent åt växande vinkel = pilens riktning
      const ty = Math.cos(a)
      const nx = Math.cos(a)
      const ny = Math.sin(a)
      g.moveTo(px + tx * 17, py + ty * 17)
        .lineTo(px + nx * 12 - tx * 2, py + ny * 12 - ty * 2)
        .lineTo(px - nx * 12 - tx * 2, py - ny * 12 - ty * 2)
        .closePath()
    }
    g.fill({ color: COLORS.inkSoft, alpha: 0.5 })
    rem.vandRing.visible = true
    rem.vandRing.scale.set(1)
    rem.vandPuls = gsap.to(rem.vandRing.scale, {
      x: 1.12, y: 1.12, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  },

  _slackVandRing() {
    const rem = this._rem
    if (!rem) return
    rem.vandPuls?.kill()
    rem.vandPuls = null
    if (rem.vandRing && !rem.vandRing.destroyed) {
      gsap.killTweensOf(rem.vandRing.scale)
      rem.vandRing.scale.set(1)
      rem.vandRing.visible = false
    }
  },

  // Remmen slöt kedjan: ett gummiartat "flopp" i stället för kuggarnas klonk.
  _onRemGrips(ctx) {
    const rem = this._rem
    if (!rem) return
    ctx.services.audio.sfx('match')
    ctx.services.audio.tone?.({ freq: 210, slideTo: 96, dur: 0.22, type: 'sine', vol: 0.45 })
    sparkle(ctx.fxLayer, rem.slot.x, rem.slot.y, { count: 8 })
    ctx.services.voice.say('Remmen sitter!')
  },

  // Auto-hjälpen lägger remmen åt barnet (no-fail) — samma flygning som ett hjul.
  _autoRem(ctx) {
    const rem = this._rem
    const dr = this._dispensers.REM
    if (!rem || rem.placed || !dr?.view || dr.view.destroyed) return
    ctx.services.voice.say('Titta!')
    floatText(ctx.fxLayer, dr.home.x, dr.home.y - 50, 'Titta!')
    const st = { x: dr.home.x, y: dr.home.y }
    dr.view.visible = true
    rem.flyg = gsap.to(st, {
      x: rem.slot.x, y: rem.slot.y, duration: 0.7, ease: 'power2.inOut',
      onUpdate: () => {
        if (!this._alive || dr.view.destroyed) {
          rem.flyg?.kill()
          return
        }
        dr.view.position.set(st.x, st.y)
      },
      onComplete: () => {
        rem.flyg = null
        if (!this._alive || dr.view.destroyed) return
        dr.view.position.set(dr.home.x, dr.home.y)
        this._placeRem(ctx)
      },
    })
    this._stuck = 0
    this._idle = 0
    this._helpIdle = 0
  },

  // ---- Remmen per bildruta -------------------------------------------------

  _stegRem(dt) {
    const rem = this._rem
    if (!rem || !rem.view || rem.view.destroyed) return
    const A = this._remNod(rem.aRef)
    const B = this._remNod(rem.bRef)

    // Bandet löper strax utanför kuggarna (se REM_LYFT); fysiken rör inte radierna.
    const AL = { ...A, r: A.r + REM_LYFT }
    const BL = { ...B, r: B.r + REM_LYFT }

    if (!rem.placed) {
      // Spökrutt: visar VAR remmen kommer att löpa, redan innan den finns.
      if (rem.ghost && !rem.ghost.destroyed) {
        const g = rem.ghost.clear()
        g.alpha = 0.22
        this._ritaRemBana(g, AL, BL, A.ok && B.ok, REM_BREDD * 0.7, null)
      }
      return
    }

    const griper = A.ok && B.ok
    // Remmens ytfart följer den ände som faktiskt driver.
    const yta = this._remOmega(rem.aRef) * A.r || this._remOmega(rem.bRef) * B.r
    rem.phase += yta * dt

    // Lägg om repet när remmen VÄNDS också — annars piskar den in från förra
    // bildrutans raka form och X:et föds som en knut.
    if (!rem._seedad || rem._griperFore !== griper || rem._korsadFore !== rem.korsad) {
      this._seedRem(rem, AL, BL, griper)
      rem._seedad = true
      rem._griperFore = griper
      rem._korsadFore = rem.korsad
    }
    this._ritaRemBana(rem.view.clear(), AL, BL, griper, REM_BREDD, rem, dt)
  },

  // Lägg repets punkter längs den räta linjen de ska spännas mellan — annars
  // piskar remmen in från förra bildrutans form när den byter läge.
  _seedRem(rem, A, B, griper) {
    const spann = griper ? remTangenter(A, B, !!rem.korsad) : null
    const fri = griper ? null : remFriaAndar(A, B)
    const lagg = (rep, ax, ay, bx, by) => {
      rep.pts = []
      for (let i = 0; i < rep.n; i++) {
        const u = i / (rep.n - 1)
        const x = ax + (bx - ax) * u
        const y = ay + (by - ay) * u
        rep.pts.push({ x, y, px: x, py: y })
      }
    }
    if (griper) {
      lagg(rem.repA, spann.t1.ax, spann.t1.ay, spann.t1.bx, spann.t1.by)
      lagg(rem.repB, spann.t2.ax, spann.t2.ay, spann.t2.bx, spann.t2.by)
    } else {
      lagg(rem.repA, fri.ax, fri.ay, fri.bx, fri.by)
    }
  },

  // Ritar remmen (eller dess spöke). `rem === null` ⇒ bara konturen, ingen fysik.
  _ritaRemBana(g, A, B, griper, bredd, rem, dt = 1) {
    const mork = darken(REM_COLOR, 0.4)
    if (!griper) {
      // Ett hjul saknas: remmen hänger slak från den fälg som FINNS ned till den
      // tomma pinnen — synligt "inte klar än", och den hänger från kanten, inte
      // från navet (en rem sitter på fälgen).
      const fri = remFriaAndar(A, B)
      if (rem) {
        rem.repA.spann(fri.ax, fri.ay, fri.bx, fri.by, REM_SLAK)
        rem.repA.steg(dt)
        ritaRep(g, rem.repA, { width: bredd, color: REM_COLOR, dager: 0.2 })
      } else {
        const mx = (fri.ax + fri.bx) / 2
        const my = (fri.ay + fri.by) / 2 + Math.hypot(fri.bx - fri.ax, fri.by - fri.ay) * 0.16
        g.moveTo(fri.ax, fri.ay).quadraticCurveTo(mx, my, fri.bx, fri.by).stroke({ width: bredd, color: REM_COLOR, cap: 'round' })
      }
      return
    }

    const korsad = !!rem?.korsad
    const { beta, psi, t1, t2 } = remTangenter(A, B, korsad)
    const bagA = (gg) => gg
      .moveTo(A.x + A.r * Math.cos(beta + psi), A.y + A.r * Math.sin(beta + psi))
      .arc(A.x, A.y, A.r, beta + psi, beta + Math.PI * 2 - psi)
    // Rak rem: omslaget på B är den KORTA bågen mot A (tillsammans blir de ett varv).
    // Korsad rem: båda hjulen lindas på sin bortre sida, alltså 2π−2ψ vardera — en
    // korsad rem greppar mer av båda hjulen, och det syns.
    const bagB = korsad
      ? (gg) => gg
        .moveTo(B.x - B.r * Math.cos(beta + psi), B.y - B.r * Math.sin(beta + psi))
        .arc(B.x, B.y, B.r, beta + Math.PI + psi, beta + Math.PI * 3 - psi)
      : (gg) => gg
        .moveTo(B.x + B.r * Math.cos(beta - psi), B.y + B.r * Math.sin(beta - psi))
        .arc(B.x, B.y, B.r, beta - psi, beta + psi)

    if (rem) {
      rem.repA.spann(t1.ax, t1.ay, t1.bx, t1.by, REM_SPAND)
      rem.repB.spann(t2.ax, t2.ay, t2.bx, t2.by, REM_SPAND)
      rem.repA.steg(dt)
      rem.repB.steg(dt)
    }

    bagA(g)
    bagB(g)
    g.stroke({ width: bredd + 3, color: mork, cap: 'round' })
    bagA(g)
    bagB(g)
    g.stroke({ width: bredd, color: REM_COLOR, cap: 'round' })

    if (rem) {
      ritaRep(g, rem.repA, { width: bredd, color: REM_COLOR, dager: 0.22 })
      ritaRep(g, rem.repB, { width: bredd, color: REM_COLOR, dager: 0.22 })
      this._ritaRibbor(g, rem)
    } else {
      g.moveTo(t1.ax, t1.ay).lineTo(t1.bx, t1.by)
      g.moveTo(t2.ax, t2.ay).lineTo(t2.bx, t2.by)
      g.stroke({ width: bredd, color: REM_COLOR, cap: 'round' })
    }
  },

  // Ribborna gör FARTEN synlig: utan dem är en rem i rörelse en stillastående linje.
  // De två spannen löper åt motsatt håll runt slingan, därav `riktning`.
  _ritaRibbor(g, rem) {
    let nagon = false
    for (const [rep, riktning] of [[rem.repA, 1], [rem.repB, -1]]) {
      const S = REM_LUGG_AVST
      const off = (((rem.phase * riktning) % S) + S) % S
      const pts = rep.pts
      let dist = 0
      let nasta = off
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const L = Math.hypot(dx, dy)
        if (L < 0.001) continue
        while (nasta < dist + L) {
          const u = (nasta - dist) / L
          const h = REM_BREDD * 0.42
          const nx = (-dy / L) * h
          const ny = (dx / L) * h
          const x = a.x + dx * u
          const y = a.y + dy * u
          g.moveTo(x - nx, y - ny).lineTo(x + nx, y + ny)
          nasta += S
          nagon = true
        }
        dist += L
      }
    }
    if (nagon) g.stroke({ width: 3, color: REM_LUGG, alpha: 0.85, cap: 'round' })
  },

  // ---- Placera hjul från en dispenser -------------------------------------

  _placeFromDispenser(ctx, rec, target) {
    this._resetDispenser(rec)
    if (!this._alive) return
    const peg = target.view?._peg
    if (!peg) return
    this._idle = 0
    this._helpIdle = 0
    const before = this._frontierIndex()
    ctx.services.audio.sfx('pop')
    this._spawnGear(ctx, peg, rec.data.size, {})
    sparkle(ctx.fxLayer, peg.x, peg.y, { count: 5 })
    // Elvira följer bygget med blicken (liten nyfiken puls per hjul).
    if (!this._chainComplete) this._setElvira('😊')
    this._rebuildMesh(ctx)
    const after = this._frontierIndex()
    if (after > before) this._stuck = 0
    else this._stuck++
    if (this._stuck >= STUCK_HELP && !this._chainComplete) {
      this._stuck = 0
      gsap.delayedCall(0.5, () => this._alive && this._autoHelp(ctx))
    }
  },

  _missDispenser(ctx, rec) {
    if (!this._alive) return
    ctx.services.audio.sfx('soft')
    if (rec.view && !rec.view.destroyed) puff(ctx.fxLayer, rec.view.x, rec.view.y)
  },

  // DragController flyttade dispenser-vyn till pinnen + satte placed=true; skicka
  // tillbaka den till brickan så förrådet är oändligt.
  _resetDispenser(rec) {
    gsap.killTweensOf(rec.view)
    rec.placed = false
    rec.view.eventMode = 'static'
    rec.view.cursor = 'pointer'
    const home = rec.home || { x: rec.view.x, y: rec.view.y }
    rec.view.position.set(home.x, home.y)
    rec.view.scale.set(rec.base?.x || 1, rec.base?.y || 1)
    if (!rec.view.destroyed) pop(rec.view, { scale: 1.08 })
  },

  // Skapa ett permanent hjul på en pinne (ersätt ev. befintligt). opts.from →
  // hjulet flyger dit från brickan (auto-hjälp), annars studsar det in på plats.
  _spawnGear(ctx, peg, size, opts = {}) {
    if (peg.gear) this._removeGearFromPeg(ctx, peg)
    const def = SIZES[size]
    const view = makeGear(def.r, def.color)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 70)
    const gear = { view, r: def.r, size, peg, driven: false, depth: -1, factor: 0, freeAngle: 0, freeVel: 0, fly: null }
    gear.onTap = () => this._tapGear(ctx, gear)
    view.on('pointertap', gear.onTap)
    peg.gear = gear
    this._gears.push(gear)
    this._gearLayer.addChild(view)
    if (opts.from) {
      view.position.set(opts.from.x, opts.from.y)
      const st = { x: opts.from.x, y: opts.from.y }
      gear.fly = gsap.to(st, {
        x: peg.x, y: peg.y, duration: 0.7, ease: 'power2.inOut',
        onUpdate: () => {
          if (!this._alive || view.destroyed) {
            gear.fly?.kill()
            return
          }
          view.position.set(st.x, st.y)
        },
        onComplete: () => {
          gear.fly = null
          if (!this._alive || view.destroyed) return
          view.position.set(peg.x, peg.y)
          pop(view)
          ctx.services.audio.sfx('match')
          sparkle(ctx.fxLayer, peg.x, peg.y)
          this._rebuildMesh(ctx)
        },
      })
    } else {
      view.position.set(peg.x, peg.y)
      bounceIn(view, { duration: 0.4 })
    }
    return gear
  },

  _removeGearFromPeg(ctx, peg) {
    const old = peg.gear
    if (!old) return
    peg.gear = null
    this._gears = this._gears.filter((g) => g !== old)
    this._killGearTweens(old)
    if (old.view && !old.view.destroyed) {
      puff(ctx.fxLayer, peg.x, peg.y)
      old.view.off('pointertap', old.onTap)
      old.view.destroy()
    }
  },

  _killGearTweens(g) {
    g.fly?.kill?.()
    if (g.view && !g.view.destroyed) {
      gsap.killTweensOf(g.view)
      gsap.killTweensOf(g.view.scale)
    }
  },

  // Puls som ALLTID utgår från basskala 1 — annars kan pop() fånga en pågående
  // bounceIn/pop-skala som "bas" och lämna hjulet krympt (t.ex. 0.19).
  _popScale(view, scale = 1.14) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    view.scale.set(1)
    pop(view, { scale })
  },

  // Tap på ett placerat hjul: drivet → glad puls; fritt (greppar ej) → liten egen
  // snurr-impuls + mjukt ljud + spök-hinten pulsar (vänlig vink, aldrig fel).
  _tapGear(ctx, gear) {
    if (!this._alive || this._resolving || gear.view.destroyed) return
    this._idle = 0
    if (gear.driven) {
      this._popScale(gear.view, 1.18)
      ctx.services.audio.sfx('tap')
    } else {
      gear.freeVel += 0.25
      ctx.services.audio.sfx('soft')
      if (this._ghost && !this._ghost.destroyed) pop(this._ghost)
    }
  },

  // ---- Mesh-graf: vilka hjul greppar och drivs av veven -------------------

  _rebuildMesh(ctx) {
    const crankNode = { x: C.x, y: C.y, r: R0, gear: null, peg: null }
    const targetNode = { x: this._T.x, y: this._T.y, r: RT, gear: null, peg: null }
    const gearNodes = this._gears.map((g) => ({ x: g.peg.x, y: g.peg.y, r: g.r, gear: g, peg: g.peg }))
    const nodes = [crankNode, ...gearNodes, targetNode]
    const n = nodes.length

    const adj = nodes.map(() => [])
    // `tecken` = vad länken gör med rotationsriktningen. Kuggar vänder (−1), en RAK
    // rem behåller (+1) och en KORSAD rem vänder (−1) — det är hela mekaniken bakom
    // X:et, och den bor på länken, inte på djupet.
    const lank = (i, j, tecken) => {
      adj[i].push({ to: j, tecken })
      adj[j].push({ to: i, tecken })
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (Math.abs(dist - (a.r + b.r)) < MESH_TOL) lank(i, j, -1)
      }
    }

    // Remmen är en länk som geometrin aldrig kan ge: den kopplar två hjul som
    // ligger `REM_GAP` px för långt isär för att kunna greppa.
    const rem = this._rem
    let remGriper = false
    if (rem && rem.placed) {
      const ia = this._remNodIndex(rem.aRef, nodes)
      const ib = this._remNodIndex(rem.bRef, nodes)
      if (ia >= 0 && ib >= 0) {
        lank(ia, ib, rem.korsad ? -1 : 1)
        remGriper = true
      }
    }

    for (const g of this._gears) {
      g.driven = false
      g.depth = -1
      g.factor = 0
    }

    // BFS från veven. Riktning och utväxling bärs av LÄNKEN, inte av djupet: kuggar
    // vänder riktningen, en rak rem behåller den, en korsad vänder den, och alla för
    // över ytfarten (ω_v = ω_u · r_u / r_v). För en ren kuggkedja är det exakt samma
    // tal som den gamla djupparitets-formeln gav — remmen är enda stället de skiljer
    // sig åt.
    const depth = new Array(n).fill(-1)
    const factor = new Array(n).fill(0)
    depth[0] = 0
    factor[0] = 1
    const q = [0]
    while (q.length) {
      const u = q.shift()
      for (const e of adj[u]) {
        const v = e.to
        if (depth[v] < 0) {
          depth[v] = depth[u] + 1
          factor[v] = factor[u] * e.tecken * (nodes[u].r / nodes[v].r)
          q.push(v)
        }
      }
    }
    for (let i = 0; i < n; i++) {
      if (nodes[i].gear && depth[i] >= 0) {
        nodes[i].gear.driven = true
        nodes[i].gear.depth = depth[i]
        nodes[i].gear.factor = factor[i]
      }
    }

    this._targetFactor = depth[n - 1] >= 0 ? factor[n - 1] : 0
    const wasComplete = this._chainComplete
    this._chainComplete = depth[n - 1] >= 0

    this._updateHint(ctx)

    if (rem) {
      if (remGriper && !rem._greppFore && !this._chainComplete) this._onRemGrips(ctx)
      rem.gripping = remGriper
      rem._greppFore = remGriper
      // Vänd-ytan lever bara när det FINNS en rem som greppar. Ingen död träffyta
      // som svarar tyst på ett tryck (`_tystprobe`s `dod-traffyta`).
      if (rem.vandZon && !rem.vandZon.destroyed) {
        rem.vandZon.eventMode = rem.placed && remGriper && !this._resolving ? 'static' : 'none'
      }
      this._uppdateraVandRing()
    }

    // Grenen greppade: den är en BONUS utanför vinstvillkoret, så den får sin egen
    // lilla föreställning i stället — annars vore upptäckten obelönad.
    const grenDrivs = !!this._gren?.peg?.gear?.driven
    if (grenDrivs && !this._grenDrevFore) this._onGrenGrips(ctx)
    this._grenDrevFore = grenDrivs

    if (this._chainComplete && !wasComplete) {
      this._prevTargetAngle = this._crankAngle * this._targetFactor
      this._onChainGrips(ctx)
    }
  },

  // Fläkten fick fart: gnistra vid navet, en stigande liten ton, och en puls på
  // bladen. Ingen text — barnet ser fläkten börja gå.
  _onGrenGrips(ctx) {
    if (!this._alive || !this._flaktBlad || this._flaktBlad.destroyed) return
    const x = this._flaktBlad.x
    const y = this._flaktBlad.y
    sparkle(ctx.fxLayer, x, y)
    puff(ctx.fxLayer, x + 34, y, { count: 6, color: 0xdbe9f7 })
    this._popScale(this._flaktBlad, 1.16)
    ctx.services.audio.tone({ freq: 320, slideTo: 520, dur: 0.4, type: 'sine', vol: 0.3 })
    ctx.services.voice.say('Fläkten snurrar också!')
  },

  _onChainGrips(ctx) {
    ctx.services.audio.sfx('match')
    ctx.services.audio.sfx('reveal')
    // Greppa-juice: ett distinkt "klonk"-klick-i-läge när kuggarna faller i grepp.
    ctx.services.audio.tone?.({ freq: 300, slideTo: 150, dur: 0.14, type: 'triangle', vol: 0.5 })
    // Glödpuls + gnistra längs kedjan (i djupordning) — mjukt ryck som vandrar hela raden.
    const chain = this._gears.filter((g) => g.driven).sort((a, b) => a.depth - b.depth)
    chain.forEach((g, i) => {
      gsap.delayedCall(0.08 * i, () => {
        if (!this._alive || !g.view || g.view.destroyed) return
        this._popScale(g.view, 1.14)
        sparkle(ctx.fxLayer, g.peg.x, g.peg.y, { count: 5 })
        ctx.services.audio.tone?.({ freq: 520 + i * 40, dur: 0.05, type: 'triangle', vol: 0.16 })
      })
    })
    if (this._targetWheel && !this._targetWheel.destroyed) this._popScale(this._targetWheel, 1.14)
    // Elvira ser att det greppar och klappar i händerna.
    this._setElvira('🙌', { hop: true })
    // Fira storleks-skillnaden: det minsta hjulet snurrar fortast ("Vroom!").
    gsap.delayedCall(0.08 * chain.length + 0.15, () => this._alive && this._celebrateSpeed(ctx))
    ctx.services.voice.say('Den greppar! Veva nu!')
  },

  // Elvira är en levande mottagare: byt uttryck + liten hopp/puls (aldrig bara dekor).
  _setElvira(emoji, { hop = false } = {}) {
    if (!this._alive || !this._elvira || this._elvira.destroyed) return
    this._elvira.text = emoji
    this._popScale(this._elvira, 1.2)
    if (hop && this._elviraHome) {
      const base = this._elviraHome.y
      const st = { y: base }
      gsap.to(st, {
        y: base - 24, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out',
        onUpdate: () => { if (this._alive && this._elvira && !this._elvira.destroyed) this._elvira.y = st.y },
        onComplete: () => { if (this._alive && this._elvira && !this._elvira.destroyed) this._elvira.y = base },
      })
    }
  },

  // Fira den smartaste idén: hitta det snabbaste (minsta) drivna hjulet och lyft
  // fram fart-skillnaden med en synlig "Vroom!" + gnistor + snabb piggpuls.
  _celebrateSpeed(ctx) {
    if (!this._alive) return
    const driven = this._gears.filter((g) => g.driven && g.view && !g.view.destroyed)
    if (!driven.length) return
    let fast = driven[0]
    for (const g of driven) if (Math.abs(g.factor) > Math.abs(fast.factor)) fast = g
    if (Math.abs(fast.factor) <= 1.05) return // inget hjul mindre än veven → inget att fira
    floatText(ctx.fxLayer, fast.peg.x, fast.peg.y - fast.r - 18, 'Vroom!', { fontSize: 46 })
    sparkle(ctx.fxLayer, fast.peg.x, fast.peg.y, { count: 8 })
    this._popScale(fast.view, 1.22)
    ctx.services.audio.tone?.({ freq: 520, slideTo: 920, dur: 0.18, type: 'triangle', vol: 0.32 })
  },

  // Första lösningspinnen utan rätt-storleks-hjul (frontier).
  _frontierIndex() {
    for (let i = 0; i < this._solutionPegs.length; i++) {
      const s = this._solutionPegs[i]
      if (!(s.peg.gear && s.peg.gear.size === s.size)) return i
    }
    return this._solutionPegs.length
  },

  // Spök-kugg på frontier-pinnen + lugn puls på rätt dispenser + glöd på drivna hjul.
  _updateHint(ctx) {
    this._ghostBreathe?.kill()
    this._ghostBreathe = null
    if (this._ghost && !this._ghost.destroyed) this._ghost.destroy()
    this._ghost = null
    this._stopDispenserHints()
    const rem = this._rem
    if (rem) {
      rem.slotBreathe?.kill()
      rem.slotBreathe = null
      if (rem.slotView && !rem.slotView.destroyed) rem.slotView.scale.set(1)
    }

    for (const g of this._gears) {
      if (g.view && !g.view.destroyed && g.view._glow) g.view._glow.visible = g.driven
    }

    const fi = this._frontierIndex()
    if (this._chainComplete) return

    // Har barnet byggt fram till gapet är REMMEN nästa del — då pekar spelet på
    // den och inte på ett kugghjul, annars konkurrerar två hintar om samma blick.
    if (rem && !rem.placed && fi >= rem.link) {
      const dr = this._dispensers.REM
      if (dr?.view && !dr.view.destroyed && dr.view.visible) dr.hint = breathe(dr.view, { scale: 1.1, duration: 0.95 })
      if (rem.slotView && !rem.slotView.destroyed) rem.slotBreathe = breathe(rem.slotView, { scale: 1.12, duration: 1.0 })
      // ⚠️ ETT BARN KAN MÖTA REMMEN UTAN ATT HA SETT DEN VÄXA FRAM. Nivåerna 1–4 bygger
      // upp kugg-mot-kugg, men spelet startar på den nivå sparfilen står på — den som
      // redan stod på gamla nivå 5 landar rakt i en mekanik ingen introducerat, och
      // `voiceIntro` talar bara om kugghjul. Repliken sägs en gång per remnivå, i det
      // ögonblick remmen faktiskt är nästa del.
      if (!rem._sagt) {
        rem._sagt = true
        ctx.services.voice.say('Ta remmen! Den når ända över.')
      }
      return
    }
    if (fi >= this._solutionPegs.length) return

    const s = this._solutionPegs[fi]
    const ghost = makeGear(SIZES[s.size].r, SIZES[s.size].color)
    ghost.alpha = 0.32
    ghost.eventMode = 'none'
    ghost.interactiveChildren = false
    ghost.position.set(s.peg.x, s.peg.y)
    this._gearLayer.addChild(ghost)
    this._ghost = ghost
    this._ghostBreathe = breathe(ghost, { scale: 1.12, duration: 0.9 })

    const disp = this._dispensers[s.size]
    if (disp && disp.view && !disp.view.destroyed) disp.hint = breathe(disp.view, { scale: 1.08, duration: 0.95 })
  },

  _stopDispenserHints() {
    for (const size of ['S', 'M', 'L', 'REM']) {
      const d = this._dispensers[size]
      if (!d) continue
      d.hint?.kill()
      d.hint = null
      if (d.view && !d.view.destroyed && !this._isDragging(d)) d.view.scale.set(1)
    }
  },

  _isDragging(d) {
    return this._drag && this._drag.active && this._drag.active.view === d.view
  },

  // ---- Veva ---------------------------------------------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e, mal) {
    const p = mal && !mal.destroyed ? ctx.fxLayer.toLocal(mal.getGlobalPosition())
      : e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _crankDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._autoCrankTween?.kill()
    this._cranking = true
    this._crankMoved = false
    this._idle = 0
    this._helpIdle = 0
    const p = this._root.toLocal(e.global)
    this._lastAng = Math.atan2(p.y - C.y, p.x - C.x)
    this._fingerAngle = this._crankAngle // greppet tas där veven FAKTISKT står
    this._fingerVel = this._crankVel // och ärver maskinens fart, så greppet inte rycker
    ctx.services.audio.sfx('tap')
    pop(this._crank, { scale: 1.06 })
    this._crank.on('globalpointermove', this._onCrankMove)
    this._crank.on('pointerup', this._onCrankUp)
    this._crank.on('pointerupoutside', this._onCrankUp)
  },

  _crankMove(ctx, e) {
    if (!this._cranking) return
    const p = this._root.toLocal(e.global)
    const a = Math.atan2(p.y - C.y, p.x - C.x)
    const d = wrapAngle(a - this._lastAng)
    // Fingret sätter inte vinkeln längre — det drar i veven, och trögheten avgör hur fort
    // maskinen hinner ikapp. Både LÄGET och FARTEN behövs: läget stänger glappet, farten
    // är framkopplingen som gör att jämviktsglappet blir noll. Se `_stegMaskin`.
    this._fingerAngle += d
    this._fingerVel = this._fingerVel * 0.6 + d * 0.4 // jämnad, så ett ryck inte slår igenom
    this._lastAng = a
    if (Math.abs(d) > 0.04) this._crankMoved = true
    this._idle = 0
    const now = performance.now()
    if (now - this._lastCrankSound > 140) {
      this._lastCrankSound = now
      ctx.services.audio.sfx('tap')
      // TRÖGHETEN SKA HÖRAS, INTE BARA KÄNNAS. Förut spelade en ensam vev och ett
      // femhjulsbygge exakt samma `tap` var 140:e ms — hela tröghetsrundan var stum.
      // `tap` behålls (det är ett riktigt CC0-klipp), och under det ligger nu ett
      // spärrhjuls-klack som blir djupare och fylligare ju mer barnet byggt.
      // ⚠️ GOLVET PÅ 150 Hz ÄR INTE GODTYCKLIGT. Appen är tablet-först, och en
      // surfplattas högtalare tappar botten långt före det — ett "ärligare" 100 Hz
      // för det tyngsta bygget hade betytt TYSTARE, inte tyngre, på riktig hårdvara.
      const J = this._troghet()
      ctx.services.audio.tone?.({
        freq: clamp(250 - 20 * J, 150, 250),
        dur: clamp(0.05 + 0.01 * J, 0.05, 0.1),
        type: 'triangle',
        vol: clamp(0.1 + 0.03 * J, 0.1, 0.26),
      })
    }
  },

  _crankUp(ctx) {
    if (!this._cranking) return
    this._cranking = false
    this._crank.off('globalpointermove', this._onCrankMove)
    this._crank.off('pointerup', this._onCrankUp)
    this._crank.off('pointerupoutside', this._onCrankUp)
    if (!this._crankMoved) this._autoCrank(ctx)
  },

  // Tap på veven → den vevar själv två varv (de minsta kan bara tappa).
  _autoCrank(ctx) {
    if (!this._alive || this._resolving) return
    this._autoCrankTween?.kill()
    ctx.services.audio.sfx('whoosh')
    // ⚠️ TAPPET FICK INTE HOPPA ÖVER TRÖGHETEN. Med en fast varaktighet kändes en tom
    // vev och ett femhjulsbygge EXAKT likadana för varje barn som tappar i stället för
    // att dra runt — och tap är den enklaste, mest barn-typiska gesten, alltså var hela
    // rundans poäng osynlig just för den spelaren. Varaktigheten skalar nu med √J:
    // samma två varv, men en tung maskin tar längre tid på sig och startar trögare.
    const J = this._troghet()
    const st = { a: this._crankAngle }
    this._autoCrankTween = gsap.to(st, {
      a: this._crankAngle + Math.PI * 4,
      duration: 2.2 * (0.55 + 0.45 * Math.sqrt(J)),
      ease: J > 2.5 ? 'power2.inOut' : 'power1.inOut',
      onUpdate: () => {
        if (!this._alive) {
          this._autoCrankTween?.kill()
          return
        }
        // Auto-vevningen äger vinkeln medan den pågår — nolla svänghjulet så de två
        // inte skriver samma tal på var sitt håll (tweenen och `_stegMaskin`).
        this._crankAngle = st.a
        this._crankVel = 0
        this._idle = 0
        this._helpIdle = 0
      },
    })
  },

  // ---- Maskinens tröghet ---------------------------------------------------
  //
  // Förut satte fingret vinkeln rakt av (`_crankAngle += d`): en ensam vev och en
  // maskin med fem hjul kändes exakt likadana, och hela poängen med att BYGGA en
  // maskin — att den blir tyngre och mäktigare — fanns inte i handen.
  //
  // Nu bär bygget en tröghet. Fingret sätter en önskad fart, maskinen hinner dit så
  // fort dess massa tillåter, och när barnet släpper rullar den vidare en stund som ett
  // svänghjul. Ingen svårighet tillkommer: en tung maskin går lika långt, den tar bara
  // en stund att få igång — och belönar med att fortsätta av sig själv.
  //
  // Trögheten räknas som en skivas: J ∝ r². Summan går över de hjul som FAKTISKT
  // greppar (`driven`), så trögheten är en direkt avläsning av vad barnet byggt.
  _troghet() {
    let j = 1 // veven själv
    for (const g of this._gears) if (g.driven && !g.fly) j += (g.r / R0) * (g.r / R0)
    if (this._rem?.gripping) j += REM_TROGHET // gummit väger också något
    return j
  },

  _stegMaskin(dt) {
    const J = this._troghet()
    if (this._cranking) {
      // ⚠️ FINGRET ÄR KOPPLAT TILL VEVEN, INTE BARA TILL DESS FART. Första versionen
      // styrde ren hastighet utan positionsåterkoppling, och då LOSSNADE handtaget
      // synligt från fingret: uppmätt **40–100° glapp** efter en halv till en sekunds
      // vevning på ett femhjulsbygge i normalt barntempo, och glappet läkte aldrig —
      // svänghjulet fortsatte från sin egen position. Kuggarna sitter 36–40° isär, så
      // glappet var en hel kuggbredd eller mer. Det ser inte tungt ut, det ser trasigt
      // ut — och det slog till precis vid den mest triumferande stunden.
      //
      // Nu sitter fingret i veven som i en STYV FJÄDER: momentet växer med glappet, så
      // en tung maskin släpar efter men hinner alltid ikapp, och glappet har dessutom
      // ett hårt tak så handtaget aldrig kan hamna en kugge fel.
      // ⚠️ INTE EN FJÄDER. En fjäder med samma styvhet kan inte både bära ett femhjuls-
      // bygge och vara stabil på en tom vev: ω = √(K/J), så det K som orkar dra det tunga
      // (0,9) gav den tomma ω ≈ 0,95 rad/ruta och den svängde FÖRBI fingret — uppmätt
      // 40° glapp åt fel håll och farten i taket. Kopplingen är därför en FART som
      // stänger glappet, med ett tak på hur snabbt farten får ändras — och det taket är
      // just massan. Stabilt av konstruktion: farten kan aldrig passera sitt mål.
      // ⚠️ MÅLFARTEN MÅSTE INNEHÅLLA FINGRETS EGEN FART. Med enbart `gap · VEV_SNABB` är
      // målfarten NOLL vid noll glapp — maskinen kan alltså aldrig följa ett finger som
      // rör sig utan att bära ett stående glapp (precis `fart / VEV_SNABB`). Uppmätt
      // följd: den TOMMA veven sköt förbi fingret under uppstarten och låg sedan pinnad
      // mot det hårda taket från andra hållet — 17° glapp på en tom vev mot 9° på ett
      // femhjulsbygge, alltså bakvänt. Med fingrets fart som framkoppling går glappet mot
      // noll i jämvikt, och glappet bär bara det maskinen ÄNNU inte hunnit ikapp.
      const gap = wrapAngle(this._fingerAngle - this._crankAngle)
      const malVel = this._fingerVel + gap * VEV_SNABB
      const maxAndring = (VEV_MOMENT / J) * dt
      this._crankVel += clamp(malVel - this._crankVel, -maxAndring, maxAndring)
      if (Math.abs(gap) > VEV_MAXGAP) this._crankAngle += (Math.abs(gap) - VEV_MAXGAP) * Math.sign(gap)
    } else {
      this._crankVel *= Math.pow(VEV_FRIKTION, dt / J) // tungt bygge rullar längre
      if (Math.abs(this._crankVel) < 0.0008) this._crankVel = 0
    }
    this._crankVel = clamp(this._crankVel, -VEV_MAXFART, VEV_MAXFART)
    this._crankAngle += this._crankVel * dt
    if (Math.abs(this._crankVel) > 0.004) {
      this._idle = 0
      this._helpIdle = 0
    }
  },

  // ---- Ticker: rotationskoppling, flagga, idle/auto-hjälp -----------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 16.6667
    const dtSec = ticker.deltaMS / 1000

    this._stegMaskin(dt)
    if (this._crank && !this._crank.destroyed) this._crank.rotation = this._crankAngle

    for (const g of this._gears) {
      if (!g.view || g.view.destroyed || g.fly) continue
      if (g.driven) {
        g.view.rotation = this._crankAngle * g.factor
      } else {
        g.freeAngle += g.freeVel * dt
        g.freeVel *= Math.pow(0.94, dt)
        g.view.rotation = g.freeAngle
      }
    }

    // Dubbelhjulets ANDRA gren: fläkten snurrar med grenhjulets EGEN faktor — alltså
    // åt motsatt håll och med annan fart än kedjan mot målet. Det är precis det ett
    // dubbelhjul gör, och det är gratis: BFS:en fyller `factor` för varje drivet hjul.
    const gg = this._gren?.peg?.gear
    if (this._flaktBlad && !this._flaktBlad.destroyed && this._flaktBlad.visible && gg?.driven && !gg.fly) {
      this._flaktBlad.rotation = this._crankAngle * gg.factor
    }

    this._stegRem(dt)

    if (this._chainComplete && !this._resolving) {
      const ta = this._crankAngle * this._targetFactor
      this._flagProgress += Math.abs(ta - this._prevTargetAngle) // absolut delta ⇒ fram & tillbaka hissar
      this._prevTargetAngle = ta
      if (this._targetWheel && !this._targetWheel.destroyed) this._targetWheel.rotation = ta
      if (this._carousel && !this._carousel.destroyed) this._carousel.rotation = ta
      const prog = clamp(this._flagProgress / FULL, 0, 1)
      if (this._flag && !this._flag.destroyed) this._flag.y = lerp(this._flagBottom, FLAG_TOP_Y, prog)
      if (this._flagProgress - this._lastFlagSpark > FULL / 8) {
        this._lastFlagSpark = this._flagProgress
        if (this._flag && !this._flag.destroyed) sparkle(ctx.fxLayer, this._flag.x, this._flag.y)
      }
      if (this._flagProgress >= FULL) this._onComplete(ctx)
    } else if (this._targetWheel && !this._targetWheel.destroyed && !this._resolving) {
      this._targetWheel.rotation = this._crankAngle * this._targetFactor
    }

    if (!this._resolving) {
      this._idle += dtSec
      this._helpIdle += dtSec
      if (this._idle >= IDLE_RECUE) {
        this._idle = 0
        this._recue(ctx)
      }
      if (this._helpIdle >= IDLE_HELP && !this._chainComplete) {
        this._helpIdle = 0
        this._autoHelp(ctx)
      }
    }
  },

  _recue(ctx) {
    if (this._chainComplete && this._gren && !this._gren.peg.gear) {
      // Maskinen går, men dubbelhjulets andra gren står tom — peka på den i stället
      // för att upprepa "Veva nu!". Grenen är frivillig, så tonen är en inbjudan.
      ctx.services.voice.say('Fläkten vill också snurra!')
      const disp = this._dispensers[this._gren.size]
      if (disp?.view && !disp.view.destroyed) pop(disp.view)
      if (this._flaktBlad && !this._flaktBlad.destroyed) this._popScale(this._flaktBlad, 1.12)
      return
    }
    // Maskinen går och remmen har aldrig vänts — bjud in i stället för att upprepa
    // "Veva nu!". Vändningen är frivillig, precis som grenen, så tonen är en fråga.
    // `_flagProgress > 0` med flit: bjud in till vändningen först när barnet redan
    // HAR vevat. Innan dess är vevandet det som för nivån framåt, och en inbjudan
    // dit i stället hade lett bort från målet.
    const rem = this._rem
    if (this._chainComplete && this._flagProgress > 0 && rem?.placed && rem.gripping && !rem.vandad) {
      // Ingen extra puls här: ringen pulsar redan, och `_popScale` hade slagit ihjäl
      // dess egen yoyo på samma `scale`.
      ctx.services.voice.say('Tryck på remmen!')
      return
    }
    if (this._chainComplete) {
      ctx.services.voice.say('Veva nu!')
    } else if (ctx.services.voice.replayLast) {
      ctx.services.voice.replayLast()
    } else {
      ctx.services.voice.say(this.voiceIntro)
    }
    if (this._ghost && !this._ghost.destroyed) pop(this._ghost)
    const fi = this._frontierIndex()
    if (fi < this._solutionPegs.length) {
      const disp = this._dispensers[this._solutionPegs[fi].size]
      if (disp && disp.view && !disp.view.destroyed) pop(disp.view)
    }
  },

  // No-fail-garanti: rätt hjul flyger själv från brickan till frontier-pinnen.
  _autoHelp(ctx) {
    if (!this._alive || this._resolving || this._chainComplete) return
    const fi = this._frontierIndex()
    const rem = this._rem
    if (rem && !rem.placed && !rem.flyg && fi >= rem.link) return this._autoRem(ctx)
    if (fi >= this._solutionPegs.length) return
    const s = this._solutionPegs[fi]
    const disp = this._dispensers[s.size]
    if (!disp) return
    ctx.services.voice.say('Titta!')
    floatText(ctx.fxLayer, disp.home.x, disp.home.y - 50, 'Titta!')
    this._spawnGear(ctx, s.peg, s.size, { from: { x: disp.home.x, y: disp.home.y } })
    this._stuck = 0
    this._idle = 0
    this._helpIdle = 0
  },

  // ---- Klart --------------------------------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    // Firandet äger skärmen: vänd-ytan ska varken pulsa eller ta emot tryck under den.
    this._slackVandRing()
    if (this._rem?.vandZon && !this._rem.vandZon.destroyed) this._rem.vandZon.eventMode = 'none'
    if (this._flag && !this._flag.destroyed) {
      this._flag.y = FLAG_TOP_Y
      pop(this._flag, { scale: 1.3 })
    }
    ctx.services.audio.sfx('celebrate')
    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(randomFrom(PRAISE))

    // Elvira firar och åker karusellen: byt till glad min och guppa runt på hjulet.
    this._setElvira('🥳')
    if (this._elvira && !this._elvira.destroyed && this._carousel && !this._carousel.destroyed) {
      const cx = this._carousel.x
      const cy = this._carousel.y - 24
      const st = { t: 0 }
      gsap.to(st, {
        t: 1, duration: 1.5, ease: 'power1.out',
        onUpdate: () => {
          if (!this._alive || !this._elvira || this._elvira.destroyed) return
          const a = st.t * Math.PI * 4
          this._elvira.position.set(cx + Math.cos(a) * 14, cy + Math.sin(a) * 10)
        },
      })
    }
    if (this._carousel && !this._carousel.destroyed) {
      gsap.to(this._carousel, { rotation: this._carousel.rotation + Math.PI * 4, duration: 1.6, ease: 'power1.out' })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, this._T.x, 170)
    sparkle(ctx.fxLayer, this._T.x, FLAG_TOP_Y + 10, { count: 10 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete()

    this._levelTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildLevel(ctx, this._level)
    })
  },

  // ---- Städning -----------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._autoCrankTween?.kill()
    this._levelTimer?.kill?.()
    this._ghostBreathe?.kill()

    if (this._crank && !this._crank.destroyed) {
      this._crank.off('pointerdown', this._onCrankDown)
      this._crank.off('globalpointermove', this._onCrankMove)
      this._crank.off('pointerup', this._onCrankUp)
      this._crank.off('pointerupoutside', this._onCrankUp)
    }
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onEmptyTap)

    this._drag?.destroy()
    this._stopDispenserHints()
    this._clearRem()

    for (const o of [this._crank, this._targetWheel, this._carousel, this._elvira, this._flag, this._ghost, this._flaktBlad, this._flaktStativ, this._flaktAxel]) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    for (const g of this._gears) this._killGearTweens(g)
    for (const size of ['S', 'M', 'L', 'REM']) {
      const d = this._dispensers?.[size]
      if (d?.view && !d.view.destroyed) {
        gsap.killTweensOf(d.view)
        gsap.killTweensOf(d.view.scale)
      }
    }

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ===== Programmatisk konst ===============================================

// Tangenterna mellan två cirklar — remmens raka spann. `psi` är vinkeln från
// linjen A→B ut till tangentnormalen; den bär också hur långt remmen lindar sig
// runt varje hjul (bågarna i `_ritaRemBana`).
//
// `korsad` byter de YTTRE tangenterna mot de INRE: normalen är gemensam, men
// beröringspunkten på B ligger på MOTSATT sida (`B − r_b·n` i stället för
// `B + r_b·n`), så spannen skär varandra och bildar ett X. Villkoret blir
// cos ψ = (r_a + r_b)/d i stället för (r_a − r_b)/d — det kräver att hjulen inte
// rör varandra, vilket remspannets `REM_GAP` garanterar.
//
// Det är inte kosmetik: en korsad rem vänder rotationsriktningen, och X:et är
// det enda en tvååring SER av varför.
function remTangenter(A, B, korsad = false) {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const d = Math.hypot(dx, dy) || 1
  const beta = Math.atan2(dy, dx)
  const psi = Math.acos(clamp(((korsad ? A.r + B.r : A.r - B.r)) / d, -1, 1))
  const sB = korsad ? -1 : 1
  const punkt = (s) => {
    const nx = Math.cos(beta + s * psi)
    const ny = Math.sin(beta + s * psi)
    return { ax: A.x + A.r * nx, ay: A.y + A.r * ny, bx: B.x + sB * B.r * nx, by: B.y + sB * B.r * ny }
  }
  return { beta, psi, t1: punkt(1), t2: punkt(-1) }
}

// Där de två korsade spannen skär varandra — X:ets mitt. Skärningen delar
// centrumlinjen i förhållandet r_a : r_b (liktformiga trianglar), alltså inte
// exakt mittpunkten när hjulen har olika storlek.
function remKryss(A, B) {
  const u = A.r / (A.r + B.r || 1)
  return { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u }
}

// Ändpunkterna för en rem som INTE greppar: den sitter på fälgen där det finns ett
// hjul och dinglar ned mot den tomma pinnen i andra änden.
function remFriaAndar(A, B) {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  const ra = A.ok ? A.r : 0
  const rb = B.ok ? B.r : 0
  return { ax: A.x + ux * ra, ay: A.y + uy * ra, bx: B.x - ux * rb, by: B.y - uy * rb }
}

// Den hoprullade remmen i hyllan — en ritad gummiögla med ribbor (aldrig en emoji).
function makeRemRulle(rx = 52, ry = 34) {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 0, rx, ry).stroke({ width: 17, color: darken(REM_COLOR, 0.4) })
  g.ellipse(0, 0, rx, ry).stroke({ width: 13, color: REM_COLOR })
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const cx = Math.cos(a) * rx
    const cy = Math.sin(a) * ry
    // Utåtriktad normal på ellipsen (rx·ry-skalad) → ribban ligger tvärs bandet.
    const nx = Math.cos(a) / rx
    const ny = Math.sin(a) / ry
    const L = Math.hypot(nx, ny) || 1
    g.moveTo(cx - (nx / L) * 5, cy - (ny / L) * 5).lineTo(cx + (nx / L) * 5, cy + (ny / L) * 5)
  }
  g.stroke({ width: 3, color: REM_LUGG, alpha: 0.85, cap: 'round' })
  g.ellipse(-rx * 0.3, -ry * 0.72, rx * 0.3, ry * 0.13).fill({ color: 0xffffff, alpha: 0.2 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Ett kugghjul: glöd (dold), kuggar runt om, kropp, glans, nav med ekrar.
// Ankrat i (0,0) och roteras som en enhet.
function makeGear(r, color) {
  const c = new Container()
  const dark = darken(color, 0.28)

  const glow = new Graphics().circle(0, 0, r + 10).fill({ color: 0xfff3b0, alpha: 0.55 })
  glow.visible = false
  glow.eventMode = 'none'
  c.addChild(glow)
  c._glow = glow

  const teeth = new Container()
  teeth.eventMode = 'none'
  const n = Math.max(6, Math.round(r / 7))
  const tw = r * 0.34
  const th = r * 0.24
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const t = new Graphics().roundRect(-tw / 2, -th / 2, tw, th, th * 0.4).fill(color)
    t.position.set(Math.cos(a) * r, Math.sin(a) * r)
    t.rotation = a
    t.eventMode = 'none'
    teeth.addChild(t)
  }
  c.addChild(teeth)

  const body = new Graphics().circle(0, 0, r).fill(color).stroke({ width: 4, color: dark })
  body.eventMode = 'none'
  c.addChild(body)

  const sheen = new Graphics().circle(-r * 0.25, -r * 0.25, r * 0.5).fill({ color: 0xffffff, alpha: 0.18 })
  sheen.eventMode = 'none'
  c.addChild(sheen)

  const hub = new Graphics().circle(0, 0, r * 0.32).fill(COLORS.cream).stroke({ width: 3, color: dark })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    hub.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28)
  }
  hub.stroke({ width: 3, color: dark })
  hub.eventMode = 'none'
  c.addChild(hub)

  return c
}
