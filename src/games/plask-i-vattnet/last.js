// Plask i Vattnet — "lasta flytaren": var en SJUNKARE ska födas så att den LANDAR på det som
// flyter under släppet, i stället för att födas inne i det.
//
// Rena tal, ingen Pixi — sonden `scripts/_lastaflytprobe.mjs` importerar den här filen i Node.
//
// Förut föddes allt på DROP_Y (30 px ovanför ytan) ±22 px från tankens mitt. En flytare ligger
// med ~62 % under ytan, alltså med sin topp runt y 301 — och en sjunkare som föds överlappande
// trycktes bort av matters positionskorrigering i stället för att falla ned på den. Vi lyfter
// födelsepunkten så att cirklarna precis RÖR varandra plus `luft` px, och låter tyngdkraften
// göra resten: sjunkarens vikt ligger då på flytaren (en `Flytvolym` ger redan lyft ∝
// nedsänkning, så flytaren trycks ned tills lyftet bär dem båda, eller sjunker undan).

// objekt   `_objects`-posterna ({ floats, body, r }) — bara FLYTARE räknas som underlag.
// x, y     önskad födelsepunkt; r  släppets radie.
// luft     fallhöjd (px) mellan födelsepunkten och beröring — så landningen syns som ett fall.
// Returnerar y: oförändrat (`y`) om ingen flytare ligger inom räckhåll, annars högre upp.
export function slappY(objekt, x, y, r, luft = 30) {
  let hogst = y
  for (const o of objekt) {
    if (!o.floats || !o.body) continue
    const p = o.body.position
    const R = o.r + r + luft
    const dx = p.x - x
    if (Math.abs(dx) >= R) continue
    const yy = p.y - Math.sqrt(R * R - dx * dx)
    if (yy < hogst) hogst = yy
  }
  return hogst
}
