// SNURRORNA — små propellrar bland pinnarna (FYSIKPLAN F1, dag D16 B4).
//
// En snurra är en LÄTT stång (dynamisk matter-kropp) fastnålad i brädet med ett gångjärn
// (`phys.gangjarn`, styvhet 1, damp 0) mitt i en pinnplats. Ett mynt som slår i ena bladet vrider
// den — fysiken avgör hur fort — och sedan kör kullagret ut den: en liten KONSTANT bromsning
// (`g.motor({ fart: 0, maxMoment })`, ett momenttak = Coulomb-friktion) plus matters luftmotstånd.
// Därför vilar den på exakt 0 efter ~1,5–2,5 s i stället för att glida i det oändliga (en ren
// luftbromsning når aldrig noll). Allt tre taken är P0:
//   • MAX_VF   — snabbaste varvtalet. Ett mynt får aldrig slängas ur bild av ett blad; 0,26 rad/steg
//                ≈ 2,5 varv/s ger bladspetsen högst ~7 px/steg.
//   • BROMS    — bromsen är så svag att ett mynt som ligger på bladet alltid vinner och glider av
//                (myntets tyngdmoment är ~100× större): en snurra kan aldrig hålla fast något.
//   • bladets spets går 34 px från närmaste pinnyta i pinngittret (72,4 − 28 − 10) — den kan inte
//                nudda en pinne, och två snurror står minst `MIN_AVST` isär.
import { Container, Graphics } from 'pixi.js'

export const SNURRA = {
  L: 56, // bladets längd (px) — spetsen når 28 px från navet
  T: 11, // bladets tjocklek
  DENSITET: 0.0015, // ~0,9 i massa mot myntets 2,5: tung nog att inte tunnla, lätt nog att snurra av en stöt
  LUFT: 0.01, // matters frictionAir (verkar på vinkelfarten)
  MAX_VF: 0.26, // rad/steg
  BROMS: 0.0016, // rad/steg² konstant kullagerbromsning
  MIN_AVST: 150, // minsta avstånd mellan två snurror (px)
}

// Hur många snurror brädet bär: 1 på 5 rader, 2 på 6, 3 på 7 (taket är 3 — det hör till nivåns pinnrader).
export const snurrAntal = (rader) => Math.max(0, Math.min(3, rader - 4))

// Välj `antal` platser ur kandidaterna ({ x, y }), slumpat, med minst `minAvst` mellan två snurror.
// Ren funktion (rnd injiceras) så en Node-sond kan prova den.
export function valjPlatser(kandidater, antal, rnd = Math.random, minAvst = SNURRA.MIN_AVST) {
  const lista = kandidater.slice()
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  const valda = []
  for (const p of lista) {
    if (valda.length >= antal) break
    if (valda.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minAvst)) valda.push(p)
  }
  return valda
}

// Ritad snurra: tre egna noder (inget är en ruta runt något). `blad` roterar med kroppen, `nav` och
// `skugga` står still. Bladets två halvor har olika färg så att vridningen SYNS.
export function ritaSnurra() {
  const { L, T } = SNURRA
  const skugga = new Graphics().ellipse(2.5, 8, L / 2 + 2, 7).fill({ color: 0x4a3526, alpha: 0.2 })
  skugga.eventMode = 'none'

  const blad = new Container()
  blad.eventMode = 'none'
  const bg = new Graphics()
  bg.roundRect(-L / 2, -T / 2, L, T, T / 2).fill(0xe85d5d).stroke({ width: 2, color: 0x8f3a3a })
  bg.rect(0, -T / 2 + 1, L / 2 - T / 2, T - 2).fill(0x4aa3df)
  bg.circle(L / 2 - T / 2, 0, T / 2 - 1).fill(0x4aa3df)
  bg.roundRect(-L / 2 + 4, -T / 2 + 2, L - 8, 3, 1.5).fill({ color: 0xffffff, alpha: 0.4 })
  bg.circle(-L / 2 + 6, 0, 2.2).fill({ color: 0xffffff, alpha: 0.8 })
  bg.circle(L / 2 - 6, 0, 2.2).fill({ color: 0xffffff, alpha: 0.8 })
  bg.eventMode = 'none'
  blad.addChild(bg)

  const nav = new Graphics()
  nav.circle(0, 0, 9).fill(0xffd35c).stroke({ width: 2.5, color: 0xb88a1d })
  nav.circle(-2.5, -3, 3).fill({ color: 0xffffff, alpha: 0.85 })
  nav.eventMode = 'none'
  return { skugga, blad, nav }
}
