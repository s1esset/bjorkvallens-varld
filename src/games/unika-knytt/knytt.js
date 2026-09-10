// knytt.js — varelsen och dess femlägesrigg.
//
// Ett knytt ritas ur sitt DNA: deltabellerna väljer vilken FORM varje del har, och de 22
// kontinuerliga dragen i `dna.prop` sätter dess PROPORTIONER. Det är den kombinationen som
// gör att två knytt ur samma recept ändå inte är samma individ (docs/games/unika-knytt.md §6c).
//
// Tre mekanismer bär hela filen:
//
// 1. FÄSTPUNKTSPOSTEN `m`. Kroppen räknar ut den EFTER att dess proportioner dragits, och
//    alla andra delar läser bara ur den. En ny kropp kostar därför noll ändringar i öron,
//    ögon, mun eller svans — och en bred kropp flyttar ögonen av sig själv.
// 2. NODHIERARKIN grund > skala > snurr > liv. En transform per nivå, så ingen gest kan
//    skriva över en annan. `view` (grund) är fri för anroparen: den äger position och får
//    tweenas (bounceIn vid kläckningen) utan att riggen märker något.
// 3. EN `_apply()`. Varje gest äger sin egen SKALÄR, och summeringen sker på exakt ETT
//    ställe en gång per bildruta. Fyra skrivare på en transform = ingen av dem. Därför
//    används varken `feedback.liv()` (äger y + rotation) eller `breathe()` (äger scale)
//    här inne — de hade slagits med `_apply` varenda bildruta.
//
// Rörelsen är dessutom PROCEDURELL: skalärerna dras mot sina mål i `tick()` i stället för
// att tweenas. Det gör riggen exit-säker av konstruktion — det finns ingen tween som kan
// överleva en rivning och skriva på en nollad transform. `stadFx()` anropas ändå, för
// anroparen får animera `view` och för kopior som ligger i en hylla.
import { Container, Graphics, Point } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS, shade, tint } from '../../lib/theme.js'
import { fadeTopFill, sphereFill, topLightFill } from '../../lib/form.js'
import { puff, sparkle, stadFx } from '../../lib/feedback.js'
import { mulberry32 } from './dna.js'
import { SKRALL_PALS } from './skrallet.js'

const TAU = Math.PI * 2

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const tal = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

// Exponentiell närmning som är oberoende av bildrutetakt: samma resa på 20 fps som på 60.
const naerma = (nu, mal, k, dt) => nu + (mal - nu) * (1 - Math.exp(-k * dt))

// --- silhuetter -------------------------------------------------------------

// Sluten mjuk kurva genom en punktring. Kvadratiska mellansteg via kantmittpunkterna —
// samma kurvform som `Mjukkropp.path()`, som är uppmätt 0,01–0,12 px från en perfekt
// cirkel. En rå polygon ligger 40× längre bort och läser som en kantig klump.
function silhuett(g, pkt) {
  const n = pkt.length
  if (n < 3) return g
  g.moveTo((pkt[n - 1].x + pkt[0].x) / 2, (pkt[n - 1].y + pkt[0].y) / 2)
  for (let i = 0; i < n; i++) {
    const p = pkt[i]
    const q = pkt[(i + 1) % n]
    g.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  return g.closePath()
}

// Kroppens punktring. Vinkeln går från toppen och medsols; `v = sin(a)` är −1 i toppen och
// +1 i botten, och det är den koordinat alla breddprofiler nedan är skrivna i.
function kroppsPunkter(m, prop, kropp, vaxt = 1) {
  const n = 46
  const pkt = []
  const platt = kropp.platt || 0
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2
    const v = Math.sin(a)
    const w = kropp.profil(v, prop)
    // Brus i RADIELL led: knytet får en oregelbunden, handgjord kontur i stället för en
    // matematiskt perfekt ellips. Amplituden är px, inte en faktor, så små knytt inte
    // blir kokosbollar och stora inte blir släta.
    const brus = prop.brusAmp * Math.sin(prop.brusFrek * a + m.fas)
    const sido = kropp.sido ? kropp.sido(v) * m.bw : 0
    const yk = v > 0 ? 1 - platt * v * v : 1
    pkt.push({
      x: m.cx + sido + prop.asym * m.bw * v * 2 + Math.cos(a) * (m.bw * w * vaxt + brus),
      y: m.cy + v * m.bh * yk * vaxt + Math.sin(a) * brus,
    })
  }
  return pkt
}

// Silhuettens halva bredd på höjden v — det som gör att ett mönster aldrig ritas utanför
// kroppen. Halvbredden är |cos(a)| · bw · w(v), och |cos(a)| = sqrt(1 − v²).
function innerBredd(kropp, prop, m, v) {
  const w = kropp.profil ? kropp.profil(v, prop) : 1
  return Math.max(4, m.bw * w * Math.sqrt(Math.max(0.04, 1 - v * v)) * 0.86)
}

// --- proportionerna ---------------------------------------------------------

// Sötma-envelopen ur §6c. Klampen är inte kosmetisk: utan den ger slumpen smala ögon högt
// upp på en avlång kropp, vilket läser som obehagligt i stället för sött. Tabellen är
// samtidigt filens robusthet — saknas ett drag i dna:t används mitten av sitt spann.
const PROP_SPANN = {
  kroppBredd: [0.82, 1.18], kroppHojd: [0.85, 1.15], taper: [0, 0.4], asym: [0, 0.06],
  brusAmp: [0, 5], brusFrek: [2, 4],
  ogonSkala: [0.78, 1.3], ogonAvstand: [0.8, 1.25], ogonHojd: [-0.06, 0.14],
  pupill: [0.55, 0.85], blank: [1, 2],
  oronLangd: [0.7, 1.4], oronLutning: [-0.35, 0.35], oronHang: [0, 0.8],
  svansLangd: [0.7, 1.5], svansTjock: [0.7, 1.3],
  benLangd: [0.7, 1.3], benTjock: [0.8, 1.2],
  munBredd: [0.8, 1.25], munBage: [0.3, 1],
  kindAlfa: [0.25, 0.6], kindRadie: [0.8, 1.3],
  // §6c anger 1,4–2,2 och 3–7, men `dna.js` lägger en kropps- och världsmodulering OVANPÅ
  // (kloss 0,86 · natt 1,10 · svävande kropp 1,25) och klampar själv till 1,2–2,5 / 3–9.
  // Spannen här måste rymma DET, annars kastar riggen bort precis den variation dna:t
  // byggde — en tyst klamp som gör alla knytt lika utan ett enda fel någonstans.
  andning: [1.2, 2.5], gupp: [3, 9], fas: [0, TAU],
}

function laesProp(dna) {
  const inn = (dna && dna.prop) || {}
  const ut = {}
  for (const nyckel of Object.keys(PROP_SPANN)) {
    const [lo, hi] = PROP_SPANN[nyckel]
    ut[nyckel] = clamp(tal(inn[nyckel], (lo + hi) / 2), lo, hi)
  }
  return ut
}

function laesPalett(dna) {
  const p = (dna && dna.palett) || {}
  const bas = tal(p.bas, 0x8fd2a6)
  return {
    bas,
    ljus: tal(p.ljus, tint(bas, 0.3)),
    mork: tal(p.mork, shade(bas, 0.26)),
    buk: tal(p.buk, tint(bas, 0.44)),
    monster: tal(p.monster, shade(bas, 0.4)),
    kind: tal(p.kind, COLORS.pink),
    oga: tal(p.oga, COLORS.white),
    pupill: tal(p.pupill, COLORS.ink),
  }
}

// --- KROPPAR (6) ------------------------------------------------------------
//
// `profil(v, prop)` är breddmultiplikatorn på höjden v. `matt()` finns bara här: den räknar
// fästpunktsposten EFTER att proportionerna dragits, vilket är hela mekanismen bakom att
// kombinationsexplosionen är gratis.
const KROPPAR = [
  {
    nyckel: 'klot', bredd: 1, hojd: 0.96, platt: 0.11, ansikteK: 0.03, munK: 0.44, svansK: 0.4,
    profil: (v, p) => 1 - 0.04 * v * v + p.taper * 0.26 * v,
  },
  {
    nyckel: 'paron', bredd: 0.98, hojd: 1.05, platt: 0.08, ansikteK: -0.05, munK: 0.4, svansK: 0.46,
    profil: (v, p) => 0.6 + 0.42 * ((v + 1) / 2) + p.taper * 0.24 * v,
  },
  {
    nyckel: 'bona', bredd: 0.9, hojd: 1.1, platt: 0.04, ansikteK: -0.08, munK: 0.42, svansK: 0.5,
    sido: (v) => Math.sin(v * Math.PI) * 0.13,
    profil: (v, p) => (0.95 - p.taper * 0.12) * Math.sqrt(Math.max(0.04, 1 - Math.pow(Math.abs(v), 6) * 0.94)),
  },
  {
    nyckel: 'droppe', bredd: 1.02, hojd: 1.06, platt: 0.06, ansikteK: 0.06, munK: 0.4, svansK: 0.44,
    profil: (v, p) => Math.pow((v + 1) / 2, 0.46) * (1.02 + p.taper * 0.18),
  },
  {
    nyckel: 'kloss', bredd: 0.98, hojd: 0.94, platt: 0.03, ansikteK: 0.02, munK: 0.42, svansK: 0.42,
    // Superellips: |x|^n + |y|^n = 1, uttryckt i punktringens parametrisering (där x redan
    // bär en cos-faktor). Klampen håller hörnet från att spetsa till sig i polerna.
    profil: (v) => Math.min(2.4, Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 4.6)), 1 / 4.6) / Math.max(0.12, Math.sqrt(Math.max(0.0001, 1 - v * v)))),
  },
  {
    nyckel: 'larv', bredd: 0.86, hojd: 0.7, lober: 3, platt: 0, ansikteK: 0.02, munK: 0.5, svansK: 0.2,
    profil: (v) => 1.34 * Math.sqrt(Math.max(0.04, 1 - v * v * 0.9)) / Math.max(0.2, Math.sqrt(Math.max(0.0001, 1 - v * v))),
  },
]

// Fästpunktsposten. Räknas EFTER proportionerna — skalas den inte med kroppBredd/kroppHojd
// hamnar ögon, mun och svans fel så fort de avviker från 1,0.
function byggMatt(kropp, r, prop, benH, fas) {
  const bw = r * 0.9 * prop.kroppBredd * kropp.bredd
  const bh = r * 0.94 * prop.kroppHojd * kropp.hojd
  const bottenY = -benH
  const cy = bottenY - bh
  const m = { r, cx: 0, cy, bw, bh, fas, lober: kropp.lober || 0 }
  m.topY = cy - bh
  m.fotY = bottenY
  // Låga ögon läser som sött (neoteni). `ogonHojd` är positiv nedåt, alltså sötare.
  m.faceY = cy + bh * (kropp.ansikteK + prop.ogonHojd)
  m.munY = m.faceY + bh * kropp.munK
  m.axelY = cy + bh * 0.06
  m.svansY = cy + bh * kropp.svansK
  // Halvbredden i ansiktets höjd — måttet allt i ansiktet placeras mot.
  m.bredd = innerBredd(kropp, prop, m, (m.faceY - cy) / bh) / 0.86
  return m
}

function ritaKropp(g, p, m, prop, look) {
  const kropp = look.kropp
  if (kropp.lober) {
    // Larven: tre lober i EN silhuett. Konturen är en MÖRKARE KOPIA bakom, aldrig en
    // stroke — en stroke på överlappande former drar streck tvärs över silhuetten.
    const lr = m.bw * 0.52
    const lry = m.bh * 0.94
    const d = m.bw * 0.62
    for (const s of [-1, 0, 1]) g.ellipse(m.cx + s * d, m.cy + Math.abs(s) * m.bh * 0.1, lr * 1.09, lry * 1.09).fill(p.mork)
    for (const s of [1, -1, 0]) g.ellipse(m.cx + s * d, m.cy + Math.abs(s) * m.bh * 0.1, lr, lry).fill(sphereFill(p.bas, { dark: 0.16, highlight: 0.26, spread: 0.62 }))
    return
  }
  const pkt = kroppsPunkter(m, prop, kropp)
  // Konturkopian: samma väg, 4,5 % större och 3 px ner. Ger en ren mörk kant utan stroke.
  const bak = pkt.map((q) => ({ x: m.cx + (q.x - m.cx) * 1.045, y: m.cy + (q.y - m.cy) * 1.045 + 3 }))
  silhuett(g, bak).fill(p.mork)
  silhuett(g, pkt).fill(sphereFill(p.bas, { dark: 0.16, highlight: 0.26, spread: 0.62 }))
}

// --- MÖNSTER (6) ------------------------------------------------------------
//
// Ritas i kroppens STATISKA Graphics, mätt mot m.bredd — aldrig ovanpå något som deformeras.
const MONSTER = [
  { nyckel: 'enfarg', rita() {} },
  {
    nyckel: 'prickar',
    rita(g, p, m, prop, look) {
      const rnd = look.rnd
      for (let i = 0; i < 8; i++) {
        const v = 0.08 + (i / 7) * 0.72 + (rnd() - 0.5) * 0.12
        const w = innerBredd(look.kropp, prop, m, v)
        const x = m.cx + (rnd() * 2 - 1) * w * 0.7
        const rr = m.r * (0.05 + rnd() * 0.04)
        g.circle(x, m.cy + v * m.bh, rr).fill({ color: p.monster, alpha: 0.82 })
      }
    },
  },
  {
    nyckel: 'ranger',
    rita(g, p, m, prop, look) {
      for (let i = 0; i < 4; i++) {
        const v = 0.08 + i * 0.23
        const w = innerBredd(look.kropp, prop, m, v)
        const h = m.bh * 0.095
        g.roundRect(m.cx - w, m.cy + v * m.bh - h / 2, w * 2, h, h * 0.5).fill({ color: p.monster, alpha: 0.5 })
      }
    },
  },
  {
    nyckel: 'mage',
    rita(g, p, m, prop, look) {
      const w = innerBredd(look.kropp, prop, m, 0.34)
      g.ellipse(m.cx, m.cy + m.bh * 0.36, w * 0.78, m.bh * 0.52).fill({ color: p.buk, alpha: 0.9 })
    },
  },
  {
    nyckel: 'flackar',
    rita(g, p, m, prop, look) {
      const rnd = look.rnd
      for (let i = 0; i < 5; i++) {
        const v = -0.05 + (i / 4) * 0.82 + (rnd() - 0.5) * 0.14
        const w = innerBredd(look.kropp, prop, m, v)
        const x = m.cx + (rnd() * 2 - 1) * w * 0.58
        const y = m.cy + v * m.bh
        const rr = m.r * (0.1 + rnd() * 0.07)
        // Två överlappande ellipser = en oregelbunden fläck utan att någon form roteras.
        g.ellipse(x, y, rr, rr * 0.78).fill({ color: p.monster, alpha: 0.62 })
        g.ellipse(x + rr * 0.6, y + rr * 0.3, rr * 0.62, rr * 0.5).fill({ color: p.monster, alpha: 0.62 })
      }
    },
  },
  {
    nyckel: 'stjarnor',
    rita(g, p, m, prop, look) {
      const rnd = look.rnd
      for (let i = 0; i < 5; i++) {
        const v = 0.05 + (i / 4) * 0.7 + (rnd() - 0.5) * 0.12
        const w = innerBredd(look.kropp, prop, m, v)
        const x = m.cx + (rnd() * 2 - 1) * w * 0.62
        const y = m.cy + v * m.bh
        const rr = m.r * (0.07 + rnd() * 0.04)
        if (g.star) g.star(x, y, 5, rr, rr * 0.48).fill({ color: p.monster, alpha: 0.8 })
        else g.circle(x, y, rr * 0.7).fill({ color: p.monster, alpha: 0.8 })
      }
    },
  },
]

// --- ÖRON (6) ---------------------------------------------------------------
//
// Varje öra ritas i en EGEN nod med basen i origo, så släpet är en rotation och aldrig en
// omritning. Speglingen sker med rotationens TECKEN (`look.sida`), aldrig med scale.x = −1:
// ett negativt x-skalvärde vänder också rotationens synliga riktning.
const ORON = [
  { nyckel: 'inga', rita() {} },
  {
    nyckel: 'runda',
    rita(g, p, m, prop) {
      const R = m.r * 0.3 * prop.oronLangd
      g.circle(0, -R * 0.5, R * 1.1).fill(p.mork)
      g.circle(0, -R * 0.56, R).fill(sphereFill(p.bas, { dark: 0.14, highlight: 0.24 }))
      g.circle(0, -R * 0.52, R * 0.5).fill({ color: p.kind, alpha: 0.6 })
    },
  },
  {
    nyckel: 'spetsiga',
    rita(g, p, m, prop) {
      const h = m.r * 0.5 * prop.oronLangd
      const w = m.r * 0.2
      g.moveTo(-w * 1.15, m.r * 0.06).lineTo(0, -h * 1.08).lineTo(w * 1.15, m.r * 0.06).closePath().fill(p.mork)
      g.moveTo(-w, m.r * 0.02).lineTo(0, -h).lineTo(w, m.r * 0.02).closePath().fill(topLightFill(p.bas))
      g.moveTo(-w * 0.5, -m.r * 0.02).lineTo(0, -h * 0.66).lineTo(w * 0.5, -m.r * 0.02).closePath().fill({ color: p.kind, alpha: 0.65 })
    },
  },
  {
    nyckel: 'hang',
    rita(g, p, m, prop) {
      const h = m.r * 0.46 * prop.oronLangd
      const w = m.r * 0.17
      g.ellipse(0, h * 0.5, w * 1.14, h * 0.62).fill(p.mork)
      g.ellipse(0, h * 0.46, w, h * 0.56).fill(topLightFill(p.bas, { highlight: 0.24, dark: 0.22 }))
      g.ellipse(0, h * 0.56, w * 0.44, h * 0.3).fill({ color: p.kind, alpha: 0.5 })
    },
  },
  {
    nyckel: 'horn',
    rita(g, p, m, prop, look) {
      const h = m.r * 0.44 * prop.oronLangd
      const w = m.r * 0.11
      const curl = look.sida * (0.3 + prop.oronLutning * 0.5) * h
      g.moveTo(-w * 1.2, 0)
        .quadraticCurveTo(-w * 0.9, -h * 0.6, curl, -h * 1.05)
        .quadraticCurveTo(w * 1.2, -h * 0.55, w * 1.2, 0)
        .closePath().fill(p.mork)
      g.moveTo(-w, 0)
        .quadraticCurveTo(-w * 0.7, -h * 0.6, curl, -h * 0.96)
        .quadraticCurveTo(w, -h * 0.5, w, 0)
        .closePath().fill(topLightFill(p.ljus, { highlight: 0.34, dark: 0.3 }))
    },
  },
  {
    nyckel: 'antenner',
    rita(g, p, m, prop, look) {
      const h = m.r * 0.56 * prop.oronLangd
      const ut = look.sida * m.r * 0.16
      g.moveTo(0, 0).quadraticCurveTo(ut * 0.7, -h * 0.55, ut, -h).stroke({ width: m.r * 0.052, color: p.mork, cap: 'round' })
      g.circle(ut, -h, m.r * 0.1).fill(sphereFill(p.monster, { dark: 0.2, highlight: 0.4 }))
    },
  },
]

// --- HORN (4) — ett extra lager ovanpå öronen, egen tabell i dna:t ----------
const HORN = [
  { nyckel: 'inga', rita() {} },
  {
    nyckel: 'knopp',
    rita(g, p, m) {
      for (const s of [-1, 1]) {
        g.circle(s * m.bredd * 0.26, m.topY + m.r * 0.05, m.r * 0.09).fill(p.mork)
        g.circle(s * m.bredd * 0.26, m.topY + m.r * 0.02, m.r * 0.075).fill(sphereFill(p.ljus))
      }
    },
  },
  {
    nyckel: 'spiror',
    rita(g, p, m) {
      for (const s of [-1, 1]) {
        const x = s * m.bredd * 0.3
        g.moveTo(x - m.r * 0.06, m.topY + m.r * 0.06)
          .quadraticCurveTo(x + s * m.r * 0.05, m.topY - m.r * 0.2, x + s * m.r * 0.12, m.topY - m.r * 0.32)
          .quadraticCurveTo(x + m.r * 0.06, m.topY - m.r * 0.08, x + m.r * 0.06, m.topY + m.r * 0.06)
          .closePath().fill(p.ljus)
      }
    },
  },
  {
    // Kronan kunde inte dras förrän generation 1 (steg 2, 2026-09-10). Den första ritningen —
    // tre 7 px-taggar i mönsterfärgen, BAKOM kroppen — syntes inte i bildgranskningen på hyllan
    // (r 40), och kompisen satt dessutom där den skulle stå. Nu en riktig liten krona som sitter
    // PÅ hjässan (`foran`): band + fem uddar med stenar, i knyttets EGEN palett. Aldrig guld —
    // guld är sällsynthetens färg (§3b), och en krona är en kroppsdel, inte ett skimmer.
    nyckel: 'krona',
    foran: true,
    rita(g, p, m) {
      const r = m.r
      const w = r * 0.3
      const y0 = m.topY + r * 0.07
      const bh = r * 0.09
      const H = [0.13, 0.19, 0.25, 0.19, 0.13]
      // Silhuetten som EN polygon: fot, sedan udd–dal–udd … och tillbaka ner.
      const kontur = (k, dy) => {
        const pts = [-w * k, y0 + dy]
        for (let i = 0; i < 5; i++) {
          const x = (-1 + i * 0.5) * w * k
          if (i > 0) pts.push(x - w * 0.25 * k, y0 - bh + dy)
          pts.push(x, y0 - bh - r * H[i] * k + dy)
        }
        pts.push(w * k, y0 + dy)
        return pts
      }
      // Konturen är en MÖRKARE FORM bakom, aldrig en stroke (samma regel som kroppen).
      g.poly(kontur(1.12, r * 0.02)).fill(p.mork)
      g.poly(kontur(1, 0)).fill(topLightFill(p.ljus, { highlight: 0.36, dark: 0.22 }))
      g.roundRect(-w, y0 - bh, w * 2, bh, bh * 0.4).fill({ color: p.mork, alpha: 0.35 })
      for (let i = 0; i < 5; i++) g.circle((-1 + i * 0.5) * w, y0 - bh - r * H[i], r * 0.035).fill(p.monster)
      g.circle(0, y0 - bh * 0.5, r * 0.04).fill(p.monster)
      g.circle(-r * 0.012, y0 - bh * 0.5 - r * 0.012, r * 0.013).fill({ color: 0xffffff, alpha: 0.85 })
    },
  },
]

// --- VINGAR (3) -------------------------------------------------------------
const VINGAR = [
  { nyckel: 'inga', segment: 0, rita() {} },
  {
    nyckel: 'sma', segment: 1,
    rita(g, p, m, prop, look) {
      const s = look.sida
      const w = m.r * 0.34
      g.ellipse(s * w * 0.62, -w * 0.1, w * 0.72, w * 0.52).fill(p.mork)
      g.ellipse(s * w * 0.6, -w * 0.14, w * 0.66, w * 0.46).fill(topLightFill(p.ljus, { highlight: 0.36, dark: 0.18 }))
    },
  },
  {
    nyckel: 'flor', segment: 1,
    rita(g, p, m, prop, look) {
      const s = look.sida
      const w = m.r * 0.46
      g.moveTo(0, 0)
        .quadraticCurveTo(s * w * 1.25, -w * 0.95, s * w * 1.05, -w * 0.05)
        .quadraticCurveTo(s * w * 0.95, w * 0.62, 0, w * 0.16)
        .closePath().fill({ color: p.ljus, alpha: 0.78 })
      g.moveTo(0, 0)
        .quadraticCurveTo(s * w * 0.8, -w * 0.62, s * w * 0.66, -w * 0.04)
        .quadraticCurveTo(s * w * 0.6, w * 0.3, 0, w * 0.1)
        .closePath().fill({ color: COLORS.white, alpha: 0.3 })
    },
  },
]

// --- SVANSAR (5) ------------------------------------------------------------
//
// `segment` > 1 bygger nästlade noder: varje led får sin egen fördröjda rotation, vilket är
// den billiga versionen av en verlet-kedja (transformer, ingen omritning per bildruta).
const SVANSAR = [
  { nyckel: 'ingen', segment: 0, langd: 0, rita() {} },
  {
    nyckel: 'tofs', segment: 1, langd: 0.3,
    rita(g, p, m, prop) {
      const L = m.r * 0.3 * prop.svansLangd
      const t = m.r * 0.07 * prop.svansTjock
      g.moveTo(0, -t).quadraticCurveTo(L * 0.6, -t * 1.3, L, -t * 0.6).lineTo(L, t * 0.6).quadraticCurveTo(L * 0.6, t * 1.3, 0, t).closePath().fill(p.mork)
      g.circle(L * 1.12, 0, t * 2.1).fill(sphereFill(p.ljus, { dark: 0.2, highlight: 0.34 }))
    },
  },
  {
    nyckel: 'lang', segment: 4, langd: 0.26,
    rita(g, p, m, prop, look) {
      const L = m.r * 0.26 * prop.svansLangd
      const k = 1 - look.i * 0.16
      const t = m.r * 0.075 * prop.svansTjock * k
      g.moveTo(0, -t).quadraticCurveTo(L * 0.5, -t * 1.1, L, -t * 0.82).lineTo(L, t * 0.82).quadraticCurveTo(L * 0.5, t * 1.1, 0, t).closePath().fill(p.mork)
      g.ellipse(L * 0.5, 0, L * 0.52, t * 0.72).fill(p.bas)
      if (look.i === 3) g.circle(L, 0, t * 1.5).fill(sphereFill(p.ljus, { dark: 0.2 }))
    },
  },
  {
    nyckel: 'fena', segment: 1, langd: 0.42,
    rita(g, p, m, prop) {
      const L = m.r * 0.42 * prop.svansLangd
      const h = m.r * 0.3 * prop.svansTjock
      g.moveTo(0, 0).quadraticCurveTo(L * 0.7, -h * 0.5, L, -h).quadraticCurveTo(L * 0.62, 0, L, h).quadraticCurveTo(L * 0.7, h * 0.5, 0, 0).closePath().fill(p.mork)
      g.moveTo(0, 0).quadraticCurveTo(L * 0.66, -h * 0.44, L * 0.9, -h * 0.86).quadraticCurveTo(L * 0.56, 0, L * 0.9, h * 0.86).quadraticCurveTo(L * 0.66, h * 0.44, 0, 0).closePath().fill({ color: p.ljus, alpha: 0.92 })
    },
  },
  {
    nyckel: 'blixt', segment: 1, langd: 0.4,
    rita(g, p, m, prop) {
      const L = m.r * 0.4 * prop.svansLangd
      const t = m.r * 0.11 * prop.svansTjock
      g.poly([0, -t, L * 0.42, -t * 1.9, L * 0.36, -t * 0.2, L, -t * 1.5, L * 0.55, t * 0.9, L * 0.5, t * 0.1, 0, t]).fill(p.mork)
      g.poly([0, -t * 0.7, L * 0.4, -t * 1.6, L * 0.34, -t * 0.1, L * 0.92, -t * 1.25, L * 0.5, t * 0.72, L * 0.45, t * 0.05, 0, t * 0.7]).fill(p.monster)
    },
  },
]

// --- BEN (3) ----------------------------------------------------------------
const BEN = [
  { nyckel: 'inga', hojd: 0, sviktar: false, rita() {} },
  {
    nyckel: 'stubbar', hojd: 0.26, sviktar: false,
    rita(g, p, m, prop) {
      const h = m.r * 0.26 * prop.benLangd
      const w = m.r * 0.1 * prop.benTjock
      g.roundRect(-w, -h * 0.2, w * 2, h * 1.1, w * 0.8).fill(p.mork)
      g.ellipse(0, h * 0.9, w * 1.5, w * 0.72).fill(p.mork)
      g.ellipse(0, h * 0.86, w * 1.34, w * 0.6).fill(topLightFill(p.ljus, { highlight: 0.28, dark: 0.2 }))
    },
  },
  {
    nyckel: 'langa', hojd: 0.52, sviktar: true,
    rita(g, p, m, prop, look) {
      const h = m.r * 0.52 * prop.benLangd
      const t = m.r * 0.075 * prop.benTjock
      g.moveTo(0, -t).quadraticCurveTo(look.sida * t * 2.4, h * 0.5, 0, h).stroke({ width: t * 2, color: p.mork, cap: 'round' })
      g.ellipse(look.sida * t * 0.6, h, t * 2, t * 1.1).fill(p.mork)
      g.ellipse(look.sida * t * 0.6, h - t * 0.25, t * 1.8, t * 0.9).fill(topLightFill(p.ljus, { highlight: 0.28, dark: 0.2 }))
    },
  },
]

// --- ÖGONFORMER (6) ---------------------------------------------------------
//
// `vit` ritar ögats botten, `pupill` det som rör sig. Blänket ligger på pupillen (ett) och
// på vitan (ett till, när `prop.blank` är 2) — två blänk läser som fuktiga, levande ögon.
//
// `frihet(e, prop)` är hur långt pupillen får vandra i x och y, i px. Den måste vara en
// EGENSKAP HOS FORMEN, inte en konstant: en smal ögonform har nästan ingen höjd att vandra
// i, och en stor pupill (`prop.pupill` upp till 0,85) äter upp det som finns kvar. Räknas
// måttet inte per form kryper pupillen ut ur ögat på precis de kombinationer som är
// vanligast — stora ögon och stor pupill är samma sötma-envelopp som resten av riggen.
const OGON = [
  {
    nyckel: 'runda',
    vit(g, p, e) { g.circle(0, 0, e * 1.06).fill(shade(p.oga, 0.14)); g.circle(0, -e * 0.04, e).fill(p.oga) },
    pupill(g, p, e, prop) { ritaPupill(g, p, e, prop, 1) },
    frihet: (e, prop) => fritt(e, e, pupillRadie(e, prop, 1)),
  },
  {
    nyckel: 'stora',
    vit(g, p, e) { g.circle(0, 0, e * 1.3).fill(shade(p.oga, 0.14)); g.circle(0, -e * 0.05, e * 1.24).fill(p.oga) },
    pupill(g, p, e, prop) { ritaPupill(g, p, e * 1.24, prop, 1.06) },
    frihet: (e, prop) => fritt(e * 1.24, e * 1.24, pupillRadie(e * 1.24, prop, 1.06)),
  },
  {
    nyckel: 'smala',
    vit(g, p, e) { g.ellipse(0, 0, e * 1.2, e * 0.8).fill(shade(p.oga, 0.14)); g.ellipse(0, -e * 0.04, e * 1.14, e * 0.74).fill(p.oga) },
    pupill(g, p, e, prop) { ritaPupill(g, p, e * 0.86, prop, 1) },
    frihet: (e, prop) => fritt(e * 1.14, e * 0.74, pupillRadie(e * 0.86, prop, 1)),
  },
  {
    nyckel: 'stjarna',
    vit(g, p, e) {
      if (g.star) { g.star(0, 0, 5, e * 1.34, e * 0.66).fill(shade(p.oga, 0.16)); g.star(0, -e * 0.05, 5, e * 1.24, e * 0.6).fill(p.oga) }
      else { g.circle(0, 0, e * 1.1).fill(shade(p.oga, 0.16)); g.circle(0, -e * 0.05, e).fill(p.oga) }
    },
    pupill(g, p, e, prop) { ritaPupill(g, p, e * 0.9, prop, 0.9) },
    // Stjärnans SÄKRA yta är innerradien, inte spetsarna — annars vandrar pupillen ut i en tagg.
    frihet: (e, prop) => fritt(e * 0.92, e * 0.92, pupillRadie(e * 0.9, prop, 0.9)),
  },
  {
    nyckel: 'spiral',
    vit(g, p, e) { g.circle(0, 0, e * 1.08).fill(shade(p.oga, 0.14)); g.circle(0, -e * 0.04, e).fill(p.oga) },
    frihet: (e) => fritt(e, e, e * 0.78),
    pupill(g, p, e) {
      // En spiral i tre kvartsvarv, ritad som en enda krympande båge.
      let rr = e * 0.78
      g.moveTo(rr, 0)
      for (let i = 0; i < 9; i++) {
        const a0 = (i * Math.PI) / 4
        const a1 = a0 + Math.PI / 4
        const r1 = rr * 0.86
        g.quadraticCurveTo(Math.cos(a0 + Math.PI / 8) * rr * 1.08, Math.sin(a0 + Math.PI / 8) * rr * 1.08, Math.cos(a1) * r1, Math.sin(a1) * r1)
        rr = r1
      }
      g.stroke({ width: e * 0.24, color: p.pupill, cap: 'round' })
      g.circle(-e * 0.2, -e * 0.28, e * 0.17).fill({ color: COLORS.white, alpha: 0.9 })
    },
  },
  {
    nyckel: 'tre',
    vit(g, p, e) { g.circle(0, 0, e * 1.08).fill(shade(p.oga, 0.14)); g.circle(0, -e * 0.04, e).fill(p.oga) },
    pupill(g, p, e, prop) { ritaPupill(g, p, e, prop, 1) },
    frihet: (e, prop) => fritt(e, e, pupillRadie(e, prop, 1)),
  },
]

const pupillRadie = (e, prop, k) => e * clamp(prop.pupill, 0.55, 0.85) * 0.78 * k
// Vad som blir kvar när pupillen tagit sin plats. Golvet på 12 % av ögat är där för att
// blicken ska SYNAS även i en trång ögonform — en pupill som står blick stilla läser som död.
const fritt = (rx, ry, pr) => ({ x: Math.max(rx * 0.12, rx - pr), y: Math.max(ry * 0.12, ry - pr) })

function ritaPupill(g, p, e, prop, k) {
  const pr = pupillRadie(e, prop, k)
  g.circle(0, 0, pr).fill(p.pupill)
  g.circle(-pr * 0.3, -pr * 0.36, pr * 0.36).fill({ color: COLORS.white, alpha: 0.92 })
  if (prop.blank >= 1.5) g.circle(pr * 0.34, pr * 0.34, pr * 0.17).fill({ color: COLORS.white, alpha: 0.55 })
}

// --- MUNNAR (5) -------------------------------------------------------------
const MUNNAR = [
  {
    nyckel: 'leende',
    rita(g, p, m, prop) {
      const w = m.r * 0.2 * prop.munBredd
      const d = m.r * 0.16 * prop.munBage
      g.moveTo(-w, 0).quadraticCurveTo(0, d * 2, w, 0).stroke({ width: m.r * 0.042, color: p.pupill, cap: 'round' })
    },
  },
  {
    nyckel: 'katt',
    rita(g, p, m, prop) {
      const w = m.r * 0.14 * prop.munBredd
      const d = m.r * 0.11 * prop.munBage
      g.moveTo(-w * 2, 0).quadraticCurveTo(-w, d * 2, 0, 0).quadraticCurveTo(w, d * 2, w * 2, 0).stroke({ width: m.r * 0.04, color: p.pupill, cap: 'round' })
    },
  },
  {
    nyckel: 'nabb',
    rita(g, p, m, prop) {
      const w = m.r * 0.15 * prop.munBredd
      const h = m.r * 0.14 * prop.munBage
      g.moveTo(-w, -h * 0.3).lineTo(w, -h * 0.3).lineTo(0, h).closePath().fill(shade(p.monster, 0.1))
      g.moveTo(-w * 0.8, -h * 0.2).lineTo(w * 0.8, -h * 0.2).lineTo(0, h * 0.4).closePath().fill(tint(p.monster, 0.3))
    },
  },
  {
    nyckel: 'glipa',
    rita(g, p, m, prop) {
      const w = m.r * 0.19 * prop.munBredd
      const h = m.r * 0.13 * prop.munBage
      g.moveTo(-w, -h * 0.2).quadraticCurveTo(0, h * 1.8, w, -h * 0.2).closePath().fill(shade(p.pupill, 0.1))
      g.roundRect(-w * 0.52, -h * 0.28, w * 0.34, h * 0.6, h * 0.14).fill(COLORS.white)
      g.roundRect(w * 0.2, -h * 0.28, w * 0.34, h * 0.6, h * 0.14).fill(COLORS.white)
    },
  },
  {
    nyckel: 'prick',
    rita(g, p, m, prop) {
      const rr = m.r * 0.052 * prop.munBredd
      g.circle(0, 0, rr * 1.25).fill(p.pupill)
      g.circle(0, -rr * 0.2, rr * 0.5).fill({ color: p.kind, alpha: 0.5 })
    },
  },
]

// --- KOMPISAR — det ett VANLIGT knytt får och ett skimrande aldrig får (docens §3b) -------
// En per värld. Ritas med FOTEN i origo och kroppen uppåt, i skalan `s` (~0,19 r), och sätter
// sig på hjässan. `fladder` = vingar som slår (snabbare vickning), annars en lugn vaggning.
// Egen siluett, eget liv — aldrig en ikon (P0 ASSETS).
const KOMPISAR = {
  skalbagge: {
    rita(g, s) {
      g.ellipse(0, -s * 0.55, s * 0.72, s * 0.55).fill(shade(0xd9432f, 0.25))
      g.ellipse(0, -s * 0.6, s * 0.66, s * 0.5).fill(topLightFill(0xe04a34, { highlight: 0.32, dark: 0.2 }))
      g.moveTo(0, -s * 0.15).lineTo(0, -s * 1.05).stroke({ width: s * 0.07, color: 0x2b1d1a })
      for (const [x, y] of [[-0.32, -0.62], [0.3, -0.58], [-0.14, -0.3], [0.16, -0.32]]) g.circle(x * s, y * s, s * 0.1).fill(0x2b1d1a)
      g.circle(0, -s * 1.02, s * 0.27).fill(0x2b1d1a)
      g.circle(-s * 0.1, -s * 1.06, s * 0.06).fill(0xffffff)
      g.circle(s * 0.1, -s * 1.06, s * 0.06).fill(0xffffff)
    },
  },
  smafisk: {
    rita(g, s) {
      g.moveTo(-s * 0.55, -s * 0.5).lineTo(-s * 0.95, -s * 0.9).lineTo(-s * 0.95, -s * 0.1).closePath().fill(0x3f9fd0)
      g.ellipse(0, -s * 0.5, s * 0.66, s * 0.4).fill(topLightFill(0x62c4ea, { highlight: 0.34, dark: 0.2 }))
      g.ellipse(s * 0.04, -s * 0.36, s * 0.42, s * 0.16).fill({ color: 0xffffff, alpha: 0.35 })
      g.moveTo(-s * 0.1, -s * 0.85).quadraticCurveTo(s * 0.1, -s * 1.1, s * 0.3, -s * 0.8).closePath().fill(0x3f9fd0)
      g.circle(s * 0.36, -s * 0.56, s * 0.11).fill(0xffffff)
      g.circle(s * 0.39, -s * 0.56, s * 0.06).fill(0x1d2a3a)
    },
  },
  snosparv: {
    fladder: true,
    rita(g, s) {
      g.moveTo(-s * 0.5, -s * 0.5).lineTo(-s * 0.9, -s * 0.66).lineTo(-s * 0.84, -s * 0.4).closePath().fill(0xb9c3cf)
      g.ellipse(0, -s * 0.5, s * 0.6, s * 0.46).fill(topLightFill(0xf4f7fb, { highlight: 0.2, dark: 0.18 }))
      g.ellipse(-s * 0.1, -s * 0.5, s * 0.36, s * 0.24).fill({ color: 0xb9c3cf, alpha: 0.8 })
      g.circle(s * 0.34, -s * 0.86, s * 0.3).fill(topLightFill(0xf8fafc, { highlight: 0.2, dark: 0.16 }))
      g.moveTo(s * 0.58, -s * 0.86).lineTo(s * 0.8, -s * 0.8).lineTo(s * 0.58, -s * 0.74).closePath().fill(0xf2a23a)
      g.circle(s * 0.4, -s * 0.92, s * 0.06).fill(0x1d2a3a)
    },
  },
  nattfjaril: {
    fladder: true,
    rita(g, s) {
      for (const sida of [-1, 1]) {
        g.ellipse(sida * s * 0.42, -s * 0.66, s * 0.44, s * 0.3).fill(topLightFill(0xd9cff6, { highlight: 0.24, dark: 0.16 }))
        g.ellipse(sida * s * 0.36, -s * 0.34, s * 0.3, s * 0.2).fill(0xc4b6ee)
        g.circle(sida * s * 0.5, -s * 0.7, s * 0.09).fill({ color: 0x5a4b8a, alpha: 0.7 })
      }
      g.ellipse(0, -s * 0.52, s * 0.14, s * 0.4).fill(0x5a4b8a)
      g.circle(0, -s * 0.92, s * 0.14).fill(0x5a4b8a)
      g.moveTo(-s * 0.06, -s * 1.02).quadraticCurveTo(-s * 0.28, -s * 1.28, -s * 0.36, -s * 1.22).stroke({ width: s * 0.05, color: 0x5a4b8a, cap: 'round' })
      g.moveTo(s * 0.06, -s * 1.02).quadraticCurveTo(s * 0.28, -s * 1.28, s * 0.36, -s * 1.22).stroke({ width: s * 0.05, color: 0x5a4b8a, cap: 'round' })
    },
  },
  grashoppa: {
    rita(g, s) {
      g.moveTo(-s * 0.3, -s * 0.2).lineTo(-s * 0.7, -s * 0.9).lineTo(-s * 0.5, -s * 0.05).closePath().fill(0x4f9a3a)
      g.moveTo(s * 0.3, -s * 0.2).lineTo(s * 0.7, -s * 0.9).lineTo(s * 0.5, -s * 0.05).closePath().fill(0x4f9a3a)
      g.ellipse(0, -s * 0.5, s * 0.62, s * 0.3).fill(topLightFill(0x7ccf4f, { highlight: 0.3, dark: 0.2 }))
      g.circle(s * 0.5, -s * 0.66, s * 0.22).fill(topLightFill(0x8ad85a, { highlight: 0.3, dark: 0.18 }))
      g.circle(s * 0.58, -s * 0.72, s * 0.06).fill(0x1d2a1a)
      g.moveTo(s * 0.5, -s * 0.86).quadraticCurveTo(s * 0.6, -s * 1.2, s * 0.86, -s * 1.22).stroke({ width: s * 0.05, color: 0x3d7a2c, cap: 'round' })
      g.moveTo(s * 0.44, -s * 0.86).quadraticCurveTo(s * 0.3, -s * 1.2, s * 0.14, -s * 1.28).stroke({ width: s * 0.05, color: 0x3d7a2c, cap: 'round' })
    },
  },
  fladdermus: {
    fladder: true,
    rita(g, s) {
      for (const sida of [-1, 1]) {
        g.moveTo(sida * s * 0.16, -s * 0.66)
          .quadraticCurveTo(sida * s * 0.6, -s * 1.1, sida * s * 0.96, -s * 0.74)
          .quadraticCurveTo(sida * s * 0.7, -s * 0.66, sida * s * 0.6, -s * 0.44)
          .quadraticCurveTo(sida * s * 0.36, -s * 0.5, sida * s * 0.16, -s * 0.36)
          .closePath()
          .fill(topLightFill(0x6b56a8, { highlight: 0.22, dark: 0.22 }))
      }
      g.ellipse(0, -s * 0.56, s * 0.24, s * 0.4).fill(topLightFill(0x7f68bd, { highlight: 0.26, dark: 0.2 }))
      g.moveTo(-s * 0.18, -s * 0.86).lineTo(-s * 0.26, -s * 1.16).lineTo(-s * 0.02, -s * 0.94).closePath().fill(0x6b56a8)
      g.moveTo(s * 0.18, -s * 0.86).lineTo(s * 0.26, -s * 1.16).lineTo(s * 0.02, -s * 0.94).closePath().fill(0x6b56a8)
      g.circle(-s * 0.08, -s * 0.8, s * 0.05).fill(0xfff1a8)
      g.circle(s * 0.08, -s * 0.8, s * 0.05).fill(0xfff1a8)
    },
  },
}

const LAGEN = ['idle', 'glad', 'lekfull', 'somnig', 'sover']
// Vilorörelsens takt per värld: sten (snölandet) är trögare, natten piggare.
const VARLD_TAKT = [1, 0.96, 0.9, 1.07, 1.03, 0.93] // skog · vatten · sno · natt · oken · grotta
// Hur långt efter kroppen öron och svans släpar (rad). §1 "De fem slingorna".
const SLAP = 0.5
// Lekfullt läge. `LEK_R` är hur nära fingret måste röra sig, mätt i knyttets EGNA radier
// (r 92 i ceremonin → ~230 px), och `LEK_SLAPP` hur länge läget lever kvar efter att
// fingret stannat.
//
// ⚠️ Lekzonen är också lutningens MÄTTNAD, och det är samma tal med flit. Lutningen skrevs
// mot `_r * 4` (368 px) medan zonen är 230 — kroppen hade då aldrig kunnat nå mer än 62 %
// av den amplitud någon en gång valde, alltså ett värde som är skrivet men oåtkomligt
// (samma klass som hornet `krona`). Uppmätt vid samma fingerläge: 0,086 → 0,136 rad.
// Sidoförflyttningen behåller sin egen, långsammare ramp (4:5 mot lutningen).
const LEK_R = 2.5
const LEK_SIDO = LEK_R * 1.25
const LEK_SLAPP = 0.45

class Knytt {
  constructor(dna, opts = {}) {
    const d = dna || {}
    this._alive = true
    this._dna = d
    this._r = tal(opts.r, 90)
    this._ljud = opts.audio || null
    this._senare = typeof opts.senare === 'function' ? opts.senare : null
    this._bas = clamp(tal(d.storlek, 1), 0.5, 1.7)
    this._prop = laesProp(d)
    this._pal = laesPalett(d)
    this._varld = clamp(Math.round(tal(d.varld, 0)), 0, VARLD_TAKT.length - 1)
    // Sällsyntheten (§3b): tier 3 bär en gloria, tier 0 en kompis på huvudet. `opts.kompis`
    // 'sen' = kompisen finns men är inte här än (ceremonin flyger in den med `kompisIn()`),
    // false = ingen alls; annars sitter den från första bildrutan (hyllan, boden).
    this._tier = clamp(Math.round(tal(d.tier, 0)), 0, 3)
    this._kompisNyckel = typeof d.kompis === 'string' ? d.kompis : 'skalbagge'
    this._kompisLage = this._tier > 0 || opts.kompis === false ? 'ingen' : opts.kompis === 'sen' ? 'borta' : 'sitter'
    this._kompis = null
    this._kompisBild = null
    this._kompisDef = null
    this._gloria = null
    // En egen ström ur fröet: mönstrets prickar, öronens faser och blinktakten ska vara
    // knyttets egna och EXAKT desamma varje gång det ritas — aldrig ur en oseedad slumpkälla.
    this._rnd = mulberry32(((tal(d.fro, 1) >>> 0) ^ 0x9e3779b9) >>> 0)

    this._lage = 'idle'
    this._t = 0
    this._stilla = 0
    this._pt = new Point()
    this._pt2 = new Point()
    // Skalarer, inte ett objekt: det har jamfors och skrivs om VARJE bildruta sa lange
    // ett finger ror skarmen, och ett nytt {x,y} per ruta ar ren GC-last.
    this._pekHar = false
    this._pekPx = 0
    this._pekPy = 0
    this._lekKvar = 0

    // Varje gest äger sin egen skalär. `_apply()` är den ENDA som skriver transformer.
    this.s = {
      andasFas: this._prop.fas, andasAmp: 1, gupp: 0, hoppH: 0, strack: 0, landa: 0,
      gladhet: 0, lut: 0, wobble: 0, sank: 0, lock: 0, blink: 0, gasp: 0, vakna: 0, sido: 0,
    }
    this._lutV = 0
    // Lekzonen och dess två mättnadsnämnare är konstanta för knyttets livstid — `_r` sätts
    // en gång och skrivs aldrig om. Kvadraten sparar en Math.hypot per bildruta i `tick()`.
    this._lekR = this._r * LEK_R
    this._lekR2 = this._lekR * this._lekR
    this._lekSido = this._r * LEK_SIDO
    this._rotSlap = 0
    this._skuttKvar = 0
    this._skuttFas = 0
    this._skuttAktiv = false
    this._gladKvar = 0
    this._blinkT = 2 + this._rnd() * 2
    this._blinkFas = 0
    this._blickT = 1 + this._rnd() * 2
    this._blick = { x: 0, y: 0 }
    this._blickMal = { x: 0, y: 0 }
    this._gaspT = 5 + this._rnd() * 4
    this._gaspFas = -1

    this._bygg()
  }

  // --- bygget -------------------------------------------------------------

  _bygg() {
    const d = this._dna
    const r = this._r
    const prop = this._prop
    const p = this._pal
    const rnd = this._rnd

    const kropp = KROPPAR[Math.abs(Math.round(tal(d.kropp, 0))) % KROPPAR.length]
    const oron = ORON[Math.abs(Math.round(tal(d.oron, 0))) % ORON.length]
    const horn = HORN[Math.abs(Math.round(tal(d.horn, 0))) % HORN.length]
    const vinge = VINGAR[Math.abs(Math.round(tal(d.vingar, 0))) % VINGAR.length]
    const svans = SVANSAR[Math.abs(Math.round(tal(d.svans, 0))) % SVANSAR.length]
    const ben = BEN[Math.abs(Math.round(tal(d.ben, 0))) % BEN.length]
    const ogonform = OGON[Math.abs(Math.round(tal(d.ogonform, 0))) % OGON.length]
    const mun = MUNNAR[Math.abs(Math.round(tal(d.mun, 0))) % MUNNAR.length]
    const monster = MONSTER[Math.abs(Math.round(tal(d.monster, 0))) % MONSTER.length]
    this._benTyp = ben

    // Utan ben svävar knyttet en bit över marken — och guppar högre.
    const benH = ben.hojd > 0 ? r * ben.hojd * prop.benLangd : r * 0.16
    const m = byggMatt(kropp, r, prop, benH, prop.fas)
    this._m = m
    const look = { kropp, rnd, r, sida: 1, i: 0 }

    // --- nodhierarkin: en transform per nivå --------------------------------
    this.view = new Container()
    this.view.eventMode = 'none'
    this.view.interactiveChildren = false

    this._skugga = new Graphics()
      .ellipse(0, 0, m.bw * 0.82 * this._bas, m.bw * 0.24 * this._bas)
      .fill({ color: COLORS.shadow, alpha: 0.17 })

    this._skala = new Container() // storlek + andning + skutt
    this._skala.scale.set(this._bas)
    this._snurr = new Container() // rotation (lutning + glädjevickning)
    this._liv = new Container() // gupp + sidled
    this._fx = new Container() // transienta partiklar (uppvaknandet)
    this._fx.eventMode = 'none'
    this.view.addChild(this._skugga, this._skala, this._fx)
    this._skala.addChild(this._snurr)
    this._snurr.addChild(this._liv)

    // --- vingar (bakom allt) ------------------------------------------------
    this._vingar = []
    if (vinge.segment) {
      for (const sida of [-1, 1]) {
        const nod = new Container()
        nod.position.set(sida * m.bw * 0.72, m.axelY)
        const g = new Graphics()
        vinge.rita(g, p, m, prop, { ...look, sida })
        nod.addChild(g)
        nod._wfas = rnd() * TAU
        nod._wsida = sida
        this._liv.addChild(nod)
        this._vingar.push(nod)
      }
    }

    // --- svans (nästlade leder) ---------------------------------------------
    this._svans = []
    if (svans.segment) {
      let foralder = this._liv
      for (let i = 0; i < svans.segment; i++) {
        const nod = new Container()
        // Fästet läses ur SILHUETTEN på svansens höjd, inte ur bw: en droppe och ett päron är
        // olika breda där bak, och ett fast tal lämnar en glipa på den ena och gräver in i
        // den andra. `innerBredd` ger 86 % av halvbredden, så × 1,05 hamnar strax innanför
        // konturen och basen är alltid gömd bakom kroppen.
        if (i === 0) nod.position.set(innerBredd(kropp, prop, m, kropp.svansK) * 1.05, m.svansY)
        else nod.position.set(r * svans.langd * prop.svansLangd, 0)
        const g = new Graphics()
        svans.rita(g, p, m, prop, { ...look, i })
        nod.addChild(g)
        nod._wfas = i * 0.9
        foralder.addChild(nod)
        this._svans.push(nod)
        foralder = nod
      }
      // Grundlutningen: svansen pekar uppåt-bakåt, inte rakt ut i luften.
      this._svans[0]._wbas = -0.5
      for (let i = 1; i < this._svans.length; i++) this._svans[i]._wbas = -0.22
    }

    // --- öron ---------------------------------------------------------------
    this._oron = []
    if (oron.nyckel !== 'inga') {
      for (const sida of [-1, 1]) {
        const nod = new Container()
        // Fästet ligger på silhuetten en bit ner från hjässan, aldrig i luften ovanför.
        nod.position.set(sida * innerBredd(kropp, prop, m, -0.72) * 0.9, m.cy - m.bh * 0.72)
        const g = new Graphics()
        oron.rita(g, p, m, prop, { ...look, sida })
        nod.addChild(g)
        // Spegling med rotationens TECKEN, aldrig scale.x = −1.
        nod._wbas = sida * (0.28 + prop.oronLutning * 0.6) + (oron.nyckel === 'hang' ? sida * (0.4 + prop.oronHang * 0.7) : 0)
        nod.rotation = nod._wbas
        nod._wfas = rnd() * TAU
        nod._wsida = sida
        this._liv.addChild(nod)
        this._oron.push(nod)
      }
      // Skrällets vikta öra (steg 3): det vänstra viker sig ner — ett minne av att Skrället
      // åkte med in i degen. Ren kosmetik; `_apply` läser `_wbas` varje bildruta, så vikningen
      // följer med i släpet och vickningen i stället för att frysa örat.
      if (d.tofs && this._oron.length) {
        const o = this._oron[0]
        o._wbas -= 0.85
        o.rotation = o._wbas
        o.scale.y = 0.8
      }
    }

    // --- horn ---------------------------------------------------------------
    // Horn växer UR hjässan och ligger bakom kroppen. Kronan (`foran`) sitter PÅ den och läggs
    // därför efter kroppen, nedan — bakom kroppen syntes bara uddarnas spetsar.
    let hornForan = null
    if (horn.nyckel !== 'inga') {
      const g = new Graphics()
      horn.rita(g, p, m, prop, look)
      if (horn.foran) hornForan = g
      else this._liv.addChild(g)
    }

    // --- ben ----------------------------------------------------------------
    this._ben = []
    if (ben.hojd > 0) {
      for (const sida of [-1, 1]) {
        const nod = new Container()
        nod.position.set(sida * m.bw * 0.36, m.fotY)
        const g = new Graphics()
        ben.rita(g, p, m, prop, { ...look, sida })
        nod.addChild(g)
        nod._wsida = sida
        this._liv.addChild(nod)
        this._ben.push(nod)
      }
    }

    // --- kropp + mönster i EN statisk Graphics -------------------------------
    const kg = new Graphics()
    ritaKropp(kg, p, m, prop, look)
    monster.rita(kg, p, m, prop, look)
    this._liv.addChild(kg)
    if (hornForan) this._liv.addChild(hornForan)

    // --- Skrällets tofs (steg 3) ------------------------------------------------
    // Fyra lockar av Skrällets päls på hjässan, lite till vänster så en krona i mitten inte
    // döljer dem. Öppna vägar med stroke — en mörkare under, pälsen ovanpå — drar inga streck
    // tvärs över någon silhuett.
    this._tofsNod = null
    if (d.tofs) {
      const tg = new Graphics()
      const bx = -m.bredd * 0.14
      const by = m.topY + r * 0.05
      const LOCKAR = [[-0.16, -0.3, -0.26], [-0.04, -0.37, -0.08], [0.08, -0.33, 0.14], [0.18, -0.25, 0.3]]
      for (const [lager, bredd] of [[shade(SKRALL_PALS, 0.36), 0.095], [SKRALL_PALS, 0.058]]) {
        for (const [dx, h, lut] of LOCKAR) {
          tg.moveTo(bx + dx * r * 0.5, by)
            .quadraticCurveTo(bx + dx * r + lut * r * 0.5, by + h * r * 0.6, bx + dx * r + lut * r * 0.3, by + h * r)
            .stroke({ width: r * bredd, color: lager, cap: 'round' })
        }
      }
      this._liv.addChild(tg)
      this._tofsNod = tg
    }

    // --- ansiktet -----------------------------------------------------------
    this._ansikte = new Container()
    this._liv.addChild(this._ansikte)

    const kindG = new Graphics()
    const kr = r * 0.1 * prop.kindRadie
    const kx = m.bredd * 0.62
    kindG.ellipse(-kx, m.faceY + r * 0.16, kr * 1.15, kr * 0.82).fill(p.kind)
    kindG.ellipse(kx, m.faceY + r * 0.16, kr * 1.15, kr * 0.82).fill(p.kind)
    this._kinder = new Container()
    this._kinder.addChild(kindG)
    this._kinder.alpha = prop.kindAlfa
    this._ansikte.addChild(this._kinder)

    // Ögonen. Antalet är 1, 2 eller 3 — formen `tre` tvingar alltid fram pannögat.
    let antal = Math.round(tal(d.ogonantal, 2))
    antal = antal >= 3 ? 3 : antal === 1 ? 1 : 2
    if (ogonform.nyckel === 'tre') antal = 3
    const eh = r * 0.19 * prop.ogonSkala * (antal === 1 ? 1.34 : 1)
    // Ögonavståndet mäts mot KROPPEN (m.bredd), aldrig mot den nominella radien. Ett
    // `Math.min(m.bredd * 0.6, r * 0.3 * avstand)` såg riktigt ut och var det inte: r-termen
    // vann alltid, så en smal och en bred kropp fick EXAKT samma ögonavstånd (uppmätt 27,7 px
    // i båda) och proportionslagret var dött i ansiktet. Golvet håller ögonen från att
    // överlappa, taket håller dem innanför silhuetten.
    const dx = clamp(m.bredd * 0.34 * prop.ogonAvstand, eh * 1.12, m.bredd * 0.62)
    this._ogon = []
    const platser = antal === 1 ? [[0, m.faceY, 1]] : [[-dx, m.faceY, 1], [dx, m.faceY, 1]]
    if (antal === 3) platser.push([0, Math.max(m.topY + eh * 1.4, m.faceY - eh * 2.2), 0.78])
    for (const [ox, oy, k] of platser) this._ogon.push(this._byggOga(ox, oy, eh * k, ogonform))

    // Munnen: två lägen i var sin nod. Gäspningen tonar över till gapet i stället för att
    // rita om något varje bildruta.
    this._mun = new Container()
    this._mun.position.set(0, m.munY)
    const mg = new Graphics()
    mun.rita(mg, p, m, prop, look)
    this._mun.addChild(mg)
    this._gap = new Container()
    this._gap.position.set(0, m.munY + r * 0.04)
    const gg = new Graphics()
    gg.ellipse(0, 0, r * 0.13 * prop.munBredd, r * 0.16).fill(shade(p.pupill, 0.05))
    gg.ellipse(0, r * 0.07, r * 0.07, r * 0.05).fill({ color: p.kind, alpha: 0.8 })
    this._gap.addChild(gg)
    this._gap.alpha = 0
    this._ansikte.addChild(this._gap, this._mun)

    // --- kompisen på hjässan (bara vanliga knytt) -----------------------------
    // Hållaren `_kompis` bär platsen (och flygturen in, som tweenas av `kompisIn`);
    // bilden `_kompisBild` bär fladdret, skrivet av `_apply` varje bildruta. Två noder,
    // två skrivare — samma regel som resten av riggen.
    if (this._kompisLage !== 'ingen') {
      const def = KOMPISAR[this._kompisNyckel] || KOMPISAR.skalbagge
      const hall = new Container()
      hall._wx = m.bw * 0.24
      // Har knyttet en krona sätter sig kompisen PÅ den, inte i den (uddarna når −0,27 r).
      hall._wy = m.topY + r * 0.03 - (hornForan ? r * 0.3 : 0)
      hall._wfas = rnd() * TAU
      hall.position.set(hall._wx, hall._wy)
      hall.visible = this._kompisLage === 'sitter'
      const bild = new Container()
      const kg = new Graphics()
      def.rita(kg, r * 0.19)
      bild.addChild(kg)
      hall.addChild(bild)
      this._liv.addChild(hall)
      this._kompis = hall
      this._kompisBild = bild
      this._kompisDef = def
    }

    // --- glorian (bara guld) — ett guldknytt känns igen på SILUETTEN, inte bara på skimret --
    if (this._tier === 3) {
      const gl = new Container()
      gl._wy = m.topY - r * (hornForan ? 0.52 : 0.3) // ovanför kronans uddar, aldrig i dem
      gl.position.set(0, gl._wy)
      const gg = new Graphics()
      const rx = Math.max(r * 0.22, m.bw * 0.46)
      gg.ellipse(0, 0, rx, rx * 0.32).stroke({ width: r * 0.07, color: 0xf3c74f })
      gg.ellipse(0, -r * 0.012, rx * 0.9, rx * 0.22).stroke({ width: r * 0.024, color: 0xfff3c0, alpha: 0.85 })
      gl.addChild(gg)
      this._liv.addChild(gl)
      this._gloria = gl
    }

    for (const nod of this._liv.children) nod.eventMode = 'none'
  }

  _byggOga(x, y, e, form) {
    const p = this._pal
    const prop = this._prop
    const oga = new Container()
    oga.position.set(x, y)

    const vitG = new Graphics()
    form.vit(vitG, p, e, prop)
    if (prop.blank >= 1.5) vitG.circle(e * 0.46, -e * 0.5, e * 0.2).fill({ color: COLORS.white, alpha: 0.6 })

    const pupNod = new Container()
    const pupG = new Graphics()
    form.pupill(pupG, p, e, prop)
    pupNod.addChild(pupG)

    // Ögonlocket: en kropps-färgad lucka som sänks uppifrån. Noden sitter i lockets ÖVERKANT
    // så `scale.y` sänker den i stället för att krympa den mot ögats mitt.
    //
    // ÅTGÄRDER U6: locket var en FLAT `p.bas`-lucka med rak överkant, och blixtrade förbi som
    // ett band tvärs över ansiktet vid varje blink. Uppmätt på sex ogonform (`_lockbild.mjs`):
    // ⓵ locket låg −37 i BLÅ mot pannan medan luminansen bara skilde −8,5 — på en gul kropp
    //   bär blå-kanalen hela mättnadsskillnaden, och ögat ser mättnad. Kroppen runt omkring
    //   är `sphereFill`-tonad; en platt lapp mitt i den läser som ett klistermärke.
    //   ⚠️ ATT MATCHA ANSIKTETS TON GÅR INTE, och det kostade två försök att lära sig. Locket
    //   GLIDER över ansiktet, och gradienten är bakad i lockets EGET rum: kalibrerad mot
    //   pannan (`tint(bas, 0.23)` = 241,229,126 på pricken) försvann överkanten helt stängd
    //   (16 → 2 kanalsteg) men vid `somnig` (0,7) trycktes den ljusa toppen ner över ögat, där
    //   kroppen är mörkare, och locken lyste som två ljusa lådor. Kalibrerad mot ögonhöjd i
    //   stället (238,223,93 ≈ `p.bas`) blev halvläget rätt och överkanten 18 — SÄMRE än den
    //   platta. Ingen fast ton kan matcha en bakgrund ytan rör sig över.
    //   Locket tonar därför in ur GENOMSKINLIGT (`fadeTopFill`): då finns ingen överkant att
    //   se i något stängningsläge, och botten läser som den skugga locket KASTAR.
    //   ⚠️ Intoningen måste vara FÄRDIG ovanför ögat. Första försöket lade den över de översta
    //   0,26 av luckan (0,91e) — och eftersom ögats överkant ligger på 1,34e hamnade ögat
    //   INNE i det halvgenomskinliga skedet och lyste igenom locket: 37 kanalsteg, mätt vid
    //   −1,22e, alltså på ÖGATS kant och inte på lockets. Luckan börjar därför 0,92e HÖGRE
    //   upp, så hela fadet ligger mellan −2,52e och −1,62e — ovanför ögat i varje läge.
    // ⓶ överkanten var en rak vågrät linje och gav 16 kanalsteg mellan två grannpixlar. Den
    //   är nu en grund bryn-BÅGE; sidorna svänger in så luckan blir en kupa, inte en låda.
    // ⓷ ögonen står 2,93e isär och locken var 3e breda RAKT UPP — de möttes vid brynet, och
    //   det var därför bandet gick tvärs över HELA ansiktet i stället för att sitta över
    //   varsitt öga. Luckan är därför inte längre lika bred hela vägen: den är smalast vid
    //   brynet (±1,31e → 2,61e < 2,93e, alltså åtskilda) och bredast RAKT ÖVER ögat (±1,53e,
    //   som täcker `stjarna`s 1,34e med marginal). Formen blev en mandel i stället för en
    //   låda, vilket är vad ett ögonlock är.
    const lockNod = new Container()
    lockNod.position.set(0, -e * 1.6)
    const lockG = new Graphics()
    const lw = e * 1.5
    lockG
      .moveTo(-lw * 0.87, -e * 0.6)
      .quadraticCurveTo(0, -e * 1.24, lw * 0.87, -e * 0.6)
      .quadraticCurveTo(lw * 1.02, e * 1.5, lw * 0.9, e * 2.5)
      .quadraticCurveTo(0, e * 3.5, -lw * 0.9, e * 2.5)
      .quadraticCurveTo(-lw * 1.02, e * 1.5, -lw * 0.87, -e * 0.6)
      .closePath()
      .fill(fadeTopFill(tint(p.bas, 0.09), { fade: 0.2, dark: 0.22, mid: 0.62 }))
    // Lockkanten. Utan den slutar locket bara — och det är kanten som gör att ett ögonlock
    // läses som ett ögonlock och inte som en lucka.
    lockG
      .moveTo(-lw * 0.9, e * 2.5)
      .quadraticCurveTo(0, e * 3.5, lw * 0.9, e * 2.5)
      .stroke({ width: e * 0.16, color: shade(p.bas, 0.34), cap: 'round' })
    lockNod.addChild(lockG)
    lockNod.scale.y = 0

    // De två slutna ögonen: ∩ när knyttet är glatt, ⌣ när det sover.
    const bageGlad = new Graphics()
    bageGlad.moveTo(-e, e * 0.42).quadraticCurveTo(0, -e * 0.9, e, e * 0.42).stroke({ width: e * 0.3, color: p.pupill, cap: 'round' })
    bageGlad.visible = false
    const bageSov = new Graphics()
    bageSov.moveTo(-e, -e * 0.16).quadraticCurveTo(0, e * 0.82, e, -e * 0.16).stroke({ width: e * 0.28, color: p.pupill, cap: 'round' })
    bageSov.visible = false

    oga.addChild(vitG, pupNod, lockNod, bageGlad, bageSov)
    this._ansikte.addChild(oga)
    const fri = form.frihet ? form.frihet(e, prop) : { x: e * 0.3, y: e * 0.3 }
    return { nod: oga, pup: pupNod, lock: lockNod, glad: bageGlad, sov: bageSov, e, fx: fri.x, fy: fri.y }
  }

  // --- lägesmaskinen ------------------------------------------------------

  get lage() {
    return this._lage
  }

  setLage(lage) {
    if (!this._alive || this.view.destroyed) return this
    const nytt = LAGEN.indexOf(lage) >= 0 ? lage : 'idle'
    if (nytt === this._lage) {
      if (nytt === 'glad') this._gladKvar = 1.8
      return this
    }
    if (this._lage === 'sover' && nytt !== 'sover') this._vakna()
    this._lage = nytt
    if (nytt !== 'somnig' && nytt !== 'sover') this._stilla = 0
    if (nytt === 'glad') {
      this._gladKvar = 1.8
      this.hoppa(3)
    }
    if (nytt === 'somnig') this._gaspT = 1.2
    return this
  }

  // Glädjeskutt + knyttets EGET fyrtonsmotiv. Motivet är dess röst: två knytt låter olika
  // även utan att någon valt något.
  glad() {
    if (!this._alive || this.view.destroyed) return this
    this.setLage('glad')
    this._gladKvar = 1.8
    // Även ett tryck mitt i glädjen ska ge ett skutt. Utan raden svarar knyttet bara
    // FÖRSTA gången, och ett barn som trycker fyra gånger i rad möter tre tysta tryck.
    this.hoppa(2)
    this._spelaMotiv()
    return this
  }

  hoppa(n = 3) {
    if (!this._alive || this.view.destroyed) return this
    if (this._lage === 'sover') this._vakna()
    this._stilla = 0
    this._skuttKvar = Math.max(this._skuttKvar, Math.max(1, Math.round(n)))
    if (!this._skuttAktiv) {
      this._skuttAktiv = true
      this._skuttFas = 0
    }
    return this
  }

  /** Kvittrar sitt motiv och tar ett litet skutt — bodens grannprat, utan hela glädjeläget. */
  sjung() {
    if (!this._alive || this.view.destroyed) return this
    if (this._lage === 'sover') this._vakna()
    this.hoppa(1)
    this._spelaMotiv()
    return this
  }

  get tier() { return this._tier }
  /** 'sitter' · 'borta' (finns, har inte flugit in än) · 'ingen' (skimrande knytt). */
  get kompis() { return this._kompisLage }
  get gloria() { return !!this._gloria }
  /** Bär knyttet Skrällets tofs (steg 3)? */
  get tofs() { return !!this._tofsNod }

  /**
   * Kompisen flyger in och sätter sig på hjässan — vanliga knytts egen gåva (§3b). `fran`
   * anges i r-enheter i knyttets EGEN rymd (ceremonin skickar ett hörn långt bort uppe
   * till vänster). Tweenen ligger på hållaren, som `_apply()` aldrig rör: bilden i den
   * fladdrar per bildruta, hållaren flyger. `stadFx` når hållaren vid rivning.
   */
  kompisIn(fran = { x: -4, y: -3 }) {
    const k = this._kompis
    if (!this._alive || this.view.destroyed || !k || k.destroyed || this._kompisLage !== 'borta') return this
    this._kompisLage = 'sitter'
    const r = this._r
    const x0 = tal(fran?.x, -4) * r
    const y0 = tal(fran?.y, -3) * r
    k.position.set(x0, y0)
    k.visible = true
    gsap.killTweensOf(k)
    const topp = Math.min(y0, k._wy) - r * 0.6
    gsap.timeline()
      .to(k, { x: k._wx, duration: 1.05, ease: 'sine.inOut' }, 0)
      .to(k, { y: topp, duration: 0.5, ease: 'sine.out' }, 0)
      .to(k, {
        y: k._wy,
        duration: 0.55,
        ease: 'bounce.out',
        onComplete: () => {
          if (!this._alive || this.view.destroyed) return
          sparkle(this._fx, k._wx * this._bas, k._wy * this._bas, { count: 5 })
          this._ljud?.tone?.({ freq: 988, dur: 0.12, type: 'sine', vol: 0.12 })
          this._senare?.(0.1, () => {
            if (this._alive && !this.view.destroyed) this._ljud?.tone?.({ freq: 1319, dur: 0.14, type: 'sine', vol: 0.1 })
          })
          this.hoppa(1)
        },
      }, 0.5)
    return this
  }

  // `delay` läggs på LJUDMOTORNS egen klocka (AudioService._tone gör `o.start(currentTime +
  // delay)` och sparar noden ingenstans), så varken `destroy()`, `stadFx()` eller
  // `audio.stopAllLoops()` når den: tryckte barnet på ett knytt i ett bo och sedan på
  // hem-knappen spelade upp till 0,5 s av motivet vidare på menyn, utan bild. `_senare` är
  // `ctx.later` och dör med omgången — samma mönster som `_vakna` redan använder nedan.
  // Första tonen går direkt, så återkopplingen ligger kvar under 100 ms (P0).
  _spelaMotiv() {
    const motiv = Array.isArray(this._dna.motiv) ? this._dna.motiv : []
    for (let i = 0; i < motiv.length; i++) {
      const f = tal(motiv[i], 0)
      if (f <= 40) continue
      const spela = () => this._ljud?.tone?.({ freq: f, dur: 0.17, type: 'triangle', vol: 0.15 })
      if (i === 0) spela()
      else if (this._senare) {
        this._senare(i * 0.11, () => { if (this._alive && !this.view.destroyed) spela() })
      } else {
        this._ljud?.tone?.({ freq: f, dur: 0.17, type: 'triangle', vol: 0.15, delay: i * 0.11 })
      }
    }
  }

  // Stor förskräckt pop — rolig, aldrig en skräck (P0 MOTGÅNG).
  _vakna() {
    this.s.vakna = 1
    this.s.lock = 0
    this._stilla = 0
    this._lage = 'idle'
    this._ljud?.sfx?.('pop')
    this._ljud?.tone?.({ freq: 520, dur: 0.14, type: 'sine', vol: 0.16, slideTo: 880 })
    const y = this._m.faceY * this._bas
    sparkle(this._fx, 0, y, { count: 6 })
    puff(this._fx, 0, y, { count: 6, color: this._pal.ljus })
    this._senare?.(0.18, () => {
      if (this._alive && !this.view.destroyed) this._ljud?.tone?.({ freq: 660, dur: 0.12, type: 'triangle', vol: 0.12 })
    })
    this.hoppa(2)
  }

  // --- bildrutan ----------------------------------------------------------

  tick(dtMS, pekare) {
    if (!this._alive || this.view.destroyed) return
    const dt = clamp(tal(dtMS, 16) / 1000, 0, 0.05)
    const prop = this._prop
    const s = this.s
    this._t += dt

    // Fingret räknas som liv bara när det RÖR sig: en still muspekare ska inte hindra
    // knyttet från att somna.
    let flytt = 0
    if (pekare && typeof pekare.x === 'number') {
      if (this._pekHar) flytt = Math.hypot(pekare.x - this._pekPx, pekare.y - this._pekPy)
      this._pekHar = true
      this._pekPx = pekare.x
      this._pekPy = pekare.y
    } else this._pekHar = false
    if (flytt > 6) this._stilla = 0
    else this._stilla += dt

    // LEKFULLT — fingret lever NÄRA mig.
    //
    // Läget fanns skrivet men gick inte att nå: `setLage()` anropades bara med 'glad'.
    // Vad det ska betyda står redan i dess egen kod och behövde inte hittas på — två av
    // dess fyra effekter (kroppens lutning och sidoförflyttningen) står och faller med
    // att `pekare` finns alls, alltså handlar läget om fingret och ingenting annat.
    // Hyllans knytt får `tick(dt, null)` och kan därför aldrig gå in i det, vilket är rätt:
    // de har inget finger att luta sig mot.
    //
    // Egen rörelsetröskel (0,5 px), inte sömnlogikens 6 px ovan: den senare kräver 6 px
    // MELLAN två bildrutor för att en darrande muspekare inte ska hålla knyttet vaket i
    // evighet, och ett långsamt AVSIKTLIGT drag (3 px/ruta) hade då lästs som stillastående
    // och fått läget att blinka av och på. Sömnlogiken är oförändrad.
    //
    // Bara från 'idle': 'glad' är belöningen efter ett tryck (skutt + eget motiv + glada
    // ögon) och får aldrig kapas, och 'somnig'/'sover' väcks av tryck, inte av ett finger
    // som svävar förbi. När 'glad' tar slut faller det tillbaka till 'idle' och nästa
    // bildruta går in i 'lekfull' om fingret är kvar — trycket blir alltså inte ett avbrott
    // i leken utan en topp i den.
    const pdx = pekare ? pekare.x - this.view.x : 0
    const pdy = pekare ? pekare.y - this.view.y : 0
    const nara = !!pekare && pdx * pdx + pdy * pdy < this._lekR2
    if (nara && flytt > 0.5) this._lekKvar = LEK_SLAPP
    else this._lekKvar = Math.max(0, this._lekKvar - dt)
    if (this._lage === 'idle' && this._lekKvar > 0) this._lage = 'lekfull'
    else if (this._lage === 'lekfull' && this._lekKvar <= 0) this._lage = 'idle'

    // Sömnen kommer av sig själv: 12 s till sömnig, 8 s till efter det till sover.
    // Står EFTER lekfullheten med flit: den bildruta då leken släpper ska kunna somna
    // direkt om fingret redan varit borta länge, i stället för att vänta en ruta till.
    if (this._lage === 'idle' && this._stilla > 12) this._lage = 'somnig'
    else if (this._lage === 'somnig' && this._stilla > 20) this._lage = 'sover'
    if (this._lage === 'glad') {
      this._gladKvar -= dt
      if (this._gladKvar <= 0) this._lage = 'idle'
    }
    const sover = this._lage === 'sover'
    const somnig = this._lage === 'somnig' || sover
    const lekfull = this._lage === 'lekfull'

    // Andningen: takt ur fröet, modulerad av världen och halverad i sömnen. Moduleringen är
    // medvetet MILD och klampad — `dna.js` har redan lagt sin egen på `prop.andning`, och två
    // lager som multipliceras ohämmat ger ett nattknytt som flåsar och ett stenknytt som ser
    // fruset ut. Klampen är det som gör att båda lagren kan finnas utan att slåss.
    const takt = clamp(prop.andning * VARLD_TAKT[this._varld], 1.1, 2.8) * (sover ? 0.34 : somnig ? 0.5 : 1)
    s.andasFas += dt * takt
    s.andasAmp = naerma(s.andasAmp, sover ? 1.5 : 1, 3, dt)

    // Guppet — utan ben svävar knyttet och guppar högre (dna.js har redan gett en svävande
    // kropp ×1,25, så påslaget här är litet och summan klampad).
    const guppAmp = clamp(prop.gupp * (this._benTyp.hojd > 0 ? 1 : 1.35), 3, 11) * (sover ? 0.4 : 1)
    s.gupp = Math.sin(s.andasFas * 0.62 + prop.fas) * guppAmp

    // Skutten.
    if (this._skuttAktiv) {
      this._skuttFas += dt * 3.1
      if (this._skuttFas >= 1) {
        this._skuttFas = 0
        this._skuttKvar -= 1
        s.landa = 1
        this._ljud?.tone?.({ freq: 300 + this._skuttKvar * 40, dur: 0.07, type: 'sine', vol: 0.08 })
        if (this._skuttKvar <= 0) this._skuttAktiv = false
      }
    }
    const luft = this._skuttAktiv ? Math.sin(this._skuttFas * Math.PI) : 0
    s.hoppH = luft * this._m.bh * 0.55
    s.landa = Math.max(0, s.landa - dt * 4.2)
    s.strack = luft * 0.13 - s.landa * 0.15

    // Glädjen: ögonen kniper, kinderna tänds, munnen växer.
    s.gladhet = naerma(s.gladhet, this._lage === 'glad' ? 1 : 0, 6, dt)
    s.wobble = this._lage === 'glad' ? Math.sin(this._t * 12) * 0.12 * s.gladhet : naerma(s.wobble, 0, 8, dt)

    // Lekfullt: kroppen lutar efter fingret med tröghet och FJÄDRAR tillbaka vid släpp.
    // En fjäder behöver en hastighetsterm — utan den är det bara en easing som aldrig
    // svänger över och alltså aldrig studsar.
    const lutMal = lekfull && pekare ? clamp(pdx / this._lekR, -1, 1) * 0.24 : 0
    this._lutV += ((lutMal - s.lut) * 30 - this._lutV * 7.5) * dt
    s.lut = clamp(s.lut + this._lutV * dt, -0.5, 0.5)
    s.sido = naerma(s.sido, lekfull && pekare ? clamp(pdx / this._lekSido, -1, 1) * this._r * 0.1 : 0, 6, dt)

    // Sömnigheten: sjunker ihop och plattas till.
    s.sank = naerma(s.sank, sover ? 1 : somnig ? 0.55 : 0, 2.4, dt)

    // Blink: en kort procedurell puls, inte en tween. Var 3,5 s ±1,2.
    if (!somnig) {
      this._blinkT -= dt
      if (this._blinkT <= 0) {
        this._blinkT = 3.5 + (this._rnd() * 2.4 - 1.2)
        this._blinkFas = 0.001
      }
      if (this._blinkFas > 0) {
        this._blinkFas += dt / 0.17
        if (this._blinkFas >= 1) this._blinkFas = 0
      }
      s.blink = this._blinkFas > 0 ? Math.sin(this._blinkFas * Math.PI) : 0
    } else s.blink = 0
    s.lock = naerma(s.lock, sover ? 1 : somnig ? 0.7 : 0, 4, dt)

    // Gäspningen — en sömnig varelse som bara sitter still är en bild, inte ett djur.
    if (somnig && !sover) {
      this._gaspT -= dt
      if (this._gaspT <= 0 && this._gaspFas < 0) {
        this._gaspFas = 0.001
        this._gaspT = 8 + this._rnd() * 3
        this._ljud?.tone?.({ freq: 300, dur: 0.5, type: 'sine', vol: 0.07, slideTo: 200 })
      }
    }
    if (this._gaspFas >= 0) {
      this._gaspFas += dt / 1.15
      if (this._gaspFas >= 1) this._gaspFas = -1
    }
    s.gasp = this._gaspFas >= 0 ? Math.sin(this._gaspFas * Math.PI) : 0

    s.vakna = Math.max(0, s.vakna - dt * 1.7)

    this._blicka(dt, pekare, somnig)
    this._apply(dt, lekfull)
  }

  // Blicken. Pupillen rör sig som en KLAMPAD VEKTOR — den kan aldrig krypa ut ur ögat, hur
  // långt bort fingret än är. Utslaget är medvetet större än `karaktarer.look()`s: knyttet
  // är spelets huvudperson och dess blick ska SYNAS.
  _blicka(dt, pekare, somnig) {
    let mx = 0
    let my = 0
    let lp = null
    if (pekare && typeof pekare.x === 'number' && !somnig && this.view.parent) {
      this._pt.set(pekare.x, pekare.y)
      lp = this._ansikte.toLocal(this._pt, this.view.parent, this._pt2)
      // ⚠️ En förälder med SKALA 0 har ingen invers — ceremonins `bounceIn` av knyttets hållare
      // börjar exakt där — och `toLocal` ger då NaN. Den bildrutan räknas som "ingen pekare".
      // Utan vakten bar `naerma()` ett enda NaN vidare för alltid: det nyfödda knyttet stod på
      // bänken med två VITA ögon utan pupill så fort fingret varit över skärmen under födseln
      // (bildgranskningen i poleringsrundans steg 3; `_knyttlyftprobe` O1: NaN → ändlig).
      if (!Number.isFinite(lp.x) || !Number.isFinite(lp.y)) lp = null
    }
    if (lp) {
      const dx = lp.x
      const dy = lp.y - this._m.faceY
      const len = Math.hypot(dx, dy) || 1
      const k = Math.min(1, len / (this._r * 3.2))
      mx = (dx / len) * k
      my = (dy / len) * k
      this._blickT = 1.2
    } else {
      // Ingen pekare: en slumpad blick var 3–5 s, så knyttet ser ut att tänka på något.
      this._blickT -= dt
      if (this._blickT <= 0) {
        this._blickT = 3 + this._rnd() * 2
        const a = this._rnd() * TAU
        const k = 0.35 + this._rnd() * 0.55
        this._blickMal = { x: Math.cos(a) * k, y: Math.sin(a) * k * 0.7 }
      }
      mx = this._blickMal.x
      my = this._blickMal.y
    }
    this._blick.x = naerma(this._blick.x, mx, 9, dt)
    this._blick.y = naerma(this._blick.y, my, 9, dt)
    // Sista vakten: ett NaN som ändå slunkit in från någon annan väg nollställs, i stället för
    // att sitta kvar i pupillen resten av knyttets liv.
    if (!Number.isFinite(this._blick.x) || !Number.isFinite(this._blick.y)) {
      this._blick.x = 0
      this._blick.y = 0
    }
  }

  // ENDA stället där transformer skrivs. Varje skalär summeras exakt en gång per bildruta.
  _apply(dt, lekfull) {
    const s = this.s
    const m = this._m
    const bas = this._bas

    const andas = Math.sin(s.andasFas) * 0.04 * s.andasAmp
    const platt = s.sank * 0.09
    const pop = s.vakna * s.vakna * 0.26
    this._skala.scale.set(
      bas * (1 - andas * 0.6 - s.strack * 0.8 + platt * 0.7 + pop * 0.7),
      bas * (1 + andas + s.strack - platt + pop),
    )

    const rot = s.lut + s.wobble
    this._snurr.rotation = rot
    this._liv.x = s.sido
    this._liv.y = -s.gupp - s.hoppH + s.sank * 15 - s.vakna * s.vakna * 22

    // Skuggan krymper när knyttet lyfter — det är den som säger att hoppet är ett hopp.
    const hojd = (s.hoppH + s.gupp) / Math.max(1, m.bh)
    this._skugga.scale.set(clamp(1 - hojd * 0.42, 0.55, 1.1))
    this._skugga.alpha = clamp(0.17 - hojd * 0.06, 0.05, 0.2)

    // Öron och svans SLÄPAR efter kroppen: den lågpassade rotationen dras från den verkliga,
    // och skillnaden är släpvinkeln. I lekfullt läge piskar de 2,5 gånger så hårt.
    this._rotSlap = naerma(this._rotSlap, rot, 9, dt)
    const piska = (lekfull ? 2.5 : 1) * (1 + s.gladhet * 0.6)
    const slap = (rot - this._rotSlap) * 2.4 * piska

    for (const nod of this._oron) {
      if (nod.destroyed) continue
      nod.rotation = nod._wbas + slap * SLAP * 2 + Math.sin(s.andasFas * 0.9 + nod._wfas) * 0.06 * (1 + s.gladhet)
    }
    for (let i = 0; i < this._svans.length; i++) {
      const nod = this._svans[i]
      if (nod.destroyed) continue
      const amp = (0.5 + i * 0.22) * piska
      nod.rotation = nod._wbas + slap * SLAP * amp + Math.sin(this._t * 2.1 + nod._wfas) * 0.09 * amp
    }
    for (const nod of this._vingar) {
      if (nod.destroyed) continue
      nod.rotation = nod._wsida * (Math.sin(this._t * (lekfull ? 9 : 4.5) + nod._wfas) * 0.2 + 0.08) * (1 - s.sank * 0.7)
    }
    // Benen gungar i takt vid glädjeskutten — bara de långa har led nog för det.
    if (this._benTyp.sviktar) {
      for (const nod of this._ben) {
        if (nod.destroyed) continue
        nod.rotation = Math.sin(this._skuttFas * TAU) * 0.26 * (this._skuttAktiv ? 1 : 0) * nod._wsida
      }
    }

    // Ansiktet.
    const lid = clamp(s.lock + s.blink + s.gladhet * 0.62 + s.gasp * 0.5, 0, 1)
    const gladOgon = s.gladhet > 0.45 && s.lock < 0.4
    for (const o of this._ogon) {
      if (o.nod.destroyed) continue
      o.lock.scale.y = lid
      const slutet = lid > 0.78
      o.glad.visible = slutet && gladOgon
      o.sov.visible = slutet && !gladOgon
      // Blickvektorn är enhetsklampad; frihetsmåttet är formens eget. Produkten kan därför
      // aldrig lägga pupillen utanför vitan, hur långt bort fingret än står.
      const k = 1 - lid * 0.55
      o.pup.position.set(this._blick.x * o.fx * k, this._blick.y * o.fy * k)
    }
    this._kinder.alpha = this._prop.kindAlfa * (1 + s.gladhet * 0.4 + s.vakna * 0.3)
    this._mun.scale.set(1 + s.gladhet * 0.22, 1 + s.gladhet * 0.55)
    this._mun.alpha = 1 - s.gasp * 0.85
    this._gap.alpha = s.gasp
    this._gap.scale.set(0.7 + s.gasp * 0.5, 0.5 + s.gasp * 0.9)

    // Kompisen fladdrar (vingar) eller vaggar (skalbagge, fisk), piggare när knyttet är glatt,
    // och SLÄPAR efter kroppen som öronen gör. Bara bilden — hållaren är flygturens.
    const kb = this._kompisBild
    if (kb && !kb.destroyed) {
      const f = this._kompisDef?.fladder ? 1.7 : 1
      const fas = this._kompis?._wfas || 0
      kb.rotation = Math.sin(this._t * 3.4 * f + fas) * 0.09 + slap * 0.5
      kb.scale.set(1, 1 + Math.sin(this._t * 7 * f + fas) * 0.05 * (1 + s.gladhet))
    }
    // Glorian guppar i sin EGEN takt ovanför huvudet och sjunker med i sömnen.
    const gl = this._gloria
    if (gl && !gl.destroyed) {
      gl.y = gl._wy - Math.sin(this._t * 1.9 + this._prop.fas) * this._r * 0.035 + s.sank * this._r * 0.12
      gl.rotation = Math.sin(this._t * 0.8) * 0.05
    }
  }

  destroy() {
    this._alive = false
    // Städhjälparen FÖRE rivningen, aldrig efter: en tween som redan skriver på en nollad
    // transform hinner kasta innan destroy() ens är klar.
    stadFx(this.view)
    if (this._kompis) gsap.killTweensOf(this._kompis)
    if (this.view && !this.view.destroyed) this.view.destroy({ children: true })
    this._kompis = null
    this._kompisBild = null
    this._gloria = null
    this._ogon = []
    this._oron = []
    this._svans = []
    this._vingar = []
    this._ben = []
  }
}

export function byggKnytt(dna, opts = {}) {
  return new Knytt(dna, opts)
}

