// FÄLLVAKTER (FYSIKPLAN R1) — flaggar `_diagSample` `statisk-fart` och `snurr` när de ska, och tiger när de ska?
//
//   node scripts/_fallvaktprobe.mjs [--json]
//
// gamelog är DEV-only (`import.meta.env.DEV`), alltså tyst i rå Node. Därför laddar bänken
// libbet genom Vites `ssrLoadModule` (mode development) — då är DEV sann och den RIKTIGA
// `PhysicsWorld._diagSample` kör, och facit läses ur gamelogens egna `flag`-räknare
// (`api.summary().fynd`), inte ur en kopia av tröskeln.
//
// KONTROLLARMAR (måste ge det KÄNDA svaret innan någon mätrad räknas):
//   S  Fjaderbrada.driv som DRAG + paus      MÅSTE flagga `statisk-fart`
//   S0 Fjaderbrada.flytta (samma drag)       får INTE flagga
//   S1 kinematisk kropp i rörelse (driv varje steg, 3 px/steg)  får INTE flagga (flyttar sig)
//   R  Constraint-grepp vid r²·m/I = 3       MÅSTE flagga `snurr`
//   R0 rullande klot, 20 px/steg, radie 30   får INTE flagga (ω ≈ 0,67)
// MÄTARMAR: Constraint-greppets toppvinkelfart vid r²·m/I 0,5 / 1 / 3 (var tröskeln ligger),
//   och att samma kropp bara flaggas EN gång (dedup) — `n` i fyndet.
import { createServer } from 'vite'
import Matter from 'matter-js'

const JSON_UT = process.argv.includes('--json')
const ut = (...a) => { if (!JSON_UT) console.log(...a) }
const FIXED = 1000 / 60
const { Bodies, Body, Constraint, Composite } = Matter

const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent', optimizeDeps: { noDiscovery: true } })
let fel = 0
const rader = []
try {
  const { PhysicsWorld } = await vite.ssrLoadModule('/src/lib/physics.js')
  const { Fjaderbrada } = await vite.ssrLoadModule('/src/lib/fjader.js')
  const gl = await vite.ssrLoadModule('/src/lib/gamelog.js')
  if (!gl.ON) throw new Error('gamelog.ON är falsk — bänken mäter då ingenting')
  const fynd = () => Object.fromEntries(gl.default.summary().fynd.map((f) => [f.kod, f]))

  // Kör en scen: `fas(steg, w)` anropas före varje fysiksteg; `n` steg; _diagSample går av sig
  // själv var 30:e bildruta (update() → DIAG). Fynden nollställs inte mellan scener, så varje scen
  // får en egen etikett och läses ut på etiketten.
  const kor = (namn, bygg, n) => {
    const w = new PhysicsWorld({ gravityY: 1, walls: ['floor'] })
    const sc = bygg(w)
    let toppW = 0
    for (let i = 0; i < n; i++) {
      sc.fas?.(i, w)
      w.update(FIXED)
      for (const b of Composite.allBodies(w.world)) if (!b.isStatic) toppW = Math.max(toppW, Math.abs(b.angularVelocity))
    }
    const f = fynd()
    const traff = (kod) => (f[kod]?.exempel ?? []).filter((e) => e.label === namn)
    const res = { namn, statisk: traff('statisk-fart'), snurr: traff('snurr'), toppW: Number(toppW.toFixed(3)), w }
    return res
  }
  const kontroll = (rad, villkor, detalj = '') => {
    ut(`  ${villkor ? '✓' : '✗'} KONTROLL ${rad}${detalj ? ' · ' + detalj : ''}`)
    if (!villkor) fel++
    return villkor
  }

  // ---- S: driv som drag + paus (drag 230 px i ETT steg, sedan ingen mer driv) ----
  const dragScen = (namn, metod) => (w) => {
    const brada = new Fjaderbrada({ bredd: 140, hojd: 32 })
    const kropp = Bodies.rectangle(400, 300, 140, 32, { isStatic: true, label: namn })
    Composite.add(w.world, kropp)
    return {
      fas(i) {
        if (i === 10) brada[metod](kropp, 400, 70) // 230 px dragning
        // efter steg 10: paus — spelet slutar kalla driv/flytta
      },
    }
  }
  ut('FÄLLVAKTER — statisk-fart / snurr i PhysicsWorld._diagSample')
  const S = kor('S-driv-drag', dragScen('S-driv-drag', 'driv'), 200)
  const S0 = kor('S0-flytta', dragScen('S0-flytta', 'flytta'), 200)
  // kinematisk: driv varje steg, 3 px/steg i x
  const S1 = kor('S1-kinematisk', (w) => {
    const brada = new Fjaderbrada({ bredd: 140, hojd: 32 })
    const kropp = Bodies.rectangle(100, 300, 140, 32, { isStatic: true, label: 'S1-kinematisk' })
    Composite.add(w.world, kropp)
    return { fas: (i) => brada.driv(kropp, 100 + i * 3, 300) }
  }, 300)

  // ---- R: Constraint-grepp, r²·m/I = k i en kropp med fast tröghet ----
  const grepp = (namn, k, styv) => kor(namn, (w) => {
    const kropp = Bodies.rectangle(600, 300, 120, 40, { label: namn, frictionAir: 0, collisionFilter: { mask: 0 } })
    const r = Math.sqrt(k * kropp.inertia / kropp.mass)
    Composite.add(w.world, kropp)
    const hand = { x: 600 + r, y: 300 }
    const c = Constraint.create({ pointA: { ...hand }, bodyB: kropp, pointB: { x: r, y: 0 }, stiffness: styv, length: 0, damping: 0 })
    Composite.add(w.world, c)
    return {
      r,
      fas(i) {
        // handen rycker 30 px upp/ned varannan 20:e steg — ett drag med ryck
        const fas = Math.floor(i / 20) % 2
        c.pointA.y = 300 + (fas ? 30 : -30)
        c.pointA.x = 600 + r
      },
    }
  }, 400)
  const R3 = grepp('R3-grepp-k3', 3, 1)
  const R05 = grepp('R05-grepp-k0.5', 0.5, 1)
  const R1 = grepp('R1-grepp-k1', 1, 1)

  // ---- R0: rullande klot 20 px/steg, radie 30 ----
  const R0 = kor('R0-rullande-klot', (w) => {
    const kl = Bodies.circle(40, 685, 30, { label: 'R0-rullande-klot', friction: 1, frictionStatic: 1, frictionAir: 0, restitution: 0 })
    // golvet ligger på y=720 (wallThickness 120) — klotet vilar på det
    Composite.add(w.world, kl)
    Body.setVelocity(kl, { x: 20, y: 0 })
    Body.setAngularVelocity(kl, 20 / 30)
    return { fas: () => { Body.setVelocity(kl, { x: 20, y: kl.velocity.y }); if (kl.position.x > 1100) Body.setPosition(kl, { x: 40, y: kl.position.y }) } }
  }, 400)

  const fmt = (r) => `statisk×${r.statisk.length} snurr×${r.snurr.length} toppω=${r.toppW}`
  ut('  ' + fmt(S) + '   S  driv-drag+paus')
  ut('  ' + fmt(S0) + '   S0 flytta')
  ut('  ' + fmt(S1) + '   S1 kinematisk i rörelse')
  ut('  ' + fmt(R3) + `   R  grepp r²m/I=3`)
  ut('  ' + fmt(R1) + '   R  grepp r²m/I=1')
  ut('  ' + fmt(R05) + '   R  grepp r²m/I=0,5')
  ut('  ' + fmt(R0) + '   R0 rullande klot')

  kontroll('S: driv som drag + paus flaggar statisk-fart', S.statisk.length >= 1, JSON.stringify(S.statisk[0] ?? {}))
  kontroll('S: ...EN gång (dedup per kropp)', S.statisk.length === 1)
  kontroll('S0: flytta flaggar inte', S0.statisk.length === 0)
  kontroll('S1: kinematisk i rörelse flaggar inte', S1.statisk.length === 0)
  kontroll('R: grepp r²m/I=3 flaggar snurr', R3.snurr.length >= 1, JSON.stringify(R3.snurr[0] ?? {}))
  kontroll('R0: rullande klot (ω≈0,67) flaggar inte', R0.snurr.length === 0 && R0.toppW < 1.5, `toppω ${R0.toppW}`)
  kontroll('inga andra kroppar flaggades (väggar m.fl.)', Object.values(fynd()).filter((f) => f.kod === 'statisk-fart' || f.kod === 'snurr').every((f) => f.exempel.every((e) => /^(S-driv|R3-)/.test(e.label))), Object.values(fynd()).map((f) => f.kod + '×' + f.n).join(' '))
  kontroll('R0: klotet RULLAR (kontroll av scenen)', R0.toppW > 0.5, `toppω ${R0.toppW}`)
  rader.push({ S: S.statisk.length, S0: S0.statisk.length, S1: S1.statisk.length, R3: [R3.toppW, R3.snurr.length], R1: [R1.toppW, R1.snurr.length], R05: [R05.toppW, R05.snurr.length], R0: [R0.toppW, R0.snurr.length] })
} finally {
  await vite.close()
}
if (JSON_UT) console.log(JSON.stringify({ fel, rader }))
else console.log(fel ? `\n${fel} kontroll(er) föll` : '\nalla kontroller höll')
process.exit(fel ? 1 : 0)
