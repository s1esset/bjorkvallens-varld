// Plask i Vattnet — utforskande fysiklek (3–5 år). Barnet drar (eller tap-tap:ar)
// föremål från hyllan upptill ner i en stor glasvattentank: PLASK! — saken visar
// sin fysik, den FLYTER (guppar vid ytan) eller SJUNKER (glider mjukt till botten).
// Inget är fel: tanken tar emot ALLT, släpp utanför snäpper mjukt hem. När alla 6
// föremål hamnat i vattnet firar vi (delat firande + stjärna + klistermärke) och en
// ny hylla dyker upp — oändlig lek, ingen timer, ingen poäng. Att trycka på själva
// vattnet ger också ett litet glatt plask. Allt ritas programmatiskt (Pixi Graphics
// + system-emoji); inga externa filer.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { puff, sparkle, bounceIn, wiggle, pop } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Tank/vatten i designkoordinater (se spec).
const TANK = { x: 390, y: 250, w: 500, h: 440, r: 28 } // glasbehållare (390..890, 250..690)
const WATER = { x: 398, y: 330, w: 484, h: 352, r: 18 } // vattenkropp (398..882, 330..682)
const SURFACE_Y = 330 // vattenytan
const FLOAT_Y = 362 // viloläge för flytande saker (strax under ytan)
const TANK_CX = 640 // tankens mitt (drag-target + nedslagspunkt)
const TANK_CY = 470
const SHELF_Y = 150 // hyllraden upptill
const SHELF_X = [190, 326, 462, 818, 954, 1090] // 6 platser (mitten fri för tank/header)

// Föremålspool: alltid ~3 flytare + 3 sjunkare per hylla -> barnet upptäcker mönster.
const POOL_FLOAT = [
  { emoji: '🦆', floats: true },
  { emoji: '🍃', floats: true },
  { emoji: '🪵', floats: true },
  { emoji: '🛟', floats: true },
  { emoji: '⛵', floats: true },
  { emoji: '🍎', floats: true },
]
const POOL_SINK = [
  { emoji: '🪨', floats: false },
  { emoji: '🔑', floats: false },
  { emoji: '🥄', floats: false },
  { emoji: '🪙', floats: false },
  { emoji: '🔩', floats: false },
  { emoji: '⚙️', floats: false },
]

const IDLE_LINES = ['Plaska lite till!', 'Släpp en sak till i vattnet!']
const JUMPERS = ['🐟', '🐠', '🐡', '🦆'] // glad hoppare vid firandet

export default {
  id: 'plask-i-vattnet',
  titleSv: 'Plask i Vattnet',
  icon: '💧',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'plask-i-vattnet',
  voiceIntro: 'Släpp sakerna i vattnet och se vad som händer!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._t = 0
    this._dropped = 0
    this._celebrating = false
    this._roundViews = []
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildTank(ctx)
    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildTank(ctx) {
    // Bakgrund (dekorativ — släpper tap igenom).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'none'
    this._root.addChild(bg)

    // Glas (transparent + vit rim).
    const glass = new Graphics()
      .roundRect(TANK.x, TANK.y, TANK.w, TANK.h, TANK.r)
      .fill({ color: 0x9fd8f0, alpha: 0.18 })
      .stroke({ width: 8, color: 0xffffff, alpha: 0.7 })
    glass.eventMode = 'none'
    this._root.addChild(glass)

    // Vattenkropp (halvtransparent, lite indrag innanför glaset).
    const water = new Graphics()
      .roundRect(WATER.x, WATER.y, WATER.w, WATER.h, WATER.r)
      .fill({ color: 0x4aa3df, alpha: 0.45 })
    water.eventMode = 'none'
    this._root.addChild(water)

    // Ambient: små bubblor som driver uppåt (ticker-driven, exit-säker).
    this._buildBubbles()

    // Ljus, lätt guppande ytlinje (dekorativ).
    const line = new Graphics().roundRect(WATER.x, -4, WATER.w, 8, 4).fill({ color: 0xffffff, alpha: 0.35 })
    line.position.set(0, SURFACE_Y)
    line.eventMode = 'none'
    this._root.addChild(line)
    this._surfaceTween = gsap.to(line, { y: SURFACE_Y + 4, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Osynligt drag-target som täcker hela tanken (generös träffzon för tap-tap).
    const target = new Container()
    target.position.set(TANK_CX, TANK_CY)
    target.hitArea = new Circle(0, 0, 260)
    target.on('pointertap', (e) => this._waterTap(ctx, e))
    this._tankView = target
    this._root.addChild(target)
  },

  _buildBubbles() {
    this._bubbleLayer = new Container()
    this._bubbleLayer.eventMode = 'none'
    this._bubbleLayer.interactiveChildren = false
    this._root.addChild(this._bubbleLayer)
    this._bubbles = []
    for (let i = 0; i < 7; i++) {
      const b = new Graphics()
        .circle(0, 0, 5 + Math.random() * 7)
        .fill({ color: 0xffffff, alpha: 0.35 })
        .stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
      b.eventMode = 'none'
      this._resetBubble(b, true)
      this._bubbleLayer.addChild(b)
      this._bubbles.push(b)
    }
  },

  _resetBubble(b, spread = false) {
    b._baseX = WATER.x + 24 + Math.random() * (WATER.w - 48)
    b._sway = 6 + Math.random() * 10
    b._phase = Math.random() * Math.PI * 2
    b._vy = 16 + Math.random() * 24
    b.x = b._baseX
    b.y = spread ? SURFACE_Y + 16 + Math.random() * (WATER.h - 36) : WATER.y + WATER.h - 12
  },

  // Ett hyllföremål: vit bricka (r=64) + emoji (fontSize 96) => träffyta ~128px ≥96px.
  _makeItem(data) {
    const it = new Container()
    const plate = new Graphics().circle(0, 0, 64).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: data.emoji, style: { fontFamily: FONT.body, fontSize: 96 } })
    e.anchor.set(0.5)
    it.addChild(plate, e)
    return it
  },

  // ---- Runda --------------------------------------------------------------

  _newRound(ctx) {
    if (!this._alive) return
    // Riv föregående runda: drag-controller + alla föremåls-vyer (tank/botten töms).
    this._drag?.destroy()
    this._roundViews.forEach((v) => {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      if (!v.destroyed) v.destroy({ children: true })
    })
    this._roundViews = []

    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._tankView, () => true, { hitRadius: 280 }) // tar emot ALLT

    this._dropped = 0
    this._celebrating = false
    this._idle = 0
    // Spridda viloplatser så saker inte staplas exakt (slumpad ordning).
    this._floatSpots = shuffle([500, 640, 780])
    this._sinkSpots = shuffle([
      { x: 480, y: 646 },
      { x: 640, y: 632 },
      { x: 800, y: 648 },
    ])

    const items = shuffle([...shuffle(POOL_FLOAT).slice(0, 3), ...shuffle(POOL_SINK).slice(0, 3)])
    items.forEach((data, i) => {
      const view = this._makeItem(data)
      view.position.set(SHELF_X[i], SHELF_Y)
      this._root.addChild(view)
      this._roundViews.push(view)
      this._drag.addItem(view, data, {
        onSelect: () => (this._idle = 0),
        onCorrect: (rec) => this._onDrop(ctx, rec),
        onWrong: (rec) => this._alive && wiggle(rec.view),
      })
      bounceIn(view, { delay: i * 0.05 })
    })
  },

  _onDrop(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    this._splash(ctx, rec)
    this._dropped++
    if (this._dropped >= 6) this._finishRound(ctx)
  },

  // ---- Plask & fysik ------------------------------------------------------

  _splash(ctx, rec) {
    if (!this._alive) return
    const view = rec.view
    const x = view.x // föremålet har snäppt till tankens mitt (TANK_CX)
    ctx.services.audio.sfx('pop')
    puff(ctx.fxLayer, x, SURFACE_Y, { count: 10, color: 0x9fd8f0 })
    this._ring(ctx, x, SURFACE_Y)
    if (rec.data.floats) this._float(ctx, view)
    else this._sink(ctx, view)
  },

  _float(ctx, view) {
    const sx = this._floatSpots.shift() ?? view.x
    gsap.killTweensOf(view)
    gsap.to(view, {
      x: sx,
      y: FLOAT_Y,
      duration: 0.9,
      ease: 'power1.out',
      onComplete: () => {
        if (!this._alive || view.destroyed) return
        sparkle(ctx.fxLayer, view.x, view.y, { count: 6 })
        // Lugnt evigt gupp vid ytan (dödas av drag.destroy/_newRound).
        gsap.to(view, { y: FLOAT_Y - 10, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      },
    })
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Den flyter!')
  },

  _sink(ctx, view) {
    const spot = this._sinkSpots.shift() ?? { x: view.x, y: 644 }
    gsap.killTweensOf(view)
    // Lätt vingel på vägen ner (yoyo -> tillbaka till 0).
    gsap.to(view, { rotation: (Math.random() < 0.5 ? -1 : 1) * 0.22, duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    gsap.to(view, {
      x: spot.x,
      y: spot.y,
      duration: 0.9,
      ease: 'power1.in',
      onComplete: () => {
        if (this._alive && !view.destroyed) view.rotation = 0
      },
    })
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say('Den sjunker!')
  },

  // Växande/fadande plask-ring vid ytan. Exit-säker: tweenar ett proxy-objekt och
  // rör bara ringen om den lever (den ligger i fxLayer och självförstörs).
  _ring(ctx, x, y) {
    const ring = new Graphics().circle(0, 0, 30).stroke({ width: 6, color: 0x9fd8f0, alpha: 0.9 })
    ring.position.set(x, y)
    ring.scale.set(0.3)
    ring.alpha = 0.9
    ring.eventMode = 'none'
    ctx.fxLayer.addChild(ring)
    const st = { s: 0.3, a: 0.9 }
    const tw = gsap.to(st, {
      s: 2.2,
      a: 0,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        if (ring.destroyed) {
          tw.kill()
          return
        }
        ring.scale.set(st.s)
        ring.alpha = st.a
      },
      onComplete: () => {
        if (!ring.destroyed) ring.destroy()
      },
    })
  },

  // Tryck direkt på vattnet (utan markerat föremål) = litet glatt plask + flytare
  // nickar till. Ren orsak-och-verkan; krockar inte med drag/tap-tap.
  _waterTap(ctx, e) {
    if (!this._alive || this._celebrating) return
    if (this._drag?.selected) return // ett tap-tap-släpp pågår -> plasket sköts av onCorrect
    const p = this._root.toLocal(e.global)
    const x = Math.max(WATER.x + 30, Math.min(WATER.x + WATER.w - 30, p.x))
    const y = Math.max(SURFACE_Y, Math.min(WATER.y + WATER.h - 20, p.y))
    this._idle = 0
    ctx.services.audio.sfx(Math.random() < 0.3 ? 'pling' : 'pop')
    puff(ctx.fxLayer, x, y, { count: 7, color: 0x9fd8f0 })
    this._ring(ctx, x, y)
    this._nudgeFloaters(x)
  },

  // Flytande saker (placerade, nära ytan) i närheten guppar till av plasket.
  _nudgeFloaters(x) {
    for (const v of this._roundViews) {
      if (v.destroyed || v.eventMode !== 'none') continue // bara saker som hamnat i vattnet
      if (v.y < SURFACE_Y + 80 && Math.abs(v.x - x) < 150) pop(v, { scale: 1.12 })
    }
  },

  // ---- Firande ------------------------------------------------------------

  _finishRound(ctx) {
    if (this._celebrating) return
    this._celebrating = true
    this._idle = 0
    this._level++
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('totalDropped', (ctx.progress.get().custom?.totalDropped || 0) + this._dropped)
    // complete() sköter celebrate-ljud, beröm-röst, konfetti, stjärna och klistermärke.
    ctx.progress.complete()
    this._jumpFish(ctx)
    this._roundTimer = gsap.delayedCall(1.3, () => this._newRound(ctx))
  },

  // En glad fisk hoppar upp ur vattnet och plaskar ner igen. Exit-säker proxy-tween.
  _jumpFish(ctx) {
    const fish = new Text({ text: randomFrom(JUMPERS), style: { fontFamily: FONT.body, fontSize: 96 } })
    fish.anchor.set(0.5)
    fish.position.set(TANK_CX, FLOAT_Y)
    fish.rotation = -0.5
    fish.eventMode = 'none'
    ctx.fxLayer.addChild(fish)
    const st = { x: TANK_CX, y: FLOAT_Y, rot: -0.5 }
    const apply = () => {
      if (fish.destroyed) return
      fish.x = st.x
      fish.y = st.y
      fish.rotation = st.rot
    }
    gsap
      .timeline({ onUpdate: apply, onComplete: () => !fish.destroyed && fish.destroy() })
      .to(st, { y: 120, x: 700, rot: 0.4, duration: 0.5, ease: 'power2.out' })
      .to(st, { y: FLOAT_Y, x: 760, rot: 1.0, duration: 0.45, ease: 'power2.in' })
  },

  // ---- Ambient + idle -----------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._idle += dt
    if (this._idle > 6 && !this._celebrating) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_LINES))
      const left = this._roundViews.filter((v) => !v.destroyed && v.eventMode === 'static')
      if (left.length) pop(randomFrom(left))
    }
    for (const b of this._bubbles) {
      b.y -= b._vy * dt
      b.x = b._baseX + Math.sin(this._t * 1.5 + b._phase) * b._sway
      if (b.y < SURFACE_Y + 8) this._resetBubble(b)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._roundTimer?.kill()
    this._surfaceTween?.kill()
    this._drag?.destroy() // dödar item-tweens (gupp/sjunk/skala) + lyssnare
    this._roundViews?.forEach((v) => {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
    })
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
