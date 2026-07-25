# Glittergrottan (`glittergrottan`)
> 🎉 roligt · tap · 2–5 år · status: 🔧 ombyggt till ordningsspel (2026-07-25)

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
| **kategori** | roligt → flik Roligt *(`pussel` skulle passa loopen bättre nu — inte bytt, det flyttar spelet i biblioteket)* |
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

Antal kristaller: `3 + floor(nivå/2)`, tak 6.

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
"Titta, hela grottan lyser!"                                             (runda klar)
"Oj, glimmerdimma! Tryck bort den."                                      (motgången dyker upp)
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

**Motgång:** från nivå 2 lägger sig en **glimmerdimma** över en kristall och dämpar den. Ett
enda tryck sopar bort den (poff + gnistor), och den löser upp sig själv efter ~9 s. Tak: max 2
åt gången, aldrig över en redan tänd kristall, aldrig fler än en per kristall — den kan alltså
som mest sakta ner leken, aldrig stoppa den.

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

- Formregeln använder bara två grupper (klot/spets); kuben är dekor och aldrig en egen grupp.
- Ingen kristallspecifik SFX ännu (`kristall_klirr` via MOSS) — tonerna bär hela ljudbilden.
- Glimmerdjuret har inget namn och ingen egen replik; det reagerar bara.
- Facit-raden visar alltid en komplett lösning; ingen svårare variant där bara *principen*
  visas (t.ex. tre gråa kristaller i storleksordning) för de äldsta barnen.
- Dimman är den enda motgången och kommer sällan (var ~10 s, från nivå 2).

## 4. Förbättringsplan

- **[Quick]** Kub som tredje formgrupp när n ≥ 5 (`form`-regeln med tre grupper).
- **[Quick]** Riktigt kristallklirr-SFX via `scripts/sfx-phrases.json` (`kristall_klirr`).
- **[Medium]** "Principfacit" på höga nivåer: neutralfärgade minikristaller som bara visar
  regeln, inte lösningen — mer tankearbete för 4–5-åringar utan att bli ett fail.
- **[Medium]** Namnge och rösta glimmerdjuret (kort jubelreplik vid rundslut).
- **[Deep]** Mjuk kamera-drift på idle för mer platskänsla (utan att bryta designToWorld —
  drifta runt origo och lerpa tillbaka före pick).

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
- **Att lyfta till `lib/`:** (1) `ThreeLayer` saknar ett publikt sätt att sluta ticka ett
  material som spelet disposar — spelet gör i dag `layer._animated?.delete(mat)` (privat
  fält). En `layer.unanimate(mat)` hör hemma i `three3d.js`. (2) `_later()`-mönstret (exit-
  säkra fördröjda anrop) borde bli en delad hjälpare i `lib/feedback.js` eller en liten
  `lib/timers.js` — buggen ovan kan finnas i flera spel.
