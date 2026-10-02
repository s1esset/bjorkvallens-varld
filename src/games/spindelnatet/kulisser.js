// Spindelnätets kulisser (FYSIKPLAN L2) — en månbelyst trädgårdsmur som nätet sitter mot,
// ett stort träd i förgrunden (sida lottas per runda), avlägsna trädkronor bakom muren och
// mörka grässtrån längst fram. Allt är fyllda Graphics i en ton per lager: noll gradienter,
// noll texturbakningar, helt dekor (eventMode 'none'). Ingen form går över x < 200, y < 160.
import { Container, Graphics } from 'pixi.js'
import { BLEED_X } from '../../lib/view.js'
import { slump } from '../../lib/scene.js'

export const MARK_Y = 648 // markremsans överkant (matchar spelets egen markremsa)
export const VAGG_TOPP = 498
const MORTEL = 0x1c1b3c

const dekor = (c) => {
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Trädgårdsmuren: stenar i tre toner, mjuk kappa (månljus på hgsidan), murgröna som hänger
// över kanten och två små hål i foten dit krypen kryper. `hal` = hålens x (spelets HOLES).
export function ritaVagg(hal) {
  const c = dekor(new Container())
  const x0 = -BLEED_X - 60
  const x1 = 1280 + BLEED_X + 60
  const rnd = slump(11)

  c.addChild(new Graphics().rect(x0, VAGG_TOPP, x1 - x0, MARK_Y + 6 - VAGG_TOPP).fill(MORTEL))

  const toner = [0x2e2c58, 0x292750, 0x34325f]
  const gg = toner.map(() => new Graphics())
  const RAD = 27
  for (let r = 0; r < 5; r++) {
    const y = VAGG_TOPP + 14 + r * RAD
    let x = x0 - (r % 2 ? 38 : 0)
    while (x < x1) {
      const w = 54 + rnd() * 40
      gg[Math.floor(rnd() * toner.length)].roundRect(x + 1.5, y + 1.5, w - 3, RAD - 3, 5)
      x += w
    }
  }
  gg.forEach((g, i) => {
    g.fill(toner[i])
    c.addChild(g)
  })

  // Månljus: en blek fläck på stenen under månen och en skugga mot marken.
  const ljus = new Graphics()
  ljus.ellipse(1000, 575, 330, 80).fill({ color: 0xcfd8ff, alpha: 0.05 })
  ljus.ellipse(1000, 575, 200, 50).fill({ color: 0xcfd8ff, alpha: 0.04 })
  ljus.rect(x0, 612, x1 - x0, MARK_Y + 4 - 612).fill({ color: 0x000000, alpha: 0.14 })
  c.addChild(ljus)

  // Kappan (täckstenarna) med skarvar och en blank kant där månen når.
  const kappa = new Graphics()
  kappa.roundRect(x0, VAGG_TOPP - 4, x1 - x0, 18, 6).fill(0x4a477e)
  kappa.rect(x0, VAGG_TOPP - 4, x1 - x0, 3).fill({ color: 0x9a97d4, alpha: 0.4 })
  kappa.roundRect(820, VAGG_TOPP - 4, 400, 4, 2).fill({ color: 0xeef0ff, alpha: 0.5 })
  for (let x = x0 + 40; x < x1; x += 90 + rnd() * 60) kappa.rect(x, VAGG_TOPP - 3, 2, 17)
  kappa.fill({ color: 0x2c2a55, alpha: 0.6 })
  c.addChild(kappa)

  // Murgröna: tuvor på kappan och ranker som hänger ner längs stenen.
  const gron = new Graphics()
  const blad = new Graphics()
  const ranker = []
  for (let k = 0; k < 8; k++) {
    const x = 90 + (k + rnd() * 0.7) * 145
    const y = VAGG_TOPP - 6
    for (let j = 0; j < 3; j++) gron.circle(x + (j - 1) * 11, y - (j === 1 ? 6 : 0), 11 + rnd() * 5)
    blad.circle(x - 3, y - 12, 4).circle(x + 9, y - 3, 3.4)
    for (let j = 0; j < 2; j++) {
      ranker.push([x + (j ? 8 : -8), y + 4, (rnd() - 0.5) * 12, 30 + rnd() * 30])
    }
  }
  gron.fill(0x1d4448)
  for (const [x, y, dx, h] of ranker) gron.moveTo(x, y).quadraticCurveTo(x + dx * 0.4, y + h * 0.5, x + dx, y + h)
  gron.stroke({ width: 3, color: 0x1d4448, cap: 'round' })
  blad.fill(0x2f6a62)
  c.addChild(gron, blad)

  // Hål i murfoten: valv med karm och ett svagt varmt sken långt därinne.
  for (const hx of hal) {
    const h = new Graphics()
    h.moveTo(hx - 34, MARK_Y + 6).lineTo(hx - 34, MARK_Y - 20)
      .bezierCurveTo(hx - 34, MARK_Y - 62, hx + 34, MARK_Y - 62, hx + 34, MARK_Y - 20)
      .lineTo(hx + 34, MARK_Y + 6).stroke({ width: 8, color: 0x45427a })
    h.moveTo(hx - 30, MARK_Y + 6).lineTo(hx - 30, MARK_Y - 20)
      .bezierCurveTo(hx - 30, MARK_Y - 56, hx + 30, MARK_Y - 56, hx + 30, MARK_Y - 20)
      .lineTo(hx + 30, MARK_Y + 6).closePath().fill(0x0c0b1e)
    h.ellipse(hx, MARK_Y - 4, 15, 9).fill({ color: 0xffd35c, alpha: 0.2 })
    c.addChild(h)
  }
  return c
}

// Avlägsna trädkronor bakom muren — nästan himlens ton, så de ger djup utan att störa bytena.
export function ritaFjarrTrad(rnd) {
  const c = dekor(new Container())
  const toner = [0x232758, 0x282d62]
  const gg = toner.map(() => new Graphics())
  const n = 4
  for (let i = 0; i < n; i++) {
    const x = 250 + (i + rnd() * 0.6) * (860 / n)
    const cy = VAGG_TOPP - 66 - rnd() * 36
    const g = gg[i % 2]
    g.rect(x - 6, cy, 12, VAGG_TOPP - cy + 6)
    g.circle(x, cy, 38 + rnd() * 14)
    g.circle(x - 30, cy + 14, 27 + rnd() * 5)
    g.circle(x + 30, cy + 12, 28 + rnd() * 5)
    g.circle(x + 4, cy - 30, 26 + rnd() * 5)
  }
  gg.forEach((g, i) => {
    g.fill(toner[i])
    c.addChild(g)
  })
  return c
}

// En avsmalnande gren som en polygon längs en kvadratisk kurva. dx förskjuter hela formen
// (används för den månbelysta kanten). Skriver i `g`; fyllningen gör anroparen.
function kvist(g, [x0, y0, cx, cy, x1, y1, w0, w1], dx = 0) {
  const N = 9
  const vl = []
  const hg = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1
    const ax = 2 * u * (cx - x0) + 2 * t * (x1 - cx)
    const ay = 2 * u * (cy - y0) + 2 * t * (y1 - cy)
    const m = Math.hypot(ax, ay) || 1
    const w = (w0 + (w1 - w0) * t) / 2
    vl.push(x + (-ay / m) * w + dx, y + (ax / m) * w)
    hg.push(x - (-ay / m) * w + dx, y - (ax / m) * w)
  }
  const pts = vl.slice()
  for (let i = N; i >= 0; i--) pts.push(hg[i * 2], hg[i * 2 + 1])
  g.poly(pts)
}

// Det stora trädet i förgrunden. side = +1 (höger) | -1 (vänster); det lutar mot skärmens mitt
// och månen, som lyser upp kanten som vetter dit. Hela trädet är ett barn vars pivå står i
// roten, så tickern kan låta det gunga några pixlar i kronan.
export function ritaNaraTrad(side, rnd) {
  const tx = side > 0 ? 1090 : 190
  const inn = -side // mot mitten (och månen)
  const BAS = 668
  const c = dekor(new Container())
  c.pivot.set(tx, BAS)
  c.position.set(tx, BAS)

  c.addChild(new Graphics().ellipse(tx + inn * 26, MARK_Y + 8, 96, 13).fill({ color: 0x000000, alpha: 0.24 }))

  const stam = [tx, BAS, tx + inn * 6, 500, tx + inn * 30, 330, 88, 34]
  const pt = (t) => {
    const u = 1 - t
    return {
      x: u * u * stam[0] + 2 * u * t * stam[2] + t * t * stam[4],
      y: u * u * stam[1] + 2 * u * t * stam[3] + t * t * stam[5],
    }
  }
  const a = pt(0.55)
  const b = pt(0.82)
  const o = pt(0.7)
  const aSlut = { x: a.x + inn * (170 + rnd() * 50), y: a.y - 50 - rnd() * 30 }
  const bSlut = { x: b.x + inn * (120 + rnd() * 40), y: b.y - 80 - rnd() * 30 }
  const cSlut = { x: o.x - inn * (80 + rnd() * 20), y: o.y - 70 - rnd() * 20 }
  const topp = { x: stam[4] + inn * 8, y: 262 }
  const delar = [
    stam,
    [a.x, a.y, a.x + inn * 70, a.y - 10 - rnd() * 20, aSlut.x, aSlut.y, 26, 7],
    [b.x, b.y, b.x + inn * 40, b.y - 50, bSlut.x, bSlut.y, 20, 6],
    [o.x, o.y, o.x - inn * 36, o.y - 20, cSlut.x, cSlut.y, 18, 6],
    [stam[4], stam[5], stam[4] + inn * 2, 300, topp.x, topp.y, 34, 12],
  ]
  const ljus = new Graphics()
  const morkt = new Graphics()
  for (const d of delar) {
    kvist(ljus, d, inn * 4)
    kvist(morkt, d, 0)
  }
  ljus.fill(0x3d4f78)
  morkt.fill(0x14122e)
  const bark = new Graphics()
  for (let k = 0; k < 4; k++) {
    const t = 0.12 + k * 0.18
    const p = pt(t)
    const off = (k % 2 ? 1 : -1) * (10 + rnd() * 10)
    bark.moveTo(p.x + off, p.y + 14).quadraticCurveTo(p.x + off + 4, p.y - 8, p.x + off * 0.8, p.y - 34)
  }
  bark.stroke({ width: 3, color: 0x0a0820, alpha: 0.5, cap: 'round' })
  c.addChild(ljus, morkt, bark)

  // Lövverket: klumpar vid grenändarna och i kronan.
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
  const mA = mid(a, aSlut)
  const mB = mid(b, bSlut)
  const klumpar = [
    [aSlut.x, aSlut.y, 56 + rnd() * 10],
    [bSlut.x, bSlut.y, 52 + rnd() * 8],
    [cSlut.x, cSlut.y, 46 + rnd() * 8],
    [topp.x, topp.y + 20, 66 + rnd() * 10],
    [mA.x, mA.y - 18, 38 + rnd() * 6],
    [mB.x, mB.y - 18, 36 + rnd() * 6],
    [topp.x + inn * 56, topp.y + 46, 44],
    [topp.x - inn * 56, topp.y + 42, 42],
  ].map(([x, y, r]) => [x, Math.max(y, 215 + r), r]) // kronan når aldrig upp mot hörnknapparna

  const lit = new Graphics()
  const mork = new Graphics()
  const inre = new Graphics()
  for (const [x, y, r] of klumpar) lit.circle(x, y, r)
  for (const [x, y, r] of klumpar) mork.circle(x - inn * 5, y + 4, r - 2)
  for (const [x, y, r] of klumpar) inre.circle(x - inn * r * 0.22, y + r * 0.26, r * 0.5)
  lit.fill(0x4a7d92)
  mork.fill(0x16304a)
  inre.fill({ color: 0x1f4666, alpha: 0.9 })
  c.addChild(lit, mork, inre)
  return c
}

// Mörka strån och några klockblommor längst fram, framför marken men bakom spelets kontroller.
export function ritaForgrundNatt() {
  const c = dekor(new Container())
  const rnd = slump(23)
  const toner = [0x0d1a30, 0x13283f, 0x1b3a52]
  const gg = toner.map(() => new Graphics())
  const y = 722
  for (let x = -BLEED_X - 20; x < 1280 + BLEED_X + 20; x += 20 + rnd() * 22) {
    const n = 2 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) {
      const h = 22 + rnd() * 30
      const lean = (rnd() - 0.5) * 20
      const bw = 3 + rnd() * 2.5
      const xx = x + (i - n / 2) * 6
      gg[Math.floor(rnd() * 3)]
        .moveTo(xx - bw, y)
        .quadraticCurveTo(xx - bw * 0.4 + lean * 0.4, y - h * 0.55, xx + lean, y - h)
        .quadraticCurveTo(xx + bw * 0.4 + lean * 0.5, y - h * 0.5, xx + bw, y)
        .closePath()
    }
  }
  gg.forEach((g, i) => {
    g.fill(toner[i])
    c.addChild(g)
  })
  const stjalk = new Graphics()
  const klockor = new Graphics()
  const sken = new Graphics()
  for (let k = 0; k < 9; k++) {
    const x = 60 + (k + rnd() * 0.8) * 130
    const h = 40 + rnd() * 26
    const lean = (rnd() - 0.5) * 24
    stjalk.moveTo(x, y).quadraticCurveTo(x + lean * 0.4, y - h * 0.5, x + lean, y - h)
    klockor.circle(x + lean, y - h, 6)
    sken.circle(x + lean, y - h, 13)
  }
  stjalk.stroke({ width: 3, color: 0x1b3a52, cap: 'round' })
  sken.fill({ color: 0xbcd0ff, alpha: 0.12 })
  klockor.fill({ color: 0xbcd0ff, alpha: 0.85 })
  c.addChild(stjalk, sken, klockor)
  return c
}
