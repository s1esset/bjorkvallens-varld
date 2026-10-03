# FYSIKPLAN.md — fysikbiblioteken: rätt i varje bildtakt, och fler sätt att röra fysiken

Planen täcker appens fysikbibliotek (`physics.js` · `launcher.js` · `DragController.js` ·
`fjader.js` · `flytkraft.js` · `luftmotstand.js` · `magnet.js` · `mjukkropp.js` · `vatska.js` ·
`rep.js` · `varme.js` · `kamera.js` · `partiklar.js` · `utplacering.js`) och de egna lösningar
spelen byggt bredvid dem. Tre frågor styr: **vad är fel i dag** (och syns inte i ett grönt
test), **var kostar fysiken faktiskt**, och **vilka nya sätt att röra fysiken** — grepp, kast,
sikte, styrning, laddning — som går att bygga inom P0 för varje åldersband.

Den här filen skriver inte om det som redan är gjort i `docs/LYFTPLAN.md` spår B (B1–B6c
och B8 är byggda; B7 `kugghjulen` står öppen och har en kund här, F10) eller i ÅTGÄRDER
V10/V10b (statisk `studs` — migreringen fortsätter där, inte här).

> Mätt 2026-10-01 mot `HEAD` `2712532` (v1.286.0) plus arbetsträdet. matter-js **0.20.0**,
> pixi.js **8.19.0**. ⚠️ Andra agenter ändrar spel just nu (Spår F omgång 2): radnummer i
> `bowling` · `bygg-tornet` · `fanga-frukten` · `lagerelden` · `studsmatta` · `saftbaren` ·
> `hamburgerbygget` · `zackes-biltvatt` m.fl. kan ha flyttat sig — **greppa på det citerade
> uttrycket**, lita inte på numret.
>
> Spelgenomgången i §5 (spåren P, U och L) är gjord samma dag mot v1.288.0.
>
> Taggar: **[Quick]** timmar · **[Medium]** ett pass · **[Deep]** nytt system.
>
> **Hur siffrorna togs.** Grep och läsning av koden, plus åtta engångsmätningar i Node som körde
> bibliotekens EGEN kod (`src/lib/*.js`) och Pixis EGEN `Ticker` (`node_modules/pixi.js`) — inga
> repo-filer skrevs, ingen webbläsare startades (andra agenter körde webbläsare, och två
> webbläsarsonder samtidigt förfalskar varandra). Varje sådan mätning hade en kontrollarm som
> gav det kända svaret först (t.ex. 60 Hz med exakt ett steg per bildruta → flytjämvikt exakt
> 1/flyt). **M1** gör mätningarna permanenta i `scripts/_fysikbank.mjs`. Där en rad bygger på
> ett antagande står det **premiss (oprövad)** och vilken sond som avgör den.

---

## 0. Sammanfattning — de åtta raderna med störst effekt

| # | Rad | Vad den löser — mätt eller prövat i koden | Stl | Kunder |
|---|---|---|---|---|
| 1 | **T1–T4 Fysik som inte beror på bildtakten** | Fyra sorters kod lägger kraft eller stegar en lösare **per bildruta** i stället för per fysiksteg. Uppmätt genom Pixis riktiga ticker (taket 60 fps i `App.js:24`): en flytare med `flyt 1,6` ska ligga på 0,625 — den ligger på **0,637 vid 60 Hz, 0,656 vid harnessens 57 fps, 0,746 vid 50, 0,927 vid 40 och SJUNKER (1,000) vid 30**. Magnetens fångsttid **700 → 1 133 ms** vid 30 fps. Lagereldens varma marshmallow **kollapsar** vid ≤ 40 fps (höjd 47,6 → 29,0 px). Ett rep hänger **1,9× djupare** vid 30 fps. Allt per steg: **identiskt vid alla takter**. En bildruta med exakt ett fysiksteg räknas likadant före och efter — det som flyttar sig är bara de rutor som redan i dag får noll eller två steg. | Quick–Medium | 15 spel |
| 2 | **K1 Avbruten pekning når aldrig spelen** | Pixi 8.19 registrerar aldrig `pointercancel` (`EventSystem.mjs:322-327`, och `EventBoundary.mjs:67-74` har ingen mappning). Avbryter webbläsaren ett finger (kantsvep, systemgest, appbyte) kommer inget släpp — och `DragController._onDown` avvisar varje nytt grepp medan `active` står kvar (`DragController.js:82`). **Premiss (oprövad):** permanent död träffyta i 23 spel. En brygga i `lib/pixilapp.js`, M3 avgör. | Quick | 23 + 7 + ~10 kontroller |
| 3 | **K2 Andra fingret kapar draget** | Varken `DragController` (`:117`, `:122-142`) eller `AimLauncher` (`launcher.js:97`, `:121-127`) jämför `pointerId`. En handflata eller ett andra finger som rör sig flyttar föremålet dit. Bara 4 spel filtrerar själva (`glasstornet` · `grodan-slurp` · `popcornkalaset` · `skattjakt-i-morkret`). | Quick | 30 spel |
| 4 | **M1 + M2 En gemensam mätsticka** | Alla Node-sonder för fysik stegar exakt 1/60 (`_flytprobe` · `_faltprobe` · `_mjukprobe` · `_repprobe` · `_fjaderprobe` …) och kan därför aldrig se rad 1. `_fysikbank.mjs` (Node, S1–S9) och `_taktprobe.mjs` (webbläsare, manuellt driven ticker, seedad slump) blir det mått varje framtida rad mäts mot. | Medium | alla |
| 5 | **G1 Fjädergreppet blir ett bibliotek** | `drivPunkt` (`popcornkalaset/karl.js:124-149`) — repots enda grepp som klarar en punkt långt från tyngdpunkten — och leksakslådans fart-mot-fingret (`leksakslada/index.js:637-660`) blir `lib/grepp.js`, med tap-tap, krafttak, kast och pekar-id. Småbarnens första nya kontroll, och grunden för storbarnens tvåhandsgrepp. | Medium | 2 port + nya |
| 6 | **R2 Kinematiska kroppar** | Statiska kanter som följer fingret flyttas med teleport per bildruta (`fanga-frukten:342-344` · `studsa-ner:652-653` · `studsmatta:487`). Uppmätt (S8): de **tunnlar igenom bollen vid ≥ 32 px/bildruta** och ger den **ingen rörelsemängd** (skyfflar). Driven med fart per steg: ingen tunnling upp till 48 px/bildruta. | Medium | 3 spel |
| 7 | **F1 Leder, gångjärn och motorer** | Tre spel bygger samma `Constraint.create + Composite.add` för hand (`balanstornet:301` · `vippbradan:222` · `knuffa-tornet:257`). `phys.gangjarn/led/pendel/motor/vridfjader` med `damping 0` som förval (CLAUDE.md-fällan). Öppnar `kugghjulen`s B7 (kuggverk med last), `kulbana`s propeller och `bajs-och-kiss`s gungande potta. | Medium | 3 port + 3 köade |
| 8 | **R1 Fällvakter i DEV** | Två av CLAUDE.md:s fysikfällor blir automatiska fynd i varje `npm run test`: **`statisk-fart`** (en statisk kropp som står still men bär fart — setPosition-fällan) och **`snurr`** (vinkelfart som skenar — Constraint-greppets 166 000°). Billigt, och skyddar allt som byggs efter. | Quick | 28 världar |

**Stängt med mätning — föreslås INTE** (skälen i spår O):
· **sömn (sleeping) som prestanda** — lösaren kostar 0,044 ms/steg vid 34 vilande kroppar; sömn
sparar 0,04 ms · **broadphase/kollisionsfilter** — kroppstalen är tiotal, inte hundratal ·
**delsteg som standard** — ändrar varje px/steg-kalibrering i repot och inget tunnlar i loggarna
· **global återställning av statisk restitution** — ÅTGÄRDER V10 · **tilt** — kräver
behörighetsdialog på iOS/iPadOS (G7) · **p2-es** — LYFTPLAN A1.

**Spelgenomgången (§5)** lade till tre spår — **P** fysik in i spelen, **U** omspelning, **L** bild
— och 30 enkla vinster. Den största raden därifrån: tre kärnmekaniker är skriptade fast ett mätt
verktyg redan finns — studsmattans studs (`Fjaderbrada`, P1), flipperspelets paddlar (R2) och
byggtornets klossar som låses statiska (F1).

---

## 1. Inventering

### 1.1 Biblioteken — vad de gör och vem som använder dem

Kundtalen är räknade på `import`-rader i `src/games/*/*.js`. **Inget av appens 87 spel är ett
storbarnsspel** (alla `ageRange` börjar på 2 eller 3) — varje storbarnskontroll i spår G saknar
alltså kund tills ägaren ber om en (Ä3).

| Modul | Gör | Kunder |
|---|---|---|
| `physics.js` | `PhysicsWorld`: matter-brygga, fast 1/60-steg (max 5/bildruta), `link`, `onCollision`/`onImpact`/`impactAudio`, `beforeStep`, `setWind`/`setGravity`, `MATERIALS` + `MATERIAL`/`mat()`, `studs`-opt-in, `speedToAccel`/`STEG2`, `predictTrajectory` | **29** importerar, **28** skapar en värld: bajs-och-kiss · balanstornet · bowling · bygg-tornet · domino · enhorning-glitterbajs · enhorningen-elvira · fanga-frukten · flipperspel · glasstornet · grodan-slurp · knuffa-tornet · kulbana · leksakslada · magnet-fiske · mata-monstret · mata-munnen · natskott-pa-stan · plask-i-vattnet · popcornkalaset · rulla-bollen-hem · snobollen · spindelhjalten · spindelnatet · studsa-ner · studsbollar · studsmatta · vippbradan (+ fyrverkeri bara för förhandsbanan) |
| `launcher.js` | `AimLauncher`: dra för riktning + kraft, levande prickbana, tap-fallback mot `defaultAim` | **7**: bajs-och-kiss · bowling · enhorningen-elvira · fyrverkeri · rulla-bollen-hem · spindelhjalten · studsbollar |
| `DragController.js` | dra-och-släpp med snäpp, tap-tap, tyngd i draget, opt-in kast (`onKast`) | **23**: balanstornet · borsta-tanderna · enkelt-pussel · flugan-pa-nasan · kla-efter-vadret · kla-pa-nallen · kugghjulen · lagerelden · leksakslada · loopdjuren · mata-monstret · mata-munnen · passa-formerna · plantera-fron · plask-i-vattnet · siffertaget · skuggmatchning · sortera-skrap · stor-liten · trollblandning · unika-knytt · vakna-pappa · vattenvagen (kast: bara mata-munnen) |
| `fjader.js` | `Fjaderbrada`: planka som lagrar ett anslag (`taEmot`/`steg`/`driv`/`flytta`) + mjukkropps-silhuett | **1**: kulbana |
| `flytkraft.js` | `Flytvolym`: lyftkraft ∝ nedsänkning, motstånd, fartspärr, ström | **2**: grodan-slurp · plask-i-vattnet |
| `luftmotstand.js` | `Motstandsvolym`: egen integrator, kvadratiskt luftmotstånd, vind som lufthastighet | **2**: ballonglyft · fallskarmen |
| `magnet.js` | `Magnetfalt`: drag/knuff/poler, styrka i px/steg | **1**: magnet-fiske |
| `mjukkropp.js` | `Mjukkropp`: verlet-ring + tryckvillkor, `path()` med kvadratiska mellansteg | **9** (+ `fjader.js`): fallskarmen · glasstornet · hamburgerbygget · lagerelden · mata-monstret · mata-munnen · popcornkalaset · pruttbad · unika-knytt |
| `vatska.js` | `FluidWorld` (Clavet SPH, spatial hash) + `FluidView` (metabollfilter) | **9**: golvet-ar-lava · mata-munnen · plask-i-vattnet · pruttbad · saftbaren · trollblandning · tvatta-djuret · vattenvagen · zackes-biltvatt |
| `rep.js` | `Rep` (verlet/PBD + FABRIK-längdpass), `ritaRep`, `repMesh` | **4**: kugghjulen · natskott-pa-stan · spindelnatet · zackes-biltvatt |
| `varme.js` | `Varmefalt`: `temp` (nu) och `grad` (sjunker aldrig) | **3**: lagerelden · popcornkalaset · trollblandning |
| `kamera.js` | `Camera`: parallaxlager, följning, dödzon, skak, zoom | **2**: grodan-slurp · spindel-zacke-svingar |
| `partiklar.js` | `ParticleContainer`-partiklar + `Emitter` (egen integrator) | **5** direkt + alla via `feedback.js` |
| `utplacering.js` | `slumpaUt` + `hinderUrFysik` (inga fickor) | **1**: flipperspel (medvetet inte app-bred, LYFTPLAN B8) |

**Kända svagheter, per modul (fil:rad):**

- **`physics.js`**
  - `update()` synkar vyn till senaste fysiksteget utan interpolation och utan tolerans mot
    vsync (`:422-456`). Simulerat genom Pixis ticker: 0- och 2-stegsrutor (§1.3.3) → T4/T5.
  - `Engine.create()` utan alternativ (`:92`): ingen sömn, inga iterationer i API:t —
    `grodan-slurp` skriver `phys.engine.positionIterations = 8` direkt (`grodan-slurp/index.js:308-310`) → R5.
  - `_buildWalls` skickar `{ isStatic: true, restitution: 0.4, friction: 0.6 }` rakt in i
    `Bodies.rectangle` (`:202`, `:212`): båda talen är döda — restitution 0 och friktion 1, och
    `_original` fångas aldrig (ÅTGÄRDER V10 fynd 3) → R3.
  - Statisk friktion är alltid 1 (`:248`); det finns ingen opt-in motsvarande `studs`, så
    `bowling` skriver `body.friction = 0.1` för hand efter skapandet (ÅTGÄRDER V10b) → R3.
  - Inga hjälpare för leder, kedjor, sammansatta eller konvexa kroppar → F1, F2, R6.
  - `removeBody` tar bara FÖRSTA länken till kroppen (`:300-301`).
- **`launcher.js`** — inget pekar-id (`:97`, `:121-127`); ritar om banan vid VARJE pekrörelse
  (`:121-127` → `:178-194`); `predict()` känner bara golv och väggar (`:232-266`), så varje
  studs mot en ramp eller en studsplatta ritas fel; tap-fallbacken skjuter MOT MÅLET
  (`:137-149`) — rätt för småbarn, men P0 storbarn HJÄLP förbjuder automatiskt sikte → G3.
- **`DragController.js`** — inget pekar-id (`:117`, `:122-142`); `_onDown` avvisar allt medan
  `active` är satt (`:82`), så ett grepp vars släpp aldrig kommer låser hela kontrollern → K1/K2.
  Kastet (`_slappFart`, `:156-174`) har bara en kund → G2.
- **`flytkraft.js`** — `steg()` är dokumenterad som "EN gång per bildruta, FÖRE `varld.update()`"
  (`:150-153`), och båda kunderna gör så (`plask-i-vattnet/index.js:1170-1171`,
  `grodan-slurp/index.js:1961` → `dammen.js:2140`). Matter nollar krafterna efter VARJE steg, så
  en bildruta med två steg ger kraften bara åt det första och en med noll steg dubblar den i
  nästa — mätt i §1.3.3 → T1. Fartspärren och `vridDamp` verkar även ovanför ytan (`:181-187`),
  och `grodan-slurp` tar därför ut grodans delar ur volymen under superhoppet
  (`groda.js:760-776`) → R4.
- **`magnet.js`** — `dra()` anropas per bildruta före `phys.update` (`magnet-fiske/index.js:703-707`
  före `:719`) — samma fel, mätt → T1.
- **`mjukkropp.js`** — `steg(dtF)` klämmer `dtF` till 0,2–2 (`:292`) och lägger fältet som
  `f²` (`:308-309`) medan `damp` och styvheten räknas per steg. CLAUDE.md har fällan, men fyra
  kunder stegar fortfarande med variabelt `dtF` (`lagerelden:968`, `glasstornet:742`,
  `fallskarmen:526`→`:600`, `pruttbad:2321` = ett steg per BILDRUTA) → T3. Omritningen, inte
  lösaren, är kostnaden (`docs/games/popcornkalaset.md:101`, `:123-125`) → O1.
- **`vatska.js`** — egen ackumulator, max 3 steg, ingen tolerans (`:258-269`) → T4. `area` saknas
  i `saftbaren` (`:235-242`) och `zackes-biltvatt` (`:289-300`) → O2. Ingen koppling till
  matter-kroppar utöver att spelen flyttar kolliderare själva (`plask-i-vattnet/index.js:578`,
  `:1176`) → F6.
- **`rep.js`** — `steg(dtF)` med fart × f och tyngd × f² (`:144`, `:162-163`); tre kunder
  variabelt `dtF` (`kugghjulen:1649`, `natskott-pa-stan:6027`, `spindelnatet:783`) och en som
  AVRUNDAR antalet steg (`zackes-biltvatt:786`: `clamp(round(dt·60), 1, 3)` — slangen går
  1,5–2× fortare på en skärm över 60 Hz om taket tas bort) → T3.
- **`luftmotstand.js`** — explicit Euler, dt klämt till 0–3 (`:131-165`); stabil vid de
  uppmätta gränsfarterna men aldrig takt-mätt → M1 S6 får en arm.
- **`varme.js`** — inga fynd: exponentiell och bildrutefri (`:142-145`).
- **`fjader.js`** — inga fynd (19 mått i `_fjaderprobe`). Dess `driv`/`flytta`-par
  (`:247-270`) är repots enda korrekta "kinematiska kropp" — och används inte utanför bräddan → R2.
- **Pixi-lagret (inte vår kod, men vår risk)** — `pointercancel` mappas aldrig
  (`EventSystem.mjs:322-327`, `EventBoundary.mjs:67-74`) → K1. `app.ticker.maxFPS = 60`
  (`src/shell/App.js:24`) tillsammans med tickerns heltalstrunkering (`Ticker.mjs:429-435`)
  hoppar simulerat över ~2 % av vsync-rutorna vid 60 Hz → T5/M5.

### 1.2 Egna lösningar som återkommer i två eller fler spel

| Lösning | Var (fil:rad) | Antal | Förslag |
|---|---|--:|---|
| Fast-stegs-ackumulator för en egen lösare | `hamburgerbygget/bulle.js:116-131` · `unika-knytt/ceremoni.js:591-596` · `mata-munnen/index.js:1849` · `mata-monstret/index.js:1110` · `pruttbad/index.js:491` · `grodan-slurp/dammen.js:2255-2276` · `elementlekplatsen/index.js:935-960` (nollställer aldrig vid taket) · `fyrverkeri/index.js:701` · `gravmaskinen/index.js:933` | 9 | **T3** `lib/takt.js` |
| Kraft eller fartändring per BILDRUTA på en matter-kropp | `studsa-ner:400`/`:843` (fläkten) · `magnet-fiske:693` · `fanga-frukten:366` · `bygg-tornet:655` · `studsbollar:891` · `enhorning-glitterbajs:794` · `glasstornet:757`, `:818` · `snobollen:1150`, `:1161` | 8 | **T2** |
| Statisk kant som följer fingret med teleport | `fanga-frukten:342-344` · `studsa-ner:652-653` · `studsmatta:487` · `enhorning-glitterbajs:779` (sensor) — rätt mönster finns i `fjader.js:247-270` och `grodan-slurp/hinder.js:421-491` | 4 | **R2** |
| Grepp på dynamisk kropp | `popcornkalaset/karl.js:124-149` (`drivPunkt`, punkt långt från tyngdpunkten) · `leksakslada/index.js:637-660` (fart mot fingret, tak per leksak) | 2 | **G1** |
| Gångjärn/pendel som rå `Constraint` | `balanstornet:301-307` · `vippbradan:222-229` · `knuffa-tornet:257-265` | 3 | **F1** |
| Vridfjäder (återförande moment per steg) | `balanstornet:13-20`, `:177` | 1 (+F10) | **F1** |
| Fartspärr mot tunnling | 13 filer (`MAX_FALL`/`MAX_V`/`maxFart`…), t.ex. `fanga-frukten:369`, `snobollen:1166-1168` | 13 | **R5** |
| Kollisionsetikett i par, med förälder | `bygg-tornet` · `knuffa-tornet` · `mata-monstret` · `spindelhjalten` · `vippbradan` (`bodyA.label`) + 11 rader `parent` i `grodan-slurp` | 6 | **R6** |
| Höjdfält för en vattenyta | `pruttbad/index.js:177`, `:360-363`, `:491` · `grodan-slurp/dammen.js:285-310`, `:2255-2290` | 2 | **F5** |
| Dämpad 1D-fjäder med fasta delsteg | `grodan-slurp/djur.js:112-131` · `sapbubblor/index.js:520-551` (dt-skalad) | 2 | T3 (`fjader1d` i samma modul) |
| Kropp ur kontur / sammansatt kropp | `grodan-slurp/dammen.js:1555-1572` · `popcornkalaset/karl.js:193-202` | 2 | **R6** |
| Brytbar kropp | `knuffa-tornet/index.js:146-148`, `:1398-1405`, `:1433` (glas, köas till nästa tick) | 1 | **F3** (med framtida kunder) |
| Kedja av matter-kroppar | `grodan-slurp/klibbrep.js:90`, `:101`, `:192` | 1 | **F2** (med framtida kunder) |
| Pendel som θ/ω-integrator | `gungan:97-98`, `:552` · `spindel-zacke-svingar:115-116` | 2 | **lyfts INTE** — LYFTPLAN B3 mätte att den slutna formen ÄR mekaniken (`_pendelprobe`) |
| Cellautomat | `elementlekplatsen/automat.js` | 1 | bara med `sandslottet` (IDEER #7), i samma commit |

### 1.3 Mätt läge

#### 1.3.1 Kroppstal och rivning (ur `.test-logs/*.json`, körningar 2026-09-30/10-01)

| | |
|---|---|
| Max dynamiska kroppar | `popcornkalaset` **34** · `leksakslada` **17** · `grodan-slurp` **13** · `domino` 6 · `knuffa-tornet` 5 · alla andra ≤ 4 |
| Max statiska kroppar | `studsa-ner` **53** (pinnarna) · `grodan-slurp` 28 · `flipperspel` 16 · `popcornkalaset` 15 |
| Sovande kroppar | **0 i alla** — `Engine.create()` sätter aldrig `enableSleeping` |
| Världar | alla 27 som skapade en värld i testkörningen loggade `skapad 1 · riven 1` — **exit-säkert på världsnivå** |
| Fysikfynd i loggarna | 0 (`nan-kropp`, `kropp-rymde`, `hog-fart`) — men harnessen spelar knappt fysikspelen (nio fasta tryck med x ≤ 950, `test-game.mjs:50-54`, och generiska drag) |

⚠️ Harnessens körningar är ~6 s långa; en riktig runda kan bära fler kroppar (`leksakslada`
16–22 leksaker, `popcornkalaset` 30 korn). Ordningen är ändå tiotal, inte hundratal.

#### 1.3.2 Lösarens kostnad (Node, desktop, ren tid runt `Engine.update` — inte rAF)

| Dynamiska kroppar (vilande hög) | ms/steg i dag | med sömn | iterationer 8/6 |
|--:|--:|--:|--:|
| 6 | 0,005 | 0,002 | 0,007 |
| 17 | 0,018 | 0,002 | 0,019 |
| 34 | **0,044** | 0,004 | 0,049 |
| 60 | 0,090 | 0,007 | 0,100 |
| 120 | 0,226 | 0,017 | 0,249 |

Kontroll: kostnaden växer med N, alltså mäter klockan lösaren. En platta är flera gånger
långsammare än en desktop — faktorn är **omätt** och mäts med `--cpu 6` i M4. Jämför:
**ett mjukt popcorn kostar 0,5–0,85 ms per bildruta att RITA OM** vid CPU ×4 mot ~3,5 µs att
simulera (`docs/games/popcornkalaset.md:101`, `:123-125`). Kostnaden bor i renderingen.

#### 1.3.3 Bildtakten (Node, Pixis egen `Ticker` med `maxFPS = 60`, vsync-stämplar kvantiserade till 0,1 ms)

| Skärm | Flytjämvikt `flyt 1,6` (rätt: 0,625) | Varm marshmallow: massans häng / höjd (rätt: 1,75 / 47,6 px) |
|---|--:|---|
| 60 Hz | 0,637 | 2,12 / 43,4 |
| 57,1 Hz (headless-harnessen) | 0,656 | 2,54 / 39,3 |
| 90 Hz | 0,637 | 1,68 / 48,2 |
| 120 Hz (tickern tar varannan ruta) | 0,630 | 1,94 / 43,7 |
| 50 Hz | 0,746 | 2,44 / 55,4 |
| 40 Hz | 0,927 | **−12,98 / 29,0 — kollapsad** |
| 30 Hz | **1,000 — sjunker** | **−10,11 / 35,0 — kollapsad** |
| **samma kod per fysiksteg / fast steg** | **0,625 vid alla** | **1,75 / 47,6 vid alla** |

Magnetfältet (`magnet-fiske`s tal, 150/220/290 px bort): fångst **700 / 1 250 / 1 950 ms** vid
60 Hz mot **1 133 / 2 133 / 3 433 ms** vid 30 Hz; per steg 700 / 1 250 / 1 950 vid båda. Ett rep
spänt 300 px med sag 1,15 (rep-kundernas typfall): djupaste punkt **82 px** vid 60 Hz,
**159 px** vid 30 Hz; fast steg 82 vid båda. (30 Hz ligger under taket, så tickern ändrar
inget där — de två mätningarna kördes med fast `deltaMS` per bildruta.)

Stegfördelning per avfyrad bildruta i `PhysicsWorld.update` (0 steg = bilden står still, 2 =
den hoppar dubbelt):

| Skärm | 0 steg | 1 steg | 2 steg | med snäpp 0,5 ms (T4) |
|---|--:|--:|--:|---|
| 60,00 Hz | **32,0 %** | 34,0 % | **34,0 %** | 0 / 98 / 2 % |
| 59,94 Hz | 0,0 % | 98,8 % | 1,1 % | 0 / 99 / 1 % |
| 57,1 Hz (headless) | 0,0 % | 95,0 % | 5,0 % | oförändrat (behöver T5) |
| 90 Hz | 15,1 % | 66,7 % | 18,1 % | oförändrat (behöver T5) |

⚠️ **Läs 60,00 Hz-raden rätt.** Vsync-stämplar ligger nästan exakt på multiplar av det fasta
steget, så ackumulatorns rest STARTAR på tröskeln och 0,1 ms-kvantiseringen slår den fram och
tillbaka. På en riktig skärm som går på t.ex. 59,95 Hz driver resten ut ur zonen efter ~15
bildrutor och kommer tillbaka var ~20:e sekund — alltså skurar, inte konstant. Hur det ser ut
på familjens plattor är **omätt** och avgörs av M5. De kvarvarande 2 % med snäpp är tickern som
hoppar över en vsync (`maxFPS`-taket + `| 0`-trunkeringen, `Ticker.mjs:430-434`).

#### 1.3.4 Kinematiska kanter (Node, S8)

En statisk vägg 16 × 120 px dras i sidled in i en boll (r 22):

| Väggens fart | Teleport per bildruta (dagens mönster) | Fart per fysiksteg (`setPosition(…, true)` i `beforeStep`, nollad i vila) |
|--:|---|---|
| 4–24 px/bildruta | bollen **skyfflas** framför väggen, fart **0,0** (ingen rörelsemängd) | bollen får fart 5,1–30,9 px/steg (1,29 × väggens) |
| 32 px/bildruta | **väggen passerar igenom bollen** | ingen tunnling, 41,2 px/steg |
| 48 px/bildruta | **igenom** | ingen tunnling, 61,8 px/steg |

32 px/bildruta är ~1 900 px/s — ett snabbt barnsvep. Fart per steg kräver därför ett fart-tak
(annars kastas frukten ur banan, P0).

---

## 2. Arbetsordrar

Varje order har samma fält. **Kontrollarmen körs FÖRST** (CLAUDE.md: en mätning som inte kan
skilja två kända lägen åt säger ingenting). En commit per lib-ändring och en per spel; spelkund
= `npm run check` grön + `npm run test <id>` 0 fel + titta på bilden.

### Spår T — takt och tidssteg

> Gemensamt för hela spåret: **i en bildruta med exakt ett fysiksteg är per-bildruta och
> per-steg samma sak.** Ingen ändring i spåret flyttar alltså ett handtrimmat spel i de rutorna —
> den rättar bara rutor med noll eller två steg och takter under 60 fps, där spelet i dag är fel.
> Vid realistiska 60 Hz (0,1 ms-stämplar, ~2 % tickerhopp) flyttar sig talen ändå lite
> (flytjämvikten 0,637 → 0,625, marshmallowen 2,12 → 1,75 px häng) — det är rättelsen, inte en
> ny trimning. Det är också skälet till att felet aldrig syntes: allt trimmades runt 57–60 fps.

#### T1. Kraftfält per fysiksteg: `Flytvolym` och `Magnetfalt` **[Quick]**

**Byggt 2026-10-02** (v1.297–1.300, 9ee62e5): `Flytvolym` lägger kraften per fysiksteg; kunder plask-i-vattnet, grodan-slurp och magnet-fiske (krafter i `beforeStep`), mätt: flytkraft 0,625 vid både 30 och 90 Hz.

- **Premiss — prövad:** `Flytvolym.steg()` körs per bildruta (`flytkraft.js:150-153`;
  `plask-i-vattnet/index.js:1170`, `dammen.js:2140`), `Magnetfalt.dra()` likaså
  (`magnet-fiske/index.js:703-707`). Matter nollar krafter efter varje `Engine.update`. Mätt i
  §1.3.3: jämvikten 0,625 → 0,656 (57 fps) → 1,000 (30 fps); fångsttiden 700 → 1 133 ms.
- **Bygg:** en `Flytvolym` som får `varld` med `beforeStep` registrerar sig själv per steg
  (`this._av = varld.beforeStep(() => this._steg())`) och för en egen stegklocka (t += 1/60 per
  steg) för gupp/vaggning. Det publika `steg(t)` blir en no-op med en DEV-varning när volymen
  redan stegar själv — annars dubbleras kraften i ett spel som inte hunnit migreras.
  Motståndsdämpningen (`:172-175`) och `bottenLugn` (`:177-180`) följer med in i steget. För
  `Magnetfalt` flyttar spelet sin loop (`magnet-fiske/index.js:690-710`) in i
  `phys.beforeStep` — fältet tar kroppar med egna optioner (pol), så en självregistrering vore
  mer API än den sparar. Uppdatera skill **fysik-spel** (avsnittet om `PhysicsWorld`): kraftfält
  och allt som ändrar fart läggs i `beforeStep`.
- **Kunder:** `plask-i-vattnet` · `grodan-slurp` · `magnet-fiske`.
- **Mätning:** M1 S6 — samma tank som `_flytprobe` genom Pixis ticker vid 30/40/50/57/60/90 Hz.
  **Kontrollarm:** dagens kod (förväntat: 1,000 / 0,927 / 0,746 / 0,656 / 0,637 / 0,637). Mätarm:
  0,625 ± 0,005 vid alla. Magneten: fångsttid inom ±2 % av 60 Hz-värdet vid alla takter. I
  spelen: `_plaskprobe` (stänk, +8–13 px nivå) och `_magnetprobe` — **ny baslinje i samma
  commit**, för harnessens 57 fps ger i dag 0,656 och efter fixen 0,625, och det är en ärlig
  förändring, inte en regression.
- **Risker/fällor:** dubbelapplicering under migreringen (därav no-op + varning). `grodan-slurp`
  sätter `stromX` per bildruta i `dammen.steg` — det är en parameter och får stanna där.
- **Beroenden:** M1 S6 (kan köras i samma pass).

#### T2. Spelens egna per-bildruta-krafter → `beforeStep` **[Quick]** per spel

**Byggt 2026-10-02** (v1.311–1.314): studsa-ner (fläkten), fanga-frukten (fånghjälp + fartgräns), bygg-tornet (centreringen) och snobollen (styrning) lägger krafterna i `beforeStep`, mätt: bygg-tornets landning 595,8 vid både 30 och 60 Hz (HEAD 607,1 vid 30). Kvar: magnet-fiske (gjord i T1), studsbollar, enhorning-glitterbajs, glasstornet.

- **Premiss — prövad i koden, effekten omätt per spel:** åtta spel lägger kraft eller ändrar
  fart per bildruta (§1.2, rad 2). Samma mekanism som T1, mindre spelvikt: fläkten
  (`studsa-ner:400`, anropad `:843` före `:844`), simtagen (`magnet-fiske:693`), fånghjälpen
  (`fanga-frukten:366`), centreringshjälpen (`bygg-tornet:655`, EFTER `:640` — slår på nästa
  bildrutas steg), gropbollarnas drift (`studsbollar:891`), böjen (`enhorning-glitterbajs:794`),
  knuffarna (`glasstornet:757`, `:818`) och styrningen (`snobollen:1150`, `:1161`).
- **Bygg:** flytta varje block in i `this._phys.beforeStep(…)` (spara unbindern, kalla den i
  `destroy`). Fart-blandningar (`v += (mål − v) · k`) är per steg därefter.
- **Kunder:** studsa-ner (`_flaktprobe`: 231 px = 0,72 fickor ska stå) · magnet-fiske ·
  fanga-frukten · bygg-tornet · studsbollar · enhorning-glitterbajs · glasstornet · snobollen.
- **Mätning:** M2 `_taktprobe <id> --hz 30,60` med samma seed. **Kontrollarm:** 60 Hz två gånger
  → identiska tal (bevisar determinismen). Mätarm: HEAD skiljer 30 från 60, fixen gör det inte.
  Per spel det tal som är spelets: fickträff (studsa-ner), fångstprocent (fanga-frukten),
  centrering (bygg-tornet), styrsvar (snobollen).
- **Risker/fällor:** `snobollen`s styrning är barnets direkta kontroll — mät att svaret vid
  60 Hz är oförändrat innan den flyttas. Hjälpkrafter som räknas på speltid (`dt`) måste räknas
  om till per-steg-tal.
- **Beroenden:** M2.
**Byggt 2026-10-02** (v1.361–1.363, 40e0150 · 3256f5b · 3816f98): resten av T2 — studsbollar (gropbollarnas drift), enhorning-glitterbajs (böjen + fartgränsen) och glasstornet (krypningen + magnetknuffen) i `beforeStep`, mätt: `_taktprobe` 30/60 Hz slutläge 80 / 342 px isär på HEAD → 0 / 0, glasstornet ≤ 1,0 → ≤ 0,2 px.

#### T3. Fast steg för mjukkroppar, rep och egna lösare: `lib/takt.js` **[Medium]**

**Byggt 2026-10-02** (v1.301–1.310, 2d9daa4 + åtta kunder): `lib/takt.js` (`uppdatera(deltaMS)`) stegar Mjukkropp/Rep/egna lösare med fast steg i lagerelden, glasstornet, fallskarmen, kugghjulen, spindelnatet, zackes-biltvatt, pruttbad, natskott-pa-stan (+ elementlekplatsen v1.357), mätt: marshmallowen kollapsar inte längre vid ≤ 40 fps, fallskärmens falltid 12,01 → 12,02 s.

- **Premiss — prövad:** åtta kunder stegar `Mjukkropp`/`Rep` med variabelt `dtF` eller ett steg
  per bildruta (§1.1). Mätt: varm marshmallow kollapsar vid ≤ 40 fps och har fel form vid
  harnessens 57 fps (2,54 / 39,3 mot 1,75 / 47,6); repet hänger 1,9× djupare vid 30 fps.
  CLAUDE.md:s fälla "en mjuk kropp måste stega med FAST tidssteg" gäller alltså fortfarande i
  fyra spel och har en ospecificerad tvilling i `rep.js`. Nio spel har skrivit sin egen
  ackumulator (§1.2, rad 1), en av dem utan nollställning vid taket
  (`elementlekplatsen/index.js:955-960` — ackumulatorn växer obegränsat på en långsam enhet).
- **Bygg:**
  ```js
  import { Takt } from '../../lib/takt.js'
  this._takt = new Takt({ steg: 1000 / 60, max: 3, snapp: 0.5 })
  // i tickern:
  this._takt.kor(ticker.deltaMS, () => this._soft.steg(1))
  this._takt.alfa   // 0..1 — resten, för interpolation (T5)
  ```
  `kor()` stegar alltid med exakt 1, kastar överskott vid `max` (och nollställer), och snäpper
  `deltaMS` inom ±`snapp` ms till exakt ett steg (T4). Bekvämlighet: `Mjukkropp.uppdatera(deltaMS)`
  och `Rep.uppdatera(deltaMS)` med en inbyggd `Takt`. Samma modul exporterar `fjader1d(w, zeta)`
  (ur `grodan-slurp/djur.js:112-131`, fasta delsteg 1/120 s).
- **Kunder (ett spel per commit):** lagerelden (`:968`) · glasstornet (`:742`) · fallskarmen
  (`:526`) · kugghjulen (`:1649`) · natskott-pa-stan (`:6027`) · spindelnatet (`:783`) ·
  zackes-biltvatt (`:786`) · pruttbad (`_stepPress` `:2321`). Valfritt, när spelet ändå rörs:
  hamburgerbygget · unika-knytt · mata-munnen · mata-monstret · pruttbad (vågen) ·
  grodan-slurp (vågen) · elementlekplatsen · fyrverkeri · gravmaskinen.
- **Mätning:** M1 S6 för libbet (häng/bredd/höjd vid 30–90 Hz; fast steg ska ge exakt samma tal
  vid alla). Per spel: lagerelden `_rostprobe` (styvhet 1,000 → 0,175 i lågan, 0,995 efter 3 s
  ur elden) · glasstornet `_vobbelprobe` (4,57 px utslag, 0,00 i vila) · spindelnatet
  `_tradprobe` (båge 13,4–14,1 % ut, 2,7–6,2 % in) · natskott `_natlinaprobe`/`_linabild` ·
  zackes-biltvatt `_stralprobe` · pruttbad `_pressprobe` (13,2 rutor) · kugghjulen `_remprobe`.
  **Kontrollarm:** varje sond på HEAD först — talen är tagna vid harnessens 57 fps, alltså med
  `dtF ≈ 1,05`, och ska flytta sig lite. **Titta på bilden** (`bildkoll` + öga): formen ändras
  från 57 fps-varianten till 60 Hz-varianten, vilket är rätt men syns.
- **Risker/fällor:** CLAUDE.md:s "för litet steg ger en annan JÄMVIKT" — trimningar gjorda med
  `dtF` ≈ 1,05 kan behöva en sista blick. `natskott-pa-stan` är 6 463 rader: rör bara stegraden.
- **Beroenden:** inga (M1 S6 mäter libbet).

#### T4. Ackumulator-snäpp i `PhysicsWorld` och `FluidWorld` **[Quick]**

**Byggt 2026-10-02** (v1.296, 7bf8180): ackumulator-snäpp ±0,5 ms i PhysicsWorld och FluidWorld, mätt: 60 Hz steg 0/1/2 per bildruta 32/34/34 % → 0/98/2 %, andra takter oförändrade.

- **Premiss — simulerad, inte uppmätt på enhet:** §1.3.3 — vid 60,00 Hz med 0,1 ms-stämplar
  ger `PhysicsWorld.update` (`:426-442`) 32 % noll-stegsrutor och 34 % dubbelsteg; med snäpp
  0 / 98 / 2 %. `FluidWorld.update` (`vatska.js:258-269`) har samma konstruktion.
- **Bygg:** `if (Math.abs(d − FIXED) < 0.5) d = FIXED` innan `d` läggs i ackumulatorn — eller
  båda lösarna byter till `Takt` (T3). Simuleringen går då 0,1 % långsamt på en 59,94 Hz-skärm
  (omärkligt) i stället för att hacka.
- **Kunder:** alla 28 världar + 9 vätskespel (ingen kod i spelen ändras).
- **Mätning:** M1 S6 stegfördelning (kontrollarm: dagens ackumulator → 32/34/34 %). På enhet:
  M5. I `test:all`: `_ab.sh physics.js vatska.js` (ändringen rör varje fysikspel — flakfrekvensen
  ska attribueras växelvis, inte sekventiellt).
- **Risker/fällor:** sonder som räknar steg per bildruta (`fysik-svalt`-larmet i `gamelog.js:600-602`)
  kan se färre svältsteg — det är rätt riktning.
- **Beroenden:** inga.

#### T5. Taket på 60 fps och render-interpolation **[Medium]** — villkorad (Ä1, Ä2)

- **Premiss — simulerad:** `app.ticker.maxFPS = 60` (`App.js:24`) gör att en 90 Hz-skärm får
  tickern på 2 av 3 vsync (deltaMS 11–28 ms, 15 % noll- och 18 % dubbelsteg) och att även en
  60 Hz-skärm tappar ~2 % av rutorna med kvantiserade stämplar. Vid 57 fps (harnessen) ger
  dagens synk 5 % dubbelsteg — uppmätt hack 6 → 12 px i en ruta, försvinner helt med
  interpolation (sd 1,31 → 0,00 px).
- **Bygg:** (a) mät först på enhet (M5). (b) Om tappen syns: ersätt `maxFPS` med en tolerant
  begränsare (hoppa över bara om `delta < 1000/60 − 1`) eller ta bort taket. (c) Opt-in
  `new PhysicsWorld({ interpolera: true })`: `link()`-synken lägger vyn på
  `positionPrev + (position − positionPrev) · alfa` (och vinkeln likadant) med `alfa` ur
  ackumulatorn.
- **Kunder:** spel med en kamera som följer en kropp (grodan-slurp, spindel-zacke-svingar via
  sin egen integrator — ej berörd) och spel med snabba bollar (bowling, studsbollar,
  flipperspel, snobollen). Ingen tvångsmigrering.
- **Mätning:** M1 S6 (ritad förflyttning per visad ruta, sd mot ideal); M5 på enhet; M4 för
  kostnaden om taket tas bort (en rendering per vsync i stället för högst 60 per sekund).
- **Risker/fällor:** vyn ligger upp till ett steg (16,7 ms) efter kroppen — allt som läser
  `view.x` som kroppens läge (DragController-snäpp, träffprov, kamerans `follow`) läser då en
  annan punkt än lösaren; `onUpdate(view, body)`-callbacks läser `body.position` och glider isär
  från en interpolerad vy. Därför opt-in per värld. Utan taket renderar en 120 Hz-skärm dubbelt
  så ofta — batteri (Ä2).
- **Beroenden:** T4, M5.

### Spår K — kontrollernas robusthet

#### K1. En brygga för avbrutna pekningar (`pointercancel`) **[Quick]**

- **Premiss — prövad i Pixis källa och vår, konsekvensen oprövad:** Pixi 8.19 lyssnar med
  PointerEvent bara på `pointerdown`/`pointermove`/`pointerup`/`pointerover`/`pointerleave`
  (`EventSystem.mjs:322-327`); översättningstabellen har en rad för `touchcancel` (`:14`), men
  ingen gren registrerar en lyssnare för den (touch-grenen tar bara `touchstart`/`touchend`/
  `touchmove`, `:335-337`), och `EventBoundary` har ingen mappning för typen
  (`EventBoundary.mjs:67-74`). Efter `pointercancel` skickar webbläsaren inget `pointerup`.
  Följd i vår kod: `DragController` behåller `active` och avvisar varje nytt grepp (`:82`) —
  CLAUDE.md:s "permanent död träffyta" (ÅTGÄRDER #13) i en ny form. `AimLauncher` återhämtar
  sig vid nästa tryck (inget avvisande) men lämnar prickbanan synlig. `grodan-slurp` lyssnar på
  `'pointercancel'` (`grodan-slurp/index.js:175`) — en lyssnare Pixi aldrig matar.
- **Bygg:** `lappaPekavbrott(app)` i `lib/pixilapp.js` (där appens Pixi-lappar redan bor), körd
  en gång av `App.js`. Skiss:
  ```js
  const sist = new Map() // pointerId → senaste PointerEvent
  document.addEventListener('pointermove', (e) => sist.set(e.pointerId, e), true)
  app.canvas.addEventListener('pointerdown', (e) => sist.set(e.pointerId, e), true)
  window.addEventListener('pointercancel', (e) => {
    const p = sist.get(e.pointerId) || e
    sist.delete(e.pointerId)
    window.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: e.pointerId, pointerType: p.pointerType, isPrimary: e.isPrimary,
      clientX: p.clientX, clientY: p.clientY, button: 0, buttons: 0, bubbles: true }))
  }, true)
  ```
  Händelsen skickas på `window`, alltså inte på duken → Pixi gör den till `pointerupoutside`
  (`EventSystem.mjs:241`) längs pressmålets egen kedja — det släpp varje kontroll redan lyssnar
  på. Ta bort `grodan-slurp`s döda `'pointercancel'`-lyssnare i samma veva (eller låt den stå —
  den är ofarlig).
- **Kunder:** varje Pixi-kontroll: 23 DragController-spel, 7 AimLauncher-spel, och spelens egna
  (knuffa-tornet `:801-845`, studsa-ner-fläkten, fanga-frukten-korgen, popcornkalaset, grodan-slurp …).
- **Mätning:** M3 `_pekavbrottprobe`. **Arm 0 (kontroll):** `touchStart → touchMove → touchEnd`
  på en bricka i `sortera-skrap`, sedan en ny pekning som tar en bricka → ska fungera på HEAD.
  **Arm 0b:** räkna `pointercancel` på `window` när CDP skickar `touchCancel` — är den 0 måste
  sonden skicka `new PointerEvent('pointercancel')` själv. **Arm A:** samma med `touchCancel` →
  HEAD: andra greppet misslyckas (`_drag.active` kvar), fixen: lyckas. ⚠️ **Lyckas andra greppet
  redan på HEAD faller premissen** — skriv det i ÅTGÄRDER och bygg inte bryggan.
- **Risker/fällor:** ett avbrutet finger över ett mål blir ett släpp PÅ målet (godkänt — aldrig
  ett straff). Dubbla släpp är ofarliga (`_onUp` kollar `active !== rec`). Musens pekare avbryts
  i praktiken aldrig. Bryggan lever hela appens livstid — den får inte ligga i ett spel.
- **Beroenden:** M3.
**Byggt 2026-10-02** (v1.379, d7cdcaa): `lappaPekavbrott(app)` i `pixilapp.js`/`App.js` — `pointercancel` blir `pointerup` på `window` → `pointerupoutside`; premissen höll för sortera-skrap och popcornkalaset, mätt: M3 arm A sortera-skrap 0 → 166 px, popcornkalaset 0 → 156 px, 6/6 lyckas.

#### K2. Pekar-id i `DragController` och `AimLauncher` **[Quick]**

- **Premiss — prövad i koden, effekten oprövad:** `globalpointermove` levereras för VARJE pekare;
  ingen av de två jämför `e.pointerId` (`DragController.js:117`, `:122-142`; `launcher.js:97`,
  `:121-127`). Ett andra finger (eller en handflata) som rör sig drar föremålet/siktet dit.
  `_lampprobe` visade att varje ny fingerpekning får ett nytt id — det är så filtret ska byggas.
- **Bygg:** spara `e.pointerId` vid `pointerdown`; ignorera move/up/upoutside med annat id
  (`rec._up` får ta emot händelsen). Skyddsnät som i `grodan-slurp:471-472`: ett nytt tryck på
  samma föremål medan `active` har stått kvar längre än 2 s utan rörelse avslutar det gamla
  greppet.
- **Kunder:** 23 + 7 spel, utan en rad i spelen.
- **Mätning:** M3 arm B: finger 1 drar en bricka, finger 2 trycker och rör sig 200 px bort.
  **Kontrollarm:** bara finger 1 → brickan följer det. HEAD: brickan hoppar till finger 2. Fix:
  följer finger 1. Samma för siktet i `spindelhjalten`. `_dragprobe` (tyngd, städning, exit mitt
  i drag) ska vara oförändrad.
- **Risker/fällor:** ett barn som byter hand mitt i draget — första handens släpp lägger ned
  föremålet, andra handen kan ta det igen (P0 ok). Harnessens mus har alltid id 1 — testet ser
  ingen skillnad, sonden gör det.
- **Beroenden:** K1 (annars kan ett id fastna).
**Byggt 2026-10-02** (v1.380, d1b8769): pekar-id-vakt + 2 s-skyddsnät i `DragController` och `AimLauncher`, mätt: M3 arm B sortera-skrap 656 → 0 px, spindelhjalten 690 → 0 px; `_dragprobe` = HEAD, `_pekidprobe` grön.

#### K3. En delad pekhjälpare: `lib/pekare.js` **[Medium]**

- **Premiss — prövad:** varje kontroll skriver samma sekvens (down på målet → move/up/upoutside
  på samma mål) och samma två fällor kommer tillbaka: släppet på ett SYSKON (CLAUDE.md,
  `skattjakt-i-morkret`) och pekar-id:t (K2). Mönstret finns i `DragController`, `AimLauncher`,
  `knuffa-tornet:801-821`, `studsa-ner`s fläkt, `popcornkalaset`, `grodan-slurp:172-179`.
- **Bygg:** `pekGrepp(yta, { traff(p), ned(p, mal, e), flytta(p, mal, e), slapp(p, mal, { avbruten }) })`
  → unbinder. En pekare åt gången, alla lyssnare på EN gemensam `static` förälder,
  `pointerupoutside` och den bryggade cancel-händelsen ingår. G1, G4, G5 och G8 byggs på den.
- **Kunder:** lib-kontrollerna först; spel bara när de ändå rörs.
- **Mätning:** M3 över DragController-, AimLauncher- och grepp-spel; `_lampprobe` (två id, två
  greppytor) ska vara grön mot en hjälpare-byggd variant.
- **Risker/fällor:** CLAUDE.md: en bubblande förälder MÅSTE vara `eventMode = 'static'`, och en
  bar `Container` utan geometri träffas aldrig (minnet "träffyta utan geometri").
- **Beroenden:** K1, K2.
**Byggt 2026-10-02** (v1.381, 550d0f1): `lib/pekare.js` `pekGrepp`, fristående — inga tvångskunder, `DragController`/`AimLauncher` ej portade, mätt: `_pekareprobe` 21/21, kontrollarmen (naiv kontroll) låter finger 2 dra.

#### K4. Prickbanan ritas en gång per bildruta, inte per pekrörelse **[Quick]**

- **Premiss — prövad i koden, kostnaden omätt:** `_pointerMove` ritar om hela banan (≈ 22 cirklar
  i en `Graphics`) för varje `globalpointermove` (`launcher.js:121-127` → `:178-194`). En
  pekskärm kan leverera fler rörelser än bildrutor.
- **Bygg:** spara senaste farten i `_pointerMove`, rita i en ticker-lyssnare om den ändrats.
- **Kunder:** 7 AimLauncher-spel.
- **Mätning:** M4 `_fysikkostnad spindelhjalten` under ett drag (rörelser per bildruta och
  bildrutearbete) mot kontrollarm utan drag; barlast-armen först. Bygg bara om utslaget är
  mätbart.
- **Risker/fällor:** inga kända.
- **Beroenden:** M4.
**Ej byggd** (2026-10-02): M4 mätte 177 pekrörelser på 430 bildrutor (< 1 per ruta) — de +0,32 ms är själva banritningen, ingen överritning, och `pointermove` är rAF-justerad i Chrome/Safari, så samma arm kan inte visa en vinst.

### Spår R — rätt fysik och ergonomi i libbet

#### R1. Fällvakter i DEV: `statisk-fart` och `snurr` **[Quick]**

**Byggt 2026-10-02** (v1.304, 74283d7): DEV-varningarna `statisk-fart` och `snurr` i PhysicsWorld-diagnosen.

- **Premiss — prövad:** `_diagSample` (`physics.js:135-178`) loggar redan NaN, rymning och
  toppfart, men två av CLAUDE.md:s dyraste fysikfällor syns inte: (1) en statisk kropp som bär
  en gammal fart (`setPosition(…, true)` + en paus — bräddan med (−651, −230) i hela byggfasen),
  (2) en vinkelfart som skenar (Constraint-greppet, 166 000° utan konsolfel).
- **Bygg:** i `_diagSample`: **`statisk-fart`** när en statisk kropp har |v| > 0,5 px/steg vid två
  prov i rad OCH inte flyttat sig > 0,5 px mellan dem (en kinematisk kropp i rörelse flaggas inte).
  **`snurr`** när en dynamisk kropp har |ω| > 1,5 rad/steg (≈ 5 000°/s; ett klot med radie 30 i
  20 px/steg rullar med 0,67). Båda som `varning` via `logPhysics` (`gamelog.js:588-607`).
- **Kunder:** alla 28 världar, via varje `npm run test`.
- **Mätning:** M1 S5/S8-armar i Node: `Fjaderbrada.driv` använd som drag + paus → MÅSTE flagga;
  `flytta` → får inte; Constraint-grepp vid r²·m/I = 3 → MÅSTE flagga `snurr`; ett rullande
  klot i 20 px/steg → får inte. Sedan `npm run test:all` en gång för baslinjen — varje träff är
  ett fynd att läsa med `_vilkaprobe`-mentalitet (identitet före slutsats).
- **Risker/fällor:** tröskeln är en gissning tills armarna ovan satt den. `grodan-slurp`s hinder
  drivs med `setPosition(…, true)` med flit — en träff där när hindret STÅR STILL är ett äkta fynd.
- **Beroenden:** M1 (armarna).
**Byggt 2026-10-02** (v1.363, 66e33a4): `test:all`-baslinjen för `statisk-fart`/`snurr` skriven som V-R1 i ÅTGÄRDER, mätt: 0 träffar i 87 spel, 289 prov i 27 fysikspel.

#### R2. Kinematiska kroppar: `phys.kinematisk(body)` **[Medium]**

- **Premiss — prövad (S8, §1.3.4):** teleporterade statiska kanter skyfflar utan rörelsemängd och
  tunnlar vid ≥ 32 px/bildruta. Spelen: `fanga-frukten:342-344` (korgens kanter + sensor),
  `studsa-ner:652-653` (tratten), `studsmatta:487` (mattan). Det rätta mönstret finns redan två
  gånger (`fjader.js:247-270`, `grodan-slurp/hinder.js:421-491`) men inte som verktyg.
- **Bygg:** `const k = phys.kinematisk(body, { maxFart: 12 })` → `k.till(x, y, vinkel)` från
  pekhanteraren; varje fysiksteg flyttas kroppen mot målet med `setPosition(…, true)`
  (förflyttningen ÄR farten, klämd till `maxFart`) och `setVelocity(0)` + `setAngularVelocity(0)`
  när den står still — så ingen gammal fart blir kvar (R1 vaktar). `k.flytta(x, y)` = bära utan
  kastkraft (Fjaderbrada.flytta-semantik).
- **Kunder:** fanga-frukten · studsa-ner · studsmatta (enhorning-glitterbajs sensor `:779`
  behöver ingen fart — rör inte).
- **Ny kund ur spelgenomgången (§5.5):** **flipperspel** — paddlarna är statiska kroppar vars
  läge och vinkel skrivs om varje bildruta (`Body.setPosition`/`setAngle` utan fart,
  `flipperspel/index.js:934-935`) och kicken är skriptad (`_tryKick` `:1033-1052`). En kula som
  ligger an skyfflas utan rörelsemängd, precis som i S8. Spelets doc §1 ("drivs med
  vinkelhastighet") är inaktuell. Kicken kan ligga kvar som golv. Dessutom P3:s behållare och
  P1:s studsmatta.
- **Mätning:** M1 S8 (kontroll: väggen står still → bollen orörd). Per spel en snabbdrags-arm i
  M2: dra korgen/tratten 40 px/bildruta genom fallande frukt — **antal som går igenom kanten** och
  **högsta frukt-fart efter mötet**, HEAD mot fix.
- **Risker/fällor:** **känslan ändras** — korgen knuffar nu frukten i stället för att skyffla den.
  `maxFart` håller den i banan (P0: aldrig fly ur banan); kör `_idleprobe` och fånga-sonden mot
  HEAD. matter väcker inte sovande kroppar av en statisk förflyttning (relevant först om R5:s
  sömn slås på).
- **Beroenden:** R1, M2.
**Byggt 2026-10-02** (v1.385–1.389, 5fb6afb): `phys.kinematisk(body,{maxFart})` (till/flytta/stopp i `beforeStep`) + kunderna studsmatta (P1), fanga-frukten, studsa-ner och flipperspel (paddlarna), mätt: S8 vägg i vila 0,000; snabbdrag 40 px/ruta teleport 12 igenom → 0; fanga-frukten 5/20 → 0/18 och studsa-ner 32/40 → 0/34 igenom; flipperspel uppåtfart median −25,1 (HEAD −21,9).

#### R3. Statisk friktion som opt-in, och de döda talen i libbet **[Quick]**

- **Premiss — prövad:** `setStatic` sätter friktionen till 1 (`physics.js:248`); parregeln är
  `min(A, B)`, så ett deklarerat lågt tal på en statisk yta gör ingenting så länge den rörliga
  kroppen har högre friktion. `bowling` behövde räckets 0,1 för att pricklinjen skulle gå från
  79 till 9 px fel (ÅTGÄRDER V10b) och sätter den för hand. `_buildWalls`' 0,4/0,6 (`:202`) är
  döda och vilseledande.
- **Bygg:** `{ isStatic: true, friktion: 0.1 }` i `_make` (sätts efter `setStatic`, uppdaterar
  `_original`, loopar `parts` — exakt som `studs`). `check.mjs --studs` listar även deklarerad
  `friction` på statiska kroppar (läslista, inte fixlista). Stryk talen i `_buildWalls` (de har
  aldrig gjort något — ÅTGÄRDER V10 fynd 3) och skriv vad väggarna faktiskt är.
- **Kunder:** bowling (byt handraden mot nyckeln — identiskt beteende). Läslistan avgör fler;
  `flipperspel`s stolpar/dynor (0,02, `:500`, `:797`) mot kulans friktion är första frågan.
- **Mätning:** `_studsprobe` ny §: glidsträcka för en kloss på en statisk ramp med `friktion`
  0,1 mot utan (kontroll: utan nyckeln ska talet vara identiskt med i dag). `bowling` §7 ska stå
  på 9 px.
- **Risker/fällor:** samma lärdom som V10b: den rörliga kroppens EGET tal är golvet (här taket,
  `min`) — läs det innan en kund väljs.
- **Beroenden:** inga.
**Byggt 2026-10-02** (v1.382, 3151c63): `{ isStatic, friktion }` i `_make` + `check --studs` listar `friction`, döda väggtal strukna, bowling på nyckeln, mätt: `_studsprobe` §8 glid 111,4 (utan) / 168,2 (nyckel = handrad), §7 9,07 = 9,07 px.

#### R4. `Flytvolym` som spärrar bara i vattnet (opt-in) **[Quick]**

- **Premiss — prövad:** fartspärren och `vridDamp` verkar på varje kropp i volymen var den än är
  (`flytkraft.js:181-187`, med avsikt — det är tunnlingsskyddet). `grodan-slurp` tar därför ut och
  lägger tillbaka grodans delar runt varje superhopp (`groda.js:760-776`), och CLAUDE.md har
  fällan "en Node-sond utan spelets flytvolym mäter en snällare värld".
- **Bygg:** `lagg(body, { sparr: 'vatten' })` → spärr och vridDamp bara när nedsänkningen > 0.
  Förval oförändrat.
- **Kunder:** grodan-slurp (ta bort `_iVolym`-växlingen).
- **Mätning:** `_superhoppprobe` (med flytvolym) — höjd, längd, volt och stjärnpose identiska med
  HEAD; `_tumlaprobe` tummel/hopp oförändrat; `_flytprobe` orörd.
- **Risker/fällor:** en del som flyger fort OVANFÖR vattnet har då ingen spärr alls — `hog-fart`
  i `_diagSample` vaktar.
- **Beroenden:** T1 (samma fil, samma pass).
**Byggt 2026-10-02** (v1.383, 36248ad): `Flytvolym.lagg({ sparr: 'vatten' })` opt-in; grodan-slurp ej portad (landhopp 188,9 → 192,2 px, studs 4 → 7 steg — `vridDamp` dämpar ragdollen på land), mätt: `_sparrprobe` ovanför ytan 39,6/0,30 mot 21,78/0,27, `_flytprobe` + seedad `_superhoppprobe` = HEAD.

#### R5. `PhysicsWorld`-optioner: iterationer, sömn, fartspärr **[Quick]**

- **Premiss — prövad:** iterationerna skrivs direkt på motorn (`grodan-slurp/index.js:308-310`),
  sömn går inte att slå på (`physics.js:92`), och 13 filer har egna fartspärrar (§1.2).
- **Bygg:** `new PhysicsWorld({ iterationer: { position, fart, villkor }, sova: false })` och
  `phys.fartTak(body, max)` (per steg, i `afterUpdate`-läge så det gäller farten lösaren lämnar).
  Sömn är opt-in och ska motiveras av STABILITET (vilokryp), aldrig av kostnad (§1.3.2).
- **Kunder:** grodan-slurp (iterationer); fartspärrarna migreras bara när ett spel ändå rörs;
  sömn bara efter M1 S1 + spelsond (bygg-tornet, balanstornet — vilande högar som darrar?).
- **Mätning:** M1 S1 (vilokryp px/10 s och kostnad, sova av/på); S3 (fartspärr mot tunnling).
- **Risker/fällor:** matter-sömn fryser kroppar som tappat sitt stöd om ingen väcker dem; en
  statisk kropp som flyttas väcker ingen (R2 måste väcka).
- **Beroenden:** M1.
**Byggt 2026-10-02** (v1.382, 3151c63): `PhysicsWorld({ iterationer, sova })` + `fartTak(body, max)`; grodan-slurp via optionen, mätt: S1 utan optioner 0,000 px mot rå matter, kryp 8,9 px/10 s (sömn av) mot 0; S3 60 px/steg tunnlar utan tak, studsar med tak 12.

#### R6. Kontaktetiketter och kroppsfabriker **[Quick]**

- **Premiss — prövad:** 17 spel går igenom `e.pairs` och matchar `label` för hand; sex av dem
  (bygg-tornet · knuffa-tornet · mata-monstret · spindelhjalten · vippbradan · grodan-slurp) måste
  dessutom tänka på att en sammansatt kropps par pekar på DELEN, inte föräldern.
  `grodan-slurp/dammen.js:1555-1572` (kropp ur kontur) och `popcornkalaset/karl.js:193-202`
  (sammansatt kropp) bygger förbi `_make`.
- **Bygg:** `phys.paKontakt('kula', 'kagla', (kula, kagla, par) => …)` — matchar i båda
  ordningarna och läser `part.parent.label`. `phys.konvex(punkter, opts)` och
  `phys.sammansatt(delar, opts)` som går genom `_make` (alltså väckbara och med `studs`/`friktion`).
  `phys.grupp()` = `Body.nextGroup(true)`.
- **Kunder:** inga tvångsmigreringar; nya spel och kunder i G/F använder dem.
- **Mätning:** M1-armar: `paKontakt` får samma par som en handskriven matchning över en 600 steg
  lång kollisionsström; `konvex` lägger hörnen exakt på punkterna (0,0 px, som
  `_konvexKropp` lovar).
- **Risker/fällor:** `Bodies.fromVertices` med konkav kontur kräver poly-decomp (finns inte) och
  faller tillbaka på konvext hölje — dokumentera, kasta inte.
- **Beroenden:** inga.
**Byggt 2026-10-02** (v1.382, 3151c63): `paKontakt`/`konvex`/`sammansatt`/`grupp`, mätt: S10 paKontakt 139/139 par (delens etikett 39), konvex 0,000 px mot 593,8 för rå `fromVertices`.

### Spår O — optimering där kostnaden faktiskt ligger

> **Princip, mätt:** lösaren kostar 0,044 ms/steg vid 34 kroppar (§1.3.2); ett mjukt popcorn
> kostar 0,5–0,85 ms per bildruta att rita om vid CPU ×4. Optimera RENDERINGEN. Och mät aldrig
> kostnad med rAF-intervallet — det klipps av vsync (CLAUDE.md); mät bildrutearbete
> (`_popcornomrit`-mönstret: stämpel före spelet och efter Pixis render) med en barlast som
> kontrollarm, eller en profilerare.

#### O1. Mjuka kroppar som mesh i stället för omritad `Graphics` **[Medium]** — hypotes

- **Premiss (oprövad):** kostnaden per mjuk kropp är `Graphics.clear()` + `path()` +
  triangulering varje bildruta (`mjukkropp.js:408-423`; `popcornkalaset` håller därför
  `MAX_SAMTIDIGA_POPP = 8`, `index.js:53`). En `MeshSimple`-solfjäder (mitt + ring + mellansteg
  ur samma kvadratiska kurva) uppdaterar bara hörnpositioner — ingen triangulering.
- **Bygg:** `mjukMesh(m, { farg, tathet })` → `{ mesh, uppdatera(), destroy() }`, fyllning via
  `Texture.WHITE` + `tint`; gradientfyllningar via en Canvas2D-textur cachad per färg (aldrig
  `generateTexture`, aldrig en `FillGradient` per montering). Konturen som en andra remsa.
- **Kunder (om mätningen bär):** popcornkalaset (höj taket) · pruttbad · glasstornet ·
  mata-monstret · mata-munnen · hamburgerbygget · lagerelden · fallskarmen · unika-knytt.
- **Mätning:** `_popcornomrit` N = 8/16/24 med `path()` mot `mjukMesh` (barlast 4 ms måste flytta
  mätaren ~3,7, som i B0). **Bygg vidare bara vid ≥ 2× billigare.** `_graflackprobe` efter tolv
  spelbyten: en mesh som äger sin `MeshGeometry` får inte bli kvar (samma familj som V16).
- **Risker/fällor:** formen måste vara pixellik `path()` (mät med `_bullprobe`-mönstret: ritad
  geometri, inte tillstånd); C2/C3-fällorna om texturbakning.
- **Beroenden:** M4.
**Byggt 2026-10-02** (v1.416, d4fd9cc): `lib/mjukmesh.js` + popcornkalaset 8 → 24 samtidiga popp (och uppvärmningsfix, fyllnad 0,03 → 1,00), mätt: `_popcornomrit --spel-ab` 2,71×/2,43×/3,00× vid N 8/16/24, barlast 3,4–4,1 ms.

#### O2. `FluidView.area` i `saftbaren` och `zackes-biltvatt` **[Quick]**

- **Premiss — prövad:** sju av nio vätskespel sätter `area`; de två som inte gör det kör filtret
  över hela förvalsytan 1520 × 1080 (760 × 540 rendermål vid `resolution 0.5`, tre pass —
  `vatska.js:687-702`). Bibliotekets egen kommentar: kostnaden betalas "i tappade
  WebGL-kontexter i ANDRA spel".
- **Bygg:** sätt `area` till den yta vätskan kan nå (glasraden i `saftbaren`; strålens fält i
  `zackes-biltvatt` — bredare, men inte hela skärmen).
- **Kunder:** saftbaren · zackes-biltvatt.
- **Mätning:** rendermålets pixlar (ur `boundsArea × resolution`, före/efter) + `_vatskeprobe` /
  `_stralprobe` (målade pixlar oförändrade — en för snål yta klipper vätskan) + `_ab.sh` för
  flakfrekvensen i `test:all` (växelvis, HEADs egen frekvens bredvid).
- **Risker/fällor:** metabollen sväller ~30 px utanför partiklarna — marginal i ytan.
- **Beroenden:** inga.
**Byggt 2026-10-02** (v1.384, 316ea5d): `FluidView.area` i saftbaren = ytan saften når, mätt: rendermål 410×400 → 214×200 px, synliga vätskepixlar 20 159 = 20 159 (kontrollarm snål yta 5 705).
**Ej byggd** (2026-10-02): zackes-biltvatt — premissen föll, `area` fanns redan (`Rectangle(60,120,1160,FLOOR_Y-60)`, 6ae3db5).

#### O3. Omritning bara vid rörelse — för rep, trådar och prickbanor **[Quick]** per spel

- **Premiss (oprövad per spel):** `glasstornet`, `fallskarmen` och `fjader.js` grindar redan
  omritningen på rörelse; rep ritas med tre `stroke` per bildruta (`rep.js:294-301`) även när de
  hänger still (`kugghjulen:976`, `:1016-1017`).
- **Bygg:** rita om när största punktförflyttningen > 0,05 px (samma tröskel som
  `Fjaderbrada._mjukFart`), plus en sista ritning när den faller under.
- **Kunder:** kugghjulen · spindelnatet · natskott-pa-stan (de som M4 visar betalar).
- **Mätning:** M4 per spel — bygg bara där bildrutearbetet rör sig mätbart.
- **Beroenden:** M4.

**Stängt med mätning (inga arbetsordrar):**
- **Sömn som prestanda** — 0,044 → 0,004 ms/steg vid 34 kroppar = 0,04 ms vinst (§1.3.2). Som
  stabilitet: R5, efter mätning.
- **Broadphase och kollisionsfilter** — matter 0.20:s sorteringssvep med 6–34 dynamiska kroppar
  är redan försumbart; filter används där de behövs för BETEENDE (grodan, kärlen).
- **Delsteg som standard** — matter 0.20 normaliserar farten mot 16,67 ms, men varje
  `beforeStep`-impuls och varje px/steg-konstant i repot (förhandsbanans 0,2778 × gravityY,
  `speedToAccel`) skulle byta betydelse. Inga `kropp-rymde`/`hog-fart` i loggarna. Opt-in per
  värld bara för ett nytt spel där M1 S3 visar tunnling.
**Ej byggd** (2026-10-02): M4 mätte `Rep.steg` 0 anrop per bildruta med stilla rep i kugghjulen, spindelnätet, natskott-pa-stan och spindelhjalten; fysiken 0,02–0,21 ms av 0,9–3,4 ms (< 10 %) — inget mätbart utslag att ta hem.

### Spår F — nya features

#### F1. Leder, gångjärn, motorer och vridfjädrar i `PhysicsWorld` **[Medium]**

- **Premiss — prövad:** tre spel bygger rå `Constraint` + `Composite.add` (`balanstornet:301-307`,
  `vippbradan:222-229`, `knuffa-tornet:257-265`); vridfjädern finns en gång (`balanstornet:13-20`,
  `:177`); motorer finns inte. CLAUDE.md: konstraintens `damping` jämför MITTPUNKTER och bromsar
  stel rotation (0,18 → 0,002 rad/steg på 40 steg).
- **Bygg:**
  ```js
  const g = phys.gangjarn(planka, { x: CX, y: PIVOT_Y })           // längd 0, styvhet 1, damp 0
  g.vridfjader({ vila: 0, k: STOD_K, damp: STOD_DAMP })            // per steg (balanstornets formel)
  g.motor({ fart: 0.05, maxMoment: 0.02 })                         // rad/steg mot målfart, momenttak
  const p = phys.pendel({ x, y }, kula, { langd, styvhet, damp: 0 })
  const l = phys.led(a, b, { ankA, ankB, styvhet: 0.95, damp: 0 }) // stiftled, grodans mönster
  g.ta()                                                           // destroy() tar allt ändå
  ```
  Motor och vridfjäder läggs som vinkelimpulser per steg i `beforeStep` — fördelade efter
  `inverseInertia` som ett par när leden sitter mellan två kroppar (ragdoll-minnet).
- **Kunder:** balanstornet · vippbradan · knuffa-tornet (port); kulbanas propeller (köad,
  `docs/games/kulbana.md:155`), bajs-och-kiss gungande potta (`docs/games/bajs-och-kiss.md:72`),
  enhorningen-elvira gungande moln (valfritt); grundlag för G8 och F10. grodan-slurp behåller
  sina leder (muskler och vybyte är spelets).
- **Nya kunder ur spelgenomgången (§5.5):** **bygg-tornet** först — en lagd kloss låses statisk
  (`_lockActive`, `Body.setStatic` `:384-386`), så tornet kan aldrig svaja; leder mellan
  klossarna och en vridfjäder vid basen låter det gunga som helhet utan att rasa. Sedan
  flipperspel (snurran är bara bild, `:940-945`) · domino (klockan är en gsap-tidslinje,
  `:914-919`) · kulbana (vippa och dominobit som bandelar) · studsbollar (gungande korg) ·
  studsa-ner (snurror bland pinnarna) · rulla-bollen-hem (svängande grind = motor) ·
  fanga-frukten (frukten gungar i skaftet) · spindelhjalten (knoppen rör sig).
- **Mätning:** M1 S4: gångjärnets drift under last ≤ 0,5 px över 10 s; pendelns energi över 10 s
  med `damp 0` mot `0,1` (**kontrollarm = fällan, ska tappa**); motorn når målfart under last
  inom N steg och överskrider aldrig momenttaket. Port: `_vippprobe` (puff + ljud + skak vid
  nedslag) och balanstornets egen kalibrering (tung kloss ytterst → 0,183 rad, filhuvudet
  `:18-20`) ska ge samma tal; knuffa-tornet `_tornprobe` noll fysikavvikelser.
- **Risker/fällor:** `constraintIterations` 2 som förval räcker inte för kedjor av leder
  (grodan: 5); en motor utan momenttak är en kraftkälla utan gräns (popcorn-greppets lärdom).
- **Beroenden:** R5 (iterationer), M1 S4.
**Byggt 2026-10-02–03** (v1.395–1.450, f298c49 libbet): `phys.gangjarn/pendel/led` med vridfjäder + motor; portarna balanstornet, vippbradan och knuffa-tornet samt nio kunder: bygg-tornet (v1.401), kulbana (1.405, F1+G8), flipperspel (snurrskivan), domino (klockan), studsbollar (korgen), rulla-bollen-hem (grinden), studsa-ner (snurrorna), fanga-frukten (frukten i en pendel), spindelhjalten (studsknoppen på en fjäder), mätt: drift 0,000 px/10 s, motor aldrig över taket, portar bit-för-bit lika (S4); bygg-tornet max 4,24° och 0 lämnat över 2×20 klossar; kulbanan avvikelse 0,0000 mot 0,0911 (HEAD 0,035).

#### F2. Kedjor och rep som matter-kroppar: `phys.kedja()` **[Medium]**

- **Premiss — prövad:** en kedja som KROCKAR med världen (inte bara ritas) finns en gång:
  `grodan-slurp/klibbrep.js` (13 länkar, 15 px, styvhet 0,85, damping 0,04, egen negativ grupp).
  Verlet-`Rep` kan inte knuffa en matter-kropp.
- **Bygg:** `phys.kedja({ fran: kropp | punkt, till, lankar, seg, radie, grupp, styvhet, damp })`
  → `{ lankar, leder, ta() }`. Klibbandet stannar i grodan.
- **Kunder:** grodan-slurp (port); bajs-och-kiss gungande potta på kedja; framtida
  `blackfisken-otto` (IDEER #3) om armarna ska kollidera. Byggs inte före en andra kund.
- **Mätning:** M1-arm: töjning i % under last, ingen NaN över 3 000 steg, kostnad per länk (S7).
  Port: `_superspelprobe` repet fångar/klibbar som förut.
- **Risker/fällor:** matter-kedjor töjs och kan explodera med tung last — `Rep`s FABRIK-pass finns
  inte här; dämpningsfällan (F1).
- **Beroenden:** F1.

#### F3. Brytbara kroppar: `phys.brytbar()` **[Medium]** — tonen är ägarens (Ä7)

- **Premiss — prövad:** `knuffa-tornet`s glas spricker vid hård träff och FÖRSVINNER i gnistor
  (`:146-148`, `:1398-1405`, `:1433`) — med rätt detalj: borttagningen köas till nästa tick, inte
  mitt i matters kollisionshändelse.
- **Bygg:** `phys.brytbar(body, { grans: 6 /* normalFart px/steg */, bitar: (body) => [...], livstid: 3, tak: 12, onBryt })`
  → vid anslag över gränsen (`onImpact`s `normalFart`) köas en delning; nästa steg ersätts kroppen
  av bitar som ärver `v + ω × r`, tonar bort efter `livstid`, och aldrig fler än `tak` i världen.
- **Kunder:** knuffa-tornet (glaset i riktiga bitar); framtida `brobyggarna` (IDEER #10,
  storbarn — en led med brottgräns är F1 + samma kö).
- **Ny kund ur spelgenomgången (§5.5):** **snobollen** — krossade hinder slungas i dag med
  skriptad fart (`setVelocity` `:1379`, `:1400`). Den köade "snögubbe att krocka i bitar" blir
  F3:s andra småbarnskund, och rundade snöklumpar passar Ä7-tonen.
- **Mätning:** M1 S9: rörelsemängden före/efter delning inom 1 %; ingen bit föds överlappande
  statisk geometri (utkastfart ≤ 2 px/steg); taket håller. I spelet: `_tornprobe` + bild.
- **Risker/fällor:** P0 småbarn — rundade bitar och glitter, inga vassa skärvor, inget som läses
  som "du förstörde". Ta aldrig bort en kropp inne i en kollisionshändelse.
- **Beroenden:** F1 (för brottgräns på leder), R6.
**Byggt 2026-10-02** (v1.410–1.412, b6ea4ed libbet): `phys.brytbar` (kroppar delas i rundade bitar ett steg efter anslaget, tak + livstid) + knuffa-tornet (glaset → fyra godisbitar med glitter, Ä7) och snobollen (fyra snöklumpar), mätt: S9 p-fel 0,0000 %, inträngning 0,000 px (kontroll 19,7), tak 12 håller; 2 rundor × 4 bitar, 0 fel.

#### F4. Vindfält och strömmar: `lib/vind.js` **[Medium]**

- **Premiss — prövad:** `setWind` är global och konstant (`physics.js:182-185`); den enda
  regionala vinden är `studsa-ner`s fläkt (`:387-401`, per bildruta — T2); `Motstandsvolym`
  modellerar redan vind som LUFTHASTIGHET (`luftmotstand.js:87-92`) men bara för sin egen
  integrator.
- **Bygg:** `new Vindfalt({ varld, form: { typ: 'band' | 'kon', … }, luft: { x, y }, avtag, puff })`
  — stegar per fysiksteg, verkar som ett motstånd mot fart RELATIVT luften (lätt sak följer med,
  tung släpar), styrkan i px/steg via `speedToAccel`. Filter per kropp.
- **Kunder:** studsa-ner (port), bajs-och-kiss (pruttvinden som en kon i stället för global),
  spindelhjalten (vindband), enhorningen-elvira (vindknappen).
- **Nya kunder ur spelgenomgången (§5.5):** flugan-pa-nasan (fläktens eget fält, `_vindKraft`
  `:826` — och ett **krav på F4**: spelets filhuvud mätte att en ren kon bara nådde 22 av 200
  flugpositioner, så `form` måste klara sug bakom plus kon framför) · sapbubblor (puffarna längs
  siktlinjen) · bowling (auto-hjälpens slumpknuff `:817-841` blir en synlig vindby) · fallskarmen
  (vind i höjdskikt) · kla-efter-vadret (blåsigt väder, i dag en sinus `:674`) ·
  rulla-bollen-hem (backar och gropar som kraftzoner i toppvy) · enhorningen-flyger (uppvind).
- **Mätning:** `_flaktprobe` 10 mynt per sida — **231 px = 0,72 fickor** ska stå efter porten;
  M1 S6 takt-invarians.
- **Risker/fällor:** en kort passage dimensioneras inte i sluthastighet (B5-lärdomen: släpp
  föremål och mät var de landar). Vinden måste SYNAS (fläktens blå ström).
- **Beroenden:** T1/T2-mönstret.
**Byggt 2026-10-02–03** (v1.406–1.430, 39080e0 libbet): `lib/vind.js` Vindfält (band/kon/sug, relativ luft) + elva spel: studsa-ner (fläkten, port), bajs-och-kiss (port), spindelhjalten, enhorningen-elvira, flugan-pa-nasan, sapbubblor, bowling, fallskarmen (tre skikt), kla-efter-vadret, rulla-bollen-hem (kullar och gropar som kraftzoner) och enhorningen-flyger (uppvindspelare), mätt: kraft/steg identisk (1250,71 = 1250,71), takt-invarians 0,00 px; spindelhjalten sidledsdrift 281 → 108 px, ur bild 4 → 0; bowling utanför banan 898 → 0 av 900; fallskärmens väggkontakt 25–63 % → 0 %.

#### F5. Ytvågor via höjdfält: `lib/ytvag.js` **[Medium]**

- **Premiss — prövad:** två handbyggda höjdfält (`pruttbad/index.js:177`, `:360-363`, `:491`;
  `grodan-slurp/dammen.js:285-310`, `:2255-2290`), båda med minnets fyra fällor lösta på var
  sitt sätt (viloläge + avvikelse, dämpning SIST, omritning på rörelse, fast steg).
- **Bygg:** `new Ytvag({ n, x0, x1, ytY, sprid, k, damp, max })` → `stot(x, kraft)`,
  `vila(x, djup, bredd)` (dellen som viloläge, inte som kraft), `hojd(x)`, `uppdatera(deltaMS)`
  (med `Takt`), `rorlig` (för omritningsgrinden), `path(g)`.
- **Kunder:** pruttbad · grodan-slurp (port); kandidater när de ändå rörs: tvatta-djuret (badet),
  magnet-fiske (dammens yta).
- **Nya kunder ur spelgenomgången (§5.5):** **pruttbad redan i dag** — ankan läser inte ytan: hon
  guppar på en sinus (`pruttbad/index.js:1944`) vid en fast `_floatY`, fast `_waveAt(x)` finns
  (`:593`). Det är en enkel vinst före porten (läs bara `_wave`-delen; ankans egen grop ligger i
  `_waveRest`). Dessutom fargregn (pölarna slår upp vågor) · tvatta-djuret (badsaken svarar på
  duschen) · unika-knytt (vattenvärldens mark skvalpar).
- **Mätning:** portekvivalens som `_flytprobe` (samma tal steg för steg över 900 steg); minnets
  fyra fällor som armar (pumptest 0,5 s drag når inte taket; rest efter 4 s; Nyquist-läget;
  grinden ritar inte en stilla dell). `_pressprobe` (pruttbad) och `_vagdiag` (dammen) oförändrade.
- **Risker/fällor:** lång våglängd avklingar långsamt (~6 s) — en sond som väntar 4 s dömer ett
  friskt fält.
- **Beroenden:** T3.
**Byggt 2026-10-02–03** (v1.407 + 1.431–1.433, 21c1235 libbet): `lib/ytvag.js` Ytvag (stöt/vila/höjd/Takt) + pruttbad och grodan-slurp (portar) och kunderna fargregn (en Ytvag per pöl), tvatta-djuret (karets yta) och unika-knytt (vattenvärldens mark), mätt: portekvivalens 900 steg 3,3e-6 / 3,6e-15 px; `_dag-ytvag` 0 omritningar i vila, stilla på 2,7–8 s.

#### F6. Vätska ↔ kropp **[Deep]** — villkorad

- **Premiss — prövad:** `FluidWorld`s kolliderare är plana former som spelen flyttar själva efter
  matter-steget (`plask-i-vattnet/index.js:578`, `:1176`); vätskan knuffar aldrig en kropp
  (skill **fysik-spel**: "vätskan läser matter-kärlen som statiska kanter" — med avsikt).
- **Bygg:** (a) **[Medium]** `fluid.foljKroppar(phys, [{ body, form }])` — synkar kolliderare ur
  kroppar varje steg, inklusive kärl som bär sin vätska (`saftbaren._carryAll`-regeln: en ägare
  per partikel). (b) **[Deep]** reaktionskraft: summan av partikelimpulser per kolliderare →
  kraft på kroppen. Bara (a) tills ett spel ber om (b).
- **Kunder:** plask-i-vattnet · zackes-biltvatt · mata-munnen (a); framtida `vattenballongerna`
  (IDEER #4) (b).
- **Nya kunder ur spelgenomgången (§5.5):** saftbaren (isbitar som flyter på saften) ·
  vattenvagen (ett vattenhjul som snurrar av strålen) · plask-i-vattnet ("lasta flytaren": en
  sjunkare som släpps på stocken trycker ned eller kantrar den — `Flytvolym` ger redan lyft ∝
  nedsänkning, det som saknas är att ett släpp kan landa på en flytare).
- **Mätning:** `_plaskprobe` (undanträngning +8–13 px, volym 416 → 416), `_vatskeprobe --losa`.
- **Risker/fällor:** "ett spel = en motor" — (b) kopplar två lösare med olika ackumulatorer
  (T3 först); volym trängs undan (lavans 35 px).
- **Beroenden:** T3, T4.
**Byggt 2026-10-03** (v1.434–1.443, 0a633a7 libbet; bara F6a): `fluid.foljKroppar(phys, […])` synkar vätskans hinder ur kropparna, kärl bär sin vätska; kunderna plask-i-vattnet (sjunkaren landar på flytaren, 1.435), saftbaren (isbitar, 1.442) och vattenvagen (skovelhjul, 1.443), mätt: port 0,000 px mot handsynk, bär 54/54; `_lastaflytprobe` landning 70 → 0 px överlapp. F6b ej påbörjad (villkorad).

#### F7. `lib/ragdoll.js` **[Deep]** — villkorad

- **Premiss — prövad:** receptet finns och är mätt (`grodan-slurp/groda.js`, minnet "ragdoll i
  matter"); IDEER #2 `nallens-stuntshow` listar biblioteket som sitt motorbygge.
- **Bygg:** stiftleder i negativ grupp, muskelpar och vinkelgränser per steg (centrerade kring
  ledens mitt), spegling, vybyte — **i samma commit som `nallens-stuntshow`**, aldrig före
  (p2-es-regeln, LYFTPLAN A1).
- **Kunder:** nallens-stuntshow; grodan-slurp bara om porten är gratis.
- **Mätning:** `_grodprobe`-mönstret (sittpose, hopp, tunga mot Newton) för det nya spelet.
- **Beroenden:** F1.

#### F8. Inspelning per fysiksteg och slow-motion-repris **[Medium]**

- **Premiss — prövad:** `kulbana` har en köad [Deep]-punkt "Replay av den lyckade rullningen"
  (`docs/games/kulbana.md:71-73`). En repris behöver ingen omsimulering — bara lägena.
- **Bygg:** `const r = phys.spelaIn(kula, { max: 900 })` → ringbuffert av `{ x, y, vinkel }` per
  steg; `r.spelaUpp(vy, { fart: 0.4, spar: true })` animerar ur bufferten (deterministiskt per
  konstruktion). Samma buffert matar DEV-överlägget (F9) och sonder som jämför banor steg för steg.
- **Kunder:** kulbana (Ä8); sonder.
- **Mätning:** reprisen avviker 0,0 px från den spelade banan; minnet begränsat; exit mitt i en
  repris lämnar inget (`_exitprobe`-mönstret).
- **Risker/fällor:** reprisen får inte låsa nästa runda (återspelssäkerhet, CLAUDE.md).
- **Beroenden:** inga.
**Byggt 2026-10-02** (v1.408, 51415a3): `lib/inspelning.js` `spelaIn`/`spelaUpp` + kulbanans slow-motion-repris med orange spår (tryck hoppar över), mätt: 0,0 px mot banan, 2,46 s, exit mitt i repris 0 tweens.

#### F9. Fysiköverlägg i DEV: `lib/fysikdebug.js` **[Quick]**

- **Premiss — prövad:** ingenting ritar kropparna; "konstens utbredning och träffytans utbredning
  är två budgetar" (CLAUDE.md) syns bara i en sond.
- **Bygg:** `?fysik` i DEV: kroppskonturer, leder, kontaktpunkter, fartpilar, `statisk-fart`-
  markering, sensorer, `hitArea` för grepp/sikte. Bakom `import.meta.env.DEV` så det viker ihop i
  bygget.
- **Kunder:** alla 28 världar (för den som bygger).
- **Mätning:** `npm run build` + grep i `dist/` efter modulens markörsträng = 0 träffar; överlägget
  ritar N konturer för N kroppar; 0 konsolfel.
- **Beroenden:** inga.
**Byggt 2026-10-02** (v1.367, 732e071): `lib/fysikdebug.js`, DEV-överlägg med `?fysik` (konturer, leder, kontakter, fart, sensorer, hitArea), mätt: vippbradan 7/7 och grodan-slurp 42/42 konturer, 0 träffar i `dist/`, `test:all` 87/87.

#### F10. Kuggkoppling med last: `kugghjulen` B7 **[Deep]**

- **Premiss — prövad:** LYFTPLAN B7 (`:889-893`): rotationen är BFS över mittavstånd, inga kroppar;
  `docs/games/kugghjulen.md:88-92` förklarar varför ett back-hjul inte går att bygga som ett
  extra hjul.
- **Bygg:** hjul som `gangjarn`-kroppar (F1) + en kuggkoppling per hjulpar (ω_b = −r_a/r_b · ω_a,
  löst per steg med rätt effektiva tröghetsmoment, drivPunkt-mönstret) + last på karusellen;
  veven via G8.
- **Kunder:** kugghjulen.
- **Mätning:** `_vevprobe` (känns maskinen tyngre ju mer barnet byggt?) och `_remprobe` mot HEAD;
  M1-arm för utväxlingen (1 % fel över 10 varv).
- **Risker/fällor:** P0 MOTGÅNG — motståndet får sakta ned, aldrig stoppa.
- **Beroenden:** F1, G8.
**Byggt 2026-10-02** (v1.404, f8ad87b): kugghjulens karusell (och fläktgrenen) är en last reflekterad genom utväxlingen till veven, broms taklagd 50 %; ledkroppar och `vev.js` medvetet inte byggda, mätt: nivå 8 90 % fart 29 mot 18 rutor, utrullning 5,0 mot 16,4 rad, utväxling 1e-11 % över 10 varv.

### Spår G — nya kontroller

> Varje kontroll prövas mot sitt åldersband. **Småbarn:** tap och enkel drag med tap-tap-
> fallback, ≥ 96 px + 24 px halo, inga långtryck, ingen multitouch, återkoppling < 100 ms.
> **Storbarn:** håll, multitouch och svep som spelhandling är tillåtna, blindkontroller ≥ 96 px,
> och ALDRIG automatisk hjälp som siktar åt barnet. Storbarn har **noll spel** i dag — G4:s
> håll-läge, G5 och G6 byggs i samma commit som sin första kund (Ä3).

#### G1. Fjädergrepp: `lib/grepp.js` **[Medium]**

- **Premiss — prövad:** `drivPunkt` löser greppet med rätt effektiv massa och krafttak
  (`popcornkalaset/karl.js:116-149`); ett matter-`Constraint` som grepp snurrade grytan 166 000°.
  Leksakslådans center-grepp (`leksakslada/index.js:637-660`, tak per leksak) är samma sak med
  r = 0. Två implementationer, två sätt att greppa — men ett bibliotek.
- **Bygg:**
  ```js
  this._grepp = new Grepp({
    phys, yta: this._root,                 // gemensam static förälder (K3)
    kroppar: () => this._leksaker.map((l) => l.body),
    halo: 24, punkt: 'fingret' | 'mitten', k: 0.35, tak: { dv, v }, fartTak: (b) => …,
    kast: false | { max: 18 },             // G2
    tapTap: true,                          // småbarn: tryck kropp → tryck mål → handen bär dit
    onLyft, onSlapp,
  })
  ```
  Per steg: handen följer fingret (accelerationstak som `karl.js`s `HAND_ACC`), `drivPunkt` med
  krafttak. Tap-tap: första trycket markerar (vippning + ljud < 100 ms), andra sätter ett mål
  och den osynliga handen bär dit i begränsad fart — aldrig en teleport. Hylla/vippning stannar i
  `Karl` (det är popcornspelets regel, inte greppets).
- **Åldersband:** småbarn ✓ (ett finger, tap-tap, halo); storbarn ✓ (kast som huvudhandling, G6).
- **Kunder:** popcornkalaset (`Karl` importerar `drivPunkt` ur libbet — inget annat ändras),
  leksakslada (center-grepp med tak per leksak); kandidater: mata-munnens lösa kroppar
  (`_gorLos`), nya spel (IDEER #2, #3, #5).
- **Ny kund ur spelgenomgången (§5.5):** spindelnatet — bytet tas ur fysiken (`:443`) och dras
  in med en tween (`_reelIn` `:475`); det kan hänga kvar och svänga in via `drivPunkt`.
- **Mätning:** ny `_greppprobe.mjs` (Node): r²·m/I ∈ {0,5; 1; 3} → max |ω| över 300 steg —
  **kontrollarm: matter-`Constraint`** (ska skena vid 3,0); grepp mot statiskt golv med och utan
  tak → genomträngning och utfart (kontroll: utan tak, ~56 px/steg); tap-tap når målet utan att
  överskrida taket; exit mitt i grepp. Port: `_popcornhandtag` + `_popcornhall` identiska tal,
  `_popcornnaiv` (10 nybörjargrepp) minst lika bra som HEAD; `_leksakprobe` oförändrad.
  **Och en naiv-gest-sond för varje ny kund** (minnet: byggarens sond spelar byggarens väg).
- **Risker/fällor:** en driven kropp är en murbräcka — `collisionFilter.group` på FÖRÄLDERN;
  innehåll i ett buret kärl behöver kärlets fartändring (`barAndel`); korrigera aldrig en annan
  källas snurr via vridpunkten (hällningsminnet).
- **Beroenden:** K3, R6, G2.
**Byggt 2026-10-02** (v1.394–1.398, e36d402 libbet): `lib/grepp.js` (krafttak, tap-tap, kast via Pekspar), `drivPunkt` flyttad ur `karl.js` (popcornkalaset byte-identiskt) + leksakslada (1.397) och spindelnatet (1.398), mätt: Constraint skenar vid r²m/I 3,0 (ω 75,5) mot Grepp 0,002; tio nybörjargrepp i leksakslådan likvärdiga HEAD; spindelnätets fångst median 1303 ms (HEAD 862), 0 fel.

#### G2. Kast ur draget: `lib/pekspar.js` **[Quick]**

- **Premiss — prövad:** släppfarten finns redan och har sina två tysta fällor lösta
  (`DragController.js:144-174`: 90 ms fönster, 130 ms ålder, provet bortom två fönster), men bara
  för `DragController` och en kund.
- **Bygg:** flytta `_slappFart` till `pekspar.js` (`spar.lagg(t, x, y)` · `spar.fart()` → px/ms eller
  `null`); `DragController` använder den oförändrat, `Grepp` och G3-varianterna också.
  px/ms × 16,67 = px/steg, klämt till `kast.max`.
- **Åldersband:** småbarn — bara BONUS (målet nås utan kast, som i mata-munnen); storbarn —
  svep som spelhandling.
- **Kunder:** mata-munnen (oförändrad via DragController), Grepp-kunderna (leksakslådan: kasta i
  korgen, Ä5).
- **Nya kunder ur spelgenomgången (§5.5):** tarta-i-ansiktet mäter släppfarten själv
  (`VEL_WINDOW` `:50`, `:465-485`) — repots TREDJE implementation bredvid DragController, alltså
  ett starkare skäl att flytta den till `pekspar.js`. blixt-och-dunder (släppfarten skrivs över
  med en slumpdrift, `:412-413` — ett moln går inte att kasta) · valpens-bajs (kast ur skyffeln
  mot tunnan, bonus) · mata-monstret (efter leksakslådan).
- **Mätning:** `_kastprobe` (4 kontrollarmar före mätarmarna) identisk; M1-arm med syntetiska
  pekspår: snärt efter långsamt drag → fart; stilla en halv sekund före släpp → `null`.
- **Beroenden:** inga.
**Byggt 2026-10-02** (v1.393–1.400, b4c49ae libbet): `lib/pekspar.js` (`Pekspar` + `kastSteg`, `DragController` oförändrad) + tarta-i-ansiktet (1.396), leksakslada (1.397), valpens-bajs (1.399) och mata-monstret (1.400, kast som bonus), mätt: 20 000 spår bit-identiska, `_kastprobe` 8/8; kontrollarmarna utan kast, kast 3/3 i tunnan och 3/3 ätna.

#### G3. Sikte och slangbella, fler varianter (`AimLauncher` v2) **[Medium]**

- **Premiss — prövad:** `predict()` känner bara golv/väggar (`launcher.js:232-266`) — studsar mot
  ramper och plattor ritas fel, och tre spel har handtrimmat runt det (bowling: 214 → 9 px med
  `studs` + friktion; rulla-bollen-hem: `Math.max(ball.rest, WALL_REST)` mot ett nollat väggtal;
  ÅTGÄRDER V10b ①–③). Tap-fallbacken siktar mot målet (`:137-149`).
- **Bygg, i tre delar:**
  - **(a) Banan genom en skuggvärld:** en liten matter-motor med världens STATISKA kroppar
    (inklusive `studs`/`friktion`) och en provkula med projektilens egna tal; 64 steg per
    omritning, högst en gång per bildruta (K4). Kroppar med spelets egna impulser
    (enhorningen-elviras `_cloudBoost`, flipperspelets dynor) markeras `forhandsStopp` — banan
    slutar där i stället för att ljuga.
  - **(b) Banan genom fält:** förhandsbanan integrerar `Magnetfalt`/`Vindfalt` (F4) — för
    `bobo-i-rymden` (IDEER #8) och spindelhjaltens vindband.
  - **(c) Storbarnsläge:** `forhandsvisning: 'kort'` (första tredjedelen), `tapFallback: false`
    (P0 storbarn HJÄLP) och valfritt förra skottets spår.
- **Åldersband:** (a)(b) båda; (c) bara storbarn.
- **Kunder:** bowling · rulla-bollen-hem (a); spindelhjalten (b); (c) först med en
  storbarnsvariant (Ä3).
- **Mätning:** förhandsbana mot verklig bana i px vid landning (mallen `_studsprobe` §7) per spel,
  HEAD mot (a); kostnad per omritning i Node (S7) ≤ 0,5 ms.
- **Risker/fällor:** skuggvärlden måste läsa samma `gravityY`/`frictionAir` som den riktiga —
  annars ärver den den gamla 380 px-lögnen (skill fysik-spel, kalibreringen).
- **Beroenden:** K4, R3, F4 (för b).
**Byggt 2026-10-02** (v1.409, 583f3d5; bara G3a): AimLauncher skuggvärld (delar statiska kroppar, provkula med kulans tal) i bowling och rulla-bollen-hem; detektor-buggen vid återanrop rättad, mätt: i spelet 0,0 px (rulla, bowling bankskott), Node HEAD 298/1072 → 0 px, 0,047 ms/omritning. G3b/G3c ej påbörjade (villkorade).

#### G4. Laddning: `lib/laddning.js` (tryck · gnid · håll) **[Medium]**

- **Premiss — prövad:** två laddningar finns och visar vägen per åldersband:
  `blixt-och-dunder` laddar per TRYCK och per GNID (`index.js:401-410`, `:440-456`) — helt inom
  småbarnens P0; `grodan-slurp` laddar med HÅLL som ett TILLÄGG, aldrig en grind
  (`docs/games/grodan-slurp.md:79-81`), och hoppar aldrig av sig själv (ägaren 2026-09-25).
- **Bygg:** `new Laddning({ lage: 'tryck' | 'gnid' | 'hall', steg, kurva, onSteg, onFull, onSlapp })`
  — återkoppling på första ögonblicket (< 100 ms), synliga steg, ingen automatisk avfyrning.
- **Åldersband:** småbarn — `tryck`/`gnid` som huvudväg, `hall` bara som tillägg (Ä4);
  storbarn — `hall` som huvudkontroll, med tajming (släpp i rätt ögonblick) som tillåten skicklighet.
- **Kunder:** första nya kund avgör; port av blixt-och-dunder/grodan-slurp bara om den är gratis.
- **Mätning:** `_satsprobe`-mönstret (syns trycket inom 100 ms, mot kontroll utan tryck);
  `_siktprobe` om grodan porteras.
- **Beroenden:** K3.

#### G5. Tumspak för storbarn: `lib/tumspak.js` **[Medium]** — blockerad (Ä3)

- **Premiss — prövad:** ingen styrspak finns; inget spel har `ageRange[0] ≥ 6`.
- **Bygg:** spak fast i skärmen (kamerans faktor 0), knopp ≥ 96 px (blindkontroll), dödzon,
  vektor −1…1; eget pekar-id så en andra tumme kan trycka en hoppknapp samtidigt; släpp eller
  avbrott → noll.
- **Åldersband:** storbarn ✓ (multitouch tillåten, aldrig enda vägen till navigation);
  **småbarn ✗**.
- **Kunder:** ingen i dag — kandidater `bobo-i-rymden` (dragkraft), `gelebilen` (köra),
  en `/storbarn snobollen`.
- **Mätning:** CDP-sond med två touch-punkter (spak + knapp) — harnessen provar varken håll eller
  multitouch (CLAUDE.md TEST: spelet är inte testat förrän en sond spelat huvudkontrollen).
- **Beroenden:** K1, K3.

#### G6. Tvåhandsgrepp för storbarn **[Medium]** — blockerad (Ä3)

- **Premiss:** `drivPunkt` tar en punkt; två punkter på samma kropp ger lyft + vridning utan
  rotationsgest.
- **Bygg:** `Grepp` med två pekare på samma kropp (två `drivPunkt` per steg, delat krafttak) eller
  två kroppar samtidigt.
- **Åldersband:** storbarn ✓; **småbarn ✗** (multitouch).
- **Kunder:** `brobyggarna` (IDEER #10 — vrida en balk på plats).
- **Mätning:** `_greppprobe`-arm med två punkter (vinkeln följer händerna, ingen snurr-explosion,
  R1 tyst); CDP med två touch-punkter.
- **Beroenden:** G1.

#### G7. Tilt (lutning) — **STRUKEN**

- **Skäl:** uppdragets villkor var "bara om den fungerar offline och utan behörighetsdialog".
  iOS/iPadOS (WebKit, sedan iOS 13) kräver `DeviceOrientationEvent.requestPermission()` — en
  dialog — så villkoret faller på minst en plattform. Android-Chrome kräver i dag ingen dialog
  (plattformsfakta, inte prövat på familjens enheter), men en kontroll som bara finns på en del
  av enheterna kan aldrig bära ett spel, och en 2–5-åring som lutar en platta tappar den. (Ä6 om ägaren ändå vill ha en Android-bonus.)

#### G8. Vev: rotationsgrepp kring en axel **[Medium]**

- **Premiss — prövad:** `kugghjulen` har en vev men ingen tröghet (B7, `_vevprobe`); F1 ger axlar
  och motorer att vrida.
- **Bygg:** dra runt en axel → vinkelfart till ett `gangjarn` (moment ur fingrets
  tangentialfart, med tak); tap-fallback: varje tryck = en knuff (ett kvarts varv).
- **Åldersband:** småbarn ✓ (enkel drag + tap); storbarn ✓.
- **Kunder:** kugghjulen (F10), kulbanas propeller; ur spelgenomgången: vattenvagen (ventilen
  barnet vrider som sista steg, köad i spelets doc §4).
- **Mätning:** `_vevprobe` mot HEAD; tap-armen når samma varvtal inom 10 tryck.
- **Beroenden:** F1, K3.
**Byggt 2026-10-02** (v1.402–1.403, 11ca032 libbet): `lib/vev.js` rotationsgrepp med tak + tap-fallback; vattenvagen får ventilen som sista steg (första kunden), mätt: `_vevlibprobe` grön, tap 10 tryck 1,25 varv/s mot drag 1,0, tak 0,3 rad/steg; `_dag-vattenvagen` 30/30, stängd ventil 0 partiklar.

### Spår M — mätbarhet

**Befintliga sonder som mäter fysik** (skill **sonder** har hela katalogen):

| | Node — utan webbläsare | Webbläsare |
|---|---|---|
| matter-lib | `_studsprobe` (statisk studs, §7 bowling) · `_slagprobe` (anslag) · `_faltprobe` (magnet) · `_flytprobe` (flytvolym) · `_fjaderprobe` (bräda) | `_flipperprobe` · `_banprobe` · `_kilprobe` · `_tornprobe` · `_vippprobe` · `_flaktprobe` · `_magnetprobe` |
| egna lösare | `_mjukprobe` · `_repprobe` · `_motstandprobe` · `_varmeprobe` · `_poppprobe` · `_bullprobe`/`_stapelprobe` · `_natlinaprobe` · `_pendelprobe` · `_lyftprobe` | `_vobbelprobe` · `_pressprobe` · `_tuggprobe` · `_tradprobe` · `_rostprobe` · `_gungprobe` |
| ragdoll/grepp | `_grodprobe` · `_superhoppprobe` · `_popcornhandtag` · `_popcornhall` | `_superspelprobe` · `_siktprobe` · `_tumlaprobe` · `_klatterprobe` · `_popcornnaiv` · `_popcornspel` |
| vätska | — | `_vatskeprobe` · `_plaskprobe` · `_tvalprobe` · `_stralprobe` · `_duschprobe` |
| kontroller | — | `_dragprobe` · `_kastprobe` · `_lampprobe` (två id) · `_satsprobe` (< 100 ms) |
| kostnad | — | `_popcornomrit` (bildrutearbete + barlast) · `_montageprobe` · `_fpsprobe` (meny) · `_graflackprobe` |

**Vad som saknas för att kunna säga "bättre":** (1) varje Node-sond ovan stegar exakt ett steg per
anrop — **ingen kan se takt-beroendet** i §1.3.3; (2) inget mäter lösarens kostnad; (3) inget
mäter tunnling mot fart; (4) leder och grepp mäts bara inuti grodan och popcornet; (5) ingen
sond provar `pointercancel` eller två fingrar på DragController/AimLauncher; (6) bildrutearbete
finns bara för popcornet.

#### M1. Fysikbänken: `scripts/_fysikbank.mjs` (Node) **[Medium]**

**Byggt 2026-10-02** (v1.295, 8d967d8): `scripts/_fysikbank.mjs` med S6 takt, S7 kostnad, S8 kinematik och kontrollrader, mätt: 60 Hz-flyt 0,624 mot planens 0,637.

- **Bygg:** `node scripts/_fysikbank.mjs [--bara S6,S8] [--json]` — en tabell per scen, varje scen
  med sin kontrollrad som MÅSTE hålla innan mätraden läses:

| Scen | Mäter | Kontrollrad |
|---|---|---|
| **S1** vilande hög | kryp (px/10 s) + ms/steg, sova av/på | N = 0 ger 0,000 ms-golvet; kostnaden växer med N |
| **S2** statisk yta | studs `max(A,B)`, friktion `min(A,B)`, `studs`/`friktion`-nycklarna | ur `_studsprobe` (13/13) — återanvänd, kopiera inte |
| **S3** tunnling | kula mot 16 px vägg vid 10–60 px/steg; med fartspärr/`fartTak` | 10 px/steg studsar alltid |
| **S4** leder | gångjärnsdrift, pendelenergi med `damp 0`/`0,1`, motor under last | `damp 0,1` MÅSTE tappa snurr (fällan) |
| **S5** grepp | `drivPunkt` mot `Constraint` vid r²·m/I 0,5/1/3; krafttak mot golv | Constraint vid 3,0 MÅSTE skena |
| **S6** takt | Pixis `Ticker` (`maxFPS 60`, stämplar à 0,1 ms) vid 30/40/50/57,1/60/90/120 Hz → stegfördelning, flytjämvikt, magnetfångst, mjukkroppshäng, rephäng, `Motstandsvolym`-fall; per bildruta mot per steg; snäpp | 60,000 Hz OKVANTISERAT → exakt 1 steg/ruta och 0,625 |
| **S7** kostnad | `Engine.update` ms/steg N = 6…120; `FluidWorld` 200…800; `Mjukkropp.steg` µs; skuggvärld (G3a) per omritning | kostnaden växer med N |
| **S8** kinematik | teleport mot fart per steg, 4–48 px/bildruta | vägg i vila → bollen orörd |
| **S9** brytbart | rörelsemängd före/efter delning, utkastfart | ingen delning under gränsen |

  Så drivs Pixis riktiga ticker i Node (det var så §1.3.3 mättes):
  ```js
  import { Ticker } from 'pixi.js'          // laddar i Node — rep.js gör samma import (:29, :480-483)
  const tk = new Ticker(); tk.autoStart = false; tk.maxFPS = 60   // som src/shell/App.js:24
  tk.add((t) => { vol.steg(tid); varld.update(t.deltaMS) })       // exakt spelets ordning
  for (const s of vsyncStamplar) tk.update(Math.round(s * 10) / 10)
  ```
- **Kunder:** varje arbetsorder i T, R, F och G pekar på sin scen.
- **Risker/fällor:** en grön bänk-rad bevisar libbet, inte spelet — spelsonden (M2) behövs för
  T2/R2. Sätt inga trösklar förrän kontrollraden visat att talet RÖR SIG.
- **Beroenden:** inga.

#### M2. Takt-sonden: `scripts/_taktprobe.mjs <id>` (webbläsare) **[Medium]**

**Byggt 2026-10-02** (v1.300, 4b5da9c): `scripts/_taktprobe.mjs` kör samma värld vid olika Hz (seedad slump, virtuell klocka), mätt: 60 Hz × 2 identiska.

- **Bygg:** `--hz 30,45,57,60 --seed 7`. `page.addInitScript` ersätter `Math.random` med en
  seedad generator (samma bana i varje arm — minnet "beteendemätning konfunderas", punkt 3);
  efter monteringen `ctx.ticker.stop()` (`window.__barnspel.ctx`) och sonden driver
  `ticker.update(t += 1000/hz)` själv. Läser spelets egna fysikstorheter (flytdjup, fångsttid,
  häng, styrsvar) via spelinstansen. Deterministisk körning = sondens "replay": samma seed och
  samma tryck på samma tick-index ger samma tal.
- **Kontrollarm:** samma seed och 60 Hz två gånger → identiska tal (bevisar determinismen innan
  något jämförs). Sedan 30 mot 60 på HEAD (ska skilja för per-bildruta-kod) och på fixen (ska inte).
- **Risker/fällor:** gsap går på sin egen rAF-klocka — mät fysikstorheter, inte tween-lägen.
  Redigera ingen `src/` medan den kör; kör den aldrig bredvid en annan webbläsarsond.
- **Beroenden:** inga.

#### M3. Pekavbrott-sonden: `scripts/_pekavbrottprobe.mjs [id…]` (webbläsare) **[Quick]**

- **Bygg:** CDP `Input.dispatchTouchEvent` (mallen `_lampprobe`): arm 0 (`touchEnd`, kontroll),
  arm 0b (räknar `pointercancel` på `window`), arm A (`touchCancel` mitt i draget → kan en ny
  pekning greppa?), arm B (två fingrar: följer föremålet finger 1?). Spel: sortera-skrap
  (DragController) · spindelhjalten (AimLauncher) · popcornkalaset (eget grepp med pekar-id) ·
  knuffa-tornet (egen kula) · studsa-ner (fläkten) · fanga-frukten (korgen).
- **Beroenden:** inga — körs FÖRE K1/K2.
**Byggt 2026-10-02** (575167e, ingen version): `scripts/_pekavbrottprobe.mjs` körd mot v1.366, mätt: arm 0 lyckas 6/6; arm A fastnar i sortera-skrap och popcornkalaset (premissen höll för K1/K2 där, föll för spindelhjalten, knuffa-tornet, studsa-ner, fanga-frukten); arm B: finger 2 drar föremålet i 5 av 6 spel (bara popcornkalaset ignorerar det). Sidofynd: grodan-slurp lyssnar på `pointercancel`, men Pixi emitterar det aldrig.

#### M4. Kostnadssonden: `scripts/_fysikkostnad.mjs <id> [--cpu 4]` (webbläsare) **[Quick]**

- **Bygg:** `_popcornomrit`s stämplar (ticker-lyssnare med högsta prioritet före spelet och lägsta
  efter Pixis render) + tidtagning runt spelets `PhysicsWorld.update` → bildrutearbete delat i
  fysik och resten, median och 95:e percentil.
- **Kontrollarm:** en barlast på 4 ms per bildruta måste flytta mätaren ~4 ms (annars mäter den
  något annat). Rapportera aldrig rAF-intervallet.
- **Beroenden:** inga.
**Byggt 2026-10-02** (fc10f8c, ingen version): `scripts/_fysikkostnad.mjs`, mätt: kontrollarm 4 ms barlast flyttar rätt kolumn 3,8–4,3 ms (`--cpu 4`); K4 +0,32 ms allt i "resten" (banritningen), O3 fysik < 10 % och `Rep.steg` 0 anrop — därför skars K4 och O3.

#### M5. Takt-mätaren på riktig enhet (`?takt`) **[Quick]** — ägarbeslut (Ä1)

- **Premiss:** stegfördelningen i §1.3.3 är simulerad; om familjens plattor ger skurar av
  0/2-stegsrutor och tickerhopp avgörs bara på plattan.
- **Bygg:** med `?takt` i adressen visar appen en liten textruta: uppmätt vsync-Hz, tickerns
  avfyrningar/s, andel överhoppade vsync, och för en aktiv `PhysicsWorld` andelen bildrutor med
  0/1/2+ steg de senaste 10 s. Inget nätanrop, ingen lagring.
- **Mätning:** ägaren öppnar `…/?takt` på varje enhet, spelar ett fysikspel 30 s och läser av
  talen. Kontroll: på datorn (där samma sak går att simulera) ska talen likna §1.3.3.
- **Beroenden:** inga (T4/T5 väntar på den).

### Spår P — fysik in i spelen

> Ur spelgenomgången (§5). Spåret bygger inget bibliotek som saknar kund i §5.7: varje order är
> en hjälpare ovanpå det som redan finns (`Fjaderbrada`, `fjader1d` ur T3, R2, `Emitter`) plus
> spelen som ska använda den. Småbarns-P0 gäller varje kund: inget kastas ur bild, inget välter
> det barnet byggt eller samlat, och motgången får bara sakta ner.

#### P1. Fjädrande ytor: `Fjaderbrada` och `fjader1d` som studs **[Medium]**

- **Premiss — prövad:** studsmattans landning är skriptad: `nudge(char, vx, -up)` med en uppfart
  ur `power` (`studsmatta/index.js:386-391`) och en gsap-dipp som spelas upp (`_dipBed`
  `:858-865`) — mattan ger ingen studs, den visar en. `Fjaderbrada` (`fjader.js`) beskriver i sitt
  eget filhuvud just en studsmatta, har 19 mått i `_fjaderprobe` och **en** kund (kulbana).
  Enhorningen-elviras molnstuds är ett skriptat lyft (`_cloudBoost` `:684-687`) och fallskarmens
  landning en tween (`:909-914`) — båda granskarens läsning, inte stickprovade.
- **Bygg:** studsmatta: mattan blir en `Fjaderbrada` (`taEmot` vid landning, `steg` per
  fysiksteg), och `driv`/`flytta` låter den följa fingret — R2 för samma matta i samma drag.
  Elvira: varje moln en `Fjaderbrada` som sviktar och ger lyftet ur fjädringen. Fallskarmen kör
  ingen matter-värld → `fjader1d` för gräsmattan, så att en tung hoppare sjunker djupare och
  kastas högre och tyngdvalet syns (spelets doc §3). Vippbradan: bara mjukkropps-silhuetten
  (plankan böjs), studsen orörd.
- **Kunder:** studsmatta · enhorningen-elvira · fallskarmen · vippbradan (silhuett).
- **Mätning:** `_fjaderprobe` orörd (libbet ändras inte). Per spel en sond som landar figuren från
  tre fallhöjder. **Kontrollarm HEAD** — förväntat: studshöjden beror på `power`, inte på
  fallhöjden. Mätarm: höjden växer med fallhöjden och har ett tak. P0: figuren lämnar aldrig
  bild (högsta läge över 300 landningar).
- **Risker/fällor:** studsen kommer ur brädan, aldrig ur `restitution` på en statisk kropp
  (CLAUDE.md, V10). Det här är barnets huvudkontroll — kör spelets egen sond och `_idleprobe`
  mot HEAD innan känslan bedöms.
- **Beroenden:** R2 (mattan som följer fingret), T3 (`fjader1d`).
**Byggt 2026-10-02** (v1.386–1.392, d4f286e m.fl.): studsmattan som `Fjaderbrada` på `phys.kinematisk` (1.386, R2-kund), enhorningen-elvira (molnen, 1.390), vippbradan (plankan, 1.391) och fallskarmen (gräsmattan, 1.392), mätt: studsmatta fall 60/200/400 → HEAD 385/396/420 px, nu 145/218/271 (tak); elvira 63/81/94 px (HEAD 65/65/65); fallskärm lätt ~40 / tung ~67 px (HEAD 72/72); 300 landningar aldrig ur bild.

#### P2. Fjädrande detaljer: `vippa(nod)` på `fjader1d` **[Quick]** per spel

- **Premiss — prövad i koden:** `fjader1d` finns bara i `grodan-slurp/djur.js:112-131` (T3 lyfter
  den till `lib/takt.js`). Sex spel har en del som borde fjädra men står stel eller får en fast
  tween: `bygg-en-kompis`s `toppNod` (`varelse.js:400-405`, bara `bounceIn` vid byte `:734`),
  hamburgerstapeln (`_layoutStack` skriver bara y, `:888-896`), karossen i `zackes-biltvatt`
  (rörs aldrig efter intåget, `:899`), de lagda stenarna i `golvet-ar-lava`, tågkopplen i
  `siffertaget` (stel tidslinje, `:877`) och kranklossen i `bygg-tornet`.
- **Bygg:** `vippa(nod, { k, damp, max, axel: 'rot' | 'y' | 'skev' })` → `{ stot(v), destroy() }`,
  stegad med `Takt` (fast steg). Animerar alltid ett **inre barn** — aldrig noden som bär
  `hitArea` eller är ett `DragController`-mål (CLAUDE.md: animera aldrig containern som
  `addTarget` fick). `destroy()` tar sin ticker-lyssnare och sina tweens (minnet "tween mot
  barnbarn").
- **Kunder (ett spel per commit):** bygg-en-kompis · hamburgerbygget · zackes-biltvatt ·
  golvet-ar-lava · siffertaget · bygg-tornet (kranklossen) · loopdjuren (öron, valfritt).
- **Mätning:** Node: utslag efter en stöt och 0,00 i vila efter N s (kontrollarm: `damp 0` ska
  INTE gå till vila). Per spel: ritad geometri (`getBounds()` på det inre barnet) rör sig vid
  stöt och står still i vila; `hitArea` identisk före och efter stöten; 0 levande tweens efter
  `destroy()` (`_tweenprobe`-mönstret).
- **Risker/fällor:** hamburgerstapeln får svaja men aldrig välta (`max`). En vippa på en egenskap
  som annan kod skriver varje bildruta blir osynlig (minnet "vem skriver egenskapen varje
  bildruta").
- **Beroenden:** T3.
**Byggt 2026-10-02** (v1.365–1.374, 915ce1d libbet): `lib/vippa.js` (`vippa(innerBarn,{axel,max,k,damp,ticker})` på `fjader1d`/Takt) + sju kunder: bygg-en-kompis (1.368), loopdjuren (1.369), hamburgerbygget (1.370), zackes-biltvatt (1.371), golvet-ar-lava (1.372), siffertaget (1.373), bygg-tornet (1.374), mätt: `_vippaprobe` stöt 0,8 → topp 0,180 rad, vila 2,42 s, 30/60 Hz spann 0,00000; i spelen 2,0–12,3 px vid stöt mot HEAD 0,00, vila 0,00.

#### P3. Det barnet samlar blir en hög: `lib/hog.js` **[Medium]**

- **Premiss — prövad i koden (granskarna):** fem spel visar aldrig det barnet samlat:
  `klambubblor` ritar om burken (`_drawJar` `:502`), `enhorning-glitterbajs`s kista är en sensor
  som förstör glittret (`:308`), `fanga-frukten` förstör frukten (`_tuck` `:744`),
  `roliga-snurran`s mynt faller ur bild och `rakna-applen`s frukt flyger med en tween till en fast
  plats (`:487-500`).
- **Bygg:** `new Hog({ varld, kanter, tak: 30, sova: true })` → `lagg(form, x, y, v)`, `tom()`. En
  liten matter-värld per behållare (eller spelets egen), behållaren kinematisk via R2 när den
  rör sig, fångväggar så att inget hoppar ur, ett tak (den äldsta tonar bort) och sömn som
  STABILITET (R5) — en vilande hög som darrar ser trasig ut. Töms i finalen.
- **Kunder:** rakna-applen (räkningen orörd: 1 tryck = 1 frukt = 1 ord) · klambubblor ·
  enhorning-glitterbajs · fanga-frukten · roliga-snurran.
- **Mätning:** M1-arm: taket håller, 0 `kropp-rymde` över 3 000 steg, kostnad (S7) vid N = 30,
  kryp < 0,5 px/10 s med sömn (S1). Per spel: antal synliga i behållaren = antal fångade, upp
  till taket.
- **Risker/fällor:** använd `studs`, inte `restitution`, på kanterna. `rakna-applen` är ett
  lärospel: högen får aldrig göra antalet svårare att se (högst 5 frukter, P0 LÄSNING).
- **Beroenden:** R2, R5.
**Byggt 2026-10-02–03** (v1.413–1.421, 12bda22 libbet): `lib/hog.js` (fångväggar, tak, sömn) + rakna-applen (1.414, rader om högst 5), klambubblor (1.415), enhorning-glitterbajs (1.419), fanga-frukten (1.420, i den kinematiska korgen) och roliga-snurran (1.421), mätt: `_hogprobe` 0 rymda/3000 steg (kontroll 336 317), kryp 1,709 → 0,000 px/10 s; `_dag-hog` fångade = i högen upp till taket, rymt 0, 0,00 px i vila.

#### P4. Saker som landar i stället för att sväva **[Medium]**

- **Premiss — prövad i koden (granskare 3):** `stor-liten` lägger sakerna på y 140–320 i himlen
  (`_gridSlots` `:606-620`), `sortera-skrap` i genomskinliga skivor i himlen (`:875`, stickprovad);
  `passa-formerna` och `plantera-fron` har föremål med markskugga men ingen yta under.
- **Bygg:** en landa-intro i `lib/`: föremålen släpps från ovankanten och landar med tyngd (stort
  = duns och skak, litet = studs) och står sedan still för draget. `fjader1d` per föremål räcker
  — ingen matter-värld — och animationen går i ett inre barn, så att `DragController` mäter mot
  ett stilla mål. I `stor-liten` blir landningen en del av lärandet: det stora dunsar, det lilla
  studsar.
- **Kunder:** stor-liten · sortera-skrap · passa-formerna · plantera-fron.
- **Mätning:** föremålet står på markens y efter landningen (ritad geometri); `_dragprobe`
  identisk mot HEAD; 0 `snal-snappyta` i loggen.
- **Risker/fällor:** ett barn som greppar mitt i fallet ska få föremålet ändå (CLAUDE.md: tryck så
  fort spelet tillåter — det är barnets väg).
- **Beroenden:** T3 (`fjader1d`).
**Byggt 2026-10-02** (v1.366–1.378, e9f9ac0 libbet): `lib/landa.js` (`landa(inreBarn,{fran,markY,tyngd,onLand})`) + plantera-fron (1.375), passa-formerna (1.376), stor-liten (1.377) och sortera-skrap (1.378), mätt: `_landaprobe` slutläge exakt markY, 30–90 Hz spann 0; grepp mitt i fallet 1–8 px, `_dragprobe` 12–13 px (≈ HEAD), 0 snal-snappyta.

#### P5. Partiklar och korn med luft och vind **[Quick]**

**Byggt 2026-10-02** (v1.290, fcfbf63): Emitter får luftmotstånd och vind (opt-in) + sluten luftbana; kunder fyrverkeri (v1.292) och unika-knytt (v1.343).

- **Premiss — prövad:** `fyrverkeri`s gnistor har bara tyngd (`:711-724`) medan nivåns vind bara
  läggs på raketen (`:345`). `unika-knytt`s korn faller med konstant fart (`kupan.js:1057-1063`),
  och ett tryck på glaset skakar bara bilden (`rullaOm`, `:1381-1393`). `Emitter`
  (`partiklar.js:413`) räknar en sluten bana med bara `gravity` (`:570`).
- **Bygg:** `Emitter`-optionerna `luft` (linjärt motstånd k) och `vind` (lufthastighet w). Banan
  förblir sluten — `x(t) = x0 + w·t + (v0 − w)(1 − e^(−k·t))/k` — så kostnaden per partikel är
  oförändrad. `fyrverkeri` och `unika-knytt` har egna loopar och får samma två termer där.
- **Kunder:** fyrverkeri · unika-knytt (glastrycket kastar upp kornen, som virvlar och sjunker) ·
  varje `Emitter`-kund som vill.
- **Mätning:** Node: `k → 0` ger exakt dagens bana (kontrollarm); sluthastigheten blir w + g/k. I
  spelet: bilden och `_partikelprobe`.
- **Beroenden:** inga (F4 kan senare mata `vind` regionalt).

### Spår U — omspelning

#### U1. `lib/variation.js`: slump som inte upprepar sig **[Quick]**

**Byggt 2026-10-02** (v1.289, 59f0eaf): `lib/variation.js` (`nastaVariant` · `pase` · `slumpIBand` · `rundprofil`) + `_variationtest` + `_variationprobe`.

- **Premiss — prövad:** `nastaVariant` finns bara i `snobollen` (`:116`). `peka-pa-kroppen`s påse
  (`:197`) är rätt mönster för innehåll. Resten av appen väljer med `randomFrom`, `% längd` eller
  direkt ur nivån (§5.3 mönster 4).
- **Bygg:** `nastaVariant(lista, forra)` (ur snobollen), `pase(lista)` (varje post en gång per
  varv, aldrig samma två i rad över varvsgränsen), `slumpIBand(niva, { min, max })` (slump inom
  nivåns band, så att svårigheten står kvar) och `rundprofil(fro)` för spel vars variation tar
  slut vid nivåtaket. Allt går genom `Math.random` — M2 seedar den, så sonderna förblir
  deterministiska.
- **Kunder:** U2:s spel.
- **Mätning:** Node, 10 000 dragningar: aldrig samma två i rad, påsen ger varje post exakt en gång
  per varv, `slumpIBand` håller sig i bandet. Kontrollarm: `randomFrom` upprepar ~1/n.
- **Beroenden:** inga.

#### U2. Variation per spel **[Quick]** per spel

**Byggt 2026-10-02** (v1.292–1.349): alla 18 spel i tabellen (✅ per rad) plus bygg-tornet (målet slumpas per torn), en commit per spel.

| Spel | Vad som upprepas | Förslag |
|---|---|---|
| ✅ v1.324 vippbradan | korgens läge, höjd och radie ur nivån (`:325-327`) | `slumpIBand` |
| ✅ v1.315 studsbollar | korgen (`:279-282`), målbollar på x 520/650/780 (`:310`) | båda inom band |
| ✅ v1.317 enhorningen-elvira | `_levelConfig` helt deterministisk (`:342-358`) | ädelstenar och regnbåge inom band |
| ✅ v1.325 bowling | fasta trianglar (`_pinLayout` `:448-481`) | 3–4 formationer per kägelantal |
| ✅ v1.318 knuffa-tornet | `SHAPES` i fast ordning (`:575`), specialklossar fasta (`:589-600`) | `nastaVariant` + slumpad plats |
| ✅ v1.316 studsmatta | målen på en fast linje (`:503-506`), jitter först från nivå 4 (`:500`) | jitter från nivå 0 |
| ✅ v1.330 bajs-och-kiss | pottans x och storlek ur nivån (`:296-297`), slut vid nivå 5 | `slumpIBand` + en pall från nivå 3 |
| ✅ v1.320 rakna-applen | målet 2, 3, 4, 5, 2 … (`:369`), fast läge (`:367`) | `slumpIBand` |
| ✅ v1.322 enkelt-pussel | motiven i fast ordning (`THEMES[round % len]` `:386`) | `pase` |
| ✅ v1.321 regnbagsmalaren | identisk från nivå 3 (`:193`, `:227`, `:248`) | lotta mellan varianterna |
| ✅ v1.319 glasstornet | 3 kärl i fast cykel (`:419`) | `nastaVariant` |
| ✅ v1.327 lagerelden | sorten ur `level % 4` (`:347`) | `pase` per order |
| ✅ v1.326 pruttbad | badsort och leksak per nivå (`:459`, `:878`) | `pase` efter första varvet |
| ✅ v1.292 fyrverkeri | stjärnorna jämnt i rad (`:226-231`) | klungor och konstellationer |
| ✅ v1.323 spara-linjen | fast plan i 18 steg (`:542-561`), sedan 8 motiv | `pase` efter planen |
| ✅ v1.329 glittergrottan | reglerna i fast ordning de första sex rundorna (`:306`) | `pase` |
| ✅ v1.328 tvatta-djuret | djuret ur nivån till nivå 5 (`:365-367`) | `pase` |
| ✅ v1.336 loopdjuren | alltid `candy` (`:91`), samma fem block | scen per nivå (block: U3) |

- **Risker/fällor:** några fasta tidiga nivåer är **inlärningsbanor med avsikt** (kulbana 1–5,
  golvet-ar-lava 0–5, kugghjulen 1–8, blixt-och-dunder 0–5). Läs spelets doc innan de rörs, och
  slumpa i så fall inom banans idé. `domino`s raka rad är ett ägarbeslut.
- **Mätning:** per spel: två rundor på samma nivå ger olika layout (läs den ur spelinstansen), och
  svårighetens mått (avstånd, antal) står kvar i bandet.
- **Beroenden:** U1.

#### U3. Innehåll som tar slut **[Medium]** — köat i spelens doc

- **Premiss — prövad i koden (granskarna):** `trollblandning` har 9 nåbara mål (`:279`), sedan
  finns inget nytt att upptäcka. `plantera-fron` sparar `custom.flowers` (`:817`) men visar dem
  aldrig. `siffertaget` är alltid 1..N med fast last (`LAST_ORD` `:29`). `loopdjuren` har fem
  block, `valpens-bajs`s park minns ingenting, och `vakna-pappa`s sömnsteg spelas likadant varje
  runda.
- **Bygg:** det som står i respektive doc §4 (fler recept, trädgård som minns, baklänges-tåg, nya
  block, parken som blommar där den städats) — via `/polera <id>`. Det här är spelpolering, inte
  fysik; ordern står här för att ägaren bad om omspelningslistan.
- **Beroenden:** U1.
**Byggt 2026-10-03** (v1.436–1.441): sex spel — trollblandning (9 → 13 mål), plantera-fron (rabatt med odlade blommor), siffertaget (lasten växlar), loopdjuren (5 → 7 block), valpens-bajs (parkblommor) och vakna-pappa (tre sätt per läge), mätt: `_dag-u3` sparat kvar efter otålig omöppning, 0 konsolfel. Fler spel via `/polera <id>` när de ändå rörs.

### Spår L — bild

> Bild hör egentligen till LYFTPLAN, vars rad 4 byggde `scene.js`-djupet. Spåret står här för att
> ägaren bad om genomgången i den här planen. L1 rör samma fil som LYFTPLAN rad 4 och ska läsa
> dess lärdomar först.

#### L1. Trädlinje och förgrund i `createScene` **[Medium]**

**Byggt 2026-10-02** (v1.291, 1cdc506): `createScene` får opt-in `silhuett` (skog/gran/stad) och `forgrund`, seedad; tio kunder under natten (vilket-djur-later, vandkort, rakna-applen, regnbagsmalaren, vippbradan, kla-pa-nallen, ballonglyft, stor-liten, spindelhjalten, bygg-tornet).

- **Premiss — prövad:** `createScene` har redan tre avståndsband, dis, markstruktur och vinjett
  (`scene.js:156-193`); det som saknas mot `grodan-slurp` är FORMEN — banden är släta kupoler
  (`kupoler()`, `paintBand`), ingen trädlinje och ingen förgrundsväxt. `meadow` bär 24 spel,
  `sky` och `candy` 7 var, `warm` 6 (grep på `createScene('…'`). Grodans trädlinje är en färdig
  metod: `_tradlinje(g, basY, hojd, farg, granAndel, wMin, wMax)` (`grodan-slurp/dammen.js:963`,
  lövkupoler och granar om vartannat).
- **Bygg:** lyft `_tradlinje` till `scene.js` och ge `createScene` optionen
  `silhuett: 'skog' | 'gran' | 'stad' | false` för fjärran- och mellanbandet, plus `forgrund: true`
  (strån och blomtuvor framför marken, i scenroten bakom spelytan). Förval `false` — inget spel
  ändras förrän det slår på det. Färgen ur temat (`lerpColor` mot himlen, som banden).
- **Kunder:** de 24 `meadow`-spelen i omgångar, C-spelen först: stor-liten · rakna-applen ·
  ballonglyft · vilket-djur-later · vandkort · kla-pa-nallen · spindelhjalten · vippbradan ·
  bygg-tornet · regnbagsmalaren.
- **Mätning:** NOLL texturbakningar vid montering (CLAUDE.md: `generateTexture` och en
  `FillGradient` per montering fäller `test:all`); `_montageprobe`; `_ab.sh scene.js` växelvis,
  eftersom ändringen rör många spel; skärmdump per kund och en blick.
- **Risker/fällor:** med `kamera: { bredd }` måste trädlinjen ritas per lagerbredd som banden
  (`lagerBredd`). Inget högt i fjärranbandet bakom skalets knappar (solens historia,
  `scene.js:113-116`).
- **Beroenden:** inga.

#### L2. Bildlyft per spel **[Medium]** per spel

**Byggt 2026-10-02** (v1.320–1.359): egna platser för rakna-applen, regnbagsmalaren, enkelt-pussel, spara-linjen, bowling, loopdjuren, saftbaren, kittla-figuren, tarta-i-ansiktet, kugghjulen, gravmaskinen, spindel-zacke-svingar, spindelnatet, studsa-ner, elementlekplatsen, fyrverkeri och rulla-bollen-hem; brickor/ringar bort i sortera-skrap, trollblandning och tryck-och-forvandla.

C-betygen (31 spel, §5.2) har fyra orsaker:

| Orsak | Spel | Lyft |
|---|---|---|
| Krämplatta eller färgplatta, ingen värld | enkelt-pussel · kugghjulen · spara-linjen · bowling · gravmaskinen · tarta-i-ansiktet · glittergrottan · elementlekplatsen | en egen plats som hör till spelet (verkstad, bana, byggarbetsplats, cirkus) — det A-spelen har |
| Ängsmallen ensam | stor-liten · rakna-applen · ballonglyft · vilket-djur-later · vandkort · kla-pa-nallen · spindelhjalten · vippbradan · bygg-tornet · regnbagsmalaren | L1, plus något i mitten som hör till spelet |
| Brickor och ringar bakom föremålen (P0 ASSETS-gränsfall) | trollblandning (ring `:881`, 🧪-final `:1401`) · sortera-skrap (skiva `:875`) · loopdjuren · tryck-och-forvandla (`:226-229`) · studsa-ner (pinnarna tomma ringar) | ta bort skivan eller ringen; föremålet står fritt med skugga eller glöd |
| Platt egen bakgrund eller platta figurer | plask-i-vattnet (tanken) · saftbaren (Bobo ett svävande huvud) · spindel-zacke-svingar (lådhus) · rulla-bollen-hem · fyrverkeri (rektangelstad, stjärnor i ringar) · kittla-figuren · plantera-fron (emoji-blomma, Ä12) · spindelnatet | volym och detalj i det som redan finns |

- **Mätning:** skärmdump före och efter, och en blick; `bildkoll` grön; P0 `ASSETS`-raden.
- **Risker/fällor:** `glittergrottan`s glittershader är parkerad av ägaren — rör inte den.
- **Beroenden:** L1 för ängsmall-raden.

---

## 3. Utrullning i omgångar

**Omgång 0 — enkla vinster, variation och bild** (ur spelgenomgången; byggs FÖRE omgång 1, Ä11):
**U1** → **U2** (ett spel per commit) · de enkla vinsterna i §5.4 · **P5** · **L1** → **L2**. Inget
här rör det omgång 1 mäter, utom L1 (`scene.js`) och P5 (`partiklar.js`), som körs med `_ab.sh`
som allt annat. Inga spelfiler ändras medan en sond eller `_ab.sh` kör (CLAUDE.md).

**Läge efter natten 2026-10-02 (v1.359):** omgång 0 är byggd — U1, P5, L1, alla 18 U2-spel, 27 av 30
enkla vinster i §5.4 och 20 L2-lyft. **Kvar i omgång 0:** §5.4 bygg-tornet (kranklossen gungar), bygg-en-kompis
(antennerna) och hamburgerbygget (stapeln svajar) — alla tre är P2 och flyttas till omgång 1b; övriga L2-kandidater
i §5.7. Omgång 1: M1, T4, T1, T3 (8 kunder), M2, R1 klara; **T2 kvar för studsbollar · enhorning-glitterbajs ·
glasstornet** (magnet-fiske gjordes i T1). **Nästa natts början:** T2-resten → R1:s `test:all`-baslinje →
omgång 1b (P2 `vippa`, P4 landa) → omgång 2.

**Läge efter körningen 2026-10-02 → 10-03 (v1.450):** faserna D1–D16 + N1 + L är klara. **Klart:** hela omgång 1 (T2 och R1 slutförda) och 1b (P2 `vippa` ×7, P4 `landa` ×4), hela omgång 2 (M3, K1–K3, R2–R6, P1 ×4, M4, O2, F9), omgång 3 (G2 ×4 kunder, G1, F1 med bygg-tornet, G8, F10) och omgång 4 (F4 ×11 spel, F5 ×5, F8, F3 ×2, G3a, O1, P3 ×5, F6a ×3, U3 ×6); §5.4:s tre sista rader (bygg-tornet, bygg-en-kompis, hamburgerbygget) är byggda. N1 gav två nya spel, Bläckfisken Otto (v1.417) och Vattenballongerna (v1.418). **Skars efter mätning:** K4 och O3 (M4: ingen överritning, `Rep.steg` 0 anrop, fysik < 10 %) och zackes-biltvatt i O2 (`area` fanns redan). **Återstår / villkorat, ej påbörjat (i planens ordning):** T5 (Ä1, Ä2, efter M5) · M5 (Ä1) · F2 (Otto byggdes med teleskoparmar, inte `phys.kedja`, så F2 väntar på pottan) · F6b · F7 (med `nallens-stuntshow`) · G3b (med `bobo-i-rymden`) · omgång 5, storbarnskontrollerna G5 · G6 · G4 · G3c (ägarbeslut Ä3, bara på begäran). **Medvetet ej portat:** `DragController`/`AimLauncher` till `lib/pekare.js` (K3), grodan-slurp till R4:s spärr, `vev.js` i F10. Lyftkandidat: `Vindfalt.forhandsAcc` (dubblerad i spindelhjalten · enhorningen-elvira · bajs-och-kiss).

**Omgång 1 — mätstickan och takten** (ingen ändring i en bildruta med exakt ett fysiksteg; allt mätt):
1. **M1** S6 · S7 · S8 (tre av mätningarna finns redan som engångskörningar — gör dem permanenta).
2. **T4** snäpp i `PhysicsWorld` och `FluidWorld` (`_ab.sh` över hela sviten).
3. **T1** `Flytvolym` per steg + `magnet-fiske`s loop i `beforeStep`; ny baslinje för `_plaskprobe`/`_magnetprobe`.
4. **T3** `lib/takt.js` → lagerelden · glasstornet · fallskarmen · kugghjulen · natskott-pa-stan · spindelnatet · zackes-biltvatt · pruttbad (ett spel per commit, titta på bilden).
5. **M2**, sedan **T2** per spel (studsa-ner · magnet-fiske · fanga-frukten · bygg-tornet · studsbollar · enhorning-glitterbajs · glasstornet · snobollen).
6. **R1** fällvakter + `test:all`-baslinje.

**Omgång 1b — fjädrar och landningar** (behöver bara T3:s `fjader1d`): **P2** `vippa` →
bygg-en-kompis · hamburgerbygget · zackes-biltvatt · golvet-ar-lava · siffertaget · bygg-tornet
(kranklossen) · **P4** landa → stor-liten · sortera-skrap · passa-formerna · plantera-fron.

**Omgång 2 — kontrollerna håller:**
7. **M3** mot HEAD → **K1** (bara om arm A fastnar) → **K2** → **K3**.
8. **R2** kinematiska kroppar → fanga-frukten · studsa-ner · studsmatta · flipperspel (paddlarna)
→ **P1** fjädrande ytor (studsmatta i samma drag som R2, sedan enhorningen-elvira · fallskarmen ·
vippbradan).
9. **R3** · **R4** · **R5** · **R6**.
10. **M4** → **O2** · **O3** · **K4** (bara där M4 visar utslag).
11. **F9** DEV-överlägg.

**Omgång 3 — greppa, kasta, vrida** (småbarnens nya kontroller):
12. **G2** pekspår (DragController oförändrad).
13. **G1** fjädergrepp: port popcornkalaset → leksakslada, med naiv-gest-sond.
14. **F1** leder och motorer: port balanstornet · vippbradan · knuffa-tornet → **bygg-tornet**
(svajande torn, §5.5) → **G8** vev → **F10** kugghjulen. F1:s övriga nya kunder när spelen ändå rörs.

**Omgång 4 — features med kund:**
15. **F4** vindfält (studsa-ner port, bajs-och-kiss) · **F5** ytvågor (port pruttbad, dammen) ·
**F8** inspelning (kulbana, Ä8) · **F3** brytbart (knuffa-tornet, Ä7; snobollen) · **G3a** skuggvärld
(bowling, rulla-bollen-hem) · **O1** mjuk mesh (mät först) · **P3** hög (rakna-applen först) ·
de nya kunderna i F4/F5/F6 ur §5.5 · **U3** via `/polera <id>`.

**Omgång 5 — storbarn, bara på ägarens begäran (Ä3):** **G5** tumspak · **G6** tvåhandsgrepp ·
**G4** laddning med håll · **G3c** kort sikte — i samma commit som den första storbarnskunden.

**Villkorat:** **T5** (Ä1, Ä2, efter M5) · **M5** (Ä1) · **F2** (när pottan eller Otto byggs) ·
**F6** (när ett spel ber om vätska som knuffar) · **F7** (med `nallens-stuntshow`) · **G3b**
(med `bobo-i-rymden`).

---

## 4. Ägarens beslut

| # | Fråga | Mitt förslag | Beslut (ägaren 2026-10-01) |
|---|---|---|---|
| **Ä1** | Vilka plattor och telefoner spelar barnen på (märke, iPad eller Android, 60/90/120 Hz)? | Svara med modell. Låt M5 (`?takt`) ligga i bygget så att varje enhet kan läsas av med en adress — det är enda sättet att veta om §1.3.3:s skurar händer hos er. | **Både iPad och Android.** Modeller och Hz ej angivna — M5 är fortfarande enda vägen till talen. |
| **Ä2** | Ska appen fortsätta låsa tickern till 60 fps (`App.js:24`)? | Behåll taket tills M5 visat om det tappar rutor på era enheter. Ta bort det bara tillsammans med interpolationen i T5 — annars blir en 90 Hz-skärm ryckigare, inte mjukare. | **Behåll taket** tills vidare (enligt förslaget). |
| **Ä3** | Storbarnskontrollerna (tumspak, tvåhandsgrepp, håll som huvudkontroll, kort sikte) har ingen kund. Vilket spel blir det första storbarnsspelet? | Bygg ingen av dem utan kund. Första kandidat: `bobo-i-rymden` (IDEER #8 — sikte genom fält + dragkraft) eller `/storbarn snobollen` (tumspak). | **Inget än — vänta.** Omgång 5 byggs inte förrän ägaren beställer ett storbarnsspel. |
| **Ä4** | Får håll-för-att-ladda finnas i fler småbarnsspel — som tillägg, aldrig som grind, som i `grodan-slurp`? | Ja, och skriv regeln i skill **fysik-spel**: tryck eller gnid är huvudvägen, håll är bonus, och inget avfyras av sig självt. | **Ja, som bonus** (enligt förslaget). |
| **Ä5** | Kast ur draget i småbarnsspel — i vilka spel, som bonus? | `leksakslada` först (kasta leksaken i korgen). Aldrig ett krav för att nå målet. | **`leksakslada` först** (enligt förslaget). |
| **Ä6** | Tilt är struken (iOS kräver dialog). Vill du ändå ha en Android-bonus någonstans? | Nej. En kontroll som saknas på en del av enheterna kan inte bära ett spel. | **Nej, ingen lutning.** |
| **Ä7** | Ska `knuffa-tornet`s glas gå sönder i riktiga bitar som studsar och tonar bort, i stället för att försvinna i gnistor? | Ja — rundade "godisbitar" med glitter, inga skärvor, högst 12 bitar i världen. | **Ja, rundade godisbitar** (enligt förslaget). |
| **Ä8** | Vill du ha `kulbana`s slow-motion-repris av den lyckade rullningen (köad [Deep] i spelets doc)? | Ja. Den blir billig när inspelningen (F8) finns, och den belönar bygget, inte bara träffen. | **Ja** (enligt förslaget). |
| **Ä9** | Bryggan för avbrutna pekningar (K1) gör ett avbrutet finger till ett släpp — i alla spel samtidigt. Okej? | Ja, om M3 visar att greppen fastnar i dag. Alternativet är en kontroll som slutar svara. | **Ja, om M3 visar fastnade grepp** (enligt förslaget). |
| **Ä10** | Omgång 1 ändrar fysiken där den i dag beror på bildtakten — mycket under 60 fps, lite vid 60 Hz (bara rutorna med noll eller två steg). Får den byggas som en omgång? | Ja. Harnessens skärmdumpar flyttar sig lite (57 fps-fysiken blir 60 Hz-fysik) — det ska stå i varje commit. | **Ja, en omgång** (enligt förslaget). |
| **Ä11** | Spelgenomgången (§5) gav enkla vinster, variation (U) och bildlyft (L) som inte beror på libbändringarna i omgång 1. Ska de byggas FÖRE omgång 1 (som omgång 0), EFTER, eller i egna pass mellan omgångarna? | Före, som omgång 0. Barnen märker dem direkt, de rör inga bibliotek som omgång 1 mäter (utom L1 och P5, som får `_ab.sh` som allt annat) och de är klara på några pass. Regeln står kvar: inga spelfiler ändras medan en sond kör. | **Ja, före — som omgång 0** (enligt förslaget). |
| **Ä12** | `plantera-fron`s blomhuvud är en emoji-`Text` i storlek 92 som täcker kronbladen (`index.js:525`) — P0 `ASSETS` säger att en emoji aldrig får vara hela föremålet. Spelets doc har lämnat det som ägarbeslut. Ska blomman ritas? | Ja: rita blomhuvudet (kronblad och ansikte som riktig form) och låt emojin bli en detalj eller försvinna. Blommorna byter utseende, därför är det ditt beslut. | **Ja, rita blomman** (enligt förslaget). |

---

## 5. Spelgenomgången — fysik, enkla vinster, bild och omspelning

### 5.1 Så gjordes den

> Gjord 2026-10-01 mot v1.288.0 på ägarens begäran, innan omgång 1 startar. Fyra frågor per spel:
> **missad fysik**, **enkla vinster**, **bilden mot `grodan-slurp`** och **omspelning**. 86 spel —
> `grodan-slurp` är referensen och betygsätts inte. Tre granskare läste spelets doc, koden och
> skärmdumparna i `.test-shots/` (tagna 2026-09-24 – 10-01, ~6 s in i spelet, så några visar
> introt). Ingen webbläsare, ingen sond, inga ändringar i `src/`. Huvudsessionen prövade 21
> bärande påståenden mot koden och alla höll — de är markerade ✔ nedan. Radnumren är greppade
> samma dag: greppa på uttrycket, lita inte på numret.
>
> ⚠️ **Bildbetyget är en bedömning av en stillbild, inte en mätning**, och omspelningsbetyget
> bygger på koden (fasta listor och ordningar), inte på ett speltest. Båda pekar ut var man ska
> titta. Docens §4 visade sig inaktuell sex gånger (§5.6) — pröva varje rad mot koden innan den
> byggs.

### 5.2 Läget

| | A · Hög | B · Medel | C · Låg |
|---|--:|--:|--:|
| Bild mot `grodan-slurp` | 11 | 44 | 31 |
| Omspelning | 15 | 58 | 13 |

- **Bild A (11):** borsta-tanderna · djurorkester · flugan-pa-nasan · folj-sparet · leksakslada ·
  mata-munnen · natskott-pa-stan · popcornkalaset · titt-ut-pappa · unika-knytt · vakna-pappa.
  Gemensamt: ett eget rum, en egen gata eller en egen scen i flera djupled — inget av dem står
  på en `createScene`-preset ensam.
- **Bild C (31)** har fyra orsaker — se L2.
- **Omspelning Låg (13):** bowling · enhorningen-elvira · knuffa-tornet · studsbollar · studsmatta
  · vippbradan · loopdjuren · regnbagsmalaren · valpens-bajs · plantera-fron · rakna-applen ·
  siffertaget · trollblandning.
- **Prio 1 — störst vinst per insats (8):** bygg-tornet · studsmatta · rakna-applen ·
  sortera-skrap · fyrverkeri · kittla-figuren · regnbagsmalaren · poppa-ballonger.

### 5.3 Fem mönster

1. **Skriptad rörelse där ett mätt verktyg redan finns.** Studsmattans landning är en knuff och en
   gsap-dipp ✔ (`studsmatta:388-391`, `:858-865`) medan `Fjaderbrada` har en enda kund.
   Flipperspelets paddlar teleporteras varje bildruta ✔ (`:934-935`), byggtornets klossar låses
   statiska ✔ (`:384-386`), domino-klockan är en gsap-tidslinje. → **P1**, och nya kunder i R2
   och F1.
2. **Det barnet samlar syns aldrig som en hög.** Burken ritas om (klambubblor), kistan är en
   sensor (enhorning-glitterbajs), frukten förstörs (fanga-frukten), mynten faller ur bild
   (roliga-snurran), äpplet flyger till en fast plats (rakna-applen). → **P3**.
3. **Utstickande delar, staplar och snören är stela.** Antennerna (bygg-en-kompis),
   burgarstapeln, bilkarossen, de lagda stenarna (golvet-ar-lava), tågkopplen och
   ballongsnörena (✔ `ballonglyft:576` är ett `lineTo`). → **P2**, och `Rep` på nya ställen
   (§5.5).
4. **Nivån bestämmer layouten, och variationen tar slut vid taket.** Sex fysikspel räknar korg,
   mål eller formation deterministiskt ur nivån. Räkneäpplenas mål går 2, 3, 4, 5 ✔ (`:369`),
   pusslets motiv i fast ordning ✔ (`:386`) och regnbågsmålaren är identisk från nivå 3 ✔.
   `nastaVariant` finns bara i `snobollen` ✔. → **U1**, **U2**.
5. **`createScene`-presets är taket för ungefär 30 spel.** `meadow` används i 24 spel ✔. Scenen
   har redan djup — tre band, dis, markstruktur och vinjett (`scene.js:156-193`) — så det som
   saknas mot grodan är FORM: släta kupoler i stället för en trädlinje, och ingen förgrund.
   Grodans trädlinje är en färdig metod (`dammen.js:963`). → **L1**.

### 5.4 Enkla vinster som inte står köade

Prövade mot koden; ✔ = stickprovad av huvudsessionen. De vinster som redan står i spelets doc §4
finns i tabellerna i §5.7 som "köad".

| Spel | Vinst | Bevis |
|---|---|---|
| ✅ v1.326 pruttbad | ankan rider på vågen i stället för en sinus | ✔ sinus `:1944`, `_waveAt` finns `:593` |
| ✅ v1.292 fyrverkeri | gnistor och rök får luftmotstånd och nivåns vind (P5) | ✔ bara tyngd `:711-724`, vinden bara på raketen `:345` |
| ✅ v1.331 klambubblor | bubblorna stöter mot varandra | ✔ ingen stöt; mönstret finns i `poppa-ballonger:1050` |
| ✅ v1.320 rakna-applen | slumpat målantal inom bandet (U2) | ✔ `2 + ((lvl-1) % 4)` `:369` |
| ✅ v1.322 enkelt-pussel | slumpad motivordning (U2) | ✔ `THEMES[round % len]` `:386` |
| ✅ v1.321 regnbagsmalaren | lotta mellan varianterna efter nivå 3 (U2) | ✔ `:193`, `:227`, `:248` |
| ✅ v1.332 blixt-och-dunder | behåll släppfarten över en fartgräns, så att molnet går att kasta | ✔ skrivs över med slumpdrift `:412-413` |
| ✅ v1.334 trollblandning | ta bort ringen runt elementen | ✔ `stroke` `:881` |
| ✅ v1.333 sortera-skrap | ta bort skivan bakom sakerna | ✔ vit skiva alfa 0,25 `:875` |
| ✅ v1.330 bajs-och-kiss | squash och materialljud vid studs via `phys.onImpact` / `impactAudio` | ✔ 0 anrop i spelet |
| ✅ v1.343 unika-knytt | glastrycket kastar upp kornen (P5) | ✔ `rullaOm` skakar bara bilden `kupan.js:1381-1393` |
| ✅ v1.342 poppa-ballonger | pysballong som far runt med ett prutt, ny specialtyp | specialtyperna `:328-331`, egen integrator finns |
| ✅ v1.338 enhorning-glitterbajs | kistan svämmar över vid full mätare | grep 0 träffar |
| ✅ v1.339 kla-pa-nallen | nallen följer det hållna plagget med blicken | bara blink `:575`, `:895-919` |
| ✅ v1.341 golvet-ar-lava | barnets egen figur hoppar (`lib/egnafigurer`) | ingen import |
| ✅ v1.346 stor-liten | sakerna på marken eller en filt, i väntan på P4 | `_gridSlots` y 140–320 `:606-620` |
| ✅ v1.345 saftbaren | Bobo får en kropp | ett svävande huvud `:121`, `:547` |
| ✅ v1.337 snobollen | pingvinens ögon följer bollen | ögonen i samma `Graphics` `:549` |
| ✅ v1.374 bygg-tornet | klossen gungar i kranlinan (P2) | ingen pendel i koden |
| ✅ v1.368 bygg-en-kompis | antennerna fjädrar vid studs och kittling (P2) | bara `bounceIn` vid byte `:734` |
| ✅ v1.370 hamburgerbygget | stapeln svajar när ett lager landar (P2) | `_layoutStack` skriver bara y `:888-896` |
| ✅ v1.327 lagerelden | slumpa sorten per order | `level % 4` `:347` |
| ✅ v1.340 ballonglyft | Elvira får idle-liv | ingen `liv()` på henne |
| ✅ v1.335 tryck-och-forvandla | figurerna står på mark i stället för på rosa plattor | ellipsplattor `:226-229` |
| ✅ v1.347 spindelhjalten | förgrundsdekor (staket, träd) | bara `createScene('meadow')` `:91` |
| ✅ v1.348 plask-i-vattnet | sandbotten och vattenväxter i tanken | skärmdumpen |
| ✅ v1.336 loopdjuren | scenfärg per nivå | alltid `candy` `:91` |
| ✅ v1.344 borsta-tanderna | kranen går att trycka på | `_rum.kran.pa` bara i finalen `:1441` |
| ✅ v1.316 studsmatta | målens jitter redan från nivå 0 | jitter först från nivå 4 `:500` |
| ✅ v1.295 plantera-fron | rita blomhuvudet (Ä12, beslutat) | ✔ emoji-`Text` i storlek 92 `:525` |

### 5.5 Nya kunder till befintliga arbetsordrar

| Order | Nya kunder ur genomgången |
|---|---|
| **F1** leder | **bygg-tornet** (✔ klossarna låses statiska — tornet ska svaja, aldrig rasa) · flipperspel (snurran) · domino (klockan) · kulbana (vippa, dominobit) · studsbollar (gungande korg) · studsa-ner (snurror) · rulla-bollen-hem (svängande grind) · fanga-frukten (frukten i skaftet) · spindelhjalten (rörlig knopp) |
| **R2** kinematiska | **flipperspel** — paddlarna ✔ (`:934-935`) · P1:s studsmatta · P3:s behållare · rulla-bollen-hem (rörlig dyna) |
| **F3** brytbart | snobollen (snögubben i rundade bitar) |
| **F4** vind | flugan-pa-nasan (sug bakom + kon framför — ett krav på F4) · sapbubblor · bowling · fallskarmen · kla-efter-vadret · rulla-bollen-hem · enhorningen-flyger |
| **F5** ytvågor | pruttbad (ankan, ✔ redan i dag) · fargregn · tvatta-djuret · unika-knytt |
| **F6a** vätska ↔ kropp | saftbaren (isbitar) · vattenvagen (vattenhjul) · plask-i-vattnet (lasta flytaren) |
| **G1** grepp | spindelnatet (bytet svänger in) |
| **G2** kast | tarta-i-ansiktet (tredje egna släppfarten) · blixt-och-dunder ✔ · valpens-bajs · mata-monstret |
| **G8** vev | vattenvagen (ventilen) · kugghjulen (svänghjulströghet, F10) |
| `Rep` på nya ställen (T3) | ballonglyft ✔ · poppa-ballonger (`:427-430`) · kla-efter-vadret (klädstrecket `rum.js:93-95`) · kla-pa-nallen (halsduk) · magnet-fiske (linan `:633`) · plantera-fron (stjälken) · titt-ut-pappa (gardinen) · vakna-pappa (ballongsnöret) |
| `Mjukkropp` på nya ställen | **kittla-figuren** (kroppen är en rundad rektangel `:277` — `rundadRektForm` i `hamburgerbygget/bulle.js:42` gör den formen mjuk) · bajs-och-kiss (korven plattas, en i taget) · borsta-tanderna (tandkrämen) · valpens-bajs (högen på skopan) |
| `Motstandsvolym` på nya ställen | **poppa-ballonger** (pysballongen) · sortera-skrap (papper som fladdrar ner i tunnan) · flugan-pa-nasan (pappren seglar) · spindelnatet (löv- och fjäderbyten) |
| `FluidWorld` där den syns | trollblandning (överkokningen i stället för ✔ 🧪 `:1401`) · plantera-fron (vattenstrålen) · glasstornet (sås i finalen) · borsta-tanderna (spottet, liten `area`) |
| Kandidat utan order: tyg och nät | vad-forsvann (filten draperar) · spindelnatet (nätet buktar). `Rep` är 1D; ett 2D-rutnät byggs inte förrän en kund bär det. |

### 5.6 Doc-drift som ska rättas när spelet rörs

- `flipperspel` §1: paddlarna "drivs med vinkelhastighet" — koden teleporterar statiska kroppar ✔.
- `rulla-bollen-hem` §4: "[Quick] tap-fallback mindre perfekt" är redan gjord (`tapPower: 0.62` `:255`).
- `mata-monstret` §3: "magen byggs aldrig upp" — den växer (`_bellyScale` `:677`).
- `kugghjulen` §4: Elviras uttryck är redan lagat (`:284-287`, `_setElvira` `:1334`).
- `vad-forsvann` §4: läget "vad är NYTT?" är redan byggt (`'added'` `:326`).
- `poppa-ballonger` doc: ballongerna knuffar redan varandra (`:1050`).
- **"Blockerad: TTS nere" (2026-09-23)** står kvar i sex docs ✔: ballonglyft · kla-efter-vadret ·
  saftbaren · siffertaget · valpens-bajs · zackes-biltvatt. `npm run voice` fungerar (CLAUDE.md),
  så de punkterna är byggbara.

### 5.7 Per spel

Bild **A/B/C** mot `grodan-slurp` · omspelning **Hög/Medel/Låg** · prio **1–3** (1 = störst vinst
per insats för barnet). "Köad" = står redan i spelets doc §4. Radnummer i spelets `index.js` om
inget annat anges.

#### Fysikspelen, plus magnet-fiske och mata-monstret

| Spel | Bild | Omspelning | Fysik | Enkla vinster | Prio |
|---|---|---|---|---|---|
| balanstornet | B — createScene-äng, inget avlägset djupled | Medel — stöd ur 3, lutning ur 5 (`:376-377`) | F1-port; rullande stöd = gångjärn på rörlig kropp | vindpust med tak (köad) · Bobo hejar vid mitten (köad) | 3 |
| bowling | C — krämplatta, tom bana | Låg — fasta trianglar (`:448-481`) | G3a; auto-hjälpens knuff (`:817-841`) → synlig vindby (F4) | formation ur 3–4 mönster (U2) | 2 |
| bygg-tornet | C — tom himmel, tomt mittfält | Medel — kattungen alltid x 912 (`:264`) | **fejkat:** ✔ klossen låses statisk (`:384-386`) → F1-leder + vridfjäder, tornet svajar utan att rasa; kranklossen som pendel | klossen gungar i linan (P2) · tema per runda (köad) | 1 |
| domino | B — gles, platta brickor | Medel — raden alltid rak (ägarbeslut) | klockan är gsap (`:914-919`) → F1-pendel som sista brickan träffar | Bobo följer raset med blicken (köad) | 3 |
| elementlekplatsen | C — mörk låda, platta celler | Hög | ingen — automaten är fysiken | fler sällsyntheter (köad) | 3 |
| enhorningen-elvira | B — pastell utan kontrast | Låg — `_levelConfig` deterministisk (`:342-358`) | molnstudsen skriptad (`:684-687`) → `Fjaderbrada`-moln (P1) | ädelstenar och regnbåge inom band (U2) | 2 |
| enhorningen-flyger | B — jämn himmel | Medel — inga händelser längs vägen | uppvindsband (F4, inget behov) | gyllene stjärna (köad) | 3 |
| fallskarmen | B — tom luft, platt gräs | Medel — alltid samma matta | landningen en tween (`:909-914`) → `fjader1d` (P1); vind i höjdskikt (F4) | varierade landningsmål · vindkast (köade) | 2 |
| flipperspel | B — platt bord och ram | Hög (`slumpaUt`) | ✔ paddlarna teleporteras, kicken skriptad → R2; snurran bara bild (`:940-945`) → F1 | bantema per nivå (köad) | 2 |
| glasstornet | B — rosa tvätt, struten en V-pinne | Medel — 3 kärl i fast cykel (`:419`) | (T2/T3); sås som rinner i finalen (FluidWorld) | kärl utan upprepning (U2) | 3 |
| gravmaskinen | C — beige platta | Medel — 5 laster i fast ordning | ingen — kornautomaten är fysiken | befolka bygget (köad) | 3 |
| gungan | B — platt Lova, svävande hylla | Medel — alltid `meadow` (`:119`) | ingen — pendeln är mekaniken (B3) | taktglöd runt sitsen (köad) | 3 |
| knuffa-tornet | B — platt himmel och avsats | Låg — `SHAPES` i fast ordning (`:575`) | F1, F3 | form och specialplats slumpas (U2) | 3 |
| leksakslada | A | Hög | G1, G2 | fler sällsynta gäster (köad) | 3 |
| natskott-pa-stan | A | Hög | `Rep`/matter; "skaka ner äpplen" som kroppar | köade småfix | 3 |
| plask-i-vattnet | C — platt blå tank utan botten | Medel | lasta flytaren (`Flytvolym`, F6a) | överraskningsföremål (köad) · sandbotten och växter | 2 |
| popcornkalaset | A | Medel — B7-händelserna saknas | källan till G1 | slumpade händelser B7 (köad) | 3 |
| rulla-bollen-hem | C — platt grön yta | Medel — två hindertyper | backar och gropar (F4); grind (F1), dyna (R2) | rikare banor (köad) · ⚠️ doc §4:s tap-fallback redan gjord | 2 |
| saftbaren | C — remsgradient, Bobo ett huvud | Medel — samma kund, fyra glas | isbitar som flyter (F6a) | Bobo får kropp | 3 |
| snobollen | B — små platta hinder | Hög (`nastaVariant`) | krossade hinder skriptade (`:1379`) → F3 snögubbe | pingvinens ögon följer bollen | 2 |
| spindel-zacke-svingar | C — platta lådhus | Medel | ingen — pendeln är mekaniken | folk i fönstren (köad) | 3 |
| spindelhjalten | C — tom äng, platt hjälte | Medel | G3b, F4; rörlig knopp (F1) | förgrundsdekor | 3 |
| studsa-ner | C — vit tavla, tomma ringar | Medel — fast pinntriangel | R2, F4; snurror (F1) | snurra eller vimpel (köad) | 2 |
| studsbollar | B — platta bollar | Låg — korg och målbollar fasta (`:279-282`, `:310`) | T2; gungande korg (F1) | korg och målbollar inom band (U2) | 2 |
| studsmatta | B — mattan ett streck | Låg — målen på fast linje (`:503-506`) | **fejkat:** ✔ knuff + gsap-dipp → `Fjaderbrada` + R2 (P1) | driftande ballong (köad) · jitter från nivå 0 | 1 |
| vippbradan | C — tom himmel, platt triangel | Låg — korgen ur nivån (`:325-327`) | F1-port; plankan böjs (P1-silhuett) | korgen inom band (U2) | 2 |
| magnet-fiske | B — toppvy utan ljus och spegling | Hög | T1, F5; `Rep`-lina från spötoppen (`:633`) | köade småfix | 3 |
| mata-monstret | B — standardhimmel, platt bord | Hög | (T3); G2-kast som bonus | rap och klapp vid full mage | 3 |

#### Roligt, plus fem motorikspel

| Spel | Bild | Omspelning | Fysik | Enkla vinster | Prio |
|---|---|---|---|---|---|
| bajs-och-kiss | B — platt kakel, platta figurer | Medel — pottan ur nivån (`:296-297`), slut vid nivå 5 | korven tas bort i samma bildruta som sensorn nuddas (`_score` `:718`) → plums: liten `Mjukkropp`; kanternas `restitution` död (`:340-341`, V10) | ✔ squash + materialljud via `onImpact` · `studs` på kanterna (mät mot HEAD) | 2 |
| borsta-tanderna | A | Medel — samma ansikte | tandkrämen som `Mjukkropp`; spottet som liten FluidWorld | handduken vaggar (köad) · kranen går att trycka på | 3 |
| bygg-en-kompis | B — blek verkstad, pilknappar tar bilden | Hög | antenner och öron vippar (`toppNod` `varelse.js:400-405`, P2) — inte `Mjukkropp`, konsten är lager | fjädervipp på `toppNod` (städa i `_stadVarelse` `:747`) | 2 |
| enhorning-glitterbajs | B — rosa bokeh-platta, plattformar i luften | Medel — samma kista | kistan en sensor (`:308`) → hög (P3); plattformarnas `restitution` död (`:364`) | kistan svämmar över | 2 |
| flugan-pa-nasan | A | Medel — samma rum | fläktens fält (`:826`) → F4-krav; pappren seglar (`Motstandsvolym`) | inga nya | 3 |
| fyrverkeri | C — platt mörkblå platta, rektangelstad | Medel — stjärnorna i rad (`:226-231`) | ✔ gnistorna har bara tyngd → luft och vind (P5) | ✔ gnistor och rök i vinden | 1 |
| hamburgerbygget | B — frontalt platt kök, ikonremsa | Medel — önskan ur samma set | stapeln spikrak (`:888-896`) → svajar (P2), välter aldrig; ketchup som `Rep` (köad) | stapeln svajar vid landning · burgargalleri (köad) | 2 |
| kittla-figuren | C — tonade roundRects på godisplatta | Medel — samma rigg omfärgad | kroppen som `Mjukkropp` (`rundadRektForm`): kittlingen blir en buckla som gungar ut; zonerna står still | accessoar per runda (köad) | 1 |
| klambubblor | B — platt blå gradient | Medel — alltid hexrutnät (`:181-183`) | pärlorna ritas om (`:502`) → hög (P3) | ✔ stöt mellan bubblorna · efterklang (köad) | 2 |
| lagerelden | B — platta figurer, bålet en partikelklump | Medel — sorten ur `level % 4` (`:347`) | (`Mjukkropp`, `Varmefalt`); ved som rullar in kräver en ny motor | sorten slumpas per order (U2) | 3 |
| loopdjuren | C — pastellpaneler, djuren bara huvuden | Låg — samma block, djur och scen | ingen — tiden är mekaniken (öronen: P2) | scenfärg per nivå | 3 |
| mata-munnen | A | Hög | djupast redan; kvar: matter ↔ `Mjukkropp` (kastrullen trycker geggan) | inga | 3 |
| pizzabageriet | B — platt kakelvägg, ugnen en ruta | Medel — bara räknaren sparas (`:1091`) | ingen — fri placering i toppvy är poängen | pizzabok · sås- och ostval (köade) | 3 |
| pruttbad | B — Zacke en grå klump under ytan | Medel — badsort och leksak per nivå (`:459`, `:878`) | ✔ ankan läser inte `_waveAt` → F5 inne i spelet | ✔ ankan rider på vågen | 2 |
| regnbagsmalaren | C — grå gradient, platta kullar | Låg — identisk från nivå 3 | ingen; man och svans som `Rep` (köad) | ✔ lotta varianterna (U2) | 1 |
| roliga-snurran | B — tom rosa platta | Medel — hyllan tar 8, sedan inget nytt | mynten faller ur bild → hög (P3, köad) | regnbågssymbol (köad) | 3 |
| sapbubblor | B — platt Bobo och mark | Medel — ringens x ur fast lista (`:431-434`) | puffarna = regionalt vindfält (F4) | svag vind från nivå 1 (köad) | 3 |
| tarta-i-ansiktet | C — krämplatta mellan ridåer | Medel — samma clown och scen | tredje egna släppfarten (`:50`) → G2; `STEER` (`:46`) avgör landningen | blank strimma (köad) | 2 |
| titt-ut-pappa | A | Medel — alltid samma rum | taklampan som pendel (sluten form, B3); gardinen som `Rep` | lampan gungar som ledtråd (idé i doc §4) | 3 |
| tryck-och-forvandla | C — figurer på rosa plattor | Medel | liten: raketen flyger ballistiskt | figurer på mark | 2 |
| unika-knytt | A | Hög | ✔ kupan som snöglob: kornen kastas upp och sjunker (P5); vattenvärlden skvalpar (F5) | glastrycket kastar upp kornen | 3 |
| vakna-pappa | A | Medel — sömnstegen likadant varje gång | krydda: ballongen i sitt snöre (`Rep`) | "ett öga"-effekten (köad) | 3 |
| zackes-biltvatt | B — bilen platta former, grå hall | Medel — sex fordon | (`Rep`, SPH); bilen står stel efter intåget (`:899`) | karossen gungar på fjädrarna (P2) | 2 |
| fanga-frukten | B — tom himmel, trädet utan volym | Medel — samma scen och korg | frukten förstörs (`:744`) → ligger kvar (P3 + R2); gungar i skaftet (F1) | inga nya | 2 |
| poppa-ballonger | B — ingen fond | Medel — antal och fart ur nivån (`:311-312`) | snörena som `Rep` (`:427-430`); **pysballong** (`Motstandsvolym`) | pysballong som ny typ | 1 |
| klappa-mullvaden | B — platt gräs, platta hål | Medel — alltid `meadow` (`:125`) | ingen — tajmad tap är kärnan | bakgrund per nivå (köad) | 3 |
| valpens-bajs | B — stor tom gräsmatta | Låg — samma park (`:1200`) | kast ur skyffeln (G2, bonus); högen som `Mjukkropp` | inga nya | 2 |
| tvatta-djuret | B — tom fond | Medel — djuret ur nivån till nivå 5 (`:365-367`) | badsaken svarar på duschen (F5) | gnuggskummet egen ton (köad) | 3 |

#### Pussel, Lära, Minne och fem dra-spel

| Spel | Bild | Omspelning | Fysik | Enkla vinster | Prio |
|---|---|---|---|---|---|
| enkelt-pussel | C — krämplatta, ingen värld | Medel — ✔ motiven i fast ordning (`:386`) | ingen | ✔ slumpad motivordning · reaktion per bit (köad) | 2 |
| passa-formerna | B — formerna svävar utan yta | Medel — `ANTAL` 6 av 7 (`:54`) | formerna tumlar ur lådan i finalen; landa (P4) | fel form fastnar och puttas ut · fjäril (köade) | 3 |
| glittergrottan | C — platt lila grotta | Medel — reglerna i fast ordning (`:306`) | ingen | inga nya (shadern parkerad av ägaren) | 3 |
| golvet-ar-lava | B — platta klippblock | Medel — fasta layouter nivå 0–5 | stenarna dyker och gungar vid landning (P2) | barnets egen figur hoppar | 2 |
| kugghjulen | C — pegboard-platta, tom yta | Medel — nivå 1–8 fasta | svänghjulströghet (F10, G8) | verkstaden vaknar · målbelöningar (köade) | 3 |
| kulbana | B — delarna på krämpanel | Medel — bana 1–5 fasta | vippa och dominobit som bandelar (F1) | fåglar · "Hoppsan, hem igen!" · hyllan (köade) | 3 |
| skattjakt-i-morkret | B — skatterna gråa cirklar | Medel — ett rum, 3 nivåer | ingen | nattfjäril som sällsynt gäst (köad) | 3 |
| skuggmatchning | B — bara huvuden, ängsmall | Hög — 44 föremål | ingen | inga nya | 3 |
| stor-liten | C — saker svävar i himlen, text i bild (`:232`) | Medel — samma uppgift | sakerna landar efter storlek (P4) | sakerna på marken | 2 |
| trollblandning | C — ✔ ikoner i färgring, platt kittel, 🧪-final | Låg — 9 nåbara mål (`:279`) | överkokningen som riktig vätska (spelets FluidWorld) | ✔ ringen bort | 2 |
| vattenvagen | B — omotiverade bubblor i fonden | Hög — genererade banor | vattenhjul som snurrar av strålen (F6a) | ventilen (köad, G8) | 3 |
| ballonglyft | C — ängsmall, sifferruta | Medel — samma handling | ✔ snörena raka streck → `Rep` med slak | Elvira får idle-liv · balkongen höjs mjukt (köad) | 2 |
| blixt-och-dunder | B — platta hus och mark | Medel — fasta byar nivå 0–5 | kasta molnet (G2); moln som `Mjukkropp` (G4) | ✔ behåll släppfarten | 2 |
| fargregn | B — platta träd och mark | Hög | pölarna slår upp vågor (F5) | inga nya | 3 |
| rakna-applen | C — platt trädklump, tom äng | Låg — ✔ målet 2, 3, 4, 5 (`:369`) | frukten faller och lägger sig i en synlig hög (P3) | ✔ slumpat målantal · subitisering (köad) | 1 |
| siffertaget | B — vagnarna kort med siffra | Låg — alltid 1..N, fast last (`:29`) | kopplen sträcks ett i taget vid avgång (P2) | köat (märkt "TTS nere", §5.6) | 2 |
| djurorkester | A | Medel — konsert 1 alltid samma sex (`:52`) | ingen | tack-melodin varieras (köad) | 3 |
| kla-efter-vadret | B — stel lådformad Elvira | Medel — 4 väder | klädstrecket som `Rep` (`rum.js:93-95`); blåsigt väder (F4) | variera figuren (köad, "TTS nere") | 2 |
| peka-pa-kroppen | B — tom mitt, fråga i pratbubbla | Medel — påse med ~9 delar | ingen (valfritt: magen dallrar) | svans- och öronfrågor (köad, "TTS nere") | 3 |
| vilket-djur-later | C — halva bilden platt grön yta | Medel — 12 djur | ingen | örat överlappar träffytan (köad) | 3 |
| folj-sparet | A | Medel — linjär ordning nivå 0–2 (`:349`) | ingen | glöd efter fotspåren (köad) | 3 |
| harma-melodin | B — ängsmall | Medel — 4 plattor, `MAX_LEN` 6 (`:37`) | ingen | klangfärg per varelse · tempo (köade) | 3 |
| vad-forsvann | B — små saker, platt "?"-skiva | Medel — uteslutningen löser nivå 2+ (`:582`) | filten som tyg (2D-rutnät, kandidat) | lockbete utifrån (köad) · ⚠️ "vad är NYTT?" redan byggt | 2 |
| vandkort | C — ängsmall och fyra blå kort | Hög — 5 set | ingen | inga nya | 3 |
| vart-tog-det-vagen | B — platta koppar, tomt bord | Hög — `planMoves` | ingen — slump gör blandningen omöjlig att följa | puls på hyllan · full hylla (köade) | 3 |
| kla-pa-nallen | C — ängsmall, platt nalle, platta plagg | Medel — 5 outfits | halsduk och rosett som korta `Rep` | nallen följer plagget med blicken | 2 |
| plantera-fron | C — platt himmel och jord, emoji-blomma (Ä12) | Låg — högst 3 hål (`:203`), `custom.flowers` visas aldrig (`:817`) | vattenstrålen som FluidWorld; stjälken som `Rep` | rabatten av sparade blommor (köad) | 2 |
| sortera-skrap | C — ✔ saker i skivor i himlen (`:875`) | Medel — round-robin (`:386-394`) | högen sätter sig; fall per material (papper `Motstandsvolym`) | ✔ skivan bort, högen på marken | 1 |
| spara-linjen | C — pappersskiva på krämplatta | Medel — fast plan 18 steg | ingen | bakgrund efter motivet (köad) | 2 |
| spindelnatet | C — tom natthimmel, små byten | Medel — samma byten | bytet tweenas in (`:475`) → G1; nätet buktar (kandidat) | inga nya | 2 |

---

## 6. Logg

- **2026-10-01** · Planen skriven (läsning + åtta Node-mätningar i scratchpad, ingen webbläsare,
  inga ändringar under `src/`). Tre fynd som inte stod någonstans förut: kraftfält och
  mjukkroppar som beror på bildtakten (§1.3.3), `pointercancel` som Pixi aldrig mappar (K1), och
  att appens 60 fps-tak tillsammans med vsync-stämplar simulerat ger skurar av noll- och
  dubbelsteg (T4/T5). Inget av det är uppmätt på en riktig platta än — M3 och M5 avgör.
- **2026-10-01** · Ägaren besvarade Ä1–Ä10 (§4). Nio följer förslaget. Ä1: både iPad och
  Android, utan modeller, så M5 behövs fortfarande för att få talen. Omgång 1–4 är fria att
  bygga; omgång 5 väntar på en beställning.
- **2026-10-01** · Spelgenomgången (§5) på ägarens begäran, innan omgång 1: 86 spel granskade av
  tre läsande granskare (doc + kod + skärmdump, ingen webbläsare), 21 påståenden stickprovade
  mot koden — alla höll. Resultat: tre nya spår i §2 (**P** fysik in i spelen, **U** omspelning,
  **L** bild), 29 enkla vinster (§5.4), nya kunder i F1/R2/F3/F4/F5/F6/G1/G2/G8, omgång 0 och 1b
  i §3, och två nya ägarfrågor (Ä11 ordningen, Ä12 plantera-frons emoji-blomma). Största
  fynden: tre kärnmekaniker är skriptade fast ett mätt verktyg finns (studsmattans studs,
  flipperspelets paddlar, byggtornets låsta klossar), och `meadow`-presetens släta kupoler är
  bildtaket för 24 spel.
- **2026-10-01** · Ägaren besvarade Ä11 och Ä12, båda enligt förslaget: omgång 0 (enkla vinster,
  U, P5, L) byggs FÖRE omgång 1, och `plantera-fron`s blomhuvud ritas (står nu även i spelets
  doc §4). Alla tolv ägarbeslut är tagna.
- **2026-10-02** · Första nattkörningen över planen (v1.288 → v1.359, 71 versioner, en commit per
  spel/lib). Omgång 0 nästan hel (U1, U2 ×18, P5, L1, 27 enkla vinster, 20 L2-lyft) och omgång 1
  utom tre T2-spel (M1, T4, T1, T3 ×9, M2, R1). Varje spel gick genom check + test + skärmdump,
  variationen genom `_variationprobe`. Läget och nästa natts början står i §3.
- **2026-10-02 → 10-03** · Andra körningen över planen (v1.360 → v1.450, faserna D1–D16 + N1 + L, en commit per spel/lib). Mätt och byggt: T2-resten, R1-baslinjen, P2/P4 (11 kunder), K1–K3 (M3 visade att Pixi aldrig binder `pointercancel` och att finger 2 drar i 5 av 6 spel), R2–R6, P1, G1/G2/G8, F1 (12 spel), F3, F4 (11 spel), F5 (5), F6a, F8, F9, F10, G3a, O1, P3 (5), U3 (6) och två nya spel (Bläckfisken Otto, Vattenballongerna). Skars av mätningen: K4 och O3 (M4) samt zackes-biltvatt i O2 (`area` fanns). Läget och det som återstår står i §3. Doc-drift från körningen, ej rättad i §5: spelens kvarvarande kunder är nu sapbubblor (svag vind från nivå 1), fallskarmen (varierade landningsmål, vindkast), enhorning-glitterbajs (plattformarnas restitution) och spindelhjalten/enhorningen-elvira (G3b: prickbanan bär ett vindtal); kla-efter-vadrets klädstreck är ritad geometri (`byggStreck`), inte ett `Rep`; kupans förhandsmark i `kupan.js` skvalpar inte; bowlings knuff låg i `_autoHelp`; backar och gropar i rulla-bollen-hem byggdes nya i `zoner.js` (fanns aldrig i trädgården).
