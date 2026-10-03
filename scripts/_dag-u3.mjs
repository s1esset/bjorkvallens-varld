// U3-SOND (D15) — syns det nya innehållet, och överlever det sparade?
//
//   node scripts/_dag-u3.mjs [id …]        (kräver dev-servern på :5173)
//
// Per spel: förse sparningen (nivå + custom) som en återkommande profil har den, öppna spelet,
// gå hem och in igen otåligt (300 ms) två gånger, vänta in introt och ta bild till
// .test-shots/_u3-<id>.png. Sedan: varje förd nyckel ska finnas kvar med minst sitt värde
// (P0 ALDRIG — sparade framsteg får inte försvinna), och inga konsolfel.
import { chromium } from 'playwright'

const URL = 'http://localhost:5173'

// Det en återkommande profil har sparat. `legacy` = plantera-fron före rabatten (bara antalet).
const FALL = {
  trollblandning: { level: 5, custom: { recept: ['anga', 'lera', 'lava', 'regnbage'] } },
  'plantera-fron': { level: 2, custom: { flowers: 5 } },
  siffertaget: { level: 2, custom: {} },
  loopdjuren: { level: 3, custom: {} },
  'valpens-bajs': {
    level: 1,
    custom: { parkblommor: [[300, 560, 0, 0, 1], [520, 600, 1, 1, 2], [760, 580, 2, 0, 0], [980, 620, 3, 1, 1]] },
  },
  'vakna-pappa': { level: 1, custom: {} },
}

const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const lista = ids.length ? ids : Object.keys(FALL)
let fel = 0
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const konsol = []
  page.on('console', (m) => { if (m.type() === 'error') konsol.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => konsol.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  const vanta = (ms) => page.waitForTimeout(ms)
  const ga = (id) => page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  const hem = () => page.evaluate(() => window.__barnspel.nav.go('library'))
  const las = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__barnspel.ctx.progress.get())))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel?.profiles?.activeId?.(), null, { timeout: 20000 })

  for (const id of lista) {
    const f = FALL[id]
    konsol.length = 0
    await ga(id); await vanta(1200)
    await page.evaluate((f) => {
      const p = window.__barnspel.ctx.progress
      p.update({ highestLevel: f.level })
      for (const [k, v] of Object.entries(f.custom)) p.setCustom(k, v)
    }, f)
    const fore = await las()
    // otåligt: in och ut två gånger innan introt hunnit klart
    for (let i = 0; i < 2; i++) { await hem(); await vanta(300); await ga(id); await vanta(300) }
    await vanta(4500)
    await page.screenshot({ path: `.test-shots/_u3-${id}.png` })
    const efter = await las()
    const g = await page.evaluate(() => {
      const g = window.__barnspel.game
      return { blockSett: g?._blockSett, mode: g?._mode ?? g?._lage, antalBlock: g?._blocks?.length }
    })
    await hem(); await vanta(400)
    const brister = []
    if ((efter.highestLevel || 0) < fore.highestLevel) brister.push(`nivå ${fore.highestLevel} → ${efter.highestLevel}`)
    for (const [k, v] of Object.entries(fore.custom || {})) {
      const e = efter.custom?.[k]
      if (e === undefined) brister.push(`custom.${k} försvann`)
      else if (typeof v === 'number' && e < v) brister.push(`custom.${k} ${v} → ${e}`)
      else if (Array.isArray(v) && (!Array.isArray(e) || e.length < v.length)) brister.push(`custom.${k} ${v.length} → ${e?.length}`)
    }
    const ok = !brister.length && !konsol.length
    if (!ok) fel++
    console.log(`${ok ? '✓' : '✗'} ${id}  nivå ${efter.highestLevel} · custom ${JSON.stringify(efter.custom).slice(0, 220)}`)
    if (g && Object.values(g).some((v) => v !== undefined)) console.log(`    spelet: ${JSON.stringify(g)}`)
    for (const b of brister) console.log(`    ✗ ${b}`)
    for (const k of konsol) console.log(`    konsol: ${k}`)
  }
} finally {
  await browser.close()
}
console.log(fel ? `\n✗ ${fel} spel med brister` : '\n✓ allt sparat finns kvar, inga konsolfel')
process.exit(fel ? 1 : 0)
