// _konst-djur.mjs — förhandsvisning av grodan-slurps djur.js (hindrens bilder + L7-möblerna) och
// de nya insekterna i insekter.js (gräshoppa, fruktfluga, mal, nyckelpiga) + en korv i deras
// KOST-färger. Ritar på en EGEN Pixi-duk ovanpå dev-sidan (samma mönster som _grodbild.mjs) —
// startar inget spel och navigerar inte i appen.
//
//   node scripts/_konst-djur.mjs [--ark 1,2,3,4]
//
//   ark 1  rullande saker (2×) + djuren (1,4×) i fas T 0,4 — röd ram = fysikkroppens mått
//   ark 2  samma djur i fas T 1,3 (ben, vingar, svans i ett annat läge)
//   ark 3  möblerna i världens koordinater (rad 2: gelé/soffa/puff mitt i darra)
//   ark 4  insekterna 3× (tre exemplar var, flugan som skala) + en korv av de nya insekterna
//   ark 5  närbild 3× (pillerbagge, gädda, mås upp/ned, pappersflygplan, krabba)
//
// Skärmdumpar: .test-shots/_konst-djur-N.png. Tål att dev-servern laddar om sidan mitt i
// (en annan agent sparar filer): varje ark prövas upp till tre gånger.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const ARK = argv.includes('--ark') ? argv[argv.indexOf('--ark') + 1].split(',').map(Number) : [1, 2, 3, 4, 5]

async function rita(page, ark) {
  return page.evaluate(async (ark) => {
    const PIXI = await import('/scripts/_grodbild-pixi.js')
    const D = await import('/src/games/grodan-slurp/djur.js')
    const { Svarm } = await import('/src/games/grodan-slurp/insekter.js')
    const { Bajs } = await import('/src/games/grodan-slurp/bajs.js')
    const { PhysicsWorld } = await import('/src/lib/physics.js')
    document.getElementById('konstduk')?.remove()
    const app = new PIXI.Application()
    await app.init({ width: 1600, height: 900, background: ark === 3 ? 0xf3e7d3 : 0xcfe6d8, antialias: true })
    app.canvas.id = 'konstduk'
    app.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'
    document.body.appendChild(app.canvas)
    app.ticker.stop()
    const st = app.stage
    const text = (t, x, y, s = 15) => {
      const n = new PIXI.Text({ text: t, style: { fontSize: s, fill: 0x223322, fontFamily: 'Arial' } })
      n.anchor.set(0.5, 0)
      n.position.set(x, y)
      st.addChild(n)
    }
    const ram = (par, w, h, farg = 0xff2a2a) => par.addChild(new PIXI.Graphics().rect(-w / 2, -h / 2, w, h).stroke({ width: 1, color: farg, alpha: 0.8 }))
    const ut = { fel: [] }

    if (ark === 1 || ark === 2) {
      const T = ark === 1 ? 0.4 : 1.3
      const rull = [
        ['kokosnot', D.ritaKokosnot, 17], ['buskboll', D.ritaBuskboll, 28], ['badboll', D.ritaBadboll, 26],
        ['apelsin', D.ritaApelsin, 18], ['leksaksboll', D.ritaLeksaksboll, 22], ['droppe', D.ritaDroppe, 11],
        ['tval', D.ritaTval, 0], ['sapbubbla', D.ritaSapbubbla, 34], ['gasbubbla', D.ritaGasbubbla, 26],
      ]
      rull.forEach(([namn, f, r], i) => {
        const c = new PIXI.Container()
        c.position.set(95 + i * 175, 120)
        c.scale.set(2)
        const g = new PIXI.Graphics()
        f(g)
        c.addChild(g)
        if (r) c.addChild(new PIXI.Graphics().circle(0, 0, r).stroke({ width: 0.6, color: 0xff2a2a, alpha: 0.8 }))
        else ram(c, 52, 28)
        if (ark === 2) g.rotation = 1.1
        st.addChild(c)
        text(namn, 95 + i * 175, 200)
      })
      const djur = [
        ['krabba', D.ritaKrabba, 110, 44, 180, 380],
        ['pillerbagge', D.ritaPillerbagge, 160, 60, 520, 380],
        ['katt', D.ritaKatt, 260, 120, 1050, 370],
        ['badanka', D.ritaBadanka, 150, 44, 170, 700],
        ['gadda', D.ritaGadda, 110, 32, 540, 700],
        ['mas', D.ritaMas, 80, 34, 860, 700],
        ['pappersflygplan', D.ritaPappersflygplan, 80, 30, 1160, 700],
      ]
      for (const [namn, f, w, h, x, y] of djur) {
        const c = new PIXI.Container()
        c.position.set(x, y)
        c.scale.set(1.4)
        if (namn === 'badanka') c.addChild(new PIXI.Graphics().rect(-110, 6, 220, 40).fill({ color: 0x4aa3df, alpha: 0.35 }))
        const inne = new PIXI.Container()
        c.addChild(inne)
        const r = f(inne)
        ram(c, w, h)
        r?.uppdatera?.(T, 1 / 60)
        if (namn === 'pillerbagge') for (let i = 0; i < 20; i++) r.uppdatera(T, 1 / 60)
        st.addChild(c)
        text(namn, x, y + h * 0.7 + 60)
      }
      // Måsens vingslag i fem faser (ark 2) längst ned.
      if (ark === 2) {
        for (let i = 0; i < 6; i++) {
          const m = new PIXI.Container()
          m.position.set(330 + i * 190, 845)
          m.scale.set(1.2)
          D.ritaMas(m).uppdatera(i * 0.074, 1 / 60)
          st.addChild(m)
        }
      }
      // Kvarvarande plats: katten spegelvänd (går åt vänster), liten.
      const c = new PIXI.Container()
      c.position.set(1450, 640)
      c.scale.set(-0.6, 0.6)
      const r = D.ritaKatt(c)
      r.uppdatera(T + 0.5, 1 / 60)
      st.addChild(c)
      text('katt (vänster)', 1450, 700)
    }

    if (ark === 5) {
      // Närbild 3× av de små detaljerna (huvuden, ögon, vingspetsar).
      const nara = [
        [D.ritaPillerbagge, 330, 230, 3, 0.4],
        [D.ritaGadda, 1150, 200, 3, 0.4],
        [D.ritaMas, 260, 700, 3, 0],
        [D.ritaMas, 760, 700, 3, 0.37],
        [D.ritaPappersflygplan, 1250, 700, 3, 0],
        [D.ritaKrabba, 1150, 470, 2.2, 0.2],
      ]
      for (const [f, x, y, s, T] of nara) {
        const c = new PIXI.Container()
        c.position.set(x, y)
        c.scale.set(s)
        f(c).uppdatera(T, 1 / 60)
        st.addChild(c)
      }
    }

    if (ark === 3) {
      const rad = (y0) => {
        const R = new PIXI.Container()
        R.position.set(0, y0 - 528)
        st.addChild(R)
        R.addChild(new PIXI.Graphics().rect(0, 528, 1600, 14).fill(0xcfb28a).rect(0, 528, 1600, 2).fill(0x9a7a50))
        return R
      }
      const planka = (R, it) => R.addChild(new PIXI.Graphics().rect(it.x - it.w / 2, it.topp, it.w, 26).stroke({ width: 1, color: 0xff2a2a, alpha: 0.9 }))
      const A = rad(400)
      const B = rad(870)
      const lista = [
        [A, 'gele', D.ritaGele, { x: 120, w: 180, topp: 380 }],
        [A, 'kakfat', D.ritaKakfat, { x: 360, w: 200, topp: 360 }],
        [A, 'soffa', D.ritaSoffa, { x: 730, w: 360, topp: 400 }],
        [A, 'puff', D.ritaPuff, { x: 1060, w: 150, topp: 430 }],
        [A, 'soffbord', D.ritaSoffbord, { x: 1350, w: 280, topp: 420 }],
        [B, 'handfat', D.ritaHandfat, { x: 120, w: 190, topp: 380 }],
        [B, 'pall', D.ritaPall, { x: 320, w: 130, topp: 440 }],
        [B, 'tvattkorg', D.ritaTvattkorg, { x: 510, w: 170, topp: 410 }],
        [B, 'gele darra', D.ritaGele, { x: 720, w: 150, topp: 340 }, true],
        [B, 'soffa darra', D.ritaSoffa, { x: 1060, w: 300, topp: 410 }, true],
        [B, 'puff darra', D.ritaPuff, { x: 1420, w: 170, topp: 440 }, true],
      ]
      const T = 0.9
      for (const [R, namn, f, it, darra] of lista) {
        const r = f(R, { ...it, typ: namn })
        if (!r || !Array.isArray(r.svaj)) ut.fel.push(`${namn}: svaj saknas`)
        for (const s of r?.svaj || []) s.nod.rotation = (s.bas || 0) + s.amp * Math.sin(T * s.w + s.fas)
        if (darra) {
          if (typeof r.darra !== 'function') ut.fel.push(`${namn}: darra saknas`)
          r.darra(1)
          for (let i = 0; i < 5; i++) r.uppdatera(T, 1 / 60)
        } else r?.uppdatera?.(T, 1 / 60)
        planka(R, it)
        text(namn, it.x, R.y + 548, 14)
      }
      // Darrets förlopp: gelé-fjäderns utslag över 2 s (ska dö ut, aldrig växa).
      const tmp = new PIXI.Container()
      const r = D.ritaGele(tmp, { x: 0, w: 150, topp: 340 })
      r.darra(1)
      const j = tmp.children[0].children[1]
      const spar = []
      for (let i = 0; i < 120; i++) {
        r.uppdatera(i / 60, 1 / 60)
        if (i % 10 === 0) spar.push(Math.round(j.scale.y * 1000) / 1000)
      }
      ut.geleScaleY = spar
      tmp.destroy({ children: true })
      // Tål förstörda noder?
      const tmp2 = new PIXI.Container()
      const r2 = D.ritaSoffa(tmp2, { x: 0, w: 300, topp: 400 })
      tmp2.destroy({ children: true })
      try { r2.darra(1); r2.uppdatera(1, 1 / 60) } catch (e) { ut.fel.push('soffa efter destroy: ' + e.message) }
    }

    if (ark === 4) {
      // Svärmens tak är lägre i skärmens hörnkolumner (x < 175 i sin vy) — rutnätet ligger
      // därför på x 240–420 i lagret, och lagret flyttas åt vänster i stället.
      const lager = new PIXI.Container()
      lager.scale.set(3)
      lager.position.set(-560, 0)
      st.addChild(lager)
      const sv = new Svarm({ lager, ytY: 5000, granser: { x0: -2000, x1: 5000, y0: -2000 } })
      const typer = ['fluga', 'grashoppa', 'fruktfluga', 'mal', 'nyckelpiga']
      const ins = []
      typer.forEach((typ, i) => {
        for (let k = 0; k < 3; k++) {
          const x = 240 + k * 90
          const y = 40 + i * 55
          const n = sv.spawn(typ, { x, y, hem: { x, y, r: 40 } })
          ins.push({ n, x, y, k, typ })
        }
      })
      for (let s = 0; s < 90; s++) sv.uppdatera(1 / 60)
      for (const { n, x, y, k } of ins) {
        n.x = x
        n.y = y
        n._s.vandMal = n._s.vandNu = k === 2 ? -1 : 1
      }
      sv.uppdatera(0.0001)
      ut.bredd = ins.filter((o) => o.k === 0).map((o) => `${o.typ}:${Math.round(o.n.view.getBounds().width / 3)}`)
      typer.forEach((typ, i) => text(typ, 1100, 40 * 3 + i * 55 * 3 - 20, 20))
      // Korv i de nya insekternas färger.
      const phys = new PhysicsWorld({ gravityY: 1, walls: [] })
      const bakom = new PIXI.Container()
      const bar = new PIXI.Container()
      const luft = new PIXI.Container()
      const kl = new PIXI.Container()
      kl.position.set(0, 0)
      kl.scale.set(2)
      kl.addChild(bakom, bar, luft)
      st.addChild(kl)
      const bj = new Bajs({ phys, lager: { bakom, bar, luft }, flytvolym: null, grupp: -1 })
      bj.skapa(650, 400, ['grashoppa', 'fruktfluga', 'mal', 'nyckelpiga', 'grashoppa', 'nyckelpiga'])
      bj.skapa(650, 350, ['fluga', 'fruktfluga', 'fruktfluga', 'mal', 'mal'])
      bj.rita(0.5, null)
      text('korv: gräshoppa, fruktfluga, mal, nyckelpiga, gräshoppa, nyckelpiga', 1300, 840, 16)
    }
    app.renderer.render(st)
    return ut
  }, ark)
}

const b = await chromium.launch({ channel: 'chrome', headless: true })
const resultat = []
try {
  const page = await b.newPage({ viewport: { width: 1600, height: 900 } })
  const fel = []
  page.on('pageerror', (e) => fel.push(String(e.message)))
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
  for (const ark of ARK) {
    for (let forsok = 1; forsok <= 3; forsok++) {
      try {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1200)
        const r = await rita(page, ark)
        await page.waitForTimeout(150)
        const finns = await page.evaluate(() => !!document.getElementById('konstduk'))
        if (!finns) throw new Error('duken försvann (omladdning)')
        const fil = `.test-shots/_konst-djur-${ark}.png`
        await page.screenshot({ path: fil })
        resultat.push({ ark, fil, forsok, ...r })
        break
      } catch (e) {
        if (forsok === 3) resultat.push({ ark, fel: String(e.message).slice(0, 300) })
        await page.waitForTimeout(1500)
      }
    }
  }
  console.log(JSON.stringify({ resultat, konsolfel: fel.slice(0, 12) }, null, 1))
} finally {
  await b.close()
}
