// GRINDEN — en slagbom som svänger över planen (FYSIKPLAN F1, kluster B3).
//
// En boom hänger på ett GÅNGJÄRN i planens kant (`phys.gangjarn`) och drivs av en MOTOR (`g.motor`) som följer
// en mjuk svängning: den slår ut över planen (stängd = rakt in från kanten) och viker undan mot kanten (öppen).
// Barnet TAJMAR skottet — men grinden får aldrig stänga vägen:
//
//   · LÄNGDEN är satt så att det ALLTID finns en fri körfil: `GRIND.langd` (190) mot planens höjd 560 lämnar ≥ 370 px
//     fritt även när grinden är helt stängd (bollen är 112 px). Ingen kombination av lägen kan täppa till planen.
//   · LUCKAN kommer av sig själv: en hel svängning tar `period` s (3,6): stängd en kort stund (0,25 s), öppnar sig mjukt
//     (0,9 s), står ÖPPEN 1,4 s och viker sedan tillbaka (1,1 s). Barnet ser den vänta — och tajmar.
//   · MJUK: motorns moment är KAPAT (`maxMoment`) och spetsens fart högst ~4,5 px/steg. Ligger bollen i vägen stannar
//     grinden mot den i stället för att skjuta iväg den, och klockan vänder den ändå inom en halv period. En boll
//     som slår i grinden studsar som mot en kloss; grinden ger efter en aning och fjädrar tillbaka.
//   · GRÄNSER: vinkeln hålls inom [−0,05, φmax+0,1] rad av en hård spärr (utåtfart nollas, vinkeln fastnar) — en
//     hård träff kan inte slå grinden över planen eller in i hörnet.
//   · Tyngdpunkten ligger i gångjärnet (en BALLAST-sensor inne i kanten bakom leden — en sensor löser aldrig en
//     kontakt). Ett gångjärn långt från tyngdpunkten får matters lösare att skena (r²·m/I > 2/styvhet − 1).
//   · Vinden (`phys.setWind`) tas bort från grinden i `beforeStep` — den är fastsatt, inget att blåsa.
// Rena tal + en fysikbyggare (ingen Pixi): sonden `scripts/_dag-rulla-grind.mjs` kör EXAKT spelets kod.
import { Bodies, Body, STEG2 } from '../../lib/physics.js'

export const GRIND = {
  langd: 190, // px från gångjärnet till spetsen
  tjocklek: 26,
  period: 3.6, // s — en hel svängning (stängd → öppen → stängd)
  phiMax: 1.22, // rad från rakt-in (0 = stängd) till nästan längs kanten (öppen)
  // Svängningens form (andelar av perioden): stängd · öppnar · öppen · stänger. Stängningen får resten (0,31).
  form: { stangd: 0.07, upp: 0.24, oppen: 0.38 },
  phiMin: -0.05,
  phiHard: 0.08, // extra utrymme utanför phiMax innan den hårda spärren
  massa: 200, // kg — tungt nog att en boll i full fart studsar av som mot en kloss
  svans: 100, // px ballast-sensor bakom leden (inne i kanten)
  start: 52, // px från gångjärnet där plankan börjar — så att den aldrig skär kanten (52·cos 1,30 = 13,9 > halva tjockleken 13)
  maxMomentFaktor: 3, // motorns momenttak = så här många gånger det moment en olastad svängning behöver
  kp: 0.05, // fart (rad/steg) per rad avvikelse från svängningens ögonblicksläge
  maxFart: 0.045, // rad/steg — klämd vinkelfart
  oppenAndel: 0.7, // "öppen" = spetsens djup ≤ så här stor andel av längden
}

// Svängningens form i klockan (t i s): φ(t) i rad, 0 = stängd. Mjuka (smoothstep) ramper, en kort stängd stund och en
// lång öppen stund — så luckan syns och går att vänta in. Periodisk i `period`; `fas` (rad) flyttar startläget.
function profil(t, fas) {
  const F = GRIND.form
  const T = GRIND.period
  let u = t / T + fas / (2 * Math.PI)
  u -= Math.floor(u)
  const len = F.upp
  const ned = 1 - F.stangd - F.upp - F.oppen // stängningens längd
  const a1 = F.stangd // stängd → upp börjar
  const a2 = a1 + F.upp // öppen börjar
  const a3 = a2 + F.oppen // stänger börjar
  const sm = (q) => q * q * (3 - 2 * q)
  const dsm = (q) => 6 * q * (1 - q)
  if (u < a1) return { p: 0, d: 0 }
  if (u < a2) { const q = (u - a1) / len; return { p: sm(q), d: dsm(q) / (len * T) } }
  if (u < a3) return { p: 1, d: 0 }
  if (u < a3 + ned) { const q = (u - a3) / ned; return { p: 1 - sm(q), d: -dsm(q) / (ned * T) } }
  return { p: 0, d: 0 }
}
export function phiAt(t, fas = 0) {
  return GRIND.phiMax * profil(t, fas).p
}
// Hastigheten dφ/dt (rad/s).
export function dphiAt(t, fas = 0) {
  return GRIND.phiMax * profil(t, fas).d
}

// Spetsens punkt för vinkeln φ (och sträckan s från gångjärnet).
export function punktPaGrind(spec, phi, s) {
  const dir = spec.vagg === 'top' ? 1 : -1 // normalen in i planen: ned (top) eller upp (bottom)
  return { x: spec.x - s * Math.sin(phi), y: spec.y + dir * s * Math.cos(phi) }
}

// Var får grinden sitta? Närmaste kant mot målet (så att den gäller sista biten hem), nära målet men aldrig i det.
// Faller banans hinder/zoner/vindflöjel in i svepytan → INGEN grind på den banan (hellre ingen än en trång).
//   plan = { l, r, t, b } · hinder = [{ type, x, y, r | w, h }] · zoner = [{ x, y, r }] · slump = () => 0..1
export function grindForLevel(level, { home, start, hinder = [], zoner = [], plan }, slump = Math.random) {
  if (level < GRIND_FRAN) return null
  if (GRIND_UTAN(level)) return null
  const L = GRIND.langd
  const near = home.y < (plan.t + plan.b) / 2 ? 'top' : 'bottom'
  const vaggar = near === 'top' ? ['top', 'bottom'] : ['bottom', 'top']
  const gx0 = Math.max(plan.l + 500, Math.min(plan.r - 200, home.x - home.r - 40))
  const tryg = (spec) => {
    const marg = 26
    for (let phi = GRIND.phiMin; phi <= GRIND.phiMax + 0.01; phi += 0.2) {
      for (let s = 0; s <= L + 1; s += 15) {
        const p = punktPaGrind(spec, phi, s)
        // målet
        if (Math.hypot(p.x - home.x, p.y - home.y) < home.r + 30) return false
        // start
        if (Math.hypot(p.x - start.x, p.y - start.y) < 200) return false
        // hinder
        for (const o of hinder) {
          if (o.type === 'block') {
            const dx = Math.max(Math.abs(p.x - o.x) - o.w / 2, 0)
            const dy = Math.max(Math.abs(p.y - o.y) - o.h / 2, 0)
            if (Math.hypot(dx, dy) < marg + GRIND.tjocklek / 2) return false
          } else if (Math.hypot(p.x - o.x, p.y - o.y) < o.r + marg + GRIND.tjocklek / 2) return false
        }
        // zonernas KÄRNA (grinden ska inte hänga över kullens topp / gropens mitt)
        for (const z of zoner) if (Math.hypot(p.x - z.x, p.y - z.y) < 70) return false
        // vindflöjeln (ritad uppe vid 640,158 när det blåser) — bara den övre kanten
        if (spec.vagg === 'top' && p.x > 590 && p.x < 740 && p.y < 215) return false
        // planen
        if (p.x < plan.l + 60 || p.x > plan.r - 20) return false
      }
    }
    return true
  }
  const kandidater = []
  for (const vagg of vaggar) {
    for (const dx of [0, -50, -100, -150, 40]) {
      const x = gx0 + dx
      kandidater.push({ vagg, x, y: vagg === 'top' ? plan.t : plan.b, langd: L })
    }
  }
  for (const k of kandidater) if (tryg(k)) return { ...k, fas: 0 }
  return null
}

// Policy: från bana 4 (index 3). Banorna 5–6 (index 4–5) har klots + dyna + kulle + grop och rymmer ingen grind (provas i fit);
// varje tredje bana från bana 7 (index 6, 9, 12 …) är utan grind — spelet andas ut.
export const GRIND_FRAN = 3
export const GRIND_UTAN = (level) => level >= 6 && level % 3 === 0

// Bygger grindens fysik. `spec` = { vagg, x, y, langd }. Allt i `delar` tas bort av `destroy()`.
export class Grind {
  constructor(phys, spec, { fas = 0 } = {}) {
    this.phys = phys
    this.spec = spec
    this.levande = true
    this.fas = fas
    this.steg = 0
    this._unbind = null
    const L = spec.langd || GRIND.langd
    const T = GRIND.tjocklek
    this.dir = spec.vagg === 'top' ? 1 : -1 // s i φ = s·(θ − bas)
    this.bas = spec.vagg === 'top' ? Math.PI / 2 : -Math.PI / 2

    // I vila-pose θ = 0 (armen längs +x), sedan vrids kroppen kring gångjärnet.
    const px = spec.x
    const py = spec.y
    const s0 = GRIND.start
    const Lp = L - s0 // plankans längd
    const arm = Bodies.rectangle(px + s0 + Lp / 2, py, Lp, T, { label: 'grind', restitution: 0.4, friction: 0.04, density: GRIND.massa / (Lp * T) })
    const d = GRIND.svans
    const mBal = (arm.mass * (s0 + Lp / 2)) / d // exakt: Σ m·x = 0 kring gångjärnet
    const ballast = Bodies.rectangle(px - d, py, 40, 40, { label: 'grind-ballast', isSensor: true, density: mBal / (40 * 40) })
    this.body = phys.sammansatt([arm, ballast], { label: 'grindkropp', frictionAir: 0 })
    // Startläge: slumpad fas ur klockan.
    Body.setAngle(this.body, this.bas + this.dir * phiAt(0, fas))
    this.led = phys.gangjarn(this.body, { x: px, y: py }, { label: 'grindled' })
    const I = this.body.inertia
    // Momenttaket = några gånger det moment en olastad svängning behöver (största vinkelacceleration, rad/steg²).
    const aMax = (GRIND.phiMax * 6) / ((GRIND.form.upp * GRIND.period * 60) ** 2) // smoothstep: φ'' ≤ 6·φmax/(längd)²
    this.tak = (GRIND.maxMomentFaktor * aMax * I) / STEG2
    this.led.motor({
      fart: () => this.dir * this._malFart(),
      maxMoment: this.tak,
    })
    this._unbind = phys.beforeStep(() => this._steg())
    this.delar = [this.body]
  }

  get phi() {
    return this.dir * (this.body.angle - this.bas)
  }

  // Målfarten (rad/steg i φ): svängningens egen hastighet + en P-term mot dess ögonblicksläge.
  _malFart() {
    const t = this.steg / 60
    const mal = phiAt(t, this.fas)
    return dphiAt(t, this.fas) / 60 + GRIND.kp * (mal - this.phi)
  }

  // En gång per fast steg.
  _steg() {
    if (!this.levande || !this.body) return
    this.steg++
    const b = this.body
    // Vinden verkar på alla dynamiska kroppar — grinden är fastsatt: ta bort den (och tyngdkraften).
    const ph = this.phys
    const g = ph.engine.gravity
    const gs = typeof g.scale !== 'undefined' ? g.scale : 0.001
    b.force.x -= b.mass * (ph._windAx || 0) + b.mass * g.x * gs
    b.force.y -= b.mass * (ph._windAy || 0) + b.mass * g.y * gs
    // Hårda gränser + fartkläm.
    const phi = this.phi
    let w = b.angularVelocity
    const wPhi = this.dir * w
    if (phi < GRIND.phiMin && wPhi < 0) {
      w = 0
      Body.setAngle(b, this.bas + this.dir * GRIND.phiMin)
    } else if (phi > GRIND.phiMax + GRIND.phiHard && wPhi > 0) {
      w = 0
      Body.setAngle(b, this.bas + this.dir * (GRIND.phiMax + GRIND.phiHard))
    }
    w = Math.max(-GRIND.maxFart, Math.min(GRIND.maxFart, w))
    if (w !== b.angularVelocity) Body.setAngularVelocity(b, w)
  }

  // Öppen just nu (spetsens djup ≤ oppenAndel · längd)?
  get oppen() {
    return Math.cos(this.phi) <= GRIND.oppenAndel
  }

  // Spetsen i världen (mittlinjen) — för sonden och ritningen.
  spets() {
    return punktPaGrind(this.spec, this.phi, this.spec.langd || GRIND.langd)
  }

  destroy() {
    if (!this.levande) return
    this.levande = false
    this._unbind?.()
    this._unbind = null
    this.led?.ta()
    this.led = null
    for (const d of this.delar || []) this.phys.removeBody(d)
    this.body = null
    this.delar = []
  }
}
