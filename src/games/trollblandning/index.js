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
import { makeKaraktar } from '../../lib/karaktarer.js'
import { COLORS, FONT, PRAISE, tint } from '../../lib/theme.js'
import { emitter } from '../../lib/partiklar.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// --- Geometri (designkoordinater 1280×720) ---
const CX = 560 // kittelns mitt-x
const CY = 400 // kittelns mitt-y
const BREW_Y = CY - 70 // brygd-ytans y (330) — används för fxLayer-partiklar
const SHELF_Y = 648 // dropparnas vilo-y på hyllan
const SHELF_X0 = 150
const SHELF_X1 = 850
const HINT_MS = 6000 // ms utan handling → eskalerande ledtråd

// Bubblorna ritas i en LJUSARE ton än brygden. Samma färg som vätskan gav bubblor
// som bara syntes i konturen mot den mörka kitteln — en bubbla ska läsa som luft i
// vätskan, alltså ljusare än det den stiger genom.
const bubbelFarg = (brygd) => tint(brygd, 0.62)
const BUBBEL_FALLBACK = bubbelFarg(0x2a2342)

// P0 ASSETS: varje element RITAS som ett eget föremål med egen silhuett.
// Låg tidigare som en emoji inuti en färgad cirkel på hyllan — precis det
// regeln förbjuder. Allt centreras i (0,0) och håller sig inom ~±28 px.
function drawElement(id) {
  const g = new Graphics()
  const E = {
    eld: () => {
      g.moveTo(0, 26).quadraticCurveTo(-22, 8, -12, -8).quadraticCurveTo(-8, -2, -4, -6)
      g.quadraticCurveTo(-6, -20, 4, -28).quadraticCurveTo(2, -12, 12, -6)
      g.quadraticCurveTo(18, -12, 17, -18).quadraticCurveTo(26, -2, 0, 26).closePath()
      g.fill(0xff8a3d)
      g.moveTo(0, 22).quadraticCurveTo(-11, 6, -3, -4).quadraticCurveTo(2, -12, 6, -2)
      g.quadraticCurveTo(13, 6, 0, 22).closePath().fill(0xffd35c)
    },
    vatten: () => {
      g.moveTo(0, -26).quadraticCurveTo(20, -2, 20, 8).arc(0, 8, 20, 0, Math.PI).quadraticCurveTo(-20, -2, 0, -26)
      g.fill(0x4aa3df).stroke({ width: 3, color: 0x2f7fb8 })
      g.ellipse(-7, 6, 5, 8).fill({ color: 0xffffff, alpha: 0.5 })
    },
    jord: () => {
      g.ellipse(0, 18, 24, 10).fill(0x8a5a3b)
      g.roundRect(-3, -8, 6, 26, 3).fill(0x5bbf6a)
      g.ellipse(-13, -6, 12, 8).fill(0x6fd07a).stroke({ width: 2.5, color: 0x3f8a44 })
      g.ellipse(13, -12, 12, 8).fill(0x6fd07a).stroke({ width: 2.5, color: 0x3f8a44 })
    },
    luft: () => {
      for (const [y, w] of [[-10, 22], [2, 26], [14, 18]]) {
        g.moveTo(-w, y).lineTo(w - 8, y)
        g.arc(w - 8, y + 6, 6, -Math.PI / 2, Math.PI / 2)
        g.stroke({ width: 5, color: 0x57c8c3, cap: 'round' })
      }
    },
    is: () => {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI
        g.moveTo(-Math.cos(a) * 24, -Math.sin(a) * 24).lineTo(Math.cos(a) * 24, Math.sin(a) * 24)
        g.stroke({ width: 6, color: 0xbdeefa, cap: 'round' })
      }
      g.circle(0, 0, 6).fill(0xeafaff)
    },
    anga: () => {
      for (const [x, y, r] of [[-10, 6, 11], [4, 0, 13], [14, 8, 9]]) g.circle(x, y, r).fill({ color: 0xd8e6ee, alpha: 0.92 })
      g.moveTo(-14, -12).quadraticCurveTo(-4, -20, -10, -26).stroke({ width: 4, color: 0xd8e6ee, alpha: 0.8 })
      g.moveTo(6, -14).quadraticCurveTo(16, -22, 10, -28).stroke({ width: 4, color: 0xd8e6ee, alpha: 0.8 })
    },
    lera: () => {
      g.ellipse(0, 10, 26, 16).fill(0x8a5a3b).stroke({ width: 3, color: 0x6f4a2e })
      g.ellipse(-8, 2, 9, 6).fill({ color: 0xa9714a, alpha: 0.8 })
      g.circle(10, -8, 6).fill(0x8a5a3b)
      g.circle(-4, -14, 4).fill(0x8a5a3b)
    },
    lava: () => {
      g.moveTo(-26, 20).lineTo(-10, -14).lineTo(10, -14).lineTo(26, 20).closePath()
      g.fill(0x6f4a2e).stroke({ width: 3, color: 0x4a2f1c })
      g.moveTo(-10, -14).lineTo(-4, -2).lineTo(2, -12).lineTo(10, -14).lineTo(7, 8).lineTo(-7, 8).closePath()
      g.fill(0xf5731e)
      g.circle(-6, -22, 5).fill({ color: 0xff9d3d, alpha: 0.85 })
      g.circle(6, -27, 4).fill({ color: 0xffd35c, alpha: 0.85 })
    },
    sno: () => {
      g.circle(0, 12, 15).fill(0xffffff).stroke({ width: 3, color: 0xc9d8e0 })
      g.circle(0, -10, 11).fill(0xffffff).stroke({ width: 3, color: 0xc9d8e0 })
      g.circle(-4, -12, 2.5).fill(0x2b2b2b)
      g.circle(4, -12, 2.5).fill(0x2b2b2b)
      g.moveTo(0, -7).lineTo(7, -5).lineTo(0, -3).closePath().fill(0xff9d3d)
      g.circle(0, 6, 2.5).fill(0x2b2b2b)
    },
    moln: () => {
      g.circle(-13, 4, 12).fill(0xe8eef2)
      g.circle(2, -6, 16).fill(0xe8eef2)
      g.circle(16, 4, 12).fill(0xe8eef2)
      g.roundRect(-24, 2, 48, 14, 7).fill(0xe8eef2)
    },
    sol: () => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        g.moveTo(Math.cos(a) * 17, Math.sin(a) * 17).lineTo(Math.cos(a) * 27, Math.sin(a) * 27)
        g.stroke({ width: 5, color: 0xffd35c, cap: 'round' })
      }
      g.circle(0, 0, 16).fill(0xffd35c).stroke({ width: 3, color: 0xe0a94f })
    },
    regn: () => {
      g.circle(-11, -8, 11).fill(0x9fb8c9)
      g.circle(2, -15, 14).fill(0x9fb8c9)
      g.circle(14, -8, 10).fill(0x9fb8c9)
      g.roundRect(-21, -10, 42, 12, 6).fill(0x9fb8c9)
      for (const dx of [-12, 0, 12]) g.moveTo(dx, 6).lineTo(dx - 4, 22).stroke({ width: 4, color: 0x6fa8d6, cap: 'round' })
    },
    sten: () => {
      g.moveTo(-24, 14).lineTo(-16, -10).lineTo(2, -18).lineTo(20, -6).lineTo(22, 14).closePath()
      g.fill(0x9b9088).stroke({ width: 3, color: 0x74695f })
      g.moveTo(-10, 12).lineTo(-6, -6).lineTo(6, -12).stroke({ width: 2.5, color: 0x74695f, alpha: 0.6 })
    },
    kruka: () => {
      g.moveTo(-14, -18).quadraticCurveTo(-24, 0, -16, 18).lineTo(16, 18).quadraticCurveTo(24, 0, 14, -18).closePath()
      g.fill(0xc77c4a).stroke({ width: 3, color: 0x9a5c33 })
      g.roundRect(-17, -24, 34, 9, 4).fill(0xd9925e).stroke({ width: 3, color: 0x9a5c33 })
      g.moveTo(-10, -4).lineTo(10, -4).stroke({ width: 3, color: 0x9a5c33, alpha: 0.6 })
    },
    regnbage: () => {
      const cols = [0xff6b6b, 0xffb347, 0xffe08a, 0x7ed06a, 0x6ad0ff, 0xa78bfa]
      cols.forEach((c, i) => {
        g.arc(0, 16, 26 - i * 4, Math.PI, 0).stroke({ width: 4, color: c })
      })
    },
    enhorning: () => {
      g.ellipse(-2, 6, 20, 16).fill(0xfff0f7).stroke({ width: 3, color: 0xe4b8d4})
      g.circle(8, -12, 13).fill(0xfff0f7).stroke({ width: 3, color: 0xe4b8d4 })
      g.moveTo(4, -24).lineTo(11, -40).lineTo(16, -22).closePath().fill(0xffd35c)
      g.moveTo(-6, -20).quadraticCurveTo(-20, -12, -14, 2).stroke({ width: 6, color: 0xf7b9e4, cap: 'round' })
      g.circle(12, -14, 3).fill(0x2b2b2b)
    },
  }
  ;(E[id] || E.sten)()
  g.eventMode = 'none'
  return g
}

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
    this._bubblor = null // Emitter, byggs med kitteln
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

    // Bubblorna kommer ur en Emitter (lib/partiklar.js) i stället för en handrullad
    // loop i tickern. Den gamla allokerade en ny Graphics per bubbla och förstörde
    // den igen, och hade ett tak på ÅTTA med 380 ms mellan varje — kitteln puttrade
    // alltså glest och räknebart. Emittern håller en jämn takt ur en återanvänd pool
    // och gör noll allokeringar när flödet väl är igång.
    //
    // INTE additiv, och det är mätt snarare än tyckt: bryggfärgerna är med flit
    // mörka (0x2a2342 m.fl.), och additivt ljus kan bara ADDERA — en mörk källa
    // hade gjort bubblorna nära osynliga. Samma regel som fällde lågorna i
    // lagerelden, från andra hållet.
    this._bubblor = emitter(this._bubbleLayer, {
      x: 0,
      y: -70,
      bredd: 180,
      rate: 9,
      // Livet och farten är satta så att bubblan HINNER UPP till ytan och spricker
      // där — inte så att den fortsätter ut i natthimlen. Stigning = speed·life +
      // ½·|gravity|·life² ≈ 26 px, alltså inom kittelns mynning.
      life: 1.1,
      lifeVar: 0.3,
      size: 10,
      sizeVar: 0.5,
      sizeTo: 0.7,
      speed: 20,
      speedVar: 0.45,
      angle: -Math.PI / 2,
      spread: 0.45,
      gravity: -6, // stiger allt snabbare, som en bubbla i tjock vätska
      colors: [BUBBEL_FALLBACK],
      alpha: 0.7,
      fadeIn: 0.18,
    })
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
      // Behållare för det RITADE elementet (var en Text vars .text byttes).
      const emoji = new Container()
      emoji.eventMode = 'none'
      emoji.visible = false
      c.addChild(ring, fill, emoji)
      this._root.addChild(c)
      this._slots.push({ fill, emoji })
    }

    // 6) Trollkarl Bobo + egenritad spetshatt. makeMascot() ger BARA ett huvud —
    // han svävade tidigare som ett löst huvud i luften. Nu mantel, armar och en
    // stav han faktiskt håller i.
    const w = new Container()
    w.position.set(180, 210)
    w.eventMode = 'none'
    // Huvudet krymps till faceR 46 — med 80 täckte ansiktscirkeln (160 px bred)
    // hela kroppen, så mantel, armar och stav ritades men syntes aldrig.
    const robe = new Graphics()
    robe.moveTo(-52, 84).lineTo(-30, -2).lineTo(30, -2).lineTo(52, 84).closePath()
    robe.fill(COLORS.purple).stroke({ width: 5, color: 0x6b4fc4 })
    robe.moveTo(-52, 84).quadraticCurveTo(0, 98, 52, 84).stroke({ width: 5, color: 0x6b4fc4 })
    for (const sx of [-24, 0, 24]) robe.circle(sx, 46, 4.5).fill({ color: 0xffd35c, alpha: 0.85 })
    const armL = new Graphics()
    armL.roundRect(-8, -4, 16, 46, 8).fill(COLORS.purple).stroke({ width: 4, color: 0x6b4fc4 })
    armL.circle(0, 44, 9).fill(COLORS.cream)
    armL.position.set(-32, 8)
    armL.rotation = 0.4
    const armR = new Graphics()
    armR.roundRect(-8, -4, 16, 46, 8).fill(COLORS.purple).stroke({ width: 4, color: 0x6b4fc4 })
    armR.circle(0, 44, 9).fill(COLORS.cream)
    armR.position.set(32, 8)
    armR.rotation = -0.4
    // Staven i höger hand, med en liten ritad stjärna i toppen.
    const staff = new Graphics()
    staff.roundRect(-4, -84, 8, 148, 4).fill(0x8a5a3b).stroke({ width: 3, color: 0x6f4a2e })
    staff.position.set(66, 18)
    // Huvudet är en RIGG (lib/karaktarer.js), inte ett statiskt `makeMascot`. Manteln,
    // armarna och staven är trollkarlens egna och står kvar — `kropp: false` av samma
    // skäl som i `harma-melodin`: riggen ska ersätta det som fanns, inte smyga in en
    // andra kropp under manteln.
    this._wizKar = makeKaraktar({ r: 46, kropp: false })
    const head = this._wizKar.view
    head.position.set(0, -44)
    w.addChild(robe, armL, armR, staff, head)
    const hat = new Graphics()
    hat.poly([0, -164, -46, -76, 46, -76]).fill(COLORS.purple).stroke({ width: 5, color: 0x6b4fc4 })
    hat.ellipse(0, -72, 54, 13).fill(COLORS.purple).stroke({ width: 5, color: 0x6b4fc4 })
    w.addChild(hat)
    // RITAD stjärna (var ⭐) — sitter i hattens spets.
    const star = new Graphics()
    const sp = []
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2
      const r = k % 2 === 0 ? 20 : 8.5
      sp.push(Math.cos(a) * r, Math.sin(a) * r)
    }
    star.poly(sp).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
    star.position.set(0, -132)
    w.addChild(star)
    // En likadan liten stjärna i stavens topp.
    const staffStar = new Graphics()
    staffStar.poly(sp.map((v) => v * 0.6)).fill(COLORS.yellow).stroke({ width: 2.5, color: COLORS.orangeDark })
    staffStar.position.set(66, -70)
    w.addChild(staffStar)
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
    // Ritad virvel (var 🌀) — spiral som läser som "töm/rör om".
    const ic = new Graphics()
    let px = 0
    let py = 0
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 4
      const r = 3 + (i / 90) * 22
      const nx = Math.cos(a) * r
      const ny = Math.sin(a) * r
      if (i === 0) ic.moveTo(nx, ny)
      else ic.lineTo(nx, ny)
      px = nx
      py = ny
    }
    ic.stroke({ width: 6, color: COLORS.white, cap: 'round' })
    ic.circle(px, py, 5).fill(COLORS.white)
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
    this._bubblor?.destroy() // tar bort ticker-callbacken OCH river partikelfältet
    this._bubblor = null
    for (const rec of this._dropRecs || []) {
      if (rec?.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
    }
    this._wizKar?.destroy()
    this._wizKar = null
    if (this._wizard && !this._wizard.destroyed) {
      gsap.killTweensOf(this._wizard)
      gsap.killTweensOf(this._wizard.scale)
    }
    if (this._wizStar && !this._wizStar.destroyed) gsap.killTweensOf(this._wizStar.scale)
    for (const t of this._floatTweens || []) t.kill()
    this._floatTweens = null
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
    this._sattBubbelFarg()

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
      // Behållare för resultatet: ritat frågetecken tills receptet hittats, sedan
      // det ritade elementet (var ❓ resp. en emoji-sträng).
      const resT = new Container()
      resT.eventMode = 'none'
      const q = new Graphics()
      q.arc(0, -9, 9, Math.PI, Math.PI * 0.15).stroke({ width: 5, color: 0xe0397a, cap: 'round' })
      q.moveTo(3.5, -3).lineTo(0, 7).stroke({ width: 5, color: 0xe0397a, cap: 'round' })
      q.circle(0, 16, 3.5).fill(0xe0397a)
      resT.addChild(q)
      resT.position.set(1158, 0)
      row.addChild(resT)
      this._rowLayer.addChild(row)
      this._rows.push({ result: g, resultText: resT, done: false, wx: 1158, wy: rowY })
    })
    this._updateCounter()
  },

  // Låter ett RITAT element sväva upp (ersätter floatText med en emoji-sträng).
  // Lever i _root så det städas med spelet; tweenen spåras och dödas i destroy.
  _floatElem(elemId, x, y, opts = {}) {
    if (!this._alive || !this._root || this._root.destroyed) return
    const art = drawElement(elemId)
    art.position.set(x, y)
    art.scale.set(opts.scale ?? 1.2)
    this._root.addChild(art)
    const tw = gsap.to(art, {
      y: y - (opts.rise ?? 110),
      alpha: 0,
      duration: opts.duration ?? 0.9,
      ease: 'power1.out',
      onComplete: () => {
        if (!art.destroyed) art.destroy()
        this._floatTweens = (this._floatTweens || []).filter((t) => t !== tw)
      },
    })
    this._floatTweens = [...(this._floatTweens || []), tw]
  },

  _miniIcon(elemId, x) {
    const E = ELEMENTS[elemId]
    const c = new Container()
    c.position.set(x, 0)
    c.eventMode = 'none'
    // Mjuk färgglugg BAKOM det ritade elementet (inte en ruta det ligger i).
    c.addChild(new Graphics().circle(0, 0, 17).fill({ color: E.color, alpha: 0.22 }))
    const t = drawElement(elemId)
    t.scale.set(0.55)
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
    // P0 ASSETS: elementet är ett FRISTÅENDE ritat föremål. Den gamla lösningen
    // var en emoji inuti en fylld färgcirkel — en ikon i en bricka. Cirkeln är
    // nu bara ett mjukt sken bakom, inte en behållare.
    const body = new Graphics().circle(0, 0, 50).fill({ color: E.color, alpha: 0.2 })
    body.circle(0, 0, 50).stroke({ width: 4, color: E.color, alpha: 0.4 })
    body.eventMode = 'none'
    const emoji = drawElement(elemId)
    emoji.scale.set(1.5)
    c.addChild(shadow, body, emoji)
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
        s.fill.clear().circle(0, 0, 28).fill({ color: E.color, alpha: 0.25 })
        for (const ch of s.emoji.removeChildren()) ch.destroy({ children: true })
        const art = drawElement(elem)
        art.scale.set(0.92)
        s.emoji.addChild(art)
        s.emoji.visible = true
      } else {
        s.fill.clear()
        for (const ch of s.emoji.removeChildren()) ch.destroy({ children: true })
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
    this._floatElem(pair[0], CX - 30, BREW_Y, { scale: 0.95, rise: 90 })
    this._floatElem(pair[1], CX + 30, BREW_Y, { scale: 0.95, rise: 90 })
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
      for (const ch of row.resultText.removeChildren()) ch.destroy({ children: true })
      const art = drawElement(resId)
      art.scale.set(0.72)
      row.resultText.addChild(art)
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

  // Emittern läser `o.colors` vid varje ny bubbla, så det räcker att byta listan —
  // redan stigande bubblor behåller sin färg och flödet skiftar mjukt.
  _sattBubbelFarg(brygd = this._brewColor) {
    if (this._bubblor) this._bubblor.o.colors = [bubbelFarg(brygd)]
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
        // Bubblorna följer med i övergången — annars stiger förra brygdens färg
        // upp genom den nya vätskan under en halv sekund.
        this._sattBubbelFarg(lerpColor(from, to, st.t))
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
  // Posen är kroppens; MINEN är riggens. De två lagren säger olika saker: kroppen
  // visar vad trollkarlen GÖR, ansiktet vad han TYCKER om det. `shrug` får en
  // förvånad `hoppsan`, aldrig en sur min — P0 MOTGÅNG.
  _wizardGesture(kind) {
    const w = this._wizard
    if (!w || w.destroyed) return
    const bx = this._wizardBase.x
    const by = this._wizardBase.y
    gsap.killTweensOf(w)
    const k = this._wizKar
    if (kind === 'cheer') k?.react('jubel')
    else if (kind === 'lean') k?.setMood('hungrig')
    else if (kind === 'shrug') k?.react('hoppsan')
    else if (kind === 'point') k?.react('nyfiken')
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
    this._floatElem(resId, CX, BREW_Y - 20, { scale: 1.7, rise: 140 })
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
            this._floatElem(resId, CX + (i - 1) * 26, BREW_Y - 10, { scale: 1.1, rise: 180, duration: 1.1 })
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
        this._floatElem(resId, CX, BREW_Y - 20, { scale: 1.7, rise: 120 })
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

  // ---- Ticker: blick + idle/ledtråd ---------------------------------------
  // (Bubblorna drivs av Emittern, inte härifrån.)

  _update(ctx, tk) {
    if (!this._alive) return

    // Trollkarlen tittar på det barnet drar. `look()` räknar i FÖRÄLDERNS rymd
    // (riggen sitter i `_wizard`), medan draget lever i `_root` — därför via global.
    const dragv = this._drag?.active?.view
    if (this._wizKar && this._wizard && !this._wizard.destroyed) {
      if (dragv && !dragv.destroyed) {
        const p = this._wizard.toLocal(dragv.getGlobalPosition())
        this._wizKar.look(p.x, p.y)
      } else if (this._cauldron && !this._cauldron.destroyed) {
        const p = this._wizard.toLocal(this._cauldron.getGlobalPosition())
        this._wizKar.look(p.x, p.y) // annars vilar blicken på kitteln
      }
    }

    // (Bubblorna sköts av en Emitter ur lib/partiklar.js — se _bubbleLayer i init.)

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
