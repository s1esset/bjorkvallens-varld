// KULLAR OCH GROPAR — ritade som riktiga föremål ovanifrån (P0 ASSETS), inte som en ring på gräset.
//
// En kulle är en rund, ljusare gräsupphöjning med skuggad nedre kant, ett högdagerfält uppe till vänster och
// några blommor på toppen. En grop är en jordskål: ljus kant, mörkare jord ju längre in, stenar vid kanten.
// De är platta fyllningar och cirklar i en Graphics (NOLL texturbakningar, ingen gradient) och de ligger
// bakom bollen och hindren. Träffas aldrig (`eventMode 'none'`) — trycket går igenom till planen.
//
// Struktur (bara det inre får animeras, aldrig roten — som vid varje spelobjekt här):
//   rot (position, ägs av spelet)
//     └ reagera (skala: ett litet "hopp" när bollen kommer in)
//         └ liv (skala: långsam andning i vila — egen fas per zon)
//             └ form (Graphics)
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { bage } from '../../lib/form.js'
import { lerpColor } from '../../lib/scene.js'

function kulleForm(r) {
  const g = new Graphics()
  // markskugga (kullen lyfter sig från gräset) — hamnar nedåt höger
  g.ellipse(r * 0.07, r * 0.13, r * 1.02, r * 0.97).fill({ color: 0x000000, alpha: 0.13 })
  g.circle(0, 0, r).fill(0xa9e176).stroke({ width: 5, color: 0x6db44a, alpha: 0.9 })
  // kupolen: allt ljusare ringar, centrerade en bit uppåt vänster så den läses som en rundad höjd
  for (let i = 1; i <= 4; i++) {
    const t = i / 4
    g.circle(-r * 0.035 * i, -r * 0.05 * i, r * (1 - 0.17 * i)).fill(lerpColor(0xa9e176, 0xe2fab0, t))
  }
  // skuggad nedre högerkant, högdager uppe till vänster
  bage(g, 0, 0, r - 5, 0.15, 1.75).stroke({ width: 9, color: 0x4f9a36, alpha: 0.45, cap: 'round' })
  g.ellipse(-r * 0.3, -r * 0.34, r * 0.22, r * 0.12).fill({ color: 0xffffff, alpha: 0.34 })
  // blommor på toppen
  for (const [fx, fy, c] of [[-0.18, -0.2, 0xff8fb1], [0.08, -0.3, 0xffe066], [0.22, -0.04, 0xffffff], [-0.3, 0.05, 0xffe066]]) {
    const x = fx * r
    const y = fy * r
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      g.circle(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.2).fill(c)
    }
    g.circle(x, y, 3.4).fill(0xf2a93b)
  }
  // grästuvor vid foten
  for (const a of [0.5, 1.4, 2.3, 3.5, 4.4]) {
    const x = Math.cos(a) * r * 0.86
    const y = Math.sin(a) * r * 0.86
    g.moveTo(x, y).lineTo(x - 5, y - 13).stroke({ width: 3, color: 0x4f9a36, alpha: 0.8, cap: 'round' })
    g.moveTo(x, y).lineTo(x + 4, y - 15).stroke({ width: 3, color: 0x4f9a36, alpha: 0.8, cap: 'round' })
  }
  return g
}

function gropForm(r) {
  const g = new Graphics()
  // kanten: ljus uppskjuten jord, sedan mörkare skålar inåt
  g.circle(0, 0, r).fill(0xe0c08a).stroke({ width: 6, color: 0xa07a46 })
  const ringar = [0xc9a068, 0xae8450, 0x8e6638, 0x6c4a28]
  for (let i = 0; i < ringar.length; i++) {
    g.circle(r * 0.028 * (i + 1), r * 0.04 * (i + 1), r * (0.88 - 0.19 * i)).fill(ringar[i])
  }
  // skuggan på den vända sidan, ljus på den närmaste nedre kanten av skålen
  bage(g, 0, 0, r * 0.86, 3.4, 5.0).stroke({ width: 10, color: 0x4a3018, alpha: 0.28, cap: 'round' })
  bage(g, 0, 0, r * 0.84, 0.3, 1.5).stroke({ width: 7, color: 0xffffff, alpha: 0.22, cap: 'round' })
  // stenar och grästuvor vid kanten
  for (const [a, s] of [[0.4, 9], [1.9, 7], [3.3, 10], [4.6, 8], [5.7, 7]]) {
    const x = Math.cos(a) * r * 0.94
    const y = Math.sin(a) * r * 0.94
    g.ellipse(x + 2, y + 3, s, s * 0.7).fill({ color: 0x000000, alpha: 0.15 })
    g.ellipse(x, y, s, s * 0.72).fill(0xb9b0a0).stroke({ width: 2, color: 0x8a8274 })
  }
  for (const a of [1.2, 2.7, 4.0, 5.2]) {
    const x = Math.cos(a) * r * 1.0
    const y = Math.sin(a) * r * 1.0
    g.moveTo(x, y).lineTo(x - 4, y - 12).stroke({ width: 3, color: 0x5fa83c, cap: 'round' })
    g.moveTo(x, y).lineTo(x + 4, y - 13).stroke({ width: 3, color: 0x5fa83c, cap: 'round' })
  }
  return g
}

// En zon: container på (z.x, z.y). Returnerar { rot, reagera(), stada() }.
export function byggZon(z, fas = 0) {
  const rot = new Container()
  rot.position.set(z.x, z.y)
  rot.eventMode = 'none'
  rot.interactiveChildren = false
  const reagera = new Container()
  const liv = new Container()
  const form = z.typ === 'kulle' ? kulleForm(z.r) : gropForm(z.r)
  form.eventMode = 'none'
  liv.addChild(form)
  reagera.addChild(liv)
  rot.addChild(reagera)

  // vilo-liv: en mycket långsam andning (±1,5 %), egen fas så två zoner aldrig går i takt
  const andas = gsap.to(liv.scale, { x: 1.015, y: 1.015, duration: 2.4 + fas * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: fas * 0.8 })

  return {
    rot,
    // bollen kommer in: kullen sväller till, gropen sjunker ihop — kort, fjädrande
    reagera() {
      if (reagera.destroyed) return
      gsap.killTweensOf(reagera.scale)
      reagera.scale.set(1)
      const mal = z.typ === 'kulle' ? 1.07 : 0.94
      gsap.to(reagera.scale, { x: mal, y: mal, duration: 0.14, ease: 'sine.out', yoyo: true, repeat: 1 })
    },
    // städa innernodernas tweens (killTweensOf på roten når inte dem)
    stada() {
      andas.kill()
      gsap.killTweensOf(reagera.scale)
      gsap.killTweensOf(liv.scale)
    },
  }
}
