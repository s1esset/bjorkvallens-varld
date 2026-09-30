// Trollkarls-Bobo: den delade riggen (`makeKaraktar`) med hög hatt, flugsnipa och
// trollstav. Hatten sitter på HUVUDET (följer nick och lutning), staven på höger arm
// (följer varje armgest), och flugsnipan ovanpå kroppen. Allt är ritade former.
//
// Riggen äger humör, blink och vilo-andning. Här finns bara klädseln och två armgester
// som spelet styr i takt med blandningen. Armgesterna tweenar `armar[1].rotation` — en
// nod riggen själv städar i destroy().
import { Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { COLORS } from '../../lib/theme.js'

const HATT = 0x2b2150
const HATT_LJUS = 0x443a78
const GULD = 0xf5c04a
const SAMMET = 0xc9384f

export function makeTrollkarl(r = 52) {
  const bobo = makeKaraktar({ r })

  // Hatt: brätte + skorsten + topp, rött band och en guldstjärna.
  const hatt = new Graphics()
  const y0 = -r * 0.9
  hatt.ellipse(0, y0, r * 0.7, r * 0.16).fill(HATT)
  hatt.roundRect(-r * 0.42, y0 - r * 0.82, r * 0.84, r * 0.84, r * 0.08).fill(HATT)
  hatt.ellipse(0, y0 - r * 0.82, r * 0.42, r * 0.1).fill(HATT_LJUS)
  hatt.rect(-r * 0.42, y0 - r * 0.3, r * 0.84, r * 0.16).fill(SAMMET)
  hatt.star(0, y0 - r * 0.22, 5, r * 0.1, r * 0.045).fill(GULD)
  hatt.rotation = 0.07
  hatt.eventMode = 'none'
  bobo.huvud.addChild(hatt)

  // Flugsnipa under hakan.
  const snipa = new Graphics()
  const ty = r * 1.12
  snipa.poly([0, ty, -r * 0.3, ty - r * 0.16, -r * 0.3, ty + r * 0.16]).fill(SAMMET)
  snipa.poly([0, ty, r * 0.3, ty - r * 0.16, r * 0.3, ty + r * 0.16]).fill(SAMMET)
  snipa.circle(0, ty, r * 0.08).fill(GULD)
  snipa.eventMode = 'none'
  bobo.view.addChild(snipa)

  // Trollstav i höger hand (den som pekar mot bordet). Handen sitter på (0.5r, -0.8r) i
  // armens eget rum; staven sticker upp och lite utåt, med vit spets.
  const hx = r * 0.5
  const hy = -r * 0.8
  const tx = hx + r * 0.25
  const ty2 = hy - r * 0.82
  const stav = new Graphics()
  stav.moveTo(hx, hy).lineTo(tx, ty2).stroke({ width: r * 0.1, color: COLORS.ink, cap: 'round' })
  stav.moveTo(hx + (tx - hx) * 0.72, hy + (ty2 - hy) * 0.72).lineTo(tx, ty2).stroke({ width: r * 0.11, color: COLORS.white, cap: 'round' })
  stav.eventMode = 'none'
  bobo.armar[1].addChild(stav)
  bobo._spets = { x: tx, y: ty2 }
  return bobo
}

// Stavspetsen i GLOBALA koordinater (för gnistor i fxLayer).
export function spetsGlobal(bobo) {
  if (!bobo || bobo.view.destroyed) return null
  return bobo.armar[1].toGlobal(bobo._spets)
}

// Höger arm till en vinkel (radianer, + = utåt mot bordet). Dödar en tidigare armtween.
export function armTill(bobo, rot, dur = 0.3, ease = 'back.out(1.6)') {
  if (!bobo || bobo.view.destroyed) return
  const arm = bobo.armar[1]
  gsap.killTweensOf(arm, 'rotation')
  gsap.to(arm, { rotation: rot, duration: dur, ease })
}

// Ett snärt med staven i takt med ett byte: ut, litet sväng tillbaka, hem.
export function snart(bobo, dur) {
  if (!bobo || bobo.view.destroyed) return
  const arm = bobo.armar[1]
  gsap.killTweensOf(arm, 'rotation')
  gsap
    .timeline()
    .to(arm, { rotation: 0.78, duration: dur * 0.3, ease: 'power2.out' })
    .to(arm, { rotation: 0.3, duration: dur * 0.35, ease: 'sine.inOut' })
    .to(arm, { rotation: 0, duration: dur * 0.35, ease: 'power2.inOut' })
}
