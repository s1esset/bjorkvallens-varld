// Spelautomaten runt plinkobrädet i Studsa Ner (L2). Brädet var en vit tavla mot en rosa
// bokehbakgrund; nu är det själva spelplanen i en riktig spelautomat: lila skåp med
// tapetmönster, en skylt (marquee) med stjärnor där myntet hänger, en ram med blinkande
// glödlampor runt hela planen, mörka sidopelare och ett fönster runt mätaren.
//
// Ren dekor, ritas EN gång: platta fyllningar (utom skåpets lodräta toning som är cachad i
// lib/form.js) — noll texturbakningar per montering. De få rörliga delarna (två lamplager som
// blinkar växelvis, stjärnornas tindring) är gsap-tweens som samlas i `tweens` och dödas i
// `destroy()`; tweens på barn nås inte av killTweensOf(roten).
//
// Brädets egna mått, kropparna och fläkten är orörda — det här ligger BAKOM allt spelbart
// (`back`) resp. strax ovanpå brädet (`decor`, bara svaga färgklickar).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

const W = 1280
const H = 720
const BOARD = { x: 72, y: 140, w: 1136, h: 410, r: 28 }

const GULD = 0xffc93c
const LAMPOR = [0xffd35c, 0xff9ec4, 0x7be0ff]
const DECAL = [0xff8a3d, 0x5bbf6a, 0x4aa3df, 0xa78bfa, 0xff9ec4, 0xffd35c]

const rnd = (a, b) => a + Math.random() * (b - a)

function dim(hex, f) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f)
}

function stjarna(g, cx, cy, R, r, fill, stroke) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r : R
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  g.poly(pts).fill(fill)
  if (stroke) g.poly(pts).stroke({ width: 2.5, color: stroke, alpha: 0.9, join: 'round' })
}

// Lampornas lägen längs ramens mittlinje (samma bana som ramens stroke).
function lampLagen() {
  const pts = []
  for (let x = 100; x <= 1180; x += 45) { pts.push([x, 132]); pts.push([x, 555]) }
  for (let y = 172; y <= 520; y += 43) { pts.push([64, y]); pts.push([1216, y]) }
  return pts
}

export function buildAutomat() {
  const X0 = -BLEED_X
  const X1 = W + BLEED_X
  const tweens = []

  // ---------------- Bakgrund (bakom allt spelbart) ----------------
  const back = new Container()
  back.eventMode = 'none'
  back.interactiveChildren = false

  const body = new Graphics()
    .rect(X0, -BLEED_Y, X1 - X0, H + 2 * BLEED_Y)
    .fill(verticalFill(0x4b3b9c, 0x2b2362))
  back.addChild(body)

  // Tapetmönster i skåpet: små stjärnor och prickar i en ljusare lila.
  const tapet = new Graphics()
  for (let i = 0; i < 70; i++) {
    const x = rnd(X0, X1)
    const y = rnd(-BLEED_Y, H + BLEED_Y)
    if (Math.random() < 0.4) stjarna(tapet, x, y, 7, 3, { color: 0x9a8be8, alpha: 0.28 })
    else tapet.circle(x, y, rnd(2.5, 4.5)).fill({ color: 0x9a8be8, alpha: 0.26 })
  }
  back.addChild(tapet)

  // Mörka sidopelare med nitar, och ett fönster runt mätaren.
  const pelare = new Graphics()
  pelare.rect(X0, 122, 62 - X0, 438).fill(0x211b52)
  pelare.rect(1218, 122, X1 - 1218, 438).fill(0x211b52)
  pelare.rect(60, 122, 3, 438).fill({ color: 0x6a5ac8, alpha: 0.6 })
  pelare.rect(1217, 122, 3, 438).fill({ color: 0x6a5ac8, alpha: 0.6 })
  for (const [nx, ny] of [[30, 144], [30, 536], [1250, 144], [1250, 536]]) {
    pelare.circle(nx, ny, 6).fill(0x8f80e0)
    pelare.circle(nx - 1.5, ny - 1.5, 2).fill({ color: 0xffffff, alpha: 0.6 })
  }
  pelare.roundRect(5, 168, 58, 212, 22).fill({ color: 0x120e30, alpha: 0.9 }).stroke({ width: 3, color: 0x6a5ac8, alpha: 0.8 })
  back.addChild(pelare)

  // Skylten: mörk skiva med guldkant och stjärnor i ändarna. Myntet hänger på den.
  // Skylten ryms MELLAN skalets knappar (hem 24–116, ljud 1164–1256), inte bakom dem.
  const skylt = new Graphics()
  skylt.roundRect(136, 8, 1008, 108, 30).fill(0x2a2268).stroke({ width: 5, color: GULD })
  skylt.roundRect(148, 20, 984, 84, 22).stroke({ width: 2, color: 0x6a5ac8, alpha: 0.9 })
  back.addChild(skylt)
  const stjarnor = []
  for (const sx of [176, 1104]) {
    const c = new Container()
    c.position.set(sx, 62)
    const sg = new Graphics()
    stjarna(sg, 0, 0, 24, 11, GULD, 0xffffff)
    sg.circle(-6, -8, 3.2).fill({ color: 0xffffff, alpha: 0.85 })
    c.addChild(sg)
    back.addChild(c)
    stjarnor.push(c)
    tweens.push(gsap.to(c.scale, { x: 1.18, y: 1.18, duration: 1.1 + (sx > 600 ? 0.3 : 0), yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }

  // Ett ogenomskinligt underlag under brädet, så den lätt genomskinliga tavlan lutar åt
  // gräddvitt och inte åt skåpets lila.
  const underlag = new Graphics().roundRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h, BOARD.r).fill(0xfff8ea)
  back.addChild(underlag)

  // Ramen runt planen (stroke, inte fylld ring — underlaget ska inte täckas) + guldlist.
  const ram = new Graphics()
  ram.roundRect(64, 132, 1152, 426, 36).stroke({ width: 16, color: 0x1a1445 })
  ram.roundRect(57, 125, 1166, 440, 42).stroke({ width: 2.5, color: GULD, alpha: 0.75 })
  back.addChild(ram)

  // Glödlampor på ramen: släckt grundlampa + två tända lager (jämna/udda) som blinkar växelvis.
  const lagen = lampLagen()
  const av = new Graphics()
  const tandA = new Container()
  const tandB = new Container()
  lagen.forEach(([lx, ly], i) => {
    const col = LAMPOR[i % LAMPOR.length]
    av.circle(lx, ly, 4.6).fill(dim(col, 0.5))
    const t = new Graphics()
    t.circle(lx, ly, 10).fill({ color: col, alpha: 0.26 })
    t.circle(lx, ly, 4.8).fill(col)
    t.circle(lx - 1.4, ly - 1.4, 1.5).fill({ color: 0xffffff, alpha: 0.9 })
    ;(i % 2 ? tandB : tandA).addChild(t)
  })
  tandB.alpha = 0.12
  back.addChild(av, tandA, tandB)
  tweens.push(
    gsap.to(tandA, { alpha: 0.12, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(tandB, { alpha: 1, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
  )

  // ---------------- Dekor på själva brädet (svaga färgklickar) ----------------
  // Brädet var en tom vit yta. Stora, mjuka klickar i spelets egna färger — fyllda former,
  // inga ringar — ger plankan ett mönster utan att pinnar och mynt tappar kontrast.
  const decor = new Container()
  decor.eventMode = 'none'
  decor.interactiveChildren = false
  const dg = new Graphics()
  for (let i = 0; i < 11; i++) {
    const x = BOARD.x + 70 + ((i + Math.random() * 0.6) / 11) * (BOARD.w - 140)
    const y = rnd(BOARD.y + 50, BOARD.y + BOARD.h - 50)
    const col = DECAL[(Math.random() * DECAL.length) | 0]
    const R = rnd(26, 44)
    if (i % 3 === 0) stjarna(dg, x, y, R, R * 0.46, { color: col, alpha: 0.13 })
    else if (i % 3 === 1) dg.circle(x, y, R * 0.8).fill({ color: col, alpha: 0.11 })
    else {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        dg.circle(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, R * 0.42).fill({ color: col, alpha: 0.12 })
      }
    }
  }
  decor.addChild(dg)

  return {
    back,
    decor,
    destroy() {
      for (const t of tweens) t.kill()
      tweens.length = 0
    },
  }
}
