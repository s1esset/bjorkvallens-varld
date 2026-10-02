// Rök-prov: Vindbild + Vindfalt tillsammans i Node (Pixi Graphics utan renderare) — inga kast, rätt synlighet, rivning.
import { Container } from 'pixi.js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { nyVindby, startaBy, stoppaBy } from '../src/games/bowling/vindby.js'
import { Vindbild } from '../src/games/bowling/vindbild.js'
const w = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })
const vind = nyVindby(w)
const root = new Container()
const vb = new Vindbild(root)
let ok = true
const k = (n, v) => { console.log((v ? '✓ ' : '✗ ') + n); if (!v) ok = false }
vb.uppdatera(0.016, vind)
k('osynlig före byn', !vb.synlig)
startaBy(vind, [{ x: 600, y: 250 }, { x: 680, y: 190 }])
let sett = 0, max = 0
for (let i = 0; i < 100; i++) { w.update(1000 / 60); vb.uppdatera(1 / 60, vind); if (vb.synlig) sett++; max = Math.max(max, vind.faktor) }
k(`synlig under byn (${sett} av 100 bildrutor, topp ${max.toFixed(2)})`, sett > 60 && max > 0.95)
k('osynlig igen efter byn', !vb.synlig)
startaBy(vind, [{ x: 400, y: 250 }])
for (let i = 0; i < 20; i++) { w.update(1000 / 60); vb.uppdatera(1 / 60, vind) }
stoppaBy(vind)
for (let i = 0; i < 5; i++) { w.update(1000 / 60); vb.uppdatera(1 / 60, vind) }
k('stoppaBy släcker bilden direkt', !vb.synlig)
vb.destroy(); vind.destroy(); w.destroy()
vb.uppdatera(0.016, vind)
k('uppdatera efter destroy kastar inte', true)
process.exit(ok ? 0 : 1)
