// Domino — bygg vägen till klockan (2–5 år). En rad domino-brickor leder från vänster
// fram till en KLOCKA 🔔 längst till höger. I raden finns LUCKOR — barnet DRAR (eller
// tap-tap) extra brickor från brickfacket ner i luckorna (förlåtande snäpp) för att bygga
// vägen HEL. Sedan TRYCKER barnet på FÖRSTA brickan: kedjan ramlar bricka för bricka.
// Vid en TOM lucka stannar raset där — inget misslyckande, bara "lägg en bricka till";
// när barnet lägger i brickan fortsätter raset av sig självt. Når raset ända fram ringer
// klockan -> firande + ny, längre bana. Mjuk auto-hjälp efter en stund fyller nästa lucka
// så banan ALLTID blir klar. Tryck utanför start ger bara en mjuk, lekfull gnista. Allt
// ritas programmatiskt (Pixi Graphics + system-emoji) — inga externa filer.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, burst, breathe, bigCelebration, floatText } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

const { Body } = Matter

const TILE_W = 26
const TILE_H = 96
const SPACING = 80 // satt så en fallande bricka träffar nästa vid ~35° — bär kedjan vidare
const FLOOR_Y = DESIGN_H - 40 // 680 — brickornas vilolinje / markens överkant
const TILE_Y = FLOOR_Y - TILE_H / 2 // brickans mittpunkt så underkanten vilar på golvet
const LAST_SLOT_X = 1040 // sista brickans x — strax till vänster om klockan
const BELL_X = 1168 // klockans x
const BELL_Y = 432 // klockans hängpunkt (svingar härifrån)
const PUSH_AV = 0.12 // liten knuff förbi tipppunkten -> gravitationen välter brickan
const STAND_ANGLE = 0.6 // |vinkel| under detta = brickan står fortfarande
const CASCADE_STEP = 0.12 // s mellan brickorna i kedjan
const SNAP_R = 135 // förlåtande snäpp-radie när en bricka släpps nära en lucka
const TRAY_Y = 150 // brickfackets rad (uppe)
const IDLE_DELAY = 6
const PUSH_WORDS = ['Putta!', 'Titta!', 'Oj!']
const PLACE_WORDS = ['Bra!', 'Fint!', 'Så där ja!']

export default {
  id: 'domino',
  titleSv: 'Domino',
  icon: '🧱',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'domino',
  voiceIntro: 'Lägg brickor i luckorna och putta den första — då ringer klockan!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._running = false // kedjan faller
    this._resetting = false // mellan firande och ny bana
    this._rung = false // klockan har ringt denna omgång
    this._helped = false // sa "jag hjälper till" denna omgång
    this._resolving = false // firande + complete() körs (EXAKT en gång per bana)
    this._stalledAt = null // index där raset stannade vid en tom lucka (väntar på bricka)
    this._waitingStart = false // vägen är hel, väntar på att barnet puttar
    this._lastHit = 0
    this._lastSay = 0
    this._slots = [] // { x, index, isGap, filled, tile:{view,body}|null, ghost }
    this._tiles = [] // alla aktiva brick-vyer med kropp { view, body }
    this._tray = [] // draggbara reservbrickor { view, home, placed }
    this._cascadeCalls = []
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // --- Bakgrund (marknadsmässig äng).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, ground: false }))

    // --- Fysik: golv + sidoväggar.
    this._phys = new PhysicsWorld({ gravityY: 1.5, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))
    // Egen statisk mark vars ÖVERKANT ligger på FLOOR_Y (brickorna vilar här).
    this._phys.rectangle(DESIGN_W / 2, FLOOR_Y + 130, DESIGN_W + 600, 260, {
      isStatic: true,
      friction: 0.9,
      restitution: 0,
    })

    // --- Dekorativ gräsremsa.
    const deco = new Graphics()
    deco.rect(0, FLOOR_Y, DESIGN_W, DESIGN_H - FLOOR_Y).fill(COLORS.green)
    deco.moveTo(0, FLOOR_Y).lineTo(DESIGN_W, FLOOR_Y).stroke({ width: 4, color: COLORS.greenDark })
    deco.eventMode = 'none'
    this._root.addChild(deco)

    // --- Lager (ordning: luckor under brickor, klocka, hjälpglöd, osynlig tryckyta,
    // brickfack överst så reservbrickorna fångar drag).
    this._ghostLayer = new Container()
    this._ghostLayer.eventMode = 'none'
    this._tilesLayer = new Container()
    this._tilesLayer.eventMode = 'none'
    this._tilesLayer.interactiveChildren = false
    this._root.addChild(this._ghostLayer, this._tilesLayer)

    // --- Klocka (mål) på en stolpe.
    this._buildBell()

    // --- Startglöd bakom första brickan (lockar tryck).
    this._startGlow = new Graphics().circle(0, 0, 64).fill({ color: COLORS.yellow, alpha: 0.32 })
    this._startGlow.eventMode = 'none'
    this._startGlow.visible = false
    this._root.addChild(this._startGlow)

    // --- Osynlig yta: tryck UTANFÖR start/brickfack -> ENBART en mjuk, positiv gnista.
    //     (Startar ALDRIG raset — det gör bara start-brickan här under.)
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatch = (ev) => this._onTap(ctx, ev)
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    // --- Tryckyta ENBART över start-brickan (stor träffhalo, >=96px) -> välter kedjan.
    //     Ligger ovanpå catchern så bara denna ruta startar raset; positioneras per nivå.
    this._startHit = new Graphics().rect(-72, -118, 144, 236).fill({ color: 0x000000, alpha: 0 })
    this._startHit.eventMode = 'none'
    this._startHit.cursor = 'pointer'
    this._onStart = () => this._onStartTap(ctx)
    this._startHit.on('pointertap', this._onStart)
    this._root.addChild(this._startHit)

    // --- Brickfack (överst) — reservbrickorna byggs per nivå.
    this._trayLayer = new Container()
    this._root.addChild(this._trayLayer)

    this._buildLevel(ctx, this._level)

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)
      // Medan raset rullar / firandet pågår: rör inte auto-hjälpen.
      if (this._running || this._resetting) {
        this._idle = 0
        return
      }
      this._idle += t.deltaMS / 1000
      if (this._idle > IDLE_DELAY) {
        this._idle = 0
        this._idleHelp(ctx)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Klocka -------------------------------------------------------------

  _buildBell() {
    this._bell = new Container()
    this._bell.position.set(BELL_X, BELL_Y)
    this._bell.eventMode = 'none'
    // Stolpe + arm (brun), bakom klockan, ner till marken.
    const post = new Graphics()
    post.roundRect(-10, 0, 20, FLOOR_Y - BELL_Y, 8).fill(COLORS.brown)
    post.roundRect(-70, -6, 80, 16, 8).fill(COLORS.brown) // arm åt vänster (mot raden)
    post.eventMode = 'none'
    // Själva klockan (emoji) — svingar runt sin topp.
    this._bellEmoji = new Text({ text: '🔔', style: { fontFamily: 'system-ui', fontSize: 96 } })
    this._bellEmoji.anchor.set(0.5, 0.08)
    this._bellEmoji.position.set(-44, 6)
    this._bell.addChild(post, this._bellEmoji)
    this._root.addChild(this._bell)
    // Lugn andning som lockar blicken mot målet.
    this._bellTween = breathe(this._bellEmoji, { scale: 1.08, duration: 1.1 })
  },

  // ---- Nivå-uppbyggnad ----------------------------------------------------

  _layoutFor(level) {
    const nSlots = Math.min(7 + level, 13)
    let nGaps = Math.min(1 + level, 4)
    nGaps = Math.min(nGaps, nSlots - 3)
    // Luckorna väljs jämnt spridda bland de inre brickorna (aldrig första/sista).
    const interior = []
    for (let i = 1; i <= nSlots - 2; i++) interior.push(i)
    const gapSet = new Set()
    const step = interior.length / nGaps
    for (let i = 0; i < nGaps; i++) {
      gapSet.add(interior[Math.min(interior.length - 1, Math.floor(i * step + step / 2))])
    }
    // Högre nivåer: bredda några luckor (intilliggande tom bricka) — "större glugg".
    if (level >= 5) {
      for (const g of [...gapSet]) {
        if (gapSet.size >= 6) break
        if (g + 1 <= nSlots - 2 && !gapSet.has(g + 1)) gapSet.add(g + 1)
      }
    }
    return { nSlots, gapSet }
  },

  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._clearLevel()
    this._running = false
    this._resetting = false
    this._rung = false
    this._resolving = false
    this._helped = false
    this._stalledAt = null
    this._waitingStart = false
    this._idle = 0

    const { nSlots, gapSet } = this._layoutFor(level)
    const startX = LAST_SLOT_X - (nSlots - 1) * SPACING

    // Slots vänster -> höger (index 0 = första, alltid en fast bricka att putta).
    for (let i = 0; i < nSlots; i++) {
      const x = startX + i * SPACING
      const isGap = gapSet.has(i)
      const slot = { x, index: i, isGap, filled: !isGap, tile: null, ghost: null }
      if (isGap) {
        // Spöke som visar var en bricka ska placeras.
        const ghost = makeGhost(TILE_W, TILE_H)
        ghost.position.set(x, TILE_Y)
        ghost.eventMode = 'none'
        this._ghostLayer.addChild(ghost)
        slot.ghost = ghost
        slot._ghostTween = breathe(ghost, { scale: 1.12, duration: 0.95 })
      } else {
        // Fast stående bricka.
        const color = PLAYFUL[i % PLAYFUL.length]
        const { view, body } = this._spawnTile(x, color)
        slot.tile = { view, body }
        this._tiles.push(slot.tile)
        view.scale.set(0)
        gsap.fromTo(view.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, delay: i * 0.03, ease: 'back.out(1.7)' })
      }
      this._slots.push(slot)
    }

    // Brickfack: en reservbricka per lucka, jämnt utlagda upptill.
    const gaps = [...gapSet]
    const trayN = gaps.length
    const trayStart = (DESIGN_W - (trayN - 1) * 120) / 2
    gaps.forEach((gi, k) => {
      const home = { x: trayStart + k * 120, y: TRAY_Y }
      const color = PLAYFUL[gi % PLAYFUL.length]
      this._makeTrayTile(ctx, home, color)
    })

    // Startglöd + tryckyta vid första brickan (placeras dit; aktiveras för tryck).
    const first = this._slots[0]
    this._startGlow.position.set(first.x, TILE_Y)
    this._startGlow.visible = true
    this._startGlowTween?.kill()
    this._startGlowTween = breathe(this._startGlow, { scale: 1.25, duration: 0.9 })
    if (this._startHit) {
      this._startHit.position.set(first.x, TILE_Y)
      this._startHit.eventMode = 'static'
    }
  },

  // Skapa en fysik-bricka (kropp + vy) som står på golvet.
  _spawnTile(x, color) {
    const view = makeTile(TILE_W, TILE_H, color)
    view.position.set(x, TILE_Y)
    this._tilesLayer.addChild(view)
    const body = this._phys.rectangle(x, TILE_Y, TILE_W, TILE_H, {
      friction: 0.4,
      restitution: 0.04,
      frictionAir: 0.003,
    })
    this._phys.link(body, view)
    return { view, body }
  },

  _makeTrayTile(ctx, home, color) {
    const view = makeTile(TILE_W, TILE_H, color)
    view.position.set(home.x, home.y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 80) // stor träffhalo
    const tile = { view, home, placed: false }
    view.scale.set(0)
    gsap.fromTo(view.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.7)' })
    const onDown = (e) => this._trayDown(ctx, tile, e)
    view.on('pointerdown', onDown)
    tile._onDown = onDown
    this._trayLayer.addChild(view)
    this._tray.push(tile)
  },

  _clearLevel() {
    this._killCascade()
    this._startGlowTween?.kill()
    this._startGlow.visible = false
    // Brickor (vyer + kroppar).
    for (const t of this._tiles) {
      if (t.body) this._phys.removeBody(t.body)
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
        t.view.destroy()
      }
    }
    this._tiles = []
    // Spöken.
    for (const s of this._slots) {
      s._ghostTween?.kill()
      if (s.ghost && !s.ghost.destroyed) {
        gsap.killTweensOf(s.ghost)
        gsap.killTweensOf(s.ghost.scale)
        s.ghost.destroy()
      }
    }
    this._slots = []
    // Brickfack.
    for (const t of this._tray) {
      if (t.view && !t.view.destroyed) {
        t.view.off('pointerdown', t._onDown)
        this._detachTray(t)
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
        t.view.destroy()
      }
    }
    this._tray = []
  },

  // ---- Brickfack: dra en bricka till en lucka -----------------------------

  _trayDown(ctx, tile, e) {
    if (!this._alive || tile.placed) return
    if (this._running || this._resetting) {
      // Kedjan rullar redan: mjuk lekfull respons istället för placering.
      ctx.services.audio.sfx('soft')
      wiggle(tile.view)
      return
    }
    this._idle = 0
    this._dragTile = tile
    const p = this._root.toLocal(e.global)
    this._dragOff = { x: tile.view.x - p.x, y: tile.view.y - p.y }
    this._trayLayer.addChild(tile.view) // till toppen
    gsap.killTweensOf(tile.view.scale)
    gsap.to(tile.view.scale, { x: 1.16, y: 1.16, duration: 0.12 })
    ctx.services.audio.sfx('tap')
    tile._onMove = (ev) => this._trayMove(ev)
    tile._onUp = (ev) => this._trayUp(ctx, tile, ev)
    tile.view.on('globalpointermove', tile._onMove)
    tile.view.on('pointerup', tile._onUp)
    tile.view.on('pointerupoutside', tile._onUp)
  },

  _trayMove(e) {
    const tile = this._dragTile
    if (!tile || tile.view.destroyed) return
    const p = this._root.toLocal(e.global)
    tile.view.position.set(p.x + this._dragOff.x, p.y + this._dragOff.y)
    // Lyft fram närmaste lediga lucka (lockande puls).
    const slot = this._nearestGap(tile.view.x, tile.view.y)
    for (const s of this._slots) {
      if (s.isGap && !s.filled && s.ghost && !s.ghost.destroyed) {
        s.ghost.alpha = s === slot ? 1 : 0.6
      }
    }
  },

  _trayUp(ctx, tile, e) {
    if (this._dragTile !== tile) return
    this._detachTray(tile)
    this._dragTile = null
    gsap.killTweensOf(tile.view.scale)
    gsap.to(tile.view.scale, { x: 1, y: 1, duration: 0.18 })
    const slot = this._nearestGap(tile.view.x, tile.view.y)
    if (slot && Math.hypot(tile.view.x - slot.x, tile.view.y - slot.y) < SNAP_R) {
      this._placeTile(ctx, tile, slot)
    } else {
      // Inte nära en lucka: glid snällt tillbaka till facket (aldrig fel).
      ctx.services.audio.sfx('soft')
      gsap.to(tile.view, { x: tile.home.x, y: tile.home.y, duration: 0.3, ease: 'power2.out' })
    }
  },

  _detachTray(tile) {
    if (tile.view && !tile.view.destroyed) {
      if (tile._onMove) tile.view.off('globalpointermove', tile._onMove)
      if (tile._onUp) {
        tile.view.off('pointerup', tile._onUp)
        tile.view.off('pointerupoutside', tile._onUp)
      }
    }
  },

  _nearestGap(x, y) {
    let best = null
    let bestD = Infinity
    for (const s of this._slots) {
      if (!s.isGap || s.filled) continue
      const d = Math.hypot(x - s.x, y - s.y)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    return best
  },

  // Placera en reservbricka i en lucka: snäpp på plats, ge den en kropp.
  _placeTile(ctx, tile, slot) {
    tile.placed = true
    slot.filled = true
    // Spöket bort.
    slot._ghostTween?.kill()
    if (slot.ghost && !slot.ghost.destroyed) {
      gsap.killTweensOf(slot.ghost.scale)
      slot.ghost.destroy()
      slot.ghost = null
    }
    // Bricka på plats, görs till fysik-bricka.
    tile.view.off('pointerdown', tile._onDown)
    tile.view.eventMode = 'none'
    tile.view.position.set(slot.x, TILE_Y)
    tile.view.rotation = 0
    this._tilesLayer.addChild(tile.view)
    const body = this._phys.rectangle(slot.x, TILE_Y, TILE_W, TILE_H, {
      friction: 0.4,
      restitution: 0.04,
      frictionAir: 0.003,
    })
    this._phys.link(body, tile.view)
    slot.tile = { view: tile.view, body }
    this._tiles.push(slot.tile)
    // Ta bort ur brickfacket.
    const ti = this._tray.indexOf(tile)
    if (ti >= 0) this._tray.splice(ti, 1)

    this._idle = 0
    ctx.services.audio.sfx('plopp')
    pop(tile.view, { scale: 1.18 })
    sparkle(ctx.fxLayer, slot.x, TILE_Y - 20, { count: 6 })
    const now = performance.now()
    if (now - this._lastSay > 1100) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(PLACE_WORDS))
    }
    // Fyllde vi just den lucka där raset stannade? Då fortsätter kedjan av sig själv.
    if (this._stalledAt === slot.index) {
      const from = this._stalledAt
      this._stalledAt = null
      this._waitingStart = false
      this._running = true
      ctx.services.voice.say('Och vidare!')
      const call = gsap.delayedCall(0.16, () => this._cascadeFrom(ctx, from))
      this._cascadeCalls.push(call)
      return
    }
    // Alla luckor fyllda? Vägen är hel.
    if (!this._slots.some((s) => s.isGap && !s.filled)) {
      this._waitingStart = false
      ctx.services.audio.sfx('pling')
      ctx.services.voice.say('Nu är vägen klar! Putta den första brickan.')
    }
  },

  // ---- Tryck utanför start: bara mjuk, positiv respons (startar ALDRIG raset) ----

  _onTap(ctx, ev) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(ev.global)
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
  },

  // ---- Tryck på START-brickan -> välter kedjan ---------------------------------

  _onStartTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (this._running || this._resetting) {
      ctx.services.audio.sfx('soft')
      return
    }
    this._startCascade(ctx)
  },

  _startCascade(ctx) {
    this._running = true
    this._resolving = false
    this._rung = false
    this._helped = false
    this._stalledAt = null
    this._waitingStart = false
    // Släck start-lockbete + stäng av start-tryckytan medan raset rullar.
    this._startGlowTween?.kill()
    this._startGlow.visible = false
    if (this._startHit) this._startHit.eventMode = 'none'
    ctx.services.audio.sfx('pop')
    const now = performance.now()
    if (now - this._lastSay > 1000) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(PUSH_WORDS))
    }
    this._cascadeFrom(ctx, 0)
  },

  // Raset vänster -> höger. Vid varje slot: putta brickan om den FINNS och fortsätt.
  // Vid en TOM lucka stannar raset där (no-fail) — barnet lägger i en bricka och då
  // fortsätter det av sig självt (se _placeTile). Når raset slutet ringer klockan.
  _cascadeFrom(ctx, index) {
    if (!this._alive || !this._running) return
    const slot = this._slots[index]
    if (!slot) return
    // Tom lucka bryter kedjan här — mjukt, "lägg en bricka till".
    if (slot.isGap && !slot.filled) {
      this._stallAtGap(ctx, slot)
      return
    }
    if (slot.tile && Math.abs(slot.tile.body.angle) < STAND_ANGLE) {
      Body.setAngularVelocity(slot.tile.body, PUSH_AV)
    }
    const next = index + 1
    if (next < this._slots.length) {
      const call = gsap.delayedCall(CASCADE_STEP, () => this._cascadeFrom(ctx, next))
      this._cascadeCalls.push(call)
    } else {
      // Sista brickan puttad -> klockan ringer strax.
      const call = gsap.delayedCall(0.32, () => this._ringBell(ctx))
      this._cascadeCalls.push(call)
    }
  },

  // En tom lucka stoppade raset: ingen bestraffning — bara en vänlig "lägg en till".
  // Raset pausar (running=false); idle-hjälpen (eller barnet) fyller luckan och då
  // återupptas det automatiskt i _placeTile.
  _stallAtGap(ctx, slot) {
    if (!this._alive) return
    this._running = false
    this._stalledAt = slot.index
    this._idle = 0 // räkna mot mjuk auto-hjälp
    ctx.services.audio.sfx('soft')
    if (slot.ghost && !slot.ghost.destroyed) pop(slot.ghost, { scale: 1.22 })
    sparkle(ctx.fxLayer, slot.x, TILE_Y - 10, { count: 6 })
    floatText(ctx.fxLayer, slot.x, TILE_Y - 64, '⬇️', { fontSize: 44 })
    const now = performance.now()
    if (now - this._lastSay > 1100) {
      this._lastSay = now
      ctx.services.voice.say('Lägg en bricka till!')
    }
    this._pulseHints()
  },

  _killCascade() {
    this._cascadeCalls?.forEach((c) => c.kill())
    this._cascadeCalls = []
  },

  // ---- Klockan ringer: mål nått -------------------------------------------

  _ringBell(ctx) {
    if (!this._alive || this._resolving || this._rung) return
    this._resolving = true // firande + complete() körs nu, exakt en gång
    this._rung = true
    this._killCascade()

    ctx.services.audio.sfx('pling')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Klockan ringer! Pling!')

    // Klockan svingar (runt sin topp).
    if (this._bellEmoji && !this._bellEmoji.destroyed) {
      this._bellTween?.kill()
      gsap.killTweensOf(this._bellEmoji)
      const r0 = this._bellEmoji.rotation
      gsap.timeline({ onComplete: () => { if (!this._bellEmoji?.destroyed) this._bellEmoji.rotation = r0 } })
        .to(this._bellEmoji, { rotation: 0.4, duration: 0.12 })
        .to(this._bellEmoji, { rotation: -0.34, duration: 0.16 })
        .to(this._bellEmoji, { rotation: 0.24, duration: 0.16 })
        .to(this._bellEmoji, { rotation: -0.14, duration: 0.16 })
        .to(this._bellEmoji, { rotation: 0, duration: 0.16 })
    }
    sparkle(ctx.fxLayer, BELL_X, BELL_Y + 40, { count: 10 })
    burst(ctx.fxLayer, BELL_X, BELL_Y + 40, { count: 14 })
    floatText(ctx.fxLayer, BELL_X, BELL_Y - 30, '🔔', { fontSize: 64 })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Förlopp: höj nivå + delat firande (stjärna + klistermärke).
    const next = this._level + 1
    ctx.progress.setLevel(next)
    ctx.progress.complete()

    this._resetting = true
    this._resetCall = gsap.delayedCall(2.4, () => {
      if (!this._alive) return
      this._level = next
      ctx.services.audio.sfx('whoosh')
      this._buildLevel(ctx, this._level)
    })
  },

  // Lockande puls vid idle: andas första brickan + reservbrickorna.
  _pulseHints() {
    const first = this._slots[0]
    if (first?.tile?.view && !first.tile.view.destroyed) pop(first.tile.view)
    for (const t of this._tray) {
      if (!t.placed && t.view && !t.view.destroyed) pop(t.view)
    }
  },

  // ---- Mjuk auto-hjälp (no-fail): banan blir ALLTID klar -----------------------
  // Finns en tom lucka kvar -> fyll nästa (en bricka flyger dit). Är vägen redan hel
  // -> påminn om att putta, och om barnet ändå väntar: putta åt det. Inget kan fastna.
  _idleHelp(ctx) {
    if (!this._alive || this._running || this._resetting) return
    const gap = this._firstUnfilledGap()
    if (gap) {
      ctx.services.voice.say('Jag hjälper till!')
      this._autoFillGap(ctx, gap)
      return
    }
    // Vägen är hel.
    if (this._waitingStart) {
      this._waitingStart = false
      this._startCascade(ctx) // garanterar att en passiv lekare också når klockan
    } else {
      this._waitingStart = true
      ctx.services.voice.say('Putta den första brickan!')
      this._pulseHints()
    }
  },

  _firstUnfilledGap() {
    return this._slots.find((s) => s.isGap && !s.filled) || null
  },

  // Flyg en reservbricka mjukt ner i luckan och placera den (samma väg som drag).
  // Fyller det den lucka som stoppade raset fortsätter kedjan automatiskt (_placeTile).
  _autoFillGap(ctx, slot) {
    const tile = this._tray.find((t) => !t.placed && !t._auto)
    if (!tile || tile.view.destroyed) return
    tile._auto = true
    this._detachTray(tile) // ev. pågående drag-lyssnare bort
    tile.view.eventMode = 'none'
    gsap.killTweensOf(tile.view)
    gsap.killTweensOf(tile.view.scale)
    sparkle(ctx.fxLayer, tile.view.x, tile.view.y, { count: 5 })
    gsap.to(tile.view, {
      x: slot.x,
      y: TILE_Y,
      rotation: 0,
      duration: 0.55,
      ease: 'power2.inOut',
      onComplete: () => {
        if (this._alive && !tile.view.destroyed && !slot.filled) this._placeTile(ctx, tile, slot)
      },
    })
  },

  // Mjuk "klack" när en bricka slår i nästa (strypt mot ljud-spam).
  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastHit < 55) return
    for (const pair of e.pairs) {
      const speed = pair.bodyA.speed + pair.bodyB.speed
      if (speed > 1.6) {
        this._lastHit = now
        ctx.services.audio.sfx('tap')
        break
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._resetCall?.kill()
    this._startGlowTween?.kill()
    this._bellTween?.kill()
    this._killCascade()
    this._dragTile = null
    // Brickor / spöken / brickfack.
    this._clearLevel()
    if (this._bellEmoji && !this._bellEmoji.destroyed) gsap.killTweensOf(this._bellEmoji)
    if (this._startGlow && !this._startGlow.destroyed) gsap.killTweensOf(this._startGlow.scale)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatch)
    if (this._startHit && !this._startHit.destroyed) this._startHit.off('pointertap', this._onStart)
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Domino-bricka: avrundad rektangel i glad färg, mittlinje + två vita prickar.
// Ritad runt origo (0,0) = kroppens mitt.
function makeTile(w, h, color) {
  const g = new Graphics()
  const edge = shade(color, 0.22)
  g.roundRect(-w / 2, -h / 2, w, h, 7).fill(color).stroke({ width: 3, color: edge })
  g.moveTo(-w / 2 + 3, 0).lineTo(w / 2 - 3, 0).stroke({ width: 2, color: edge, alpha: 0.7 })
  g.circle(0, -h * 0.24, 4).fill({ color: COLORS.white })
  g.circle(0, h * 0.24, 4).fill({ color: COLORS.white })
  return g
}

// Spök-bricka: visar var en bricka ska placeras (genomskinlig, streckad känsla).
function makeGhost(w, h) {
  const g = new Graphics()
  g.roundRect(-w / 2, -h / 2, w, h, 7).fill({ color: COLORS.white, alpha: 0.14 }).stroke({ width: 3, color: COLORS.white, alpha: 0.7 })
  // Liten nedåtpil som säger "lägg här".
  g.moveTo(-9, -h / 2 - 22).lineTo(9, -h / 2 - 22).lineTo(0, -h / 2 - 8).closePath().fill({ color: COLORS.white, alpha: 0.8 })
  return g
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
