// Klä på Nallen — dra-och-släpp (3–5 år). En glad nalle i mitten väntar på sina
// plagg. Barnet drar (eller tap-tap:ar via DragController) mössa/tröja/stövlar till
// rätt kroppsdel. Rätt plats → plagget snäpper fast, blir en del av nallen, glad röst
// + gnistror. Fel plats → mjuk vingel och snäpp tillbaka (aldrig en bestraffning).
// När alla plagg sitter → nallen hoppar till, firande (delat complete) + ny runda.
// Allt ritas programmatiskt (Pixi Graphics + emoji) — inga externa filer.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

const SHELF_Y = 660 // plagghyllans y (designkoordinater)

// Nallens färger.
const BEAR = 0xb07a4a
const BEAR_DARK = 0x8a5e34
const EYE = 0x3a2a1a

// Snäppzonernas centrum (= drop-targets, hela kroppsdelen).
const ZONES = {
  huvud: [640, 235],
  kropp: [640, 410],
  fotter: [640, 560],
}

// Plagg per kroppsdel. emoji = bilden, name = svensk benämning (för röstberöm).
const CLOTHES = {
  huvud: [
    { emoji: '🧢', name: 'mössan' },
    { emoji: '🎩', name: 'hatten' },
    { emoji: '👒', name: 'solhatten' },
  ],
  kropp: [
    { emoji: '👕', name: 'tröjan' },
    { emoji: '🧥', name: 'jackan' },
    { emoji: '👚', name: 'blusen' },
  ],
  fotter: [
    { emoji: '🥾', name: 'stövlarna' },
    { emoji: '👟', name: 'skorna' },
    { emoji: '🧦', name: 'sockorna' },
  ],
}

export default {
  id: 'kla-pa-nallen',
  titleSv: 'Klä på Nallen',
  icon: '🧸',
  category: 'drag',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'kla-pa-nallen',
  voiceIntro: 'Hjälp nallen att klä på sig! Dra mössan på huvudet.',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._items = []
    this._filled = new Set()
    this._activeSlots = []

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._buildScene(ctx)
    this._buildBear()
    this._buildZones()

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bakgrund (fångar tomma tryck mjukt) + en lugn "matta" under nallen.
  _buildScene(ctx) {
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      ctx.services.audio.sfx('soft')
    })
    this._root.addChild(bg)

    const rug = new Graphics().ellipse(640, 605, 360, 80).fill({ color: 0xeadfca, alpha: 0.7 })
    rug.eventMode = 'none'
    this._root.addChild(rug)
  },

  // Nallen byggd av Pixi Graphics, i en container på (0,0) så hela nallen kan hoppa.
  _buildBear() {
    const bear = new Container()
    bear.position.set(0, 0)
    bear.eventMode = 'none' // kroppsdelar är passiva; osynliga zoner sköter tap-tap
    this._bear = bear
    this._root.addChild(bear)

    // Fötter (bakom kroppen så de tittar fram).
    const feet = this._partContainer(...ZONES.fotter)
    for (const fx of [-55, 55]) {
      feet.addChild(new Graphics().ellipse(fx, 0, 48, 38).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
      feet.addChild(new Graphics().ellipse(fx, 8, 22, 15).fill(lighten(BEAR, 0.42)))
    }

    // Kropp/mage.
    const body = this._partContainer(...ZONES.kropp)
    body.addChild(new Graphics().roundRect(-100, -100, 200, 200, 60).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
    body.addChild(new Graphics().ellipse(0, 18, 66, 72).fill({ color: lighten(BEAR, 0.45), alpha: 0.9 }))

    // Huvud (öron, ögon, nos, glad mun).
    const head = this._partContainer(640, 250)
    for (const ex of [-60, 60]) {
      head.addChild(new Graphics().circle(ex, -70, 34).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
      head.addChild(new Graphics().circle(ex, -70, 17).fill(lighten(BEAR, 0.42)))
    }
    head.addChild(new Graphics().circle(0, 0, 90).fill(BEAR).stroke({ width: 8, color: BEAR_DARK }))
    head.addChild(new Graphics().ellipse(0, 34, 40, 30).fill(lighten(BEAR, 0.5)))
    head.addChild(new Graphics().ellipse(0, 22, 13, 9).fill(EYE))
    head.addChild(new Graphics().arc(0, 30, 22, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 6, color: EYE, cap: 'round' }))
    for (const ex of [-34, 34]) {
      head.addChild(new Graphics().circle(ex, -8, 11).fill(EYE))
      head.addChild(new Graphics().circle(ex - 3, -11, 4).fill(COLORS.white))
    }

    bear.addChild(feet, body, head)
    this._parts = { huvud: head, kropp: body, fotter: feet }
  },

  _partContainer(x, y) {
    const c = new Container()
    c.position.set(x, y)
    c.eventMode = 'none'
    return c
  },

  // Tre osynliga snäppzoner + svaga ledtråds-ringar, en gång (återanvänds per runda).
  _buildZones() {
    this._zones = {}
    this._rings = {}
    for (const key of Object.keys(ZONES)) {
      const [zx, zy] = ZONES[key]
      const ring = new Graphics().circle(0, 0, 72).stroke({ width: 5, color: COLORS.white, alpha: 0.35 })
      ring.position.set(zx, zy)
      ring.eventMode = 'none'
      ring.visible = false
      this._root.addChild(ring)
      this._rings[key] = ring

      const zone = new Container()
      zone.position.set(zx, zy)
      zone.hitArea = new Circle(0, 0, 120) // generös träffyta för tap-tap
      zone.eventMode = 'static'
      zone.cursor = 'pointer'
      this._root.addChild(zone)
      this._zones[key] = zone
    }
  },

  // En plagg-bricka: vit rund cirkel + emoji. Hela cirkeln (Ø144) är träffyta.
  _makeItem(emoji) {
    const it = new Container()
    const tray = new Graphics().circle(0, 0, 72).fill({ color: COLORS.white, alpha: 0.9 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 92 } })
    e.anchor.set(0.5)
    it.addChild(tray, e)
    return it
  },

  // Bygg en runda: bestäm plagg-set utifrån nivå, registrera targets + items.
  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._idle = 0
    this._filled = new Set()

    // Rensa förra rundans plagg (även fastsatta — de ligger nu i this._bear).
    // clear() först (avregistrerar lyssnare + dödar tweens medan vyerna lever), sedan destroy.
    this._drag.clear()
    for (const v of this._items) {
      if (!v.destroyed) v.destroy({ children: true })
    }
    this._items = []
    for (const k of Object.keys(this._rings)) this._rings[k].visible = false

    const three = this._level >= 2
    const slots = three ? ['huvud', 'kropp', 'fotter'] : ['huvud', 'fotter']
    const xs = three ? [320, 640, 960] : [430, 850]
    this._activeSlots = slots
    this._remaining = slots.length

    slots.forEach((slot, i) => {
      this._drag.addTarget(this._zones[slot], (data) => data.slot === slot, { hitRadius: 150 })

      const ring = this._rings[slot]
      ring.visible = true
      ring.alpha = 0.35
      ring.scale.set(1)

      const variant = randomFrom(CLOTHES[slot])
      const view = this._makeItem(variant.emoji)
      view.position.set(xs[i], SHELF_Y)
      this._root.addChild(view)
      this._items.push(view)

      this._drag.addItem(
        view,
        { slot, emoji: variant.emoji, name: variant.name },
        {
          onSelect: () => {
            this._idle = 0
          },
          onWrong: (rec) => {
            if (!this._alive) return
            this._idle = 0
            wiggle(rec.view)
          },
          onCorrect: (rec) => this._onCorrect(ctx, rec),
        },
      )
      bounceIn(view, { delay: 0.06 * i })
    })
  },

  // Rätt plats: snäppt på (DragController har redan flyttat plagget till zonen).
  _onCorrect(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    const { slot, name } = rec.data

    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(randomFrom([`${cap(name)} sitter!`, 'Vad fin!', 'Så mysigt!', 'Bra jobbat!']))

    const part = this._parts[slot]
    if (part) pop(part)
    const z = this._zones[slot]
    sparkle(ctx.fxLayer, z.x, z.y)

    // "Fäst" plagget på nallen: flytta in i this._bear så det hoppar med och blir passivt.
    rec.view.eventMode = 'none'
    if (this._bear && !this._bear.destroyed && !rec.view.destroyed) this._bear.addChild(rec.view)

    this._filled.add(slot)
    this._rings[slot].visible = false
    this._remaining -= 1
    if (this._remaining <= 0) this._roundComplete(ctx)
  },

  // Alla plagg sitter: nallen hoppar, delat firande (ljud + konfetti + stjärna +
  // klistermärke via complete), mysig fras, sedan ny runda.
  _roundComplete(ctx) {
    this._resolving = true
    this._idle = 0

    gsap.killTweensOf(this._bear)
    gsap.to(this._bear, { y: -28, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke
    // Mysig nalle-fras (sägs efter complete så den hörs).
    ctx.services.voice.say(randomFrom(['Nallen är klar! Så fin nalle!', 'Nu är nallen varm och glad!']))

    this._celebrate = gsap.delayedCall(1.3, () => this._newRound(ctx))
  },

  // Idle-recue: efter ~6 s utan handling — upprepa, och pulsera väntande zoner.
  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say('Dra ett plagg på nallen!')
      for (const slot of this._activeSlots) {
        if (!this._filled.has(slot)) pop(this._rings[slot])
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._celebrate?.kill()
    this._drag?.destroy()
    if (this._bear) gsap.killTweensOf(this._bear)
    for (const k of Object.keys(this._parts || {})) {
      const p = this._parts[k]
      gsap.killTweensOf(p)
      gsap.killTweensOf(p.scale)
    }
    for (const k of Object.keys(this._rings || {})) {
      gsap.killTweensOf(this._rings[k])
      gsap.killTweensOf(this._rings[k].scale)
    }
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
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
