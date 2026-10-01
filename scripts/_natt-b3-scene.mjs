// Nattkörning 2026-10-01 · B3 · FYSIKPLAN L1 — mäter `createScene({ silhuett, forgrund })` i NODE.
// Ingen webbläsare: Pixi bygger geometri utan renderare, och texturbakningar räknas genom att ersätta
// DOMAdapter.createCanvas med en räknare (varje FillGradient bakar EN duk).
//   node scripts/_natt-b3-scene.mjs
//
// Kontrollarmar (talet ska KUNNA röra sig innan mätarmen läses):
//   K1  en scen med ett NYTT tema bakar > 0 gradienter  (räknaren ser en bakning)
//   K2  Math.random-trädlinjen ger två olika sviter     (determinismtestet kan falla)
//   K3  utan klämning når en trädtopp över knappzonens gräns (klämtestet kan falla)
//   K4  hit-geometrin med de GAMLA konstanterna ger överlapp  (öra-testet kan falla)
import { DOMAdapter, BrowserAdapter } from 'pixi.js'

let bakes = 0
const grad = { addColorStop() {} }
const ctx2d = new Proxy({}, {
  get: (_, n) => (n === 'createLinearGradient' || n === 'createRadialGradient' ? () => grad : n === 'fillStyle' ? '#000' : () => {}),
  set: () => true,
})
DOMAdapter.set({ ...BrowserAdapter, createCanvas: (w, h) => { bakes++; return { width: w, height: h, getContext: () => ctx2d } } })

const { createScene, tradlinje, stadlinje, slump } = await import('../src/lib/scene.js')
const { BLEED_X } = await import('../src/lib/view.js')
const { gsap } = await import('gsap')

const rader = []
const ok = (namn, villkor, text = '') => { rader.push(!!villkor); console.log(`${villkor ? 'OK  ' : 'FEL '} ${namn}${text ? ' — ' + text : ''}`) }

// Rå Math.random-räknare (scenens egna moln drar slump; silhuett/förgrund får INTE ändra den ström).
const realRandom = Math.random
let drag = 0
const medRandomRakning = (fn) => { drag = 0; Math.random = () => { drag++; return realRandom() }; try { return fn() } finally { Math.random = realRandom } }

// --- 1. TEXTURBAKNINGAR -----------------------------------------------------------------------
// K1: kontrollarm. Första 'sky'-scenen bakar (nya gradienter), så räknaren rör sig.
let b0 = bakes
createScene('sky', {})
const forstaSky = bakes - b0
ok('K1 räknaren rör sig (första sky-scen bakar)', forstaSky > 0, `${forstaSky} bakningar`)

// Mätarm: meadow med och utan L1-optioner. Första monteringen får baka SAMMA antal i båda (L1 lägger
// inga gradienter), andra monteringen noll.
const basMeadow = (() => { const a = bakes; createScene('meadow', { groundH: 360 }); return bakes - a })()
b0 = bakes
createScene('meadow', { groundH: 360, silhuett: 'skog', forgrund: true })
ok('M1 meadow + silhuett + forgrund bakar 0 efter att meadow bakats en gång', bakes - b0 === 0, `${bakes - b0} (bas första montering: ${basMeadow})`)
b0 = bakes
for (const sil of ['skog', 'gran', 'stad', false]) createScene('meadow', { groundH: 360, silhuett: sil, forgrund: true, fro: 7 })
createScene('meadow', { groundH: 360, silhuett: 'skog', forgrund: true, kamera: { bredd: 3200 } })
ok('M2 fem monteringar till (alla silhuetter, kamera) bakar 0', bakes - b0 === 0, `${bakes - b0}`)
// Och en ny tema-scen med L1 på bakar inte MER än utan (samma gradienter, inga extra).
const nyttTema = (opts) => { const a = bakes; createScene('warm', opts); return bakes - a }
const utanL1 = nyttTema({})
const medL1 = (() => { const a = bakes; createScene('candy', { silhuett: 'stad', forgrund: true }); const c = bakes - a; return c })()
const utanL1Candy = (() => { const a = bakes; createScene('night', {}); return bakes - a })()
ok('M3 första warm utan L1 bakade (kontroll)', utanL1 > 0, `${utanL1}`)
ok('M4 candy + L1 första gång bakar bara temats egna (≤ utan L1 för ett jämförbart tema)', medL1 <= utanL1Candy + 1, `candy+L1 ${medL1} · night utan L1 ${utanL1Candy}`)

// --- 2. OPT-IN: förval = dagens beteende ---------------------------------------------------------
const antal = (o) => createScene('meadow', o).children.length
const nollRoot = antal({})
ok('O1 {} och { silhuett:false, forgrund:false } ger lika många barn', nollRoot === antal({ silhuett: false, forgrund: false }), `${nollRoot}`)
ok('O2 silhuett ger +2 barn (fjärran + mellan), förgrund +2 (två rader)', antal({ silhuett: 'skog' }) === nollRoot + 2 && antal({ forgrund: true }) === nollRoot + 2, `${antal({ silhuett: 'skog' })} / ${antal({ forgrund: true })}`)
const kam = (o) => createScene('meadow', { kamera: { bredd: 3200 }, ...o })._kamLager.length
ok('O3 kameraläge: förval 10 lager, forgrund +1, silhuett 0 extra', kam({}) === 10 && kam({ forgrund: true }) === 11 && kam({ silhuett: 'gran' }) === 10, `${kam({})} / ${kam({ forgrund: true })} / ${kam({ silhuett: 'gran' })}`)
ok('O4 ingen mark => ingen silhuett/förgrund', createScene('meadow', { ground: false, silhuett: 'skog', forgrund: true }).children.length === createScene('meadow', { ground: false }).children.length)
ok('O5 tema utan gräs (candy/water) ritar ingen förgrund', createScene('candy', { forgrund: true }).children.length === createScene('candy', {}).children.length && createScene('water', { forgrund: true }).children.length === createScene('water', {}).children.length)

// Slumpströmmen: scenens egna moln drar Math.random — silhuett/förgrund får inte dra något extra.
const d0 = (() => { medRandomRakning(() => createScene('meadow', { groundH: 360 })); return drag })()
const d1 = (() => { medRandomRakning(() => createScene('meadow', { groundH: 360, silhuett: 'skog', forgrund: true })); return drag })()
ok('O6 L1 drar inga extra Math.random (ändrar inte molnens/stjärnornas ström)', d0 === d1, `${d0} mot ${d1}`)

// --- 3. DETERMINISM ---------------------------------------------------------------------------------
const rek = () => { const k = []; const g = new Proxy({}, { get: (_, n) => (...a) => { k.push(n + ':' + a.map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join(',')); return g } }); return { g, k } }
const sviten = (fn) => { const { g, k } = rek(); fn(g); return k.join('|') }
const grans = (rnd) => (g) => tradlinje(g, 362, 40, 0x123456, 0.35, 24, 58, { x0: -280, xSlut: 1560, rnd })
const a1 = sviten(grans(slump(1011)))
const a2 = sviten(grans(slump(1011)))
const a3 = sviten(grans(slump(2011)))
ok('D1 samma fro => identisk trädlinje', a1 === a2, `${a1.length} tecken`)
ok('D2 annat fro => annan trädlinje', a1 !== a3)
const r1 = sviten(grans(undefined))
const r2 = sviten(grans(undefined))
ok('K2 kontroll: Math.random-trädlinjen ÄR olika mellan anrop (testet kan falla)', r1 !== r2)
const s1 = sviten((g) => stadlinje(g, 362, 54, 1, { x0: -280, xSlut: 1560, rnd: slump(5) }))
const s2 = sviten((g) => stadlinje(g, 362, 54, 1, { x0: -280, xSlut: 1560, rnd: slump(5) }))
ok('D3 stadslinjen är deterministisk', s1 === s2)
// Molnen slumpas (Math.random) och ligger i scenen — jämför bara de barn som är silhuett/förgrund (utan slump i bas).
const sSig = (o) => { const s = createScene('meadow', { groundH: 360, ...o }); return s.children.filter((c) => c.constructor.name === 'Graphics').map((c) => { const b = c.getLocalBounds(); return `${b.minX | 0},${b.minY | 0},${b.maxX | 0},${b.maxY | 0}` }).join(';') }
ok('D4 scen: samma fro => samma Graphics-geometri', sSig({ silhuett: 'skog', forgrund: true, fro: 4 }) === sSig({ silhuett: 'skog', forgrund: true, fro: 4 }))
ok('D5 scen: annat fro => annan geometri', sSig({ silhuett: 'skog', forgrund: true, fro: 4 }) !== sSig({ silhuett: 'skog', forgrund: true, fro: 9 }))

// --- 4. KNAPPZONEN: inget högt bakom skalets knappar (x < 230 => y >= 170) ----------------------------
const punkter = (fn) => { const pts = []; const g = {}; for (const n of ['moveTo', 'lineTo']) g[n] = (x, y) => { pts.push([x, y]); return g }; g.bezierCurveTo = (a, b, c, d, x, y) => { pts.push([a, b], [c, d], [x, y]); return g }; g.rect = (x, y, w, h) => { pts.push([x, y]); return g }; g.poly = (p) => { for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]); return g }; g.closePath = () => g; g.fill = () => g; fn(g); return pts }
const minIKnapp = (pts) => Math.min(...pts.filter(([x]) => x < 230).map(([, y]) => y))
// Tvinga fram ett högt läge: horisont på y=120 (groundH 600) så att trädtopparna SKULLE nå upp till ~50.
const hoga = (nr) => minIKnapp(punkter((g) => {
  tradlinje(g, 122, 40, 1, 0.35, 24, 58, { x0: -280, xSlut: 1560, rnd: slump(nr) })
  tradlinje(g, 122, 44, 1, 0.9, 16, 36, { x0: -280, xSlut: 1560, rnd: slump(nr + 1) })
  stadlinje(g, 122, 54, 1, { x0: -280, xSlut: 1560, rnd: slump(nr + 2) })
}))
const okl = (nr) => minIKnapp(punkter((g) => {
  tradlinje(g, 122, 40, 1, 0.35, 24, 58, { x0: -280, xSlut: 1560, rnd: slump(nr), minY: -9999 })
}))
ok('K3 kontroll: utan klämning når en topp över 170 (testet kan falla)', okl(1) < 170, `min y ${okl(1).toFixed(0)}`)
ok('Z1 med klämning: min y i knappzonen >= 170 (skog/gran/stad, 5 frön)', [1, 11, 21, 31, 41].every((n) => hoga(n) >= 170), `min ${Math.min(...[1, 11, 21, 31, 41].map(hoga)).toFixed(0)}`)
// Vanliga lägen: horisont y=360 (vilket-djur-later) — toppar ska hamna över 250 (inte kläms alls)
const vdl = minIKnapp(punkter((g) => tradlinje(g, 362, 40, 1, 0.35, 24, 58, { x0: -280, xSlut: 1560, rnd: slump(1011) })))
ok('Z2 vilket-djur-later (gy 360): trädtopparna i knappzonen ligger på y > 250 utan klämning', vdl > 250, `min y ${vdl.toFixed(0)}`)

// --- 5. FORM: trädlinjen går hela vägen ut i bleed ---------------------------------------------------
const xs = punkter(grans(slump(3))).map(([x]) => x)
ok('F1 trädlinjen täcker -BLEED_X .. 1280+BLEED_X', Math.min(...xs) <= -BLEED_X && Math.max(...xs) >= 1280 + BLEED_X, `${Math.min(...xs).toFixed(0)} .. ${Math.max(...xs).toFixed(0)}`)
{
  const s = createScene('meadow', { groundH: 360, silhuett: 'skog', forgrund: true, fro: 1 })
  const rader2 = s.children.filter((c) => c.constructor.name === 'Graphics')
  const forgr = rader2.slice(-3, -1).map((c) => c.getLocalBounds())
  console.log('   .. förgrundsrader (bounds):', forgr.map((b) => `x ${b.minX | 0}..${b.maxX | 0} y ${b.minY | 0}..${b.maxY | 0}`).join(' | '))
  ok('F2 förgrundens översta punkt >= 720-70-12 på designytans nederkant (inget högt)', forgr[0].minY >= 720 - 70 - 12, `rad 1 minY ${forgr[0].minY.toFixed(0)}`)
  ok('F3 förgrunden täcker hela bredden inkl. bleed', forgr[0].minX <= -BLEED_X && forgr[0].maxX >= 1280 + BLEED_X, `${forgr[0].minX.toFixed(0)} .. ${forgr[0].maxX.toFixed(0)}`)
}

// --- 6. vilket-djur-later: öra mot djur, gammalt mot nytt ----------------------------------------------
// (Konstanterna hämtas ur källan så sonden inte mäter sin egen kopia.)
import { readFileSync } from 'node:fs'
const kalla = readFileSync(new URL('../src/games/vilket-djur-later/index.js', import.meta.url), 'utf8')
const num = (re) => Number(kalla.match(re)?.[1])
const HIT_HALV = num(/const HIT_HALV = (\d+)/)
const EAR_R = num(/const EAR_R = (\d+)/)
const EAR_GAP = num(/const EAR_GAP = (\d+)/)
ok('E0 konstanterna lästes ur källan', [HIT_HALV, EAR_R, EAR_GAP].every(Number.isFinite), `HIT_HALV ${HIT_HALV} EAR_R ${EAR_R} EAR_GAP ${EAR_GAP}`)
const lagg = (n) => (n <= 4
  ? Array.from({ length: n }, (_, i) => ({ sc: 1.3, x: 640 + (i - (n - 1) / 2) * (n === 2 ? 380 : n === 3 ? 340 : 300), y: 590 }))
  : Array.from({ length: n }, (_, i) => ({ sc: 0.95, x: 340 + (i % 3) * 300, y: i < 3 ? 478 : 664 })))
// hit-rektangel (−HALV..HALV, −150..16) · skala; öra: cirkel (r) vid (dx, −56·sc)
const matt = (n, halv, earDx, earR) => {
  const d = lagg(n).map((c) => ({ ...c, ear: { x: c.x + earDx(c.sc), y: c.y - 56 * c.sc }, hit: { x0: c.x - halv * c.sc, x1: c.x + halv * c.sc, y0: c.y - 150 * c.sc, y1: c.y + 16 * c.sc } }))
  let minGap = Infinity
  for (const a of d) for (const b of d) {
    // avstånd öra a -> rektangel b (cirkel mot rektangel, kant mot kant)
    const cx = Math.max(b.hit.x0, Math.min(a.ear.x, b.hit.x1))
    const cy = Math.max(b.hit.y0, Math.min(a.ear.y, b.hit.y1))
    minGap = Math.min(minGap, Math.hypot(a.ear.x - cx, a.ear.y - cy) - earR)
  }
  const maxX = Math.max(...d.map((c) => c.ear.x + earR))
  const minHitB = Math.min(...d.map((c) => 2 * halv * c.sc))
  return { minGap, maxX, minHitB }
}
const gammal = matt(4, 70, (sc) => 84 * sc, 50)
ok('K4 kontroll: gamla konstanter (±70, öra 84·sc r50) ger ÖVERLAPP (gap < 0)', gammal.minGap < 0, `gap ${gammal.minGap.toFixed(1)} px`)
let allaOk = true
for (const n of [2, 3, 4, 6]) {
  const m = matt(n, HIT_HALV, (sc) => HIT_HALV * sc + EAR_GAP + EAR_R, EAR_R)
  const bra = m.minGap >= 24 - 1e-6 && m.minHitB >= 96
  allaOk = allaOk && bra
  console.log(`   .. ${n} djur: min öra->träffyta ${m.minGap.toFixed(1)} px · smalaste djurträffyta ${m.minHitB.toFixed(1)} px · öra yttersta x ${m.maxX.toFixed(1)}`)
}
ok('E1 nya konstanter: öra->träffyta >= 24 px och träffyta >= 96 px för 2/3/4/6 djur', allaOk)

gsap.globalTimeline.clear()
const fel = rader.filter((r) => !r).length
console.log(`\n${rader.length - fel}/${rader.length} OK`)
process.exit(fel ? 1 : 0)
