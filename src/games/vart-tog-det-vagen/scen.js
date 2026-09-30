// Scenen i Vart Tog Det Vägen?: en liten teater. Indigovägg med stjärnor, rödsammets-
// ridåer med kappa och tofsar, en lampa som lyser ner på ett bord med duk, och ett
// trägolv. Allt är ritat av cachade linjära toningar och enkla former — noll texturbakningar
// per montering (CLAUDE.md: en ny FillGradient per scen destabiliserar sviten).
//
// Varje byggare returnerar en Graphics/Container som spelet lägger i sin egen ordning, så
// att kopparna, leksaken och Bobo alltid hamnar FRAMFÖR rekvisitan.
import { Container, Graphics } from 'pixi.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { bage, groundFill, verticalFill } from '../../lib/form.js'

export const HORIZON_Y = 400
export const CENTER = 650

// Bordets geometri. Skivan är en trapets i perspektiv (bakkanten smalare än framkanten);
// muggarnas fot ligger på y≈530 och skuggorna når y≈550, alltså inom skivan (422..560).
export const BORD = { backL: 215, backR: 1085, backY: 422, frontL: 170, frontR: 1130, frontY: 560, hemY: 612 }

const CREAM = 0xfff0cf
const TEAL = 0x2a9d8f
const GULD = 0xf5c04a
const SAMMET = 0xc9384f
const SAMMET_MORK = 0x8b1f35

function bredd() {
  return 1280 + BLEED_X * 2
}

// Vägg + golv. Väggen är medvetet EGEN ton (indigo), aldrig skalets cream — se
// `_plattprobe`-noten i git-historiken: en scen i `COLORS.bg` går inte att skilja från
// "ingen bleed alls".
export function byggBakgrund() {
  const c = new Container()
  const w = bredd()

  const vagg = new Graphics()
  vagg.rect(-BLEED_X, -BLEED_Y, w, HORIZON_Y + BLEED_Y).fill(verticalFill(0x35307a, 0x5a4ba0))
  c.addChild(vagg)

  // Tapetränder: mycket svaga, så väggen har struktur utan att tävla med kopparna.
  const rander = new Graphics()
  for (let x = -BLEED_X; x < 1280 + BLEED_X; x += 80) rander.rect(x, -BLEED_Y, 40, HORIZON_Y + BLEED_Y).fill({ color: 0xffffff, alpha: 0.035 })
  c.addChild(rander)

  const golv = new Graphics()
  golv.rect(-BLEED_X, HORIZON_Y, w, 720 + BLEED_Y - HORIZON_Y).fill(groundFill(0xb98552))
  c.addChild(golv)

  // Golvbrädor som löper mot horisonten: linjer ur en försvinningspunkt strax ovanför
  // väggfoten. Bara de som syns vid horisonten ritas (de tar sig bara utåt neråt).
  const brador = new Graphics()
  const VP_Y = 330
  const slut = 720 + BLEED_Y
  const k = (slut - VP_Y) / (HORIZON_Y - VP_Y)
  for (let dx = -900; dx <= 900; dx += 70) {
    brador.moveTo(CENTER + dx, HORIZON_Y).lineTo(CENTER + dx * k, slut)
  }
  brador.stroke({ width: 2.5, color: 0x5a3a1e, alpha: 0.2 })
  c.addChild(brador)

  // Sockellist: skiljer vägg från golv och sitter EXAKT på horisonten.
  const list = new Graphics()
  list.rect(-BLEED_X, HORIZON_Y - 10, w, 16).fill(0x2b2150)
  list.rect(-BLEED_X, HORIZON_Y - 10, w, 3).fill({ color: 0xffffff, alpha: 0.18 })
  c.addChild(list)
  return c
}

// Små guldstjärnor på väggen; ETT lager som blinkar mjukt (en tween, dödas i destroy).
export function byggStjarnor() {
  const g = new Graphics()
  const lista = [
    [240, 190, 9], [330, 290, 6], [150, 330, 7], [470, 175, 6], [780, 170, 7], [1010, 210, 9],
    [1100, 300, 6], [910, 150, 6], [560, 140, 5], [1180, 360, 7], [380, 350, 5], [740, 330, 5],
  ]
  for (const [x, y, r] of lista) g.star(x, y, 4, r, r * 0.42).fill({ color: 0xffe08a, alpha: 0.6 })
  g.eventMode = 'none'
  return g
}

// Ljuskäglan från lampan: tre stackade trianglar med stigande bredd och låg alfa ger en
// mjuk kant utan radiell gradient (radiella kostar 256× och kan inte ha genomskinlig mitt).
export function byggLjuskegla() {
  const g = new Graphics()
  const topp = [CENTER - 34, CENTER + 34, 118]
  const bred = [430, 350, 270]
  bred.forEach((halv, i) => {
    g.poly([topp[0] + i * 6, topp[2], topp[1] - i * 6, topp[2], CENTER + halv, BORD.frontY - 20, CENTER - halv, BORD.frontY - 20]).fill({ color: 0xfff2b8, alpha: 0.055 })
  })
  g.eventMode = 'none'
  return g
}

// Ridåernas innerkant i x (lokalt för vänster ridå) för en given y: bredast upptill,
// hopsnörd vid tofsen på y≈440 och utsvängd nedåt.
function innerKant(y) {
  const ease = (t) => t * t * (3 - 2 * t)
  if (y <= 440) return 122 - 58 * ease(Math.max(0, y) / 440)
  return 64 + 42 * ease(Math.min(1, (y - 440) / 280))
}

function ridaGraf(sida) {
  const g = new Graphics()
  const xa = (x) => (sida < 0 ? x : 1280 - x)
  const y0 = -BLEED_Y
  const y1 = 720 + BLEED_Y
  const yy = []
  for (let y = y0; y <= y1; y += 20) yy.push(y)
  const outer = sida < 0 ? -BLEED_X : 1280 + BLEED_X

  // Kastskugga på väggen.
  const skugga = [outer, y0]
  for (const y of yy) skugga.push(xa(innerKant(y)) - sida * 14, y)
  skugga.push(outer, y1)
  g.poly(skugga).fill({ color: 0x000000, alpha: 0.16 })

  const form = [outer, y0]
  for (const y of yy) form.push(xa(innerKant(y)), y)
  form.push(outer, y1)
  g.poly(form).fill(verticalFill(SAMMET, SAMMET_MORK))

  // Vecken: kurvor som följer innerkanten; mörka breda och ljusa smala.
  const veck = (d, bredd, color, alpha, vag) => {
    yy.forEach((y, i) => {
      const x = xa(innerKant(y)) + sida * (d + Math.sin(y / 60 + vag) * 3)
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    })
    g.stroke({ width: bredd, color, alpha, cap: 'round' })
  }
  veck(28, 14, 0x4e0f1f, 0.22, 0)
  veck(62, 9, 0xff9aa8, 0.14, 1.3)
  veck(96, 14, 0x4e0f1f, 0.2, 2.4)
  veck(130, 9, 0xff9aa8, 0.12, 0.7)
  // Innerkantens skuggning.
  veck(3, 6, 0x4e0f1f, 0.3, 0)

  // Uppbindningen med tofs.
  const ix = xa(innerKant(440))
  g.moveTo(ix + sida * 110, 424).quadraticCurveTo(ix + sida * 50, 456, ix, 446)
  g.stroke({ width: 13, color: GULD, cap: 'round' })
  g.circle(ix, 462, 10).fill(GULD)
  for (let i = -1; i <= 1; i++) g.moveTo(ix + i * 4, 470).lineTo(ix + i * 7, 498)
  g.stroke({ width: 4, color: GULD, cap: 'round' })
  g.eventMode = 'none'
  return g
}

// Ridåer i sidorna + kappan överst (med guldbrätte och tofsar) + lampan. Ingenting här
// tar emot tryck — bakgrunden under fångar de tomma trycken.
export function byggRida() {
  const c = new Container()
  c.addChild(ridaGraf(-1), ridaGraf(1))

  const kappa = new Graphics()
  const w = bredd()
  const cirklar = []
  for (let x0 = -BLEED_X; x0 < 1280 + BLEED_X; x0 += 100) cirklar.push(x0 + 50)
  for (const cx of cirklar) kappa.circle(cx, 76, 50).fill(0xa12640)
  kappa.rect(-BLEED_X, -BLEED_Y, w, 76 + BLEED_Y).fill(verticalFill(0xd14058, 0xa12640))
  for (const cx of cirklar) {
    bage(kappa, cx, 76, 50, 0.04 * Math.PI, 0.96 * Math.PI).stroke({ width: 5, color: GULD, cap: 'round' })
    kappa.circle(cx, 126, 6).fill(GULD)
  }
  kappa.eventMode = 'none'
  c.addChild(kappa)

  // Lampan hänger under kappan i mitten och riktar sig mot bordet.
  const lampa = new Graphics()
  lampa.moveTo(CENTER, 100).lineTo(CENTER, 114).stroke({ width: 5, color: 0x2b2150 })
  lampa.poly([CENTER - 22, 112, CENTER + 22, 112, CENTER + 36, 140, CENTER - 36, 140]).fill(0x2b2150).stroke({ width: 3, color: GULD })
  lampa.ellipse(CENTER, 140, 36, 7).fill(0xfff6d0)
  lampa.ellipse(CENTER, 141, 20, 3.5).fill({ color: 0xffffff, alpha: 0.85 })
  lampa.eventMode = 'none'
  c.addChild(lampa)

  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Bordet: golvskugga, duk (skiva + hängande kant med vågig fåll och tofsar) och ljuspölen
// från lampan. Duken bär teal kantband så den läses som tyg, inte som en platta.
export function byggBord() {
  const c = new Container()
  const { backL, backR, backY, frontL, frontR, frontY, hemY } = BORD

  const golvskugga = new Graphics()
  golvskugga.ellipse(CENTER, hemY + 14, 520, 30).fill({ color: 0x000000, alpha: 0.22 })
  golvskugga.ellipse(CENTER, hemY + 8, 470, 20).fill({ color: 0x000000, alpha: 0.12 })
  c.addChild(golvskugga)

  // Hängande kant: rak överkant, fåll med halvcirklar.
  const kant = new Graphics()
  const steg = 70
  const n = Math.round((frontR - frontL) / steg)
  const sv = (frontR - frontL) / n
  for (let i = 0; i < n; i++) kant.circle(frontL + sv * (i + 0.5), hemY - 24, sv / 2).fill(0x1e7f73)
  kant.poly([frontL, frontY - 4, frontR, frontY - 4, frontR, hemY - 24, frontL, hemY - 24]).fill(verticalFill(0x36b5a5, 0x1e7f73))
  // Veck i kanten.
  for (let i = 1; i < n; i++) {
    const x = frontL + sv * i
    kant.moveTo(x, frontY).lineTo(x, hemY - 14)
  }
  kant.stroke({ width: 5, color: 0x0f5a51, alpha: 0.22 })
  for (let i = 0; i < n; i++) {
    const cx = frontL + sv * (i + 0.5)
    bage(kant, cx, hemY - 24, sv / 2 - 2, 0.05 * Math.PI, 0.95 * Math.PI).stroke({ width: 4, color: GULD, cap: 'round' })
    kant.circle(cx, hemY + sv / 2 - 26, 5).fill(GULD)
  }
  c.addChild(kant)

  // Skivan.
  const skiva = new Graphics()
  skiva.poly([backL, backY, backR, backY, frontR, frontY, frontL, frontY]).fill(verticalFill(0xfff8e4, CREAM))
  // Kantband i teal, indraget från skivans kant.
  const b = 16
  skiva.poly([backL + b + 6, backY + 10, backR - b - 6, backY + 10, frontR - b - 10, frontY - 12, frontL + b + 10, frontY - 12]).stroke({ width: 6, color: TEAL, alpha: 0.75, join: 'round' })
  skiva.poly([backL + b + 18, backY + 22, backR - b - 18, backY + 22, frontR - b - 26, frontY - 24, frontL + b + 26, frontY - 24]).stroke({ width: 2.5, color: GULD, alpha: 0.85, join: 'round' })
  // Främre kanten på skivan: en tunn mörkare rand som ger tjocklek åt tyget.
  skiva.rect(frontL - 4, frontY - 6, frontR - frontL + 8, 10).fill(0xe8cf9c)
  skiva.rect(frontL - 4, frontY - 6, frontR - frontL + 8, 3).fill({ color: 0xffffff, alpha: 0.6 })
  c.addChild(skiva)

  // Ljuspölen under lampan ligger ovanpå duken men under kopparna.
  const pol = new Graphics()
  pol.ellipse(CENTER, 492, 400, 64).fill({ color: 0xfff6d0, alpha: 0.3 })
  pol.ellipse(CENTER, 492, 300, 46).fill({ color: 0xffffff, alpha: 0.2 })
  c.addChild(pol)

  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
