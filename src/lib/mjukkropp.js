// MJUKA KROPPAR — saker som sjunker ihop, buktar och tar tillbaka sin form
// (LYFTPLAN B2 / rad 11).
//
// Ingenting i appen kunde deformeras. Marshmallowen i `lagerelden` bytte FÄRG när
// den blev varm, fast det är att den SJUNKER IHOP som är hela spelets mekanik —
// barnet ska se sockret bli mjukt. Samma sak väntar i `sapbubblor` (bubblor som
// trycks ihop av vind), `glasstornet` (kulor som wobblar när tornet svajar),
// `mata-monstret` (tuggbar mat), `hamburgerbygget` (bröd som ger efter) och
// `pruttbad` (bubblor som pressas mot ytan innan de poppar).
//
//   const m = new Mjukkropp({ w: 40, h: 52, punkter: 14, grav: 0.35 })
//   m.fast(m.topp, x, y)          // pinnen håller i toppen
//   m.mjukhet(rostning)           // 0 = fast socker, 1 = nästan rinnande
//   m.skala(1.4)                  // viloformen VÄXER (en mage som fylls)
//   m.steg(dtF)
//   m.path(g.clear()).fill(col).stroke({ width: 3, color: edge })
//
// KONSTRUKTIONEN: en ring av punkter runt en ellips + en mittpunkt. Ringen hålls
// ihop av avståndsvillkor mellan grannar OCH ekrar in till mitten. Utan mer än så
// kollapsar en mjuk kropp till ett streck — därför finns ett TRYCK-villkor: efter
// varje relaxationsvarv jämförs polygonens area med viloarean, och skillnaden
// puttar ut ringen längs sina egna normaler. Det är trycket som ger bukten, och
// det är skillnaden mellan "en boll som blir mjuk" och "en boll som går sönder".
//
// Rena tal, ingen Pixi, inga tweens, inga timers — kroppen kan inte överleva ett
// spelbyte. `destroy()` finns för symmetri och för att kunna nolla referenser.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Mjukkropp {
  // form(vinkel) → radie-faktor. Vilokroppen är en ellips om den utelämnas, men ett
  // föremål med egen silhuett (en glasskopa är vågig, inte en cirkel) måste kunna få
  // sin vågform i VILOLÄGET — rest-längderna mäts ur den byggda formen, så det går inte
  // att knuffa dit vågen efteråt utan att kroppen "glömmer" hur den ska se ut.
  constructor({ x = 0, y = 0, w = 40, h = 40, punkter = 14, grav = 0.3, damp = 0.92, iter = 6, tryck = 1, styvhet = 1, maxSpeed = 26, form = null } = {}) {
    this.n = Math.max(6, punkter | 0)
    this.grav = grav
    this.damp = damp
    this.iter = iter
    this.tryck = tryck
    this._styvBas = clamp(styvhet, 0, 1)
    this.styvhet = this._styvBas
    this.maxSpeed = maxSpeed
    this._pin = new Map()
    this._mjuk = 0
    this._faltX = 0 // konstant kraftfält (se `falt()`) — 0 = bara gravitationen
    this._faltY = 0

    // Ring + mittpunkt. Mitten är sist, så `pts[0..n-1]` är kanten i ordning och
    // kan ritas rakt av som en polygon.
    this.pts = []
    for (let i = 0; i < this.n; i++) {
      const a = (i / this.n) * Math.PI * 2 - Math.PI / 2
      const f = form ? form(a) : 1
      const px = x + (Math.cos(a) * w * f) / 2
      const py = y + (Math.sin(a) * h * f) / 2
      this.pts.push({ x: px, y: py, px, py: py })
    }
    this.pts.push({ x, y, px: x, py: y })
    this.mitt = this.n
    // Index för den översta punkten — den som en pinne eller en hand naturligt håller i.
    this.topp = 0

    // Vilolängder mäts EN gång ur den byggda formen, aldrig ur nuläget: läser man
    // om dem under lek blir varje deformation den nya viloformen och kroppen
    // "glömmer" hur den såg ut (samma fälla som pop/wiggle i feedback.js).
    this._kant = []
    this._eker = []
    for (let i = 0; i < this.n; i++) {
      const b = this.pts[(i + 1) % this.n]
      this._kant.push(Math.hypot(b.x - this.pts[i].x, b.y - this.pts[i].y))
      this._eker.push(Math.hypot(this.pts[i].x - x, this.pts[i].y - y))
    }
    this._viloArea = Math.abs(this._area())
    // Byggmåtten sparas orörda — `skala()` räknar ALLTID från dem, aldrig från nuläget.
    this._kant0 = this._kant.slice()
    this._eker0 = this._eker.slice()
    this._viloArea0 = this._viloArea
    this._skala = 1
  }

  // VÄXA (eller krympa) viloformen. `k` är absolut mot byggmåttet, inte kumulativt:
  // `skala(1.4)` betyder alltid 40 % större än den byggda kroppen, hur många gånger
  // den än anropas. Kroppen växer sedan av sina egna villkor över några bildrutor —
  // det är skillnaden mellan en mage som FYLLS och en `scale.set()` som byter storlek
  // mellan två bildrutor.
  //
  // ⚠️ Arean är kvadratisk. Skalas bara längderna behåller trycket sin gamla viloarea
  // och håller emot hela växten (samma isoperimetri-fälla som `mjukhet()` beskriver).
  skala(k) {
    const s = Math.max(0.05, k)
    if (s === this._skala) return this
    this._skala = s
    for (let i = 0; i < this.n; i++) {
      this._kant[i] = this._kant0[i] * s
      this._eker[i] = this._eker0[i] * s
    }
    this._viloArea = this._viloArea0 * s * s
    return this
  }

  // 0 = håller formen, 1 = nästan rinnande. Sänker villkorens styvhet OCH trycket,
  // så gravitationen får platta till kroppen underifrån medan sidorna buktar ut.
  // ⚠️ BÅDA MÅSTE SLÄPPA. En sluten kurva med både fast omkrets OCH fast area är i
  // praktiken STEL — det är isoperimetri: nära cirkelns maximum finns knappt någon
  // formfamilj kvar att röra sig i. Första versionen sänkte bara styvheten och
  // behöll trycket, och en "helt mjuk" marshmallow sjönk då **0,7 px**. Mätbart,
  // men osynligt — och det är synligheten som ÄR mekaniken i `lagerelden`.
  // Därför tappar en varm kropp också en del av sitt inre tryck: den slappnar,
  // breder ut sig och sjunker, precis som socker som blir varmt.
  mjukhet(k) {
    this._mjuk = clamp(k, 0, 1)
    this.styvhet = this._styvBas * (1 - this._mjuk * 0.92)
    return this
  }

  _tryckNu() {
    return this.tryck * (1 - this._mjuk * 0.55)
  }

  fast(i, x, y) {
    this._pin.set(i, { x, y })
    return this
  }

  losa(i) {
    this._pin.delete(i)
    return this
  }

  // Flytta hela kroppen (behåller formen och farten).
  flytta(dx, dy) {
    for (const p of this.pts) {
      p.x += dx
      p.y += dy
      p.px += dx
      p.py += dy
    }
    for (const [, q] of this._pin) {
      q.x += dx
      q.y += dy
    }
    return this
  }

  // TRÖGHET: skjut allt som inte är spikat åt ett håll. Verlet läser en positions-
  // ändring utan motsvarande `px`-ändring som FART, så det här är kroppens eftersläpning
  // när fästpunkten rycker till — en glasskula som landar plattas av sin egen tröghet,
  // utan att någon behöver leta reda på var träffen skedde.
  skjut(dx, dy) {
    for (let i = 0; i < this.n; i++) {
      if (this._pin.has(i)) continue
      const p = this.pts[i]
      p.x += dx
      p.y += dy
    }
    return this
  }

  // ETT KRAFTFÄLT över hela kroppen (vind, luftkraften i en fallskärmskupol, en fläkt).
  // px/bildruta², precis som `grav` — och det är just bredvid gravitationen det hör
  // hemma, i integreringen.
  //
  // ⚠️ ANVÄND INTE `skjut()` FÖR EN IHÅLLANDE KRAFT. `skjut` är en IMPULS: verlet läser
  // en positionsändring utan motsvarande `px`-ändring som FART, så en `skjut` varje
  // bildruta blir en konstant fart (nudge/(1−damp)) i stället för en jämvikt — tyget
  // driver iväg tills villkoren tar emot. Uppmätt i `fallskarmen`: kupolen veks ihop
  // till en sned trekant medan fysiken bakom var helt riktig.
  falt(ax = 0, ay = 0) {
    this._faltX = ax
    this._faltY = ay
    return this
  }

  // En knuff utifrån (ett finger, en krock). Faller av med avståndet.
  //
  // ⚠️ Den flyttar `p.x/p.y` men INTE `p.px/p.py`, och i verlet ÄR det en fart — precis det
  // `skjut()` och `falt()` varnar för en bit upp. Det är rätt för en krock (kroppen ska få
  // rörelsemängd), men fel när knuffen ska DEFORMERA något som ligger still: en kropp utan
  // pinnar, golv eller gravitation har då ingenting som håller emot, och hela klicken
  // translaterar. Uppmätt i `mata-munnen`: en knuff 26 px ovanför en gegga sköt den
  // **57 px rakt ner, permanent** — fläcken gled ifrån sin matbit och blev en fristående
  // oval under den, alltså exakt det ägaren beskrev som "en flytande skugga".
  //
  // `form: true` drar bort den GENOMSNITTLIGA förflyttningen efteråt. Summan av
  // ändringarna blir noll, alltså noll rörelsemängd: kvar är bara den relativa
  // formändringen — en klick som vobblar där den sitter i stället för att åka iväg.
  knuff(x, y, kraft = 6, radie = 60, { form = false } = {}) {
    let sx = 0
    let sy = 0
    for (const p of this.pts) {
      const dx = p.x - x
      const dy = p.y - y
      const d = Math.hypot(dx, dy)
      if (d > radie || d < 0.001) continue
      const k = (1 - d / radie) * kraft
      const ux = (dx / d) * k
      const uy = (dy / d) * k
      p.x += ux
      p.y += uy
      sx += ux
      sy += uy
    }
    if (form && this.n) {
      const mx = sx / this.n
      const my = sy / this.n
      for (const p of this.pts) { p.x -= mx; p.y -= my }
    }
    return this
  }

  get centrum() {
    return this.pts[this.mitt]
  }

  /**
   * Kroppens TYNGDPUNKT (medelvärdet av punkterna) — inte samma sak som `centrum`, som är
   * den enskilda mittpunkten. Den som vill förankra en kropp måste läsa den HÄR, och läsa
   * den EN gång vid födseln: punkterna läggs ut runt en ellips och medelvärdet behöver
   * inte hamna på det (x, y) man bad om. Att förankra mot det nominella läget i stället
   * flyttar kroppen med skillnaden i första bildrutan — vilket i `_busprobe` såg ut som
   * 15 px drift som inte fanns.
   */
  get tyngdpunkt() {
    let cx = 0
    let cy = 0
    for (const p of this.pts) { cx += p.x; cy += p.y }
    return { x: cx / this.n, y: cy / this.n }
  }

  /**
   * Flytta hela kroppen så att dess TYNGDPUNKT hamnar på (x, y) — för en kropp som sitter
   * FAST i något: en fläck på en hud, en klick på en vägg.
   *
   * `px/py` flyttas med, annars vore förflyttningen en fart (det är precis den fällan
   * `knuff` bär). Anropad varje steg blir det en förankring: formen får svänga fritt,
   * men kroppen kan inte vandra iväg. Behövs utöver `knuff(..., { form: true })`, för
   * även en knuff med noll rörelsemängd ger ~10 px drift när `tryck` och `styvhet`
   * återställer en osymmetrisk deformation (uppmätt i `_busprobe`).
   */
  flyttaTill(x, y) {
    let cx = 0
    let cy = 0
    for (const p of this.pts) { cx += p.x; cy += p.y }
    cx /= this.n
    cy /= this.n
    const dx = x - cx
    const dy = y - cy
    for (const p of this.pts) { p.x += dx; p.y += dy; p.px += dx; p.py += dy }
    return this
  }

  _area() {
    let a = 0
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[i]
      const q = this.pts[(i + 1) % this.n]
      a += p.x * q.y - q.x * p.y
    }
    return a / 2
  }

  _villkor(a, b, vilo, k) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy) || 0.0001
    const diff = (((d - vilo) / d) * k) / 2
    const aFast = a._fast
    const bFast = b._fast
    if (aFast && bFast) return
    if (aFast) {
      b.x -= dx * diff * 2
      b.y -= dy * diff * 2
    } else if (bFast) {
      a.x += dx * diff * 2
      a.y += dy * diff * 2
    } else {
      a.x += dx * diff
      a.y += dy * diff
      b.x -= dx * diff
      b.y -= dy * diff
    }
  }

  steg(dtF = 1) {
    const pts = this.pts
    if (pts.length <= this.n) return this // riven (eller aldrig byggd) — gör ingenting
    const f = clamp(dtF, 0.2, 2)
    for (const p of pts) p._fast = false
    for (const [i] of this._pin) if (pts[i]) pts[i]._fast = true

    // 1. Verlet. Fartspärren håller kroppen hel om något knuffar den hårt.
    for (const p of pts) {
      if (p._fast) continue
      let vx = (p.x - p.px) * this.damp
      let vy = (p.y - p.py) * this.damp
      const sp = Math.hypot(vx, vy)
      if (sp > this.maxSpeed) {
        vx = (vx / sp) * this.maxSpeed
        vy = (vy / sp) * this.maxSpeed
      }
      p.px = p.x
      p.py = p.y
      p.x += vx * f + this._faltX * f * f
      p.y += vy * f + (this.grav + this._faltY) * f * f
    }

    const k = clamp(this.styvhet, 0.02, 1)
    for (let it = 0; it < this.iter; it++) {
      this._satPin()
      const c = pts[this.mitt]
      // Kanten hålls betydligt hårdare än ekrarna. Kanten är ytan — den ska inte
      // sträckas ens i en varm marshmallow (socker rinner, det går inte sönder).
      // EKRARNA är det som definierar den runda formen, och det är de som ska ge
      // efter när något mjuknar. Samma styvhet på båda gjorde "mjuk" till "mindre".
      for (let i = 0; i < this.n; i++) {
        this._villkor(pts[i], pts[(i + 1) % this.n], this._kant[i], Math.min(1, k * 2.2))
        this._villkor(c, pts[i], this._eker[i], k * 0.5)
      }
      // 2. TRYCK. Utan det här kollapsar en mjuk kropp till ett streck så fort
      //    styvheten sjunker — villkoren ovan hindrar bara sträckning, inte att
      //    formen viks ihop.
      //
      //    ⚠️ TRYCKET MÅSTE VERKA LÄNGS KANTENS NORMALER, INTE LÄNGS RADIEN. Första
      //    versionen puttade varje punkt utåt från mitten, och det är inte ett tryck
      //    utan en FORMÅTERSTÄLLARE: en radiell puff drar tillbaka polygonen mot en
      //    cirkel och håller därmed emot precis den tillplattning som mjukheten ska
      //    ge. Uppmätt: en helt mjuk kropp blev 38,4 px bred mot den hårdas 39,0 —
      //    alltså SMALARE, tvärtemot vad en varm marshmallow gör. Med normaler
      //    bevaras arean utan att formen tvingas rund.
      const tr = this._tryckNu()
      if (tr > 0) {
        const area = this._area()
        const brist = (this._viloArea - Math.abs(area)) / this._viloArea
        if (brist > 0) {
          const vand = area < 0 ? -1 : 1
          const styrka = clamp(brist, 0, 1) * tr * 0.05
          for (let i = 0; i < this.n; i++) {
            const a = pts[i]
            const b = pts[(i + 1) % this.n]
            const ex = b.x - a.x
            const ey = b.y - a.y
            const len = Math.hypot(ex, ey) || 0.0001
            const nx = ((ey / len) * vand * styrka * len) / 2
            const ny = ((-ex / len) * vand * styrka * len) / 2
            if (!a._fast) {
              a.x += nx
              a.y += ny
            }
            if (!b._fast) {
              b.x += nx
              b.y += ny
            }
          }
        }
      }
    }
    this._satPin()

    // Mitten hålls i ringens tyngdpunkt — annars driver den iväg och ekrarna
    // börjar dra kroppen åt ett håll utan att någon bad om det.
    //
    // MEN INTE om mitten är spikad. En pinne som går rakt IGENOM marshmallowen är
    // just en fast mittpunkt, och att räkna om den till tyngdpunkten varje bildruta
    // gjorde `fast(m.mitt, …)` till en tyst nullhandling — kroppen gled av pinnen.
    if (!this._pin.has(this.mitt)) {
      let sx = 0
      let sy = 0
      for (let i = 0; i < this.n; i++) {
        sx += pts[i].x
        sy += pts[i].y
      }
      const c2 = pts[this.mitt]
      c2.px = c2.x
      c2.py = c2.y
      c2.x = sx / this.n
      c2.y = sy / this.n
    }
    return this
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

  // Hur hoptryckt kroppen är just nu (1 = viloform, 0.5 = halva arean kvar).
  fyllnad() {
    return Math.abs(this._area()) / this._viloArea
  }

  // Sluten mjuk kurva genom ringen. En polygon av raka streck läser som en
  // kristall; samma punkter med kvadratiska mellansteg läser som något mjukt.
  //
  // `skala` krymper kurvan mot mittpunkten. Ett föremål byggt av flera lager — en
  // skugga under, regnbågsband inuti — ska deformeras av SAMMA kropp, annars glider
  // lagren isär i vobbeln. En kropp, N lager.
  path(g, skala = 1) {
    const p = this.pts
    const n = this.n
    const c = p[this.mitt]
    const sk = (q) => (skala === 1 ? q : { x: c.x + (q.x - c.x) * skala, y: c.y + (q.y - c.y) * skala })
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    let m = mid(sk(p[n - 1]), sk(p[0]))
    g.moveTo(m.x, m.y)
    for (let i = 0; i < n; i++) {
      const a = sk(p[i])
      const nx = mid(a, sk(p[(i + 1) % n]))
      g.quadraticCurveTo(a.x, a.y, nx.x, nx.y)
    }
    g.closePath()
    return g
  }

  destroy() {
    this.pts = []
    this._kant = []
    this._eker = []
    this._kant0 = []
    this._eker0 = []
    this._pin.clear()
  }
}

export function makeMjukkropp(opts) {
  return new Mjukkropp(opts)
}
