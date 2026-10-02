// Kugghjulens maskinmodell — ren logik utan Pixi, så Node kan pröva den (FYSIKPLAN F10).
//
// Tre saker bor här, alla med samma fält som spelet självt använder så att spelet och sonden
// kör EXAKT samma kod:
//
//   1. KOPPLINGEN  `byggKoppling` + `beraknaFaktorer` — vilka hjul som greppar och hur fort varje
//      hjul går jämfört med veven. Utväxlingen bärs av LÄNKEN: ω_v = −ω_u · r_u / r_v (kuggar),
//      +ω_u · r_u / r_v (rak rem). Faktorn teleskoperar: längs en obruten kedja blir den
//      ±r_vev / r_hjul, oavsett vilka mellanhjul som sitter emellan.
//   2. LASTEN      `reflekteradLast` — karusellen (och fläkten) är ett MOTSTÅND vid utgången. Ett
//      hjul med faktor f som bär en last med tröghet J och dämpning b känns vid veven som
//      J·f² och b·f² (energin ½·J·ω² och effekten τ·ω ska vara lika på båda sidor om
//      kuggarna). Ett litet hjul sist (f > 1) är alltså tyngre att veva, ett stort (f < 1) lättare
//      men det går långsammare.
//   3. STEGET      `stegaMaskin` — vevens tröghet, fingerkopplingen och lastens broms, ett fast steg.
//
// P0 MOTGÅNG: lasten får SAKTA NER, aldrig stoppa. Bromsen under vevning är därför klämd till
// `LAST_TAK` av det som kopplingen maximalt orkar dra per steg — det gäller av konstruktion, inte
// för att talen råkar vara små.

const klamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lindra = (d) => Math.atan2(Math.sin(d), Math.cos(d))

// --- Fysikkonstanter (mätta i scripts/_vevprobe.mjs) -------------------------
export const VEV_SNABB = 1.2 // glapp → önskad fart (ger ~9° släp vid normalt vevtempo)
export const VEV_MOMENT = 0.05 // hur mycket farten får ändras per bildruta vid tröghet 1
export const VEV_MAXGAP = 0.3 // ~17°: hårt tak på hur långt handtaget får hamna efter fingret
export const VEV_FRIKTION = 0.9 // svänghjulets avklingning per bildruta (delas med trögheten)
export const VEV_MAXFART = 0.5 // rad/bildruta — taket, så inget kan skena

// Lasterna vid utgången. `J` = tröghet i veven-enheter (veven själv = 1), `b` = dämpning i samma
// skala som vevens friktion (b = 1 fördubblar det svänghjulet tappar per steg). Talen är små med
// flit: lasten ska kännas, inte ta över — se LAST_TAK.
export const LASTER = {
  karusell: { J: 0.4, b: 0.4 }, // karusellen med sin häst hänger på målhjulet
  flakt: { J: 0.25, b: 0.25 }, // fläkten på dubbelhjulets gren
}
export const LAST_TAK = 0.5 // lastens broms får som mest ta så här stor del av kopplingens moment

// --- 1. Kopplingen ------------------------------------------------------------

// Grannlistan över hjul-noder `{ x, y, r }`. Två noder greppar när deras mittavstånd är
// r_a + r_b inom `tol`. `extra` = länkar som geometrin aldrig ger (remmen): `{ i, j, tecken }`.
export function byggKoppling(nodes, tol, extra = []) {
  const n = nodes.length
  const adj = nodes.map(() => [])
  const lank = (i, j, tecken) => {
    adj[i].push({ to: j, tecken })
    adj[j].push({ to: i, tecken })
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i]
      const b = nodes[j]
      if (Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - (a.r + b.r)) < tol) lank(i, j, -1)
    }
  }
  for (const e of extra) lank(e.i, e.j, e.tecken)
  return adj
}

// BFS från nod 0 (veven). Riktning och utväxling bärs av LÄNKEN: kuggar vänder (−1), en rak rem
// behåller (+1), en korsad vänder (−1), och alla för över ytfarten (ω_v = ω_u · r_u / r_v).
export function beraknaFaktorer(nodes, adj) {
  const n = nodes.length
  const depth = new Array(n).fill(-1)
  const factor = new Array(n).fill(0)
  depth[0] = 0
  factor[0] = 1
  const q = [0]
  while (q.length) {
    const u = q.shift()
    for (const e of adj[u]) {
      const v = e.to
      if (depth[v] < 0) {
        depth[v] = depth[u] + 1
        factor[v] = factor[u] * e.tecken * (nodes[u].r / nodes[v].r)
        q.push(v)
      }
    }
  }
  return { depth, factor }
}

// --- 2. Lasten ----------------------------------------------------------------

// `laster` = [{ typ: 'karusell' | 'flakt', f }] för de laster som FAKTISKT hänger på en driven
// kedja. Returnerar lastens tröghet och dämpning sedda från veven: Σ J·f² och Σ b·f².
export function reflekteradLast(laster) {
  let J = 0
  let b = 0
  for (const l of laster) {
    const L = LASTER[l.typ]
    if (!L || !isFinite(l.f)) continue
    J += L.J * l.f * l.f
    b += L.b * l.f * l.f
  }
  return { J, b }
}

// --- 3. Ett fast steg ---------------------------------------------------------

// Läser och skriver samma fält som spelet (`this`) eller en vanlig testkropp:
//   _cranking, _fingerAngle, _fingerVel, _crankAngle, _crankVel
// `J` = total tröghet (bygget + last), `last` = { J, b } ur `reflekteradLast`, `dt` = 1 (fast steg).
export function stegaMaskin(s, J, last, dt = 1) {
  const b = last ? last.b : 0
  if (s._cranking) {
    // Fingret sitter i veven som i en STYV KOPPLING: en fart som stänger glappet, med ett tak på
    // hur snabbt farten får ändras — och det taket är just massan. Stabilt av konstruktion:
    // farten kan aldrig passera sitt mål. Fingrets egen fart är framkoppling, så jämviktsglappet
    // blir noll.
    // ⚠️ Tre tidigare versioner var fel, och alla föll på ett mått i _vevprobe: (1) ren fart utan
    // lägesåterkoppling → handtaget LOSSNADE, 40–100° glapp som aldrig läkte; (2) en FJÄDER →
    // ω = √(K/J), så det K som orkade dra det tunga bygget svängde den tomma veven förbi fingret;
    // (3) målfart = bara gap·SNABB → noll fart vid noll glapp, alltså ett stående glapp i
    // jämvikt. Därför: fart som mål, taket på ändringen = massan, fingrets fart som framkoppling.
    const gap = lindra(s._fingerAngle - s._crankAngle)
    const malVel = s._fingerVel + gap * VEV_SNABB
    const maxAndring = (VEV_MOMENT / J) * dt
    s._crankVel += klamp(malVel - s._crankVel, -maxAndring, maxAndring)
    // Lastens broms. KLÄMD till LAST_TAK av kopplingens moment: lasten kan sakta ner handen men
    // aldrig vinna över den (P0 motgång), hur tung maskinen och hur stor lasten än är.
    if (b > 0) {
      const v = Math.abs(s._crankVel)
      const forlust = Math.min(v * (1 - Math.pow(VEV_FRIKTION, (dt * b) / J)), LAST_TAK * maxAndring)
      s._crankVel -= Math.sign(s._crankVel) * Math.min(forlust, v)
    }
    if (Math.abs(gap) > VEV_MAXGAP) s._crankAngle += (Math.abs(gap) - VEV_MAXGAP) * Math.sign(gap)
  } else {
    // Svänghjulet rullar vidare: tungt bygge rullar längre, last (dämpning) kortare.
    s._crankVel *= Math.pow(VEV_FRIKTION, (dt * (1 + b)) / J)
    if (Math.abs(s._crankVel) < 0.0008) s._crankVel = 0
  }
  s._crankVel = klamp(s._crankVel, -VEV_MAXFART, VEV_MAXFART)
  s._crankAngle += s._crankVel * dt
}
