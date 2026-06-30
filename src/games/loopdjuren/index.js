// Loopdjuren — öppen, kreativ musiklek i Loopimal-stil (2–5 år). Varje djur har en
// LOOP-bana med tomma slots. En spelhuvud-stapel sveper kontinuerligt vänster→höger
// och börjar om (oändlig loop). Barnet drar rörelse-/ljudblock (hopp/snurr/tut/klapp/
// röst) från brickan ner i slotsen; när huvudet passerar en ifylld slot dansar och
// låter just det djuret i takt. En liten låt + dans växer fram av sig själv.
//
// INGET kan bli fel: inga poäng, ingen game-over, ingen timerpress. Ett block som
// släpps utanför en slot puffar snällt bort. "Klart" är mjukt och öppet: första hela
// varvet där varje aktivt djur spelat minst ett block firas EN gång (klistermärke),
// men loopen rullar vidare i all oändlighet.
//
// Exit-säkerhet: loop-logiken är ren ticker-matte (ALDRIG GSAP). Djur-animationer
// kör GSAP på de PERSISTENTA avatar-vyerna (dödas i destroy). Partiklar via de
// exit-säkra hjälparna i lib/feedback.js. Allt gömt bakom this._alive.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, puff, sparkle, floatText } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Djur som har riktiga förinspelade läten (djur_<id> i sfx-manifestet).
const ANIMALS = [
  { id: 'ko', emoji: '🐮', cry: 'Mu! Muu!', color: COLORS.pink },
  { id: 'hund', emoji: '🐶', cry: 'Voff! Voff!', color: COLORS.orange },
  { id: 'katt', emoji: '🐱', cry: 'Mjau!', color: COLORS.purple },
  { id: 'gris', emoji: '🐷', cry: 'Nöff! Nöff!', color: COLORS.teal },
]

// Block-typer: rörelse + ljud. 'rost' (röst) säger djurets eget läte.
const BLOCKS = {
  hopp: { emoji: '⬆️', color: COLORS.green },
  snurr: { emoji: '🌀', color: COLORS.blue },
  tut: { emoji: '🎺', color: COLORS.orange },
  klapp: { emoji: '👏', color: COLORS.red },
  rost: { emoji: '🎵', color: COLORS.purple },
}
const STAMP_ORDER = ['hopp', 'snurr', 'tut', 'klapp', 'rost']
// Slot-tap cyklar tomt → hopp → … → röst → tomt.
const CYCLE = [null, 'hopp', 'snurr', 'tut', 'klapp', 'rost']

// Loop-banans x-utbredning (slot-mitt) och playhead-svep.
const TRACK_X0 = 280
const TRACK_X1 = 1150
const Y3 = [210, 370, 530]
const Y4 = [185, 320, 455, 590]

export default {
  id: 'loopdjuren',
  titleSv: 'Loopdjuren',
  icon: '🎶',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'loopdjuren',
  voiceIntro: 'Lägg blocken hos djuren så börjar de dansa!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._lastBeat = -1
    this._celebrated = false
    this._fullDone = false
    this._idle = 0
    this._placedCount = 0
    this._beatMs = 900
    this._rows = []
    this._stamps = []
    this._delays = []

    // Nivå styr storleken (3 djur/4 slots → 3 djur/5 slots → 4 djur/6 slots).
    const level = Math.min(ctx.progress.get().highestLevel || 1, 3)
    this._nAnimals = level >= 3 ? 4 : 3
    this._slots = level >= 3 ? 6 : level === 2 ? 5 : 4

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lager-ordning: bakgrund < radpaneler < playhead < djur/slots(+block) < bricka < stämplar.
    this._root.addChild(createScene('candy', { width: ctx.width, height: ctx.height }))
    this._panelLayer = new Container()
    this._panelLayer.eventMode = 'none'
    this._root.addChild(this._panelLayer)
    this._buildPlayhead()
    this._stageLayer = new Container()
    this._root.addChild(this._stageLayer)

    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._buildRows(ctx)
    this._buildTray(ctx)

    this._tick = (ticker) => this._loop(ticker, ctx)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // --- bygg scenen ---------------------------------------------------------

  _buildPlayhead() {
    const ph = new Container()
    ph.eventMode = 'none'
    ph.addChild(new Graphics().roundRect(-6, 130, 12, 480, 6).fill({ color: COLORS.yellow, alpha: 0.55 }))
    ph.addChild(new Graphics().circle(0, 128, 13).fill({ color: COLORS.yellow, alpha: 0.9 }))
    ph.x = TRACK_X0
    this._playhead = ph
    this._root.addChild(ph)
  },

  _buildRows(ctx) {
    const ys = this._nAnimals === 4 ? Y4 : Y3
    const N = this._slots
    const gap = N > 1 ? (TRACK_X1 - TRACK_X0) / (N - 1) : 0
    for (let r = 0; r < this._nAnimals; r++) {
      const animal = ANIMALS[r]
      const yc = ys[r]
      // Radpanel (dekor).
      const panel = new Graphics()
        .roundRect(70, yc - 66, 1140, 132, 28)
        .fill({ color: animal.color, alpha: 0.16 })
        .stroke({ width: 4, color: animal.color, alpha: 0.5 })
      panel.eventMode = 'none'
      this._panelLayer.addChild(panel)

      // Radgrupp (avatar + slots) — dimmas som helhet när djuret tystas.
      const group = new Container()
      this._stageLayer.addChild(group)

      const row = {
        id: animal.id,
        cry: animal.cry,
        yc,
        active: true,
        group,
        slots: new Array(N).fill(null),
        slotC: [],
        blockViews: new Array(N).fill(null),
        _playedThisLoop: false,
        _lastSampleAt: 0,
      }

      // Avatar.
      const avatar = this._makeAnimal(animal, yc)
      avatar.on('pointertap', () => this._toggleAnimal(ctx, row))
      group.addChild(avatar)
      row.view = avatar

      // Loop-bana med slots.
      for (let i = 0; i < N; i++) {
        const slotX = TRACK_X0 + i * gap
        const slot = this._makeSlot(slotX, yc)
        slot._row = row
        slot._idx = i
        // VIKTIGT: egen cykel-lyssnare FÖRE DragController-målet, så ett markerat
        // tap-tap-block placeras (av DragController) istället för att cykla.
        slot.on('pointertap', () => {
          if (!this._alive) return
          if (this._drag.selected) return // tap-tap-placering pågår
          this._cycleSlot(ctx, row, i)
        })
        this._drag.addTarget(slot, () => true, { hitRadius: 80 })
        group.addChild(slot)
        row.slotC.push(slot)
      }

      this._rows.push(row)
    }
  },

  _makeAnimal(animal, yc) {
    const c = new Container()
    c.x = 130
    c.y = yc
    c.addChild(new Graphics().circle(0, 8, 56).fill({ color: COLORS.shadow, alpha: 0.1 }))
    c.addChild(new Graphics().circle(0, 0, 58).fill(COLORS.cream).stroke({ width: 5, color: animal.color }))
    c.addChild(new Graphics().circle(-18, -20, 13).fill({ color: COLORS.white, alpha: 0.6 }))
    const face = new Text({ text: animal.emoji, style: { fontFamily: FONT.body, fontSize: 84 } })
    face.anchor.set(0.5)
    c.addChild(face)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 80)
    return c
  },

  _makeSlot(slotX, yc) {
    const c = new Container()
    c.x = slotX
    c.y = yc
    c.addChild(
      new Graphics()
        .roundRect(-46, -46, 92, 92, 18)
        .fill({ color: COLORS.white, alpha: 0.55 })
        .stroke({ width: 3, color: COLORS.inkSoft, alpha: 0.4 }),
    )
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-58, -58, 116, 116)
    return c
  },

  // En blockvy som ligger i en slot (icke-interaktiv — tap går till sloten under).
  _makeBlockView(type) {
    const b = BLOCKS[type]
    const c = new Container()
    c.eventMode = 'none'
    c.addChild(
      new Graphics().roundRect(-44, -44, 88, 88, 16).fill(b.color).stroke({ width: 4, color: COLORS.white, alpha: 0.95 }),
    )
    const t = new Text({ text: b.emoji, style: { fontFamily: FONT.body, fontSize: 50 } })
    t.anchor.set(0.5)
    c.addChild(t)
    return c
  },

  _buildTray(ctx) {
    // Brick-panel (dekor).
    const tray = new Graphics()
      .roundRect(60, 624, 1160, 84, 24)
      .fill({ color: COLORS.white, alpha: 0.92 })
      .stroke({ width: 3, color: COLORS.yellow })
    tray.eventMode = 'none'
    this._root.addChild(tray)

    // Tempo-knapp (i brickan, till höger).
    this._root.addChild(this._makeTempo(ctx))

    // 5 dra-stämplar (oändlig källa — släpps i en slot men återgår alltid hem).
    const x0 = 150
    const gap = 130
    STAMP_ORDER.forEach((type, i) => {
      const stamp = this._makeStamp(type)
      stamp.x = x0 + i * gap
      stamp.y = 666
      this._root.addChild(stamp)
      this._stamps.push(stamp)
      this._drag.addItem(stamp, { type }, {
        onCorrect: (rec, target) => {
          if (!this._alive) return
          this._idle = 0
          const sv = target.view
          this._setSlot(ctx, sv._row, sv._idx, type)
          this._resetStamp(rec)
        },
        onMiss: (rec) => {
          if (!this._alive) return
          this._idle = 0
          puff(ctx.fxLayer, rec.view.x, rec.view.y)
          ctx.services.audio.sfx('soft')
        },
      })
    })
  },

  _makeStamp(type) {
    const b = BLOCKS[type]
    const c = new Container()
    c.addChild(
      new Graphics().roundRect(-46, -46, 92, 92, 18).fill(b.color).stroke({ width: 4, color: COLORS.white, alpha: 0.95 }),
    )
    const t = new Text({ text: b.emoji, style: { fontFamily: FONT.body, fontSize: 54 } })
    t.anchor.set(0.5)
    c.addChild(t)
    c.hitArea = new Rectangle(-58, -58, 116, 116)
    return c
  },

  // Återställ stämpeln till sin hemplats så den är en oändlig källa.
  _resetStamp(rec) {
    const v = rec.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    v.x = rec.home.x
    v.y = rec.home.y
    v.scale.set(rec.base.x, rec.base.y)
    v.eventMode = 'static'
    rec.placed = false
    rec.dragging = false
  },

  _makeTempo(ctx) {
    const c = new Container()
    c.x = 1150
    c.y = 666
    c.addChild(new Graphics().circle(0, 0, 46).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white }))
    const t = new Text({ text: '🐢', style: { fontFamily: FONT.body, fontSize: 48 } })
    t.anchor.set(0.5)
    c.addChild(t)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 60)
    c.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      this._beatMs = this._beatMs === 900 ? 640 : 900
      t.text = this._beatMs === 640 ? '🐇' : '🐢'
      ctx.services.audio.sfx('flip')
      pop(c)
    })
    this._tempo = c
    return c
  },

  // --- spel-state ----------------------------------------------------------

  // Sätt/ersätt/töm en slot. type=null tömmer. Uppdaterar räknare + blockvy.
  _setSlot(ctx, row, i, type) {
    if (!this._alive) return
    const old = row.slots[i]
    const oldView = row.blockViews[i]
    if (oldView && !oldView.destroyed) {
      gsap.killTweensOf(oldView)
      gsap.killTweensOf(oldView.scale)
      oldView.destroy({ children: true })
    }
    row.blockViews[i] = null
    if (old && !type) this._placedCount--
    else if (!old && type) this._placedCount++
    row.slots[i] = type
    if (type) {
      const bv = this._makeBlockView(type)
      row.slotC[i].addChild(bv)
      row.blockViews[i] = bv
      bounceIn(bv)
      sparkle(ctx.fxLayer, row.slotC[i].x, row.yc)
      ctx.services.audio.sfx('pling')
    }
    this._checkFullMilestone(ctx)
  },

  // Tap på slot cyklar block-typen (tomt → hopp → … → röst → tomt).
  _cycleSlot(ctx, row, i) {
    this._idle = 0
    const cur = row.slots[i]
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]
    this._setSlot(ctx, row, i, next)
    ctx.services.audio.sfx('pop')
  },

  // Tap på djuret tystar/aktiverar dess rad (sola ut ett djur).
  _toggleAnimal(ctx, row) {
    if (!this._alive) return
    this._idle = 0
    row.active = !row.active
    gsap.killTweensOf(row.group)
    gsap.to(row.group, { alpha: row.active ? 1 : 0.5, duration: 0.2 })
    if (row.active) {
      ctx.services.audio.sfx('pop')
      pop(row.view)
    } else {
      ctx.services.audio.sfx('flip')
    }
  },

  // Milstolpe: alla slots i alla banor fyllda → extra gnistor (spammar ALDRIG complete).
  _checkFullMilestone(ctx) {
    const total = this._rows.length * this._slots
    if (total > 0 && this._placedCount >= total) {
      if (!this._fullDone) {
        this._fullDone = true
        this._rows.forEach((r) => sparkle(ctx.fxLayer, r.slotC[this._slots - 1].x, r.yc))
        floatText(ctx.fxLayer, ctx.width / 2, 116, '⭐', { fontSize: 72, rise: 80 })
      }
    } else {
      this._fullDone = false
    }
  },

  // --- loop-timer (ticker-driven, exit-säker) -----------------------------

  _loop(ticker, ctx) {
    if (!this._alive) return
    const dt = ticker.deltaMS
    this._t += dt
    this._idle += dt / 1000

    // Playhead glider mjukt (ren positionsuppdatering, ingen fysik).
    const cycle = this._beatMs * this._slots
    const frac = (this._t % cycle) / cycle
    this._playhead.x = TRACK_X0 + frac * (TRACK_X1 - TRACK_X0)

    // Beat-trigger.
    const beat = Math.floor(this._t / this._beatMs) % this._slots
    if (beat !== this._lastBeat) {
      const wrapped = beat === 0 && this._lastBeat !== -1
      if (wrapped) this._onLoopWrap(ctx) // utvärdera varvet som just tog slut
      for (const row of this._rows) {
        if (!row.active) continue
        const type = row.slots[beat]
        if (type) {
          this._perform(ctx, row, type)
          row._playedThisLoop = true
        }
      }
      this._lastBeat = beat
    }

    // Mjuk idle-vink — bara om inga block ännu placerats (annars talar musiken själv).
    if (this._idle > 6 && this._placedCount === 0) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const s = this._stamps[0]
      if (s && !s.destroyed) wiggle(s)
    }
  },

  // Slut på ett varv: om varje aktivt djur spelat ≥1 block → mjukt firande (en gång).
  _onLoopWrap(ctx) {
    if (!this._celebrated) {
      const active = this._rows.filter((r) => r.active)
      if (this._placedCount > 0 && active.length > 0 && active.every((r) => r._playedThisLoop)) {
        this._celebrate(ctx)
      }
    }
    for (const row of this._rows) row._playedThisLoop = false
  },

  _celebrate(ctx) {
    this._celebrated = true
    ctx.progress.complete() // firande (1–2s) + stjärna + klistermärke; loopen pausas INTE
    // Progression: nästa besök får fler slots/djur; räkna skapade arrangemang.
    const cur = ctx.progress.get().highestLevel || 1
    ctx.progress.setLevel(cur + 1)
    const n = ctx.progress.get().custom?.arrangemang || 0
    ctx.progress.setCustom('arrangemang', n + 1)
  },

  // Utför ett blocks rörelse + ljud på djurets PERSISTENTA avatar-vy (exit-säkert).
  _perform(ctx, row, type) {
    const view = row.view
    if (!view || view.destroyed) return
    const audio = ctx.services.audio
    switch (type) {
      case 'hopp':
        gsap.killTweensOf(view, 'y')
        view.y = row.yc
        gsap.to(view, { y: row.yc - 26, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
        audio.sfx('boing')
        break
      case 'snurr':
        gsap.to(view, { rotation: view.rotation + Math.PI * 2, duration: 0.4, ease: 'power1.inOut' })
        audio.sfx('whoosh')
        break
      case 'tut':
        pop(view, { scale: 1.3 })
        audio.sfx('pling')
        break
      case 'klapp':
        pop(view)
        this._later(0.13, () => pop(view)) // snabb dubbel-squash
        audio.sfx('pop')
        break
      case 'rost': {
        pop(view, { scale: 1.22 })
        const now = performance.now()
        if (now - row._lastSampleAt > 120) {
          row._lastSampleAt = now
          if (!audio.sample('djur_' + row.id)) ctx.services.voice.say(row.cry)
        }
        floatText(ctx.fxLayer, view.x, view.y - 70, '🎵', { fontSize: 48, rise: 70 })
        break
      }
    }
  },

  // Exit-säker fördröjd anrop (kör bara om spelet lever).
  _later(sec, fn) {
    const c = gsap.delayedCall(sec, () => {
      if (this._alive) fn()
    })
    this._delays.push(c)
    return c
  },

  // --- städning ------------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)

    this._delays.forEach((d) => d?.kill())
    this._delays = []

    this._drag?.destroy()

    // Döda alla tweens på persistenta vyer innan de förstörs (ingen null-transform-krasch).
    for (const row of this._rows) {
      if (row.view && !row.view.destroyed) {
        gsap.killTweensOf(row.view)
        gsap.killTweensOf(row.view.scale)
      }
      if (row.group && !row.group.destroyed) gsap.killTweensOf(row.group)
      for (const bv of row.blockViews) {
        if (bv && !bv.destroyed) {
          gsap.killTweensOf(bv)
          gsap.killTweensOf(bv.scale)
        }
      }
    }
    if (this._playhead && !this._playhead.destroyed) gsap.killTweensOf(this._playhead)
    if (this._tempo && !this._tempo.destroyed) {
      gsap.killTweensOf(this._tempo)
      gsap.killTweensOf(this._tempo.scale)
    }
    for (const s of this._stamps) {
      if (s && !s.destroyed) {
        gsap.killTweensOf(s)
        gsap.killTweensOf(s.scale)
      }
    }
    gsap.killTweensOf(this._root)

    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}
