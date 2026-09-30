// Sällsynta fångster i magnet-fiske: guldfisk, skattkista och en gammal stövel. Ritade som
// fristående föremål (aldrig emoji), var och en med eget liv. Allt centreras i (0,0) och
// håller sig inom ~±40 px så att fysikkroppen (r 38) och hink-högen stämmer.
//
// Fångsterna är en BONUS, aldrig ett krav: de räknas inte i nivåns mål (se index.js), så en
// stövel kan aldrig blockera en nivå. Att de ändå dras av magneten är sagans logik —
// stöveln har järnhätta, spänne och spikar, kistan har järnband, guldfisken är magisk.
import { Container, Graphics } from 'pixi.js'
import { bage } from '../../lib/form.js'

export const RARA = ['guldfisk', 'kista', 'stovel']
// Ordet som flyter upp när den fastnar (floatText). Ikon först — rösten bär resten.
export const RAR_NAMN = { guldfisk: 'Guldfisk!', kista: 'Skattkista!', stovel: 'Stövel!' }

// Fyruddig glimt.
function glimt(r) {
  const g = new Graphics()
  g.poly([0, -r, r * 0.22, -r * 0.22, r, 0, r * 0.22, r * 0.22, 0, r, -r * 0.22, r * 0.22, -r, 0, -r * 0.22, -r * 0.22])
  g.fill({ color: 0xffffff, alpha: 0.95 })
  g.eventMode = 'none'
  return g
}

export function ritaRar(kind) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false

  if (kind === 'guldfisk') {
    const g = new Graphics()
    // Stjärtfena och ryggfena FÖRST — kroppen läggs över deras rötter.
    g.moveTo(24, 0).quadraticCurveTo(36, -20, 46, -17).quadraticCurveTo(40, 0, 46, 17).quadraticCurveTo(36, 20, 24, 0)
    g.closePath().fill(0xffb02e).stroke({ width: 2.5, color: 0xd28c14 })
    g.moveTo(-8, -18).quadraticCurveTo(4, -36, 18, -16).closePath().fill(0xffb02e).stroke({ width: 2.5, color: 0xd28c14 })
    g.ellipse(0, 0, 30, 20).fill(0xffcb3d).stroke({ width: 3, color: 0xd28c14 })
    g.ellipse(-2, 8, 19, 8).fill({ color: 0xfff2b0, alpha: 0.55 })
    g.ellipse(-4, -9, 15, 5).fill({ color: 0xffffff, alpha: 0.35 })
    for (const sx of [2, 11, 20]) bage(g, sx, 0, 8, -1.05, 1.05).stroke({ width: 1.8, color: 0xd28c14, alpha: 0.55 })
    g.circle(-17, -4, 5.2).fill(0xffffff)
    g.circle(-18, -4, 3).fill(0x2b2b2b)
    g.circle(-19, -5.2, 1).fill(0xffffff)
    bage(g, -28, 3, 5, -0.5, 0.6).stroke({ width: 2, color: 0xd28c14 })
    const s = glimt(9)
    s.position.set(10, -8)
    c.addChild(g, s)
    c._glimt = s
  } else if (kind === 'kista') {
    const body = new Graphics()
    body.roundRect(-32, -2, 64, 32, 5).fill(0x9a5f2e).stroke({ width: 3, color: 0x6d4020 })
    body.moveTo(-30, 9).lineTo(30, 9).moveTo(-30, 19).lineTo(30, 19).stroke({ width: 1.8, color: 0x6d4020, alpha: 0.55 })
    for (const bx of [-24, 15]) body.roundRect(bx, -2, 9, 32, 2).fill(0xaab4be).stroke({ width: 2, color: 0x7b858f })
    body.roundRect(-7, 4, 14, 15, 3).fill(0xf3c531).stroke({ width: 2.5, color: 0xc79a1e })
    body.circle(0, 10, 2.4).fill(0x5a3a10)
    body.rect(-1, 10, 2, 5.5).fill(0x5a3a10)
    // Guldskenet mellan lock och kista — lockets lyft visar det.
    const glow = new Graphics().roundRect(-29, -8, 58, 7, 3).fill(0xffe27a)
    const lid = new Graphics()
    lid.moveTo(-33, 0).lineTo(-33, -11).quadraticCurveTo(-33, -31, 0, -31).quadraticCurveTo(33, -31, 33, -11).lineTo(33, 0)
    lid.closePath().fill(0xb6733a).stroke({ width: 3, color: 0x6d4020 })
    for (const bx of [-24, 15]) lid.roundRect(bx, -26, 9, 26, 2).fill(0xaab4be).stroke({ width: 2, color: 0x7b858f })
    lid.roundRect(-14, -26, 22, 4, 2).fill({ color: 0xffffff, alpha: 0.25 })
    c.addChild(body, glow, lid)
    c._lock = lid
    c._sken = glow
  } else {
    // stövel: gammal LÄDERstövel med järnhätta, metallspänne och spikrad i sulan, tång över
    // kanten. Aldrig gummi: dammen lär ut att gummi (ankan, badringen) inte fastnar.
    const g = new Graphics()
    g.moveTo(-14, -32).lineTo(12, -32).lineTo(12, 0).quadraticCurveTo(34, 2, 34, 18).quadraticCurveTo(34, 24, 28, 24).lineTo(-14, 24)
    g.closePath().fill(0x8a5a36).stroke({ width: 3, color: 0x5a3820 })
    g.moveTo(14, 2).quadraticCurveTo(32, 4, 33, 18).lineTo(33, 23).lineTo(16, 23).closePath()
      .fill(0xaab4be).stroke({ width: 2.5, color: 0x7b858f }) // järnhätta
    g.roundRect(-16, 20, 52, 9, 4).fill(0x4a3526)
    for (let nx = -11; nx <= 31; nx += 7) g.circle(nx, 24.5, 1.8).fill(0xc9d1d8) // spikrad
    g.roundRect(-16, -37, 30, 9, 4).fill(0xa8744a).stroke({ width: 2.5, color: 0x5a3820 })
    g.roundRect(-10, -26, 6, 44, 3).fill({ color: 0xffffff, alpha: 0.22 })
    g.roundRect(-15, -12, 27, 7, 2).fill(0xaab4be).stroke({ width: 2, color: 0x7b858f })
    g.roundRect(-5, -15, 11, 13, 2).stroke({ width: 3, color: 0x7b858f })
    g.circle(0, -8.5, 1.8).fill(0x7b858f)
    g.ellipse(4, 12, 7, 4).fill({ color: 0x4a3526, alpha: 0.45 })
    g.position.set(-9, 3)
    const alga = new Graphics()
    alga.moveTo(0, 0).quadraticCurveTo(-9, 12, -3, 24).quadraticCurveTo(3, 34, -4, 42).stroke({ width: 5, color: 0x3f9a4a, cap: 'round' })
    alga.position.set(-23, -27)
    c.addChild(g, alga)
    c._alga = alga
  }
  return c
}

// Tomgång för en rar sak — skrivs på det RITADE barnet (`it.art`), aldrig på vyn som bär
// träffyta, fysik och wiggle/pop. t = klocka (s), f = sakens egen fas.
export function livRar(art, kind, t, f) {
  if (!art || art.destroyed) return
  if (kind === 'guldfisk') {
    art.rotation = Math.sin(t * 2.6 + f) * 0.16
    const s = art._glimt
    if (s && !s.destroyed) {
      const k = Math.max(0, Math.sin(t * 3 + f))
      s.alpha = k
      s.scale.set(0.5 + 0.7 * k)
      s.rotation = t * 1.5
    }
  } else if (kind === 'kista') {
    art.y = Math.sin(t * 2 + f) * 2.5
    art.rotation = Math.sin(t * 1.1 + f) * 0.05
    const k = 0.5 + 0.5 * Math.sin(t * 1.8 + f)
    if (art._lock && !art._lock.destroyed) art._lock.y = -(1.5 + 3.5 * k)
    if (art._sken && !art._sken.destroyed) art._sken.alpha = 0.3 + 0.7 * k
  } else if (kind === 'stovel') {
    art.rotation = Math.sin(t * 1.5 + f) * 0.14
    if (art._alga && !art._alga.destroyed) art._alga.rotation = Math.sin(t * 3 + f) * 0.35
  }
}
