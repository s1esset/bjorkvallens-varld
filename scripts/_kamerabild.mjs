// Kör lib/kamera.js mot en scen och ritar ett kameraläge per ruta — utan att gå via ett spel.
// Parallax går inte att bedöma i en stillbild av EN position: felet man letar efter är att ett
// lager glider åt fel håll, för fort, eller lämnar en tom kant i utkanten av världen. Rutorna
// visar samma scen vid olika kameralägen, så glidet syns som skillnaden mellan dem.
//
//   node scripts/_kamerabild.mjs meadow --bredd 3200 --lagen 0,0.5,1
//   node scripts/_kamerabild.mjs sky --bredd 2560 --zoom 1.4
//   node scripts/_kamerabild.mjs meadow --fps --cpu 6     (vad lagren + följningen kostar)
//
// Utskriften är mätvärden, inte pynt: `f<faktor>:x<offset>` per lager. Ett lager med faktor f
// SKA stå på −(mitt − halva vyn)·f vid zoom 1. Går siffran åt fel håll eller är den lika för
// alla lager finns ingen parallax, hur fin bilden än ser ut.
//
// Kräver dev-servern (window.__barnspel är DEV-only).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const tema = args[0] && !args[0].startsWith('--') ? args[0] : 'meadow'
const bredd = Number(opt('--bredd', 3200))
const lagen = opt('--lagen', '0,0.5,1').split(',').map(Number)
const zoom = Number(opt('--zoom', 1))
const shot = opt('--shot', '.test-shots/kamera.png')
const url = opt('--url', 'http://localhost:5173')
const fpsLage = args.includes('--fps')
const CPU = Number(opt('--cpu', 6))
const SEK = Number(opt('--sek', 4))
mkdirSync(dirname(shot), { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)

  if (fpsLage) {
    // CPU-strypning via CDP. UTAN den mäter man ingenting: en utvecklardator ligger över
    // takets 60 FPS i båda armarna och skillnaden blir osynlig (samma förbehåll som
    // _fpsprobe.mjs — headless Chrome är inte målplattan, siffrorna jämför armarna).
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
    const matning = async (kamPa) => {
      await page.evaluate(async ({ tema, bredd, kamPa }) => {
        const { createScene } = await import('/src/lib/scene.js')
        const { Camera } = await import('/src/lib/kamera.js')
        const layer = window.__barnspel.gateLayer
        for (const c of [...layer.children]) if (c.__kam) c.removeFromParent()
        window.__kamStad?.()
        if (!kamPa) {
          const s = createScene(tema)
          s.__kam = true
          layer.addChild(s)
          window.__kamStad = null
          return
        }
        const kam = new Camera({ worldW: bredd })
        kam.adopt(createScene(tema, { kamera: { bredd } }))
        // Ingen extra dekor: armarna ska skilja sig på LAGREN och kamerauppdateringen,
        // inget annat. Målet rör sig hela mätningen så följningen aldrig får vila.
        const mal = { x: 100, y: 360, destroyed: false }
        kam.follow(mal, { lead: 90 })
        const tick = (t) => { mal.x += t.deltaMS * 0.5; if (mal.x > bredd) mal.x = 0; kam.update(t.deltaMS) }
        window.__barnspel.app.ticker.add(tick)
        kam.root.__kam = true
        layer.addChild(kam.root)
        window.__kamStad = () => { window.__barnspel.app.ticker.remove(tick); kam.destroy(); window.__kamStad = null }
      }, { tema, bredd, kamPa })
      return page.evaluate((sek) => new Promise((res) => {
        let n = 0
        const t0 = performance.now()
        const steg = () => {
          n++
          if (performance.now() - t0 < sek * 1000) requestAnimationFrame(steg)
          else res(Math.round((n / (performance.now() - t0)) * 100000) / 100)
        }
        requestAnimationFrame(steg)
      }), SEK)
    }
    const utan = await matning(false)
    const med = await matning(true)
    await page.evaluate(() => window.__kamStad?.())
    console.log(`CPU strypt ${CPU}× · ${SEK} s per arm`)
    console.log(`  scen utan kamera      ${utan.toFixed(1)} FPS`)
    console.log(`  scen i 10 parallaxlager + följning i rörelse   ${med.toFixed(1)} FPS`)
    console.log(errors.length ? `✗ ${errors.length} fel:\n  ${errors.join('\n  ')}` : '✓ 0 konsolfel')
    await browser.close()
    process.exit(errors.length ? 1 : 0)
  }

  const rapport = await page.evaluate(async ({ tema, bredd, lagen, zoom }) => {
    const { createScene } = await import('/src/lib/scene.js')
    const { Camera } = await import('/src/lib/kamera.js')
    const { drawIcon } = await import('/src/lib/artikoner.js')
    // 'pixi.js' är ett bart modulnamn och går inte att resolva i sidkontexten (ingen import
    // map). Graphics hämtas via en app-modul som redan importerar Pixi — samma grepp som
    // scripts/_scenbild.mjs och _ikoner.mjs.
    const blank = () => drawIcon('__ingen__', 1).clear()
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__kam) c.removeFromParent()

    const cols = lagen.length <= 2 ? 1 : 2
    const rows = Math.ceil(lagen.length / cols)
    const cw = 1280 / cols
    const ch = 720 / rows
    const s = Math.min(cw / 1280, ch / 720)

    const bg = blank().rect(0, 0, 1280, 720).fill(0x101010)
    bg.__kam = true
    layer.addChild(bg)

    const ut = []
    for (let i = 0; i < lagen.length; i++) {
      const kam = new Camera({ worldW: bredd })
      kam.adopt(createScene(tema, { kamera: { bredd } }))
      // Markörer på KÄNDA världspositioner i markplanet. Utan dem går det inte att avgöra om
      // bakgrunden glider rätt eller om allt glider lika mycket (= ingen parallax alls).
      const varld = kam.parallax(1)
      for (let x = 0; x <= bredd; x += 400) {
        varld.addChild(blank().rect(x - 5, 500, 10, 130).fill(0xff2d55))
        const ikon = drawIcon('🌳', 130)
        ikon.position.set(x, 470)
        varld.addChild(ikon)
      }
      if (zoom !== 1) kam.zoom = Math.max(kam.minZoom, Math.min(kam.maxZoom, zoom))
      kam.moveTo(640 + lagen[i] * (bredd - 1280), 360)

      kam.root.scale.set(s)
      kam.root.position.set((i % cols) * cw, Math.floor(i / cols) * ch)
      // Mask per ruta: lagren ÄR bredare än vyn (det är hela poängen), så utan mask ritar
      // ruta 2 rakt in i ruta 3 och bilden blir obegriplig.
      const m = blank().rect((i % cols) * cw, Math.floor(i / cols) * ch, 1280 * s, 720 * s).fill(0xffffff)
      m.__kam = true
      layer.addChild(m)
      kam.root.mask = m
      kam.root.__kam = true
      layer.addChild(kam.root)
      ut.push({
        ruta: i,
        andel: lagen[i],
        mitt: Math.round(kam.x),
        vanster: Math.round(kam.x - kam._halfW()),
        lager: kam._layers.map((l) => ({ f: l._kamFx, x: Math.round(l.x), n: l.children.length })),
      })
    }
    return ut
  }, { tema, bredd, lagen, zoom })

  await page.waitForTimeout(500)
  await page.screenshot({ path: shot })
  for (const r of rapport) {
    console.log(`ruta ${r.ruta} (${r.andel}) · mitt ${r.mitt}px · vänsterkant ${r.vanster}px`)
    console.log('   ' + r.lager.map((l) => `f${l.f}:x${l.x}(${l.n})`).join(' '))
  }
  console.log(errors.length ? `✗ ${errors.length} fel:\n  ${errors.join('\n  ')}` : `✓ 0 konsolfel · ${shot}`)
} finally {
  await browser.close()
}
