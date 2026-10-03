// Vattenvägen — barnet drar och vrider rörbitar på ett rutnät så vattnet från
// kranen hittar hela vägen ner till Elviras törstiga mugg och plantan blommar.
// Pyssel i Where's My Water-anda men helt förlåtande: varje rör som inte kopplar
// "sitter bara där", läckage = en riktig stråle som rinner ut, och mjuk auto-hjälp
// garanterar att banan alltid går att klara. Kontroller: placering + rotation +
// lyfta bort sten (massor av agens). Avbildad person: bara Elvira (mugg-ägaren).
//
// VATTNET ÄR RIKTIG VÄTSKA (lib/vatska.js, SPH) på de tre ställen där det SYNS:
// kranens stråle, läckan ur sista öppna porten, och muggen som fylls på riktigt.
// Inuti rören simuleras ingenting — kanalen är 26 px bred och röret ogenomskinligt,
// så en simulering där hade kostat allt och synts noll. I stället SUGS vattnet in i
// källrörets mynning och kommer ut i andra änden efter en restid som växer med
// vägens längd; kanal-overlayen (_paintFlow) visar färden. Målet läses ur vätskan:
// muggens fyllnadsgrad är vattenYTANS höjd, inte en uppräknad siffra.
//
// FÖRGRENING (bana 5, 7, 9 …): ett T-rör delar vattnet åt två muggar med var sin planta.
// Vägen är en TRÄD, inte en kedja — `_traverse` flödesfyller från kranen och samlar alla
// muggar som nåtts plus alla öppna portar (läckor, högst tre). Banan är klar när båda
// plantorna blommar; en full mugg slutar ta emot (annars svämmar den över medan den andra
// fylls).
//
// SCENEN: ett kaklat badrum med en trähylla. Brunnarna är nedsänkta och mörka, rören är
// färgade plaströr (en färg per typ) med egen skugga, och rörbitarna i lådan står på hyllan
// som riktiga föremål — ingen panel, ingen halo.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, puff, sparkle, ripple, burst, floatText, breathe, liv, squash, wiggle, kvittera } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { FluidWorld, FluidView, FLUIDS } from '../../lib/vatska.js'
import { COLORS, DESIGN_W, DESIGN_H, shade } from '../../lib/theme.js'
import { cylinderFill, sphereFill, topLightFill, verticalFill, verticalFillAlpha, bage } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { Vev } from '../../lib/vev.js'
import { Vattenhjul, ritaHjul } from './hjul.js'

// --- rutnäts-geometri (designkoordinater 1280×720) ---
const CELL = 120
const GRIDY0 = 200 // översta radens center-y
// Rutnätet centreras efter antal kolumner — banorna växer i BREDD, aldrig i höjd:
// en fjärde rad trycker muggen till y≈690 där hyllan och skärmkanten äter den.
const gridX0 = (cols) => 640 - ((cols - 1) * CELL) / 2

// Hyllan (scenens golv): rörbitarna och muggarna står på den.
const SHELF_Y = 606
const STAMP_Y = 650 // rörbitarnas läge i lådan (mitt på hyllans ovansida)

// --- muggens mått (relativt muggens center) ---
const MUG_FLOOR = 78 // inre botten
const MUG_LINE = -44 // den streckade mållinjen
const HW_ONE = 62 // inre halvbredd, en mugg
const HW_TWO = 50 // smalare när två muggar delar scenen (färre partiklar, plats för lådan)

// --- ventilen (G8: lib/vev.js) — sista steget: barnet vrider på vattnet ---
// Sitter på samma rad som kranen, 150 px åt höger om pipen (design 1280×720). Hjulets träffyta
// (cirkel, radie 60 = 120 px) slutar 24 px ovanför rutnätets översta brunnar (y 140), så den aldrig
// delar yta med en brunn. Autotestets tryck når bara x ≤ 950, y ≤ 600: ventilen på bana 1 ligger
// på x = 730; på sexkolumnsbanor med kranen i kolumn 4 eller 5 hamnar den över 950.
const VENTIL_DX = 150
const VENTIL_MAX_X = 1040 // hjulets mitt; träffcirkeln (60) + 24 px håller sig från ljudknappens halo
const VENTIL_Y = 56
const VENTIL_HIT = 60
// Så mycket MEDURS rotation (rad) som behövs för att vattnet ska vara fullt på. Fyra knuffar
// (ett kvarts varv var) är ett helt varv — alltså lite mer än nog.
const OPPEN_VINKEL = 0.9 * 2 * Math.PI

// --- vattenhjulet (F6a: hjul.js) — hänger under kranens rör, strålen snurrar det ---
// Navet sitter 38 px till höger om strålens mittlinje, så skovelspetsarna (radie 33) sträcker sig 5 px in i
// strålen (som syns ~±12 px bred) och bara snuddar den: närmare (24–30 px) dämmer hjulet upp vattnet på en
// vågrät skovel, längre bort (≥ 42) når strålen inte skovlarna. Höjden håller hjulets underkant ovanför
// rutnätets översta brunnar (y 142) och dess topp under ventilens rör (y 56). Mätt i
// `scripts/_dag-vattenvagen-hjul.mjs`.
const HJUL_DX = 38
const HJUL_Y = 108

// --- rör-modell: portar = öppna sidor (T=topp, R=höger, B=botten, L=vänster) ---
const ROT = { T: 'R', R: 'B', B: 'L', L: 'T' } // medurs 90°
const OPP = { T: 'B', B: 'T', L: 'R', R: 'L' }
const BASE = { rak: ['T', 'B'], boj: ['T', 'R'], tratt: ['B', 'L', 'R'] }
const TYPE_ORDER = ['rak', 'boj', 'tratt']
// En färg per rörtyp: barnet ser i lådan vilken bit som är vilken, och färgerna står mot
// den mörka kaklade väggen (orange/gul/lila mot blågrönt).
const PIPE_COLOR = { rak: 0xff9b2f, boj: 0xffd23f, tratt: 0xc870f0 }
const CHANNEL_DRY = 0x143248 // torr kanal (mörk skåra)
const CHANNEL_WET = 0x4fc3f7 // vatten i kanalen
const WELL_SHADOW = 0x04121b // skugga i en mörk brunn (ogenomskinlig — se _makePipe)
const SHELF_SHADOW = 0x6b3f1c // skugga på hyllan

function portsFor(type, rot) {
  let ps = BASE[type] || []
  const n = (((rot | 0) % 4) + 4) % 4
  for (let i = 0; i < n; i++) ps = ps.map((d) => ROT[d])
  return ps
}
// Hitta {type,rot} vars portar exakt = de önskade (två portar = rak/böj, tre = T-rör).
function pipeForPorts(ports) {
  const want = [...ports].sort().join('')
  for (const type of TYPE_ORDER) {
    if (BASE[type].length !== ports.length) continue
    for (let r = 0; r < 4; r++) {
      if (portsFor(type, r).slice().sort().join('') === want) return { type, rot: r }
    }
  }
  return { type: 'rak', rot: 0 }
}
const opposite = (d) => OPP[d]
function neighborOf(c, dir) {
  if (dir === 'T') return { col: c.col, row: c.row - 1 }
  if (dir === 'B') return { col: c.col, row: c.row + 1 }
  if (dir === 'L') return { col: c.col - 1, row: c.row }
  return { col: c.col + 1, row: c.row }
}
function dirBetween(a, b) {
  if (b.col > a.col) return 'R'
  if (b.col < a.col) return 'L'
  if (b.row > a.row) return 'B'
  return 'T'
}
function cellCenter(x0, col, row) {
  return { x: x0 + col * CELL, y: GRIDY0 + row * CELL }
}
// Yttre kant på en port, dit vattnet kommer ut ur ett rör, + farten det får med sig.
const PORT_OUT = {
  T: { dx: 0, dy: -62, vx: 0, vy: -1.6 },
  B: { dx: 0, dy: 62, vx: 0, vy: 2.6 },
  L: { dx: -62, dy: 0, vx: -2.6, vy: 0.6 },
  R: { dx: 62, dy: 0, vx: 2.6, vy: 0.6 },
}

// --- rörbitens ritning ---
const isVertical = (d) => d === 'T' || d === 'B'
const isStraight = (dirs) => dirs.length === 2 && OPP[dirs[0]] === dirs[1]

function armRect(dir, half, th) {
  if (dir === 'T') return [-th / 2, -half, th, half + 6]
  if (dir === 'B') return [-th / 2, -6, th, half + 6]
  if (dir === 'L') return [-half, -th / 2, half + 6, th]
  return [-6, -th / 2, half + 6, th] // R
}
// Kopplingsringen i varje rörände (något bredare än röret).
function flangeRect(dir) {
  if (dir === 'T') return [-33, -62, 66, 14]
  if (dir === 'B') return [-33, 48, 66, 14]
  if (dir === 'L') return [-62, -33, 14, 66]
  return [48, -33, 14, 66] // R
}

// Rörbitens yttre silhuett i EN färg. Används som mörk kontur under själva röret OCH som
// skugga (då i hyllans/brunnens egen mörka ton). Ogenomskinlig med flit: en halvgenomskinlig
// skugga ritad som flera överlappande former blir mörkare där de överlappar.
function drawPipeSilhouette(g, dirs, color) {
  for (const d of dirs) {
    const [x, y, w, h] = armRect(d, 61, 62)
    g.roundRect(x, y, w, h, 12).fill(color)
    const [fx, fy, fw, fh] = flangeRect(d)
    g.roundRect(fx - 1, fy - 1, fw + 2, fh + 2, 6).fill(color)
  }
  if (!isStraight(dirs)) g.circle(0, 0, 31).fill(color)
}

// Ett färgat plaströr med volym: cylinder-toning tvärs över varje arm (ljus i mitten, mörk
// mot kanterna), kopplingsringar i ändarna och en mörk skåra som vattnet sedan fyller.
// Toningen är symmetrisk, så bitens ljus ser likadan ut vridet åt alla fyra håll.
function drawPipe(g, dirs, color) {
  const straight = isStraight(dirs)
  drawPipeSilhouette(g, dirs, shade(color, 0.55))
  for (const d of dirs) {
    const [x, y, w, h] = armRect(d, 58, 56)
    g.roundRect(x, y, w, h, 10).fill(cylinderFill(color, { axis: isVertical(d) ? 'y' : 'x' }))
  }
  // Knuten behövs bara i en böj/T där armarna lämnar ett hörn öppet; i ett rakt rör hade den
  // blivit en mörk ring mitt på röret.
  if (!straight) {
    g.circle(0, 0, 28).fill(sphereFill(color, { lightX: 0.5, lightY: 0.42, spread: 0.6, highlight: 0.3, dark: 0.2 }))
  }
  for (const d of dirs) {
    const [fx, fy, fw, fh] = flangeRect(d)
    g.roundRect(fx, fy, fw, fh, 5)
      .fill(cylinderFill(shade(color, 0.18), { axis: isVertical(d) ? 'y' : 'x' }))
      .stroke({ width: 2, color: shade(color, 0.55) })
  }
  drawChannel(g, dirs, CHANNEL_DRY)
}

function drawChannel(g, dirs, color) {
  for (const d of dirs) {
    const [x, y, w, h] = armRect(d, 58, 26)
    g.roundRect(x, y, w, h, 8).fill(color)
  }
  g.circle(0, 0, 14).fill(color)
}

// ENBART innerkanalen i vattenblått — läggs som overlay ovanpå röret och tonas in (alpha)
// allteftersom vattnet passerar → barnet SER flödet hitta vägen.
function drawPipeWet(g, dirs) {
  drawChannel(g, dirs, CHANNEL_WET)
}

// --- scenen: kaklat badrum + trähylla ---
function makeBackdrop(W, H) {
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false
  // Mättad blågrön vägg med bokeh och vinjett (scenens eget tema-objekt, inte en egen
  // gradientbakning). Kaklet läggs ovanpå.
  root.addChild(createScene({ top: 0x164a66, bottom: 0x2b7f9b, bokeh: 6 }, { width: W, height: H, ground: false }))

  const d = new Graphics()
  d.eventMode = 'none'
  const X0 = -BLEED_X - 120
  const X1 = W + BLEED_X
  const TW = 120
  const TH = 60
  const GROUT = 0x072433
  const Y0 = -BLEED_Y
  // Kakel i halvstens-förband. Glansen varierar deterministiskt från bricka till bricka så
  // väggen inte läser som en jämn yta; fogarna är tunna och svaga så rören förblir läsbara.
  for (let r = 0; Y0 + r * TH < SHELF_Y; r++) {
    const y = Y0 + r * TH
    const off = (r % 2) * (TW / 2)
    for (let i = 0, x = X0 - off; x < X1; i++, x += TW) {
      const a = 0.02 + ((r * 7 + i * 13) % 5) * 0.012
      d.roundRect(x + 6, y + 7, TW - 12, TH - 13, 9).fill({ color: 0xffffff, alpha: a })
    }
    d.rect(X0, y, X1 - X0, 3).fill({ color: GROUT, alpha: 0.42 })
    for (let x = X0 - off; x < X1; x += TW) d.rect(x, y + 3, 3, TH - 3).fill({ color: GROUT, alpha: 0.42 })
  }
  // Takskugga överst och mörkare vägg närmast hyllan (djup).
  d.rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, BLEED_Y + 210).fill(verticalFillAlpha(0x010b12, 0x010b12, 0.5, 0))
  d.rect(-BLEED_X, SHELF_Y - 46, W + 2 * BLEED_X, 46).fill(verticalFillAlpha(0x010b12, 0x010b12, 0, 0.42))

  // Trähyllan: ovansida (ljus), framkant (mörk), överkantsglans, plankfogar.
  const SHELF_TOP_H = 96
  d.rect(-BLEED_X, SHELF_Y, W + 2 * BLEED_X, SHELF_TOP_H).fill(verticalFill(0xdba463, 0xb97f43))
  d.rect(-BLEED_X, SHELF_Y + SHELF_TOP_H, W + 2 * BLEED_X, H + BLEED_Y - SHELF_Y - SHELF_TOP_H).fill(verticalFill(0x8c562a, 0x5b3516))
  d.rect(-BLEED_X, SHELF_Y, W + 2 * BLEED_X, 4).fill({ color: 0xffe9bd, alpha: 0.7 })
  d.rect(-BLEED_X, SHELF_Y + SHELF_TOP_H - 3, W + 2 * BLEED_X, 3).fill({ color: 0x5b3516, alpha: 0.5 })
  for (let x = X0 + 40; x < X1; x += 290) d.rect(x, SHELF_Y + 4, 3, SHELF_TOP_H - 7).fill({ color: 0x5b3516, alpha: 0.16 })
  for (let k = 0; k < 2; k++) d.rect(-BLEED_X, SHELF_Y + 30 + k * 30, W + 2 * BLEED_X, 2).fill({ color: 0x5b3516, alpha: 0.1 })
  root.addChild(d)
  return root
}

// Elvira — den törstiga mottagaren som väntar bredvid muggen (helt programmatisk,
// speglar kid-figuren i bajs-och-kiss). Symmetrisk, så ingen spegling behövs.
// Avbildad person: ENDAST Elvira (se CLAUDE.md CHARACTERS).
function makeElvira() {
  const c = new Container()
  const skin = 0xffe0bd
  const shirt = COLORS.pink
  const shirtDark = 0xe87da8
  const hair = 0xf4cf63 // Elvira är blond (ägarens önskemål)

  // Skugga på hyllan.
  const sh = new Graphics().ellipse(0, 96, 54, 12).fill({ color: 0x000000, alpha: 0.3 })
  sh.eventMode = 'none'
  c.addChild(sh)

  // Tofsar bakom huvudet.
  c.addChild(new Graphics().circle(-40, -56, 16).fill(hair).circle(40, -56, 16).fill(hair))

  // Ben + skor.
  c.addChild(
    new Graphics()
      .roundRect(-24, 44, 18, 44, 8).fill(0x5a6b8c)
      .roundRect(6, 44, 18, 44, 8).fill(0x5a6b8c)
      .roundRect(-28, 82, 26, 16, 8).fill(0x3a3a3a)
      .roundRect(2, 82, 26, 16, 8).fill(0x3a3a3a)
  )

  // Klänning.
  c.addChild(
    new Graphics()
      .moveTo(-28, -22).lineTo(28, -22).lineTo(46, 56).lineTo(-46, 56).closePath()
      .fill(shirt).stroke({ width: 3, color: shirtDark })
  )

  // Armar sträcker sig framåt/nedåt (mot muggen) + händer.
  c.addChild(
    new Graphics()
      .roundRect(-52, -8, 20, 42, 10).fill(shirt)
      .roundRect(32, -8, 20, 42, 10).fill(shirt)
      .circle(-42, 36, 10).fill(skin)
      .circle(42, 36, 10).fill(skin)
  )

  // Huvud + ansikte.
  const head = new Graphics().circle(0, -56, 34).fill(skin)
  head.circle(-12, -58, 4).fill(0x3a2a1a) // ögon
  head.circle(12, -58, 4).fill(0x3a2a1a)
  head.circle(-20, -48, 6).fill({ color: 0xffb0b0, alpha: 0.7 }) // kinder
  head.circle(20, -48, 6).fill({ color: 0xffb0b0, alpha: 0.7 })
  c.addChild(head)
  const mouth = bage(new Graphics(), 0, -50, 13, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: 0x9a5b3b })
  c.addChild(mouth)
  c._mouth = mouth

  // Lugg + rosett.
  c.addChild(new Graphics().roundRect(-32, -86, 64, 22, 12).fill(hair))
  c.addChild(
    new Graphics()
      .circle(-11, -90, 11).fill(COLORS.red)
      .circle(11, -90, 11).fill(COLORS.red)
      .circle(0, -90, 6).fill(0xd64a4a)
  )
  return c
}

// Ett blad som pekar åt +x (speglas med scale.x). Toningen ligger lodrätt i bladets egen ruta.
function makeLeaf(len, color) {
  const g = new Graphics()
  g.moveTo(0, 0)
    .quadraticCurveTo(len * 0.45, -len * 0.42, len, 0)
    .quadraticCurveTo(len * 0.45, len * 0.42, 0, 0)
    .fill(topLightFill(color))
    .stroke({ width: 2.5, color: shade(color, 0.4) })
  g.moveTo(3, 0).lineTo(len * 0.8, 0).stroke({ width: 2, color: shade(color, 0.35), alpha: 0.7 })
  g.eventMode = 'none'
  return g
}

// Ventilen: ett RITAT röd handhjul på ett mässingsrör som leder bort mot kranen. Roten ligger i
// ventilens mitt (vx, vy). `wrap` bär vilo-guppningen och tryck-kläm (ett barn — träffytan sitter på
// en egen yta), `hjul` är det som vrids av Vev (rotation = vinkeln, aldrig modulo). Ett gult handtag
// är det enda som skiljer hjulets fyra sidor åt, så man SER att det snurrar.
function makeVentil(vx, vy, sourceX) {
  const BRASS = 0xe0a93a
  const brassEdge = shade(BRASS, 0.5)
  const ROD = 0xe8523f
  const rodEdge = 0x8f2a20
  const root = new Container()
  root.position.set(vx, vy)
  root.eventMode = 'none'

  // Rör mot kranen (bakom hjulet) och en axelkrage. Sitter ventilen till VÄNSTER om kranen
  // (kranen står längst till höger) speglas röret — ritningen är densamma.
  const x0 = -(Math.abs(sourceX - vx) + 10)
  const stub = new Graphics()
  stub.scale.x = vx < sourceX ? -1 : 1
  stub.roundRect(x0, -22, -x0 - 10, 22, 8).fill(cylinderFill(BRASS, { axis: 'x' })).stroke({ width: 4, color: brassEdge })
  stub.roundRect(-92, -29, 16, 36, 6).fill(cylinderFill(shade(BRASS, 0.12), { axis: 'y' })).stroke({ width: 4, color: brassEdge })
  const skugga = new Graphics().ellipse(4, 12, 46, 44).fill({ color: 0x000000, alpha: 0.22 })
  const krage = new Graphics().circle(0, 0, 25).fill(sphereFill(BRASS, { lightX: 0.4, lightY: 0.36 })).stroke({ width: 4, color: brassEdge })
  root.addChild(stub, skugga, krage)

  const wrap = new Container()
  const hjul = new Container()
  const g = new Graphics()
  // Ekrar (mörk kant under, röd ovanpå), ring, handtag och nav.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    g.moveTo(0, 0).lineTo(Math.cos(a) * 30, Math.sin(a) * 30).stroke({ width: 13, color: rodEdge, cap: 'round' })
  }
  g.circle(0, 0, 29).stroke({ width: 15, color: rodEdge })
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    g.moveTo(0, 0).lineTo(Math.cos(a) * 30, Math.sin(a) * 30).stroke({ width: 7, color: ROD, cap: 'round' })
  }
  g.circle(0, 0, 29).stroke({ width: 9, color: ROD })
  g.circle(0, 0, 29).stroke({ width: 3, color: 0xffa191, alpha: 0.7 })
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const col = i === 0 ? COLORS.yellow : 0xff7b6b
    g.circle(Math.cos(a) * 38, Math.sin(a) * 38, 9).fill(sphereFill(col)).stroke({ width: 3, color: i === 0 ? 0xd8a520 : rodEdge })
  }
  g.circle(0, 0, 13).fill(sphereFill(0xff7b6b)).stroke({ width: 3.5, color: rodEdge })
  g.circle(0, 0, 5).fill(shade(BRASS, 0.15))
  g.eventMode = 'none'
  hjul.addChild(g)
  hjul.eventMode = 'none'
  wrap.addChild(hjul)
  wrap.eventMode = 'none'
  root.addChild(wrap)
  return { root, wrap, hjul }
}

// Hjulklapparnas toner: stämd pentatonisk skala (C-dur), lågt och mjukt.
const HJUL_TONER = [523, 587, 659, 784, 880]

export default {
  id: 'vattenvagen',
  titleSv: 'Vattenvägen',
  icon: '💧',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'vattenvagen',
  voiceIntro: 'Lägg rören så vattnet rinner ner till muggen!',

  init(ctx) {
    this._alive = true
    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Kaklat badrum som FÖRSTA barn (full bleed — ritat över hela den synliga ytan).
    this._root.addChild(makeBackdrop(ctx.width, ctx.height))

    // Per-bana-bräde (innehållet rensas mellan banor; lagren själva ligger kvar,
    // för vätskelagret får inte rivas med banan).
    // Osynlig tap-fångare under brädet: ett tryck på väggen, en tom brunn eller muggen ger
    // ett mjukt ljud + en liten ring där fingret var (P0: varje pekning svarar).
    const fangare = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, DESIGN_W + 2 * BLEED_X, DESIGN_H + 2 * BLEED_Y)
      .fill({ color: 0x000000, alpha: 0 })
    fangare.eventMode = 'static'
    fangare.on('pointertap', (e) => {
      if (!this._alive) return
      const p = this._root.toLocal(e.global)
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio, { color: 0x9fdcf5 })
      this._stotaHjul(ctx, p) // ett tryck på väggen vid hjulet knuffar det
    })
    this._root.addChild(fangare)

    this._board = new Container()
    this._root.addChild(this._board)

    // Lager-ordning: rutor + muggarnas baksida → rör → VÄTSKA → rekvisita (mugg, kran, Elvira)
    // → glöd → rörbitarna i lådan. Vätskan ligger framför rören (en läcka ska synas) men
    // bakom muggen, så muggens vatten ses GENOM glaset.
    this._gridLayer = new Container()
    this._pipeLayer = new Container()
    this._board.addChild(this._gridLayer, this._pipeLayer)

    this._fluid = new FluidWorld({
      // En mugg rymmer ~220 partiklar upp till mållinjen (~180 i den smalare tvåmuggsbanan),
      // och strålarna lever ovanpå det. Taket måste ligga klart över summan: när det nås
      // återanvänds den ÄLDSTA partikeln — alltså vattnet som redan ligger stilla i muggen.
      // Uppmätt topp med en mugg: 260. Två muggar + stråle + läckor: ~450.
      max: 480,
      radius: 22,
      gravityY: 0.5,
      rho0: FLUIDS.vatten.rho0,
      sigma: FLUIDS.vatten.sigma,
      beta: FLUIDS.vatten.beta,
      restitution: 0.06,
      wallFriction: 0.3,
      // Inga världsväggar: spill ska rinna ur bild och städas av _cull, inte samlas
      // i en pöl bakom hyllan där ingen ser den.
      walls: { left: false, right: false, bottom: false, top: false },
      bounds: { left: -160, right: DESIGN_W + 160, top: -160, bottom: DESIGN_H + 140 },
    })
    // Tröskel och suddning är satta för en STRÅLE, inte för ett fyllt glas: en
    // fallande stråle är smal, och med saftbarens värden (blur 9, tröskel 0.42)
    // hamnar den under tröskeln och ritas i kantfärgen — nästan vit, mot en
    // ljusblå himmel = osynlig. Uppmätt i _vatskeprobe.mjs.
    this._fluidView = new FluidView(this._board, this._fluid, {
      color: FLUIDS.vatten.color,
      edge: 0xc9efff,
      alpha: FLUIDS.vatten.alpha,
      blobScale: 1.25,
      threshold: 0.34,
      soft: 0.1,
      blur: 6,
      quality: 2,
      resolution: 0.5,
      // Vattnet håller sig till rutnätets bredd — filtret behöver inte hela skärmen.
      area: new Rectangle(180, 40, 920, 680),
    })
    this._fluidView.layer.eventMode = 'none'
    this._fluidView.layer.interactiveChildren = false

    this._propLayer = new Container()
    // Ventilens träffyta (Vev) — egen rot så ett släpp når den vart fingret än lyfts (K3).
    this._ventilLayer = new Container()
    this._glowLayer = new Container()
    this._glowLayer.eventMode = 'none'
    this._trayLayer = new Container()
    this._board.addChild(this._propLayer, this._ventilLayer, this._glowLayer, this._trayLayer)

    this._drag = new DragController({ space: this._board, services: ctx.services })

    // Tillstånd
    this._pipes = []
    this._stones = []
    this._mugs = []
    this._livs = [] // vilo-guppningar (liv) — egna tweens som killTweensOf inte når
    this._glow = null
    this._connected = false // ALLA muggar har vatten på väg
    this._reachedN = 0
    this._resolving = false
    this._idle = 0
    this._hintShown = false
    this._spawnAcc = 0
    this._clock = 0
    this._mounted = false
    this._queue = [] // vatten på väg genom rören: tidpunkt då droppen kommer ut
    this._exits = [] // var vattnet kommer ut just nu (muggar och läckor)
    this._vev = null // ventilens rotationsgrepp (lib/vev.js)
    this._ventil = null // { root, wrap, hjul }
    this._oppen = 0 // hur öppen kranen är, 0–1 (bara uppåt: medurs rotation räknas, aldrig tillbaka)
    this._framat = 0 // summerad MEDURS rotation (rad) sedan banan började
    this._vPrev = 0
    this._paPa = false // vattnet har satts på (ventilen öppnad nog)
    this._ventilHint = null
    this._klickT = 0
    this._hjul = null // vattenhjulet { fys, view, rot, wrap }
    this._hjulKlickT = 0

    this._level = Math.max(1, ctx.progress.get().highestLevel | 0)

    // Idle-recue nollställs vid varje pekning någonstans på brädet.
    this._board.eventMode = 'static'
    this._resetIdle = () => {
      this._idle = 0
      this._hintShown = false
      this._clearGlow()
      // Pilen vid ventilen står kvar så länge den gäller: trycket som fullbordade vägen
      // kommer hit EFTER att pilen tändes, och skulle annars släcka den direkt.
      if (!(this._connected && !this._paPa)) this._clearVentilHint()
    }
    this._board.on('pointerdown', this._resetIdle)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    this._buildLevel(ctx, this._level)
  },

  mount(ctx) {
    this._mounted = true
    if (this._mugs.length > 1) ctx.services.voice.say('Lägg rören så vattnet rinner ner till båda muggarna!')
    else ctx.services.voice.say(this.voiceIntro)
  },

  // ---- bana ----
  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._level = Math.max(1, level)

    // Städa förra banan (lagren återanvänds — vätskelagret får inte rivas).
    this._drag.clear()
    this._clearGlow()
    this._clearVentilHint()
    this._killAll()
    this._rivHjul()
    this._vev?.destroy() // lyssnarna av FÖRE ytan rivs
    this._vev = null
    this._ventil = null
    this._oppen = 0
    this._framat = 0
    this._vPrev = 0
    this._paPa = false
    this._elvira = null
    for (const l of [this._gridLayer, this._pipeLayer, this._propLayer, this._ventilLayer, this._glowLayer, this._trayLayer]) {
      l.removeChildren().forEach((o) => o.destroy({ children: true }))
    }
    this._pipes = []
    this._stones = []
    this._mugs = []
    this._fluid.clear()
    this._fluid.clearColliders()
    this._queue = []
    this._exits = []
    this._reachedN = 0

    // Planera en garanterat lösbar bana.
    const plan = this._planLevel(this._level)
    this._cols = plan.cols
    this._rows = plan.rows
    this._sourceCol = plan.sourceCol

    // Lösningen är ett TRÄD av celler med sina portar (en kedja på de enkla banorna).
    this._solution = this._generateSolution(plan)

    // Förplacera BARA käll-biten (index 0) + mugg-bitarna (nedersta raden) — barnet bygger
    // HELA resten av ledningen själv (mer agens; docs §4 "fler tomma celler, färre förplacerade").
    const isFixed = (s, i) => i === 0 || s.row === this._rows - 1

    // Käll-/mugg-koordinater.
    this._gx0 = gridX0(this._cols)
    this._lastRowY = GRIDY0 + (this._rows - 1) * CELL
    this._sourceX = cellCenter(this._gx0, this._sourceCol, 0).x
    this._mugY = this._lastRowY + 145

    // Rutnätsceller + drop-mål. Brunnarna är NEDSÄNKTA: ljus ram, mörk botten med skugga från
    // överkanten — då står rören ut mot dem i stället för att flyta i vitt alfa.
    this._grid = []
    for (let r = 0; r < this._rows; r++) {
      const row = []
      for (let c = 0; c < this._cols; c++) {
        const center = cellCenter(this._gx0, c, r)
        const cell = { col: c, row: r, x: center.x, y: center.y, pipe: null, stone: null }
        const well = new Container()
        well.eventMode = 'none'
        well.addChild(
          new Graphics().roundRect(-58, -58, 116, 116, 20).fill(0x3c8fb0).stroke({ width: 3, color: 0x0b2c40 }),
          new Graphics().roundRect(-51, -51, 102, 102, 14).fill(verticalFill(0x051927, 0x134560)),
          new Graphics().roundRect(-49, -49, 98, 20, 10).fill({ color: 0x000000, alpha: 0.3 }),
          new Graphics().roundRect(-44, 47, 88, 3, 1.5).fill({ color: 0xffffff, alpha: 0.16 })
        )
        well.children.forEach((g) => { g.eventMode = 'none' })
        const view = new Container()
        view.position.set(center.x, center.y)
        view.addChild(well)
        view.eventMode = 'static'
        view.cursor = 'pointer'
        view.hitArea = new Rectangle(-58, -58, 116, 116)
        this._gridLayer.addChild(view)
        cell.view = view
        const trec = this._drag.addTarget(view, () => !cell.pipe && !cell.stone, { hitRadius: 110 })
        trec.cell = cell
        row.push(cell)
      }
      this._grid.push(row)
    }

    // Ventilen (G8): ett rött handhjul på kranens rad. Ritas FÖRE kranen så röret tar slut bakom den.
    this._buildVentil(ctx)

    // Kran + pip. RITAD mässingskran (vägghållare, böjt rör, pip och rött vred).
    const BRASS = 0xe0a93a
    const brassEdge = shade(BRASS, 0.5)
    const tap = new Graphics()
    tap.roundRect(-34, -34, 26, 68, 8).fill(cylinderFill(BRASS, { axis: 'y' })).stroke({ width: 4, color: brassEdge }) // vägghållare
    tap.roundRect(-8, -14, 44, 18, 8).fill(cylinderFill(BRASS, { axis: 'x' })).stroke({ width: 4, color: brassEdge }) // horisontellt rör
    tap.roundRect(26, -6, 18, 32, 6).fill(cylinderFill(BRASS, { axis: 'y' })).stroke({ width: 4, color: brassEdge }) // nedåtpip
    tap.roundRect(-2, -42, 30, 12, 6).fill(topLightFill(0xe8523f)).stroke({ width: 4, color: 0x8f2a20 }) // vred
    tap.circle(13, -36, 9).fill(sphereFill(0xff7b6b)).stroke({ width: 4, color: 0x8f2a20 })
    // Kranen sitter så högt att strålen SYNS innan den går in i röret, och pipen
    // (lokalt x 26..44, skala 1.35) centreras över källkolumnen så vattnet kommer
    // ur pipen och inte bredvid den.
    tap.position.set(this._sourceX - 47, GRIDY0 - 142)
    tap.scale.set(1.35)
    tap.eventMode = 'none'
    this._propLayer.addChild(tap)
    this._tapY = GRIDY0 - 112 // pipens mynning: där vattnet föds
    this._byggHjul(ctx)

    // Muggar + plantor (mål). Två muggar när vägen förgrenas.
    const two = plan.mugCols.length > 1
    const hw = two ? HW_TWO : HW_ONE
    plan.mugCols.forEach((col, idx) => {
      const x = cellCenter(this._gx0, col, this._rows - 1).x
      // Handtaget vetter inåt (mot mitten/lådan), plantan lutar åt andra hållet.
      const handle = two ? (idx === 0 ? 1 : -1) : x >= 640 ? -1 : 1
      const m = { idx, col, x, y: this._mugY, hw, W: hw + 13, handle, lean: -handle, done: false, connected: false, fill: 0, steg: 0 }
      this._mugs.push(m)
      this._buildMug(m)
    })

    // Elvira väntar törstig BREDVID muggen (mot närmaste skärmkant så hon inte skymmer
    // rutnätet; vid två muggar står hon utanför den vänstra). Hon "andas" (lever) och
    // jublar/dricker när vattnet kommer.
    this._elvira = makeElvira()
    const ey = Math.min(this._mugY, 560)
    const first = this._mugs[0]
    const ex = two
      ? Math.max(190, first.x - 150)
      : Math.max(190, Math.min(1105, first.x + (first.x >= 640 ? 1 : -1) * 150))
    this._elvira.position.set(ex, ey)
    this._elvira.scale.set(0.78)
    this._elvira.eventMode = 'none'
    this._propLayer.addChild(this._elvira)
    // Lugn "andning" så hon känns levande (breathe multiplicerar basskalan 0.78).
    this._elviraBreath = breathe(this._elvira, { scale: 1.03, duration: 1.4 })

    // Förplacerade rör (rätt typ + rotation → kopplar redan).
    this._solution.forEach((s, i) => {
      if (!isFixed(s, i)) return
      const cell = this._cellAt(s.col, s.row)
      if (cell) this._placePipeInCell(ctx, cell, s.type, s.rot, false)
    })

    // Stenar (aldrig på lösningsvägen).
    const pathKeys = new Set(this._solution.map((c) => c.col + ',' + c.row))
    let stoneCells = []
    if (plan.stones === 'auto') {
      const free = []
      for (let r = 0; r < this._rows; r++)
        for (let c = 0; c < this._cols; c++) if (!pathKeys.has(c + ',' + r)) free.push({ col: c, row: r })
      stoneCells = shuffle(free).slice(0, 1 + ((Math.random() * 2) | 0))
    } else {
      stoneCells = plan.stones.filter((s) => !pathKeys.has(s.col + ',' + s.row))
    }
    stoneCells.forEach((sc) => {
      const cell = this._cellAt(sc.col, sc.row)
      if (cell && !cell.pipe) cell.stone = this._makeStone(ctx, cell)
    })

    // Rörbitarna (oändlig tillgång): de typer som saknas. De står FRISTÅENDE på hyllan —
    // egen skugga, egen guppning, ingen panel och ingen halo.
    let types = [...new Set(this._solution.filter((s, i) => !isFixed(s, i)).map((s) => s.type))]
    types.sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b))
    if (!types.length) types = ['rak']
    // Lådan får inte hamna bakom en mugg eller Elvira — den står på hyllan och skymde
    // annars just den bit barnet ska dra. Leta upp en ledig sträcka på hyllan.
    const occupied = this._mugs.map((m) => [m.x - m.W - (m.handle < 0 ? 52 : 10), m.x + m.W + (m.handle > 0 ? 52 : 10)])
    occupied.push([ex - 60, ex + 60])
    const xs = this._trayXs(types.length, occupied)
    types.forEach((type, i) => {
      const stamp = new Container()
      stamp.position.set(xs[i], STAMP_Y)
      const sh = new Graphics()
      drawPipeSilhouette(sh, BASE[type], SHELF_SHADOW)
      sh.scale.set(0.66)
      sh.position.set(0, 9)
      sh.eventMode = 'none'
      // Bitens eget liv bor i ett BARN: stämpeln är drag-mål och träffyta och får inte guppa.
      const wrap = new Container()
      wrap.eventMode = 'none'
      const pv = this._makePipe(type)
      pv.scale.set(0.66)
      pv.eventMode = 'none'
      wrap.addChild(pv)
      stamp.addChild(sh, wrap)
      // 112 px i diameter (>= 96) — större än själva biten, så halon bor i träffytan. Med tre
      // bitar på hyllan (avstånd 122) krymper den till 96 så ytorna håller 24 px isär (P0).
      stamp.hitArea = new Circle(0, 0, types.length >= 3 ? 48 : 56)
      this._trayLayer.addChild(stamp)
      this._liv(wrap, { bob: 3.5, sway: 0.03, duration: 2.1 + Math.random() * 0.9, phase: Math.random() })
      this._drag.addItem(
        stamp,
        { type },
        {
          onSelect: () => this._resetIdle(),
          onCorrect: (rec, target) => this._onStampDrop(ctx, rec, target),
          // Ett redan fyllt hål är roligt, inte fel: biten fjädrar hem och den som sitter där vinglar.
          onWrong: (rec, target) => {
            const c = target && target.cell
            if (c && c.pipe) wiggle(c.pipe)
            else if (c && c.stone) wiggle(c.stone)
          },
        }
      )
    })

    // Nollställ vattentillstånd.
    this._connected = false
    this._resolving = false
    this._idle = 0
    this._hintShown = false
    this._spawnAcc = 0
    this._recomputePath(ctx, false)

    if (this._mounted && this._level > 1) {
      // Nästa bana byggs 1,6 s efter complete(), och den här repliken kom 0,5 s senare —
      // mitt i berömmet (1,0–2,3 s), som `say()` kapade. Banan syns genast; bara orden
      // väntar in rösten, och bara så länge vattnet inte redan hittat fram på DEN här banan.
      const bana = this._level
      const tva = this._mugs.length > 1
      ctx.later(0.5, () => ctx.narTyst(() => {
        if (!this._alive || this._level !== bana || this._connected) return
        if (tva) ctx.services.voice.say('Lägg rören så vattnet rinner ner till båda muggarna!')
        else ctx.services.voice.say(this.voiceIntro)
      }))
    }
  },

  // Rörbitarnas x på hyllan: en sammanhängande rad som inte rör något upptaget intervall.
  // Mitten först, sedan allt längre ut åt båda håll.
  _trayXs(n, occupied) {
    const S = n >= 3 ? 122 : 150
    const R = 58
    const span = (n - 1) * S
    const fits = (cx) => {
      const a = cx - span / 2 - R
      const b = cx + span / 2 + R
      if (a < 60 || b > DESIGN_W - 60) return false
      return occupied.every((o) => b < o[0] || a > o[1])
    }
    const row = (cx) => Array.from({ length: n }, (_, i) => cx - span / 2 + i * S)
    for (let off = 0; off <= 520; off += 16) {
      if (fits(640 + off)) return row(640 + off)
      if (fits(640 - off)) return row(640 - off)
    }
    return row(640) // kan inte inträffa med dagens banor; hellre överlapp än ingen låda
  },

  _buildMug(m) {
    const { x, y, hw, W } = m
    const dir = m.handle

    // Muggens INSIDA ligger BAKOM vätskan (rutnätslagret): mörk botten så det ljusblå
    // vattnet syns tydligt, och glaset får en insida att vara genomskinligt framför.
    const back = new Container()
    back.position.set(x, y)
    back.eventMode = 'none'
    const inside = new Graphics().roundRect(-(hw + 6), -82, 2 * (hw + 6), 164, 20).fill(verticalFillAlpha(0x0a2a3f, 0x1b5573, 0.8, 0.9))
    inside.eventMode = 'none'
    back.addChild(inside)
    this._gridLayer.addChild(back)

    const shadow = new Graphics().ellipse(x, y + 90, W + 14, 17).fill({ color: 0x000000, alpha: 0.28 })
    shadow.eventMode = 'none'

    const mug = new Container()
    mug.position.set(x, y)
    mug.eventMode = 'none'

    // Handtag (bakom glaset): ett rör i två toner så det läser som en rund list.
    const hg = new Graphics()
    const hcx = dir * (W + 2)
    const a0 = dir > 0 ? -Math.PI / 2 : Math.PI / 2
    const a1 = dir > 0 ? Math.PI / 2 : Math.PI * 1.5
    bage(hg, hcx, -4, 34, a0, a1).stroke({ width: 18, color: shade(0xff6b6b, 0.35), cap: 'round' })
    bage(hg, hcx, -4, 34, a0, a1).stroke({ width: 10, color: 0xff8f8f, cap: 'round' })

    // Glaset ligger FRAMFÖR vätskan, så dess alpha bleker vattnet: lågt fyllnadsvärde så
    // vattnet behåller sin färg, och glaset läses i stället på sin vita kontur, tjocka botten
    // och glansstrimma mot den mörka insidan.
    const glass = new Graphics()
      .roundRect(-W, -85, 2 * W, 170, 24)
      .fill({ color: 0xcdeeff, alpha: 0.14 })
      .stroke({ width: 6, color: COLORS.white, alpha: 0.95 })
    const base = new Graphics().roundRect(-W + 8, 62, 2 * W - 16, 14, 7).fill({ color: COLORS.white, alpha: 0.22 })
    const glans = new Graphics().roundRect(-W + 17, -68, 14, 110, 7).fill({ color: COLORS.white, alpha: 0.5 })
    const line = new Graphics() // streckad gul fyll-linje (mål-nivå)
    for (let lx = -(hw - 8); lx < hw - 8; lx += 18) line.roundRect(lx, -44, 10, 4, 2).fill({ color: COLORS.yellow, alpha: 0.95 })
    const rim = new Graphics()
      .roundRect(-W - 6, -96, 2 * W + 12, 18, 9)
      .fill(topLightFill(0xff6b6b))
      .stroke({ width: 3, color: 0xa83c3c })
    for (const g of [hg, glass, base, glans, line, rim]) g.eventMode = 'none'

    // RITAD grodd i glaset (en stickling i vatten): stam, två blad och en knopp. Sitter nära
    // glasväggen och lutar UTÅT, så den aldrig hamnar i strålen mitt i muggen. Hela växten
    // ligger i `stam` (sträcks vid varje glugg) och `wrap` (vippar, vilo-guppar, kläms).
    const L = m.lean
    const wrap = new Container()
    wrap.position.set(L * hw * 0.6, -34)
    wrap.eventMode = 'none'
    const stam = new Container()
    stam.eventMode = 'none'
    const stem = new Graphics()
    stem.moveTo(0, 0).quadraticCurveTo(L * 16, -42, L * 12, -86).stroke({ width: 8, color: 0x2f8f45, cap: 'round' })
    stem.moveTo(0, 0).quadraticCurveTo(L * 16, -42, L * 12, -86).stroke({ width: 4, color: 0x63c872, cap: 'round' })
    stem.eventMode = 'none'
    const leafA = makeLeaf(38, 0x5bbf6a)
    leafA.position.set(L * 9, -44)
    leafA.rotation = -0.55
    leafA.scale.x = L
    const leafB = makeLeaf(32, 0x46a85a)
    leafB.position.set(L * 12, -62)
    leafB.rotation = -0.4
    leafB.scale.x = -L
    const bud = new Graphics()
    bud.ellipse(0, 0, 9, 12).fill(sphereFill(0x7ddf8a)).stroke({ width: 2.5, color: 0x2f8f45 })
    bud.position.set(L * 12, -94)
    bud.eventMode = 'none'
    stam.addChild(stem, leafA, leafB, bud)
    wrap.addChild(stam)

    mug.addChild(hg, glass, base, glans, line, rim, wrap)
    this._propLayer.addChild(shadow, mug)
    m.container = mug
    m.wrap = wrap
    m.stam = stam
    m.bud = bud
    this._liv(wrap, { bob: 1.2, sway: 0.045, duration: 2.9 + m.idx * 0.6, phase: Math.random() })

    // Muggens INSIDA som kollisioner — det är de som gör att vattnet stannar kvar
    // och att ytan stiger. Glaset ritas ovanpå vätskelagret, så vattnet ses genom det.
    this._fluid.addBox(x, y + MUG_FLOOR + 12, hw * 2 + 40, 24)
    this._fluid.addBox(x - hw - 11, y, 22, 190)
    this._fluid.addBox(x + hw + 11, y, 22, 190)
  },

  // ---- bana-planer ----
  // ALLTID 3 rader: en fjärde rad trycker muggen ner i hyllan och ur bild. Banorna
  // växer i bredd i stället — längre väg, fler kolumner, samma läsbara mugg.
  // Muggen ligger ALDRIG i kranens kolumn: gjorde den det föll läckan från översta
  // röret rakt ner i muggen och banan löste sig av sig själv medan barnet tittade på.
  // Förgreningsbanorna (5, 7, 9 …) har muggarna i de YTTERSTA kolumnerna: bara där får
  // rörbitarna i lådan plats mellan dem.
  _planLevel(level) {
    const L = Math.max(1, level)
    if (L === 1) return { cols: 4, rows: 3, sourceCol: 1, mugCols: [2], turnRow: 0, stones: [] }
    if (L === 2) return { cols: 4, rows: 3, sourceCol: 1, mugCols: [2], turnRow: 1, stones: [] }
    if (L === 3) return { cols: 5, rows: 3, sourceCol: 0, mugCols: [3], turnRow: 1, stones: [{ col: 1, row: 0 }] }
    if (L === 4) return { cols: 5, rows: 3, sourceCol: 1, mugCols: [4], turnRow: 1, stones: [{ col: 2, row: 0 }] }
    if (L === 5) return { cols: 6, rows: 3, sourceCol: 2, mugCols: [0, 5], branch: true, stones: [] }
    const cols = 6
    if (L % 2 === 1) {
      // 7, 9, …: T-rör igen, med slumpad kranplats och stenar i vägen.
      return { cols, rows: 3, sourceCol: 1 + ((Math.random() * 4) | 0), mugCols: [0, cols - 1], branch: true, stones: 'auto' }
    }
    // 6, 8, …: slumpad start/sväng — aldrig slut.
    const sourceCol = (Math.random() * cols) | 0
    return {
      cols,
      rows: 3,
      sourceCol,
      mugCols: [(sourceCol + 1 + ((Math.random() * (cols - 1)) | 0)) % cols],
      turnRow: 1,
      stones: 'auto',
    }
  },

  // Garanterat lösbar lösning som {col,row,type,rot}-lista (källan först).
  // Enkel bana: ner i källkolumnen till turnRow, sidled till mugg-kolumnen, sedan ner.
  // Förgrening: ner till rad 1, T-rör, sidled åt båda håll, sedan ner till varje mugg.
  // Varje cells portar härleds ur kanterna mellan grannar → T-röret får tre portar av sig själv.
  _generateSolution(plan) {
    const { sourceCol, mugCols, rows } = plan
    const nodes = new Map()
    const order = []
    const node = (col, row) => {
      const k = col + ',' + row
      if (!nodes.has(k)) {
        nodes.set(k, { col, row, ports: new Set() })
        order.push(k)
      }
      return nodes.get(k)
    }
    const chain = (list) => {
      for (let i = 0; i < list.length; i++) {
        const n = node(list[i].col, list[i].row)
        if (i === 0) continue
        const p = node(list[i - 1].col, list[i - 1].row)
        const d = dirBetween(p, n)
        p.ports.add(d)
        n.ports.add(opposite(d))
      }
    }

    if (plan.branch) {
      chain([{ col: sourceCol, row: 0 }, { col: sourceCol, row: 1 }])
      for (const mc of mugCols) {
        const step = mc < sourceCol ? -1 : 1
        const list = [{ col: sourceCol, row: 1 }]
        for (let c = sourceCol + step; c !== mc + step; c += step) list.push({ col: c, row: 1 })
        for (let r = 2; r < rows; r++) list.push({ col: mc, row: r })
        chain(list)
      }
    } else {
      const mugCol = mugCols[0]
      const tr = Math.min(rows - 1, Math.max(0, plan.turnRow))
      const cells = []
      if (sourceCol === mugCol) {
        for (let r = 0; r < rows; r++) cells.push({ col: sourceCol, row: r })
      } else {
        for (let r = 0; r <= tr; r++) cells.push({ col: sourceCol, row: r })
        const step = mugCol > sourceCol ? 1 : -1
        for (let c = sourceCol + step; c !== mugCol + step; c += step) cells.push({ col: c, row: tr })
        for (let r = tr + 1; r < rows; r++) cells.push({ col: mugCol, row: r })
      }
      chain(cells)
    }
    // Vatten matas in uppifrån i källcellen och lämnar nedåt i varje mugg-cell.
    node(sourceCol, 0).ports.add('T')
    for (const mc of mugCols) node(mc, rows - 1).ports.add('B')

    return order.map((k) => {
      const n = nodes.get(k)
      const { type, rot } = pipeForPorts([...n.ports])
      return { col: n.col, row: n.row, type, rot }
    })
  },

  // ---- rör ----
  // En rörbit = { view (position/pop/träffyta) → body (vrids) → [skugga, rör, vatten-overlay] }.
  // Skuggan ligger i kroppen men motroteras (se _shadowFix) så den alltid faller rakt NER.
  // `shadowColor` null = ingen skugga (lådans bitar har sin egen under guppningen).
  _makePipe(type, shadowColor = null) {
    const view = new Container()
    const body = new Container()
    const dirs = BASE[type] || BASE.rak
    const color = PIPE_COLOR[type] || PIPE_COLOR.rak
    let sh = null
    if (shadowColor != null) {
      sh = new Graphics()
      drawPipeSilhouette(sh, dirs, shadowColor)
      sh.eventMode = 'none'
      body.addChild(sh)
    }
    const g = new Graphics()
    drawPipe(g, dirs, color)
    g.eventMode = 'none'
    // Vattenblå kanal-overlay (tonas in när flödet når röret) — se _paintFlow.
    const wet = new Graphics()
    drawPipeWet(wet, dirs)
    wet.eventMode = 'none'
    wet.alpha = 0
    body.addChild(g, wet)
    body.eventMode = 'none'
    view.addChild(body)
    view._body = body
    view._wet = wet
    view._sh = sh
    return view
  },

  // Skuggan är ritad i rörets eget rum och vrids med det; förskjutningen motroteras så den
  // i skärmrummet alltid är (0, 7) — en skugga som snurrar runt med biten läser som en lampa
  // som kretsar.
  _shadowFix(p) {
    const sh = p && p._sh
    const b = p && p._body
    if (!sh || sh.destroyed || !b || b.destroyed) return
    const t = b.rotation
    sh.position.set(Math.sin(t) * 7, Math.cos(t) * 7)
  },

  // Vrid biten framåt till p._turns. _turns räknar VARV uppåt (aldrig modulo), annars snurrar
  // en bit som går 270° → 0° hela vägen tillbaka.
  _spin(p) {
    const b = p._body
    if (!b || b.destroyed) return
    gsap.killTweensOf(b)
    gsap.to(b, {
      rotation: p._turns * (Math.PI / 2),
      duration: 0.18,
      ease: 'back.out(2)',
      onUpdate: () => this._shadowFix(p),
    })
  },

  _placePipeInCell(ctx, cell, type, rot, announce = true) {
    if (!cell || cell.stone || cell.pipe) return null
    const view = this._makePipe(type, WELL_SHADOW)
    view.position.set(cell.x, cell.y)
    view._ptype = type
    view._rot = ((rot % 4) + 4) % 4
    view._turns = view._rot
    view._body.rotation = view._turns * (Math.PI / 2)
    this._shadowFix(view)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    // Hela cellen (120 px) är träffyta; grannarna överlappar aldrig.
    view.hitArea = new Rectangle(-60, -60, 120, 120)
    view._tap = () => this._rotatePipe(ctx, cell)
    view.on('pointertap', view._tap)
    view._cell = cell
    this._pipeLayer.addChild(view)
    cell.pipe = view
    this._pipes.push(view)
    bounceIn(view)
    this._recomputePath(ctx, announce)
    return view
  },

  _removePipe(cell) {
    const p = cell.pipe
    cell.pipe = null
    if (!p) return
    this._killViewTweens(p)
    if (p._tap) p.off('pointertap', p._tap)
    const i = this._pipes.indexOf(p)
    if (i >= 0) this._pipes.splice(i, 1)
    if (!p.destroyed) p.destroy({ children: true })
  },

  _rotatePipe(ctx, cell) {
    if (!this._alive || this._resolving) return
    const p = cell.pipe
    if (!p) return
    p._rot = (p._rot + 1) % 4
    p._turns += 1
    ctx.services.audio.sfx('flip')
    this._spin(p)
    pop(p)
    this._recomputePath(ctx, true)
    this._resetIdle()
  },

  _onStampDrop(ctx, rec, target) {
    if (!this._alive) return
    this._resetStamp(rec)
    const cell = target && target.cell
    if (!cell || cell.pipe || cell.stone) return
    this._placePipeInCell(ctx, cell, rec.data.type, 0, true)
    ctx.services.audio.sfx('pop')
    this._resetIdle()
  },

  // Stämpeln är återanvändbar: efter att den lagt ett rör fjädrar den hem igen.
  _resetStamp(rec) {
    rec.placed = false
    if (rec.view.destroyed) return
    rec.view.eventMode = 'static'
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.25, ease: 'back.out(1.4)' })
    gsap.to(rec.view.scale, { x: rec.base.x, y: rec.base.y, duration: 0.18 })
  },

  // ---- sten ----
  _makeStone(ctx, cell) {
    const c = new Container()
    c.position.set(cell.x, cell.y)
    const sh = new Graphics().ellipse(0, 42, 46, 14).fill({ color: 0x000000, alpha: 0.4 })
    sh.eventMode = 'none'
    // RITAD sten med ljus topp och mörk undersida.
    const e = new Graphics()
    e.moveTo(-38, 26).lineTo(-28, -14).lineTo(-4, -30).lineTo(28, -14).lineTo(36, 26).closePath()
    e.fill(topLightFill(0x9b9088, { highlight: 0.35, dark: 0.3 })).stroke({ width: 4, color: 0x5d534b })
    e.moveTo(-16, 24).lineTo(-10, -8).lineTo(8, -20).stroke({ width: 3, color: 0x5d534b, alpha: 0.55 })
    e.ellipse(-14, 4, 8, 5).fill({ color: 0xc9c0b7, alpha: 0.6 })
    sh.eventMode = 'none'
    e.eventMode = 'none'
    c.addChild(sh, e)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-60, -60, 120, 120)
    c._tap = () => this._removeStone(ctx, cell)
    c.on('pointertap', c._tap)
    this._propLayer.addChild(c)
    this._stones.push(c)
    return c
  },

  _removeStone(ctx, cell) {
    if (!this._alive) return
    const s = cell.stone
    if (!s) return
    cell.stone = null
    if (s._tap) s.off('pointertap', s._tap)
    const i = this._stones.indexOf(s)
    if (i >= 0) this._stones.splice(i, 1)
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, cell.x, cell.y, { color: 0xb8b8b8 })
    floatText(ctx.fxLayer, cell.x, cell.y - 30, '💪')
    pop(s)
    const st = { s: 1, a: 1 }
    const tw = gsap.to(st, {
      s: 1.3,
      a: 0,
      duration: 0.35,
      ease: 'power2.in',
      onUpdate: () => {
        if (s.destroyed) {
          tw.kill()
          return
        }
        s.scale.set(st.s)
        s.alpha = st.a
      },
      onComplete: () => {
        if (!s.destroyed) s.destroy({ children: true })
      },
    })
    this._recomputePath(ctx, true)
    this._resetIdle()
  },

  // ---- vägberäkning (flödesfyll från källan) ----
  _cellAt(col, row) {
    return this._grid[row] ? this._grid[row][col] : null
  },

  // Flödesfyll i bredd: vattnet går in uppifrån i källcellen och ut genom varje port på
  // varje vått rör. En port som möter en granne med matchande port för vattnet vidare; en
  // port nedåt i en mugg-cell går ner i muggen; varje annan öppen port är en LÄCKA (högst tre —
  // taket på hur mycket som kan rinna fel samtidigt). Nådde vattnet inget rör alls finns ingen
  // utgång — då rinner kranens stråle rakt igenom rutnätet, och det är precis vad barnet ska se.
  _traverse() {
    const cells = []
    const exits = []
    const reached = new Set()
    const seen = new Set()
    const rows = this._rows
    const cols = this._cols
    const queue = [{ col: this._sourceCol, row: 0, came: 'T', depth: 0 }]
    let maxDepth = 0
    let leaks = 0
    while (queue.length) {
      const cur = queue.shift()
      const cell = this._cellAt(cur.col, cur.row)
      if (!cell || !cell.pipe) continue
      const ports = portsFor(cell.pipe._ptype, cell.pipe._rot)
      if (!ports.includes(cur.came)) continue
      const key = cur.col + ',' + cur.row
      if (seen.has(key)) continue
      seen.add(key)
      cells.push({ col: cur.col, row: cur.row })
      if (cur.depth > maxDepth) maxDepth = cur.depth
      for (const p of ports) {
        if (p === cur.came) continue
        if (p === 'B' && cur.row === rows - 1) {
          const m = this._mugs.find((mm) => mm.col === cur.col)
          if (m) {
            reached.add(m.idx)
            exits.push({ x: m.x, y: this._lastRowY + 62, vx: 0, vy: 2.4, mug: m })
            continue
          }
        }
        const n = neighborOf(cur, p)
        const inside = n.col >= 0 && n.col < cols && n.row >= 0 && n.row < rows
        const nc = inside ? this._cellAt(n.col, n.row) : null
        if (nc && nc.pipe && portsFor(nc.pipe._ptype, nc.pipe._rot).includes(opposite(p))) {
          queue.push({ col: n.col, row: n.row, came: opposite(p), depth: cur.depth + 1 })
          continue
        }
        if (leaks < 3) {
          leaks++
          const c = cellCenter(this._gx0, cur.col, cur.row)
          const o = PORT_OUT[p]
          exits.push({ x: c.x + o.dx, y: c.y + o.dy, vx: o.vx, vy: o.vy, mug: null })
        }
      }
    }
    return { cells, exits, reached, depth: maxDepth }
  },

  _recomputePath(ctx, announce = true) {
    const res = this._traverse()
    this._exits = res.exits
    // Restid genom rören: ju längre ledning, desto längre innan vattnet kommer ut.
    this._pipeMs = 140 + (res.cells.length ? res.depth + 1 : 0) * 95
    // Går det att mata in vatten alls? Källcellen måste ha ett rör med port uppåt.
    const src = this._cellAt(this._sourceCol, 0)
    this._hasEntry = !!(src && src.pipe && portsFor(src.pipe._ptype, src.pipe._rot).includes('T'))

    // Synligt rör-flöde: färga innerkanalen blå så långt vattnet nått (även läckande).
    this._paintFlow(res.cells)

    const n = res.reached.size
    const all = n === this._mugs.length
    for (const m of this._mugs) {
      const nu = res.reached.has(m.idx)
      // Plantan spetsar öronen när dess mugg får vatten på väg.
      if (nu && !m.connected && announce && !m.done && m.wrap && !m.wrap.destroyed) squash(m.wrap, { intensity: 0.9 })
      m.connected = nu
    }
    this._connected = all
    if (n > this._reachedN && !this._resolving && announce) {
      ctx.services.audio.sfx('reveal')
      // Ventilen är sista steget: är den stängd rinner inget än — rören "sitter" bara. (Är den redan
      // öppen, eller sitter bara en del av vägen, är det som förut.)
      if (this._paPa) ctx.services.voice.say(all && this._mugs.length > 1 ? 'Nu får båda växterna vatten!' : 'Nu rinner det!')
      else if (all) {
        ctx.services.voice.say('Rören sitter! Vrid på ventilen!')
        this._visaVentilHint(ctx, false) // pilen visas genast; rösten har redan sagt det
      }
      this._sparklaVagen(ctx, res.cells)
      if (this._paPa) this._cheerElvira(ctx, false) // Elvira ser att vattnet är på väg
    }
    this._reachedN = n
  },

  // Tona in/ut kanal-overlayen per rör: "vått" = ligger på vattnets aktuella väg.
  // Fördröjning per steg → en löpande fyllning som följer vattnet ner mot muggen.
  _paintFlow(cells) {
    const wetKeys = new Set(cells.map((c) => c.col + ',' + c.row))
    for (const p of this._pipes) {
      if (!p || p.destroyed || !p._wet) continue
      const key = p._cell && p._cell.col + ',' + p._cell.row
      const on = key != null && wetKeys.has(key)
      if (on && !p._wetOn) {
        p._wetOn = true
        const idx = cells.findIndex((c) => c.col + ',' + c.row === key)
        gsap.killTweensOf(p._wet)
        gsap.to(p._wet, { alpha: 0.95, duration: 0.28, delay: Math.max(0, idx) * 0.07, ease: 'sine.out' })
      } else if (!on && p._wetOn) {
        p._wetOn = false
        gsap.killTweensOf(p._wet)
        gsap.to(p._wet, { alpha: 0, duration: 0.18 })
      }
    }
  },

  // Elvira reagerar: ett glatt litet hopp (via y, krockar ej med skal-andningen) +
  // ett hjärta/vatten-emoji ovanför henne.
  _cheerElvira(ctx, drink) {
    const e = this._elvira
    if (!e || e.destroyed) return
    const by = e.y
    gsap.killTweensOf(e, 'y')
    gsap
      .timeline()
      .to(e, { y: by - 22, duration: 0.16, ease: 'power2.out' })
      .to(e, { y: by, duration: 0.36, ease: 'bounce.out' })
    floatText(ctx.fxLayer, e.x, by - 130, drink ? randomFrom(['💗', '😋', '🥰']) : '💧')
  },

  // ---- ticker: vatten + idle/auto-hjälp ----
  _update(ctx, t) {
    if (!this._alive) return
    const dt = t.deltaMS
    this._clock += dt

    // Idle-recue (glöd vid ~6s) + auto-hjälp (vid ~14s) — bara om ej klar.
    this._stegVentil(ctx, dt)

    // Sista steget är ventilen: sitter rören men vattnet inte är påsatt väntar barnet på den.
    const ventilVantar = this._connected && !this._paPa
    if (!this._resolving && (!this._connected || ventilVantar)) {
      // Tomgången står STILL medan rösten talar (V21): ledtråden kan då aldrig kapa en
      // replik. Pausad, inte nollad — samma klocka driver auto-hjälpen vid 14 s, och
      // ledtrådens egen replik hade annars skjutit upp den till ~22 s.
      if (!ctx.services.voice.talar) this._idle += dt
      if (this._idle >= 6000 && !this._hintShown) {
        this._hintShown = true
        if (ventilVantar) this._visaVentilHint(ctx)
        else this._showHint(ctx)
      }
      if (this._idle >= 14000) {
        this._idle = 0
        this._hintShown = false
        this._clearGlow()
        this._clearVentilHint()
        if (ventilVantar) this._hjalpVentil(ctx)
        else this._autoHelp(ctx)
      }
    } else if (this._connected) {
      this._idle = 0
    }

    this._flow(ctx, dt)
    this._stegHjul(dt) // FÖRE vätskan: den läser skovlarnas läge först av allt
    this._fluid.update(dt)
    this._fluidView.update()
    this._readMug(ctx)

    if (!this._resolving) {
      for (const m of this._mugs) {
        if (!m.done && m.connected && m.fill >= 1) this._mugDone(ctx, m)
        if (this._resolving) break
      }
    }
  },

  // ---- vattnet: kran → rör → utlopp ----
  _flow(ctx, dt) {
    const f = this._fluid

    // 1. Kranen rinner alltid (utom under firandet). Det är strålen som gör pusslet
    // begripligt: finns ingen väg faller vattnet rakt igenom rutnätet, och DÅ förstår
    // barnet vad rören är till för.
    // Takten är räknad, inte vald: en droppe faller ~480 px/s när den passerat
    // rutnätet, och klicken är 55 px. Med en droppe var 145:e ms hamnar de 70 px
    // isär — en prickad linje som aldrig når metaboll-tröskeln. 55 ms ger ~26 px
    // mellanrum och en sammanhängande stråle.
    // Ventilen styr takten: stängd = ingen stråle, helt öppen = full (70 ms mellan dropparna).
    if (!this._resolving && this._oppen > 0) {
      this._spawnAcc += dt * this._oppen
      while (this._spawnAcc >= 70) {
        this._spawnAcc -= 70
        f.spawn(this._sourceX + (Math.random() - 0.5) * 6, this._tapY, { vy: 1.6 })
      }
    }

    // 2. Källrörets mynning suger in vattnet. Varje insugen droppe bokförs med den
    // tid då den kommer ut i andra änden.
    if (this._hasEntry) {
      const n = f.drain(this._sourceX, GRIDY0 - 32, 66, 56)
      for (let i = 0; i < n; i++) {
        if (this._queue.length < 60) this._queue.push(this._clock + this._pipeMs)
      }
    }

    // 3. Spill som inte kom genom ledningen rinner UTANFÖR muggen. Utan det här
    // samlas läckvattnet i muggen (den ser full ut men räknas inte) och äter hela
    // partikelbudgeten — uppmätt: 132 partiklar efter 6 s och stigande.
    for (const m of this._mugs) {
      if (f.drain(m.x, m.y - 10, m.hw * 2 + 52, 210, { pal: 0 }) > 0) {
        if (this._clock - (this._lastSpill || 0) > 700) {
          this._lastSpill = this._clock
          puff(ctx.fxLayer, m.x + (Math.random() < 0.5 ? -1 : 1) * (m.hw + 22), m.y - 70, { color: 0x9fdcf5, count: 4 })
        }
      }
    }

    // 4. Utloppen: muggarna och läckorna. Varje insugen droppe kommer ut UR ALLA utlopp —
    // en förgrening delar alltså inte vattnet, den levererar samma mängd åt båda håll, så
    // varje mugg fylls lika fort som i en enkel bana.
    const exits = this._exits
    while (this._queue.length && this._queue[0] <= this._clock) {
      this._queue.shift()
      if (!exits.length || this._resolving) continue
      let leak = null
      for (const ex of exits) {
        const m = ex.mug
        if (m && m.done) continue // en full mugg tar inte emot mer (skulle svämma över)
        // pal 1 = vatten som kommit HELA vägen genom ledningen. Det är bara sådant
        // vatten muggen räknar — annars kan ett stänk som råkar landa rätt fylla målet.
        // pal påverkar inte utseendet (ingen palette är satt).
        // TAKTKNAPP: en kopplad ledning ger två droppar per insugen. Kranens takt är
        // satt av hur strålen SER ut (droppar tätare än 55 px), muggens av hur länge
        // ett barn orkar titta på — 1:1 gav 14 s, det här ger ~7 s.
        const antal = m ? 2 : 1
        for (let k = 0; k < antal; k++) {
          f.spawn(ex.x + (Math.random() - 0.5) * 9, ex.y, { vx: ex.vx, vy: ex.vy, pal: m ? 1 : 0 })
        }
        if (m) {
          if (this._clock - (m.lastRip || 0) > 420) {
            m.lastRip = this._clock
            ripple(ctx.fxLayer, m.x, m.y - 40, { color: 0x9fdcf5, maxR: 46 })
          }
        } else if (!leak) {
          leak = ex
        }
      }
      // Läckage: en riktig stråle ur den öppna porten (aldrig straff, bara en ledtråd).
      if (leak && this._clock - (this._lastLeak || 0) > 900) {
        this._lastLeak = this._clock
        puff(ctx.fxLayer, leak.x, leak.y + 10, { color: 0x9fdcf5, count: 5 })
        ctx.services.audio.sfx('soft')
      }
    }
  },

  // Muggens fyllnad = vattenYTANS höjd, inte en uppräknad siffra. Tre filter, och
  // alla tre behövs: bara vatten som gått genom ledningen (pal 1), bara vatten som
  // LIGGER STILL (en fallande droppe passerar mätfönstret från toppen och skulle
  // annars rapportera muggen full — uppmätt: fyllnaden hoppade 0.43 → 1 → 0.58),
  // och ytan som den TREDJE lägsta droppen.
  _readMug(ctx) {
    const f = this._fluid
    for (const m of this._mugs) {
      if (m.done) continue
      const x0 = m.x - m.hw - 6
      const x1 = m.x + m.hw + 6
      const yTop = m.y - 100
      const yBot = m.y + MUG_FLOOR + 10
      let n = 0
      let s0 = Infinity
      let s1 = Infinity
      let s2 = Infinity
      for (let i = 0; i < f.count; i++) {
        if (f.pal[i] !== 1) continue
        const y = f.y[i]
        if (y < yTop || y > yBot) continue
        const x = f.x[i]
        if (x < x0 || x > x1) continue
        if (Math.abs(f.vy[i]) > 1.8) continue
        n++
        if (y < s0) {
          s2 = s1
          s1 = s0
          s0 = y
        } else if (y < s1) {
          s2 = s1
          s1 = y
        } else if (y < s2) {
          s2 = y
        }
      }
      const floorY = m.y + MUG_FLOOR
      const lineY = m.y + MUG_LINE
      const surface = n >= 3 ? s2 : floorY
      m.fill = n < 4 ? 0 : Math.max(0, Math.min(1, (floorY - surface) / (floorY - lineY)))

      // "Glugg" per femtedel: en stigande pentatonisk ton så nivån HÖRS stiga (andra muggen
      // en stor ters högre), och plantan vippar och sträcker sig ett snäpp.
      const steg = Math.min(5, Math.floor(m.fill * 5))
      if (steg > m.steg) {
        m.steg = steg
        const skala = [262, 294, 330, 392, 440]
        ctx.services.audio.tone({ freq: skala[Math.min(4, steg - 1)] * (m.idx ? 1.26 : 1), dur: 0.16, type: 'sine', vol: 0.5 })
        this._plantGrow(ctx, m, steg)
      }
    }
  },

  // Plantan lever: vid varje glugg klämmer den ihop sig och sträcker sig uppåt (och blir
  // ett snäpp högre för varje nivå), med ett litet gnistr vid toppen.
  _plantGrow(ctx, m, steg) {
    if (!m.wrap || m.wrap.destroyed || !m.stam || m.stam.destroyed) return
    squash(m.wrap, { intensity: 1.3 })
    gsap.to(m.stam.scale, { x: 1 + 0.025 * steg, y: 1 + 0.07 * steg, duration: 0.5, ease: 'back.out(2.4)' })
    sparkle(ctx.fxLayer, m.x + m.lean * (m.hw * 0.6 + 12), m.y - 34 - 96 * (1 + 0.07 * steg), { count: 3 })
  },

  // ---- vattenhjulet ----
  // Hjulet hänger i en mässingsstång under kranens rör. All fysik bor i `hjul.js` (matter-kropp +
  // gångjärn + skovlar som kolliderare i vätskan + vattnets moment); här bor bilden och ljudet.
  _byggHjul(ctx) {
    const BRASS = 0xe0a93a
    const brassEdge = shade(BRASS, 0.5)
    const x = this._sourceX + HJUL_DX
    const y = HJUL_Y
    const view = new Container()
    view.position.set(x, y)
    view.eventMode = 'none'
    const fast = new Graphics()
    fast.ellipse(4, 10, 40, 38).fill({ color: 0x000000, alpha: 0.16 })
    // stången från hjulets axel upp mot rörets undersida, med ett litet fäste överst
    fast.roundRect(-5, -54, 10, 54, 4).fill(cylinderFill(BRASS, { axis: 'x' })).stroke({ width: 3, color: brassEdge })
    fast.roundRect(-11, -60, 22, 11, 5).fill(cylinderFill(BRASS, { axis: 'x' })).stroke({ width: 3, color: brassEdge })
    const wrap = new Container()
    const rot = new Graphics()
    ritaHjul(rot)
    wrap.addChild(rot)
    view.addChild(fast, wrap)
    this._propLayer.addChild(view)
    // Vilo-guppning på ett inre barn (axeln står still, hjulet "andas" ±1 px)
    this._liv(wrap, { bob: 1.2, sway: 0, duration: 2.8, phase: Math.random() })
    const audio = ctx.services.audio
    const fys = new Vattenhjul({
      x,
      y,
      vatska: this._fluid,
      // En mjuk klapp var 60:e grad när det går fort nog att höras som ett hjul (glesat: ≥ 90 ms).
      onKlick: (n) => {
        if (!this._alive || Math.abs(fys.fart) < 0.02 || this._clock - this._hjulKlickT < 90) return
        this._hjulKlickT = this._clock
        audio.tone({ freq: HJUL_TONER[((n % 5) + 5) % 5], dur: 0.05, type: 'triangle', vol: 0.06 })
      },
    })
    this._hjul = { fys, view, rot, wrap, x, y }
  },

  _stegHjul(dt) {
    const h = this._hjul
    if (!h) return
    h.fys.steg(dt)
    if (!h.rot.destroyed) h.rot.rotation = h.fys.vinkel
  },

  // Ett tryck på väggen nära hjulet: en knuff åt det håll man tryckte (vänster om navet → moturs).
  _stotaHjul(ctx, p) {
    const h = this._hjul
    if (!h || !this._alive) return
    if (Math.hypot(p.x - h.x, p.y - h.y) > 56) return
    h.fys.stota(p.x < h.x ? -1 : 1, 0.07)
    squash(h.wrap, { intensity: 0.5 })
    ctx.services.audio.tone({ freq: 784, dur: 0.07, type: 'triangle', vol: 0.18 })
  },

  _rivHjul() {
    const h = this._hjul
    this._hjul = null
    if (!h) return
    h.fys.destroy() // kolliderarna ur vätskan, gångjärnet, fysikvärlden
    this._killViewTweens(h.wrap) // bilden rivs med lagret (_propLayer) vid banbyte/exit
  },

  // ---- ventilen (lib/vev.js, G8) ----
  // Rören sitter → barnet vrider på kranen. Drag runt hjulet ger vinkelfart (med tak); ett tryck är
  // en knuff på ett kvarts varv (fyra tryck = ett helt varv). Fingret kan vara var som helst i
  // träffcirkeln. Ljud och bild kommer vid nedtrycket — inte först när hjulet börjat röra sig.
  _buildVentil(ctx) {
    // Till höger om kranen — utom när det skulle hamna inom P0-avståndet från skalets ljudknapp
    // (kranen i sjätte kolumnen gav x 1090): då till vänster.
    const vx = this._sourceX + VENTIL_DX <= VENTIL_MAX_X ? this._sourceX + VENTIL_DX : this._sourceX - VENTIL_DX
    const vy = VENTIL_Y
    const v = makeVentil(vx, vy, this._sourceX)
    this._ventil = v
    this._propLayer.addChild(v.root)
    this._liv(v.wrap, { bob: 2, sway: 0, duration: 2.6, phase: Math.random() })

    const yta = new Container()
    this._ventilLayer.addChild(yta)
    const audio = ctx.services.audio
    this._vev = new Vev({
      yta,
      hitArea: new Circle(vx, vy, VENTIL_HIT),
      x: vx,
      y: vy,
      hitRadie: VENTIL_HIT,
      maxFart: 0.25,
      onNed: () => {
        if (!this._alive || !this._ventil) return
        audio.sfx('soft')
        squash(this._ventil.wrap, { intensity: 0.6 })
      },
      onKnuff: () => {
        if (this._alive) audio.sfx('flip')
      },
      // Spärrhjulsklick var 45:e grad, glesade så en snabb snurra inte blir en surr.
      onKlick: (n) => {
        if (!this._alive || this._clock - this._klickT < 70) return
        this._klickT = this._clock
        audio.tone({ freq: 330 + (((n % 4) + 4) % 4) * 45, dur: 0.045, type: 'triangle', vol: 0.16 })
      },
    })
  },

  // Varje bildruta: stega hjulet, vrid bilden, bokför medurs rotation → hur öppen kranen är.
  _stegVentil(ctx, dt) {
    const vev = this._vev
    if (!vev || !this._ventil) return
    vev.uppdatera(dt)
    const a = vev.vinkel
    this._ventil.hjul.rotation = a
    const d = a - this._vPrev
    this._vPrev = a
    this._framat += Math.abs(d) // åt vilket håll som helst — en treåring skruvar åt båda
    const p = Math.max(0, Math.min(1, this._framat / OPPEN_VINKEL))
    if (p > this._oppen) this._oppen = p
    // Ett hjul som snurrar är ett barn som leker — ingen ledtråd ovanpå det.
    if (vev.gripen || Math.abs(vev.fart) > 0.004) {
      this._idle = 0
      this._hintShown = false
      this._clearVentilHint()
    }
    if (!this._paPa && this._oppen >= 0.25 && !this._resolving) this._vattenPaa(ctx)
  },

  // Kranen har öppnats nog: vattnet kommer. Är vägen redan hel blir det ögonblicket belöningen.
  _vattenPaa(ctx) {
    this._paPa = true
    this._clearVentilHint()
    const v = this._ventil
    if (v && v.root && !v.root.destroyed) sparkle(ctx.fxLayer, v.root.x, v.root.y, { count: 5 })
    ctx.services.audio.tone({ freq: 523, dur: 0.14, type: 'sine', vol: 0.4 })
    if (!this._connected) return
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(this._mugs.length > 1 ? 'Nu får båda växterna vatten!' : 'Nu rinner det!')
    this._sparklaVagen(ctx, this._traverse().cells)
    this._cheerElvira(ctx, false)
  },

  _sparklaVagen(ctx, cells) {
    cells.forEach((c, i) =>
      ctx.later(i * 0.12, () => {
        if (!this._alive) return
        const cc = cellCenter(this._gx0, c.col, c.row)
        sparkle(ctx.fxLayer, cc.x, cc.y)
      })
    )
  },

  // Ledtråden: en gul pil runt hjulet i den riktning det ska vridas, som andas, plus rösten.
  _visaVentilHint(ctx, tala = true) {
    const v = this._ventil
    if (!v || v.root.destroyed) return
    this._clearVentilHint()
    const g = new Graphics()
    const R = 55
    const a0 = -2.5
    const a1 = -0.35
    bage(g, 0, 0, R, a0, a1).stroke({ width: 9, color: 0x8f6a10, cap: 'round' })
    bage(g, 0, 0, R, a0, a1).stroke({ width: 5, color: COLORS.yellow, cap: 'round' })
    // Pilspets i bågens slut, vinkelrät mot radien (medurs).
    const tx = Math.cos(a1) * R
    const ty = Math.sin(a1) * R
    const ux = -Math.sin(a1)
    const uy = Math.cos(a1)
    const nx = Math.cos(a1)
    const ny = Math.sin(a1)
    g.poly([tx + ux * 14, ty + uy * 14, tx + nx * 11, ty + ny * 11, tx - nx * 11, ty - ny * 11])
      .fill(COLORS.yellow)
      .stroke({ width: 3, color: 0x8f6a10 })
    g.eventMode = 'none'
    v.root.addChild(g)
    this._ventilHint = { g, tw: breathe(g, { scale: 1.1 }) }
    sparkle(ctx.fxLayer, v.root.x, v.root.y, { count: 4 })
    if (tala) ctx.services.voice.say('Vrid på ventilen!')
  },

  _clearVentilHint() {
    const h = this._ventilHint
    if (!h) return
    this._ventilHint = null
    h.tw?.kill()
    if (!h.g.destroyed) h.g.destroy({ children: true })
  },

  // Hjälpen (sent och SYNLIGT, P0): hjulet vrids ett helt varv av sig självt.
  _hjalpVentil(ctx) {
    if (!this._alive || this._resolving || !this._vev) return
    if (!ctx.services.voice.talar) ctx.services.voice.say('Jag hjälper till!')
    const v = this._ventil
    if (v && !v.root.destroyed) sparkle(ctx.fxLayer, v.root.x, v.root.y)
    this._vev.vrid(2 * Math.PI)
    ctx.services.audio.sfx('pop')
  },

  // ---- hjälp ----
  // Första lösningscell som saknar/har fel rör → nästa "rätta" handling.
  _findNextFix() {
    for (const s of this._solution) {
      const cell = this._cellAt(s.col, s.row)
      if (!cell || cell.stone) continue
      if (!cell.pipe) return { cell, req: s, kind: 'place' }
      if (cell.pipe._ptype !== s.type) return { cell, req: s, kind: 'replace' }
      if (cell.pipe._rot !== s.rot) return { cell, req: s, kind: 'rotate' }
    }
    return null
  },

  _showHint(ctx) {
    const fix = this._findNextFix()
    if (!fix) return
    this._clearGlow()
    const g = new Container()
    g.position.set(fix.cell.x, fix.cell.y)
    g.eventMode = 'none'
    g.addChild(
      new Graphics()
        .roundRect(-56, -56, 112, 112, 18)
        .fill({ color: COLORS.yellow, alpha: 0.16 })
        .stroke({ width: 6, color: COLORS.yellow, alpha: 0.9 })
    )
    this._glowLayer.addChild(g)
    this._glow = { g, tw: breathe(g, { scale: 1.06 }) }
    ctx.services.voice.say('Prova ett rör här!')
  },

  _clearGlow() {
    if (!this._glow) return
    this._glow.tw?.kill()
    if (!this._glow.g.destroyed) this._glow.g.destroy({ children: true })
    this._glow = null
  },

  // Lägg/justera EN felande bit → vägen garanteras till slut kopplas. Hjälpen syns och hörs
  // ("Jag hjälper till!") — barnet ska kunna skilja sitt eget bygge från hjälpen.
  _autoHelp(ctx) {
    if (!this._alive || this._resolving) return
    const fix = this._findNextFix()
    if (!fix) return
    const { cell, req, kind } = fix
    if (!ctx.services.voice.talar) ctx.services.voice.say('Jag hjälper till!')
    sparkle(ctx.fxLayer, cell.x, cell.y)
    if (kind === 'place') {
      this._placePipeInCell(ctx, cell, req.type, req.rot, true)
    } else if (kind === 'replace') {
      this._removePipe(cell)
      this._placePipeInCell(ctx, cell, req.type, req.rot, true)
    } else {
      const p = cell.pipe
      p._turns += (req.rot - p._rot + 4) % 4
      p._rot = req.rot
      this._spin(p)
      pop(p)
      this._recomputePath(ctx, true)
    }
    ctx.services.audio.sfx('pop')
  },

  // ---- blomning + nästa bana ----
  // En mugg är full: plantan slår ut. Är det den sista muggen är banan klar.
  _mugDone(ctx, m) {
    if (m.done) return
    m.done = true
    this._bloomPlant(m)
    ctx.services.audio.sfx('reveal')
    burst(ctx.fxLayer, m.x, m.y - 20, { count: 16 })
    sparkle(ctx.fxLayer, m.x, m.y - 40)
    if (this._mugs.every((mm) => mm.done)) this._finish(ctx)
    else this._cheerElvira(ctx, true)
  },

  _finish(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._cheerElvira(ctx, true) // Elvira dricker & jublar — muggen är full!
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('banor', ((ctx.progress.get().custom?.banor) | 0) + 1)
    ctx.progress.complete() // delat firande: celebrate + beröm + bigCelebration + klistermärke
    ctx.later(1.6, () => this._alive && this._buildLevel(ctx, this._level + 1))
  },

  // Knoppen slår ut till en blomma (kronblad + pistill) som studsar in.
  _bloomPlant(m) {
    const st = m.stam
    if (!st || st.destroyed) return
    if (m.bud && !m.bud.destroyed) m.bud.visible = false
    const kron = randomFrom([COLORS.pink, 0xff8fb1, 0xf2c14e, 0xff8a3d])
    // Blomman hör till `wrap` (inte `stam`) så den inte sträcks med stammen; den läggs där
    // knoppen hamnar vid den nivå stammen har nått.
    const sx = 1 + 0.025 * Math.min(5, m.steg)
    const sy = 1 + 0.07 * Math.min(5, m.steg)
    const fl = new Container()
    fl.position.set(m.lean * 12 * sx, -94 * sy)
    fl.eventMode = 'none'
    const g = new Graphics()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      g.circle(Math.cos(a) * 13, Math.sin(a) * 13, 10).fill(kron).stroke({ width: 2, color: shade(kron, 0.3) })
    }
    g.circle(0, 0, 9).fill(sphereFill(COLORS.yellow)).stroke({ width: 2, color: 0xd8a520 })
    g.eventMode = 'none'
    fl.addChild(g)
    m.wrap.addChild(fl)
    m.bloomC = fl
    bounceIn(fl)
    squash(m.wrap, { intensity: 1.5 })
  },

  // Vilo-guppning med egen tween — bokförd så den kan dödas (killTweensOf når inte ett
  // proxyobjekt).
  _liv(target, opts) {
    const tw = liv(target, opts)
    if (tw) this._livs.push(tw)
    return tw
  },

  _killViewTweens(v) {
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    if (v._body) gsap.killTweensOf(v._body)
    if (v._wet) gsap.killTweensOf(v._wet)
    v._fxPopTl?.kill()
    v._fxSquashTl?.kill()
    v._fxWiggleTl?.kill()
  },

  _killMug(m) {
    for (const o of [m.wrap, m.stam, m.bloomC, m.container]) {
      if (!o || o.destroyed) continue
      this._killViewTweens(o)
      o._fxLiv?.kill()
    }
  },

  // Allt som har egna tweens och ska dö innan brädet rivs (vid banbyte och exit).
  _killAll() {
    this._pipes?.forEach((p) => this._killViewTweens(p))
    this._stones?.forEach((s) => this._killViewTweens(s))
    this._mugs?.forEach((m) => this._killMug(m))
    this._livs?.forEach((t) => t.kill())
    this._livs = []
    this._elviraBreath?.kill()
    this._elviraBreath = null
    if (this._elvira) this._killViewTweens(this._elvira)
    if (this._ventil) this._killViewTweens(this._ventil.wrap)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.services?.voice?.cancel()
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    if (this._board && this._resetIdle) this._board.off('pointerdown', this._resetIdle)
    this._clearGlow()
    this._clearVentilHint()
    this._vev?.destroy()
    this._vev = null
    this._drag?.destroy()
    this._rivHjul()
    this._fluidView?.destroy()
    this._fluid?.destroy()
    this._fluidView = null
    this._fluid = null
    this._killAll()
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
