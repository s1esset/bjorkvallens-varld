// Vad Försvann? — en lugn minneslek (3–5 år). Några gulliga saker studsar in,
// barnet tittar i lugn takt och trycker på en stor "Göm dem!"-knapp. En mjuk
// filt glider över sakerna, EN sak försvinner i smyg, och filten glider undan
// igen — en tom platshållare lyser där saken fanns. NU måste barnet komma ihåg
// VILKEN sak som försvann: en rad svarskort dyker upp nedtill (den borta saken +
// ett par "lurar" bland de som fortfarande syns). Barnet trycker på rätt kort →
// saken studsar tillbaka på sin plats, säger sitt namn, gnistror + beröm. Fel
// kort = lekfull vingel + mjukt ljud + ny mild ledtråd (ALDRIG ett "fel"); efter
// ett par försök (eller om barnet väntar) lyser rätt kort upp och väljs till slut
// så det aldrig kan misslyckas. Ingen poäng, ingen timer, inget slut. Allt ritas
// programmatiskt (Pixi Graphics + emoji).
// Uppgiftstypen varieras (_mode): 'gone' = en sak försvinner (grund), 'added' = en
// NY sak dyker upp bakom filten och barnet väljer vilken som är ny — samma
// kort-svarsmekanik, men bryter den strukturellt identiska rundan.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, breathe, ripple } from '../../lib/feedback.js'
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

// Emoji -> ev. riktigt sak-läte (spelas ovanpå namn-TTS via audio.sample). Saknas
// klippet faller det tyst bort (sample() returnerar false) — helt ofarligt.
const SAMPLES = {
  '🐶': 'djur_hund', '🐱': 'djur_katt', '🐸': 'djur_groda', '🚗': 'bil_tut',
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
    ctx.services.voice.say(this._introLine())
  },

  // Talad intro beror på uppgiftstypen (satt i _build).
  _introLine() {
    return this._mode === 'added'
      ? 'Titta noga på sakerna! Snart dyker en ny sak upp — vilken?'
      : 'Titta noga på sakerna! Snart försvinner en — vilken?'
  },

  // Bygg en runda: städa gammalt, slumpa saker, lägg ut rutnät, skapa knapp,
  // studsa in sakerna. Talar INTE — anroparen (mount/_newRound) styr rösten.
  _build(ctx) {
    if (!this._alive) return
    this._killTimers()
    this._killSceneTweens()
    this._root.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._slots = []
    this._choices = []
    this._choiceLayer = null
    this._blanket = null
    this._missing = null
    this._busy = false
    this._misses = 0
    this._helped = false
    this._resolving = false
    this._idle = 0
    this._idleNudges = 0
    this._phase = 'show'

    // Varierad uppgiftstyp bryter den strukturellt identiska rundan: 'gone' = en
    // sak försvinner (grund), 'added' = en NY sak dyker upp. De yngsta (nivå 0)
    // får alltid grundvarianten; från nivå 1 slumpas läget.
    this._mode = this._level === 0 ? 'gone' : (Math.random() < 0.5 ? 'added' : 'gone')
    this._newcomer = null

    const lvl = LEVELS[this._level]
    // Rutnätet bor i ett eget lager så vi kan glida upp det när svarskorten kommer.
    this._gridShift = lvl.rows > 1 ? 90 : 0
    this._gridLayer = new Container()
    this._root.addChild(this._gridLayer)

    const motifs = shuffle(MOTIFS).slice(0, lvl.count)
    const positions = layout(lvl)
    // I 'added'-läget är sista rutan "nykomlingen": den ligger gömd i visa-fasen
    // (ingen studs-in) och dyker fram bakom filten. Sista rutan -> luckan hamnar i
    // radens slut, inte som ett hål mitt bland sakerna.
    const newcomerIndex = this._mode === 'added' ? lvl.count - 1 : -1

    motifs.forEach((motif, i) => {
      const slot = this._makeSlot(ctx, motif)
      slot.position.set(positions[i].x, positions[i].y)
      this._gridLayer.addChild(slot)
      this._slots.push(slot)
      slot.scale.set(0)
      if (i === newcomerIndex) {
        this._newcomer = slot
        slot._emoji.visible = false // syns inte förrän den dyker upp bakom filten
        return
      }
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

  // Bakom filten: byt en sak i smyg. 'gone' -> göm en slumpvald sak (platshållare
  // fram). 'added' -> låt nykomlingen dyka upp. Glid sedan undan filten. Ett litet
  // "poff" (reveal + fallande ton) gör bytet trolskt medan filten täcker.
  _removeOne(ctx, blanket) {
    if (!this._alive) return
    let slot
    if (this._mode === 'added') {
      slot = this._newcomer
      slot._emoji.visible = true
      gsap.killTweensOf(slot.scale)
      slot.scale.set(1) // saken dyker upp bakom filten
    } else {
      slot = randomFrom(this._slots)
      slot._isGap = true
      slot._emoji.visible = false
      slot._placeholder.visible = true
    }
    this._missing = slot

    ctx.services.audio.sfx('reveal')
    ctx.services.audio.tone({ freq: 320, dur: 0.18, type: 'sine', vol: 0.18, slideTo: 150 }) // magiskt "poff"
    gsap.to(blanket, {
      x: 1280 + 60, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        if (!this._alive) return
        if (!blanket.destroyed) blanket.destroy({ children: true })
        if (this._blanket === blanket) this._blanket = null
        this._phase = 'answer'
        this._busy = false
        this._misses = 0
        this._helped = false
        this._idle = 0
        this._idleNudges = 0
        // Glid upp rutnätet (på 2-radsnivån) så svarskorten får plats nedtill.
        if (this._gridShift) gsap.to(this._gridLayer, { y: -this._gridShift, duration: 0.4, ease: 'power2.out' })
        pop(slot) // liten puls på platsen som ändrats
        // Magisk gnist-pluff där saken försvann/dök upp (nu synlig).
        const gp = ctx.fxLayer.toLocal(slot.getGlobalPosition())
        sparkle(ctx.fxLayer, gp.x, gp.y)
        this._showChoices(ctx)
        ctx.services.voice.say(this._askLine())
      },
    })
  },

  // Frågan i svarsfasen beror på uppgiftstypen.
  _askLine() {
    return this._mode === 'added'
      ? 'Vad är nytt? Tryck på saken som kom till!'
      : 'Vad försvann? Tryck på saken som är borta!'
  },

  // Visa svarsraden: rätt (borta) sak + ett par "lurar" bland de som SYNS kvar.
  // Eftersom lurarna fortfarande finns kvar uppe är den borta saken det enda
  // kortet som inte längre syns — ett äkta igenkännings-/minnesval (inte "tryck
  // på den tomma rutan"). Korten studsar in en efter en.
  _showChoices(ctx) {
    if (!this._alive || !this._missing) return
    const remaining = this._slots.filter((s) => s !== this._missing)
    const lureCount = Math.min(this._level >= 2 ? 3 : 2, remaining.length)
    const lures = shuffle(remaining.map((s) => s._motif)).slice(0, lureCount)
    const motifs = shuffle([this._missing._motif, ...lures])

    const layer = new Container()
    this._root.addChild(layer)
    this._choiceLayer = layer
    this._choices = []

    const positions = choiceLayout(motifs.length)
    motifs.forEach((motif, i) => {
      const card = this._makeChoice(ctx, motif)
      card.position.set(positions[i].x, positions[i].y)
      layer.addChild(card)
      this._choices.push(card)
      card.scale.set(0)
      gsap.to(card.scale, {
        x: 1, y: 1, duration: 0.32, delay: 0.1 + i * 0.08, ease: 'back.out(1.7)',
        onStart: () => { if (this._alive && i === 0) ctx.services.audio.sfx('pling') },
      })
    })
  },

  // Ett svarskort = stort tryckbart kort med en emoji. Träffyta ≫ 96px.
  _makeChoice(ctx, motif) {
    const card = makeChoiceCard(motif)
    card.on('pointertap', () => this._onChoice(ctx, card, motif))
    return card
  },

  // Tap på ett svarskort.
  _onChoice(ctx, card, motif) {
    if (!this._alive || this._busy || this._phase !== 'answer') return
    this._idle = 0
    this._idleNudges = 0

    if (motif === this._missing._motif) {
      this._resolveCorrect(ctx, card) // RÄTT
      return
    }
    // FEL: aldrig en bestraffning — lekfull vingel + mjukt ljud + ny mild ledtråd.
    ctx.services.audio.sfx('soft')
    wiggle(card)
    this._misses = (this._misses || 0) + 1
    if (this._mode === 'added') {
      ctx.services.voice.say(this._misses === 1
        ? 'Nästan! Vilken sak fanns inte där förut?'
        : 'Prova igen! Leta efter saken som är ny.')
    } else {
      ctx.services.voice.say(this._misses === 1
        ? 'Nästan! Titta vad som finns kvar — vilken sak är borta?'
        : 'Prova igen! Leta efter saken som inte syns längre.')
    }
    if (this._misses >= 2) this._autoHelp(ctx) // mjuk auto-hjälp -> kan aldrig fastna
  },

  // RÄTT svar: firande EN gång (guard _resolving). Saken studsar tillbaka på sin
  // plats, säger sitt namn, gnistror + beröm, framsteg + delat firande.
  _resolveCorrect(ctx, card) {
    if (this._resolving) return
    this._resolving = true
    this._busy = true
    this._phase = 'resolved'
    this._idle = 0
    this._killHelpTween()

    ctx.services.audio.sfx('correct')
    if (card && !card.destroyed) {
      gsap.killTweensOf(card.scale)
      card.scale.set(1)
      pop(card)
    }
    // Tona ned de andra korten + lås alla kort.
    this._choices.forEach((c) => {
      c.eventMode = 'none'
      if (c !== card && !c.destroyed) gsap.to(c, { alpha: 0.3, duration: 0.3 })
    })

    // Saken kommer tillbaka på sin plats i rutnätet.
    const slot = this._missing
    slot._isGap = false
    slot._placeholder.visible = false
    slot._emoji.visible = true
    bounceIn(slot._emoji)
    pop(slot)
    const gp = ctx.fxLayer.toLocal(slot.getGlobalPosition())
    sparkle(ctx.fxLayer, gp.x, gp.y)
    ripple(ctx.fxLayer, gp.x, gp.y, { color: COLORS.green, maxR: 120 }) // triumf-ring kring rutan
    // Stigande "rätt"-pling + ev. sak-specifikt läte (voff/tut) ovanpå namn-TTS.
    ctx.services.audio.tone({ freq: 520, dur: 0.14, type: 'triangle', vol: 0.22, slideTo: 900 })
    const sample = SAMPLES[slot._motif]
    if (sample) ctx.services.audio.sample(sample)
    const namn = NAMES[slot._motif] || 'den'
    const line = this._mode === 'added'
      ? `Ja! ${cap(namn)} kom till! ${randomFrom(PRAISE)}`
      : `Ja! Det var ju ${namn}! ${randomFrom(PRAISE)}`
    ctx.services.voice.say(line)

    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    this._level = clampLevel(this._level + 1)
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()
    this._later(1.7, () => this._newRound(ctx))
  },

  // Mjuk auto-hjälp (efter ~2 fel eller om barnet väntar): rätt kort får en grön
  // glödring + lugn andnings-puls och en vänlig ledtråd; väljs sedan automatiskt
  // efter en stund om barnet inte hinner -> rundan kan ALDRIG misslyckas.
  _autoHelp(ctx) {
    if (!this._alive || this._helped || this._resolving) return
    this._helped = true
    const card = this._choices.find((c) => c._motif === this._missing._motif)
    if (!card || card.destroyed) return
    if (!card._glow) {
      const ring = new Graphics().roundRect(-84, -84, 168, 168, 30).stroke({ width: 8, color: COLORS.green, alpha: 0.95 })
      ring.eventMode = 'none'
      card.addChildAt(ring, 0)
      card._glow = ring
    }
    this._killHelpTween()
    this._helpTween = breathe(card, { scale: 1.12, duration: 0.7 })
    const namn = NAMES[this._missing._motif] || 'den'
    ctx.services.voice.say(this._mode === 'added'
      ? `Titta — det var ${namn} som kom till. Tryck på den!`
      : `Titta — det var ${namn} som försvann. Tryck på den!`)
    this._later(2.8, () => {
      if (this._alive && this._phase === 'answer' && !this._resolving) this._resolveCorrect(ctx, card)
    })
  },

  _killHelpTween() {
    if (this._helpTween) { this._helpTween.kill(); this._helpTween = null }
  },

  // Tap på en sak i rutnätet = ALLTID bara en lekfull poke (feedback < 100ms).
  // Själva svaret ges på svarskorten (_onChoice), aldrig genom att trycka på
  // rutorna — så det går inte längre att "ha rätt" utan att välja rätt sak.
  _onTap(ctx, slot) {
    if (!this._alive || this._busy) return
    this._idle = 0
    if (this._phase !== 'show' && this._phase !== 'answer') return
    if (slot === this._newcomer && !slot._emoji.visible) return // gömd tills den dyker upp
    ctx.services.audio.sfx('pop')
    pop(slot)
  },

  _newRound(ctx) {
    if (!this._alive) return
    this._build(ctx)
    ctx.services.voice.say(this._introLine())
  },

  // Idle ~6s: locka vänligt vidare beroende på fas (aldrig press).
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle < 6) return
    this._idle = 0
    if (this._phase === 'answer' && this._missing) {
      this._idleNudges = (this._idleNudges || 0) + 1
      if (this._idleNudges >= 2 || this._helped) {
        this._autoHelp(ctx) // har väntat ett tag -> visa & välj rätt kort
      } else {
        ctx.services.voice.say('Titta igen — vilken sak är borta? Välj rätt kort här nere.')
        this._choices.forEach((c) => { if (c && !c.destroyed) pop(c) })
      }
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
    this._choices?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._killHelpTween()
    if (this._gridLayer) gsap.killTweensOf(this._gridLayer)
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

// Versal första bokstav (svensk mening: "Äpplet kom till!").
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
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

// Positioner (center) för svarsraden nedtill, centrerad kring x=640.
function choiceLayout(n, { y = 632, cardW = 150, gap = 56 } = {}) {
  const step = cardW + gap
  const totalW = n * cardW + (n - 1) * gap
  const startX = 640 - totalW / 2 + cardW / 2
  const out = []
  for (let i = 0; i < n; i++) out.push({ x: startX + i * step, y })
  return out
}

// Ett svarskort: rundad cream-bricka (150×150) med en stor emoji. Generös
// träffyta (156px ≫ 96px + osynlig halo). Emoji fångar inte tryck själv.
function makeChoiceCard(motif) {
  const card = new Container()
  const bg = new Graphics()
    .roundRect(-75, -75, 150, 150, 28)
    .fill(COLORS.cream)
    .stroke({ width: 5, color: COLORS.inkSoft, alpha: 0.4 })
  bg.eventMode = 'none'
  const emoji = new Text({ text: motif, style: { fontFamily: FONT.body, fontSize: 92, align: 'center' } })
  emoji.anchor.set(0.5)
  emoji.eventMode = 'none'
  card.addChild(bg, emoji)
  card._motif = motif
  card._emoji = emoji
  card.eventMode = 'static'
  card.cursor = 'pointer'
  card.hitArea = new Rectangle(-78, -78, 156, 156)
  return card
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
