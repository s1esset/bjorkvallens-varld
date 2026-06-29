// Rulla Bollen Hem — mjuk fysik-/motoriklek (3–5 år). Barnet "siktar och knuffar":
// drar bollen i en riktning och släpper, så bollen får en fart baserad på dragvektorn
// och rullar med lätt friktion, studsar mjukt mot väggar och hinder och söker sig till
// målet. Bollen kan ALDRIG misslyckas: stannar den utan mål får den en mjuk auto-knuff,
// och fastnar den glider den hela vägen hem av sig själv — alltid jubel, aldrig ett
// "game over". Drag = sikta-knuffa, med tap-tap-fallback (tryck boll, tryck sedan i
// banan/målet). Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga filer.
//
// OBS: DragControllern passar inte här — släppet ska ge en KNUFF (fart) snarare än en
// snäpp till ett mål (se spec rad 43–49), så pekar-/tap-tap-logiken är egen men följer
// samma snäll-principer (stor träffyta, tap-tap, snäll respons på varje pekning).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { bigCelebration, puff, sparkle, pop } from '../../lib/feedback.js'
import { FONT } from '../../lib/theme.js'

// Layout i designkoordinater (1280×720).
const FIELD = { x: 60, y: 120, w: 1160, h: 560, r: 32 }
const WALL = { l: 60, r: 1220, t: 120, b: 680 } // innerväggar (studsväggar)
const BALL_R = 56
const BALL_HALO = 80 // osynlig träffradie
const BALL_START = { x: 180, y: 400 }

const FRICTION = 0.985 // mjuk inbromsning per frame
const MAX_V = 28 // hastighetstak (bollen kan aldrig skjutas ut ur banan på ett frame)
const STILL_SPEED = 0.4 // under detta räknas bollen som stillastående
const AUTO_HELP_DELAY = 2.5 // s stillastående innan auto-hjälp
const IDLE_DELAY = 6 // s utan interaktion innan röst-recue
const BOUNCE_THROTTLE = 0.16 // s mellan studsljud (anti-spam)

// Färger (spec).
const C_GRASS = 0x7ec850
const C_FIELD = 0x8fd65e
const C_FIELD_EDGE = 0x5fa83c
const C_OBST = 0xb5793a
const C_OBST_EDGE = 0x8a5a28
const C_GOAL = 0xffd84a

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'rulla-bollen-hem',
  titleSv: 'Rulla Bollen Hem',
  icon: '⚽',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'rulla-bollen-hem',
  voiceIntro: 'Dra bollen till målet och släpp!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._still = 0
    this._helpStage = 0
    this._vx = 0
    this._vy = 0
    this._incoming = 0
    this._lastBounce = -1
    this._aiming = false
    this._selected = false
    this._resolving = false
    this._gliding = false
    this._touched = false
    this._obstacles = []
    this._goalPos = { x: 1090, y: 400 }
    this._goalR = 110

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen (byggs en gång, återanvänds mellan banor) -------------

  _buildScene(ctx) {
    // Gräsbakgrund: fångar fält-tap (tap-tap-fallback). Heltäckande.
    this._bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(C_GRASS)
    this._bg.eventMode = 'static'
    this._onFieldTap = (e) => this._fieldTap(ctx, e)
    this._bg.on('pointertap', this._onFieldTap)
    this._root.addChild(this._bg)

    // Banram med rundade hörn (studsväggar) — dekorativ, släpper tap igenom.
    const frame = new Graphics()
      .roundRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, FIELD.r)
      .fill(C_FIELD)
      .stroke({ width: 10, color: C_FIELD_EDGE })
    frame.roundRect(FIELD.x, FIELD.y, FIELD.w, 60, FIELD.r).fill({ color: 0xa6e36f, alpha: 0.5 })
    frame.roundRect(FIELD.x, FIELD.y + FIELD.h - 50, FIELD.w, 50, FIELD.r).fill({ color: 0x4f9a36, alpha: 0.3 })
    frame.eventMode = 'none'
    this._root.addChild(frame)

    // Hinderlager (byggs om per nivå).
    this._obstacleLayer = new Container()
    this._obstacleLayer.eventMode = 'none'
    this._obstacleLayer.interactiveChildren = false
    this._root.addChild(this._obstacleLayer)

    // Mål (persistent — flyttas/ändras per nivå).
    this._buildGoal()

    // Siktpil (dekorativ, ritas om vid drag).
    this._aimArrow = new Graphics()
    this._aimArrow.eventMode = 'none'
    this._aimArrow.visible = false
    this._root.addChild(this._aimArrow)

    // Boll (persistent).
    this._buildBall(ctx)
  },

  _buildGoal() {
    this._goal = new Container()
    this._goal.eventMode = 'none' // tap passerar till bg (tap-på-mål hanteras i _fieldTap)
    this._goalGlow = new Graphics() // målzon-glödring, ritas om per nivå
    const net = new Graphics().roundRect(-75, -85, 150, 170, 24).fill({ color: 0xffffff, alpha: 0.5 })
    const e = new Text({ text: '🥅', style: { fontFamily: FONT.body, fontSize: 120 } })
    e.anchor.set(0.5)
    this._goal.addChild(this._goalGlow, net, e)
    this._root.addChild(this._goal)
    // Mjuk andning på glödringen (drar blicken mot målet).
    this._goalTween = gsap.to(this._goalGlow.scale, { x: 1.12, y: 1.12, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildBall(ctx) {
    this._ball = new Container()
    this._ball.position.set(BALL_START.x, BALL_START.y)
    // Markskugga (mörk ellips, roterar ej — ligger i containern men containern roterar ej).
    const shadow = new Graphics().ellipse(0, BALL_R * 0.92, BALL_R * 0.9, BALL_R * 0.34).fill({ color: 0x000000, alpha: 0.16 })
    // Vit skuggcirkel bakom bollen (mjuk halo).
    const disc = new Graphics().circle(0, 0, BALL_R * 0.92).fill({ color: 0xffffff, alpha: 0.9 })
    // Bollens emoji — ENDAST denna roteras (rull-känsla).
    this._ballEmoji = new Text({ text: '⚽', style: { fontFamily: FONT.body, fontSize: 96 } })
    this._ballEmoji.anchor.set(0.5)
    this._ball.addChild(shadow, disc, this._ballEmoji)
    this._ball.eventMode = 'static'
    this._ball.cursor = 'pointer'
    this._ball.hitArea = new Circle(0, 0, BALL_HALO)
    this._onBallDown = (e) => this._ballDown(ctx, e)
    this._onBallMove = (e) => this._ballMove(e)
    this._onBallUp = (e) => this._ballUp(ctx, e)
    this._ball.on('pointerdown', this._onBallDown)
    this._root.addChild(this._ball)
  },

  // ---- Banor (nivåberoende) -----------------------------------------------

  _layoutFor(level) {
    const O = (x, y) => ({ x, y, w: 120, h: 120 })
    // Jitter bara på höga nivåer -> oändlig variation utan att bryta fri sikt.
    const jit = level >= 6 ? () => Math.random() * 60 - 30 : () => 0
    let goal
    let obstacles
    if (level <= 1) {
      goal = { x: 1090, y: 400, r: 110 } // rak väg, lär ut knuffen
      obstacles = []
    } else if (level <= 3) {
      goal = { x: 1090, y: 400, r: 110 }
      obstacles = [O(640, 400)]
    } else if (level <= 5) {
      goal = { x: 1090, y: 240, r: 110 }
      obstacles = [O(520, 300), O(780, 500)]
    } else {
      goal = { x: 1090, y: level % 2 ? 240 : 400, r: 95 } // mindre zon, aldrig under 90
      obstacles = [O(470, 260), O(680, 460), O(890, 260)] // lätt slalom
    }
    obstacles.forEach((o) => {
      o.x += jit()
      o.y += jit()
    })
    return { goal, obstacles }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    // Nollställ tillstånd.
    this._resolving = false
    this._gliding = false
    this._aiming = false
    this._touched = false
    this._vx = 0
    this._vy = 0
    this._incoming = 0
    this._still = 0
    this._helpStage = 0
    this._idle = 0

    this._deselect()
    this._hideAim()
    this._detachBall()

    // Boll tillbaka till start, rak och full storlek.
    gsap.killTweensOf(this._ball)
    gsap.killTweensOf(this._ball.scale)
    this._ball.position.set(BALL_START.x, BALL_START.y)
    this._ball.scale.set(1)
    this._ball.alpha = 1
    this._ballEmoji.rotation = 0

    this._applyLayout(level)

    // Liten "redo"-puls på bollen.
    if (!this._ball.destroyed) pop(this._ball)
  },

  _applyLayout(level) {
    const { goal, obstacles } = this._layoutFor(level)
    this._goalPos = { x: goal.x, y: goal.y }
    this._goalR = goal.r
    this._goal.position.set(goal.x, goal.y)
    this._goalGlow.clear().circle(0, 0, goal.r).stroke({ width: 6, color: C_GOAL, alpha: 0.55 })

    this._clearObstacles()
    this._obstacles = obstacles
    for (const o of obstacles) {
      const g = new Graphics()
        .roundRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 18)
        .fill(C_OBST)
        .stroke({ width: 6, color: C_OBST_EDGE })
      g.eventMode = 'none'
      this._obstacleLayer.addChild(g)
    }
  },

  _clearObstacles() {
    if (!this._obstacleLayer) return
    for (const c of [...this._obstacleLayer.children]) c.destroy()
  },

  // ---- Pekare: sikta-knuffa + tap-tap -------------------------------------

  _ballDown(ctx, e) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._still = 0
    this._touched = true
    this._aiming = true
    this._vx = 0
    this._vy = 0
    if (this._selected) this._deselect()
    this._down = this._root.toLocal(e.global)
    gsap.killTweensOf(this._ball.scale)
    gsap.to(this._ball.scale, { x: 1.12, y: 1.12, duration: 0.12 })
    ctx.services.audio.sfx('tap')
    this._ball.on('globalpointermove', this._onBallMove)
    this._ball.on('pointerup', this._onBallUp)
    this._ball.on('pointerupoutside', this._onBallUp)
  },

  _ballMove(e) {
    if (!this._aiming) return
    const p = this._root.toLocal(e.global)
    const dx = p.x - this._down.x
    const dy = p.y - this._down.y
    // Siktpil pekar i den riktning bollen kommer rulla (= mot fingret).
    this._drawAim(this._ball.x, this._ball.y, this._ball.x + dx, this._ball.y + dy)
  },

  _ballUp(ctx, e) {
    if (!this._aiming) return
    this._aiming = false
    this._detachBall()
    this._hideAim()
    gsap.killTweensOf(this._ball.scale)
    gsap.to(this._ball.scale, { x: 1, y: 1, duration: 0.2 })
    const p = this._root.toLocal(e.global)
    const dx = p.x - this._down.x
    const dy = p.y - this._down.y
    this._idle = 0
    this._still = 0
    if (Math.hypot(dx, dy) < 14) {
      // Litet drag = tap -> markera/avmarkera (tap-tap-fallback).
      if (this._selected) this._deselect()
      else this._select(ctx)
      return
    }
    // Knuff: fart proportionell mot dragvektorn (clamp så bollen aldrig flyr banan).
    this._vx = clamp(dx * 0.18, -MAX_V, MAX_V)
    this._vy = clamp(dy * 0.18, -MAX_V, MAX_V)
    if (this._selected) this._deselect()
    ctx.services.audio.sfx('whoosh')
  },

  // Tap i banan: med markerad boll -> rulla mot punkten (eller rakt in i målet).
  // Utan markering -> alltid ett glatt litet svar, men bollen står kvar.
  _fieldTap(ctx, e) {
    if (!this._alive || this._resolving || this._gliding || this._aiming) return
    const p = this._root.toLocal(e.global)
    this._idle = 0
    if (!this._selected) {
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, p.x, p.y, { count: 5 })
      return
    }
    this._deselect()
    let tx = p.x
    let ty = p.y
    if (Math.hypot(p.x - this._goalPos.x, p.y - this._goalPos.y) < this._goalR) {
      tx = this._goalPos.x // tap direkt på målet -> rakt mot målet
      ty = this._goalPos.y
    }
    const dx = tx - this._ball.x
    const dy = ty - this._ball.y
    const len = Math.hypot(dx, dy) || 1
    const speed = clamp(len * 0.12, 12, 24)
    this._vx = (dx / len) * speed
    this._vy = (dy / len) * speed
    this._touched = true
    this._still = 0
    ctx.services.audio.sfx('whoosh')
  },

  _select(ctx) {
    this._selected = true
    ctx.services.audio.sfx('tap')
    this._selectTween?.kill()
    gsap.killTweensOf(this._ball.scale)
    this._ball.scale.set(1)
    this._selectTween = gsap.to(this._ball.scale, { x: 1.1, y: 1.1, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _deselect() {
    if (!this._selected && !this._selectTween) return
    this._selected = false
    this._selectTween?.kill()
    this._selectTween = null
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball.scale)
      gsap.to(this._ball.scale, { x: 1, y: 1, duration: 0.15 })
    }
  },

  _detachBall() {
    if (this._ball && !this._ball.destroyed) {
      this._ball.off('globalpointermove', this._onBallMove)
      this._ball.off('pointerup', this._onBallUp)
      this._ball.off('pointerupoutside', this._onBallUp)
    }
  },

  _drawAim(x0, y0, x1, y1) {
    const g = this._aimArrow
    g.clear()
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy)
    if (len < 6) {
      g.visible = false
      return
    }
    const ux = dx / len
    const uy = dy / len
    const maxLen = Math.min(len, 380)
    g.visible = true
    for (let d = BALL_R + 16; d < maxLen; d += 32) {
      const r = Math.max(4, 11 - 6 * (d / maxLen))
      g.circle(x0 + ux * d, y0 + uy * d, r).fill({ color: 0xffffff, alpha: 0.7 })
    }
  },

  _hideAim() {
    if (this._aimArrow && !this._aimArrow.destroyed) {
      this._aimArrow.clear()
      this._aimArrow.visible = false
    }
  },

  // ---- Fysik + hjälp + idle (ticker) --------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dtSec = ticker.deltaMS / 1000
    const dt = ticker.deltaMS / 16.67
    this._t += dtSec
    this._idle += dtSec

    if (this._resolving || this._gliding) return
    if (this._aiming) {
      this._idle = 0
      this._still = 0
      return
    }

    // Integrera + friktion.
    this._incoming = Math.hypot(this._vx, this._vy)
    this._ball.x += this._vx * dt
    this._ball.y += this._vy * dt
    const fr = Math.pow(FRICTION, dt)
    this._vx *= fr
    this._vy *= fr
    if (Math.abs(this._vx) < 0.02) this._vx = 0
    if (Math.abs(this._vy) < 0.02) this._vy = 0

    this._collideWalls(ctx)
    this._collideObstacles(ctx)

    // Rull-rotation proportionell mot horisontell fart.
    this._ballEmoji.rotation += (this._vx / BALL_R) * dt

    // Målträff? (en gång, _resolving skyddar mot dubbeltrigg)
    if (Math.hypot(this._ball.x - this._goalPos.x, this._ball.y - this._goalPos.y) < this._goalR) {
      this._reachGoal(ctx)
      return
    }

    // Still -> mjuk auto-hjälp (bollen kommer ALLTID hem).
    const speed = Math.hypot(this._vx, this._vy)
    if (this._touched && speed < STILL_SPEED) {
      this._still += dtSec
      if (this._still >= AUTO_HELP_DELAY) {
        this._still = 0
        this._helpStage++
        if (this._helpStage >= 2) {
          this._glideHome(ctx)
        } else {
          this._deselect()
          ctx.services.voice.say('Nästan! Jag hjälper till.')
          this._autoShove(ctx)
        }
      }
    } else {
      this._still = 0
    }

    if (this._gliding || this._resolving) return

    // Idle-recue (bara när bollen ligger stilla).
    if (this._idle >= IDLE_DELAY && speed < STILL_SPEED) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      if (!this._selected && !this._ball.destroyed) pop(this._ball)
    }
  },

  _collideWalls(ctx) {
    const R = BALL_R
    let hit = false
    if (this._ball.x < WALL.l + R) {
      this._ball.x = WALL.l + R
      this._vx = Math.abs(this._vx) * 0.7
      hit = true
    } else if (this._ball.x > WALL.r - R) {
      this._ball.x = WALL.r - R
      this._vx = -Math.abs(this._vx) * 0.7
      hit = true
    }
    if (this._ball.y < WALL.t + R) {
      this._ball.y = WALL.t + R
      this._vy = Math.abs(this._vy) * 0.7
      hit = true
    } else if (this._ball.y > WALL.b - R) {
      this._ball.y = WALL.b - R
      this._vy = -Math.abs(this._vy) * 0.7
      hit = true
    }
    if (hit && this._incoming > 2.5) this._bounceSfx(ctx, 'pop')
  },

  _collideObstacles(ctx) {
    const R = BALL_R
    for (const o of this._obstacles) {
      const hw = o.w / 2
      const hh = o.h / 2
      const nx = clamp(this._ball.x, o.x - hw, o.x + hw)
      const ny = clamp(this._ball.y, o.y - hh, o.y + hh)
      let dx = this._ball.x - nx
      let dy = this._ball.y - ny
      const d2 = dx * dx + dy * dy
      if (d2 >= R * R) continue
      let d = Math.sqrt(d2)
      if (d < 0.0001) {
        // Bollens mitt inne i klossen (sällsynt): knuffa ut längs minsta penetration.
        const m = Math.min(this._ball.x - (o.x - hw), o.x + hw - this._ball.x, this._ball.y - (o.y - hh), o.y + hh - this._ball.y)
        if (m === this._ball.x - (o.x - hw)) {
          dx = -1
          dy = 0
        } else if (m === o.x + hw - this._ball.x) {
          dx = 1
          dy = 0
        } else if (m === this._ball.y - (o.y - hh)) {
          dx = 0
          dy = -1
        } else {
          dx = 0
          dy = 1
        }
      } else {
        dx /= d
        dy /= d
      }
      // Knuffa ut ur klossen och spegla hastigheten ×0.6 (mjuk studs).
      this._ball.x = nx + dx * R
      this._ball.y = ny + dy * R
      const vn = this._vx * dx + this._vy * dy
      this._vx = (this._vx - 2 * vn * dx) * 0.6
      this._vy = (this._vy - 2 * vn * dy) * 0.6
      if (this._incoming > 2.5) this._bounceSfx(ctx, 'soft')
    }
  },

  _bounceSfx(ctx, name) {
    if (this._t - this._lastBounce > BOUNCE_THROTTLE) {
      ctx.services.audio.sfx(name)
      this._lastBounce = this._t
    }
  },

  // Mjuk auto-knuff mot målet (steg 1 av hjälpen).
  _autoShove(ctx) {
    const dx = this._goalPos.x - this._ball.x
    const dy = this._goalPos.y - this._ball.y
    const len = Math.hypot(dx, dy) || 1
    this._vx = (dx / len) * 14
    this._vy = (dy / len) * 14
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, this._ball.x, this._ball.y, { count: 6 })
  },

  // Glider hela vägen hem av sig själv (steg 2) — garanterad framgång, inget straff.
  _glideHome(ctx) {
    this._gliding = true
    this._vx = 0
    this._vy = 0
    this._deselect()
    this._hideAim()
    gsap.killTweensOf(this._ball)
    gsap.to(this._ball, {
      x: this._goalPos.x,
      y: this._goalPos.y,
      duration: 1.0,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (this._ballEmoji && !this._ballEmoji.destroyed) this._ballEmoji.rotation += 0.18
      },
      onComplete: () => {
        if (this._alive) this._reachGoal(ctx)
      },
    })
  },

  // ---- Mål nått: firande + ny bana ----------------------------------------

  _reachGoal(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._gliding = false
    this._vx = 0
    this._vy = 0
    this._still = 0
    this._idle = 0
    this._deselect()
    this._hideAim()
    this._detachBall()

    const g = this._goalPos
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Mål! Du klarade det!')

    // Bollen åker in i målet och krymper lite.
    gsap.killTweensOf(this._ball)
    gsap.killTweensOf(this._ball.scale)
    gsap.to(this._ball, { x: g.x, y: g.y, duration: 0.35, ease: 'power2.in' })
    gsap.to(this._ball.scale, { x: 0.55, y: 0.55, duration: 0.4, ease: 'power2.in' })

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    puff(ctx.fxLayer, g.x, g.y, { count: 14, color: C_GOAL })
    sparkle(ctx.fxLayer, g.x, g.y, { count: 8 })

    // Förlopp: höj nivå, räkna hemrullningar, kör delat firande (stjärna+klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._loadTimer = gsap.delayedCall(1.5, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._loadTimer?.kill()
    this._goalTween?.kill()
    this._selectTween?.kill()
    this._selectTween = null
    this._detachBall()
    if (this._bg && !this._bg.destroyed) this._bg.off('pointertap', this._onFieldTap)
    if (this._ball && !this._ball.destroyed) {
      this._ball.off('pointerdown', this._onBallDown)
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
    }
    if (this._goalGlow && !this._goalGlow.destroyed) gsap.killTweensOf(this._goalGlow.scale)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
