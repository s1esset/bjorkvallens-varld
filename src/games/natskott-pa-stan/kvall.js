// kvall.js — RESAN IN I KVÄLLEN för natskott-pa-stan.
//
// Ett varv (tre uppdrag → hemkomsten) är en eftermiddag som blir kväll: himlen går från blå
// via solnedgångens orange och rosa till mörkblå med måne och stjärnor, solen sjunker bakom
// husen, fönstren tänds ett efter ett och gatan mörknar — men det man ska skjuta på (mål,
// gatusaker, händerna) mörknar knappt, så det syns lika bra som på dagen. När bilen kör ut
// igen går solen upp: en ny dag. Ungefär varannan runda regnar det på eftermiddagen och
// klarnar upp mot kvällen.
//
// Spelet äger en enda siffra, `k` (0 = eftermiddag · 0,5 = solnedgång · 1 = kväll), och en
// regnstyrka 0..1. Allt här läser dem — inga egna klockor, inga tweens, ingenting fördröjt —
// så exit mitt i en solnedgång lämnar ingenting levande (spelets tick driver `steg`).
//
// KOSTNAD (P0 + CLAUDE.md "tysta fällor"): varje toning är en `verticalFill` — linjär och
// cachad PER FÄRGPAR i lib/form.js, så en andra montering bakar noll texturer. Ingen radiell
// gradient (256× dyrare): sken och halor är koncentriska former med låg alfa. Mörkret är
// `Container.tint` på lagren (Pixi v8 ärver tint nedåt) — gratis per bildruta, ingen extra
// helskärmsyta. Det som ska LYSA ligger därför i lager som INTE tintas.
import { Container, Graphics } from 'pixi.js'
import { lerpColor } from '../../lib/scene.js'
import { verticalFill } from '../../lib/form.js'

const klamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const mjuk = (a, b, x) => {
  const t = klamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Färgresa i tre stopp: eftermiddag (k=0) · solnedgång (k=0,5) · kväll (k=1).
export function treStopp(k, [dag, skym, natt]) {
  return k <= 0.5 ? lerpColor(dag, skym, k / 0.5) : lerpColor(skym, natt, (k - 0.5) / 0.5)
}

// Lagrens tint. Världen (hus, gata) mörknar på riktigt; det man ska TRÄFFA mörknar bara lite
// (`sak`), så målen läser lika tydligt på kvällen — P0: ingen läsning, form och färg bär allt.
export const TINT = {
  varld: [0xffffff, 0xffdcc2, 0x7b85b8],
  fjarran: [0xffffff, 0xf0b6ae, 0x525c96],
  sak: [0xffffff, 0xfff1e4, 0xd2d7f2],
  moln: [0xffffff, 0xffc2ac, 0x6c77a6],
}
const REGN_GRA = 0xcdd4dd // grå eftermiddag: multipliceras in med regnstyrkan

// Tint med regnets gråton inblandad.
export function lagerTint(k, regn, stopp) {
  const t = treStopp(k, stopp)
  if (regn <= 0.01) return t
  const g = lerpColor(0xffffff, REGN_GRA, regn)
  const r = (((t >> 16) & 0xff) * ((g >> 16) & 0xff)) / 255
  const gg = (((t >> 8) & 0xff) * ((g >> 8) & 0xff)) / 255
  const b = ((t & 0xff) * (g & 0xff)) / 255
  return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b)
}

// En månskära som polygon: cirkeln (0,0,R) minus cirkeln (hx,hy,r). Skärningspunkterna
// räknas ut; yttre bågen går runt den sida som vetter BORT från hålet, hålets båge tillbaka.
function skara(g, R, hx, hy, r, steg = 28) {
  const d = Math.hypot(hx, hy)
  const ux = hx / d
  const uy = hy / d
  const a = (R * R - r * r + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, R * R - a * a))
  const p1 = { x: a * ux - h * uy, y: a * uy + h * ux }
  const p2 = { x: a * ux + h * uy, y: a * uy - h * ux }
  let o1 = Math.atan2(p1.y, p1.x)
  let o2 = Math.atan2(p2.y, p2.x)
  // yttre bågen ska passera riktningen BORT från hålet
  const bort = Math.atan2(-uy, -ux)
  const TAU = Math.PI * 2
  const mellan = (x, lo, hi) => lo + ((((x - lo) % TAU) + TAU) % TAU) <= hi
  while (o2 < o1) o2 += Math.PI * 2
  if (!mellan(bort, o1, o2)) {
    const t = o1
    o1 = o2
    o2 = t + Math.PI * 2
    while (o2 < o1) o2 += Math.PI * 2
  }
  const pts = []
  for (let i = 0; i <= steg; i++) {
    const t = o1 + ((o2 - o1) * i) / steg
    pts.push(Math.cos(t) * R, Math.sin(t) * R)
  }
  // hålets båge från slutpunkten tillbaka till startpunkten, på den sida som ligger inne i skivan
  const sx = Math.cos(o2) * R - hx
  const sy = Math.sin(o2) * R - hy
  const ex = Math.cos(o1) * R - hx
  const ey = Math.sin(o1) * R - hy
  let i1 = Math.atan2(sy, sx)
  let i2 = Math.atan2(ey, ex)
  const mot = Math.atan2(-hy, -hx) // från hålets mitt mot skivans mitt
  while (i2 > i1) i2 -= Math.PI * 2
  if (!mellan(mot, i2, i1)) i2 += Math.PI * 2
  for (let i = 1; i < steg; i++) {
    const t = i1 + ((i2 - i1) * i) / steg
    pts.push(hx + Math.cos(t) * r, hy + Math.sin(t) * r)
  }
  g.poly(pts)
}

// ---------------------------------------------------------------------------------------------
// HIMLEN — fyra himlar som tonas över varandra + sol, måne, stjärnor och moln.
// ---------------------------------------------------------------------------------------------
const HIMMEL_H = 482 // himlens underkant (horisonten ligger bakom husen)

export class Himmel {
  constructor(w, bx, by) {
    this.root = new Container()
    this.root.eventMode = 'none'
    this.root.interactiveChildren = false
    const X = -bx
    const W = w + 2 * bx
    // En himmel = en toppremsa (full bleed uppåt) + ett eller två lodräta band.
    const himmel = (stopp) => {
      const g = new Graphics()
      g.rect(X, -by, W, by).fill(stopp[0])
      if (stopp.length === 2) {
        g.rect(X, 0, W, HIMMEL_H).fill(verticalFill(stopp[0], stopp[1]))
      } else {
        const mitt = Math.round(HIMMEL_H * stopp[3])
        g.rect(X, 0, W, mitt).fill(verticalFill(stopp[0], stopp[1]))
        g.rect(X, mitt, W, HIMMEL_H - mitt).fill(verticalFill(stopp[1], stopp[2]))
      }
      g.eventMode = 'none'
      this.root.addChild(g)
      return g
    }
    this.dag = himmel([0x8ecdf0, 0xdff2fb]) // samma färgresa som spelet alltid haft
    this.mulen = himmel([0x8d9ab0, 0xd2d8de])
    this.skym = himmel([0x5c6fbf, 0xef9cb0, 0xffc47c, 0.52])
    this.natt = himmel([0x131b42, 0x2b3973, 0x56619d, 0.6])
    this.mulen.alpha = 0
    this.skym.alpha = 0
    this.natt.alpha = 0

    // Stjärnor i två grupper som blinkar i otakt (alfa, ingen omritning).
    this.stjarnor = [new Graphics(), new Graphics()]
    for (let i = 0; i < 46; i++) {
      const g = this.stjarnor[i % 2]
      const x = X + 20 + Math.random() * (W - 40)
      const y = 14 + Math.pow(Math.random(), 1.4) * 300
      const r = Math.random() < 0.22 ? 4.2 + Math.random() * 1.6 : 1.6 + Math.random() * 1.4
      if (r > 3.5) {
        // fyrudd — de stora läser som "stjärna", inte som prick
        g.moveTo(x, y - r * 1.8).lineTo(x + r * 0.45, y - r * 0.45).lineTo(x + r * 1.8, y)
          .lineTo(x + r * 0.45, y + r * 0.45).lineTo(x, y + r * 1.8).lineTo(x - r * 0.45, y + r * 0.45)
          .lineTo(x - r * 1.8, y).lineTo(x - r * 0.45, y - r * 0.45).closePath().fill(0xfff6d8)
      } else {
        g.circle(x, y, r).fill({ color: 0xfffbea, alpha: 0.9 })
      }
    }
    for (const g of this.stjarnor) {
      g.alpha = 0
      g.eventMode = 'none'
      this.root.addChild(g)
    }

    // Månen: en skära (cut() gör hålet — ingen himmelsfärgad cirkel som skulle synas mot
    // toningen) med ett mjukt sken i fyra skal.
    this.mane = new Container()
    this.mane.eventMode = 'none'
    // skenet är RINGAR utanför skivan: fyllda skal hade lyst upp hålet i skäran så att
    // månen läste som en full skiva med ett mörkt streck (sett i första skärmdumpen)
    const sken = new Graphics()
    for (const [r, w, a] of [[72, 14, 0.04], [58, 12, 0.06], [46, 10, 0.08]]) sken.circle(-6, 4, r).stroke({ width: w, color: 0xfff1c8, alpha: a })
    sken.eventMode = 'none'
    this.mane.addChild(sken)
    // Skäran som EN polygon (yttre bågen + hålets båge, uträknade skärningspunkter).
    // `cut()` gav i skärmdumpen en full skiva med ett mörkt streck — ingen skära.
    const skiva = new Graphics()
    skara(skiva, 36, 16, -10, 31)
    skiva.fill(0xfff4d2)
    skiva.circle(-18, 8, 4).fill({ color: 0xeedfb6, alpha: 0.9 })
    skiva.circle(-10, 22, 3).fill({ color: 0xeedfb6, alpha: 0.9 })
    skiva.eventMode = 'none'
    this.mane.addChild(skiva)
    this.mane.position.set(300, HIMMEL_H + 40)
    this.mane.alpha = 0
    this.root.addChild(this.mane)

    // Solen ritas VIT och färgas med tint: gul på dagen, orange när den går ner.
    this.sol = new Container()
    this.sol.eventMode = 'none'
    this.solSken = new Graphics()
    for (const [r, a] of [[96, 0.06], [76, 0.09], [60, 0.13]]) this.solSken.circle(0, 0, r).fill({ color: 0xffffff, alpha: a })
    this.solSken.alpha = 0
    this.solSken.eventMode = 'none'
    this.sol.addChild(this.solSken)
    const skivan = new Graphics().circle(0, 0, 42).fill(0xffffff)
    skivan.eventMode = 'none'
    this.sol.addChild(skivan)
    this.solStralar = new Graphics()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      this.solStralar.moveTo(Math.cos(a) * 52, Math.sin(a) * 52).lineTo(Math.cos(a) * 66, Math.sin(a) * 66)
    }
    this.solStralar.stroke({ width: 5, color: 0xffffff, alpha: 0.7 })
    this.solStralar.eventMode = 'none'
    this.sol.addChild(this.solStralar)
    this.sol.position.set(985, 108)
    this.sol.tint = 0xffe28a
    this.root.addChild(this.sol)

    // Moln: två vita som alltid funnits + tre tunga regnmoln som bara syns när det regnar.
    this.moln = []
    const moln = (cx, cy, s, regnmoln) => {
      const m = new Graphics()
      m.circle(-34, 4, 24).fill(0xffffff)
      m.circle(0, -8, 30).fill(0xffffff)
      m.circle(34, 4, 25).fill(0xffffff)
      m.roundRect(-52, 0, 104, 26, 13).fill(0xffffff)
      if (regnmoln) {
        m.circle(-62, 10, 20).fill(0xffffff)
        m.circle(62, 10, 19).fill(0xffffff)
        m.roundRect(-78, 6, 156, 24, 12).fill(0xffffff)
      }
      m.scale.set(s)
      m.position.set(cx, cy)
      m.eventMode = 'none'
      m._wxRegn = regnmoln
      m._wxFart = regnmoln ? 0.3 : 0.16
      this.root.addChild(m)
      this.moln.push(m)
    }
    moln(300, 90, 1, false)
    moln(760, 150, 0.7, false)
    moln(120, 70, 1.5, true)
    moln(620, 52, 1.8, true)
    moln(1080, 96, 1.4, true)

    // Stjärnfall: EN linje med svans som ritas om i steg() under 0,9 s (ingen tween).
    this.fall = new Graphics()
    this.fall.eventMode = 'none'
    this.root.addChild(this.fall)
    this._fallT = -1
    this._k = -1
    this._regn = -1
  }

  stjarnfall() {
    this._fallT = 0
  }

  get stjarnfallPagar() {
    return this._fallT >= 0
  }

  // k, regn: spelets tal. t: speltid i s (blink). dtF: bildrutor (molnens drift).
  steg(k, regn, t, dtF, w = 1280) {
    const nyttLjus = Math.abs(k - this._k) > 0.0005 || Math.abs(regn - this._regn) > 0.0005
    if (nyttLjus) {
      this._k = k
      this._regn = regn
      const skym = mjuk(0.05, 0.5, k)
      const natt = mjuk(0.5, 0.95, k)
      this.mulen.alpha = regn * (1 - natt)
      this.skym.alpha = skym * (1 - regn * 0.65)
      this.natt.alpha = natt
      // en himmel med alfa 0 ska inte ritas alls, och dagshimlen behövs inte när kvällen
      // täcker den helt (fyra helskärmsytor i rad kostar fyllnad på en svag platta)
      this.mulen.visible = this.mulen.alpha > 0.004
      this.skym.visible = this.skym.alpha > 0.004 && natt < 0.999
      this.natt.visible = natt > 0.004
      this.dag.visible = natt < 0.999
      // solen sjunker bakom husen och blir orange; i regnet syns den inte alls. Banan är
      // en potenskurva, inte en smoothstep: vid solnedgången (k 0,5) ska den stå LÅGT men
      // synlig mellan husen — med smoothstep var den redan bakom dem.
      const ner = Math.pow(klamp((k - 0.04) / 0.72, 0, 1), 1.6)
      this.sol.position.set(985 + ner * 70, 108 + ner * 380)
      this.sol.tint = lerpColor(0xffe28a, 0xff8c4a, mjuk(0.1, 0.55, k))
      this.solStralar.alpha = 1 - mjuk(0.1, 0.4, k)
      this.solSken.alpha = mjuk(0.15, 0.45, k) * (1 - mjuk(0.62, 0.74, k))
      this.sol.alpha = (1 - regn) * (1 - mjuk(0.68, 0.78, k))
      this.sol.visible = this.sol.alpha > 0.01
      // månen stiger upp på andra sidan
      const upp = mjuk(0.6, 1, k)
      this.mane.position.set(300 - upp * 40, HIMMEL_H + 40 - upp * 380)
      this.mane.alpha = mjuk(0.58, 0.8, k) * (1 - regn)
      this.mane.visible = this.mane.alpha > 0.01
      const molnTint = lagerTint(k, 0, TINT.moln)
      for (const m of this.moln) {
        if (m.destroyed) continue
        if (m._wxRegn) {
          m.alpha = regn * 0.95
          m.tint = lerpColor(lerpColor(0xaeb7c4, 0x8f9aab, regn), molnTint, natt * 0.7)
        } else {
          m.alpha = 0.85 * (1 - natt * 0.45) * (1 - regn * 0.85)
          m.tint = molnTint
        }
        m.visible = m.alpha > 0.01
      }
    }
    // stjärnorna tänds sist och blinkar i otakt
    const sAlfa = mjuk(0.66, 0.95, k) * (1 - regn)
    this.stjarnor[0].alpha = sAlfa * (0.72 + 0.28 * Math.sin(t * 2.1))
    this.stjarnor[1].alpha = sAlfa * (0.72 + 0.28 * Math.sin(t * 2.7 + 2))
    for (const g of this.stjarnor) g.visible = g.alpha > 0.01
    // molnen driver
    for (const m of this.moln) {
      if (m.destroyed) continue
      m.x -= m._wxFart * dtF
      if (m.x < -260) m.x = w + 260
    }
    // stjärnfallet
    const f = this.fall
    if (this._fallT >= 0 && !f.destroyed) {
      this._fallT += dtF / 60
      const p = this._fallT / 0.9
      f.clear()
      if (p >= 1) {
        this._fallT = -1
      } else {
        const x0 = 1020 - p * 520
        const y0 = 40 + p * 190
        const a = Math.sin(p * Math.PI)
        f.moveTo(x0, y0).lineTo(x0 + 120, y0 - 44).stroke({ width: 3, color: 0xfff6d8, alpha: 0.5 * a, cap: 'round' })
        f.moveTo(x0, y0).lineTo(x0 + 52, y0 - 19).stroke({ width: 4, color: 0xffffff, alpha: 0.9 * a, cap: 'round' })
        f.circle(x0, y0, 5).fill({ color: 0xffffff, alpha: a })
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// REGNET — två lager streck som glider (förritade, ingen omritning) + plask på trottoaren.
// ---------------------------------------------------------------------------------------------
const RUTA = 512 // regnmönstrets ruta: ritas i ett rutnät, flyttas modulo RUTA

export class Regn {
  constructor(w, h, bx, by) {
    this.root = new Container()
    this.root.eventMode = 'none'
    this.root.interactiveChildren = false
    this.root.visible = false
    this._x0 = -bx
    this._y0 = -by
    this._w = w + 2 * bx
    this._h = h + by + 40
    const lager = (antal, langd, bredd, alfa) => {
      const g = new Graphics()
      const monster = []
      for (let i = 0; i < antal; i++) monster.push([Math.random() * RUTA, Math.random() * RUTA, langd * (0.75 + Math.random() * 0.5)])
      const kol = Math.ceil(this._w / RUTA) + 1
      const rad = Math.ceil(this._h / RUTA) + 1
      for (let cx = 0; cx < kol; cx++) {
        for (let cy = 0; cy < rad; cy++) {
          for (const [x, y, l] of monster) {
            const px = cx * RUTA + x
            const py = cy * RUTA + y
            // bilen åker åt höger → dropparna faller snett bakåt
            g.moveTo(px, py).lineTo(px - l * 0.28, py + l)
          }
        }
      }
      g.stroke({ width: bredd, color: 0xe4eef8, alpha: alfa, cap: 'round' })
      g.eventMode = 'none'
      this.root.addChild(g)
      return { g, ox: Math.random() * RUTA, oy: Math.random() * RUTA }
    }
    this.lagren = [lager(16, 16, 1.6, 0.4), lager(13, 26, 2.4, 0.55)]
    this.lagren[0].fart = 7
    this.lagren[1].fart = 12
    this.plaskG = new Graphics()
    this.plaskG.eventMode = 'none'
    this.root.addChild(this.plaskG)
    this.plask = []
    this._plaskT = 0
  }

  // styrka 0..1 · sc = scrollens förflyttning den här bildrutan (dropparna följer gatan lite)
  steg(styrka, dtF, sc, golvY0, golvY1) {
    const synlig = styrka > 0.01
    this.root.visible = synlig
    if (!synlig) {
      if (this.plask.length) {
        this.plask.length = 0
        this.plaskG.clear()
      }
      return
    }
    this.root.alpha = styrka
    for (const l of this.lagren) {
      if (l.g.destroyed) continue
      l.oy = (l.oy + l.fart * dtF) % RUTA
      l.ox = (l.ox + (l.fart * 0.28 + sc * 0.4)) % RUTA
      l.g.position.set(this._x0 - l.ox, this._y0 - RUTA + l.oy)
    }
    // plask: små ringar där dropparna slår ner (tak 16, var och en lever 0,35 s)
    this._plaskT -= dtF
    while (this._plaskT <= 0 && this.plask.length < 16) {
      this._plaskT += 1.6 / styrka
      this.plask.push({ x: this._x0 + Math.random() * this._w, y: golvY0 + Math.random() * (golvY1 - golvY0), t: 0 })
    }
    const g = this.plaskG
    if (g.destroyed) return
    g.clear()
    for (let i = this.plask.length - 1; i >= 0; i--) {
      const p = this.plask[i]
      p.t += dtF / 60
      p.x -= sc
      if (p.t > 0.35) {
        this.plask.splice(i, 1)
        continue
      }
      const u = p.t / 0.35
      g.ellipse(p.x, p.y, 3 + u * 11, 1.2 + u * 3.2).stroke({ width: 1.6, color: 0xe4eef8, alpha: 0.75 * (1 - u) })
    }
  }
}

// ---------------------------------------------------------------------------------------------
// TÄNDA FÖNSTER — ritas i det otintade ljuslagret ovanpå husets (tintade) fönster.
// Origo = fönstrets mitt, samma rum som `_drawWindow`.
// ---------------------------------------------------------------------------------------------
const SPROJS = 0x6b4430
export function ritaFonsterLjus(w, h, variant) {
  const g = new Graphics()
  // skenet på väggen runt rutan: koncentriska skal, aldrig en radiell gradient
  for (const [d, a] of [[17, 0.06], [11, 0.09], [5, 0.13]]) {
    g.roundRect(-w / 2 - 5 - d, -h / 2 - 5 - d, w + 10 + 2 * d, h + 10 + 2 * d, 6 + d).fill({ color: 0xffc35c, alpha: a })
  }
  g.roundRect(-w / 2, -h / 2, w, h, 3).fill(verticalFill(0xffe7a6, 0xffb95e))
  // lite liv där inne — en gardin, en lampa eller en blomma (ingen människa: P0)
  if (variant === 0) {
    g.moveTo(-w / 2, -h / 2).quadraticCurveTo(-w * 0.2, -h * 0.1, -w * 0.36, h / 2).lineTo(-w / 2, h / 2).closePath().fill({ color: 0xe0775a, alpha: 0.6 })
    g.moveTo(w / 2, -h / 2).quadraticCurveTo(w * 0.2, -h * 0.1, w * 0.36, h / 2).lineTo(w / 2, h / 2).closePath().fill({ color: 0xe0775a, alpha: 0.6 })
  } else if (variant === 1) {
    g.moveTo(-w * 0.32, h * 0.12).lineTo(-w * 0.12, h * 0.12).lineTo(-w * 0.08, h * 0.3).lineTo(-w * 0.36, h * 0.3).closePath().fill({ color: 0xc8643c, alpha: 0.75 })
    g.rect(-w * 0.23, h * 0.3, 3, h * 0.17).fill({ color: SPROJS, alpha: 0.7 })
    g.circle(-w * 0.22, h * 0.26, 9).fill({ color: 0xfff4c8, alpha: 0.5 })
  } else if (variant === 2) {
    g.roundRect(w * 0.08, h * 0.3, w * 0.28, h * 0.18, 3).fill({ color: 0xa65a3a, alpha: 0.8 })
    g.circle(w * 0.22, h * 0.2, w * 0.13).fill({ color: 0x4f8a4a, alpha: 0.8 })
    g.circle(w * 0.13, h * 0.26, w * 0.09).fill({ color: 0x5f9c55, alpha: 0.8 })
    g.circle(w * 0.31, h * 0.26, w * 0.09).fill({ color: 0x5f9c55, alpha: 0.8 })
  }
  g.moveTo(0, -h / 2).lineTo(0, h / 2).moveTo(-w / 2, 0).lineTo(w / 2, 0).stroke({ width: 3, color: SPROJS, alpha: 0.85 })
  g.eventMode = 'none'
  return g
}

// Ett skyltfönster i butiken: varmt ljus över varorna (genomsläppligt, varorna syns kvar).
export function ritaSkyltLjus(w, h) {
  const g = new Graphics()
  for (const [d, a] of [[14, 0.05], [8, 0.08]]) g.roundRect(-w / 2 - d, -h / 2 - d, w + 2 * d, h + 2 * d, 8 + d).fill({ color: 0xffc35c, alpha: a })
  g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 3).fill({ color: 0xffd987, alpha: 0.34 })
  g.eventMode = 'none'
  return g
}
