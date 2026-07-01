// Grävmaskinen — bygg-/fysiklek (3–5 år). Zacke kör en grävmaskin. Barnet DRAR skopan
// ner i en oändlig sandhög för att gräva (skopan fylls), drar den fyllda skopan över
// dumpern och SLÄPPER → skopan tippar och korn rinner ut vid munnen. Sanden faller
// GRANULÄRT (en egen cellulär "falling-sand"-simulering, INTE matter.js) och lägger sig
// i högar i flaket. Fyll flaket till fyllnadslinjen → lastbilen tutar, firande, ny större
// last. Spelet kan ALDRIG misslyckas: sandhögen är oändlig, spilld sand är bara kul, och
// en mjuk auto-hjälp (vindpust + extra sand + linjen sänks lite) garanterar att flaket
// alltid blir fullt. Allt ritas programmatiskt (Pixi Graphics + system-emoji).
//
// Sandsimuleringen: ett rutnät (Int8Array, CELL=10) över flaket + marginal. WALL-celler
// (=9) bildar flakets väggar/golv så korn stannar inne. Var STEP_MS=28 ms körs ETT steg:
// iterera rader NERIFRÅN och UPP, flytta varje sandkorn ner / ner-vänster / ner-höger
// (slumpad L/R-ordning) → naturliga högar. ALLA korn ritas i EN dedikerad Graphics
// (this._sandGfx) per frame (clear + en rect per cell), aldrig per-korn-Pixi-objekt.
// Inget GSAP rör rutnätet → inherent exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, puff, burst, floatText, bigCelebration, sparkle, shake } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// --- Sandrutnät (designkoordinater) ---
const CELL = 10 // cellstorlek
const ZX = 600 // simzonens vänsterkant (x)
const ZY = 200 // simzonens överkant (y)
const COLS = 52 // (1120-600)/10
const ROWS = 34 // (540-200)/10
const WALL = 9 // väggcell-flagga
const CAP = 40 // skopans kapacitet (korn)
const STEP_MS = 28 // ms mellan sim-steg (~36 steg/s)
const SAND = [0, 0xe8c98a, 0xd9b46f, 0xc89a55, 0xffd24a] // [tom, topp, mitt, botten, guldkorn]
const GOLD = 4 // glittrande guldkorn (variation) — faller som vanlig sand

// --- Skopans geometri / spelyta ---
const PIVOT_X = 480 // bom-led
const PIVOT_Y = 458
const BUCKET_HOME = { x: 300, y: 470 }
const MOUTH_DY = 30 // munnens y-offset från skopans mitt
const X_MIN = 110
const X_MAX = 1060
const Y_MIN = 130
const Y_MAX = 560
const IDLE_DELAY = 6 // s utan handling → röst-recue
const HELP_TIPS = 4 // tippningar utan full last → auto-hjälp
const HELP_TIME = 12 // s utan full last → auto-hjälp

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'gravmaskinen',
  titleSv: 'Grävmaskinen',
  icon: '🚜',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'gravmaskinen',
  voiceIntro: 'Hjälp Zacke! Gräv sand och fyll lastbilen!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._acc = 0
    this._idle = 0
    this._helpT = 0
    this._tips = 0
    this._fullHold = 0
    this._dragging = false
    this._resolving = false
    this._bucketCount = 0
    this._lastScoopSfx = -1
    this._lastSpillFx = -1
    this._lastHiss = -1 // senaste kornrassel-ljud
    this._lastFynd = -100 // senaste skatt-fynd
    this._moved = 0 // rörliga korn senaste frame (rassel-intensitet)
    this._pilePulsing = false

    this.grid = new Int8Array(COLS * ROWS)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen (byggs en gång) ----------------------------------------------

  _buildScene(ctx) {
    // Varm bygg-/sandton som FÖRSTA barn (dekorativ, exit-säker).
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height, ground: true }))

    // Osynlig tryckyta för tap-tap-fallback (under skopan, ovanpå dekoren).
    this._tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._tapCatcher.eventMode = 'static'
    this._onCatchH = (e) => this._onCatchTap(ctx, e)
    this._tapCatcher.on('pointertap', this._onCatchH)
    this._root.addChild(this._tapCatcher)

    // Oändlig sandhög (vänster). Ritas kring ett eget centrum (pivot) så den kan
    // pulsa snyggt vid grävning utan att hoppa.
    this._pile = this._makePile()
    this._root.addChild(this._pile)

    // Grävmaskin + hytt + förar-Zacke.
    this._root.addChild(this._makeMachine())

    // Dumper (🚛) + flak (väggar) + fyllnadslinje + sand-grafik.
    this._truck = new Text({ text: '🚛', style: { fontFamily: FONT.body, fontSize: 130 } })
    this._truck.anchor.set(0.5)
    this._truck.position.set(905, 558)
    this._truck.eventMode = 'none'
    this._root.addChild(this._truck)

    this._bedGfx = new Graphics()
    this._bedGfx.eventMode = 'none'
    this._root.addChild(this._bedGfx)

    this._fillLineGfx = new Graphics()
    this._fillLineGfx.eventMode = 'none'
    this._root.addChild(this._fillLineGfx)

    this._fillMarker = new Text({ text: '🎯', style: { fontFamily: FONT.body, fontSize: 40 } })
    this._fillMarker.anchor.set(0.5)
    this._fillMarker.eventMode = 'none'
    this._root.addChild(this._fillMarker)

    // Sand-grafik: alla rörliga/vilande korn ritas här (över flaket, under skopan).
    this._sandGfx = new Graphics()
    this._sandGfx.eventMode = 'none'
    this._root.addChild(this._sandGfx)

    // Bommen (armen): ritas om varje frame från pivot till skopan.
    this._boom = new Graphics()
    this._boom.eventMode = 'none'
    this._root.addChild(this._boom)

    // Skopan (dra-objektet) — överst, interaktiv.
    this._bucket = this._makeBucket()
    this._bucket.position.set(BUCKET_HOME.x, BUCKET_HOME.y)
    this._root.addChild(this._bucket)

    this._onDownH = (e) => this._onDown(ctx, e)
    this._onMoveH = (e) => this._onMove(ctx, e)
    this._onUpH = (e) => this._onUp(ctx, e)
    this._bucket.on('pointerdown', this._onDownH)
    this._bucket.on('globalpointermove', this._onMoveH)
    this._bucket.on('pointerup', this._onUpH)
    this._bucket.on('pointerupoutside', this._onUpH)
  },

  _makePile() {
    const g = new Graphics()
    // Markskugga under högen.
    g.ellipse(240, 612, 200, 26).fill({ color: 0x000000, alpha: 0.12 })
    // Tre lager i sandtoner (botten → topp), mjuk kulle med topp vid (240,360).
    g.moveTo(70, 612).quadraticCurveTo(150, 470, 240, 442).quadraticCurveTo(360, 470, 430, 612).fill(0xc89a55)
    g.moveTo(108, 612).quadraticCurveTo(180, 432, 240, 402).quadraticCurveTo(322, 446, 398, 612).fill(0xd9b46f)
    g.moveTo(150, 612).quadraticCurveTo(212, 382, 240, 360).quadraticCurveTo(292, 402, 350, 612).fill(0xe8c98a)
    // Pivot kring högens mitt → ren skal-puls vid grävning.
    g.pivot.set(240, 520)
    g.position.set(240, 520)
    g.eventMode = 'none'
    return g
  },

  _makeMachine() {
    const c = new Container()
    c.eventMode = 'none'
    // Maskinkropp.
    const body = new Text({ text: '🚜', style: { fontFamily: FONT.body, fontSize: 120 } })
    body.anchor.set(0.5)
    body.position.set(430, 560)
    c.addChild(body)
    // Hytt (gul roundRect, stroke orange).
    const cab = new Graphics()
      .roundRect(-38, -36, 76, 66, 14)
      .fill(COLORS.yellow)
      .stroke({ width: 5, color: COLORS.orangeDark })
    cab.position.set(430, 502)
    c.addChild(cab)
    // Förar-Zacke (enda avbildade människan).
    const zacke = new Text({ text: '🧒', style: { fontFamily: FONT.body, fontSize: 52 } })
    zacke.anchor.set(0.5)
    zacke.position.set(430, 512)
    c.addChild(zacke)
    return c
  },

  _makeBucket() {
    const c = new Container()
    const body = new Graphics()
    // Metallskopa (trapets, öppen upptill).
    body.poly([-54, -30, 54, -30, 40, 40, -40, 40]).fill(0xb8c0c8).stroke({ width: 4, color: 0x8a939b })
    // Inre skugga.
    body.poly([-46, -22, 46, -22, 34, 34, -34, 34]).fill(0xa7b0b8)
    // Grävtänder nedtill.
    for (const tx of [-30, -10, 10, 30]) {
      body.poly([tx - 6, 40, tx + 6, 40, tx, 53]).fill(0x9aa3ab).stroke({ width: 2, color: 0x8a939b })
    }
    c.addChild(body)
    // Sandfyllnad (ritas om vid behov, ovanpå skopan).
    this._bucketSand = new Graphics()
    c.addChild(this._bucketSand)
    // Träffyta ≥96px.
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 78)
    return c
  },

  _updateBucketSand(count) {
    const g = this._bucketSand
    if (!g || g.destroyed) return
    g.clear()
    const ratio = clamp(count / CAP, 0, 1)
    if (ratio <= 0.02) return
    const botY = 34
    const topY = botY - ratio * 54
    // Trapetsbredd interpolerad (smalare nedtill).
    const widthAt = (y) => 34 + ((botY - y) / 56) * 12
    const wb = widthAt(botY)
    const wt = widthAt(topY)
    g.poly([-wb, botY, wb, botY, wt, topY, -wt, topY]).fill(0xd9b46f)
    g.poly([-wt, topY, wt, topY, wt - 4, topY + 5, -wt + 4, topY + 5]).fill({ color: 0xe8c98a, alpha: 0.8 })
  },

  // ---- Nivå / flak --------------------------------------------------------

  _levelConfig(level) {
    if (level <= 1) return { leftX: 745, rightX: 985, fillY: 440, target: 55 }
    if (level <= 3) return { leftX: 725, rightX: 1005, fillY: 408, target: 85 }
    if (level <= 5) return { leftX: 720, rightX: 1010, fillY: 376, target: 122 }
    return { leftX: 715, rightX: 1015, fillY: 366, target: 170 + ((Math.random() * 40) | 0) }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._level = level
    const cfg = this._levelConfig(level)
    this._cfg = cfg
    this._target = cfg.target
    this._fillRow = clamp(Math.floor((cfg.fillY - ZY) / CELL), 0, ROWS - 1)

    this._setWalls(cfg)
    this._drawBed()
    this._drawFillLine(cfg)
    this._lineCells = Math.max(6, Math.floor((this._rightCol - this._leftCol - 1) * 0.5))

    // Nollställ rundans tillstånd.
    this._bucketCount = 0
    this._updateBucketSand(0)
    this._resolving = false
    this._dragging = false
    this._tips = 0
    this._helpT = 0
    this._fullHold = 0
    this._idle = 0
    gsap.killTweensOf(this._bucket)
    this._bucket.rotation = 0
    this._bucket.position.set(BUCKET_HOME.x, BUCKET_HOME.y)
    this._renderSand()
  },

  _setWalls(cfg) {
    const grid = this.grid
    grid.fill(0)
    const lc = clamp(Math.floor((cfg.leftX - ZX) / CELL), 1, COLS - 2)
    const rc = clamp(Math.floor((cfg.rightX - ZX) / CELL), 1, COLS - 2)
    const topRow = clamp(Math.floor((360 - ZY) / CELL), 0, ROWS - 1) // 16
    const floorRow = clamp(Math.floor((500 - ZY) / CELL), 0, ROWS - 2) // 30
    for (let row = topRow; row <= floorRow; row++) {
      grid[row * COLS + lc] = WALL
      grid[row * COLS + rc] = WALL
    }
    for (let row = floorRow; row <= floorRow + 1 && row < ROWS; row++) {
      for (let col = lc; col <= rc; col++) grid[row * COLS + col] = WALL
    }
    this._leftCol = lc
    this._rightCol = rc
    this._floorRow = floorRow
  },

  _drawBed() {
    const g = this._bedGfx
    if (!g || g.destroyed) return
    g.clear()
    const lwx = this._leftCol * CELL + ZX
    const rwx = this._rightCol * CELL + ZX
    const fy = this._floorRow * CELL + ZY
    const top = 360
    const h = fy - top
    // Mörk bakgrundspanel (djup) bakom sanden.
    g.roundRect(lwx + CELL, top, rwx - lwx - CELL, h, 8).fill({ color: 0x6b4326, alpha: 0.16 })
    // Golv.
    g.roundRect(lwx - 8, fy, rwx - lwx + CELL + 16, 2 * CELL, 6).fill(COLORS.brown).stroke({ width: 3, color: 0x6b4326 })
    // Vänster vägg.
    g.roundRect(lwx - 8, top, CELL + 8, h + CELL, 6).fill(COLORS.brown).stroke({ width: 3, color: 0x6b4326 })
    // Höger vägg.
    g.roundRect(rwx, top, CELL + 8, h + CELL, 6).fill(COLORS.brown).stroke({ width: 3, color: 0x6b4326 })
    // Chassi-balk under flaket — kopplar ihop flaket med lastbilen (flaket sitter PÅ 🚛).
    g.roundRect(lwx - 6, fy + 2 * CELL, rwx - lwx + CELL + 12, 12, 5).fill(0x3a3f45)
    // Centrera 🚛 under flaket och skala den mot flakets bredd så det läser som EN dumper.
    if (this._truck && !this._truck.destroyed) {
      this._truck.position.set((lwx + rwx) / 2, fy + 78)
      this._truck.scale.set(clamp((rwx - lwx) / 210, 1, 1.5))
    }
  },

  _drawFillLine(cfg) {
    const g = this._fillLineGfx
    if (!g || g.destroyed) return
    g.clear()
    const y = cfg.fillY
    const x0 = this._leftCol * CELL + ZX + CELL
    const x1 = this._rightCol * CELL + ZX
    for (let x = x0; x < x1 - 8; x += 24) {
      g.rect(x, y - 2, 14, 4).fill({ color: COLORS.yellow, alpha: 0.85 })
    }
    if (this._fillMarker && !this._fillMarker.destroyed) this._fillMarker.position.set(x1 + 22, y)
  },

  // ---- Drag: gräv-medan-du-drar + tippa-vid-släpp ------------------------

  _onDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._dragging = true
    const p = this._root.toLocal(e.global)
    this._grabDX = p.x - this._bucket.x
    this._grabDY = p.y - this._bucket.y
    this._dragDist = 0
    this._lastScoopX = this._bucket.x
    this._lastScoopY = this._bucket.y + MOUTH_DY
    this._idle = 0
    this._helpT = 0
    pop(this._bucket)
    ctx.services.audio.sfx('tap')
  },

  _onMove(ctx, e) {
    if (!this._alive || !this._dragging || this._resolving) return
    const p = this._root.toLocal(e.global)
    let nx = clamp(p.x - this._grabDX, X_MIN, X_MAX)
    let ny = clamp(p.y - this._grabDY, Y_MIN, Y_MAX)
    this._dragDist += Math.hypot(nx - this._bucket.x, ny - this._bucket.y)
    this._bucket.x = nx
    this._bucket.y = ny
    this._idle = 0
    this._helpT = 0

    // Gräv medan munnen sveper genom sandhögen (+1 korn per ~8px rört avstånd).
    const munX = nx
    const munY = ny + MOUTH_DY
    const digging = this._bucketCount < CAP && this._inPile(munX, munY)
    if (digging) {
      const moved = Math.hypot(munX - this._lastScoopX, munY - this._lastScoopY)
      this._bucketCount = Math.min(CAP, this._bucketCount + moved / 8)
      this._updateBucketSand(this._bucketCount)
      if (this._t - this._lastScoopSfx > 0.14) {
        this._lastScoopSfx = this._t
        // Kornigt skrap när skopan gräver (ersätter mjuk 'soft').
        ctx.services.audio.tone({ freq: 130, dur: 0.11, type: 'sawtooth', vol: 0.13, slideTo: 80 })
        puff(ctx.fxLayer, munX, munY, { count: 3, color: 0xd9b46f })
        this._pulsePile()
        this._maybeFynd(ctx, munX, munY)
      }
    }
    // Kort skopa-darrning medan man gräver (annars rakt hängande).
    this._bucket.rotation = digging ? (Math.random() * 2 - 1) * 0.045 : 0
    this._lastScoopX = munX
    this._lastScoopY = munY
  },

  // Gräver man djupt kan en begravd skatt (💎/🦴/🐚/⭐) dyka upp — extra fynd-glädje.
  _maybeFynd(ctx, x, y) {
    if (!this._alive || y < 470) return // bara djupa grävtag
    if (this._t - this._lastFynd < 7 || Math.random() > 0.16) return
    this._lastFynd = this._t
    const tok = ['💎', '🦴', '🐚', '⭐'][(Math.random() * 4) | 0]
    sparkle(ctx.fxLayer, x, y - 10, { count: 8 })
    floatText(ctx.fxLayer, x, y - 20, tok, { fontSize: 64, rise: 120 })
    ctx.services.audio.sfx('reveal')
    ctx.services.audio.tone({ freq: 1200, dur: 0.18, type: 'sine', vol: 0.18, slideTo: 1800 })
    ctx.services.voice.say('Titta, en skatt!')
  },

  _onUp(ctx, e) {
    if (!this._alive || !this._dragging) return
    this._dragging = false
    if (this._resolving) return
    // Kort gest (<14px) = tap → tap-tap-fallback.
    if (this._dragDist < 14) {
      const p = this._root.toLocal(e.global)
      this._handleTap(ctx, p.x, p.y)
      return
    }
    // Drag-släpp: har skopan sand → tippa där fingret släpptes.
    if (this._bucketCount > 0) this._tip(ctx)
  },

  _onCatchTap(ctx, e) {
    if (!this._alive || this._dragging || this._resolving) return
    const p = this._root.toLocal(e.global)
    this._handleTap(ctx, p.x, p.y)
  },

  // Tap-tap-fallback: tap vid högen fyller halvvägs; tap över flaket flyttar dit + tippar.
  _handleTap(ctx, x, y) {
    if (this._resolving) return
    this._idle = 0
    this._helpT = 0
    const overBed = x >= this._cfg.leftX - 30 && x <= this._cfg.rightX + 30
    if (this._bucketCount > 0 && (overBed || x >= ZX)) {
      const tx = clamp(x, this._cfg.leftX, this._cfg.rightX)
      this._moveBucketTo(tx, 300, () => this._tip(ctx))
    } else if (x < 470) {
      this._moveBucketTo(BUCKET_HOME.x, BUCKET_HOME.y, () => {
        if (!this._alive || this._resolving) return
        this._bucketCount = Math.max(this._bucketCount, 24)
        this._updateBucketSand(this._bucketCount)
        pop(this._bucket)
        this._pulsePile()
        ctx.services.audio.sfx('soft')
        puff(ctx.fxLayer, BUCKET_HOME.x, BUCKET_HOME.y + MOUTH_DY, { count: 5, color: 0xd9b46f })
      })
    } else {
      // Lekfullt neutralt svar (aldrig "fel").
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, x, y, { count: 4 })
    }
  },

  _moveBucketTo(tx, ty, onDone) {
    gsap.killTweensOf(this._bucket)
    gsap.to(this._bucket, {
      x: tx,
      y: ty,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        if (this._alive) onDone?.()
      },
    })
  },

  _tip(ctx) {
    if (!this._alive || this._resolving || this._bucketCount <= 0) return
    const n = Math.round(this._bucketCount)
    this._bucketCount = 0
    this._updateBucketSand(0)
    ctx.services.audio.sfx('whoosh')
    this._spawnGrains(this._bucket.x, this._bucket.y + MOUTH_DY, n)
    // Damm när sanden rinner ut + ett litet skärm-skutt när en stor mängd rasar.
    puff(ctx.fxLayer, this._bucket.x, this._bucket.y + MOUTH_DY, { count: 6, color: 0xe8c98a })
    if (n >= 18) shake(this._root, { intensity: 5, duration: 0.32 })
    this._tips++
    this._helpT = 0
    // Tipp-animation (luta fram & tillbaka). Position orörd → bommen håller ihop.
    const b = this._bucket
    gsap.killTweensOf(b)
    const r0 = 0
    gsap
      .timeline()
      .to(b, { rotation: r0 - 0.7, duration: 0.22, ease: 'power2.out' })
      .to(b, { rotation: r0, duration: 0.32, ease: 'back.out(2)' })
  },

  _inPile(x, y) {
    if (x < 100 || x > 400) return false
    const surf = 360 + (Math.abs(x - 240) / 160) * 230
    return y > surf
  },

  _pulsePile() {
    const s = this._pile
    if (this._pilePulsing || !s || s.destroyed) return
    this._pilePulsing = true
    gsap
      .timeline({
        onComplete: () => {
          this._pilePulsing = false
          if (!s.destroyed) s.scale.set(1)
        },
      })
      .to(s.scale, { x: 0.96, y: 1.04, duration: 0.1, ease: 'sine.out' })
      .to(s.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' })
  },

  // ---- Kornsimulering (cellulär falling-sand) ----------------------------

  _spawnGrains(munX, munY, n) {
    const grid = this.grid
    const overBed = munX >= this._cfg.leftX && munX <= this._cfg.rightX
    const minC = overBed ? this._leftCol + 1 : 1
    const maxC = overBed ? this._rightCol - 1 : COLS - 2
    const baseCol = clamp(Math.round((munX - ZX) / CELL), minC, maxC)
    const baseRow = clamp(Math.floor((munY - ZY) / CELL), 0, this._floorRow - 1)
    const spread = [0, -1, 1, -2, 2]
    for (let k = 0; k < n; k++) {
      const col = clamp(baseCol + spread[k % spread.length], minC, maxC)
      // Hitta tomma celler från munnens höjd och uppåt (hoppar över väggar/sand).
      let row = baseRow
      while (row >= 0 && grid[row * COLS + col] !== 0) row--
      if (row < 0) continue
      // ~9% guldkorn — sprider glittrande färgvariation i lasten.
      grid[row * COLS + col] = Math.random() < 0.09 ? GOLD : 1 + ((Math.random() * 3) | 0)
    }
  },

  // ETT sim-steg: nerifrån-upp; varje korn faller ner / ner-vänster / ner-höger.
  _simStep(ctx) {
    const grid = this.grid
    let moved = 0 // räkna rörliga korn → rassel-intensitet
    for (let row = ROWS - 2; row >= 0; row--) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col
        const v = grid[i]
        if (v < 1 || v > GOLD) continue // tom eller WALL (guldkorn faller som sand)
        const below = i + COLS
        if (grid[below] === 0) {
          grid[below] = v
          grid[i] = 0
          moved++
          continue
        }
        const d1 = Math.random() < 0.5 ? -1 : 1
        const d2 = -d1
        if (col + d1 >= 0 && col + d1 < COLS && grid[below + d1] === 0) {
          grid[below + d1] = v
          grid[i] = 0
          moved++
          continue
        }
        if (col + d2 >= 0 && col + d2 < COLS && grid[below + d2] === 0) {
          grid[below + d2] = v
          grid[i] = 0
          moved++
          continue
        }
        // annars vila
      }
    }
    this._moved += moved
    // Dränera nedersta raden (spill utanför flaket) — bara kul, aldrig straff.
    const base = (ROWS - 1) * COLS
    for (let col = 0; col < COLS; col++) {
      const v = grid[base + col]
      if (v >= 1 && v <= GOLD) {
        grid[base + col] = 0
        if (this._t - this._lastSpillFx > 0.25) {
          this._lastSpillFx = this._t
          const x = col * CELL + ZX + CELL / 2
          ctx.services.audio.sfx('soft')
          puff(ctx.fxLayer, x, 596, { count: 3, color: 0xd9b46f })
          floatText(ctx.fxLayer, x, 600, '😄', { fontSize: 46 })
        }
      }
    }
  },

  _renderSand() {
    const g = this._sandGfx
    if (!g || g.destroyed) return
    g.clear()
    const grid = this.grid
    for (let row = 0; row < ROWS; row++) {
      const ry = row * CELL + ZY
      const rb = row * COLS
      for (let col = 0; col < COLS; col++) {
        const v = grid[rb + col]
        if (v >= 1 && v <= GOLD) g.rect(col * CELL + ZX, ry, CELL, CELL).fill(SAND[v])
      }
    }
  },

  // Räkna vilande korn inne i flaket: totalt + de på/ovanför fyllnadslinjen.
  _countFill() {
    const grid = this.grid
    let total = 0
    let aboveLine = 0
    for (let col = this._leftCol + 1; col < this._rightCol; col++) {
      for (let row = 0; row < this._floorRow; row++) {
        const v = grid[row * COLS + col]
        if (v >= 1 && v <= GOLD) {
          total++
          if (row <= this._fillRow) aboveLine++
        }
      }
    }
    return { total, aboveLine }
  },

  // ---- Uppdatering --------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt

    // Stega sandsimuleringen (fast tidssteg).
    this._acc += ticker.deltaMS
    let steps = 0
    while (this._acc >= STEP_MS && steps < 4) {
      this._simStep(ctx)
      this._acc -= STEP_MS
      steps++
    }
    this._renderSand()
    this._drawBoom()

    // Kornigt sand-rassel medan korn rinner (intensitet ∝ antal rörliga korn).
    if (this._moved > 2 && this._t - this._lastHiss > 0.08) {
      this._lastHiss = this._t
      const intensity = clamp(this._moved / 30, 0.15, 1)
      ctx.services.audio.tone({ freq: 2200 + Math.random() * 900, dur: 0.05, type: 'sawtooth', vol: 0.05 * intensity })
    }
    this._moved = 0

    if (this._resolving) return

    // Full last?
    const { total, aboveLine } = this._countFill()
    const isFull = total >= this._target || aboveLine >= this._lineCells
    this._fullHold = isFull ? this._fullHold + dt : 0
    if (this._fullHold > 0.3) {
      this._onFull(ctx)
      return
    }

    // Idle-recue.
    if (!this._dragging) {
      this._idle += dt
      if (this._idle > IDLE_DELAY) {
        this._idle = 0
        this._reCue(ctx)
      }
      // Auto-hjälp (no-fail-garanti).
      this._helpT += dt
      if (this._tips >= HELP_TIPS || this._helpT > HELP_TIME) this._autoPour(ctx)
    }
  },

  _drawBoom() {
    const g = this._boom
    if (!g || g.destroyed || !this._bucket || this._bucket.destroyed) return
    g.clear()
    const bx = this._bucket.x
    const by = this._bucket.y - 22
    g.moveTo(PIVOT_X, PIVOT_Y).lineTo(bx, by).stroke({ width: 26, color: COLORS.brown, cap: 'round' })
    g.moveTo(PIVOT_X, PIVOT_Y).lineTo(bx, by).stroke({ width: 8, color: 0xb07a4f, cap: 'round', alpha: 0.9 })
    g.circle(PIVOT_X, PIVOT_Y, 16).fill(COLORS.orangeDark).stroke({ width: 4, color: COLORS.yellow })
  },

  _reCue(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    if (this._bucket && !this._bucket.destroyed) wiggle(this._bucket)
    floatText(ctx.fxLayer, 240, 360, '⬇️', { fontSize: 48 })
  },

  // Mjuk vindpust: extra sand sopas in i flaket + linjen sänks en aning → alltid full.
  _autoPour(ctx) {
    if (!this._alive || this._resolving) return
    this._tips = 0
    this._helpT = 0
    this._target = Math.max(40, this._target - 8)
    const cx = (this._cfg.leftX + this._cfg.rightX) / 2
    floatText(ctx.fxLayer, cx, 320, '💨', { fontSize: 60 })
    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('Gräv mer sand!')
    this._spawnGrains(cx, 300, 26)
  },

  _onFull(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    // Lastbilen guppar/tutar.
    const truck = this._truck
    if (truck && !truck.destroyed) {
      gsap.killTweensOf(truck)
      const ty = truck.y
      gsap.to(truck, {
        y: ty - 22,
        duration: 0.18,
        yoyo: true,
        repeat: 3,
        ease: 'power1.inOut',
        onComplete: () => {
          if (!truck.destroyed) truck.y = ty
        },
      })
    }
    // Riktig två-tons lastbils-tuta (ersätter TTS "tuut tuut").
    ctx.services.audio.tone({ freq: 320, dur: 0.3, type: 'square', vol: 0.22 })
    ctx.services.audio.tone({ freq: 250, dur: 0.45, type: 'square', vol: 0.22, delay: 0.28 })
    ctx.services.voice.say('Full last! Bra jobbat!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, (this._cfg.leftX + this._cfg.rightX) / 2, 360)

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('lastbilar', (ctx.progress.get().custom?.lastbilar || 0) + 1)
    ctx.progress.complete()

    this._loadCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._loadLevel(ctx, ++this._level)
    })
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._loadCall?.kill()

    if (this._bucket && !this._bucket.destroyed) {
      this._bucket.off('pointerdown', this._onDownH)
      this._bucket.off('globalpointermove', this._onMoveH)
      this._bucket.off('pointerup', this._onUpH)
      this._bucket.off('pointerupoutside', this._onUpH)
      gsap.killTweensOf(this._bucket)
      gsap.killTweensOf(this._bucket.scale)
    }
    if (this._tapCatcher && !this._tapCatcher.destroyed) this._tapCatcher.off('pointertap', this._onCatchH)
    if (this._truck && !this._truck.destroyed) gsap.killTweensOf(this._truck)
    if (this._pile && !this._pile.destroyed) {
      gsap.killTweensOf(this._pile)
      gsap.killTweensOf(this._pile.scale)
    }
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
