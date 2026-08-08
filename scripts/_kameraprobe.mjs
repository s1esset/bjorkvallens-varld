// Mäter lib/kamera.js beteende i tal. Bilden (`_kamerabild.mjs`) visar att parallaxen SYNS;
// den här visar att den är rätt: att dödzonen faktiskt håller kameran still, att den hårda
// rutan går före fartsspärren, att skaket avklingar och har tak, att zoomen är klämd och
// aldrig går fortare än P0-golvet, och — viktigast — att en kamera i en värld lika stor som
// vyn är en ren no-op.
//
//   node scripts/_kameraprobe.mjs
//
// Kameran behöver ingen DOM: Pixis Container laddar i Node, och kameran rör bara .position
// och .scale. Därför kan den här sonden köras utan webbläsare, till skillnad från bildsonden.
import { Camera } from '../src/lib/kamera.js'

let fel = 0
const nara = (a, b, tol = 0.5) => Math.abs(a - b) <= tol
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}
// 60 FPS i N sekunder.
const kor = (kam, sek, per) => {
  const steg = Math.round(sek * 60)
  for (let i = 0; i < steg; i++) { per?.(i / 60); kam.update(1000 / 60) }
}

console.log('\nno-op: värld == vy')
{
  const kam = new Camera()
  const mark = kam.parallax(1)
  const mal = { x: 1200, y: 700, destroyed: false }
  kam.follow(mal, { deadzone: 0 })
  kor(kam, 3)
  ok('kameran står kvar', kam.x === 640 && kam.y === 360, `x=${kam.x} y=${kam.y}`)
  ok('lagret står i origo', mark.x === 0 && mark.y === 0)
  ok('ingen rotation', mark.rotation === 0 && kam.root.rotation === 0)
}

console.log('\ndödzon: små rörelser rör inte bilden')
{
  const kam = new Camera({ worldW: 3200 })
  kam.parallax(1)
  const mal = { x: 640, y: 360, destroyed: false }
  kam.follow(mal, { deadzone: 200, lead: 0 })
  kor(kam, 1)
  const start = kam.x
  mal.x = 640 + 80 // inuti dödzonen (halva 200 = 100)
  kor(kam, 2)
  ok('inne i dödzonen: stilla', nara(kam.x, start, 1), `mitt ${start} → ${kam.x.toFixed(1)}`)
  mal.x = 640 + 400 // utanför
  kor(kam, 3)
  ok('utanför dödzonen: följer, men bara till zonens kant',
    nara(kam.x, mal.x - 100, 2),
    `mitt=${kam.x.toFixed(1)} förväntat=${mal.x - 100}`)
}

console.log('\nfartsspärr och hård ruta')
{
  const RUTA = 640 * 0.75 // hardBox × halva vyn
  const kam = new Camera({ worldW: 6000, maxSpeed: 300 })
  kam.parallax(1)
  const mal = { x: 640, y: 360, destroyed: false }
  kam.follow(mal, { deadzone: 0, lead: 0 })
  kor(kam, 0.5)
  // Ett hopp INOM hårda rutan är spärrens jobb: 300 px/s = högst 5 px per bildruta.
  const fore = kam.x
  mal.x = 640 + 360
  kam.update(1000 / 60)
  const flytt = kam.x - fore
  ok('steg inom rutan bromsas av spärren', flytt <= 300 / 60 + 0.01, `${flytt.toFixed(2)} px ≤ ${(300 / 60).toFixed(2)}`)
  ok('utan spärr hade steget varit större', 360 * (1 - Math.exp(-4.5 / 60)) > 300 / 60, 'utjämningen ville 26 px')
  // ...men målet får ändå aldrig lämna bilden: hårda rutan går före spärren.
  mal.x = 3000
  kor(kam, 10)
  const avst = Math.abs(mal.x - kam.x)
  ok('hårda rutan håller målet i bild', avst <= RUTA + 1, `${avst.toFixed(1)} px från mitten ≤ ${RUTA}`)
  // Priset för det: en TELEPORT rycker bilden med, hur låg spärren än är. Det är ett
  // medvetet val (hellre en snabb panorering än en borttappad figur) — och det är därför
  // ett spel som flyttar sin figur långt ska anropa moveTo() själv.
  const kam2 = new Camera({ worldW: 6000, maxSpeed: 10 })
  kam2.parallax(1)
  const m2 = { x: 640, y: 360, destroyed: false }
  kam2.follow(m2, { deadzone: 0, lead: 0 })
  kor(kam2, 0.2)
  const f2 = kam2.x
  m2.x = 5000
  kam2.update(1000 / 60)
  ok('teleport: målet är i bild redan nästa bildruta',
    Math.abs(m2.x - kam2.x) <= RUTA + 1,
    `hoppade ${(kam2.x - f2).toFixed(0)} px — dokumenterat pris`)
}

console.log('\nlead: bilden lägger sig i färdriktningen')
{
  const kam = new Camera({ worldW: 6000 })
  kam.parallax(1)
  const mal = { x: 640, y: 360, destroyed: false }
  kam.follow(mal, { deadzone: 0, lead: 150 })
  kor(kam, 4, () => { mal.x += 300 / 60 }) // 300 px/s åt höger
  const framfor = kam.x - mal.x
  ok('kameran ligger FÖRE målet', framfor > 20, `${framfor.toFixed(1)} px före`)
  ok('leadet är klämt', framfor <= 150 + 1, `${framfor.toFixed(1)} ≤ 150`)
}

console.log('\nklämning mot världens kanter')
{
  const kam = new Camera({ worldW: 2000 })
  kam.parallax(1)
  kam.moveTo(-5000, 360)
  ok('vänsterkant klämd', kam.x === 640, `mitt=${kam.x} (halva vyn)`)
  kam.moveTo(99999, 360)
  ok('högerkant klämd', kam.x === 1360, `mitt=${kam.x} (2000−640)`)
  // Värld mindre än vyn: centrera i stället för att visa tomrum.
  const liten = new Camera({ width: 1280, worldW: 1280, minZoom: 0.9 })
  liten.zoom = 0.9
  liten.parallax(1)
  liten.moveTo(0, 360)
  ok('zoom-ut i liten värld centreras', nara(liten.x, 640, 0.01), `mitt=${liten.x.toFixed(1)}`)
}

console.log('\nskak: tak, avklingning, och vad som INTE skakar')
{
  const kam = new Camera({ worldW: 3200, maxShake: 10 })
  const hud = kam.parallax(0)
  const mark = kam.parallax(1)
  kam.shake(999, 99) // långt över taken
  let max = 0
  kor(kam, 1, () => { max = Math.max(max, Math.abs(mark.x - Math.round(640 - kam.x))) })
  ok('amplituden är klämd till maxShake', max <= 10.01, `max ${max.toFixed(2)} px`)
  ok('varaktigheten är klämd till 0.6 s', kam._shake === null, 'slut efter 1 s')
  ok('faktor 0 skakar inte', hud.x === 0 && hud.y === 0)
  kam.shake(8, 0.4)
  kor(kam, 0.39)
  const sent = Math.abs(kam._sx)
  kam.shake(8, 0.4)
  kor(kam, 0.02)
  ok('avklingat mot slutet', sent < 1, `${sent.toFixed(2)} px kvar vid 97 % av tiden`)
}

console.log('\nzoom: klämd och aldrig snabbare än P0-golvet')
{
  const kam = new Camera({ worldW: 3200, minZoom: 0.85, maxZoom: 1.6 })
  kam.parallax(1)
  kam.zoomTo(9, { duration: 0.01 })
  ok('duration har golv 0.5 s', kam._zoomTw.d >= 0.5, `${kam._zoomTw.d} s`)
  kor(kam, 0.6)
  ok('skalan är klämd till maxZoom', nara(kam.zoom, 1.6, 0.001), `zoom=${kam.zoom.toFixed(3)}`)
  // Mitthållningen mäts MITT i världen. Nära en kant är det rätt att mitten glider — där
  // vinner klämningen mot världskanten, annars hade ett zoom-ut visat tomrum utanför världen.
  kam.moveTo(1600, 360)
  const mittFore = kam.x
  kam.zoomTo(0.1)
  kor(kam, 1.2)
  ok('skalan är klämd till minZoom', nara(kam.zoom, 0.85, 0.001), `zoom=${kam.zoom.toFixed(3)}`)
  ok('mitten hålls under zoomen', nara(kam.x, mittFore, 2), `${kam.x.toFixed(1)} vs ${mittFore.toFixed(1)}`)
  // Vid kanten SKA den glida — och aldrig visa utanför världen.
  kam.moveTo(0, 360)
  kor(kam, 0.1)
  ok('zoom-ut vid kanten visar inte utanför världen',
    kam.x - kam._halfW() >= -0.01, `vänsterkant=${(kam.x - kam._halfW()).toFixed(1)}`)
}

console.log('\nzoom håller ihop lagren (horisonten glider inte)')
{
  // Regressionsvakt för ett fel som fanns i första versionen: skalan interpolerades med
  // lagrets faktor (`1 + (zoom−1)·f`), vilket lät fysikaliskt men gled isär i höjdled —
  // vid zoom 1.4 hamnade markens horisont på skärm-y 874 och fjärranbandets på 673.
  // En zoom ändrar brännvidd; den flyttar inte lagren i förhållande till varandra.
  const kam = new Camera({ worldW: 3200, maxZoom: 1.6 })
  const band = kam.parallax({ x: 0.18, y: 0 })
  const mark = kam.parallax({ x: 1, y: 0 })
  const skarmY = (l, q) => l.y + q * l.scale.y
  const skarmX = (l, q) => l.x + q * l.scale.x
  ok('i utgångsläget är varje lager identiteten',
    nara(skarmX(band, 500), 500, 0.6) && nara(skarmX(mark, 500), 500, 0.6),
    `band=${skarmX(band, 500).toFixed(1)} mark=${skarmX(mark, 500).toFixed(1)}`)
  kam.zoomTo(1.6)
  kor(kam, 0.7)
  const HORISONT = 624
  ok('horisonten hamnar på samma skärm-y i alla lager',
    nara(skarmY(band, HORISONT), skarmY(mark, HORISONT), 0.01),
    `band=${skarmY(band, HORISONT).toFixed(1)} mark=${skarmY(mark, HORISONT).toFixed(1)} vid zoom ${kam.zoom.toFixed(2)}`)
  // ...och panoreringen SKA fortfarande skilja dem åt i sidled — annars finns ingen parallax.
  kam.moveTo(2000, 360)
  ok('panorering skiljer lagren i sidled', Math.abs(skarmX(band, 500) - skarmX(mark, 500)) > 100,
    `${Math.abs(skarmX(band, 500) - skarmX(mark, 500)).toFixed(0)} px isär`)
  // Zoom-in får aldrig avslöja utanför världen i kanten.
  kam.moveTo(99999, 360)
  ok('högerkanten håller vid inzoomning', nara(kam.x + kam._halfW(), 3200, 0.01),
    `synlig högerkant=${(kam.x + kam._halfW()).toFixed(1)}`)
}

console.log('\nbildrutefri utjämning (30 vs 60 FPS)')
{
  const bygg = () => {
    const k = new Camera({ worldW: 6000 })
    k.parallax(1)
    k.follow({ x: 3000, y: 360, destroyed: false }, { deadzone: 0, lead: 0 })
    return k
  }
  const a = bygg(); for (let i = 0; i < 60; i++) a.update(1000 / 60)
  const b = bygg(); for (let i = 0; i < 30; i++) b.update(1000 / 30)
  ok('samma läge efter 1 s', nara(a.x, b.x, 3), `60fps=${a.x.toFixed(1)} 30fps=${b.x.toFixed(1)}`)
}

console.log('\nexit-säkerhet')
{
  const kam = new Camera({ worldW: 3200 })
  const mark = kam.parallax(1)
  const mal = { x: 2000, y: 360, destroyed: false }
  kam.follow(mal, {})
  kam.shake(8, 0.5)
  kam.zoomTo(1.4)
  kor(kam, 0.1)
  kam.destroy()
  let kraschade = null
  try { kam.update(16.7); kam.update(16.7) } catch (e) { kraschade = e.message }
  ok('update efter destroy kraschar inte', !kraschade, kraschade || '')
  ok('lagret är förstört', mark.destroyed)
  // Målet försvinner mitt i följningen (vanligaste kraschen: figuren förstörs vid mål).
  const k2 = new Camera({ worldW: 3200 })
  k2.parallax(1)
  const m2 = { x: 2000, y: 360, destroyed: false }
  k2.follow(m2, {})
  kor(k2, 0.2)
  m2.destroyed = true
  let k2fel = null
  try { kor(k2, 0.3) } catch (e) { k2fel = e.message }
  ok('förstört mål stoppar följningen utan krasch', !k2fel, k2fel || '')
}

console.log(fel ? `\n✗ ${fel} fel\n` : '\n✓ allt grönt\n')
process.exit(fel ? 1 : 0)
