// Fånga Frukten — motorik/drag-lek (2–5 år). Frukter faller från himlen och barnet
// drar korgen i sidled (var som helst på skärmen) för att fånga dem. Inget kan gå
// fel: missad frukt landar mjukt med en liten puff, fångad frukt ploppar ner i korgen.
// Efter ett gäng fångade frukter kommer ett delat firande, sedan rullar leken vidare.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { puff, sparkle, floatText, bounceIn, pop } from '../../lib/feedback.js'

const FRUITS = ['🍎', '🍌', '🍓', '🍐', '🍊', '🍇']
const HAPPY_FX = ['😋', '😄', '🎉', '⭐', '🍓']
const CATCH_PRAISE = ['Mums!', 'Nam nam!', 'Vad gott!', 'En till!']

const MAX_FRUIT = 8 // tak för samtidiga frukter (prestanda)
const SPAWN_EVERY = 1.1 // sekunder mellan nya frukter
const CATCH_GOAL = 8 // antal fångade frukter -> delat firande
const GRAVITY = 240 // px/s^2 (lugnt fall för små barn)
const MAX_VY = 480 // px/s (terminalfart så det aldrig blir för snabbt)
const CATCH_HALF = 108 // generös fångstbredd (toddler-vänlig)
const CATCH_BAND = 72 // höjd på fångstzonen vid korgmunnen
const BASKET_HALF = 112 // halva korgbredden (klamp + handtag)

export default {
  id: 'fanga-frukten',
  titleSv: 'Fånga Frukten',
  icon: '🧺',
  category: 'motorik',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'fanga-frukten',
  voiceIntro: 'Fånga frukten i korgen! Dra korgen i sidled.',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._spawnT = 0
    this._caught = 0
    this._dragging = false
    this._lastVoice = 0
    this._fruit = [] // { view, x, y, vy, spin }
    this._proxyTweens = [] // transient tuck-tweens (städas i destroy)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lugnt gräs i nederkant så korgen står på marken.
    const grass = new Graphics()
      .rect(0, ctx.height - 70, ctx.width, 70)
      .fill(0x9bd17a)
      .rect(0, ctx.height - 70, ctx.width, 8)
      .fill(0x86c266)
    grass.eventMode = 'none'
    this._root.addChild(grass)

    // Korgen: byggs runt origo där (0,0) = korgmunnen (mitten av öppningen).
    this._basket = makeBasket()
    this._mouthY = ctx.height - 150
    this._basket.x = ctx.width / 2
    this._basket.y = this._mouthY
    this._basket.eventMode = 'none'
    this._basket.interactiveChildren = false
    this._root.addChild(this._basket)
    this._targetX = this._basket.x

    // Frukter lever i ett eget lager, framför korgen.
    this._fruitLayer = new Container()
    this._fruitLayer.eventMode = 'none'
    this._fruitLayer.interactiveChildren = false
    this._root.addChild(this._fruitLayer)

    this._groundY = ctx.height - 24
    this._bMin = BASKET_HALF + 8
    this._bMax = ctx.width - BASKET_HALF - 8

    // Hela skärmen är dragyta: ta i var som helst så glider korgen dit (i sidled).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    const setTarget = (ev) => {
      const lx = this._root.toLocal(ev.global).x
      this._targetX = Math.max(this._bMin, Math.min(this._bMax, lx))
      this._idle = 0
    }
    this._catcher.on('pointerdown', (ev) => {
      this._dragging = true
      setTarget(ev)
    })
    this._catcher.on('globalpointermove', (ev) => {
      if (this._dragging) setTarget(ev)
    })
    const end = () => {
      this._dragging = false
    }
    this._catcher.on('pointerup', end)
    this._catcher.on('pointerupoutside', end)
    this._root.addChild(this._catcher)

    this._tick = (t) => {
      if (!this._alive) return
      const dt = Math.min(50, t.deltaMS || 16.67) / 1000

      // Korgen glider mjukt mot fingrets x (bildtaktsoberoende lerp).
      const b = this._basket
      if (b && !b.destroyed) b.x += (this._targetX - b.x) * Math.min(1, dt * 20)
      const bx = b && !b.destroyed ? b.x : ctx.width / 2

      // Tyst påminnelse om ingen rört skärmen på ett tag.
      this._idle += dt
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
      }

      // Släpp ny frukt med jämna mellanrum (om vi inte nått taket).
      this._spawnT += dt
      if (this._spawnT >= SPAWN_EVERY) {
        this._spawnT = 0
        this._spawn(ctx)
      }

      // Uppdatera fallande frukter; fånga eller låt landa mjukt.
      for (let i = this._fruit.length - 1; i >= 0; i--) {
        const f = this._fruit[i]
        f.vy = Math.min(MAX_VY, f.vy + GRAVITY * dt)
        f.y += f.vy * dt
        const v = f.view
        if (v && !v.destroyed) {
          v.y = f.y
          v.rotation += f.spin * dt
        }
        if (f.y >= this._mouthY && f.y <= this._mouthY + CATCH_BAND && Math.abs(f.x - bx) <= CATCH_HALF) {
          this._fruit.splice(i, 1)
          this._catch(ctx, f)
        } else if (f.y >= this._groundY) {
          this._fruit.splice(i, 1)
          this._miss(ctx, f)
        }
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // En frukt direkt så det händer något på en gång.
    this._spawn(ctx)
    this._spawnT = 0
  },

  _spawn(ctx) {
    if (!this._alive) return
    if (this._fruit.length >= MAX_FRUIT) return
    const emoji = randomFrom(FRUITS)
    const x = 110 + Math.random() * (ctx.width - 220)
    const view = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 64 } })
    view.anchor.set(0.5)
    view.x = x
    view.y = -50
    view.eventMode = 'none'
    this._fruitLayer.addChild(view)
    bounceIn(view, { duration: 0.35 })
    this._fruit.push({ view, x, y: -50, vy: 20 + Math.random() * 30, spin: (Math.random() - 0.5) * 1.5 })
  },

  _catch(ctx, f) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('pop')
    sparkle(ctx.fxLayer, f.x, this._mouthY)
    if (this._basket && !this._basket.destroyed) pop(this._basket, { scale: 1.08 })

    // Frukten ploppar ner i korgen (exit-säker proxy-tween).
    this._tuck(f)

    // Lite glad krydda ibland — utan att spamma.
    if (Math.random() < 0.5) floatText(ctx.fxLayer, f.x, this._mouthY - 16, randomFrom(HAPPY_FX), { fontSize: 48 })
    const now = performance.now()
    if (Math.random() < 0.3 && now - this._lastVoice > 2500) {
      this._lastVoice = now
      ctx.services.voice.say(randomFrom(CATCH_PRAISE))
    }

    this._caught++
    if (this._caught % CATCH_GOAL === 0) ctx.progress.complete()
  },

  _miss(ctx, f) {
    if (!this._alive) return
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, f.x, this._groundY, { count: 7 })
    const v = f.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      v.destroy()
    }
  },

  // Tweena ett vanligt objekt och kopiera till frukten bara om den lever.
  // En frukt som förstörs (t.ex. vid spel-exit) hoppas över -> kan aldrig krascha.
  _tuck(f) {
    const v = f.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const bx = this._basket && !this._basket.destroyed ? this._basket.x : f.x
    const st = { x: f.x, y: f.y, s: v.scale.x || 1, a: 1 }
    const tw = gsap.to(st, {
      x: bx,
      y: this._mouthY + 34,
      s: 0.2,
      a: 0,
      duration: 0.34,
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
        const i = this._proxyTweens.indexOf(tw)
        if (i >= 0) this._proxyTweens.splice(i, 1)
        if (!v.destroyed) v.destroy()
      },
    })
    this._proxyTweens.push(tw)
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    if (this._basket && !this._basket.destroyed) {
      gsap.killTweensOf(this._basket)
      gsap.killTweensOf(this._basket.scale)
    }
    this._fruit.forEach((f) => {
      const v = f.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    })
    this._fruit = []
    this._proxyTweens.forEach((t) => t.kill())
    this._proxyTweens = []
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Söt flätad korg ritad programmatiskt. Origo (0,0) = mitten av öppningen (munnen);
// kroppen sträcker sig nedåt därifrån.
function makeBasket() {
  const c = new Container()
  const brown = COLORS.brown // 0x8a5a3b
  const dark = 0x6e4527
  const light = 0xa9744f
  const rim = 0x9a6438
  const hole = 0x533524

  // Handtag bakom allt (lätt båge över öppningen).
  const handle = new Graphics()
  handle.arc(0, -6, 96, Math.PI, 0, true).stroke({ width: 13, color: brown, cap: 'round' })
  c.addChild(handle)

  // Korgkropp.
  const body = new Graphics()
    .roundRect(-105, 6, 210, 122, 24)
    .fill(brown)
    .stroke({ width: 4, color: dark, alpha: 0.5 })
  // Flätmönster: lodräta + vågräta streck (håll inom kanten så hörnen ser fina ut).
  for (let x = -86; x <= 86; x += 24) {
    body.moveTo(x, 18).lineTo(x, 116)
  }
  body.stroke({ width: 5, color: dark, alpha: 0.35 })
  for (let y = 30; y <= 110; y += 26) {
    body.moveTo(-96, y).lineTo(96, y)
  }
  body.stroke({ width: 6, color: light, alpha: 0.4 })
  c.addChild(body)

  // Öppning (mörk insida) + tjock rimring runt munnen.
  const mouth = new Graphics()
    .ellipse(0, -4, 108, 22)
    .fill(hole)
    .ellipse(0, -4, 108, 22)
    .stroke({ width: 15, color: rim })
  c.addChild(mouth)

  return c
}
