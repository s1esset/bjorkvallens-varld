// _egnakund.mjs — EN kund av lib/egnafigurer.js (LYFTPLAN §10, Spår F) spelad i appen.
//
// Generisk: den letar efter barnets figurer via `levandeFigurer()` (varje EgenFigur som lever)
// och behöver alltså inte veta var spelet lagt dem. Det spelet måste säga är bara HUR man når
// den omgång där figuren står — `--trigger`, en funktionskropp med (g, ctx) som körs när spelet
// monterats (t.ex. "g._openPackage(ctx)"). Utan trigger mäts läget direkt efter monteringen.
//
//   node scripts/_egnakund.mjs <id> [--url http://localhost:5174] [--trigger "<js>"]
//        [--vanta 2600] [--bild] [--armar K0,M1,E1,E2,N1,N2,X]
//
// Kör mot :5174 (`npx vite --config scripts/_vite-nohmr.mjs`) när andra redigerar src/ —
// :5173 laddar om sidan mitt i. Bilder: .test-shots/egna-<id>-<arm>.png.
//
// Armarna (i den här ordningen — kontrollarmen FÖRST):
//   K0  tom profil, inga mötta → INGEN egen figur lever i spelet (reserven), 0 konsolfel.
//   M1  tom samling + ett MÖTT knytt (minnsMott) → figuren står där, `mott`, och ingen replik
//       under omgången säger "ditt"/"din".
//   E1  3 knytt + 2 kompisar sparade, sessionen nollad → barnets figur lever OCH syns i
//       scenen på första omgången.
//   E2  nästa besök → ingen egen figur (takten: spelets egen).
//   N1  ett NYTT knytt (minns) → det står där med ny=true; repliker under omgången listas
//       (spelets egen presentationsrad + knyttets namn väntas).
//   N2  en NY kompis (minns) → samma, kompisraden väntas.
//   X   in och ut mitt i (350 ms) tre gånger.
//   Efter VARJE arm: spelet lämnat → levandeFigurer() tom (ingen figur överlever sitt spel).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const id = args[0]
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
if (!id || id.startsWith('--')) {
  console.error('usage: node scripts/_egnakund.mjs <id> [--url …] [--trigger "<js>"] [--vanta ms] [--bild]')
  process.exit(2)
}
const URL = opt('--url', 'http://localhost:5174')
const TRIGGER = opt('--trigger', '')
const VANTA = Number(opt('--vanta', 2600))
const BILD = args.includes('--bild')
const ARMAR = new Set((opt('--armar', 'K0,M1,E1,E2,N1,N2,X')).split(','))

const KNYTT = [
  [12345, 2, 1, 3, 0, 1, 0, 0, 0],
  [987654, 5, 2, 1, 2, 2, 1, 1, 16],
  [55555, 7, 3, 4, 1, 0, 2, 0, 1],
]
const KOMPISAR = [
  { kropp: 0, ogon: 1, mun: 0, topp: 4, farg: 2, storlek: 1 },
  { kropp: 2, ogon: 3, mun: 2, topp: 1, farg: 6, storlek: 2 },
]
const NYTT_KNYTT = [777777, 4, 0, 2, 3, 0, 1, 0, 0]
const NY_KOMPIS = { kropp: 1, ogon: 2, mun: 1, topp: 2, farg: 4, storlek: 0 }
const MOTT_KNYTT = [424242, 3, 2, 1, 4, 0, 2, 0, 0]

const rader = []
let fel = 0
const ok = (namn, villkor, info = '') => {
  rader.push(`${villkor ? '✓' : '✗'} ${namn}${info ? '  ' + info : ''}`)
  if (!villkor) fel++
}
const info = (namn, text) => rader.push(`· ${namn}  ${text}`)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const konsol = []
  page.on('console', (m) => { if (m.type() === 'error') konsol.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => konsol.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  const vanta = (ms) => page.waitForTimeout(ms)

  const ga = async (gid) => {
    await page.evaluate((x) => window.__barnspel.nav.go('game', { id: x }), gid)
    await page.waitForFunction((x) => window.__barnspel?.game?.id === x && !!window.__barnspel?.ctx, gid, { timeout: 20000 })
    await vanta(900)
  }
  const hem = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await vanta(600)
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 30000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel?.profiles?.activeId?.(), null, { timeout: 30000 })

  // Repliker: haka på voice.say EN gång (tjänsten lever hela sidan).
  await page.evaluate(() => {
    const v = window.__barnspel.voice
    if (v && !v.__egnaHak) {
      const orig = v.say.bind(v)
      window.__egnaRepliker = []
      window.__egnaTider = []
      v.say = (t, ...r) => {
        window.__egnaRepliker.push(String(t))
        window.__egnaTider.push({ t: performance.now(), text: String(t) })
        return orig(t, ...r)
      }
      v.__egnaHak = true
    }
  })

  // Appens EGEN modulinstans av egnafigurer.js — en nyimporterad kopia har eget sessionsminne.
  await ga(id)
  const MOD = await page.evaluate(() => {
    const e = performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/lib/egnafigurer.js'))
    return e || null
  })
  await hem()
  if (!MOD) {
    ok(`${id}: spelet laddar lib/egnafigurer.js`, false, 'modulen syns inte bland resurserna — importerar spelet den?')
    throw new Error('ingen modul')
  }

  const forbered = (fn, arg) => page.evaluate(async ({ mod, src, arg }) => {
    const m = await import(mod)
    // eslint-disable-next-line no-new-func
    return new Function('m', 's', 'arg', `return (${src})(m, s, arg)`)(m, window.__barnspel, arg)
  }, { mod: MOD, src: fn.toString(), arg })

  // En omgång: in i spelet, trigger, vänta, läs figurerna + replikerna.
  // vantaPa(repliker, figurer) → true när det armen väntar på har hänt; pollas upp till 14 s
  // efter grundväntan (intron är upp till 6 s, och presentationen köar efter dem).
  const omgang = async (arm, vantaMs = VANTA, vantaPa = null) => {
    const fore = konsol.length
    await page.evaluate(() => { window.__egnaRepliker = []; window.__egnaTider = [] })
    await ga(id)
    let trigFel = null
    if (TRIGGER) {
      trigFel = await page.evaluate((src) => {
        try {
          // eslint-disable-next-line no-new-func
          new Function('g', 'ctx', src)(window.__barnspel.game, window.__barnspel.ctx)
          return null
        } catch (e) {
          return String(e?.message || e)
        }
      }, TRIGGER)
    }
    await vanta(vantaMs)
    if (vantaPa) {
      for (let i = 0; i < 28; i++) {
        const lage = await page.evaluate(async (mod) => {
          const m = await import(mod)
          return { rep: [...window.__egnaRepliker], fig: m.levandeFigurer().map((f) => ({ namn: f.fig.namn || null, ny: f.ny })) }
        }, MOD)
        if (vantaPa(lage.rep, lage.fig)) break
        await vanta(500)
      }
    }
    const las = await page.evaluate(async (mod) => {
      const m = await import(mod)
      const app = window.__barnspel.app
      return m.levandeFigurer().map((f) => ({
        typ: f.typ, id: f.id, mott: f.mott, ny: f.ny, synlig: f.synlig, iAppen: f.rot === app?.stage,
        namn: f.fig.namn || null,
      }))
    }, MOD)
    if (BILD) {
      mkdirSync('.test-shots', { recursive: true })
      await page.screenshot({ path: `.test-shots/egna-${id}-${arm}.png` })
    }
    const repliker = await page.evaluate(() => [...window.__egnaRepliker])
    const tider = await page.evaluate(() => window.__egnaTider.map((x) => ({ ...x })))
    await hem()
    await vanta(400)
    const kvar = await page.evaluate(async (mod) => (await import(mod)).levandeFigurer().length, MOD)
    const nyaFel = konsol.slice(fore)
    return { figurer: las, repliker, tider, kvar, nyaFel, trigFel }
  }
  const slut = (arm, r) => {
    ok(`${arm} spelet lämnat → ingen figur lever kvar`, r.kvar === 0, `kvar ${r.kvar}`)
    ok(`${arm} 0 konsolfel`, r.nyaFel.length === 0, r.nyaFel.slice(0, 3).join(' | '))
    if (r.trigFel) ok(`${arm} triggern kördes`, false, r.trigFel)
    info(`${arm} repliker`, JSON.stringify(r.repliker))
  }
  const nollstall = () => forbered((m) => m.glomSessionen())
  // Kapas en replik? `say()` avbryter den förra, och klippen är ≥ 1 s — nästa say inom
  // 900 ms efter raden betyder att barnet aldrig hörde den till slut.
  const kapas = (r, text) => {
    const i = r.tider.findIndex((x) => x.text === text)
    if (i < 0 || i === r.tider.length - 1) return null
    return Math.round(r.tider[i + 1].t - r.tider[i].t)
  }
  // Presentationsraderna = det en NY figurs omgång sa som en vanlig omgång (E1/K0) inte sa.
  // Var och en ska höras till slut, och minst en måste finnas.
  const vanliga = new Set()
  const presKoll = (arm, r) => {
    const nya = [...new Set(r.repliker.filter((t) => !vanliga.has(t)))]
    const kapade = nya.map((t) => [t, kapas(r, t)]).filter(([, g]) => g != null && g < 900)
    ok(`${arm} en presentationsrad sägs`, nya.length > 0, JSON.stringify(nya))
    ok(`${arm} … och hörs till slut (nästa replik ≥ 900 ms efter)`, kapade.length === 0, JSON.stringify(kapade))
  }

  // ---- K0: tom profil (kontrollarm) ------------------------------------------------------
  if (ARMAR.has('K0')) {
    await nollstall()
    const r = await omgang('k0')
    for (const t of r.repliker) vanliga.add(t)
    ok('K0 tom profil: ingen egen figur (spelets egen står kvar)', r.figurer.length === 0, JSON.stringify(r.figurer))
    slut('K0', r)
  }

  // ---- M1: ett mött knytt, tom samling ------------------------------------------------------
  if (ARMAR.has('M1')) {
    await nollstall()
    await forbered((m, s, post) => m.minnsMott(s, 'knytt', post), MOTT_KNYTT)
    // Vänta in en rad utöver introt (spelets egen replik för ett mött knytt), om det har en.
    const r = await omgang('m1', Math.max(VANTA, 4200), (rep) => rep.some((t) => !vanliga.has(t)))
    info('M1 nya repliker', JSON.stringify(r.repliker.filter((t) => !vanliga.has(t))))
    const f = r.figurer[0]
    ok('M1 det mötta knyttet står där', r.figurer.length >= 1 && !!f?.mott, JSON.stringify(r.figurer))
    ok('M1 … och synligt i scenen', !!f?.synlig && !!f?.iAppen, JSON.stringify(f))
    const ditt = r.repliker.filter((t) => /\b(ditt|din|dina)\b/i.test(t))
    ok('M1 ingen replik kallar ett mött knytt "ditt"', ditt.length === 0, JSON.stringify(ditt))
    slut('M1', r)
  }

  // ---- seeda samlingarna (via källspelens egen progress) ------------------------------------
  // Som källspelen: en figur visas bara om den FINNS i samlingen, så ett "nytt" knytt måste
  // sparas innan det minns (unika-knytt gör båda i _sparaKnytt).
  const seeda = async (knytt, kompisar) => {
    await ga('unika-knytt')
    await page.evaluate((lista) => {
      window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista, n: lista.length, firad: 3, dag: 0, torka: 0 })
    }, knytt)
    await hem()
    await ga('bygg-en-kompis')
    await page.evaluate((g) => window.__barnspel.ctx.progress.setCustom('galleri', g), kompisar)
    await hem()
  }
  await seeda(KNYTT, KOMPISAR)

  if (ARMAR.has('E1') || ARMAR.has('E2')) {
    await nollstall()
    const r1 = await omgang('e1')
    for (const t of r1.repliker) vanliga.add(t)
    const f = r1.figurer[0]
    ok('E1 barnets figur lever på första omgången', r1.figurer.length >= 1, JSON.stringify(r1.figurer))
    ok('E1 … och syns i scenen', r1.figurer.some((x) => x.synlig && x.iAppen), JSON.stringify(r1.figurer))
    ok('E1 … sparad, inte ny, inte mött', !!f && !f.ny && !f.mott)
    slut('E1', r1)
    if (ARMAR.has('E2')) {
      const r2 = await omgang('e2')
      ok('E2 nästa omgång: spelets egen (takten)', r2.figurer.length === 0, JSON.stringify(r2.figurer))
      slut('E2', r2)
    }
  }

  if (ARMAR.has('N1') || ARMAR.has('N2')) await seeda([...KNYTT, NYTT_KNYTT], [...KOMPISAR, NY_KOMPIS])

  if (ARMAR.has('N1')) {
    await nollstall()
    await forbered((m, s, post) => m.minns(s, 'knytt', post), NYTT_KNYTT)
    // Introt kan vara 5 s, presentationen köar efter det och namnet efter den.
    const r = await omgang('n1', Math.max(VANTA, 6000), (rep, fig) => {
      const ny = fig.find((f) => f.ny && f.namn)
      return !!ny && rep.includes(ny.namn)
    })
    const f = r.figurer.find((x) => x.ny)
    ok('N1 det nya knyttet står där, ny', !!f && f.typ === 'knytt' && f.id === `k${NYTT_KNYTT[0]}`, JSON.stringify(r.figurer))
    ok('N1 … och knyttets namn sägs', !!f?.namn && r.repliker.includes(f.namn), `namn ${f?.namn}`)
    presKoll('N1', r)
    slut('N1', r)
  }

  if (ARMAR.has('N2')) {
    await nollstall()
    await forbered((m, s, c) => m.minns(s, 'kompis', c), NY_KOMPIS)
    const r = await omgang('n2', Math.max(VANTA, 6000), (rep) => rep.some((t) => !vanliga.has(t)) && rep.length >= 2)
    const f = r.figurer.find((x) => x.ny)
    ok('N2 den nya kompisen står där, ny', !!f && f.typ === 'kompis', JSON.stringify(r.figurer))
    presKoll('N2', r)
    slut('N2', r)
  }

  if (ARMAR.has('X')) {
    await nollstall()
    const fore = konsol.length
    for (let i = 0; i < 3; i++) {
      await page.evaluate((x) => window.__barnspel.nav.go('game', { id: x }), id)
      await vanta(350)
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await vanta(250)
    }
    await vanta(900)
    const kvar = await page.evaluate(async (mod) => (await import(mod)).levandeFigurer().length, MOD)
    ok('X exit mitt i ×3: ingen figur lever kvar', kvar === 0, `kvar ${kvar}`)
    const nya = konsol.slice(fore)
    ok('X 0 konsolfel', nya.length === 0, nya.slice(0, 3).join(' | '))
  }
} catch (e) {
  if (String(e?.message) !== 'ingen modul') ok('sonden körde klart', false, String(e?.message || e).slice(0, 300))
} finally {
  await browser.close()
}

console.log(`_egnakund ${id}`)
console.log(rader.join('\n'))
console.log(fel ? `\n✗ ${fel} armar föll` : '\n✓ alla armar gröna')
process.exit(fel ? 1 : 0)
