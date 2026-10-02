// Labbet runt sandlådan (FYSIKPLAN L2): en egen plats i flera djupled i stället för en
// platt sandfärgad mall. Bakom allt står en grönblå vägg med panel och en lampas sken;
// framför den en trädbänk som lådan står på — verktygen står på bänkskivan med sina
// skuggor — och i kanterna hyllor, en termometer, böcker och en bubblande kolv.
//
// ALLT är dekor: eventMode 'none', inga träffytor, inget som rör automaten, cellerna eller
// verktygsraden. Inget högt bakom skalets knappar uppe till vänster (x < 200, y < 160) eller
// uppe till höger (x > 1140, y < 140): där är väggen bara vägg.
//
// Noll texturbakningar: bara Graphics och cachade lodräta gradienter (`verticalFill`).
// Det som rör sig (kolvens bubblor, kvicksilvret, växten) går via gsap och städas av
// `stopp()`, som spelets destroy() anropar FÖRE rivningen av roten.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill, groundFill } from '../../lib/form.js'
import { liv } from '../../lib/feedback.js'

// Marginal så bilden räcker även på en bred telefon (ctx.view sticker ut ±240 / ±160).
const X0 = -280
const BREDD = 1840
const Y0 = -180

function stat(g) {
  g.eventMode = 'none'
  return g
}

// Plaster med fasta fläckar — ur en enkel hash, aldrig Math.random: väggen ska se likadan
// ut varje gång.
function vagg(c, mittX, ladaY0, ladaY1, ladaX0, ladaX1) {
  const v = stat(new Graphics())
  v.rect(X0, Y0, BREDD, 1000).fill(verticalFill(0x8ac6bb, 0x5c9b94))
  c.addChild(v)

  const fl = stat(new Graphics())
  for (let k = 0; k < 60; k++) {
    const px = X0 + ((k * 389) % BREDD)
    const py = Y0 + ((k * 211) % 560)
    const r = 10 + ((k * 13) % 5) * 7
    fl.ellipse(px, py, r * 1.4, r).fill({ color: k % 2 ? 0xffffff : 0x3f7c76, alpha: 0.045 })
  }
  c.addChild(fl)

  // Lampans sken: koncentriska ellipser uppifrån mitten, inga radiella gradienter.
  const sken = stat(new Graphics())
  for (let i = 0; i < 6; i++) {
    sken.ellipse(mittX, 90, 760 - i * 105, 330 - i * 44).fill({ color: 0xfff2c4, alpha: 0.035 })
  }
  c.addChild(sken)

  // Panelen: träpanel på nedre väggen med lister, så väggen har en nedre och en övre del.
  const pan = stat(new Graphics())
  pan.rect(X0, 410, BREDD, 160).fill(verticalFill(0x4f8c86, 0x3d726d))
  for (let x = X0 + 20; x < X0 + BREDD; x += 74) {
    pan.moveTo(x, 424).lineTo(x, 556).stroke({ width: 2, color: 0x2f5c58, alpha: 0.35 })
    pan.moveTo(x + 2, 424).lineTo(x + 2, 556).stroke({ width: 1.5, color: 0xffffff, alpha: 0.1 })
  }
  c.addChild(pan)
  const list = stat(new Graphics())
  list.rect(X0, 400, BREDD, 12).fill(0xc79063)
  list.rect(X0, 400, BREDD, 3).fill({ color: 0xffe0b8, alpha: 0.7 })
  list.rect(X0, 412, BREDD, 5).fill({ color: 0x000000, alpha: 0.2 })
  c.addChild(list)

  // Lådans skugga på väggen — ett mjukt dubbelt lager, förskjutet nedåt: det är den som
  // lyfter lådan FRÅN väggen.
  const sk = stat(new Graphics())
  sk.roundRect(ladaX0 - 4, ladaY0 + 6, ladaX1 - ladaX0 + 8 + 14, ladaY1 - ladaY0 + 18, 26).fill({ color: 0x000000, alpha: 0.1 })
  sk.roundRect(ladaX0 + 8, ladaY0 + 14, ladaX1 - ladaX0 - 2, ladaY1 - ladaY0 + 2, 20).fill({ color: 0x000000, alpha: 0.14 })
  c.addChild(sk)
}

function banken(c, mittX) {
  const top = stat(new Graphics())
  top.rect(X0, 556, BREDD, 154).fill(groundFill(0xdcae74, { light: 0.1, dark: 0.2 }))
  // Plankfogar i svagt perspektiv: glesare bakåt, tätare framåt.
  for (const y of [592, 630, 670]) {
    top.moveTo(X0, y).lineTo(X0 + BREDD, y).stroke({ width: 2, color: 0x9c6b3c, alpha: 0.32 })
  }
  for (let r = 0; r < 4; r++) {
    const y0 = [556, 592, 630, 670][r]
    const y1 = [592, 630, 670, 710][r]
    for (let x = X0 + 40 + ((r * 133) % 200); x < X0 + BREDD; x += 330 + r * 40) {
      top.moveTo(x, y0).lineTo(x, y1).stroke({ width: 2, color: 0x9c6b3c, alpha: 0.26 })
    }
  }
  // Ådring.
  for (let k = 0; k < 18; k++) {
    const x = X0 + 30 + ((k * 211) % (BREDD - 120))
    const y = 566 + ((k * 53) % 130)
    top.moveTo(x, y).quadraticCurveTo(x + 40, y - 3, x + 90, y + 1).stroke({ width: 2, color: 0xb98a55, alpha: 0.3 })
  }
  c.addChild(top)
  // Lådans kontaktskugga på skivan.
  const kon = stat(new Graphics())
  kon.ellipse(mittX, 566, 560, 15).fill({ color: 0x3a2412, alpha: 0.28 })
  kon.ellipse(mittX, 563, 510, 8).fill({ color: 0x3a2412, alpha: 0.2 })
  c.addChild(kon)
  // Främre kanten: tjock planka med ljus överkant.
  const kant = stat(new Graphics())
  kant.rect(X0, 706, BREDD, 60).fill(verticalFill(0x9a6840, 0x6f4a2e))
  kant.rect(X0, 706, BREDD, 4).fill({ color: 0xffe0b8, alpha: 0.75 })
  kant.rect(X0, 700, BREDD, 8).fill({ color: 0x000000, alpha: 0.08 })
  c.addChild(kant)
}

function hylla(c, x0, x1, y) {
  const g = stat(new Graphics())
  // Konsoller under plankan.
  for (const bx of [x0 + 30, x1 - 30]) {
    g.moveTo(bx - 8, y + 12).lineTo(bx + 8, y + 12).lineTo(bx + 8, y + 40).closePath().fill(0x7c5232)
  }
  g.roundRect(x0, y, x1 - x0, 14, 4).fill(0xc79063)
  g.roundRect(x0, y, x1 - x0, 4, 3).fill({ color: 0xffe0b8, alpha: 0.7 })
  g.roundRect(x0 + 6, y + 14, x1 - x0 - 12, 6, 3).fill({ color: 0x000000, alpha: 0.16 })
  c.addChild(g)
}

// Konisk kolv (Erlenmeyer) som ett riktigt glasföremål: skugga, glas, vätska, blänk, kork.
function kolv(farg, vatskeFarg, hojd = 1) {
  const c = new Container()
  c.eventMode = 'none'
  const s = hojd
  const g = stat(new Graphics())
  g.ellipse(0, 2, 50 * s, 9 * s).fill({ color: 0x000000, alpha: 0.2 })
  const kropp = (gg) => {
    gg.moveTo(-14 * s, -98 * s).lineTo(-14 * s, -64 * s).lineTo(-44 * s, -6 * s)
    gg.quadraticCurveTo(-48 * s, 0, -40 * s, 0).lineTo(40 * s, 0)
    gg.quadraticCurveTo(48 * s, 0, 44 * s, -6 * s).lineTo(14 * s, -64 * s).lineTo(14 * s, -98 * s).closePath()
  }
  kropp(g)
  g.fill({ color: farg, alpha: 0.28 })
  // Vätskan upp till ~40 % av höjden.
  const w40 = 14 + (64 - 40) / 58 * 30
  g.moveTo(-w40 * s, -40 * s).lineTo(w40 * s, -40 * s).lineTo(44 * s, -6 * s)
  g.quadraticCurveTo(48 * s, 0, 40 * s, 0).lineTo(-40 * s, 0).quadraticCurveTo(-48 * s, 0, -44 * s, -6 * s).closePath()
  g.fill({ color: vatskeFarg, alpha: 0.92 })
  g.ellipse(0, -40 * s, w40 * s, 4 * s).fill({ color: 0xffffff, alpha: 0.35 })
  kropp(g)
  g.stroke({ width: 3, color: 0xffffff, alpha: 0.75 })
  g.roundRect(-19 * s, -103 * s, 38 * s, 8 * s, 3).fill(0xe8f6f4).stroke({ width: 2, color: 0xffffff, alpha: 0.8 })
  g.moveTo(-9 * s, -90 * s).lineTo(-9 * s, -66 * s).stroke({ width: 4, color: 0xffffff, alpha: 0.5, cap: 'round' })
  g.moveTo(-30 * s, -20 * s).lineTo(-24 * s, -32 * s).stroke({ width: 4, color: 0xffffff, alpha: 0.4, cap: 'round' })
  c.addChild(g)
  return { c, vatskeY: -36 * s, bredd: 20 * s }
}

function burk(farg, hojd, bredd) {
  const c = new Container()
  c.eventMode = 'none'
  const g = stat(new Graphics())
  g.ellipse(0, 2, bredd * 0.62, 7).fill({ color: 0x000000, alpha: 0.2 })
  g.roundRect(-bredd / 2, -hojd, bredd, hojd, 10).fill({ color: 0xffffff, alpha: 0.22 })
  g.roundRect(-bredd / 2 + 4, -hojd * 0.62, bredd - 8, hojd * 0.62 - 3, 8).fill({ color: farg, alpha: 0.9 })
  g.roundRect(-bredd / 2, -hojd, bredd, hojd, 10).stroke({ width: 3, color: 0xffffff, alpha: 0.75 })
  g.roundRect(-bredd / 2 - 3, -hojd - 8, bredd + 6, 11, 4).fill(0xc79063)
  g.moveTo(-bredd / 2 + 8, -hojd * 0.9).lineTo(-bredd / 2 + 8, -hojd * 0.4).stroke({ width: 4, color: 0xffffff, alpha: 0.5, cap: 'round' })
  c.addChild(g)
  return c
}

function bok(g, x, y, w, h, farg) {
  g.roundRect(x, y - h, w, h, 3).fill(farg)
  g.roundRect(x, y - h, 6, h, 3).fill({ color: 0x000000, alpha: 0.18 })
  g.rect(x + 8, y - h + 8, w - 16, 4).fill({ color: 0xffffff, alpha: 0.55 })
  g.rect(x + 8, y - 14, w - 16, 3).fill({ color: 0xffffff, alpha: 0.35 })
}

// Böcker liggande i en trave, med sidkanter.
function bokTrave(x, y) {
  const c = new Container()
  c.position.set(x, y)
  c.eventMode = 'none'
  const g = stat(new Graphics())
  g.ellipse(0, 2, 70, 9).fill({ color: 0x000000, alpha: 0.22 })
  const rad = [[112, 20, 0xe85d5d, -4], [98, 18, 0x4aa3df, 6], [84, 18, 0xffd35c, -2]]
  let yy = 0
  for (const [w, h, f, dx] of rad) {
    g.roundRect(-w / 2 + dx, yy - h, w, h, 4).fill(f)
    g.rect(-w / 2 + dx + 8, yy - h + 4, w - 12, h - 8).fill({ color: 0xfff4dc, alpha: 0.9 })
    g.roundRect(-w / 2 + dx, yy - h, w, 5, 3).fill({ color: 0xffffff, alpha: 0.28 })
    yy -= h
  }
  c.addChild(g)
  return { c, topY: yy }
}

function planta() {
  const c = new Container()
  c.eventMode = 'none'
  const g = stat(new Graphics())
  g.moveTo(0, 0).quadraticCurveTo(-3, -16, 0, -30).stroke({ width: 4, color: 0x4f9e56, cap: 'round' })
  g.moveTo(0, -12).quadraticCurveTo(-16, -14, -20, -28).quadraticCurveTo(-6, -26, 0, -12).closePath().fill(0x5bbf6a)
  g.moveTo(0, -20).quadraticCurveTo(14, -24, 20, -40).quadraticCurveTo(6, -38, 0, -20).closePath().fill(0x6fd07a)
  g.circle(0, -32, 6).fill(0x8fe09a)
  c.addChild(g)
  return c
}

function kruka() {
  const g = stat(new Graphics())
  g.moveTo(-18, 0).lineTo(18, 0).lineTo(14, 22).lineTo(-14, 22).closePath().fill(0xd2683a)
  g.roundRect(-21, -6, 42, 9, 3).fill(0xe27d4b)
  g.rect(-14, 6, 28, 3).fill({ color: 0x000000, alpha: 0.12 })
  return g
}

function termometer(x, y) {
  const c = new Container()
  c.position.set(x, y)
  c.eventMode = 'none'
  const g = stat(new Graphics())
  g.roundRect(-20, -6, 40, 214, 20).fill({ color: 0x000000, alpha: 0.16 })
  g.roundRect(-20, -12, 40, 214, 20).fill(0xfff4dc).stroke({ width: 3, color: 0xc79063 })
  g.roundRect(-6, 10, 12, 140, 6).fill(0xdfeae8).stroke({ width: 2, color: 0xb9c9c6 })
  for (let i = 0; i < 8; i++) {
    g.moveTo(10, 20 + i * 17).lineTo(i % 2 ? 16 : 20, 20 + i * 17).stroke({ width: 2, color: 0x8a6a4a, alpha: 0.7 })
  }
  g.circle(0, 162, 17).fill(0xe8412f).stroke({ width: 3, color: 0xc79063 })
  g.circle(-5, 157, 5).fill({ color: 0xffffff, alpha: 0.5 })
  c.addChild(g)
  // Kvicksilvret står i sitt eget barn med ursprunget i foten: skalan tweenar höjden.
  const kv = stat(new Graphics())
  kv.roundRect(-3.5, -112, 7, 112, 3.5).fill(0xe8412f)
  kv.position.set(0, 156)
  kv.scale.y = 0.62
  c.addChild(kv)
  return { c, kv }
}

export function byggLabb({ mittX, ladaX0, ladaY0, ladaX1, ladaY1 }) {
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false
  const tweens = []
  const livNoder = []

  vagg(root, mittX, ladaY0, ladaY1, ladaX0, ladaX1)

  // Vänster: hylla med böcker och en burk, termometer på panelväggen under.
  hylla(root, -60, 154, 270)
  const bokg = stat(new Graphics())
  bok(bokg, 18, 270, 22, 70, 0xe85d5d)
  bok(bokg, 42, 270, 18, 58, 0x4aa3df)
  bok(bokg, 62, 270, 24, 78, 0xffd35c)
  root.addChild(bokg)
  const burkV = burk(0xa66bd6, 56, 40)
  burkV.position.set(116, 270)
  root.addChild(burkV)
  const term = termometer(80, 318)
  root.addChild(term.c)
  tweens.push(gsap.to(term.kv.scale, { y: 0.84, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }))

  // Höger: hylla med tre kolvar/burkar i elementens färger.
  hylla(root, 1106, 1340, 270)
  const k1 = kolv(0xffffff, 0xff7a4a, 0.62)
  k1.c.position.set(1150, 270)
  const k2 = burk(0x7fd0f0, 70, 38)
  k2.position.set(1204, 270)
  const k3 = burk(0x7ad88a, 50, 36)
  k3.position.set(1252, 270)
  root.addChild(k1.c, k2, k3)

  banken(root, mittX)

  // Bänkens föremål: böcker med en liten planta (vänster) och en bubblande kolv (höger).
  // Mindre än verktygen och ut mot kanten — annars läses de som en åttonde och nionde knapp.
  const trave = bokTrave(46, 710)
  trave.c.scale.set(0.7)
  root.addChild(trave.c)
  const kr = kruka()
  kr.position.set(8, trave.topY - 22)
  trave.c.addChild(kr)
  const pl = planta()
  pl.position.set(8, trave.topY - 22)
  trave.c.addChild(pl)
  liv(pl, { bob: 0, sway: 0.07, duration: 3.2 })
  livNoder.push(pl)

  const stor = kolv(0xffffff, 0x6fd8c8, 1)
  stor.c.position.set(1226, 710)
  stor.c.scale.set(0.7)
  root.addChild(stor.c)
  // Bubblor stiger i vätskan och försvinner vid ytan.
  for (let i = 0; i < 4; i++) {
    const b = stat(new Graphics())
    const r = 2.6 + (i % 2) * 1.6
    b.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.85 })
    b.position.set(-12 + i * 8, -6)
    stor.c.addChild(b)
    tweens.push(gsap.fromTo(b, { y: -6, alpha: 0.9 }, {
      y: -34 - (i % 3) * 3, alpha: 0, duration: 1.5 + i * 0.35, ease: 'sine.out', repeat: -1, delay: i * 0.55,
    }))
  }

  return {
    root,
    stopp() {
      for (const t of tweens) t.kill()
      tweens.length = 0
      for (const n of livNoder) {
        if (n && !n.destroyed) n._fxLiv?.kill()
      }
      livNoder.length = 0
    },
  }
}
