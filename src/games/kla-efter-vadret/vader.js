// VÄDRETS VIND — ett luftfält över hela rummet (FYSIKPLAN F4, `lib/vind.js`).
//
// Förut var blåsten en sinus per sak: plaggen på strecket gungade i `Math.sin(t · (1,15 + vind·1,5))`,
// trädet i fönstret i en annan sinus, gardinen i en tredje, och ingenting hängde ihop — en by kom
// aldrig FRAM till något. Nu finns EN luft: ett `Vindfalt` (form `fn`) som är en by som drar över
// rummet från vänster till höger (strecket → Elvira → fönstret). Allt som rör sig i blåst — plaggen
// på strecket, löven i rummet, vindstrimmorna, och i fönstret trädet, gardinerna, molnen och löven —
// LÄSER samma fält och reagerar när byn når dem, i den ordningen byn når dem.
//
//   luft(x, y, t)  = bas + by · by-klockan      ( `bas` = jämn blåst, `by` = en by som kommer och går )
//   plaggen hänger i en nypa → vinkeln = −k · luftens fart där (rakt ner i stiltje, ut åt höger i by)
//
// Rena tal + `lib/vind.js` (ingen Pixi, inga tweens, inga timers) så en Node-sond kan köra EXAKT spelets
// kod (`plaggVinkel` per plagg, `blasMedLuft` per löv). Vindfalt stegar inte själv här (spelet har ingen
// matter-värld) — spelet äger tiden: `stegaVader(v, dt)`.
//
// P0 småbarn: vinden är rolig och SYNLIG, aldrig ett hinder — den rör bara bilden (plaggen sväller ut,
// löv far förbi). Träffytorna ligger i `it`, inte i det som svänger, och den som hålls i handen hänger
// rakt. Taket: ett plagg svänger aldrig mer än `MAX_VINKEL`.
import { Vindfalt } from '../../lib/vind.js'

export const LUFT_PX = 520 // luftens fart i px/s per fältenhet (s = 1 ⇒ en frisk vind)
export const MAX_VINKEL = 0.72 // rad — taket för hur långt ett plagg svänger ut (≈ 41°)
export const VINKEL_PER_S = 0.42 // rad per fältenhet — hur lätt ett plagg fångar vinden
const X0 = -420 // byns front föds här (vänster om skärmen) …
const X1 = 1700 // … och dör här (höger om fönstret)

// Per väder: `bas` jämn luft, `by` byns topp ovanpå, `period` s mellan byar, `bredd` byns halva bredd (px).
// Blåst är det enda vädret där luften är en SAK att se; i sol/snö syns den knappt (stiltje).
export const VADER = {
  sol: { bas: 0.1, by: 0.22, period: 9, bredd: 320 },
  regn: { bas: 0.22, by: 0.45, period: 7, bredd: 340 },
  sno: { bas: 0.06, by: 0.14, period: 10, bredd: 300 },
  bla: { bas: 0.45, by: 0.95, period: 4.4, bredd: 420 },
}

export function nyttVader(key = 'sol') {
  const v = {
    t: 0,
    key,
    bas: 0,
    by: 0,
    period: 9,
    bredd: 320,
    nr: 0, // vilken by som är på väg (räknas upp när fronten föds)
    falt: null,
  }
  v.falt = new Vindfalt({
    form: {
      typ: 'fn',
      fn: (x, y) => {
        const g = byIntensitet(v, x)
        const s = v.bas + v.by * g
        if (!(s > 0)) return null
        // luften lyfter lite i en by och fladdrar lite med läget — en luft med RIKTNING, inte en skjuts
        return { vx: 1, vy: -0.12 * g + 0.05 * Math.sin(x / 90 + v.t * 2 + y / 140), s }
      },
    },
    luft: { x: 1, y: 0 },
    aktiv: true,
  })
  stallVader(v, key, true)
  return v
}

// Byn som en klockkurva som vandrar från X0 till X1 under `period` s. 0..1.
function byIntensitet(v, x) {
  const frac = (v.t % v.period) / v.period
  const xf = X0 + frac * (X1 - X0)
  const d = (x - xf) / v.bredd
  return Math.exp(-d * d)
}

// Ställ in vädret. `snap` = hoppa direkt (första bygget); annars glider `bas`/`by` dit i `stegaVader`.
export function stallVader(v, key, snap = false) {
  const p = VADER[key] || VADER.sol
  v.key = key
  v.malBas = p.bas
  v.malBy = p.by
  v.period = p.period
  v.bredd = p.bredd
  if (snap) {
    v.bas = p.bas
    v.by = p.by
  }
  // en ny by startar i vänsterkanten vid väderbytet — luften ska inte ha en by mitt i rummet från start
  v.t = Math.ceil(v.t / v.period + 1e-9) * v.period // nästa hela period → frac 0
  v.nr++
}

// Stega klockan `dt` s (≤ 0,1). Returnerar `true` den bildruta en NY by föds i vänsterkanten.
export function stegaVader(v, dt) {
  const d = Math.min(0.1, Math.max(0, dt))
  const fore = Math.floor(v.t / v.period)
  v.t += d
  const k = Math.min(1, d * 1.6)
  v.bas += (v.malBas - v.bas) * k
  v.by += (v.malBy - v.by) * k
  const efter = Math.floor(v.t / v.period)
  if (efter !== fore) {
    v.nr++
    return true
  }
  return false
}

// Luften vid (x, y): `{ vx, vy, s }` — nollor i stiltje.
export function luftVid(v, x, y) {
  return v.falt.luftVid(x, y) || { vx: 0, vy: 0, s: 0 }
}

// Plaggets mål-vinkel (rad) där det hänger i (x, y): rakt ner i stiltje, utsvängt åt höger i by.
// `ph` = plaggets egen fas så att grannplaggen aldrig fladdrar i takt. Hålls plagget i handen: ge 0 själv.
export function plaggVinkel(v, x, y, ph = 0) {
  const s = luftVid(v, x, y).s
  const gunga = Math.sin(v.t * (1.15 + s * 1.5) + ph) * (0.03 + s * 0.035)
  const fladder = Math.sin(v.t * (6 + s * 3) + ph * 1.7) * 0.04 * Math.min(s, 1.2)
  const ut = -Math.min(MAX_VINKEL, VINKEL_PER_S * s)
  const a = ut + gunga + fladder
  return a < -MAX_VINKEL ? -MAX_VINKEL : a > MAX_VINKEL ? MAX_VINKEL : a
}

// Ett löv (eller annat lätt) som flyter med luften. `l` = { x, y, vx, vy } i px och px/s; stegar `dt` s.
// Lätt kropp ⇒ stort `fa`: farten sluttar mot luftens fart (samma modell som Vindfalt: Δv = fa·(w − v)).
export function blasMedLuft(v, l, dt, { fa = 2.2, sjunk = 38 } = {}) {
  const a = luftVid(v, l.x, l.y)
  const k = Math.min(1, fa * dt)
  l.vx += (a.vx * LUFT_PX - l.vx) * k
  // lövet sjunker sakta i stiltje och lyfts i en by (luftens vy är negativ uppåt)
  l.vy += (a.vy * LUFT_PX + sjunk - l.vy) * k
  l.x += l.vx * dt
  l.y += l.vy * dt
  return a.s
}
