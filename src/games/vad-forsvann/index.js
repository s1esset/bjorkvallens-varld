// Vad Försvann? — en lugn minneslek (3–5 år). Några gulliga saker studsar in,
// barnet tittar i lugn takt och trycker på en stor "Göm dem!"-knapp. En mjuk
// filt glider över sakerna, EN sak försvinner i smyg, och filten glider undan
// igen — en tom platshållare lyser där saken fanns. Barnet trycker på den tomma
// platsen → saken studsar tillbaka, säger sitt namn, gnistror + beröm. Tryck på
// en sak som syns = lekfull vingel + mjuk vink, aldrig ett "fel". Ingen poäng,
// ingen timer, inget slut. Allt ritas programmatiskt (Pixi Graphics + emoji).
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'

// Saker som slumpas per runda (renderas som stora emoji-Text på rutor).
const MOTIFS = ['🍎', '🐶', '⭐', '🚗', '🌸', '🧸', '🎈', '🍌', '🐱', '🦋', '🍓', '🎩', '🐸', '⚽', '🌈', '🍰']

// Emoji -> svenskt ord (bestämd form) så rösten blir korrekt: "Det var ju äpplet!".
const NAMES = {
  '🍎': 'äpplet', '🐶': 'hunden', '⭐': 'stjärnan', '🚗': 'bilen', '🌸': 'blomman',
  '🧸': 'nallen', '🎈': 'ballongen', '🍌': 'bananen', '🐱': 'katten', '🦋': 'fjärilen',
  '🍓': 'jordgubben', '🎩': 'hatten', '🐸': 'grodan', '⚽': 'bollen', '🌈': 'regnbågen', '🍰': 'tårtan',
}

// Svårigheten växer via fler saker (3→6) och 2-radsuppställning på sista nivån.
// Antalet "som försvinner" är alltid 1 (passar 3–5 år). Layoutsiffror = designkoord.
const LEVELS = [
  { count: 3, cols: 3, rows: 1, cellW: 200, gap: 60, startX: 380, startY: 400 },
  { count: 4, cols: 4, rows: 1, cellW: 190, gap: 44, startX: 289, startY: 400 },
  { count: 5, cols: 5, rows: 1, cellW: 180, gap: 30, startX: 220, startY: 400 },
  { count: 6, cols: 3, rows: 2, cellW: 190, gap: 50, startX: 400, startY: 290, rowStep: 240 },
]

const HALF = 95 // halv cell -> generös träffyta (190px ≫ 96px minimum)

export default {
  id: 'vad-forsvann',
  titleSv: 'Vad Försvann?',
  icon: '🔍',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vad-forsvann',
  voiceIntro: 'Titta noga på sakerna! Snart försvinner en — vilken?',

  init(ctx) {
    this._alive = true
    this._timers = []
    this._idle = 0
    this._phase = 'show' // show | covering | answer | resolved
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg en runda: städa gammalt, slumpa saker, lägg ut rutnät, skapa knapp,
  // studsa in sakerna. Talar INTE — anroparen (mount/_newRound) styr rösten.
  _build(ctx) {
    if (!this._alive) return
    this._killTimers()
    this._killSceneTweens()
    this._root.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._slots = []
    this._blanket = null
    this._missing = null
    this._busy = false
    this._errored = false
    this._idle = 0
    this._phase = 'show'

    const lvl = LEVELS[this._level]
    const motifs = shuffle(MOTIFS).slice(0, lvl.count)
    const positions = layout(lvl)

    motifs.forEach((motif, i) => {
      const slot = this._makeSlot(ctx, motif)
      slot.position.set(positions[i].x, positions[i].y)
      this._root.addChild(slot)
      this._slots.push(slot)
      slot.scale.set(0)
      gsap.to(slot.scale, {
        x: 1, y: 1, duration: 0.34, delay: 0.05 + i * 0.08, ease: 'back.out(1.7)',
        onStart: () => { if (this._alive) ctx.services.audio.sfx('pop') },
      })
    })

    // "Göm dem!"-knapp: barnet styr tempot själv (ingen press). Syns i visa-fasen.
    this._button = new Button({
      label: 'Göm dem!', icon: '🙈', width: 300, height: 92, color: COLORS.orange,
      services: ctx.services, sound: 'tap', onTap: () => this._hide(ctx),
    })
    this._button.position.set(640, 650)
    this._root.addChild(this._button)
    this._button.scale.set(0)
    gsap.to(this._button.scale, { x: 1, y: 1, duration: 0.4, delay: 0.05 + lvl.count * 0.08, ease: 'back.out(1.7)' })
  },

  // En slot = tryckbar Container med emoji-Text + (dold) tom platshållare.
  _makeSlot(ctx, motif) {
    const slot = new Container()
    slot._motif = motif
    slot._isGap = false

    const placeholder = makePlaceholder()
    placeholder.visible = false
    const emoji = new Text({ text: motif, style: { fontFamily: FONT.body, fontSize: 110, align: 'center' } })
    emoji.anchor.set(0.5)
    emoji.eventMode = 'none'

    slot.addChild(placeholder, emoji)
    slot._placeholder = placeholder
    slot._emoji = emoji

    slot.eventMode = 'static'
    slot.cursor = 'pointer'
    slot.hitArea = new Rectangle(-HALF, -HALF, HALF * 2, HALF * 2) // ≫ 96px + hit-halo
    slot.on('pointertap', () => this._onTap(ctx, slot))
    return slot
  },

  // Knappens onTap: visa-fas -> täck-fas. Filten glider in över sakerna.
  _hide(ctx) {
    if (!this._alive || this._busy || this._phase !== 'show') return
    this._busy = true
    this._phase = 'covering'
    this._idle = 0

    // Göm knappen (den hör hemma i visa-fasen).
    const btn = this._button
    if (btn) {
      btn.setEnabled(false)
      gsap.to(btn, { alpha: 0, duration: 0.2, onComplete: () => { if (btn && !btn.destroyed) btn.visible = false } })
    }

    // Filten täcker hela rutnätet + 40px marginal. Startar utanför skärmen till höger.
    const b = bounds(this._slots)
    const blanket = makeBlanket(b.w, b.h)
    blanket.position.set(1280 + 60, b.top)
    this._root.addChild(blanket)
    this._blanket = blanket

    ctx.services.audio.sfx('whoosh')
    gsap.to(blanket, {
      x: b.left, duration: 0.5, ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) return
        this._later(0.8, () => this._removeOne(ctx, blanket))
      },
    })
  },

  // Bakom filten: göm EN slumpvald sak, visa platshållare, glid undan filten.
  _removeOne(ctx, blanket) {
    if (!this._alive) return
    const slot = randomFrom(this._slots)
    this._missing = slot
    slot._isGap = true
    slot._emoji.visible = false
    slot._placeholder.visible = true
    this._errored = false

    ctx.services.audio.sfx('reveal')
    gsap.to(blanket, {
      x: 1280 + 60, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        if (!this._alive) return
        if (!blanket.destroyed) blanket.destroy({ children: true })
        if (this._blanket === blanket) this._blanket = null
        this._phase = 'answer'
        this._busy = false
        this._idle = 0
        ctx.services.voice.say('Vad försvann? Tryck på den tomma platsen!')
        pop(slot) // liten puls på den tomma platsen
      },
    })
  },

  // Tap på en slot.
  _onTap(ctx, slot) {
    if (!this._alive || this._busy) return
    this._idle = 0

    // Visa-fasen: en lekfull poke (alltid feedback < 100ms), ingen rundlogik.
    if (this._phase === 'show') {
      ctx.services.audio.sfx('pop')
      pop(slot)
      return
    }
    if (this._phase !== 'answer') return

    if (slot._isGap) {
      // RÄTT: saken studsar tillbaka, säger sitt namn, gnistror + beröm.
      this._busy = true
      this._phase = 'resolved'
      ctx.services.audio.sfx('correct')
      slot._placeholder.visible = false
      slot._emoji.visible = true
      bounceIn(slot._emoji)
      pop(slot)
      const gp = ctx.fxLayer.toLocal(slot.getGlobalPosition())
      sparkle(ctx.fxLayer, gp.x, gp.y)
      const namn = NAMES[slot._motif] || 'den'
      ctx.services.voice.say(`Ja! Det var ju ${namn}! ${randomFrom(PRAISE)}`)

      // Spara framsteg + höj nivå + delat firande (en gång).
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      this._level = clampLevel(this._level + 1)
      ctx.progress.setLevel(this._level)
      ctx.progress.complete()
      this._later(1.4, () => this._newRound(ctx))
    } else {
      // FEL: aldrig bestraffning — lekfull vingel + mjukt ljud + mild vink (1:a ggn).
      ctx.services.audio.sfx('soft')
      wiggle(slot)
      if (!this._errored) {
        this._errored = true
        ctx.services.voice.say('Den är ju kvar! Vilken sak syns inte?')
      }
    }
  },

  _newRound(ctx) {
    if (!this._alive) return
    this._build(ctx)
    ctx.services.voice.say(this.voiceIntro)
  },

  // Idle ~6s: locka vänligt vidare beroende på fas (aldrig press).
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle < 6) return
    this._idle = 0
    if (this._phase === 'answer' && this._missing) {
      ctx.services.voice.say('Titta igen — vad är borta? Tryck på den tomma platsen!')
      pop(this._missing)
    } else if (this._phase === 'show' && this._button && this._button.visible) {
      ctx.services.voice.say('Tryck på Göm dem! när du har tittat klart.')
      pop(this._button)
    }
  },

  // Schemalägg en guardad fördröjd callback (samlas så destroy/_build kan döda dem).
  _later(delay, fn) {
    const c = gsap.delayedCall(delay, () => { if (this._alive) fn() })
    this._timers.push(c)
    return c
  },

  _killTimers() {
    this._timers?.forEach((t) => t.kill())
    this._timers = []
  },

  // Döda alla tweens på nuvarande scen-objekt innan de förstörs (exit-säkert).
  _killSceneTweens() {
    this._slots?.forEach((s) => {
      gsap.killTweensOf(s)
      gsap.killTweensOf(s.scale)
      if (s._emoji) gsap.killTweensOf(s._emoji.scale)
    })
    if (this._button) {
      gsap.killTweensOf(this._button)
      gsap.killTweensOf(this._button.scale)
    }
    if (this._blanket) gsap.killTweensOf(this._blanket)
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._killTimers()
    this._killSceneTweens()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel?.()
    this._root?.destroy({ children: true })
  },
}

// --- rena hjälpare (ingen this-/ctx-bindning) ---

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}

// Cellpositioner (center) för en nivå.
function layout(lvl) {
  const out = []
  const stepX = lvl.cellW + lvl.gap
  const stepY = lvl.rowStep || lvl.cellW + lvl.gap
  for (let i = 0; i < lvl.count; i++) {
    const col = i % lvl.cols
    const row = Math.floor(i / lvl.cols)
    out.push({ x: lvl.startX + col * stepX, y: lvl.startY + row * stepY })
  }
  return out
}

// Filtens täckyta utifrån sakernas positioner (+ halv cell + 40px marginal).
function bounds(slots) {
  const margin = 40
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const s of slots) {
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x)
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y)
  }
  const pad = HALF + margin
  return { left: minX - pad, top: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

// Tom, ljus platshållare: rundad cirkel (cream) med blek kant + blekt "❔".
function makePlaceholder() {
  const c = new Container()
  const g = new Graphics().circle(0, 0, 80).fill(COLORS.cream).stroke({ width: 5, color: COLORS.inkSoft, alpha: 0.5 })
  g.eventMode = 'none'
  const q = new Text({ text: '❔', style: { fontFamily: FONT.body, fontSize: 70 } })
  q.anchor.set(0.5)
  q.alpha = 0.4
  q.eventMode = 'none'
  c.addChild(g, q)
  return c
}

// Mjuk filt: rundad lila rektangel (lokalt origo 0,0) med ljus kant + 🧺-motiv.
function makeBlanket(w, h) {
  const c = new Container()
  const g = new Graphics().roundRect(0, 0, w, h, 40).fill({ color: COLORS.purple, alpha: 0.95 }).stroke({ width: 6, color: 0xffffff, alpha: 0.8 })
  const motif = new Text({ text: '🧺', style: { fontFamily: FONT.body, fontSize: 96 } })
  motif.anchor.set(0.5)
  motif.position.set(w / 2, h / 2)
  motif.eventMode = 'none'
  c.addChild(g, motif)
  c.eventMode = 'static' // absorberar tryck medan filten täcker
  return c
}
