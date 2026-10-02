// Vite-plugin: när varje spel senast uppdaterades, ur git-historiken, som en virtuell modul.
//
//   import UPPDATERAD from 'virtual:spel-uppdaterad'   // { '<spel-id>': unix-sekunder }
//
// Biblioteket sorterar på det i läget "senast uppdaterade" (🔄). Räknas EN gång när modulen
// laddas (byggstart / dev-serverns start) — appen gör aldrig ett nätanrop eller ett git-anrop.
//
// En commit som rör fler än SVEP spelkataloger är ett svep över hela appen (ett namnbyte, en
// ny hjälpare inkopplad överallt), inte en uppdatering av spelet, och räknas inte: annars hade
// ett enda svep ställt femton spel överst med samma tidsstämpel. Uppmätt 2026-10-02 över 846
// commits under src/games: 811 rör ett spel, 33 rör 2–8, två rör 9 och 15.
//
// ⚠️ Kräver hela historiken. En grund kloning (`actions/checkout` utan `fetch-depth: 0`) ger
// alla spel samma tid, och biblioteket faller då tyst tillbaka på "nyast först". Saknas git
// helt blir kartan tom med samma följd — bygget fäller aldrig på det här.
import { execFileSync } from 'node:child_process'

const VID = 'virtual:spel-uppdaterad'
const RID = '\0' + VID
const SVEP = 8

export function raknaUppdaterad(cwd = process.cwd()) {
  try {
    const ut = execFileSync('git', ['log', '--format=%x00%ct', '--name-only', '--', 'src/games'], {
      cwd, maxBuffer: 1 << 28, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    })
    const karta = {}
    for (const block of ut.split('\0')) {
      const [tid, ...filer] = block.trim().split('\n')
      const t = Number(tid)
      if (!Number.isFinite(t)) continue
      const ids = new Set()
      for (const f of filer) {
        const m = /^src\/games\/([^/]+)\//.exec(f.trim())
        if (m) ids.add(m[1])
      }
      if (ids.size > SVEP) continue
      // git log går nyast först: första träffen per spel är dess senaste uppdatering.
      for (const id of ids) if (!(id in karta)) karta[id] = t
    }
    return karta
  } catch {
    return {}
  }
}

export function spelUppdaterad() {
  let karta = null
  return {
    name: 'spel-uppdaterad',
    resolveId(id) {
      if (id === VID) return RID
    },
    load(id) {
      if (id !== RID) return
      karta ??= raknaUppdaterad()
      return `export default ${JSON.stringify(karta)}`
    },
  }
}
