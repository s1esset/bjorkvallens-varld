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

// Lokala färghjälpare — `theme.js` har shade/tint, men rep.js ska kunna användas
// av en sond i Node utan att dra in hela temat.
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
