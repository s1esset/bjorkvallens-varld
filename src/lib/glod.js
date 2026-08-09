// ADDITIV GLÖD — ljus som LÄGGER SIG PÅ det som redan finns (LYFTPLAN C4).
//
// `blendMode: 'add'` adderar källans färg till bakgrundens i stället för att ersätta
// den. Skillnaden mot en vanlig halvgenomskinlig cirkel är inte subtil: en normal
// gloss-fläck GRÅDAR det den ligger på (den blandar mot sin egen färg), medan en
// additiv fläck bara kan göra ytan LJUSARE. Det är precis så en låga, en gnista,
// en blixt eller ett neonrör beter sig — de sänder ut ljus, de täcker inte över.
//
// Före den här filen använde ETT spel av 72 additiv blandning (`fyrverkeri`).
//
//   import { glod } from '../../lib/glod.js'
//   const halo = glod({ color: 0xffb24a, size: 180, alpha: 0.55 })
//   halo.position.set(eld.x, eld.y)
//   lager.addChild(halo, eld)        // glöden UNDER föremålet — den är ljuset, inte formen
//
// TEXTUREN RITAS MED CANVAS2D, inte med Pixi Graphics + renderer.generateTexture().
// Skälet är mätt och står i partiklar.js: generateTexture() byter rendermål mitt i en
// bildruta och gav `tom-scen`-fynd i 5 av 7 körningar av hela sviten. Canvas2D rör inte
// GL-tillståndet alls och behöver ingen renderare — arket kan byggas innan appen startat.
//
// EN textur för hela appen, VIT, och färgen sätts med `tint`. Två skäl: en tintad sprite
// batchas ihop med alla andra (noll extra draw calls), och 128×128×4 byte = 64 KB EN gång
// i stället för en radiell FillGradient per färg (se CLAUDE.md — en radiell gradient
// kostar 256× en linjär).
//
// P0/EXIT: filen skapar inga tweens och inga timers. En glöd är en vanlig Sprite som
// rivs med sitt lager. Vill man pulsera den gör man det med feedback.js-hjälparna, som
// redan är exit-säkra.
import { CanvasSource, Rectangle, Sprite, Texture } from 'pixi.js'

// Cellstorlek i atlasarket. 128 räcker: en glöd ÄR en oskärpa, så magnifiering upp mot
// 400 px syns inte som mjukhet utan som just glöd. Hela arket är 256×128 = 128 KB, en gång.
const CELL = 128
const R = CELL / 2

// Avtagandekurvan. Ett linjärt alpha-fall läser som en skiva med suddig kant; exponenten
// gör mitten het och kanten lång, vilket är vad ögat kallar "sken".
const FALL = 2.2

function stopps(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    g.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, FALL).toFixed(4)})`)
  }
  return g
}

// `prick` — den runda glöden. Lågor, gnistor, lyktor, magi, lava.
function ritaPrick(ctx, cx, cy) {
  ctx.fillStyle = stopps(ctx, cx, cy, R)
  ctx.fillRect(cx - R, cy - R, CELL, CELL)
}

// `stjarna` — samma runda kärna PLUS fyra strålar i kors. Det är så ögat läser en
// skarp ljuskälla (bländstjärnan i en lins), och det gör glitter och blixt läsbara
// i stället för att bli suddiga bollar.
function ritaStjarna(ctx, cx, cy) {
  ctx.save()
  ctx.translate(cx, cy)
  // Kärnan mindre än prickens, så strålarna får dominera.
  ctx.fillStyle = stopps(ctx, 0, 0, R * 0.42)
  ctx.fillRect(-R, -R, CELL, CELL)
  // Strålarna ritas som fyra avsmalnande trianglar med egen toning längs sin längd.
  for (let i = 0; i < 4; i++) {
    ctx.save()
    ctx.rotate((i / 4) * Math.PI * 2)
    const lin = ctx.createLinearGradient(0, 0, 0, -R)
    lin.addColorStop(0, 'rgba(255,255,255,0.85)')
    lin.addColorStop(0.35, 'rgba(255,255,255,0.28)')
    lin.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = lin
    ctx.beginPath()
    ctx.moveTo(-R * 0.13, 0)
    ctx.lineTo(0, -R)
    ctx.lineTo(R * 0.13, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

const FORMER = { prick: ritaPrick, stjarna: ritaStjarna }

let _tex = null

// Bygger (en gång) atlasarket och returnerar `{ prick, stjarna }`, eller null i en
// miljö utan DOM (sonder som kör kamera/rep i rena Node).
export function glodTexturer() {
  if (_tex) return _tex
  if (typeof document === 'undefined') return null
  try {
    const namn = Object.keys(FORMER)
    const canvas = document.createElement('canvas')
    canvas.width = CELL * namn.length
    canvas.height = CELL
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    namn.forEach((n, i) => FORMER[n](ctx, i * CELL + R, R))

    const source = new CanvasSource({ resource: canvas, scaleMode: 'linear' })
    const ut = {}
    namn.forEach((n, i) => {
      ut[n] = new Texture({
        source,
        frame: new Rectangle(i * CELL, 0, CELL, CELL),
        defaultAnchor: { x: 0.5, y: 0.5 },
        label: `glod:${n}`,
      })
    })
    _tex = ut
    return _tex
  } catch {
    return null
  }
}

/**
 * En additiv glödfläck som Sprite.
 *
 * Returnerar null om texturvägen inte är tillgänglig — anroparen ska då hoppa över
 * glöden helt, aldrig rita en opak cirkel i stället (det vore en grå fläck).
 *
 * @param {object} o
 *   namn   'prick' (rund) · 'stjarna' (rund + fyra strålar)
 *   color  0xRRGGBB — glödens färg. VÄLJ LJUST: additiv blandning kan bara addera,
 *          så en mörk färg ger nästan ingenting.
 *   size   glödens DIAMETER i px
 *   alpha  styrka 0..1
 *   ratio  bredd/höjd (2 = en liggande, avlång glöd — bra för en list eller en horisont)
 */
export function glod({ namn = 'prick', color = 0xffffff, size = 120, alpha = 0.6, ratio = 1 } = {}) {
  const t = glodTexturer()
  if (!t) return null
  const s = new Sprite(t[namn] || t.prick)
  s.anchor.set(0.5)
  s.width = size * ratio
  s.height = size
  s.tint = color
  s.alpha = alpha
  s.blendMode = 'add'
  s.eventMode = 'none'
  return s
}

/**
 * Lägg en glöd BAKOM ett redan ritat föremål, i samma förälder och på samma plats.
 *
 * Det är nästan alltid rätt ordning: glöden är ljuset föremålet sänder ut, så den ska
 * ligga under formen och lysa ut runt kanterna. Ligger den ovanpå bleks föremålets egna
 * detaljer bort.
 *
 * Returnerar glöd-spriten (eller null). Den är ett vanligt syskon och rivs med föräldern.
 */
export function glodBakom(mal, o = {}) {
  const far = mal?.parent
  if (!far || far.destroyed) return null
  const g = glod(o)
  if (!g) return null
  g.position.set(mal.x, mal.y)
  far.addChildAt(g, far.getChildIndex(mal))
  return g
}
