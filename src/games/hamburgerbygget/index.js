// Hamburgerbygget — bygg & grilla (2–5 år). Sett FRÅN SIDAN i ett riktigt kök: kaklad
// vägg, fläkt över grillen, bänkskiva och såsflaskor. En underbulle ligger på fatet till
// HÖGER. Barnet DRAR ingredienser (sallad, ost, biff … och roliga grejer som bajs,
// spindel, blöja, Pappa!) från hyllan och släpper på bygget → de STAPLAS mellan bröden;
// släpp-höjden väljer VAR i stapeln lagret hamnar. Redan staplade lager kan DRAS OM:
// flytta dem i stapeln eller släpp dem på SOPTUNNAN (under grillknappen) → rolig puff,
// aldrig fel. Hyllan har MÅNGA saker (slumpad ordning varje start) → svep/dra i hyllan
// (eller pilarna) för att bläddra; ett tryck staplar direkt (tap-fallback). Grillen står
// till VÄNSTER; eld-knappen skickar burgaren dit och varje LAGER bryns för sig — biffen
// blir mörk, salladen knappt alls och osten smälter. Barnet trycker "Ta av" när den ser
// god ut och burgaren serveras till grillmästaren Bobo, som ibland önskat sig något
// särskilt (bild-order, helt frivillig). INGET kan bli fel: även becksvart är bara
// roligt, firande + klistermärke varje gång, sedan en ny burgare. ALLT ritas som
// fristående Pixi Graphics (ingredienserna i ingredienser.js) — ingen emoji är ett
// spelobjekt. Exit-säkert: tweens dödas, fördröjningar går via ctx.later.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { BAKE_SECONDS, makeBakeTint, toneSpeech, buildToneMeter } from '../../lib/cooking.js'
import { bounceIn, pop, wiggle, sparkle, puff, floatText } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { ITEMS, makeItemView } from './ingredienser.js'

const BUILD = { x: 880, y: 596 } // _burger-origo: fatets yta (underbullens botten) — HÖGER
const GRILL = { x: 235, y: 430 } // grillen — VÄNSTER, lite mindre än förr
const GRILL_S = 0.78 // grillens skala (mindre grill)
const BTN = { x: 560, y: 430 } // eld-knappen: i kolumnen MELLAN grillen och bygget
const TRASH = { x: 560, y: 566 } // soptunnan: rakt under grillknappen
const BOBO = { x: 1124, y: 430 } // grillmästaren till höger om bygget (bakom bänken)
const ORDER = { x: 1084, y: 246 } // Bobos önskelista, rakt ovanför honom
const COUNTER_Y = 552 // bänkskivans ovansida — grillens ben står på den
const BOTTOM_BUN_H = 50
const TOP_BUN_H = 62
const BUN_BAKE = 0.55 // bröden rostas svagt, inte som köttet
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

const ORDER_CUES = [
  'Bobo är hungrig! Han önskar sig något särskilt.',
  'Titta vad Bobo vill ha i sin burgare!',
]
const SERVE_CHEERS = ['Mums, tack!', 'Så god burgare!', 'Jättegott!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// En vy för en ingrediens — alltid ritad (P0 ASSETS). `fit` krymper till hyllans fack.
const viewFor = (ing, fit = 0) => makeItemView(ing, fit)

// Lagrets tjocklek i stapeln: det MINSTA av den ritade höjden och ingrediensens
// tänkta tjocklek — aldrig mer. Annars glappar stapeln (svävande brickor i stället för
// en burgare), särskilt för saker med utstickande antenner eller stjälkar. Faktorn
// 0.84 låter lagren nästla i varandra precis som i en riktig burgare.
const layerThickness = (view, ing) => {
  const h = view.getLocalBounds().height * (view.scale?.y || 1)
  // Golvet 26 gör att ett tunt lager (bacon, ost) syns även klämt mellan tjocka grannar.
  return clamp(Math.round(Math.min(h * 0.84, ing.th)), 26, 78)
}


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
    this._order = []
    this._bob = 0
    this._rounds = ctx.progress.get().custom?.burgare || 0
    // Slumpad hyll-ordning så två sessioner inte ser lika ut.
    this._items = shuffle(ITEMS.slice())

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._root.addChild(this._buildKitchen(ctx))

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
    this._meter.position.set(BTN.x, 214)
    this._meter.visible = false
    this._root.addChild(this._meter)

    // Grillmästaren Bobo (kropp, förkläde, kockmössa) — tar emot burgaren och mumsar.
    this._customer = this._buildBobo()
    this._root.addChild(this._customer)

    // Bobos önskelista: pratbubbla med 1–2 ritade ingredienser han vill ha. Frivillig.
    this._orderBubble = new Container()
    this._orderBubble.position.set(ORDER.x, ORDER.y)
    this._orderBubble.eventMode = 'none'
    this._root.addChild(this._orderBubble)
    this._newOrder()

    // Ingrediens-bräda nederst (svepbar hylla).
    this._buildPalette(ctx)

    // Papperskorg (släpp ett staplat lager här → rolig puff, aldrig fel).
    this._buildTrash(ctx)

    // Drag-lager överst. OBS 'passive', inte 'none': ett OM-draget lager flyttas hit
    // mitt i draget, och 'none' skär bort HELA subträdet från händelser — då slutade
    // lagret följa fingret och varken pointerup eller pointerupoutside nådde fram, så
    // draget kunde aldrig avslutas (soptunnan gick inte att träffa och greppet fastnade).
    // 'passive' låter lagret självt vara genomsläppligt men interaktiva barn få sina
    // händelser. Spök-kopian från hyllan är eventMode 'none' och påverkas inte.
    this._dragLayer = new Container()
    this._dragLayer.eventMode = 'passive'
    this._root.addChild(this._dragLayer)

    // Grill-knappen: ingen text — en RITAD låga med pil mot elden (grillen står vänster).
    this._grillBtn = new Button({
      width: 170, height: 100, color: COLORS.orange,
      services: ctx.services, sound: 'whoosh', onTap: () => this._startGrill(ctx),
    })
    this._grillBtn.addChild(makeFlameArrow())
    this._grillBtn.position.set(BTN.x, BTN.y)
    this._root.addChild(this._grillBtn)

    this._takeBtn = new Button({
      label: 'Ta av', width: 210, height: 100, color: COLORS.green,
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

  // Köket: kaklad vägg, fläkt över grillen, bänkskiva, golv, såsflaskor och redskap.
  // Ersätter den nakna gradienten (femte läckan: tomma scener).
  _buildKitchen(ctx) {
    const c = new Container()
    const W = ctx.width
    const H = ctx.height

    // Kaklad vägg med förskjutna rader.
    const wall = new Graphics().rect(0, 0, W, COUNTER_Y).fill(0xf6dcc0)
    for (let row = 0; row * 64 < COUNTER_Y; row++) {
      const y = row * 64
      const off = row % 2 ? -32 : 0
      for (let x = off; x < W; x += 64) wall.roundRect(x + 4, y + 4, 56, 56, 11).fill({ color: 0xfdefdb, alpha: 0.9 })
    }
    c.addChild(wall)

    // Fläkt/kåpa över grillen — fyller den tomma ytan uppe till vänster.
    const hood = new Graphics()
    hood.roundRect(GRILL.x - 26, 0, 52, 120, 8).fill(0x8d96a4)
    hood.roundRect(GRILL.x - 18, 0, 16, 120, 6).fill({ color: 0xb2bac6, alpha: 0.8 })
    hood.moveTo(GRILL.x - 172, 232).lineTo(GRILL.x - 96, 112).lineTo(GRILL.x + 96, 112)
      .lineTo(GRILL.x + 172, 232).closePath().fill(0x9aa3b1)
    hood.moveTo(GRILL.x - 172, 232).lineTo(GRILL.x - 96, 112).lineTo(GRILL.x - 40, 112)
      .lineTo(GRILL.x - 92, 232).closePath().fill({ color: 0xb2bac6, alpha: 0.75 })
    hood.roundRect(GRILL.x - 182, 226, 364, 22, 11).fill(0x7c8593)
    // Liten lampa under kåpan (varmt sken mot grillen).
    hood.circle(GRILL.x, 250, 16).fill({ color: 0xffd98a, alpha: 0.95 })
    hood.circle(GRILL.x, 250, 26).fill({ color: 0xffd98a, alpha: 0.16 })
    c.addChild(hood)

    // Bänkskiva (stål) med mörkare framkant + golv.
    c.addChild(new Graphics()
      .rect(0, COUNTER_Y, W, 92).fill(0xc9a882)
      .rect(0, COUNTER_Y, W, 13).fill(0xe3c8a4)
      .rect(0, COUNTER_Y + 78, W, 14).fill(0xa8875f))
    c.addChild(new Graphics().rect(0, COUNTER_Y + 92, W, H - COUNTER_Y - 92).fill(0xb08a63))

    // Såsflaskor (ketchup + senap) mellan knappkolumnen och bygget.
    const bottles = new Graphics()
    for (const [x, body, cap] of [[688, 0xd8402c, 0xf0705c], [734, 0xe8b41e, 0xf7d264]]) {
      bottles.roundRect(x - 19, COUNTER_Y - 74, 38, 78, 15).fill(body)
      bottles.roundRect(x - 19, COUNTER_Y - 74, 14, 78, 10).fill({ color: cap, alpha: 0.55 })
      bottles.moveTo(x - 11, COUNTER_Y - 74).quadraticCurveTo(x, COUNTER_Y - 96, x + 11, COUNTER_Y - 74)
        .fill(body)
      bottles.roundRect(x - 7, COUNTER_Y - 104, 14, 14, 6).fill(0xf3ece0)
      bottles.roundRect(x - 13, COUNTER_Y - 52, 26, 20, 6).fill({ color: 0xfffdf7, alpha: 0.85 })
    }
    c.addChild(bottles)

    // Serveringslucka bakom Bobo. Utan den försvinner en cream-färgad björn mot en
    // cream-färgad kakelvägg (sjunde läckan) — luckan ger honom en mörkare fond.
    const hatch = new Graphics()
    hatch.roundRect(BOBO.x - 118, BOBO.y - 136, 236, 136 + (COUNTER_Y - BOBO.y), 26).fill(0x8a6742)
    hatch.roundRect(BOBO.x - 104, BOBO.y - 122, 208, 122 + (COUNTER_Y - BOBO.y), 18).fill(0x6d4f34)
    hatch.roundRect(BOBO.x - 104, BOBO.y - 122, 208, 30, 15).fill({ color: 0x5b4029, alpha: 0.8 })
    // Ljusslinga i luckans överkant.
    for (let i = -3; i <= 3; i++) {
      hatch.circle(BOBO.x + i * 30, BOBO.y - 110, 6).fill({ color: 0xffd98a, alpha: 0.95 })
    }
    c.addChild(hatch)

    // Upphängda redskap på väggen (stekspade + gaffel). Hänger till HÖGER om
    // knappkolumnen — ton-mätaren dyker upp vid 560,214 och får inte krocka.
    const tools = new Graphics()
    tools.roundRect(700, 96, 190, 9, 4).fill(0x8d96a4)
    tools.roundRect(740, 105, 11, 74, 5).fill(0x5b5260)
    tools.roundRect(728, 179, 35, 30, 8).fill(0xb2bac6)
    tools.roundRect(826, 105, 11, 66, 5).fill(0x5b5260)
    for (const dx of [0, 11, 22]) tools.roundRect(816 + dx, 171, 6, 30, 3).fill(0xb2bac6)
    c.addChild(tools)

    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Grillmästaren Bobo: maskot-huvudet med kropp, förkläde, tassar och kockmössa.
  _buildBobo() {
    const c = new Container()
    c.position.set(BOBO.x, BOBO.y)

    const body = new Graphics()
    // Armar bakom bålen.
    body.roundRect(-78, 42, 38, 20, 10).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.roundRect(40, 42, 38, 20, 10).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.circle(-78, 52, 15).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.circle(78, 52, 15).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    // Tassar nedtill.
    body.ellipse(-27, 112, 22, 14).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.ellipse(27, 112, 22, 14).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    // Bål med skuggkant.
    body.roundRect(-54, 24, 108, 92, 36).fill(COLORS.orangeDark)
    body.roundRect(-54, 18, 108, 92, 36).fill(COLORS.cream)
    // Rutigt grillförkläde med hängslen och band.
    body.moveTo(-31, 42).lineTo(31, 42).lineTo(28, 100).quadraticCurveTo(0, 110, -28, 100).closePath()
      .fill(0xfffdf7).stroke({ width: 3, color: 0xe2d4b8 })
    for (const x of [-20, -4, 12]) body.roundRect(x, 44, 8, 54, 3).fill({ color: 0xf3b0a0, alpha: 0.55 })
    for (const y of [52, 70, 88]) body.roundRect(-29, y, 58, 7, 3).fill({ color: 0xf3b0a0, alpha: 0.5 })
    body.moveTo(-18, 42).lineTo(-9, 20).stroke({ width: 7, color: COLORS.orange, cap: 'round' })
    body.moveTo(18, 42).lineTo(9, 20).stroke({ width: 7, color: COLORS.orange, cap: 'round' })
    body.roundRect(-34, 54, 68, 11, 6).fill(COLORS.orange)
    c.addChild(body)

    // Huvudet (maskoten) + kockmössa.
    c.addChild(makeMascot(46))
    const hat = new Graphics()
    hat.roundRect(-35, -64, 70, 23, 9).fill(0xfffdf7).stroke({ width: 3, color: 0xe2d4b8 })
    hat.circle(-25, -80, 21).fill(0xfffdf7)
    hat.circle(0, -88, 25).fill(0xfffdf7)
    hat.circle(25, -80, 21).fill(0xfffdf7)
    hat.roundRect(-33, -86, 66, 27, 13).fill(0xfffdf7)
    hat.roundRect(-35, -64, 70, 23, 9).stroke({ width: 3, color: 0xe2d4b8 })
    c.addChild(hat)

    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // ---- Bobos önskelista (frivillig order) ---------------------------------

  _newOrder() {
    const pool = ITEMS.filter((i) => i.good)
    const n = 1 + (Math.random() < 0.45 ? 1 : 0) // 1–2 önskningar — aldrig övermäktigt
    this._order = shuffle(pool.slice()).slice(0, n)
    this._drawOrder()
  },

  // Pratbubblan med de önskade ingredienserna (bild, ingen läsning).
  _drawOrder() {
    const b = this._orderBubble
    if (!b || b.destroyed) return
    b.removeChildren().forEach((ch) => ch.destroy({ children: true }))
    const n = this._order.length
    const w = 44 + n * 74
    const h = 100
    const bg = new Graphics()
      .roundRect(-w / 2 + 5, -h / 2 + 7, w, h, 28).fill({ color: COLORS.shadow, alpha: 0.08 })
      .roundRect(-w / 2, -h / 2, w, h, 28).fill(0xfffdf7).stroke({ width: 4, color: COLORS.orange })
    // Svans nedåt mot Bobo.
    bg.moveTo(10, h / 2 - 6).lineTo(28, h / 2 + 26).lineTo(44, h / 2 - 10).closePath()
      .fill(0xfffdf7).stroke({ width: 4, color: COLORS.orange })
    bg.eventMode = 'none'
    b.addChild(bg)
    this._order.forEach((item, i) => {
      const v = makeItemView(item, 62)
      v.position.set(-((n - 1) * 74) / 2 + i * 74, 0)
      b.addChild(v)
      bounceIn(v, { delay: 0.1 + i * 0.08 })
    })
    b.scale.set(1)
  },

  _orderFilled() {
    if (!this._order.length) return false
    return this._order.every((o) => this._stack.some((v) => v._ing?.id === o.id))
  },

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

  // Ritad soptunna (metall med lock och handtag) — inget emoji.
  _buildTrash(ctx) {
    const c = new Container()
    const plate = new Graphics()
      .circle(0, 8, 58).fill({ color: COLORS.shadow, alpha: 0.08 })
      .circle(0, 0, 56).fill({ color: 0xffffff, alpha: 0.7 }).stroke({ width: 4, color: 0xe6d8bf })
    plate.eventMode = 'none'
    const bin = new Graphics()
    bin.moveTo(-32, -18).lineTo(32, -18).lineTo(25, 34).quadraticCurveTo(24, 42, 15, 42)
      .lineTo(-15, 42).quadraticCurveTo(-24, 42, -25, 34).closePath().fill(0x9aa2b1)
    bin.moveTo(-32, -18).lineTo(-25, 34).quadraticCurveTo(-24, 42, -15, 42).lineTo(-6, 42)
      .lineTo(-12, -18).closePath().fill({ color: 0xb6bdc9, alpha: 0.9 })
    for (const x of [-14, 0, 14]) {
      bin.moveTo(x, -10).lineTo(x - x * 0.22, 34).stroke({ width: 2.5, color: 0x7c8494, alpha: 0.7 })
    }
    bin.roundRect(-38, -30, 76, 16, 8).fill(0xb6bdc9).stroke({ width: 3, color: 0x7c8494 })
    bin.roundRect(-10, -40, 20, 12, 6).fill(0x7c8494)
    bin.eventMode = 'none'
    c.addChild(plate, bin)
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
    const shelf = new Graphics()
      .roundRect(70, SHELF_Y - 52, 1140, 96, 28).fill({ color: 0xfffaf0, alpha: 0.94 }).stroke({ width: 5, color: 0xd8bf9a })
      .roundRect(84, SHELF_Y - 44, 1112, 18, 9).fill({ color: 0xf0e2cc, alpha: 0.9 })
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
      // Ritad vy nedskalad till hyllfacket (sidoprofiler är breda).
      const view = viewFor(ing, 96)
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
    view._th = layerThickness(view, ing)
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
    // Önskade sig Bobo just den här? Extra fest — men aldrig ett krav.
    if (this._order.some((o) => o.id === ing.id)) {
      sparkle(ctx.fxLayer, BUILD.x, BUILD.y + view.y, { count: 8 })
      if (this._orderBubble && !this._orderBubble.destroyed) pop(this._orderBubble)
      if (this._customer && !this._customer.destroyed) pop(this._customer, { scale: 1.12 })
    }
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
    const w = Math.max(ing.w, 96)
    const h = Math.max((view._th || ing.th) + 26, 54)
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
      const th = v._th || v._ing?.th || 40
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
      const th = this._stack[i]._th || this._stack[i]._ing?.th || 40
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
    // +7: locket vilar PÅ det översta lagret i stället för att sväva ovanför det.
    if (this._topBun && !this._topBun.destroyed) this._topBun.y = this._stackTopY - TOP_BUN_H / 2 + 7
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

  // Per-lager grillning: VARJE lager bryns efter sin egen känslighet (`bake`), inte
  // hela burgaren som en klump. Biffen blir mörk, salladen knappt alls, osten smälter
  // (plattas ut och breder ut sig) och bröden rostas svagt. Exit-säkert: förstörda
  // vyer hoppas över.
  _applyBake() {
    const t = this._bake
    for (const v of this._stack) {
      if (!v || v.destroyed) continue
      const ing = v._ing
      v.tint = bakeTint(t * (ing?.bake ?? 0.6))
      if (ing?.id === 'ost') {
        // Smältande ost: sjunker ihop och rinner ut i sidled.
        v.scale.set(1 + t * 0.07, 1 - t * 0.3)
      }
    }
    for (const bun of [this._bottomBun, this._topBun]) {
      if (bun && !bun.destroyed) bun.tint = bakeTint(t * BUN_BAKE)
    }
  },

  _update(ctx, t) {
    if (!this._alive) return
    const dt = (t.deltaMS || 16.67) / 1000

    // Bobo guppar lugnt i vila (P0 ASSETS: eget liv) — och önskelistan andas med.
    this._bob += dt
    if (this._customer && !this._customer.destroyed) {
      this._customer.y = BOBO.y + Math.sin(this._bob * 1.7) * 4
    }
    if (this._orderBubble && !this._orderBubble.destroyed) {
      this._orderBubble.y = ORDER.y + Math.sin(this._bob * 1.7 + 0.7) * 3
    }

    // Lågorna ritas om med fast intervall (~120 ms), inte varje frame; intensiteten
    // följer värmen vid grillning, lugnt flimmer annars.
    this._flameAcc += dt
    if (this._flameAcc >= 0.12) {
      this._flameAcc = 0
      this._drawFlames(this._phase === 'grilling' ? 0.3 + this._bake * 0.7 : 0.25)
    }

    if (this._phase === 'grilling') {
      this._bake = clamp(this._bake + dt / BAKE_SECONDS, 0, 1)
      this._applyBake()
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
          puff(ctx.fxLayer, GRILL.x + (Math.random() * 90 - 45), GRILL.y - 110, { count: 5, color: 0xdcd8d0 })
        }
      }
      if (this._bake >= 1 && !this._autoOff) {
        this._autoOff = ctx.later(1.8, () => { if (this._alive && this._phase === 'grilling') this._takeOff(ctx) })
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
    this._serveToCustomer(ctx, tone, this._orderFilled()) // burgaren flyger till Bobo

    this._rounds += 1
    ctx.progress.setCustom('burgare', this._rounds)
    ctx.progress.setLevel(this._rounds)
    ctx.progress.complete()

    this._resetTimer = ctx.later(2.6, () => { if (this._alive) this._reset(ctx) })
  },

  // En liten kopia av DEN HÄR burgaren (samma lager, samma grillade toner) — ritad,
  // aldrig en emoji. Den är det som flyger till Bobo.
  _makeMiniBurger(tone) {
    const c = new Container()
    const scale = 0.34
    const inner = new Container()
    inner.scale.set(scale)
    const bottom = makeBunBottom()
    bottom.y = -BOTTOM_BUN_H / 2
    bottom.tint = bakeTint(tone * BUN_BAKE)
    inner.addChild(bottom)
    let y = -BOTTOM_BUN_H
    for (const v of this._stack) {
      const ing = v?._ing
      if (!ing) continue
      const layer = makeItemView(ing)
      const th = v._th || ing.th
      layer.y = y - th / 2
      layer.tint = bakeTint(tone * (ing.bake ?? 0.6))
      inner.addChild(layer)
      y -= th
    }
    const top = makeBunTop()
    top.y = y - TOP_BUN_H / 2
    top.tint = bakeTint(tone * BUN_BAKE)
    inner.addChild(top)
    // Centrera den hopvikta stapeln kring (0,0) så den flyger snyggt.
    inner.y = (-y + BOTTOM_BUN_H) * 0.5 * scale
    c.addChild(inner)
    c.eventMode = 'none'
    return c
  },

  // Burgaren flyger till Bobo som mumsar — mottagaren för det man byggt.
  _serveToCustomer(ctx, tone, filled) {
    const c = this._customer
    if (!c || c.destroyed) return
    const item = this._makeMiniBurger(tone)
    item.position.set(BUILD.x, BUILD.y - 120)
    this._root.addChild(item)
    const st = { x: BUILD.x, y: BUILD.y - 120, s: 1 }
    this._serveTween = gsap.to(st, {
      x: c.x, y: c.y - 10, s: 0.7, duration: 0.6, ease: 'power2.in',
      onUpdate: () => {
        if (item.destroyed) { this._serveTween?.kill(); return }
        item.position.set(st.x, st.y)
        item.scale.set(st.s)
      },
      onComplete: () => {
        if (!item.destroyed) item.destroy()
        if (this._alive && c && !c.destroyed) {
          pop(c, { scale: 1.2 })
          puff(ctx.fxLayer, c.x, c.y - 10, { count: 8 })
          floatText(ctx.fxLayer, c.x, c.y - 92, randomFrom(['😋', 'Mums!', '❤️']), { fontSize: 42 })
          ctx.services.voice.say(filled ? 'Precis som jag önskade mig! Tack så mycket!' : randomFrom(SERVE_CHEERS))
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
    // Nollställ rostningen på bröden (lagren är borta med stapeln).
    for (const bun of [this._bottomBun, this._topBun]) {
      if (bun && !bun.destroyed) bun.tint = 0xffffff
    }
    this._setPaletteEnabled(true)
    this._grillBtn.visible = true
    pop(this._grillBtn)
    // Bobo önskar sig något nytt till nästa burgare.
    this._newOrder()
    if (this._orderBubble && !this._orderBubble.destroyed) bounceIn(this._orderBubble)
    this._setHint('En ny burgare! Bygg igen 🍔')
    ctx.services.voice.say(randomFrom(ORDER_CUES))
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
    if (this._orderBubble && !this._orderBubble.destroyed) {
      gsap.killTweensOf(this._orderBubble)
      gsap.killTweensOf(this._orderBubble.scale)
      for (const ch of this._orderBubble.children) {
        gsap.killTweensOf(ch)
        gsap.killTweensOf(ch.scale)
      }
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

// Grillknappens ikon: en ritad låga med en pil åt vänster (mot grillen). Ersätter
// emoji-paret 🔥⬅️, som lästes som en blå ruta bredvid en låga.
function makeFlameArrow() {
  const c = new Container()
  const g = new Graphics()
  // Pil mot grillen (vänster).
  g.moveTo(-58, 0).lineTo(-24, -22).lineTo(-24, -8).lineTo(6, -8).lineTo(6, 8).lineTo(-24, 8)
    .lineTo(-24, 22).closePath().fill(0xfffdf7)
  // Låga.
  g.moveTo(40, 30).quadraticCurveTo(4, 12, 34, -30).quadraticCurveTo(42, -8, 54, -18)
    .quadraticCurveTo(70, 2, 40, 30).fill(0xffd23c)
  g.moveTo(40, 30).quadraticCurveTo(22, 14, 40, -10).quadraticCurveTo(48, 4, 52, -2)
    .quadraticCurveTo(60, 12, 40, 30).fill(0xff8a2a)
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

