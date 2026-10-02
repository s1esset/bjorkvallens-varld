// Kugghjulens verkstad (FYSIKPLAN L2) — rummet runt pegbrädan.
//
// Bara det som RITAS: ingen regel, nivå, träffyta eller kontroll rörs. Allt här är dekor
// (eventMode 'none'). Rummet är tre lager: `vagg` ligger bakom allt (vägg med fönster,
// hängande lampa, hylla, verktyg på väggen, bänken med verktygslåda och en sovande katt) och
// `bradan` är själva pegbrädan med ram och skugga ovanpå väggen.
//
// Verkstaden SOVER när en nivå börjar (lampan släckt, katten ihopkrupen) och VAKNAR när
// kedjan greppar: lampan tänds, katten öppnar ögonen, verktygen vaggar. Nästa nivå somnar den
// igen — så varje maskin får sin egen väckning.
//
// Noll texturbakningar vid montering: de fyra stora ytorna går via cachade lodräta toningar
// (lib/form.js, delas mellan monteringar), allt annat är platta fyllningar.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { liv, wiggle, squash, stegra } from '../../lib/feedback.js'
import { verticalFill, groundFill, bage } from '../../lib/form.js'
import { slump } from '../../lib/scene.js'
import { COLORS } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

const W = 1280
const H = 720
const BANK_Y = 586 // bänkskivans bakkant (där väggen tar slut)

// Pegbrädans mått (samma yta som förut: 120–1160 × 110–580).
const BRADA = { x: 120, y: 110, w: 1040, h: 470 }

const STAL = 0xaeb7c4
const STAL_M = 0x6b7480
const TRA = 0xd9a56a

const skugga = (g, x, y, rx, ry, a = 0.2) => g.ellipse(x, y, rx, ry).fill({ color: 0x000000, alpha: a })

// Ett fyllt "U" av tre rundade rektanglar, `d` px utvidgat — så en kontur kan läggas som en
// mörkare kopia UNDER i stället för en stroke (en stroke visar skarvarna mellan delarna).
function nyckelhuvud(g, d, farg) {
  g.roundRect(-22 - d, 92 - d, 44 + 2 * d, 30 + 2 * d, 12 + d).fill(farg)
  g.roundRect(-22 - d, 112 - d, 13 + 2 * d, 40 + 2 * d, 5 + d).fill(farg)
  g.roundRect(9 - d, 112 - d, 13 + 2 * d, 40 + 2 * d, 5 + d).fill(farg)
}

// --- Verktygen. Origo = spiken/hålet de hänger i; de ritas nedåt. -------------------------

function ritaHammare(g) {
  g.roundRect(-8, -8, 16, 124, 6).fill(0xa8743f)
  g.roundRect(-6, -6, 12, 120, 5).fill(TRA)
  g.roundRect(-6, -6, 4, 120, 2).fill({ color: 0xffffff, alpha: 0.28 })
  g.circle(0, 5, 3.4).fill(0x7a4f2c)
  g.roundRect(-31, 105, 62, 32, 8).fill(0x59626e) // huvud (kontur)
  g.roundRect(-29, 107, 58, 28, 7).fill(0x8d97a6)
  g.roundRect(-29, 107, 58, 9, 5).fill({ color: 0xffffff, alpha: 0.3 })
  g.roundRect(-29, 107, 10, 28, 4).fill(STAL_M)
  g.poly([29, 111, 47, 104, 50, 111, 31, 131]).fill(0x8d97a6).stroke({ width: 2.5, color: 0x59626e, join: 'round' })
}

function ritaSkiftnyckel(g) {
  g.roundRect(-11, -7, 22, 110, 9).fill(0x59626e)
  g.roundRect(-8.5, -4.5, 17, 105, 7).fill(STAL)
  g.roundRect(-8.5, -4.5, 5, 105, 3).fill({ color: 0xffffff, alpha: 0.3 })
  g.circle(0, 8, 4.2).fill(0x59626e)
  nyckelhuvud(g, 2.5, 0x59626e)
  nyckelhuvud(g, 0, STAL)
  g.roundRect(-20, 94, 40, 8, 4).fill({ color: 0xffffff, alpha: 0.28 })
}

function ritaSag(g) {
  // Handtaget: trähandtag med ett grepphål (hålet = mörkt trä, vägg syns inte i det).
  g.roundRect(-20, -9, 40, 60, 16).fill(0x8a5a30)
  g.roundRect(-17.5, -6.5, 35, 55, 14).fill(0xc98a4b)
  g.roundRect(-17.5, -6.5, 8, 55, 4).fill({ color: 0xffffff, alpha: 0.2 })
  g.roundRect(-7, 6, 14, 26, 7).fill(0x6b4423)
  // Bladet: smalnar av, tänderna på högra kanten.
  const p = [-16, 46, 17, 46]
  const N = 15
  for (let i = 0; i < N; i++) {
    const y = 50 + i * 12.6
    const x = 17 - i * 0.42
    p.push(x + 7, y + 2, x + 0.5, y + 12)
  }
  p.push(10, 240, -13, 240)
  g.poly(p).fill(0xcdd5df).stroke({ width: 2.5, color: 0x7a8594, join: 'round' })
  g.moveTo(-6, 56).lineTo(-4, 232).stroke({ width: 3, color: 0xffffff, alpha: 0.5, cap: 'round' })
}

function ritaMatband(g) {
  g.roundRect(-5, -4, 10, 26, 4).fill(0x4a4f5c) // upphängningsöglan
  g.circle(0, 48, 28).fill(0xc9a02e)
  g.circle(0, 48, 25.5).fill(0xffd35c)
  g.circle(-8, 40, 12).fill({ color: 0xffffff, alpha: 0.28 })
  g.circle(0, 48, 11).fill(0x4a4f5c)
  g.circle(0, 48, 5).fill(0xdfe5ec)
  g.roundRect(19, 56, 15, 52, 3).fill(0x8a929e) // bandet som sticker ut
  g.roundRect(20.5, 57, 12, 49, 2).fill(0xe8edf3)
  for (let i = 0; i < 7; i++) g.moveTo(20.5, 64 + i * 7).lineTo(i % 2 ? 26 : 29, 64 + i * 7)
  g.stroke({ width: 1.8, color: 0x4a4f5c })
}

// --- Hyllans saker. Origo = mitt på hyllplanet; ritas uppåt. ------------------------------

function ritaOljekanna(g) {
  skugga(g, 0, 1, 24, 4.5, 0.2)
  g.poly([8, -30, 40, -54, 44, -49, 14, -22]).fill(0x9aa3ae).stroke({ width: 2.5, color: 0x6b7480, join: 'round' })
  g.roundRect(-21, -36, 42, 36, 8).fill(0xb8403a)
  g.roundRect(-19, -34, 38, 32, 7).fill(0xe0574f)
  g.roundRect(-19, -34, 9, 32, 4).fill({ color: 0xffffff, alpha: 0.25 })
  g.roundRect(-10, -43, 20, 9, 4).fill(0x6b7480)
  g.moveTo(-14, -36).quadraticCurveTo(-14, -56, 2, -52).stroke({ width: 5, color: 0x6b7480, cap: 'round' })
  g.roundRect(-8, -26, 16, 10, 3).fill({ color: 0xfff0d8, alpha: 0.85 })
}

function ritaSkruvburk(g) {
  skugga(g, 0, 1, 22, 4.5, 0.2)
  g.roundRect(-18, -42, 36, 42, 8).fill({ color: 0xcfeaf0, alpha: 0.85 }).stroke({ width: 2.5, color: 0x8db8c2 })
  // skruvar i burken (rader som lutar åt olika håll)
  for (let i = 0; i < 9; i++) {
    const x = -11 + (i % 3) * 11
    const y = -8 - Math.floor(i / 3) * 11 - (i % 2) * 2
    g.roundRect(x - 1.5, y - 7, 3, 14, 1.5).fill(i % 2 ? 0x8a929e : 0xb7c0cc)
  }
  g.roundRect(-9, -38, 5, 30, 2).fill({ color: 0xffffff, alpha: 0.35 })
  g.roundRect(-20, -50, 40, 10, 4).fill(0xe05252)
  g.roundRect(-20, -50, 40, 4, 2).fill({ color: 0xffffff, alpha: 0.25 })
}

function ritaFargburk(g) {
  skugga(g, 0, 1, 26, 4.5, 0.2)
  g.roundRect(-24, -34, 48, 36, 5).fill(0x2f6ea6)
  g.roundRect(-22, -32, 44, 32, 4).fill(0x4aa3df)
  g.roundRect(-22, -32, 9, 32, 3).fill({ color: 0xffffff, alpha: 0.22 })
  g.roundRect(-25, -37, 50, 8, 4).fill(0xaeb7c4).stroke({ width: 2, color: 0x6b7480 })
  g.roundRect(-14, -22, 28, 12, 3).fill({ color: 0xfff0d8, alpha: 0.9 })
  g.moveTo(-22, -34).quadraticCurveTo(0, -56, 22, -34).stroke({ width: 3, color: 0x6b7480, cap: 'round' })
}

function ritaVerktygslada(g) {
  skugga(g, 0, 2, 56, 8, 0.25)
  g.moveTo(-22, -46).lineTo(-22, -60).lineTo(22, -60).lineTo(22, -46).stroke({ width: 7, color: 0x59626e, cap: 'round', join: 'round' })
  g.roundRect(-48, -46, 96, 46, 7).fill(0xb8403a)
  g.roundRect(-46, -44, 92, 42, 6).fill(0xe0574f)
  g.roundRect(-46, -44, 92, 14, 6).fill(0xf07a72)
  g.rect(-46, -31, 92, 3).fill({ color: 0x000000, alpha: 0.2 })
  g.roundRect(-34, -34, 14, 9, 2).fill(0xffd35c).stroke({ width: 2, color: 0xc9a02e })
  g.roundRect(20, -34, 14, 9, 2).fill(0xffd35c).stroke({ width: 2, color: 0xc9a02e })
  g.roundRect(-46, -44, 8, 42, 4).fill({ color: 0xffffff, alpha: 0.16 })
}

// --- Katten (en tabby i limpa-form, sovande). Origo = bänken under katten. -----------------

const KATT = 0xf0a860
const KATT_M = 0xc77a3a
const KATT_L = 0xfff0d8

function ritaKattkropp(g) {
  skugga(g, 2, 3, 60, 8, 0.24)
  // svans: kurvar runt framtill, mörk spets
  g.moveTo(36, -6).quadraticCurveTo(58, -4, 53, -30).stroke({ width: 13, color: KATT_M, cap: 'round' })
  g.moveTo(36, -6).quadraticCurveTo(58, -4, 53, -30).stroke({ width: 10, color: KATT, cap: 'round' })
  g.moveTo(53, -22).lineTo(53, -30).stroke({ width: 10, color: 0x9a5c33, cap: 'round' })
  // kroppen
  g.ellipse(4, -25, 44, 27).fill(KATT_M)
  g.ellipse(4, -26, 42, 25.5).fill(KATT)
  g.ellipse(-4, -40, 26, 9).fill({ color: 0xffffff, alpha: 0.22 })
  for (let i = 0; i < 4; i++) {
    const x = -2 + i * 12
    g.moveTo(x, -50).quadraticCurveTo(x + 3, -42, x + 1, -34)
  }
  g.stroke({ width: 4.5, color: KATT_M, alpha: 0.85, cap: 'round' })
  // framtassar under hakan
  g.ellipse(-30, -4, 15, 7.5).fill(KATT_L).stroke({ width: 2.5, color: KATT_M })
  g.ellipse(-8, -3, 13, 6.5).fill(KATT_L).stroke({ width: 2.5, color: KATT_M })
}

function ritaKattHuvud(g) {
  // öron (bakom huvudet)
  g.poly([-19, -8, -17, -37, -3, -19]).fill(KATT).stroke({ width: 2.5, color: KATT_M, join: 'round' })
  g.poly([19, -8, 17, -37, 3, -19]).fill(KATT).stroke({ width: 2.5, color: KATT_M, join: 'round' })
  g.poly([-15, -14, -14.5, -30, -6, -19]).fill(0xf7a8b8)
  g.poly([15, -14, 14.5, -30, 6, -19]).fill(0xf7a8b8)
  g.circle(0, 0, 22).fill(KATT_M)
  g.circle(0, 0, 20.5).fill(KATT)
  g.circle(-6, -8, 9).fill({ color: 0xffffff, alpha: 0.18 })
  // pannränder
  g.moveTo(0, -20).lineTo(0, -11).moveTo(-7, -19).lineTo(-5, -12).moveTo(7, -19).lineTo(5, -12)
  g.stroke({ width: 3.5, color: KATT_M, alpha: 0.85, cap: 'round' })
  // nosparti, nos, mun
  g.ellipse(0, 8, 11, 8).fill(KATT_L)
  g.poly([-3.5, 3.5, 3.5, 3.5, 0, 8]).fill(0xe8788f)
  g.moveTo(0, 8).lineTo(0, 11).stroke({ width: 1.8, color: 0x8a4a3a })
  bage(g, -3.5, 11, 3.5, 0, Math.PI * 0.9).stroke({ width: 1.8, color: 0x8a4a3a, cap: 'round' })
  bage(g, 3.5, 11, 3.5, Math.PI * 0.1, Math.PI).stroke({ width: 1.8, color: 0x8a4a3a, cap: 'round' })
  // morrhår
  for (const s of [-1, 1]) {
    g.moveTo(s * 12, 8).lineTo(s * 30, 4).moveTo(s * 12, 11).lineTo(s * 30, 13)
  }
  g.stroke({ width: 1.6, color: 0xfff6e8, alpha: 0.9, cap: 'round' })
}

function ritaOgonStangda(g) {
  for (const s of [-1, 1]) g.moveTo(s * 9 - 5, -2).quadraticCurveTo(s * 9, 3.5, s * 9 + 5, -2)
  g.stroke({ width: 2.8, color: 0x4a3526, cap: 'round' })
}

function ritaOgonOppna(g) {
  for (const s of [-1, 1]) {
    g.ellipse(s * 9, -1, 5.6, 6.4).fill(0x8fd06a).stroke({ width: 2, color: 0x4a3526 })
    g.ellipse(s * 9, -1, 2, 5.2).fill(0x2b2b2b)
    g.circle(s * 9 - 1.8, -3.4, 1.7).fill(0xffffff)
  }
}

// En liten "Z" (sovande katt). Ritad som ett linjestreck, aldrig en textglyf.
function ritaZ(g, s) {
  g.moveTo(0, 0).lineTo(12 * s, 0).lineTo(0, 14 * s).lineTo(12 * s, 14 * s)
  g.stroke({ width: 3.6 * Math.max(0.7, s), color: 0x5a7fa8, cap: 'round', join: 'round' })
}

export function byggVerkstad() {
  const rnd = slump(24)
  const alla = [] // alla noder som får en tween — rivs i destroy
  const lagg = (n) => { alla.push(n); return n }

  const vagg = new Container()
  vagg.eventMode = 'none'
  vagg.interactiveChildren = false

  // ---- Väggen: panelvägg i dämpad mynta, med ljus från fönstret ------------------------
  const vg = new Graphics()
  vg.rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, BANK_Y + BLEED_Y + 6).fill(verticalFill(0xdcefea, 0xa9cdc8))
  for (let x = -BLEED_X + 20; x < W + BLEED_X; x += 72) vg.moveTo(x, -BLEED_Y).lineTo(x, BANK_Y)
  vg.stroke({ width: 2.5, color: 0x7fa6a1, alpha: 0.35 })
  for (let x = -BLEED_X + 23; x < W + BLEED_X; x += 72) vg.moveTo(x, -BLEED_Y).lineTo(x, BANK_Y)
  vg.stroke({ width: 2, color: 0xffffff, alpha: 0.28 })
  // bänken kastar skugga uppåt på väggen (stegvis mörkare mot bänkkanten)
  for (let i = 0; i < 5; i++) vg.rect(-BLEED_X, BANK_Y - 10 - i * 10, W + 2 * BLEED_X, 10 + i * 10).fill({ color: 0x1f3a3a, alpha: 0.035 })
  vagg.addChild(vg)

  // ---- Fönstret (uppe i mitten; nedre delen döljs av pegbrädan) -------------------------
  const fo = new Graphics()
  fo.roundRect(498, -BLEED_Y - 20, 304, BLEED_Y + 132, 8).fill(0xc9b48e)
  fo.roundRect(502, -BLEED_Y - 20, 296, BLEED_Y + 128, 7).fill(0xfff3df)
  fo.rect(516, -BLEED_Y, 268, BLEED_Y + 90).fill(verticalFill(0x93d3f2, 0xe6f7ef))
  // sol, kullar, träd och ett moln — djup utanför fönstret
  fo.circle(586, 50, 38).fill({ color: 0xfff1a8, alpha: 0.3 })
  fo.circle(586, 50, 21).fill(0xfff1a8)
  fo.circle(706, 22, 11).fill({ color: 0xffffff, alpha: 0.95 })
  fo.circle(720, 17, 14).fill({ color: 0xffffff, alpha: 0.95 })
  fo.circle(735, 23, 10).fill({ color: 0xffffff, alpha: 0.95 })
  fo.roundRect(698, 20, 46, 12, 6).fill({ color: 0xffffff, alpha: 0.95 })
  fo.moveTo(516, 90).lineTo(516, 66).quadraticCurveTo(570, 38, 630, 64).quadraticCurveTo(700, 86, 784, 48).lineTo(784, 90).closePath().fill(0x93cf8e)
  fo.moveTo(516, 90).lineTo(516, 80).quadraticCurveTo(600, 62, 680, 84).quadraticCurveTo(742, 92, 784, 74).lineTo(784, 90).closePath().fill(0x73b97a)
  fo.rect(722, 62, 5, 18).fill(0x8a5a3b)
  fo.circle(724, 54, 14).fill(0x4f9e5c)
  fo.circle(714, 61, 10).fill(0x4f9e5c)
  fo.circle(735, 61, 10).fill(0x4f9e5c)
  fo.circle(720, 49, 7).fill({ color: 0xffffff, alpha: 0.14 })
  // gnistrande reflexer i glaset
  fo.poly([536, 90, 568, 90, 626, 0, 594, 0]).fill({ color: 0xffffff, alpha: 0.16 })
  fo.poly([580, 90, 592, 90, 650, 0, 638, 0]).fill({ color: 0xffffff, alpha: 0.12 })
  // spröjs
  fo.rect(646, -BLEED_Y, 8, BLEED_Y + 90).fill(0xfff3df)
  fo.rect(516, 38, 268, 7).fill(0xfff3df)
  fo.rect(646, -BLEED_Y, 1.5, BLEED_Y + 90).fill({ color: 0xc9b48e, alpha: 0.6 })
  fo.roundRect(484, 88, 332, 20, 6).fill(0xc9b48e)
  fo.roundRect(484, 87, 332, 16, 6).fill(0xf5e6c8)
  fo.rect(492, 88, 316, 3).fill({ color: 0xffffff, alpha: 0.5 })
  vagg.addChild(fo)

  // ---- Hängande lampa (svänger sakta; tänds när maskinen vaknar) -------------------------
  const lampa = new Container()
  lampa.position.set(960, -BLEED_Y)
  const cy = BLEED_Y + 30 // skärmens läge för lampskärmens topp, lokalt
  const lg = new Graphics()
  lg.moveTo(0, 0).lineTo(0, cy).stroke({ width: 3.5, color: 0x4a4f5c })
  lg.roundRect(-9, cy - 6, 18, 12, 4).fill(0x4a4f5c)
  lg.circle(0, cy + 41, 10).fill(0xdcd2b8) // släckt glödlampa
  const lampPa = new Container() // glöd + tänd glödlampa, tonas in när maskinen vaknar
  lampPa.alpha = 0
  const gl1 = new Graphics().circle(0, cy + 46, 92).fill({ color: 0xffe9a0, alpha: 0.13 })
  gl1.circle(0, cy + 46, 62).fill({ color: 0xffe08a, alpha: 0.2 })
  gl1.circle(0, cy + 46, 36).fill({ color: 0xfff3b0, alpha: 0.35 })
  const bulbOn = new Graphics().circle(0, cy + 41, 10).fill(0xfff3b0)
  bulbOn.circle(0, cy + 41, 5).fill(0xffffff)
  lampPa.addChild(gl1, bulbOn)
  // skärmen ligger FRAMFÖR glöden så ljuset lyser ut under kanten
  const lg2 = new Graphics()
  lg2.poly([-13, cy + 2, 13, cy + 2, 40, cy + 38, -40, cy + 38]).fill(0xffb347)
  lg2.poly([-13, cy + 2, -5, cy + 2, -16, cy + 38, -40, cy + 38]).fill({ color: 0xffffff, alpha: 0.28 })
  lg2.ellipse(0, cy + 38, 40, 6).fill(0xd98a1f)
  lampa.addChild(lg, lampPa, lg2)
  vagg.addChild(lampa)
  liv(lagg(lampa), { bob: 0, sway: 0.028, duration: 4.4, phase: 0.2 })

  // ---- Hyllan med oljekanna, skruvburk och färgburk --------------------------------------
  const hyllan = new Graphics()
  hyllan.roundRect(244, 92, 236, 14, 4).fill(0x8a5a30)
  hyllan.roundRect(244, 90, 236, 12, 4).fill(TRA)
  hyllan.rect(250, 91, 224, 3).fill({ color: 0xffffff, alpha: 0.3 })
  hyllan.rect(250, 106, 224, 5).fill({ color: 0x000000, alpha: 0.1 })
  vagg.addChild(hyllan)
  const saker = []
  for (const [x, rita] of [[298, ritaOljekanna], [372, ritaSkruvburk], [440, ritaFargburk]]) {
    const c = new Container()
    c.position.set(x, 91)
    c.addChild(new Graphics())
    rita(c.children[0])
    vagg.addChild(c)
    saker.push(lagg(c))
  }

  // ---- Verktyg på väggen: vaggar i sina spikar, var och en på sin egen fas ----------------
  const vaggar = []
  const hang = (x, y, rita, fas, dur) => {
    const nagel = new Graphics()
    nagel.ellipse(x + 2, y + 3, 6, 3).fill({ color: 0x000000, alpha: 0.16 })
    nagel.circle(x, y, 4.5).fill(0x59626e)
    nagel.circle(x - 1, y - 1, 1.8).fill({ color: 0xffffff, alpha: 0.6 })
    vagg.addChild(nagel)
    const ut = new Container()
    ut.position.set(x, y)
    const inre = new Container()
    const g = new Graphics()
    rita(g)
    inre.addChild(g)
    ut.addChild(inre)
    vagg.addChild(ut)
    liv(lagg(ut), { bob: 0, sway: 0.035, duration: dur, phase: fas })
    vaggar.push(lagg(inre))
    return ut
  }
  hang(58, 192, ritaHammare, 0.1, 3.6)
  hang(58, 362, ritaSkiftnyckel, 0.55, 4.1)
  hang(1188, 190, ritaSag, 0.3, 4.8)
  hang(1244, 372, ritaMatband, 0.8, 3.9)

  // ---- Bänken (förgrunden): brun skiva med plankskarvar, brädan står bakom ---------------
  const bank = new Graphics()
  bank.rect(-BLEED_X, BANK_Y, W + 2 * BLEED_X, H - BANK_Y + BLEED_Y).fill(groundFill(0x9a6a44, { light: 0.12, dark: 0.3 }))
  for (const y of [630, 672]) bank.moveTo(-BLEED_X, y).lineTo(W + BLEED_X, y)
  bank.stroke({ width: 3, color: 0x4a2f1a, alpha: 0.3 })
  // ändskarvar förskjutna mellan raderna
  const rader = [[BANK_Y + 4, 630], [630, 672], [672, H + BLEED_Y]]
  rader.forEach(([a, b], r) => {
    for (let x = -BLEED_X + 140 + r * 170; x < W + BLEED_X; x += 520) bank.moveTo(x, a).lineTo(x, b)
  })
  bank.stroke({ width: 2.5, color: 0x4a2f1a, alpha: 0.26 })
  // ådring
  for (let i = 0; i < 54; i++) {
    const x = -BLEED_X + rnd() * (W + 2 * BLEED_X)
    const y = BANK_Y + 14 + rnd() * (H - BANK_Y + BLEED_Y - 18)
    const l = 40 + rnd() * 90
    bank.moveTo(x, y).quadraticCurveTo(x + l / 2, y + (rnd() - 0.5) * 5, x + l, y)
  }
  bank.stroke({ width: 2, color: 0x4a2f1a, alpha: 0.16, cap: 'round' })
  // bakkant: skuggfog mot väggen och en ljus kant framför
  bank.rect(-BLEED_X, BANK_Y, W + 2 * BLEED_X, 8).fill({ color: 0x000000, alpha: 0.3 })
  bank.rect(-BLEED_X, BANK_Y + 8, W + 2 * BLEED_X, 3).fill({ color: 0xffffff, alpha: 0.2 })
  vagg.addChild(bank)

  // Verktygslådan på bänkens vänstra ände.
  const lada = new Container()
  lada.position.set(60, 606)
  const ladaG = new Graphics()
  ritaVerktygslada(ladaG)
  lada.addChild(ladaG)
  vagg.addChild(lada)
  saker.push(lagg(lada))

  // ---- Katten på bänkens högra ände -----------------------------------------------------
  const katt = new Container()
  katt.position.set(1224, 606)
  const torso = new Container()
  torso.addChild(new Graphics())
  ritaKattkropp(torso.children[0])
  katt.addChild(torso)
  const huvud = new Container()
  const hg = new Graphics()
  ritaKattHuvud(hg)
  const ogonZ = new Graphics()
  ritaOgonStangda(ogonZ)
  const ogonO = new Graphics()
  ritaOgonOppna(ogonO)
  ogonO.visible = false
  huvud.addChild(hg, ogonZ, ogonO)
  const HUVUD_SOV = { x: -33, y: -27, r: 0.14 }
  const HUVUD_VAKEN = { x: -34, y: -35, r: -0.08 }
  huvud.position.set(HUVUD_SOV.x, HUVUD_SOV.y)
  huvud.rotation = HUVUD_SOV.r
  katt.addChild(huvud)
  const zzz = new Container()
  zzz.position.set(-30, -58)
  const z1 = new Graphics()
  ritaZ(z1, 1)
  const z2 = new Graphics()
  ritaZ(z2, 0.7)
  z2.position.set(15, -16)
  zzz.addChild(z1, z2)
  zzz.alpha = 0
  katt.addChild(zzz)
  vagg.addChild(katt)
  lagg(torso); lagg(torso.scale); lagg(huvud); lagg(zzz); lagg(katt)

  // ---- Pegbrädan: ram, skugga, brädyta med hål och skruvar -------------------------------
  const bradan = new Container()
  bradan.eventMode = 'none'
  bradan.interactiveChildren = false
  const { x: bx, y: by, w: bw, h: bh } = BRADA
  const bg = new Graphics()
  bg.roundRect(bx + 2, by + 18, bw + 8, bh + 4, 34).fill({ color: 0x000000, alpha: 0.1 })
  bg.roundRect(bx - 2, by + 10, bw + 4, bh + 2, 32).fill({ color: 0x000000, alpha: 0.16 })
  bg.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 30).fill(groundFill(COLORS.brown, { light: 0.22, dark: 0.2 }))
  bg.roundRect(bx - 6, by - 6, bw + 12, 4, 2).fill({ color: 0xffffff, alpha: 0.2 })
  bg.roundRect(bx + 8, by + 8, bw - 16, bh - 16, 18).fill(groundFill(0xe2cc9f, { light: 0.07, dark: 0.12 }))
  // brädan sitter lite inskuren i ramen: skugga längs övre och vänstra insidan
  bg.roundRect(bx + 8, by + 8, bw - 16, 12, 6).fill({ color: 0x000000, alpha: 0.1 })
  bg.roundRect(bx + 8, by + 8, 9, bh - 16, 6).fill({ color: 0x000000, alpha: 0.06 })
  for (let x = bx + 30; x < bx + bw; x += 60) {
    for (let y = by + 30; y < by + bh - 8; y += 60) bg.circle(x, y, 4.6)
  }
  bg.fill({ color: 0x5a3b22, alpha: 0.42 })
  for (let x = bx + 30; x < bx + bw; x += 60) {
    for (let y = by + 30; y < by + bh - 8; y += 60) bg.circle(x + 1.2, y + 2.4, 2)
  }
  bg.fill({ color: 0xffffff, alpha: 0.35 })
  for (const [sx, sy] of [[bx + 1, by + 1], [bx + bw - 1, by + 1], [bx + 1, by + bh - 1], [bx + bw - 1, by + bh - 1]]) {
    bg.circle(sx, sy, 5).fill(0x59626e)
    bg.circle(sx - 0.8, sy - 0.8, 3.6).fill(STAL)
    bg.moveTo(sx - 2.6, sy + 0.6).lineTo(sx + 2.6, sy - 0.6).stroke({ width: 1.6, color: 0x59626e })
  }
  bradan.addChild(bg)

  // ---- Väckningen ---------------------------------------------------------------------
  let vaken = false
  let anrop = [] // stegrade vaggningar (delayedCall) — rivs i destroy
  let zzzTl = null
  const startaZzz = () => {
    zzzTl?.kill()
    zzz.visible = true
    zzzTl = gsap.timeline({ repeat: -1 })
      .fromTo(zzz, { y: -58, alpha: 0 }, { y: -72, alpha: 0.95, duration: 0.9, ease: 'sine.out' })
      .to(zzz, { y: -86, alpha: 0, duration: 0.9, ease: 'sine.in' })
  }
  const stoppaZzz = () => {
    zzzTl?.kill()
    zzzTl = null
    gsap.killTweensOf(zzz)
    zzz.alpha = 0
    zzz.visible = false
  }
  // Katten andas långsamt medan den sover: torson växer och krymper någon procent uppåt.
  const andas = gsap.to(torso.scale, { y: 1.045, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  startaZzz()

  const sova = () => {
    ogonZ.visible = true
    ogonO.visible = false
  }

  return {
    vagg,
    bradan,
    get vaken() { return vaken },

    // Maskinen greppar: lampan tänds, katten vaknar, verktygen vaggar.
    vakna(audio) {
      if (vaken) {
        wiggle(huvud)
        return
      }
      vaken = true
      gsap.killTweensOf(lampPa)
      gsap.to(lampPa, { alpha: 1, duration: 0.5, ease: 'power2.out' })
      stoppaZzz()
      ogonZ.visible = false
      ogonO.visible = true
      gsap.killTweensOf(huvud)
      gsap.to(huvud, { x: HUVUD_VAKEN.x, y: HUVUD_VAKEN.y, rotation: HUVUD_VAKEN.r, duration: 0.45, ease: 'back.out(2.2)' })
      squash(katt, { intensity: 0.8, hop: 12 })
      anrop = anrop.concat(stegra(saker.concat(vaggar), wiggle))
      audio?.tone?.({ freq: 740, dur: 0.05, type: 'triangle', vol: 0.16, delay: 0.25 })
      audio?.tone?.({ freq: 1040, dur: 0.07, type: 'sine', vol: 0.12, delay: 0.32 })
    },

    // En ny maskin byggs: verkstaden lägger sig till rätta igen.
    somna() {
      if (!vaken) return
      vaken = false
      gsap.killTweensOf(lampPa)
      gsap.to(lampPa, { alpha: 0, duration: 0.7, ease: 'power1.inOut' })
      gsap.killTweensOf(huvud)
      gsap.to(huvud, { x: HUVUD_SOV.x, y: HUVUD_SOV.y, rotation: HUVUD_SOV.r, duration: 0.8, ease: 'sine.inOut' })
      sova()
      startaZzz()
    },

    // Klart: katten hoppar till, verktygen vaggar i tur och ordning.
    fira() {
      squash(katt, { intensity: 1, hop: 18 })
      anrop = anrop.concat(stegra(vaggar.concat(saker), wiggle))
    },

    destroy() {
      zzzTl?.kill()
      for (const a of anrop) a?.kill?.()
      anrop = []
      andas.kill()
      for (const n of alla) {
        if (!n || n.destroyed) continue
        n._fxLiv?.kill()
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
      }
      gsap.killTweensOf(lampPa)
    },
  }
}
