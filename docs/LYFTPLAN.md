# LYFTPLAN.md — motor, assets och rendering

Tre spår som lyfter **många spel åt gången** genom delade filer, i stället för ett spel i taget.
Poleringsrundan (`docs/POLERINGSRUNDA.md`) är klar — 72/72 spel är genomgångna individuellt.
Det som återstår är **systemskuld**: verktyg som är byggda men inte används, ritkod som bor i
72 kopior, och Pixi-förmågor appen aldrig rört.

> Uppmätt 2026-08-08 mot `HEAD` (v1.38.0, `08a4de7`) med grep/AST-svep över `src/`, `dist/`
> och `node_modules/pixi.js@8.19.0`. Siffrorna nedan är **räknade, inte uppskattade**.
> Taggar: **[Quick]** timmar · **[Medium]** en pass · **[Deep]** nytt system.

---

## 0. Sammanfattning — vad mätningen visade

| Fynd | Siffra |
|---|---|
| Spelmoduler | 72 |
| Delade libs | 21 filer, 4805 rader |
| `new Graphics()`-anropsställen i spel | 1461 |
| `Sprite`/`Texture` i spel | **0** |
| `FillGradient` i hela appen | **0** |
| `ParticleContainer` i hela appen | **0** |
| `generateTexture` / `RenderTexture` / `cacheAsTexture` | **0** |
| `Mesh` / `MeshRope` / `TilingSprite` / `BitmapText` | **0** |
| `blendMode` | 1 spel (`fyrverkeri`) |
| Filter | 1 fil (`vatska.js` metabollpasset) |
| Lokala rit-funktioner i spelfiler (`rita*`/`make*`/`draw*`) | **205 unika** |
| Exporterade rit-hjälpare i `src/lib` | **8** |
| `PhysicsWorld`-spel | 24 / 72 |
| `Constraint`-spel | 2 |
| `Composites` (mjuka kroppar, kedjor, tyg) | **0** |
| `FluidWorld`-spel | **1** (`saftbaren`) |
| Spel med kamera/parallax | 5 (alla handrullade) |

---

## 1. Spår A — knyt ihop det som redan finns

### A1. `p2-es` är en död dependency **[Quick]**

Noll importer i `src/` och `scripts/`. Ändå står den som låst teknikval i `CLAUDE.md`,
`ARCHITECTURE.md` och skill `fysik-spel` — dokumenten lovar fyra motorer, appen kör två
(matter + three).

**Beslut krävs:** antingen bygg spelet som behöver p2 (dess kant mot matter är kontinuerlig
kollision för små snabba kroppar + fjäderledder — t.ex. kulbana i hög fart, luftrace ovanifrån),
eller ta bort beroendet och stryk påståendet i alla tre dokumenten. Att låta den ligga kvar är
det enda alternativ som är fel.

### A2. Ritkoden bor i 205 kopior **[Deep]**

205 unika lokala rit-funktioner i spelfilerna mot 8 exporterade i `src/lib`. Redan mätbara
dubbletter: `makeBall` ×5 · `makeStar` ×3 · `makeBasket` ×3 · `makeElvira` ×2 (en i
`figurer.js` **och** en lokal) · `makeKitten`/`makeKid`/`makeCrown`/`makeBumper`/`makeThing`/
`makeUnicorn` ×2. Bara 4 spel har brutit ut assets till egen modul (`ingredienser.js` ×2,
`food.js`, `overraskningar.js`).

**Grepp:** utöka `artikoner.js`-mönstret (parametrisk mall + tabell) till fler domäner och
flytta upp dubbletterna. Inte allt — en unik figur hör hemma i sitt spel. Men bollar, stjärnor,
korgar, stenar, träd, moln och kronor ska finnas **en** gång.

### A3. Karaktärssystemet är ett ansikte, inte en karaktär **[Medium]**

Bobo förekommer i **29** spel, Elvira i 12, Zacke i 11. `makeMascot()` är ett statiskt huvud
utan uttrycks-API, så alla 29 spel handrullar sina reaktioner. `figurer.js` har fyra figurer.

Det här **är** det app-breda mönstret "ingen mottagare/publik" i `docs/games/README.md` — det
är inte ett per-spel-problem, det är en saknad delad rigg.

**Grepp:** `src/lib/karaktarer.js` med (a) en rigg (huvud · kropp · armar · ögon som egna lager),
(b) `setMood('glad'|'forvanad'|'hungrig'|'ledsen'|'stolt')`, (c) `react(handelse)` som spelar
en kort reaktion. Ett anrop per spel i stället för 29 handskrivna maskotar.

### A4. Delade libs som inte nått ut **[Quick]** per spel

| Lib | Används av | Bör användas av |
|---|--:|---|
| `scene.js` | 57 | +15 (se A5) |
| `mascot.js` | 17 | de 29 som har Bobo |
| `artikoner.js` | 13 | fler pussel-/lära-spel |
| `vatska.js` | **1** | se B1 |
| `three3d.js` | **1** | se C9 |

### A5. Femton spel ritar egen bakgrund **[Quick]**

`enkelt-pussel` · `folj-sparet` · `fyrverkeri` · `glittergrottan` · `hamburgerbygget` ·
`harma-melodin` · `kla-efter-vadret` · `plantera-fron` · `rulla-bollen-hem` · `saftbaren` ·
`siffertaget` · `spara-linjen` · `tarta-i-ansiktet` · `vad-forsvann` · `vart-tog-det-vagen`

Flera har goda skäl (inomhusmiljö, 3D-backdrop). Men de som bara har en platt färg ska ärva
`createScene` — särskilt efter C7 nedan, som gör den mycket rikare.

---

## 2. Spår B — fysik, kollisioner, kroppar och egenskaper

### B1. SPH-vätskan är byggd och oanvänd **[Medium]** per spel

`src/lib/vatska.js` är 739 rader: en double-density-relaxation-solver med spatial hash, sex
materialförval (`vatten` · `saft` · `gegga` · `honung` · `choklad` · `tval`) och metaboll-
rendering. **Ett** spel använder den.

| Spel | Fejkar vätska idag | Förval |
|---|---|---|
| `vattenvagen` | headern säger rakt ut "droppar längs en beräknad väg — INTE matter.js" | `vatten` |
| `zackes-biltvatt` | skum + spolning som partikelfläckar | `tval` |
| `tvatta-djuret` | skum-fläckar, regndroppar | `tval` |
| `pruttbad` | badvatten + skumlinje | `tval` |
| `trollblandning` | kitteln pyser, inget rinner | `gegga` |
| `golvet-ar-lava` | bubblande lavaflod, ritad | `choklad` |
| `plask-i-vattnet` | plask-ringar | `vatten` |
| `pizzabageriet` | sås | `saft` |

Det här är appens mest imponerande teknik och den syns i noll av åtta vätskespel.
Börja med **`vattenvagen`** (störst kontrast mellan löfte och utfall) och
**`golvet-ar-lava`** (lava = `choklad`-förvalet rakt av).

⚠️ Kostnaden ligger i metaboll-filtret (halv upplösning). Mät FPS på plattan innan fler än
två spel byter, och lägg ett partikeltak per spel.

### B2. Mjuka kroppar: noll **[Deep]**

`Composites.softBody` / partikelnät med avståndsvillkor finns i matter och används inte alls.

| Spel | Varför mjuk kropp hör hemma |
|---|---|
| `lagerelden` | **marshmallowen som sjunker ihop när den blir varm ÄR spelets mekanik** — idag byter den bara färg |
| `sapbubblor` | bubblor ska deformeras av vind och tryck, inte vara stela cirklar |
| `glasstornet` | kulorna ska wobbla när tornet svajar |
| `mata-monstret` | tuggbar mat |
| `hamburgerbygget` | brödet ska ge efter under stapeln |
| `pruttbad` | bubblor som pressas ihop mot ytan innan de poppar |

**Grepp:** `src/lib/mjukkropp.js` — ett litet partikelnät (verlet + avståndsvillkor) som kan
ritas som ett fyllt polygondrag. Behöver inte vara matter-baserat; kravet är att det studsar,
sjunker och återtar formen.

### B3. Rep/kedja är omskrivet fyra gånger **[Medium]**

| Var | Implementation |
|---|---|
| `zackes-biltvatt` | verlet-kedja, 20 punkter, avståndsvillkor + gravitation + dämpning |
| `knuffa-tornet` | matter `Constraint` (pendel) |
| `vippbradan` | matter `Constraint` |
| `spindel-zacke-svingar` | handrullad pendel-integrator |
| `natskott-pa-stan` | egen repfysik |
| `spindelnatet` | nät av linjer |

**Grepp:** `src/lib/rep.js` — verlet-kedja + brygga till matter `Constraint` + rendering via
`MeshRope` (se C5). Ersätter fyra implementationer och gör svingar, slangar, nät och vinschar
till en rad kod.

### B4. Material är fyra tal, inte material **[Medium]**

`MATERIALS` i `physics.js` har fem förval (`bouncy`/`normal`/`heavy`/`light`/`sticky`), var och
en `{restitution, friction, frictionAir, density}`. Ett material bär idag **ingen** ljudsignatur,
**ingen** partikelsignatur och **ingen** deformation.

**Grepp:** utöka posten till `{fysik, ljud, traff, spar}`:

```
tra:    { fysik: {...}, ljud: 'knack',  traff: 'flisor',  spar: 0x8a5a3b }
metall: { fysik: {...}, ljud: 'klang',  traff: 'gnistor', spar: 0xc3ccd4 }
sten:   { fysik: {...}, ljud: 'duns',   traff: 'damm',    spar: 0x9aa4b0 }
gummi:  { fysik: {...}, ljud: 'studs',  traff: 'inget',   spar: null }
glas:   { fysik: {...}, ljud: 'klirr',  traff: 'skarvor', spar: 0xbfe6ff }
```

Det är detta ägaren menar med "element och egenskaper": material ska **låta** och **lämna spår**,
inte bara studsa olika. Kopplar direkt till B5 och C3.

### B5. Kollisionshändelser driver nästan ingen spelmekanik **[Quick]** per spel

`PhysicsWorld.onCollision()` finns; de flesta spel pollar positioner i stället. Ingen av de 24
fysikspelen mappar **anslagshastighet → volym och tonhöjd**.

Det är den billigaste juicen som finns: `rel = |vA − vB|` finns redan uträknad i diagnostiken
(`physics.js:_diagInit`). En hård träff ska låta hårt, en mjuk mjukt. Gör det till en delad
hjälpare i `physics.js` så alla 24 spel får det med en rad.

### B6. Ingen återanvändbar lyftkraft eller motståndsvolym **[Medium]**

`setWind` är global. Det finns inget "vätskevolym"-begrepp som ger lyftkraft + motstånd inuti en
rektangel. `poppa-ballonger`, `ballonglyft`, `fallskarmen` och `plask-i-vattnet` vill alla ha det —
idag är flytandet scriptat.

### B7. `kugghjulen` är ren geometri **[Deep]**

Rotationskopplingen är BFS över mittavstånd, inga kroppar. Ett riktigt kuggverk med last och
tröghet (matter revolute-constraints) gör att veven **tar emot** — och motstånd som går att
känna är precis den sortens motgång P0 tillåter och uppmuntrar.

---

## 3. Spår C — grafik, detaljnivå, kamera och scen

Belägget finns i repots egna skärmdumpar: `snobollen` — enda spelet med riktiga parallax-lager —
ser markant bättre ut än `kulbana`, som är platt himmel, två moln och en stor tom mitt.
Samma motor, samma budget, samma regler.

### C1. Gradientfyllningar — störst utseende per rad **[Quick]** — ✅ DELVIS BYGGD 2026-08-08

Före: `FillGradient` (linjär **och** radiell) fanns i Pixi 8.19 och användes **noll** gånger.
`scene.js:paintVGradient` staplade **48 rektanglar** per himmel.

1. ✅ `paintVGradient` är nu en `FillGradient` → jämn himmel, 1 rit-operation i stället för 48.
   Automatisk vinst för alla 57 scener som använder `createScene()`.
2. ✅ Ny `src/lib/form.js`: `sphereFill(farg)` · `cylinderFill(farg)` · `rimLight(r)` — radiella/
   linjära gradienter som ger en platt form volym (klot i stället för skiva). Första kunden:
   molnen i `scene.js` (delad `FillGradient`-instans, byggd en gång, `moln → klot med mjuk
   skugga` i stället för platta vita klumpar).
3. ⬜ **KVAR:** applicera `sphereFill`/`rimLight` på de 205 lokala rit-funktionerna i
   spelfilerna (`makeBall` ×5 m.fl., se A2) — det är skillnaden mellan clipart och Sago Mini
   för själva SPELOBJEKTEN, inte bara scenens dekor. Naturlig fortsättning: rad 10
   (`artikoner.js`, 13 spel på en gång) eller ett eget svep över `A2`s dubbletter.

`DESIGN.md §4` fick tillägget att gradienter är **fyllningar**, inte filter — ingen konflikt
med lip-tricket, som fortfarande äger allt tryckbart i skalet.

### C2. `lib/atlas.js` — baka en gång, återanvänd **[Medium]** — ⬜ ÖPPEN

`renderer.generateTexture(graphics)` per distinkt föremål → `Sprite`. Ger tint-varianter gratis
och slipper omtesselering. Målgrupp: upprepad dekor (moln, träd, stenar, snöflingor).

> **Byggdes och revs igen 2026-08-08.** Den var tänkt som förutsättning för C3, men C3 behövde
> den inte — och `generateTexture()` visade sig kosta stabilitet: se mätningen i C3. Filen är
> borttagen i stället för att ligga kvar oanvänd (samma regel som `p2-es` i A1). Bygg den när
> ett spel faktiskt ska baka Pixi-grafik, och **använd Canvas2D om formen går att rita där**.

### C3. `lib/partiklar.js` på `ParticleContainer` **[Deep]** — ✅ BYGGD 2026-08-08

Före: varje partikel = en `Graphics` + en egen GSAP-tween (`bigCelebration` = 60 Graphics +
60 tweens). Efter: ett litet Canvas2D-atlasark, EN `ParticleContainer` per lager, EN tween per
svärm, analytisk rörelse. `feedback.js` (`puff` · `burst` · `sparkle` · `bigCelebration`) går
den vägen och behåller Graphics-vägen som fallback. **Alla 72 spel** fick 3× partikeltäthet
utan att ett enda spel ändrades.

**Uppmätt kostnad** (`scripts/_fpsprobe.mjs`, CPU 6× strypt):

| levande partiklar | ParticleContainer | Graphics (gamla vägen) |
|---|---|---|
| ~500 | 57,6 FPS | 57,2 FPS |
| ~2 100 | 57,7 FPS | 43,5 FPS |
| ~4 200 | 57,4 FPS | 22,7 FPS |
| ~21 800 | 56,5 FPS | — |

**Två fällor som kostade tid — läs innan nästa renderingsändring:**

1. **`generateTexture()` mitt i lek destabiliserade hela sviten.** Första versionen bakade
   arket med Pixi Graphics + `renderer.generateTexture()`. `npm run test:all` gav då
   `tom-scen`-fynd i **5 av 7 körningar** (mot 0 av 7 på HEAD), och en gång
   "WebGL context could not be created" i `glittergrottan`. Att baka tidigt i stället för lat
   hjälpte inte. Canvas2D rör inte GL-tillståndet alls — och partikelformer behöver ingen Pixi.
2. **Ett vilande fält måste rivas.** `fxLayer` lever hela appens livstid, så ett cachat
   `ParticleContainer` där låg kvar med sina buffertar för alltid. Med Canvas2D men kvarliggande
   fält: fynd i 1 av 3 körningar. Med `stad()` som river tomma fält: **0 av 4**. Mellan
   effekterna har appen exakt samma avtryck som före systemet.

Verifieras av `scripts/_partikelprobe.mjs` (fält, antal, pixelfärger, läckage, exit).
`scripts/_ab.sh` kör HEAD mot ändringen växelvis när en ändring misstänks stöka i sviten.

### C4. Additiv glöd som delat idiom **[Quick]**

`blendMode: 'add'` kostar ingenting och används av ett spel. Vill ha det: `lagerelden` (eld) ·
`enhorning-glitterbajs` + `glittergrottan` (glitter) · `blixt-och-dunder` (blixt) ·
`trollblandning` (magi) · `golvet-ar-lava` (lava) · `natskott-pa-stan` (neon).

### C5. `MeshRope` för allt långt och böjligt **[Medium]**

Slangen (`zackes-biltvatt`) · nättrådar (`spindelnatet`, `spindel-zacke-svingar`,
`natskott-pa-stan`) · vattenstrålar · tåg-/ormspår (`siffertaget`, `loopdjuren`) · regnbågen
(`regnbagsmalaren`). Ett texturerat rep läses som ett **material**; en polyline läses som en linje.

### C6. `lib/kamera.js` **[Deep]**

Container-baserad: `follow(mal, {lead, deadzone})` · `shake(amp)` · `zoomTo(s, x, y)` ·
`parallax(lager, faktor)`. Gör en 1280×720-diorama till en värld.

P0-villkor: mjuk easing, **ingen rotation**, ingen snabb rörelse, ingen zoom som överraskar.
Barnet ska aldrig tappa bort sig själv i bild.

### C7. Fördjupa `scene.js` — lyfter 57 spel på en gång **[Medium]**

Idag: himmel + sol + moln + en markremsa. Lägg till:

- tre parallaxband (fjärran kullar / mellanträd / närgräs) som `TilingSprite` av bakade texturer
- ett dis-band vid horisonten
- markstruktur (prickar/strån) i stället för en jämn yta
- vinjett som **en** radiell gradient-`Graphics` (inte ett filter)
- tid på dygnet styrd av **en** nyansparameter, så samma tema ger morgon/dag/skymning

### C8. Detaljnivå i `artikoner.js` — lyfter 13 spel på en gång **[Medium]** — 🟨 PÅBÖRJAD 2026-08-08

~110 nycklar, 720 rader. Per mall (planerat): basgradient, en mjuk ocklusion under formen, en
kantdager, och 1–2 strukturaccenter (pälstofsar, fruktporer, metallrepa). Bakom en
`detalj`-parameter så nivån går att sänka på svaga plattor.

**Klart:** bara steget "basgradient", och bara på de mallar som redan var en ensam cirkel/
ellips med en handrullad ljus glans-cirkel bredvid (samma dubblettmönster som C1) — `sphereFill`
från `lib/form.js` ersätter båda med en fyllning: djurhuvudets bas (~30 av nycklarna delar
samma huvud-cirkel), frukternas standardform (🍎🍊🍑🍋), `shape:'ball'` (⚽) och `shape:'circle'`
(🔵🟢🟡🟣). **Kvar:** resten av de ~40 mallgrenarna (fordon, kläder, verktyg, havsdjur — de
flesta är INTE en enkel cirkel och behöver egen bedömning per form), ocklusion, kantdager,
strukturaccenter, och `detalj`-parametern. `sphereFill`/`cylinderFill` cachar nu per färg+opts
(en delad `FillGradient` per unik kombination, inte en ny bakning per `drawIcon()`-anrop) —
viktigt här eftersom samma ikon ofta ritas många gånger i ett spel.

### C9. 3D-lagret används av ett spel **[Deep]**

`three3d.js` + `three-shaders.js` = 567 rader med `ThreeLayer`, delad renderer, toon-material,
sju backdrop-shaders. `glittergrottan` är enda kunden. Antingen bygg fler 3D-spel eller använd
`makeBackdrop` som **bakgrund** i 2D-spel (3D-canvasen ligger redan bakom Pixi och all input går
via Pixi ändå).

### C10. Småpengar **[Quick]**

- 75 `new Text` rasteras via canvas. `BitmapText` för allt som ändras varje bildruta (räknare).
- `roundPixels` på bakade sprites.
- `CullerPlugin` när kameran (C6) landar.
- Renderarkonfigen i `App.js` är redan rätt (`resolution` ≤2, `antialias`, `maxFPS 60`) — rör den inte.

---

## 4. Arbetsordning

Störst lyft per risk först. Varje rad är en egen commit + MINOR-bump.

| # | Vad | Spår | Lyfter | Status |
|--:|---|:--:|---|:--:|
| 1 | `lib/partiklar.js` + `feedback.js` internt, 3× täthet | C3 | **alla 72 spel** | ✅ v1.39.0 |
| 2 | `lib/atlas.js` — bakning av Pixi-grafik till textur | C2 | repeterad dekor | ⬜ *(revs, se C2)* |
| 3 | `FillGradient` i `scene.js` + `lib/form.js` | C1 | 57 scener + moln | ✅ v1.40.0 *(delvis — se C1)* |
| 4 | Fördjupad `scene.js` (parallax, dis, vinjett) | C7 | 57 spel | ⬜ |
| 5 | `lib/kamera.js` | C6 | nya + 5 befintliga | ⬜ |
| 6 | `FluidWorld` → `vattenvagen` + `golvet-ar-lava` | B1 | 2 spel, sedan 6 till | ⬜ |
| 7 | `lib/rep.js` (verlet + `MeshRope`) | B3+C5 | ersätter 4 kopior | ⬜ |
| 8 | Material med ljud/partikel/spår | B4+B5 | 24 fysikspel | ⬜ |
| 9 | `lib/karaktarer.js` (mood-rigg) | A3 | 29 Bobo-spel | ⬜ |
| 10 | Detaljnivå i `artikoner.js` | C8 | 13 spel | 🟨 v1.41.0 *(basgradient — se C8)* |
| 11 | `lib/mjukkropp.js` | B2 | 6 spel | ⬜ |
| 12 | Beslut om `p2-es` | A1 | dokumenten | ⬜ |

**Grind per rad:** `npm run check` grön · `npm run test:all` 72/72 med 0 konsolfel · skärmdump
granskad med ögat · FPS mätt på plattan när raden rör rendering eller partiklar.
