// Positiv återkoppling: studs, puls, vingel, konfetti, gnistror.
// All "belöning" är kort (1–2s) och aldrig bestraffande (se CLAUDE.md).
import { Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PLAYFUL } from './theme.js'

// Studsar in ett objekt (skala 0 -> 1).
export function bounceIn(target, { delay = 0, duration = 0.45 } = {}) {
  const sx = target.scale.x || 1
  const sy = target.scale.y || 1
  target.scale.set(0)
  return gsap.to(target.scale, { x: sx, y: sy, duration, delay, ease: 'back.out(1.7)' })
}

// Snabb glad puls (vid lyckad handling).
export function pop(target, { scale = 1.18 } = {}) {
  const sx = target.scale.x || 1
  const sy = target.scale.y || 1
  gsap.killTweensOf(target.scale)
  gsap
    .timeline()
    .to(target.scale, { x: sx * scale, y: sy * scale, duration: 0.12, ease: 'power2.out' })
    .to(target.scale, { x: sx, y: sy, duration: 0.22, ease: 'back.out(2.4)' })
}

// Vänlig vingel (vid "fel"/tomt — aldrig en bestraffning, bara lekfullt).
export function wiggle(target) {
  const r = target.rotation
  gsap.killTweensOf(target, 'rotation')
  gsap
    .timeline({ onComplete: () => (target.rotation = r) })
    .to(target, { rotation: r + 0.12, duration: 0.06 })
    .to(target, { rotation: r - 0.12, duration: 0.06 })
    .to(target, { rotation: r + 0.08, duration: 0.06 })
    .to(target, { rotation: r, duration: 0.06 })
}

// Liten partikelpuff på en plats (t.ex. när en bubbla poppas).
export function puff(layer, x, y, { count = 8, color } = {}) {
  for (let i = 0; i < count; i++) {
    const p = new Graphics().circle(0, 0, 6 + Math.random() * 8).fill(color ?? PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
    p.x = x
    p.y = y
    p.eventMode = 'none'
    layer.addChild(p)
    const ang = Math.random() * Math.PI * 2
    const dist = 40 + Math.random() * 70
    gsap.to(p, {
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      alpha: 0,
      duration: 0.5 + Math.random() * 0.3,
      ease: 'power2.out',
      onComplete: () => p.destroy(),
    })
    gsap.to(p.scale, { x: 0.2, y: 0.2, duration: 0.6 })
  }
}

// Stor men kort hyllning: konfetti regnar över skärmen.
export function bigCelebration(layer, { width = 1280, height = 720 } = {}) {
  const N = 60
  for (let i = 0; i < N; i++) {
    const size = 12 + Math.random() * 14
    const c = new Graphics()
    if (Math.random() < 0.5) c.rect(-size / 2, -size / 2, size, size).fill(PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
    else c.circle(0, 0, size / 2).fill(PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
    c.x = Math.random() * width
    c.y = -20 - Math.random() * height * 0.5
    c.rotation = Math.random() * Math.PI
    c.eventMode = 'none'
    layer.addChild(c)
    gsap.to(c, {
      y: height + 40,
      rotation: c.rotation + (Math.random() * 6 - 3),
      duration: 1.6 + Math.random() * 1.2,
      ease: 'power1.in',
      delay: Math.random() * 0.4,
      onComplete: () => c.destroy(),
    })
    gsap.to(c, { x: c.x + (Math.random() * 160 - 80), duration: 2, ease: 'sine.inOut' })
  }
}

// Gnistor runt en punkt (vid match).
export function sparkle(layer, x, y, { count = 6 } = {}) {
  for (let i = 0; i < count; i++) {
    const s = new Graphics()
    const r = 5 + Math.random() * 5
    s.star?.(0, 0, 4, r, r * 0.45)
    if (!s.star) s.circle(0, 0, r).fill(0xfff3b0)
    else s.fill(0xfff3b0)
    s.x = x
    s.y = y
    s.eventMode = 'none'
    layer.addChild(s)
    const ang = (i / count) * Math.PI * 2
    gsap.to(s, { x: x + Math.cos(ang) * 50, y: y + Math.sin(ang) * 50, alpha: 0, duration: 0.6, onComplete: () => s.destroy() })
  }
}
