// Sortera Skräp — dra och släpp (2–5 år). MARKNADSMÄSSIG uppgradering som behåller
// mekaniken (dra varje sak till rätt tunna) men lyfter känslan rejält:
//  • Levande scen (createScene) + färgkodade tunnor som är GLADA VARELSER: stort huvud
//    med ögon vars pupiller FÖLJER det man håller, en mun som GAPAR när saken närmar sig
//    och TUGGAR belåtet vid rätt material; fel tunna skakar vänligt på huvudet ("inte
//    min sort!") — aldrig en bestraffning. Kategori-ikon som mage-bricka (INGEN läsning).
//  • Charmiga föremål med mjuk skugga som VÄXER när de lyfts (lyft + skala vid grepp).
//  • Materialspecifik juice: rätt släpp ger en ljudtextur som PASSAR sorten (glasklang,
//    pappersprassel, plast-studs, mjuk mat-duns) + huvud-tugg med "klonk" + gnistor/ring/
//    puff i materialets färg + plopp NER bakom tunnan. Fel = mjuk studs hem + vingel.
//  • Djup: läser progress.highestLevel och växer — börjar med 2 tunnor/få saker och
//    ökar upp till 4 tunnor (papper, mat, plast, glas/metall) och fler saker per runda.
//    VARIERAR vilka exakta saker som dyker upp varje runda; slängd/klustrad hög. FELFRITT.
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
        onCorrect: (_rec, target) => this._onCorrect(ctx, it, target),
        onWrong: (_rec, target) => this._onWrong(ctx, it, target),
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
    const matColor = CATS[bin._cat].color

    // Materialspecifik ljudtextur (glasklang/pappersprassel/plast-studs/mjuk mat-duns)
    // + lock-"klonk" + huvudet TUGGAR belåtet. Juice i materialets egen färg.
    this._materialSound(ctx, bin._cat)
    sparkle(this._fx, mx, my, { count: 8 })
    ripple(this._fx, mx, my, { color: matColor, maxR: bin._w * 0.6, width: 5, alpha: 0.55 })
    puff(this._fx, mx, my, { count: 6, color: matColor })
    this._popLid(bin)
    ctx.services.audio.tone({ freq: 150, dur: 0.06, type: 'square', vol: 0.12 }) // lock-"klonk"
    this._chew(bin)
    pop(bin, { scale: 1.05 })
    if (Math.random() < 0.55) ctx.services.voice.say(randomFrom(PRAISE_SV))
    if (Math.random() < 0.4) floatText(this._fx, mx, my - 10, '⭐', { fontSize: 44, rise: 64 })

    this._dropIntoBin(it, bin)

    this._sorted++
    if (this._sorted >= this._items.length) this._onRoundDone(ctx)
  },

  // FEL tunna: DragController har redan spelat 'soft' + snäppt hem. Lägg på vänlig
  // vingel + liten puff, och tunnan SKAKAR PÅ HUVUDET ("inte min sort!"). Aldrig en
  // bestraffning.
  _onWrong(ctx, it, target) {
    if (!this._alive || it.sorted) return
    this._idle = 0
    wiggle(it.container)
    puff(this._fx, it.container.x, it.container.y, { count: 6 })
    if (target && target.view && !target.view.destroyed) this._headShake(target.view)
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

  // Materialspecifik ljudtextur (helt syntetiserad via audio.tone → inget nytt klipp):
  // glas klingar ljust, papper prasslar i korta blip, plast studsar, mat dunsar mjukt.
  _materialSound(ctx, key) {
    const a = ctx.services.audio
    switch (key) {
      case 'glasmetall': // glasklang: två ljusa pling
        a.tone({ freq: 1320, dur: 0.12, type: 'sine', vol: 0.16, slideTo: 1760 })
        a.tone({ freq: 1980, dur: 0.14, type: 'sine', vol: 0.1, delay: 0.06 })
        break
      case 'papper': // pappersprassel: korta ljusa triangelblip
        a.tone({ freq: 760, dur: 0.05, type: 'triangle', vol: 0.1 })
        a.tone({ freq: 900, dur: 0.05, type: 'triangle', vol: 0.09, delay: 0.05 })
        a.tone({ freq: 680, dur: 0.05, type: 'triangle', vol: 0.08, delay: 0.1 })
        break
      case 'plast': // plast-studs: liten "boing"
        a.tone({ freq: 300, dur: 0.16, type: 'square', vol: 0.14, slideTo: 620 })
        break
      case 'mat': // mjuk duns
        a.tone({ freq: 200, dur: 0.16, type: 'sine', vol: 0.2, slideTo: 120 })
        break
      default:
        a.sfx('pling')
    }
  },

  // Huvudet TUGGAR belåtet vid rätt släpp (munnen gapar och tuggar ihop). Flaggan
  // _chewing pausar den gaze-drivna gapningen i _update medan tuggningen spelar.
  _chew(bin) {
    const m = bin._mouth
    if (!m || m.destroyed) return
    bin._chewing = true
    gsap.killTweensOf(m.scale)
    gsap
      .timeline({
        onComplete: () => {
          if (!bin.destroyed) bin._chewing = false
        },
      })
      .to(m.scale, { y: 2.4, duration: 0.1, ease: 'power2.out' })
      .to(m.scale, { y: 1.2, duration: 0.12, ease: 'power2.in' })
      .to(m.scale, { y: 2.0, duration: 0.1 })
      .to(m.scale, { y: 1, duration: 0.16, ease: 'power2.inOut' })
  },

  // Tunnan skakar vänligt på huvudet vid fel sort ("inte min sort!") — aldrig en
  // bestraffning, bara en gullig "nej tack". Rotation dödas i killBinTweens/destroy.
  _headShake(bin) {
    if (!bin || bin.destroyed) return
    gsap.killTweensOf(bin)
    gsap
      .timeline()
      .to(bin, { rotation: 0.12, duration: 0.08 })
      .to(bin, { rotation: -0.12, duration: 0.1 })
      .to(bin, { rotation: 0.08, duration: 0.09 })
      .to(bin, { rotation: 0, duration: 0.12 })
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

    // Tunn-varelser: pupillerna FÖLJER det man håller, och munnen GAPAR när saken
    // närmar sig öppningen (pausas medan en tugg-animation spelar). Rent per-bild-
    // satta värden (inga tweens) → exit-säkert; tunnan förstörs med sina barn.
    const held = this._drag?.active?.view || this._drag?.selected?.view || null
    const heldLive = held && !held.destroyed ? held : null
    for (const bin of this._bins) {
      if (!bin || bin.destroyed) continue
      let tx = 0
      let ty = 3 // vila: titta lite nedåt mot magen
      if (heldLive) {
        const dx = heldLive.x - bin.x
        const dy = heldLive.y - (bin.y + bin._eyeY)
        const d = Math.hypot(dx, dy) || 1
        tx = (dx / d) * bin._eyeMax
        ty = (dy / d) * bin._eyeMax
      }
      if (bin._pupils) {
        for (const pu of bin._pupils) {
          if (pu.destroyed) continue
          pu.x += (tx - pu.x) * k
          pu.y += (ty - pu.y) * k
        }
      }
      if (bin._mouth && !bin._mouth.destroyed && !bin._chewing) {
        let gape = 0
        if (heldLive) {
          const dx = heldLive.x - bin.x
          const dyv = heldLive.y - (bin.y - bin._mouthDY)
          gape = Math.max(0, 1 - Math.hypot(dx, dyv) / 260)
        }
        bin._gapeCur += (gape - bin._gapeCur) * k
        bin._mouth.scale.y = 1 + bin._gapeCur * 1.4
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
    // Gapande "mun" (öppning) nära toppen — egen container så den kan GAPA nedåt
    // (scale.y) när en sak närmar sig och TUGGA belåtet vid rätt släpp, utan att
    // själva öppningen flyttar sig (pivot i munnens överkant).
    const mouth = new Container()
    mouth.position.set(0, -h / 2 + 8)
    mouth.addChild(new Graphics().roundRect(-w * 0.32, 0, w * 0.64, 18, 9).fill({ color: 0x201814, alpha: 0.42 }))
    mouth.addChild(new Graphics().roundRect(-w * 0.24, 3, w * 0.48, 9, 5).fill({ color: 0x000000, alpha: 0.3 }))
    bin._mouth = mouth
    bin._gapeCur = 0
    bin._chewing = false

    // Ögon (varelse-känsla): vita + pupiller som FÖLJER det man håller (se _update).
    const eyeY = -h * 0.16
    const eyeDX = w * 0.2
    const eyeWR = Math.max(12, w * 0.1)
    const pupilR = eyeWR * 0.46
    const eyes = new Container()
    bin._pupils = []
    bin._eyeY = eyeY
    bin._eyeMax = eyeWR * 0.42
    for (const sx of [-1, 1]) {
      // Varje öga är en egen container (vita + pupill med bakad mitt), positionerad i
      // ögonhålan. Pupillen flyttas med SMÅ offset kring sin bakade mitt (0,2) — samma
      // beprövade mönster som nallen/kompisarna; undviker bounds-glitchen som uppstod
      // när en bar Graphics fick en stor .position.
      const eye = new Container()
      eye.position.set(sx * eyeDX, eyeY)
      eye.addChild(new Graphics().circle(0, 0, eyeWR).fill(0xffffff).stroke({ width: 3, color: dark, alpha: 0.5 }))
      const pupil = new Graphics().circle(0, 2, pupilR).fill(0x2a2320)
      eye.addChild(pupil)
      eyes.addChild(eye)
      bin._pupils.push(pupil)
    }

    // Kategori-ikon som mage-bricka: vit skiva + emoji (ingen läsning krävs).
    const iconDisc = new Graphics().circle(0, h * 0.2, w * 0.17).fill({ color: 0xffffff, alpha: 0.92 })
    const iconEmoji = new Text({ text: cat.icon, style: { fontFamily: FONT.body, fontSize: w * 0.23 } })
    iconEmoji.anchor.set(0.5)
    iconEmoji.position.set(0, h * 0.2)
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

    bin.addChild(shadow, body, panel, hi, mouth, eyes, iconDisc, iconEmoji, lid)

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
    c.rotation = (Math.random() * 2 - 1) * 0.22 // slängd hög → tydligare lutning
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
  if (b._mouth && !b._mouth.destroyed) gsap.killTweensOf(b._mouth.scale)
}

// Lägg ut föremålen i en lätt klustrad, "slängd" hög (1–2 rader, centrerade) ovanför
// tunnorna, med jitter i x/y så det ser ut som riktigt skräp — inte en prydlig tabell.
function layoutItems(ctx, n) {
  const perRow = n <= 5 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / perRow)
  const spacingX = 168
  const spacingY = 150
  const centerY = 255
  const yTop = centerY - ((rows - 1) * spacingY) / 2
  const jit = (m) => (Math.random() * 2 - 1) * m
  const spots = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow)
    const cols = row < rows - 1 ? perRow : n - perRow * (rows - 1)
    const idx = i - row * perRow
    const rowW = (cols - 1) * spacingX
    spots.push({ x: ctx.width / 2 - rowW / 2 + idx * spacingX + jit(30), y: yTop + row * spacingY + jit(22) })
  }
  return spots
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
