// Poppa Ballongerna — tryck/orsak-verkan (2–3 år). Färgglada ballonger
// svävar lugnt uppåt; barnet trycker för att poppa dem med pling + konfetti.
// Inga felsteg, ingen timer, inget slut — när rundans ballonger är poppade
// firar vi och en ny runda fylls på (oändlig lek).
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { puff, bigCelebration } from '../../lib/feedback.js'
import { PLAYFUL, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// Gör en mörkare nyans av en 0xRRGGBB-färg (till ballongens kontur).
function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

const SIDE_MARGIN = 120 // ballonger håller sig i x ∈ [120, 1160]
const SKY = 0xbfe3ff // ljus himmelsblå (mjukare än palettens mättade blå)

export default {
  id: 'poppa-ballonger',
  titleSv: 'Poppa Ballongerna',
  icon: '🎈',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 3],
  bundle: 'poppa-ballonger',
  voiceIntro: 'Tryck på ballongerna!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._level = ctx.progress.get().highestLevel || 1

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    // Bakgrund: ljus himmel (dekorativ, fångar inte tap).
    const bg = new Graphics()
    bg.rect(0, 0, ctx.width, ctx.height).fill(SKY)
    bg.circle(1060, 130, 96).fill({ color: 0xffffff, alpha: 0.32 }) // mjuk sol
    bg.eventMode = 'none'
    bg.interactiveChildren = false
    this._layer.addChild(bg)

    // Osynligt tap-fångar-lager (ovanför bg, under ballonger): tomt-tryck.
    const tap = new Graphics()
    tap.rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._layer.addChild(tap)
    this._tapCatcher = tap

    // Ballonglager ovanpå tap-lagret.
    this._balloonLayer = new Container()
    this._layer.addChild(this._balloonLayer)

    this._balloons = []
    this._build(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Slumpa en x-position inom sidmarginalerna.
  _spawnX(ctx) {
    return SIDE_MARGIN + Math.random() * (ctx.width - SIDE_MARGIN * 2)
  },

  // Bygg en ny runda (städar föregående först).
  _build(ctx) {
    if (!this._alive) return

    // städa förra rundans ballonger + tweens
    this._balloons.forEach((b) => {
      b._sway?.kill()
      gsap.killTweensOf(b.scale)
      gsap.killTweensOf(b)
    })
    this._balloonLayer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._balloons = []

    const level = this._level
    const count = Math.min(8, 5 + Math.floor(level / 2))
    this._speed = Math.min(70, 35 + level * 4)
    this._remaining = count
    this._resolving = false
    this._idle = 0

    for (let i = 0; i < count; i++) {
      const color = PLAYFUL[i % PLAYFUL.length]
      const b = this._makeBalloon(ctx, color)
      b._baseX = this._spawnX(ctx)
      b.x = b._baseX
      b.y = 150 + Math.random() * 650 // spridda, en del syns direkt
      this._balloonLayer.addChild(b)
      this._balloons.push(b)
      // mjuk entré-studs
      b.scale.set(0)
      gsap.to(b.scale, { x: 1, y: 1, duration: 0.4, delay: i * 0.06, ease: 'back.out(1.7)' })
    }
  },

  // Bygg en ballong-Container i lokala koordinater (ankare i kroppens centrum).
  _makeBalloon(ctx, color) {
    const b = new Container()
    const g = new Graphics()
    // kropp
    g.ellipse(0, 0, 60, 72).fill({ color }).stroke({ width: 4, color: darken(color, 0.22) })
    // glansprick
    g.ellipse(-22, -28, 16, 22).fill({ color: 0xffffff, alpha: 0.55 })
    // knut
    g.circle(0, 70, 7).fill({ color: darken(color, 0.12) })
    // snöre (dekorativt)
    g.moveTo(0, 76).lineTo(6, 150).stroke({ width: 3, color: 0x9aa0a8 })
    b.addChild(g)

    b._color = color
    b._popped = false
    b._swayOffset = 0
    b.eventMode = 'static'
    b.cursor = 'pointer'
    // stor träffyta + 24px osynligt halo (radie 84, lätt höjd mot kroppen)
    b.hitArea = new Circle(0, -10, 84)
    b.on('pointertap', () => this._pop(ctx, b))

    // lätt sidledes vagga via offset (ticker lägger ihop baseX + swayOffset)
    const amp = 16 + Math.random() * 14
    b._sway = gsap.fromTo(
      b,
      { _swayOffset: -amp },
      { _swayOffset: amp, duration: 1.6 + Math.random() * 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' },
    )
    return b
  },

  // Poppa en ballong (endast positivt; dubbeltryck-säkrat).
  _pop(ctx, b) {
    if (!this._alive || b._popped) return
    b._popped = true
    b.eventMode = 'none'
    b._sway?.kill()
    this._remaining--
    this._idle = 0

    ctx.services.audio.sfx(Math.random() < 0.25 ? 'pling' : 'pop')
    puff(this._layer, b.x, b.y, { count: 9, color: b._color })
    gsap.killTweensOf(b.scale)
    gsap.to(b.scale, {
      x: 0,
      y: 0,
      duration: 0.22,
      ease: 'back.in(2)',
      onComplete: () => {
        if (this._alive) b.visible = false
      },
    })

    if (this._remaining <= 0 && !this._resolving) {
      this._resolving = true
      ctx.progress.complete() // complete() sköter beröm-röst + konfetti + stjärna + klistermärke
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      this._level++
      ctx.progress.setLevel(this._level)
      gsap.delayedCall(1.4, () => {
        if (this._alive) this._build(ctx)
      })
    }
  },

  // Tomt tryck (mellanrum): mjuk studs-ring + 'soft'. Aldrig "fel".
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    const p = this._layer.toLocal(e.global)
    const ring = new Graphics().circle(0, 0, 12).stroke({ width: 4, color: 0xffffff, alpha: 0.85 })
    ring.position.set(p.x, p.y)
    ring.eventMode = 'none'
    this._layer.addChild(ring)
    gsap.to(ring.scale, { x: 2.6, y: 2.6, duration: 0.4, ease: 'power2.out' })
    gsap.to(ring, {
      alpha: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => ring.destroy(),
    })
  },

  // Driv stigningen, vaggan, respawn och idle-recue.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    if (!this._resolving) {
      for (const b of this._balloons) {
        if (b._popped) continue
        b.y -= this._speed * dt
        b.x = b._baseX + b._swayOffset
        if (b.y < -120) {
          // svävat ut över toppen -> mjuk respawn nere igen (oändlig sväng)
          b.y = 800
          b._baseX = this._spawnX(ctx)
        }
      }
    }

    this._idle += dt
    if (this._idle > 6 && this._remaining > 0 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const live = this._balloons.filter((b) => !b._popped)
      if (live.length) {
        const b = randomFrom(live)
        gsap.to(b.scale, { x: 1.2, y: 1.2, duration: 0.18, yoyo: true, repeat: 3 })
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._balloons?.forEach((b) => {
      b._sway?.kill()
      gsap.killTweensOf(b.scale)
      gsap.killTweensOf(b)
    })
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
