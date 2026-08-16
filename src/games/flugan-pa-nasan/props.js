// Föremålen i "Flugan på näsan": flugan själv, syltburken som lockar henne, och medaljen
// pappa får när fönstret är stängt.
//
// Var sak är ett FRISTÅENDE föremål med egen silhuett (P0 ASSETS) — ingen emoji i en ruta,
// ingen bricka, ingen Text-nod som föremål. Flugan är HANDRITAD med flit: ikonbibliotekets
// 🐝 är ett BI (gulsvart, rund, luden) och en fluga är raka motsatsen — smal, blåsvart,
// med två stora röda facettögon som tar halva huvudet.
//
// Kontrakt utåt (index.js är skriven mot exakt detta):
//   makeFluga()   -> { view, vingar, vand, kladdig, landa, lyft, destroy }
//   makeSylt()    -> { view, oppna, liv, destroy }
//   makeMedalj()  -> { view, glans, destroy }
//
// `view` är CENTRERAD i (0,0) för alla tre. Flugans RÖRELSE ägs av index.js — den här filen
// äger bara hur hon SER UT, och gör det genom INRE noder: `vand()` speglar en inre nod, så
// index.js egna `view.position` och `view.rotation` aldrig rörs.
//
// Exit-säkerhet: spelaren kan lämna mitt i vilken animation som helst. Varje tidslinje filen
// startar ligger i en `tidHall` som destroy() dödar, OCH är vaktad av en onUpdate som dödar
// sig själv om noden hunnit förstöras. destroy() går dessutom igenom HELA nodträdet och dödar
// tweens per nod — `killTweensOf(roten)` når BARA roten, aldrig vingarna, benen, locket eller
// glansstrimman som ligger en nivå in. Vingslingan är `repeat: -1` och måste dö med spelet:
// en evig tween som överlever exit skriver på en nollad transform.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { topLightFill, sphereFill, cylinderFill, rimLight } from '../../lib/form.js'
import { COLORS, shade } from '../../lib/theme.js'
import { liv as fbLiv } from '../../lib/feedback.js'

// --- små hjälpare -----------------------------------------------------------

// Samlar varje nod i trädet — destroy() måste döda tweens på ALLA, inte bara roten.
function samlaNoder(nod, ut = []) {
  if (!nod) return ut
  ut.push(nod)
  const barn = nod.children || []
  for (let i = 0; i < barn.length; i++) samlaNoder(barn[i], ut)
  return ut
}

// En liten tidslinjehållare: alla tidslinjer sparas, är vaktade mot en förstörd nod, och kan
// dödas i klump. `tw.parent` är sant för löpande OCH köade tweens och falskt för både
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

// En mjuk skugga — djup utan filter.
function skuggNod(y, rx, ry, alpha = 0.16) {
  const g = new Graphics().ellipse(0, y, rx, ry).fill({ color: COLORS.shadow, alpha })
  g.eventMode = 'none'
  return g
}

// Blanda två 0xRRGGBB-färger. Egen och pytteliten i stället för ett extra import — den
// används bara för att tweena flugans tint från pigg till kladdig.
function blanda(a, b, t) {
  const ar = (a >> 16) & 0xff; const ag = (a >> 8) & 0xff; const ab = a & 0xff
  const br = (b >> 16) & 0xff; const bg = (b >> 8) & 0xff; const bb = b & 0xff
  const m = (x, y) => Math.round(x + (y - x) * t)
  return (m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb)
}

// ============================================================================
// FLUGAN
// ============================================================================
// Sedd UPPIFRÅN, ~40 px lång, näsan åt höger vid vand(1). Uppifrån är rätt vy för en fluga
// som surrar i luften OCH sitter på en näsa: båda vingarna syns, alla sex benen syns, och
// silhuetten (smal kropp, brett vingpar) läser som fluga även i 40 px och i full fart.
//
// Kroppen i tre delar längs x:  bakkropp (-21,5..1,5) · mellankropp (-5,5..11,5) ·
// huvud (5,5..19,5). Ögonen sticker ut åt sidorna på huvudet och är MEDVETET för stora —
// det är det enda som skiljer en fluga från vilken mörk insekt som helst i den här skalan.

const FLUG_KROPP = 0x3d4956      // blåsvart, aldrig gulsvart (då blir det ett bi)
const FLUG_BAK = 0x2f3843
const FLUG_LJUS = 0x6f8093
const FLUG_OGA = 0xd8433f
const FLUG_OGA_M = 0x8f2622
const FLUG_BEN = 0x232b33
const FLUG_VINGE = 0xdfeaf4
const FLUG_ADER = 0x9db6c9
const KLADD = 0xc9a97e           // multiplicerande tint: matt, sirapsdoppad
const SYLT_ROD = 0xc02236

// Vingens form ritad kring sin rot i (0,0): en långsmal droppe bakåt-utåt. `sy` speglar den
// till nedre sidan, så båda vingarna kan ha egen (positiv) skala och roteras med motsatt
// tecken — en scale.y = -1 hade gjort rotationens tecken tvetydigt.
function ritVinge(g, sy) {
  // Alla y-konstanter är POSITIVA och multipliceras med `sy` — så pekar vingen alltid åt
  // samma håll som sin rot (sy = −1 uppåt, sy = +1 nedåt). Med blandade tecken hamnade
  // roten på ena sidan kroppen och bladet på den andra.
  const y = (v) => v * sy
  g.moveTo(0, 0)
    .quadraticCurveTo(-4, y(12), -16, y(18))
    .quadraticCurveTo(-28, y(23), -30, y(16))
    .quadraticCurveTo(-31, y(8), -14, y(4))
    .quadraticCurveTo(-4, y(2), 0, 0)
    .closePath()
    .fill({ color: FLUG_VINGE, alpha: 0.5 })
    .stroke({ width: 1.6, color: FLUG_ADER, alpha: 0.75, join: 'round' })
  // Ådringen: tre bågar från roten mot spetsen. Det är den som gör vingen till en VINGE och
  // inte till en genomskinlig klick — och den syns fortfarande i 40 px.
  g.moveTo(-2, y(2)).quadraticCurveTo(-14, y(9), -28, y(15)).stroke({ width: 1.2, color: FLUG_ADER, alpha: 0.85 })
  g.moveTo(-2, y(3)).quadraticCurveTo(-12, y(14), -24, y(19)).stroke({ width: 1.1, color: FLUG_ADER, alpha: 0.7 })
  g.moveTo(-6, y(4)).quadraticCurveTo(-16, y(6), -27, y(11)).stroke({ width: 1, color: FLUG_ADER, alpha: 0.55 })
}

// Ett ben: rot vid mellankroppen, en knä-punkt, en spets och en liten fot. Två segment —
// ett rakt streck läser som ett hårstrå, en knäveck läser som ett insektsben.
function ritBen(g, rx, ry, kx, ky, tx, ty) {
  g.moveTo(rx, ry).lineTo(kx, ky).lineTo(tx, ty)
    .stroke({ width: 2.2, color: FLUG_BEN, cap: 'round', join: 'round' })
  g.circle(tx, ty, 1.8).fill(FLUG_BEN)
}

export function makeFluga() {
  const view = new Container()
  const riktnod = new Container()  // vand() äger ENDAST den här — index.js transform rörs aldrig
  const krop = new Container()     // allt ritat; landa/lyft äger den här
  riktnod.addChild(krop)
  view.addChild(riktnod)

  let dod = false
  const vinge = tidHall(krop)   // vingslingan (evig) — egen hållare, ett landningsstuds får inte riva den
  const kladd = tidHall(krop)   // droppen + sirapsglansen (evig) — överlever både vingar och studsar
  const rorelse = tidHall(krop) // landa/lyft — dödas före varje ny
  let vandTw = null

  // --- vingarna (bakom kroppen, så skarven aldrig syns som ett streck) ---
  // "Suddet" är vingens rörelseoskärpa: en blek båge som bara syns när hon surrar. Den gör
  // att ett par vingar som rör sig ~9 gånger i sekunden läser som ett SURR och inte som två
  // blad som viftar. Suddet ligger MEDVETET utanför den roterande vingnoden — en oskärpa
  // som snurrar med i 0,055 s-takt flimrar i stället för att stå still som den svepta ytan
  // den föreställer.
  const mkVinge = (sy) => {
    const c = new Container()
    c.position.set(3, 4 * sy)
    const sudd = new Graphics()
    sudd.ellipse(-15, sy * 11, 17, 12).fill({ color: FLUG_VINGE, alpha: 0.55 })
    sudd.position.set(3, 4 * sy)
    sudd.alpha = 0
    sudd.eventMode = 'none'
    const g = new Graphics()
    ritVinge(g, sy)
    c.addChild(g)
    return { c, sudd }
  }
  const vUpp = mkVinge(-1)
  const vNed = mkVinge(1)

  // --- benen ---
  const ben = new Container()
  const bg = new Graphics()
  for (const s of [-1, 1]) {
    ritBen(bg, 9, -5 * s, 16, -12 * s, 13, -19 * s)   // framben, pekar framåt-ut
    ritBen(bg, 2, -6 * s, 2, -15 * s, -4, -20 * s)    // mellanben, rakt ut
    ritBen(bg, -4, -6 * s, -10, -14 * s, -18, -18 * s) // bakben, bakåt-ut
  }
  ben.addChild(bg)

  // --- kroppen ---
  const kropp = new Graphics()
  // Bakkroppen: den tyngsta delen, med två segmentveck.
  kropp.ellipse(-10, 0, 11.5, 8.5).fill(sphereFill(FLUG_BAK, { lightY: 0.24, dark: 0.34 }))
    .stroke({ width: 1.6, color: shade(FLUG_BAK, 0.4) })
  kropp.moveTo(-16.5, -6.4).quadraticCurveTo(-13, 0, -16.5, 6.4).stroke({ width: 1.6, color: shade(FLUG_BAK, 0.45), alpha: 0.8 })
  kropp.moveTo(-8.5, -8).quadraticCurveTo(-5, 0, -8.5, 8).stroke({ width: 1.6, color: shade(FLUG_BAK, 0.45), alpha: 0.7 })
  // Mellankroppen, med en ljusare ryggstrimma — det är där vingarna sitter fast.
  kropp.ellipse(3, 0, 8.5, 7.5).fill(sphereFill(FLUG_KROPP, { lightY: 0.22, dark: 0.3 }))
    .stroke({ width: 1.8, color: shade(FLUG_KROPP, 0.42) })
  kropp.moveTo(-3, -2.5).quadraticCurveTo(3, -4, 9, -2).stroke({ width: 2, color: FLUG_LJUS, alpha: 0.7, cap: 'round' })
  kropp.moveTo(-3, 2.5).quadraticCurveTo(3, 4, 9, 2).stroke({ width: 1.6, color: FLUG_LJUS, alpha: 0.4, cap: 'round' })

  // --- huvudet, i egen nod så det kan luta när hon spanar ---
  const huvud = new Container()
  huvud.position.set(12.5, 0)
  const hg = new Graphics()
  // Två snabeltrevare framåt.
  hg.moveTo(5, -2).lineTo(10, -4.5).stroke({ width: 1.6, color: FLUG_BEN, cap: 'round' })
  hg.moveTo(5, 2).lineTo(10, 4.5).stroke({ width: 1.6, color: FLUG_BEN, cap: 'round' })
  // Skallen.
  hg.circle(0, 0, 7).fill(sphereFill(FLUG_KROPP, { lightY: 0.2, dark: 0.3 }))
    .stroke({ width: 1.6, color: shade(FLUG_KROPP, 0.42) })
  // FACETTÖGONEN: stora, röda, ett på varje sida. Rutmönstret är två korsande streck —
  // fler än så blir grus i 40 px.
  for (const s of [-1, 1]) {
    hg.ellipse(1.5, s * 5, 5.4, 4.6).fill(sphereFill(FLUG_OGA, { lightY: 0.26, dark: 0.36 }))
      .stroke({ width: 1.5, color: FLUG_OGA_M })
    hg.moveTo(-2.6, s * 5).lineTo(5.6, s * 5).stroke({ width: 0.9, color: FLUG_OGA_M, alpha: 0.55 })
    hg.moveTo(1.5, s * 1.2).lineTo(1.5, s * 8.8).stroke({ width: 0.9, color: FLUG_OGA_M, alpha: 0.45 })
    hg.circle(-0.6, s * 3.4, 1.5).fill({ color: COLORS.white, alpha: 0.85 })
  }
  // Snabeln (sugsnabeln) under huvudet — den lilla detaljen som gör att hon kan smaka på sylt.
  hg.moveTo(5.5, 0).quadraticCurveTo(9, 0, 9.5, 1.5).stroke({ width: 2.4, color: shade(FLUG_KROPP, 0.2), cap: 'round' })
  huvud.addChild(hg)

  // --- kladdig: sirapsglans över bakkroppen + en droppe som hänger ---
  const glans = new Graphics()
  glans.ellipse(-10, -1, 9, 6).fill({ color: 0xffcf72, alpha: 0.7 })
  glans.ellipse(-13, -3.5, 3.6, 2.4).fill({ color: COLORS.white, alpha: 0.6 })
  glans.alpha = 0

  const droppe = new Container()
  droppe.position.set(-13, 8)
  const dg = new Graphics()
  dg.moveTo(0, -4)
    .quadraticCurveTo(4.5, 2, 4.5, 6)
    .quadraticCurveTo(4.5, 11, 0, 11)
    .quadraticCurveTo(-4.5, 11, -4.5, 6)
    .quadraticCurveTo(-4.5, 2, 0, -4)
    .closePath()
    .fill(topLightFill(SYLT_ROD, { highlight: 0.28, dark: 0.24 }))
    .stroke({ width: 1.2, color: shade(SYLT_ROD, 0.35), join: 'round' })
  dg.ellipse(-1.6, 5, 1.3, 2.2).fill({ color: COLORS.white, alpha: 0.5 })
  droppe.addChild(dg)
  droppe.scale.set(0)

  krop.addChild(vUpp.sudd, vNed.sudd, vUpp.c, vNed.c, droppe, ben, kropp, glans, huvud)

  // --- vingarnas lägen ------------------------------------------------------
  // Vilan skiljer sig mellan pigg och kladdig: en pigg fluga viker vingarna prydligt bakåt
  // längs kroppen, en sirapsdoppad orkar inte och låter dem hänga rakt ut åt sidorna.
  const VILA_PIGG = -0.25
  const VILA_KLADD = 0.32
  const FLAX = {
    pigg: { ut: 0.42, in: -0.36, dur: 0.055, squash: 0.7, sudd: 0.32 },
    kladd: { ut: 0.34, in: 0.02, dur: 0.155, squash: 0.88, sudd: 0.16 },
  }

  let arKladdig = false
  let surrar = false
  let vandad = 1

  const sattVingar = (r) => {
    if (!vUpp.c.destroyed) vUpp.c.rotation = r
    if (!vNed.c.destroyed) vNed.c.rotation = -r
  }
  sattVingar(VILA_PIGG)

  // Bygger om vingslingan från grunden. Anropas när surret slås på/av OCH när kladdigheten
  // ändras, eftersom en kladdig fluga ska flaxa långsammare och kortare — det är takten som
  // säger "långsam", inte färgen.
  const byggVingar = () => {
    vinge.doda()
    const vila = arKladdig ? VILA_KLADD : VILA_PIGG
    if (!surrar) {
      // Stilla: vingarna faller på plats, suddet slocknar.
      const tl = vinge.tid()
      tl.to(vUpp.c, { rotation: vila, duration: 0.22, ease: 'back.out(1.8)' }, 0)
        .to(vNed.c, { rotation: -vila, duration: 0.22, ease: 'back.out(1.8)' }, 0)
        .to(vUpp.c.scale, { y: 1, duration: 0.18, ease: 'sine.out' }, 0)
        .to(vNed.c.scale, { y: 1, duration: 0.18, ease: 'sine.out' }, 0)
        .to([vUpp.sudd, vNed.sudd], { alpha: 0, duration: 0.14, ease: 'power2.in' }, 0)
      return
    }
    const f = arKladdig ? FLAX.kladd : FLAX.pigg
    const tl = vinge.tid({ repeat: -1 })
    tl.to(vUpp.c, { rotation: f.ut, duration: f.dur, ease: 'sine.inOut' }, 0)
      .to(vUpp.c, { rotation: f.in, duration: f.dur, ease: 'sine.inOut' }, f.dur)
    tl.to(vNed.c, { rotation: -f.ut, duration: f.dur, ease: 'sine.inOut' }, 0)
      .to(vNed.c, { rotation: -f.in, duration: f.dur, ease: 'sine.inOut' }, f.dur)
    // Vingen trycks ihop i vändlägena — det är squashen som gör flaxet till en rörelse i
    // stället för en vridning fram och tillbaka.
    tl.to([vUpp.c.scale, vNed.c.scale], { y: f.squash, duration: f.dur, ease: 'sine.inOut' }, 0)
      .to([vUpp.c.scale, vNed.c.scale], { y: 1, duration: f.dur, ease: 'sine.inOut' }, f.dur)
    const suddTl = vinge.tid()
    suddTl.to([vUpp.sudd, vNed.sudd], { alpha: f.sudd, duration: 0.12, ease: 'power2.out' }, 0)
  }

  return {
    view,

    // true = vingarna surrar (snabb fladder + rörelseoskärpa), false = stilla (hon sitter).
    // Idempotent: index.js får kalla den varje bildruta utan att slingan startas om.
    vingar(pa) {
      if (dod || krop.destroyed) return
      const p = !!pa
      if (p === surrar) return
      surrar = p
      byggVingar()
    },

    // Vänd kroppen åt färdriktningen. Speglingen sker i en INRE nod, så index.js egna
    // `view.position` och `view.rotation` aldrig påverkas.
    vand(riktning) {
      if (dod || riktnod.destroyed || !riktning) return
      const r = riktning < 0 ? -1 : 1
      if (r === vandad) return
      vandad = r
      vandTw?.kill()
      vandTw = gsap.to(riktnod.scale, {
        x: r,
        duration: 0.16,
        ease: 'power2.out',
        onUpdate() { if (riktnod.destroyed) vandTw?.kill() },
      })
    },

    // Hon har varit i kaffekoppen (eller i sylten): matt färg, tunga vingar, en droppe som
    // hänger. Allt tre pekar åt samma håll — LÅNGSAM.
    kladdig(pa) {
      if (dod || krop.destroyed) return
      const p = !!pa
      if (p === arKladdig) return
      arKladdig = p
      kladd.doda()

      // Färgen mattas via en proxy: gsap kan inte tweena en hexfärg, men den kan tweena ett
      // tal som vi mappar till en tint varje bildruta.
      const st = { t: p ? 0 : 1 }
      const tl = kladd.tid()
      tl.to(st, {
        t: p ? 1 : 0,
        duration: 0.45,
        ease: 'sine.inOut',
        onUpdate() {
          if (krop.destroyed) return
          krop.tint = blanda(0xffffff, KLADD, st.t)
        },
      }, 0)
      tl.to(glans, { alpha: p ? 0.85 : 0, duration: 0.35, ease: 'sine.inOut' }, 0)
      tl.to(droppe.scale, { x: p ? 1 : 0, y: p ? 1 : 0, duration: p ? 0.4 : 0.2, ease: p ? 'back.out(2)' : 'power2.in' }, 0)

      if (p) {
        // Droppen hänger och tänjs — en tyngd som drar i bakkroppen.
        const hang = kladd.tid({ repeat: -1, yoyo: true, delay: 0.4 })
        hang.to(droppe.scale, { x: 0.86, y: 1.24, duration: 0.9, ease: 'sine.inOut' }, 0)
          .to(droppe, { y: 11, duration: 0.9, ease: 'sine.inOut' }, 0)
      } else if (!droppe.destroyed) {
        droppe.y = 8
      }
      byggVingar() // takten byter — det är den som läser som långsam
    },

    // Liten studs när hon landar: benen tar emot, kroppen trycks ihop och fjädrar tillbaka.
    landa() {
      if (dod || krop.destroyed) return
      rorelse.doda()
      if (!krop.destroyed) { krop.scale.set(1); krop.y = 0 }
      if (!ben.destroyed) ben.scale.set(1)
      const tl = rorelse.tid()
      tl.to(krop.scale, { x: 1.16, y: 0.78, duration: 0.07, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: 0.95, y: 1.08, duration: 0.1, ease: 'sine.inOut' }, 0.07)
        .to(krop.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.6)' }, 0.17)
      tl.to(krop, { y: 3, duration: 0.07, ease: 'power2.out' }, 0)
        .to(krop, { y: 0, duration: 0.34, ease: 'bounce.out' }, 0.07)
      // Benen tar emot stöten och sprattlar till.
      tl.to(ben.scale, { x: 1.14, y: 1.14, duration: 0.08, ease: 'power2.out' }, 0)
        .to(ben.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' }, 0.08)
      // Huvudet nickar av landningen.
      tl.to(huvud, { rotation: 0.22, duration: 0.08, ease: 'power2.out' }, 0)
        .to(huvud, { rotation: 0, duration: 0.36, ease: 'elastic.out(1, 0.45)' }, 0.08)
    },

    // Liten sats när hon lyfter: hukar ihop, sträcker ut och drar upp benen.
    lyft() {
      if (dod || krop.destroyed) return
      rorelse.doda()
      if (!krop.destroyed) { krop.scale.set(1); krop.y = 0 }
      if (!ben.destroyed) ben.scale.set(1)
      const tl = rorelse.tid()
      tl.to(krop.scale, { x: 1.1, y: 0.84, duration: 0.1, ease: 'power2.inOut' }, 0)
        .to(krop.scale, { x: 0.9, y: 1.16, duration: 0.09, ease: 'power2.out' }, 0.1)
        .to(krop.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2.4)' }, 0.19)
      tl.to(krop, { y: 2, duration: 0.1, ease: 'power2.inOut' }, 0)
        .to(krop, { y: -4, duration: 0.14, ease: 'power2.out' }, 0.1)
        .to(krop, { y: 0, duration: 0.3, ease: 'sine.inOut' }, 0.24)
      // Benen dras upp under kroppen när hon släpper underlaget.
      tl.to(ben.scale, { x: 1.1, y: 1.1, duration: 0.1, ease: 'power2.out' }, 0)
        .to(ben.scale, { x: 0.72, y: 0.72, duration: 0.16, ease: 'power2.out' }, 0.1)
        .to(ben.scale, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2)' }, 0.34)
      tl.to(huvud, { rotation: -0.2, duration: 0.14, ease: 'back.out(2.2)' }, 0.06)
        .to(huvud, { rotation: 0, duration: 0.34, ease: 'sine.inOut' }, 0.24)
    },

    /**
     * PLATT. Ett verktyg har träffat henne, och hon trycks ut mot den yta slaget kom emot.
     *
     * `vinkel` är ytans normal i radianer (0 = slaget kom rakt uppifrån). Hela kroppen
     * roteras dit och plattas TVÄRS den, så hon läser som klistrad mot ytan och inte som
     * en fluga som råkar ligga ner. Vingarna stannar (`vingar(false)` görs av spelet), och
     * benen sprattlar en gång innan de stelnar — det är den enda rörelsen som får finnas,
     * annars läser hon som skadad i stället för som tecknad.
     *
     * Ingenting här är permanent: `resa()` tar tillbaka precis samma noder.
     */
    platt(vinkel = 0) {
      if (dod || krop.destroyed) return
      rorelse.doda()
      const tl = rorelse.tid()
      tl.to(riktnod, { rotation: vinkel, duration: 0.06, ease: 'power2.out' }, 0)
      // Sammantryckningen: 1,55 på tvären mot 0,3 på höjden. Talen är valda så att
      // silhuetten (54×40) blir 84×12 — bredare än hon är lång, alltså tydligt UTPLATTAD
      // även i 40 px.
      tl.to(krop.scale, { x: 1.55, y: 0.3, duration: 0.07, ease: 'power3.out' }, 0)
        .to(krop.scale, { x: 1.42, y: 0.36, duration: 0.5, ease: 'elastic.out(1, 0.6)' }, 0.07)
      tl.to(ben.scale, { x: 1.5, y: 1.5, duration: 0.09, ease: 'power2.out' }, 0)
        .to(ben.scale, { x: 1.28, y: 1.34, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, 0.09)
      // Ett sista sprattel i huvudet, sedan stilla.
      tl.to(huvud, { rotation: 0.5, duration: 0.06, ease: 'power2.out' }, 0)
        .to(huvud, { rotation: -0.32, duration: 0.12, ease: 'sine.inOut' }, 0.1)
        .to(huvud, { rotation: 0.16, duration: 0.5, ease: 'sine.out' }, 0.22)
    },

    /**
     * RESER SIG. Hon skakar av sig plattheten, pumpar tillbaka formen och står upp igen.
     * Rotationen går tillbaka till 0 så `vand()` (som äger `riktnod.scale.x`) fungerar
     * som förut — den och den här skriver på OLIKA fält och kan därför inte slåss.
     */
    resa() {
      if (dod || krop.destroyed) return
      rorelse.doda()
      const tl = rorelse.tid()
      tl.to(riktnod, { rotation: 0, duration: 0.42, ease: 'back.out(1.6)' }, 0)
      // Uppumpningen: en överskjutning på höjden gör att hon "puffar upp sig" igen.
      tl.to(krop.scale, { x: 0.82, y: 1.3, duration: 0.24, ease: 'back.out(2.2)' }, 0.06)
        .to(krop.scale, { x: 1, y: 1, duration: 0.32, ease: 'elastic.out(1, 0.55)' }, 0.3)
      tl.to(ben.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2)' }, 0.06)
      tl.to(huvud, { rotation: -0.24, duration: 0.16, ease: 'power2.out' }, 0)
        .to(huvud, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' }, 0.16)
      tl.to(krop, { y: 0, duration: 0.3, ease: 'sine.out' }, 0)
    },

    destroy() {
      if (dod) return
      dod = true
      vinge.doda()
      kladd.doda()
      rorelse.doda()
      vandTw?.kill()
      vandTw = null
      // killTweensOf(roten) når BARA roten: vingarna, suddet, benen, huvudet, glansen och
      // droppen ligger en nivå in och överlever annars rivningen helt tyst.
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

// ============================================================================
// SYLTBURKEN
// ============================================================================
// En glasburk sedd rakt framifrån, ~94 px hög i vila: lock i tyghätta, glas med synlig
// rundning, rött syltinnehåll med hela bär, en etikett med RITADE streck (aldrig en
// Text-nod) och en glansreflex i glaset. `oppna()` slänger av locket bakom burken och
// startar doften — tre ritade doftslingor som stiger ur den öppna mynningen.

const GLAS = 0xdff0f4
const GLAS_M = 0x9fbcc6
const BAR = 0x8e1330
const ETIKETT = 0xfff3d9
const ETIKETT_M = 0xd9c6a4

export function makeSylt() {
  const view = new Container()
  const livnod = new Container()   // fbLiv äger den här nodens y + rotation
  const krop = new Container()     // allt ritat
  livnod.addChild(krop)

  let dod = false
  const rorelse = tidHall(krop)    // locket
  const doft = tidHall(krop)       // doftslingorna (eviga efter oppna)
  let livTw = null
  let oppnad = false

  // --- doften: tre slingor bakom burken, osynliga tills locket är av ---
  const anga = new Container()
  const slingor = []
  for (let i = 0; i < 3; i++) {
    const w = new Graphics()
    const x = -14 + i * 14
    w.moveTo(x, 0)
      .quadraticCurveTo(x - 7, -7, x, -14)
      .quadraticCurveTo(x + 7, -21, x, -26)
      .stroke({ width: 4, color: 0xffd9a8, cap: 'round', alpha: 0.9 })
    w.position.set(0, -26)
    w.alpha = 0
    anga.addChild(w)
    slingor.push(w)
  }

  // --- locket: egen nod med vridpunkt i sin egen mitt, så det SNURRAR när det åker av ---
  const lock = new Container()
  lock.pivot.set(0, -40)
  lock.position.set(0, -40)
  const lg = new Graphics()
  // Tyghättan över locket, med kartad kant.
  lg.moveTo(-35, -32)
    .quadraticCurveTo(-35, -50, -26, -50)
    .lineTo(26, -50)
    .quadraticCurveTo(35, -50, 35, -32)
    .closePath()
    .fill(topLightFill(COLORS.red, { highlight: 0.24, dark: 0.26 }))
    .stroke({ width: 3, color: shade(COLORS.red, 0.34), join: 'round' })
  // Rutorna i tyget: små ljusa fyrkanter, inte ett mönster som blir brus.
  for (const rx of [-22, -7, 8, 23]) {
    for (const ry of [-45, -37]) {
      lg.roundRect(rx - 5, ry - 3, 10, 6, 2).fill({ color: COLORS.white, alpha: 0.28 })
    }
  }
  // Snöret runt hättan + skruvlockets kant under.
  lg.roundRect(-36, -33, 72, 6, 3).fill(topLightFill(0xf0c33c, { dark: 0.3 })).stroke({ width: 2, color: shade(0xf0c33c, 0.4) })
  lg.roundRect(-30, -28, 60, 7, 3).fill(topLightFill(COLORS.red, { dark: 0.34 })).stroke({ width: 2.5, color: shade(COLORS.red, 0.36) })
  lg.ellipse(-18, -44, 7, 4).fill({ color: COLORS.white, alpha: 0.3 })
  lock.addChild(lg)

  // --- burken ---------------------------------------------------------------
  const glasBak = new Graphics()
  // Halsen först (bakom kroppen, så skarven aldrig syns som ett streck).
  glasBak.roundRect(-28, -32, 56, 16, 5).fill(cylinderFill(GLAS, { axis: 'y', dark: 0.24 })).stroke({ width: 3, color: GLAS_M })
  glasBak.moveTo(-26, -28).lineTo(26, -28).stroke({ width: 2, color: GLAS_M, alpha: 0.6 })
  glasBak.moveTo(-26, -22).lineTo(26, -22).stroke({ width: 2, color: GLAS_M, alpha: 0.45 })
  // Själva kroppen.
  glasBak.moveTo(-34, -20)
    .quadraticCurveTo(-35, 40, -24, 46)
    .lineTo(24, 46)
    .quadraticCurveTo(35, 40, 34, -20)
    .closePath()
    .fill(cylinderFill(GLAS, { axis: 'y', dark: 0.26 }))
    .stroke({ width: 3.5, color: GLAS_M, join: 'round' })

  // Sylten inuti: vågig yta, tre hela bär och några kärnor.
  const sylt = new Graphics()
  sylt.moveTo(-30, -6)
    .quadraticCurveTo(-15, -14, 0, -6)
    .quadraticCurveTo(15, 2, 30, -6)
    .lineTo(30, 32)
    .quadraticCurveTo(29, 42, 20, 42)
    .lineTo(-20, 42)
    .quadraticCurveTo(-29, 42, -30, 32)
    .closePath()
    .fill(topLightFill(SYLT_ROD, { highlight: 0.2, dark: 0.32 }))
  // Ytans blänk — den skiljer en sylt från en färgad kloss.
  sylt.moveTo(-26, -6).quadraticCurveTo(-14, -12, -2, -6).stroke({ width: 3, color: 0xff8a9c, alpha: 0.55, cap: 'round' })
  for (const [bx, by, br] of [[-17, 9, 8], [11, 4, 7], [-3, 25, 8.5], [21, 22, 6]]) {
    sylt.circle(bx, by, br).fill(sphereFill(BAR, { lightY: 0.26, dark: 0.34 }))
    sylt.circle(bx - br * 0.34, by - br * 0.36, br * 0.28).fill({ color: 0xff9ec4, alpha: 0.55 })
  }
  for (const [kx, ky] of [[2, 14], [-24, 20], [16, 34], [-12, 36], [26, 10]]) {
    sylt.ellipse(kx, ky, 2.2, 1.5).fill({ color: 0xf5dcae, alpha: 0.8 })
  }

  // Etiketten: ritade streck som TEXT-attrapp, plus ett litet ritat bär som logotyp.
  // Aldrig en Text-nod — den vore både oläsbar för en tvååring och ett P0-brott.
  const etikett = new Graphics()
  etikett.roundRect(-25, 11, 50, 27, 7).fill(topLightFill(ETIKETT, { highlight: 0.18, dark: 0.16 }))
    .stroke({ width: 2.5, color: ETIKETT_M })
  etikett.circle(-13, 20, 5).fill(sphereFill(BAR, { lightY: 0.28 }))
  etikett.moveTo(-13, 15).quadraticCurveTo(-9, 11, -6, 13).quadraticCurveTo(-10, 16, -13, 15).closePath().fill(COLORS.green)
  etikett.moveTo(-3, 19).lineTo(17, 19).stroke({ width: 3, color: ETIKETT_M, cap: 'round' })
  etikett.moveTo(-3, 25).lineTo(13, 25).stroke({ width: 2.2, color: ETIKETT_M, alpha: 0.75, cap: 'round' })
  etikett.moveTo(-18, 32).lineTo(18, 32).stroke({ width: 2.2, color: ETIKETT_M, alpha: 0.6, cap: 'round' })

  // Glansreflexen i glaset: en lång mjuk strimma till vänster + en kort till höger.
  const reflex = new Graphics()
  reflex.moveTo(-25, -12).quadraticCurveTo(-28, 12, -23, 34).stroke({ width: 8, color: COLORS.white, alpha: 0.34, cap: 'round' })
  reflex.moveTo(-16, -14).quadraticCurveTo(-18, -2, -16, 6).stroke({ width: 3.5, color: COLORS.white, alpha: 0.4, cap: 'round' })
  reflex.moveTo(27, 2).quadraticCurveTo(29, 16, 26, 30).stroke({ width: 4, color: COLORS.white, alpha: 0.2, cap: 'round' })
  reflex.eventMode = 'none'

  krop.addChild(anga, lock, glasBak, sylt, etikett, reflex)

  view.addChild(skuggNod(52, 38, 10), livnod)

  return {
    view,

    // Locket åker av när burken ställs ner: det puttar upp, snurrar ett halvt varv och
    // landar lutat mot burkens fot — BAKOM glaset, så det inte skymmer etiketten. Först
    // därefter kan doften börja stiga.
    oppna() {
      if (dod || krop.destroyed || oppnad) return
      oppnad = true
      rorelse.doda()
      const tl = rorelse.tid()
      tl.to(lock, { y: -66, duration: 0.22, ease: 'power2.out' }, 0)
        .to(lock, { y: 24, duration: 0.42, ease: 'bounce.out' }, 0.22)
      tl.to(lock, { x: 34, duration: 0.64, ease: 'sine.inOut' }, 0)
      tl.to(lock, { rotation: 1.32, duration: 0.64, ease: 'power1.inOut' }, 0)
      // Burken skakar till av att locket lossnar.
      tl.to(krop, { rotation: -0.06, duration: 0.08, ease: 'power2.out' }, 0)
        .to(krop, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 0.08)
      tl.to(krop.scale, { x: 1.06, y: 0.94, duration: 0.09, ease: 'power2.out' }, 0)
        .to(krop.scale, { x: 1, y: 1, duration: 0.38, ease: 'back.out(2.4)' }, 0.09)
      // Locket hamnar bakom glaset så fort det passerat burkens överkant.
      tl.call(() => {
        if (!krop.destroyed && !lock.destroyed) krop.setChildIndex(lock, 0)
      }, null, 0.3)
      // ...och sedan börjar doften.
      tl.call(() => {
        if (dod || krop.destroyed) return
        slingor.forEach((w, i) => {
          const dt = doft.tid({ repeat: -1, repeatDelay: 0.6, delay: i * 0.62 })
          dt.set(w, { y: -26, alpha: 0 }, 0)
            .set(w.scale, { x: 0.7, y: 1 }, 0)
            .to(w, { alpha: 0.85, duration: 0.5, ease: 'sine.out' }, 0)
            .to(w, { y: -50, duration: 2.1, ease: 'sine.out' }, 0)
            .to(w.scale, { x: 1.3, duration: 2.1, ease: 'sine.out' }, 0)
            .to(w, { alpha: 0, duration: 1.2, ease: 'sine.in' }, 0.9)
        })
      }, null, 0.66)
    },

    // Vilo-rörelse med EGEN fas, så burken inte guppar i lås med allt annat på bordet.
    liv() {
      if (dod || livnod.destroyed) return
      livTw?.kill()
      livnod.y = 0
      livnod.rotation = 0
      livTw = fbLiv(livnod, { bob: 4, sway: 0.018, duration: 3.1, phase: Math.random() })
      return livTw
    },

    destroy() {
      if (dod) return
      dod = true
      rorelse.doda()
      doft.doda()
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

// ============================================================================
// MEDALJEN
// ============================================================================
// Guldmedalj i band, ~94 px hög. Bandet är två remmar i blått och gult som möts i en ring,
// skivan har räfflad kant och en präglad stjärna. `glans()` sveper en ljusstrimma över
// skivan — MASKAD till skivans cirkel, annars glider strimman ut över bandet och läser som
// ett streck i luften i stället för som en reflex i metall.

const GULD = 0xf0c33c
const GULD_M = 0xa8801a
const GULD_LJUS = 0xfff0b8

export function makeMedalj() {
  const view = new Container()
  const krop = new Container()
  view.addChild(krop)

  let dod = false
  const skimmer = tidHall(krop)

  const DISK_Y = 18
  const DISK_R = 30

  // --- bandet: två remmar som möts i ringen ---
  const band = new Graphics()
  for (const s of [-1, 1]) {
    band.moveTo(s * 30, -46)
      .lineTo(s * 14, -46)
      .lineTo(s * 2, -8)
      .lineTo(s * 14, -6)
      .closePath()
      .fill(topLightFill(COLORS.blue, { highlight: 0.26, dark: 0.28 }))
      .stroke({ width: 2.5, color: shade(COLORS.blue, 0.34), join: 'round' })
    // Gul rand längs remmen — ett enfärgat band läser som en pappremsa.
    band.moveTo(s * 26, -46).lineTo(s * 21, -46).lineTo(s * 9, -8).lineTo(s * 13, -7).closePath()
      .fill({ color: GULD, alpha: 0.9 })
  }

  // Ringen som håller skivan.
  const ring = new Graphics()
  ring.circle(0, -6, 8).stroke({ width: 5, color: GULD_M })
  ring.circle(0, -6, 8).stroke({ width: 2.5, color: GULD_LJUS, alpha: 0.8 })

  // --- skivan ---
  const disk = new Graphics()
  disk.circle(0, DISK_Y, DISK_R).fill(sphereFill(GULD, { lightY: 0.26, dark: 0.36 }))
    .stroke({ width: 4, color: GULD_M })
  // Räfflad kant: korta radiella streck mellan r 24 och r 28.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    disk.moveTo(Math.cos(a) * 24, DISK_Y + Math.sin(a) * 24)
      .lineTo(Math.cos(a) * 28, DISK_Y + Math.sin(a) * 28)
      .stroke({ width: 2, color: GULD_M, alpha: 0.5 })
  }
  disk.circle(0, DISK_Y, 22).fill(topLightFill(GULD, { highlight: 0.34, dark: 0.14 }))
    .stroke({ width: 2.5, color: GULD_M, alpha: 0.7 })
  // Präglad stjärna i mitten.
  disk.star(0, DISK_Y, 5, 16, 7.5).fill(GULD_LJUS).stroke({ width: 2, color: GULD_M, alpha: 0.85 })

  // --- glansstrimman, maskad till skivan ---
  const skimHall = new Container()
  const skim = new Graphics()
  skim.moveTo(-9, -40).lineTo(5, -40).lineTo(-5, 40).lineTo(-19, 40).closePath()
    .fill({ color: COLORS.white, alpha: 0.42 })
  skim.moveTo(11, -40).lineTo(17, -40).lineTo(7, 40).lineTo(1, 40).closePath()
    .fill({ color: COLORS.white, alpha: 0.26 })
  skim.position.set(-56, DISK_Y)
  skimHall.addChild(skim)
  skimHall.eventMode = 'none'

  const mask = new Graphics().circle(0, DISK_Y, DISK_R - 2).fill(COLORS.white)

  // Gnistan som blinkar till när strimman passerat — en fyruddig stjärna, inte en cirkel.
  const gnista = new Graphics()
  gnista.star(0, 0, 4, 13, 3.4).fill({ color: COLORS.white, alpha: 0.95 })
  gnista.position.set(14, DISK_Y - 14)
  gnista.scale.set(0)
  gnista.eventMode = 'none'

  // rimLight ritas kring (0,0) — den flyttas till skivans mitt.
  const dager = rimLight(DISK_R, { offsetX: -0.34, offsetY: -0.2, size: 0.3, alpha: 0.35 })
  dager.y = DISK_Y

  krop.addChild(band, ring, disk, mask, skimHall, gnista, dager)
  skimHall.mask = mask

  return {
    view,

    // En glansstrimma sveper över skivan. Får loopa tills destroy() — repeat: -1 är
    // meningen, och den dör med tidHall:en.
    glans() {
      if (dod || krop.destroyed) return
      skimmer.doda()
      const tl = skimmer.tid({ repeat: -1, repeatDelay: 1.35 })
      tl.set(skim, { x: -56 }, 0)
        .set(gnista.scale, { x: 0, y: 0 }, 0)
        .to(skim, { x: 56, duration: 0.82, ease: 'sine.inOut' }, 0)
        .to(gnista.scale, { x: 1, y: 1, duration: 0.16, ease: 'back.out(3)' }, 0.5)
        .to(gnista, { rotation: 0.6, duration: 0.42, ease: 'sine.out' }, 0.5)
        .to(gnista.scale, { x: 0, y: 0, duration: 0.26, ease: 'power2.in' }, 0.66)
        .set(gnista, { rotation: 0 }, 0.94)
      return tl
    },

    destroy() {
      if (dod) return
      dod = true
      skimmer.doda()
      // Masken måste kopplas loss innan trädet rivs — en mask som pekar på en förstörd nod
      // är en tyst renderarfälla.
      if (!skimHall.destroyed) skimHall.mask = null
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

// Måtten, samlade — index.js behöver dem för utplacering, träffytor och för att veta hur
// nära ett hinder flugan får flyga innan hennes vingar sticker in i det. Talen är räknade
// ur den ritade geometrin (rotationen inräknad), inte uppskattade.
//
//   FLUGAN   KROPPEN 41 px lång (bakkroppens spets −21,5 → huvudets front 19,5) och
//            19 px bred över facettögonen (±9,6). Med trevare och snabel: 44 px.
//            SILHUETTEN i vila (pigg, vingarna vikta bakåt): ~54 × 40 px — där är det
//            BENEN (±20) som är ytterkanten, inte vingarna.
//            SILHUETTEN när hon surrar: ~53 × 62 px — vingens spets når ±31 i uppslaget.
//            Ett vingpar som är bredare än kroppen är sant för en fluga och är det som gör
//            silhuetten läsbar i fart.
//            kladdig(true) ändrar TRE saker, alla åt samma håll (LÅNGSAM):
//              · tint mot 0xc9a97e (multiplicerande) → matt, sirapsdoppad kropp, plus en
//                bärnstensglans över bakkroppen
//              · vingarnas VILA går från −0,25 rad (prydligt vikta bakåt) till +0,32 rad
//                (hänger rakt ut, ±28,6 px) och flaxet från 0,055 s till 0,155 s per slag
//                med mindre utslag och svagare rörelseoskärpa
//              · en syltdroppe hänger under bakkroppen och tänjs (ner till y +19)
//            Silhuetten i kladdig vila blir därmed ~54 × 58 px.
//   SYLTEN   70 × 94 px stängd (lockets hätta −50 → burkens fot +46). Öppnad: locket lutar
//            BAKOM glaset vid (34, 24) med 1,32 rad och doften stiger till y −50, alltså
//            ~86 × 106 px. Etiketten bär RITADE streck, aldrig en Text-nod.
//   MEDALJEN 62 × 94 px (bandets topp −46 → skivans underkant +48). Skivan är 60 px i
//            diameter och sitter på y +18; glansstrimman är maskad till just den cirkeln.
export const MATT = {
  fluga: {
    langd: 41,
    bredd: 19,
    silhuett: { w: 54, h: 40 },
    silhuettSurr: { w: 53, h: 62 },
    silhuettKladdig: { w: 54, h: 58 },
  },
  sylt: { w: 70, h: 94, oppnad: { w: 86, h: 106 } },
  medalj: { w: 62, h: 94, diskR: 30, diskY: 18 },
}
