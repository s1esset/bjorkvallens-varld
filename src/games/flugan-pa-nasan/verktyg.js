// VERKTYGEN i `flugan-pa-nasan` — fem saker att jaga flugor med, och den VERKAN de har.
//
// Filen är delad i tre delar som medvetet inte känner till varandra:
//   ⓵ `VERKTYG`  — vad ett verktyg GÖR i tal (räckvidd, kraft, verkanstyp, när slaget
//                  faktiskt landar i animationen). `index.js` läser bara den här tabellen
//                  när det ska räkna ut vad som träffades.
//   ⓶ `makeIkon` — hur verktyget SER UT när det ligger i lådan. Fristående ritade föremål
//                  med egen silhuett och egen skugga (P0 ASSETS) — ingen emoji i en ruta.
//   ⓷ `Effekter` — hur verkan SYNS. Rena bilder: en smälla som slår ner, en dimma som
//                  sprutas, en pil som flyger och FASTNAR, ett svep, en klibbig hand som
//                  skjuts ut och dras tillbaka.
//
// ⚠️ VERKAN OCH BILD ÄR TVÅ SAKER, OCH `droj` HÅLLER IHOP DEM. Smällan träffar inte när
//    barnet trycker — den träffar när plattan når underlaget, 0,12 s in i svingen. Räknar
//    spelet träffen direkt blir bilden fel: flugan plattas innan smällan är framme. Varje
//    verktyg bär därför sin egen `droj`, och `index.js` väntar ut den med `ctx.later()`.
//
// ⚠️ TYPEN ÄR INTE KOSMETIK. Ett rumsföremål reagerar på `typ`, inte på verktyget:
//    `slag` välter och skvätter, `vind` flaxar och blåser, `vat` gör blött och tungt,
//    `klibb` fastnar och drar med sig. Därför kan ett nytt verktyg läggas till utan att
//    ett enda föremål behöver ändras — och därför beter sig sprayen och tidningen olika
//    mot kaffekoppen fast båda "bara" rör luften.
//
// ⚠️ EXIT-SÄKERT. Alla effektnoder bor i ETT lager som `Effekter` äger, varje tidslinje
//    sparas, och `destroy()` dödar tweens på VARJE nod i trädet (inte bara roten — armar
//    och pilfjädrar ligger flera nivåer in och överlever annars rivningen helt tyst).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { shade } from '../../lib/theme.js'
import { cylinderFill, sphereFill, topLightFill, verticalFill } from '../../lib/form.js'

// ---------------------------------------------------------------------------
// ⓵ TABELLEN
// ---------------------------------------------------------------------------
//
// `radie`  px kring träffpunkten som räknas som träff
// `kraft`  1,0 = en normal smälla; skalar knuffen på flugor och föremål
// `typ`    'slag' | 'vind' | 'vat' | 'klibb'  (ett verktyg kan bära flera)
// `droj`   s från tryck till att verkan landar — se filhuvudet
// `platt`  sant om verktyget kan platta till en fluga (vind gör det inte)
// `kyla`   s innan verktyget får användas igen (P0: taket på hur mycket som kan hända)
export const VERKTYG = [
  {
    key: 'flugsmalla',
    namn: 'flugsmällan',
    radie: 82,
    kraft: 1.6,
    typ: ['slag'],
    droj: 0.12,
    platt: true,
    kyla: 0.45,
    ljud: 'tap',
    cue: 'Ta flugsmällan och smäll till där flugan sitter!',
  },
  {
    key: 'spray',
    namn: 'sprayflaskan',
    // Sprayen är en KON, inte en cirkel: `radie` är räckvidden och `kon` halva öppningen
    // i radianer. Den träffar alltså mycket bredare långt bort än nära — precis som en
    // spray gör, och det gör den till det verktyg som fungerar bäst mot flera flugor.
    radie: 300,
    kon: 0.42,
    kraft: 0.85,
    typ: ['vind', 'vat'],
    droj: 0.14,
    platt: false,
    kyla: 0.7,
    ljud: 'whoosh',
    cue: 'Spraya på flugan så blir vingarna blöta och tunga!',
  },
  {
    key: 'pilbossa',
    namn: 'pilbössan',
    radie: 54,
    kraft: 1.3,
    typ: ['slag'],
    // Pilen FLYGER dit — den är det enda verktyget med en riktig restid, och det är
    // meningen: man siktar före flugan, inte på den.
    droj: 0.34,
    platt: true,
    kyla: 0.8,
    ljud: 'pop',
    cue: 'Skjut en sugpil! Sikta där flugan ska vara.',
  },
  {
    key: 'tidning',
    namn: 'tidningen',
    radie: 132,
    kraft: 1.0,
    typ: ['slag', 'vind'],
    droj: 0.16,
    platt: true,
    kyla: 0.55,
    ljud: 'whoosh',
    cue: 'Svep med tidningen! Den tar en hel bit på en gång.',
  },
  {
    key: 'slemhand',
    namn: 'slemhanden',
    radie: 66,
    kraft: 0.5,
    typ: ['klibb'],
    droj: 0.26,
    platt: false,
    // Klibbet HÅLLER kvar det den fångar i stället för att slå bort det. Kylan är längst
    // av alla — annars kunde allt i rummet hänga i handen samtidigt.
    klibbTid: 2.4,
    kyla: 1.1,
    ljud: 'plopp',
    cue: 'Slemhanden fastnar i saker och drar med sig dem!',
  },
]

export const VERKTYG_KEYS = VERKTYG.map((v) => v.key)
export const verktygSpec = (key) => VERKTYG.find((v) => v.key === key) || VERKTYG[0]

/** Ligger punkten inom verktygets verkansyta räknat från träffpunkten? */
export function inomVerkan(spec, tx, ty, px, py, franX, franY) {
  const d = Math.hypot(px - tx, py - ty)
  if (!spec.kon) return d <= spec.radie
  // Konen mäts från MYNNINGEN (`fran`), inte från träffpunkten: en spray träffar allt
  // på vägen fram, inte bara det som råkar ligga runt siktpunkten.
  const ax = tx - franX
  const ay = ty - franY
  const al = Math.hypot(ax, ay) || 1
  const bx = px - franX
  const by = py - franY
  const bl = Math.hypot(bx, by) || 1
  if (bl > spec.radie) return false
  const cos = (ax * bx + ay * by) / (al * bl)
  return cos > Math.cos(spec.kon)
}

// ---------------------------------------------------------------------------
// ⓶ IKONERNA
// ---------------------------------------------------------------------------

const P = {
  smallaRod: 0xe0524e, smallaMork: 0xa8332f, smallaLjus: 0xf08a86,
  metall: 0xc3ced8, metallMork: 0x8b98a5,
  sprayBla: 0x4aa3df, sprayMork: 0x2f7fb8, sprayLjus: 0x9ed4f2,
  plastVit: 0xf4f8fb, plastMork: 0xc2cfd9,
  bossaOrange: 0xf08a3c, bossaMork: 0xb75f1c, bossaLjus: 0xffb877,
  pilGul: 0xffd15c, sugkopp: 0xe0603f,
  tidningPapper: 0xf6f0e2, tidningMork: 0xcfc4ac, tidningText: 0x8b93a0,
  slemGron: 0x6ecb5a, slemMork: 0x3f8a34, slemLjus: 0xa8e69a,
  fjader: 0xb8c4d0,
  morkt: 0x33291f,
}

function nyG() {
  const g = new Graphics()
  g.eventMode = 'none'
  return g
}

/**
 * Verktyget som det ligger i lådan. Allt är centrerat i (0,0) och håller sig innanför
 * ±58 px i sidled — verktygen står 165 px isär, så en detalj som stack ut bredare hade
 * hamnat inne i grannens träffyta (P0: konsten och träffytan är TVÅ budgetar).
 */
export function makeIkon(key) {
  const c = new Container()
  c.eventMode = 'none'
  const g = nyG()
  c.addChild(g)

  if (key === 'flugsmalla') {
    // Flugsmällan: fjädrande ståltråd och en perforerad platta. Hålen är det som gör att
    // den läser som en flugsmälla och inte som en spade.
    g.ellipse(4, 44, 26, 7).fill({ color: P.morkt, alpha: 0.18 })
    g.moveTo(2, 44).quadraticCurveTo(-6, 20, 4, -2).stroke({ width: 6, color: P.metall, cap: 'round' })
    g.moveTo(2, 44).quadraticCurveTo(-6, 20, 4, -2).stroke({ width: 2, color: P.metallMork, alpha: 0.5, cap: 'round' })
    g.roundRect(-4, 36, 14, 16, 5).fill(cylinderFill(P.metallMork, { axis: 'x' }))
    g.roundRect(-30, -46, 68, 52, 13).fill(topLightFill(P.smallaRod, { highlight: 0.3, dark: 0.2 }))
      .stroke({ width: 4, color: P.smallaMork })
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 4; k++) {
        g.circle(-19 + k * 15, -34 + r * 14, 3.6).fill({ color: P.smallaMork, alpha: 0.55 })
      }
    }
    g.moveTo(-22, -40).lineTo(24, -40).stroke({ width: 4, color: P.smallaLjus, alpha: 0.7, cap: 'round' })
  } else if (key === 'spray') {
    // Sprayflaskan: genomskinlig flaska med blått innehåll, pumphuvud och avtryckare.
    g.ellipse(0, 48, 28, 8).fill({ color: P.morkt, alpha: 0.18 })
    g.roundRect(-24, -8, 48, 56, 11).fill(verticalFill(P.sprayLjus, P.sprayBla))
      .stroke({ width: 3.5, color: P.sprayMork })
    g.roundRect(-19, 14, 38, 28, 6).fill({ color: P.sprayMork, alpha: 0.45 })
    g.roundRect(-18, -4, 9, 42, 4).fill({ color: 0xffffff, alpha: 0.42 })
    g.roundRect(-11, -22, 22, 16, 5).fill(cylinderFill(P.plastVit, { axis: 'x' })).stroke({ width: 3, color: P.plastMork })
    // Pumphuvudet + munstycket som pekar åt höger.
    g.moveTo(-16, -34).lineTo(14, -34).lineTo(20, -26).lineTo(-14, -26).closePath()
      .fill(topLightFill(P.plastVit, { dark: 0.2 })).stroke({ width: 3, color: P.plastMork })
    g.roundRect(18, -34, 12, 8, 3).fill(P.plastMork)
    g.moveTo(-14, -26).quadraticCurveTo(-24, -20, -20, -10).stroke({ width: 5, color: P.plastMork, cap: 'round' })
    // Tre droppar på väg ut — riktningen syns redan i vila.
    for (const [dx, dy, dr] of [[38, -32, 4], [46, -25, 3], [40, -19, 2.4]]) {
      g.circle(dx, dy, dr).fill({ color: P.sprayLjus, alpha: 0.85 })
    }
  } else if (key === 'pilbossa') {
    // Pilbössan: leksaksorange pipa med en sugpil på väg ut. Sugkoppen är det enda som
    // skiljer den från ett vapen — den ritas stor och trubbig med flit.
    g.ellipse(0, 42, 30, 8).fill({ color: P.morkt, alpha: 0.18 })
    g.roundRect(-34, -18, 54, 20, 9).fill(cylinderFill(P.bossaOrange))
      .stroke({ width: 3.5, color: P.bossaMork })
    g.roundRect(-30, -14, 16, 6, 3).fill({ color: P.bossaLjus, alpha: 0.8 })
    // Kolven lutar bakåt-ner.
    g.moveTo(-34, -6).lineTo(-20, -6).lineTo(-14, 34).lineTo(-34, 34).closePath()
      .fill(topLightFill(P.bossaOrange, { dark: 0.26 })).stroke({ width: 3.5, color: P.bossaMork })
    g.roundRect(-16, 2, 12, 12, 4).fill(P.bossaMork)
    // Pilen: skaft, fjäder och sugkopp längst fram.
    g.roundRect(18, -14, 26, 12, 5).fill(cylinderFill(P.pilGul)).stroke({ width: 3, color: shade(P.pilGul, 0.45) })
    g.moveTo(44, -14).quadraticCurveTo(56, -8, 44, -2).quadraticCurveTo(50, -8, 44, -14).closePath()
      .fill(P.sugkopp).stroke({ width: 3, color: shade(P.sugkopp, 0.4) })
    g.moveTo(20, -16).lineTo(14, -22).lineTo(20, -18).closePath().fill(P.fjader)
    g.moveTo(20, 0).lineTo(14, 6).lineTo(20, 2).closePath().fill(P.fjader)
  } else if (key === 'tidning') {
    // Hoprullad tidning: en rulle sedd snett, med synliga lager i änden och tryckta rader
    // på utsidan. Raderna är STRECK, aldrig en Text-nod.
    g.ellipse(2, 46, 30, 8).fill({ color: P.morkt, alpha: 0.18 })
    g.roundRect(-16, -48, 34, 96, 17).fill(cylinderFill(P.tidningPapper, { axis: 'x' }))
      .stroke({ width: 3.5, color: P.tidningMork })
    // Rullens ände: tre inre ringar = hoprullat papper.
    g.ellipse(1, -46, 17, 7).fill(topLightFill(0xfffdf6, { dark: 0.1 })).stroke({ width: 3, color: P.tidningMork })
    g.ellipse(1, -46, 11, 4.4).stroke({ width: 2.4, color: P.tidningMork, alpha: 0.7 })
    g.ellipse(1, -46, 5, 2).stroke({ width: 2, color: P.tidningMork, alpha: 0.55 })
    for (let r = 0; r < 7; r++) {
      const ly = -28 + r * 10
      g.moveTo(-9, ly).lineTo(11, ly).stroke({ width: 2.6, color: P.tidningText, alpha: 0.42 })
    }
    g.moveTo(-9, -18).lineTo(11, -18).stroke({ width: 5, color: P.tidningText, alpha: 0.6 })
    g.roundRect(-14, -6, 30, 8, 4).fill({ color: 0xe0603f, alpha: 0.75 })
  } else {
    // Slemhanden: en grön gummihand på en tänjbar spiral. Fingrarna är olika långa —
    // fem lika stumpar läser som en kam.
    g.ellipse(0, 46, 28, 8).fill({ color: P.morkt, alpha: 0.18 })
    for (let i = 0; i < 5; i++) {
      const sy = 18 + i * 7
      g.moveTo(-16, sy).quadraticCurveTo(0, sy - 9, 16, sy).stroke({ width: 5, color: P.slemMork, alpha: 0.75 })
    }
    // Handflatan.
    g.roundRect(-26, -20, 52, 40, 16).fill(sphereFill(P.slemGron, { lightY: 0.3, dark: 0.3 }))
      .stroke({ width: 3.5, color: P.slemMork })
    // Fyra fingrar + tumme, alla olika långa.
    const fingrar = [[-19, -30, 12], [-7, -38, 15], [6, -36, 14], [17, -28, 11]]
    for (const [fx, fy, fl] of fingrar) {
      g.roundRect(fx - 6, fy, 12, fl + 14, 6).fill(sphereFill(P.slemGron, { lightY: 0.34, dark: 0.28 }))
        .stroke({ width: 3, color: P.slemMork })
    }
    g.roundRect(-36, -10, 18, 12, 6).fill(sphereFill(P.slemGron, { lightY: 0.34, dark: 0.28 }))
      .stroke({ width: 3, color: P.slemMork })
    g.ellipse(-4, -10, 13, 8).fill({ color: P.slemLjus, alpha: 0.6 })
    // Ett par slemdroppar som hänger — det är de som säger KLIBBIG.
    for (const [dx, dy, dr] of [[-22, 22, 5], [10, 26, 4]]) {
      g.moveTo(dx - dr, dy).quadraticCurveTo(dx, dy + dr * 2.4, dx + dr, dy)
        .quadraticCurveTo(dx, dy - dr * 0.6, dx - dr, dy).fill({ color: P.slemLjus, alpha: 0.9 })
    }
  }
  return c
}

// ---------------------------------------------------------------------------
// ⓷ EFFEKTERNA
// ---------------------------------------------------------------------------

// Samlar varje nod i trädet — `killTweensOf(roten)` når BARA roten, och armar, pilfjädrar
// och droppar ligger flera nivåer in.
function samlaNoder(nod, ut = []) {
  if (!nod) return ut
  ut.push(nod)
  const barn = nod.children || []
  for (let i = 0; i < barn.length; i++) samlaNoder(barn[i], ut)
  return ut
}

/**
 * Verktygens verkan som BILD. Äger ett eget lager och river allt i `destroy()`.
 *
 * `spela(key, x, y, fran)` ritar handlingen mot punkten (x, y) utgående från `fran`
 * (verktygets plats i lådan). Den returnerar ingenting — vad som TRÄFFADES räknar
 * `index.js` ut själv ur `VERKTYG`-tabellen, så bilden och verkan aldrig kan glida isär.
 */
export class Effekter {
  constructor(lager) {
    this._lager = lager
    this._tls = []
    this._noder = []
    this._levande = true
  }

  _tl(vars) {
    const tl = gsap.timeline(vars)
    this._tls.push(tl)
    // Städa FÄRDIGA tidslinjer, aldrig den äldsta: `tw.parent` är sant för löpande OCH
    // köade och falskt för både färdiga och dödade.
    for (let i = this._tls.length - 2; i >= 0; i--) if (!this._tls[i].parent) this._tls.splice(i, 1)
    return tl
  }

  _nod(x, y) {
    const c = new Container()
    c.eventMode = 'none'
    c.position.set(x, y)
    this._lager.addChild(c)
    this._noder.push(c)
    return c
  }

  _riv(nod) {
    if (!nod) return
    for (const n of samlaNoder(nod)) {
      gsap.killTweensOf(n)
      if (n.scale) gsap.killTweensOf(n.scale)
      if (n.position) gsap.killTweensOf(n.position)
    }
    this._noder = this._noder.filter((n) => n !== nod)
    if (!nod.destroyed) nod.destroy({ children: true })
  }

  spela(key, x, y, fran) {
    if (!this._levande || !this._lager || this._lager.destroyed) return
    if (key === 'flugsmalla') return this._smalla(x, y)
    if (key === 'spray') return this._spray(x, y, fran)
    if (key === 'pilbossa') return this._pil(x, y, fran)
    if (key === 'tidning') return this._svep(x, y, fran)
    return this._slem(x, y, fran)
  }

  // Smällan slår ner uppifrån och studsar upp igen. Plattan roterar kring HANDTAGETS
  // ände, inte kring sin egen mitt — annars glider den i sidled i stället för att svinga.
  _smalla(x, y) {
    const nod = this._nod(x, y)
    const arm = new Container()
    arm.eventMode = 'none'
    // Pivoten ligger 96 px ovanför träffpunkten: svingen blir en båge, inte en nedfirning.
    arm.position.set(0, -96)
    nod.addChild(arm)
    const g = nyG()
    g.moveTo(0, 0).quadraticCurveTo(-10, 48, 0, 92).stroke({ width: 7, color: P.metall, cap: 'round' })
    g.roundRect(-40, 84, 80, 60, 15).fill(topLightFill(P.smallaRod, { highlight: 0.3, dark: 0.2 }))
      .stroke({ width: 5, color: P.smallaMork })
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 4; k++) g.circle(-26 + k * 17, 98 + r * 16, 4).fill({ color: P.smallaMork, alpha: 0.5 })
    }
    arm.addChild(g)
    arm.rotation = -1.25

    const ring = nyG()
    ring.eventMode = 'none'
    ring.alpha = 0
    nod.addChild(ring)
    ring.circle(0, 0, 40).stroke({ width: 9, color: 0xffffff, alpha: 0.9 })

    const tl = this._tl({ onComplete: () => { if (this._levande) this._riv(nod) } })
    tl.to(arm, { rotation: 0.12, duration: 0.12, ease: 'power3.in' }, 0)
      .to(arm, { rotation: -0.05, duration: 0.09, ease: 'power2.out' }, 0.12)
      .to(arm, { rotation: -1.5, duration: 0.28, ease: 'back.in(1.4)' }, 0.24)
      .to(nod, { alpha: 0, duration: 0.16, ease: 'power1.in' }, 0.4)
    // Slagringen föds EXAKT när plattan är nere (`droj` 0,12).
    tl.set(ring, { alpha: 0.95 }, 0.12)
      .to(ring.scale, { x: 2.6, y: 1.5, duration: 0.34, ease: 'power2.out' }, 0.12)
      .to(ring, { alpha: 0, duration: 0.3, ease: 'power1.in' }, 0.16)
  }

  // Sprayen: en kon av droppar som far från flaskans mynning mot punkten och tunnas ut.
  _spray(x, y, fran) {
    const f = fran || { x, y: y + 200 }
    const nod = this._nod(f.x, f.y)
    const vinkel = Math.atan2(y - f.y, x - f.x)
    const langd = Math.min(320, Math.hypot(x - f.x, y - f.y) + 60)

    const dis = nyG()
    dis.eventMode = 'none'
    nod.addChild(dis)
    // Konen ritas i EN riktning och roteras — då blir spridningen densamma åt alla håll.
    for (let i = 0; i < 26; i++) {
      const t = 0.18 + (i / 26) * 0.82
      const spr = (((i * 37) % 100) / 100 - 0.5) * 2 * 0.4 * t
      const dx = Math.cos(spr) * langd * t
      const dy = Math.sin(spr) * langd * t
      dis.circle(dx, dy, 3 + t * 7).fill({ color: P.sprayLjus, alpha: 0.5 - t * 0.2 })
    }
    dis.rotation = vinkel
    dis.scale.set(0.2, 0.5)
    dis.alpha = 0

    const tl = this._tl({ onComplete: () => { if (this._levande) this._riv(nod) } })
    tl.to(dis, { alpha: 0.95, duration: 0.1, ease: 'power2.out' }, 0)
      .to(dis.scale, { x: 1, y: 1, duration: 0.26, ease: 'power2.out' }, 0)
      .to(dis, { alpha: 0, duration: 0.34, ease: 'power1.in' }, 0.28)
  }

  // Pilen flyger i en båge från bössan till punkten och SITTER KVAR en stund där den
  // landade — det är hela poängen med en sugpil.
  _pil(x, y, fran) {
    const f = fran || { x, y: y + 240 }
    const nod = this._nod(f.x, f.y)
    const pil = new Container()
    pil.eventMode = 'none'
    nod.addChild(pil)
    const g = nyG()
    g.roundRect(-22, -7, 30, 14, 6).fill(cylinderFill(P.pilGul)).stroke({ width: 3, color: shade(P.pilGul, 0.45) })
    g.moveTo(8, -9).quadraticCurveTo(24, 0, 8, 9).quadraticCurveTo(16, 0, 8, -9).closePath()
      .fill(P.sugkopp).stroke({ width: 3, color: shade(P.sugkopp, 0.4) })
    for (const s of [-1, 1]) {
      g.moveTo(-20, s * 8).lineTo(-30, s * 15).lineTo(-20, s * 3).closePath().fill(P.fjader)
    }
    pil.addChild(g)

    // Bågen: en kontrollpunkt en bit ovanför mittsträckan. Läget skrivs på en PROXY och
    // kopieras till noden bara om den lever — samma exit-mönster som feedback.js.
    const mx = (f.x + x) / 2
    const my = (f.y + y) / 2 - Math.max(60, Math.hypot(x - f.x, y - f.y) * 0.28)
    const st = { p: 0 }
    const tl = this._tl()
    tl.to(st, {
      p: 1,
      duration: 0.34,
      ease: 'power1.out',
      onUpdate: () => {
        if (nod.destroyed || pil.destroyed) return
        const t = st.p
        const u = 1 - t
        const px = u * u * f.x + 2 * u * t * mx + t * t * x
        const py = u * u * f.y + 2 * u * t * my + t * t * y
        // Riktningen läses ur BANANS derivata, inte ur (mål − nu): nära målet är den
        // skillnaden ~0 px och pilen hade snurrat runt sista bildrutan.
        const dx = 2 * u * (mx - f.x) + 2 * t * (x - mx)
        const dy = 2 * u * (my - f.y) + 2 * t * (y - my)
        nod.position.set(px, py)
        pil.rotation = Math.atan2(dy, dx)
      },
    }, 0)
    // Fastnar: en liten studs i sugkoppen, sedan hänger den kvar och glider av.
    tl.to(pil.scale, { x: 0.82, y: 1.18, duration: 0.08, ease: 'power2.out' }, 0.34)
      .to(pil.scale, { x: 1, y: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }, 0.42)
      .to(pil, { rotation: `+=${Math.PI / 2}`, duration: 0.5, ease: 'power1.in' }, 2.2)
      .to(nod, { y: `+=90`, alpha: 0, duration: 0.5, ease: 'power2.in' }, 2.3)
    tl.eventCallback('onComplete', () => { if (this._levande) this._riv(nod) })
  }

  // Tidningen sveper i en vid båge tvärs över punkten och drar med sig fartstreck.
  _svep(x, y, fran) {
    const nod = this._nod(x, y)
    const fromVanster = !fran || fran.x <= x
    const s = fromVanster ? 1 : -1

    const rulle = new Container()
    rulle.eventMode = 'none'
    rulle.position.set(0, -110)
    nod.addChild(rulle)
    const g = nyG()
    g.roundRect(-18, 0, 36, 118, 18).fill(cylinderFill(P.tidningPapper, { axis: 'x' }))
      .stroke({ width: 4, color: P.tidningMork })
    for (let r = 0; r < 8; r++) g.moveTo(-10, 18 + r * 12).lineTo(12, 18 + r * 12).stroke({ width: 3, color: P.tidningText, alpha: 0.4 })
    g.ellipse(0, 116, 18, 8).fill(topLightFill(0xfffdf6, { dark: 0.12 })).stroke({ width: 3, color: P.tidningMork })
    rulle.addChild(g)
    rulle.rotation = s * 1.4

    // Fartstrecken: tre bågar som följer svepet.
    const spar = nyG()
    spar.eventMode = 'none'
    spar.alpha = 0
    nod.addChild(spar)
    for (let i = 0; i < 3; i++) {
      const r = 96 + i * 22
      spar.arc(0, -110, r, s > 0 ? -0.4 : Math.PI + 0.4, s > 0 ? 1.4 : Math.PI - 1.4, s < 0)
        .stroke({ width: 7 - i * 1.6, color: 0xffffff, alpha: 0.55 - i * 0.12 })
    }

    const tl = this._tl({ onComplete: () => { if (this._levande) this._riv(nod) } })
    tl.to(rulle, { rotation: -s * 1.1, duration: 0.16, ease: 'power3.in' }, 0)
      .to(rulle, { rotation: -s * 0.85, duration: 0.1, ease: 'power2.out' }, 0.16)
      .to(rulle, { rotation: s * 1.6, duration: 0.3, ease: 'back.in(1.2)' }, 0.28)
      .to(nod, { alpha: 0, duration: 0.18, ease: 'power1.in' }, 0.42)
    tl.set(spar, { alpha: 1 }, 0.06)
      .to(spar, { alpha: 0, duration: 0.34, ease: 'power1.in' }, 0.16)
  }

  // Slemhanden skjuts ut på en tänjbar arm, greppar och dras tillbaka.
  _slem(x, y, fran) {
    const f = fran || { x, y: y + 240 }
    const nod = this._nod(f.x, f.y)
    // Armen ritas om varje bildruta mellan mynningen och handen — den är en fjäder, och
    // en fjäder som bara skalas ser ut som ett gummiband.
    const arm = nyG()
    arm.eventMode = 'none'
    this._lager.addChild(arm)
    this._noder.push(arm)

    const hand = new Container()
    hand.eventMode = 'none'
    nod.addChild(hand)
    const g = nyG()
    g.roundRect(-24, -18, 48, 36, 15).fill(sphereFill(P.slemGron, { lightY: 0.3, dark: 0.3 }))
      .stroke({ width: 3.5, color: P.slemMork })
    for (const [fx, fy, fl] of [[-16, -30, 14], [-3, -36, 17], [10, -32, 15], [21, -22, 11]]) {
      g.roundRect(fx - 6, fy, 12, fl + 14, 6).fill(sphereFill(P.slemGron, { lightY: 0.34, dark: 0.28 }))
        .stroke({ width: 3, color: P.slemMork })
    }
    g.ellipse(-3, -8, 12, 7).fill({ color: P.slemLjus, alpha: 0.6 })
    hand.addChild(g)

    const st = { p: 0 }
    const ritaArm = () => {
      if (arm.destroyed || nod.destroyed) return
      arm.clear()
      const ax = f.x
      const ay = f.y
      const bx = nod.x
      const by = nod.y
      const dx = bx - ax
      const dy = by - ay
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      // Sex vågor tvärs riktningen = en spiral sedd från sidan.
      arm.moveTo(ax, ay)
      const varv = 7
      for (let i = 1; i <= varv * 4; i++) {
        const t = i / (varv * 4)
        const amp = Math.sin(t * Math.PI) * 16 * (1 - st.p * 0.55)
        const w = Math.sin(t * Math.PI * 2 * varv) * amp
        arm.lineTo(ax + dx * t + nx * w, ay + dy * t + ny * w)
      }
      arm.stroke({ width: 9, color: P.slemGron, alpha: 0.95, cap: 'round', join: 'round' })
      arm.moveTo(ax, ay)
      for (let i = 1; i <= varv * 4; i++) {
        const t = i / (varv * 4)
        const amp = Math.sin(t * Math.PI) * 16 * (1 - st.p * 0.55)
        const w = Math.sin(t * Math.PI * 2 * varv) * amp
        arm.lineTo(ax + dx * t + nx * w, ay + dy * t + ny * w)
      }
      arm.stroke({ width: 3.5, color: P.slemLjus, alpha: 0.7, cap: 'round', join: 'round' })
    }

    const tl = this._tl({
      onComplete: () => {
        if (!this._levande) return
        this._riv(arm)
        this._riv(nod)
      },
    })
    tl.to(st, {
      p: 1,
      duration: 0.26,
      ease: 'power2.out',
      onUpdate: () => {
        if (nod.destroyed) return
        nod.position.set(f.x + (x - f.x) * st.p, f.y + (y - f.y) * st.p)
        ritaArm()
      },
    }, 0)
    // Greppet: fingrarna knycker ihop.
    tl.to(hand.scale, { x: 0.78, y: 1.2, duration: 0.1, ease: 'power2.out' }, 0.26)
      .to(hand.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' }, 0.36)
    tl.to(st, {
      p: 0,
      duration: 0.34,
      ease: 'power2.in',
      onUpdate: () => {
        if (nod.destroyed) return
        nod.position.set(f.x + (x - f.x) * st.p, f.y + (y - f.y) * st.p)
        ritaArm()
      },
    }, 0.62)
    tl.to(nod, { alpha: 0, duration: 0.12, ease: 'power1.in' }, 0.88)
  }

  destroy() {
    this._levande = false
    for (const tl of this._tls) tl?.kill()
    this._tls = []
    for (const nod of this._noder) {
      if (!nod) continue
      for (const n of samlaNoder(nod)) {
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
        if (n.position) gsap.killTweensOf(n.position)
      }
      if (!nod.destroyed) nod.destroy({ children: true })
    }
    this._noder = []
    this._lager = null
  }
}

// Färgerna delas med lådan i `rummet.js` — verktygen ska ligga i något som ser ut att
// höra till skrivbordet, inte i en UI-list.
export const VERKTYG_FARG = P
