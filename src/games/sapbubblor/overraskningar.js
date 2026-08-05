// Överraskningarna som flyter ut ur en "överraskningsbubbla" — tidigare emoji
// (⭐🦋🐠🌸🐝🍓🌈🐥), nu ritade med egen silhuett enligt P0 ASSETS. Varje ritare
// arbetar centrerat i (0,0) med `s` = ungefär halva figurens höjd i px.
//
// REGEL (sjätte läckan, se docs/POLERINGSRUNDA.md): `.arc()` i en delad Graphics
// fortsätter den aktuella vägen. Varje båge föregås därför av ett `moveTo` till
// bågens startpunkt via hjälparen `bage()`, annars dras ett streck från förra formen.
import { Graphics } from 'pixi.js'
import { COLORS } from '../../lib/theme.js'

const bage = (g, cx, cy, r, a0, a1) =>
  g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1)

const DRAW = {
  // Fjäril — två vingpar, mörk kropp, böjda antenner.
  fjaril(g, s) {
    g.ellipse(-s * 0.46, s * 0.30, s * 0.40, s * 0.34).fill(COLORS.pink)
    g.ellipse(s * 0.46, s * 0.30, s * 0.40, s * 0.34).fill(COLORS.pink)
    g.ellipse(-s * 0.52, -s * 0.26, s * 0.48, s * 0.40).fill(COLORS.purple)
    g.ellipse(s * 0.52, -s * 0.26, s * 0.48, s * 0.40).fill(COLORS.purple)
    g.circle(-s * 0.54, -s * 0.28, s * 0.12).fill(COLORS.yellow)
    g.circle(s * 0.54, -s * 0.28, s * 0.12).fill(COLORS.yellow)
    g.roundRect(-s * 0.09, -s * 0.58, s * 0.18, s * 1.14, s * 0.09).fill(COLORS.ink)
    g.moveTo(-s * 0.05, -s * 0.55).quadraticCurveTo(-s * 0.28, -s * 0.86, -s * 0.34, -s * 0.98)
      .stroke({ width: Math.max(2, s * 0.08), color: COLORS.ink, cap: 'round' })
    g.moveTo(s * 0.05, -s * 0.55).quadraticCurveTo(s * 0.28, -s * 0.86, s * 0.34, -s * 0.98)
      .stroke({ width: Math.max(2, s * 0.08), color: COLORS.ink, cap: 'round' })
  },

  // Fisk — kropp, stjärtfena, ryggfena, öga och en liten mun.
  fisk(g, s) {
    g.poly([s * 0.42, 0, s * 0.98, -s * 0.46, s * 0.98, s * 0.46]).fill(COLORS.teal)
    g.poly([-s * 0.10, -s * 0.44, s * 0.24, -s * 0.86, s * 0.32, -s * 0.40]).fill(COLORS.blue)
    g.ellipse(-s * 0.06, 0, s * 0.66, s * 0.48).fill(COLORS.blue)
    g.ellipse(-s * 0.06, s * 0.14, s * 0.50, s * 0.28).fill(0x9ad0ff)
    g.circle(-s * 0.40, -s * 0.10, s * 0.13).fill(0xffffff)
    g.circle(-s * 0.43, -s * 0.10, s * 0.07).fill(COLORS.ink)
    bage(g, -s * 0.52, s * 0.12, s * 0.16, -0.5, 0.9)
      .stroke({ width: Math.max(2, s * 0.07), color: COLORS.ink, alpha: 0.7, cap: 'round' })
  },

  // Blomma — fem kronblad runt en gul mitt.
  blomma(g, s) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      g.ellipse(Math.cos(a) * s * 0.52, Math.sin(a) * s * 0.52, s * 0.36, s * 0.36).fill(COLORS.pink)
    }
    g.circle(0, 0, s * 0.30).fill(COLORS.yellow).stroke({ width: Math.max(2, s * 0.07), color: COLORS.orange })
    g.circle(-s * 0.09, -s * 0.09, s * 0.09).fill({ color: 0xffffff, alpha: 0.7 })
  },

  // Bi — randig kropp, genomskinliga vingar, gadd.
  bi(g, s) {
    g.ellipse(-s * 0.26, -s * 0.34, s * 0.34, s * 0.22).fill({ color: 0xffffff, alpha: 0.75 })
    g.ellipse(s * 0.26, -s * 0.34, s * 0.34, s * 0.22).fill({ color: 0xffffff, alpha: 0.75 })
    g.poly([s * 0.62, 0, s * 0.92, -s * 0.10, s * 0.92, s * 0.10]).fill(COLORS.ink)
    g.ellipse(0, s * 0.06, s * 0.66, s * 0.42).fill(COLORS.yellow)
    for (let i = -1; i <= 1; i++) {
      g.roundRect(i * s * 0.30 - s * 0.07, s * 0.06 - s * 0.40, s * 0.14, s * 0.80, s * 0.07)
        .fill({ color: COLORS.ink, alpha: 0.85 })
    }
    g.circle(-s * 0.52, s * 0.06, s * 0.30).fill(COLORS.ink)
    g.circle(-s * 0.60, 0, s * 0.09).fill(0xffffff)
    g.circle(-s * 0.62, 0, s * 0.05).fill(COLORS.ink)
  },

  // Jordgubbe — hjärtform, gröna blad, gula frön.
  jordgubbe(g, s) {
    g.moveTo(0, s * 0.92)
      .quadraticCurveTo(-s * 0.78, s * 0.16, -s * 0.52, -s * 0.34)
      .quadraticCurveTo(-s * 0.20, -s * 0.60, 0, -s * 0.30)
      .quadraticCurveTo(s * 0.20, -s * 0.60, s * 0.52, -s * 0.34)
      .quadraticCurveTo(s * 0.78, s * 0.16, 0, s * 0.92)
      .fill(COLORS.red)
    for (let i = 0; i < 7; i++) {
      const fx = (Math.cos(i * 2.4) * 0.36) * s
      const fy = (-0.10 + (i % 4) * 0.22) * s
      g.ellipse(fx, fy, s * 0.06, s * 0.09).fill(COLORS.yellow)
    }
    for (let i = -1; i <= 1; i++) {
      g.poly([0, -s * 0.34, i * s * 0.46, -s * 0.66, i * s * 0.14, -s * 0.20]).fill(COLORS.green)
    }
    g.roundRect(-s * 0.06, -s * 0.74, s * 0.12, s * 0.24, s * 0.06).fill(COLORS.greenDark)
  },

  // Stjärna — femuddig med mjuk kontur.
  stjarna(g, s) {
    g.star(0, 0, 5, s * 0.92, s * 0.42).fill(COLORS.yellow)
      .stroke({ width: Math.max(3, s * 0.10), color: COLORS.orange, join: 'round' })
    g.circle(-s * 0.16, -s * 0.20, s * 0.14).fill({ color: 0xffffff, alpha: 0.7 })
  },

  // Regnbåge — fyra bågar över två små moln.
  regnbage(g, s) {
    const band = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.blue]
    band.forEach((c, i) => {
      bage(g, 0, s * 0.42, s * (0.92 - i * 0.15), Math.PI, Math.PI * 2)
        .stroke({ width: Math.max(3, s * 0.13), color: c, cap: 'butt' })
    })
    g.circle(-s * 0.80, s * 0.44, s * 0.24).fill(0xffffff)
    g.circle(-s * 0.52, s * 0.48, s * 0.18).fill(0xffffff)
    g.circle(s * 0.80, s * 0.44, s * 0.24).fill(0xffffff)
    g.circle(s * 0.52, s * 0.48, s * 0.18).fill(0xffffff)
  },

  // Fågelunge — rund kropp, näbb, vinge och två fötter.
  fagelunge(g, s) {
    g.poly([-s * 0.24, s * 0.72, -s * 0.10, s * 0.96, -s * 0.36, s * 0.96]).fill(COLORS.orange)
    g.poly([s * 0.24, s * 0.72, s * 0.36, s * 0.96, s * 0.10, s * 0.96]).fill(COLORS.orange)
    g.ellipse(0, s * 0.18, s * 0.62, s * 0.56).fill(COLORS.yellow)
    g.circle(0, -s * 0.36, s * 0.44).fill(COLORS.yellow)
    g.poly([s * 0.38, -s * 0.34, s * 0.76, -s * 0.20, s * 0.38, -s * 0.10]).fill(COLORS.orange)
    bage(g, -s * 0.14, s * 0.20, s * 0.34, -1.2, 1.1)
      .stroke({ width: Math.max(2, s * 0.09), color: COLORS.orange, alpha: 0.8, cap: 'round' })
    g.circle(s * 0.14, -s * 0.44, s * 0.11).fill(COLORS.ink)
    g.circle(s * 0.18, -s * 0.48, s * 0.04).fill(0xffffff)
    g.moveTo(-s * 0.10, -s * 0.78).quadraticCurveTo(0, -s * 0.96, s * 0.10, -s * 0.80)
      .stroke({ width: Math.max(2, s * 0.08), color: COLORS.orange, cap: 'round' })
  },
}

export const SURPRISE_KEYS = Object.keys(DRAW)

// Ritad överraskningsfigur som fristående Graphics (ingen emoji, egen silhuett).
export function makeSurprise(key, s = 28) {
  const g = new Graphics()
  ;(DRAW[key] ?? DRAW.stjarna)(g, s)
  g.eventMode = 'none'
  return g
}

// Belöningsstjärnan vid poäng — ritad, inte ⭐.
export function makeStar(s = 28) {
  return makeSurprise('stjarna', s)
}
