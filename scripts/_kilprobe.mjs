// KILPROBE — var kan kulan bli liggande, och går sidorna att åka ner i?
//
//   node scripts/_kilprobe.mjs [--varv 5] [--tol 12]      (kräver dev-servern på :5173)
//
// Ägarens speltest 2026-08-11: "flipperspelet kan fortfarande få kulan att fastna samt
// studskuddarna är för nära kanten så kulan kan inte åka under."
//
// Sonden GISSAR INTE måtten — den läser spelets LEVANDE kroppar (`_phys.world.bodies`)
// och räknar på deras verkliga hörn. Två mått faller ut:
//
//  1. LANPROFIL. För varje höjd y: hur bred är den fria remsan för kulans MITTPUNKT
//     längst ut på var sida? Mittpunkten får ligga där avståndet till närmaste yta är
//     ≥ 28 (kulans radie). Är remsan tom på någon höjd är ytterbanan STÄNGD där —
//     precis vad "kulan kan inte åka under" betyder.
//
//  2. FICKOR. Kulans mittpunkt lever i ett eget fritt fält. En kula som rullar kan
//     bara nå celler som ligger nedåt (med `--tol` px tolerans för fart/studs). Kan en
//     fri cell inte nå dränet den vägen är den en FICKA: kulan hamnar där och blir
//     liggande tills fastnar-vakten (2,6 s tystnad) sparkar ut den.
//
// Banan slumpas per runda, så `--varv` bygger om den och mäter varje gång: de fasta
// ytorna (väggar, lanvägar, fenor, snurra, paddlar) är samma varje varv, dynor och
// stolpar nya.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const VARV = Number(opt('--varv', 5))
const TOL = Number(opt('--tol', 12)) // px uppförsbacke som farten får bära kulan
const ID = 'flipperspel'

const BALL_R = 28
const STEG = 2 // rutnätets upplösning i px
const X0 = 258
const X1 = 1022
const Y0 = 140
const Y1 = 760
const FLYKT_Y = 748 // spelets egen drän-gräns (bp.y > TABLE_B + 40)

const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))

// ---- avstånd till en kropp (negativt inuti) -----------------------------------
function segAvst(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function inuti(v, x, y) {
  let inne = false
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    if ((v[i].y > y) !== (v[j].y > y) &&
        x < ((v[j].x - v[i].x) * (y - v[i].y)) / (v[j].y - v[i].y) + v[i].x) inne = !inne
  }
  return inne
}

function avstand(h, x, y) {
  if (h.r != null) return Math.hypot(h.x - x, h.y - y) - h.r
  let d = Infinity
  for (let i = 0; i < h.v.length; i++) {
    const a = h.v[i], b = h.v[(i + 1) % h.v.length]
    d = Math.min(d, segAvst(x, y, a.x, a.y, b.x, b.y))
  }
  return inuti(h.v, x, y) ? -d : d
}

// ---- fältet -------------------------------------------------------------------
function byggFalt(hinder) {
  const kol = Math.round((X1 - X0) / STEG) + 1
  const rad = Math.round((Y1 - Y0) / STEG) + 1
  const fri = new Uint8Array(kol * rad)
  const clr = new Float32Array(kol * rad)
  for (let r = 0; r < rad; r++) {
    const y = Y0 + r * STEG
    for (let c = 0; c < kol; c++) {
      const x = X0 + c * STEG
      let d = Infinity
      for (const h of hinder) {
        const a = avstand(h, x, y)
        if (a < d) d = a
        if (d < BALL_R - 60) break
      }
      clr[r * kol + c] = d
      fri[r * kol + c] = d >= BALL_R ? 1 : 0
    }
  }
  return { kol, rad, fri, clr }
}

// Kan cellen nå dränet genom att RULLA? En kula utan fart kan bara gå NEDÅT eller
// vågrätt — aldrig uppför. (Första versionen tillät `TOL` px uppåt per steg, vilket i
// trappsteg blev obegränsad klättring: allt kunde "fly" och sonden gav falskt grönt.
// Toleransen finns kvar men som en TOTAL budget i en andra, generösare körning.)
function flyktkarta(f, budget = 0) {
  const { kol, rad, fri } = f
  const niv = Math.max(1, Math.round(budget / STEG) + 1) // hur många uppförs-nivåer som spåras
  // bast[i] = största kvarvarande budget (i celler) som cellen kan fly med, -1 = kan inte
  const bast = new Int16Array(kol * rad).fill(-1)
  const ko = []
  for (let r = 0; r < rad; r++) {
    const y = Y0 + r * STEG
    if (y < FLYKT_Y) continue
    for (let c = 0; c < kol; c++) {
      const i = r * kol + c
      if (fri[i] && bast[i] < niv - 1) { bast[i] = niv - 1; ko.push(i) }
    }
  }
  // Dijkstra-liknande: bakåt från dränet. Att gå BAKÅT ett steg NEDÅT (dr=+1 framåt)
  // kostar inget; att gå bakåt uppåt (framåt uppför) drar från budgeten.
  while (ko.length) {
    const i = ko.pop()
    const r = (i / kol) | 0, c = i % kol
    const b = bast[i]
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue
        const nc = c + dc, nr = r + dr
        if (nc < 0 || nc >= kol || nr < 0 || nr >= rad) continue
        const j = nr * kol + nc
        if (!fri[j]) continue
        // framåt (j -> i) går uppåt om i ligger HÖGRE upp, dvs r < nr
        const kostnad = r < nr ? 1 : 0
        const nb = b - kostnad
        if (nb < 0) continue
        if (nb > bast[j]) { bast[j] = nb; ko.push(j) }
      }
    }
  }
  const kan = new Uint8Array(kol * rad)
  for (let i = 0; i < kan.length; i++) kan[i] = bast[i] >= 0 ? 1 : 0
  return kan
}

// Kanalen längs en lanväg: hur brett fritt band har kulans MITTPUNKT ovanför guiden?
// Noll = kulan kan inte färdas där, alltså stängd nerfart.
function kanalprofil(f, guide) {
  const { kol, rad, fri } = f
  const ax = guide.ax, ay = guide.ay, bx = guide.bx, by = guide.by
  const len = Math.hypot(bx - ax, by - ay)
  const ux = (bx - ax) / len, uy = (by - ay) / len
  // normalen som pekar UPP i banan (bort från bordets nedre hörn)
  let nx = -uy, ny = ux
  if (ny > 0) { nx = -nx; ny = -ny }
  const ut = []
  for (let s = 0; s <= len; s += 4) {
    const px = ax + ux * s, py = ay + uy * s
    let start = null, bredd = 0
    for (let d = 0; d <= 220; d += STEG) {
      const x = px + nx * d, y = py + ny * d
      const c = Math.round((x - X0) / STEG), r = Math.round((y - Y0) / STEG)
      const inne = c >= 0 && c < kol && r >= 0 && r < rad && fri[r * kol + c]
      if (inne) { if (start == null) start = d; bredd = d - start + STEG }
      else if (start != null) break
    }
    ut.push({ s, x: px, y: py, start: start ?? 0, bredd: start == null ? 0 : bredd })
  }
  return ut
}

// Fickor = fria celler som INTE kan fly. Klustras för läsbarhet.
function fickor(f, kan) {
  const { kol, rad, fri } = f
  const sedd = new Uint8Array(kol * rad)
  const ut = []
  for (let r = 0; r < rad; r++) {
    for (let c = 0; c < kol; c++) {
      const i = r * kol + c
      if (!fri[i] || kan[i] || sedd[i]) continue
      const ko = [i]
      sedd[i] = 1
      let n = 0, sx = 0, sy = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9
      while (ko.length) {
        const k = ko.pop()
        const kr = (k / kol) | 0, kc = k % kol
        const x = X0 + kc * STEG, y = Y0 + kr * STEG
        n++; sx += x; sy += y
        if (x < minx) minx = x; if (x > maxx) maxx = x
        if (y < miny) miny = y; if (y > maxy) maxy = y
        for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
          const nc = kc + dc, nr = kr + dr
          if (nc < 0 || nc >= kol || nr < 0 || nr >= rad) continue
          const j = nr * kol + nc
          if (fri[j] && !kan[j] && !sedd[j]) { sedd[j] = 1; ko.push(j) }
        }
      }
      ut.push({ n, x: sx / n, y: sy / n, minx, maxx, miny, maxy })
    }
  }
  return ut.sort((a, b) => b.n - a.n)
}

// Ytterbanans profil: den FÖRSTA fria remsan räknat från sidoväggen inåt — inte den
// bredaste. (Bredaste hittade mitten av bordet och gav sonden falskt grönt.)
function lanprofil(f, sida, gransX) {
  const { kol, rad, fri } = f
  const ut = []
  for (let r = 0; r < rad; r++) {
    const y = Y0 + r * STEG
    let x0 = null, x1 = null
    for (let k = 0; k < kol; k++) {
      const c = sida === 'v' ? k : kol - 1 - k
      const x = X0 + c * STEG
      if (sida === 'v' ? x > gransX : x < gransX) break
      if (fri[r * kol + c]) { if (x0 == null) x0 = x; x1 = x }
      else if (x0 != null) break
    }
    ut.push({ y, bredd: x0 == null ? 0 : Math.abs(x1 - x0) + STEG, x0: Math.min(x0 ?? 0, x1 ?? 0), x1: Math.max(x0 ?? 0, x1 ?? 0) })
  }
  return ut
}

// ---- körning ------------------------------------------------------------------
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('pageerror', (e) => console.log('  ! sidfel:', e.message))
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForFunction(() => !!window.__barnspel?.game?._phys, null, { timeout: 20000 })
await page.waitForTimeout(600)

// Flyttar BÅDA fenorna (spegelvänt i x) i det levande spelet, så sonden kan mäta ett
// kandidatläge utan att spelfilen ändras. Kropp + vy + `_fins`-posten följs åt.
const flyttaFenor = (dx, dy) => page.evaluate(([dx2, dy2]) => {
  const g = window.__barnspel.game
  const M = window.__barnspel.__matter || null
  const kroppar = g._phys.world.bodies.filter((b) => b.label === 'sling')
  for (const b of kroppar) {
    const i = b.plugin.fin
    const s = i === 0 ? 1 : -1
    const bas = g._finBas || (g._finBas = g._fins.map((f) => ({ x: f.x, y: f.y })))
    const nx = bas[i].x + s * dx2
    const ny = bas[i].y + dy2
    const d = { x: nx - b.position.x, y: ny - b.position.y }
    b.vertices.forEach((v) => { v.x += d.x; v.y += d.y })
    b.position.x = nx; b.position.y = ny
    b.bounds.min.x += d.x; b.bounds.max.x += d.x
    b.bounds.min.y += d.y; b.bounds.max.y += d.y
    g._fins[i].x = nx; g._fins[i].y = ny
    if (g._fins[i].view && !g._fins[i].view.destroyed) g._fins[i].view.position.set(nx, ny)
  }
  void M
}, [dx, dy])

// `--guide dy` sänker lanvägarnas fäste i sidoväggen (spegelvänt), utan att röra
// spelfilen: gammal kropp bort, ny på plats. Ren mätning — vyn följer inte med.
const flyttaGuider = (dy) => page.evaluate((dy2) => {
  const g = window.__barnspel.game
  const P = g._phys
  const gamla = P.world.bodies.filter((b) => {
    if (b.label !== 'wall' || b.circleRadius) return false
    const v = b.vertices
    let l = 0, ang = 0
    for (let i = 0; i < v.length; i++) {
      const a = v[i], c = v[(i + 1) % v.length]
      const d = Math.hypot(c.x - a.x, c.y - a.y)
      if (d > l) { l = d; ang = Math.atan2(c.y - a.y, c.x - a.x) }
    }
    return Math.min(Math.abs(Math.sin(ang)), Math.abs(Math.cos(ang))) > 0.05
  })
  g._guideBas = g._guideBas || gamla.map((b) => ({ x: b.position.x, y: b.position.y, ang: b.angle }))
  const MID = 640
  gamla.forEach((b, i) => {
    const bas = g._guideBas[i]
    // återskapa ändpunkterna ur bas-läget: pivåänden är den nedre/inre
    const len = 205.0
    const halv = { x: (len / 2) * Math.cos(bas.ang), y: (len / 2) * Math.sin(bas.ang) }
    const vaggAnde = bas.x < MID ? { x: bas.x - halv.x, y: bas.y - halv.y } : { x: bas.x + halv.x, y: bas.y + halv.y }
    const pivAnde = bas.x < MID ? { x: bas.x + halv.x, y: bas.y + halv.y } : { x: bas.x - halv.x, y: bas.y - halv.y }
    const nyVagg = { x: vaggAnde.x, y: vaggAnde.y + dy2 }
    const nlen = Math.hypot(pivAnde.x - nyVagg.x, pivAnde.y - nyVagg.y)
    const nang = Math.atan2(pivAnde.y - nyVagg.y, pivAnde.x - nyVagg.x)
    P.removeBody(b)
    P.rectangle((nyVagg.x + pivAnde.x) / 2, (nyVagg.y + pivAnde.y) / 2, nlen, 24, { isStatic: true, restitution: 0.4, friction: 0.05, label: 'wall', angle: nang })
  })
  return gamla.length
}, dy)

const las = () => page.evaluate(() => {
  const g = window.__barnspel.game
  const ut = []
  for (const b of g._phys.world.bodies) {
    if (b.label === 'ball') continue
    const parts = b.parts.length > 1 ? b.parts.slice(1) : [b]
    for (const p of parts) {
      if (p.circleRadius) ut.push({ label: b.label, x: p.position.x, y: p.position.y, r: p.circleRadius })
      else ut.push({ label: b.label, v: p.vertices.map((q) => ({ x: q.x, y: q.y })) })
    }
  }
  return { hinder: ut, niva: g._level, fenor: g._fins.map((f) => ({ x: f.x, y: f.y })) }
})

console.log(`\nKILPROBE · ${ID} · rutnät ${STEG} px · kula r=${BALL_R} · tolerans ${TOL} px uppåt\n`)

// Lanvägarna hittas bland 'wall'-kropparna: de är de enda som INTE är axelriktade.
function hittaGuider(hinder) {
  const ut = []
  for (const h of hinder) {
    if (h.label !== 'wall' || !h.v) continue
    let ax = 0, ay = 0, bx = 0, by = 0, langst = 0
    for (let i = 0; i < h.v.length; i++) {
      const a = h.v[i], b = h.v[(i + 1) % h.v.length]
      const l = Math.hypot(b.x - a.x, b.y - a.y)
      if (l > langst) { langst = l; ax = a.x; ay = a.y; bx = b.x; by = b.y }
    }
    const ang = Math.atan2(by - ay, bx - ax)
    const axel = Math.min(Math.abs(Math.sin(ang)), Math.abs(Math.cos(ang)))
    if (axel < 0.05) continue // rak vägg
    // centrumlinjen: långsidans mittpunkt förskjuten en halv tjocklek in mot kroppens mitt
    const cx = h.v.reduce((s, q) => s + q.x, 0) / h.v.length
    const cy = h.v.reduce((s, q) => s + q.y, 0) / h.v.length
    const mx = (ax + bx) / 2, my = (ay + by) / 2
    ut.push({ ax: ax + (cx - mx), ay: ay + (cy - my), bx: bx + (cx - mx), by: by + (cy - my), t: langst })
  }
  return ut.sort((a, b) => a.ax - b.ax)
}

let totFickor = 0
let stangdaHojder = { v: 0, h: 0 }
let stangdKanal = 0

// ---- SÖKLÄGE: vilket fenläge ger en RIKTIG nerfart? ---------------------------
// Mäts på den FASTA ramen (väggar, lanvägar, snurra, paddlar i vila) — dynorna
// slumpas ju om kring fenorna ändå. Betyget är den smalaste lankanalen; kravet är
// spelets eget GAP_LANE (100 px) för en färdväg, och noll fickor.
if (args.includes('--sok')) {
  const bas = await las()
  const ram = bas.hinder.filter((h) => !['bumper', 'peg'].includes(h.label))
  console.log(`SÖK · fast ram: ${ram.length} kroppar · kravet är 100 px kanal (GAP_LANE) och 0 fickor\n`)
  const rader = []
  for (let dy = -60; dy <= 10; dy += 10) {
    for (let dx = 0; dx <= 60; dx += 10) {
      await flyttaFenor(dx, dy)
      const { hinder } = await las()
      const h2 = hinder.filter((h) => !['bumper', 'peg'].includes(h.label))
      const f = byggFalt(h2)
      const kan = flyktkarta(f, TOL)
      const fick = fickor(f, kan).filter((p) => p.n * STEG * STEG > 300)
      const gs = hittaGuider(h2)
      let smalast = Infinity
      for (const g of gs) {
        const prof = kanalprofil(f, g)
        for (const p of prof) smalast = Math.min(smalast, p.bredd === 0 ? 0 : p.bredd + 2 * BALL_R)
      }
      const lan = ['v', 'h'].map((s) => lanprofil(f, s, 640).filter((p) => p.y >= 300 && p.y <= 620)
        .reduce((a, b) => Math.min(a, b.bredd === 0 ? 0 : b.bredd + 2 * BALL_R), Infinity))
      rader.push({ dx, dy, kanal: smalast, ytter: Math.min(...lan), fickor: fick.length, fickyta: fick.reduce((s, p) => s + p.n * STEG * STEG, 0) })
    }
  }
  await flyttaFenor(0, 0)
  rader.sort((a, b) => (a.fickor - b.fickor) || (b.kanal - a.kanal) || (b.ytter - a.ytter))
  console.log('  dx   dy   lankanal  ytterbana  fickor (px²)')
  for (const r of rader) {
    const flagga = r.fickor === 0 && r.kanal >= 100 && r.ytter >= 100 ? ' ★' : ''
    console.log(`  ${String(r.dx).padStart(3)}  ${String(r.dy).padStart(3)}   ${n1(r.kanal).padStart(6)}     ${n1(r.ytter).padStart(6)}     ${String(r.fickor).padStart(2)} (${Math.round(r.fickyta)})${flagga}`)
  }
  await browser.close()
  process.exit(0)
}

// `--bild fil.png` ritar ut fältet så ögat kan döma sonden: grått = kulans mittpunkt
// får inte vara här, blått = fritt och kan rulla till dränet, RÖTT = fri men infångad.
const BILD = opt('--bild', '')
async function ritaFalt(f, kan, hinder, fil) {
  const sida = await browser.newPage({ viewport: { width: f.kol, height: f.rad } })
  await sida.setContent('<canvas id="c"></canvas><style>body{margin:0}</style>')
  await sida.evaluate(([kol, rad, fri, kanA, hind, x0, y0, steg]) => {
    const c = document.getElementById('c')
    c.width = kol; c.height = rad
    const g = c.getContext('2d')
    const im = g.createImageData(kol, rad)
    for (let i = 0; i < kol * rad; i++) {
      const p = i * 4
      const [r, gg, b] = !fri[i] ? [40, 38, 60] : kanA[i] ? [70, 130, 220] : [230, 60, 70]
      im.data[p] = r; im.data[p + 1] = gg; im.data[p + 2] = b; im.data[p + 3] = 255
    }
    g.putImageData(im, 0, 0)
    g.strokeStyle = '#ffdd55'; g.lineWidth = 1
    for (const h of hind) {
      g.beginPath()
      if (h.r != null) g.arc((h.x - x0) / steg, (h.y - y0) / steg, h.r / steg, 0, 7)
      else h.v.forEach((q, i) => (i ? g.lineTo((q.x - x0) / steg, (q.y - y0) / steg) : g.moveTo((q.x - x0) / steg, (q.y - y0) / steg)))
      g.closePath(); g.stroke()
    }
  }, [f.kol, f.rad, Array.from(f.fri), Array.from(kan), hinder, X0, Y0, STEG])
  await sida.locator('#c').screenshot({ path: fil })
  await sida.close()
  console.log(`   · fält ritat: ${fil}`)
}

// `--fena dx,dy` provar ett kandidatläge (spegelvänt i x) utan att röra spelfilen.
const FENA = (opt('--fena', '') || '').split(',').map(Number)
const GUIDE = Number(opt('--guide', 0))
if (FENA.length === 2 && FENA.every(isFinite)) {
  await flyttaFenor(FENA[0], FENA[1])
  console.log(`(fenorna flyttade dx=${FENA[0]} dy=${FENA[1]})\n`)
}
if (GUIDE) console.log(`(lanvägarnas väggfäste sänkt ${GUIDE} px — ${await flyttaGuider(GUIDE)} kroppar)\n`)

let dynSumma = 0
for (let varv = 0; varv < VARV; varv++) {
  if (varv > 0) {
    await page.evaluate(() => { const g = window.__barnspel.game; g._level++; g._buildRound(window.__barnspel.ctx) })
    await page.waitForTimeout(350)
    if (FENA.length === 2 && FENA.every(isFinite)) await flyttaFenor(FENA[0], FENA[1])
    if (GUIDE) await flyttaGuider(GUIDE)
  }
  const { hinder, niva, fenor } = await las()
  const f = byggFalt(hinder)
  const kan = flyktkarta(f, TOL)
  const fick = fickor(f, kan).filter((p) => p.n * STEG * STEG > 300) // strunta i enstaka pixlar
  const rakn = hinder.reduce((m, h) => ((m[h.label] = (m[h.label] || 0) + 1), m), {})
  dynSumma += rakn.bumper || 0

  console.log(`── varv ${varv + 1} · nivå ${niva} · kroppar: ${Object.entries(rakn).map(([k, v]) => `${k}×${v}`).join(' ')}`)
  if (varv === 0) console.log(`   fenor: ${fenor.map((x) => `(${n1(x.x)},${n1(x.y)})`).join(' ')}`)

  // Lanprofil: bara det band där lanvägen och fenorna lever (y 430–620).
  for (const [sida, gr] of [['v', 640], ['h', 640]]) {
    const prof = lanprofil(f, sida, gr).filter((p) => p.y >= 420 && p.y <= 620)
    const stangda = prof.filter((p) => p.bredd < STEG)
    const smala = prof.filter((p) => p.bredd >= STEG && p.bredd < 24)
    stangdaHojder[sida] += stangda.length
    const namn = sida === 'v' ? 'vänster' : 'höger'
    if (stangda.length) {
      const ys = stangda.map((p) => p.y)
      console.log(`   ✗ ${namn} ytterbana STÄNGD för mittpunkten på y ${Math.min(...ys)}–${Math.max(...ys)} (${stangda.length} höjder)`)
    } else {
      const min = prof.reduce((a, b) => (b.bredd < a.bredd ? b : a))
      console.log(`   ✓ ${namn} ytterbana öppen · smalast ${n1(min.bredd + 2 * BALL_R)} px på y=${min.y} (x ${n1(min.x0 - BALL_R)}–${n1(min.x1 + BALL_R)})`)
      if (smala.length) console.log(`     (mittpunktsremsan bara ${n1(Math.min(...smala.map((p) => p.bredd)))} px bred — nätt och jämnt)`)
    }
  }

  // Kanalen längs varje lanväg — den väg kulan FAKTISKT tar ner till paddeln.
  for (const [i, g] of hittaGuider(hinder).entries()) {
    const namn = i === 0 ? 'vänster' : 'höger'
    const prof = kanalprofil(f, g)
    const stangd = prof.filter((p) => p.bredd === 0)
    if (stangd.length) {
      stangdKanal += stangd.length
      const p0 = stangd[0], p9 = stangd[stangd.length - 1]
      console.log(`   ✗ ${namn} LANKANAL STÄNGD ${n1(stangd.length * 4)} px av vägen · från (${n1(p0.x)},${n1(p0.y)}) till (${n1(p9.x)},${n1(p9.y)})`)
    } else {
      const min = prof.reduce((a, b) => (b.bredd < a.bredd ? b : a))
      console.log(`   ✓ ${namn} lankanal öppen hela vägen · smalast ${n1(min.bredd + 2 * BALL_R)} px vid (${n1(min.x)},${n1(min.y)})`)
    }
  }

  for (const p of fick.slice(0, 6)) {
    const yta = p.n * STEG * STEG
    // Vilka ytor DÄMMER fickan? De kroppar som ligger närmast dess nedre kant.
    const dam = hinder
      .map((h) => ({ l: h.label, d: avstand(h, p.x, p.maxy) }))
      .filter((o) => o.d < BALL_R + 30).sort((a, b) => a.d - b.d).slice(0, 4)
      .map((o) => `${o.l}@${n1(o.d)}`).join(' ')
    console.log(`   ✗ FICKA ~${Math.round(yta)} px² vid (${n1(p.x)}, ${n1(p.y)}) · x ${p.minx}–${p.maxx} y ${p.miny}–${p.maxy} · dämd av: ${dam || '—'}`)
  }
  if (BILD && varv === 0) await ritaFalt(f, kan, hinder, BILD)
  if (!fick.length) console.log('   ✓ inga fickor — varje fri punkt kan rulla till dränet')
  totFickor += fick.length
}

console.log(`\nSUMMA över ${VARV} varv: ${totFickor} fickor · ${(dynSumma / VARV).toFixed(1)} dynor/varv · stängd lankanal ${stangdKanal} punkter · stängda ytterbanor v${stangdaHojder.v}/h${stangdaHojder.h}\n`)

await browser.close()
process.exit(totFickor || stangdKanal || stangdaHojder.v || stangdaHojder.h ? 1 : 0)
