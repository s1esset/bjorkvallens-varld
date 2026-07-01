// Kugghjulen — barnet bygger en liten maskin: dra färgglada kugghjul på pinnarna
// så de GREPPAR (mesh) hela vägen från veven (vänster) till målhjulet/vinschen
// (höger). När kedjan är obruten glöder hjulen ("Den greppar!"), och när barnet
// VEVAR snurrar HELA raden på en gång (granne åt motsatt håll, snabbare ju mindre
// hjul) — målhjulet hissar Elviras flagga 🚩 och snurrar karusellen 🎠.
//
// Ingen matter.js: ren geometrisk rotationskoppling (mesh när mittavstånd ≈ r1+r2,
// BFS från veven ger djup → riktning (−1)^djup och fart r0/r). Allt deterministiskt
// och exit-säkert i ticker + GSAP. INGET misslyckande: fel hjul snurrar bara fritt,
// en glödande spök-kugg pekar på nästa pinne, rätt dispenser vinkar, och efter
// idle/missar flyger rätt hjul själv dit. Vinschen hissar flaggan oavsett vevriktning.
//
// Endast Pixi Graphics + emoji (inga filer). Elvira = enda avbildade människan.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, puff, sparkle, burst, breathe, bigCelebration, floatText, ripple } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Layout & fysikkonstanter (designkoordinater 1280×720) -----------------
const C = { x: 230, y: 360 } // vevens centrum (fast)
const R0 = 66 // vevens radie
const RT = 66 // målhjulets radie
const MESH_TOL = 14 // |dist − (rA+rB)| < detta ⇒ två hjul greppar
const FULL = Math.PI * 6 // total målrotation som hissar flaggan helt (≈3 varv)
const FLAG_TOP_Y = 150
const IDLE_RECUE = 6 // s utan interaktion → mjuk röst-recue
const IDLE_HELP = 14 // s utan interaktion → auto-hjälp flyger rätt hjul dit
const STUCK_HELP = 3 // antal placeringar utan framsteg → auto-hjälp

// Tre hjulstorlekar (radie + färg = storleks-ledtråd).
const SIZES = {
  S: { r: 50, color: COLORS.blue, x: 540 },
  M: { r: 66, color: COLORS.orange, x: 700 },
  L: { r: 84, color: COLORS.green, x: 860 },
}
const TRAY_Y = 660

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const wrapAngle = (d) => Math.atan2(Math.sin(d), Math.cos(d))

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

export default {
  id: 'kugghjulen',
  titleSv: 'Kugghjulen',
  icon: '⚙️',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'kugghjulen',
  voiceIntro: 'Sätt kugghjulen på pinnarna så de greppar — veva sedan!',

  init(ctx) {
    this._alive = true
    this._gears = []
    this._pegViews = []
    this._solutionPegs = []
    this._dispensers = {}
    this._crankAngle = 0
    this._targetFactor = 0
    this._chainComplete = false
    this._resolving = false
    this._flagProgress = 0
    this._prevTargetAngle = 0
    this._lastFlagSpark = 0
    this._idle = 0
    this._helpIdle = 0
    this._stuck = 0
    this._cranking = false
    this._lastCrankSound = 0
    this._jitter = false

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST (varm verkstadston).
    this._root.addChild(createScene('warm', { ground: false, width: ctx.width, height: ctx.height }))

    // Osynlig fångare för tomma tryck (mjuk ring + ljud — aldrig en bestraffning).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onEmptyTap = (e) => {
      if (e.target !== this._catcher || !this._alive || this._resolving) return
      const p = this._root.toLocal(e.global)
      ctx.services.audio.sfx('soft')
      ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 60 })
      this._idle = 0
    }
    this._catcher.on('pointertap', this._onEmptyTap)
    this._root.addChild(this._catcher)

    // Pegboard-panel (träbrun verkstadsskiva) + håldekor.
    const panel = new Graphics()
    panel.roundRect(120, 110, 1040, 470, 30).fill({ color: COLORS.brown, alpha: 0.16 }).stroke({ width: 8, color: COLORS.brown, alpha: 0.5 })
    for (let x = 150; x < 1160; x += 60) {
      for (let y = 140; y < 580; y += 60) {
        panel.circle(x, y, 4).fill({ color: COLORS.brown, alpha: 0.18 })
      }
    }
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Lager (alla i origo → designkoordinater matchar DragControllers _root-space).
    this._pole = new Graphics()
    this._pole.eventMode = 'none'
    this._root.addChild(this._pole)

    this._pegLayer = new Container()
    this._root.addChild(this._pegLayer)

    this._gearLayer = new Container()
    this._root.addChild(this._gearLayer)

    this._machineLayer = new Container()
    this._root.addChild(this._machineLayer)

    this._flagLayer = new Container()
    this._flagLayer.eventMode = 'none'
    this._flagLayer.interactiveChildren = false
    this._root.addChild(this._flagLayer)

    this._trayLayer = new Container()
    this._root.addChild(this._trayLayer)

    // Vev (fast, vänster) = rött kugghjul med gult handtag.
    this._crank = makeGear(R0, COLORS.red)
    const handle = new Graphics().circle(0, 0, 22).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white })
    handle.position.set(0.7 * R0, 0)
    handle.eventMode = 'none'
    this._crank.addChild(handle)
    this._crank.position.set(C.x, C.y)
    this._crank.eventMode = 'static'
    this._crank.cursor = 'pointer'
    this._crank.hitArea = new Circle(0, 0, 72)
    this._onCrankDown = (e) => this._crankDown(ctx, e)
    this._onCrankMove = (e) => this._crankMove(ctx, e)
    this._onCrankUp = () => this._crankUp(ctx)
    this._crank.on('pointerdown', this._onCrankDown)
    this._machineLayer.addChild(this._crank)

    // Målhjul / vinsch (fast, lila) — position sätts per nivå.
    this._targetWheel = makeGear(RT, COLORS.purple)
    const band = new Graphics().circle(0, 0, RT + 6).stroke({ width: 4, color: COLORS.purple, alpha: 0.5 })
    band.eventMode = 'none'
    this._targetWheel.addChildAt(band, 0)
    this._targetWheel.eventMode = 'none'
    this._machineLayer.addChild(this._targetWheel)

    // Karusell 🎠 + Elvira 👧 (belöning/dekor till höger om målet).
    this._carousel = new Text({ text: '🎠', style: { fontFamily: FONT.body, fontSize: 96 } })
    this._carousel.anchor.set(0.5)
    this._carousel.eventMode = 'none'
    this._machineLayer.addChild(this._carousel)

    this._elvira = new Text({ text: '👧', style: { fontFamily: FONT.body, fontSize: 84 } })
    this._elvira.anchor.set(0.5)
    this._elvira.eventMode = 'none'
    this._machineLayer.addChild(this._elvira)

    // Flagga 🚩 (klättrar längs stången).
    this._flag = new Text({ text: '🚩', style: { fontFamily: FONT.body, fontSize: 72 } })
    this._flag.anchor.set(0.5)
    this._flag.eventMode = 'none'
    this._flagLayer.addChild(this._flag)

    // Bricka (oändliga dispensrar i tre storlekar).
    const shelf = new Graphics().roundRect(120, 612, 1040, 96, 24).fill({ color: COLORS.brown, alpha: 0.22 })
    shelf.eventMode = 'none'
    this._trayLayer.addChild(shelf)
    for (const size of ['S', 'M', 'L']) {
      const def = SIZES[size]
      const view = makeGear(def.r, def.color)
      view.position.set(def.x, TRAY_Y)
      view.eventMode = 'static'
      view.cursor = 'pointer'
      view.hitArea = new Circle(0, 0, 70)
      this._trayLayer.addChild(view)
      this._dispensers[size] = { view, size, home: { x: def.x, y: TRAY_Y }, rec: null, hint: null }
    }

    this._drag = new DragController({ space: this._root, services: ctx.services })

    // Startnivå (cappad 1–5; cyklar längre/jittrade kedjor efteråt).
    this._level = clamp((ctx.progress.get().highestLevel | 0) || 1, 1, 5)
    this._buildLevel(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivåuppbyggnad -----------------------------------------------------

  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._clearLevel(ctx)
    this._crankAngle = 0
    this._targetFactor = 0
    this._chainComplete = false
    this._resolving = false
    this._flagProgress = 0
    this._prevTargetAngle = 0
    this._lastFlagSpark = 0
    this._idle = 0
    this._helpIdle = 0
    this._stuck = 0
    this._jitter = level > 5

    const { solution, T, decoys } = this._buildChainPegs(level)
    this._solutionPegs = solution
    this._T = T

    // Rita pinn-hål + registrera som drop-mål.
    const allPegs = [...solution.map((s) => s.peg), ...decoys]
    for (const peg of allPegs) {
      const hole = new Graphics()
        .circle(0, 0, 16)
        .fill({ color: COLORS.inkSoft, alpha: 0.35 })
        .stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.5 })
      hole.position.set(peg.x, peg.y)
      hole.hitArea = new Circle(0, 0, 70)
      hole._peg = peg
      this._pegLayer.addChild(hole)
      this._pegViews.push(hole)
      this._drag.addTarget(hole, () => !this._resolving, { hitRadius: 80 })
    }

    // (Åter)registrera dispensrar som drag-källor.
    for (const size of ['S', 'M', 'L']) {
      const d = this._dispensers[size]
      gsap.killTweensOf(d.view)
      gsap.killTweensOf(d.view.scale)
      d.view.position.set(d.home.x, d.home.y)
      d.view.scale.set(1)
      d.view.rotation = 0
      d.view.eventMode = 'static'
      d.rec = this._drag.addItem(d.view, { size }, {
        onCorrect: (rec, target) => this._placeFromDispenser(ctx, rec, target),
        onMiss: (rec) => this._missDispenser(ctx, rec),
      })
    }

    this._positionMachine()
    this._rebuildMesh(ctx)
  },

  _clearLevel(ctx) {
    this._drag?.clear()
    this._autoCrankTween?.kill()
    for (const g of this._gears) this._killGearTweens(g)
    for (const g of this._gears) if (g.view && !g.view.destroyed) g.view.destroy()
    this._gears = []
    this._ghostBreathe?.kill()
    this._ghostBreathe = null
    if (this._ghost && !this._ghost.destroyed) this._ghost.destroy()
    this._ghost = null
    this._stopDispenserHints()
    for (const v of this._pegViews) if (v && !v.destroyed) v.destroy()
    this._pegViews = []
    for (const o of [this._carousel, this._elvira, this._flag, this._targetWheel]) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
  },

  // Marschera pinnar från veven: varje granne-par greppar (mittavstånd = r_a+r_b).
  _buildChainPegs(level) {
    const pat = this._pattern(level)
    let px = C.x
    let py = C.y
    let pr = R0
    const solution = []
    for (let i = 0; i < pat.length; i++) {
      const size = pat[i]
      const r = SIZES[size].r
      const d = pr + r // mittavstånd som ger exakt mesh
      const alpha = (i % 2 === 0 ? 1 : -1) * 0.05 + (this._jitter ? (Math.random() * 2 - 1) * 0.02 : 0)
      px += d * Math.cos(alpha)
      py += d * Math.sin(alpha)
      const peg = { x: px, y: clamp(py, 210, 560), gear: null }
      py = peg.y
      solution.push({ peg, size })
      pr = r
    }
    // Målhjulet så avståndet från sista hjulet = r_sista + RT (greppar).
    const dT = pr + RT
    const T = { x: px + dT * Math.cos(0.04), y: clamp(py + dT * Math.sin(0.04), 210, 540) }

    // Decoy-pinnar (lock): en extra tom väg som inte leder till målet.
    const decoys = []
    const nDecoy = level >= 5 ? 2 : level >= 4 ? 1 : 0
    for (let k = 0; k < nDecoy; k++) {
      const base = solution[Math.min(solution.length - 1, 1 + k)].peg
      const off = (k % 2 === 0 ? 1 : -1) * 130
      decoys.push({ x: clamp(base.x + (Math.random() * 40 - 20), 200, 1120), y: clamp(base.y + off, 210, 560), gear: null })
    }
    return { solution, T, decoys }
  },

  _pattern(level) {
    const base = { 1: ['M'], 2: ['M', 'L'], 3: ['L', 'M', 'L'], 4: ['M', 'L', 'S', 'M'], 5: ['M', 'L', 'M', 'L', 'M'] }
    if (level <= 5) return base[level]
    return randomFrom([base[3], base[4], base[5]])
  },

  _positionMachine() {
    const T = this._T
    this._targetWheel.position.set(T.x, T.y)
    this._carousel.position.set(T.x + 96, T.y + 96)
    this._elviraHome = { x: T.x + 150, y: T.y + 96 }
    if (this._elvira && !this._elvira.destroyed) {
      this._elvira.text = '👧'
      this._elvira.position.set(this._elviraHome.x, this._elviraHome.y)
    }
    this._pole.clear()
    this._pole.moveTo(T.x, T.y - 30).lineTo(T.x, FLAG_TOP_Y).stroke({ width: 10, color: COLORS.inkSoft })
    this._flagBottom = T.y - 40
    this._flag.position.set(T.x, this._flagBottom)
  },

  // ---- Placera hjul från en dispenser -------------------------------------

  _placeFromDispenser(ctx, rec, target) {
    this._resetDispenser(rec)
    if (!this._alive) return
    const peg = target.view?._peg
    if (!peg) return
    this._idle = 0
    this._helpIdle = 0
    const before = this._frontierIndex()
    ctx.services.audio.sfx('pop')
    this._spawnGear(ctx, peg, rec.data.size, {})
    sparkle(ctx.fxLayer, peg.x, peg.y, { count: 5 })
    // Elvira följer bygget med blicken (liten nyfiken puls per hjul).
    if (!this._chainComplete) this._setElvira('😊')
    this._rebuildMesh(ctx)
    const after = this._frontierIndex()
    if (after > before) this._stuck = 0
    else this._stuck++
    if (this._stuck >= STUCK_HELP && !this._chainComplete) {
      this._stuck = 0
      gsap.delayedCall(0.5, () => this._alive && this._autoHelp(ctx))
    }
  },

  _missDispenser(ctx, rec) {
    if (!this._alive) return
    ctx.services.audio.sfx('soft')
    if (rec.view && !rec.view.destroyed) puff(ctx.fxLayer, rec.view.x, rec.view.y)
  },

  // DragController flyttade dispenser-vyn till pinnen + satte placed=true; skicka
  // tillbaka den till brickan så förrådet är oändligt.
  _resetDispenser(rec) {
    gsap.killTweensOf(rec.view)
    rec.placed = false
    rec.view.eventMode = 'static'
    rec.view.cursor = 'pointer'
    const home = rec.home || { x: rec.view.x, y: rec.view.y }
    rec.view.position.set(home.x, home.y)
    rec.view.scale.set(rec.base?.x || 1, rec.base?.y || 1)
    if (!rec.view.destroyed) pop(rec.view, { scale: 1.08 })
  },

  // Skapa ett permanent hjul på en pinne (ersätt ev. befintligt). opts.from →
  // hjulet flyger dit från brickan (auto-hjälp), annars studsar det in på plats.
  _spawnGear(ctx, peg, size, opts = {}) {
    if (peg.gear) this._removeGearFromPeg(ctx, peg)
    const def = SIZES[size]
    const view = makeGear(def.r, def.color)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 70)
    const gear = { view, r: def.r, size, peg, driven: false, depth: -1, factor: 0, freeAngle: 0, freeVel: 0, fly: null }
    gear.onTap = () => this._tapGear(ctx, gear)
    view.on('pointertap', gear.onTap)
    peg.gear = gear
    this._gears.push(gear)
    this._gearLayer.addChild(view)
    if (opts.from) {
      view.position.set(opts.from.x, opts.from.y)
      const st = { x: opts.from.x, y: opts.from.y }
      gear.fly = gsap.to(st, {
        x: peg.x, y: peg.y, duration: 0.7, ease: 'power2.inOut',
        onUpdate: () => {
          if (!this._alive || view.destroyed) {
            gear.fly?.kill()
            return
          }
          view.position.set(st.x, st.y)
        },
        onComplete: () => {
          gear.fly = null
          if (!this._alive || view.destroyed) return
          view.position.set(peg.x, peg.y)
          pop(view)
          ctx.services.audio.sfx('match')
          sparkle(ctx.fxLayer, peg.x, peg.y)
          this._rebuildMesh(ctx)
        },
      })
    } else {
      view.position.set(peg.x, peg.y)
      bounceIn(view, { duration: 0.4 })
    }
    return gear
  },

  _removeGearFromPeg(ctx, peg) {
    const old = peg.gear
    if (!old) return
    peg.gear = null
    this._gears = this._gears.filter((g) => g !== old)
    this._killGearTweens(old)
    if (old.view && !old.view.destroyed) {
      puff(ctx.fxLayer, peg.x, peg.y)
      old.view.off('pointertap', old.onTap)
      old.view.destroy()
    }
  },

  _killGearTweens(g) {
    g.fly?.kill?.()
    if (g.view && !g.view.destroyed) {
      gsap.killTweensOf(g.view)
      gsap.killTweensOf(g.view.scale)
    }
  },

  // Puls som ALLTID utgår från basskala 1 — annars kan pop() fånga en pågående
  // bounceIn/pop-skala som "bas" och lämna hjulet krympt (t.ex. 0.19).
  _popScale(view, scale = 1.14) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    view.scale.set(1)
    pop(view, { scale })
  },

  // Tap på ett placerat hjul: drivet → glad puls; fritt (greppar ej) → liten egen
  // snurr-impuls + mjukt ljud + spök-hinten pulsar (vänlig vink, aldrig fel).
  _tapGear(ctx, gear) {
    if (!this._alive || this._resolving || gear.view.destroyed) return
    this._idle = 0
    if (gear.driven) {
      this._popScale(gear.view, 1.18)
      ctx.services.audio.sfx('tap')
    } else {
      gear.freeVel += 0.25
      ctx.services.audio.sfx('soft')
      if (this._ghost && !this._ghost.destroyed) pop(this._ghost)
    }
  },

  // ---- Mesh-graf: vilka hjul greppar och drivs av veven -------------------

  _rebuildMesh(ctx) {
    const crankNode = { x: C.x, y: C.y, r: R0, gear: null }
    const targetNode = { x: this._T.x, y: this._T.y, r: RT, gear: null }
    const gearNodes = this._gears.map((g) => ({ x: g.peg.x, y: g.peg.y, r: g.r, gear: g }))
    const nodes = [crankNode, ...gearNodes, targetNode]
    const n = nodes.length

    const adj = nodes.map(() => [])
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (Math.abs(dist - (a.r + b.r)) < MESH_TOL) {
          adj[i].push(j)
          adj[j].push(i)
        }
      }
    }

    for (const g of this._gears) {
      g.driven = false
      g.depth = -1
      g.factor = 0
    }

    // BFS från veven: djup ⇒ riktning (−1)^djup, fart r0/r (mellanradier kancellerar).
    const depth = new Array(n).fill(-1)
    const factor = new Array(n).fill(0)
    depth[0] = 0
    factor[0] = 1
    const q = [0]
    while (q.length) {
      const u = q.shift()
      for (const v of adj[u]) {
        if (depth[v] < 0) {
          depth[v] = depth[u] + 1
          factor[v] = (depth[v] % 2 ? -1 : 1) * (R0 / nodes[v].r)
          q.push(v)
        }
      }
    }
    for (let i = 0; i < n; i++) {
      if (nodes[i].gear && depth[i] >= 0) {
        nodes[i].gear.driven = true
        nodes[i].gear.depth = depth[i]
        nodes[i].gear.factor = factor[i]
      }
    }

    this._targetFactor = depth[n - 1] >= 0 ? factor[n - 1] : 0
    const wasComplete = this._chainComplete
    this._chainComplete = depth[n - 1] >= 0

    this._updateHint(ctx)

    if (this._chainComplete && !wasComplete) {
      this._prevTargetAngle = this._crankAngle * this._targetFactor
      this._onChainGrips(ctx)
    }
  },

  _onChainGrips(ctx) {
    ctx.services.audio.sfx('match')
    ctx.services.audio.sfx('reveal')
    // Greppa-juice: ett distinkt "klonk"-klick-i-läge när kuggarna faller i grepp.
    ctx.services.audio.tone?.({ freq: 300, slideTo: 150, dur: 0.14, type: 'triangle', vol: 0.5 })
    // Glödpuls + gnistra längs kedjan (i djupordning) — mjukt ryck som vandrar hela raden.
    const chain = this._gears.filter((g) => g.driven).sort((a, b) => a.depth - b.depth)
    chain.forEach((g, i) => {
      gsap.delayedCall(0.08 * i, () => {
        if (!this._alive || !g.view || g.view.destroyed) return
        this._popScale(g.view, 1.14)
        sparkle(ctx.fxLayer, g.peg.x, g.peg.y, { count: 5 })
        ctx.services.audio.tone?.({ freq: 520 + i * 40, dur: 0.05, type: 'triangle', vol: 0.16 })
      })
    })
    if (this._targetWheel && !this._targetWheel.destroyed) this._popScale(this._targetWheel, 1.14)
    // Elvira ser att det greppar och klappar i händerna.
    this._setElvira('🙌', { hop: true })
    // Fira storleks-skillnaden: det minsta hjulet snurrar fortast ("Vroom!").
    gsap.delayedCall(0.08 * chain.length + 0.15, () => this._alive && this._celebrateSpeed(ctx))
    ctx.services.voice.say('Den greppar! Veva nu!')
  },

  // Elvira är en levande mottagare: byt uttryck + liten hopp/puls (aldrig bara dekor).
  _setElvira(emoji, { hop = false } = {}) {
    if (!this._alive || !this._elvira || this._elvira.destroyed) return
    this._elvira.text = emoji
    this._popScale(this._elvira, 1.2)
    if (hop && this._elviraHome) {
      const base = this._elviraHome.y
      const st = { y: base }
      gsap.to(st, {
        y: base - 24, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out',
        onUpdate: () => { if (this._alive && this._elvira && !this._elvira.destroyed) this._elvira.y = st.y },
        onComplete: () => { if (this._alive && this._elvira && !this._elvira.destroyed) this._elvira.y = base },
      })
    }
  },

  // Fira den smartaste idén: hitta det snabbaste (minsta) drivna hjulet och lyft
  // fram fart-skillnaden med en synlig "Vroom!" + gnistor + snabb piggpuls.
  _celebrateSpeed(ctx) {
    if (!this._alive) return
    const driven = this._gears.filter((g) => g.driven && g.view && !g.view.destroyed)
    if (!driven.length) return
    let fast = driven[0]
    for (const g of driven) if (Math.abs(g.factor) > Math.abs(fast.factor)) fast = g
    if (Math.abs(fast.factor) <= 1.05) return // inget hjul mindre än veven → inget att fira
    floatText(ctx.fxLayer, fast.peg.x, fast.peg.y - fast.r - 18, 'Vroom!', { fontSize: 46 })
    sparkle(ctx.fxLayer, fast.peg.x, fast.peg.y, { count: 8 })
    this._popScale(fast.view, 1.22)
    ctx.services.audio.tone?.({ freq: 520, slideTo: 920, dur: 0.18, type: 'triangle', vol: 0.32 })
  },

  // Första lösningspinnen utan rätt-storleks-hjul (frontier).
  _frontierIndex() {
    for (let i = 0; i < this._solutionPegs.length; i++) {
      const s = this._solutionPegs[i]
      if (!(s.peg.gear && s.peg.gear.size === s.size)) return i
    }
    return this._solutionPegs.length
  },

  // Spök-kugg på frontier-pinnen + lugn puls på rätt dispenser + glöd på drivna hjul.
  _updateHint(ctx) {
    this._ghostBreathe?.kill()
    this._ghostBreathe = null
    if (this._ghost && !this._ghost.destroyed) this._ghost.destroy()
    this._ghost = null
    this._stopDispenserHints()

    for (const g of this._gears) {
      if (g.view && !g.view.destroyed && g.view._glow) g.view._glow.visible = g.driven
    }

    const fi = this._frontierIndex()
    if (this._chainComplete || fi >= this._solutionPegs.length) return

    const s = this._solutionPegs[fi]
    const ghost = makeGear(SIZES[s.size].r, SIZES[s.size].color)
    ghost.alpha = 0.32
    ghost.eventMode = 'none'
    ghost.interactiveChildren = false
    ghost.position.set(s.peg.x, s.peg.y)
    this._gearLayer.addChild(ghost)
    this._ghost = ghost
    this._ghostBreathe = breathe(ghost, { scale: 1.12, duration: 0.9 })

    const disp = this._dispensers[s.size]
    if (disp && disp.view && !disp.view.destroyed) disp.hint = breathe(disp.view, { scale: 1.08, duration: 0.95 })
  },

  _stopDispenserHints() {
    for (const size of ['S', 'M', 'L']) {
      const d = this._dispensers[size]
      if (!d) continue
      d.hint?.kill()
      d.hint = null
      if (d.view && !d.view.destroyed && !this._isDragging(d)) d.view.scale.set(1)
    }
  },

  _isDragging(d) {
    return this._drag && this._drag.active && this._drag.active.view === d.view
  },

  // ---- Veva ---------------------------------------------------------------

  _crankDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._autoCrankTween?.kill()
    this._cranking = true
    this._crankMoved = false
    this._idle = 0
    this._helpIdle = 0
    const p = this._root.toLocal(e.global)
    this._lastAng = Math.atan2(p.y - C.y, p.x - C.x)
    ctx.services.audio.sfx('tap')
    pop(this._crank, { scale: 1.06 })
    this._crank.on('globalpointermove', this._onCrankMove)
    this._crank.on('pointerup', this._onCrankUp)
    this._crank.on('pointerupoutside', this._onCrankUp)
  },

  _crankMove(ctx, e) {
    if (!this._cranking) return
    const p = this._root.toLocal(e.global)
    const a = Math.atan2(p.y - C.y, p.x - C.x)
    const d = wrapAngle(a - this._lastAng)
    this._crankAngle += d
    this._lastAng = a
    if (Math.abs(d) > 0.04) this._crankMoved = true
    this._idle = 0
    const now = performance.now()
    if (now - this._lastCrankSound > 140) {
      this._lastCrankSound = now
      ctx.services.audio.sfx('tap')
    }
  },

  _crankUp(ctx) {
    if (!this._cranking) return
    this._cranking = false
    this._crank.off('globalpointermove', this._onCrankMove)
    this._crank.off('pointerup', this._onCrankUp)
    this._crank.off('pointerupoutside', this._onCrankUp)
    if (!this._crankMoved) this._autoCrank(ctx)
  },

  // Tap på veven → den vevar själv två varv (de minsta kan bara tappa).
  _autoCrank(ctx) {
    if (!this._alive || this._resolving) return
    this._autoCrankTween?.kill()
    ctx.services.audio.sfx('whoosh')
    const st = { a: this._crankAngle }
    this._autoCrankTween = gsap.to(st, {
      a: this._crankAngle + Math.PI * 4, duration: 2.2, ease: 'power1.inOut',
      onUpdate: () => {
        if (!this._alive) {
          this._autoCrankTween?.kill()
          return
        }
        this._crankAngle = st.a
        this._idle = 0
        this._helpIdle = 0
      },
    })
  },

  // ---- Ticker: rotationskoppling, flagga, idle/auto-hjälp -----------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 16.6667
    const dtSec = ticker.deltaMS / 1000

    if (this._crank && !this._crank.destroyed) this._crank.rotation = this._crankAngle

    for (const g of this._gears) {
      if (!g.view || g.view.destroyed || g.fly) continue
      if (g.driven) {
        g.view.rotation = this._crankAngle * g.factor
      } else {
        g.freeAngle += g.freeVel * dt
        g.freeVel *= Math.pow(0.94, dt)
        g.view.rotation = g.freeAngle
      }
    }

    if (this._chainComplete && !this._resolving) {
      const ta = this._crankAngle * this._targetFactor
      this._flagProgress += Math.abs(ta - this._prevTargetAngle) // absolut delta ⇒ fram & tillbaka hissar
      this._prevTargetAngle = ta
      if (this._targetWheel && !this._targetWheel.destroyed) this._targetWheel.rotation = ta
      if (this._carousel && !this._carousel.destroyed) this._carousel.rotation = ta
      const prog = clamp(this._flagProgress / FULL, 0, 1)
      if (this._flag && !this._flag.destroyed) this._flag.y = lerp(this._flagBottom, FLAG_TOP_Y, prog)
      if (this._flagProgress - this._lastFlagSpark > FULL / 8) {
        this._lastFlagSpark = this._flagProgress
        if (this._flag && !this._flag.destroyed) sparkle(ctx.fxLayer, this._flag.x, this._flag.y)
      }
      if (this._flagProgress >= FULL) this._onComplete(ctx)
    } else if (this._targetWheel && !this._targetWheel.destroyed && !this._resolving) {
      this._targetWheel.rotation = this._crankAngle * this._targetFactor
    }

    if (!this._resolving) {
      this._idle += dtSec
      this._helpIdle += dtSec
      if (this._idle >= IDLE_RECUE) {
        this._idle = 0
        this._recue(ctx)
      }
      if (this._helpIdle >= IDLE_HELP && !this._chainComplete) {
        this._helpIdle = 0
        this._autoHelp(ctx)
      }
    }
  },

  _recue(ctx) {
    if (this._chainComplete) {
      ctx.services.voice.say('Veva nu!')
    } else if (ctx.services.voice.replayLast) {
      ctx.services.voice.replayLast()
    } else {
      ctx.services.voice.say(this.voiceIntro)
    }
    if (this._ghost && !this._ghost.destroyed) pop(this._ghost)
    const fi = this._frontierIndex()
    if (fi < this._solutionPegs.length) {
      const disp = this._dispensers[this._solutionPegs[fi].size]
      if (disp && disp.view && !disp.view.destroyed) pop(disp.view)
    }
  },

  // No-fail-garanti: rätt hjul flyger själv från brickan till frontier-pinnen.
  _autoHelp(ctx) {
    if (!this._alive || this._resolving || this._chainComplete) return
    const fi = this._frontierIndex()
    if (fi >= this._solutionPegs.length) return
    const s = this._solutionPegs[fi]
    const disp = this._dispensers[s.size]
    if (!disp) return
    ctx.services.voice.say('Titta!')
    floatText(ctx.fxLayer, disp.home.x, disp.home.y - 50, 'Titta!')
    this._spawnGear(ctx, s.peg, s.size, { from: { x: disp.home.x, y: disp.home.y } })
    this._stuck = 0
    this._idle = 0
    this._helpIdle = 0
  },

  // ---- Klart --------------------------------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    if (this._flag && !this._flag.destroyed) {
      this._flag.y = FLAG_TOP_Y
      pop(this._flag, { scale: 1.3 })
    }
    ctx.services.audio.sfx('celebrate')
    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(randomFrom(PRAISE))

    // Elvira firar och åker karusellen: byt till glad min och guppa runt på hjulet.
    this._setElvira('🥳')
    if (this._elvira && !this._elvira.destroyed && this._carousel && !this._carousel.destroyed) {
      const cx = this._carousel.x
      const cy = this._carousel.y - 24
      const st = { t: 0 }
      gsap.to(st, {
        t: 1, duration: 1.5, ease: 'power1.out',
        onUpdate: () => {
          if (!this._alive || !this._elvira || this._elvira.destroyed) return
          const a = st.t * Math.PI * 4
          this._elvira.position.set(cx + Math.cos(a) * 14, cy + Math.sin(a) * 10)
        },
      })
    }
    if (this._carousel && !this._carousel.destroyed) {
      gsap.to(this._carousel, { rotation: this._carousel.rotation + Math.PI * 4, duration: 1.6, ease: 'power1.out' })
    }

    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, this._T.x, 170)
    sparkle(ctx.fxLayer, this._T.x, FLAG_TOP_Y + 10, { count: 10 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete()

    this._levelTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildLevel(ctx, this._level)
    })
  },

  // ---- Städning -----------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._autoCrankTween?.kill()
    this._levelTimer?.kill?.()
    this._ghostBreathe?.kill()

    if (this._crank && !this._crank.destroyed) {
      this._crank.off('pointerdown', this._onCrankDown)
      this._crank.off('globalpointermove', this._onCrankMove)
      this._crank.off('pointerup', this._onCrankUp)
      this._crank.off('pointerupoutside', this._onCrankUp)
    }
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onEmptyTap)

    this._drag?.destroy()
    this._stopDispenserHints()

    for (const o of [this._crank, this._targetWheel, this._carousel, this._elvira, this._flag, this._ghost]) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    for (const g of this._gears) this._killGearTweens(g)
    for (const size of ['S', 'M', 'L']) {
      const d = this._dispensers?.[size]
      if (d?.view && !d.view.destroyed) {
        gsap.killTweensOf(d.view)
        gsap.killTweensOf(d.view.scale)
      }
    }

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ===== Programmatisk konst ===============================================

// Ett kugghjul: glöd (dold), kuggar runt om, kropp, glans, nav med ekrar.
// Ankrat i (0,0) och roteras som en enhet.
function makeGear(r, color) {
  const c = new Container()
  const dark = darken(color, 0.28)

  const glow = new Graphics().circle(0, 0, r + 10).fill({ color: 0xfff3b0, alpha: 0.55 })
  glow.visible = false
  glow.eventMode = 'none'
  c.addChild(glow)
  c._glow = glow

  const teeth = new Container()
  teeth.eventMode = 'none'
  const n = Math.max(6, Math.round(r / 7))
  const tw = r * 0.34
  const th = r * 0.24
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const t = new Graphics().roundRect(-tw / 2, -th / 2, tw, th, th * 0.4).fill(color)
    t.position.set(Math.cos(a) * r, Math.sin(a) * r)
    t.rotation = a
    t.eventMode = 'none'
    teeth.addChild(t)
  }
  c.addChild(teeth)

  const body = new Graphics().circle(0, 0, r).fill(color).stroke({ width: 4, color: dark })
  body.eventMode = 'none'
  c.addChild(body)

  const sheen = new Graphics().circle(-r * 0.25, -r * 0.25, r * 0.5).fill({ color: 0xffffff, alpha: 0.18 })
  sheen.eventMode = 'none'
  c.addChild(sheen)

  const hub = new Graphics().circle(0, 0, r * 0.32).fill(COLORS.cream).stroke({ width: 3, color: dark })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    hub.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28)
  }
  hub.stroke({ width: 3, color: dark })
  hub.eventMode = 'none'
  c.addChild(hub)

  return c
}
