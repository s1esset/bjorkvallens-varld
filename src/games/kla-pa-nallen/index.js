// Klä på Nallen — dra-och-släpp (2–5 år). Marknadsmässig uppgradering: en mysig,
// uttrycksfull nalle (mjuk pälsskuggning, rosiga kinder, BLINKANDE ögon, glad min)
// står på en levande scen och väntar på sina kläder. Barnet drar — eller tap-tap:ar
// via DragController — plagg till rätt kroppsdel (huvud/hals/mage/tassar/ben/fötter).
// Rätt plats → plagget snäpper fast, blir en del av nallen (skugga + bricka tonar bort,
// bara plagget sitter kvar), popp + gnistor + ring + glad röst, och nallen reagerar
// (liten studs). Fel plats → mjuk vingel + ring + vänlig ledtråd, snäpp tillbaka
// (ALDRIG en bestraffning). När hela outfiten sitter → nallen snurrar glatt, delat
// firande (progress.complete: ljud + beröm + konfetti + stjärna + klistermärke) +
// mjuk skakning, sedan en NY, varierad runda (annan outfit, scen, färger).
//
// DJUP: antalet plagg växer med nivån (2 → upp till 5) och outfiten + scenen roteras
// varje runda (vinter/sommar/regn/fin/mys) så det aldrig blir samma två gånger.
// Strikt felfritt, ingen timer, inga poäng. Allt ritas programmatiskt (Pixi + emoji)
// och all transient-effekt går via lib/feedback.js (exit-säkert).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom } from '../../lib/swedish.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, sparkle, ripple, floatText, breathe, shake } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Nallens center (= pivot, så hon kan studsa OCH snurra runt sin mitt).
const BEAR_CX = 640
const BEAR_CY = 405
const SHELF_Y = 648 // plagghyllans y (designkoordinater)
const RINGR = 66 // ledtråds-ringens radie

// Nallens färger.
const BEAR = 0xb07a4a
const BEAR_DARK = 0x8a5e34
const EYE = 0x3a2a1a

// Anatomiska snäpp-positioner (designkoordinater). En runda använder en delmängd.
// hander & ben förekommer aldrig i samma outfit (undviker trångt i nedre kroppen).
const SLOT_POS = {
  huvud: [640, 196],
  hals: [640, 300],
  kropp: [640, 402],
  hander: [640, 478],
  ben: [640, 550],
  fotter: [640, 614],
}

// Talad svensk plats-ledtråd per kroppsdel (för vänlig redirect/idle-recue).
const SLOT_PHRASE = {
  huvud: 'på huvudet',
  hals: 'runt halsen',
  kropp: 'på magen',
  hander: 'på tassarna',
  ben: 'på benen',
  fotter: 'på fötterna',
}

// Hur ett plagg SITTER när det är påklätt: passforms-skala + offset från slot-mitten,
// så själva plagget klär rätt kroppsdel (mössan uppe på huvudet, tröjan över magen,
// skorna på fötterna ...). Skalan förstorar shelf-plagget så det täcker kroppsdelen.
const WORN = {
  huvud: { scale: 1.26, dx: 0, dy: -52 },
  hals: { scale: 1.12, dx: 0, dy: 8 },
  kropp: { scale: 1.55, dx: 0, dy: 8 },
  hander: { scale: 1.18, dx: 0, dy: 2 },
  ben: { scale: 1.4, dx: 0, dy: 8 },
  fotter: { scale: 1.34, dx: 0, dy: 6 },
}

// Outfits (likt vändkortens SETS): scen + talad flavour + slots (ordnade uppifrån
// och ned, så låga nivåer tar de första) + plagg-alternativ per slot. e=emoji,
// n=svensk benämning i bestämd form (för "Mössan sitter!"-beröm).
const OUTFITS = [
  {
    say: 'vinterkläder',
    scene: 'water',
    slots: ['huvud', 'hals', 'kropp', 'hander', 'fotter'],
    garments: {
      huvud: [{ e: '🧢', n: 'mössan' }],
      hals: [{ e: '🧣', n: 'halsduken' }],
      kropp: [{ e: '🧥', n: 'jackan' }],
      hander: [{ e: '🧤', n: 'vantarna' }],
      fotter: [{ e: '🥾', n: 'stövlarna' }, { e: '⛸️', n: 'skridskorna' }],
    },
  },
  {
    say: 'sommarkläder',
    scene: 'meadow',
    slots: ['huvud', 'kropp', 'ben', 'fotter'],
    garments: {
      huvud: [{ e: '👒', n: 'solhatten' }, { e: '🧢', n: 'kepsen' }, { e: '🕶️', n: 'solglasögonen' }],
      kropp: [{ e: '👕', n: 't-tröjan' }, { e: '👚', n: 'linnet' }],
      ben: [{ e: '🩳', n: 'shortsen' }],
      fotter: [{ e: '👟', n: 'skorna' }, { e: '🩴', n: 'sandalerna' }],
    },
  },
  {
    say: 'regnkläder',
    scene: 'sky',
    slots: ['huvud', 'kropp', 'hander', 'fotter'],
    garments: {
      huvud: [{ e: '🧢', n: 'regnhatten' }],
      kropp: [{ e: '🧥', n: 'regnjackan' }],
      hander: [{ e: '☂️', n: 'paraplyet' }],
      fotter: [{ e: '🥾', n: 'gummistövlarna' }],
    },
  },
  {
    say: 'finkläder',
    scene: 'candy',
    slots: ['huvud', 'hals', 'kropp', 'ben', 'fotter'],
    garments: {
      huvud: [{ e: '🎩', n: 'hatten' }, { e: '👑', n: 'kronan' }],
      hals: [{ e: '🎀', n: 'rosetten' }, { e: '👔', n: 'slipsen' }],
      kropp: [{ e: '👕', n: 'skjortan' }, { e: '👗', n: 'klänningen' }],
      ben: [{ e: '👖', n: 'byxorna' }],
      fotter: [{ e: '👞', n: 'skorna' }, { e: '🥿', n: 'ballerinaskorna' }],
    },
  },
  {
    say: 'mysiga kläder',
    scene: 'sunset',
    slots: ['huvud', 'kropp', 'ben', 'fotter'],
    garments: {
      huvud: [{ e: '🧢', n: 'nattmössan' }],
      kropp: [{ e: '👕', n: 'tröjan' }],
      ben: [{ e: '👖', n: 'mysbyxorna' }, { e: '🩳', n: 'pyjamasshortsen' }],
      fotter: [{ e: '🧦', n: 'sockorna' }, { e: '🥿', n: 'tofflorna' }],
    },
  },
]

export default {
  id: 'kla-pa-nallen',
  titleSv: 'Klä på Nallen',
  icon: '🧸',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'kla-pa-nallen',
  voiceIntro: 'Hjälp nallen att klä på sig! Dra plaggen till rätt ställe.',

  init(ctx) {
    this._alive = true
    this._started = false
    this._idle = 0
    this._resolving = false
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._outfitIdx = (Math.random() * OUTFITS.length) | 0
    this._calls = []
    this._items = []
    this._rings = {}
    this._zones = {}
    this._parts = {}

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._build(ctx, false)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg (eller återuppbygg) en runda: ny outfit, scen, plagg-set och zoner.
  _build(ctx, announce = false) {
    if (!this._alive) return
    this._teardown()

    this._resolving = false
    this._idle = 0
    this._filled = new Set()
    this._items = []
    this._rings = {}
    this._zones = {}
    this._parts = {}
    this._calls = []

    const outfit = OUTFITS[this._outfitIdx % OUTFITS.length]
    this._outfitIdx = (this._outfitIdx + 1) % OUTFITS.length // rotera för NÄSTA runda

    // Osynlig botten-yta som fångar tomma tryck mjukt (scenen släpper igenom).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      ctx.services.audio.sfx('soft')
    })
    this._root.addChild(bg)

    // Levande bakgrundsscen (varierar med outfiten).
    this._root.addChild(createScene(outfit.scene))

    // Mjuk markskugga under nallen (grundar henne på scenen).
    const platform = new Graphics().ellipse(BEAR_CX, 660, 236, 34).fill({ color: 0x16314a, alpha: 0.12 })
    platform.eventMode = 'none'
    this._root.addChild(platform)

    // Nallen.
    const bear = this._buildBear()
    this._root.addChild(bear)
    this._bear = bear
    bounceIn(bear, { duration: 0.5 })
    this._startBlink()

    // DJUP: fler plagg ju högre nivå (men aldrig fler än outfiten har).
    const nSlots = Math.max(2, Math.min(2 + this._level, outfit.slots.length))
    const slots = outfit.slots.slice(0, nSlots)
    this._activeSlots = slots
    this._remaining = slots.length

    // Träff-/snäpp-radie krymper när zonerna blir fler (närmast-vinner-logik i drag).
    const hr = nSlots >= 5 ? 86 : nSlots >= 4 ? 104 : 122

    // Hyll-positioner jämnt fördelade.
    const n = slots.length
    const x0 = 190
    const x1 = 1090
    const xs = slots.map((_, i) => (n === 1 ? 640 : Math.round(x0 + ((x1 - x0) * i) / (n - 1))))

    slots.forEach((slot, i) => {
      const [zx, zy] = SLOT_POS[slot]

      // Ledtråds-ring (mjuk dubbelring) på kroppsdelen.
      const ring = new Graphics()
        .circle(0, 0, RINGR)
        .stroke({ width: 5, color: COLORS.white, alpha: 0.5 })
        .circle(0, 0, RINGR - 13)
        .stroke({ width: 3, color: COLORS.white, alpha: 0.28 })
      ring.position.set(zx, zy)
      ring.eventMode = 'none'
      this._root.addChild(ring)
      this._rings[slot] = ring
      bounceIn(ring, { delay: 0.05 * i, duration: 0.4 })

      // Osynlig snäppzon (generös träffyta för tap-tap).
      const zone = new Container()
      zone.position.set(zx, zy)
      zone.hitArea = new Circle(0, 0, hr)
      zone.eventMode = 'static'
      zone.cursor = 'pointer'
      this._root.addChild(zone)
      this._zones[slot] = zone
      this._drag.addTarget(zone, (d) => d.slot === slot, { hitRadius: hr + 26 })

      // Själva klädesplagget i full storlek på hyllan (ingen bricka/ram bakom).
      const g = randomFrom(outfit.garments[slot])
      const view = this._makeItem(g)
      view.position.set(xs[i], SHELF_Y)
      this._root.addChild(view)

      const item = { view, slot, name: g.n, placed: false }
      this._items.push(item)

      this._drag.addItem(
        view,
        { slot, emoji: g.e, name: g.n },
        {
          onSelect: () => {
            this._idle = 0
          },
          onWrong: (rec) => this._onWrong(ctx, rec),
          onCorrect: (rec) => this._onCorrect(ctx, rec, item),
        },
      )
      bounceIn(view, { delay: 0.08 * i })
    })

    this._cue = `Nu klär vi nallen i ${outfit.say}!`
    if (announce && this._started) ctx.services.voice.say(this._cue)
  },

  // En mysig, uttrycksfull nalle byggd av Pixi Graphics. Pivot i mitten så hela
  // nallen kan studsa och snurra runt sin egen mittpunkt.
  _buildBear() {
    const bear = new Container()
    bear.pivot.set(BEAR_CX, BEAR_CY)
    bear.position.set(BEAR_CX, BEAR_CY)
    bear.eventMode = 'none'
    bear.interactiveChildren = false

    const part = (x, y) => {
      const c = new Container()
      c.position.set(x, y)
      return c
    }

    // Fötter.
    const feet = part(...SLOT_POS.fotter)
    for (const fx of [-64, 64]) {
      feet.addChild(new Graphics().ellipse(fx, 0, 50, 40).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
      feet.addChild(new Graphics().ellipse(fx, 9, 24, 14).fill(lighten(BEAR, 0.42)))
    }

    // Ben.
    const legs = part(...SLOT_POS.ben)
    for (const lx of [-44, 44]) {
      legs.addChild(new Graphics().roundRect(lx - 28, -34, 56, 80, 26).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
    }

    // Kropp (armar bakom, mage framför).
    const body = part(...SLOT_POS.kropp)
    for (const ax of [-106, 106]) {
      body.addChild(new Graphics().ellipse(ax, 8, 32, 66).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
    }
    body.addChild(new Graphics().roundRect(-112, -108, 224, 216, 72).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
    body.addChild(new Graphics().ellipse(0, 16, 72, 80).fill({ color: lighten(BEAR, 0.45), alpha: 0.9 }))

    // Hals (liten nack-nubb som scarf-mål).
    const neck = part(...SLOT_POS.hals)
    neck.addChild(new Graphics().ellipse(0, 6, 48, 34).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))

    // Tassar (möts i knät — vantar/paraply-mål).
    const paws = part(...SLOT_POS.hander)
    for (const px of [-52, 52]) {
      paws.addChild(new Graphics().circle(px, 0, 30).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
      paws.addChild(new Graphics().ellipse(px, 4, 15, 11).fill(lighten(BEAR, 0.42)))
    }

    // Huvud (öron, kinder, nos, glad mun, ögonbryn) + blinkande ögon.
    const head = part(...SLOT_POS.huvud)
    for (const ex of [-62, 62]) {
      head.addChild(new Graphics().circle(ex, -74, 34).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
      head.addChild(new Graphics().circle(ex, -74, 17).fill(lighten(BEAR, 0.42)))
    }
    head.addChild(new Graphics().circle(0, 0, 92).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
    for (const cx of [-54, 54]) {
      head.addChild(new Graphics().ellipse(cx, 24, 20, 13).fill({ color: COLORS.pink, alpha: 0.5 }))
    }
    head.addChild(new Graphics().ellipse(0, 38, 46, 34).fill(lighten(BEAR, 0.5)))
    head.addChild(new Graphics().ellipse(0, 26, 15, 10).fill(EYE))
    head.addChild(new Graphics().arc(0, 34, 20, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 6, color: EYE, cap: 'round' }))
    for (const bx of [-36, 36]) {
      head.addChild(new Graphics().arc(bx, -24, 12, 1.12 * Math.PI, 1.88 * Math.PI).stroke({ width: 4, color: BEAR_DARK, alpha: 0.7, cap: 'round' }))
    }
    // Ögon i en egen container (pivot på ögonlinjen) så blinkningen squashar på plats.
    const eyes = new Container()
    eyes.position.set(0, -6)
    for (const ex of [-36, 36]) {
      eyes.addChild(new Graphics().circle(ex, 0, 12).fill(EYE))
      eyes.addChild(new Graphics().circle(ex - 4, -4, 4.5).fill(COLORS.white))
    }
    head.addChild(eyes)
    this._eyes = eyes

    bear.addChild(feet, legs, body, neck, paws, head)
    this._parts = { huvud: head, hals: neck, kropp: body, hander: paws, ben: legs, fotter: feet }
    return bear
  },

  // Ett plagg = SJÄLVA klädesplagget i full storlek (ingen bricka/ram/skugga bakom),
  // bara den stora emoji-konsten. Osynlig, generös träffyta (>=96px) + hit-halo.
  _makeItem(g) {
    const it = new Container()
    const e = new Text({ text: g.e, style: { fontFamily: FONT.body, fontSize: 116 } })
    e.anchor.set(0.5)
    it.addChild(e)
    it._art = e
    it.hitArea = { contains: (px, py) => px * px + py * py <= 80 * 80 } // osynlig hit-halo (160px)
    return it
  },

  // Rätt plats: plagget har snäppts till zonen (DragController flyttade det).
  _onCorrect(ctx, rec, item) {
    if (!this._alive || item.placed) return
    item.placed = true
    this._idle = 0
    const slot = item.slot
    const [zx, zy] = SLOT_POS[slot]

    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(randomFrom([`${cap(item.name)} sitter!`, 'Vad fin!', 'Så mysigt!', 'Bra jobbat!', 'Så fin du gör nallen!']))

    // Klä nallen: flytta in plagget i nallens container (så det studsar/snurrar med
    // henne) och skala/justera det så det PASSAR rätt kroppsdel — nallen bär nu plagget.
    // (Tweens på vyn dödas av this._drag.clear() i _teardown innan vyn förstörs.)
    const v = rec.view
    if (v && !v.destroyed) {
      v.eventMode = 'none'
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      if (this._bear && !this._bear.destroyed) this._bear.addChild(v)
      const fit = WORN[slot] || { scale: 1, dx: 0, dy: 0 }
      // Snäpp på kroppsdelen med en mjuk passforms-studs (DragController har redan
      // flyttat vyn till slot-mitten i nallens 1:1-rymd).
      v.position.set(zx, zy)
      gsap.to(v, { x: zx + fit.dx, y: zy + fit.dy, duration: 0.22, ease: 'back.out(1.5)' })
      v.scale.set(fit.scale * 0.7)
      gsap.to(v.scale, { x: fit.scale, y: fit.scale, duration: 0.28, ease: 'back.out(2)' })
    }

    // Nallen reagerar: kroppsdelen poppar + en liten glad studs.
    const partC = this._parts[slot]
    if (partC) pop(partC)
    this._bearReact()

    // Juice på droppunkten.
    sparkle(ctx.fxLayer, zx, zy, { count: 8 })
    ripple(ctx.fxLayer, zx, zy, { color: COLORS.white, maxR: 96, width: 5, alpha: 0.6 })
    floatText(ctx.fxLayer, zx, zy - 54, randomFrom(['💛', '⭐', '✨', '🌟', '😊']), { fontSize: 52 })

    const ring = this._rings[slot]
    if (ring && !ring.destroyed) ring.visible = false

    this._filled.add(slot)
    this._remaining -= 1
    if (this._remaining <= 0) this._roundComplete(ctx)
  },

  // Fel plats: aldrig en bestraffning. Mjuk vingel + ring + vänlig talad ledtråd.
  _onWrong(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    if (rec.view) {
      wiggle(rec.view)
      ripple(ctx.fxLayer, rec.view.x, rec.view.y, { color: COLORS.white, maxR: 70, width: 4, alpha: 0.45 })
    }
    if (Math.random() < 0.5) {
      ctx.services.voice.say(`${cap(rec.data.name)} ska sitta ${SLOT_PHRASE[rec.data.slot]}!`)
    }
  },

  // En liten glad studs (translation, ej skala — krockar inte med popp/snurr).
  _bearReact() {
    const b = this._bear
    if (!b || b.destroyed) return
    gsap.to(b, { y: BEAR_CY - 14, duration: 0.13, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' })
  },

  // Hela outfiten sitter: nallen snurrar glatt, gnist-svep, delat firande
  // (progress.complete: ljud + beröm + konfetti + stjärna + klistermärke — INTE
  // duplicerat här) + mjuk skakning, sedan ny varierad runda.
  _roundComplete(ctx) {
    this._resolving = true
    this._idle = 0
    this._stopHint()

    const b = this._bear
    if (b && !b.destroyed) {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      b.rotation = 0
      b.y = BEAR_CY
      gsap
        .timeline()
        .to(b.scale, { x: 1.12, y: 1.12, duration: 0.2, ease: 'back.out(2)' })
        .to(b, { rotation: Math.PI * 2, duration: 0.75, ease: 'back.inOut(1.4)' }, '<')
        .to(b.scale, { x: 1, y: 1, duration: 0.28, ease: 'power2.out' })
        .add(() => {
          if (this._alive && b && !b.destroyed) b.rotation = 0
        })
    }

    // Gnist-svep över den påklädda nallen.
    this._activeSlots.forEach((slot, i) => {
      const [zx, zy] = SLOT_POS[slot]
      const c = gsap.delayedCall(0.06 * i, () => {
        if (this._alive) sparkle(ctx.fxLayer, zx, zy, { count: 6 })
      })
      this._calls.push(c)
    })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)

    const c1 = gsap.delayedCall(0.45, () => {
      if (!this._alive) return
      ctx.progress.complete()
      shake(this._root, { intensity: 5, duration: 0.5 })
      // Mysig nalle-fras (sägs efter complete så den hörs över beröm-ljudet).
      ctx.services.voice.say(randomFrom(['Nallen är klar! Så fin nalle!', 'Titta vad fin nallen blev!', 'Nu är nallen varm och glad!']))
    })
    const c2 = gsap.delayedCall(1.9, () => {
      if (!this._alive) return
      this._build(ctx, true)
    })
    this._calls.push(c1, c2)
  },

  // Lugn idle-lockelse: efter ~6 s utan handling — namnge ett kvarvarande plagg,
  // låt det "andas" och pulsera dess ring.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      this._stopHint()
      const pending = this._items.filter((it) => !it.placed && it.view && !it.view.destroyed)
      if (pending.length) {
        const it = randomFrom(pending)
        ctx.services.voice.say(`Dra ${it.name} ${SLOT_PHRASE[it.slot]}!`)
        this._hintView = it.view
        this._hintTween = breathe(it.view, { scale: 1.1, duration: 0.7 })
        const ring = this._rings[it.slot]
        if (ring && !ring.destroyed) pop(ring)
      }
    }
  },

  _stopHint() {
    if (this._hintTween) {
      this._hintTween.kill()
      this._hintTween = null
    }
    const v = this._hintView
    if (v && !v.destroyed) {
      gsap.killTweensOf(v.scale)
      v.scale.set(1)
    }
    this._hintView = null
  },

  _startBlink() {
    this._stopBlink()
    const blink = () => {
      if (!this._alive || !this._eyes || this._eyes.destroyed) return
      gsap.killTweensOf(this._eyes.scale)
      gsap.to(this._eyes.scale, {
        y: 0.12,
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut',
        onComplete: () => {
          if (this._alive && this._eyes && !this._eyes.destroyed) this._eyes.scale.y = 1
        },
      })
      this._blinkCall = gsap.delayedCall(2 + Math.random() * 3.5, blink)
    }
    this._blinkCall = gsap.delayedCall(1.5 + Math.random() * 2.5, blink)
  },

  _stopBlink() {
    if (this._blinkCall) {
      this._blinkCall.kill()
      this._blinkCall = null
    }
    if (this._eyes && !this._eyes.destroyed) {
      gsap.killTweensOf(this._eyes.scale)
      this._eyes.scale.set(1)
    }
  },

  // Riv föregående runda (exit-/rebuild-säkert): döda ALLA tweens på spårade objekt
  // medan de fortfarande lever, avregistrera drag-lyssnare, förstör sedan vyerna.
  _teardown() {
    this._stopHint()
    this._stopBlink()
    if (this._calls) {
      this._calls.forEach((c) => c?.kill())
      this._calls = []
    }
    if (this._bear && !this._bear.destroyed) {
      gsap.killTweensOf(this._bear)
      gsap.killTweensOf(this._bear.scale)
    }
    for (const k of Object.keys(this._parts || {})) {
      const p = this._parts[k]
      if (p && !p.destroyed) {
        gsap.killTweensOf(p)
        gsap.killTweensOf(p.scale)
      }
    }
    for (const k of Object.keys(this._rings || {})) {
      const r = this._rings[k]
      if (r && !r.destroyed) {
        gsap.killTweensOf(r)
        gsap.killTweensOf(r.scale)
      }
    }
    // Avregistrerar drag-lyssnare + dödar item-tweens (medan vyerna lever).
    this._drag?.clear()
    if (this._root) {
      this._root.removeChildren().forEach((o) => o.destroy({ children: true }))
    }
    this._bear = null
    this._eyes = null
    this._parts = {}
    this._rings = {}
    this._zones = {}
    this._items = []
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    this._teardown()
    this._drag?.destroy()
    this._drag = null
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
  },
}

function cap(s = '') {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function lighten(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}
