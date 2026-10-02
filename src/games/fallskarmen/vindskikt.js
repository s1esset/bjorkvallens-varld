// VINDEN I HÖJDSKIKT — luften har olika håll på olika höjd (FYSIKPLAN F4, kluster B4, `lib/vind.js`).
//
// Förut var vinden ETT tal för hela luftrummet som bytte håll på en timer (`_wind`, 3–6 s): barnet
// stod i samma vind hela vägen ner. Nu består luftrummet av tre SKIKT över varandra — ett högt, ett
// mitt i, ett lågt — och varje skikt har sitt eget håll och sin egen styrka. Fallskärmen sjunker
// genom dem och märker det: i det översta skiktet blåser det åt ett håll, en bit ner åt det andra.
// Det är en riktig lek med höjd — man kan låta det höga skiktet putta en dit man vill, och sedan
// styra emot i det låga.
//
// Varje skikt är ett `Vindfalt` (typ `band`, ett vågrätt band tvärs över hela luftrummet, `luft` =
// luftens fart i px/bildruta). Banden överlappar (halvhöjd = skiktavståndet) och tonar mot sina
// kanter, så farten byter mjukt mellan skikten i stället för att hoppa. Luften provas i
// torsonivå (`PROV_OFFSET` ovanför fötterna), klämd till det översta/understa skiktets mitt: ovanför
// det översta skiktet gäller det, nedanför det understa gäller det.
//
// Rena tal + `lib/vind.js` (ingen Pixi, ingen matter, inga timers) så att
// `scripts/_skiktprobe.mjs` kan köra EXAKT spelets kod. Vindfalt stegar inte själv här (spelet har
// ingen matter-värld) — spelet äger tiden: `stegaSkikt(sk, dt)` skriver varje skikts `styrka`.
import { Vindfalt } from '../../lib/vind.js'

export const SKIKT_Y = [190, 320, 450] // skiktens mitt (design-y)
export const SKIKT_AVST = 130 // avstånd mellan skiktens mitt = bandens halvhöjd (de överlappar)
export const PROV_OFFSET = 60 // luften provas så här långt ovanför fötterna (chute.y)
export const BY_DJUP = 0.4 // hur mycket ett skikts styrka sväller och lägger sig (0 = jämnt)
export const BY_PERIOD = [5.2, 6.8, 4.4] // s per skikt — olika, så de aldrig går i takt
const TAL = SKIKT_Y.length

// Mönster: styrkan per skikt som andel (−1…1) av nivåns vindstyrka — tecknet är håll (+ = åt höger).
// Alla har minst ett skikt åt vardera hållet, så nettodriften vid passivt fall är ≤ ETT skikts, och
// det understa skiktet är aldrig det starkaste (landningen ska gå att styra).
export const MONSTER = [
  { id: 'jetström', r: [1.0, -0.7, 0.3] }, // högt starkt, mitten emot, lågt svagt
  { id: 'skjuvning', r: [0.6, 1.0, -0.7] },
  { id: 'motsatt', r: [0.9, -0.3, -0.7] },
  { id: 'vagen', r: [-0.4, 0.9, -0.5] },
]

export function nyttSkikt() {
  const falt = SKIKT_Y.map(
    (y) =>
      new Vindfalt({
        form: { typ: 'band', x: -400, y, rackvidd: 2200, halvhojd: SKIKT_AVST },
        luft: { x: 0, y: 0 },
        avtag: { langs: 0, tvars: 0.9 }, // jämn längs bandet, tonar mot kanterna (0,1 vid kanten)
        aktiv: true,
        styrka: 1,
      }),
  )
  return { falt, farstark: [0, 0, 0], fas: [0, 0.31, 0.62], t: 0, monster: null, tecken: 1, amp: 0 }
}

// Ställ skikten för en runda: `farPx` = nivåns största luftfart (px/bildruta), `monster` ur MONSTER,
// `tecken` ±1 (spegling). Källan sitter på den sida vinden kommer ifrån.
export function stallSkikt(sk, { farPx, monster, tecken = 1 }) {
  sk.monster = monster
  sk.tecken = tecken
  sk.amp = farPx
  sk.t = 0
  for (let i = 0; i < TAL; i++) {
    const v = monster.r[i] * tecken * farPx
    sk.farstark[i] = v
    const f = sk.falt[i]
    f.luft.x = v
    f.luft.y = 0
    f.form.x = v >= 0 ? -400 : 1680
    f.styrka = 1
  }
}

// Egen tid: styrkan sväller och lägger sig periodiskt per skikt (en by som kommer och går).
export function stegaSkikt(sk, dt) {
  sk.t += dt
  for (let i = 0; i < TAL; i++) {
    const w = 0.5 - 0.5 * Math.cos((sk.t / BY_PERIOD[i]) * Math.PI * 2 + sk.fas[i] * Math.PI * 2)
    sk.falt[i].styrka = 1 - BY_DJUP * w
  }
}

// Luftens vågräta fart (px/bildruta) vid (x, y) — summan av skikten som täcker punkten. `y` är provpunkten
// (typiskt fötternas y − PROV_OFFSET); den klämms till skiktens spann.
export function luftHos(sk, x, y) {
  const yy = Math.max(SKIKT_Y[0], Math.min(SKIKT_Y[TAL - 1], y))
  let vx = 0
  for (const f of sk.falt) {
    const o = f.luftVid(x, yy)
    if (o) vx += o.vx
  }
  return vx
}

// Luften som spelet vill ha den för en fallskärm vars fötter är vid `fotY`.
export function luftForFot(sk, x, fotY) {
  return luftHos(sk, x, fotY - PROV_OFFSET)
}

// Vilket skikt provpunkten ligger i (0 = högst).
export function skiktVid(fotY) {
  const yy = fotY - PROV_OFFSET
  let b = 0
  let bd = Infinity
  for (let i = 0; i < TAL; i++) {
    const d = Math.abs(yy - SKIKT_Y[i])
    if (d < bd) {
      bd = d
      b = i
    }
  }
  return b
}

export const ANTAL_SKIKT = TAL
