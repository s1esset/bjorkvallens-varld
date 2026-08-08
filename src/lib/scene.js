// Återanvändbara, "marknadsmässiga" bakgrunder för spelen. Ett enda anrop ger en
// mjuk gradient-himmel + dekor (moln, sol, kullar, bokeh, stjärnor) som höjer
// känslan rejält jämfört med platt beige. Allt är dekorativt (eventMode 'none')
// och exit-säkert: drivande moln tweenar en {}-proxy och rör Pixi-objektet bara
// om det lever (samma mönster som lib/feedback.js).
import { Container, Graphics, FillGradient } from 'pixi.js'
import { gsap } from 'gsap'
import { DESIGN_W, DESIGN_H } from './theme.js'
import { sphereFill } from './form.js'

// Molnens fyllning delas mellan alla moln i hela appen (samma vita klot-gradient, byggd en
// gång) i stället för en ny FillGradient per moln — se lib/form.js.
const CLOUD_FILL = sphereFill(0xffffff, { lightY: 0.2, spread: 0.62, dark: 0.14 })

// Färgtema per "miljö". top/bottom = himmelsgradient, ground = ev. markremsa.
const THEMES = {
  sky: { top: 0xaee3fb, bottom: 0xeaf7ea, ground: 0x7fd07f, groundDark: 0x5bbf6a, sun: true, clouds: 3 },
  meadow: { top: 0xbfe9ff, bottom: 0xdcf5cf, ground: 0x86d27a, groundDark: 0x5bbf6a, sun: true, clouds: 2, hills: true },
  sunset: { top: 0xffd9a0, bottom: 0xffc0cb, ground: 0xc79bdc, groundDark: 0xa78bfa, sun: 0xffe6a8, clouds: 2 },
  candy: { top: 0xffe3f1, bottom: 0xe9e0ff, ground: 0xffc4e0, groundDark: 0xff9ec4, bokeh: 10 },
  water: { top: 0xbdeefa, bottom: 0x8fd6ee, ground: 0x4aa3df, groundDark: 0x3f8fc6, bokeh: 6 },
  night: { top: 0x1b2a5b, bottom: 0x3a2f6b, ground: 0x2a2550, groundDark: 0x201b40, stars: 26 },
  warm: { top: 0xfff0d6, bottom: 0xfde8cf, ground: 0xffd9a8, groundDark: 0xf5c98a, bokeh: 8 },
}

// Skapa en scen-bakgrund. theme = nyckel i THEMES eller eget objekt.
// opts: { width, height, ground(bool), groundH } — ground default på om temat har ground.
export function createScene(theme = 'sky', opts = {}) {
  const t = typeof theme === 'string' ? THEMES[theme] || THEMES.sky : theme
  const width = opts.width ?? DESIGN_W
  const height = opts.height ?? DESIGN_H
  const showGround = opts.ground ?? !!t.ground
  const groundH = opts.groundH ?? 96

  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false

  // Himmel (lodrät gradient).
  const sky = new Graphics()
  paintVGradient(sky, width, height, t.top, t.bottom)
  root.addChild(sky)

  // Sol (mjuk halo + skiva) uppe till vänster/höger.
  if (t.sun) {
    const sunColor = typeof t.sun === 'number' ? t.sun : 0xffe27a
    const sun = new Container()
    sun.addChild(new Graphics().circle(0, 0, 120).fill({ color: sunColor, alpha: 0.18 }))
    sun.addChild(new Graphics().circle(0, 0, 84).fill({ color: sunColor, alpha: 0.28 }))
    sun.addChild(new Graphics().circle(0, 0, 58).fill({ color: sunColor }))
    sun.position.set(opts.sunX ?? 150, opts.sunY ?? 130)
    root.addChild(sun)
  }

  // Stjärnor (nattema): små tindrande prickar.
  if (t.stars) {
    for (let i = 0; i < t.stars; i++) {
      const r = 1.5 + Math.random() * 2.5
      const s = new Graphics().circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.85 })
      s.position.set(Math.random() * width, Math.random() * height * 0.7)
      root.addChild(s)
      twinkle(s, 1.2 + Math.random() * 2)
    }
  }

  // Bokeh: mjuka genomskinliga cirklar för djup.
  if (t.bokeh) {
    for (let i = 0; i < t.bokeh; i++) {
      const r = 40 + Math.random() * 110
      const b = new Graphics().circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.08 + Math.random() * 0.08 })
      b.position.set(Math.random() * width, Math.random() * height * 0.85)
      root.addChild(b)
    }
  }

  // Mark (rundad kulle-remsa nederst).
  if (showGround) {
    const gy = height - groundH
    const ground = new Graphics()
    ground.roundRect(-40, gy, width + 80, groundH + 80, 60).fill(t.ground)
    ground.roundRect(-40, gy, width + 80, 14, 60).fill({ color: t.groundDark, alpha: 0.5 })
    root.addChild(ground)
    if (t.hills) {
      // Ett par mjuka kullar bakom marken.
      const h1 = new Graphics().circle(width * 0.25, gy + 30, 220).fill({ color: t.groundDark, alpha: 0.35 })
      const h2 = new Graphics().circle(width * 0.78, gy + 40, 280).fill({ color: t.groundDark, alpha: 0.3 })
      root.addChildAt(h2, root.getChildIndex(ground))
      root.addChildAt(h1, root.getChildIndex(ground))
    }
  }

  // Moln som långsamt driver (exit-säkert).
  const cloudCount = t.clouds || 0
  for (let i = 0; i < cloudCount; i++) {
    const cloud = makeCloud(0.8 + Math.random() * 0.7)
    const y = 70 + Math.random() * (height * 0.32)
    cloud.position.set(Math.random() * width, y)
    cloud.alpha = 0.92
    root.addChild(cloud)
    driftCloud(cloud, width)
  }

  return root
}

// --- helpers ---

function paintVGradient(g, w, h, top, bottom) {
  g.rect(0, 0, w, h).fill(
    new FillGradient({ colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }] })
  )
}

function makeCloud(scale = 1) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  const w = 70 * scale
  g.circle(-w * 0.7, 6 * scale, 26 * scale).fill(CLOUD_FILL)
  g.circle(0, -8 * scale, 38 * scale).fill(CLOUD_FILL)
  g.circle(w * 0.7, 6 * scale, 30 * scale).fill(CLOUD_FILL)
  g.roundRect(-w, 10 * scale, w * 2, 30 * scale, 18 * scale).fill(CLOUD_FILL)
  c.addChild(g)
  return c
}

function driftCloud(cloud, width) {
  const speed = 22 + Math.random() * 18 // px/s
  const st = { x: cloud.x }
  const run = () => {
    if (cloud.destroyed) return
    const dur = Math.max(4, (width + 130 - st.x) / speed)
    const tw = gsap.to(st, {
      x: width + 130,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        if (cloud.destroyed) {
          tw.kill()
          return
        }
        cloud.x = st.x
      },
      onComplete: () => {
        if (cloud.destroyed) return
        st.x = -130
        run()
      },
    })
  }
  run()
}

function twinkle(star, dur) {
  const st = { a: star.alpha }
  const tw = gsap.to(st, {
    a: 0.25,
    duration: dur,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    onUpdate: () => {
      if (star.destroyed) {
        tw.kill()
        return
      }
      star.alpha = st.a
    },
  })
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}
