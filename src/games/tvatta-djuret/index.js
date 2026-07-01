// Tvätta Djuret — motorik / dra (2–4 år). Ett gladlynt men LERIGT djur (Alissas
// ponny / en glad gris / Lovas valp, cyklas per nivå) väntar på bad. Barnet gör det
// rent i TVÅ steg med två verktyg, och båda krävs för 100 %:
//   1) Svampen 🧽: dra (eller tap-tap) över kroppen → lerklumparna under svampen
//      suddas bort och avtäcker ren päls; varje borttagen klump lämnar en skum-fläck.
//   2) Duschen 🚿: dra över kroppen → egna vattendroppar regnar, skummet sköljs bort
//      och den glänsande pälsen träder fram med gnistror.
// Renhets-mätaren fylls av båda: renhet = 0.6·skrubbat + 0.4·sköljt. När all lera är
// borta OCH allt skum sköljt → djuret skakar av sig vatten, glittrar, klistermärke +
// progress.complete(), sedan nästa (lerigare) djur. Oändlig, lugn lek.
//
// NO-FAIL: att dra utanför djuret ger bara en mjuk såpbubbla, aldrig straff. Skrubb
// går ENDAST framåt, mätaren sjunker aldrig, och mjuk auto-hjälp (idle-vink + att de
// sista fläckarna städas själva när framsteg uteblir) garanterar att 100 % alltid nås.
//
// Verktygen följer fingret KONTINUERLIGT via egen pekspårning (pointerdown på verktyget
// + globalpointermove/pointerup på verktyget, som i pruttbad/valpens-bajs) — INTE
// DragController (som bara snäpper till mål). Tap-tap-fallback bakas in för de minsta.
// Vattendroppar är en egen, exit-säker ticker-integrator (ingen GSAP på droppar; allt
// ritas i this._spray). Lerklumpar/skum suddas via {}-proxy-mönstret; partiklar/firande
// går via lib/feedback.js (redan exit-säkra).
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, puff, sparkle, burst, breathe, floatText, shake, bigCelebration } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Geometri (designkoordinater).
const CX = 640
const CY = 430
const FACE_X = 470 // ansiktets mitt (== huvud-ellipsen)
const FACE_Y = 330
const FACE_R = 82 // lerfri ruta runt ansiktet så minen ALLTID syns under tvätten
const MUD = 0x8a5a3b // lera (== COLORS.brown)
const DARKMUD = 0x6b4429 // mörkare lera (prickar + dubbel-lager)

// Djurtyper per nivå.
const TYPES = [
  { kind: 'pony', color: 0xe9d2a8, dark: 0xcbb085, emoji: '🐴', sample: 'hast', step: 44 },
  { kind: 'pig', color: COLORS.pink, dark: 0xe87fa6, emoji: '🐷', sample: 'gris', step: 38, scale: 1.05 },
  { kind: 'puppy', color: 0xcaa472, dark: 0xa9824f, emoji: '🐶', sample: 'hund', step: 32, doubles: true },
]

export default {
  id: 'tvatta-djuret',
  titleSv: 'Tvätta Djuret',
  icon: '🧽',
  category: 'motorik',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'tvatta-djuret',
  voiceIntro: 'Tvätta djuret rent! Dra svampen över kroppen.',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._held = null
    this._selectedTool = null
    this._sprayOn = false
    this._moved = false
    this._idle = 0
    this._noProgress = 0
    this._drops = []
    this._foam = []
    this._flakes = []
    this._bubbles = [] // stigande tvålbubblor i karet (ritas i this._tubFx)
    this._waterT = 0 // fas för skvalpande vattenskimmer
    this._face = null // ansikts-emoji (djurets min) — reagerar på beröring
    this._lastScrubPt = null // för "kittlad"-hopp när man gnuggar samma ställe
    this._tweens = []
    this._totalMud = 0
    this._scrubbed = 0
    this._rinsed = 0
    this._scrubCount = 0
    this._gaugeFillW = 0
    this._lastScrubSnd = 0
    this._lastRinseSnd = 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn).
    this._root.addChild(createScene('meadow'))

    this._buildTub()

    // Osynlig tap-yta över djuret (tap-tap-fallback). Ligger under de eventMode-'none'
    // visuella lagren men fångar tap eftersom de släpper igenom hit-testet.
    const area = new Container()
    area.hitArea = new Rectangle(300, 180, 680, 430)
    area.eventMode = 'static'
    this._animalTapH = (e) => this._animalTap(ctx, e)
    area.on('pointertap', this._animalTapH)
    this._animalArea = area
    this._root.addChild(area)

    // Lager (bakifrån): rent djur → lera → skum → vattenspray.
    this._clean = new Container()
    this._clean.eventMode = 'none'
    this._mudLayer = new Container()
    this._mudLayer.eventMode = 'none'
    this._foamLayer = new Container()
    this._foamLayer.eventMode = 'none'
    this._spray = new Graphics()
    this._spray.eventMode = 'none'
    // Levande bad-kuliss: skvalpande vattenskimmer + stigande tvålbubblor vid vattenlinjen.
    // Ett enda Graphics ovanpå djuret (men under verktygen), ritas om i _update — exit-säkert.
    this._tubFx = new Graphics()
    this._tubFx.eventMode = 'none'
    this._root.addChild(this._clean, this._mudLayer, this._foamLayer, this._spray, this._tubFx)

    // Verktyg (svamp/dusch) ovanför djuret.
    this._sponge = { kind: 'sponge', view: this._makeSponge(), home: { x: 165, y: 630 } }
    this._shower = { kind: 'shower', view: this._makeShower(), home: { x: 1115, y: 630 } }
    this._tools = [this._sponge, this._shower]
    for (const tool of this._tools) {
      tool.view.position.set(tool.home.x, tool.home.y)
      tool._downH = (e) => this._toolDown(ctx, tool, e)
      tool.view.on('pointerdown', tool._downH)
      this._root.addChild(tool.view)
    }
    this._moveH = (e) => this._toolMove(ctx, e)
    this._upH = () => this._toolUp(ctx)

    // Renhets-mätare (överst).
    this._buildGauge()

    // Bygg första djuret + lerlager.
    this._buildAnimal(ctx)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._noProgress = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen (en gång) ----------------------------------------------

  _buildTub() {
    const g = new Graphics()
    g.roundRect(360, 470, 560, 150, 60).fill({ color: COLORS.blue, alpha: 0.3 }).stroke({ width: 8, color: COLORS.blue, alpha: 0.5 })
    g.roundRect(372, 482, 536, 26, 16).fill({ color: 0xffffff, alpha: 0.35 }) // ljusare vattenrand
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildGauge() {
    const c = new Container()
    c.eventMode = 'none'
    c.addChild(new Graphics().roundRect(470, 90, 340, 28, 14).fill({ color: 0x000000, alpha: 0.12 }))
    this._gaugeFill = new Graphics()
    c.addChild(this._gaugeFill)
    const icon = new Text({ text: '🧼', style: { fontFamily: FONT.body, fontSize: 40 } })
    icon.anchor.set(0.5)
    icon.position.set(444, 104)
    c.addChild(icon)
    this._gauge = c
    this._root.addChild(c)
    this._drawGaugeFill()
  },

  _drawGaugeFill() {
    const g = this._gaugeFill
    if (!g || g.destroyed) return
    g.clear()
    const w = clamp(this._gaugeFillW, 0, 340)
    if (w > 2) g.roundRect(470, 90, w, 28, 14).fill(COLORS.green)
  },

  _makeSponge() {
    const c = new Container()
    c.addChild(new Graphics().ellipse(0, 42, 54, 14).fill({ color: 0x000000, alpha: 0.15 }))
    c.addChild(new Graphics().roundRect(-50, -36, 100, 72, 18).fill(0xe9e36a).stroke({ width: 5, color: 0x7fbf4d }))
    c.addChild(new Graphics().roundRect(-50, 2, 100, 34, 16).fill({ color: 0xa9d96a, alpha: 0.9 }))
    const e = new Text({ text: '🧽', style: { fontFamily: FONT.body, fontSize: 84 } })
    e.anchor.set(0.5)
    e.eventMode = 'none'
    c.addChild(e)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.interactiveChildren = false
    c.hitArea = new Circle(0, 0, 72) // träffyta-diameter 144px ≫ 96px
    return c
  },

  _makeShower() {
    const c = new Container()
    c.addChild(new Graphics().ellipse(0, 48, 46, 12).fill({ color: 0x000000, alpha: 0.15 }))
    c.addChild(new Graphics().roundRect(-8, -42, 16, 40, 6).fill(0xb8c4cc))
    const e = new Text({ text: '🚿', style: { fontFamily: FONT.body, fontSize: 90 } })
    e.anchor.set(0.5)
    e.eventMode = 'none'
    c.addChild(e)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.interactiveChildren = false
    c.hitArea = new Circle(0, 0, 72)
    c.alpha = 0.45 // inaktiv/halvtransparent tills leran är mestadels borta
    return c
  },

  // ---- Nivå + djur-/lerbygge ---------------------------------------------

  _levelType() {
    const lvl = this._level
    if (lvl <= 1) return TYPES[0]
    if (lvl <= 3) return TYPES[1]
    if (lvl <= 5) return TYPES[2]
    return randomFrom(TYPES)
  },

  _buildAnimal(ctx) {
    if (!this._alive) return
    this._clearRound()

    this._resolving = false
    this._held = null
    this._selectedTool = null
    this._sprayOn = false
    this._scrubbed = 0
    this._rinsed = 0
    this._scrubCount = 0
    this._firstScrub = false
    this._firstRinse = false
    this._showerReady = false
    this._idle = 0
    this._noProgress = 0
    this._drops = []
    this._foam = []

    const t = this._levelType()
    this._type = t
    const s = t.scale || 1
    this._silh = [
      { cx: 640, cy: 440, rx: 230 * s, ry: 150 * s },
      { cx: 470, cy: 330, rx: 115 * s, ry: 115 * s },
      { cx: 820, cy: 410, rx: 120 * s, ry: 120 * s },
    ]

    this._drawClean(t)
    this._genMud(t)

    // Duschen åter inaktiv/dim tills ~70 % skrubbat.
    this._showerFade?.kill()
    this._shower._breatheTween?.kill()
    this._shower._breatheTween = null
    gsap.killTweensOf(this._shower.view)
    gsap.killTweensOf(this._shower.view.scale)
    this._shower.view.scale.set(1)
    this._shower.view.alpha = 0.45

    // Svampen andas som "börja här".
    this._sponge._breatheTween?.kill()
    gsap.killTweensOf(this._sponge.view.scale)
    this._sponge.view.scale.set(1)
    this._sponge._breatheTween = breathe(this._sponge.view, { scale: 1.06, duration: 1.0 })

    // Mätaren till 0 (nytt djur — inte en sänkning mitt i en uppgift).
    this._gaugeTween?.kill()
    this._gaugeFillW = 0
    this._drawGaugeFill()
  },

  _drawClean(t) {
    const c = this._clean
    const shadow = new Graphics().ellipse(640, 600, 250, 40).fill({ color: 0x000000, alpha: 0.18 })
    shadow.eventMode = 'none'

    const g = new Graphics()
    // Ben (bakom kroppen).
    for (const lx of [-150, -60, 60, 150]) {
      g.roundRect(640 + lx - 26, 500, 52, 110, 20).fill(t.color).stroke({ width: 6, color: t.dark })
      g.roundRect(640 + lx - 24, 590, 48, 30, 12).fill(t.dark) // hov
    }
    // Öra + svans/man (mörkare ton, bakom kroppen).
    g.ellipse(440, 232, 30, 48).fill(t.dark)
    g.ellipse(910, 360, 40, 74).fill(t.dark)
    // Silhuett-ellipser.
    for (const e of this._silh) g.ellipse(e.cx, e.cy, e.rx, e.ry).fill(t.color)
    // Glansig högdager uppe-vänster på kroppen.
    g.circle(560, 380, 72).fill({ color: 0xffffff, alpha: 0.18 })
    g.eventMode = 'none'

    // Ansikts-emoji som karaktär på huvudet.
    const face = new Text({ text: t.emoji, style: { fontFamily: FONT.body, fontSize: 120 } })
    face.anchor.set(0.5)
    face.position.set(FACE_X, FACE_Y)
    face.eventMode = 'none'
    this._face = face // spara minen så den kan reagera på beröring

    c.addChild(shadow, g, face)
  },

  _bbox() {
    let minX = 1e9
    let minY = 1e9
    let maxX = -1e9
    let maxY = -1e9
    for (const e of this._silh) {
      minX = Math.min(minX, e.cx - e.rx)
      maxX = Math.max(maxX, e.cx + e.rx)
      minY = Math.min(minY, e.cy - e.ry)
      maxY = Math.max(maxY, e.cy + e.ry)
    }
    return { minX, minY, maxX, maxY }
  },

  _onAnimal(x, y) {
    for (const e of this._silh) {
      const dx = (x - e.cx) / e.rx
      const dy = (y - e.cy) / e.ry
      if (dx * dx + dy * dy <= 1) return true
    }
    return false
  },

  _genMud(t) {
    const bb = this._bbox()
    const step = t.step
    const flakes = []
    for (let y = bb.minY; y <= bb.maxY; y += step) {
      for (let x = bb.minX; x <= bb.maxX; x += step) {
        const jx = x + (Math.random() * 20 - 10)
        const jy = y + (Math.random() * 20 - 10)
        if (!this._onAnimal(jx, jy)) continue
        // Håll en lerfri ruta runt ansiktet — minen ska alltid synas.
        if (Math.hypot(jx - FACE_X, jy - FACE_Y) < FACE_R) continue
        const need = t.doubles && Math.random() < 0.3 ? 2 : 1
        const r = 24 + Math.random() * 6
        const view = new Graphics()
        view.eventMode = 'none'
        view.position.set(jx, jy)
        view.rotation = Math.random() * Math.PI
        const flake = {
          view,
          x: jx,
          y: jy,
          r,
          need,
          hits: 0,
          _clean: false,
          _lastHit: 0,
          bumps: [
            { x: -r * 0.5, y: r * 0.2, r: r * 0.6 },
            { x: r * 0.55, y: -r * 0.15, r: r * 0.55 },
          ],
          dots: [
            { x: -r * 0.2, y: -r * 0.2, r: 4 },
            { x: r * 0.25, y: r * 0.25, r: 5 },
            { x: 0, y: r * 0.05, r: 3 },
          ],
        }
        this._paintFlake(flake, need === 2 ? DARKMUD : MUD)
        this._mudLayer.addChild(view)
        bounceIn(view, { duration: 0.3, delay: Math.random() * 0.25 })
        flakes.push(flake)
      }
    }
    this._flakes = flakes
    this._totalMud = flakes.length
  },

  _paintFlake(flake, color) {
    const g = flake.view
    if (!g || g.destroyed) return
    g.clear()
    g.circle(0, 0, flake.r).fill(color)
    for (const b of flake.bumps) g.circle(b.x, b.y, b.r).fill(color)
    for (const d of flake.dots) g.circle(d.x, d.y, d.r).fill(DARKMUD)
  },

  // ---- Verktygs-drag (egen pekspårning) ----------------------------------

  _toolDown(ctx, tool, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    this._held = tool
    this._moved = false
    this._downPoint = { x: p.x, y: p.y }
    this._grab = { dx: tool.view.x - p.x, dy: tool.view.y - p.y }
    gsap.killTweensOf(tool.view)
    tool._breatheTween?.kill()
    gsap.killTweensOf(tool.view.scale)
    tool.view.scale.set(1)
    pop(tool.view)
    ctx.services.audio.sfx('tap')
    if (tool.kind === 'shower') {
      this._sprayOn = true
      this._nozzle = { x: tool.view.x, y: tool.view.y + 34 }
    }
    // Lyssnare på verktyget (global → överlever att fingret lämnar svampen).
    tool.view.on('globalpointermove', this._moveH)
    tool.view.on('pointerup', this._upH)
    tool.view.on('pointerupoutside', this._upH)
  },

  _toolMove(ctx, e) {
    if (!this._alive || !this._held) return
    const p = this._root.toLocal(e.global)
    if (!this._moved && Math.hypot(p.x - this._downPoint.x, p.y - this._downPoint.y) > 8) this._moved = true
    const x = clamp(p.x + this._grab.dx, 60, ctx.width - 60)
    const y = clamp(p.y + this._grab.dy, 60, ctx.height - 60)
    this._held.view.position.set(x, y)
    this._idle = 0
    if (this._held.kind === 'sponge') {
      this._scrubAt(ctx, { x, y }, 70)
    } else {
      this._sprayOn = true
      this._nozzle = { x, y: y + 34 }
      this._rinseAt(ctx, { x, y }, 80)
    }
  },

  _toolUp(ctx) {
    const tool = this._held
    if (tool && tool.view && !tool.view.destroyed) {
      tool.view.off('globalpointermove', this._moveH)
      tool.view.off('pointerup', this._upH)
      tool.view.off('pointerupoutside', this._upH)
    }
    this._held = null
    this._sprayOn = false
    if (!tool) return
    if (!this._moved) {
      // Tap → välj verktyget för tap-tap (tap på djuret kör dess verkan).
      this._selectedTool = tool
      pop(tool.view)
    } else {
      this._selectedTool = null
    }
    // Glid mjukt tillbaka till brickan.
    if (tool.view && !tool.view.destroyed) {
      gsap.killTweensOf(tool.view)
      gsap.to(tool.view, { x: tool.home.x, y: tool.home.y, duration: 0.4, ease: 'back.out(1.4)' })
    }
    // Återuppta lugn puls på lediga verktyg.
    if (tool.kind === 'sponge') {
      tool._breatheTween?.kill()
      tool._breatheTween = breathe(tool.view, { scale: 1.06, duration: 1.0 })
    } else if (this._showerReady) {
      tool._breatheTween?.kill()
      tool._breatheTween = breathe(tool.view, { scale: 1.08, duration: 0.9 })
    }
  },

  // ---- Tap-tap på djuret --------------------------------------------------

  _animalTap(ctx, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    const sel = this._selectedTool
    if (sel?.kind === 'sponge') {
      this._scrubAt(ctx, p, 110)
    } else if (sel?.kind === 'shower') {
      this._rinseAt(ctx, p, 110)
      this._burstDrops(p)
    } else if (this._onAnimal(p.x, p.y)) {
      puff(ctx.fxLayer, p.x, p.y, { count: 3, color: 0xffffff })
      ctx.services.audio.sfx('soft')
    }
  },

  // ---- Djuret reagerar på beröring ---------------------------------------

  // Gör tvättobjektet till en varelse: minen rys/njuter under svampen ('happy'),
  // blundar vid sköljning ('blink') och gör ett kittlat hopp om man gnuggar samma
  // ställe ('giggle'). Allt via {}-proxy kopierat bara om minen lever + spårat i
  // this._tweens (dödas i _clearRound/destroy) → exit-säkert.
  _reactFace(kind, ctx) {
    const f = this._face
    if (!f || f.destroyed || this._resolving) return
    const now = performance.now()
    if (kind === 'giggle') {
      if (now - (this._lastGiggle || 0) < 1400) return
      this._lastGiggle = now
      floatText(ctx.fxLayer, FACE_X, FACE_Y - 84, randomFrom(['Hihi!', 'Kittlas!', 'Hehe!']), { fontSize: 40 })
      const st = { dy: 0 }
      const tw = gsap.to(st, {
        dy: -16,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
        onUpdate: () => {
          if (f.destroyed) return tw.kill()
          f.y = FACE_Y + st.dy
        },
        onComplete: () => {
          if (!f.destroyed) f.y = FACE_Y
        },
      })
      this._tweens.push(tw)
      return
    }
    if (now - (this._lastFaceReact || 0) < 280) return
    this._lastFaceReact = now
    const blink = kind === 'blink'
    const st = { s: 1 }
    const tw = gsap.to(st, {
      s: blink ? 0.2 : 1.12,
      duration: blink ? 0.1 : 0.13,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (f.destroyed) return tw.kill()
        if (blink) f.scale.set(1, st.s) // ögonblink = lodrät hopklämning
        else f.scale.set(st.s) // njutande liten puls
      },
      onComplete: () => {
        if (!f.destroyed) f.scale.set(1)
      },
    })
    this._tweens.push(tw)
  },

  // ---- Skrubba / skölj ----------------------------------------------------

  _scrubAt(ctx, p, radius) {
    if (this._resolving || !this._alive) return
    const now = performance.now()
    let did = false
    for (const f of this._flakes) {
      if (f._clean) continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      if (dx * dx + dy * dy > radius * radius) continue
      if (now - f._lastHit < 180) continue
      f._lastHit = now
      f.hits += 1
      if (f.hits < f.need) {
        // Dubbel-lager: första passet ljusnar leran (bara mer skrubb, aldrig fel).
        this._paintFlake(f, MUD)
        puff(ctx.fxLayer, f.x, f.y, { count: 3, color: 0xffffff })
        did = true
        continue
      }
      this._removeFlake(ctx, f)
      this._scrubCount += 1
      if (this._scrubCount % 6 === 0) {
        ctx.services.audio.sfx('pop')
        floatText(ctx.fxLayer, f.x, f.y - 16, '🫧', { fontSize: 40 })
      }
      did = true
    }
    if (!did) return
    this._idle = 0
    // Minen reagerar: kittlat hopp om man gnuggar samma ställe, annars njutande puls.
    const lp = this._lastScrubPt
    this._lastScrubPt = { x: p.x, y: p.y }
    this._reactFace(lp && Math.hypot(p.x - lp.x, p.y - lp.y) < 46 ? 'giggle' : 'happy', ctx)
    this._updateGauge()
    if (now - this._lastScrubSnd > 140) {
      this._lastScrubSnd = now
      ctx.services.audio.sfx('soft')
    }
    if (!this._firstScrub) {
      this._firstScrub = true
      ctx.services.voice.say('Så ja, gnugga gnugga!')
    }
    this._maybeRevealShower(ctx)
    this._checkDone(ctx)
  },

  // Tona ut + krymp en vy via {a,s}-proxy och förstör den (exit-säker). Delas av
  // lerklump-/skum-borttagning; toScale styr slutskalan. Tween:en spåras i _tweens.
  _fadeOut(view, toScale) {
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    const st = { a: 1, s: 1 }
    const tw = gsap.to(st, {
      a: 0,
      s: toScale,
      duration: 0.25,
      ease: 'power1.out',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.alpha = st.a
        view.scale.set(st.s)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy()
      },
    })
    this._tweens.push(tw)
  },

  _removeFlake(ctx, flake) {
    if (flake._clean) return
    flake._clean = true
    this._scrubbed += 1
    this._noProgress = 0
    this._spawnFoam(flake.x, flake.y)
    this._fadeOut(flake.view, 0.4)
    puff(ctx.fxLayer, flake.x, flake.y, { count: 4, color: 0xffffff })
  },

  _spawnFoam(x, y) {
    const g = new Graphics()
    g.circle(0, 0, 22).fill({ color: 0xeaf6ff, alpha: 0.9 })
    g.circle(-8, -6, 7).fill({ color: 0xffffff, alpha: 0.95 })
    g.circle(10, 5, 5).fill({ color: 0xffffff, alpha: 0.9 })
    g.position.set(x, y)
    g.eventMode = 'none'
    this._foamLayer.addChild(g)
    bounceIn(g, { duration: 0.25 })
    this._foam.push({ view: g, x, y, _rinsed: false })
  },

  _rinseAt(ctx, p, radius) {
    if (this._resolving || !this._alive) return
    let did = false
    for (const f of this._foam) {
      if (f._rinsed) continue
      const dx = f.x - p.x
      const dy = f.y - p.y
      if (dx * dx + dy * dy <= radius * radius) {
        this._rinseFoam(ctx, f)
        did = true
      }
    }
    if (!did) return
    this._idle = 0
    this._reactFace('blink', ctx) // djuret blundar njutande i sköljvattnet
    this._updateGauge()
    const now = performance.now()
    if (now - this._lastRinseSnd > 160) {
      this._lastRinseSnd = now
      ctx.services.audio.sfx(Math.random() < 0.5 ? 'whoosh' : 'pop')
    }
    if (!this._firstRinse) {
      this._firstRinse = true
      ctx.services.voice.say('Skölj rent!')
    }
    this._checkDone(ctx)
  },

  _rinseFoam(ctx, foam) {
    if (foam._rinsed) return
    foam._rinsed = true
    this._rinsed += 1
    this._noProgress = 0
    this._fadeOut(foam.view, 0.3)
    sparkle(ctx.fxLayer, foam.x, foam.y)
    if (Math.random() < 0.25) floatText(ctx.fxLayer, foam.x, foam.y - 20, '🫧', { fontSize: 40 })
  },

  _maybeRevealShower(ctx) {
    if (this._showerReady || this._totalMud === 0) return
    if (this._scrubbed / this._totalMud < 0.7) return
    this._showerReady = true
    this._showerFade?.kill()
    this._showerFade = gsap.to(this._shower.view, { alpha: 1, duration: 0.4 })
    this._shower._breatheTween?.kill()
    this._shower._breatheTween = breathe(this._shower.view, { scale: 1.08, duration: 0.9 })
    ctx.services.voice.say('Bra! Ta duschen och skölj.')
  },

  _renhet() {
    const total = Math.max(1, this._totalMud)
    const scrubFrac = this._scrubbed / total
    const rinseFrac = this._rinsed / total
    return 0.6 * scrubFrac + 0.4 * rinseFrac
  },

  _updateGauge() {
    const target = this._renhet() * 340
    this._gaugeTween?.kill()
    const st = { w: this._gaugeFillW }
    this._gaugeTween = gsap.to(st, {
      w: target,
      duration: 0.3,
      ease: 'power1.out',
      onUpdate: () => {
        this._gaugeFillW = st.w
        this._drawGaugeFill()
      },
    })
  },

  _checkDone(ctx) {
    if (this._resolving) return
    if (this._totalMud > 0 && this._scrubbed >= this._totalMud && this._rinsed >= this._totalMud) {
      this._onComplete(ctx)
    }
  },

  // ---- Vattendroppar (egen exit-säker integrator) ------------------------

  _burstDrops(p) {
    for (let i = 0; i < 6 && this._drops.length < 120; i++) {
      this._drops.push({
        x: p.x + (Math.random() * 40 - 20),
        y: p.y - 60,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: 3 + Math.random() * 2,
        r: 3 + Math.random() * 3,
        age: 0,
      })
    }
  },

  _update(ctx, tk) {
    if (!this._alive) return
    const dt = Math.min(2.5, tk.deltaMS / 16.67)

    // Spawn vid munstycket medan duschen hålls.
    if (this._sprayOn && !this._resolving && this._nozzle) {
      const n = this._nozzle
      const k = 2 + ((Math.random() * 2) | 0)
      for (let i = 0; i < k && this._drops.length < 120; i++) {
        this._drops.push({
          x: n.x + (Math.random() * 40 - 20),
          y: n.y,
          vx: (Math.random() * 2 - 1) * 1.5,
          vy: 4 + Math.random() * 2,
          r: 3 + Math.random() * 3,
          age: 0,
        })
      }
    }

    // Integrera + landa droppar.
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i]
      d.vy += 0.6 * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.age += dt
      if (d.age > 3 && (this._onAnimal(d.x, d.y) || d.y > 600)) {
        if (!this._resolving) this._rinseAt(ctx, { x: d.x, y: d.y }, 44)
        if (Math.random() < 0.35) puff(ctx.fxLayer, d.x, Math.min(d.y, 600), { count: 2, color: 0xeaf6ff })
        this._drops.splice(i, 1)
      }
    }

    // Rita sprayen (ett enda Graphics).
    const g = this._spray
    if (g && !g.destroyed) {
      g.clear()
      for (const d of this._drops) {
        g.circle(d.x, d.y, d.r).fill({ color: 0x9ed8f5, alpha: 0.8 })
        g.circle(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.4).fill({ color: 0xffffff, alpha: 0.7 })
      }
    }

    // Levande kar: skvalpande vattenskimmer + stigande tvålbubblor vid vattenlinjen.
    this._waterT += dt
    if (this._bubbles.length < 12 && Math.random() < 0.07 * dt) {
      this._bubbles.push({
        x: 400 + Math.random() * 480,
        y: 560 + Math.random() * 25,
        vy: 0.4 + Math.random() * 0.7,
        r: 4 + Math.random() * 8,
        ph: Math.random() * Math.PI * 2,
      })
    }
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      b.y -= b.vy * dt
      b.ph += 0.07 * dt
      if (b.y < 486) {
        // Poppar mjukt vid vattenytan.
        if (Math.random() < 0.4) puff(ctx.fxLayer, b.x, b.y, { count: 2, color: 0xeaf6ff })
        this._bubbles.splice(i, 1)
      }
    }
    const tg = this._tubFx
    if (tg && !tg.destroyed) {
      tg.clear()
      for (let i = 0; i < 3; i++) {
        const hx = 470 + i * 150 + Math.sin(this._waterT * 0.03 + i) * 22
        const hy = 496 + Math.sin(this._waterT * 0.05 + i * 2) * 3
        tg.ellipse(hx, hy, 72, 9).fill({ color: 0xffffff, alpha: 0.14 })
      }
      for (const b of this._bubbles) {
        const bx = b.x + Math.sin(b.ph) * 8
        const a = clamp((b.y - 476) / 60, 0, 1) // tona in nära ytan
        tg.circle(bx, b.y, b.r).fill({ color: 0xcdeffb, alpha: 0.5 * a })
        tg.circle(bx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4).fill({ color: 0xffffff, alpha: 0.85 * a })
      }
    }

    // Idle-vink + auto-hjälp (garanterar 100 % utan precision).
    if (this._resolving) return
    const ds = tk.deltaMS / 1000
    this._idle += ds
    this._noProgress += ds
    if (this._idle > 6) {
      this._idle = 0
      this._idleCue(ctx)
    }
    if (this._noProgress > 9) {
      this._noProgress = 0
      this._autoHelp(ctx)
    }
  },

  // ---- Idle-vink + auto-hjälp ---------------------------------------------

  _nearestToCenter(list) {
    let best = null
    let bd = 1e9
    for (const it of list) {
      const dx = it.x - CX
      const dy = it.y - CY
      const d = dx * dx + dy * dy
      if (d < bd) {
        bd = d
        best = it
      }
    }
    return best
  },

  _idleCue(ctx) {
    if (this._resolving) return
    const mudLeft = this._flakes.filter((f) => !f._clean)
    if (mudLeft.length) {
      ctx.services.voice.say(this.voiceIntro)
      const f = this._nearestToCenter(mudLeft)
      if (f?.view && !f.view.destroyed) wiggle(f.view)
      pop(this._sponge.view)
      return
    }
    const foamLeft = this._foam.filter((f) => !f._rinsed)
    if (foamLeft.length) {
      ctx.services.voice.say('Ta duschen och skölj!')
      const f = this._nearestToCenter(foamLeft)
      if (f?.view && !f.view.destroyed) wiggle(f.view)
      pop(this._shower.view)
    }
  },

  _autoHelp(ctx) {
    if (this._resolving || !this._alive) return
    const mudLeft = this._flakes.filter((f) => !f._clean)
    if (mudLeft.length) {
      const f = this._nearestToCenter(mudLeft)
      f.hits = f.need
      this._removeFlake(ctx, f)
      this._scrubCount += 1
      ctx.services.audio.sfx('soft')
      sparkle(ctx.fxLayer, f.x, f.y)
      this._updateGauge()
      this._maybeRevealShower(ctx)
      this._checkDone(ctx)
      return
    }
    const foamLeft = this._foam.filter((f) => !f._rinsed)
    if (foamLeft.length) {
      const f = this._nearestToCenter(foamLeft)
      this._rinseFoam(ctx, f)
      ctx.services.audio.sfx('soft')
      this._updateGauge()
      this._checkDone(ctx)
    }
  },

  // ---- Klart → firande → nästa djur --------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._held = null
    this._sprayOn = false
    this._selectedTool = null
    this._drops.length = 0
    if (this._spray && !this._spray.destroyed) this._spray.clear()

    // Djuret skakar av sig vatten + en ring vattendroppar.
    shake(this._clean, { intensity: 10, duration: 0.5 })
    burst(ctx.fxLayer, 640, 430, { count: 18, colors: [0x9ed8f5, 0xeaf6ff] })
    sparkle(ctx.fxLayer, 560, 380, { count: 8 })
    sparkle(ctx.fxLayer, 760, 420, { count: 8 })
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    ctx.services.audio.sample('djur_' + this._type.sample) // tyst fallback om klippet saknas
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('badade', (ctx.progress.get().custom?.badade | 0) + 1)

    this._nextCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildAnimal(ctx)
    })
  },

  // ---- Städning -----------------------------------------------------------

  _clearRound() {
    this._tweens?.forEach((t) => t?.kill())
    this._tweens = []
    this._gaugeTween?.kill()
    this._nextCall?.kill()
    if (this._mudLayer) {
      this._mudLayer.removeChildren().forEach((o) => {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
        o.destroy()
      })
    }
    if (this._foamLayer) {
      this._foamLayer.removeChildren().forEach((o) => {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
        o.destroy()
      })
    }
    if (this._clean) this._clean.removeChildren().forEach((o) => o.destroy({ children: true }))
    if (this._spray && !this._spray.destroyed) this._spray.clear()
    if (this._clean && !this._clean.destroyed) {
      gsap.killTweensOf(this._clean)
      this._clean.position.set(0, 0)
    }
    this._flakes = []
    this._foam = []
    this._drops = []
  },

  destroy(ctx) {
    this._alive = false
    this._held = null
    this._sprayOn = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)

    this._tweens?.forEach((t) => t?.kill())
    this._tweens = []
    this._nextCall?.kill()
    this._gaugeTween?.kill()
    this._showerFade?.kill()

    // Verktygs-lyssnare + tweens.
    for (const tool of this._tools || []) {
      if (tool.view && !tool.view.destroyed) {
        tool.view.off('pointerdown', tool._downH)
        tool.view.off('globalpointermove', this._moveH)
        tool.view.off('pointerup', this._upH)
        tool.view.off('pointerupoutside', this._upH)
        gsap.killTweensOf(tool.view)
        gsap.killTweensOf(tool.view.scale)
      }
      tool._breatheTween?.kill()
    }
    if (this._animalArea && !this._animalArea.destroyed) this._animalArea.off('pointertap', this._animalTapH)

    // Levande klumpar/skum: döda tweens medan de lever.
    this._flakes?.forEach((f) => {
      if (f.view && !f.view.destroyed) {
        gsap.killTweensOf(f.view)
        gsap.killTweensOf(f.view.scale)
      }
    })
    this._foam?.forEach((f) => {
      if (f.view && !f.view.destroyed) {
        gsap.killTweensOf(f.view)
        gsap.killTweensOf(f.view.scale)
      }
    })
    if (this._drops) this._drops.length = 0
    if (this._clean && !this._clean.destroyed) gsap.killTweensOf(this._clean)
    gsap.killTweensOf(this._gaugeFill)

    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
  },
}
