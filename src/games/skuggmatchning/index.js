// Skuggmatchning — dra föremålet till sin svarta skugga (2–4 år). Pussel.
// Återanvänder DragController (snäpp/snäpp-tillbaka/tap-tap). Rätt skugga lyser
// upp i färg och föremålet snäpper på plats. Fel = mjuk studs tillbaka (aldrig
// en bestraffning). När alla skuggor fyllts: firande + ny runda — oändlig lek.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, sparkle, bigCelebration } from '../../lib/feedback.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { FONT, COLORS, PRAISE } from '../../lib/theme.js'

// Föremålspool — varje med ASCII-key, emoji och svenskt namn (åäö ok i namn).
const POOL = [
  { key: 'banan', emoji: '🍌', name: 'Banan' },
  { key: 'apple', emoji: '🍎', name: 'Äpple' },
  { key: 'stjarna', emoji: '⭐', name: 'Stjärna' },
  { key: 'boll', emoji: '⚽', name: 'Boll' },
  { key: 'hjarta', emoji: '❤️', name: 'Hjärta' },
  { key: 'bil', emoji: '🚗', name: 'Bil' },
  { key: 'blomma', emoji: '🌸', name: 'Blomma' },
  { key: 'fisk', emoji: '🐟', name: 'Fisk' },
  { key: 'sol', emoji: '☀️', name: 'Sol' },
  { key: 'hus', emoji: '🏠', name: 'Hus' },
]

const SHADOW_Y = 560
const ITEM_Y = 250

export default {
  id: 'skuggmatchning',
  titleSv: 'Skuggmatchning',
  icon: '🌑',
  category: 'pussel',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'skuggmatchning',
  voiceIntro: 'Dra sakerna till rätt skugga!',

  init(ctx) {
    this._alive = true
    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk sandfärgad markremsa (dekor — fångar inga pekningar).
    const ground = new Graphics().roundRect(40, 470, 1200, 210, 40).fill(0xece3d0)
    ground.eventMode = 'none'
    this._root.addChild(ground)

    // Bräda för rundans föremål/skuggor (rensas mellan rundor; marken ligger kvar).
    this._board = new Container()
    this._root.addChild(this._board)

    this._drag = new DragController({ space: this._board, services: ctx.services })
    this._shadows = []
    this._items = []
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    // Idle-recue: nollställ vid varje pekning (bubblar upp till root).
    this._idle = 0
    this._root.eventMode = 'static'
    this._resetIdle = () => (this._idle = 0)
    this._root.on('pointerdown', this._resetIdle)
    this._tickerRef = ctx.ticker
    this._tick = (t) => {
      if (!this._alive) return
      this._idle += t.deltaMS
      if (this._idle >= 6000) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
      }
    }
    ctx.ticker.add(this._tick)

    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _newRound(ctx) {
    if (!this._alive) return
    // Avregistrera förra rundans drag/mål och städa dess vyer.
    this._drag.clear()
    this._shadows.forEach((s) => this._killViewTweens(s))
    this._items.forEach((it) => this._killViewTweens(it))
    this._board.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._shadows = []
    this._items = []
    this._placed = 0
    this._resolving = false
    this._idle = 0

    const count = Math.min(2 + Math.floor(this._level / 2), 4)
    const picks = shuffle(POOL).slice(0, count)
    const shadowOrder = shuffle(picks)
    const itemOrder = shuffle(picks)
    const xs = this._slots(ctx, count)

    // Skuggor (mål) på marken.
    shadowOrder.forEach((pick, i) => {
      const shadow = this._makeShadow(pick)
      shadow.x = xs[i]
      shadow.y = SHADOW_Y
      this._board.addChild(shadow)
      this._shadows.push(shadow)
      const key = pick.key
      this._drag.addTarget(shadow, (data) => data.key === key, { hitRadius: 150 })
    })

    // Förrådsföremål (källor) upptill, oberoende blandad ordning.
    itemOrder.forEach((pick, i) => {
      const item = this._makeItem(pick)
      item.x = xs[i]
      item.y = ITEM_Y
      this._board.addChild(item)
      this._items.push(item)
      bounceIn(item, { delay: i * 0.06 })
      this._drag.addItem(item, { key: pick.key, name: pick.name }, {
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target, pick),
        onWrong: (rec, target) => this._onWrong(ctx, rec, target),
      })
    })
  },

  _slots(ctx, count) {
    const slotW = 220
    const gap = 60
    const totalW = count * slotW + (count - 1) * gap
    const startX = (ctx.width - totalW) / 2 + slotW / 2
    const xs = []
    for (let i = 0; i < count; i++) xs.push(startX + i * (slotW + gap))
    return xs
  },

  _makeShadow(pick) {
    const s = new Container()
    const oval = new Graphics().ellipse(0, 30, 95, 40).fill({ color: 0x000000, alpha: 0.12 })
    oval.eventMode = 'none'
    // Mörk silhuett (tint -> äkta svart skugga oavsett emojins egna färger).
    const dark = new Text({ text: pick.emoji, style: { fontFamily: FONT.body, fontSize: 120 } })
    dark.anchor.set(0.5)
    dark.tint = 0x000000
    dark.alpha = 0.85
    // Samma emoji i full färg, börjar osynlig — tonas in vid match.
    const color = new Text({ text: pick.emoji, style: { fontFamily: FONT.body, fontSize: 120 } })
    color.anchor.set(0.5)
    color.alpha = 0
    s.addChild(oval, dark, color)
    s._dark = dark
    s._color = color
    return s
  },

  _makeItem(pick) {
    const it = new Container()
    const bg = new Graphics().circle(0, 0, 82).fill({ color: 0xffffff, alpha: 0.9 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: pick.emoji, style: { fontFamily: FONT.body, fontSize: 104 } })
    e.anchor.set(0.5)
    it.addChild(bg, e)
    return it
  },

  _onCorrect(ctx, rec, target, pick) {
    if (!this._alive) return
    ctx.services.audio.sfx('match')
    sparkle(ctx.fxLayer, target.view.x, target.view.y)
    // Skuggan blommar ut i färg.
    const sh = target.view
    gsap.to(sh._dark, { alpha: 0, duration: 0.25 })
    gsap.to(sh._color, { alpha: 1, duration: 0.25 })
    // Glad puls, sedan göm/destruera föremålet (färgemojin sitter nu i skuggan).
    pop(rec.view)
    gsap.to(rec.view, {
      alpha: 0,
      duration: 0.25,
      delay: 0.35,
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })
    ctx.services.voice.say(pick.name)
    this._placed++
    if (this._placed >= this._shadows.length) this._finishRound(ctx)
  },

  _onWrong(ctx, rec, target) {
    if (!this._alive || this._resolving) return
    // DragController spelar redan 'soft' + snäpper hem. Lägg lekfull återkoppling.
    wiggle(rec.view)
    if (target) gsap.timeline().to(target.view, { y: '-=14', duration: 0.1 }).to(target.view, { y: '+=14', duration: 0.16 })
  },

  _finishRound(ctx) {
    if (!this._alive) return
    this._resolving = true
    ctx.services.audio.sfx('celebrate')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.services.voice.say(randomFrom(PRAISE))
    this._level++
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()
    this._roundCall = gsap.delayedCall(1.4, () => this._newRound(ctx))
  },

  _killViewTweens(v) {
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    if (v._dark) gsap.killTweensOf(v._dark)
    if (v._color) gsap.killTweensOf(v._color)
  },

  destroy() {
    this._alive = false
    this._roundCall?.kill()
    this._tickerRef?.remove(this._tick)
    if (this._resetIdle) this._root?.off('pointerdown', this._resetIdle)
    this._drag?.destroy()
    this._shadows?.forEach((s) => this._killViewTweens(s))
    this._items?.forEach((it) => this._killViewTweens(it))
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
