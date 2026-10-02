// Fyrverkeriets stad (FYSIKPLAN L2) — natt över hustak i två led: en fjärran rad i dis och en
// nära rad med sadeltak, platta tak med skorstenar, ett kyrktorn och fönster som TÄNDS en och en
// medan stjärnorna tänds. Framför: en gata med gatlyktor som andas, två granar och månen.
// Allt är fyllda Graphics i en ton per lager (noll gradienter, noll texturbakningar) och drivs
// av tickern (`uppdatera`) — inga tweens, alltså inget att städa vid exit.
import { Container, Graphics } from 'pixi.js'
import { BLEED_X } from '../../lib/view.js'

const dekor = (c) => {
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

const MAN = { x: 1076, y: 150 } // oförändrad (spelets stjärnor undviker den)

// Ett hus: kropp + tak. typ = sadel | platt | torn | mansard. Returnerar takets överkant
// och en lista med takets ljuskant (måne-sidan) som anroparen strykar.
function hus(g, ljus, x, w, h, groundY, typ, rnd, manX) {
  const top = groundY - h
  const botten = groundY + 6
  g.rect(x, top, w, botten - top)
  const m = x + w / 2
  const vetterMot = m < manX ? 1 : -1 // vilken sluttning månen når
  if (typ === 'sadel') {
    const tak = w * (0.3 + rnd() * 0.12)
    g.poly([x - 3, top, m, top - tak, x + w + 3, top])
    if (vetterMot > 0) ljus.push([m, top - tak, x + w + 3, top])
    else ljus.push([x - 3, top, m, top - tak])
  } else if (typ === 'mansard') {
    const tak = w * 0.2
    g.poly([x - 3, top, x + w * 0.2, top - tak, x + w * 0.8, top - tak, x + w + 3, top])
    if (vetterMot > 0) ljus.push([x + w * 0.8, top - tak, x + w + 3, top])
    else ljus.push([x - 3, top, x + w * 0.2, top - tak])
  } else if (typ === 'torn') {
    const tw = w * 0.5
    const tx = x + (w - tw) / 2
    const tt = top - h * 0.34
    g.rect(tx, tt, tw, top - tt + 2)
    const sp = tw * 1.5
    g.poly([tx - 3, tt, tx + tw / 2, tt - sp, tx + tw + 3, tt])
    if (vetterMot > 0) ljus.push([tx + tw / 2, tt - sp, tx + tw + 3, tt])
    else ljus.push([tx - 3, tt, tx + tw / 2, tt - sp])
    return { top: tt - sp, torn: { x: tx, w: tw, y: tt, h: top - tt } }
  } else {
    // platt tak med skorsten
    const sx = x + w * (0.15 + rnd() * 0.55)
    const sh = 14 + rnd() * 12
    g.rect(sx, top - sh, w * 0.13, sh + 2)
    ljus.push([x, top, x + w, top])
    return { top: top - sh }
  }
  return { top: top - w * 0.3 }
}

// Bygger staden. groundY = markens överkant (raketens ramp står där). rnd = seedad slump.
export function byggStad(groundY, rnd) {
  const rot = dekor(new Container())

  // Måne med skuggkratrar (som förut).
  rot.addChild(
    new Graphics()
      .circle(MAN.x, MAN.y, 74).fill({ color: 0xfff3d0, alpha: 0.1 })
      .circle(MAN.x, MAN.y, 52).fill(0xf7edcf)
      .circle(MAN.x - 16, MAN.y - 12, 10).fill({ color: 0xe2d6b4, alpha: 0.8 })
      .circle(MAN.x + 16, MAN.y + 12, 7).fill({ color: 0xe2d6b4, alpha: 0.7 })
      .circle(MAN.x + 8, MAN.y - 20, 5).fill({ color: 0xe2d6b4, alpha: 0.6 }),
  )

  const x0 = -BLEED_X - 60
  const x1 = 1280 + BLEED_X + 60

  // --- Fjärran raden: dis, små fönster, ingen animering --------------------------------
  {
    const kropp = new Graphics()
    const ljus = []
    const rutor = new Graphics()
    let x = x0
    while (x < x1) {
      const w = 40 + rnd() * 34
      const h = 70 + rnd() * 90
      const typ = ['sadel', 'platt', 'platt', 'mansard'][Math.floor(rnd() * 4)]
      hus(kropp, ljus, x, w, h, groundY, typ, rnd, MAN.x)
      const cols = Math.floor((w - 8) / 14)
      const rows = Math.floor((h - 14) / 20)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() < 0.32) rutor.rect(x + 7 + c * 14, groundY - h + 12 + r * 20, 6, 9)
        }
      }
      x += w + rnd() * 4
    }
    kropp.fill(0x221b56)
    rutor.fill({ color: 0xffd979, alpha: 0.55 })
    rot.addChild(kropp, rutor)
  }

  // --- Nära raden: mörkare, större, med fönster som tänds -------------------------------
  const fonster = []
  {
    const kropp = new Graphics()
    const ljus = []
    const mork = new Graphics() // släckta rutor
    const tander = new Container()
    const rad = (xa, xb, kap) => {
      let x = xa
      while (x < xb) {
        const w = 66 + rnd() * 44
        const h = 90 + rnd() * 90
        if (kap && x + w > xb) break // luckan i mitten hålls öppen
        const typ = ['sadel', 'sadel', 'platt', 'mansard', 'torn'][Math.floor(rnd() * 5)]
        const info = hus(kropp, ljus, x, w, h, groundY, typ, rnd, MAN.x)
        const cols = Math.floor((w - 12) / 28)
        const rows = Math.floor((h - 22) / 34)
        const ox = x + (w - cols * 28) / 2 + 7
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = ox + c * 28
            const wy = groundY - h + 16 + r * 34
            mork.roundRect(wx, wy, 13, 17, 3)
            if (wx < -80 || wx > 1360) continue // utanför all synlig yta: ingen tändbar ruta
            const g = new Graphics()
            g.roundRect(wx - 4, wy - 4, 21, 25, 6).fill({ color: 0xffb347, alpha: 0.16 })
            g.roundRect(wx, wy, 13, 17, 3).fill(0xffd979)
            g.alpha = 0
            tander.addChild(g)
            fonster.push({ g, mal: 0, a: 0, p: rnd() * 6.28 })
          }
        }
        if (info.torn) {
          const t = info.torn
          mork.roundRect(t.x + t.w / 2 - 5, t.y + 10, 10, 15, 5)
        }
        x += w + 2 + rnd() * 6
      }
    }
    rad(x0, 560, true) // en lucka i mitten: gatan dit raketen skjuts ligger öppen
    rad(745, x1)
    kropp.fill(0x100e2c)
    mork.fill(0x1c1f4c)
    const kant = new Graphics()
    for (const [ax, ay, bx, by] of ljus) kant.moveTo(ax, ay).lineTo(bx, by)
    kant.stroke({ width: 2, color: 0x8a95d0, alpha: 0.35, cap: 'round' })
    rot.addChild(kropp, kant, mork, tander)
  }

  // --- Gata + lyktor ----------------------------------------------------------------------
  const gataY = groundY - 4
  const gata = new Graphics()
  gata.rect(x0, gataY, x1 - x0, 240).fill(0x14122e)
  gata.rect(x0, gataY, x1 - x0, 6).fill(0x2f2c5e)
  for (let x = x0 + 20; x < x1; x += 96) gata.roundRect(x, gataY + 44, 44, 5, 2.5)
  gata.fill({ color: 0xffffff, alpha: 0.07 })
  rot.addChild(gata)

  const lampor = []
  for (const lx of [150, 520, 800, 1150]) {
    const stolpe = new Graphics()
    stolpe.roundRect(lx - 3, gataY - 112, 6, 118, 3).fill(0x2a2850)
    stolpe.roundRect(lx - 11, gataY - 128, 22, 20, 7).fill(0x39365f)
    const sken = new Graphics()
    // Tunna lager med små steg: skenet tonar ut i stället för att läsas som en skiva.
    for (let i = 0; i < 7; i++) sken.circle(lx, gataY - 118, 44 - i * 4.5).fill({ color: 0xffd979, alpha: 0.03 })
    sken.circle(lx, gataY - 118, 14).fill({ color: 0xfff1b0, alpha: 0.5 })
    sken.blendMode = 'add'
    rot.addChild(stolpe, sken)
    lampor.push({ g: sken, p: rnd() * 6.28 })
  }

  // --- Granar på gatan (som förut, nu framför staden) --------------------------------------
  const gran = new Graphics()
  for (const [tx, s] of [[880, 1], [962, 0.72]]) {
    gran.roundRect(tx - 7 * s, groundY - 26 * s, 14 * s, 40 * s, 5).fill(0x2a1f14)
    for (let i = 0; i < 3; i++) {
      const w = (62 - i * 14) * s
      const yy = groundY - 30 * s - i * 38 * s
      gran.moveTo(tx, yy - 70 * s).lineTo(tx + w, yy).lineTo(tx - w, yy).closePath().fill(0x16351f)
    }
  }
  rot.addChild(gran)

  const api = {
    rot,
    fonster,
    lampor,
    antal: fonster.length,
    // Tänd n släckta fönster, slumpvis spridda över staden.
    tand(n) {
      const slackta = fonster.filter((f) => f.mal === 0)
      for (let i = 0; i < n && slackta.length; i++) {
        const k = Math.floor(Math.random() * slackta.length)
        slackta.splice(k, 1)[0].mal = 1
      }
    },
    tandAlla() {
      for (const f of fonster) f.mal = 1
    },
    // Ny nivå: stan sover nästan — bara en liten andel fönster lyser.
    aterstall(andel) {
      for (const f of fonster) f.mal = 0
      this.tand(Math.round(fonster.length * andel))
    },
    // Ticker: fönstren tonar mot sitt mål (tänds fort, släcks sakta), lyktorna andas.
    uppdatera(T, dt) {
      for (const f of fonster) {
        if (f.g.destroyed) continue
        const k = f.mal > f.a ? 9 : 2.5
        f.a += (f.mal - f.a) * Math.min(1, dt * k)
        if (f.a < 0.004 && f.mal === 0) f.a = 0
        f.g.alpha = f.a * (0.88 + 0.12 * Math.sin(T * 0.9 + f.p))
      }
      for (const l of lampor) {
        if (l.g.destroyed) continue
        l.g.alpha = 0.85 + 0.15 * Math.sin(T * 1.3 + l.p)
      }
    },
  }
  return api
}
