// Studsmatta — fysik-GAME (2–5 år). En glad kanin (🐰) studsar på en elastisk
// studsmatta. MÅL: uppe i skyn svävar morötter 🥕 och stjärnor ⭐ — studsa kaninen
// upp och FÅNGA allihop, så firas nivån och en ny (högre, fler, mer åt sidan) börjar.
//
// EN enda, tydlig kontroll (utöver "tryck = liten studs"): DRA studsmattan.
//   • Vågrätt  -> flyttar kaninens studs-pelare i sidled (sikta under ett mål).
//   • Lodrätt  -> DRA NER mattan för att spänna den som en slangbella: ju längre
//                 ner, desto HÖGRE/snabbare studs. Höjden DU sätter blir kvar
//                 (höjd-/hastighetskontroll) tills du flyttar den igen.
// INGET misslyckande: kaninen studsar oändligt vidare, missar är roliga, och en
// mjuk auto-hjälp (sänk mattan + glid) gör att varje mål ALLTID nås.
// matter.js sköter fysiken via lib/physics.js.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, nudge, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { floatText, sparkle, puff, burst, bigCelebration, pop } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { makeBobo } from '../../lib/figurer.js'
import { COLORS, FONT } from '../../lib/theme.js'

const { Body } = Matter

// --- Geometri (designkoordinater 1280x720) ---
const HALF_SPAN = 200 // halva mattans bredd
const FLOOR_Y = 666 // där benen står
const CHAR_R = 38 // kaninens fysik-radie
const BED_MIN_X = 330 // hur långt åt vänster mattan får dras
const BED_MAX_X = 950 // hur långt åt höger mattan får dras
const BED_MIN_Y = 350 // högst upp mattan får dras (mjukast studs)
const BED_MAX_Y = 560 // längst ner mattan får dras (spändast = högst studs)
const DEFAULT_BED_Y = 470 // start: lagom spänning
// Picknicken i högerkanten. Klar av kraftmätaren (x=1206) och av målens spawn-yta
// (x 360..920). Studsmattans högra stolpe kan nå x=1150 vid full högerdragning, så
// picknicken ritas SIST = i förgrunden och mattan glider snyggt bakom den.
const PICNIC_X = 1052
const PICNIC_GROUND = 690
const PICNIC_R = 42
const FLOOR_RESCUE_Y = 624 // föll kaninen bredvid mattan? mjuk räddnings-studs

// --- Fysik-trimning (matter.js-enheter; finjustera vid speltest) ---
const GRAVITY_Y = 1.2
const MIN_UP = 9 // studs vid mattan högst uppe (mjukast)
const MAX_UP = 24 // studs vid mattan längst ner (kaninen flyger ALDRIG ur skärmen)
const CEIL_Y = 110 // mjukt tak: studsar tillbaka ned om kaninen ändå kommer för högt

// --- Insamling / mål ---
const COLLECT_R = 72 // generös fångst-radie (barnvänlig)

// --- Auto-hjälp (no-fail) ---
const ASSIST_DELAY = 10 // s utan fångst -> sänk mattan (mer kraft) åt barnet (senare = mer eget spel)
const GLIDE_DELAY = 18 // s utan fångst -> garanterad glid-fångst (sista utväg)
const IDLE_DELAY = 6 // s utan tryck -> tyst röst-recue

const RECUE = [
  'Dra mattan neråt för en högre studs!',
  'Flytta mattan i sidled och dra ner för att spänna den!',
  'Fånga morötterna högt uppe!',
]
const CHEERS = ['Hopp!', 'Wii!', 'Högre!', 'Studs!']
const COLLECT_CHEERS = ['Mums!', 'En till!', 'Bra fångat!', 'Ja!']
const WIN_CHEERS = ['Du fångade alla! Hurra!', 'Allihop! Vad duktig du är!', 'Bravo! Alla fångade!']
const BOOST_FLOATS = ['🎵', '⭐', '🎶', '✨']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'studsmatta',
  titleSv: 'Studsmatta',
  icon: '🦘',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'studsmatta',
  voiceIntro: 'Dra studsmattan neråt för att spänna den och studsa kaninen högt!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._sinceCollect = 0
    this._helpStage = 0
    this._lastLand = 0
    this._lastVoice = 0
    this._bedX = 640
    this._bedY = DEFAULT_BED_Y
    this._tapBoost = false // tryck-fallback: en gångs extra-studs
    this._dragging = false
    this._gliding = false
    this._resolving = false
    this._collected = 0
    this._goals = []
    this._bedProxy = { dip: 0 }
    // Cache för change-guards (rita om matta/mätare bara när något ändrats).
    this._lastDip = NaN
    this._lastRigX = NaN
    this._lastRigY = NaN
    this._lastPower = NaN

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: glad äng med himmel/sol/moln/kullar (dekor, aldrig tryckbar).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Levande äng bakom studsmattan: staket, träd, blommor och grässtrån. Scenen var
    // tidigare bara en gradient med två kullar.
    const world = new Graphics()
    for (let x = -20; x < ctx.width + 40; x += 76) {
      world.roundRect(x, FLOOR_Y - 78, 16, 78, 5).fill({ color: 0xc79a68, alpha: 0.9 })
    }
    world.rect(-20, FLOOR_Y - 62, ctx.width + 60, 9).fill({ color: 0xb98a5f, alpha: 0.9 })
    world.rect(-20, FLOOR_Y - 36, ctx.width + 60, 9).fill({ color: 0xb98a5f, alpha: 0.9 })
    for (const [tx, ts] of [[110, 1], [1080, 0.85], [300, 0.6]]) {
      world.rect(tx - 10 * ts, FLOOR_Y - 150 * ts, 20 * ts, 150 * ts).fill(0x8a5a3b)
      world.circle(tx, FLOOR_Y - 176 * ts, 68 * ts).fill(0x5bbf6a)
      world.circle(tx - 46 * ts, FLOOR_Y - 140 * ts, 48 * ts).fill(0x4fae51)
      world.circle(tx + 48 * ts, FLOOR_Y - 144 * ts, 50 * ts).fill(0x6ac96a)
    }
    for (let i = 0; i < 34; i++) {
      const gx = Math.random() * ctx.width
      const gy = FLOOR_Y + 4 + Math.random() * (ctx.height - FLOOR_Y - 10)
      world.moveTo(gx, gy).quadraticCurveTo(gx + 4, gy - 9, gx + (Math.random() * 8 - 4), gy - 17)
        .stroke({ width: 3, color: 0x49a657, alpha: 0.55 })
    }
    for (let i = 0; i < 9; i++) {
      const fx = 40 + Math.random() * (ctx.width - 80)
      const fy = FLOOR_Y + 12 + Math.random() * 40
      const col = [0xff9ec4, 0xffd35c, 0xffffff, 0xa78bfa][i % 4]
      world.moveTo(fx, fy + 12).lineTo(fx, fy).stroke({ width: 3, color: 0x49a657 })
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        world.circle(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 4.5).fill(col)
      }
      world.circle(fx, fy, 3.4).fill(0xffd35c)
    }
    world.eventMode = 'none'
    this._root.addChild(world)

    // Heltäckande, osynlig fångare BAKOM allt spel: tryck var som helst = liten studs.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatcherTap = () => this._boost(ctx)
    this._catcher.on('pointertap', this._onCatcherTap)
    this._root.addChild(this._catcher)

    // Mål-lager (morötter/stjärnor som svävar) — eventMode none, fångas via avstånd.
    this._goalLayer = new Container()
    this._goalLayer.eventMode = 'none'
    this._goalLayer.interactiveChildren = false
    this._root.addChild(this._goalLayer)

    // Skugga under kaninen (krymper när den är hög).
    this._shadow = new Graphics().ellipse(0, 0, 58, 14).fill({ color: COLORS.shadow, alpha: 0.18 })
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Studsmattans "rigg" (ram + ben + elastisk matt-linje), flyttbar i x och y.
    // Allt ritas centrerat kring lokal x=0; rig.x = mattans mitt. Bädden ritas vid _bedY.
    this._rig = new Container()
    this._rig.eventMode = 'static'
    this._rig.cursor = 'pointer'
    this._rigG = new Graphics()
    this._rigG.eventMode = 'none'
    this._rig.addChild(this._rigG)
    this._onRigDown = (e) => this._rigDown(ctx, e)
    this._onRigMove = (e) => this._rigMove(e)
    this._onRigUp = () => this._rigUp(ctx)
    this._rig.on('pointerdown', this._onRigDown)
    this._root.addChild(this._rig)

    // Kaninen RITAS (P0 ASSETS) — egen silhuett med öron, mage, tass och ett leende.
    this._charView = makeBunny()
    this._root.addChild(this._charView)

    // Kraftmätare (dekor) — visar hur spänd/hög mattan är.
    this._buildMeter()

    // VARFÖRET (gate-punkt 4): en picknick i högerkanten. Kaninen samlar inte i tomma
    // luften längre — allt hon fångar flyger till Bobos korg, och han jublar. Byggs
    // SIST så picknicken ligger i förgrunden och studsmattan glider bakom den.
    this._buildPicnic()

    // Fysik: golv + sidoväggar (mjukt tak hanteras manuellt i ticken).
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })

    // Mattans bädd = statisk kropp som flyttas med _bedX/_bedY. Restitution 0 —
    // studsen styr vi själva i _land (vår setVelocity efter Matters lösare = full kontroll).
    this._bedBody = this._phys.rectangle(this._bedX, this._bedY + 22, HALF_SPAN * 2, 44, {
      isStatic: true,
      restitution: 0,
      friction: 0,
      label: 'bed',
    })

    this._char = this._phys.circle(this._bedX, this._bedY - 120, CHAR_R, {
      restitution: 0.9,
      friction: 0.001,
      frictionAir: 0.002,
      label: 'char',
    })
    // Kaninen är en FIGUR, inte en boll. Fysikkroppen snurrar fritt, men vyn hålls
    // ~upprätt med en liten lutning åt färdriktningen — ett upp-och-nedvänt ansikte
    // läser fel och gjorde kaninen oigenkännlig när den ritades i stället för emoji.
    this._phys.link(this._char, this._charView, (view, body) => {
      view.rotation = Math.max(-0.42, Math.min(0.42, body.velocity.x * 0.05))
    })

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Rita riggen och placera kropp/hitArea på rätt höjd.
    this._applyBed()

    // Första nivån (från sparad progress -> oändlig variation).
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._spawnGoals(this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._say(ctx, this.voiceIntro, 0)
  },

  // ---- Aktuell studskraft 0..1 utifrån hur lågt mattan är dragen --------------
  _power() {
    return clamp((this._bedY - BED_MIN_Y) / (BED_MAX_Y - BED_MIN_Y), 0, 1)
  },

  // ---- Tick: fysik + centrering + insamling + auto-hjälp + idle -------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    const char = this._char
    const dtSec = t.deltaMS / 1000

    // Rita elastisk matta (med ev. studs-dip) + uppdatera mätaren.
    this._drawRig(this._bedProxy.dip)
    this._updateMeter()

    // Skugga som krymper med höjden.
    const h = clamp((this._bedY - char.position.y) / 380, 0, 1)
    this._shadow.x = char.position.x
    this._shadow.y = this._bedY + 16
    this._shadow.scale.set(1 - h * 0.5, 1)
    this._shadow.alpha = 0.18 * (1 - h * 0.6)

    if (this._gliding) return // hjälp-glid styr kaninen helt

    // Mjukt tak: kommer kaninen ändå för högt, studsa lugnt tillbaka ned.
    if (char.position.y < CEIL_Y && char.velocity.y < 0) {
      nudge(char, char.velocity.x, Math.abs(char.velocity.y) * 0.35 + 1)
    }

    // Lätt centrering mot mattans mitt — bara som ANTI-VINGEL, inte autopilot. Svag nog
    // att barnets sidled-drag på mattan faktiskt ger en kännbar sidled-studs (målen
    // spänner över hela banan; sikte ska betyda något).
    const dx = this._bedX - char.position.x
    if (Math.abs(dx) > 20) {
      let vx = char.velocity.x + dx * 0.008
      vx = clamp(vx, -8, 8)
      nudge(char, vx, char.velocity.y)
    }

    // Dämpa eventuellt snurr mjukt mot vila.
    if (Math.abs(char.angularVelocity) > 0.01) {
      Body.setAngularVelocity(char, char.angularVelocity * 0.95)
    }

    // Räddning: föll kaninen bredvid mattan (golvet)? mjuk studs tillbaka in.
    if (char.position.y > FLOOR_RESCUE_Y) {
      const now = performance.now()
      if (now - this._lastLand > 120) {
        this._lastLand = now
        nudge(char, (this._bedX - char.position.x) * 0.06, -(MIN_UP + 2))
        ctx.services.audio.sfx('soft')
      }
    }

    if (this._resolving) return

    // Fånga mål (vid kontakt).
    this._checkCollect(ctx)

    // Auto-hjälp så ett mål ALLTID nås (no-fail).
    this._sinceCollect += dtSec
    const remaining = this._goals.filter((g) => !g.got)
    if (remaining.length) {
      if (this._sinceCollect >= GLIDE_DELAY) {
        this._glideToGoal(ctx, this._nearestGoal(remaining))
      } else if (this._sinceCollect >= ASSIST_DELAY && this._helpStage < 1) {
        this._helpStage = 1
        this._assist(ctx, this._nearestGoal(remaining))
      }
    }

    // Tyst om-tilltal om barnet inte tryckt på ~6 s (kaninen studsar ändå vidare).
    this._idle += dtSec
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      this._say(ctx, randomFrom(RECUE), 0)
    }
  },

  // ---- Tryck = liten extra-studs (tap-fallback för de minsta) -----------------

  _boost(ctx) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._tapBoost = true // nästa landning får en garanterad hög studs
    this._dipBed()
    this._squash(this._charView, false)
    ctx.services.audio.sfx('pop')
    if (Math.random() < 0.4) {
      floatText(ctx.fxLayer, this._charView.x, this._charView.y - 64, randomFrom(BOOST_FLOATS))
    }
    if (Math.random() < 0.3) this._say(ctx, randomFrom(CHEERS), 1600)
  },

  // ---- Landning på mattan: studsa upp så högt som mattan är spänd -------------

  _land(ctx) {
    if (!this._alive || this._gliding || this._resolving) return
    const now = performance.now()
    if (now - this._lastLand < 90) return // skydd mot dubbel-kollision
    this._lastLand = now

    const char = this._char
    const power = this._tapBoost ? 1 : this._power()
    this._tapBoost = false
    const up = MIN_UP + power * (MAX_UP - MIN_UP)
    const big = power > 0.5
    // Behåll MER av kaninens egen vågräta fart (kännbar sidled-studs) + en svagare mitt-
    // dragning (bara anti-vingel, ingen autopilot).
    let vx = char.velocity.x * 0.5 + (this._bedX - char.position.x) * 0.018
    vx = clamp(vx, -7, 7)
    nudge(char, vx, -up)

    this._dipBed()
    this._squash(this._charView, big)
    ctx.services.audio.sfx(big ? 'boing' : 'soft')

    if (big) {
      Body.setAngularVelocity(char, (Math.random() - 0.5) * 0.3)
      if (Math.random() < 0.45) {
        floatText(ctx.fxLayer, this._charView.x, this._charView.y - 64, randomFrom(BOOST_FLOATS))
      }
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive || this._gliding || this._resolving) return
    for (const pair of e.pairs) {
      const hitBed =
        (pair.bodyA === this._char && pair.bodyB === this._bedBody) ||
        (pair.bodyB === this._char && pair.bodyA === this._bedBody)
      if (hitBed) {
        this._land(ctx)
        break
      }
    }
  },

  // ---- Dra mattan i x (sikta) + y (spänn för höjd) ---------------------------

  _rigDown(ctx, e) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._dragging = false
    this._dragStart = this._root.toLocal(e.global)
    this._dragOrigX = this._bedX
    this._dragOrigY = this._bedY
    ctx.services.audio.sfx('tap')
    this._rig.on('globalpointermove', this._onRigMove)
    this._rig.on('pointerup', this._onRigUp)
    this._rig.on('pointerupoutside', this._onRigUp)
  },

  _rigMove(e) {
    if (!this._alive) return
    const p = this._root.toLocal(e.global)
    const dx = p.x - this._dragStart.x
    const dy = p.y - this._dragStart.y
    if (!this._dragging && Math.hypot(dx, dy) > 12) this._dragging = true
    if (this._dragging) {
      this._setBed(
        clamp(this._dragOrigX + dx, BED_MIN_X, BED_MAX_X),
        clamp(this._dragOrigY + dy, BED_MIN_Y, BED_MAX_Y),
      )
    }
  },

  _rigUp(ctx) {
    this._detachRig()
    if (!this._dragging) {
      // Inget drag = tryck -> liten extra-studs (tap-fallback, även de minsta klarar det).
      this._boost(ctx)
    }
    this._dragging = false
  },

  _detachRig() {
    if (this._rig && !this._rig.destroyed) {
      this._rig.off('globalpointermove', this._onRigMove)
      this._rig.off('pointerup', this._onRigUp)
      this._rig.off('pointerupoutside', this._onRigUp)
    }
  },

  _setBed(x, y) {
    this._bedX = x
    this._bedY = y
    this._applyBed()
  },

  // Synka riggens position, träffyta och fysik-kroppen mot _bedX/_bedY.
  _applyBed() {
    if (this._rig && !this._rig.destroyed) {
      this._rig.x = this._bedX
      // Stor, förlåtande dra-träffyta runt mattan (>=96px), följer höjden.
      this._rig.hitArea = new Rectangle(-HALF_SPAN - 46, this._bedY - 72, (HALF_SPAN + 46) * 2, 150)
    }
    if (this._bedBody) Body.setPosition(this._bedBody, { x: this._bedX, y: this._bedY + 22 })
    this._drawRig(this._bedProxy.dip)
  },

  // ---- Mål: skapa, fånga, hjälpa --------------------------------------------

  _spawnGoals(level) {
    if (!this._alive) return
    this._clearGoals()
    this._collected = 0
    const n = clamp(2 + level, 2, 5)
    // Toppen sjunker (högre upp) med nivån; aldrig högre än kaninen säkert når.
    const top = Math.max(210, 460 - level * 55)
    const jit = level >= 4 ? () => (Math.random() * 50 - 25) : () => 0
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1)
      const x = clamp(380 + f * 520 + jit(), 360, 920)
      // Varannan högt (top), varannan mitt — tvingar barnet att variera höjden.
      const y = clamp((i % 2 === 0 ? top : Math.min(460, top + 150)) + jit(), 200, 470)
      const kind = Math.random() < 0.5 ? 'star' : 'carrot'
      this._addGoal(x, y, kind)
    }
  },

  // Picknick i högerkanten: filt, korg och Bobo som väntar på maten.
  _buildPicnic() {
    const p = new Container()
    p.eventMode = 'none'
    p.interactiveChildren = false

    const blanket = new Graphics()
    blanket.ellipse(PICNIC_X, PICNIC_GROUND + 8, 118, 26).fill({ color: 0xe0574f, alpha: 0.9 })
    for (let i = -2; i <= 2; i++) {
      blanket.moveTo(PICNIC_X + i * 38, PICNIC_GROUND - 12).lineTo(PICNIC_X + i * 38, PICNIC_GROUND + 26)
    }
    blanket.stroke({ width: 3, color: 0xfff0d8, alpha: 0.55 })
    p.addChild(blanket)

    // Korgen som fylls. Innehållet ritas om i _fillBasket.
    const basket = new Graphics()
    basket.moveTo(-42, -20).lineTo(42, -20).lineTo(34, 26).lineTo(-34, 26).closePath()
    basket.fill(0xc98a4b).stroke({ width: 4, color: 0x8a5a3b })
    for (let i = -1; i <= 1; i++) basket.moveTo(i * 22, -18).lineTo(i * 18, 24)
    basket.moveTo(-38, 2).lineTo(38, 2)
    basket.stroke({ width: 3, color: 0x8a5a3b, alpha: 0.5 })
    basket.arc(0, -20, 30, Math.PI, 0).stroke({ width: 6, color: 0x8a5a3b })
    basket.position.set(PICNIC_X - 74, PICNIC_GROUND - 22)
    p.addChild(basket)
    this._basket = basket

    // Det uppsamlade som syns i korgen (fylls på per fångat mål).
    this._basketFill = new Graphics()
    this._basketFill.position.set(PICNIC_X - 74, PICNIC_GROUND - 22)
    p.addChild(this._basketFill)

    this._bobo = makeBobo(PICNIC_R)
    this._bobo.position.set(PICNIC_X + 44, PICNIC_GROUND - 2.36 * PICNIC_R)
    p.addChild(this._bobo)
    this._boboIdle = gsap.to(this._bobo.scale, {
      x: 1.03, y: 1.03, duration: 2.0, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })

    this._root.addChild(p)
  },

  // Rita om korgens innehåll: n prickar i mål-färgerna, staplade i två rader.
  _fillBasket(n) {
    const g = this._basketFill
    if (!g || g.destroyed) return
    g.clear()
    for (let i = 0; i < Math.min(n, 8); i++) {
      const col = i % 2 === 0 ? COLORS.orange : COLORS.yellow
      const cx = -26 + (i % 4) * 17
      const cy = 4 - Math.floor(i / 4) * 15
      g.circle(cx, cy, 8).fill(col).stroke({ width: 2, color: 0x8a5a3b, alpha: 0.6 })
    }
  },

  // Fångad sak flyger till korgen; Bobo studsar när den landar. Exit-säker:
  // tweenar ett vanligt objekt och rör Pixi-noden bara om den lever.
  _toBasket(ctx, fromX, fromY, kind) {
    const bx = PICNIC_X - 74
    const by = PICNIC_GROUND - 22
    const view = kind === 'star' ? makeStar() : makeCarrot()
    view.position.set(fromX, fromY)
    view.scale.set(0.7)
    view.eventMode = 'none'
    this._root.addChild(view)
    const st = { x: fromX, y: fromY, s: 0.7 }
    this._flyTweens = this._flyTweens || []
    const tw = gsap.to(st, {
      x: bx,
      y: by,
      s: 0.34,
      duration: 0.55,
      ease: 'power2.in',
      onUpdate: () => {
        if (view.destroyed) return
        view.position.set(st.x, st.y)
        view.scale.set(st.s)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy()
        if (!this._alive) return
        this._fillBasket(this._collected)
        if (this._basket && !this._basket.destroyed) pop(this._basket, { scale: 1.12 })
        this._boboMunch(ctx)
      },
    })
    this._flyTweens.push(tw)
  },

  // Bobo tar emot: studs + gnistor (och en glad ton).
  _boboMunch(ctx, big = false) {
    const bo = this._bobo
    if (!bo || bo.destroyed) return
    gsap.killTweensOf(bo.scale)
    gsap
      .timeline()
      .to(bo.scale, { x: big ? 1.2 : 1.1, y: big ? 1.28 : 1.15, duration: 0.12, ease: 'power2.out' })
      .to(bo.scale, { x: 1, y: 1, duration: big ? 0.66 : 0.5, ease: 'elastic.out(1, 0.42)' })
    sparkle(ctx.fxLayer, bo.x, bo.y - PICNIC_R * 1.4, { count: big ? 10 : 5 })
  },

  _addGoal(x, y, kind) {
    const view = kind === 'star' ? makeStar() : makeCarrot()
    view.position.set(x, y)
    this._goalLayer.addChild(view)
    // Lugn andning + mjuk gunga (drar blicken; exit-säkert via gsap-tween på view).
    const tween = gsap.to(view.scale, { x: 1.14, y: 1.14, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    const bob = gsap.to(view, { y: y - 10, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._goals.push({ x, y, kind, got: false, view, tween, bob })
  },

  _clearGoals() {
    for (const g of this._goals) {
      g.tween?.kill()
      g.bob?.kill()
      if (g.view && !g.view.destroyed) {
        gsap.killTweensOf(g.view)
        gsap.killTweensOf(g.view.scale)
        g.view.destroy()
      }
    }
    this._goals = []
  },

  _nearestGoal(list) {
    const c = this._char.position
    let best = list[0]
    let bestD = Infinity
    for (const g of list) {
      const d = (g.x - c.x) ** 2 + (g.y - c.y) ** 2
      if (d < bestD) {
        bestD = d
        best = g
      }
    }
    return best
  },

  _checkCollect(ctx) {
    const c = this._char.position
    for (const g of this._goals) {
      if (g.got) continue
      if (Math.hypot(g.x - c.x, g.view.y - c.y) < COLLECT_R) {
        this._collectGoal(ctx, g)
      }
    }
  },

  _collectGoal(ctx, g) {
    if (!this._alive || g.got) return
    g.got = true
    this._collected++
    this._sinceCollect = 0
    this._helpStage = 0

    sparkle(ctx.fxLayer, g.x, g.view.y, { count: 7 })
    puff(ctx.fxLayer, g.x, g.view.y, { count: 8, color: g.kind === 'star' ? COLORS.yellow : COLORS.orange })
    ctx.services.audio.sfx(g.kind === 'star' ? 'magi' : 'pling')
    // Flyger till Bobos picknickkorg i stället för att bara försvinna — det är
    // DÄRFÖR kaninen samlar. (Ersätter den svävande emoji-texten.)
    this._toBasket(ctx, g.x, g.view.y, g.kind)
    if (Math.random() < 0.6) this._say(ctx, randomFrom(COLLECT_CHEERS), 800)

    g.tween?.kill()
    g.bob?.kill()
    if (g.view && !g.view.destroyed) {
      gsap.killTweensOf(g.view)
      gsap.killTweensOf(g.view.scale)
      g.view.destroy()
    }

    if (this._goals.every((x) => x.got)) this._winLevel(ctx)
  },

  // Steg 1: flytta mattan under närmaste mål + spänn den (sänk) åt barnet.
  _assist(ctx, g) {
    if (!this._alive || !g) return
    this._say(ctx, 'Jag hjälper till!', 600)
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, this._charView.x, this._charView.y, { count: 6 })
    const targetX = clamp(g.x, BED_MIN_X, BED_MAX_X)
    // Mjuk glid av mattan mot målets x + ner till full spänning (uppdaterar fysik-kroppen).
    this._assistTween?.kill()
    const proxy = { x: this._bedX, y: this._bedY }
    this._assistTween = gsap.to(proxy, {
      x: targetX,
      y: BED_MAX_Y,
      duration: 0.7,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (this._alive) {
          this._setBed(clamp(proxy.x, BED_MIN_X, BED_MAX_X), clamp(proxy.y, BED_MIN_Y, BED_MAX_Y))
        }
      },
    })
  },

  // Steg 2: garanterad glid-fångst (kaninen glider till målet, fångar, fortsätter).
  _glideToGoal(ctx, g) {
    if (!this._alive || this._gliding || this._resolving || !g) return
    this._gliding = true
    const char = this._char
    Body.setStatic(char, true)
    nudge(char, 0, 0)
    this._assistTween?.kill()
    const from = { x: char.position.x, y: char.position.y }
    this._glideTween = gsap.to(from, {
      x: g.x,
      y: g.view.y,
      duration: 0.8,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (this._alive && this._char) Body.setPosition(this._char, { x: from.x, y: from.y })
      },
      onComplete: () => {
        if (!this._alive) return
        this._collectGoal(ctx, g)
        // Tillbaka ovanför mattan och fortsätt studsa.
        if (this._char) {
          Body.setStatic(this._char, false)
          Body.setPosition(this._char, { x: this._bedX, y: this._bedY - 130 })
          nudge(this._char, 0, -2)
        }
        this._gliding = false
        this._sinceCollect = 0
        this._helpStage = 0
      },
    })
  },

  // ---- Nivå klar: firande + ny (svårare) nivå -------------------------------

  _winLevel(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    this._say(ctx, randomFrom(WIN_CHEERS), 0)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, this._charView.x, this._charView.y, { count: 16 })
    this._boboMunch(ctx, true) // picknicken är serverad

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete() // delat firande + beröm-röst + stjärna + klistermärke

    this._loadTimer = gsap.delayedCall(1.9, () => {
      if (!this._alive) return
      this._resolving = false
      this._sinceCollect = 0
      this._helpStage = 0
      this._tapBoost = false
      this._setBed(640, DEFAULT_BED_Y)
      if (this._char) {
        Body.setStatic(this._char, false)
        Body.setPosition(this._char, { x: 640, y: this._bedY - 130 })
        nudge(this._char, 0, -MIN_UP)
      }
      this._spawnGoals(this._level)
      if (this._charView && !this._charView.destroyed) pop(this._charView)
    })
  },

  // ---- Kraftmätare (dekor) — visar hur spänd/hög mattan är -------------------

  _buildMeter() {
    this._meter = new Container()
    this._meter.position.set(1206, 470)
    this._meter.eventMode = 'none'
    const track = new Graphics()
      .roundRect(-22, -110, 44, 220, 22)
      .fill({ color: 0x000000, alpha: 0.12 })
      .stroke({ width: 4, color: COLORS.white, alpha: 0.7 })
    this._meterFill = new Graphics()
    // Ritad pil-topp (P0 ASSETS) i stället för ⬆️-emoji.
    const cap = new Graphics()
    cap.moveTo(-17, -132).lineTo(17, -132).lineTo(0, -156).closePath().fill(COLORS.white)
    cap.rect(-7, -132, 14, 12).fill(COLORS.white)
    cap.eventMode = 'none'
    this._meter.addChild(track, this._meterFill, cap)
    this._root.addChild(this._meter)
  },

  _updateMeter() {
    const g = this._meterFill
    if (!g || g.destroyed) return
    const c = this._power()
    if (c === this._lastPower) return // ändras bara när mattan dras → hoppa över annars
    this._lastPower = c
    const hgt = c * 200
    const color = c > 0.66 ? COLORS.orange : c > 0.33 ? COLORS.yellow : COLORS.teal
    g.clear()
    if (hgt > 1) g.roundRect(-15, 100 - hgt, 30, hgt, 14).fill(color)
  },

  // ---- Mattans ritning (ben + elastisk bädd vid _bedY, lokal x=0) ------------

  _drawRig(dip) {
    const g = this._rigG
    if (!g || g.destroyed) return
    // Geometrin ändras bara vid studs-dip eller när mattan flyttas → annars hoppa över
    // (sparar en full re-tessellering varje frame medan kaninen är i luften).
    if (dip === this._lastDip && this._bedX === this._lastRigX && this._bedY === this._lastRigY) return
    this._lastDip = dip
    this._lastRigX = this._bedX
    this._lastRigY = this._bedY
    const by = this._bedY
    const lx = -HALF_SPAN
    const rx = HALF_SPAN
    g.clear()
    // Ben (vinklade ut mot golvet) — sträcks/komprimeras med höjden.
    g.moveTo(lx, by).lineTo(lx - 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
    g.moveTo(rx, by).lineTo(rx + 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
    // Fötter.
    g.roundRect(lx - 70, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
    g.roundRect(rx + 26, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
    // Elastisk matt-linje (sjunker i mitten med dip vid studs).
    g.moveTo(lx, by)
      .quadraticCurveTo(0, by + dip, rx, by)
      .stroke({ width: 11, color: COLORS.teal, cap: 'round' })
    g.moveTo(lx, by - 4)
      .quadraticCurveTo(0, by - 4 + dip, rx, by - 4)
      .stroke({ width: 3, color: COLORS.white, alpha: 0.5, cap: 'round' })
    // Ändknoppar (mattans fästen).
    g.circle(lx, by, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.circle(rx, by, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
  },

  _dipBed() {
    if (!this._alive) return
    gsap.killTweensOf(this._bedProxy)
    gsap
      .timeline()
      .to(this._bedProxy, { dip: 30, duration: 0.07, ease: 'power2.out' })
      .to(this._bedProxy, { dip: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  },

  // Squash (platt) -> stretch (lång) -> tillbaka. Tweenar bara scale.
  _squash(view, big = false) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    const sq = big ? 0.58 : 0.74
    const st = big ? 1.3 : 1.16
    gsap
      .timeline()
      .to(view.scale, { x: 2 - sq, y: sq, duration: 0.07, ease: 'power2.out' })
      .to(view.scale, { x: 2 - st, y: st, duration: 0.12, ease: 'power1.out' })
      .to(view.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.2)' })
  },

  // Strypt röst-tilltal (undviker att prat staplas på varandra).
  _say(ctx, text, minGap = 1500) {
    const now = performance.now()
    if (now - this._lastVoice < minGap) return
    this._lastVoice = now
    ctx.services.voice.say(text)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._loadTimer?.kill()
    this._assistTween?.kill()
    this._glideTween?.kill()
    this._boboIdle?.kill()
    ;(this._flyTweens || []).forEach((t) => t.kill())
    if (this._bobo && !this._bobo.destroyed) gsap.killTweensOf(this._bobo.scale)
    if (this._basket && !this._basket.destroyed) gsap.killTweensOf(this._basket.scale)
    this._detachRig()
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatcherTap)
    if (this._rig && !this._rig.destroyed) this._rig.off('pointerdown', this._onRigDown)
    this._clearGoals()
    if (this._charView && !this._charView.destroyed) {
      gsap.killTweensOf(this._charView)
      gsap.killTweensOf(this._charView.scale)
    }
    gsap.killTweensOf(this._bedProxy)
    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- Ritade figurer (P0 ASSETS: egen silhuett, aldrig en emoji som hela föremålet) ---

// Kaninen: öron med rosa insida, kropp, ljus mage, tassar, morrhår och ett leende.
function makeBunny() {
  const c = new Container()
  const g = new Graphics()
  const R = 30
  g.ellipse(0, R * 1.15, R * 0.85, R * 0.22).fill({ color: 0x000000, alpha: 0.14 })
  for (const s of [-1, 1]) {
    g.ellipse(s * R * 0.34, -R * 1.32, R * 0.19, R * 0.74).fill(0xf4ede3)
    g.ellipse(s * R * 0.34, -R * 1.3, R * 0.1, R * 0.54).fill(0xf6c2d3)
  }
  g.ellipse(0, R * 0.3, R * 0.78, R * 0.72).fill(0xf4ede3) // kropp
  g.ellipse(0, R * 0.48, R * 0.46, R * 0.44).fill(0xfffaf3) // mage
  g.ellipse(-R * 0.62, R * 0.86, R * 0.3, R * 0.16).fill(0xe8ded0) // fötter
  g.ellipse(R * 0.62, R * 0.86, R * 0.3, R * 0.16).fill(0xe8ded0)
  g.circle(0, -R * 0.32, R * 0.66).fill(0xf4ede3) // huvud
  g.circle(-R * 0.24, -R * 0.4, R * 0.11).fill(0x33291f)
  g.circle(R * 0.24, -R * 0.4, R * 0.11).fill(0x33291f)
  g.circle(-R * 0.2, -R * 0.45, R * 0.04).fill(0xffffff)
  g.circle(R * 0.28, -R * 0.45, R * 0.04).fill(0xffffff)
  g.ellipse(0, -R * 0.16, R * 0.1, R * 0.08).fill(0xe79ab0) // nos
  g.moveTo(-R * 0.14, -R * 0.06).quadraticCurveTo(0, R * 0.06, R * 0.14, -R * 0.06)
    .stroke({ width: 2.6, color: 0x8a685a, cap: 'round' })
  g.circle(-R * 0.46, -R * 0.1, R * 0.13).fill({ color: 0xff9ec4, alpha: 0.7 })
  g.circle(R * 0.46, -R * 0.1, R * 0.13).fill({ color: 0xff9ec4, alpha: 0.7 })
  for (const s of [-1, 1]) {
    g.moveTo(s * R * 0.14, -R * 0.14).lineTo(s * R * 0.72, -R * 0.22)
      .moveTo(s * R * 0.14, -R * 0.08).lineTo(s * R * 0.72, -R * 0.02)
      .stroke({ width: 1.6, color: 0xb9ada0 })
  }
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Morot med blast.
function makeCarrot() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(-16, -14).lineTo(16, -14).lineTo(0, 32).closePath().fill(0xff8a3d)
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    g.moveTo(-16 + 32 * t * 0.5 - 8 * (1 - t), -14 + 46 * t).lineTo(16 - 32 * t * 0.5 + 8 * (1 - t), -14 + 46 * t)
      .stroke({ width: 2.4, color: 0xd9661f, alpha: 0.7 })
  }
  for (const [dx, rot] of [[-11, -0.5], [0, 0], [11, 0.5]]) {
    const leaf = new Graphics()
    leaf.ellipse(0, -14, 6, 16).fill(0x5bbf6a)
    leaf.position.set(dx, -14)
    leaf.rotation = rot
    leaf.eventMode = 'none'
    c.addChild(leaf)
  }
  g.eventMode = 'none'
  c.addChildAt(g, 0)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Guldstjärna med glans.
function makeStar() {
  const c = new Container()
  const g = new Graphics()
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    const r = i % 2 ? 12 : 28
    pts.push(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.poly(pts).fill(0xffd24a).stroke({ width: 3, color: 0xd9a021 })
  g.circle(-8, -8, 5).fill({ color: 0xffffff, alpha: 0.6 })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
