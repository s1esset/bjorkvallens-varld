// Positiv återkoppling: studs, puls, vingel, konfetti, gnistror.
// All "belöning" är kort (1–2s) och aldrig bestraffande (se CLAUDE.md).
import { Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PLAYFUL, FONT } from './theme.js'

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
    // Tweena ett vanligt JS-objekt och kopiera till Pixi-objektet endast om det
    // lever. Ett förstört objekt (t.ex. vid spel-exit) hoppas över -> kan ALDRIG
    // krascha på null-transform.
    const st = { x, y, s: 1, a: 1 }
    const tw = gsap.to(st, {
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      s: 0.2,
      a: 0,
      duration: 0.5 + Math.random() * 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (p.destroyed) {
          tw.kill()
          return
        }
        p.x = st.x
        p.y = st.y
        p.alpha = st.a
        p.scale.set(st.s)
      },
      onComplete: () => {
        if (!p.destroyed) p.destroy()
      },
    })
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
    const x0 = Math.random() * width
    const y0 = -20 - Math.random() * height * 0.5
    const rot0 = Math.random() * Math.PI
    c.x = x0
    c.y = y0
    c.rotation = rot0
    c.eventMode = 'none'
    layer.addChild(c)
    // Samma robusta mönster: tweena ett JS-objekt, kopiera bara om konfettin lever.
    const st = { x: x0, y: y0, r: rot0 }
    const tw = gsap.to(st, {
      x: x0 + (Math.random() * 160 - 80),
      y: height + 40,
      r: rot0 + (Math.random() * 6 - 3),
      duration: 1.6 + Math.random() * 1.2,
      delay: Math.random() * 0.4,
      ease: 'power1.in',
      onUpdate: () => {
        if (c.destroyed) {
          tw.kill()
          return
        }
        c.x = st.x
        c.y = st.y
        c.rotation = st.r
      },
      onComplete: () => {
        if (!c.destroyed) c.destroy()
      },
    })
  }
}

// Svävande text/emoji som stiger och tonar bort (t.ex. "Hihi!" eller 😄).
// Exit-säker: tweenar ett vanligt objekt och rör Pixi-objektet bara om det lever.
export function floatText(layer, x, y, text, { fontSize = 54, rise = 90, duration = 0.9, fontFamily = FONT.body } = {}) {
  const t = new Text({ text, style: { fontFamily, fontSize } })
  t.anchor.set(0.5)
  t.position.set(x, y)
  t.eventMode = 'none'
  layer.addChild(t)
  const st = { y, a: 1 }
  const tw = gsap.to(st, {
    y: y - rise,
    a: 0,
    duration,
    ease: 'power1.out',
    onUpdate: () => {
      if (t.destroyed) {
        tw.kill()
        return
      }
      t.y = st.y
      t.alpha = st.a
    },
    onComplete: () => {
      if (!t.destroyed) t.destroy()
    },
  })
  return t
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
