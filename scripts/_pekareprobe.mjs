// PEKARE-SONDEN (FYSIKPLAN K3) — prövar logiken i src/lib/pekare.js i Node, med en falsk yta.
//
//   node scripts/_pekareprobe.mjs
//
// Ingen webbläsare och inget Pixi: `pekGrepp` rör bara `on`/`off`/`toLocal`/`eventMode`, så en
// EventEmitter3 (samma bibliotek Pixi bygger på) räcker. Det bevisar INTE att Pixi levererar
// händelserna (det gör `_pekavbrottprobe` mot riktiga spel) — det bevisar att hjälparens egna
// regler håller: id-vakt, ett finger i taget, upoutside/cancel, skyddsnät, unbinder.
//
// KONTROLLARM FÖRST: en naiv kontroll utan id-vakt (dagens DragController/AimLauncher före K2)
// MÅSTE låta finger 2 dra. Rör sig inte det talet mäter armen ingenting och skriptet avslutar 1.
import EventEmitter from 'eventemitter3'
import { pekGrepp } from '../src/lib/pekare.js'

let fel = 0
const ok = (namn, villkor, extra = '') => {
  if (!villkor) fel++
  console.log(`${villkor ? 'OK  ' : 'FEL '} ${namn}${extra ? '  ' + extra : ''}`)
}
const sov = (ms) => new Promise((r) => setTimeout(r, ms))

// En falsk yta: EventEmitter + toLocal (identitet) + eventMode som Pixi.
function yta() {
  const y = new EventEmitter()
  y.eventMode = 'passive'
  y.destroyed = false
  y.toLocal = (g) => ({ x: g.x, y: g.y })
  return y
}
const ev = (type, id, x, y) => ({ type, pointerId: id, global: { x, y } })
const skicka = (y, type, id, x, yy) => y.emit(type, ev(type, id, x, yy))
const lyssnare = (y) => y.eventNames().reduce((n, k) => n + y.listenerCount(k), 0)

// ── KONTROLLARM: dagens kod utan id-vakt ─────────────────────────────────────────────────────
{
  const y = yta()
  const spar = []
  let aktiv = false
  y.on('pointerdown', () => { aktiv = true })
  y.on('globalpointermove', (e) => { if (aktiv) spar.push(e.global.x) })
  skicka(y, 'pointerdown', 1, 100, 100)
  skicka(y, 'globalpointermove', 1, 110, 100)
  skicka(y, 'globalpointermove', 2, 700, 100) // finger 2
  const drogs = spar.includes(700)
  ok('KONTROLL naiv kontroll: finger 2 DRAR (känt läge på HEAD före K2)', drogs, `spår ${JSON.stringify(spar)}`)
  if (!drogs) { console.log('Kontrollarmen rörde sig inte — mätarmen är ogiltig.'); process.exit(1) }
}

// ── MÄTARM: pekGrepp ─────────────────────────────────────────────────────────────────────────
{
  const y = yta()
  const logg = []
  const av = pekGrepp(y, {
    hitArea: { contains: () => true },
    traff: (p) => (p.x < 500 ? { namn: 'bricka' } : null),
    ned: (p, mal) => logg.push(['ned', p.x, mal.namn]),
    flytta: (p) => logg.push(['flytta', p.x]),
    slapp: (p, mal, o) => logg.push(['slapp', p.x, o.avbruten, o.utanfor]),
  })
  ok('eventMode blev static', y.eventMode === 'static')
  ok('hitArea satt', !!y.hitArea)
  ok('en gemensam förälder: 5 lyssnare', lyssnare(y) === 5, `lyssnare ${lyssnare(y)}`)

  skicka(y, 'pointerdown', 1, 600, 0) // traff() säger nej
  ok('traff falsy → inget ned', logg.length === 0 && !av.aktiv)

  skicka(y, 'pointerdown', 7, 100, 50)
  skicka(y, 'pointerdown', 8, 200, 50) // finger 2 trycker
  skicka(y, 'globalpointermove', 8, 700, 50) // finger 2 rör sig
  skicka(y, 'globalpointermove', 7, 120, 50)
  skicka(y, 'pointerup', 8, 700, 50) // finger 2 lyfts — får inte släppa
  ok('finger 2 trycker/rör/lyfter: ingenting händer', JSON.stringify(logg) === JSON.stringify([['ned', 100, 'bricka'], ['flytta', 120]]) && av.aktiv, JSON.stringify(logg))
  skicka(y, 'pointerup', 7, 130, 50)
  ok('finger 1 lyfter → ett släpp, aktiv av', logg.at(-1)[0] === 'slapp' && logg.at(-1)[1] === 130 && !av.aktiv)
  skicka(y, 'pointerup', 7, 130, 50)
  ok('dubbelt släpp är ofarligt', logg.filter((l) => l[0] === 'slapp').length === 1)

  logg.length = 0
  skicka(y, 'pointerdown', 9, 100, 50)
  skicka(y, 'pointerupoutside', 9, 1300, 50)
  ok('pointerupoutside → slapp(utanfor)', JSON.stringify(logg.at(-1)) === JSON.stringify(['slapp', 1300, false, true]), JSON.stringify(logg.at(-1)))
  skicka(y, 'pointerdown', 10, 100, 50)
  ok('nytt grepp efter upoutside fungerar (nytt id)', av.aktiv)
  skicka(y, 'pointercancel', 10, 0, 0)
  ok('pointercancel → slapp(avbruten)', logg.at(-1)[2] === true && !av.aktiv, JSON.stringify(logg.at(-1)))

  // id utan id (syntetisk händelse) släpps igenom
  logg.length = 0
  y.emit('pointerdown', { type: 'pointerdown', global: { x: 50, y: 50 } })
  y.emit('globalpointermove', { type: 'globalpointermove', global: { x: 60, y: 50 } })
  y.emit('pointerup', { type: 'pointerup', global: { x: 60, y: 50 } })
  ok('händelser utan pointerId släpps igenom', logg.length === 3, JSON.stringify(logg))

  // slappa() utifrån
  skicka(y, 'pointerdown', 11, 100, 50)
  av.slappa()
  ok('av.slappa() avslutar som avbrott', !av.aktiv && logg.at(-1)[2] === true)

  // unbinder
  skicka(y, 'pointerdown', 12, 100, 50)
  const n = logg.length
  av()
  ok('unbinder: 0 lyssnare kvar', lyssnare(y) === 0, `lyssnare ${lyssnare(y)}`)
  skicka(y, 'pointerup', 12, 100, 50)
  skicka(y, 'pointerdown', 13, 100, 50)
  ok('unbinder: inga anrop efteråt (exit-säkert, inget slapp)', logg.length === n && !av.aktiv)
}

// ── Skyddsnätet ──────────────────────────────────────────────────────────────────────────────
{
  const y = yta()
  const logg = []
  pekGrepp(y, {
    fastnat: 40,
    ned: (p) => logg.push(['ned', p.x]),
    slapp: (p, m, o) => logg.push(['slapp', o.avbruten]),
  })
  skicka(y, 'pointerdown', 1, 10, 0)
  skicka(y, 'pointerdown', 2, 20, 0) // färskt grepp → ignoreras
  ok('färskt grepp: andra trycket ignoreras', logg.length === 1)
  await sov(60)
  skicka(y, 'pointerdown', 2, 20, 0) // stillastående > fastnat → tar över
  ok('stillastående grepp: nytt tryck avslutar det gamla (avbruten) och tar över',
    JSON.stringify(logg) === JSON.stringify([['ned', 10], ['slapp', true], ['ned', 20]]), JSON.stringify(logg))
  skicka(y, 'pointerup', 1, 10, 0) // gamla fingret lyfts sent — får inte släppa det nya
  ok('gamla fingrets sena släpp rör inte det nya greppet', logg.length === 3)
  skicka(y, 'pointerup', 2, 20, 0)
  ok('nya fingrets släpp avslutar', logg.at(-1)[0] === 'slapp' && logg.at(-1)[1] === false)

  // rörelse håller greppet "levande"
  const y2 = yta()
  let ned = 0
  pekGrepp(y2, { fastnat: 40, ned: () => ned++ })
  skicka(y2, 'pointerdown', 1, 0, 0)
  await sov(30)
  skicka(y2, 'globalpointermove', 1, 5, 0)
  await sov(30)
  skicka(y2, 'pointerdown', 2, 0, 0)
  ok('en rörelse nollställer stillhetsklockan', ned === 1)
}

// ── Kastande slapp får inte låsa greppet ─────────────────────────────────────────────────────
{
  const y = yta()
  let ned = 0
  pekGrepp(y, { ned: () => ned++, slapp: () => { throw new Error('spelet kastade') } })
  skicka(y, 'pointerdown', 1, 0, 0)
  try { skicka(y, 'pointerup', 1, 0, 0) } catch { /* väntat */ }
  skicka(y, 'pointerdown', 2, 0, 0)
  ok('kastande slapp: nästa grepp går ändå att ta', ned === 2)
}

// ── Destroyed yta ────────────────────────────────────────────────────────────────────────────
{
  const y = yta()
  let ned = 0
  pekGrepp(y, { ned: () => ned++ })
  y.destroyed = true
  skicka(y, 'pointerdown', 1, 0, 0)
  ok('förstörd yta: inget ned', ned === 0)
}

console.log(fel ? `\n${fel} FEL` : '\nalla prov gröna')
process.exit(fel ? 1 : 0)
