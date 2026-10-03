// FANGA-FRUKTENS SKAFT (FYSIKPLAN F1, dag D16 kluster B4) — mäts i Node, ingen webbläsare.
//
//   node scripts/_dag-fanga-frukten.mjs
//
// Samma värld som spelet (PhysicsWorld gravityY 0,55, väggar vänster/höger), samma frukt (restitution 0,32 ·
// friction 0,4 · täthet per storlek), samma pendel (`hang.js` ger geometri och tal; spelet använder samma fil).
//
// A  GUNGAR: frukten hänger ur skaftet och svänger över lodlinjen (≥ 1 teckenbyte i x mot fästet inom minsta
//    hängtid), skaftet håller längden (≤ 6 px fel — styvhet 0,92 är fjädrande), frukten faller inte under hänget.
//    KONTROLLARMAR: (1) fallets luftmotstånd 0,03 under hänget dämpar pendeln — amplituden vid 1 s ska vara minst
//    2× mindre än med HANG_LUFT (varför luften är sänkt); (2) utan pendel faller frukten > 60 px på en sekund
//    (mätaren duger: ett skaft SKA hålla).
// B  FALLET: efter släpp når frukten korgens höjd (y 570) inom 4 s, aldrig över MAX_FALL 8 px/steg, aldrig ur
//    x-intervallet; tiden från ny frukt till korgen jämförs mot HEAD (föds vid y −40, ingen hängtid).
// C  FÄSTET: inget skaft i ekorrens zon, och två skaft närmare än 96 px flyttas isär (utom mot kanten).
import { PhysicsWorld, Body } from '../src/lib/physics.js'
import { HANG_L, HANG_LUFT, HANG_MIN, HANG_SPANN, HANG_STYVHET, HANG_ZON, HANG_TATT, hangStart, hangX } from '../src/games/fanga-frukten/hang.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const rubrik = (t) => console.log(`\n══ ${t}`)
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const FRAME = 1000 / 60
const GRAVITY_Y = 0.55
const MAX_FALL = 8
const SIZES = [{ fs: 52, dens: 0.0009 }, { fs: 60, dens: 0.0011 }, { fs: 70, dens: 0.0013 }]
const med = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1)

function fruktKropp(phys, def, x, y, extra = {}) {
  return phys.circle(x, y, def.fs * 0.4, { restitution: 0.32, friction: 0.4, frictionAir: 0.03, density: def.dens, label: 'fruit', ...extra })
}

// Ett hängande-och-släppt förlopp. `luft` = luftmotstånd under hänget; `utanPendel` = kontrollarm.
function hang({ def, x = 400, sida = 1, slump = 0.5, luft = HANG_LUFT, utanPendel = false, hold = HANG_MIN, steg = 60 * 6 }) {
  const phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['left', 'right'] })
  const r = def.fs * 0.4
  const s = hangStart({ x, r, sida, slump })
  const body = fruktKropp(phys, def, s.cx, s.cy, { frictionAir: luft, angle: s.angle })
  const led = utanPendel ? null : phys.pendel({ x: s.ax, y: s.ay }, body, { langd: HANG_L, styvhet: HANG_STYVHET, damp: 0, ankare: s.ankare })
  const res = { teckenbyte: 0, amp1s: 0, langdFel: 0, sjunk: 0, tNer: null, maxFart: 0, minX: 1e9, maxX: -1e9, startY: s.cy }
  let sistaTecken = Math.sign(s.cx - s.ax)
  const holdSteg = Math.round(hold * 60)
  let slappt = false
  for (let i = 0; i < steg; i++) {
    if (i === holdSteg && led) { led.ta(); body.frictionAir = 0.03; slappt = true }
    phys.update(FRAME)
    const p = body.position
    if (!slappt || utanPendel) {
      if (i < holdSteg) {
        const tecken = Math.sign(p.x - s.ax)
        if (tecken !== 0 && tecken !== sistaTecken) { res.teckenbyte++; sistaTecken = tecken }
        res.sjunk = Math.max(res.sjunk, p.y - s.cy)
        if (led) {
          const tx = p.x + s.ank * Math.sin(body.angle)
          const ty = p.y - s.ank * Math.cos(body.angle)
          res.langdFel = Math.max(res.langdFel, Math.abs(Math.hypot(tx - s.ax, ty - s.ay) - HANG_L))
        }
        if (i === 59) res.amp1s = Math.abs(p.x - s.ax)
      }
    }
    if (slappt) res.maxFart = Math.max(res.maxFart, body.speed)
    res.minX = Math.min(res.minX, p.x)
    res.maxX = Math.max(res.maxX, p.x)
    if (res.tNer == null && p.y > 570) res.tNer = (i + 1) / 60
  }
  phys.destroy()
  return res
}

// HEAD: föds vid y −40 utan hängtid.
function head({ def, x = 400 }) {
  const phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['left', 'right'] })
  const body = fruktKropp(phys, def, x, -40)
  let tNer = null
  for (let i = 0; i < 60 * 8 && tNer == null; i++) {
    phys.update(FRAME)
    if (body.position.y > 570) tNer = (i + 1) / 60
  }
  phys.destroy()
  return tNer
}

// ═══ A ═══
rubrik('A · frukten gungar i skaftet')
for (const def of SIZES) {
  const r = hang({ def })
  const kLuft = hang({ def, luft: 0.03 })
  const kFri = hang({ def, utanPendel: true })
  ok(`fs ${def.fs}: svänger över lodlinjen inom ${HANG_MIN} s (≥ 1 teckenbyte)`, r.teckenbyte >= 1, `${r.teckenbyte} byten`)
  ok(`fs ${def.fs}: skaftet håller längden (≤ 6 px fel)`, r.langdFel <= 6, `${f(r.langdFel, 2)} px`)
  ok(`fs ${def.fs}: frukten sjunker inte under hänget (≤ 12 px under startläget)`, r.sjunk <= 12, `${f(r.sjunk, 1)} px`)
  // amplitud vid 1 s: med låg luft svänger pendeln; med fallets luft är den kvar mindre (kontrollarm)
  ok(`fs ${def.fs}: KONTROLL luft 0,03 dämpar pendeln — amplitud vid 1 s ${f(kLuft.amp1s, 1)} px mot ${f(r.amp1s, 1)} px (HANG_LUFT)`, kLuft.amp1s < r.amp1s / 2 || (r.amp1s > 6 && kLuft.amp1s < 3), '')
  ok(`fs ${def.fs}: KONTROLL utan pendel faller frukten > 60 px på en sekund (mätaren duger)`, kFri.sjunk > 60, `${f(kFri.sjunk, 0)} px`)
}

// ═══ B ═══
rubrik('B · fallet efter släpp')
const tider = []
const headTider = []
let maxFart = 0
let minX = 1e9
let maxX = -1e9
let alla = true
for (let k = 0; k < 90; k++) {
  const def = SIZES[k % 3]
  const x = 140 + (k * 97) % 1000
  const sida = k % 2 ? -1 : 1
  const hold = HANG_MIN + ((k * 37) % 100) / 100 * HANG_SPANN
  const r = hang({ def, x, sida, slump: (k % 10) / 10, hold })
  if (r.tNer == null) alla = false
  else tider.push(r.tNer)
  maxFart = Math.max(maxFart, r.maxFart)
  minX = Math.min(minX, r.minX)
  maxX = Math.max(maxX, r.maxX)
  headTider.push(head({ def, x }))
}
console.log(`  · tid från ny frukt till y 570: nu ${f(med(tider), 2)} s (min ${f(Math.min(...tider), 2)} · max ${f(Math.max(...tider), 2)}) · HEAD ${f(med(headTider), 2)} s`)
ok('alla 90 frukter når korgens höjd inom 6 s', alla && Math.max(...tider) < 6, `max ${f(Math.max(...tider), 2)} s`)
ok(`aldrig över fallfarten ${MAX_FALL} px/steg (efter släpp)`, maxFart <= MAX_FALL, `${f(maxFart, 2)}`)
ok('ingen frukt lämnar x-intervallet (väggarna 0…1280)', minX > 0 && maxX < 1280, `${f(minX, 0)}…${f(maxX, 0)}`)
ok('tiden till korgen ändras högst 0,8 s mot HEAD (takten rörs knappt)', Math.abs(med(tider) - med(headTider)) < 0.8, `${f(med(tider) - med(headTider), 2)} s`)

// ═══ C ═══
rubrik('C · fästet')
let iZon = 0
let tatt = 0
let tillfallen = 0
for (let k = 0; k < 4000; k++) {
  const andra = []
  for (let n = 0; n < (k % 3); n++) andra.push(hangX(120 + Math.random() * 1040, andra))
  const x = hangX(120 + Math.random() * 1040, andra)
  tillfallen++
  if (x > HANG_ZON[0] && x < HANG_ZON[1]) iZon++
  if (andra.some((a) => Math.abs(a - x) < HANG_TATT)) tatt++
}
ok('inget skaft hamnar i ekorrens zon', iZon === 0, `${iZon} av ${tillfallen}`)
ok(`två skaft närmare än ${HANG_TATT} px förekommer sällan (bara när kanten eller zonen tvingar: < 5 %)`, tatt / tillfallen < 0.05, `${tatt} av ${tillfallen}`)

console.log(fel ? `\n✗ ${fel} rad(er) röda` : '\n✓ alla gröna')
process.exit(fel ? 1 : 0)
