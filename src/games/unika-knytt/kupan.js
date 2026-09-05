// kupan.js — glaskupan i verkstan: den lilla världen barnet fyller, de fem maskindelarna
// som fyller den, mässingsspaken, och rekvisitan (ceremoni.js importerar REKVISITA härifrån
// och låter samma föremål strömma UT ur ägget).
//
// Premissen står och faller med EN sak: varje maskindel UTFÖR det den ändrar, i samma
// bildruta som trycket. Därför har varje del en synlig KANAL in i kupan — ett glasrör, en
// ränna, en slang, en vals, en lucka i taket — och `laggIn(axel)` spelar just den kanalen.
//
// Ritregler här (alla uppmätta i repot, ingen är en smaksak):
//  · Gradienter hämtas CACHADE ur lib/form.js. En `new FillGradient` per montering
//    destabiliserade hela testsviten. MÄSSING = gyllene grundfärg + cylinderFill(axis 'y').
//  · EN form per fill(): flera former före ett enda fill() tar alla första färgen.
//  · Överlappande cirklar konturas med en MÖRKARE FORM bakom, aldrig med stroke (en stroke
//    drar streck tvärs över den sammansatta siluetten).
//  · Aldrig en handritad glansellips ovanpå en sphereFill — två dagrar läser som en bubbla.
//  · En transform, EN skrivare: liv() äger y+rotation, squash/pop äger scale, shake äger x+y.
//    Därför ligger de på var sin nivå av containrar.
//  · Noden som bär hitArea animeras ALDRIG; all rörelse bor i barnnoder.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { shade, tint } from '../../lib/theme.js'
import {
  verticalFill, verticalFillAlpha, groundFill, topLightFill, cylinderFill, sphereFill,
} from '../../lib/form.js'
import { lerpColor } from '../../lib/scene.js'
import { liv, pop, squash, wiggle, shake, puff, sparkle, stadFx } from '../../lib/feedback.js'
import { FARGER, STORLEKAR, MONSTER, hslHex, mulberry32 } from './dna.js'

// --- verkstadens material (fyra+ toner, aldrig en enda kvantiserad yta) ---------------
const TRA = 0xb98050
const TRA_MORK = 0x8a5a3b
const MASSING = 0xe0a53c
const MASSING_MORK = 0xa9741f
const LADER = 0xa2603f
const GLAS = 0xd8f0ff
const JARN = 0x6f6862
const INK = 0x3b2c22

const R = 190          // klotets radie — samma tal som index.js hitArea Circle(0,0,190)
const R_INRE = 176     // masken innanför glaset
const MARK_Y = 58      // marklinjen inuti kupan

const G = () => new Graphics()
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const vinkelDiff = (a, b) => ((b - a + 540) % 360) - 180

// Världarnas interiör. v 0..5 == dna.js VARLDAR-ordningen (skog · vatten · sno · natt ·
// oken · grotta) — ordningen är sparad i varje post och får aldrig ändras, bara växa sist.
const VARLDSNYCKEL = ['skog', 'vatten', 'sno', 'natt', 'oken', 'grotta']
const VARLDSTON = {
  skog: { hy: 113, matt: 1, himmelT: 0xbfe9ff, himmelB: 0xdcf5cf, mark: 0x7cc86f, bas: { grono: 0.6, varm: 0.3 } },
  vatten: { hy: 198, matt: 1, himmelT: 0xbdeefa, himmelB: 0x9adcef, mark: 0x4aa3df, bas: { vatt: 0.8, grono: 0.15 } },
  sno: { hy: 202, matt: 0.62, himmelT: 0xe8f4ff, himmelB: 0xd3e6f4, mark: 0xf1f8ff, bas: { sten: 0.3, vatt: 0.28 } },
  natt: { hy: 272, matt: 1, himmelT: 0x33407c, himmelB: 0x533f86, mark: 0x3a3170, bas: { natt: 0.88, sten: 0.12 } },
  oken: { hy: 36, matt: 0.95, himmelT: 0xffe4b3, himmelB: 0xfff2d4, mark: 0xe9c57c, bas: { varm: 0.7, sten: 0.35 } },
  grotta: { hy: 310, matt: 0.9, himmelT: 0x2f2747, himmelB: 0x4b3f70, mark: 0x5b4d7d, bas: { natt: 0.75, sten: 0.5 } },
}

// Kanalerna: var maskindel möter kupan. Talen är lokala mot kupans mitt (640,330) och är
// dragna ur layouttabellen i docs/games/unika-knytt.md §1b — varje kanal slutar precis vid
// sitt verktygs träffyte-kant, så röret ser ut att sitta fast i delen.
const KANAL = {
  farg: { fran: { x: -278, y: -86 }, styr: { x: -176, y: -142 }, till: { x: -90, y: -172 }, farg: GLAS },
  gnista: { fran: { x: 278, y: -86 }, styr: { x: 176, y: -142 }, till: { x: 90, y: -172 }, farg: GLAS },
  storlek: { fran: { x: -258, y: 146 }, styr: { x: -200, y: 128 }, till: { x: -146, y: 66 }, farg: LADER },
  monster: { fran: { x: 258, y: 120 }, styr: { x: 200, y: 122 }, till: { x: 146, y: 66 }, farg: TRA },
  varld: { fran: { x: 0, y: -214 }, styr: { x: 0, y: -196 }, till: { x: 0, y: -180 }, farg: 0xffffff },
}
const kurva = (k, t) => {
  const u = 1 - t
  return {
    x: u * u * k.fran.x + 2 * u * t * k.styr.x + t * t * k.till.x,
    y: u * u * k.fran.y + 2 * u * t * k.styr.y + t * t * k.till.y,
  }
}

// =====================================================================================
// REKVISITA — 4 världar × 4 fristående ritade föremål.
// `rita(g, s)` ritar i en färdig Graphics: markföremål har FOTEN i origo, luftföremål sin
// mitt. `luft` 0 = står på marken · 0.5 = svävar · 1 = hänger överst. `rorelse` styr det
// egna livet, `skalar` vilken världsskalär föremålet matar, `regn` om det fäller något.
// =====================================================================================
export const REKVISITA = {
  skog: [
    {
      id: 'trad', luft: 0, rorelse: 'vajar', skalar: 'grono',
      rita(g, s) {
        g.roundRect(-s * 0.1, -s * 0.92, s * 0.2, s * 0.94, s * 0.06).fill(cylinderFill(TRA_MORK, { axis: 'y' }))
        g.ellipse(0, -s * 1.12, s * 0.72, s * 0.6).fill(0x2f6d33)
        g.circle(-s * 0.3, -s * 1.04, s * 0.36).fill(sphereFill(0x63b955))
        g.circle(s * 0.26, -s * 1.0, s * 0.34).fill(sphereFill(0x74c862))
        g.circle(0, -s * 1.42, s * 0.36).fill(sphereFill(0x83d46d))
      },
    },
    {
      id: 'sten', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.ellipse(0, -s * 0.04, s * 0.68, s * 0.14).fill({ color: INK, alpha: 0.18 })
        g.moveTo(-s * 0.6, 0)
          .quadraticCurveTo(-s * 0.68, -s * 0.42, -s * 0.22, -s * 0.6)
          .quadraticCurveTo(s * 0.36, -s * 0.74, s * 0.58, -s * 0.3)
          .quadraticCurveTo(s * 0.66, -s * 0.02, s * 0.4, 0)
          .closePath()
          .fill(topLightFill(0x9aa2a8, { highlight: 0.34 }))
        g.ellipse(-s * 0.16, -s * 0.42, s * 0.2, s * 0.09).fill({ color: 0xffffff, alpha: 0.3 })
      },
    },
    {
      id: 'svamp', luft: 0, rorelse: 'gupp', skalar: 'grono',
      rita(g, s) {
        g.roundRect(-s * 0.13, -s * 0.52, s * 0.26, s * 0.54, s * 0.1).fill(topLightFill(0xf6e7cd))
        g.ellipse(0, -s * 0.5, s * 0.52, s * 0.36).fill(0xa8332f)
        g.moveTo(-s * 0.5, -s * 0.5)
          .quadraticCurveTo(0, -s * 1.02, s * 0.5, -s * 0.5)
          .closePath()
          .fill(topLightFill(0xe0503f, { highlight: 0.32 }))
        g.circle(-s * 0.2, -s * 0.62, s * 0.09).fill(0xfff2e0)
        g.circle(s * 0.16, -s * 0.68, s * 0.07).fill(0xfff2e0)
      },
    },
    {
      id: 'sol', luft: 1, rorelse: 'snurr', skalar: 'varm',
      rita(g, s) {
        // strålarna ritas som kilar via egen matematik — ingen ritmatris behövs
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          g.moveTo(Math.cos(a) * s * 0.66, Math.sin(a) * s * 0.66)
            .lineTo(Math.cos(a + 0.1) * s * 0.94, Math.sin(a + 0.1) * s * 0.94)
            .lineTo(Math.cos(a - 0.1) * s * 0.94, Math.sin(a - 0.1) * s * 0.94)
            .closePath()
            .fill({ color: 0xffd35c, alpha: 0.9 })
        }
        g.circle(0, 0, s * 0.58).fill(sphereFill(0xffc93c, { highlight: 0.5 }))
      },
    },
    {
      id: 'stubbe', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.ellipse(0, -s * 0.02, s * 0.5, s * 0.12).fill({ color: INK, alpha: 0.16 })
        g.roundRect(-s * 0.36, -s * 0.5, s * 0.72, s * 0.52, s * 0.08).fill(cylinderFill(TRA_MORK, { axis: 'x' }))
        g.ellipse(0, -s * 0.5, s * 0.36, s * 0.14).fill(topLightFill(0xd9b07a, { highlight: 0.2 }))
        g.ellipse(0, -s * 0.5, s * 0.22, s * 0.08).stroke({ width: s * 0.03, color: 0xb98a55 })
        g.ellipse(0, -s * 0.5, s * 0.1, s * 0.04).stroke({ width: s * 0.03, color: 0xb98a55 })
      },
    },
    {
      id: 'blomma', luft: 0, rorelse: 'gupp', skalar: 'grono',
      rita(g, s) {
        g.moveTo(0, 0).quadraticCurveTo(s * 0.08, -s * 0.4, 0, -s * 0.7).stroke({ width: s * 0.07, color: 0x3f8f4a, cap: 'round' })
        g.ellipse(s * 0.14, -s * 0.34, s * 0.16, s * 0.08).fill(0x58b35e)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          g.ellipse(Math.cos(a) * s * 0.2, -s * 0.74 + Math.sin(a) * s * 0.2, s * 0.16, s * 0.12).fill(sphereFill(0xff8fb1, { highlight: 0.4 }))
        }
        g.circle(0, -s * 0.74, s * 0.12).fill(0xffe27a)
      },
    },
    {
      id: 'moln', luft: 1, rorelse: 'driver', skalar: 'vatt',
      rita(g, s) {
        g.ellipse(0, s * 0.06, s * 0.76, s * 0.3).fill(0xc9d6e0)
        g.circle(-s * 0.34, 0, s * 0.28).fill(sphereFill(0xffffff, { dark: 0.1 }))
        g.circle(s * 0.02, -s * 0.16, s * 0.36).fill(sphereFill(0xffffff, { dark: 0.1 }))
        g.circle(s * 0.4, s * 0.02, s * 0.25).fill(sphereFill(0xffffff, { dark: 0.1 }))
      },
    },
  ],
  vatten: [
    {
      id: 'moln', luft: 1, rorelse: 'driver', skalar: 'vatt', regn: 'regn',
      rita(g, s) {
        g.ellipse(0, s * 0.06, s * 0.8, s * 0.32).fill(0x9fb6c6)
        g.circle(-s * 0.36, 0, s * 0.3).fill(sphereFill(0xf3f8ff, { dark: 0.12 }))
        g.circle(s * 0.02, -s * 0.16, s * 0.38).fill(sphereFill(0xffffff, { dark: 0.12 }))
        g.circle(s * 0.42, s * 0.02, s * 0.27).fill(sphereFill(0xf3f8ff, { dark: 0.12 }))
      },
    },
    {
      id: 'sjogras', luft: 0, rorelse: 'vajar', skalar: 'vatt',
      rita(g, s) {
        const blad = (x, h, b, c) => g.moveTo(x, 0)
          .quadraticCurveTo(x + b, -h * 0.55, x + b * 0.3, -h)
          .quadraticCurveTo(x + b * 1.5, -h * 0.5, x + s * 0.12, 0)
          .closePath().fill(c)
        blad(-s * 0.24, s * 0.86, -s * 0.2, 0x2f8f6a)
        blad(s * 0.1, s * 1.06, s * 0.22, 0x3fb07f)
        blad(-s * 0.04, s * 0.66, s * 0.06, 0x58c493)
      },
    },
    {
      id: 'snacka', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.moveTo(-s * 0.52, 0).quadraticCurveTo(-s * 0.44, -s * 0.72, 0, -s * 0.76)
          .quadraticCurveTo(s * 0.44, -s * 0.72, s * 0.52, 0).closePath()
          .fill(topLightFill(0xffc9d6, { highlight: 0.36 }))
        for (let i = -2; i <= 2; i++) {
          g.moveTo(i * s * 0.11, -s * 0.06).quadraticCurveTo(i * s * 0.16, -s * 0.44, i * s * 0.1, -s * 0.7)
            .stroke({ width: s * 0.04, color: 0xe098ad, cap: 'round' })
        }
      },
    },
    {
      id: 'fisk', luft: 0.5, rorelse: 'simmar', skalar: 'vatt',
      rita(g, s) {
        g.moveTo(s * 0.24, 0).lineTo(s * 0.6, -s * 0.26).lineTo(s * 0.6, s * 0.26).closePath().fill(0xf0913c)
        g.ellipse(0, 0, s * 0.46, s * 0.3).fill(sphereFill(0xffa94d, { highlight: 0.4 }))
        g.moveTo(-s * 0.1, -s * 0.28).quadraticCurveTo(0, -s * 0.56, s * 0.14, -s * 0.24)
          .closePath().fill(0xf0913c)
        g.circle(-s * 0.24, -s * 0.06, s * 0.09).fill(0xffffff)
        g.circle(-s * 0.26, -s * 0.06, s * 0.05).fill(INK)
      },
    },
    {
      id: 'bubbla', luft: 0.5, rorelse: 'driver', skalar: 'vatt',
      rita(g, s) {
        g.circle(0, 0, s * 0.34).fill({ color: 0xbfe9ff, alpha: 0.35 })
        g.circle(0, 0, s * 0.34).stroke({ width: s * 0.05, color: 0xffffff, alpha: 0.8 })
        g.ellipse(-s * 0.12, -s * 0.14, s * 0.1, s * 0.06).fill({ color: 0xffffff, alpha: 0.8 })
        g.circle(s * 0.3, s * 0.3, s * 0.1).fill({ color: 0xffffff, alpha: 0.5 })
      },
    },
    {
      id: 'sjostjarna', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.star(0, -s * 0.3, 5, s * 0.42, s * 0.18).fill(topLightFill(0xff9c6b, { highlight: 0.3 }))
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2
          g.circle(Math.cos(a) * s * 0.22, -s * 0.3 + Math.sin(a) * s * 0.22, s * 0.04).fill(0xffd8c2)
        }
      },
    },
    {
      id: 'nackros', luft: 0, rorelse: 'gupp', skalar: 'grono',
      rita(g, s) {
        g.ellipse(0, -s * 0.04, s * 0.5, s * 0.2).fill(topLightFill(0x4f9f5a, { highlight: 0.24 }))
        g.moveTo(0, -s * 0.04).lineTo(s * 0.5, -s * 0.16).lineTo(s * 0.5, s * 0.06).closePath().fill(0x3f97c4)
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2
          g.ellipse(Math.cos(a) * s * 0.12, -s * 0.2 + Math.sin(a) * s * 0.08, s * 0.1, s * 0.16).fill(sphereFill(0xffe6f2, { highlight: 0.4 }))
        }
        g.circle(0, -s * 0.2, s * 0.07).fill(0xffd35c)
      },
    },
  ],
  sno: [
    {
      id: 'gran', luft: 0, rorelse: 'vajar', skalar: 'grono',
      rita(g, s) {
        g.roundRect(-s * 0.08, -s * 0.3, s * 0.16, s * 0.32, s * 0.05).fill(TRA_MORK)
        const tier = (y, w, h) => g.moveTo(0, y - h).lineTo(w, y).lineTo(-w, y).closePath().fill(topLightFill(0x2f7a52, { highlight: 0.26 }))
        tier(-s * 0.24, s * 0.56, s * 0.5)
        tier(-s * 0.62, s * 0.44, s * 0.46)
        tier(-s * 0.98, s * 0.3, s * 0.42)
        g.moveTo(0, -s * 1.4).lineTo(s * 0.16, -s * 1.22).lineTo(-s * 0.16, -s * 1.22).closePath().fill({ color: 0xffffff, alpha: 0.9 })
        g.ellipse(-s * 0.26, -s * 0.66, s * 0.14, s * 0.05).fill({ color: 0xffffff, alpha: 0.85 })
      },
    },
    {
      id: 'snomoln', luft: 1, rorelse: 'driver', skalar: 'vatt', regn: 'sno',
      rita(g, s) {
        g.ellipse(0, s * 0.06, s * 0.78, s * 0.3).fill(0xbcc9d8)
        g.circle(-s * 0.34, 0, s * 0.29).fill(sphereFill(0xeef5ff, { dark: 0.1 }))
        g.circle(0, -s * 0.18, s * 0.36).fill(sphereFill(0xffffff, { dark: 0.1 }))
        g.circle(s * 0.38, s * 0.0, s * 0.26).fill(sphereFill(0xeef5ff, { dark: 0.1 }))
      },
    },
    {
      id: 'snodriva', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.moveTo(-s * 0.74, 0).quadraticCurveTo(-s * 0.5, -s * 0.46, -s * 0.1, -s * 0.4)
          .quadraticCurveTo(s * 0.2, -s * 0.66, s * 0.46, -s * 0.34)
          .quadraticCurveTo(s * 0.72, -s * 0.2, s * 0.76, 0).closePath()
          .fill(topLightFill(0xffffff, { highlight: 0.2, dark: 0.1 }))
        g.ellipse(s * 0.1, -s * 0.12, s * 0.4, s * 0.1).fill({ color: 0xd6e6f2, alpha: 0.7 })
      },
    },
    {
      id: 'iskristall', luft: 0.5, rorelse: 'snurr', skalar: 'sten',
      rita(g, s) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          g.moveTo(0, 0).lineTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62)
            .stroke({ width: s * 0.11, color: 0xd8f0ff, cap: 'round' })
          g.moveTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34)
            .lineTo(Math.cos(a + 0.6) * s * 0.5, Math.sin(a + 0.6) * s * 0.5)
            .stroke({ width: s * 0.07, color: 0xeaf8ff, cap: 'round' })
        }
        g.circle(0, 0, s * 0.15).fill(0xffffff)
      },
    },
    {
      id: 'snogubbe', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.circle(0, -s * 0.3, s * 0.34).fill(sphereFill(0xffffff, { dark: 0.12 }))
        g.circle(0, -s * 0.82, s * 0.25).fill(sphereFill(0xffffff, { dark: 0.12 }))
        g.moveTo(s * 0.06, -s * 0.84).lineTo(s * 0.34, -s * 0.8).lineTo(s * 0.06, -s * 0.76).closePath().fill(0xf5892f)
        g.circle(-s * 0.08, -s * 0.9, s * 0.04).fill(INK)
        g.circle(s * 0.04, -s * 0.92, s * 0.04).fill(INK)
        g.circle(0, -s * 0.4, s * 0.04).fill(INK)
        g.circle(0, -s * 0.24, s * 0.04).fill(INK)
        g.roundRect(-s * 0.2, -s * 1.2, s * 0.4, s * 0.1, s * 0.03).fill(0x4a3526)
        g.roundRect(-s * 0.13, -s * 1.4, s * 0.26, s * 0.24, s * 0.04).fill(0x4a3526)
      },
    },
    {
      id: 'istapp', luft: 1, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.roundRect(-s * 0.5, -s * 0.4, s, s * 0.16, s * 0.05).fill(topLightFill(0xeaf6ff, { highlight: 0.2 }))
        for (const [x, h] of [[-s * 0.3, s * 0.5], [0, s * 0.8], [s * 0.28, s * 0.6]]) {
          g.moveTo(x - s * 0.1, -s * 0.3).lineTo(x, -s * 0.3 + h).lineTo(x + s * 0.1, -s * 0.3).closePath().fill(topLightFill(0xd8f0ff, { highlight: 0.3 }))
        }
      },
    },
    {
      id: 'snoflinga', luft: 0.5, rorelse: 'snurr', skalar: 'vatt',
      rita(g, s) {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI
          g.moveTo(Math.cos(a) * -s * 0.4, Math.sin(a) * -s * 0.4).lineTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4).stroke({ width: s * 0.07, color: 0xffffff, cap: 'round' })
        }
        g.circle(0, 0, s * 0.09).fill(0xffffff)
      },
    },
  ],
  natt: [
    {
      id: 'mane', luft: 1, rorelse: 'gupp', skalar: 'natt',
      rita(g, s) {
        g.circle(0, 0, s * 0.62).fill(0xfff3b0)
        g.circle(s * 0.26, -s * 0.16, s * 0.54).fill({ color: 0x33407c, alpha: 1 })
        g.circle(-s * 0.42, s * 0.3, s * 0.07).fill({ color: 0xfff8d8, alpha: 0.9 })
        g.circle(-s * 0.5, -s * 0.22, s * 0.05).fill({ color: 0xfff8d8, alpha: 0.8 })
      },
    },
    {
      id: 'nattblomma', luft: 0, rorelse: 'gupp', skalar: 'natt',
      rita(g, s) {
        g.moveTo(0, 0).quadraticCurveTo(s * 0.12, -s * 0.5, -s * 0.02, -s * 0.82)
          .stroke({ width: s * 0.09, color: 0x3f7a5a, cap: 'round' })
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2
          g.ellipse(Math.cos(a) * s * 0.26 - s * 0.02, Math.sin(a) * s * 0.26 - s * 0.88, s * 0.2, s * 0.16)
            .fill(sphereFill(0xc7a8ff, { highlight: 0.42 }))
        }
        g.circle(-s * 0.02, -s * 0.88, s * 0.14).fill(0xfff3b0)
      },
    },
    {
      id: 'eldfluga', luft: 0.5, rorelse: 'driver', skalar: 'natt',
      rita(g, s) {
        g.circle(s * 0.16, s * 0.04, s * 0.3).fill({ color: 0xfff3b0, alpha: 0.28 })
        g.ellipse(-s * 0.06, 0, s * 0.26, s * 0.18).fill(topLightFill(0x6d5f9c))
        g.circle(s * 0.16, s * 0.04, s * 0.14).fill(0xffe98a)
        g.ellipse(-s * 0.1, -s * 0.2, s * 0.2, s * 0.1).fill({ color: 0xe6e0ff, alpha: 0.6 })
        g.circle(-s * 0.28, -s * 0.04, s * 0.06).fill(INK)
      },
    },
    {
      id: 'stjarnsten', luft: 0, rorelse: 'gupp', skalar: 'sten',
      rita(g, s) {
        g.moveTo(-s * 0.34, 0).lineTo(-s * 0.16, -s * 0.72).lineTo(s * 0.04, 0).closePath()
          .fill(topLightFill(0x8f7ad6, { highlight: 0.4 }))
        g.moveTo(-s * 0.02, 0).lineTo(s * 0.2, -s * 0.5).lineTo(s * 0.38, 0).closePath()
          .fill(topLightFill(0xa78bfa, { highlight: 0.34 }))
        g.star(s * 0.18, -s * 0.56, 4, s * 0.12, s * 0.05).fill(0xfff3b0)
      },
    },
    {
      id: 'stjarna', luft: 1, rorelse: 'gupp', skalar: 'natt',
      rita(g, s) {
        g.star(0, 0, 5, s * 0.5, s * 0.22).fill({ color: 0xfff3b0, alpha: 0.35 })
        g.star(0, 0, 5, s * 0.36, s * 0.16).fill(topLightFill(0xffe98a, { highlight: 0.4 }))
      },
    },
    {
      id: 'uggla', luft: 0, rorelse: 'gupp', skalar: 'natt',
      rita(g, s) {
        g.ellipse(0, -s * 0.4, s * 0.3, s * 0.4).fill(topLightFill(0x8a6a4a, { highlight: 0.2 }))
        g.ellipse(0, -s * 0.3, s * 0.18, s * 0.22).fill({ color: 0xd9b88a, alpha: 0.9 })
        g.circle(-s * 0.11, -s * 0.62, s * 0.1).fill(0xfff3b0)
        g.circle(s * 0.11, -s * 0.62, s * 0.1).fill(0xfff3b0)
        g.circle(-s * 0.11, -s * 0.62, s * 0.05).fill(INK)
        g.circle(s * 0.11, -s * 0.62, s * 0.05).fill(INK)
        g.moveTo(-s * 0.05, -s * 0.52).lineTo(s * 0.05, -s * 0.52).lineTo(0, -s * 0.44).closePath().fill(0xf5892f)
        g.moveTo(-s * 0.26, -s * 0.78).lineTo(-s * 0.2, -s * 0.94).lineTo(-s * 0.1, -s * 0.78).closePath().fill(0x8a6a4a)
        g.moveTo(s * 0.26, -s * 0.78).lineTo(s * 0.2, -s * 0.94).lineTo(s * 0.1, -s * 0.78).closePath().fill(0x8a6a4a)
      },
    },
    {
      id: 'lykta', luft: 0.5, rorelse: 'driver', skalar: 'natt',
      rita(g, s) {
        g.circle(0, 0, s * 0.42).fill({ color: 0xffe98a, alpha: 0.22 })
        g.roundRect(-s * 0.18, -s * 0.26, s * 0.36, s * 0.5, s * 0.06).fill(topLightFill(0xffd35c, { highlight: 0.4 }))
        g.roundRect(-s * 0.22, -s * 0.32, s * 0.44, s * 0.08, s * 0.03).fill(0x6a4a30)
        g.roundRect(-s * 0.22, s * 0.22, s * 0.44, s * 0.08, s * 0.03).fill(0x6a4a30)
        g.moveTo(0, -s * 0.32).lineTo(0, -s * 0.5).stroke({ width: s * 0.05, color: 0x6a4a30 })
      },
    },
  ],
  // Leverans 2 steg 4: två nya världar, sju föremål var.
  oken: [
    {
      id: 'kaktus', luft: 0, rorelse: 'vajar', skalar: 'grono',
      rita(g, s) {
        g.roundRect(-s * 0.16, -s * 0.96, s * 0.32, s * 0.98, s * 0.14).fill(cylinderFill(0x5faa5a, { axis: 'x' }))
        g.roundRect(-s * 0.5, -s * 0.6, s * 0.2, s * 0.36, s * 0.09).fill(cylinderFill(0x5faa5a, { axis: 'x' }))
        g.roundRect(-s * 0.5, -s * 0.34, s * 0.4, s * 0.16, s * 0.07).fill(cylinderFill(0x5faa5a, { axis: 'y' }))
        g.roundRect(s * 0.3, -s * 0.74, s * 0.2, s * 0.4, s * 0.09).fill(cylinderFill(0x6ab865, { axis: 'x' }))
        g.roundRect(s * 0.1, -s * 0.46, s * 0.4, s * 0.16, s * 0.07).fill(cylinderFill(0x6ab865, { axis: 'y' }))
        g.ellipse(0, -s * 1.0, s * 0.12, s * 0.08).fill(sphereFill(0xff8fb1, { highlight: 0.4 }))
      },
    },
    {
      id: 'okensol', luft: 1, rorelse: 'snurr', skalar: 'varm',
      rita(g, s) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          g.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6)
            .lineTo(Math.cos(a + 0.09) * s * 0.96, Math.sin(a + 0.09) * s * 0.96)
            .lineTo(Math.cos(a - 0.09) * s * 0.96, Math.sin(a - 0.09) * s * 0.96)
            .closePath()
            .fill({ color: 0xffb24d, alpha: 0.9 })
        }
        g.circle(0, 0, s * 0.56).fill(sphereFill(0xffc25c, { highlight: 0.5 }))
      },
    },
    {
      id: 'sanddyna', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.moveTo(-s * 0.78, 0).quadraticCurveTo(-s * 0.3, -s * 0.56, s * 0.1, -s * 0.44)
          .quadraticCurveTo(s * 0.5, -s * 0.34, s * 0.8, 0).closePath()
          .fill(topLightFill(0xf0cf8a, { highlight: 0.24, dark: 0.16 }))
        g.moveTo(-s * 0.4, -s * 0.2).quadraticCurveTo(0, -s * 0.34, s * 0.4, -s * 0.24).stroke({ width: s * 0.04, color: 0xd9b26e, alpha: 0.8 })
      },
    },
    {
      id: 'odla', luft: 0, rorelse: 'gupp', skalar: 'varm',
      rita(g, s) {
        g.moveTo(-s * 0.5, -s * 0.1).quadraticCurveTo(-s * 0.9, -s * 0.34, -s * 0.8, -s * 0.02).stroke({ width: s * 0.09, color: 0xe4a24a, cap: 'round' })
        g.ellipse(0, -s * 0.16, s * 0.46, s * 0.16).fill(topLightFill(0xf3b357, { highlight: 0.3 }))
        g.circle(s * 0.46, -s * 0.22, s * 0.16).fill(topLightFill(0xf3b357, { highlight: 0.3 }))
        g.circle(s * 0.5, -s * 0.28, s * 0.05).fill(INK)
        for (const x of [-s * 0.26, s * 0.2]) g.roundRect(x, -s * 0.08, s * 0.08, s * 0.14, s * 0.03).fill(0xd8923d)
        for (const x of [-s * 0.14, s * 0.06, s * 0.26]) g.circle(x, -s * 0.24, s * 0.03).fill(0xc7782f)
      },
    },
    {
      id: 'palm', luft: 0, rorelse: 'vajar', skalar: 'grono',
      rita(g, s) {
        g.moveTo(0, 0).quadraticCurveTo(s * 0.16, -s * 0.5, s * 0.06, -s * 0.94).stroke({ width: s * 0.12, color: TRA_MORK, cap: 'round' })
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI * (0.15 + i * 0.175)
          g.moveTo(s * 0.06, -s * 0.94)
            .quadraticCurveTo(s * 0.06 + Math.cos(a) * s * 0.4, -s * 0.94 + Math.sin(a) * s * 0.5, s * 0.06 + Math.cos(a) * s * 0.62, -s * 0.94 + Math.sin(a) * s * 0.36)
            .stroke({ width: s * 0.1, color: 0x4f9f5a, cap: 'round' })
        }
        g.circle(0, -s * 0.9, s * 0.06).fill(0x8a5a3b)
        g.circle(s * 0.12, -s * 0.88, s * 0.06).fill(0x8a5a3b)
      },
    },
    {
      id: 'kaktusblomma', luft: 0, rorelse: 'gupp', skalar: 'varm',
      rita(g, s) {
        g.ellipse(0, -s * 0.3, s * 0.34, s * 0.32).fill(sphereFill(0x6ab865, { highlight: 0.3 }))
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          g.moveTo(Math.cos(a) * s * 0.3, -s * 0.3 + Math.sin(a) * s * 0.28).lineTo(Math.cos(a) * s * 0.42, -s * 0.3 + Math.sin(a) * s * 0.4).stroke({ width: s * 0.03, color: 0xf3e2bd })
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          g.ellipse(Math.cos(a) * s * 0.14, -s * 0.66 + Math.sin(a) * s * 0.1, s * 0.12, s * 0.08).fill(sphereFill(0xffb347, { highlight: 0.4 }))
        }
        g.circle(0, -s * 0.66, s * 0.07).fill(0xfff3b0)
      },
    },
    {
      id: 'sandvirvel', luft: 0.5, rorelse: 'driver', skalar: 'varm',
      rita(g, s) {
        for (let i = 0; i < 4; i++) {
          const y = -s * 0.36 + i * s * 0.2
          const w = s * (0.18 + i * 0.1)
          g.ellipse(0, y, w, s * 0.07).fill({ color: 0xe9c57c, alpha: 0.55 - i * 0.08 })
        }
      },
    },
  ],
  grotta: [
    {
      id: 'kristall', luft: 0, rorelse: 'still', skalar: 'natt',
      rita(g, s) {
        g.ellipse(0, -s * 0.02, s * 0.5, s * 0.12).fill({ color: 0x9be9dc, alpha: 0.2 })
        g.moveTo(-s * 0.4, 0).lineTo(-s * 0.2, -s * 0.8).lineTo(0, 0).closePath().fill(topLightFill(0xb08cff, { highlight: 0.45 }))
        g.moveTo(-s * 0.06, 0).lineTo(s * 0.16, -s * 1.0).lineTo(s * 0.38, 0).closePath().fill(topLightFill(0x8ad8ff, { highlight: 0.45 }))
        g.moveTo(s * 0.18, 0).lineTo(s * 0.4, -s * 0.5).lineTo(s * 0.54, 0).closePath().fill(topLightFill(0xc9b8ff, { highlight: 0.4 }))
        g.circle(s * 0.16, -s * 0.9, s * 0.04).fill(0xffffff)
      },
    },
    {
      id: 'droppsten', luft: 1, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.roundRect(-s * 0.7, -s * 0.5, s * 1.4, s * 0.2, s * 0.06).fill(topLightFill(0x5b4d7d, { highlight: 0.16 }))
        for (const [x, h, w] of [[-s * 0.4, s * 0.5, s * 0.12], [-s * 0.05, s * 0.8, s * 0.16], [s * 0.34, s * 0.6, s * 0.12]]) {
          g.moveTo(x - w, -s * 0.34).quadraticCurveTo(x, -s * 0.34 + h * 0.6, x, -s * 0.34 + h).quadraticCurveTo(x, -s * 0.34 + h * 0.6, x + w, -s * 0.34).closePath().fill(topLightFill(0x7d6ba3, { highlight: 0.22 }))
        }
        g.circle(-s * 0.05, s * 0.5, s * 0.05).fill({ color: 0x9be9dc, alpha: 0.9 })
      },
    },
    {
      id: 'lyktsvamp', luft: 0, rorelse: 'gupp', skalar: 'natt',
      rita(g, s) {
        g.circle(0, -s * 0.6, s * 0.5).fill({ color: 0x9be9dc, alpha: 0.18 })
        g.roundRect(-s * 0.1, -s * 0.5, s * 0.2, s * 0.52, s * 0.08).fill(topLightFill(0xe8f4ff, { highlight: 0.2 }))
        g.moveTo(-s * 0.46, -s * 0.48).quadraticCurveTo(0, -s * 0.98, s * 0.46, -s * 0.48).closePath().fill(topLightFill(0x62d9c8, { highlight: 0.4 }))
        g.circle(-s * 0.18, -s * 0.6, s * 0.06).fill(0xe8fffb)
        g.circle(s * 0.14, -s * 0.66, s * 0.05).fill(0xe8fffb)
      },
    },
    {
      id: 'glodmask', luft: 0.5, rorelse: 'driver', skalar: 'natt',
      rita(g, s) {
        g.circle(0, 0, s * 0.4).fill({ color: 0x9ff2e6, alpha: 0.2 })
        for (let i = 0; i < 4; i++) g.circle(-s * 0.3 + i * s * 0.2, Math.sin(i * 1.6) * s * 0.06, s * 0.11).fill(sphereFill(i === 3 ? 0xd9fff8 : 0x7fe3d2, { highlight: 0.4 }))
        g.circle(s * 0.34, -s * 0.04, s * 0.03).fill(INK)
      },
    },
    {
      id: 'grottsten', luft: 0, rorelse: 'still', skalar: 'sten',
      rita(g, s) {
        g.ellipse(0, -s * 0.04, s * 0.66, s * 0.14).fill({ color: 0x000000, alpha: 0.2 })
        g.moveTo(-s * 0.58, 0).quadraticCurveTo(-s * 0.62, -s * 0.5, -s * 0.1, -s * 0.62)
          .quadraticCurveTo(s * 0.4, -s * 0.7, s * 0.56, -s * 0.24).quadraticCurveTo(s * 0.62, 0, s * 0.4, 0).closePath()
          .fill(topLightFill(0x6f6289, { highlight: 0.28 }))
        g.ellipse(-s * 0.14, -s * 0.42, s * 0.18, s * 0.08).fill({ color: 0xffffff, alpha: 0.2 })
      },
    },
    {
      id: 'kristallklase', luft: 0, rorelse: 'still', skalar: 'natt',
      rita(g, s) {
        for (const [x, h, c] of [[-s * 0.3, s * 0.5, 0xff9ec4], [-s * 0.05, s * 0.7, 0xffb3d6], [s * 0.22, s * 0.44, 0xff9ec4]]) {
          g.moveTo(x - s * 0.12, 0).lineTo(x, -h).lineTo(x + s * 0.12, 0).closePath().fill(topLightFill(c, { highlight: 0.45 }))
        }
        g.circle(-s * 0.05, -s * 0.62, s * 0.04).fill(0xffffff)
      },
    },
    {
      id: 'mossa', luft: 0, rorelse: 'still', skalar: 'grono',
      rita(g, s) {
        g.ellipse(0, -s * 0.08, s * 0.5, s * 0.14).fill(topLightFill(0x3f8f5a, { highlight: 0.24 }))
        g.ellipse(-s * 0.2, -s * 0.16, s * 0.22, s * 0.12).fill(topLightFill(0x4fa868, { highlight: 0.24 }))
        g.ellipse(s * 0.18, -s * 0.14, s * 0.18, s * 0.1).fill(topLightFill(0x58b872, { highlight: 0.24 }))
        g.circle(-s * 0.1, -s * 0.24, s * 0.04).fill(0x9be9dc)
      },
    },
  ],
}

/**
 * Rekvisitans ORDNING för en runda: fröet permuterar världens pool (Fisher–Yates ur
 * mulberry32), så samma värld ger olika föremål i olika rundor och samma frö alltid samma.
 * Kupan visar de första `antal` i den här ordningen och ceremonin de fyra första —
 * förhandsvisningen och finalen är alltså SAMMA värld (steg 4, 2026-09-05).
 */
export function rekvisitaOrdning(fro, nyckel) {
  const lista = REKVISITA[nyckel] || REKVISITA.skog
  const idx = lista.map((_, i) => i)
  const rnd = mulberry32(((fro >>> 0) ^ 0x2545f491) >>> 0)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = idx[i]
    idx[i] = idx[j]
    idx[j] = t
  }
  return idx.map((i) => lista[i])
}

// =====================================================================================
// KUPAN
// =====================================================================================
export function byggKupa(opts = {}) {
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  // ctx.later dör med spelomgången. Saknas den körs allt direkt i stället för att tystna.
  const senare = typeof opts.senare === 'function' ? opts.senare : (s, fn) => fn()
  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)

  let dod = false
  const view = new Container()
  view.eventMode = 'static'
  view.hitArea = new Circle(0, 0, R)
  view.cursor = 'pointer'

  // --- sockel + skugga (bakom klotet, så kupan STÅR i sin mässingsvagga) ---
  const golvskugga = G().ellipse(0, 250, 128, 26).fill({ color: INK, alpha: 0.16 })
  const sockel = G()
  sockel.moveTo(-58, 140).lineTo(58, 140).lineTo(92, 236).lineTo(-92, 236).closePath()
    .fill(topLightFill(TRA, { highlight: 0.24 }))
  sockel.roundRect(-104, 228, 208, 24, 11).fill(topLightFill(TRA_MORK))
  sockel.roundRect(-70, 128, 140, 22, 10).fill(cylinderFill(MASSING, { axis: 'y' }))
  sockel.circle(-52, 139, 5).fill(MASSING_MORK)
  sockel.circle(52, 139, 5).fill(MASSING_MORK)
  view.addChild(golvskugga, sockel)

  // --- kanalerna in i kupan (ritade FÖRE glaset, så deras mynningar hamnar under det) ---
  const kanalG = G()
  // Ett rör ritas i TRE lager — vägg, lumen och dager — annars läser en enda stroke som ett
  // band i stället för ett rör. (En stroke, inte en fylld kontur: kanalen är EN kurva, inte
  // en sammansatt siluett, så den fällan gäller inte här.)
  const ritaKanal = (k, bredd, vagg, lumen, dager) => {
    const vag = () => {
      const p0 = kurva(k, 0)
      kanalG.moveTo(p0.x, p0.y)
      for (let i = 1; i <= 12; i++) {
        const p = kurva(k, i / 12)
        kanalG.lineTo(p.x, p.y)
      }
    }
    vag(); kanalG.stroke({ width: bredd, color: vagg, cap: 'round', join: 'round' })
    vag(); kanalG.stroke({ width: bredd * 0.66, color: lumen, cap: 'round', join: 'round' })
    if (dager) { vag(); kanalG.stroke({ width: bredd * 0.2, color: dager, cap: 'round', alpha: 0.85 }) }
  }
  ritaKanal(KANAL.farg, 22, 0x8fb8cc, tint(GLAS, 0.35), 0xffffff)
  ritaKanal(KANAL.gnista, 20, 0x8fb8cc, tint(GLAS, 0.45), 0xffffff)
  ritaKanal(KANAL.storlek, 24, shade(LADER, 0.35), LADER, tint(LADER, 0.3))
  ritaKanal(KANAL.monster, 18, shade(TRA_MORK, 0.3), TRA_MORK, TRA)
  for (let i = 1; i < 6; i++) {
    const p = kurva(KANAL.storlek, i / 6)
    kanalG.circle(p.x, p.y, 12).fill({ color: shade(LADER, 0.18), alpha: 0.9 })
  }
  kanalG.eventMode = 'none'
  view.addChild(kanalG)

  // --- interiören (maskad till innanför glaset) ---
  const mask = G().circle(0, 0, R_INRE).fill(0xffffff)
  const inre = new Container()          // shake() äger inres x+y — masken står stilla
  const varldG = G()                    // himmel, mark, gräs, stjärnor
  const varldNyG = G()                  // inkommande värld — tonas IN över den gamla
  const bakProp = new Container()       // luftföremål
  const kornG = G()                     // regn, snö, löv, gnistkorn
  const framProp = new Container()      // markföremål
  const blobbSkugga = G().ellipse(0, 0, 44, 12).fill({ color: INK, alpha: 0.2 })
  blobbSkugga.position.set(0, MARK_Y + 4)
  const blobb = new Container()         // storleksskalan bor här
  const gnistLager = new Container()
  varldNyG.alpha = 0
  inre.addChild(varldG, varldNyG, bakProp, kornG, blobbSkugga, framProp, blobb, gnistLager)
  inre.eventMode = 'none'
  inre.mask = mask
  view.addChild(mask, inre)

  // --- glaset + mässingskragen (öppen upptill: kupan är en PLATS, inte en ram) ---
  const glas = G()
  glas.circle(0, 0, R).fill(verticalFillAlpha(0xffffff, 0x8fc9e6, 0.18, 0.1))
  glas.moveTo(-R * 0.7, -R * 0.42).quadraticCurveTo(-R * 0.96, R * 0.04, -R * 0.56, R * 0.62)
    .quadraticCurveTo(-R * 0.76, R * 0.0, -R * 0.54, -R * 0.44).closePath()
    .fill({ color: 0xffffff, alpha: 0.45 })
  glas.ellipse(R * 0.4, -R * 0.52, R * 0.15, R * 0.08).fill({ color: 0xffffff, alpha: 0.32 })
  glas.circle(0, 0, R - 2).stroke({ width: 5, color: 0xbfe3f2, alpha: 0.85 })
  glas.eventMode = 'none'
  const krage = G()
  krage.roundRect(-98, -R + 6, 196, 20, 9).fill(cylinderFill(MASSING, { axis: 'y' }))
  krage.ellipse(0, -R + 6, 92, 22).fill(cylinderFill(MASSING, { axis: 'x' }))
  krage.ellipse(0, -R + 5, 72, 14).fill(shade(MASSING, 0.62))
  krage.circle(-84, -R + 16, 5).fill(MASSING_MORK)
  krage.circle(84, -R + 16, 5).fill(MASSING_MORK)
  krage.eventMode = 'none'
  view.addChild(glas, krage)

  // --- väderkanalen: drivstång från veven upp till en lucka i taket över kupan ---
  const tak = new Container()
  const takG = G()
  // Takbjälken slutade tvärt i luften och läste som en svävande planka i skärmdumpen.
  // Två konsoler fäster den i väggen, och den går ut förbi bildkanten åt båda håll så den
  // läser som en bjälke i ett tak i stället för ett fritt föremål.
  takG.roundRect(-420, -230, 26, 30, 6).fill(topLightFill(TRA_MORK))
  takG.roundRect(160, -230, 26, 30, 6).fill(topLightFill(TRA_MORK))
  takG.roundRect(-470, -252, 700, 22, 7).fill(topLightFill(TRA_MORK))
  takG.roundRect(-58, -240, 116, 10, 3).fill(shade(TRA_MORK, 0.55))     // öppningen i taket
  takG.roundRect(-224, -244, 11, 462, 5).fill(cylinderFill(MASSING_MORK, { axis: 'y' }))
  takG.circle(-218, -236, 8).fill(MASSING)
  takG.circle(-218, 204, 8).fill(MASSING)
  const lucka = new Container()
  const luckaG = G()
  luckaG.roundRect(0, -6, 116, 13, 5).fill(topLightFill(TRA))
  luckaG.roundRect(6, -3, 104, 4, 2).fill({ color: 0xffffff, alpha: 0.2 })
  luckaG.circle(4, 0, 5).fill(MASSING_MORK)                             // gångjärnet
  lucka.addChild(luckaG)
  lucka.position.set(-58, -226)
  tak.addChild(takG, lucka)
  tak.eventMode = 'none'
  view.addChild(tak)

  // --- blobben: kupans sammanfattning, alltid gullig (sötma-envelopen S .52-.80 / L .56-.72)
  const blobbLiv = new Container()       // liv() äger y + rotation
  const blobbKrop = new Container()      // squash/pop äger scale
  const extraG = G()                     // öron/svans/horn BAKOM kroppen
  const kroppG = G()
  const monsterG = G()
  const ansikteG = G()
  const ogonV = new Container()
  const ogonH = new Container()
  blobbKrop.addChild(extraG, kroppG, monsterG, ansikteG, ogonV, ogonH)
  blobbLiv.addChild(blobbKrop)
  blobb.addChild(blobbLiv)
  blobb.position.set(0, MARK_Y - 46)

  // ⚠️ Pupillens blänk ritas i SAMMA Graphics. Ett barn på en Graphics ger Pixi v8:s
  // "Adding children to a ViewContainer is deprecated" — en tyst varning i konsolen som
  // harnessen loggar som fynd. En form per fill() är ändå rätt mönster här.
  const byggOga = (c) => {
    const vit = G().ellipse(0, 0, 13, 14.5).fill(0xffffff)
    const pup = new Container()
    const p = G()
    p.circle(0, 0, 7.2).fill(0x2c2430)
    p.circle(2.6, -2.8, 2.6).fill({ color: 0xffffff, alpha: 0.95 })
    p.circle(-2.4, 2.4, 1.4).fill({ color: 0xffffff, alpha: 0.5 })
    pup.addChild(p)
    c.addChild(vit, pup)
    c._wpup = pup
  }
  byggOga(ogonV)
  byggOga(ogonH)
  const OGON = [ogonV, ogonH]   // hoistad: `[ogonV, ogonH]` i tick() var en array per bildruta

  // --- tillstånd ---
  const val = { f: 0, z: 1, m: 0, v: 0, g: 0 }
  const antal = new Array(VARLDSNYCKEL.length).fill(0) // hur många föremål varje värld har fått
  let fro = 1                             // rundans frö — styr rekvisitans ordning (setFro)
  const props = []                       // { nod, inner, def, slot, fas, wx, wy }
  const gnistor = []                     // { nod, fas, r, fart }
  const korn = []                        // { x, y, vx, vy, typ, liv }
  const skalarer = { vatt: 0, varm: 0, grono: 0, sten: 0, natt: 0 }
  const palett = { bas: 0xffb85c, ljus: 0xffd08a, mork: 0xd08c30, buk: 0xffe0b4, monster: 0xc06a1e, kind: 0xff9ec4 }
  let ton0 = null                        // nuvarande interiörton (lerpas vid världsbyte)
  let tid = 0
  let extraLage = 0                       // vilken komisk siluett rullaOm() satte
  let pekX = 0
  let pekY = -30
  let tomKupa = false
  let kornRitade = false

  // ---- färg och skalärer ----
  function raknaSkalarer() {
    const vt = VARLDSTON[VARLDSNYCKEL[val.v]]
    skalarer.vatt = vt.bas.vatt || 0
    skalarer.varm = vt.bas.varm || 0
    skalarer.grono = vt.bas.grono || 0
    skalarer.sten = vt.bas.sten || 0
    skalarer.natt = vt.bas.natt || 0
    for (const p of props) if (p.def.skalar) skalarer[p.def.skalar] += 0.09
    const f = FARGER[val.f] || FARGER[0]
    if (f) {
      // varma nyanser (0-60° och 330-360°) värmer ljuset i kupan
      const h = ((f.h % 360) + 360) % 360
      const varm = h < 60 || h > 330 ? 1 : h < 100 ? 0.4 : 0
      skalarer.varm += varm * 0.22 + val.g * 0.05
    }
    for (const k of Object.keys(skalarer)) skalarer[k] = klamp(skalarer[k], 0, 1)
  }

  // ⚠️ Interiörens toner KVANTISERAS till fem steg innan de blir färger. Skälet är mätt:
  // form.js cachar varje fyllning per FÄRGPAR, så en ton som lerpas fritt (eller per
  // bildruta) bakar en ny gradient för varje mellanläge och fyller cachen för alltid —
  // exakt den `new FillGradient`-per-montering som destabiliserade hela testsviten.
  // Med fem steg är antalet distinkta par litet och bundet, och ögat ser ingen skillnad.
  const kv = (x) => Math.round(klamp(x, 0, 1) * 4) / 4
  function malTon() {
    const vt = VARLDSTON[VARLDSNYCKEL[val.v]]
    const vatt = kv(skalarer.vatt)
    const varm = kv(skalarer.varm)
    const natt = kv(skalarer.natt)
    const grono = kv(skalarer.grono)
    const sten = kv(skalarer.sten)
    let hT = lerpColor(vt.himmelT, 0x8ecff0, vatt * 0.4)
    let hB = lerpColor(vt.himmelB, 0xbfe9f7, vatt * 0.35)
    hT = lerpColor(hT, 0xffe0ae, varm * 0.3)
    hB = lerpColor(hB, 0xffeccb, varm * 0.3)
    hT = lerpColor(hT, 0x2a2a5e, natt * 0.55)
    hB = lerpColor(hB, 0x453a78, natt * 0.5)
    let mark = lerpColor(vt.mark, 0x59b45c, grono * 0.45)
    mark = lerpColor(mark, 0x9a938a, sten * 0.4)
    mark = lerpColor(mark, 0x3a7fa8, vatt * 0.3)
    return { hT, hB, mark, gras: grono, natt, varm }
  }
  const sammaTon = (a, b) => a && b && a.hT === b.hT && a.hB === b.hB && a.mark === b.mark
    && a.gras === b.gras && a.natt === b.natt && a.varm === b.varm

  function malaVarld(g, t) {
    g.clear()
    g.rect(-R_INRE - 4, -R_INRE - 4, R_INRE * 2 + 8, R_INRE * 2 + 8).fill(verticalFill(t.hT, t.hB))
    // stjärnor tänds med natten
    if (t.natt > 0.02) {
      for (let i = 0; i < 18; i++) {
        const a = (i * 2.399) % (Math.PI * 2)
        const r = 40 + ((i * 37) % 120)
        const x = Math.cos(a) * r
        const y = -60 - Math.abs(Math.sin(a)) * 90 + (i % 3) * 8
        g.circle(x, y, i % 4 === 0 ? 2.6 : 1.7).fill({ color: 0xfff6d0, alpha: t.natt * 0.9 })
      }
    }
    // marken
    g.moveTo(-R_INRE - 4, MARK_Y + 10)
      .quadraticCurveTo(-70, MARK_Y - 14, 10, MARK_Y - 2)
      .quadraticCurveTo(90, MARK_Y + 8, R_INRE + 4, MARK_Y - 4)
      .lineTo(R_INRE + 4, R_INRE + 6).lineTo(-R_INRE - 4, R_INRE + 6).closePath()
      .fill(groundFill(t.mark, { light: 0.13, dark: 0.24 }))
    // gräs/strån växer med grönskan
    const n = Math.round(3 + t.gras * 14)
    for (let i = 0; i < n; i++) {
      const x = -150 + ((i * 47) % 300)
      const h = 7 + ((i * 13) % 9) + t.gras * 9
      g.moveTo(x, MARK_Y + 4)
        .quadraticCurveTo(x + 3, MARK_Y + 4 - h * 0.6, x + (i % 2 ? 6 : -6), MARK_Y + 4 - h)
        .stroke({ width: 3, color: shade(t.mark, 0.28), cap: 'round' })
    }
    // varmt ljus uppifrån — linjärt, aldrig en radiell vinjett
    if (t.varm > 0.03) {
      g.rect(-R_INRE, -R_INRE, R_INRE * 2, R_INRE * 1.4)
        .fill(verticalFillAlpha(0xffd9a0, 0xffd9a0, t.varm * 0.22, 0))
    }
  }

  // Övergången är en ÖVERTONING (alfa på en nod), inte en färglerp per bildruta: två
  // ritningar per världsbyte i stället för trettio, och noll nya gradienter i mellanlägena.
  function satTon(direkt) {
    const mal = malTon()
    if (!ton0 || direkt) {
      ton0 = mal
      malaVarld(varldG, mal)
      varldNyG.clear()
      varldNyG.alpha = 0
      return
    }
    if (sammaTon(ton0, mal)) return
    ton0 = mal
    malaVarld(varldNyG, mal)
    varldNyG.alpha = 0
    gsap.killTweensOf(varldNyG)
    gsap.to(varldNyG, {
      alpha: 1, duration: 0.45, ease: 'sine.inOut',
      onComplete: () => {
        if (dod || varldG.destroyed || varldNyG.destroyed) return
        malaVarld(varldG, mal)
        varldNyG.alpha = 0
        varldNyG.clear()
      },
    })
  }

  function satPalett() {
    const f = FARGER[val.f] || FARGER[0] || { h: 32, s: 0.72, l: 0.64 }
    const vt = VARLDSTON[VARLDSNYCKEL[val.v]]
    const h = (((f.h + vinkelDiff(f.h, vt.hy) * 0.2) % 360) + 360) % 360
    const s = klamp((f.s ?? 0.7) * (vt.matt ?? 1), 0.52, 0.8)
    const l = klamp(f.l ?? 0.64, 0.56, 0.72)
    palett.bas = hslHex(h, s, l)
    palett.ljus = hslHex(h, s * 0.9, klamp(l + 0.14, 0, 0.94))
    palett.mork = hslHex(h, klamp(s + 0.06, 0, 1), klamp(l - 0.17, 0.1, 1))
    palett.buk = hslHex(h, s * 0.55, klamp(l + 0.18, 0, 0.95))
    palett.monster = hslHex((h + 16) % 360, s, klamp(l - 0.22, 0.12, 1))
    palett.kind = hslHex((h + 340) % 360, 0.66, 0.74)
  }

  // ---- blobben ----
  function ritaBlobb() {
    const rx = 46
    const ry = 42
    kroppG.clear(); monsterG.clear(); ansikteG.clear(); extraG.clear()
    // mörkare kontur-FORM bakom i stället för stroke tvärs över siluetten
    extraG.ellipse(0, 2, rx + 4, ry + 4).fill(palett.mork)
    if (extraLage === 1) {           // öron spretar ut
      extraG.ellipse(-rx * 0.72, -ry * 0.86, 15, 26).fill(palett.mork)
      extraG.ellipse(rx * 0.72, -ry * 0.86, 15, 26).fill(palett.mork)
      extraG.ellipse(-rx * 0.72, -ry * 0.82, 10, 20).fill(palett.ljus)
      extraG.ellipse(rx * 0.72, -ry * 0.82, 10, 20).fill(palett.ljus)
    } else if (extraLage === 2) {     // en svans piskar fram
      extraG.moveTo(rx * 0.7, ry * 0.2)
        .quadraticCurveTo(rx * 1.5, ry * 0.1, rx * 1.36, -ry * 0.7)
        .stroke({ width: 13, color: palett.mork, cap: 'round' })
      extraG.circle(rx * 1.36, -ry * 0.74, 12).fill(palett.ljus)
    } else if (extraLage === 3) {     // två horn
      extraG.moveTo(-rx * 0.4, -ry * 0.86).lineTo(-rx * 0.62, -ry * 1.5).lineTo(-rx * 0.14, -ry * 1.0).closePath().fill(0xf3e2bd)
      extraG.moveTo(rx * 0.4, -ry * 0.86).lineTo(rx * 0.62, -ry * 1.5).lineTo(rx * 0.14, -ry * 1.0).closePath().fill(0xf3e2bd)
    } else if (extraLage === 4) {     // taggar längs ryggen
      for (let i = -1; i <= 1; i++) {
        extraG.moveTo(i * 18 - 9, -ry * 0.92).lineTo(i * 18, -ry * 1.36).lineTo(i * 18 + 9, -ry * 0.92).closePath().fill(palett.monster)
      }
    }
    kroppG.ellipse(0, 0, rx, ry).fill(sphereFill(palett.bas, { lightY: 0.28, highlight: 0.4 }))
    kroppG.ellipse(0, ry * 0.36, rx * 0.6, ry * 0.4).fill({ color: palett.buk, alpha: 0.5 })
    ritaMonster(monsterG, rx, ry)
    // kinder + mun
    ansikteG.ellipse(-rx * 0.58, ry * 0.16, 9, 6).fill({ color: palett.kind, alpha: 0.55 })
    ansikteG.ellipse(rx * 0.58, ry * 0.16, 9, 6).fill({ color: palett.kind, alpha: 0.55 })
    ansikteG.moveTo(-9, ry * 0.12).quadraticCurveTo(0, ry * 0.34, 9, ry * 0.12)
      .stroke({ width: 3.4, color: shade(palett.mork, 0.25), cap: 'round' })
    ogonV.position.set(-17, -10)
    ogonH.position.set(17, -10)
  }

  // MÖNSTER ritas i blobbens statiska Graphics, mätt mot kroppen — aldrig ovanpå en
  // deformerande kropp. Bredden per rad kommer ur ellipsens korda, så inget spiller över.
  function ritaMonster(g, rx, ry) {
    const nyckel = (MONSTER && MONSTER[val.m]) || 'enfarg'
    const korda = (y) => rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)))
    if (nyckel === 'prickar') {
      const pts = [[-20, -6], [8, -14], [22, 6], [-6, 14], [-24, 12], [16, -2]]
      for (const [x, y] of pts) if (Math.abs(x) < korda(y) - 6) g.circle(x, y, 5.4).fill({ color: palett.monster, alpha: 0.8 })
    } else if (nyckel === 'ranger') {
      for (let i = -1; i <= 1; i++) {
        const y = i * 13
        const w = korda(y) - 4
        g.roundRect(-w, y - 3.6, w * 2, 7.2, 3.6).fill({ color: palett.monster, alpha: 0.62 })
      }
    } else if (nyckel === 'mage') {
      g.ellipse(0, ry * 0.24, rx * 0.66, ry * 0.56).fill({ color: palett.buk, alpha: 0.9 })
    } else if (nyckel === 'flackar') {
      const pts = [[-18, -10, 11], [14, 4, 13], [-8, 18, 8], [22, -12, 7]]
      for (const [x, y, r] of pts) if (Math.abs(x) + r * 0.4 < korda(y)) g.ellipse(x, y, r, r * 0.78).fill({ color: palett.monster, alpha: 0.55 })
    } else if (nyckel === 'stjarnor') {
      const pts = [[-19, -8], [10, -12], [18, 8], [-8, 15]]
      for (const [x, y] of pts) g.star(x, y, 5, 8, 3.6).fill({ color: 0xfff3b0, alpha: 0.9 })
    }
  }

  // ---- rekvisita i kupan ----
  const SLOT = [
    { x: -86, s: 1.0 }, { x: 82, s: 0.92 }, { x: -26, s: 0.84 },
    { x: 40, s: 0.8 }, { x: -128, s: 0.72 }, { x: 126, s: 0.7 },
  ]
  function slotPos(def, i) {
    const s = SLOT[Math.min(i, SLOT.length - 1)]
    const skala = s.s
    let y
    if (def.luft >= 1) y = -112 + (i % 3) * 12
    else if (def.luft > 0) y = -16 + (i % 3) * 16
    else y = MARK_Y + 2 - (1 - skala) * 46
    return { x: s.x, y, skala }
  }

  function laggProp(i, fladdra) {
    const lista = rekvisitaOrdning(fro, VARLDSNYCKEL[val.v])
    const def = lista[i % lista.length]
    const p = slotPos(def, i)
    // TRE nivåer, en skrivare var: `nod` bär läget (fallet in + tick:ens drift), `livNod`
    // bär liv()s gupp och vaggning (y + rotation), `inner` bär squash (scale) och den
    // kontinuerliga snurren. Låg liv() och snurren på samma nod skulle liv() skriva över
    // rotationen varje bildruta och solen stå still — utan ett enda konsolfel.
    const nod = new Container()
    const livNod = new Container()
    const inner = new Container()
    const g = G()
    def.rita(g, 40)
    g.eventMode = 'none'
    inner.addChild(g)
    livNod.addChild(inner)
    nod.addChild(livNod)
    nod.position.set(p.x, p.y)
    nod.scale.set(p.skala)
    nod.eventMode = 'none'
    ;(def.luft >= 1 ? bakProp : framProp).addChild(nod)
    const post = { nod, livNod, inner, def, fas: (i * 0.37 + val.v * 0.19) % 1, wx: p.x, wy: p.y }
    props.push(post)
    // vilo-liv med EGEN fas per föremål (P0 ASSETS). Stenen ligger blick stilla.
    if (def.rorelse !== 'still') {
      liv(livNod, {
        bob: def.rorelse === 'vajar' ? 2 : 5,
        sway: def.rorelse === 'vajar' ? 0.07 : 0.02,
        duration: 2.2 + (i % 4) * 0.35,
        phase: post.fas,
      })
    }
    if (fladdra) {
      // faller in genom kragen och landar
      const y0 = nod.y
      nod.y = -R_INRE - 20
      post.faller = true
      gsap.to(nod, {
        y: y0, duration: 0.5, ease: 'back.out(1.4)',
        onComplete: () => {
          post.faller = false
          if (!dod && !nod.destroyed) squash(inner, { intensity: 0.7 })
        },
      })
      nod.scale.set(p.skala * 0.7)
      gsap.to(nod.scale, { x: p.skala, y: p.skala, duration: 0.4, ease: 'back.out(2)' })
    } else {
      pop(inner)
    }
    return post
  }

  function rensaProps(flyg) {
    while (props.length) {
      const p = props.pop()
      const nod = p.nod
      if (flyg) {
        // världen åker UT genom kragen
        gsap.to(nod, {
          y: -R_INRE - 60, x: nod.x * 0.3, duration: 0.55, ease: 'power2.in',
          onComplete: () => { stadFx(nod); if (!nod.destroyed) nod.destroy({ children: true }) },
        })
        gsap.to(nod.scale, { x: 0.2, y: 0.2, duration: 0.55, ease: 'power2.in' })
      } else {
        stadFx(nod)
        if (!nod.destroyed) nod.destroy({ children: true })
      }
    }
  }

  function byggProps(fladdra) {
    rensaProps(false)
    const n = antal[val.v]
    for (let i = 0; i < n; i++) laggProp(i, fladdra && i === n - 1)
    raknaSkalarer()
  }

  // ---- gnistor i omloppsbana ----
  function satGnistor(n) {
    while (gnistor.length > n) {
      const g = gnistor.pop()
      stadFx(g.nod)
      if (!g.nod.destroyed) g.nod.destroy({ children: true })
    }
    while (gnistor.length < n) {
      const i = gnistor.length
      const nod = G().star(0, 0, 4, 9, 3.6).fill(0xfff3b0)
      nod.eventMode = 'none'
      gnistLager.addChild(nod)
      // tick() äger gnistans position, rotation OCH skala — ingen pop/liv får skriva här
      gnistor.push({ nod, fas: (i / 3) * Math.PI * 2, r: 62 + i * 9, fart: 0.9 + i * 0.16 })
      sparkle(inre, Math.cos(i) * 62, MARK_Y - 46, { count: 4 })
    }
  }

  // ---- korn (regn, snö, väder som ramlar in) ----
  function nyttKorn(x, y, typ) {
    // Samma skäl som i laggIn('varld'): under tömningen ska ingenting ramla ner i kupan.
    // Gnistpaketets callback landar också efter ett snabbt spaktryck.
    if (korn.length > 64 || tomKupa) return
    // Sanden driver i sidled (öknens vind), sporerna dalar långsamt och lyser (grottan).
    korn.push({
      x, y, typ,
      vx: typ === 'sno' ? (Math.random() - 0.5) * 14 : typ === 'sand' ? 26 + Math.random() * 22 : (Math.random() - 0.5) * 5,
      vy: typ === 'regn' ? 150 + Math.random() * 60 : typ === 'sand' ? 14 + Math.random() * 10 : typ === 'spor' ? 18 + Math.random() * 14 : 34 + Math.random() * 26,
      liv: 4,
    })
  }
  // Kornen tonar ut sista 0,4 s av sin livstid. Utan det slocknar de med FULL opacitet:
  // löv/snö/gnista faller 34–60 px/s och hinner aldrig till marken (de behöver 248–278 px
  // men `liv: 4` räcker till högst 240), så alla 14 försvann i samma bildruta mitt i luften
  // — samma liv och samma dt ger exakt samma dödsögonblick. Bara regnet (150–210 px/s) når
  // marklinjen och togs bort av y-villkoret som det var tänkt.
  function malaKorn() {
    kornG.clear()
    for (const k of korn) {
      const a = Math.min(1, k.liv * 2.5)
      if (k.typ === 'regn') kornG.roundRect(k.x - 1.4, k.y - 7, 2.8, 14, 1.4).fill({ color: 0xbfe6ff, alpha: 0.85 * a })
      else if (k.typ === 'sno') kornG.circle(k.x, k.y, 3).fill({ color: 0xffffff, alpha: 0.95 * a })
      else if (k.typ === 'lov') kornG.ellipse(k.x, k.y, 5, 3).fill({ color: 0x7ec46a, alpha: 0.95 * a })
      else if (k.typ === 'sand') kornG.ellipse(k.x, k.y, 4, 2.2).fill({ color: 0xe9c57c, alpha: 0.9 * a })
      else if (k.typ === 'spor') {
        kornG.circle(k.x, k.y, 5).fill({ color: 0x9ff2e6, alpha: 0.3 * a })
        kornG.circle(k.x, k.y, 2.4).fill({ color: 0xd9fff8, alpha: 0.95 * a })
      } else kornG.star(k.x, k.y, 4, 4.5, 1.8).fill({ color: 0xfff3b0, alpha: 0.95 * a })
    }
  }

  // ---- kanalpaket: det synliga som färdas från maskindelen in i kupan ----
  function skickaPaket(axel, farg, sedan) {
    const k = KANAL[axel]
    if (!k) return
    const nod = G().circle(0, 0, 9).fill(farg)
    nod.eventMode = 'none'
    const p0 = kurva(k, 0)
    nod.position.set(p0.x, p0.y)
    view.addChildAt(nod, view.getChildIndex(kanalG) + 1)
    const st = { t: 0 }
    gsap.to(st, {
      t: 1, duration: 0.26, ease: 'power1.in',
      onUpdate: () => {
        if (nod.destroyed) return
        const p = kurva(k, st.t)
        nod.position.set(p.x, p.y)
      },
      onComplete: () => {
        if (!nod.destroyed) nod.destroy()
        if (!dod) sedan?.()
      },
    })
  }

  // =============================== publikt API =====================================
  function setVal(nyVal) {
    if (!nyVal) return
    const bytteVarld = nyVal.v !== val.v
    const bytteFarg = nyVal.f !== val.f
    const bytteM = nyVal.m !== val.m
    const bytteZ = nyVal.z !== val.z
    val.f = nyVal.f | 0
    val.z = nyVal.z | 0
    val.m = nyVal.m | 0
    val.v = klamp(nyVal.v | 0, 0, VARLDSNYCKEL.length - 1)
    val.g = klamp(nyVal.g | 0, 0, 3)
    if (bytteVarld) byggProps(false)
    raknaSkalarer()
    satPalett()                 // paletten först: droppen i glasröret ska ha den NYA färgen
    satTon(ton0 === null)
    // ...men blobben målas om när droppen/valsen NÅR den, annars byter den färg innan
    // orsaken syns. Utan `senare` (ingen ctx.later inskickad) sker det direkt i stället.
    if (bytteFarg || bytteM) senare(0.26, () => { if (!dod) ritaBlobb() })
    else ritaBlobb()
    const s = (STORLEKAR && STORLEKAR[val.z]) || 1
    if (tomKupa) {
      tomKupa = false
      blobb.visible = true
      gsap.killTweensOf(blobb)
      blobb.position.set(0, MARK_Y - 46)
      blobb.scale.set(s * 0.3)
    }
    gsap.killTweensOf(blobb.scale)
    gsap.to(blobb.scale, { x: s, y: s, duration: bytteZ ? 0.34 : 0.2, ease: 'back.out(2)' })
    gsap.killTweensOf(blobbSkugga.scale)
    gsap.to(blobbSkugga.scale, { x: s, y: s, duration: 0.34, ease: 'back.out(2)' })
    satGnistor(val.g)
    if (bytteFarg) sparkle(inre, 0, MARK_Y - 50, { count: 5 })
  }

  // Rundans frö: rekvisitans ordning följer det. Finns redan föremål i kupan byts de ut på
  // plats med en squash — barnet SER att glaset gav nya saker (omrullningen, index.js 'glas').
  function setFro(nyttFro) {
    fro = (Number.isFinite(nyttFro) ? nyttFro : 1) >>> 0
    if (dod || !props.length || tomKupa) return
    byggProps(false)
    for (const p of props) squash(p.inner, { intensity: 0.6 })
  }

  // Spelar delens SYNLIGA kanal in i kupan. Det här är premissen: varje maskindel utför
  // det den ändrar, i samma bildruta som trycket.
  function laggIn(axel) {
    if (dod) return
    if (axel === 'farg') {
      skickaPaket('farg', palett.bas, () => {
        puff(inre, 0, MARK_Y - 50, { count: 9, color: palett.bas })
        squash(blobbKrop, { intensity: 0.8 })
        sfx('soft')
      })
      ton({ freq: 523, dur: 0.14, type: 'triangle', vol: 0.22 })
    } else if (axel === 'gnista') {
      skickaPaket('gnista', 0xfff3b0, () => {
        sparkle(inre, 0, MARK_Y - 60, { count: 7 })
        for (let i = 0; i < 6; i++) nyttKorn((Math.random() - 0.5) * 90, -R_INRE + 6, 'gnista')
        sfx('pling')
      })
      ton({ freq: 880, dur: 0.16, type: 'sine', vol: 0.2 })
    } else if (axel === 'storlek') {
      skickaPaket('storlek', 0xe9f6ff, () => {
        puff(inre, -60, MARK_Y - 30, { count: 7, color: 0xdfefff })
        squash(blobbKrop, { intensity: 1, hop: 8 })
        sfx('pop')
      })
      ton({ freq: 392, dur: 0.2, type: 'sine', vol: 0.2, slideTo: 520 })
    } else if (axel === 'monster') {
      // färgvalsen sveper vänster -> höger över blobben
      const vals = G().roundRect(-9, -46, 18, 92, 9).fill(cylinderFill(palett.monster, { axis: 'y' }))
      vals.eventMode = 'none'
      vals.position.set(-70, MARK_Y - 46)
      inre.addChild(vals)
      gsap.to(vals, {
        x: 70, duration: 0.5, ease: 'power1.inOut',
        onComplete: () => { if (!vals.destroyed) vals.destroy() },
      })
      skickaPaket('monster', palett.monster, () => sfx('flip'))
      ton({ freq: 587, dur: 0.12, type: 'square', vol: 0.14 })
    } else if (axel === 'varld') {
      // luckan i taket öppnas och vädret ramlar IN
      gsap.to(lucka, {
        rotation: -1.15, duration: 0.22, ease: 'back.out(2)',
        onComplete: () => { if (!dod && !lucka.destroyed) gsap.to(lucka, { rotation: 0, duration: 0.5, delay: 0.5, ease: 'power2.inOut' }) },
      })
      sfx('whoosh')
      ton({ freq: 330, dur: 0.26, type: 'triangle', vol: 0.18, slideTo: 440 })
      const typ = ['lov', 'regn', 'sno', 'gnista', 'sand', 'spor'][val.v] || 'lov'
      for (let i = 0; i < 14; i++) nyttKorn((Math.random() - 0.5) * 110, -R_INRE - 8 - Math.random() * 30, typ)
      senare(0.34, () => {
        // `tomKupa` MÅSTE vaktas här: trycker barnet på spaken inom 0,34 s har `tomma()`
        // redan nollat `antal` och rensat föremålen, och den här callbacken lade då
        // tillbaka ett träd i den kupa barnet just sett tömmas. Eftersom `_aterstall`
        // anropar setVal med OFÖRÄNDRAD värld byggs props aldrig om — föremålet stod
        // kvar hela nästa omgång.
        if (dod || tomKupa) return
        if (antal[val.v] < SLOT.length) {
          antal[val.v] += 1
          laggProp(antal[val.v] - 1, true)
          raknaSkalarer()
          satTon(false)
        } else {
          for (const p of props) squash(p.inner, { intensity: 0.6 })
        }
        sfx('pop')
      })
    }
  }

  // Ett tryck på glaset: hela förhandsvisningen skakar, blobben byter siluett komiskt,
  // föremålen guppar. Samtidigt omrullningen av fröet (index.js lyssnar på 'glas').
  function rullaOm() {
    if (dod) return
    let n = 1 + ((Math.random() * 4) | 0)
    if (n === extraLage) n = (n % 4) + 1
    extraLage = n
    ritaBlobb()
    shake(inre, { intensity: 7, duration: 0.36 })
    squash(blobbKrop, { intensity: 1.1, hop: 12 })
    for (const p of props) squash(p.inner, { intensity: 0.7 })
    sparkle(inre, 0, MARK_Y - 56, { count: 6 })
    sfx('pop')
    ton({ freq: 660, dur: 0.14, type: 'sine', vol: 0.18, slideTo: 990 })
  }

  // Kläckningen tömmer kupan — världen åkte IN i ägget och kommer UT som miljön.
  function tomma() {
    if (dod) return
    rensaProps(true)
    satGnistor(0)
    korn.length = 0
    malaKorn()
    antal.fill(0)
    tomKupa = true
    gsap.killTweensOf(blobb.scale)
    gsap.killTweensOf(blobb)
    gsap.to(blobb.scale, {
      x: 0.05, y: 0.05, duration: 0.45, ease: 'power2.in',
      onComplete: () => { if (!blobb.destroyed) blobb.visible = false },
    })
    gsap.to(blobb, { y: -R_INRE + 20, duration: 0.5, ease: 'power2.in' })
    gsap.killTweensOf(blobbSkugga.scale)
    gsap.to(blobbSkugga.scale, { x: 0.05, y: 0.05, duration: 0.35, ease: 'power2.in' })
    sfx('whoosh')
  }

  function tick(dtMS, pekare) {
    if (dod) return
    const dt = Math.min(0.05, (dtMS || 16) / 1000)
    tid += dt
    if (pekare) {
      pekX = pekare.x - view.x
      pekY = pekare.y - view.y
    }
    // föremålens egna rörelser (utöver liv()s gupp)
    for (const p of props) {
      const r = p.def.rorelse
      // `faller` är infallstweenens halvsekund. Utan den vakten skriver raderna nedan
      // `nod.x/nod.y` varje bildruta OVANPÅ tweenen — fisken (rörelse 'simmar') ramlade
      // aldrig in genom kragen som de andra föremålen, den bara poppade upp på sin plats.
      if (p.faller) continue
      if (r === 'snurr') p.inner.rotation += dt * 0.55
      else if (r === 'driver') p.nod.x = p.wx + Math.sin(tid * 0.42 + p.fas * 6.28) * 22
      else if (r === 'simmar') {
        p.nod.x = p.wx + Math.sin(tid * 0.75 + p.fas * 6.28) * 30
        p.nod.y = p.wy + Math.sin(tid * 1.5 + p.fas * 3.1) * 6
      }
      if (p.def.regn && Math.random() < dt * 9) {
        nyttKorn(p.nod.x + (Math.random() - 0.5) * 46, p.nod.y + 14, p.def.regn)
      }
    }
    // korn faller
    for (let i = korn.length - 1; i >= 0; i--) {
      const k = korn[i]
      k.x += k.vx * dt
      k.y += k.vy * dt
      k.liv -= dt
      if (k.y > MARK_Y + 6 || k.liv <= 0) korn.splice(i, 1)
    }
    // Förändringsvakt: Pixis GraphicsContext.clear() har ingen tom-vakt — den sätter
    // `dirty` och sänder 'update' även med noll instruktioner, så en ovillkorlig
    // clear+omritning byggde om kontexten varje bildruta också när kornlistan var tom
    // (vilket den är i de flesta bildrutorna). En sista omritning krävs när listan
    // NYSS tömdes, annars blir sista kornet stående kvar.
    if (korn.length || kornRitade) {
      malaKorn()
      kornRitade = korn.length > 0
    }
    // gnistorna kretsar kring blobben
    for (const g of gnistor) {
      g.fas += dt * g.fart
      g.nod.x = Math.cos(g.fas) * g.r
      g.nod.y = MARK_Y - 46 + Math.sin(g.fas * 1.3) * 26
      g.nod.rotation += dt * 2
      g.nod.scale.set(0.8 + Math.sin(g.fas * 2) * 0.2)
    }
    // ögonen följer fingret som en KLAMPAD vektor — pupillen kryper aldrig ur ögat
    for (const oga of OGON) {
      const ox = blobb.x + oga.x * blobb.scale.x
      const oy = blobb.y + oga.y * blobb.scale.y
      const dx = pekX - ox
      const dy = pekY - oy
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, d / 150) * 4.6
      const pupNod = oga._wpup
      pupNod.x += (dx / d * k - pupNod.x) * Math.min(1, dt * 9)
      pupNod.y += (dy / d * k - pupNod.y) * Math.min(1, dt * 9)
    }
  }

  function onTap() {
    if (dod) return
    rullaOm()
    pa('glas', {})
  }
  view.on('pointertap', onTap)

  // första bilden byggs SYNKRONT (tom-scen-vakten startar 1000 ms efter mount)
  raknaSkalarer()
  satPalett()
  satTon(true)
  ritaBlobb()
  blobb.scale.set((STORLEKAR && STORLEKAR[val.z]) || 1)
  liv(blobbLiv, { bob: 6, sway: 0.035, duration: 2.6, phase: 0.2 })

  function destroy() {
    dod = true
    view.off('pointertap', onTap)
    rensaProps(false)
    korn.length = 0
    for (const g of gnistor) { stadFx(g.nod) }
    gnistor.length = 0
    inre.mask = null                 // masken kopplas loss FÖRE rivningen
    stadFx(view)
    if (!view.destroyed) view.destroy({ children: true })
  }

  return { view, setVal, setFro, laggIn, tomma, tick, destroy }
}

// =====================================================================================
// MASKINDELARNA — ritade föremål i trä och mässing, aldrig pilknappar.
// Varje del äger sin egen räknare så den komiska överfyllningen (tom burk, lång pfffff)
// kan bo i delen; det NYA värdet skickas med i `pa('verktyg', { axel, steg })`, så
// index.js och delen kan aldrig glida isär.
// =====================================================================================
const AXEL = {
  farg: { steg: 10, ton: 523, storlek: 168 },
  gnista: { steg: 4, ton: 659, storlek: 168, tomt: true },
  storlek: { steg: 4, ton: 392, storlek: 168, tomt: true },
  monster: { steg: 6, ton: 587, storlek: 168 },
  varld: { steg: VARLDSNYCKEL.length, ton: 440, storlek: 144 },
}

export function byggVerktyg(axel, opts = {}) {
  const spec = AXEL[axel] || AXEL.farg
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)
  let dod = false
  let steg = 0
  let last = false
  // Hur många av `spec.steg` som är UPPLÅSTA just nu. Verkstan börjar smalare än
  // tabellerna och växer med antalet kläckta knytt (ÅTGÄRDER U3) — men taket ägs av
  // index.js, för det är där räknaren och sparposten bor. Utan `satTak` står den på
  // hela tabellen, alltså precis som före upplåsningarna.
  let tak = spec.steg

  const view = new Container()
  view.eventMode = 'static'
  view.cursor = 'pointer'
  // P0: minst 96 px. `opts.bredd` låter index.js äga layouttabellen, men golvet är hårt.
  const bredd = Math.max(96, opts.bredd || spec.storlek)
  view.hitArea = new Rectangle(-bredd / 2, -bredd / 2, bredd, bredd)

  const lock = new Container()          // satLast() äger y + rotation + alpha
  const kropp = new Container()         // liv() äger y + rotation
  const rorlig = new Container()        // delens EGEN rörelse äger rotation/x/y
  const bas = G()
  const skugga = G().ellipse(0, 62, 58, 14).fill({ color: INK, alpha: 0.16 })
  kropp.addChild(skugga, bas, rorlig)
  lock.addChild(kropp)
  view.addChild(lock)

  const rG = G()
  rorlig.addChild(rG)

  // --- ritningarna ---
  if (axel === 'farg') {
    // Färgkranen: träsockel, mässingsstam, pip och ett kvartsvarvshandtag i trä.
    bas.roundRect(-54, 30, 108, 32, 9).fill(topLightFill(TRA))
    bas.roundRect(-48, 24, 96, 10, 5).fill(topLightFill(TRA_MORK))
    bas.roundRect(-14, -34, 28, 62, 8).fill(cylinderFill(MASSING, { axis: 'y' }))
    bas.roundRect(-6, -32, 62, 20, 9).fill(cylinderFill(MASSING, { axis: 'x' }))
    bas.roundRect(44, -20, 20, 26, 7).fill(cylinderFill(MASSING_MORK, { axis: 'y' }))
    bas.circle(0, -34, 14).fill(cylinderFill(MASSING, { axis: 'x' }))
    rG.roundRect(-36, -8, 72, 15, 7).fill(topLightFill(TRA_MORK))
    rG.circle(-36, 0, 10).fill(topLightFill(TRA))
    rG.circle(36, 0, 10).fill(topLightFill(TRA))
    rorlig.position.set(0, -48)
  } else if (axel === 'gnista') {
    // Stjärnstoftsburken i sin trävagga.
    bas.roundRect(-58, 34, 116, 28, 9).fill(topLightFill(TRA))
    bas.moveTo(-52, 34).quadraticCurveTo(-46, -14, -14, -22).lineTo(-14, 34).closePath().fill(topLightFill(TRA_MORK))
    bas.moveTo(52, 34).quadraticCurveTo(46, -14, 14, -22).lineTo(14, 34).closePath().fill(topLightFill(TRA_MORK))
    rG.roundRect(-30, -46, 60, 74, 12).fill(verticalFillAlpha(0xf2fbff, 0xbfe3f2, 0.85, 0.75))
    rG.roundRect(-24, -8, 48, 32, 8).fill({ color: 0xffe27a, alpha: 0.95 })
    for (let i = 0; i < 5; i++) rG.star(-16 + i * 8, 4 + (i % 3) * 8, 4, 4, 1.6).fill(0xfff8d0)
    rG.roundRect(-16, -58, 32, 16, 5).fill(topLightFill(LADER))
    rG.roundRect(-30, -46, 60, 8, 4).fill({ color: 0xffffff, alpha: 0.5 })
    rorlig.position.set(0, 6)
  } else if (axel === 'storlek') {
    // Bälgen i SIDOPROFIL: trätrampa överst, tre lädervek, undre paddel och ett munstycke
    // som pekar mot kupan. Kilen (spetsen at hoger) ar det som gor att den laser som en balg.
    bas.roundRect(-60, 48, 120, 20, 8).fill(topLightFill(TRA_MORK))
    bas.moveTo(-58, 36).lineTo(50, 26).lineTo(50, 40).lineTo(-58, 50).closePath().fill(topLightFill(TRA))
    for (let i = 0; i < 3; i++) {
      const y = 6 + i * 10
      bas.moveTo(-54, y).lineTo(46, y - 5).lineTo(46, y + 5).lineTo(-54, y + 10).closePath()
        .fill(topLightFill(i % 2 ? LADER : shade(LADER, 0.2)))
    }
    bas.moveTo(46, 14).lineTo(86, 22).lineTo(86, 34).lineTo(46, 30).closePath().fill(cylinderFill(MASSING, { axis: 'x' }))
    bas.circle(-56, 32, 8).fill(MASSING_MORK)
    rG.moveTo(-58, -14).lineTo(50, -4).lineTo(50, 8).lineTo(-58, 2).closePath().fill(topLightFill(TRA))
    rG.moveTo(-52, -10).lineTo(40, -1).lineTo(40, 2).lineTo(-52, -6).closePath().fill({ color: 0xffffff, alpha: 0.2 })
    rG.circle(-40, -6, 9).fill(MASSING)
    rorlig.position.set(0, -12)
  } else if (axel === 'monster') {
    // Mönsterhjulet: trätrumma med sex fält, mässingsnav och ett spärrhake.
    bas.roundRect(-52, 46, 104, 22, 8).fill(topLightFill(TRA))
    bas.roundRect(-10, 6, 20, 46, 6).fill(topLightFill(TRA_MORK))
    rG.circle(0, 0, 54).fill(0x7a4f2c)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const a2 = ((i + 1) / 6) * Math.PI * 2
      rG.moveTo(0, 0)
        .lineTo(Math.cos(a) * 50, Math.sin(a) * 50)
        .lineTo(Math.cos((a + a2) / 2) * 52, Math.sin((a + a2) / 2) * 52)
        .lineTo(Math.cos(a2) * 50, Math.sin(a2) * 50)
        .closePath()
        .fill(i % 2 ? topLightFill(TRA) : topLightFill(tint(TRA, 0.18)))
      rG.circle(Math.cos(a + 0.5) * 32, Math.sin(a + 0.5) * 32, 5).fill(shade(TRA_MORK, 0.2))
    }
    rG.circle(0, 0, 15).fill(cylinderFill(MASSING, { axis: 'x' }))
    rorlig.position.set(0, -6)
    // spärrhaken sitter UTANFÖR hjulets radie (54) så klacket syns när trumman ratschar
    bas.moveTo(52, -40).lineTo(76, -54).lineTo(80, -40).lineTo(58, -28).closePath().fill(topLightFill(MASSING_MORK))
  } else {
    // Väderveven: mässingsväxellåda med ett trähandtag.
    bas.roundRect(-40, 10, 80, 40, 10).fill(topLightFill(MASSING_MORK))
    bas.roundRect(-34, 16, 68, 8, 4).fill({ color: 0xffffff, alpha: 0.18 })
    bas.roundRect(-46, 46, 92, 18, 7).fill(topLightFill(TRA))
    bas.circle(0, 4, 13).fill(cylinderFill(MASSING, { axis: 'x' }))
    rG.roundRect(-5, -40, 10, 46, 5).fill(cylinderFill(JARN, { axis: 'y' }))
    rG.roundRect(-5, -44, 40, 11, 5).fill(cylinderFill(JARN, { axis: 'x' }))
    rG.circle(34, -38, 11).fill(topLightFill(TRA_MORK))
    rorlig.position.set(0, 4)
  }
  bas.eventMode = 'none'
  rG.eventMode = 'none'
  skugga.eventMode = 'none'

  // vilo-liv med EGEN fas per verktyg — samma axel ger alltid samma fas, aldrig ett lås
  const fas = { farg: 0.05, gnista: 0.37, storlek: 0.62, monster: 0.81, varld: 0.24 }[axel] || 0
  liv(kropp, { bob: 3, sway: 0.012, duration: 2.5 + fas, phase: fas })

  // Delens EGNA rörelse. Anropas av pekningen, men också av vilohjälpen i index.js —
  // därför fyrar den ALDRIG `pa` själv.
  function tryck(o = {}) {
    if (dod) return
    const tomt = !!o.tomt
    if (axel === 'farg') {
      gsap.killTweensOf(rorlig)
      gsap.to(rorlig, { rotation: rorlig.rotation + Math.PI / 2, duration: 0.22, ease: 'back.out(2)' })
      ton({ freq: 300, dur: 0.07, type: 'square', vol: 0.12 })
    } else if (axel === 'gnista') {
      gsap.killTweensOf(rorlig)
      const mal = tomt ? -3.1 : -0.75
      gsap.timeline()
        .to(rorlig, { rotation: mal, duration: 0.22, ease: 'power2.out' })
        .to(rorlig, { rotation: 0, duration: 0.5, delay: tomt ? 0.5 : 0.25, ease: 'back.out(1.6)' })
      // skramlet ligger på INNERnoden: rorlig.rotation ägs redan av tidslinjen ovan
      if (tomt) wiggle(rG)
    } else if (axel === 'storlek') {
      gsap.killTweensOf(rorlig)
      gsap.timeline()
        .to(rorlig, { y: 2, duration: 0.1, ease: 'power2.in' })
        .to(rorlig, { y: -14, duration: tomt ? 0.7 : 0.34, ease: 'power2.out' })
    } else if (axel === 'monster') {
      gsap.killTweensOf(rorlig)
      gsap.to(rorlig, { rotation: rorlig.rotation + Math.PI / 3, duration: 0.26, ease: 'back.out(1.8)' })
      ton({ freq: 220, dur: 0.05, type: 'square', vol: 0.1 })
    } else {
      gsap.killTweensOf(rorlig)
      gsap.to(rorlig, { rotation: rorlig.rotation + Math.PI * 2, duration: 0.5, ease: 'power2.inOut' })
    }
    pop(rG)
  }

  function onTap() {
    if (dod || last) return
    const cyk = tak
    let event = 'verktyg'
    let tomt = false
    if (spec.tomt && steg >= cyk - 1) {
      // Överfyllningen är ROLIG, aldrig ett fel: burken vänder sig upp och ner och
      // skramlar tomt · bälgen slår i taket och tömmer sig med en lång pfffff.
      tomt = true
      steg = 0
      event = 'tomt'
    } else {
      steg = (steg + 1) % cyk
    }
    tryck({ tomt })
    // EXAKT ETT `pa` per pekning. Fyras både 'tomt' och 'verktyg' stegar en lyssnare som
    // ignorerar händelsenamnet (index.js gör det) axeln TVÅ steg på ett enda tryck.
    if (tomt) {
      sfx('flip')
      ton({ freq: 180, dur: 0.5, type: 'sawtooth', vol: 0.14, slideTo: 90 })
    } else {
      sfx('tap')
      ton({ freq: spec.ton, dur: 0.14, type: 'triangle', vol: 0.2 })
    }
    pa(event, { axel, steg, tomt })
  }
  view.on('pointertap', onTap)

  // Vilohjälpens "titta hit" — delen gör sin EGNA rörelse och säger sin EGNA ton, utan att
  // röra räknaren. `tryck()` är ren animation (stegningen sker i `onTap` innan den kallas),
  // så spelet spelar aldrig åt barnet. Före den här fanns ingen väg in: index.js nådde
  // `squash(v.view.children[0])` förbi modulen och spelade 392 Hz — `storlek`s ton — oavsett
  // vilken del som lystes upp.
  function locka() {
    if (dod || last) return
    tryck({ tomt: false })
    ton({ freq: spec.ton, dur: 0.16, type: 'triangle', vol: 0.2 })
  }

  function satLast(v) {
    last = !!v
    view.eventMode = last ? 'none' : 'static'
    gsap.killTweensOf(lock)
    gsap.to(lock, {
      rotation: last ? 0.85 : 0, y: last ? 34 : 0, alpha: last ? 0.72 : 1,
      duration: 0.34, ease: last ? 'power2.in' : 'back.out(1.6)',
    })
  }

  // Låt index.js synka delens räknare med sitt eget värde (t.ex. efter en kläckning).
  function satSteg(n) { steg = ((n | 0) % tak + tak) % tak }

  // Upplåsningarnas enda ingång. Klampas mot tabellen — en axel kan aldrig växa förbi
  // sina egna delar — och steget dras med, så en synk kan inte lämna kvar ett läge
  // ovanför taket (två sanningar om samma axel är precis det `satSteg` finns för).
  function satTak(n) {
    tak = Math.max(1, Math.min(spec.steg, n | 0))
    steg = ((steg % tak) + tak) % tak
  }

  function destroy() {
    dod = true
    view.off('pointertap', onTap)
    stadFx(view)
    if (!view.destroyed) view.destroy({ children: true })
  }

  // `locka` MÅSTE stå här. Spakens `locka()` skrevs en gång utan att läggas i sitt
  // returobjekt, och `?.()` svalde anropet tyst i två dygn — se docens §5 punkt 4.
  return { view, tryck, locka, satLast, satSteg, satTak, destroy }
}

// =====================================================================================
// SPAKEN — mässing med en fet röd knopp. Ställs på (1160, 350) av index.js.
// Ingen av harnessens nio standardtryck ligger i den här träffytan; flyttas spaken
// någonsin måste layouten i docs/games/unika-knytt.md §1b räknas om FÖRST.
// =====================================================================================
export function byggSpak(opts = {}) {
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  const sfx = (n) => audio?.sfx?.(n)
  const ton = (o) => audio?.tone?.(o)
  let dod = false

  const view = new Container()
  view.eventMode = 'static'
  view.cursor = 'pointer'
  view.hitArea = new Rectangle(-100, -120, 200, 240)

  const bas = G()
  bas.ellipse(0, 108, 74, 18).fill({ color: INK, alpha: 0.16 })
  bas.roundRect(-64, 52, 128, 56, 14).fill(topLightFill(TRA_MORK))
  bas.roundRect(-52, 40, 104, 20, 9).fill(cylinderFill(MASSING_MORK, { axis: 'y' }))
  bas.circle(-42, 84, 6).fill(MASSING)
  bas.circle(42, 84, 6).fill(MASSING)
  // Kvadrantplåt: en FYLLD sektor från armens vridpunkt (0,44), så spaken har ett synligt
  // läge att svänga till. Armen svänger 0 → 1,08 rad, alltså från rakt upp (−π/2) till −0,49
  // — sektorn täcker just den vägen.
  // ⚠️ Var först en TUNN skära i järnton, och läste då som ett LIEBLAD i skärmdumpen.
  // Ett fyllt mässingssegment läser som en maskindel. Syntes bara i bilden, aldrig i ett test.
  bas.moveTo(0, 44).arc(0, 44, 78, -1.66, -0.40).closePath()
    .fill(topLightFill(MASSING_MORK, { highlight: 0.2, dark: 0.3 }))
    .stroke({ width: 3, color: shade(MASSING_MORK, 0.4), alpha: 0.75 })
  for (let i = 0; i < 4; i++) {
    const a = -1.52 + i * 0.34
    bas.circle(Math.cos(a) * 60, 44 + Math.sin(a) * 60, 4).fill(shade(MASSING_MORK, 0.45))
  }
  bas.eventMode = 'none'

  const arm = new Container()           // dra() äger armens rotation
  const armG = G()
  armG.roundRect(-11, -104, 22, 116, 11).fill(cylinderFill(MASSING, { axis: 'y' }))
  armG.circle(0, 8, 15).fill(cylinderFill(MASSING_MORK, { axis: 'x' }))
  armG.eventMode = 'none'
  const knopp = new Container()          // pop() äger knoppens scale
  const knoppG = G().circle(0, 0, 30).fill(sphereFill(0xe8443c, { highlight: 0.42 }))
  knoppG.eventMode = 'none'
  knopp.addChild(knoppG)
  knopp.position.set(0, -112)
  arm.addChild(armG, knopp)
  arm.position.set(0, 44)
  view.addChild(bas, arm)

  liv(knopp, { bob: 3, sway: 0.02, duration: 2.1, phase: 0.6 })

  function dra() {
    if (dod) return
    gsap.killTweensOf(arm)
    gsap.to(arm, { rotation: 1.08, duration: 0.3, ease: 'power3.in' })   // 62 grader ner
    pop(knopp, { scale: 1.14 })
    sfx('whoosh')
    ton({ freq: 96, dur: 0.42, type: 'sawtooth', vol: 0.22, slideTo: 58 })
    ton({ freq: 180, dur: 0.2, type: 'square', vol: 0.1, delay: 0.05 })
  }

  function aterstall() {
    if (dod) return
    gsap.killTweensOf(arm)
    gsap.to(arm, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' })
  }

  // Vilohjälpen i index.js (`_viloHjalp` steg 2–3) lockar med knoppen medan
  // handpiktogrammet svävar över den. Den anropades som `this._spak?.locka?.()` mot en
  // metod som aldrig exporterats — `?.` svalde anropet tyst, så handen pekade på en spak
  // som stod blick stilla. Kommentaren där sa hela tiden att knoppen "studsar".
  function locka() {
    if (dod) return
    pop(knopp, { scale: 1.12 })
  }

  function onTap() {
    if (dod) return
    pa('spak', {})
  }
  view.on('pointertap', onTap)

  function destroy() {
    dod = true
    view.off('pointertap', onTap)
    stadFx(view)
    if (!view.destroyed) view.destroy({ children: true })
  }

  return { view, dra, aterstall, locka, destroy }
}
