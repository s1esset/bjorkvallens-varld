// Regnbågsmålaren Elvira — ren skaparglädje (2–4 år). Barnet sveper fingret över en
// gråmulen himmel; Elviras enhörning 🦄 följer draget och målar den aktiva färgens
// båge som en tjock, glänsande rand. Färg för färg växer en hel regnbåge fram. När en
// båge är (nästan) full snäpper den till hel, firar litet och nästa färg tar vid.
// Barnet kan också byta färg själv via färgburkarna och måla i valfri ordning. Klart =
// hela regnbågen → grå himmel ljusnar till solig äng, solen går upp, blommor poppar,
// konfetti → ny (svårare) regnbåge. Inget kan bli fel: svep utanför ger bara en gnista,
// ingen poäng, ingen timer, inget "game over". Allt ritas programmatiskt (Pixi Graphics
// + emoji). Drag OCH tap-tap (för de minsta) fyller bågarna.
//
// OBS: använder INTE DragController — egen spårnings-lyssnare på himlen (likt spara-linjen).
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, pop, breathe, sparkle, burst, floatText, bigCelebration , kvittera} from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, PRAISE } from '../../lib/theme.js'

// Regnbåge-rymd: centrum precis ovanför marken.
const CX = 640
const CY = 600
const RMAX = 410
const TAU0 = Math.PI // vänster fäste (φ=π) → höger fäste (φ=2π)

// Färgordning: röd → orange → gul → grön → blå → lila.
const COLOR_LIST = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.purple]
// Regnbågen "sjunger": varje färg en ton högre (röd = låg → lila = hög), pentatonisk-glad.
const RAINBOW_NOTES = [523, 587, 659, 784, 880, 988] // C D E G A B
const CAN_X = [350, 466, 582, 698, 814, 930]
const CAN_Y = 668

const IDLE_DELAY = 6000 // ms utan interaktion → röst-recue + mjuk auto-hjälp

export default {
  id: 'regnbagsmalaren',
  titleSv: 'Regnbågsmålaren Elvira',
  icon: '🌈',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'regnbagsmalaren',
  voiceIntro: 'Måla en regnbåge! Dra fingret över himlen.',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._painting = false
    this._resolving = false
    this._snapTweens = []
    this._clouds = []
    this._lastPling = 0
    this._lastSoft = 0
    this._level = Math.max(1, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: gråmulen himmel (FÖRSTA barn).
    this._graySky = createScene(
      { top: 0xb8c2cc, bottom: 0xd8dde2, ground: 0x86d27a, groundDark: 0x5bbf6a, clouds: 3 },
      { ground: true, groundH: 96 }
    )
    this._graySky.eventMode = 'none'
    this._root.addChild(this._graySky)

    // Ljus firande-himmel, dold tills klart.
    this._brightSky = createScene('meadow', { ground: true })
    this._brightSky.eventMode = 'none'
    this._brightSky.alpha = 0
    this._root.addChild(this._brightSky)

    // Sol (reser sig vid klart). Vilar nere/dold.
    this._sun = new Container()
    this._sun.addChild(new Graphics().circle(0, 0, 120).fill({ color: 0xffe27a, alpha: 0.2 }))
    this._sun.addChild(new Graphics().circle(0, 0, 60).fill(0xffd35c))
    this._sun.position.set(CX, 760)
    this._sun.alpha = 0
    this._sun.eventMode = 'none'
    this._root.addChild(this._sun)

    // Dekor som byggs om varje runda (blommor m.m.).
    this._decor = new Container()
    this._decor.eventMode = 'none'
    this._decor.interactiveChildren = false
    this._root.addChild(this._decor)

    // Regnbågen (grå mall + målade band).
    this._rainbow = new Container()
    this._rainbow.eventMode = 'none'
    this._rainbow.interactiveChildren = false
    this._root.addChild(this._rainbow)

    // Transparent himmel-hit-rektangel (fångar svep/tap).
    this._sky = new Graphics().rect(0, 90, 1280, 540).fill({ color: 0x000000, alpha: 0 })
    this._sky.eventMode = 'static'
    this._sky.cursor = 'pointer'
    this._root.addChild(this._sky)

    // Enhörningen (följer fingret) — RITAD med man, horn och blinkande öga. Förut en
    // 🦄-emoji i en halvgenomskinlig cirkel, precis det P0 ASSETS förbjuder.
    this._unicorn = makeUnicornHead()
    this._unicorn.scale.set(1.4) // penseln ska synas tydligt under fingret
    this._unicorn.eventMode = 'none'
    this._root.addChild(this._unicorn)
    // Mjuk sväv + blink så penseln lever även när den står still.
    this._uniBob = gsap.to(this._unicorn, { rotation: 0.08, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._uniEye = this._unicorn.getChildByLabel('eye')
    this._uniBlink = gsap.to(this._uniEye.scale, {
      y: 0.1, duration: 0.09, repeat: -1, yoyo: true, repeatDelay: 3.4, ease: 'power1.inOut',
    })

    // Palett (färgburkar) + glödring.
    this._palette = new Container()
    this._root.addChild(this._palette)
    this._glow = new Graphics().circle(0, 0, 52).stroke({ width: 6, color: 0xfff3b0, alpha: 0.95 })
    this._glow.eventMode = 'none'
    this._palette.addChild(this._glow)
    this._cans = []
    for (let i = 0; i < 6; i++) {
      const can = new Container()
      can.addChild(new Graphics().circle(0, 0, 40).fill(COLOR_LIST[i]).stroke({ width: 5, color: 0xffffff }))
      can.position.set(CAN_X[i], CAN_Y)
      can.eventMode = 'static'
      can.cursor = 'pointer'
      can.hitArea = new Circle(0, 0, 60) // Ø120 ≥96px
      can._colorIndex = i
      can.on('pointertap', () => this._selectColor(ctx, i))
      this._palette.addChild(can)
      this._cans.push(can)
    }

    // Pekar-lyssnare på himlen (drag överlever att fingret lämnar ytan).
    this._onDown = (e) => this._pointerDown(ctx, e)
    this._onMove = (e) => this._pointerMove(ctx, e)
    this._onUp = () => this._pointerUp(ctx)
    this._sky.on('pointerdown', this._onDown)
    this._sky.on('globalpointermove', this._onMove)
    this._sky.on('pointerup', this._onUp)
    this._sky.on('pointerupoutside', this._onUp)

    this._buildRound()

    this._tick = (t) => {
      if (!this._alive || this._resolving) return
      // Skimrande gnistor vandrar längs de färdiga bågarna (våt-magisk look).
      this._shimmerT = (this._shimmerT || 0) + t.deltaMS
      if (this._shimmerT > 380 && this._arcs) {
        this._shimmerT = 0
        const done = this._arcs.filter((a) => a.done && a.bandG && !a.bandG.destroyed)
        if (done.length) {
          const a = randomFrom(done)
          const ang = Math.PI + Math.random() * Math.PI
          sparkle(ctx.fxLayer, CX + a.R * Math.cos(ang), CY + a.R * Math.sin(ang), { count: 2 })
        }
      }
      this._idle += t.deltaMS
      if (this._idle > IDLE_DELAY) this._idleHelp(ctx)
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg en runda (oändlig lek) ----------------------------------------

  _arcDefs(level) {
    const defs = []
    const outerR = [410, 366, 322, 278, 234, 190]
    for (let i = 0; i < 6; i++) defs.push({ R: outerR[i], colorIndex: i, width: 40 })
    if (level >= 2) {
      // Dubbel regnbåge: ljusare, tunnare, omvänd färgordning.
      const innerR = [170, 148, 126, 104, 82, 60]
      for (let i = 0; i < 6; i++) defs.push({ R: innerR[i], colorIndex: 5 - i, width: 22 })
    }
    return defs
  },

  _buildRound() {
    if (!this._alive) return
    // Städa förra rundans tweens + noder.
    this._killSnapTweens()
    this._nextRoundCall?.kill?.()
    this._nextRoundCall = null
    this._breatheTween?.kill()
    this._breatheTween = null
    if (this._brightSky && !this._brightSky.destroyed) {
      gsap.killTweensOf(this._brightSky)
      this._brightSky.alpha = 0
    }
    if (this._sun && !this._sun.destroyed) {
      gsap.killTweensOf(this._sun)
      gsap.killTweensOf(this._sun.scale)
      this._sun.position.set(CX, 760)
      this._sun.alpha = 0
      this._sun.scale.set(1)
    }
    for (const c of this._clouds) if (c?.g && !c.g.destroyed) gsap.killTweensOf(c.g)
    this._clouds.length = 0
    this._rainbow.removeChildren().forEach((c) => c.destroy({ children: true }))
    this._decor.removeChildren().forEach((c) => c.destroy({ children: true }))

    this._K = this._level >= 3 ? 28 : 24
    const defs = this._arcDefs(this._level)

    // Grå mall (under banden).
    const tmpl = new Graphics()
    for (const d of defs) {
      tmpl.arc(CX, CY, d.R, Math.PI, Math.PI * 2).stroke({ width: d.width, color: 0xaab2ba, alpha: 0.28, cap: 'round' })
    }
    this._rainbow.addChild(tmpl)

    // Band-Graphics per båge + tillstånd.
    this._arcs = defs.map((d) => {
      const bandG = new Graphics()
      this._rainbow.addChild(bandG)
      return { R: d.R, color: COLOR_LIST[d.colorIndex], colorIndex: d.colorIndex, width: d.width, bandG, covered: new Set(), done: false, _fMin: 0.5, _fMax: 0.5 }
    })
    // Test-vänliga speglingar.
    this._covered = this._arcs.map((a) => a.covered)
    this._bandDone = this._arcs.map(() => false)

    // Moln att måla bort (nivå 3+, bonus — krävs ej för klart).
    if (this._level >= 3) {
      const spots = [{ x: 320, y: 220 }, { x: 980, y: 210 }]
      for (const s of spots) {
        const g = new Graphics()
        g.circle(-34, 6, 24).fill(0xb0b8c0).circle(0, -8, 34).fill(0xb0b8c0).circle(34, 6, 26).fill(0xb0b8c0)
        g.position.set(s.x, s.y)
        g.eventMode = 'none'
        this._rainbow.addChild(g)
        this._clouds.push({ g, x: s.x, y: s.y, painted: false })
        bounceIn(g)
      }
    }

    // Återställ burkar + enhörning + aktiv färg.
    for (const can of this._cans) {
      if (can.destroyed) continue
      gsap.killTweensOf(can.scale)
      can.scale.set(1)
      bounceIn(can, { delay: can._colorIndex * 0.05 })
    }
    gsap.killTweensOf(this._unicorn)
    this._unicorn.position.set(CX, CY - RMAX - 10)
    this._unicorn.visible = true
    bounceIn(this._unicorn)

    this._resolving = false
    this._painting = false
    this._idle = 0
    this._setActive(0)
  },

  // ---- Aktiv färg / glödring ----------------------------------------------

  _setActive(arcIndex) {
    this._active = arcIndex
    const arc = this._arcs[arcIndex]
    if (!arc) return
    const can = this._cans[arc.colorIndex]
    if (can && !can.destroyed) {
      this._glow.position.set(can.x, can.y)
      this._glow.visible = true
      this._breatheTween?.kill()
      gsap.killTweensOf(can.scale)
      can.scale.set(1)
      this._breatheTween = breathe(can)
    }
  },

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _selectColor(ctx, colorIndex) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx)
    this._idle = 0
    const can = this._cans[colorIndex]
    // Hitta första ofyllda bågen med denna färg.
    const idx = this._arcs.findIndex((a) => a.colorIndex === colorIndex && !a.done)
    ctx.services.audio.sfx('tap')
    if (idx < 0) {
      if (can && !can.destroyed) pop(can) // redan klar: vänligt, aldrig fel
      return
    }
    this._setActive(idx)
    if (can && !can.destroyed) pop(can)
  },

  // ---- Pekare: spårning (drag) + tap-tap ----------------------------------

  _pointerDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    const p = this._root.toLocal(e.global)
    this._painting = true
    this._idle = 0
    this._downX = p.x
    this._downY = p.y
    this._moved = 0
    ctx.services.audio.sfx('whoosh')
    this._moveUnicorn(p, true)
    this._paintAt(ctx, p)
  },

  _pointerMove(ctx, e) {
    if (this._resolving || !this._alive || !this._painting) return
    const p = this._root.toLocal(e.global)
    this._moved = Math.max(this._moved, Math.hypot(p.x - this._downX, p.y - this._downY))
    this._moveUnicorn(p, false)
    this._paintAt(ctx, p)
  },

  _pointerUp(ctx) {
    if (!this._painting) return
    this._painting = false
    if (this._resolving || !this._alive) return
    // Var det egentligen ett tap (knappt någon rörelse)? → måla en rejäl klick.
    if (this._moved < 14) {
      const p = { x: this._downX, y: this._downY }
      const f = this._fracAt(p)
      const cell = Math.min(this._K - 1, Math.floor(f * this._K))
      const cells = []
      for (let c = cell - 3; c <= cell + 3; c++) cells.push(c)
      this._applyCells(ctx, this._active, cells, p)
    }
  },

  _moveUnicorn(p, immediate) {
    if (!this._unicorn || this._unicorn.destroyed) return
    if (immediate) gsap.killTweensOf(this._unicorn)
    this._unicorn.position.set(p.x, p.y)
  },

  // Svep-fraktion = VINKEL runt regnbågens centrum (vänster fäste → 0, topp → 0.5,
  // höger fäste → 1). Vinkel-baserat (inte x-baserat) gör fyllningen radie-oberoende:
  // ett svep längs VILKEN båge som helst — även de innersta, smala — täcker 0→1 helt.
  _fracAt(p) {
    const dx = p.x - CX
    const dy = p.y - CY
    let theta = Math.atan2(dy, dx) // -π..π; ovanför centrum (dy<0) → -π..0
    if (theta > 0) theta = dx >= 0 ? 0 : -Math.PI // under centrumlinjen → snäpp till närmsta fäste
    return Math.max(0, Math.min(1, (theta + Math.PI) / Math.PI))
  },

  _paintAt(ctx, p) {
    if (this._resolving || !this._alive) return
    this._idle = 0
    const f = this._fracAt(p)
    const cell = Math.min(this._K - 1, Math.floor(f * this._K))
    this._applyCells(ctx, this._active, [cell - 1, cell, cell + 1], p)
    this._tryPaintClouds(ctx, p)
    // Magiskt penselspår: glittrande ✨ driver upp bakom enhörningen.
    this._throttle('_lastTrail', 110, () => {
      if (this._unicorn && !this._unicorn.destroyed) floatText(ctx.fxLayer, this._unicorn.x + (Math.random() * 24 - 12), this._unicorn.y + 8, '✨', { fontSize: 24, rise: 40 })
    })
  },

  // Lägg celler i en båges täckning, rita om, ge juice, snäpp vid ≥0.9.
  _applyCells(ctx, b, cells, p) {
    const arc = this._arcs[b]
    if (!arc || arc.done) return
    let added = false
    for (const c of cells) {
      if (c >= 0 && c < this._K && !arc.covered.has(c)) {
        arc.covered.add(c)
        added = true
      }
    }
    this._redrawBand(arc)
    if (added) {
      sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
      this._throttle('_lastPling', 110, () => ctx.services.audio.sfx('pling'))
    }
    this._throttle('_lastSoft', 140, () => ctx.services.audio.sfx('soft'))
    if (arc.covered.size / this._K >= 0.9) this._snapBand(ctx, b)
  },

  // Rita en båges fyllda segment (fMin→fMax av halvcirkeln). Exit-säkert.
  _strokeBand(arc, fMin, fMax) {
    if (arc.bandG.destroyed) return
    arc.bandG
      .clear()
      .arc(CX, CY, arc.R, TAU0 + fMin * Math.PI, TAU0 + fMax * Math.PI)
      .stroke({ width: arc.width, color: arc.color, cap: 'round' })
      // Skimrande glans-rand längs bandets utsida (våt-magisk look).
      .arc(CX, CY, arc.R + arc.width * 0.24, TAU0 + fMin * Math.PI, TAU0 + fMax * Math.PI)
      .stroke({ width: arc.width * 0.26, color: 0xffffff, alpha: 0.4, cap: 'round' })
  },

  _redrawBand(arc) {
    if (arc.done) return // snäpp-animationen äger ritandet när bågen är klar
    const cells = [...arc.covered]
    if (!cells.length) {
      arc.bandG.clear()
      return
    }
    let mn = cells[0]
    let mx = cells[0]
    for (const c of cells) {
      if (c < mn) mn = c
      if (c > mx) mx = c
    }
    arc._fMin = mn / this._K
    arc._fMax = (mx + 1) / this._K
    this._strokeBand(arc, arc._fMin, arc._fMax)
  },

  // Snäpp till full båge (exit-säkert: tweena proxy, rita bara om band lever).
  _snapBand(ctx, b) {
    const arc = this._arcs[b]
    if (!arc || arc.done) return
    arc.done = true
    this._bandDone[b] = true
    for (let i = 0; i < this._K; i++) arc.covered.add(i)

    const cur = { min: arc._fMin ?? 0.5, max: arc._fMax ?? 0.5 }
    const tw = gsap.to(cur, {
      min: 0,
      max: 1,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (arc.bandG.destroyed) {
          tw.kill()
          return
        }
        this._strokeBand(arc, cur.min, cur.max)
      },
      onComplete: () => {
        if (this._alive) this._afterSnap(ctx)
      },
    })
    this._snapTweens.push(tw)

    ctx.services.audio.sfx('reveal')
    ctx.services.audio.tone({ freq: RAINBOW_NOTES[arc.colorIndex] || 660, dur: 0.34, type: 'sine', vol: 0.2 }) // bågen sjunger sin ton
    sparkle(ctx.fxLayer, CX, CY - arc.R, { count: 8 })
    burst(ctx.fxLayer, CX, CY - arc.R, { count: 10, colors: [arc.color] })
    const can = this._cans[arc.colorIndex]
    if (can && !can.destroyed) pop(can)
    this._releaseSurprise(arc)
    if (Math.random() < 0.5) ctx.services.voice.say(randomFrom(['Så fint!', 'En till färg!', 'Titta vad fin!']))
  },

  // En liten ritad överraskning flyger ut ur bågen som just blev hel — fjäril, fågel
  // eller stjärna. Varje färdig båge ger en egen liten upptäckt.
  _releaseSurprise(arc) {
    if (!this._decor || this._decor.destroyed) return
    const kind = ['fjaril', 'fagel', 'stjarna'][(Math.random() * 3) | 0]
    const s = makeSurprise(kind, arc.color)
    const side = Math.random() < 0.5 ? -1 : 1
    const a = (0.22 + Math.random() * 0.36) * Math.PI
    s.position.set(CX + side * Math.cos(a) * arc.R, CY - Math.sin(a) * arc.R)
    s.eventMode = 'none'
    this._decor.addChild(s)
    const st = { x: s.x, y: s.y, a: 1, r: 0 }
    const tw = gsap.to(st, {
      x: s.x + side * (70 + Math.random() * 90),
      y: s.y - (90 + Math.random() * 90),
      a: 0, r: side * 0.8,
      duration: 1.7, ease: 'sine.out',
      onUpdate: () => {
        if (s.destroyed) { tw.kill(); return }
        s.position.set(st.x, st.y)
        s.alpha = st.a
        s.rotation = st.r
        s.scale.set(1 + (1 - st.a) * 0.25)
      },
      onComplete: () => { if (!s.destroyed) s.destroy({ children: true }) },
    })
    this._snapTweens.push(tw)
  },

  _afterSnap(ctx) {
    if (!this._alive || this._resolving) return
    const next = this._arcs.findIndex((a) => !a.done)
    if (next < 0) {
      this._onComplete(ctx)
    } else {
      this._setActive(next)
    }
  },

  // ---- Moln (nivå 3+) — måla bort, bonus ----------------------------------

  _tryPaintClouds(ctx, p) {
    for (const c of this._clouds) {
      if (c.painted || !c.g || c.g.destroyed) continue
      if (Math.hypot(p.x - c.x, p.y - c.y) < 80) {
        c.painted = true
        const g = c.g
        gsap.to(g, {
          alpha: 0,
          duration: 0.4,
          onUpdate: () => {
            if (g.destroyed) gsap.killTweensOf(g)
          },
        })
        sparkle(ctx.fxLayer, c.x, c.y, { count: 6 })
        ctx.services.audio.sfx('pop')
      }
    }
  },

  // ---- Klart-firande ------------------------------------------------------

  _onComplete(ctx) {
    if (this._resolving || !this._alive) return
    this._resolving = true
    this._painting = false
    this._breatheTween?.kill()
    this._breatheTween = null
    if (this._glow) this._glow.visible = false

    // Grå himmel ljusnar till solig äng.
    gsap.to(this._brightSky, { alpha: 1, duration: 1.0 })

    // Solen går upp.
    this._sun.alpha = 1
    this._sun.position.set(CX, 760)
    gsap.to(this._sun, { y: 150, duration: 1.1, ease: 'back.out(1.2)' })
    gsap.to(this._sun.scale, { x: 1.12, y: 1.12, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Ritade blommor poppar upp längs marken (förut 🌸/🌷/🌼 som emoji-Text).
    for (let i = 0; i < 7; i++) {
      const fl = makeFlower(i % 3)
      fl.position.set(180 + i * 150, 636)
      fl.eventMode = 'none'
      this._decor.addChild(fl)
      bounceIn(fl, { delay: 0.1 + i * 0.08 })
    }

    // Elvira springer in i ängen och jublar när regnbågen är klar.
    const elvira = makeElviraCheer()
    elvira.position.set(1090, 604)
    elvira.eventMode = 'none'
    this._decor.addChild(elvira)
    bounceIn(elvira, { delay: 0.35 })
    this._elviraHop = gsap.to(elvira, {
      y: 584, duration: 0.34, yoyo: true, repeat: 5, ease: 'power2.out', delay: 0.7,
    })

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    // Full regnbåge → hela den stigande melodin spelas.
    RAINBOW_NOTES.forEach((f, i) => ctx.services.audio.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.11 }))
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    this._level += 1
    ctx.progress.complete()
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('regnbagar', (ctx.progress.get().custom?.regnbagar || 0) + 1)

    this._nextRoundCall = gsap.delayedCall(1.8, () => {
      if (this._alive) this._buildRound()
    })
  },

  // ---- Idle-recue + mjuk auto-hjälp ---------------------------------------

  _idleHelp(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    if (ctx.services.voice.replayLast) ctx.services.voice.replayLast()
    else ctx.services.voice.say(this.voiceIntro)
    const arc = this._arcs[this._active]
    if (!arc || arc.done) return
    const can = this._cans[arc.colorIndex]
    if (can && !can.destroyed) pop(can)
    // Garantera framsteg: lägg ~4 celler i aktiva bågen vid lägsta ofyllda cell.
    let start = 0
    while (start < this._K && arc.covered.has(start)) start++
    const cells = [start, start + 1, start + 2, start + 3]
    const f = (start + 1.5) / this._K
    // Placera enhörningen PÅ den aktiva bågens egen radie (vinkel π→2π).
    const ang = Math.PI + f * Math.PI
    const px = CX + arc.R * Math.cos(ang)
    const py = CY + arc.R * Math.sin(ang)
    if (this._unicorn && !this._unicorn.destroyed) {
      gsap.killTweensOf(this._unicorn)
      gsap.to(this._unicorn, { x: px, y: py, duration: 0.4, ease: 'power2.inOut' })
    }
    this._applyCells(ctx, this._active, cells, { x: px, y: py })
  },

  // ---- Hjälpare -----------------------------------------------------------

  _throttle(key, ms, fn) {
    const now = performance.now()
    if (now - (this[key] || 0) >= ms) {
      this[key] = now
      fn()
    }
  },

  _killSnapTweens() {
    for (const t of this._snapTweens) t?.kill?.()
    this._snapTweens.length = 0
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._nextRoundCall?.kill?.()
    this._killSnapTweens()
    this._breatheTween?.kill()
    this._uniBob?.kill()
    this._uniBlink?.kill()
    this._elviraHop?.kill()
    if (this._uniEye && !this._uniEye.destroyed) gsap.killTweensOf(this._uniEye.scale)
    for (const d of this._decor?.children || []) if (!d.destroyed) gsap.killTweensOf(d)
    if (this._sky && !this._sky.destroyed) {
      this._sky.off('pointerdown', this._onDown)
      this._sky.off('globalpointermove', this._onMove)
      this._sky.off('pointerup', this._onUp)
      this._sky.off('pointerupoutside', this._onUp)
    }
    if (this._unicorn && !this._unicorn.destroyed) gsap.killTweensOf(this._unicorn)
    if (this._brightSky && !this._brightSky.destroyed) gsap.killTweensOf(this._brightSky)
    if (this._sun && !this._sun.destroyed) {
      gsap.killTweensOf(this._sun)
      gsap.killTweensOf(this._sun.scale)
    }
    for (const can of this._cans || []) if (can && !can.destroyed) gsap.killTweensOf(can.scale)
    for (const c of this._clouds || []) if (c?.g && !c.g.destroyed) gsap.killTweensOf(c.g)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Enhörningshuvudet som är penseln: vitt huvud, regnbågsman, gyllene spiralhorn och
// ett öga som kan blinka (egen Graphics med label 'eye').
function makeUnicornHead() {
  const c = new Container()
  const white = 0xfffdf9
  const edge = 0xe89ac4
  const rainbow = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.purple]

  // Man bakom huvudet.
  const mane = new Graphics()
  for (let i = 0; i < rainbow.length; i++) {
    mane.circle(15 + i * 3, -32 + i * 11, 14 - i * 1.2).fill(rainbow[i])
  }
  c.addChild(mane)

  // Öron.
  const ears = new Graphics()
    .poly([-18, -40, -6, -18, -30, -22]).fill(white).stroke({ width: 2.5, color: edge })
    .poly([16, -42, 26, -20, 4, -22]).fill(white).stroke({ width: 2.5, color: edge })
  c.addChild(ears)

  // Huvud + nos.
  const head = new Graphics()
    .ellipse(0, -4, 30, 27).fill(white).stroke({ width: 3.5, color: edge })
    .ellipse(-20, 14, 17, 14).fill(white).stroke({ width: 3.5, color: edge })
  c.addChild(head)

  // Gyllene spiralhorn.
  const horn = new Graphics()
    .poly([-2, -72, 9, -36, -14, -36]).fill(COLORS.yellow).stroke({ width: 2.5, color: COLORS.orange })
  horn.moveTo(-10, -42).lineTo(5, -45)
  horn.moveTo(-8, -50).lineTo(3, -53)
  horn.moveTo(-6, -58).lineTo(1, -60)
  horn.stroke({ width: 2, color: COLORS.orange })
  c.addChild(horn)

  // Öga (blinkar) + kind + nosborre.
  const eye = new Graphics()
    .ellipse(-8, -6, 5, 6.5).fill(0x3a2b3f)
    .circle(-6, -9, 2).fill(0xffffff)
  eye.label = 'eye'
  c.addChild(eye)
  c.addChild(new Graphics()
    .circle(-18, 4, 5).fill({ color: 0xffb3d1, alpha: 0.7 })
    .ellipse(-27, 13, 2.4, 3.2).fill({ color: 0xd98bb4, alpha: 0.9 }))

  c.children.forEach((ch) => (ch.eventMode = 'none'))
  return c
}

// Ritad blomma (tre varianter) — kronblad, mitt och stjälk med blad.
function makeFlower(variant) {
  const c = new Container()
  const petal = [0xff9ec4, 0xff6b6b, 0xfff3b0][variant] || 0xff9ec4
  const petalEdge = [0xe0709b, 0xd94f4f, 0xe8c85a][variant] || 0xe0709b
  const g = new Graphics()
  g.roundRect(-3, -6, 6, 44, 3).fill(0x49a657)
  g.moveTo(0, 14).quadraticCurveTo(-20, 8, -22, 24).quadraticCurveTo(-6, 26, 0, 14).fill(0x5bbf6a)
  const n = variant === 1 ? 5 : 6
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    g.ellipse(Math.cos(a) * 15, Math.sin(a) * 15 - 8, 11, 9).fill(petal).stroke({ width: 2, color: petalEdge })
  }
  g.circle(0, -8, 9).fill(COLORS.yellow).stroke({ width: 2.5, color: 0xd9a12c })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Liten överraskning som flyger ut ur en färdig båge.
function makeSurprise(kind, color) {
  const c = new Container()
  const g = new Graphics()
  if (kind === 'fjaril') {
    g.ellipse(-11, -5, 11, 13).fill(color).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
    g.ellipse(11, -5, 11, 13).fill(color).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
    g.ellipse(-9, 9, 8, 9).fill({ color, alpha: 0.85 })
    g.ellipse(9, 9, 8, 9).fill({ color, alpha: 0.85 })
    g.roundRect(-2.5, -12, 5, 26, 2.5).fill(0x4a3526)
    g.moveTo(-1, -12).lineTo(-8, -22).stroke({ width: 2, color: 0x4a3526, cap: 'round' })
    g.moveTo(1, -12).lineTo(8, -22).stroke({ width: 2, color: 0x4a3526, cap: 'round' })
  } else if (kind === 'fagel') {
    g.ellipse(0, 0, 16, 11).fill(0x7bc4ea).stroke({ width: 2, color: 0x3f8ec2 })
    g.circle(13, -7, 8).fill(0x9ad4f2).stroke({ width: 2, color: 0x3f8ec2 })
    g.poly([20, -7, 30, -4, 20, -1]).fill(COLORS.orange)
    g.circle(15, -9, 2).fill(0x2f2823)
    g.moveTo(-4, -4).quadraticCurveTo(-2, -18, 10, -12).quadraticCurveTo(0, -6, -4, -4).fill(0xd7ecfa)
    g.poly([-14, 0, -26, -6, -24, 5]).fill(0x3f8ec2)
  } else {
    const pts = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? 7 : 17
      pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.poly(pts).fill(COLORS.yellow).stroke({ width: 2.5, color: COLORS.orange })
    g.circle(-4, -4, 3).fill({ color: 0xffffff, alpha: 0.8 })
  }
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// Elvira i ängen — jublar med armarna uppe när regnbågen är klar.
function makeElviraCheer() {
  const c = new Container()
  const skin = 0xffe0bd
  const dress = COLORS.pink
  const hair = 0xf2cf63
  c.addChild(new Graphics().ellipse(0, 62, 30, 8).fill({ color: COLORS.shadow, alpha: 0.15 }))
  c.addChild(new Graphics().circle(-26, -34, 11).fill(hair).circle(26, -34, 11).fill(hair))
  c.addChild(new Graphics()
    .roundRect(-15, 28, 12, 28, 6).fill(0xefb9d2)
    .roundRect(4, 28, 12, 28, 6).fill(0xefb9d2)
    .roundRect(-19, 52, 18, 11, 5).fill(0x6a4a8a)
    .roundRect(2, 52, 18, 11, 5).fill(0x6a4a8a))
  const body = new Graphics()
  body.moveTo(-19, -12).lineTo(19, -12).lineTo(31, 36).lineTo(-31, 36).closePath()
    .fill(dress).stroke({ width: 3, color: 0xe87da8 })
  c.addChild(body)
  // Armar uppe i jubel.
  c.addChild(new Graphics()
    .moveTo(-16, -6).lineTo(-34, -40).stroke({ width: 11, color: dress, cap: 'round' })
    .moveTo(16, -6).lineTo(34, -40).stroke({ width: 11, color: dress, cap: 'round' })
    .circle(-36, -44, 7).fill(skin)
    .circle(36, -44, 7).fill(skin))
  const head = new Graphics().circle(0, -34, 23).fill(skin)
  head.circle(-8, -37, 3).fill(0x3a2a1a)
  head.circle(8, -37, 3).fill(0x3a2a1a)
  head.circle(-13, -29, 4.5).fill({ color: 0xffb0b0, alpha: 0.7 })
  head.circle(13, -29, 4.5).fill({ color: 0xffb0b0, alpha: 0.7 })
  c.addChild(head)
  // Glad öppen mun — moveTo först, annars dras ett streck från (0,0).
  const mouth = new Graphics()
  mouth.moveTo(9 * Math.cos(0.15 * Math.PI), -30 + 9 * Math.sin(0.15 * Math.PI))
  mouth.arc(0, -30, 9, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 3, color: 0x9a5b3b, cap: 'round' })
  c.addChild(mouth)
  c.addChild(new Graphics().roundRect(-23, -56, 46, 16, 9).fill(hair))
  c.children.forEach((ch) => (ch.eventMode = 'none'))
  return c
}
