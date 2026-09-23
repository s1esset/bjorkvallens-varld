// Engångshjälp (ÅTGÄRDER V23): byter `X.arc(` mot `bage(X, ` på EXAKTA rader och lägger till
// importen. Varje rad kontrolleras mot förväntad text innan den skrivs — stämmer den inte avbryts
// hela filen. Körs en gång; sparas som spår av vilka rader som ändrades.
//   node scripts/_bageinfo.mjs
import fs from 'node:fs'

const PLATSER = {
  'src/games/flugan-pa-nasan/rummet.js': [[654, 'galler']],
  'src/games/folj-sparet/index.js': [[367, 'g'], [368, 'g']],
  'src/games/gungan/index.js': [[354, 'face']],
  'src/games/kla-pa-nallen/index.js': [[199, 'g'], [215, 'g'], [233, 'g'], [260, 'g']],
  'src/games/knuffa-tornet/index.js': [[1634, 'face']],
  'src/games/magnet-fiske/index.js': [[55, 'g'], [253, 'ce'], [254, 'ce'], [510, 'g'], [522, 'g'], [535, 'g']],
  'src/games/plantera-fron/index.js': [[152, 'sun'], [282, 'g'], [321, 'g']],
  'src/games/rulla-bollen-hem/index.js': [[330, 'frame'], [331, 'frame']],
  'src/games/saftbaren/index.js': [[383, 'g']],
  'src/games/spindelhjalten/index.js': [[1226, 'web']],
  'src/games/spindelnatet/index.js': [[1057, 'bodyWeb']],
  'src/games/studsmatta/index.js': [[524, 'basket']],
  'src/games/vad-forsvann/index.js': [[58, 'g'], [113, 'g'], [147, 'g']],
  'src/games/golvet-ar-lava/index.js': [[417, 'g'], [418, 'g'], [1175, 'body']],
  'src/games/sortera-skrap/index.js': [[189, 'g'], [200, 'g']],
  'src/lib/artikoner.js': [[231, 'g'], [275, 'g'], [610, 'g'], [670, 'g']],
}

for (const [fil, rader] of Object.entries(PLATSER)) {
  const src = fs.readFileSync(fil, 'utf8')
  const nl = src.includes('\r\n') ? '\r\n' : '\n'
  const L = src.split(/\r?\n/)
  for (const [n, v] of rader) {
    const i = n - 1
    const pat = `${v}.arc(`
    if (!L[i].includes(pat)) throw new Error(`${fil}:${n} saknar "${pat}": ${L[i].trim()}`)
    // Kedjade bågar på samma rad: `g.arc(A).arc(B)` → `bage(g, A); bage(g, B)` — båda får
    // en egen startpunkt. Enkla: `g.arc(A)` → `bage(g, A)`.
    const kedja = L[i].indexOf(').arc(', L[i].indexOf(pat))
    if (kedja >= 0) {
      const ind = L[i].match(/^\s*/)[0]
      const forsta = L[i].slice(0, kedja + 1).replace(pat, `bage(${v}, `)
      const resten = L[i].slice(kedja + 1).replace(/^\.arc\(/, `bage(${v}, `)
      L[i] = `${forsta}${nl}${ind}${resten}`
    } else {
      L[i] = L[i].replace(pat, `bage(${v}, `)
    }
  }
  let ut = L.join(nl)
  const rel = fil.startsWith('src/lib/') ? './form.js' : '../../lib/form.js'
  const imp = new RegExp(`import \{([^}]*)\} from '${rel.replace(/\./g, '\.')}'`)
  if (imp.test(ut)) ut = ut.replace(imp, (m, namn) => `import {${namn.replace(/\s*$/, '')}, bage } from '${rel}'`)
  else {
    const sista = [...ut.matchAll(/^import .*$/gm)].pop()
    const pos = sista.index + sista[0].length
    ut = `${ut.slice(0, pos)}${nl}import { bage } from '${rel}'${ut.slice(pos)}`
  }
  fs.writeFileSync(fil, ut)
  console.log(`${fil}: ${rader.length} bågar`)
}
