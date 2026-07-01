// Trollkarlens Blandning — barnet drar ihop två glödande element-droppar i
// trollkarlens kittel och ser dem pysa ihop till något HELT nytt: eld + vatten
// blir ånga, eld + jord blir lava. Varje upptäckt fyller en magisk receptbok.
// Ren upptäckar-glädje UTAN ett enda felsteg.
//
// Kärnloop: dra två droppar i kitteln → ~0,4s omrörning → de REAGERAR enligt en
// receptbok (ordnings-oberoende par). Recept finns → pys + ny draggbar resultat-
// droppe på hyllan + (om mål) en ifylld bokrad. Recept saknas → mjuk grå puff +
// "Hmm... prova en annan!" och ingredienserna studsar ut (inget förbrukas).
// Hyll-dropparna är OÄNDLIGA källor (snäpper hem). Fyll alla bokrader → kitteln
// kokar över i en Trolldryck, firande + complete(), sedan nästa (rikare) runda.
//
// NO-FAIL: en idle-timer låter trollkarlen ge allt tydligare ledtrådar (lyser de
// två droppar som hör ihop + prick-linje + "Prova Eld och Vatten!") och efter
// några ledtrådar utför han kombon SJÄLV → ett nytt recept hittas ALLTID.
//
// EXIT-SÄKERT: reaktions-partiklar går via lib/feedback.js (redan exit-säkra);
// bubblorna är ticker-drivna (ALDRIG gsap på dem); brygd-färgen tweenas via en
// {}-proxy som bara rör _brew om det lever. this._alive + this._resolving vaktar
// alla fördröjda callbacks. destroy() tar bort ticker, dödar tweens/bubblor,
// avbryter röst, river DragController och förstör _root.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, puff, sparkle, burst, floatText, bigCelebration, ripple } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// --- Geometri (designkoordinater 1280×720) ---
const CX = 560 // kittelns mitt-x
const CY = 400 // kittelns mitt-y
const BREW_Y = CY - 70 // brygd-ytans y (330) — används för fxLayer-partiklar
const SHELF_Y = 648 // dropparnas vilo-y på hyllan
const SHELF_X0 = 150
const SHELF_X1 = 850
const HINT_MS = 6000 // ms utan handling → eskalerande ledtråd

// --- Element-register: id → { emoji, color, namn } ---
const ELEMENTS = {
  // baser
  eld: { emoji: '🔥', color: 0xff6b6b, namn: 'Eld' },
  vatten: { emoji: '💧', color: 0x4aa3df, namn: 'Vatten' },
  jord: { emoji: '🌱', color: 0x5bbf6a, namn: 'Jord' },
  luft: { emoji: '🌬️', color: 0x57c8c3, namn: 'Luft' },
  is: { emoji: '❄️', color: 0xbdeefa, namn: 'Is' },
  // resultat
  anga: { emoji: '💨', color: 0xd8e6ee, namn: 'Ånga' },
  lera: { emoji: '🟤', color: 0x8a5a3b, namn: 'Lera' },
  lava: { emoji: '🌋', color: 0xf5731e, namn: 'Lava' },
  sno: { emoji: '☃️', color: 0xffffff, namn: 'Snö' },
  moln: { emoji: '☁️', color: 0xe8eef2, namn: 'Moln' },
  sol: { emoji: '☀️', color: 0xffd35c, namn: 'Sol' },
  regn: { emoji: '🌧️', color: 0x6fa8d6, namn: 'Regn' },
  sten: { emoji: '🪨', color: 0x9b9088, namn: 'Sten' },
  kruka: { emoji: '🏺', color: 0xc77c4a, namn: 'Kruka' },
  regnbage: { emoji: '🌈', color: 0xa78bfa, namn: 'Regnbåge' },
  enhorning: { emoji: '🦄', color: 0xf7b9e4, namn: 'Enhörning' }, // hemligt recept (ej i boken)
}

const BASE_IDS = ['eld', 'vatten', 'jord', 'luft', 'is']

// --- Recept (paren är ORDNINGS-OBEROENDE; nyckel = sorterade id:n) ---
const RAW_RECIPES = [
  ['eld', 'vatten', 'anga'],
  ['jord', 'vatten', 'lera'],
  ['eld', 'jord', 'lava'],
  ['is', 'vatten', 'sno'],
  ['luft', 'vatten', 'moln'],
  ['eld', 'luft', 'sol'],
  ['eld', 'is', 'vatten'], // is smälter
  ['lava', 'vatten', 'sten'],
  ['lava', 'is', 'sten'],
  ['eld', 'lera', 'kruka'],
  ['sol', 'vatten', 'regnbage'],
  ['moln', 'is', 'sno'],
  ['sol', 'sno', 'vatten'],
  ['sol', 'regnbage', 'enhorning'], // hemligt: står inte i receptboken → "en till!"-jakt
]
const recipeKey = (a, b) => [a, b].sort().join('+')
const RECIPES = new Map(RAW_RECIPES.map(([a, b, r]) => [recipeKey(a, b), r]))
// Första receptet som ger ett visst resultat (för bok-rad-ikoner + plan).
const recipeFor = (resId) => {
  const r = RAW_RECIPES.find((x) => x[2] === resId)
  return r ? { a: r[0], b: r[1], res: resId } : null
}

// Resultat nåbara från baserna (för slumpade nivåer 4+).
const REACHABLE_GOALS = ['anga', 'lera', 'lava', 'sno', 'moln', 'sol', 'sten', 'kruka', 'regnbage']

// Nivåer 0–3: tillgängliga baser + mål-recept (= receptbokens rader).
const LEVELS = [
  { bases: ['eld', 'vatten', 'jord', 'luft'], goals: ['anga', 'lera', 'lava', 'moln'] },
  { bases: ['eld', 'vatten', 'jord', 'luft'], goals: ['anga', 'lera', 'lava', 'moln'] },
  { bases: ['eld', 'vatten', 'jord', 'luft', 'is'], goals: ['anga', 'lava', 'moln', 'sno', 'sol'] },
  { bases: ['eld', 'vatten', 'jord', 'luft', 'is'], goals: ['lava', 'kruka', 'regnbage', 'anga', 'moln', 'sno'] },
]

export default {
  id: 'trollblandning',
  titleSv: 'Trollkarlens Blandning',
  icon: '🧪',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'trollblandning',
  voiceIntro: 'Dra två droppar i kitteln och se vad som händer!',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._completed = false
    this._inCauldron = []
    this._dropRecs = []
    this._rows = []
    this._bubbles = []
    this._bubT = 0
    this._idle = 0
    this._hintCount = 0
    this._lastHintKey = null
    this._drag = null
    this._fxCalls = [] // spårade delayedCalls för signatur-effekter (dödas i destroy)
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Bakgrund FÖRST — magisk stjärnhimmel.
    this._root.addChild(createScene('night', { width: ctx.width, height: ctx.height }))

    // 2) Hylla (palett).
    const shelf = new Graphics().roundRect(60, 596, 840, 104, 30).fill(COLORS.brown).stroke({ width: 6, color: 0x6b4027 })
    shelf.eventMode = 'none'
    this._root.addChild(shelf)

    // 3) Receptbok-panel (rygg + rubrik + räknare; rader byggs per runda).
    const book = new Container()
    book.eventMode = 'none'
    book.addChild(new Graphics().roundRect(936, 96, 308, 470, 24).fill(COLORS.cream).stroke({ width: 6, color: COLORS.brown }))
    book.addChild(new Graphics().roundRect(936, 96, 30, 470, 24).fill(COLORS.brown))
    const title = new Text({ text: '📖 Receptbok', style: { fontFamily: FONT.title, fontSize: 28, fontWeight: '800', fill: COLORS.brown } })
    title.anchor.set(0.5)
    title.position.set(1102, 132)
    book.addChild(title)
    this._counter = new Text({ text: '0 / 0', style: { fontFamily: FONT.body, fontSize: 22, fontWeight: '700', fill: COLORS.inkSoft } })
    this._counter.anchor.set(0.5)
    this._counter.position.set(1102, 548)
    book.addChild(this._counter)
    this._root.addChild(book)
    this._rowLayer = new Container()
    this._rowLayer.eventMode = 'none'
    this._root.addChild(this._rowLayer)

    // 4) Kittel (skugga, kropp, ben, brygd-yta, bubbel-lager, rim).
    const cau = new Container()
    cau.position.set(CX, CY)
    cau.eventMode = 'none'
    cau.interactiveChildren = false
    cau.addChild(new Graphics().ellipse(0, 92, 150, 28).fill({ color: 0x000000, alpha: 0.18 }))
    cau.addChild(new Graphics().ellipse(0, 0, 140, 96).fill(0x2f2a4a).stroke({ width: 8, color: 0x1c1830 }))
    cau.addChild(new Graphics().roundRect(-78, 84, 38, 42, 12).fill(0x1c1830))
    cau.addChild(new Graphics().roundRect(40, 84, 38, 42, 12).fill(0x1c1830))
    this._brew = new Graphics()
    cau.addChild(this._brew)
    this._bubbleLayer = new Container()
    this._bubbleLayer.eventMode = 'none'
    cau.addChild(this._bubbleLayer)
    cau.addChild(new Graphics().ellipse(0, -70, 146, 36).fill(0x423a66).stroke({ width: 6, color: 0x6b4fc4 }))
    this._cauldron = cau
    this._root.addChild(cau)

    // 5) Ingrediens-platser (två prickade ringar ovanför kitteln).
    this._slots = []
    for (const sx of [CX - 52, CX + 52]) {
      const c = new Container()
      c.position.set(sx, CY - 118)
      c.eventMode = 'none'
      const ring = new Graphics()
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2
        ring.circle(Math.cos(ang) * 34, Math.sin(ang) * 34, 2.5).fill({ color: 0xffffff, alpha: 0.25 })
      }
      const fill = new Graphics()
      const emoji = new Text({ text: '', style: { fontFamily: FONT.body, fontSize: 38 } })
      emoji.anchor.set(0.5)
      emoji.visible = false
      c.addChild(ring, fill, emoji)
      this._root.addChild(c)
      this._slots.push({ fill, emoji })
    }

    // 6) Trollkarl Bobo (maskot) + egenritad spetshatt.
    const w = new Container()
    w.position.set(180, 210)
    w.eventMode = 'none'
    w.addChild(makeMascot(80))
    const hat = new Graphics()
    hat.poly([0, -150, -70, -30, 70, -30]).fill(COLORS.purple).stroke({ width: 6, color: 0x6b4fc4 })
    hat.ellipse(0, -26, 82, 18).fill(COLORS.purple).stroke({ width: 6, color: 0x6b4fc4 })
    w.addChild(hat)
    const star = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 40 } })
    star.anchor.set(0.5)
    star.position.set(0, -92)
    w.addChild(star)
    this._wizard = w
    this._wizStar = star // stjärn-stav — studsar när trollkarlen hejar
    this._wizardBase = { x: 180, y: 210 } // hemma-pose (gesterna återgår hit)
    this._root.addChild(w)

    // 7) Töm-knapp (barnvänlig kontroll — INTE bakom föräldra-grind).
    const btn = new Container()
    btn.position.set(740, 470)
    const lip = new Graphics().circle(0, 6, 48).fill(0x6b4fc4)
    const face = new Graphics().circle(0, 0, 48).fill(COLORS.purple).stroke({ width: 4, color: 0x6b4fc4 })
    face.circle(-14, -14, 12).fill({ color: 0xffffff, alpha: 0.25 })
    const ic = new Text({ text: '🌀', style: { fontFamily: FONT.body, fontSize: 44 } })
    ic.anchor.set(0.5)
    btn.addChild(lip, face, ic)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.interactiveChildren = false
    btn.hitArea = new Circle(0, 0, 60) // hit-halo ≥96px
    this._onEmpty = () => {
      if (!this._alive) return
      pop(btn)
      this._emptyCauldron(ctx)
    }
    btn.on('pointertap', this._onEmpty)
    this._emptyBtn = btn
    this._root.addChild(btn)

    // 8) Logiskt drop-mål (osynlig cirkel r150 runt brygd-ytan) — tap-tap-mål.
    const dz = new Graphics().circle(0, 0, 150).fill({ color: 0xffffff, alpha: 0.001 })
    dz.position.set(CX, BREW_Y)
    dz.eventMode = 'static'
    dz.hitArea = new Circle(0, 0, 150)
    this._dropZone = dz
    this._root.addChild(dz)

    // 9) Drop-lager (alla droppar) + prick-linje för ledtrådar (överst).
    this._dropLayer = new Container()
    this._root.addChild(this._dropLayer)
    this._hintLine = new Graphics()
    this._hintLine.eventMode = 'none'
    this._root.addChild(this._hintLine)

    // Bygg första rundan.
    this._buildRound(ctx)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._reactCall?.kill()
    this._autoCall?.kill()
    this._winTimer?.kill()
    this._brewTween?.kill()
    for (const c of this._fxCalls || []) c?.kill()
    this._fxCalls = []
    this._drag?.destroy()
    for (const b of this._bubbles || []) if (b.g && !b.g.destroyed) b.g.destroy()
    this._bubbles = []
    for (const rec of this._dropRecs || []) {
      if (rec?.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
    }
    if (this._wizard && !this._wizard.destroyed) {
      gsap.killTweensOf(this._wizard)
      gsap.killTweensOf(this._wizard.scale)
    }
    if (this._wizStar && !this._wizStar.destroyed) gsap.killTweensOf(this._wizStar.scale)
    if (this._cauldron && !this._cauldron.destroyed) gsap.killTweensOf(this._cauldron)
    if (this._brew && !this._brew.destroyed) gsap.killTweensOf(this._brew)
    if (this._emptyBtn && !this._emptyBtn.destroyed) {
      this._emptyBtn.off('pointertap', this._onEmpty)
      gsap.killTweensOf(this._emptyBtn.scale)
    }
    for (const r of this._rows || []) if (r.resultText && !r.resultText.destroyed) gsap.killTweensOf(r.resultText.scale)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },

  // ---- Runda-uppbyggnad ---------------------------------------------------

  _buildRound(ctx) {
    if (!this._alive) return
    this._completed = false
    this._resolving = false
    this._inCauldron = []
    this._idle = 0
    this._hintCount = 0
    this._lastHintKey = null
    this._reactCall?.kill()
    this._autoCall?.kill()
    this._winTimer?.kill()
    this._brewTween?.kill()
    for (const c of this._fxCalls || []) c?.kill()
    this._fxCalls = []
    this._paths = new Map() // resultat-id → Set av använda par-nycklar (för "en till väg!")
    this._clearHintLine()
    this._renderSlots()

    // Nivå-konfig (0–3 fasta, 4+ slumpade nåbara mål).
    let cfg
    if (this._level <= 3) cfg = LEVELS[this._level]
    else cfg = { bases: ['eld', 'vatten', 'jord', 'luft', 'is'], goals: shuffle(REACHABLE_GOALS).slice(0, 6 + (this._level % 2)) }
    this._bases = cfg.bases.slice()
    this._goals = cfg.goals.slice()
    this._discovered = new Set()
    this._shelfElems = new Set(this._bases)
    this._plan = this._buildPlan(this._goals)

    // Mörk brygd-start (slumpas lätt på höga nivåer).
    this._brewColor = this._level <= 3 ? 0x2a2342 : randomFrom([0x2a2342, 0x23323a, 0x3a2342, 0x1f2e2a])
    this._drawBrew(this._brewColor)

    // Fräsch DragController + bas-droppar (oändliga källor).
    this._clearDrops()
    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._dropZone, () => true, { hitRadius: 150 })
    this._dropRecs = []
    this._bases.forEach((id, i) => {
      const rec = this._makeDrop(ctx, id)
      this._dropRecs.push(rec)
      bounceIn(rec.view, { delay: 0.05 * i })
    })
    this._layoutShelf()

    // Bok-rader (❓-platshållare).
    this._buildBook(ctx)
  },

  // Minimal recept-plan: alla recept som behövs för att nå målen, deps först.
  _buildPlan(goals) {
    const order = []
    const seen = new Set()
    const add = (id) => {
      if (BASE_IDS.includes(id) || seen.has(id)) return
      seen.add(id)
      const r = recipeFor(id)
      if (!r) return
      add(r.a)
      add(r.b)
      order.push(r)
    }
    goals.forEach(add)
    return order
  },

  _buildBook(ctx) {
    for (const c of this._rowLayer.removeChildren()) c.destroy({ children: true })
    this._rows = []
    const n = this._goals.length
    const step = Math.min(60, 360 / n)
    const y0 = 180
    this._goals.forEach((g, i) => {
      const r = recipeFor(g)
      const rowY = y0 + i * step
      const row = new Container()
      row.position.set(0, rowY)
      row.eventMode = 'none'
      row.addChild(this._miniIcon(r.a, 992))
      const plus = new Text({ text: '+', style: { fontFamily: FONT.display, fontSize: 26, fontWeight: '700', fill: COLORS.brown } })
      plus.anchor.set(0.5)
      plus.position.set(1030, 0)
      row.addChild(plus)
      row.addChild(this._miniIcon(r.b, 1068))
      const eq = new Text({ text: '=', style: { fontFamily: FONT.display, fontSize: 26, fontWeight: '700', fill: COLORS.brown } })
      eq.anchor.set(0.5)
      eq.position.set(1108, 0)
      row.addChild(eq)
      const resT = new Text({ text: '❓', style: { fontFamily: FONT.body, fontSize: 40 } })
      resT.anchor.set(0.5)
      resT.position.set(1158, 0)
      row.addChild(resT)
      this._rowLayer.addChild(row)
      this._rows.push({ result: g, resultText: resT, done: false, wx: 1158, wy: rowY })
    })
    this._updateCounter()
  },

  _miniIcon(elemId, x) {
    const E = ELEMENTS[elemId]
    const c = new Container()
    c.position.set(x, 0)
    c.eventMode = 'none'
    c.addChild(new Graphics().circle(0, 0, 18).fill(E.color).stroke({ width: 3, color: 0xffffff, alpha: 0.6 }))
    const t = new Text({ text: E.emoji, style: { fontFamily: FONT.body, fontSize: 24 } })
    t.anchor.set(0.5)
    c.addChild(t)
    return c
  },

  _updateCounter() {
    if (this._counter && !this._counter.destroyed) {
      const d = (this._rows || []).filter((r) => r.done).length
      this._counter.text = `${d} / ${this._rows.length}`
    }
  },

  // ---- Droppar (oändliga hyll-källor) -------------------------------------

  _makeDrop(ctx, elemId) {
    const E = ELEMENTS[elemId]
    const c = new Container()
    c.position.set(500, SHELF_Y) // tillfälligt; _layoutShelf sätter hemmaplats
    const shadow = new Graphics().ellipse(0, 42, 40, 12).fill({ color: 0x000000, alpha: 0.18 })
    shadow.eventMode = 'none'
    const body = new Graphics().circle(0, 0, 52).fill(E.color).stroke({ width: 5, color: 0xffffff, alpha: 0.5 })
    body.eventMode = 'none'
    const gloss = new Graphics().circle(-18, -18, 12).fill({ color: 0xffffff, alpha: 0.6 })
    gloss.eventMode = 'none'
    const emoji = new Text({ text: E.emoji, style: { fontFamily: FONT.body, fontSize: 60 } })
    emoji.anchor.set(0.5)
    emoji.eventMode = 'none'
    c.addChild(shadow, body, gloss, emoji)
    c.interactiveChildren = false
    c.hitArea = new Circle(0, 0, 80) // ≥160px träffyta
    this._dropLayer.addChild(c)
    const rec = this._drag.addItem(c, { elem: elemId }, { onCorrect: (r) => this._onDropInCauldron(ctx, r) })
    return rec
  },

  // En källa landade i kitteln: registrera ingrediensen, återställ källan, snäpp hem.
  _onDropInCauldron(ctx, rec) {
    this._idle = 0
    this._hintCount = 0
    this._clearHintLine()
    this._addToCauldron(ctx, rec.data.elem)
    rec.placed = false
    rec.view.eventMode = 'static'
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.25, ease: 'back.out(1.4)' })
  },

  // Fördela alla droppar jämnt över hyllan (oändliga källor + upptäckta resultat).
  _layoutShelf() {
    const recs = (this._dropRecs || []).filter((r) => r?.view && !r.view.destroyed)
    const n = recs.length
    const span = SHELF_X1 - SHELF_X0
    const spacing = n <= 1 ? 0 : Math.min(116, span / (n - 1))
    recs.forEach((rec, i) => {
      const hx = SHELF_X0 + i * spacing
      rec.home.x = hx
      rec.home.y = SHELF_Y
      if (!rec.placed && this._drag && this._drag.active !== rec) {
        gsap.to(rec.view, { x: hx, y: SHELF_Y, duration: 0.3, ease: 'back.out(1.4)' })
      }
    })
  },

  _findDrop(elemId) {
    return (this._dropRecs || []).find((r) => r?.view && !r.view.destroyed && r.data.elem === elemId)
  },

  _clearDrops() {
    if (this._drag) {
      this._drag.destroy()
      this._drag = null
    }
    for (const rec of this._dropRecs || []) {
      if (rec?.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        rec.view.destroy({ children: true })
      }
    }
    this._dropRecs = []
  },

  // ---- Kittel-logik -------------------------------------------------------

  _addToCauldron(ctx, elem) {
    if (!this._alive || this._resolving || this._completed) return
    if (this._inCauldron.length >= 2) return
    this._inCauldron.push(elem)
    this._renderSlots()
    ctx.services.audio.sfx('pop')
    sparkle(ctx.fxLayer, CX, BREW_Y)
    this._idle = 0
    if (this._inCauldron.length === 2) {
      this._resolving = true // ingen tredje ingrediens under omrörningen
      this._wizardGesture('lean') // trollkarlen lutar sig fram och rör om
      this._reactCall?.kill()
      this._reactCall = gsap.delayedCall(0.4, () => {
        if (this._alive) this._react(ctx)
      })
    }
  },

  _renderSlots() {
    for (let i = 0; i < 2; i++) {
      const s = this._slots[i]
      const elem = this._inCauldron[i]
      if (elem) {
        const E = ELEMENTS[elem]
        s.fill.clear().circle(0, 0, 28).fill(E.color).stroke({ width: 3, color: 0xffffff, alpha: 0.5 })
        s.emoji.text = E.emoji
        s.emoji.visible = true
      } else {
        s.fill.clear()
        s.emoji.visible = false
      }
    }
  },

  _react(ctx) {
    if (!this._alive) return
    const pair = this._inCauldron.slice()
    this._inCauldron = []
    this._renderSlots()
    this._resolving = false // kitteln är fri igen (firande sätter den åter true)
    if (pair.length < 2) return
    const resId = RECIPES.get(recipeKey(pair[0], pair[1]))
    if (resId) this._onRecipe(ctx, resId, pair)
    else this._onNoRecipe(ctx, pair)
  },

  _onRecipe(ctx, resId, pair) {
    const E = ELEMENTS[resId]
    const already = this._shelfElems.has(resId)
    const isGoal = this._goals.includes(resId) && !this._rowDone(resId)

    // Spåra vilka par som ger detta resultat → fira när barnet hittar en NY väg.
    const pk = recipeKey(pair[0], pair[1])
    const known = this._paths.get(resId) || new Set()
    const newPath = already && !known.has(pk)
    known.add(pk)
    this._paths.set(resId, known)

    // Brygd-färg-tween + element-egen "föreställning" (signatur eller generisk).
    this._setBrew(E.color)
    this._reactShow(ctx, resId, E.color)

    if (!already) {
      this._shelfElems.add(resId)
      this._discovered.add(resId)
      this._spawnResultDrop(ctx, resId)
    }

    // Hemligt recept (enhörning) — extra stor överraskning, oavsett bok-mål.
    if (resId === 'enhorning' && !already) {
      this._wizardGesture('cheer')
      ctx.services.audio.sfx('celebrate')
      bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
      ctx.services.voice.say('En hemlig enhörning! Wow!')
    } else if (isGoal) {
      this._wizardGesture('cheer')
      ctx.services.audio.sfx('reveal')
      this._fxDelay(0.18, () => ctx.services.audio.sfx('celebrate'))
      this._fillRow(ctx, resId)
      ctx.services.voice.say(`${E.namn}! Vad fint!`)
    } else if (!already) {
      this._wizardGesture('cheer')
      ctx.services.audio.sfx('match')
      ctx.services.voice.say(`${E.namn}!`)
    } else if (newPath) {
      // En annan väg till ett redan upptäckt element — belöna experimentet.
      this._wizardGesture('cheer')
      ctx.services.audio.sfx('reveal')
      sparkle(ctx.fxLayer, CX, BREW_Y, { count: 10 })
      ctx.services.voice.say(`En till väg till ${E.namn}!`)
    } else {
      this._wizardGesture('lean')
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, CX, BREW_Y)
    }

    this._idle = 0
    this._checkComplete(ctx)
  },

  _onNoRecipe(ctx, pair) {
    // Lekfullt "fel"-svar: kitteln ryker grått, trollkarlen rycker på axlarna,
    // en mjuk komisk "plopp" — fortfarande positivt, aldrig en bestraffning.
    ctx.services.audio.sfx('soft')
    ctx.services.audio.tone({ freq: 300, slideTo: 150, dur: 0.2, type: 'sine', vol: 0.5 })
    puff(ctx.fxLayer, CX, BREW_Y, { count: 8, color: 0xb9b2c9 })
    // Grå rök bolmar upp ur kitteln.
    for (let i = 0; i < 3; i++) {
      this._fxDelay(0.1 * i, () => floatText(ctx.fxLayer, CX + (i - 1) * 26, BREW_Y - 6, '💨', { fontSize: 40, rise: 150 }))
    }
    if (this._cauldron && !this._cauldron.destroyed) wiggle(this._cauldron)
    this._wizardGesture('shrug') // rycker på axlarna / kliar hatten
    // Ingredienserna studsar ut igen (inget förbrukas).
    floatText(ctx.fxLayer, CX - 30, BREW_Y, ELEMENTS[pair[0]].emoji, { fontSize: 46, rise: 90 })
    floatText(ctx.fxLayer, CX + 30, BREW_Y, ELEMENTS[pair[1]].emoji, { fontSize: 46, rise: 90 })
    ctx.services.voice.say(randomFrom(['Hmm... prova en annan!', 'Oj, det blev ingenting. Prova igen!', 'Hihi, prova ett annat par!']))
    this._idle = 0
  },

  _spawnResultDrop(ctx, resId) {
    const rec = this._makeDrop(ctx, resId)
    this._dropRecs.push(rec)
    bounceIn(rec.view)
    this._layoutShelf()
  },

  _rowDone(id) {
    const r = (this._rows || []).find((x) => x.result === id)
    return !!(r && r.done)
  },

  _fillRow(ctx, resId) {
    const row = (this._rows || []).find((r) => r.result === resId && !r.done)
    if (!row) return
    row.done = true
    if (row.resultText && !row.resultText.destroyed) {
      row.resultText.text = ELEMENTS[resId].emoji
      pop(row.resultText)
    }
    // Boken firar: gyllene lyse-ring + en grön bock-stämpel som studsar upp.
    ripple(ctx.fxLayer, row.wx, row.wy, { color: COLORS.yellow, maxR: 46, duration: 0.5 })
    sparkle(ctx.fxLayer, row.wx, row.wy)
    floatText(ctx.fxLayer, row.wx + 40, row.wy, '✅', { fontSize: 34, rise: 42, duration: 0.8 })
    this._updateCounter()
  },

  _emptyCauldron(ctx) {
    if (this._completed) return
    this._reactCall?.kill()
    this._resolving = false
    if ((this._inCauldron || []).length) {
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, CX, BREW_Y, { count: 6, color: 0xb9b2c9 })
    }
    this._inCauldron = []
    this._renderSlots()
    this._idle = 0
    this._hintCount = 0
    this._clearHintLine()
  },

  _checkComplete(ctx) {
    if (this._completed) return
    if (!(this._rows || []).length) return
    if (!this._rows.every((r) => r.done)) return

    this._completed = true
    this._resolving = true
    this._clearHintLine()

    // Hela receptboken lyser upp när sista raden klaras (innan över-kok-firandet).
    ripple(ctx.fxLayer, 1090, 330, { color: COLORS.yellow, maxR: 190, duration: 0.7, width: 10 })
    sparkle(ctx.fxLayer, 1090, 330, { count: 10 })

    floatText(ctx.fxLayer, CX, BREW_Y - 10, '🧪', { fontSize: 120, rise: 220 })
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, CX, BREW_Y, { count: 22, power: 1.3 })
    this._wizardGesture('cheer')

    // Spara framsteg (höj nivå, ackumulera upptäckta recept, räkna rundor).
    this._level += 1
    ctx.progress.setLevel(this._level)
    const cur = ctx.progress.get().custom || {}
    const prev = Array.isArray(cur.recept) ? cur.recept : []
    ctx.progress.setCustom('recept', Array.from(new Set([...prev, ...this._discovered])))
    ctx.progress.setCustom('rundor', (cur.rundor || 0) + 1)
    ctx.progress.complete()

    this._winTimer?.kill()
    this._winTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildRound(ctx)
    })
  },

  // ---- Brygd-yta (exit-säker {}-proxy-tween) ------------------------------

  _drawBrew(color) {
    if (!this._brew || this._brew.destroyed) return
    this._brew.clear()
    this._brew.ellipse(0, -70, 120, 28).fill(color)
    this._brew.ellipse(-36, -78, 26, 8).fill({ color: 0xffffff, alpha: 0.22 })
  },

  _setBrew(to) {
    const from = this._brewColor
    this._brewColor = to
    this._brewTween?.kill()
    const st = { t: 0 }
    this._brewTween = gsap.to(st, {
      t: 1,
      duration: 0.5,
      onUpdate: () => {
        if (this._brew && !this._brew.destroyed) this._drawBrew(lerpColor(from, to, st.t))
      },
    })
  },

  // ---- Auto-hjälp: eskalerande ledtrådar → garanterad kombo ---------------

  // Nästa kombo att föreslå/utföra vars båda ingredienser finns på hyllan.
  _planStep() {
    // 1) Ett mål-recept som går att göra DIREKT nu.
    for (const g of this._goals) {
      if (this._rowDone(g)) continue
      const r = this._availRecipe(g)
      if (r) return r
    }
    // 2) Annars ett mellansteg (deps först) som låser upp ett mål.
    for (const r of this._plan || []) {
      if (!this._shelfElems.has(r.res) && this._shelfElems.has(r.a) && this._shelfElems.has(r.b)) return r
    }
    return null
  },

  _availRecipe(resId) {
    for (const x of RAW_RECIPES) {
      if (x[2] === resId && this._shelfElems.has(x[0]) && this._shelfElems.has(x[1])) return { a: x[0], b: x[1], res: resId }
    }
    return null
  },

  _hint(ctx) {
    if (!this._alive || this._resolving || this._completed) return
    const step = this._planStep()
    if (!step) return
    const key = step.a + '>' + step.b
    if (key === this._lastHintKey) this._hintCount++
    else {
      this._lastHintKey = key
      this._hintCount = 1
    }
    // Efter upprepade ledtrådar: trollkarlen gör kombon själv (alltid ett nytt recept).
    if (this._hintCount >= 3) {
      this._hintCount = 0
      this._clearHintLine()
      this._autoCombine(ctx, step)
      return
    }
    // Annars: lys upp de två dropparna + prick-linje + talad ledtråd.
    const da = this._findDrop(step.a)
    const db = this._findDrop(step.b)
    if (da) pop(da.view)
    if (db) pop(db.view)
    if (da && db) this._drawHintLine(da.view.x, da.view.y, db.view.x, db.view.y)
    this._wizardGesture('point') // pekar uppmuntrande mot hyllan
    ctx.services.voice.say(`Prova ${ELEMENTS[step.a].namn} och ${ELEMENTS[step.b].namn}!`)
  },

  _autoCombine(ctx, step) {
    if (this._resolving || this._completed) return
    this._inCauldron = []
    this._renderSlots()
    this._wizardGesture('lean')
    ctx.services.voice.say(`Titta, jag provar ${ELEMENTS[step.a].namn} och ${ELEMENTS[step.b].namn}!`)
    this._addToCauldron(ctx, step.a)
    this._autoCall?.kill()
    this._autoCall = gsap.delayedCall(0.3, () => {
      if (this._alive && !this._completed) this._addToCauldron(ctx, step.b)
    })
  },

  _drawHintLine(ax, ay, bx, by) {
    const g = this._hintLine
    if (!g || g.destroyed) return
    g.clear()
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      g.circle(ax + (bx - ax) * t, ay + (by - ay) * t, 4).fill({ color: COLORS.yellow, alpha: 0.8 })
    }
  },

  _clearHintLine() {
    if (this._hintLine && !this._hintLine.destroyed) this._hintLine.clear()
  },

  // ---- Levande trollkarl (gester i stället för bara pop) ------------------

  // Fyra korta poser: 'cheer' (höjer staven), 'lean' (lutar sig mot kitteln),
  // 'shrug' (rycker på axlarna vid fel), 'point' (pekar mot hyllan vid ledtråd).
  // Tweenar this._wizard direkt (en bestående barn-container → exit-säker: destroy
  // dödar dess tweens). Återgår alltid till hemma-posen.
  _wizardGesture(kind) {
    const w = this._wizard
    if (!w || w.destroyed) return
    const bx = this._wizardBase.x
    const by = this._wizardBase.y
    gsap.killTweensOf(w)
    if (kind === 'cheer') {
      gsap.timeline()
        .to(w, { y: by - 20, rotation: -0.06, duration: 0.16, ease: 'power2.out' })
        .to(w, { y: by, rotation: 0, duration: 0.55, ease: 'bounce.out' })
      pop(w, { scale: 1.14 })
      if (this._wizStar && !this._wizStar.destroyed) pop(this._wizStar, { scale: 1.45 })
    } else if (kind === 'lean') {
      gsap.timeline()
        .to(w, { x: bx + 26, rotation: 0.12, duration: 0.22, ease: 'power2.out' })
        .to(w, { x: bx, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' })
    } else if (kind === 'shrug') {
      gsap.timeline()
        .to(w, { y: by - 8, rotation: -0.09, duration: 0.14 })
        .to(w, { rotation: 0.09, duration: 0.14 })
        .to(w, { y: by, rotation: 0, duration: 0.22, ease: 'sine.inOut' })
    } else if (kind === 'point') {
      gsap.timeline()
        .to(w, { y: by + 12, rotation: 0.1, duration: 0.2, ease: 'power2.out' })
        .to(w, { y: by, rotation: 0, duration: 0.42, ease: 'back.out(1.6)' })
    }
  },

  // Spårad, exit-säker fördröjd callback (för staplade signatur-partiklar).
  _fxDelay(t, fn) {
    const call = gsap.delayedCall(t, () => {
      if (this._alive) fn()
    })
    ;(this._fxCalls ||= []).push(call)
    return call
  },

  // ---- Per-element-reaktioner (varje upptäckt får sin egen föreställning) --

  // Väljer en signatur-show för kända element; annars den generiska pysningen.
  _reactShow(ctx, resId, color) {
    if (this._signatureReact(ctx, resId, color)) return
    const fx = ctx.fxLayer
    burst(fx, CX, BREW_Y, { count: 16, power: 1.1 })
    puff(fx, CX, BREW_Y, { count: 10, color })
    floatText(fx, CX, BREW_Y - 20, ELEMENTS[resId].emoji, { fontSize: 80, rise: 140 })
  },

  // Signatur-effekter för utvalda element. Returnerar true om ett spelades.
  _signatureReact(ctx, resId, color) {
    const fx = ctx.fxLayer
    switch (resId) {
      case 'anga':
      case 'moln': {
        // Ånga/moln bolmar UPPÅT i tre staplade vita puffar.
        for (let i = 0; i < 3; i++) {
          this._fxDelay(0.12 * i, () => {
            puff(fx, CX + (i - 1) * 30, BREW_Y - 8, { count: 6, color: 0xeef4f8 })
            floatText(fx, CX + (i - 1) * 26, BREW_Y - 10, ELEMENTS[resId].emoji, { fontSize: 52, rise: 180, duration: 1.1 })
          })
        }
        ctx.services.audio.tone({ freq: 520, slideTo: 900, dur: 0.5, type: 'sine', vol: 0.35 })
        return true
      }
      case 'lava': {
        // Lava bubblar trögt och glöder i varma toner.
        burst(fx, CX, BREW_Y, { count: 14, colors: [0xf5731e, 0xff6b6b, 0xffd35c], power: 0.85 })
        for (let i = 0; i < 4; i++) {
          this._fxDelay(0.14 * i, () => floatText(fx, CX + (Math.random() * 90 - 45), BREW_Y, '🫧', { fontSize: 26 + Math.random() * 18, rise: 60, duration: 0.7 }))
        }
        floatText(fx, CX, BREW_Y - 20, '🌋', { fontSize: 80, rise: 130 })
        ctx.services.audio.tone({ freq: 160, slideTo: 90, dur: 0.6, type: 'sawtooth', vol: 0.3 })
        return true
      }
      case 'is':
      case 'sno': {
        // Is/snö fryser kittelns kant med en kristall-ring.
        this._frostRim(ctx, resId === 'sno' ? 0xffffff : 0xbdeefa)
        sparkle(fx, CX, BREW_Y, { count: 12 })
        floatText(fx, CX, BREW_Y - 20, ELEMENTS[resId].emoji, { fontSize: 80, rise: 120 })
        ctx.services.audio.tone({ freq: 1400, slideTo: 1900, dur: 0.35, type: 'triangle', vol: 0.3 })
        return true
      }
      case 'regnbage': {
        // Regnbågen spänner en färgbåge över kitteln.
        this._rainbowArc(ctx)
        floatText(fx, CX, BREW_Y - 20, '🌈', { fontSize: 80, rise: 120 })
        sparkle(fx, CX, BREW_Y, { count: 10 })
        return true
      }
      default:
        return false
    }
  },

  // Frost-ring runt kittelkanten (blinkar in/ut). Ritad med mitten BAKAD i
  // geometrin (position 0,0) — se PIXI-gotcha. Exit-säker via {}-proxy.
  _frostRim(ctx, tint) {
    const g = new Graphics()
    g.eventMode = 'none'
    g.ellipse(CX, CY - 70, 150, 40).stroke({ width: 10, color: tint, alpha: 0.95 })
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2
      const px = CX + Math.cos(ang) * 150
      const py = CY - 70 + Math.sin(ang) * 38
      if (g.star) g.star(px, py, 6, 9, 4).fill({ color: tint, alpha: 0.95 })
      else g.circle(px, py, 6).fill({ color: tint, alpha: 0.95 })
    }
    ctx.fxLayer.addChild(g)
    const st = { a: 0 }
    const tw = gsap.to(st, {
      a: 1,
      duration: 0.25,
      yoyo: true,
      repeat: 1,
      repeatDelay: 0.7,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (g.destroyed) {
          tw.kill()
          return
        }
        g.alpha = st.a
      },
      onComplete: () => {
        if (!g.destroyed) g.destroy()
      },
    })
  },

  // Regnbågsbåge över kitteln (blinkar in/ut). Mitten bakad i geometrin. Exit-säker.
  _rainbowArc(ctx) {
    const g = new Graphics()
    g.eventMode = 'none'
    const bands = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
    bands.forEach((col, i) => {
      g.arc(CX, CY - 40, 118 + i * 13, Math.PI * 1.06, Math.PI * 1.94).stroke({ width: 11, color: col, alpha: 0.92 })
    })
    ctx.fxLayer.addChild(g)
    const st = { a: 0 }
    const tw = gsap.to(st, {
      a: 1,
      duration: 0.35,
      yoyo: true,
      repeat: 1,
      repeatDelay: 0.9,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (g.destroyed) {
          tw.kill()
          return
        }
        g.alpha = st.a
      },
      onComplete: () => {
        if (!g.destroyed) g.destroy()
      },
    })
  },

  // ---- Ticker: bubbel-emitter + idle/ledtråd ------------------------------

  _update(ctx, tk) {
    if (!this._alive) return
    const dt = tk.deltaMS / 16.67

    // Bubbel-emitter (exit-säker, ticker-driven — ALDRIG gsap på bubblorna).
    this._bubT += tk.deltaMS
    if (this._bubT > 380 && this._bubbles.length < 8 && this._bubbleLayer && !this._bubbleLayer.destroyed) {
      this._bubT = 0
      const g = new Graphics().circle(0, 0, 4 + Math.random() * 6).fill({ color: this._brewColor, alpha: 0.6 })
      g.position.set((Math.random() * 2 - 1) * 90, -70)
      g.eventMode = 'none'
      this._bubbleLayer.addChild(g)
      this._bubbles.push({ g, vy: -(0.4 + Math.random() * 0.5), life: 900 })
    }
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      if (b.g.destroyed) {
        this._bubbles.splice(i, 1)
        continue
      }
      b.g.y += b.vy * dt
      b.life -= tk.deltaMS
      b.g.alpha = Math.max(0, b.life / 900) * 0.6
      if (b.life <= 0 || b.g.y < -150) {
        b.g.destroy()
        this._bubbles.splice(i, 1)
      }
    }

    // Idle → eskalerande ledtrådar (no-fail).
    if (!this._resolving && !this._completed) {
      this._idle += tk.deltaMS
      if (this._idle > HINT_MS) {
        this._idle = 0
        this._hint(ctx)
      }
    }
  },
}
