// REP OCH KEDJOR — en verlet-tråd (LYFTPLAN B3 / rad 7).
//
// Rep var omskrivet i minst fyra spel med samma matematik och olika buggar:
// `zackes-biltvatt` (slang, 20 punkter, fasta segment), `natskott-pa-stan` (nätlina,
// spänd mellan två punkter), `spindel-zacke-svingar` (handrullad pendel) och
// `spindelnatet` (nät av linjer). Kärnan är identisk i alla: Position Based Dynamics
// i miniatyr — integrera punkterna fritt, dra sedan ihop dem mot sina vilolängder
// några varv per bildruta.
//
//   const rep = new Rep({ n: 20, seg: 42, golv: 640 })
//   rep.bygg(x, y, (i) => (i < 3 ? -0.3 : 0.78))   // startform
//   rep.tyngd(rep.sista, 3.2)                       // munstycket är tungt
//   ...varje bildruta:
//   rep.fast(0, ANCHOR.x, ANCHOR.y)                 // posten sitter fast
//   rep.dra(rep.sista - 1, finger.x, finger.y)      // greppet följer handen
//   rep.steg(dtF)
//   ritaRep(g.clear(), rep, { width: 12, color: 0x3a7d44 })
//
// TVÅ LÄGEN, samma solver:
// · FAST SEGMENTLÄNGD (`seg`) — en slang eller kedja med egen längd. Drar man för
//   långt rätas den ut och tar MJUKT stopp; den tänjs aldrig.
// · SPÄNT MELLAN TVÅ PUNKTER (`spann(ax, ay, bx, by, sag)`) — en lina vars
//   vilolängd följer avståndet. `sag < 1` spänt, `> 1` slakt och hängande.
//
// P0-noter: inga tweens, inga timers, ingen DOM — repet är rena tal och äger
// ingenting som kan överleva ett spelbyte. `destroy()` finns ändå, för symmetri
// med resten av verktygslådan och för att kunna nolla referenser.

import { CanvasSource, MeshRope, Point, Texture } from 'pixi.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Rep {
  constructor({ n = 20, seg = 40, grav = 0.5, damp = 0.985, iter = 8, maxSpeed = 70, golv = null, golvFriktion = 0.82 } = {}) {
    this.n = Math.max(2, n | 0)
    this.seg = seg
    this.grav = grav
    this.damp = damp
    this.iter = iter
    this.maxSpeed = maxSpeed
    this.golv = golv
    this.golvFriktion = golvFriktion
    this.pts = []
    this._pin = new Map() // index -> {x, y}
    this._vikt = new Map() // index -> gravitationsfaktor
    this._span = null
  }

  get sista() {
    return this.pts.length - 1
  }

  // Bygg kedjan från (x, y) längs en vinkelsekvens och låt den falla till ro.
  // `vinkel(i)` i radianer; utan den läggs repet rakt nedåt.
  bygg(x, y, vinkel = () => Math.PI / 2, satt = 60) {
    this.pts = [{ x, y, px: x, py: y }]
    let cx = x
    let cy = y
    for (let i = 0; i < this.n - 1; i++) {
      const a = vinkel(i)
      cx += Math.cos(a) * this.seg
      cy += Math.sin(a) * this.seg
      this.pts.push({ x: cx, y: cy, px: cx, py: cy })
    }
    this.fast(0, x, y)
    for (let i = 0; i < satt; i++) this.steg(1)
    return this
  }

  // Spika en punkt. Anropas om varje bildruta för en fästpunkt som rör sig.
  fast(i, x, y) {
    this._pin.set(i, { x, y })
    return this
  }

  losa(i) {
    this._pin.delete(i)
    return this
  }

  // Extra gravitation på EN punkt. Ett tungt munstycke i änden gör att repet
  // dinglar nedåt när handen står still — utan det pekar en slang dit den råkar
  // ligga, och strålen går åt fel håll.
  tyngd(i, faktor) {
    this._vikt.set(i, faktor)
    return this
  }

  // Dra en punkt mjukt mot ett mål (greppet som följer fingret). `k` är hur
  // hårt — 1 = teleport, 0.4 = följer med lite eftersläpning.
  //
  // ⚠️ FÖRFLYTTNINGEN PER BILDRUTA ÄR TAKAD, och det är inte kosmetik. Utan tak
  // kan ett mål långt utanför räckvidden slita punkten tusentals pixlar på EN
  // bildruta; avståndsvillkoret hinner då bara fortplanta sig `iter` länkar och
  // kedjan blir kvar utsträckt. Uppmätt i `_repprobe.mjs`: ett mål 4000 px bort
  // gav en 20-punkterskedja med vilolängd 760 px en verklig längd på **2870 px**.
  // Med taket rätas den ut och tar stopp — precis det den lovar.
  dra(i, x, y, k = 0.4, tak = this.seg * 2) {
    const p = this.pts[i]
    if (!p) return this
    let dx = (x - p.x) * k
    let dy = (y - p.y) * k
    const d = Math.hypot(dx, dy)
    if (d > tak) {
      dx = (dx / d) * tak
      dy = (dy / d) * tak
    }
    p.x += dx
    p.y += dy
    return this
  }

  // Klipp ett mål till kedjans räckvidd sett från `fran`. Slangen ska ta mjukt
  // stopp, inte tänjas — barnet får fortsätta dra, repet följer bara inte längre.
  // Faktorn 0.94 är marginal: en kedja som står spikrak ser ut som ett streck.
  rackvidd(x, y, fran = this.pts[0], marginal = 0.94) {
    const max = (this.n - 1) * this.seg * marginal
    const dx = x - fran.x
    const dy = y - fran.y
    const d = Math.hypot(dx, dy)
    if (d <= max || d === 0) return { x, y }
    return { x: fran.x + (dx / d) * max, y: fran.y + (dy / d) * max }
  }

  // Spänn repet mellan två punkter. Vilolängden per segment blir avståndet delat
  // på antalet segment, gånger `sag`: < 1 spänt, > 1 slakt.
  spann(ax, ay, bx, by, sag = 1) {
    this.fast(0, ax, ay)
    this.fast(this.sista, bx, by)
    this._span = (Math.hypot(bx - ax, by - ay) / this.sista) * sag
    return this
  }

  // Släpp den spända änden igen (piskande fritt rep).
  slapp() {
    this.losa(this.sista)
    this._span = null
    return this
  }

  steg(dtF = 1) {
    const pts = this.pts
    if (pts.length < 2) return this
    const f = clamp(dtF, 0.2, 2)
    const sista = pts.length - 1

    // 1. Verlet-integration. Fartspärren är inte kosmetisk: utan den kan ett
    //    villkor som precis flyttat en punkt långt ge en hastighet som växer
    //    varv för varv, och repet skjuter iväg utanför skärmen på en bildruta.
    for (let i = 0; i <= sista; i++) {
      if (this._pin.has(i)) continue
      const p = pts[i]
      let vx = (p.x - p.px) * this.damp
      let vy = (p.y - p.py) * this.damp
      const sp = Math.hypot(vx, vy)
      if (sp > this.maxSpeed) {
        vx = (vx / sp) * this.maxSpeed
        vy = (vy / sp) * this.maxSpeed
      }
      p.px = p.x
      p.py = p.y
      p.x += vx * f
      p.y += vy * f + this.grav * (this._vikt.get(i) ?? 1) * f * f
    }

    // 2. Avståndsvillkor (Jakobsen-relaxation). Spikade punkter flyttas aldrig —
    //    all korrigering läggs på grannen, annars glider fästpunkten iväg.
    const seg = this._span ?? this.seg
    for (let it = 0; it < this.iter; it++) {
      this._satPin()
      for (let i = 0; i < sista; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.0001
        const diff = (d - seg) / d
        const aFast = this._pin.has(i)
        const bFast = this._pin.has(i + 1)
        if (aFast && bFast) continue
        if (aFast) {
          b.x -= dx * diff
          b.y -= dy * diff
        } else if (bFast) {
          a.x += dx * diff
          a.y += dy * diff
        } else {
          a.x += dx * diff * 0.5
          a.y += dy * diff * 0.5
          b.x -= dx * diff * 0.5
          b.y -= dy * diff * 0.5
        }
      }
    }
    this._satPin()

    // 2b. STRIKT LÄNGDPASS. Jakobsen-relaxationen fortplantar sig bara `iter` länkar
    //     per bildruta, så en 20-punkterskedja som ryckts i kan inte dras ihop igen
    //     på en bildruta hur många varv man än kör inom rimlig budget. Uppmätt i
    //     `_repprobe.mjs`: vilolängd 760 px, verklig längd 2870 px vid ett hårt drag;
    //     med förflyttningstak men utan det här passet fortfarande 926 px.
    //     Ett enda svep utåt från fästpunkten klämmer varje länk till EXAKT sin
    //     vilolängd i O(n) — kedjan kan då aldrig tänjas, hur hårt man än drar.
    //     Passet går i TVÅ riktningar (FABRIK): först bakåt från änden, sedan
    //     framåt från fästpunkten. Ett enkelriktat svep utifrån fästpunkten
    //     bevarar den hängande formen och ÅNGRAR i praktiken draget — mätt: änden
    //     nådde bara 546 px av 760 möjliga, alltså tog slangen stopp långt innan
    //     den var utsträckt. Bakåtpasset låter draget fortplanta sig hela vägen,
    //     framåtpasset sätter tillbaka fästpunkten på pixeln.
    //     Bara när kedjan har EN fästpunkt och egen segmentlängd; är båda ändarna
    //     spikade (`spann`) är en strikt längd överbestämd och relaxationen äger.
    if (this._span == null && this._pin.size === 1) {
      const p0 = this._pin.keys().next().value
      for (let i = sista - 1; i >= p0; i--) this._klam(pts[i + 1], pts[i], seg)
      this._satPin()
      for (let i = p0 + 1; i <= sista; i++) this._klam(pts[i - 1], pts[i], seg)
      for (let i = p0 - 1; i >= 0; i--) this._klam(pts[i + 1], pts[i], seg)
    }

    // 3. Marken, med friktion så repet går att SLÄPA och inte glider som på is.
    if (this.golv != null) {
      for (let i = 0; i <= sista; i++) {
        if (this._pin.has(i)) continue
        const p = pts[i]
        if (p.y > this.golv) {
          p.y = this.golv
          p.px = p.x - (p.x - p.px) * this.golvFriktion
          p.py = p.y
        }
      }
    }
    return this
  }

  // Flytta `b` så den ligger exakt `seg` från `a`, längs samma riktning. `a` rörs inte.
  _klam(a, b, seg) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy)
    if (d < 0.0001) {
      b.x = a.x + seg
      return
    }
    b.x = a.x + (dx / d) * seg
    b.y = a.y + (dy / d) * seg
  }

  _satPin() {
    for (const [i, q] of this._pin) {
      const p = this.pts[i]
      if (!p) continue
      p.x = q.x
      p.y = q.y
      p.px = q.x
      p.py = q.y
    }
  }

  // Repets faktiska längd just nu — måttet som visar om solvern håller ihop.
  langd() {
    let L = 0
    for (let i = 0; i < this.pts.length - 1; i++) L += Math.hypot(this.pts[i + 1].x - this.pts[i].x, this.pts[i + 1].y - this.pts[i].y)
    return L
  }

  destroy() {
    this.pts = []
    this._pin.clear()
    this._vikt.clear()
    this._span = null
  }
}

// Mjuk kurva genom punkterna (kvadratiska mellansteg) i stället för en polyline.
// Ett rep av raka streck läser som en linjal; samma punkter med rundade hörn
// läser som ett rep. Lägger BARA en path — anroparen väljer stroke/fill.
export function repPath(g, rep) {
  const pts = rep.pts
  if (pts.length < 2) return g
  g.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
  }
  const s = pts[pts.length - 1]
  g.lineTo(s.x, s.y)
  return g
}

// Rita repet som ETT MATERIAL, inte en linje: en mörk botten, den bärande linan
// ovanpå och en tunn dager längs ovansidan. Tre drag för priset av ett, och
// skillnaden mot ett enfärgat streck är hela intrycket.
export function ritaRep(g, rep, { width = 10, color = 0x4a8f5b, kant = null, dager = 0.25 } = {}) {
  if (rep.pts.length < 2) return g
  const mork = kant ?? shade(color, 0.42)
  repPath(g, rep).stroke({ width: width + 3, color: mork, cap: 'round', join: 'round' })
  repPath(g, rep).stroke({ width, color, cap: 'round', join: 'round' })
  if (dager > 0) repPath(g, rep).stroke({ width: Math.max(1, width * 0.24), color: tint(color, 0.55), alpha: dager, cap: 'round', join: 'round' })
  return g
}

// --- MeshRope: repet som MATERIAL i stället för som streck ------------------
//
// `ritaRep` ovan lägger tre strokes ovanpå varandra och kommer långt, men det är
// fortfarande en LINJE: den har ingen struktur som följer med när repet böjer sig,
// och en slang ser likadan ut som ett rep som ser likadan ut som en kabel.
//
// En `MeshRope` mappar i stället en TEXTUR längs banan. Texturens y-axel är repets
// tjocklek (tvärsnittet: mörk kant → ljus ovansida → mörk undersida) och x-axeln
// löper längs repet, så ett flätmönster eller en slangribba åker med i varje böj.
// Det är skillnaden mellan "ett streck i en färg" och "något gjort av ett material".
//
// TEXTUREN RITAS MED CANVAS2D. Samma mätta skäl som i partiklar.js och glod.js:
// `renderer.generateTexture()` byter rendermål mitt i en bildruta och destabiliserar
// hela testsviten. Canvas2D rör inte GL-tillståndet och behöver ingen renderare.
//
// 64×32 är POTENSER AV TVÅ med flit: `textureScale > 0` sätter källans `addressMode`
// till 'repeat', och en del WebGL-drivrutiner klämmer i stället för att wrappa när
// måtten inte är tvåpotenser — mönstret hade då dragits ut i stället för att kaklas.
const TEX_W = 64
const TEX_H = 32
const _repTexCache = new Map()

// Tvärsnittet: en stav belyst uppifrån. Mörk överkant (skuggan där repet vänder bort),
// ljus dager en bit ned, grundfärg i mitten, djupast skugga i underkanten.
function _tvarsnitt(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, TEX_H)
  g.addColorStop(0, hex(shade(color, 0.5)))
  g.addColorStop(0.3, hex(tint(color, 0.45)))
  g.addColorStop(0.55, hex(color))
  g.addColorStop(1, hex(shade(color, 0.55)))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX_W, TEX_H)
}

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`

/**
 * Textur för ett rep, cachad per färg + profil.
 *
 *   'rep'   flätad lina — snedställda band som läser som tvinnade kardeler
 *   'slang' slät gummislang — ribbor TVÄRS slangen plus en blank längsgående dager
 *   'slat'  bara tvärsnittet, ingen struktur (kabel, spänd lina, regnbåge)
 *
 * Returnerar null utan DOM (sonder som kör solvern i rena Node).
 */
export function repTextur(color = 0x4a8f5b, profil = 'rep') {
  const nyckel = `${color}|${profil}`
  const cached = _repTexCache.get(nyckel)
  if (cached) return cached
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    _tvarsnitt(ctx, color)

    if (profil === 'rep') {
      // Fyra snedställda kardeler per kakel. Bandet ritas två gånger med wrap
      // (x och x−TEX_W) så mönstret möter sig självt sömlöst vid kakelgränsen.
      const steg = TEX_W / 4
      for (let i = 0; i < 4; i++) {
        for (const dx of [0, -TEX_W]) {
          const x = i * steg + dx
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x + steg * 0.55, 0)
          ctx.lineTo(x + steg * 0.55 + TEX_H * 0.8, TEX_H)
          ctx.lineTo(x + TEX_H * 0.8, TEX_H)
          ctx.closePath()
          ctx.fillStyle = 'rgba(255,255,255,0.13)'
          ctx.fill()
        }
      }
    } else if (profil === 'slang') {
      // Ribbor tvärs slangen (lodräta i texturrymden = tvärs banan i världen).
      for (let i = 0; i < 4; i++) {
        const x = i * (TEX_W / 4)
        ctx.fillStyle = 'rgba(0,0,0,0.10)'
        ctx.fillRect(x, 0, 3, TEX_H)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(x + 3, 0, 2, TEX_H)
      }
      // Blank längsgående dager — det är den som gör gummi av en grön stav.
      const d = ctx.createLinearGradient(0, TEX_H * 0.18, 0, TEX_H * 0.42)
      d.addColorStop(0, 'rgba(255,255,255,0)')
      d.addColorStop(0.5, 'rgba(255,255,255,0.34)')
      d.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = d
      ctx.fillRect(0, TEX_H * 0.18, TEX_W, TEX_H * 0.24)
    }

    const tex = new Texture({
      source: new CanvasSource({ resource: canvas, scaleMode: 'linear', addressMode: 'repeat' }),
      label: `rep:${profil}:${color.toString(16)}`,
    })
    _repTexCache.set(nyckel, tex)
    return tex
  } catch {
    return null
  }
}

/**
 * Ett `MeshRope` som följer en `Rep`-solver.
 *
 *   const slang = repMesh(rep, { color: 0x3a7d44, width: 16, profil: 'slang' })
 *   spelet.addChild(slang.mesh)
 *   ...varje bildruta, EFTER rep.steg():
 *   slang.uppdatera()
 *   ...i destroy():
 *   slang.destroy()
 *
 * Returnerar null om texturvägen inte är tillgänglig — anroparen ska då falla
 * tillbaka på `ritaRep()`, som alltid fungerar.
 *
 * `tathet` klipper in extra punkter mellan solverns: en MeshRope böjer sig BARA i
 * sina punkter, och en 20-punkterskedja ger synliga knän. Mellansteg tas ur samma
 * kvadratiska kurva som `repPath` ritar, så mesh och stroke följer exakt samma linje.
 */
export function repMesh(rep, { color = 0x4a8f5b, width = 14, profil = 'rep', tathet = 3, upprepa = 0.5 } = {}) {
  const tex = repTextur(color, profil)
  if (!tex || rep.pts.length < 2) return null

  const punkter = []
  const fyll = () => {
    const pts = rep.pts
    let k = 0
    const satt = (x, y) => {
      if (punkter[k]) {
        punkter[k].x = x
        punkter[k].y = y
      } else {
        punkter[k] = new Point(x, y)
      }
      k++
    }
    satt(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      const ax = i === 1 ? pts[0].x : (pts[i - 1].x + pts[i].x) / 2
      const ay = i === 1 ? pts[0].y : (pts[i - 1].y + pts[i].y) / 2
      for (let s = 1; s <= tathet; s++) {
        const t = s / tathet
        const u = 1 - t
        // Kvadratisk Bézier: A → styrpunkt pts[i] → M. Samma kurva som repPath.
        satt(u * u * ax + 2 * u * t * pts[i].x + t * t * mx, u * u * ay + 2 * u * t * pts[i].y + t * t * my)
      }
    }
    const sista = pts[pts.length - 1]
    satt(sista.x, sista.y)
    return k
  }

  const n = fyll()
  punkter.length = n
  const mesh = new MeshRope({ texture: tex, points: punkter, width, textureScale: upprepa })
  mesh.eventMode = 'none'

  return {
    mesh,
    punkter,
    // Punktantalet är konstant så länge repet har lika många länkar — geometrin
    // byggs alltså aldrig om, bara punkterna flyttas (autoUpdate sköter resten).
    uppdatera() {
      if (mesh.destroyed) return
      fyll()
    },
    destroy() {
      if (!mesh.destroyed) mesh.destroy()
      punkter.length = 0
    },
  }
}

// Lokala färghjälpare — `theme.js` har shade/tint, men solvern ska kunna mätas av en
// sond i Node utan att dra in hela temat. Pixi-importen överst är ofarlig där: den
// laddar i Node, det är bara en RENDERARE som inte går att skapa (`repTextur` faller
// tillbaka på null utan DOM). Verifierat: `_repprobe.mjs` är fortsatt helgrön.
function shade(c, k) {
  const r = ((c >> 16) & 255) * (1 - k)
  const g = ((c >> 8) & 255) * (1 - k)
  const b = (c & 255) * (1 - k)
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}
function tint(c, k) {
  const r = ((c >> 16) & 255) + (255 - ((c >> 16) & 255)) * k
  const g = ((c >> 8) & 255) + (255 - ((c >> 8) & 255)) * k
  const b = (c & 255) + (255 - (c & 255)) * k
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}
