// _konst-inne.mjs — förhandsvisning av grodan-slurps inomhuskonst (konst-inne.js, L7).
//
//   node scripts/_konst-inne.mjs [nr ...]      (utan nr: alla bilder)
//
// Ritar hela rum (vägg + fjärran + golv + göl + två "träd" + stubbe + förgrund) med samma
// geometri som dammen.js ger, i en kameravy (lagren flyttas som lib/kamera.js gör det: världen
// faktor 1, fjärran 0,3, väggen 0), plus översikter och närbilder. Bilderna hamnar i
// .test-shots/_konst-inne-<nr>.png.
//
// Sidan som laddas är en JS-fil ur dev-servern (inte appen): då finns ingen HMR-klient, och en
// annan agents sparning i src/ laddar inte om sidan mitt i en körning. Pixi hämtas via
// _grodbild-pixi.js, så duken och form.js delar EN Pixi-instans.
import { chromium } from 'playwright'

const valda = process.argv.slice(2).map(Number).filter(Number.isFinite)

const STILAR = ['kok', 'vardagsrum', 'badrum']
const BILDER = []
let nr = 1
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'kamera', cam: { x: 40, y: 0 }, tid: 'eftermiddag' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'oversikt', tid: 'morgon' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'kamera', cam: { x: 980, y: -640 }, tid: 'skymning' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'nara', mal: { x: 1450, y: 60 }, zoom: 1.35, tid: 'eftermiddag' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'nara', mal: { x: 1900, y: 340 }, zoom: 1.4, tid: 'eftermiddag' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'nara', mal: { x: 620, y: 560 }, zoom: 1.5, tid: 'eftermiddag' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'kamera', cam: { x: 1280, y: -200 }, tid: 'morgon' })
for (const stil of STILAR) BILDER.push({ nr: nr++, stil, typ: 'nara', mal: { x: 1720, y: 560 }, zoom: 1.3, tid: 'eftermiddag' })

const b = await chromium.launch({ channel: 'chrome', headless: true })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push(String(e.message)))
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
await page.goto('http://localhost:5173/scripts/_grodbild-pixi.js', { waitUntil: 'load' })
await page.evaluate(async () => {
  const PIXI = await import('/scripts/_grodbild-pixi.js')
  // Räkna texturbakningar (nya gradienter): form.js cachar per färg, så en rumstyp ska baka ett
  // begränsat antal första gången och NOLL när samma rum byggs igen.
  window.__bak = 0
  const orig = PIXI.FillGradient.prototype.buildGradient
  PIXI.FillGradient.prototype.buildGradient = function () {
    if (!this.texture) window.__bak++
    return orig.call(this)
  }
  const K = await import('/src/games/grodan-slurp/konst-inne.js')
  const app = new PIXI.Application()
  await app.init({ width: 1280, height: 720, background: 0x202020, antialias: true })
  app.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'
  document.documentElement.appendChild(app.canvas)
  app.ticker.stop()
  window.__KI = { PIXI, K, app }
})

const ut = []
for (const bild of BILDER) {
  if (valda.length && !valda.includes(bild.nr)) continue
  const res = await page.evaluate((spec) => {
    const { PIXI, K, app } = window.__KI
    for (const c of app.stage.removeChildren()) c.destroy({ children: true })
    const { Container, Graphics } = PIXI
    const stil = spec.stil
    const PAL = {
      morgon: { himmel: 0xa7d6ef, horisont: 0xffe2b8, sol: 0xfff0c0 },
      eftermiddag: { himmel: 0x74c0f0, horisont: 0xd4f0fb, sol: 0xffe27a },
      skymning: { himmel: 0x3b3f82, horisont: 0xffa36e, sol: 0xffc07a },
    }
    const VATTEN = {
      kok: { yta: 0xd6ecf2, djup: 0x86aabb, a: 0.45, b: 0.75 },
      vardagsrum: { yta: 0x8fe3e6, djup: 0x2a8ea6, a: 0.4, b: 0.8 },
      badrum: { yta: 0xdff4fb, djup: 0x8ccbe2, a: 0.42, b: 0.7 },
    }[stil]
    const lagg = (p) => { const c = new Container(); p.addChild(c); return c }
    const vagg = lagg(app.stage)
    const fjarran = lagg(app.stage)
    const varld = lagg(app.stage)
    const bakom = lagg(varld)
    const figurer = lagg(varld)
    const vatten = lagg(varld)
    const fram = lagg(varld)
    const svaj = []
    const upp = []
    const ta = (r) => { if (r?.svaj) svaj.push(...r.svaj); if (r?.uppdatera) upp.push(r.uppdatera) }

    ta(K.ritaVagg(vagg, stil, { x0: -240, x1: 1520, y0: -160, y1: 880 }))
    ta(K.ritaVaggFjarran(fjarran, stil, { x0: -260, x1: 1960, pal: PAL[spec.tid] }))

    const gol = { x0: 320, x1: 920, yt: 560, botten: 740, mark: 528 }
    const bitar = [{ a: -300, b: gol.x0 + 30, kant: gol.x0 + 30, inat: 1, mark: 528 }, { a: gol.x1 - 30, b: 2860, kant: gol.x1 - 30, inat: -1, mark: 528 }]
    const golv = { kok: K.ritaBank, vardagsrum: K.ritaGolv, badrum: K.ritaKakel }[stil]
    for (const p of bitar) ta(golv(bakom, p))
    const golF = { kok: K.ritaDiskho, vardagsrum: K.ritaAkvarium, badrum: K.ritaBadkar }[stil]
    ta(golF(bakom, fram, gol))
    // Vattnet (ritas av någon annan i spelet — här en platshållare med biomens färger).
    const vg = new Graphics()
    vg.rect(gol.x0, gol.yt, gol.x1 - gol.x0, 30).fill({ color: VATTEN.yta, alpha: VATTEN.a })
    vg.rect(gol.x0, gol.yt + 30, gol.x1 - gol.x0, gol.botten - gol.yt - 30).fill({ color: VATTEN.djup, alpha: VATTEN.b * 0.8 })
    vg.rect(gol.x0, gol.yt, gol.x1 - gol.x0, 3).fill({ color: 0xffffff, alpha: 0.7 })
    vatten.addChild(vg)

    const tradFor = (sx, sgn) => {
      const grenar = [
        { topp: 165, L: 470, a: 0.03 },
        { topp: -35, L: 360, a: -0.05 },
        { topp: -248, L: 290, a: 0.02 },
      ].map((g) => ({ bx: sx + sgn * (g.L / 2) * Math.cos(g.a), by: g.topp + 13 + (g.L / 2) * Math.sin(g.a), L: g.L, rot: sgn * g.a, topp: g.topp }))
      return { sx, sgn, bas: 528, topp: -490, grenar }
    }
    const trad = { kok: K.ritaTradKokshylla, vardagsrum: K.ritaTradBokhylla, badrum: K.ritaTradBadhylla }[stil]
    ta(trad(bakom, tradFor(1250, 1)))
    ta(trad(bakom, tradFor(2470, -1)))
    const st = { x: 1900, topp: 200, bas: 534, grenar: [] }
    for (const [topp, L, sida] of [[380, 160, 1], [248, 135, -1]]) st.grenar.push({ bx: st.x + sida * (L / 2 + 10), by: topp + 11, L, rot: sida * -0.08, sida })
    const stubbe = { kok: K.ritaStubbeSlevar, vardagsrum: K.ritaStubbeGolvlampa, badrum: K.ritaStubbeDusch }[stil]
    ta(stubbe(bakom, st))

    // Platshållare för skala: en groda (150 px) på bänken och en på ett hyllplan.
    const groda = (x, y) => {
      const g = new Graphics()
      g.ellipse(x, y - 34, 62, 34).fill({ color: 0x5fb24e, alpha: 0.85 })
      g.circle(x + 36, y - 66, 14).circle(x + 10, y - 70, 14).fill({ color: 0x5fb24e, alpha: 0.85 })
      g.circle(x + 36, y - 68, 7).circle(x + 10, y - 72, 7).fill(0xffffff)
      figurer.addChild(g)
    }
    groda(1080, 528)
    groda(1480, 165)

    // Kören (kök: på disksvampen).
    const kor = new Container()
    kor.position.set((gol.x0 + gol.x1) / 2, 690)
    fram.addChild(kor)
    if (stil === 'kok') {
      const sg = new Graphics()
      K.ritaDisksvamp(sg, 236)
      kor.addChild(sg)
    } else {
      const rg = new Graphics()
      rg.ellipse(0, 6, 118, 22).fill({ color: stil === 'badrum' ? 0xff9eb5 : 0x5aa845, alpha: 0.9 })
      kor.addChild(rg)
    }
    for (const dx of [-62, 0, 62]) {
      const u = new Graphics()
      u.ellipse(dx, -20, 22, 21).fill(0x7cc653)
      u.circle(dx - 10, -41, 8).circle(dx + 10, -41, 8).fill(0x7cc653)
      kor.addChild(u)
    }

    // Förgrunden vid kanterna och en mitt i världen.
    // Båda varianterna syns: 1640 och 1800 får var sin (fjärde argumentet tvingar varianten).
    for (const [x, kant, v] of [[14, 'v', true], [2546, 'h', false], [1640, 'h', true], [1800, 'v', false]]) {
      const c = new Container()
      c.position.set(x, 0)
      fram.addChild(c)
      ta(K.ritaFramInne(c, stil, kant, v))
    }

    // Ett ögonblick i animationen.
    const T = 1.7
    for (const s of svaj) if (!s.nod.destroyed) s.nod.rotation = s.amp * Math.sin(T * s.w + s.fas) + s.amp * 0.35 * Math.sin(T * s.w * 2.3 + s.fas * 1.7)
    for (const u of upp) u(T, 1 / 60)

    // Kameran.
    if (spec.typ === 'oversikt') {
      varld.scale.set(0.5)
      varld.position.set(0, 360)
      fjarran.scale.set(0.5)
      fjarran.position.set(130, 360 - 20)
    } else if (spec.typ === 'nara') {
      const z = spec.zoom
      varld.scale.set(z)
      varld.position.set(640 - spec.mal.x * z, 360 - spec.mal.y * z)
      const cx = spec.mal.x - 640
      const cy = spec.mal.y - 360
      fjarran.scale.set(z)
      fjarran.position.set(640 - (640 + cx * 0.3) * z, 360 - (360 + cy * 0.3) * z)
    } else {
      varld.position.set(-spec.cam.x, -spec.cam.y)
      fjarran.position.set(-spec.cam.x * 0.3, -spec.cam.y * 0.3)
    }
    app.renderer.render(app.stage)
    let n = 0
    const rakna = (c) => { n++; for (const k of c.children || []) rakna(k) }
    rakna(app.stage)
    const bak = window.__bak
    window.__bak = 0
    return { noder: n, svaj: svaj.length, upp: upp.length, bak }
  }, bild)
  const fil = `.test-shots/_konst-inne-${bild.nr}.png`
  await page.screenshot({ path: fil })
  ut.push({ fil, stil: bild.stil, typ: bild.typ, ...res })
}
console.log(JSON.stringify({ ut, fel }, null, 1))
await b.close()
