// Hamburgerbygget — bygg & grilla (2–5 år). Sett FRÅN SIDAN: en underbulle ligger på
// fatet. Barnet DRAR ingredienser (sallad, ost, biff, tomat, bacon … och roliga grejer
// som bajs, strumpa, fisk, ben, stjärna!) från brädan och släpper på bygget → de STAPLAS
// mellan bröden, lager på lager. Locket (överbullen) lägger sig alltid överst. Sedan:
// tryck "Grilla" → hamburgaren åker till grillen och MÖRKNAR längs en ton-gradient över
// tid (rå → grillad → mörk → kol). Barnet tittar på färgen och trycker "Ta av" när den
// ser god ut. INGET kan bli fel: även becksvart är bara roligt, firande + klistermärke
// varje gång, sedan en ny burgare. Maten ritas i sidoprofil med Pixi Graphics (inga
// ikon-behållare); roliga grejer är emoji. Exit-säkert: tweens dödas, ticker tas bort.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, sparkle, puff, floatText } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const BUILD = { x: 410, y: 596 } // _burger-origo: fatets yta (underbullens botten)
const GRILL = { x: 1000, y: 430 }
const BAKE_SECONDS = 7.5
const BOTTOM_BUN_H = 50
const TOP_BUN_H = 62
const STACK_CAP_Y = -358 // sluta lägga på när stapeln är så här hög (no-fail "fullt")

const RECUE = [
  'Dra ingredienser mellan bröden!',
  'Stapla klart och tryck på Grilla!',
  'Bygg en rolig burgare — allt får plats!',
]
const PLACE_CHEERS = ['Mums!', 'En till!', 'Snyggt!', 'Oj!', 'Hög!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Ton-gradient (samma som ugnen): ljus → grillad → mörk → kol. Tint på hela burgaren.
function bakeTint(t) {
  if (t < 0.3) return lerpColor(0xffffff, 0xfbe6bf, t / 0.3)
  if (t < 0.55) return lerpColor(0xfbe6bf, 0xd99a44, (t - 0.3) / 0.25)
  if (t < 0.8) return lerpColor(0xd99a44, 0x8a5024, (t - 0.55) / 0.25)
  return lerpColor(0x8a5024, 0x2a2018, (t - 0.8) / 0.2)
}
function toneSpeech(t) {
  if (t < 0.22) return 'Nästan rå — men jättefin!'
  if (t < 0.68) return 'Saftig och nygrillad! Mums!'
  if (t < 0.9) return 'Lite mörk och knaprig!'
  return 'Hoppsan, alldeles bränd! Hihi!'
}

// --- Ingredienser i SIDOPROFIL (ritade) + roliga emoji-grejer ---
const FOODS = [
  { id: 'sallad', th: 30, make: makeLettuce },
  { id: 'ost', th: 24, make: makeCheese },
  { id: 'biff', th: 42, make: makePatty },
  { id: 'tomat', th: 28, make: makeTomato },
  { id: 'bacon', th: 22, make: makeBacon },
]
const FUN = [
  { id: 'bajs', th: 54, emoji: '💩' },
  { id: 'strumpa', th: 50, emoji: '🧦' },
  { id: 'fisk', th: 48, emoji: '🐟' },
  { id: 'ben', th: 46, emoji: '🦴' },
  { id: 'stjarna', th: 46, emoji: '⭐' },
]
const PALETTE = [...FOODS, ...FUN]

export default {
  id: 'hamburgerbygget',
  titleSv: 'Hamburgerbygget',
  icon: '🍔',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  voiceIntro: 'Bygg en hamburgare! Stapla ingredienser mellan bröden och grilla den sedan.',

  init(ctx) {
    this._alive = true
    this._phase = 'decorate'
    this._stack = []
    this._stackTopY = -BOTTOM_BUN_H
    this._idle = 0
    this._bake = 0
    this._lastPlaceCheer = 0
    this._lastSmoke = 0
    this._drag = null
    this._rounds = ctx.progress.get().custom?.burgare || 0

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))

    this._hint = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink } })
    this._hint.anchor.set(0.5)
    this._hint.position.set(640, 50)
    this._hint.eventMode = 'none'
    this._root.addChild(this._hint)

    // Grillen (höger).
    this._grill = this._buildGrill()
    this._root.addChild(this._grill)

    // Fat under bygget (stannar kvar när burgaren åker till grillen).
    this._plate = new Graphics()
      .ellipse(BUILD.x, BUILD.y + 18, 170, 30).fill({ color: COLORS.shadow, alpha: 0.12 })
      .ellipse(BUILD.x, BUILD.y + 8, 158, 26).fill(0xf3ead6).stroke({ width: 5, color: 0xe2d4b8 })
    this._plate.eventMode = 'none'
    this._root.addChild(this._plate)

    // Burgaren (underbulle + stapel + lock) som EN enhet.
    this._burger = new Container()
    this._burger.position.set(BUILD.x, BUILD.y)
    this._bottomBun = makeBunBottom()
    this._bottomBun.y = -BOTTOM_BUN_H / 2
    this._stackLayer = new Container()
    this._topBun = makeBunTop()
    this._burger.addChild(this._bottomBun, this._stackLayer, this._topBun)
    this._repositionTopBun()
    this._root.addChild(this._burger)

    // Ton-mätare (visas vid grillning), placeras i den tomma vänsterytan.
    this._meter = this._buildMeter()
    this._meter.visible = false
    this._root.addChild(this._meter)

    this._dragLayer = new Container()
    this._dragLayer.eventMode = 'none'
    this._root.addChild(this._dragLayer)

    this._buildPalette(ctx)

    this._grillBtn = new Button({
      label: 'Grilla', icon: '🔥', width: 240, height: 100, color: COLORS.orange,
      services: ctx.services, sound: 'whoosh', onTap: () => this._startGrill(ctx),
    })
    this._grillBtn.position.set(GRILL.x, 600)
    this._root.addChild(this._grillBtn)

    this._takeBtn = new Button({
      label: 'Ta av', icon: '🧤', width: 240, height: 100, color: COLORS.green,
      services: ctx.services, sound: 'pop', onTap: () => this._takeOff(ctx),
    })
    this._takeBtn.position.set(GRILL.x, 600)
    this._takeBtn.visible = false
    this._root.addChild(this._takeBtn)

    this._setHint('Bygg din hamburgare! 🍔')

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg-hjälpare ------------------------------------------------------

  _buildGrill() {
    const c = new Container()
    const { x, y } = GRILL
    // Ben.
    c.addChild(new Graphics()
      .moveTo(x - 150, y + 40).lineTo(x - 180, y + 150).stroke({ width: 12, color: 0x4a4a52, cap: 'round' })
      .moveTo(x + 150, y + 40).lineTo(x + 180, y + 150).stroke({ width: 12, color: 0x4a4a52, cap: 'round' }))
    // Eldlåda.
    c.addChild(new Graphics().roundRect(x - 185, y - 6, 370, 70, 18).fill(0x55505a).stroke({ width: 6, color: 0x3d3942 }))
    // Glöd (alpha höjs vid grillning).
    this._coals = new Graphics().roundRect(x - 168, y + 8, 336, 44, 12).fill({ color: 0xff6a1a, alpha: 0.25 })
    this._coals.eventMode = 'none'
    c.addChild(this._coals)
    // Lågor (flimrar vid grillning).
    this._flames = new Graphics()
    this._flames.eventMode = 'none'
    c.addChild(this._flames)
    this._drawFlames(0.25)
    // Galler (vågräta stänger ovanpå).
    const grate = new Graphics()
    for (let i = -160; i <= 160; i += 40) grate.roundRect(x + i - 6, y - 18, 12, 24, 5).fill(0x8a8690)
    grate.roundRect(x - 178, y - 20, 356, 9, 4).fill(0x9a96a0)
    c.addChild(grate)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  _drawFlames(intensity) {
    const g = this._flames
    if (!g || g.destroyed) return
    const { x, y } = GRILL
    g.clear()
    for (let i = -150; i <= 150; i += 50) {
      const h = (16 + Math.random() * 22) * (0.6 + intensity)
      const w = 16
      g.moveTo(x + i - w, y + 8).quadraticCurveTo(x + i, y + 8 - h, x + i + w, y + 8)
        .fill({ color: 0xff8a2a, alpha: 0.5 + intensity * 0.4 })
      g.moveTo(x + i - w * 0.5, y + 8).quadraticCurveTo(x + i, y + 8 - h * 0.6, x + i + w * 0.5, y + 8)
        .fill({ color: 0xffd23c, alpha: 0.5 + intensity * 0.4 })
    }
  },

  _buildMeter() {
    const c = new Container()
    c.position.set(BUILD.x, 470)
    c.eventMode = 'none'
    const w = 320
    const h = 30
    const bar = new Graphics()
    const steps = 40
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      bar.rect(-w / 2 + (i * w) / steps, -h / 2, w / steps + 1, h).fill(bakeTint(t))
    }
    bar.roundRect(-w / 2, -h / 2, w, h, h / 2).stroke({ width: 4, color: COLORS.white })
    c.addChild(bar)
    const yum = new Text({ text: '😋', style: { fontFamily: FONT.body, fontSize: 30 } })
    yum.anchor.set(0.5)
    yum.position.set(0, -h - 6)
    c.addChild(yum)
    this._marker = new Graphics().moveTo(0, -h / 2 - 4).lineTo(-9, -h / 2 - 20).lineTo(9, -h / 2 - 20).closePath().fill(COLORS.ink)
    this._marker.x = -w / 2
    c.addChild(this._marker)
    this._meterW = w
    return c
  },

  _buildPalette(ctx) {
    this._palette = new Container()
    this._root.addChild(this._palette)
    const n = PALETTE.length
    const x0 = 130
    const x1 = 1150
    const y = 672
    const shelf = new Graphics().roundRect(70, y - 52, 1140, 96, 28).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 4, color: 0xe6d8bf })
    shelf.eventMode = 'none'
    this._palette.addChild(shelf)
    this._paletteItems = []
    PALETTE.forEach((ing, i) => {
      const px = x0 + (n === 1 ? 0 : ((x1 - x0) * i) / (n - 1))
      const slot = new Container()
      slot.position.set(px, y)
      const view = ing.make ? ing.make() : makeEmoji(ing.emoji, ing.th)
      // Skala ner till brädan (sidoprofiler är breda).
      const s = ing.make ? 0.42 : 0.78
      view.scale.set(s)
      view.eventMode = 'none'
      slot.addChild(view)
      slot.eventMode = 'static'
      slot.cursor = 'pointer'
      slot.hitArea = new Circle(0, 0, 50)
      const onDown = (e) => this._startDrag(ctx, ing, e)
      slot.on('pointerdown', onDown)
      slot._onDown = onDown
      this._palette.addChild(slot)
      this._paletteItems.push(slot)
    })
  },

  // ---- Drag: bräda → stapel ----------------------------------------------

  _startDrag(ctx, ing, e) {
    if (!this._alive || this._phase !== 'decorate' || this._drag) return
    this._idle = 0
    ctx.services.audio.sfx('tap')
    const view = ing.make ? ing.make() : makeEmoji(ing.emoji, ing.th)
    view.eventMode = 'none'
    const p = this._root.toLocal(e.global)
    view.position.set(p.x, p.y)
    this._dragLayer.addChild(view)
    this._drag = { ing, view, src: e.currentTarget }
    pop(view)
    const move = (ev) => this._onDragMove(ev)
    const up = (ev) => this._onDragUp(ctx, ev)
    this._drag.move = move
    this._drag.up = up
    this._drag.src.on('globalpointermove', move)
    this._drag.src.on('pointerup', up)
    this._drag.src.on('pointerupoutside', up)
  },

  _onDragMove(e) {
    if (!this._alive || !this._drag) return
    const p = this._root.toLocal(e.global)
    this._drag.view.position.set(p.x, p.y)
  },

  _onDragUp(ctx, e) {
    if (!this._alive || !this._drag) return
    const d = this._drag
    d.src.off('globalpointermove', d.move)
    d.src.off('pointerup', d.up)
    d.src.off('pointerupoutside', d.up)
    this._drag = null
    if (d.view && !d.view.destroyed) d.view.destroy()

    const p = this._root.toLocal(e.global)
    const nearColumn = Math.abs(p.x - BUILD.x) < 170 && p.y < 640
    if (nearColumn && this._stackTopY > STACK_CAP_Y) {
      this._addLayer(ctx, d.ing)
    } else if (this._stackTopY <= STACK_CAP_Y) {
      ctx.services.voice.say('Den är jättehög! Dags att grilla?')
      pop(this._grillBtn)
    } else {
      puff(ctx.fxLayer, p.x, p.y, { count: 6 })
      ctx.services.audio.sfx('soft')
    }
  },

  _addLayer(ctx, ing) {
    const view = ing.make ? ing.make() : makeEmoji(ing.emoji, ing.th)
    view.x = (Math.random() - 0.5) * 26
    view.y = this._stackTopY - ing.th / 2
    view.rotation = (Math.random() - 0.5) * 0.05
    view.eventMode = 'none'
    this._stackLayer.addChild(view)
    this._stack.push(view)
    this._stackTopY -= ing.th
    this._repositionTopBun()
    bounceIn(view)
    sparkle(ctx.fxLayer, BUILD.x + view.x, BUILD.y + view.y, { count: 4 })
    ctx.services.audio.sfx('pop')
    const now = performance.now()
    if (now - this._lastPlaceCheer > 1400 && Math.random() < 0.5) {
      this._lastPlaceCheer = now
      ctx.services.voice.say(randomFrom(PLACE_CHEERS))
    }
  },

  _repositionTopBun() {
    if (this._topBun && !this._topBun.destroyed) this._topBun.y = this._stackTopY - TOP_BUN_H / 2
  },

  // ---- Grillning ----------------------------------------------------------

  _startGrill(ctx) {
    if (!this._alive || this._phase !== 'decorate') return
    if (this._stack.length === 0) {
      ctx.services.voice.say('Stapla något mellan bröden först!')
      this._paletteItems.forEach((it, i) => { if (i % 3 === 0 && !it.destroyed) wiggle(it) })
      return
    }
    this._phase = 'grilling'
    this._bake = 0
    this._idle = 0
    this._cancelDrag()
    this._setPaletteEnabled(false)
    this._grillBtn.visible = false
    this._setHint('Titta på färgen — ta av när den är klar!')
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('På grillen! Titta på färgen och ta av den när den ser god ut.')

    gsap.killTweensOf(this._burger)
    gsap.killTweensOf(this._burger.scale)
    gsap.to(this._burger, { x: GRILL.x, y: GRILL.y - 22, duration: 0.7, ease: 'power2.inOut' })
    gsap.to(this._burger.scale, { x: 0.74, y: 0.74, duration: 0.7, ease: 'power2.inOut' })

    this._meter.visible = true
    this._takeBtn.visible = true
    pop(this._takeBtn)
  },

  _update(ctx, t) {
    if (!this._alive) return
    const dt = (t.deltaMS || 16.67) / 1000

    if (this._phase === 'grilling') {
      this._bake = clamp(this._bake + dt / BAKE_SECONDS, 0, 1)
      this._burger.tint = bakeTint(this._bake)
      // Lågor + glöd reagerar på värmen.
      this._drawFlames(0.3 + this._bake * 0.7)
      if (this._coals && !this._coals.destroyed) this._coals.alpha = 0.25 + this._bake * 0.5
      if (this._marker) this._marker.x = -this._meterW / 2 + this._meterW * this._bake
      if (this._bake > 0.85) {
        const now = performance.now()
        if (now - this._lastSmoke > 420) {
          this._lastSmoke = now
          floatText(ctx.fxLayer, GRILL.x + (Math.random() * 90 - 45), GRILL.y - 120, '💨', { fontSize: 40, rise: 70 })
        }
      }
      if (this._bake >= 1 && !this._autoOff) {
        this._autoOff = gsap.delayedCall(1.8, () => { if (this._alive && this._phase === 'grilling') this._takeOff(ctx) })
      }
      return
    }

    if (this._phase === 'decorate') {
      // Lugn idle-flimmer på grillen.
      if ((performance.now() | 0) % 6 === 0) this._drawFlames(0.25)
      this._idle += dt
      if (this._idle > 6.5) {
        this._idle = 0
        ctx.services.voice.say(randomFrom(RECUE))
        if (this._stack.length === 0) this._paletteItems.forEach((it, i) => { if (i % 4 === 0 && !it.destroyed) pop(it) })
        else pop(this._grillBtn)
      }
    }
  },

  _takeOff(ctx) {
    if (!this._alive || this._phase !== 'grilling') return
    this._phase = 'reveal'
    this._autoOff?.kill()
    this._autoOff = null
    this._meter.visible = false
    this._takeBtn.visible = false
    this._drawFlames(0.25)
    if (this._coals && !this._coals.destroyed) this._coals.alpha = 0.25

    const tone = this._bake
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(toneSpeech(tone))

    gsap.killTweensOf(this._burger)
    gsap.killTweensOf(this._burger.scale)
    gsap.to(this._burger, { x: BUILD.x, y: BUILD.y, duration: 0.6, ease: 'power2.out' })
    gsap.to(this._burger.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.4)' })
    this._setHint(tone >= 0.9 ? 'Lite bränd — men rolig! 🤭' : 'Klar! Vilken läcker burgare! 🍔')

    sparkle(ctx.fxLayer, BUILD.x, BUILD.y - 120, { count: 10 })
    floatText(ctx.fxLayer, BUILD.x, BUILD.y - 200, tone >= 0.9 ? '🤭' : '😋', { fontSize: 60 })

    this._rounds += 1
    ctx.progress.setCustom('burgare', this._rounds)
    ctx.progress.setLevel(this._rounds)
    ctx.progress.complete()

    this._resetTimer = gsap.delayedCall(2.2, () => { if (this._alive) this._reset(ctx) })
  },

  _reset(ctx) {
    if (!this._alive) return
    this._phase = 'decorate'
    this._bake = 0
    this._idle = 0
    for (const v of this._stack) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      if (!v.destroyed) v.destroy()
    }
    this._stack = []
    this._stackTopY = -BOTTOM_BUN_H
    this._repositionTopBun()
    this._burger.tint = 0xffffff
    this._setPaletteEnabled(true)
    this._grillBtn.visible = true
    pop(this._grillBtn)
    this._setHint('En ny burgare! Bygg igen 🍔')
    ctx.services.voice.say('En ny burgare! Bygg igen.')
  },

  // ---- Hjälpare -----------------------------------------------------------

  _setHint(text) {
    if (this._hint && !this._hint.destroyed) this._hint.text = text
  },

  _setPaletteEnabled(on) {
    for (const it of this._paletteItems) {
      if (it.destroyed) continue
      it.eventMode = on ? 'static' : 'none'
      it.alpha = on ? 1 : 0.4
    }
  },

  _cancelDrag() {
    const d = this._drag
    if (!d) return
    d.src.off('globalpointermove', d.move)
    d.src.off('pointerup', d.up)
    d.src.off('pointerupoutside', d.up)
    if (d.view && !d.view.destroyed) d.view.destroy()
    this._drag = null
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._autoOff?.kill()
    this._resetTimer?.kill()
    this._cancelDrag()
    for (const it of this._paletteItems || []) {
      if (it && !it.destroyed) {
        it.off('pointerdown', it._onDown)
        gsap.killTweensOf(it)
        gsap.killTweensOf(it.scale)
      }
    }
    for (const v of this._stack || []) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
    }
    if (this._burger) {
      gsap.killTweensOf(this._burger)
      gsap.killTweensOf(this._burger.scale)
    }
    if (this._grillBtn) gsap.killTweensOf(this._grillBtn.scale)
    if (this._takeBtn) gsap.killTweensOf(this._takeBtn.scale)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Sidoprofil-ritning (centrerad kring 0,0) ===================

function makeBunBottom() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-112, -BOTTOM_BUN_H / 2, 224, BOTTOM_BUN_H, 16).fill(0xe2a763)
  g.roundRect(-112, -BOTTOM_BUN_H / 2, 224, 14, 16).fill({ color: 0xf2c489, alpha: 0.55 })
  g.roundRect(-112, BOTTOM_BUN_H / 2 - 14, 224, 14, 16).fill({ color: 0xc98f50, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makeBunTop() {
  const c = new Container()
  const g = new Graphics()
  // Kupol (rundad upptill, plan nedtill).
  g.roundRect(-116, -TOP_BUN_H / 2, 232, TOP_BUN_H, 30).fill(0xe8b06a)
  g.roundRect(-116, -TOP_BUN_H / 2, 232, 22, 30).fill({ color: 0xf3c98a, alpha: 0.6 })
  // Sesamfrön.
  for (let i = -78; i <= 78; i += 26) {
    g.ellipse(i + (Math.random() * 8 - 4), -TOP_BUN_H / 2 + 18, 5, 8).fill(0xfbe9c0)
  }
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makePatty() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-110, -21, 220, 42, 16).fill(0x6b4226)
  g.roundRect(-110, -21, 220, 12, 16).fill({ color: 0x8a5a36, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makeCheese() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-116, -11, 232, 22, 7).fill(0xffce4a)
  // Smältande hörn (droppar).
  g.moveTo(-86, 11).lineTo(-74, 30).lineTo(-62, 11).fill(0xffce4a)
  g.moveTo(58, 11).lineTo(70, 28).lineTo(82, 11).fill(0xffce4a)
  g.roundRect(-116, -11, 232, 7, 7).fill({ color: 0xffe08a, alpha: 0.7 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makeLettuce() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-120, -4, 240, 24, 12).fill(0x73c34a)
  for (let i = -110; i <= 110; i += 26) g.circle(i, -6, 17).fill(0x80cf57)
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makeTomato() {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 0, 104, 15).fill(0xff6b6b).stroke({ width: 3, color: 0xe85555 })
  for (let i = -60; i <= 60; i += 30) g.ellipse(i, 0, 5, 8).fill({ color: 0xffd0c0, alpha: 0.9 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makeBacon() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-108, -11, 216, 22, 8).fill(0xc0392b)
  g.roundRect(-108, -8, 216, 5, 4).fill({ color: 0xe8a0a0, alpha: 0.85 })
  g.roundRect(-108, 4, 216, 4, 4).fill({ color: 0xe8a0a0, alpha: 0.7 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function makeEmoji(emoji, th) {
  const c = new Container()
  const t = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: th + 18 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(t)
  return c
}
