// FYSIKDEBUG-sond (FYSIKPLAN F9) — Node, ingen webbläsare:   node scripts/_fysikdebugprobe.mjs
//
// Prövar src/lib/fysikdebug.js mot en riktig PhysicsWorld och riktiga Pixi-containrar.
// KONTROLLARMARNA kommer först och måste hålla innan mätarmen läses:
//   K1  inga världar → inget ritat, ingen Graphics på lagret, alla räknare 0
//   K2  konturer === kroppar (räknade oberoende av varandra) i en värld med 3 väggar + 8 kroppar
//   K3  identitetsrum: ritade hörn == kroppens egna hörn
// MÄTARMEN:
//   M1  kamera/letterbox: ritade hörn == world.toLocal(cam.toGlobal(hörn)) i en förskjuten+skalad
//       container (cam.x −200, skala 1,5, föräldern skalad 0,8) — ritas i RUMMET kroppen lever i
//   M2  statisk-fart: setPosition(…, true) + paus → 1 markering; utan updateVelocity → 0;
//       kinematisk kropp som flyttas varje steg → 0   (kontrollarmar för R1-markeringen)
//   M3  leder/kontakter/sensorer/hitArea räknas; destroy() → inget kvar; detach() återställer prototypen
//
// Node har ingen import.meta.env → modulen släpps in med `attach(svc, { test: true })`.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { PhysicsWorld, Matter } from '../src/lib/physics.js'
import * as dbg from '../src/lib/fysikdebug.js'

const { Body, Bodies, Constraint, Composite } = Matter
let fel = 0
const ok = (c, msg) => {
  console.log((c ? 'OK   ' : 'FEL  ') + msg)
  if (!c) fel++
}
const nar = (a, b, e = 1e-6) => Math.abs(a - b) <= e

globalThis.window ??= globalThis

const world = new Container()
world.scale.set(0.8)
world.position.set(100, 50)
const svc = { world, app: { ticker: { add() {}, remove() {} } } }
const proto0 = { bygg: PhysicsWorld.prototype._buildWalls, destroy: PhysicsWorld.prototype.destroy }
dbg.attach(svc, { test: true })
ok(PhysicsWorld.prototype._buildWalls !== proto0.bygg, 'attach lappar PhysicsWorld.prototype utifrån')
const S = dbg.stat

// polygonpunkter ur lagrets Graphics (stroke-instruktioner)
function polyn(g) {
  const ut = []
  for (const ins of g.context.instructions) {
    if (ins.action !== 'stroke') continue
    for (const p of ins.data.path.instructions) if (p.action === 'poly') ut.push(Array.from(p.data[0]))
  }
  return ut
}
const lager = () => world.children.find((c) => c.label === 'fysikdebug')

// ---- K1 -----------------------------------------------------------------
dbg._ruta()
ok(S.konturer === 0 && S.kroppar === 0 && S.varldar === 0 && !S.aktiv, 'K1 inga världar: alla räknare 0')
ok(!lager() && world.children.length === 0, 'K1 inget Graphics på lagret när inga världar lever')

// ---- K2 -----------------------------------------------------------------
const cam = new Container()
world.addChild(cam)
const w = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
const vyer = []
function lank(b) {
  const v = new Graphics()
  cam.addChild(v)
  w.link(b, v)
  vyer.push(v)
  return b
}
lank(w.circle(300, 100, 30, { label: 'c1' }))
const c2 = lank(w.circle(380, 100, 30, { label: 'c2' }))
const c1 = w.world.bodies.find((b) => b.label === 'c1')
lank(w.rectangle(600, 300, 120, 40, { label: 'r1' }))
lank(w.polygon(800, 100, 5, 30, { label: 'p1' }))
const sens = w.rectangle(500, 400, 80, 80, { isStatic: true, label: 'sensor' })
sens.isSensor = true
w.rectangle(900, 500, 200, 20, { isStatic: true, label: 'ramp' })
const delar = Body.create({ parts: [Bodies.rectangle(1000, 100, 60, 20), Bodies.rectangle(1000, 120, 20, 60)], label: 'sammansatt' })
w.add(delar)
const sov = lank(w.circle(150, 600, 20, { label: 'sover' }))
w.add(Constraint.create({ bodyA: c1, bodyB: c2, length: 90, stiffness: 0.5, pointA: { x: 10, y: 0 } }))
for (let i = 0; i < 90; i++) w.update(1000 / 60)
dbg._ruta()
const antal = Composite.allBodies(w.world).length
ok(antal === 3 + 8, `K2 motorn har ${antal} kroppar (3 väggar + 8)`)
ok(S.kroppar === antal, `K2 kroppar (${S.kroppar}) == Composite.allBodies (${antal})`)
ok(S.konturer === S.kroppar, `K2 konturer (${S.konturer}) === kroppar (${S.kroppar})`)
{
  const pp = polyn(lager())
  const unika = new Set(pp.map((p) => p.slice(0, 2).join(',')))
  ok(pp.length >= 12 && unika.size >= 10, `K2 polygonerna är egna listor, inte en delad (${pp.length} polygoner, ${unika.size} olika startpunkter)`)
}
ok(S.leder === 1, `M3 leder = ${S.leder} (väntat 1)`)
ok(S.kontakter > 0, `M3 kontaktpunkter = ${S.kontakter} (> 0: cirklarna vilar på golvet)`)
ok(S.sensorer === 1, `M3 sensorer = ${S.sensorer} (väntat 1)`)
ok(S.statiskFart === 0, `M2 ingen statisk-fart i en orörd värld (${S.statiskFart})`)
ok(lager() && world.children[world.children.length - 1] === lager(), 'lagret ligger överst på world')

// ---- hitArea -----------------------------------------------------------
const knapp = new Container()
knapp.eventMode = 'static'
knapp.hitArea = new Rectangle(-50, -50, 100, 100)
knapp.position.set(640, 360)
world.addChild(knapp)
const dold = new Container()
dold.eventMode = 'static'
dold.hitArea = new Rectangle(0, 0, 10, 10)
dold.visible = false
world.addChild(dold)
const passiv = new Container()
passiv.hitArea = new Rectangle(0, 0, 10, 10) // eventMode passive → ingen träffyta
world.addChild(passiv)
dbg._ruta()
ok(S.hitareor === 1, `M3 hitArea: ${S.hitareor} ritad (väntat 1: synlig + static; dold och passiv ska inte)`)
world.removeChild(knapp, dold, passiv)

// ---- M2: statisk-fart --------------------------------------------------
const planka = w.rectangle(700, 250, 100, 10, { isStatic: true, label: 'planka' })
const stilla = w.rectangle(300, 250, 100, 10, { isStatic: true, label: 'stilla' })
const kin = w.rectangle(100, 250, 100, 10, { isStatic: true, label: 'kinematisk' })
Body.setPosition(planka, { x: 930, y: 250 }, true) // 230 px med updateVelocity → fart kvar
Body.setPosition(stilla, { x: 330, y: 250 }, false) // utan → ingen fart (kontrollarm)
let kx = 100
for (let i = 0; i < 12; i++) {
  kx += 3
  Body.setPosition(kin, { x: kx, y: 250 }, true) // flyttas varje steg → äkta fart
  w.update(1000 / 60)
  dbg._ruta()
}
ok(Math.hypot(planka.velocity.x, planka.velocity.y) > 0.5, `M2 förutsättning: plankan bär kvarliggande fart (${planka.velocity.x.toFixed(1)}, ${planka.velocity.y.toFixed(1)})`)
ok(Math.hypot(stilla.velocity.x, stilla.velocity.y) < 0.5, 'M2 kontroll: setPosition utan updateVelocity → ingen fart')
ok(S.statiskFart === 1, `M2 statisk-fart = ${S.statiskFart} (väntat 1: bara plankan; kinematisk i rörelse och stilla-utan-fart ska inte)`)
Body.setPosition(planka, { x: 930, y: 250 }, false)
Body.setVelocity(planka, { x: 0, y: 0 })
for (let i = 0; i < 3; i++) {
  w.update(1000 / 60)
  dbg._ruta()
}
ok(S.statiskFart === 0, `M2 nollad fart → markeringen försvinner (${S.statiskFart})`)

// ---- städning ----------------------------------------------------------
w.destroy()
dbg._ruta()
ok(S.konturer === 0 && S.kroppar === 0 && !S.aktiv, 'M3 destroy(): räknarna 0')
ok(!lager(), 'M3 destroy(): Graphics förstörd och borttagen från lagret')

// ---- K3 + M1: rummet ---------------------------------------------------
async function rum(namn, camX, camY, camS, vantat) {
  cam.position.set(camX, camY)
  cam.scale.set(camS)
  const v = new PhysicsWorld({ walls: [] })
  const b = v.rectangle(300, 200, 100, 60, { label: 'enda' })
  const vy = new Graphics()
  cam.addChild(vy)
  v.link(b, vy)
  dbg._ruta()
  const g = lager()
  const p = polyn(g)
  ok(S.kroppar === 1 && S.konturer === 1, `${namn}: 1 kropp, 1 kontur (${S.kroppar}/${S.konturer})`)
  let max = 0
  const hornKropp = b.vertices
  // en kropp → en poly; jämför hörn för hörn mot Pixis egen toGlobal/toLocal
  const pk = p[0]
  for (let i = 0; i < hornKropp.length; i++) {
    const glob = cam.toGlobal({ x: hornKropp[i].x, y: hornKropp[i].y })
    const lok = world.toLocal(glob)
    max = Math.max(max, Math.abs(pk[i * 2] - lok.x), Math.abs(pk[i * 2 + 1] - lok.y))
    if (vantat) {
      max = Math.max(max, Math.abs(pk[i * 2] - vantat(hornKropp[i].x)), Math.abs(pk[i * 2 + 1] - vantat(hornKropp[i].y, true)))
    }
  }
  ok(max < 1e-6, `${namn}: ritade hörn == toGlobal/toLocal(hörn) (max avvikelse ${max.toExponential(1)})`)
  v.destroy()
  dbg._ruta()
  cam.removeChild(vy)
}
await rum('K3 identitetsrum', 0, 0, 1, (x) => x)
await rum('M1 kamera −200,30 ×1,5', -200, 30, 1.5, (x, y) => (y ? 30 + 1.5 * x : -200 + 1.5 * x))

// ---- detach ------------------------------------------------------------
dbg.detach()
ok(PhysicsWorld.prototype._buildWalls === proto0.bygg && PhysicsWorld.prototype.destroy === proto0.destroy, 'detach återställer prototypen exakt')
ok(world.children.filter((c) => c.label === 'fysikdebug').length === 0, 'detach lämnar inget på lagret')

console.log(fel ? `\n${fel} FEL` : '\nalla kontroller och mätningar OK')
process.exit(fel ? 1 : 0)
