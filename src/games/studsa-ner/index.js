// Studsa Ner — plinko som RIKTIG lek (2–5 år). Kärnan är kvar: ett glansigt mynt
// pingar ner genom en triangel av pinnar och landar i en färgglad ficka. Men nu finns
// ett MÅL: en ficka LYSER (en utropad färg) och myntet du släpper har samma färg —
// landa i den lysande fickan så fylls en mätare; full mätare = firande + nästa nivå.
// KONTROLL: innan du släpper DRAR du myntet i sidled högst upp för att välja var det
// faller (med en mjuk vink om vilken ficka det lutar åt). Myntet faller HELT naturligt
// under normal tyngdkraft och studsar livligt mot pinnarna — ingen magnetisk styrning.
// Inget kan misslyckas: sikta över den lysande fickan, och en "fel" ficka ger ändå ett
// glatt plopp (bara ingen poäng) — aldrig ett straff. Hjälp-släpp (demo/idle) faller
// ovanför målfickan, och en mjuk slump-knuff lossar mynt som råkar fastna på en pinne.
// Nivåer: fler fickor, målet flyttar, fler pinnar. Allt ritas programmatiskt
// (matter.js + Pixi v8), exit-säkert.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { sparkle, puff, floatText, bigCelebration, breathe } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, DESIGN_W, DESIGN_H, PRAISE } from '../../lib/theme.js'

const MAX_BALLS = 6 // tak för prestanda; äldsta myntet tonar bort över detta
const TARGET_PER_LEVEL = 3 // antal träffar i målfickan för att fylla mätaren
const BALL_R = 20 // myntradie; lite mindre än pinngapet så det aldrig kilas fast
const TOP_Y = 56 // var myntet föds (i toppbandet) + var droppar-myntet vilar
const BOARD_TOP = 140
const BINS_TOP = 560 // fickornas överkant
const SETTLE_Y = 600 // myntet räknas som "nere i en ficka" under denna y
const SETTLE_SPEED = 0.6 // ... och långsammare än så här
const VOICE_THROTTLE = 2500 // ms mellan glada röst-rop (annars hackar rösten)
const HIT_THROTTLE = 70 // ms mellan pinn-ljud (anti-spam)

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
    this._dividerBodies = []
    this._lastHit = 0
    this._lastVoice = 0

    this._collected = 0
    this._missStreak = 0 // växer vid miss -> starkare "bris" mot målet (no-fail)
    this._binCount = 4
    this._binW = DESIGN_W / 4
    this._targetIdx = 1
    this._targetColor = PALETTE[1].color
    this._aiming = false
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
    this._demoTimer = gsap.delayedCall(0.6, () => this._alive && this._drop(ctx, this._targetCenterX(), true))
  },

  // ---- Statisk scen (byggs en gång) ---------------------------------------

  _buildStatic(ctx) {
    // Spelbräda.
    const board = new Graphics()
      .roundRect(72, BOARD_TOP, ctx.width - 144, BINS_TOP - BOARD_TOP - 10, 28)
      .fill({ color: COLORS.cream, alpha: 0.78 })
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
    for (let i = 0; i < TARGET_PER_LEVEL; i++) {
      const slot = new Graphics()
      slot.x = ctx.width - 56 - i * 64
      slot.y = 56
      this._drawMeterDot(slot, false, COLORS.inkSoft)
      this._meter.addChild(slot)
      this._meterDots.push(slot)
    }
    this._root.addChild(this._meter)

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
    for (const c of [...this._binLayer.children]) c.destroy()

    const binW = ctx.width / count
    const top = BINS_TOP
    const h = ctx.height - top

    for (let i = 0; i < count; i++) {
      const x0 = i * binW
      const isTarget = i === this._targetIdx
      const col = PALETTE[i % PALETTE.length].color
      const fill = new Graphics()
        .roundRect(x0 + 8, top, binW - 16, h, 16)
        .fill({ color: col, alpha: isTarget ? 0.95 : 0.8 })
      this._binLayer.addChild(fill)
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
    for (const c of [...this._pegLayer.children]) c.destroy()

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
        this._pegLayer.addChild(peg)
      }
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
    this._aiming = true
    const p = this._root.toLocal(e.global)
    this._dropX = clamp(p.x, BALL_R + 12, ctx.width - BALL_R - 12)
    this._dropper.x = this._dropX
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
    this._dropX = clamp(p.x, BALL_R + 12, ctx.width - BALL_R - 12)
    this._dropper.x = this._dropX
    this._drawHint(ctx, this._dropX)
    this._idle = 0
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
    x = clamp(x, r + 12, ctx.width - r - 12)

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

    const ball = { body, view, settled: false }
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
    this._phys.update(t.deltaMS)

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

    // Mild återpåminnelse om ingen rört skärmen på ett tag -> röst + hjälp-släpp.
    this._idle += t.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      this._announceTarget(ctx, 0)
      this._drop(ctx, this._targetCenterX(), true)
    }
  },

  _onSettle(ctx, ball) {
    if (!this._alive) return
    const p = ball.body.position
    const idx = clamp(Math.floor(p.x / this._binW), 0, this._binCount - 1)
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
    sparkle(this._root, x, y, { count: 10 })
    floatText(ctx.fxLayer, x, y - 30, '⭐', { fontSize: 56 })

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
    this._levelTimer = gsap.delayedCall(1.7, () => {
      if (!this._alive) return
      ctx.services.voice.say('Nästa nivå!')
      this._loadLevel(ctx, this._level, true)
    })
  },

  _announceTarget(ctx, delay) {
    if (delay > 0) {
      this._announceTimer?.kill()
      this._announceTimer = gsap.delayedCall(delay, () => {
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
      const ballBody = a.label === 'peg' ? b : a
      if (ballBody.speed > 1.6) {
        this._lastHit = now
        ctx.services.audio.sfx('tap')
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

    if (this._dropper && !this._dropper.destroyed) gsap.killTweensOf(this._dropper.scale)
    if (this._glow && !this._glow.destroyed) gsap.killTweensOf(this._glow.scale)
    for (const dot of this._meterDots || []) {
      if (dot && !dot.destroyed) gsap.killTweensOf(dot.scale)
    }
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
  const c = new Container()
  const body = new Graphics()
    .circle(0, 0, r)
    .fill(color)
    .stroke({ width: Math.max(2, r * 0.08), color: shade(color, 0.18), alpha: 0.6 })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.34).fill({ color: COLORS.white, alpha: 0.55 })
  gloss.eventMode = 'none'
  c.addChild(body, gloss)
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
