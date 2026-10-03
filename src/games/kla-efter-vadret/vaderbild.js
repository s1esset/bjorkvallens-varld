// VÄDRETS BILD — luften i rummet SYNS: vindstrimmor som följer fältet och löv som flyter med det.
// Lagret ligger bakom plaggen och Elvira (läggs till före dem) och tar aldrig emot tryck.
//
// Allt drivs av `vader.js` (ett Vindfalt): en strimma/ett löv läser luften där det är och rör sig
// därefter, så en by syns som en våg av strimmor och löv som sveper från strecket mot fönstret. Utan
// vind (sol, snö) står strimmorna nästan still och osynliga — ingen vind är ingen bild.
// Inga tweens, inga timers: allt stegas av spelets tick, så det finns inget att städa utom noderna.
import { Container, Graphics } from 'pixi.js'
import { luftVid, blasMedLuft, LUFT_PX } from './vader.js'

const LOVFARGER = [0xe08a3c, 0xd9b43c, 0xb85c2c, 0x8fb84a, 0xcf6b2e, 0xe8a83a]
const ANTAL_LOV = 8
const ANTAL_STRIMMOR = 7
const rand = (lo, hi) => lo + Math.random() * (hi - lo)

function ritaLov(g, farg) {
  g.clear()
  g.ellipse(2, 2, 14, 8).fill({ color: 0x000000, alpha: 0.1 }) // skugga mot väggen
  g.ellipse(0, 0, 14, 8).fill(farg).stroke({ width: 2, color: 0x7a4a24, alpha: 0.7 })
  g.moveTo(-10, 0).lineTo(10, 0).stroke({ width: 1.5, color: 0x7a4a24, alpha: 0.55 })
  g.moveTo(-14, 0).lineTo(-21, 3).stroke({ width: 2.5, color: 0x7a4a24 })
}

// vader = tillståndet ur nyttVader · view = ctx.view (LEVANDE — läses vid användning).
export function byggVaderbild(vader, view) {
  const rot = new Container()
  rot.eventMode = 'none'
  rot.interactiveChildren = false

  const strimmor = new Graphics()
  strimmor.eventMode = 'none'
  rot.addChild(strimmor)

  const lovLager = new Container()
  lovLager.eventMode = 'none'
  lovLager.alpha = 0
  lovLager.visible = false
  rot.addChild(lovLager)

  const lov = []
  for (let i = 0; i < ANTAL_LOV; i++) {
    const g = new Graphics()
    ritaLov(g, LOVFARGER[i % LOVFARGER.length])
    const l = { g, x: 0, y: 0, vx: 0, vy: 0, ph: rand(0, 6.28), dre: rand(1.2, 2.4) }
    lovLager.addChild(g)
    lov.push(l)
  }
  const slapp = (l, spritt) => {
    l.x = spritt ? rand(view.left - 40, view.right) : view.left - rand(30, 160)
    l.y = rand(70, 540)
    l.vx = 0
    l.vy = 0
  }
  for (const l of lov) slapp(l, true)

  const str = []
  for (let i = 0; i < ANTAL_STRIMMOR; i++) {
    str.push({ x: rand(view.left, view.right), y: 60 + (i * 520) / ANTAL_STRIMMOR + rand(-20, 20), len: rand(90, 170), ph: rand(0, 6.28) })
  }

  let lovMal = 0
  let forraNyckel = null

  return {
    view: rot,

    // Vädret bytte: löven syns bara i blåst (fönstrets löv syns i sin egen scen).
    stall(key, snap = false) {
      lovMal = key === 'bla' ? 1 : 0
      if (key === 'bla' && forraNyckel !== 'bla') for (const l of lov) slapp(l, true)
      forraNyckel = key
      if (snap) {
        lovLager.alpha = lovMal
        lovLager.visible = lovMal > 0
      }
    },

    // dt = sekunder.
    update(dt) {
      if (rot.destroyed) return
      const d = Math.min(0.05, dt)

      // Strimmorna: bågar som driver med luften och syns i proportion till styrkan där.
      strimmor.clear()
      for (const s of str) {
        const a = luftVid(vader, s.x, s.y)
        s.x += a.s * LUFT_PX * 0.95 * d
        if (s.x > view.right + s.len) {
          s.x = view.left - s.len - rand(0, 140)
          s.y = rand(60, 560)
          s.len = rand(90, 170)
        }
        const al = Math.min(0.5, Math.max(0, (a.s - 0.2) * 0.8))
        if (al < 0.02) continue
        const len = s.len * (0.7 + 0.5 * Math.min(1, a.s))
        const y = s.y + Math.sin(vader.t * 1.3 + s.ph) * 6
        strimmor
          .moveTo(s.x, y)
          .bezierCurveTo(s.x + len * 0.3, y - 10, s.x + len * 0.62, y + 10, s.x + len, y - 3)
          .stroke({ width: 5, color: 0x7fb8e0, alpha: al, cap: 'round' })
        strimmor
          .moveTo(s.x + len * 0.15, y + 14)
          .quadraticCurveTo(s.x + len * 0.5, y + 6, s.x + len * 0.78, y + 15)
          .stroke({ width: 3, color: 0x7fb8e0, alpha: al * 0.7, cap: 'round' })
      }

      // Löven: tona in/ut med vädret, flyt med luften.
      lovLager.alpha += (lovMal - lovLager.alpha) * Math.min(1, d * 2.5)
      lovLager.visible = lovLager.alpha > 0.02
      if (!lovLager.visible) return
      for (const l of lov) {
        const s = blasMedLuft(vader, l, d)
        l.ph += d * (2.5 + s * 3) * l.dre
        l.g.position.set(l.x, l.y + Math.sin(l.ph) * 7)
        l.g.rotation = Math.atan2(l.vy, Math.max(40, l.vx)) * 0.8 + Math.sin(l.ph * 0.8) * 0.7
        if (l.x > view.right + 40 || l.y > 760 || l.y < -80) slapp(l, false)
      }
    },

    destroy() {
      lov.length = 0
      str.length = 0
    },
  }
}
