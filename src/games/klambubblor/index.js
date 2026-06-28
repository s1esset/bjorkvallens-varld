// Klämbubblor — tryck/orsak-verkan (2–3 år). Referensmodul: visar hela
// pipelinen (Pixi-rendering, svensk röst/ljud, partiklar, profil-spar).
// Tryck på bubblorna -> de poppar med glada ljud. Inga felsteg, inget slut —
// när alla är poppade firar vi och ett nytt fält fylls på.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { puff } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'

export default {
  id: 'klambubblor',
  titleSv: 'Klämbubblor',
  icon: '🫧',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 3],
  bundle: 'klambubblor',
  voiceIntro: 'Tryck på bubblorna!',

  init(ctx) {
    this._alive = true
    this._layer = new Container()
    ctx.stage.addChild(this._layer)
    this._idle = 0
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _build(ctx) {
    if (!this._alive) return
    // städa ev. gammalt fält
    if (this._bubbles) this._bubbles.forEach((b) => b._bob?.kill())
    this._layer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._bubbles = []
    this._remaining = 0
    this._idle = 0

    const cols = 8
    const rows = 5
    const marginX = 160
    const marginY = 150
    const stepX = (ctx.width - marginX * 2) / (cols - 1)
    const stepY = (ctx.height - marginY * 2) / (rows - 1)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        const b = this._makeBubble(ctx, PLAYFUL[idx % PLAYFUL.length])
        b.x = marginX + c * stepX
        b.y = marginY + r * stepY
        this._layer.addChild(b)
        this._bubbles.push(b)
        this._remaining++
        b.scale.set(0)
        gsap.to(b.scale, { x: 1, y: 1, duration: 0.3, delay: idx * 0.008, ease: 'back.out(1.7)' })
      }
    }
  },

  _makeBubble(ctx, color) {
    const b = new Container()
    const r = 52
    const g = new Graphics()
      .circle(0, 0, r)
      .fill({ color, alpha: 0.5 })
      .stroke({ width: 5, color, alpha: 0.95 })
    g.circle(-r * 0.32, -r * 0.32, r * 0.26).fill({ color: 0xffffff, alpha: 0.75 })
    b.addChild(g)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    b._popped = false
    b._bob = gsap.to(b, { y: '+=7', duration: 1 + Math.random() * 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    b.on('pointertap', () => this._pop(ctx, b))
    return b
  },

  _pop(ctx, b) {
    if (!this._alive || b._popped) return
    b._popped = true
    this._remaining--
    this._idle = 0
    b._bob?.kill()
    b.eventMode = 'none'
    ctx.services.audio.sfx(Math.random() < 0.25 ? 'pling' : 'pop')
    puff(this._layer, b.x, b.y, { count: 9 })
    gsap.to(b.scale, { x: 0, y: 0, duration: 0.25, ease: 'back.in(2)', onComplete: () => (b.visible = false) })

    if (this._remaining <= 0) {
      ctx.progress.complete()
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      gsap.delayedCall(1.2, () => this._build(ctx))
    }
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && this._remaining > 0) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const live = this._bubbles.filter((b) => !b._popped)
      if (live.length) {
        const b = live[(Math.random() * live.length) | 0]
        gsap.to(b.scale, { x: 1.25, y: 1.25, duration: 0.18, yoyo: true, repeat: 3 })
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._bubbles?.forEach((b) => b._bob?.kill())
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
