// SPELAR `leksakslada`s beställningslogik: drar FÖRST en fel leksak till korgen, sedan
// den beställda, och läser spelets eget `_klara`/`_onskad`.
//
//   node scripts/_leksakprobe.mjs [--rundor 10]
//
// `--rundor N` mäter i stället spelets PREMISS: ligger den beställda leksaken begravd?
// Per runda räknas hur stor del av den beställda leksaken som täcks av leksaker som
// ritas FRAMFÖR den (samma z-ordning som hit-testet använder). Ligger den överst är
// hela grävandet — spelets titel och pitch — ett icke-val den rundan. Kör alltid mot
// HEAD innan en spawn-ändring: talet betyder inget utan sitt före-värde.
//
// Finns för att `scripts/_dragspel.mjs` inte kan svara på frågan här: korgen är ett mål
// som accepterar ALLT (`addTarget(korg, () => true)`) och rätt/fel avgörs inne i spelet
// efteråt. Sonden rapporterade därför tre `drag/ratt` för tre leksaker i rad — sant men
// intetsägande: den mätte att saker landar i korgen, inte att RÄTT sak räknas.
// Fel-armen körs först och är kontrollarmen: ökar `_klara` av en fel leksak är
// beställningen bara dekor.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('console', m => { if (m.type() === 'error') fel.push(m.text().slice(0,140)) })
p.on('pageerror', e => fel.push('PAGEERROR ' + String(e).slice(0,140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'leksakslada' }))
await p.waitForTimeout(5200) // beställningen sätts först efter introt (~4,5 s)

const las = () => p.evaluate(() => {
  const g = window.__barnspel.game
  const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect()
  const res = window.__barnspel.app.renderer.resolution || 1
  const sx = r.width / (cv.width / res)
  const korg = g._korg.getGlobalPosition()
  return {
    onskad: g._onskad, klara: g._klara,
    korg: { x: r.left + korg.x * sx, y: r.top + korg.y * sx },
    lek: (g._leksaker || []).filter(l => l.body && !l.flyger).map(l => {
      const q = (l.grepp || l.handtag || l.view).getGlobalPosition()
      return { key: l.spec.key, x: r.left + q.x * sx, y: r.top + q.y * sx }
    }),
  }
})

const drag = async (a, z) => p.evaluate(async ({ a, z }) => {
  const cv = document.querySelector('canvas')
  const s = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
  s('pointerdown', a.x, a.y)
  for (let i = 1; i <= 26; i++) { const t = i / 26; s('pointermove', a.x + (z.x - a.x) * t, a.y + (z.y - a.y) * t); await new Promise(r => setTimeout(r, 18)) }
  s('pointerup', z.x, z.y)
}, { a, z })

// --- PREMISSMÄTNING: ligger den beställda saken begravd? ---------------------
const RUNDOR = Number((() => { const i = process.argv.indexOf('--rundor'); return i >= 0 ? process.argv[i + 1] : 0 })())
if (RUNDOR) {
  const tackning = []
  for (let n = 0; n < RUNDOR; n++) {
    await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'leksakslada' }))
    await p.waitForTimeout(5200) // beställningen sätts först efter introt (~4,5 s)
    const v = await p.evaluate(() => {
      const g = window.__barnspel.game
      const lek = (g._leksaker || []).filter((l) => l.body && !l.flyger)
      const ordning = g._leksakLager.children
      const z = (l) => ordning.indexOf(l.view)
      const mal = lek.find((l) => l.spec.key === g._onskad)
      if (!mal) return null
      // Runda leksaker har `r`, kantiga har `w`/`h`. Att bara läsa w/h gav NaN för
      // varje boll, anka och nalle — och NaN föll ur jämförelsen, så sonden svarade
      // "0 % täckning, 10 av 10 rundor" även när spawn-bandet halverades. Ett tal som
      // inte RÖR SIG när man ändrar det den mäter är inte en mätning.
      // Runda leksaker har `r`, kantiga `w`/`h`. Att bara läsa w/h gav NaN för varje
      // boll, anka och nalle, och NaN föll ur jämförelsen: sonden svarade "0 %, 10 av 10"
      // även när spawn-bandet halverades. Ett tal som inte RÖR SIG när man ändrar det
      // det mäter är ingen mätning.
      const halv = (l) => (l.spec.r ?? Math.max(l.spec.w || 0, l.spec.h || 0) / 2)
      // "Begravd" är INTE genomträngning. Leksaker som vilar på varandra rör vid
      // varandra men överlappar knappt — cirkelavståndet blir r_i + r_j och formeln
      // gav ~0 även för en tre lager djup hög. Frågan är hur stor del av leksakens
      // BREDD som har något OVANFÖR sig: det är precis det barnet måste flytta undan.
      const a0 = mal.body.position.x - halv(mal)
      const a1 = mal.body.position.x + halv(mal)
      const tackt = []
      for (const o of lek) {
        if (o === mal) continue
        if (o.body.position.y >= mal.body.position.y - 8) continue // inte ovanför
        const b0 = Math.max(a0, o.body.position.x - halv(o))
        const b1 = Math.min(a1, o.body.position.x + halv(o))
        if (b1 > b0) tackt.push([b0, b1])
      }
      tackt.sort((p, q) => p[0] - q[0])
      let summa = 0
      let kant = a0
      for (const [b0, b1] of tackt) {
        if (b1 <= kant) continue
        summa += b1 - Math.max(b0, kant)
        kant = Math.max(kant, b1)
      }
      const mest = summa / (a1 - a0)
      return Math.min(1, mest)
    })
    if (v !== null) tackning.push(v)
  }
  const snitt = tackning.reduce((a, b) => a + b, 0) / (tackning.length || 1)
  const noll = tackning.filter((v) => v < 0.02).length
  console.log(`
  leksakslada — ligger den beställda saken begravd? (${tackning.length} rundor)`)
  console.log(`  snitt av bredden med något OVANPÅ: ${(snitt * 100).toFixed(0)} %`)
  console.log(`  rundor UTAN något ovanpå: ${noll}/${tackning.length} (${Math.round(noll / tackning.length * 100)} %) — ju lägre desto mer bökande
`)
  await b.close()
  process.exit(0)
}

// 1) FEL leksak i korgen — beställningen ska INTE bli klar
let st = await las()
const felLek = st.lek.find(l => l.key !== st.onskad)
await drag(felLek, st.korg); await p.waitForTimeout(1400)
const eFel = await las()
// 2) RÄTT leksak i korgen — beställningen SKA bli klar
st = await las()
const rattLek = st.lek.find(l => l.key === st.onskad)
let eRatt = null
if (rattLek) { await drag(rattLek, st.korg); await p.waitForTimeout(1600); eRatt = await las() }

await p.evaluate(() => window.__barnspel.nav.go('library'))
await p.waitForTimeout(700)
console.log(`\n  leksakslada — beställningslogiken`)
console.log(`  beställd: ${st.onskad} · leksaker i lådan: ${st.lek.length}`)
console.log(`  FEL leksak (${felLek.key}) i korgen → klara ${eFel.klara} (ska vara 0), beställning kvar: ${eFel.onskad === st.onskad}`)
console.log(`  RÄTT leksak (${rattLek ? rattLek.key : 'HITTADES INTE i lådan'}) i korgen → klara ${eRatt ? eRatt.klara : '-'} (ska vara 1)`)
console.log(`  konsolfel: ${fel.length}${fel.length ? '\n   ! ' + fel.slice(0,4).join('\n   ! ') : ''}\n`)
await b.close()
