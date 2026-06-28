// Sortera Skräp — dra och släpp (3–5 år). Härdar den återanvändbara DragController
// (stor träffyta, snäpp, snäpp-tillbaka, tap-tap-fallback). Dra varje föremål till
// rätt tunna. Fel = mjuk studs tillbaka (aldrig en bestraffning).
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle } from '../../lib/swedish.js'
import { wiggle } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

const CATS = {
  papper: { label: 'Papper', color: 0x4aa3df, items: ['📄', '📰', '📦', '✉️'] },
  plast: { label: 'Plast', color: 0xffb14a, items: ['🥤', '🧴', '🍶', '🛍️'] },
  mat: { label: 'Mat', color: 0x5bbf6a, items: ['🍌', '🍎', '🥕', '🍂'] },
}

export default {
  id: 'sortera-skrap',
  titleSv: 'Sortera Skräp',
  icon: '♻️',
  category: 'drag',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'sortera-skrap',
  voiceIntro: 'Sortera skräpet i rätt tunna!',

  init(ctx) {
    this._alive = true
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._bins = []
    this._buildBins(ctx)
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newBatch(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _buildBins(ctx) {
    const keys = Object.keys(CATS)
    const n = keys.length
    const binW = 270
    const binH = 200
    const gap = 70
    const totalW = n * binW + (n - 1) * gap
    const startX = (ctx.width - totalW) / 2 + binW / 2
    const y = ctx.height - 150

    keys.forEach((key, i) => {
      const cat = CATS[key]
      const bin = new Container()
      bin.x = startX + i * (binW + gap)
      bin.y = y
      const body = new Graphics()
        .roundRect(-binW / 2, -binH / 2, binW, binH, 28)
        .fill(cat.color)
        .stroke({ width: 6, color: 0xffffff, alpha: 0.6 })
      const lid = new Graphics().roundRect(-binW / 2 - 10, -binH / 2 - 28, binW + 20, 38, 16).fill(shade(cat.color, 0.18))
      lid.y = 0
      const label = new Text({
        text: cat.label,
        style: { fontFamily: FONT.title, fontSize: 42, fontWeight: '700', fill: COLORS.white },
      })
      label.anchor.set(0.5)
      label.y = 14
      bin.addChild(body, lid, label)
      bin._lid = lid
      bin._cat = key
      this._root.addChild(bin)
      this._bins.push(bin)
      this._drag.addTarget(bin, (data) => data.category === key, { hitRadius: 175 })
    })
  },

  _newBatch(ctx) {
    if (!this._alive) return
    const keys = Object.keys(CATS)
    const batch = []
    for (let i = 0; i < 6; i++) {
      const key = keys[i % keys.length]
      const emoji = CATS[key].items[(Math.random() * CATS[key].items.length) | 0]
      batch.push({ category: key, emoji })
    }
    this._queue = shuffle(batch)
    this._spawnNext(ctx)
  },

  _spawnNext(ctx) {
    if (!this._alive) return
    if (!this._queue.length) {
      ctx.progress.setLevel(this._level + 1)
      ctx.progress.complete()
      gsap.delayedCall(1.3, () => this._newBatch(ctx))
      return
    }
    const data = this._queue.shift()
    const item = this._makeItem(data)
    item.x = ctx.width / 2
    item.y = 250
    this._root.addChild(item)
    item.scale.set(0)
    gsap.to(item.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(1.7)' })

    this._drag.addItem(item, data, {
      onCorrect: (rec, target) => {
        if (!this._alive) return
        ctx.services.audio.sfx('correct')
        ctx.services.voice.say('Rätt!')
        const lid = target.view?._lid
        if (lid) gsap.timeline().to(lid.scale, { y: 0.4, duration: 0.1 }).to(lid.scale, { y: 1, duration: 0.16 })
        gsap.to(rec.view, { alpha: 0, duration: 0.2, onComplete: () => rec.view.destroy({ children: true }) })
        this._spawnNext(ctx)
      },
      onWrong: (rec) => {
        if (!this._alive) return
        wiggle(rec.view)
      },
    })
  },

  _makeItem(data) {
    const it = new Container()
    const bg = new Graphics().circle(0, 0, 78).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: data.emoji, style: { fontFamily: FONT.body, fontSize: 98 } })
    e.anchor.set(0.5)
    it.addChild(bg, e)
    return it
  },

  destroy() {
    this._alive = false
    this._drag?.destroy()
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
