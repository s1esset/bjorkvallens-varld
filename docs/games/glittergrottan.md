# Glittergrottan (`glittergrottan`)
> 🧩 pussel · tap · 2–5 år · status: ✅ polerad till marknadskvalitet (2026-08-08)

> **Appens första 3D-spel** och **mallen för nya 3D-spel** (three.js via `lib/three3d.js` +
> shaders i `lib/three-shaders.js`). Byggt direkt mot mönstret i `.claude/skills/threejs-games`:
> ThreeLayer bakom Pixi, egen grott-backdrop-shader (`uBoost` tänder grottan), glitter-/toon-
> material, tap→raycast via Pixi-hityta, Pixi-feedback (sparkle/burst) ovanpå 3D-objekten,
> exit-säker destroy med full GPU-städning.

## 0. Spec

| | |
|---|---|
| **id** | `glittergrottan` |
| **titleSv** | Glittergrottan |
| **icon** | 💎 |
| **kategori** | `pussel` → flik Pussel *(flyttad från roligt 2026-07-25, ägarbeslut i koden — docen släpade efter till 2026-08-08)* |
| **input** | tap |
| **ålder** | [2, 5] |
| **kärnloop** | En facit-rad högst upp visar i vilken ORDNING grottans kristaller ska tryckas. Barnet trycker dem i den ordningen; varje rätt kristall tänds, skickar sitt ljus till glimmerdjuret och spelar nästa ton i en stigande pentatonisk skala. |
| **mål** | Alla kristaller tända i rätt ordning → `progress.complete()` + ny runda med **ny ordningsregel**. |
| **agens** | Vilken kristall barnet väljer härnäst avgör allt: rätt val tänder + tonar uppåt, fel val vickar bara och ger tydligare ledtråd. Dimman kan dessutom tryckas bort när som helst. |
| **variation** | Ny regel varje runda (storlek↑, position→, färg, storlek↓, position↑, form), 3→6 kristaller, slumpad färg/form/storlek/plats. Från nivå 6 slumpas regeln (aldrig samma två gånger i rad). |
| **mottagare** | **Glimmerdjuret** i vänstra hörnet (3D-figur av primitiver): varje tänd kristall skickar ett ljusklot till den, den hoppar och pling:ar, och jublar stort när rundan är klar. Går att klappa. |
| **finish** | Kristallerna tänds i tur och ordning (melodin spelas om), hela grottan lyser upp via backdrop-shaderns `uBoost`, djuret jublar — sedan delat firande + klistermärke. |

**Ordningsregler (rang; lika rang = valfri ordning inom gruppen)**

| nivå | regel | vad barnet ska göra |
|---|---|---|
| 0 | `storlek_upp` | minsta → största |
| 1 | `pos_hoger` | vänster → höger (sicksack-rad) |
| 2 | `farg` | följ regnbågsordningen |
| 3 | `storlek_ner` | största → minsta |
| 4 | `pos_upp` | nerifrån → upp (tre x-banor) |
| 5 | `form` | alla klot först, sedan alla spetsar (eller tvärtom) |
| 6+ | slumpad | aldrig samma regel två rundor i rad |

Antal kristaller: `3 + floor(nivå/2)`, tak 6. **Formregeln får en tredje grupp när fältet är
fullt (n=6): 2 klot / 2 spetsar / 2 kuber, kuben alltid sist** — introduktionsrundan (nivå 5,
n=5) förblir två grupper så regeln hinner sätta sig.

**Röstrepliker**
```
"Tryck på kristallerna i rätt ordning!"                                  (voiceIntro, mount)
"Tryck på kristallerna från den minsta till den största!"                 (regel)
"Tryck på kristallerna från den största till den minsta!"                 (regel)
"Börja längst till vänster och gå åt höger!"                             (regel)
"Börja med kristallen längst ner och gå uppåt!"                          (regel)
"Följ färgerna i raden högst upp, en färg i taget!"                      (regel)
"Tryck på alla runda klot först, sedan de spetsiga kristallerna!"        (regel)
"Tryck på alla spetsiga kristaller först, sedan alla runda klot!"        (regel)
"Nästan! Kristallen som blinkar är nästa."                               (första fel-tryck)
"Titta, den här kristallen blinkar — tryck på den!"                      (hjälp efter 2 fel)
"Titta, hela grottan lyser!"                                             (runda klar, varannan)
"Glimma jublar — vilken fin melodi!"                                     (runda klar, varannan)
"Glimmerdjuret heter Glimma!"                                            (första klappet)
"Oj, glimmerdimma! Tryck bort den."                                      (motgången dyker upp)
"Tryck på alla runda klot först, sedan de spetsiga kristallerna, och kuberna sist!"  (regel, n=6)
"Tryck på alla spetsiga kristaller först, sedan alla runda klot, och kuberna sist!"  (regel, n=6)
```
Regel-repliken är också om-cue vid ~7s inaktivitet och det som 🔊-knappen repeterar.

## 1. Nuläge (sett som spelare)

En mörk grotta med stjärnglittrande tak, lysande golv, låg-polystalagmiter och djupa
bakgrundskristaller i letterbox-zonerna. Högst upp: en **facit-rad** med små, riktigt ritade
kristaller (klot/spets/kub i rätt färg och rätt inbördes storlek) med pilar emellan — den
visar ordningen utan ett enda ord. Den kristall som står på tur andas lugnt i facit-raden.

I grottan svävar 3–6 stora kristaller i olika djup. Trycker jag rätt: kristallen studsar upp,
lyser vitare, får en gyllene halo, facit-minien får en gyllene ring, ett **ljusklot flyger ner
till glimmerdjuret** som hoppar till — och tonen är nästa steg i en pentatonisk skala, så en
klarad runda spelar en liten melodi. Trycker jag fel: mjukt ljud, kristallen vickar glatt,
rätt kristall pulserar; efter två fel kommer en tydlig gyllene ring runt rätt kristall + en
snäll röstledtråd. Ingenting nollställs någonsin.

**Motgång:** från nivå 1 lägger sig en **glimmerdimma** över en kristall och dämpar den
(första ~10 s in i rundan, sedan var 9–12 s). Ett enda tryck sopar bort den (poff + gnistor),
och den löser upp sig själv efter ~9 s. Tak: max 2 åt gången, aldrig över en redan tänd
kristall, aldrig fler än en per kristall — den kan alltså som mest sakta ner leken, aldrig
stoppa den.

**Sedan 2026-08-08:** mjuk **kamera-drift** på idle (±17/11 px parallax som somnar vid tryck),
glimmerdjuret heter **Glimma** (presenterar sig vid första klappet, jublar med namn varannan
runda), redan tända kristaller **klirrar** (kristall_klirr, stämd C7/E7/G7-syntes tills
MOSS-klippet finns) med en liten skalpuls, och varje rundas melodi börjar på ett slumpat
skalsteg så segermelodin aldrig är exakt densamma.

När sista kristallen tänds tänds alla i tur och ordning med melodin, **hela grottan lyser upp**
(backdrop-shaderns `uBoost`), glimmerdjuret jublar, och sedan kommer delat firande + stjärna +
klistermärke. Efter ~3 s växer en ny runda fram med en ny regel.

*(Skärmdump: `.test-shots/glittergrottan.png` — facit-rad med tre kristaller i storleksordning,
grön/rosa/blå kristall i grottan, glimmerdjuret nere till vänster.)*

**Funkar bra:** facit-raden gör regeln begriplig helt utan läsning; den pentatoniska stegen ger
en riktig belöningskänsla; ljuset som flyger till en mottagare knyter ihop loopen; regelbytet
gör omgång 2 påtagligt annorlunda mot omgång 1.

## 2. Ursprunglig plan & tankeprocess

Första versionen (2026-07-04) var en teknikdemo: fina kristaller att poppa, men ingen anledning
att trycka på någon särskild — ägaren: *"det finns ingen struktur eller ett mål på hur man
spelar"*. Ombyggnaden behöll hela 3D-kedjan men gav den en kärnloop: **sekvensering**, den
kognitiva färdighet 2–5-åringar just håller på att bygga (ordna efter storlek, färg, form,
riktning). Facit-raden är designad som ett *bildfacit* i stället för en regel-gåta: för en
tvååring blir det matchning (kopiera raden), för en femåring blir det regeln bakom (rösten
namnger den). Samma skärm bär båda åldrarna.

## 3. Vad som är tunt

- Facit-raden visar alltid en komplett lösning; ingen svårare variant där bara *principen*
  visas (t.ex. tre gråa kristaller i storleksordning) för de äldsta barnen.
- `kristall_klirr` spelar stämd syntes (C7/E7/G7) — MOSS-klippet väntar på att tjänsten är
  uppe (frasen ligger i `scripts/sfx-phrases.json`).
- Dimman är fortfarande spelets enda motgångstyp.

## 4. Förbättringsplan

- ~~**[Quick]** Kub som tredje formgrupp~~ ✅ 2026-08-08 — vid **n=6** (inte n=5 som planerat:
  introduktionsrundan förblir två grupper så regeln hinner läras).
- ~~**[Quick]** Riktigt kristallklirr-SFX~~ ✅ 2026-08-08 — sfx-nyckel + stämd syntes-fallback
  i spelet; själva MOSS-klippet väntar på tjänsten (se §3).
- **[Medium]** "Principfacit" på höga nivåer: neutralfärgade minikristaller som bara visar
  regeln, inte lösningen — mer tankearbete för 4–5-åringar utan att bli ett fail.
- ~~**[Medium]** Namnge och rösta glimmerdjuret~~ ✅ 2026-08-08 — **Glimma**, presentations-
  replik vid första klappet + jubelreplik varannan runda, båda med riktiga klipp.
- ~~**[Deep]** Mjuk kamera-drift på idle~~ ✅ 2026-08-08 — enklare än planerat: `pick()` och
  `worldToDesign()` går via den levande kameran, så ingen "lerpa tillbaka före pick" behövdes;
  `designToWorld` läser bara `camera.position.z` och påverkas inte alls.

## 5. Status / loggar

`2026-07-04 · nybyggt som 3D-mall (tryck/orsak-verkan) · bf548fc`

`2026-07-25 · OMBYGGT till ordningsspel efter ägarens omdöme ("ingen struktur eller mål").`
- Ny kärnloop: facit-rad (ritade minikristaller + pilar, P0 ASSETS — inga ikoner i rutor) +
  rang-baserad turordning. En enda mekanism (`rank`, lika rang = valfri ordning inom gruppen)
  bär alla sex reglerna, inklusive formregelns grupper.
- Progression: `3 + floor(nivå/2)` kristaller (tak 6); regelramp nivå 0–5, därefter slumpad
  regel som aldrig upprepas två rundor i rad.
- Ljud: rätt tryck = nästa ton i en pentatonisk skala (`audio.tone`) + oktav-överton; finishen
  spelar om melodin medan kristallerna tänds i tur och ordning.
- Mottagare: **glimmerdjuret** (3D-figur av primitiver, klappbar) tar emot ett ljusklot per
  tänd kristall och jublar vid rundslut.
- Motgång: glimmerdimma (max 2, självupplösande efter 9 s, ett tryck sopar bort den).
- Finish: egen backdrop-shader med `uBoost` → hela grottan lyser upp. Dekor: golv,
  stalagmiter och djupa bakgrundskristaller i letterbox-zonerna.
- **Bugg funnen och fixad under testning:** en `gsap.delayedCall` från en tidigare omgång
  överlevde `destroy` (spelmodulen är en singleton, så `_alive` är åter `true` vid nästa
  mount och guarden släppte igenom den) och byggde om rundan mitt i nästa spelomgång. Alla
  fördröjda anrop går nu via `_later()` som registrerar dem i `this._timers`; `destroy` dödar
  listan. **Samma fälla finns i alla spel som använder `gsap.delayedCall` + `_alive`.**
- Layout/P0: osynliga hit-meshar ger ≥146px träffyta även för de minsta kristallerna; mätt
  minsta centeravstånd i alla regel-layouter 262–298px (krav ~140px), och spelfältet håller
  avstånd till glimmerdjurets träffyta.
- Test: `npm run check -- --game glittergrottan` ✓ 0 fel/0 varningar. `npm run test
  glittergrottan` ✓ 0 konsolfel (inkl. exit-cykel). Djuptest som spelar rundor i rätt ordning
  (nivå 0–3 samt seedade nivåer 4/5/7): alla regler bygger rätt fält, rundorna klaras,
  dimman spawnar och kan tryckas bort — 0 konsolfel.
- **Att lyfta till `lib/`:** (1) ~~`layer.unanimate(mat)`~~ ✅ 2026-08-08 — finns i
  `three3d.js`, spelet använder den. (2) `_later()`-mönstret (exit-säkra fördröjda anrop)
  borde bli en delad hjälpare — buggen ovan kan finnas i flera spel. Obs: `ctx.later()`
  finns redan i GameHost och gör samma sak; spelets `_later` kan bytas ut vid nästa omgång.

`2026-08-08 · POLERAD till ✅ (/polera) — alla §4-punkter utom principfacit · 9321376`
- **P0-fix (sedd i skärmdump, inte i doc):** nedre vänstra kristallplatsen kunde hamna på
  x≈278 och gömma sig BAKOM Glimma (träffytorna överlappade — §5-påståendet ovan om mätta
  avstånd stämde inte för petzonen). `_avoidPet()` håller låga platser (y>500) på x≥396:
  396 − 73 (kristall-hit) − 286 (Glimmas hit-kant) = 37 px ≥ 24-kravet.
- Kamera-drift på idle: vaknar efter 2,5 s (mätt 15,9 px), somnar vid tryck (mätt 2,3 px
  efter 1,4 s). Kub-formgrupp vid n=6 (mätt 2/2/2, kuben sist, spelbar). Glimma namngiven
  + 2 repliker, kristallklirr på tända kristaller, melodin börjar på slumpat skalsteg,
  dimman från nivå 1/~10 s. Fyra nya röstklipp genererade (F5-TTS), röstkön tom.
- **Kritikfynd åtgärdat:** slumpat z-djup (±60) gav upp till ~16 % skenbar storleksskillnad —
  lika mycket som regelsteget vid n=6, så "minsta" kunde SE större ut. Storleksregler får nu
  nästan platt djup (±12 → ~3 %).
- **Lib-fynd (three3d.js), uppmätta med `scripts/_glitterprobe.mjs`:**
  (a) `forceContextLoss()` i destroy fick Chrome att BLOCKERA nya WebGL-kontexter — andra
  inträdet i spelet kraschade med tom scen. Borttagen; renderern ÅTERBRUKAS nu mellan
  ThreeLayer-instanser (kontexter GC:as lat — tredje snabba inträdet fick annars
  "Failed to create WebGL2RenderingContext").
  (b) Vid kontextförlust no-op:ar `render()` och nya meshar fick aldrig `matrixWorld` →
  `pick()` missade dem trots rätt position (mwPos [0,0,0], pick 0 → 2 efter
  updateMatrixWorld). Ticken uppdaterar nu matriserna explicit — spelet förblir spelbart
  under kontextförlust (relevant på platta: flikbyte/bakgrund tappar kontexten).
- **Sond:** `scripts/_glitterprobe.mjs` spelar nivå 0→13 (alla regler, flera gånger om),
  mäter petzon (0 brott på 14 byggen), drift och kubrunda — 0 konsolfel. Sondfälla värd att
  minnas: med ThreeLayer finns TVÅ canvasar; `querySelector('canvas')` ger three-canvasen
  (pointer-events: none) — trycken måste till den SISTA canvasen (Pixi).
- GameHost exponerar nu den körande modulinstansen som `window.__barnspel.game` (DEV-only) —
  en sond som importerar spel-URL:en själv får en annan instans så fort Vite HMR-stämplat
  modulen.
