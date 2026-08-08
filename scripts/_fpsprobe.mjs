// Vad KOSTAR partiklarna? Mäter bildfrekvens under en ihållande partikelstorm vid
// olika täthet, och jämför den nya ParticleContainer-vägen mot den gamla
// Graphics-per-partikel-vägen vid samma antal.
//
// Syftet är att avgöra hur högt DENSITY i lib/partiklar.js kan sättas. Utan en
// mätning är varje val av siffra en gissning — och gissningen betalas av föräldern
// vars platta hackar mitt i ett firande.
//
// FÖRBEHÅLL: headless Chrome på en utvecklardator är INTE målplattan. Siffrorna här
// duger till att jämföra de två vägarna mot varandra och att hitta var kurvan viker,
// inte till att lova en FPS på en surfplatta. Den mätningen måste göras på enheten
// (npm run build && npm run serve).
//
//   node scripts/_fpsprobe.mjs [--sek 4]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : d }
const SEK = opt('--sek', 4)
// CPU-strypning via CDP. UTAN den mäter man ingenting: en utvecklardator klarar båda
// vägarna långt över takets 60 FPS, så båda rapporterar ~57 och skillnaden är osynlig.
// Strypningen simulerar en svag platta och får kurvan att vika där den faktiskt viker.
const CPU = opt('--cpu', 6)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const cdp = await page.context().newCDPSession(page)
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  // En mätning: spruta `perSkur` partiklar var 120:e ms i `sek` sekunder via `vag`,
  // räkna bildrutor och toppantal levande partiklar/noder.
  const matning = (vag, perSkur, sek) =>
    page.evaluate(async ([vag, perSkur, sek]) => {
      const app = window.__barnspel.app
      const layer = window.__barnspel.fxLayer
      const part = await import('/src/lib/partiklar.js')

      let rutor = 0
      const rakna = () => { rutor++ }
      app.ticker.add(rakna)

      let topp = 0
      const matTopp = () => {
        let n = 0
        const walk = (c) => {
          if (!c || c.destroyed) return
          if (Array.isArray(c.particleChildren)) n += c.particleChildren.length
          else if (c.children) { n += c.children.length; c.children.forEach(walk); return }
          if (c.children) c.children.forEach(walk)
        }
        walk(layer)
        if (n > topp) topp = n
      }

      const t0 = performance.now()
      const iv = setInterval(() => {
        for (let i = 0; i < 3; i++) {
          const x = 200 + Math.random() * 880
          const y = 150 + Math.random() * 420
          if (vag === 'partiklar') {
            part.spray(layer, x, y, { count: perSkur, former: ['stjarna', 'cirkel'], life: 1.1, lifeVar: 0.3, spin: 3 })
          } else {
            // Gamla vägen, återskapad exakt: en Graphics + en tween per partikel.
            const Graphics = window.__GFX_TEST__
            const gsap = window.__GSAP_TEST__
            for (let k = 0; k < perSkur; k++) {
              const p = new Graphics().circle(0, 0, 5 + Math.random() * 7).fill(0xff8a3d)
              p.position.set(x, y); p.eventMode = 'none'; layer.addChild(p)
              const a = Math.random() * Math.PI * 2
              const d = 50 + Math.random() * 90
              const st = { x, y, s: 1, al: 1 }
              const tw = gsap.to(st, {
                x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, s: 0.3, al: 0,
                duration: 1.1, ease: 'power2.out',
                onUpdate: () => { if (p.destroyed) { tw.kill(); return } p.x = st.x; p.y = st.y; p.alpha = st.al; p.scale.set(st.s) },
                onComplete: () => { if (!p.destroyed) p.destroy() },
              })
            }
          }
        }
        matTopp()
      }, 120)

      await new Promise((r) => setTimeout(r, sek * 1000))
      clearInterval(iv)
      const dt = (performance.now() - t0) / 1000
      app.ticker.remove(rakna)
      await new Promise((r) => setTimeout(r, 1600)) // låt svärmen dö ut
      return { fps: Number((rutor / dt).toFixed(1)), topp }
    }, [vag, perSkur, sek])

  // Gör Graphics + gsap nåbara för jämförelsevägen (bara i sonden, aldrig i appen).
  // Pixi får INTE importeras en gång till — en andra modulinstans registrerar sina
  // extensions på nytt och kastar "Extension type application already has a handler".
  // Klassen hämtas därför ur ett objekt appen redan skapat (bgLayer ÄR en Graphics).
  await page.evaluate(async () => {
    window.__GFX_TEST__ = window.__barnspel.scaler.bgLayer.constructor
    const g = await import('/node_modules/.vite/deps/gsap.js')
    window.__GSAP_TEST__ = g.gsap || g.default
  }).catch(() => {})

  const harPixi = await page.evaluate(() => !!(window.__GFX_TEST__ && window.__GSAP_TEST__?.to))

  console.log(`\n  Partikelkostnad — ${SEK}s per mätning, headless Chrome, CPU ${CPU}x strypt\n`)
  console.log('  väg           per skur   topp levande   FPS')
  console.log('  ' + '-'.repeat(46))

  for (const n of [14, 42, 70, 140, 280, 560]) {
    const r = await matning('partiklar', n, SEK)
    console.log(`  ParticleCont. ${String(n).padStart(8)} ${String(r.topp).padStart(14)} ${String(r.fps).padStart(7)}`)
  }
  if (harPixi) {
    for (const n of [14, 42, 70, 100, 140]) {
      const r = await matning('graphics', n, SEK)
      console.log(`  Graphics      ${String(n).padStart(8)} ${String(r.topp).padStart(14)} ${String(r.fps).padStart(7)}`)
    }
  } else {
    console.log('  (jämförelsevägen kunde inte ladda Pixi/GSAP — hoppade över)')
  }

  console.log(`\n  fel: ${errors.length}${errors.length ? ' — ' + errors[0] : ''}\n`)
} finally {
  await browser.close()
}
