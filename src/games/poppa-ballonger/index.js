// Poppa Ballongerna — tryck/orsak-verkan (2–4 år). Glansiga ballonger i olika
// storlekar svävar lugnt uppåt och vaggar; barnet trycker för att poppa dem med
// pling + saftig partikelskur. Ibland dyker en GULDBALLONG upp (extra konfetti +
// stjärna) och ibland räknar rösten poppen ("ett, två, tre…").
// Inga felsteg, ingen timer, inget slut — när rundans ballonger är poppade firar
// vi (delad complete()) och en ny, lite svårare runda fylls på (oändlig lek).
import { Container, Graphics, Circle, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, ripple, burst, sparkle, floatText, shake, breathe } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { PLAYFUL, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// Gör en mörkare nyans av en 0xRRGGBB-färg (kontur/skuggning).
function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

const SIDE_MARGIN = 130 // ballonger håller sig i x ∈ [130, 1150]
const GOLD = 0xffd24a
const GOLD_BITS = [0xffe27a, 0xffd24a, 0xfff3b0, 0xffb347]
const SIZES = [0.78, 0.92, 0.92, 1.06, 1.06, 1.22] // viktat mot mitten
const NUM = ['ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio']
const NUDGES = ['Poppa fler ballonger!', 'Tryck på en ballong!', 'Titta, så många ballonger!']

export default {
  id: 'poppa-ballonger',
  titleSv: 'Poppa Ballongerna',
  icon: '🎈',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'poppa-ballonger',
  voiceIntro: 'Tryck på ballongerna och poppa dem!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._level = ctx.progress.get().highestLevel || 1
    this._attractTween = null
    this._attractBalloon = null
    this._respawnCall = null

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    // Polerad himmel-scen (gradient + sol + drivande moln). Dekorativ, FÖRSTA barnet.
    this._scene = createScene('sky', { width: ctx.width, height: ctx.height })
    this._layer.addChild(this._scene)

    // Osynligt tap-fångar-lager (ovanför scenen, under ballonger): tomt-tryck.
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

  // Bygg en ny runda (städar föregående först). Skalar med nivån.
  _build(ctx) {
    if (!this._alive) return
    this._stopAttract()

    // städa förra rundans ballonger + tweens
    this._balloons.forEach((b) => {
      b._sway?.kill()
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    this._balloonLayer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._balloons = []

    const level = this._level
    const count = Math.min(9, 5 + Math.floor(level / 2)) // fler per nivå (tak 9)
    this._speed = Math.min(78, 34 + level * 4) // lite snabbare drift per nivå
    this._remaining = count
    this._resolving = false
    this._idle = 0
    this._popCount = 0
    // Räkne-känsla: säg poppen på svenska — vanligare för de yngsta/låga nivåer.
    this._countingRound = Math.random() < (level <= 3 ? 0.7 : 0.4)
    // En enstaka guldballong då och då (oftare högre upp), men aldrig garanterat.
    const goldenIndex = Math.random() < Math.min(0.6, 0.28 + level * 0.05) ? (Math.random() * count) | 0 : -1

    for (let i = 0; i < count; i++) {
      const golden = i === goldenIndex
      const color = golden ? GOLD : PLAYFUL[i % PLAYFUL.length]
      const size = golden ? 1.12 : randomFrom(SIZES)
      const b = this._makeBalloon(ctx, color, size, golden)
      b._baseX = this._spawnX(ctx)
      b.x = b._baseX
      b.y = 160 + Math.random() * 640 // spridda, en del syns direkt
      this._balloonLayer.addChild(b)
      this._balloons.push(b)
      // mjuk entré-studs
      bounceIn(b, { delay: i * 0.06, duration: 0.42 })
    }
  },

  // Bygg en glansig ballong-Container (ankare i kroppens centrum).
  _makeBalloon(ctx, color, size, golden) {
    const b = new Container()
    const g = new Graphics()
    const rx = 56 * size
    const ry = 68 * size
    const knotY = ry + 4 * size

    // mjuk volym-skugga (bakom kroppen, lätt förskjuten)
    g.ellipse(rx * 0.16, ry * 0.18, rx * 0.98, ry * 0.98).fill({ color: darken(color, 0.4), alpha: 0.16 })
    // kropp
    g.ellipse(0, 0, rx, ry).fill(color).stroke({ width: 3 * size, color: darken(color, 0.22) })
    // botten-skuggning (ger rundhet)
    g.ellipse(rx * 0.1, ry * 0.24, rx * 0.74, ry * 0.62).fill({ color: darken(color, 0.18), alpha: 0.18 })
    // stor mjuk glans
    g.ellipse(-rx * 0.34, -ry * 0.34, rx * 0.44, ry * 0.5).fill({ color: 0xffffff, alpha: 0.3 })
    // liten skarp glansprick
    g.ellipse(-rx * 0.4, -ry * 0.42, rx * 0.14, ry * 0.18).fill({ color: 0xffffff, alpha: 0.85 })
    // knut (liten triangel under kroppen)
    g.moveTo(-6 * size, knotY - 4 * size)
      .lineTo(6 * size, knotY - 4 * size)
      .lineTo(0, knotY + 9 * size)
      .closePath()
      .fill(darken(color, 0.18))
    // snöre (mjukt böjt, dekorativt)
    const sy = knotY + 9 * size
    g.moveTo(0, sy)
      .quadraticCurveTo(20 * size, sy + 48 * size, -8 * size, sy + 100 * size)
      .stroke({ width: 2.5 * size, color: 0x9aa6b0, alpha: 0.9 })
    b.addChild(g)

    // Guldballong markeras med en liten stjärna.
    if (golden) {
      const star = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 40 * size } })
      star.anchor.set(0.5)
      star.y = ry * 0.06
      star.eventMode = 'none'
      b.addChild(star)
    }

    b._color = color
    b._golden = golden
    b._size = size
    b._popped = false
    b._swayOffset = 0
    // tyngre (större) ballonger stiger lite lugnare -> parallax
    b._speedMul = (1.3 - size * 0.4) * (0.9 + Math.random() * 0.3)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    // stor träffyta + osynligt halo, alltid generös för små fingrar
    b.hitArea = new Circle(0, -8 * size, Math.max(82, 90 * size))
    b.on('pointertap', () => this._pop(ctx, b))

    // lätt sidledes vagga (ticker lägger ihop baseX + swayOffset)
    const amp = 14 + Math.random() * 16
    b._sway = gsap.fromTo(
      b,
      { _swayOffset: -amp },
      { _swayOffset: amp, duration: 1.6 + Math.random() * 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' },
    )
    // lätt tilt som följer vaggan (rotation-tween, separat från scale)
    const tilt = 0.05 + Math.random() * 0.05
    gsap.fromTo(
      b,
      { rotation: -tilt },
      { rotation: tilt, duration: 1.8 + Math.random() * 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' },
    )
    return b
  },

  // Poppa en ballong (endast positivt; dubbeltryck-säkrat).
  _pop(ctx, b) {
    if (!this._alive || b._popped) return
    b._popped = true
    b.eventMode = 'none'
    b._sway?.kill()
    gsap.killTweensOf(b) // stoppa vagga/tilt
    if (this._attractBalloon === b) this._stopAttract()
    this._remaining--
    this._idle = 0

    // Ljud + ring + skur < 100ms.
    ctx.services.audio.sfx(b._golden ? 'reveal' : Math.random() < 0.25 ? 'pling' : 'pop')
    ripple(this._layer, b.x, b.y, { color: 0xffffff, maxR: 70 * b._size, alpha: 0.55 })

    if (b._golden) {
      ctx.services.audio.sfx('pling')
      burst(this._layer, b.x, b.y, { count: 20, colors: GOLD_BITS, power: 1.35 })
      sparkle(ctx.fxLayer, b.x, b.y, { count: 9 })
      floatText(ctx.fxLayer, b.x, b.y - 10, '⭐', { fontSize: 64, rise: 110 })
      ctx.progress.addStars(1) // liten bonusstjärna
    } else {
      burst(this._layer, b.x, b.y, { count: b._size > 1 ? 14 : 11, colors: [b._color, ...GOLD_BITS.slice(2)], power: b._size })
    }

    // Räkne-känsla: säg poppen ("ett, två, tre…").
    if (this._countingRound) {
      this._popCount++
      const word = NUM[this._popCount - 1]
      if (word) ctx.services.voice.say(word)
    }

    // squash/stretch -> kollaps
    gsap.killTweensOf(b.scale)
    gsap
      .timeline()
      .to(b.scale, { x: 1.22, y: 0.82, duration: 0.05, ease: 'power2.out' })
      .to(b.scale, {
        x: 0,
        y: 0,
        duration: 0.17,
        ease: 'back.in(2)',
        onComplete: () => {
          if (this._alive && !b.destroyed) b.visible = false
        },
      })

    if (this._remaining <= 0 && !this._resolving) {
      this._resolving = true
      // complete() äger firandet: beröm-röst + konfetti + stjärna + klistermärke.
      ctx.progress.complete()
      shake(this._layer, { intensity: 7, duration: 0.45 }) // extra mjuk juice (ej i complete)
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      this._level++
      ctx.progress.setLevel(this._level)
      this._respawnCall = gsap.delayedCall(1.5, () => {
        if (!this._alive) return
        if (Math.random() < 0.5) ctx.services.voice.say('Här kommer fler ballonger!')
        this._build(ctx)
      })
    }
  },

  // Tomt tryck (mellanrum): mjuk ring + 'soft' + närmaste ballong wobblar. Aldrig "fel".
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    this._stopAttract()
    ctx.services.audio.sfx('soft')
    const p = this._layer.toLocal(e.global)
    ripple(this._layer, p.x, p.y, { color: 0xffffff, maxR: 64, alpha: 0.8 })

    // hitta närmaste levande ballong och ge den en lekfull skvätt-wobble
    let near = null
    let best = 1e9
    for (const b of this._balloons) {
      if (b._popped) continue
      const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2
      if (d < best) {
        best = d
        near = b
      }
    }
    if (near && best < 320 * 320) {
      gsap.killTweensOf(near.scale)
      gsap.to(near.scale, {
        x: 1.12,
        y: 0.9,
        duration: 0.08,
        yoyo: true,
        repeat: 3,
        ease: 'sine.inOut',
        onComplete: () => {
          if (!near.destroyed && !near._popped) near.scale.set(1)
        },
      })
    }
  },

  // Starta/stoppa idle-lockaren (en ballong "andas").
  _startAttract() {
    if (this._attractTween) return
    const live = this._balloons.filter((b) => !b._popped && !b.destroyed)
    if (!live.length) return
    const b = randomFrom(live)
    this._attractBalloon = b
    this._attractTween = breathe(b, { scale: 1.1, duration: 0.85 })
  },

  _stopAttract() {
    if (this._attractTween) {
      this._attractTween.kill()
      this._attractTween = null
    }
    const b = this._attractBalloon
    this._attractBalloon = null
    if (b && !b.destroyed && !b._popped) b.scale.set(1)
  },

  // Driv stigningen, vaggan, respawn och idle-recue.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    if (!this._resolving) {
      for (const b of this._balloons) {
        if (b._popped) continue
        b.y -= this._speed * b._speedMul * dt
        b.x = b._baseX + b._swayOffset
        if (b.y < -130) {
          // svävat ut över toppen -> mjuk respawn nere igen (oändlig sväng)
          b.y = ctx.height + 130
          b._baseX = this._spawnX(ctx)
        }
      }
    }

    this._idle += dt
    if (this._idle > 6 && this._remaining > 0 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(NUDGES))
      this._startAttract()
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    ctx.services.voice.cancel()
    this._respawnCall?.kill()
    this._stopAttract()
    this._balloons?.forEach((b) => {
      b._sway?.kill()
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
