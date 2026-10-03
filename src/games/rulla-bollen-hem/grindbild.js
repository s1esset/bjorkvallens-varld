// Grindens BILD (F1) — en randig slagbom med motvikt, en stolpe vid gångjärnet och en skugga. Ritad som ett
// riktigt föremål (egen silhuett, röd reflex i spetsen), inte en ruta. Fysiken är `grind.js`; bilden ritas i
// kroppens EGET rum (origo = gångjärnet, plankan längs +x) och följer den via `phys.link`.
//
//   const vy = byggGrind(spec)
//   obsLayer.addChild(vy.skugga, vy.rot, vy.stolpe)
//   phys.link(kropp, vy.rot, (v, b) => vy.synk(v, b))
//   vy.stada()                       // dödar tweens och river allt (idempotent)
//
// Den roterande delen (`rot`) bär plankan; stolpen står still ovanpå (och är det som "poppar" när bollen slår i);
// skuggan hålls i ljusets riktning (förskjuten rakt ned åt höger) i stället för att vridas med armen.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { GRIND } from './grind.js'

export function byggGrind(spec) {
  const L = spec.langd || GRIND.langd
  const s0 = GRIND.start
  const T = GRIND.tjocklek
  const Lp = L - s0

  // Plankan: randig slagbom (kroppen är en rektangel s0…L, T hög — silhuetten ÄR den).
  const rot = new Container()
  const g = new Graphics()
  // motvikten bakom leden (sticker ut över kanten)
  g.roundRect(-64, -T / 2 + 1, 50, T - 2, 8).fill(0x7a7f87).stroke({ width: 3, color: 0x4a4f57 })
  g.roundRect(-58, -T / 2 + 6, 20, 5, 2).fill({ color: 0xffffff, alpha: 0.35 })
  // stången mellan leden och plankan
  g.roundRect(-4, -5, s0 + 8, 10, 5).fill(0x6e4a28)
  // plankan
  g.roundRect(s0, -T / 2, Lp, T, 9).fill(0xfff1d0).stroke({ width: 3.5, color: 0x8a4a15 })
  for (let x = s0 + 12; x < L - 22; x += 30) {
    g.poly([x, -T / 2 + 3, x + 15, -T / 2 + 3, x + 7, T / 2 - 3, x - 8, T / 2 - 3]).fill(0xff7043)
  }
  g.roundRect(s0 + 8, -T / 2 + 4, Lp - 22, 4, 2).fill({ color: 0xffffff, alpha: 0.55 }) // glans
  // reflexen i spetsen
  g.circle(L - 12, 0, 7).fill(0xe53935).stroke({ width: 2, color: 0xffffff })
  g.eventMode = 'none'
  rot.addChild(g)
  rot.eventMode = 'none'
  rot.interactiveChildren = false

  // Skuggan: samma plank, mörk och mjuk, förskjuten åt höger-ned.
  const skugga = new Graphics()
  skugga.roundRect(s0, -T / 2, Lp, T, 9).fill({ color: 0x000000, alpha: 0.16 })
  skugga.roundRect(-64, -T / 2 + 1, 50, T - 2, 8).fill({ color: 0x000000, alpha: 0.12 })
  skugga.alpha = 0
  skugga.eventMode = 'none'

  // Stolpen vid gångjärnet: står still ovanpå armen.
  const stolpe = new Container()
  const sg = new Graphics()
  sg.circle(0, 0, 25).fill(0x9a6b3f).stroke({ width: 5, color: 0x6e4a28 })
  sg.circle(0, 0, 13).fill(0xd7dbe0).stroke({ width: 3, color: 0x8a9099 })
  sg.circle(-3, -3, 4).fill({ color: 0xffffff, alpha: 0.7 })
  sg.eventMode = 'none'
  stolpe.addChild(sg)
  stolpe.position.set(spec.x, spec.y)
  stolpe.eventMode = 'none'
  stolpe.interactiveChildren = false

  let levande = true
  return {
    rot,
    skugga,
    stolpe,
    synk(v, b) {
      if (!levande || skugga.destroyed) return
      skugga.position.set(v.x + 6, v.y + 10)
      skugga.rotation = b.angle
    },
    stada() {
      if (!levande) return
      levande = false
      for (const n of [rot, skugga, stolpe]) {
        if (n && !n.destroyed) {
          gsap.killTweensOf(n)
          gsap.killTweensOf(n.scale)
        }
      }
      for (const n of [rot, skugga, stolpe]) if (n && !n.destroyed) n.destroy({ children: true })
    },
  }
}
