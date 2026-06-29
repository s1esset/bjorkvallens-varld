// Stor och Liten — dra och släpp (2–4 år). Lär begreppen "stor"/"liten" genom
// att sortera samma sorts föremål i två tydliga storlekar till rätt låda:
// en STOR låda (vänster) och en LITEN låda (höger). Bygger på den återanvändbara
// DragController (stor träffyta, snäpp, snäpp-tillbaka, tap-tap-fallback för de
// minsta). Fel = mjuk studs tillbaka + vingel (aldrig en bestraffning). Oändlig
// lek: när rundan är klar firar vi (stjärna + klistermärke) och en ny runda startar.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { pop, wiggle, sparkle } from '../../lib/feedback.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Samma form i två storlekar — välj EN emoji per runda så det känns nytt.
const EMOJIS = ['🐻', '⭐', '🍎', '🎈', '🐟', '🌟', '🚗', '🐶', '🌸', '🍪']

// Röstvariation per låda (full svenska, alltid positivt).
const BIG_WORDS = ['Stor!', 'Det är en stor!', 'Bra!']
const SMALL_WORDS = ['Liten!', 'En liten!', 'Fint!']

// Glest rutnät (2 rader x 3 kolumner) i spawn-zonen (y 150–360, x 220–1060).
// Håller föremål väl ifrån lådornas centrum så inget snäpper oavsiktligt.
const SPAWN_SLOTS = [
  { x: 300, y: 180 }, { x: 640, y: 170 }, { x: 980, y: 180 },
  { x: 300, y: 315 }, { x: 640, y: 325 }, { x: 980, y: 315 },
]

export default {
  id: 'stor-liten',
  titleSv: 'Stor och Liten',
  icon: '📏',
  category: 'pussel',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'stor-liten',
  voiceIntro: 'Dra de stora sakerna till den stora lådan och de små till den lilla lådan!',

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._rounds = ctx.progress.get().custom?.rounds || 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Genomskinlig tap-fångare: tomt tryck -> lekfullt litet ljud (aldrig negativt).
    // Ligger underst så lådor och föremål (tillagda senare) alltid får sina event.
    const tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tapCatcher.eventMode = 'static'
    tapCatcher.on('pointertap', () => {
      if (!this._alive) return
      ctx.services.audio.sfx('tap')
      this._resetIdle(ctx)
    })
    this._root.addChild(tapCatcher)

    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._buildBoxes(ctx)
    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._resetIdle(ctx)
  },

  // Två lådor med tydlig storleksskillnad + text ("Stor"/"Liten") som extra ledtråd.
  _buildBoxes(ctx) {
    const big = new Container()
    big.position.set(320, 560)
    const bigBody = new Graphics()
      .roundRect(-180, -130, 360, 260, 28)
      .fill(COLORS.blue)
      .stroke({ width: 6, color: 0xffffff, alpha: 0.6 })
    const bigInner = new Graphics().roundRect(-150, -90, 300, 150, 20).fill({ color: 0x000000, alpha: 0.12 })
    const bigLabel = new Text({
      text: 'Stor',
      style: { fontFamily: FONT.title, fontSize: 40, fontWeight: '700', fill: COLORS.white },
    })
    bigLabel.anchor.set(0.5)
    bigLabel.y = 80
    big.addChild(bigBody, bigInner, bigLabel)

    const small = new Container()
    small.position.set(960, 600)
    const smallBody = new Graphics()
      .roundRect(-110, -80, 220, 160, 22)
      .fill(COLORS.orange)
      .stroke({ width: 6, color: 0xffffff, alpha: 0.6 })
    const smallInner = new Graphics().roundRect(-86, -56, 172, 82, 16).fill({ color: 0x000000, alpha: 0.12 })
    const smallLabel = new Text({
      text: 'Liten',
      style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.white },
    })
    smallLabel.anchor.set(0.5)
    smallLabel.y = 50
    small.addChild(smallBody, smallInner, smallLabel)

    this._root.addChild(big, small)
    this._bigBox = big
    this._boxes = [big, small]
    this._drag.addTarget(big, (data) => data.size === 'stor', { hitRadius: 200 })
    this._drag.addTarget(small, (data) => data.size === 'liten', { hitRadius: 150 })
  },

  // Bygg en ny runda: jämn blandning av stora/små föremål, utspridda på rutnätet.
  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    const count = Math.min(6, 2 + Math.floor(this._level / 2))
    const emoji = randomFrom(EMOJIS)
    const nBig = Math.ceil(count / 2)
    const sizes = shuffle(Array.from({ length: count }, (_, i) => (i < nBig ? 'stor' : 'liten')))
    const slots = shuffle(SPAWN_SLOTS).slice(0, count)
    this._remaining = count

    sizes.forEach((size, i) => {
      const slot = slots[i]
      const view = this._makeItem(emoji, size)
      view.position.set(slot.x + (Math.random() * 2 - 1) * 26, slot.y + (Math.random() * 2 - 1) * 20)
      this._root.addChild(view)
      view.scale.set(0)
      gsap.to(view.scale, { x: 1, y: 1, duration: 0.32, delay: i * 0.05, ease: 'back.out(1.7)' })
      this._drag.addItem(view, { size }, {
        onSelect: () => this._resetIdle(ctx),
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target),
        onWrong: (rec) => {
          if (!this._alive) return
          wiggle(rec.view) // DragController gav redan 'soft' + snäpp hem
          this._resetIdle(ctx)
          if (Math.random() < 0.35) ctx.services.voice.say('Hoppsan, prova den andra lådan!')
        },
      })
    })
    this._resetIdle(ctx)
  },

  // Föremål = vit cirkel-platta + emoji. Stor (r82/110) vs liten (r52/64) — tydlig skillnad.
  _makeItem(emoji, size) {
    const big = size === 'stor'
    const it = new Container()
    const plate = new Graphics()
      .circle(0, 0, big ? 82 : 52)
      .fill({ color: 0xffffff, alpha: 0.85 })
      .stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: big ? 110 : 64 } })
    e.anchor.set(0.5)
    it.addChild(plate, e)
    return it
  },

  // Rätt låda: glad röst + ljud, lådan studsar, föremålet poppar och krymper bort.
  _onCorrect(ctx, rec, target) {
    if (!this._alive || rec._done) return
    rec._done = true
    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(randomFrom(target.view === this._bigBox ? BIG_WORDS : SMALL_WORDS))
    this._bounceBox(target.view)
    sparkle(ctx.fxLayer, rec.view.x, rec.view.y)
    pop(rec.view)
    gsap.to(rec.view.scale, {
      x: 0,
      y: 0,
      duration: 0.32,
      delay: 0.34,
      ease: 'back.in(1.6)',
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })
    this._remaining--
    this._resetIdle(ctx)
    if (this._remaining <= 0) this._finishRound(ctx)
  },

  // Runda klar: firande + stjärna + klistermärke (via complete()), sedan ny runda.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle?.kill()
    this._rounds++
    this._level++
    ctx.progress.setCustom('rounds', this._rounds)
    ctx.progress.setLevel(this._level)
    ctx.progress.complete() // delat firande: celebrate + beröm + konfetti + stjärna + klistermärke
    this._next = gsap.delayedCall(1.4, () => {
      if (!this._alive) return
      this._newRound(ctx)
    })
  },

  _bounceBox(box) {
    gsap.killTweensOf(box.scale)
    gsap
      .timeline()
      .to(box.scale, { x: 1.08, y: 1.08, duration: 0.12, ease: 'power2.out' })
      .to(box.scale, { x: 1, y: 1, duration: 0.22, ease: 'back.out(2.4)' })
  },

  // Idle-recue: upprepar instruktionen efter ~6s tystnad. Nollställs vid varje
  // interaktion och re-armas så länge barnet är passivt.
  _resetIdle(ctx) {
    if (!this._alive) return
    this._idle?.kill()
    this._idle = gsap.delayedCall(6, () => {
      if (!this._alive || this._resolving) return
      ctx.services.voice.say(this.voiceIntro)
      this._resetIdle(ctx)
    })
  },

  destroy() {
    this._alive = false
    this._idle?.kill()
    this._next?.kill()
    this._drag?.destroy()
    if (this._boxes) {
      for (const b of this._boxes) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    }
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
