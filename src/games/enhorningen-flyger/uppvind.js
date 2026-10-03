// UPPVIND — luftpelare som lyfter Elviras enhörning (FYSIKPLAN F4, kluster B2, `lib/vind.js`).
//
// Spelet har ingen matter-värld: enhörningen flyger med en egen 1D-integrator (`vy`, fjäder mot
// fingret + dämpning `DAMP` per bildruta). Vinden hör ändå hemma i samma modell som resten av F4 —
// luftens FART, aldrig en kraft — och `Vindfalt` går att köra utan värld: `luftVid(x, y)` är ren
// matematik. Varje uppvindspelare är ett `Vindfalt` (typ `band`, axel rakt UPPÅT, källan nere vid
// marken). Spelet flyttar fältet i sidled med världen och läser luften vid enhörningen.
//
// MODELLEN. Luften har farten `w` (px/bildruta, negativ = uppåt). Flygintegratorn drar redan
// `vy *= DAMP` (en luft som står still), så det som SAKNAS är exakt termen `(1 − DAMP) · w` —
// precis som `Vindfalt` lägger `fa·w` ovanpå matters `fa·v`. Följden: i fri glidning går farten mot
// `w` (aldrig förbi), och fingret som håller henne kvar får bara en liten förskjutning
// (ca 23 px vid full styrka: (1 − DAMP) · |w| / STEER) — uppvinden LYFTER en
// glidande enhörning men kan aldrig ta styrningen ifrån barnet. Taket `MAXV` gäller som förut.
//
// VÄN, ALDRIG FIENDE. En pelare föds bara framför en ring som sitter HÖGRE än den förra (lyft åt det
// håll barnet ändå ska), och dess topp ligger vid ringens höjd: bandet tonar ut mot toppen
// (`avtag.langs` 0,9) och SLUTAR där, så ingen pelare kan skjuta henne mot kanten. Ovanför toppen
// finns ingen vind. Rena tal + `lib/vind.js` (ingen Pixi, inga timers): ett Node-mått kör
// exakt spelets kod — se `lyftBana` nedan.
import { Vindfalt } from '../../lib/vind.js'

export const KOL_BOTTEN = 650 // källan: pelarens fot (design-y), under flygrutans nederkant
export const KOL_HALV = 84 // pelarens halva bredd (px)
export const KOL_LUFT = 7 // luftens fart i pelarens mitt, px/bildruta uppåt
export const KOL_AVTAG = { langs: 0.9, tvars: 0.7 } // tonar mot toppen och mot sidorna

// En pelare. `topY` = var den slutar (design-y), `x` = mitt (flyttas med `flytta`).
export function nyKolumn({ topY, halv = KOL_HALV, luft = KOL_LUFT, x = 0 }) {
  return new Vindfalt({
    form: { typ: 'band', x, y: KOL_BOTTEN, rackvidd: Math.max(60, KOL_BOTTEN - topY), halvhojd: halv, vinkel: -Math.PI / 2 },
    luft: { x: 0, y: -luft },
    avtag: { ...KOL_AVTAG },
    aktiv: true,
  })
}

// Luften vid (x, y) ur en lista pelare: den STARKASTE gäller (två som överlappar lägger inte ihop sig).
// → { w, k }  w = luftens fart uppåt (px/bildruta, ≤ 0), k = styrkan 0..1 (för bilden och reaktionen).
const UT = { w: 0, k: 0 }
export function luftHos(kolumner, x, y) {
  let w = 0
  for (const kol of kolumner) {
    const o = kol.luftVid(x, y)
    if (o && o.vy < w) w = o.vy
  }
  UT.w = w
  UT.k = w < 0 ? Math.min(1, -w / KOL_LUFT) : 0
  return UT
}

// Ett steg av flygintegratorn: `vy` efter att dämpningen (`vy *= damp^dt`) redan körts. Lägger
// luftens del `(1 − damp^dt)·w` → sluthastighet `w`, samma för 30 och 60 Hz.
export function uppvindSteg(vy, w, dt, damp) {
  return w === 0 ? vy : vy + (1 - Math.pow(damp, dt)) * w
}

// Ett ENSKILT flyg genom en pelare, utan finger (barnet släppte): var hamnar hon? Samma formler som
// spelet (dämpning → uppvind → hastighetstak → integrering), för ett mått utan webbläsare.
// `kol` = { x0 (pelarens mitt när mätningen börjar), topY, halv }, `fart` = scroll px/bildruta.
export function lyftBana({ y0 = 520, kol = null, fart = 2.6, damp = 0.9, maxv = 18, uniX = 300, steg = 360, finger = null, steer = 0.03 }) {
  const pelare = kol ? [nyKolumn({ topY: kol.topY, halv: kol.halv, x: kol.x0 })] : []
  let y = y0
  let vy = 0
  let x = kol ? kol.x0 : 0
  let minY = y
  for (let i = 0; i < steg; i++) {
    x -= fart
    if (pelare[0]) pelare[0].flytta(x, KOL_BOTTEN)
    if (finger != null) vy += (finger - y) * steer
    vy *= damp
    const l = luftHos(pelare, uniX, y)
    vy = uppvindSteg(vy, l.w, 1, damp)
    vy = Math.max(-maxv, Math.min(maxv, vy))
    y += vy
    if (y < minY) minY = y
  }
  for (const p of pelare) p.destroy()
  return { y, minY, vy }
}
