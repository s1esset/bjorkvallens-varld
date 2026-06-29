// Räkna Äpplena — räkne-/lärande-tap-spel (3–5 år). Ett gäng äpplen studsar in
// i plockzonen; barnet trycker på ett i taget, äpplet susar ner i korgen och
// rösten räknar "ett, två, tre...". När alla i rundan är plockade säger vi
// totalen ("Fem äpplen!"), firar och startar en ny (ev. större) runda. Inga
// felsteg, ingen timer, ingen poäng som sjunker — tomt tryck är bara en lekfull
// vingel. All async är skyddad med this._alive (exit-säkert).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, pop, wiggle, sparkle, bigCelebration } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Räkneorden 1–5 (rundans mål håller sig alltid inom 1–5).
const RAKNEORD = ['ett', 'två', 'tre', 'fyra', 'fem']

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Hel total-fras: "Ett äpple!" / "Fem äpplen!".
function totalPhrase(n) {
  const word = capitalize(RAKNEORD[n - 1] || String(n))
  return `${word} ${n === 1 ? 'äpple' : 'äpplen'}!`
}

export default {
  id: 'rakna-applen',
  titleSv: 'Räkna Äpplena',
  icon: '🍎',
  category: 'larande',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'rakna-applen',
  voiceIntro: 'Tryck på äpplena och räkna med mig!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._count = 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: lugn äng (bg-färg + grön mark-remsa nedtill). Dekorativ.
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    const ground = new Graphics().rect(0, 560, ctx.width, 160).fill(COLORS.green)
    bg.eventMode = 'none'
    ground.eventMode = 'none'
    this._root.addChild(bg, ground)

    // Träd-dekor till vänster (backdrop) så topp-mitten är fri för progress-raden.
    const tree = new Text({ text: '🌳', style: { fontFamily: FONT.body, fontSize: 180, align: 'center' } })
    tree.anchor.set(0.5)
    tree.position.set(150, 470)
    tree.eventMode = 'none'
    this._root.addChild(tree)

    // Heltäckande, osynlig tap-fångare: tryck bredvid äpplena -> mjuk respons.
    // Ligger UNDER äpple-lagret, så äpplen får tryck först.
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(tap)

    // Korg nere till höger (programmatisk grafik, dekorativ).
    this._root.addChild(this._makeBasket())

    // Stor räknesiffra i mitten (börjar dold, pulserar vid varje plock).
    this._bigNum = new Text({
      text: '',
      style: { fontFamily: FONT.display, fontSize: 220, fontWeight: '700', fill: COLORS.orangeDark, align: 'center' },
    })
    this._bigNum.anchor.set(0.5)
    this._bigNum.position.set(640, 360)
    this._bigNum.alpha = 0
    this._bigNum.eventMode = 'none'
    this._root.addChild(this._bigNum)

    // Liten progress-rad (tomma konturer som fylls med 🍎). Dekorativ.
    this._progLayer = new Container()
    this._progLayer.eventMode = 'none'
    this._root.addChild(this._progLayer)

    // Äpple-lager (det enda interaktiva, ligger överst).
    this._appleLayer = new Container()
    this._root.addChild(this._appleLayer)

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Korg: kropp + ljus kant + ett par vävlinjer.
  _makeBasket() {
    const c = new Container()
    c.position.set(980, 620)
    const g = new Graphics()
    g.roundRect(-150, -60, 300, 120, 30).fill(COLORS.brown)
    g.moveTo(-150, -18).lineTo(150, -18)
    g.moveTo(-150, 18).lineTo(150, 18)
    g.stroke({ width: 5, color: 0x6e4528, alpha: 0.7 })
    g.roundRect(-156, -66, 312, 26, 13).fill(0x9c6b46)
    c.addChild(g)
    c.eventMode = 'none'
    return c
  },

  // Cellrutnät i plockzonen (x∈[180,1100], y∈[150,470]) med liten slump-jitter
  // så äpplen aldrig hamnar så nära att hit-halon överlappar.
  _cells() {
    const cols = 5
    const rows = 2
    const x0 = 180
    const x1 = 1100
    const y0 = 150
    const y1 = 470
    const out = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x0 + ((x1 - x0) * (c + 0.5)) / cols
        const cy = y0 + ((y1 - y0) * (r + 0.5)) / rows
        out.push({ x: cx + (Math.random() * 2 - 1) * 18, y: cy + (Math.random() * 2 - 1) * 18 })
      }
    }
    return out
  },

  // En äpple-bricka: vit cirkel + 🍎. Generös hitArea (radie 96) för små fingrar.
  _makeApple(ctx) {
    const a = new Container()
    const disc = new Graphics().circle(0, 0, 70).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: 0xeadfca })
    disc.eventMode = 'none'
    const face = new Text({ text: '🍎', style: { fontFamily: FONT.body, fontSize: 96, align: 'center' } })
    face.anchor.set(0.5)
    face.eventMode = 'none'
    a.addChild(disc, face)
    a.eventMode = 'static'
    a.cursor = 'pointer'
    a.hitArea = new Circle(0, 0, 96)
    a._picked = false
    a.on('pointertap', () => this._pick(ctx, a))
    return a
  },

  // Tomma progress-konturer kring (640, 130).
  _buildProgress(n) {
    this._progLayer.removeChildren().forEach((o) => o.destroy())
    this._progDots = []
    const gap = 60
    const totalW = (n - 1) * gap
    for (let i = 0; i < n; i++) {
      const d = new Graphics().circle(0, 0, 22).stroke({ width: 4, color: COLORS.inkSoft })
      d.position.set(640 - totalW / 2 + i * gap, 130)
      d.eventMode = 'none'
      this._progLayer.addChild(d)
      this._progDots.push(d)
    }
  },

  // Fyll progress-kontur i med en liten 🍎.
  _fillProgress(i) {
    const d = this._progDots?.[i]
    if (!d) return
    d.clear().circle(0, 0, 22).fill({ color: COLORS.red, alpha: 0.25 }).stroke({ width: 4, color: COLORS.inkSoft })
    const e = new Text({ text: '🍎', style: { fontFamily: FONT.body, fontSize: 32, align: 'center' } })
    e.anchor.set(0.5)
    e.position.copyFrom(d.position)
    e.eventMode = 'none'
    this._progLayer.addChild(e)
    bounceIn(e, { duration: 0.35 })
  },

  // Stapelplats i korgen för det i:te plockade äpplet.
  _stackPos(i, target) {
    const spacing = 58
    return { x: 980 + (i - (target - 1) / 2) * spacing, y: 555 }
  },

  // Ny runda: rensa, beräkna mål (2..5), spawna äpplen med studs + stagger.
  _newRound(ctx) {
    if (!this._alive) return
    this._count = 0
    this._resolving = false
    this._idle = 0
    this._target = Math.min(5, 2 + this._level)

    this._appleLayer.removeChildren().forEach((o) => {
      gsap.killTweensOf(o)
      gsap.killTweensOf(o.scale)
      o.destroy({ children: true })
    })
    this._apples = []

    gsap.killTweensOf(this._bigNum.scale)
    this._bigNum.alpha = 0
    this._bigNum.scale.set(1)
    this._bigNum.text = ''

    this._buildProgress(this._target)

    const cells = shuffle(this._cells()).slice(0, this._target)
    cells.forEach((pos, i) => {
      const a = this._makeApple(ctx)
      a.position.set(pos.x, pos.y)
      this._appleLayer.addChild(a)
      this._apples.push(a)
      bounceIn(a, { delay: i * 0.09 })
    })
  },

  // Plocka ett äpple: räkna upp, pulsa siffran, fyll progress, flyg till korgen.
  _pick(ctx, a) {
    if (!this._alive || this._resolving || a._picked) return
    a._picked = true
    a.eventMode = 'none'
    this._idle = 0
    this._count++

    ctx.services.audio.sfx('pop')
    this._showBig(this._count)
    this._fillProgress(this._count - 1)
    ctx.services.voice.say(RAKNEORD[this._count - 1] || String(this._count))

    const stack = this._stackPos(this._count - 1, this._target)
    gsap.killTweensOf(a)
    gsap.killTweensOf(a.scale)
    gsap.to(a.scale, { x: 0.55, y: 0.55, duration: 0.45, ease: 'power2.inOut' })
    gsap.to(a, { x: stack.x, y: stack.y, duration: 0.45, ease: 'power2.inOut' })
    ctx.services.audio.sfx('whoosh')

    if (this._count >= this._target) this._finish(ctx)
  },

  // Visa/pulsa den stora siffran.
  _showBig(n) {
    this._bigNum.text = String(n)
    this._bigNum.alpha = 1
    pop(this._bigNum, { scale: 1.3 })
  },

  // Runda klar: total-fras + firande, spara nivå, sedan ny runda.
  _finish(ctx) {
    if (!this._alive) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(`${totalPhrase(this._count)} ${randomFrom(PRAISE)}`)
    sparkle(ctx.fxLayer, 980, 600)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete()

    this._celebrate = gsap.delayedCall(0.35, () => {
      if (this._alive) ctx.services.audio.sfx('celebrate')
    })
    this._next = gsap.delayedCall(1.4, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Tomt tryck (bredvid äpplena): mjukt ljud + vänlig vingel. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    const live = this._apples?.filter((a) => !a._picked) || []
    if (live.length) wiggle(randomFrom(live))
  },

  // Idle-recue: ~6s utan plock -> upprepa ledtråd + vingla ett oplockat äpple.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && this._count < this._target) {
      this._idle = 0
      ctx.services.voice.say('Tryck på ett äpple till!')
      const live = this._apples?.filter((a) => !a._picked) || []
      if (live.length) wiggle(randomFrom(live))
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._celebrate?.kill()
    this._next?.kill()
    this._apples?.forEach((a) => {
      gsap.killTweensOf(a)
      gsap.killTweensOf(a.scale)
    })
    gsap.killTweensOf(this._bigNum?.scale)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
