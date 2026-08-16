// LAYOUT — rummets DJUP, dess PLATSER och reglerna som håller ett gömställe på ett möjligt
// ställe. Ren data och ren matte: filen importerar ingenting alls, varken pixi eller gsap.
// Det är med flit — hela geometrin går då att RÄKNA på i Node (`validera()`), och layouten
// blir en mätning i stället för ett antagande.
//
// ⚠️ EN ENDA SKALFUNKTION. Möbeln, pappas huvud och kompisen i samma gömställe skalas alla
//    av `skala(djup)`. Två oberoende skalor blir inkonsekventa i bild direkt: möbeln krymper
//    men ansiktet gör det inte, och då sticker hjässan upp ur en låda som "borde" dölja den.
//    Samma sak med golvlinjen — `golvY(djup)` är den enda källan till var något står.
//
// ⚠️ P0 VINNER ÖVER DJUPET. En nedskalad träffyta får aldrig gå under 96 px. `varldsHit()`
//    skalar först och KLÄMMER sedan upp till 96 — konsten krymper, träffytan gör det inte.
//    `validera()` mäter det (och avståndet mellan ytorna, och skalets knappar).

const kl01 = (v) => (v > 1 ? 1 : v < 0 ? 0 : v || 0)

// --------------------------------------------------------------------- djup ---

/** 0 = längst bort vid väggen, 1 = närmast kameran. */
export const skala = (djup) => 0.72 + 0.28 * kl01(djup)

/** Golvlinjen följer djupet: längre bort = högre upp i bild. */
export const golvY = (djup) => 560 + 144 * kl01(djup)

/** Väggens fot — golvlinjen på djup 0. Rummet är bandet 560 → 704 → bildkanten. */
export const VAGG_FOT = golvY(0)

/** De tre synliga djupbanden (golvlist · löpare · matta). Rummet ritas mot dem. */
export const BAND = { vagg: golvY(0), mitt: golvY(0.55), fram: golvY(1) }

// ------------------------------------------------------------------ P0-mått ---

export const MIN_TRAFF = 96 // P0 TRÄFFYTA
export const HALO = 24      // P0: osynlig hit-halo runt varje träffyta
export const MIN_AVSTAND = 48 // två träffytor: 24 px halo + 24 px halo som mest kant i kant

// Skalets egna knappar. INGET spelobjekt och ingen träffyta (inte ens halon) får hamna här —
// annars stjäl möbeln en pekning som var menad för hemknappen.
export const SKYDD = [
  { namn: 'hemknapp', x0: 0, y0: -6, x1: 140, y1: 134 },
  { namn: 'hogtalare', x0: 1140, y0: -6, x1: 1280, y1: 720 },
]

// ---------------------------------------------------------------- ansiktet ---
//
// Riggens synliga mått vid `hojd = 300` (räknat ur manifestets silhuett, se rummet.js):
// bredd ~158 px, hjässan 150 px över mitten, hakan 134 px under. De två reglerna varje
// gömställe är byggt mot — och som gäller i LOKALA koordinater, alltså oberoende av djupet
// eftersom möbeln och ansiktet skalas av samma tal:
//     ansY >= kantY + 152      → hjässan hamnar under fram-delens överkant
//     fram-delen täcker till ansY + 134   ELLER ut ur bild
export const ANS_H = 300
export const ANS_BREDD = 158
export const ANS_HAKA = 134
export const ANS_HJASSA = 150

// ----------------------------------------------------------------- platser ---
//
// En PLATS (slot) äger djupet, skalan och golvlinjen; en MÖBEL äger sin form. Att byta plats
// är därför bara att flytta en möbel till en annan plats — den får platsens skala och står
// automatiskt rätt på golvet. Talen nedan är PACKADE mot P0 (se `validera()`), inte valda:
// fyra höga platser + två låga + taket är precis vad 1 140 px användbar bredd rymmer när
// varje träffyta har 24 px halo och minst 48 px till nästa.
//
//   sort   'vagg' står mot bakväggen · 'golv' står fritt på golvet · 'lag' låg sak nära
//          kameran · 'tak' hänger. En sak byter ALDRIG sort — en vägghängd sak får aldrig
//          hamna på golvet och en golvmöbel aldrig på väggen.
//   maxHit den bredaste träffyta platsen rymmer i VÄRLDSKOORDINATER innan grannen är för nära.
export const SLOTS = [
  { id: 'V1', sort: 'vagg', djup: 0.00, x: 135, maxHit: 196 },
  { id: 'V2', sort: 'vagg', djup: 0.00, x: 1008, maxHit: 196 },
  { id: 'G1', sort: 'golv', djup: 0.55, x: 398, maxHit: 220 },
  { id: 'G2', sort: 'golv', djup: 1.00, x: 714, maxHit: 252 },
  { id: 'L1', sort: 'lag', djup: 1.00, x: 130, maxHit: 212 },
  { id: 'L2', sort: 'lag', djup: 1.00, x: 997, maxHit: 212 },
  // Taklampan hänger — `y` är lampskärmens undre rand, inte en golvlinje.
  { id: 'T1', sort: 'tak', djup: 0.50, x: 548, y: 326, maxHit: 244 },
]

export const SLOT = Object.fromEntries(SLOTS.map((s) => [s.id, s]))

/** Ankarpunkt + skala för en plats. Allt annat i spelet räknas ur den här. */
export function platsInfo(slot) {
  return { x: slot.x, y: slot.y != null ? slot.y : golvY(slot.djup), s: skala(slot.djup) }
}

// ------------------------------------------------------------------ möbler ---
//
// Geometrin bor HÄR, inte i ritkoden: `rummet.js` ritar formen, den här tabellen säger var
// pappa står i den och var man trycker. Alla tal är LOKALA (0,0 = golvet, mitten).
//
//   kantY  kanten pappa tittar över
//   ansY   ansiktets mitt när han är gömd
//   hit    träffytan före skalning
//   visW   den ritade formens bredd (för `validera()` — konst och träffyta är två budgetar)
export const MOBLER = {
  // --- vägg (bakre raden) ---
  gardin: { sort: 'vagg', kantY: -298, ansX: 0, ansY: -140, hit: { x: -135, y: -300, w: 270, h: 252 }, visW: 358 },
  dorr: { sort: 'vagg', kantY: -300, ansX: 0, ansY: -142, hit: { x: -125, y: -300, w: 250, h: 252 }, visW: 272 },
  bokhylla: { sort: 'vagg', kantY: -300, ansX: 0, ansY: -142, hit: { x: -105, y: -300, w: 210, h: 252 }, visW: 216 },

  // --- golv (fria möbler) ---
  tvattkorg: { sort: 'golv', kantY: -292, ansX: 0, ansY: -134, hit: { x: -111, y: -292, w: 222, h: 280 }, visW: 248 },
  kartong: { sort: 'golv', kantY: -300, ansX: 0, ansY: -142, hit: { x: -111, y: -300, w: 222, h: 290 }, visW: 240 },
  fatolj: { sort: 'golv', kantY: -288, ansX: 0, ansY: -132, hit: { x: -125, y: -290, w: 250, h: 280 }, visW: 264 },
  leksaklada: { sort: 'golv', kantY: -286, ansX: 0, ansY: -130, hit: { x: -113, y: -288, w: 226, h: 278 }, visW: 240 },

  // --- låga saker närmast kameran ---
  filt: { sort: 'lag', kantY: -118, ansX: 0, ansY: 48, hit: { x: -105, y: -124, w: 210, h: 132 }, visW: 240 },
  kuddhog: { sort: 'lag', kantY: -122, ansX: 0, ansY: 44, hit: { x: -100, y: -124, w: 200, h: 132 }, visW: 240 },
  // ⚠️ KRUKAN ÄR MED FLIT FÖR LITEN — spelets skämt i runda 3. Se rummet.js.
  // `visW` 214 sedan hängbladen kom till — de är där för att täcka fotorutans raka
  // underkant, inte för utseendet (se `byggKruka`). `skamt` gäller HÖJDEN: han sticker upp.
  kruka: { sort: 'lag', kantY: -66, ansX: 0, ansY: -116, hit: { x: -75, y: -122, w: 150, h: 130 }, visW: 214, skamt: true },

  // --- taket ---
  // ⚠️ `kantY` är INTE skärmens överkant, se den långa noten i rummet.js — den är stämd så
  //    att avslöjandet hamnar i bild. `tackY` är den VERKLIGA överkant som täcker honom, och
  //    det är den `validera()` mäter mot. Utan skillnaden går lampan aldrig igenom mätningen.
  lampa: { sort: 'tak', kantY: 60, tackY: -310, ansX: 0, ansY: -142, hit: { x: -140, y: -292, w: 280, h: 280 }, visW: 268 },
}

/** Alla möbelnycklar per sort — katalogen spelet lottar sin uppsättning ur. */
export const KATALOG = Object.keys(MOBLER).reduce((ut, key) => {
  (ut[MOBLER[key].sort] ||= []).push(key)
  return ut
}, {})

// ------------------------------------------------------------- träffytorna ---

/**
 * Träffytan i VÄRLDSKOORDINATER för en möbel på en plats — skalad av djupet och sedan
 * KLÄMD upp till P0:s 96 px. Konsten krymper med avståndet; träffytan har ett golv.
 */
export function varldsHit(key, slot) {
  const m = MOBLER[key]
  const { x, y, s } = platsInfo(slot)
  const cx = x + (m.hit.x + m.hit.w / 2) * s
  const cy = y + (m.hit.y + m.hit.h / 2) * s
  const w = Math.max(MIN_TRAFF, m.hit.w * s)
  const h = Math.max(MIN_TRAFF, m.hit.h * s)
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

/**
 * BYTESREGELN. En möbel får bara stå på en plats där
 *   ⓵ sorten stämmer (vägghängt aldrig på golvet, golvmöbel aldrig på väggen), och
 *   ⓶ dess träffyta ryms i platsens uppmätta bredd (annars kryper den in på grannen).
 * Eftersom platserna är fasta och förhandsmätta kan inget hamna ovanpå något annat, under
 * skalets knappar eller utanför bild — det följer av att bytet BARA går mellan platser.
 */
export function passar(key, slot) {
  const m = MOBLER[key]
  if (!m || !slot) return false
  if (m.sort !== slot.sort) return false
  return varldsHit(key, slot).w <= slot.maxHit + 0.01
}

/**
 * Lottar EN möblering: vilken möbel som står på vilken plats.
 *
 * Ligger här och inte i `index.js` av ett skäl: funktionen är ren (blandningen kommer in som
 * argument), och då går den att köra tiotusen gånger i Node och mäta att varje utfall håller
 * — i stället för att hoppas att lottningen aldrig lämnar en plats tom.
 *
 * ⚠️ SKÄMTET FÅR ALDRIG LOTTAS BORT. Runda 3 är alltid den alldeles för lilla krukan, och ett
 *    skämt som kommer på samma ställe i leken blir en sak barnet KAN och gläds åt i förväg.
 *    Den läggs därför först i sin pool och får därmed alltid en plats.
 */
export function valjUppsattning(blanda) {
  const ut = {}
  const perSort = {}
  for (const slot of SLOTS) (perSort[slot.sort] ||= []).push(slot)
  for (const sort of Object.keys(perSort)) {
    const slots = blanda([...perSort[sort]])
    let pool = blanda([...(KATALOG[sort] || [])])
    const skamt = pool.find((k) => MOBLER[k].skamt)
    if (skamt) pool = [skamt, ...pool.filter((k) => k !== skamt)]
    for (const slot of slots) {
      const key = pool.find((k) => passar(k, slot))
      if (!key) continue
      pool = pool.filter((k) => k !== key)
      ut[slot.id] = key
    }
  }
  return ut
}

/**
 * Vilka par av platser får byta möbel med varandra? Samma sort, och båda möblerna måste
 * PASSA den andres plats. Ren funktion av en möblering, av samma skäl som ovan.
 */
export function bytbaraPar(uppsattning) {
  const perSort = {}
  for (const slot of SLOTS) {
    if (!uppsattning[slot.id]) continue
    ;(perSort[slot.sort] ||= []).push(slot)
  }
  const par = []
  for (const lista of Object.values(perSort)) {
    if (lista.length !== 2) continue
    const [a, b] = lista
    if (!passar(uppsattning[a.id], b) || !passar(uppsattning[b.id], a)) continue
    par.push([a, b])
  }
  return par
}

// ----------------------------------------------------------------- mätning ---

const rectAvstand = (a, b) => {
  const dx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w))
  const dy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h))
  return Math.max(dx, dy) // separerade i X ELLER Y räcker
}

const korsar = (r, z) => r.x < z.x1 && r.x + r.w > z.x0 && r.y < z.y1 && r.y + r.h > z.y0

/**
 * Mäter hela layouten mot P0 och mot bytesreglerna. Returnerar en lista med problem —
 * tom lista = layouten håller för VARJE laglig möbelplacering, inte bara för den som
 * råkar ligga i rummet just nu. Kallas i DEV från index.js och går att köra i ren Node.
 */
export function validera() {
  const fel = []
  const union = []

  for (const slot of SLOTS) {
    const kandidater = Object.keys(MOBLER).filter((k) => passar(k, slot))
    if (!kandidater.length) {
      fel.push(`plats ${slot.id} har ingen möbel som passar`)
      continue
    }
    for (const key of Object.keys(MOBLER)) {
      if (MOBLER[key].sort !== slot.sort) continue
      if (!passar(key, slot)) fel.push(`${key} passar inte på ${slot.id} (träffyta ${varldsHit(key, slot).w.toFixed(1)} > maxHit ${slot.maxHit})`)
    }
    // Den STÖRSTA träffyta platsen någonsin kan bära — det är den som måste hålla avstånd.
    let u = null
    for (const key of kandidater) {
      const r = varldsHit(key, slot)
      if (r.w < MIN_TRAFF - 0.01 || r.h < MIN_TRAFF - 0.01) fel.push(`${key} på ${slot.id}: träffyta ${r.w.toFixed(0)}×${r.h.toFixed(0)} < ${MIN_TRAFF} px (P0)`)
      u = u ? {
        x: Math.min(u.x, r.x), y: Math.min(u.y, r.y),
        w: Math.max(u.x + u.w, r.x + r.w) - Math.min(u.x, r.x),
        h: Math.max(u.y + u.h, r.y + r.h) - Math.min(u.y, r.y),
      } : { ...r }
    }
    union.push({ slot, r: u })

    // Halon får aldrig nå in under skalets knappar.
    const halo = { x: u.x - HALO, y: u.y - HALO, w: u.w + HALO * 2, h: u.h + HALO * 2 }
    for (const z of SKYDD) if (korsar(halo, z)) fel.push(`plats ${slot.id}: träffytans halo når in i ${z.namn}`)
    // …och den ritade konsten inte heller.
    const s = platsInfo(slot).s
    for (const key of kandidater) {
      const halvW = (MOBLER[key].visW / 2) * s
      const konst = { x: slot.x - halvW, y: u.y, w: halvW * 2, h: u.h }
      for (const z of SKYDD) if (korsar(konst, z)) fel.push(`${key} på ${slot.id}: den ritade formen når in i ${z.namn}`)
    }
  }

  for (let i = 0; i < union.length; i++) {
    for (let j = i + 1; j < union.length; j++) {
      const d = rectAvstand(union[i].r, union[j].r)
      if (d < MIN_AVSTAND) fel.push(`${union[i].slot.id} och ${union[j].slot.id} ligger ${d.toFixed(1)} px isär (minst ${MIN_AVSTAND} krävs)`)
    }
  }

  // Gömmer möbeln faktiskt pappa? Två regler ur rummet.js, mätta i lokala koordinater.
  for (const [key, m] of Object.entries(MOBLER)) {
    if (m.skamt) continue
    const tak = m.tackY != null ? m.tackY : m.kantY
    if (m.ansY < tak + 152) fel.push(`${key}: ansY ${m.ansY} < täckande överkant+152 (${tak + 152}) — hjässan sticker upp`)
    if (m.visW < ANS_BREDD + 12) fel.push(`${key}: ritad bredd ${m.visW} täcker inte ansiktets ${ANS_BREDD} px`)
  }

  return fel
}

/** Minsta uppmätta avstånd mellan två träffytor (P0 kräver ≥ MIN_AVSTAND). */
export function minstaAvstand() {
  const u = SLOTS.map((slot) => {
    const kand = Object.keys(MOBLER).filter((k) => passar(k, slot)).map((k) => varldsHit(k, slot))
    return {
      id: slot.id,
      x: Math.min(...kand.map((r) => r.x)),
      y: Math.min(...kand.map((r) => r.y)),
      w: Math.max(...kand.map((r) => r.x + r.w)) - Math.min(...kand.map((r) => r.x)),
      h: Math.max(...kand.map((r) => r.y + r.h)) - Math.min(...kand.map((r) => r.y)),
    }
  })
  let bast = { d: Infinity, par: '' }
  for (let i = 0; i < u.length; i++) {
    for (let j = i + 1; j < u.length; j++) {
      const d = rectAvstand(u[i], u[j])
      if (d < bast.d) bast = { d, par: `${u[i].id}–${u[j].id}` }
    }
  }
  return bast
}

/** Rader att skriva ut när man vill SE talen (används av `validera`-körningar). */
export function tabell() {
  return SLOTS.map((slot) => {
    const { x, y, s } = platsInfo(slot)
    const kand = Object.keys(MOBLER).filter((k) => passar(k, slot))
    const rects = kand.map((k) => varldsHit(k, slot))
    const minW = Math.min(...rects.map((r) => r.w))
    const minH = Math.min(...rects.map((r) => r.h))
    return { plats: slot.id, sort: slot.sort, djup: slot.djup, skala: +s.toFixed(3), x, y, mobler: kand, minTraff: `${minW.toFixed(0)}×${minH.toFixed(0)}` }
  })
}
