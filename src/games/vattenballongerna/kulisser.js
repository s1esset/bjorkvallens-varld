// VATTENBALLONGERNA — kulisserna: kranen, vindflaggan, anden, pölen, solstrålen och regnbågen.
// Alla är egna föremål med egen form. Inget här äger en gsap-tween — spelets ticker driver dem,
// så ingenting kan överleva en rivning (destroy() river noderna, tickern slutar anropa dem).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { shade } from '../../lib/theme.js'
import { bage } from '../../lib/form.js'
import { KRAN_X, KRAN_Y, PIP, MARK_Y, VIND_MAX, clamp } from './konst.js'

// ---- Kranen ------------------------------------------------------------------------------------
// En stor trädgårdskran: ett stående rör ur marken, en armbåge, en pip, och ett rött vred.
// nod bär läge + träffyta (stilla); inre barn gör allt som rör sig.
export function byggKran(parent) {
  const nod = new Container()
  nod.position.set(KRAN_X, KRAN_Y)
  nod.eventMode = 'static'
  nod.cursor = 'pointer'
  // Det stående röret + vredet: 118 px bred (≥ 96) och slutar 24 px från ballongens träffyta (cirkel r 92 vid
  // x 262 → börjar x 170), så de två målen aldrig överlappar. Pipen/armen är inte tryckbar — vredet är.
  nod.hitArea = new Rectangle(-84, -310, 118, 330)
  parent.addChild(nod)

  const pulsa = new Container() // squash från feedback.js
  pulsa.eventMode = 'none'
  nod.addChild(pulsa)

  const dx = PIP.x - KRAN_X // armens längd åt höger
  const ytterHojd = KRAN_Y - PIP.y // rörets höjd
  const rorFarg = 0x7e93a6
  const g = new Graphics()
  // marken: en liten sockel + skugga
  g.ellipse(0, 4, 56, 11).fill({ color: 0x1b3a1b, alpha: 0.22 })
  g.roundRect(-30, -14, 60, 20, 8).fill(shade(rorFarg, 0.25))
  // det stående röret
  g.roundRect(-16, -ytterHojd, 32, ytterHojd - 6, 8).fill(rorFarg)
  g.roundRect(-10, -ytterHojd + 6, 7, ytterHojd - 30, 3.5).fill({ color: 0xffffff, alpha: 0.4 })
  // armbågen + vågräta armen
  g.circle(0, -ytterHojd + 10, 24).fill(rorFarg)
  g.roundRect(0, -ytterHojd - 14, dx + 18, 34, 14).fill(rorFarg)
  g.roundRect(6, -ytterHojd - 8, dx - 10, 7, 3.5).fill({ color: 0xffffff, alpha: 0.4 })
  // kragar
  g.roundRect(-22, -ytterHojd + 56, 44, 12, 5).fill(shade(rorFarg, 0.22))
  g.roundRect(-22, -62, 44, 12, 5).fill(shade(rorFarg, 0.22))
  // pipen: lite bredare mynning som pekar nedåt
  g.roundRect(dx - 15, -ytterHojd + 6, 30, 28, 8).fill(shade(rorFarg, 0.18))
  g.roundRect(dx - 11, -ytterHojd + 30, 22, 10, 5).fill(shade(rorFarg, 0.35))
  pulsa.addChild(g)

  // vredet — eget barn, snurrar vid tryck och vaggar i vila
  const ratt = new Graphics()
  const rf = 0xe5483c
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    ratt.moveTo(0, 0).lineTo(Math.cos(a) * 32, Math.sin(a) * 32).stroke({ width: 11, color: rf, cap: 'round' })
    ratt.circle(Math.cos(a) * 33, Math.sin(a) * 33, 9).fill(rf)
  }
  ratt.circle(0, 0, 13).fill(shade(rf, 0.2))
  ratt.circle(-3, -3, 4).fill({ color: 0xffffff, alpha: 0.55 })
  ratt.position.set(0, -150)
  pulsa.addChild(ratt)

  return { nod, pulsa, ratt, pipX: PIP.x, pipY: PIP.y + 30 }
}

// ---- Vindflaggan -------------------------------------------------------------------------------
// Stång på marken + en flagga som visar vindens RIKTNING och STYRKA: slapp och hängande i stiltje,
// utsträckt och fladdrande i full vind. Samma tal (w, px/steg) som Vindfalt får.
export function byggFlagga(parent, x, markY) {
  const nod = new Container()
  nod.position.set(x, markY)
  nod.eventMode = 'none'
  parent.addChild(nod)
  const hojd = 172
  const stang = new Graphics()
  stang.ellipse(0, 3, 22, 7).fill({ color: 0x1b3a1b, alpha: 0.2 })
  stang.roundRect(-3.5, -hojd, 7, hojd, 3.5).fill(0xa8794e)
  stang.circle(0, -hojd - 3, 7).fill(0xffd35c).stroke({ width: 2, color: 0xd9a021 })
  nod.addChild(stang)
  const tyg = new Graphics()
  tyg.position.set(0, -hojd + 6)
  nod.addChild(tyg)
  return { nod, tyg, hojd }
}

export function ritaFlagga(f, w, t) {
  const g = f.tyg
  const m = clamp(Math.abs(w) / VIND_MAX, 0, 1)
  const dir = w >= 0 ? 1 : -1
  const L = 22 + 74 * Math.sqrt(m)
  const droop = (1 - Math.min(1, m * 2.2)) * 44 // slapp när det är stilla
  const amp = 2 + 8 * m
  const N = 8
  const topp = []
  const botten = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const vag = Math.sin(t * (4 + 6 * m) - u * 6) * amp * u
    const x = dir * L * u
    const y = droop * u * u + vag
    const h = 40 * (1 - 0.22 * u)
    topp.push([x, y])
    botten.push([x, y + h])
  }
  g.clear()
  g.moveTo(topp[0][0], topp[0][1])
  for (let i = 1; i <= N; i++) g.lineTo(topp[i][0], topp[i][1])
  for (let i = N; i >= 0; i--) g.lineTo(botten[i][0], botten[i][1])
  g.closePath().fill(0xff5b5b).stroke({ width: 2.5, color: 0xc93a3a, join: 'round' })
  // ett vitt band i mitten
  g.moveTo(topp[2][0], topp[2][1] + 14)
  for (let i = 3; i <= N - 1; i++) g.lineTo(topp[i][0], topp[i][1] + 14)
  for (let i = N - 1; i >= 2; i--) g.lineTo(botten[i][0], botten[i][1] - 14)
  g.closePath().fill({ color: 0xffffff, alpha: 0.85 })
}

// ---- Pöl + anka (missen) -----------------------------------------------------------------------
export class Pol {
  constructor(parent, x, y, r = 58) {
    this.nod = new Container()
    this.nod.position.set(x, y)
    this.nod.eventMode = 'none'
    parent.addChild(this.nod)
    this.g = new Graphics()
    this.g.ellipse(0, 0, r, r * 0.28).fill({ color: 0x2f8fcf, alpha: 0.55 })
    this.g.ellipse(-r * 0.2, -r * 0.04, r * 0.52, r * 0.13).fill({ color: 0x7fd6ff, alpha: 0.7 })
    this.g.ellipse(-r * 0.32, -r * 0.05, r * 0.16, r * 0.04).fill({ color: 0xffffff, alpha: 0.8 })
    this.nod.addChild(this.g)
    this.nod.scale.set(0.1)
    this.t = 0
    this.liv = 7 // sekunder tills den är borta
    this.kvar = this.liv
    this.alive = true
  }
  uppdatera(dt) {
    if (!this.alive) return false
    this.t += dt
    this.kvar -= dt
    const upp = clamp(this.t / 0.45, 0, 1)
    const s = 1 - (1 - upp) * (1 - upp)
    const bort = clamp(this.kvar / 2.2, 0, 1) // tonar och krymper sakta de sista sekunderna
    this.nod.scale.set(s * (0.6 + 0.4 * bort), s * (0.6 + 0.4 * bort))
    this.nod.alpha = bort
    // ett lätt krus
    this.g.scale.x = 1 + Math.sin(this.t * 2.4) * 0.02
    return this.kvar > 0
  }
  snabbtBort() {
    this.kvar = Math.min(this.kvar, 0.8)
  }
  riv() {
    this.alive = false
    if (!this.nod.destroyed) this.nod.destroy({ children: true })
  }
}

export class Anka {
  constructor(parent, fran, till, y) {
    this.nod = new Container()
    this.nod.position.set(fran, y)
    this.nod.eventMode = 'none'
    parent.addChild(this.nod)
    this.till = till
    this.y0 = y
    this.dir = Math.sign(till - fran) || 1
    this.vy = new Container() // inre barn (vaggar/badar)
    this.vy.scale.set(1.35)
    this.nod.addChild(this.vy)
    const g = new Graphics()
    g.ellipse(0, -14, 20, 15).fill(0xffe066).stroke({ width: 2, color: 0xe0b52e })
    g.ellipse(-4, -12, 11, 7).fill(shade(0xffe066, 0.08)) // vingen
    g.circle(15, -32, 11).fill(0xffe066).stroke({ width: 2, color: 0xe0b52e })
    g.ellipse(26, -29, 8, 4.4).fill(0xff9a3d)
    g.circle(18, -35, 2.4).fill(0x33291f)
    g.moveTo(-18, -20).lineTo(-26, -26).lineTo(-17, -12).closePath().fill(0xffe066)
    g.ellipse(0, 1, 18, 4).fill({ color: 0x1b3a1b, alpha: 0.2 })
    g.eventMode = 'none'
    this.vy.addChild(g)
    this.fas = 0
    this.tillstand = 'gar' // gar → badar → gar bort
    this.t = 0
    this.alive = true
    this.klar = false
    this.kvackt = false
  }
  uppdatera(dt) {
    if (!this.alive) return
    this.t += dt
    const n = this.nod
    if (this.tillstand === 'gar') {
      this.fas += dt * 11
      n.x += this.dir * 150 * dt
      this.vy.y = -Math.abs(Math.sin(this.fas)) * 5
      this.vy.rotation = Math.sin(this.fas) * 0.12
      this.vy.scale.x = 1.35 * this.dir
      if ((this.till - n.x) * this.dir <= 0) {
        this.tillstand = 'badar'
        this.t = 0
      }
    } else if (this.tillstand === 'badar') {
      // sitter i pölen och plaskar: gungar och skakar på stjärten
      this.vy.scale.x = 1.35 * this.dir
      this.vy.y = 4 + Math.sin(this.t * 7) * 2
      this.vy.rotation = Math.sin(this.t * 9) * 0.1
      if (this.t > 3.6) {
        this.tillstand = 'gar bort'
        this.t = 0
        this.dir *= -1
      }
    } else {
      this.fas += dt * 11
      n.x += this.dir * 170 * dt
      this.vy.y = -Math.abs(Math.sin(this.fas)) * 5
      this.vy.rotation = Math.sin(this.fas) * 0.12
      this.vy.scale.x = 1.35 * this.dir
      if (this.t > 2.2) this.klar = true
    }
  }
  get badar() {
    return this.tillstand === 'badar'
  }
  riv() {
    this.alive = false
    if (!this.nod.destroyed) this.nod.destroy({ children: true })
  }
}

// ---- Solstrålen (motgången) --------------------------------------------------------------------
// En mjuk gul stråle från solen ner till djuret som just börjar bli varmt. Tydlig orsak: man SER
// vad som värmer. Ritas om bara medan den syns.
export function ritaStrale(g, sx, sy, tx, ty, a) {
  g.clear()
  if (a <= 0.01) return
  const dx = tx - sx
  const dy = ty - sy
  const l = Math.hypot(dx, dy) || 1
  const nx = -dy / l
  const ny = dx / l
  const b0 = 14
  const b1 = 74
  g.moveTo(sx + nx * b0, sy + ny * b0).lineTo(tx + nx * b1, ty + ny * b1).lineTo(tx - nx * b1, ty - ny * b1).lineTo(sx - nx * b0, sy - ny * b0).closePath().fill({ color: 0xffe27a, alpha: 0.22 * a })
  g.moveTo(sx + nx * 6, sy + ny * 6).lineTo(tx + nx * 34, ty + ny * 34).lineTo(tx - nx * 34, ty - ny * 34).lineTo(sx - nx * 6, sy - ny * 6).closePath().fill({ color: 0xfff1b0, alpha: 0.28 * a })
}

// ---- Regnbågen (finishen) ----------------------------------------------------------------------
const BAND = [0xff5b5b, 0xff9a3d, 0xffe066, 0x6fd16f, 0x4aa3df, 0xa78bfa]

export function ritaRegnbage(g, cx, cy, r0, p) {
  g.clear()
  if (p <= 0.001) return
  const sweep = Math.PI * clamp(p, 0, 1)
  for (let i = 0; i < BAND.length; i++) {
    const r = r0 - i * 17
    bage(g, cx, cy, r, Math.PI, Math.PI + sweep).stroke({ width: 17, color: BAND[i], alpha: 0.78, cap: 'butt' })
  }
}

export { MARK_Y }
