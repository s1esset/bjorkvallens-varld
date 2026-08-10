// Studsa Ner — plinko som RIKTIG lek (2–5 år). Kärnan är kvar: ett glansigt mynt
// pingar ner genom en triangel av pinnar och landar i en färgglad ficka. Men nu finns
// ett MÅL: en ficka LYSER (en utropad färg) och myntet du släpper har samma färg —
// landa i den lysande fickan så fylls en mätare; full mätare = firande + nästa nivå.
// KONTROLL: innan du släpper DRAR du myntet i sidled högst upp för att välja var det
// faller (med en mjuk vink om vilken ficka det lutar åt). Myntet faller HELT naturligt
// under normal tyngdkraft och studsar livligt mot pinnarna — ingen magnetisk styrning.
// ANDRA KONTROLLEN: en FLÄKT står på en räls längs brädets innerkant och blåser inåt.
// Dra den upp/ner för att välja på vilken höjd luften tar tag i myntet, eller över
// brädets mitt för att flytta den till andra sidan (då vänder den). Uppmätt verkan:
// 0,72 fickor mellan vänster- och högerläge — nog för att vända en nära-miss till en
// träff, för lite för att göra siktet meningslöst. Fläkten pausar (bladen stannar,
// strömmen tonar bort) medan ett HJÄLP-släpp faller, så spelets garanti står kvar.
// Inget kan misslyckas: sikta över den lysande fickan, och en "fel" ficka ger ändå ett
// glatt plopp (bara ingen poäng) — aldrig ett straff. Hjälp-släpp (demo/idle) faller
// ovanför målfickan, och en mjuk slump-knuff lossar mynt som råkar fastna på en pinne.
// Nivåer: fler fickor, målet flyttar, fler pinnar. Allt ritas programmatiskt
// (matter.js + Pixi v8), exit-säkert.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, speedToAccel } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { makeBoll } from '../../lib/foremal.js'
import { sparkle, puff, floatText, bigCelebration, breathe, pop } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, DESIGN_W, DESIGN_H, PRAISE } from '../../lib/theme.js'
import { groundFill } from '../../lib/form.js'

const MAX_BALLS = 6 // tak för prestanda; äldsta myntet tonar bort över detta
const TARGET_PER_LEVEL = 3 // antal träffar i målfickan för att fylla mätaren
const BALL_R = 20 // myntradie; lite mindre än pinngapet så det aldrig kilas fast
const TOP_Y = 56 // var myntet föds (i toppbandet) + var droppar-myntet vilar
const BOARD_TOP = 140
const BINS_TOP = 560 // fickornas överkant
const SETTLE_Y = 600 // myntet räknas som "nere i en ficka" under denna y
const SETTLE_SPEED = 0.6 // ... och långsammare än så här
const VOICE_THROTTLE = 2500 // ms mellan glada röst-rop (annars hackar rösten)

// ---- FLÄKTEN (spår 3 runda P1: agens i stället för plinko-tur) --------------
// Myntet faller fritt — men barnet kan STYRA det på vägen ner genom att flytta en
// fläkt. Fläkten står på en räls längs brädets ena innerkant, blåser inåt, och kan
// dras över till andra sidan (då vänder den). Den blåser ALLTID: strömmen syns, så
// kontrollen är upptäckbar utan ett ord.
const FAN_X = [116, 1164] // vänster/höger räls (innanför brädpanelen 72..1208)
const FAN_Y_MIN = 250 // högsta läge (under första pinnraden)
const FAN_Y_MAX = 512 // lägsta läge (ovanför fickorna)
const FAN_BAND = 104 // luftströmmens halva höjd
// Räckvidden måste täcka HELA brädet, inte bara närmaste pinnrad. Första försöket
// (560 px) såg rimligt ut — men mynten faller i mitten, 520 px bort, där avtagandet
// lämnade 6 % av kraften kvar. Uppmätt verkan: 8 px. En kontroll som inte gör något
// är en lögn mot barnet, så avtagandet är nu svagt (ner till 40 % vid andra kanten).
const FAN_REACH = 1150 // hur långt strömmen når i sidled (hela brädet)
const FAN_AVTAG = 0.6 // hur stor DEL av kraften som avtar med avståndet
const FAN_FART = 110 // px/steg: den sidledsfart strömmen strävar mot (se speedToAccel)
const HIT_THROTTLE = 70 // ms mellan pinn-ljud (anti-spam)
const AIM_EDGE = 96 // hur nära kanten man får sikta (så tratten stannar på brädet)

// Flyttbar TRATT överst: en mjuk ∨ av två sluttande väggar som myntet faller IN i och
// styrs rent ner till spouten precis ovanför pinnarna. Detta gör "var släpper jag?" till
// ett verkligt val — myntet börjar sitt fall exakt under fingret, inte efter en lång
// slumpartad rutsch. Gapet (68px) är rejält större än myntet (40px) så inget kan fastna.
const SPOUT_Y = 188 // trattens spout-höjd (strax ovanför första pinnraden vid y=200)
const FUNNEL_DX = 87.5 // sido-offset från trattmitten till varje sluttande väggs mitt
const FUNNEL_CY = 160.8 // väggarnas mitt-y
const FUNNEL_ANG = 0.47 // väggarnas lutning (rad, ~27°)

// Stigande pentaton-skala: varje pinn-träff spelar nästa ton medan myntet rasslar ner
// — ett litet "plink-plink-plong" som klättrar. Jackpott-flärp när det når målet.
const PEG_SCALE = [523, 587, 659, 784, 880, 988, 1175]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Fickfärger med svenska namn (adjektivform: "i den gröna fickan"). De första
// `count` används per nivå, så färgerna är stabila och igenkännliga.
const PALETTE = [
  { color: 0xff8a3d, name: 'orange' },
  { color: 0x5bbf6a, name: 'gröna' },
  { color: 0x4aa3df, name: 'blåa' },
  { color: 0xa78bfa, name: 'lila' },
  { color: 0xff9ec4, name: 'rosa' },
  { color: 0xffd35c, name: 'gula' },
]

const DROP_CHEERS = ['Ner det åker!', 'Studs studs!', 'Titta!', 'Pang!', 'Wii!']
const MISS_CHEERS = ['Nästan! Prova igen.', 'Hoppsan! En till.', 'Snart där!']

export default {
  id: 'studsa-ner',
  titleSv: 'Studsa Ner',
  icon: '🪙',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'studsa-ner',
  voiceIntro: 'Dra myntet och släpp det i fickan som lyser!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._balls = [] // { body, view, settled }
    this._pegBodies = []
    this._pegViews = []
    this._dividerBodies = []
    this._lastHit = 0
    this._lastVoice = 0

    this._collected = 0
    this._missStreak = 0 // räknare för missar i rad (kommentaren lovade förr en automatisk
    // "bris mot målet" — den koden skrevs aldrig, och vinden är numera barnets egen fläkt)
    this._binCount = 4
    this._binW = DESIGN_W / 4
    this._targetIdx = 1
    this._targetColor = PALETTE[1].color
    this._aiming = false
    this._helpCued = false // mjukare auto-hjälp: röst-vink först, hjälp-släpp först senare
    this._binFills = [] // fickornas fyllnads-grafik (för "slukande" squash)
    this._dropX = DESIGN_W / 2

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk bakgrund.
    this._scene = createScene('candy', { width: ctx.width, height: ctx.height })
    this._root.addChild(this._scene)

    // Fysik: golv + sidoväggar (myntet ramlar in uppifrån). Normal nedåtgravitation —
    // ingen konstig/förstärkt tyngdkraft, myntet faller naturligt.
    this._phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildStatic(ctx)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level, false)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._lastVoice = performance.now()
    this._announceTarget(ctx, 1.2)
    // Ett mynt direkt mot målet för att visa idén.
    this._demoTimer = ctx.later(0.6, () => this._alive && this._drop(ctx, this._targetCenterX(), true))
  },

  // ---- Statisk scen (byggs en gång) ---------------------------------------

  _buildStatic(ctx) {
    // Spelbräda.
    const board = new Graphics()
      .roundRect(72, BOARD_TOP, ctx.width - 144, BINS_TOP - BOARD_TOP - 10, 28)
      // Bradan lag pa 115 361 px i EN ton (`_plattprobe --medbakgrund`) — spelets storsta
      // falt och 16 % av skarmen. Den ar ingen textpanel utan sjalva spelytan sedd rakt
      // framifran, sa den tal ljus uppifran. Dampad ramp: cremen ar nastan vit, och
      // kulorna maste fortsatta lasa mot den. Alpha-vagen, se lib/form.js.
      .fill(groundFill(COLORS.cream, { light: 0.04, dark: 0.10, alpha: 0.78 }))
      .stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.2 })
    board.eventMode = 'none'
    this._root.addChild(board)

    // Mjuk markering av toppbandet (där man drar).
    const band = new Graphics().roundRect(72, 16, ctx.width - 144, 96, 24).fill({ color: COLORS.yellow, alpha: 0.18 })
    band.eventMode = 'none'
    this._root.addChild(band)

    // Lager (fylls/återanvänds per nivå).
    this._pegLayer = new Container()
    this._pegLayer.eventMode = 'none'
    this._pegLayer.interactiveChildren = false
    this._root.addChild(this._pegLayer)

    this._binLayer = new Container()
    this._binLayer.eventMode = 'none'
    this._binLayer.interactiveChildren = false
    this._root.addChild(this._binLayer)

    // Flyttbar tratt: två sluttande statiska väggar (∨) + trä-grafik. Myntet faller in
    // överst och styrs rent ner till spouten precis under fingret. Låg studsighet så
    // myntet rutschar ner i stället för att studsa ut ur mynningen.
    this._funnelL = this._phys.rectangle(this._dropX - FUNNEL_DX, FUNNEL_CY, 120, 12, {
      isStatic: true, angle: FUNNEL_ANG, restitution: 0.1, friction: 0.1, label: 'funnel',
    })
    this._funnelR = this._phys.rectangle(this._dropX + FUNNEL_DX, FUNNEL_CY, 120, 12, {
      isStatic: true, angle: -FUNNEL_ANG, restitution: 0.1, friction: 0.1, label: 'funnel',
    })
    this._funnel = new Container()
    this._funnel.eventMode = 'none'
    const fg = new Graphics()
    fg.moveTo(-140.9, -54.5).lineTo(-34, 0).stroke({ width: 13, color: COLORS.brown, cap: 'round' })
    fg.moveTo(140.9, -54.5).lineTo(34, 0).stroke({ width: 13, color: COLORS.brown, cap: 'round' })
    fg.moveTo(-140.9, -57.5).lineTo(-34, -3).stroke({ width: 4, color: COLORS.white, alpha: 0.5, cap: 'round' })
    fg.moveTo(140.9, -57.5).lineTo(34, -3).stroke({ width: 4, color: COLORS.white, alpha: 0.5, cap: 'round' })
    this._funnel.addChild(fg)
    this._funnel.position.set(this._dropX, SPOUT_Y)
    this._root.addChild(this._funnel)

    // Glöd över målfickan (positioneras per nivå; andas för att dra blicken).
    this._glow = new Container()
    this._glow.eventMode = 'none'
    this._glowG = new Graphics()
    this._glow.addChild(this._glowG)
    this._root.addChild(this._glow)

    // Mätare: TARGET_PER_LEVEL myntplatser uppe till höger.
    this._meter = new Container()
    this._meter.eventMode = 'none'
    this._meterDots = []
    // LODRÄT kolumn längs vänsterkanten. Låg tidigare på y=56 i högerhörnet, RAKT UNDER
    // ljudknappen (1164–1256) — två av tre platser var helt dolda.
    for (let i = 0; i < TARGET_PER_LEVEL; i++) {
      const slot = new Graphics()
      slot.x = 36
      slot.y = 200 + i * 74
      this._drawMeterDot(slot, false, COLORS.inkSoft)
      this._meter.addChild(slot)
      this._meterDots.push(slot)
    }
    this._root.addChild(this._meter)

    // Myntkruka längs högerkanten: varje insamlat mynt STANNAR i krukan, också mellan
    // spelomgångar (custom.mynt) — något som växer att komma tillbaka till.
    this._jar = new Container()
    this._jar.eventMode = 'none'
    this._jar.interactiveChildren = false
    this._jarG = new Graphics()
    this._jar.addChild(this._jarG)
    this._jar.position.set(1236, 396)
    this._root.addChild(this._jar)
    this._coins = ctx.progress.get().custom?.mynt || 0
    this._drawJar()

    // Bollager (mynten i fysiken) — under den genomskinliga fångaren.
    this._ballLayer = new Container()
    this._root.addChild(this._ballLayer)

    // Droppar-mynt: indikatorn högst upp som följer fingret och visar målfärgen.
    this._dropper = new Container()
    this._dropper.eventMode = 'none'
    this._dropBody = new Graphics()
    this._dropGloss = new Graphics().circle(-7, -7, 8).fill({ color: COLORS.white, alpha: 0.7 })
    this._dropArrow = new Graphics().poly([-14, 30, 14, 30, 0, 50]).fill({ color: COLORS.orange, alpha: 0.9 })
    this._dropper.addChild(this._dropBody, this._dropGloss, this._dropArrow)
    this._dropper.x = this._dropX
    this._dropper.y = TOP_Y
    this._root.addChild(this._dropper)
    this._dropperTween = breathe(this._dropper, { scale: 1.12, duration: 0.7 })

    // Drag-vink: var myntet "lutar åt" (mjuk kolumn-highlight under fingret).
    this._hint = new Graphics()
    this._hint.eventMode = 'none'
    this._hint.visible = false
    this._root.addChild(this._hint)

    // Genomskinlig fångare överst: dra i sidled -> välj drop-x; släpp -> släpp mynt.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onDown = (e) => this._pointerDown(ctx, e)
    this._onMove = (e) => this._pointerMove(ctx, e)
    this._onUp = (e) => this._pointerUp(ctx, e)
    this._catcher.on('pointerdown', this._onDown)
    this._root.addChild(this._catcher)

    // Fläkten läggs SIST, alltså ovanpå fångaren: Pixi träffar det översta objektet,
    // så ett grepp om fläkten blir aldrig ett sikte-drag på samma gång.
    this._buildFan(ctx)
  },

  // ---- Fläkten -------------------------------------------------------------

  _buildFan(ctx) {
    this._fanSide = 0
    this._fanY = 380
    this._fanGrab = false
    this._fanSpin = 0
    this._fanT = 0

    const fan = new Container()
    this._fanStream = new Graphics() // luftströmmen ritas om varje bildruta
    this._fanStream.eventMode = 'none'
    this._root.addChild(this._fanStream)

    // Ritad fläkt (P0 ASSETS): fot, stolpe, hus, galler och tre blad som snurrar.
    const fot = new Graphics()
    fot.roundRect(-9, 6, 18, 40, 6).fill(0x9aa4b0)
    fot.ellipse(0, 48, 26, 8).fill(0x7b858f)
    fan.addChild(fot)
    const hus = new Graphics()
    hus.circle(0, -18, 34).fill(0x5aa9e6).stroke({ width: 4, color: 0x3f7fb5 })
    hus.circle(0, -18, 27).fill(0x2b3b4a)
    fan.addChild(hus)
    const blad = new Container()
    for (let i = 0; i < 3; i++) {
      const b = new Graphics()
      b.moveTo(0, 0).quadraticCurveTo(20, -6, 24, -16).quadraticCurveTo(10, -14, 0, 0).fill(0xdfe6eb)
      b.rotation = (i / 3) * Math.PI * 2
      blad.addChild(b)
    }
    blad.position.set(0, -18)
    fan.addChild(blad)
    this._fanBlades = blad
    const nav = new Graphics().circle(0, -18, 6).fill(0xffd35c).stroke({ width: 2.5, color: 0xd9a021 })
    fan.addChild(nav)
    // Galler-ringar (framför bladen) → läses som en fläkt, inte som en propeller.
    const galler = new Graphics()
    for (const r of [12, 20, 28]) galler.circle(0, -18, r).stroke({ width: 2, color: 0xffffff, alpha: 0.35 })
    galler.eventMode = 'none'
    fan.addChild(galler)

    fan.eventMode = 'static'
    fan.cursor = 'pointer'
    fan.interactiveChildren = false
    fan.hitArea = new Rectangle(-62, -80, 124, 148) // ≥96px med marginal
    this._onFanDown = (e) => this._fanDown(ctx, e)
    this._onFanMove = (e) => this._fanMove(ctx, e)
    this._onFanUp = () => this._fanUp(ctx)
    fan.on('pointerdown', this._onFanDown)
    fan.on('globalpointermove', this._onFanMove)
    fan.on('pointerup', this._onFanUp)
    fan.on('pointerupoutside', this._onFanUp)
    this._fan = fan
    this._root.addChild(fan)
    this._placeFan()
  },

  _placeFan() {
    const f = this._fan
    if (!f || f.destroyed) return
    f.x = FAN_X[this._fanSide]
    f.y = this._fanY
    f.scale.x = this._fanSide === 0 ? 1 : -1 // huset vänder sig åt blåsriktningen
  },

  _fanDown(ctx, e) {
    if (!this._alive) return
    this._fanGrab = true
    this._idle = 0
    ctx.services.audio.sfx('tap')
    if (!this._fan.destroyed) pop(this._fan, { scale: 1.1 })
    this._fanMove(ctx, e)
  },

  // Dra i höjdled; drar man över brädets mitt hoppar fläkten till andra sidan och
  // vänder. Två rälsar, ETT föremål — riktningen behöver inget ord, den syns på vilken
  // sida fläkten står.
  _fanMove(ctx, e) {
    if (!this._alive || !this._fanGrab) return
    const p = this._root.toLocal(e.global)
    this._fanY = clamp(p.y, FAN_Y_MIN, FAN_Y_MAX)
    const nySida = p.x > ctx.width / 2 ? 1 : 0
    if (nySida !== this._fanSide) {
      this._fanSide = nySida
      ctx.services.audio.sfx('whoosh')
    }
    this._placeFan()
    this._idle = 0
  },

  _fanUp(ctx) {
    if (!this._fanGrab) return
    this._fanGrab = false
    ctx.services.audio.sfx('soft')
  },

  // Luftströmmens kraft på mynten. Avtar både med avståndet UT från fläkten och med
  // höjdskillnaden, så strömmen har en tydlig form i stället för en osynlig rektangel.
  // Farten anges i px/steg (`FAN_FART`) och räknas om av `speedToAccel` — samma
  // kalibrering som magnetfältet, av exakt samma skäl (ett tal som ser ut som en fart
  // blir ~280× för starkt om det skickas rakt in i matter som kraft).
  _fanForce() {
    if (!this._alive || !this._fanBlaser()) return
    const fx = FAN_X[this._fanSide]
    const dir = this._fanSide === 0 ? 1 : -1
    for (const ball of this._balls) {
      if (ball.settled) continue
      const p = ball.body.position
      const dy = Math.abs(p.y - this._fanY)
      if (dy > FAN_BAND) continue
      const langs = (p.x - fx) * dir
      if (langs < 0 || langs > FAN_REACH) continue
      const avtag = (1 - FAN_AVTAG * (langs / FAN_REACH)) * (1 - dy / FAN_BAND)
      const a = speedToAccel(FAN_FART * avtag, ball.body.frictionAir)
      Body.applyForce(ball.body, p, { x: ball.body.mass * a * dir, y: 0 })
      ball._blast = true
    }
  },

  // Strömmen ritas som tre bågar som vandrar utåt och tonar bort — en fläkt utan synlig
  // luft är bara en propeller, och då finns det inget att förstå för ett barn.
  _fanDraw(dms) {
    const g = this._fanStream
    if (!g || g.destroyed || !this._fan || this._fan.destroyed) return
    const blaser = this._fanBlaser()
    this._fanT += dms / 1000
    // Bladen snurrar bara när fläkten blåser (pausen under hjälp-släpp SYNS).
    this._fanSpin += (blaser ? 0.34 : 0) * (dms / 16.67)
    if (this._fanBlades && !this._fanBlades.destroyed) this._fanBlades.rotation = this._fanSpin
    g.clear()
    if (!blaser) return
    const fx = FAN_X[this._fanSide]
    const dir = this._fanSide === 0 ? 1 : -1
    // VIT ström syns inte. Brädet är cremevitt, så de första bågarna (vitt på alpha
    // 0,34) försvann helt i skärmdumpen — och en fläkt vars luft inte syns är bara en
    // propeller. Fläktens EGEN blå mot det ljusa brädet läses direkt som luft i rörelse.
    for (let i = 0; i < 4; i++) {
      const fas = (this._fanT * 0.8 + i / 4) % 1
      const x = fx + dir * (46 + fas * (720 - 46))
      const h = FAN_BAND * (0.4 + fas * 0.62)
      const alpha = 0.5 * (1 - fas) * (1 - fas * 0.7)
      g.moveTo(x, this._fanY - h)
        .quadraticCurveTo(x + dir * 30, this._fanY, x, this._fanY + h)
        .stroke({ width: 7, color: 0x5aa9e6, alpha, cap: 'round' })
    }
  },

  // Blåser fläkten just nu? Under ett HJÄLP-släpp pausar den (bladen stannar, strömmen
  // tonar bort): hjälpen siktar rakt på målfickan, och en fläkt som samtidigt puttar
  // hade gjort spelets egen garanti till en slump.
  _fanBlaser() {
    return !this._balls.some((b) => !b.settled && b._demo)
  },

  // ---- Nivåer --------------------------------------------------------------

  _cfgFor(level) {
    if (level <= 1) return { bins: 4, rows: 5 }
    if (level <= 3) return { bins: 5, rows: 6 }
    return { bins: 6, rows: 7 }
  },

  _loadLevel(ctx, level, announce = true) {
    if (!this._alive) return
    const cfg = this._cfgFor(level)
    this._binCount = cfg.bins
    this._binW = ctx.width / cfg.bins
    this._collected = 0
    this._missStreak = 0

    // Nytt mål: en annan ficka än förra (om möjligt).
    let idx = (Math.random() * cfg.bins) | 0
    if (cfg.bins > 1 && idx === this._targetIdx) idx = (idx + 1) % cfg.bins
    this._targetIdx = idx
    this._targetColor = PALETTE[idx % PALETTE.length].color
    this._targetName = PALETTE[idx % PALETTE.length].name

    this._clearBalls()
    this._buildBins(ctx, cfg.bins)
    this._buildPegs(ctx, cfg.rows)
    this._setDropperColor(this._targetColor)
    this._positionGlow()
    this._refreshMeter()

    if (announce) this._announceTarget(ctx, 0.2)
  },

  _buildBins(ctx, count) {
    // Rensa gamla väggar + grafik.
    for (const b of this._dividerBodies) this._phys.removeBody(b)
    this._dividerBodies = []
    for (const c of [...this._binLayer.children]) {
      gsap.killTweensOf(c.scale)
      c.destroy()
    }
    this._binFills = []

    const binW = ctx.width / count
    const top = BINS_TOP
    const h = ctx.height - top

    for (let i = 0; i < count; i++) {
      const x0 = i * binW
      const isTarget = i === this._targetIdx
      const col = PALETTE[i % PALETTE.length].color
      // Botten-ankrad grafik (origo vid mitten-botten) så en squash läser som att
      // fickan "gapar och slukar" myntet — kanten dippar utan att lossna från golvet.
      const fill = new Graphics()
        .roundRect(-(binW - 16) / 2, -h, binW - 16, h, 16)
        .fill({ color: col, alpha: isTarget ? 0.95 : 0.8 })
      // Varje ficka är en liten VARELSE med ögon och mun — målfickan gapar och väntar
      // hungrigt, de andra ler lugnt. Det ger mottagaren som scenen saknade, utan att
      // ta någon extra plats.
      const face = new Graphics()
      const ey = -h + 54
      for (const s of [-1, 1]) {
        face.ellipse(s * 26, ey, 15, 17).fill(0xfffdf7)
        face.circle(s * 26 + s * 3, ey + 3, 7).fill(0x33291f)
        face.circle(s * 26 - 2, ey - 3, 3).fill(0xfffdf7)
      }
      if (isTarget) {
        face.ellipse(0, ey + 44, 26, 20).fill(0x6b3b2a) // öppen, hungrig mun
        face.ellipse(0, ey + 52, 15, 9).fill(0xe0736f) // tunga
      } else {
        face.moveTo(-20, ey + 36).quadraticCurveTo(0, ey + 54, 20, ey + 36)
          .stroke({ width: 5, color: 0x4a3526, alpha: 0.75, cap: 'round' })
      }
      face.eventMode = 'none'
      fill.addChild(face)
      fill.position.set(x0 + binW / 2, top + h)
      this._binLayer.addChild(fill)
      this._binFills.push(fill)
    }

    // Inre avdelare (yttre kanter = fysikväggarna).
    for (let i = 1; i < count; i++) {
      const x = i * binW
      const body = this._phys.rectangle(x, top + h / 2, 14, h, { isStatic: true, restitution: 0.3, friction: 0.2, label: 'divider' })
      this._dividerBodies.push(body)
      const post = new Graphics()
        .roundRect(x - 7, top - 6, 14, h + 6, 7)
        .fill(COLORS.brown)
        .stroke({ width: 3, color: COLORS.ink, alpha: 0.3 })
      this._binLayer.addChild(post)
    }
  },

  _buildPegs(ctx, rows) {
    for (const b of this._pegBodies) this._phys.removeBody(b)
    this._pegBodies = []
    for (const c of [...this._pegLayer.children]) { gsap.killTweensOf(c.scale); c.destroy() }
    this._pegViews = []

    const top = 200
    const rowGap = 46
    const colGap = 112
    const marginX = 150
    for (let row = 0; row < rows; row++) {
      const y = top + row * rowGap
      const offset = row % 2 ? colGap / 2 : 0
      for (let x = marginX + offset; x <= ctx.width - marginX; x += colGap) {
        const body = this._phys.circle(x, y, 10, { isStatic: true, restitution: 0.5, friction: 0.1, label: 'peg' })
        this._pegBodies.push(body)
        const peg = new Graphics()
          .circle(0, 0, 10)
          .fill(COLORS.white)
          .stroke({ width: 3, color: COLORS.inkSoft, alpha: 0.35 })
        const dot = new Graphics().circle(-3, -3, 3).fill({ color: COLORS.white, alpha: 0.9 })
        dot.eventMode = 'none'
        peg.addChild(dot)
        peg.x = x
        peg.y = y
        peg._base = { x, y }
        this._pegLayer.addChild(peg)
        this._pegViews.push(peg)
      }
    }
  },

  // Pinnen TÄNDS när myntet slår i den: en snabb ljusblixt + puls + en krusning.
  // Brädet var tidigare en tom yta med döda vita prickar.
  _flashPeg(x, y) {
    let best = null
    let bestD = 40 * 40
    for (const p of this._pegViews) {
      if (p.destroyed) continue
      const d = (p._base.x - x) ** 2 + (p._base.y - y) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    if (!best) return
    gsap.killTweensOf(best.scale)
    best.clear().circle(0, 0, 10).fill(COLORS.yellow).stroke({ width: 3, color: 0xffffff, alpha: 0.9 })
    gsap.fromTo(best.scale, { x: 1.9, y: 1.9 }, {
      x: 1, y: 1, duration: 0.34, ease: 'power2.out',
      onComplete: () => {
        if (best.destroyed) return
        best.clear().circle(0, 0, 10).fill(COLORS.white).stroke({ width: 3, color: COLORS.inkSoft, alpha: 0.35 })
      },
    })
  },

  // Myntkrukan: en glasburk vars mynthög växer med antalet insamlade mynt (tak 40 syns).
  _drawJar() {
    const g = this._jarG
    if (!g || g.destroyed) return
    g.clear()
    const W = 58
    const H = 150
    g.roundRect(-W / 2, -H / 2, W, H, 16).fill({ color: 0xbfeefa, alpha: 0.3 })
    const n = Math.min(40, this._coins || 0)
    const rows = Math.ceil(n / 4)
    for (let r = 0; r < rows; r++) {
      const inRow = Math.min(4, n - r * 4)
      for (let k = 0; k < inRow; k++) {
        const cx = -W / 2 + 12 + k * 12 + (r % 2 ? 5 : 0)
        const cy = H / 2 - 12 - r * 9
        g.circle(cx, cy, 7).fill(PALETTE[(r * 4 + k) % PALETTE.length].color)
        g.circle(cx - 2, cy - 2, 2.4).fill({ color: 0xffffff, alpha: 0.6 })
      }
    }
    g.roundRect(-W / 2, -H / 2, W, H, 16).stroke({ width: 5, color: 0x8fc9de, alpha: 0.9 })
    g.roundRect(-W / 2 - 5, -H / 2 - 12, W + 10, 18, 9).fill(0xc79a68) // lock/kant
    g.roundRect(-W / 2 + 9, -H / 2 + 10, 9, H - 40, 5).fill({ color: 0xffffff, alpha: 0.35 }) // glansstreck
  },

  _addCoinToJar(ctx) {
    this._coins = (this._coins || 0) + 1
    ctx.progress.setCustom('mynt', this._coins)
    this._drawJar()
    if (this._jar && !this._jar.destroyed) {
      gsap.killTweensOf(this._jar.scale)
      gsap.fromTo(this._jar.scale, { x: 1.12, y: 0.9 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.4)' })
    }
  },

  _setDropperColor(color) {
    this._dropBody
      .clear()
      .circle(0, 0, BALL_R)
      .fill(color)
      .stroke({ width: Math.max(2, BALL_R * 0.08), color: shade(color, 0.18), alpha: 0.6 })
  },

  _targetCenterX() {
    return (this._targetIdx + 0.5) * this._binW
  },

  // Flytta tratten (grafik + båda väggarna) till sikt-x. Statiska kroppar flyttas med
  // setPosition; vinkeln är oförändrad, så ∨:et behåller formen.
  _positionFunnel(fx) {
    if (!this._alive) return
    if (this._funnel && !this._funnel.destroyed) this._funnel.x = fx
    if (this._funnelL) Body.setPosition(this._funnelL, { x: fx - FUNNEL_DX, y: FUNNEL_CY })
    if (this._funnelR) Body.setPosition(this._funnelR, { x: fx + FUNNEL_DX, y: FUNNEL_CY })
  },

  _positionGlow() {
    const cx = this._targetCenterX()
    const top = BINS_TOP
    const h = DESIGN_H - top
    this._glow.position.set(cx, top + h / 2)
    this._glowG
      .clear()
      .roundRect(-this._binW / 2 + 6, -h / 2 - 2, this._binW - 12, h + 4, 16)
      .stroke({ width: 7, color: COLORS.white, alpha: 0.95 })
    this._glowTween?.kill()
    this._glow.scale.set(1)
    this._glowTween = breathe(this._glow, { scale: 1.05, duration: 0.9 })
  },

  // "Slukande ficka": fickan gapar och gulpar myntet (en snabb squash). Målfickan
  // tar en stor glad gulp, en "fel" ficka en liten. Grafiken är botten-ankrad så
  // squashen läser som en mun. Exit-säkert: vaktad + tweens dödas vid rebuild/destroy.
  _gulpBin(idx, isTarget) {
    const fill = this._binFills[idx]
    if (!fill || fill.destroyed) return
    gsap.killTweensOf(fill.scale)
    fill.scale.set(1, 1)
    gsap.to(fill.scale, {
      x: isTarget ? 1.08 : 1.03,
      y: isTarget ? 0.78 : 0.9,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
      onComplete: () => {
        if (!fill.destroyed) fill.scale.set(1, 1)
      },
    })
  },

  // ---- Mätare --------------------------------------------------------------

  _drawMeterDot(g, filled, color) {
    g.clear().circle(0, 0, 22)
    if (filled) g.fill(color).stroke({ width: 4, color: COLORS.white, alpha: 0.9 })
    else g.fill({ color: COLORS.white, alpha: 0.35 }).stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.45 })
  },

  _refreshMeter() {
    for (let i = 0; i < this._meterDots.length; i++) {
      const dot = this._meterDots[i]
      if (dot.destroyed) continue
      this._drawMeterDot(dot, i < this._collected, this._targetColor)
    }
  },

  // ---- Pekare: dra för att välja drop-x ------------------------------------

  _pointerDown(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    this._helpCued = false
    this._aiming = true
    const p = this._root.toLocal(e.global)
    this._dropX = clamp(p.x, AIM_EDGE, ctx.width - AIM_EDGE)
    this._dropper.x = this._dropX
    this._positionFunnel(this._dropX)
    this._drawHint(ctx, this._dropX)
    ctx.services.audio.sfx('tap')
    gsap.killTweensOf(this._dropper.scale)
    gsap.to(this._dropper.scale, { x: 1.18, y: 1.18, duration: 0.1, yoyo: true, repeat: 1 })
    this._catcher.on('globalpointermove', this._onMove)
    this._catcher.on('pointerup', this._onUp)
    this._catcher.on('pointerupoutside', this._onUp)
  },

  _pointerMove(ctx, e) {
    if (!this._aiming) return
    const p = this._root.toLocal(e.global)
    this._dropX = clamp(p.x, AIM_EDGE, ctx.width - AIM_EDGE)
    this._dropper.x = this._dropX
    this._positionFunnel(this._dropX)
    this._drawHint(ctx, this._dropX)
    this._idle = 0
    this._helpCued = false
  },

  _pointerUp(ctx, e) {
    if (!this._aiming) return
    this._aiming = false
    this._detachPointer()
    this._hideHint()
    this._restoreDropperPulse()
    this._drop(ctx, this._dropX, false)
  },

  _detachPointer() {
    if (this._catcher && !this._catcher.destroyed) {
      this._catcher.off('globalpointermove', this._onMove)
      this._catcher.off('pointerup', this._onUp)
      this._catcher.off('pointerupoutside', this._onUp)
    }
  },

  _restoreDropperPulse() {
    if (this._dropper && !this._dropper.destroyed) {
      gsap.killTweensOf(this._dropper.scale)
      this._dropper.scale.set(1)
      this._dropperTween?.kill()
      this._dropperTween = breathe(this._dropper, { scale: 1.12, duration: 0.7 })
    }
  },

  // Mjuk vink: highlight fickan rakt under fingret (där myntet "lutar åt").
  _drawHint(ctx, x) {
    const idx = clamp(Math.floor(x / this._binW), 0, this._binCount - 1)
    const x0 = idx * this._binW
    const g = this._hint
    g.visible = true
    g.clear()
      .roundRect(x0 + 10, BOARD_TOP, this._binW - 20, DESIGN_H - BOARD_TOP, 18)
      .fill({ color: COLORS.white, alpha: 0.1 })
    // Pricklinje rakt ner från droppar-myntet.
    for (let yy = TOP_Y + 60; yy < BINS_TOP; yy += 34) {
      g.circle(x, yy, 4).fill({ color: COLORS.white, alpha: 0.45 })
    }
  },

  _hideHint() {
    if (this._hint && !this._hint.destroyed) {
      this._hint.clear()
      this._hint.visible = false
    }
  },

  // ---- Släpp ett mynt ------------------------------------------------------

  _drop(ctx, x, demo) {
    if (!this._alive) return
    this._idle = 0
    const r = BALL_R
    x = clamp(x, AIM_EDGE, ctx.width - AIM_EDGE)
    // Rikta tratten mot släpp-punkten (även vid demo/hjälp-släpp) så myntet faller in.
    this._positionFunnel(x)

    const color = this._targetColor
    const view = makeBall(r, color)
    view.x = x
    view.y = TOP_Y
    this._ballLayer.addChild(view)

    const body = this._phys.circle(x, TOP_Y, r, {
      restitution: 0.72, // livligare studs mot pinnarna (var 0.5)
      friction: 0.04,
      frictionAir: 0.006, // lätt luftmotstånd så de livliga studsarna lugnar ner sig och lägger sig
      density: 0.002,
      label: 'ball',
    })
    // INGEN styrning mot målet — myntet faller helt naturligt under tyngdkraften.
    // Bara en pytteliten slumpfart i sidled så det inte balanserar perfekt rakt
    // ovanpå första pinnen (precis som ett riktigt plinko-mynt).
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 1.2, y: 0 })

    const ball = { body, view, settled: false, _demo: !!demo }
    this._balls.push(ball)
    this._phys.link(body, view)

    // Direkt återkoppling (<100ms): ljud + studs-in.
    ctx.services.audio.sfx('pop')
    view.scale.set(0.2)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(2)' })

    if (!demo) {
      const now = performance.now()
      if (now - this._lastVoice > VOICE_THROTTLE) {
        this._lastVoice = now
        ctx.services.voice.say(randomFrom(DROP_CHEERS))
      }
    }

    // Tak: tona bort det äldsta myntet.
    if (this._balls.length > MAX_BALLS) {
      const old = this._balls.shift()
      this._fade(old)
    }
  },

  // ---- Ticker: naturlig fysik + anti-fastnar-knuff + nedslag + idle --------

  _update(ctx, t) {
    if (!this._alive) return
    // Fläktens kraft läggs på FÖRE motorsteget (matter nollställer krafter i sitt steg).
    this._fanForce(t.deltaMS)
    this._phys.update(t.deltaMS)
    this._fanDraw(t.deltaMS)

    for (const ball of this._balls) {
      if (ball.settled) continue
      const pos = ball.body.position
      // Mjuk anti-fastnar-knuff (ingen styrning): om ett mynt blir nästan stilla
      // ovanför fickorna (kilat mellan pinnar) får det efter en stund en pytteliten
      // SLUMPMÄSSIG sidoknuff + en nedåt-nudd så det alltid kommer loss och faller
      // vidare. Riktningen är slumpad, aldrig mot målet — så det känns naturligt.
      if (pos.y < SETTLE_Y && ball.body.speed < 0.3) {
        ball._stall = (ball._stall || 0) + t.deltaMS
        if (ball._stall > 320) {
          ball._stall = 0
          Body.setVelocity(ball.body, {
            x: (Math.random() - 0.5) * 2.6,
            y: Math.max(ball.body.velocity.y, 1.4),
          })
        }
      } else {
        ball._stall = 0
      }
      // Nedslag i en ficka?
      if (pos.y > SETTLE_Y && ball.body.speed < SETTLE_SPEED) {
        ball.settled = true
        this._onSettle(ctx, ball)
      }
    }

    // Mjukare auto-hjälp (låt barnets egen sikt betyda något): först en vänlig röst-
    // vink vid ~6s, och bara om ingen rör skärmen ännu en stund kommer ett hjälp-släpp.
    this._idle += t.deltaMS / 1000
    if (!this._helpCued && this._idle > 6) {
      this._helpCued = true
      this._announceTarget(ctx, 0)
    }
    if (this._idle > 12) {
      this._idle = 0
      this._helpCued = false
      this._drop(ctx, this._targetCenterX(), true)
    }
  },

  _onSettle(ctx, ball) {
    if (!this._alive) return
    const p = ball.body.position
    const idx = clamp(Math.floor(p.x / this._binW), 0, this._binCount - 1)
    this._gulpBin(idx, idx === this._targetIdx)
    if (idx === this._targetIdx) {
      this._score(ctx, p.x, p.y)
    } else {
      // "Fel" ficka: glatt plopp, ingen poäng, aldrig ett straff.
      this._missStreak++
      ctx.services.audio.sfx('plopp')
      puff(this._root, p.x, p.y, { count: 6 })
      const now = performance.now()
      if (now - this._lastVoice > VOICE_THROTTLE) {
        this._lastVoice = now
        ctx.services.voice.say(randomFrom(MISS_CHEERS))
      }
    }
  },

  _score(ctx, x, y) {
    this._missStreak = 0
    this._collected = Math.min(TARGET_PER_LEVEL, this._collected + 1)
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('pling')
    // Liten jackpott-flärp (stigande), skild från pinn-melodin.
    ctx.services.audio.tone({ freq: 784, dur: 0.12, type: 'triangle', vol: 0.18 })
    ctx.services.audio.tone({ freq: 1046, dur: 0.16, type: 'triangle', vol: 0.16, delay: 0.1 })
    sparkle(this._root, x, y, { count: 10 })
    floatText(ctx.fxLayer, x, y - 30, '⭐', { fontSize: 56 })

    this._addCoinToJar(ctx) // myntet läggs i krukan och stannar där

    // Mätare fylls med en liten studs.
    const dot = this._meterDots[this._collected - 1]
    if (dot && !dot.destroyed) {
      this._drawMeterDot(dot, true, this._targetColor)
      gsap.killTweensOf(dot.scale)
      dot.scale.set(0.4)
      gsap.to(dot.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2.4)' })
    }

    if (this._collected >= TARGET_PER_LEVEL) {
      this._levelComplete(ctx)
    } else {
      const now = performance.now()
      if (now - this._lastVoice > VOICE_THROTTLE) {
        this._lastVoice = now
        ctx.services.voice.say('Rätt ficka!')
      }
    }
  },

  _levelComplete(ctx) {
    if (!this._alive) return
    ctx.services.audio.sfx('celebrate')
    ctx.services.audio.sfx('magi')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.services.voice.say(randomFrom(PRAISE))
    this._lastVoice = performance.now()

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()

    this._levelTimer?.kill()
    this._levelTimer = ctx.later(1.7, () => {
      if (!this._alive) return
      ctx.services.voice.say('Nästa nivå!')
      this._loadLevel(ctx, this._level, true)
    })
  },

  _announceTarget(ctx, delay) {
    if (delay > 0) {
      this._announceTimer?.kill()
      this._announceTimer = ctx.later(delay, () => {
        if (!this._alive) return
        ctx.services.voice.say(`Släpp i den ${this._targetName} fickan!`)
        this._lastVoice = performance.now()
      })
    } else {
      ctx.services.voice.say(`Släpp i den ${this._targetName} fickan!`)
      this._lastVoice = performance.now()
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastHit < HIT_THROTTLE) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      const hitsPeg = a.label === 'peg' || b.label === 'peg'
      if (!hitsPeg) continue
      const pegBody = a.label === 'peg' ? a : b
      const ballBody = a.label === 'peg' ? b : a
      if (ballBody.speed > 1.6) {
        this._lastHit = now
        this._flashPeg(pegBody.position.x, pegBody.position.y)
        // Pinn-melodi: klättra uppför pentaton-skalan för varje träff detta mynt gör.
        const ball = this._balls.find((bl) => bl.body === ballBody)
        const n = ball ? (ball._pegHits = (ball._pegHits || 0) + 1) : 1
        const freq = PEG_SCALE[Math.min(n - 1, PEG_SCALE.length - 1)]
        ctx.services.audio.tone({ freq, dur: 0.09, type: 'sine', vol: 0.14 })
        break
      }
    }
  },

  // ---- Städning ------------------------------------------------------------

  _clearBalls() {
    for (const b of this._balls) {
      if (b.body) this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
        b.view.destroy()
      }
    }
    this._balls = []
  },

  // Exit-säker uttoning: tweena en proxy och rör myntet bara om det lever.
  _fade(ball) {
    if (!ball) return
    this._phys.removeBody(ball.body)
    const v = ball.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { s: v.scale.x || 1, a: 1 }
    const tw = gsap.to(st, {
      s: 0,
      a: 0,
      duration: 0.3,
      ease: 'back.in(2)',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.scale.set(st.s)
        v.alpha = st.a
      },
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._demoTimer?.kill()
    this._levelTimer?.kill()
    this._announceTimer?.kill()
    this._dropperTween?.kill()
    this._glowTween?.kill()
    this._detachPointer()
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointerdown', this._onDown)
    if (this._fan && !this._fan.destroyed) {
      gsap.killTweensOf(this._fan)
      gsap.killTweensOf(this._fan.scale)
      this._fan.off('pointerdown', this._onFanDown)
      this._fan.off('globalpointermove', this._onFanMove)
      this._fan.off('pointerup', this._onFanUp)
      this._fan.off('pointerupoutside', this._onFanUp)
    }
    this._fanGrab = false

    if (this._dropper && !this._dropper.destroyed) gsap.killTweensOf(this._dropper.scale)
    if (this._glow && !this._glow.destroyed) gsap.killTweensOf(this._glow.scale)
    for (const dot of this._meterDots || []) {
      if (dot && !dot.destroyed) gsap.killTweensOf(dot.scale)
    }
    for (const f of this._binFills || []) {
      if (f && !f.destroyed) gsap.killTweensOf(f.scale)
    }
    for (const p of this._pegViews || []) {
      if (p && !p.destroyed) gsap.killTweensOf(p.scale)
    }
    this._pegViews = []
    if (this._jar && !this._jar.destroyed) gsap.killTweensOf(this._jar.scale)
    this._balls.forEach((b) => {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
      }
    })
    this._balls = []

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Glansigt mynt/boll: huvudfärg + ljus highlight + mjuk kant (programmatisk "3D").
function makeBall(r, color) {
  return makeBoll(r, color) // delad klotboll (lib/foremal.js) — auto-kontur, ingen glansprick
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
