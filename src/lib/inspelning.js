// Inspelning per fysiksteg + uppspelning i slow-motion (FYSIKPLAN F8).
//
// Ett FRISTÅENDE verktyg ovanpå `PhysicsWorld` — physics.js är orörd; kroken är `phys.beforeStep`.
// En repris behöver ingen omsimulering, bara lägena: `{ x, y, vinkel }` per fast fysiksteg i en
// RINGBUFFERT (Float64Array — exakt, inte Float32, annars är "0,0 px avvikelse" en lögn). Minnet är
// fast: 3 · 8 · max byte (max 900 = 21 KB), aldrig mer, hur länge spelet än pågår.
//
//   import { spelaIn } from '../../lib/inspelning.js'
//
//   const rec = spelaIn(this._phys, this._ballBody, { max: 900 })   // börjar INTE spela in än
//   rec.start()    // SLÄPP:   rensar bufferten och börjar skriva ett läge per steg
//   rec.stopp()    // miss / mål: sluta skriva (bufferten ligger kvar att spela upp)
//   rec.fanga()    // skriv NU-läget som sista post (beforeStep ligger ett steg efter spelets egen koll)
//   const rep = rec.spelaUpp(ball.view, { fart: 0.4, sista: 60, spar: true, onKlar })
//   ...i spelets update, EFTER phys.update (länken skriver view varje bildruta):  rep.tick(ticker.deltaMS)
//   rep.hoppa()    // ett tryck: hoppa över — avslutar direkt och kallar onKlar
//   rep.ta()       // riv utan onKlar (rundbyte, destroy) — idempotent
//   rec.ta()       // lossa kroken + riv pågående uppspelningar
//
// UPPSPELNINGEN snapshotar fönstret (`sista` steg ur slutet) när den startar, så den är oberoende
// av vad bufferten gör under tiden, och på ett HELT steg ger den exakt det inspelade läget
// (lerp med t = 0 returnerar a, inte a + ε). Mellan stegen interpoleras linjärt — det är det som
// gör 0,4× mjukt i stället för hackigt. `fart` = fysiksteg per verkligt steg (1 = realtid).
//
// SPÅRET (`spar: true | { farg, bredd, alpha, segment }`) är en mjuk avtagande linje bakom kulan,
// ritad i en EGEN Graphics som läggs som syskon strax BAKOM `vy` (vy.parent krävs). Den rivs vid
// slut, `hoppa()`, `ta()` och om `vy` dör. Ingen gsap-tween: allt drivs av `tick`, så det finns
// inget som kan leva kvar efter en rivning. `lage: false` rör bara `rotation` (t.ex. en propeller
// som ska gå i takt med kulans repris — två spelaIn på samma värld skriver samma steg).
//
// Valfritt: `ticker` i spelaUpp → uppspelningen hakar själv på `ticker.add` (annars: kalla tick).
import { Graphics } from 'pixi.js'

const STEG_MS = 1000 / 60

export function spelaIn(phys, kropp, { max = 900 } = {}) {
  max = Math.max(2, Math.min(5000, max | 0))
  const buf = new Float64Array(max * 3)
  let n = 0 // antal giltiga poster (≤ max)
  let h = 0 // nästa skrivplats
  let pa = false
  let dod = false
  const upp = new Set()

  const skriv = () => {
    const p = kropp.position
    const x = p.x, y = p.y, a = kropp.angle
    if (!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(a))) return // NaN-kropp: hoppa, förgifta inte bufferten
    const o = h * 3
    buf[o] = x
    buf[o + 1] = y
    buf[o + 2] = a
    h = (h + 1) % max
    if (n < max) n++
  }
  const unbind = phys.beforeStep(() => {
    if (pa && !dod) skriv()
  })

  // i = 0 äldsta … n−1 nyaste
  const post = (i) => {
    const o = ((h - n + i + max * 2) % max) * 3
    return { x: buf[o], y: buf[o + 1], vinkel: buf[o + 2] }
  }

  const rec = {
    get langd() { return n },
    get max() { return max },
    get spelar() { return pa },
    get minnesbyte() { return buf.byteLength },
    steg: post,
    start() { n = 0; h = 0; pa = true },
    stopp() { pa = false },
    rensa() { n = 0; h = 0 },
    fanga() { if (!dod) skriv() },

    spelaUpp(vy, { fart = 0.4, sista = n, spar = false, lage = true, ticker = null, onKlar = null } = {}) {
      const L = Math.max(0, Math.min(n, sista | 0))
      if (dod || !vy || L < 2) return null
      // Snapshot av fönstret: oberoende av bufferten från och med nu.
      const x = new Float64Array(L), y = new Float64Array(L), a = new Float64Array(L)
      for (let i = 0; i < L; i++) {
        const p = post(n - L + i)
        x[i] = p.x; y[i] = p.y; a[i] = p.vinkel
      }
      const so = spar ? (spar === true ? {} : spar) : null
      const farg = so?.farg ?? 0xffffff
      const bredd = so?.bredd ?? 14
      const alfa = so?.alpha ?? 0.6
      const segment = Math.max(2, so?.segment ?? 20)
      let g = null
      if (so && vy.parent && !vy.destroyed) {
        g = new Graphics()
        g.eventMode = 'none'
        vy.parent.addChildAt(g, vy.parent.getChildIndex(vy)) // strax bakom kulan
      }

      let f = 0 // flytande index i fönstret
      let klar = false
      let ticktid = 0
      const s = { x: x[0], y: y[0], vinkel: a[0] }
      const lasPos = (fi) => {
        const i0 = Math.min(L - 1, Math.floor(fi))
        const i1 = Math.min(L - 1, i0 + 1)
        const t = fi - i0
        s.x = t === 0 ? x[i0] : x[i0] + (x[i1] - x[i0]) * t
        s.y = t === 0 ? y[i0] : y[i0] + (y[i1] - y[i0]) * t
        s.vinkel = t === 0 ? a[i0] : a[i0] + (a[i1] - a[i0]) * t
      }
      const ritaSpar = () => {
        if (!g || g.destroyed) return
        g.clear()
        if (f < 1) return
        // Avtagande linje: ≤ `segment` bitar från fönstrets start fram till kulan, alfa/bredd växer mot kulan.
        const sl = Math.min(f, L - 1)
        const m = Math.min(segment, Math.ceil(sl))
        let px = x[0], py = y[0]
        for (let k = 1; k <= m; k++) {
          const fi = (sl * k) / m
          const i0 = Math.min(L - 1, Math.floor(fi))
          const i1 = Math.min(L - 1, i0 + 1)
          const t = fi - i0
          const qx = x[i0] + (x[i1] - x[i0]) * t
          const qy = y[i0] + (y[i1] - y[i0]) * t
          const q = k / m
          g.moveTo(px, py).lineTo(qx, qy).stroke({ width: 3 + q * bredd, color: farg, alpha: alfa * q * q, cap: 'round' })
          px = qx; py = qy
        }
      }
      const satt = () => {
        if (vy.destroyed) return
        if (lage) { vy.x = s.x; vy.y = s.y }
        vy.rotation = s.vinkel
      }
      const stada = () => {
        klar = true
        if (ticker && fn) ticker.remove(fn)
        upp.delete(rep)
        if (g && !g.destroyed) g.destroy()
        g = null
      }
      const rep = {
        get klar() { return klar },
        get index() { return f },
        get langd() { return L },
        get lage() { return s },
        // Pekarens läge vid HELT steg i — för sonder som jämför mot bufferten.
        las(i) { return { x: x[i], y: y[i], vinkel: a[i] } },
        get tid() { return ticktid },
        tick(deltaMS) {
          if (klar) return false
          if (vy.destroyed) { stada(); return false } // vy dog (exit): riv tyst, ingen onKlar mot död nod
          ticktid += deltaMS
          f += (Math.min(deltaMS, 100) / STEG_MS) * fart
          // Flyttalsdrift (5 · 0,4 = 2,0000000000000004) snäpps till heltal: på ett helt steg ska läget vara EXAKT det inspelade.
          if (Math.abs(f - Math.round(f)) < 1e-9) f = Math.round(f)
          if (f >= L - 1) { rep.hoppa(); return false }
          lasPos(f)
          satt()
          ritaSpar()
          return true
        },
        // Hoppa till slutläget och avsluta (kallar onKlar). Idempotent.
        hoppa() {
          if (klar) return
          f = L - 1
          lasPos(f)
          satt()
          stada()
          onKlar?.()
        },
        // Riv utan onKlar. Idempotent.
        ta() { if (!klar) stada() },
      }
      let fn = null
      if (ticker) ticker.add(fn = (t) => rep.tick(t.deltaMS))
      upp.add(rep)
      lasPos(0)
      satt()
      return rep
    },

    ta() {
      if (dod) return
      dod = true
      pa = false
      unbind?.()
      for (const r of [...upp]) r.ta()
      upp.clear()
      n = 0
    },
  }
  return rec
}
