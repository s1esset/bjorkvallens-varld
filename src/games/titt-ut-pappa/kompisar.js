// De roliga sakerna i titt-ut-leken: det barnet hittar när det INTE är pappa bakom
// gömstället. Var sak är ett FRISTÅENDE föremål med egen silhuett (P0 ASSETS) — ingen
// emoji i en ruta — med eget liv i vila, en EGEN reaktion i samma sekund den hittas,
// ett eget ljud och ett eget jubel i finalen.
//
// Kontrakt utåt (index.js är skriven mot exakt detta):
//   KOMPISAR              lista med de sju nycklarna
//   makeKompis(key)  ->   { key, view, ljud:{klipp,ton}, reagera, jubla, liv, destroy }
//
// Exit-säkerhet: filen startar bara tweens som antingen (a) ligger i `levande` och dödas
// av destroy(), eller (b) vaktas av en onUpdate som dödar sig själv om noden är förstörd.
// destroy() går dessutom igenom HELA nodträdet och dödar tweens per nod — `killTweensOf`
// på roten når aldrig svansar, tår och stjärtar en nivå in.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { drawIcon } from '../../lib/artikoner.js'
import { topLightFill, sphereFill, rimLight } from '../../lib/form.js'
import { COLORS, shade } from '../../lib/theme.js'
import { liv as fbLiv, squash } from '../../lib/feedback.js'

export const KOMPISAR = ['strumpa', 'katt', 'anka', 'ballong', 'tetra', 'nalle', 'boll']

// --- små hjälpare -----------------------------------------------------------

// En behållare som roterar kring en vald punkt utan att flytta sig — för allt som ska
// tippa kring sin fot (nallen som välter) eller vagga kring sin botten (tetran).
function pivotNod(x, y) {
  const c = new Container()
  c.pivot.set(x, y)
  c.position.set(x, y)
  return c
}

// Samlar varje nod i trädet — destroy() måste döda tweens på ALLA, inte bara roten.
function samlaNoder(nod, ut = []) {
  if (!nod) return ut
  ut.push(nod)
  const barn = nod.children || []
  for (let i = 0; i < barn.length; i++) samlaNoder(barn[i], ut)
  return ut
}

// --- kompisarnas byggare ----------------------------------------------------
// Var byggare ritar sin sak i `v.krop`, centrerar den, och returnerar sitt ljud, sin
// skugga, sin vilorörelse och sina två egna rörelser (reagera + jubla).

// 1) STRUMPA — en ensam yllestrumpa med rand och luddig mudd. Foten är en EGEN nod med
// vridpunkt i vristen, så tån kan vinka på riktigt.
function byggStrumpa(v) {
  const { krop, tid } = v
  const ULL = 0x4aa3df
  const MORK = shade(ULL, 0.32)
  const KANT = 0xfff3d9
  const KANTMORK = 0xe4d2ae

  // Foten först (ligger bakom benet så skarven aldrig syns som ett streck).
  const fot = new Container()
  fot.position.set(0, 6)
  const fg = new Graphics()
  fg.moveTo(-20, -10).lineTo(20, -10)
    .quadraticCurveTo(40, -8, 46, 6)
    .quadraticCurveTo(56, 20, 42, 30)
    .quadraticCurveTo(34, 35, 18, 35)
    .lineTo(-6, 35)
    .quadraticCurveTo(-22, 33, -21, 10)
    .closePath()
    .fill(topLightFill(ULL))
  // Konturen ritas som en ÖPPEN väg utan överkanten — annars skär ett streck tvärs
  // över benet där foten möter det.
  fg.moveTo(20, -10)
    .quadraticCurveTo(40, -8, 46, 6)
    .quadraticCurveTo(56, 20, 42, 30)
    .quadraticCurveTo(34, 35, 18, 35)
    .lineTo(-6, 35)
    .quadraticCurveTo(-22, 33, -21, 10)
    .lineTo(-21, -8)
    .stroke({ width: 4, color: MORK, cap: 'round', join: 'round' })
  // Tåhätta i samma gräddvita som randerna.
  fg.moveTo(31, -6).quadraticCurveTo(35, 12, 28, 32).stroke({ width: 9, color: KANT, cap: 'round' })
  fot.addChild(fg)

  const ben = new Graphics()
  ben.roundRect(-19, -52, 38, 64, 14).fill(topLightFill(ULL))
  ben.roundRect(-19, -32, 38, 10, 4).fill(KANT)
  ben.roundRect(-19, -16, 38, 10, 4).fill(KANT)
  ben.moveTo(-19, 10).lineTo(-19, -38)
    .quadraticCurveTo(-19, -52, -5, -52)
    .lineTo(5, -52)
    .quadraticCurveTo(19, -52, 19, -38)
    .lineTo(19, 10)
    .stroke({ width: 4, color: MORK, cap: 'round' })

  const ludd = new Graphics()
  for (const lx of [-22, -13, -4, 5, 14, 22]) ludd.circle(lx, -60, 5.5).fill(KANT)

  const mudd = new Graphics()
  mudd.roundRect(-24, -60, 48, 22, 10).fill(topLightFill(KANT, { dark: 0.12 })).stroke({ width: 3.5, color: KANTMORK })
  for (const rx of [-14, -5, 4, 13]) mudd.moveTo(rx, -56).lineTo(rx, -42).stroke({ width: 2.5, color: KANTMORK, alpha: 0.7 })

  krop.addChild(ben, fot, ludd, mudd)
  krop.position.set(-14, 12)

  const aterstall = () => { if (!fot.destroyed) fot.rotation = 0 }

  return {
    ljud: { klipp: null, ton: [330, 440] }, // E4 -> A4, en mjuk kvart: "hoppsan, en strumpa"
    skugga: { y: 54, rx: 40, ry: 10 },
    liv: { bob: 5, sway: 0.05, duration: 2.5 },
    aterstall,
    // Strumpan VINKAR med tån.
    reagera() {
      const tl = tid()
      tl.to(fot, { rotation: -0.46, duration: 0.14, ease: 'power2.out' }, 0)
        .to(fot, { rotation: 0.16, duration: 0.16, ease: 'sine.inOut' })
        .to(fot, { rotation: -0.34, duration: 0.14, ease: 'sine.inOut' })
        .to(fot, { rotation: 0, duration: 0.34, ease: 'back.out(2.2)' })
      tl.to(krop, { y: v.vilo.y - 10, duration: 0.18, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.42, ease: 'bounce.out' }, 0.18)
    },
    jubla() {
      const tl = tid({ repeat: -1 })
      tl.to(fot, { rotation: -0.5, duration: 0.24, ease: 'sine.inOut' })
        .to(fot, { rotation: 0.06, duration: 0.24, ease: 'sine.inOut' })
        .to(fot, { rotation: -0.5, duration: 0.24, ease: 'sine.inOut' })
        .to(fot, { rotation: 0, duration: 0.3, ease: 'sine.inOut' })
      tl.to(krop, { y: v.vilo.y - 8, duration: 0.51, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
    },
  }
}

// 2) KATT — huvudet från ikonbiblioteket, men kroppen och den vridbara svansen är egna,
// för svansen är hela poängen med reaktionen.
function byggKatt(v) {
  const { krop, tid } = v
  const PALS = 0xb6c0cc
  const MORK = shade(PALS, 0.3)
  const SVANS_VILA = -0.12

  const svans = new Container()
  svans.position.set(26, 34)
  svans.rotation = SVANS_VILA
  const sg = new Graphics()
  sg.moveTo(0, 0).quadraticCurveTo(24, -10, 20, -38).stroke({ width: 18, color: MORK, cap: 'round' })
  sg.moveTo(0, 0).quadraticCurveTo(24, -10, 20, -38).stroke({ width: 12, color: PALS, cap: 'round' })
  sg.circle(20, -38, 6).fill(0xfff3d9)
  svans.addChild(sg)

  const kropp = new Graphics()
  kropp.ellipse(0, 30, 30, 24).fill(sphereFill(PALS, { lightY: 0.24 })).stroke({ width: 4, color: MORK })
  // Två tassar så kroppen inte är en naken ellips.
  kropp.ellipse(-14, 50, 11, 7).fill(0xfff3d9).stroke({ width: 3, color: MORK })
  kropp.ellipse(14, 50, 11, 7).fill(0xfff3d9).stroke({ width: 3, color: MORK })

  const huvud = drawIcon('🐱', 78)
  huvud.position.set(0, -16)

  krop.addChild(svans, kropp, huvud)
  krop.position.set(-10, 0)

  const aterstall = () => { if (!svans.destroyed) svans.rotation = SVANS_VILA }

  return {
    ljud: { klipp: 'djur_katt', ton: [523, 659] }, // C5 -> E5, en liten ters som reserv
    skugga: { y: 56, rx: 34, ry: 9 },
    liv: { bob: 4, sway: 0.02, duration: 2.8 },
    aterstall,
    // Katten STRÄCKER på sig och svansen far rakt upp.
    reagera() {
      const tl = tid()
      tl.to(krop.scale, { x: 1.18, y: 0.9, duration: 0.16, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: 0.95, y: 1.1, duration: 0.18, ease: 'sine.inOut' }, 0.16)
        .to(krop.scale, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2.4)' }, 0.34)
      tl.to(svans, { rotation: -1.2, duration: 0.18, ease: 'back.out(3)' }, 0)
        .to(svans, { rotation: SVANS_VILA, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, 0.34)
    },
    jubla() {
      const tl = tid({ repeat: -1 })
      tl.to(krop, { y: v.vilo.y - 22, duration: 0.3, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.36, ease: 'bounce.out' }, 0.3)
        .to(krop.scale, { x: 1.1, y: 0.9, duration: 0.1, ease: 'power2.out' }, 0.62)
        .to(krop.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.6)' }, 0.72)
      tl.to(svans, { rotation: -0.9, duration: 0.49, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
    },
  }
}

// 3) ANKA — en gul badanka: egen kropp, egen stjärt (som vickar) och ikonhuvudet i gult.
function byggAnka(v) {
  const { krop, tid } = v
  const GUL = 0xffd35c
  const MORK = shade(GUL, 0.3)

  const stjart = new Container()
  stjart.position.set(-30, 14)
  const sg = new Graphics()
  sg.moveTo(0, 0).quadraticCurveTo(-14, -14, -20, -16)
    .quadraticCurveTo(-14, 2, -16, 12)
    .quadraticCurveTo(-8, 10, 0, 6)
    .closePath()
    .fill(topLightFill(GUL)).stroke({ width: 3.5, color: MORK, join: 'round' })
  stjart.addChild(sg)

  const kropp = new Graphics()
  kropp.ellipse(0, 26, 34, 26).fill(sphereFill(GUL, { lightY: 0.24 })).stroke({ width: 4, color: MORK })
  // Vingen: en ritad detalj som gör ellipsen till en anka.
  kropp.moveTo(-14, 20).quadraticCurveTo(4, 12, 20, 22)
    .quadraticCurveTo(6, 36, -14, 20)
    .closePath()
    .fill(topLightFill(GUL, { highlight: 0.45, dark: 0.1 })).stroke({ width: 3, color: MORK, alpha: 0.8 })

  const huvud = drawIcon('🦆', 74)
  huvud.position.set(14, -14)
  huvud.tint = 0xffd76a // krämvit ikon -> gul badanka, näbben blir varmt orange

  krop.addChild(stjart, kropp, huvud)
  krop.position.set(5, -2)

  const aterstall = () => { if (!stjart.destroyed) stjart.rotation = 0 }

  return {
    ljud: { klipp: 'djur_anka', ton: [440, 587] }, // A4 -> D5, en kvart som reserv
    skugga: { y: 56, rx: 38, ry: 10 },
    liv: { bob: 6, sway: 0.04, duration: 2.2 },
    aterstall,
    // Ankan GUPPAR som på vatten och vickar på stjärten.
    reagera() {
      const tl = tid()
      tl.to(krop, { y: v.vilo.y - 18, duration: 0.16, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.5, ease: 'bounce.out' }, 0.16)
      tl.to(stjart, { rotation: 0.5, duration: 0.1, ease: 'power2.out' }, 0)
        .to(stjart, { rotation: -0.34, duration: 0.12, ease: 'sine.inOut' })
        .to(stjart, { rotation: 0.28, duration: 0.12, ease: 'sine.inOut' })
        .to(stjart, { rotation: 0, duration: 0.3, ease: 'back.out(2)' })
    },
    jubla() {
      const tl = tid({ repeat: -1 })
      tl.to(krop, { y: v.vilo.y - 12, duration: 0.34, ease: 'sine.inOut' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.34, ease: 'sine.inOut' }, 0.34)
      tl.to(stjart, { rotation: 0.42, duration: 0.17, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
    },
  }
}

// 4) BALLONG — ikonballongen plus ett eget långt snöre som ritas om när hon svävar,
// så snöret slaknar och spänns i stället för att vara ett fast streck.
function byggBallong(v) {
  const { krop, tid } = v
  const BALLONG_Y = -22
  const ANKARE_Y = 50
  const START_Y = 24 // där ikonens egen lilla knut slutar, i krop-koordinater

  const snore = new Graphics()
  const ballong = new Container()
  const bild = drawIcon('🎈', 92)
  ballong.addChild(bild)
  ballong.position.set(0, BALLONG_Y)

  // Ritas om vid varje förändring: `upp` är hur högt ballongen lyft, och ju högre hon
  // är desto rakare blir snöret.
  const ritSnore = (upp) => {
    if (snore.destroyed) return
    const y0 = START_Y - upp
    const slack = Math.max(0, 15 - upp * 0.5)
    snore.clear()
      .moveTo(4.6, y0)
      .quadraticCurveTo(-6 - slack, (y0 + ANKARE_Y) / 2, 0, ANKARE_Y)
      .stroke({ width: 3, color: 0x9a8f84, cap: 'round' })
    snore.circle(0, ANKARE_Y, 4).fill(0x9a8f84)
  }
  ritSnore(0)

  krop.addChild(snore, ballong)
  krop.position.set(0, 6)

  const aterstall = () => {
    if (!ballong.destroyed) {
      ballong.y = BALLONG_Y
      ballong.rotation = 0
    }
    ritSnore(0)
  }

  return {
    ljud: { klipp: null, ton: [392, 588] }, // G4 -> D5, uppåtgående kvint: hon lättar
    skugga: { y: 58, rx: 18, ry: 7 },
    liv: { bob: 10, sway: 0.05, duration: 3 },
    aterstall,
    // Ballongen SVÄVAR upp en bit och studsar i snöret när det tar slut.
    reagera() {
      const st = { upp: 0 }
      const rita = () => {
        if (ballong.destroyed) return
        ballong.y = BALLONG_Y - st.upp
        ritSnore(st.upp)
      }
      const tl = tid()
      tl.to(st, { upp: 32, duration: 0.42, ease: 'power2.out', onUpdate: rita }, 0)
        .to(st, { upp: 8, duration: 0.9, ease: 'elastic.out(1, 0.42)', onUpdate: rita })
        .to(st, { upp: 0, duration: 0.6, ease: 'sine.inOut', onUpdate: rita })
      tl.to(ballong, { rotation: 0.12, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
    },
    jubla() {
      const st = { upp: 0 }
      const rita = () => {
        if (ballong.destroyed) return
        ballong.y = BALLONG_Y - st.upp
        ritSnore(st.upp)
      }
      const tl = tid({ repeat: -1 })
      tl.to(st, { upp: 26, duration: 0.7, ease: 'sine.inOut', onUpdate: rita }, 0)
        .to(st, { upp: 0, duration: 0.7, ease: 'sine.inOut', onUpdate: rita }, 0.7)
      tl.to(ballong, { rotation: 0.16, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
    },
  }
}

// 5) TETRA — en vällingtetra med gaveltak, sugrörshål och en glad ko-fläck. Fläcken är en
// egen nod: den släpar efter när tetran skvalpar, som innehållet i en halvfull kartong.
function byggTetra(v) {
  const { krop, tid } = v
  const PAPP = 0xfff5e2
  const PAPPMORK = 0xd9c6a4
  const BAND = COLORS.blue

  const vagg = pivotNod(0, 46)

  const kartong = new Graphics()
  // Gaveltaket: två plan + en vikt kant på toppen.
  kartong.poly([-32, -28, 0, -56, 0, -28]).fill(shade(PAPP, 0.14)).stroke({ width: 3, color: PAPPMORK, join: 'round' })
  kartong.poly([0, -56, 32, -28, 0, -28]).fill(topLightFill(PAPP)).stroke({ width: 3, color: PAPPMORK, join: 'round' })
  kartong.roundRect(-6, -63, 12, 10, 3).fill(shade(PAPP, 0.08)).stroke({ width: 3, color: PAPPMORK })
  // Kroppen.
  kartong.roundRect(-32, -28, 64, 74, 6).fill(topLightFill(PAPP, { dark: 0.16 })).stroke({ width: 4, color: PAPPMORK })
  // Bandet tvärs över.
  kartong.roundRect(-32, -12, 64, 20, 3).fill(topLightFill(BAND)).stroke({ width: 2.5, color: shade(BAND, 0.3) })
  // Sugrörshålet i folie.
  kartong.circle(19, -20, 6.5).fill(0xc9d2d8).stroke({ width: 2.5, color: 0x94a0a8 })
  kartong.circle(17, -22, 2).fill(0xeef3f6)

  // Den glada kon på tetran — ritad, inte en ikon.
  //
  // ⚠️ FÄRGEN OCH ÖRONEN ÄR RÄTTADE EFTER BILDEN (`_gommaprobe.mjs --kompisar`). Fläcken var
  //    tre överlappande cirklar i `COLORS.ink` (0x4a3526, alltså BRUN) med två vita ögon och
  //    ett leende — och den silhuetten, en rundad brun klump med ett ansikte, läser som
  //    bajs-emojin, inte som en ko. Två öron och en riktig Holstein-svart gör den entydig.
  //    Det gick inte att se i koden; det syntes direkt i rutnätet.
  const flack = new Container()
  const KO = 0x2f2a28
  const fg = new Graphics()
  fg.moveTo(-16, 12).lineTo(-9, 2).lineTo(-3, 12).closePath().fill(KO) // öra
  fg.moveTo(16, 12).lineTo(9, 2).lineTo(3, 12).closePath().fill(KO)
  fg.circle(-9, 22, 13).fill(KO)
  fg.circle(7, 26, 11).fill(KO)
  fg.circle(0, 14, 10).fill(KO)
  fg.circle(-7, 18, 4.2).fill(COLORS.white)
  fg.circle(4, 19, 4.2).fill(COLORS.white)
  fg.circle(-6.5, 19, 2).fill(0x2b2b2b)
  fg.circle(4.5, 20, 2).fill(0x2b2b2b)
  // Mule i stället för ett rent leende: den skiljer en ko från vilken rund figur som helst.
  fg.ellipse(0, 28, 8.5, 6).fill(0xf0b8c0)
  fg.circle(-3, 27, 1.6).fill(KO)
  fg.circle(3, 27, 1.6).fill(KO)
  flack.addChild(fg)

  vagg.addChild(kartong, flack)
  krop.addChild(vagg)
  krop.position.set(0, 8)

  const aterstall = () => {
    if (!vagg.destroyed) vagg.rotation = 0
    if (!flack.destroyed) flack.position.set(0, 0)
  }

  return {
    ljud: { klipp: null, ton: [294, 392] }, // D4 -> G4, en rund kvart: "glugg-glugg"
    skugga: { y: 54, rx: 34, ry: 9 },
    liv: { bob: 3, sway: 0.02, duration: 2.6 },
    aterstall,
    // Tetran SKVALPAR: kartongen vaggar och innehållet hänger efter.
    reagera() {
      const tl = tid()
      tl.to(vagg, { rotation: 0.17, duration: 0.12, ease: 'power2.out' }, 0)
        .to(vagg, { rotation: -0.14, duration: 0.18, ease: 'sine.inOut' })
        .to(vagg, { rotation: 0.09, duration: 0.16, ease: 'sine.inOut' })
        .to(vagg, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
      tl.to(krop.scale, { x: 1.07, y: 0.94, duration: 0.12, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.2)' }, 0.12)
      tl.to(flack, { x: -7, y: 3, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0.04)
        .to(flack, { x: 0, y: 0, duration: 0.24, ease: 'sine.out' })
    },
    jubla() {
      const tl = tid({ repeat: -1 })
      tl.to(vagg, { rotation: 0.15, duration: 0.28, ease: 'sine.inOut' }, 0)
        .to(vagg, { rotation: -0.15, duration: 0.42, ease: 'sine.inOut' }, 0.28)
        .to(vagg, { rotation: 0, duration: 0.28, ease: 'sine.inOut' }, 0.7)
      tl.to(krop, { y: v.vilo.y - 10, duration: 0.24, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
      tl.to(flack, { x: -5, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.1)
    },
  }
}

// 6) NALLE — ikonbjörnen med en egen stickad halsduk, i en nod som tippar kring fötterna.
function byggNalle(v) {
  const { krop, tid } = v
  const vagg = pivotNod(0, 52)

  const bild = drawIcon('🧸', 122)
  const halsduk = new Graphics()
  halsduk.roundRect(-24, 2, 48, 15, 7).fill(topLightFill(COLORS.red)).stroke({ width: 3, color: shade(COLORS.red, 0.3) })
  halsduk.roundRect(11, 12, 13, 26, 6).fill(topLightFill(COLORS.red, { dark: 0.26 })).stroke({ width: 3, color: shade(COLORS.red, 0.3) })
  for (const hx of [-16, -6, 4, 14]) halsduk.moveTo(hx, 3).lineTo(hx, 16).stroke({ width: 2, color: shade(COLORS.red, 0.28), alpha: 0.6 })

  vagg.addChild(bild, halsduk)
  krop.addChild(vagg)
  krop.position.set(0, -5)

  const aterstall = () => { if (!vagg.destroyed) vagg.rotation = 0 }

  return {
    ljud: { klipp: null, ton: [262, 392] }, // C4 -> G4, en varm låg kvint: en gammal vän
    skugga: { y: 58, rx: 34, ry: 9 },
    liv: { bob: 5, sway: 0.03, duration: 2.5 },
    aterstall,
    // Nallen VÄLTER framåt av bara förtjusning och reser sig igen.
    reagera() {
      const tl = tid()
      tl.to(vagg, { rotation: 0.55, duration: 0.26, ease: 'power2.in' }, 0)
        .to(vagg, { rotation: 0.63, duration: 0.12, ease: 'sine.out' })
        .to(vagg, { rotation: -0.14, duration: 0.44, ease: 'back.out(1.6)' })
        .to(vagg, { rotation: 0, duration: 0.3, ease: 'sine.inOut' })
      tl.to(krop.scale, { x: 1.06, y: 0.94, duration: 0.12, ease: 'power2.out' }, 0.26)
        .to(krop.scale, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2.4)' }, 0.38)
    },
    jubla() {
      const tl = tid({ repeat: -1 })
      tl.to(vagg, { rotation: 0.2, duration: 0.3, ease: 'sine.inOut' }, 0)
        .to(vagg, { rotation: -0.2, duration: 0.4, ease: 'sine.inOut' }, 0.3)
        .to(vagg, { rotation: 0, duration: 0.3, ease: 'sine.inOut' }, 0.7)
      tl.to(krop, { y: v.vilo.y - 16, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 3 }, 0)
    },
  }
}

// 7) BOLL — en handritad studsboll: klotfyllning + tre välvda ränder som följer klotet.
function byggBoll(v) {
  const { krop, tid } = v
  const R = 45
  const bild = new Graphics()
  bild.circle(0, 0, R).fill(sphereFill(0xfffdf7, { dark: 0.24 })).stroke({ width: 4, color: 0xbfae94 })
  // Mittranden: en lins mellan två bågar, båda innanför klotets kant.
  bild.moveTo(-R, 0).quadraticCurveTo(0, -24, R, 0).quadraticCurveTo(0, 24, -R, 0).closePath().fill(COLORS.red)
  // Ränder över och under, smalare eftersom klotet kröker bort.
  bild.moveTo(-38, -24).quadraticCurveTo(0, -46, 38, -24).quadraticCurveTo(0, -8, -38, -24).closePath().fill(COLORS.blue)
  bild.moveTo(-38, 24).quadraticCurveTo(0, 46, 38, 24).quadraticCurveTo(0, 8, -38, 24).closePath().fill(COLORS.yellow)

  krop.addChild(bild, rimLight(R, { alpha: 0.42 }))
  krop.position.set(0, 0)

  return {
    ljud: { klipp: 'boing', ton: [660, 330] }, // fallande oktav — en studs på väg ner
    skugga: { y: 52, rx: 38, ry: 10 },
    liv: { bob: 7, sway: 0, duration: 1.9 },
    aterstall: null,
    // Bollen STUDSAR — squash-and-stretch ur verktygslådan plus ett eget rull.
    reagera() {
      squash(krop, { intensity: 0.9, hop: 82 })
      const tl = tid()
      tl.to(krop, { rotation: krop.rotation + 1.1, duration: 0.8, ease: 'power2.out' }, 0)
    },
    jubla() {
      const tl = tid({ repeat: -1 })
      tl.to(krop, { y: v.vilo.y - 74, duration: 0.34, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.3, ease: 'power2.in' }, 0.34)
        .to(krop.scale, { x: 0.92, y: 1.1, duration: 0.2, ease: 'sine.out' }, 0)
        .to(krop.scale, { x: 1, y: 1, duration: 0.2, ease: 'sine.inOut' }, 0.2)
        .to(krop.scale, { x: 1.24, y: 0.8, duration: 0.09, ease: 'power2.out' }, 0.64)
        .to(krop.scale, { x: 1, y: 1, duration: 0.24, ease: 'back.out(2.6)' }, 0.73)
      tl.to(krop, { rotation: '+=0.7', duration: 0.97, ease: 'none' }, 0)
    },
  }
}

const BYGG = {
  strumpa: byggStrumpa,
  katt: byggKatt,
  anka: byggAnka,
  ballong: byggBallong,
  tetra: byggTetra,
  nalle: byggNalle,
  boll: byggBoll,
}

// --- fabriken ---------------------------------------------------------------

export function makeKompis(key) {
  const nyckel = BYGG[key] ? key : KOMPISAR[0]

  const view = new Container()
  const livnod = new Container() // feedback.liv äger den här nodens y + rotation
  const krop = new Container() // allt ritat; reaktionerna äger den här
  livnod.addChild(krop)

  let dod = false
  const levande = [] // reaktions- och jubeltweens (livtweenen hålls för sig)
  let livTw = null

  // `tw.parent` är sant för löpande OCH köade tweens och falskt för färdiga/dödade —
  // det är det enda måttet som skiljer dem åt (se CLAUDE.md om ringbufferten).
  const spar = (t) => {
    if (!t) return t
    for (let i = levande.length - 1; i >= 0; i--) if (!levande[i].parent) levande.splice(i, 1)
    levande.push(t)
    return t
  }

  // En vaktad tidslinje: dör av sig själv om noden hunnit förstöras (spelaren kan lämna
  // mitt i vilken animation som helst).
  const tid = (opts = {}) => {
    let tl = null
    tl = gsap.timeline({
      ...opts,
      onUpdate() {
        if (krop.destroyed) tl.kill()
      },
    })
    return spar(tl)
  }

  const v = { krop, tid, vilo: { x: 0, y: 0 } }
  const spec = BYGG[nyckel](v)
  v.vilo.x = krop.x
  v.vilo.y = krop.y

  const sk = spec.skugga || {}
  const skugga = new Graphics()
    .ellipse(0, sk.y ?? 54, sk.rx ?? 34, sk.ry ?? 9)
    .fill({ color: COLORS.shadow, alpha: 0.15 })
  skugga.eventMode = 'none'

  view.addChild(skugga, livnod)

  // Nollställ allt som en rörelse kan ha lämnat efter sig, så nästa rörelse startar från
  // viloläget i stället för mitt i den förra.
  const stoppa = () => {
    for (const t of levande) t.kill()
    levande.length = 0
    gsap.killTweensOf(krop)
    gsap.killTweensOf(krop.scale)
    gsap.killTweensOf(krop.position)
    if (!krop.destroyed) {
      krop.position.set(v.vilo.x, v.vilo.y)
      krop.scale.set(1)
    }
    spec.aterstall?.()
  }

  return {
    key: nyckel,
    view,
    ljud: spec.ljud,

    // Sakens EGEN reaktion i samma sekund den hittas.
    reagera() {
      if (dod || krop.destroyed) return
      stoppa()
      spec.reagera()
    },

    // Finalens jubel — får loopa tills destroy().
    jubla() {
      if (dod || krop.destroyed) return
      stoppa()
      spec.jubla()
    },

    // Vilo-rörelse med EGEN slumpad fas, så sju kompisar inte guppar som en enda yta.
    liv() {
      if (dod || livnod.destroyed) return
      livTw?.kill()
      livnod.y = 0
      livnod.rotation = 0
      const o = spec.liv || {}
      livTw = fbLiv(livnod, {
        bob: o.bob ?? 6,
        sway: o.sway ?? 0.03,
        duration: o.duration ?? 2.4,
        phase: Math.random(),
      })
      return livTw
    },

    destroy() {
      if (dod) return
      dod = true
      for (const t of levande) t.kill()
      levande.length = 0
      livTw?.kill()
      livTw = null
      // killTweensOf(roten) når BARA roten: svansar, tår, stjärtar och fläckar ligger en
      // nivå in och överlever annars rivningen helt tyst.
      for (const n of samlaNoder(view)) {
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
        if (n.position) gsap.killTweensOf(n.position)
        if (n.pivot) gsap.killTweensOf(n.pivot)
      }
      if (!view.destroyed) view.destroy({ children: true })
    },
  }
}
