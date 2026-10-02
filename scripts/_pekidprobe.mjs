// PEKAR-ID-SONDEN (FYSIKPLAN K2) — DragController och AimLauncher med TVÅ fingrar, i Node.
//
//   node scripts/_pekidprobe.mjs
//
// Falsk vy/yta (EventEmitter3) i stället för en webbläsare. KONTROLLARMEN är HEAD:s egen kod
// (`git show HEAD:src/lib/…`, skriven till en tillfällig fil intill skriptet och raderad efteråt):
// på HEAD MÅSTE finger 2 dra föremålet / sikta. Rör sig inte det avbryts skriptet — en mätarm
// som inte kan skilja två kända lägen åt mäter ingenting. Mätarmen är samma prov mot arbetskopian.
//
// Det här prövar bara ID-LOGIKEN. Att Pixi levererar `pointerId` och att spelen beter sig i
// bild mäter `scripts/_pekavbrottprobe.mjs` (arm B) mot dev-servern; `_dragprobe`/`_kastprobe`
// (tyngd, kast, städning, exit) ska köras oförändrade efteråt.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import EventEmitter from 'eventemitter3'

const dir = path.dirname(fileURLToPath(import.meta.url))
const rot = path.join(dir, '..')
const temp = []
function headModul(fil, namn) {
  let src = execSync(`git show HEAD:src/lib/${fil}`, { cwd: rot, encoding: 'utf8', maxBuffer: 1 << 24 })
  src = src.replace(/from '\.\/([^']+)'/g, "from '../src/lib/$1'")
  const ut = path.join(dir, `.tmp-head-${namn}.mjs`)
  fs.writeFileSync(ut, src)
  temp.push(ut)
  return import(pathToFileURL(ut).href)
}

let fel = 0
const ok = (namn, v, extra = '') => {
  if (!v) fel++
  console.log(`${v ? 'OK  ' : 'FEL '} ${namn}${extra ? '  ' + extra : ''}`)
}
const sov = (ms) => new Promise((r) => setTimeout(r, ms))
const ev = (type, id, x, y) => ({ type, pointerId: id, global: { x, y } })

function vy(x, y) {
  const v = new EventEmitter()
  v.x = x
  v.y = y
  v.scale = { x: 1, y: 1, set(a, b) { this.x = a; this.y = b ?? a } }
  v.rotation = 0
  v.eventMode = 'passive'
  v.parent = null
  v.destroyed = false
  return v
}
const rum = () => ({ toLocal: (g) => ({ x: g.x, y: g.y }), addChild() {}, removeChild() {} })

async function dragprov(DragController, etikett) {
  const space = rum()
  const dc = new DragController({ space, services: null })
  const v = vy(100, 100)
  dc.addItem(v, { id: 'a' })
  const mal = vy(900, 500)
  dc.addTarget(mal, () => true, { hitRadius: 80 })

  v.emit('pointerdown', ev('pointerdown', 7, 100, 100))
  v.emit('globalpointermove', ev('globalpointermove', 7, 160, 100))
  v.emit('globalpointermove', ev('globalpointermove', 8, 700, 400)) // finger 2
  await sov(450) // quickTo (0,1 s) hinner ikapp
  const xEfterF2 = v.x
  const foljerF2 = v.x > 400
  v.emit('pointerup', ev('pointerup', 8, 700, 400)) // finger 2 lyfts
  const aktivEfterF2Upp = dc.active === dc.items[0]
  v.emit('globalpointermove', ev('globalpointermove', 7, 180, 100))
  await sov(450)
  const foljerF1 = Math.abs(v.x - 180) < 8
  v.emit('pointerup', ev('pointerup', 7, 180, 100))
  const aktivEfterF1Upp = dc.active === null
  dc.destroy()
  console.log(`  [${etikett}] x efter finger 2 = ${xEfterF2.toFixed(0)} · efter finger 1 = ${v.x.toFixed(0)}`)
  return { foljerF2, aktivEfterF2Upp, foljerF1, aktivEfterF1Upp, v }
}

async function aimprov(AimLauncher, etikett) {
  const target = vy(300, 300)
  const root = Object.assign(rum(), { addChild() {} })
  let sk = 0
  let aim = 0
  const l = new AimLauncher({
    target, root, slingshot: true, hitRadius: 0,
    getOrigin: () => ({ x: 300, y: 300 }),
    onAim: () => aim++,
    onLaunch: () => sk++,
  })
  target.emit('pointerdown', ev('pointerdown', 7, 300, 300))
  target.emit('globalpointermove', ev('globalpointermove', 8, 700, 300)) // finger 2 rör
  const siktadeAvF2 = aim === 1
  target.emit('pointerup', ev('pointerup', 8, 700, 300)) // finger 2 lyfts
  const sköt = sk === 1
  const aimingEfter = l._aiming
  // finger 1 siktar och skjuter
  target.emit('globalpointermove', ev('globalpointermove', 7, 250, 300))
  target.emit('pointerup', ev('pointerup', 7, 200, 300))
  const skjutAvF1 = sk >= 1
  console.log(`  [${etikett}] onAim ${aim} · skott ${sk}`)
  l.destroy()
  return { siktadeAvF2, skottAvF2: sköt, aimingEfter, skjutAvF1 }
}

try {
  // ── KONTROLLARM: HEAD ───────────────────────────────────────────────────────────────────
  const HeadDrag = (await headModul('DragController.js', 'drag')).DragController
  const HeadAim = (await headModul('launcher.js', 'aim')).AimLauncher
  const hd = await dragprov(HeadDrag, 'HEAD drag')
  ok('KONTROLL HEAD DragController: finger 2 drar föremålet', hd.foljerF2)
  ok('KONTROLL HEAD DragController: finger 2:s släpp avslutar greppet', !hd.aktivEfterF2Upp)
  const ha = await aimprov(HeadAim, 'HEAD aim')
  ok('KONTROLL HEAD AimLauncher: finger 2 siktar', ha.siktadeAvF2)
  ok('KONTROLL HEAD AimLauncher: finger 2:s släpp skjuter', ha.skottAvF2)
  if (fel) {
    console.log('\nKontrollarmen visade inte det kända HEAD-läget — mätarmen är ogiltig.')
    process.exitCode = 1
  } else {
    // ── MÄTARM: arbetskopian ──────────────────────────────────────────────────────────────
    const { DragController } = await import('../src/lib/DragController.js')
    const { AimLauncher } = await import('../src/lib/launcher.js')
    const d = await dragprov(DragController, 'ny drag')
    ok('DragController: finger 2 drar INTE', !d.foljerF2)
    ok('DragController: finger 2:s släpp avslutar INTE greppet', d.aktivEfterF2Upp)
    ok('DragController: finger 1 följs', d.foljerF1)
    ok('DragController: finger 1:s släpp avslutar', d.aktivEfterF1Upp)
    const a = await aimprov(AimLauncher, 'ny aim')
    ok('AimLauncher: finger 2 siktar INTE', !a.siktadeAvF2)
    ok('AimLauncher: finger 2:s släpp skjuter INTE', !a.skottAvF2 && a.aimingEfter)
    ok('AimLauncher: finger 1 skjuter', a.skjutAvF1)

    // Skyddsnätet (kortar 2 s genom att backdatera stillhetsklockan — själva tröskeln är 2000 ms).
    const dc = new DragController({ space: rum(), services: null })
    const v = vy(100, 100)
    dc.addItem(v, { id: 'a' })
    let slapp = 0
    dc.items[0].hooks.onMiss = () => slapp++
    v.emit('pointerdown', ev('pointerdown', 1, 100, 100))
    v.emit('pointerdown', ev('pointerdown', 2, 100, 100))
    ok('DragController: färskt grepp, nytt tryck ignoreras', dc.items[0]._pid === 1)
    dc.items[0]._senastRort -= 2500
    v.emit('pointerdown', ev('pointerdown', 2, 100, 100))
    ok('DragController: grepp stilla > 2 s, nytt tryck tar över (gamla släpptes)', dc.items[0]._pid === 2 && dc.active === dc.items[0])
    v.emit('pointerup', ev('pointerup', 1, 100, 100))
    ok('DragController: gamla fingrets sena släpp rör inte det nya', dc.active === dc.items[0])
    v.emit('pointerup', ev('pointerup', 2, 100, 100))
    ok('DragController: nya fingrets släpp avslutar', dc.active === null)
    dc.destroy()

    const t = vy(300, 300)
    let sk = 0
    const l = new AimLauncher({ target: t, root: Object.assign(rum(), { addChild() {} }), hitRadius: 0, defaultAim: { x: 900, y: 300 }, onLaunch: () => sk++ })
    t.emit('pointerdown', ev('pointerdown', 1, 300, 300))
    t.emit('pointerdown', ev('pointerdown', 2, 300, 300))
    ok('AimLauncher: färskt grepp, nytt tryck ignoreras', l._pid === 1)
    l._senastRort -= 2500
    t.emit('pointerdown', ev('pointerdown', 2, 300, 300))
    ok('AimLauncher: grepp stilla > 2 s, nytt tryck tar över utan skott', l._pid === 2 && l._aiming && sk === 0)
    ok('AimLauncher: inga dubbla lyssnare efter övertagandet', t.listenerCount('pointerup') === 1 && t.listenerCount('globalpointermove') === 1)
    l.destroy()
  }
} finally {
  for (const f of temp) fs.rmSync(f, { force: true })
}
console.log(fel ? `\n${fel} FEL` : '\nalla prov gröna')
process.exit(fel ? 1 : process.exitCode || 0)
