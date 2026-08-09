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

### A1. `p2-es` är en död dependency **[Quick]** — ✅ BORTTAGEN 2026-08-09 (v1.49.0)

Noll importer i `src/` och `scripts/`. Ändå stod den som låst teknikval i `CLAUDE.md` och
skill `fysik-spel` — dokumenten lovade fyra motorer, appen körde två (matter + three).

**Beslutet:** beroendet är **borttaget** (`npm uninstall p2-es`) och påståendet struket.
Alternativet — att bygga ett spel enbart för att rättfärdiga en dependency — är att låta
verktygslådan bestämma spellistan. Skill `fysik-spel` bär nu vägen tillbaka: matters egen
`Constraint` först, egen verlet-lösare i `src/lib/` sedan, och p2-es återinförs bara **i samma
commit som det spel som importerar den**.

⚠️ **Docen var inaktuell på en punkt** (samma fälla som CLAUDE.md varnar för): `ARCHITECTURE.md`
nämnde aldrig p2-es. Den hade redan bara matter + three i sin teknikvalstabell. Kopiera inte
raden ovan rakt av nästa gång — greppa först.

### A2. Ritkoden bor i 205 kopior **[Deep]** — 🟨 PÅBÖRJAD 2026-08-09

203 unika lokala rit-funktioner i spelfilerna (218 definitioner) mot 8 exporterade i `src/lib`.
Mätbara dubbletter: `makeBall` ×5 · `makeStar` ×3 · `makeBasket` ×3 · `makeElvira` ×2 (en i
`figurer.js` **och** en lokal) · `makeKitten`/`makeKid`/`makeCrown`/`makeBumper`/`makeThing`/
`makeUnicorn` ×2. Bara 4 spel har brutit ut assets till egen modul (`ingredienser.js` ×2,
`food.js`, `overraskningar.js`).

**Grepp:** utöka `artikoner.js`-mönstret (parametrisk mall + tabell) till fler domäner och
flytta upp dubbletterna. Inte allt — en unik figur hör hemma i sitt spel.

✅ **`src/lib/foremal.js` byggd (v1.47.0):** `makeBoll` (5 spel) + `makeStjarna` (3 spel), båda
med `form.js`-fyllningar, alltså A2 och C1.3 i samma ändring. 10 definitioner blev 2.

⚠️ **Läsningen ändrade listan — kopiera den inte rakt av.** Docen antog att korgar och kronor
"ska finnas en gång". Koden sa något annat:

| Föremål | Utfall efter läsning |
|---|---|
| `makeBall` ×5 | **Samma föremål** — cirkel + platt fyllning + handritad vit glansellips. Delad. |
| `makeStar` ×3 | **Samma föremål** — 10-punkts poly, samma gula, samma mörka kontur, samma glansprick. Delad. |
| `makeBasket` ×3 | **Tre olika korgar** (proportioner, flätmönster, handtag, färger). Att slå ihop dem hade tagit bort variation, inte en dubblett. Kvar i sina spel, med `form.js`-fyllning på plats. |
| `makeBumper` ×2 | **Två olika** (flipperns ring med motiv vs. spindelhjältens tvåringade stjärnbumper). Samma sak. |
| `makeCrown` ×2 | Nästan identiska, men olika proportioner — en delad version hade krävt sex parametrar för att bevara båda. Fick gradienten på plats i stället. |

En dubblett i en grep-räkning är inte samma sak som en dubblett i bilden. Läs alla kopiorna
innan du slår ihop dem.

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

### B1. SPH-vätskan är byggd och oanvänd **[Medium]** per spel — ✅ TRE SPEL 2026-08-09

`src/lib/vatska.js` är 739 rader: en double-density-relaxation-solver med spatial hash, sex
materialförval (`vatten` · `saft` · `gegga` · `honung` · `choklad` · `tval`) och metaboll-
rendering. Vid mätningen använde **ett** spel den; nu tre.

| Spel | Fejkar vätska idag | Förval | Status |
|---|---|---|---|
| `saftbaren` | — (var enda kunden) | `saft` | ✅ sedan tidigare |
| `vattenvagen` | headern sa rakt ut "droppar längs en beräknad väg" | `vatten` | ✅ v1.45.0 |
| `golvet-ar-lava` | bubblande lavaflod, ritad | `choklad` | ✅ v1.46.0 |
| `zackes-biltvatt` | skum + spolning som partikelfläckar | `tval` | ⬜ |
| `tvatta-djuret` | skum-fläckar, regndroppar | `tval` | ⬜ |
| `pruttbad` | badvatten + skumlinje | `tval` | ⬜ |
| `trollblandning` | kitteln pyser, inget rinner | `gegga` | ⬜ |
| `plask-i-vattnet` | plask-ringar | `vatten` | ⬜ |
| `pizzabageriet` | sås | `saft` | ⬜ |

**Tre lärdomar ur de två första bytena — läs dem före nästa spel:**

1. **Simulera bara där vätskan SYNS.** `vattenvagen` simulerar kranens stråle, läckan och
   muggen; inuti de ogenomskinliga rören (26 px kanal) simuleras ingenting — vattnet sugs in
   i mynningen och kommer ut i andra änden efter en restid. `golvet-ar-lava` simulerar bara
   flodens översta 46 px; djupet är samma ritade berg som förut. Att simulera hela volymen
   hade kostat allt och synts noll.
2. **En stråle är inte ett glas.** Saftbarens värden (takt 145 ms, tröskel 0.42, blur 9) är
   satta för fyllda kärl. En fallande droppe rör sig ~480 px/s, så med den takten hamnar
   dropparna **70 px isär** mot en 55 px klick — de överlappar aldrig, når aldrig
   metaboll-tröskeln och ritas i KANTfärgen (nästan vit). Uppmätt: 49 partiklar, noll synliga
   pixlar, noll konsolfel. Räkna takten ur fallhastigheten och sänk tröskeln för strålar.
3. **Vätska är volym — och volym flyttar sig.** Fyra stenar i lavan trängde undan så mycket
   att ytan steg 35 px och nådde klippkanten. Fyllnadsmängden måste skalas med kärlets bredd,
   och undanträngning måste mätas, inte antas.

4. **Ett flaky-larm är inte en regression förrän HEAD mätts lika länge.** Lavan gav först
   ändringen 2 flakiga rundor av 8 mot HEAD 0 — samma signatur som `generateTexture`-fällan.
   I tredje körningen flakade **HEAD självt** med `golvet-ar-lava:tom-scen`. Slutläge över 11
   växelvisa rundor: HEAD 1, ändringen 2, alltså inte skiljbart. Kör fler rundor innan du
   dömer, och kontrollera mekanismen i Pixis källa innan du skriver ner den: påståendet
   "`Filter.from` kompilerar per anrop" var fel — `GlProgram.from` cachar per källkod.

Verktyg: **`scripts/_vatskeprobe.mjs`** (antal · ytans höjd · målade pixlar mot vätskans egen
färg · FPS med CPU-strypning · exit + återinträde). Den hittar vätskan på FORM, inte på
fältnamn, så den fungerar på vilket spel som helst.

⚠️ Kostnaden ligger i metaboll-filtret (halv upplösning). Uppmätt vid CPU 6× strypt:
**56,7–56,9 FPS** i båda spelen, oförändrat mot tom scen — men mät på plattan innan fler än
två spel till byter, och lägg ett partikeltak per spel. Två billiga knappar finns nu i
`FluidView`: **`area`** (kör filtret bara över den yta vätskan kan nå — lavan blev 9× färre
pixlar) och ett **delat filter per sida** i stället för ett per montering.

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

### B4. Material är fyra tal, inte material **[Medium]** — ✅ BYGGT 2026-08-09 (v1.52.0)

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

✅ **Byggt som `MATERIAL` + `mat(namn, extra)` i `physics.js`** — fem poster (`tra` · `metall` ·
`sten` · `gummi` · `glas`), var och en `{ fysik, ton, typ, dur, glid, traff }`.

Tre beslut som mätningen tvingade fram:

1. **Rösten är syntes, inte klipp.** Repot har inga klipp som heter `knack`/`klang`/`duns`/
   `studs`/`klirr` (tillgängliga namn: `boing · celebrate · correct · djur_* · fart · flip ·
   kristall_klirr · magi · match · plopp · pling · pop · reveal · soft · tap · thwip · whoosh`).
   Och ett klipp har EN dynamik — det kan inte bli mjukare när träffen är mjuk, vilket är hela
   poängen med B5. Samma skäl som CLAUDE.md ger för att `correct`/`match`/`pling` är stämda.
2. **Signaturen ligger under EN nyckel (`mat`) på kroppen.** matter kopierar okända options rakt
   på kroppen, så `ljud`/`spar` hade fungerat — men matter äger namnrymden. Samma fälla som
   Pixis `_cx`/`_sx`, en våning ned.
3. **`mat()` lägger spelets egna tal SIST.** `mat('tra', { friction: 0.4 })` behåller 0.4.
   Ett material får aldrig tuna om ett fungerande spel bakvägen — `domino` och `bygg-tornet`
   är handtrimmade och skulle ha ändrat beteende av en rakt påtvingad materialtabell.

`MATERIALS` (bouncy/normal/heavy/light/sticky) står kvar orörd — 9 spel sprider den, och den
beskriver *rörelse*, inte *ämne*. De två tabellerna svarar på olika frågor.

### B5. Kollisionshändelser driver nästan ingen spelmekanik **[Quick]** per spel — ✅ BYGGT 2026-08-09 (v1.52.0)

`PhysicsWorld.onCollision()` fanns; de flesta spel pollade positioner i stället. Inget av de 23
fysikspelen mappade **anslagshastighet → volym och tonhöjd**.

✅ **`onImpact(handler, { minSpeed, hardSpeed, maxPerFrame })`** ger `{ a, b, speed, styrka, x, y,
material, traff }` — kontaktpunkten kommer ur matters `supports`, `styrka` är redan klämd till
0–1. **`impactAudio(audio, opts)`** är enradaren: hårdare anslag blir högre OCH ljusare (bara
volym räcker inte — örat läser tonhöjd som kraft; samma volymskillnad utan tonhöjdsskillnad
låter som samma träff på olika *avstånd*).

**Taket är inte valfritt.** En rasande hög ger tiotals par i EN bildruta. Två spärrar: max 3
anslag per bildruta, och 28 ms mellan toner. Den andra går på **väggklockan**, inte bildrutor —
vid 30 fps hade ett bildrutebaserat golv blivit dubbelt så långt i verklig tid, alltså tystare
juice på svagare enheter, precis tvärtom mot vad man vill.

Första kunder: **`domino`** (kedjan hörs — en kedja som just kommit igång viskar, en som rusar
smäller) och **`bygg-tornet`** (`_lockActive` hade redan en duns, men bara på klossen barnet
just la, och alltid lika hård).

**Verktyg: `scripts/_slagprobe.mjs`** (Node, ingen webbläsare — som `_kameraprobe.mjs`).
Uppmätt: mjukt fall vol 0.086 / 213 Hz → hårt fall 0.240 / 288 Hz · fem material, fem skilda
tonhöjder (144–1416 Hz) · en studsande gummiboll ger **9 anslag med avtagande fart**
(16,9 → 1,7 px/steg) · en hög på 40 stenar ger 30 anslag med **aldrig mer än 3 per bildruta** ·
noll toner efter `destroy()`.

⚠️ **En grön mätning kan ljuga precis som en röd.** Sondens första version mätte `impactAudio`
på högen och rapporterade "1 ton på 3 s" — grönt mot taket, och helt meningslöst: 180 bildrutor
simuleras på ~40 ms verklig tid, så väggklocke-spärren släppte igenom exakt en ton oavsett vad
som hände. Taket mäts nu via `onImpact` (bildruteräkning), och sonden säger i klartext varför.

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
2. ✅ Ny `src/lib/form.js`: `sphereFill` (klot) · `cylinderFill` (rör, `axis: 'y'|'x'`) ·
   `topLightFill` (belyst uppifrån — allt annat) · `rimLight(r)` · `setDetaljniva`.
   Första kunden: molnen i `scene.js` (delad `FillGradient`-instans, byggd en gång,
   `moln → klot med mjuk skugga` i stället för platta vita klumpar).
3. 🟨 **PÅBÖRJAD (v1.47.0):** applicera dem på de 203 lokala rit-funktionerna i spelfilerna
   — det är skillnaden mellan clipart och Sago Mini för själva SPELOBJEKTEN, inte bara scenens
   dekor. `artikoner.js` (rad 10) är **klar** och är mallen att följa: gradient på huvudformen,
   platt på smådetaljer, handrullade glans-ellipser borttagna.
   **Klart hittills:** bollarna i 5 spel + stjärnorna i 3 (via `foremal.js`, se A2), kronorna i
   `klappa-mullvaden`/`knuffa-tornet` och spindelhjältens bumper — 10 föremål i 8 spel. Sedan,
   efter mätning med **`scripts/_plattprobe.mjs`** (nytt), de STORA ytorna där platt var fel:
   mullvadens gräsmatta (215 742 px i en ton), `plantera-fron`s jordprofil (301 300),
   lavaspelets klippor (135 828), `fanga-frukten`s lövverk och fyrverkeriets natthimmel.

   **Sortera efter mätningen, inte efter magkänsla.** Sonden rankar skärmdumparna på det
   STÖRSTA ENSKILDA enfärgade fältet. Två saker den lärde ut:
   - **Fyrverkeriets natthimmel var 48 staplade rektanglar** — exakt mönstret `scene.js`
     lämnade i den här raden, men i en spelfil. Ny `verticalFill(top, bottom)` i `form.js`:
     en rit-operation i stället för 48, och banden borta.
   - **Platt är ibland RÄTT.** `spara-linjen` (vitt ritpapper), `folj-sparet` (spårpapper) och
     `rulla-bollen-hem` (fotbollsplan uppifrån) toppar listan och ska göra det. Sonden är en
     ledtråd; bilden avgör.

   **Kvar:** `tarta-i-ansiktet` · `hamburgerbygget` · `enkelt-pussel` · `vart-tog-det-vagen`
   ligger nu överst bland de *tveksamma*. Och: en gradient på en 11px-stjärna syns inte, en
   på ett 90px-klot bär hela bilden — storleken avgör om det är värt en ändring.
   `rimLight` väntar fortfarande på sin första kund — den är till för figurer som byggs som en
   **container av flera Graphics**, vilket varken `artikoner.js` eller `foremal.js` (en enda
   Graphics per föremål) är.

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

### C6. `lib/kamera.js` **[Deep]** — ✅ BYGGD 2026-08-08

`class Camera` äger INGA spelobjekt, bara **lager**: `parallax(faktor)` ger en Container vars
faktor är 0 (fastspikad i skärmen — vinjett, HUD), 1 (spelarens plan) eller något däremellan.
Spelet bygger i faktor 1 och tänker i världskoordinater; kameran flyttar lagren, aldrig
innehållet. `follow(mal, {lead, deadzone})` · `moveTo` · `panTo` · `shake(amp, dur)` ·
`zoomTo(s, {x, y})` · `attach(ticker)` · `destroy()`. Pekpunkter behöver ingen omräkning:
lagren är riktiga Pixi-containrar, så `varld.toLocal(e.global)` räcker.

**Lagerformeln är exakt, inte ungefärlig.** Ett lager med faktor f står på `-vänsterkant·f·s`.
Kameran startar i världens vänsterkant, så ett lager förskjuts bara ÅT VÄNSTER — och då är
`lagerBredd(f) = vy + f·(värld − vy)` precis den bredd som behövs för att aldrig visa en tom
kant. Vid världens högerkant landar lagrets högra kant på pixeln (uppmätt: f 0.02 → bredd
1318, offset −38, kant 1280).

**P0 i kod, inte bara i kommentar:** ingen rotation exponeras eller sätts · exponentiell
utjämning (bildrutefri: 60 och 30 FPS hamnar inom 1 px efter en sekund) · dödzon · fartsspärr ·
zoom klämd till [minZoom, maxZoom] med **golv 0,5 s** på varje zoom · skak med tak (10 px),
kvadratisk avklingning och två sinusvågor i stället för brus (per-bildruta-slump känns hårt) ·
faktor-0-lager skakar aldrig, så vinjett och HUD står stilla.

**Ett mätvärde ändrade designen.** `hardBox` (hur långt målet får ligga från mitten innan
kameran tvingas efter) sattes först till 0.42 av halva vyn = 269 px. Sonden visade att rutan
då klämmer mot målets läge varje bildruta och därmed sätter **dödzon, lead och fartsspärr ur
spel** — de får bara verka inne i rutan, och kameran blir klistrad vid figuren. 0.75 (480 px,
drygt 160 px in från kanten) låter utjämningen göra jobbet och lämnar rutan som sista utväg.
Priset är mätt och dokumenterat: en **teleport** rycker bilden med (3880 px på en bildruta i
sonden), eftersom rutan klämmer mot målets nuvarande läge. Ett spel som flyttar sin figur
långt på en bildruta ska flytta kameran själv med `moveTo()` i samma andetag.

**Zoomen skalade först varje lager med sin egen faktor** (`1 + (zoom−1)·f`). Det lät
fysikaliskt — ett avlägset berg ändras mindre av en kamerakörning — och var fel: vid zoom 1.4
hamnade markens horisont på skärm-y 874 och fjärranbandets på 673, alltså gled scenen isär i
höjdled. En zoom ändrar **brännvidd**; den flyttar inte lagren i förhållande till varandra.
Det gör bara PANORERINGEN, och den bär faktorn. Zoomen är nu uniform och skalar kring vyns
mitt. `_kameraprobe.mjs` har en egen regressionsvakt för just det.

**Kostnad: ingen mätbar.** `_kamerabild.mjs --fps --cpu 6`: scen utan kamera **56,6 FPS**,
samma scen i 10 parallaxlager med följning i rörelse **56,6 FPS**.

⚠️ **Scenens lager är låsta i höjdled.** Har världen vertikalt utrymme panorerar spelets eget
faktor-1-lager i höjd medan scenens mark står kvar — figuren glider av marken. Det syns bara
i rörelse, aldrig i en stillbild, så `adopt()` **varnar i DEV** när `worldH > vyns höjd` i
stället för att vara tyst. Vertikal parallax i scenen kräver att banden ankras mot ett
kameraläge, och det är inte byggt.

Nya verktyg: **`scripts/_kamerabild.mjs`** (ett kameraläge per ruta, maskad — parallax går
inte att bedöma i en stillbild av EN position; skriver också ut `f<faktor>:x<offset>` per
lager, för en fin bild kan mycket väl ha noll parallax) och **`scripts/_kameraprobe.mjs`**
(beteendet i tal: dödzon, hård ruta, spärr, skak, zoom, klämning, exit — kör i **Node utan
webbläsare**, eftersom kameran bara rör `.position`/`.scale` och Pixis Container laddar där).

⬜ Kvar: kameran har ännu **ingen kund bland de 72 spelen**. Ingen befintlig `createScene`-scen
rullar i sidled, och de två spel som har egen kamera (`snobollen`, `natskott-pa-stan`) vill ha
något kameran med flit inte gör — snöbollen härleder kamerans **höjd ur backens yta**
(`camY = surfaceY(camX + LEAD)`) i stället för att följa bollen, med backen ritad i skärmrymd.
Att byta den mot generisk följning vore att tuna om ett fungerande spel utan synlig vinst.
Första riktiga kunden blir därför ett **nytt** spel byggt för en värld bredare än rutan, eller
en `/polera`-runda som medvetet ger ett spel en sådan värld.

### C7. Fördjupa `scene.js` — lyfter 55 spel på en gång **[Medium]** — ✅ BYGGD 2026-08-08

Före: himmel + sol + moln + en markremsa. Nu, allt bakom en egen flagga (`djup` · `dis` ·
`markstruktur` · `vinjett` · `tid`) och allt i scenroten, alltså **bakom spelytan**:

- **Tre avståndsband** i stället för `TilingSprite`. Varje band är lägre, mörkare och tätare
  kuperat än det bakom — de tre signalerna ögat läser som avstånd. Ingen textur behövde
  bakas, så `TilingSprite`-vägen (och dess `generateTexture`-risk, se C2) föll bort.
  Ersätter gamla `hills`: två cirklar med radie 220–280 som läste som bleka bubblor.
- **Disband** vid horisonten, ritat **mellan** band 1 och 2. Ordningen ÄR effekten — det är
  därför fjärran bandet ser avlägset ut trots att det bara är en aning ljusare.
- **Markstruktur** i två lager: en tät rad strån längs markens överkant + glesa strån under.
  Bara det glesa lagret läste som prickar av smuts. Nytt temafält **`gras`** avgör strån
  eller prickar — strån på `water` såg ut som skräp i sjön (bara skärmdumpen visade det),
  medan sand (`warm`) bär dem fint som torrt strå.
- **Vinjett** som **fyra linjära kanttoningar**, INTE en radiell gradient — se fällan nedan.
- **`tid`** (`morgon` · `skymning` · `kvall`) som en nyansparameter. `topp` och `botten`
  lerpas olika mycket och åt olika håll: en skymning glöder vid horisonten och är djup
  ovanför, en kväll är tvärtom. En enda faktor över hela himlen gav en **grå** skymning.

**Fälla 1 — en radiell gradient kan inte ha genomskinlig mitt.** `buildRadialGradient` i Pixi
fyller först HELA duken med sista färgstoppet och ritar gradienten ovanpå; en genomskinlig
källa raderar ingenting i source-over. En vinjett med genomskinlig mitt blir därför en JÄMN
mörkning över hela ytan. Uppmätt på pixlarna: himlens mitt gick [176,227,250] → [146,189,208],
samma 0.83-multiplikation överallt. `buildLinearGradient` har ingen förifyllning, så fyra
linjära kanttoningar (delade instanser, ~4 KB) gör jobbet — och mitten är nu pixelidentisk
med baslinjen medan hörnen mörknar 57 steg.

**Fälla 2 — en gradient per scen destabiliserade sviten.** Disbandets `FillGradient` byggdes
först inne i `createScene`, alltså en ny duk + texturuppladdning vid **varje** spelmontering.
Interleaved A/B (`scripts/_ab.sh src/lib/scene.js`): HEAD `rent` 3/3, ändringen `tom-scen` i
1 av 3 rundor (tre spel samtidigt) — plus en full körning som fällde ett fjärde spel. Samma
signatur som `generateTexture`-fällan i C3. Efter cache av både dis- OCH himmelsgradienten
(den senare bakades om per montering redan före den här raden): HEAD 1/3 flaky,
ändringen **0/3**. En scen gör nu noll texturbakningar vid montering — färre än HEAD.

Nytt verktyg: **`scripts/_scenbild.mjs`** ritar `createScene` i ett rutnät utan att gå via
ett spel (`node scripts/_scenbild.mjs meadow --tider dag,morgon,skymning,kvall`). Scenen delas
av 55 spel, så ett temabyte måste gå att se utan att först hitta ett spel med rätt tema.
`scripts/_ab.sh` tar numera filer som argument i stället för att vara hårdkodad till
partiklar/feedback.

✅ **Banden är parallax sedan 2026-08-08** (rad 5). `createScene(tema, { kamera: { bredd } })`
lägger varje element i ett eget lager med en faktor ur `DJUP` (himmel 0 · sol 0.02 · stjärnor
och bokeh 0.05 · moln 0.12 · fjärran 0.18 · dis 0.22 · mellan 0.34 · nära 0.52 · mark 1 ·
vinjett 0 överst), och ritar varje lager exakt så brett som dess faktor kräver. Roten får
`_kamLager` som `Camera.adopt()` plockar upp. **Utan flaggan är utfallet oförändrat** — samma
container, samma ritordning, samma bild (verifierat mot `_scenbild.mjs`-baslinjen).

Två saker som bara syns när lagren är på: molnen ritas sist i koden men **hör hemma bakom
marken**, så lagren skapas i en egen, uttalad bakifrån-och-fram-ordning i stället för där
innehållet råkar ritas. Och kupolantalet i ett band skalas med lagrets bredd — behåller man
antalet och breddar geometrin blir kullarna utdragna och bandet läser som en **våg** i
stället för ett landskap.

### C8. Detaljnivå i `artikoner.js` — lyfter 13 spel på en gång **[Medium]** — ✅ BYGGD 2026-08-08

121 nycklar, 720 rader. Alla mallgrenar fyller nu sin **huvudform** med en gradient ur
`lib/form.js` efter en enda regel, i stället för per-form-smak:

| Form | Fyllning |
|---|---|
| runda kroppar (huvuden, frukt, bollar, klot, moln-puffar) | `sphereFill` |
| rör och stavar (raketkropp, stam, morot, skaft, banan) | `cylinderFill` — ny `axis`-parameter |
| allt annat (karosser, kläder, verktyg, polygoner) | `topLightFill` — **ny** i `form.js` |

Smådetaljer (öron, fenor, nycklars kammar) lämnas platta med flit: ögat läser volymen på den
stora formen, och varje distinkt gradient är en egen textur att binda. Där en mall hade en
handrullad glans-ellips bredvid en platt fyllning är den **borttagen**, inte kvarlämnad —
det var samma dubblett som gradienten ersätter (🎈 💧 🪐 🌳 🍬).

**Kostnaden mättes, och var värd att mäta** (`scripts/_ikonkostnad.mjs`, nytt): Pixi bakar en
**linjär** gradient till en `256×1`-duk (~1 KB) men en **radiell** till `256×256` (~256 KB).
Hela ikonbiblioteket landade därför först på **15,30 MB** GPU-textur — 61 radiella à 256 KB.
Med `textureSize: 64` på `sphereFill` är samma bibliotek **1,00 MB**, och ingen banding syns
ens på en 300px-ikon. Probet mäter de **bakade texturerna på ritinstruktionerna**, inte
modulens cache-räknare: en `import('/src/lib/form.js')` i ett probe är en annan modulinstans
än den `artikoner.js` fått av Vite, så dess `Map`:ar står på 0 hur många ikoner som än ritats.

**Detaljnivå:** `setDetaljniva(0|1|2)` i `form.js`. Nivå 0 får fyllningsfunktionerna att
returnera **råfärgen** i stället för en gradient — `.fill(0x4aa3df)` är lika giltigt som
`.fill(gradient)`, så ingen ritgren behöver en egen if-sats och nivå 0 ger exakt utseendet
före `form.js` (verifierat: 0 bakade gradienter, 0 MB, alla former hela). Nivån läses
app-brett och **inte** per `drawIcon`-anrop: gradienterna avgörs inne i `form.js`, så en
anropsflagga hade släckt accenterna men inte gradienterna. Accenter har dessutom en
storleksgrind (≥64px) — under den är de brus. ⬜ Kvar: koppla `setDetaljniva` till en
inställning i skalet (i dag är 2 hårdkodat).

**Två saker ströks efter granskning i skärmdump — de är resultat, inte glömska:**

1. **Pälstofsar** (cirklar som stack ut ur huvudets silhuett) läste som kindpäls på räv och
   hund, men som bubblor med egen kontur på kanin, panda och pingvin.
2. **Kantdager som ljus båge** innanför konturen såg mjuk ut vid 130px och var ett hårt
   streck tvärs över pannan vid 300px. En dager med hård kant är per definition inte en
   dager — den hör hemma i gradienten, inte i ett stroke.

Kvar av de accenter som föreslogs: fruktporer, metalldager på hammaren, barkådror på trädet.
Ocklusion byggdes **inte separat** — `sphereFill`/`topLightFill` mörknar redan mot underkanten,
så ett extra ocklusionsdrag hade lagts ovanpå något som redan fanns.

**Två buggar hittades på vägen, båda osynliga för ett grönt test:**

- 🌙 ritade en **cream-cirkel ovanpå** en hel måne för att få skäran. Den var osynlig bara mot
  cream bakgrund — mot alla andra satt en beige klump i månen. `.cut()` provades som fix och
  **fungerar inte här**: `GraphicsContext.cut()` bryter efter första instruktionen som saknar
  hål, så med `.fill().stroke()` fastnar hålet på konturen och fyllningen förblir hel
  (en ring ovanpå en solid disk). Skäran är nu ett eget slutet drag.
- 🍐 var en cirkel **plus** en ellips, båda stroke:ade. Sömmen där de möttes syntes och päronet
  läste som en snögubbe. Nu ett enda slutet drag, med stjälk och blad.

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
| 4 | Fördjupad `scene.js` (djupband, dis, vinjett, tid) | C7 | 55 spel | ✅ v1.43.0 |
| 5 | `lib/kamera.js` | C6 | nya spel; scenens djupband blir parallax | ✅ v1.44.0 |
| 6 | `FluidWorld` → `vattenvagen` + `golvet-ar-lava` | B1 | 2 spel, sedan 6 till | ✅ v1.45–46.0 |
| 7 | `lib/rep.js` (verlet + `MeshRope`) | B3+C5 | ersätter 4 kopior | ⬜ |
| 8 | Material med ljud/partikel/spår | B4+B5 | 23 fysikspel | ✅ v1.52.0 |
| 9 | `lib/karaktarer.js` (mood-rigg) | A3 | 29 Bobo-spel | ⬜ |
| 10 | Detaljnivå i `artikoner.js` | C8 | 13 spel | ✅ v1.42.0 |
| 11 | `lib/mjukkropp.js` | B2 | 6 spel | ⬜ |
| 12 | Beslut om `p2-es` | A1 | dokumenten | ✅ v1.49.0 *(borttagen)* |

**Grind per rad:** `npm run check` grön · `npm run test:all` 72/72 med 0 konsolfel · skärmdump
granskad med ögat · FPS mätt på plattan när raden rör rendering eller partiklar.
