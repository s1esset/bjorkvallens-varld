// Enhörningens Glitterbajs — busig magisk fysik-lek (2–4 år). Elviras enhörning står
// till vänster och tittar hungrigt. Barnet DRAR glittermat (🍓 🧁 🍪) till enhörningens
// mun; den tuggar, PRUTTAR och bajsar ut ett regn av små guldglitter-pellets (riktiga
// matter.js-kroppar, materialet `bouncy`) bakåt-uppåt-höger. Pelletsen studsar på en
// lutande ramp och regnar ner — och barnet DRAR en skattburk i sidled för att fånga
// glittret (sensor-kollision). En glittermätare till höger fylls för varje fångad pellet.
//
// Två kontroller styr utfallet: HUR MYCKET du matar (mer mat = mer glitter) och VAR du
// ställer burken (positionering under regnet). INGET game-over: missade pellets studsar
// glatt, och pellets som blir liggande > 2 s glider mjukt av sig själva in i burken
// (auto-hjälp). På högre nivåer böjs regnet svagt mot burken så barnet alltid lyckas.
//
// Allt ritas programmatiskt (Pixi Graphics + emoji) — inga filer. Exit-säkert: pellets
// länkas till matter-kroppar och städas i destroy; transient grafik går via lib/feedback.js
// (redan exit-säker) eller {}-proxy-tweens som rör Pixi-objektet bara om det lever.
//
// Drag är fri-följande (mat till mun, burk i sidled) → egen pointerdown/globalpointermove/
// pointerup-logik med tap-tap-fallback (DragController stödjer bara snäpp-hem/snäpp-mål).
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body, nudge, applyForce } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { bigCelebration, burst, puff, sparkle, floatText, pop, wiggle } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// ---- Geometri & konstanter (designkoordinater 1280×720) -----------------
const UNICORN = { x: 320, y: 300 }
const MOUTH = { x: 210, y: 250 } // världspunkt: hit-zon för matning (radie 120)
const BUTT = { x: 430, y: 285 } // världspunkt: glitter spawnas här
const MOUTH_HIT = 120

const CHEST_START = 820
const CHEST_Y = 600
const CHEST_MIN = 540
const CHEST_MAX = 1150
const SENSOR_DY = -50 // sensorns y-offset från burkens mitt (öppningen)

const PELLET_R = 11
const MAX_PELLETS = 48 // tak på samtidiga pellets (prestanda)
const MAX_FALL = 11 // px/steg-tak på fallfart (fångbart + ingen tunneling genom sensorn)
const REST_LIMIT = 2.0 // s nästan stilla -> auto-glid in i burken
const AGE_LIMIT = 10 // s livslängd -> auto-glid (garanterad framgång)
const CATCH_SFX_MS = 90 // throttla fångst-ljud
const BOUNCE_SFX_MS = 150 // throttla studs-ljud
const IDLE_DELAY = 6

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Nivå -> glittermängd, mål, rampvinkel, böjning, studs-knubbar.
function levelConfig(level) {
  const L = Math.max(0, level | 0)
  const goal = Math.min(8 + L * 4, 24)
  const batch = Math.min(6 + L, 14)
  let angle, bend, bumps
  if (L <= 1) {
    angle = -0.04
    bend = 0
    bumps = 0
  } else if (L <= 3) {
    angle = -0.08
    bend = 0.0002
    bumps = 0
  } else {
    angle = -0.1
    bend = 0.0004
    bumps = 2
  }
  angle += Math.random() * 0.04 - 0.02 // lekfull jitter
  return { goal, batch, angle, bend, bumps }
}

export default {
  id: 'enhorning-glitterbajs',
  titleSv: 'Enhörningens Glitterbajs',
  icon: '🦄',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'enhorning-glitterbajs',
  voiceIntro: 'Mata enhörningen så bajsar den glitter! Fånga glittret i burken!',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._idle = 0
    this._resolving = false
    this._caught = 0
    this._goal = 8
    this._batch = 6
    this._bend = 0
    this._meterFrac = 0
    this._lastCatchSfx = 0
    this._lastBounceSfx = 0
    this._pellets = [] // { body, view, restT, age, caught }
    this._foods = [] // { view, slotX, slotY, _onDown }
    this._bumps = [] // { body, view }
    this._timers = [] // gsap delayedCalls
    this._proxyTweens = [] // transienta tuck-tweens
    this._selectedFood = null
    this._dragFood = null
    this._dragChest = false
    this._rampBody = null

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn): rosa/lila godishimmel med bokeh + markremsa.
    this._root.addChild(createScene('candy', { width: ctx.width, height: ctx.height, ground: true, groundH: 120 }))

    // Fysik: lugn gravitation så regnet faller fångbart; sidoväggar + golv.
    this._phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
    this._unbindCollision = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildMeter()
    this._buildRamp()
    this._buildBumps()
    this._buildUnicorn(ctx)
    this._buildElvira()
    this._buildTray(ctx)
    this._buildBand(ctx)
    this._buildChest(ctx)

    // Pelletslager överst så glittret syns falla framför burken.
    this._pelletLayer = new Container()
    this._pelletLayer.eventMode = 'none'
    this._pelletLayer.interactiveChildren = false
    this._root.addChild(this._pelletLayer)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    this._loadLevel(ctx, this._level)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen (en gång) ----------------------------------------------

  _buildMeter() {
    const layer = new Container()
    layer.eventMode = 'none'
    layer.interactiveChildren = false
    // Tub.
    const tube = new Graphics()
    tube.roundRect(1180, 140, 40, 440, 20).fill({ color: COLORS.white, alpha: 0.5 }).stroke({ width: 5, color: COLORS.purple })
    layer.addChild(tube)
    // Stigande guldfyllning.
    this._meterFill = new Graphics()
    this._meterFill.eventMode = 'none'
    layer.addChild(this._meterFill)
    // Stjärna ovanpå.
    const star = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 48 } })
    star.anchor.set(0.5)
    star.position.set(1200, 116)
    star.eventMode = 'none'
    layer.addChild(star)
    this._meterLayer = layer
    this._root.addChild(layer)
  },

  _buildRamp() {
    // Mjukt lutande studsplatta (visuell). Origo i mitten -> roterar snyggt.
    const view = new Container()
    view.position.set(730, 483)
    view.eventMode = 'none'
    const g = new Graphics()
    g.roundRect(-260, -13, 520, 26, 14).fill(COLORS.purple).stroke({ width: 4, color: 0x8b6ff0 })
    g.roundRect(-260, -13, 520, 8, 14).fill({ color: COLORS.white, alpha: 0.25 })
    view.addChild(g)
    this._rampView = view
    this._root.addChild(view)
  },

  _buildBumps() {
    this._bumpLayer = new Container()
    this._bumpLayer.eventMode = 'none'
    this._bumpLayer.interactiveChildren = false
    this._root.addChild(this._bumpLayer)
  },

  _buildUnicorn(ctx) {
    const u = makeUnicorn()
    u.position.set(UNICORN.x, UNICORN.y)
    u.eventMode = 'static'
    u.cursor = 'pointer'
    u.hitArea = new Circle(0, 0, MOUTH_HIT) // tryck-på-enhörningen => mata vald mat
    this._unicornTapH = () => this._unicornTap(ctx)
    u.on('pointertap', this._unicornTapH)
    this._unicorn = u
    this._root.addChild(u)

    // Mjuk idle-gupp (rör y, inte scale -> krockar ej med pop()).
    this._unicornBob = gsap.to(u, { y: UNICORN.y - 6, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildElvira() {
    const e = makeElvira()
    e.position.set(165, 470)
    e.eventMode = 'none'
    e.interactiveChildren = false
    this._elvira = e
    this._root.addChild(e)
  },

  _buildTray(ctx) {
    // Matbricka-panel nere till vänster.
    const panel = new Graphics()
    panel.roundRect(60, 560, 360, 130, 28).fill(COLORS.cream).stroke({ width: 6, color: COLORS.pink })
    panel.eventMode = 'none'
    this._root.addChild(panel)

    this._foodLayer = new Container()
    this._root.addChild(this._foodLayer)

    this._onFoodMove = (ev) => this._foodMove(ev)
    this._onFoodUp = (ev) => this._foodUp(ev)

    const emojis = ['🍓', '🧁', '🍪']
    const slots = [130, 240, 350]
    for (let i = 0; i < emojis.length; i++) {
      const view = makeFood(emojis[i])
      view.position.set(slots[i], 624)
      const food = { view, slotX: slots[i], slotY: 624 }
      const onDown = (ev) => this._foodDown(ctx, food, ev)
      food._onDown = onDown
      view.on('pointerdown', onDown)
      this._foodLayer.addChild(view)
      this._foods.push(food)
    }
  },

  // Osynlig botten-remsa: tap glider burken dit (tap-tap-fallback).
  _buildBand(ctx) {
    const band = new Graphics().rect(480, 538, 720, 152).fill({ color: 0x000000, alpha: 0 })
    band.eventMode = 'static'
    this._bandTapH = (ev) => this._bandTap(ctx, ev)
    band.on('pointertap', this._bandTapH)
    this._band = band
    this._root.addChild(band)
  },

  _buildChest(ctx) {
    const chest = makeChest()
    chest.position.set(CHEST_START, CHEST_Y)
    chest.eventMode = 'static'
    chest.cursor = 'pointer'
    chest.hitArea = new Rectangle(-110, -90, 220, 180) // rejäl drag-halo
    this._chestDownH = (ev) => this._chestDown(ctx, ev)
    this._onChestMove = (ev) => this._chestMove(ev)
    this._onChestUp = () => this._chestUp(ctx)
    chest.on('pointerdown', this._chestDownH)
    this._chest = chest
    this._root.addChild(chest)

    // Sensor-kropp i burkens öppning.
    this._sensor = this._phys.rectangle(CHEST_START, CHEST_Y + SENSOR_DY, 160, 40, {
      isStatic: true,
      isSensor: true,
      label: 'burk',
    })
  },

  // ---- Nivå ---------------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._level = level
    const cfg = levelConfig(level)
    this._goal = cfg.goal
    this._batch = cfg.batch
    this._bend = cfg.bend
    this._caught = 0
    this._resolving = false
    this._idle = 0
    this._selectedFood = null

    this._clearPellets()
    this._setRamp(cfg.angle, cfg.bumps)

    // Burk till start.
    if (this._chest && !this._chest.destroyed) {
      this._chestGlide?.kill()
      gsap.killTweensOf(this._chest)
      this._chest.x = CHEST_START
      this._chest.scale.set(1)
    }

    // Mat hem.
    for (const f of this._foods) this._refillFood(f)

    this._meterFrac = 0
    this._paintMeter()
  },

  _setRamp(angle, bumpCount) {
    if (this._rampBody) this._phys.removeBody(this._rampBody)
    this._rampBody = this._phys.rectangle(730, 483, 520, 26, {
      isStatic: true,
      angle,
      restitution: 0.5,
      friction: 0.25, // pellets glider av rampen mot fångstzonen
      label: 'ramp',
    })
    if (this._rampView && !this._rampView.destroyed) this._rampView.rotation = angle

    // Rensa gamla knubbar.
    for (const b of this._bumps) {
      if (b.body) this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) b.view.destroy()
    }
    this._bumps = []
    if (bumpCount > 0) {
      const defs = [
        { x: 640 + (Math.random() * 80 - 40), y: 545 },
        { x: 880 + (Math.random() * 80 - 40), y: 560 },
      ]
      for (const d of defs) {
        const body = this._phys.circle(d.x, d.y, 22, { isStatic: true, restitution: 0.6, friction: 0.2, label: 'bump' })
        const view = new Graphics().circle(0, 0, 22).fill(COLORS.purple).stroke({ width: 3, color: COLORS.white })
        view.position.set(d.x, d.y)
        view.eventMode = 'none'
        this._bumpLayer.addChild(view)
        this._bumps.push({ body, view })
      }
    }
  },

  // ---- Mata (drag mat -> mun) ---------------------------------------------

  _foodDown(ctx, food, e) {
    if (!this._alive || this._resolving || this._dragFood) return
    this._idle = 0
    this._dragFood = food
    this._foodMoved = false
    const p = this._root.toLocal(e.global)
    this._foodStart = { x: p.x, y: p.y }
    this._foodGrab = { dx: food.view.x - p.x, dy: food.view.y - p.y }
    gsap.killTweensOf(food.view.scale)
    gsap.to(food.view.scale, { x: 1.12, y: 1.12, duration: 0.1 })
    this._foodLayer.setChildIndex(food.view, this._foodLayer.children.length - 1)
    ctx.services.audio.sfx('tap')
    food.view.on('globalpointermove', this._onFoodMove)
    food.view.on('pointerup', this._onFoodUp)
    food.view.on('pointerupoutside', this._onFoodUp)
  },

  _foodMove(e) {
    const food = this._dragFood
    if (!food || !this._alive) return
    const p = this._root.toLocal(e.global)
    if (!this._foodMoved && Math.hypot(p.x - this._foodStart.x, p.y - this._foodStart.y) > 12) this._foodMoved = true
    if (this._foodMoved) {
      food.view.x = p.x + this._foodGrab.dx
      food.view.y = p.y + this._foodGrab.dy
      this._idle = 0
    }
  },

  _foodUp() {
    const food = this._dragFood
    if (!food) return
    this._dragFood = null
    food.view.off('globalpointermove', this._onFoodMove)
    food.view.off('pointerup', this._onFoodUp)
    food.view.off('pointerupoutside', this._onFoodUp)
    if (!this._foodMoved) {
      this._selectFood(food)
      return
    }
    const d = Math.hypot(food.view.x - MOUTH.x, food.view.y - MOUTH.y)
    if (d < MOUTH_HIT && !this._resolving) {
      this._feed(this._ctx, food)
    } else {
      this._snapFoodHome(food)
    }
  },

  // Tap på mat = markera den; nästa tap på enhörningen matar den (tap-tap-fallback).
  _selectFood(food) {
    if (this._selectedFood && this._selectedFood !== food) {
      gsap.killTweensOf(this._selectedFood.view.scale)
      this._selectedFood.view.scale.set(1)
    }
    this._selectedFood = food
    this._ctx.services.audio.sfx('tap')
    pop(food.view)
  },

  _snapFoodHome(food) {
    const v = food.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v, { x: food.slotX, y: food.slotY, duration: 0.28, ease: 'back.out(1.8)' })
    gsap.to(v.scale, { x: 1, y: 1, duration: 0.22 })
    wiggle(v)
    this._ctx.services.audio.sfx('soft')
  },

  _unicornTap(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    if (this._selectedFood) {
      const food = this._selectedFood
      this._selectedFood = null
      this._feed(ctx, food)
    } else if (this._unicorn && !this._unicorn.destroyed) {
      pop(this._unicorn, { scale: 1.08 })
      ctx.services.audio.sfx('soft')
    }
  },

  _feed(ctx, food) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._selectedFood = null
    if (this._unicorn && !this._unicorn.destroyed) pop(this._unicorn, { scale: 1.12 })
    ctx.services.audio.sfx('soft')
    this._eatFood(food)
    const tw = gsap.delayedCall(0.6, () => {
      if (this._alive && !this._resolving) this._fart(ctx)
    })
    this._timers.push(tw)
  },

  // Mat krymper in i munnen (exit-säker {}-proxy), sedan fylls slotten på igen.
  _eatFood(food) {
    const v = food.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { x: v.x, y: v.y, s: v.scale.x || 1, a: 1 }
    const tw = gsap.to(st, {
      x: MOUTH.x,
      y: MOUTH.y,
      s: 0.1,
      a: 0,
      duration: 0.32,
      ease: 'power2.in',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.x = st.x
        v.y = st.y
        v.alpha = st.a
        v.scale.set(st.s)
      },
      onComplete: () => {
        if (this._alive && !v.destroyed) this._refillFood(food)
      },
    })
  },

  _refillFood(food) {
    const v = food.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    v.position.set(food.slotX, food.slotY)
    v.scale.set(1)
    v.alpha = 1
    v.visible = true
  },

  // ---- Prutt: spruta ut glitterregnet -------------------------------------

  _fart(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    ctx.services.audio.sfx('whoosh')
    floatText(ctx.fxLayer, BUTT.x + 30, BUTT.y, '💨', { fontSize: 56 })
    if (this._elvira && !this._elvira.destroyed) pop(this._elvira, { scale: 1.16 })
    sparkle(ctx.fxLayer, BUTT.x, BUTT.y, { count: 6 })

    let n = this._batch
    if (this._pellets.length + n > MAX_PELLETS) n = Math.max(0, MAX_PELLETS - this._pellets.length)
    for (let i = 0; i < n; i++) this._spawnPellet()
    if (n > 0) ctx.services.audio.sfx('pling')
    if (Math.random() < 0.5) ctx.services.voice.say('Pruttbajs! Massa glitter!')
  },

  _spawnPellet() {
    const view = makePelletView()
    view.position.set(BUTT.x, BUTT.y)
    this._pelletLayer.addChild(view)
    const body = this._phys.circle(BUTT.x, BUTT.y, PELLET_R, { ...MATERIALS.bouncy, label: 'pellet' })
    // Utåt-uppåt-höger med spridning -> en glittrig båge bakåt från rumpan.
    nudge(body, 3 + Math.random() * 4, -(2 + Math.random() * 4))
    this._phys.link(body, view)
    this._pellets.push({ body, view, restT: 0, age: 0, caught: false })
  },

  // ---- Kollision: fångst (sensor) + lekfull studs -------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      let pelletBody = null
      if (a.label === 'pellet' && b.label === 'burk') pelletBody = a
      else if (b.label === 'pellet' && a.label === 'burk') pelletBody = b
      if (pelletBody) {
        const pellet = this._pelletByBody(pelletBody)
        if (pellet && !pellet.caught) this._catch(ctx, pellet)
        continue
      }
      // Lekfull studs mot ramp/knubb/vägg -> mjukt ljud (throttlat).
      if (a.label === 'pellet' || b.label === 'pellet') {
        const other = a.label === 'pellet' ? b : a
        if (other.label === 'ramp' || other.label === 'bump' || other.label === 'wall') {
          const now = performance.now()
          if (now - this._lastBounceSfx > BOUNCE_SFX_MS) {
            this._lastBounceSfx = now
            ctx.services.audio.sfx('soft')
          }
        }
      }
    }
  },

  _pelletByBody(body) {
    for (const p of this._pellets) if (p.body === body) return p
    return null
  },

  // ---- Fångad pellet: plopp in i burken, höj mätaren ----------------------

  _catch(ctx, pellet, auto = false) {
    if (!pellet || pellet.caught) return
    pellet.caught = true
    const i = this._pellets.indexOf(pellet)
    if (i >= 0) this._pellets.splice(i, 1)
    if (pellet.body) this._phys.removeBody(pellet.body)

    this._idle = 0
    this._tuckPellet(pellet, auto ? 0.5 : 0.3)

    const now = performance.now()
    if (now - this._lastCatchSfx > CATCH_SFX_MS) {
      this._lastCatchSfx = now
      ctx.services.audio.sfx('pop')
    }
    const cx = this._chest && !this._chest.destroyed ? this._chest.x : CHEST_START
    puff(ctx.fxLayer, cx, CHEST_Y - 40, { count: 4, color: COLORS.yellow })
    if (this._chest && !this._chest.destroyed) pop(this._chest, { scale: 1.05 })

    if (!this._resolving) {
      this._caught++
      this._drawMeter(true)
      if (this._caught >= this._goal) this._onComplete(ctx)
    }
  },

  // Glittret glider in i burkens öppning (exit-säker {}-proxy-tween).
  _tuckPellet(pellet, dur) {
    const v = pellet.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const cx = this._chest && !this._chest.destroyed ? this._chest.x : CHEST_START
    const st = { x: v.x, y: v.y, s: v.scale.x || 1, a: 1 }
    const tw = gsap.to(st, {
      x: cx,
      y: CHEST_Y - 10,
      s: 0.2,
      a: 0,
      duration: dur,
      ease: 'power2.in',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.x = st.x
        v.y = st.y
        v.alpha = st.a
        v.scale.set(st.s)
      },
      onComplete: () => {
        const idx = this._proxyTweens.indexOf(tw)
        if (idx >= 0) this._proxyTweens.splice(idx, 1)
        if (!v.destroyed) v.destroy()
      },
    })
    this._proxyTweens.push(tw)
  },

  // ---- Burk-drag (fri-följande) -------------------------------------------

  _chestDown(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    this._dragChest = true
    this._chestMoved = false
    this._chestStart = { x: p.x, y: p.y }
    this._chestGrab = this._chest.x - p.x
    this._chestGlide?.kill()
    this._chest.on('globalpointermove', this._onChestMove)
    this._chest.on('pointerup', this._onChestUp)
    this._chest.on('pointerupoutside', this._onChestUp)
  },

  _chestMove(e) {
    if (!this._dragChest || !this._alive) return
    const p = this._root.toLocal(e.global)
    if (!this._chestMoved && Math.abs(p.x - this._chestStart.x) > 10) this._chestMoved = true
    if (this._chestMoved) {
      this._chest.x = clamp(p.x + this._chestGrab, CHEST_MIN, CHEST_MAX)
      this._idle = 0
    }
  },

  _chestUp(ctx) {
    if (!this._dragChest) return
    this._dragChest = false
    this._chest.off('globalpointermove', this._onChestMove)
    this._chest.off('pointerup', this._onChestUp)
    this._chest.off('pointerupoutside', this._onChestUp)
    if (!this._chestMoved && this._chest && !this._chest.destroyed) {
      pop(this._chest, { scale: 1.06 })
      ctx.services.audio.sfx('tap')
    }
  },

  // Tap på botten-remsan -> burken glider dit (för barn som inte kan dra).
  _bandTap(ctx, e) {
    if (!this._alive || this._resolving || this._dragChest) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    const tx = clamp(p.x, CHEST_MIN, CHEST_MAX)
    this._chestGlide?.kill()
    const st = { x: this._chest.x }
    this._chestGlide = gsap.to(st, {
      x: tx,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (this._chest && !this._chest.destroyed) this._chest.x = st.x
      },
    })
    ctx.services.audio.sfx('tap')
  },

  // ---- Ticker: fysik, böjning, auto-hjälp, idle ---------------------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    const dt = Math.min(0.05, (t.deltaMS || 16.67) / 1000)
    const cx = this._chest && !this._chest.destroyed ? this._chest.x : CHEST_START

    // Synka sensorn med burken.
    if (this._sensor) Body.setPosition(this._sensor, { x: cx, y: CHEST_Y + SENSOR_DY })

    for (let i = this._pellets.length - 1; i >= 0; i--) {
      const p = this._pellets[i]
      if (!p.body || p.caught) continue
      const pos = p.body.position
      p.age += dt

      // Fartgräns nedåt (fångbart + ingen tunneling genom sensorn).
      if (p.body.velocity.y > MAX_FALL) Body.setVelocity(p.body, { x: p.body.velocity.x, y: MAX_FALL })

      // Nivåberoende böjning: mjuk horisontell kraft mot burken på väg ner.
      if (this._bend > 0 && pos.y > 300) {
        applyForce(p.body, p.body.mass * this._bend * Math.sign(cx - pos.x), 0)
      }

      // Auto-hjälp: nästan stilla > 2 s, eller för gammal -> glid in i burken.
      const sp = Math.hypot(p.body.velocity.x, p.body.velocity.y)
      if (sp < 0.6) p.restT += dt
      else p.restT = 0
      if (p.restT > REST_LIMIT || p.age > AGE_LIMIT) {
        this._catch(ctx, p, true)
      }
    }

    // Idle-recue: ingen interaktion ~6 s.
    if (!this._resolving) {
      this._idle += dt
      if (this._idle > IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        const f = this._foods[0]
        if (f && f.view && !f.view.destroyed && !this._dragFood) pop(f.view)
      }
    }
  },

  // ---- Mätare -------------------------------------------------------------

  _drawMeter(animate) {
    const frac = clamp(this._goal > 0 ? this._caught / this._goal : 0, 0, 1)
    if (animate) {
      this._meterTween?.kill()
      const st = { v: this._meterFrac }
      this._meterTween = gsap.to(st, {
        v: frac,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: () => {
          this._meterFrac = st.v
          this._paintMeter()
        },
      })
      if (this._meterLayer && !this._meterLayer.destroyed) pop(this._meterLayer, { scale: 1.04 })
    } else {
      this._meterFrac = frac
      this._paintMeter()
    }
  },

  _paintMeter() {
    const g = this._meterFill
    if (!g || g.destroyed) return
    g.clear()
    const x = 1184
    const w = 32
    const top = 146
    const bottom = 576
    const h = (bottom - top) * clamp(this._meterFrac, 0, 1)
    if (h > 3) {
      g.roundRect(x, bottom - h, w, h, 14).fill(COLORS.yellow)
      g.roundRect(x, bottom - h, w, Math.min(10, h), 14).fill({ color: COLORS.white, alpha: 0.35 })
    }
  },

  // ---- Klart: firande + nästa nivå ----------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._selectedFood = null
    this._dragFood = null

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    const cx = this._chest && !this._chest.destroyed ? this._chest.x : CHEST_START
    burst(ctx.fxLayer, cx, CHEST_Y - 40, { count: 18, colors: [COLORS.yellow, COLORS.orange, COLORS.pink] })
    sparkle(ctx.fxLayer, cx, CHEST_Y - 40, { count: 10 })
    if (this._chest && !this._chest.destroyed) pop(this._chest, { scale: 1.2 })
    if (this._elvira && !this._elvira.destroyed) pop(this._elvira, { scale: 1.2 })

    this._meterFrac = 1
    this._paintMeter()

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.complete()
    ctx.progress.setCustom('glitterrundor', (ctx.progress.get().custom?.glitterrundor || 0) + 1)

    const tw = gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      ctx.services.voice.say('Mer glitter!')
      this._loadLevel(ctx, ++this._level)
    })
    this._timers.push(tw)
  },

  // ---- Städning -----------------------------------------------------------

  _clearPellets() {
    for (const p of this._pellets) {
      if (p.body) this._phys.removeBody(p.body)
      const v = p.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    this._pellets = []
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbindCollision?.()

    this._timers.forEach((t) => t?.kill())
    this._timers = []
    this._proxyTweens.forEach((t) => t?.kill())
    this._proxyTweens = []
    this._meterTween?.kill()
    this._chestGlide?.kill()
    this._unicornBob?.kill()

    // Pekar-lyssnare.
    for (const f of this._foods) {
      const v = f.view
      if (v && !v.destroyed) {
        v.off('pointerdown', f._onDown)
        v.off('globalpointermove', this._onFoodMove)
        v.off('pointerup', this._onFoodUp)
        v.off('pointerupoutside', this._onFoodUp)
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    }
    if (this._unicorn && !this._unicorn.destroyed) {
      this._unicorn.off('pointertap', this._unicornTapH)
      gsap.killTweensOf(this._unicorn)
      gsap.killTweensOf(this._unicorn.scale)
    }
    if (this._chest && !this._chest.destroyed) {
      this._chest.off('pointerdown', this._chestDownH)
      this._chest.off('globalpointermove', this._onChestMove)
      this._chest.off('pointerup', this._onChestUp)
      this._chest.off('pointerupoutside', this._onChestUp)
      gsap.killTweensOf(this._chest)
      gsap.killTweensOf(this._chest.scale)
    }
    if (this._band && !this._band.destroyed) this._band.off('pointertap', this._bandTapH)

    // Pellets + transient.
    this._pellets.forEach((p) => {
      const v = p.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    })
    this._pellets = []
    if (this._elvira && !this._elvira.destroyed) {
      gsap.killTweensOf(this._elvira)
      gsap.killTweensOf(this._elvira.scale)
    }
    if (this._meterLayer && !this._meterLayer.destroyed) gsap.killTweensOf(this._meterLayer.scale)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ===== Programmatisk konst ===============================================

// Söt enhörning, ankrad i mitten (0,0), vänd åt VÄNSTER (mun till vänster, rumpa till höger).
function makeUnicorn() {
  const c = new Container()
  const white = 0xfff7fb
  const edge = 0xffd6ea

  // Mjuk markskugga.
  c.addChild(new Graphics().ellipse(0, 92, 120, 24).fill({ color: COLORS.shadow, alpha: 0.12 }))

  // Svans (regnbåge) bakom kroppen, åt höger (vid rumpan).
  const tail = new Graphics()
  for (let i = 0; i < PLAYFUL.length; i++) {
    tail.roundRect(96 + (i % 2) * 6, -30 + i * 9, 30, 9, 5).fill(PLAYFUL[i])
  }
  tail.rotation = -0.15
  c.addChild(tail)

  // Ben + hovar.
  const legs = new Graphics()
  for (const lx of [-58, -28, 28, 58]) {
    legs.roundRect(lx - 8, 48, 16, 46, 7).fill(white)
    legs.roundRect(lx - 9, 86, 18, 12, 5).fill(0xf3d9ea)
  }
  c.addChild(legs)

  // Kropp (vit glansig ellips).
  const body = new Graphics().ellipse(0, 18, 116, 70).fill(white).stroke({ width: 3, color: edge })
  body.ellipse(-26, -6, 64, 26).fill({ color: COLORS.white, alpha: 0.5 }) // glans
  c.addChild(body)

  // Huvud (fram-vänster).
  const head = new Graphics().circle(-94, -22, 52).fill(white).stroke({ width: 3, color: edge })
  c.addChild(head)

  // Öra.
  const ear = new Graphics().poly([-78, -64, -64, -58, -76, -46]).fill(white).stroke({ width: 2, color: edge })
  c.addChild(ear)

  // Gyllene horn ovanför pannan.
  const horn = new Graphics()
    .poly([-100, -112, -114, -66, -86, -66])
    .fill(COLORS.yellow)
    .stroke({ width: 2, color: COLORS.orange })
  horn.moveTo(-108, -74).lineTo(-92, -78)
  horn.moveTo(-106, -84).lineTo(-93, -88)
  horn.moveTo(-104, -94).lineTo(-95, -98)
  horn.stroke({ width: 2, color: COLORS.orange })
  c.addChild(horn)

  // Regnbågsman från hornbasen ner längs nacken.
  const mane = new Graphics()
  const manePts = [
    [-72, -58],
    [-58, -48],
    [-48, -34],
    [-42, -18],
    [-44, 0],
  ]
  for (let i = 0; i < manePts.length; i++) {
    mane.circle(manePts[i][0], manePts[i][1], 12).fill(PLAYFUL[i % PLAYFUL.length])
  }
  c.addChild(mane)

  // Stort vänligt öga.
  const eye = new Graphics()
  eye.ellipse(-104, -26, 8, 10).fill(0x3a2b3f)
  eye.circle(-101, -29, 2.8).fill(COLORS.white)
  eye.circle(-107, -23, 1.8).fill({ color: COLORS.white, alpha: 0.8 })
  c.addChild(eye)

  // Kind.
  c.addChild(new Graphics().circle(-116, -10, 7).fill({ color: 0xffb3d1, alpha: 0.7 }))

  // Mun (liten rosa båge / muns).
  const mouth = new Graphics().ellipse(-122, -8, 13, 9).fill(0xffd0e4)
  mouth.arc(-122, -10, 9, 0.1 * Math.PI, 0.9 * Math.PI).stroke({ width: 3, color: 0xe79bc0, cap: 'round' })
  c.addChild(mouth)

  // Barnen rör hela enhörningen -> stäng av interaktion på barnen.
  c.children.forEach((ch) => (ch.eventMode = 'none'))
  return c
}

// Liten programmatisk Elvira (avbildad människa — godkänt namn). Origo mitten; fötter nedåt.
function makeElvira() {
  const c = new Container()
  const skin = 0xffe0bd
  const dress = COLORS.pink
  const dressDark = 0xe87da8
  const hair = 0x7a4a25

  // Tofsar bakom huvudet.
  c.addChild(new Graphics().circle(-30, -42, 12).fill(hair).circle(30, -42, 12).fill(hair))

  // Ben + skor.
  const legs = new Graphics()
    .roundRect(-18, 34, 13, 32, 6)
    .fill(0xefb9d2)
    .roundRect(5, 34, 13, 32, 6)
    .fill(0xefb9d2)
    .roundRect(-21, 60, 19, 12, 6)
    .fill(0x6a4a8a)
    .roundRect(3, 60, 19, 12, 6)
    .fill(0x6a4a8a)
  c.addChild(legs)

  // Klänning.
  const bodyG = new Graphics()
  bodyG.moveTo(-22, -16).lineTo(22, -16).lineTo(36, 42).lineTo(-36, 42).closePath().fill(dress).stroke({ width: 3, color: dressDark })
  c.addChild(bodyG)

  // Armar + händer.
  const arms = new Graphics()
    .roundRect(-34, -10, 14, 36, 7)
    .fill(dress)
    .roundRect(20, -10, 14, 36, 7)
    .fill(dress)
    .circle(-27, 28, 7)
    .fill(skin)
    .circle(27, 28, 7)
    .fill(skin)
  c.addChild(arms)

  // Huvud + ansikte.
  const head = new Graphics().circle(0, -42, 26).fill(skin)
  head.circle(-9, -44, 3.2).fill(0x3a2a1a)
  head.circle(9, -44, 3.2).fill(0x3a2a1a)
  head.circle(-15, -36, 5).fill({ color: 0xffb0b0, alpha: 0.7 })
  head.circle(15, -36, 5).fill({ color: 0xffb0b0, alpha: 0.7 })
  c.addChild(head)
  c.addChild(new Graphics().arc(0, -38, 10, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 3, color: 0x9a5b3b, cap: 'round' }))

  // Lugg + rosett (hårtofs).
  c.addChild(new Graphics().roundRect(-26, -66, 52, 18, 10).fill(hair))
  c.addChild(
    new Graphics()
      .circle(-9, -70, 9)
      .fill(COLORS.red)
      .circle(9, -70, 9)
      .fill(COLORS.red)
      .circle(0, -70, 5)
      .fill(0xd64a4a)
  )

  return c
}

// Glansig skattkista. Origo = mitten; öppningen upptill (vid y ≈ -58, sensor vid y-50).
function makeChest() {
  const c = new Container()
  const brown = COLORS.brown
  const ink = COLORS.ink

  // Markskugga.
  c.addChild(new Graphics().ellipse(0, 62, 96, 16).fill({ color: COLORS.shadow, alpha: 0.14 }))

  // Kropp.
  const body = new Graphics().roundRect(-90, -60, 180, 120, 18).fill(brown).stroke({ width: 6, color: ink })
  // Träplankor.
  body.moveTo(-30, -52).lineTo(-30, 54)
  body.moveTo(30, -52).lineTo(30, 54)
  body.stroke({ width: 3, color: 0x6e4527, alpha: 0.5 })
  c.addChild(body)

  // Gult lock-band tvärs över + lås.
  const band = new Graphics()
    .roundRect(-90, -6, 180, 24, 6)
    .fill(COLORS.yellow)
    .stroke({ width: 3, color: COLORS.orange })
    .roundRect(-16, 0, 32, 26, 6)
    .fill(COLORS.yellow)
    .stroke({ width: 3, color: COLORS.orange })
  band.circle(0, 12, 5).fill(ink)
  c.addChild(band)

  // Öppning (mörk ellips) + gul glödkant runt fångstzonen.
  const open = new Graphics().ellipse(0, -58, 78, 20).fill(0x2a1a10)
  open.ellipse(0, -58, 82, 24).stroke({ width: 5, color: COLORS.yellow })
  open.ellipse(0, -58, 82, 24).stroke({ width: 2, color: 0xfff3b0, alpha: 0.7 })
  c.addChild(open)

  c.children.forEach((ch) => (ch.eventMode = 'none'))
  return c
}

// Liten glansig guld-glitterpellet (+ ibland en ✨).
function makePelletView() {
  const c = new Container()
  const g = new Graphics().circle(0, 0, PELLET_R).fill(COLORS.yellow).stroke({ width: 2, color: COLORS.orange })
  g.circle(-3, -3, 3).fill({ color: COLORS.white, alpha: 0.85 })
  c.addChild(g)
  if (Math.random() < 0.3) {
    const s = new Text({ text: '✨', style: { fontFamily: FONT.body, fontSize: 16 } })
    s.anchor.set(0.5)
    s.eventMode = 'none'
    c.addChild(s)
  }
  c.eventMode = 'none'
  return c
}

// Mat-emoji i en träffvänlig Container (osynlig hit-halo Circle r=64 -> ≥96px träffyta).
function makeFood(emoji) {
  const c = new Container()
  const t = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 76 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(t)
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.hitArea = new Circle(0, 0, 64)
  return c
}
