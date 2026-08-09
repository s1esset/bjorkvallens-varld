// Flipperspel — barnvänligt flipperbord (3–5 år). Ett STORT upprättstående bord som
// fyller designrymden (inre spelyta x 270–1010, y 152–708) där en glansig kula faller
// mot TVÅ paddlar längst ner. Barnet trycker VÄNSTER skärmhalva -> vänster paddel slår
// uppåt, HÖGER halva -> höger paddel.
//
// PADDLARNA ÄR KINEMATISKA (statiska matter-kroppar vars vinkel+position räknas om från
// sin pivå varje bildruta). Den tidigare revolute-constraint-lösningen DREV IVÄG: kroppen
// roterades kring sin masscentrum av vinkel-klampningen, constrainten drog tillbaka den
// och paddlarna hamnade 30–90 px från sina pivåer (höger paddel hamnade utanför utloppet,
// så mittspringan blev ~130 px och kulan rann rakt igenom). Nu kan de per konstruktion
// aldrig glida ur läge. Kicken görs explicit: när en paddel svingar upp och kulan är inom
// räckhåll får den en impuls längs paddelns normal, starkare ute vid spetsen (som en
// riktig flipper) — det fungerar även när kulan LIGGER STILL på paddeln.
//
// MÅL: tänd ALLA bumpers (+ ev. mål-dyna på högre nivåer) -> firande + nästa runda.
// NO-FAIL: en kula som rinner ut genom drän-hålet i mitten räknas ALDRIG som miss — inga
// liv, ingen "ball lost", ingen poäng som sjunker. Den serveras mjukt igen uppifrån (på
// ny plats varje gång) med ett glatt pop + gnista. Sker inget framsteg på länge tänds den
// SISTA envisa bumpern "av magi" så barnet alltid kommer i mål.
//
// TVÅ kontroller som ändrar utfallet: (1) paddel-timing (vänster/höger i rätt stund),
// (2) lutnings-knapp (Lugnt/Snabbt) som växlar både gravitation OCH fartgräns.
// Allt ritas programmatiskt (Pixi Graphics), exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body } from '../../lib/physics.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { makeBoll } from '../../lib/foremal.js'
import { pop, bounceIn, breathe, sparkle, puff, floatText, ripple, shake, burst, kvittera } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS, PLAYFUL, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// ---- Bordets geometri (designrymd 1280×720) --------------------------------
// Panelen ligger under topp-knapparna (hem/högtalare slutar y=110) och lämnar
// vänster ränna åt lutnings-knappen, höger ränna åt tänd-mätaren.
const PANEL_X = 250
const PANEL_Y = 112
const PANEL_W = 780
const PANEL_H = 596
const WALL = 40
const TABLE_L = PANEL_X + WALL / 2 // 270 — inre vänsterkant
const TABLE_R = PANEL_X + PANEL_W - WALL / 2 // 1010 — inre högerkant
const TABLE_T = PANEL_Y + WALL // 152 — inre överkant
const TABLE_B = PANEL_Y + PANEL_H // 708 — underkant (öppen drän i mitten)
const MID = (TABLE_L + TABLE_R) / 2 // 640

const BALL_R = 28
const PAD_LEN = 150
const PAD_T = 30
const PIVOT_Y = 596
const REST_A = 0.5 // ~29° nedåt-inåt (som en riktig flipper)
const UP_A = -0.55 // slag-vinkel: ~60° sving
const TIP_GAP = 100 // springa mellan paddelspetsarna (kulan är 56 bred -> hinner ibland ner)
const PIVOT_DX = PAD_LEN * Math.cos(REST_A)
const PIVOT_LX = MID - TIP_GAP / 2 - PIVOT_DX // 458.4
const PIVOT_RX = MID + TIP_GAP / 2 + PIVOT_DX // 821.6

const GY_NORMAL = 0.85
const GY_CALM = 0.42
const SPEED_NORMAL = 27 // px/steg — under vägg-tjockleken (40), så inget tunnlar
const SPEED_CALM = 18
const KICK_MIN = 15 // paddelkick nära pivån
const KICK_MAX = 25 // paddelkick ute vid spetsen
// Kulan tappar fart mot väggar/dynor och i luften — annars studsar den för evigt i
// övre halvan och når aldrig paddlarna (uppmätt: 30 s utan att komma under y=537).
// Nu är PADDELN kulans främsta energikälla, precis som i en riktig flipper.
const BALL_MAT = { restitution: 0.62, friction: 0.02, frictionAir: 0.01, density: 0.001 }
// Stämd pentatonisk skala (C5 D5 E5 G5 A5 C6) — varje tänd bumper ett steg upp.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

// ---- Banelement ------------------------------------------------------------
// Bordet var ett platt fält av dynor: kulan föll rakt ner i dränet och rundan var
// "nudda varje dyna en gång". De tre elementen nedan ger kulan en RESA. Alla är
// placerade så att inget par av ytor bildar en NEDÅT SMALNANDE kil — en sådan
// klämmer kulan (56 px bred) och tvingar fram fastnar-vakten. Måtten nedan är
// valda så varje passage antingen är bredare än 100 px hela vägen, eller helt
// tätad (< 56 px), aldrig något däremellan.
//
// Snurran sitter rakt ovanför drän-hålet och bryter den raka vägen ner: kulan
// kastas mot en paddel i stället för att rinna ut. Den TILLFÖR nästan ingen
// energi (radiell knuff 2,0 mot dynans 3,2) — energibudgeten är uppmätt och
// paddeln ska förbli kulans främsta energikälla.
const SPIN = { x: MID, y: 550, r: 32 }
const SPIN_PUSH = 2.0
// Två studsfenor i det döda bandet mellan dynorna och paddlarna. De slår kulan
// UPP-INÅT igen, så ett tapp i sidan blir en ny chans i stället för ett drän.
// Luckan mot lanväggen är 126 px upptill och 144 px nedtill — den VIDGAS nedåt,
// alltså ingen kil.
const FINS = [
  { x: 452, y: 500, ang: 0.524, nx: 0.5, ny: -0.866 }, // vänster: slår upp-höger
  { x: 828, y: 500, ang: -0.524, nx: -0.5, ny: -0.866 }, // höger: slår upp-vänster
]
const FIN_LEN = 96
const FIN_T = 24
// Fenan måste slå HÅRT. Med en svag kick (9,5) lyftes kulan bara ~50 px och föll
// rakt ner på samma fena igen — uppmätt 27 fen-slag på 40 s och 91 % av tiden i
// mellanbandet, dvs. kulan studsade på plats i stället för att komma vidare.
// 17 räcker upp i dyn-fältet (~170 px), och spärrtiden hindrar skurar.
const FIN_KICK = 17
const FIN_CD = 250
// Tunnel: två hål i sidoväggarna. Kulan sugs in i det ena och spottas ut ur det
// andra — riktad IN mot banan, aldrig mot en mynning — plus en spärrtid så den
// inte kan studsa fram och tillbaka mellan hålen.
// Mynningarna sitter på OLIKA höjd med flit. Låg de i linje (båda y=400) flög den
// utspottade kulan tvärs över banan rakt in i den andra mynningen: uppmätt 17
// tunnelresor på 40 s, noll paddelkickar — kulan fastnade i en tunnel-loop uppe
// i banan och kom aldrig ner. 50 px höjdskillnad bryter linjen.
const TUNNELS = [{ x: 296, y: 380, ejectX: 0.55 }, { x: 984, y: 430, ejectX: -0.55 }]
const TUNNEL_R = 30
// Insuget måste ske när kulan VIDRÖR den ritade ringen, inte tidigare: kula r=28
// + mynning r=30 = centrumavstånd 58. Med 38 försvann kulan ~20 px från hålet och
// det såg ut som en glitch i stället för ett insug.
const TUNNEL_CATCH = 54
const TUNNEL_CD = 1100
// Serven varvar tre banor i stället för ett band kring mitten. Uppmätt: med bara
// mitt-servar rörde sig kulan aldrig utanför x 518–762 och tunneln nåddes ALDRIG
// på 30 s. Ytterbanorna håller sig undan stolparna vid (360,192)/(920,192) —
// kula r=28 + stolpe r=17 kräver 45 px, banorna ger minst 55.
const SERVE_LANES = [[415, 520], [550, 730], [760, 865]]
// Dynetyper: samma dyna i tre skepnader (eget ritat motiv, egen studs, egen
// klangfärg) så en bana inte är fem kloner av varandra.
const BUMPER_TYPES = [
  { kind: 'star', rest: 0.75, wave: 'triangle', over: 1.5, overWave: 'sine' },
  { kind: 'bell', rest: 0.82, wave: 'sine', over: 2.0, overWave: 'sine' },
  { kind: 'flower', rest: 0.68, wave: 'triangle', over: 0.5, overWave: 'triangle' },
]
const GOAL_TYPE = { kind: 'goal', rest: 0.78, wave: 'sine', over: 3.0, overWave: 'sine' }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)

// Närmaste punkt på ett linjesegment (för paddel-kicken).
function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1)
  return { x: ax + t * dx, y: ay + t * dy, t }
}

// Paddel-definitioner: pivå (inre ände), vilo- och slag-vinkel, samt kick-tecken
// (vänster paddel roterar moturs på skärmen -> normalen pekar upp-höger, och tvärtom).
const PADDLES = [
  { side: 'left', px: PIVOT_LX, py: PIVOT_Y, rest: REST_A, up: UP_A, ks: -1 },
  { side: 'right', px: PIVOT_RX, py: PIVOT_Y, rest: Math.PI - REST_A, up: Math.PI - UP_A, ks: 1 },
]

export default {
  id: 'flipperspel',
  titleSv: 'Flipperspel',
  icon: '⭐',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'flipperspel',
  voiceIntro: 'Tryck på sidorna för att slå paddlarna!',

  init(ctx) {
    this._alive = true
    this._calm = false
    this._resolving = false
    this._litCount = 0
    this._total = 0
    this._sinceTap = 0
    this._sinceLit = 0
    this._lastPop = 0
    this._lastPeg = 0
    this._stuckMs = 0
    this._maxSpeed = SPEED_NORMAL
    this._pressMs = { left: 0, right: 0 }
    this._paddles = []
    this._bumpers = []
    this._fins = []
    this._tunnels = []
    this._tunnelCd = 0
    this._spinner = null
    this._level = Math.max(1, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mörk arkad-natt: bumpernas glöd syns extra fint.
    this._root.addChild(createScene('night', { width: ctx.width, height: ctx.height }))

    // Bordspanel (mörk panel + inre ljusram).
    const panel = new Graphics()
      .roundRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 40)
      .fill(COLORS.ink)
      .stroke({ width: 8, color: COLORS.purple })
    panel.roundRect(PANEL_X + 16, PANEL_Y + 16, PANEL_W - 32, PANEL_H - 32, 30).stroke({ width: 6, color: 0x3a2f6b })
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Drän-hål i mitten längst ner: kulan rullar ner HÄR (aldrig ett misslyckande).
    const drain = new Graphics()
      .roundRect(MID - 66, TABLE_B - 36, 132, 46, 22)
      .fill(0x140f2c)
      .stroke({ width: 4, color: 0x3a2f6b })
    drain.eventMode = 'none'
    this._root.addChild(drain)

    // Fysik: gentle nedåtgravitation, INGA auto-väggar (vi bygger egna).
    this._phys = new PhysicsWorld({ gravityY: GY_NORMAL, walls: [] })

    // Statiska väggar (vänster, höger, topp) — botten ÖPPEN (drän).
    const wallOpt = { isStatic: true, restitution: 0.3, friction: 0.05, label: 'wall' }
    this._phys.rectangle(PANEL_X, (PANEL_Y + TABLE_B) / 2, WALL, PANEL_H, wallOpt)
    this._phys.rectangle(PANEL_X + PANEL_W, (PANEL_Y + TABLE_B) / 2, WALL, PANEL_H, wallOpt)
    this._phys.rectangle(MID, PANEL_Y + WALL / 2, PANEL_W, WALL, wallOpt)

    // Inlane-guider: sneda lanvägar från väggen ner till paddelns pivå, så kulan
    // alltid trattas ner PÅ paddeln och aldrig kan smita förbi vid sidorna.
    this._buildGuide(TABLE_L, 466, PIVOT_LX - 22, PIVOT_Y - 10)
    this._buildGuide(TABLE_R, 466, PIVOT_RX + 22, PIVOT_Y - 10)

    // Två små stolpar högt upp: fyller det tomma översta bandet och studsar kulan
    // åt oväntade håll (74 px fri passage till väggen — inget kan fastna).
    this._buildPeg(360, 192)
    this._buildPeg(920, 192)

    // Banelement: tunnel (hål i sidoväggarna), två studsfenor och snurran över
    // dränet. Tillsammans gör de bordet till en resa i stället för ett platt fält.
    for (const t of TUNNELS) this._buildTunnel(t)
    FINS.forEach((f, i) => this._buildFin(f, i))
    this._buildSpinner()

    // Bumper-lager (under paddlar/kula i z-led).
    this._bumperLayer = new Container()
    this._bumperLayer.eventMode = 'none'
    this._bumperLayer.interactiveChildren = false
    this._root.addChild(this._bumperLayer)

    // Paddlar (kinematiska: kan aldrig glida ur läge).
    for (const def of PADDLES) this._buildPaddle(def)

    // Kula (skapas en gång, serveras om vid drän/ny runda).
    this._ballView = makeBall()
    this._ballView.position.set(MID, TABLE_T + 40)
    this._ballView.eventMode = 'none'
    this._root.addChild(this._ballView)
    this._ball = this._phys.circle(MID, TABLE_T + 40, BALL_R, { ...MATERIALS.bouncy, ...BALL_MAT, label: 'ball' })
    this._phys.link(this._ball, this._ballView, (v, b) => {
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > this._maxSpeed) {
        Body.setVelocity(b, { x: (b.velocity.x * this._maxSpeed) / sp, y: (b.velocity.y * this._maxSpeed) / sp })
      }
    })

    // Tryck-zoner (gigantiska, osynliga) — vänster/höger halva under headern.
    this._leftZone = new Graphics().rect(0, 116, MID, 604).fill({ color: 0x000000, alpha: 0 })
    this._leftZone.eventMode = 'static'
    this._onLeft = () => this._flip(ctx, 'left')
    this._leftZone.on('pointerdown', this._onLeft)
    this._rightZone = new Graphics().rect(MID, 116, 1280 - MID, 604).fill({ color: 0x000000, alpha: 0 })
    this._rightZone.eventMode = 'static'
    this._onRight = () => this._flip(ctx, 'right')
    this._rightZone.on('pointerdown', this._onRight)
    this._root.addChild(this._leftZone, this._rightZone)

    // Lutnings-knapp (ligger UTANFÖR bordet, ovanpå zonerna i z-led).
    this._buildTiltButton(ctx)

    // Bobo bor i maskinen: tittar fram över bordets överkant, rycker till vid varje
    // tändning, "kastar in" nya kulan och hoppar av glädje när allt lyser.
    // Bobo TITTAR över maskinens kant — nu med händer som greppar kanten, så det läser
    // som en figur bakom maskinen i stället för ett svävande huvud.
    this._bobo = new Container()
    this._bobo.addChild(makeMascot(46))
    const paws = new Graphics()
    paws.circle(-52, 40, 15).fill(COLORS.orange)
    paws.circle(52, 40, 15).fill(COLORS.orange)
    paws.circle(-52, 34, 13).fill(COLORS.cream)
    paws.circle(52, 34, 13).fill(COLORS.cream)
    paws.eventMode = 'none'
    this._bobo.addChild(paws)
    this._bobo.interactiveChildren = false
    this._boboBaseY = 84
    this._bobo.position.set(MID, this._boboBaseY)
    // Bobo är skärmens mest levande figur — han satt tidigare med eventMode
    // 'none' ovanför tryckzonerna (som börjar y=116) och var den enda som INTE
    // svarade när ett barn trycker rakt på honom. Nu skrattar han till.
    this._bobo.eventMode = 'static'
    this._bobo.cursor = 'pointer'
    this._bobo.hitArea = new Circle(0, 0, 62) // 124 px träffyta
    this._onBobo = () => {
      if (!this._alive) return
      this._boboReact(false)
      ctx.services.audio.sfx('pop')
      ctx.services.audio.tone({ freq: 660, dur: 0.12, type: 'sine', vol: 0.2, slideTo: 880 })
      sparkle(ctx.fxLayer, MID, this._boboBaseY)
    }
    this._bobo.on('pointertap', this._onBobo)
    this._root.addChild(this._bobo)

    // Tänd-mätare: en lodrät rad stjärnor UTANFÖR bordet (höger) som fylls per tänd
    // bumper — barnet ser hur nära rundan är klar (positiv inramning, ingen sjunkande siffra).
    this._meter = new Container()
    this._meter.eventMode = 'none'
    this._meter.interactiveChildren = false
    this._meterPips = []
    this._root.addChild(this._meter)

    // Kollisioner + ticker.
    this._offCollision = this._phys.onCollision((e) => this._onHit(ctx, e))
    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    // Första rundan.
    this._buildRound(ctx)
  },

  mount(ctx) {
    this._sinceTap = 0
    this._sinceLit = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen ---------------------------------------------------------

  // Sned lanvägg + fylld kil under den, så bordets nedre hörn ser massiva ut
  // (och kulan inte kan hitta någon springa vid sidan av paddeln).
  _buildGuide(ax, ay, bx, by) {
    const cx = (ax + bx) / 2
    const cy = (ay + by) / 2
    const len = Math.hypot(bx - ax, by - ay)
    const ang = Math.atan2(by - ay, bx - ax)

    const wedge = new Graphics()
      .poly([ax, ay, bx, by, bx, TABLE_B, ax, TABLE_B])
      .fill(lerpColor(COLORS.ink, 0x000000, 0.35))
    wedge.eventMode = 'none'
    this._root.addChild(wedge)

    const g = new Graphics()
      .roundRect(-len / 2, -12, len, 24, 12)
      .fill(COLORS.brown)
      .stroke({ width: 3, color: 0x5a3a26 })
    g.position.set(cx, cy)
    g.rotation = ang
    g.eventMode = 'none'
    this._root.addChild(g)
    this._phys.rectangle(cx, cy, len, 24, { isStatic: true, restitution: 0.4, friction: 0.05, label: 'wall', angle: ang })
  },

  // Snurra ovanför dränet: tre blad kring ett nav. Kulan slår runt den, bladen
  // snurrar vidare och saktar in — och den raka vägen ner i dränet är bruten.
  _buildSpinner() {
    const c = new Container()
    c.position.set(SPIN.x, SPIN.y)
    const shadow = new Graphics().ellipse(2, SPIN.r * 0.5, SPIN.r, SPIN.r * 0.34).fill({ color: 0x000000, alpha: 0.32 })
    const ring = new Graphics()
      .circle(0, 0, SPIN.r)
      .fill(lerpColor(COLORS.purple, 0x1a1636, 0.62))
      .stroke({ width: 5, color: COLORS.purple })
    // Bladen ligger i en EGEN container som roterar — ringen ska stå stilla.
    const blades = new Container()
    const bg = new Graphics()
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3
      const bx = Math.cos(a) * SPIN.r * 0.52
      const by = Math.sin(a) * SPIN.r * 0.52
      bg.ellipse(bx, by, SPIN.r * 0.46, SPIN.r * 0.24).fill(i === 0 ? COLORS.yellow : COLORS.teal)
    }
    blades.addChild(bg)
    const hub = new Graphics().circle(0, 0, 9).fill(COLORS.cream).stroke({ width: 3, color: COLORS.inkSoft })
    c.addChild(shadow, ring, blades, hub)
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    this._phys.circle(SPIN.x, SPIN.y, SPIN.r, { isStatic: true, restitution: 0.55, friction: 0.02, label: 'spinner' })
    this._spinner = { view: c, blades, speed: 0 }
  },

  // Studsfena: en lutad stång som slår tillbaka kulan upp-inåt. Kicken läggs på
  // explicit vid kollision (som paddelns), så styrkan är känd och kapad.
  _buildFin(def, idx) {
    const c = new Container()
    c.position.set(def.x, def.y)
    c.rotation = def.ang
    const shadow = new Graphics().roundRect(-FIN_LEN / 2, -FIN_T / 2 + 6, FIN_LEN, FIN_T, FIN_T / 2).fill({ color: 0x000000, alpha: 0.3 })
    const body = new Graphics()
      .roundRect(-FIN_LEN / 2, -FIN_T / 2, FIN_LEN, FIN_T, FIN_T / 2)
      .fill(COLORS.pink)
      .stroke({ width: 4, color: lerpColor(COLORS.pink, 0x000000, 0.35) })
    // Gummibandet på slagsidan — det som lyser till när kulan träffar.
    const band = new Graphics()
      .roundRect(-FIN_LEN / 2 + 6, -FIN_T / 2 - 3, FIN_LEN - 12, 8, 4)
      .fill(COLORS.cream)
    c.addChild(shadow, body, band)
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    this._phys.rectangle(def.x, def.y, FIN_LEN, FIN_T, {
      isStatic: true, restitution: 0.5, friction: 0.02, angle: def.ang, label: 'sling', plugin: { fin: idx },
    })
    this._fins.push({ view: c, band, nx: def.nx, ny: def.ny, x: def.x, y: def.y, last: 0 })
  },

  // Tunnelmynning: ett hål i sidoväggen. Ren grafik — insuget sköts av en
  // närhets-koll i tickern (ingen sensor-kropp som kulan kan studsa på).
  _buildTunnel(def) {
    const c = new Container()
    c.position.set(def.x, def.y)
    const rim = new Graphics()
      .circle(0, 0, TUNNEL_R)
      .fill(0x120d28)
      .stroke({ width: 5, color: COLORS.teal })
    // Chevroner inåt hålet ger djup och pekar ut att något händer här.
    const arrows = new Graphics()
    const dir = def.ejectX > 0 ? -1 : 1 // pilarna pekar IN i väggen
    for (let i = 0; i < 3; i++) {
      const ax = dir * (-6 + i * 9)
      arrows.moveTo(ax, -12).lineTo(ax + dir * 8, 0).lineTo(ax, 12)
        .stroke({ width: 4, color: COLORS.teal, alpha: 0.3 + i * 0.22 })
    }
    c.addChild(rim, arrows)
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    this._tunnels.push({ x: def.x, y: def.y, ejectX: def.ejectX, view: c, rim })
  },

  // Liten kromad stolpe (rent studsobjekt, inget mål).
  _buildPeg(x, y) {
    const g = new Graphics()
      .ellipse(x + 2, y + 12, 17, 6)
      .fill({ color: 0x000000, alpha: 0.3 })
      .circle(x, y, 17)
      .fill(0x9fb3d9)
      .stroke({ width: 3, color: 0x4a5a80 })
      .circle(x - 5, y - 6, 6)
      .fill({ color: COLORS.white, alpha: 0.75 })
    g.eventMode = 'none'
    this._root.addChild(g)
    this._phys.circle(x, y, 17, { isStatic: true, restitution: 0.7, friction: 0.02, label: 'peg' })
  },

  // Kinematisk paddel: statisk kropp vars vinkel+position räknas om från pivån varje
  // bildruta (ingen constraint -> ingen drift). Kicken läggs på explicit i _tryKick.
  _buildPaddle(def) {
    const cx = def.px + (PAD_LEN / 2) * Math.cos(def.rest)
    const cy = def.py + (PAD_LEN / 2) * Math.sin(def.rest)
    const body = this._phys.rectangle(cx, cy, PAD_LEN, PAD_T, {
      angle: def.rest,
      isStatic: true,
      friction: 0.02,
      restitution: 0.3,
      label: 'flipper',
    })

    const view = makePaddleView()
    this._phys.link(body, view)
    this._root.addChild(view)

    // Pivå-nav (rent visuellt) så det syns var paddeln sitter fast.
    const hub = new Graphics()
      .circle(def.px, def.py, 15)
      .fill(lerpColor(COLORS.orangeDark, 0x000000, 0.3))
      .stroke({ width: 3, color: 0x2a2050 })
    hub.eventMode = 'none'
    this._root.addChild(hub)

    this._paddles.push({ side: def.side, body, view, pivotX: def.px, pivotY: def.py, rest: def.rest, up: def.up, ks: def.ks, ang: def.rest, kicked: false })
  },

  _buildTiltButton(ctx) {
    const btn = new Container()
    btn.position.set(140, 585)
    const lip = new Graphics()
    const face = new Graphics()
    // RITAD blixt (P0 ASSETS) — var en ⚡-emoji.
    const icon = new Graphics()
    icon.position.set(0, -8)
    icon.eventMode = 'none'
    const label = new Text({ text: 'Snabbt', style: { fontFamily: FONT.title, fontSize: 22, fontWeight: '700', fill: COLORS.white } })
    label.anchor.set(0.5)
    label.position.set(0, 38)
    label.eventMode = 'none'
    btn.addChild(lip, face, icon, label)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new Circle(0, 0, 94) // +24px hit-halo över 70px-grafiken
    this._tiltIcon = icon
    this._tiltLabel = label
    this._tiltFace = face
    this._tiltLip = lip
    this._paintTilt()
    this._paintTiltIcon()
    this._onTilt = () => this._toggleTilt(ctx)
    btn.on('pointertap', this._onTilt)
    this._tiltBtn = btn
    this._root.addChild(btn)
  },

  // Knappens ikon RITAS om (blixt <-> moln). Den var en Graphics medan _toggleTilt
  // fortfarande satte `.text = '☁️'` — en no-op på en Graphics, så Lugnt-läget
  // visade en blixt och knappen ljög om sitt eget läge.
  _paintTiltIcon() {
    const g = this._tiltIcon
    if (!g || g.destroyed) return
    g.clear()
    if (this._calm) {
      // moln: tre puckar + en platt underkant
      g.circle(-13, 2, 13).circle(4, -6, 17).circle(19, 3, 12).roundRect(-15, 2, 36, 14, 7)
        .fill(0xf2fbff).stroke({ width: 3, color: 0xbfe4ef })
    } else {
      g.moveTo(6, -30).lineTo(-16, 4).lineTo(-1, 4).lineTo(-7, 30).lineTo(16, -6).lineTo(1, -6)
        .closePath().fill(0xffd24a).stroke({ width: 3, color: 0xe0a92c })
    }
  },

  // Måla om lutnings-knappen: färgen byter helt (blå blixt / grön-turkos moln) så
  // effekten syns även för den som inte kan läsa etiketten.
  _paintTilt() {
    const col = this._calm ? COLORS.teal : COLORS.blue
    if (this._tiltLip && !this._tiltLip.destroyed) this._tiltLip.clear().circle(0, 8, 70).fill(lerpColor(col, 0x000000, 0.24))
    if (this._tiltFace && !this._tiltFace.destroyed) {
      this._tiltFace.clear().circle(0, 0, 70).fill(col).stroke({ width: 5, color: lerpColor(col, 0x000000, 0.32) })
    }
  },

  // ---- Runda / nivå -------------------------------------------------------

  // Dyn-positionerna hålls ovanför banelementen: y max 455 (dyna r=46 -> underkant
  // 501) mot fenornas överkant 476 och snurrans 518. Luckorna är alltså < 56 px,
  // dvs. TÄTADE — kulan kan inte ta sig in och klämmas fast mellan två ytor.
  _layoutFor(level) {
    let pts
    if (level <= 2) pts = [[MID, 270], [460, 410], [820, 410]]
    else if (level <= 4) pts = [[MID, 270], [460, 410], [820, 410], [MID, 455]]
    else if (level <= 6) pts = [[MID, 265], [460, 410], [820, 410], [350, 270], [930, 270], [MID, 455, 'goal']]
    else {
      pts = [[MID, 265], [460, 410], [820, 410], [350, 270], [930, 270]]
      if (level % 2 === 0) pts.push([MID, 455, 'goal'])
    }
    // Jitter redan från nivå 2 (aldrig svårare drän). Startade det först på nivå 7
    // blev nivå 1↔2, 3↔4 och 5↔6 bokstavligen identiska banor — "blir runda 2
    // som runda 1?" hade svaret ja, exakt.
    if (level >= 2) pts = pts.map(([x, y, k]) => [clamp(x + rand(-22, 22), 345, 935), clamp(y + rand(-22, 22), 252, 428), k])
    return pts
  },

  _buildRound(ctx) {
    if (!this._alive) return
    // Rensa gamla bumpers.
    for (const b of this._bumpers) {
      b.glowTween?.kill()
      if (b.body) this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view.scale)
        b.view.destroy({ children: true })
      }
    }
    this._bumpers = []

    const layout = this._layoutFor(this._level)
    this._total = layout.length
    this._litCount = 0
    this._resolving = false
    this._sinceLit = 0
    this._buildMeter()

    layout.forEach((pt, i) => {
      const [x, y, kind] = pt
      // Tre dynetyper varvas -> varje bana är en blandning, aldrig fem kloner.
      const tdef = kind === 'goal' ? GOAL_TYPE : BUMPER_TYPES[i % BUMPER_TYPES.length]
      const color = kind === 'goal' ? COLORS.yellow : PLAYFUL[i % PLAYFUL.length]
      const m = makeBumper(color, tdef.kind)
      m.container.position.set(x, y)
      this._bumperLayer.addChild(m.container)
      const body = this._phys.circle(x, y, 46, { isStatic: true, restitution: tdef.rest, friction: 0.02, label: 'bumper', plugin: { idx: i } })
      const rec = { view: m.container, glow: m.glow, paint: m.paint, body, color, lit: false, x, y, glowTween: null, tone: tdef }
      // Otänd bumper "andas" svagt i sin glödring — bordet lever även innan man träffat.
      rec.glowTween = breathe(m.glow, { scale: 1.07, duration: 2.2 })
      this._bumpers.push(rec)
      bounceIn(m.container, { delay: i * 0.06 })
    })

    this._serveBall(ctx)
  },

  // Bygg tänd-mätaren (en stjärna per bumper). Otända = dämpade, fylls vid tändning.
  _buildMeter() {
    for (const s of this._meterPips) {
      gsap.killTweensOf(s.scale)
      if (!s.destroyed) s.destroy()
    }
    this._meterPips = []
    if (!this._meter || this._meter.destroyed) return
    const n = this._total
    const gap = 64
    const y0 = 400 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const s = new Graphics().star(0, 0, 5, 19, 9).fill({ color: COLORS.inkSoft, alpha: 0.5 }).stroke({ width: 3, color: 0x3a2f6b })
      s.position.set(1130, y0 + i * gap)
      s.eventMode = 'none'
      this._meter.addChild(s)
      this._meterPips.push(s)
    }
  },

  // Fyll nästa stjärna i mätaren med bumperns färg + en glad studs.
  _fillMeter(idx, color) {
    const s = this._meterPips[idx]
    if (!s || s.destroyed) return
    s.clear().star(0, 0, 5, 22, 11).fill(color).stroke({ width: 3, color: 0xffffff, alpha: 0.9 })
    gsap.killTweensOf(s.scale)
    gsap.fromTo(s.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2.6)' })
  },

  // Bobo reagerar: ett litet hopp vid tändning, ett stort glädjehopp när allt lyser.
  _boboReact(big = false) {
    const b = this._bobo
    if (!b || b.destroyed) return
    gsap.killTweensOf(b)
    gsap.to(b, {
      y: this._boboBaseY - (big ? 34 : 14),
      duration: big ? 0.22 : 0.12,
      yoyo: true,
      repeat: big ? 3 : 1,
      ease: 'power2.out',
      onComplete: () => { if (!b.destroyed) b.y = this._boboBaseY },
    })
    pop(b, { scale: big ? 1.25 : 1.12 })
  },

  // Ny kula uppifrån — på NY plats varje gång (variation) och alltid glatt.
  _serveBall(ctx) {
    if (!this._ball) return
    // Showläget gör kulan statisk medan den lyfts till Bobo — släpp den fri igen.
    this._liftTween?.kill()
    if (this._ball.isStatic) Body.setStatic(this._ball, false)
    const lane = SERVE_LANES[Math.floor(Math.random() * SERVE_LANES.length)]
    const x = rand(lane[0], lane[1])
    const y = TABLE_T + 40
    Body.setPosition(this._ball, { x, y })
    Body.setVelocity(this._ball, { x: rand(-3, 3), y: 2.5 })
    Body.setAngularVelocity(this._ball, 0)
    this._stuckMs = 0
    ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: 392, dur: 0.14, type: 'triangle', vol: 0.22, slideTo: 660 })
    puff(ctx.fxLayer, x, y + 10, { count: 6 })
    this._boboReact(false) // Bobo "kastar in" nya kulan
    if (Math.random() < 0.25) floatText(ctx.fxLayer, x, y + 60, '😄', { fontSize: 46 })
  },

  // ---- Kontroller ---------------------------------------------------------

  _flip(ctx, side) {
    if (!this._alive) return
    // Under bord-firandet är paddlarna låsta — men tystnad är ett P0-brott, inte en
    // paus. Uppmätt: två tryck på paddelzonerna under firandet gav noll svar
    // (`dod-traffyta`). Kvittot är dämpat så det inte tävlar med firandet.
    if (this._resolving) {
      const p = this._paddles.find((pp) => pp.side === side)
      return kvittera(ctx.fxLayer, p?.pivotX ?? (side === 'left' ? 420 : 860), p?.pivotY ?? 600, ctx.services.audio, { color: COLORS.yellow })
    }
    this._pressMs[side] = 170 // pressad ~170ms, sedan mjuk retur
    this._sinceTap = 0
    this._sinceLit = 0
    const p = this._paddles.find((pp) => pp.side === side)
    if (p) p.kicked = false
    // 'thwip' är ett RIKTIGT klipp (public/audio/sfx) — 'flip' fanns aldrig i
    // manifestet och föll igenom till en syntetisk blipp.
    ctx.services.audio.sfx('thwip')
    ctx.services.audio.tone({ freq: 190, dur: 0.07, type: 'square', vol: 0.16, slideTo: 120 }) // mekanisk klack
    if (p && p.view && !p.view.destroyed) pop(p.view)
  },

  _toggleTilt(ctx) {
    if (!this._alive) return
    this._calm = !this._calm
    this._phys.setGravity(this._calm ? GY_CALM : GY_NORMAL)
    this._maxSpeed = this._calm ? SPEED_CALM : SPEED_NORMAL
    if (this._tiltLabel && !this._tiltLabel.destroyed) this._tiltLabel.text = this._calm ? 'Lugnt' : 'Snabbt'
    this._paintTilt()
    this._paintTiltIcon()
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(this._calm ? 'Nu rullar kulan lugnt.' : 'Nu rullar kulan snabbt!')
    ripple(ctx.fxLayer, 140, 585, { color: this._calm ? COLORS.teal : COLORS.blue, maxR: 120, alpha: 0.6 })
    if (this._tiltBtn && !this._tiltBtn.destroyed) pop(this._tiltBtn)
  },

  // ---- Ticker: paddel-kinematik, kick, drän, idle/auto-hjälp ---------------

  _update(ctx, t) {
    if (!this._alive) return
    const dms = t.deltaMS
    const steps = clamp(dms / (1000 / 60), 0.5, 3)

    // Press-timers.
    this._pressMs.left = Math.max(0, this._pressMs.left - dms)
    this._pressMs.right = Math.max(0, this._pressMs.right - dms)

    // Paddel-kinematik: mjuk vinkel mot mål, sedan kropp = pivå + vinkel (ingen drift).
    for (const p of this._paddles) {
      const pressed = this._pressMs[p.side] > 0
      if (!pressed) p.kicked = false
      const target = pressed ? p.up : p.rest
      const k = 1 - Math.pow(1 - (pressed ? 0.45 : 0.2), steps)
      p.ang += (target - p.ang) * k
      const cx = p.pivotX + (PAD_LEN / 2) * Math.cos(p.ang)
      const cy = p.pivotY + (PAD_LEN / 2) * Math.sin(p.ang)
      Body.setPosition(p.body, { x: cx, y: cy })
      Body.setAngle(p.body, p.ang)
      if (pressed && !p.kicked && !this._resolving) this._tryKick(ctx, p)
    }

    this._phys.update(dms)

    // Snurran rullar vidare och saktar in (rent visuellt — ingen fysik hänger på den).
    const sp2 = this._spinner
    if (sp2 && sp2.blades && !sp2.blades.destroyed && sp2.speed > 0.0005) {
      sp2.blades.rotation += sp2.speed * (sp2.dir || 1) * steps
      sp2.speed *= Math.pow(0.972, steps)
    }

    // Drän: kula ut genom mitten (eller på avvägar) -> mjuk om-serve (ALDRIG en miss).
    const bp = this._ball.position
    if (!this._resolving && (bp.y > TABLE_B + 40 || bp.x < 120 || bp.x > 1160 || bp.y < -60)) this._serveBall(ctx)

    if (this._resolving) return

    // Tunnel: nära en mynning -> kulan sugs in och spottas ut ur den andra.
    // Spärrtiden hindrar att den studsar fram och tillbaka mellan hålen.
    this._tunnelCd = Math.max(0, this._tunnelCd - dms)
    if (this._tunnelCd === 0) {
      for (let i = 0; i < this._tunnels.length; i++) {
        const t = this._tunnels[i]
        if (Math.hypot(bp.x - t.x, bp.y - t.y) > TUNNEL_CATCH) continue
        this._enterTunnel(ctx, i)
        break
      }
    }

    // Fastnar-vakt: står kulan nästan stilla länge får den en vänlig knuff.
    const sp = Math.hypot(this._ball.velocity.x, this._ball.velocity.y)
    this._stuckMs = sp < 0.7 ? this._stuckMs + dms : 0
    if (this._stuckMs > 2600) {
      this._stuckMs = 0
      Body.setVelocity(this._ball, { x: rand(-8, 8), y: -9 })
      puff(ctx.fxLayer, bp.x, bp.y, { count: 5 })
      ctx.services.audio.sfx('soft')
    }

    // Idle-recue + auto-hjälp (garanterad framgång).
    this._sinceTap += dms
    this._sinceLit += dms
    if (this._sinceTap > 6000) {
      this._sinceTap = 0
      ctx.services.voice.say(this.voiceIntro)
      const unlit = this._bumpers.find((b) => !b.lit)
      if (unlit && unlit.view && !unlit.view.destroyed) pop(unlit.view)
    }
    // Auto-hjälpen tänder bara den SISTA envisa bumpern, och först efter lång idle —
    // paddel-skickligheten bär rundan, magin räddar bara slutklämmen.
    if (this._sinceLit > 16000 && this._total - this._litCount === 1) this._magicLight(ctx)
  },

  // Tunnelresa: in i ena hålet, ut ur det andra riktad IN mot banan. Ljudet är
  // två toner — en fallande vid insuget, en stigande vid utkastet — så resan hörs.
  _enterTunnel(ctx, i) {
    const from = this._tunnels[i]
    const to = this._tunnels[(i + 1) % this._tunnels.length]
    if (!from || !to || !this._ball) return
    this._tunnelCd = TUNNEL_CD
    puff(ctx.fxLayer, from.x, from.y, { count: 6 })
    if (from.rim && !from.rim.destroyed) pop(from.rim, { scale: 1.2 })
    ctx.services.audio.sfx('whoosh') // riktigt klipp — resan ska höras, inte bara pipa
    ctx.services.audio.tone({ freq: 760, dur: 0.16, type: 'sine', vol: 0.16, slideTo: 260 })

    // Utkastet är riktat IN och NER, och behåller (något dämpad) inkommande fart
    // i stället för en fast hastighet — annars matar tunneln in energi vid varje
    // resa och kulan slutar komma ner till paddlarna.
    const inSpeed = Math.hypot(this._ball.velocity.x, this._ball.velocity.y)
    const out = clamp(inSpeed * 0.9, 6, 12)
    Body.setPosition(this._ball, { x: to.x, y: to.y })
    Body.setVelocity(this._ball, { x: to.ejectX * out, y: 0.835 * out })
    Body.setAngularVelocity(this._ball, 0)
    this._stuckMs = 0

    ctx.services.audio.tone({ freq: 300, dur: 0.2, type: 'sine', vol: 0.17, slideTo: 880, delay: 0.13 })
    ripple(ctx.fxLayer, to.x, to.y, { color: COLORS.teal, maxR: 74, alpha: 0.6 })
    sparkle(ctx.fxLayer, to.x, to.y)
    if (to.rim && !to.rim.destroyed) pop(to.rim, { scale: 1.24 })
  },

  // Explicit flipper-kick: när paddeln svingar upp och kulan är inom räckhåll får den
  // en impuls längs paddelns normal — starkare ute vid spetsen (som en riktig flipper).
  // Fungerar även när kulan ligger stilla på paddeln (då finns ingen ny kollision).
  _tryKick(ctx, p) {
    const b = this._ball
    if (!b) return
    const ax = p.pivotX
    const ay = p.pivotY
    const bx = ax + PAD_LEN * Math.cos(p.ang)
    const by = ay + PAD_LEN * Math.sin(p.ang)
    const c = closestOnSeg(b.position.x, b.position.y, ax, ay, bx, by)
    const dist = Math.hypot(b.position.x - c.x, b.position.y - c.y)
    if (dist > BALL_R + PAD_T / 2 + 16) return
    p.kicked = true

    // Normal ut från slagsidan + liten slumpvinkel så två lika tryck inte ger samma skott.
    const a = p.ang + rand(-0.1, 0.1)
    const nx = p.ks * -Math.sin(a)
    const ny = p.ks * Math.cos(a)
    const power = KICK_MIN + (KICK_MAX - KICK_MIN) * clamp(c.t, 0.2, 1)
    // Lyft ut kulan ur paddeln först, så den aldrig kan pressas igenom.
    Body.setPosition(b, { x: c.x + nx * (BALL_R + PAD_T / 2 + 2), y: c.y + ny * (BALL_R + PAD_T / 2 + 2) })
    Body.setVelocity(b, { x: nx * power + b.velocity.x * 0.15, y: ny * power })

    sparkle(ctx.fxLayer, c.x, c.y)
    // 'boing' är ett riktigt klipp; 'pling' fanns inte i manifestet.
    ctx.services.audio.sfx('boing')
    ctx.services.audio.tone({ freq: 330, dur: 0.1, type: 'triangle', vol: 0.24, slideTo: 520 })
  },

  // ---- Kollisioner: tänd bumpers ------------------------------------------

  _onHit(ctx, e) {
    if (!this._alive || this._resolving) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      // Stolpe: bara ett litet klingande "ting" (inget mål, ingen poäng).
      if ((a.label === 'peg' && b.label === 'ball') || (b.label === 'peg' && a.label === 'ball')) {
        const now = performance.now()
        if (now - this._lastPeg > 140) {
          this._lastPeg = now
          ctx.services.audio.tone({ freq: 1320, dur: 0.09, type: 'sine', vol: 0.14 })
        }
        continue
      }
      // Studsfena: explicit kick längs fenans normal (upp-inåt) — ett tapp i
      // sidan blir en ny chans i stället för ett drän.
      const slingBody = a.label === 'sling' && b.label === 'ball' ? a : b.label === 'sling' && a.label === 'ball' ? b : null
      if (slingBody) {
        this._fireFin(ctx, this._fins[slingBody.plugin.fin])
        continue
      }
      // Snurra: bladen får fart, kulan en svag radiell knuff + en tangentiell
      // knyck så två lika träffar inte ger samma utfall.
      if ((a.label === 'spinner' && b.label === 'ball') || (b.label === 'spinner' && a.label === 'ball')) {
        this._spinHit(ctx)
        continue
      }
      let bumperBody = null
      if (a.label === 'bumper' && b.label === 'ball') bumperBody = a
      else if (b.label === 'bumper' && a.label === 'ball') bumperBody = b
      if (!bumperBody) continue
      const bump = this._bumpers[bumperBody.plugin.idx]
      if (!bump) continue
      this._kickOff(bumperBody) // liten extra studs bort -> ingen fastnar-loop
      if (bump.lit) {
        const now = performance.now()
        if (now - this._lastPop > 120) {
          this._lastPop = now
          pop(bump.view)
          ctx.services.audio.sfx('pop')
        }
      } else {
        this._lightBumper(ctx, bump)
      }
    }
  },

  // Fenan slår till: kick längs normalen (kapas ändå av _maxSpeed), gummibandet
  // blixtrar och ett kort "smack" hörs. Kicken ersätter farten längs normalen i
  // stället för att adderas — annars kan upprepade träffar ladda kulan över
  // energibudgeten och den kommer aldrig ner till paddlarna igen.
  _fireFin(ctx, fin) {
    if (!fin || !this._ball) return
    const now = performance.now()
    if (now - fin.last < FIN_CD) return
    fin.last = now
    const b = this._ball
    const along = b.velocity.x * fin.nx + b.velocity.y * fin.ny
    Body.setVelocity(b, {
      x: b.velocity.x - along * fin.nx + fin.nx * FIN_KICK,
      y: b.velocity.y - along * fin.ny + fin.ny * FIN_KICK,
    })
    if (fin.band && !fin.band.destroyed) {
      gsap.killTweensOf(fin.band)
      fin.band.alpha = 1
      gsap.fromTo(fin.band.scale, { x: 1.25, y: 2.2 }, { x: 1, y: 1, duration: 0.24, ease: 'power2.out' })
    }
    if (fin.view && !fin.view.destroyed) pop(fin.view, { scale: 1.14 })
    sparkle(ctx.fxLayer, fin.x, fin.y)
    ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: 240, dur: 0.09, type: 'square', vol: 0.18, slideTo: 420 })
  },

  // Snurran träffas: bladen får fart (visuellt), kulan knuffas svagt utåt plus en
  // slumpad tangentiell knyck — det är den som gör vägen ner oförutsägbar.
  _spinHit(ctx) {
    const b = this._ball
    const sp = this._spinner
    if (!b || !sp) return
    const dx = b.position.x - SPIN.x
    const dy = b.position.y - SPIN.y
    const d = Math.hypot(dx, dy) || 1
    const tang = rand(-1, 1) > 0 ? 1 : -1
    // Tangential-knycken är kraftigare än den radiella knuffen: snurran ska kasta
    // kulan I SIDLED (mot en paddel, ibland ända bort till en tunnelmynning),
    // inte mata den med höjd. Uppmätt: 2,4 gav x-spann 518–762, 4,2 vidgar det.
    Body.setVelocity(b, {
      x: b.velocity.x + (dx / d) * SPIN_PUSH + (-dy / d) * tang * 4.2,
      y: b.velocity.y + (dy / d) * SPIN_PUSH + (dx / d) * tang * 4.2,
    })
    sp.speed = clamp(sp.speed + 0.34, 0, 0.62) * (tang > 0 ? 1 : 1)
    sp.dir = tang
    ctx.services.audio.tone({ freq: 520, dur: 0.12, type: 'sawtooth', vol: 0.12, slideTo: 900 })
    ripple(ctx.fxLayer, SPIN.x, SPIN.y, { color: COLORS.teal, maxR: 58, alpha: 0.5, duration: 0.35 })
  },

  _kickOff(bumperBody) {
    const ball = this._ball
    const dx = ball.position.x - bumperBody.position.x
    const dy = ball.position.y - bumperBody.position.y
    const d = Math.hypot(dx, dy) || 1
    const PUSH = 3.2
    Body.setVelocity(ball, { x: ball.velocity.x + (dx / d) * PUSH, y: ball.velocity.y + (dy / d) * PUSH })
  },

  _lightBumper(ctx, bump) {
    if (bump.lit || this._resolving) return
    bump.lit = true
    // Dynan tänds i sin färg, glöd-ringen pulsar tydligare.
    bump.paint(true)
    bump.glow.clear().circle(0, 0, 62).fill({ color: bump.color, alpha: 0.34 })
    bump.glowTween?.kill()
    bump.glowTween = breathe(bump.glow, { scale: 1.18, duration: 0.9 })
    if (bump.view && !bump.view.destroyed) pop(bump.view)
    sparkle(ctx.fxLayer, bump.x, bump.y)
    // Saftigare träff: expanderande ljusring + kort mjuk skärm-mikroskak.
    ripple(ctx.fxLayer, bump.x, bump.y, { color: bump.color, maxR: 92, alpha: 0.7 })
    shake(this._root, { intensity: 4, duration: 0.28 })
    // Stämd ton ur pentatoniska skalan (stigande) — men med DYNETYPENS klangfärg
    // och överton, så örat hör vilken sorts dyna som tändes: stjärnan ljus,
    // klockan klingande (oktav), blomman varm (underoktav).
    const f = SCALE[this._litCount % SCALE.length]
    const td = bump.tone || BUMPER_TYPES[0]
    ctx.services.audio.sfx('match')
    ctx.services.audio.tone({ freq: f, dur: 0.26, type: td.wave, vol: 0.3 })
    ctx.services.audio.tone({ freq: f * td.over, dur: 0.2, type: td.overWave, vol: 0.14, delay: 0.06 })
    this._litCount++
    this._sinceLit = 0
    // Tänd-mätaren fylls + Bobo rycker till.
    this._fillMeter(this._litCount - 1, bump.color)
    this._boboReact(false)
    // Aktiva mål: de redan tända bumprarna blinkar med i en liten kedja — målen
    // reagerar på varandra i stället för att bli passiva studsytor när de tänts.
    for (const other of this._bumpers) {
      if (other.lit && other !== bump && other.view && !other.view.destroyed) pop(other.view, { scale: 1.1 })
    }
    if (Math.random() < 0.4) floatText(ctx.fxLayer, bump.x, bump.y - 46, '⭐', { fontSize: 40 })
    if (this._litCount === 1) ctx.services.voice.say('Titta, den lyser!')
    if (this._litCount >= this._total) this._celebrate(ctx)
  },

  // Auto-hjälp: tänd en otänd bumper "av magi" så rundan ALLTID kan bli klar.
  _magicLight(ctx) {
    const bump = this._bumpers.find((b) => !b.lit)
    if (!bump) return
    floatText(ctx.fxLayer, bump.x, bump.y - 46, '⭐', { fontSize: 44 })
    this._lightBumper(ctx, bump)
  },

  // ---- Klart: firande + nästa runda ---------------------------------------

  // SHOWLÄGE — bordets eget firande, inte samma konfetti som alla andra spel.
  // Hela maskinen gör en nummer av det: snurran drar igång, dynorna tänds i en
  // våg uppifrån och ner medan skalan går uppåt, kulan LYFTS ur banan upp till
  // Bobo — och det är Bobo som kastar konfettin, inte skärmen.
  _celebrate(ctx) {
    if (this._resolving) return
    this._resolving = true
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    ctx.progress.complete()

    // Maskinen går igång: snurran rusar, fenornas gummiband blixtrar.
    if (this._spinner) {
      this._spinner.speed = 0.62
      this._spinner.dir = 1
    }
    for (const fin of this._fins) {
      if (fin.view && !fin.view.destroyed) pop(fin.view, { scale: 1.16 })
    }

    // Vågen: dynorna uppifrån och ner, en ton var, stigande.
    this._celebrateTl?.kill()
    const tl = gsap.timeline()
    const order = [...this._bumpers].sort((a, b) => a.y - b.y)
    order.forEach((b, i) => {
      tl.add(() => {
        if (!this._alive || !b.view || b.view.destroyed) return
        pop(b.view, { scale: 1.3 })
        ripple(ctx.fxLayer, b.x, b.y, { color: b.color, maxR: 86, alpha: 0.65, duration: 0.4 })
        ctx.services.audio.tone({ freq: SCALE[i % SCALE.length] * 2, dur: 0.16, type: 'sine', vol: 0.22 })
      }, i * 0.1)
    })
    this._celebrateTl = tl

    // Kulan lyfts ur banan upp till Bobo. Kroppen görs statisk under resan så
    // fysiken inte drar ner den — _serveBall släpper den fri igen.
    this._liftTween?.kill()
    const ball = this._ball
    if (ball) {
      Body.setVelocity(ball, { x: 0, y: 0 })
      Body.setStatic(ball, true)
      const p = { x: ball.position.x, y: ball.position.y }
      this._liftTween = gsap.to(p, {
        x: MID,
        // Strax NEDANFÖR Bobos tassar (y≈124). Kulan ritas före Bobo i z-led, så
        // stannade den mitt i honom försvann den bakom kroppen — här sticker den
        // ut under händerna och läser som fångad.
        y: this._boboBaseY + 58,
        duration: 0.75,
        delay: 0.15,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (this._alive && this._ball) Body.setPosition(this._ball, { x: p.x, y: p.y })
        },
        onComplete: () => {
          if (!this._alive) return
          // Bobo fångar kulan och kastar konfetti — firandet kommer FRÅN honom.
          this._boboReact(true)
          ctx.services.audio.sfx('celebrate')
          ctx.services.audio.tone({ freq: 1046.5, dur: 0.3, type: 'sine', vol: 0.26, slideTo: 1568 })
          burst(ctx.fxLayer, MID, this._boboBaseY + 20, { count: 22, power: 1.35 })
          puff(ctx.fxLayer, MID, this._boboBaseY + 30, { count: 10 })
          ripple(ctx.fxLayer, MID, this._boboBaseY + 20, { color: COLORS.yellow, maxR: 160, alpha: 0.55, duration: 0.6 })
        },
      })
    }

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(2.0, () => {
      if (!this._alive) return
      this._level++
      ctx.progress.setLevel(this._level)
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      this._buildRound(ctx)
    })
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._offCollision?.()
    this._celebrateTl?.kill()
    this._nextTimer?.kill()
    this._liftTween?.kill()

    for (const fin of this._fins || []) {
      if (fin.view && !fin.view.destroyed) gsap.killTweensOf(fin.view.scale)
      if (fin.band && !fin.band.destroyed) {
        gsap.killTweensOf(fin.band)
        gsap.killTweensOf(fin.band.scale)
      }
    }
    for (const t of this._tunnels || []) {
      if (t.rim && !t.rim.destroyed) gsap.killTweensOf(t.rim.scale)
    }

    if (this._leftZone && !this._leftZone.destroyed) this._leftZone.off('pointerdown', this._onLeft)
    if (this._rightZone && !this._rightZone.destroyed) this._rightZone.off('pointerdown', this._onRight)
    if (this._tiltBtn && !this._tiltBtn.destroyed) {
      this._tiltBtn.off('pointertap', this._onTilt)
      gsap.killTweensOf(this._tiltBtn.scale)
    }

    for (const p of this._paddles) {
      if (p.view && !p.view.destroyed) gsap.killTweensOf(p.view.scale)
    }
    for (const b of this._bumpers) {
      b.glowTween?.kill()
      if (b.glow && !b.glow.destroyed) gsap.killTweensOf(b.glow.scale)
      if (b.view && !b.view.destroyed) gsap.killTweensOf(b.view.scale)
    }
    if (this._ballView && !this._ballView.destroyed) gsap.killTweensOf(this._ballView.scale)
    if (this._bobo && !this._bobo.destroyed) {
      this._bobo.off('pointertap', this._onBobo)
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    for (const s of this._meterPips || []) gsap.killTweensOf(s.scale)

    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Glansig stålkula (skugga + cirkel + ljusglimt).
function makeBall() {
  // Delad klotboll (lib/foremal.js). Stålkulan behåller sin skarpa dager genom en
  // hårdare ljuskälla i gradienten i stället för den påklistrade glansprickern.
  const c = makeBoll(BALL_R, 0xf2f6fb, {
    kontur: COLORS.inkSoft,
    konturBredd: 3,
    konturAlpha: 1,
    skugga: { x: 2, y: 4, rx: BALL_R, ry: BALL_R, alpha: 0.3 },
  })
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Glansig orange paddel (rundad rektangel centrerad i origo + ljusglimt).
function makePaddleView() {
  const c = new Container()
  const shadow = new Graphics().roundRect(-PAD_LEN / 2, -PAD_T / 2 + 6, PAD_LEN, PAD_T, PAD_T / 2).fill({ color: 0x000000, alpha: 0.28 })
  const g = new Graphics()
    .roundRect(-PAD_LEN / 2, -PAD_T / 2, PAD_LEN, PAD_T, PAD_T / 2)
    .fill(COLORS.orange)
    .stroke({ width: 4, color: COLORS.orangeDark })
  const gloss = new Graphics().ellipse(-PAD_LEN * 0.14, -6, PAD_LEN * 0.28, 5).fill({ color: COLORS.white, alpha: 0.45 })
  gloss.eventMode = 'none'
  c.addChild(shadow, g, gloss)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Bumper-dyna: ett RITAT föremål (skugga + glödring + sockelring + kupa + motiv +
// ljusglimt) — ingen emoji i en bricka. Otänd = mörk kupa, tänd = kupan lyser i färgen.
function makeBumper(color, kind) {
  const container = new Container()
  const shadow = new Graphics().ellipse(0, 16, 44, 13).fill({ color: 0x000000, alpha: 0.32 })
  const glow = new Graphics().circle(0, 0, 62).fill({ color, alpha: 0.12 })
  const ring = new Graphics()
    .circle(0, 0, 46)
    .fill(lerpColor(color, 0x000000, 0.6))
    .stroke({ width: 6, color: lerpColor(color, 0x000000, 0.25) })
  const cap = new Graphics()
  const motif = new Graphics()
  const gloss = new Graphics().ellipse(-12, -20, 13, 6).fill({ color: COLORS.white, alpha: 0.4 })
  gloss.eventMode = 'none'
  container.addChild(shadow, glow, ring, cap, motif, gloss)
  container.eventMode = 'none'
  container.interactiveChildren = false

  // Varje typ har EGEN silhuett (inte bara eget motiv): klockan har ett ok högst
  // upp, blomman en snärjd kant, stjärnan den runda standardkupan.
  const paint = (lit) => {
    if (cap.destroyed || motif.destroyed) return
    const capCol = lit ? color : lerpColor(color, 0x1a1636, 0.58)
    const edge = lerpColor(capCol, 0xffffff, lit ? 0.4 : 0.14)
    cap.clear()
    if (kind === 'bell') {
      cap.roundRect(-9, -42, 18, 14, 7).fill(edge) // upphängningens ok
      cap.circle(0, -3, 33).fill(capCol).stroke({ width: 3, color: edge })
    } else if (kind === 'flower') {
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7
        cap.circle(Math.cos(a) * 25, -3 + Math.sin(a) * 25, 13).fill(edge)
      }
      cap.circle(0, -3, 27).fill(capCol).stroke({ width: 3, color: edge })
    } else {
      cap.circle(0, -3, 34).fill(capCol).stroke({ width: 3, color: edge })
    }

    const mCol = lit ? COLORS.white : lerpColor(color, 0x1a1636, 0.3)
    motif.clear()
    if (kind === 'goal') {
      motif.circle(0, -3, 19).stroke({ width: 5, color: mCol })
      motif.circle(0, -3, 10).stroke({ width: 5, color: mCol })
      motif.circle(0, -3, 3).fill(mCol)
    } else if (kind === 'bell') {
      motif.moveTo(-15, 6)
        .quadraticCurveTo(-14, -16, 0, -22)
        .quadraticCurveTo(14, -16, 15, 6)
        .closePath().fill(mCol)
      motif.roundRect(-18, 4, 36, 7, 3).fill(mCol)
      motif.circle(0, 15, 4).fill(mCol) // kläppen
    } else if (kind === 'flower') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
        motif.circle(Math.cos(a) * 11, -3 + Math.sin(a) * 11, 7.5).fill(mCol)
      }
      motif.circle(0, -3, 6).fill(lit ? color : lerpColor(color, 0x1a1636, 0.05))
    } else {
      motif.star(0, -3, 5, 17, 8).fill(mCol)
    }
  }
  paint(false)

  return { container, glow, paint }
}
