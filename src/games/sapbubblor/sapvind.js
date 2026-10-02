// PUFFENS LUFT — `lib/vind.js` (Vindfalt, F4) som såpbubblornas vindfält.
//
// Förut var en vindpuff en rund fläck (radie 84 → 192 px) vars kraft räknades för hand i
// `_update`: `GUST_FORCE · (1 − d/r) · livsfaktor / massa`. Nu är varje puff ETT `Vindfalt`
// (form `kon` längs siktlinjen, luftens fart i px/s) som färdas med puffen — och bubblan
// känner luften RELATIVT sin egen fart, som resten av F4: `a = (K/massa) · (w − v)`.
// Lätt bubbla (liten massa) hinner dit fort och FÖLJER MED, jätten SLÄPAR; ingen bubbla kan
// få en fart över luftens (`PUFF_LUFT`), så en puff blåser aldrig en bubbla "förbi" vinden.
//
// Modulen är ren (ingen Pixi, ingen matter, ingen tid): bubblorna är inga matter-kroppar, så
// fältet byggs UTAN `varld` och stegas av spelets ticker. Den ligger i en egen fil så att
// `scripts/_sapvindprobe.mjs` kör EXAKT samma kod som spelet.
//
// ⚠️ TALEN ÄR PASSADE MOT DEN GAMLA PUFFEN, inte gissade — och i två steg. Först en sökning på
//    puffens totala fartpåverkan (fartändring över hela livet, vid stillastående bubbla): 6,5 %
//    relativt fel. Det räckte INTE: den gamla puffen lade en kraft och lät bubblornas fartetak
//    klippa, så en lätt bubbla i puffens svaga kant blev ändå 470 px/s, och den formen blev 0,54×
//    så stark på barnbubblan i en riktig simulering. Andra passet sökte i SIMULERINGEN (spelets
//    egen rörelseloop, tre sikten × tre storlekar): median ny/gammal 0,77 · 1,00 · 1,00 och lika
//    många bubblor som flyttas ≥ 30 px (106/99 · 68/64 · 29/30). `scripts/_sapvindprobe.mjs`.
// ⚠️ BARA FRAMÅT: luften längs strålen kan SKJUTA en bubbla men aldrig BROMSA den. En puff som
//    bromsade en redan snabb bubbla i sin svaga kant vore en ny, osynlig regel — och för ett
//    barn läser "blåste jag och den blev långsammare?" som att fläkten är trasig.
import { Vindfalt } from '../../lib/vind.js'

// Luftens fart i puffens kärna, px/s. ⚠️ MEDVETET MYCKET HÖGRE ÄN BUBBLORNAS FARTTAK (470/330):
// först var den 470, och då blev ny puff 0,22× av den gamla på en barnbubbla (mätt) — en kropp
// som driver mot luftens FART kommer aldrig över den, och i puffens svaga kanter är luften
// långsam (470·s). Den gamla puffen lade en kraft och lät spelets tak klippa; med en hög luftfart
// (och ett motstånd som är motsvarande lågt, `PUFF_K·PUFF_LUFT` = 2709 konstant) är relativ-luft-
// modellen i det linjära läget och taket i `_update` klipper som förr. Bubblan är fortfarande
// aldrig snabbare än luften, bara att luften här är snabbare än något bubblan tillåts göra.
export const PUFF_LUFT = 1800

// Puffens form i förhållande till dess radie r (kon längs siktlinjen) + kraften.
export const FORM = {
  a: 0.2, // källan ligger a·r BAKOM puffens mitt
  rho: 1.2, // räckvidd = rho·r
  eta: 1.1, // halv bredd = eta·r
  lam: 0.15, // avtagande längs strålen (0 = platt, 1 = noll vid änden)
  kw: 2709, // px/s² i kärnan för massa 1: motstånd × luftens fart
}

// gu = { x, y, dx, dy, r, life } — mitten, enhetsriktning, radie, 0..1-liv (life / GUST_LIFE).
export function nyPuffalt(gu) {
  const falt = new Vindfalt({
    form: { typ: 'kon', x: gu.x, y: gu.y, rackvidd: 1, halvhojd: 1, vidgning: 0, vinkel: Math.atan2(gu.dy, gu.dx) },
    luft: { x: gu.dx * PUFF_LUFT, y: gu.dy * PUFF_LUFT },
    avtag: { langs: FORM.lam, tvars: 1 },
  })
  stallPuffalt(falt, gu)
  return falt
}

// Flytta/växa fältet till puffens läge denna bildruta. `liv` = 0..1 (1 = nyfödd).
export function stallPuffalt(falt, gu, liv = 1) {
  const f = falt.form
  f.x = gu.x - gu.dx * FORM.a * gu.r
  f.y = gu.y - gu.dy * FORM.a * gu.r
  f.rackvidd = FORM.rho * gu.r
  f.halvhojd = FORM.eta * gu.r
  falt.styrka = Math.max(0, liv)
}

// Accelerationen { ax, ay } (px/s²) puffen ger en bubbla i (x, y) som har fart (vx, wy) och massa
// `massa` under en bildruta på `dt` s — eller `null` utanför puffen / när bubblan redan är snabbare
// än luften. `dt` kapar accelerationen så att ett långt steg aldrig skjuter förbi luftens fart.
export function puffAcc(falt, x, y, vx, wy, massa, dt) {
  const l = falt.luftVid(x, y)
  if (!l) return null
  const w = Math.hypot(l.vx, l.vy)
  if (!(w > 0)) return null
  const ux = l.vx / w
  const uy = l.vy / w
  const rel = w - (vx * ux + wy * uy) // luftens fart längs strålen minus bubblans
  if (!(rel > 0)) return null
  const k = Math.min(FORM.kw / PUFF_LUFT / massa, dt > 0 ? 1 / dt : Infinity)
  return { ax: ux * k * rel, ay: uy * k * rel }
}
