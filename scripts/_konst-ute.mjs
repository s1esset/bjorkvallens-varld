// _konst-ute.mjs — förhandsvisning av grodan-slurps konst-ute.js (träsk, öken, strand).
//
//   node scripts/_konst-ute.mjs [--scen N]      (utan --scen: alla scener)
//
// Ritar varje funktion med realistisk geometri på en EGEN Pixi-duk och sparar
// .test-shots/_konst-ute-N.png. Sidan som laddas är en ren JS-fil ur dev-servern (inte appen), så
// registret — och de andra agenternas filer — laddas aldrig och inga omladdningar river duken.
// Felsöknings-ramar: tunna röda ramar = kropparna (planka/stam/plattform) som konsten ska följa.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const bara = argv.includes('--scen') ? Number(argv[argv.indexOf('--scen') + 1]) : null

async function kor() {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
    const fel = []
    page.on('pageerror', (e) => fel.push(String(e.message)))
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fel.push(m.type() + ': ' + m.text()) })
    await page.goto('http://localhost:5173/scripts/_grodbild-pixi.js', { waitUntil: 'domcontentloaded' })
    const antal = await page.evaluate(async () => {
      const PIXI = await import('/scripts/_grodbild-pixi.js')
      const K = await import('/src/games/grodan-slurp/konst-ute.js')
      const app = new PIXI.Application()
      await app.init({ width: 1280, height: 720, background: 0xbfe6f5, antialias: true })
      app.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'
      document.body.appendChild(app.canvas)
      app.ticker.stop()
      window.__ku = { PIXI, K, app }
      return 1
    })
    if (!antal) throw new Error('ingen duk')
    const scener = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const ut = []
    for (const n of scener) {
      if (bara && n !== bara) continue
      const info = await page.evaluate((n) => {
        const { PIXI, K, app } = window.__ku
        app.stage.removeChildren().forEach((c) => c.destroy({ children: true }))
        const root = new PIXI.Container()
        app.stage.addChild(root)
        const svaj = []
        const upp = []
        const ta = (r) => { if (r?.svaj) svaj.push(...r.svaj); if (r?.uppdatera) upp.push(r.uppdatera); return r }
        const G = () => { const g = new PIXI.Graphics(); root.addChild(g); return g }
        const lager = () => { const c = new PIXI.Container(); root.addChild(c); return c }
        const himmel = (x0, x1, y0) => G().rect(x0, y0, x1 - x0, 528 - y0 + 40).fill(0xbfe6f5)
        const vatten = (x0, x1) => {
          const g = G()
          g.rect(x0, 560, x1 - x0, 220).fill({ color: 0x3f9fc8, alpha: 0.55 })
          g.moveTo(x0, 560).lineTo(x1, 560).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
        }
        const ram = (x, y, w, h, rot = 0) => {
          const c = new PIXI.Container(); c.position.set(x, y); c.rotation = rot; root.addChild(c)
          const g = new PIXI.Graphics(); c.addChild(g)
          g.rect(-w / 2, -h / 2, w, h).stroke({ width: 1.5, color: 0xff2020, alpha: 0.7 })
          g.moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2).stroke({ width: 2, color: 0xff0000, alpha: 0.9 })
        }
        const trad = (sx, sgn, bas, topp) => {
          const hojd = [165, -30, -250]
          const Ls = [300, 420, 360]
          const as = [0.05, -0.04, 0.08]
          const grenar = hojd.map((t, i) => {
            const L = Ls[i]; const a = as[i]
            return { bx: sx + sgn * (L / 2) * Math.cos(a), by: t + 13 + (L / 2) * Math.sin(a), L, rot: sgn * a, topp: t }
          })
          return { sx, sgn, bas, topp, grenar }
        }
        const ramTrad = (geo) => {
          ram(geo.sx, (geo.topp + geo.bas) / 2, 52, geo.bas - geo.topp)
          for (const gr of geo.grenar) ram(gr.bx, gr.by, gr.L, 26, gr.rot)
        }
        const groda = (x, yFot) => {
          const g = G()
          g.ellipse(x, yFot - 30, 34, 30).fill({ color: 0x5aa845, alpha: 0.85 })
          g.circle(x - 14, yFot - 58, 9).fill(0x5aa845).circle(x + 14, yFot - 58, 9).fill(0x5aa845)
        }
        let vy = { x: 0, y: 0, w: 1280, h: 720 }
        if (n === 1) {
          // Alla fyra träden hela, i halv skala.
          himmel(-100, 2700, -760)
          G().rect(-100, 528, 1750, 400).fill(0xe8cf98)
          const d = trad(320, 1, 528, -560); ta(K.ritaTradDod(lager(), d)); ramTrad(d)
          const k = trad(900, -1, 528, -520); ta(K.ritaTradKaktus(lager(), k)); ramTrad(k)
          const l = trad(1400, 1, 528, -600); ta(K.ritaTradLivrad(lager(), l)); ramTrad(l)
          const h = trad(2050, 1, 740, -620); ta(K.ritaTradHopptorn(lager(), h)); ramTrad(h)
          vatten(1650, 2700)
          vy = { x: -60, y: -760, w: 2760, h: 1540 }
        } else if (n === 2) {
          // Träsket i full skala: dött träd, tre tuvor.
          himmel(-100, 1400, -100)
          G().rect(-100, 528, 480, 400).fill(0x5d4630)
          const d = trad(170, 1, 528, -560); ta(K.ritaTradDod(lager(), d)); ramTrad(d)
          ta(K.ritaTuva(lager(), { x: 640, w: 110, topp: 505 })); ram(640, (505 + 740) / 2, 110, 740 - 505)
          ta(K.ritaTuva(lager(), { x: 870, w: 136, topp: 516 })); ram(870, (516 + 740) / 2, 136, 740 - 516)
          ta(K.ritaTuva(lager(), { x: 1110, w: 92, topp: 498 })); ram(1110, (498 + 740) / 2, 92, 740 - 498)
          groda(870, 516)
          vatten(380, 1400)
          vy = { x: 0, y: 40, w: 1280, h: 720 }
        } else if (n === 3) {
          // Öknen: sand, oas med palmer, klippa.
          himmel(-100, 1400, -100)
          ta(K.ritaSand(lager(), { a: -100, b: 360, kant: 360, inat: 1, mark: 528, stil: 'oken' }))
          G().rect(360, 540, 400, 260).fill(0x2a8aa0)
          const F = new PIXI.Container()
          const R = lager()
          ta(K.ritaOas(R, F, { x0: 380, x1: 740, yt: 560 }))
          ta(K.ritaSand(lager(), { a: 760, b: 1400, kant: 760, inat: -1, mark: 528, stil: 'oken' }))
          ta(K.ritaKlippa(lager(), { x: 1080, w: 150, topp: 410, bas: 548 })); ram(1080, (410 + 548) / 2, 150, 548 - 410)
          vatten(360, 760)
          root.addChild(F)
          groda(1080, 410)
          vy = { x: 0, y: 40, w: 1280, h: 720 }
        } else if (n === 4) {
          // Öknen: dyner, kaktusens nedre del, en klippa till.
          himmel(-100, 1400, -100)
          ta(K.ritaSand(lager(), { a: -100, b: 1400, kant: null, mark: 528, stil: 'oken' }))
          const pts = []
          for (let x = 520; x <= 1000; x += 20) { const t = (x - 520) / 480; pts.push(x, 530 - 150 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 1.3)) }
          ta(K.ritaDyn(lager(), { pts, bas: 900 }))
          const pts2 = []
          for (let x = 980; x <= 1400; x += 20) { const t = (x - 980) / 420; pts2.push(x, 530 - 90 * Math.pow(Math.sin(Math.PI * t), 1.5)) }
          ta(K.ritaDyn(lager(), { pts: pts2, bas: 900 }))
          const k = trad(240, 1, 528, -520); ta(K.ritaTradKaktus(lager(), k)); ramTrad(k)
          ta(K.ritaKlippa(lager(), { x: 1180, w: 120, topp: 450, bas: 548 }))
          groda(360, 165)
          vy = { x: 0, y: 40, w: 1280, h: 720 }
        } else if (n === 5) {
          // Stranden: sand, sandslott, parasoll, palm, sluttning, brygga, madrass, sten.
          himmel(-100, 1400, -100)
          ta(K.ritaSand(lager(), { a: -100, b: 520, kant: null, mark: 528, stil: 'strand' }))
          const pts = []
          for (let x = 520; x <= 760; x += 12) { const t = (x - 520) / 240; pts.push(x, 528 + 172 * (t * t * (3 - 2 * t))) }
          ta(K.ritaStrandSlant(lager(), { pts, bas: 900 }))
          ta(K.ritaSandslott(lager(), { x: 120, bas: 528 }))
          ta(K.ritaParasoll(lager(), { x: 360, w: 200, topp: 390 })); ram(360, 390 + 13, 200, 26)
          ta(K.ritaPalm(lager(), { x: 470, bas: 530, h: 330, sgn: 1 }))
          ta(K.ritaBrygga(lager(), { x0: 640, x1: 960, topp: 512 })); ram(800, 525, 320, 26)
          const m = new PIXI.Container(); m.position.set(1050, 553); root.addChild(m)
          const mg = new PIXI.Graphics(); m.addChild(mg); K.ritaLuftmadrass(mg, 150, 0x4fb3e8); ram(1050, 553, 150, 14)
          ta(K.ritaStrandsten(lager(), { x: 1200, w: 100, topp: 470 })); ram(1200, (470 + 740) / 2, 100, 740 - 470)
          groda(360, 390)
          vatten(560, 1400)
          vy = { x: 0, y: 40, w: 1280, h: 720 }
        } else if (n === 6) {
          // Närbilder: badringen med tre ungar (platshållare), tre madrasser, livboj-detalj.
          G().rect(-100, -100, 1500, 1000).fill(0x3f9fc8)
          const b = new PIXI.Container(); b.position.set(330, 330); b.scale.set(2); root.addChild(b)
          const bg = new PIXI.Graphics(); b.addChild(bg); K.ritaBadring(bg, 236)
          const pl = new PIXI.Graphics(); b.addChild(pl)
          for (const [x, y] of [[0, -4], [-62, 2], [62, 3]]) pl.ellipse(x, y - 20, 22, 21).fill({ color: 0x7cc653, alpha: 0.9 }).rect(x - 23, y - 1, 46, 2).fill(0xff0000)
          const b2 = new PIXI.Container(); b2.position.set(330, 560); b2.scale.set(1); root.addChild(b2)
          K.ritaBadring(b2.addChild(new PIXI.Graphics()), 236)
          const farger = [0x4fb3e8, 0xf2c14e, 0xe86a8f]
          farger.forEach((f, i) => {
            const m = new PIXI.Container(); m.position.set(950, 180 + i * 150); m.scale.set(2); root.addChild(m)
            K.ritaLuftmadrass(m.addChild(new PIXI.Graphics()), 150, f)
            const r = m.addChild(new PIXI.Graphics()); r.rect(-75, -7, 150, 14).stroke({ width: 0.8, color: 0xff0000, alpha: 0.8 })
          })
          vy = { x: 0, y: 0, w: 1280, h: 720 }
        } else if (n === 7) {
          // Trädtopparna i full skala: det döda trädet och kaktusen.
          himmel(-100, 1400, -800)
          const d = trad(300, 1, 528, -560); ta(K.ritaTradDod(lager(), d)); ramTrad(d)
          const k = trad(980, -1, 528, -520); ta(K.ritaTradKaktus(lager(), k)); ramTrad(k)
          vy = { x: 0, y: -720, w: 1280, h: 720 }
        } else if (n === 8) {
          // Tornens toppar i full skala: livräddartornet och hopptornet.
          himmel(-100, 1400, -800)
          const l = trad(300, 1, 528, -600); ta(K.ritaTradLivrad(lager(), l)); ramTrad(l)
          const h = trad(900, -1, 740, -620); ta(K.ritaTradHopptorn(lager(), h)); ramTrad(h)
          vy = { x: 0, y: -740, w: 1280, h: 720 }
        } else if (n === 9) {
          // Tornens nedre delar i full skala, där barnet spelar mest.
          himmel(-100, 1400, -100)
          ta(K.ritaSand(lager(), { a: -100, b: 640, kant: 640, inat: 1, mark: 528, stil: 'strand' }))
          const l = trad(260, 1, 528, -600); ta(K.ritaTradLivrad(lager(), l)); ramTrad(l)
          const h = trad(900, 1, 740, -620); ta(K.ritaTradHopptorn(lager(), h)); ramTrad(h)
          groda(420, 165)
          vatten(640, 1400)
          vy = { x: 0, y: 40, w: 1280, h: 720 }
        }
        // Låt ramverkets vaggning och flaggornas våg stå i ett läge mitt i rörelsen.
        const T = 2.3
        for (const s of svaj) if (!s.nod.destroyed) s.nod.rotation = s.amp * Math.sin(T * s.w + s.fas) + s.amp * 0.35 * Math.sin(T * s.w * 2.3 + s.fas * 1.7)
        for (const u of upp) u(T, 1 / 60)
        const sk = Math.min(1280 / vy.w, 720 / vy.h)
        root.scale.set(sk)
        root.position.set(-vy.x * sk, -vy.y * sk)
        // Kontroller: containrar som är träffbara och Graphics med orimliga gränser.
        let traffbara = 0
        let jattar = 0
        let noder = 0
        const gå = (c) => {
          noder++
          if (c.constructor.name === 'Container' && c.eventMode !== 'none' && c !== root && c.parent !== root) traffbara++
          if (c.getLocalBounds && c.constructor.name === 'Graphics') { const bb = c.getBounds(); if (bb.width > 6000 || bb.height > 6000) jattar++ }
          for (const ch of c.children || []) gå(ch)
        }
        gå(root)
        app.renderer.render(app.stage)
        return { n, svaj: svaj.length, upp: upp.length, noder, traffbara, jattar }
      }, n)
      await page.waitForTimeout(150)
      const fil = `.test-shots/_konst-ute-${n}.png`
      await page.screenshot({ path: fil })
      ut.push({ ...info, fil })
    }
    console.log(JSON.stringify({ ut, fel }, null, 1))
  } finally {
    await b.close()
  }
}

// Orkestratorn sparar filer under tiden: en omladdning kan riva sidan — kör om en gång.
try {
  await kor()
} catch (e) {
  console.error('första försöket föll:', e.message, '— kör om')
  await new Promise((r) => setTimeout(r, 1500))
  await kor()
}
