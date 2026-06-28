// Liten, lugn avi-text (t.ex. "Klar att spela offline"). Ritas i Pixi.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, FONT, DESIGN_W } from './theme.js'

export function showToast(layer, message, { duration = 2.6 } = {}) {
  const c = new Container()
  const t = new Text({
    text: message,
    style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.white, align: 'center' },
  })
  t.anchor.set(0.5)
  const padX = 30
  const padY = 16
  const bg = new Graphics()
    .roundRect(-(t.width / 2 + padX), -(t.height / 2 + padY), t.width + padX * 2, t.height + padY * 2, 26)
    .fill({ color: COLORS.ink, alpha: 0.92 })
  c.addChild(bg, t)
  c.x = DESIGN_W / 2
  c.y = 84
  c.alpha = 0
  c.eventMode = 'none'
  layer.addChild(c)
  gsap
    .timeline()
    .to(c, { alpha: 1, y: 108, duration: 0.3, ease: 'back.out(2)' })
    .to(c, { alpha: 0, y: 84, duration: 0.4, delay: duration, onComplete: () => c.destroy({ children: true }) })
  return c
}
