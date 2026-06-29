// Studsmatta — fysik-GAME (2–5 år). En glad kanin (🐰) studsar på en elastisk
// studsmatta. Nu med ett MÅL: uppe i skyn svävar morötter 🥕 och stjärnor ⭐ —
// studsa kaninen upp och FÅNGA allihop, så firas nivån och en ny (högre, fler,
// mer åt sidan) börjar. TVÅ kontroller utöver "tryck = studs":
//   1) DRA studsmattan i sidled för att flytta kaninens studs-pelare under ett mål
//      som sitter åt sidan (matter.js statisk kropp som följer med).
//   2) TRYCK för att LADDA en starkare studs — varje tryck fyller en kraftmätare
//      (timing/kraft); nästa landning studsar så högt som mätaren visar.
// INGET misslyckande: kaninen studsar oändligt vidare, missar är roliga, och en
// mjuk auto-hjälp (flytta mattan + full laddning, annars en garanterad glid) gör
// att varje mål ALLTID nås. matter.js sköter fysiken via lib/physics.js.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, nudge, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { floatText, sparkle, puff, burst, bigCelebration, pop } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const { Body } = Matter

// --- Geometri (designkoordinater 1280x720) ---
const BED_Y = 540 // mattans yta (övre kant)
const HALF_SPAN = 200 // halva mattans bredd
const FLOOR_Y = 678 // där benen står
const CHAR_R = 38 // kaninens fysik-radie
const BED_MIN_X = 330 // hur långt åt vänster mattan får dras
const BED_MAX_X = 950 // hur långt åt höger mattan får dras
const FLOOR_RESCUE_Y = 632 // föll kaninen bredvid mattan? mjuk räddnings-studs

// --- Fysik-trimning (matter.js-enheter; finjustera vid speltest) ---
const GRAVITY_Y = 1.2
const MIN_UP = 9 // minsta studs -> kaninen studsar alltid vidare (oändligt)
const MAX_UP = 22 // tak på uppåt-fart -> kaninen flyger ALDRIG ur skärmen, men når toppen
const CEIL_Y = 110 // mjukt tak: studsar tillbaka ned om kaninen ändå kommer för högt

// --- Laddning / kraftmätare ---
const CHARGE_BASE = 0.1 // grundstuds utan tryck (håller kaninen studsande)
const CHARGE_PER_TAP = 0.34 // hur mycket varje tryck fyller mätaren
const CHARGE_DECAY = 0.16 // hur snabbt mätaren sjunker tillbaka per sekund (timing-känsla)

// --- Insamling / mål ---
const COLLECT_R = 72 // generös fångst-radie (barnvänlig)

// --- Auto-hjälp (no-fail) ---
const ASSIST_DELAY = 7 // s utan fångst -> flytta mattan + ladda fullt åt barnet
const GLIDE_DELAY = 13 // s utan fångst -> garanterad glid-fångst
const IDLE_DELAY = 6 // s utan tryck -> tyst röst-recue

const RECUE = [
  'Dra mattan i sidled och tryck för en hög studs!',
  'Tryck så studsar kaninen högre!',
  'Fånga morötterna högt uppe!',
]
const CHEERS = ['Hopp!', 'Wii!', 'Högre!', 'Studs!']
const COLLECT_CHEERS = ['Mums!', 'En till!', 'Bra fångat!', 'Ja!']
const WIN_CHEERS = ['Du fångade alla! Hurra!', 'Allihop! Vad duktig du är!', 'Bravo! Alla fångade!']
const BOOST_FLOATS = ['🎵', '⭐', '🎶', '✨']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'studsmatta',
  titleSv: 'Studsmatta',
  icon: '🦘',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'studsmatta',
  voiceIntro: 'Studsa kaninen upp till morötterna och stjärnorna!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._sinceCollect = 0
    this._helpStage = 0
    this._lastLand = 0
    this._lastVoice = 0
    this._charge = CHARGE_BASE
    this._bedX = 640
    this._dragging = false
    this._gliding = false
    this._resolving = false
    this._collected = 0
    this._goals = []
    this._bedProxy = { dip: 0 }

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: glad äng med himmel/sol/moln/kullar (dekor, aldrig tryckbar).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Heltäckande, osynlig fångare BAKOM allt spel: tryck var som helst = ladda studs.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatcherTap = () => this._boost(ctx)
    this._catcher.on('pointertap', this._onCatcherTap)
    this._root.addChild(this._catcher)

    // Mål-lager (morötter/stjärnor som svävar) — eventMode none, fångas via avstånd.
    this._goalLayer = new Container()
    this._goalLayer.eventMode = 'none'
    this._goalLayer.interactiveChildren = false
    this._root.addChild(this._goalLayer)

    // Skugga under kaninen (krymper när den är hög).
    this._shadow = new Graphics().ellipse(0, 0, 58, 14).fill({ color: COLORS.shadow, alpha: 0.18 })
    this._shadow.position.set(this._bedX, BED_Y + 16)
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Studsmattans "rigg" (ram + ben + elastisk matt-linje), flyttbar i sidled.
    // Allt ritas centrerat kring lokal x=0; rig.x = mattans mitt.
    this._rig = new Container()
    this._rig.position.set(this._bedX, 0)
    this._frame = makeFrame()
    this._bed = new Graphics()
    this._bed.eventMode = 'none'
    this._rig.addChild(this._frame, this._bed)
    // Stor, förlåtande dra-träffyta över hela mattan (>=96px).
    this._rig.eventMode = 'static'
    this._rig.cursor = 'pointer'
    this._rig.hitArea = new Rectangle(-HALF_SPAN - 46, BED_Y - 64, (HALF_SPAN + 46) * 2, FLOOR_Y - BED_Y + 90)
    this._onRigDown = (e) => this._rigDown(ctx, e)
    this._onRigMove = (e) => this._rigMove(e)
    this._onRigUp = (e) => this._rigUp(ctx, e)
    this._rig.on('pointerdown', this._onRigDown)
    this._root.addChild(this._rig)
    this._drawBed(0)

    // Kaninen (emoji) kopplad till en fysik-kropp.
    this._charView = new Text({ text: '🐰', style: { fontFamily: FONT.body, fontSize: 74 } })
    this._charView.anchor.set(0.5)
    this._charView.eventMode = 'none'
    this._root.addChild(this._charView)

    // Kraftmätare (dekor) — visar hur laddad nästa studs är.
    this._buildMeter()

    // Fysik: golv + sidoväggar (mjukt tak hanteras manuellt i ticken).
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })

    // Mattans bädd = statisk kropp som flyttas med _bedX. Restitution 0 — studsen
    // styr vi själva i _land (vår setVelocity efter Matters lösare = full kontroll).
    this._bedBody = this._phys.rectangle(this._bedX, BED_Y + 22, HALF_SPAN * 2, 44, {
      isStatic: true,
      restitution: 0,
      friction: 0,
      label: 'bed',
    })

    this._char = this._phys.circle(this._bedX, BED_Y - 120, CHAR_R, {
      restitution: 0.9,
      friction: 0.001,
      frictionAir: 0.002,
      label: 'char',
    })
    this._phys.link(this._char, this._charView)

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Första nivån (från sparad progress -> oändlig variation).
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._spawnGoals(this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._say(ctx, this.voiceIntro, 0)
  },

  // ---- Tick: fysik + centrering + insamling + auto-hjälp + idle -------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    const char = this._char
    const dtSec = t.deltaMS / 1000

    // Mätaren sjunker mjukt tillbaka (timing: ladda strax före landning = högst).
    if (this._charge > CHARGE_BASE) {
      this._charge = Math.max(CHARGE_BASE, this._charge - CHARGE_DECAY * dtSec)
    }
    this._updateMeter()

    // Elastisk matta + skugga som krymper med höjden.
    this._drawBed(this._bedProxy.dip)
    const h = clamp((BED_Y - char.position.y) / 380, 0, 1)
    this._shadow.x = char.position.x
    this._shadow.scale.set(1 - h * 0.5, 1)
    this._shadow.alpha = 0.18 * (1 - h * 0.6)

    if (this._gliding) return // hjälp-glid styr kaninen helt

    // Mjukt tak: kommer kaninen ändå för högt, studsa lugnt tillbaka ned.
    if (char.position.y < CEIL_Y && char.velocity.y < 0) {
      nudge(char, char.velocity.x, Math.abs(char.velocity.y) * 0.35 + 1)
    }

    // Mjuk centrering mot mattans mitt (så att flytta mattan flyttar studs-pelaren).
    const dx = this._bedX - char.position.x
    if (Math.abs(dx) > 20) {
      let vx = char.velocity.x + dx * 0.012
      vx = clamp(vx, -8, 8)
      nudge(char, vx, char.velocity.y)
    }

    // Dämpa eventuellt snurr mjukt mot vila.
    if (Math.abs(char.angularVelocity) > 0.01) {
      Body.setAngularVelocity(char, char.angularVelocity * 0.95)
    }

    // Räddning: föll kaninen bredvid mattan (golvet)? mjuk studs tillbaka in.
    if (char.position.y > FLOOR_RESCUE_Y) {
      const now = performance.now()
      if (now - this._lastLand > 120) {
        this._lastLand = now
        nudge(char, (this._bedX - char.position.x) * 0.06, -(MIN_UP + 2))
        ctx.services.audio.sfx('soft')
      }
    }

    if (this._resolving) return

    // Fånga mål (vid kontakt).
    this._checkCollect(ctx)

    // Auto-hjälp så ett mål ALLTID nås (no-fail).
    this._sinceCollect += dtSec
    const remaining = this._goals.filter((g) => !g.got)
    if (remaining.length) {
      if (this._sinceCollect >= GLIDE_DELAY) {
        this._glideToGoal(ctx, this._nearestGoal(remaining))
      } else if (this._sinceCollect >= ASSIST_DELAY && this._helpStage < 1) {
        this._helpStage = 1
        this._assist(ctx, this._nearestGoal(remaining))
      }
    }

    // Tyst om-tilltal om barnet inte tryckt på ~6 s (kaninen studsar ändå vidare).
    this._idle += dtSec
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      this._say(ctx, randomFrom(RECUE), 0)
    }
  },

  // ---- Tryck = ladda studs (timing/kraft) -----------------------------------

  _boost(ctx) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._charge = Math.min(1, this._charge + CHARGE_PER_TAP)
    this._squash(this._charView, false)
    ctx.services.audio.sfx('pop')
    if (Math.random() < 0.4) {
      floatText(ctx.fxLayer, this._charView.x, this._charView.y - 64, randomFrom(BOOST_FLOATS))
    }
    if (Math.random() < 0.3) this._say(ctx, randomFrom(CHEERS), 1600)
  },

  // ---- Landning på mattan: studsa upp så högt som laddningen visar ----------

  _land(ctx) {
    if (!this._alive || this._gliding || this._resolving) return
    const now = performance.now()
    if (now - this._lastLand < 90) return // skydd mot dubbel-kollision
    this._lastLand = now

    const char = this._char
    const up = MIN_UP + this._charge * (MAX_UP - MIN_UP)
    const big = this._charge > 0.45
    // Lite av den vågräta farten bevaras + en mjuk dragning mot mattans mitt.
    let vx = char.velocity.x * 0.4 + (this._bedX - char.position.x) * 0.03
    vx = clamp(vx, -7, 7)
    nudge(char, vx, -up)
    this._charge = CHARGE_BASE // förbrukad

    this._dipBed()
    this._squash(this._charView, big)
    ctx.services.audio.sfx(big ? 'boing' : 'soft')

    if (big) {
      Body.setAngularVelocity(char, (Math.random() - 0.5) * 0.3)
      if (Math.random() < 0.45) {
        floatText(ctx.fxLayer, this._charView.x, this._charView.y - 64, randomFrom(BOOST_FLOATS))
      }
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive || this._gliding || this._resolving) return
    for (const pair of e.pairs) {
      const hitBed =
        (pair.bodyA === this._char && pair.bodyB === this._bedBody) ||
        (pair.bodyB === this._char && pair.bodyA === this._bedBody)
      if (hitBed) {
        this._land(ctx)
        break
      }
    }
  },

  // ---- Dra mattan i sidled (förlåtande drag, tap-fallback = ladda studs) -----

  _rigDown(ctx, e) {
    if (!this._alive || this._resolving || this._gliding) return
    this._idle = 0
    this._dragging = false
    this._dragStart = this._root.toLocal(e.global)
    this._dragOrigX = this._bedX
    ctx.services.audio.sfx('tap')
    this._rig.on('globalpointermove', this._onRigMove)
    this._rig.on('pointerup', this._onRigUp)
    this._rig.on('pointerupoutside', this._onRigUp)
  },

  _rigMove(e) {
    if (!this._alive) return
    const p = this._root.toLocal(e.global)
    const dx = p.x - this._dragStart.x
    if (!this._dragging && Math.abs(dx) > 14) this._dragging = true
    if (this._dragging) {
      this._setBedX(clamp(this._dragOrigX + dx, BED_MIN_X, BED_MAX_X))
    }
  },

  _rigUp(ctx, e) {
    this._detachRig()
    if (!this._dragging) {
      // Litet drag = tryck -> ladda studs (tap-fallback, även de minsta klarar det).
      this._boost(ctx)
    }
    this._dragging = false
  },

  _detachRig() {
    if (this._rig && !this._rig.destroyed) {
      this._rig.off('globalpointermove', this._onRigMove)
      this._rig.off('pointerup', this._onRigUp)
      this._rig.off('pointerupoutside', this._onRigUp)
    }
  },

  _setBedX(x) {
    this._bedX = x
    if (this._rig && !this._rig.destroyed) this._rig.x = x
    if (this._bedBody) Body.setPosition(this._bedBody, { x, y: BED_Y + 22 })
  },

  // ---- Mål: skapa, fånga, hjälpa --------------------------------------------

  _spawnGoals(level) {
    if (!this._alive) return
    this._clearGoals()
    this._collected = 0
    const n = clamp(2 + level, 2, 5)
    // Toppen sjunker (högre upp) med nivån; aldrig högre än kaninen säkert når.
    const top = Math.max(210, 460 - level * 55)
    const jit = level >= 4 ? () => (Math.random() * 50 - 25) : () => 0
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1)
      const x = clamp(380 + f * 520 + jit(), 360, 920)
      // Varannan högt (top), varannan mitt — tvingar barnet att variera kraften.
      const y = clamp((i % 2 === 0 ? top : Math.min(460, top + 150)) + jit(), 200, 470)
      const kind = Math.random() < 0.5 ? 'star' : 'carrot'
      this._addGoal(x, y, kind)
    }
  },

  _addGoal(x, y, kind) {
    const view = new Text({ text: kind === 'star' ? '⭐' : '🥕', style: { fontFamily: FONT.body, fontSize: 60 } })
    view.anchor.set(0.5)
    view.position.set(x, y)
    view.eventMode = 'none'
    this._goalLayer.addChild(view)
    // Lugn andning + mjuk gunga (drar blicken; exit-säkert via gsap-tween på view).
    const tween = gsap.to(view.scale, { x: 1.14, y: 1.14, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    const bob = gsap.to(view, { y: y - 10, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._goals.push({ x, y, kind, got: false, view, tween, bob })
  },

  _clearGoals() {
    for (const g of this._goals) {
      g.tween?.kill()
      g.bob?.kill()
      if (g.view && !g.view.destroyed) {
        gsap.killTweensOf(g.view)
        gsap.killTweensOf(g.view.scale)
        g.view.destroy()
      }
    }
    this._goals = []
  },

  _nearestGoal(list) {
    const c = this._char.position
    let best = list[0]
    let bestD = Infinity
    for (const g of list) {
      const d = (g.x - c.x) ** 2 + (g.y - c.y) ** 2
      if (d < bestD) {
        bestD = d
        best = g
      }
    }
    return best
  },

  _checkCollect(ctx) {
    const c = this._char.position
    for (const g of this._goals) {
      if (g.got) continue
      if (Math.hypot(g.x - c.x, g.view.y - c.y) < COLLECT_R) {
        this._collectGoal(ctx, g)
      }
    }
  },

  _collectGoal(ctx, g) {
    if (!this._alive || g.got) return
    g.got = true
    this._collected++
    this._sinceCollect = 0
    this._helpStage = 0

    sparkle(ctx.fxLayer, g.x, g.view.y, { count: 7 })
    puff(ctx.fxLayer, g.x, g.view.y, { count: 8, color: g.kind === 'star' ? COLORS.yellow : COLORS.orange })
    floatText(ctx.fxLayer, g.x, g.view.y - 24, g.kind === 'star' ? '⭐' : '🥕')
    ctx.services.audio.sfx(g.kind === 'star' ? 'magi' : 'pling')
    if (Math.random() < 0.6) this._say(ctx, randomFrom(COLLECT_CHEERS), 800)

    g.tween?.kill()
    g.bob?.kill()
    if (g.view && !g.view.destroyed) {
      gsap.killTweensOf(g.view)
      gsap.killTweensOf(g.view.scale)
      g.view.destroy()
    }

    if (this._goals.every((x) => x.got)) this._winLevel(ctx)
  },

  // Steg 1: flytta mattan under närmaste mål + ladda fullt åt barnet.
  _assist(ctx, g) {
    if (!this._alive || !g) return
    this._say(ctx, 'Jag hjälper till!', 600)
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, this._charView.x, this._charView.y, { count: 6 })
    const targetX = clamp(g.x, BED_MIN_X, BED_MAX_X)
    gsap.to(this, {
      _bedXAnim: 0,
      duration: 0.01,
      onStart: () => {},
    })
    // Mjuk glid av mattan mot målets x (uppdaterar fysik-kroppen via _setBedX).
    this._assistTween?.kill()
    const proxy = { x: this._bedX }
    this._assistTween = gsap.to(proxy, {
      x: targetX,
      duration: 0.7,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (this._alive) this._setBedX(clamp(proxy.x, BED_MIN_X, BED_MAX_X))
      },
    })
    this._charge = 1 // nästa studs blir full -> bågar upp till målet
  },

  // Steg 2: garanterad glid-fångst (kaninen glider till målet, fångar, fortsätter).
  _glideToGoal(ctx, g) {
    if (!this._alive || this._gliding || this._resolving || !g) return
    this._gliding = true
    const char = this._char
    Body.setStatic(char, true)
    nudge(char, 0, 0)
    this._assistTween?.kill()
    const from = { x: char.position.x, y: char.position.y }
    this._glideTween = gsap.to(from, {
      x: g.x,
      y: g.view.y,
      duration: 0.8,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (this._alive && this._char) Body.setPosition(this._char, { x: from.x, y: from.y })
      },
      onComplete: () => {
        if (!this._alive) return
        this._collectGoal(ctx, g)
        // Tillbaka ovanför mattan och fortsätt studsa.
        if (this._char) {
          Body.setStatic(this._char, false)
          Body.setPosition(this._char, { x: this._bedX, y: BED_Y - 130 })
          nudge(this._char, 0, -2)
        }
        this._gliding = false
        this._sinceCollect = 0
        this._helpStage = 0
      },
    })
  },

  // ---- Nivå klar: firande + ny (svårare) nivå -------------------------------

  _winLevel(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    this._say(ctx, randomFrom(WIN_CHEERS), 0)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, this._charView.x, this._charView.y, { count: 16 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete() // delat firande + beröm-röst + stjärna + klistermärke

    this._loadTimer = gsap.delayedCall(1.9, () => {
      if (!this._alive) return
      this._resolving = false
      this._sinceCollect = 0
      this._helpStage = 0
      this._charge = CHARGE_BASE
      this._setBedX(640)
      if (this._char) {
        Body.setStatic(this._char, false)
        Body.setPosition(this._char, { x: 640, y: BED_Y - 130 })
        nudge(this._char, 0, -MIN_UP)
      }
      this._spawnGoals(this._level)
      if (this._charView && !this._charView.destroyed) pop(this._charView)
    })
  },

  // ---- Kraftmätare (dekor) --------------------------------------------------

  _buildMeter() {
    this._meter = new Container()
    this._meter.position.set(1206, 470)
    this._meter.eventMode = 'none'
    const track = new Graphics()
      .roundRect(-22, -110, 44, 220, 22)
      .fill({ color: 0x000000, alpha: 0.12 })
      .stroke({ width: 4, color: COLORS.white, alpha: 0.7 })
    this._meterFill = new Graphics()
    const cap = new Text({ text: '⬆️', style: { fontFamily: FONT.body, fontSize: 34 } })
    cap.anchor.set(0.5)
    cap.y = -140
    this._meter.addChild(track, this._meterFill, cap)
    this._root.addChild(this._meter)
  },

  _updateMeter() {
    const g = this._meterFill
    if (!g || g.destroyed) return
    const c = clamp((this._charge - CHARGE_BASE) / (1 - CHARGE_BASE), 0, 1)
    const hgt = c * 200
    const color = c > 0.66 ? COLORS.orange : c > 0.33 ? COLORS.yellow : COLORS.teal
    g.clear()
    if (hgt > 1) g.roundRect(-15, 100 - hgt, 30, hgt, 14).fill(color)
  },

  // ---- Mattans ritning ------------------------------------------------------

  _drawBed(dip) {
    const g = this._bed
    if (!g || g.destroyed) return
    g.clear()
    g.moveTo(-HALF_SPAN, BED_Y)
      .quadraticCurveTo(0, BED_Y + dip, HALF_SPAN, BED_Y)
      .stroke({ width: 11, color: COLORS.teal, cap: 'round' })
    g.moveTo(-HALF_SPAN, BED_Y - 4)
      .quadraticCurveTo(0, BED_Y - 4 + dip, HALF_SPAN, BED_Y - 4)
      .stroke({ width: 3, color: COLORS.white, alpha: 0.5, cap: 'round' })
  },

  _dipBed() {
    if (!this._alive) return
    gsap.killTweensOf(this._bedProxy)
    gsap
      .timeline()
      .to(this._bedProxy, { dip: 30, duration: 0.07, ease: 'power2.out' })
      .to(this._bedProxy, { dip: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  },

  // Squash (platt) -> stretch (lång) -> tillbaka. Tweenar bara scale.
  _squash(view, big = false) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    const sq = big ? 0.58 : 0.74
    const st = big ? 1.3 : 1.16
    gsap
      .timeline()
      .to(view.scale, { x: 2 - sq, y: sq, duration: 0.07, ease: 'power2.out' })
      .to(view.scale, { x: 2 - st, y: st, duration: 0.12, ease: 'power1.out' })
      .to(view.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.2)' })
  },

  // Strypt röst-tilltal (undviker att prat staplas på varandra).
  _say(ctx, text, minGap = 1500) {
    const now = performance.now()
    if (now - this._lastVoice < minGap) return
    this._lastVoice = now
    ctx.services.voice.say(text)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._loadTimer?.kill()
    this._assistTween?.kill()
    this._glideTween?.kill()
    this._detachRig()
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatcherTap)
    if (this._rig && !this._rig.destroyed) this._rig.off('pointerdown', this._onRigDown)
    this._clearGoals()
    if (this._charView && !this._charView.destroyed) {
      gsap.killTweensOf(this._charView)
      gsap.killTweensOf(this._charView.scale)
    }
    gsap.killTweensOf(this._bedProxy)
    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- Ritning (programmatisk, inga tillgångar) ---

// Statisk ram: ben + ändknoppar som håller mattan (centrerad kring lokal x=0).
function makeFrame() {
  const g = new Graphics()
  g.eventMode = 'none'
  const lx = -HALF_SPAN
  const rx = HALF_SPAN
  // Ben (vinklade ut mot golvet).
  g.moveTo(lx, BED_Y).lineTo(lx - 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
  g.moveTo(rx, BED_Y).lineTo(rx + 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
  // Fötter.
  g.roundRect(lx - 70, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
  g.roundRect(rx + 26, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
  // Ändknoppar (mattans fästen).
  g.circle(lx, BED_Y, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
  g.circle(rx, BED_Y, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
  return g
}
