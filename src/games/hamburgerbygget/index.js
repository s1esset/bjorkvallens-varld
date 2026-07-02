// Hamburgerbygget — bygg & grilla (2–5 år). Sett FRÅN SIDAN: en underbulle ligger på
// fatet till HÖGER. Barnet DRAR ingredienser (sallad, ost, biff … och roliga grejer som
// bajs, spindel, blöja, Pappa!) från hyllan och släpper på bygget → de STAPLAS mellan
// bröden; släpp-höjden väljer VAR i stapeln lagret hamnar. Redan staplade lager kan
// DRAS OM: flytta dem i stapeln eller släpp dem på PAPPERSKORGEN (under grillknappen)
// → rolig puff, aldrig fel. Hyllan har MÅNGA saker (slumpad ordning varje start) →
// svep/dra i hyllan (eller pilarna) för att bläddra; ett tryck staplar direkt
// (tap-fallback). Grillen står till VÄNSTER; knappen med 🔥⬅️ (pil mot elden) skickar
// burgaren dit och den MÖRKNAR längs en ton-gradient (rå → grillad → mörk → kol).
// Barnet trycker "Ta av" när den ser god ut. INGET kan bli fel: även becksvart är bara
// roligt, firande + klistermärke varje gång, sedan en ny burgare. Maten ritas i
// sidoprofil med Pixi Graphics; roliga grejer är emoji. Exit-säkert.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { createScene } from '../../lib/scene.js'
import { BAKE_SECONDS, makeBakeTint, toneSpeech, buildToneMeter } from '../../lib/cooking.js'
import { bounceIn, pop, wiggle, sparkle, puff, floatText } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const BUILD = { x: 880, y: 596 } // _burger-origo: fatets yta (underbullens botten) — HÖGER
const GRILL = { x: 235, y: 430 } // grillen — VÄNSTER, lite mindre än förr
const GRILL_S = 0.78 // grillens skala (mindre grill)
const BTN = { x: 560, y: 430 } // 🔥⬅️-knappen: i kolumnen MELLAN grillen och bygget
const TRASH = { x: 560, y: 556 } // papperskorgen: rakt under grillknappen
const BOTTOM_BUN_H = 50
const TOP_BUN_H = 62
const STACK_CAP_Y = -358 // sluta lägga på när stapeln är så här hög (no-fail "fullt")

// Svepbar hylla.
const SHELF_Y = 672
const SHELF_VX0 = 150
const SHELF_VX1 = 1130
const ITEM_STEP = 120

// Ton-gradient för burgaren: ljus → grillad → mörk → kol.
const bakeTint = makeBakeTint([0xffffff, 0xfbe6bf, 0xd99a44, 0x8a5024, 0x2a2018])

const RECUE = [
  'Dra ingredienser mellan bröden!',
  'Stapla klart och tryck på eld-knappen!',
  'Bygg en rolig burgare — allt får plats!',
]
const PLACE_CHEERS = ['Mums!', 'En till!', 'Snyggt!', 'Oj!', 'Hög!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// En vy för en ingrediens: ritad sidoprofil (make) eller emoji-grej.
const viewFor = (ing) => (ing.make ? ing.make() : makeEmoji(ing.emoji, ing.th))

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
// 25 extra "slumpiga" ingredienser (emoji) → mycket att bläddra bland.
const EXTRA = [
  { id: 'raka', th: 44, emoji: '🍤' }, { id: 'lok', th: 40, emoji: '🧅' }, { id: 'gurka', th: 34, emoji: '🥒' },
  { id: 'stekt_agg', th: 40, emoji: '🍳' }, { id: 'agg', th: 44, emoji: '🥚' }, { id: 'chili', th: 40, emoji: '🌶️' },
  { id: 'paprika', th: 42, emoji: '🫑' }, { id: 'svamp', th: 42, emoji: '🍄' }, { id: 'broccoli', th: 46, emoji: '🥦' },
  { id: 'ananas', th: 44, emoji: '🍍' }, { id: 'banan', th: 44, emoji: '🍌' }, { id: 'jordgubbe', th: 40, emoji: '🍓' },
  { id: 'pizza', th: 44, emoji: '🍕' }, { id: 'korv', th: 40, emoji: '🌭' }, { id: 'pommes', th: 46, emoji: '🍟' },
  { id: 'kringla', th: 44, emoji: '🥨' }, { id: 'munk', th: 46, emoji: '🍩' }, { id: 'kaka', th: 40, emoji: '🍪' },
  { id: 'choklad', th: 38, emoji: '🍫' }, { id: 'is', th: 40, emoji: '🧊' }, { id: 'mask', th: 38, emoji: '🐛' },
  { id: 'blackfisk', th: 48, emoji: '🐙' }, { id: 'krabba', th: 46, emoji: '🦀' }, { id: 'groda', th: 44, emoji: '🐸' },
  { id: 'godis', th: 38, emoji: '🍬' },
]
// 10 äckligt-roliga (barnkul, aldrig läskigt) — med talbara namn.
const ICKY = [
  { id: 'spindel', sv: 'Spindel', th: 44, emoji: '🕷️' },
  { id: 'snigel', sv: 'Snigel', th: 42, emoji: '🐌' },
  { id: 'tandborste', sv: 'Tandborste', th: 46, emoji: '🪥' },
  { id: 'kackerlacka', sv: 'Kackerlacka', th: 40, emoji: '🪳' },
  { id: 'kalsonger', sv: 'Kalsonger', th: 46, emoji: '🩲' },
  { id: 'toapapper', sv: 'Toapapper', th: 46, emoji: '🧻' },
  { id: 'tand', sv: 'Tand', th: 38, emoji: '🦷' },
  { id: 'mygga', sv: 'Mygga', th: 38, emoji: '🦟' },
  { id: 'daggmask', sv: 'Daggmask', th: 40, emoji: '🪱' },
  { id: 'disksvamp', sv: 'Disksvamp', th: 42, emoji: '🧽' },
]
// 10 nya GODA burgar-ingredienser.
const GOODIES = [
  { id: 'avokado', sv: 'Avokado', th: 42, emoji: '🥑' },
  { id: 'morot', sv: 'Morot', th: 42, emoji: '🥕' },
  { id: 'majs', sv: 'Majs', th: 42, emoji: '🌽' },
  { id: 'aubergine', sv: 'Aubergine', th: 44, emoji: '🍆' },
  { id: 'potatis', sv: 'Potatis', th: 42, emoji: '🥔' },
  { id: 'kottbit', sv: 'Köttbit', th: 44, emoji: '🥩' },
  { id: 'kyckling', sv: 'Kycklingklubba', th: 44, emoji: '🍗' },
  { id: 'smor', sv: 'Smör', th: 38, emoji: '🧈' },
  { id: 'oliv', sv: 'Oliv', th: 36, emoji: '🫒' },
  { id: 'honung', sv: 'Honung', th: 42, emoji: '🍯' },
]
// 8 specialare. OBS: Pappa/Mamma är ROLLER (avbildade personer namnges aldrig här).
const SPECIAL = [
  { id: 'pappa', sv: 'Pappa', th: 48, emoji: '👨' },
  { id: 'mamma', sv: 'Mamma', th: 48, emoji: '👩' },
  { id: 'fluga', sv: 'Fluga', th: 36, emoji: '🪰' },
  { id: 'monster', sv: 'Gulligt monster', th: 46, emoji: '👾' },
  { id: 'kissdroppe', sv: 'Kissdroppe', th: 44, make: makePee, shelfScale: 0.78 },
  { id: 'anvand_bloja', sv: 'Använd blöja', th: 44, make: makeDiaper, shelfScale: 0.62 },
  { id: 'potta', sv: 'Potta', th: 46, make: makePotty, shelfScale: 0.62 },
  { id: 'prutt', sv: 'Prutt', th: 42, emoji: '💨' },
]
const PALETTE = [...FOODS, ...FUN, ...EXTRA, ...ICKY, ...GOODIES, ...SPECIAL]

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
    this._lastSizzle = 0
    this._flameAcc = 0
    this._grab = null
    this._rounds = ctx.progress.get().custom?.burgare || 0
    // Slumpad hyll-ordning så två sessioner inte ser lika ut.
    this._items = shuffle(PALETTE.slice())

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))

    this._hint = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink } })
    this._hint.anchor.set(0.5)
    this._hint.position.set(640, 50)
    this._hint.eventMode = 'none'
    this._root.addChild(this._hint)

    // Grillen (vänster, lite mindre).
    this._grill = this._buildGrill()
    this._root.addChild(this._grill)

    // Fat under bygget (stannar kvar när burgaren åker till grillen).
    this._plate = new Graphics()
      .ellipse(BUILD.x, BUILD.y + 18, 170, 30).fill({ color: COLORS.shadow, alpha: 0.12 })
      .ellipse(BUILD.x, BUILD.y + 8, 158, 26).fill(0xf3ead6).stroke({ width: 5, color: 0xe2d4b8 })
    this._plate.eventMode = 'none'
    this._root.addChild(this._plate)

    // Burgaren (underbulle + stapel + lock) som EN enhet — HÖGER.
    this._burger = new Container()
    this._burger.position.set(BUILD.x, BUILD.y)
    this._bottomBun = makeBunBottom()
    this._bottomBun.y = -BOTTOM_BUN_H / 2
    this._stackLayer = new Container()
    this._topBun = makeBunTop()
    this._burger.addChild(this._bottomBun, this._stackLayer, this._topBun)
    this._repositionTopBun()
    this._root.addChild(this._burger)

    // Ton-mätare (visas vid grillning), placeras vid grillen (blick + färg samlas).
    const meter = buildToneMeter({ width: 320, tint: bakeTint })
    this._meter = meter.container
    this._setMeterProgress = meter.setProgress
    this._meter.position.set(GRILL.x, 190)
    this._meter.visible = false
    this._root.addChild(this._meter)

    // Restauranglogga & hungrig kund (Bobo): mitt upptill, mumsar burgaren vid servering.
    this._customerBase = { x: 640, y: 138 }
    this._customer = makeMascot(56)
    this._customer.position.set(this._customerBase.x, this._customerBase.y)
    this._customer.eventMode = 'none'
    this._root.addChild(this._customer)

    // Ingrediens-bräda nederst (svepbar hylla).
    this._buildPalette(ctx)

    // Papperskorg (släpp ett staplat lager här → rolig puff, aldrig fel).
    this._buildTrash(ctx)

    // Drag-lager överst.
    this._dragLayer = new Container()
    this._dragLayer.eventMode = 'none'
    this._root.addChild(this._dragLayer)

    // Grill-knappen: ingen text — en pil mot elden (grillen står till vänster).
    this._grillBtn = new Button({
      icon: '🔥⬅️', width: 170, height: 100, color: COLORS.orange,
      services: ctx.services, sound: 'whoosh', onTap: () => this._startGrill(ctx),
    })
    this._grillBtn.position.set(BTN.x, BTN.y)
    this._root.addChild(this._grillBtn)

    this._takeBtn = new Button({
      label: 'Ta av', icon: '🧤', width: 210, height: 100, color: COLORS.green,
      services: ctx.services, sound: 'pop', onTap: () => this._takeOff(ctx),
    })
    this._takeBtn.position.set(BTN.x, BTN.y)
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
    // Ben.
    c.addChild(new Graphics()
      .moveTo(-150, 40).lineTo(-180, 150).stroke({ width: 12, color: 0x4a4a52, cap: 'round' })
      .moveTo(150, 40).lineTo(180, 150).stroke({ width: 12, color: 0x4a4a52, cap: 'round' }))
    // Eldlåda.
    c.addChild(new Graphics().roundRect(-185, -6, 370, 70, 18).fill(0x55505a).stroke({ width: 6, color: 0x3d3942 }))
    // Glöd (alpha höjs vid grillning).
    this._coals = new Graphics().roundRect(-168, 8, 336, 44, 12).fill({ color: 0xff6a1a, alpha: 0.25 })
    this._coals.eventMode = 'none'
    c.addChild(this._coals)
    // Lågor (flimrar vid grillning).
    this._flames = new Graphics()
    this._flames.eventMode = 'none'
    c.addChild(this._flames)
    this._drawFlames(0.25)
    // Galler (vågräta stänger ovanpå).
    const grate = new Graphics()
    for (let i = -160; i <= 160; i += 40) grate.roundRect(i - 6, -18, 12, 24, 5).fill(0x8a8690)
    grate.roundRect(-178, -20, 356, 9, 4).fill(0x9a96a0)
    c.addChild(grate)
    c.position.set(GRILL.x, GRILL.y)
    c.scale.set(GRILL_S)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  _drawFlames(intensity) {
    const g = this._flames
    if (!g || g.destroyed) return
    g.clear()
    for (let i = -150; i <= 150; i += 50) {
      const h = (16 + Math.random() * 22) * (0.6 + intensity)
      const w = 16
      g.moveTo(i - w, 8).quadraticCurveTo(i, 8 - h, i + w, 8)
        .fill({ color: 0xff8a2a, alpha: 0.5 + intensity * 0.4 })
      g.moveTo(i - w * 0.5, 8).quadraticCurveTo(i, 8 - h * 0.6, i + w * 0.5, 8)
        .fill({ color: 0xffd23c, alpha: 0.5 + intensity * 0.4 })
    }
  },

  _buildTrash(ctx) {
    const c = new Container()
    const plate = new Graphics()
      .roundRect(-56, -52, 112, 104, 26).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: 0xe6d8bf })
    plate.eventMode = 'none'
    const t = new Text({ text: '🗑️', style: { fontFamily: FONT.body, fontSize: 58 } })
    t.anchor.set(0.5)
    t.eventMode = 'none'
    c.addChild(plate, t)
    c.position.set(TRASH.x, TRASH.y)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-68, -64, 136, 128)
    const onTap = () => {
      if (!this._alive || this._phase !== 'decorate') return
      wiggle(c)
      ctx.services.audio.sfx('tap')
      ctx.services.voice.say('Dra hit det du vill slänga!')
    }
    c.on('pointertap', onTap)
    c._onTap = onTap
    this._trash = c
    this._root.addChild(c)
  },

  // ---- Svepbar ingredienshylla -------------------------------------------

  _buildPalette(ctx) {
    const shelf = new Graphics().roundRect(70, SHELF_Y - 52, 1140, 96, 28).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 4, color: 0xe6d8bf })
    shelf.eventMode = 'none'
    this._root.addChild(shelf)

    // Klippt fönster (mask).
    this._paletteViewport = new Container()
    this._root.addChild(this._paletteViewport)
    const maskG = new Graphics().roundRect(SHELF_VX0, SHELF_Y - 50, SHELF_VX1 - SHELF_VX0, 100, 22).fill(0xffffff)
    this._paletteViewport.addChild(maskG)
    this._paletteViewport.mask = maskG

    this._paletteStrip = new Container()
    this._paletteViewport.addChild(this._paletteStrip)

    this._paletteItems = []
    this._items.forEach((ing, i) => {
      const slot = new Container()
      slot.position.set(i * ITEM_STEP, SHELF_Y) // lokal x i strippen
      const view = viewFor(ing)
      // Skala ner till brädan (sidoprofiler är breda).
      const s = ing.shelfScale ?? (ing.make ? 0.42 : 0.78)
      view.scale.set(s)
      view.eventMode = 'none'
      slot.addChild(view)
      slot.eventMode = 'static'
      slot.cursor = 'pointer'
      slot.hitArea = new Circle(0, 0, 50)
      const onDown = (e) => this._onItemDown(ctx, ing, slot, e)
      slot.on('pointerdown', onDown)
      slot._onDown = onDown
      this._paletteStrip.addChild(slot)
      this._paletteItems.push(slot)
    })

    const contentW = (this._items.length - 1) * ITEM_STEP
    this._scrollMax = SHELF_VX0 + 40
    this._scrollMin = Math.min(this._scrollMax, SHELF_VX1 - 40 - contentW)
    this._paletteStrip.x = this._scrollMax
    this._paletteStrip.y = 0

    // Pilar (tap) — komplement till svep.
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
    mkArrow(102, '◀', +1)
    mkArrow(1178, '▶', -1)
  },

  _pageShelf(ctx, dir) {
    if (!this._alive || this._phase !== 'decorate') return
    this._idle = 0
    const target = clamp(this._paletteStrip.x + dir * 560, this._scrollMin, this._scrollMax)
    gsap.killTweensOf(this._paletteStrip)
    gsap.to(this._paletteStrip, { x: target, duration: 0.32, ease: 'power2.out' })
    ctx.services.audio.sfx('tap')
  },

  // ---- Gest: tap / drag-till-stapel / svep-scroll (disambiguering) --------

  _onItemDown(ctx, ing, slot, e) {
    if (!this._alive || this._phase !== 'decorate' || this._grab) return
    this._idle = 0
    gsap.killTweensOf(this._paletteStrip)
    const move = (ev) => this._onGrabMove(ctx, ev)
    const up = (ev) => this._onGrabUp(ctx, ev)
    this._grab = {
      kind: 'shelf', ing, src: slot, mode: 'undecided', ghost: null,
      startX: e.global.x, startY: e.global.y, startScroll: this._paletteStrip.x, move, up,
    }
    slot.on('globalpointermove', move)
    slot.on('pointerup', up)
    slot.on('pointerupoutside', up)
  },

  // Redan staplade lager kan dras om (flyttas i stapeln eller slängas).
  _onStackDown(ctx, view, e) {
    if (!this._alive || this._phase !== 'decorate' || this._grab) return
    this._idle = 0
    const move = (ev) => this._onGrabMove(ctx, ev)
    const up = (ev) => this._onGrabUp(ctx, ev)
    this._grab = {
      kind: 'stack', ing: view._ing, view, src: view, mode: 'undecided', index: -1,
      startX: e.global.x, startY: e.global.y, move, up,
    }
    view.on('globalpointermove', move)
    view.on('pointerup', up)
    view.on('pointerupoutside', up)
  },

  _onGrabMove(ctx, e) {
    const g = this._grab
    if (!g) return
    const dx = e.global.x - g.startX
    const dy = e.global.y - g.startY
    if (g.mode === 'undecided') {
      if (g.kind === 'stack') {
        if (Math.hypot(dx, dy) < 12) return
        // Dra UT lagret ur stapeln → följer fingret.
        g.mode = 'drag'
        const i = this._stack.indexOf(g.view)
        g.index = i >= 0 ? i : this._stack.length
        if (i >= 0) this._stack.splice(i, 1)
        this._restack()
        gsap.killTweensOf(g.view)
        gsap.killTweensOf(g.view.scale)
        g.view.scale.set(1)
        g.view.rotation = 0
        const p0 = this._root.toLocal(e.global)
        this._dragLayer.addChild(g.view)
        g.view.position.set(p0.x, p0.y)
        pop(g.view)
        ctx.services.audio.sfx('tap')
      } else {
        if (Math.hypot(dx, dy) < 14) return
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          g.mode = 'scroll'
        } else {
          g.mode = 'drag'
          ctx.services.audio.sfx('tap')
          const view = viewFor(g.ing)
          view.eventMode = 'none'
          const p = this._root.toLocal(e.global)
          view.position.set(p.x, p.y)
          this._dragLayer.addChild(view)
          g.ghost = view
          pop(view)
        }
      }
    }
    if (g.mode === 'scroll') {
      this._paletteStrip.x = clamp(g.startScroll + dx, this._scrollMin, this._scrollMax)
    } else if (g.mode === 'drag') {
      const item = g.kind === 'stack' ? g.view : g.ghost
      if (item && !item.destroyed) {
        const p = this._root.toLocal(e.global)
        item.position.set(p.x, p.y)
      }
    }
  },

  _onGrabUp(ctx, e) {
    const g = this._grab
    if (!g) return
    g.src.off('globalpointermove', g.move)
    g.src.off('pointerup', g.up)
    g.src.off('pointerupoutside', g.up)
    this._grab = null
    const p = this._root.toLocal(e.global)

    if (g.kind === 'stack') {
      this._onStackDrop(ctx, g, p)
      return
    }

    if (g.mode === 'drag') {
      const nearColumn = Math.abs(p.x - BUILD.x) < 170 && p.y < 640
      if (this._overTrash(p)) {
        // Även hyll-drag kan slängas direkt — rolig puff.
        puff(ctx.fxLayer, p.x, p.y, { count: 10 })
        ctx.services.audio.sfx('pop')
        this._trashWiggle()
      } else if (nearColumn && this._stackTopY > STACK_CAP_Y) {
        this._insertLayer(ctx, g.ing, this._indexForDropY(p.y - BUILD.y))
      } else if (this._stackTopY <= STACK_CAP_Y) {
        ctx.services.voice.say('Den är jättehög! Dags att grilla?')
        pop(this._grillBtn)
      } else {
        puff(ctx.fxLayer, p.x, p.y, { count: 6 })
        ctx.services.audio.sfx('soft')
      }
      if (g.ghost && !g.ghost.destroyed) g.ghost.destroy()
    } else if (g.mode === 'undecided') {
      // Rent tryck = tap-fallback: stapla direkt överst på bygget.
      if (this._stackTopY > STACK_CAP_Y) {
        this._insertLayer(ctx, g.ing, this._stack.length)
      } else {
        ctx.services.voice.say('Den är jättehög! Dags att grilla?')
        pop(this._grillBtn)
      }
    } else {
      ctx.services.audio.sfx('soft')
    }
  },

  // Släpp av ett OM-draget lager: papperskorg / ny plats i stapeln / snäpp tillbaka.
  _onStackDrop(ctx, g, p) {
    const view = g.view
    if (g.mode !== 'drag') {
      // Rent tryck på ett lager: glad liten studs + ev. namnet.
      if (view && !view.destroyed) pop(view)
      ctx.services.audio.sfx('soft')
      this._maybeSayName(ctx, g.ing)
      return
    }
    if (!view || view.destroyed) return
    if (this._overTrash(p)) {
      // Släng! Rolig puff — aldrig fel.
      view.off('pointerdown', view._onDown)
      gsap.killTweensOf(view)
      gsap.killTweensOf(view.scale)
      view.destroy()
      puff(ctx.fxLayer, p.x, p.y, { count: 10 })
      ctx.services.audio.sfx('pop')
      this._trashWiggle()
      return
    }
    const nearColumn = Math.abs(p.x - BUILD.x) < 170 && p.y < 640 && p.y > 120
    if (nearColumn) {
      // Ny plats i stapeln — släpp-höjden väljer var.
      this._reinsertView(view, this._indexForDropY(p.y - BUILD.y))
      pop(view)
      sparkle(ctx.fxLayer, BUILD.x + view.x, BUILD.y + view.y, { count: 4 })
      ctx.services.audio.sfx('pop')
    } else {
      // Utanför allt → snäpp tillbaka till sin gamla plats med en vingel (kul, inte fel).
      this._reinsertView(view, Math.min(Math.max(g.index, 0), this._stack.length))
      wiggle(view)
      ctx.services.audio.sfx('soft')
    }
  },

  _overTrash(p) {
    return Math.abs(p.x - TRASH.x) < 90 && Math.abs(p.y - TRASH.y) < 90
  },

  _trashWiggle() {
    if (this._trash && !this._trash.destroyed) {
      wiggle(this._trash)
      pop(this._trash)
    }
  },

  // Stoppa in en NY ingrediens på index (0 = närmast underbullen).
  _insertLayer(ctx, ing, index) {
    const view = viewFor(ing)
    view._ing = ing
    view.x = (Math.random() - 0.5) * 26
    view.rotation = (Math.random() - 0.5) * 0.05
    this._makeStackInteractive(ctx, view)
    this._stackLayer.addChild(view)
    this._stack.splice(clamp(index, 0, this._stack.length), 0, view)
    this._restack()
    bounceIn(view)
    sparkle(ctx.fxLayer, BUILD.x + view.x, BUILD.y + view.y, { count: 4 })
    ctx.services.audio.sfx('pop')
    if (!ctx.services.audio.sample?.('sizzle')) ctx.services.audio.tone({ freq: 240, dur: 0.12, type: 'sawtooth', vol: 0.05, slideTo: 520 }) // litet sizzel
    if (!this._maybeSayName(ctx, ing) && Math.random() < 0.5) {
      const now = performance.now()
      if (now - this._lastPlaceCheer > 1400) {
        this._lastPlaceCheer = now
        ctx.services.voice.say(randomFrom(PLACE_CHEERS))
      }
    }
  },

  // Sätt tillbaka ett befintligt lager i stapeln på index.
  _reinsertView(view, index) {
    if (!view || view.destroyed) return
    view.x = (Math.random() - 0.5) * 26
    view.rotation = (Math.random() - 0.5) * 0.05
    this._stackLayer.addChild(view)
    this._stack.splice(clamp(index, 0, this._stack.length), 0, view)
    this._restack()
  },

  // Gör ett staplat lager greppbart (om-drag).
  _makeStackInteractive(ctx, view) {
    const ing = view._ing
    const w = ing.make ? 240 : ing.th + 44
    const h = Math.max(ing.th + 26, 54)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Rectangle(-w / 2, -h / 2, w, h)
    const onDown = (e) => this._onStackDown(ctx, view, e)
    view.on('pointerdown', onDown)
    view._onDown = onDown
  },

  // Lägg alla lager på rätt höjd (underifrån och upp) + flytta locket.
  _restack() {
    let y = -BOTTOM_BUN_H
    for (const v of this._stack) {
      const th = v._ing?.th || 40
      if (!v.destroyed) v.y = y - th / 2
      y -= th
    }
    this._stackTopY = y
    this._repositionTopBun()
  },

  // Vilket index i stapeln motsvarar en släpp-höjd (lokal y i burgar-rymden)?
  _indexForDropY(localY) {
    let b = -BOTTOM_BUN_H
    for (let i = 0; i < this._stack.length; i++) {
      const th = this._stack[i]._ing?.th || 40
      if (localY > b - th / 2) return i
      b -= th
    }
    return this._stack.length
  },

  // Säg ingrediensens namn (rate-limited). Returnerar true om något sades.
  _maybeSayName(ctx, ing) {
    if (!ing?.sv) return false
    const now = performance.now()
    if (now - this._lastPlaceCheer < 1400) return false
    this._lastPlaceCheer = now
    ctx.services.voice.say(ing.sv)
    return true
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
    this._setPaletteEnabled(false)
    this._grillBtn.visible = false
    this._setHint('Titta på färgen — ta av när den är klar!')
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('På grillen! Titta på färgen och ta av den när den ser god ut.')

    gsap.killTweensOf(this._burger)
    gsap.killTweensOf(this._burger.scale)
    gsap.to(this._burger, { x: GRILL.x, y: GRILL.y - 16, duration: 0.7, ease: 'power2.inOut' })
    gsap.to(this._burger.scale, { x: 0.6, y: 0.6, duration: 0.7, ease: 'power2.inOut' })

    this._meter.visible = true
    this._takeBtn.visible = true
    pop(this._takeBtn)
  },

  _update(ctx, t) {
    if (!this._alive) return
    const dt = (t.deltaMS || 16.67) / 1000

    // Lågorna ritas om med fast intervall (~120 ms), inte varje frame; intensiteten
    // följer värmen vid grillning, lugnt flimmer annars.
    this._flameAcc += dt
    if (this._flameAcc >= 0.12) {
      this._flameAcc = 0
      this._drawFlames(this._phase === 'grilling' ? 0.3 + this._bake * 0.7 : 0.25)
    }

    if (this._phase === 'grilling') {
      this._bake = clamp(this._bake + dt / BAKE_SECONDS, 0, 1)
      this._burger.tint = bakeTint(this._bake)
      if (this._coals && !this._coals.destroyed) this._coals.alpha = 0.25 + this._bake * 0.5
      this._setMeterProgress(this._bake)
      // Grill-fräs (subtil ambient): sizzle-brus, tätare ju hetare.
      const nowS = performance.now()
      if (nowS - this._lastSizzle > 260 - this._bake * 120) {
        this._lastSizzle = nowS
        ctx.services.audio.tone({ freq: 600 + Math.random() * 800, dur: 0.03, type: 'square', vol: 0.03 })
      }
      if (this._bake > 0.85) {
        const now = performance.now()
        if (now - this._lastSmoke > 420) {
          this._lastSmoke = now
          floatText(ctx.fxLayer, GRILL.x + (Math.random() * 90 - 45), GRILL.y - 110, '💨', { fontSize: 40, rise: 70 })
        }
      }
      if (this._bake >= 1 && !this._autoOff) {
        this._autoOff = gsap.delayedCall(1.8, () => { if (this._alive && this._phase === 'grilling') this._takeOff(ctx) })
      }
      return
    }

    if (this._phase === 'decorate') {
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
    ctx.services.voice.say(toneSpeech(tone, 'Saftig och nygrillad! Mums!'))

    gsap.killTweensOf(this._burger)
    gsap.killTweensOf(this._burger.scale)
    gsap.to(this._burger, { x: BUILD.x, y: BUILD.y, duration: 0.6, ease: 'power2.out' })
    gsap.to(this._burger.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.4)' })
    this._setHint(tone >= 0.9 ? 'Lite bränd — men rolig! 🤭' : 'Klar! Vilken läcker burgare! 🍔')

    sparkle(ctx.fxLayer, BUILD.x, BUILD.y - 120, { count: 10 })
    floatText(ctx.fxLayer, BUILD.x, BUILD.y - 200, tone >= 0.9 ? '🤭' : '😋', { fontSize: 60 })
    this._serveToCustomer(ctx, tone) // burgaren flyger till den hungriga kunden

    this._rounds += 1
    ctx.progress.setCustom('burgare', this._rounds)
    ctx.progress.setLevel(this._rounds)
    ctx.progress.complete()

    this._resetTimer = gsap.delayedCall(2.2, () => { if (this._alive) this._reset(ctx) })
  },

  // Burgaren flyger till kunden (Bobo) som mumsar — mottagaren för det man byggt.
  _serveToCustomer(ctx, tone) {
    const c = this._customer
    if (!c || c.destroyed) return
    const item = new Text({ text: '🍔', style: { fontFamily: FONT.body, fontSize: 56 } })
    item.anchor.set(0.5)
    item.position.set(BUILD.x, BUILD.y - 120)
    item.tint = bakeTint(tone) // burgaren har sin grillade ton
    item.eventMode = 'none'
    this._root.addChild(item)
    const st = { x: BUILD.x, y: BUILD.y - 120, s: 1 }
    this._serveTween = gsap.to(st, {
      x: c.x, y: c.y, s: 0.42, duration: 0.6, ease: 'power2.in',
      onUpdate: () => {
        if (item.destroyed) { this._serveTween?.kill(); return }
        item.position.set(st.x, st.y)
        item.scale.set(st.s)
      },
      onComplete: () => {
        if (!item.destroyed) item.destroy()
        if (this._alive && c && !c.destroyed) {
          pop(c, { scale: 1.2 })
          floatText(ctx.fxLayer, c.x, c.y - 52, randomFrom(['😋', 'Mums!', '❤️']), { fontSize: 42 })
          ctx.services.voice.say(randomFrom(['Mums, tack!', 'Så god burgare!', 'Jättegott!']))
        }
      },
    })
  },

  _reset(ctx) {
    if (!this._alive) return
    this._phase = 'decorate'
    this._bake = 0
    this._idle = 0
    for (const v of this._stack) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      if (!v.destroyed) {
        v.off('pointerdown', v._onDown)
        v.destroy()
      }
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
    if (this._trash && !this._trash.destroyed) this._trash.alpha = on ? 1 : 0.35
  },

  _cancelGrab() {
    const g = this._grab
    if (!g) return
    g.src.off('globalpointermove', g.move)
    g.src.off('pointerup', g.up)
    g.src.off('pointerupoutside', g.up)
    if (g.kind === 'stack') {
      // Mitt i ett om-drag → tillbaka till sin gamla plats i stapeln.
      if (g.mode === 'drag' && g.view && !g.view.destroyed) {
        this._reinsertView(g.view, Math.min(Math.max(g.index, 0), this._stack.length))
      }
    } else if (g.ghost && !g.ghost.destroyed) {
      g.ghost.destroy()
    }
    this._grab = null
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._autoOff?.kill()
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
    if (this._trash && !this._trash.destroyed) {
      this._trash.off('pointertap', this._trash._onTap)
      gsap.killTweensOf(this._trash)
      gsap.killTweensOf(this._trash.scale)
    }
    for (const v of this._stack || []) {
      if (v && !v.destroyed) v.off('pointerdown', v._onDown)
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

// Kissdroppe — gul droppe (ritad, så färgen blir tydligt gul).
function makePee() {
  const c = new Container()
  const g = new Graphics()
  g.poly([0, -26, -11, 4, 11, 4]).fill(0xf5d637)
  g.circle(0, 8, 15).fill(0xf5d637)
  g.ellipse(-5, 6, 4, 7).fill({ color: 0xffffff, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Använd blöja — vit blöja med tejpkant och en liten rolig fläck (aldrig äckligt på riktigt).
function makeDiaper() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-58, -22, 116, 44, 20).fill(0xf6f2ea).stroke({ width: 4, color: 0xdcd4c4 })
  g.roundRect(-58, -22, 116, 13, 10).fill({ color: 0xbfe3f0, alpha: 0.9 })
  g.circle(2, 4, 10).fill(0x8a5a2b)
  g.circle(16, 9, 6).fill(0x9a682f)
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Potta — liten blå potta med handtag.
function makePotty() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-44, -14, 88, 36, 14).fill(0x7fc8e8).stroke({ width: 4, color: 0x5aa8cc })
  g.ellipse(0, -14, 44, 10).fill(0xa8ddf2).stroke({ width: 3, color: 0x5aa8cc })
  g.ellipse(0, -14, 30, 6).fill(0x6fb8d8)
  g.circle(52, -4, 10).stroke({ width: 7, color: 0x7fc8e8 })
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
