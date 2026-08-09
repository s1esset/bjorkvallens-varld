// Mäter lib/rep.js i tal — utan webbläsare (modulen är rena tal, ingen Pixi i solvern).
//
//   node scripts/_repprobe.mjs
//
// Frågorna en verlet-tråd måste svara ja på innan den får bära ett spel:
// håller den längden, exploderar den aldrig, sitter fästpunkterna still, tar den
// mjukt stopp när man drar för långt, och landar den på golvet i stället för genom det.
import { Rep } from '../src/lib/rep.js'

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}
const kor = (rep, n, per) => { for (let i = 0; i < n; i++) { per?.(i); rep.steg(1) } }

console.log('\nvilolängd: en kedja med fasta segment håller sin längd')
{
  const rep = new Rep({ n: 20, seg: 42, golv: 640 }).bygg(200, 120, (i) => (i < 3 ? -0.3 : 0.78))
  const nominell = 19 * 42
  kor(rep, 240, () => rep.fast(0, 200, 120))
  const L = rep.langd()
  ok('längden inom 3 % av 19 × 42', Math.abs(L - nominell) / nominell < 0.03, `${Math.round(L)} px mot ${nominell}`)
  ok('inga NaN', rep.pts.every((p) => isFinite(p.x) && isFinite(p.y)))
}

console.log('\nfästpunkten står still, även när repet slits i')
{
  const rep = new Rep({ n: 16, seg: 30 }).bygg(400, 100)
  let varst = 0
  kor(rep, 200, (i) => {
    rep.fast(0, 400, 100)
    rep.dra(rep.sista, 400 + Math.sin(i / 6) * 900, 100 + Math.cos(i / 5) * 700, 0.9) // rycк hårt
    varst = Math.max(varst, Math.hypot(rep.pts[0].x - 400, rep.pts[0].y - 100))
  })
  ok('punkt 0 rör sig aldrig', varst < 0.001, `max ${varst.toFixed(5)} px`)
  ok('inga NaN efter ryckningarna', rep.pts.every((p) => isFinite(p.x) && isFinite(p.y)))
}

console.log('\nmjukt stopp: dra längre än kedjan och den tänjs inte')
{
  const rep = new Rep({ n: 20, seg: 40 }).bygg(200, 200)
  const max = 19 * 40
  kor(rep, 300, () => {
    rep.fast(0, 200, 200)
    rep.dra(rep.sista, 200 + 4000, 200, 0.9) // dra långt utanför räckvidden
  })
  const spann = Math.hypot(rep.pts[rep.sista].x - 200, rep.pts[rep.sista].y - 200)
  ok('änden når aldrig förbi kedjans längd', spann <= max * 1.02, `${Math.round(spann)} px mot max ${max}`)
  ok('och kommer ändå NÄRA (den rätas ut)', spann > max * 0.9, `${Math.round(spann)} px`)
}

console.log('\ngolvet: repet lägger sig på marken, inte genom den')
{
  const rep = new Rep({ n: 24, seg: 30, golv: 500 }).bygg(300, 100)
  kor(rep, 400, () => rep.fast(0, 300, 100))
  const under = rep.pts.filter((p) => p.y > 500.5).length
  const pa = rep.pts.filter((p) => Math.abs(p.y - 500) < 1).length
  ok('ingen punkt under golvet', under === 0, `${under} st`)
  ok('flera punkter vilar PÅ golvet', pa >= 3, `${pa} st`)
}

console.log('\nspänd lina mellan två punkter')
{
  const rep = new Rep({ n: 18, grav: 0.6 })
  rep.bygg(100, 100)
  kor(rep, 120, () => rep.spann(100, 100, 900, 140, 1.25)) // slak
  const slak = Math.max(...rep.pts.map((p) => p.y))
  const rep2 = new Rep({ n: 18, grav: 0.6 })
  rep2.bygg(100, 100)
  kor(rep2, 120, () => rep2.spann(100, 100, 900, 140, 0.98)) // spänd
  const spand = Math.max(...rep2.pts.map((p) => p.y))
  ok('slakt rep hänger LÄGRE än spänt', slak > spand + 30, `slak ${Math.round(slak)} px · spänd ${Math.round(spand)} px`)
  ok('båda ändarna sitter där de sattes', Math.hypot(rep.pts[0].x - 100, rep.pts[0].y - 100) < 0.001 && Math.hypot(rep.pts[rep.sista].x - 900, rep.pts[rep.sista].y - 140) < 0.001)
}

console.log('\ntung ände: munstycket ska DINGLA nedåt när handen står still')
{
  const rep = new Rep({ n: 20, seg: 38 }).bygg(300, 200)
  rep.tyngd(rep.sista, 3.2)
  kor(rep, 200, () => { rep.fast(0, 300, 200); rep.dra(rep.sista - 1, 700, 200, 0.4) })
  const grepp = rep.pts[rep.sista - 1]
  const munstycke = rep.pts[rep.sista]
  ok('änden hänger under greppet', munstycke.y > grepp.y + 8, `${Math.round(munstycke.y - grepp.y)} px lägre`)
}

console.log('\nexit')
{
  const rep = new Rep({ n: 12, seg: 20 }).bygg(0, 0)
  rep.destroy()
  rep.steg(1) // ska inte kasta
  ok('steg() efter destroy() är ofarligt', rep.pts.length === 0)
}

console.log(fel === 0 ? '\n✓ repprobe: allt grönt\n' : `\n✗ repprobe: ${fel} fel\n`)
process.exit(fel === 0 ? 0 : 1)
