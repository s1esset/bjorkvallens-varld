// Sortera Skräp — dra och släpp (2–5 år). MARKNADSMÄSSIG uppgradering som behåller
// mekaniken (dra varje sak till rätt tunna) men lyfter känslan rejält:
//  • Levande scen (createScene) + färgkodade, inbjudande tunnor med tydlig ikon
//    (INGEN läsning krävs), mjuk skugga, lock som studsar och en mörk "mun".
//  • Charmiga föremål med mjuk skugga som VÄXER när de lyfts (lyft + skala vid grepp).
//  • Juice: rätt släpp = popp + gnistor + ring + chime + lock-studs + plopp NER i tunnan;
//    fel = mjuk studs tillbaka + vänlig vingel + mjukt ljud (ALDRIG en bestraffning).
//  • Djup: läser progress.highestLevel och växer — börjar med 2 tunnor/få saker och
//    ökar upp till 4 tunnor (papper, mat, plast, glas/metall) och fler saker per runda.
//    VARIERAR vilka exakta saker som dyker upp varje runda. Strikt FELFRITT.
//  • All transient-effekt går via lib/feedback.js (exit-säkert). Drag via DragController.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { bounceIn, sparkle, ripple, pop, wiggle, breathe, shake, floatText, puff } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Talade svenska fraser (TTS). Korta, varma, alltid positiva.
const VOICE = {
  intro: 'Hjälp mig sortera skräpet! Dra varje sak till tunnan som passar.',
  cue: 'Dra skräpet till rätt tunna.',
  tryAgain: 'Nästan! Prova en annan tunna.',
}
const PRAISE_SV = ['Rätt!', 'Bra jobbat!', 'Ja, precis!', 'Perfekt!', 'Så duktig!']

// Kategorier: färgkodad tunna + tydlig ikon (ingen läsning) + bred föremålspool så
// varje runda varierar. Ordningen avgör vilka som läggs till när nivån stiger
// (de två första är extra lätta att skilja: papper vs mat).
const CAT_ORDER = ['papper', 'mat', 'plast', 'glasmetall']
const CATS = {
  papper: { color: 0x4aa3df, icon: '📄', items: ['📄', '📰', '📦', '✉️', '📒', '🗞️', '📕', '📃'] },
  mat: { color: 0x5bbf6a, icon: '🍎', items: ['🍌', '🍎', '🥕', '🍂', '🍐', '🌽', '🍞', '🥚'] },
  plast: { color: 0xffb14a, icon: '🧴', items: ['🥤', '🧴', '🍶', '🛍️', '🧃', '🪣', '🥡', '🪥'] },
  glasmetall: { color: 0x8a98a6, icon: '🥫', items: ['🍾', '🫙', '🥫', '🥃', '🔩', '🪙', '🥄', '🔋'] },
}

// DJUP: gradvis fler tunnor + fler saker. Strikt felfritt — bara mer, aldrig "svårare-på-fel-sätt".
const LEVELS = [
  { cats: 2, items: 4 },
  { cats: 2, items: 6 },
  { cats: 3, items: 6 },
  { cats: 3, items: 9 },
  { cats: 4, items: 8 },
  { cats: 4, items: 10 },
]

const ITEM_R = 58 // föremålets skivradie (designkoordinater)

export default {
  id: 'sortera-skrap',
  titleSv: 'Sortera Skräp',
  icon: '♻️',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'sortera-skrap',
  voiceIntro: VOICE.intro,

  init(ctx) {
    this._alive = true
    this._started = false
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)
    // Bakgrundsscen (utomhus-äng) FÖRST så allt innehåll renderas ovanpå.
    this._root.addChild(createScene('meadow'))

    // Spel-lager (tunnor + föremål) och ett fx-lager ovanpå för partiklar/ringar/text.
    this._play = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._play, this._fx)

    // Lager INUTI play: "behind" (dit ett rätt föremål ploppar ner bakom tunnan) +
    // binsLayer (tunnorna). Föremål läggs direkt i play -> ovanpå tunnorna under drag.
    this._behind = new Container()
    this._binsLayer = new Container()
    this._play.addChild(this._behind, this._binsLayer)

    // EN DragController för hela spelets livstid (space = play). Återställs per runda.
    this._drag = new DragController({ space: this._play, services: ctx.services })

    this._bins = []
    this._items = []
    this._buildRound(ctx, false)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this._cue || VOICE.intro)
  },

  // Bygg (eller återuppbygg) en runda: städar föregående, lägger tunnor + en varierad
  // hög med skräp. announce=true talar rundans instruktion.
  _buildRound(ctx, announce = false) {
    if (!this._alive) return
    this._clearHint()

    // --- riv föregående runda (exit-/rebuild-säkert) ---
    this._drag.clear() // tömmer items + targets, dödar item-tweens (ej redan förstörda)
    this._bins?.forEach((b) => killBinTweens(b))
    this._items?.forEach((it) => {
      const c = it.container
      if (c && !c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
        c.destroy({ children: true })
      }
    })
    this._behind.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._binsLayer.removeChildren().forEach((o) => o.destroy({ children: true }))

    this._bins = []
    this._items = []
    this._sorted = 0
    this._idle = 0
    this._roundDone = false

    const lvl = LEVELS[this._level]
    const activeKeys = CAT_ORDER.slice(0, lvl.cats)

    // --- tunnor (responsiv bredd så även 4 får plats) ---
    const gap = 44
    const avail = ctx.width - 120
    const binW = Math.min(300, (avail - (activeKeys.length - 1) * gap) / activeKeys.length)
    const binH = Math.min(232, binW * 0.78)
    const totalW = activeKeys.length * binW + (activeKeys.length - 1) * gap
    const startX = (ctx.width - totalW) / 2 + binW / 2
    const binY = ctx.height - 175
    const hitR = Math.max(140, binW * 0.62)

    activeKeys.forEach((key, i) => {
      const bin = this._makeBin(key, binW, binH)
      bin.x = startX + i * (binW + gap)
      bin.y = binY
      this._binsLayer.addChild(bin)
      this._bins.push(bin)
      this._drag.addTarget(bin, (d) => d.category === key, { hitRadius: hitR })
      bounceIn(bin, { delay: i * 0.06, duration: 0.34 })
    })

    // --- skräp-högen (varierad varje runda) ---
    const batch = this._makeBatch(lvl, activeKeys)
    const spots = layoutItems(ctx, batch.length)
    batch.forEach((data, i) => {
      const c = this._makeItem(data, ITEM_R)
      c.x = spots[i].x
      c.y = spots[i].y
      this._play.addChild(c)
      const it = { container: c, data, sorted: false, lift: 0 }
      c._it = it
      this._items.push(it)

      this._drag.addItem(c, data, {
        onSelect: () => {
          if (!this._alive) return
          this._idle = 0
          this._clearHint()
        },
        onCorrect: (rec, target) => this._onCorrect(ctx, it, target),
        onWrong: () => this._onWrong(ctx, it),
      })
      // Extra: vilken pekning som helst nollställer idle + släcker en lockande puls.
      c.on('pointerdown', () => {
        if (!this._alive) return
        this._idle = 0
        this._clearHint()
      })
      bounceIn(c, { delay: Math.min(i * 0.06, 0.6), duration: 0.32 })
    })

    this._cue = VOICE.cue
    if (announce && this._started) ctx.services.voice.say(this._cue)
  },

  // En varierad, jämnt fördelad hög: round-robin över aktiva kategorier, distinkta
  // föremål per kategori (blandad pool) -> aldrig samma hög två gånger.
  _makeBatch(lvl, activeKeys) {
    const queues = {}
    activeKeys.forEach((k) => (queues[k] = shuffle(CATS[k].items)))
    const batch = []
    for (let i = 0; i < lvl.items; i++) {
      const key = activeKeys[i % activeKeys.length]
      const q = queues[key]
      const emoji = q.length ? q.shift() : randomFrom(CATS[key].items)
      batch.push({ category: key, emoji })
    }
    return shuffle(batch)
  },

  // RÄTT tunna: chime + gnistor + ring + lock-studs + tunna-popp, och föremålet
  // ploppar NER bakom tunnan. (Firande/konfetti sker via progress.complete vid rundslut.)
  _onCorrect(ctx, it, target) {
    if (!this._alive || it.sorted) return
    it.sorted = true
    this._idle = 0
    this._clearHint()

    const bin = target.view
    const mx = bin.x
    const my = bin.y - bin._mouthDY

    ctx.services.audio.sfx('pling')
    sparkle(this._fx, mx, my, { count: 8 })
    ripple(this._fx, mx, my, { color: 0xffffff, maxR: bin._w * 0.6, width: 5, alpha: 0.5 })
    this._popLid(bin)
    pop(bin, { scale: 1.05 })
    if (Math.random() < 0.55) ctx.services.voice.say(randomFrom(PRAISE_SV))
    if (Math.random() < 0.4) floatText(this._fx, mx, my - 10, '⭐', { fontSize: 44, rise: 64 })

    this._dropIntoBin(it, bin)

    this._sorted++
    if (this._sorted >= this._items.length) this._onRoundDone(ctx)
  },

  // FEL tunna: DragController har redan spelat 'soft' + snäppt hem. Lägg på vänlig
  // vingel + liten puff. Aldrig en bestraffning.
  _onWrong(ctx, it) {
    if (!this._alive || it.sorted) return
    this._idle = 0
    wiggle(it.container)
    puff(this._fx, it.container.x, it.container.y, { count: 6 })
    if (Math.random() < 0.4) ctx.services.voice.say(VOICE.tryAgain)
  },

  // Föremålet faller ner i tunnan: flytta bakom tunnan, sjunk + krymp + tona bort.
  _dropIntoBin(it, bin) {
    const c = it.container
    if (!c || c.destroyed) return
    this._behind.addChild(c) // bakom tunnan (samma origo i play -> koordinater oförändrade)
    gsap.killTweensOf(c)
    gsap.killTweensOf(c.scale)
    if (c._shadow && !c._shadow.destroyed) c._shadow.alpha = 0
    const tl = gsap.timeline()
    tl.to(c, { y: bin.y + bin._h * 0.16, duration: 0.3, ease: 'power1.in' })
    tl.to(c.scale, { x: 0.25, y: 0.25, duration: 0.3, ease: 'power1.in' }, '<')
    tl.to(c, { alpha: 0, duration: 0.16 }, '-=0.16')
    tl.call(() => {
      if (!c.destroyed) c.destroy({ children: true })
    })
  },

  // Locket "poppar" upp och studsar tillbaka (avslöjar den mörka munnen).
  _popLid(bin) {
    const lid = bin._lid
    if (!lid || lid.destroyed) return
    gsap.killTweensOf(lid)
    const baseY = bin._lidBaseY
    gsap
      .timeline()
      .to(lid, { y: baseY - 16, rotation: -0.06, duration: 0.1, ease: 'power2.out' })
      .to(lid, { y: baseY, rotation: 0, duration: 0.28, ease: 'bounce.out' })
  },

  // Rundan klar: höj nivå, gnist-svep över tunnorna, sedan delat firande
  // (celebrate-sfx + beröm + konfetti + stjärna + klistermärke via progress.complete —
  // INTE duplicerat här) + en mjuk glad skakning. Sedan en ny, lite större runda.
  _onRoundDone(ctx) {
    if (!this._alive || this._roundDone) return
    this._roundDone = true
    this._clearHint()
    this._level = clampLevel(this._level + 1)
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)

    this._bins.forEach((b, i) => {
      gsap.delayedCall(0.05 * i, () => {
        if (!this._alive || b.destroyed) return
        sparkle(this._fx, b.x, b.y - b._mouthDY, { count: 6 })
      })
    })

    gsap.delayedCall(0.4, () => {
      if (!this._alive) return
      ctx.progress.complete()
      shake(this._root, { intensity: 5, duration: 0.5 })
    })

    gsap.delayedCall(1.8, () => {
      if (!this._alive) return
      this._buildRound(ctx, true)
    })
  },

  // Per-bild: mjuk lyft-känsla (skugga växer + skivan stiger) medan ett föremål hålls.
  // Plus lugn idle-lockelse efter ~6s.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    const k = Math.min(1, dt * 12)

    for (const it of this._items) {
      const c = it.container
      if (!c || c.destroyed || it.sorted) continue
      const lifted = this._drag.active?.view === c || this._drag.selected?.view === c
      it.lift += ((lifted ? 1 : 0) - it.lift) * k
      if (c._content && !c._content.destroyed) c._content.y = -22 * it.lift
      if (c._shadow && !c._shadow.destroyed) {
        const s = 1 + 0.5 * it.lift
        c._shadow.scale.set(s)
        c._shadow.alpha = 0.26 - 0.1 * it.lift
      }
    }

    if (this._roundDone) return
    this._idle += dt
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this._cue || VOICE.cue)
      this._clearHint()
      const pool = this._items.filter((it) => !it.sorted && !it.container.destroyed)
      if (pool.length) {
        const it = randomFrom(pool)
        this._hintItem = it
        this._hintTween = breathe(it.container, { scale: 1.1, duration: 0.7 })
        const bin = this._bins.find((b) => b._cat === it.data.category)
        if (bin && !bin.destroyed) {
          ripple(this._fx, bin.x, bin.y - bin._mouthDY, { color: 0xffffff, maxR: bin._w * 0.5, width: 5, alpha: 0.5 })
        }
      }
    }
  },

  _clearHint() {
    if (this._hintTween) {
      this._hintTween.kill()
      this._hintTween = null
    }
    const it = this._hintItem
    this._hintItem = null
    if (it && it.container && !it.container.destroyed && !it.sorted) {
      const c = it.container
      const active = this._drag?.active?.view === c || this._drag?.selected?.view === c
      if (!active) {
        gsap.killTweensOf(c.scale)
        c.scale.set(1)
      }
    }
  },

  // --- grafik (rena Graphics/Text, inga tillgångar) ---

  _makeBin(key, w, h) {
    const cat = CATS[key]
    const base = cat.color
    const light = lerpColor(base, 0xffffff, 0.2)
    const dark = lerpColor(base, 0x000000, 0.18)

    const bin = new Container()
    bin._cat = key
    bin._w = w
    bin._h = h
    bin._mouthDY = h / 2 - 18 // munnens y-offset (vid övre kanten) för effekter

    // Mjuk markskugga.
    const shadow = new Graphics().ellipse(0, h / 2 + 8, w * 0.52, 18).fill({ color: 0x2a1c10, alpha: 0.2 })
    // Kropp + vit kant.
    const body = new Graphics().roundRect(-w / 2, -h / 2, w, h, 26).fill(base).stroke({ width: 6, color: 0xffffff, alpha: 0.55 })
    // Ljusare inre panel (djup).
    const panel = new Graphics().roundRect(-w / 2 + 12, -h / 2 + 34, w - 24, h - 50, 16).fill({ color: light, alpha: 0.22 })
    // Vänster ljus-stripe.
    const hi = new Graphics().roundRect(-w / 2 + 12, -h / 2 + 14, 13, h - 28, 6).fill({ color: 0xffffff, alpha: 0.18 })
    // Mörk "mun" (öppning) nära toppen.
    const mouth = new Graphics().roundRect(-w * 0.32, -h / 2 + 8, w * 0.64, 20, 10).fill({ color: 0x000000, alpha: 0.3 })
    // Kategori-ikon: vit skiva + emoji (ingen läsning krävs).
    const iconDisc = new Graphics().circle(0, h * 0.07, w * 0.2).fill({ color: 0xffffff, alpha: 0.92 })
    const iconEmoji = new Text({ text: cat.icon, style: { fontFamily: FONT.body, fontSize: w * 0.27 } })
    iconEmoji.anchor.set(0.5)
    iconEmoji.position.set(0, h * 0.07)
    // Lock (studsar vid rätt släpp) med liten knopp.
    const lidW = w * 0.96
    const lidH = 24
    const lid = new Graphics()
      .roundRect(-lidW / 2, -lidH / 2, lidW, lidH, 12)
      .fill(dark)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.5 })
    lid.roundRect(-lidW * 0.09, -lidH / 2 - 9, lidW * 0.18, 11, 5).fill(dark)
    lid.y = -h / 2 - 6
    bin._lid = lid
    bin._lidBaseY = lid.y

    bin.addChild(shadow, body, panel, hi, mouth, iconDisc, iconEmoji, lid)

    // Generös, exakt träffyta (mjukt utökad).
    bin.hitArea = { contains: (px, py) => Math.abs(px) <= w / 2 + 14 && py >= -h / 2 - 18 && py <= h / 2 + 14 }
    return bin
  },

  _makeItem(data, r) {
    const c = new Container()
    c._data = data
    // Mjuk skugga (växer när föremålet lyfts — se _update).
    const shadow = new Graphics().ellipse(0, r * 0.98, r * 0.84, r * 0.3).fill({ color: 0x2a1c10, alpha: 0.26 })
    shadow.eventMode = 'none'
    // Innehåll (lyfts uppåt vid grepp).
    const content = new Container()
    const disc = new Graphics().circle(0, 0, r).fill(COLORS.cream).stroke({ width: 5, color: 0xece0c8 })
    const ring = new Graphics().circle(0, 0, r - 7).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
    const gloss = new Graphics().ellipse(-r * 0.28, -r * 0.34, r * 0.4, r * 0.22).fill({ color: 0xffffff, alpha: 0.5 })
    const emoji = new Text({ text: data.emoji, style: { fontFamily: FONT.body, fontSize: r * 1.2 } })
    emoji.anchor.set(0.5)
    content.addChild(disc, ring, gloss, emoji)

    c.addChild(shadow, content)
    c._shadow = shadow
    c._content = content
    c.rotation = (Math.random() * 2 - 1) * 0.05
    // Stor, stabil träffyta (oberoende av lyft-offset).
    c.hitArea = { contains: (px, py) => px * px + py * py <= (r + 18) * (r + 18) }
    return c
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    this._clearHint()
    // VIKTIGT: DragController river lyssnare + dödar item-tweens (snäpp/skala).
    this._drag?.destroy()
    this._drag = null
    this._bins?.forEach((b) => killBinTweens(b))
    this._items?.forEach((it) => {
      const c = it.container
      if (c && !c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
      }
    })
    gsap.killTweensOf(this._root)
    gsap.killTweensOf(this._play)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._play = null
    this._fx = null
    this._behind = null
    this._binsLayer = null
    this._bins = null
    this._items = null
    this._hintItem = null
    this._hintTween = null
  },
}

// --- hjälpare ---

function killBinTweens(b) {
  if (!b || b.destroyed) return
  gsap.killTweensOf(b)
  gsap.killTweensOf(b.scale)
  if (b._lid && !b._lid.destroyed) gsap.killTweensOf(b._lid)
}

// Lägg ut föremålen i en prydlig hög (1–2 rader, centrerade) ovanför tunnorna.
function layoutItems(ctx, n) {
  const perRow = n <= 5 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / perRow)
  const spacingX = 168
  const spacingY = 150
  const centerY = 255
  const yTop = centerY - ((rows - 1) * spacingY) / 2
  const spots = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow)
    const cols = row < rows - 1 ? perRow : n - perRow * (rows - 1)
    const idx = i - row * perRow
    const rowW = (cols - 1) * spacingX
    spots.push({ x: ctx.width / 2 - rowW / 2 + idx * spacingX, y: yTop + row * spacingY })
  }
  return spots
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
