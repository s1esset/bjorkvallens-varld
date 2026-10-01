// variation.js — slump som inte upprepar sig. Omspelning utan att svårigheten flyttar sig.
//
// Allt går genom Math.random (en sond som seedar den får deterministiska rundor), och inget
// här håller tillstånd mellan anrop utom i den påse du själv äger — ett spel som monteras om
// får alltså en färsk påse i mount(), aldrig en kvarglömd från förra rundan.
//
//   import { nastaVariant, pase, slumpIBand, rundprofil } from '../../lib/variation.js'
//
// ── nastaVariant(lista, forra) ─ ett lotta, aldrig samma som förra gången ──────────────────
//   this._vader = nastaVariant(VADER, this._vader?.id)   // lista av { id, … }; forra = förra ID:t
//   this._tal   = nastaVariant([2, 3, 4, 5], this._tal)  // eller en lista av tal/strängar
//   Slumpar bara mellan ANDRA än förra; en lista med en enda post ger den (ingen annan finns).
//
// ── pase(lista, forra?) ─ en påse: varje post exakt EN gång per varv ───────────────────────
//   const pasen = pase(MOTIV)          // gör i mount(), inte på modulnivå
//   const motiv = pasen.nasta()        // blandat varv; ny blandning när påsen är tom
//   Samma post kommer aldrig två gånger i rad, inte heller över varvsgränsen (den första i ett
//   nytt varv byts mot en annan om den råkade bli samma som varvets sista). `forra` (valfri)
//   är posten som visades just INNAN påsen skapades, t.ex. efter en fast plan.
//   pasen.kvar = så många poster återstår i varvet · pasen.varv = antal varv som påbörjats.
//   Använd pase för INNEHÅLL (motiv, sorter, djur, regler) — det som ska hinna visas alla
//   innan något återkommer. nastaVariant räcker när ingen ska "tas slut".
//
// ── slumpIBand(mitt, spann, val?) ─ slump runt nivåns värde, så svårigheten står kvar ──────
//   slumpIBand(400, 60)                       // 340..460 (flyttal, jämnt fördelat)
//   slumpIBand(400, { min: -40, max: 80 })    // 360..480 (min/max är AVSTÅND från mitt)
//   slumpIBand(3, 1, { heltal: true })        // 2, 3 eller 4 med lika chans (inga halva ändar)
//   slumpIBand(x, 60, { steg: 20 })           // rutnät: mitt-60, mitt-40 … mitt+60
//   slumpIBand(x, 200, { golv: 140, tak: 1140 })   // bandet klipps FÖRE dragningen — ingen
//                                                  // hög av värden som fastnat på kanten
//   slumpIBand(n, 1, { heltal: true, forra })      // aldrig samma som förra rundans värde
//   Bandet är det som bär svårigheten: välj spannet så att den lättaste och svåraste ändan
//   båda är spelbara på nivån. Ligger hela bandet utanför golv/tak klämms `mitt` till dem.
//
// ── rundprofil(fro, forra?) ─ variation för spel som tar slut vid nivåtaket ────────────────
//   Efter taket är svårigheten fast, men barnet ska ändå få en annan runda. Profilen är ett
//   litet knippe slump att mappa på layouten: { fro, sida: -1|1, a, b, c } med a/b/c i 0..1.
//   const p = this._profil = rundprofil(this._runda, this._profil)
//   x = lo + p.a * (hi - lo) · storlek = lo + p.b * (hi - lo) · p.sida = vänster/höger
//   Mot `forra` (förra profilen) byter `sida` sida, och a/b/c landar minst en FJÄRDEDEL ifrån
//   förra värdet — två rundor i rad liknar alltså aldrig varandra. `fro` (rundans nummer)
//   bara följer med i profilen; slumpen kommer ur Math.random.

const nyckel = (v) => (v !== null && typeof v === 'object' && 'id' in v ? v.id : v)

function slump01() {
  return Math.random()
}

/** Lotta nästa ur `lista`, men aldrig samma som `forra` (ett id, ett värde eller en post). */
export function nastaVariant(lista, forra) {
  const k = forra === undefined || forra === null ? undefined : nyckel(forra)
  const val = k === undefined ? lista : lista.filter((v) => nyckel(v) !== k)
  const kalla = val.length ? val : lista
  return kalla[Math.floor(slump01() * kalla.length)]
}

/**
 * En påse: `nasta()` ger varje post i `lista` exakt en gång per varv, i blandad ordning, och
 * aldrig samma post två gånger i rad (heller inte över varvsgränsen).
 * @param {Array} lista        posterna (kopieras; listan du skickar in rörs inte)
 * @param {*} [forra]          post/id som visades precis före, undviks i första dragningen
 */
export function pase(lista, forra) {
  const alla = lista.slice()
  let rest = []
  let senaste = forra === undefined || forra === null ? undefined : nyckel(forra)
  const bag = {
    varv: 0,
    get kvar() {
      return rest.length
    },
    nasta() {
      if (!alla.length) return undefined
      if (!rest.length) {
        rest = alla.slice()
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(slump01() * (i + 1))
          ;[rest[i], rest[j]] = [rest[j], rest[i]]
        }
        bag.varv++
      }
      // Posten som dras är rest[sist]. Är den lika med förra: byt mot en slumpad annan.
      if (senaste !== undefined && rest.length > 1 && nyckel(rest[rest.length - 1]) === senaste) {
        const andra = []
        for (let i = 0; i < rest.length - 1; i++) if (nyckel(rest[i]) !== senaste) andra.push(i)
        if (andra.length) {
          const i = andra[Math.floor(slump01() * andra.length)]
          ;[rest[i], rest[rest.length - 1]] = [rest[rest.length - 1], rest[i]]
        }
      }
      const post = rest.pop()
      senaste = nyckel(post)
      return post
    },
  }
  return bag
}

/**
 * Slump runt `mitt` inom ett band. `spann` = tal (± spann) eller { min, max } (avstånd från mitt).
 * @param {number} mitt
 * @param {number|{min:number,max:number}} spann
 * @param {{heltal?:boolean, steg?:number, golv?:number, tak?:number, forra?:number}} [val]
 */
export function slumpIBand(mitt, spann, val = {}) {
  const { heltal = false, golv, tak, forra } = val
  let steg = val.steg || 0
  if (heltal && !steg) steg = 1
  let lo = typeof spann === 'number' ? mitt - Math.abs(spann) : mitt + spann.min
  let hi = typeof spann === 'number' ? mitt + Math.abs(spann) : mitt + spann.max
  if (lo > hi) [lo, hi] = [hi, lo]
  if (golv !== undefined && lo < golv) lo = golv
  if (tak !== undefined && hi > tak) hi = tak
  if (lo > hi) {
    // Hela bandet låg utanför golv/tak: klämma mitt mot gränserna i stället för att kasta.
    const k = Math.min(Math.max(mitt, golv ?? -Infinity), tak ?? Infinity)
    return heltal ? Math.round(k) : k
  }
  if (!steg) return lo + slump01() * (hi - lo)
  if (heltal) lo = Math.ceil(lo)
  const antal = Math.floor((hi - lo) / steg + 1e-9) + 1
  let k = Math.floor(slump01() * antal)
  if (forra !== undefined && antal > 1) {
    const kForra = Math.round((forra - lo) / steg)
    if (Math.abs(lo + kForra * steg - forra) < 1e-6 && kForra >= 0 && kForra < antal) {
      // Dra bland de ANDRA: ett index lägre och skjut förbi förra.
      k = Math.floor(slump01() * (antal - 1))
      if (k >= kForra) k++
    }
  }
  return lo + k * steg
}

// Dra u i 0..1 som ligger minst `avstand` ifrån `forra` (eller fritt utan förra).
function iSkillnad(forra, avstand) {
  if (typeof forra !== 'number') return slump01()
  const lo = Math.max(0, forra - avstand)
  const hi = Math.min(1, forra + avstand)
  const fri = 1 - (hi - lo)
  const u = slump01() * fri
  return u >= lo ? u + (hi - lo) : u
}

/**
 * Rundprofil för spel vars nivåvariation tar slut: { fro, sida, a, b, c } (a/b/c i 0..1).
 * @param {number} fro        rundans nummer (följer bara med)
 * @param {object} [forra]    förra rundans profil — den nya liknar den aldrig
 */
export function rundprofil(fro, forra) {
  const sida = forra && (forra.sida === 1 || forra.sida === -1) ? -forra.sida : slump01() < 0.5 ? -1 : 1
  return {
    fro,
    sida,
    a: iSkillnad(forra?.a, 0.25),
    b: iSkillnad(forra?.b, 0.25),
    c: iSkillnad(forra?.c, 0.25),
  }
}
