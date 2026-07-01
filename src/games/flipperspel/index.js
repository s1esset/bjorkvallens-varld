// Flipperspel — barnvänligt flipperbord (3–5 år). Ett upprättstående bord (top-down)
// där en glansig kula faller mot TVÅ STORA paddlar längst ner. Barnet tappar VÄNSTER
// skärmhalva -> vänster paddel slår uppåt, HÖGER halva -> höger paddel. Paddlarna är
// revolute-constraint-armar (pinnade i inre änden) som DRIVS med vinkelhastighet varje
// steg: snabb upp-sving vid tryck, mjuk fjäder-retur av sig själv — och eftersom kroppen
// har vinkelhastighet KICKAS kulan vid kontakt (äkta flipper-känsla). Kulan studsar mot
// bumpers (runda dynor) som TÄNDS och spelar en ton ur en liten "pling-skala".
//
// MÅL: tänd ALLA bumpers (+ ev. mål-dyna 🎯 på högre nivåer) -> firande + nästa runda.
// NO-FAIL (viktigt): en kula som rinner ut genom drän-springan i mitten räknas ALDRIG
// som miss — inga liv, ingen "ball lost", ingen poäng som sjunker. Den serveras mjukt
// igen uppifrån med ett glatt pop + gnista. Sker inget framsteg på länge tänds en otänd
// bumper "av magi" (auto-hjälp) så barnet ALLTID lyckas.
//
// TVÅ kontroller som ändrar utfallet: (1) paddel-timing (vänster/höger i rätt stund),
// (2) lutnings-knapp (☁️ Lugnt / ⚡ Snabbt) som växlar gravitationen via setGravity.
// Allt ritas programmatiskt (Pixi Graphics + emoji), exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Matter, Body } from '../../lib/physics.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { pop, bounceIn, breathe, sparkle, puff, floatText, bigCelebration, ripple, shake } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS, PLAYFUL, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const GY_NORMAL = 1.1
const GY_CALM = 0.5
const BALL_R = 28
const PAD_LEN = 125
const PAD_T = 28
const MAX_SPEED = 26 // px/steg — kulan kan aldrig "teleportera" genom en vägg
const NOTES = ['pling', 'reveal', 'match', 'flip', 'pop'] // stigande "skala"-känsla

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)

// Paddel-definitioner: pivå (inre ände), vilo- och slag-vinkel.
const PADDLES = [
  { side: 'left', px: 500, py: 600, rest: 0.55, up: -0.3 },
  { side: 'right', px: 780, py: 600, rest: Math.PI - 0.55, up: Math.PI + 0.3 },
]

export default {
  id: 'flipperspel',
  titleSv: 'Flipperspel',
  icon: '⭐',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'flipperspel',
  voiceIntro: 'Tryck på sidorna för att slå paddlarna!',

  init(ctx) {
    this._alive = true
    this._calm = false
    this._resolving = false
    this._litCount = 0
    this._total = 0
    this._sinceTap = 0
    this._sinceLit = 0
    this._lastPop = 0
    this._pressMs = { left: 0, right: 0 }
    this._paddles = []
    this._bumpers = []
    this._level = Math.max(1, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mörk arkad-natt: bumpernas glöd syns extra fint.
    this._root.addChild(createScene('night', { width: ctx.width, height: ctx.height }))

    // Bordspanel (mörk panel + inre ljusram).
    const panel = new Graphics()
      .roundRect(360, 100, 560, 600, 36)
      .fill(COLORS.ink)
      .stroke({ width: 8, color: COLORS.purple })
    panel.roundRect(376, 116, 528, 580, 28).stroke({ width: 6, color: 0x3a2f6b })
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Fysik: gentle nedåtgravitation, INGA auto-väggar (vi bygger egna).
    this._phys = new PhysicsWorld({ gravityY: GY_NORMAL, walls: [] })

    // Statiska väggar (vänster, höger, topp) — botten ÖPPEN (drän).
    const wallOpt = { isStatic: true, restitution: 0.4, friction: 0.3, label: 'wall' }
    this._phys.rectangle(360, 405, 40, 590, wallOpt) // vänster (inre face x≈380)
    this._phys.rectangle(920, 405, 40, 590, wallOpt) // höger (inre face x≈900)
    this._phys.rectangle(640, 100, 560, 40, wallOpt) // topp (inre face y≈120)

    // Inlane-guider (snedställda) som trattar kulan mot paddlarna.
    this._buildGuide(380, 560, 470, 660)
    this._buildGuide(900, 560, 810, 660)

    // Bumper-lager (under paddlar/kula i z-led).
    this._bumperLayer = new Container()
    this._bumperLayer.eventMode = 'none'
    this._bumperLayer.interactiveChildren = false
    this._root.addChild(this._bumperLayer)

    // Paddlar (revolute constraint + kinematisk fjäder).
    for (const def of PADDLES) this._buildPaddle(def)

    // Kula (skapas en gång, serveras om vid drän/ny runda).
    this._ballView = makeBall()
    this._ballView.position.set(640, 150)
    this._ballView.eventMode = 'none'
    this._root.addChild(this._ballView)
    this._ball = this._phys.circle(640, 150, BALL_R, { ...MATERIALS.bouncy, label: 'ball' })
    this._phys.link(this._ball, this._ballView, (v, b) => {
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > MAX_SPEED) Body.setVelocity(b, { x: (b.velocity.x * MAX_SPEED) / sp, y: (b.velocity.y * MAX_SPEED) / sp })
    })

    // Tryck-zoner (gigantiska, osynliga) — vänster/höger halva under headern.
    this._leftZone = new Graphics().rect(0, 120, 640, 600).fill({ color: 0x000000, alpha: 0 })
    this._leftZone.eventMode = 'static'
    this._onLeft = () => this._flip(ctx, 'left')
    this._leftZone.on('pointerdown', this._onLeft)
    this._rightZone = new Graphics().rect(640, 120, 640, 600).fill({ color: 0x000000, alpha: 0 })
    this._rightZone.eventMode = 'static'
    this._onRight = () => this._flip(ctx, 'right')
    this._rightZone.on('pointerdown', this._onRight)
    this._root.addChild(this._leftZone, this._rightZone)

    // Lutnings-knapp (ligger UTANFÖR bordet, ovanpå zonerna i z-led).
    this._buildTiltButton(ctx)

    // Bobo bor i maskinen (mönster #2): sitter på toppen, rycker till vid varje
    // tändning, "kastar in" nya kulan och hoppar av glädje när allt lyser.
    this._bobo = makeMascot(46)
    this._boboBaseY = 78
    this._bobo.position.set(640, this._boboBaseY)
    this._bobo.eventMode = 'none'
    this._root.addChild(this._bobo)

    // Tänd-mätare: en lodrät rad stjärnor UTANFÖR bordet (höger) som fylls per tänd
    // bumper — barnet ser hur nära rundan är klar (positiv inramning, ingen sjunkande siffra).
    this._meter = new Container()
    this._meter.eventMode = 'none'
    this._meter.interactiveChildren = false
    this._meterPips = []
    this._root.addChild(this._meter)

    // Kollisioner + ticker.
    this._offCollision = this._phys.onCollision((e) => this._onHit(ctx, e))
    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    // Första rundan.
    this._buildRound(ctx)
  },

  mount(ctx) {
    this._sinceTap = 0
    this._sinceLit = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildGuide(ax, ay, bx, by) {
    const cx = (ax + bx) / 2
    const cy = (ay + by) / 2
    const len = Math.hypot(bx - ax, by - ay)
    const ang = Math.atan2(by - ay, bx - ax)
    const g = new Graphics()
      .roundRect(-len / 2, -12, len, 24, 12)
      .fill(COLORS.brown)
      .stroke({ width: 3, color: 0x5a3a26 })
    g.position.set(cx, cy)
    g.rotation = ang
    g.eventMode = 'none'
    this._root.addChild(g)
    this._phys.rectangle(cx, cy, len, 24, { isStatic: true, restitution: 0.4, friction: 0.3, label: 'wall', angle: ang })
  },

  _buildPaddle(def) {
    const cx = def.px + (PAD_LEN / 2) * Math.cos(def.rest)
    const cy = def.py + (PAD_LEN / 2) * Math.sin(def.rest)
    const body = this._phys.rectangle(cx, cy, PAD_LEN, PAD_T, {
      angle: def.rest,
      density: 0.02, // tung -> kulan rubbar den inte
      friction: 0.4,
      restitution: 0.25,
      label: 'flipper',
    })
    // Pinna inre änden vid pivån (revolute).
    const pin = Matter.Constraint.create({
      pointA: { x: def.px, y: def.py },
      bodyB: body,
      pointB: { x: -PAD_LEN / 2, y: 0 },
      stiffness: 1,
      length: 0,
    })
    this._phys.add(pin)

    const view = makePaddleView()
    this._phys.link(body, view)
    this._root.addChild(view)

    this._paddles.push({
      side: def.side,
      body,
      view,
      rest: def.rest,
      up: def.up,
      lo: Math.min(def.rest, def.up),
      hi: Math.max(def.rest, def.up),
    })
  },

  _buildTiltButton(ctx) {
    const btn = new Container()
    btn.position.set(180, 600)
    const lip = new Graphics().circle(0, 8, 70).fill(lerpColor(COLORS.blue, 0x000000, 0.24))
    const face = new Graphics().circle(0, 0, 70).fill(COLORS.blue).stroke({ width: 5, color: lerpColor(COLORS.blue, 0x000000, 0.32) })
    const icon = new Text({ text: '⚡', style: { fontFamily: FONT.body, fontSize: 56 } })
    icon.anchor.set(0.5)
    icon.position.set(0, -8)
    icon.eventMode = 'none'
    const label = new Text({ text: 'Snabbt', style: { fontFamily: FONT.title, fontSize: 22, fontWeight: '700', fill: COLORS.white } })
    label.anchor.set(0.5)
    label.position.set(0, 38)
    label.eventMode = 'none'
    btn.addChild(lip, face, icon, label)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new Circle(0, 0, 94) // +24px hit-halo över 70px-grafiken
    this._tiltIcon = icon
    this._tiltLabel = label
    this._onTilt = () => this._toggleTilt(ctx)
    btn.on('pointertap', this._onTilt)
    this._tiltBtn = btn
    this._root.addChild(btn)
  },

  // ---- Runda / nivå -------------------------------------------------------

  _layoutFor(level) {
    let pts
    if (level <= 2) pts = [[640, 300], [540, 420], [740, 420]]
    else if (level <= 4) pts = [[640, 300], [540, 420], [740, 420], [640, 470]]
    else if (level <= 6) pts = [[640, 300], [540, 420], [740, 420], [440, 300], [840, 300], [640, 470, 'goal']]
    else {
      pts = [[640, 300], [540, 420], [740, 420], [440, 300], [840, 300]]
      if (level % 2 === 0) pts.push([640, 470, 'goal'])
    }
    // Nivå 7+: lätt jitter så mönstren varieras (aldrig svårare drän).
    if (level >= 7) pts = pts.map(([x, y, k]) => [clamp(x + rand(-20, 20), 426, 854), clamp(y + rand(-20, 20), 220, 510), k])
    return pts
  },

  _buildRound(ctx) {
    if (!this._alive) return
    // Rensa gamla bumpers.
    for (const b of this._bumpers) {
      b.glowTween?.kill()
      if (b.body) this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view.scale)
        b.view.destroy({ children: true })
      }
    }
    this._bumpers = []

    const layout = this._layoutFor(this._level)
    this._total = layout.length
    this._litCount = 0
    this._resolving = false
    this._sinceLit = 0
    this._buildMeter()

    layout.forEach((pt, i) => {
      const [x, y, kind] = pt
      const color = kind === 'goal' ? COLORS.yellow : PLAYFUL[i % PLAYFUL.length]
      const m = makeBumper(color, kind === 'goal' ? '🎯' : '⭐')
      m.container.position.set(x, y)
      this._bumperLayer.addChild(m.container)
      const body = this._phys.circle(x, y, 46, { isStatic: true, restitution: 1.0, label: 'bumper', plugin: { idx: i } })
      this._bumpers.push({ view: m.container, glow: m.glow, dyna: m.dyna, emoji: m.emoji, body, color, lit: false, x, y, glowTween: null })
      bounceIn(m.container, { delay: i * 0.06 })
    })

    this._serveBall(ctx)
  },

  // Bygg tänd-mätaren (en stjärna per bumper). Otända = dämpade, fylls vid tändning.
  _buildMeter() {
    for (const s of this._meterPips) {
      gsap.killTweensOf(s.scale)
      if (!s.destroyed) s.destroy()
    }
    this._meterPips = []
    if (!this._meter || this._meter.destroyed) return
    const n = this._total
    const gap = 62
    const y0 = 360 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const s = new Graphics().star(0, 0, 5, 19, 9).fill({ color: COLORS.inkSoft, alpha: 0.5 }).stroke({ width: 3, color: 0x3a2f6b })
      s.position.set(1008, y0 + i * gap)
      s.eventMode = 'none'
      this._meter.addChild(s)
      this._meterPips.push(s)
    }
  },

  // Fyll nästa stjärna i mätaren med bumperns färg + en glad studs.
  _fillMeter(idx, color) {
    const s = this._meterPips[idx]
    if (!s || s.destroyed) return
    s.clear().star(0, 0, 5, 22, 11).fill(color).stroke({ width: 3, color: 0xffffff, alpha: 0.9 })
    gsap.killTweensOf(s.scale)
    gsap.fromTo(s.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2.6)' })
  },

  // Bobo reagerar: ett litet hopp vid tändning, ett stort glädjehopp när allt lyser.
  _boboReact(big = false) {
    const b = this._bobo
    if (!b || b.destroyed) return
    gsap.killTweensOf(b)
    gsap.to(b, {
      y: this._boboBaseY - (big ? 42 : 14),
      duration: big ? 0.22 : 0.12,
      yoyo: true,
      repeat: big ? 3 : 1,
      ease: 'power2.out',
      onComplete: () => { if (!b.destroyed) b.y = this._boboBaseY },
    })
    pop(b, { scale: big ? 1.25 : 1.12 })
  },

  _serveBall(ctx) {
    if (!this._ball) return
    Body.setPosition(this._ball, { x: 640, y: 150 })
    Body.setVelocity(this._ball, { x: rand(-2, 2), y: 0 })
    Body.setAngularVelocity(this._ball, 0)
    ctx.services.audio.sfx('pop')
    puff(ctx.fxLayer, 640, 160, { count: 6 })
    this._boboReact(false) // Bobo "kastar in" nya kulan
    if (Math.random() < 0.25) floatText(ctx.fxLayer, 640, 210, '😄', { fontSize: 46 })
  },

  // ---- Kontroller ---------------------------------------------------------

  _flip(ctx, side) {
    if (!this._alive || this._resolving) return
    this._pressMs[side] = 140 // pressad ~140ms, sedan fjäder-retur
    this._sinceTap = 0
    this._sinceLit = 0
    ctx.services.audio.sfx('flip')
    const p = this._paddles.find((pp) => pp.side === side)
    if (p && p.view && !p.view.destroyed) pop(p.view)
  },

  _toggleTilt(ctx) {
    if (!this._alive) return
    this._calm = !this._calm
    this._phys.setGravity(this._calm ? GY_CALM : GY_NORMAL)
    if (this._tiltIcon && !this._tiltIcon.destroyed) this._tiltIcon.text = this._calm ? '☁️' : '⚡'
    if (this._tiltLabel && !this._tiltLabel.destroyed) this._tiltLabel.text = this._calm ? 'Lugnt' : 'Snabbt'
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(this._calm ? 'Lugnt läge.' : 'Snabbt läge!')
    if (this._tiltBtn && !this._tiltBtn.destroyed) pop(this._tiltBtn)
  },

  // ---- Ticker: fysik, paddel-drift, drän, idle/auto-hjälp -----------------

  _update(ctx, t) {
    if (!this._alive) return
    const dms = t.deltaMS

    // Press-timers.
    this._pressMs.left = Math.max(0, this._pressMs.left - dms)
    this._pressMs.right = Math.max(0, this._pressMs.right - dms)

    // Paddel-drift (FÖRE phys.update): klampa vinkel + fjäder mot mål-vinkel.
    for (const p of this._paddles) {
      if (p.body.angle < p.lo) Body.setAngle(p.body, p.lo)
      else if (p.body.angle > p.hi) Body.setAngle(p.body, p.hi)
      const desired = this._pressMs[p.side] > 0 ? p.up : p.rest
      let av = (desired - p.body.angle) * 0.35
      av = clamp(av, -0.8, 0.8)
      Body.setAngularVelocity(p.body, av)
    }

    this._phys.update(dms)

    // Drän: kula ut genom mitten -> mjuk om-serve (ALDRIG en miss).
    if (!this._resolving && this._ball.position.y > 760) this._serveBall(ctx)

    if (this._resolving) return

    // Idle-recue + auto-hjälp (garanterad framgång).
    this._sinceTap += dms
    this._sinceLit += dms
    if (this._sinceTap > 6000) {
      this._sinceTap = 0
      ctx.services.voice.say(this.voiceIntro)
      const unlit = this._bumpers.find((b) => !b.lit)
      if (unlit && unlit.view && !unlit.view.destroyed) pop(unlit.view)
    }
    // Auto-hjälp mjukad (mönster #1): tänder bara den SISTA envisa bumpern, och först
    // efter längre idle — paddel-skickligheten bär rundan, magin räddar bara slutklämmen.
    if (this._sinceLit > 16000 && this._total - this._litCount === 1) this._magicLight(ctx)
  },

  // ---- Kollisioner: tänd bumpers ------------------------------------------

  _onHit(ctx, e) {
    if (!this._alive || this._resolving) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      let bumperBody = null
      if (a.label === 'bumper' && b.label === 'ball') bumperBody = a
      else if (b.label === 'bumper' && a.label === 'ball') bumperBody = b
      if (!bumperBody) continue
      const bump = this._bumpers[bumperBody.plugin.idx]
      if (!bump) continue
      this._kickOff(bumperBody) // liten extra studs bort -> ingen fastnar-loop
      if (bump.lit) {
        const now = performance.now()
        if (now - this._lastPop > 120) {
          this._lastPop = now
          pop(bump.view)
          ctx.services.audio.sfx('pop')
        }
      } else {
        this._lightBumper(ctx, bump)
      }
    }
  },

  _kickOff(bumperBody) {
    const ball = this._ball
    const dx = ball.position.x - bumperBody.position.x
    const dy = ball.position.y - bumperBody.position.y
    const d = Math.hypot(dx, dy) || 1
    const PUSH = 5
    Body.setVelocity(ball, { x: ball.velocity.x + (dx / d) * PUSH, y: ball.velocity.y + (dy / d) * PUSH })
  },

  _lightBumper(ctx, bump) {
    if (bump.lit || this._resolving) return
    bump.lit = true
    // Fyll dynan med sin färg, glöd-ringen pulsar.
    bump.dyna.clear().circle(0, 0, 46).fill(bump.color).stroke({ width: 5, color: lerpColor(bump.color, 0x000000, 0.25) })
    if (bump.emoji && !bump.emoji.destroyed) bump.emoji.alpha = 1
    bump.glow.clear().circle(0, 0, 60).fill({ color: bump.color, alpha: 0.34 })
    bump.glowTween?.kill()
    bump.glowTween = breathe(bump.glow, { scale: 1.18, duration: 0.9 })
    if (bump.view && !bump.view.destroyed) pop(bump.view)
    sparkle(ctx.fxLayer, bump.x, bump.y)
    // Saftigare träff: expanderande ljusring + kort mjuk skärm-mikroskak.
    ripple(ctx.fxLayer, bump.x, bump.y, { color: bump.color, maxR: 92, alpha: 0.7 })
    shake(this._root, { intensity: 4, duration: 0.28 })
    // Ton ur "skalan" (stigande pling-känsla).
    ctx.services.audio.sfx(NOTES[this._litCount % NOTES.length])
    this._litCount++
    this._sinceLit = 0
    // Tänd-mätaren fylls + Bobo rycker till.
    this._fillMeter(this._litCount - 1, bump.color)
    this._boboReact(false)
    // Aktiva mål: de redan tända bumprarna blinkar med i en liten kedja — målen
    // reagerar på varandra i stället för att bli passiva studsytor när de tänts.
    for (const other of this._bumpers) {
      if (other.lit && other !== bump && other.view && !other.view.destroyed) pop(other.view, { scale: 1.1 })
    }
    if (Math.random() < 0.4) floatText(ctx.fxLayer, bump.x, bump.y - 42, '⭐', { fontSize: 40 })
    if (this._litCount === 1) ctx.services.voice.say('Titta, den lyser!')
    if (this._litCount >= this._total) this._celebrate(ctx)
  },

  // Auto-hjälp: tänd en otänd bumper "av magi" så rundan ALLTID kan bli klar.
  _magicLight(ctx) {
    const bump = this._bumpers.find((b) => !b.lit)
    if (!bump) return
    floatText(ctx.fxLayer, bump.x, bump.y - 44, '⭐', { fontSize: 44 })
    this._lightBumper(ctx, bump)
  },

  // ---- Klart: firande + nästa runda ---------------------------------------

  _celebrate(ctx) {
    if (this._resolving) return
    this._resolving = true
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    this._boboReact(true) // Bobo hoppar av glädje när allt lyser
    ctx.progress.complete()

    // Bumpers pulsar i tur och ordning.
    this._celebrateTl?.kill()
    const tl = gsap.timeline()
    this._bumpers.forEach((b, i) => {
      tl.add(() => {
        if (this._alive && b.view && !b.view.destroyed) pop(b.view)
      }, i * 0.12)
    })
    this._celebrateTl = tl

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      this._level++
      ctx.progress.setLevel(this._level)
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      this._buildRound(ctx)
    })
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._offCollision?.()
    this._celebrateTl?.kill()
    this._nextTimer?.kill()

    if (this._leftZone && !this._leftZone.destroyed) this._leftZone.off('pointerdown', this._onLeft)
    if (this._rightZone && !this._rightZone.destroyed) this._rightZone.off('pointerdown', this._onRight)
    if (this._tiltBtn && !this._tiltBtn.destroyed) {
      this._tiltBtn.off('pointertap', this._onTilt)
      gsap.killTweensOf(this._tiltBtn.scale)
    }

    for (const p of this._paddles) {
      if (p.view && !p.view.destroyed) gsap.killTweensOf(p.view.scale)
    }
    for (const b of this._bumpers) {
      b.glowTween?.kill()
      if (b.glow && !b.glow.destroyed) gsap.killTweensOf(b.glow.scale)
      if (b.view && !b.view.destroyed) gsap.killTweensOf(b.view.scale)
    }
    if (this._ballView && !this._ballView.destroyed) gsap.killTweensOf(this._ballView.scale)
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    for (const s of this._meterPips || []) gsap.killTweensOf(s.scale)

    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Glansig vit kula (cirkel + ljusglimt).
function makeBall() {
  const c = new Container()
  const body = new Graphics().circle(0, 0, BALL_R).fill(0xf2f6fb).stroke({ width: 3, color: COLORS.inkSoft })
  const gloss = new Graphics().circle(-BALL_R * 0.3, -BALL_R * 0.32, BALL_R * 0.3).fill({ color: COLORS.white, alpha: 0.95 })
  gloss.eventMode = 'none'
  c.addChild(body, gloss)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Glansig orange paddel (rundad rektangel centrerad i origo + ljusglimt).
function makePaddleView() {
  const c = new Container()
  const g = new Graphics()
    .roundRect(-PAD_LEN / 2, -14, PAD_LEN, 28, 14)
    .fill(COLORS.orange)
    .stroke({ width: 4, color: COLORS.orangeDark })
  const gloss = new Graphics().ellipse(-PAD_LEN * 0.18, -5, PAD_LEN * 0.26, 5).fill({ color: COLORS.white, alpha: 0.45 })
  gloss.eventMode = 'none'
  c.addChild(g, gloss)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Bumper-dyna: yttre glöd-ring + dyna + emoji i mitten. Otänd = dämpad.
function makeBumper(color, emojiChar) {
  const container = new Container()
  const glow = new Graphics().circle(0, 0, 60).fill({ color, alpha: 0.12 })
  const dyna = new Graphics().circle(0, 0, 46).fill(COLORS.inkSoft).stroke({ width: 5, color })
  const emoji = new Text({ text: emojiChar, style: { fontFamily: FONT.body, fontSize: 40 } })
  emoji.anchor.set(0.5)
  emoji.alpha = 0.55
  emoji.eventMode = 'none'
  container.addChild(glow, dyna, emoji)
  container.eventMode = 'none'
  container.interactiveChildren = false
  return { container, glow, dyna, emoji }
}
