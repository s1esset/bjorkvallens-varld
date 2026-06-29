// Rulla Bollen Hem — minigolf-fysik sedd ovanifrån (3–5 år). Barnet SIKTAR och
// rullar bollen hem i målet: greppar bollen, drar för att välja riktning + kraft
// (en prickad bana visar EXAKT var bollen rullar och stannar) och släpper — bollen
// rullar iväg som en riktig matter.js-kropp utan gravitation (toppvy), bromsas av
// ytans luftmotstånd (= friktion) och studsar mjukt mot planens väggar tills den
// stannar. Nästa skott går från det nya viloläget (precis som riktig minigolf), så
// bollen kommer steg för steg närmare. EXTRA KONTROLL: en yt-knapp växlar Gräs ↔ Is
// — is glider mycket längre (lägre frictionAir) och pricklinjen uppdateras direkt så
// förhandsvisningen alltid stämmer. INGET misslyckande: stannar bollen utan mål blir
// det en glad puff + vingel, och efter ett par stopp får den först ett nästan-perfekt
// hjälp-skott och sedan en garanterad hemrullning — alltid jubel, aldrig "game over".
// Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga filer.
//
// Kalibrering (uppmätt mot matter vid fast 1/60-steg): toppvy => gravityY = 0, så
// previewGravity = 0; utrullningen styrs helt av luftmotståndet och matter dämpar
// farten ~(1 - frictionAir) per steg, så previewDamp = 1 - frictionAir får pricklinjen
// att stanna på exakt samma punkt som bollen. Skott-farten (Body.setVelocity) är samma
// vektor som AimLauncher matar förhandsvisningen med -> linjen och bollen följs åt.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration, puff, sparkle, pop, wiggle, floatText } from '../../lib/feedback.js'
import { FONT, COLORS } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// Layout i designkoordinater (1280×720).
const FIELD = { x: 60, y: 120, w: 1160, h: 560, r: 32 }
const WALL = { l: 60, r: 1220, t: 120, b: 680 } // planens inre studskanter
const BALL_R = 56
const BALL_START = { x: 200, y: 400 }

// Ytor (extra kontroll). frictionAir = ytans bromsning: gräs bromsar mer (kort, lugn
// rull), is bromsar mindre (lång, hal glidning med fler studsar). Bollens utrullning
// ≈ v0 × (1 - fa) / fa, så is rullar ~2× så långt som gräs vid samma kraft.
const SURFACES = [
  { key: 'gras', label: 'Gräs', icon: '🌱', frictionAir: 0.028 },
  { key: 'is', label: 'Is', icon: '🧊', frictionAir: 0.014 },
]

const BALL_REST = 0.55 // bollens (och väggarnas) studsighet — mjuka studsar
const REST_SPEED = 0.6 // matter-fart under detta = bollen stannar
const REST_DWELL = 0.28 // s under REST_SPEED innan vi räknar bollen som stilla
const MAX_ROLL = 6 // s rullning innan vi tvingar stopp (extra säkerhet)
const IDLE_DELAY = 6 // s utan handling innan röst-recue
const BOUNCE_THROTTLE = 0.14 // s mellan studsljud (anti-spam)

// Förhandsvisningens väggar (bollens MITT studsar här). predict saknar takvägg, så
// banorna är gjorda så att direkt-/sido-/golvstudsar räcker — topp-studs behövs aldrig.
const PREVIEW_BOUNDS = { floorY: WALL.b - BALL_R, leftX: WALL.l + BALL_R, rightX: WALL.r - BALL_R, restitution: BALL_REST }

// Färger.
const C_GRASS = 0x7ec850
const C_FIELD = 0x8fd65e
const C_FIELD_EDGE = 0x5fa83c
const C_GOAL = 0xffd84a

const IDLE_CUES = ['Sikta och rulla bollen hem!', 'Dra i bollen och släpp – rulla hem den!', 'Sikta mot målet och släpp!']
const MISS_CUES = ['Nästan! Rulla igen.', 'Försök en gång till!', 'Nästan framme – en gång till!']
const WIN_CUES = ['Mål! Du klarade det!', 'Hurra! Bollen är hemma!', 'Bra rullat! Rakt i mål!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'rulla-bollen-hem',
  titleSv: 'Rulla Bollen Hem',
  icon: '⚽',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'rulla-bollen-hem',
  voiceIntro: 'Sikta och rulla bollen hem i målet!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._restT = 0
    this._rollT = 0
    this._mode = 'aim' // aim | rolling | gliding | resolving
    this._misses = 0
    this._assisting = false
    this._lastBounce = -1
    this._surfaceIdx = 0
    this._home = { x: 1060, y: 400, r: 110 }
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)

    // Fysik: toppvy => INGEN gravitation. Egna studsväggar längs planens insida
    // (inte skärmkanten), så bollen alltid hålls kvar inne på planen (no-fail).
    this._phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    this._buildWalls()

    // Boll-kropp (persistent: vilar där den stannar och skjuts om från nya läget).
    this._ballBody = this._phys.circle(BALL_START.x, BALL_START.y, BALL_R, {
      restitution: BALL_REST,
      friction: 0.04,
      frictionAir: SURFACES[0].frictionAir,
      density: 0.0012,
      label: 'ball',
    })
    // Toppvy-puck: lås vinkeln (ingen snurr från studsar) så containern står upprätt
    // och skuggan stannar under bollen — endast emojin roteras (rull-känsla).
    Body.setInertia(this._ballBody, Infinity)
    this._phys.link(this._ballBody, this._ball) // synkar bara position (vinkel = 0)

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Sikt-/skjut-kontroll: dra för riktning + kraft, prickad bana = exakt utrullning.
    // slingshot:false => man drar ÅT det håll bollen ska rulla (knuff, inte slangbella).
    this._launcher = new AimLauncher({
      target: this._ball,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: false,
      hitRadius: 92,
      maxPower: 26,
      minPower: 8,
      powerScale: 0.16,
      tapPower: 0.85, // ett litet tap skjuter nästan hela vägen mot målet (snällt)
      trailColor: 0xffffff,
      previewGravity: 0, // toppvy: ingen gravitation i pricklinjen
      previewWind: 0,
      previewDamp: 1 - SURFACES[0].frictionAir, // = ytans bromsning -> linjen stannar rätt
      bounds: { ...PREVIEW_BOUNDS },
      getOrigin: () => ({ x: this._ball.x, y: this._ball.y }),
      defaultAim: () => ({ x: this._home.x, y: this._home.y }),
      onGrab: () => {
        this._idle = 0
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      },
      onAim: () => {
        this._idle = 0
      },
      onLaunch: (v) => {
        this._assisting = false
        this._shoot(ctx, v.vx, v.vy)
      },
    })

    // Bollen läggs överst (ovanför pricklinjen och målet).
    this._root.addChild(this._ball)

    this._buildSurfaceUI(ctx)

    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen -------------------------------------------------------

  _buildScene(ctx) {
    // Gräs-bakgrund: fångar tap utanför bollen -> liten glad puff (varje pekning syns).
    this._bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(C_GRASS)
    this._bg.eventMode = 'static'
    this._onBgTap = (e) => this._bgTap(ctx, e)
    this._bg.on('pointertap', this._onBgTap)
    this._root.addChild(this._bg)

    // Spelplan med rundade hörn (studsväggar) — dekorativ, släpper tap igenom.
    const frame = new Graphics()
      .roundRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, FIELD.r)
      .fill(C_FIELD)
      .stroke({ width: 10, color: C_FIELD_EDGE })
    frame.roundRect(FIELD.x, FIELD.y, FIELD.w, 60, FIELD.r).fill({ color: 0xa6e36f, alpha: 0.5 })
    frame.roundRect(FIELD.x, FIELD.y + FIELD.h - 50, FIELD.w, 50, FIELD.r).fill({ color: 0x4f9a36, alpha: 0.3 })
    frame.eventMode = 'none'
    this._root.addChild(frame)

    // Is-overlay (visas mjukt när ytan = is): ljusblå isyta med glansstreck.
    this._iceOverlay = new Graphics()
    this._iceOverlay.roundRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, FIELD.r).fill({ color: 0xcdeeff })
    this._iceOverlay.roundRect(FIELD.x + 60, FIELD.y + 50, FIELD.w * 0.5, 18, 9).fill({ color: 0xffffff, alpha: 0.5 })
    this._iceOverlay.roundRect(FIELD.x + 260, FIELD.y + 190, FIELD.w * 0.4, 14, 7).fill({ color: 0xffffff, alpha: 0.4 })
    this._iceOverlay.roundRect(FIELD.x + 120, FIELD.y + 360, FIELD.w * 0.34, 12, 6).fill({ color: 0xffffff, alpha: 0.35 })
    this._iceOverlay.alpha = 0
    this._iceOverlay.eventMode = 'none'
    this._root.addChild(this._iceOverlay)

    this._buildHome()
    this._buildBall()
  },

  _buildHome() {
    this._homeC = new Container()
    this._homeC.eventMode = 'none' // tap passerar igenom (bollens skott avgör målet)
    this._homeC.interactiveChildren = false
    this._homeGlow = new Graphics() // målzon-ring (ritas om per nivå, andas)
    const net = new Graphics().roundRect(-75, -85, 150, 170, 24).fill({ color: 0xffffff, alpha: 0.5 })
    const e = new Text({ text: '🥅', style: { fontFamily: FONT.body, fontSize: 120 } })
    e.anchor.set(0.5)
    this._homeC.addChild(this._homeGlow, net, e)
    this._root.addChild(this._homeC)
    // Mjuk andning på målringen (drar blicken mot målet).
    this._goalTween = gsap.to(this._homeGlow.scale, { x: 1.12, y: 1.12, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildBall() {
    this._ball = new Container()
    this._ball.position.set(BALL_START.x, BALL_START.y)
    const shadow = new Graphics().ellipse(0, BALL_R * 0.92, BALL_R * 0.9, BALL_R * 0.34).fill({ color: 0x000000, alpha: 0.16 })
    const disc = new Graphics().circle(0, 0, BALL_R * 0.92).fill({ color: 0xffffff, alpha: 0.9 })
    // ENDAST emojin roteras (rull-känsla); containern hålls upprätt av link (vinkel 0).
    this._ballEmoji = new Text({ text: '⚽', style: { fontFamily: FONT.body, fontSize: 96 } })
    this._ballEmoji.anchor.set(0.5)
    shadow.eventMode = 'none'
    disc.eventMode = 'none'
    this._ballEmoji.eventMode = 'none'
    this._ball.addChild(shadow, disc, this._ballEmoji)
    // Bollen blir AimLaunchers target (den sätter eventMode + hit-halo själv).
    this._root.addChild(this._ball)
  },

  // Fyra tjocka, statiska studsväggar vars insidor ligger exakt vid planens kanter.
  _buildWalls() {
    const T = 220
    const W = 1280
    const H = 720
    const opt = { isStatic: true, restitution: BALL_REST, friction: 0.04, label: 'wall' }
    this._phys.rectangle(WALL.l - T / 2, H / 2, T, H + 600, opt) // vänster
    this._phys.rectangle(WALL.r + T / 2, H / 2, T, H + 600, opt) // höger
    this._phys.rectangle(W / 2, WALL.t - T / 2, W + 600, T, opt) // topp
    this._phys.rectangle(W / 2, WALL.b + T / 2, W + 600, T, opt) // botten
  },

  // ---- Banor (nivåberoende) -----------------------------------------------

  _layoutFor(level) {
    const start = { ...BALL_START }
    let home
    if (level <= 1) {
      home = { x: 1060, y: 400, r: 110 } // rak väg, lär ut sikt + kraft
    } else if (level <= 3) {
      home = { x: 1090, y: level % 2 ? 260 : 540, r: 100 } // upp/ner -> sikta i vinkel
    } else if (level <= 5) {
      home = { x: 1130, y: level % 2 ? 232 : 568, r: 95 } // nära hörnet -> studsskott lönar sig
    } else {
      const yBase = level % 2 ? 232 : 560
      const jitter = Math.random() * 70 - 35
      home = { x: clamp(1080 + (level - 6) * 8, 1000, 1150), y: clamp(yBase + jitter, 210, 590), r: 88 }
      start.y = clamp(400 + (Math.random() * 120 - 60), 280, 520)
    }
    return { home, start }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._mode = 'aim'
    this._misses = 0
    this._assisting = false
    this._restT = 0
    this._rollT = 0
    this._idle = 0

    // Yta tillbaka till gräs vid varje ny bana (tyst — ingen röst/effekt).
    this._setSurface(ctx, 0, { silent: true })

    const lay = this._layoutFor(level)
    this._home = lay.home
    this._positionHome()

    // Bollen tillbaka till start, upprätt och full storlek.
    gsap.killTweensOf(this._ball)
    gsap.killTweensOf(this._ball.scale)
    this._ball.scale.set(1)
    this._ball.alpha = 1
    this._ballEmoji.rotation = 0
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setPosition(this._ballBody, { x: lay.start.x, y: lay.start.y })
    this._ball.position.set(lay.start.x, lay.start.y)

    this._launcher.setEnabled(true)
    if (!this._ball.destroyed) pop(this._ball)
  },

  _positionHome() {
    this._homeC.position.set(this._home.x, this._home.y)
    this._homeGlow.clear().circle(0, 0, this._home.r).stroke({ width: 6, color: C_GOAL, alpha: 0.55 })
    // Mål-sensor (riktig matter-kropp, label 'home'): ploppar bollen "i mål".
    if (this._homeSensor) this._phys.removeBody(this._homeSensor)
    this._homeSensor = this._phys.circle(this._home.x, this._home.y, Math.max(24, this._home.r * 0.5), {
      isStatic: true,
      isSensor: true,
      label: 'home',
    })
  },

  // ---- Skott --------------------------------------------------------------

  _shoot(ctx, vx, vy) {
    if (!this._alive || this._mode === 'rolling' || this._mode === 'gliding' || this._mode === 'resolving') return
    this._mode = 'rolling'
    this._rollT = 0
    this._restT = 0
    this._idle = 0
    this._launcher.setEnabled(false)
    Body.setVelocity(this._ballBody, { x: vx, y: vy })
    ctx.services.audio.sfx('whoosh')
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5 })
  },

  // ---- Ticker: fysik + rull-känsla + mål/stopp + idle ---------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._phys.update(ticker.deltaMS)

    // Rull-rotation på emojin (proportionell mot horisontell fart, riktning-medveten).
    const b = this._ballBody
    const spd = Math.hypot(b.velocity.x, b.velocity.y)
    if (spd > 0.05 && this._ballEmoji && !this._ballEmoji.destroyed) {
      this._ballEmoji.rotation += (b.velocity.x / BALL_R) * (ticker.deltaMS / 16.67)
    }

    if (this._mode === 'rolling' || this._mode === 'gliding') {
      if (this._inHome()) {
        this._reachGoal(ctx)
        return
      }
      if (this._mode !== 'rolling') return
      this._rollT += dt
      if (spd < REST_SPEED) {
        this._restT += dt
        if (this._restT >= REST_DWELL || this._rollT > MAX_ROLL) this._settle(ctx)
      } else {
        this._restT = 0
        if (this._rollT > MAX_ROLL) this._settle(ctx)
      }
      return
    }

    if (this._mode === 'aim') {
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say(randomFrom(IDLE_CUES))
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      }
    }
  },

  _inHome() {
    const r = this._home.r + (this._assisting ? 30 : 0) // hjälp-skott = ännu generösare
    return Math.hypot(this._ball.x - this._home.x, this._ball.y - this._home.y) < r
  },

  // Bollen stannade utan mål -> ALLTID roligt, aldrig straff. Snäll upptrappning:
  // ett par fria försök -> nästan-perfekt hjälp-skott -> garanterad hemrullning.
  _settle(ctx) {
    if (!this._alive || this._mode === 'resolving') return
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    this._mode = 'aim'
    this._restT = 0
    this._rollT = 0
    this._misses++

    if (this._misses >= 3) {
      this._glideHome(ctx)
      return
    }
    if (this._misses >= 2) {
      this._autoShot(ctx)
      return
    }

    // Normal miss: mjukt ljud + vingel på bollen + liten puff (lekfullt).
    ctx.services.audio.sfx('soft')
    if (this._ballEmoji && !this._ballEmoji.destroyed) wiggle(this._ballEmoji)
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5 })
    this._launcher.setEnabled(true)
    this._idle = 0
    if (Math.random() < 0.55) ctx.services.voice.say(randomFrom(MISS_CUES))
  },

  // Hjälp-skott (steg 1): sikta rakt mot målet med lagom kraft så utrullningen når hem.
  _autoShot(ctx) {
    this._assisting = true
    this._idle = 0
    ctx.services.voice.say('Nästan! Jag hjälper till lite.')
    const dx = this._home.x - this._ball.x
    const dy = this._home.y - this._ball.y
    const D = Math.hypot(dx, dy) || 1
    const fa = SURFACES[this._surfaceIdx].frictionAir
    // Utrullning ≈ v0 × (1 - fa) / fa. Lös v0 så bollen rullar ~1.15×D (lite överskott
    // in i målet); +30-radien fångar den oavsett. Öppen plan => fri väg, inga hinder.
    let v0 = (D * 1.15 * fa) / (1 - fa)
    v0 = clamp(v0, 10, 30)
    const vx = (dx / D) * v0
    const vy = (dy / D) * v0
    ctx.services.audio.sfx('whoosh')
    if (this._ball && !this._ball.destroyed) sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 6 })
    this._mode = 'rolling'
    this._rollT = 0
    this._restT = 0
    this._launcher.setEnabled(false)
    Body.setVelocity(this._ballBody, { x: vx, y: vy })
  },

  // Garanterad hemrullning (steg 2): bollen glider hela vägen hem (exit-säker {}-proxy).
  _glideHome(ctx) {
    this._mode = 'gliding'
    this._assisting = true
    this._idle = 0
    this._launcher.setEnabled(false)
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('Jag rullar den hem åt dig!')
    const sx = this._ball.x
    const sy = this._ball.y
    const tx = this._home.x
    const ty = this._home.y
    const st = { p: 0 }
    gsap.killTweensOf(st)
    this._glideTween = gsap.to(st, {
      p: 1,
      duration: 1.0,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._alive || !this._ballBody) {
          this._glideTween?.kill()
          return
        }
        const x = sx + (tx - sx) * st.p
        const y = sy + (ty - sy) * st.p
        Body.setPosition(this._ballBody, { x, y })
        Body.setVelocity(this._ballBody, { x: 0, y: 0 })
        if (this._ballEmoji && !this._ballEmoji.destroyed) this._ballEmoji.rotation += 0.16
      },
      onComplete: () => {
        if (this._alive) this._reachGoal(ctx)
      },
    })
  },

  // ---- Mål nått: firande + ny bana ----------------------------------------

  _reachGoal(ctx) {
    if (this._mode === 'resolving') return
    this._mode = 'resolving'
    this._glideTween?.kill()
    this._launcher.setEnabled(false)
    this._idle = 0
    this._restT = 0
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })

    const hx = this._home.x
    const hy = this._home.y
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(WIN_CUES))

    // Bollen åker in i målet och krymper. Kroppen flyttas till målet (link följer);
    // skala tweenas på containern (link rör bara position/vinkel, inte skala).
    Body.setPosition(this._ballBody, { x: hx, y: hy })
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    if (this._ball && !this._ball.destroyed) {
      this._ball.position.set(hx, hy)
      gsap.killTweensOf(this._ball.scale)
      gsap.to(this._ball.scale, { x: 0.5, y: 0.5, duration: 0.4, ease: 'power2.in' })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    puff(ctx.fxLayer, hx, hy, { count: 14, color: C_GOAL })
    sparkle(ctx.fxLayer, hx, hy, { count: 8 })

    // Förlopp: höj nivå, räkna hemrullningar, kör delat firande (stjärna + klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._loadTimer?.kill()
    this._loadTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Kollisioner: mål-sensor + studsljud --------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const involvesBall = pair.bodyA === this._ballBody || pair.bodyB === this._ballBody
      if (!involvesBall) continue
      const other = pair.bodyA === this._ballBody ? pair.bodyB : pair.bodyA
      if (other.label === 'home') {
        if (this._mode === 'rolling' || this._mode === 'gliding') this._reachGoal(ctx)
        return
      }
      if (other.label === 'wall') {
        if (this._t - this._lastBounce > BOUNCE_THROTTLE) {
          const spd = Math.hypot(this._ballBody.velocity.x, this._ballBody.velocity.y)
          if (spd > 2) {
            this._lastBounce = this._t
            ctx.services.audio.sfx('pop')
            if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 4 })
          }
        }
      }
    }
  },

  // ---- Extra kontroll: yta (Gräs ↔ Is) ------------------------------------

  _buildSurfaceUI(ctx) {
    this._surfaceBtn = new Button({
      icon: '🔄',
      label: 'Byt yta',
      width: 200,
      height: 108,
      color: COLORS.teal,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._cycleSurface(ctx),
    })
    this._surfaceBtn.position.set(168, 650)
    this._root.addChild(this._surfaceBtn)

    // Indikator ovanför knappen visar vald yta (emoji + namn) — uppdateras vid byte.
    this._surfaceLabel = new Text({
      text: '',
      style: { fontFamily: FONT.title, fontSize: 34, fontWeight: '800', fill: COLORS.ink, align: 'center' },
    })
    this._surfaceLabel.anchor.set(0.5)
    this._surfaceLabel.position.set(168, 566)
    this._surfaceLabel.eventMode = 'none'
    this._root.addChild(this._surfaceLabel)
  },

  _cycleSurface(ctx) {
    this._setSurface(ctx, (this._surfaceIdx + 1) % SURFACES.length)
  },

  // Byter yta: uppdaterar bollens frictionAir OCH pricklinjens damp i takt, så att
  // förhandsvisningen alltid matchar den nya utrullningen exakt.
  _setSurface(ctx, idx, { silent = false } = {}) {
    this._surfaceIdx = idx
    const s = SURFACES[idx]
    if (this._ballBody) this._ballBody.frictionAir = s.frictionAir
    this._launcher?.setPreview({ damp: 1 - s.frictionAir })
    if (this._surfaceLabel && !this._surfaceLabel.destroyed) this._surfaceLabel.text = `${s.icon} ${s.label}`
    if (this._iceOverlay && !this._iceOverlay.destroyed) {
      gsap.killTweensOf(this._iceOverlay)
      gsap.to(this._iceOverlay, { alpha: s.key === 'is' ? 0.5 : 0, duration: 0.3 })
    }
    this._idle = 0
    if (!silent) {
      ctx.services.audio.sfx('whoosh')
      ctx.services.voice.say(s.key === 'is' ? 'Hal is! Bollen glider långt.' : 'Mjukt gräs. Bollen rullar lugnt.')
      if (this._surfaceBtn && !this._surfaceBtn.destroyed) pop(this._surfaceBtn)
      floatText(ctx.fxLayer, this._surfaceBtn.x, this._surfaceBtn.y - 84, s.icon, { fontSize: 56 })
    }
  },

  // ---- Tom-tap på planen: alltid en glad liten respons -------------------

  _bgTap(ctx, e) {
    if (!this._alive || this._mode === 'rolling' || this._mode === 'gliding' || this._mode === 'resolving') return
    const p = this._root.toLocal(e.global)
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, p.x, p.y, { count: 4 })
    this._idle = 0
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._loadTimer?.kill()
    this._glideTween?.kill()
    this._goalTween?.kill()

    if (this._bg && !this._bg.destroyed) this._bg.off('pointertap', this._onBgTap)
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
    }
    if (this._ballEmoji && !this._ballEmoji.destroyed) gsap.killTweensOf(this._ballEmoji)
    if (this._homeGlow && !this._homeGlow.destroyed) gsap.killTweensOf(this._homeGlow.scale)
    if (this._iceOverlay && !this._iceOverlay.destroyed) gsap.killTweensOf(this._iceOverlay)
    if (this._surfaceBtn && !this._surfaceBtn.destroyed) gsap.killTweensOf(this._surfaceBtn.scale)

    this._launcher?.destroy()
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
