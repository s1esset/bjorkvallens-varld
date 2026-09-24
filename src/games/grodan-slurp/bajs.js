// BAJSET (grodan-slurp) — korvarna grodan bajsar ut, hämtar med tungan, bär i munnen och
// kastar till grodkören. Målet med rundan är tre matade grodungar (index.js).
//
// En korv är en riktig kropp så länge den ligger fritt: den flyter (bajs flyter), rullar av
// ett blad och kan knuffas av en kotte. Men den krockar ALDRIG med grodan (samma negativa
// kollisionsgrupp som grodans delar): grodan satt annars på sin egen korv och gungade, och ett
// bajs under fötterna läser som en bugg, inte som ett hinder. Grodan når korven med tungan.
//
// Korvens tillstånd (`lage`):
//   fri     kroppen i världen, bilden följer den
//   tunga   tungan har den — kroppen är ute ur världen och spelet skriver x/y (tunga.js 'bar')
//   mun     grodan bär den: bilden sitter i mungipan och följer huvudet
//   flyger  kastad i en båge mot en grodunge; `pa.framme` anropas när den når munnen
//   borta   uppäten
//
// UTSEENDET BERÄTTAR VAD GRODAN ÅT. Korven är en brun korv med en led per insekt sedan förra
// korven, i den ordning de åts. Flugor ger brunt, och det ovanliga färgar sin led: fjärilar
// rosa med prickar, trollsländor turkos, humlor gula med svart rand, eldflugor ljusgröna med
// sken och guldflugan guld med glitter. Färgen BLANDAS in i det bruna (andelen `blanda`) — ett
// första försök med rena färger läste som ett pärlband eller en larv, inte som bajs. Två korvar
// blir nästan aldrig lika, och barnet kan SE sambandet.
//
// Inga gsap-tweens: allt liv räknas per bildruta i `rita()` (som dammen.js), så ingenting kan
// överleva en rivning. Alla färger kommer ur en fast palett — sphereFill cachar per färg.
import { Container, Graphics } from 'pixi.js'
import { Matter, STEG2 } from '../../lib/physics.js'
import { sphereFill } from '../../lib/form.js'
import { shade } from '../../lib/theme.js'

const { Body } = Matter

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Vad varje insekt blir för led i korven. `extra` ritas ovanpå leden, `blanda` är hur mycket
// av insektens färg som blandas in i det bruna.
const BRUN = 0x8b5a32
export const KOST = {
  fluga: { farg: BRUN },
  tjockfluga: { farg: 0x6f4527 },
  mygga: { farg: 0x9a5b3e },
  trollslanda: { farg: 0x39aecf, blanda: 0.55, extra: 'glans' },
  fjaril: { farg: 0xff8fc2, blanda: 0.6, extra: 'prickar' },
  humla: { farg: 0xffc83a, blanda: 0.62, extra: 'rand' },
  eldfluga: { farg: 0xcff26a, blanda: 0.58, extra: 'sken' },
  guldfluga: { farg: 0xf5c140, blanda: 0.78, extra: 'glitter' },
}
const blanda = (a, b, t) => {
  const k = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t)
  return (k(16) << 16) | (k(8) << 8) | k(0)
}
// Ledens färg: brunt med en del av insektens färg (en fast palett — sphereFill cachar per färg).
const ledFarg = (typ) => {
  const k = KOST[typ] || KOST.fluga
  return k.blanda ? blanda(BRUN, k.farg, k.blanda) : k.farg
}
const LED_MIN = 4
const LED_MAX = 8
// Storleken: en korv ska synas bredvid en groda som är ~150 px lång (första försöket, 24 px
// tjock, försvann bakom grodan i skärmdumparna).
const LED_AVST = 13
const TJOCK = 32 // kroppens höjd
const FLYT = 1.5
const MAX_KORVAR = 3
// En korv i vattnet dras sakta ut ur vassen vid kanterna (flytvolymens sidofjäder) — den ska gå
// att nå utan att grodan måste in i vassen efter den.
const HEM_MIN = 250
const HEM_MAX = 1030

// Korvens längs-kurva: lederna i en mjuk båge, tunnare i ändarna.
function leder(kost) {
  let lista = kost.length ? kost.slice() : ['fluga']
  if (lista.length > LED_MAX) {
    // Fler insekter än leder: plocka jämnt ur hela måltiden (inget försvinner i färgerna).
    const n = lista.length
    lista = Array.from({ length: LED_MAX }, (_, i) => lista[Math.round((i * (n - 1)) / (LED_MAX - 1))])
  }
  while (lista.length < LED_MIN) lista.push(lista[lista.length - 1])
  const n = lista.length
  const L = LED_AVST * (n - 1)
  return {
    L,
    leder: lista.map((typ, i) => {
      const u = i / (n - 1)
      return {
        typ,
        x: -L / 2 + u * L,
        y: -Math.sin(Math.PI * u) * 5,
        r: 12.5 + 4.5 * Math.sin(Math.PI * (0.12 + 0.76 * u)),
      }
    }),
  }
}

function ritaKorv(g, form) {
  g.clear()
  const ld = form.leder
  // Sken bakom eldflugans leder.
  for (const l of ld) if (KOST[l.typ]?.extra === 'sken') g.circle(l.x, l.y, l.r * 1.9).fill({ color: 0xeaff9a, alpha: 0.22 })
  // Konturen: samma leder lite större i en mörk ton (ren silhuett utan inre streck).
  const MORK = shade(BRUN, 0.55)
  for (const l of ld) g.circle(l.x, l.y, l.r + 2.4).fill(MORK)
  // Spetsen: den klassiska uppvridna toppen på sista leden.
  const s = ld[ld.length - 1]
  const tx = s.x + s.r * 0.45
  const ty = s.y - s.r * 0.8
  const fS = ledFarg(s.typ)
  g.moveTo(s.x - s.r * 0.35, s.y - s.r * 0.55)
    .quadraticCurveTo(tx + 4, ty - 16, tx + 13, ty - 6)
    .quadraticCurveTo(tx + 6, ty + 2, s.x + s.r * 0.55, s.y - s.r * 0.15)
    .closePath()
    .fill(fS)
    .stroke({ width: 2.4, color: MORK })
  for (const l of ld) g.circle(l.x, l.y, l.r).fill(sphereFill(ledFarg(l.typ), { lightX: 0.35, lightY: 0.28, dark: 0.34 }))
  // Fåror mellan lederna + det som gör en led till just sin insekt.
  for (let i = 0; i < ld.length; i++) {
    const l = ld[i]
    const k = KOST[l.typ] || KOST.fluga
    if (i > 0) {
      const mx = (l.x + ld[i - 1].x) / 2
      g.moveTo(mx - 1, l.y - l.r * 0.72).quadraticCurveTo(mx + 3, l.y, mx - 1, l.y + l.r * 0.72).stroke({ width: 2, color: MORK, alpha: 0.45, cap: 'round' })
    }
    if (k.extra === 'rand') g.ellipse(l.x + 1, l.y, l.r * 0.17, l.r * 0.88).fill({ color: 0x2b2420, alpha: 0.8 })
    else if (k.extra === 'prickar') {
      g.circle(l.x - 3, l.y - 3, 1.9).fill(0xfff08a)
      g.circle(l.x + 3.5, l.y + 2, 1.7).fill(0x9fd8ff)
      g.circle(l.x - 1, l.y + 4.5, 1.5).fill(0xffffff)
    } else if (k.extra === 'glans') {
      g.moveTo(l.x - l.r * 0.5, l.y + l.r * 0.2).quadraticCurveTo(l.x, l.y - l.r * 0.5, l.x + l.r * 0.5, l.y + l.r * 0.1).stroke({ width: 2, color: 0xbff4ff, alpha: 0.8, cap: 'round' })
    } else if (k.extra === 'glitter') {
      for (const [dx, dy, r] of [[-3, -4, 3.4], [4, 3, 2.6]]) {
        g.moveTo(l.x + dx, l.y + dy - r).lineTo(l.x + dx + r * 0.3, l.y + dy - r * 0.3).lineTo(l.x + dx + r, l.y + dy)
          .lineTo(l.x + dx + r * 0.3, l.y + dy + r * 0.3).lineTo(l.x + dx, l.y + dy + r).lineTo(l.x + dx - r * 0.3, l.y + dy + r * 0.3)
          .lineTo(l.x + dx - r, l.y + dy).lineTo(l.x + dx - r * 0.3, l.y + dy - r * 0.3).closePath().fill({ color: 0xffffff, alpha: 0.95 })
      }
    }
    // Glans uppe till vänster på varje led.
    g.ellipse(l.x - l.r * 0.32, l.y - l.r * 0.42, l.r * 0.34, l.r * 0.2).fill({ color: 0xffffff, alpha: 0.32 })
  }
}

// Den färg som syns mest i korven (grodungens mage får en aning av den).
function huvudfarg(kost) {
  const n = new Map()
  for (const t of kost) n.set(t, (n.get(t) || 0) + 1)
  let bast = 'fluga'
  let bastN = -1
  for (const [t, k] of n) {
    // Det ovanliga väger tyngre än flugor: en humla i en flugkorv ger en randig unge.
    const v = k + (t === 'fluga' || t === 'tjockfluga' || t === 'mygga' ? 0 : 1.5)
    if (v > bastN) {
      bastN = v
      bast = t
    }
  }
  return ledFarg(bast)
}

export class Bajs {
  // lager: { bakom (fri korv), bar (i munnen), luft (kastad — över vattnet och kören) }
  // grupp: grodans negativa kollisionsgrupp (korven krockar aldrig med grodan)
  constructor({ phys, lager, flytvolym, grupp }) {
    this._phys = phys
    this._lager = lager
    this._flyt = flytvolym
    this._grupp = grupp
    this._alive = true
    this.lista = []
    this._t = 0
    this._stank = new Graphics()
    this._stank.eventMode = 'none'
    lager.bakom.addChild(this._stank)
  }

  get fria() {
    return this.lista.filter((k) => k.lage === 'fri')
  }

  get antal() {
    return this.lista.filter((k) => k.lage !== 'borta').length
  }

  get fullt() {
    return this.antal >= MAX_KORVAR
  }

  // En ny korv vid (x, y) — ur grodans bakände, med en liten fart bakåt.
  skapa(x, y, kost, vx = 0, vy = 0) {
    if (!this._alive) return null
    const form = leder(kost)
    const bredd = form.L + TJOCK
    const body = this._phys.rectangle(x, y, bredd, TJOCK, {
      chamfer: { radius: TJOCK / 2 - 1 },
      density: 0.0011,
      friction: 0.7,
      frictionAir: 0.02,
      restitution: 0.12,
      label: 'bajs',
      collisionFilter: { group: this._grupp },
    })
    Body.setVelocity(body, { x: vx, y: vy })
    Body.setAngularVelocity(body, rnd(-0.05, 0.05))
    this._flyt?.lagg(body, { flyt: FLYT, hemX: klamp(x, HEM_MIN, HEM_MAX) })
    const view = new Container()
    view.eventMode = 'none'
    const inre = new Container()
    const g = new Graphics()
    ritaKorv(g, form)
    inre.addChild(g)
    view.addChild(inre)
    view.position.set(x, y)
    this._lager.bakom.addChild(view)
    const korv = {
      korv: true,
      kost: kost.slice(),
      farg: huvudfarg(kost),
      guld: kost.includes('guldfluga'),
      x,
      y,
      r: bredd / 2,
      body,
      view,
      inre,
      lage: 'fri',
      fas: rnd(0, TAU),
      fodd: this._t,
      plopp: 1, // squash vid födseln
      hjalpX: null,
      kast: null,
    }
    this.lista.push(korv)
    return korv
  }

  // Tungans sträcka (a → b) mot fria korvar. Närmast a vinner (som insekternas).
  traffSegment(ax, ay, bx, by, extra = 0) {
    if (!this._alive) return null
    const dx = bx - ax
    const dy = by - ay
    const L2 = dx * dx + dy * dy
    let bast = null
    let bastT = Infinity
    for (const k of this.lista) {
      if (k.lage !== 'fri') continue
      // Korven är avlång: räkna mot närmaste punkt på dess mittlinje, med dess halva tjocklek.
      const R = TJOCK / 2 + 6 + extra
      const a = k.body.angle
      const hx = Math.cos(a) * (k.r - TJOCK / 2)
      const hy = Math.sin(a) * (k.r - TJOCK / 2)
      let traff = false
      let tBast = Infinity
      for (let s = 0; s <= 4; s++) {
        const px = k.x - hx + (hx * 2 * s) / 4
        const py = k.y - hy + (hy * 2 * s) / 4
        const t = L2 > 1e-6 ? klamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0
        const d = Math.hypot(ax + dx * t - px, ay + dy * t - py)
        if (d <= R) {
          traff = true
          tBast = Math.min(tBast, t)
        }
      }
      if (traff && tBast < bastT) {
        bastT = tBast
        bast = k
      }
    }
    return bast
  }

  narmast(x, y, max = Infinity) {
    let bast = null
    let bastD = max
    for (const k of this.lista) {
      if (k.lage !== 'fri') continue
      const d = Math.hypot(k.x - x, k.y - y)
      if (d <= bastD) {
        bastD = d
        bast = k
      }
    }
    return bast
  }

  _utAvVarlden(k) {
    if (!k.body) return
    this._flyt?.ta(k.body)
    this._phys.removeBody(k.body)
    k.body = null
  }

  // Tungan tog korven: kroppen ut ur världen, och tungan (tunga.js 'bar') skriver x/y.
  gripTunga(k) {
    if (!k || k.lage !== 'fri') return
    this._utAvVarlden(k)
    k.lage = 'tunga'
    k.hjalpX = null
    this._lager.bar.addChild(k.view)
  }

  // Framme vid munnen: grodan bär den.
  iMun(k) {
    if (!k || k.lage === 'borta') return
    this._utAvVarlden(k)
    k.lage = 'mun'
    k.plopp = 0.6
    this._lager.bar.addChild(k.view)
  }

  // Ut ur munnen igen (en smäll) — korven blir en fri kropp där den är, med farten den fick.
  tappa(k, vx = 0, vy = -3) {
    if (!k || (k.lage !== 'mun' && k.lage !== 'tunga')) return
    const form = leder(k.kost)
    const body = this._phys.rectangle(k.x, k.y, form.L + TJOCK, TJOCK, {
      chamfer: { radius: TJOCK / 2 - 1 },
      density: 0.0011,
      friction: 0.7,
      frictionAir: 0.02,
      restitution: 0.12,
      label: 'bajs',
      collisionFilter: { group: this._grupp },
    })
    Body.setAngle(body, k.view.rotation)
    Body.setVelocity(body, { x: vx, y: vy })
    Body.setAngularVelocity(body, rnd(-0.12, 0.12))
    this._flyt?.lagg(body, { flyt: FLYT, hemX: klamp(k.x, HEM_MIN, HEM_MAX) })
    k.body = body
    k.lage = 'fri'
    k.view.scale.set(1)
    k.inre.scale.set(1)
    k.fodd = this._t
    this._lager.bakom.addChild(k.view)
  }

  // Kasta i en båge från (x0, y0) till `till()` (en punkt som kan röra sig — ungen hoppar).
  kasta(k, x0, y0, till, framme) {
    if (!k || k.lage === 'borta') return
    this._utAvVarlden(k)
    const m = till()
    const d = Math.hypot(m.x - x0, m.y - y0)
    k.lage = 'flyger'
    k.kast = { x0, y0, till, framme, u: 0, T: 0.55 + d / 2400, h: Math.max(110, d * 0.32), snurr: (m.x >= x0 ? 1 : -1) * rnd(7, 10) }
    k.x = x0
    k.y = y0
    this._lager.luft.addChild(k.view)
  }

  // Uppäten.
  bort(k) {
    if (!k) return
    this._utAvVarlden(k)
    k.lage = 'borta'
    k.kast = null
    if (!k.view.destroyed) k.view.destroy({ children: true })
    this.lista = this.lista.filter((o) => o !== k)
  }

  // Sen hjälp: vattnet för korven långsamt mot grodan (x), tills tungan tar den.
  hjalp(k, x) {
    if (k?.lage === 'fri') k.hjalpX = x
  }

  // Ett fast fysiksteg: hjälpens drift + en korv som rymt ur världen läggs tillbaka.
  steg(grodX) {
    if (!this._alive) return
    for (const k of this.lista) {
      if (k.lage !== 'fri' || !k.body) continue
      const b = k.body
      if (!Number.isFinite(b.position.x) || b.position.y > 900 || b.position.x < -200 || b.position.x > 1480) {
        Body.setPosition(b, { x: klamp(grodX, 160, 1120), y: 200 })
        Body.setVelocity(b, { x: 0, y: 0 })
        continue
      }
      if (k.hjalpX == null) continue
      const dx = k.hjalpX - b.position.x
      if (Math.abs(dx) < 70) continue
      // ~0,03 px/steg² — i vattnet blir det en lugn drift på ~30 px/s (flytvolymens motstånd).
      const a = 0.03 * Math.sign(dx)
      Body.applyForce(b, b.position, { x: (a * b.mass) / STEG2, y: 0 })
    }
  }

  // Per bildruta. `mun` = { x, y, vinkel, riktning } för en korv som bärs, eller null.
  rita(dtS, mun) {
    if (!this._alive) return
    this._t += dtS
    const T = this._t
    const st = this._stank
    if (!st.destroyed) st.clear()
    for (const k of [...this.lista]) {
      if (k.view.destroyed) continue
      k.plopp = Math.max(0, k.plopp - dtS * 3.2)
      const sq = Math.sin(k.plopp * Math.PI) * k.plopp
      if (k.lage === 'fri' && k.body) {
        k.x = k.body.position.x
        k.y = k.body.position.y
        k.view.position.set(k.x, k.y)
        k.view.rotation = k.body.angle
        // Liv: en lat andning i korven + squash när den just ploppat ut.
        const liv = 0.018 * Math.sin(T * 2.2 + k.fas)
        k.inre.scale.set(1 + liv + 0.25 * sq, 1 - liv - 0.3 * sq)
        // Stinklinjerna: tre vågiga streck som stiger ur korven (ritas upprätta, inte med kroppen).
        if (!st.destroyed) {
          for (let i = 0; i < 3; i++) {
            const f = (T * 0.45 + i / 3 + k.fas) % 1
            const x = k.x + (i - 1) * 20
            const y0 = k.y - 20 - f * 40
            const a = 0.5 * Math.sin(Math.PI * f)
            if (a < 0.03) continue
            st.moveTo(x, y0)
            for (let s = 1; s <= 5; s++) st.lineTo(x + Math.sin(s * 1.6 + T * 3 + i) * 5, y0 - s * 6)
            st.stroke({ width: 3.4, color: 0x7d9a2a, alpha: Math.min(1, a * 1.6), cap: 'round', join: 'round' })
          }
          // Sen hjälp syns: en mjuk glittrande ring runt korven.
          if (k.hjalpX != null) {
            const p = (T * 1.2) % 1
            st.circle(k.x, k.y, k.r + 8 + p * 22).stroke({ width: 3, color: 0xfff6c8, alpha: 0.7 * (1 - p) })
          }
        }
      } else if (k.lage === 'tunga') {
        k.view.position.set(k.x, k.y)
        k.view.rotation += dtS * 4
        k.inre.scale.set(0.92)
      } else if (k.lage === 'mun' && mun) {
        // I mungipan: korven sticker ut framåt ur munnen, lite nedåtvinklad, och vickar.
        const a = mun.vinkel + 0.5 * mun.riktning + 0.05 * Math.sin(T * 5 + k.fas)
        const ut = k.r * 0.42
        k.x = mun.x + Math.cos(a) * ut
        k.y = mun.y + Math.sin(a) * ut
        k.view.position.set(k.x, k.y)
        k.view.rotation = a
        k.view.scale.set(0.82, 0.82 * mun.riktning)
        k.inre.scale.set(1 + 0.25 * sq, 1 - 0.3 * sq)
      } else if (k.lage === 'flyger' && k.kast) {
        const c = k.kast
        c.u = Math.min(1, c.u + dtS / c.T)
        const m = c.till()
        const u = c.u
        k.x = c.x0 + (m.x - c.x0) * u
        k.y = c.y0 + (m.y - c.y0) * u - 4 * c.h * u * (1 - u)
        k.view.position.set(k.x, k.y)
        k.view.rotation += c.snurr * dtS
        // Krymper lite på slutet — den ska få plats i en liten grodmun.
        k.view.scale.set(0.82 - 0.4 * Math.max(0, (u - 0.75) / 0.25))
        if (u >= 1) {
          const f = c.framme
          k.kast = null
          f?.(k)
        }
      }
    }
  }

  destroy() {
    this._alive = false
    for (const k of this.lista) {
      if (k.body) {
        this._flyt?.ta(k.body)
        this._phys.removeBody(k.body)
        k.body = null
      }
      k.kast = null
      if (!k.view.destroyed) k.view.destroy({ children: true })
    }
    this.lista = []
    if (!this._stank.destroyed) this._stank.destroy()
  }
}

