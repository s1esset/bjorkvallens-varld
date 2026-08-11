// Pruttbubbelbad — fnitter-fysik (2–4 år). Zacke sitter i ett skummande bubbelbad;
// barnet trycker (eller HÅLLER) på hans mage → PRRRT! En luftbubbla föds vid
// tryckpunkten och stiger gungande genom vattnet, vobblar i sidled och POPPAR vid
// ytan med ett fniss + skumplask. Ju längre man håller, desto större bubbla
// (stiger snabbare, poppar högre, mer skum). En gul gummianka man kan DRA gör att
// bubblorna studsar åt nya håll. Mål: poppa bubblor tills skummet fyller badet upp
// till den prickade skumlinjen → firande + nytt, lite högre mål (oändlig lek).
//
// No-fail betyder att INGET straffar barnet — inte att badet fyller sig självt.
// Tomma tryck finns inte (vatten ger plopp+ring, magen ger alltid en bubbla) och
// skummet växer monotont, men skum kommer ENDAST från bubblor barnet skapat.
// Vid idle BJUDER Zacke in (prutt, min, pekande hand, upprepad röst) — han spelar
// aldrig åt barnet. Anti-stuck-vakten lossar bara barnets egna fastnade bubblor.
//
// Bubblorna är vanliga Pixi-objekt som ENDAST rörs av ticker-integratorn (ingen matter.js,
// ingen GSAP på bubbel-objekt) → exit-säkra utan extra skydd. Partiklar/plask går via
// lib/feedback.js (redan exit-säkra). GSAP rör endast Zacke/anka/skum + {}-proxies.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene, lerpColor } from '../../lib/scene.js'
import { puff, sparkle, ripple, floatText, pop, wiggle, bigCelebration, breathe , kvittera} from '../../lib/feedback.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { verticalFillAlpha, groundFill } from '../../lib/form.js'
import { FluidWorld, FluidView, FLUIDS } from '../../lib/vatska.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// DJUP I VATTNET. `_plattprobe --medbakgrund` mätte badvattnet till 270 576 px — 29 % av
// skärmen — i EN ton. Vatten är ljusare vid ytan och mörknar nedåt, och det gick inte att
// lösa med `verticalFill`: vattnet ritas med `alpha` (Zacke och ankan ska synas nedsänkta),
// och alpha går inte att kombinera med en gradientfyllning. `verticalFillAlpha` lägger
// genomskinligheten i toningens STOPP i stället — se lib/form.js.

// arc() i en Graphics som redan har former fortsätter den AKTUELLA vägen — utan ett
// moveTo till bågens startpunkt ritas ett streck från förra formen till bågen.
const arcPath = (g, cx, cy, r, a0, a1) => g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1)

// ---- Geometri (designkoordinater) ---------------------------------------
//
// ⚠️ RENT SIDOPERSPEKTIV. Ägaren kunde inte avgöra om badet sågs uppifrån eller från
// sidan. Det var aldrig en smakfråga: scenen bar TRE toppvy-signaler och nästan inga
// sidovy-signaler.
//   1. Karet TÄCKTE SINA EGNA FÖTTER. Kroppen gick ner till y 680 medan fötterna satt
//      596–670 och ritades FÖRE den — bara 10 px nubbar stack ut i sidled. Dessutom gick
//      karet ner genom golvlinjen (622). Ingenting sa att karet STOD i ett rum.
//   2. ANKAN FLÖT 100 px UNDER YTAN och kunde dras fritt i hela vattenfältet (y 350–584).
//      En anka som svävar mitt i vattnet är en skål sedd uppifrån — det finns ingen annan
//      läsning. Det här var den starkaste signalen av de tre.
//   3. VATTNET FYLLDE EN RUNDAD REKTANGEL ända ut i alla fyra hörnen, med kanten runt om
//      hela vägen: formen på en balja fotad rakt ovanifrån.
// Nu: karet står på golvet på synliga fötter, insidan smalnar av nedåt, ankan FLYTER i
// ytan, och sidan mot kameran är genomskinlig — bara dess kant och glans ritas, så
// vattnet, skummet, Zackes ben och fyndet syns igenom den.
// Mätt av `scripts/_perspektivprobe.mjs`.
// ---- Vattennivån ---------------------------------------------------------
//
// Ytan VAR en konstant som allt annat byggdes kring. Ägaren bad om en propp att dra ut och
// en kran att trycka på — "ger barnet kontroll över nivån i båda riktningar, vilket spelet i
// dag saknar helt" — och då måste ytan bli ett levande värde (`this._surf`). Allt som ligger
// I vattnet läser den: vattnet, toningen, skummet, mållinjen, bubblornas popp-linje, ankans
// flytlinje, tvålbandet, fyndet och kranens droppe.
//
// ⚠️ P0 MOTGÅNG: att tömma får ALDRIG nollställa framsteg. `_foam.level` (och därmed mätaren)
// rörs inte av en tömning — skummet ÅKER MED nivån ner och tillbaka upp, precis som skum gör.
// Och tömningen har ett TAK: den bottnar på SURF_LOW, så badet kan aldrig bli tomt och
// bubblorna har alltid någonstans att poppa.
// ⚠️ DET FINNS INGEN MODULKONSTANT `SURFACE_Y` LÄNGRE, med flit. Varje metod som rör vattnet
// tar `const SURFACE_Y = this._surf` som första rad. Hade konstanten fått ligga kvar bredvid
// det levande värdet skulle en glömd rad läsa den TYST och rita vatten på fel höjd; nu blir
// samma glömska ett ReferenceError som testet fångar direkt.
const SURF_FULL = 330 // fullt bad
const SURF_LOW = 468 // så lågt tömningen går — taket på motgången
const PLUG = { x: 900, y: 588 } // avloppshålet i karbottnen
const TUB_TOP = 230 // rullkantens ovansida
const RIM_H = 20 // rullkantens höjd: från sidan är kanten en RULLE, inte en linje
const IN_TOP = TUB_TOP + RIM_H // insidan (bakväggen) börjar under kanten
const TUB_BOT = 610 // insidans botten
const OUT_BOT = 624 // ytterbotten — porslinet under insidan
const IN_L = 194 // insidans väggar vid kanten
const IN_R = 1086
const SHELL = 26 // porslinets tjocklek — gaveln sedd rakt från sidan
const TAPER = 30 // insidan smalnar av nedåt: ett kar sett från SIDAN är smalare i botten
const ROOM_FLOOR = 640 // rummets golvlinje — karet står FRAMFÖR den, fötterna på golvet
const GOAL_MIN = 264 // mållinjens tak. ⚠️ LÅG PÅ 248 = MITT I kar-kantens stroke, så från
// nivå 2 (då clampen bet) ritades hela den prickade mållinjen BAKOM kanten. Måldottarna
// var alltså osynliga i varje runda utom de två första — en bugg inget test kunde se.
const WALL_L = 230 // logiska väggar (bubbel-studs)
const WALL_R = 1050
const FLOOR = 604 // bubblornas botten = karets insida (låg på 650, alltså 46 px NEDANFÖR
// den nya innerbottnen — bubblor hade fötts inne i porslinet)
const ZACKE_X = 430
const ZACKE_Y = SURF_FULL // Zackes origo ligger i vattenytan → magen hamnar i vattenbrynet
const DUCK_R = 66 // ankans kollisionsradie
const DUCK_DY = -16 // ankan FLYTER: ytan skär hennes skrov, hon svävar inte. Offset FRÅN ytan,
// inte en fast höjd — hon åker med när badet töms och fylls (`_floatY()`).
const DUCK_DIP_MAX = 76 // så djupt går hon att TRYCKA NER innan lyftkraften tar över
const DUCK_HOME = { x: 800, y: SURF_FULL + DUCK_DY }
const SPOUT = { x: 970, y: 236 } // kranens pip — droppen faller härifrån

// Karets insida vid en given höjd. Allt som ligger I karet ritas mot de här två — ritas
// vattnet i stället som en egen rundad rektangel sticker det ut genom porslinet så fort
// väggen lutar.
const tubT = (y) => clamp((y - IN_TOP) / (TUB_BOT - IN_TOP), 0, 1)
const innerL = (y) => IN_L + TAPER * tubT(y)
const innerR = (y) => IN_R - TAPER * tubT(y)

// Karets insida som en VÄG: raka lutande väggar, rundad botten. `inset` krymper konturen
// inåt (vattnet ligger innanför porslinet) — negativ `inset` ger ytterkonturen, som är
// samma form utåtflyttad en skaltjocklek, alltså exakt parallell med insidan.
// `vag` = en funktion x → höjdavvikelse, eller null för en rak överkant. Vattnet och toningen
// delar den, annars glider ytlinjen loss från vattnet den ligger på.
function tubPath(g, yTop, yBot, inset = 0, rBot = 54, vag = null) {
  const yc = yBot - rBot
  const l0 = innerL(yTop) + inset,
    r0 = innerR(yTop) - inset
  const lc = innerL(yc) + inset,
    rc = innerR(yc) - inset
  const l1 = innerL(yBot) + inset,
    r1 = innerR(yBot) - inset
  g.moveTo(l0, yTop + (vag ? vag(l0) : 0))
  if (vag) {
    const STEG = 22
    for (let x = l0 + STEG; x < r0; x += STEG) g.lineTo(x, yTop + vag(x))
  }
  return g
    .lineTo(r0, yTop + (vag ? vag(r0) : 0))
    .lineTo(rc, yc)
    .quadraticCurveTo(r1, yBot, r1 - rBot, yBot)
    .lineTo(l1 + rBot, yBot)
    .quadraticCurveTo(l1, yBot, lc, yc)
    .closePath()
}

// ---- Bubblor -------------------------------------------------------------
const BASE = 40 // ritradie; view.scale = r / BASE
const R_MIN = 28 // snabbt tap ger ändå en rolig bubbla
const R_MAX = 70

// ---- Bubbelmedlet: tre flaskor, tre sorters bubblor ----------------------
//
// Ägaren: *"Tre schampoflaskor i olika storlek → olika bubbelstorlek. Barnet trycker själv på
// en flaska för att hälla i bubbelmedel; liten flaska ger små bubblor, stor ger stora."*
//
// ⚠️ `antal` finns för att valet inte ska vara ett SÄMRE och ett BÄTTRE alternativ. Skum per
// popp växer med radien, så den stora flaskan skulle annars vara strikt bäst och de två andra
// bara långsammare vägar till samma sak. Små bubblor kommer dessutom i klunga i verkligheten,
// så tre små per tryck är både den ärliga läsningen av "små bubblor" och det som gör flaskorna
// till tre olika SORTER i stället för tre nivåer av samma.
const SOAPS = [
  { id: 'liten', min: 17, max: 32, antal: 3, h: 38, w: 32, color: 0x5fc9e8, dark: 0x3aa6c6, say: 'Små bubblor!' },
  { id: 'mellan', min: R_MIN, max: R_MAX, antal: 1, h: 54, w: 42, color: COLORS.purple, dark: 0x8b6fe0, say: 'Vanliga bubblor!' },
  { id: 'stor', min: 46, max: 96, antal: 1, h: 72, w: 52, color: 0xff8fb8, dark: 0xe0518a, say: 'Stora bubblor!' },
]
// P0 TRÄFFYTA: ≥96 px per flaska och ≥24 px mellan dem ⇒ minst 120 px mellan mittpunkterna.
const SOAP_X = [548, 668, 788]
const SOAP_Y = 150 // hyllans ovansida — flaskorna STÅR på den
const R_CEIL = 100 // tak oavsett flaska och nivå: en bubbla bredare än så fyller halva karet
const CROWN = 20 // hur högt skummets bubbeltoppar sticker upp över skumkroppen

// ---- Ytan som ett HÖJDFÄLT ----------------------------------------------
//
// Ägaren: *"Flyttar man ankan ska vattnet svara: undanträngd volym, vågor som sprids,
// bubblor som skjuts undan."*
//
// ⚠️ MÖNSTRET I `plask-i-vattnet` GÅR INTE ATT ÅTERANVÄNDA HÄR, och det är värt att veta
// innan någon försöker igen: den vätskan är SPH-partiklar i en `Flytvolym`, som kräver en
// matter-värld. Pruttbads bubblor är rena ticker-objekt med flit (exit-säkerhet utan extra
// skydd, se filhuvudet) och badet är en RITAD form. Det som däremot bär rakt över är dess
// varning: undanträngd volym höjer HELA ytan, så bredden ska hållas MINDRE än föremålet är
// ritat — annars lyfts badet synligt varje gång ankan guppar.
//
// För en ritad yta är verktyget i stället ett 1D-höjdfält: en rad stödpunkter tvärs karet
// som fjädrar mot vilonivån och lämnar vidare till sina grannar. Det ger både vågen som
// sprider sig och en yta som faktiskt SVARAR på det som rör sig i den.
const WAVE_N = 41 // stödpunkter tvärs karet
const WAVE_K = 0.021 // fjäder mot vilonivån
const WAVE_DAMP = 0.972
const WAVE_SPREAD = 0.08 // hur snabbt en våg vandrar i sidled (ETT pass — se `_waveStep`)
const WAVE_MAX = 20 // utslagstak — en våg får aldrig skvätta ur karet
const WAVE_REST = 0.25 // under det här är fältet i vila och ritas inte om alls
const DISP_W = 96 // ankans undanträngande bredd — MINDRE än hon är ritad, se rutan ovan
const DUCK_PUSH_R = 168 // bubbelknuffens EGEN radie.
// ⚠️ DEN FÅR INTE ÄRVA `DUCK_R`. Kollisionsradien är där skrovet FAKTISKT är; knuffen är ett
// mjukt fält runt henne. Delar de tal blir knuffen antingen en osynlig vägg vid skrovet
// eller ingenting alls.
const FOAM_K = 0.9 // skum-tillskott per pop = r * FOAM_K

// --- Tvåldropparna vid poppet (lib/vatska.js) -----------------------------
//
// ⚠️ SIMULERA BARA DÄR VÄTSKAN SYNS. Ett popp kastade förut bara en generisk `puff`.
// Nu flyger RIKTIGA tvåldroppar upp ur ytan, hänger ihop av yttensionen och faller
// tillbaka. Men de simuleras BARA i ett smalt band kring vattenytan — under ytan är
// de osynliga (vattnet ligger ovanpå dem i alfa), så droppar som faller tillbaka
// DRÄNERAS bort i stället för att sjunka till botten och kosta varje steg för alltid.
const TVAL_MAX = 120 // partikeltak: sprayen är kort, inte ett kar
// ⚠️ 180 SLÄPPTE DROPPARNA UT UR KARET — de hamnade uppe på tvålhyllan och över
// badrumsväggen, alltså utanför vattnet de kom ifrån (syntes bara på bilden; talen
// var gröna). Taket ligger nu strax under kar-kanten och är en riktig VÄGG
// (`walls.top`), så ett tryckskott inte kan kasta en droppe ur badet.
const TVAL_TOP = SURF_FULL - 110 // bandets höjd vid fullt bad; det SKJUTS sedan med nivån
const TVAL_X0 = 200 // karets insida (samma som vattnets roundRect)
const TVAL_X1 = 1080
const MAX_V = 14 // hastighetstak — inget kan skjuta ur karet

// ---- Zacke (ritad karaktär, inte en boll) --------------------------------
// Badsorter — en per runda, cyklade på nivån. Rundorna såg tidigare IDENTISKA ut (bara
// mållinjen flyttades och bubblorna blev några px större), vilket var precis det kritikern
// underkände: "variation" och "mjuk progression" delvis uppfyllda så länge rundorna ser lika
// ut. Nu byter vattnet, toningen och skummet färg — skillnaden syns på en halv sekund.
const BATHS = [
  { id: 'bubbel', water: COLORS.blue, tint: 0x4aa3df, foam: 0xffffff, say: 'Vanligt bubbelbad!' },
  { id: 'jordgubb', water: 0xff7ba5, tint: 0xe0518a, foam: 0xffe6f0, say: 'Jordgubbsbad!' },
  { id: 'blabar', water: 0x8f80e6, tint: 0x6f5fd0, foam: 0xeae4ff, say: 'Blåbärsbad!' },
  { id: 'citron', water: 0xf5c542, tint: 0xdfa81b, foam: 0xfff7db, say: 'Citronbad!' },
  { id: 'mint', water: 0x4fd6b8, tint: 0x2fbfa0, foam: 0xe0fbf4, say: 'Mintbad!' },
]

const TREASURES = [
  { id: 'boat', say: 'Titta, en båt!' },
  { id: 'star', say: 'En stjärna i skummet!' },
  { id: 'fish', say: 'En liten fisk!' },
  { id: 'ball', say: 'En badboll!' },
  { id: 'crab', say: 'En krabba!' },
]

const SKIN = 0xffe0bd
const SKIN_DARK = 0xefc79c
const SKIN_OUT = 0xd79f6a // egen kontur — hud mot vitt porslin/skum är annars nästan osynlig
const HAIR = 0x7a4a25

export default {
  id: 'pruttbad',
  titleSv: 'Pruttbubbelbad',
  icon: '🛁',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'pruttbad',
  voiceIntro: 'Tryck på Zackes mage så bubblar det! Fyll badet med skum ända upp till linjen.',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._ctx = ctx // _drawFoam saknar ctx men behöver den för fyndets ljud/röst
    this._bubbles = []
    this._foam = { level: 0 }
    this._held = false
    this._charging = null
    this._resolving = false
    this._idle = 0
    this._sinceFoam = 0 // anti-stuck-vakt: sekunder sedan skummet senast växte
    this._firstPrutt = false
    this._tweens = [] // fynd-tweens (bl.a. en repeat:-1-gungning som MÅSTE dödas)
    this._treasure = null
    this._treasureBob = null
    this._touched = false // har barnet rört spelet? styr inbjudande handen
    this._duckPhase = 0
    this._duckActive = false
    this._duckMoved = false
    this._duckSelected = false
    this._duckBase = { x: DUCK_HOME.x, y: DUCK_HOME.y }
    this._foamPhase = 0
    this._foamAcc = 0
    this._drip = { y: SPOUT.y, wait: 1.2 }
    this._mood = 'glad'
    this._moodHold = 0
    this._lastSfx = {} // per-ljud strypning (min-intervall) → aldrig sfx varje tick

    // Vattennivån är numera ett levande värde: proppen sänker den, kranen höjer den.
    this._surf = SURF_FULL
    this._surfBase = SURF_FULL
    this._disp = 0
    this._wave = new Float32Array(WAVE_N) // AVVIKELSEN från viloläget — går till exakt noll
    this._waveV = new Float32Array(WAVE_N)
    this._waveRest = new Float32Array(WAVE_N) // ankans dell: fältets vilolage
    this._waveRestPrev = new Float32Array(WAVE_N)
    this._waveAcc = 0
    this._waveOn = false
    this._duckLastX = DUCK_HOME.x
    this._duckLastDip = 0
    this._plugOut = false
    this._soap = 1 // mellanflaskan = spelets gamla bubbelstorlek
    this._pour = null
    this._fill = 0 // sekunder kvar av ett kranpådrag
    this._swirlPhase = 0

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._applyLevel()

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn) — mjuk badrums-gradient under kaklet.
    const scene = createScene('water', { ground: false })
    this._root.addChild(scene)

    // Z-ordning: badrum → kar (fötter, gavlar, bakvägg, vatten) → mållinje →
    // vatten-träffyta → Zacke → vattentoning → bubblor → ankans ytring → skum → fynd →
    // anka → tvål → karets FRAMSIDA (genomskinlig, bara kant + glans) → målflagga → mätare.
    // Mållinjen ligger BAKOM Zacke (annars ritas en prickrad tvärs över hans ansikte) och
    // framsidan ligger FRAMFÖR honom (då sitter han i karet, inte på det).
    this._buildBathroom()
    this._buildTub()
    this._buildWater() // eget lager: nivån rör sig, karet gör det inte
    this._buildGoal()
    this._buildWaterTap(ctx)
    this._buildPlug(ctx) // EFTER vatten-träffytan, annars äter den proppens tryck
    this._buildZacke(ctx)
    this._buildTint()
    this._buildBubbleLayer()
    this._buildDuckWake() // ringen där ankan bryter ytan — under skummet, som ytan själv
    this._buildFoam()
    // Fynd-lagret ligger FRAMFÖR skummet: leksaken ska se ut att lyftas upp av skummet.
    this._treasureLayer = new Container()
    this._treasureLayer.eventMode = 'none'
    this._treasureLayer.interactiveChildren = false
    this._root.addChild(this._treasureLayer)
    this._placeTreasure()
    // Ankan ligger FRAMFÖR skummet (hon flyter PÅ badet — hamnar hon under blir hon
    // begravd när skummet stiger) och framför toningen (en badanka MÅSTE läsas som gul,
    // inte olivgrön).
    this._buildDuck(ctx)
    // Tvåldropparna ligger FRAMFÖR skummet och fyndet (de flyger upp ur ytan) men
    // BAKOM kar-kanten, annars regnar de utanför karet.
    this._buildTval()
    this._buildTubRim()
    // Målflaggan FRAMFÖR kanten: rullkanten är 20 px hög och skar annars av flaggstången
    // mitt itu. Den prickade LINJEN ligger kvar bakom skummet, så den försvinner under
    // skummet när badet fylls — det är den som ska bli övertäckt, inte markören.
    if (this._goalMarker && !this._goalMarker.destroyed) this._root.addChild(this._goalMarker)
    this._buildSoaps(ctx) // hyllans tre flaskor
    this._buildTapButton(ctx) // sist av spelytorna: inget får ligga över kranens träffyta
    this._buildHint()
    this._buildProgress()

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivå-skalning ------------------------------------------------------

  _applyLevel() {
    // Ett NYTT bad är ett fullt bad: nivån och proppen nollställs med rundan. (Det här är
    // inte en bestraffning — proppen är en lek, och en ny runda ska börja likadant varje
    // gång så barnet känner igen sig.)
    this._surf = SURF_FULL
    this._surfBase = SURF_FULL
    this._disp = 0
    this._wave?.fill(0)
    this._waveV?.fill(0)
    this._waveRest?.fill(0)
    this._waveRestPrev?.fill(0)
    this._waveOn = false
    this._fill = 0
    this._plugOut = false
    this._setPlugView()
    if (this._treasureLayer && !this._treasureLayer.destroyed) this._treasureLayer.y = 0
    if (this._tval) {
      this._tval.bounds.top = TVAL_TOP
      this._tval.bounds.bottom = SURF_FULL + 30
    }
    if (this._waterArea?.hitArea) {
      this._waterArea.hitArea.y = SURF_FULL
      this._waterArea.hitArea.height = FLOOR - SURF_FULL + 20
    }
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    this._bathNow = BATHS[Math.abs(this._level | 0) % BATHS.length]
    this._goalFoam = 70 + this._level * 18
    // Linjen får inte krypa upp i kar-kanten. Skummet ritas i ANDEL av vägen hit
    // (se _drawFoam), så mätaren och skummet når linjen exakt samtidigt — förr
    // bottnade linjen på hög nivå medan _goalFoam fortsatte växa, och då såg badet
    // fullt ut långt innan det var klart.
    this._goalY = clamp(SURFACE_Y - this._goalFoam, GOAL_MIN, SURFACE_Y - 40)
    this._levelBoost = Math.min(this._level * 4, 20) // större standardbubblor på högre nivå
    this._drawTub(this._tubGfx)
    this._drawWater()
    this._drawTint(this._tintGfx)
    this._placeTreasure()
    // Dropparna bär rundans färg — annars regnar ljusblå tvål i ett jordgubbsbad.
    // ⚠️ MEN INTE skumfärgen: `BATHS[0].foam` är `0xffffff`, och vita droppar mot vitt
    // skum är helt osynliga (första försöket gjorde precis det). De ska läsa som
    // uppkastat TVÅLVATTEN, alltså badets vatten draget mot vitt, med vit kant.
    this._tintTval()
    this._tval?.clear() // nytt kar → inga droppar kvar i luften från förra rundan
  },

  // Ankans flytlinje — en FUNKTION av nivån, inte en konstant. Töms badet åker hon med ner.
  _floatY() {
    return this._surf + DUCK_DY
  },

  // ---- Höjdfältet: ytan svarar på det som rör sig i den -------------------

  // ⚠️ FAST TIDSSTEG. Fältet räknar dämpning och fjäder PER STEG. Med ett rörligt steg blir
  // en tappad bildruta en dubbelt så styv fjäder och vågen exploderar, medan ett för litet
  // steg ger en helt annan jämvikt — samma fälla som `Mjukkropp` (se CLAUDE.md). Ackumulatorn
  // stegar därför alltid exakt 1, och taket på 4 steg hindrar en spiral efter en lång paus.
  _updateWave(dt) {
    this._waveAcc += dt
    let n = 0
    while (this._waveAcc >= 1 && n < 4) {
      this._waveAcc -= 1
      this._waveStep()
      n++
    }
    // ⚠️ OMRITNINGEN STYRS AV RÖRELSE, INTE AV UTSLAG. Ankan trycker en vilo-dell i ytan som
    // aldrig går tillbaka till noll så länge hon flyter där — hade omritningen hängt på
    // utslaget hade vattnet ritats om 60 ggr/s för all framtid för en form som står still.
    // En yta som inte RÖR sig behöver inte ritas om, hur böjd den än är.
    let maxH = 0
    let maxV = 0
    for (let i = 0; i < WAVE_N; i++) {
      maxH = Math.max(maxH, Math.abs(this._wave[i] + this._waveRest[i]))
      maxV = Math.max(maxV, Math.abs(this._waveV[i]))
    }
    this._waveOn = maxH > WAVE_REST
    if (maxV > 0.02) {
      this._waveDirty = true
      return true
    }
    if (this._waveDirty) {
      this._waveDirty = false
      return true // en sista omritning så den slutgiltiga formen faktiskt hamnar i bild
    }
    return false
  },

  // ANKANS DELL i ytan — den fördjupning ett flytande föremål trycker ner där det ligger.
  //
  // ⚠️ TVÅ MODELLER PROVADES OCH BÅDA VAR FEL PÅ VAR SITT SÄTT, båda mätta:
  //  1. *En impuls varje bildruta medan hon dras.* Det är en KONSTANT KRAFT, inte en våg:
  //     dämpningen tar 2,8 % per steg, så jämvikten blir insatsen/0,028 ≈ 36×. Ett halvt
  //     sekunds drag pumpade fältet till sitt TAK (uppmätt 20,0 px = `WAVE_MAX`).
  //  2. *Att varje steg dra fältet mot ett måldjup vid hennes x.* Då slåss dellen mot
  //     fjädern som drar tillbaka mot noll, i all evighet — en energiKÄLLA. Uppmätt:
  //     resthastighet 0,367 fyra sekunder efter att allt slutat röra sig, alltså krusningar
  //     som strålar ut för alltid och ett vatten som ritas om varje bildruta för alltid.
  //
  // Rätt modell: dellen är fältets VILOLÄGE, inte en kraft i det. `_wave` bär bara
  // AVVIKELSEN från viloläget och kan därför gå till exakt noll, och vågor uppstår av att
  // viloläget FLYTTAR SIG — en stillastående anka gör inga vågor, en som dras gör vågor i
  // proportion till hur fort hon dras. Det går inte att pumpa, och det tar slut.
  _waveDent() {
    const rest = this._waveRest
    const v = this._waveV
    for (let i = 0; i < WAVE_N; i++) this._waveRestPrev[i] = rest[i]
    rest.fill(0)
    if (this._duck && !this._duck.destroyed) {
      const dopp = clamp(this._duckBase.y - this._floatY(), 0, DUCK_DIP_MAX)
      const djup = 2.2 + dopp * 0.075 // vilo-dell + så mycket djupare när hon trycks ner
      const t = clamp((this._duckBase.x - IN_L) / (IN_R - IN_L), 0, 1) * (WAVE_N - 1)
      const c = Math.round(t)
      for (let k = -2; k <= 2; k++) {
        const i = c + k
        if (i < 0 || i >= WAVE_N) continue
        rest[i] = djup * (1 - Math.abs(k) / 3)
      }
    }
    // Att viloläget flyttar sig är det som skapar vågen. Bounded per bildruta, och exakt
    // noll när hon står stilla.
    for (let i = 0; i < WAVE_N; i++) v[i] += (rest[i] - this._waveRestPrev[i]) * 0.9
  },

  _waveStep() {
    const h = this._wave
    const v = this._waveV
    this._waveDent()
    for (let i = 0; i < WAVE_N; i++) v[i] -= WAVE_K * h[i]
    // Sidledsspridning: varje punkt dras mot medelvärdet av sina grannar. Det är det som
    // gör en lokal stöt till en VÅG som vandrar i stället för en grop som studsar på plats.
    for (let i = 0; i < WAVE_N; i++) {
      const l = h[i > 0 ? i - 1 : 0]
      const r = h[i < WAVE_N - 1 ? i + 1 : WAVE_N - 1]
      v[i] += WAVE_SPREAD * (l + r - 2 * h[i])
    }
    // ⚠️ DÄMPNINGEN SIST, EFTER SPRIDNINGEN. Låg den före (som i första versionen) blev
    // spridningens eget bidrag helt odämpat, och för det snabbaste moden — den där varannan
    // stödpunkt går upp och varannan ner — är `l + r − 2h` lika med −4h. Med två pass gav det
    // en effektiv styvhet på 0,88 per steg mot en dämpning på 0,972: en nästan ostabil
    // svängning vid Nyquist-frekvensen. Uppmätt: resthastighet **0,087** fyra sekunder efter
    // att allt slutat röra sig, alltså ett vatten som darrar och ritas om för alltid.
    for (let i = 0; i < WAVE_N; i++) {
      v[i] *= WAVE_DAMP
      h[i] = clamp(h[i] + v[i], -WAVE_MAX, WAVE_MAX)
    }
  },

  // Stöt in i ytan vid x. Positivt = nedåt (något trycker ner), negativt = uppåt (en bubbla
  // som poppar lyfter ytan).
  _wavePoke(x, kraft) {
    if (!this._wave) return
    const t = (x - IN_L) / (IN_R - IN_L)
    const i = clamp(Math.round(t * (WAVE_N - 1)), 0, WAVE_N - 1)
    this._waveV[i] += kraft
    if (i > 0) this._waveV[i - 1] += kraft * 0.55
    if (i < WAVE_N - 1) this._waveV[i + 1] += kraft * 0.55
    this._waveOn = true
  },

  // Ytans höjd vid x (vilonivån + vågen) — allt som ligger I ytan läser den här.
  _waveAt(x) {
    if (!this._wave || !this._waveOn) return 0
    const t = clamp((x - IN_L) / (IN_R - IN_L), 0, 1) * (WAVE_N - 1)
    const i = Math.floor(t)
    const j = Math.min(WAVE_N - 1, i + 1)
    const f = t - i
    // Ytan = vilolaget (ankans dell) + avvikelsen (vagen). Bada behovs: dellen ensam ar en
    // stilla grop, vagen ensam glommer att nagot FLYTER dar.
    const a = this._wave[i] + this._waveRest[i]
    const b = this._wave[j] + this._waveRest[j]
    return a + (b - a) * f
  },

  // Mållinjen hänger i ytan: skummet mäts från ytan och uppåt, så sjunker vattnet måste
  // linjen sjunka lika mycket, annars går rundan inte att klara med ett halvfullt bad.
  // (`_goalFoam` — alltså SVÅRIGHETEN — rörs inte. Det är bara var linjen RITAS.)
  _recomputeGoal() {
    const SURFACE_Y = this._surf
    this._goalY = clamp(SURFACE_Y - this._goalFoam, GOAL_MIN, SURFACE_Y - 40)
    this._drawGoal()
  },

  // ---- Propp och kran: barnets kontroll över nivån ------------------------
  //
  // Ägaren: *"En propp i botten som dras ut → vattnet rinner ur … gör kranen tryckbar så
  // vattnet fylls på. Ger barnet kontroll över nivån i båda riktningar, vilket spelet i dag
  // saknar helt."*
  //
  // ⚠️ DE TVÅ KONTROLLERNA FÅR ALDRIG SLÅSS. Att låta kranen fylla medan proppen är ur ger
  // ett dragkamps-läge där nivån knappt rör sig och ingendera knappen ser ut att fungera —
  // för ett barn som inte kan läsa är det bara två trasiga knappar. Ett kranpådrag sätter
  // därför tillbaka proppen (synligt, med ljud). Kvar blir en regel som går att lära sig på
  // en runda: kran = mer vatten, propp = mindre.
  _buildPlug(ctx) {
    const c = new Container()
    c.position.set(PLUG.x, PLUG.y)
    // ⚠️ EN SVART GUMMIPROPP FÖRSVINNER I DJUPT VATTEN. Första formen var mörkgrå mot
    // badets mörkaste parti och gick knappt att se — och en kontroll ett barn inte hittar
    // är ingen kontroll. Röd propp med mässingsring: den enda varma fläcken under ytan.
    const g = new Graphics()
    g.roundRect(-26, -22, 52, 32, 14).fill(0xe8503f).stroke({ width: 5, color: 0xb93a2c })
    g.ellipse(0, -22, 26, 10).fill(0xf4705f).stroke({ width: 4, color: 0xb93a2c })
    g.ellipse(-8, -25, 9, 4).fill({ color: 0xffffff, alpha: 0.5 })
    g.circle(0, -38, 11).stroke({ width: 6, color: 0xe0b45c }) // ring att dra i
    g.moveTo(0, -49).lineTo(0, -64).stroke({ width: 5, color: 0xe0b45c, cap: 'round' }) // kedja
    g.eventMode = 'none'
    c.addChild(g)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, -14, 56) // träffyta-diameter 112 px
    this._plugTapH = (e) => this._togglePlug(ctx, e)
    c.on('pointertap', this._plugTapH)
    this._plug = c
    this._root.addChild(c)

    // Virveln över hålet medan det rinner ur — egen Graphics, ritas om per bildruta.
    this._swirlGfx = new Graphics()
    this._swirlGfx.eventMode = 'none'
    this._swirlGfx.visible = false
    this._root.addChild(this._swirlGfx)
  },

  _togglePlug(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    this._plugOut = !this._plugOut
    this._setPlugView()
    if (this._plugOut) {
      this._sound(ctx, 'plopp', 'pop', 'plopp', 90)
      ctx.services.voice.say('Vattnet rinner ut!')
      ripple(ctx.fxLayer, PLUG.x, PLUG.y, { color: COLORS.white, maxR: 70, alpha: 0.5 })
    } else {
      this._sound(ctx, 'plopp', 'soft', 'plopp', 90)
      ctx.services.voice.say('Proppen i!')
      puff(ctx.fxLayer, PLUG.x, PLUG.y, { count: 6, color: 0xbfefff })
    }
  },

  // Proppen LYFTS ur hålet och hänger i sin kedja när den är ute — tillståndet måste synas
  // utan text, annars är den bara en knapp som ibland gör något.
  _setPlugView() {
    const p = this._plug
    if (!p || p.destroyed) return
    // ⚠️ EN URDRAGEN PROPP SKA LIGGA, INTE SVÄVA. Första läget lyfte den 62 px rakt upp i
    // vattnet, där ingenting håller den — den lästes som ett flytande föremål och inte som
    // en propp som är ur. Nu ligger den PÅ karbottnen bredvid sitt hål, lutad.
    gsap.killTweensOf(p)
    this._plugTween = gsap.to(p, {
      y: this._plugOut ? PLUG.y - 4 : PLUG.y,
      x: this._plugOut ? PLUG.x + 62 : PLUG.x,
      rotation: this._plugOut ? 0.62 : 0,
      duration: 0.32,
      ease: 'back.out(2)',
    })
    if (this._swirlGfx && !this._swirlGfx.destroyed) this._swirlGfx.visible = this._plugOut
  },

  // Kranen: knoppen är ett EGET objekt så den kan vridas när man trycker. Träffytan täcker
  // hela kranen, inte bara knoppen — ett barn siktar på "kranen", inte på en ratt.
  _buildTapButton(ctx) {
    const c = new Container()
    const knob = new Graphics()
    knob.circle(0, 0, 16).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    knob.circle(0, 0, 6).fill({ color: 0xffffff, alpha: 0.6 })
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      knob.moveTo(Math.cos(a) * 8, Math.sin(a) * 8).lineTo(Math.cos(a) * 15, Math.sin(a) * 15).stroke({ width: 3, color: COLORS.orangeDark })
    }
    knob.position.set(898, 164)
    knob.eventMode = 'none'
    this._tapKnob = knob
    c.addChild(knob)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(862, 140, 148, 112) // träffyta 148×112 px
    this._tapTapH = (e) => this._openTap(ctx, e)
    c.on('pointertap', this._tapTapH)
    this._tapBtn = c
    this._root.addChild(c)

    this._streamGfx = new Graphics()
    this._streamGfx.eventMode = 'none'
    this._root.addChild(this._streamGfx)
  },

  _openTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    // Ett pådrag sätter tillbaka proppen — se rutan ovan om varför de två aldrig får slåss.
    if (this._plugOut) {
      this._plugOut = false
      this._setPlugView()
    }
    this._fill = Math.min(2.6, this._fill + 1.1)
    if (this._tapKnob && !this._tapKnob.destroyed) {
      gsap.killTweensOf(this._tapKnob)
    this._soapTween?.kill()
    this._soapViews?.forEach((v) => gsap.killTweensOf(v.c))
      gsap.to(this._tapKnob, { rotation: this._tapKnob.rotation + Math.PI, duration: 0.4, ease: 'power2.out' })
    }
    this._sound(ctx, null, 'whoosh', 'kran', 120)
    if (this._surf > SURF_FULL + 6) ctx.services.voice.say('Mer vatten!')
  },

  // ---- Schampoflaskorna: barnet väljer sorts bubblor ----------------------

  _soapNow() {
    return SOAPS[clamp(this._soap | 0, 0, SOAPS.length - 1)]
  },

  // ⚠️ NIVÅBONUSEN LIGGER BARA PÅ MAXET, inte på startstorleken. `_levelBoost` går upp till
  // +20 px, och lagd på den lilla flaskans 17 hade den gjort små bubblor STÖRRE än
  // mellanflaskans egen startstorlek — då är tre flaskor inte tre sorter längre. Bonusen
  // skalas dessutom med flaskan, så den fortsätter betyda lika mycket för var och en.
  _rMin() {
    return this._soapNow().min
  },
  _rMax() {
    const s = this._soapNow()
    return Math.min(R_CEIL, s.max + this._levelBoost * (s.max / R_MAX))
  },

  _buildSoaps(ctx) {
    this._soapViews = []
    this._soapHandlers = []
    // Strålen ritas UNDER flaskorna men över badet — den kommer ju ur flaskan.
    this._pourGfx = new Graphics()
    this._pourGfx.eventMode = 'none'
    this._root.addChild(this._pourGfx)
    this._soapLayer = new Container()
    this._root.addChild(this._soapLayer)
    SOAPS.forEach((s, i) => {
      const c = new Container()
      c.position.set(SOAP_X[i], SOAP_Y)
      const g = new Graphics()
      // Flaskan står PÅ hyllan: allt ritas uppåt från origo (y=0 = hyllans ovansida).
      g.roundRect(-s.w / 2, -s.h, s.w, s.h, s.w * 0.3).fill(s.color).stroke({ width: 3, color: s.dark })
      g.roundRect(-s.w * 0.21, -s.h - 15, s.w * 0.42, 17, 5).fill(s.dark) // kork
      g.roundRect(-s.w * 0.3, -s.h * 0.66, s.w * 0.6, s.h * 0.36, 6).fill({ color: 0xffffff, alpha: 0.75 }) // etikett
      // Bubblor på etiketten säger VILKEN sorts bubblor flaskan ger — bilden bär valet,
      // inte texten (barnet läser inte).
      const br = s.id === 'liten' ? 3 : s.id === 'mellan' ? 5 : 7
      for (const [dx, dy] of [
        [-0.22, -0.5],
        [0.05, -0.56],
        [0.24, -0.44],
      ]) {
        g.circle(s.w * dx, -s.h * 0.5 + s.h * (dy + 0.5) * 0.3, br).fill({ color: s.dark, alpha: 0.85 })
      }
      g.eventMode = 'none'
      c.addChild(g)
      // Vald flaska lyfts och får en ring — tillståndet måste synas utan text.
      const ring = new Graphics()
      ring.roundRect(-s.w / 2 - 9, -s.h - 24, s.w + 18, s.h + 30, 16).stroke({ width: 5, color: COLORS.teal })
      ring.eventMode = 'none'
      ring.visible = false
      c.addChild(ring)
      c.eventMode = 'static'
      c.cursor = 'pointer'
      // P0: träffytan är 96×128 px oavsett hur liten flaskan är RITAD — den lilla flaskan får
      // absolut inte bli svårare att träffa än den stora.
      // ⚠️ BREDDEN ÄR EXAKT 96, INTE MER. P0 kräver BÅDE ≥96 px yta OCH ≥24 px mellan ytorna,
      // och mittpunkterna ligger 120 px isär (`SOAP_X`). 104 px breda ytor gav 16 px lucka —
      // ett P0-brott som såg ut som generositet. 96 + 24 = 120 går exakt ihop.
      c.hitArea = new Rectangle(-48, -116, 96, 128)
      const h = (e) => this._pickSoap(ctx, i, e)
      c.on('pointertap', h)
      this._soapHandlers.push(h)
      this._soapViews.push({ c, ring, s })
      this._soapLayer.addChild(c)
    })
    this._setSoapView()
  },

  _setSoapView() {
    this._soapViews?.forEach((v, i) => {
      const vald = i === this._soap
      if (!v.ring.destroyed) v.ring.visible = vald
      if (!v.c.destroyed) {
        gsap.killTweensOf(v.c)
        gsap.to(v.c, { y: SOAP_Y - (vald ? 8 : 0), duration: 0.24, ease: 'power2.out' })
      }
    })
  },

  _pickSoap(ctx, i, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    this._soap = i
    this._setSoapView()
    const s = SOAPS[i]
    // Flaskan LUTAR sig och häller — utan hällningen är den bara en knapp som byter ett tal.
    const v = this._soapViews[i]
    if (v && !v.c.destroyed) {
      gsap.killTweensOf(v.c)
      this._soapTween = gsap.to(v.c, { rotation: 0.5, duration: 0.22, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
    this._pour = { x: SOAP_X[i], t: 0.85, color: s.color }
    this._sound(ctx, null, 'whoosh', 'hall', 120)
    ctx.services.voice.say(s.say)
    puff(ctx.fxLayer, SOAP_X[i], SOAP_Y + 30, { count: 6, color: s.color })
  },

  // Strålen bubbelmedel ner i badet efter ett flasktryck.
  _drawPour(ctx, dts) {
    const g = this._pourGfx
    if (!g || g.destroyed) return
    g.clear()
    const p = this._pour
    if (!p || p.t <= 0) return
    p.t -= dts
    g.roundRect(p.x - 6, SOAP_Y + 22, 12, this._surf - SOAP_Y - 22, 6).fill({ color: p.color, alpha: 0.8 })
    g.roundRect(p.x - 2, SOAP_Y + 22, 4, this._surf - SOAP_Y - 22, 2).fill({ color: 0xffffff, alpha: 0.45 })
    if (Math.random() < 0.3) ripple(ctx.fxLayer, p.x, this._surf, { color: p.color, maxR: 52, alpha: 0.55 })
  },

  // ---- Gömt fynd i skummet ------------------------------------------------
  // En badleksak ligger gömd i skummet. När skummet stigit förbi den dyker den upp med
  // gnistor och flyter kvar resten av rundan. Leksakssorten cyklar per nivå, så varje
  // runda har NÅGOT NYTT att upptäcka — det var den andra halvan av kritikerns invändning
  // (rundorna såg likadana ut OCH hade inget nytt i sig).
  // Skummets ÖVERKANT just nu. Delas av `_drawFoam` (som ritar den) och `_placeTreasure`
  // (som måste veta om skummet redan ligger över fyndet). Två egna uträkningar av samma sak
  // är exakt hur de två glider isär.
  _foamTop() {
    const frac = clamp(this._foam.level / (this._goalFoam || 1), 0, 1)
    return this._surf - (this._surf - this._goalY - CROWN) * frac
  },

  _placeTreasure() {
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    // Döda gungningen FÖRE vyn rivs — annars skriver den .y på ett förstört objekt.
    this._treasureBob?.kill()
    this._treasureBob = null
    if (this._treasure?.view && !this._treasure.view.destroyed) this._treasure.view.destroy()
    if (!this._treasureLayer || this._treasureLayer.destroyed) return
    const kind = TREASURES[Math.abs(this._level | 0) % TREASURES.length]
    const view = makeTreasure(kind.id)
    // Mellan 35 % och 80 % av vägen upp → alltid efter en stunds spelande, aldrig sist.
    //
    // 🐞 ⚠️ MÄT MOT DET SKUMMET FAKTISKT NÅR, inte mot mållinjen. Spannet gick förut till
    // `_goalY`, men kronan — det som avslöjar fyndet — stannar `CROWN` px under linjen. Ett
    // fynd placerat över ~70 % av vägen kunde alltså ALDRIG hittas: skummet blev fullt,
    // rundan klarades, och leksaken låg kvar osedd. Uppmätt: `_badprobe` punkt 4 föll med
    // fyndet på 76 % (skum 70/70, hittat=false). Buggen är äldre än sidovyn — med den gamla
    // mållinjen låg gränsen på 71 %, alltså träffade den ungefär var femte runda.
    const f = 0.35 + Math.random() * 0.45
    const nabar = SURFACE_Y - this._goalY - CROWN // så högt kronan verkligen kommer
    const y = SURFACE_Y - nabar * f
    // Hoppa över ett band kring Zacke (ZACKE_X 430) — annars ritas leksaken rakt ovanpå
    // honom i stället för bredvid i skummet i ungefär var femte runda.
    const x = Math.random() < 0.35 ? 250 + Math.random() * 90 : 545 + Math.random() * 480
    view.position.set(x, y)
    view.visible = false
    view.eventMode = 'none'
    this._treasureLayer.addChild(view)
    // `armed` skyddar mot att nästa rundas fynd avslöjas av FÖRRA rundans överskottsskum:
    // `_onComplete` pumpar in en pruttsvärm som driver `_foam.level` långt förbi målet, och
    // `_newRound` placerar det nya fyndet innan drän-tweenen hunnit tömma skummet — leksaken
    // avslöjade sig själv i ett tomt kar.
    //
    // 🐞 ⚠️ MEN "ARMERAS AV EN SEDD BILDRUTA" HADE ETT HÅL. Villkoret krävde att en körning av
    // `_drawFoam` observerade skummet UNDER fyndet. Hoppar skummet förbi i ETT steg — och en
    // enda jättebubbla ger upp till 90 skum mot ett mål på 70 — så armeras det aldrig, och
    // leksaken kan då ALDRIG hittas hur fullt badet än blir. Uppmätt: `_badprobe` punkt 4 föll
    // i 2 av 4 körningar med `skum 70/70, hittat=false`.
    // Rätt fråga är inte "har jag SETT skummet under fyndet?" utan "ligger skummet under
    // fyndet NU, när jag placerar det?" — den bär samma skydd utan att bero på en bildruta.
    this._treasure = { view, y, kind, found: false, armed: this._foamTop() > y }
  },

  _checkTreasure(ctx, foamTop) {
    const t = this._treasure
    if (!t || t.found || !t.view || t.view.destroyed) return
    // ⚠️ RÄKNA I FYNDLAGRETS EGEN RAM. Fyndet placeras alltid i ett fullt bad, men lagret
    // skjuts med nivån när badet töms — jämförs skummets världs-y mot fyndets lager-y
    // "hittas" fyndet av en tömning i stället för av skum.
    foamTop -= this._surf - SURF_FULL
    if (foamTop > t.y) {
      t.armed = true // skummet ligger under fyndet — nu räknas en stigning förbi det
      return
    }
    if (!t.armed) return
    t.found = true
    t.view.visible = true
    t.view.scale.set(0.3)
    const tw = gsap.to(t.view.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(2.2)' })
    this._tweens?.push(tw)
    sparkle(ctx.fxLayer, t.view.x, t.view.y, { count: 12 })
    puff(ctx.fxLayer, t.view.x, t.view.y, { count: 8 })
    this._sound(ctx, null, 'reveal', 'reveal', 0)
    ctx.services.voice.say(t.kind.say)
    const bob = gsap.to(t.view, { y: t.view.y - 10, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    this._tweens?.push(bob)
    this._treasureBob = bob
  },

  // ---- Ljud med min-intervall (anti-distorsion) ---------------------------
  // Strypt per nyckel så att tick-/kontakt-ljud (pop, studs) ALDRIG kan staplas
  // 60 ggr/s till klippning/distorsion. sample-klipp först, annars syntes-fallback.
  _sound(ctx, sampleKey, fallback, key = sampleKey || fallback, minMs = 120) {
    if (!this._alive) return
    const now = performance.now()
    const last = this._lastSfx[key] || 0
    if (now - last < minMs) return
    this._lastSfx[key] = now
    const a = ctx?.services?.audio
    if (!a) return
    if (!sampleKey || !a.sample(sampleKey)) a.sfx(fallback)
  },

  // ---- Scenbyggen ---------------------------------------------------------

  // Kaklat badrum: kakelvägg, golv, hylla med badgrejer, handduk och en kran
  // som droppar ner i badet. Scenen ska kännas som ett rum, inte en gradient.
  _buildBathroom() {
    const g = new Graphics()

    // Kakelvägg — förskjutna rader, mjuka fogar (gradienten lyser svagt igenom).
    const TILE = 82
    for (let row = -2; row * TILE < 660; row++) {
      const ty = row * TILE
      const off = (row & 1) * (TILE / 2)
      for (let col = -1; col * TILE + off < 1300; col++) {
        const tx = col * TILE + off
        g.roundRect(tx + 3, ty + 3, TILE - 6, TILE - 6, 10).fill({ color: 0xeaf6fb, alpha: 0.9 })
      }
    }

    // Golv.
    // Badrumsgolvet lag pa 61 880 px i EN ton (`_plattprobe --medbakgrund`) — spelets
    // storsta falt. Dampad ramp: ytan ar nastan vit och standardvardena (kalibrerade for
    // mellanmorkt) hade gjort den smutsgra. Se lib/form.js.
    // ⚠️ GOLVLINJEN FLYTTADES 622 → 640 och karets botten upp till 624: karet gick förut
    // ner GENOM golvet, vilket ensamt gör en sidovy oläslig. Nu står det framför skarven
    // med fötterna på golvytan, och golvet syns under karet mellan fötterna.
    g.rect(0, ROOM_FLOOR, 1280, 720 - ROOM_FLOOR).fill(groundFill(0xdfe7ea, { light: 0.06, dark: 0.1 }))
    g.rect(0, ROOM_FLOOR, 1280, 9).fill(0xc4d5dc)
    for (let x = 40; x < 1280; x += 128) g.rect(x, ROOM_FLOOR + 9, 5, 720 - ROOM_FLOOR - 9).fill({ color: 0xc4d5dc, alpha: 0.7 })

    // Hyllan ovanför karet (fri från Zackes hår och mållinjens flagga). Bredare än förut:
    // tre flaskor med P0:s träffytor kräver 120 px mellan mittpunkterna, alltså 340 px hylla.
    // Tvålen och leksaksbåten som stod här är borta med flit — hyllan är numera INTERAKTIV,
    // och inerta prylar mellan tre knappar lär bara barnet att trycka på fel sak.
    g.roundRect(506, SOAP_Y, 340, 15, 7).fill(0xe8d3b0).stroke({ width: 3, color: 0xc9ac82 })
    g.roundRect(516, SOAP_Y + 15, 10, 26, 4).fill(0xc9ac82) // hyllkonsoler
    g.roundRect(826, SOAP_Y + 15, 10, 26, 4).fill(0xc9ac82)
    // Tvålen flyttade ner till kar-kanten (den är dekor, inte en knapp).
    g.roundRect(232, 206, 56, 28, 13).fill(0xfff3c4).stroke({ width: 3, color: 0xe2cf8e })
    g.ellipse(250, 215, 12, 6).fill({ color: 0xffffff, alpha: 0.8 })

    // Handduk på stång (fyller den tomma vänsterväggen).
    g.roundRect(46, 150, 128, 13, 6).fill(0xc9d6dd).stroke({ width: 3, color: 0xa2b4bd })
    g.circle(48, 156, 8).fill(0xa2b4bd)
    g.circle(172, 156, 8).fill(0xa2b4bd)
    g.roundRect(56, 158, 108, 214, 20).fill(0xffd9e6).stroke({ width: 4, color: 0xf0adc8 })
    g.roundRect(80, 164, 9, 200, 4).fill({ color: 0xf0adc8, alpha: 0.55 })
    g.roundRect(112, 164, 9, 200, 4).fill({ color: 0xf0adc8, alpha: 0.55 })
    g.roundRect(64, 348, 92, 16, 8).fill({ color: 0xf0adc8, alpha: 0.45 })

    // Kran över badet — pip pekar ner i vattnet (droppen ritas separat). Lyft 12 px när
    // rullkanten blev en rulle: pipen slutade annars INNE i kanten och kranen såg avklippt ut.
    g.roundRect(880, 172, 36, 36, 11).fill(0xc9d6dd).stroke({ width: 3, color: 0x9fb2bb })
    g.roundRect(898, 182, 88, 17, 8).fill(0xe4edf1).stroke({ width: 3, color: 0xb4c4cc })
    g.roundRect(962, 190, 17, 46, 8).fill(0xe4edf1).stroke({ width: 3, color: 0xb4c4cc })
    // Knoppen ritas INTE här utan i `_buildTapButton` — den ska kunna vridas när man
    // trycker, och det som ligger i den här stora statiska Graphics:en kan inte röra sig.

    g.eventMode = 'none'
    this._root.addChild(g)

    this._dripGfx = new Graphics()
    this._dripGfx.eventMode = 'none'
    this._root.addChild(this._dripGfx)
  },

  // Badsorten läses ur ett LAGRAT värde, inte ur this._level direkt. _level ökar i samma
  // stund rundan klaras, men karet målas om först 1,5 s senare i _newRound — läste skummet
  // nivån live blev det rosa skum över blått vatten under hela firandet. Nu byter allt
  // samtidigt, i _applyLevel.
  _bath() {
    return this._bathNow || BATHS[0]
  },

  _buildTub() {
    const g = new Graphics()
    this._tubGfx = g
    this._drawTub(g)
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  // Bryts ut ur _buildTub så badet kan MÅLAS OM när nivån byts (badsorten cyklar).
  //
  // Karet ritas i TVÅ lager på var sin sida om innehållet: här ligger det man ser BAKOM
  // vattnet (fötter, gavlar, bakvägg, vatten), och i `_buildTubRim` det man ser FRAMFÖR
  // (kanten, silhuetten, glasglansen). Sidan mot kameran har alltså ingen fyllning alls —
  // det är hela poängen: man ser rakt igenom den.
  _drawTub(g) {
    if (!g || g.destroyed) return
    g.clear()

    // ⓵ FÖTTERNA, ritade först så att skalet täcker deras fästen. Att de FANNS var värt
    // noll förut — karet gick till y 680 och låg över dem. En fot mot ett golv är den
    // billigaste sidovy-signalen som finns: den säger att karet STÅR i ett rum.
    //
    // ⚠️ ATT RITA FÖTTERNA RÄCKTE INTE. De bar porslinets `0xdfe7ea` — exakt golvets egen
    // baston — så de gick knappt att skilja från underlaget: uppmätt skilde bara 14 av 30
    // rader i fotens kolumn mer än tröskeln från golvet bredvid. Den starkaste sidovy-
    // signalen låg alltså och var osynlig. Nu är fötterna i skugga (mörkare porslin) och
    // står i en KONTAKTSKUGGA — det är skuggan som binder ihop fot och golv.
    // ⚠️ EN PLATT TON RÄCKTE INTE HELLER. Med en flat fot mätte skillnaden mot golvet
    // bredvid 21 — under tröskeln, alltså fortfarande på gränsen till osynlig, eftersom
    // karets egen skugga mörkar golvet till nästan exakt fotens ton. Foten behöver VOLYM
    // (ljus upptill, skugga nedtill) och en kontur som håller, precis som allt annat i
    // spelet: det är samma D1-lärdom som golvet och karinsidan redan fått.
    g.ellipse(640, 680, 428, 17).fill({ color: 0x8fa8b4, alpha: 0.11 })
    for (const fx of [258, 1022]) g.ellipse(fx, 681, 48, 13).fill({ color: 0x6f8b99, alpha: 0.3 })
    for (const fx of [258, 1022]) {
      g.moveTo(fx - 30, 586)
        .lineTo(fx + 30, 586)
        .lineTo(fx + 21, 660)
        .quadraticCurveTo(fx + 31, 682, fx, 682)
        .quadraticCurveTo(fx - 31, 682, fx - 21, 660)
        .closePath()
        .fill(groundFill(0xcfe0e8, { light: 0.08, dark: 0.24 }))
        .stroke({ width: 6, color: 0x8ba4b1 })
      g.roundRect(fx - 15, 600, 9, 58, 4).fill({ color: 0xffffff, alpha: 0.45 }) // porslinsglans
    }

    // ⓶ PORSLINSSKALET: gavlarna och botten, sedda rakt från sidan. Skalet är en RAM,
    // inte en låda — framsidan saknas med flit.
    tubPath(g, TUB_TOP + 6, OUT_BOT, -SHELL, 70).fill(groundFill(0xf1f7fa, { light: 0.03, dark: 0.1 }))

    // ⓷ BAKVÄGGEN — det man ser igenom framsidan ovanför vattnet. Utan den ritas VITT
    // skum mot VITT porslin och blir praktiskt taget osynligt.
    // Badkarets insida lag pa 56 535 px i EN ton (`_plattprobe --medbakgrund`) — spelets
    // storsta falt sedan golvet tonades i 745ff36. Dampad ramp: ytan ar nastan vit.
    // Toningen morknar nedat, vilket ocksa ar ratt for en karinsida (ljuset kommer uppifran
    // och botten ligger i skugga). Se lib/form.js.
    tubPath(g, IN_TOP, TUB_BOT, 0, 54).fill(groundFill(0xdaeaf3, { light: 0.05, dark: 0.12 }))

    // Skuggan som rullkanten kastar NER på bakväggen. Den lilla remsan är det som gör
    // insidan till en vägg med ett djup framför sig i stället för en platt ton.
    g.rect(IN_L + 5, IN_TOP, IN_R - IN_L - 10, 26).fill(verticalFillAlpha(0x5f8ea6, 0x5f8ea6, 0.22, 0))

    // Bräddavloppet i bakväggen. Det går bara att förstå i sidovy — alltså är det i sig
    // en signal om vilken vy man tittar på, inte bara en detalj.
    g.ellipse(1016, 298, 17, 12).fill(0xc3d4dc).stroke({ width: 3, color: 0x9db4bf })
    g.ellipse(1016, 298, 9, 6).fill(0x93aab6)

    // ⓹ AVLOPPSHÅLET i karbottnen — proppen ritas ovanpå det (`_buildPlug`). Ritas här,
    // alltså UNDER vattnet, så hålet ligger i badet och inte ovanpå det.
    g.ellipse(PLUG.x, PLUG.y, 30, 13).fill(0x8ea6b2).stroke({ width: 4, color: 0x7b909b })
    g.ellipse(PLUG.x, PLUG.y + 1, 21, 8).fill(0x53656f)
  },

  // VATTNET fyller karets INSIDA (samma kontur, 6 px innanför porslinet) — inte en egen
  // rundad rektangel. Det bär sitt djup i toningens STOPP: ljusare vid ytan, mörkare mot
  // botten, med samma genomskinlighet som den gamla platta alpha 0.5 i mitten.
  //
  // ⚠️ EGEN GRAPHICS, inte en del av `_drawTub`. Nivån rör sig numera varje bildruta medan
  // det rinner ur eller fylls på, och att rita om fötter, skal, bakvägg och skuggor 60 ggr/s
  // för att flytta EN kant vore att betala hela karet för vattnets skull.
  _buildWater() {
    const g = new Graphics()
    this._waterGfx = g
    g.eventMode = 'none'
    this._root.addChild(g)
    this._drawWater()
  },

  _drawWater() {
    const g = this._waterGfx
    if (!g || g.destroyed) return
    g.clear()
    const s = this._surf
    if (s >= TUB_BOT - 12) return
    const vag = this._waveOn ? (x) => this._waveAt(x) : null
    tubPath(g, s, TUB_BOT - 4, 6, 48, vag).fill(verticalFillAlpha(this._bath().water, this._bath().water, 0.3, 0.62))
  },

  // Vattentoning över allt som är UNDER ytan → Zackes kropp och ankan ser
  // nedsänkta ut, medan huvudet ovanför ytan förblir skarpt.
  _buildTint() {
    const g = new Graphics()
    this._tintGfx = g
    this._drawTint(g)
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _drawTint(g) {
    if (!g || g.destroyed) return
    g.clear()
    const SURFACE_Y = this._surf // lokalt alias: allt under läser den LEVANDE ytan
    if (SURFACE_Y >= TUB_BOT - 12) return
    const vag = this._waveOn ? (x) => this._waveAt(x) : null
    tubPath(g, SURFACE_Y, TUB_BOT - 4, 6, 48, vag).fill({ color: this._bath().tint, alpha: 0.28 })
    // VATTENYTAN. I sidovy är den här linjen scenens viktigaste streck — den är vad som
    // gör "under vattnet" och "ovanför vattnet" till två olika ställen. Den låg på
    // alpha 0.3 och gick knappt att se i skärmdumpen; nu är den en riktig yta med en
    // ljus ovansida och en skuggad undersida — och den FÖLJER vågen, annars ligger ett
    // rakt streck tvärs över ett böljande vatten.
    const x0 = innerL(SURFACE_Y) + 6
    const x1 = innerR(SURFACE_Y) - 6
    const linje = (dy, w, col, a) => {
      g.moveTo(x0, SURFACE_Y + dy + (vag ? vag(x0) : 0))
      for (let x = x0 + 22; x < x1; x += 22) g.lineTo(x, SURFACE_Y + dy + (vag ? vag(x) : 0))
      g.lineTo(x1, SURFACE_Y + dy + (vag ? vag(x1) : 0)).stroke({ width: w, color: col, alpha: a })
    }
    linje(0, 6, 0xffffff, 0.7)
    linje(5, 5, this._bath().tint, 0.35)
  },

  // FRAMSIDAN mot kameran. Den har ingen fyllning — man ser rakt igenom den — så det
  // enda som ritas är vad en glasvägg faktiskt visar: sin egen kant och sin egen glans.
  // Lagret ligger framför Zacke, skummet och fyndet, alltså sitter han I karet och
  // skummet kan inte rinna ut över kanten visuellt.
  _buildTubRim() {
    const g = new Graphics()

    // Glansstrecken sitter vid VÄNSTERGAVELN: höger sida är ankans och kranens, och en
    // glans över dem hade lästs som ett föremål i stället för som en yta.
    g.roundRect(236, 318, 15, 226, 8).fill({ color: 0xffffff, alpha: 0.16 })
    g.roundRect(262, 338, 7, 190, 4).fill({ color: 0xffffff, alpha: 0.11 })

    // Insidans kant fångar ljus. Den linjen är vad ögat läser som "det finns en ruta här",
    // och den är hela skillnaden mellan en genomskinlig vägg och ingen vägg alls.
    tubPath(g, IN_TOP + 4, TUB_BOT - 4, 5, 50).stroke({ width: 3, color: 0xffffff, alpha: 0.42 })

    // Silhuetten — ägarens andra krav: kanterna ska synas TYDLIGT och bära badkarets form.
    tubPath(g, TUB_TOP + 6, OUT_BOT, -SHELL, 70).stroke({ width: 11, color: COLORS.teal })

    // Rullkanten. Överhänget åt båda hållen är det som gör att den läser som en KANT man
    // kan hänga armen över, inte som en tjock ram runt en bild.
    const RL = IN_L - SHELL - 12,
      RR = IN_R + SHELL + 12
    g.roundRect(RL, TUB_TOP, RR - RL, RIM_H, RIM_H / 2).fill(0xf7fbfc).stroke({ width: 6, color: COLORS.teal })
    g.roundRect(RL + 14, TUB_TOP + 4, RR - RL - 28, 6, 3).fill({ color: 0xffffff, alpha: 0.75 }) // kant-glans

    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildBubbleLayer() {
    this._bubbleLayer = new Container()
    this._bubbleLayer.eventMode = 'passive' // 'none' skär bort hela subträdet från händelser
    this._root.addChild(this._bubbleLayer)
  },

  _buildGoal() {
    this._goalGfx = new Graphics()
    this._goalGfx.eventMode = 'none'
    this._root.addChild(this._goalGfx)

    // Ritad målflagga (rutig duk på stång) i stället för en 🏁-emoji.
    const flag = new Container()
    const f = new Graphics()
    f.roundRect(-3, -56, 6, 62, 3).fill(0xb9832f) // stång
    const CS = 11
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const dark = (r + c) % 2 === 0
        f.rect(3 + c * CS, -54 + r * CS, CS, CS).fill(dark ? COLORS.ink : COLORS.white)
      }
    }
    f.rect(3, -54, 4 * CS, 3 * CS).stroke({ width: 2.5, color: COLORS.ink, alpha: 0.55 })
    f.circle(0, -58, 5).fill(COLORS.orange)
    f.eventMode = 'none'
    flag.addChild(f)
    flag.eventMode = 'none'
    this._goalMarker = flag
    this._root.addChild(flag)

    this._drawGoal()
    this._goalPulse = breathe(this._goalMarker, { scale: 1.16, duration: 1 }) // drar blicken till mållinjen
  },

  _drawGoal() {
    const g = this._goalGfx
    if (!g || g.destroyed) return
    g.clear()
    // Tydlig prickad mållinje "fyll skummet hit" — mörk kärna så den syns mot porslinet.
    for (let x = 240; x <= 1006; x += 30) {
      g.circle(x, this._goalY, 7).fill({ color: COLORS.teal, alpha: 0.85 })
      g.circle(x, this._goalY, 4).fill({ color: COLORS.white, alpha: 0.95 })
    }
    if (this._goalMarker && !this._goalMarker.destroyed) this._goalMarker.position.set(1042, this._goalY)
  },

  // Skum-mätare till höger om karet: en tydlig "hur full är jag"-stapel utan läsning.
  // Stjärnan i toppen = målet; den vita fyllningen stiger mot den när skummet växer.
  _buildProgress() {
    this._progGfx = new Graphics()
    this._progGfx.eventMode = 'none'
    this._root.addChild(this._progGfx)

    // Ritad stjärna i stället för ⭐-emoji.
    const s = new Graphics()
    s.star(0, 0, 5, 25, 12).fill(COLORS.yellow).stroke({ width: 4, color: 0xe0a92c })
    s.star(0, -3, 5, 12, 6).fill({ color: 0xfff0b8, alpha: 0.85 })
    s.eventMode = 'none'
    s.position.set(1164, 230)
    this._progStar = s
    this._root.addChild(s)

    this._drawProgress()
  },

  _drawProgress() {
    const g = this._progGfx
    if (!g || g.destroyed) return
    const X = 1146,
      W = 36,
      TOP = 262,
      BOT = 604,
      H = BOT - TOP
    g.clear()
    g.roundRect(X, TOP, W, H, 18).fill({ color: COLORS.white, alpha: 0.55 }).stroke({ width: 5, color: COLORS.teal, alpha: 0.7 })
    const frac = clamp((this._foam.level || 0) / (this._goalFoam || 1), 0, 1)
    const fh = H * frac
    if (fh > 3) {
      g.roundRect(X + 4, BOT - fh, W - 8, fh, 12).fill({ color: 0xffffff, alpha: 0.97 })
      g.circle(X + W / 2, BOT - fh, 12).fill({ color: 0xffffff, alpha: 0.99 }) // bubblig topp
      g.circle(X + W / 2 - 7, BOT - fh - 6, 6).fill({ color: 0xffffff, alpha: 0.9 })
    }
  },

  _buildFoam() {
    this._foamGfx = new Graphics()
    this._foamGfx.eventMode = 'none'
    this._root.addChild(this._foamGfx)
    this._drawFoam()
  },

  // Skummet JÄSER: ytan är en rad överlappande bubbeltoppar vars radier andas med
  // _foamPhase, plus mikrobubblor som poppar upp i kroppen. Aldrig en vit klump.
  _drawFoam() {
    this._drawProgress()
    const g = this._foamGfx
    if (!g || g.destroyed) return
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    g.clear()
    if (this._foam.level <= 0) return
    // Andel av vägen till linjen — samma tal som mätaren visar. CROWN är hur högt
    // bubbeltopparna sticker upp över skumkroppen; dras av här så att KRONAN (det
    // öga faktiskt läser som "skummets höjd") möter linjen exakt när mätaren är full.
    const top = this._foamTop()
    // Har skummet stigit förbi det gömda fyndet? Då dyker det upp.
    if (this._ctx) this._checkTreasure(this._ctx, top)
    const ph = this._foamPhase

    // Skumkropp.
    g.roundRect(208, top, 864, SURFACE_Y - top + 30, 26).fill({ color: this._bath().foam, alpha: 0.88 })
    // Jäsande toppar (håller sig innanför kar-kanten även när badet är fullt).
    for (let i = 0; i * 42 <= 836; i++) {
      const x = 232 + i * 42
      const r = 20 + Math.sin(ph * 1.6 + i * 0.9) * 5
      g.circle(x, top + 8 + Math.sin(ph + i * 0.55) * 3, r).fill({ color: this._bath().foam, alpha: 0.94 })
    }
    // Mikrobubblor inuti skummet.
    const depth = SURFACE_Y - top + 24
    for (let i = 0; i < 16; i++) {
      const x = 240 + ((i * 337) % 800)
      const t = (ph * 0.5 + i * 0.37) % 1
      const y = top + 12 + t * depth
      if (y > SURFACE_Y + 26) continue
      g.circle(x, y, 3.5 + (i % 3)).fill({ color: 0xd8f0fa, alpha: 0.55 * (1 - t) + 0.2 })
    }
  },

  // Osynlig träffzon över vattnet — alltid kul plopp (ligger UNDER Zacke/anka i z).
  _buildWaterTap(ctx) {
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    const area = new Container()
    area.hitArea = new Rectangle(200, SURFACE_Y, 880, FLOOR - SURFACE_Y + 20)
    area.eventMode = 'static'
    this._waterTapHandler = (e) => this._waterTap(ctx, e)
    area.on('pointertap', this._waterTapHandler)
    this._waterArea = area
    this._root.addChild(area)
  },

  // ---- Zacke: en riktig unge i badet, inte en orange boll -----------------

  _buildZacke(ctx) {
    const z = new Container()
    z.position.set(ZACKE_X, ZACKE_Y)

    // BEN UNDER VATTNET. En genomskinlig framsida är värd noll om det inte finns något
    // att se igenom den — förut slutade Zacke vid y 420 och de nedersta 190 px av badet
    // var ett tomt blått fält. Nu sitter han i karet med knäna uppdragna och fötterna nära
    // botten, ritat FÖRE kroppen (höfterna göms bakom magen) och FÖRE vattentoningen
    // (benen läses som nedsänkta, huvudet ovanför ytan förblir skarpt).
    // ⚠️ BENEN FÅR INTE MÖTAS I BOTTEN. Första formen svängde ut i knäna och tillbaka in
    // mot fötterna — de två benen slöt ihop till en RING som läste som en grå badring runt
    // magen, inte som ben. Vägen går nu ner och svagt utåt hela vägen, och fötterna står
    // isär: silhuetten mellan benen är lika viktig som benen själva.
    // ⚠️ FÖTTERNA MÅSTE NÅ KARETS BOTTEN. Ben som slutar mitt i vattnet gör honom till en
    // hängande docka — det finns inget som bär honom, och blicken letar efter golvet i
    // stället för att läsa scenen. Han står på karbottnen med vattnet i brösthöjd, vilket
    // också är den enda tolkning som är konsekvent med hur djupt karet är ritat.
    const legs = new Graphics()
    for (const s of [-1, 1]) {
      const path = (gg) => gg.moveTo(s * 22, 40).quadraticCurveTo(s * 62, 140, s * 46, 250)
      path(legs).stroke({ width: 46, color: SKIN_OUT, cap: 'round' }) // kontur
      path(legs).stroke({ width: 38, color: SKIN, cap: 'round' })
    }
    // ⚠️ INGA RITADE KNÄN. En cirkel på benet läses som en LED på en docka, inte som ett
    // knä — vägen böjer sig redan där knäet sitter, och det är den böjen ögat läser.
    for (const s of [-1, 1]) {
      legs.ellipse(s * 48, 258, 27, 15).fill(SKIN).stroke({ width: 4, color: SKIN_OUT })
      legs.ellipse(s * 48, 254, 13, 6).fill({ color: 0xffffff, alpha: 0.25 })
    }
    legs.eventMode = 'none'
    z.addChild(legs)

    const b = new Graphics()
    const OUT = SKIN_OUT
    // Kropp.
    b.roundRect(-64, -78, 128, 168, 46).fill(SKIN).stroke({ width: 5, color: OUT })
    // Mage-glans = "tryck här" (liten och mjuk; en stor ljus fläck blekte ut hela kroppen).
    b.circle(0, 10, 38).fill({ color: 0xfff3e2, alpha: 0.5 })
    b.circle(-15, -2, 14).fill({ color: 0xffffff, alpha: 0.4 })
    // Navel.
    b.circle(0, 24, 7).fill({ color: OUT, alpha: 0.95 })
    // Hals.
    b.roundRect(-21, -104, 42, 40, 15).fill(SKIN_DARK)
    // Öron (bakom huvudet).
    b.circle(-54, -134, 15).fill(SKIN).stroke({ width: 4, color: OUT })
    b.circle(54, -134, 15).fill(SKIN).stroke({ width: 4, color: OUT })
    // Huvud.
    b.circle(0, -140, 54).fill(SKIN).stroke({ width: 5, color: OUT })
    z.addChild(b)

    // Armar FRAMFÖR kroppen (bakom den syntes bara händerna som två nubbar) — egna
    // containrar med axeln som pivot så de kan plaska.
    this._armL = this._makeArm(1)
    this._armL.position.set(-52, -50)
    this._armL.rotation = 0.5
    this._armR = this._makeArm(-1)
    this._armR.position.set(52, -50)
    this._armR.rotation = -0.5
    z.addChild(this._armL, this._armR)

    // Ansikte (egen Graphics — ritas om per min).
    const face = new Graphics()
    face.eventMode = 'none'
    z.addChild(face)
    this._face = face

    // Vått, tofsigt hår. Kalotten följer SKALLEN (en ellips-kalott lägger sig antingen
    // över ögonen eller lämnar tinningarna kala) och luggen slutar en bit ovanför dem.
    const h = new Graphics()
    arcPath(h, 0, -140, 57, 2.79, 6.63)
      .quadraticCurveTo(30, -152, 6, -172)
      .quadraticCurveTo(-18, -152, -52, -121)
      .closePath()
      .fill(HAIR)
    h.moveTo(-30, -186).quadraticCurveTo(-30, -222, -4, -200).closePath().fill(HAIR)
    h.moveTo(-2, -196).quadraticCurveTo(14, -226, 32, -192).closePath().fill(HAIR)
    h.moveTo(26, -190).quadraticCurveTo(52, -206, 50, -176).closePath().fill(HAIR)
    h.moveTo(-50, -176).quadraticCurveTo(-56, -202, -32, -190).closePath().fill(HAIR)
    h.ellipse(-16, -180, 16, 7).fill({ color: 0xffffff, alpha: 0.25 }) // blöt glans
    h.eventMode = 'none'
    z.addChild(h)

    // Skum-skägg (visas när badet nästan är fullt).
    const beard = new Graphics()
    beard.circle(-36, -94, 17).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(-13, -85, 20).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(13, -85, 20).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(36, -94, 17).fill({ color: 0xffffff, alpha: 0.95 })
    beard.circle(0, -72, 16).fill({ color: 0xffffff, alpha: 0.95 })
    beard.eventMode = 'none'
    beard.visible = false
    this._beard = beard
    z.addChild(beard)

    this._drawFace('glad')

    z.eventMode = 'static'
    z.cursor = 'pointer'
    z.hitArea = new Circle(0, -20, 96) // träffyta-diameter 192px ≫ 96px
    this._zackeDown = (e) => this._zackePointerDown(ctx, e)
    this._zackeUp = () => this._releaseBubble(ctx)
    z.on('pointerdown', this._zackeDown)
    z.on('pointerup', this._zackeUp)
    z.on('pointerupoutside', this._zackeUp)
    this._zacke = z
    this._root.addChild(z)
  },

  _makeArm(side) {
    const c = new Container()
    const g = new Graphics()
    // Samma konturstyrka som kroppen — en ljusare stroke här gjorde att armarna
    // smälte ihop med torson till en enda blek klump under vattentoningen.
    g.roundRect(-12, -12, 24, 78, 12).fill(SKIN).stroke({ width: 5, color: SKIN_OUT })
    g.circle(0, 72, 16).fill(SKIN).stroke({ width: 5, color: SKIN_OUT })
    g.circle(side * 4, 70, 5).fill({ color: SKIN_OUT, alpha: 0.6 })
    g.eventMode = 'none'
    c.addChild(g)
    c.eventMode = 'none'
    return c
  },

  // Fyra riktiga miner: glad (vila) · fniss (pop) · wow (jättebubbla) · jubel (fullt bad).
  _drawFace(mood) {
    const g = this._face
    if (!g || g.destroyed) return
    this._mood = mood
    const ink = COLORS.ink
    const cheek = { color: 0xffb0b0, alpha: 0.65 }
    const HY = -140 // huvudets centrum
    g.clear()

    if (mood === 'wow') {
      g.circle(-21, HY - 2, 11).fill(COLORS.white).circle(21, HY - 2, 11).fill(COLORS.white)
      g.circle(-21, HY - 2, 6).fill(ink).circle(21, HY - 2, 6).fill(ink)
      g.circle(-37, HY + 14, 11).fill(cheek).circle(37, HY + 14, 11).fill(cheek)
      g.ellipse(0, HY + 22, 11, 14).fill(0x9a5b3b)
      return
    }

    if (mood === 'jubel') {
      arcPath(g, -21, HY, 10, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      arcPath(g, 21, HY, 10, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      g.circle(-38, HY + 14, 12).fill(cheek).circle(38, HY + 14, 12).fill(cheek)
      g.moveTo(-22, HY + 12).quadraticCurveTo(0, HY + 40, 22, HY + 12).closePath().fill(0x9a5b3b)
      g.moveTo(-11, HY + 26).quadraticCurveTo(0, HY + 36, 11, HY + 26).closePath().fill(COLORS.pink)
      return
    }

    if (mood === 'fniss') {
      arcPath(g, -21, HY, 9, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      arcPath(g, 21, HY, 9, Math.PI, 2 * Math.PI).stroke({ width: 5, color: ink, cap: 'round' })
      g.circle(-38, HY + 14, 12).fill(cheek).circle(38, HY + 14, 12).fill(cheek)
      g.moveTo(-17, HY + 14).quadraticCurveTo(0, HY + 34, 17, HY + 14).closePath().fill(0x9a5b3b)
      return
    }

    // glad (vila)
    g.circle(-21, HY - 2, 10).fill(COLORS.white).circle(21, HY - 2, 10).fill(COLORS.white)
    g.circle(-20, HY, 6).fill(ink).circle(22, HY, 6).fill(ink)
    g.circle(-23, HY - 4, 3).fill(COLORS.white).circle(19, HY - 4, 3).fill(COLORS.white)
    g.circle(-37, HY + 14, 11).fill(cheek).circle(37, HY + 14, 11).fill(cheek)
    arcPath(g, 0, HY + 10, 19, 0.16 * Math.PI, 0.84 * Math.PI).stroke({ width: 6, color: ink, cap: 'round' })
  },

  // Sätt min i N sekunder, återgå sedan till glad (tickern räknar ner).
  _setMood(mood, hold = 1.1) {
    if (!this._alive) return
    this._drawFace(mood)
    this._moodHold = hold
  },

  // ---- Inbjudande hand (visas vid idle, försvinner vid första trycket) ----

  _buildHint() {
    const c = new Container()
    const g = new Graphics()
    g.circle(0, 0, 46).fill({ color: 0xffffff, alpha: 0.3 })
    g.circle(0, 0, 46).stroke({ width: 5, color: 0xffffff, alpha: 0.85 })
    // Pekande hand.
    g.roundRect(-13, -6, 26, 34, 13).fill(0xffe0bd).stroke({ width: 3.5, color: 0xdca873 })
    g.roundRect(-7, -34, 14, 30, 7).fill(0xffe0bd).stroke({ width: 3.5, color: 0xdca873 })
    g.eventMode = 'none'
    c.addChild(g)
    c.position.set(ZACKE_X, ZACKE_Y + 10)
    c.eventMode = 'none'
    c.visible = false
    this._hint = c
    this._root.addChild(c)
  },

  _showHint() {
    const h = this._hint
    if (!h || h.destroyed || h.visible) return
    h.visible = true
    h.alpha = 0
    h.scale.set(0.8)
    gsap.to(h, { alpha: 1, duration: 0.25 })
    gsap.to(h.scale, { x: 1.12, y: 1.12, duration: 0.62, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  _hideHint() {
    const h = this._hint
    if (!h || h.destroyed || !h.visible) return
    gsap.killTweensOf(h.scale)
    gsap.to(h, { alpha: 0, duration: 0.2, onComplete: () => !h.destroyed && (h.visible = false) })
  },

  // ---- Mage: tryck/håll → bubbla -----------------------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _zackePointerDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, WALL_L + 30, WALL_R - 30)
    this._held = true
    // Laddnings-bubbla vid tryckpunkten på karbotten.
    const view = this._makeBubbleView()
    const r = this._rMin()
    view.scale.set(r / BASE)
    view.position.set(x, FLOOR - 30)
    this._bubbleLayer.addChild(view)
    this._charging = { x, r, view }
    // Riktig prutt (<100ms) eller mjuk syntes — strypt så snabba tryck inte staplas.
    this._sound(ctx, 'fart', 'soft', 'fart', 70)
    pop(this._zacke)
    this._setMood('fniss', 0.9)
    this._splash()
    if (!this._firstPrutt) {
      this._firstPrutt = true
      ctx.services.voice.say('Pruttbubblor!')
    }
  },

  // Armarna plaskar till i vattnet.
  _splash() {
    for (const [arm, dir] of [
      [this._armL, 1],
      [this._armR, -1],
    ]) {
      if (!arm || arm.destroyed) continue
      gsap.killTweensOf(arm)
      gsap.fromTo(arm, { rotation: dir * 0.5 }, { rotation: dir * 0.86, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
  },

  _releaseBubble(ctx) {
    if (!this._held) return
    this._held = false
    const c = this._charging
    this._charging = null
    if (!c) return
    if (c.view && !c.view.destroyed) c.view.destroy()
    if (this._resolving) return
    this._idle = 0
    // Den lilla flaskan ger en KLUNGA. Se rutan vid SOAPS: utan den vore stor flaska strikt
    // bäst (skum per popp växer med radien) och valet bara tre hastigheter av samma sak.
    const antal = this._soapNow().antal
    this._spawnBubble(c.x, c.r)
    for (let k = 1; k < antal; k++) {
      this._spawnBubble(clamp(c.x + (k % 2 ? 1 : -1) * (26 + Math.random() * 30), WALL_L + 30, WALL_R - 30), c.r * (0.8 + Math.random() * 0.3))
    }
    // Dubbel-prutt på högre nivå → mer skum per tryck (lättare, inte svårare).
    if (this._level >= 2 && Math.random() < 0.35) {
      this._spawnBubble(clamp(c.x + (Math.random() - 0.5) * 120, WALL_L + 30, WALL_R - 30), Math.max(this._rMin(), c.r * 0.7))
    }
    this._sound(ctx, null, 'whoosh', 'whoosh', 90)
  },

  _makeBubbleView(kind = 'normal') {
    const v = new Container()
    const g = new Graphics()
      .circle(0, 0, BASE)
      .fill({ color: kind === 'glitter' ? 0xfff0b8 : 0xbfefff, alpha: kind === 'glitter' ? 0.55 : 0.5 })
      .stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
    // Giant-bubbla (belönar att HÅLLA): regnbågs-sheen-bågar → syns tydligt värd besväret.
    // arcPath, inte arc — annars dras ett streck från glansprickens väg till varje båge.
    if (kind === 'giant') {
      const hues = [COLORS.red, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.purple]
      for (let i = 0; i < hues.length; i++) {
        const a0 = -2.4 + i * 0.5
        arcPath(g, 0, 0, BASE * 0.86, a0, a0 + 0.42).stroke({ width: 5, color: hues[i], alpha: 0.6, cap: 'round' })
      }
    }
    g.circle(-BASE * 0.34, -BASE * 0.34, BASE * 0.22).fill({ color: 0xffffff, alpha: 0.85 }) // glansprick
    v.addChild(g)
    v.eventMode = 'none'
    return v
  },

  _spawnBubble(x, r) {
    if (!this._alive || this._resolving) return
    r = clamp(r, this._rMin(), this._rMax())
    x = clamp(x, WALL_L + r, WALL_R - r)
    // En hålld/stor bubbla blir en GIANT (dubbelt skum); annars ibland en glitterbubbla.
    const kind = r >= this._rMax() * 0.86 ? 'giant' : Math.random() < 0.1 ? 'glitter' : 'normal'
    if (kind === 'giant') this._setMood('wow', 1.3)
    this._pushBubble(x, r, 0, kind)
  },

  // Skapa en bubbel-view + lägg i listan (delas av _spawnBubble och firande-svärmen,
  // som kör medan _resolving=true och därför inte kan gå via _spawnBubble-gardet).
  _pushBubble(x, r, vy = 0, kind = 'normal') {
    const view = this._makeBubbleView(kind)
    view.scale.set(r / BASE)
    view.position.set(x, FLOOR - 30)
    this._bubbleLayer.addChild(view)
    this._bubbles.push({ view, x, y: FLOOR - 30, r, vx: 0, vy, phase: Math.random() * 6, age: 0, kind })
  },

  // ---- Anka: dra → flytta studshindret -----------------------------------

  // ⚠️ ANKAN FLYTER — hon svävar inte. Spannet var [SURFACE_Y+20, FLOOR−DUCK_R], alltså
  // HELA vattenfältet 100–250 px under ytan: en anka som står stilla mitt i vattnet, vilket
  // bara går att läsa som ett kar sett uppifrån. Nu ligger hon i ytan och kan tryckas NER
  // (lyftkraften bär upp henne igen i `_duckUp`) — ett djup är något man trycker sig till,
  // inte ett läge man parkerar i.
  _setDuckPos(x, y) {
    this._duckBase.x = clamp(x, WALL_L + DUCK_R, WALL_R - DUCK_R)
    this._duckBase.y = clamp(y, this._floatY(), this._floatY() + DUCK_DIP_MAX)
  },

  // Ringen där ankan bryter vattenytan. Utan den svävar hon ovanpå bilden; med den ligger
  // hon I ytan. Ritas en gång och flyttas — ingen omritning per bildruta.
  _buildDuckWake() {
    const g = new Graphics()
    // En TÄT ring, inte en vid. Första försöket la en 90×17-ellips runt henne som lästes
    // som ett ljust glas på vattnet i stället för som vattenbrynet vid skrovet.
    g.ellipse(0, 0, 50, 8).stroke({ width: 4, color: 0xffffff, alpha: 0.6 })
    g.moveTo(-74, 0).lineTo(-56, 0).moveTo(56, 0).lineTo(74, 0).stroke({ width: 3, color: 0xffffff, alpha: 0.35 })
    g.eventMode = 'none'
    g.position.set(DUCK_HOME.x, SURF_FULL)
    this._duckWake = g
    this._root.addChild(g)
  },

  // Ritad gul gummianka (🦆-emojin renderas som en GRÄSAND — grönt huvud, brun
  // bringa — alltså inte alls badankan spelet lovar).
  _buildDuck(ctx) {
    const d = new Container()
    const g = new Graphics()
    // Stjärt.
    g.moveTo(-34, 2).lineTo(-62, -26).lineTo(-48, 14).closePath().fill(0xffd93d).stroke({ width: 4, color: 0xe0a91a })
    // Kropp.
    g.ellipse(0, 8, 48, 34).fill(0xffd93d).stroke({ width: 4, color: 0xe0a91a })
    // Vinge.
    g.ellipse(-6, 12, 22, 15).fill(0xffe98a).stroke({ width: 3.5, color: 0xe0a91a })
    // Hals + huvud.
    g.roundRect(14, -30, 26, 34, 13).fill(0xffd93d)
    g.circle(30, -26, 25).fill(0xffd93d).stroke({ width: 4, color: 0xe0a91a })
    // Näbb.
    g.moveTo(50, -30).lineTo(72, -22).lineTo(50, -14).closePath().fill(COLORS.orange).stroke({ width: 3.5, color: COLORS.orangeDark })
    // Öga.
    g.circle(36, -32, 7).fill(COLORS.white)
    g.circle(37, -31, 4.5).fill(COLORS.ink)
    g.circle(35, -34, 1.8).fill(COLORS.white)
    // Glans.
    g.ellipse(-10, -6, 16, 8).fill({ color: 0xffffff, alpha: 0.45 })
    g.eventMode = 'none'
    d.addChild(g)

    d.position.set(this._duckBase.x, this._duckBase.y)
    d.eventMode = 'static'
    d.cursor = 'pointer'
    d.hitArea = new Circle(0, 0, 80) // träffyta-diameter 160px
    this._duckDownH = (ev) => this._duckDown(ctx, ev)
    this._duckMoveH = (ev) => this._duckMove(ev)
    this._duckUpH = () => this._duckUp(ctx)
    d.on('pointerdown', this._duckDownH)
    this._duck = d
    this._root.addChild(d)
  },

  _duckDown(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    this._touched = true
    this._hideHint()
    const p = this._root.toLocal(e.global)
    this._duckActive = true
    this._duckMoved = false
    this._duckStart = { x: p.x, y: p.y }
    this._duckGrab = { dx: this._duckBase.x - p.x, dy: this._duckBase.y - p.y }
    this._duckCtx = ctx
    this._duck.on('globalpointermove', this._duckMoveH)
    this._duck.on('pointerup', this._duckUpH)
    this._duck.on('pointerupoutside', this._duckUpH)
  },

  _duckMove(e) {
    if (!this._duckActive || !this._alive) return
    const p = this._root.toLocal(e.global)
    if (!this._duckMoved && Math.hypot(p.x - this._duckStart.x, p.y - this._duckStart.y) > 12) this._duckMoved = true
    if (this._duckMoved) {
      this._setDuckPos(p.x + this._duckGrab.dx, p.y + this._duckGrab.dy)
      if (!this._lastSfx['quack'] || performance.now() - this._lastSfx['quack'] >= 220) {
        this._sound(this._duckCtx, 'djur_anka', 'pop', 'quack', 220)
        if (this._duck && !this._duck.destroyed) pop(this._duck)
      }
      this._idle = 0
    }
  },

  _duckUp(ctx) {
    if (!this._duckActive) return
    this._duckActive = false
    this._duck.off('globalpointermove', this._duckMoveH)
    this._duck.off('pointerup', this._duckUpH)
    this._duck.off('pointerupoutside', this._duckUpH)
    // LYFTKRAFTEN. Har hon tryckts ner under ytan far hon upp igen och studsar till i
    // vattenbrynet. Det är den enda återkopplingen som säger vad ytan ÄR: en gräns som
    // trycker tillbaka. En anka som blir liggande på det djup man släppte henne på är
    // exakt den svävande ankan som gjorde vyn oläslig.
    this._popUpDuck(ctx)
    if (!this._duckMoved) {
      // Tap → tap-tap: markera ankan, nästa vatten-tryck glider den dit.
      this._duckSelected = !this._duckSelected
      this._sound(ctx, 'djur_anka', 'pop', 'quack', 180)
      pop(this._duck)
    } else {
      this._duckSelected = false
    }
  },

  // Lyftkraft: ankan far upp till ytan igen och guppar in. Plask + kvack bara om hon
  // verkligen var nertryckt, annars låter varje släpp likadant.
  _popUpDuck(ctx) {
    const SURFACE_Y = this._surf
    const dip = this._duckBase.y - this._floatY()
    if (dip < 6) return
    const st = { y: this._duckBase.y }
    this._duckFloat?.kill()
    this._duckFloat = gsap.to(st, {
      y: this._floatY(),
      duration: 0.34 + dip / 300,
      ease: 'back.out(2.6)',
      onUpdate: () => this._setDuckPos(this._duckBase.x, st.y),
    })
    this._sound(ctx, 'plopp', 'pop', 'plopp', 110)
    ripple(ctx.fxLayer, this._duckBase.x, SURFACE_Y, { color: COLORS.white, maxR: 60 + dip, alpha: 0.6 })
    puff(ctx.fxLayer, this._duckBase.x, SURFACE_Y, { count: 5, color: 0xffffff })
  },

  // ---- Vatten-tryck (alltid kul) -----------------------------------------

  _waterTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._touched = true
    this._hideHint()
    const p = this._root.toLocal(e.global)
    // Tap-tap-släpp av ankan: glid den till tryckpunkten.
    if (this._duckSelected) {
      this._duckSelected = false
      const tx = clamp(p.x, WALL_L + DUCK_R, WALL_R - DUCK_R)
      const ty = this._floatY() // tap-tap glider henne LÄNGS ytan — hon simmar, hon dyker inte
      const st = { x: this._duckBase.x, y: this._duckBase.y }
      this._duckGlide?.kill()
      this._duckGlide = gsap.to(st, {
        x: tx,
        y: ty,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => this._setDuckPos(st.x, st.y),
      })
      this._sound(ctx, 'djur_anka', 'pop', 'quack', 180)
      return
    }
    ripple(ctx.fxLayer, p.x, p.y, { color: COLORS.white, maxR: 64 })
    this._wavePoke(p.x, 2.2) // ett tryck i vattnet trycker NER ytan
    this._sound(ctx, 'plopp', 'pop', 'plopp', 110)
    // Närliggande bubblor får en liten knuff.
    for (const b of this._bubbles) {
      if (Math.abs(b.x - p.x) < 120 && Math.abs(b.y - p.y) < 140) {
        b.vx += (Math.random() - 0.5) * 2
        b.vy -= 1.5
      }
    }
  },

  // ---- Tick: laddning, bubbel-integrator, anka-gupp, idle-inbjudan --------

  _update(ctx, tk) {
    if (!this._alive) return
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    const dt = Math.min(2.5, tk.deltaMS / 16.67)
    const dts = dt / 60 // sekunder

    // Håll-laddning: bubblan växer synligt (direktmanipulation, ingen dold gest).
    if (this._held && this._charging) {
      this._charging.r = Math.min(this._rMax(), this._charging.r + (26 / 60) * dt)
      const v = this._charging.view
      if (v && !v.destroyed) v.scale.set(this._charging.r / BASE)
    }

    this._updateLevel(ctx, dts)
    this._drawPour(ctx, dts)

    // Min tillbaka till vila.
    if (this._moodHold > 0) {
      this._moodHold -= dts
      if (this._moodHold <= 0 && this._mood !== 'glad') this._drawFace('glad')
    }

    // Tvåldropparna: fast tidssteg inuti FluidWorld, så `deltaMS` rakt in.
    if (this._tval) {
      this._tval.update(tk.deltaMS)
      // Droppar som fallit tillbaka i ytan försvinner in i skummet. Utan dränaget
      // samlas de på karets botten, där vattnets alfa ändå ligger över dem — de
      // vore osynliga men kostade varje steg, för alltid.
      if (this._tval.count) {
        this._tval.drain((TVAL_X0 + TVAL_X1) / 2, SURFACE_Y + 14, TVAL_X1 - TVAL_X0, 34)
      }
      this._tvalView?.update()
    }

    // Anka guppar lätt på ytan.
    this._duckPhase += 0.05 * dt
    const dip = this._duckBase.y - this._floatY()
    if (this._duck && !this._duck.destroyed) {
      // Guppet dör bort när hon hålls nere — en anka som fortfarande studsar 5 px medan
      // den trycks under vattnet ser ut att sväva, inte att hållas.
      const bob = Math.sin(this._duckPhase) * 5 * clamp(1 - dip / 40, 0, 1)
      this._duck.position.set(this._duckBase.x, this._duckBase.y + bob)
      this._duck.rotation = Math.sin(this._duckPhase * 0.7) * 0.06
    }
    // Ytringen ligger kvar I ytan medan ankan rör sig genom den — det är den som gör
    // henne flytande i stället för pålagd.
    if (this._duckWake && !this._duckWake.destroyed) {
      this._duckWake.position.set(this._duckBase.x, SURFACE_Y)
      const s = 1 + clamp(dip / DUCK_DIP_MAX, 0, 1) * 0.34
      this._duckWake.scale.set(s, 1)
      this._duckWake.alpha = this._foam.level > 4 ? 0 : 1 // skummet äter ytan → ingen ring
    }

    this._updateDrip(dts)

    // Skummet jäser — omritning strypt till ~12 fps (billigt, men tydligt levande).
    if (this._foam.level > 0) {
      this._foamPhase += dt * 0.05
      this._foamAcc += dts
      if (this._foamAcc > 0.08) {
        this._foamAcc = 0
        this._drawFoam()
      }
    }
    // Skum-skägg när badet nästan är fullt.
    if (this._beard && !this._beard.destroyed) {
      this._beard.visible = this._foam.level >= this._goalFoam * 0.78
    }

    // Bubbel-integrator.
    const duckX = this._duckBase.x
    const duckY = this._duckBase.y
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      const vyT = -(0.11 * b.r) // terminalfart uppåt ∝ radie
      b.vy += (vyT - b.vy) * 0.08 * dt
      b.vy *= 0.97
      b.vx *= 0.92
      b.phase += 0.12 * dt
      b.vx += Math.sin(b.phase) * 0.5 * dt
      // Hastighetstak.
      const sp = Math.hypot(b.vx, b.vy)
      if (sp > MAX_V) {
        b.vx = (b.vx / sp) * MAX_V
        b.vy = (b.vy / sp) * MAX_V
      }
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.age += dt

      // Väggstuds.
      if (b.x < WALL_L + b.r) {
        b.x = WALL_L + b.r
        b.vx *= -0.5
      } else if (b.x > WALL_R - b.r) {
        b.x = WALL_R - b.r
        b.vx *= -0.5
      }

      // Anka-kollision → studs (ankans placering ändrar bubblornas väg).
      const dx = b.x - duckX
      const dy = b.y - duckY
      const d = Math.hypot(dx, dy)
      const minD = b.r + DUCK_R
      if (d < minD && d > 0.01) {
        const nx = dx / d
        const ny = dy / d
        b.x = duckX + nx * minD
        b.y = duckY + ny * minD
        const dot = b.vx * nx + b.vy * ny
        b.vx = (b.vx - 2 * dot * nx) * 0.6
        b.vy = (b.vy - 2 * dot * ny) * 0.6
        // Ljud ENDAST vid en verklig stöt (bubblan är på väg in mot ankan), inte när
        // en instängd bubbla skaver mot ankan varje frame → ingen distorsion. Plus
        // strypning som backstop.
        if (dot < -0.6) {
          this._sound(ctx, 'boing', 'soft', 'boing', 150)
          if (this._duck && !this._duck.destroyed) wiggle(this._duck)
          b.vy -= 3 // ankan sparkar upp bubblan …
          b.duckBoost = true // … och ger bonus-skum vid pop → placeringen betyder något
        }
      } else if (d < DUCK_PUSH_R) {
        // ANKAN SKJUTER UNDAN BUBBLOR. Ett mjukt fält UTANFÖR skrovet, med egen radie (se
        // DUCK_PUSH_R) — bubblor glider undan och samlas där hon inte är, i stället för att
        // bara studsa när de råkar träffa. Knuffen är VÅGRÄT: en lodrät hade slagits med
        // lyftkraften, och det är i sidled omfördelningen ska synas.
        b.vx += Math.sign(dx || 1) * (1 - d / DUCK_PUSH_R) * 0.5 * dt
      }

      if (b.view && !b.view.destroyed) b.view.position.set(b.x, b.y)

      // Pop vid ytan (bubblans topp når ytan) eller efter max-livslängd.
      if (b.y - b.r <= SURFACE_Y || b.age > 360) {
        this._popBubble(ctx, b, i)
      }
    }

    // Idle → INBJUDAN, aldrig framsteg. Zacke pruttar av sig själv, byter min och
    // en pekande hand pulserar över magen. Mätaren rör sig inte förrän barnet trycker.
    this._idle += dts
    if (!this._resolving && this._idle > 5) {
      this._idle = 0
      this._invite(ctx)
    }

    // Anti-stuck-vakt: har barnets egna bubblor slutat ge skum på ~4 s (t.ex. fastnat
    // under ankan) lossar vi den äldsta. Skum trollas ALDRIG fram ur tomma intet —
    // finns inga bubblor finns inget att lossa, och då står mätaren still (som den ska).
    if (!this._resolving) {
      if (this._bubbles.length) {
        this._sinceFoam += dts
        if (this._sinceFoam > 4 && this._foam.level < this._goalFoam) {
          this._sinceFoam = 0
          this._popBubble(ctx, this._bubbles[0], 0)
        }
      } else {
        this._sinceFoam = 0
      }
    }
  },

  // ---- Nivån rör sig ------------------------------------------------------
  //
  // ⚠️ ALLT SOM LIGGER I VATTNET MÅSTE FLYTTA MED, annars lossnar scenen: vattnet, toningen,
  // skummet, mållinjen, ankan, fyndet, tvålbandet och vatten-träffytan. Det är priset för att
  // göra ytan levande, och det är billigare att betala på ETT ställe än att upptäcka en
  // efterbliven detalj i en skärmdump.
  //
  // ⚠️ FYLLNADSTAKTEN ÄR SNABBARE ÄN TÖMNINGEN med flit (86 mot 44 px/s). En kran som
  // knappt hinner ikapp läses som trasig av ett barn som inte kan resonera om hastigheter.
  _updateLevel(ctx, dts) {
    const DRAIN = 44
    const FILL = 86
    const fore = this._surf
    if (this._fill > 0) {
      this._fill = Math.max(0, this._fill - dts)
      this._surfBase -= FILL * dts
    } else if (this._plugOut) {
      this._surfBase += DRAIN * dts
    }
    this._surfBase = clamp(this._surfBase, SURF_FULL, SURF_LOW)

    // UNDANTRÄNGD VOLYM. Ankans nedsänkta del måste ta plats någonstans, och i ett slutet kar
    // är det enda stället "uppåt". Bredden är smalare än hon är ritad — undanträngning lyfter
    // HELA ytan, och full bredd hade gjort varje gupp till en synlig nivåändring (samma
    // avvägning som `plask-i-vattnet` skriver ner för sina föremål).
    const dopp = clamp(this._duckBase.y - this._floatY(), 0, DUCK_DIP_MAX)
    this._disp = (dopp * DISP_W) / (IN_R - IN_L)
    this._surf = this._surfBase - this._disp

    // Virveln snurrar bara medan det faktiskt rinner (inte när tömningen bottnat).
    const rinner = this._plugOut && this._surfBase < SURF_LOW - 0.5
    this._drawSwirl(rinner, dts)
    this._drawStream(ctx)
    // ⚠️ DE HÄR TVÅ ÄR OCKSÅ PER BILDRUTA och måste därför vara pyttesmå — se rutan vid
    // `_waveDent`: jämvikten blir insatsen delad med dämpningen (0,028), alltså ~36×.
    // 0,12 ger en dell på ~4 px under en rinnande kran, vilket är vad man ser i ett badkar.
    if (this._fill > 0) this._wavePoke(SPOUT.x, 0.12) // strålen slår ner i ytan
    if (rinner) this._wavePoke(PLUG.x, 0.06) // avloppet suger ner ytan över hålet
    // Ankan gör vågor genom sin DELL i ytan (`_waveDent`), inte genom en stöt per bildruta.

    const vagLever = this._updateWave(Math.max(0.2, dts * 60))
    const d = this._surf - fore
    if (Math.abs(d) < 0.01 && !vagLever) return
    if (Math.abs(d) < 0.01) {
      // Bara vågen rör sig — då räcker vattnet och toningen. Skum, mållinje, tvålband och
      // träffytor hör till NIVÅN, och att röra dem 60 ggr/s för en krusning vore slöseri.
      this._drawWater()
      this._drawTint(this._tintGfx)
      return
    }

    // Ankan åker med nivån — hennes dopp bevaras (differensen, inte ett omklamp till ytan).
    this._setDuckPos(this._duckBase.x, this._duckBase.y + d)
    // Fyndet ligger gömt i skummet och skummet ligger på vattnet: hela lagret åker med.
    // ⚠️ Lagret FLYTTAS i stället för att fyndets y skrivs om — dess gungning är en
    // repeat:-1-tween som skriver .y på vyn, och två skrivare på samma värde slåss.
    if (this._treasureLayer && !this._treasureLayer.destroyed) this._treasureLayer.y = this._surf - SURF_FULL
    // Tvålbandet är ett FÖNSTER kring ytan. Skjut bort det lika mycket åt båda hållen —
    // rutnätet dimensioneras av bandets HÖJD vid konstruktionen, så höjden får inte ändras.
    if (this._tval) {
      this._tval.bounds.top = TVAL_TOP + (this._surf - SURF_FULL)
      this._tval.bounds.bottom = SURF_FULL + 30 + (this._surf - SURF_FULL)
    }
    if (this._waterArea?.hitArea) {
      this._waterArea.hitArea.y = this._surf
      this._waterArea.hitArea.height = FLOOR - this._surf + 20
    }
    this._drawWater()
    this._drawTint(this._tintGfx)
    this._recomputeGoal()
    this._drawFoam()

    // Ljud medan nivån rör sig: en glidande ton åt det håll vattnet går. Strypt som allt
    // annat ljud här — annars staplas den 60 ggr/s till distorsion.
    if (this._fill > 0) this._sound(ctx, null, 'soft', 'rinn', 260)
    else if (rinner) this._sound(ctx, 'plopp', 'soft', 'rinn', 300)
  },

  // Virvel över avloppet medan badet rinner ur.
  _drawSwirl(rinner, dts) {
    const g = this._swirlGfx
    if (!g || g.destroyed) return
    g.visible = this._plugOut
    if (!g.visible) return
    this._swirlPhase += dts * (rinner ? 7 : 2)
    g.clear()
    for (let i = 0; i < 3; i++) {
      const a0 = this._swirlPhase + (i * Math.PI * 2) / 3
      const r = 15 + i * 9
      arcPath(g, PLUG.x, PLUG.y - 4, r, a0, a0 + 2.1).stroke({ width: 4 - i * 0.6, color: 0xffffff, alpha: 0.5 - i * 0.11 })
    }
  },

  // Strålen ur kranen ner i badet medan man fyller på.
  _drawStream(ctx) {
    const g = this._streamGfx
    if (!g || g.destroyed) return
    g.clear()
    if (this._fill <= 0) return
    g.roundRect(SPOUT.x - 7, SPOUT.y, 14, this._surf - SPOUT.y, 7).fill({ color: 0xbfe9fb, alpha: 0.85 })
    g.roundRect(SPOUT.x - 3, SPOUT.y, 4, this._surf - SPOUT.y, 2).fill({ color: 0xffffff, alpha: 0.5 })
    if (Math.random() < 0.28) ripple(ctx.fxLayer, SPOUT.x, this._surf, { color: COLORS.white, maxR: 54, alpha: 0.5 })
  },

  // Droppande kran: ren dekor (aldrig skum) — ger rummet liv och ljudlöst tempo.
  _updateDrip(dts) {
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    const g = this._dripGfx
    if (!g || g.destroyed) return
    const d = this._drip
    if (d.wait > 0) {
      d.wait -= dts
      if (d.wait <= 0) d.y = SPOUT.y
      g.clear()
      // En droppe som samlas i pipen mellan fallen.
      if (d.wait > 0 && d.wait < 0.5) g.circle(SPOUT.x, SPOUT.y - 2, 4 + (0.5 - d.wait) * 6).fill({ color: 0xbfe9fb, alpha: 0.9 })
      return
    }
    d.y += 640 * dts
    g.clear()
    if (d.y >= SURFACE_Y) {
      d.wait = 1.6 + Math.random() * 1.4
      if (this._alive && this._root && !this._root.destroyed) {
        const r = new Graphics()
        r.circle(0, 0, 8).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
        r.position.set(SPOUT.x, SURFACE_Y + 4)
        r.eventMode = 'none'
        this._root.addChild(r)
        gsap.to(r.scale, { x: 3.4, y: 1.4, duration: 0.5, ease: 'power2.out' })
        gsap.to(r, { alpha: 0, duration: 0.5, onComplete: () => !r.destroyed && r.destroy() })
      }
      return
    }
    g.ellipse(SPOUT.x, d.y, 5, 8).fill({ color: 0xbfe9fb, alpha: 0.9 })
  },

  _popBubble(ctx, b, i) {
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    this._bubbles.splice(i, 1)
    if (b.view && !b.view.destroyed) b.view.destroy()
    if (!this._alive) return
    const big = b.r / 10
    this._tvalStank(b)
    this._wavePoke(b.x, -(0.9 + b.r * 0.035)) // ett popp LYFTER ytan
    puff(ctx.fxLayer, b.x, SURFACE_Y, { count: 6 + (big | 0), color: 0xffffff })
    sparkle(ctx.fxLayer, b.x, SURFACE_Y)
    ripple(ctx.fxLayer, b.x, SURFACE_Y, { color: COLORS.white, maxR: 40 + b.r * 1.4, alpha: 0.6 }) // större bubbla plaskar högre
    // Stigande crescendo: poppet klättrar i tonhöjd ju fullare badet är.
    const frac = clamp((this._foam.level || 0) / (this._goalFoam || 1), 0, 1)
    ctx.services.audio.tone({ freq: 360 + frac * 520, dur: 0.12, type: 'sine', vol: 0.16, slideTo: 180 })
    this._sound(ctx, 'plopp', 'pop', 'plopp', 110)
    if (this._mood !== 'wow') this._setMood('fniss', 0.7)
    // Specialbubblor: giant = dubbelt skum + regnbågsplask; glitter = stjärnor; anka-boost = bonus.
    let mul = 1
    if (b.kind === 'giant') {
      mul = 2
      sparkle(ctx.fxLayer, b.x, SURFACE_Y, { count: 10 })
      sparkle(ctx.fxLayer, b.x, SURFACE_Y - 40, { count: 8 })
    } else if (b.kind === 'glitter') {
      mul = 1.5
      sparkle(ctx.fxLayer, b.x, SURFACE_Y - 12, { count: 9 })
    }
    // Anka-boosten får en EGEN florish i ankans gula färg, och ankan studsar till.
    // Utan den syns aldrig att placeringen gav extra skum — kausaliteten "jag styrde
    // bubblan hit, DÄRFÖR blev det mer skum" fanns bara i koden, inte för barnet.
    if (b.duckBoost) {
      mul += 0.5
      puff(ctx.fxLayer, b.x, SURFACE_Y, { count: 9, color: 0xffd93d })
      sparkle(ctx.fxLayer, b.x, SURFACE_Y - 8, { count: 7 })
      ctx.services.audio.tone({ freq: 620, dur: 0.18, type: 'triangle', vol: 0.14, slideTo: 940 })
      if (this._duck && !this._duck.destroyed) pop(this._duck)
    }
    if (Math.random() < 0.3) floatText(ctx.fxLayer, b.x, SURFACE_Y - 10, randomFrom(['Hihi!', 'Pluff!', 'Blubb!', 'Prrt!']))
    this._addFoam(ctx, b.r * mul)
  },

  // ---- Tvålvattnet (lib/vatska.js) ----------------------------------------

  _buildTval() {
    const F = FLUIDS.tval
    this._tval = new FluidWorld({
      max: TVAL_MAX,
      // ⚠️ 13 GAV EN OSYNLIG VÄTSKA. Mätt differentiellt (`_tvalprobe`): −544 px netto,
      // alltså ingenting. Åtta droppar som fjädrar ut i en solfjäder ligger snabbt
      // utanför varandras interaktionsradie, och en ensam partikel når aldrig
      // metaboll-tröskeln — den ritas inte alls. Det är köns regel "en stråle är inte
      // ett glas" i praktiken. 20 gör varje droppe till en egen fet klick.
      radius: 20,
      gravityY: 0.5,
      rho0: F.rho0,
      sigma: F.sigma,
      beta: F.beta,
      // Väggarna är karets insida. Botten ligger strax UNDER ytan — en droppe som
      // hunnit dit dräneras ändå bort i samma bildruta, men spärren finns så inget
      // kan tunnla ut ur bandet om takten hackar.
      bounds: { left: TVAL_X0, right: TVAL_X1, top: TVAL_TOP, bottom: SURF_FULL + 30 },
      walls: { left: true, right: true, bottom: true, top: true },
      restitution: 0.08, // tvål klibbar, den studsar inte
    })
    // ⚠️ KOSTNADEN LIGGER I METABOLL-FILTRET, inte i partiklarna. `area` är därför
    // klippt till bandet sprayen kan nå — inte hela designytan (förvalet).
    this._tvalView = new FluidView(this._root, this._tval, {
      color: F.color,
      edge: F.edge,
      alpha: F.alpha,
      blur: 7,
      // ⚠️ EN STRÅLE ÄR INTE ETT GLAS: enstaka droppar med luft emellan når aldrig
      // förvalströskeln 0,42 och ritas då i kantfärgen (eller inte alls). 0,36 räckte
      // INTE — mätt till −544 px netto, alltså osynlig. 0,26 låter en ensam droppe bära
      // sig själv, vilket är hela poängen med ett stänk.
      threshold: 0.26,
      resolution: 0.5,
      area: new Rectangle(TVAL_X0 - 20, TVAL_TOP - 24, TVAL_X1 - TVAL_X0 + 40, SURF_FULL + 44 - (TVAL_TOP - 24)),
    })
    this._tvalView.layer.eventMode = 'none'
    this._tvalView.layer.interactiveChildren = false
    // ⚠️ SÄTT FÄRGEN HÄR OCKSÅ, inte bara i `_applyLevel`. `init` anropar `_applyLevel`
    // INNAN den här funktionen, så dess `this._tvalView?.setColor(...)` no-oppade — och
    // dropparna behöll konstruktorns ljusblå `FLUIDS.tval` ända till andra rundan.
    // Uppmätt följd: ljusblå tvål i ett rosa jordgubbsbad (syntes bara på bilden).
    this._tintTval()
  },

  // Tvålens kropp = badets vatten draget mot vitt. Se `_applyLevel` för varför det
  // INTE får vara skumfärgen.
  _tintTval() {
    this._tvalView?.setColor(lerpColor(this._bath().water, 0xffffff, 0.45), 0xffffff)
  },

  // Tvåldroppar ur ett popp. Antalet skalar med bubblan men har ett TAK: fyra stora
  // bubblor som poppar samtidigt får inte äta hela budgeten. Är den slut hoppar vi
  // över stänket helt — en halvritad vätska är sämre än ingen.
  _tvalStank(b) {
    const SURFACE_Y = this._surf // LEVANDE ytan, inte en konstant
    const w = this._tval
    if (!w) return
    const rum = TVAL_MAX - w.count
    if (rum < 8) return
    // Fler droppar än första försöket (8 st, spread 1,25): en gles solfjäder blev
    // helt osynlig, och ett stänk ur tvålvatten är många små droppar nära varandra.
    const n = Math.min(rum, 14 + Math.round(b.r / 2))
    // ⚠️ JITTER ÄR INTE KOSMETIK HÄR. `splash` föder alla partiklar inom ±jitter/2, och
    // 20 partiklar i en 5 px-ruta är en densitetsSPIK: `kNear`-repulsionen sprängde dem
    // uppåt långt över kar-kanten (uppmätt ~180 px stigning mot de ~58 px farten
    // ensam ger). Ett brett födelseband löser det vid roten, och bubblans egen bredd
    // är det ärliga måttet — stänket ska ju komma ur bubblan.
    w.splash(b.x, SURFACE_Y - 8, {
      count: n,
      speed: 3.4 + b.r / 24, // större bubbla kastar högre — samma orsak som ripple-radien
      spread: 0.9,
      dir: -Math.PI / 2,
      jitter: Math.max(22, b.r * 1.4),
    })
  },

  _addFoam(ctx, r) {
    this._foam.level += r * FOAM_K
    this._sinceFoam = 0 // skummet växte → nollställ anti-stuck-vakten
    this._drawFoam()
    if (!this._resolving && this._foam.level >= this._goalFoam) this._onComplete(ctx)
  },

  // Inbjudan vid idle — INGEN bubbla, INGET skum. Zacke gör sig påmind, barnet spelar.
  _invite(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast()
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke)
    this._setMood('fniss', 1.2)
    this._splash()
    // Ren FX-prutt vid magen: bubbelpuff som ser rolig ut men aldrig fyller badet.
    puff(ctx.fxLayer, ZACKE_X, ZACKE_Y + 30, { count: 7, color: 0xbfefff })
    ripple(ctx.fxLayer, ZACKE_X, ZACKE_Y + 10, { color: COLORS.white, maxR: 70, alpha: 0.5 })
    this._sound(ctx, 'fart', 'soft', 'fart', 70)
    if (!this._touched) this._showHint()
  },

  // ---- Klart → firande → nytt bad ----------------------------------------

  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._held = false
    if (this._charging?.view && !this._charging.view.destroyed) this._charging.view.destroy()
    this._charging = null
    this._hideHint()
    this._sound(ctx, null, 'celebrate', 'celebrate', 300)
    ctx.services.voice.say(randomFrom(PRAISE))
    if (this._zacke && !this._zacke.destroyed) pop(this._zacke)
    this._setMood('jubel', 2.4)
    this._splash()
    // En glad pruttsvärm.
    this._foam.level = this._goalFoam // håll skummet på linjen under firandet
    this._drawFoam()
    for (let i = 0; i < 8; i++) {
      const r = 30 + Math.random() * 30
      const x = WALL_L + 60 + Math.random() * (WALL_R - WALL_L - 120)
      this._pushBubble(x, r, -2 - Math.random() * 2)
    }
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('bad', (ctx.progress.get().custom?.bad | 0) + 1)
    this._roundTimer = gsap.delayedCall(1.5, () => this._alive && this._newRound())
  },

  _newRound() {
    if (!this._alive) return
    this._applyLevel()
    // Säg vilket bad det blev — den hörbara halvan av "runda 2 ≠ runda 1".
    this._ctx?.services?.voice?.say(this._bath().say)
    this._drawGoal()
    // Rensa kvarvarande firande-bubblor så de inte direkt poppar och fyller det nya
    // badet igen (det skapade en re-complete-loop = upprepade firanden + ljud-distorsion).
    this._bubbles.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
    this._bubbles.length = 0
    // Töm skummet mjukt — och RE-ARMA rundan (resolving=false) först NÄR det är tomt,
    // så en sen pop under tömningen inte kan trigga _onComplete på nytt.
    this._foamTween?.kill()
    const st = { v: this._foam.level }
    this._foamTween = gsap.to(st, {
      v: 0,
      duration: 0.6,
      ease: 'power1.in',
      onUpdate: () => {
        this._foam.level = st.v
        this._drawFoam()
      },
      onComplete: () => {
        if (!this._alive) return
        this._foam.level = 0
        this._drawFoam()
        this._idle = 0
        this._sinceFoam = 0
        this._firstPrutt = true // röst-cue redan given denna session
        this._resolving = false
      },
    })
  },

  // ---- Städning -----------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._held = false
    this._charging = null

    this._roundTimer?.kill()
    this._foamTween?.kill()
    this._duckGlide?.kill()
    this._duckFloat?.kill() // lyftkraften skriver via _setDuckPos → måste dö med spelet
    this._plugTween?.kill() // proppens upp/ner skriver .x/.y på en vy som rivs
    this._goalPulse?.kill() // breathe() tweenar en proxy → måste dödas explicit
    // Fyndets gungning är repeat:-1 och skriver .y på vyn — lever den vidare efter
    // destroy kastar settern varje bildruta (jfr bajs-och-kiss). OVILLKORLIGT.
    this._treasureBob?.kill()
    this._tweens?.forEach((t) => t?.kill())
    if (this._tweens) this._tweens.length = 0

    // Bubblor är bara ticker-styrda Pixi-objekt → räcker att förstöra dem.
    this._bubbles?.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
    if (this._bubbles) this._bubbles.length = 0

    // Vätskan äger ett filter och en rendertextur — vyn FÖRE världen.
    this._tvalView?.destroy()
    this._tvalView = null
    this._tval?.destroy()
    this._tval = null

    // Pekar-lyssnare.
    if (this._zacke && !this._zacke.destroyed) {
      this._zacke.off('pointerdown', this._zackeDown)
      this._zacke.off('pointerup', this._zackeUp)
      this._zacke.off('pointerupoutside', this._zackeUp)
    }
    if (this._waterArea && !this._waterArea.destroyed) this._waterArea.off('pointertap', this._waterTapHandler)
    if (this._plug && !this._plug.destroyed) this._plug.off('pointertap', this._plugTapH)
    if (this._tapBtn && !this._tapBtn.destroyed) this._tapBtn.off('pointertap', this._tapTapH)
    this._soapViews?.forEach((v, i) => !v.c.destroyed && v.c.off('pointertap', this._soapHandlers[i]))
    if (this._duck && !this._duck.destroyed) {
      this._duck.off('pointerdown', this._duckDownH)
      this._duck.off('globalpointermove', this._duckMoveH)
      this._duck.off('pointerup', this._duckUpH)
      this._duck.off('pointerupoutside', this._duckUpH)
    }

    gsap.killTweensOf(this._zacke)
    gsap.killTweensOf(this._zacke?.scale)
    gsap.killTweensOf(this._duck)
    gsap.killTweensOf(this._duck?.scale)
    gsap.killTweensOf(this._armL)
    gsap.killTweensOf(this._armR)
    gsap.killTweensOf(this._hint)
    gsap.killTweensOf(this._hint?.scale)
    gsap.killTweensOf(this._foamGfx)
    gsap.killTweensOf(this._plug)
    gsap.killTweensOf(this._tapKnob)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Badleksaker att hitta i skummet. Ritade fristående former (P0 ASSETS) — egen silhuett,
// ingen emoji i en ruta. Hålls små (~34px) så de läser som "leksak i skummet", inte som
// ett nytt spelobjekt att trycka på.
function makeTreasure(kind) {
  const c = new Container()
  if (kind === 'boat') {
    const hull = new Graphics()
    hull.moveTo(-30, 4).lineTo(30, 4).lineTo(20, 22).lineTo(-20, 22).closePath()
      .fill(0xe8503f).stroke({ width: 3, color: 0xb93a2c })
    const mast = new Graphics().roundRect(-2, -30, 4, 34, 2).fill(0x9a7a55)
    const sail = new Graphics()
    sail.moveTo(2, -28).lineTo(24, -6).lineTo(2, -2).closePath().fill(0xfffdf7).stroke({ width: 3, color: 0xd3dde2 })
    c.addChild(hull, mast, sail)
  } else if (kind === 'star') {
    const g = new Graphics()
    g.moveTo(0, -26).quadraticCurveTo(6, -8, 25, -8).quadraticCurveTo(10, 4, 16, 24)
      .quadraticCurveTo(0, 12, -16, 24).quadraticCurveTo(-10, 4, -25, -8)
      .quadraticCurveTo(-6, -8, 0, -26).fill(0xffd24a).stroke({ width: 3, color: 0xe0ac1e })
    const gloss = new Graphics().circle(-6, -6, 5).fill({ color: 0xffffff, alpha: 0.75 })
    c.addChild(g, gloss)
  } else if (kind === 'fish') {
    const body = new Graphics().ellipse(0, 0, 26, 17).fill(0xff9f4d).stroke({ width: 3, color: 0xdd7f2e })
    const tail = new Graphics()
    tail.moveTo(-24, 0).lineTo(-40, -13).lineTo(-40, 13).closePath().fill(0xff9f4d).stroke({ width: 3, color: 0xdd7f2e })
    const eye = new Graphics().circle(12, -5, 4.5).fill(0x3a2b35)
    const dot = new Graphics().circle(13.5, -6.5, 1.7).fill(0xffffff)
    c.addChild(tail, body, eye, dot)
  } else if (kind === 'ball') {
    const g = new Graphics().circle(0, 0, 22).fill(0xfffdf7).stroke({ width: 3, color: 0xd3dde2 })
    const a = new Graphics().moveTo(0, -22).quadraticCurveTo(14, 0, 0, 22).quadraticCurveTo(6, 0, 0, -22).fill(0xe8503f)
    const b = new Graphics().moveTo(0, -22).quadraticCurveTo(-14, 0, 0, 22).quadraticCurveTo(-6, 0, 0, -22).fill(0x4aa3df)
    const gloss = new Graphics().circle(-7, -8, 5).fill({ color: 0xffffff, alpha: 0.8 })
    c.addChild(g, a, b, gloss)
  } else {
    // crab
    const body = new Graphics().ellipse(0, 0, 24, 17).fill(0xf2603f).stroke({ width: 3, color: 0xc4472b })
    const legs = new Graphics()
    for (const sx of [-1, 1]) {
      legs.roundRect(sx * 16, 8, 4, 12, 2).fill(0xc4472b)
      legs.roundRect(sx * 24, 4, 4, 12, 2).fill(0xc4472b)
    }
    const claw1 = new Graphics().circle(-27, -6, 8).fill(0xf2603f).stroke({ width: 3, color: 0xc4472b })
    const claw2 = new Graphics().circle(27, -6, 8).fill(0xf2603f).stroke({ width: 3, color: 0xc4472b })
    const e1 = new Graphics().circle(-8, -8, 4).fill(0xffffff)
    const e2 = new Graphics().circle(8, -8, 4).fill(0xffffff)
    const p1 = new Graphics().circle(-8, -8, 2).fill(0x3a2b35)
    const p2 = new Graphics().circle(8, -8, 2).fill(0x3a2b35)
    c.addChild(legs, claw1, claw2, body, e1, e2, p1, p2)
  }
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
