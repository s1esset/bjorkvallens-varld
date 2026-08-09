// Återanvändbara, "marknadsmässiga" bakgrunder för spelen. Ett enda anrop ger en
// mjuk gradient-himmel + dekor (moln, sol, kullar, bokeh, stjärnor) som höjer
// känslan rejält jämfört med platt beige. Allt är dekorativt (eventMode 'none')
// och exit-säkert: drivande moln tweenar en {}-proxy och rör Pixi-objektet bara
// om det lever (samma mönster som lib/feedback.js).
import { Container, Graphics, FillGradient } from 'pixi.js'
import { gsap } from 'gsap'
import { DESIGN_W, DESIGN_H } from './theme.js'
import { sphereFill } from './form.js'
import { DJUP, taggaLager, lagerBredd } from './kamera.js'
import { VIEW, BLEED_X, BLEED_Y, onViewChange } from './view.js'

// Molnens fyllning delas mellan alla moln i hela appen (samma vita klot-gradient, byggd en
// gång) i stället för en ny FillGradient per moln — se lib/form.js.
const CLOUD_FILL = sphereFill(0xffffff, { lightY: 0.2, spread: 0.62, dark: 0.14 })

// Tid på dygnet: EN nyansparameter i stället för sju extra teman. Temats färger lerpas mot
// en ton — himlen mest, marken minst (marken ligger närmare och färgas mindre av luften).
// 'dag' är null = exakt de färger temat redan hade, så en scen utan `tid` är oförändrad.
const TIDER = {
  dag: null,
  // `topp` och `botten` skiljer sig med flit och åt olika håll per tid. En enda faktor över
  // hela himlen provades först och gav en GRÅ skymning: en varm ton lika stark uppe som nere
  // släcker gradienten som gör himlen till en himmel. En riktig skymning glöder vid
  // horisonten och är fortfarande djup ovanför — alltså botten >> topp. En kväll är tvärtom:
  // mörkast uppe, ljusare kvar nere där solen nyss gick ner.
  morgon: { ton: 0xffd9a0, topp: 0.14, botten: 0.36, mark: 0.1, sol: 0xfff0c0 },
  skymning: { ton: 0xff7a4a, topp: 0.26, botten: 0.62, mark: 0.2, sol: 0xffb877 },
  kvall: { ton: 0x4a4a90, topp: 0.52, botten: 0.3, mark: 0.26, sol: 0xffc9a0 },
}

// Färgtema per "miljö". top/bottom = himmelsgradient, ground = ev. markremsa.
// `gras` styr markstrukturen: strån eller prickar (C7 säger "prickar/strån", och vilken av
// dem är inte en detalj). Strån på vattnet i `water` såg ut som skräp i sjön, och det är
// enda sättet den buggen kunde upptäckas — i skärmdumpen. Sand (`warm`) bär strån bra, de
// läser som torrt grässtrå; blått och rosa gör det inte.
const THEMES = {
  sky: { top: 0xaee3fb, bottom: 0xeaf7ea, ground: 0x7fd07f, groundDark: 0x5bbf6a, sun: true, clouds: 3, gras: true },
  meadow: { top: 0xbfe9ff, bottom: 0xdcf5cf, ground: 0x86d27a, groundDark: 0x5bbf6a, sun: true, clouds: 2, hills: true, gras: true },
  sunset: { top: 0xffd9a0, bottom: 0xffc0cb, ground: 0xc79bdc, groundDark: 0xa78bfa, sun: 0xffe6a8, clouds: 2 },
  candy: { top: 0xffe3f1, bottom: 0xe9e0ff, ground: 0xffc4e0, groundDark: 0xff9ec4, bokeh: 10 },
  water: { top: 0xbdeefa, bottom: 0x8fd6ee, ground: 0x4aa3df, groundDark: 0x3f8fc6, bokeh: 6 },
  night: { top: 0x1b2a5b, bottom: 0x3a2f6b, ground: 0x2a2550, groundDark: 0x201b40, stars: 26 },
  warm: { top: 0xfff0d6, bottom: 0xfde8cf, ground: 0xffd9a8, groundDark: 0xf5c98a, bokeh: 8, gras: true },
}

// Skapa en scen-bakgrund. theme = nyckel i THEMES eller eget objekt.
// opts: { width, height, ground(bool), groundH } — ground default på om temat har ground.
//
// Djup (LYFTPLAN C7) läggs till automatiskt för scener som HAR mark, eftersom det är där en
// horisont finns att skapa djup mot: två avståndsband bakom marken, ett disband vid
// horisonten och markstruktur i stället för en jämn yta. Var och en går att stänga av
// (`djup` · `dis` · `markstruktur` · `vinjett`), och `tid` ger morgon/skymning/kväll ur
// samma tema. Allt ligger i scenroten, alltså BAKOM spelytan — vinjetten kan därför aldrig
// mörka ner något barnet ska trycka på.
//
// `kamera: { bredd }` (LYFTPLAN rad 5) delar upp scenen i parallaxlager i stället för att
// lägga allt i en container, och ritar varje lager så brett som just DESS faktor kräver.
// Roten får då `_kamLager`, som `Camera.adopt()` plockar upp. Utan flaggan är utfallet
// oförändrat — samma container, samma ritordning, samma bild.
export function createScene(theme = 'sky', opts = {}) {
  const t = applyTid(typeof theme === 'string' ? THEMES[theme] || THEMES.sky : theme, opts.tid)
  const width = opts.width ?? DESIGN_W
  const height = opts.height ?? DESIGN_H
  const showGround = opts.ground ?? !!t.ground
  const groundH = opts.groundH ?? 96
  const djup = (opts.djup ?? true) && showGround
  const dis = (opts.dis ?? true) && showGround
  const markstruktur = (opts.markstruktur ?? true) && showGround
  const vinjett = opts.vinjett ?? true

  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false

  // Parallaxlagren skapas HÄR, i bakifrån-och-fram-ordning, inte där innehållet ritas.
  // Molnen ritas sist i koden men hör hemma bakom marken; utan en explicit ordning hade de
  // hamnat framför den. Lagren har y-faktor 0: en horisont ska ligga still i höjdled även
  // när bilden panorerar i sidled (se kamera.js — scenen är parallax i sidled).
  const worldW = opts.kamera ? Math.max(width, opts.kamera.bredd ?? width) : width
  const lager = []
  const mk = (f) => {
    if (!opts.kamera) return { c: root, w: width }
    const c = taggaLager(new Container(), { x: f, y: 0 }, { dekor: true })
    lager.push(c)
    root.addChild(c)
    return { c, w: lagerBredd(f, width, worldW) }
  }
  const L = {
    himmel: mk(DJUP.himmel),
    sol: mk(DJUP.sol),
    stjarnor: mk(DJUP.stjarnor),
    moln: mk(DJUP.moln),
    fjarran: mk(DJUP.fjarran),
    dis: mk(DJUP.dis),
    mellan: mk(DJUP.mellan),
    nara: mk(DJUP.nara),
    mark: mk(DJUP.mark),
    vinjett: mk(DJUP.himmel),
  }

  // Himmel (lodrät gradient). Gradienten breddas bara i sidled (samma lodräta mappning
  // som förut — bbox-höjden är oförändrad), och bleed uppåt/nedåt är HELFÄRGADE remsor i
  // en EGEN Graphics: hade remsorna legat i samma form hade den lokala gradient-bboxen
  // vuxit på höjden och färgerna flyttat sig i den synliga bilden.
  const sky = new Graphics()
  paintVGradient(sky, L.himmel.w, height, t.top, t.bottom)
  const skyBleed = new Graphics()
  skyBleed.rect(-BLEED_X, -BLEED_Y, L.himmel.w + 2 * BLEED_X, BLEED_Y).fill(t.top)
  skyBleed.rect(-BLEED_X, height, L.himmel.w + 2 * BLEED_X, BLEED_Y).fill(t.bottom)
  L.himmel.c.addChild(skyBleed, sky)

  // Sol (mjuk halo + skiva) uppe till vänster/höger.
  if (t.sun) {
    const sunColor = typeof t.sun === 'number' ? t.sun : 0xffe27a
    const sun = new Container()
    sun.addChild(new Graphics().circle(0, 0, 120).fill({ color: sunColor, alpha: 0.18 }))
    sun.addChild(new Graphics().circle(0, 0, 84).fill({ color: sunColor, alpha: 0.28 }))
    sun.addChild(new Graphics().circle(0, 0, 58).fill({ color: sunColor }))
    sun.position.set(opts.sunX ?? 150, opts.sunY ?? 130)
    L.sol.c.addChild(sun)
  }

  // Stjärnor (nattema): små tindrande prickar. Spawnar över hela bleed-bredden (lägena
  // är redan Math.random, så det finns ingen baslinje att rubba) och antalet skalas med
  // ytan så tätheten är densamma på en bred skärm.
  if (t.stars) {
    const sw = L.stjarnor.w + 2 * BLEED_X
    for (let i = 0; i < Math.round(t.stars * (sw / width)); i++) {
      const r = 1.5 + Math.random() * 2.5
      const s = new Graphics().circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.85 })
      s.position.set(-BLEED_X + Math.random() * sw, -BLEED_Y + Math.random() * (height * 0.7 + BLEED_Y))
      L.stjarnor.c.addChild(s)
      twinkle(s, 1.2 + Math.random() * 2)
    }
  }

  // Bokeh: mjuka genomskinliga cirklar för djup.
  if (t.bokeh) {
    const bw = L.stjarnor.w + 2 * BLEED_X
    for (let i = 0; i < Math.round(t.bokeh * (bw / width)); i++) {
      const r = 40 + Math.random() * 110
      const b = new Graphics().circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.08 + Math.random() * 0.08 })
      b.position.set(-BLEED_X + Math.random() * bw, -BLEED_Y + Math.random() * (height * 0.85 + BLEED_Y))
      L.stjarnor.c.addChild(b)
    }
  }

  // Mark (rundad kulle-remsa nederst) + djupet bakom den. Ritordningen ÄR djupet:
  // fjärran band → dis → mellanband → mark. Disbandet ligger mellan de två banden, precis
  // som luftperspektiv gör i verkligheten — det är därför fjärran bandet ser avlägset ut
  // trots att det bara är en aning ljusare.
  if (showGround) {
    const gy = height - groundH
    if (djup) {
      // Fjärran: lerpad KRAFTIGT mot himlen. Ett avlägset berg är inte mörkgrönt, det är
      // nästan himmelsfärgat — kontrast, inte storlek, är det som läser som avstånd.
      // Kupolantalet skalas med lagrets bredd, annars blir kullarna utdragna i en bred värld.
      paintBand(L.fjarran.c, L.fjarran.w, gy + 4, kupoler(4, L.fjarran.w, width), 104, lerpColor(t.groundDark, t.bottom, 0.64))
    }
    if (dis) {
      // Disband: ljusare mot horisonten, genomskinligt uppåt. Alfa i färgstoppen fungerar
      // (Pixi kör dem genom Color.toHexa()), så bandet behöver ingen egen alpha på formen.
      const hz = new Graphics().rect(-BLEED_X, gy - 110, L.dis.w + 2 * BLEED_X, 118).fill(hazeFill(t.bottom))
      hz.eventMode = 'none'
      L.dis.c.addChild(hz)
    }
    if (djup) {
      // Mellan- och närband. Tre band i stället för två är skillnaden mellan "det finns en
      // horisont" och "det finns ett landskap": varje band är lägre, mörkare och tätare
      // kuperat än det bakom, vilket är precis de tre signalerna ögat läser som avstånd.
      paintBand(L.mellan.c, L.mellan.w, gy + 14, kupoler(6, L.mellan.w, width), 72, lerpColor(t.groundDark, t.bottom, 0.4))
      paintBand(L.nara.c, L.nara.w, gy + 22, kupoler(t.hills ? 7 : 9, L.nara.w, width), 44, lerpColor(t.groundDark, t.bottom, 0.2))
    }
    const ground = new Graphics()
    ground.roundRect(-40 - BLEED_X, gy, L.mark.w + 80 + 2 * BLEED_X, groundH + 80 + BLEED_Y, 60).fill(t.ground)
    ground.roundRect(-40 - BLEED_X, gy, L.mark.w + 80 + 2 * BLEED_X, 14, 60).fill({ color: t.groundDark, alpha: 0.5 })
    L.mark.c.addChild(ground)
    if (markstruktur) {
      // Markstruktur i två lager: en TÄT rad strån längs markens överkant, som gör
      // gräskanten till gräs i stället för en ritad linje, plus glesa strån längre ner så
      // ytan inte är jämn. Bara det glesa lagret ensamt läste som prickar i gräset.
      // Deterministiska lägen (inte Math.random) — en jämförbar skärmdump är värd mer än
      // en unik grästuva.
      const mw = L.mark.w
      const tathet = mw / width // en bredare värld ska ha lika TÄT struktur, inte lika mycket
      const tufts = new Graphics()
      // Bleed-zonerna (utanför 0..mw i sidled, under height nedåt) får EGNA deterministiska
      // loopar i stället för att originalens modulo-spann breddas: breddat spann hade
      // flyttat varenda strå/prick i den synliga bilden och gjort alla baslinje-skärmdumpar
      // ojämförbara. Originalloopar orörda = 16:9-bilden är pixel för pixel densamma.
      const sidAntal = Math.round(40 * (BLEED_X / width))
      const bottenY = gy + groundH
      if (t.gras) {
        for (let i = -Math.ceil((BLEED_X + 26) / 13); i * 13 < mw + 26 + BLEED_X; i++) {
          const m = Math.abs(i) // negativa index (vänster bleed) ska inte ge negativa %-varianter
          const x = i * 13 - 13 + (m % 3) * 3
          const h = 7 + (m % 4) * 3
          tufts.moveTo(x, gy + 9).quadraticCurveTo(x + 1, gy + 9 - h * 0.6, x + (m % 2 ? 5 : -5), gy + 9 - h)
        }
        tufts.stroke({ width: 2.5, color: t.groundDark, alpha: 0.55, cap: 'round' })
        for (let i = 0; i < Math.round(40 * tathet); i++) {
          const x = ((i * 173) % (mw + 60)) - 30
          const y = gy + 30 + ((i * 61) % Math.max(1, groundH - 34))
          const h = 5 + (i % 3) * 2.5
          tufts.moveTo(x, y).quadraticCurveTo(x + 2, y - h * 0.7, x + (i % 2 ? 4 : -4), y - h)
        }
        for (let i = 0; i < sidAntal; i++) {
          const y = gy + 30 + ((i * 61) % Math.max(1, groundH - 34 + BLEED_Y))
          const h = 5 + (i % 3) * 2.5
          for (const x of [-34 - ((i * 173) % BLEED_X), mw + 34 + ((i * 173) % BLEED_X)]) {
            tufts.moveTo(x, y).quadraticCurveTo(x + 2, y - h * 0.7, x + (i % 2 ? 4 : -4), y - h)
          }
        }
        for (let i = 0; i < Math.round(40 * tathet); i++) {
          const x = ((i * 149) % (mw + 60)) - 30
          const y = bottenY + 6 + ((i * 61) % Math.max(1, BLEED_Y - 12))
          const h = 5 + (i % 3) * 2.5
          tufts.moveTo(x, y).quadraticCurveTo(x + 2, y - h * 0.7, x + (i % 2 ? 4 : -4), y - h)
        }
        tufts.stroke({ width: 2.5, color: t.groundDark, alpha: 0.32, cap: 'round' })
      } else {
        // Prickar: läser som krusning på vatten, strössel på godis och småsten på natt-
        // och skymningsmark — allt utom grässtrå, som bara stämmer på grönt och sand.
        for (let i = 0; i < Math.round(54 * tathet); i++) {
          const x = ((i * 149) % (mw + 40)) - 20
          const y = gy + 16 + ((i * 53) % Math.max(1, groundH - 20))
          tufts.ellipse(x, y, 3.5 + (i % 3), 2 + (i % 2)).fill({ color: t.groundDark, alpha: 0.3 })
        }
        for (let i = 0; i < sidAntal; i++) {
          const y = gy + 16 + ((i * 53) % Math.max(1, groundH - 20 + BLEED_Y))
          for (const x of [-24 - ((i * 149) % BLEED_X), mw + 24 + ((i * 149) % BLEED_X)]) {
            tufts.ellipse(x, y, 3.5 + (i % 3), 2 + (i % 2)).fill({ color: t.groundDark, alpha: 0.3 })
          }
        }
        for (let i = 0; i < Math.round(54 * tathet); i++) {
          const x = ((i * 173) % (mw + 40)) - 20
          const y = bottenY + 6 + ((i * 53) % Math.max(1, BLEED_Y - 12))
          tufts.ellipse(x, y, 3.5 + (i % 3), 2 + (i % 2)).fill({ color: t.groundDark, alpha: 0.3 })
        }
      }
      tufts.eventMode = 'none'
      L.mark.c.addChild(tufts)
    }
  }

  // Moln som långsamt driver (exit-säkert). Molnen ritas sist i koden men hamnar i sitt
  // eget lager längst bak när kameran är på — se lageruppställningen ovan.
  const cloudCount = Math.round((t.clouds || 0) * ((L.moln.w + 2 * BLEED_X) / width))
  for (let i = 0; i < cloudCount; i++) {
    const cloud = makeCloud(0.8 + Math.random() * 0.7)
    const y = 70 + Math.random() * (height * 0.32)
    cloud.position.set(-BLEED_X + Math.random() * (L.moln.w + 2 * BLEED_X), y)
    cloud.alpha = 0.92
    L.moln.c.addChild(cloud)
    driftCloud(cloud, L.moln.w)
  }

  // Vinjett sist = överst i SCENEN, men fortfarande under spelytan. En radiell gradient som
  // fyllning, inte ett filter — ett filter hade renderat om hela ytan varje bildruta för en
  // effekt som aldrig ändras (DESIGN.md §4). textureSize 256 här, till skillnad från 64 i
  // form.js: en svag mörkning utsträckt över 1280px bandar synligt om den bakas för smått,
  // och det är EN instans för hela appen.
  // Vinjetten är det ENDA lager som ritas responsivt: dess kanttoningar måste sitta vid
  // skärmens FAKTISKA kanter (VIEW), annars hänger de mitt i bilden på en bred telefon
  // och försvinner utanför på en 4:3-platta. Ritas om vid viewändring (i praktiken
  // orientationchange); avregistreringen hänger på 'destroyed' så den är exit-säker
  // utan att spelet behöver göra något. Vid 16:9 är VIEW = designrektangeln → samma
  // fyra rektanglar som förut.
  if (vinjett) {
    const v = new Graphics()
    v.eventMode = 'none'
    const rita = () => {
      if (v.destroyed) return
      const f = edgeFades()
      const vy = Math.round(VIEW.height * 0.2)
      const vx = Math.round(VIEW.width * 0.15)
      v.clear()
      v.rect(VIEW.left, VIEW.top, VIEW.width, vy).fill(f.ner)
      v.rect(VIEW.left, VIEW.bottom - vy, VIEW.width, vy).fill(f.upp)
      v.rect(VIEW.left, VIEW.top, vx, VIEW.height).fill(f.hoger)
      v.rect(VIEW.right - vx, VIEW.top, vx, VIEW.height).fill(f.vanster)
    }
    rita()
    const av = onViewChange(rita)
    v.on('destroyed', av)
    L.vinjett.c.addChild(v)
  }

  if (opts.kamera) root._kamLager = lager
  return root
}

// --- helpers ---

// 0xRRGGBB + alfa → '#rrggbbaa'. Pixi kör varje färgstopp genom Color.toHexa(), så ett stopp
// får ha alfa; det är så dis och vinjett kan tona ut utan att formen behöver egen alpha.
function rgba(hex, a) {
  const h = hex.toString(16).padStart(6, '0')
  return `#${h}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`
}

// Hur många kupoler ett band ska ha när lagret är bredare än vyn: samma kupolBREDD, alltså
// fler kupoler. Skalar man i stället upp bredden med samma antal blir kullarna utdragna och
// bandet läser som en våg i stället för ett landskap.
function kupoler(bas, lagerW, viewW) {
  return Math.max(bas, Math.round((bas * lagerW) / viewW))
}

// Ett avståndsband: en rad mjuka kullar med marken under. Amplituden varieras med en sinus
// på index i stället för Math.random — banden ska se organiska ut men vara desamma mellan
// två körningar, annars går skärmdumpar inte att jämföra mot en baslinje.
function paintBand(root, w, baseY, humps, amp, color) {
  const g = new Graphics()
  const step = (w + 80) / humps
  // Platta "kjolar" i bleed-zonerna på båda sidor: kullarna själva är orörda (samma
  // deterministiska lägen som förut → jämförbara skärmdumpar), bandet fortsätter bara
  // som slät mark utanför det som syns på en 16:9-skärm.
  g.moveTo(-40 - BLEED_X, baseY + 260 + BLEED_Y)
  g.lineTo(-40 - BLEED_X, baseY)
  g.lineTo(-40, baseY)
  for (let i = 0; i < humps; i++) {
    const x0 = -40 + i * step
    const a = amp * (0.72 + 0.28 * Math.sin(i * 1.7 + 0.6))
    g.quadraticCurveTo(x0 + step / 2, baseY - a, x0 + step, baseY)
  }
  g.lineTo(w + 40 + BLEED_X, baseY)
  g.lineTo(w + 40 + BLEED_X, baseY + 260 + BLEED_Y).closePath().fill(color)
  g.eventMode = 'none'
  root.addChild(g)
}

// Vinjett som FYRA linjära kanttoningar, inte en radiell gradient. Den radiella vägen ser
// självklar ut och är fel: `buildRadialGradient` i Pixi fyller först HELA duken med sista
// färgstoppet och ritar gradienten ovanpå — och en genomskinlig källa raderar ingenting i
// source-over. En vinjett med genomskinlig mitt blir därför en JÄMN mörkning över hela ytan.
// Uppmätt: himlen gick från [176,227,250] till [146,189,208] i mitten av bilden, alltså
// samma 0.83-multiplikation överallt i stället för bara i kanterna. `buildLinearGradient`
// har ingen sådan förifyllning, så linjära toningar med alfa fungerar som de ska.
//
// De fyra toningarna normaliseras mot varje forms egen bbox, så samma fyra instanser
// (4 × 256×1 = ~4 KB) räcker för hela appen oavsett scenstorlek. Hörnen får två lager och
// blir naturligt mörkast — precis vad en vinjett ska göra.
const VIN_A = 0.13
let _fades = null
function edgeFades() {
  if (_fades) return _fades
  const d = (o) => rgba(0x000000, o)
  const mk = (end, from) => new FillGradient({
    end,
    colorStops: [
      { offset: 0, color: d(from ? VIN_A : 0) },
      { offset: 1, color: d(from ? 0 : VIN_A) },
    ],
  })
  _fades = {
    ner: mk({ x: 0, y: 1 }, true), upp: mk({ x: 0, y: 1 }, false),
    hoger: mk({ x: 1, y: 0 }, true), vanster: mk({ x: 1, y: 0 }, false),
  }
  return _fades
}

// Skifta ett tema mot en tid på dygnet. Himlen tar tonen mest, marken minst.
function applyTid(t, tid) {
  const d = TIDER[tid || 'dag']
  if (!d) return t
  const out = { ...t }
  out.top = lerpColor(t.top, d.ton, d.topp)
  out.bottom = lerpColor(t.bottom, d.ton, d.botten)
  if (t.ground) out.ground = lerpColor(t.ground, d.ton, d.mark)
  if (t.groundDark) out.groundDark = lerpColor(t.groundDark, d.ton, d.mark)
  if (t.sun) out.sun = d.sol
  return out
}

// Himmel och dis cachas per färg, inte per scen. Skälet är MÄTT, inte kosmetiskt: varje
// `new FillGradient` bakar en egen duk och laddar upp en textur, och det sker mitt i att ett
// spel monteras. En interleaved A/B (`scripts/_ab.sh src/lib/scene.js`) gav med obakade
// gradienter `tom-scen` i 1 av 3 rundor (tre spel samtidigt) mot 0 av 3 på HEAD — samma
// signatur som generateTexture-fällan i LYFTPLAN C3. Med cache gör en scen NOLL
// texturbakningar vid montering, alltså färre än HEAD gjorde. Gradienterna normaliseras mot
// varje forms egen bbox (se lib/form.js), så en delad instans passar alla scenstorlekar.
const _skyCache = new Map()
const _hazeCache = new Map()

function skyFill(top, bottom) {
  const key = `${top}|${bottom}`
  let g = _skyCache.get(key)
  if (!g) {
    g = new FillGradient({ colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }] })
    _skyCache.set(key, g)
  }
  return g
}

function hazeFill(bottom) {
  let g = _hazeCache.get(bottom)
  if (!g) {
    const c = lerpColor(bottom, 0xffffff, 0.55)
    g = new FillGradient({
      colorStops: [
        { offset: 0, color: rgba(c, 0) },
        { offset: 0.72, color: rgba(c, 0.42) },
        { offset: 1, color: rgba(c, 0.58) },
      ],
    })
    _hazeCache.set(bottom, g)
  }
  return g
}

function paintVGradient(g, w, h, top, bottom) {
  g.rect(0, 0, w, h).fill(skyFill(top, bottom))
}

function makeCloud(scale = 1) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  const w = 70 * scale
  g.circle(-w * 0.7, 6 * scale, 26 * scale).fill(CLOUD_FILL)
  g.circle(0, -8 * scale, 38 * scale).fill(CLOUD_FILL)
  g.circle(w * 0.7, 6 * scale, 30 * scale).fill(CLOUD_FILL)
  g.roundRect(-w, 10 * scale, w * 2, 30 * scale, 18 * scale).fill(CLOUD_FILL)
  c.addChild(g)
  return c
}

function driftCloud(cloud, width) {
  const speed = 22 + Math.random() * 18 // px/s
  const st = { x: cloud.x }
  const run = () => {
    if (cloud.destroyed) return
    // Vändpunkterna ligger utanför bleed-zonen så molnet aldrig poppar in/ur i bild
    // på en bred skärm. På 16:9 syns ingen skillnad — bara en något längre cykel.
    const dur = Math.max(4, (width + 130 + BLEED_X - st.x) / speed)
    const tw = gsap.to(st, {
      x: width + 130 + BLEED_X,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        if (cloud.destroyed) {
          tw.kill()
          return
        }
        cloud.x = st.x
      },
      onComplete: () => {
        if (cloud.destroyed) return
        st.x = -130 - BLEED_X
        run()
      },
    })
  }
  run()
}

function twinkle(star, dur) {
  const st = { a: star.alpha }
  const tw = gsap.to(st, {
    a: 0.25,
    duration: dur,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    onUpdate: () => {
      if (star.destroyed) {
        tw.kill()
        return
      }
      star.alpha = st.a
    },
  })
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}
