// Bobos Bowling — top-down fysik-bowling (3–5 år). Barnet SIKTAR (riktning) +
// LADDAR (kraft) genom att dra det tunga klotet bakåt (slangbella) och släppa —
// klotet rullar uppför banan och välter käglorna 🎳 med riktig matter.js-fysik
// (kollision + momentum). MÅL: slå ALLA käglor. TVÅ kontroller styr utfallet:
//   (a) sikte + kraft via dragvektorn (AimLauncher, prickad bana visar flykten),
//   (b) en BUMPER-knapp (Kantstöd): på = lysande studsräcken längs kanterna så
//       klotet aldrig hamnar i rännstenen; av = öppen bana men mjuk auto-hjälp.
// INGET misslyckande: med bumper PÅ studsar klotet tillbaka in mot käglorna; med
// bumper AV räddar en glad "vindpust" + knuff de sista käglorna. Varje kast slutar
// i en fullträff att fira. Maskoten Bobo hejar vid kast och jublar vid strike.
//
// Kalibrering (uppmätt mot matter vid fast 1/60-steg): top-down => gravityY = 0, så
// previewGravity = 0.2778 × 0 = 0 (rak pricklinje). Klotets frictionAir = 0.012 dämpar
// farten ~(1 - 0.012) per steg, så previewDamp = 1 - 0.012 = 0.988 får pricklinjen att
// bromsa in på exakt samma punkt som klotet. Skott-farten (Body.setVelocity) är samma
// vektor som launchern matar förhandsvisningen med, och bounds = väggarnas inneryta +
// klotradien, så den prickade banan följer klotets verkliga, raka, lätt-bromsande
// studsbana (mot bumper-/rännstenskanterna) till ~några px. Allt ritas programmatiskt.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, nudge, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { createScene } from '../../lib/scene.js'
import { bigCelebration, burst, puff, sparkle, pop } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Layout (designkoordinater 1280×720) ---
const BALL_R = 46
const BALL_START = { x: 640, y: 600 }
const BALL_FA = 0.012 // klotets frictionAir -> previewDamp = 1 - BALL_FA
const PIN_R = 26 // kägel-kroppens radie (mindre än emojin, men välter realistiskt)
const KNOCK_DIST = 38 // förskjutning (px) innan en kägla räknas som vält
const BOBO_POS = { x: 150, y: 612 }

export default {
  id: 'bowling',
  titleSv: 'Bobos Bowling',
  icon: '🎳',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'bowling',
  voiceIntro: 'Dra klotet bakåt och släpp — slå alla käglor!',

  init(ctx) {
    this._alive = true
    this._phase = 'aim' // aim | rolling | helping | strike
    this._resolving = false
    this._bumperOn = true
    this._bumperBodies = []
    this._rails = []
    this._pins = []
    this._meterDots = []
    this._standingCount = 0
    this._pinCenter = { x: 640, y: 300 }
    this._idle = 0
    this._rollT = 0
    this._restT = 0
    this._lastPinSound = 0
    this._pinSoundN = 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: top-down => INGEN gravitation, inga standardväggar (vi bygger egna).
    this._phys = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })

    this._buildScene(ctx)
    this._buildLaneWalls()

    // Klot-kropp: tungt (mycket momentum genom käglorna) men mjukt bromsat av luften.
    // Lås tröghetsmomentet så klotets vita högdager/skugga inte snurrar (toppvy-puck).
    this._ballBody = this._phys.circle(BALL_START.x, BALL_START.y, BALL_R, {
      ...MATERIALS.heavy,
      frictionAir: BALL_FA,
      label: 'ball',
    })
    Body.setInertia(this._ballBody, Infinity)
    this._phys.link(this._ballBody, this._ball)

    // Sikte + kraft (slangbella): dra klotet NEDÅT/bakåt -> det skjuts UPPÅT mot käglorna.
    this._launcher = new AimLauncher({
      target: this._ball,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: true,
      maxPower: 30,
      minPower: 9,
      powerScale: 0.16,
      hitRadius: 90,
      tapPower: 0.62, // litet tryck -> ~62% kraft mot kägeltriangelns front (träffar alltid)
      trailColor: COLORS.blue,
      previewGravity: 0, // top-down: ingen nedåtkurva i pricklinjen
      previewWind: 0,
      previewDamp: 1 - BALL_FA, // = klotets luftbroms -> linjen stannar där klotet stannar
      bounds: this._previewBounds(),
      getOrigin: () => ({ x: this._ball.x, y: this._ball.y }),
      defaultAim: () => ({ x: this._pinCenter.x, y: this._pinCenter.y }),
      onGrab: () => {
        this._idle = 0
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      },
      onAim: () => {
        this._idle = 0
      },
      onLaunch: (v) => this._fire(ctx, v),
    })

    // Klotet överst (ovanför pricklinjen, käglorna och banan).
    this._root.addChild(this._ball)

    this._loadLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen --------------------------------------------------------

  _buildScene(ctx) {
    // Varm bowlinghall-bakgrund som FÖRSTA barn.
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height, ground: false }))

    // Osynlig fångare: tomma tryck ger en liten glad puff (varje pekning syns).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onTapField = (e) => {
      if (!this._alive || this._phase !== 'aim') return
      const p = this._root.toLocal(e.global)
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, p.x, p.y, { count: 3 })
      this._idle = 0
    }
    this._catcher.on('pointertap', this._onTapField)
    this._root.addChild(this._catcher)

    // Rännstenar (dekor) — mörka kanaler utanför banan.
    const gutters = new Graphics()
    gutters.roundRect(300, 110, 44, 580, 18).fill({ color: COLORS.brown, alpha: 0.3 })
    gutters.roundRect(936, 110, 44, 580, 18).fill({ color: COLORS.brown, alpha: 0.3 })
    gutters.eventMode = 'none'
    this._root.addChild(gutters)

    // Banan: ljus, glansig rektangel med mitt-glansstrimma.
    const lane = new Graphics()
      .roundRect(340, 110, 600, 580, 28)
      .fill(COLORS.cream)
      .stroke({ width: 8, color: COLORS.yellow })
    lane.roundRect(620, 120, 40, 560, 20).fill({ color: 0xffffff, alpha: 0.35 })
    lane.eventMode = 'none'
    this._root.addChild(lane)

    // Bumper-räcken (toggle-visuella): lysande staplar precis innanför rännstenarna.
    const railL = new Graphics().roundRect(346, 130, 14, 540, 7).fill({ color: COLORS.blue })
    const railR = new Graphics().roundRect(920, 130, 14, 540, 7).fill({ color: COLORS.blue })
    railL.eventMode = 'none'
    railR.eventMode = 'none'
    this._rails = [railL, railR]
    this._root.addChild(railL, railR)

    // Lager för käglor (under klotet, ovanför banan).
    this._pinLayer = new Container()
    this._pinLayer.eventMode = 'none'
    this._root.addChild(this._pinLayer)

    // Klot (skapas men läggs överst i init efter launchern).
    this._ball = makeBall()
    this._ball.position.set(BALL_START.x, BALL_START.y)
    this._root.addChild(this._ball)

    // Kägelmätare uppe till vänster.
    this._meterLayer = new Container()
    this._meterLayer.position.set(150, 150)
    this._meterLayer.eventMode = 'none'
    this._root.addChild(this._meterLayer)

    // Bumper-knapp nere till höger.
    this._bumperBtn = new Button({
      icon: '🛟',
      label: 'Kantstöd',
      width: 160,
      height: 132,
      color: COLORS.teal,
      stacked: true,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._toggleBumper(ctx),
    })
    this._bumperBtn.position.set(1130, 626)
    this._root.addChild(this._bumperBtn)

    // Maskoten Bobo nere till vänster (hejar/jublar).
    this._bobo = makeMascot(58)
    this._bobo.position.set(BOBO_POS.x, BOBO_POS.y)
    this._root.addChild(this._bobo)
  },

  // Två tjocka, statiska lane-väggar (alltid på) vid banans yttergräns (rännstenens utsida).
  _buildLaneWalls() {
    this._phys.rectangle(312, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
    this._phys.rectangle(968, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
  },

  // Förhandsvisningens väggar (klotets MITT studsar här). Med bumper PÅ smalnar fältet
  // (klotet studsar in mot käglorna). Värden = väggkropparnas inneryta + klotradien, så
  // pricklinjen matchar klotets verkliga studs.
  _previewBounds() {
    return this._bumperOn
      ? { leftX: 368 + BALL_R, rightX: 912 - BALL_R, restitution: 0.75 } // bumper-inneryta 368/912
      : { leftX: 324 + BALL_R, rightX: 956 - BALL_R, restitution: 0.2 } // lane-väggens inneryta 324/956
  },

  // ---- Nivå ----------------------------------------------------------------

  // Triangel, apex (huvudkägla) närmast barnet (störst y). Rader 60px isär, käglor 64px.
  _pinLayout(level) {
    let pts
    if (level <= 1) {
      pts = [
        { x: 640, y: 300 },
        { x: 596, y: 236 },
        { x: 684, y: 236 },
      ]
    } else if (level <= 3) {
      pts = [
        { x: 640, y: 310 },
        { x: 608, y: 250 },
        { x: 672, y: 250 },
        { x: 576, y: 190 },
        { x: 640, y: 190 },
        { x: 704, y: 190 },
      ]
    } else {
      pts = [
        { x: 640, y: 330 },
        { x: 608, y: 270 },
        { x: 672, y: 270 },
        { x: 576, y: 210 },
        { x: 640, y: 210 },
        { x: 704, y: 210 },
        { x: 544, y: 150 },
        { x: 608, y: 150 },
        { x: 672, y: 150 },
        { x: 736, y: 150 },
      ]
      if (level >= 6) pts = pts.map((p) => ({ x: p.x + (Math.random() * 12 - 6), y: p.y + (Math.random() * 12 - 6) }))
    }
    return pts
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._phase = 'aim'
    this._resolving = false
    this._rollT = 0
    this._restT = 0
    this._idle = 0
    this._helpTimer?.kill()
    this._phys.setWind(0, 0)

    // Rensa gamla käglor (kroppar + vyer).
    for (const p of this._pins) {
      this._phys.removeBody(p.body)
      if (p.view && !p.view.destroyed) {
        gsap.killTweensOf(p.view)
        gsap.killTweensOf(p.view.scale)
        p.view.destroy()
      }
    }
    this._pins = []

    // Bygg ny triangel.
    const layout = this._pinLayout(level)
    let front = layout[0]
    for (const pos of layout) {
      if (pos.y > front.y) front = pos
      const view = makePin()
      view.position.set(pos.x, pos.y)
      this._pinLayer.addChild(view)
      const body = this._phys.circle(pos.x, pos.y, PIN_R, { ...MATERIALS.light, frictionAir: 0.02, label: 'pin' })
      this._phys.link(body, view)
      this._pins.push({ body, view, sx: pos.x, sy: pos.y, down: false })
      view.scale.set(0)
      gsap.to(view.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' })
    }
    this._standingCount = this._pins.length
    this._pinCenter = { x: front.x, y: front.y } // sikta på huvudkäglan vid tap-fallback

    // Återställ klotet till start.
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setPosition(this._ballBody, { x: BALL_START.x, y: BALL_START.y })
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball.scale)
      this._ball.scale.set(1)
      this._ball.position.set(BALL_START.x, BALL_START.y)
    }

    this._drawMeter()

    // Bumper-default per nivå: PÅ för låga nivåer (lär ut kastet), AV från nivå 4.
    this._setBumper(ctx, level <= 3, { silent: true })

    this._launcher?.setEnabled(true)
    if (this._ball && !this._ball.destroyed) pop(this._ball)
  },

  // ---- Kägelmätare ---------------------------------------------------------

  _drawMeter() {
    const layer = this._meterLayer
    if (!layer || layer.destroyed) return
    for (const d of this._meterDots) {
      if (d && !d.destroyed) {
        gsap.killTweensOf(d)
        d.destroy()
      }
    }
    this._meterDots = []
    const total = this._pins.length
    const perRow = 5
    const gap = 34
    const rowGap = 38
    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / perRow)
      const inRow = Math.min(perRow, total - row * perRow)
      const col = i % perRow
      const d = new Text({ text: '🎳', style: { fontFamily: FONT.body, fontSize: 30 } })
      d.anchor.set(0.5)
      d.position.set((col - (inRow - 1) / 2) * gap, row * rowGap)
      d.eventMode = 'none'
      d.alpha = this._pins[i].down ? 0.26 : 1
      layer.addChild(d)
      this._meterDots.push(d)
    }
  },

  // ---- Kontroll: bumper (Kantstöd) -----------------------------------------

  _toggleBumper(ctx) {
    this._setBumper(ctx, !this._bumperOn)
    ctx.services.voice.say(this._bumperOn ? 'Kantstöd på!' : 'Kantstöd av!')
  },

  // Sätt bumper på/av: lägg till/ta bort de studsiga väggkropparna, tända/släck räckena,
  // och uppdatera pricklinjens bounds så förhandsvisningen matchar de nya kanterna.
  _setBumper(ctx, on, { silent = false } = {}) {
    this._bumperOn = on

    if (on && this._bumperBodies.length === 0) {
      const l = this._phys.rectangle(360, 400, 16, 540, { isStatic: true, restitution: 0.75, friction: 0.1, label: 'bumper' })
      const r = this._phys.rectangle(920, 400, 16, 540, { isStatic: true, restitution: 0.75, friction: 0.1, label: 'bumper' })
      this._bumperBodies = [l, r]
    } else if (!on && this._bumperBodies.length) {
      for (const b of this._bumperBodies) this._phys.removeBody(b)
      this._bumperBodies = []
    }

    // Räcken: lys upp (alpha 1 + mjuk glöd-puls) när PÅ, tona ned (0.12) när AV.
    this._railTween?.kill()
    for (const rail of this._rails) {
      if (!rail || rail.destroyed) continue
      gsap.killTweensOf(rail)
      gsap.to(rail, { alpha: on ? 1 : 0.12, duration: 0.25 })
    }
    if (on) {
      this._railTween = gsap.to(this._rails, { alpha: 0.66, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.25 })
    }

    // Pricklinjen följer de nya väggarna.
    this._launcher?.setPreview({ bounds: this._previewBounds() })

    if (!silent) {
      ctx.services.audio.sfx('pop')
      if (this._bumperBtn && !this._bumperBtn.destroyed) pop(this._bumperBtn)
    }
  },

  // ---- Kast ----------------------------------------------------------------

  _fire(ctx, v) {
    if (!this._alive || this._phase !== 'aim') return
    this._phase = 'rolling'
    this._rollT = 0
    this._restT = 0
    this._idle = 0
    this._launcher.setEnabled(false)

    // Säkerhets-clamp på max-fart (launchern clampar redan, men var extra säker).
    let vx = v.vx
    let vy = v.vy
    const sp = Math.hypot(vx, vy)
    if (sp > 30) {
      const k = 30 / sp
      vx *= k
      vy *= k
    }
    nudge(this._ballBody, vx, vy) // launchern spelar 'whoosh'
    this._boboCheer()
    if (this._ball && !this._ball.destroyed) puff(ctx.fxLayer, this._ball.x, this._ball.y, { count: 5, color: COLORS.blue })
  },

  // En kägla välte -> ljud (var 3:e 'pling', annars 'pop'), puff, tona mätarpricken.
  _knockPin(ctx, i) {
    const p = this._pins[i]
    if (!p || p.down) return
    p.down = true
    this._standingCount--

    const now = performance.now()
    if (now - this._lastPinSound > 110) {
      this._lastPinSound = now
      this._pinSoundN = (this._pinSoundN + 1) % 3
      ctx.services.audio.sfx(this._pinSoundN === 0 ? 'pling' : 'pop')
    }
    if (p.view && !p.view.destroyed) puff(ctx.fxLayer, p.view.x, p.view.y, { count: 6, color: COLORS.yellow })
    const dot = this._meterDots[i]
    if (dot && !dot.destroyed) {
      gsap.killTweensOf(dot)
      gsap.to(dot, { alpha: 0.26, duration: 0.3 })
    }

    if (this._standingCount <= 0) this._strike(ctx)
  },

  // Auto-hjälp (no-fail): kastet är klart men käglor står kvar -> en glad vindpust mot de
  // kvarvarande + en knuff som garanterat välter dem. Knock-detektionen fångar fallet ->
  // strike firas ändå. Ser ut som en rolig pust, känns aldrig som fusk.
  _autoHelp(ctx) {
    if (!this._alive || this._phase === 'strike') return
    this._phase = 'helping'
    const remaining = this._pins.filter((p) => !p.down)
    if (remaining.length === 0) {
      this._strike(ctx)
      return
    }
    const avgX = remaining.reduce((s, p) => s + p.body.position.x, 0) / remaining.length
    const dir = avgX < 640 ? -1 : 1
    this._phys.setWind(0.0006 * dir, -0.0004)
    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('Nästan! Pust — där föll de!')
    for (const p of remaining) {
      const ang = Math.random() * Math.PI * 2
      nudge(p.body, Math.cos(ang) * 9, Math.sin(ang) * 9 - 3) // garanterar förskjutning > KNOCK_DIST
      if (p.view && !p.view.destroyed) sparkle(ctx.fxLayer, p.view.x, p.view.y, { count: 5 })
    }
    // Nollställ vinden strax; eventuella eftersläntrare tippas direkt (garanterad strike).
    this._helpTimer?.kill()
    this._helpTimer = gsap.delayedCall(1.0, () => {
      if (!this._alive) return
      this._phys.setWind(0, 0)
      if (this._phase === 'helping') {
        for (let i = 0; i < this._pins.length; i++) if (!this._pins[i].down) this._knockPin(ctx, i)
      }
    })
  },

  // ---- Strike: firande + nästa nivå ----------------------------------------

  _strike(ctx) {
    if (this._phase === 'strike' || this._resolving) return
    this._resolving = true
    this._phase = 'strike'
    this._launcher.setEnabled(false)
    this._helpTimer?.kill()
    this._phys.setWind(0, 0)

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE) + ' Alla käglor!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, 640, 300, { count: 18 })
    this._boboJump()

    const cur = ctx.progress.get()
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('strikes', (cur.custom?.strikes || 0) + 1)
    ctx.progress.complete()
    this._level += 1

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(1.8, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Bobo ----------------------------------------------------------------

  _boboCheer() {
    if (this._bobo && !this._bobo.destroyed) pop(this._bobo)
  },

  _boboJump() {
    const b = this._bobo
    if (!b || b.destroyed) return
    gsap.killTweensOf(b)
    gsap
      .timeline()
      .to(b, { y: BOBO_POS.y - 46, duration: 0.22, ease: 'power2.out' })
      .to(b, { y: BOBO_POS.y, duration: 0.4, ease: 'bounce.out' })
    pop(b)
  },

  // ---- Ticker: fysik, vält-detektion, kast-klart, idle ---------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._phys.update(ticker.deltaMS)

    // Vält-detektion (under kast eller auto-hjälp): positionsförskjutning = robustast.
    if (this._phase === 'rolling' || this._phase === 'helping') {
      for (let i = 0; i < this._pins.length; i++) {
        const p = this._pins[i]
        if (p.down) continue
        const dx = p.body.position.x - p.sx
        const dy = p.body.position.y - p.sy
        if (dx * dx + dy * dy > KNOCK_DIST * KNOCK_DIST || p.body.speed > 6.5) this._knockPin(ctx, i)
      }
    }

    // Kast klart? (klotet passerar toppen ELLER har stannat). Står käglor kvar -> auto-hjälp.
    if (this._phase === 'rolling') {
      const b = this._ballBody
      this._rollT += dt
      const spd = Math.hypot(b.velocity.x, b.velocity.y)
      if (spd < 0.4) this._restT += dt
      else this._restT = 0
      if (b.position.y < 110 || this._restT > 0.6 || this._rollT > 6) {
        if (this._standingCount > 0) this._autoHelp(ctx)
      }
    }

    // Idle-recue: stilla för länge -> upprepa instruktionen + en puls på klotet.
    if (this._phase === 'aim') {
      this._idle += dt
      if (this._idle >= 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        if (this._ball && !this._ball.destroyed) pop(this._ball)
      }
    }
  },

  // ---- Städning (exit-säkert) ----------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._launcher?.destroy()
    this._nextTimer?.kill()
    this._helpTimer?.kill()
    this._railTween?.kill()

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onTapField)
    if (this._ball && !this._ball.destroyed) {
      gsap.killTweensOf(this._ball)
      gsap.killTweensOf(this._ball.scale)
    }
    for (const rail of this._rails) if (rail && !rail.destroyed) gsap.killTweensOf(rail)
    for (const p of this._pins) {
      if (p.view && !p.view.destroyed) {
        gsap.killTweensOf(p.view)
        gsap.killTweensOf(p.view.scale)
      }
    }
    for (const d of this._meterDots) if (d && !d.destroyed) gsap.killTweensOf(d)
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    if (this._bumperBtn && !this._bumperBtn.destroyed) gsap.killTweensOf(this._bumperBtn.scale)

    this._phys?.setWind?.(0, 0)
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Glansigt blått klot: markskugga + glansig cirkel + vit högdager + 3 fingerhål.
function makeBall() {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, 52, 44, 15).fill({ color: 0x000000, alpha: 0.18 })
  const body = new Graphics().circle(0, 0, BALL_R).fill(COLORS.blue).stroke({ width: 4, color: 0x2c7cb5 })
  const hi = new Graphics().circle(-14, -14, 14).fill({ color: 0xffffff, alpha: 0.6 })
  const holes = new Graphics()
  holes.circle(3, -7, 5).fill({ color: 0x1f5a86 })
  holes.circle(14, 3, 5).fill({ color: 0x1f5a86 })
  holes.circle(1, 11, 5).fill({ color: 0x1f5a86 })
  shadow.eventMode = 'none'
  body.eventMode = 'none'
  hi.eventMode = 'none'
  holes.eventMode = 'none'
  c.addChild(shadow, body, hi, holes)
  c.hitArea = new Circle(0, 0, 90) // ≥96px osynlig träffyta (launchern sätter samma)
  return c
}

// En kägla: mjuk skuggellips + 🎳 emoji. Containern roteras av matter-länken när den välts.
function makePin() {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, 28, 24, 10).fill({ color: 0x000000, alpha: 0.16 })
  shadow.eventMode = 'none'
  const e = new Text({ text: '🎳', style: { fontFamily: FONT.body, fontSize: 72 } })
  e.anchor.set(0.5)
  e.eventMode = 'none'
  c.addChild(shadow, e)
  c.eventMode = 'none'
  return c
}
