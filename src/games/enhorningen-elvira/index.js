// Enhörningen Elvira — fysik-placeringspussel (3–5 år). Elvira är en söt enhörning
// (vit/pastell kropp, regnbågsman & svans, gyllene horn, stora ögon). Barnet DRAR
// fluffiga studsmoln ☁️ ut i luften (ett förlåtande drag var, mjuk snäpp) — de blir
// statiska, mycket studsiga plattformar. Sedan trycker barnet på "Hoppa!" (eller på
// Elvira) så hoppar hon iväg som en matter.js-kropp, faller under gravitation och
// STUDSAR mot molnen med fart mot MÅLET: regnbågen 🌈, och plockar glittrande
// ädelstenar 💎/⭐ på vägen. Når hon regnbågen -> firande + nästa nivå.
//
// EXTRA KONTROLL: en stor knapp som växlar Elvira "lätt 🪶 / tung 🪨" (ändrar
// gravitation + massa -> hon faller flygigt eller snabbt, helt annan studsbana).
// På högre nivåer dyker en mild vind-knapp upp (medvind/motvind).
//
// INGET MISSLYCKANDE: landar hon utan att nå målet svävar hon mjukt tillbaka till
// start så barnet kan flytta molnen och prova igen; efter ett par försök hjälper
// spelet henne i en mjuk båge ända fram. Alltid jubel, aldrig "game over".
//
// Allt ritas programmatiskt (Pixi Graphics + emoji) — inga filer. Exit-säkert.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body, predictTrajectory } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { Button } from '../../lib/Button.js'
import { bigCelebration, puff, sparkle, floatText, pop, breathe, ripple } from '../../lib/feedback.js'
import { COLORS, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

// --- Layout (designkoordinater 1280×720) ---------------------------------
const START = { x: 185, y: 165 } // Elviras starthörn (uppe till vänster)
const ELVIRA_R = 46 // fysikradie
const ELVIRA_HALO = 88 // osynlig träffradie (tryck-på-Elvira => hoppa)
const GROUND_TOP = 600 // markens ovansida (egen golv-kropp); botten = kontrollpanel
const PLACE_LINE_Y = 560 // släpps molnet ovanför -> placeras i luften, annars i facket
const CLOUD_W = 132
const CLOUD_H = 46
const GEM_HIT = 66 // plock-radie för ädelsten
const GOAL_R = 96 // når-radie för regnbågen
const LAUNCH_VX = 6.6 // start-fart framåt (höger) vid hopp
const MAXV = 21 // hastighetstak
const MINB = 7 // garanterad min-studs uppåt vid molnträff (livfullt + no-fail)
const SETTLE_SPEED = 0.7
const SETTLE_HOLD = 0.9 // s stillastående innan "landat"
const IDLE_DELAY = 6
const BOING_THROTTLE = 0.12

// Vikt-lägen (extra kontroll). Bara Elvira är dynamisk, så global gravitation
// påverkar bara henne. Lätt = flygig båge, tung = snabbt fall & längre kast.
const WEIGHTS = [
  { key: 'latt', icon: '🪶', label: 'Lätt', color: COLORS.teal, gravity: 0.8, density: 0.0006, frictionAir: 0.02, launchVy: -5.2, voice: 'Nu är Elvira lätt som en fjäder!' },
  { key: 'tung', icon: '🪨', label: 'Tung', color: COLORS.purple, gravity: 1.55, density: 0.003, frictionAir: 0.008, launchVy: -3.6, voice: 'Nu är Elvira tung och faller snabbt!' },
]

// Vind-lägen (mild, dyker upp på högre nivåer).
const WINDS = [
  { icon: '🍃', label: 'Lugnt', color: COLORS.green, ax: 0, voice: 'Ingen vind nu.' },
  { icon: '➡️', label: 'Medvind', color: COLORS.blue, ax: 0.16, voice: 'En bris blåser åt höger!' },
  { icon: '⬅️', label: 'Motvind', color: COLORS.orange, ax: -0.16, voice: 'En bris blåser åt vänster!' },
]

const RAINBOW = [0xff5d5d, 0xffa53d, 0xffe14d, 0x6bd66b, 0x5db4ff, 0xb487ff]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'enhorningen-elvira',
  titleSv: 'Enhörningen Elvira',
  icon: '🦄',
  category: 'fysik',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'enhorningen-elvira',
  voiceIntro: 'Hjälp Elvira att studsa till regnbågen!',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._t = 0
    this._idle = 0
    this._flyT = 0
    this._settleT = 0
    this._tries = 0
    this._state = 'placing' // placing | flying | returning | help | win
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._weightIdx = 0
    this._weight = WEIGHTS[0]
    this._windIdx = 0
    this._windAx = 0
    this._clouds = []
    this._gems = []
    this._tweens = []
    this._lastBoing = -1
    this._elviraBody = null
    this._goalPos = { x: 1040, y: 470 }

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysikvärld: egna golv (högre upp) + sidoväggar + tak (håller Elvira i bild).
    this._phys = new PhysicsWorld({ gravityY: this._weight.gravity, walls: ['left', 'right', 'ceiling'] })
    this._phys.rectangle(DESIGN_W / 2, GROUND_TOP + 70, DESIGN_W + 600, 140, { isStatic: true, restitution: 0.32, friction: 0.7, label: 'ground' })
    this._unbindCollision = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildScene(ctx)
    this._buildRainbow()
    this._buildElvira(ctx)
    this._buildClouds(ctx)
    this._buildControls(ctx)

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
    this._root.addChild(createScene('candy', { width: ctx.width, height: ctx.height }))

    // Osynlig fångare för tomma tryck (mjuk ring + ljud, aldrig en bestraffning).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onEmptyTap = (e) => {
      if (e.target !== this._catcher) return // bara äkta tomma tryck
      if (this._state === 'flying' || this._state === 'help') return
      const p = this._root.toLocal(e.global)
      ctx.services.audio.sfx('soft')
      ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 64 })
    }
    this._catcher.on('pointertap', this._onEmptyTap)
    this._root.addChild(this._catcher)

    // Markremsa (under spelytan) — bär facket + knapparna.
    const ground = new Graphics()
    ground.roundRect(-40, GROUND_TOP, ctx.width + 80, ctx.height - GROUND_TOP + 60, 40).fill(0xbfe7c4)
    ground.roundRect(-40, GROUND_TOP, ctx.width + 80, 16, 40).fill({ color: 0x8fd6a0, alpha: 0.7 })
    ground.eventMode = 'none'
    this._root.addChild(ground)

    // En liten "molnhylla"-etikett vid facket.
    const tray = new Graphics()
    tray.roundRect(70, 626, 470, 78, 26).fill({ color: 0xffffff, alpha: 0.35 })
    tray.eventMode = 'none'
    this._root.addChild(tray)

    // Prickad bansiktslinje (uppdateras när vikt/vind ändras eller moln läggs).
    this._preview = new Graphics()
    this._preview.eventMode = 'none'
    this._root.addChild(this._preview)
  },

  _buildRainbow() {
    this._rainbow = makeRainbow()
    this._rainbow.position.set(this._goalPos.x, this._goalPos.y)
    this._root.addChild(this._rainbow)
    this._rainbowTween = breathe(this._rainbow, { scale: 1.06, duration: 1.3 })
    this._tweens.push(this._rainbowTween)

    // Lager för ädelstenar (byggs om per nivå).
    this._gemLayer = new Container()
    this._gemLayer.eventMode = 'none'
    this._gemLayer.interactiveChildren = false
    this._root.addChild(this._gemLayer)
  },

  _buildElvira(ctx) {
    this._elvira = drawUnicorn()
    this._elvira.position.set(START.x, START.y)
    this._elvira.eventMode = 'static'
    this._elvira.cursor = 'pointer'
    this._elvira.hitArea = new Circle(0, 0, ELVIRA_HALO)
    this._onElviraTap = () => {
      if (this._state !== 'placing') return
      this._launch(ctx)
    }
    this._elvira.on('pointertap', this._onElviraTap)
    this._root.addChild(this._elvira)
  },

  _buildClouds(ctx) {
    this._cloudLayer = new Container()
    this._root.addChild(this._cloudLayer)
    // En fast pool på 3 moln; nivån visar så många som tillåts.
    this._onCloudMove = (e) => this._cloudMove(e)
    this._onCloudUp = (e) => this._cloudUp(ctx, e)
    for (let i = 0; i < 3; i++) {
      const view = makeCloudView()
      view.eventMode = 'static'
      view.cursor = 'pointer'
      view.hitArea = new Rectangle(-CLOUD_W / 2 - 22, -CLOUD_H / 2 - 22, CLOUD_W + 44, CLOUD_H + 44)
      const cloud = { view, home: { x: 0, y: 0 }, body: null, placed: false }
      const onDown = (e) => this._cloudDown(ctx, cloud, e)
      cloud._onDown = onDown
      view.on('pointerdown', onDown)
      this._cloudLayer.addChild(view)
      this._clouds.push(cloud)
    }
  },

  _buildControls(ctx) {
    // "Hoppa!" — primärknapp.
    this._hoppa = new Button({
      label: 'Hoppa!', icon: '⤴️', width: 214, height: 104, color: COLORS.pink,
      services: ctx.services, sound: 'whoosh', onTap: () => this._launch(ctx),
    })
    this._hoppa.position.set(1150, 656)
    this._root.addChild(this._hoppa)

    // Vikt-växlare (lätt/tung).
    this._weightToggle = makeCycle({
      states: WEIGHTS, width: 172, height: 96, services: ctx.services,
      onChange: (idx) => this._applyWeight(idx, false),
    })
    this._weightToggle.position.set(948, 656)
    this._root.addChild(this._weightToggle)

    // Vind-växlare (bara på högre nivåer).
    this._windToggle = makeCycle({
      states: WINDS, width: 158, height: 92, services: ctx.services,
      onChange: (idx) => this._applyWind(idx, false),
    })
    this._windToggle.position.set(770, 656)
    this._windToggle.visible = false
    this._root.addChild(this._windToggle)
  },

  // ---- Nivåer -------------------------------------------------------------

  _levelConfig(level) {
    const L = Math.max(0, level | 0)
    const gx = Math.min(1170, 1010 + L * 22) // regnbågen längre bort
    const gy = Math.max(250, 470 - L * 42) // och högre
    const cloudCount = Math.max(2, 3 - Math.floor(L / 3)) // färre moln senare
    const gemCount = L <= 0 ? 1 : L <= 2 ? 2 : 3
    const wind = L >= 3
    const gems = []
    for (let i = 0; i < gemCount; i++) {
      const t = (i + 1) / (gemCount + 1)
      let x = 360 + (gx - 360 - 80) * t
      let y = 380 + (gy - 380) * t + (i % 2 ? -54 : 46)
      x = clamp(x, 300, gx - 50)
      y = clamp(y, 150, 540)
      gems.push({ x, y, icon: i % 2 ? '⭐' : '💎' })
    }
    return { goal: { x: gx, y: gy }, gems, cloudCount, wind }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._level = level
    this._tries = 0
    this._state = 'placing'
    this._idle = 0
    this._flyT = 0
    this._settleT = 0

    this._removeElviraBody()
    this._killElviraTweens()
    this._returnTween?.kill()
    this._helpTween?.kill()
    this._loadTimer?.kill()

    const cfg = this._levelConfig(level)
    this._cfg = cfg

    // Regnbåge.
    this._goalPos = { x: cfg.goal.x, y: cfg.goal.y }
    this._rainbow.position.set(cfg.goal.x, cfg.goal.y)

    // Vikt + vind nollställs (lätt, lugnt).
    this._applyWeight(0, true)
    this._weightToggle.setIndex(0)
    this._applyWind(0, true)
    this._windToggle.setIndex(0)
    this._windToggle.visible = cfg.wind

    // Ädelstenar.
    this._buildGems(ctx, cfg.gems)

    // Moln tillbaka i facket (rätt antal synliga).
    this._resetClouds(cfg.cloudCount)

    // Elvira hem.
    this._elvira.position.set(START.x, START.y)
    this._elvira.rotation = 0
    this._elvira.scale.set(1)
    this._elvira.visible = true

    this._enterPlacing(ctx, true)
  },

  _buildGems(ctx, defs) {
    // Rensa gamla.
    for (const g of this._gems) {
      g.tw?.kill()
      if (g.view && !g.view.destroyed) {
        gsap.killTweensOf(g.view)
        gsap.killTweensOf(g.view.scale)
      }
    }
    for (const c of [...this._gemLayer.children]) c.destroy()
    this._gems = []
    this._gemTotal = defs.length
    this._gemGot = 0
    for (const d of defs) {
      const view = makeGem(d.icon)
      view.position.set(d.x, d.y)
      this._gemLayer.addChild(view)
      const tw = breathe(view, { scale: 1.12, duration: 1.1 })
      const gem = { x: d.x, y: d.y, icon: d.icon, view, collected: false, tw }
      this._tweens.push(tw)
      this._gems.push(gem)
    }
  },

  _resetClouds(count) {
    for (let i = 0; i < this._clouds.length; i++) {
      const cloud = this._clouds[i]
      if (cloud.body) {
        this._phys.removeBody(cloud.body)
        cloud.body = null
      }
      cloud.placed = false
      gsap.killTweensOf(cloud.view)
      gsap.killTweensOf(cloud.view.scale)
      if (i < count) {
        cloud.view.visible = true
        cloud.home = { x: 130 + i * 152, y: 655 }
        cloud.view.position.set(cloud.home.x, cloud.home.y)
        cloud.view.scale.set(0.92)
      } else {
        cloud.view.visible = false
      }
    }
  },

  // ---- Placerings-läge ----------------------------------------------------

  _enterPlacing(ctx, fresh = false) {
    if (!this._alive) return
    this._state = 'placing'
    this._idle = 0
    this._settleT = 0
    this._elvira.rotation = 0
    this._elvira.scale.set(1)
    this._hoppa.setEnabled(true)
    this._lockToggles(false)
    this._setCloudsInteractive(true)
    this._startBreathe()
    this._drawPreview()
    if (!fresh && !this._elvira.destroyed) pop(this._elvira)
  },

  _startBreathe() {
    this._breatheTween?.kill()
    if (this._elvira && !this._elvira.destroyed) {
      this._elvira.scale.set(1)
      this._breatheTween = breathe(this._elvira, { scale: 1.05, duration: 1.1 })
      this._tweens.push(this._breatheTween)
    }
  },

  _stopBreathe() {
    this._breatheTween?.kill()
    this._breatheTween = null
    if (this._elvira && !this._elvira.destroyed) this._elvira.scale.set(1)
  },

  _applyWeight(idx, silent) {
    this._weightIdx = idx % WEIGHTS.length
    this._weight = WEIGHTS[this._weightIdx]
    this._phys.setGravity(this._weight.gravity)
    if (this._state === 'placing') this._drawPreview()
    if (!silent) this._ctx?.services.voice.say(this._weight.voice)
  },

  _applyWind(idx, silent) {
    this._windIdx = idx % WINDS.length
    this._windAx = WINDS[this._windIdx].ax
    this._phys.setWind(this._windAx, 0)
    if (this._state === 'placing') this._drawPreview()
    if (!silent) this._ctx?.services.voice.say(WINDS[this._windIdx].voice)
  },

  _lockToggles(locked) {
    this._weightToggle?.setLocked(locked)
    this._windToggle?.setLocked(locked)
  },

  _setCloudsInteractive(on) {
    for (const c of this._clouds) {
      if (!c.view || c.view.destroyed) continue
      c.view.eventMode = on && c.view.visible ? 'static' : 'none'
    }
  },

  _drawPreview() {
    const g = this._preview
    if (!g || g.destroyed) return
    g.clear()
    if (this._state !== 'placing') {
      g.visible = false
      return
    }
    const pts = predictTrajectory({
      x: START.x, y: START.y, vx: LAUNCH_VX, vy: this._weight.launchVy,
      gy: this._weight.gravity * 0.5, wx: this._windAx * 0.5,
      steps: 48, every: 3,
      floorY: GROUND_TOP - ELVIRA_R, leftX: ELVIRA_R, rightX: DESIGN_W - ELVIRA_R, restitution: 0.4,
    })
    g.visible = true
    for (let i = 0; i < pts.length; i++) {
      const r = Math.max(2.5, 8 - 5 * (i / pts.length))
      const a = 0.55 - 0.4 * (i / pts.length)
      g.circle(pts[i].x, pts[i].y, r).fill({ color: 0xffffff, alpha: a })
    }
  },

  _hidePreview() {
    if (this._preview && !this._preview.destroyed) {
      this._preview.clear()
      this._preview.visible = false
    }
  },

  // ---- Moln-drag (ett förlåtande drag, mjuk snäpp) ------------------------

  _cloudDown(ctx, cloud, e) {
    if (!this._alive || this._state !== 'placing' || !cloud.view.visible) return
    this._idle = 0
    this._dragCloud = cloud
    // Lyft molnet ur fysiken medan det hålls.
    if (cloud.body) {
      this._phys.removeBody(cloud.body)
      cloud.body = null
    }
    cloud.placed = false
    const p = this._root.toLocal(e.global)
    this._dragOffset = { x: cloud.view.x - p.x, y: cloud.view.y - p.y }
    this._cloudLayer.setChildIndex(cloud.view, this._cloudLayer.children.length - 1)
    gsap.killTweensOf(cloud.view.scale)
    gsap.to(cloud.view.scale, { x: 1.12, y: 1.12, duration: 0.12 })
    ctx.services.audio.sfx('pop')
    cloud.view.on('globalpointermove', this._onCloudMove)
    cloud.view.on('pointerup', this._onCloudUp)
    cloud.view.on('pointerupoutside', this._onCloudUp)
    this._drawPreview()
  },

  _cloudMove(e) {
    const cloud = this._dragCloud
    if (!cloud) return
    const p = this._root.toLocal(e.global)
    cloud.view.x = clamp(p.x + this._dragOffset.x, 80, DESIGN_W - 80)
    cloud.view.y = clamp(p.y + this._dragOffset.y, 150, 700)
  },

  _cloudUp(ctx, e) {
    const cloud = this._dragCloud
    if (!cloud) return
    this._dragCloud = null
    cloud.view.off('globalpointermove', this._onCloudMove)
    cloud.view.off('pointerup', this._onCloudUp)
    cloud.view.off('pointerupoutside', this._onCloudUp)
    gsap.killTweensOf(cloud.view.scale)

    if (cloud.view.y < PLACE_LINE_Y) {
      // Placeras i luften -> blir en studsig statisk plattform.
      const px = clamp(cloud.view.x, 100, DESIGN_W - 100)
      const py = clamp(cloud.view.y, 190, PLACE_LINE_Y - 4)
      gsap.to(cloud.view, { x: px, y: py, duration: 0.16, ease: 'power2.out' })
      gsap.to(cloud.view.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' })
      cloud.body = this._phys.rectangle(px, py, CLOUD_W - 18, CLOUD_H - 8, {
        ...MATERIALS.bouncy, isStatic: true, restitution: 0.92, friction: 0.08, label: 'cloud',
      })
      cloud.placed = true
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, px, py, { count: 5 })
    } else {
      // Tillbaka till facket (mjuk snäpp).
      gsap.to(cloud.view, { x: cloud.home.x, y: cloud.home.y, duration: 0.28, ease: 'back.out(1.8)' })
      gsap.to(cloud.view.scale, { x: 0.92, y: 0.92, duration: 0.22 })
      ctx.services.audio.sfx('soft')
    }
    this._idle = 0
    this._drawPreview()
  },

  // ---- Hopp + fysik -------------------------------------------------------

  _launch(ctx) {
    if (!this._alive || this._state !== 'placing') return
    this._state = 'flying'
    this._flyT = 0
    this._settleT = 0
    this._idle = 0
    this._cloudBoost = false
    this._hoppa.setEnabled(false)
    this._lockToggles(true)
    this._setCloudsInteractive(false)
    this._hidePreview()
    this._stopBreathe()
    this._killElviraTweens()
    this._elvira.scale.set(1)
    this._elvira.rotation = 0

    const w = this._weight
    const body = this._phys.circle(this._elvira.x, this._elvira.y, ELVIRA_R, {
      ...MATERIALS.light, restitution: 0.45, friction: 0.05, frictionAir: w.frictionAir, density: w.density, label: 'elvira',
    })
    Body.setInertia(body, Infinity) // håll henne upprätt (ingen tumling)
    this._elviraBody = body
    this._phys.link(body, this._elvira, (v, b) => {
      v.rotation = clamp(b.velocity.x * 0.012, -0.28, 0.28) // liten lutning åt färdriktningen
    })
    Body.setVelocity(body, { x: LAUNCH_VX, y: w.launchVy })
    ctx.services.audio.sfx('whoosh')
    ctx.services.audio.sfx('pop')
    ctx.services.voice.say('Iväg, Elvira!')
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dtSec = ticker.deltaMS / 1000
    this._t += dtSec
    this._phys.update(ticker.deltaMS)

    if (this._state === 'flying') {
      this._idle = 0
      this._flyT += dtSec
      const b = this._elviraBody
      if (!b) return

      // Hastighetstak (aldrig flyga vilt ur bild).
      let sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > MAXV) {
        const k = MAXV / sp
        Body.setVelocity(b, { x: b.velocity.x * k, y: b.velocity.y * k })
      }
      // Garanterad livfull studs efter molnträff.
      if (this._cloudBoost) {
        this._cloudBoost = false
        if (b.velocity.y > -MINB) Body.setVelocity(b, { x: b.velocity.x, y: -MINB })
      }

      this._checkGems(ctx, b.position.x, b.position.y)

      if (Math.hypot(b.position.x - this._goalPos.x, b.position.y - this._goalPos.y) < GOAL_R) {
        this._win(ctx)
        return
      }

      // "Landat"? -> hjälp / tillbaka till start (no-fail).
      sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (this._flyT > 0.5 && sp < SETTLE_SPEED) {
        this._settleT += dtSec
        if (this._settleT >= SETTLE_HOLD) {
          this._onSettle(ctx)
          return
        }
      } else {
        this._settleT = 0
      }
    } else if (this._state === 'placing') {
      this._idle += dtSec
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.say('Dra molnen dit du vill och tryck på Hoppa!')
        if (!this._elvira.destroyed) pop(this._elvira)
      }
    }
  },

  _checkGems(ctx, x, y) {
    for (const g of this._gems) {
      if (g.collected) continue
      if (Math.hypot(x - g.x, y - g.y) < GEM_HIT) this._collectGem(ctx, g)
    }
  },

  _collectGem(ctx, g) {
    g.collected = true
    this._gemGot++
    ctx.services.audio.sfx('magi')
    sparkle(ctx.fxLayer, g.x, g.y, { count: 8 })
    floatText(ctx.fxLayer, g.x, g.y, g.icon, { fontSize: 56, rise: 70 })
    g.tw?.kill()
    if (g.view && !g.view.destroyed) {
      gsap.killTweensOf(g.view.scale)
      gsap.to(g.view.scale, {
        x: 1.5, y: 1.5, duration: 0.18, ease: 'power2.out',
        onComplete: () => {
          if (g.view && !g.view.destroyed) g.view.visible = false
        },
      })
    }
    ctx.progress.addStars(1)
  },

  _onCollision(ctx, e) {
    if (!this._alive || this._state !== 'flying' || !this._elviraBody) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      if (a !== this._elviraBody && b !== this._elviraBody) continue
      const other = a === this._elviraBody ? b : a
      if (other.label === 'cloud') {
        this._cloudBoost = true
        const cloud = this._clouds.find((c) => c.body === other)
        this._boing(ctx, cloud)
      } else if (other.label === 'ground') {
        if (this._t - this._lastBoing > BOING_THROTTLE) {
          this._lastBoing = this._t
          ctx.services.audio.sfx('soft')
        }
      }
    }
  },

  _boing(ctx, cloud) {
    if (this._t - this._lastBoing > BOING_THROTTLE) {
      this._lastBoing = this._t
      ctx.services.audio.sfx('boing')
    }
    if (cloud && cloud.view && !cloud.view.destroyed) {
      gsap.killTweensOf(cloud.view.scale)
      gsap.to(cloud.view.scale, {
        x: 1.16, y: 0.78, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out',
        onComplete: () => {
          if (cloud.view && !cloud.view.destroyed) cloud.view.scale.set(1)
        },
      })
      sparkle(ctx.fxLayer, cloud.view.x, cloud.view.y - 8, { count: 4 })
    }
  },

  // ---- No-fail: tillbaka till start eller mjuk hjälp ----------------------

  _onSettle(ctx) {
    this._tries++
    this._removeElviraBody()
    if (this._tries >= 2) {
      this._autoHelpGlide(ctx)
      return
    }
    this._state = 'returning'
    ctx.services.audio.sfx('soft')
    ctx.services.voice.say('Hoppsan! Lägg molnen så Elvira studsar uppåt.')
    this._returnToStart(ctx)
  },

  _returnToStart(ctx) {
    const v = this._elvira
    sparkle(ctx.fxLayer, v.x, v.y, { count: 6 })
    const st = { x: v.x, y: v.y, r: v.rotation }
    this._returnTween = gsap.to(st, {
      x: START.x, y: START.y, r: 0, duration: 0.9, ease: 'sine.inOut',
      onUpdate: () => {
        if (!this._alive || v.destroyed) {
          this._returnTween?.kill()
          return
        }
        v.x = st.x
        v.y = st.y
        v.rotation = st.r
      },
      onComplete: () => {
        if (this._alive) this._enterPlacing(ctx)
      },
    })
  },

  // Mjuk garanterad båge fram (genom kvarvarande ädelstenar) -> alltid framgång.
  _autoHelpGlide(ctx) {
    this._state = 'help'
    this._stopBreathe()
    ctx.services.voice.say('Vänta, jag hjälper Elvira!')
    const pts = this._gems.filter((g) => !g.collected).map((g) => ({ x: g.x, y: g.y })).sort((a, b) => a.x - b.x)
    pts.push({ x: this._goalPos.x, y: this._goalPos.y })
    this._glideStep(ctx, pts, 0)
  },

  _glideStep(ctx, pts, i) {
    if (!this._alive) return
    if (i >= pts.length) {
      this._win(ctx)
      return
    }
    const v = this._elvira
    const from = { x: v.x, y: v.y }
    const to = pts[i]
    const midY = Math.min(from.y, to.y) - 70 // liten studsbåge
    const st = { p: 0 }
    const dur = Math.max(0.45, Math.hypot(to.x - from.x, to.y - from.y) / 900)
    this._helpTween = gsap.to(st, {
      p: 1, duration: dur, ease: 'sine.inOut',
      onUpdate: () => {
        if (!this._alive || v.destroyed) {
          this._helpTween?.kill()
          return
        }
        const p = st.p
        // kvadratisk båge
        v.x = from.x + (to.x - from.x) * p
        const lin = from.y + (to.y - from.y) * p
        v.y = lin + (midY - (from.y + to.y) / 2) * 4 * p * (1 - p)
        v.rotation = Math.sin(p * Math.PI) * 0.2
        this._checkGems(ctx, v.x, v.y)
      },
      onComplete: () => {
        if (this._alive) this._glideStep(ctx, pts, i + 1)
      },
    })
  },

  // ---- Vinst --------------------------------------------------------------

  _win(ctx) {
    if (this._state === 'win') return
    this._state = 'win'
    this._removeElviraBody()
    this._settleT = 0
    this._idle = 0

    // Plocka ev. kvarvarande ädelstenar för en komplett känsla.
    for (const g of this._gems) if (!g.collected) this._collectGem(ctx, g)

    const goal = this._goalPos
    ctx.services.audio.sfx('reveal')
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Bra! Elvira nådde regnbågen!')

    const v = this._elvira
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { x: v.x, y: v.y }
    this._winTween = gsap.to(st, {
      x: goal.x, y: goal.y - 10, duration: 0.4, ease: 'power2.out',
      onUpdate: () => {
        if (!this._alive || v.destroyed) {
          this._winTween?.kill()
          return
        }
        v.x = st.x
        v.y = st.y
      },
    })
    if (!v.destroyed) pop(this._elvira, { scale: 1.25 })

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    puff(ctx.fxLayer, goal.x, goal.y, { count: 16 })
    sparkle(ctx.fxLayer, goal.x, goal.y, { count: 10 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rounds', (ctx.progress.get().custom?.rounds || 0) + 1)
    ctx.progress.complete()

    this._loadTimer = gsap.delayedCall(1.9, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Hjälpare -----------------------------------------------------------

  _removeElviraBody() {
    if (this._elviraBody) {
      this._phys.removeBody(this._elviraBody)
      this._elviraBody = null
    }
  },

  _killElviraTweens() {
    if (this._elvira && !this._elvira.destroyed) {
      gsap.killTweensOf(this._elvira)
      gsap.killTweensOf(this._elvira.scale)
    }
    this._breatheTween?.kill()
    this._breatheTween = null
    this._winTween?.kill()
    this._helpTween?.kill()
    this._returnTween?.kill()
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._loadTimer?.kill()
    this._returnTween?.kill()
    this._helpTween?.kill()
    this._winTween?.kill()
    this._tweens.forEach((t) => t?.kill())
    this._tweens = []

    this._unbindCollision?.()
    this._removeElviraBody()
    this._phys?.destroy()

    // Elvira.
    if (this._elvira && !this._elvira.destroyed) {
      this._elvira.off('pointertap', this._onElviraTap)
      gsap.killTweensOf(this._elvira)
      gsap.killTweensOf(this._elvira.scale)
    }
    // Moln.
    for (const c of this._clouds) {
      if (c.view && !c.view.destroyed) {
        c.view.off('pointerdown', c._onDown)
        c.view.off('globalpointermove', this._onCloudMove)
        c.view.off('pointerup', this._onCloudUp)
        c.view.off('pointerupoutside', this._onCloudUp)
        gsap.killTweensOf(c.view)
        gsap.killTweensOf(c.view.scale)
      }
    }
    // Ädelstenar.
    for (const g of this._gems) {
      g.tw?.kill()
      if (g.view && !g.view.destroyed) {
        gsap.killTweensOf(g.view)
        gsap.killTweensOf(g.view.scale)
      }
    }
    // Kontroller.
    for (const ctrl of [this._hoppa, this._weightToggle, this._windToggle]) {
      if (ctrl && !ctrl.destroyed) gsap.killTweensOf(ctrl.scale)
    }
    if (this._rainbow && !this._rainbow.destroyed) gsap.killTweensOf(this._rainbow.scale)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onEmptyTap)

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ===== Programmatisk konst ===============================================

// Söt enhörning, ankrad i mitten (0,0), vänd åt höger.
function drawUnicorn() {
  const c = new Container()

  // Svans (regnbåge) bakom kroppen, åt vänster.
  const tail = new Graphics()
  for (let i = 0; i < RAINBOW.length; i++) {
    const yy = -16 + i * 7
    tail.roundRect(-66 - (i % 2) * 6, yy, 26, 7, 4).fill(RAINBOW[i])
  }
  tail.rotation = 0.25
  tail.eventMode = 'none'
  c.addChild(tail)

  // Ben.
  const legs = new Graphics()
  legs.roundRect(-26, 14, 13, 30, 6).fill(0xffffff)
  legs.roundRect(8, 16, 13, 30, 6).fill(0xffffff)
  legs.roundRect(-26, 40, 15, 8, 4).fill(0xf3d9ea)
  legs.roundRect(7, 42, 15, 8, 4).fill(0xf3d9ea)
  legs.eventMode = 'none'
  c.addChild(legs)

  // Kropp.
  const body = new Graphics()
    .roundRect(-46, -18, 82, 48, 24)
    .fill(0xfff6fb)
    .stroke({ width: 3, color: 0xffd6ea })
  body.eventMode = 'none'
  c.addChild(body)

  // Huvud.
  const head = new Graphics()
    .circle(36, -22, 25)
    .fill(0xfff6fb)
    .stroke({ width: 3, color: 0xffd6ea })
  head.eventMode = 'none'
  c.addChild(head)

  // Nos.
  const snout = new Graphics().ellipse(56, -14, 12, 9).fill(0xffeaf4)
  snout.circle(60, -12, 2.2).fill(0xe79bc0)
  snout.eventMode = 'none'
  c.addChild(snout)

  // Öra.
  const ear = new Graphics().poly([26, -44, 36, -40, 28, -30]).fill(0xfff6fb).stroke({ width: 2, color: 0xffd6ea })
  ear.eventMode = 'none'
  c.addChild(ear)

  // Gyllene horn.
  const horn = new Graphics()
    .poly([40, -78, 32, -46, 48, -46])
    .fill(0xffd35c)
    .stroke({ width: 2, color: 0xf2b134 })
  horn.moveTo(34, -52).lineTo(46, -55)
  horn.moveTo(35.5, -60).lineTo(45, -62)
  horn.moveTo(37, -68).lineTo(44, -70)
  horn.stroke({ width: 2, color: 0xf2b134 })
  horn.eventMode = 'none'
  c.addChild(horn)

  // Regnbågsman (från hornbasen ner längs nacken).
  const mane = new Graphics()
  const manePts = [
    [22, -42], [16, -32], [14, -20], [12, -8], [14, 4],
  ]
  for (let i = 0; i < manePts.length; i++) {
    mane.circle(manePts[i][0], manePts[i][1], 11).fill(RAINBOW[i % RAINBOW.length])
  }
  mane.eventMode = 'none'
  c.addChild(mane)

  // Kind.
  const cheek = new Graphics().circle(48, -14, 6).fill({ color: 0xffb3d1, alpha: 0.7 })
  cheek.eventMode = 'none'
  c.addChild(cheek)

  // Öga (stort & glatt).
  const eye = new Graphics()
  eye.ellipse(41, -24, 7.5, 9).fill(0x3a2b3f)
  eye.circle(43, -27, 2.6).fill(0xffffff)
  eye.circle(39, -22, 1.6).fill({ color: 0xffffff, alpha: 0.8 })
  eye.eventMode = 'none'
  c.addChild(eye)

  return c
}

// Fluffigt studsmoln (vy).
function makeCloudView() {
  const c = new Container()
  const g = new Graphics()
  const w = CLOUD_W
  g.roundRect(-w / 2, -2, w, 28, 16).fill(0xd7ecff)
  g.circle(-w * 0.32, 2, 26).fill(0xffffff)
  g.circle(0, -12, 32).fill(0xffffff)
  g.circle(w * 0.32, 2, 28).fill(0xffffff)
  g.roundRect(-w / 2, -6, w, 26, 14).fill(0xffffff)
  g.eventMode = 'none'
  c.addChild(g)
  const sheen = new Graphics().ellipse(-8, -16, 30, 9).fill({ color: 0xffffff, alpha: 0.75 })
  sheen.eventMode = 'none'
  c.addChild(sheen)
  return c
}

// Glittrande ädelsten med mjuk gloria.
function makeGem(icon) {
  const c = new Container()
  const glow = new Graphics().circle(0, 0, 30).fill({ color: 0xfff3b0, alpha: 0.4 })
  glow.eventMode = 'none'
  const t = new Text({ text: icon, style: { fontFamily: FONT.body, fontSize: 48 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(glow, t)
  c.eventMode = 'none'
  return c
}

// Regnbåge (mål) med moln vid foten, gloria och en stjärna.
function makeRainbow() {
  const c = new Container()
  const glow = new Graphics().circle(0, -10, 118).fill({ color: 0xffffff, alpha: 0.22 })
  glow.eventMode = 'none'
  c.addChild(glow)

  const baseR = 116
  const bw = 12
  for (let i = 0; i < RAINBOW.length; i++) {
    const r = baseR - i * (bw + 2)
    const g = new Graphics()
    const seg = 28
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI
      const x = -r * Math.cos(a)
      const y = -r * Math.sin(a)
      if (s === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke({ width: bw, color: RAINBOW[i], cap: 'round' })
    g.eventMode = 'none'
    c.addChild(g)
  }

  const lc = makeRainbowFoot()
  lc.position.set(-baseR + 6, 8)
  const rc = makeRainbowFoot()
  rc.position.set(baseR - 6, 8)
  c.addChild(lc, rc)

  const star = new Text({ text: '✨', style: { fontFamily: FONT.body, fontSize: 40 } })
  star.anchor.set(0.5)
  star.position.set(0, -44)
  star.eventMode = 'none'
  c.addChild(star)

  c.eventMode = 'none'
  return c
}

function makeRainbowFoot() {
  const c = new Container()
  const g = new Graphics()
  g.circle(-16, 4, 16).fill(0xffffff)
  g.circle(0, -6, 20).fill(0xffffff)
  g.circle(16, 4, 17).fill(0xffffff)
  g.roundRect(-26, 0, 52, 18, 10).fill(0xffffff)
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// Stor barnvänlig växel-knapp (cyklar mellan lägen). Pekfeedback + ljud + studs.
function makeCycle({ states, width = 170, height = 96, services = null, onChange = null }) {
  const c = new Container()
  let idx = 0
  c._locked = false

  const r = Math.min(height / 2, 30)
  const lip = new Graphics()
  const face = new Graphics()
  const icon = new Text({ text: '', style: { fontFamily: FONT.body, fontSize: 40, fill: COLORS.white } })
  icon.anchor.set(0.5)
  icon.y = -height * 0.16
  icon.eventMode = 'none'
  const label = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 24, fontWeight: '700', fill: COLORS.white } })
  label.anchor.set(0.5)
  label.y = height * 0.24
  label.eventMode = 'none'
  c.addChild(lip, face, icon, label)

  function darken(hex, amt) {
    const rr = (hex >> 16) & 0xff
    const gg = (hex >> 8) & 0xff
    const bb = hex & 0xff
    const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
    return (d(rr) << 16) | (d(gg) << 8) | d(bb)
  }

  function paint() {
    const s = states[idx]
    lip.clear().roundRect(-width / 2, -height / 2 + 8, width, height, r).fill(darken(s.color, 0.2))
    face.clear()
      .roundRect(-width / 2, -height / 2, width, height - 6, r).fill(s.color)
      .roundRect(-width / 2 + 10, -height / 2 + 8, width - 20, height * 0.3, r * 0.7).fill({ color: COLORS.white, alpha: 0.18 })
    icon.text = s.icon
    label.text = s.label
  }
  paint()

  c.hitArea = new Rectangle(-width / 2 - 22, -height / 2 - 22, width + 44, height + 44)
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.on('pointerdown', () => {
    if (c._locked) return
    gsap.to(c.scale, { x: 0.93, y: 0.93, duration: 0.08 })
  })
  c.on('pointerup', () => {
    if (c._locked) return
    gsap.to(c.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(3)' })
  })
  c.on('pointerupoutside', () => {
    gsap.to(c.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(3)' })
  })
  c.on('pointertap', () => {
    if (c._locked) return
    idx = (idx + 1) % states.length
    paint()
    services?.audio?.sfx('flip')
    onChange?.(idx, states[idx])
  })

  c.setLocked = (b) => {
    c._locked = b
    c.alpha = b ? 0.5 : 1
    c.cursor = b ? 'default' : 'pointer'
  }
  c.setIndex = (i) => {
    idx = ((i % states.length) + states.length) % states.length
    paint()
  }
  c.getIndex = () => idx
  return c
}
