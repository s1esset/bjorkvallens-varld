// Isbitar i saftglasen (FYSIKPLAN F6a, kund 1).
//
// Ren simulering — inga Pixi-objekt, ingen ljud, ingen gsap — så att `scripts/_dag-saftbaren.mjs`
// kan köra EXAKT den här koden i Node. Spelet äger vyerna (`skapaVy`/`rivVy`) och ljuden
// (`paKlink`, `paPlums`, …); här bor bara fysiken.
//
// VARFÖR EGNA ENKLA KROPPAR och inte matter: saftbaren har ingen PhysicsWorld, och en isbit lever
// i ett GLAS som flyttas, bärs och lutas 126° av spelets egna tweens. Hade isen varit en matter-kropp
// i världsrymd hade glasväggarna fått bli kinematiska kroppar som teleporteras flera hundra px per
// bildruta — tunnling och en is som rymmer ur glaset. Här bor isen i glasets EGET koordinatsystem
// (origo = glasets fot, som `_stats`/`_carryAll`) och klämms mot innerväggarna varje steg: den KAN
// inte lämna glaset, hur glaset än rör sig. Glasets rörelse kommer in som tröghet (en skjuten kopp
// får isen att hasa åt andra hållet) och lutningen som en roterad tyngdkraft.
//
// Det som ÄR matter-lik är gränssnittet mot vätskan: varje isbit bär ett `body`-objekt
// ({ position, angle } i världsrymd) som `FluidWorld.foljKroppar` läser — isbiten trycker undan
// saften som en riktig kloss, saften knuffar aldrig tillbaka (F6b byggs inte).
//
// Saftens ytnivå räknas ur MÄNGDEN saft i glaset (se `_niva`) — isen FLYTER på den saft som faktiskt
// finns, inte på ett tal. Flyt = nedsänkning/(2·halv) · FLYT · tyngd, som `Flytvolym`.
//
// SAFTENS VOLYM ÄR HELIG: isbitar får aldrig stjäla eller tränga ut saft ur glaset. Fyra spärrar,
// alla mätta (scripts/_dag-saftbaren.mjs, sektion B och F): kolliderarna är cirklar, krymper mot
// väggar och botten, växer långsamt, och finns bara medan glaset står stilla — se konstanterna.
import { Takt } from '../../lib/takt.js'

const FIXED = 1000 / 60
export const ISBIT_HALV = 19 // isbitens halvsida i px (ritad kloss 38×38)
export const ISBIT_MAX = 3 // högst så många i ett glas — fler och den äldsta smälter
const TYNGD = 0.34 // px/steg² (spelets vätska ligger på 0,52; isen är lugnare så att den syns)
const FLYT = 1.55 // uppdrift vid full nedsänkning, i tyngder → jämvikt vid ~65 % nedsänkt
// Kolliderarens radie. EN CIRKEL, inte en kloss: en roterad låda i vätskan löses ansikte för ansikte
// (närmaste sida), och en partikel som tryckts in mot glasväggen kan då kastas UT genom den. Cirkeln
// trycker alltid rakt ut från mitten. Radien är mindre än den ritade klossens halvsida (19) —
// isen är genomskinlig, och hörnen är ändå rundade.
const KOLL_R = 17.5
const PART_A = 87 // px² vätska per partikel i glaset (uppmätt, se _niva)
const MARG_SIDA = 10 // px luft mellan isens zon och väggens zon — partiklar i hörnet får aldrig pressas ut genom väggen
const MARG_UNDER = 20 // px saftlager under isen (≈ en partikel + luft) — ett tunnare lager pressas ihop och trycker ut hörnpartiklar
// Kolliderarna är bara på när glaset STÅR stilla (ett par bildrutor). Mätt: med isens kolliderare på
// under ett lyft/drag pressades en hörnpartikel ur glaset genom väggen 1–2 gånger av 24 slumpade rundor
// (nästan fullt glas, lyft 17 px/bildruta); utan kolliderare 0 av 72. Medan glaset bärs bär spelets
// `_carryAll` saften som ett block — isen ligger då bara ovanpå.
const STILLA_STEG = 10
const RADIE_TILLVAXT = 0.6 // px per bildruta
const MAX_FART = 6.5 // px/steg — allmänt tak (stötar, tröghet)
const MAX_FALL = 2.8 // px/steg — fallfart i luften, så att nedslaget i saften är mjukt
const FLYG_STEG = 34 // flygtid från isbytta till glasmynningen (~0,57 s)
const SMALT_STEG = 30 // smältning (~0,5 s)

const klam = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Isvarld {
  // glas     () => lista av glasobjekt { x, y, angle } (lokalt origo = foten)
  // varld    FluidWorld (läser partiklar för ytnivån, ger isbitarna deras kolliderare)
  // geom     { halvBredd, topp, botten } — glasets inre hålrum i glasets eget system
  // krok     { skapaVy(k), rivVy(k), paLand(k), paKlink(k, styrka), paPlums(k), paSmalt(k) }
  constructor({ glas, varld, geom, krok = {}, max = ISBIT_MAX } = {}) {
    this._glas = glas
    this._varld = varld
    this._geom = geom
    this._krok = krok
    this.max = max
    this.kuber = []
    this._takt = new Takt({ steg: FIXED, max: 3 })
    // Plana "kroppar" för foljKroppar (phys = null → ingen fysikvärld att vakta).
    this._fk = varld.foljKroppar(null)
    // Vätskepartiklarna håller `pr` px från glasets innervägg OCH från isens kolliderare (se _kollR).
    this._pr = varld.pr
    this._levande = true
    this._nr = 0
  }

  // Isbiten kastas från isbytta (`fran` = världsläge) mot glasets mynning. Är glaset redan fullt av is
  // börjar den äldsta smälta (aldrig ett "nej" — ett tryck gör alltid något). Returnerar isbiten.
  slapp(g, fran) {
    if (!this._levande) return null
    const egna = this.kuber.filter((k) => k.g === g && !k.smalter)
    if (egna.length >= this.max) this._smalt(egna[0])
    const k = {
      id: ++this._nr,
      g,
      lx: 0,
      ly: this._geom.topp - 14 + ISBIT_HALV + 1,
      vx: 0,
      vy: 0,
      rot: (Math.random() - 0.5) * 0.4,
      w: 0,
      melt: 1,
      smalter: false,
      iVatten: false,
      s: 0, // nedsänkning 0..1 (för vyn)
      vilosteg: 0,
      vilar: false,
      fas: Math.random() * Math.PI * 2,
      tx: (Math.random() - 0.5) * 30, // var i mynningen den landar (lokalt x)
      spinn: (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.08),
      flyg: { t: 0, sx: fran.x, sy: fran.y, hojd: 90 + Math.random() * 40 },
      wx: fran.x,
      wy: fran.y,
      wa: 0,
      body: { position: { x: fran.x, y: fran.y }, angle: 0 },
      post: null,
    }
    k.koll = false
    k.rAkt = 1
    k.post = this._fk.lagg({
      body: k.body,
      form: { type: 'circle', r: 1 }, // växer till rätt radie i _pose (se _kollR)
      nar: () => !k.flyg && !k.smalter && Math.abs(k.g.angle) < 0.08 && k.koll && k.g._isStilla >= STILLA_STEG,
    })
    this.kuber.push(k)
    g._isNiva = this._niva(g)
    this._krok.skapaVy?.(k)
    return k
  }

  // Ett tryck på glaset: isen guppar till (stöt → rörelse → vila).
  knuffa(g, styrka = 1.2) {
    for (const k of this.kuber) {
      if (k.g !== g || k.flyg || k.smalter) continue
      k.vy -= styrka * (0.8 + Math.random() * 0.4)
      k.vx += (Math.random() - 0.5) * styrka * 1.1
      k.w += (Math.random() - 0.5) * 0.18
      k.vilar = false
      k.vilosteg = 0
    }
  }

  antalI(g) {
    let n = 0
    for (const k of this.kuber) if (k.g === g && !k.smalter) n++
    return n
  }

  // Varje bildruta, EFTER att glasen synkats och FÖRE `varld.update` (som läser kolliderarna).
  steg(deltaMS) {
    if (!this._levande || !this.kuber.length) return
    const glas = this._glas()
    const nFor = Math.max(1, Math.min(3, Math.round((deltaMS || FIXED) / FIXED)))
    // glasets rörelse sedan förra bildrutan (px/steg) → tröghetsimpuls EN gång per bildruta
    const imp = new Map()
    for (const g of glas) {
      if (!this.kuber.some((k) => k.g === g)) {
        g._isX = g.x
        g._isY = g.y
        g._isVX = 0
        g._isVY = 0
        continue
      }
      if (g._isX === undefined) {
        g._isX = g.x
        g._isY = g.y
        g._isVX = 0
        g._isVY = 0
      }
      const vx = klam((g.x - g._isX) / nFor, -14, 14)
      const vy = klam((g.y - g._isY) / nFor, -14, 14)
      imp.set(g, { dvx: vx - g._isVX, dvy: vy - g._isVY })
      g._isVX = vx
      g._isVY = vy
      g._isStilla = Math.abs(g.x - g._isX) + Math.abs(g.y - g._isY) < 0.5 ? (g._isStilla || 0) + 1 : 0
      g._isX = g.x
      g._isY = g.y
      g._isNiva = this._niva(g)
    }
    let forsta = true
    this._takt.kor(deltaMS, () => {
      this._stegEtt(imp, forsta)
      forsta = false
    })
    // slutposer + rivning av smälta
    for (let i = this.kuber.length - 1; i >= 0; i--) {
      const k = this.kuber[i]
      this._pose(k)
      if (k.smalter && k.melt <= 0) {
        this._fk.ta(k.body)
        this._krok.rivVy?.(k)
        this.kuber.splice(i, 1)
      }
    }
  }

  // Ytnivån i VÄRLDSRYMD, räknad ur MÄNGDEN saft i glaset — inte ur de översta partiklarna, vars
  // höjd skakar flera px och fick isen att pumpa (mätt: 7 px gungning med utjämnad toppmätning,
  // 1,6 px kvar vid snabbaste utjämning). Volym = partiklar · PART_A + det isen trycker undan, delat
  // på innerbredden. PART_A är uppmätt ur glaset (48 partiklar → 36,9 px, 116 → 88 px: 86,6–87,6).
  // Under sex partiklar finns ingen yta (isen faller till botten); lutar glaset är ytan inte
  // meningsfull (isen glider i glasets lutande tyngd).
  _niva(g) {
    const w = this._varld
    const { halvBredd, topp, botten } = this._geom
    if (Math.abs(g.angle) > 0.3) {
      g._isNivaMjuk = undefined
      return Infinity
    }
    const ca = Math.cos(-g.angle)
    const sa = Math.sin(-g.angle)
    // Mjuk räkning: en partikel vid glasväggens kant (där de pendlar in och ut ur "glaset" när vätskan
    // lugnar sig) räknas med vikt 0..1 — ett heltal som hoppar ±1 flyttade ytan 0,76 px och isen kröp.
    let n = 0
    for (let i = 0; i < w.count; i++) {
      const dx = w.x[i] - g.x
      const dy = w.y[i] - g.y
      const lx = dx * ca - dy * sa
      const ly = dx * sa + dy * ca
      if (ly < botten && ly > topp - 20) n += klam((halvBredd - Math.abs(lx)) / 8, 0, 1)
    }
    if (n < 6) {
      g._isNivaMjuk = undefined
      return Infinity
    }
    let undan = 0
    for (const k of this.kuber) {
      if (k.g !== g || !k.koll || !k.post || !k.post.coll) continue
      const r = k.post.coll.r
      undan += Math.PI * r * r * klam(k.s * 1.4, 0, 1)
    }
    const hojd = (n * PART_A + undan) / (halvBredd * 2)
    const rå = g.y + (botten - hojd) * Math.cos(g.angle)
    g._isNivaMjuk = g._isNivaMjuk === undefined ? rå : g._isNivaMjuk + (rå - g._isNivaMjuk) * 0.25
    return g._isNivaMjuk
  }

  _stegEtt(imp, forsta) {
    const geom = this._geom
    const H = ISBIT_HALV
    for (const k of this.kuber) {
      if (k.smalter) {
        k.melt = Math.max(0, k.melt - 1 / SMALT_STEG)
        k.w *= 0.95
      }
      const g = k.g
      if (k.flyg) {
        this._flyg(k)
        continue
      }
      const ca = Math.cos(g.angle)
      const sa = Math.sin(g.angle)
      // 1. glasets acceleration → isen hasar åt motsatt håll (relativ fart i glasets system)
      if (forsta) {
        const m = imp.get(g)
        if (m) {
          // världsimpuls (-dvx, -dvy) in i glasets system
          const ix = -m.dvx
          const iy = -m.dvy
          k.vx += klam((ix * ca + iy * sa) * 0.9, -5, 5)
          k.vy += klam((-ix * sa + iy * ca) * 0.9, -5, 5)
          k.w += klam(-m.dvx * 0.012, -0.12, 0.12)
        }
      }
      // 2. tyngd (roterad av glasets lutning) + uppdrift ur saftytan
      let gx = 0
      let gy = TYNGD
      const wy = g.y + k.lx * sa + k.ly * ca
      const djup = wy + H - (g._isNiva ?? Infinity)
      const s = klam(djup / (2 * H), 0, 1)
      k.s = s
      gy -= FLYT * TYNGD * s
      k.vx += gx * ca + gy * sa
      k.vy += -gx * sa + gy * ca
      // 3. motstånd: luft är lätt, saft är tjock (kritiskt dämpat → stöt, gungning, vila)
      const tjock = Math.min(1, s * 1.6)
      k.vx *= 0.994 - 0.1 * tjock
      k.vy *= 0.992 - (k.vy > 0 ? 0.2 : 0.14) * tjock
      // Fartspärr: i luften sjunker isen i en lugn takt (MAX_FALL) — en kloss som slår ned i saften
      // med full fallfart kastar partiklar ur glaset. I saften och vid stötar gäller MAX_FART.
      const tak = s < 0.05 ? MAX_FALL : MAX_FART
      const f = Math.hypot(k.vx, k.vy)
      if (f > tak) {
        k.vx = (k.vx / f) * tak
        k.vy = (k.vy / f) * tak
      }
      // 4. gå
      const forstaVatten = s > 0.12 && !k.iVatten
      if (s < 0.02) k.iVatten = false
      if (forstaVatten) {
        k.iVatten = true
        if (k.vy > 1.4) this._krok.paPlums?.(k)
      }
      k.lx += k.vx
      k.ly += k.vy
      // rotation: fjädrar mot rakt, tar emot vridimpulser
      k.w += -0.07 * k.rot - 0.14 * k.w
      k.rot = klam(k.rot + k.w, -0.4, 0.4)
      // 5. innerväggar (isen kan inte lämna glaset) — klossens rotade utsträckning räknas in
      const ext = H * (1 + Math.abs(Math.sin(k.rot)) * 0.4) // rotationen ger några px extra — men inte så att raden av tre låser sig
      const xMax = geom.halvBredd - ext
      const yMax = geom.botten - ext
      const yMin = geom.topp - 14 + ext
      let slag = 0
      if (k.lx > xMax) {
        slag = Math.max(slag, k.vx)
        k.lx = xMax
        if (k.vx > 0.3) k.w += 0.02 * Math.sign(k.vy || 1) // vridning bara vid en riktig stöt
        k.vx = k.vx > 0.15 ? -k.vx * 0.22 : 0
      } else if (k.lx < -xMax) {
        slag = Math.max(slag, -k.vx)
        k.lx = -xMax
        if (k.vx < -0.3) k.w -= 0.02 * Math.sign(k.vy || 1)
        k.vx = k.vx < -0.15 ? -k.vx * 0.22 : 0
      }
      if (k.ly > yMax) {
        slag = Math.max(slag, k.vy)
        k.ly = yMax
        k.vy = k.vy < 0.7 ? 0 : -k.vy * 0.25 // under 0,7 px/steg är det vila, inte studs
        k.vx *= 0.9
      } else if (k.ly < yMin) {
        slag = Math.max(slag, -k.vy)
        k.ly = yMin
        k.vy = -k.vy * 0.2
      }
      if (slag > 1.8) this._krok.paKlink?.(k, klam((slag - 1.8) / 4, 0.1, 1))
    }
    // 6. isbit mot isbit (cirklar, lika massa) — samma glas
    const lista = this.kuber
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i]
      if (a.flyg || a.smalter) continue
      for (let j = i + 1; j < lista.length; j++) {
        const b = lista[j]
        if (b.g !== a.g || b.flyg || b.smalter) continue
        let dx = b.lx - a.lx
        let dy = b.ly - a.ly
        let d = Math.hypot(dx, dy)
        const min = ISBIT_HALV * 1.8 // 34 px: tre i bredd (3 × 34 = 102) ryms med luft i ett 114 px glas — annars låser sig raden
        if (d >= min) continue
        if (d < 1e-4) {
          dx = 1
          dy = 0
          d = 1
        }
        const nx = dx / d
        const ny = dy / d
        const push = (min - d) / 2
        a.lx -= nx * push
        a.ly -= ny * push
        b.lx += nx * push
        b.ly += ny * push
        a.vx *= 0.85; a.vy *= 0.9; b.vx *= 0.85; b.vy *= 0.9 // ansiktsfriktion: staplad is guppar inte
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
        if (rel < 0) {
          const imp = -rel * 0.58 // restitution ~0,16
          a.vx -= nx * imp
          a.vy -= ny * imp
          b.vx += nx * imp
          b.vy += ny * imp
          a.w += 0.02 * ny
          b.w -= 0.02 * ny
          if (-rel > 1.2) this._krok.paKlink?.(a, klam((-rel - 1.2) / 3, 0.1, 0.8))
        }
      }
    }
    // 7. vila: isen STÅR stilla (läget ändras < 0,03 px/steg i 18 steg). Farten räcker inte som mått —
    // en isbit som ligger på två andra har kvar en fart (tyngd mot kontakt) utan att flytta sig.
    for (const k of this.kuber) {
      if (k.flyg) continue
      const rorelse = k._pLx === undefined ? 1 : Math.hypot(k.lx - k._pLx, k.ly - k._pLy)
      k._pLx = k.lx
      k._pLy = k.ly
      if (rorelse < 0.03 && Math.abs(k.w) < 0.004) {
        k.vilosteg++
        if (k.vilosteg > 18) {
          k.vilar = true
          k.vx = 0
          k.vy = 0
          k.w = 0
        }
      } else {
        k.vilosteg = 0
        k.vilar = false
      }
    }
  }

  // Flygningen från isbytta: en båge i världsrymd mot glasets mynning (följer glaset om det flyttas).
  _flyg(k) {
    const g = k.g
    const fl = k.flyg
    fl.t++
    const ca = Math.cos(g.angle)
    const sa = Math.sin(g.angle)
    const ly = this._landY(g)
    const mx = g.x + k.tx * ca - ly * sa
    const my = g.y + k.tx * sa + ly * ca
    const s = Math.min(1, fl.t / FLYG_STEG)
    k.wx = fl.sx + (mx - fl.sx) * s
    k.wy = fl.sy + (my - fl.sy) * s - 4 * fl.hojd * s * (1 - s)
    k.wa += k.spinn
    k.body.position.x = k.wx
    k.body.position.y = k.wy
    k.body.angle = k.wa
    if (s >= 1) {
      k.flyg = null
      k.lx = k.tx
      k.ly = ly
      k.vx = (Math.random() - 0.5) * 0.3
      k.vy = 1.6
      k.rot = klam(Math.atan2(Math.sin(k.wa - g.angle), Math.cos(k.wa - g.angle)) * 0.25, -0.5, 0.5)
      k.w = k.spinn * 0.2
      this._krok.paLand?.(k)
    }
  }

  // Var isbiten släpps in: strax ovanför saftytan (så att den inte faller 150 px i onödan), aldrig
  // högre än mynningen. Lutar glaset eller saknas saft → mynningen.
  _landY(g) {
    const { topp, botten } = this._geom
    const niva = g._isNiva
    const hogst = topp - 14 + ISBIT_HALV + 1 // överkant i glasets rim — där isen aldrig klämms upp av väggen
    if (!Number.isFinite(niva) || Math.abs(g.angle) > 0.1) return hogst
    return klam(niva - g.y - 56, hogst, botten - 70)
  }

  // Kolliderarens radie just nu. Den KRYMPER mot väggar och botten i stället för att bara slås av:
  // vätskepartiklarna håller `pr` px från glasväggen OCH från isen, så en isbit som står så nära att
  // zonerna överlappar pressar ihop partiklarna mellan sig — de kan kastas ut genom glaset (mätt:
  // 2 av 102 partiklar förlorade, 17 av 24 i ett grunt glas). Radien sätts så att zonerna precis
  // går fria: sidledes mot väggen, och nedåt så att saftlagret under isen aldrig är tunnare än en
  // partikel. Isen får ligga mot glaset, men trycker då inte undan något (saften syns genom den).
  _kollR(k) {
    const { halvBredd, botten } = this._geom
    const pr = this._pr
    // en bildruta rymmer upp till tre fysiksteg: räkna med att isen hinner dit innan radien läses igen
    const lx = Math.abs(k.lx) + Math.abs(k.vx) * 3
    const ly = k.ly + Math.max(0, k.vy) * 3
    const sida = halvBredd - pr - pr - lx - MARG_SIDA
    const under = botten - 2 * pr - ly - MARG_UNDER
    return Math.min(KOLL_R, sida, under)
  }

  _smalt(k) {
    if (k.smalter) return
    k.smalter = true
    this._krok.paSmalt?.(k)
  }

  // Världspose (för vyn och för vätskans kolliderare).
  _pose(k) {
    if (k.flyg) return
    const g = k.g
    const ca = Math.cos(g.angle)
    const sa = Math.sin(g.angle)
    k.wx = g.x + k.lx * ca - k.ly * sa
    k.wy = g.y + k.lx * sa + k.ly * ca
    k.wa = g.angle + k.rot
    k.body.position.x = k.wx
    k.body.position.y = k.wy
    k.body.angle = k.wa
    // kolliderarens radie (mutera det befintliga objektet — `foljKroppar` skriver bara x/y)
    const r = this._kollR(k)
    if (k.koll ? r < 3 : r > 5) k.koll = !k.koll
    // Radien KRYMPER direkt men VÄXER högst RADIE_TILLVAXT px per bildruta: en kolliderare som dyker upp
    // eller sväller mitt i en trängd saftmassa sätter partiklarna på cirkelns kant i ett enda steg, och
    // trycket som det ger kastar ut en hörnpartikel genom glasväggen (mätt).
    const mal = Math.max(1, Math.min(KOLL_R, r))
    k.rAkt = !k.koll ? 1 : mal < k.rAkt ? mal : Math.min(mal, k.rAkt + RADIE_TILLVAXT)
    const c = k.post && k.post.coll
    if (c) c.r = k.rAkt
  }

  rensa() {
    for (const k of this.kuber) {
      this._fk.ta(k.body)
      this._krok.rivVy?.(k)
    }
    this.kuber = []
  }

  destroy() {
    if (!this._levande) return
    this.rensa()
    this._fk.stoppa()
    this._levande = false
    this._krok = {}
    this._glas = () => []
    this._varld = null
  }
}

// Ritar en isbit (centrerad i origo): frostad kloss med ljusare ovansida, kantljus och en glimt.
// Delvis genomskinlig så att saften syns genom den nedsänkta delen.
export function ritaIsbit(g, h = ISBIT_HALV) {
  const s = h * 2
  g.clear()
  // mjuk skugga/mörk kant undertill
  g.roundRect(-h, -h + 2, s, s, 9).fill({ color: 0x7fb6d4, alpha: 0.9 })
  // själva klossen
  g.roundRect(-h, -h, s, s - 2, 9).fill({ color: 0xdff5ff, alpha: 0.82 })
  // ovansidan (en ljusare remsa som ger kloss-känsla)
  g.roundRect(-h + 3, -h + 3, s - 6, 11, 6).fill({ color: 0xffffff, alpha: 0.6 })
  // inre frost-fält
  g.roundRect(-h + 7, -h + 17, s - 15, s - 26, 6).fill({ color: 0xbfe8fa, alpha: 0.55 })
  // glimt + en luftbubbla inuti
  g.roundRect(-h + 6, -h + 16, 5, 13, 2.5).fill({ color: 0xffffff, alpha: 0.85 })
  g.circle(h * 0.28, h * 0.12, 3.4).fill({ color: 0xffffff, alpha: 0.65 })
  g.circle(h * 0.1, h * 0.38, 2).fill({ color: 0xffffff, alpha: 0.55 })
  // kontur
  g.roundRect(-h, -h, s, s - 2, 9).stroke({ width: 2.5, color: 0x9fd3ea, alpha: 0.95 })
}
