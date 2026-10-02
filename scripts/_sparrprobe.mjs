// _sparrprobe.mjs — Flytvolym `sparr: 'alltid' | 'vatten'` i TAL (Node, ingen webbläsare).
//
//   node scripts/_sparrprobe.mjs
//
// Kontrollarm FÖRST: förvalet (och 'alltid') måste ge dagens beteende — fartspärren och vridDamp
// verkar OVANFÖR ytan. Mätarm: 'vatten' släpper dem ovanför ytan men behåller dem i vattnet.
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Flytvolym } from '../src/lib/flytkraft.js'

const { Body } = Matter
let fel = 0
function ok(namn, v, d = '') {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}

// En kropp med fart 40 px/steg och snurr 0,3 rad/steg, tyngdlös värld; ytan på y=600 (kroppen
// ovanför) eller y=-100 (kroppen under). Mäter fart och snurr efter ETT steg.
function ettSteg(opts, ovanfor) {
  const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
  const v = new Flytvolym({ varld: phys, ytY: ovanfor ? 600 : -100, maxFart: 22, vridDamp: 0.9, motstand: 0.94 })
  const b = phys.circle(300, 300, 20, { label: 'x' })
  Body.setVelocity(b, { x: 40, y: 0 })
  Body.setAngularVelocity(b, 0.3)
  v.lagg(b, { flyt: 0.5, liv: false, ...opts })
  phys.update(1000 / 60)
  const out = { fart: Math.hypot(b.velocity.x, b.velocity.y), snurr: b.angularVelocity, ned: v.nedsankning(b) }
  v.destroy()
  return out
}
const r2 = (x) => Math.round(x * 100) / 100

console.log('KONTROLL: förval == dagens beteende (spärr även ovanför ytan)')
const fOv = ettSteg({}, true)
ok('ovanför, förval: farten klipps till 22', fOv.fart <= 22.01 && fOv.ned === 0, `fart ${r2(fOv.fart)} snurr ${r2(fOv.snurr)}`)
ok('ovanför, förval: vridDamp 0,9', Math.abs(fOv.snurr - 0.27) < 0.02)
const aOv = ettSteg({ sparr: 'alltid' }, true)
ok("'alltid' är samma som förval", aOv.fart === fOv.fart && aOv.snurr === fOv.snurr)

console.log('MÄTARM: sparr "vatten"')
const vOv = ettSteg({ sparr: 'vatten' }, true)
ok('ovanför: ingen spärr, ingen vridDamp', vOv.fart > 35 && vOv.snurr > 0.29, `fart ${r2(vOv.fart)} snurr ${r2(vOv.snurr)}`)
const vIn = ettSteg({ sparr: 'vatten' }, false)
const fIn = ettSteg({}, false)
ok('i vattnet: som förval (spärr + vridDamp)', vIn.fart === fIn.fart && vIn.snurr === fIn.snurr && vIn.fart <= 22.01, `fart ${r2(vIn.fart)} snurr ${r2(vIn.snurr)} · nedsänkning ${r2(vIn.ned)}`)

console.log(fel ? `\n${fel} FEL` : '\nALLT GRÖNT')
process.exit(fel ? 1 : 0)
