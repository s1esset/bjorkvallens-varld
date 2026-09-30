// Dammen som NATUR, sedd ovanifrån: gräskant, sandstrand med stenar, grunt vatten som blir
// djupare mot mitten, näckrosblad (några med blomma), vass som vajar och krusningar som
// lever. Bara BILDEN — den logiska rektangeln POND (x 120–960, y 200–610) som fysik och
// fångst använder bor kvar i index.js. Konturen ligger 40 px utanför den på alla sidor
// (och hörnens rundning är mätt så att hörnet 22 px inom vattnet), så inget föremål kan
// ligga på land.
//
// Noll texturbakningar: djupet är lager av halvgenomskinliga FLATA former, inte gradienter
// (en gradient per montering destabiliserar sviten — se CLAUDE.md). Ingen tween: allt
// levande skrivs i `update(dt)` från spelets ticker, så det finns inget att läcka vid exit.
import { Container, Graphics } from 'pixi.js'
import { shade } from '../../lib/theme.js'

const PC = { x: 540, y: 405 } // dammens mitt (== mitten av POND)

// Fyra vattenhumör — nivån väljer, så nästa damm ser ut som en annan plats. `vatten` är
// medeltonen, `grund` bandet nära stranden.
export const PALETTER = [
  { vatten: 0x3fa9d3, grund: 0x9fe0ee, strand: 0xead9a6, sten: 0xb9b2a4, gras: 0x3f9148, blomma: 0xffffff },
  { vatten: 0x3a8fc4, grund: 0x8fd0e8, strand: 0xdcc58f, sten: 0xa89f92, gras: 0x3a8a4a, blomma: 0xffe27a },
  { vatten: 0x3fae9c, grund: 0x9ae3cf, strand: 0xcdbb86, sten: 0xaaa597, gras: 0x3f8f45, blomma: 0xff9ec4 },
  { vatten: 0x5f86cf, grund: 0xa9c4ee, strand: 0xe2cfa8, sten: 0xb3aca0, gras: 0x459650, blomma: 0xd8b4ff },
]

function slump(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Kontur runt dammen: en rundad rektangel, `m` px utanför POND, med en organisk vågighet som
// bara trycker UTÅT (aldrig in mot rektangeln). Alla konturer som delar `vag` är parallella,
// så strand/vått/vatten ligger som ringar i varandra. Punkter: {x, y, nx, ny} (nx/ny = normal).
function kontur(vag, m) {
  const HW = 420 + m
  const HH = 205 + m
  const R = 44 + m
  const cx = HW - R // bågmittpunkternas avstånd från mitten — samma för alla m
  const cy = HH - R
  const pts = []
  const add = (x, y, nx, ny) => pts.push({ x: PC.x + x, y: PC.y + y, nx, ny })
  const bage4 = (ox, oy, a0) => {
    for (let i = 0; i <= 5; i++) {
      const a = a0 + (i / 5) * (Math.PI / 2)
      add(ox + R * Math.cos(a), oy + R * Math.sin(a), Math.cos(a), Math.sin(a))
    }
  }
  const kant = (n, f) => {
    for (let i = 1; i <= n; i++) f(i / (n + 1))
  }
  kant(6, (u) => add(-cx + 2 * cx * u, -HH, 0, -1))
  bage4(cx, -cy, -Math.PI / 2)
  kant(3, (u) => add(HW, -cy + 2 * cy * u, 1, 0))
  bage4(cx, cy, 0)
  kant(6, (u) => add(cx - 2 * cx * u, HH, 0, 1))
  bage4(-cx, cy, Math.PI / 2)
  kant(3, (u) => add(-HW, cy - 2 * cy * u, -1, 0))
  bage4(-cx, -cy, Math.PI)
  const n = pts.length
  pts.forEach((p, i) => {
    const f = (i / n) * Math.PI * 2
    const w = Math.max(2, 9 + 7 * Math.sin(f * 3 + vag[0]) + 5 * Math.sin(f * 5 + vag[1]) + 3 * Math.sin(f * 8 + vag[2]))
    p.x += p.nx * w
    p.y += p.ny * w
  })
  return pts
}

// En mjuk, oregelbunden ellips (16 punkter, radien vickar med två slumpade vågor).
function klump(cx, cy, rx, ry, rnd) {
  const f1 = rnd() * 6.28
  const f2 = rnd() * 6.28
  const pts = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const r = 1 + 0.07 * Math.sin(a * 2 + f1) + 0.05 * Math.sin(a * 3 + f2)
    pts.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r })
  }
  return pts
}

const inat = (pts, d) => pts.map((p) => ({ x: p.x - p.nx * d, y: p.y - p.ny * d }))

// Sluten mjuk kurva genom punkterna (kvadratiska steg via kantmittpunkter). Börjar ALLTID med
// en egen moveTo, så ingen penna ärvs från förra formen.
function skissa(g, pts) {
  const n = pts.length
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const s = mid(pts[n - 1], pts[0])
  g.moveTo(s.x, s.y)
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const q = mid(p, pts[(i + 1) % n])
    g.quadraticCurveTo(p.x, p.y, q.x, q.y)
  }
  g.closePath()
  return g
}

function gastuss(g, x, y, rnd) {
  for (let b = -1; b <= 1; b++) {
    g.moveTo(x + b * 4, y).quadraticCurveTo(x + b * 6, y - 6, x + b * 8, y - 11 - rnd() * 5)
  }
}

// Gräsmattan bakom dammen: svaga slåttränder och glesa strån. Byggs en gång per montering.
export function byggFalt() {
  const rnd = slump(20261001)
  const g = new Graphics()
  g.eventMode = 'none'
  for (const x of [240, 620, 1000, 1380]) g.poly([x, 0, x + 150, 0, x - 70, 720, x - 220, 720]).fill({ color: 0xffffff, alpha: 0.06 })
  for (let i = 0; i < 46; i++) gastuss(g, 1050 + rnd() * 220, 24 + rnd() * 670, rnd)
  for (let i = 0; i < 22; i++) gastuss(g, 30 + rnd() * 1000, 24 + rnd() * 80, rnd)
  for (let i = 0; i < 8; i++) gastuss(g, 30 + rnd() * 1000, 698 + rnd() * 14, rnd)
  g.stroke({ width: 2.5, color: 0x58a858, alpha: 0.5, cap: 'round' })
  return g
}

// Bygger EN damm för en nivå. Returnerar { root, update(dt), destroy() }. Varje anrop slumpar
// ny form, nya blad och ny vass — samma nivå spelad två gånger är inte samma damm.
export function byggDamm(niva) {
  const pal = PALETTER[niva % PALETTER.length]
  const rnd = slump((Math.random() * 1e9) | 0)
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false

  const vag = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]
  const vatten = kontur(vag, 40)
  const vatt = kontur(vag, 52)
  const strand = kontur(vag, 68)
  const grasKant = kontur([rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], 96)

  // --- Former: gräskant, sand, vått, grunt, vatten, djup ---------------------------------
  const g = new Graphics()
  skissa(g, grasKant).fill({ color: pal.gras, alpha: 0.3 })
  skissa(g, strand).fill(pal.strand)
  skissa(g, vatt).fill(shade(pal.strand, 0.14))
  skissa(g, vatten).fill(pal.grund)
  const djupt = inat(vatten, 22)
  skissa(g, djupt).fill(pal.vatten)
  // Djupet: tolv lager halvgenomskinligt mörkare vatten, allt mindre mot en djuppunkt —
  // mörkast där lagren överlappar, en mjuk ramp utan gradient. Varje lager är en EGEN klump
  // (egen form och fas), inte en krympt kopia av strandkonturen: skalade kopior av samma
  // rundade rektangel lade sig som koncentriska trappsteg (kritiken 2026-10-01).
  const dx = PC.x + (rnd() - 0.5) * 120
  const dy = PC.y + (rnd() - 0.5) * 50
  const mork = shade(pal.vatten, 0.5)
  for (let i = 0; i < 12; i++) {
    const s = 0.95 - i * 0.06
    skissa(g, klump(dx, dy, 360 * s, 170 * s, rnd)).fill({ color: mork, alpha: 0.05 })
  }
  root.addChild(g)

  // --- Strand: blöt kant, stenar, strån, blommor ----------------------------------------
  const kant = new Graphics()
  kant.eventMode = 'none'
  skissa(kant, vatten).stroke({ width: 5, color: shade(pal.strand, 0.25), alpha: 0.35 })
  strand.forEach((p, i) => {
    if (i % 3 !== 0 || rnd() < 0.3) return
    const d = 8 + rnd() * 12
    const x = p.x - p.nx * d
    const y = p.y - p.ny * d
    const r = 5 + rnd() * 5
    kant.ellipse(x, y, r, r * 0.75).fill(pal.sten)
    kant.ellipse(x - r * 0.25, y - r * 0.3, r * 0.45, r * 0.3).fill({ color: 0xffffff, alpha: 0.4 })
  })
  grasKant.forEach((p) => {
    gastuss(kant, p.x - p.nx * (2 + rnd() * 12), p.y - p.ny * (2 + rnd() * 12), rnd)
  })
  kant.stroke({ width: 3, color: pal.gras, alpha: 0.75, cap: 'round' })
  for (let i = 0; i < 16; i++) {
    const p = grasKant[(rnd() * grasKant.length) | 0]
    const d = 14 + rnd() * 34
    const x = p.x + p.nx * d
    const y = p.y + p.ny * d
    if (x < 16 || x > 1264 || y < 16 || y > 704) continue
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      kant.circle(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 3.6).fill(pal.blomma)
    }
    kant.circle(x, y, 3).fill(0xffd35c)
  }
  root.addChild(kant)

  // --- Solglimtar i vattnet -------------------------------------------------------------
  const glints = new Graphics()
  glints.eventMode = 'none'
  for (let i = 0; i < 6; i++) {
    const x = 210 + rnd() * 660
    const y = 265 + rnd() * 270
    glints.moveTo(x, y).quadraticCurveTo(x + 11, y - 5, x + 24, y - 1)
  }
  glints.stroke({ width: 3, color: 0xffffff, alpha: 0.5, cap: 'round' })
  root.addChild(glints)

  // --- Krusningar som lever -------------------------------------------------------------
  const ringG = new Graphics()
  ringG.eventMode = 'none'
  root.addChild(ringG)
  const ringar = []
  let ringTid = 0.3

  // --- Näckrosblad -----------------------------------------------------------------------
  const pads = []
  const nPads = 4 + (niva % 3)
  for (let k = 0; k < nPads; k++) {
    for (let f = 0; f < 30; f++) {
      const p = vatten[(rnd() * vatten.length) | 0]
      const d = 30 + rnd() * 14
      const x = p.x - p.nx * d
      const y = p.y - p.ny * d
      if (pads.some((q) => Math.hypot(q.x0 - x, q.y0 - y) < 76)) continue
      const r = 22 + rnd() * 12
      const c = new Container()
      c.eventMode = 'none'
      const pg = new Graphics()
      const a0 = rnd() * Math.PI * 2
      pg.circle(3, 4, r).fill({ color: 0x0b4a66, alpha: 0.18 })
      // Tårtbit med skåra: moveTo(mitten).arc(…) är just det en avsiktlig kil ska skriva.
      pg.moveTo(0, 0).arc(0, 0, r, a0 + 0.3, a0 + Math.PI * 2 - 0.3).closePath().fill(0x4fae55).stroke({ width: 2.5, color: 0x3a8a42 })
      pg.circle(-r * 0.22, -r * 0.22, r * 0.45).fill({ color: 0x8ad87a, alpha: 0.3 })
      for (let v = 0; v < 5; v++) {
        const a = a0 + 0.6 + (v * (Math.PI * 2 - 1.2)) / 4
        pg.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85)
      }
      pg.stroke({ width: 1.5, color: 0x3a8a42, alpha: 0.5 })
      c.addChild(pg)
      let blomma = null
      if (rnd() < 0.4) {
        blomma = new Container()
        const bg = new Graphics()
        for (let b = 0; b < 8; b++) {
          const a = (b / 8) * Math.PI * 2
          bg.poly([0, 0, Math.cos(a - 0.3) * 8, Math.sin(a - 0.3) * 8, Math.cos(a) * 15, Math.sin(a) * 15, Math.cos(a + 0.3) * 8, Math.sin(a + 0.3) * 8])
          bg.fill(b % 2 ? 0xff9ec4 : 0xffc2dc)
        }
        bg.circle(0, 0, 4.5).fill(0xffd35c)
        blomma.addChild(bg)
        blomma.position.set(r * 0.2, -r * 0.1)
        c.addChild(blomma)
      }
      c.position.set(x, y)
      root.addChild(c)
      pads.push({ c, b: blomma, x0: x, y0: y, r0: rnd() * 6.28, f: rnd() * 6.28 })
      break
    }
  }

  // --- Vass (på stranden, aldrig åt höger där hink och katt står) -------------------------
  const reeds = []
  const vinklar = [110, 140, 170, 200, 225, 250, 275].sort(() => rnd() - 0.5).slice(0, 3)
  for (const deg of vinklar) {
    const a = (deg * Math.PI) / 180
    let bast = strand[0]
    let bd = Infinity
    for (const p of strand) {
      const pa = Math.atan2(p.y - PC.y, p.x - PC.x)
      const d = Math.abs(Math.atan2(Math.sin(pa - a), Math.cos(pa - a)))
      if (d < bd) {
        bd = d
        bast = p
      }
    }
    const c = new Container()
    c.eventMode = 'none'
    const sg = new Graphics()
    // Nedåt i bild (sin a > 0.3) växer vassen kortare så den inte sticker in över saker.
    const kort = Math.sin(a) > 0.3 ? 0.6 : 1
    const n = 4 + ((rnd() * 2) | 0)
    sg.ellipse(0, 2, 26, 7).fill({ color: 0xffffff, alpha: 0.25 })
    for (let s = 0; s < n; s++) {
      const lean = -0.32 + (s / (n - 1)) * 0.64 + (rnd() - 0.5) * 0.12
      const len = (56 + rnd() * 40) * kort
      const tx = Math.sin(lean) * len
      const ty = -Math.cos(lean) * len
      sg.poly([-3.5, 0, 3.5, 0, tx + 1.2, ty, tx - 1.2, ty]).fill(s % 2 ? 0x4f8a3a : 0x5fa046)
      if (s % 2 === 0) {
        sg.ellipse(tx, ty + 10, 4.5, 13).fill(0x7a4a26)
        sg.moveTo(tx, ty - 3).lineTo(tx, ty - 10).stroke({ width: 2, color: 0x7a4a26, cap: 'round' })
      }
    }
    c.addChild(sg)
    c.position.set(bast.x - bast.nx * 12, bast.y - bast.ny * 12)
    root.addChild(c)
    reeds.push({ c, f: rnd() * 6.28 })
  }

  let t = 0
  let dod = false
  return {
    root,
    update(dt) {
      if (dod || root.destroyed) return
      t += dt
      glints.alpha = 0.5 + 0.5 * Math.sin(t * 1.4)
      for (const p of pads) {
        p.c.rotation = p.r0 + Math.sin(t * 0.6 + p.f) * 0.07
        p.c.x = p.x0 + Math.sin(t * 0.4 + p.f) * 2
        p.c.y = p.y0 + Math.cos(t * 0.35 + p.f) * 1.5
        if (p.b) p.b.scale.set(1 + 0.06 * Math.sin(t * 1.6 + p.f))
      }
      for (const r of reeds) r.c.rotation = Math.sin(t * 1.1 + r.f) * 0.04
      ringTid -= dt
      if (ringTid <= 0 && ringar.length < 6) {
        ringTid = 0.7 + rnd() * 1.3
        ringar.push({ x: 190 + rnd() * 700, y: 260 + rnd() * 290, t: 0, d: 2.2 + rnd() * 1.2, m: 24 + rnd() * 26 })
      }
      ringG.clear()
      for (let i = ringar.length - 1; i >= 0; i--) {
        const r = ringar[i]
        r.t += dt
        const p = r.t / r.d
        if (p >= 1) {
          ringar.splice(i, 1)
          continue
        }
        const rad = r.m * (0.2 + 0.8 * (1 - (1 - p) * (1 - p)))
        ringG.circle(r.x, r.y, rad).stroke({ width: 2.5, color: 0xffffff, alpha: (1 - p) * 0.4 })
        if (p > 0.2) ringG.circle(r.x, r.y, rad * 0.6).stroke({ width: 2, color: 0xffffff, alpha: (1 - p) * 0.28 })
      }
    },
    destroy() {
      dod = true
      if (!root.destroyed) root.destroy({ children: true })
    },
  }
}

