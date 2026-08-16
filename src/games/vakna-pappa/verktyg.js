// Sakerna på nattduksbordet i "Vakna, pappa!" — de sex verktygen barnet trycker på för att
// väcka honom, plus katten som går ut på kudden och STANNAR där.
//
// Var sak är ett FRISTÅENDE föremål med egen silhuett (P0 ASSETS): ingen emoji i en ruta,
// ingen bricka. De har eget liv i vila (egen slumpad fas, så sex saker inte guppar som en
// enda yta), en egen skugga mot bordsskivan, och en reaktion som är SAKENS egen — klockan
// skallrar med bjällrorna och hammaren, trumpeten sväller och ventilerna trycks ner,
// koppen skvalpar och ångar, rullgardinen dras och släpper in dagsljus, fjädern viftar,
// katten sträcker på sig och vaknar ur sin hoprullade sömn.
//
// Kontrakt utåt (index.js är skriven mot exakt detta):
//   VERKTYG            lista med de sex nycklarna
//   makeVerktyg(key) -> { key, view, hitR, tryck, liv, destroy }
//   makeKatt()       -> { view, gaTill, reagera, jama, liv, destroy }
//
// `view` är CENTRERAD i (0,0) för alla. `hitR` är den radie index.js ska ge träffytan —
// träffytan är index.js ansvar, filen här ritar bara och rapporterar måttet. Konsten
// håller sig med god marginal innanför grannens träffyta (se KONST_TAK nedan).
//
// Exit-säkerhet: spelaren kan lämna mitt i vilken animation som helst. Varje tidslinje
// filen startar ligger i en lista som destroy() dödar, OCH är vaktad av en onUpdate som
// dödar sig själv om noden hunnit förstöras. destroy() går dessutom igenom HELA nodträdet
// och dödar tweens per nod — `killTweensOf(roten)` når BARA roten, aldrig svansen,
// bjällrorna, ångan eller fjäderfanet som ligger en nivå in.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { drawIcon } from '../../lib/artikoner.js'
import { topLightFill, sphereFill, cylinderFill, rimLight, verticalFill } from '../../lib/form.js'
import { COLORS, shade } from '../../lib/theme.js'
import { liv as fbLiv, squash } from '../../lib/feedback.js'

// TOLV verktyg, ett per busskategori. `index.js` delar dem i tre HYLLSIDOR om fyra (se
// SIDOR där) — tolv saker får inte plats i en rad utan att bryta P0:s träffyteavstånd.
//
//   klocka   ljud (skarpt)      strumpa  lukt (äcklig)
//   trumpet  ljud (fanfar)      lampa    ljus
//   ballong  slag / smäll       gardin   ljus (dagsljus)
//   kaffe    lukt (god)         spruta   blött
//   flakt    vind               kittla   insekt som kryper en sträcka
//   katt     djur som sätter sig på honom
//   hund     djur som pruttar på honom
export const VERKTYG = [
  'klocka', 'katt', 'trumpet', 'gardin', 'kaffe', 'kittla',
  'ballong', 'strumpa', 'lampa', 'spruta', 'flakt', 'hund',
]

// Radien index.js ska använda till träffytan. 64 ⇒ 128 px yta, över P0:s 96 px, och med
// ≥24 px luft blir centrumavståndet 152 px — grannens träffyta börjar alltså 88 px från
// mitt centrum. INGEN sak här ritar bredare än ±88 (KONST_TAK), så en detalj kan aldrig
// hamna inne i grannens hitArea och stjäla trycket. Sex verktyg i rad = 888 px av 1280.
const HIT_R = 64
const KONST_TAK = 88 // px från centrum — halva bredden på det bredaste som får ritas

// --- små hjälpare -----------------------------------------------------------

// En behållare som roterar kring en vald punkt utan att flytta sig — för allt som ska
// svänga kring sitt fäste (bjällran kring halsen, hammaren kring skaftet, benet kring
// höften). Geometrin ritas i FÖRÄLDERNS koordinater och står ändå still.
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

// En liten tidslinjehållare: alla tidslinjer sparas, är vaktade mot en förstörd nod, och
// kan dödas i klump. `tw.parent` är sant för löpande OCH köade tweens och falskt för både
// färdiga och dödade — det är det enda måttet som skiljer dem åt, så listan städas på
// FÄRDIGA i stället för att växa (eller att vräka den äldsta, som alltid är den eviga).
function tidHall(vakt) {
  const levande = []
  const spar = (t) => {
    if (!t) return t
    for (let i = levande.length - 1; i >= 0; i--) if (!levande[i].parent) levande.splice(i, 1)
    levande.push(t)
    return t
  }
  const tid = (opts = {}) => {
    let tl = null
    tl = gsap.timeline({
      ...opts,
      onUpdate() {
        if (vakt.destroyed) tl.kill()
      },
    })
    return spar(tl)
  }
  const doda = () => {
    for (const t of levande) t.kill()
    levande.length = 0
  }
  return { tid, doda }
}

// En mjuk skugga mot bordsskivan — djup utan filter.
function skuggNod(y, rx, ry) {
  const g = new Graphics().ellipse(0, y, rx, ry).fill({ color: COLORS.shadow, alpha: 0.16 })
  g.eventMode = 'none'
  return g
}

// --- verktygen --------------------------------------------------------------
// Var byggare ritar sin sak i `v.krop` (centrerad i 0,0), och returnerar sin skugga, sin
// vilorörelse, sin EGNA tryck-reaktion och eventuellt ett eget ambient-liv (ånga, zzz).

// 1) KLOCKA — en gammaldags väckarklocka: rund kåpa med urtavla och visare, TVÅ bjällror
// på egna halsar och en hammare mellan dem. Bjällrorna och hammaren är egna noder, för
// det är de som ska slå när klockan ringer; visarna är egna noder så de kan spinna.
// Helt handritad — ikonens ⏰ har sina bjällror inbakade i samma Graphics och går därför
// inte att slå med.
function byggKlocka(v) {
  const { krop, tid } = v
  const SKAL = COLORS.red
  const MORK = shade(SKAL, 0.34)
  const MASSING = 0xf0c33c
  const MASSING_M = shade(MASSING, 0.36)
  const TAVLA = 0xfff3d9

  // Bjällrornas halsar (bakom kåpan, så skarven aldrig syns som ett streck).
  const halsar = new Graphics()
  for (const hx of [-27, 27]) {
    halsar.roundRect(hx - 5, -34, 10, 20, 4).fill(cylinderFill(MASSING_M, { axis: 'y' }))
  }

  const mkBjallra = (bx) => {
    const b = pivotNod(bx, -22)
    const g = new Graphics()
    // Kupolen: en halvsfär med platt underkant, som en riktig ringklocka.
    g.moveTo(bx - 19, -22)
      .quadraticCurveTo(bx - 19, -48, bx, -48)
      .quadraticCurveTo(bx + 19, -48, bx + 19, -22)
      .closePath()
      .fill(sphereFill(MASSING, { lightY: 0.24, dark: 0.36 }))
      .stroke({ width: 3.5, color: MASSING_M, join: 'round' })
    // Kanten under kupolen — den ger bjällran tjocklek i stället för att vara en skiva.
    g.roundRect(bx - 21, -25, 42, 7, 3).fill(topLightFill(MASSING, { dark: 0.3 })).stroke({ width: 2.5, color: MASSING_M })
    g.ellipse(bx - 6, -38, 5, 3.5).fill({ color: COLORS.white, alpha: 0.55 })
    b.addChild(g)
    return b
  }
  const bjallraV = mkBjallra(-27)
  const bjallraH = mkBjallra(27)

  // Hammaren mellan bjällrorna: skaft + kula, svänger kring sitt fäste.
  const hammare = pivotNod(0, -26)
  const hg = new Graphics()
  hg.roundRect(-2.5, -50, 5, 26, 2.5).fill(cylinderFill(0x9aa4b0, { axis: 'y' }))
  hg.circle(0, -52, 7).fill(sphereFill(0xc3ccd4)).stroke({ width: 2.5, color: 0x8d99a6 })
  hammare.addChild(hg)

  // Kåpan.
  const kapa = new Graphics()
  kapa.circle(0, 10, 43).fill(topLightFill(SKAL, { dark: 0.3 })).stroke({ width: 4, color: MORK })
  kapa.circle(0, 10, 35).fill(topLightFill(TAVLA, { highlight: 0.2, dark: 0.14 })).stroke({ width: 3, color: MORK })
  // Timstreck runt tavlan — det som gör en cirkel till en urtavla.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r1 = i % 3 === 0 ? 24 : 27
    kapa.moveTo(Math.sin(a) * r1, 10 - Math.cos(a) * r1)
      .lineTo(Math.sin(a) * 31, 10 - Math.cos(a) * 31)
      .stroke({ width: i % 3 === 0 ? 3.5 : 2, color: COLORS.ink, alpha: 0.75 })
  }

  const timvisare = pivotNod(0, 10)
  timvisare.addChild(new Graphics().roundRect(-3.5, -8, 7, 20, 3.5).fill(COLORS.ink))
  timvisare.rotation = 0.6
  const minutvisare = pivotNod(0, 10)
  minutvisare.addChild(new Graphics().roundRect(-2.8, -26, 5.6, 30, 2.8).fill(COLORS.ink))
  minutvisare.rotation = -1.9

  const nav = new Graphics().circle(0, 10, 4.5).fill(MORK)

  // Fötter + vridknopp bak, så klockan STÅR på bordet i stället för att sväva.
  const fotter = new Graphics()
  for (const fx of [-28, 28]) {
    fotter.roundRect(fx - 8, 44, 16, 12, 5).fill(topLightFill(MASSING, { dark: 0.34 })).stroke({ width: 2.5, color: MASSING_M })
  }
  fotter.roundRect(-5, 50, 10, 6, 3).fill(MORK)

  krop.addChild(halsar, bjallraV, bjallraH, hammare, kapa, timvisare, minutvisare, nav, fotter)

  const aterstall = () => {
    if (!bjallraV.destroyed) bjallraV.rotation = 0
    if (!bjallraH.destroyed) bjallraH.rotation = 0
    if (!hammare.destroyed) hammare.rotation = 0
  }

  return {
    skugga: { y: 58, rx: 44, ry: 10 },
    liv: { bob: 3, sway: 0.018, duration: 3.1 },
    aterstall,
    // KLOCKAN RINGER: hammaren far mellan bjällrorna, bjällrorna skallrar i motfas,
    // hela klockan skuttar på fötterna och minutvisaren rusar ett varv.
    tryck() {
      const tl = tid()
      for (let i = 0; i < 5; i++) {
        const t = i * 0.075
        const h = i % 2 === 0 ? 0.55 : -0.55
        tl.to(hammare, { rotation: h, duration: 0.075, ease: 'power2.inOut' }, t)
        tl.to(bjallraV, { rotation: i % 2 === 0 ? -0.26 : 0.16, duration: 0.075, ease: 'sine.inOut' }, t)
        tl.to(bjallraH, { rotation: i % 2 === 0 ? 0.26 : -0.16, duration: 0.075, ease: 'sine.inOut' }, t)
      }
      tl.to(hammare, { rotation: 0, duration: 0.34, ease: 'elastic.out(1, 0.4)' }, 0.375)
      tl.to(bjallraV, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.36)' }, 0.375)
      tl.to(bjallraH, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.36)' }, 0.375)
      // Visarna rusar — klockan tycker det är hög tid.
      tl.to(minutvisare, { rotation: '+=6.28', duration: 0.62, ease: 'power2.out' }, 0)
      tl.to(timvisare, { rotation: '+=0.52', duration: 0.62, ease: 'power2.out' }, 0)
      // Skutt på fötterna.
      tl.to(krop, { y: v.vilo.y - 13, duration: 0.11, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.44, ease: 'bounce.out' }, 0.11)
      tl.to(krop, { rotation: 0.05, duration: 0.05, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 0)
        .to(krop, { rotation: 0, duration: 0.16, ease: 'sine.out' }, 0.4)
      squash(krop, { intensity: 0.55 })
    },
  }
}

// 2) KATT (verktyget) — en hoprullad sovande katt: egen kropp, svansen lindad runt sig
// själv, och ikonhuvudet (🐱) med HANDRITADE slutna ögonlock ovanpå de öppna. Två små
// ritade z:n svävar över den. Trycket väcker den; index.js skickar sedan ut `makeKatt()`
// på kudden.
function byggKatt(v) {
  const { krop, tid } = v
  const PALS = 0xb6c0cc
  const MORK = shade(PALS, 0.32)
  const IKON = 66
  const HX = -16
  const HY = -4
  const S = IKON / 100

  // Svansen först — den ligger BAKOM kroppen där den kommer runt, framför där den slutar.
  const svansBak = new Graphics()
  svansBak.moveTo(30, 6).quadraticCurveTo(52, 22, 40, 40).stroke({ width: 17, color: MORK, cap: 'round' })
  svansBak.moveTo(30, 6).quadraticCurveTo(52, 22, 40, 40).stroke({ width: 12, color: PALS, cap: 'round' })

  const kropp = new Graphics()
  kropp.ellipse(0, 12, 47, 31).fill(sphereFill(PALS, { lightY: 0.22, dark: 0.3 })).stroke({ width: 4, color: MORK })
  // Ryggens hoprullade linje — den skiljer en hoprullad katt från en ellips.
  kropp.moveTo(-38, 2).quadraticCurveTo(-6, -14, 30, 4).stroke({ width: 3, color: MORK, alpha: 0.45 })

  // Svansens spets lindad framför tassarna.
  const svansFram = new Graphics()
  svansFram.moveTo(40, 40).quadraticCurveTo(10, 50, -18, 38).stroke({ width: 15, color: MORK, cap: 'round' })
  svansFram.moveTo(40, 40).quadraticCurveTo(10, 50, -18, 38).stroke({ width: 10, color: PALS, cap: 'round' })
  svansFram.circle(-18, 38, 6).fill(0xfff3d9)

  const huvud = new Container()
  const bild = drawIcon('🐱', IKON)
  bild.position.set(HX, HY)
  huvud.addChild(bild)

  // SLUTNA ÖGON: ikonens ögon ligger på (±12,-6)·S kring huvudets mitt. Vi lägger päls
  // över dem och ritar ett stängt lock — en katt som sover har inte stirrande pupiller.
  const lock = new Graphics()
  for (const sx of [-1, 1]) {
    const ex = HX + sx * 12 * S
    const ey = HY - 6 * S
    lock.circle(ex, ey, 5.4).fill(PALS)
    lock.moveTo(ex - 5, ey + 1).quadraticCurveTo(ex, ey - 4.5, ex + 5, ey + 1)
      .stroke({ width: 2.4, color: COLORS.ink, cap: 'round' })
  }
  huvud.addChild(lock)

  // Två små ritade z:n (linjer, ingen Text) som svävar upp ur sömnen.
  const zzz = new Container()
  const zg = new Graphics()
  const ritZ = (x, y, s) => {
    zg.moveTo(x - 6 * s, y - 6 * s).lineTo(x + 6 * s, y - 6 * s)
      .lineTo(x - 6 * s, y + 6 * s).lineTo(x + 6 * s, y + 6 * s)
      .stroke({ width: 3.4 * s, color: 0xdfe9f5, cap: 'round', join: 'round' })
  }
  ritZ(20, -40, 1)
  ritZ(36, -54, 0.72)
  zzz.addChild(zg)
  zzz.alpha = 0.9

  krop.addChild(svansBak, kropp, svansFram, huvud, zzz)
  krop.position.set(0, 4)

  // Zzz-slingan och trycket rör SAMMA nod. Två gsap-tweens om samma egenskap skriver om
  // varandra varje bildruta (gsaps standard är overwrite: false), så slingan parkeras på
  // sin nollpunkt medan katten vaknar och startas om av aterstall(). Ordningen håller:
  // makeVerktyg kör alltid stoppa() -> aterstall() -> tryck().
  let ambTl = null
  const aterstall = () => {
    if (!lock.destroyed) lock.alpha = 1
    if (!zzz.destroyed) {
      zzz.alpha = 0.9
      zzz.position.set(0, 0)
    }
    if (!huvud.destroyed) huvud.rotation = 0
    if (ambTl?.parent) ambTl.play(0)
  }

  return {
    skugga: { y: 46, rx: 46, ry: 11 },
    liv: { bob: 3.5, sway: 0.012, duration: 3.6 },
    aterstall,
    // Zzz:na andas långsamt av sig själva medan katten sover. Slingan byggs med den
    // BAKGRUNDS-tidslinje som skickas in, så ett tryck inte river den.
    ambient(btid) {
      ambTl = btid({ repeat: -1 })
      ambTl.to(zzz, { y: -12, alpha: 0.35, duration: 1.7, ease: 'sine.inOut' }, 0)
        .to(zzz, { y: 0, alpha: 0.9, duration: 1.7, ease: 'sine.inOut' }, 1.7)
      return ambTl
    },
    // KATTEN VAKNAR: locken far upp, huvudet lyfts, den sträcker på sig och zzz:na blåser bort.
    tryck() {
      if (ambTl?.parent) ambTl.pause(0)
      const tl = tid()
      tl.to(lock, { alpha: 0, duration: 0.1, ease: 'power2.out' }, 0)
        .to(lock, { alpha: 1, duration: 0.3, ease: 'sine.inOut' }, 1.5)
      tl.to(zzz, { alpha: 0, y: -22, duration: 0.34, ease: 'power2.out' }, 0)
        .to(zzz, { alpha: 0.9, y: 0, duration: 0.5, ease: 'sine.inOut' }, 1.5)
      tl.to(huvud, { rotation: -0.2, duration: 0.16, ease: 'back.out(2.6)' }, 0)
        .to(huvud, { rotation: 0.06, duration: 0.26, ease: 'sine.inOut' }, 0.5)
        .to(huvud, { rotation: 0, duration: 0.4, ease: 'sine.inOut' }, 1.4)
      // Sträckningen: lång och låg, sedan hoprullad igen.
      tl.to(krop.scale, { x: 1.2, y: 0.84, duration: 0.2, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: 0.94, y: 1.1, duration: 0.22, ease: 'sine.inOut' }, 0.2)
        .to(krop.scale, { x: 1, y: 1, duration: 0.44, ease: 'back.out(2.2)' }, 0.42)
      tl.to(krop, { y: v.vilo.y - 10, duration: 0.2, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.46, ease: 'bounce.out' }, 0.2)
      tl.to(svansFram, { rotation: 0.12, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0.1)
        .to(svansFram, { rotation: 0, duration: 0.2, ease: 'sine.out' }, 0.66)
      // ...och när hon somnat om igen får zzz-slingan andas vidare av sig själv.
      tl.call(() => {
        if (ambTl?.parent) ambTl.play(0)
      }, null, 2.05)
    },
  }
}

// 3) TRUMPET — en leksakstrumpet i mässing, sedd snett från sidan: munstycke, rakt rör,
// tre TRYCKBARA ventiler på egna noder, och en klocka med mörk insida. Ljudvågorna ur
// klockan är egna ritade bågar som bara syns när man trycker.
function byggTrumpet(v) {
  const { krop, tid } = v
  const MASSING = 0xf0c33c
  const MORK = shade(MASSING, 0.4)
  const HAL = 0x5c4a22

  // Hela hornet ligger snett uppåt. Lutningen är inte kosmetisk: en trumpet är av naturen
  // ett brett och lågt föremål, och rakt i sidled blev silhuetten 82 px hög mot de 96–120
  // som de andra verktygen håller. Vid 0,62 rad står den 99 px hög OCH bara 114 px bred.
  const LUT = -0.62
  const horn = new Container()
  horn.rotation = LUT

  const ror = new Graphics()
  // Munstycket.
  ror.roundRect(-55, -7, 12, 14, 6).fill(cylinderFill(MASSING, { axis: 'x' })).stroke({ width: 2.5, color: MORK })
  ror.ellipse(-57, 0, 5, 10).fill(topLightFill(MASSING, { dark: 0.34 })).stroke({ width: 2.5, color: MORK })
  // Röret.
  ror.roundRect(-48, -9, 58, 18, 9).fill(cylinderFill(MASSING, { axis: 'x' })).stroke({ width: 3, color: MORK })
  // Klockan (konen) — svänger ut åt höger.
  ror.moveTo(8, -11)
    .quadraticCurveTo(32, -16, 43, -37)
    .lineTo(43, 37)
    .quadraticCurveTo(32, 16, 8, 11)
    .closePath()
    .fill(cylinderFill(MASSING, { axis: 'x', dark: 0.34 }))
    .stroke({ width: 3, color: MORK, join: 'round' })
  // Mynningen: mörk insida med en ljus kantring, annars läser konen som en platt triangel.
  ror.ellipse(44, 0, 9, 38).fill(topLightFill(HAL, { highlight: 0.16, dark: 0.2 })).stroke({ width: 3.5, color: MORK })
  ror.ellipse(45, 0, 6, 30).fill(shade(HAL, 0.4))
  // Stötta mellan rör och klocka.
  ror.roundRect(2, 12, 28, 5, 2.5).fill(MORK)

  // Ventilhus + tre ventiler som verkligen trycks ner.
  const hus = new Graphics()
  const ventiler = []
  const VX = [-34, -19, -4]
  for (const vx of VX) {
    hus.roundRect(vx - 9, -30, 18, 26, 6).fill(cylinderFill(MASSING, { axis: 'y', dark: 0.32 })).stroke({ width: 2.5, color: MORK })
  }
  for (const vx of VX) {
    const nod = new Container()
    const g = new Graphics()
    g.roundRect(vx - 4, -42, 8, 16, 4).fill(cylinderFill(0xe6ecf0, { axis: 'y' }))
    g.circle(vx, -44, 8).fill(sphereFill(0xfffdf7, { dark: 0.24 })).stroke({ width: 2.5, color: 0xa9b3bd })
    nod.addChild(g)
    ventiler.push(nod)
  }

  // Ljudvågorna ur klockan — tre bågar, osynliga i vila. De bor i en EGEN behållare vid
  // mynningen och ritas kring dess origo, inte kring hornets: en skalning kring hornets
  // origo hade kastat ut den yttersta bågen till 105 px från verktygets mitt, alltså rakt
  // in i grannknappens träffyta (som börjar 88 px bort). Nu växer de kring sig själva.
  const vagor = new Container()
  vagor.position.set(50, 0)
  const vg = new Graphics()
  for (const r of [6, 11, 16]) {
    vg.arc(0, 0, r, -0.72, 0.72).stroke({ width: 3.2, color: 0xfff3b0, cap: 'round' })
  }
  vagor.addChild(vg)
  vagor.alpha = 0

  horn.addChild(hus, ror, ...ventiler, vagor)
  krop.addChild(horn)
  krop.position.set(-2, 6)

  const aterstall = () => {
    for (const n of ventiler) if (!n.destroyed) n.y = 0
    if (!vagor.destroyed) {
      vagor.alpha = 0
      vagor.scale.set(1)
    }
    if (!horn.destroyed) horn.rotation = LUT
  }

  return {
    skugga: { y: 54, rx: 42, ry: 10 },
    liv: { bob: 4, sway: 0.026, duration: 2.7 },
    aterstall,
    // TRUTAR TILL: ventilerna trycks i tur och ordning, hornet sväller och skakar, och
    // ljudvågorna far ut ur klockan.
    tryck() {
      const tl = tid()
      ventiler.forEach((n, i) => {
        tl.to(n, { y: 8, duration: 0.07, ease: 'power2.out' }, i * 0.055)
          .to(n, { y: 0, duration: 0.26, ease: 'back.out(2.6)' }, i * 0.055 + 0.14)
      })
      // Svällningen: luften trycks igenom och hela hornet vidgas ett ögonblick. 1,10 och
      // inte 1,16 — svällningen skalar ALLT, ljudvågorna med, och marginalen till
      // grannens träffyta får inte ätas upp av en effekt.
      tl.to(krop.scale, { x: 1.1, y: 1.1, duration: 0.12, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: 0.97, y: 0.97, duration: 0.16, ease: 'sine.inOut' }, 0.12)
        .to(krop.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.4)' }, 0.28)
      tl.to(horn, { rotation: LUT - 0.08, duration: 0.05, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0.06)
        .to(horn, { rotation: LUT, duration: 0.18, ease: 'sine.out' }, 0.36)
      tl.to(vagor, { alpha: 0.95, duration: 0.08, ease: 'power2.out' }, 0.05)
        .to(vagor, { alpha: 0, duration: 0.42, ease: 'power2.in' }, 0.24)
      tl.to(vagor.scale, { x: 1.4, y: 1.3, duration: 0.5, ease: 'power2.out' }, 0.05)
        .set(vagor.scale, { x: 1, y: 1 }, 0.56)
    },
  }
}

// 4) GARDIN — en rullgardin: trärulle i taket, ett stycke tyg med fållkant, och en
// DRAGSNODD med trähandtag som hänger ner. Bakom tyget ligger en ljusstråle som bara syns
// när gardinen är uppdragen.
function byggGardin(v) {
  const { krop, tid } = v
  const TRA = COLORS.brown
  const TRA_M = shade(TRA, 0.32)
  const TYG = 0xf3e2c0
  const TYG_M = shade(TYG, 0.24)

  // Dagsljuset bakom tyget — en trapets som vidgas nedåt.
  const ljus = new Graphics()
  ljus.moveTo(-32, -24).lineTo(32, -24).lineTo(46, 52).lineTo(-46, 52).closePath()
    .fill({ color: 0xfff3b0, alpha: 0.85 })
  ljus.alpha = 0

  // Tyget hänger från rullen: pivot i ÖVERKANTEN så scale.y rullar upp det uppåt.
  const tyg = pivotNod(0, -26)
  const tg = new Graphics()
  tg.roundRect(-38, -26, 76, 40, 4).fill(topLightFill(TYG, { highlight: 0.16, dark: 0.2 })).stroke({ width: 3, color: TYG_M })
  // Fållens tyngdlist, så tyget inte slutar i en platt kant.
  tg.roundRect(-40, 6, 80, 9, 4).fill(topLightFill(TYG, { dark: 0.3 })).stroke({ width: 2.5, color: TYG_M })
  for (let i = -3; i <= 3; i++) {
    tg.moveTo(i * 11, -22).lineTo(i * 11, 4).stroke({ width: 2, color: TYG_M, alpha: 0.4 })
  }
  tyg.addChild(tg)

  // Rullen med gavlar.
  const rulle = new Graphics()
  rulle.roundRect(-44, -46, 88, 20, 10).fill(cylinderFill(TRA, { axis: 'x' })).stroke({ width: 3.5, color: TRA_M })
  rulle.circle(-44, -36, 10).fill(sphereFill(TRA, { dark: 0.34 })).stroke({ width: 3, color: TRA_M })
  rulle.circle(44, -36, 10).fill(sphereFill(TRA, { dark: 0.34 })).stroke({ width: 3, color: TRA_M })
  // Ådring så rullen läser som trä.
  rulle.moveTo(-30, -41).lineTo(24, -41).stroke({ width: 2, color: TRA_M, alpha: 0.5 })
  rulle.moveTo(-18, -32).lineTo(30, -32).stroke({ width: 2, color: TRA_M, alpha: 0.4 })

  // Dragsnodden: lina + trähandtag, egen nod som dras ner.
  const snodd = new Container()
  const sg = new Graphics()
  sg.moveTo(24, 12).quadraticCurveTo(28, 28, 26, 40).stroke({ width: 3, color: 0xd9c6a4, cap: 'round' })
  // Handtaget — en droppformad träknopp med ett hål för linan.
  sg.moveTo(26, 38)
    .quadraticCurveTo(16, 44, 17, 53)
    .quadraticCurveTo(18, 64, 26, 64)
    .quadraticCurveTo(34, 64, 35, 53)
    .quadraticCurveTo(36, 44, 26, 38)
    .closePath()
    .fill(topLightFill(TRA, { dark: 0.3 }))
    .stroke({ width: 3, color: TRA_M, join: 'round' })
  sg.ellipse(22, 49, 3, 5).fill({ color: COLORS.white, alpha: 0.35 })
  snodd.addChild(sg)

  krop.addChild(ljus, tyg, rulle, snodd)
  krop.position.set(0, -9)

  const aterstall = () => {
    if (!tyg.destroyed) tyg.scale.y = 1
    if (!snodd.destroyed) snodd.y = 0
    if (!ljus.destroyed) ljus.alpha = 0
    if (!rulle.destroyed) rulle.rotation = 0
  }

  return {
    skugga: { y: 62, rx: 40, ry: 9 },
    liv: { bob: 3, sway: 0.02, duration: 3.3 },
    aterstall,
    // SNODDEN DRAS: handtaget far ner och studsar, tyget rullar upp, dagsljuset flödar in
    // och gardinen rullar sakta ner igen.
    tryck() {
      const tl = tid()
      tl.to(snodd, { y: 22, duration: 0.11, ease: 'power2.out' }, 0)
        .to(snodd, { y: 0, duration: 0.8, ease: 'elastic.out(1, 0.34)' }, 0.13)
      tl.to(tyg.scale, { y: 0.14, duration: 0.3, ease: 'power2.out' }, 0.09)
        .to(tyg.scale, { y: 1, duration: 0.9, ease: 'power1.inOut' }, 1.5)
      tl.to(ljus, { alpha: 1, duration: 0.34, ease: 'power2.out' }, 0.12)
        .to(ljus, { alpha: 0, duration: 0.9, ease: 'power1.inOut' }, 1.5)
      // Rullen snurrar medan tyget går upp.
      tl.to(rulle, { rotation: 0.06, duration: 0.04, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 0.09)
        .to(rulle, { rotation: 0, duration: 0.16, ease: 'sine.out' }, 0.43)
      squash(krop, { intensity: 0.4 })
    },
  }
}

// 5) KAFFE — en kopp på fat: porslinskropp, öra, mörk kaffeyta som SKVALPAR, och tre
// ritade ångslingor som stiger av sig själva.
function byggKaffe(v) {
  const { krop, tid } = v
  const PORSLIN = COLORS.cream
  const PORSLIN_M = 0xcfc6b4
  const KAFFE = 0x6b4028

  const fat = new Graphics()
  fat.ellipse(0, 42, 45, 12).fill(topLightFill(PORSLIN, { dark: 0.24 })).stroke({ width: 3.5, color: PORSLIN_M })
  fat.ellipse(0, 40, 27, 7).fill(shade(PORSLIN, 0.12)).stroke({ width: 2, color: PORSLIN_M, alpha: 0.7 })

  const ora = new Graphics()
  ora.moveTo(25, -2).quadraticCurveTo(50, 0, 45, 13)
    .quadraticCurveTo(41, 24, 24, 21)
    .stroke({ width: 9, color: PORSLIN_M, cap: 'round' })
  ora.moveTo(25, -2).quadraticCurveTo(48, 0, 43, 13)
    .quadraticCurveTo(39, 22, 24, 20)
    .stroke({ width: 5.5, color: PORSLIN, cap: 'round' })

  const kopp = new Graphics()
  kopp.moveTo(-28, -12)
    .lineTo(28, -12)
    .quadraticCurveTo(26, 20, 19, 31)
    .quadraticCurveTo(0, 38, -19, 31)
    .quadraticCurveTo(-26, 20, -28, -12)
    .closePath()
    .fill(topLightFill(PORSLIN, { highlight: 0.24, dark: 0.26 }))
    .stroke({ width: 3.5, color: PORSLIN_M, join: 'round' })
  // Ett band runt koppen — porslin utan dekor läser som en tom form.
  kopp.moveTo(-27, 4).quadraticCurveTo(0, 11, 27, 4).stroke({ width: 6, color: COLORS.teal, alpha: 0.85 })

  // Kaffeytan är EGEN nod: det är den som skvalpar.
  const yta = new Container()
  const yg = new Graphics()
  yg.ellipse(0, -12, 26, 8.5).fill(topLightFill(KAFFE, { highlight: 0.22, dark: 0.24 }))
  yg.ellipse(-9, -14, 7, 2.6).fill({ color: 0xc99a6a, alpha: 0.45 })
  yta.addChild(yg)

  const rand = new Graphics()
  rand.ellipse(0, -12, 28, 9.5).stroke({ width: 3.5, color: PORSLIN_M })

  // Ångan: tre slingor som stiger, var och en med egen fas. Slingan är 22 px lång och
  // reser 20 px — HÖGSTA punkten blir alltså −56 och koppen håller sig på 110 px totalt.
  // (Med en 34 px lång slinga som reste till −46 nådde ångan −80 och verktyget blev
  // 134 px högt: höjden på det RÖRLIGA måste räknas, inte bara på det ritade.)
  const anga = new Container()
  const slingor = []
  for (let i = 0; i < 3; i++) {
    const w = new Graphics()
    const x = -13 + i * 13
    w.moveTo(x, 0)
      .quadraticCurveTo(x - 6, -6, x, -12)
      .quadraticCurveTo(x + 6, -18, x, -22)
      .stroke({ width: 4.5, color: 0xf0f4f8, cap: 'round', alpha: 0.9 })
    w.position.set(0, -14)
    w.alpha = 0
    anga.addChild(w)
    slingor.push(w)
  }

  krop.addChild(anga, fat, ora, kopp, yta, rand, rimLight(26, { offsetX: -0.5, offsetY: 0.1, size: 0.28, alpha: 0.3, ry: 30 }))
  krop.position.set(0, 2)

  const aterstall = () => {
    if (!yta.destroyed) {
      yta.position.set(0, 0)
      yta.rotation = 0
    }
  }

  return {
    skugga: { y: 52, rx: 44, ry: 10 },
    liv: { bob: 3, sway: 0.014, duration: 3.4 },
    aterstall,
    // Ångan stiger hela tiden — det är den som säger "nybryggt" utan ett ord. Bredden
    // tweenas på `w.scale` och ALDRIG på ett `scaleX`: Pixi v8 har ingen sådan egenskap
    // (den kommer från gsaps PixiPlugin, som inte är registrerad här) och tweenen hade
    // blivit en tyst nollverkan.
    ambient(btid) {
      const tls = []
      slingor.forEach((w, i) => {
        const tl = btid({ repeat: -1, repeatDelay: 0.5, delay: i * 0.68 })
        tl.set(w, { y: -14, alpha: 0 }, 0)
          .set(w.scale, { x: 0.7, y: 1 }, 0)
          .to(w, { alpha: 0.65, duration: 0.55, ease: 'sine.out' }, 0)
          .to(w, { y: -34, duration: 2, ease: 'sine.out' }, 0)
          .to(w.scale, { x: 1.25, duration: 2, ease: 'sine.out' }, 0)
          .to(w, { alpha: 0, duration: 1.1, ease: 'sine.in' }, 0.9)
        tls.push(tl)
      })
      return tls
    },
    // KOPPEN SKVALPAR: kaffet slår mot kanterna, koppen vaggar, och ångan puffar upp.
    tryck() {
      const tl = tid()
      tl.to(krop, { rotation: 0.13, duration: 0.11, ease: 'power2.out' }, 0)
        .to(krop, { rotation: -0.1, duration: 0.16, ease: 'sine.inOut' })
        .to(krop, { rotation: 0.06, duration: 0.14, ease: 'sine.inOut' })
        .to(krop, { rotation: 0, duration: 0.42, ease: 'elastic.out(1, 0.5)' })
      // Ytan hänger efter kroppen — det är det som gör att den läser som vätska.
      tl.to(yta, { x: -7, y: 2, rotation: 0.1, duration: 0.14, ease: 'sine.inOut' }, 0.05)
        .to(yta, { x: 6, y: 0, rotation: -0.08, duration: 0.17, ease: 'sine.inOut' })
        .to(yta, { x: -3, rotation: 0.04, duration: 0.15, ease: 'sine.inOut' })
        .to(yta, { x: 0, y: 0, rotation: 0, duration: 0.36, ease: 'sine.out' })
      tl.to(krop, { y: v.vilo.y - 9, duration: 0.13, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.42, ease: 'bounce.out' }, 0.13)
      // Ångan puffar upp av rörelsen. Puffen ligger på BEHÅLLAREN `anga`, inte på de
      // enskilda slingorna — de ägs av ambient-slingan, och två tweens om samma `scale`
      // hade slagits om värdet (och en overwrite hade dödat ångan för gott).
      tl.to(anga.scale, { x: 1.3, y: 1.12, duration: 0.22, ease: 'power2.out' }, 0.03)
        .to(anga.scale, { x: 1, y: 1, duration: 0.62, ease: 'sine.inOut' }, 0.25)
    },
  }
}

// 6) KITTLA — en fjäder: två fan kring en spole, med små ritade strån längs skaftet.
// Fanet är en egen nod som böjer sig när fjädern viftar.
function byggKittla(v) {
  const { krop, tid } = v
  const FAN = 0xfff3d9
  const FAN_M = 0xe0cfae
  const SPETS = COLORS.pink
  const SPOLE = 0xd9a56b

  // Hela fjädern svänger kring spolens nedre ände.
  const stjalk = pivotNod(11, 52)

  const fan = new Container()
  const fg = new Graphics()
  // Vänstra fanet.
  fg.moveTo(-6, -48)
    .quadraticCurveTo(-42, -14, -12, 30)
    .quadraticCurveTo(-2, -8, -6, -48)
    .closePath()
    .fill(topLightFill(FAN, { highlight: 0.2, dark: 0.18 }))
    .stroke({ width: 2.5, color: FAN_M, join: 'round' })
  // Högra fanet, något fylligare.
  fg.moveTo(-6, -48)
    .quadraticCurveTo(30, -12, 4, 34)
    .quadraticCurveTo(0, -6, -6, -48)
    .closePath()
    .fill(topLightFill(FAN, { highlight: 0.12, dark: 0.24 }))
    .stroke({ width: 2.5, color: FAN_M, join: 'round' })
  // Stråna: korta streck ut från skaftet, det som gör en löv-form till en fjäder.
  for (let i = 0; i < 9; i++) {
    const t = 0.12 + i * 0.095
    const sx = -6 + t * 8
    const sy = -48 + t * 80
    const spann = Math.sin(Math.PI * (0.18 + t * 0.72)) * 26
    fg.moveTo(sx, sy).lineTo(sx - spann, sy + spann * 0.42).stroke({ width: 1.8, color: FAN_M, alpha: 0.6 })
    fg.moveTo(sx, sy).lineTo(sx + spann * 0.9, sy + spann * 0.46).stroke({ width: 1.8, color: FAN_M, alpha: 0.5 })
  }
  // Rosa spets — fjädern ska synas mot ett mörkt sovrum.
  fg.moveTo(-6, -48).quadraticCurveTo(-16, -34, -9, -24).quadraticCurveTo(0, -34, -6, -48).closePath().fill({ color: SPETS, alpha: 0.75 })
  fg.moveTo(-6, -48).quadraticCurveTo(6, -34, -3, -24).quadraticCurveTo(-2, -36, -6, -48).closePath().fill({ color: SPETS, alpha: 0.6 })
  fan.addChild(fg)

  const skaft = new Graphics()
  skaft.moveTo(-6, -48).quadraticCurveTo(0, 0, 11, 52).stroke({ width: 4.5, color: SPOLE, cap: 'round' })
  skaft.moveTo(-6, -48).quadraticCurveTo(0, 0, 11, 52).stroke({ width: 2, color: 0xf0d7ae, cap: 'round', alpha: 0.7 })
  skaft.circle(11, 52, 4).fill(shade(SPOLE, 0.2))

  stjalk.addChild(skaft, fan)
  krop.addChild(stjalk)
  krop.position.set(-2, -2)

  const aterstall = () => {
    if (!stjalk.destroyed) stjalk.rotation = 0
    if (!fan.destroyed) fan.scale.set(1)
  }

  return {
    skugga: { y: 58, rx: 24, ry: 8 },
    liv: { bob: 5, sway: 0.055, duration: 2.3 },
    aterstall,
    // FJÄDERN VIFTAR: skaftet svänger fram och tillbaka och fanet böjer sig i luftmotståndet.
    tryck() {
      const tl = tid()
      tl.to(stjalk, { rotation: -0.5, duration: 0.13, ease: 'power2.out' }, 0)
        .to(stjalk, { rotation: 0.42, duration: 0.16, ease: 'sine.inOut' })
        .to(stjalk, { rotation: -0.34, duration: 0.14, ease: 'sine.inOut' })
        .to(stjalk, { rotation: 0.24, duration: 0.13, ease: 'sine.inOut' })
        .to(stjalk, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.42)' })
      // Fanet släpar efter — det är böjningen som gör att den känns lätt.
      tl.to(fan.scale, { x: 0.82, y: 1.06, duration: 0.13, ease: 'power2.out' }, 0)
        .to(fan.scale, { x: 1.1, y: 0.95, duration: 0.16, ease: 'sine.inOut' })
        .to(fan.scale, { x: 0.9, y: 1.04, duration: 0.14, ease: 'sine.inOut' })
        .to(fan.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
      tl.to(krop, { y: v.vilo.y - 12, duration: 0.16, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.5, ease: 'bounce.out' }, 0.16)
    },
  }
}

// 7) BALLONG — en uppblåst ballong med knut, snöre och en liten träpinne att hålla i.
// Gummit är en egen nod: det är DEN som sväller inför smällen, medan pinnen står still.
function byggBallong(v) {
  const { krop, tid } = v
  const SKAL = 0xef5b5b
  const MORK = shade(SKAL, 0.34)

  const pinne = new Graphics()
  pinne.roundRect(-3.5, 30, 7, 30, 3.5).fill(cylinderFill(0xd9a56b, { axis: 'x' }))
    .stroke({ width: 2, color: shade(0xd9a56b, 0.3) })

  const snore = new Graphics()
  snore.moveTo(0, 30).quadraticCurveTo(-11, 20, -2, 12).quadraticCurveTo(7, 6, 0, 0)
    .stroke({ width: 2.6, color: 0xf0e2c8, cap: 'round' })

  // Gummit: droppform, bredast strax under mitten — en cirkel läser som en boll.
  const gummi = new Container()
  const bg = new Graphics()
  bg.moveTo(0, -62)
    .quadraticCurveTo(40, -60, 40, -20)
    .quadraticCurveTo(40, 8, 0, 12)
    .quadraticCurveTo(-40, 8, -40, -20)
    .quadraticCurveTo(-40, -60, 0, -62)
    .closePath()
    .fill(sphereFill(SKAL, { lightY: 0.26, dark: 0.36 }))
    .stroke({ width: 3.5, color: MORK, join: 'round' })
  bg.ellipse(-14, -38, 9, 14).fill({ color: COLORS.white, alpha: 0.5 })
  bg.ellipse(-19, -22, 4, 6).fill({ color: COLORS.white, alpha: 0.3 })
  // Knuten: den lilla trekanten som gör en oval till en ballong.
  bg.moveTo(-9, 9).lineTo(9, 9).lineTo(0, 26).closePath()
    .fill(topLightFill(SKAL, { dark: 0.34 })).stroke({ width: 2.5, color: MORK, join: 'round' })
  gummi.addChild(bg)

  krop.addChild(pinne, snore, gummi)
  krop.position.set(0, 4)

  const aterstall = () => {
    if (!gummi.destroyed) {
      gummi.scale.set(1)
      gummi.rotation = 0
    }
  }

  return {
    skugga: { y: 62, rx: 22, ry: 8 },
    liv: { bob: 6, sway: 0.05, duration: 2.5 },
    aterstall,
    // BALLONGEN BLÅSES UPP: gummit sväller i tre andetag och gnisslar tillbaka. Taket är
    // 1,18 — 40 px halva bredden × 1,18 = 47 px, långt innanför grannens träffyta (88).
    tryck() {
      const tl = tid()
      tl.to(gummi.scale, { x: 1.18, y: 1.14, duration: 0.13, ease: 'power2.out' }, 0)
        .to(gummi.scale, { x: 1.02, y: 1.05, duration: 0.14, ease: 'sine.inOut' }, 0.13)
        .to(gummi.scale, { x: 1.14, y: 1.1, duration: 0.12, ease: 'sine.inOut' }, 0.27)
        .to(gummi.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, 0.39)
      tl.to(gummi, { rotation: 0.1, duration: 0.09, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
        .to(gummi, { rotation: 0, duration: 0.24, ease: 'sine.out' }, 0.36)
      tl.to(krop, { y: v.vilo.y - 9, duration: 0.14, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.46, ease: 'sine.inOut' }, 0.14)
    },
  }
}

// 8) STRUMPA — en hopskrynklad, illaluktande strumpa: mudd, häl och tå i en enda böjd
// silhuett, med ett hål vid tån. Stanken stiger av sig själv (ambient) i gröna slingor —
// det är den som säger LUKT utan ett ord.
function byggStrumpa(v) {
  const { krop, tid } = v
  const TYG = 0xdfd6c2
  const TYG_M = shade(TYG, 0.28)
  const RAND = 0x9fb36b

  const stank = new Container()
  const slingor = []
  for (let i = 0; i < 3; i++) {
    const w = new Graphics()
    const x = -22 + i * 17
    w.moveTo(x, 0)
      .quadraticCurveTo(x - 7, -7, x, -14)
      .quadraticCurveTo(x + 7, -21, x, -26)
      .stroke({ width: 5, color: 0x9ed46a, cap: 'round', alpha: 0.9 })
    w.position.set(0, -16)
    w.alpha = 0
    stank.addChild(w)
    slingor.push(w)
  }

  // Strumpan som EN sluten kontur: mudd uppe till vänster, ner genom vristen, ut i tån.
  const tyg = new Container()
  const sg = new Graphics()
  sg.moveTo(-44, -34)
    .quadraticCurveTo(-52, -4, -40, 20)
    .quadraticCurveTo(-30, 42, 6, 44)
    .quadraticCurveTo(44, 46, 52, 26)
    .quadraticCurveTo(58, 10, 34, 4)
    .quadraticCurveTo(4, -2, -4, -18)
    .quadraticCurveTo(-8, -32, -14, -40)
    .closePath()
    .fill(topLightFill(TYG, { highlight: 0.2, dark: 0.26 }))
    .stroke({ width: 3.5, color: TYG_M, join: 'round' })
  // Mudden: ribbad kant, egen ton.
  sg.moveTo(-44, -34).quadraticCurveTo(-30, -46, -14, -40)
    .quadraticCurveTo(-18, -26, -22, -22)
    .quadraticCurveTo(-36, -22, -44, -34)
    .closePath()
    .fill(topLightFill(shade(TYG, 0.1), { dark: 0.2 })).stroke({ width: 3, color: TYG_M })
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    sg.moveTo(-43 + t * 28, -35 - t * 5).lineTo(-40 + t * 24, -24 - t * 2)
      .stroke({ width: 2, color: TYG_M, alpha: 0.6 })
  }
  // Ränder tvärs över foten.
  for (const [ax, ay, bx, by] of [[-24, 14, -16, 40], [-6, 12, 2, 43], [14, 8, 22, 42]]) {
    sg.moveTo(ax, ay).quadraticCurveTo((ax + bx) / 2 + 5, (ay + by) / 2, bx, by)
      .stroke({ width: 7, color: RAND, alpha: 0.55 })
  }
  // Hålet vid tån — smutsstrecken och hålet är det som gör den ANVÄND.
  sg.ellipse(40, 24, 9, 7).fill({ color: 0x6f6353, alpha: 0.75 })
  sg.ellipse(41, 23, 5.5, 4).fill({ color: 0xf1c9a2, alpha: 0.9 })
  sg.ellipse(-14, 26, 13, 8).fill({ color: 0xb9ae94, alpha: 0.5 })
  sg.ellipse(12, 30, 10, 6).fill({ color: 0xb9ae94, alpha: 0.4 })
  tyg.addChild(sg)

  krop.addChild(stank, tyg)
  krop.position.set(-2, 2)

  const aterstall = () => {
    if (!tyg.destroyed) {
      tyg.rotation = 0
      tyg.scale.set(1)
    }
  }

  return {
    skugga: { y: 50, rx: 46, ry: 10 },
    liv: { bob: 3, sway: 0.02, duration: 3.5 },
    aterstall,
    // Stanken stiger hela tiden — samma grepp som kaffets ånga, men grönt och långsammare.
    ambient(btid) {
      const tls = []
      slingor.forEach((w, i) => {
        const tl = btid({ repeat: -1, repeatDelay: 0.7, delay: i * 0.8 })
        tl.set(w, { y: -16, alpha: 0 }, 0)
          .set(w.scale, { x: 0.7, y: 1 }, 0)
          .to(w, { alpha: 0.7, duration: 0.6, ease: 'sine.out' }, 0)
          .to(w, { y: -38, duration: 2.2, ease: 'sine.out' }, 0)
          .to(w.scale, { x: 1.3, duration: 2.2, ease: 'sine.out' }, 0)
          .to(w, { alpha: 0, duration: 1.2, ease: 'sine.in' }, 1)
        tls.push(tl)
      })
      return tls
    },
    // STRUMPAN VIFTAS: den flaxar som en trasa och stanken pyser ut i en stöt.
    tryck() {
      const tl = tid()
      tl.to(tyg, { rotation: -0.22, duration: 0.12, ease: 'power2.out' }, 0)
        .to(tyg, { rotation: 0.18, duration: 0.15, ease: 'sine.inOut' })
        .to(tyg, { rotation: -0.1, duration: 0.13, ease: 'sine.inOut' })
        .to(tyg, { rotation: 0, duration: 0.44, ease: 'elastic.out(1, 0.45)' })
      tl.to(tyg.scale, { x: 1.06, y: 0.92, duration: 0.12, ease: 'power2.out' }, 0)
        .to(tyg.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2.2)' }, 0.14)
      tl.to(stank.scale, { x: 1.35, y: 1.2, duration: 0.24, ease: 'power2.out' }, 0.02)
        .to(stank.scale, { x: 1, y: 1, duration: 0.66, ease: 'sine.inOut' }, 0.26)
      tl.to(krop, { y: v.vilo.y - 8, duration: 0.13, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.44, ease: 'bounce.out' }, 0.13)
    },
  }
}

// 9) FICKLAMPA — ett räfflat rör med reflektorhuvud, lins och hängring. Ljuskäglan är en
// egen nod framför linsen som bara syns när knappen trycks; strömbrytaren rör sig på riktigt.
function byggLampa(v) {
  const { krop, tid } = v
  const SKAL = 0x4d5a6b
  const MORK = shade(SKAL, 0.4)
  const LJUS = 0xfff3b0

  // ⚠️ FICKLAMPAN ÄR DEN ENDA SAKEN VARS BILD BÄR EN RIKTNING, och den ska peka DIT den
  //    lyser. Vilovinkeln −0,6 rad riktar linsen UPP ÅT HÖGER, medan ficklampan landar
  //    till höger om pappa och strålen ritas åt VÄNSTER: lampan lyste alltså 180° fel
  //    (ägarens rapport). `sikta()` vrider den mot målet; `sikte` bär vinkeln så
  //    `tryck()`s rekyl och `aterstall()` inte drar tillbaka den till vilovinkeln.
  const LUT = -0.6
  let sikte = LUT
  const lampa = new Container()
  lampa.rotation = LUT

  // Käglan ligger i EGEN behållare vid linsen och växer kring sig själv — en skalning
  // kring lampans origo hade kastat spetsen rakt in i grannknappens träffyta.
  const kagla = new Container()
  kagla.position.set(28, 0)
  const kg = new Graphics()
  kg.moveTo(0, -14).lineTo(42, -28).lineTo(42, 28).lineTo(0, 14).closePath()
    .fill({ color: LJUS, alpha: 0.55 })
  kg.moveTo(0, -9).lineTo(38, -17).lineTo(38, 17).lineTo(0, 9).closePath()
    .fill({ color: 0xfffdf0, alpha: 0.5 })
  kagla.addChild(kg)
  kagla.alpha = 0

  const ror = new Graphics()
  ror.roundRect(-46, -13, 66, 26, 12).fill(cylinderFill(SKAL, { axis: 'y' })).stroke({ width: 3, color: MORK })
  for (let i = 0; i < 5; i++) {
    ror.moveTo(-40 + i * 9, -11).lineTo(-40 + i * 9, 11).stroke({ width: 3, color: MORK, alpha: 0.45 })
  }
  // Bakänden med hängringen.
  ror.circle(-50, 0, 7).stroke({ width: 4, color: MORK })
  // Reflektorhuvudet: konen som vidgas mot linsen.
  ror.moveTo(14, -15).lineTo(30, -22).lineTo(30, 22).lineTo(14, 15).closePath()
    .fill(cylinderFill(0x7b8899, { axis: 'y', dark: 0.32 })).stroke({ width: 3, color: MORK, join: 'round' })
  ror.ellipse(30, 0, 6, 22).fill(topLightFill(0xfff8d8, { highlight: 0.4, dark: 0.1 })).stroke({ width: 3, color: MORK })
  ror.ellipse(29, 0, 3.5, 13).fill({ color: 0xfffdf0, alpha: 0.9 })

  // Strömbrytaren — en liten knopp som verkligen glider fram.
  const knapp = new Container()
  const kb = new Graphics()
  kb.roundRect(-16, -20, 15, 10, 4).fill(topLightFill(0xe06060, { dark: 0.3 })).stroke({ width: 2.5, color: 0x8f3a3a })
  knapp.addChild(kb)

  lampa.addChild(kagla, ror, knapp)
  krop.addChild(lampa)
  krop.position.set(-4, 2)

  const aterstall = () => {
    if (!kagla.destroyed) {
      kagla.alpha = 0
      kagla.scale.set(1)
    }
    if (!knapp.destroyed) knapp.x = 0
    if (!lampa.destroyed) lampa.rotation = sikte
  }

  return {
    skugga: { y: 56, rx: 40, ry: 10 },
    liv: { bob: 3.5, sway: 0.024, duration: 3 },
    aterstall,

    // Linsens nod — spelet ritar sin stora ljuskägla ur DEN och inte ur lampans mitt.
    stralNod: kagla,

    /**
     * Rikta linsen längs `vinkel` (rad, 0 = åt höger). `null` = tillbaka till vilovinkeln.
     *
     * ⚠️ SPEGLINGEN SITTER PÅ `scale.y`, INTE PÅ `scale.x`. En x-spegling flyttar linsen
     *    till fel sida av röret och strålen hade utgått ur bakänden; en y-spegling vänder
     *    bara röret rätt igen när det pekar åt vänster (strömbrytaren stannar uppe).
     */
    sikta(vinkel) {
      if (lampa.destroyed) return
      sikte = vinkel == null ? LUT : vinkel
      gsap.killTweensOf(lampa)
      lampa.scale.y = Math.cos(sikte) < 0 ? -1 : 1
      gsap.to(lampa, { rotation: sikte, duration: 0.16, ease: 'power2.out' })
    },
    // KLICK: knoppen glider fram, käglan tänds med ett ryck och lampan rekylerar lite.
    tryck() {
      const tl = tid()
      tl.to(knapp, { x: 9, duration: 0.07, ease: 'power2.out' }, 0)
        .to(knapp, { x: 0, duration: 0.4, ease: 'back.out(2.4)' }, 0.9)
      tl.to(kagla, { alpha: 1, duration: 0.06, ease: 'power2.out' }, 0.05)
        .to(kagla, { alpha: 0.75, duration: 0.1, ease: 'sine.inOut' }, 0.13)
        .to(kagla, { alpha: 1, duration: 0.1, ease: 'sine.inOut' }, 0.23)
        .to(kagla, { alpha: 0, duration: 0.4, ease: 'power2.in' }, 0.7)
      tl.to(kagla.scale, { x: 1.12, y: 1.06, duration: 0.5, ease: 'sine.out' }, 0.05)
        .set(kagla.scale, { x: 1, y: 1 }, 1.12)
      // Rekylen går kring SIKTET, inte kring vilovinkeln — annars svänger en riktad
      // ficklampa tillbaka till hyllposen mitt i att den lyser på pappa.
      tl.to(lampa, { rotation: sikte + 0.1, duration: 0.08, ease: 'power2.out' }, 0)
        .to(lampa, { rotation: sikte, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 0.08)
      squash(krop, { intensity: 0.35 })
    },
  }
}

// 10) VATTENSPRUTA — en sprayflaska: kropp med SYNLIG vattennivå (egen nod som skvalpar),
// hals, avtryckare på egen nod och ett munstycke. Dropparna är tre ritade droppar som
// skjuts ut ur munstycket vid tryck.
function byggSpruta(v) {
  const { krop, tid } = v
  const PLAST = 0x9fd9e8
  const PLAST_M = shade(PLAST, 0.34)
  const VATTEN = 0x4aa3df
  const GRA = 0x8894a3

  const flaska = new Graphics()
  flaska.moveTo(-26, -6)
    .quadraticCurveTo(-30, 24, -26, 46)
    .quadraticCurveTo(-24, 54, -14, 55)
    .lineTo(14, 55)
    .quadraticCurveTo(24, 54, 26, 46)
    .quadraticCurveTo(30, 24, 26, -6)
    .closePath()
    .fill(topLightFill(PLAST, { highlight: 0.3, dark: 0.2 }))
    .stroke({ width: 3.5, color: PLAST_M, join: 'round' })

  // Vattnet: egen nod, så den kan skvalpa oberoende av flaskan.
  const vatten = new Container()
  const vg = new Graphics()
  vg.moveTo(-24, 10).quadraticCurveTo(0, 4, 24, 10).lineTo(24, 46)
    .quadraticCurveTo(22, 52, 12, 52).lineTo(-12, 52)
    .quadraticCurveTo(-22, 52, -24, 46).closePath()
    .fill(verticalFill(0x7fc4ea, VATTEN))
  vg.moveTo(-24, 10).quadraticCurveTo(0, 4, 24, 10).stroke({ width: 3, color: 0x8fd0f5, alpha: 0.9 })
  vg.circle(-12, 26, 4).fill({ color: COLORS.white, alpha: 0.35 })
  vatten.addChild(vg)

  const etikett = new Graphics()
  etikett.roundRect(-19, 18, 38, 22, 6).fill({ color: 0xfffdf7, alpha: 0.85 }).stroke({ width: 2.5, color: PLAST_M })
  etikett.moveTo(-12, 26).quadraticCurveTo(-6, 20, 0, 26).quadraticCurveTo(6, 33, 0, 35)
    .quadraticCurveTo(-8, 34, -12, 26).closePath().fill({ color: VATTEN, alpha: 0.85 })
  etikett.moveTo(6, 24).lineTo(15, 24).moveTo(6, 31).lineTo(13, 31)
    .stroke({ width: 2.5, color: 0x9aa7b4 })

  const hals = new Graphics()
  hals.roundRect(-13, -20, 26, 18, 5).fill(cylinderFill(GRA, { axis: 'x' })).stroke({ width: 2.5, color: shade(GRA, 0.34) })

  // Sprayhuvudet + munstycket, riktat uppåt-höger.
  const huvud = new Graphics()
  huvud.moveTo(-16, -22).lineTo(16, -22).quadraticCurveTo(26, -24, 30, -34)
    .lineTo(38, -42).lineTo(30, -50).lineTo(18, -40)
    .quadraticCurveTo(10, -36, -4, -36).lineTo(-16, -36).closePath()
    .fill(topLightFill(GRA, { highlight: 0.24, dark: 0.3 }))
    .stroke({ width: 3, color: shade(GRA, 0.4), join: 'round' })
  huvud.circle(33, -45, 3.4).fill(shade(GRA, 0.5))

  // Avtryckaren: egen nod med vridpunkt uppe, så den verkligen kläms in.
  const avtryck = pivotNod(-14, -32)
  const ag = new Graphics()
  ag.moveTo(-14, -32).quadraticCurveTo(-30, -26, -30, -12)
    .quadraticCurveTo(-24, -14, -18, -20).quadraticCurveTo(-12, -26, -8, -30).closePath()
    .fill(topLightFill(GRA, { dark: 0.3 })).stroke({ width: 2.5, color: shade(GRA, 0.42), join: 'round' })
  avtryck.addChild(ag)

  // Dropparna ur munstycket — egen behållare vid munstycket, växer kring sig själv.
  const stralen = new Container()
  stralen.position.set(36, -46)
  const dg = new Graphics()
  for (const [dx, dy, r] of [[8, -6, 5], [18, -11, 4], [26, -18, 3]]) {
    dg.moveTo(dx, dy - r * 1.6).quadraticCurveTo(dx + r, dy, dx, dy + r)
      .quadraticCurveTo(dx - r, dy, dx, dy - r * 1.6).closePath()
      .fill({ color: 0x9fd9f5, alpha: 0.95 })
  }
  stralen.addChild(dg)
  stralen.alpha = 0

  krop.addChild(flaska, vatten, etikett, hals, huvud, avtryck, stralen)
  krop.position.set(-4, -2)

  const aterstall = () => {
    if (!avtryck.destroyed) avtryck.rotation = 0
    if (!vatten.destroyed) {
      vatten.position.set(0, 0)
      vatten.rotation = 0
    }
    if (!stralen.destroyed) {
      stralen.alpha = 0
      stralen.scale.set(1)
    }
  }

  return {
    skugga: { y: 60, rx: 32, ry: 9 },
    liv: { bob: 3, sway: 0.018, duration: 3.2 },
    aterstall,
    // PSST: avtryckaren kläms, vattnet skvalpar bakåt och tre droppar far ut ur munstycket.
    tryck() {
      const tl = tid()
      tl.to(avtryck, { rotation: 0.42, duration: 0.07, ease: 'power2.out' }, 0)
        .to(avtryck, { rotation: 0, duration: 0.34, ease: 'back.out(2.6)' }, 0.12)
        .to(avtryck, { rotation: 0.36, duration: 0.07, ease: 'power2.out' }, 0.46)
        .to(avtryck, { rotation: 0, duration: 0.4, ease: 'back.out(2.4)' }, 0.55)
      tl.to(vatten, { x: -5, rotation: 0.07, duration: 0.12, ease: 'sine.inOut' }, 0.04)
        .to(vatten, { x: 4, rotation: -0.05, duration: 0.16, ease: 'sine.inOut' })
        .to(vatten, { x: 0, rotation: 0, duration: 0.4, ease: 'sine.out' })
      tl.to(stralen, { alpha: 1, duration: 0.05, ease: 'power2.out' }, 0.05)
        .to(stralen, { alpha: 0, duration: 0.3, ease: 'power2.in' }, 0.2)
        .to(stralen, { alpha: 1, duration: 0.05, ease: 'power2.out' }, 0.5)
        .to(stralen, { alpha: 0, duration: 0.3, ease: 'power2.in' }, 0.62)
      tl.to(stralen.scale, { x: 1.5, y: 1.25, duration: 0.42, ease: 'power2.out' }, 0.05)
        .set(stralen.scale, { x: 1, y: 1 }, 0.5)
      tl.to(krop, { rotation: -0.08, duration: 0.07, ease: 'power2.out' }, 0)
        .to(krop, { rotation: 0, duration: 0.44, ease: 'elastic.out(1, 0.45)' }, 0.09)
    },
  }
}

// 11) BORDSFLÄKT — galler med ekrar, TRE blad på en egen roterande nod bakom gallret, en
// hals och en tung fot. Bladen snurrar långsamt hela tiden (ambient) och rusar vid tryck.
function byggFlakt(v) {
  const { krop, tid } = v
  const HOLJE = 0x6fb3c9
  const MORK = shade(HOLJE, 0.36)
  const METALL = 0xd7dee6

  const fot = new Graphics()
  fot.ellipse(0, 56, 34, 11).fill(topLightFill(HOLJE, { dark: 0.32 })).stroke({ width: 3, color: MORK })
  fot.roundRect(-26, 44, 52, 14, 7).fill(cylinderFill(HOLJE, { axis: 'x' })).stroke({ width: 3, color: MORK })
  fot.roundRect(-6, 16, 12, 32, 6).fill(cylinderFill(shade(HOLJE, 0.16), { axis: 'x' })).stroke({ width: 3, color: MORK })

  // Bladen: tre skovlar kring navet, egen nod = de snurrar på riktigt.
  const blad = new Container()
  blad.position.set(0, -14)
  const bg = new Graphics()
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const px = (rx, ry) => [c * rx - s * ry, s * rx + c * ry]
    const [x1, y1] = px(8, -6)
    const [x2, y2] = px(32, -16)
    const [x3, y3] = px(34, 8)
    const [x4, y4] = px(9, 7)
    bg.moveTo(x1, y1).quadraticCurveTo((x1 + x2) / 2 - s * 8, (y1 + y2) / 2 + c * 8, x2, y2)
      .quadraticCurveTo(x3, y3, x4, y4).closePath()
      .fill(topLightFill(METALL, { highlight: 0.3, dark: 0.26 }))
      .stroke({ width: 2.5, color: 0x9aa7b4, join: 'round' })
  }
  bg.circle(0, 0, 8).fill(sphereFill(0xb8c2cc)).stroke({ width: 2.5, color: 0x8d99a6 })
  blad.addChild(bg)

  // Gallret framför bladen: ringar + ekrar, allt i EN Graphics.
  const galler = new Graphics()
  galler.circle(0, -14, 40).fill({ color: 0xffffff, alpha: 0.07 })
  for (const r of [16, 26, 36]) galler.circle(0, -14, r).stroke({ width: 2.4, color: 0xeaf1f6, alpha: 0.75 })
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    galler.moveTo(Math.cos(a) * 7, -14 + Math.sin(a) * 7)
      .lineTo(Math.cos(a) * 39, -14 + Math.sin(a) * 39)
      .stroke({ width: 2, color: 0xeaf1f6, alpha: 0.6 })
  }
  galler.circle(0, -14, 41).stroke({ width: 5, color: HOLJE })
  galler.circle(0, -14, 41).stroke({ width: 2, color: MORK, alpha: 0.6 })

  // Vindbågarna ut ur gallret — osynliga i vila, egen behållare vid gallrets kant.
  const vind = new Container()
  vind.position.set(44, -14)
  const vg = new Graphics()
  for (const r of [8, 15, 22]) {
    vg.arc(0, 0, r, -0.8, 0.8).stroke({ width: 3.4, color: 0xdff2ff, cap: 'round' })
  }
  vind.addChild(vg)
  vind.alpha = 0

  krop.addChild(fot, blad, galler, vind)
  krop.position.set(0, -6)

  // ⚠️ BLADEN HAR INGEN AMBIENT-SNURR MED FLIT. En evig `rotation`-tween och trycket rör
  //    SAMMA egenskap, och gsap skriver då om varandra varje bildruta (samma fälla som
  //    kattens zzz). En avstängd fläkt SKA dessutom stå stilla — bladen behåller den vinkel
  //    de stannade på, vilket är sant och gratis.
  const aterstall = () => {
    if (!vind.destroyed) {
      vind.alpha = 0
      vind.scale.set(1)
    }
  }

  return {
    skugga: { y: 62, rx: 36, ry: 9 },
    liv: { bob: 2.5, sway: 0.012, duration: 3.4 },
    aterstall,
    // FULL FART: bladen rusar ett par varv och vindbågarna far ut ur gallret.
    tryck() {
      const tl = tid()
      tl.to(blad, { rotation: `+=${Math.PI * 8}`, duration: 1.1, ease: 'power2.out' }, 0)
      tl.to(vind, { alpha: 0.95, duration: 0.09, ease: 'power2.out' }, 0.04)
        .to(vind, { alpha: 0, duration: 0.5, ease: 'power2.in' }, 0.5)
      tl.to(vind.scale, { x: 1.5, y: 1.3, duration: 0.9, ease: 'power2.out' }, 0.04)
        .set(vind.scale, { x: 1, y: 1 }, 1)
      tl.to(krop, { rotation: -0.05, duration: 0.06, ease: 'sine.inOut', yoyo: true, repeat: 9 }, 0)
        .to(krop, { rotation: 0, duration: 0.2, ease: 'sine.out' }, 0.62)
    },
  }
}

// 12) HUNDVALP — en sittande valp i sidovy: bakdel, framben, bringa, huvud med nos och ett
// slokande öra, plus en svans på egen nod. Örat och svansen är egna noder — det är de som
// lever när hon vaknar. (Den som far iväg till sängen är en KOPIA av samma bygge.)
function byggHund(v) {
  const { krop, tid } = v
  const PALS = 0xd7a86e
  const MORK = shade(PALS, 0.34)
  const LJUS = 0xf6e3c6

  const svans = pivotNod(-34, 18)
  const sv = new Graphics()
  sv.moveTo(-34, 18).quadraticCurveTo(-58, 12, -54, -12).stroke({ width: 13, color: MORK, cap: 'round' })
  sv.moveTo(-34, 18).quadraticCurveTo(-58, 12, -54, -12).stroke({ width: 8, color: PALS, cap: 'round' })
  sv.circle(-54, -12, 5).fill(LJUS)
  svans.addChild(sv)

  const kropp = new Graphics()
  // Sittande bakdel + bringa som lutar framåt.
  kropp.ellipse(-18, 22, 32, 28).fill(sphereFill(PALS, { lightY: 0.22, dark: 0.3 })).stroke({ width: 3.5, color: MORK })
  kropp.moveTo(-38, 4).quadraticCurveTo(-10, -16, 16, -6)
    .quadraticCurveTo(30, 2, 28, 30).quadraticCurveTo(20, 48, -12, 48)
    .quadraticCurveTo(-40, 46, -38, 4).closePath()
    .fill(topLightFill(PALS, { highlight: 0.2, dark: 0.24 })).stroke({ width: 3.5, color: MORK, join: 'round' })
  // Framben med tassar.
  for (const bx of [6, 22]) {
    kropp.roundRect(bx - 7, 20, 14, 30, 7).fill(topLightFill(PALS, { dark: 0.2 })).stroke({ width: 3, color: MORK })
    kropp.ellipse(bx, 50, 10, 6).fill(LJUS).stroke({ width: 2.5, color: MORK })
  }
  kropp.ellipse(2, 20, 18, 14).fill({ color: LJUS, alpha: 0.75 })

  const huvud = pivotNod(14, -12)
  const hg = new Graphics()
  hg.circle(20, -30, 25).fill(sphereFill(PALS, { lightY: 0.24, dark: 0.28 })).stroke({ width: 3.5, color: MORK })
  // Nosparti + svart nos.
  hg.ellipse(42, -22, 16, 12).fill(topLightFill(LJUS, { dark: 0.16 })).stroke({ width: 3, color: MORK })
  hg.ellipse(52, -26, 6.5, 5).fill(0x3a2f2a)
  hg.moveTo(42, -18).lineTo(42, -12).stroke({ width: 2.5, color: MORK })
  hg.moveTo(42, -12).quadraticCurveTo(35, -9, 33, -14)
    .moveTo(42, -12).quadraticCurveTo(49, -9, 51, -14).stroke({ width: 2.5, color: MORK })
  // Ögat: slutet i vila (hon sover), locket ritat som en båge.
  hg.circle(30, -36, 6).fill(LJUS)
  huvud.addChild(hg)

  const oga = new Graphics()
  oga.circle(30, -36, 5.5).fill(PALS)
  oga.moveTo(25, -35).quadraticCurveTo(30, -41, 35, -35).stroke({ width: 2.6, color: COLORS.ink, cap: 'round' })
  huvud.addChild(oga)

  // Slokörat: egen nod med vridpunkt uppe vid skallen.
  const oraNod = pivotNod(10, -44)
  const og = new Graphics()
  og.moveTo(10, -44).quadraticCurveTo(-8, -40, -6, -14)
    .quadraticCurveTo(-2, -4, 8, -10).quadraticCurveTo(16, -22, 10, -44).closePath()
    .fill(topLightFill(shade(PALS, 0.18), { dark: 0.24 })).stroke({ width: 3, color: MORK, join: 'round' })
  oraNod.addChild(og)
  huvud.addChild(oraNod)

  // Två små z:n — hon sover på nattduksbordet tills hon används.
  const zzz = new Container()
  const zg = new Graphics()
  const ritZ = (x, y, s) => {
    zg.moveTo(x - 6 * s, y - 6 * s).lineTo(x + 6 * s, y - 6 * s)
      .lineTo(x - 6 * s, y + 6 * s).lineTo(x + 6 * s, y + 6 * s)
      .stroke({ width: 3.4 * s, color: 0xdfe9f5, cap: 'round', join: 'round' })
  }
  ritZ(46, -54, 0.92)
  ritZ(60, -66, 0.66)
  zzz.addChild(zg)
  zzz.alpha = 0.85

  krop.addChild(svans, kropp, huvud, zzz)
  krop.position.set(-6, 4)

  let ambTl = null
  const aterstall = () => {
    if (!oga.destroyed) oga.alpha = 1
    if (!oraNod.destroyed) oraNod.rotation = 0
    if (!svans.destroyed) svans.rotation = 0
    if (!huvud.destroyed) huvud.rotation = 0
    if (!zzz.destroyed) {
      zzz.alpha = 0.85
      zzz.position.set(0, 0)
    }
    if (ambTl?.parent) ambTl.play(0)
  }

  return {
    skugga: { y: 54, rx: 42, ry: 10 },
    liv: { bob: 3, sway: 0.014, duration: 3.3 },
    aterstall,
    ambient(btid) {
      ambTl = btid({ repeat: -1 })
      ambTl.to(zzz, { y: -12, alpha: 0.3, duration: 1.9, ease: 'sine.inOut' }, 0)
        .to(zzz, { y: 0, alpha: 0.85, duration: 1.9, ease: 'sine.inOut' }, 1.9)
      return ambTl
    },
    // VALPEN VAKNAR: ögat far upp, örat flaxar, svansen viftar och hon skuttar till.
    tryck() {
      if (ambTl?.parent) ambTl.pause(0)
      const tl = tid()
      tl.to(oga, { alpha: 0, duration: 0.08 }, 0)
        .to(oga, { alpha: 1, duration: 0.3 }, 1.6)
      tl.to(zzz, { alpha: 0, y: -20, duration: 0.3, ease: 'power2.out' }, 0)
        .to(zzz, { alpha: 0.85, y: 0, duration: 0.5, ease: 'sine.inOut' }, 1.6)
      tl.to(huvud, { rotation: -0.24, duration: 0.14, ease: 'back.out(2.6)' }, 0)
        .to(huvud, { rotation: 0.08, duration: 0.22, ease: 'sine.inOut' }, 0.34)
        .to(huvud, { rotation: 0, duration: 0.4, ease: 'sine.inOut' }, 0.6)
      tl.to(oraNod, { rotation: -0.5, duration: 0.12, ease: 'power2.out' }, 0)
        .to(oraNod, { rotation: 0.24, duration: 0.16, ease: 'sine.inOut' }, 0.12)
        .to(oraNod, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, 0.3)
      tl.to(svans, { rotation: -0.6, duration: 0.11, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0.05)
        .to(svans, { rotation: 0, duration: 0.24, ease: 'sine.out' }, 0.75)
      tl.to(krop, { y: v.vilo.y - 11, duration: 0.14, ease: 'power2.out' }, 0)
        .to(krop, { y: v.vilo.y, duration: 0.5, ease: 'bounce.out' }, 0.14)
      tl.call(() => {
        if (ambTl?.parent) ambTl.play(0)
      }, null, 2.1)
    },
  }
}

const BYGG = {
  klocka: byggKlocka,
  katt: byggKatt,
  trumpet: byggTrumpet,
  gardin: byggGardin,
  kaffe: byggKaffe,
  kittla: byggKittla,
  ballong: byggBallong,
  strumpa: byggStrumpa,
  lampa: byggLampa,
  spruta: byggSpruta,
  flakt: byggFlakt,
  hund: byggHund,
}

// --- fabriken för verktygen -------------------------------------------------

export function makeVerktyg(key) {
  const nyckel = BYGG[key] ? key : VERKTYG[0]

  const view = new Container()
  const livnod = new Container() // feedback.liv äger den här nodens y + rotation
  const krop = new Container() // allt ritat; tryck-reaktionen äger den här
  livnod.addChild(krop)

  let dod = false
  const reaktion = tidHall(krop) // dödas före varje nytt tryck
  const bakgrund = tidHall(krop) // ambient (ånga, zzz) — överlever ett tryck
  let livTw = null

  const v = { krop, tid: reaktion.tid, vilo: { x: 0, y: 0 } }
  const spec = BYGG[nyckel](v)
  v.vilo.x = krop.x
  v.vilo.y = krop.y

  const sk = spec.skugga || {}
  view.addChild(skuggNod(sk.y ?? 54, sk.rx ?? 40, sk.ry ?? 10), livnod)

  // Nollställ allt en rörelse kan ha lämnat efter sig, så nästa tryck startar från
  // viloläget i stället för mitt i det förra.
  const stoppa = () => {
    reaktion.doda()
    gsap.killTweensOf(krop)
    gsap.killTweensOf(krop.scale)
    gsap.killTweensOf(krop.position)
    if (!krop.destroyed) {
      krop.position.set(v.vilo.x, v.vilo.y)
      krop.scale.set(1)
      krop.rotation = 0
    }
    spec.aterstall?.()
  }

  return {
    key: nyckel,
    view,
    hitR: HIT_R,

    // Sakens EGEN reaktion i samma sekund den trycks — aldrig en generisk pop.
    tryck() {
      if (dod || krop.destroyed) return
      stoppa()
      spec.tryck()
    },

    /**
     * Vänder saken (hunden som visar rumpan). Speglingen sitter på LIVNODEN och aldrig på
     * `view.scale`: den senare ägs av `DragController`s val-puls (en evig yoyo-tween om
     * samma `scale.x`), och två tweens om samma egenskap skriver om varandra varje bildruta
     * — vändningen hade blivit en osynlig nollverkan. `krop.scale` går bort av samma skäl,
     * den ägs av tryck-reaktionerna.
     */
    vand(sx) {
      if (dod || livnod.destroyed) return
      gsap.to(livnod.scale, { x: sx < 0 ? -1 : 1, duration: 0.24, ease: 'back.out(2)' })
    },

    /**
     * Riktar en sak vars BILD bär en riktning (i dag bara ficklampan) längs `vinkel` i
     * radianer, 0 = åt höger. `null` återställer vilovinkeln. Saknar saken en riktning är
     * anropet en nollåtgärd — spelet behöver inte veta vilka som har en.
     */
    sikta(vinkel) {
      if (dod || krop.destroyed) return
      spec.sikta?.(vinkel)
    },

    /**
     * Var strålen ska UTGÅ ifrån, i designkoordinater (`getGlobalPosition` × appens skala
     * är fel — vyerna ligger i ett lager utan egen transform, så förälderns lokala rum ÄR
     * designrummet). `null` när saken inte har någon utgångspunkt.
     */
    stralPunkt() {
      const n = spec.stralNod
      if (dod || !n || n.destroyed || !view.parent || view.destroyed) return null
      return view.parent.toLocal(n.getGlobalPosition())
    },

    // Vilo-rörelse med EGEN slumpad fas + sakens eventuella ambient (ånga, zzz).
    liv() {
      if (dod || livnod.destroyed) return
      livTw?.kill()
      bakgrund.doda()
      livnod.y = 0
      livnod.rotation = 0
      const o = spec.liv || {}
      livTw = fbLiv(livnod, {
        bob: o.bob ?? 4,
        sway: o.sway ?? 0.025,
        duration: o.duration ?? 2.8,
        phase: Math.random(),
      })
      // Ambient-slingorna får bakgrundens tid() SOM ARGUMENT. (Att byta ut `v.tid` hade
      // varit verkningslöst: byggarna destrukturerar `const { tid } = v` en gång vid
      // bygget och håller kvar den referensen för alltid.)
      spec.ambient?.(bakgrund.tid)
      return livTw
    },

    destroy() {
      if (dod) return
      dod = true
      reaktion.doda()
      bakgrund.doda()
      livTw?.kill()
      livTw = null
      // killTweensOf(roten) når BARA roten: bjällror, ventiler, ånga, zzz och fjäderfan
      // ligger en nivå in och överlever annars rivningen helt tyst.
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

// --- katten som går ut på kudden -------------------------------------------
// Sedd från SIDAN, ~110 px hög: avlång kropp, huvud på egen nod (så den kan lyftas och
// luta), fyra ben på egna noder med vridpunkt i höften (så den verkligen går), och en
// svans som är en egen roterbar nod. Hela poängen är att den ska läsa som en riktig katt
// när den promenerar rakt över pappas ansikte.

export function makeKatt() {
  const view = new Container()
  const livnod = new Container() // liv äger den här
  const krop = new Container() // reaktioner + vändning äger den här
  livnod.addChild(krop)

  let dod = false
  const reaktion = tidHall(krop)
  const gang = tidHall(krop)
  let livTw = null

  const PALS = 0xb6c0cc
  const MORK = shade(PALS, 0.32)
  const LJUS = 0xfff3d9
  const OX = -6 // förskjutning så den ritade katten ligger centrerad i (0,0)
  const OY = 8

  const rit = new Container()
  rit.position.set(OX, OY)

  // Svansen — bakom kroppen, egen nod med vridpunkt i svansroten.
  const svans = pivotNod(-40, 0)
  const svg = new Graphics()
  svg.moveTo(-40, 0).quadraticCurveTo(-70, -8, -62, -42).stroke({ width: 16, color: MORK, cap: 'round' })
  svg.moveTo(-40, 0).quadraticCurveTo(-70, -8, -62, -42).stroke({ width: 11, color: PALS, cap: 'round' })
  svg.circle(-62, -42, 5.5).fill(LJUS)
  svans.addChild(svg)

  // Benen: bak först (de ska ligga bakom kroppen), fram sedan.
  const mkBen = (hx, hy, langd, mork) => {
    const b = pivotNod(hx, hy)
    const g = new Graphics()
    g.roundRect(hx - 6.5, hy, 13, langd, 6).fill(mork ? shade(PALS, 0.18) : topLightFill(PALS, { dark: 0.24 }))
      .stroke({ width: 3, color: MORK })
    g.ellipse(hx, hy + langd + 1, 9.5, 5.5).fill(mork ? shade(LJUS, 0.16) : LJUS).stroke({ width: 2.5, color: MORK })
    b.addChild(g)
    return b
  }
  const bakBort = mkBen(-34, 16, 26, true)
  const bakNara = mkBen(-22, 18, 26, false)
  const framBort = mkBen(16, 16, 26, true)
  const framNara = mkBen(28, 18, 26, false)

  const kropp = new Graphics()
  kropp.ellipse(-4, 4, 42, 26).fill(sphereFill(PALS, { lightY: 0.22, dark: 0.3 })).stroke({ width: 4, color: MORK })
  // Bringan som möter halsen — annars slutar kroppen tvärt i en ellipskant.
  kropp.circle(28, 4, 21).fill(sphereFill(PALS, { lightY: 0.2, dark: 0.28 })).stroke({ width: 4, color: MORK })
  kropp.circle(28, 4, 18).fill(topLightFill(PALS, { highlight: 0.18, dark: 0.2 }))
  // Ryggens linje.
  kropp.moveTo(-40, -2).quadraticCurveTo(-6, -22, 26, -14).stroke({ width: 3, color: MORK, alpha: 0.35 })

  // Huvudet: egen nod med vridpunkt i nacken, så det kan lyftas när hon jamar.
  const huvud = pivotNod(40, -12)
  const hg = new Graphics()
  // Öron bakom skallen.
  hg.moveTo(24, -38).lineTo(28, -62).lineTo(46, -46).closePath().fill(PALS).stroke({ width: 3, color: MORK, join: 'round' })
  hg.moveTo(46, -46).lineTo(58, -62).lineTo(60, -38).closePath().fill(PALS).stroke({ width: 3, color: MORK, join: 'round' })
  hg.moveTo(28, -56).lineTo(31, -44).lineTo(41, -47).closePath().fill({ color: 0xffc9de, alpha: 0.85 })
  hg.moveTo(56, -56).lineTo(56, -44).lineTo(48, -47).closePath().fill({ color: 0xffc9de, alpha: 0.85 })
  hg.circle(42, -28, 25).fill(sphereFill(PALS, { lightY: 0.24, dark: 0.28 })).stroke({ width: 4, color: MORK })
  // Nos + mule.
  hg.ellipse(56, -18, 13, 10).fill(LJUS)
  hg.moveTo(58, -26).lineTo(66, -25).lineTo(62, -19).closePath().fill(0xe08aa0)
  // Ett öga (sidovy) med glans.
  hg.circle(50, -32, 5.5).fill(0x2b2b2b)
  hg.circle(52, -34, 2).fill(COLORS.white)
  // Morrhår.
  for (const [wy, wd] of [[-22, -4], [-18, 0], [-14, 4]]) {
    hg.moveTo(62, wy).quadraticCurveTo(76, wy + wd - 3, 84, wy + wd).stroke({ width: 2, color: LJUS, alpha: 0.8, cap: 'round' })
  }
  huvud.addChild(hg)

  // Munnen: en egen nod som gapar vid jam. Skalan är 0 i vila.
  const mun = new Container()
  mun.position.set(58, -14)
  const mg = new Graphics()
  mg.ellipse(0, 0, 8, 7).fill(0x8a3f4f).stroke({ width: 2, color: MORK })
  mg.ellipse(0, 3.5, 5, 3.5).fill(0xef8fa5)
  mun.addChild(mg)
  mun.scale.set(0)
  huvud.addChild(mun)

  rit.addChild(svans, bakBort, framBort, kropp, bakNara, framNara, huvud)
  krop.addChild(rit)

  view.addChild(skuggNod(OY + 46, 44, 11), livnod)

  const BEN = [bakBort, bakNara, framBort, framNara]
  const FAS = [0, Math.PI, Math.PI * 0.85, Math.PI * 1.85] // diagonalgång
  const SVANS_VILA = -0.1
  svans.rotation = SVANS_VILA

  const nollaBen = () => {
    for (const b of BEN) if (!b.destroyed) b.rotation = 0
    if (!rit.destroyed) rit.y = 0
  }

  const stoppa = () => {
    reaktion.doda()
    gsap.killTweensOf(krop.scale)
    if (!krop.destroyed) krop.scale.set(krop.scale.x < 0 ? -1 : 1, 1)
    if (!svans.destroyed) svans.rotation = SVANS_VILA
    if (!huvud.destroyed) huvud.rotation = 0
    if (!mun.destroyed) mun.scale.set(0)
  }

  return {
    view,

    // Promenerar till en punkt med tassar som verkligen rör sig. `klar` kallas när hon är
    // framme — men aldrig efter att spelet rivits.
    gaTill(x, y, klar) {
      if (dod || view.destroyed) return
      gang.doda()
      const dx = x - view.x
      const dy = y - view.y
      const langd = Math.hypot(dx, dy)
      const tidsatgang = Math.max(0.55, Math.min(2.6, langd / 165))
      // Vänd henne åt gångriktningen — spegling i en INRE nod, så index.js position
      // och skuggan aldrig påverkas.
      if (!krop.destroyed && Math.abs(dx) > 6) krop.scale.x = dx < 0 ? -1 : 1
      const st = { p: 0 }
      const steg = Math.max(2, Math.round(langd / 62))
      const tl = gang.tid()
      tl.to(view, { x, y, duration: tidsatgang, ease: 'sine.inOut' }, 0)
      tl.to(st, {
        p: steg,
        duration: tidsatgang,
        ease: 'none',
        onUpdate: () => {
          if (rit.destroyed) return
          const a = st.p * Math.PI * 2
          for (let i = 0; i < BEN.length; i++) {
            if (!BEN[i].destroyed) BEN[i].rotation = Math.sin(a + FAS[i]) * 0.42
          }
          rit.y = -Math.abs(Math.sin(a * 2)) * 3.5
        },
      }, 0)
      // Svansen svajar i takt med stegen.
      tl.to(svans, {
        rotation: SVANS_VILA - 0.24,
        duration: tidsatgang / Math.max(2, steg),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: Math.max(1, steg * 2 - 1),
      }, 0)
      tl.call(() => {
        nollaBen()
        if (!svans.destroyed) svans.rotation = SVANS_VILA
        if (!dod && !view.destroyed) klar?.()
      })
      return tl
    },

    // Trycks hon där hon står: sträcker på sig, svansen far rakt upp, öronen rycker.
    reagera() {
      if (dod || krop.destroyed) return
      stoppa()
      const sx = krop.scale.x < 0 ? -1 : 1
      const tl = reaktion.tid()
      tl.to(krop.scale, { x: sx * 1.16, y: 0.88, duration: 0.15, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: sx * 0.95, y: 1.1, duration: 0.18, ease: 'sine.inOut' }, 0.15)
        .to(krop.scale, { x: sx, y: 1, duration: 0.38, ease: 'back.out(2.4)' }, 0.33)
      tl.to(svans, { rotation: -1.25, duration: 0.18, ease: 'back.out(3)' }, 0)
        .to(svans, { rotation: SVANS_VILA, duration: 0.72, ease: 'elastic.out(1, 0.45)' }, 0.34)
      tl.to(huvud, { rotation: -0.18, duration: 0.14, ease: 'back.out(2.4)' }, 0)
        .to(huvud, { rotation: 0.08, duration: 0.2, ease: 'sine.inOut' }, 0.3)
        .to(huvud, { rotation: 0, duration: 0.34, ease: 'sine.inOut' }, 0.5)
      return tl
    },

    // En SYNLIG jam: huvudet upp, munnen gapar, kroppen andas ut. Ljudet sköter index.js.
    jama() {
      if (dod || krop.destroyed) return
      stoppa()
      const sx = krop.scale.x < 0 ? -1 : 1
      const tl = reaktion.tid()
      tl.to(huvud, { rotation: -0.34, duration: 0.18, ease: 'back.out(2)' }, 0)
        .to(huvud, { rotation: -0.28, duration: 0.28, ease: 'sine.inOut' }, 0.18)
        .to(huvud, { rotation: 0, duration: 0.34, ease: 'sine.inOut' }, 0.52)
      tl.to(mun.scale, { x: 1, y: 1.15, duration: 0.14, ease: 'back.out(2.6)' }, 0.06)
        .to(mun.scale, { x: 0.9, y: 0.9, duration: 0.24, ease: 'sine.inOut' }, 0.24)
        .to(mun.scale, { x: 0, y: 0, duration: 0.22, ease: 'power2.in' }, 0.52)
      tl.to(krop.scale, { x: sx * 0.96, y: 1.06, duration: 0.2, ease: 'sine.out' }, 0)
        .to(krop.scale, { x: sx, y: 1, duration: 0.44, ease: 'back.out(2)' }, 0.42)
      tl.to(svans, { rotation: SVANS_VILA - 0.6, duration: 0.3, ease: 'sine.inOut' }, 0)
        .to(svans, { rotation: SVANS_VILA, duration: 0.5, ease: 'sine.inOut' }, 0.34)
      return tl
    },

    // Vilorörelse med egen fas — hon andas där hon ligger.
    liv() {
      if (dod || livnod.destroyed) return
      livTw?.kill()
      livnod.y = 0
      livnod.rotation = 0
      livTw = fbLiv(livnod, { bob: 3.5, sway: 0.012, duration: 3.2, phase: Math.random() })
      return livTw
    },

    destroy() {
      if (dod) return
      dod = true
      reaktion.doda()
      gang.doda()
      livTw?.kill()
      livTw = null
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

// Måtten, samlade — index.js behöver dem för utplacering, och för att inget som ritas
// (eller rör sig) får nå in i grannknappens träffyta. Grannens hitArea börjar 88 px från
// mitt centrum vid hitR 64 + 24 px luft (KONST_TAK); värsta värdet nedan är 78.
//
//   verktyg  ritad B×H     halva bredden i vila / som mest under ett tryck
//   klocka    96 × 115     48 / 51
//   katt     106 × 116     53 / 58   (zzz + svansspets)
//   trumpet  114 ×  99     57 / 78   (ljudvågorna, som växer kring sin egen mitt)
//   gardin   108 × 110     54 / 56   (ljusstrålen)
//   kaffe     96 × 110     48 / 52   (ångan)
//   kittla    72 × 106     42 / 65   (viftningen svänger fjädern kring spolen)
//   ballong   80 × 120     40 / 47   (gummit sväller 1,18 kring sin egen mitt)
//   strumpa  110 ×  92     56 / 61   (stanken stiger rakt upp, aldrig i sidled)
//   lampa    118 × 110     74 / 81   (käglan, roterad −0,6 rad och skalad 1,12)
//   spruta    72 × 105     41 / 76   (dropparna ur munstycket, skalade 1,5)
//   flakt     82 × 122     41 / 77   (vindbågarna vid gallrets kant, skalade 1,5)
//   hund     116 × 122     64 / 64   (svansroten bak, nosen fram — inget växer i sidled)
//
//   KATTEN (makeKatt) ~132 × 112 px — den bor på kudden, inte i verktygsraden.
export const KONST_HALVBREDD = KONST_TAK
