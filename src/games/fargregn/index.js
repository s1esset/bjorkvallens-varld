// Färgregn — färginlärning (2–4 år). Färgade droppar regnar lugnt nedåt och
// rösten ber barnet trycka på en viss färg. Rätt droppe poppar med pling +
// gnistor och fyller framstegsraden; fel färg vinglar bara glatt vidare.
// Inga felsteg, ingen timer, inget slut — när N droppar samlats firar vi och
// en ny runda startar med ny målfärg (oändlig lek).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { pop, wiggle, sparkle, bounceIn, puff } from '../../lib/feedback.js'
import { COLORS, PRAISE, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Färgpalett: ASCII-nyckel + 0xRRGGBB + svensk plural-fras (böjd).
const COLOR_DEFS = [
  { key: 'rod', color: 0xff6b6b, plural: 'röda' },
  { key: 'gul', color: 0xffd35c, plural: 'gula' },
  { key: 'bla', color: 0x4aa3df, plural: 'blåa' },
  { key: 'gron', color: 0x5bbf6a, plural: 'gröna' },
  { key: 'lila', color: 0xa78bfa, plural: 'lila' },
  { key: 'rosa', color: 0xff9ec4, plural: 'rosa' },
]

const SIDE_MARGIN = 120 // droppar håller sig i x ∈ [120, 1160]
const SPAWN_Y = -80
const DROP_R = 40
const SKY = 0xdff1fb // lugn ljusblå himmel

// Mörkare nyans av en 0xRRGGBB-färg (till droppens kontur).
function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

export default {
  id: 'fargregn',
  titleSv: 'Färgregn',
  icon: '🌈',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'fargregn',
  voiceIntro: 'Tryck på de röda dropparna!',

  init(ctx) {
    this._alive = true
    this._drops = []
    this._idle = 0
    this._spawnAcc = 0
    this._paused = true
    this._lastTargetKey = null
    this._rounds = ctx.progress.get().custom?.rundor || 0

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildScene(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)

    this._startRound(ctx, false) // första rundan annonseras i mount()
  },

  mount(ctx) {
    ctx.services.voice.say(this._introPhrase)
  },

  // Statisk dekor + HUD (skylt + framstegsrad) byggs en gång.
  _buildScene(ctx) {
    // Bakgrund + moln + pöl-remsa (fångar inga tap).
    const decor = new Container()
    decor.eventMode = 'none'
    decor.interactiveChildren = false
    decor.addChild(new Graphics().rect(0, 0, ctx.width, ctx.height).fill(SKY))
    for (const [cx, cy, s] of [[210, 110, 1], [1070, 150, 0.8]]) {
      const cloud = new Text({ text: '☁️', style: { fontFamily: FONT.body, fontSize: 90 * s } })
      cloud.anchor.set(0.5)
      cloud.position.set(cx, cy)
      cloud.alpha = 0.85
      decor.addChild(cloud)
    }
    decor.addChild(new Graphics().roundRect(0, 686, ctx.width, 60, 26).fill({ color: 0x9fd6ef, alpha: 0.55 }))
    this._root.addChild(decor)

    // Droppar faller i sitt eget lager (under HUD så skylten alltid syns).
    this._dropsLayer = new Container()
    this._root.addChild(this._dropsLayer)

    // HUD: målfärg-skylt + framstegsrad.
    this._hud = new Container()
    this._root.addChild(this._hud)

    this._sign = new Container()
    this._sign.position.set(640, 92)
    this._signBox = new Graphics()
    this._signDrop = new Graphics()
    this._sign.addChild(this._signBox, this._signDrop)
    this._sign.eventMode = 'static'
    this._sign.cursor = 'pointer'
    this._sign.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      ctx.services.voice.say(this._introPhrase)
      pop(this._signDrop)
    })
    this._hud.addChild(this._sign)

    this._dotsRoot = new Container()
    this._dotsRoot.position.set(640, 170)
    this._dotsRoot.eventMode = 'none'
    this._hud.addChild(this._dotsRoot)
    this._dots = []
  },

  // Nivåparametrar utifrån antal klarade rundor.
  _levelFor(rounds) {
    if (rounds < 3) return { need: 4, colors: 3, interval: 900, speed: 70 }
    if (rounds < 6) return { need: 5, colors: 4, interval: 750, speed: 85 }
    return { need: 6, colors: 6, interval: 650, speed: 100 }
  },

  // Starta ny runda: ny målfärg, ny palett, nollställd räknare.
  _startRound(ctx, speak = true) {
    if (!this._alive) return
    const lvl = this._levelFor(this._rounds)
    this._need = lvl.need
    this._speed = lvl.speed
    this._interval = lvl.interval
    this._collected = 0
    this._paused = false
    this._idle = 0
    this._spawnAcc = lvl.interval // spawna snabbt direkt

    this._palette = shuffle(COLOR_DEFS).slice(0, lvl.colors)
    let choices = this._palette.filter((c) => c.key !== this._lastTargetKey)
    if (!choices.length) choices = this._palette
    this._target = randomFrom(choices)
    this._lastTargetKey = this._target.key
    this._introPhrase = 'Tryck på de ' + this._target.plural + ' dropparna!'

    this._updateSign()
    this._buildDots()

    if (speak) ctx.services.voice.say(this._introPhrase)
  },

  _updateSign() {
    this._signBox
      .clear()
      .roundRect(-150, -56, 300, 112, 28)
      .fill(COLORS.cream)
      .stroke({ width: 6, color: this._target.color })
    this._drawDrop(this._signDrop, 38, this._target.color)
  },

  _buildDots() {
    this._dotsRoot.removeChildren().forEach((o) => o.destroy())
    this._dots = []
    const gap = 44
    const total = (this._need - 1) * gap
    for (let i = 0; i < this._need; i++) {
      const d = new Graphics().circle(0, 0, 16).fill(0xd8cfc4)
      d.x = -total / 2 + i * gap
      this._dotsRoot.addChild(d)
      this._dots.push(d)
    }
  },

  _lightDot(i) {
    const d = this._dots[i]
    if (!d) return
    d.clear().circle(0, 0, 16).fill(this._target.color)
    pop(d)
  },

  // Rita en tår-formad droppe (spets uppåt) i en given Graphics.
  _drawDrop(g, r, color) {
    g.clear()
    g.moveTo(0, -r * 1.7)
      .lineTo(r * 0.6, -r * 0.25)
      .lineTo(-r * 0.6, -r * 0.25)
      .fill({ color })
    g.circle(0, 0, r).fill({ color, alpha: 0.95 }).stroke({ width: 4, color: darken(color, 0.22) })
    g.circle(-r * 0.3, -r * 0.3, r * 0.28).fill({ color: 0xffffff, alpha: 0.6 })
  },

  _randX(ctx) {
    return SIDE_MARGIN + Math.random() * (ctx.width - SIDE_MARGIN * 2)
  },

  _makeDrop(ctx, def) {
    const drop = new Container()
    const halo = new Graphics().circle(0, 0, 64).fill({ color: 0xffffff, alpha: 0.001 })
    const g = new Graphics()
    this._drawDrop(g, DROP_R, def.color)
    drop.addChild(halo, g)
    drop._def = def
    drop._resolved = false
    drop.eventMode = 'static'
    drop.cursor = 'pointer'
    drop.hitArea = new Circle(0, 0, 64) // träffyta 128px (>= 96px)
    drop.on('pointertap', () => this._tapDrop(ctx, drop))
    return drop
  },

  // Spawna en droppe. >=50% är målfärg (forceTarget tvingar målfärg).
  _spawnDrop(ctx, forceTarget = false) {
    if (!this._alive) return
    let def
    if (forceTarget || Math.random() < 0.5) {
      def = this._target
    } else {
      const others = this._palette.filter((c) => c.key !== this._target.key)
      def = others.length ? randomFrom(others) : this._target
    }

    // Slumpa x men undvik att krocka med droppar nära toppen (max 6 försök).
    let x = this._randX(ctx)
    for (let i = 0; i < 6; i++) {
      if (this._drops.every((d) => d.y > 140 || Math.abs(d.x - x) > 100)) break
      x = this._randX(ctx)
    }

    const drop = this._makeDrop(ctx, def)
    drop.x = x
    drop.y = SPAWN_Y
    this._dropsLayer.addChild(drop)
    this._drops.push(drop)
    bounceIn(drop)
  },

  _tapDrop(ctx, drop) {
    if (!this._alive || drop._resolved || this._paused) return
    this._idle = 0

    if (drop._def.key === this._target.key) {
      // Rätt färg: pling + gnistor, droppen krymper bort, prick tänds.
      drop._resolved = true
      drop.eventMode = 'none'
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, drop.x, drop.y)
      gsap.killTweensOf(drop.scale)
      gsap.to(drop.scale, {
        x: 0,
        y: 0,
        duration: 0.22,
        ease: 'back.in(2)',
        onComplete: () => {
          const i = this._drops.indexOf(drop)
          if (i >= 0) this._drops.splice(i, 1)
          if (!drop.destroyed) drop.destroy({ children: true })
        },
      })
      this._lightDot(this._collected)
      this._collected++
      // Sparsamt beröm (inte pratigt).
      if (this._collected < this._need && this._collected % 2 === 0) {
        ctx.services.voice.say(randomFrom(PRAISE))
      }
      if (this._collected >= this._need) this._finishRound(ctx)
    } else {
      // Fel färg: aldrig bestraffning — glad vingel, droppen faller vidare.
      ctx.services.audio.sfx('soft')
      wiggle(drop)
    }
  },

  _finishRound(ctx) {
    if (!this._alive) return
    this._paused = true
    // complete() = celebrate-ljud + konfetti + stjärna + klistermärke (GameHost).
    ctx.progress.complete()
    ctx.services.voice.say('Du hittade alla ' + this._target.plural + '! ' + randomFrom(PRAISE))
    this._rounds++
    ctx.progress.setCustom('rundor', this._rounds)
    ctx.progress.setLevel(this._rounds)

    this._fadeOutDrops()
    this._nextRoundCall = gsap.delayedCall(1.3, () => {
      if (this._alive) this._startRound(ctx, true)
    })
  },

  // Tona ut kvarvarande droppar mjukt (behålls i listan tills de förstörts).
  _fadeOutDrops() {
    for (const d of this._drops) {
      d._resolved = true
      d.eventMode = 'none'
      gsap.killTweensOf(d.scale)
      gsap.killTweensOf(d)
      gsap.to(d, {
        alpha: 0,
        duration: 0.5,
        ease: 'power1.out',
        onComplete: () => {
          const i = this._drops.indexOf(d)
          if (i >= 0) this._drops.splice(i, 1)
          if (!d.destroyed) d.destroy({ children: true })
        },
      })
    }
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    // Flytta droppar; städa de som nått botten (mjukt plask, ingen "miss").
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i]
      if (d._resolved) continue
      d.y += this._speed * dt
      if (d.y > 740) {
        this._drops.splice(i, 1)
        gsap.killTweensOf(d)
        gsap.killTweensOf(d.scale)
        puff(this._dropsLayer, d.x, 692, { count: 5, color: d._def.color })
        if (!d.destroyed) d.destroy({ children: true })
      }
    }

    // Spawn-ackumulator (pausar/städas med tickern).
    if (!this._paused) {
      this._spawnAcc += ticker.deltaMS
      if (this._spawnAcc >= this._interval) {
        this._spawnAcc = 0
        this._spawnDrop(ctx)
      }
    }

    // Idle-recue (~6s): upprepa instruktionen, lyft fram en målfärg-droppe.
    this._idle += dt
    if (this._idle > 6 && !this._paused) {
      this._idle = 0
      ctx.services.voice.say(this._introPhrase)
      const targets = this._drops.filter((d) => !d._resolved && d._def.key === this._target.key)
      if (targets.length) pop(randomFrom(targets))
      else this._spawnDrop(ctx, true)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._nextRoundCall?.kill()
    this._drops?.forEach((d) => {
      gsap.killTweensOf(d)
      gsap.killTweensOf(d.scale)
    })
    this._dots?.forEach((d) => gsap.killTweensOf(d.scale))
    if (this._signDrop) gsap.killTweensOf(this._signDrop.scale)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
