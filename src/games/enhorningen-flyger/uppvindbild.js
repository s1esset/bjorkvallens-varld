// UPPVINDENS BILD — luftpelaren SYNS: en ljus glöd, vita streck som stiger, löv och blad som virvlar
// uppåt och små gnistor som tindrar (en vind utan bild är ingen vind för ett barn). Allt drivs av
// spelets ticker (`uppdatera`): ingen gsap, inga timers, en container per pelare som rivs med
// `riv()`. Strecken är det ENDA som ritas om per bildruta (en Graphics), löven och gnistorna är
// färdigritade barn som flyttas. `k` = hur starkt pelaren blåser på enhörningen just nu (0..1) —
// då lyser den till och strecken blir tätare, så barnet ser VILKEN luft hon flyger i.
import { Container, Graphics } from 'pixi.js'
import { KOL_BOTTEN } from './uppvind.js'

const LOVFARG = [0x7fcf6a, 0xffc94d, 0xff9ec4, 0x9bd96a, 0xffb36b, 0xc9a7ff]

// Ett löv: spetsig droppform med nerv. Origo i mitten.
function ritaLov(g, farg) {
  g.moveTo(0, -11).quadraticCurveTo(9, -2, 0, 11).quadraticCurveTo(-9, -2, 0, -11).fill(farg).stroke({ width: 1.6, color: 0xffffff, alpha: 0.55, join: 'round' })
  g.moveTo(0, -8).lineTo(0, 9).stroke({ width: 1.4, color: 0xffffff, alpha: 0.6, cap: 'round' })
}

// Fyruddsgnista (fyra spetsar). Origo i mitten.
function ritaGnista(g, farg) {
  g.moveTo(0, -11).quadraticCurveTo(1.5, -1.5, 11, 0).quadraticCurveTo(1.5, 1.5, 0, 11).quadraticCurveTo(-1.5, 1.5, -11, 0).quadraticCurveTo(-1.5, -1.5, 0, -11).fill(farg)
  g.circle(0, 0, 2.2).fill(0xffffff)
}

// En pelare: `topY` = där den slutar, `halv` = halv bredd, `fro` 0..1 = pelarens egen personlighet
// (strecken och löven hamnar olika från pelare till pelare). Origo (x) = pelarens mitt; y är design-y.
export function nyUppvindsvy(topY, halv, fro = 0) {
  const hojd = Math.max(60, KOL_BOTTEN - topY)
  const rot = new Container()
  rot.eventMode = 'none'
  rot.interactiveChildren = false

  // Glöden: tre rundade lager, ljusare i mitten. Tonar in mot toppen med tre allt smalare lager.
  const glod = new Graphics()
  glod.roundRect(-halv, topY, halv * 2, hojd, halv).fill({ color: 0xbfeeff, alpha: 0.22 })
  glod.roundRect(-halv * 0.7, topY + hojd * 0.12, halv * 1.4, hojd * 0.88, halv * 0.7).fill({ color: 0xfff4b0, alpha: 0.18 })
  glod.roundRect(-halv * 0.38, topY + hojd * 0.3, halv * 0.76, hojd * 0.7, halv * 0.38).fill({ color: 0xffffff, alpha: 0.2 })
  rot.addChild(glod)

  const streck = new Graphics()
  rot.addChild(streck)

  const lov = []
  for (let i = 0; i < 6; i++) {
    const g = new Graphics()
    ritaLov(g, LOVFARG[(i + Math.floor(fro * 6)) % LOVFARG.length])
    g.eventMode = 'none'
    rot.addChild(g)
    lov.push({
      g,
      dx: ((i * 0.37 + fro) % 1) * 1.5 - 0.75, // sidoplats som andel av halva bredden
      fart: 0.2 + ((i * 7 + 3) % 5) * 0.035, // varv/s
      fas: (i / 6 + fro) % 1,
      sv: 1.4 + (i % 3) * 0.5, // svajtakt
      sk: 1.05 + (i % 3) * 0.2,
    })
  }

  const gnistor = []
  for (let i = 0; i < 4; i++) {
    const g = new Graphics()
    ritaGnista(g, i % 2 ? 0xffe27a : 0xffffff)
    g.eventMode = 'none'
    rot.addChild(g)
    gnistor.push({ g, dx: ((i * 0.53 + fro * 0.7) % 1) * 1.3 - 0.65, fart: 0.3 + i * 0.05, fas: (i * 0.27 + fro) % 1, tw: 4 + i })
  }

  const ST = []
  for (let i = 0; i < 7; i++) {
    ST.push({
      dx: (((i * 5 + 2) % 7) / 6) * 1.5 - 0.75,
      len: 62 + ((i * 29) % 5) * 14,
      fart: 0.5 + ((i * 17) % 6) * 0.06, // varv/s
      fas: (i / 7 + fro * 0.6) % 1,
      bred: 4.6 + (i % 3) * 1.4,
      vag: 5 + (i % 3) * 3,
    })
  }

  return {
    rot,
    // t = sekunder, k = styrkan på enhörningen (0..1), a = inbländning 0..1 (pelaren föds osynlig).
    uppdatera(t, k = 0, a = 1) {
      if (rot.destroyed) return
      glod.alpha = (0.75 + 0.25 * k) * a
      streck.clear()
      const n = k > 0.2 ? ST.length : ST.length - 2
      for (let i = 0; i < n; i++) {
        const s = ST[i]
        const p = (t * s.fart + s.fas) % 1
        const yh = KOL_BOTTEN - p * hojd // strecket stiger: huvudet uppåt, svansen nedåt
        const x = s.dx * halv + Math.sin(t * 2.2 + s.fas * 9) * s.vag
        const al = (0.7 + 0.3 * k) * a * Math.min(1, p * 6) * Math.min(1, (1 - p) * 4)
        if (al < 0.03) continue
        const x2 = x + Math.sin(t * 2.2 + s.fas * 9 + 1.3) * s.vag
        // Vit underton + färgad kärna: syns både mot ljus dagshimmel och mörk kväll.
        streck.moveTo(x, yh).quadraticCurveTo(x2, yh + s.len * 0.5, x, yh + s.len).stroke({ width: s.bred + 3, color: 0xffffff, alpha: al * 0.55, cap: 'round' })
        streck.moveTo(x, yh).quadraticCurveTo(x2, yh + s.len * 0.5, x, yh + s.len).stroke({ width: s.bred, color: 0x45b8c8, alpha: al * 0.7, cap: 'round' })
      }
      for (const l of lov) {
        const p = (t * l.fart + l.fas) % 1
        l.g.x = l.dx * halv + Math.sin(t * l.sv + l.fas * 7) * 20
        l.g.y = KOL_BOTTEN - 10 - p * (hojd - 10)
        l.g.rotation = Math.sin(t * l.sv * 1.7 + l.fas * 5) * 1.0
        l.g.scale.set(l.sk * (0.85 + 0.2 * Math.sin(t * 3 + l.fas * 11)), l.sk)
        l.g.alpha = a * Math.min(1, p * 7) * Math.min(1, (1 - p) * 5)
      }
      for (const s of gnistor) {
        const p = (t * s.fart + s.fas) % 1
        s.g.x = s.dx * halv + Math.sin(t * 1.6 + s.fas * 6) * 10
        s.g.y = KOL_BOTTEN - 30 - p * (hojd - 30)
        const tw = 0.7 + 0.5 * Math.sin(t * s.tw + s.fas * 13)
        s.g.scale.set(Math.max(0.2, tw) * (0.9 + 0.5 * k))
        s.g.rotation = t * 0.8 + s.fas
        s.g.alpha = a * Math.min(1, p * 8) * Math.min(1, (1 - p) * 5)
      }
    },
    riv() {
      if (!rot.destroyed) rot.destroy({ children: true })
    },
  }
}
