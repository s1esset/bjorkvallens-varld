// FLUGVINDPROBEN (FYSIKPLAN F4, kluster B3) — flugan-pa-nasans fläktfält, i TAL, utan webbläsare.
//
//   node scripts/_flugvindprobe.mjs
//
// Frågan: NÅR fältet lika många flugpositioner av 200 som HEAD:s handbyggda `_vindKraft`
// (kon framför + sug bakom)? Filhuvudet i index.js säger att en REN kon bara nådde 22 av 200 —
// det talet är kontrollarmen som visar att mätningen skiljer en kon från en kon + sug.
//
//   arm 1  REN KON      (ingen sug)         — filhuvudets kända tal, ska vara LÅGT (≈ 22 av 200)
//   arm 2  HEAD         `_vindKraft` före F4, ordagrant kopierad nedan (git show HEAD:…index.js)
//   arm 3  NYA          `flaktLuft` ur `src/games/flugan-pa-nasan/flaktvind.js` — SAMMA modul som spelet kör
//
// Positionerna: 200 punkter ur flugans EGET område (`Flugbana omrade`, index.js `_slappFluga`):
// x = ansikte.x + 60 ± (80/2 + W/2), y = ansikte.y − 30 ± H/2, där W/H ur `_sattRunda`
// (520 + 70·r, 330 + 34·r; tak 880/470). Mäts för runda 0, 4 och 12, med fast LCG-slump.
// Utöver antalet jämförs styrkan och riktningen punkt för punkt (HEAD mot NYA).
import { byggFlaktfalt, flaktLuft } from '../src/games/flugan-pa-nasan/flaktvind.js'
import { Vindfalt } from '../src/lib/vind.js'

// rummet.js (kopia — den importerar Pixi): PLATS + HUVUD_Y
const PLATS = { ansikte: { x: 360, y: 292 }, flakt: { x: 660, y: 536 }, fonster: { x: 1010, y: 226, w: 300, h: 300 } }
const HUVUD_Y = -128
const HUVUD = { x: PLATS.flakt.x, y: PLATS.flakt.y + HUVUD_Y }
const RIKT = PLATS.fonster.x >= PLATS.flakt.x ? 1 : -1
const R = 760, H = 260, SR = 620, SD = 0.62

let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}

// ── arm 2: HEAD:s `_vindKraft`, ordagrant (index.js före B3) ────────────────────────────────────
function headKraft(x, y) {
  const h = HUVUD
  const langs = (x - h.x) * RIKT
  const dy = y - h.y
  if (langs >= 0) {
    if (langs > R) return null
    const halv = H + langs * 0.42
    if (Math.abs(dy) > halv) return null
    const s = (1 - langs / R) * (1 - (Math.abs(dy) / halv) * 0.72)
    if (s <= 0) return null
    const F = PLATS.fonster
    const fx = F.x - x
    const fy = F.y - y
    const d = Math.hypot(fx, fy) || 1
    return { vx: RIKT * 0.55 + (fx / d) * 0.45, vy: (fy / d) * 0.45, s }
  }
  const bak = -langs
  if (bak > SR) return null
  const halv = H * 1.25
  if (Math.abs(dy) > halv) return null
  const s = (1 - bak / SR) * (1 - (Math.abs(dy) / halv) * 0.55) * SD
  if (s <= 0) return null
  const d = Math.hypot(bak, dy) || 1
  return { vx: (RIKT * bak) / d, vy: -dy / d, s }
}

// ── arm 1: REN KON — samma Vindfalt utan `sug` ──────────────────────────────────────────────────
const renKon = new Vindfalt({ form: { typ: 'kon', x: HUVUD.x, y: HUVUD.y, rackvidd: R, halvhojd: H, vinkel: RIKT > 0 ? 0 : Math.PI }, luft: { x: RIKT, y: 0 } })
const renKonKraft = (x, y) => {
  const o = renKon.formVid(x, y)
  return o ? { s: o.s } : null
}

// ── arm 3: spelets eget fält ────────────────────────────────────────────────────────────────────
const falt = byggFlaktfalt({ huvud: HUVUD, rikt: RIKT })
const nyKraft = (x, y) => flaktLuft(falt, HUVUD, RIKT, x, y, PLATS.fonster)

function lcg(seed) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
}
const positioner = (runda, seed) => {
  const W = Math.min(880, 520 + runda * 70)
  const Hh = Math.min(470, 330 + runda * 34)
  const r = lcg(seed)
  const p = []
  for (let i = 0; i < 200; i++) {
    const cx = PLATS.ansikte.x + 60 + (r() - 0.5) * 80 // områdets mitt slumpas per fluga
    p.push({ x: cx + (r() - 0.5) * W, y: PLATS.ansikte.y - 30 + (r() - 0.5) * Hh })
  }
  return p
}

console.log(`fläktens huvud (${HUVUD.x}, ${HUVUD.y}) · riktning ${RIKT > 0 ? 'åt höger (mot fönstret)' : 'åt vänster'}`)
let sumRen = 0, sumHead = 0, sumNy = 0, n = 0
for (const runda of [0, 4, 12]) {
  console.log(`\n══ runda ${runda} — 200 flugpositioner ur flugans område`)
  let ren = 0, head = 0, ny = 0, maxDs = 0, maxDr = 0, sammaMangd = true
  for (const seed of [1, 2, 3, 4, 5]) {
    for (const p of positioner(runda, seed * 7919 + runda)) {
      const a = renKonKraft(p.x, p.y)
      const h = headKraft(p.x, p.y)
      const m = nyKraft(p.x, p.y)
      if (a) ren++
      if (h) head++
      if (m) ny++
      if (!h !== !m) sammaMangd = false
      if (h && m) {
        maxDs = Math.max(maxDs, Math.abs(h.s - m.s))
        maxDr = Math.max(maxDr, Math.abs(h.vx - m.vx), Math.abs(h.vy - m.vy))
      }
    }
  }
  const k = 5 // fem dragningar à 200 → medel per 200
  console.log(`  REN KON  ${(ren / k).toFixed(1)}/200 · HEAD ${(head / k).toFixed(1)}/200 · NYA ${(ny / k).toFixed(1)}/200   (medel av 5 dragningar)`)
  ok('KONTROLL: ren kon når FÄRRE än HEAD (mätningen skiljer en kon från kon + sug)', ren < head, `${(ren / k).toFixed(1)} < ${(head / k).toFixed(1)}`)
  ok('NYA når minst lika många som HEAD (talet får inte sjunka)', ny >= head, `${(ny / k).toFixed(1)} ≥ ${(head / k).toFixed(1)}`)
  ok('samma MÄNGD punkter som HEAD, punkt för punkt', sammaMangd)
  ok('samma styrka (≤ 1e-12) och riktning (≤ 1e-12) som HEAD', maxDs <= 1e-12 && maxDr <= 1e-12, `max |Δs| ${maxDs.toExponential(1)} · max |Δriktning| ${maxDr.toExponential(1)}`)
  sumRen += ren / k; sumHead += head / k; sumNy += ny / k; n++
}
console.log(`\n  medel över rundorna: ren kon ${(sumRen / n).toFixed(1)} · HEAD ${(sumHead / n).toFixed(1)} · NYA ${(sumNy / n).toFixed(1)} av 200`)

// ── hela skärmen (rutnät 20 px, 1280×720): täckning och det som flugorna faktiskt kan nå ────────
let g1 = 0, g2 = 0, g3 = 0
for (let x = 0; x <= 1280; x += 20) {
  for (let y = 0; y <= 720; y += 20) {
    if (renKonKraft(x, y)) g1++
    if (headKraft(x, y)) g2++
    if (nyKraft(x, y)) g3++
  }
}
console.log(`  rutnät 20 px över hela skärmen: ren kon ${g1} · HEAD ${g2} · NYA ${g3} punkter`)
ok('rutnätet: NYA = HEAD', g3 === g2)

// ── luften står still utan pust: formVid ger ingen tidsfaktor, spelet gatar med `_vindT` ────────
ok('fältet har ingen `varld` och stegar inte själv', falt.stegarSjalv === false)
falt.destroy()
renKon.destroy()
console.log(fel ? `\n${fel} FEL` : '\nalla mått gröna')
process.exit(fel ? 1 : 0)
