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
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, puff, sparkle, floatText } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS } from '../../lib/theme.js'

// Djur som har riktiga förinspelade läten (djur_<id> i sfx-manifestet).
const ANIMALS = [
  { id: 'ko', cry: 'Mu! Muu!', color: COLORS.pink },
  { id: 'hund', cry: 'Voff! Voff!', color: COLORS.orange },
  { id: 'katt', cry: 'Mjau!', color: COLORS.purple },
  { id: 'gris', cry: 'Nöff! Nöff!', color: COLORS.teal },
]

// Block-typer: rörelse + ljud. 'rost' (röst) säger djurets eget läte.
const BLOCKS = {
  hopp: { color: COLORS.green }, // studsfjäder
  snurr: { color: COLORS.blue }, // snurra
  tut: { color: COLORS.orange }, // trumpet
  klapp: { color: COLORS.red }, // klappande händer
  rost: { color: COLORS.purple }, // musiknot = djurets egen röst
}
const STAMP_ORDER = ['hopp', 'snurr', 'tut', 'klapp', 'rost']
// Slot-tap cyklar tomt → hopp → … → röst → tomt.
const CYCLE = [null, 'hopp', 'snurr', 'tut', 'klapp', 'rost']

// Stämda instrument per djur (mönster #7): samma pentatoniska skala, olika oktav + klang.
// Block på olika djur klingar därför ALLTID ihop till harmoni, och en rad block stiger
// till en liten melodi (ton = skalsteg efter slot-index). Röst-blocket = djurets eget läte.
const PENTA = [0, 2, 4, 7, 9] // C-dur-pentatonik (semitonsteg)
const INSTRUMENTS = {
  ko: { base: 131, type: 'sine' }, // bas (C3)
  hund: { base: 262, type: 'triangle' }, // mellanregister (C4)
  katt: { base: 523, type: 'triangle' }, // ljus marimba (C5)
  gris: { base: 196, type: 'sine' }, // (G3)
}

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
    // RITAT djurhuvud med egen silhuett (öron, horn, nos sticker ut) — förut satt en
    // emoji i en gräddvit cirkel, precis det P0 ASSETS förbjuder.
    c.addChild(new Graphics().ellipse(0, 52, 52, 12).fill({ color: COLORS.shadow, alpha: 0.12 }))
    const g = new Graphics()
    drawAnimalHead(g, animal.id)
    g.eventMode = 'none'
    c.addChild(g)
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
    const c = new Container()
    c.eventMode = 'none'
    c.addChild(makeBlockArt(type))
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
    const c = new Container()
    c.addChild(makeBlockArt(type))
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
    // Ritad sköldpadda/hare — takt-knappen är en UI-kontroll, men den ritas ändå.
    const icon = new Graphics()
    icon.eventMode = 'none'
    drawTempoIcon(icon, false)
    c.addChild(icon)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 60)
    c.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      this._beatMs = this._beatMs === 900 ? 640 : 900
      drawTempoIcon(icon, this._beatMs === 640)
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
          this._perform(ctx, row, type, beat)
          row._playedThisLoop = true
        }
      }
      // Beat-puls: hela den aktiva kolumnen studsar mjukt så takten SYNS.
      for (const row of this._rows) {
        const sc = row.slotC[beat]
        if (sc && !sc.destroyed) {
          gsap.killTweensOf(sc.scale)
          gsap.to(sc.scale, { x: 1.12, y: 1.12, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out', onComplete: () => { if (!sc.destroyed) sc.scale.set(1) } })
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

  // Tonen för ett djur vid ett slot-index: djurets instrument på pentatonisk skala,
  // skalsteget bestäms av slot-index (rad av block stiger till en melodi).
  _noteFreq(id, slotIdx) {
    const ins = INSTRUMENTS[id] || INSTRUMENTS.ko
    const semi = PENTA[slotIdx % PENTA.length] + 12 * Math.floor(slotIdx / PENTA.length)
    return { freq: ins.base * Math.pow(2, semi / 12), type: ins.type }
  },

  // Utför ett blocks rörelse + ljud på djurets PERSISTENTA avatar-vy (exit-säkert).
  // Blocken spelar nu en STÄMD ton (harmoniserar mellan djur); röst = djurets läte.
  _perform(ctx, row, type, slotIdx = 0) {
    const view = row.view
    if (!view || view.destroyed) return
    const audio = ctx.services.audio
    const note = this._noteFreq(row.id, slotIdx)
    switch (type) {
      case 'hopp':
        gsap.killTweensOf(view, 'y')
        view.y = row.yc
        gsap.to(view, { y: row.yc - 26, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
        audio.tone({ freq: note.freq, dur: 0.18, type: note.type, vol: 0.2 })
        break
      case 'snurr':
        gsap.to(view, { rotation: view.rotation + Math.PI * 2, duration: 0.4, ease: 'power1.inOut' })
        audio.tone({ freq: note.freq, dur: 0.22, type: note.type, vol: 0.18, slideTo: note.freq * 1.5 }) // liten upp-svirr
        break
      case 'tut':
        pop(view, { scale: 1.3 })
        audio.tone({ freq: note.freq, dur: 0.34, type: note.type, vol: 0.2 })
        break
      case 'klapp':
        pop(view)
        this._later(0.13, () => pop(view)) // snabb dubbel-squash
        audio.tone({ freq: note.freq, dur: 0.1, type: note.type, vol: 0.2 })
        this._later(0.13, () => audio.tone({ freq: note.freq, dur: 0.1, type: note.type, vol: 0.16 }))
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
      for (const sc of row.slotC || []) {
        if (sc && !sc.destroyed) gsap.killTweensOf(sc.scale)
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

// =================== Programmatisk grafik ===================

// Djurhuvuden med EGEN silhuett — öron, horn och nosar sticker ut ur konturen, så de
// aldrig blir "en ikon i en cirkel". Origo = mitten av huvudet.
function drawAnimalHead(g, id) {
  g.clear()
  if (id === 'ko') {
    g.ellipse(-48, -32, 15, 9).fill(0xefe0c2).stroke({ width: 3, color: 0xc9b48a }) // horn
    g.ellipse(48, -32, 15, 9).fill(0xefe0c2).stroke({ width: 3, color: 0xc9b48a })
    g.ellipse(-57, -6, 20, 13).fill(0xf4f0ea).stroke({ width: 3, color: 0xc0b8ac }) // öron
    g.ellipse(57, -6, 20, 13).fill(0xf4f0ea).stroke({ width: 3, color: 0xc0b8ac })
    g.ellipse(0, 0, 50, 46).fill(0xfbf8f4).stroke({ width: 4, color: 0xb0a89c })
    g.ellipse(-29, -18, 16, 12).fill(0x4a4038) // fläckar
    g.ellipse(31, 9, 13, 10).fill(0x4a4038)
    g.ellipse(0, 21, 30, 20).fill(0xffb9cf).stroke({ width: 3, color: 0xe08bad }) // mule
    g.ellipse(-10, 19, 4.5, 6).fill(0xd8749b)
    g.ellipse(10, 19, 4.5, 6).fill(0xd8749b)
    g.circle(-18, -9, 5.5).fill(0x2f2823)
    g.circle(18, -9, 5.5).fill(0x2f2823)
    g.circle(-16, -11, 2).fill(0xffffff)
    g.circle(20, -11, 2).fill(0xffffff)
  } else if (id === 'hund') {
    g.ellipse(-46, 8, 17, 33).fill(0x8a5a3b).stroke({ width: 3, color: 0x5e3720 }) // hängöron
    g.ellipse(46, 8, 17, 33).fill(0x8a5a3b).stroke({ width: 3, color: 0x5e3720 })
    g.ellipse(0, -2, 48, 44).fill(0xd7a06a).stroke({ width: 4, color: 0xa8763c })
    g.ellipse(0, -32, 34, 16).fill(0xc08a52) // lugg
    g.ellipse(0, 22, 27, 19).fill(0xf0d3ae).stroke({ width: 3, color: 0xc59f74 }) // nosparti
    g.ellipse(0, 13, 11, 8).fill(0x3a2a20)
    g.roundRect(-7, 30, 14, 15, 7).fill(0xff8fae) // tunga
    g.circle(-17, -8, 5.5).fill(0x2f2823)
    g.circle(17, -8, 5.5).fill(0x2f2823)
    g.circle(-15, -10, 2).fill(0xffffff)
    g.circle(19, -10, 2).fill(0xffffff)
  } else if (id === 'katt') {
    g.poly([-46, -54, -18, -28, -54, -16]).fill(0xf2a34a).stroke({ width: 3, color: 0xc07a24 }) // öron
    g.poly([46, -54, 18, -28, 54, -16]).fill(0xf2a34a).stroke({ width: 3, color: 0xc07a24 })
    g.poly([-42, -45, -25, -29, -46, -22]).fill(0xffc9d8)
    g.poly([42, -45, 25, -29, 46, -22]).fill(0xffc9d8)
    g.ellipse(0, 2, 46, 42).fill(0xf2a34a).stroke({ width: 4, color: 0xc07a24 })
    g.roundRect(-11, -34, 5, 15, 2.5).fill(0xc07a24) // pannränder
    g.roundRect(2, -36, 5, 15, 2.5).fill(0xc07a24)
    g.poly([0, 12, -8, 4, 8, 4]).fill(0xff8fae)
    g.moveTo(-14, 16).lineTo(-48, 10).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' }) // morrhår
    g.moveTo(-14, 20).lineTo(-46, 24).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
    g.moveTo(14, 16).lineTo(48, 10).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
    g.moveTo(14, 20).lineTo(46, 24).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
    g.ellipse(-17, -6, 6, 8).fill(0x2f2823)
    g.ellipse(17, -6, 6, 8).fill(0x2f2823)
    g.circle(-15, -9, 2.2).fill(0xffffff)
    g.circle(19, -9, 2.2).fill(0xffffff)
  } else {
    g.poly([-44, -40, -14, -30, -34, -6]).fill(0xffb3c8).stroke({ width: 3, color: 0xe0709b }) // öron
    g.poly([44, -40, 14, -30, 34, -6]).fill(0xffb3c8).stroke({ width: 3, color: 0xe0709b })
    g.ellipse(0, 0, 48, 42).fill(0xffc3d4).stroke({ width: 4, color: 0xe0709b })
    g.ellipse(0, 17, 25, 18).fill(0xff9ec4).stroke({ width: 3, color: 0xd45f8c }) // tryne
    g.ellipse(-8, 16, 4, 6).fill(0xc44a7a)
    g.ellipse(8, 16, 4, 6).fill(0xc44a7a)
    g.circle(-17, -10, 5.5).fill(0x2f2823)
    g.circle(17, -10, 5.5).fill(0x2f2823)
    g.circle(-15, -12, 2).fill(0xffffff)
    g.circle(19, -12, 2).fill(0xffffff)
  }
}

// Blockens konst: ett RIKTIGT ritat föremål med en mjuk färgglöd bakom (rund glöd,
// aldrig en ruta) — förut satt en emoji i en färgad fyrkant.
function makeBlockArt(type) {
  const b = BLOCKS[type]
  const c = new Container()
  c.eventMode = 'none'
  c.addChild(new Graphics()
    .circle(0, 5, 45).fill({ color: b.color, alpha: 0.2 })
    .circle(0, 0, 38).fill({ color: b.color, alpha: 0.3 }))
  const g = new Graphics()
  g.eventMode = 'none'
  if (type === 'hopp') {
    // Studsfjäder med platta.
    g.roundRect(-24, 26, 48, 11, 5.5).fill(0x3f8a4f)
    for (let i = 0; i < 4; i++) {
      const y = 20 - i * 11
      g.moveTo(-18, y).quadraticCurveTo(0, y - 13, 18, y - 4)
        .stroke({ width: 8, color: COLORS.green, cap: 'round' })
    }
    g.circle(0, -30, 13).fill(COLORS.green).stroke({ width: 3, color: 0x3f8a4f })
    g.circle(-4, -34, 4).fill({ color: COLORS.white, alpha: 0.6 })
  } else if (type === 'snurr') {
    // Snurra: kon nedåt, knopp upptill, virvel.
    g.moveTo(-29, -14).lineTo(29, -14).lineTo(0, 35).closePath().fill(COLORS.blue).stroke({ width: 3, color: 0x2f7cb0 })
    g.ellipse(0, -14, 29, 10).fill(0x7bc4ea).stroke({ width: 3, color: 0x2f7cb0 })
    g.roundRect(-5, -35, 10, 21, 5).fill(0x2f7cb0)
    g.circle(0, -39, 8).fill(COLORS.white).stroke({ width: 3, color: 0x2f7cb0 })
    g.moveTo(-17, -12).quadraticCurveTo(0, 6, 15, -6).stroke({ width: 3.5, color: COLORS.white, alpha: 0.85, cap: 'round' })
  } else if (type === 'tut') {
    // Trumpet med klockstycke och ventiler.
    g.roundRect(-36, -7, 50, 15, 7.5).fill(COLORS.yellow).stroke({ width: 3, color: 0xc98a2e })
    g.moveTo(12, -24).lineTo(34, -32).lineTo(34, 32).lineTo(12, 24).closePath().fill(COLORS.yellow).stroke({ width: 3, color: 0xc98a2e })
    g.ellipse(34, 0, 8, 32).fill(0xffe9a8).stroke({ width: 3, color: 0xc98a2e })
    for (let i = 0; i < 3; i++) g.roundRect(-24 + i * 13, -22, 8, 17, 4).fill(0xc98a2e)
    g.roundRect(-44, -9, 12, 19, 6).fill(0xc98a2e)
  } else if (type === 'klapp') {
    // Två händer som möts + rörelsestreck.
    g.roundRect(-35, -16, 29, 37, 13).fill(0xf6c396).stroke({ width: 3, color: 0xcf9a68 })
    g.roundRect(-31, -29, 10, 21, 5).fill(0xf6c396).stroke({ width: 2.5, color: 0xcf9a68 })
    g.roundRect(6, -16, 29, 37, 13).fill(0xffd7ae).stroke({ width: 3, color: 0xcf9a68 })
    g.roundRect(21, -29, 10, 21, 5).fill(0xffd7ae).stroke({ width: 2.5, color: 0xcf9a68 })
    for (const [x0, y0, x1, y1] of [[-38, -30, -46, -40], [0, -36, 0, -48], [38, -30, 46, -40]]) {
      g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 4, color: COLORS.red, alpha: 0.85, cap: 'round' })
    }
  } else {
    // Musiknot — djurets egen röst.
    g.ellipse(-11, 25, 17, 13).fill(COLORS.purple).stroke({ width: 3, color: 0x7a5fd0 })
    g.roundRect(2, -32, 7, 58, 3.5).fill(COLORS.purple)
    g.moveTo(9, -32).quadraticCurveTo(36, -24, 27, 4).quadraticCurveTo(31, -15, 9, -13).closePath()
      .fill(COLORS.purple).stroke({ width: 3, color: 0x7a5fd0 })
  }
  c.addChild(g)
  return c
}

// Takt-knappens ikon: sköldpadda (lugnt) eller hare (snabbt).
function drawTempoIcon(g, fast) {
  g.clear()
  if (fast) {
    g.ellipse(-8, -25, 6, 18).fill(0xfffdf7).stroke({ width: 2.5, color: 0xb9a98f })
    g.ellipse(9, -27, 6, 18).fill(0xfffdf7).stroke({ width: 2.5, color: 0xb9a98f })
    g.ellipse(-8, -25, 3, 11).fill(0xffc9d8)
    g.ellipse(9, -27, 3, 11).fill(0xffc9d8)
    g.ellipse(0, 3, 21, 18).fill(0xfffdf7).stroke({ width: 3, color: 0xb9a98f })
    g.circle(-7, 0, 3).fill(0x3a2f28)
    g.circle(7, 0, 3).fill(0x3a2f28)
    g.ellipse(0, 9, 5, 4).fill(0xff9ec4)
  } else {
    g.ellipse(-22, 16, 9, 6).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c }) // fötter
    g.ellipse(16, 17, 9, 6).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c })
    g.ellipse(-30, -3, 8, 7).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c }) // svans
    g.ellipse(26, -6, 13, 11).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c }) // huvud
    g.circle(30, -9, 2.6).fill(0x2f2823)
    g.ellipse(0, 0, 28, 21).fill(0x6fae52).stroke({ width: 3.5, color: 0x3f6f2c }) // skal
    for (const [hx, hy, rr] of [[0, -6, 9], [-14, 3, 7], [13, 4, 7], [-2, 10, 6]]) {
      g.circle(hx, hy, rr).fill(0x8ec96e).stroke({ width: 2, color: 0x3f6f2c })
    }
  }
}
