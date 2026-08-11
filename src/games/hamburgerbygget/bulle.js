// BRÖDEN SOM MJUKA KROPPAR (LYFTPLAN B2 / natt VI N4).
//
// Förut var bullarna två `roundRect` som aldrig ändrade form: en burgare med nio
// lager såg exakt lika lätt ut som en tom. Nu bär UNDERBULLEN stapelns tyngd —
// ju mer barnet lägger på, desto plattare och bredare blir den — och ÖVERBULLEN
// landar på det nya lagret varje gång stapeln växer.
//
//   const m = makeBullkropp({ w: 224, h: 50, r: 16 })
//   sattVikt(m, 0.6)        // stapelns tyngd, 0–1 (ihållande kraft + mjukhet)
//   m.skjut(0, 7)           // ett lager landade (IMPULS, inte kraft)
//   stegBulle(m, dtF)       // steg + fatet under
//   ritaBulle(g.clear(), m, SPEC)
//
// Ingenting här rör Pixi utom att `ritaBulle` ritar in i en `g` som skickas in, så
// hela formen kan mätas i Node (`scripts/_bullprobe.mjs`).
//
// ⚠️ TVÅ SAKER SOM MÅSTE VARA SANNA:
//  1. En tom burgare ska se EXAKT ut som förut. Därför `grav: 0` — tyngden kommer
//     bara av `sattVikt`, och med noll lager är kroppen sin egen viloform. Uppmätt på
//     den RITADE kurvan (inte ringen): 224,0 × 50,0 px mot den gamla roundRect:ens 224 × 50.
//  2. Glansbanden måste skäras ur samma kurva som kroppen ritas med, annars syns en söm
//     längs hela bullen. `kurvPunkter()` är just den kurvan, samplad.
import { Mjukkropp } from '../../lib/mjukkropp.js'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Bullen är alltid lite mjuk (bröd är bröd), och blir mjukare under tyngd.
// Talen är sökta i `scripts/_bullprobe.mjs` mot tre krav samtidigt: ovansidan ska sjunka
// MONOTONT med varje lager, kroppen ska stå HELT still i vila (`rorelse` 0,00) och den
// får inte knäckas av tre landningar i rad vid någon vikt. 48 kombinationer provades;
// 24 klarade alla tre, och den här ger den största synliga sammantryckningen av dem.
const MJUK_TOM = 0.12
const MJUK_FULL = 0.8
// Ihållande nedåtkraft vid full stapel, px/bildruta². Det är `falt`, inte `skjut`:
// en `skjut` varje bildruta blir en konstant FART i verlet, inte en jämvikt.
const VIKT_FALT = 1.4

// Radie-faktor för en RUNDAD REKTANGEL, uttryckt i Mjukkroppens parameter-rymd.
// Mjukkroppen bygger viloringen som en ellips (w/2·cos a, h/2·sin a) skalad radiellt
// med `form(a)` — faktorn är alltså kvoten mellan avståndet ut till den rundade
// rektangelns kant och avståndet ut till ellipsens, längs samma stråle.
export function rundadRektForm(w, h, r) {
  const A = w / 2
  const B = h / 2
  const rr = Math.min(r, A, B)
  const sdf = (x, y) => {
    const qx = Math.abs(x) - (A - rr)
    const qy = Math.abs(y) - (B - rr)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr
  }
  return (a) => {
    const ex = Math.cos(a) * A
    const ey = Math.sin(a) * B
    const L = Math.hypot(ex, ey) || 1e-6
    const ux = ex / L
    const uy = ey / L
    let lo = 0
    let hi = A + B
    for (let i = 0; i < 34; i++) {
      const mid = (lo + hi) / 2
      if (sdf(ux * mid, uy * mid) < 0) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2 / L
  }
}

// En bulle: mjuk kropp i formen av en rundad rektangel som VILAR på något.
//
// ⚠️ DEN PLANA BOTTENYTAN MÅSTE VARA PINNAD, inte bara klämd mot ett golv. En ren
// golvklämma ligger och slåss med tryckvillkoret: trycket verkar längs kantens normaler,
// och på undersidan pekar de RAKT NER — så varje bildruta putar botten ner genom fatet
// och klämman lyfter tillbaka den. UPPMÄTT: en gränscykel med `rorelse` 9,9 som aldrig
// avtog (bullen shimrade i vila), mot **exakt 0,00** med pinnad botten. Klämman är kvar
// för de fria hörnpunkterna, som annars kan svepa under fatkanten.
//
// Topp-kedjan (`_kedjaUpp`) räknas ut en gång — det är den sesamfröna sitter fast i.
export function makeBullkropp({ w, h, r, punkter = 20, styvhet = 1, damp = 0.86, tryck = 1 }) {
  const m = new Mjukkropp({
    x: 0, y: 0, w, h, punkter, grav: 0, damp, iter: 5, tryck, styvhet,
    maxSpeed: 3, form: rundadRektForm(w, h, r),
  })
  m._bullGolv = Math.max(...m.pts.slice(0, m.n).map((p) => p.y))
  for (let i = 0; i < m.n; i++) {
    if (m.pts[i].y > m._bullGolv - 0.01) m.fast(i, m.pts[i].x, m.pts[i].y)
  }
  const kvart = Math.round(m.n / 4)
  m._kedjaUpp = []
  for (let i = m.n - kvart; i <= m.n + kvart; i++) m._kedjaUpp.push(i % m.n)
  m._bullVila = m.pts.slice(0, m.n).map((p) => ({ x: p.x, y: p.y }))
  return m
}

// Ett steg + det som bullen VILAR på.
//
// ⚠️ FAST TIDSSTEG, ALLTID 1 — samma val som `PhysicsWorld` gör, och av samma skäl.
// Två oberoende saker tvingar fram det, och båda är uppmätta:
//
//  1. **Ett för STORT steg viker ihop bullen för gott.** Kraftfältet integreras som
//     `falt·f²` medan antalet villkorsvarv är detsamma, så `dtF` 2 (EN tappad bildruta)
//     fyrdubblar tyngden utan att lösaren får mer att säga till om: 7,9 px sammantryckning
//     vid dtF 1 mot **34,9 px** vid dtF 2, kvar efter 300 lugna bildrutor.
//  2. **Ett för LITET steg ger en annan JÄMVIKT.** `damp` och villkorens styvhet räknas
//     per STEG, inte per tidsenhet, medan fältet räknas per f². Halveras steget krymper
//     fältets bidrag fyra gånger medan lösarens svar är oförändrat, och bullen lägger sig
//     på ett helt annat djup. Det syntes som att spelet inte alls gav samma tal som
//     `_bullprobe`: 3,1 px i webbläsaren mot 7,0 px i sonden vid samma vikt — därför att
//     Chrome gick på 58 fps, `dtF` blev 1,03 och delstegen 2 × 0,515.
//
// Med en ackumulator är simuleringen identisk i sonden och i spelet. Taket på tre steg
// finns för att en dold flik inte ska betala igen en halv minut på en bildruta.
//
// Golvet är ett vilokontakt-villkor, inte en studs: farten i y nollas i samma veva
// (`p.py = p.y`), annars läser verlet tillrättaläggningen som en uppåtfart och bullen
// studsar av fatet.
export function stegBulle(m, dtF) {
  m._bullAck = clamp((m._bullAck || 0) + (Number.isFinite(dtF) ? dtF : 1), 0, 4)
  for (let k = 0; k < 3 && m._bullAck >= 1; k++) {
    m._bullAck -= 1
    m.steg(1)
    const golv = m._bullGolv
    for (let i = 0; i < m.n; i++) {
      const p = m.pts[i]
      if (p.y > golv) {
        p.y = golv
        p.py = p.y
      }
    }
  }
  return m
}

// Stapelns tyngd, 0–1.
export function sattVikt(m, vikt) {
  const v = clamp(vikt, 0, 1)
  m.mjukhet(MJUK_TOM + (MJUK_FULL - MJUK_TOM) * v)
  m.falt(0, VIKT_FALT * v)
  return m
}

// Tillbaka till viloformen (ny burgare) — utan att någon behöver bygga om kroppen.
export function aterstall(m) {
  for (let i = 0; i < m.n; i++) {
    const v = m._bullVila[i]
    const p = m.pts[i]
    p.x = v.x
    p.y = v.y
    p.px = v.x
    p.py = v.y
  }
  const c = m.pts[m.mitt]
  c.x = 0
  c.y = 0
  c.px = 0
  c.py = 0
  m._bullAck = 0
  sattVikt(m, 0)
  return m
}

// Hur mycket ringen rör sig just nu (px/bildruta, summerat) — bullen ritas bara om
// medan den faktiskt lever, annars kostar en stillastående burgare noll.
export function rorelse(m) {
  let s = 0
  for (let i = 0; i < m.n; i++) {
    const p = m.pts[i]
    s += Math.abs(p.x - p.px) + Math.abs(p.y - p.py)
  }
  return s
}

// ---- Ritning -------------------------------------------------------------

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

// Ringens ritade kurva som en tät punktlista — samma kvadratik som `Mjukkropp.path()`,
// bara samplad i stället för utskickad till en Graphics. Det är den här kurvan ögat ser,
// så det är den ett band måste skäras ur.
function kurvPunkter(m, per = 6) {
  const p = m.pts
  const n = m.n
  const ut = []
  let a = mid(p[n - 1], p[0])
  for (let i = 0; i < n; i++) {
    const c = p[i]
    const b = mid(p[i], p[(i + 1) % n])
    for (let s = 0; s < per; s++) {
      const t = s / per
      const u = 1 - t
      ut.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y })
    }
    a = b
  }
  return ut
}

const skar = (a, b, ky) => {
  const t = (ky - a.y) / (b.y - a.y || 1e-6)
  return { x: a.x + (b.x - a.x) * t, y: ky }
}

// Ett glansband = KROPPEN SKUREN AV EN VÅGRÄT LINJE `tj` px under krönet (eller över
// undersidan). Linjen följer den deformerade kroppen, så bandet plattas med brödet.
//
// ⚠️ BYGG DET INTE SOM "KANTEN FÖRSKJUTEN INÅT". Två försök gjordes så, och båda gav
// samma fel i bilden: en förskjuten kant måste ta slut någonstans, och där uppstår en
// diagonal skarv vid gaveln. Bullen läste då som en BÅT med kant i stället för ett bröd
// med ljus ovansida — silhuetten satt på pixeln, men bilden var en annan. Att i stället
// begränsa vilka RINGPUNKTER som bär bandet flyttade bara skarven, den försvann inte.
// Den gamla `roundRect`-remsan var ett vågrätt snitt, och bara ett vågrätt snitt har
// ingen ände att skarva.
function band(g, m, sida, tj) {
  const pts = kurvPunkter(m)
  const N = pts.length
  const ky = sida < 0 ? m.pts[0].y + tj : m.pts[Math.round(m.n / 2)].y - tj
  const inne = (p) => (sida < 0 ? p.y <= ky : p.y >= ky)
  let start = -1
  for (let i = 0; i < N; i++) {
    if (inne(pts[i]) && !inne(pts[(i - 1 + N) % N])) { start = i; break }
  }
  if (start < 0) return false // hela (eller ingen del av) kroppen ligger innanför snittet
  const run = [skar(pts[(start - 1 + N) % N], pts[start], ky)]
  for (let k = 0; k < N; k++) {
    const p = pts[(start + k) % N]
    if (!inne(p)) { run.push(skar(pts[(start + k - 1 + N) % N], p, ky)); break }
    run.push(p)
  }
  if (run.length < 3) return false
  g.moveTo(run[0].x, run[0].y)
  for (let i = 1; i < run.length; i++) g.lineTo(run[i].x, run[i].y)
  g.closePath()
  return true
}

// Fäst punkter (sesamfrön) i kedjans EGEN rymd, så de rider med när formen ändras.
// Sparas som segment + parameter + offset i segmentets riktning — ett frö som ligger
// i absoluta koordinater hamnar utanför bullen så fort den plattas till.
export function froFasten(m, fron) {
  const K = m._kedjaUpp
  return fron.map((f) => {
    let bi = 0
    let bt = 0
    let bd = Infinity
    for (let j = 0; j < K.length - 1; j++) {
      const a = m._bullVila[K[j]]
      const b = m._bullVila[K[j + 1]]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const L2 = dx * dx + dy * dy || 1e-6
      const t = clamp(((f.x - a.x) * dx + (f.y - a.y) * dy) / L2, 0, 1)
      const d = Math.hypot(f.x - (a.x + dx * t), f.y - (a.y + dy * t))
      if (d < bd) {
        bd = d
        bi = j
        bt = t
      }
    }
    const a = m._bullVila[K[bi]]
    const b = m._bullVila[K[bi + 1]]
    const sx = a.x + (b.x - a.x) * bt
    const sy = a.y + (b.y - a.y) * bt
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const ca = Math.cos(-ang)
    const sa = Math.sin(-ang)
    const dx = f.x - sx
    const dy = f.y - sy
    return { i: bi, t: bt, ox: dx * ca - dy * sa, oy: dx * sa + dy * ca, rx: f.rx, ry: f.ry }
  })
}

export function froLage(m, fasten) {
  const K = m._kedjaUpp
  return fasten.map((f) => {
    const a = m.pts[K[f.i]]
    const b = m.pts[K[f.i + 1]]
    const sx = a.x + (b.x - a.x) * f.t
    const sy = a.y + (b.y - a.y) * f.t
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    return { x: sx + f.ox * ca - f.oy * sa, y: sy + f.ox * sa + f.oy * ca, ang, rx: f.rx, ry: f.ry }
  })
}

// Hela bullen: kropp + glansband (+ frön). `g` ska vara rensad av anroparen.
export function ritaBulle(g, m, spec) {
  m.path(g).fill(spec.fyll)
  for (const [sida, b] of [[-1, spec.topp], [1, spec.botten]]) {
    if (b && band(g, m, sida, b.tj)) g.fill({ color: b.farg, alpha: b.alpha })
  }
  if (spec.fron?.length) {
    for (const f of froLage(m, spec.fron)) {
      g.ellipse(f.x, f.y, f.rx, f.ry).fill(spec.fronFarg)
    }
  }
  return g
}

// Ringens nuvarande bredd/höjd och ovansidans läge — sondens mått, och bara det.
export function matt(m) {
  const xs = m.pts.slice(0, m.n).map((p) => p.x)
  const ys = m.pts.slice(0, m.n).map((p) => p.y)
  return {
    bredd: Math.max(...xs) - Math.min(...xs),
    hojd: Math.max(...ys) - Math.min(...ys),
    topp: Math.min(...ys),
    botten: Math.max(...ys),
  }
}
