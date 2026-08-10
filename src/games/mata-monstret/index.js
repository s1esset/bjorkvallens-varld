// Mata Monstret — fyra LÄGEN som växlar med barnets framsteg (2–5 år). Ett gosigt,
// SKEPNADSBYTANDE monster (egen färg/form/namn per runda) ska matas med handritad,
// glänsande mat (frukt/grönsaker/godis från ./food.js). Ögonen följer maten, munnen
// GAPAR när maten närmar sig, ett saftigt TUGG stänger käken, magen skvalpar och
// gnistror yr. STRIKT no-fail: varje miss är lekfull (mjukt ljud + vingel/puff) och
// monstret hjälper alltid till så maten ALLTID blir uppäten.
//
// LÄGEN (roterar via rundräknaren = ctx.progress.highestLevel):
//   1. KLASSISKT  — monstret i mitten; dra maten upp till munnen (delad DragController).
//   2. PROMENAD   — monstret strosar fram och tillbaka; munzonen rör sig med det.
//   3. HYLLA      — en hylla glider högst upp med en mat; släpp den så faller den med
//                   matter.js-gravitation; monstret glider in under och fångar (TUGG).
//   4. PLINKO     — välj en lucka högst upp (tryck); maten trillar genom ett pinnfält
//                   (matter.js) och landar i munnen; monstret glider dit den är på väg.
//
// Allt ritas programmatiskt. Återanvänder lib/DragController, lib/physics, lib/scene,
// lib/feedback (exit-säkra partiklar) och de delade firande/ljud-tjänsterna.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, puff, sparkle, ripple, shake, burst, breathe, floatText, bigCelebration } from '../../lib/feedback.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS } from '../../lib/theme.js'
import { verticalFill, cylinderFill, sphereFill } from '../../lib/form.js'
import { FOODS, makeFood, foodCat } from './food.js'

// --- layout (designkoordinater 1280×720) -----------------------------------
const W = 1280
const EYE_Y = -96 // ögonlinje relativt monstermitt
const EYE_DX = 72
const MOUTH_DY = 44 // munnens mitt relativt monstermitt
const BELLY_Y = 132
const FOOT_Y = 188
const FOOT_X = 100
const TABLE_Y = 602 // tallrik-bordets y (drag-lägen)
const EAT_R = 150 // snäpp/ät-radie runt munnen
const ANTIC_R = 300 // munnen börjar gapa när maten är så här nära
const MOUTH_OPEN = 1.0 // fullt gap
const CATCH_CLEAN_R = 155 // hylla/plinko: så här nära munnens x = REN fångst (valet räknas);
// längre bort → monstret sträcker sig synligt (mjuk assist, fortfarande no-fail)
const BELLY_FULL = 0.42 // hur mycket magen växer (skala) från tom till mätt under en runda

const MODES = ['classic', 'walk', 'shelf', 'plinko']
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Maträtter (nu via food.js) — kategorier driver favorit-läget.
const YUM_EMOJI = ['😋', '😻', '💛', '🤤', '⭐', '✨']
const MUMS = ['Mums!', 'Nam nam!', 'Så gott!', 'Åh vad gott!', 'Mums filibabba!']
const FULL = ['Mätt och belåten! Tack för maten!', 'Åh vad gott det var! Hela magen är full!', 'Nu är monstret pickemätt! Tack!']

const PREF_INTRO = {
  frukt: 'Idag är monstret extra sugen på frukt!',
  gronsaker: 'Idag vill monstret gärna ha grönsaker!',
  godis: 'Idag är monstret sugen på något sött!',
}
const PREF_PRAISE = {
  frukt: ['Mmm, frukt! Så nyttigt!', 'Härlig frukt! Mums!'],
  gronsaker: ['Goda grönsaker! Nyttigt!', 'Knapriga grönsaker, mums!'],
  godis: ['Åh, något sött! Jättegott!', 'Så sött och gott!'],
}
// Synlig favorit-önskan (tankebubbla) — begriplig utan att lyssna på rösten.
const PREF_ICON = { frukt: '🍎', gronsaker: '🥕', godis: '🍬' }

// Monster-skepnader: ny per runda (färg, form, öron, namn).
const MONSTERS = [
  { key: 'gnaffsa', name: 'Gnaffsa', ear: 'horn', colors: [COLORS.green, COLORS.teal, 0x6bbf8a], body: { w: 384, h: 366, r: 118 }, intro: 'Här är Gnaffsa! Hon är jättehungrig.' },
  { key: 'bubbel', name: 'Bubbel', ear: 'antenn', colors: [COLORS.blue, COLORS.teal, COLORS.purple], body: { w: 372, h: 372, r: 150 }, intro: 'Det här är Bubbel! Han vill ha mat.' },
  { key: 'lurvas', name: 'Lurvas', ear: 'oron', colors: [COLORS.purple, COLORS.pink, 0xb39ddb], body: { w: 356, h: 380, r: 110 }, intro: 'Säg hej till Lurvas! Vilken hunger.' },
  { key: 'sotis', name: 'Sötis', ear: 'horn', colors: [COLORS.orange, COLORS.red, COLORS.pink], body: { w: 392, h: 352, r: 100 }, intro: 'Här kommer Sötis! Magen kurrar.' },
]

// Läges-specifik talad svenska.
// HELA repliker per läge — 'Mata monstret! ' + modeIntro() var en konkatenering
// som check.mjs inte kunde hitta, så raden fick aldrig ett röstklipp.
function modeIntro(mode) {
  return {
    classic: 'Mata monstret! Dra den goda maten upp till munnen!',
    walk: 'Mata monstret! Det går omkring – ge det mat när du hinner!',
    shelf: 'Mata monstret! Släpp maten från hyllan, så fångar det den!',
    plinko: 'Mata monstret! Tryck högst upp så trillar maten ända ner i munnen!',
  }[mode]
}
function modeIdle(mode) {
  return {
    classic: randomFrom(['Dra maten till munnen!', 'Mata det hungriga monstret!']),
    walk: randomFrom(['Spring ifatt och ge mat!', 'Släpp maten vid munnen!']),
    shelf: randomFrom(['Tryck på maten för att släppa den!', 'Släpp maten från hyllan!']),
    plinko: randomFrom(['Tryck högst upp för att släppa maten!', 'Välj en lucka där uppe!']),
  }[mode]
}

export default {
  id: 'mata-monstret',
  titleSv: 'Mata Monstret',
  icon: '🍬',
  category: 'drag',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'mata-monstret',
  voiceIntro: 'Mata monstret! Dra den goda maten upp till munnen.',

  init(ctx) {
    this._alive = true
    this.services = ctx.services
    this._fed = ctx.progress.get().custom?.matningar || 0
    this._round = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._level = this._round
    this._idle = 0
    this._t = 0
    this._resolving = false
    this._chomping = false
    this._parts = {}
    this._foods = []
    this._monsterIdx = Math.floor(Math.random() * MONSTERS.length)
    this._lastColor = null
    this._prefCat = null
    this._mscale = 1
    this._mouthFloor = 0.42
    this._flightFood = null
    this._lastBounce = -1
    this._homeX = 640 // monstrets vilo-x (hylla/plinko) — glider bara HIT när det behövs
    this._reaching = false // sträcker sig efter en mat som annars skulle missa
    this._reachSaid = false // "Jag sträcker mig!" sagd en gång per mat
    this._bellyScale = 1 // magen växer per uppäten bit (nollställs per runda)
    this._prefBubble = null // synlig favorit-tankebubbla

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk äng-scen (dekorativ).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Genomskinlig tap-fångare: tomt tryck -> lekfullt litet ljud (aldrig negativt).
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    this._onEmptyTap = () => this._emptyTap()
    tap.on('pointertap', this._onEmptyTap)
    this._root.addChild(tap)

    // Spel-lager.
    this._play = new Container()
    this._root.addChild(this._play)

    // Persistenta lager: bg (bord/hylla bakom) | skugga | monster | fg (mat/pinnar/luckor).
    this._bgLayer = new Container()
    this._play.addChild(this._bgLayer)
    this._shadow = new Graphics().ellipse(0, 0, 176, 38).fill({ color: COLORS.shadow, alpha: 0.16 })
    this._shadow.eventMode = 'none'
    this._play.addChild(this._shadow)
    this._monster = new Container()
    this._monster.eventMode = 'none'
    this._monster.interactiveChildren = false
    this._play.addChild(this._monster)
    this._fgLayer = new Container()
    this._play.addChild(this._fgLayer)

    this._startRound(ctx, true)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    // Läges-anpassad öppningsfras (rundan 1 kan vara vilket läge som helst för
    // återvändande barn — säg rätt instruktion istället för en fast "dra"-fras).
    ctx.services.voice.say(modeIntro(this._mode))
  },

  // ---- rund-livscykel -----------------------------------------------------

  _countFor(mode) {
    const cyc = Math.floor(this._round / MODES.length)
    if (mode === 'classic') return Math.min(6, 3 + cyc)
    if (mode === 'walk') return Math.min(5, 3 + cyc)
    return Math.min(6, 4 + cyc) // shelf / plinko
  },

  _startRound(ctx, first) {
    if (!this._alive) return
    this._resolving = false
    this._chomping = false
    this._idle = 0
    this._miss = 0
    this._holding = false
    this._reaching = false
    this._reachSaid = false
    this._bellyScale = 1
    this._prefBubble = null
    this._mode = MODES[this._round % MODES.length]

    // Meny + favorit (djup som växer med nivån).
    const count = this._countFor(this._mode)
    this._roundCount = count
    this._picks = shuffle(FOODS).slice(0, count).map((f) => ({ key: f.key, cat: f.cat }))
    this._remaining = count
    this._prefCat = null
    if (this._round >= 2) {
      const cats = [...new Set(this._picks.map((p) => p.cat))]
      if (cats.length >= 2) this._prefCat = randomFrom(cats)
    }

    // Placera + bygg monstret per läge, sätt sedan upp läget.
    if (this._mode === 'classic') {
      this._placeMonster(640, 320, 1)
      this._mouthFloor = 0.42
      this._buildMonster()
      this._setupDragMode(ctx)
    } else if (this._mode === 'walk') {
      this._placeMonster(640, 352, 0.96)
      this._mouthFloor = 0.42
      this._buildMonster()
      this._setupWalk(ctx)
    } else if (this._mode === 'shelf') {
      this._placeMonster(640, 470, 0.84)
      this._mouthFloor = 0.55
      this._buildMonster()
      this._setupShelf(ctx)
    } else {
      this._placeMonster(640, 560, 0.78)
      this._mouthFloor = 0.55
      this._buildMonster()
      this._setupPlinko(ctx)
    }

    // Synlig favorit-tankebubbla (begriplig utan ljud) + monstrets namn som skylt.
    if (this._prefCat) {
      this._prefBubble = makePrefBubble(this._prefCat)
      this._fgLayer.addChild(this._prefBubble)
      bounceIn(this._prefBubble, { delay: 0.3 })
    }
    const mon = MONSTERS[this._monsterIdx]
    floatText(ctx.fxLayer, this._mx, this._my + (EYE_Y - 150) * this._mscale, mon.name, {
      fontSize: 48,
      rise: 40,
      duration: 1.6,
    })

    // Röst: första rundan säger mount() introt; därefter monstrets replik + läge + favorit.
    if (!first) {
      const pref = this._prefCat ? ' ' + PREF_INTRO[this._prefCat] : ''
      ctx.services.voice.say(mon.intro + ' ' + modeIntro(this._mode) + pref)
    }
  },

  _placeMonster(mx, my, scale) {
    this._mx = mx
    this._my = my
    this._homeX = mx
    this._mscale = scale
    const mn = this._monster
    gsap.killTweensOf(mn)
    gsap.killTweensOf(mn.scale)
    mn.position.set(mx, my)
    mn.scale.set(scale)
    mn.rotation = 0
    const sh = this._shadow
    if (sh && !sh.destroyed) {
      gsap.killTweensOf(sh)
      gsap.killTweensOf(sh.scale)
      sh.position.set(mx, my + 190 * scale)
      sh.scale.set(scale)
      sh.alpha = 0.16
    }
  },

  // ---- LÄGE 1 & 2: drag (klassiskt + promenad) ----------------------------

  _setupDragMode(ctx) {
    // Gosigt bord där maten står.
    this._bgLayer.addChild(makeTable())

    // Osynlig, generös munzon (drag-mål + tap-tap-mål) på munnens världsposition.
    const m = this._mouthWorld()
    this._mouthHit = new Container()
    this._mouthHit.position.set(m.x, m.y)
    this._mouthHit.hitArea = new Circle(0, 0, EAT_R)
    this._mouthHit.eventMode = 'static'
    this._fgLayer.addChild(this._mouthHit)

    this._drag = new DragController({ space: this._fgLayer, services: ctx.services })
    this._drag.addTarget(this._mouthHit, () => true, { hitRadius: EAT_R })

    const slots = this._slots(this._remaining)
    this._picks.forEach((p, i) => {
      const made = this._makeFood(p.key, 1)
      const view = made.container
      view.position.set(slots[i].x, slots[i].y)
      this._fgLayer.addChild(view)
      this._foods.push(made)
      bounceIn(view, { delay: i * 0.07 })

      // Lyft/lägg-ned: maten lyfts och skuggan VÄXER + tonar (känns högre). Exit-säkert.
      const lift = () => {
        if (!this._alive || view.destroyed) return
        this._killHint()
        this._idle = 0
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: -22, duration: 0.14, ease: 'power2.out' })
        gsap.to(made.shadow, { alpha: 0.1, duration: 0.14 })
        gsap.to(made.shadow.scale, { x: 1.55, y: 1.35, duration: 0.14 })
      }
      const settle = () => {
        if (view.destroyed) return
        if (!made._eaten) {
          gsap.killTweensOf(made.body)
          gsap.killTweensOf(made.shadow)
          gsap.killTweensOf(made.shadow.scale)
          gsap.to(made.body, { y: 0, duration: 0.2, ease: 'back.out(1.6)' })
          gsap.to(made.shadow, { alpha: 0.2, duration: 0.2 })
          gsap.to(made.shadow.scale, { x: 1, y: 1, duration: 0.2 })
        }
        // Mjuk miss-reaktion (snäpper redan hem via DragController). Aldrig bestraffning.
        const rec = made.rec
        if (rec && rec.dragging && !made._eaten) {
          const mw = this._mouthWorld()
          if (Math.hypot(view.x - mw.x, view.y - mw.y) > EAT_R) {
            ctx.services.audio.sfx('soft')
            wiggle(made.body)
            ripple(ctx.fxLayer, view.x, view.y, { color: 0xffffff, maxR: 80, alpha: 0.4 })
            this._miss++
            if (this._miss >= 3) this._autoAssistDeliver(ctx)
          }
        }
      }
      view.on('pointerdown', lift)
      view.on('pointerup', settle)
      view.on('pointerupoutside', settle)
      made._lift = lift
      made._settle = settle

      made.rec = this._drag.addItem(view, { cat: p.cat, made }, {
        onSelect: () => {
          this._idle = 0
          this._killHint()
        },
        onWrong: () => {
          if (this._alive) wiggle(made.body)
        },
        onCorrect: (rec) => this._onEat(ctx, rec),
      })
    })
  },

  _setupWalk(ctx) {
    this._walkT = 0
    this._walkSpeed = 0.7
    this._walkAmp = 300
    this._setupDragMode(ctx)
  },

  _slots(n) {
    const left = 200
    const right = 1080
    const out = []
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 640 : left + ((right - left) * i) / (n - 1)
      out.push({ x: x + (Math.random() * 2 - 1) * 10, y: TABLE_Y + (Math.random() * 2 - 1) * 8 })
    }
    return out
  },

  // ---- LÄGE 3: hylla (släpp från glidande hylla, monstret fångar) ---------

  _setupShelf(ctx) {
    this._phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
    this._shelfY = 160
    this._shelfTopY = 130
    this._shelfX = 640
    this._shelfDir = 1
    this._shelfSpeed = 260
    this._servedIdx = 0
    this._stuckT = 0
    this._holding = false
    this._catchX = 640
    this._shelf = makeShelf()
    this._shelf.position.set(this._shelfX, this._shelfY)
    this._fgLayer.addChild(this._shelf)
    this._serveShelf(ctx)
  },

  _serveShelf(ctx) {
    if (!this._alive || this._resolving) return
    const pick = this._picks[this._servedIdx % this._picks.length]
    const made = this._makeFood(pick.key, 0.8)
    made.shadow.visible = false
    const view = made.container
    view.position.set(this._shelfX, this._shelfTopY)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 80)
    this._fgLayer.addChild(view)
    this._foods.push(made)
    bounceIn(view, { duration: 0.25 })
    const down = (e) => this._shelfDown(ctx, made, e)
    view.on('pointerdown', down)
    made._down = down
    this._shelfFood = made
    this._servedIdx++
  },

  _shelfDown(ctx, made, e) {
    if (!this._alive || this._flightFood || made._eaten) return
    this._idle = 0
    this._holding = true
    ctx.services.audio.sfx('tap')
    if (!made.container.destroyed) pop(made.container)
    const move = (ev) => this._shelfMove(made, ev)
    const up = () => this._shelfUp(ctx, made)
    made._move = move
    made._up = up
    const v = made.container
    v.on('globalpointermove', move)
    v.on('pointerup', up)
    v.on('pointerupoutside', up)
  },

  _shelfMove(made, ev) {
    if (!this._holding || made.container.destroyed) return
    const p = this._fgLayer.toLocal(ev.global)
    // Håll släpp-läget inom monstrets räckvidd så fångsten känns naturlig (no-fail ändå).
    made.container.x = clamp(p.x, 220, 1060)
    made.container.y = this._shelfTopY
  },

  _shelfUp(ctx, made) {
    if (!this._holding) return
    this._holding = false
    const v = made.container
    if (!v.destroyed) {
      v.off('globalpointermove', made._move)
      v.off('pointerup', made._up)
      v.off('pointerupoutside', made._up)
    }
    made._move = made._up = null
    this._dropShelf(ctx)
  },

  _dropShelf(ctx) {
    const made = this._shelfFood
    if (!made || made._eaten || this._flightFood) return
    this._idle = 0
    this._detachShelfFood(made)
    this._shelfFood = null
    this._holding = false
    made.container.eventMode = 'none'
    made.shadow.visible = false
    const px = made.container.x
    const py = made.container.y
    const b = this._phys.circle(px, py, 40, { restitution: 0.3, friction: 0.3, frictionAir: 0.005, density: 0.0012, label: 'food' })
    Body.setVelocity(b, { x: this._shelfDir * 2.2, y: 1.0 })
    this._phys.link(b, made.container)
    made.phys = b
    this._flightFood = made
    this._stuckT = 0
    this._nudgeT = 0
    this._reaching = false
    this._reachSaid = false
    ctx.services.audio.sfx('whoosh')
  },

  _detachShelfFood(made) {
    const v = made.container
    if (!v || v.destroyed) return
    if (made._down) v.off('pointerdown', made._down)
    if (made._move) v.off('globalpointermove', made._move)
    if (made._up) {
      v.off('pointerup', made._up)
      v.off('pointerupoutside', made._up)
    }
    made._down = made._move = made._up = null
  },

  // ---- LÄGE 4: plinko (välj lucka, mat trillar genom pinnfält) ------------

  _setupPlinko(ctx) {
    this._phys = new PhysicsWorld({ gravityY: 1.1, walls: ['floor', 'left', 'right'] })
    this._unbindCol = this._phys.onCollision((e) => this._onBounce(ctx, e))
    this._servedIdx = 0
    this._stuckT = 0
    this._catchX = 640
    this._lastBounce = -1
    this._buildPegs(ctx)
    this._buildSlots(ctx)
  },

  _buildPegs(ctx) {
    // GLESARE pinnfält så maten ALDRIG kilas fast i en V mellan pinnar. Kolumn-avstånd
    // 140 (förskjutet 70 varannan rad) ger en diagonal lucka ~91px center-till-center;
    // matens diameter är nu ~56px (radie 28) → passerar med god marginal (krav: lucka >
    // 2·(pegR+foodR) = 2·(12+28) = 80 < 91). Lägre friktion = maten griper inte pinnen.
    // Pinnfältet hålls ovanför monstrets huvud (lägsta raden ~374).
    const rows = 4
    const top = 200
    const gap = 58
    const pegR = 12
    const colGap = 140
    for (let r = 0; r < rows; r++) {
      const y = top + r * gap
      const off = r % 2 ? colGap / 2 : 0
      for (let x = 300 + off; x <= 980; x += colGap) {
        this._phys.circle(x, y, pegR, { isStatic: true, restitution: 0.5, friction: 0.06, label: 'peg' })
        const v = makePeg(pegR)
        v.position.set(x, y)
        this._fgLayer.addChild(v)
      }
    }
  },

  _buildSlots(ctx) {
    this._slotXs = [360, 500, 640, 780, 920]
    this._slotViews = []
    this._slotBreaths = []
    for (const x of this._slotXs) {
      const v = makeSlot()
      v.position.set(x, 120)
      v.eventMode = 'static'
      v.cursor = 'pointer'
      v.hitArea = new Rectangle(-55, -46, 110, 120)
      const h = () => this._dropSlot(ctx, x)
      v.on('pointertap', h)
      v._h = h
      this._fgLayer.addChild(v)
      this._slotViews.push(v)
      this._slotBreaths.push(breathe(v, { scale: 1.08, duration: 0.9 }))
    }
    this._slotsEnabled = true
  },

  _enableSlots(on) {
    this._slotsEnabled = on
    for (const v of this._slotViews || []) {
      if (v.destroyed) continue
      v.eventMode = on ? 'static' : 'none'
      v.alpha = on ? 1 : 0.4
    }
  },

  _dropSlot(ctx, x) {
    if (!this._alive || this._resolving || this._flightFood || !this._slotsEnabled) return
    this._idle = 0
    this._enableSlots(false)
    const pick = this._picks[this._servedIdx % this._picks.length]
    const made = this._makeFood(pick.key, 0.6)
    made.shadow.visible = false
    const px = clamp(x + (Math.random() * 2 - 1) * 8, 80, 1200)
    made.container.position.set(px, 110)
    made.container.eventMode = 'none'
    this._fgLayer.addChild(made.container)
    this._foods.push(made)
    bounceIn(made.container, { duration: 0.2 })
    // Mindre fysik-radie (28) + låg friktion + måttlig studs = trillar igenom det glesare
    // pinnfältet utan att fastna eller studsa kaotiskt.
    const b = this._phys.circle(px, 118, 28, { restitution: 0.45, friction: 0.05, frictionAir: 0.004, density: 0.001, label: 'food' })
    Body.setVelocity(b, { x: (Math.random() * 2 - 1) * 1.0, y: 1.8 })
    this._phys.link(b, made.container)
    made.phys = b
    this._flightFood = made
    this._servedIdx++
    this._stuckT = 0
    this._nudgeT = 0
    this._reaching = false
    this._reachSaid = false
    ctx.services.audio.sfx('whoosh')
  },

  _onBounce(ctx, e) {
    if (!this._alive) return
    const f = this._flightFood
    if (!f || f.container.destroyed) return
    // Strypt till >=120ms OCH bara när maten faktiskt studsar: en vilande/fastkilad mat
    // mot en pinne triggar annars collisionStart om och om → ändlöst ljud-loop. Är farten
    // låg (mat ligger still) håller vi TYST (stuck-detektorn i _updateFlight ordnar resten).
    if (this._t - this._lastBounce < 0.12) return
    const b = f.phys
    const spd = b ? Math.hypot(b.velocity.x, b.velocity.y) : 0
    if (spd < 1.4) return
    for (const pair of e.pairs) {
      const la = pair.bodyA.label
      const lb = pair.bodyB.label
      if (la !== 'food' && lb !== 'food') continue
      const other = la === 'food' ? lb : la
      if (other !== 'peg' && other !== 'wall') continue
      this._lastBounce = this._t
      ctx.services.audio.sfx('boing')
      if (!f.container.destroyed) puff(ctx.fxLayer, f.container.x, f.container.y, { count: 3 })
      return
    }
  },

  // ---- mat-bygge ----------------------------------------------------------

  // Yttre behållare: mjuk markskugga + "body"-behållare med handritat konstverk.
  // Den yttre behållaren får gripytan (hitArea) i spelet; konstverket är dekorativt.
  _makeFood(key, scale) {
    const c = new Container()
    const shadow = new Graphics().ellipse(0, 70 * scale, 46 * scale, 15 * scale).fill({ color: COLORS.shadow, alpha: 0.2 })
    shadow.eventMode = 'none'
    const body = new Container()
    body.addChild(makeFood(key, scale))
    c.addChild(shadow, body)
    c.hitArea = new Circle(0, 0, 84)
    return { container: c, body, shadow, key, cat: foodCat(key) }
  },

  // ---- äta + reaktioner ---------------------------------------------------

  _onEat(ctx, rec) {
    this._onEatMade(ctx, rec.data.made, rec.data.cat)
  },

  _onEatMade(ctx, made, cat) {
    if (!this._alive || !made || made._eaten) return
    made._eaten = true
    this._idle = 0
    this._miss = 0
    const m = this._mouthWorld()
    const pref = this._prefCat && cat === this._prefCat
    ctx.services.audio.sfx('match') // saftigt "krasch/mums"
    ctx.services.voice.say(pref ? randomFrom(PREF_PRAISE[this._prefCat]) : randomFrom(MUMS))
    // Rätt favorit-kategori → tankebubblan studsar (begriplig belöning, aldrig straff för fel).
    if (pref && this._prefBubble && !this._prefBubble.destroyed) {
      pop(this._prefBubble)
      sparkle(ctx.fxLayer, this._prefBubble.x, this._prefBubble.y, { count: 6 })
    }
    this._fed++
    ctx.progress.setCustom('matningar', this._fed)
    this._remaining--
    // Magen växer ett synligt snäpp per bit (tom → rund vid "mätt"). Wobbeln landar på nya basen.
    const eaten = this._roundCount - this._remaining
    this._bellyScale = 1 + BELLY_FULL * (this._roundCount ? eaten / this._roundCount : 1)
    this._reactEat(ctx, pref, m.x, m.y)
    this._shrinkInto(made, m.x, m.y)
    if (this._remaining <= 0) this._finishRound(ctx)
  },

  _eatPhysics(ctx, made) {
    if (!this._alive || !made || made._eaten) return
    if (made.phys) {
      this._phys.removeBody(made.phys)
      made.phys = null
    }
    if (this._flightFood === made) this._flightFood = null
    this._onEatMade(ctx, made, made.cat)
    if (this._resolving) return // rundan klar
    if (this._mode === 'shelf') {
      this._serveCall?.kill()
      this._serveCall = gsap.delayedCall(0.45, () => {
        if (this._alive && !this._resolving) this._serveShelf(ctx)
      })
    } else if (this._mode === 'plinko') {
      this._enableSlots(true)
      ctx.services.audio.sfx('pling')
    }
  },

  // Glad reaktion vid varje tugga (utan vertikalt skutt i lägen där tickern styr y).
  _reactEat(ctx, pref, x, y) {
    this._chomp()
    this._bellyWobble()
    this._happyEyes()
    if (this._mode === 'classic') this._hop(pref ? 28 : 18)
    else this._popMonster()
    puff(ctx.fxLayer, x, y, { count: 10 })
    sparkle(ctx.fxLayer, x, y - 8, { count: pref ? 9 : 6 })
    ripple(ctx.fxLayer, x, y, { color: 0xffffff, maxR: 120 })
    if (pref) {
      ctx.services.audio.sfx('pling')
      burst(ctx.fxLayer, x, y - 10, { count: 14, power: 1.1 })
    }
    if (pref || Math.random() < 0.5) floatText(ctx.fxLayer, x, y - 70, randomFrom(YUM_EMOJI), { fontSize: 56 })
  },

  _popMonster() {
    if (this._monster && !this._monster.destroyed) pop(this._monster)
  },

  // Maten krymper in i munnen (exit-säkert: tweena {}-proxy, rör Pixi bara om den lever).
  _shrinkInto(made, tx, ty) {
    const view = made.container
    if (!view || view.destroyed) return
    if (made.shadow && !made.shadow.destroyed) made.shadow.alpha = 0
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    const st = { x: view.x, y: view.y, s: view.scale?.x || 1, a: 1 }
    const tw = gsap.to(st, {
      x: tx,
      y: ty,
      s: 0,
      a: 0,
      duration: 0.26,
      ease: 'back.in(1.4)',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.x = st.x
        view.y = st.y
        view.alpha = st.a
        view.scale.set(st.s)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy({ children: true })
      },
    })
  },

  // Hjälp-leverans (no-fail): efter ett par missar styr maten själv in i munnen.
  _autoAssistDeliver(ctx) {
    this._miss = 0
    const live = this._foods.filter((m) => !m._eaten && !m.container.destroyed && !(m.rec && m.rec.placed))
    if (!live.length) return
    const made = randomFrom(live)
    if (made.rec) made.rec.placed = true
    if (!made.container.destroyed) made.container.eventMode = 'none'
    ctx.services.voice.say('Titta, jag hjälper till!')
    this._deliverEat(ctx, made)
  },

  // Maten "homar" mot den aktuella munnen (monstret kan röra sig). Exit-säkert.
  _deliverEat(ctx, made) {
    const view = made.container
    if (!view || view.destroyed) return
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: 1,
      duration: 0.6,
      ease: 'none',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        const mm = this._mouthWorld()
        view.x += (mm.x - view.x) * 0.15
        view.y += (mm.y - view.y) * 0.15
      },
      onComplete: () => {
        if (this._alive) this._onEatMade(ctx, made, made.cat)
      },
    })
  },

  // ---- monster-bygge (port + dynamisk position/skala) --------------------

  _buildMonster() {
    const mon = MONSTERS[this._monsterIdx]
    const pool = mon.colors.filter((c) => c !== this._lastColor)
    const color = randomFrom(pool.length ? pool : mon.colors)
    this._lastColor = color
    const dark = darken(color)
    const light = lighten(color)

    const char = new Container()
    char.eventMode = 'none'
    this._char = char
    this._monster.addChild(char)
    const p = (this._parts = {})

    const bw = mon.body.w
    const bh = mon.body.h
    const br = mon.body.r

    // Fötter (bakom kroppen).
    p.feet = this._g(0, 0)
    for (const fx of [-FOOT_X, FOOT_X]) p.feet.ellipse(fx, FOOT_Y, 60, 36).fill(color).stroke({ width: 8, color: dark })
    char.addChild(p.feet)

    // Öron/horn (bakom kroppen).
    this._drawEars(char, mon, color, dark, light)

    // Kropp + armar.
    p.body = this._g(0, 0)
    // Monsterkroppen ar spelets huvudfigur och lag pa 97 405 px - 10,6 % av skarmen - i
    // EN ton (`_plattprobe --medbakgrund`). Varje del far den fyllning som matchar sin
    // FORM: armarna ar staende ror (`cylinderFill` = ljus langs mittlinjen, morker mot
    // bada kanterna) och balen ar ett klot (`sphereFill`). Per-form-normaliseringen gor
    // att alla tre far sitt eget ljus ur samma tva cachade instanser.
    p.body
      .roundRect(-bw / 2 - 34, -40, 44, 150, 22).fill(cylinderFill(color, { dark: 0.22, highlight: 0.2 })).stroke({ width: 8, color: dark })
      .roundRect(bw / 2 - 10, -40, 44, 150, 22).fill(cylinderFill(color, { dark: 0.22, highlight: 0.2 })).stroke({ width: 8, color: dark })
      .roundRect(-bw / 2, -bh / 2, bw, bh, br).fill(sphereFill(color, { highlight: 0.34, dark: 0.26 })).stroke({ width: 8, color: dark })
    char.addChild(p.body)

    // Mage (skvalpar vid tugg).
    p.belly = this._g(0, BELLY_Y)
    p.belly.ellipse(0, 0, 116, 92).fill({ color: light, alpha: 0.9 })
    char.addChild(p.belly)

    // Mun (synlig målzon). scale.y = käke som gapar/tuggar.
    p.mouth = this._g(0, MOUTH_DY)
    this._drawMouth(p.mouth)
    p.mouth.scale.set(1, this._mouthFloor)
    char.addChild(p.mouth)

    // Ögon (följer maten, blinkar).
    const eL = this._makeEye(-EYE_DX, EYE_Y)
    const eR = this._makeEye(EYE_DX, EYE_Y)
    p.eyeL = eL.eye
    p.eyeR = eR.eye
    p.pupilL = eL.pupil
    p.pupilR = eR.pupil
    char.addChild(p.eyeL, p.eyeR)

    // Rosa kinder.
    p.cheeks = this._g(0, 0)
    for (const cx of [-EYE_DX - 26, EYE_DX + 26]) p.cheeks.circle(cx, EYE_Y + 44, 24).fill({ color: 0xff9ec4, alpha: 0.85 })
    char.addChild(p.cheeks)

    this._bodyBreathe = breathe(p.body, { scale: 1.03, duration: 2.1 })
    this._scheduleBlink()
    this._popMonster()
  },

  _drawEars(char, mon, color, dark, light) {
    const p = this._parts
    p.earL = this._g(-118, -150)
    p.earR = this._g(118, -150)
    const paint = (g) => {
      if (mon.ear === 'horn') {
        g.poly([-22, 30, 22, 30, 0, -56]).fill(0xffe7a8).stroke({ width: 7, color: darken(0xffe7a8, 0.35) })
      } else if (mon.ear === 'antenn') {
        g.roundRect(-5, -10, 10, 64, 5).fill(dark)
        g.circle(0, -22, 18).fill(light).stroke({ width: 6, color: dark })
      } else {
        g.circle(0, 0, 40).fill(color).stroke({ width: 8, color: dark })
        g.circle(0, 0, 20).fill({ color: light })
      }
    }
    paint(p.earL)
    paint(p.earR)
    char.addChild(p.earL, p.earR)
  },

  _drawMouth(g) {
    g.clear()
    g.roundRect(-96, -58, 192, 116, 38).fill(0x6e2530) // gap
    g.roundRect(-54, 14, 108, 46, 24).fill(0xe06b86) // tunga
    for (const tx of [-78, -36, 6, 48, 82]) g.roundRect(tx - 13, -58, 26, 26, 8).fill(0xffffff) // övre tänder
    for (const tx of [-58, -14, 30, 70]) g.roundRect(tx - 12, 36, 24, 22, 7).fill(0xffffff) // undre tänder
  },

  _makeEye(x, y) {
    const eye = new Container()
    eye.position.set(x, y)
    eye.eventMode = 'none'
    const white = new Graphics().circle(0, 0, 40).fill(0xffffff).stroke({ width: 4, color: 0x3a2b22 })
    const pupil = new Container()
    pupil.position.set(0, 2)
    pupil.addChild(new Graphics().circle(0, 0, 18).fill(0x3a2b22))
    pupil.addChild(new Graphics().circle(6, -6, 6).fill(0xffffff))
    eye.addChild(white, pupil)
    return { eye, pupil }
  },

  _g(x, y) {
    const g = new Graphics()
    g.position.set(x, y)
    g.eventMode = 'none'
    return g
  },

  // Munnens/ögonens världsposition (följer monstrets transform).
  _mouthWorld() {
    return { x: this._monster.x, y: this._monster.y + MOUTH_DY * this._mscale }
  },

  // Favorit-tankebubblan svävar strax ovanför/bredvid monstrets huvud (följer skepnaden).
  _positionPrefBubble() {
    const bub = this._prefBubble
    if (!bub || bub.destroyed) return
    const s = this._mscale
    bub.position.set(this._monster.x + 122 * s, this._monster.y + (EYE_Y - 122) * s)
  },

  // ---- monster-reaktioner -------------------------------------------------

  _chomp() {
    const m = this._parts.mouth
    if (!m || m.destroyed) return
    this._chomping = true
    gsap.killTweensOf(m.scale)
    gsap.timeline({ onComplete: () => { this._chomping = false } })
      .to(m.scale, { y: 0.16, duration: 0.09, ease: 'power2.in' })
      .to(m.scale, { y: 0.95, duration: 0.12, ease: 'back.out(2)' })
      .to(m.scale, { y: 0.3, duration: 0.08 })
      .to(m.scale, { y: this._mouthFloor, duration: 0.16, ease: 'back.out(2)' })
  },

  _bellyWobble() {
    const b = this._parts.belly
    if (!b || b.destroyed) return
    const base = this._bellyScale || 1 // växande mage: skvalpet landar på nuvarande mättnad
    gsap.killTweensOf(b.scale)
    gsap.timeline()
      .to(b.scale, { y: base * 1.2, x: base * 0.9, duration: 0.12 })
      .to(b.scale, { y: base, x: base, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  },

  _happyEyes() {
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (!eyes.length) return
    gsap.killTweensOf(eyes)
    gsap.to(eyes, { y: 0.35, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  },

  _hop(dip = 20) {
    const mn = this._monster
    gsap.killTweensOf(mn, 'y')
    gsap.to(mn, {
      y: this._my - dip,
      duration: 0.14,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (!mn.destroyed) mn.y = this._my
      },
    })
    const sh = this._shadow
    if (sh && !sh.destroyed) {
      gsap.killTweensOf(sh.scale)
      const base = this._mscale
      gsap.to(sh.scale, {
        x: base * 0.82, y: base * 0.82, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out',
        onComplete: () => {
          if (!sh.destroyed) sh.scale.set(base)
        },
      })
    }
  },

  _scheduleBlink() {
    this._blinkTimer?.kill()
    this._blinkTimer = gsap.delayedCall(2 + Math.random() * 3.5, () => {
      if (!this._alive) return
      if (!this._resolving && !this._chomping) this._blink()
      this._scheduleBlink()
    })
  },

  _blink() {
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (!eyes.length) return
    gsap.to(eyes, { y: 0.1, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  },

  // Pupillerna glider mot maten (eller framåt i vila).
  _gaze(food) {
    const pL = this._parts.pupilL
    const pR = this._parts.pupilR
    if (!pL || pL.destroyed || !pR || pR.destroyed) return
    const ex = this._monster.x
    const ey = this._monster.y + EYE_Y * this._mscale
    let tx = 0
    let ty = 2
    if (food) {
      const dx = food.x - ex
      const dy = food.y - ey
      const d = Math.hypot(dx, dy) || 1
      const max = 13
      tx = (dx / d) * max
      ty = 2 + (dy / d) * max * 0.7
    }
    pL.x += (tx - pL.x) * 0.2
    pL.y += (ty - pL.y) * 0.2
    pR.x += (tx - pR.x) * 0.2
    pR.y += (ty - pR.y) * 0.2
  },

  // Munnen gapar mjukt när maten närmar sig (om vi inte just tuggar).
  _mouthFollow(food) {
    const m = this._parts.mouth
    if (!m || m.destroyed || this._chomping) return
    const floor = this._mouthFloor
    let target = floor
    if (food) {
      const mw = this._mouthWorld()
      const dist = Math.hypot(food.x - mw.x, food.y - mw.y)
      const o = clamp((ANTIC_R - dist) / (ANTIC_R - EAT_R), 0, 1)
      target = floor + o * (MOUTH_OPEN - floor)
    }
    m.scale.y += (target - m.scale.y) * 0.25
  },

  // ---- liv & ticker -------------------------------------------------------

  _activeDragFood() {
    const d = this._drag
    if (!d) return null
    const a = d.active && !d.active.placed ? d.active.view : null
    const s = !a && d.selected && !d.selected.placed ? d.selected.view : null
    const v = a || s
    return v && !v.destroyed ? v : null
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    if (this._phys) this._phys.update(ticker.deltaMS)

    const mode = this._mode
    if (!this._resolving) {
      if (mode === 'walk') this._walkStep(dt)
      else if (mode === 'shelf') {
        this._shelfStep(dt)
        this._slideMonster(dt)
      } else if (mode === 'plinko') {
        this._plinkoStep(dt)
        this._slideMonster(dt)
      }
    }

    // Spårad mat (för blick + munöppning).
    let food = null
    if (mode === 'classic' || mode === 'walk') food = this._activeDragFood()
    else food = this._flightFood && !this._flightFood.container.destroyed ? this._flightFood.container : null
    this._gaze(food)
    this._mouthFollow(food)
    this._positionPrefBubble()

    if (!this._resolving && (mode === 'shelf' || mode === 'plinko') && this._flightFood) this._updateFlight(ctx, dt)

    // Idle-recue (lugn) — guidar/hjälper alltid framåt.
    if (!this._resolving) {
      const busy = !!food || !!this._flightFood || this._holding
      if (busy) this._idle = 0
      else this._idle += dt
      if (this._idle > 6) {
        this._idle = 0
        this._recue(ctx)
      }
    }
  },

  _walkStep(dt) {
    this._walkT += dt
    const phase = this._walkT * this._walkSpeed
    const mx = 640 + Math.sin(phase) * this._walkAmp
    const bob = Math.abs(Math.sin(phase * 2)) * 10
    this._mx = mx
    this._monster.x = mx
    this._monster.y = this._my - bob
    this._monster.rotation = Math.cos(phase) * 0.04
    const sh = this._shadow
    if (sh && !sh.destroyed) {
      sh.x = mx
      sh.y = this._my + 190 * this._mscale
      const sc = this._mscale * (1 - bob * 0.006)
      sh.scale.set(sc)
    }
    if (this._mouthHit) {
      const m = this._mouthWorld()
      this._mouthHit.position.set(m.x, m.y)
    }
  },

  _shelfStep(dt) {
    this._shelfX += this._shelfDir * this._shelfSpeed * dt
    if (this._shelfX > 1060) {
      this._shelfX = 1060
      this._shelfDir = -1
    }
    if (this._shelfX < 220) {
      this._shelfX = 220
      this._shelfDir = 1
    }
    if (this._shelf && !this._shelf.destroyed) this._shelf.x = this._shelfX
    if (this._shelfFood && !this._holding && !this._shelfFood._eaten && !this._shelfFood.container.destroyed) {
      this._shelfFood.container.x = this._shelfX
      this._shelfFood.container.y = this._shelfTopY
    }
    // DECOUPLA monstret från den glidande hyllan: innan släpp står monstret kvar (glider
    // INTE i synk med plattformen), och först när maten är släppt glider det in och fångar.
    // Slipper "monstret rör sig synkat med plattformen" + kravet på exakt timing — den
    // y-baserade fångsten i _updateFlight gör att maten ändå alltid hamnar i munnen.
    this._catchX = this._flightFood ? this._flightFood.container.x : this._mx
  },

  _plinkoStep() {
    this._catchX = this._flightFood ? this._flightFood.container.x : this._mx
  },

  // Monstret STÅR kvar vid sitt vilo-x (så luckval/släpp-timing avgör var maten landar) och
  // glider bara HIT när det behöver sträcka sig efter en mat som annars skulle missa (no-fail).
  _slideMonster() {
    const tx = this._reaching ? clamp(this._reachX, 210, 1070) : this._homeX
    const k = this._reaching ? 0.22 : 0.1 // mjuk återgång hem; snabbare när det sträcker sig
    this._mx += (tx - this._mx) * k
    this._monster.x = this._mx
    if (this._shadow && !this._shadow.destroyed) this._shadow.x = this._mx
  },

  // Fallande mat: nudga loss om den fastnar; GARANTERA att den alltid trillar ner (rundan kan
  // aldrig hänga sig). VALET RÄKNAS: nära munnens x = REN fångst (monstret står kvar); annars
  // sträcker sig monstret synligt dit (mjuk assist) — fortfarande no-fail. Fånga (TUGG) vid munhöjd.
  _updateFlight(ctx, dt) {
    const f = this._flightFood
    if (!f || f._eaten || f.container.destroyed) return
    const m = this._mouthWorld()
    const fx = f.container.x
    const fy = f.container.y
    this._catchX = fx
    const b = f.phys
    if (b) {
      const spd = Math.hypot(b.velocity.x, b.velocity.y)
      if (spd < 0.8) {
        this._stuckT += dt
        this._nudgeT = (this._nudgeT || 0) + dt
        if (this._stuckT > 2.0) {
          // Hård garanti: lyft maten ur pinnfältet och släpp den rakt ner mot munnen.
          const tx = clamp(this._catchX, 360, 920)
          Body.setPosition(b, { x: tx, y: m.y - 120 })
          Body.setVelocity(b, { x: 0, y: 5 })
          this._stuckT = 0
          this._nudgeT = 0
        } else if (this._nudgeT > 0.4) {
          // Mjuk, upprepad knuff (sidled + nedåt) för att vicka loss ur en pinn-kil.
          Body.setPosition(b, { x: b.position.x + (Math.random() * 2 - 1) * 6, y: b.position.y + 3 })
          Body.setVelocity(b, { x: (Math.random() * 2 - 1) * 2.6, y: 4.4 })
          this._nudgeT = 0
        }
      } else {
        this._stuckT = 0
        this._nudgeT = 0
      }
    }

    // Föraning: monstret LUTAR sig lite mot inkommande mat (utan att flytta sig) medan den faller.
    if (!this._reaching && fy < m.y - 40) {
      const lean = clamp((fx - this._monster.x) / 900, -0.13, 0.13)
      this._monster.rotation += (lean - this._monster.rotation) * 0.1
    }

    // Fångst-beslut vid munhöjd.
    if (fy >= m.y - 8) {
      const dx = fx - m.x
      if (this._reaching) {
        // Redan på väg dit — fånga när munnen glidit fram under maten.
        this._reachX = fx
        if (Math.abs(fx - this._monster.x) <= CATCH_CLEAN_R) this._catchEat(ctx, f)
      } else if (Math.abs(dx) <= CATCH_CLEAN_R) {
        // REN fångst: valet/timingen träffade — belöna med ett litet nöjt skutt.
        this._hop(12)
        this._catchEat(ctx, f)
      } else {
        // Skulle missa → synlig, vänlig sträckning (sagd en gång). Ingen bestraffning.
        this._reaching = true
        this._reachX = fx
        if (!this._reachSaid) {
          this._reachSaid = true
          ctx.services.voice.say('Jag sträcker mig!')
        }
      }
    }
  },

  _catchEat(ctx, f) {
    this._reaching = false
    if (this._monster && !this._monster.destroyed) gsap.to(this._monster, { rotation: 0, duration: 0.2 })
    this._eatPhysics(ctx, f)
  },

  _recue(ctx) {
    this._idle = 0
    ctx.services.voice.say(modeIdle(this._mode))
    const mode = this._mode
    if (mode === 'classic' || mode === 'walk') {
      this._hintRandom()
      this._popMonster()
    } else if (mode === 'shelf') {
      if (this._shelfFood && !this._holding) this._dropShelf(ctx)
      else this._popMonster()
    } else if (mode === 'plinko') {
      if (!this._flightFood) this._dropSlot(ctx, randomFrom(this._slotXs))
    }
  },

  _emptyTap() {
    if (!this._alive) return
    this._idle = 0
    this.services.audio.sfx('soft')
    if (this._parts.body && !this._parts.body.destroyed) wiggle(this._parts.body)
  },

  _hintRandom() {
    this._killHint()
    const live = this._foods.filter((m) => !m.container.destroyed && !m._eaten)
    if (!live.length) return
    const m = randomFrom(live)
    this._hintRec = m
    this._hint = breathe(m.body, { scale: 1.12, duration: 0.7 })
  },

  _killHint() {
    this._hint?.kill()
    this._hint = null
    if (this._hintRec && this._hintRec.body && !this._hintRec.body.destroyed) {
      gsap.killTweensOf(this._hintRec.body.scale)
      this._hintRec.body.scale.set(1, 1)
    }
    this._hintRec = null
  },

  // ---- rundan klar: firande + ny runda (nytt läge/skepnad) ---------------

  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    this._killHint()
    this._serveCall?.kill()

    this._chomp()
    this._bellyWobble()
    this._happyEyes()
    if (this._mode === 'classic') this._hop(40)
    else this._popMonster()
    shake(this._play, { intensity: 6, duration: 0.4 })
    burst(ctx.fxLayer, this._monster.x, this._monster.y + EYE_Y * this._mscale, { count: 18, power: 1.2 })
    sparkle(ctx.fxLayer, this._monster.x, this._monster.y, { count: 10 })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(FULL))

    this._round++
    this._level = Math.max(this._level, this._round)
    ctx.progress.setLevel(this._round)
    ctx.progress.complete() // delat firande + stjärna + klistermärke

    this._nextCall?.kill()
    this._nextCall = gsap.delayedCall(1.9, () => {
      if (!this._alive) return
      this._teardownRound()
      this._monsterIdx = (this._monsterIdx + 1) % MONSTERS.length
      this._startRound(ctx, false)
    })
  },

  // ---- städning per runda + total ----------------------------------------

  _charObjs() {
    const p = this._parts
    return [p.feet, p.earL, p.earR, p.body, p.belly, p.mouth, p.eyeL, p.eyeR, p.cheeks].filter(Boolean)
  },

  _killTweens(objs) {
    for (const o of objs) {
      if (!o) continue
      gsap.killTweensOf(o)
      if (o.scale) gsap.killTweensOf(o.scale)
    }
  },

  _clearMonster() {
    this._blinkTimer?.kill()
    this._blinkTimer = null
    this._bodyBreathe?.kill()
    this._bodyBreathe = null
    this._killTweens(this._charObjs())
    if (this._char) {
      this._char.destroy({ children: true })
      this._char = null
    }
    this._parts = {}
  },

  _clearLayer(layer) {
    if (!layer || layer.destroyed) return
    for (const ch of [...layer.children]) {
      gsap.killTweensOf(ch)
      if (ch.scale) gsap.killTweensOf(ch.scale)
      if (!ch.destroyed) ch.destroy({ children: true })
    }
  },

  _destroyFoods() {
    for (const m of this._foods || []) {
      gsap.killTweensOf(m.container)
      gsap.killTweensOf(m.container.scale)
      gsap.killTweensOf(m.body)
      gsap.killTweensOf(m.shadow)
      if (m.shadow) gsap.killTweensOf(m.shadow.scale)
      const v = m.container
      if (v && !v.destroyed) {
        if (m._lift) v.off('pointerdown', m._lift)
        if (m._settle) {
          v.off('pointerup', m._settle)
          v.off('pointerupoutside', m._settle)
        }
        if (m._down) v.off('pointerdown', m._down)
        if (m._move) v.off('globalpointermove', m._move)
        if (m._up) {
          v.off('pointerup', m._up)
          v.off('pointerupoutside', m._up)
        }
        v.destroy({ children: true })
      }
      m.phys = null
    }
    this._foods = []
  },

  _teardownRound() {
    this._resolving = false
    this._holding = false
    this._reaching = false
    this._flightFood = null
    this._shelfFood = null
    this._shelf = null
    this._prefBubble = null // ligger i _fgLayer och rensas av _clearLayer nedan
    this._serveCall?.kill()
    this._serveCall = null
    this._killHint()

    if (this._drag) {
      this._drag.clear()
      this._drag = null
    }
    this._mouthHit = null

    this._destroyFoods()

    if (this._slotBreaths) {
      for (const t of this._slotBreaths) t?.kill()
      this._slotBreaths = null
    }
    if (this._slotViews) {
      for (const v of this._slotViews) if (v._h && !v.destroyed) v.off('pointertap', v._h)
      this._slotViews = null
    }
    this._slotXs = null

    this._unbindCol?.()
    this._unbindCol = null
    this._phys?.destroy()
    this._phys = null

    this._clearLayer(this._bgLayer)
    this._clearLayer(this._fgLayer)
    this._clearMonster()
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._blinkTimer?.kill()
    this._bodyBreathe?.kill()
    this._nextCall?.kill()
    this._serveCall?.kill()
    this._hint?.kill()

    // DragController river sina lyssnare och dödar matens view-tweens.
    this._drag?.destroy()

    // Egna sub-objekt-tweens som lib-städningen inte känner till.
    for (const m of this._foods || []) {
      gsap.killTweensOf(m.container)
      gsap.killTweensOf(m.container.scale)
      gsap.killTweensOf(m.body)
      gsap.killTweensOf(m.shadow)
      if (m.shadow) gsap.killTweensOf(m.shadow.scale)
    }
    if (this._slotBreaths) for (const t of this._slotBreaths) t?.kill()
    this._killTweens(this._charObjs())
    if (this._monster) {
      gsap.killTweensOf(this._monster)
      gsap.killTweensOf(this._monster.scale)
    }
    if (this._shadow) {
      gsap.killTweensOf(this._shadow)
      gsap.killTweensOf(this._shadow.scale)
    }
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)

    this._unbindCol?.()
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk dekor-grafik ===================

function makeTable() {
  const g = new Graphics()
  // Bordsskivan lag pa 123 654 px - 13 % av skarmen - i EN ton (`_plattprobe
  // --medbakgrund`). Himlen bakom var redan tonad via `createScene`; det var bordet som
  // var platt. Ljuset kommer uppifran, sa skivan ar ljusast dar den moter scenen och
  // morknar mot betraktaren. Cachad per fargpar - noll texturbakningar per montering.
  g.roundRect(-60, TABLE_Y - 6, W + 120, 220, 70).fill(verticalFill(0xf0d4ac, 0xd8b585))
  g.roundRect(-60, TABLE_Y - 6, W + 120, 16, 70).fill({ color: 0xfff0d6, alpha: 0.6 })
  g.eventMode = 'none'
  return g
}

// Glidande hylla (plank + hängande snören) i hyll-läget.
function makeShelf() {
  const c = new Container()
  const rope = new Graphics()
  rope.moveTo(-90, -14).lineTo(-90, -64).moveTo(90, -14).lineTo(90, -64).stroke({ width: 4, color: 0x8a6a44 })
  const plank = new Graphics().roundRect(-110, -14, 220, 28, 14).fill(0xc98a52).stroke({ width: 4, color: 0x9c6736 })
  const hi = new Graphics().roundRect(-110, -14, 220, 8, 8).fill({ color: 0xfff0d6, alpha: 0.4 })
  c.addChild(rope, plank, hi)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Plinko-pinne (vit knopp med blå rand + dager).
function makePeg(r) {
  const c = new Container()
  c.addChild(new Graphics().circle(0, 0, r).fill(0xffffff).stroke({ width: 3, color: 0xbcd6e8 }))
  c.addChild(new Graphics().circle(-r * 0.3, -r * 0.3, r * 0.35).fill({ color: 0xffffff, alpha: 0.8 }))
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Favorit-tankebubbla: vit moln-bubbla med kategori-ikon + små "tanke"-prickar mot monstret.
function makePrefBubble(cat) {
  const c = new Container()
  const cloud = new Graphics().roundRect(-48, -42, 96, 74, 30).fill(0xffffff).stroke({ width: 5, color: 0xbcd6e8 })
  const dots = new Graphics()
    .circle(-34, 40, 11).fill(0xffffff).stroke({ width: 4, color: 0xbcd6e8 })
    .circle(-52, 58, 7).fill(0xffffff).stroke({ width: 3, color: 0xbcd6e8 })
  // P0 ASSETS: RITAT önskemärke (var en emoji-Text i pratbubblan).
  const icon = drawIcon(PREF_ICON[cat] || '🍎', 50)
  icon.position.set(0, -6)
  c.addChild(cloud, dots, icon)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Drop-lucka högst upp i plinko (mjuk skål + nedåtpil).
function makeSlot() {
  const c = new Container()
  const cup = new Graphics().roundRect(-34, -8, 68, 20, 10).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
  const arrow = new Graphics().moveTo(-16, 16).lineTo(16, 16).lineTo(0, 40).closePath().fill(0xffd35c).stroke({ width: 3, color: 0xe0b020 })
  c.addChild(cup, arrow)
  return c
}

// Mörkare/ljusare nyans (kontur respektive mage/öra-markering).
function darken(hex, amt = 0.22) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
function lighten(hex, amt = 0.5) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}
