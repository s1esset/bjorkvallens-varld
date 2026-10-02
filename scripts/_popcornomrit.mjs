// POPCORNKALASET B0 — vad kostar det att rita om N mjuka popcorn varje bildruta?
//
//   node scripts/_popcornomrit.mjs              (kräver dev-servern på :5173)
//
// En mjuk kropp (`Mjukkropp.path()`) ritas om VARJE bildruta under poppen, ~41 steg. Pixi v8
// triangulerar en Graphics först när den RENDERAS, så en tidtagning runt spelets `_update`
// ensam hade missat halva kostnaden. Sonden stämplar därför hela bildrutans arbete: en
// ticker-lyssnare med högsta prioritet (före spelet) och en med lägsta (efter Pixis render).
//
// Kontrollarmarna först (CLAUDE.md: "en mätning som inte kan skilja två KÄNDA lägen åt säger
// ingenting"): N = 0 är golvet, och en BARLAST som bränner känd tid i bildrutan måste flytta
// talet med ungefär sin egen storlek — annars mäter sonden något annat än bildrutans arbete.
// Bildruteintervallet (rAF) rapporteras inte: det klipps av vsync och kan inte skilja lägen åt.
//
// O1 (FYSIKPLAN): `--o1` byter ut spelets egen pop mot en BÄNK i samma sida — N syntetiska
// mjuka kroppar (samma Mjukkropp-parametrar som poppen, samma tillväxtkurva, steg(1) per
// bildruta) ritade antingen med `path()` (arm `path` = ritaPopcornMjuk, exakt spelets rit)
// eller med `mjukMesh` (arm `mesh`). Armarna turas om (aldrig samtidigt) och delar kroppsteget,
// så skillnaden är bara ritningen. Tre mått per arm: `ram` = hela bildrutans arbete (stämpel
// före allt → efter Pixis render, CPU-tid på huvudtråden inkl. barlasten), `egen` = kroppsteg +
// ritning i bänkens egen ticker, `rit` = bara ritningen (clear+path+fill / uppdatera). GPU-tid
// mäts INTE, och rAF-intervallet rapporteras inte (klipps av vsync). Sist en FORM-kontroll:
// samma deformerade kropp ritad båda sätten, pixeldiff + ringens avvikelse från path().
//
//   node scripts/_popcornomrit.mjs --o1 --url http://localhost:5174
import { chromium } from 'playwright'

const flagga = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const SIDA = flagga('--url', 'http://localhost:5173')
const O1 = process.argv.includes('--o1')
const SPEL_AB = process.argv.includes('--spel-ab')
const N_LISTA = [0, 4, 8, 16, 24]
const VARV = Number(flagga('--varv', O1 ? 5 : 3))
const CPU = Number(flagga('--cpu', 4))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let fel = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto(SIDA, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1200)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  // Stämplarna: före allt och efter Pixis render.
  await page.evaluate(() => {
    const t = window.__barnspel.ctx.ticker
    const m = (window.__omrit = { start: 0, ms: [], barlast: 0, pa: false })
    m.fore = () => { m.start = performance.now(); if (m.barlast) { const s = performance.now(); while (performance.now() - s < m.barlast) { /* bränn */ } } }
    m.efter = () => { if (m.pa) m.ms.push(performance.now() - m.start) }
    t.add(m.fore, null, 1000)
    t.add(m.efter, null, -1000)
  })

  // ---- O1 i SPELET: samma pop, ritad som mesh (spelets nya väg) mot Graphics + path() (HEAD-vägen) ----
  // Armen 'gfx' byter ut varje poppande kropps mesh mot en Graphics som ritas av ritaPopcornMjuk —
  // exakt det HEAD gjorde — direkt efter poppa(), före första bildrutan. Allt annat (fysik, uppvärmning,
  // ljud, puffar) är identiskt, så skillnaden är bara ritningen. Färsk sida per körning (potten töms).
  async function korSpelAB() {
    const en = async (arm, n, barlast) => {
      await page.goto(SIDA, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
      await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
      await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
      await page.waitForTimeout(1200)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
      await page.evaluate(() => {
        const t = window.__barnspel.ctx.ticker
        const m = (window.__omrit = { start: 0, ms: [], barlast: 0, pa: false })
        t.add(() => { m.start = performance.now(); if (m.barlast) { const s = performance.now(); while (performance.now() - s < m.barlast) { /* bränn */ } } }, null, 1000)
        t.add(() => { if (m.pa) m.ms.push(performance.now() - m.start) }, null, -1000)
      })
      return page.evaluate(async ({ arm, n, barlast }) => {
        const [pixiUrl] = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => /pixi__js|pixi.js/.test(u) && !/.map/.test(u))
        const [pixi, konst] = await Promise.all([import(pixiUrl), import('/src/games/popcornkalaset/konst.js')])
        const g = window.__barnspel.game
        const om = window.__omrit
        if (g._korn.length < n + 2) g._fyllPase()
        await new Promise((r) => setTimeout(r, 200))
        om.barlast = barlast
        om.ms = []
        om.pa = true
        window.__popcorn.poppa(n)
        if (arm === 'gfx') {
          for (const p of g._pop) {
            if (!p.mm) continue
            p.mm.destroy()
            const gr = new pixi.Graphics()
            g._innehall.addChild(gr)
            let b = 0
            p.mm = { view: gr, satt: (x) => { b = x }, uppdatera: () => konst.ritaPopcornMjuk(gr, p.mjuk, b), destroy: () => { if (!gr.destroyed) gr.destroy() } }
          }
        }
        await new Promise((r) => setTimeout(r, 600))
        om.pa = false
        om.barlast = 0
        const s = om.ms.slice().sort((a, b) => a - b)
        return { med: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)], rutor: s.length, mjuka: g._pop.filter((p) => p.mjuk).length }
      }, { arm, n, barlast })
    }
    const med = (a, k) => a.map((r) => r[k]).sort((x, y) => x - y)[Math.floor(a.length / 2)]
    console.log(`
O1 i SPELET — poppa(N) ritad som mjukMesh mot Graphics+path() (HEAD), CPU ×${CPU}, median av ${VARV} varv, armarna turas om
`)
    const kontroll = { gfx: [], mesh: [] }
    for (let i = 0; i < VARV; i++) for (const arm of ['gfx', 'mesh']) kontroll[arm].push(await en(arm, 0, 0))
    const kb = { gfx: [], mesh: [] }
    for (let i = 0; i < VARV; i++) for (const arm of ['gfx', 'mesh']) kb[arm].push(await en(arm, 0, 4))
    for (const arm of ['gfx', 'mesh']) {
      const flytt = med(kb[arm], 'med') - med(kontroll[arm], 'med')
      const ok = flytt > 3 && flytt < 6
      console.log(`  kontroll N=0 [${arm}] ${med(kontroll[arm], 'med').toFixed(2)} → ${med(kb[arm], 'med').toFixed(2)} ms med barlast 4 ${ok ? '✓' : '✗'} flyttar ${flytt.toFixed(2)}`)
      if (!ok) fel++
    }
    const bas = { gfx: med(kontroll.gfx, 'med'), mesh: med(kontroll.mesh, 'med') }
    for (const n of [8, 16, 24]) {
      const v = { gfx: [], mesh: [] }
      for (let i = 0; i < VARV; i++) for (const arm of ['gfx', 'mesh']) v[arm].push(await en(arm, n, 0))
      const dg = med(v.gfx, 'med') - bas.gfx
      const dm = med(v.mesh, 'med') - bas.mesh
      console.log(`  N=${String(n).padStart(2)}  gfx: median ${med(v.gfx, 'med').toFixed(2)} (+${dg.toFixed(2)}) p90 ${med(v.gfx, 'p90').toFixed(2)}  ·  mesh: median ${med(v.mesh, 'med').toFixed(2)} (+${dm.toFixed(2)}) p90 ${med(v.mesh, 'p90').toFixed(2)}  ·  kvot ${(dg / dm).toFixed(2)}×  (mjuka ${v.mesh[0].mjuka})`)
    }
    console.log(`  konsolfel: ${errors.length}`)
    if (errors.length) fel++
  }

  // ---- O1: bänken (path mot mjukMesh) -----------------------------------------------------------
  async function korO1() {
    // En bänk-körning: bygg N kroppar, mät ~1 s, riv. Allt i sidan (modulerna hämtas via vite-url:er;
    // pixi.js via resurslistan — en nyimporterad kopia vore en annan modulinstans).
    const bank = (arm, n, barlast) => page.evaluate(async ({ arm, n, barlast }) => {
      const pixiUrl = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /pixi__js|pixi\.js/.test(u) && !/\.map/.test(u))
      const [pixi, kropp, mesh, konst] = await Promise.all([
        import(pixiUrl),
        import('/src/lib/mjukkropp.js'),
        import('/src/lib/mjukmesh.js'),
        import('/src/games/popcornkalaset/konst.js'),
      ])
      const g0 = window.__barnspel.game
      const t = window.__barnspel.ctx.ticker
      const rot = new pixi.Container()
      g0._innehall.addChild(rot)
      const lista = []
      for (let i = 0; i < n; i++) {
        const r = 13 * (0.9 + ((i * 37) % 10) / 50)
        const x = 120 + (i % 8) * 140
        const y = 160 + Math.floor(i / 8) * 150
        const m = new kropp.Mjukkropp({ x, y, w: r * 2, h: r * 1.84, punkter: 16, grav: 0, iter: 6, form: konst.popcornForm(1000 + i * 7919) })
        m.skala(0.35)
        for (let s = 0; s < 30; s++) m.steg(1)
        const post = { m, n: i % 40 }
        if (arm === 'path') { post.g = new pixi.Graphics(); rot.addChild(post.g) }
        else { post.mm = mesh.mjukMesh(m, { farg: 0xfff1c9, kontur: { farg: 0xb88a3a, bredd: 2 }, glans: { alpha: 0.4 } }); rot.addChild(post.mm.mesh) }
        lista.push(post)
      }
      const egen = []
      const rit = []
      const om = window.__omrit
      let pa = false
      const tick = () => {
        const a = performance.now()
        let rm = 0
        for (const p of lista) {
          p.n = (p.n + 1) % 53 // poppen: 11 steg + 30 landning ≈ 41, sedan en paus på stilla
          const k = p.n <= 11 ? 0.35 + 0.8 * (1 - (1 - p.n / 11) ** 3) : 1.15 - 0.15 * Math.min(1, (p.n - 11) / 30)
          p.m.skala(k)
          p.m.steg(1)
          const b = performance.now()
          if (arm === 'path') konst.ritaPopcornMjuk(p.g, p.m, 0)
          else p.mm.uppdatera()
          rm += performance.now() - b
        }
        if (pa) { egen.push(performance.now() - a); rit.push(rm) }
      }
      t.add(tick, null, 0)
      om.barlast = barlast
      om.ms = []
      await new Promise((r) => setTimeout(r, 200))
      om.pa = true
      pa = true
      await new Promise((r) => setTimeout(r, 1000))
      om.pa = false
      pa = false
      om.barlast = 0
      t.remove(tick)
      const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? NaN }
      const ut = { ram: med(om.ms), egen: med(egen), rit: med(rit), rutor: om.ms.length }
      for (const p of lista) { p.mm?.destroy(); if (p.g) { p.g.destroy(); } p.m.destroy() }
      rot.destroy({ children: true })
      return ut
    }, { arm, n, barlast })

    const medianAv = (arr, k) => arr.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(arr.length / 2)]
    const kor = async (n, barlast = 0) => {
      const v = { path: [], mesh: [] }
      for (let i = 0; i < VARV; i++) {
        for (const arm of ['path', 'mesh']) {
          v[arm].push(await bank(arm, n, barlast))
          await page.waitForTimeout(300)
        }
      }
      return Object.fromEntries(Object.entries(v).map(([arm, a]) => [arm, { ram: medianAv(a, 'ram'), egen: medianAv(a, 'egen'), rit: medianAv(a, 'rit'), rutor: medianAv(a, 'rutor') }]))
    }

    console.log(`\nO1 — path() mot mjukMesh, CPU-strypning ×${CPU}, median av ${VARV} varv (armarna turas om)\n`)
    // KONTROLLARMAR: golvet (N=0) och barlasten 4 ms — mätaren måste röra sig innan armarna läses.
    const BARA_FORM = process.argv.includes('--bara-form')
    const bas = BARA_FORM ? null : await kor(0)
    const bar = BARA_FORM ? null : await kor(0, 4)
    for (const arm of BARA_FORM ? [] : ['path', 'mesh']) {
      const flytt = bar[arm].ram - bas[arm].ram
      const ok = flytt > 3 && flytt < 6
      console.log(`  kontroll N=0 [${arm}]  ram ${bas[arm].ram.toFixed(2)} → ${bar[arm].ram.toFixed(2)} ms med barlast 4  ${ok ? '✓' : '✗'} flyttar ${flytt.toFixed(2)} ms (väntat ≈ 3,7)`)
      if (!ok) fel++
    }
    const tab = []
    for (const n of BARA_FORM ? [] : [8, 16, 24]) {
      const r = await kor(n)
      const dp = r.path.ram - bas.path.ram
      const dm = r.mesh.ram - bas.mesh.ram
      tab.push({ n, dp, dm, kvot: dp / dm, r })
      console.log(`  N=${String(n).padStart(2)}  path: ram +${dp.toFixed(2)} ms (rit ${r.path.rit.toFixed(2)}, egen ${r.path.egen.toFixed(2)})  ·  mesh: ram +${dm.toFixed(2)} ms (rit ${r.mesh.rit.toFixed(2)}, egen ${r.mesh.egen.toFixed(2)})  ·  kvot ram ${(dp / dm).toFixed(2)}×  · kvot rit ${(r.path.rit / r.mesh.rit).toFixed(2)}×`)
    }

    // FORM-kontroll: samma kropp, två ritningar, ritad geometri + pixlar.
    const TATHET = Number(flagga('--tathet', 4))
    const form = await page.evaluate(async (tathet) => {
      const pixiUrl = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /pixi__js|pixi\.js/.test(u) && !/\.map/.test(u))
      const [pixi, kropp, mesh, konst] = await Promise.all([
        import(pixiUrl), import('/src/lib/mjukkropp.js'), import('/src/lib/mjukmesh.js'), import('/src/games/popcornkalaset/konst.js'),
      ])
      const out = []
      for (const seed of [1234, 777, 90210]) {
        const m = new kropp.Mjukkropp({ x: 100, y: 100, w: 26, h: 24, punkter: 16, grav: 0, iter: 6, form: konst.popcornForm(seed) })
        m.skala(0.35)
        for (let s = 0; s < 30; s++) m.steg(1) // som _poppprobe: sätt dig på startskalan INNAN du växer
        for (let s = 1; s <= 14; s++) { m.skala(0.35 + 0.8 * (1 - (1 - Math.min(1, s / 11)) ** 3)); m.steg(1) }
        for (let s = 0; s < 3; s++) m.steg(1)
        // 1) RITAD geometri: path() samplad mot ringen (12 steg per kvadratiskt steg).
        const rec = []
        let cur = { x: 0, y: 0 }
        const fake = {
          moveTo(x, y) { cur = { x, y }; rec.push(cur); return this },
          quadraticCurveTo(cx, cy, x, y) { const a = cur; for (let s = 1; s <= 12; s++) { const t = s / 12, u = 1 - t; rec.push({ x: u * u * a.x + 2 * u * t * cx + t * t * x, y: u * u * a.y + 2 * u * t * cy + t * t * y }) } cur = { x, y }; return this },
          closePath() { return this }, fill() { return this }, stroke() { return this }, clear() { return this },
        }
        m.path(fake)
        const mm = mesh.mjukMesh(m, { farg: 0xfff1c9, tathet, kontur: { farg: 0xb88a3a, bredd: 2 }, glans: { alpha: 0.4 } })
        const v = mm.mesh.children[0].vertices
        const ringP = []
        for (let j = 1; j * 2 + 1 < v.length; j++) ringP.push({ x: v[j * 2], y: v[j * 2 + 1] })
        // Avvikelsen MOT RINGENS POLYLINJE: ringpunkterna ligger exakt på kurvan, så det som kan avvika är
        // kordorna mellan dem (sagitta) — mät därför kurvans samplade punkter mot ringens streck.
        let maxAv = 0
        for (const q of rec) {
          let best = Infinity
          for (let j = 0; j < ringP.length; j++) {
            const a = ringP[j], b = ringP[(j + 1) % ringP.length]
            const dx = b.x - a.x, dy = b.y - a.y
            const l2 = dx * dx + dy * dy || 1
            const tt = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2))
            best = Math.min(best, Math.hypot(a.x + dx * tt - q.x, a.y + dy * tt - q.y))
          }
          maxAv = Math.max(maxAv, best)
        }
        // 2) PIXLAR: Graphics (spelets recept) mot meshen, samma ram.
        const A = new pixi.Container()
        const g = new pixi.Graphics()
        m.path(g).fill(0xfff1c9).stroke({ width: 2, color: 0xb88a3a, join: 'round' })
        m.path(g, 0.6).fill({ color: 0xffffff, alpha: 0.4 })
        A.addChild(g)
        const B = new pixi.Container()
        B.addChild(mm.mesh)
        const r = window.__barnspel.app.renderer
        const frame = new pixi.Rectangle(60, 60, 80, 80)
        const pa = r.extract.pixels({ target: A, frame, resolution: 4 })
        const pb = r.extract.pixels({ target: B, frame, resolution: 4 })
        // Ett pixelpar SKILJER bara om ingen granne (±1 px vid 4× = ±0,25 px verkligt) i den andra bilden
        // stämmer — en kant som ligger en kvartspixel fel är inte en annan form.
        let tackt = 0, skild = 0, tackA = 0, tackB = 0
        const W = pa.width, H = pa.height
        const lik = (P, Q, x, y) => {
          const i = (y * W + x) * 4
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
            const j = (yy * W + xx) * 4
            const d = Math.max(Math.abs(P[i] - Q[j]), Math.abs(P[i + 1] - Q[j + 1]), Math.abs(P[i + 2] - Q[j + 2]), Math.abs(P[i + 3] - Q[j + 3]))
            if (d <= 40) return true
          }
          return false
        }
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4
          const aa = pa.pixels[i + 3] > 8, bb = pb.pixels[i + 3] > 8
          if (aa) tackA++
          if (bb) tackB++
          if (!aa && !bb) continue
          tackt++
          if (!(lik(pa.pixels, pb.pixels, x, y) && lik(pb.pixels, pa.pixels, x, y))) skild++
        }
        let bild = null
        if (seed === 1234) {
          const c = document.createElement('canvas')
          c.width = pa.width * 3; c.height = pa.height
          const cx = c.getContext('2d')
          const mk = (px) => new ImageData(new Uint8ClampedArray(px), pa.width, pa.height)
          cx.fillStyle = '#77aa88'; cx.fillRect(0, 0, c.width, c.height)
          const tmp = document.createElement('canvas'); tmp.width = pa.width; tmp.height = pa.height
          const put = (px, x0) => { tmp.getContext('2d').putImageData(mk(px), 0, 0); cx.drawImage(tmp, x0, 0) }
          put(pa.pixels, 0); put(pb.pixels, pa.width)
          const d = new Uint8ClampedArray(pa.pixels.length)
          for (let i = 0; i < d.length; i += 4) { const dd = Math.max(Math.abs(pa.pixels[i] - pb.pixels[i]), Math.abs(pa.pixels[i + 1] - pb.pixels[i + 1]), Math.abs(pa.pixels[i + 2] - pb.pixels[i + 2]), Math.abs(pa.pixels[i + 3] - pb.pixels[i + 3])); d[i] = 255; d[i + 1] = 255 - Math.min(255, dd * 4); d[i + 2] = 255 - Math.min(255, dd * 4); d[i + 3] = 255 }
          put(d, pa.width * 2)
          bild = c.toDataURL('image/png')
        }
        out.push({ seed, maxAv, tackA, tackB, tackt, skild, bild })
        mm.destroy(); A.destroy({ children: true }); m.destroy()
      }
      return out
    }, TATHET)
    const bildForm = form.find((f) => f.bild)?.bild
    if (bildForm) (await import("node:fs")).writeFileSync(new URL("../.test-shots/_o1form.png", import.meta.url), Buffer.from(bildForm.split(",")[1], "base64"))
    console.log(`\n  FORM (4× upplösning, tathet ${TATHET}) — ritad geometri + pixlar, path()-Graphics mot mjukMesh · bild i .test-shots/_o1form.png`)
    for (const f of form) {
      const andel = (100 * f.skild) / f.tackt
      console.log(`  seed ${String(f.seed).padStart(5)}  ringens maxavvikelse från path() ${f.maxAv.toFixed(3)} px · yta ${f.tackA} / ${f.tackB} px · skilda pixlar ${f.skild} av ${f.tackt} (${andel.toFixed(2)} %) ${andel < 4 && f.maxAv < 0.25 ? '✓' : '✗'}`)
      if (!(andel < 4 && f.maxAv < 0.25)) fel++
    }
    const bar24 = tab.find((x) => x.n === 24)
    if (tab.length) console.log(`\n  SAMMANFATTNING  kvot (ram, +över golv)  N=8 ${tab[0].kvot.toFixed(2)}×  N=16 ${tab[1].kvot.toFixed(2)}×  N=24 ${tab[2].kvot.toFixed(2)}×   ${tab.every((x) => x.kvot >= 2) ? 'BÄR' : 'BÄR INTE'} (gräns 2×)`)
    console.log(`  konsolfel: ${errors.length}${errors.length ? '\n   ' + errors.slice(0, 5).join('\n   ') : ''}`)
    if (errors.length) fel++
    void bar24
  }

  const mat = async (n, barlast = 0) => {
    const varv = []
    for (let v = 0; v < VARV; v++) {
      const r = await page.evaluate(async ({ n, barlast }) => {
        const g = window.__barnspel.game
        if (g._korn.length < n + 2) g._fyllPase()
        const m = window.__omrit
        m.barlast = barlast
        m.ms = []
        await new Promise((r) => setTimeout(r, 200))
        m.pa = true
        window.__popcorn.poppa(n)
        await new Promise((r) => setTimeout(r, 600)) // poppen varar ~41 steg ≈ 0,7 s
        m.pa = false
        m.barlast = 0
        const s = m.ms.slice().sort((a, b) => a - b)
        const mjuka = g._pop.filter((p) => p.mjuk).length
        return { median: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)], rutor: s.length, mjuka }
      }, { n, barlast })
      varv.push(r)
      await page.waitForTimeout(700)
    }
    const med = (k) => varv.map((r) => r[k]).sort((a, b) => a - b)[1]
    return { median: med('median'), p90: med('p90'), rutor: med('rutor') }
  }

  if (SPEL_AB) {
    await korSpelAB()
    await browser.close()
    process.exit(fel ? 1 : 0)
  }
  if (O1) {
    await korO1()
    await browser.close()
    process.exit(fel ? 1 : 0)
  }

  console.log(`\nB0 — bildrutans arbete (uppdatering + render), CPU-strypning ×${CPU}, median av ${VARV} varv\n`)
  const bas = await mat(0)
  const bar = await mat(0, 4)
  console.log(`  kontroll N=0             median ${bas.median.toFixed(2)} ms · p90 ${bas.p90.toFixed(2)} ms · ${bas.rutor} rutor`)
  console.log(`  kontroll N=0 + barlast 4 median ${bar.median.toFixed(2)} ms · p90 ${bar.p90.toFixed(2)} ms`)
  const flytt = bar.median - bas.median
  const mätarenRör = flytt > 3 && flytt < 6
  console.log(`  ${mätarenRör ? '✓' : '✗'} barlasten flyttar mätaren ${flytt.toFixed(2)} ms (väntat ≈ 4)`)
  if (!mätarenRör) fel++
  for (const n of N_LISTA.slice(1)) {
    const r = await mat(n)
    console.log(`  N=${String(n).padStart(2)}  median ${r.median.toFixed(2)} ms (+${(r.median - bas.median).toFixed(2)}) · p90 ${r.p90.toFixed(2)} ms · ${((r.median - bas.median) / n).toFixed(3)} ms per kropp`)
  }
  console.log(`\n  konsolfel: ${errors.length}${errors.length ? '\n   ' + errors.slice(0, 5).join('\n   ') : ''}`)
  if (errors.length) fel++
} finally {
  await browser.close()
}
process.exit(fel ? 1 : 0)
