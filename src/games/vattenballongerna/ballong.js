// VATTENBALLONGERNA — själva ballongen: en mjukkropp (dallring) ritad som mesh, i nodens EGET rum.
//
// FLYGNINGEN BÄRS AV EN matter-CIRKEL (spelets `phys`), inte av mjukkroppen — `lib/mjukkropp.js` har
// ingen kollision mot mark och väggar. Mjukkroppen är bara bild och dallring: spelet flyttar
// `nod` till cirkelns läge, och kroppens punkter (kring origo) svänger för sig själva med fast
// tidssteg (kroppens egen `Takt`). Det som ger känslan av mjukhet är tre knuffar:
//   · `vobbla`  — en andra-ordningens vågning (äggformad ↔ platt) som ringer av under flygningen,
//   · `platta`  — en tillplattning längs en normal vid nedslaget,
//   · `knuff`   — en puff vid fyllning.
import { Container, Graphics } from 'pixi.js'
import { Mjukkropp } from '../../lib/mjukkropp.js'
import { mjukMesh } from '../../lib/mjukmesh.js'
import { shade, tint } from '../../lib/theme.js'
import { stadFx } from '../../lib/feedback.js'

const BREDD = 56
const HOJD = 68

export class Ballong {
  constructor(parent, farg) {
    this.farg = farg
    this.alive = true
    this.nod = new Container()
    this.nod.eventMode = 'none'
    parent.addChild(this.nod)
    this.vy = new Container() // inre barn: guppar och squashas av feedback.js
    this.vy.eventMode = 'none'
    this.nod.addChild(this.vy)

    // En punktsymmetrisk form (en jämn ellips): en äggform har en udda term, och då hamnar ringens
    // medelpunkt vid sidan av ekrarnas mitt — kroppen skulle driva (uppmätt −110 px/s). Ägget ger knuten.
    this.mjuk = new Mjukkropp({
      x: 0, y: 0, w: BREDD, h: HOJD, punkter: 14, grav: 0, damp: 0.955, iter: 6, tryck: 1, styvhet: 0.9,
    })
    this.mm = mjukMesh(this.mjuk, {
      tathet: 3,
      gradient: [tint(farg, 0.42), shade(farg, 0.06)],
      kontur: { farg: shade(farg, 0.3), bredd: 3 },
      glans: { alpha: 0.22, skala: 0.5 },
    })
    this.vy.addChild(this.mm.mesh)

    // knuten följer botten på kroppen
    this.knut = new Graphics()
    this.knut.moveTo(0, -3).lineTo(-9, 11).lineTo(9, 11).closePath().fill(shade(farg, 0.22)).stroke({ width: 2, color: shade(farg, 0.38), join: 'round' })
    this.knut.circle(0, 12, 3.2).fill(shade(farg, 0.38))
    this.knut.eventMode = 'none'
    this.knut.visible = false // knuten sitter först när ballongen är fylld och knuten
    this.vy.addChild(this.knut)

    // gummihalsen som sitter på kranens pip medan ballongen fylls
    this.hals = new Graphics()
    this.hals.roundRect(-9, -13, 18, 15, 5).fill(shade(farg, 0.16)).stroke({ width: 2, color: shade(farg, 0.38) })
    this.hals.roundRect(-12, -16, 24, 6, 3).fill(shade(farg, 0.3))
    this.hals.eventMode = 'none'
    this.vy.addChild(this.hals)

    // en liten blänkare uppe till vänster (följer inte deformationen — den är bara ett glitter)
    this.glitter = new Graphics()
    this.glitter.ellipse(-12, -19, 5, 9).fill({ color: 0xffffff, alpha: 0.7 })
    this.glitter.rotation = 0.5
    this.glitter.eventMode = 'none'
    this.vy.addChild(this.glitter)

    this._k = 1
    this.skala(0.3)
    for (let i = 0; i < 30; i++) this.mjuk.steg(1) // sätt formen på startskalan innan den växer
    this.mm.uppdatera()
    this._placeraKnut()
  }

  // Fyllnadsgrad 0..1 → viloformen växer (absolut mot byggmåttet, se Mjukkropp.skala).
  skala(k) {
    this._k = k
    this.mjuk.skala(k)
    this.glitter.scale.set(k)
  }

  uppdatera(deltaMS) {
    if (!this.alive) return
    this.mjuk.uppdatera(deltaMS)
    // kroppen ska aldrig vandra bort från nodens origo — formen får svänga, mitten ligger kvar
    this.mjuk.flyttaTill(0, 0)
    this.mm.uppdatera()
    this._placeraKnut()
  }

  _placeraKnut() {
    const m = this.mjuk
    const b = m.pts[Math.floor(m.n / 2)]
    const c = m.pts[m.mitt]
    const a = Math.atan2(b.y - c.y, b.x - c.x) - Math.PI / 2
    this.knut.position.set(b.x, b.y)
    this.knut.rotation = a
    this.knut.scale.set(Math.max(0.3, this._k))
    const t = m.pts[0]
    this.hals.position.set(t.x, t.y + 3)
    this.hals.scale.set(Math.max(0.35, this._k))
  }

  // Fylld: halsen försvinner och knuten sitter där.
  knyt() {
    this.hals.visible = false
    this.knut.visible = true
  }

  // Andra ordningens vågning: punkter ±amp längs/tvärs en axel `theta`. Rena positionsknuffar
  // (verlet läser dem som fart → ringer av av sig själv, aldrig en teleport).
  vobbla(theta, amp) {
    const m = this.mjuk
    const c = m.pts[m.mitt]
    for (let i = 0; i < m.n; i++) {
      const p = m.pts[i]
      const a = Math.atan2(p.y - c.y, p.x - c.x)
      const o = amp * Math.cos(2 * (a - theta))
      p.x += Math.cos(a) * o
      p.y += Math.sin(a) * o
    }
  }

  // Tryck ihop längs normalen (nx, ny) — nedslaget. `amt` 0..1 per anrop; kalla några steg i rad.
  // Sätter både x och px: en tillplattning är en FORM, inte en fart.
  platta(nx, ny, amt) {
    const m = this.mjuk
    const c = m.pts[m.mitt]
    const l = Math.hypot(nx, ny) || 1
    const ux = nx / l
    const uy = ny / l
    for (let i = 0; i < m.n; i++) {
      const p = m.pts[i]
      const rx = p.x - c.x
      const ry = p.y - c.y
      const par = rx * ux + ry * uy
      const px = rx - par * ux
      const py = ry - par * uy
      const nyPar = par * (1 - amt * 0.5)
      const nyPer = 1 + amt * 0.32
      const x = c.x + ux * nyPar + px * nyPer
      const y = c.y + uy * nyPar + py * nyPer
      p.px += x - p.x
      p.py += y - p.y
      p.x = x
      p.y = y
    }
  }

  knuff(x, y, kraft, radie) {
    this.mjuk.knuff(x, y, kraft, radie, { form: true })
  }

  setSynlig(v) {
    this.nod.visible = v
  }

  riv() {
    if (!this.alive) return
    this.alive = false
    stadFx(this.nod)
    this.mm.destroy() // OBLIGATORISK: geometrin och buffertarna rivs inte av Mesh.destroy
    this.mjuk.destroy()
    if (!this.nod.destroyed) this.nod.destroy({ children: true })
  }
}
