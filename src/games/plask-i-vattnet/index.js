// Plask i Vattnet — lugn utforskande FYSIKlek (3–5 år). Barnet drar (eller tap-tap:ar)
// föremål från hyllan upptill ner i en stor glasvattentank: PLASK! Nu är vattnet en
// RIKTIG matter.js-värld med FLYTKRAFT: lätta saker (and, båt, löv, badring, äpple…)
// gungar mjukt upp och GUPPAR vid ytan, tunga saker (sten, nyckel, mynt, ankare…)
// sjunker lugnt till botten. Inget är fel — tanken tar emot ALLT, släpp utanför snäpper
// mjukt hem, varje plask ger ljud + ring + glad röst som NAMNGER vad som flyter/sjunker
// ("Anden flyter!", "Stenen sjunker!"). När alla föremål i rundan provats firar vi
// (delat firande + stjärna + klistermärke) och en ny, varierad uppsättning dyker upp —
// oändlig lek, ingen timer, ingen poäng. Att trycka på vattnet ger ett litet glatt plask
// som får flytarna att guppa till. Allt ritas programmatiskt (Pixi Graphics + emoji).
//
// FLYTKRAFT-recept (se ctx.services / lib/physics.js):
//   varje föremål blir en dynamisk cirkelkropp; varje bildruta beräknar vi hur djupt den
//   är nedsänkt och lägger på en UPPÅT-kraft ∝ nedsänkningsdjup × floatFactor. Eftersom
//   både gravitation och flytkraft skalar med massan blir beteendet massoberoende:
//   floatFactor > 1 ⇒ netto uppåt (gungar vid ytan), < 1 ⇒ netto nedåt (sjunker sakta).
//   Vattenmotstånd (hastighetsdämpning) + hastighetstak håller rörelsen LUGN och gör att
//   inget kan studsa eller skjuta ur tanken; en svag bana-fjäder + vaggning ger liv.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { puff, ripple, wiggle, pop, bounceIn, sparkle } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT } from '../../lib/theme.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ---- Tank/vatten i designkoordinater -------------------------------------
const TANK = { x: 390, y: 250, w: 500, h: 440, r: 28 } // glasbehållare (390..890, 250..690)
const WATER = { x: 398, y: 330, w: 484, h: 352, r: 18 } // vattenkropp (398..882, 330..682)
const SURFACE_Y = 330 // vattenytan (flytkraftens nollinje)
const TANK_CX = 640 // tankens mitt = drag-mål + nedslagspunkt
const TANK_CY = 470
const SHELF_Y = 150 // hyllraden upptill
const SHELF_X = [190, 326, 462, 818, 954, 1090] // 6 platser (mitten fri för tank/header)

// ---- Fysik-väggar (tankens insida) ---------------------------------------
const WALL_L = 414 // vänster innervägg
const WALL_R = 866 // höger innervägg
const FLOOR_TOP = 672 // golvets ovansida (föremål vilar med center ~ FLOOR_TOP - r)

// ---- Föremål --------------------------------------------------------------
const BODY_R = 38 // fysikradie
const HIT_R = 56 // osynlig cirkel-träffyta, radie 56 -> Ø112px ≥ 96px (24px lucka kvar till grannen)

// ---- Flytkraftskonstanter (lugnt inställda) -------------------------------
const GRAV_Y = 0.9 // tankens gravitation (matter: kraft = massa·GRAV_Y·0.001 per steg)
const BUOY_BASE = GRAV_Y * 0.001 // flytkraftens bas = exakt neutral vid frac·floatFactor = 1
const FLOAT_FACTOR = 1.6 // flytare: netto uppåt -> gungar med ~62% nedsänkt vid ytan
const SINK_FACTOR = 0.4 // sjunkare: netto nedåt -> glider sakta till botten
const DRAG = 0.93 // vattenmotstånd per bildruta -> lugnt, aldrig studsigt/skakigt
const BOB_AMP = 0.0007 // litet guppande lyft vid ytan (bara flytare)
const BOB_W = 1.8 // långsammare gupp -> lugnare, mjukare vattenkänsla
const SWAY_AMP = 0.00025 // mjuk sidledsvaggning (liv)
const SWAY_W = 1.4
const SPRING_K = 0.00003 // svag "hitta din plats"-fjäder mot tilldelad bana
const MAXF_A = 0.0008 // tak på sidledsacceleration (håller fjädern snäll)
const MAX_V = 10 // hastighetstak -> kan ALDRIG skjuta ur tanken
const ANG_DAMP = 0.9 // rotationsdämpning -> föremål håller sig ~upprätta

const ROUND_SIZE = 6 // antal föremål per runda (fyller hyllans 6 platser)

// ---- Upptäckts-logg (två sidohyllor "Flyter"/"Sjunker") -------------------
// Varje testat föremål lägger EN miniatyr i rätt hylla och STANNAR där över
// rundor (och sessioner, via progress.custom) -> ett växande, ordlöst mönster.
const LOG_FLOAT_X = 82 // vänster sidohylla (utanför tanken)
const LOG_SINK_X = 1198 // höger sidohylla
const LOG_HEAD_Y = 214 // rubrik-y
const LOG_FIRST_Y = 300 // första miniatyrens y
const LOG_STEP = 46 // radavstånd mellan miniatyrer
const LOG_MAX = 8 // en hylla svämmar aldrig över (poolen har 8 av varje)

// ---- Gissa först (valfritt, no-fail) -------------------------------------
// När ett föremål TAP-markeras dyker en liten tankebubbla + två stora ikon-
// knappar upp: 🔼 flyter / 🔽 sjunker. Rätt gissning -> extra gnistor + jubel;
// fel -> mjukt "Vi ser efter!" och plasket avslöjar svaret. Aldrig straff; den
// som bara drar-och-släpper ser aldrig knapparna (ren plask-lek för de yngsta).
const FISH_S = 0.82 // fiskens skala (delad av rita/simma/hoppa)
const GUESS_Y = 196 // knapparnas y (fri mitt-topp ovanför tanken)

// Föremålspooler med svenska NAMN (bestämd form -> "Anden flyter!", "Stenen sjunker!").
// `kind` är ASCII-id:t som RITAS av makeThing() — inga emoji-rekvisita (P0 ASSETS).
const POOL_FLOAT = [
  { kind: 'and', name: 'Anden' },
  { kind: 'lov', name: 'Lövet' },
  { kind: 'trastock', name: 'Trästocken' },
  { kind: 'badring', name: 'Badringen' },
  { kind: 'bat', name: 'Båten' },
  { kind: 'apple', name: 'Äpplet' },
  { kind: 'kork', name: 'Korken' },
  { kind: 'boll', name: 'Bollen' },
]
const POOL_SINK = [
  { kind: 'sten', name: 'Stenen' },
  { kind: 'nyckel', name: 'Nyckeln' },
  { kind: 'sked', name: 'Skeden' },
  { kind: 'mynt', name: 'Myntet' },
  { kind: 'ankare', name: 'Ankaret' },
  { kind: 'skruv', name: 'Skruven' },
  { kind: 'hammare', name: 'Hammaren' },
  { kind: 'kugghjul', name: 'Kugghjulet' },
]
const ALL_KINDS = new Set([...POOL_FLOAT, ...POOL_SINK].map((d) => d.kind))

const IDLE_LINES = ['Plaska lite till!', 'Släpp en sak till i vattnet!', 'Vad flyter och vad sjunker?']

// ---- Ritade föremål (P0 ASSETS) ------------------------------------------
// Varje sak har egen silhuett, egen volym och sina egna detaljer — aldrig en emoji
// som hela föremålet. Origo = mitten, ungefär ±40 px, så BODY_R=38 passar.
function makeThing(kind) {
  const c = new Container()
  const g = new Graphics()
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false

  switch (kind) {
    case 'and': // gummianka med ögon och näbb
      g.ellipse(2, 14, 34, 22).fill(0xffd35c)
      g.ellipse(-24, 10, 14, 11).fill(0xf5bd3c) // stjärt
      g.circle(16, -10, 20).fill(0xffd35c)
      g.ellipse(36, -6, 13, 8).fill(0xff8a3d) // näbb
      g.ellipse(2, 18, 22, 11).fill({ color: 0xfff0b8, alpha: 0.7 })
      g.circle(21, -15, 4.5).fill(0x33291f)
      g.circle(22.4, -16.4, 1.6).fill(0xffffff)
      break
    case 'lov': // löv med mittnerv och sidonerver
      g.moveTo(-34, 12).quadraticCurveTo(-6, -34, 34, -12).quadraticCurveTo(4, 30, -34, 12).fill(0x5bbf6a)
      g.moveTo(-34, 12).quadraticCurveTo(0, -4, 34, -12).stroke({ width: 3, color: 0x3f8f43 })
      for (let i = 1; i <= 3; i++) {
        const t = i / 4
        const x = -34 + 68 * t
        const y = 12 - 24 * t
        g.moveTo(x, y).lineTo(x + 4, y - 12).stroke({ width: 2, color: 0x3f8f43, alpha: 0.7 })
      }
      break
    case 'trastock': // trästock med årsringar
      g.roundRect(-38, -18, 76, 36, 14).fill(0x8a5a3b)
      g.roundRect(-38, -18, 76, 12, 10).fill({ color: 0xa5714c, alpha: 0.8 })
      g.ellipse(34, 0, 9, 18).fill(0xc99a6c)
      g.ellipse(34, 0, 5.5, 11).fill({ color: 0xb0805a, alpha: 0.8 })
      g.ellipse(34, 0, 2.4, 5).fill(0x8a5a3b)
      g.moveTo(-20, -10).lineTo(6, -8).moveTo(-14, 8).lineTo(12, 10).stroke({ width: 2, color: 0x6f452c, alpha: 0.6 })
      break
    case 'badring': // livboj med röda fält
      g.circle(0, 0, 36).fill(0xffffff)
      for (let i = 0; i < 4; i++) {
        const a0 = i * (Math.PI / 2) + 0.18
        g.moveTo(0, 0).arc(0, 0, 36, a0, a0 + 1.0).closePath().fill(0xff6b6b)
      }
      g.circle(0, 0, 17).fill({ color: 0x4aa3df, alpha: 0.35 })
      g.circle(0, 0, 36).stroke({ width: 3, color: 0xe4e0d8 })
      g.circle(0, 0, 17).stroke({ width: 3, color: 0xe4e0d8 })
      break
    case 'bat': // segelbåt med skrov, mast och två segel
      g.moveTo(0, -40).lineTo(0, 12).stroke({ width: 4, color: 0x8a5a3b })
      g.moveTo(2, -38).lineTo(30, 6).lineTo(2, 6).closePath().fill(0xfffdf7)
      g.moveTo(-2, -30).lineTo(-24, 6).lineTo(-2, 6).closePath().fill(0xffd35c)
      g.moveTo(-36, 8).lineTo(36, 8).lineTo(24, 28).lineTo(-24, 28).closePath().fill(0xff6b6b)
      g.moveTo(-36, 8).lineTo(36, 8).lineTo(34, 14).lineTo(-34, 14).closePath().fill(0xfffdf7)
      break
    case 'apple': // äpple med skaft, blad och glans
      g.circle(-9, 4, 25).fill(0xff6b6b)
      g.circle(9, 4, 25).fill(0xff6b6b)
      g.ellipse(0, 8, 30, 26).fill(0xff6b6b)
      g.moveTo(0, -18).quadraticCurveTo(4, -32, 12, -36).stroke({ width: 5, color: 0x6f452c, cap: 'round' })
      g.ellipse(-13, -28, 15, 8).fill(0x5bbf6a)
      g.ellipse(-11, -6, 8, 12).fill({ color: 0xffffff, alpha: 0.35 })
      break
    case 'kork': // flaskkork av trä/kork
      g.roundRect(-19, -26, 38, 52, 8).fill(0xdcb388)
      g.roundRect(-19, -26, 38, 12, 8).fill(0xe8c9a4)
      g.ellipse(0, -24, 19, 7).fill(0xefd6b6)
      for (let i = 0; i < 14; i++) {
        g.circle(-14 + Math.random() * 28, -18 + Math.random() * 40, 1.6).fill({ color: 0xb2895f, alpha: 0.6 })
      }
      break
    case 'boll': // fotboll med mörka fält
      g.circle(0, 0, 34).fill(0xfffdf7).stroke({ width: 3, color: 0xd8d2c6 })
      g.poly([0, -20, 17, -8, 11, 12, -11, 12, -17, -8]).fill(0x4a3526)
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2
        g.circle(Math.cos(a) * 30, Math.sin(a) * 30, 7).fill(0x4a3526)
      }
      g.ellipse(-12, -14, 9, 6).fill({ color: 0xffffff, alpha: 0.5 })
      break
    case 'sten': // ojämn sten med sprickor
      g.poly([-34, 6, -24, -20, -2, -28, 22, -18, 34, 4, 22, 24, -14, 26]).fill(0x9aa6b0)
      g.poly([-24, -20, -2, -28, 6, -12, -14, -6]).fill({ color: 0xb8c2ca, alpha: 0.7 })
      g.moveTo(-8, 24).lineTo(2, 4).lineTo(18, -4).stroke({ width: 2.5, color: 0x77828b, alpha: 0.8 })
      break
    case 'nyckel': // nyckel med ring, skaft och tänder
      g.circle(-22, 0, 16).fill(0xffd24a).stroke({ width: 4, color: 0xd9a021 })
      g.circle(-22, 0, 7).fill(0xfffdf7)
      g.roundRect(-8, -5, 44, 10, 4).fill(0xffd24a)
      g.rect(18, 5, 7, 13).fill(0xffd24a)
      g.rect(30, 5, 7, 11).fill(0xffd24a)
      break
    case 'sked': // sked med skål och skaft
      g.ellipse(-20, -6, 16, 21).fill(0xd7dde2)
      g.ellipse(-20, -6, 10, 14).fill({ color: 0xf2f5f7, alpha: 0.85 })
      g.moveTo(-8, 2).quadraticCurveTo(18, 12, 34, 24).stroke({ width: 9, color: 0xd7dde2, cap: 'round' })
      g.moveTo(-8, 0).quadraticCurveTo(16, 9, 32, 21).stroke({ width: 3, color: 0xf2f5f7, alpha: 0.8, cap: 'round' })
      break
    case 'mynt': // guldmynt med kant och präglad stjärna
      g.circle(0, 0, 33).fill(0xd9a021)
      g.circle(0, -2, 31).fill(0xffd24a)
      g.circle(0, -2, 24).stroke({ width: 3, color: 0xd9a021, alpha: 0.8 })
      if (g.star) g.star(0, -2, 5, 14, 6.5).fill(0xe8b53a)
      g.ellipse(-12, -16, 9, 5).fill({ color: 0xffffff, alpha: 0.45 })
      break
    case 'ankare': // ankare med ring, tvärslå och flyn
      g.circle(0, -30, 9).stroke({ width: 5, color: 0x7a8791 })
      g.moveTo(0, -21).lineTo(0, 26).stroke({ width: 7, color: 0x7a8791, cap: 'round' })
      g.moveTo(-20, -10).lineTo(20, -10).stroke({ width: 6, color: 0x7a8791, cap: 'round' })
      g.moveTo(-26, 8).quadraticCurveTo(-22, 30, 0, 30).quadraticCurveTo(22, 30, 26, 8)
        .stroke({ width: 7, color: 0x7a8791, cap: 'round' })
      g.moveTo(-26, 8).lineTo(-34, 0).lineTo(-20, -2).closePath().fill(0x7a8791)
      g.moveTo(26, 8).lineTo(34, 0).lineTo(20, -2).closePath().fill(0x7a8791)
      break
    case 'skruv': // skruv med huvud, kryss och gänga
      g.circle(0, -24, 15).fill(0xb8c2ca)
      g.moveTo(-9, -24).lineTo(9, -24).moveTo(0, -33).lineTo(0, -15).stroke({ width: 3.5, color: 0x77828b })
      g.moveTo(-8, -10).lineTo(8, -10).lineTo(3, 30).lineTo(-3, 30).closePath().fill(0xb8c2ca)
      for (let i = 0; i < 5; i++) {
        g.moveTo(-8 + i * 0.7, -6 + i * 7).lineTo(8 - i * 0.7, -2 + i * 7).stroke({ width: 2, color: 0x77828b, alpha: 0.8 })
      }
      break
    case 'hammare': // hammare med träskaft och stålhuvud
      g.roundRect(-5, -6, 10, 40, 5).fill(0x8a5a3b)
      g.roundRect(-5, 22, 10, 12, 5).fill(0x6f452c)
      g.roundRect(-26, -30, 44, 22, 6).fill(0x9aa6b0)
      g.roundRect(-26, -30, 44, 8, 5).fill({ color: 0xb8c2ca, alpha: 0.9 })
      g.moveTo(18, -30).quadraticCurveTo(34, -20, 24, -8).lineTo(18, -8).closePath().fill(0x8a939b)
      break
    default: // kugghjul
      g.circle(0, 0, 24).fill(0x8a939b)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const x = Math.cos(a) * 30
        const y = Math.sin(a) * 30
        const t = new Graphics().roundRect(-8, -9, 16, 18, 3).fill(0x8a939b)
        t.position.set(x, y)
        t.rotation = a
        c.addChildAt(t, 0)
      }
      g.circle(0, 0, 24).stroke({ width: 3, color: 0x6f7880 })
      g.circle(0, 0, 9).fill(0xdfe4e8)
      break
  }
  return c
}

// En liten fisk som BOR i tanken (ritad, ingen emoji). Simmar omkring, flyr undan
// vid plask och nosar nyfiket på det som sjunkit.
function makeFish(color = 0xff8a3d) {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(-26, 0).lineTo(-40, -13).lineTo(-40, 13).closePath().fill(color) // stjärt
  g.ellipse(0, 0, 28, 17).fill(color)
  g.ellipse(4, 4, 18, 9).fill({ color: 0xffffff, alpha: 0.3 })
  g.moveTo(-4, -14).lineTo(4, -26).lineTo(12, -12).closePath().fill(color) // ryggfena
  g.circle(16, -5, 5).fill(0xffffff)
  g.circle(17.5, -5, 2.6).fill(0x33291f)
  c.addChild(g)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

export default {
  id: 'plask-i-vattnet',
  titleSv: 'Plask i Vattnet',
  icon: '💧',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'plask-i-vattnet',
  voiceIntro: 'Släpp sakerna i vattnet och se vad som flyter och vad som sjunker!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._t = 0
    this._dropped = 0
    this._celebrating = false
    this._itemViews = [] // alla rundans föremåls-containrar (hylla + i vatten)
    this._objects = [] // i-vatten-objekt: { body, view, floats, floatFactor, r, homeX, phase }
    this._logIcons = [] // alla miniatyrer i upptäckts-hyllorna (för tween-städ)
    this._guessItem = null // vilket markerat föremål gissningen gäller
    this._guess = null // 'float' | 'sink' | null
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik utan standardväggar -> vi bygger tankens egna insidor (golv + sidor).
    this._phys = new PhysicsWorld({ gravityY: GRAV_Y, walls: [] })
    this._buildTankBodies()

    this._buildTank(ctx)
    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Fysikkroppar för tanken (statiska) ---------------------------------

  _buildTankBodies() {
    const T = 60 // väggtjocklek (rejäl -> inget kan tunnla igenom)
    const cx = (WALL_L + WALL_R) / 2
    // Golv.
    this._phys.rectangle(cx, FLOOR_TOP + T / 2, WALL_R - WALL_L + T * 2, T, {
      isStatic: true,
      restitution: 0.04,
      friction: 0.6,
      label: 'tankfloor',
    })
    // Sidoväggar (höga -> täcker även ovanför ytan, så inget kan glida ut i sidled).
    this._phys.rectangle(WALL_L - T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3, label: 'tankwall' })
    this._phys.rectangle(WALL_R + T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3, label: 'tankwall' })
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildTank(ctx) {
    // Riktig miljö i stället för en platt cremeplatta: ett soligt rum med fönstervy,
    // en trähylla där sakerna ligger och ett bord som tanken står på.
    const scene = createScene('sky', { width: ctx.width, height: ctx.height, ground: false })
    scene.alpha = 0.5
    this._root.addChild(scene)
    const room = new Graphics()
    room.rect(0, 0, ctx.width, ctx.height).fill({ color: 0xfdf6e3, alpha: 0.55 })
    // vägglist + golv ger rummet ett plan att stå i
    room.rect(0, 640, ctx.width, 80).fill(0xe6d3ae)
    room.rect(0, 636, ctx.width, 10).fill(0xcbb289)
    room.eventMode = 'none'
    this._root.addChild(room)

    // Trähylla under föremålen (de svävade tidigare fritt i luften).
    const shelf = new Graphics()
    shelf.roundRect(120, SHELF_Y + 52, 420, 18, 8).fill(0xc79a68)
    shelf.roundRect(120, SHELF_Y + 52, 420, 6, 6).fill(0xdcb388)
    shelf.roundRect(740, SHELF_Y + 52, 420, 18, 8).fill(0xc79a68)
    shelf.roundRect(740, SHELF_Y + 52, 420, 6, 6).fill(0xdcb388)
    for (const bx of [170, 480, 790, 1100]) shelf.rect(bx, SHELF_Y + 70, 14, 26).fill(0xa87f52)
    shelf.eventMode = 'none'
    this._root.addChild(shelf)

    // Bord som tanken vilar på.
    const table = new Graphics()
    table.roundRect(330, TANK.y + TANK.h - 6, 620, 22, 10).fill(0xc79a68)
    table.roundRect(330, TANK.y + TANK.h - 6, 620, 8, 8).fill(0xdcb388)
    table.rect(380, TANK.y + TANK.h + 16, 26, 34).fill(0xa87f52)
    table.rect(874, TANK.y + TANK.h + 16, 26, 34).fill(0xa87f52)
    table.eventMode = 'none'
    this._root.addChild(table)

    // Glas (transparent + vit rim).
    const glass = new Graphics()
      .roundRect(TANK.x, TANK.y, TANK.w, TANK.h, TANK.r)
      .fill({ color: 0x9fd8f0, alpha: 0.18 })
      .stroke({ width: 8, color: 0xffffff, alpha: 0.7 })
    glass.eventMode = 'none'
    this._root.addChild(glass)

    // Vattenkropp (halvtransparent, lite indrag innanför glaset).
    const water = new Graphics().roundRect(WATER.x, WATER.y, WATER.w, WATER.h, WATER.r).fill({ color: 0x4aa3df, alpha: 0.45 })
    water.eventMode = 'none'
    this._root.addChild(water)

    // Ambient: små bubblor som driver uppåt (ticker-driven, exit-säker).
    this._buildBubbles()
    // Tankens invånare — en liten fisk som lever sitt eget liv i vattnet.
    this._buildFish()

    // Ljus, lätt guppande ytlinje (dekorativ).
    const line = new Graphics().roundRect(WATER.x, -4, WATER.w, 8, 4).fill({ color: 0xffffff, alpha: 0.35 })
    line.position.set(0, SURFACE_Y)
    line.eventMode = 'none'
    this._root.addChild(line)
    this._surfaceTween = gsap.to(line, { y: SURFACE_Y + 4, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Osynligt drag-mål som täcker hela tanken (generös träffzon för tap-tap).
    const target = new Container()
    target.position.set(TANK_CX, TANK_CY)
    target.hitArea = new Circle(0, 0, 260)
    this._waterTapHandler = (e) => this._waterTap(ctx, e)
    target.on('pointertap', this._waterTapHandler) // registreras FÖRE drag-målets _tap
    this._tankView = target
    this._root.addChild(target)

    this._buildLogs(ctx) // två sidohyllor "Flyter"/"Sjunker" (upptäckts-logg)
    this._buildGuessUi(ctx) // gissa-först-knappar (dolda tills ett föremål markeras)
  },

  // ---- Upptäckts-logg (sidohyllor) ----------------------------------------

  _buildLogs(ctx) {
    this._logFloat = this._makeLogPanel(LOG_FLOAT_X, 'Flyter', 1, COLORS.green)
    this._logSink = this._makeLogPanel(LOG_SINK_X, 'Sjunker', -1, COLORS.blue)
    // Fyll från sparad logg -> upptäckter stannar mellan rundor OCH sessioner.
    // (Äldre sparfiler innehöll emoji-strängar; de filtreras bort tyst.)
    const cust = ctx.progress.get().custom || {}
    ;(cust.floatLog || []).filter((k) => ALL_KINDS.has(k)).forEach((k) => this._addLogIcon(this._logFloat, k, false))
    ;(cust.sinkLog || []).filter((k) => ALL_KINDS.has(k)).forEach((k) => this._addLogIcon(this._logSink, k, false))
  },

  // dir: +1 = pil uppåt (flyter), -1 = pil nedåt (sjunker). Pilen ritas, ingen emoji.
  _makeLogPanel(cx, label, dir, color) {
    const panel = new Container()
    panel.position.set(cx, 0)
    panel.eventMode = 'none'
    panel.interactiveChildren = false
    const bg = new Graphics()
      .roundRect(-56, 196, 112, 466, 22)
      .fill({ color, alpha: 0.14 })
      .stroke({ width: 3, color, alpha: 0.5 })
    const arrow = new Graphics()
    arrow.moveTo(-16, dir > 0 ? 10 : -10).lineTo(16, dir > 0 ? 10 : -10).lineTo(0, dir > 0 ? -12 : 12)
      .closePath().fill(color)
    arrow.position.set(0, LOG_HEAD_Y + 14)
    const head = new Text({
      text: label,
      style: { fontFamily: FONT.display, fontSize: 24, fontWeight: '700', fill: COLORS.inkSoft, align: 'center' },
    })
    head.anchor.set(0.5, 0)
    head.position.set(0, LOG_HEAD_Y + 32)
    panel.addChild(bg, arrow, head)
    panel._items = []
    this._root.addChild(panel)
    return panel
  },

  _addLogIcon(panel, kind, animate = true) {
    if (!panel || panel.destroyed || panel._items.length >= LOG_MAX) return
    const t = makeThing(kind)
    t.scale.set(0.44)
    t.position.set(0, LOG_FIRST_Y + panel._items.length * LOG_STEP)
    panel.addChild(t)
    panel._items.push(t)
    this._logIcons.push(t)
    if (animate) gsap.fromTo(t.scale, { x: 0.05, y: 0.05 }, { x: 0.44, y: 0.44, duration: 0.45, ease: 'back.out(2.2)' })
  },

  // Lägg (om ny) det testade föremålet i rätt hylla. Varje sak visas EN gång ->
  // mönstret "vad flyter / vad sjunker" byggs upp lugnt över rundor.
  _logItem(ctx, data) {
    const panel = data.floats ? this._logFloat : this._logSink
    const key = data.floats ? 'floatLog' : 'sinkLog'
    const list = ((ctx.progress.get().custom || {})[key] || []).filter((k) => ALL_KINDS.has(k))
    if (list.includes(data.kind)) return
    ctx.progress.setCustom(key, [...list, data.kind].slice(-LOG_MAX))
    this._addLogIcon(panel, data.kind, true)
  },

  // ---- Gissa först (valfri tankebubbla + två ikon-knappar) ----------------

  _buildGuessUi(ctx) {
    const ui = new Container()
    ui.visible = false // syns bara medan ett föremål är TAP-markerat
    ui.eventMode = 'passive'
    this._root.addChild(ui)
    this._guessUi = ui

    const bubble = new Graphics()
      .roundRect(494, 104, 292, 52, 26)
      .fill({ color: COLORS.white, alpha: 0.92 })
      .stroke({ width: 3, color: 0xbfeefa, alpha: 0.9 })
    bubble.eventMode = 'none'
    const q = new Text({
      text: 'Flyter eller sjunker?',
      style: { fontFamily: FONT.display, fontSize: 26, fontWeight: '700', fill: COLORS.inkSoft },
    })
    q.anchor.set(0.5)
    q.position.set(640, 130)
    q.eventMode = 'none'
    ui.addChild(bubble, q)

    this._guessBtnFloat = this._makeGuessBtn(ctx, 566, 1, COLORS.green, 'float')
    this._guessBtnSink = this._makeGuessBtn(ctx, 714, -1, COLORS.blue, 'sink')
    ui.addChild(this._guessBtnFloat, this._guessBtnSink)
  },

  // dir: +1 = pil uppåt ("flyter"), -1 = pil nedåt ("sjunker"). Ritad pil, ingen emoji.
  _makeGuessBtn(ctx, x, dir, color, kind) {
    const b = new Container()
    b.position.set(x, GUESS_Y)
    const disc = new Graphics().circle(0, 0, 52).fill({ color, alpha: 0.92 }).stroke({ width: 5, color: 0xffffff, alpha: 0.9 })
    disc.eventMode = 'none'
    const a = new Graphics()
    a.moveTo(-22, dir > 0 ? 12 : -12).lineTo(22, dir > 0 ? 12 : -12).lineTo(0, dir > 0 ? -18 : 18)
      .closePath().fill(0xffffff)
    a.rect(-9, dir > 0 ? 12 : -26, 18, 14).fill(0xffffff)
    a.eventMode = 'none'
    b.addChild(disc, a)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    b.hitArea = new Circle(0, 0, 60) // Ø120 ≥ 96px
    b._tap = () => this._onGuess(ctx, kind, b)
    b.on('pointertap', b._tap)
    return b
  },

  _showGuessUi(ctx, rec) {
    if (!this._alive || this._celebrating || !this._guessUi) return
    this._guessItem = rec
    this._guess = null
    for (const b of [this._guessBtnFloat, this._guessBtnSink]) {
      if (!b || b.destroyed) continue
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      b.scale.set(1)
      b.alpha = 1
    }
    this._guessUi.visible = true
    ctx.services.voice.say('Flyter eller sjunker?')
  },

  _hideGuessUi() {
    if (this._guessUi && !this._guessUi.destroyed) this._guessUi.visible = false
  },

  _onGuess(ctx, kind, btn) {
    if (!this._alive || !this._guessUi?.visible) return
    this._guess = kind
    this._idle = 0
    ctx.services.audio.sfx('tap')
    if (btn && !btn.destroyed) pop(btn)
    // Tona ut det andra valet så barnets gissning känns bekräftad.
    const other = kind === 'float' ? this._guessBtnSink : this._guessBtnFloat
    if (other && !other.destroyed) gsap.to(other, { alpha: 0.35, duration: 0.15 })
    // Knapparna stannar synliga tills släppet (då avslöjas svaret).
  },

  // En liten fisk BOR i tanken: den simmar omkring, flyr undan när något plaskar i,
  // och nosar nyfiket på det som sjunkit till botten. Scenen får ett eget liv i stället
  // för att bara vara en behållare man släpper saker i.
  _buildFish() {
    const fish = makeFish(randomFrom([0xff8a3d, 0xff6b6b, 0x57c8c3, 0xffd35c]))
    fish.scale.set(FISH_S)
    fish.position.set(TANK_CX, SURFACE_Y + 180)
    this._root.addChild(fish)
    this._pet = fish
    this._petState = { x: fish.x, y: fish.y, tx: fish.x, ty: fish.y, speed: 58, boost: 0, wait: 0 }
    this._petNewTarget()
  },

  // Nytt simmål: oftast en fri punkt, ibland "nosa på" ett föremål som sjunkit.
  _petNewTarget(awayFromX = null) {
    const s = this._petState
    if (!s) return
    const sunk = this._objects.filter((o) => !o.floats && o.body && o.body.position.y > SURFACE_Y + 150)
    if (!awayFromX && sunk.length && Math.random() < 0.45) {
      const t = randomFrom(sunk)
      s.tx = clamp(t.body.position.x + (Math.random() * 60 - 30), WALL_L + 40, WALL_R - 40)
      s.ty = clamp(t.body.position.y - 46, SURFACE_Y + 50, FLOOR_TOP - 34)
      s.wait = 0.9 + Math.random() * 0.8
      return
    }
    let tx = WALL_L + 46 + Math.random() * (WALL_R - WALL_L - 92)
    if (awayFromX != null) {
      // fly åt motsatt håll från plasket
      tx = awayFromX < TANK_CX ? WALL_R - 60 - Math.random() * 90 : WALL_L + 60 + Math.random() * 90
    }
    s.tx = tx
    s.ty = SURFACE_Y + 60 + Math.random() * (FLOOR_TOP - SURFACE_Y - 110)
    s.wait = 0.2 + Math.random() * 0.9
  },

  // Fisken skräms undan av ett plask (och kommer tillbaka nyfiket strax efter).
  _petStartle(x) {
    if (!this._petState) return
    this._petState.boost = 1.1
    this._petNewTarget(x)
  },

  _updateFish(dt) {
    const f = this._pet
    const s = this._petState
    if (!f || f.destroyed || !s) return
    if (s.jump) return // hopp-animationen styr positionen
    const dx = s.tx - s.x
    const dy = s.ty - s.y
    const d = Math.hypot(dx, dy)
    if (d < 12) {
      s.wait -= dt
      if (s.wait <= 0) this._petNewTarget()
    } else {
      const sp = s.speed * (1 + s.boost * 2.4)
      s.x += (dx / d) * sp * dt
      s.y += (dy / d) * sp * dt
    }
    if (s.boost > 0) s.boost = Math.max(0, s.boost - dt * 1.4)
    f.position.set(s.x, s.y + Math.sin(this._t * 3.4) * 2.5)
    // vänd åt simriktningen och luta lite i sväng
    const dir = dx >= 0 ? 1 : -1
    f.scale.x = FISH_S * dir
    f.rotation = clamp(dy / 260, -0.35, 0.35) * dir
  },

  _buildBubbles() {
    this._bubbleLayer = new Container()
    this._bubbleLayer.eventMode = 'none'
    this._bubbleLayer.interactiveChildren = false
    this._root.addChild(this._bubbleLayer)
    this._bubbles = []
    for (let i = 0; i < 7; i++) {
      const b = new Graphics()
        .circle(0, 0, 5 + Math.random() * 7)
        .fill({ color: 0xffffff, alpha: 0.35 })
        .stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
      b.eventMode = 'none'
      this._resetBubble(b, true)
      this._bubbleLayer.addChild(b)
      this._bubbles.push(b)
    }
  },

  _resetBubble(b, spread = false) {
    b._baseX = WATER.x + 24 + Math.random() * (WATER.w - 48)
    b._sway = 6 + Math.random() * 10
    b._phase = Math.random() * Math.PI * 2
    b._vy = 16 + Math.random() * 24
    b.x = b._baseX
    b.y = spread ? SURFACE_Y + 16 + Math.random() * (WATER.h - 36) : WATER.y + WATER.h - 12
  },

  // Ett hyllföremål: BARA figuren (emoji) — ingen bricka/bakgrund. En osynlig
  // cirkel-hitArea (≥96px) gör hela föremålet dragbart/tryckbart.
  // VIKTIGT: en tom Container UTAN hitArea är OKLICKBAR i Pixi v8 när alla barn har
  // eventMode 'none' (det var därför inget gick att flytta). hitArea löser detta.
  _makeItem(data) {
    const it = new Container()
    const fig = makeThing(data.kind)
    it.addChild(fig)
    it._fig = fig
    it.hitArea = new Circle(0, 0, HIT_R)
    return it
  },

  // ---- Runda --------------------------------------------------------------

  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()

    this._dropped = 0
    this._celebrating = false
    this._idle = 0

    // Spridda viloplatser (banor) så saker inte staplas exakt — fördelas vid släpp.
    this._floatLanes = shuffle([496, 588, 680, 772])
    this._sinkLanes = shuffle([496, 600, 704, 808])

    this._drag = new DragController({ space: this._root, services: ctx.services, skugga: true })
    this._drag.addTarget(this._tankView, () => true, { hitRadius: 280 }) // tar emot ALLT

    // Varierad uppsättning: 2–4 flytare + resten sjunkare (alltid minst 2 av varje
    // så barnet upptäcker mönstret), slumpade föremål -> ny känsla varje runda.
    const floatCount = randomFrom([2, 3, 3, 4])
    const sinkCount = ROUND_SIZE - floatCount
    const floaters = shuffle(POOL_FLOAT).slice(0, floatCount).map((d) => ({ ...d, floats: true, floatFactor: FLOAT_FACTOR }))
    const sinkers = shuffle(POOL_SINK).slice(0, sinkCount).map((d) => ({ ...d, floats: false, floatFactor: SINK_FACTOR }))
    const items = shuffle([...floaters, ...sinkers])

    items.forEach((data, i) => {
      const view = this._makeItem(data)
      view.position.set(SHELF_X[i], SHELF_Y)
      this._root.addChild(view)
      this._itemViews.push(view)
      this._drag.addItem(view, data, {
        onSelect: (rec) => {
          this._idle = 0
          this._showGuessUi(ctx, rec) // fires ENDAST vid tap-markering (inte vid drag)
        },
        onCorrect: (rec) => this._onDrop(ctx, rec),
        onWrong: (rec) => this._alive && wiggle(rec.view),
      })
      bounceIn(view, { delay: i * 0.05 })
    })
  },

  // Riv föregående runda: drag-controller, alla fysikkroppar och alla föremåls-vyer.
  _clearRound() {
    this._hideGuessUi() // rundans föremål försvinner -> ingen dinglande gissning
    this._guessItem = null
    this._guess = null
    this._drag?.destroy()
    this._drag = null
    for (const o of this._objects) {
      if (o.body) this._phys.removeBody(o.body)
    }
    this._objects = []
    this._itemViews.forEach((v) => {
      if (!v || v.destroyed) return
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      v.destroy({ children: true })
    })
    this._itemViews = []
  },

  // ---- Släpp -> bli en fysikkropp i vattnet -------------------------------

  _onDrop(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    const view = rec.view // har snäppt till tankens mitt (TANK_CX, TANK_CY)
    const data = rec.data

    // Gissningen (om någon) gällde just det här föremålet; hämta + nollställ + göm.
    const guessed = this._guessItem === rec ? this._guess : null
    this._guessItem = null
    this._guess = null
    this._hideGuessUi()

    // Ingen bricka längre — bara figuren plaskar i. En liten puls ger en mjuk
    // "plopp"-känsla när den lämnar handen och blir en fysikkropp (exit-säker via scale).
    if (!view.destroyed) pop(view, { scale: 1.12 })

    // Liten slumpoffset så två föremål aldrig föds exakt på varandra (= ingen jitter).
    const x = TANK_CX + (Math.random() - 0.5) * 44
    const y = TANK_CY + (Math.random() - 0.5) * 20
    gsap.killTweensOf(view) // stoppa drag-controllerns snäpp-tween (klar) före fysik-synk
    view.position.set(x, y)

    // Tilldela bana (lugn fördelning över ytan/botten).
    const lanes = data.floats ? this._floatLanes : this._sinkLanes
    const homeX = lanes.length ? lanes.shift() : clamp(480 + Math.random() * 340, WALL_L + BODY_R, WALL_R - BODY_R)

    // Dynamisk cirkelkropp; samma täthet för alla (flyt/sjunk styrs av floatFactor).
    const body = this._phys.circle(x, y, BODY_R, {
      restitution: 0.06,
      friction: 0.3,
      frictionAir: 0.012,
      density: 0.0012,
      label: data.floats ? 'floater' : 'sinker',
    })
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 1.2, y: 1.6 + Math.random() * 1.6 }) // mjuk "plopp ner"
    this._phys.link(body, view)

    this._objects.push({ body, view, floats: data.floats, floatFactor: data.floatFactor, r: BODY_R, homeX, phase: Math.random() * Math.PI * 2 })

    this._splash(ctx, x, data, guessed)
    this._petStartle(x) // fisken flyr undan plasket och kommer tillbaka nyfiket
    this._logItem(ctx, data) // lägg en miniatyr i rätt upptäckts-hylla (om ny)
    this._surfaceWave(x, body) // ytsvall: redan flytande saker guppar mjukt när något nytt plaskar i

    this._dropped++
    if (this._dropped >= ROUND_SIZE) this._finishRound(ctx)
  },

  // Ytsvall vid ett nytt plask: flytare i närheten får en mjuk uppåt-knuff och guppar
  // till, så vattnet känns sammanhängande. Kraften taklas av MAX_V -> alltid lugnt.
  _surfaceWave(x, exceptBody) {
    for (const o of this._objects) {
      if (!o.floats || !o.body || o.body === exceptBody) continue
      const b = o.body
      const d = Math.abs(b.position.x - x)
      if (d < 230 && b.position.y < SURFACE_Y + 130) {
        const k = 1 - d / 230
        Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 0.6 * k, y: b.velocity.y - 1.8 * k })
        if (o.view && !o.view.destroyed) pop(o.view, { scale: 1.06 })
      }
    }
  },

  // Plask vid ytan: ljud + ring + bubbelpuff + glad röst som namnger flyt/sjunk
  // (och en positiv reaktion på ev. gissning).
  _splash(ctx, x, data, guessed) {
    if (!this._alive) return
    const a = ctx.services.audio
    // Riktigt vatten via SFX-pipelinen: LÄTT plask (pop) för flytare, DJUP plopp
    // för sjunkare — faller mjukt till en ton om klippet inte hunnit avkodas.
    if (data.floats) {
      if (!a.sample('pop')) a.tone({ freq: 720, dur: 0.14, type: 'sine', vol: 0.22, slideTo: 1200 })
      a.tone({ freq: 1500, dur: 0.12, type: 'sine', vol: 0.1, delay: 0.05 }) // ljus stänk-topp
    } else {
      if (!a.sample('plopp')) a.tone({ freq: 300, dur: 0.24, type: 'sine', vol: 0.3, slideTo: 90 })
    }
    // Dubbel ytring -> tydligt "plask vid vattenytan".
    ripple(ctx.fxLayer, x, SURFACE_Y, { color: 0xbfeefa, maxR: 86, width: 7, alpha: 0.7 })
    ripple(ctx.fxLayer, x, SURFACE_Y, { color: 0xffffff, maxR: 52, width: 4, alpha: 0.5, duration: 0.42 })
    puff(ctx.fxLayer, x, SURFACE_Y, { count: 12, color: 0x9fd8f0 })
    // Namngivning (bestämd form) + positiv gissnings-reaktion. ALDRIG straff.
    const verb = data.floats ? 'flyter' : 'sjunker'
    if (guessed && (guessed === 'float') === data.floats) {
      sparkle(ctx.fxLayer, x, SURFACE_Y - 10, { count: 10 }) // rätt gissat -> extra gnistor
      a.sfx('correct')
      ctx.services.voice.say(`Ja! ${data.name} ${verb}!`)
    } else if (guessed) {
      a.sfx('soft') // fel gissat -> mjukt, avslöja svaret (aldrig buzzer)
      ctx.services.voice.say(`Vi ser efter! ${data.name} ${verb}!`)
    } else {
      ctx.services.voice.say(`${data.name} ${verb}!`)
    }
  },

  // Tryck direkt på vattnet (utan markerat föremål) = litet glatt plask + flytare
  // i närheten guppar till. Ren orsak-och-verkan; krockar inte med drag/tap-tap.
  _waterTap(ctx, e) {
    if (!this._alive || this._celebrating) return
    if (this._drag?.selected) return // ett tap-tap-släpp pågår -> plasket sköts av onDrop
    this._hideGuessUi() // inget markerat -> städa ev. dinglande gissningsbubbla
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, WATER.x + 30, WATER.x + WATER.w - 30)
    const y = clamp(p.y, SURFACE_Y, WATER.y + WATER.h - 20)
    this._idle = 0

    // Trycker man PÅ en flytande sak trycks den NER under ytan och studsar upp igen
    // med ett plask — leksam agens på det som redan flyter (i stället för bara ett
    // generiskt plask var man än trycker).
    const hit = this._floaterAt(p.x, p.y)
    if (hit) {
      Body.setVelocity(hit.body, { x: hit.body.velocity.x * 0.4, y: 7.5 })
      hit._dunked = true
      ctx.services.audio.tone({ freq: 420, dur: 0.16, type: 'sine', vol: 0.22, slideTo: 200 })
      if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
      ripple(ctx.fxLayer, hit.body.position.x, SURFACE_Y, { color: 0xbfeefa, maxR: 78, alpha: 0.7 })
      puff(ctx.fxLayer, hit.body.position.x, SURFACE_Y, { count: 10, color: 0x9fd8f0 })
      if (hit.view && !hit.view.destroyed) pop(hit.view, { scale: 1.1 })
      this._petStartle(hit.body.position.x)
      return
    }

    ctx.services.audio.sfx(Math.random() < 0.3 ? 'pling' : 'pop')
    ripple(ctx.fxLayer, x, y, { color: 0xbfeefa, maxR: 64, alpha: 0.6 })
    puff(ctx.fxLayer, x, y, { count: 7, color: 0x9fd8f0 })
    this._nudgeFloaters(x)
    this._petStartle(x)
  },

  // Hittar en flytande sak under pekpunkten (generös radie för små fingrar).
  _floaterAt(px, py) {
    let best = null
    let bestD = 74 * 74
    for (const o of this._objects) {
      if (!o.floats || !o.body) continue
      const d = (o.body.position.x - px) ** 2 + (o.body.position.y - py) ** 2
      if (d < bestD) {
        bestD = d
        best = o
      }
    }
    return best
  },

  // Flytare nära plasket får en liten uppåt-knuff -> de guppar (kraften taklas av MAX_V).
  _nudgeFloaters(x) {
    for (const o of this._objects) {
      if (!o.floats || !o.body) continue
      const b = o.body
      if (Math.abs(b.position.x - x) < 170 && b.position.y < SURFACE_Y + 130) {
        Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 1.6, y: b.velocity.y - 2.4 })
        if (o.view && !o.view.destroyed) pop(o.view, { scale: 1.1 })
      }
    }
  },

  // ---- Flytkraft (körs varje bildruta FÖRE phys.update) -------------------

  _applyBuoyancy() {
    for (const o of this._objects) {
      const b = o.body
      if (!b) continue
      const pos = b.position
      // Nedsänkningsgrad: 0 (helt ovanför ytan) .. 1 (helt under).
      const frac = clamp((pos.y + o.r - SURFACE_Y) / (2 * o.r), 0, 1)
      if (frac > 0) {
        // Flytkraft uppåt (accel · massa). Massoberoende eftersom gravitationen också ∝ massa.
        const buoyA = BUOY_BASE * frac * o.floatFactor
        // Vertikalt: flytare GUPPAR mjukt vid ytan; sjunkare glider rakt och lugnt nedåt.
        let vAcc = -buoyA
        // Sidled: svag fjäder mot tilldelad bana (gäller alla -> ingen stapling).
        let swayA = SPRING_K * (o.homeX - pos.x)
        if (o.floats) {
          vAcc += BOB_AMP * Math.sin(this._t * BOB_W + o.phase) // litet gupp
          swayA += SWAY_AMP * Math.sin(this._t * SWAY_W + o.phase * 1.3) // mjuk vaggning
        }
        swayA = clamp(swayA, -MAXF_A, MAXF_A)
        Body.applyForce(b, pos, { x: b.mass * swayA, y: b.mass * vAcc })
        // Vattenmotstånd: dämpa farten -> lugnt, aldrig studsigt.
        Body.setVelocity(b, { x: b.velocity.x * DRAG, y: b.velocity.y * DRAG })
      }
      // Sjunkare som nått botten lugnas extra -> de lägger sig stilla utan jitter.
      if (!o.floats && pos.y > FLOOR_TOP - o.r - 8) {
        Body.setVelocity(b, { x: b.velocity.x * 0.7, y: b.velocity.y * 0.7 })
      }
      // Håll föremålet ~upprätt.
      if (b.angularVelocity) Body.setAngularVelocity(b, b.angularVelocity * ANG_DAMP)
      // Hastighetstak -> kan ALDRIG skjuta ur tanken.
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > MAX_V) Body.setVelocity(b, { x: (b.velocity.x / sp) * MAX_V, y: (b.velocity.y / sp) * MAX_V })
    }
  },

  // ---- Firande + ny runda --------------------------------------------------

  _finishRound(ctx) {
    if (this._celebrating) return
    this._celebrating = true
    this._idle = 0
    this._level++
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('totalDropped', (ctx.progress.get().custom?.totalDropped || 0) + ROUND_SIZE)
    // complete() sköter celebrate-ljud, beröm-röst, konfetti, stjärna och klistermärke.
    ctx.progress.complete()
    this._jumpFish(ctx)
    ctx.later(1.6, () => this._newRound(ctx))
  },

  // Spelets EGNA finish: tankens invånare tar sats och hoppar i en båge upp ur vattnet,
  // plaskar ner igen och simmar vidare. Exit-säker proxy-tween.
  _jumpFish(ctx) {
    const f = this._pet
    const s = this._petState
    if (!f || f.destroyed || !s) return
    s.jump = true
    const x0 = s.x
    const st = { x: x0, y: s.y, rot: 0, t: 0 }
    const apex = 150
    const x1 = clamp(x0 + (x0 < TANK_CX ? 200 : -200), WALL_L + 60, WALL_R - 60)
    this._fishTl = gsap.timeline({
      onUpdate: () => {
        if (f.destroyed) return
        f.position.set(st.x, st.y)
        f.rotation = st.rot
        f.scale.x = Math.abs(f.scale.x) * (x1 > x0 ? 1 : -1)
      },
      onComplete: () => {
        if (!this._alive || f.destroyed) return
        s.jump = false
        s.x = x1
        s.y = SURFACE_Y + 70
        this._petNewTarget()
      },
    })
    this._fishTl
      .to(st, { y: SURFACE_Y + 110, duration: 0.18, ease: 'power2.in' })
      .to(st, { x: (x0 + x1) / 2, y: apex, rot: (x1 > x0 ? -0.6 : 0.6), duration: 0.42, ease: 'power2.out' })
      .to(st, { x: x1, y: SURFACE_Y + 40, rot: (x1 > x0 ? 0.7 : -0.7), duration: 0.36, ease: 'power2.in' })
      .add(() => {
        if (!this._alive) return
        ripple(ctx.fxLayer, x1, SURFACE_Y, { color: 0xbfeefa, maxR: 92, alpha: 0.7 })
        puff(ctx.fxLayer, x1, SURFACE_Y, { count: 12, color: 0x9fd8f0 })
        if (!ctx.services.audio.sample('pop')) ctx.services.audio.sfx('pop')
      })
      .to(st, { y: SURFACE_Y + 90, rot: 0, duration: 0.3, ease: 'power1.out' })
  },

  // ---- Ambient + idle + fysik-steg ----------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._idle += dt

    // Flytkraft FÖRE motorsteget (krafterna nollställs i Engine.update).
    this._applyBuoyancy()
    this._phys.update(ticker.deltaMS)

    // Idle-recue (~6s): glad röst + en kvarvarande hyllsak puffar till.
    if (this._idle > 6 && !this._celebrating) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_LINES))
      const onShelf = this._itemViews.filter((v) => !v.destroyed && v.eventMode === 'static')
      if (onShelf.length) pop(randomFrom(onShelf))
    }

    // Tankens invånare simmar (och nosar på det som sjunkit).
    this._updateFish(dt)

    // Drivande bubblor.
    for (const b of this._bubbles) {
      b.y -= b._vy * dt
      b.x = b._baseX + Math.sin(this._t * 1.5 + b._phase) * b._sway
      if (b.y < SURFACE_Y + 8) this._resetBubble(b)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._surfaceTween?.kill()
    this._fishTl?.kill()
    this._fishTl = null
    if (this._pet && !this._pet.destroyed) gsap.killTweensOf(this._pet)
    this._pet = null
    this._petState = null

    this._drag?.destroy() // dödar item-tweens (skala) + lyssnare
    this._itemViews?.forEach((v) => {
      if (!v || v.destroyed) return
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
    })
    // Upptäckts-hyllornas miniatyrer (skal-tween) + gissningsknapparna.
    this._logIcons?.forEach((t) => {
      if (t && !t.destroyed) gsap.killTweensOf(t.scale)
    })
    this._logIcons = []
    ;[this._guessBtnFloat, this._guessBtnSink].forEach((b) => {
      if (!b || b.destroyed) return
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      if (b._tap) b.off('pointertap', b._tap)
    })
    if (this._tankView && !this._tankView.destroyed && this._waterTapHandler) {
      this._tankView.off('pointertap', this._waterTapHandler)
    }

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
