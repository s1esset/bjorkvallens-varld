// pekare.js — EN delad pekhjälpare för "tryck på något, dra, släpp" (FYSIKPLAN K3).
//
// Varje grepp-kontroll skrev samma sekvens (down → globalpointermove → up/upoutside) och
// kom på nytt in i samma tre fällor. Hjälparen äger dem på ett ställe:
//
//  1. Ett släpp når ALDRIG ett syskon. `pointerupoutside` går bara uppför pressmålets EGEN
//     kedja, `pointerup` uppför släpp-målets. Därför sitter ALLA lyssnare på EN gemensam
//     förälder (`yta`) — då når släppet fram vart fingret än lyfts.
//  2. En bubblande förälder måste vara `eventMode = 'static'` (Pixis `notifyTarget` bortar
//     tyst på allt annat). Hjälparen sätter det.
//  3. En bar `Container` utan geometri träffas aldrig — ge ytan en `hitArea` (valfritt
//     alternativ nedan) eller se till att något av barnen är ett träffbart mål.
//
// Plus pekar-id (K2): en pekare åt gången. Ytans första finger äger greppet tills det lyfts;
// andra fingrar och handflator ignoreras helt — varken drag, släpp eller nytt tryck.
//
//   const av = pekGrepp(this._root, {
//     hitArea: new Rectangle(0, 0, 1280, 720),    // valfritt — bara om ytan saknar träffbar geometri
//     traff: (p, e) => this._hitta(p),             // p = ytans lokala koordinater. Falsy = tryck ignoreras
//     ned:    (p, mal, e) => { … },                // mal = det traff() gav (true om traff saknas)
//     flytta: (p, mal, e) => { … },                // varje rörelse av DET fingret
//     slapp:  (p, mal, { avbruten, utanfor, e }) => { … },
//   })
//   …destroy(): av()                               // unbinder; rör inga spelobjekt
//
// `slapp` kommer ALLTID efter ett `ned` (exakt en gång), även när fingret lyfts utanför ytan
// (`utanfor`) eller avbröts (`avbruten`). ⚠️ Pixi 8 binder aldrig `pointercancel`; bryggan i
// `lib/pixilapp.js` (K1) gör en DOM-cancel till `pointerup` på window, vilket Pixi levererar
// som `pointerupoutside` — så en bryggad cancel syns som `utanfor`, inte `avbruten`. Behandla
// båda som ett vanligt släpp (aldrig ett straff). `avbruten` är sann bara när Pixi själv ger
// `pointercancel` eller när `av.slappa()` / skyddsnätet avslutar greppet.
//
// Skyddsnät: ett nytt tryck medan greppet stått kvar > 2 s utan rörelse betyder att släppet
// aldrig kom fram — det gamla greppet avslutas (`slapp` med `avbruten: true`) och det nya tas.
//
// Unbindern: `av()` tar bort lyssnarna UTAN att anropa något (exit-säkert — spelet kan redan
// vara på väg att rivas). `av.aktiv` är sann medan ett finger håller; `av.slappa()` avslutar
// ett pågående grepp som ett avbrott (t.ex. när spelet stänger kontrollen mitt i ett drag).
//
// Rör inte Pixi-moduler — logiken är ren och prövas i Node med en falsk yta
// (`scripts/_pekareprobe.mjs`).

export const PEK_FASTNAT_MS = 2000

const UPP = ['pointerup', 'pointerupoutside', 'pointercancel']

export function pekGrepp(yta, { traff, ned, flytta, slapp, hitArea, fastnat = PEK_FASTNAT_MS } = {}) {
  if (!yta) return avNoll()
  // Pixis `notifyTarget` ignorerar allt som inte är 'static'/'dynamic'.
  if (yta.eventMode !== 'static' && yta.eventMode !== 'dynamic') yta.eventMode = 'static'
  if (hitArea) yta.hitArea = hitArea

  let grepp = null // { id, mal, p, rort }

  const lokal = (e, reserv) => {
    if (e && e.global && yta.toLocal) {
      const p = yta.toLocal(e.global)
      return { x: p.x, y: p.y }
    }
    return reserv || { x: 0, y: 0 }
  }
  const idAv = (e) => (e && e.pointerId != null ? e.pointerId : null)
  const annat = (e) => grepp && grepp.id != null && idAv(e) != null && idAv(e) !== grepp.id
  const nu = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

  // Tillståndet nollas FÖRE anropet — kastar spelets `slapp` får greppet ändå aldrig fastna.
  const avsluta = (e, extra) => {
    const g = grepp
    if (!g) return
    grepp = null
    const p = lokal(e, g.p)
    slapp?.(p, g.mal, { avbruten: false, utanfor: false, e, ...extra })
  }

  const onDown = (e) => {
    if (yta.destroyed) return
    if (grepp) {
      if (nu() - grepp.rort < fastnat) return // ett finger i taget
      avsluta(null, { avbruten: true }) // skyddsnät: det gamla släppet kom aldrig
    }
    const p = lokal(e)
    const mal = traff ? traff(p, e) : true
    if (!mal) return
    grepp = { id: idAv(e), mal, p, rort: nu() }
    ned?.(p, mal, e)
  }

  const onMove = (e) => {
    if (!grepp || yta.destroyed || annat(e)) return
    grepp.rort = nu()
    const p = lokal(e, grepp.p)
    grepp.p = p
    flytta?.(p, grepp.mal, e)
  }

  const onUp = (e) => {
    if (!grepp || annat(e)) return
    const typ = e && e.type
    avsluta(e, { avbruten: typ === 'pointercancel', utanfor: typ === 'pointerupoutside' })
  }

  yta.on('pointerdown', onDown)
  yta.on('globalpointermove', onMove)
  for (const t of UPP) yta.on(t, onUp)

  const av = () => {
    grepp = null
    yta.off?.('pointerdown', onDown)
    yta.off?.('globalpointermove', onMove)
    for (const t of UPP) yta.off?.(t, onUp)
  }
  Object.defineProperty(av, 'aktiv', { get: () => !!grepp })
  av.slappa = () => avsluta(null, { avbruten: true })
  return av
}

function avNoll() {
  const av = () => {}
  Object.defineProperty(av, 'aktiv', { get: () => false })
  av.slappa = () => {}
  return av
}
