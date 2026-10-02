// Tårta i Ansiktet — platsen: ett cirkustält med manege, läktare och strålkastare.
//
// Förut var bakgrunden en krämfärgad platta mellan två ridåer med ett plankgolv — en
// "scen" utan något runtom. Nu är det ett stortält (L2): randig tältduk som löper ihop mot
// toppen, tre läktarrader med publik som guppar, en manege med sandgolv, rep-kant och
// ljuspölar, och två strålkastare som hänger från kappan och sveper över arenan.
// Djupet kommer av ordningen: duk → läktare → manegekant → sand → ljusstralar, där varje
// led längre bak är mörkare och mer dämpat.
//
// Allt är dekor (`eventMode 'none'`) och ligger BAKOM clownen, tårtan och svampen. Rummet
// byggs om varje runda med en ny palett. Allt som rör sig går på tweens som `riv()` dödar
// innan noderna förstörs, så ett rundbyte aldrig lämnar något som skriver på en död nod.
//
//   const c = byggCirkus(pal)   → { bak, fram, jubla(), finale(), blixt(), riv() }
//   `bak` läggs UNDER publiken (Bobo, Zacke), `fram` OVANPÅ dem (podierna som döljer benen).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { verticalFill, verticalFillAlpha, topLightFill, cylinderFill, sphereFill } from '../../lib/form.js'
import { shade, COLORS } from '../../lib/theme.js'
import { liv } from '../../lib/feedback.js'

const W = 1280
const KANT_Y = 546 // manegekantens överkant (rep-listen); sanden börjar vid KANT_Y + 40
const SAND_Y = KANT_Y + 40
const GULD = 0xe8c05a

// Tältets paletter: två duktoner, läktarens trä, podiernas färg.
export const PALETTER = [
  { id: 'vin', tak1: 0x9c2f47, tak2: 0x86283e, bank: 0x6b2a52, pall: 0xe05563 },
  { id: 'marin', tak1: 0x2f4a8f, tak2: 0x263b78, bank: 0x3a3070, pall: 0x4aa3df },
  { id: 'skog', tak1: 0x2f8f78, tak2: 0x267562, bank: 0x4a3070, pall: 0xffb347 },
]

const HUD = [0xf6b78a, 0xd99a6c, 0x9b6a45, 0xffd9b8]
const TROJOR = [0xff8fa3, 0xffd35c, 0x7fd0ff, 0x8ee0a0, 0xc39bff, 0xff9a6b]

function g0() {
  const g = new Graphics()
  g.eventMode = 'none'
  return g
}
function box() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

export function byggCirkus(pal) {
  const tw = [] // eviga tweens
  const anim = [] // allt som kortare tweens (jubel, sväng) kan ligga på
  const bak = box()
  const fram = box()
  const X0 = -BLEED_X
  const BW = W + 2 * BLEED_X

  // ---- tältduk: kilar som löper ihop mot en topp långt ovanför bild ----
  const duk = g0()
  const topX = 640
  const topY = -420
  let i = 0
  for (let x = -BLEED_X - 500; x < W + BLEED_X + 500; x += 100, i++) {
    duk.poly([topX, topY, x, SAND_Y, x + 100, SAND_Y]).fill(i % 2 ? pal.tak1 : pal.tak2)
  }
  // Mörkare mot taket, ljusare mot arenan där strålkastarna lyser.
  duk.rect(X0, -BLEED_Y, BW, 330 + BLEED_Y).fill(verticalFillAlpha(0x000000, 0x000000, 0.42, 0))
  duk.rect(X0, 330, BW, SAND_Y - 330).fill(verticalFillAlpha(0xffd9a0, 0xffd9a0, 0, 0.2))
  bak.addChild(duk)

  // ---- läktare: tre rader, bakre raderna mörkare och längre bort ----
  const rader = []
  for (let r = 0; r < 3; r++) {
    const yT = 372 + r * 58
    const mork = [0.4, 0.26, 0.12][r]
    const front = g0()
    front.rect(X0, yT + 30, BW, 60).fill(topLightFill(shade(pal.bank, mork * 0.6), { highlight: 0.12, dark: 0.25 }))
    front.rect(X0, yT + 30, BW, 5).fill({ color: GULD, alpha: 0.55 - r * 0.1 })
    bak.addChild(front)

    const rad = box() // yttre: jublet hoppar den
    const inre = box() // inre: vilo-guppet (liv äger y)
    const pg = g0()
    let x = X0 + 14 + Math.random() * 30
    while (x < X0 + BW) {
      const skjorta = shade(TROJOR[(Math.random() * TROJOR.length) | 0], mork)
      const hud = shade(HUD[(Math.random() * HUD.length) | 0], mork)
      const s = 0.9 + Math.random() * 0.2
      pg.roundRect(x - 15 * s, yT + 6, 30 * s, 32, 12 * s).fill(skjorta)
      pg.circle(x, yT - 6, 12.5 * s).fill(hud)
      // En del har hatt: en liten kon i en annan färg.
      if (Math.random() < 0.28) pg.poly([x - 9 * s, yT - 14, x + 9 * s, yT - 14, x, yT - 34]).fill(shade(TROJOR[(Math.random() * TROJOR.length) | 0], mork))
      x += 40 + Math.random() * 14
    }
    inre.addChild(pg)
    rad.addChild(inre)
    bak.addChild(rad)
    const l = liv(inre, { bob: 2.2 + r * 0.4, sway: 0, duration: 1.5 + r * 0.35 })
    if (l) tw.push(l)
    rader.push(rad)
    anim.push(rad)
  }

  // ---- ljusskenet bakom clownen (rampljuset) ----
  const sken = g0()
  sken.ellipse(640, 300, 270, 250).fill({ color: 0xffe3a0, alpha: 0.1 })
  sken.ellipse(640, 300, 190, 180).fill({ color: 0xfff1c8, alpha: 0.09 })
  bak.addChild(sken)

  // ---- manegekant (rep-list med fält) ----
  const kant = g0()
  for (let x = Math.floor(X0 / 80) * 80; x < X0 + BW; x += 80) {
    const fargfalt = Math.round(x / 80) % 2 === 0 ? pal.pall : 0xfff4e0
    kant.roundRect(x + 2, KANT_Y + 8, 76, 34, 6).fill(topLightFill(fargfalt, { highlight: 0.18, dark: 0.22 }))
  }
  kant.rect(X0, KANT_Y, BW, 10).fill(topLightFill(GULD, { highlight: 0.3, dark: 0.2 }))
  bak.addChild(kant)

  // ---- sand: raka ringar, korn, ljuspölar ----
  const sand = g0()
  sand.rect(X0, SAND_Y, BW, 720 - SAND_Y + BLEED_Y).fill(verticalFill(0xedd4a6, 0xc9a56c))
  sand.rect(X0, SAND_Y, BW, 12).fill({ color: COLORS.shadow, alpha: 0.2 }) // kantens skugga
  for (const ry of [205, 160, 118]) {
    sand.ellipse(640, 800, ry * 3.4, ry).stroke({ width: 3, color: 0x9a7240, alpha: 0.16 })
  }
  for (let k = 0; k < 90; k++) {
    const px = X0 + ((k * 197) % BW)
    const py = SAND_Y + 14 + ((k * 61) % (720 - SAND_Y + BLEED_Y - 20))
    sand.circle(px, py, 1.6 + (k % 3) * 0.6).fill({ color: 0x9a7240, alpha: 0.22 })
  }
  // Ljuspölarna där strålkastarna landar — en större och en mindre, båda mot clownens plats.
  sand.ellipse(640, 640, 420, 66).fill({ color: 0xfff1b8, alpha: 0.16 })
  sand.ellipse(640, 640, 270, 42).fill({ color: 0xfff6d0, alpha: 0.16 })
  bak.addChild(sand)

  // ---- strålkastare: hänger i kappan, stralarna korsar arenan ----
  const stralar = box()
  const lampor = []
  for (const [lx, tx] of [[330, 720], [950, 560]]) {
    const ly = 106
    const ty = 600
    const vinkel = Math.atan2(-(tx - lx), ty - ly)
    const L = Math.hypot(tx - lx, ty - ly)
    const pivot = box() // bär grundvinkeln; jublet svänger den
    pivot.position.set(lx, ly)
    pivot.rotation = vinkel
    const sving = box() // bär det eviga svajet
    pivot.addChild(sving)
    const strale = g0()
    for (const [w, a] of [[150, 0.045], [105, 0.05], [62, 0.06]]) {
      strale.poly([0, 34, -w, L, w, L]).fill({ color: 0xfff3c4, alpha: a })
    }
    sving.addChild(strale)
    const lamp = g0()
    lamp.rect(-3, -22, 6, 26).fill(0x4a4a5c) // fäste
    lamp.roundRect(-26, 0, 52, 38, 12).fill(topLightFill(0x5a5a70, { highlight: 0.3, dark: 0.3 })).stroke({ width: 3, color: 0x34344a })
    lamp.ellipse(0, 38, 22, 8).fill(0xfff3c4).stroke({ width: 2, color: 0xd9c37a })
    sving.addChild(lamp)
    stralar.addChild(pivot)
    lampor.push({ pivot, sving, vinkel })
    anim.push(pivot, sving)
    tw.push(gsap.to(sving, { rotation: 0.05 * (lx < 640 ? 1 : -1), duration: 3.1 + lx / 1000, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
  }
  stralar.alpha = 0.8
  anim.push(stralar)
  bak.addChild(stralar)

  // ---- podier längst fram (döljer Bobos haka och Zackes ben) ----
  for (const px of [320, 960]) {
    const pod = new Container()
    pod.eventMode = 'none'
    pod.position.set(px, 0)
    const p = g0()
    p.ellipse(0, 692, 98, 12).fill({ color: COLORS.shadow, alpha: 0.16 })
    p.roundRect(-76, 616, 152, 76, 10).fill(cylinderFill(pal.pall, { axis: 'y', dark: 0.24, highlight: 0.2 })).stroke({ width: 3, color: shade(pal.pall, 0.35) })
    p.rect(-76, 636, 152, 7).fill({ color: GULD, alpha: 0.9 })
    p.rect(-76, 664, 152, 7).fill({ color: GULD, alpha: 0.9 })
    p.roundRect(-84, 606, 168, 18, 8).fill(topLightFill(GULD, { highlight: 0.3, dark: 0.2 })).stroke({ width: 3, color: 0xb88a2a })
    p.circle(0, 654, 6).fill(sphereFill(GULD)) // knopp
    pod.addChild(p)
    fram.addChild(pod)
  }

  const lekMed = (mal, v) => {
    gsap.to(mal, v)
  }

  return {
    bak,
    fram,
    // Publiken hoppar rad för rad när tårtan landar, och stralarna blixtrar till.
    jubla() {
      rader.forEach((rad, r) => {
        if (rad.destroyed) return
        lekMed(rad, { y: -11, duration: 0.12, delay: r * 0.05, yoyo: true, repeat: 3, ease: 'power2.out', overwrite: 'auto', onComplete: () => { if (!rad.destroyed) rad.y = 0 } })
      })
      this.blixt()
    },
    blixt() {
      if (stralar.destroyed) return
      lekMed(stralar, { alpha: 1, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto', onComplete: () => { if (!stralar.destroyed) stralar.alpha = 0.8 } })
    },
    // Rundans slut: strålkastarna sveper isär och tillbaka, publiken hoppar högre.
    finale() {
      this.jubla()
      for (const [n, l] of lampor.entries()) {
        if (l.pivot.destroyed) continue
        const dir = n === 0 ? -1 : 1
        lekMed(l.pivot, { rotation: l.vinkel + dir * 0.32, duration: 0.45, yoyo: true, repeat: 3, ease: 'sine.inOut', overwrite: 'auto', onComplete: () => { if (!l.pivot.destroyed) l.pivot.rotation = l.vinkel } })
      }
    },
    riv() {
      for (const t of tw) t?.kill()
      tw.length = 0
      gsap.killTweensOf(anim.filter((a) => !a.destroyed))
      if (!bak.destroyed) bak.destroy({ children: true })
      if (!fram.destroyed) fram.destroy({ children: true })
    },
  }
}
