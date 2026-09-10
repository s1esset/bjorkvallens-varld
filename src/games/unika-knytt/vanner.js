// vanner.js — VÄNNER I BODEN (poleringsrundan steg 6, 2026-09-10; docens §4 "Senare").
//
// Ren logik, inget Pixi — samma skäl som dna.js: då går den att mäta i node utan webbläsare.
//
// Två grannar i boden som sjunger TRE duetter tillsammans (bodens grannprat, var 5–9:e sekund)
// blir vänner och flyttar in i samma bo. Reglerna:
//   · ett knytt har högst EN vän — en duett med någon annan räknas inte när det redan har en
//   · en vänskap tas ALDRIG bort (P0: ingenting nollställs, ingenting vräks); bara PÅGÅENDE par
//     har ett tak i sparblobben, och de är osynliga räknare, inte något barnet äger
//   · ingen räknare syns, sägs eller antyds någonsin (P0 FOMO) — det enda barnet möter är att
//     två knytt en dag bor ihop
//
// Sparformatet (blobbens `van`): [[a, b, n], …] med a < b (fröna) och n = duetter, där n ≥ 3 är
// vänner. Fröet är knyttets identitet i hela spelet (boden, favoriten `fram`), så paret överlever
// att samlingen växer och ordningen byts.

/** Hur många duetter som gör två grannar till vänner. */
export const DUETTER_TILL_VAN = 3
/** Taket för PÅGÅENDE par i sparblobben. Vänskaper räknas aldrig mot det. */
export const PAGAENDE_TAK = 40

const tal = (x) => (Number.isFinite(x) ? Math.trunc(x) : null)

export function parNyckel(a, b) {
  const x = a >>> 0
  const y = b >>> 0
  return x < y ? `${x}:${y}` : `${y}:${x}`
}

/** Tillståndet: `duett` nyckel → { a, b, n } · `van` frö → väns frö. Aldrig delat med sparad data. */
export function lasVanner(ra) {
  const st = { duett: new Map(), van: new Map() }
  const rader = Array.isArray(ra) ? ra : []
  for (const r of rader) {
    if (!Array.isArray(r) || r.length < 3) continue
    const a = tal(r[0])
    const b = tal(r[1])
    const n = tal(r[2])
    if (a === null || b === null || n === null || n < 1) continue
    const x = Math.min(a >>> 0, b >>> 0)
    const y = Math.max(a >>> 0, b >>> 0)
    if (x === y) continue
    const k = parNyckel(x, y)
    if (st.duett.has(k)) continue
    const nn = Math.min(n, DUETTER_TILL_VAN)
    // Två vänskaper för samma knytt kan bara komma ur trasig data — den första vinner.
    if (nn >= DUETTER_TILL_VAN && (st.van.has(x) || st.van.has(y))) continue
    st.duett.set(k, { a: x, b: y, n: nn })
    if (nn >= DUETTER_TILL_VAN) {
      st.van.set(x, y)
      st.van.set(y, x)
    }
  }
  return st
}

/** Till sparblobben: vänskaper först (alla), sedan de pågående med flest duetter, högst `PAGAENDE_TAK`. */
export function sparaVanner(st) {
  const alla = [...(st?.duett?.values() || [])]
  const vanner = alla.filter((p) => p.n >= DUETTER_TILL_VAN)
  const pagaende = alla.filter((p) => p.n < DUETTER_TILL_VAN).sort((p, q) => q.n - p.n).slice(0, PAGAENDE_TAK)
  return [...vanner, ...pagaende].map((p) => [p.a, p.b, p.n])
}

export function vanTill(st, frO) {
  return st?.van?.get(frO >>> 0) ?? null
}

/**
 * En duett mellan a och b. Returnerar { raknad, blevVanner }. Räknas inte om någon av dem redan
 * har en ANNAN vän, eller om de redan är vänner (då är duetten bara en duett).
 */
export function duett(st, a, b) {
  const x = a >>> 0
  const y = b >>> 0
  if (!st || x === y) return { raknad: false, blevVanner: false }
  const vx = st.van.get(x)
  const vy = st.van.get(y)
  if (vx !== undefined || vy !== undefined) return { raknad: false, blevVanner: false, redan: vx === y }
  const k = parNyckel(x, y)
  const p = st.duett.get(k) || { a: Math.min(x, y), b: Math.max(x, y), n: 0 }
  p.n = Math.min(DUETTER_TILL_VAN, p.n + 1)
  st.duett.set(k, p)
  if (p.n >= DUETTER_TILL_VAN) {
    st.van.set(x, y)
    st.van.set(y, x)
    return { raknad: true, blevVanner: true }
  }
  return { raknad: true, blevVanner: false }
}

/**
 * Slå ihop en SORTERAD lista (bodens poster med `.seed`) till bon: vänner delar ett bo, på den
 * plats den FÖRSTA av dem hade, och den andra lämnar sin plats — listan krymper, inga hål (P0:
 * inga tomma bon). Står bara den ena i listan (en världsflik) bor den ensam.
 */
export function slaIhop(lista, st) {
  const ut = []
  const tagen = new Set()
  const index = new Map()
  ;(lista || []).forEach((p, i) => { if (!index.has(p.seed)) index.set(p.seed, i) })
  ;(lista || []).forEach((p, i) => {
    if (tagen.has(i)) return
    tagen.add(i)
    const f = st?.van?.get(p.seed)
    const j = f === undefined ? undefined : index.get(f)
    if (j !== undefined && !tagen.has(j)) {
      tagen.add(j)
      ut.push([p, lista[j]])
    } else ut.push([p])
  })
  return ut
}
