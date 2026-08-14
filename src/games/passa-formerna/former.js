// Formvännerna, trälådans hål och den lilla musen — all geometri för `passa-formerna`.
//
// P0 ASSETS: en formvän är ett FRISTÅENDE föremål med egen silhuett — samma kontur som
// hålet den passar i, plus ögon, mun och två små armar som kan vinka. Ingen emoji, ingen
// bricka, ingen ruta. Hålet i lådan ritas ur EXAKT samma vägbyggare (`formVag`), så att
// silhuetten barnet håller i handen och silhuetten i träet är samma form — det är hela
// pusslet, och det hade gått sönder tyst om de ritats var för sig.
//
// Två saker här är uppmätta i geometrin, inte tyckta:
//  · HALVMÅNENS kött ligger mellan x = −1,08r och ≈ −0,27r. Ett ansikte i formens mitt
//    hamnar därför i den bortskurna cirkeln — alltså i tomma luften. Ansiktet flyttas
//    per form (ANSIKTE) och armarna fäster där formen FAKTISKT har kant (ARMAR).
//  · TRIANGELN är smal upptill; ansiktet sitter en bit ned där den är bred nog för två
//    ögon. Samma sak för stjärnan, vars armar sitter i sidospetsarna.
import { Container, Graphics } from 'pixi.js'
import { topLightFill, sphereFill } from '../../lib/form.js'
import { shade, tint, COLORS } from '../../lib/theme.js'

export const FORM_KEYS = ['cirkel', 'triangel', 'kvadrat', 'stjarna', 'hjarta', 'halvmane', 'femhorning']

// Ansiktets läge (i r-enheter) och storlek per form — se filhuvudet.
const ANSIKTE = {
  cirkel: { x: 0, y: -0.02, s: 1 },
  triangel: { x: 0, y: 0.26, s: 0.86 },
  kvadrat: { x: 0, y: -0.02, s: 1 },
  stjarna: { x: 0, y: 0.04, s: 0.9 },
  hjarta: { x: 0, y: 0.02, s: 0.98 },
  halvmane: { x: -0.66, y: 0, s: 0.76 },
  femhorning: { x: 0, y: 0.08, s: 0.96 },
}

// Armfästen (i r-enheter) — punkter som ligger PÅ formens kant, inte i luften bredvid.
const ARMAR = {
  cirkel: [{ x: -0.86, y: 0.3 }, { x: 0.86, y: 0.3 }],
  kvadrat: [{ x: -0.84, y: 0.24 }, { x: 0.84, y: 0.24 }],
  triangel: [{ x: -0.88, y: 0.42 }, { x: 0.88, y: 0.42 }],
  stjarna: [{ x: -1.04, y: -0.34 }, { x: 1.04, y: -0.34 }],
  hjarta: [{ x: -0.92, y: 0.12 }, { x: 0.92, y: 0.12 }],
  // Halvmånen: en arm på ryggen (yttre bågen), en på det nedre hornet. Båda punkterna
  // ligger på KÖTTET — mitten av formen är bortskuren.
  halvmane: [{ x: -0.85, y: 0.35 }, { x: 0.4, y: 0.9 }],
  femhorning: [{ x: -0.82, y: 0.08 }, { x: 0.82, y: 0.08 }],
}

// --- vägbyggare -------------------------------------------------------------

function polyPunkter(sidor, r, rot = -Math.PI / 2) {
  const p = []
  for (let i = 0; i < sidor; i++) {
    const a = rot + (i / sidor) * Math.PI * 2
    p.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return p
}

function stjarnPunkter(yttre, inre) {
  const p = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    const rr = i % 2 ? inre : yttre
    p.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr })
  }
  return p
}

// Polygon med mjuka hörn: gå från kantmitt till kantmitt och runda av i varje hörn.
// Rundade hörn är inte kosmetik här — en vass 2 cm-spets på en leksak för tvååringar
// läser fel, och hålet ska se ut som slipat trä.
function rundadVag(g, pts, rad) {
  const n = pts.length
  const mitt = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const m0 = mitt(pts[0], pts[1])
  g.moveTo(m0.x, m0.y)
  for (let i = 1; i <= n; i++) {
    const h = pts[i % n]
    const m = mitt(h, pts[(i + 1) % n])
    g.arcTo(h.x, h.y, m.x, m.y, rad)
  }
  g.closePath()
}

/**
 * Lägg formens väg i `g` (anroparen fyller/stryker själv). r = "radie" i den mening att
 * alla former upplevs ungefär lika stora vid samma r — faktorerna nedan är utjämning,
 * en triangel med samma omskrivna radie som en cirkel ser mycket mindre ut.
 */
export function formVag(g, typ, r) {
  switch (typ) {
    case 'kvadrat': {
      const h = r * 0.86
      g.roundRect(-h, -h, h * 2, h * 2, r * 0.2)
      break
    }
    case 'triangel':
      rundadVag(g, polyPunkter(3, r * 1.22), r * 0.24)
      break
    case 'femhorning':
      rundadVag(g, polyPunkter(5, r * 1.06), r * 0.18)
      break
    case 'stjarna':
      rundadVag(g, stjarnPunkter(r * 1.16, r * 0.56), r * 0.1)
      break
    case 'hjarta':
      g.moveTo(0, r * 0.94)
      g.bezierCurveTo(-r * 1.3, r * 0.12, -r * 0.72, -r * 1.04, 0, -r * 0.34)
      g.bezierCurveTo(r * 0.72, -r * 1.04, r * 1.3, r * 0.12, 0, r * 0.94)
      g.closePath()
      break
    case 'halvmane': {
      // Ytterbåge runt vänstra sidan, innerbåge tillbaka genom den urgröpta högersidan.
      // Vinklarna är de två cirklarnas skärningspunkter, uträknade en gång.
      //
      // ⚠️ INNERBÅGEN MÅSTE GÅ MOTURS. Den del av innercirkeln som ligger inuti
      // yttercirkeln är dess VÄNSTRA sida (den går som längst till x = d − ri = −0,25R).
      // Ritas bågen medurs tar den den högra vägen i stället — utanför månen — och
      // silhuetten blir en KLUMP med ett litet hack, inte en halvmåne. Det syns bara i
      // bild: ingen krasch, inget konsolfel, och sonden `_formbild` fångade det direkt.
      const R = r * 1.08
      const d = R * 0.55
      const ri = R * 0.8
      const a = 0.925
      const b = 1.506
      g.moveTo(Math.cos(a) * R, Math.sin(a) * R)
      g.arc(0, 0, R, a, Math.PI * 2 - a)
      g.arc(d, 0, ri, -b, b, true)
      g.closePath()
      break
    }
    default:
      g.circle(0, 0, r)
      break
  }
  return g
}

// --- formvännen -------------------------------------------------------------

/**
 * En formvän: skugga + kropp (silhuett, glans, ögon, mun, två armar).
 * Allt LIV läggs på `kropp` — aldrig på `view`, som draget äger.
 */
export function makeFormvan(typ, r, farg, { gyllene = false } = {}) {
  const view = new Container()
  const mork = shade(farg, gyllene ? 0.3 : 0.36)
  const ljus = tint(farg, 0.45)

  const skugga = new Graphics().ellipse(0, r * 1.24, r * 0.78, r * 0.22).fill({ color: 0x3a2412, alpha: 0.22 })
  skugga.eventMode = 'none'

  // TVÅ lager, med flit: `kropp` bär vilo-guppningen (liv skriver y + rotation varje
  // bildruta) och `mitt` bär reaktionerna (squash/wiggle skriver scale + rotation). Slås
  // de ihop vinner guppningen varje bildruta och en vingel vid fel hål blir OSYNLIG —
  // utan ett konsolfel, utan att något ser fel ut i koden.
  const kropp = new Container()
  kropp.eventMode = 'none'
  const mitt = new Container()
  mitt.eventMode = 'none'
  kropp.addChild(mitt)

  // Armarna ligger BAKOM kroppen så bara händerna sticker ut — och de har egen pivå i
  // fästpunkten, så en vinkning är en rotation i stället för en omritad kurva.
  const armar = ARMAR[typ] ?? ARMAR.cirkel
  const armNoder = armar.map((a, i) => {
    const sida = a.x >= 0 ? 1 : -1
    const arm = new Container()
    arm.position.set(a.x * r, a.y * r)
    const g = new Graphics()
    g.moveTo(0, 0).quadraticCurveTo(sida * r * 0.2, r * 0.22, sida * r * 0.32, r * 0.34)
    g.stroke({ width: Math.max(4, r * 0.15), color: mork, cap: 'round' })
    g.circle(sida * r * 0.32, r * 0.34, r * 0.13).fill(ljus)
    arm.addChild(g)
    arm._sida = sida
    arm._nr = i
    mitt.addChild(arm)
    return arm
  })

  // Silhuetten. topLightFill är cachad per färg (ingen ny FillGradient per montering).
  const body = new Graphics()
  formVag(body, typ, r)
  body.fill(topLightFill(farg, { highlight: 0.34, dark: 0.22 })).stroke({ width: Math.max(3, r * 0.09), color: mork })
  mitt.addChild(body)

  // Glans: en liten oval uppe till vänster ger formen volym utan en egen gradient.
  const glans = new Graphics().ellipse(-r * 0.3, -r * 0.44, r * 0.26, r * 0.16).fill({ color: COLORS.white, alpha: 0.42 })
  glans.eventMode = 'none'
  mitt.addChild(glans)

  if (gyllene) {
    // Gyllene formen bär tre små inbakade glimtar utöver de rörliga gnistorna.
    const gl = new Graphics()
    for (const [gx, gy, gr] of [[0.34, -0.2, 0.1], [-0.1, 0.4, 0.07], [0.5, 0.34, 0.06]]) {
      gl.star?.(gx * r, gy * r, 4, gr * r * 2.2, gr * r * 0.8)
      if (!gl.star) gl.circle(gx * r, gy * r, gr * r)
    }
    gl.fill({ color: COLORS.white, alpha: 0.75 })
    gl.eventMode = 'none'
    mitt.addChild(gl)
  }

  // Ansiktet — placerat där formen faktiskt har kött (se filhuvudet).
  const an = ANSIKTE[typ] ?? ANSIKTE.cirkel
  const fx = an.x * r
  const fy = an.y * r
  const fs = an.s
  const ogonR = r * 0.2 * fs
  const dx = r * 0.28 * fs
  const ogon = new Container()
  ogon.position.set(fx, fy)
  const pupiller = []
  for (const s of [-1, 1]) {
    const oga = new Container()
    oga.position.set(s * dx, -r * 0.08 * fs)
    oga.addChild(new Graphics().circle(0, 0, ogonR).fill(sphereFill(COLORS.white, { dark: 0.12, highlight: 0.1 })))
    const pup = new Graphics()
    pup.circle(0, 0, ogonR * 0.52).fill(COLORS.ink)
    pup.circle(ogonR * 0.2, -ogonR * 0.22, ogonR * 0.2).fill(COLORS.white)
    oga.addChild(pup)
    ogon.addChild(oga)
    pupiller.push(pup)
  }
  const mun = new Graphics()
  mun.arc(0, 0, r * 0.2 * fs, 0.16 * Math.PI, 0.84 * Math.PI)
  mun.stroke({ width: Math.max(3, r * 0.07), color: COLORS.ink, cap: 'round' })
  mun.position.set(fx, fy + r * 0.24 * fs)
  mitt.addChild(ogon, mun)

  view.addChild(skugga, kropp)
  view.eventMode = 'static'
  view.cursor = 'pointer'

  return { view, kropp, mitt, body, ogon, pupiller, mun, armar: armNoder, skugga, r }
}

// --- hålet i trälådan -------------------------------------------------------

/**
 * Ett hål: fasad kant i träets mörka ton + svart öppning + en färgad "klar"-ring som
 * tänds när rätt form åkt ner. Egen Container med barnen ritade i origo — dels för
 * djupet, dels för att en bar Graphics med stor `.position` är en känd Pixi-fälla.
 *
 * OBS: hålet är BILDEN. Släppmålet är en egen, orörlig nod i spelet — den här noden
 * guppar och gapar, och ett mål som rör sig flyttar snäppytan mitt i ett släpp.
 */
export function makeHal(typ, r, tra, farg) {
  const hal = new Container()
  // Tre separata kanaler så de aldrig skriver över varandra: `_inner.scale` bär den
  // per-bildruta satta gapningen, `hal.scale` bär pop:en vid rätt form och `hal.x/y`
  // bär skakningen vid fel form. Slås de ihop börjar en tween och en bildruta slåss
  // om samma tal, och hålet fastnar i ett halvt gap.
  const inner = new Container()

  // Öppningen är en aning STÖRRE än formen (1,06) — annars ser biten större ut än sitt
  // hål, och en shape sorter där biten inte får plats läser fel även när träffytan är
  // generös. Syns bara i bild.
  const fas = new Graphics()
  formVag(fas, typ, r * 1.22)
  fas.fill(shade(tra, 0.16)).stroke({ width: 3, color: tint(tra, 0.35), alpha: 0.6 })

  const oppning = new Graphics()
  formVag(oppning, typ, r * 1.06)
  oppning.fill(0x2b1a0d)

  // Djup: en aning mörkare fläck en bit ner i hålet.
  const djup = new Graphics()
  formVag(djup, typ, r * 0.88)
  djup.fill({ color: 0x000000, alpha: 0.45 })
  djup.y = r * 0.1

  // Tänds i formens färg när formen kommit hem (visar framsteg utan poäng).
  const klar = new Graphics()
  formVag(klar, typ, r * 1.22)
  klar.stroke({ width: Math.max(5, r * 0.16), color: farg ?? 0xffffff })
  klar.alpha = 0

  inner.addChild(fas, oppning, djup, klar)
  hal.addChild(inner)
  hal.eventMode = 'none'
  hal.interactiveChildren = false
  hal._inner = inner
  hal._klar = klar
  hal._oppning = oppning
  return hal
}

// --- musen (motgången) ------------------------------------------------------

// En liten grå mus som tittar upp ur ett hål och skymmer det en stund. Ritad, inte
// emoji — och med blida ögon: motgången ska vara rolig, aldrig hotfull (P0 MOTGÅNG).
export function makeMus(r) {
  const m = new Container()
  const grå = 0xb7aea6
  const g = new Graphics()
  // svans först (bakom kroppen)
  g.moveTo(r * 0.5, r * 0.5).quadraticCurveTo(r * 1.25, r * 0.5, r * 1.1, -r * 0.15)
  g.stroke({ width: Math.max(3, r * 0.1), color: shade(grå, 0.22), cap: 'round' })
  // öron
  g.circle(-r * 0.52, -r * 0.5, r * 0.34).fill(grå)
  g.circle(r * 0.52, -r * 0.5, r * 0.34).fill(grå)
  g.circle(-r * 0.52, -r * 0.5, r * 0.19).fill(COLORS.pink)
  g.circle(r * 0.52, -r * 0.5, r * 0.19).fill(COLORS.pink)
  // huvud/kropp
  g.ellipse(0, 0, r * 0.72, r * 0.62).fill(sphereFill(grå, { dark: 0.2, highlight: 0.28 }))
  // nos + morrhår
  g.circle(0, r * 0.26, r * 0.12).fill(COLORS.pink)
  for (const s of [-1, 1]) {
    g.moveTo(s * r * 0.1, r * 0.26).lineTo(s * r * 0.62, r * 0.12)
    g.moveTo(s * r * 0.1, r * 0.3).lineTo(s * r * 0.64, r * 0.36)
    g.stroke({ width: 2, color: shade(grå, 0.4), alpha: 0.8 })
  }
  m.addChild(g)

  const ogon = new Container()
  for (const s of [-1, 1]) {
    const o = new Graphics()
    o.circle(s * r * 0.26, -r * 0.06, r * 0.13).fill(COLORS.ink)
    o.circle(s * r * 0.26 + r * 0.05, -r * 0.1, r * 0.05).fill(COLORS.white)
    ogon.addChild(o)
  }
  m.addChild(ogon)
  m.eventMode = 'none'
  m.interactiveChildren = false
  m._ogon = ogon
  return m
}
