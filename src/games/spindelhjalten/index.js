// Spindelhjälten — fysik-slangbella (3–5 år). Barnet greppar den gulliga
// spindelhjälten i en webb-slangbella nere till vänster, drar bakåt för att välja
// riktning + kraft (prickad bana visar flygvägen) och släpper — hjälten skjuts iväg
// som en studsig matter.js-kropp under gravitation, studsar mot väggar och en
// flytande studsknopp (boing!) och samlar alla stjärnorna (och en instängd kattunge
// på högre nivåer) uppe i skyn. EXTRA KONTROLL: en stor vind-fläkt-knapp växlar
// vind av → blås höger → blås vänster; vinden kröker tydligt flygbanan (matter-vind
// + matchande prick-förhandsvisning) och en flagga visar riktningen. INGET
// misslyckande: missar är roliga (puff + vingel), hjälten zippar tillbaka till
// slangbellan, och efter ett par missar får han en nästan-perfekt hjälp-skott så en
// stjärna ALLTID samlas. Allt ritas programmatiskt (Pixi Graphics + emoji).
//
// Spindelhjälten är en EGEN gosig figur (rund röd kropp, blå ben/armar, stora
// vänliga vita ögon, en liten webb-symbol) — inte Marvels Spindelmannen.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body, predictTrajectory } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { createScene } from '../../lib/scene.js'
import { makeStjarna } from '../../lib/foremal.js'
import { sphereFill } from '../../lib/form.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration, puff, sparkle, burst, floatText, pop, wiggle } from '../../lib/feedback.js'
import { FONT, COLORS } from '../../lib/theme.js'

// --- Layout (designkoordinater 1280×720) ---
const HERO_R = 46
const SLING = { x: 240, y: 540 } // slangbellans fasta ankarpunkt
const PRONG = { dx: 30, dy: 52 } // prong-spetsarnas offset från ankaret
const BOUNDS = { floorY: 674, leftX: 46, rightX: 1234, restitution: 0.72 } // för prick-förhandsvisning
const GRAVITY = 1.0
// Kalibrering (uppmätt mot matter.js): med fast 1/60-steg ökar matter farten ~0.2778 px/steg
// per gravitationsenhet, och frictionAir dämpar ~(1-frictionAir) per steg. Pricklinjen MÅSTE
// använda samma värden annars pekar den åt fel håll (tidigare gy=0.5 utan dämpning -> ~380px fel).
const PREVIEW_G = 0.2778 * GRAVITY // verklig per-steg-gravitation i px
const PREVIEW_DAMP = 1 - 0.004 // matchar hjältens frictionAir (MATERIALS.bouncy)
// matter-vindens acceleration -> px/steg²-faktor (≈ stegtid² = (1000/60)²). Att dela vind med
// detta gör att verklig krökning matchar pricklinjen exakt (tidigare /500 -> bara ~0.56×).
const WIND_DIV = (1000 / 60) ** 2
const REST_SPEED = 1.2 // matter-fart under detta = "landat"
const MAX_FLIGHT = 5 // s i luften innan han zippar hem (no-fail)
const IDLE_DELAY = 6 // s utan handling innan röst-recue
const OFFER_PATIENCE = 12 // s med Skjut!-erbjudandet uppe innan no-fail-glidet tar vid
const BOING_THROTTLE = 0.12

// Insamlingsradier (generösa träffytor — barnvänligt).
const STAR_HIT = HERO_R + 34
const KITTEN_HIT = HERO_R + 50
const ASSIST_BONUS = 30 // extra radie under hjälp-skott (garanterar insamling)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'spindelhjalten',
  titleSv: 'Spindelhjälten',
  icon: '🕷️',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'spindelhjalten',
  voiceIntro: 'Hjälp Spindelhjälten att flyga till stjärnorna!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._flightT = 0
    this._restT = 0
    this._lastBoing = -1
    this._mode = 'aim' // aim | flying | returning | gliding | resolving
    this._won = false
    this._misses = 0
    this._assisting = false
    this._collectedThisThrow = false
    this._heroBody = null
    this._targets = []
    this._bumpers = [] // studsknopp + passiva studsmoln (statiska matter-kroppar)
    this._chevrons = []
    this._windDir = 0
    this._windMag = 0.16
    this._combo = 0 // stjärnor tagna i SAMMA skott (driver kombo-plinget)
    this._trailT = 0 // gnistsvans-timer under flykt

    this._root = new Container()
    this._root.sortableChildren = false
    ctx.stage.addChild(this._root)

    // Bakgrund: glad himmel med moln + sol.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Dekor-lager (vind-pilar som driver) — under allt spel-grafik.
    this._chevronLayer = new Container()
    this._chevronLayer.eventMode = 'none'
    this._chevronLayer.interactiveChildren = false
    this._root.addChild(this._chevronLayer)
    this._buildChevrons()

    // Vindflagga uppe i skyn.
    this._buildFlag()

    // Studsknopp-lager (byggs om per nivå).
    this._bumperLayer = new Container()
    this._bumperLayer.eventMode = 'none'
    this._bumperLayer.interactiveChildren = false
    this._root.addChild(this._bumperLayer)

    // Stjärnor/kattunge-lager (dekorativt — insamling sker på avstånd).
    this._targetLayer = new Container()
    this._targetLayer.eventMode = 'none'
    this._targetLayer.interactiveChildren = false
    this._root.addChild(this._targetLayer)

    // Slangbella + elastisk webb-band + hjälte.
    this._slingshot = makeSlingshot()
    this._slingshot.position.set(SLING.x, SLING.y)
    this._slingshot.eventMode = 'none'
    this._root.addChild(this._slingshot)

    this._band = new Graphics()
    this._band.eventMode = 'none'
    this._root.addChild(this._band)

    // Hjälp-erbjudandets prickbana (egen Graphics, ritas bara när erbjudandet är uppe).
    this._offer = null
    this._offerT = 0
    this._offerPath = new Graphics()
    this._offerPath.eventMode = 'none'
    this._offerPath.visible = false
    this._root.addChild(this._offerPath)

    this._hero = makeHero()
    this._hero.position.set(SLING.x, SLING.y)
    this._root.addChild(this._hero)

    // Fysik: gravitation + väggar (golv/vänster/höger). Hjälten skapas vid skott.
    this._phys = new PhysicsWorld({ gravityY: GRAVITY, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Slangbella-kontroll (slingshot: dra bakåt → skjut framåt).
    this._launcher = new AimLauncher({
      target: this._hero,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: true,
      hitRadius: 100,
      maxPower: 28,
      minPower: 9,
      powerScale: 0.18,
      previewGravity: PREVIEW_G,
      previewWind: 0,
      previewDamp: PREVIEW_DAMP,
      bounds: { ...BOUNDS },
      getOrigin: () => ({ x: SLING.x, y: SLING.y }),
      defaultAim: () => this._nearestTarget() || { x: 900, y: 240 },
      onGrab: () => {
        this._idle = 0
        // Barnet siktar själv -> erbjudandet försvinner. Missar det igen får det ett nytt.
        this._clearOffer()
        if (this._hero && !this._hero.destroyed) pop(this._hero)
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

    // UI: stor vind-fläkt-knapp + riktnings-etikett (tillagd sist = överst).
    this._buildWindUI(ctx)

    // Skjut!-knappen syns bara när hjälpen erbjuds. 210×112 + Buttons 24px hit-halo ligger
    // en bra bit över P0:s 96px. Placerad mitt nere: x=240 krockar med hjältens greppradie
    // (hitRadius 100 kring SLING.y 540 når ner till 640), och Vind-knappen äger högerkanten.
    this._shootBtn = new Button({
      icon: '🎯',
      label: 'Skjut',
      width: 210,
      height: 112,
      color: COLORS.orange,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._takeOffer(ctx),
    })
    this._shootBtn.position.set(640, 648)
    this._shootBtn.visible = false
    this._shootBtn.setEnabled(false)
    this._root.addChild(this._shootBtn)

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
    const starCount = Math.min(2 + Math.floor(level / 1.5), 5) // 2..5
    const stars = []
    // Sprid stjärnorna i ett band uppe till höger; högre nivå = högre/längre bort.
    const x0 = 520
    const x1 = clamp(900 + level * 50, 900, 1170)
    const yHi = clamp(360 - level * 30, 150, 360)
    for (let i = 0; i < starCount; i++) {
      const f = starCount === 1 ? 0.5 : i / (starCount - 1)
      stars.push({
        x: clamp(x0 + (x1 - x0) * f + rnd(-30, 30), 480, 1180),
        y: clamp(rnd(yHi, yHi + 170) - i * 8, 130, 460),
        kind: 'star',
        r: 30,
      })
    }
    // Kattunge på en ledge från nivå 2 (längst bort, högt upp).
    const kitten = level >= 2 ? { x: clamp(1080 + level * 8, 1080, 1190), y: clamp(220 - level * 12, 150, 220), kind: 'kitten', r: 40 } : null
    // Flytande studsknopp från nivå 1 (att studsa runt).
    const bumper = level >= 1 ? { x: clamp(620 + rnd(-40, 60), 560, 760), y: clamp(rnd(360, 440), 340, 460), r: clamp(46 + level * 4, 46, 78) } : null
    // 1–2 passiva studsmoln som fyller den tomma luften på vägen till stjärnorna
    // (fler "boing", mer bana). Slumpad placering + antal ger mjuk variation per nivå.
    const clouds = []
    const cloudCount = 1 + (Math.random() < 0.6 ? 1 : 0)
    for (let i = 0; i < cloudCount; i++) {
      const mk = () => ({
        kind: 'cloud',
        x: clamp(rnd(380, 560) + i * 240, 340, 960),
        y: clamp(rnd(270, 470), 250, 480),
        r: clamp(42 + rnd(-6, 12), 34, 58),
      })
      // Molnens x-intervall överlappar första stjärnans, så en stjärna kunde hamna mitt i
      // studsmolnets prickring och äta upp just den siluett som gör molnet läsbart.
      // Ett omkast räcker; träffar det ändå får det stå (aldrig en oändlig loop).
      let cl = mk()
      const krockar = (c) => stars.some((s) => Math.hypot(c.x - s.x, c.y - s.y) < c.r + 40)
      if (krockar(cl)) cl = mk()
      clouds.push(cl)
    }
    // Vindstyrka växer med nivån.
    const windMag = 0.15 + Math.min(level, 4) * 0.035
    return { stars, kitten, bumper, clouds, windMag }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._clearLevel()
    this._clearOffer()

    this._mode = 'aim'
    this._won = false
    this._misses = 0
    this._assisting = false
    this._collectedThisThrow = false
    this._combo = 0
    this._flightT = 0
    this._restT = 0
    this._idle = 0

    const lay = this._layoutFor(level)
    this._windMag = lay.windMag

    // Stjärnor + ev. kattunge.
    this._targets = []
    for (const s of lay.stars) this._addTarget(s)
    if (lay.kitten) this._addTarget(lay.kitten)

    // Studsknopp (statisk matter-kropp + grafik) + passiva studsmoln.
    if (lay.bumper) this._addBumper(lay.bumper)
    for (const cl of lay.clouds) this._addBumper(cl)

    // Hjälten tillbaka i slangbellan, upprätt och full storlek.
    this._hangTl?.kill()
    gsap.killTweensOf(this._hero)
    gsap.killTweensOf(this._hero.scale)
    this._hero.position.set(SLING.x, SLING.y)
    this._hero.rotation = 0
    this._hero.scale.set(1)
    this._hero.visible = true
    this._drawBand(SLING.x, SLING.y)

    // Vind av vid varje ny nivå.
    this._applyWind(0)

    this._launcher.setEnabled(true)
    if (!this._hero.destroyed) pop(this._hero)
  },

  _clearLevel() {
    for (const t of this._targets) {
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
        t.view.destroy({ children: true })
      }
    }
    this._targets = []
    for (const bm of this._bumpers) {
      if (bm.view && !bm.view.destroyed) gsap.killTweensOf(bm.view.scale)
      this._phys.removeBody(bm.body)
    }
    this._bumpers = []
    if (this._bumperLayer) {
      for (const c of [...this._bumperLayer.children]) c.destroy({ children: true })
    }
  },

  _addTarget(def) {
    const view = def.kind === 'kitten' ? makeKitten() : makeStar(def.r)
    view.position.set(def.x, def.y)
    view.eventMode = 'none'
    this._targetLayer.addChild(view)
    this._targets.push({ ...def, view, collected: false, baseY: def.y, phase: Math.random() * Math.PI * 2 })
  },

  _addBumper(def) {
    const view = def.kind === 'cloud' ? makeCloudBumper(def.r) : makeBumper(def.r)
    view.position.set(def.x, def.y)
    view.eventMode = 'none'
    this._bumperLayer.addChild(view)
    const body = this._phys.circle(def.x, def.y, def.r, { isStatic: true, restitution: 1.0, friction: 0.2, label: 'bumper' })
    this._bumpers.push({ body, view, r: def.r, x: def.x, y: def.y })
  },

  // ---- Skott + flyg -------------------------------------------------------

  _fire(ctx, vx, vy) {
    if (!this._alive || this._mode === 'flying' || this._mode === 'resolving') return
    this._clearOffer()
    this._mode = 'flying'
    this._flightT = 0
    this._restT = 0
    this._combo = 0 // nytt skott -> kombo-räknaren nollas
    this._trailT = 0
    this._launcher.setEnabled(false)
    this._clearBand()

    // Återställ hjälten exakt i slangbellan (drag-spänningen kan ha flyttat honom).
    gsap.killTweensOf(this._hero)
    gsap.killTweensOf(this._hero.scale)
    this._hero.position.set(SLING.x, SLING.y)
    this._hero.rotation = 0
    this._hero.scale.set(1)

    const body = this._phys.circle(SLING.x, SLING.y, HERO_R, { ...MATERIALS.bouncy, label: 'hero' })
    this._heroBody = body
    this._phys.link(body, this._hero)
    Body.setVelocity(body, { x: vx, y: vy })

    ctx.services.audio.sfx('thwip')
    ctx.services.audio.sfx('whoosh')
    puff(ctx.fxLayer, SLING.x, SLING.y - 10, { count: 6 })
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._animateDecor(ctx, dt)
    this._phys.update(ticker.deltaMS)

    if (this._mode === 'flying' || this._mode === 'gliding') {
      if (this._mode === 'flying') this._flightT += dt
      // Gnistsvans efter hjälten så flygbanan han ritar syns i luften.
      this._trailT += dt
      if (this._trailT >= 0.05) {
        this._trailT = 0
        this._dropTrail(ctx)
      }
      this._checkCollect(ctx)
      if (this._won) return
      const b = this._heroBody
      if (this._mode === 'flying' && b) {
        // Hämta hem hjälten först UTANFÖR den synliga ytan (ctx.view, läses vid
        // användning) — kanterna 0..1280 syns mitt i bilden på breda telefoner.
        if (b.position.y > ctx.view.bottom + 140 || b.position.x < ctx.view.left - 160 || b.position.x > ctx.view.right + 160) {
          this._returnHero(ctx)
          return
        }
        const spd = Math.hypot(b.velocity.x, b.velocity.y)
        if (spd < REST_SPEED) {
          this._restT += dt
          if (this._restT > 0.5) {
            this._returnHero(ctx)
            return
          }
        } else {
          this._restT = 0
        }
        if (this._flightT > MAX_FLIGHT) {
          this._returnHero(ctx)
          return
        }
      }
      return
    }

    if (this._mode === 'aim') {
      this._idle += dt
      // NO-FAIL-GOLVET: ett erbjudande som ingen trycker på får inte bli en återvändsgränd.
      // Efter OFFER_PATIENCE tar det garanterade glidet vid precis som förr — inbjudan
      // flyttar alltså agensen till barnet UTAN att ta bort garantin att en stjärna samlas.
      if (this._offer) {
        this._offerT += dt
        if (this._offerT >= OFFER_PATIENCE) {
          this._clearOffer()
          this._glideToTarget(ctx)
          return
        }
      }
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say(
          this._offer ? 'Tryck på Skjut så flyger han dit!' : 'Dra i Spindelhjälten och släpp för att flyga!',
        )
        if (this._hero && !this._hero.destroyed) pop(this._hero)
      }
    }
  },

  _checkCollect(ctx) {
    const hx = this._hero.x
    const hy = this._hero.y
    // Kattungen räddas SIST — den kan inte tas förrän alla stjärnor är samlade.
    const starsLeft = this._targets.some((s) => s.kind !== 'kitten' && !s.collected)
    for (const t of this._targets) {
      if (t.collected) continue
      if (t.kind === 'kitten' && starsLeft) continue
      const base = t.kind === 'kitten' ? KITTEN_HIT : STAR_HIT
      const cr = base + (this._assisting ? ASSIST_BONUS : 0)
      if (Math.hypot(hx - t.x, hy - t.y) < cr) this._collect(ctx, t)
    }
  },

  _collect(ctx, t) {
    if (t.collected) return
    t.collected = true
    this._collectedThisThrow = true

    if (t.kind === 'kitten') return this._rescueKitten(ctx, t)

    // Kombo-pling: varje stjärna i SAMMA skott klättrar i tonhöjd (stigande glädje).
    this._combo++
    ctx.services.audio.sfx('reveal')
    ctx.services.audio.tone({ freq: 620 + this._combo * 130, dur: 0.16, type: 'triangle', vol: 0.34 })
    sparkle(ctx.fxLayer, t.x, t.y, { count: 8 })
    burst(ctx.fxLayer, t.x, t.y, { count: 10 })
    floatText(ctx.fxLayer, t.x, t.y - 12, '⭐', { fontSize: 58 })
    if (this._combo >= 2) floatText(ctx.fxLayer, t.x, t.y - 58, `×${this._combo}`, { fontSize: 40 })
    this._shrinkAway(t.view)
    this._heroYay()
    if (this._targets.every((x) => x.collected)) this._win(ctx)
  },

  // Infria "instängd kattunge": buren öppnas, ett mjau, och kattungen hoppar ner i
  // Spindelhjältens famn. Banans FINALmål (räddas sist, se _checkCollect).
  _rescueKitten(ctx, t) {
    const v = t.view
    if (v && !v.destroyed && v.openCage) v.openCage()
    // Riktigt kattläte om klippet finns, annars talad "Mjau!".
    if (!ctx.services.audio.sample('djur_katt')) ctx.services.voice.say('Mjau!')
    ctx.services.audio.sfx('reveal')
    sparkle(ctx.fxLayer, t.x, t.y, { count: 10 })
    floatText(ctx.fxLayer, t.x + 44, t.y - 28, '💛', { fontSize: 40 })
    // Bara kattungen (inte molnledgen) hoppar i en båge mot hjälten.
    const cat = v && !v.destroyed ? v.cat : null
    if (cat && !cat.destroyed) {
      const hx = this._hero?.x ?? t.x
      const hy = this._hero?.y ?? t.y
      const sx = cat.x
      const sy = cat.y
      const ex = hx - t.x // hjälten i kattungens lokala rymd (lagren är oskalade)
      const ey = hy - t.y
      const mx = (sx + ex) / 2
      const my = Math.min(sy, ey) - 90
      const st = { p: 0 }
      gsap.killTweensOf(cat)
      this._kittenTween = gsap.to(st, {
        p: 1,
        duration: 0.6,
        ease: 'power1.in',
        onUpdate: () => {
          if (cat.destroyed) {
            this._kittenTween?.kill()
            return
          }
          const p = st.p
          const q = 1 - p
          cat.x = q * q * sx + 2 * q * p * mx + p * p * ex
          cat.y = q * q * sy + 2 * q * p * my + p * p * ey
        },
        onComplete: () => {
          if (!cat.destroyed) cat.visible = false
        },
      })
    }
    if (this._targets.every((x) => x.collected)) this._win(ctx)
  },

  // Krymper bort en insamlad stjärna (exit-säkert; scale-tweens dödas i destroy/_clearLevel).
  _shrinkAway(v) {
    if (!v || v.destroyed) return
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, {
      x: 0,
      y: 0,
      duration: 0.3,
      ease: 'back.in(2)',
      onComplete: () => {
        if (!v.destroyed) v.visible = false
      },
    })
  },

  // Liten fadande gnistpunkt vid hjälten under flykt (exit-säker proxy-tween).
  _dropTrail(ctx) {
    if (!this._hero || this._hero.destroyed) return
    const g = new Graphics().circle(0, 0, 7).fill({ color: 0xffe27a, alpha: 0.85 })
    g.position.set(this._hero.x, this._hero.y)
    g.eventMode = 'none'
    ctx.fxLayer.addChild(g)
    const st = { s: 1, a: 0.85 }
    const tw = gsap.to(st, {
      s: 0.2,
      a: 0,
      duration: 0.5,
      ease: 'power1.out',
      onUpdate: () => {
        if (g.destroyed) {
          tw.kill()
          return
        }
        g.scale.set(st.s)
        g.alpha = st.a
      },
      onComplete: () => {
        if (!g.destroyed) g.destroy()
      },
    })
  },

  _returnHero(ctx) {
    if (!this._alive || this._won) return
    this._mode = 'returning'
    this._launcher.setEnabled(false)
    if (this._heroBody) {
      this._phys.removeBody(this._heroBody)
      this._heroBody = null
    }
    ctx.services.audio.sfx('whoosh')
    if (!this._collectedThisThrow && this._hero && !this._hero.destroyed) wiggle(this._hero)
    gsap.killTweensOf(this._hero)
    gsap.killTweensOf(this._hero.scale)
    this._returnTween = gsap.to(this._hero, {
      x: SLING.x,
      y: SLING.y,
      rotation: 0,
      duration: 0.55,
      ease: 'back.out(1.3)',
      onUpdate: () => {
        if (this._hero?.destroyed) this._returnTween?.kill()
      },
      onComplete: () => {
        if (this._alive) {
          if (!this._hero.destroyed) this._hero.scale.set(1)
          this._ready(ctx)
        }
      },
    })
  },

  // Tillbaka i siktläge — räkna missar och ge hjälp så framgång ALLTID kommer.
  _ready(ctx) {
    if (!this._alive || this._won) return
    this._mode = 'aim'
    this._hero.position.set(SLING.x, SLING.y)
    this._drawBand(SLING.x, SLING.y)

    if (this._collectedThisThrow) this._misses = 0
    else this._misses++
    this._collectedThisThrow = false
    this._assisting = false

    const remaining = this._targets.some((t) => !t.collected)
    if (!remaining) return

    if (this._misses >= 3) {
      this._glideToTarget(ctx)
      return
    }
    this._launcher.setEnabled(true)
    this._idle = 0
    // Hjälpen BJUDER IN i stället för att ersätta: vid miss 2 ritas hjälp-skottets bana ut
    // och en Skjut!-knapp tänds — men hjälten rör sig inte förrän BARNET trycker. Slangbellan
    // är kvar påslagen hela tiden, så det går lika bra att sikta själv i stället.
    if (this._misses >= 2) this._offerAssist(ctx)
  },

  // Hjälp-skott (steg 1): beräkna en nästan-perfekt slangbella-fart mot närmaste mål och
  // ERBJUD den. Handlingen stannar hos barnet — jfr enhorningen-elvira:_placeHelperCloud.
  _offerAssist(ctx) {
    const tgt = this._nearestTarget()
    if (!tgt) return
    const sol = this._solveShot(tgt)
    if (!sol?.pts?.length) return
    this._offer = sol
    this._offerT = 0
    this._drawOfferPath(sol.pts)
    if (this._shootBtn && !this._shootBtn.destroyed) {
      this._shootBtn.visible = true
      this._shootBtn.setEnabled(true)
      gsap.killTweensOf(this._shootBtn.scale)
      this._shootBtn.scale.set(0.6)
      gsap.to(this._shootBtn.scale, { x: 1, y: 1, duration: 0.32, ease: 'back.out(2)' })
    }
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Nästan! Tryck på Skjut så hjälper vi till.')
  },

  // Ligger punkten inom hjältens kropp + studsmolnets radie? Då hade han studsat här.
  _hitsBumper(p) {
    for (const bm of this._bumpers) {
      if (!bm.body) continue
      if (Math.hypot(p.x - bm.x, p.y - bm.y) < (bm.r || 0) + HERO_R) return true
    }
    return false
  },

  // Prickbanan = exakt de punkter _solveShot vann på. Egen Graphics, ingen delad — så en
  // fill/stroke här kan aldrig färga om något annat (jfr den delade-Graphics-fällan).
  _drawOfferPath(pts) {
    const g = this._offerPath
    if (!g || g.destroyed) return
    g.clear()
    // Steget skalas mot banans längd: banan kapas vid målet, så ett fast steg gav bara
    // 4 prickar på ett kort skott — för glest för att läsas som en bana. ~16 prickar alltid.
    const step = Math.max(1, Math.round(pts.length / 16))
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i]
      const f = i / Math.max(1, pts.length - 1)
      // Prickarna VÄXER mot målet i stället för att tona bort — de pekar åt rätt håll.
      g.circle(p.x, p.y, 4 + f * 4).fill({ color: 0xffffff, alpha: 0.55 + f * 0.4 })
    }
    g.visible = true
    // Mjuk puls: med ljudet av bär 🎯-ikonen ensam mindre, så banan får dra ögat i stället.
    gsap.killTweensOf(g)
    g.alpha = 1
    this._pathTween = gsap.to(g, { alpha: 0.5, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Barnet tog över (grepp/sikte) eller skottet gick — plocka bort erbjudandet.
  _clearOffer() {
    this._offer = null
    this._offerT = 0
    this._pathTween?.kill()
    this._pathTween = null
    if (this._offerPath && !this._offerPath.destroyed) {
      this._offerPath.clear()
      this._offerPath.alpha = 1
      this._offerPath.visible = false
    }
    if (this._shootBtn && !this._shootBtn.destroyed) {
      gsap.killTweensOf(this._shootBtn.scale)
      this._shootBtn.visible = false
      this._shootBtn.setEnabled(false)
    }
  },

  // Barnet tryckte Skjut! — samma nästan-perfekta skott som förr, men nu på barnets initiativ.
  _takeOffer(ctx) {
    if (!this._alive || !this._offer || this._mode !== 'aim') return
    const sol = this._offer
    this._clearOffer()
    this._assisting = true
    ctx.services.audio.sfx('whoosh')
    this._fire(ctx, sol.vx, sol.vy)
  },

  // Garanterad hjälp (steg 2): hjälten zippar i en mjuk båge rakt till målet.
  _glideToTarget(ctx) {
    const tgt = this._nearestTarget()
    if (!tgt) return
    this._mode = 'gliding'
    this._combo = 0 // ny insamlingsflykt -> nollställ kombot
    this._trailT = 0
    this._launcher.setEnabled(false)
    this._assisting = true
    this._clearBand()
    if (this._heroBody) {
      this._phys.removeBody(this._heroBody)
      this._heroBody = null
    }
    ctx.services.audio.sfx('thwip')
    ctx.services.audio.sfx('whoosh')
    const sx = this._hero.x
    const sy = this._hero.y
    const midx = (sx + tgt.x) / 2
    const midy = Math.min(sy, tgt.y) - 120 // båge uppåt
    const st = { p: 0 }
    gsap.killTweensOf(this._hero)
    gsap.killTweensOf(this._hero.scale)
    this._glideTween = gsap.to(st, {
      p: 1,
      duration: 0.95,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._hero || this._hero.destroyed) {
          this._glideTween?.kill()
          return
        }
        const p = st.p
        const q = 1 - p
        // Kvadratisk Bézier-båge.
        this._hero.x = q * q * sx + 2 * q * p * midx + p * p * tgt.x
        this._hero.y = q * q * sy + 2 * q * p * midy + p * p * tgt.y
        this._hero.rotation = Math.sin(p * Math.PI) * 0.4
        this._checkCollect(ctx)
      },
      onComplete: () => {
        if (!this._alive) return
        if (this._hero && !this._hero.destroyed) this._hero.rotation = 0
        this._checkCollect(ctx)
        if (!this._won) this._returnHero(ctx)
      },
    })
  },

  _nearestTarget() {
    // Samma regel som insamlingen: hjälpen siktar aldrig på kattungen förrän
    // stjärnorna är tagna (kattungen är finalmål).
    const starsLeft = this._targets.some((s) => s.kind !== 'kitten' && !s.collected)
    let best = null
    let bestD = Infinity
    for (const t of this._targets) {
      if (t.collected) continue
      if (t.kind === 'kitten' && starsLeft) continue
      const d = Math.hypot(t.x - SLING.x, t.y - SLING.y)
      if (d < bestD) {
        bestD = d
        best = t
      }
    }
    return best
  },

  // Sök en slangbella-fart (vinkel+kraft) vars förutsagda bana passerar närmast målet.
  // Söker bästa vinkel+kraft mot målet OCH behåller den vinnande bandes punkter, så att
  // prickbanan vi bjuder in med är EXAKT den bana skottet kommer att flyga (samma
  // predictTrajectory-kalibrering som slangbellans egen förhandsvisning). Ritar vi en egen
  // linje i stället ljuger inbjudan så fort PREVIEW_G/WIND_DIV ändras.
  _solveShot(tgt) {
    const wx = this._windDir * this._windMag
    let best = { vx: 14, vy: -16, pts: null }
    let bestD = Infinity
    for (let power = 12; power <= 28; power += 3) {
      for (let deg = -12; deg >= -82; deg -= 6) {
        const a = (deg * Math.PI) / 180
        const vx = Math.cos(a) * power
        const vy = Math.sin(a) * power
        const pts = predictTrajectory({
          x: SLING.x,
          y: SLING.y,
          vx,
          vy,
          gy: PREVIEW_G,
          wx,
          steps: 130,
          every: 1,
          floorY: BOUNDS.floorY,
          leftX: BOUNDS.leftX,
          rightX: BOUNDS.rightX,
          restitution: BOUNDS.restitution,
          damp: PREVIEW_DAMP,
        })
        // predictTrajectory känner bara golv/väggar — INTE studsknopp/studsmoln. En bana som
        // ser perfekt ut på pappret kan därför studsa bort i verkligheten, och då ljuger
        // inbjudan i exakt det ögonblick den ska bygga tillit. Vi slutar därför läsa en
        // kandidatbana vid första studskontakten: allt efter den punkten är ändå osant.
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]
          if (this._hitsBumper(p)) break
          const d = Math.hypot(p.x - tgt.x, p.y - tgt.y)
          if (d < bestD) {
            bestD = d
            best = { vx, vy, pts: pts.slice(0, i + 1) }
          }
        }
      }
    }
    return best
  },

  // ---- Mål nått: firande + ny nivå ---------------------------------------

  _win(ctx) {
    if (this._won) return
    this._won = true
    this._mode = 'resolving'
    this._clearOffer()
    this._launcher.setEnabled(false)
    this._clearBand()
    this._glideTween?.kill()
    this._returnTween?.kill()
    if (this._heroBody) {
      this._phys.removeBody(this._heroBody)
      this._heroBody = null
    }

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Hurra! Spindelhjälten tog alla stjärnor!')

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    sparkle(ctx.fxLayer, this._hero.x, this._hero.y, { count: 10 })
    if (this._hero && !this._hero.destroyed) {
      gsap.killTweensOf(this._hero.scale)
      gsap.to(this._hero.scale, { x: 1.25, y: 1.25, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' })
      this._heroHangFinish(ctx) // hänger upp-och-ner i sin egen tråd och vinkar
    }

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._loadTimer = gsap.delayedCall(1.8, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // Hjälten reagerar SJÄLV — glad snurr vid insamling, plattad "uff" vid väggstuds
  // och en egen vinst-gest. Alla tre är rena skal/rotations-tweens på hjälte-noden
  // och dödas i destroy tillsammans med de övriga hjälte-tweenarna.
  _heroYay() {
    const h = this._hero
    if (!h || h.destroyed) return
    gsap.killTweensOf(h.scale)
    gsap
      .timeline()
      .to(h.scale, { x: 1.22, y: 0.86, duration: 0.09, ease: 'power2.out' })
      .to(h.scale, { x: 1, y: 1, duration: 0.42, ease: 'elastic.out(1, 0.4)' })
  },

  _heroOof(ctx) {
    const h = this._hero
    if (!h || h.destroyed) return
    gsap.killTweensOf(h.scale)
    gsap
      .timeline()
      .to(h.scale, { x: 1.3, y: 0.72, duration: 0.07, ease: 'power2.out' })
      .to(h.scale, { x: 1, y: 1, duration: 0.36, ease: 'elastic.out(1, 0.45)' })
    floatText(ctx.fxLayer, h.x, h.y - 46, 'Uff!', { fontSize: 34, rise: 40, duration: 0.6 })
  },

  // Spel-specifik finish: hjälten hissas upp i en egen webbtråd, hänger UPP-OCH-NER
  // och vinkar — i stället för att bara skalas upp ovanpå den delade konfettin.
  _heroHangFinish(ctx) {
    const h = this._hero
    if (!h || h.destroyed) return
    const topY = Math.max(120, h.y - 210)
    const thread = new Graphics()
    thread.eventMode = 'none'
    ctx.fxLayer.addChild(thread)
    const st = { y: h.y, rot: h.rotation, sway: 0 }
    const draw = () => {
      if (thread.destroyed) return
      thread.clear().moveTo(h.x, topY - 90).lineTo(h.x, st.y).stroke({ width: 4, color: 0xffffff, alpha: 0.75 })
    }
    this._hangTl?.kill()
    this._hangTl = gsap
      .timeline({
        onUpdate: () => {
          if (h.destroyed) return
          h.y = st.y
          h.rotation = Math.PI + st.sway
          draw()
        },
        onComplete: () => { if (!thread.destroyed) thread.destroy() },
      })
      .to(st, { y: topY, rot: Math.PI, duration: 0.5, ease: 'power2.out' })
      .to(st, { sway: 0.22, duration: 0.5, ease: 'sine.inOut' })
      .to(st, { sway: -0.22, duration: 0.7, ease: 'sine.inOut' })
      .to(st, { sway: 0.12, duration: 0.6, ease: 'sine.inOut' })
  },

  // ---- Kollisioner (boing) ------------------------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const la = pair.bodyA.label
      const lb = pair.bodyB.label
      if (la !== 'hero' && lb !== 'hero') continue
      const other = la === 'hero' ? lb : la
      if (other !== 'wall' && other !== 'bumper') continue
      if (this._t - this._lastBoing > BOING_THROTTLE) {
        this._lastBoing = this._t
        ctx.services.audio.sfx('boing')
        this._heroOof(ctx)
        if (this._hero && !this._hero.destroyed) {
          puff(ctx.fxLayer, this._hero.x, this._hero.y, { count: 5 })
          if (other === 'bumper') {
            const bm = this._bumpers.find((b) => b.body === pair.bodyA || b.body === pair.bodyB)
            if (bm && bm.view && !bm.view.destroyed) pop(bm.view)
          }
        }
      }
    }
  },

  // ---- Slangbella-band + drag-spänning -----------------------------------

  _tension(v) {
    const mag = Math.hypot(v.vx, v.vy) || 1
    const pull = Math.min(mag * 2.4, 66)
    const hx = SLING.x - (v.vx / mag) * pull
    const hy = SLING.y - (v.vy / mag) * pull
    if (this._hero && !this._hero.destroyed) this._hero.position.set(hx, hy)
    this._drawBand(hx, hy)
  },

  _drawBand(hx, hy) {
    const g = this._band
    if (!g || g.destroyed) return
    g.clear()
    const lx = SLING.x - PRONG.dx
    const rx = SLING.x + PRONG.dx
    const py = SLING.y - PRONG.dy
    g.moveTo(lx, py).lineTo(hx, hy).lineTo(rx, py).stroke({ width: 7, color: 0x6b4a2f, alpha: 0.9, cap: 'round' })
  },

  _clearBand() {
    if (this._band && !this._band.destroyed) this._band.clear()
  },

  // ---- Vind: knapp, flagga, drivande pilar -------------------------------

  _buildWindUI(ctx) {
    this._windDirs = [0, 1, -1]
    this._windIdx = 0
    this._fanBtn = new Button({
      icon: '🌬️',
      label: 'Vind',
      width: 210,
      height: 112,
      color: COLORS.teal,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._cycleWind(ctx),
    })
    this._fanBtn.position.set(1130, 648)
    this._root.addChild(this._fanBtn)

    // Ljus pill bakom vind-etiketten: mörk text mot ljus himmel/kulle var svårläst
    // och etiketten svävade bortkopplad från knappen.
    const windPill = new Graphics()
      .roundRect(-64, -26, 128, 52, 26)
      .fill({ color: 0xfffdf7, alpha: 0.92 })
      .stroke({ width: 3, color: 0x000000, alpha: 0.08 })
    windPill.position.set(1130, 566)
    windPill.eventMode = 'none'
    this._root.addChild(windPill)

    this._windArrow = new Text({
      text: 'Av',
      style: { fontFamily: FONT.title, fontSize: 40, fontWeight: '800', fill: COLORS.ink, align: 'center' },
    })
    this._windArrow.anchor.set(0.5)
    this._windArrow.position.set(1130, 566)
    this._windArrow.eventMode = 'none'
    this._root.addChild(this._windArrow)
  },

  _cycleWind(ctx) {
    this._windIdx = (this._windIdx + 1) % this._windDirs.length
    const dir = this._windDirs[this._windIdx]
    this._applyWind(dir)
    floatText(ctx.fxLayer, this._fanBtn.x, this._fanBtn.y - 80, dir === 0 ? '💤' : dir > 0 ? '➡️' : '⬅️', { fontSize: 56 })
    this._idle = 0
  },

  _applyWind(dir) {
    this._windDir = dir
    this._windIdx = this._windDirs ? this._windDirs.indexOf(dir) : 0
    if (this._windIdx < 0) this._windIdx = 0
    const pv = dir * this._windMag
    // matter-vind är accelerations-baserad; dela med stegtid²-faktorn så VERKLIG krökning
    // matchar pricklinjen (annars driver bollen bara ~hälften så långt som linjen visar).
    this._phys?.setWind(pv / WIND_DIV, 0)
    this._launcher?.setPreview({ wind: pv })
    this._updateWindUI()
  },

  _updateWindUI() {
    const c = this._flagCloth
    if (c && !c.destroyed) {
      if (this._windDir === 0) {
        c.scale.x = 0.5
        c.alpha = 0.55
      } else {
        c.scale.x = this._windDir
        c.alpha = 1
      }
    }
    if (this._windArrow && !this._windArrow.destroyed) {
      this._windArrow.text = this._windDir === 0 ? 'Av' : this._windDir > 0 ? '→' : '←'
    }
  },

  _buildFlag() {
    const c = new Container()
    c.position.set(980, 96)
    c.eventMode = 'none'
    const pole = new Graphics().roundRect(-4, 0, 8, 150, 4).fill(0x8a6a44)
    const knob = new Graphics().circle(0, 0, 8).fill(0xffd35c)
    const cloth = new Graphics()
    cloth.moveTo(0, 6).lineTo(70, 18).lineTo(0, 42).fill(COLORS.red)
    cloth.position.set(0, 2)
    this._flagCloth = cloth
    c.addChild(pole, cloth, knob)
    this._flagBaseRot = 0
    this._root.addChild(c)
  },

  _buildChevrons() {
    for (let i = 0; i < 6; i++) {
      const g = new Graphics()
      g.moveTo(-16, -12).lineTo(0, 0).lineTo(-16, 12).stroke({ width: 6, color: 0xffffff, alpha: 0.6, cap: 'round' })
      g.position.set(Math.random() * 1280, 120 + Math.random() * 340)
      g.eventMode = 'none'
      g.visible = false
      this._chevronLayer.addChild(g)
      this._chevrons.push({ g, y: g.y, speed: 90 + Math.random() * 70 })
    }
  },

  _animateDecor(ctx, dt) {
    // Stjärnor guppar mjukt.
    for (const t of this._targets) {
      if (t.collected || !t.view || t.view.destroyed) continue
      t.view.y = t.baseY + Math.sin(this._t * 2 + t.phase) * 5
    }
    // Flaggan vajar.
    if (this._flagCloth && !this._flagCloth.destroyed) {
      this._flagCloth.rotation = Math.sin(this._t * 4) * (this._windDir === 0 ? 0.03 : 0.1)
    }
    // Vind-pilar driver i vindens riktning (annars dolda).
    for (const c of this._chevrons) {
      if (!c.g || c.g.destroyed) continue
      if (this._windDir === 0) {
        c.g.visible = false
        continue
      }
      c.g.visible = true
      c.g.scale.x = this._windDir
      c.g.x += this._windDir * c.speed * dt
      // Wrappa mot synliga ytan (ctx.view) — wrap vid 1340/-60 gav synliga hopp på telefon.
      if (this._windDir > 0 && c.g.x > ctx.view.right + 60) c.g.x = ctx.view.left - 60
      else if (this._windDir < 0 && c.g.x < ctx.view.left - 60) c.g.x = ctx.view.right + 60
    }
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    this._loadTimer?.kill()
    this._returnTween?.kill()
    this._glideTween?.kill()
    this._kittenTween?.kill()
    this._hangTl?.kill()

    for (const t of this._targets) {
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
      }
    }
    this._targets = []

    if (this._hero && !this._hero.destroyed) {
      gsap.killTweensOf(this._hero)
      gsap.killTweensOf(this._hero.scale)
    }
    if (this._flagCloth && !this._flagCloth.destroyed) gsap.killTweensOf(this._flagCloth)
    for (const bm of this._bumpers) {
      if (bm.view && !bm.view.destroyed) gsap.killTweensOf(bm.view.scale)
    }
    // Skjut!-knappens intonings-tween + prickbanans puls. OVILLKORLIGT — en
    // `if (!destroyed)`-vakt hoppar över städningen i exakt det läge då den behövs
    // (se bajs-och-kiss / spara-linjen). Pulsen är dessutom repeat:-1 och måste dö.
    if (this._shootBtn) gsap.killTweensOf(this._shootBtn.scale)
    this._pathTween?.kill()
    if (this._offerPath) gsap.killTweensOf(this._offerPath)

    this._launcher?.destroy()
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Gosig EGEN spindelhjälte: rund röd kropp, blå ben, stora vänliga vita ögon,
// liten webb-symbol och ett leende. (Inte Marvels Spindelmannen.)
function makeHero() {
  const c = new Container()

  const shadow = new Graphics().ellipse(0, HERO_R * 0.98, HERO_R * 0.82, HERO_R * 0.26).fill({ color: 0x000000, alpha: 0.14 })
  shadow.eventMode = 'none'

  // Åtta blå ben (två segment), bakom kroppen.
  const legs = new Graphics()
  const legColor = 0x3f6fd0
  const hip = HERO_R * 0.6
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 4; k++) {
      const ay = -hip * 0.7 + k * (hip * 0.55)
      const x0 = s * HERO_R * 0.66
      const y0 = ay
      const midx = s * HERO_R * 1.28
      const midy = ay - 16 + k * 6
      const tipx = s * HERO_R * 1.52
      const tipy = ay + 20
      legs.moveTo(x0, y0).lineTo(midx, midy).lineTo(tipx, tipy)
    }
  }
  legs.stroke({ width: 9, color: legColor, cap: 'round', join: 'round' })
  // Små runda "skor" på bentopparna.
  const feet = new Graphics()
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 4; k++) {
      const ay = -hip * 0.7 + k * (hip * 0.55)
      feet.circle(s * HERO_R * 1.52, ay + 20, 5).fill(0x2b4fa0)
    }
  }

  // Kropp.
  const body = new Graphics().circle(0, 0, HERO_R).fill(0xe23b3b).stroke({ width: 4, color: 0xb02a2a })
  const belly = new Graphics().ellipse(0, HERO_R * 0.34, HERO_R * 0.62, HERO_R * 0.5).fill({ color: 0xff6b6b, alpha: 0.55 })
  belly.eventMode = 'none'

  // Liten webb-symbol på bröstet (subtil, vit).
  const web = new Graphics()
  const wy = HERO_R * 0.32
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 - 0.9 + (i / 4) * 1.8
    web.moveTo(0, wy).lineTo(Math.cos(a) * HERO_R * 0.5, wy + Math.sin(a) * HERO_R * 0.5)
  }
  web.stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 })
  for (let r = 0.18; r <= 0.5; r += 0.16) {
    web.arc(0, wy, HERO_R * r, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9)
  }
  web.stroke({ width: 1.5, color: 0xffffff, alpha: 0.45 })
  web.eventMode = 'none'

  // Stora vänliga ögon.
  const eyes = new Graphics()
  eyes.ellipse(-16, -10, 15, 19).fill(0xffffff)
  eyes.ellipse(16, -10, 15, 19).fill(0xffffff)
  eyes.stroke({ width: 2, color: 0xcfd8e8 })
  eyes.circle(-13, -6, 7).fill(0x223047)
  eyes.circle(19, -6, 7).fill(0x223047)
  eyes.circle(-11, -9, 3).fill(0xffffff)
  eyes.circle(21, -9, 3).fill(0xffffff)
  eyes.eventMode = 'none'

  // Litet leende.
  const smile = new Graphics()
  smile.moveTo(-11, 16).quadraticCurveTo(0, 27, 11, 16).stroke({ width: 3.5, color: 0x7a1f1f, cap: 'round' })
  smile.eventMode = 'none'

  c.addChild(shadow, legs, feet, body, belly, web, eyes, smile)
  return c
}

// Glittrig stjärna med mjuk glöd.
// RITAD stjärna (P0 ASSETS) — var en ⭐-emoji, är nu den delade i lib/foremal.js.
function makeStar(r = 30) {
  return makeStjarna(r, { konturBredd: r * 0.1, glod: 1.5 })
}

// Instängd kattunge på en liten molnledge, bakom ett litet galler (buren) som
// svänger upp när hon räddas. `c.cat` = kattunge-emojin (hoppar ensam till hjälten),
// `c.openCage()` öppnar buren (exit-säker proxy-tween).
function makeKitten() {
  const c = new Container()
  const glow = new Graphics().circle(0, -6, 52).fill({ color: 0xffe27a, alpha: 0.22 })
  glow.eventMode = 'none'
  const ledge = new Graphics()
  ledge.roundRect(-58, 24, 116, 26, 14).fill(0xffffff)
  ledge.roundRect(-58, 24, 116, 10, 14).fill({ color: 0xdfeefc, alpha: 0.8 })
  ledge.eventMode = 'none'
  // RITAD kattunge (P0 ASSETS) — var en 🐱-emoji.
  const cat = new Container()
  const cg = new Graphics()
  const R = 30
  cg.moveTo(-R * 0.62, -R * 0.4).lineTo(-R * 0.34, -R * 1.06).lineTo(-R * 0.04, -R * 0.42).closePath().fill(0xffb15c)
  cg.moveTo(R * 0.62, -R * 0.4).lineTo(R * 0.34, -R * 1.06).lineTo(R * 0.04, -R * 0.42).closePath().fill(0xffb15c)
  cg.moveTo(-R * 0.5, -R * 0.48).lineTo(-R * 0.34, -R * 0.88).lineTo(-R * 0.16, -R * 0.5).closePath().fill(0xf6c2d3)
  cg.moveTo(R * 0.5, -R * 0.48).lineTo(R * 0.34, -R * 0.88).lineTo(R * 0.16, -R * 0.5).closePath().fill(0xf6c2d3)
  cg.ellipse(0, R * 0.52, R * 0.6, R * 0.5).fill(0xffb15c) // kropp
  cg.moveTo(R * 0.5, R * 0.62).quadraticCurveTo(R * 1.12, R * 0.38, R * 0.92, -R * 0.2)
    .stroke({ width: R * 0.2, color: 0xf59042, cap: 'round' }) // svans
  cg.circle(0, -R * 0.12, R * 0.66).fill(0xffc888) // huvud
  cg.circle(-R * 0.26, -R * 0.18, R * 0.12).fill(0x33291f)
  cg.circle(R * 0.26, -R * 0.18, R * 0.12).fill(0x33291f)
  cg.circle(-R * 0.21, -R * 0.24, R * 0.05).fill(0xffffff)
  cg.circle(R * 0.31, -R * 0.24, R * 0.05).fill(0xffffff)
  cg.moveTo(-R * 0.1, R * 0.02).lineTo(R * 0.1, R * 0.02).lineTo(0, R * 0.14).closePath().fill(0xe79ab0)
  cg.moveTo(-R * 0.06, R * 0.14).quadraticCurveTo(-R * 0.2, R * 0.26, -R * 0.3, R * 0.16)
    .moveTo(R * 0.06, R * 0.14).quadraticCurveTo(R * 0.2, R * 0.26, R * 0.3, R * 0.16)
    .stroke({ width: 3, color: 0x8a5a3b, cap: 'round' })
  cg.circle(-R * 0.44, R * 0.06, R * 0.14).fill({ color: 0xff9ec4, alpha: 0.7 })
  cg.circle(R * 0.44, R * 0.06, R * 0.14).fill({ color: 0xff9ec4, alpha: 0.7 })
  cg.eventMode = 'none'
  cat.addChild(cg)
  cat.eventMode = 'none'
  cat.interactiveChildren = false
  cat.y = -8
  // Bur (galler) framför kattungen.
  const cage = new Container()
  const bars = new Graphics()
  for (let i = -2; i <= 2; i++) bars.moveTo(i * 17, -44).lineTo(i * 17, 22)
  bars.moveTo(-40, -44).lineTo(40, -44)
  bars.moveTo(-40, 22).lineTo(40, 22)
  bars.stroke({ width: 5, color: 0xbfa46a, cap: 'round' })
  cage.addChild(bars)
  cage.eventMode = 'none'
  c.addChild(glow, ledge, cat, cage)
  c.cat = cat
  c.openCage = () => {
    if (cage.destroyed) return
    const st = { rot: 0, a: 1 }
    const tw = gsap.to(st, {
      rot: -1.0,
      a: 0,
      duration: 0.4,
      ease: 'back.in(1.4)',
      onUpdate: () => {
        if (cage.destroyed) {
          tw.kill()
          return
        }
        cage.rotation = st.rot
        cage.alpha = st.a
      },
      onComplete: () => {
        if (!cage.destroyed) cage.visible = false
      },
    })
  }
  return c
}

// Passivt studsmoln (mjukt vitt moln som hjälten studsar på — fyller luften).
// Studsmoln. Såg tidigare EXAKT ut som ängens dekor-moln, så ingen kunde se vilka som
// studsade — bumper-molnen lästes som bakgrund. De bär nu en egen tell: en krans av små
// blå studsprickar runt kanten och två uppåtpilar i mitten (samma "studsa hit"-språk som
// studsknoppen). Varje form är en EGEN Graphics — flera former i en enda Graphics tar
// första fyllningens färg, och `.arc()` efter `.stroke()` läcker streck över hela scenen.
function makeCloudBumper(r) {
  const c = new Container()
  const shade = new Graphics().circle(0, r * 0.28, r * 0.72).fill({ color: 0xcfe4fa, alpha: 0.7 })
  const puffAt = (dx, dy, rr) => new Graphics().circle(dx, dy, rr).fill(0xffffff)
  c.addChild(
    shade,
    puffAt(-r * 0.52, r * 0.1, r * 0.58),
    puffAt(r * 0.52, r * 0.14, r * 0.54),
    puffAt(0, -r * 0.18, r * 0.82),
    puffAt(0, r * 0.24, r * 0.72),
  )
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const dot = new Graphics().circle(Math.cos(a) * r * 1.02, Math.sin(a) * r * 0.86, 5).fill(0x7cc4f5)
    c.addChild(dot)
  }
  const chev = (dy) => {
    const g = new Graphics()
    g.moveTo(-r * 0.26, dy).lineTo(0, dy - r * 0.24).lineTo(r * 0.26, dy)
    g.stroke({ width: 6, color: 0x4ea8e8, cap: 'round', join: 'round' })
    return g
  }
  c.addChild(chev(r * 0.16), chev(r * 0.42))
  return c
}

// Flytande studsknopp (springig disk).
function makeBumper(r) {
  const c = new Container()
  const outer = new Graphics().circle(0, 0, r).fill(sphereFill(0xffb24d)).stroke({ width: 6, color: 0xe07b1e })
  const inner = new Graphics().circle(0, 0, r * 0.58).fill(0xffe1a8)
  const star = new Graphics()
  if (star.star) star.star(0, 0, 8, r * 0.42, r * 0.2).fill({ color: 0xff8a3d, alpha: 0.7 })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.26).fill({ color: 0xffffff, alpha: 0.5 })
  c.addChild(outer, inner, star, gloss)
  return c
}

// Slangbella: två trä-prongar i ett V.
function makeSlingshot() {
  const c = new Container()
  const g = new Graphics()
  // Stam.
  g.roundRect(-9, 0, 18, 70, 9).fill(0x8a5a2f).stroke({ width: 3, color: 0x6b4422 })
  // Vänster + höger prong upp till spetsarna.
  g.moveTo(-6, 6)
    .lineTo(-PRONG.dx, -PRONG.dy)
    .stroke({ width: 16, color: 0x9a6a3a, cap: 'round' })
  g.moveTo(6, 6)
    .lineTo(PRONG.dx, -PRONG.dy)
    .stroke({ width: 16, color: 0x9a6a3a, cap: 'round' })
  // Prong-spetsar (knoppar där bandet fäster).
  g.circle(-PRONG.dx, -PRONG.dy, 9).fill(0x7a4f2a)
  g.circle(PRONG.dx, -PRONG.dy, 9).fill(0x7a4f2a)
  c.addChild(g)
  return c
}
