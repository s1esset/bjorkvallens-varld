// Vippbrädan — KATAPULT-lek (3–5 år). En groda 🐸 sitter på vippbrädans ena ände.
// Barnet väljer en VIKT (liten/mellan/stor) och TRYCKER för att släppa den på den
// andra änden — brädan vippar (riktig matter.js-revolut) och katapulterar grodan i
// en båge upp mot en KORG. Landar grodan i korgen => firande + nästa nivå (korgen
// flyttas längre bort/högre). Vald vikt ändrar utfallet: större vikt = mer fart =
// högre/längre skjuts (massa via MATERIALS, momentum). INGET game-over: missar
// landar roligt (puff + vingel + mjukt ljud), och efter ett par missar hjälper en
// snäll auto-båge grodan tryggt i korgen. Allt ritas programmatiskt (Pixi Graphics
// + emoji) och städas exit-säkert.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Matter, predictTrajectory } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration, puff, sparkle, floatText, pop, wiggle , kvittera} from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const { Constraint, Composite, Body } = Matter

const PLANK_W = 460
const PLANK_H = 26
const PLANK_HALF = PLANK_W / 2
const CX = 640
const PIVOT_Y = 560
const FROG_R = 34
// Naturlig, nedåtriktad gravitation. Matter ger per fast 1/60-steg en hastighetsökning
// ≈ 0.2778×gravityY (px/steg). Katapultbågen OCH den prickade förhandsvisningen räknas
// mot G_STEP — då matchar grodans verkliga flykt gravitationen (ingen "konstig" båge).
const GRAVITY_Y = 1.1
const G_STEP = 0.2778 * GRAVITY_Y // ≈ 0.306 px/steg² (verklig matter-gravitation per steg)
const FLIGHT_STEPS = 48 // flygtid i fysiksteg för en lugn, läsbar båge
const FLOOR_Y = 700
// Var barnet får släppa vikten: längs brädans HÖGER arm. Nära navet = svag skjuts,
// ytterst = stark skjuts. Barnet drar vikten längs skenan (eller tappar ett ställe).
const DROP_MIN_X = CX + 60 // 700 (nära navet)
const DROP_MAX_X = CX + 215 // 855 (ytterst på armen)
const RAIL_Y = 470 // skenan sitter strax OVANFÖR brädans höger arm — barnet ser att
// vikten hör ihop med plankan (kopplingen kontroll→fysik blir spatialt tydlig).
const DROP_TOP_Y = RAIL_Y // vikten släpps där den vilar och faller det korta stycket ned på armen
const FROG_LAUNCH_X = CX - PLANK_HALF // grodans viloläge (vänster tipp) — used by förhandsvisning
const FROG_LAUNCH_Y = PIVOT_Y - (PLANK_H / 2 + FROG_R * 0.72)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const IDLE_CUES = [
  'Välj en vikt och tryck för att släppa den!',
  'Hjälp grodan att hoppa i korgen!',
  'Tryck så vippar brädan och grodan flyger!',
]
const LAND_PRAISE = ['Hurra! Grodan landade i korgen!', 'Grodan i korgen! Bravo!', 'Pang i korgen! Vad duktig du är!']
const MISS_SAY = ['Hoppsan! Försök igen!', 'Nästan! En gång till!', 'Oj, prova en annan vikt!']
const LAUNCH_SAY = ['Hoppla!', 'Boing!', 'Iväg!']

export default {
  id: 'vippbradan',
  titleSv: 'Vippbrädan',
  icon: '⚖️',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vippbradan',
  voiceIntro: 'Släpp en vikt så att grodan flyger upp i korgen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._busy = false // mellan släpp och återställning -> blockera nya släpp
    this._launched = false
    this._resolving = false
    this._misses = 0
    this._assistNext = false
    this._lastHit = 0
    this._frogBody = null
    this._weight = null // { body, view }
    this._timers = []
    this._dragging = false // drar barnet just nu den bärbara vikten?
    this._everInteracted = false // dölj dra-ledtråden efter första gången
    this._dropX = (DROP_MIN_X + DROP_MAX_X) / 2 // valt släpp-läge längs armen
    this._launchTotal = 1 // total skjutkraft (läge × vikt) som senaste släpp gav

    // Viktstorlekar -> massa/täthet via MATERIALS. Större vikt = kraftigare skjuts.
    // mul = hur mycket vikten skalar skjutkraften (utfallet beror på barnets val:
    // både VAR vikten släpps och VILKEN storlek).
    this._sizes = [
      // Vikterna är RIKTIGA föremål med igenkännbar tyngd: en fjäder är lätt, ett äpple
      // lagom, ett städ tungt. Barnet kopplar sak -> tyngd -> hur högt grodan flyger.
      { key: 'liten', label: 'Lätt', icon: '🪶', kind: 'fjader', r: 26, mat: MATERIALS.light, mul: 0.9 },
      { key: 'mellan', label: 'Mellan', icon: '🍎', kind: 'apple', r: 38, mat: MATERIALS.normal, mul: 1.0 },
      { key: 'stor', label: 'Tung', icon: '🧱', kind: 'stad', r: 52, mat: MATERIALS.heavy, mul: 1.12 },
    ]
    this._sizeIdx = 1

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: golv + sidoväggar så vikten lägger sig till ro och grodan stannar i bild.
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildScene(ctx)
    this._buildSeesaw(ctx)
    this._buildDropControl(ctx)
    this._buildUI(ctx)

    this._loadLevel(ctx, this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen ----------------------------------------------------------------

  _buildScene(ctx) {
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, ground: false }))

    // Mark + triangel-stöd (dekorativt; brädan hålls av constrainten).
    const deco = new Graphics()
    deco.rect(0, FLOOR_Y, ctx.width, ctx.height - FLOOR_Y).fill(COLORS.green)
    deco.rect(0, FLOOR_Y, ctx.width, 10).fill({ color: COLORS.greenDark, alpha: 0.5 })
    deco.moveTo(CX - 80, FLOOR_Y)
    deco.lineTo(CX + 80, FLOOR_Y)
    deco.lineTo(CX, PIVOT_Y + 18)
    deco.closePath()
    deco.fill(COLORS.orange).stroke({ width: 4, color: COLORS.orangeDark })
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    this._root.addChild(deco)

    // Heltäckande tryckyta: tapp på ett ställe = flytta vikten dit och släpp den
    // (tap-fallback för den som inte vill dra). Att dra själva vikten hanteras separat.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onTap = (e) => this._handleTap(ctx, e)
    this._catcher.on('pointertap', this._onTap)
    this._root.addChild(this._catcher)

    // Korg/mål (flyttas per nivå — nära skärmens högra kant).
    this._target = { x: 1080, y: 440, r: 95, sensor: null, rimL: null, rimR: null }
    this._basket = new Container()
    this._basket.eventMode = 'none'
    this._basketGlow = new Graphics()
    this._basket.addChild(this._basketGlow)
    this._basket.addChild(makeBasket())
    this._root.addChild(this._basket)

    // Mottagare: Bobo står vid korgen, tittar efter grodan medan den flyger och
    // firar när den landar (pattern #2 — ger varje skott ett "varför"). Placeras per
    // nivå i _setTarget, humöret sätts om i _resetSeesaw.
    //
    // Den handritade kroppen som stod här är BORTA — inte ersatt, utan igenkänd:
    // `karaktarer.js:_byggKropp` skrev av precis de här måtten (skugga 2,36·r = 118,
    // fötter 2,16·r = 108, bål 1,36·r = 68, axel ±0,54·r = ±27, tass ±1,04·r = ±52).
    // Riggen ÄR den här kroppen, plus en arm med egen pivå och ett ansikte som lever.
    // Riggen ligger i en YTTRE container: spelet äger `pop`/`wiggle` på den, riggen
    // sin egen `view.scale` (andningen). Två skrivare om samma skala hackar.
    this._bobo = new Container()
    this._kar = makeKaraktar({ r: 50 })
    this._bobo.addChild(this._kar.view)
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._root.addChild(this._bobo)
  },

  _buildSeesaw(ctx) {
    // Plankan: matter-rektangel fastnålad i CENTRUM med en revolut-constraint.
    this._plankBody = this._phys.rectangle(CX, PIVOT_Y, PLANK_W, PLANK_H, {
      density: 0.0012,
      frictionAir: 0.02,
      friction: 0.6,
      restitution: 0.05,
      label: 'plank',
    })
    this._constraint = Constraint.create({
      pointA: { x: CX, y: PIVOT_Y },
      bodyB: this._plankBody,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1,
    })
    Composite.add(this._phys.world, this._constraint)

    this._plankView = makePlank()
    this._plankView.eventMode = 'none'
    this._plankView.interactiveChildren = false
    this._root.addChild(this._plankView)
    this._phys.link(this._plankBody, this._plankView)

    // Lager för vikt (under grodan).
    this._weightLayer = new Container()
    this._weightLayer.eventMode = 'none'
    this._weightLayer.interactiveChildren = false
    this._root.addChild(this._weightLayer)

    // Grodan (persistent vy; "rider" på vänster ände tills den skjuts iväg).
    this._frog = makeFrog()
    this._frog.eventMode = 'none'
    this._root.addChild(this._frog)
  },

  // Dra-för-att-välja-läge: en skena längs höger arm, en bärbar vikt som barnet drar
  // (eller tappar ett ställe), och en prickad förhandsvisning av grodans båge.
  _buildDropControl(ctx) {
    // Skena (visuell ledtråd: vikten kan glida längs armen).
    const rail = new Graphics()
    // Stödben ner till brädans höger arm — skenan vilar tydligt PÅ plankan.
    const legTop = RAIL_Y + 4
    const legBot = PIVOT_Y - PLANK_H / 2 + 2
    for (const lx of [DROP_MIN_X - 6, DROP_MAX_X + 6]) {
      rail.roundRect(lx - 5, legTop, 10, legBot - legTop, 4).fill(shade(COLORS.brown, 0.1)).stroke({ width: 2, color: shade(COLORS.brown, 0.35) })
    }
    rail
      .roundRect(DROP_MIN_X - 30, RAIL_Y - 8, DROP_MAX_X - DROP_MIN_X + 60, 16, 8)
      .fill({ color: COLORS.brown, alpha: 0.85 })
      .stroke({ width: 3, color: shade(COLORS.brown, 0.25) })
    rail.circle(DROP_MIN_X - 30, RAIL_Y, 11).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    rail.circle(DROP_MAX_X + 30, RAIL_Y, 11).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    rail.eventMode = 'none'
    rail.interactiveChildren = false
    this._root.addChild(rail)
    this._rail = rail

    // Prickad förhandsvisning av grodans flykt (uppdateras när läge/vikt ändras).
    this._aimGuide = new Graphics()
    this._aimGuide.eventMode = 'none'
    this._root.addChild(this._aimGuide)

    // Lager för den bärbara vikten (ovanpå allt utom knapparna).
    this._carryLayer = new Container()
    this._root.addChild(this._carryLayer)

    // Dra-ledtråd: ett finger som glider längs skenan tills barnet drar/tappar.
    this._dragHintView = new Text({ text: '👆', style: { fontFamily: FONT.body, fontSize: 46 } })
    this._dragHintView.anchor.set(0.5)
    this._dragHintView.eventMode = 'none'
    this._dragHintView.position.set(DROP_MIN_X, RAIL_Y + 42)
    this._root.addChild(this._dragHintView)
    this._dragHintTween = gsap.to(this._dragHintView, { x: DROP_MAX_X, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildUI(ctx) {
    // Storleksknappar (nere i mitten) — väljer vikt-massa.
    this._sizeButtons = []
    this._sizeRing = new Graphics()
    this._sizeRing.eventMode = 'none'
    this._root.addChild(this._sizeRing)
    const bx = [430, 600, 780]
    const bw = [140, 150, 168]
    this._sizes.forEach((s, i) => {
      const b = new Button({
        icon: s.icon,
        label: s.label,
        width: bw[i],
        height: 96,
        color: COLORS.brown,
        stacked: true,
        services: ctx.services,
        sound: 'tap',
        onTap: () => this._selectSize(ctx, i),
      })
      b.position.set(bx[i], 668)
      this._sizeButtons.push(b)
      this._root.addChild(b)
    })
    this._updateSizeRing()
  },

  // ---- Nivå ----------------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._misses = 0
    this._assistNext = false

    // Korgen står nära skärmens HÖGRA kant och flyttas högre för varje nivå
    // (men alltid på skärmen och alltid nåbar).
    const tx = clamp(1080 + level * 24, 1080, 1180)
    const ty = clamp(450 - level * 16, 320, 450)
    const r = clamp(100 - level * 4, 72, 100)
    this._setTarget(ctx, tx, ty, r)

    this._resetSeesaw(ctx)
  },

  _setTarget(ctx, x, y, r) {
    this._target.x = x
    this._target.y = y
    this._target.r = r
    this._basket.position.set(x, y)
    // Mottagaren står strax intill korgen (mot skärmkanten), i höjd med öppningen.
    if (this._bobo && !this._bobo.destroyed) this._bobo.position.set(Math.min(x + 128, 1226), y + 26)
    this._basketGlow.clear().circle(0, 0, r).stroke({ width: 6, color: COLORS.yellow, alpha: 0.55 })

    // Fysik-kroppar: sensor i korgöppningen + två studskanter.
    const t = this._target
    if (t.sensor) this._phys.removeBody(t.sensor)
    if (t.rimL) this._phys.removeBody(t.rimL)
    if (t.rimR) this._phys.removeBody(t.rimR)
    t.sensor = this._phys.rectangle(x, y + 6, 96, 40, { isStatic: true, isSensor: true, label: 'basket' })
    t.rimL = this._phys.circle(x - 64, y - 6, 12, { isStatic: true, restitution: 0.5, label: 'rim' })
    t.rimR = this._phys.circle(x + 64, y - 6, 12, { isStatic: true, restitution: 0.5, label: 'rim' })

    this._basketTween?.kill()
    this._basket.scale.set(1)
    this._basketTween = gsap.to(this._basketGlow.scale, { x: 1.12, y: 1.12, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Återställ brädan jämn, ta bort vikten och sätt grodan redo på vänster ände.
  _resetSeesaw(ctx) {
    if (!this._alive) return
    this._busy = false
    this._launched = false
    this._resolving = false
    this._idle = 0

    // Ta bort grodkropp + viktkropp.
    if (this._frogBody) {
      this._phys.removeBody(this._frogBody)
      this._frogBody = null
    }
    this._removeWeight()

    // Plankan jämn igen.
    Body.setAngle(this._plankBody, 0)
    Body.setAngularVelocity(this._plankBody, 0)
    Body.setVelocity(this._plankBody, { x: 0, y: 0 })

    // Grodan tillbaka på vänster tipp, upprätt och hel.
    gsap.killTweensOf(this._frog)
    gsap.killTweensOf(this._frog.scale)
    this._frog.scale.set(1)
    this._frog.alpha = 1
    this._frog.rotation = 0
    this._frogBreathe?.kill()
    this._positionFrogOnPlank()
    if (!this._frog.destroyed) {
      pop(this._frog)
      this._frogBreathe = gsap.to(this._frog.scale, { x: 1.06, y: 0.94, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }

    // Ny bärbar vikt redo att dras/släppas + uppdaterad bågförhandsvisning.
    this._setupCarried(ctx)
    this._updateAim()

    // Mottagaren blir nyfiken igen medan barnet siktar. Den gamla andnings-pulsen är
    // borta: riggen andas själv, och en andra puls på den yttre containern hade blivit
    // två takter som glider isär.
    this._kar?.setMood('nyfiken')
  },

  // Sätt grodvyn på vänster planktipp (följer plankans vinkel medan den rider).
  _positionFrogOnPlank() {
    const a = this._plankBody.angle
    const tipX = CX + -PLANK_HALF * Math.cos(a)
    const tipY = PIVOT_Y + -PLANK_HALF * Math.sin(a)
    this._frog.position.set(tipX, tipY - (PLANK_H / 2 + FROG_R * 0.72))
  },

  // ---- Kontroller ----------------------------------------------------------

  _selectSize(ctx, i) {
    this._sizeIdx = i
    this._idle = 0
    this._updateSizeRing()
    pop(this._sizeButtons[i])
    sparkle(ctx.fxLayer, this._sizeButtons[i].x, this._sizeButtons[i].y - 30, { count: 5 })
    ctx.services.voice.say(`${this._sizes[i].label} vikt!`)
    // Byt den bärbara vikten till vald storlek och visa hur bågen ändras.
    if (!this._busy) {
      this._setupCarried(ctx)
      this._updateAim()
    }
  },

  _updateSizeRing() {
    const b = this._sizeButtons?.[this._sizeIdx]
    if (!b || !this._sizeRing || this._sizeRing.destroyed) return
    const hw = b.width / 2 + 6
    this._sizeRing.clear().roundRect(b.x - hw, b.y - 60, hw * 2, 120, 26).stroke({ width: 8, color: COLORS.yellow })
  },

  // Skapa/ersätt den bärbara vikten (i vald storlek) på skenan vid valt läge.
  _setupCarried(ctx) {
    if (this._busy) return
    if (this._carried && !this._carried.destroyed) {
      gsap.killTweensOf(this._carried)
      gsap.killTweensOf(this._carried.scale)
      this._carried.destroy({ children: true })
    }
    const size = this._sizes[this._sizeIdx]
    const v = makeWeight(size.r, size.kind)
    v.position.set(this._dropX, RAIL_Y)
    v.eventMode = 'static'
    v.cursor = 'pointer'
    const pad = size.r + 30 // >=96px tryckmål + osynlig hit-halo
    v.hitArea = new Rectangle(-pad, -pad, pad * 2, pad * 2)
    v.on('pointerdown', (e) => this._onCarryDown(ctx, e))
    v.on('globalpointermove', (e) => this._onCarryMove(ctx, e))
    v.on('pointerup', (e) => this._onCarryUp(ctx, e))
    v.on('pointerupoutside', (e) => this._onCarryUp(ctx, e))
    this._carryLayer.addChild(v)
    this._carried = v
    pop(v)
  },

  // Skjutkraft från släpp-läget: nära navet = svag, ytterst på armen = stark.
  _powerPos(dropX) {
    const f = clamp((dropX - DROP_MIN_X) / (DROP_MAX_X - DROP_MIN_X), 0, 1)
    return 0.74 + f * 0.42 // 0.74 (svag) .. 1.16 (stark)
  },

  // Grodans utskjutningshastighet (px/steg). Vid total=1 träffar bågen korgen exakt
  // (ballistik mot målet med RÄTT gravitation). Svagare => kort, starkare => långt.
  _launchVel(fx, fy, total) {
    const tx = this._target.x
    const ty = this._target.y - 30 // sikta strax ovanför korgöppningen
    const N = FLIGHT_STEPS
    const vx = ((tx - fx) / N) * total
    const vy = ((ty - fy) / N - 0.5 * G_STEP * N) * total
    return { vx, vy }
  },

  // Rita den prickade förhandsvisningen av grodans båge för nuvarande val.
  _updateAim() {
    const g = this._aimGuide
    if (!g || g.destroyed) return
    g.clear()
    if (!this._alive || this._busy) return
    const size = this._sizes[this._sizeIdx]
    const total = this._powerPos(this._dropX) * size.mul
    const fx = this._frog && !this._frog.destroyed ? this._frog.x : FROG_LAUNCH_X
    const fy = this._frog && !this._frog.destroyed ? this._frog.y : FROG_LAUNCH_Y
    const { vx, vy } = this._launchVel(fx, fy, total)
    // damp 0.999 = (1 − frictionAir) för grodkroppen → pricklinjen matchar verklig flykt.
    const pts = predictTrajectory({ x: fx, y: fy, vx, vy, gy: G_STEP, steps: 84, every: 3, floorY: FLOOR_Y, damp: 0.999 })
    // Var vikten faller (svag ledtråd nedåt mot brädan).
    g.rect(this._dropX - 2, RAIL_Y + 20, 4, PIVOT_Y - RAIL_Y - 46).fill({ color: COLORS.yellow, alpha: 0.22 })
    // Prickad båge (tonar ut mot slutet).
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      if (p.y > FLOOR_Y - 2) break
      const a = 0.55 * (1 - i / pts.length) + 0.12
      g.circle(p.x, p.y, 5).fill({ color: COLORS.white, alpha: a })
    }
  },

  // Dra den bärbara vikten -> väljer släpp-läge live; uppdaterar bågen.
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _onCarryDown(ctx, e) {
    if (!this._alive) return
    if (this._busy) return this._kvitto(ctx, e)
    this._dragging = true
    this._idle = 0
    this._hideDragHint()
    ctx.services.audio.sfx('tap')
    const local = this._root.toLocal(e.global)
    this._dragDX = this._carried.x - local.x // greppoffset så vikten inte hoppar
  },

  _onCarryMove(ctx, e) {
    if (!this._dragging || !this._alive || this._busy) return
    const local = this._root.toLocal(e.global)
    const x = clamp(local.x + (this._dragDX || 0), DROP_MIN_X, DROP_MAX_X)
    this._dropX = x
    if (this._carried && !this._carried.destroyed) this._carried.x = x
    this._updateAim()
  },

  _onCarryUp(ctx) {
    if (!this._dragging || !this._alive) return
    this._dragging = false
    if (this._busy) return
    this._dropWeight(ctx, this._dropX) // släpp = låt vikten falla där den är
  },

  // Tapp på ett tomt ställe: flytta vikten dit och släpp (tap-fallback för dra).
  _handleTap(ctx, e) {
    if (!this._alive || this._dragging) return
    if (this._busy) {
      ctx.services.audio.sfx('soft')
      if (this._frog && !this._frog.destroyed) wiggle(this._frog)
      return
    }
    this._hideDragHint()
    const local = this._root.toLocal(e.global)
    const x = clamp(local.x, DROP_MIN_X, DROP_MAX_X)
    this._dropX = x
    if (this._carried && !this._carried.destroyed) gsap.to(this._carried, { x, duration: 0.12, ease: 'power2.out' })
    this._updateAim()
    this._dropWeight(ctx, x)
  },

  _hideDragHint() {
    this._everInteracted = true
    this._dragHintTween?.kill()
    if (this._dragHintView && !this._dragHintView.destroyed) {
      gsap.to(this._dragHintView, { alpha: 0, duration: 0.2 })
    }
  },

  // Släpp vald vikt vid valt läge på höger arm; läget bestämmer skjutkraften.
  _dropWeight(ctx, dropX) {
    if (!this._alive || this._busy) return
    this._idle = 0
    this._busy = true
    this._dragging = false

    const size = this._sizes[this._sizeIdx]
    const x = clamp(dropX ?? this._dropX, DROP_MIN_X, DROP_MAX_X)
    this._dropX = x
    // Total skjutkraft = läge × viktstorlek. Total≈1 => grodan landar i korgen.
    this._launchTotal = this._powerPos(x) * size.mul

    // Dölj den bärbara vikten + förhandsvisningen — nu faller en "riktig" vikt.
    this._aimGuide?.clear()
    if (this._carried && !this._carried.destroyed) {
      const c = this._carried
      c.eventMode = 'none'
      gsap.to(c, { alpha: 0, duration: 0.14 })
    }

    const y = DROP_TOP_Y
    const view = makeWeight(size.r, size.kind)
    view.position.set(x, y)
    this._weightLayer.addChild(view)
    view.scale.set(0.3)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.22, ease: 'back.out(2)' })

    const body = this._phys.circle(x, y, size.r, { ...size.mat, label: 'weight' })
    this._phys.link(body, view)
    this._weight = { body, view }

    ctx.services.audio.sfx('pop')

    // Säkerhet: om kollisionen mot brädan av någon anledning missas, skjut ändå.
    this._launchWatchdog = this._addTimer(1.5, () => {
      if (this._alive && this._busy && !this._launched) this._launchFrog(ctx)
    })
  },

  // ---- Kollisioner ---------------------------------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    for (const pair of e.pairs) {
      const a = pair.bodyA.label
      const b = pair.bodyB.label

      // Vikten landar på brädan -> katapultera grodan (efter en liten stund så man
      // hinner se brädan börja vippa).
      if (!this._launched && this._busy && this._weight && (a === 'weight' || b === 'weight') && (a === 'plank' || b === 'plank')) {
        if (now - this._lastHit > 80) {
          this._lastHit = now
          ctx.services.audio.sfx('plopp')
        }
        if (!this._launchPending) {
          this._launchPending = true
          this._addTimer(0.16, () => {
            this._launchPending = false
            if (this._alive && this._busy && !this._launched) this._launchFrog(ctx)
          })
        }
        continue
      }

      // Grodan i korgen!
      if (this._launched && this._frogBody) {
        const fb = this._frogBody
        const involvesFrog = pair.bodyA === fb || pair.bodyB === fb
        if (involvesFrog) {
          const other = pair.bodyA === fb ? pair.bodyB : pair.bodyA
          if (other.label === 'basket') {
            this._land(ctx)
            return
          }
          if (other.label === 'rim' && now - this._lastHit > 120) {
            this._lastHit = now
            ctx.services.audio.sfx('pop')
          }
        }
      }
    }
  },

  // ---- Skjuts (katapult) ---------------------------------------------------

  _launchFrog(ctx) {
    if (!this._alive || this._launched) return
    this._launched = true
    this._launchWatchdog?.kill()
    this._frogBreathe?.kill()

    const fx = this._frog.x
    const fy = this._frog.y

    // Hjälp efter ett par missar: garanterad mjuk båge rakt i korgen.
    if (this._assistNext) {
      this._assistNext = false
      this._assistArc(ctx, fx, fy)
      return
    }

    // Skjutkraft från barnets val (släpp-läge × viktstorlek). Total≈1 => exakt i korgen.
    const { vx, vy } = this._launchVel(fx, fy, this._launchTotal ?? 1)

    const body = this._phys.circle(fx, fy, FROG_R, { restitution: 0.35, friction: 0.3, frictionAir: 0.001, density: 0.001, label: 'frog' })
    Body.setVelocity(body, { x: vx, y: vy })
    this._phys.link(body, this._frog, () => {
      // Grodan snurrar lite glatt medan den flyger.
    })
    this._frogBody = body

    // Grodan sträcker på benen i flykten (link styr bara position/rotation, inte skala).
    gsap.killTweensOf(this._frog.scale)
    this._frog.scale.set(0.86, 1.18)

    ctx.services.audio.sfx('boing')
    if (Math.random() < 0.6) ctx.services.voice.say(randomFrom(LAUNCH_SAY))
    floatText(ctx.fxLayer, fx, fy - 30, randomFrom(['Wheee!', 'Ihuu!', 'Hoppla!']), { fontSize: 40 })
    sparkle(ctx.fxLayer, fx, fy, { count: 6 })
  },

  // Snäll auto-båge (no-fail backstop) — grodan glider tryggt i korgen.
  _assistArc(ctx, fx, fy) {
    ctx.services.voice.say('Titta, jag hjälper grodan!')
    ctx.services.audio.sfx('boing')
    const tx = this._target.x
    const ty = this._target.y
    const arc = 230
    const st = { t: 0 }
    this._assistTween = gsap.to(st, {
      t: 1,
      duration: 0.9,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._frog || this._frog.destroyed) {
          this._assistTween?.kill()
          return
        }
        const t = st.t
        this._frog.x = fx + (tx - fx) * t
        this._frog.y = fy + (ty - fy) * t - Math.sin(Math.PI * t) * arc
        this._frog.rotation += 0.18
      },
      onComplete: () => {
        if (this._alive) this._land(ctx)
      },
    })
  },

  // ---- Landning (lyckat) ---------------------------------------------------

  _land(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._launched = true
    this._launchWatchdog?.kill()
    this._assistTween?.kill()

    const tx = this._target.x
    const ty = this._target.y

    if (this._frogBody) {
      this._phys.removeBody(this._frogBody)
      this._frogBody = null
    }
    this._removeWeight()

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(LAND_PRAISE))

    // Grodan plumsar ner i korgen med en glad squash-studs (i stället för bara krymp).
    if (this._frog && !this._frog.destroyed) {
      gsap.killTweensOf(this._frog)
      gsap.killTweensOf(this._frog.scale)
      gsap.to(this._frog, { x: tx, y: ty + 10, rotation: 0, duration: 0.25, ease: 'power2.in' })
      gsap
        .timeline()
        .to(this._frog.scale, { x: 0.78, y: 0.42, duration: 0.16, ease: 'power2.in' })
        .to(this._frog.scale, { x: 0.55, y: 0.6, duration: 0.2, ease: 'back.out(2.2)' })
    }
    if (!this._basket.destroyed) pop(this._basket, { scale: 1.1 })

    // Mottagaren fångar grodan: riggens `jubel` (hopp + utsträckta armar) i stället
    // för en skal-puls på lådan runt honom — gesten kommer nu ur figuren själv.
    if (this._bobo && !this._bobo.destroyed) {
      this._kar?.react('jubel')
      floatText(ctx.fxLayer, this._bobo.x, this._bobo.y - 66, randomFrom(['❤️', 'Bravo!', 'Hurra!']), { fontSize: 44 })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    puff(ctx.fxLayer, tx, ty, { count: 14, color: COLORS.yellow })
    sparkle(ctx.fxLayer, tx, ty, { count: 8 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('landningar', (ctx.progress.get().custom?.landningar || 0) + 1)
    ctx.progress.complete()

    this._addTimer(1.7, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Miss (alltid roligt, aldrig straff) ---------------------------------

  _miss(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._launchWatchdog?.kill()

    let lx = this._frog?.x ?? CX
    let ly = this._frog?.y ?? FLOOR_Y
    if (this._frogBody) {
      lx = this._frogBody.position.x
      ly = this._frogBody.position.y
      this._phys.removeBody(this._frogBody)
      this._frogBody = null
    }

    ctx.services.audio.sfx('soft')
    if (this._frog && !this._frog.destroyed) {
      gsap.killTweensOf(this._frog)
      gsap.killTweensOf(this._frog.scale)
      wiggle(this._frog)
    }
    puff(ctx.fxLayer, lx, Math.min(ly, FLOOR_Y), { count: 8, color: COLORS.green })
    floatText(ctx.fxLayer, lx, ly - 30, randomFrom(['Hihi!', 'Hoppsan!', 'Plums!']), { fontSize: 44 })
    // Mottagaren blir FÖRVÅNAD, aldrig sur — missen är rolig, inte en tillsägelse.
    this._kar?.react('hoppsan')

    this._misses++
    if (this._misses >= 2) {
      this._assistNext = true
      ctx.services.voice.say('Nästa gång hjälper jag dig!')
    } else if (Math.random() < 0.6) {
      ctx.services.voice.say(randomFrom(MISS_SAY))
    }

    this._addTimer(0.8, () => {
      if (this._alive) this._resetSeesaw(ctx)
    })
  },

  _removeWeight() {
    const w = this._weight
    this._weight = null
    if (!w) return
    if (w.body) this._phys.removeBody(w.body)
    const v = w.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, {
      x: 0,
      y: 0,
      duration: 0.28,
      ease: 'back.in(1.8)',
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
  },

  // ---- Ticker --------------------------------------------------------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    this._tame()
    this._idle += t.deltaMS / 1000

    // Mottagaren följer grodan med blicken — på plankan, i luften, hela vägen. Det är
    // hela poängen med att ha någon som väntar. `toLocal` går genom den yttre
    // containerns transform, så `wiggle`s rotation räknas bort av sig själv.
    if (this._kar && this._bobo && !this._bobo.destroyed && this._frog && !this._frog.destroyed) {
      const p = this._bobo.toLocal(this._frog.getGlobalPosition())
      this._kar.look(p.x, p.y)
    }

    if (!this._launched && !this._resolving) {
      // Grodan rider på vänster planktipp tills den skjuts iväg och lutar sig ivrigt
      // mot korgen (tittar mot målet) — högre korg = lite större lutning.
      this._positionFrogOnPlank()
      if (this._frog && !this._frog.destroyed) {
        this._frog.rotation = clamp(0.08 + (this._frog.y - this._target.y) / 2600, 0.06, 0.18)
      }
    } else if (this._launched && this._frogBody && !this._resolving) {
      const fb = this._frogBody
      const dx = fb.position.x - this._target.x
      const dy = fb.position.y - this._target.y
      const near = Math.hypot(dx, dy) < this._target.r
      // "Magnetisk" korg: nedåtgående groda nära korgen räknas som landning (snäll).
      const magnetic = fb.velocity.y > 0 && Math.abs(dx) < 120 && dy > -150 && dy < 110
      if (near || magnetic) {
        this._land(ctx)
        return
      }
      if (fb.position.y > FLOOR_Y - 20 || fb.position.x > 1290 || fb.position.x < -10) {
        this._miss(ctx)
        return
      }
    }

    // Idle-recue (bara när inget händer).
    if (!this._busy && !this._resolving && this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_CUES))
      if (this._frog && !this._frog.destroyed) pop(this._frog)
    }
  },

  // Håll plankans rörelse lugn och läsbar; hindra att den slår runt.
  _tame() {
    const pb = this._plankBody
    if (!pb) return
    const av = pb.angularVelocity
    if (Math.abs(av) > 0.12) Body.setAngularVelocity(pb, Math.sign(av) * 0.12)
    if (Math.abs(pb.angle) > 0.5) {
      Body.setAngle(pb, Math.sign(pb.angle) * 0.5)
      Body.setAngularVelocity(pb, 0)
    }
  },

  _addTimer(delay, fn) {
    const tw = gsap.delayedCall(delay, fn)
    this._timers.push(tw)
    return tw
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()

    this._timers.forEach((tw) => tw?.kill())
    this._timers = []
    this._launchWatchdog?.kill()
    this._assistTween?.kill()
    this._basketTween?.kill()
    this._frogBreathe?.kill()
    this._dragHintTween?.kill()
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onTap)

    if (this._frog && !this._frog.destroyed) {
      gsap.killTweensOf(this._frog)
      gsap.killTweensOf(this._frog.scale)
    }
    if (this._weight?.view && !this._weight.view.destroyed) {
      gsap.killTweensOf(this._weight.view)
      gsap.killTweensOf(this._weight.view.scale)
    }
    if (this._carried && !this._carried.destroyed) {
      gsap.killTweensOf(this._carried)
      gsap.killTweensOf(this._carried.scale)
    }
    if (this._dragHintView && !this._dragHintView.destroyed) gsap.killTweensOf(this._dragHintView)
    if (this._basketGlow && !this._basketGlow.destroyed) gsap.killTweensOf(this._basketGlow.scale)
    if (this._basket && !this._basket.destroyed) gsap.killTweensOf(this._basket.scale)
    if (this._plankView && !this._plankView.destroyed) gsap.killTweensOf(this._plankView.scale)
    this._sizeButtons?.forEach((b) => {
      if (b && !b.destroyed) gsap.killTweensOf(b.scale)
    })

    this._phys?.destroy() // rensar även constrainten (Composite.clear)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Planka: avrundad träbjälke med en glad nav-bult i mitten (roterar med plankan).
function makePlank() {
  const c = new Container()
  const board = new Graphics()
    .roundRect(-PLANK_HALF, -PLANK_H / 2, PLANK_W, PLANK_H, PLANK_H / 2)
    .fill(COLORS.brown)
    .stroke({ width: 4, color: shade(COLORS.brown, 0.25) })
  // Små "sitt-dynor" i ändarna.
  board.roundRect(-PLANK_HALF + 8, -PLANK_H / 2 - 6, 70, 8, 4).fill({ color: COLORS.green, alpha: 0.9 })
  board.roundRect(PLANK_HALF - 78, -PLANK_H / 2 - 6, 70, 8, 4).fill({ color: COLORS.red, alpha: 0.9 })
  const bolt = new Graphics().circle(0, 0, 9).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
  c.addChild(board, bolt)
  return c
}

// RITAD vikt (P0 ASSETS): fjäder, äpple eller städ — egen silhuett, aldrig en emoji
// i en grå cirkel. Radien r styr storleken (och därmed massan i fysiken).
function makeWeight(r, kind = 'apple') {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, r * 0.9, r * 0.8, r * 0.26).fill({ color: 0x000000, alpha: 0.14 })
  shadow.eventMode = 'none'
  const g = new Graphics()
  if (kind === 'fjader') {
    g.moveTo(-r * 0.2, r).quadraticCurveTo(r * 0.2, r * 0.1, r * 0.55, -r * 0.95)
      .stroke({ width: r * 0.14, color: 0xe8dfc8, cap: 'round' })
    g.moveTo(r * 0.5, -r * 0.85).quadraticCurveTo(-r * 0.55, -r * 0.5, -r * 0.15, r * 0.55)
      .quadraticCurveTo(r * 0.55, r * 0.1, r * 0.5, -r * 0.85).fill(0xfffdf7)
    g.moveTo(r * 0.5, -r * 0.85).quadraticCurveTo(r * 0.95, -r * 0.2, r * 0.1, r * 0.7)
      .quadraticCurveTo(r * 0.3, r * 0.05, r * 0.5, -r * 0.85).fill(0xdff0f7)
    for (let i = 1; i <= 5; i++) {
      const t = i / 6
      g.moveTo(r * (0.5 - 0.7 * t), -r * (0.85 - 1.4 * t))
        .lineTo(r * (0.5 - 0.2 * t), -r * (0.85 - 1.5 * t))
        .stroke({ width: 1.6, color: 0xb9cfd9, alpha: 0.8 })
    }
  } else if (kind === 'stad') {
    // städ: tung svart kloss med horn och fot
    g.roundRect(-r * 0.42, r * 0.42, r * 0.84, r * 0.42, r * 0.12).fill(0x4a5560)
    g.roundRect(-r * 0.28, r * 0.02, r * 0.56, r * 0.46, r * 0.08).fill(0x5b6773)
    g.moveTo(-r * 0.92, -r * 0.5).lineTo(r * 0.78, -r * 0.5).quadraticCurveTo(r * 1.06, -r * 0.24, r * 0.66, -r * 0.06)
      .lineTo(-r * 0.72, -r * 0.06).quadraticCurveTo(-r * 0.96, -r * 0.28, -r * 0.92, -r * 0.5).fill(0x5b6773)
    g.moveTo(-r * 0.92, -r * 0.5).lineTo(r * 0.78, -r * 0.5).lineTo(r * 0.7, -r * 0.34).lineTo(-r * 0.84, -r * 0.34)
      .closePath().fill({ color: 0x8b98a4, alpha: 0.9 })
  } else {
    // äpple
    g.circle(-r * 0.3, 0, r * 0.76).fill(0xff6b6b)
    g.circle(r * 0.3, 0, r * 0.76).fill(0xff6b6b)
    g.ellipse(0, r * 0.12, r * 0.9, r * 0.82).fill(0xff6b6b)
    g.moveTo(0, -r * 0.66).quadraticCurveTo(r * 0.1, -r * 1.0, r * 0.36, -r * 1.14)
      .stroke({ width: r * 0.13, color: 0x6f452c, cap: 'round' })
    g.ellipse(-r * 0.38, -r * 0.92, r * 0.44, r * 0.24).fill(0x5bbf6a)
    g.ellipse(-r * 0.34, -r * 0.22, r * 0.24, r * 0.36).fill({ color: 0xffffff, alpha: 0.35 })
  }
  g.eventMode = 'none'
  c.addChild(shadow, g)
  return c
}

// RITAD groda (P0 ASSETS): egen silhuett med ögonkullar, ljus mage, ben och ett leende.
function makeFrog() {
  const c = new Container()
  const R = FROG_R
  const shadow = new Graphics().ellipse(0, R * 0.9, R * 0.9, R * 0.26).fill({ color: 0x000000, alpha: 0.14 })
  shadow.eventMode = 'none'
  const g = new Graphics()
  g.ellipse(-R * 0.78, R * 0.55, R * 0.34, R * 0.18).fill(0x4fae51) // bakben
  g.ellipse(R * 0.78, R * 0.55, R * 0.34, R * 0.18).fill(0x4fae51)
  g.ellipse(0, R * 0.16, R * 0.92, R * 0.78).fill(0x6ac96a) // kropp
  g.ellipse(0, R * 0.42, R * 0.58, R * 0.36).fill(0xdff6c8) // ljus mage
  g.circle(-R * 0.44, -R * 0.62, R * 0.3).fill(0x6ac96a) // ögonkullar
  g.circle(R * 0.44, -R * 0.62, R * 0.3).fill(0x6ac96a)
  g.circle(-R * 0.44, -R * 0.66, R * 0.19).fill(0xfffdf7)
  g.circle(R * 0.44, -R * 0.66, R * 0.19).fill(0xfffdf7)
  g.circle(-R * 0.4, -R * 0.62, R * 0.1).fill(0x33291f)
  g.circle(R * 0.48, -R * 0.62, R * 0.1).fill(0x33291f)
  g.circle(-R * 0.12, -R * 0.22, R * 0.05).fill(0x3a6b2f) // näsborrar
  g.circle(R * 0.12, -R * 0.22, R * 0.05).fill(0x3a6b2f)
  g.moveTo(-R * 0.4, R * 0.02).quadraticCurveTo(0, R * 0.34, R * 0.4, R * 0.02)
    .stroke({ width: R * 0.09, color: 0x2f6b2a, cap: 'round' })
  g.eventMode = 'none'
  c.addChild(shadow, g)
  return c
}

// Flätad korg med öppning + liten emoji för charm. Origo = öppningens mitt (0,0).
function makeBasket() {
  const c = new Container()
  const brown = 0xb5793a
  const dark = 0x8a5a28
  // Kropp (trapets).
  const body = new Graphics()
    .moveTo(-78, 0)
    .lineTo(78, 0)
    .lineTo(60, 120)
    .lineTo(-60, 120)
    .closePath()
    .fill(brown)
    .stroke({ width: 5, color: dark })
  // Flätmönster (lodräta + vågräta streck).
  for (let i = -60; i <= 60; i += 24) body.moveTo(i, 6).lineTo(i * 0.78, 116).stroke({ width: 3, color: dark, alpha: 0.5 })
  for (let yy = 24; yy < 120; yy += 28) body.moveTo(-72 + yy * 0.12, yy).lineTo(72 - yy * 0.12, yy).stroke({ width: 3, color: dark, alpha: 0.4 })
  // Öppningskant (ellips).
  const rim = new Graphics().ellipse(0, 0, 80, 22).fill(0xd8a566).stroke({ width: 5, color: dark })
  const inner = new Graphics().ellipse(0, 0, 66, 15).fill({ color: 0x6b4a2a, alpha: 0.5 })
  // Liten ritad rosett på korgen (P0 ASSETS — var en 🧺-emoji ovanpå korgen).
  const tag = new Graphics()
  tag.moveTo(0, 66).lineTo(-22, 52).lineTo(-22, 80).closePath().fill(0xff9ec4)
  tag.moveTo(0, 66).lineTo(22, 52).lineTo(22, 80).closePath().fill(0xff9ec4)
  tag.circle(0, 66, 8).fill(0xff6b9d)
  tag.eventMode = 'none'
  c.addChild(body, inner, rim, tag)
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
