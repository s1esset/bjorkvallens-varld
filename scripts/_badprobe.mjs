// Mäter att pruttbads rundor FAKTISKT skiljer sig åt — kritikerns invändning var att
// "variation" och "mjuk progression" bara var delvis uppfyllda så länge rundorna såg
// identiska ut (bara mållinjen flyttades).
//
// Punkter:
//   1. Badsorten cyklar: nivå 0, 1 och 2 har olika vatten-/skumfärg.
//   2. Ett gömt fynd placeras varje runda och är DOLT vid start.
//   3. Fyndet ligger mellan 35 % och 80 % av vägen upp — alltså efter en stunds spelande.
//   4. När skummet stigit förbi fyndet dyker det upp (blir synligt).
//   5. Fyndsorten skiljer sig mellan rundor.
//   6. Att lämna spelet mitt i allt ger 0 konsolfel (fyndets gungning är repeat:-1).
//
//   node scripts/_badprobe.mjs [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '')
const ID = 'pruttbad'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const ok = (namn, pass, detalj) => results.push({ namn, pass, detalj })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  const setLevel = async (n) => page.evaluate((lvl) => {
    const doc = window.__barnspel?.save?.data
    if (!doc) return false
    for (const p of doc.profiles || []) {
      p.games = p.games || {}
      p.games['pruttbad'] = { unlocked: true, highestLevel: lvl, stars: 0, lastPlayedAt: null, custom: {} }
    }
    window.__barnspel.save._requestPersist?.()
    return true
  }, n)
  const open = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1200)
  }
  const leave = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(400)
  }
  const state = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    if (!g) return null
    const b = g._bath?.()
    return {
      niva: g._level,
      bad: b?.id || null,
      vatten: b?.water ?? null,
      skum: b?.foam ?? null,
      fynd: g._treasure ? { sort: g._treasure.kind.id, y: Math.round(g._treasure.y), synlig: !!g._treasure.view?.visible, hittat: !!g._treasure.found } : null,
      goalY: g._goalY,
      ytaY: 330,
      foam: g._foam?.level ?? 0,
      goalFoam: g._goalFoam,
    }
  })
  const toScreen = async (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])
  // Håll på magen → laddad bubbla → släpp. Upprepa för att fylla badet.
  const prutt = async (ms = 420) => {
    const p = await toScreen(430, 310)
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    await page.waitForTimeout(ms)
    await page.mouse.up()
    await page.waitForTimeout(260)
  }

  // ---- Badsorten cyklar ---------------------------------------------------
  await open()
  const s0 = await state()
  await leave(); await setLevel(1); await open()
  const s1 = await state()
  await leave(); await setLevel(2); await open()
  const s2 = await state()
  ok('1. badsorten cyklar (olika färg per runda)',
    s0.bad !== s1.bad && s1.bad !== s2.bad && s0.vatten !== s1.vatten,
    `${s0.bad} -> ${s1.bad} -> ${s2.bad}`)
  ok('5. fyndsorten skiljer sig mellan rundor',
    s0.fynd && s1.fynd && s0.fynd.sort !== s1.fynd.sort,
    `${s0.fynd?.sort} -> ${s1.fynd?.sort} -> ${s2.fynd?.sort}`)

  // ---- Fyndet: dolt vid start, rätt djup ---------------------------------
  await leave(); await setLevel(0); await open()
  const s3 = await state()
  ok('2. fyndet är dolt vid rundans start', !!s3.fynd && s3.fynd.synlig === false && s3.fynd.hittat === false,
    s3.fynd ? `sort=${s3.fynd.sort} synlig=${s3.fynd.synlig}` : 'inget fynd')
  const frac = s3.fynd ? (s3.ytaY - s3.fynd.y) / (s3.ytaY - s3.goalY) : -1
  ok('3. fyndet ligger 35–80 % upp (efter en stunds spelande)', frac >= 0.34 && frac <= 0.81,
    `${Math.round(frac * 100)} % av vägen till linjen`)

  // ---- Spela tills skummet passerar fyndet -------------------------------
  let hittat = false
  for (let i = 0; i < 26; i++) {
    await prutt()
    const s = await state()
    if (s.fynd?.hittat) { hittat = true; break }
    if (s.foam >= s.goalFoam) break
  }
  const s4 = await state()
  ok('4. fyndet dyker upp när skummet stigit förbi det', hittat && s4.fynd?.synlig === true,
    `hittat=${hittat} synlig=${s4.fynd?.synlig} skum=${Math.round(s4.foam)}/${s4.goalFoam}`)
  if (shot) await page.screenshot({ path: shot })

  // Vatten och skum måste byta badsort SAMTIDIGT. _level ökar direkt vid klarad runda men
  // karet målas om först i _newRound 1,5 s senare — läste skummet nivån live blev det rosa
  // skum över blått vatten under hela firandet (syntes i skärmdumpen, inte i något test).
  const under = []
  let avslojatIForvag = false
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(220)
    const s = await state()
    if (s?.bad) under.push(s.bad + '/' + s.skum)
    // Nästa rundas fynd får INTE vara hittat medan badet fortfarande töms/byggs upp.
    if (s?.niva > s3.niva && s.fynd?.hittat && s.foam < s.goalFoam * 0.5) avslojatIForvag = true
  }
  const unika = [...new Set(under)]
  ok('7. vatten och skum byter badsort samtidigt (aldrig blandat)', unika.length <= 2,
    `sedda kombinationer under nivåbytet: ${unika.join(' , ')}`)
  // DEN HÄR mätningen saknades: proben testade bara via setLevel + sidladdning, alltså
  // alltid via init() där _foam.level är 0 — aldrig en LEVANDE vinst → ny runda. Förra
  // rundans överskottsskum avslöjade då nästa rundas fynd direkt, i 3 fall av 4.
  const s5 = await state()
  ok('8. nästa rundas fynd avslöjas INTE av förra rundans skum',
    !avslojatIForvag && !(s5.niva > s3.niva && s5.fynd?.hittat && s5.foam < s5.goalFoam * 0.5),
    `niva ${s3.niva} -> ${s5.niva} · fynd hittat=${s5.fynd?.hittat} vid skum ${Math.round(s5.foam)}/${s5.goalFoam}`)

  const foreExit = errors.length
  await leave()
  await page.waitForTimeout(1200)
  ok('6. exit mitt i allt ger 0 nya konsolfel', errors.length === foreExit, errors.slice(foreExit).join(' | ') || 'inga')

  console.log('')
  let fel = 0
  for (const r of results) {
    if (!r.pass) fel++
    console.log(`  ${r.pass ? '✓' : '✗'} ${r.namn}  —  ${r.detalj}`)
  }
  console.log('')
  console.log(`  ${results.length - fel}/${results.length} gröna · ${errors.length} konsolfel totalt`)
  if (errors.length) console.log('  ' + errors.slice(0, 5).join('\n  '))
  process.exitCode = fel ? 1 : 0
} finally {
  await browser.close()
}
