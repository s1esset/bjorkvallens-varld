// T1-sond (FYSIKPLAN §1.3.3 / T1): är flytjämvikten oberoende av bildtakten?
//
//   node scripts/_flytsteg.mjs
//
// Samma tank som `_flytprobe` (plask-i-vattnets), men driven genom PIXIS EGEN Ticker (maxFPS 60,
// vsync-stämplar kvantiserade till 0,1 ms) vid 30/40/50/57/60/90 Hz — så som en skärm gör.
//   KONTROLLARM  den gamla koden (`git show <ref>:src/lib/flytkraft.js`, ref = HEAD, eller `--ref
//                <commit>` — efter att T1 committats måste ref vara en commit FÖRE den) med
//                `steg(t)` per BILDRUTA → ska drifta med takten: 1,000/0,927/0,746/0,657/0,637.
//   MÄTARM       nuvarande lib/flytkraft.js (självsteg per fysiksteg) → ska ligga på 0,625.
// Jämvikten för flyt 1,6 = nedsänkning 1/1,6 = 0,625. Mäts som medel över de sista 4 s.
// Kontrollarmen kräver att ref-versionen saknar självsteg (annars rapporteras den som ✗).
import { execFileSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import { Ticker } from 'pixi.js'
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Flytvolym as Ny } from '../src/lib/flytkraft.js'

const { Body } = Matter
const ri = process.argv.indexOf('--ref')
const REF = ri > 0 ? process.argv[ri + 1] : 'HEAD'
// Gamla koden hämtas ur git till en temporär fil (raderas direkt efter importen).
const TMP = new URL('./_flytkraft_ref.tmp.mjs', import.meta.url)
let GAMMAL = null
try {
  writeFileSync(TMP, execFileSync('git', ['show', `${REF}:src/lib/flytkraft.js`], { encoding: 'utf8' }))
  GAMMAL = (await import(TMP.href)).Flytvolym
} catch (e) {
  console.log(`(kunde inte läsa ${REF}:src/lib/flytkraft.js — ${String(e.message).slice(0, 80)})`)
} finally {
  rmSync(TMP, { force: true })
}

const SURFACE_Y = 330, FLOOR_TOP = 672, WALL_L = 414, WALL_R = 866, BODY_R = 38, GRAV_Y = 0.9

function tank() {
  const varld = new PhysicsWorld({ gravityY: GRAV_Y, walls: [] })
  const T = 60
  const cx = (WALL_L + WALL_R) / 2
  varld.rectangle(cx, FLOOR_TOP + T / 2, WALL_R - WALL_L + T * 2, T, { isStatic: true, restitution: 0.04, friction: 0.6 })
  varld.rectangle(WALL_L - T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3 })
  varld.rectangle(WALL_R + T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3 })
  return varld
}

// En körning: Pixis Ticker matas med vsync-stämplar (kvantiserade till 0,1 ms), `steg` = true →
// gamla mönstret (volymen stegas per bildruta före motorn).
function kor(Volym, hz, { manuell, flyt = 1.6, sek = 14 }) {
  const varld = tank()
  const vol = new Volym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
  const b = varld.circle(640, 470, BODY_R, { restitution: 0.06, friction: 0.3, frictionAir: 0.012, density: 0.0012 })
  Body.setVelocity(b, { x: 0, y: 1.8 })
  vol.lagg(b, { flyt, hemX: 640, fas: 0, liv: false })
  const ticker = new Ticker()
  ticker.autoStart = false
  ticker.maxFPS = 60
  let t = 0
  const fracs = []
  ticker.add(() => {
    t += ticker.deltaMS / 1000
    if (manuell) vol.steg(t)
    varld.update(ticker.deltaMS)
    if (t > sek - 4) fracs.push(vol.nedsankning(b))
  })
  const dt = 1000 / hz
  ticker.update(0)
  for (let k = 1; k * dt < sek * 1000; k++) ticker.update(Math.round(k * dt * 10) / 10)
  const stegar = vol.stegarSjalv
  vol.destroy()
  varld.destroy()
  return { frac: fracs.reduce((a, c) => a + c, 0) / (fracs.length || 1), stegar }
}

let fel = 0
const HZ = [30, 40, 50, 57, 60, 90]
const f3 = (x) => x.toFixed(3)
const rad = (namn, Volym, manuell) => {
  const tal = HZ.map((hz) => kor(Volym, hz, { manuell }))
  console.log(`${namn.padEnd(34)} ${tal.map((r) => f3(r.frac)).join('  ')}   stegarSjalv=${tal[0].stegar}`)
  return tal.map((r) => r.frac)
}

console.log(`${''.padEnd(34)} ${HZ.map((h) => String(h).padStart(5)).join('  ')}  Hz`)
let kontroll = null
if (GAMMAL) {
  kontroll = rad('KONTROLL: ref, steg() per bildruta', GAMMAL, true)
  const spann = Math.max(...kontroll) - Math.min(...kontroll)
  const rorSig = spann > 0.2 && kontroll[0] > 0.95
  console.log(`  ${rorSig ? '✓' : '✗'} kontrollarmen rör sig (30 Hz sjunker, spann ${f3(spann)})`)
  if (!rorSig) fel++
} else console.log('(ingen ref-kopia — kontrollarmen hoppas över)')

const mat = rad('MÄT: ny lib, självsteg per steg', Ny, false)
const ok = mat.every((x) => Math.abs(x - 0.625) <= 0.005)
console.log(`  ${ok ? '✓' : '✗'} 0,625 ± 0,005 vid alla takter`)
if (!ok) fel++

// Den nya volymen med perSteg:false + steg() per bildruta = gamla vägen, ska bete sig som HEAD.
const gam = rad('NY lib, perSteg:false + steg()', class extends Ny { constructor(o) { super({ ...o, perSteg: false }) } }, true)
if (kontroll) {
  const lika = gam.every((x, i) => Math.abs(x - kontroll[i]) < 1e-9)
  console.log(`  ${lika ? '✓' : '✗'} perSteg:false är identisk med ref`)
  if (!lika) fel++
}

// Dubbelapplicering: steg() på en självstegande volym ska vara en no-op (samma tal som utan anrop).
const dub = rad('NY lib, självsteg + steg() (no-op)', Ny, true)
const noop = dub.every((x, i) => Math.abs(x - mat[i]) < 1e-9)
console.log(`  ${noop ? '✓' : '✗'} steg() på självstegande volym ändrar ingenting`)
if (!noop) fel++

// Exit: efter destroy() ligger ingen krok kvar (ett steg efteråt rör ingen kropp).
{
  const varld = tank()
  const vol = new Ny({ varld, ytY: SURFACE_Y, vanster: WALL_L, hoger: WALL_R })
  const b = varld.circle(640, 470, BODY_R, { density: 0.0012 })
  vol.lagg(b, { flyt: 1.6, fas: 0, liv: false })
  for (let i = 0; i < 30; i++) varld.update(1000 / 60)
  const n0 = varld.engine.events?.beforeUpdate?.length ?? -1
  vol.destroy()
  const n1 = varld.engine.events?.beforeUpdate?.length ?? -1
  const ok2 = vol.count === 0 && n1 === n0 - 1
  console.log(`  ${ok2 ? '✓' : '✗'} destroy() avregistrerar kroken (${n0} → ${n1})`)
  if (!ok2) fel++
}
console.log(fel ? `\n${fel} FEL\n` : '\nALLT GRÖNT\n')
process.exit(fel ? 1 : 0)
