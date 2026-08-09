// Spelobjekt som fanns i flera nästan identiska kopior — nu en gång, med volym.
//
// Bakgrund: `docs/LYFTPLAN.md` A2 räknade 203 lokala rit-funktioner i spelfilerna mot 8
// exporterade i `src/lib`, och pekade ut `makeBall` ×5, `makeStar` ×3, `makeBasket` ×3 m.fl.
// som självklara kandidater att flytta upp. Läsningen av koden ändrade den listan:
//
// - **Bollar och stjärnor ÄR samma föremål.** Alla fem bollar är "cirkel + platt fyllning +
//   handritad vit glansellips", alla tre stjärnorna en 10-punkts poly i samma gula med samma
//   mörkare kontur och samma glansprick. De hör hemma här.
// - **Korgarna är TRE olika föremål** (olika proportioner, flätmönster, handtag, färger) och
//   bumprarna två. Att slå ihop dem hade inte tagit bort en dubblett — det hade tagit bort
//   variation. De ligger kvar i sina spel och har i stället fått `form.js`-fyllningar på plats.
//
// Glansellipsen är BORTTAGEN, inte kvarlämnad bredvid gradienten — samma regel som
// `artikoner.js` (LYFTPLAN rad 10): gradienten ÄR dagern, och två dagrar ovanpå varandra
// läser som en bubbla. `sphereFill` returnerar råfärgen vid `setDetaljniva(0)`, så föremålen
// fungerar oförändrat på en svag platta.
import { Container, Graphics } from 'pixi.js'
import { sphereFill, topLightFill } from './form.js'
import { shade } from './theme.js'

// En boll: klotfylld kropp + valfri kontur och markskugga.
//
// Returnerar en Container med `.kropp` (Graphics) utlagd, så anroparen kan rita sina egna
// detaljer i samma Graphics — bowlinghålen, studsbollens stänk, ballongens knut — utan att
// den delade koden behöver känna till dem.
//
//   kontur      null = auto (mörkare variant av färgen) · false = ingen · tal = egen färg
//   konturBredd null = max(2, r·0.08)
//   skugga      { x, y, rx, ry, alpha } eller null
export function makeBoll(r, farg, { kontur = null, konturBredd = null, konturAlpha = 0.6, skugga = null } = {}) {
  const c = new Container()
  if (skugga) {
    const { x = 0, y = r * 1.15, rx = r * 0.95, ry = r * 0.32, alpha = 0.18, farg: sf = 0x000000 } = skugga
    const s = new Graphics().ellipse(x, y, rx, ry).fill({ color: sf, alpha })
    s.eventMode = 'none'
    c.addChild(s)
  }
  const kropp = new Graphics().circle(0, 0, r).fill(sphereFill(farg))
  if (kontur !== false) {
    kropp.stroke({
      width: konturBredd ?? Math.max(2, r * 0.08),
      color: kontur ?? shade(farg, 0.18),
      alpha: konturAlpha,
    })
  }
  kropp.eventMode = 'none'
  c.addChild(kropp)
  c.kropp = kropp
  return c
}

// En stjärna: `taggar` spetsar, fylld uppifrån-belyst (en stjärna är ingen klot-form — en
// radiell fyllning hade läst som en bubbla med taggar). Valfri mjuk glöd bakom.
export function makeStjarna(r = 28, { farg = 0xffd24a, kontur = 0xd9a021, konturBredd = null, taggar = 5, innerKvot = 0.44, glod = 0, glodFarg = 0xffe27a } = {}) {
  const c = new Container()
  if (glod > 0) {
    const g = new Graphics().circle(0, 0, r * glod).fill({ color: glodFarg, alpha: 0.28 })
    g.eventMode = 'none'
    c.addChild(g)
  }
  const pts = []
  const n = taggar * 2
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    const rr = i % 2 ? r * innerKvot : r
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  const kropp = new Graphics().poly(pts).fill(topLightFill(farg))
  if (kontur !== false) kropp.stroke({ width: konturBredd ?? Math.max(2, r * 0.1), color: kontur })
  kropp.eventMode = 'none'
  c.addChild(kropp)
  c.kropp = kropp
  return c
}
