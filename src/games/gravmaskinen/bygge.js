// Grävmaskinens byggarbetsplats (FYSIKPLAN L2 + "befolka bygget").
//
// Bara det som RITAS: ingen regel, last, nivå, träffyta eller kontroll rörs. Allt här är dekor
// (eventMode 'none') bakom spelytan, i tre djup:
//   • långt bort   — tornkran med en last i kroken, en husstomme under uppbyggnad (till höger)
//   • mitten       — ett byggstaket med varningsrand och en skylt, en kompis-hjullastare
//   • förgrunden   — trafikkoner med avspärrningsband, två grushögar
// plus en liten fågel på sandhögens topp som flyger undan medan barnet gräver och kommer
// tillbaka när det blir lugnt.
//
// Noll texturbakningar: bara platta fyllningar, ingen gradient i den här filen.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { liv, wiggle, squash, stegra } from '../../lib/feedback.js'
import { lerpColor, slump } from '../../lib/scene.js'
import { BLEED_X } from '../../lib/view.js'

const W = 1280
const BAS_Y = 604 // marklinjen för allt som står bakom maskinerna

// Dis: avlägsna saker lerpas mot himlens ljusa botten, som scenens egna avståndsband.
const dis = (c, t) => lerpColor(c, 0xeef3ee, t)

const FAGEL_HEM = { x: 240, y: 368 } // högens topp

// ---- Tornkran ----------------------------------------------------------------------
const KRAN_H = 360
const KRAN_X = 612
const KRAN_ARM = 262 // hur långt bommen sträcker sig åt vänster
const KRAN_YB = -KRAN_H - 6 // bommens undre ackord
const KRAN_YT = -KRAN_H - 22 // bommens övre ackord
const KRAN_HAKE = { x: -168, y: KRAN_YB + 8 }

function ritaKran(g, stal, morkt) {
  // Masten: två skenor med korsande stag.
  g.moveTo(-13, 0).lineTo(-13, -KRAN_H).moveTo(13, 0).lineTo(13, -KRAN_H)
  g.stroke({ width: 5, color: stal, cap: 'round' })
  for (let y = 0; y > -KRAN_H; y -= 36) g.moveTo(-13, y).lineTo(13, y - 36).moveTo(13, y).lineTo(-13, y - 36)
  g.stroke({ width: 2.2, color: morkt })
  // Slewing-ring, förarhytt och A-ram.
  g.roundRect(-22, -KRAN_H - 9, 44, 11, 3).fill(stal)
  g.roundRect(-46, -KRAN_H - 40, 34, 30, 5).fill(stal)
  g.roundRect(-42, -KRAN_H - 36, 20, 17, 3).fill(0xcfeaf5)
  g.moveTo(-10, -KRAN_H - 9).lineTo(0, -KRAN_H - 66).lineTo(10, -KRAN_H - 9)
  g.stroke({ width: 4, color: stal, cap: 'round', join: 'round' })
  // Bommen (smalnar av mot spetsen) och motbommen, fackverk med sicksack.
  const topY = (x) => KRAN_YT + ((x - 14) / (-KRAN_ARM - 14)) * (KRAN_YB - 3 - KRAN_YT)
  g.moveTo(14, KRAN_YT).lineTo(-KRAN_ARM, KRAN_YB - 3).moveTo(14, KRAN_YB).lineTo(-KRAN_ARM, KRAN_YB)
  g.moveTo(14, KRAN_YT + 2).lineTo(112, KRAN_YT + 8).moveTo(14, KRAN_YB).lineTo(112, KRAN_YB)
  g.stroke({ width: 3.2, color: stal, cap: 'round' })
  for (let x = 14; x > -KRAN_ARM + 26; x -= 26) g.moveTo(x, KRAN_YB).lineTo(x - 13, topY(x - 13)).lineTo(x - 26, KRAN_YB)
  for (let x = 14; x < 100; x += 24) g.moveTo(x, KRAN_YB).lineTo(x + 12, KRAN_YT + 5).lineTo(x + 24, KRAN_YB)
  g.stroke({ width: 2, color: morkt })
  // Motvikten.
  g.roundRect(80, KRAN_YB - 2, 34, 32, 3).fill(0x9aa3ab)
  g.roundRect(80, KRAN_YB - 2, 34, 9, 3).fill({ color: 0xffffff, alpha: 0.3 })
  // Stag från toppen ut till bomspetsarna.
  g.moveTo(0, -KRAN_H - 66).lineTo(-KRAN_ARM, KRAN_YB - 3).moveTo(0, -KRAN_H - 66).lineTo(112, KRAN_YT + 8)
  g.stroke({ width: 1.8, color: morkt, alpha: 0.85 })
  // Vagnen som kroken hänger i.
  g.roundRect(KRAN_HAKE.x - 9, KRAN_YB - 3, 18, 11, 2).fill(morkt)
}

function ritaKrok(g, stal, morkt) {
  g.moveTo(0, 0).lineTo(0, 126).stroke({ width: 2.2, color: morkt })
  g.roundRect(-9, 122, 18, 15, 3).fill(stal)
  g.moveTo(0, 137).quadraticCurveTo(10, 146, 3, 155).stroke({ width: 3.4, color: morkt, cap: 'round' })
  g.moveTo(1, 144).lineTo(-27, 160).moveTo(1, 144).lineTo(27, 160).stroke({ width: 1.8, color: morkt })
  g.roundRect(-33, 160, 66, 9, 2).fill(0xb98652) // pall
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < 3; k++) g.roundRect(-30 + k * 20.5, r ? 142.5 : 151, 19, 8, 1.5).fill(r ? 0xb0522f : 0xc2603a)
  }
}

// ---- Husstomme (till höger, långt bort) ------------------------------------------------
function ritaStomme(g, betong, morkt, bredd) {
  const n = Math.ceil(bredd / 150)
  for (let f = 1; f <= 3; f++) g.rect(-12, -f * 70 - 14, n * 150 + 24, 14).fill(betong)
  for (let k = 0; k <= n; k++) g.rect(k * 150 - 9, -210, 18, 210).fill(betong)
  // skuggsida på varje pelare + underkant på bjälklagen
  for (let k = 0; k <= n; k++) g.rect(k * 150 + 2, -210, 7, 210).fill({ color: morkt, alpha: 0.5 })
  for (let f = 1; f <= 3; f++) g.rect(-12, -f * 70 - 2, n * 150 + 24, 3).fill({ color: morkt, alpha: 0.55 })
  // armeringsjärn som sticker upp ur översta bjälklaget
  for (let k = 0; k <= n; k++) {
    for (const dx of [-5, 0, 5]) g.moveTo(k * 150 + dx, -224).lineTo(k * 150 + dx, -248)
  }
  g.stroke({ width: 2, color: morkt })
  // ställning längs vänstra kanten: två stolpar, plankor och kryss
  g.moveTo(-38, 0).lineTo(-38, -226).moveTo(-12, 0).lineTo(-12, -226)
  for (let y = -34; y > -226; y -= 56) g.moveTo(-42, y).lineTo(-8, y)
  g.stroke({ width: 3, color: morkt })
  for (let y = 0; y > -200; y -= 56) g.moveTo(-38, y).lineTo(-12, y - 56).moveTo(-12, y).lineTo(-38, y - 56)
  g.stroke({ width: 1.8, color: morkt, alpha: 0.8 })
  // ett orange skyddsnät hänger över ett fack
  g.poly([150 + 9, -142, 300 - 9, -142, 300 - 9, -72, 150 + 9, -72]).fill({ color: 0xff9b3d, alpha: 0.4 })
  for (let x = 160; x < 295; x += 12) g.moveTo(x, -142).lineTo(x, -72)
  for (let y = -134; y < -72; y += 12) g.moveTo(159, y).lineTo(291, y)
  g.stroke({ width: 1, color: 0xff7a2f, alpha: 0.5 })
}

// ---- Byggstaket ----------------------------------------------------------------------
function ritaStaket(g) {
  const x0 = -BLEED_X - 20
  const x1 = W + BLEED_X + 20
  const h = 58
  // Grön plank: sand-, grus- och snöhögarna ska stå TYDLIGT framför staketet (sandbruna plankor smälte ihop med högens fot).
  const farger = [0x6aae9a, 0x5fa28e, 0x76b8a4]
  for (let k = 0; k < 3; k++) {
    for (let x = x0 + k * 36, i = k; x < x1; x += 108, i += 3) {
      g.roundRect(x, BAS_Y - h + (i % 7 === 3 ? 5 : 0), 34, h - (i % 7 === 3 ? 5 : 0), 3)
    }
    g.fill(farger[k])
  }
  for (let x = x0; x < x1; x += 36) g.moveTo(x, BAS_Y - h).lineTo(x, BAS_Y)
  g.stroke({ width: 2, color: 0x1f4a40, alpha: 0.28 })
  // varningsranden: gult band med svarta snedstreck
  g.rect(x0, BAS_Y - h, x1 - x0, 13).fill(0xffd35c)
  for (let x = x0; x < x1; x += 24) g.poly([x, BAS_Y - h, x + 12, BAS_Y - h, x + 1, BAS_Y - h + 13, x - 11, BAS_Y - h + 13])
  g.fill(0x33291f)
  g.rect(x0, BAS_Y - h - 3, x1 - x0, 4).fill(0x8a5a3b)
  for (let x = x0 + 70; x < x1; x += 216) {
    g.roundRect(x - 6, BAS_Y - h - 13, 12, h + 13, 2).fill(0x8a5a3b)
    g.rect(x - 6, BAS_Y - h - 13, 4, h + 13).fill({ color: 0xffffff, alpha: 0.18 })
  }
  g.rect(x0, BAS_Y, x1 - x0, 7).fill({ color: 0x000000, alpha: 0.13 })
}

// ---- Varningsskylt (origo = stolpens fot) -----------------------------------------------
function ritaSkylt(g) {
  g.ellipse(0, 2, 20, 4.5).fill({ color: 0x000000, alpha: 0.18 })
  g.roundRect(-4, -96, 8, 98, 2).fill(0x8a939b)
  g.roundRect(-4, -96, 3, 98, 1).fill({ color: 0xffffff, alpha: 0.3 })
  g.poly([0, -168, 40, -100, -40, -100]).fill(0x33291f)
  g.poly([0, -158, 31, -105, -31, -105]).fill(0xffd35c)
  // sandhög med en spade
  g.poly([-16, -111, 0, -131, 16, -111]).fill(0x33291f)
  g.moveTo(6, -146).lineTo(-8, -118).stroke({ width: 4, color: 0x33291f, cap: 'round' })
  g.poly([-14, -122, -4, -114, -10, -110, -18, -116]).fill(0x33291f)
}

// ---- Trafikkon (origo = mitt på foten) ---------------------------------------------------
function ritaKon(g) {
  g.ellipse(2, 3, 30, 6).fill({ color: 0x000000, alpha: 0.2 })
  g.roundRect(-24, -9, 48, 11, 3).fill(0x2f3a44)
  g.poly([-18, -9, 18, -9, 7, -66, -7, -66]).fill(0xff7a2f)
  g.poly([-14.2, -26, 14.2, -26, 11.6, -41, -11.6, -41]).fill(0xfffdf7)
  g.poly([-18, -9, -10, -9, -3, -66, -7, -66]).fill({ color: 0xffffff, alpha: 0.22 })
  g.roundRect(-8, -70, 16, 7, 3).fill(0xe05f1c)
}

// ---- Grushög (origo = mitten av basen) -----------------------------------------------------
function ritaHog(g, bredd, hojd, farger, rnd) {
  const [m, mellan, ljus] = farger
  g.ellipse(0, 2, bredd * 0.55, 10).fill({ color: 0x000000, alpha: 0.14 })
  g.moveTo(-bredd / 2, 0).quadraticCurveTo(-bredd * 0.18, -hojd * 1.12, 0, -hojd).quadraticCurveTo(bredd * 0.22, -hojd * 0.9, bredd / 2, 0).closePath().fill(m)
  g.moveTo(-bredd * 0.38, 0).quadraticCurveTo(-bredd * 0.14, -hojd * 0.96, -4, -hojd * 0.86).quadraticCurveTo(bredd * 0.2, -hojd * 0.7, bredd * 0.38, 0).closePath().fill(mellan)
  g.moveTo(-bredd * 0.2, -hojd * 0.1).quadraticCurveTo(-bredd * 0.08, -hojd * 0.7, -6, -hojd * 0.8).quadraticCurveTo(bredd * 0.06, -hojd * 0.5, bredd * 0.08, -hojd * 0.1).closePath().fill({ color: ljus, alpha: 0.5 })
  // småsten: tre nyanser, utspridda över högens yta
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 16; i++) {
      const x = (rnd() - 0.5) * bredd * 0.7
      const maxH = hojd * (1 - Math.abs(x) / (bredd * 0.5)) * 0.95
      const y = -rnd() * Math.max(6, maxH)
      g.circle(x, y, 1.6 + rnd() * 2.4)
    }
    g.fill(k === 0 ? m : k === 1 ? ljus : mellan)
  }
}

// ---- Kompis-hjullastare (origo = marken under hjulen, vänd åt vänster) ---------------------
function ritaLastareKropp(g) {
  g.ellipse(-6, 2, 100, 9, 0).fill({ color: 0x000000, alpha: 0.16 })
  // bakre kroppen: motor, hytt
  g.roundRect(8, -84, 100, 50, 10).fill(0xb8403a)
  g.roundRect(8, -86, 100, 48, 10).fill(0xe0574f)
  g.roundRect(8, -86, 100, 12, 8).fill({ color: 0xffffff, alpha: 0.18 })
  for (let i = 0; i < 4; i++) g.roundRect(70 + i * 8, -78, 4, 22, 2).fill({ color: 0x000000, alpha: 0.18 }) // kylargaller
  g.roundRect(18, -132, 64, 52, 10).fill(0xb8403a)
  g.roundRect(20, -134, 60, 50, 9).fill(0xe0574f)
  g.roundRect(27, -126, 46, 36, 7).fill({ color: 0xbfe9ff, alpha: 0.8 })
  g.roundRect(27, -126, 12, 36, 6).fill({ color: 0xffffff, alpha: 0.28 })
  g.roundRect(14, -140, 72, 10, 5).fill(0xb8403a)
  // främre kroppen och ledbulten
  g.roundRect(-72, -74, 70, 30, 8).fill(0xc9433d)
  g.roundRect(-72, -74, 70, 9, 6).fill({ color: 0xffffff, alpha: 0.2 })
  g.circle(-2, -58, 9).fill(0x4a5560)
  g.circle(-2, -58, 4).fill(0x8a939b)
  // hjul
  for (const wx of [-48, 52]) {
    g.circle(wx, -29, 30).fill(0x2a2018)
    g.circle(wx, -29, 21).fill(0x3b3128)
    g.circle(wx, -29, 11).fill(0xb8c2ca)
    g.circle(wx, -29, 4).fill(0x6b7480)
    g.circle(wx - 8, -39, 9).fill({ color: 0xffffff, alpha: 0.08 })
  }
}

function ritaLastareSkopa(g) {
  // Lyftarm från främre kroppen och en skopa längst fram. Origo = armens led.
  g.moveTo(0, 0).lineTo(-60, 8).stroke({ width: 15, color: 0x59626e, cap: 'round' })
  g.moveTo(0, 0).lineTo(-60, 8).stroke({ width: 10, color: 0x8a939b, cap: 'round' })
  g.circle(0, 0, 9).fill(0xffd35c).stroke({ width: 2.5, color: 0xc9a02e })
  g.poly([-92, -14, -50, -14, -58, 30, -94, 30]).fill(0x7a8594)
  g.poly([-90, -12, -52, -12, -60, 26, -91, 26]).fill(0xb8c0c8)
  g.poly([-90, -12, -78, -12, -80, 26, -91, 26]).fill({ color: 0xffffff, alpha: 0.28 })
  for (const tx of [-86, -74, -62]) g.poly([tx - 4, 30, tx + 4, 30, tx, 40]).fill(0x8a939b)
}

// ---- Fågeln (en liten blåmes, origo = fötterna, vänd åt vänster) -----------------------------
function ritaFagelKropp(g) {
  g.ellipse(0, 1, 13, 3).fill({ color: 0x000000, alpha: 0.14 })
  g.moveTo(-2, -5).lineTo(-2, 0).moveTo(5, -5).lineTo(5, 0).stroke({ width: 2.2, color: 0xd98a1f, cap: 'round' })
  g.poly([8, -14, 28, -8, 27, -15, 10, -19]).fill(0x2f7fb8) // stjärt
  g.ellipse(0, -15, 14, 11.5).fill(0x4aa3df)
  g.ellipse(2, -11, 10, 8.5).fill(0xffe9a8)
  g.ellipse(-9, -15, 5, 6).fill({ color: 0xffffff, alpha: 0.18 })
}

function ritaFagelHuvud(g) {
  g.circle(0, 0, 9).fill(0x4aa3df)
  g.ellipse(-2, 3, 7, 5).fill(0xffffff) // vit kind
  g.circle(-3.5, -2, 2.1).fill(0x23303a)
  g.circle(-4.1, -2.7, 0.7).fill(0xffffff)
  g.poly([-8, -1, -15, 1, -8, 3]).fill(0xff9a2e)
  g.moveTo(-6, -8).quadraticCurveTo(-1, -12, 5, -8).stroke({ width: 3, color: 0x2f7fb8, cap: 'round' })
}

function ritaFagelVinge(g) {
  g.ellipse(-9, 0, 11, 5.5).fill(0x2f7fb8)
  g.ellipse(-10, -1, 7, 2.2).fill({ color: 0xffffff, alpha: 0.3 })
}

export function byggBygge() {
  const rnd = slump(61)
  const alla = [] // noder som tweenas (rivs i destroy)
  const lagg = (n) => { alla.push(n); return n }
  const tweens = []

  const stal = dis(0xe8a73e, 0.3)
  const stalM = dis(0xa8701f, 0.3)

  const bak = new Container()
  bak.eventMode = 'none'
  bak.interactiveChildren = false
  const fram = new Container()
  fram.eventMode = 'none'
  fram.interactiveChildren = false

  // Husstommen, längst bort och längst till höger.
  const stomme = new Graphics()
  ritaStomme(stomme, dis(0xcfc8bb, 0.4), dis(0x8f887b, 0.35), 1290 - 1110 + BLEED_X)
  stomme.position.set(1130, BAS_Y)
  bak.addChild(stomme)

  // Tornkranen. Kroken (med en pall tegel) svajar i sin vagn.
  const kran = new Graphics()
  ritaKran(kran, stal, stalM)
  kran.position.set(KRAN_X, BAS_Y)
  bak.addChild(kran)
  const hake = new Container()
  const hakeG = new Graphics()
  ritaKrok(hakeG, stal, stalM)
  hake.addChild(hakeG)
  hake.position.set(KRAN_X + KRAN_HAKE.x, BAS_Y + KRAN_HAKE.y)
  bak.addChild(hake)
  liv(lagg(hake), { bob: 0, sway: 0.045, duration: 3.4, phase: 0.35 })

  // Staketet med varningsrand, och skylten framför det längst till höger.
  const staket = new Graphics()
  ritaStaket(staket)
  bak.addChild(staket)
  const skylt = new Graphics()
  ritaSkylt(skylt)
  skylt.position.set(1160, BAS_Y + 10)
  bak.addChild(skylt)

  // Kompisen: en hjullastare på tomgång. Kroppen guppar, blinkljuset blinkar, skopan lyfts vid jubel.
  const lastare = new Container()
  lastare.position.set(626, BAS_Y + 10)
  lastare.scale.set(0.62)
  const lKropp = new Container()
  const lkG = new Graphics()
  ritaLastareKropp(lkG)
  lKropp.addChild(lkG)
  const lSkopa = new Container()
  lSkopa.position.set(-60, -60)
  const lsG = new Graphics()
  ritaLastareSkopa(lsG)
  lSkopa.addChild(lsG)
  const blink = new Container()
  blink.position.set(50, -146)
  const blinkG = new Graphics()
  blinkG.circle(0, 0, 16).fill({ color: 0xffb300, alpha: 0.28 })
  blinkG.circle(0, 0, 7).fill(0xffb300)
  blinkG.circle(-2, -2, 2.6).fill({ color: 0xffffff, alpha: 0.7 })
  blink.addChild(blinkG)
  lKropp.addChild(lSkopa, blink)
  lastare.addChild(lKropp)
  bak.addChild(lastare)
  liv(lagg(lKropp), { bob: 2.2, sway: 0.004, duration: 1.5, phase: 0.6 })
  tweens.push(gsap.to(blink, { alpha: 0.25, duration: 0.5, ease: 'steps(1)', yoyo: true, repeat: -1, repeatDelay: 0.3 }))
  lagg(blink); lagg(lSkopa)

  // Förgrunden: grushögar och koner med avspärrningsband.
  const hogV = new Graphics()
  ritaHog(hogV, 190, 66, [0x8a939b, 0x9aa3ab, 0xc7ced4], rnd)
  hogV.position.set(36, 730)
  const hogH = new Graphics()
  ritaHog(hogH, 230, 82, [0xc9a06a, 0xd9b47c, 0xf0d9aa], rnd)
  hogH.position.set(1196, 736)
  fram.addChild(hogV, hogH)

  const koner = []
  const tape = new Graphics()
  const kx = [158, 262]
  const ky = 706
  const kt = [[kx[0], ky - 56], [kx[1], ky - 56]]
  const pt = (t) => {
    const a = 1 - t
    return [a * a * kt[0][0] + 2 * a * t * 210 + t * t * kt[1][0], a * a * kt[0][1] + 2 * a * t * (ky - 32) + t * t * kt[1][1]]
  }
  tape.moveTo(...pt(0))
  for (let i = 1; i <= 24; i++) tape.lineTo(...pt(i / 24))
  tape.stroke({ width: 7, color: 0xe0574f, cap: 'round' })
  for (let i = 0; i < 24; i += 2) tape.moveTo(...pt((i + 0.15) / 24)).lineTo(...pt((i + 1) / 24))
  tape.stroke({ width: 7, color: 0xfffdf7 })
  fram.addChild(tape)
  for (const [x, y] of [[kx[0], ky], [kx[1], ky], [640, 702], [1060, 706]]) {
    const k = new Container()
    const kg = new Graphics()
    ritaKon(kg)
    k.addChild(kg)
    k.position.set(x, y)
    fram.addChild(k)
    koner.push(lagg(k))
  }

  // ---- Fågeln på sandhögen ---------------------------------------------------------------
  const fagel = new Container()
  fagel.position.set(FAGEL_HEM.x, FAGEL_HEM.y)
  const vand = new Container() // vänder fågeln i flykten
  const hopp = new Container() // squash vid jubel
  const inre = new Container() // vilo-guppning
  const kropp = new Graphics()
  ritaFagelKropp(kropp)
  const vinge = new Container()
  vinge.position.set(2, -17)
  const vingeG = new Graphics()
  ritaFagelVinge(vingeG)
  vinge.addChild(vingeG)
  const huvud = new Container()
  huvud.position.set(-9, -24)
  const huvudG = new Graphics()
  ritaFagelHuvud(huvudG)
  huvud.addChild(huvudG)
  inre.addChild(kropp, vinge, huvud)
  hopp.addChild(inre)
  vand.addChild(hopp)
  fagel.addChild(vand)
  fagel.eventMode = 'none'
  fagel.interactiveChildren = false
  liv(lagg(inre), { bob: 1.6, sway: 0.02, duration: 2.1, phase: 0.1 })
  lagg(fagel); lagg(vand); lagg(hopp); lagg(huvud); lagg(vinge); lagg(vand.scale)
  // Pickar då och då: huvudet nickar två gånger.
  tweens.push(
    gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 1.1 })
      .to(huvud, { rotation: 0.42, duration: 0.13, ease: 'power1.in' })
      .to(huvud, { rotation: 0, duration: 0.17 })
      .to(huvud, { rotation: 0.42, duration: 0.13, ease: 'power1.in' })
      .to(huvud, { rotation: 0, duration: 0.17 }),
  )

  let anrop = [] // stegrade vaggningar (delayedCall) — rivs i destroy
  let lage = 'sitter' // sitter · flyger (på väg bort) · borta · kommer
  let flygTl = null
  let aterTimer = null
  const flaxa = (antal) => {
    gsap.killTweensOf(vinge)
    vinge.rotation = 0
    gsap.to(vinge, { rotation: -0.9, duration: 0.07, yoyo: true, repeat: antal * 2 - 1, ease: 'sine.inOut', onComplete: () => { if (!vinge.destroyed) vinge.rotation = 0 } })
  }
  const kom = () => {
    aterTimer = null
    if (fagel.destroyed) return
    lage = 'kommer'
    flygTl?.kill()
    fagel.position.set(FAGEL_HEM.x - 170, FAGEL_HEM.y - 150)
    fagel.alpha = 0
    vand.scale.x = -1 // flyger åt höger, mot högen
    flaxa(8)
    flygTl = gsap.timeline({
      onComplete: () => {
        lage = 'sitter'
        if (fagel.destroyed) return
        vand.scale.x = 1
        fagel.position.set(FAGEL_HEM.x, FAGEL_HEM.y)
        squash(hopp, { intensity: 0.7, hop: 5 })
      },
    })
      .to(fagel, { alpha: 1, duration: 0.25, ease: 'none' }, 0)
      .to(fagel, { x: FAGEL_HEM.x, y: FAGEL_HEM.y, duration: 1.1, ease: 'power2.inOut' }, 0)
  }

  const flyg = () => {
    lage = 'flyger'
    flygTl?.kill()
    vand.scale.x = -1 // vänder sig och flyger åt höger
    flaxa(6)
    const x = fagel.x
    const y = fagel.y
    flygTl = gsap.timeline({
      onComplete: () => {
        if (fagel.destroyed) return
        lage = 'borta'
        fagel.alpha = 0
        aterTimer?.kill()
        aterTimer = gsap.delayedCall(3.6, kom)
      },
    })
      .to(fagel, { x: x + 110, y: y - 120, duration: 0.35, ease: 'power2.out' })
      .to(fagel, { x: x + 250, y: y - 230, alpha: 0, duration: 0.5, ease: 'power1.in' })
  }

  // ---- Reaktioner -------------------------------------------------------------------------
  return {
    bak,
    fram,
    fagel,

    // Barnet gräver i högen: fågeln flyger undan, och kommer tillbaka när det blir lugnt igen.
    skramma() {
      if (fagel.destroyed) return
      if (lage === 'sitter' || lage === 'kommer') flyg()
      else if (lage === 'borta') {
        // Fortsatt grävande skjuter fram återkomsten.
        aterTimer?.kill()
        aterTimer = gsap.delayedCall(3.6, kom)
      }
    },

    // Full last: hjullastaren lyfter skopan, konerna vaggar, fågeln (om den är hemma) hoppar.
    fira() {
      gsap.killTweensOf(lSkopa)
      gsap.timeline()
        .to(lSkopa, { rotation: -0.55, duration: 0.3, ease: 'power2.out' })
        .to(lSkopa, { rotation: 0.1, duration: 0.25, ease: 'sine.inOut' })
        .to(lSkopa, { rotation: -0.4, duration: 0.25, ease: 'sine.inOut' })
        .to(lSkopa, { rotation: 0, duration: 0.4, ease: 'back.out(2)' })
      anrop = anrop.concat(stegra(koner, wiggle))
      if (lage === 'sitter') squash(hopp, { intensity: 1, hop: 12 })
    },

    destroy() {
      flygTl?.kill()
      for (const a of anrop) a?.kill?.()
      anrop = []
      aterTimer?.kill()
      for (const t of tweens) t?.kill()
      for (const n of alla) {
        if (!n || n.destroyed) continue
        n._fxLiv?.kill()
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
      }
    },
  }
}
