// Glasstornet — mysig FYSIK-bygglek (3–5 år). Uppe hänger en glasskula i en kopa som
// åker på en RÄLS. Barnet DRAR kopan i sidled (eller tap-tap:ar på rälsen) och SLÄPPER
// (lyfter fingret) för att TAPPA kulan: den faller med riktig matter.js-fysik, landar
// mjukt på struten, vobblar och nestlar sig.
//
// MOTGÅNG = VINDEN. En bris växlar riktning fram och tillbaka (gravitationens
// x-komponent) och blåser både den fallande kulan och tornet i sidled. Vinden är
// SYNLIG: en vimpel på en flaggstång står rakt ut när det blåser och hänger slak +
// blir grön när det är lugnt, dessutom drar vindstreck genom himlen. Den prickade
// banan simuleras steg för steg med samma vind → landningsringen ljuger aldrig, och
// den blir GRÖN när kulan kommer att landa på tornet. Honungsburken (tryck!) gör nästa
// kula klistrig (mer friktion, lättare) = tål vinden bättre. Två kontroller, ett mål.
//
// MÅLET ÄR KÖRSBÄRET. Till höger står en måttstock med lika många rutor som kulor som
// behövs; rutorna lyser gult en i taget och överst sitter körsbäret. När tornet nått
// upp hoppar körsbäret ner och kröner glassen, som serveras till Bobo som mumsar.
//
// INGEN game over: en kula som blåser av studsar mjukt, fnissar ("Hihi!") och tas bort
// — en ny dyker upp direkt; bara kulor som blir LIGGANDE räknas (aldrig som siffra).
// Efter tre bortblåsta kulor i rad kommer hjälpen SENT och SYNLIGT ("Jag hjälper
// till!": klistrig kula + mjuk magnet). Allt ritas programmatiskt (Pixi Graphics).
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, puff, sparkle, ripple, burst, bigCelebration, floatText } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS } from '../../lib/theme.js'

// ---- Layout (designkoordinater 1280×720) --------------------------------
// Marken (createScene groundH 96) har ovankant y=624. Skalets hörnknappar upptar
// y ≤ 110 vid x<140 och x>1140 — allt spelbart hålls innanför det.
const GRAV_Y = 1.0 // mjuk gravitation → lugnt, följbart fall
const TOWER_CX = 640 // strutens mittlinje
const GROUND_TOP = 624
const RAIL_Y = 104 // rälsen som kopan åker på
const RAIL_X0 = 290
const RAIL_X1 = 990
const CARRIER_Y = 176 // kulans centrum medan den hänger i kopan
const X_MIN = 330 // kopans sidledsgränser (fria från hörnknapparna)
const X_MAX = 950
const SCOOP_R = 42 // fysikradie
const SCOOP_VR = 44 // visuell radie
const GOAL_X = 1010 // måttstocken med körsbäret
const FLAG_X = 1180 // vindflaggan
const FLAG_TOP = 320
const JAR_X = 300 // honungsburken (klister-kontrollen)
const JAR_Y = 546

// Nominella stapelhöjder (kul-centra; fysiken sätter dem exakt) — guide för
// måttstockens rutor. Första kulan vilar i strut-koppen, sedan 2×radie upp.
const STACK_Y = [480, 396, 312, 228]
const MAX_GOAL = STACK_Y.length // fler kulor än så får inte plats under rälsen

// Material (kropp-opts, egna blandningar):
const SCOOP_NORMAL = { restitution: 0.1, friction: 0.7, frictionAir: 0.012, density: 0.0016, label: 'scoop' }
// klister-glass: griper hårt + lättare massa (mindre vältmoment) = mycket stabilare.
const SCOOP_STICKY = { restitution: 0.02, friction: 0.95, frictionAir: 0.02, density: 0.001, label: 'scoop' }

// Vila-/settle-trösklar.
const REST_SPEED = 0.6 // matter-fart under detta = kulan har lugnat sig
const REST_HOLD = 350 // ms i vila innan vi utvärderar
const SETTLE_MAX = 1600 // ms → tvinga fram utvärdering (spelet "hänger" aldrig)
const GROUND_Y = 600 // body.position.y >= detta = nådde marken (blåste av)
const COLUMN_MAX = 78 // max avstånd från mittlinjen för att räknas som del av tornet
const IDLE_MS = 6000 // ms utan handling → röst-recue

// Riktiga glass-smaker: varje smak har egen färg OCH egen dekor (frön/strössel/chips/swirl).
const FLAVORS = [
  { color: 0xff9ec4, kind: 'strawberry' }, // jordgubb (röda frön)
  { color: 0x8a5a3b, kind: 'chocolate' }, // choklad (färgglatt strössel)
  { color: 0x9fe3c9, kind: 'mint' }, // mint (mörka chokladchips)
  { color: 0xfdf2d0, kind: 'vanilla' }, // vanilj (gyllene swirl)
  { color: 0xb7a6ef, kind: 'blueberry' }, // blåbär (blå prickar)
]
const HONEY = 0xf1a92c
const HONEY_LIGHT = 0xf8c657
const PLACE_LINES = ['En till!', 'Så fint!', 'Pling!']
const GIGGLES = ['Hihi!', 'Hoppsan!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'glasstornet',
  titleSv: 'Glasstornet',
  icon: '🍦',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'glasstornet',
  voiceIntro: 'Stapla glasskulorna! Dra en kula i sidled och släpp den på toppen.',

  init(ctx) {
    this._alive = true
    this._live = [] // levande kul-kroppar { body, view, magnet }
    this._sticky = false // honungs-toggle (nästa kula)
    this._helpNext = false // mjuk auto-hjälp på nästa kula
    this._count = 0 // kulor som ligger kvar på tornet just nu
    this._fallStreak = 0
    this._stallT = 0 // ms sedan tornet stod ett steg från mål
    this._falling = false // en kula faller/settlar (inget nytt släpp)
    this._resolving = false // firande pågår (lås alla pekar-callbacks)
    this._dragging = false
    this._idle = 0
    this._swayT = 0
    this._lean = 0 // vindens acceleration i sidled just nu
    this._amp = 0.14
    this._period = 2600
    this._calm = true
    this._settle = 0
    this._restAcc = 0
    this._placeN = 0
    this._pointerId = null
    this._lastDropped = null // nyaste kroppen (settle-bevakas)
    this._lastRec = null
    this._level = 0
    this._goal = 3
    this._cherryFlying = false
    this._saidGoal = false // "Bygg upp till körsbäret!" sägs en gång per pass
    this._saidWind = false // vind-förklaringen sägs en gång per pass
    this._serveItem = null // glass som flyger till mottagaren vid finalen

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bundna lyssnare (för ren av-registrering).
    this._onPlateTapBound = (e) => this._onPlateTap(ctx, e)
    this._onJarTapBound = () => this._toggleSticky(ctx)
    this._onScoopDown = (e) => this._scoopDown(ctx, e)
    this._onScoopMove = (e) => this._scoopMove(ctx, e)
    this._onScoopUp = (e) => this._scoopUp(ctx, e)

    this._buildScene(ctx)

    this._phys = new PhysicsWorld({ gravityY: GRAV_Y, walls: ['floor', 'left', 'right'] })
    this._buildCone()

    this._newTower(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen (byggs en gång) --------------------------------------

  _buildScene(ctx) {
    // Pastell glass-bakgrund (markens ovankant hamnar vid y=624).
    const bg = createScene('candy', { width: ctx.width, height: ctx.height, ground: true, groundH: 96 })
    // Glasskiosk i stället för en tom pastellyta: randig markis, en hylla med
    // sirapsflaskor till vänster och en disk längs golvet.
    const shop = new Graphics()
    for (let x = -20; x < ctx.width + 40; x += 92) {
      shop.moveTo(x, 0).lineTo(x + 46, 0).lineTo(x + 46, 56).lineTo(x, 56).closePath()
        .fill({ color: 0xff9ec4, alpha: 0.55 })
      shop.moveTo(x + 46, 0).lineTo(x + 92, 0).lineTo(x + 92, 56).lineTo(x + 46, 56).closePath()
        .fill({ color: 0xfffdf7, alpha: 0.6 })
    }
    for (let x = -20; x < ctx.width + 40; x += 46) {
      shop.moveTo(x, 56).lineTo(x + 46, 56).lineTo(x + 23, 82).closePath()
        .fill({ color: (x / 46) % 2 ? 0xfffdf7 : 0xff9ec4, alpha: 0.55 })
    }
    // hylla med sirapsflaskor
    shop.roundRect(60, 330, 250, 12, 6).fill({ color: 0xdcb388, alpha: 0.75 })
    const BOT = [0xff6b6b, 0x57c8c3, 0xffd35c, 0xa78bfa]
    for (let i = 0; i < 4; i++) {
      const bx = 84 + i * 58
      shop.roundRect(bx, 272, 30, 58, 8).fill({ color: BOT[i], alpha: 0.7 })
      shop.roundRect(bx + 9, 256, 12, 20, 5).fill({ color: BOT[i], alpha: 0.55 })
      shop.roundRect(bx + 6, 250, 18, 9, 4).fill({ color: 0xfffdf7, alpha: 0.8 })
      shop.roundRect(bx + 3, 286, 24, 16, 4).fill({ color: 0xfffdf7, alpha: 0.55 })
    }
    // disk längs golvet
    shop.roundRect(-20, GROUND_TOP - 22, ctx.width + 60, 30, 12).fill({ color: 0xffc4e0, alpha: 0.55 })
    shop.rect(-20, GROUND_TOP - 22, ctx.width + 60, 8).fill({ color: 0xfffdf7, alpha: 0.5 })
    for (let x = 20; x < ctx.width; x += 64) {
      shop.circle(x, GROUND_TOP + 40, 9).fill({ color: 0xffffff, alpha: 0.35 })
    }
    shop.eventMode = 'none'
    bg.addChild(shop)
    bg.eventMode = 'none'
    this._root.addChild(bg)

    // Vindstreck i himlen (drar åt det håll det blåser).
    this._streaks = []
    for (let i = 0; i < 7; i++) {
      this._streaks.push({
        x: 80 + Math.random() * 1120,
        y: 150 + Math.random() * 400,
        len: 40 + Math.random() * 80,
        a: 0.5 + Math.random() * 0.5,
      })
    }
    this._windG = new Graphics()
    this._windG.eventMode = 'none'
    this._root.addChild(this._windG)

    // Osynlig bak-platta / tap-räls: tap var som helst → kopan glider dit.
    this._plate = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._plate.eventMode = 'static'
    this._plate.on('pointertap', this._onPlateTapBound)
    this._root.addChild(this._plate)

    // Vindflagga (visar motgången) + måttstock med körsbäret (visar målet).
    this._flagG = new Graphics()
    this._flagG.eventMode = 'none'
    this._root.addChild(this._flagG)

    this._goalG = new Graphics()
    this._goalG.eventMode = 'none'
    this._root.addChild(this._goalG)

    // Glassugen mottagare (Bobo) som väntar: blir sugnare ju högre tornet blir och
    // MUMSAR glassen vid finalen — bygget får ett syfte.
    this._buildCustomer()

    // Mjuk skugga under struten.
    this._shadow = new Graphics().ellipse(TOWER_CX, 612, 110, 22).fill({ color: 0x000000, alpha: 0.18 })
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Strut-grafik (fylls i _buildCone).
    this._coneG = new Graphics()
    this._coneG.eventMode = 'none'
    this._root.addChild(this._coneG)

    // Kul-lager (icke-interaktivt → pekningar faller ner till bak-plattan).
    this._scoopLayer = new Container()
    this._scoopLayer.eventMode = 'none'
    this._scoopLayer.interactiveChildren = false
    this._root.addChild(this._scoopLayer)

    // Sikt-guide: simulerad prickbana + landningsring (ritas medan vi bär).
    this._guide = new Graphics()
    this._guide.eventMode = 'none'
    this._root.addChild(this._guide)

    // Rälsen (statisk) + kopan/vagnen (ritas medan vi bär).
    this._railG = new Graphics()
    this._railG.eventMode = 'none'
    this._root.addChild(this._railG)
    this._drawRail()

    this._holderG = new Graphics()
    this._holderG.eventMode = 'none'
    this._root.addChild(this._holderG)

    // Kul-lager för den burna kulan (ovanpå kopan; barnen är interaktiva).
    this._carrierLayer = new Container()
    this._root.addChild(this._carrierLayer)

    this._buildHoneyJar()
  },

  // Bobo väntar på sin glass: ritad kropp + maskot-huvudet.
  _buildCustomer() {
    const c = new Container()
    c.position.set(146, 462)
    const g = new Graphics()
    g.ellipse(0, 158, 60, 14).fill({ color: 0x000000, alpha: 0.16 })
    g.ellipse(-26, 146, 24, 13).fill(COLORS.orangeDark)
    g.ellipse(26, 146, 24, 13).fill(COLORS.orangeDark)
    g.roundRect(-66, 54, 24, 66, 12).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.roundRect(42, 54, 24, 66, 12).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.roundRect(-48, 28, 96, 118, 44).fill(COLORS.orange).stroke({ width: 4, color: COLORS.orangeDark })
    g.roundRect(-30, 60, 60, 46, 20).fill({ color: COLORS.cream, alpha: 0.85 })
    c.addChild(g)
    c.addChild(makeMascot(56))
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._customer = c
    this._root.addChild(c)
  },

  // Honungsburken = klister-kontrollen. Ett riktigt föremål på marken: locket åker av
  // och en droppe rinner när den är på → "nu blir glassen klistrig".
  _buildHoneyJar() {
    const c = new Container()
    c.position.set(JAR_X, JAR_Y)

    this._jarGlow = new Graphics().circle(0, 10, 78).stroke({ width: 7, color: COLORS.yellow, alpha: 0.9 })
    this._jarGlow.visible = false
    c.addChild(this._jarGlow)

    this._jarG = new Graphics()
    c.addChild(this._jarG)

    this._jarLid = new Graphics()
    this._jarLid.roundRect(-52, -14, 104, 26, 12).fill(COLORS.red).stroke({ width: 4, color: 0xc0392b })
    this._jarLid.roundRect(-18, -24, 36, 12, 6).fill(COLORS.red)
    this._jarLid.position.set(0, -42)
    c.addChild(this._jarLid)

    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 6, 76) // 152px träffyta (≫96)
    c.on('pointertap', this._onJarTapBound)
    this._jar = c
    this._root.addChild(c)
    this._drawHoneyJar()
  },

  _drawHoneyJar() {
    const g = this._jarG
    if (!g || g.destroyed) return
    const on = this._sticky
    g.clear()
    g.ellipse(0, 82, 56, 14).fill({ color: 0x000000, alpha: 0.16 })
    // glasburk
    g.roundRect(-46, -28, 92, 108, 22).fill({ color: 0xfff3d6 }).stroke({ width: 4, color: COLORS.brown })
    // honung inuti + vågig yta
    g.roundRect(-38, 8, 76, 64, 18).fill(HONEY)
    g.moveTo(-38, 14).quadraticCurveTo(-19, 2, 0, 14).quadraticCurveTo(19, 26, 38, 14).lineTo(38, 26).lineTo(-38, 26).closePath().fill(HONEY_LIGHT)
    // honungskaka-etikett (sexhörning)
    for (const cx of [-14, 14]) {
      g.regularPoly(cx, -6, 11, 6, Math.PI / 2).fill({ color: HONEY_LIGHT, alpha: 0.9 }).stroke({ width: 2, color: COLORS.brown })
    }
    // glansstreck
    g.roundRect(-36, -18, 10, 60, 5).fill({ color: 0xffffff, alpha: 0.45 })
    if (on) {
      // droppe som rinner nerför burkens kant
      g.moveTo(44, -18).quadraticCurveTo(58, 0, 50, 14).quadraticCurveTo(42, 0, 44, -18).closePath().fill(HONEY_LIGHT)
      g.circle(51, 20, 9).fill(HONEY_LIGHT)
    }
  },

  // Rälsen som kopan åker på — visar tydligt VAR man kan dra/tappa.
  _drawRail() {
    const g = this._railG
    if (!g || g.destroyed) return
    g.clear()
    g.roundRect(RAIL_X0, RAIL_Y - 10, RAIL_X1 - RAIL_X0, 20, 10).fill(COLORS.cream).stroke({ width: 4, color: COLORS.brown })
    g.circle(RAIL_X0 + 4, RAIL_Y, 14).fill(COLORS.brown)
    g.circle(RAIL_X1 - 4, RAIL_Y, 14).fill(COLORS.brown)
    for (let x = RAIL_X0 + 60; x < RAIL_X1 - 40; x += 70) {
      g.circle(x, RAIL_Y, 3).fill({ color: COLORS.brown, alpha: 0.35 })
    }
  },

  // Brun strut-triangel (spets nedåt) + våffel-linjer + statiska kroppar.
  _buildCone() {
    const g = this._coneG
    g.clear()
    // Utsvängd våffelkant (tratt) — fångar kulor som landar snett och lotsar ner dem
    // i koppen i stället för att de studsar bort. Ritas exakt där kropparna sitter.
    g.moveTo(505, 445).lineTo(590, 510).stroke({ width: 18, color: COLORS.brown, cap: 'round' })
    g.moveTo(775, 445).lineTo(690, 510).stroke({ width: 18, color: COLORS.brown, cap: 'round' })
    g.moveTo(586, 508).lineTo(694, 508).lineTo(640, 624).closePath().fill(COLORS.brown).stroke({ width: 5, color: 0x6e4326 })
    g.moveTo(596, 520).lineTo(642, 606).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })
    g.moveTo(628, 514).lineTo(664, 572).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })
    g.moveTo(684, 516).lineTo(638, 606).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })
    g.moveTo(524, 452).lineTo(538, 462).stroke({ width: 4, color: 0xffe0b0, alpha: 0.3 })
    g.moveTo(756, 452).lineTo(742, 462).stroke({ width: 4, color: 0xffe0b0, alpha: 0.3 })

    // Statisk sockel (ovankant 522 → första kulan vilar vid center 480) + två LUTANDE
    // trattväggar. Halsen (100 px) är bara någon centimeter bredare än en kula, så
    // kulorna hamnar i EN kolumn — tornet blir ett torn, aldrig två i bredd.
    this._phys.rectangle(TOWER_CX, 558, 108, 72, { isStatic: true, friction: 0.9, label: 'cone' })
    const wall = { isStatic: true, friction: 0.35, restitution: 0.05, label: 'rim' }
    this._phys.rectangle(547, 477, 108, 16, { ...wall, angle: 0.653 })
    this._phys.rectangle(733, 477, 108, 16, { ...wall, angle: -0.653 })
  },

  // ---- Torn (runda) -------------------------------------------------------

  _newTower(ctx) {
    if (!this._alive) return
    this._finishCall?.kill()
    this._cherryTween?.kill()
    this._serveTween?.kill()
    if (this._cherry && !this._cherry.destroyed) {
      gsap.killTweensOf(this._cherry)
      gsap.killTweensOf(this._cherry.scale)
      this._cherry.destroy({ children: true })
    }
    this._cherry = null
    this._cherryFlying = false
    if (this._serveItem && !this._serveItem.destroyed) {
      gsap.killTweensOf(this._serveItem)
      this._serveItem.destroy({ children: true })
    }
    this._serveItem = null

    this._clearLive()

    this._count = 0
    this._fallStreak = 0
    this._stallT = 0
    this._falling = false
    this._resolving = false
    this._dragging = false
    this._helpNext = false
    this._swayT = 0
    this._lean = 0
    this._idle = 0

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._goal = Math.min(3 + this._level, MAX_GOAL)

    // Körsbäret sitter överst på måttstocken tills tornet nått upp.
    this._goalTopY = STACK_Y[this._goal - 1] - 30
    this._cherryHome = { x: GOAL_X, y: this._goalTopY - 38 }
    const cherry = this._makeCherry()
    cherry.position.set(this._cherryHome.x, this._cherryHome.y)
    cherry.eventMode = 'none'
    this._root.addChild(cherry)
    this._cherry = cherry

    this._drawGoalPole()
    this._spawnCarrier(ctx)
  },

  // Skapa nästa kula hängande i kopan vid (640, CARRIER_Y).
  _spawnCarrier(ctx) {
    if (!this._alive || this._resolving) return
    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    const view = this._makeScoop(randomFrom(FLAVORS))
    view.position.set(TOWER_CX, CARRIER_Y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 66) // 132px träffyta
    view.on('pointerdown', this._onScoopDown)
    view.on('globalpointermove', this._onScoopMove)
    view.on('pointerup', this._onScoopUp)
    view.on('pointerupoutside', this._onScoopUp)
    this._carrierLayer.addChild(view)

    this._carrier = view
    this._dragging = false
    this._idle = 0
    this._applyStickyLook(view, this._sticky || this._helpNext)
    bounceIn(view)
  },

  // ---- Peklogik på den burna kulan ---------------------------------------

  _scoopDown(ctx, e) {
    if (!this._alive || this._resolving || this._falling || !this._carrier || this._dragging) return
    this._dragging = true
    this._pointerId = e.pointerId
    gsap.killTweensOf(this._carrier)
    gsap.killTweensOf(this._carrier.scale)
    gsap.to(this._carrier.scale, { x: 1.12, y: 1.12, duration: 0.12, ease: 'power2.out' })
    ctx.services.audio.sfx('tap')
    this._idle = 0
  },

  _scoopMove(_ctx, e) {
    if (!this._dragging || e.pointerId !== this._pointerId || !this._carrier) return
    const p = this._root.toLocal(e.global)
    this._carrier.x = clamp(p.x, X_MIN, X_MAX)
    this._idle = 0
  },

  _scoopUp(ctx, e) {
    if (!this._dragging || (e && e.pointerId !== this._pointerId)) return
    this._dragging = false
    const x = this._carrier ? this._carrier.x : TOWER_CX
    this._dropScoop(ctx, x)
  },

  // Tap på bak-rälsen → kopan glider dit (tap-tap-fallback för de minsta).
  _onPlateTap(ctx, e) {
    if (!this._alive || this._resolving || this._falling || !this._carrier) return
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, X_MIN, X_MAX)
    gsap.killTweensOf(this._carrier)
    gsap.to(this._carrier, { x, duration: 0.25, ease: 'power2.out' })
    ctx.services.audio.sfx('soft')
    ripple(ctx.fxLayer, x, CARRIER_Y, { maxR: 60 })
    this._idle = 0
  },

  // Släpp = tappa: gör den burna vyn till en fallande matter-kropp.
  _dropScoop(ctx, x) {
    if (!this._alive || this._resolving || this._falling || !this._carrier) return
    const view = this._carrier
    this._detachCarrier(view)
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    view.scale.set(1)

    this._scoopLayer.addChild(view)
    view.position.set(x, CARRIER_Y)

    const help = this._helpNext
    const mat = this._sticky || help ? SCOOP_STICKY : SCOOP_NORMAL
    const body = this._phys.circle(x, CARRIER_Y, SCOOP_R, { ...mat })
    this._phys.link(body, view)

    const rec = { body, view, magnet: help }
    this._live.push(rec)
    this._lastDropped = body
    this._lastRec = rec
    this._carrier = null
    this._helpNext = false
    this._falling = true
    this._settle = 0
    this._restAcc = 0
    this._stallT = 0

    ctx.services.audio.sfx('whoosh')
    this._guide?.clear()
    this._holderG?.clear()
  },

  _toggleSticky(ctx) {
    if (!this._alive || this._resolving) return
    this._sticky = !this._sticky
    this._jarGlow.visible = this._sticky
    this._drawHoneyJar()
    if (this._jarLid && !this._jarLid.destroyed) {
      gsap.killTweensOf(this._jarLid)
      gsap.to(this._jarLid, {
        x: this._sticky ? 62 : 0,
        y: this._sticky ? -16 : -42,
        rotation: this._sticky ? -1.15 : 0,
        duration: 0.26,
        ease: 'back.out(2)',
      })
    }
    ctx.services.audio.sfx('tap')
    ctx.services.audio.tone({ freq: this._sticky ? 392 : 330, dur: 0.14, type: 'sine', vol: 0.24 })
    if (!this._jar.destroyed) pop(this._jar, { scale: 1.09 })
    ctx.services.voice.say(this._sticky ? 'Nu blir kulan klistrig!' : 'Nu är kulan vanlig igen.')
    if (this._carrier && !this._carrier.destroyed && !this._falling) {
      this._applyStickyLook(this._carrier, this._sticky || this._helpNext)
    }
    this._idle = 0
  },

  // ---- Uppdatering --------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dms = ticker.deltaMS

    // Vinden: en bris som växlar riktning fram och tillbaka. Den verkar på ALLA kroppar
    // (fallande kula OCH tornet), och blir en gnutta friskare ju högre tornet är.
    if (!this._resolving) {
      this._swayT += dms
      this._amp = Math.min(0.12 + 0.03 * this._count, 0.26)
      this._period = Math.max(2100, 2700 - this._level * 140)
      this._lean = this._amp * Math.sin((this._swayT * (2 * Math.PI)) / this._period)
      this._calm = Math.abs(this._lean) < this._amp * 0.3
      this._phys.setGravity(GRAV_Y, this._lean)
    }

    // Stega fysiken (fast tidssteg) + synka vyer.
    this._phys.update(dms)

    // Vinden ritas varje frame (vimpel + streck) så motgången alltid syns.
    this._drawWind()

    // Mjukglass sätter sig: kulor som ligger STILLA kryper långsamt mot mittlinjen så
    // högen tidar upp sig till ett torn. Verkar aldrig på en kula som är i luften och
    // aldrig snabbare än vinden — det är fortfarande barnets släpp som avgör.
    if (!this._resolving) {
      for (const rec of this._live) {
        const b = rec.body
        if (!b || b.isStatic || b === this._lastDropped) continue
        if (Math.hypot(b.velocity.x, b.velocity.y) > 1.1) continue
        const dx = TOWER_CX - b.position.x
        if (Math.abs(dx) < 3 || Math.abs(dx) > 110) continue
        Body.setVelocity(b, { x: b.velocity.x + clamp(dx, -1, 1) * 0.2, y: b.velocity.y })
      }
    }

    // Körsbäret guppar mjukt på måttstocken tills det får hoppa ner.
    if (this._cherry && !this._cherry.destroyed && !this._cherryFlying) {
      this._cherry.y = this._cherryHome.y + Math.sin(this._swayT / 420) * 5
      this._cherry.rotation = this._lean * 0.5
    }

    // Medan vi bär: rita kopa + guide, idle-recue, stall-timer.
    if (this._carrier && !this._falling && !this._resolving) {
      this._drawHolder()
      this._drawGuide()
      this._idle += dms
      if (this._idle > IDLE_MS) {
        this._idle = 0
        const v = ctx.services.voice
        if (v.replayLast) v.replayLast()
        else v.say(this.voiceIntro)
        if (this._carrier && !this._carrier.destroyed) pop(this._carrier)
      }
      if (this._count === this._goal - 1) {
        this._stallT += dms
        if (this._stallT > 9000 && !this._helpNext) this._giveHelp(ctx)
      }
    } else if (this._holderG && !this._holderG.destroyed) {
      this._holderG.clear()
    }

    // Settle-bevakning av den fallande kulan.
    if (this._falling) {
      this._settle += dms
      const b = this._lastDropped
      if (b) {
        const sp = Math.hypot(b.velocity.x, b.velocity.y)
        if (sp < REST_SPEED) this._restAcc += dms
        else this._restAcc = 0
        // Mjuk magnet (auto-hjälp): styr lugnt mot mitten så kulan fastnar.
        if (this._lastRec && this._lastRec.magnet) {
          Body.setVelocity(b, { x: b.velocity.x * 0.5 + (TOWER_CX - b.position.x) * 0.03, y: b.velocity.y })
        }
      }
      if ((this._settle > 150 && this._restAcc >= REST_HOLD) || this._settle > SETTLE_MAX) {
        this._evaluate(ctx)
      }
    }
  },

  // Hjälpen kommer SENT och SYNLIGT — barnets sikte/timing avgör i normalfallet.
  _giveHelp(ctx) {
    this._helpNext = true
    this._stallT = 0
    if (this._carrier && !this._carrier.destroyed) {
      this._applyStickyLook(this._carrier, true)
      pop(this._carrier, { scale: 1.2 })
    }
    sparkle(ctx.fxLayer, this._carrier ? this._carrier.x : TOWER_CX, CARRIER_Y, { count: 8 })
    ctx.services.voice.say('Jag hjälper till!')
  },

  // Räkna liggande kulor; bortblåsta studsar bort glatt (no-fail) + auto-hjälp.
  _evaluate(ctx) {
    if (!this._alive) return
    const survivors = []
    let blownOff = false
    for (const rec of this._live) {
      // Räknas bara som en del av glassen om den ligger I tornet: nere på marken
      // eller uthängande på våffelkanten → den glider av med ett fniss.
      const off = rec.body.position.y >= GROUND_Y || Math.abs(rec.body.position.x - TOWER_CX) > COLUMN_MAX
      if (off) {
        // Blåste av → studsa mjukt bort + fniss. Räknas aldrig som fel.
        const x = rec.view.x
        const y = rec.view.y
        this._phys.removeBody(rec.body)
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
        puff(ctx.fxLayer, x, y, { count: 8 })
        floatText(ctx.fxLayer, x, y - 30, randomFrom(GIGGLES))
        ctx.services.audio.sfx('soft')
        blownOff = true
      } else {
        survivors.push(rec)
      }
    }

    const landedNew = survivors.includes(this._lastRec)
    this._live = survivors
    this._count = survivors.length
    this._drawGoalPole()

    if (landedNew) {
      this._fallStreak = 0
      this._stallT = 0
      this._placeReward(ctx, this._lastRec)
    } else {
      this._fallStreak++
      // Första gången vinden faktiskt blåser av en kula: förklara vimpeln.
      if (blownOff && !this._saidWind) {
        this._saidWind = true
        ctx.services.voice.say('Det blåser! Släpp när flaggan hänger stilla.')
      }
    }

    this._falling = false
    this._lastDropped = null
    this._lastRec = null

    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    this._spawnCarrier(ctx)
    // Mjuk auto-hjälp efter tre bortblåsta i rad → garanterad framgång, men synligt.
    if (this._fallStreak >= 3 && !this._helpNext) this._giveHelp(ctx)
  },

  // En kula blev liggande: mjukt "plopp" + STIGANDE pling per våning, nestle-squash,
  // gnistror, måttstocks-ruta som tänds, sugen mottagare + (sparsamt) röst.
  _placeReward(ctx, rec) {
    this._placeN++
    ctx.services.audio.sfx('pop') // mjukt plopp/smask när kulan nestlar sig
    // Stigande pling per våning (pentatoniskt) → tornet "sjunger" högre ju högre det blir.
    const semis = [0, 2, 4, 7, 9, 12]
    const idx = Math.max(0, Math.min(this._count - 1, semis.length - 1))
    ctx.services.audio.tone({ freq: 523.25 * Math.pow(2, semis[idx] / 12), dur: 0.16, type: 'sine', vol: 0.26 })
    this._nestleSquash(rec.view) // squasha/stretcha mjukt som riktig mjukglass
    sparkle(ctx.fxLayer, rec.body.position.x, rec.body.position.y, { count: 6 })
    // Måttstockens nya ruta tänds — höjden syns utan siffror.
    const ry = STACK_Y[Math.min(this._count - 1, STACK_Y.length - 1)]
    sparkle(ctx.fxLayer, GOAL_X, ry, { count: 5 })
    ctx.services.audio.tone({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.16, delay: 0.1 })
    this._reactCustomer(ctx)
    if (this._count === 1 && !this._saidGoal) {
      this._saidGoal = true
      ctx.services.voice.say('Bygg upp till körsbäret!')
    } else if (Math.random() < 0.5) {
      ctx.services.voice.say(randomFrom(PLACE_LINES))
    }
  },

  // Nestle-squash: en landande kula plattas till och studsar tillbaka (taktil stapling).
  _nestleSquash(view) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    gsap
      .timeline()
      .to(view.scale, { x: 1.22, y: 0.82, duration: 0.1, ease: 'power2.out' })
      .to(view.scale, { x: 0.93, y: 1.08, duration: 0.12, ease: 'sine.inOut' })
      .to(view.scale, { x: 1, y: 1, duration: 0.24, ease: 'back.out(2.2)' })
  },

  // Mottagaren blir sugen: studsar till (större ju högre tornet är) + jublar nära mål.
  _reactCustomer(ctx) {
    const c = this._customer
    if (!c || c.destroyed) return
    pop(c, { scale: 1.08 + 0.03 * this._count })
    if (this._count >= Math.max(2, this._goal - 1)) {
      floatText(ctx.fxLayer, c.x, c.y - 96, randomFrom(['Mums!', 'Åh!', 'Oj!']), { fontSize: 40 })
    }
  },

  // ---- Mål nått: körsbäret hoppar ner + firande + nytt torn ---------------

  _finishTower(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true

    // Glassen är klar → vinden mojnar och tornet fryser, så firandet inte blåser
    // sönder det barnet just byggde.
    this._lean = 0
    this._calm = true
    this._phys.setGravity(GRAV_Y, 0)
    for (const rec of this._live) {
      if (rec.body) Body.setStatic(rec.body, true)
    }

    // Hitta tornets topp (lägsta y bland liggande kulor).
    const top = this._towerTop()

    // Körsbäret lämnar måttstocken och kröner glassen (exit-säkert: {}-proxy).
    const cherry = this._cherry
    if (cherry && !cherry.destroyed) {
      this._cherryFlying = true
      const st = { x: cherry.x, y: cherry.y, r: cherry.rotation }
      this._cherryTween = gsap
        .timeline()
        .to(st, {
          x: (cherry.x + top.x) / 2,
          y: top.y - 190,
          r: -0.5,
          duration: 0.34,
          ease: 'power2.out',
          onUpdate: () => {
            if (cherry.destroyed) return
            cherry.position.set(st.x, st.y)
            cherry.rotation = st.r
          },
        })
        .to(st, {
          x: top.x,
          y: top.y - 52,
          r: 0,
          duration: 0.46,
          ease: 'bounce.out',
          onUpdate: () => {
            if (cherry.destroyed) return
            cherry.position.set(st.x, st.y)
            cherry.rotation = st.r
          },
          onComplete: () => {
            if (!this._alive || cherry.destroyed) return
            pop(cherry, { scale: 1.25 })
            ctx.services.audio.tone({ freq: 1046.5, dur: 0.2, type: 'sine', vol: 0.24 })
            sparkle(ctx.fxLayer, top.x, top.y - 52, { count: 8 })
            ctx.services.voice.say('Ett körsbär på toppen!')
          },
        })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, top.x, top.y - 40, { count: 16 })
    this._serveToCustomer(ctx, top.x, top.y - 40) // glassen flyger till den hungriga Bobo

    // Spara förlopp + delat firande (celebrate-ljud, beröm, stjärna + klistermärke).
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('torn', (ctx.progress.get().custom?.torn || 0) + 1)
    ctx.progress.complete()

    this._finishCall = gsap.delayedCall(3.4, () => {
      if (this._alive) this._newTower(ctx)
    })
  },

  _towerTop() {
    let y = STACK_Y[0]
    let x = TOWER_CX
    let best = Infinity
    for (const rec of this._live) {
      if (rec.body.position.y < best) {
        best = rec.body.position.y
        x = rec.body.position.x
      }
    }
    if (best !== Infinity) y = best
    return { x, y }
  },

  // Glassen flyger från tornets topp till Bobo som mumsar ("Mums! Tack för glassen!").
  // Exit-säkert: tweena en {}-proxy, rör Pixi-objektet bara om det lever.
  _serveToCustomer(ctx, fromX, fromY) {
    const c = this._customer
    if (!c || c.destroyed) return
    const item = this._makeMiniGlass()
    item.position.set(fromX, fromY)
    item.eventMode = 'none'
    item.visible = false // syns först när den lyfter (annars dubbelglass på toppen)
    this._root.addChild(item)
    this._serveItem = item
    const st = { x: fromX, y: fromY, s: 1 }
    this._serveTween = gsap.to(st, {
      x: c.x,
      y: c.y - 20,
      s: 0.6,
      duration: 0.7,
      delay: 1.5,
      ease: 'power2.in',
      onStart: () => {
        if (!item.destroyed) item.visible = true
      },
      onUpdate: () => {
        if (item.destroyed) {
          this._serveTween?.kill()
          return
        }
        item.position.set(st.x, st.y)
        item.scale.set(st.s)
      },
      onComplete: () => {
        if (!item.destroyed) item.destroy({ children: true })
        this._serveItem = null
        if (this._alive && c && !c.destroyed) {
          pop(c, { scale: 1.3 })
          floatText(ctx.fxLayer, c.x, c.y - 100, 'Mums!', { fontSize: 46 })
          ctx.services.voice.say('Mums! Tack för glassen!')
          ctx.services.audio.tone({ freq: 660, dur: 0.14, type: 'sine', vol: 0.26 })
          ctx.services.audio.tone({ freq: 990, dur: 0.18, type: 'sine', vol: 0.22, delay: 0.12 })
        }
      },
    })
  },

  // ---- Ritning ------------------------------------------------------------

  // Vinden: vimpel på flaggstången + vindstreck. Slak + grön vimpel = lugnt (släpp nu),
  // rakt utsträckt + orange = det blåser. Detta ERSÄTTER den gamla abstrakta pendeln.
  _drawWind() {
    const g = this._flagG
    if (!g || g.destroyed) return
    const k = clamp(this._lean / (this._amp || 1), -1, 1)
    const calm = this._calm
    g.clear()
    // stång + fot
    g.ellipse(FLAG_X, GROUND_TOP - 4, 52, 12).fill({ color: 0x000000, alpha: 0.16 })
    g.roundRect(FLAG_X - 40, GROUND_TOP - 20, 80, 20, 8).fill(COLORS.brown)
    g.roundRect(FLAG_X - 6, FLAG_TOP, 12, GROUND_TOP - 18 - FLAG_TOP, 6).fill(COLORS.inkSoft)
    g.circle(FLAG_X, FLAG_TOP - 2, 11).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.brown })
    // vimpel: hänger rakt ner när det är lugnt, står rakt ut när det blåser
    const ang = Math.PI / 2 - k * (Math.PI / 2 - 0.12)
    const len = 34 + Math.abs(k) * 66
    const ax = FLAG_X
    const ay = FLAG_TOP + 14
    const nx = -Math.sin(ang)
    const ny = Math.cos(ang)
    const w = 19
    g.moveTo(ax + nx * w, ay + ny * w)
      .lineTo(ax - nx * w, ay - ny * w)
      .lineTo(ax + Math.cos(ang) * len, ay + Math.sin(ang) * len)
      .closePath()
      .fill(calm ? COLORS.green : COLORS.orange)
      .stroke({ width: 3, color: COLORS.white, alpha: 0.8 })

    // vindstreck genom himlen
    const wg = this._windG
    if (!wg || wg.destroyed) return
    wg.clear()
    const alpha = Math.min(0.4, Math.abs(this._lean) * 2.2)
    const dir = this._lean >= 0 ? 1 : -1
    for (const s of this._streaks) {
      s.x += this._lean * 46
      if (s.x > 1360) s.x -= 1500
      else if (s.x < -140) s.x += 1500
      if (alpha < 0.03) continue
      wg.moveTo(s.x, s.y)
        .lineTo(s.x + s.len * dir, s.y)
        .stroke({ width: 4, color: 0xffffff, alpha: alpha * s.a, cap: 'round' })
    }
  },

  // Måttstocken: en ruta per kula som behövs, tänds gult i takt med tornet. Överst
  // sitter körsbäret = målet. En blek prickrad binder ihop måttstocken med tornet.
  _drawGoalPole() {
    const g = this._goalG
    if (!g || g.destroyed) return
    const topY = this._goalTopY ?? STACK_Y[0] - 30
    g.clear()
    g.ellipse(GOAL_X, GROUND_TOP - 4, 56, 13).fill({ color: 0x000000, alpha: 0.16 })
    g.roundRect(GOAL_X - 44, GROUND_TOP - 20, 88, 20, 8).fill(COLORS.brown)
    g.roundRect(GOAL_X - 13, topY, 26, GROUND_TOP - 18 - topY, 11).fill(COLORS.cream).stroke({ width: 4, color: COLORS.brown })
    for (let i = 0; i < this._goal; i++) {
      const y = STACK_Y[i]
      const done = i < this._count
      g.roundRect(GOAL_X - 21, y - 16, 42, 32, 11)
        .fill(done ? COLORS.yellow : { color: COLORS.white, alpha: 0.55 })
        .stroke({ width: 3, color: COLORS.brown })
    }
    // prickrad från tornet ut till måttstocken vid målhöjden
    const gy = STACK_Y[this._goal - 1]
    for (let x = 750; x < GOAL_X - 34; x += 30) {
      g.circle(x, gy, 3.5).fill({ color: COLORS.brown, alpha: 0.28 })
    }
  },

  // Kopan/vagnen som håller kulan och åker på rälsen.
  _drawHolder() {
    const g = this._holderG
    if (!g || g.destroyed || !this._carrier) return
    g.clear()
    const x = this._carrier.x
    g.roundRect(x - 5, RAIL_Y + 8, 10, CARRIER_Y - RAIL_Y - 26, 5).fill(COLORS.inkSoft)
    // kopans skål — moveTo FÖRST, annars drar Pixi en linje från förra pathens slut
    const cr = SCOOP_VR + 12
    const a0 = 0.12 * Math.PI
    g.moveTo(x + Math.cos(a0) * cr, CARRIER_Y - 6 + Math.sin(a0) * cr)
    g.arc(x, CARRIER_Y - 6, cr, a0, 0.88 * Math.PI).stroke({ width: 10, color: 0xd8d0c2, cap: 'round' })
    g.roundRect(x - 34, RAIL_Y - 16, 68, 32, 13).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.circle(x - 17, RAIL_Y + 16, 8).fill(COLORS.brown)
    g.circle(x + 17, RAIL_Y + 16, 8).fill(COLORS.brown)
  },

  // Simulera fallet steg för steg med SAMMA vind som fysiken → ringen ljuger aldrig.
  _predictLanding(x0) {
    const damp = 1 - (this._sticky || this._helpNext ? SCOOP_STICKY.frictionAir : SCOOP_NORMAL.frictionAir)
    const gy = 0.2778 * GRAV_Y
    const top = this._towerTop()
    const targetY = this._count === 0 ? STACK_Y[0] : top.y - 2 * SCOOP_R
    const path = []
    let x = x0
    let y = CARRIER_Y
    let vx = 0
    let vy = 0
    let t = this._swayT
    let stop = targetY
    for (let i = 0; i < 320 && y < stop; i++) {
      t += 1000 / 60
      const lean = this._amp * Math.sin((t * (2 * Math.PI)) / this._period)
      vx = (vx + 0.2778 * lean) * damp
      vy = (vy + gy) * damp
      x += vx
      y += vy
      if (i % 3 === 0) path.push(x, y)
      // Missar den hela strutmunnen? Då fortsätter kulan ända ner till marken —
      // ringen hamnar där den FAKTISKT landar, aldrig en falsk träff i luften.
      if (stop === targetY && y >= targetY && Math.abs(x - TOWER_CX) > 138) stop = 678
    }
    return { x: clamp(x, 90, 1190), y: Math.min(y, stop), path, topX: top.x, ground: stop !== targetY }
  },

  // Prickad (simulerad) bana + landningsring. Ringen blir GRÖN när kulan kommer att
  // landa på tornet — barnet ser direkt hur vind och läge samverkar.
  _drawGuide() {
    const g = this._guide
    if (!g || g.destroyed || !this._carrier) return
    g.clear()
    const pr = this._predictLanding(this._carrier.x)
    const onTarget = !pr.ground && Math.abs(pr.x - (this._count === 0 ? TOWER_CX : pr.topX)) < 40
    const col = onTarget ? COLORS.green : COLORS.white
    for (let i = 0; i < pr.path.length; i += 2) {
      g.circle(pr.path[i], pr.path[i + 1], 4).fill({ color: col, alpha: onTarget ? 0.75 : 0.5 })
    }
    g.circle(pr.x, pr.y, 40).stroke({ width: 6, color: onTarget ? COLORS.green : COLORS.yellow, alpha: onTarget ? 0.95 : 0.6 })
    if (onTarget) g.circle(pr.x, pr.y, 52).stroke({ width: 3, color: COLORS.green, alpha: 0.35 })
  },

  // Glasskula: lite ojämn (riktig kopa-silhuett), skugga, smak-dekor, glans och
  // honungsglasyr när den är klistrig.
  _makeScoop(flavor) {
    const c = new Container()
    c._flavor = flavor

    const shadow = new Graphics()
    this._scoopPath(shadow, SCOOP_VR, 0, 9)
    shadow.fill({ color: 0x000000, alpha: 0.18 })
    c.addChild(shadow)

    const ball = new Graphics()
    this._scoopPath(ball, SCOOP_VR, 0, 0)
    ball.fill(flavor.color).stroke({ width: 3, color: COLORS.white, alpha: 0.55 })
    c.addChild(ball)

    this._decorateScoop(c, flavor)
    c.addChild(new Graphics().ellipse(-15, -17, 13, 9).fill({ color: 0xffffff, alpha: 0.6 }))

    // Honungsglasyr (dold tills kulan är klistrig) — ritad, inte en ikon.
    const glaze = new Graphics()
    glaze.arc(0, -8, SCOOP_VR - 6, Math.PI, 0).fill(HONEY_LIGHT)
    glaze.circle(-22, -6, 7).fill(HONEY_LIGHT)
    glaze.circle(2, 2, 9).fill(HONEY_LIGHT)
    glaze.circle(23, -8, 6).fill(HONEY_LIGHT)
    glaze.visible = false
    c.addChild(glaze)
    c._glaze = glaze
    return c
  },

  // Lätt vågig rund silhuett = ser ut som en glasskopa, inte en perfekt cirkel.
  _scoopPath(g, r, cx = 0, cy = 0) {
    const N = 26
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2
      const rr = r * (1 + 0.05 * Math.sin(th * 5))
      const px = cx + Math.cos(th) * rr
      const py = cy + Math.sin(th) * rr
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    return g
  },

  // Smak-specifik dekor ovanpå färgcirkeln: frön/strössel/chips/swirl → varje kula
  // ser ut som EN riktig smak i stället för en anonym cirkel.
  _decorateScoop(c, flavor) {
    const g = new Graphics()
    g.eventMode = 'none'
    switch (flavor.kind) {
      case 'strawberry':
        for (const [dx, dy] of [[-18, -6], [8, -18], [22, 6], [-4, 16], [-24, 12], [12, 22]]) g.ellipse(dx, dy, 3.5, 5).fill(0xc0392b)
        break
      case 'blueberry':
        for (const [dx, dy] of [[-16, -8], [10, -16], [20, 10], [-8, 18], [-22, 8], [6, 4]]) g.circle(dx, dy, 5).fill(0x5a3fa0)
        break
      case 'chocolate': {
        const cols = [0xff9ec4, 0xffd35c, 0x57c8c3, 0xffffff, 0x5bbf6a, 0xa78bfa]
        const pts = [[-20, -6], [-4, -18], [14, -12], [22, 6], [6, 16], [-16, 14], [-2, 2], [18, -2], [-10, -10]]
        pts.forEach(([dx, dy], i) => {
          if (i % 2) g.roundRect(dx - 6, dy - 2, 12, 4, 2).fill(cols[i % cols.length])
          else g.roundRect(dx - 2, dy - 6, 4, 12, 2).fill(cols[i % cols.length])
        })
        break
      }
      case 'mint':
        for (const [dx, dy] of [[-16, -6], [10, -14], [18, 8], [-6, 16], [-22, 10], [4, 0]]) g.circle(dx, dy, 5).fill(0x3a2a1e)
        break
      case 'vanilla':
        g.arc(0, 0, 28, -0.4, 2.4).stroke({ width: 5, color: 0xe8c37a, alpha: 0.8 })
        g.arc(2, 2, 14, 0.4, 3.2).stroke({ width: 5, color: 0xe8c37a, alpha: 0.7 })
        break
    }
    c.addChild(g)
  },

  // Körsbär som riktigt föremål: två bär, stjälkar och blad — ingen emoji.
  _makeCherry(scale = 1) {
    const c = new Container()
    const g = new Graphics()
    g.moveTo(2, -30).bezierCurveTo(-6, -18, -14, -6, -17, 4).stroke({ width: 5, color: 0x5aa84f, cap: 'round' })
    g.moveTo(2, -30).bezierCurveTo(9, -16, 13, -6, 15, 6).stroke({ width: 5, color: 0x5aa84f, cap: 'round' })
    g.moveTo(4, -32).quadraticCurveTo(24, -46, 34, -32).quadraticCurveTo(20, -24, 4, -32).closePath().fill(0x63c05a)
    g.circle(-17, 18, 16).fill(0xd6294a)
    g.circle(16, 20, 17).fill(0xe23b57)
    g.ellipse(-21, 12, 5, 3.5).fill({ color: 0xffffff, alpha: 0.75 })
    g.ellipse(11, 14, 5.5, 4).fill({ color: 0xffffff, alpha: 0.7 })
    c.addChild(g)
    c.scale.set(scale)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Liten färdig glass (strut + kulor + körsbär) som serveras till Bobo.
  _makeMiniGlass() {
    const c = new Container()
    const g = new Graphics()
    g.moveTo(-18, 6).lineTo(18, 6).lineTo(0, 50).closePath().fill(COLORS.brown).stroke({ width: 3, color: 0x6e4326 })
    g.circle(0, -6, 21).fill(0xff9ec4).stroke({ width: 2, color: COLORS.white, alpha: 0.6 })
    g.circle(-2, -30, 17).fill(0xfdf2d0).stroke({ width: 2, color: COLORS.white, alpha: 0.6 })
    c.addChild(g)
    const ch = this._makeCherry(0.42)
    ch.position.set(0, -50)
    c.addChild(ch)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  _applyStickyLook(view, on) {
    if (view && view._glaze && !view._glaze.destroyed) view._glaze.visible = !!on
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  _detachCarrier(view) {
    if (!view) return
    view.off('pointerdown', this._onScoopDown)
    view.off('globalpointermove', this._onScoopMove)
    view.off('pointerup', this._onScoopUp)
    view.off('pointerupoutside', this._onScoopUp)
    view.eventMode = 'none'
    view.hitArea = null
  },

  _clearLive() {
    for (const rec of this._live) {
      if (rec.body) this._phys.removeBody(rec.body)
      if (rec.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        rec.view.destroy({ children: true })
      }
    }
    this._live = []
    if (this._carrier && !this._carrier.destroyed) {
      this._detachCarrier(this._carrier)
      gsap.killTweensOf(this._carrier)
      gsap.killTweensOf(this._carrier.scale)
      this._carrier.destroy({ children: true })
    }
    this._carrier = null
    this._lastDropped = null
    this._lastRec = null
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._finishCall?.kill()
    this._cherryTween?.kill()
    this._serveTween?.kill()
    if (this._customer && !this._customer.destroyed) {
      gsap.killTweensOf(this._customer)
      gsap.killTweensOf(this._customer.scale)
    }
    if (this._serveItem && !this._serveItem.destroyed) gsap.killTweensOf(this._serveItem)

    if (this._plate && !this._plate.destroyed) this._plate.off('pointertap', this._onPlateTapBound)
    if (this._jar && !this._jar.destroyed) {
      this._jar.off('pointertap', this._onJarTapBound)
      gsap.killTweensOf(this._jar.scale)
    }
    if (this._jarLid && !this._jarLid.destroyed) gsap.killTweensOf(this._jarLid)

    if (this._carrier && !this._carrier.destroyed) {
      this._detachCarrier(this._carrier)
      gsap.killTweensOf(this._carrier)
      gsap.killTweensOf(this._carrier.scale)
    }
    for (const rec of this._live || []) {
      if (rec.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
    }
    if (this._cherry && !this._cherry.destroyed) {
      gsap.killTweensOf(this._cherry)
      gsap.killTweensOf(this._cherry.scale)
    }

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}
