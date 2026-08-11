// UTPLACERING — slumpa ut föremål utan att de hamnar i vägen för varandra.
//
// ⚠️ DET HÄR ÄR ETT VERKTYG, INTE EN APP-BRED REGEL. Den gäller **när något RÖR SIG
// genom mellanrummen mellan de utslumpade föremålen och kan bli liggande där** — i dag
// är det `flipperspel` och dess kula. Ett spel som slumpar ut dekor, fläckar eller
// fallande föremål har inte det problemet och behöver inte den här filen.
// (Första versionen skrevs som ett P0-krav för alla 73 spel. Ägaren drog tillbaka det
// 2026-08-11: regeln gällde flipperspelet, där kulan fastnade mellan två föremål.)
//
// Bakgrunden: en slumpad stolpe hamnade 70–90 px från väggen, och kulan (56 px) åkte in
// i gapet och blev liggande. Ett gap som är *knappt* större än det som ska passera är
// inte en passage — det är en ficka.
//
// TVÅ SÄKRA MELLANRUM, INGET DÄREMELLAN:
//   · FRI    ≥ passage + marginal   — det som rör sig tar sig igenom med spel kvar
//   · TÄTAT  ≤ passage − TATAT_UNDER — det kommer inte ens IN, alltså kan det inte fastna
// Allt mellan de två är en fälla. `tatatOk` styr om den undre grenen får användas;
// den kräver att föremålen läser som EN klump (dynor som sitter ihop), annars ser det
// ut som ett slarvfel.
//
// `passage` är diametern på det som ska fram:
//   · en fysikkula/ett föremål som rullar  → dess diameter
//   · ett BARNFINGER som ska träffa rätt sak → 96 (P0 TRÄFFYTA), och då är
//     `marginal` 24 exakt P0:s krav på avstånd mellan två träffytor.
//
// Hinder anges som cirkel `{ x, y, r }`, polygon `{ v: [{x,y}, …] }` eller segment
// `{ ax, ay, bx, by, r }`. Varje hinder får bära ett eget `fri`-krav — en yta som
// avgränsar en FÄRDVÄG (vägg, lanväg, ränna) behöver mer luft än ett föremål mitt
// på planen, för färdvägen är den enda vägen förbi.
//
// ⚠️ Läs hindren ur de LEVANDE kropparna om spelet har fysik (`phys.world.bodies`).
// En handskriven hinderlista glömmer alltid något: i `flipperspel` glömde den
// väggarna och lanvägarna, och sonden hittade 1 251 felplaceringar på 1 500 banor.

const KANT_FRI_FAKTOR = 1 // kanten kräver samma frigap som ett föremål, om inte annat sägs

// Avstånd från en punkt till hindrets FAKTISKA kant (inte till dess mittpunkt).
export function avstandTillHinder(h, x, y) {
  if (h.r != null && h.ax == null && h.v == null) return Math.hypot(h.x - x, h.y - y) - h.r
  if (h.ax != null) return punktTillSegment(x, y, h.ax, h.ay, h.bx, h.by) - (h.r || 0)
  let d = Infinity
  for (let i = 0; i < h.v.length; i++) {
    const a = h.v[i]
    const b = h.v[(i + 1) % h.v.length]
    d = Math.min(d, punktTillSegment(x, y, a.x, a.y, b.x, b.y))
  }
  return d - (h.r || 0)
}

function punktTillSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Slumpa ut `antal` föremål i `arena` utan att bryta mot P0 UTPLACERING.
 *
 * @param {object}   o
 * @param {object}   o.arena     { x0, y0, x1, y1 } — ytans INRE kant (väggen, sargen, pappret)
 * @param {object}  [o.falt]     { x0, y0, x1, y1 } — var MITTPUNKTEN får hamna (default hela arenan)
 * @param {number}   o.radie     föremålets radie (eller en funktion(i) som ger den)
 * @param {number}   o.antal     hur många som önskas — färre kan bli lagda, aldrig fler
 * @param {number}   o.passage   diametern på det som ska kunna ta sig fram
 * @param {number}  [o.marginal] extra luft utöver `passage` (default 24 = P0:s avstånd)
 * @param {Array}   [o.hinder]   fasta hinder; varje får bära eget `fri`
 * @param {boolean} [o.tatatOk]  tillåt den TÄTADE grenen (default false)
 * @param {boolean} [o.kantOk]   får föremålet ligga tätt intill arenans kant? (default false)
 * @param {number}  [o.forsok]   antal kast per föremål (default 500)
 * @param {function}[o.slump]    slumpkälla, för deterministiska tester
 * @returns {Array<{x:number,y:number,r:number}>}
 */
export function slumpaUt({
  arena,
  falt = null,
  radie,
  antal,
  passage,
  marginal = 24,
  hinder = [],
  tatatOk = false,
  kantOk = false,
  forsok = 500,
  slump = Math.random,
}) {
  const FRI = passage + marginal
  const TATAT = Math.max(0, passage - 10)
  const rFor = (i) => (typeof radie === 'function' ? radie(i) : radie)
  const rand = (a, b) => a + slump() * (b - a)

  // Ett mellanrum duger om det är FRITT, eller (när det är tillåtet) så TÄTT att
  // ingenting kan ta sig in. Aldrig däremellan. `>= 8` håller isär två föremål som
  // annars hade sett ihopklistrade ut.
  const duger = (gap, fri, slappTatat) =>
    gap >= fri || (slappTatat && gap >= 8 && gap <= TATAT)

  // ⚠️ TÄTAT MOT ETT FAST HINDER ÄR ALLTID OK, och det är inte en genväg: ingenting
  // kan ta sig in MELLAN en vägg och något som ligger tryckt mot den, så där finns
  // ingen ficka att fastna i. Mellan två UTLAGDA föremål är samma sak i stället ett
  // utseendeval (blir de en klump eller ser det slarvigt ut?) — därför `tatatOk`.
  // Blandas de två ihop får man antingen fickor eller en bana som inte går att fylla.

  const lagda = []
  for (let i = 0; i < antal; i++) {
    const r = rFor(i)
    let lagd = null
    // Ren dartkastning — ta FÖRSTA giltiga punkten. ⚠️ Frestelsen att i stället välja
    // den punkt som ligger LÄNGST från de andra är mätt och den är sämre: en girig
    // maximering trycker ut varje nytt föremål mot en kant, ytan fragmenteras och
    // nästa föremål får ingen plats. I `flipperspel` sjönk antalet 6,6 → 3,4 av just
    // det. Slumpen packar bättre än omsorgen; minimiavståndet håller ändå isär dem.
    for (let k = 0; k < forsok && !lagd; k++) {
      const omr = falt || { x0: arena.x0 + r, y0: arena.y0 + r, x1: arena.x1 - r, y1: arena.y1 - r }
      const x = rand(omr.x0, omr.x1)
      const y = rand(omr.y0, omr.y1)

      // Kanterna räknas som hinder — ägarens regel säger uttryckligen "både från
      // kanter och andra element". Utan det hamnar föremålet i en ficka mot väggen.
      const kant = Math.min(x - arena.x0, arena.x1 - x, y - arena.y0, arena.y1 - y) - r
      if (!duger(kant, FRI * KANT_FRI_FAKTOR, kantOk)) continue

      let ok = true
      for (const h of hinder) {
        if (!duger(avstandTillHinder(h, x, y) - r, h.fri ?? FRI, h.tatat !== false)) {
          ok = false
          break
        }
      }
      if (!ok) continue
      for (const l of lagda) {
        if (!duger(Math.hypot(l.x - x, l.y - y) - r - l.r, FRI, tatatOk)) {
          ok = false
          break
        }
      }
      if (ok) lagd = { x, y, r }
    }
    // Får föremålet ingen plats läggs det helt enkelt inte. En bana med ett föremål
    // mindre är en lugnare bana; en bana med ett föremål i vägen är ett trasigt spel.
    if (!lagd) break
    lagda.push(lagd)
  }
  return lagda
}

/**
 * Hinderlista ur en `PhysicsWorld`s levande kroppar. Använd den här i stället för att
 * skriva hindren för hand — motorn vet allt som finns, en handskriven lista gör det inte.
 *
 * @param {object} phys   PhysicsWorld
 * @param {object} [o]
 * @param {string[]} [o.fardvag]  etiketter som avgränsar en FÄRDVÄG och kräver `friFardvag`
 * @param {number} [o.friFardvag]
 * @param {string[]} [o.hoppaOver] etiketter som inte är hinder alls (t.ex. den rörliga kulan)
 */
export function hinderUrFysik(phys, { fardvag = [], friFardvag = null, hoppaOver = [] } = {}) {
  const kroppar = phys?.world?.bodies || phys?.engine?.world?.bodies || []
  const ut = []
  for (const b of kroppar) {
    if (!b.isStatic || hoppaOver.includes(b.label)) continue
    const fri = friFardvag != null && fardvag.includes(b.label) ? friFardvag : undefined
    if (b.circleRadius) ut.push({ x: b.position.x, y: b.position.y, r: b.circleRadius, fri })
    else ut.push({ v: b.vertices.map((p) => ({ x: p.x, y: p.y })), fri })
  }
  return ut
}

/**
 * HITTA FICKOR — var kan det som rullar bli LIGGANDE?
 *
 * `slumpaUt` skyddar mot att något KILAS FAST mellan två föremål. Det räcker inte:
 * kulan kan lika gärna bli liggande OVANPÅ en hylla. Två dynor som sitter ihop
 * (den TÄTADE grenen) släpper inte in kulan mellan sig — men de bildar en sadel som
 * kulan lägger sig i, och ett föremål tätt under taket bildar en avsats. Båda mäter
 * som "korrekt utplacerade" och båda ser för ett barn ut som att spelet hängt sig.
 *
 * Mätt i `flipperspel` (2026-08-11, `scripts/_kilprobe.mjs`): fenan mot lanvägen gav
 * en 1 632 px² ficka i VARJE runda, och dyn-/stolpkluster gav ytterligare en ficka i
 * 6 av 8 rundor. Ägaren såg det som "kulan fastnar".
 *
 * Metoden är rutnät, inte resonemang: föremålets MITTPUNKT får ligga där avståndet
 * till närmaste yta är ≥ `radie` + `luft`. En kula som rullar kan därifrån bara nå
 * celler NEDÅT eller i våg — uppför bara så långt `klattring` px räcker. Når en fri
 * cell aldrig `flyktY` är den en ficka.
 *
 * @param {object}  o
 * @param {object}  o.arena      { x0, y0, x1, y1 } — ytan som ska svepas
 * @param {number}  o.radie      radien på det som rullar
 * @param {Array}   o.hinder     samma format som `slumpaUt` ({x,y,r} · {v} · {ax,ay,bx,by,r})
 * @param {number}  o.flyktY     fri cell på eller under denna höjd = ute (dränet)
 * @param {number} [o.steg]      rutnätets upplösning i px (default 4)
 * @param {number} [o.luft]      extra spel utöver radien innan en passage räknas (default 2)
 * @param {number} [o.klattring] px uppförsbacke som farten får bära (default 12)
 * @param {Array}  [o.flykt]    extra utgångar `{x,y,r}` — en tunnelmynning, ett hål,
 *                              en ränna: når mittpunkten dit är den ute ur fältet
 * @param {object} [o.bas]      förberäknat klarhetsfält från `klarhetsfalt()` för de
 *                              FASTA ytorna. `hinder` blir då bara det som ändras per
 *                              omgång. Utan det kostade svepet 20 ms per kast och
 *                              `flipperspel` tappade en halv sekund på varje ny runda.
 * @returns {Array<{yta:number,x:number,y:number,minx:number,maxx:number,miny:number,maxy:number}>}
 *          fickorna, största först
 */
export function hittaFickor({ arena, radie, hinder = [], flyktY, steg = 4, luft = 2, klattring = 12, flykt = [], bas = null }) {
  if (bas) { arena = bas.arena; steg = bas.steg }
  const kol = Math.floor((arena.x1 - arena.x0) / steg) + 1
  const rad = Math.floor((arena.y1 - arena.y0) / steg) + 1
  const krav = radie + luft
  const fri = new Uint8Array(kol * rad)
  for (let r = 0; r < rad; r++) {
    const y = arena.y0 + r * steg
    for (let c = 0; c < kol; c++) {
      const i = r * kol + c
      if (bas && bas.d[i] < krav) continue // fasta ramen stänger redan cellen
      const x = arena.x0 + c * steg
      let ok = 1
      for (const h of hinder) {
        if (avstandMedInsida(h, x, y) < krav) { ok = 0; break }
      }
      fri[i] = ok
    }
  }

  // Bakåt från dränet: budgeten är hur mycket uppförsbacke som ÅTERSTÅR.
  const niva = Math.max(1, Math.round(klattring / steg) + 1)
  const bast = new Int16Array(kol * rad).fill(-1)
  const ko = []
  for (let r = 0; r < rad; r++) {
    const y = arena.y0 + r * steg
    for (let c = 0; c < kol; c++) {
      const i = r * kol + c
      if (!fri[i] || bast[i] >= 0) continue
      const x = arena.x0 + c * steg
      const ute = y >= flyktY || flykt.some((f) => Math.hypot(f.x - x, f.y - y) <= f.r)
      if (ute) { bast[i] = niva - 1; ko.push(i) }
    }
  }
  while (ko.length) {
    const i = ko.pop()
    const r = (i / kol) | 0
    const c = i % kol
    const b = bast[i]
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue
        const nc = c + dc
        const nr = r + dr
        if (nc < 0 || nc >= kol || nr < 0 || nr >= rad) continue
        const j = nr * kol + nc
        if (!fri[j]) continue
        const nb = b - (r < nr ? 1 : 0) // framåt j→i går uppför om i ligger högre
        if (nb >= 0 && nb > bast[j]) { bast[j] = nb; ko.push(j) }
      }
    }
  }

  // Fria celler som aldrig når dränet klustras ihop.
  const sedd = new Uint8Array(kol * rad)
  const ut = []
  for (let start = 0; start < kol * rad; start++) {
    if (!fri[start] || bast[start] >= 0 || sedd[start]) continue
    sedd[start] = 1
    const stack = [start]
    let n = 0, sx = 0, sy = 0, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
    while (stack.length) {
      const k = stack.pop()
      const kr = (k / kol) | 0
      const kc = k % kol
      const x = arena.x0 + kc * steg
      const y = arena.y0 + kr * steg
      n++; sx += x; sy += y
      if (x < minx) minx = x
      if (x > maxx) maxx = x
      if (y < miny) miny = y
      if (y > maxy) maxy = y
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const nc = kc + dc
          const nr = kr + dr
          if (nc < 0 || nc >= kol || nr < 0 || nr >= rad) continue
          const j = nr * kol + nc
          if (fri[j] && bast[j] < 0 && !sedd[j]) { sedd[j] = 1; stack.push(j) }
        }
      }
    }
    ut.push({ yta: n * steg * steg, x: sx / n, y: sy / n, minx, maxx, miny, maxy })
  }
  return ut.sort((a, b) => b.yta - a.yta)
}

/**
 * Klarhetsfält: avståndet från varje rutnätspunkt till närmaste FASTA yta, en gång.
 * Ytorna i ett spel är nästan alltid mest fasta (väggar, ramper, hinder som står
 * kvar hela spelet) och bara några få rörliga per omgång — då är det slöseri att
 * räkna om hela fältet vid varje kast. Ge resultatet till `hittaFickor({ bas })`.
 *
 * @param {object} o
 * @param {object} o.arena  { x0, y0, x1, y1 }
 * @param {Array}  o.hinder de FASTA hindren
 * @param {number} [o.steg] rutnätets upplösning (måste matcha `hittaFickor`)
 */
export function klarhetsfalt({ arena, hinder, steg = 4 }) {
  const kol = Math.floor((arena.x1 - arena.x0) / steg) + 1
  const rad = Math.floor((arena.y1 - arena.y0) / steg) + 1
  const d = new Float32Array(kol * rad)
  for (let r = 0; r < rad; r++) {
    const y = arena.y0 + r * steg
    for (let c = 0; c < kol; c++) {
      const x = arena.x0 + c * steg
      let m = Infinity
      for (const h of hinder) {
        const a = avstandMedInsida(h, x, y)
        if (a < m) m = a
      }
      d[r * kol + c] = m
    }
  }
  return { arena, steg, kol, rad, d }
}

// Som `avstandTillHinder`, men NEGATIV inuti en polygon. Placeringen frågar bara om
// punkter utanför hindren; fick-svepet frågar om varenda punkt, även de som ligger
// inne i en vägg, och där skulle ett positivt tal göra väggens insida "fri".
function avstandMedInsida(h, x, y) {
  const d = avstandTillHinder(h, x, y)
  if (h.v && d > 0 && inutiPolygon(h.v, x, y)) return -d
  return d
}

function inutiPolygon(v, x, y) {
  let inne = false
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    if ((v[i].y > y) !== (v[j].y > y) &&
        x < ((v[j].x - v[i].x) * (y - v[i].y)) / (v[j].y - v[i].y) + v[i].x) inne = !inne
  }
  return inne
}
