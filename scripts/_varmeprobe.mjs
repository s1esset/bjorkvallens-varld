// Mäter lib/varme.js i TAL — utan webbläsare (rena tal, som _mjukprobe).
//
//   node scripts/_varmeprobe.mjs
//
// Frågorna värmen måste svara ja på: räknas gradningen EXAKT som spelets trimmade
// formel gjorde (annars är varje rostningstid i appen tyst omtunad), sjunker den
// aldrig när barnet lyfter upp maten och tittar på den (P0: inget misslyckande som
// nollställer), SVALNAR temperaturen när man drar undan — och är svalnandet
// bildrutefritt, så en svagare platta inte ger ett annat spel?
import { Varmefalt } from '../src/lib/varme.js'

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}

// lagerelden i tal: heta zonen (hotX, hotY) med radie hotR, eldens värme `heat`.
const HOT = { x: 640, y: 300, r: 150 }
const HEAT = 0.9

console.log('\nPORTEN: gradningen räknas exakt som lagereldens gamla formel')
{
  // Ordagrant ur src/games/lagerelden/index.js före bytet:
  //   if (dist < hotR) { proximity = 1 - dist/hotR
  //                      _toast = min(1, _toast + (0.1 + heat*0.18) * proximity * (dt/60)) }
  const gammal = (toast, x, y, dtF) => {
    const dist = Math.hypot(x - HOT.x, y - HOT.y)
    if (dist >= HOT.r) return toast
    const proximity = 1 - dist / HOT.r
    return Math.min(1, toast + (0.1 + HEAT * 0.18) * proximity * (dtF / 60))
  }

  const v = new Varmefalt()
  v.kalla('eld', { x: HOT.x, y: HOT.y, radie: HOT.r, styrka: 0.1 + HEAT * 0.18 })
  v.lagg('mat')

  let toast = 0
  let maxDiff = 0
  // En bana som går in i, genom och ut ur den heta zonen — inte bara mitten.
  for (let i = 0; i < 900; i++) {
    const x = HOT.x + Math.cos(i / 70) * 210
    const y = HOT.y + Math.sin(i / 55) * 90
    const dtF = 1 + (i % 3) * 0.25 // varierande bildrutetid, som en riktig ticker
    toast = gammal(toast, x, y, dtF)
    v.flytta('mat', x, y)
    v.steg(dtF)
    maxDiff = Math.max(maxDiff, Math.abs(toast - v.grad('mat')))
  }
  ok('identisk gradning över 900 steg', maxDiff < 1e-12, `största avvikelse ${maxDiff.toExponential(1)} · slut ${v.grad('mat').toFixed(4)}`)
}

console.log('\nP0: gradningen sjunker ALDRIG (barnet får lyfta upp och titta)')
{
  const v = new Varmefalt({ avsvalning: 1.6 })
  v.kalla('eld', { x: HOT.x, y: HOT.y, radie: HOT.r, styrka: 0.5 })
  v.lagg('mat', { x: HOT.x, y: HOT.y })
  for (let i = 0; i < 120; i++) v.steg(1)
  const g1 = v.grad('mat')
  const t1 = v.temp('mat')
  v.flytta('mat', HOT.x, HOT.y - 600) // lyft ur elden
  for (let i = 0; i < 300; i++) v.steg(1)
  ok('gradningen står still utanför elden', v.grad('mat') === g1, `${g1.toFixed(3)} → ${v.grad('mat').toFixed(3)}`)
  ok('temperaturen faller', v.temp('mat') < t1 * 0.05, `${t1.toFixed(3)} → ${v.temp('mat').toFixed(3)}`)
}

console.log('\nsvalnandet är bildrutefritt (30 fps ska inte ge ett annat spel)')
{
  const kor = (dtF, steg) => {
    const v = new Varmefalt({ uppvarmning: 3, avsvalning: 1.6 })
    v.kalla('eld', { x: 0, y: 0, radie: 100, styrka: 0 })
    v.lagg('mat', { x: 0, y: 0, temp: 1 })
    v.flytta('mat', 0, 500) // utanför fältet → ren avsvalning
    for (let i = 0; i < steg; i++) v.steg(dtF)
    return v.temp('mat')
  }
  const a = kor(1, 120) // 60 fps, 2 s
  const b = kor(2, 60) // 30 fps, 2 s
  ok('samma temperatur efter 2 s vid 60 och 30 fps', Math.abs(a - b) < 0.002, `${a.toFixed(4)} vs ${b.toFixed(4)}`)
  const halv = kor(1, 26) // ~0,43 s ≈ ln2/1,6
  ok('halveringstiden stämmer med avsvalningen', Math.abs(halv - 0.5) < 0.02, `temp ${halv.toFixed(3)} efter 0,43 s`)
}

console.log('\nuppvärmningen: het inom en sekund, inte omedelbart')
{
  const v = new Varmefalt({ uppvarmning: 3 })
  v.kalla('eld', { x: 0, y: 0, radie: 100, styrka: 0.3 })
  v.lagg('mat', { x: 0, y: 0 })
  v.steg(1)
  const efterEnRuta = v.temp('mat')
  for (let i = 0; i < 59; i++) v.steg(1)
  const efterEnSek = v.temp('mat')
  ok('inte varm på en bildruta', efterEnRuta < 0.1, efterEnRuta.toFixed(3))
  ok('nästan helvarm efter en sekund', efterEnSek > 0.9, efterEnSek.toFixed(3))
}

console.log('\nfältets form: närhet, radie, flera eldar')
{
  const v = new Varmefalt()
  v.kalla('eld', { x: 0, y: 0, radie: 100, styrka: 1 })
  v.lagg('mat', { x: 50, y: 0 })
  v.steg(1)
  ok('halvvägs in = närhet 0,5', Math.abs(v.narhet('mat') - 0.5) < 1e-9, v.narhet('mat').toFixed(3))
  v.flytta('mat', 100, 0)
  v.steg(1)
  ok('exakt på radien = utanför', v.narhet('mat') === 0)
  // Två eldar bredvid varandra värmer TILLSAMMANS, men närheten är den starkaste.
  const v2 = new Varmefalt()
  v2.kalla('a', { x: -40, y: 0, radie: 100, styrka: 1 })
  v2.kalla('b', { x: 40, y: 0, radie: 100, styrka: 1 })
  v2.lagg('mat', { x: 0, y: 0 })
  v2.steg(1)
  ok('två eldar: gradningen summeras', Math.abs(v2.grad('mat') - (0.6 + 0.6) / 60) < 1e-9, v2.grad('mat').toFixed(5))
  ok('två eldar: närheten är den starkaste', Math.abs(v2.narhet('mat') - 0.6) < 1e-9, v2.narhet('mat').toFixed(3))
  v2.taKalla('b')
  v2.steg(1)
  ok('borttagen källa slutar värma', Math.abs(v2.narhet('mat') - 0.6) < 1e-9)
}

console.log('\nny mat på pinnen + exit-säkerhet')
{
  const v = new Varmefalt()
  v.kalla('eld', { x: 0, y: 0, radie: 100, styrka: 1 })
  v.lagg('mat', { x: 0, y: 0 })
  for (let i = 0; i < 90; i++) v.steg(1)
  ok('gradad', v.grad('mat') > 0.9, v.grad('mat').toFixed(3))
  v.nollstall('mat')
  ok('nollstall ger en kall, orörd bit', v.grad('mat') === 0 && v.temp('mat') === 0)
  v.destroy()
  v.steg(60)
  ok('steg() efter destroy() gör ingenting', v.grad('mat') === 0 && v.temp('mat') === 0)
  ok('okänt namn kraschar inte', v.temp('finns-inte') === 0 && v.grad('finns-inte') === 0)
}

console.log(fel === 0 ? '\nALLT GRÖNT\n' : `\n${fel} FEL\n`)
process.exit(fel ? 1 : 0)
