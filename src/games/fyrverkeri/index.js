// Fyrverkeri — sikta-och-skjut fyrverkeriraketer på natthimlen (2–5 år). Nu ett RIKTIGT
// spel med ett MÅL: uppe i skyn lyser tomma stjärnringar ✨ — barnet GREPPAR raketen på
// rampen längst ner, drar för att sikta + välja kraft (en prickad bana visar färdvägen),
// och släpper. Raketen bågar uppåt under gravitation (och ev. mild vind på högre nivåer)
// och SMÄLLER vid en stjärna så den tänds och börjar lysa. Tänd ALLA stjärnor → ett stort
// final-firande + nästa nivå (fler/högre stjärnor, lite vind).
//
// INGET misslyckande: varje skott smäller alltid vackert (vid stjärnan, annars i banans
// topp), missar är roliga (mjuk puff + glada ord), och efter ett par missar tar raketen
// hjälp av ett auto-sikte som GARANTERAT tänder en stjärna till. Mätaren går bara uppåt.
//
// EXIT-SÄKERHET: raket-flygningen och alla gnistor drivs av tickern (egna hastigheter),
// INTE av gsap-tweens på Pixi-objekt — partiklar ligger i arrayer och tas bort när de
// tonat ut. De få gsap-tweens som finns (pop/firande) går via lib/feedback.js (exit-säkra)
// eller dödas i destroy(). Tickern tas bort och this._root.destroy({children:true}) körs i
// destroy(), så ingen uppdatering kan skriva till ett förstört objekt; loopen kollar ändå
// .destroyed defensivt.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { AimLauncher } from '../../lib/launcher.js'
import { predictTrajectory } from '../../lib/physics.js'
import { bigCelebration, puff, sparkle, pop, floatText } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { PLAYFUL, FONT } from '../../lib/theme.js'

// --- Layout & fysik (designkoordinater 1280×720) ---
const ORIGIN = { x: 640, y: 648 } // raketens rampe-läge (greppas + skjuts härifrån)
const GY = 0.4 // gravitation px/steg² (matchar prick-förhandsvisningen exakt)
const PART_GRAVITY = 520 // px/s² — drar gnistorna mjukt nedåt så de bågar
const FIXED = 1000 / 60 // fast flyg-tidssteg (gör banan = prickarna)
const MAX_FLIGHT = 3.6 // s i luften innan raketen smäller (no-fail)
const IDLE_DELAY = 6 // s utan handling innan röst-recue
const PARTICLE_CAP = 700 // mjukt tak för prestanda
const SKY_STARS = 22 // tindrande bakgrundsstjärnor

const TARGET_HIT = 92 // träffradie i luften (generös, barnvänlig)
const BURST_LIGHT = 130 // tänd-radie runt en smäll
const ASSIST_RADIUS = 260 // tänd-radie under hjälp-skott (garanterar tändning)
const ASSIST_MISSES = 3 // missar innan auto-hjälp

// Ljusa, festliga nyanser till raketer/gnistor.
const HUES = [...PLAYFUL, 0xffffff, 0xffe27a, 0x9be3ff, 0xff7ad9]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'fyrverkeri',
  titleSv: 'Fyrverkeri',
  icon: '🎆',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'fyrverkeri',
  voiceIntro: 'Sikta raketen och tänd alla stjärnorna på himlen!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._lastVoice = 0
    this._mode = 'aim' // aim | flying | cooldown | resolving
    this._won = false
    this._misses = 0
    this._assisting = false
    this._assistTarget = null
    this._windX = 0 // px/steg² (mild vind, bågar banan)
    this._windDir = 0
    this._flight = null // { x, y, vx, vy, prevVy, color, steps, trail }
    this._flightAcc = 0
    this._timers = [] // gsap.delayedCall-handtag att döda i destroy
    this._stars = [] // bakgrundsstjärnor (tindrar)
    this._particles = [] // { g, x, y, vx, vy, grav, life, maxLife }
    this._targets = [] // mål-stjärnor att tända { view, x, y, baseY, phase, lit, hue }
    this._chevrons = []

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Natthimmel + tindrande stjärnor (dekor, ej tryckbar).
    this._sky = makeNightSky(ctx.width, ctx.height)
    this._sky.eventMode = 'none'
    this._sky.interactiveChildren = false
    this._root.addChild(this._sky)
    for (let i = 0; i < SKY_STARS; i++) {
      const r = 1.4 + Math.random() * 1.8
      const g = new Graphics().circle(0, 0, r).fill({ color: 0xfff6d8 })
      g.x = 40 + Math.random() * (ctx.width - 80)
      g.y = 24 + Math.random() * (ctx.height * 0.58)
      g.eventMode = 'none'
      this._sky.addChild(g)
      this._stars.push({ g, base: 0.35 + Math.random() * 0.4, amp: 0.25 + Math.random() * 0.35, speed: 0.6 + Math.random() * 1.4, phase: Math.random() * Math.PI * 2 })
    }

    // 2) Tryck-fångare (under spelgrafiken): tap på tom himmel ger ett mjukt glitter.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onSkyTap = (ev) => this._skyTap(ctx, ev)
    this._catcher.on('pointertap', this._onSkyTap)
    this._root.addChild(this._catcher)

    // 3) Drivande vind-pilar (syns bara när det blåser).
    this._chevronLayer = new Container()
    this._chevronLayer.eventMode = 'none'
    this._chevronLayer.interactiveChildren = false
    this._root.addChild(this._chevronLayer)
    this._buildChevrons()

    // 4) Mål-lager (stjärnringar att tända) — dekorativt, tändning sker på avstånd.
    this._targetLayer = new Container()
    this._targetLayer.eventMode = 'none'
    this._targetLayer.interactiveChildren = false
    this._root.addChild(this._targetLayer)

    // 5) Vind-flagga (visar riktning när det blåser).
    this._buildFlag()

    // 6) Glödlager: raketer/gnistor ritas här med additiv blandning -> mjukt sken.
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._fx)

    // 7) Ramp + grippbar raket.
    this._pad = makeLaunchPad()
    this._pad.position.set(ORIGIN.x, ORIGIN.y + 26)
    this._pad.eventMode = 'none'
    this._root.addChild(this._pad)

    this._rocket = makeRocket(1)
    this._rocket.position.set(ORIGIN.x, ORIGIN.y)
    this._root.addChild(this._rocket)

    // 8) Sikt-kontroll: greppa raketen, dra bakåt (slangbella) -> skjut framåt. Prickad bana.
    this._launcher = new AimLauncher({
      target: this._rocket,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: true,
      hitRadius: 100,
      maxPower: 32,
      minPower: 13,
      powerScale: 0.17,
      previewGravity: GY,
      previewWind: 0,
      trailColor: 0xfff1b0,
      getOrigin: () => ({ x: ORIGIN.x, y: ORIGIN.y }),
      defaultAim: () => this._nearestTarget() || { x: ORIGIN.x, y: 220 },
      onGrab: () => {
        this._idle = 0
        if (this._rocket && !this._rocket.destroyed) pop(this._rocket)
      },
      onAim: (v) => {
        this._idle = 0
        this._tension(v)
      },
      onLaunch: (v) => {
        this._assisting = false
        this._fire(ctx, v.vx, v.vy)
      },
    })

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivåer -------------------------------------------------------------

  _layoutFor(level) {
    const rnd = (a, b) => a + Math.random() * (b - a)
    const count = clamp(2 + Math.floor(level / 1.5), 2, 6) // 2..6 stjärnor
    const yHi = clamp(150 + 60 - level * 16, 110, 260) // högre upp på högre nivå
    const yLo = clamp(430 - level * 14, 300, 430)
    const stars = []
    for (let i = 0; i < count; i++) {
      const f = count === 1 ? 0.5 : i / (count - 1)
      stars.push({
        x: clamp(190 + (1090 - 190) * f + rnd(-40, 40), 170, 1110),
        y: clamp(rnd(yHi, yLo), 110, 440),
        hue: randomFrom(HUES),
      })
    }
    // Mild vind från nivå 2 (växer sakta), slumpad riktning.
    const windMag = level >= 2 ? 0.025 + Math.min(level - 2, 4) * 0.014 : 0
    const windDir = windMag > 0 ? (Math.random() < 0.5 ? -1 : 1) : 0
    return { stars, windX: windDir * windMag, windDir }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._clearTargets()

    this._mode = 'aim'
    this._won = false
    this._misses = 0
    this._assisting = false
    this._assistTarget = null
    this._idle = 0

    const lay = this._layoutFor(level)
    for (const s of lay.stars) this._addTarget(s)
    this._applyWind(lay.windX, lay.windDir)

    // Raketen tillbaka på rampen, upprätt, full storlek, synlig.
    gsap.killTweensOf(this._rocket)
    gsap.killTweensOf(this._rocket.scale)
    this._rocket.position.set(ORIGIN.x, ORIGIN.y)
    this._rocket.rotation = 0
    this._rocket.scale.set(1)
    this._rocket.visible = true

    this._launcher.setEnabled(true)
    if (!this._rocket.destroyed) pop(this._rocket)
  },

  _addTarget(def) {
    const view = makeTarget(34, def.hue)
    view.position.set(def.x, def.y)
    view.eventMode = 'none'
    this._targetLayer.addChild(view)
    this._targets.push({ ...def, view, lit: false, baseY: def.y, phase: Math.random() * Math.PI * 2 })
  },

  _clearTargets() {
    for (const t of this._targets) {
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
        t.view.destroy({ children: true })
      }
    }
    this._targets = []
  },

  // ---- Sikta-spänning (visuell) -------------------------------------------

  _tension(v) {
    const mag = Math.hypot(v.vx, v.vy) || 1
    const pull = Math.min(mag * 2.2, 46)
    const hx = ORIGIN.x - (v.vx / mag) * pull // slangbella: dra raketen bakåt
    const hy = ORIGIN.y - (v.vy / mag) * pull
    if (this._rocket && !this._rocket.destroyed) {
      this._rocket.position.set(hx, hy)
      this._rocket.rotation = Math.atan2(v.vy, v.vx) + Math.PI / 2 // nosen pekar dit den flyger
    }
  },

  // ---- Avfyrning + flyg ---------------------------------------------------

  _fire(ctx, vx, vy) {
    if (!this._alive || this._mode === 'flying' || this._mode === 'resolving') return
    this._mode = 'flying'
    this._flightAcc = 0
    this._idle = 0
    this._launcher.setEnabled(false)

    const color = randomFrom(HUES)
    // Liten flygande raket i glödlagret (roterar mot färdriktningen).
    const fly = makeRocket(0.72)
    fly.position.set(ORIGIN.x, ORIGIN.y)
    fly.eventMode = 'none'
    this._fx.addChild(fly)
    this._flyRocket = fly

    // Dölj rampraketen tills nästa skott.
    gsap.killTweensOf(this._rocket)
    gsap.killTweensOf(this._rocket.scale)
    this._rocket.position.set(ORIGIN.x, ORIGIN.y)
    this._rocket.rotation = 0
    this._rocket.scale.set(1)
    this._rocket.visible = false

    this._flight = { x: ORIGIN.x, y: ORIGIN.y, vx, vy, prevVy: vy, color, steps: 0, trail: 0 }
    ctx.services.audio.sfx('whoosh')
  },

  // Ett fast fysiksteg för raketen (matchar prick-banan exakt).
  _stepFlight(ctx) {
    const f = this._flight
    if (!f) return
    f.prevVy = f.vy
    f.vy += GY
    f.vx += this._windX
    f.x += f.vx
    f.y += f.vy
    f.steps++

    if (this._flyRocket && !this._flyRocket.destroyed) {
      this._flyRocket.position.set(f.x, f.y)
      this._flyRocket.rotation = Math.atan2(f.vy, f.vx) + Math.PI / 2
    }

    f.trail += FIXED
    if (f.trail >= 28) {
      f.trail = 0
      this._spawnTrail(f.x, f.y, f.color)
    }

    // Träff på en otänd stjärna? -> smäll här.
    for (const t of this._targets) {
      if (t.lit) continue
      if (Math.hypot(f.x - t.x, f.y - t.y) < TARGET_HIT) {
        this._burstAt(ctx, f.x, f.y, f.color)
        return
      }
    }

    // Banans topp (vändpunkt) -> smäll vackert (även en miss blir ett fyrverkeri).
    if (f.prevVy < 0 && f.vy >= 0) {
      this._burstAt(ctx, f.x, f.y, f.color)
      return
    }

    // Utanför skärm / för länge -> smäll ändå.
    const tSec = f.steps / 60
    if (f.y > 760 || f.x < -90 || f.x > ctx.width + 90 || tSec > MAX_FLIGHT) {
      this._burstAt(ctx, clamp(f.x, 40, ctx.width - 40), clamp(f.y, 60, 600), f.color)
    }
  },

  // ---- Smäll: gnistor + tänd stjärnor -------------------------------------

  _burstAt(ctx, x, y, color) {
    if (!this._alive) return
    this._explode(ctx, x, y, color)
    this._flight = null
    if (this._flyRocket && !this._flyRocket.destroyed) this._flyRocket.destroy()
    this._flyRocket = null

    const radius = this._assisting ? ASSIST_RADIUS : BURST_LIGHT
    let lit = this._lightNear(ctx, x, y, radius)

    // Hjälp-skott garanterar: tänd måls-stjärnan oavsett (extra smäll vid den).
    if (this._assisting && this._assistTarget && !this._assistTarget.lit) {
      const t = this._assistTarget
      this._explode(ctx, t.x, t.y, color)
      this._lightTarget(ctx, t)
      lit++
    }
    this._assisting = false
    this._assistTarget = null

    if (this._targets.every((t) => t.lit)) {
      this._win(ctx)
      return
    }

    if (lit > 0) {
      this._misses = 0
      this._say(ctx, randomFrom(['Pang! Vilken fin stjärna!', 'Den lyser nu!', 'Så vackert!']))
    } else {
      this._misses++
      this._say(ctx, randomFrom(['Nästan! Prova igen.', 'Oj, en till!', 'Vilka färger!']))
    }

    this._mode = 'cooldown'
    this._pushTimer(gsap.delayedCall(0.55, () => {
      if (this._alive) this._ready(ctx)
    }))
  },

  // Smällen: 18–30 gnistor radiellt utåt, bågar nedåt och tonar ut (exit-säkert via ticker).
  _explode(ctx, x, y, color) {
    ctx.services.audio.sfx('pop')
    const n = 18 + ((Math.random() * 13) | 0)
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.25
      const speed = 140 + Math.random() * 280
      const r = 4 + Math.random() * 5
      const c = Math.random() < 0.18 ? 0xffffff : color
      const g = new Graphics().circle(0, 0, r).fill({ color: c })
      g.blendMode = 'add'
      g.eventMode = 'none'
      g.position.set(x, y)
      this._fx.addChild(g)
      this._pushParticle({ g, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, grav: PART_GRAVITY, life: 0, maxLife: 0.8 + Math.random() * 0.4 })
    }
  },

  _lightNear(ctx, x, y, radius) {
    let count = 0
    for (const t of this._targets) {
      if (t.lit) continue
      if (Math.hypot(x - t.x, y - t.y) < radius) {
        this._lightTarget(ctx, t)
        count++
      }
    }
    return count
  },

  _lightTarget(ctx, t) {
    if (t.lit) return
    t.lit = true
    ctx.services.audio.sfx('reveal')
    ctx.services.audio.sfx('pling')
    sparkle(ctx.fxLayer, t.x, t.y, { count: 8 })
    floatText(ctx.fxLayer, t.x, t.y - 14, '⭐', { fontSize: 56 })
    const v = t.view
    if (v && !v.destroyed) {
      v.setLit?.()
      gsap.killTweensOf(v.scale)
      pop(v, { scale: 1.35 })
    }
  },

  // ---- Redo igen / auto-hjälp ---------------------------------------------

  _ready(ctx) {
    if (!this._alive || this._won) return
    const remaining = this._targets.some((t) => !t.lit)
    if (!remaining) return

    if (this._misses >= ASSIST_MISSES) {
      this._autoAssist(ctx)
      return
    }
    this._mode = 'aim'
    this._rocket.visible = true
    this._rocket.position.set(ORIGIN.x, ORIGIN.y)
    this._rocket.rotation = 0
    this._rocket.scale.set(1)
    this._launcher.setEnabled(true)
    this._idle = 0
    if (!this._rocket.destroyed) pop(this._rocket)
  },

  // Hjälp-skott: lös ut en nästan-perfekt fart mot närmaste otända stjärna och skjut.
  _autoAssist(ctx) {
    const t = this._nearestTarget()
    if (!t) return
    this._say(ctx, 'Jag hjälper raketen lite!', true)
    this._misses = 0
    this._assisting = true
    this._assistTarget = t
    const sol = this._solveShot(t)
    this._fire(ctx, sol.vx, sol.vy)
  },

  _nearestTarget() {
    let best = null
    let bestD = Infinity
    for (const t of this._targets) {
      if (t.lit) continue
      const d = Math.hypot(t.x - ORIGIN.x, t.y - ORIGIN.y)
      if (d < bestD) {
        bestD = d
        best = t
      }
    }
    return best
  },

  // Sök en fart (vinkel + kraft) vars förutsagda bana passerar närmast målet.
  _solveShot(t) {
    let best = { vx: 0, vy: -26 }
    let bestD = Infinity
    for (let power = 14; power <= 32; power += 2) {
      for (let deg = -135; deg <= -45; deg += 5) {
        const a = (deg * Math.PI) / 180
        const vx = Math.cos(a) * power
        const vy = Math.sin(a) * power
        const pts = predictTrajectory({ x: ORIGIN.x, y: ORIGIN.y, vx, vy, gy: GY, wx: this._windX, steps: 150, every: 1, damp: 1 })
        for (const p of pts) {
          const d = Math.hypot(p.x - t.x, p.y - t.y)
          if (d < bestD) {
            bestD = d
            best = { vx, vy }
          }
        }
      }
    }
    return best
  },

  // ---- Alla tända: stort final-firande + ny nivå --------------------------

  _win(ctx) {
    if (this._won) return
    this._won = true
    this._mode = 'resolving'
    this._launcher.setEnabled(false)
    if (this._flyRocket && !this._flyRocket.destroyed) this._flyRocket.destroy()
    this._flyRocket = null
    this._flight = null

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    this._say(ctx, 'Hurra! Alla stjärnor lyser!', true)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // En glad final-salva av fyrverkerier över hela skyn.
    for (let i = 0; i < 7; i++) {
      this._pushTimer(gsap.delayedCall(i * 0.18, () => {
        if (!this._alive) return
        const x = 180 + Math.random() * (ctx.width - 360)
        const y = 130 + Math.random() * 260
        this._explode(ctx, x, y, randomFrom(HUES))
      }))
    }

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._pushTimer(gsap.delayedCall(2.2, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    }))
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(ticker.deltaMS, 50) / 1000
    this._t += dt

    // Bakgrundsstjärnor tindrar.
    for (const s of this._stars) {
      if (s.g.destroyed) continue
      s.phase += s.speed * dt
      s.g.alpha = s.base + Math.sin(s.phase) * s.amp
    }

    // Mål-stjärnor guppar mjukt + driv-pilar.
    for (const t of this._targets) {
      if (!t.view || t.view.destroyed) continue
      t.view.y = t.baseY + Math.sin(this._t * 2 + t.phase) * 5
    }
    this._animateChevrons(dt)
    if (this._flagCloth && !this._flagCloth.destroyed) {
      this._flagCloth.rotation = Math.sin(this._t * 4) * (this._windDir === 0 ? 0.03 : 0.12)
    }

    // Raket-flygning i fasta steg (så banan = prickarna).
    if (this._mode === 'flying' && this._flight) {
      this._flightAcc += Math.min(ticker.deltaMS, 100)
      let steps = 0
      while (this._flight && this._flightAcc >= FIXED && steps < 5) {
        this._stepFlight(ctx)
        this._flightAcc -= FIXED
        steps++
      }
    }

    // Gnistor: hastighet + gravitation, tona ut, ta bort.
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life += dt
      const k = 1 - p.life / p.maxLife
      if (k <= 0 || p.g.destroyed) {
        if (!p.g.destroyed) p.g.destroy()
        this._particles.splice(i, 1)
        continue
      }
      p.vy += p.grav * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.g.position.set(p.x, p.y)
      p.g.alpha = Math.min(1, k * 1.6)
      p.g.scale.set(0.45 + k * 0.55)
    }

    // Stilla i siktläge -> påminn vänligt.
    if (this._mode === 'aim') {
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say('Dra i raketen och släpp för att skjuta upp den!')
        if (this._rocket && !this._rocket.destroyed) pop(this._rocket)
      }
    }
  },

  // ---- Tap på tom himmel: alltid ett glatt litet svar ---------------------

  _skyTap(ctx, ev) {
    if (!this._alive || this._mode !== 'aim') return
    const p = this._root.toLocal(ev.global)
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, p.x, p.y, { count: 5 })
  },

  // ---- Småhjälpare --------------------------------------------------------

  _spawnTrail(x, y, color) {
    const g = new Graphics().circle(0, 0, 3.4).fill({ color })
    g.blendMode = 'add'
    g.eventMode = 'none'
    g.position.set(x, y)
    this._fx.addChild(g)
    this._pushParticle({ g, x, y, vx: 0, vy: 20, grav: 0, life: 0, maxLife: 0.36 })
  },

  _pushParticle(p) {
    this._particles.push(p)
    if (this._particles.length > PARTICLE_CAP) {
      const old = this._particles.shift()
      if (old && !old.g.destroyed) old.g.destroy()
    }
  },

  _pushTimer(call) {
    this._timers.push(call)
    return call
  },

  // Glad svensk kommentar — strypt så rösten inte hackar (force kringgår strypningen).
  _say(ctx, phrase, force = false) {
    const now = performance.now()
    if (!force && now - this._lastVoice < 900) return
    this._lastVoice = now
    ctx.services.voice.say(phrase)
  },

  // ---- Vind: flagga + drivande pilar --------------------------------------

  _applyWind(windX, dir) {
    this._windX = windX
    this._windDir = dir || 0
    this._launcher?.setPreview({ wind: windX })
    const c = this._flagCloth
    if (c && !c.destroyed) {
      if (this._windDir === 0) {
        c.scale.x = 0.5
        c.alpha = 0.5
      } else {
        c.scale.x = this._windDir
        c.alpha = 1
      }
    }
  },

  _buildFlag() {
    const c = new Container()
    c.position.set(96, 96)
    c.eventMode = 'none'
    const pole = new Graphics().roundRect(-4, 0, 8, 130, 4).fill(0x9a8a6a)
    const cloth = new Graphics()
    cloth.moveTo(0, 6).lineTo(64, 18).lineTo(0, 40).fill(0xffd35c)
    cloth.position.set(0, 2)
    cloth.scale.x = 0.5
    cloth.alpha = 0.5
    this._flagCloth = cloth
    c.addChild(pole, cloth)
    this._root.addChild(c)
  },

  _buildChevrons() {
    for (let i = 0; i < 6; i++) {
      const g = new Graphics()
      g.moveTo(-16, -12).lineTo(0, 0).lineTo(-16, 12).stroke({ width: 6, color: 0xffffff, alpha: 0.25, cap: 'round' })
      g.position.set(Math.random() * 1280, 120 + Math.random() * 320)
      g.eventMode = 'none'
      g.visible = false
      this._chevronLayer.addChild(g)
      this._chevrons.push({ g, speed: 80 + Math.random() * 70 })
    }
  },

  _animateChevrons(dt) {
    for (const c of this._chevrons) {
      if (!c.g || c.g.destroyed) continue
      if (this._windDir === 0) {
        c.g.visible = false
        continue
      }
      c.g.visible = true
      c.g.scale.x = this._windDir
      c.g.x += this._windDir * c.speed * dt
      if (this._windDir > 0 && c.g.x > 1340) c.g.x = -60
      else if (this._windDir < 0 && c.g.x < -60) c.g.x = 1340
    }
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)

    for (const c of this._timers) c?.kill?.()
    this._timers = []

    for (const t of this._targets) {
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
      }
    }
    this._targets = []
    this._particles = []
    this._stars = []
    this._chevrons = []
    this._flight = null

    if (this._rocket && !this._rocket.destroyed) {
      gsap.killTweensOf(this._rocket)
      gsap.killTweensOf(this._rocket.scale)
    }
    if (this._flyRocket && !this._flyRocket.destroyed) this._flyRocket.destroy()
    this._flyRocket = null
    if (this._flagCloth && !this._flagCloth.destroyed) gsap.killTweensOf(this._flagCloth)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onSkyTap)

    this._launcher?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// En gullig liten raket (nosen pekar UPPÅT vid rotation 0). Glöd + flamma + fenor.
function makeRocket(scale = 1, bodyColor = 0xff5a5a) {
  const c = new Container()
  const s = scale
  const glow = new Graphics().circle(0, 0, 36 * s).fill({ color: 0xfff1b0, alpha: 0.22 })
  glow.blendMode = 'add'
  glow.eventMode = 'none'
  // Flamma under raketen (+y).
  const flame = new Graphics()
  flame.moveTo(-9 * s, 18 * s).quadraticCurveTo(0, 46 * s, 9 * s, 18 * s).fill({ color: 0xffb347 })
  flame.moveTo(-5 * s, 18 * s).quadraticCurveTo(0, 36 * s, 5 * s, 18 * s).fill({ color: 0xfff0a0 })
  flame.blendMode = 'add'
  flame.eventMode = 'none'
  // Fenor.
  const fins = new Graphics()
  fins.moveTo(-12 * s, 6 * s).lineTo(-22 * s, 22 * s).lineTo(-12 * s, 18 * s).fill(bodyColor)
  fins.moveTo(12 * s, 6 * s).lineTo(22 * s, 22 * s).lineTo(12 * s, 18 * s).fill(bodyColor)
  // Kropp + nos + fönster.
  const body = new Graphics().roundRect(-12 * s, -20 * s, 24 * s, 40 * s, 12 * s).fill(0xffffff).stroke({ width: 3, color: bodyColor })
  const nose = new Graphics()
  nose.moveTo(-12 * s, -14 * s).lineTo(0, -36 * s).lineTo(12 * s, -14 * s).fill(bodyColor)
  const win = new Graphics().circle(0, -4 * s, 6 * s).fill(0x8fd6ff).stroke({ width: 2, color: 0x4a90c2 })
  c.addChild(glow, flame, fins, body, nose, win)
  return c
}

// En liten ramp/avskjutningsrör under raketen.
function makeLaunchPad() {
  const c = new Container()
  const tube = new Graphics().roundRect(-22, 0, 44, 30, 8).fill(0x4a5570).stroke({ width: 3, color: 0x2f3650 })
  const base = new Graphics().roundRect(-40, 26, 80, 16, 8).fill(0x39405c)
  c.addChild(base, tube)
  return c
}

// En mål-stjärna: otänd = svag ring + blek ✨; tänd = stark glöd + lysande ⭐.
function makeTarget(r = 34, hue = 0xffe27a) {
  const c = new Container()
  const glow = new Graphics().circle(0, 0, r * 1.6).fill({ color: hue, alpha: 0.12 })
  glow.blendMode = 'add'
  glow.eventMode = 'none'
  const ring = new Graphics().circle(0, 0, r).stroke({ width: 5, color: 0xffe27a, alpha: 0.6 })
  ring.eventMode = 'none'
  const star = new Text({ text: '✨', style: { fontFamily: FONT.body, fontSize: r * 1.6 } })
  star.anchor.set(0.5)
  star.alpha = 0.45
  star.eventMode = 'none'
  c.addChild(glow, ring, star)
  // Tänd-läge: byt till lysande stjärna och starkt sken.
  c.setLit = () => {
    if (star.destroyed) return
    star.text = '⭐'
    star.alpha = 1
    if (!glow.destroyed) {
      glow.clear().circle(0, 0, r * 1.9).fill({ color: hue, alpha: 0.4 })
    }
    if (!ring.destroyed) {
      ring.clear().circle(0, 0, r).stroke({ width: 6, color: hue, alpha: 0.95 })
    }
  }
  return c
}

// Natthimmel: lodrät gradient mörkblå (topp) -> indigo (botten).
function makeNightSky(w, h) {
  const top = 0x122a5c
  const bottom = 0x190b3d
  const g = new Graphics()
  const strips = 48
  const sh = h / strips
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1)
    g.rect(0, i * sh, w, sh + 1).fill({ color: lerpColor(top, bottom, t) })
  }
  return g
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const gg = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (gg << 8) | bl
}
