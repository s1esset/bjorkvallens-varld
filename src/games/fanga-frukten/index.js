// Fånga Frukten — motorik-/fysik-lek (2–5 år). Frukter faller från trädet som RIKTIGA
// matter.js-kroppar under (mjuk) gravitation. Barnet drar korgen i sidled (ta i var
// som helst på skärmen) för att fånga dem. Korgen är en öppen skål i fysiken: två
// studsiga kantknoppar (rim) + en osynlig sensor i munnen som flyttas varje bildruta
// med korgen. Frukt som faller i munnen fångas (saftig plopp + räknas upp + gnistror);
// frukt som nuddar kanten studsar lekfullt; missad frukt landar mjukt med en liten puff
// och bestraffas ALDRIG. En snäll, växande "magnet" drar fallande frukt mot korgen så
// målet alltid går att nå. Fånga N frukter (växer med nivån) -> delat firande + ny nivå.
// Allt ritas programmatiskt (Pixi Graphics + emoji) och städas exit-säkert.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { puff, sparkle, floatText, bounceIn, pop, bigCelebration } from '../../lib/feedback.js'

const FRUITS = ['🍎', '🍌', '🍓', '🍐', '🍊', '🍇']
const HAPPY_FX = ['😋', '😄', '🎉', '⭐', '🍓']
const CATCH_PRAISE = ['Mums!', 'Nam nam!', 'Vad gott!', 'En till!']
const FULL_SAY = ['Hela korgen är full! Hurra!', 'Vilken fruktplockare!', 'Bravo! Så många frukter!']

// Fruktstorlekar -> radie + täthet (massa). Större frukt = lite tyngre (varierat fall).
const SIZES = [
  { fs: 52, dens: 0.0009 },
  { fs: 60, dens: 0.0011 },
  { fs: 70, dens: 0.0013 },
]

const MAX_FRUIT = 6 // tak för samtidiga frukter (lugnt + prestanda)
const GRAVITY_Y = 0.55 // mjuk matter-gravitation (litet barn ska hinna med)
const MAX_FALL = 8 // px/steg-tak på fallfart (≈480 px/s) så det aldrig blir för snabbt
const BASKET_HALF = 112 // halva korgbredden (klamp + handtag)
const BASKET_STEP_MAX = 26 // px/bildruta-tak på korgens rörelse (mjuk för fysik-kanterna)
const MOUTH_DX = 88 // kant-knopparnas offset från korgmitten
const RIM_R = 14 // kant-knoppens radie (lekfull studs)
const SENSOR_W = 156 // fångstsensorns bredd (generös, toddler-vänlig)
const SENSOR_H = 60 // ... och höjd (frukt hinner alltid registreras)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

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
    this._misses = 0
    this._busy = false // sant under nivåfirande (pausar spawn/räkning)
    this._dragging = false
    this._lastVoice = 0
    this._lastBounce = 0
    this._caughtEmojis = []
    this._fruit = [] // { body, view, emoji, caught }
    this._proxyTweens = [] // transienta "ner-i-korgen"-tweens (städas i destroy)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Glad äng (gradient-himmel + sol/moln/mark) — dekorativ.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Lövverk i toppen så frukten ser ut att falla ur trädet.
    const foliage = new Graphics()
    for (let x = -40; x <= ctx.width + 40; x += 108) foliage.circle(x, -6, 56).fill(0x6fb662)
    for (let x = 14; x <= ctx.width + 40; x += 108) foliage.circle(x, 22, 44).fill(0x5aa752)
    foliage.eventMode = 'none'
    this._root.addChild(foliage)

    this._mouthY = ctx.height - 150
    this._groundY = ctx.height - 24

    // Korgen: byggs runt origo där (0,0) = korgmunnen (mitten av öppningen).
    this._basket = makeBasket()
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

    // Räkne-mätare uppe i mitten (fruktplatser fylls för varje fångad frukt).
    this._buildMeter(ctx)

    // Fysik: mjuk gravitation + bara sidoväggar (eget golv hanteras geometriskt).
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Korgen i fysiken: två studsiga kant-knoppar + en sensor i munnen. Statiska kroppar
    // som flyttas varje bildruta med korgens x (mjuk rörelse -> inga teleport-smällar).
    const bx = this._basket.x
    this._rimL = this._phys.circle(bx - MOUTH_DX, this._mouthY, RIM_R, { isStatic: true, restitution: 0.35, friction: 0.4, label: 'rim' })
    this._rimR = this._phys.circle(bx + MOUTH_DX, this._mouthY, RIM_R, { isStatic: true, restitution: 0.35, friction: 0.4, label: 'rim' })
    this._sensor = this._phys.rectangle(bx, this._mouthY + 26, SENSOR_W, SENSOR_H, { isStatic: true, isSensor: true, label: 'basket' })

    this._bMin = BASKET_HALF + 8
    this._bMax = ctx.width - BASKET_HALF - 8

    // Hela skärmen är dragyta: ta i var som helst så glider korgen dit (i sidled).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    const setTarget = (ev) => {
      const lx = this._root.toLocal(ev.global).x
      this._targetX = clamp(lx, this._bMin, this._bMax)
      this._idle = 0
    }
    this._onDown = (ev) => {
      this._dragging = true
      setTarget(ev)
    }
    this._onMove = (ev) => {
      if (this._dragging) setTarget(ev)
    }
    this._onUp = () => {
      this._dragging = false
    }
    this._catcher.on('pointerdown', this._onDown)
    this._catcher.on('globalpointermove', this._onMove)
    this._catcher.on('pointerup', this._onUp)
    this._catcher.on('pointerupoutside', this._onUp)
    this._root.addChild(this._catcher)

    // Starta på sparad nivå.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    // En frukt direkt så det händer något på en gång.
    this._spawn(ctx)
    this._spawnT = 0
  },

  // ---- Nivå ---------------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._busy = false
    this._caught = 0
    this._misses = 0
    this._caughtEmojis = []
    this._goal = clamp(3 + level, 3, 6) // mål växer med nivån (3..6)
    this._spawnEvery = clamp(1.3 - level * 0.08, 0.85, 1.3) // släpps lite tätare högre upp
    this._spawnT = 0
    this._clearFruit()
    this._drawMeter()
  },

  // ---- Ticker: korgrörelse, fysik, spawn, miss-koll, idle -----------------

  _update(ctx, t) {
    if (!this._alive) return
    const dt = Math.min(0.05, (t.deltaMS || 16.67) / 1000)
    this._phys.update(t.deltaMS)

    // Korgen glider mjukt mot fingrets x (bildtaktsoberoende lerp + fartgräns).
    const b = this._basket
    if (b && !b.destroyed) {
      let dx = (this._targetX - b.x) * Math.min(1, dt * 18)
      dx = clamp(dx, -BASKET_STEP_MAX, BASKET_STEP_MAX)
      b.x += dx
    }
    const bx = b && !b.destroyed ? b.x : ctx.width / 2

    // Flytta korgens fysik-kroppar med korgen (bara x ändras).
    if (this._rimL) Body.setPosition(this._rimL, { x: bx - MOUTH_DX, y: this._mouthY })
    if (this._rimR) Body.setPosition(this._rimR, { x: bx + MOUTH_DX, y: this._mouthY })
    if (this._sensor) Body.setPosition(this._sensor, { x: bx, y: this._mouthY + 26 })

    // Släpp ny frukt med jämna mellanrum (ej under firande, ej över taket).
    if (!this._busy) {
      this._spawnT += dt
      if (this._spawnT >= this._spawnEvery) {
        this._spawnT = 0
        this._spawn(ctx)
      }
    }

    // Snäll, växande magnet drar fallande frukt mot korgen (no-fail-garanti). Liten
    // vid 0 missar (barnet styr själv), starkare efter missar så det alltid lyckas.
    const m = Math.min(this._misses, 6)
    const assistA = 0.0005 * (1 + m * 1.3)
    for (let i = this._fruit.length - 1; i >= 0; i--) {
      const f = this._fruit[i]
      if (!f.body || f.caught) continue
      const pos = f.body.position
      if (pos.y > 100 && pos.y < this._mouthY - 6) {
        const factor = clamp((bx - pos.x) / 220, -1, 1)
        Body.applyForce(f.body, pos, { x: f.body.mass * assistA * factor, y: 0 })
      }
      // Fartgräns nedåt så det aldrig blir för snabbt för ett litet barn.
      if (f.body.velocity.y > MAX_FALL) Body.setVelocity(f.body, { x: f.body.velocity.x, y: MAX_FALL })
      // Nådde marken utan att fångas -> mjuk miss (aldrig straff).
      if (pos.y > this._groundY) this._missFruit(ctx, f)
    }

    // Tyst påminnelse om ingen rört skärmen på ett tag.
    if (!this._busy) {
      this._idle += dt
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
      }
    }
  },

  // ---- Spawn --------------------------------------------------------------

  _spawn(ctx) {
    if (!this._alive || this._busy) return
    if (this._fruit.length >= MAX_FRUIT) return
    const def = randomFrom(SIZES)
    const emoji = randomFrom(FRUITS)
    const bx = this._basket && !this._basket.destroyed ? this._basket.x : ctx.width / 2
    // Efter ett par missar: släpp frukten rakt över korgen (extra snäll hjälp).
    let x
    if (this._misses >= 3) x = clamp(bx + (Math.random() - 0.5) * 120, 120, ctx.width - 120)
    else x = 120 + Math.random() * (ctx.width - 240)

    const r = def.fs * 0.4
    const view = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: def.fs } })
    view.anchor.set(0.5)
    view.eventMode = 'none'
    view.x = x
    view.y = -40
    this._fruitLayer.addChild(view)
    bounceIn(view, { duration: 0.35 })

    const body = this._phys.circle(x, -40, r, {
      restitution: 0.32,
      friction: 0.4,
      frictionAir: 0.03, // luftmotstånd -> mjukt, lite svävande fall
      density: def.dens,
      label: 'fruit',
    })
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12) // gullig långsam snurr
    this._phys.link(body, view)
    this._fruit.push({ body, view, emoji, caught: false })
  },

  // ---- Kollisioner: fångst (sensor) + lekfull kant-studs (rim) -------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      const la = a.label
      const lb = b.label

      // Fångst: frukt i munnen (sensor).
      if ((la === 'basket' && lb === 'fruit') || (lb === 'basket' && la === 'fruit')) {
        const fb = la === 'fruit' ? a : b
        const f = this._fruitByBody(fb)
        if (f && !f.caught && fb.velocity.y > -1.5) this._catchFruit(ctx, f)
        continue
      }

      // Lekfull studs mot korgkanten (rim) — mjukt ljud + liten puff.
      if ((la === 'rim' && lb === 'fruit') || (lb === 'rim' && la === 'fruit')) {
        const now = performance.now()
        if (now - this._lastBounce > 130) {
          this._lastBounce = now
          ctx.services.audio.sfx('soft')
          const fb = la === 'fruit' ? a : b
          puff(ctx.fxLayer, fb.position.x, fb.position.y, { count: 3 })
        }
      }
    }
  },

  _fruitByBody(body) {
    for (const f of this._fruit) if (f.body === body) return f
    return null
  },

  // ---- Fångad frukt: plopp, räkna upp, ploppa ner i korgen ----------------

  _catchFruit(ctx, f) {
    if (!this._alive || f.caught) return
    f.caught = true
    const i = this._fruit.indexOf(f)
    if (i >= 0) this._fruit.splice(i, 1)
    if (f.body) this._phys.removeBody(f.body)

    this._misses = 0
    this._idle = 0
    ctx.services.audio.sfx('pop')
    const bx = this._basket && !this._basket.destroyed ? this._basket.x : f.view.x
    sparkle(ctx.fxLayer, bx, this._mouthY, { count: 6 })
    if (this._basket && !this._basket.destroyed) pop(this._basket, { scale: 1.08 })

    // Frukten ploppar ner i korgen (exit-säker proxy-tween).
    this._tuck(f, bx)

    // Lite glad krydda ibland — utan att spamma.
    if (Math.random() < 0.5) floatText(ctx.fxLayer, bx, this._mouthY - 16, randomFrom(HAPPY_FX), { fontSize: 46 })
    const now = performance.now()
    if (Math.random() < 0.35 && now - this._lastVoice > 2200) {
      this._lastVoice = now
      ctx.services.voice.say(randomFrom(CATCH_PRAISE))
    }

    if (this._busy) return // under firande: visa fångsten men räkna inte mot nästa nivå
    this._caught++
    this._caughtEmojis.push(f.emoji)
    this._drawMeter()
    if (this._meterLayer && !this._meterLayer.destroyed) pop(this._meterLayer, { scale: 1.06 })
    if (this._caught >= this._goal) this._levelComplete(ctx)
  },

  // ---- Missad frukt: mjuk puff, ALDRIG straff -----------------------------

  _missFruit(ctx, f) {
    if (!this._alive) return
    const i = this._fruit.indexOf(f)
    if (i >= 0) this._fruit.splice(i, 1)
    const px = f.body ? f.body.position.x : f.view.x
    if (f.body) this._phys.removeBody(f.body)

    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, px, this._groundY, { count: 7 })
    const v = f.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      v.destroy()
    }
    this._misses++
  },

  // Tweena ett vanligt objekt och kopiera till frukten bara om den lever.
  // En frukt som förstörs (t.ex. vid spel-exit) hoppas över -> kan aldrig krascha.
  _tuck(f, bx) {
    const v = f.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { x: v.x, y: v.y, s: v.scale.x || 1, a: 1 }
    const tw = gsap.to(st, {
      x: bx,
      y: this._mouthY + 40,
      s: 0.18,
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
        const idx = this._proxyTweens.indexOf(tw)
        if (idx >= 0) this._proxyTweens.splice(idx, 1)
        if (!v.destroyed) v.destroy()
      },
    })
    this._proxyTweens.push(tw)
  },

  // ---- Mål nått: firande + ny nivå ----------------------------------------

  _levelComplete(ctx) {
    if (!this._alive || this._busy) return
    this._busy = true

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(FULL_SAY))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    const bx = this._basket && !this._basket.destroyed ? this._basket.x : ctx.width / 2
    sparkle(ctx.fxLayer, bx, this._mouthY, { count: 10 })
    if (this._basket && !this._basket.destroyed) pop(this._basket, { scale: 1.18 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._levelTimer?.kill()
    this._levelTimer = gsap.delayedCall(1.9, () => {
      if (!this._alive) return
      ctx.services.voice.say('Fler frukter!')
      this._loadLevel(ctx, this._level)
    })
  },

  // ---- Mätare -------------------------------------------------------------

  _buildMeter(ctx) {
    this._meterLayer = new Container()
    this._meterLayer.position.set(ctx.width / 2, 58)
    this._meterLayer.eventMode = 'none'
    this._meterLayer.interactiveChildren = false
    this._root.addChild(this._meterLayer)
  },

  _drawMeter() {
    const layer = this._meterLayer
    if (!layer || layer.destroyed) return
    for (const c of [...layer.children]) c.destroy()
    const n = this._goal || 3
    const gap = 58
    const startX = -((n - 1) * gap) / 2

    // Mjuk panel bakom så mätaren syns över lövverket.
    const bg = new Graphics().roundRect(startX - 96, -34, (n - 1) * gap + 96 + 40, 68, 34).fill({ color: 0x000000, alpha: 0.18 })
    layer.addChild(bg)

    const basket = new Text({ text: '🧺', style: { fontFamily: FONT.body, fontSize: 44 } })
    basket.anchor.set(0.5)
    basket.position.set(startX - 66, 0)
    layer.addChild(basket)

    for (let i = 0; i < n; i++) {
      const x = startX + i * gap
      const slot = new Graphics().circle(x, 0, 24).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: COLORS.green })
      layer.addChild(slot)
      if (i < this._caught) {
        const e = this._caughtEmojis[i] || '🍎'
        const t = new Text({ text: e, style: { fontFamily: FONT.body, fontSize: 34 } })
        t.anchor.set(0.5)
        t.position.set(x, 0)
        layer.addChild(t)
      }
    }
  },

  // ---- Städning -----------------------------------------------------------

  _clearFruit() {
    for (const f of this._fruit) {
      if (f.body) this._phys.removeBody(f.body)
      const v = f.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    this._fruit = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._levelTimer?.kill()

    if (this._catcher && !this._catcher.destroyed) {
      this._catcher.off('pointerdown', this._onDown)
      this._catcher.off('globalpointermove', this._onMove)
      this._catcher.off('pointerup', this._onUp)
      this._catcher.off('pointerupoutside', this._onUp)
    }
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
    if (this._meterLayer && !this._meterLayer.destroyed) gsap.killTweensOf(this._meterLayer.scale)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
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
