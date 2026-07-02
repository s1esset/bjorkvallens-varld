// Pizzabageriet — fri skaparlek + "passa färgen" (2–5 år). Barnet PYNTAR en pizza
// uppifrån: dra valfria ingredienser (mat, fisk, bajs, strumpa, tand … allt går!) från
// brädan ner på degen och släpp var som helst → fri placering + valfri mängd ger
// mönster och färgglada former (INGA ikon-behållare, själva saken visas i fullstorlek).
// Ingredienshyllan har MÅNGA saker → svep/dra i hyllan (eller pilarna) för att bläddra;
// ett tryck lägger på pizzan direkt (tap-fallback). Placerade ingredienser blir STORA.
// Sedan: tryck "Grädda" → pizzan åker in i ugnen och MÖRKNAR långsamt (en ton-gradient
// över tid: ljus → gyllene → brun → kol). Barnet tittar på färgen och trycker "Ta ut"
// när den ser god ut. INGET kan bli fel: även becksvart är bara roligt ("Hihi, bränd!"),
// firande + klistermärke varje gång, sedan en ny pizza. Allt ritas programmatiskt
// (Pixi Graphics + emoji). Exit-säkert: tweens dödas, ticker tas bort, _root förstörs.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { createScene } from '../../lib/scene.js'
import { BAKE_SECONDS, makeBakeTint, toneSpeech, buildToneMeter } from '../../lib/cooking.js'
import { bounceIn, pop, wiggle, sparkle, puff, floatText } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Ingredienser (visas som själva saken — ingen ikon-bricka). Mat + fisk + roliga grejer.
// Grunduppsättning + 25 extra "slumpiga" toppings → svepbar hylla.
const BASE_ITEMS = ['🍅', '🍄', '🫑', '🧀', '🌽', '🍍', '🐟', '🦐', '💩', '🧦', '🦷', '⭐']
const EXTRA_ITEMS = [
  '🥓', '🥦', '🥕', '🌶️', '🫒', '🧅', '🧄', '🥚', '🍗', '🍖', '🥩', '🍳', '🦑',
  '🦀', '🐙', '🍋', '🍇', '🍫', '🍬', '🍩', '🥨', '🥜', '🌰', '🐛', '🦴',
]
const ALL_ITEMS = [...BASE_ITEMS, ...EXTRA_ITEMS]

const PIZZA = { x: 430, y: 330, r: 196 }
const OVEN = { x: 1060, y: 332 }
const BTN = { x: 749, y: 330 } // Grädda/Ta ut: mellan pizzan och ugnen (ej över hyllan)
const MAX_TOPPINGS = 60
const PLACED_FONT = 140 // ~2.5× hyllstorleken (56) — stora, tydliga toppings på pizzan

// Svepbar hylla.
const SHELF_Y = 672
const SHELF_VX0 = 150 // synligt fönster (vänster)
const SHELF_VX1 = 1130 // synligt fönster (höger)
const ITEM_STEP = 104

// Ton-gradient för degen: ljus → gyllene → brun → kol.
const bakeTint = makeBakeTint([0xffffff, 0xfff0c8, 0xe8b25a, 0x9a5a2c, 0x2e241c])

const RECUE = [
  'Dra ingredienser på pizzan! Allt får plats.',
  'Pynta klart och tryck på Grädda!',
  'Gör ett roligt mönster på pizzan!',
]
const PLACE_CHEERS = ['Mums!', 'Fin!', 'En till!', 'Snyggt!', 'Oj!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'pizzabageriet',
  titleSv: 'Pizzabageriet',
  icon: '🍕',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  voiceIntro: 'Pynta din pizza! Dra ingredienser på degen och grädda den sedan i ugnen.',

  init(ctx) {
    this._alive = true
    this._phase = 'decorate' // 'decorate' | 'baking' | 'reveal'
    this._toppings = []
    this._idle = 0
    this._bake = 0 // 0..1 doneness
    this._lastPlaceCheer = 0
    this._lastSmoke = 0
    this._grab = null
    this._rounds = ctx.progress.get().custom?.pizzor || 0
    // Slumpad ordning på hyllan så två sessioner inte ser lika ut.
    this._items = shuffle(ALL_ITEMS.slice())

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Varm köks-bakgrund (dekor).
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))

    // Instruktion (uppdateras per fas).
    this._hint = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink } })
    this._hint.anchor.set(0.5)
    this._hint.position.set(640, 50)
    this._hint.eventMode = 'none'
    this._root.addChild(this._hint)

    // Ugnen (höger). Glöd + rök läggs ovanpå när det gräddas.
    this._oven = this._buildOven()
    this._root.addChild(this._oven)

    // Fat/peel under pizzan (stannar kvar när pizzan åker in i ugnen).
    this._plate = new Graphics()
      .ellipse(PIZZA.x, PIZZA.y + 14, PIZZA.r + 30, PIZZA.r + 18).fill({ color: COLORS.shadow, alpha: 0.1 })
      .circle(PIZZA.x, PIZZA.y, PIZZA.r + 22).fill(0xf3ead6).stroke({ width: 6, color: 0xe2d4b8 })
    this._plate.eventMode = 'none'
    this._root.addChild(this._plate)

    // Pizzan (bas + topping-lager). Flyttas/tintar som EN enhet.
    this._pizza = new Container()
    this._pizza.position.set(PIZZA.x, PIZZA.y)
    this._buildBase()
    this._toppingLayer = new Container()
    this._toppingLayer.eventMode = 'none'
    this._pizza.addChild(this._toppingLayer)
    this._root.addChild(this._pizza)

    // Ton-mätare (visas under gräddning) — gradient + markör = "titta på färgen".
    const meter = buildToneMeter({ width: 340, tint: bakeTint })
    this._meter = meter.container
    this._setMeterProgress = meter.setProgress
    this._meter.position.set(OVEN.x, 600)
    this._meter.visible = false
    this._root.addChild(this._meter)

    // Doneness-ring runt pizzan i ugnen: färgen visas PÅ pizzan (blick + färg på samma plats).
    this._doneRing = new Graphics()
    this._doneRing.eventMode = 'none'
    this._doneRing.visible = false
    this._root.addChild(this._doneRing)

    // Hungrig kund (Bobo): väntar och mumsar en bit pizza när den serveras (pattern #2).
    this._customerBase = { x: 195, y: 150 }
    this._customer = makeMascot(56)
    this._customer.position.set(this._customerBase.x, this._customerBase.y)
    this._customer.eventMode = 'none'
    this._root.addChild(this._customer)

    // Ingrediens-bräda nederst (svepbar hylla, oändlig påfyllning).
    this._buildPalette(ctx)

    // Drag-lager överst (kopior som dras ligger här).
    this._dragLayer = new Container()
    this._dragLayer.eventMode = 'none'
    this._root.addChild(this._dragLayer)

    // Knappar: Grädda (decorate) / Ta ut (baking) — växlar synlighet. Mellan pizza & ugn.
    this._bakeBtn = new Button({
      label: 'Grädda', icon: '🔥', width: 190, height: 100, color: COLORS.orange,
      services: ctx.services, sound: 'whoosh', onTap: () => this._startBake(ctx),
    })
    this._bakeBtn.position.set(BTN.x, BTN.y)
    this._root.addChild(this._bakeBtn)

    this._takeBtn = new Button({
      label: 'Ta ut', icon: '🧤', width: 190, height: 100, color: COLORS.green,
      services: ctx.services, sound: 'pop', onTap: () => this._takeOut(ctx),
    })
    this._takeBtn.position.set(BTN.x, BTN.y)
    this._takeBtn.visible = false
    this._root.addChild(this._takeBtn)

    this._setHint('Pynta din pizza! 🍕')

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg-hjälpare ------------------------------------------------------

  _buildBase() {
    const r = PIZZA.r
    const base = new Graphics()
      .circle(0, 0, r).fill(0xe7a85d) // skorpa
      .circle(0, 0, r - 20).fill(0xefb86b) // inre skorpa
      .circle(0, 0, r - 30).fill(0xcf4326) // tomatsås
      .circle(0, 0, r - 44).fill(0xf3cd63) // ost
    // Lite ost-fläckar för liv.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rr = (r - 70) * (0.3 + Math.random() * 0.6)
      base.circle(Math.cos(a) * rr, Math.sin(a) * rr, 8 + Math.random() * 6).fill({ color: 0xfbe08a, alpha: 0.7 })
    }
    base.eventMode = 'none'
    this._pizza.addChild(base)
  },

  _buildOven() {
    const c = new Container()
    const { x, y } = OVEN
    // Kropp.
    c.addChild(new Graphics().roundRect(x - 210, y - 196, 420, 432, 36).fill(0x55505a).stroke({ width: 8, color: 0x3d3942 }))
    // Övre kontrollpanel + vred.
    c.addChild(new Graphics().roundRect(x - 190, y - 188, 380, 52, 18).fill(0x6b6570))
    c.addChild(new Graphics().circle(x - 130, y - 162, 16).fill(0xd9d2c2).circle(x - 70, y - 162, 16).fill(0xd9d2c2))
    // Lucka/öppning (mörk håla).
    c.addChild(new Graphics().roundRect(x - 168, y - 110, 336, 320, 28).fill(0x6b6570))
    this._cavity = new Graphics().roundRect(x - 150, y - 92, 300, 286, 22).fill(0x1d1a20)
    c.addChild(this._cavity)
    // Värmeglöd (alpha höjs under gräddning).
    this._glow = new Graphics().roundRect(x - 150, y - 92, 300, 286, 22).fill({ color: 0xff7a1a, alpha: 0 })
    this._glow.eventMode = 'none'
    c.addChild(this._glow)
    // Glas (svag reflex).
    c.addChild(new Graphics().roundRect(x - 150, y - 92, 300, 286, 22).fill({ color: 0xffffff, alpha: 0.06 }).roundRect(x - 140, y - 84, 120, 60, 16).fill({ color: 0xffffff, alpha: 0.08 }))
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // ---- Svepbar ingredienshylla -------------------------------------------

  _buildPalette(ctx) {
    // Hyll-dekor (mjuk bakgrund, hela bredden).
    const shelf = new Graphics().roundRect(70, SHELF_Y - 52, 1140, 96, 28).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 4, color: 0xe6d8bf })
    shelf.eventMode = 'none'
    this._root.addChild(shelf)

    // Klippt fönster (mask) så saker utanför hyllan inte syns.
    this._paletteViewport = new Container()
    this._root.addChild(this._paletteViewport)
    const maskG = new Graphics().roundRect(SHELF_VX0, SHELF_Y - 50, SHELF_VX1 - SHELF_VX0, 100, 22).fill(0xffffff)
    this._paletteViewport.addChild(maskG)
    this._paletteViewport.mask = maskG

    // Strippen som scrollas (alla ingredienser i en lång rad).
    this._paletteStrip = new Container()
    this._paletteViewport.addChild(this._paletteStrip)

    this._paletteItems = []
    this._items.forEach((emoji, i) => {
      const it = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 56 } })
      it.anchor.set(0.5)
      it.position.set(i * ITEM_STEP, SHELF_Y) // lokal x i strippen
      it.eventMode = 'static'
      it.cursor = 'pointer'
      it.hitArea = new Circle(0, 0, 50) // ≥96px träff
      const onDown = (e) => this._onItemDown(ctx, emoji, it, e)
      it.on('pointerdown', onDown)
      it._onDown = onDown
      this._paletteStrip.addChild(it)
      this._paletteItems.push(it)
    })

    // Scroll-gränser (strip.x).
    const contentW = (this._items.length - 1) * ITEM_STEP
    this._scrollMax = SHELF_VX0 + 40 // första saken vid vänsterkanten
    this._scrollMin = Math.min(this._scrollMax, SHELF_VX1 - 40 - contentW)
    this._paletteStrip.x = this._scrollMax
    this._paletteStrip.y = 0

    // Pilar för att bläddra (tap) — komplement till svep.
    this._arrows = []
    const mkArrow = (x, char, dir) => {
      const a = new Container()
      a.position.set(x, SHELF_Y)
      a.addChild(new Graphics().circle(0, 0, 34).fill({ color: COLORS.orange, alpha: 0.95 }).stroke({ width: 4, color: 0xffffff }))
      const t = new Text({ text: char, style: { fontFamily: FONT.body, fontSize: 34, fontWeight: '900', fill: 0xffffff } })
      t.anchor.set(0.5)
      a.addChild(t)
      a.eventMode = 'static'
      a.cursor = 'pointer'
      a.hitArea = new Circle(0, 0, 48)
      const onTap = () => this._pageShelf(ctx, dir)
      a.on('pointertap', onTap)
      a._onTap = onTap
      this._root.addChild(a)
      this._arrows.push(a)
    }
    mkArrow(102, '◀', +1) // visa tidigare
    mkArrow(1178, '▶', -1) // visa senare
  },

  _pageShelf(ctx, dir) {
    if (!this._alive || this._phase !== 'decorate') return
    this._idle = 0
    const target = clamp(this._paletteStrip.x + dir * 560, this._scrollMin, this._scrollMax)
    gsap.killTweensOf(this._paletteStrip)
    gsap.to(this._paletteStrip, { x: target, duration: 0.32, ease: 'power2.out' })
    ctx.services.audio.sfx('tap')
  },

  // ---- Gest: tap / drag-till-pizza / svep-scroll (disambiguering) ----------

  _onItemDown(ctx, emoji, item, e) {
    if (!this._alive || this._phase !== 'decorate' || this._grab) return
    this._idle = 0
    gsap.killTweensOf(this._paletteStrip)
    const move = (ev) => this._onGrabMove(ctx, ev)
    const up = (ev) => this._onGrabUp(ctx, ev)
    this._grab = {
      emoji, src: item, mode: 'undecided', ghost: null,
      startX: e.global.x, startY: e.global.y, startScroll: this._paletteStrip.x, move, up,
    }
    item.on('globalpointermove', move)
    item.on('pointerup', up)
    item.on('pointerupoutside', up)
  },

  _onGrabMove(ctx, e) {
    const g = this._grab
    if (!g) return
    const dx = e.global.x - g.startX
    const dy = e.global.y - g.startY
    if (g.mode === 'undecided') {
      if (Math.hypot(dx, dy) < 14) return
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        g.mode = 'scroll' // vågrätt drag → bläddra hyllan
      } else {
        g.mode = 'drag' // uppåt/lodrätt → dra ut en ingrediens
        ctx.services.audio.sfx('tap')
        const view = new Text({ text: g.emoji, style: { fontFamily: FONT.body, fontSize: 64 } })
        view.anchor.set(0.5)
        view.eventMode = 'none'
        const p = this._root.toLocal(e.global)
        view.position.set(p.x, p.y)
        this._dragLayer.addChild(view)
        g.ghost = view
        pop(view)
      }
    }
    if (g.mode === 'scroll') {
      this._paletteStrip.x = clamp(g.startScroll + dx, this._scrollMin, this._scrollMax)
    } else if (g.mode === 'drag' && g.ghost && !g.ghost.destroyed) {
      const p = this._root.toLocal(e.global)
      g.ghost.position.set(p.x, p.y)
    }
  },

  _onGrabUp(ctx, e) {
    const g = this._grab
    if (!g) return
    g.src.off('globalpointermove', g.move)
    g.src.off('pointerup', g.up)
    g.src.off('pointerupoutside', g.up)
    this._grab = null

    if (g.mode === 'drag') {
      const local = this._pizza.toLocal(e.global)
      const dist = Math.hypot(local.x, local.y)
      if (dist <= PIZZA.r - 14 && this._toppings.length < MAX_TOPPINGS) {
        this._placeTopping(ctx, g.emoji, local.x, local.y)
      } else {
        const rp = this._root.toLocal(e.global)
        puff(ctx.fxLayer, rp.x, rp.y, { count: 6 })
        ctx.services.audio.sfx('soft')
      }
      if (g.ghost && !g.ghost.destroyed) g.ghost.destroy()
    } else if (g.mode === 'undecided') {
      // Rent tryck (ingen rörelse) = tap-fallback: lägg på pizzan på en slumpad plats.
      this._tapPlace(ctx, g.emoji)
    } else {
      // scroll settle
      ctx.services.audio.sfx('soft')
    }
  },

  _tapPlace(ctx, emoji) {
    if (this._toppings.length >= MAX_TOPPINGS) return
    const a = Math.random() * Math.PI * 2
    const rr = (PIZZA.r - 60) * Math.sqrt(Math.random()) * 0.9
    this._placeTopping(ctx, emoji, Math.cos(a) * rr, Math.sin(a) * rr)
  },

  _placeTopping(ctx, emoji, lx, ly) {
    // Placerad ingrediens = STOR (2.5× hyllstorleken) för tydliga, saftiga former.
    const t = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: PLACED_FONT } })
    t.anchor.set(0.5)
    t.position.set(lx, ly)
    t.rotation = (Math.random() - 0.5) * 0.5
    t.eventMode = 'none'
    this._toppingLayer.addChild(t)
    this._toppings.push(t)
    bounceIn(t)
    sparkle(ctx.fxLayer, this._pizza.x + lx, this._pizza.y + ly, { count: 5 })
    ctx.services.audio.sfx('pop')
    const now = performance.now()
    if (now - this._lastPlaceCheer > 1400 && Math.random() < 0.5) {
      this._lastPlaceCheer = now
      ctx.services.voice.say(randomFrom(PLACE_CHEERS))
    }
  },

  // ---- Gräddning ----------------------------------------------------------

  _startBake(ctx) {
    if (!this._alive || this._phase !== 'decorate') return
    if (this._toppings.length === 0) {
      // Mjuk knuff: lägg på något först (men aldrig ett "fel").
      ctx.services.voice.say('Lägg på lite topping först!')
      this._paletteItems.forEach((it, i) => { if (i % 3 === 0 && !it.destroyed) wiggle(it) })
      return
    }
    this._phase = 'baking'
    this._bake = 0
    this._idle = 0
    this._setPaletteEnabled(false)
    this._bakeBtn.visible = false
    this._setHint('Titta på färgen — ta ut när den är klar!')
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('In i ugnen! Titta på färgen och ta ut den när den ser god ut.')

    // Pizzan åker in i ugnen (krymper för att passa hålan).
    gsap.killTweensOf(this._pizza)
    gsap.killTweensOf(this._pizza.scale)
    gsap.to(this._pizza, { x: OVEN.x, y: OVEN.y, duration: 0.7, ease: 'power2.inOut' })
    gsap.to(this._pizza.scale, { x: 0.62, y: 0.62, duration: 0.7, ease: 'power2.inOut' })

    this._meter.visible = true
    this._doneRing.visible = true
    this._takeBtn.visible = true
    pop(this._takeBtn)
  },

  _update(ctx, t) {
    if (!this._alive) return
    const dt = (t.deltaMS || 16.67) / 1000

    if (this._phase === 'baking') {
      this._bake = clamp(this._bake + dt / BAKE_SECONDS, 0, 1)
      this._pizza.tint = bakeTint(this._bake)
      // Glöd + markör.
      if (this._glow && !this._glow.destroyed) this._glow.alpha = 0.12 + 0.22 * Math.min(1, this._bake * 1.3)
      this._setMeterProgress(this._bake)
      // Doneness-ring runt pizzan — färgen visas PÅ pizzan (blick + färg samlas).
      if (this._doneRing && !this._doneRing.destroyed) {
        this._doneRing.clear()
        const rr = PIZZA.r * (this._pizza.scale.x || 1) + 14
        this._doneRing.circle(this._pizza.x, this._pizza.y, rr).stroke({ width: 8, color: bakeTint(this._bake), alpha: 0.9 })
      }
      // Rök när den börjar bli mörk.
      if (this._bake > 0.85) {
        const now = performance.now()
        if (now - this._lastSmoke > 420) {
          this._lastSmoke = now
          floatText(ctx.fxLayer, OVEN.x + (Math.random() * 80 - 40), OVEN.y - 120, '💨', { fontSize: 40, rise: 70 })
        }
      }
      // Becksvart → vänta kort, ta sedan ut automatiskt (no-fail, ingen evig loop).
      if (this._bake >= 1 && !this._autoOut) {
        this._autoOut = gsap.delayedCall(1.8, () => { if (this._alive && this._phase === 'baking') this._takeOut(ctx) })
      }
      return
    }

    if (this._phase === 'decorate') {
      this._idle += dt
      if (this._idle > 6.5) {
        this._idle = 0
        ctx.services.voice.say(randomFrom(RECUE))
        if (this._toppings.length === 0) this._paletteItems.forEach((it, i) => { if (i % 4 === 0 && !it.destroyed) pop(it) })
        else pop(this._bakeBtn)
      }
    }
  },

  _takeOut(ctx) {
    if (!this._alive || this._phase !== 'baking') return
    this._phase = 'reveal'
    this._autoOut?.kill()
    this._autoOut = null
    this._meter.visible = false
    this._takeBtn.visible = false
    if (this._glow && !this._glow.destroyed) this._glow.alpha = 0
    if (this._doneRing && !this._doneRing.destroyed) {
      this._doneRing.clear()
      this._doneRing.visible = false
    }

    const tone = this._bake
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(toneSpeech(tone))

    // Pizzan glider ut och fram igen (behåller sin gräddade ton).
    gsap.killTweensOf(this._pizza)
    gsap.killTweensOf(this._pizza.scale)
    gsap.to(this._pizza, { x: PIZZA.x, y: PIZZA.y, duration: 0.6, ease: 'power2.out' })
    gsap.to(this._pizza.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.4)' })
    this._setHint(tone >= 0.9 ? 'Lite bränd — men rolig! 🤭' : 'Klar! Vilken läcker pizza! 🍕')

    sparkle(ctx.fxLayer, PIZZA.x, PIZZA.y, { count: 10 })
    floatText(ctx.fxLayer, PIZZA.x, PIZZA.y - 60, tone >= 0.9 ? '🤭' : '😋', { fontSize: 60 })
    this._serveToCustomer(ctx, tone) // en bit flyger till den hungriga kunden som mumsar

    // Förlopp + delat firande (firar-ljud + beröm + konfetti + stjärna + klistermärke).
    this._rounds += 1
    ctx.progress.setCustom('pizzor', this._rounds)
    ctx.progress.setLevel(this._rounds)
    ctx.progress.complete()

    this._resetTimer = gsap.delayedCall(2.2, () => { if (this._alive) this._reset(ctx) })
  },

  // En bit pizza flyger till kunden (Bobo) som mumsar — mottagaren för det man bakat.
  _serveToCustomer(ctx, tone) {
    const c = this._customer
    if (!c || c.destroyed) return
    const slice = new Text({ text: '🍕', style: { fontFamily: FONT.body, fontSize: 52 } })
    slice.anchor.set(0.5)
    slice.position.set(PIZZA.x, PIZZA.y)
    slice.tint = bakeTint(tone) // biten har pizzans gräddade ton
    slice.eventMode = 'none'
    this._root.addChild(slice)
    const st = { x: PIZZA.x, y: PIZZA.y, s: 1 }
    this._serveTween = gsap.to(st, {
      x: c.x, y: c.y, s: 0.42, duration: 0.6, ease: 'power2.in',
      onUpdate: () => {
        if (slice.destroyed) { this._serveTween?.kill(); return }
        slice.position.set(st.x, st.y)
        slice.scale.set(st.s)
      },
      onComplete: () => {
        if (!slice.destroyed) slice.destroy()
        if (this._alive && c && !c.destroyed) {
          pop(c, { scale: 1.2 })
          floatText(ctx.fxLayer, c.x, c.y - 52, randomFrom(['😋', 'Mums!', '❤️']), { fontSize: 42 })
          ctx.services.voice.say(randomFrom(['Mums, tack!', 'Så god pizza!', 'Jättegott!']))
        }
      },
    })
  },

  _reset(ctx) {
    if (!this._alive) return
    this._phase = 'decorate'
    this._bake = 0
    this._idle = 0
    // Töm toppings, återställ ton.
    for (const t of this._toppings) {
      gsap.killTweensOf(t)
      gsap.killTweensOf(t.scale)
      if (!t.destroyed) t.destroy()
    }
    this._toppings = []
    this._pizza.tint = 0xffffff
    this._setPaletteEnabled(true)
    this._bakeBtn.visible = true
    pop(this._bakeBtn)
    this._setHint('En ny pizza! Pynta igen 🍕')
    ctx.services.voice.say('En ny pizza! Pynta igen.')
  },

  // ---- Hjälpare -----------------------------------------------------------

  _setHint(text) {
    if (this._hint && !this._hint.destroyed) this._hint.text = text
  },

  _setPaletteEnabled(on) {
    if (!on) this._cancelGrab()
    for (const it of this._paletteItems) {
      if (it.destroyed) continue
      it.eventMode = on ? 'static' : 'none'
      it.alpha = on ? 1 : 0.4
    }
    for (const a of this._arrows || []) {
      if (a.destroyed) continue
      a.eventMode = on ? 'static' : 'none'
      a.alpha = on ? 1 : 0.35
    }
  },

  _cancelGrab() {
    const g = this._grab
    if (!g) return
    g.src.off('globalpointermove', g.move)
    g.src.off('pointerup', g.up)
    g.src.off('pointerupoutside', g.up)
    if (g.ghost && !g.ghost.destroyed) g.ghost.destroy()
    this._grab = null
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._autoOut?.kill()
    this._resetTimer?.kill()
    this._serveTween?.kill()
    if (this._customer && !this._customer.destroyed) {
      gsap.killTweensOf(this._customer)
      gsap.killTweensOf(this._customer.scale)
    }
    this._cancelGrab()
    gsap.killTweensOf(this._paletteStrip)
    for (const it of this._paletteItems || []) {
      if (it && !it.destroyed) {
        it.off('pointerdown', it._onDown)
        gsap.killTweensOf(it)
        gsap.killTweensOf(it.scale)
      }
    }
    for (const a of this._arrows || []) {
      if (a && !a.destroyed) a.off('pointertap', a._onTap)
    }
    for (const t of this._toppings || []) {
      gsap.killTweensOf(t)
      gsap.killTweensOf(t.scale)
    }
    if (this._pizza) {
      gsap.killTweensOf(this._pizza)
      gsap.killTweensOf(this._pizza.scale)
    }
    if (this._bakeBtn) gsap.killTweensOf(this._bakeBtn.scale)
    if (this._takeBtn) gsap.killTweensOf(this._takeBtn.scale)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
