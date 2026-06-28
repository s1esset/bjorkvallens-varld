// Bobo — Barnspels maskot. Ritas med Pixi Graphics (inga bildtillgångar),
// samma ansikte som app-ikonen. Returnerar en Container centrerad i (0,0).
import { Container, Graphics } from 'pixi.js'
import { COLORS } from './theme.js'

export function makeMascot(faceR = 120) {
  const c = new Container()
  const g = new Graphics()

  // öron
  const earR = faceR * 0.32
  g.circle(-faceR * 0.78, -faceR * 0.78, earR).fill(COLORS.cream)
  g.circle(faceR * 0.78, -faceR * 0.78, earR).fill(COLORS.cream)
  // mjuk skuggkant under ansiktet
  g.circle(0, faceR * 0.06, faceR).fill(COLORS.orangeDark)
  // ansikte
  g.circle(0, 0, faceR).fill(COLORS.cream)
  // kinder
  g.circle(-faceR * 0.56, faceR * 0.22, faceR * 0.18).fill(COLORS.pink)
  g.circle(faceR * 0.56, faceR * 0.22, faceR * 0.18).fill(COLORS.pink)

  c.addChild(g)

  // ögon (egna grafik så vi kan blinka)
  const eyes = new Graphics()
  const eyeR = faceR * 0.13
  const dx = faceR * 0.36
  const ey = -faceR * 0.12
  eyes.circle(-dx, ey, eyeR).fill(COLORS.ink)
  eyes.circle(dx, ey, eyeR).fill(COLORS.ink)
  eyes.circle(-dx + eyeR * 0.35, ey - eyeR * 0.35, eyeR * 0.35).fill(COLORS.cream)
  eyes.circle(dx + eyeR * 0.35, ey - eyeR * 0.35, eyeR * 0.35).fill(COLORS.cream)
  c.addChild(eyes)

  // leende
  const mouth = new Graphics()
  mouth
    .arc(0, faceR * 0.05, faceR * 0.42, 0.12 * Math.PI, 0.88 * Math.PI)
    .stroke({ width: faceR * 0.1, color: COLORS.ink, cap: 'round' })
  c.addChild(mouth)

  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
