// Vippbrädan — KATAPULT-lek (3–5 år). En groda 🐸 sitter på vippbrädans ena ände.
// Barnet väljer en VIKT (liten/mellan/stor) och TRYCKER för att släppa den på den
// andra änden — brädan vippar (riktig matter.js-revolut) och katapulterar grodan i
// en båge upp mot en KORG. Landar grodan i korgen => firande + nästa nivå (korgen
// flyttas längre bort/högre). Vald vikt ändrar utfallet: större vikt = mer fart =
// högre/längre skjuts (massa via MATERIALS, momentum). INGET game-over: missar
// landar roligt (puff + vingel + mjukt ljud), och efter ett par missar hjälper en
// snäll auto-båge grodan tryggt i korgen. Allt ritas programmatiskt (Pixi Graphics
// + emoji) och städas exit-säkert.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Matter } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration, puff, sparkle, floatText, pop, wiggle } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const { Constraint, Composite, Body } = Matter

const PLANK_W = 460
const PLANK_H = 26
const PLANK_HALF = PLANK_W / 2
const CX = 640
const PIVOT_Y = 560
const FROG_R = 34
const G_PREVIEW = 1.2 // matter-gravitation (px/steg²) som katapultbågen räknas mot
const FLIGHT_STEPS = 40 // ungefärlig flygtid i fysiksteg (snabb, läsbar båge)
const FLOOR_Y = 700

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const IDLE_CUES = [
  'Välj en vikt och tryck för att släppa den!',
  'Hjälp grodan att hoppa i korgen!',
  'Tryck så vippar brädan och grodan flyger!',
]
const LAND_PRAISE = ['Hurra! Grodan landade i korgen!', 'Grodan i korgen! Bravo!', 'Pang i korgen! Vad duktig du är!']
const MISS_SAY = ['Hoppsan! Försök igen!', 'Nästan! En gång till!', 'Oj, prova en annan vikt!']
const LAUNCH_SAY = ['Hoppla!', 'Boing!', 'Iväg!']

export default {
  id: 'vippbradan',
  titleSv: 'Vippbrädan',
  icon: '⚖️',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vippbradan',
  voiceIntro: 'Släpp en vikt så att grodan flyger upp i korgen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._busy = false // mellan släpp och återställning -> blockera nya släpp
    this._launched = false
    this._resolving = false
    this._misses = 0
    this._assistNext = false
    this._lastHit = 0
    this._frogBody = null
    this._weight = null // { body, view }
    this._timers = []

    // Viktstorlekar -> massa/täthet via MATERIALS. Större vikt = mer momentum =
    // kraftigare skjuts (utfallet beror på barnets val).
    this._sizes = [
      { key: 'liten', label: 'Liten', r: 26, mat: MATERIALS.light, factor: 0.9 },
      { key: 'mellan', label: 'Mellan', r: 38, mat: MATERIALS.normal, factor: 1.0 },
      { key: 'stor', label: 'Stor', r: 52, mat: MATERIALS.heavy, factor: 1.14 },
    ]
    this._sizeIdx = 1

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: golv + sidoväggar så vikten lägger sig till ro och grodan stannar i bild.
    this._phys = new PhysicsWorld({ gravityY: G_PREVIEW, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildScene(ctx)
    this._buildSeesaw(ctx)
    this._buildUI(ctx)

    this._loadLevel(ctx, this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen ----------------------------------------------------------------

  _buildScene(ctx) {
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, ground: false }))

    // Mark + triangel-stöd (dekorativt; brädan hålls av constrainten).
    const deco = new Graphics()
    deco.rect(0, FLOOR_Y, ctx.width, ctx.height - FLOOR_Y).fill(COLORS.green)
    deco.rect(0, FLOOR_Y, ctx.width, 10).fill({ color: COLORS.greenDark, alpha: 0.5 })
    deco.moveTo(CX - 80, FLOOR_Y)
    deco.lineTo(CX + 80, FLOOR_Y)
    deco.lineTo(CX, PIVOT_Y + 18)
    deco.closePath()
    deco.fill(COLORS.orange).stroke({ width: 4, color: COLORS.orangeDark })
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    this._root.addChild(deco)

    // Heltäckande tryckyta (tap var som helst = släpp vikt på höger ände).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onTap = () => this._dropWeight(ctx)
    this._catcher.on('pointertap', this._onTap)
    this._root.addChild(this._catcher)

    // Korg/mål (flyttas per nivå).
    this._target = { x: 980, y: 440, r: 95, sensor: null, rimL: null, rimR: null }
    this._basket = new Container()
    this._basket.eventMode = 'none'
    this._basketGlow = new Graphics()
    this._basket.addChild(this._basketGlow)
    this._basket.addChild(makeBasket())
    this._root.addChild(this._basket)
  },

  _buildSeesaw(ctx) {
    // Plankan: matter-rektangel fastnålad i CENTRUM med en revolut-constraint.
    this._plankBody = this._phys.rectangle(CX, PIVOT_Y, PLANK_W, PLANK_H, {
      density: 0.0012,
      frictionAir: 0.02,
      friction: 0.6,
      restitution: 0.05,
      label: 'plank',
    })
    this._constraint = Constraint.create({
      pointA: { x: CX, y: PIVOT_Y },
      bodyB: this._plankBody,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1,
    })
    Composite.add(this._phys.world, this._constraint)

    this._plankView = makePlank()
    this._plankView.eventMode = 'none'
    this._plankView.interactiveChildren = false
    this._root.addChild(this._plankView)
    this._phys.link(this._plankBody, this._plankView)

    // Lager för vikt (under grodan).
    this._weightLayer = new Container()
    this._weightLayer.eventMode = 'none'
    this._weightLayer.interactiveChildren = false
    this._root.addChild(this._weightLayer)

    // Grodan (persistent vy; "rider" på vänster ände tills den skjuts iväg).
    this._frog = makeFrog()
    this._frog.eventMode = 'none'
    this._root.addChild(this._frog)

    // Släpp-ledtråd (pulsande pil över höger ände).
    this._hint = new Container()
    const disc = new Graphics().circle(0, 0, 40).fill({ color: COLORS.white, alpha: 0.3 })
    const arrow = new Text({ text: '👇', style: { fontFamily: FONT.body, fontSize: 46 } })
    arrow.anchor.set(0.5)
    this._hint.addChild(disc, arrow)
    this._hint.position.set(CX + 200, 150)
    this._hint.eventMode = 'none'
    this._hint.interactiveChildren = false
    this._root.addChild(this._hint)
    this._hintTween = gsap.to(this._hint, { y: 180, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _buildUI(ctx) {
    // Storleksknappar (nere i mitten) — väljer vikt-massa.
    this._sizeButtons = []
    this._sizeRing = new Graphics()
    this._sizeRing.eventMode = 'none'
    this._root.addChild(this._sizeRing)
    const bx = [430, 600, 780]
    const bw = [140, 150, 168]
    this._sizes.forEach((s, i) => {
      const b = new Button({
        icon: '🪨',
        label: s.label,
        width: bw[i],
        height: 96,
        color: COLORS.brown,
        stacked: true,
        services: ctx.services,
        sound: 'tap',
        onTap: () => this._selectSize(ctx, i),
      })
      b.position.set(bx[i], 668)
      this._sizeButtons.push(b)
      this._root.addChild(b)
    })
    this._updateSizeRing()
  },

  // ---- Nivå ----------------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._misses = 0
    this._assistNext = false

    // Korgen längre bort + högre för varje nivå (men aldrig orimligt).
    const tx = clamp(940 + level * 38, 940, 1180)
    const ty = clamp(450 - level * 14, 320, 450)
    const r = clamp(100 - level * 4, 72, 100)
    this._setTarget(ctx, tx, ty, r)

    this._resetSeesaw(ctx)
  },

  _setTarget(ctx, x, y, r) {
    this._target.x = x
    this._target.y = y
    this._target.r = r
    this._basket.position.set(x, y)
    this._basketGlow.clear().circle(0, 0, r).stroke({ width: 6, color: COLORS.yellow, alpha: 0.55 })

    // Fysik-kroppar: sensor i korgöppningen + två studskanter.
    const t = this._target
    if (t.sensor) this._phys.removeBody(t.sensor)
    if (t.rimL) this._phys.removeBody(t.rimL)
    if (t.rimR) this._phys.removeBody(t.rimR)
    t.sensor = this._phys.rectangle(x, y + 6, 96, 40, { isStatic: true, isSensor: true, label: 'basket' })
    t.rimL = this._phys.circle(x - 64, y - 6, 12, { isStatic: true, restitution: 0.5, label: 'rim' })
    t.rimR = this._phys.circle(x + 64, y - 6, 12, { isStatic: true, restitution: 0.5, label: 'rim' })

    this._basketTween?.kill()
    this._basket.scale.set(1)
    this._basketTween = gsap.to(this._basketGlow.scale, { x: 1.12, y: 1.12, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Återställ brädan jämn, ta bort vikten och sätt grodan redo på vänster ände.
  _resetSeesaw(ctx) {
    if (!this._alive) return
    this._busy = false
    this._launched = false
    this._resolving = false
    this._idle = 0

    // Ta bort grodkropp + viktkropp.
    if (this._frogBody) {
      this._phys.removeBody(this._frogBody)
      this._frogBody = null
    }
    this._removeWeight()

    // Plankan jämn igen.
    Body.setAngle(this._plankBody, 0)
    Body.setAngularVelocity(this._plankBody, 0)
    Body.setVelocity(this._plankBody, { x: 0, y: 0 })

    // Grodan tillbaka på vänster tipp, upprätt och hel.
    gsap.killTweensOf(this._frog)
    gsap.killTweensOf(this._frog.scale)
    this._frog.scale.set(1)
    this._frog.alpha = 1
    this._frog.rotation = 0
    this._frogBreathe?.kill()
    this._positionFrogOnPlank()
    if (!this._frog.destroyed) {
      pop(this._frog)
      this._frogBreathe = gsap.to(this._frog.scale, { x: 1.06, y: 0.94, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }
  },

  // Sätt grodvyn på vänster planktipp (följer plankans vinkel medan den rider).
  _positionFrogOnPlank() {
    const a = this._plankBody.angle
    const tipX = CX + -PLANK_HALF * Math.cos(a)
    const tipY = PIVOT_Y + -PLANK_HALF * Math.sin(a)
    this._frog.position.set(tipX, tipY - (PLANK_H / 2 + FROG_R * 0.72))
  },

  // ---- Kontroller ----------------------------------------------------------

  _selectSize(ctx, i) {
    this._sizeIdx = i
    this._idle = 0
    this._updateSizeRing()
    pop(this._sizeButtons[i])
    sparkle(ctx.fxLayer, this._sizeButtons[i].x, this._sizeButtons[i].y - 30, { count: 5 })
    ctx.services.voice.say(`${this._sizes[i].label} vikt!`)
  },

  _updateSizeRing() {
    const b = this._sizeButtons?.[this._sizeIdx]
    if (!b || !this._sizeRing || this._sizeRing.destroyed) return
    const hw = b.width / 2 + 6
    this._sizeRing.clear().roundRect(b.x - hw, b.y - 60, hw * 2, 120, 26).stroke({ width: 8, color: COLORS.yellow })
  },

  // Tap var som helst -> släpp vald vikt på höger ände (katapult-änden).
  _dropWeight(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (this._busy) {
      // Redan i gång: snällt svar, aldrig en bestraffning.
      ctx.services.audio.sfx('soft')
      if (!this._frog.destroyed) wiggle(this._frog)
      return
    }
    this._busy = true
    this._misses = this._misses // (no-op, behåller per-nivå-räknare)

    const size = this._sizes[this._sizeIdx]
    const x = CX + 190 + (Math.random() * 30 - 15)
    const y = 60
    const view = makeWeight(size.r)
    view.position.set(x, y)
    this._weightLayer.addChild(view)
    view.scale.set(0.3)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.24, ease: 'back.out(2)' })

    const body = this._phys.circle(x, y, size.r, { ...size.mat, label: 'weight' })
    this._phys.link(body, view)
    this._weight = { body, view }

    ctx.services.audio.sfx('pop')

    // Säkerhet: om kollisionen mot brädan av någon anledning missas, skjut ändå.
    this._launchWatchdog = this._addTimer(1.5, () => {
      if (this._alive && this._busy && !this._launched) this._launchFrog(ctx)
    })
  },

  // ---- Kollisioner ---------------------------------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    for (const pair of e.pairs) {
      const a = pair.bodyA.label
      const b = pair.bodyB.label

      // Vikten landar på brädan -> katapultera grodan (efter en liten stund så man
      // hinner se brädan börja vippa).
      if (!this._launched && this._busy && this._weight && (a === 'weight' || b === 'weight') && (a === 'plank' || b === 'plank')) {
        if (now - this._lastHit > 80) {
          this._lastHit = now
          ctx.services.audio.sfx('plopp')
        }
        if (!this._launchPending) {
          this._launchPending = true
          this._addTimer(0.16, () => {
            this._launchPending = false
            if (this._alive && this._busy && !this._launched) this._launchFrog(ctx)
          })
        }
        continue
      }

      // Grodan i korgen!
      if (this._launched && this._frogBody) {
        const fb = this._frogBody
        const involvesFrog = pair.bodyA === fb || pair.bodyB === fb
        if (involvesFrog) {
          const other = pair.bodyA === fb ? pair.bodyB : pair.bodyA
          if (other.label === 'basket') {
            this._land(ctx)
            return
          }
          if (other.label === 'rim' && now - this._lastHit > 120) {
            this._lastHit = now
            ctx.services.audio.sfx('pop')
          }
        }
      }
    }
  },

  // ---- Skjuts (katapult) ---------------------------------------------------

  _launchFrog(ctx) {
    if (!this._alive || this._launched) return
    this._launched = true
    this._launchWatchdog?.kill()
    this._frogBreathe?.kill()

    const size = this._sizes[this._sizeIdx]
    const fx = this._frog.x
    const fy = this._frog.y
    const tx = this._target.x
    const ty = this._target.y - 30 // sikta strax ovanför korgöppningen

    // Hjälp efter ett par missar: garanterad mjuk båge rakt i korgen.
    if (this._assistNext) {
      this._assistNext = false
      this._assistArc(ctx, fx, fy)
      return
    }

    // Ballistisk hastighet (px/steg) mot korgen, skalad av vald massa (momentum).
    const N = FLIGHT_STEPS
    const boost = 1.08 // kompenserar lätt luftmotstånd så bågen når fram
    let vx = ((tx - fx) / N) * boost * size.factor
    let vy = ((ty - fy) / N - 0.5 * G_PREVIEW * N) * boost * size.factor

    const body = this._phys.circle(fx, fy, FROG_R, { restitution: 0.35, friction: 0.3, frictionAir: 0.001, density: 0.001, label: 'frog' })
    Body.setVelocity(body, { x: vx, y: vy })
    this._phys.link(body, this._frog, () => {
      // Grodan snurrar lite glatt medan den flyger.
    })
    this._frogBody = body

    ctx.services.audio.sfx('boing')
    if (Math.random() < 0.6) ctx.services.voice.say(randomFrom(LAUNCH_SAY))
    sparkle(ctx.fxLayer, fx, fy, { count: 6 })
  },

  // Snäll auto-båge (no-fail backstop) — grodan glider tryggt i korgen.
  _assistArc(ctx, fx, fy) {
    ctx.services.voice.say('Titta, jag hjälper grodan!')
    ctx.services.audio.sfx('boing')
    const tx = this._target.x
    const ty = this._target.y
    const arc = 230
    const st = { t: 0 }
    this._assistTween = gsap.to(st, {
      t: 1,
      duration: 0.9,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._frog || this._frog.destroyed) {
          this._assistTween?.kill()
          return
        }
        const t = st.t
        this._frog.x = fx + (tx - fx) * t
        this._frog.y = fy + (ty - fy) * t - Math.sin(Math.PI * t) * arc
        this._frog.rotation += 0.18
      },
      onComplete: () => {
        if (this._alive) this._land(ctx)
      },
    })
  },

  // ---- Landning (lyckat) ---------------------------------------------------

  _land(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._launched = true
    this._launchWatchdog?.kill()
    this._assistTween?.kill()

    const tx = this._target.x
    const ty = this._target.y

    if (this._frogBody) {
      this._phys.removeBody(this._frogBody)
      this._frogBody = null
    }
    this._removeWeight()

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(LAND_PRAISE))

    // Grodan plumsar ner i korgen och krymper lite.
    if (this._frog && !this._frog.destroyed) {
      gsap.killTweensOf(this._frog)
      gsap.killTweensOf(this._frog.scale)
      gsap.to(this._frog, { x: tx, y: ty + 10, rotation: 0, duration: 0.25, ease: 'power2.in' })
      gsap.to(this._frog.scale, { x: 0.55, y: 0.55, duration: 0.32, ease: 'power2.in' })
    }
    if (!this._basket.destroyed) pop(this._basket, { scale: 1.1 })

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    puff(ctx.fxLayer, tx, ty, { count: 14, color: COLORS.yellow })
    sparkle(ctx.fxLayer, tx, ty, { count: 8 })
    floatText(ctx.fxLayer, tx, ty - 60, '🐸', { fontSize: 56 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('landningar', (ctx.progress.get().custom?.landningar || 0) + 1)
    ctx.progress.complete()

    this._addTimer(1.7, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Miss (alltid roligt, aldrig straff) ---------------------------------

  _miss(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._launchWatchdog?.kill()

    let lx = this._frog?.x ?? CX
    let ly = this._frog?.y ?? FLOOR_Y
    if (this._frogBody) {
      lx = this._frogBody.position.x
      ly = this._frogBody.position.y
      this._phys.removeBody(this._frogBody)
      this._frogBody = null
    }

    ctx.services.audio.sfx('soft')
    if (this._frog && !this._frog.destroyed) {
      gsap.killTweensOf(this._frog)
      gsap.killTweensOf(this._frog.scale)
      wiggle(this._frog)
    }
    puff(ctx.fxLayer, lx, Math.min(ly, FLOOR_Y), { count: 8, color: COLORS.green })
    floatText(ctx.fxLayer, lx, ly - 30, randomFrom(['Hihi!', 'Hoppsan!', 'Plums!']), { fontSize: 44 })

    this._misses++
    if (this._misses >= 2) {
      this._assistNext = true
      ctx.services.voice.say('Nästa gång hjälper jag dig!')
    } else if (Math.random() < 0.6) {
      ctx.services.voice.say(randomFrom(MISS_SAY))
    }

    this._addTimer(0.8, () => {
      if (this._alive) this._resetSeesaw(ctx)
    })
  },

  _removeWeight() {
    const w = this._weight
    this._weight = null
    if (!w) return
    if (w.body) this._phys.removeBody(w.body)
    const v = w.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, {
      x: 0,
      y: 0,
      duration: 0.28,
      ease: 'back.in(1.8)',
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
  },

  // ---- Ticker --------------------------------------------------------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    this._tame()
    this._idle += t.deltaMS / 1000

    if (!this._launched && !this._resolving) {
      // Grodan rider på vänster planktipp tills den skjuts iväg.
      this._positionFrogOnPlank()
    } else if (this._launched && this._frogBody && !this._resolving) {
      const fb = this._frogBody
      const dx = fb.position.x - this._target.x
      const dy = fb.position.y - this._target.y
      const near = Math.hypot(dx, dy) < this._target.r
      // "Magnetisk" korg: nedåtgående groda nära korgen räknas som landning (snäll).
      const magnetic = fb.velocity.y > 0 && Math.abs(dx) < 120 && dy > -150 && dy < 110
      if (near || magnetic) {
        this._land(ctx)
        return
      }
      if (fb.position.y > FLOOR_Y - 20 || fb.position.x > 1290 || fb.position.x < -10) {
        this._miss(ctx)
        return
      }
    }

    // Idle-recue (bara när inget händer).
    if (!this._busy && !this._resolving && this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_CUES))
      if (this._frog && !this._frog.destroyed) pop(this._frog)
    }
  },

  // Håll plankans rörelse lugn och läsbar; hindra att den slår runt.
  _tame() {
    const pb = this._plankBody
    if (!pb) return
    const av = pb.angularVelocity
    if (Math.abs(av) > 0.12) Body.setAngularVelocity(pb, Math.sign(av) * 0.12)
    if (Math.abs(pb.angle) > 0.5) {
      Body.setAngle(pb, Math.sign(pb.angle) * 0.5)
      Body.setAngularVelocity(pb, 0)
    }
  },

  _addTimer(delay, fn) {
    const tw = gsap.delayedCall(delay, fn)
    this._timers.push(tw)
    return tw
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()

    this._timers.forEach((tw) => tw?.kill())
    this._timers = []
    this._launchWatchdog?.kill()
    this._assistTween?.kill()
    this._basketTween?.kill()
    this._frogBreathe?.kill()
    this._hintTween?.kill()

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onTap)

    if (this._frog && !this._frog.destroyed) {
      gsap.killTweensOf(this._frog)
      gsap.killTweensOf(this._frog.scale)
    }
    if (this._weight?.view && !this._weight.view.destroyed) {
      gsap.killTweensOf(this._weight.view)
      gsap.killTweensOf(this._weight.view.scale)
    }
    if (this._basketGlow && !this._basketGlow.destroyed) gsap.killTweensOf(this._basketGlow.scale)
    if (this._basket && !this._basket.destroyed) gsap.killTweensOf(this._basket.scale)
    if (this._hint && !this._hint.destroyed) gsap.killTweensOf(this._hint)
    if (this._plankView && !this._plankView.destroyed) gsap.killTweensOf(this._plankView.scale)
    this._sizeButtons?.forEach((b) => {
      if (b && !b.destroyed) gsap.killTweensOf(b.scale)
    })

    this._phys?.destroy() // rensar även constrainten (Composite.clear)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Planka: avrundad träbjälke med en glad nav-bult i mitten (roterar med plankan).
function makePlank() {
  const c = new Container()
  const board = new Graphics()
    .roundRect(-PLANK_HALF, -PLANK_H / 2, PLANK_W, PLANK_H, PLANK_H / 2)
    .fill(COLORS.brown)
    .stroke({ width: 4, color: shade(COLORS.brown, 0.25) })
  // Små "sitt-dynor" i ändarna.
  board.roundRect(-PLANK_HALF + 8, -PLANK_H / 2 - 6, 70, 8, 4).fill({ color: COLORS.green, alpha: 0.9 })
  board.roundRect(PLANK_HALF - 78, -PLANK_H / 2 - 6, 70, 8, 4).fill({ color: COLORS.red, alpha: 0.9 })
  const bolt = new Graphics().circle(0, 0, 9).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
  c.addChild(board, bolt)
  return c
}

// Grå "vikt": glansig sten med liten skugga.
function makeWeight(r) {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, r * 0.82, r * 0.85, r * 0.28).fill({ color: 0x000000, alpha: 0.14 })
  shadow.eventMode = 'none'
  const disc = new Graphics()
    .circle(0, 0, r)
    .fill(0x9aa3ab)
    .stroke({ width: 3, color: 0x6c757d })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.3).fill({ color: COLORS.white, alpha: 0.45 })
  gloss.eventMode = 'none'
  const t = new Text({ text: '🪨', style: { fontFamily: FONT.body, fontSize: r * 1.15 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(shadow, disc, gloss, t)
  return c
}

// Glad groda (emoji + mjuk skugga). Ankrad i mitten.
function makeFrog() {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, FROG_R * 0.8, FROG_R * 0.9, FROG_R * 0.28).fill({ color: 0x000000, alpha: 0.14 })
  shadow.eventMode = 'none'
  const t = new Text({ text: '🐸', style: { fontFamily: FONT.body, fontSize: FROG_R * 2.1 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(shadow, t)
  return c
}

// Flätad korg med öppning + liten emoji för charm. Origo = öppningens mitt (0,0).
function makeBasket() {
  const c = new Container()
  const brown = 0xb5793a
  const dark = 0x8a5a28
  // Kropp (trapets).
  const body = new Graphics()
    .moveTo(-78, 0)
    .lineTo(78, 0)
    .lineTo(60, 120)
    .lineTo(-60, 120)
    .closePath()
    .fill(brown)
    .stroke({ width: 5, color: dark })
  // Flätmönster (lodräta + vågräta streck).
  for (let i = -60; i <= 60; i += 24) body.moveTo(i, 6).lineTo(i * 0.78, 116).stroke({ width: 3, color: dark, alpha: 0.5 })
  for (let yy = 24; yy < 120; yy += 28) body.moveTo(-72 + yy * 0.12, yy).lineTo(72 - yy * 0.12, yy).stroke({ width: 3, color: dark, alpha: 0.4 })
  // Öppningskant (ellips).
  const rim = new Graphics().ellipse(0, 0, 80, 22).fill(0xd8a566).stroke({ width: 5, color: dark })
  const inner = new Graphics().ellipse(0, 0, 66, 15).fill({ color: 0x6b4a2a, alpha: 0.5 })
  const tag = new Text({ text: '🧺', style: { fontFamily: FONT.body, fontSize: 40 } })
  tag.anchor.set(0.5)
  tag.position.set(0, 66)
  tag.eventMode = 'none'
  c.addChild(body, inner, rim, tag)
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
