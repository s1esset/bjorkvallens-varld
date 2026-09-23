# Grodan Slurp (`grodan-slurp`)

> ⚙️ fysik · tap · 3–5 år · 📝
> Status: 📝 spec godkänd av ägaren 2026-09-23 kväll · bygget beställt som nattpass

## 0. Spec (fylls i av `/spel` innan kod skrivs)

Ägarens idé, ordagrant: *"ett grodspel som kan hoppa, fånga flugor med sin tunga, sitter i en
damm, grodan ska ha ragdoll kropp, roligt fysik spel där grodan ska fånga flugor, rörliga
kroppsdelar där grodan inte bara är några enkla former utan en detaljerad groda med samma
kroppsfysik, leder, rörelser, mm som en groda har. tungan kan fastna överallt och är det tyngre
saker med mer massa så åker grodan mot det den fastnat i fortare, flugor och andra insekter åker
in i munnen och äts, grodan tumlar och flänger, träffas grodan av nåt eller åker in i nåt större
hårdare studsar den av och ragdollar. spelet ska vara ett roligt, dynamiskt, kreativt och
fantasifullt spel där man inte är låst vid samma animationer och händelser om och om igen,
oförutsägbart och utmanande på ett sätt man behöver vara kreativ på och försöka flera gånger där
man lär sig att inte ge upp."*

| | |
|---|---|
| **id** | `grodan-slurp` |
| **titleSv** | Grodan Slurp |
| **icon** | 🐸 |
| **kategori** | `fysik` → flik Fysik |
| **input** | `tap` — tryck = tungan skjuts mot punkten · tryck PÅ grodan = hopp. Inget drag (medvetet val, se nedan) |
| **ålder** | [3, 5] |
| **kärnloop** | Grodan sitter på ett näckrosblad i dammen. Tryck någonstans → tungan skjuts mot punkten och fastnar på det FÖRSTA den träffar. Insekt → rullas in i munnen, GULP. Gren/sten/stock (fast eller tung) → grodan slungas dit och dinglar i tungan. Lätt sak (löv, kotte) → saken dras till grodan. Tryck igen = släpp + ny tunga. |
| **mål** | 8 insekter uppätna → magen är rund som en boll → `progress.complete()` |
| **agens** | VAR tungan fastnar avgör allt: massan bestämmer vem som flyger mot vem. Högt uppe-insekter nås bara genom att kombinera: hopp → tunga i luften, svinga från grenen, dra en flytande stock närmare och använda den som plattform. Grodan som flyger genom luften med öppen mun äter insekter i vägen av sig själv. |
| **variation** | Slumpad damm varje omgång (näckrosblad, vass, stockar, grenar, stenar) · tid på dagen (morgondimma / eftermiddag / skymning med lysande eldflugor) · insektsblandning: fluga (lugn), mygga, trollslända (pilar), fjäril (fladdrig), humla (TUNG — drar grodan runt i tungan). Sällsynt wow: guldfluga · en anka simmar förbi → fastnar tungan i den blir det vattenskidor över dammen. |
| **motgång** | EN i taget, var ~10–15 s, först efter de 2 första insekterna: kotte som faller från trädet · sköldpadda som simmar förbi (hårt skal) · fisk som hoppar · vindpust. Träffas grodan → studsar av, ragdollar, tumlar, plaskar i, flyter upp och sätter sig igen. Uppätna insekter försvinner ALDRIG — motgången saktar bara ner. |
| **ragdoll** | Aktiv ragdoll i matter.js, 11 kroppsdelar: huvud (bulliga ögon, bred mun), kropp, 2× överarm+underarm, 2× lår+underben+lång fot (simhud, tåkuddar). Leder med vinkelgränser + "muskler" som strävar mot en pose: hopkrupen sittpose i vila, fullt utsträckta ben i hoppet, bröstsim-spark i vattnet. Vid smäll → musklerna slaknar (ren ragdoll), sedan samlar grodan sig igen. Halsen blåses upp när den kvackar, magen växer för varje insekt. |
| **autohjälp** | Sent och synligt: minst en lugn fluga surrar alltid inom räckhåll; efter flera bommar sjunker en tjock fluga ner mot grodan. Tomma tungskott = roligt "slurp-snärt" tillbaka, aldrig fel-ljud. |
| **mottagare** | Tre grodungar på ett näckrosblad vid kanten — kvackar en STÄMD stigande ton för varje insekt (skalan klättrar mot målet), hejar när grodan tumlar. |
| **finish** | Mätt, rund groda → jätterap som blåser en bubbelring över dammen → grodan gör magplask (våg på ytan) → grodkören kvackar en melodi i stämd skala. |

**Röstrepliker**
```
"Tryck där tungan ska fastna! Fånga flugorna!"     (intro — voiceIntro)
"Tryck på grodan, så hoppar den!"                   (om-cue)
"Mums! En fluga till!"                              (beröm, utrop — hoppas över om något talar)
"Prova att fastna i grenen!"                        (kreativ om-cue)
"Hoppsan! Grodan tumlade runt!"                     (motgång, utrop)
"En humla! Den drar i tungan!"                      (händelse)
"Magen är nästan full!"                             (nära mål)
"Vilken mätt groda! Kvack kvack!"                   (före complete())
```

**Val som gjordes på kortet (godkända av ägaren):**
- **Bara tryck, inget drag.** Tryck = tunga, tryck på grodan = hopp. Inom P0, och tungan är
  huvudkontrollen. Ett sikta-och-dra-hopp (slangbella) går att lägga till senare.
- **En skärm, ingen scrollande värld.** Utmaningen kommer från HÖJDEN — insekter högt upp kräver
  att man svingar sig eller hoppar och skjuter tungan i luften.
- **Ålder 3–5** — den äldre änden; ett spel där man försöker flera gånger.
- **Deep.** Ragdollen, tungans fysik och musklerna byggs av EN hand (orkestratorn) så fysiken
  hänger ihop; agenter får scen/ljud/kritik.

## 1. Nuläge (sett som spelare)

*(v1.254.0, nattpasset 2026-09-23/24.)* En damm från sidan: himmel efter tid på dagen (eftermiddag
först, sedan morgon eller skymning), ett stort träd på ena sidan med en gren över vattnet,
kaveldun i kanterna, 2–4 näckrosblad (några med blommor), en mossig sten, en flytande stock och
vatten med växter och ytvågor. Tre grodungar sitter på ett eget blad i förgrundshörnet.

Grodan är en **aktiv ragdoll** med tolv kroppsdelar (huvud, kropp, 2×överarm+underarm,
2×lår+underben+fot) och leder med vinkelgränser. Musklerna håller en hopkrupen sittpose. I
hoppet sträcks benen, i luften ligger de bakåt, och inför landningen tar de emot. I vattnet simmar
grodan bröstsim. Efter en smäll slaknar musklerna och grodan tumlar som en ragdoll med yrselstjärnor
och omtöcknade ögon, och sedan samlar den sig. Ögonen följer närmaste insekt, blinkar och trycks
ned när grodan sväljer. Halssäcken blåses upp när den kvackar. Magen växer för varje insekt.

**Tryck någonstans** och tungan skjuts dit och fastnar i det första den träffar. En insekt rullas
in, och grodan sväljer (GULP). Grodungarna kvackar en stigande durskala. En gren, sten, vass eller
strand är fast, så grodan slungas dit och dinglar i tungan. En lätt kotte kommer farande till
grodan. Den tunga stocken drar grodan mer än den själv rör sig. En sköldpadda eller anka i
tungan ger vattenskidor. **Tryck på grodan** så hoppar den; i luften kvackar den i stället.

Målet är 8 insekter. Finishen: en jätterap med en bubbelring, ett högt hopp, ett magplask med
våg, grodkören, sedan `complete()` och en ny damm.
Skärmdumpar: `.test-shots/grodan-slurp.png`, `_grodspel-*.png`, `_grodfinal-*.png`, `_grodbild.png`.

## 2. Ursprunglig plan & tankeprocess

Kärnan är en ÄRLIG fysikregel som barnet kan upptäcka själv: *tungan drar lika hårt åt båda
hållen — den som är lättast flyger.* En fast gren slungar grodan, en humla rycker den, ett löv
kommer flygande. Det är samma regel varje gång men aldrig samma utfall, eftersom ragdollen,
vattnet och de rörliga sakerna gör varje studs unik. Det är där "inte låst vid samma animationer"
bor: inget i rörelsen är en förinspelad animation, allt är kroppen som reagerar.

"Lära sig att inte ge upp" ska kännas som *lek med misslyckande*: missen är rolig (tungan
snärtar tillbaka, grodan tumlar, plask), aldrig ett straff, och det finns alltid en lätt fluga
inom räckhåll så en 3-åring får sitt GULP inom sekunder medan en 5-åring jagar trollsländan
uppe vid grenen.

## 3. Vad gör det lättjefullt / tunt

**Spelkritikern 2026-09-24:** 7 av 8 punkter höll före åtgärderna nedan, varav mottagaren och de
fristående objekten klart. Tre fynd åtgärdades direkt: röstklippen saknades, den mätta magen syntes
knappt, och "munnen äter själv" från specen var inte byggd. Det som fortfarande är tunt:
- **Slumptryck i insektsbandet får hjälp av sikthjälpen (84 px).** Det är avsiktligt (P0: ett barn
  som trycker NÄRA en fluga ska få den), men det gör de första fyra flugorna nästan gratis.
  Utmaningen bor i andra halvan: insekter utom räckhåll, väjningar och motgång.
- **Skalets hörnknappar** (hem är medvetet ogrindad) hölls fria i två steg. Insekterna har ett
  lägre tak i hörnkolumnerna (`insekter.js` `taketVid`), och grenen sitter nu på y 150–185, under
  knapparnas träffyta (`dammen.js` `_planera`). Förut låg grenens bas i hemknappens träffyta när
  trädet stod till vänster.
- **Kören och finishen hörs med robotröst** tills `npm run voice` körts (gjordes i nattpasset).

Uppmätt under bygget (så att nästa pass inte behöver gissa):
- `_grodprobe.mjs` (Node): sittposens posfel är 0,16 rad, mot 1,15 för kontrollarmen utan
  muskler. Den lätta kotten flyttar grodan 0,10 av kottens sträcka (Newton 0,09). Den tunga
  stocken ger 1,62× (förväntat 1,57). Hoppet är 198 px och grodan sitter igen efter 1,2 s. Efter
  en smäll är den slak i 1,1 s och samlar sig sedan.
- `_grodspelprobe.mjs` (Chrome): riktade tryck ger 17–22 ätna/min, och en runda tar ~30–45 s för
  en exakt sond. **Blinda** tryck, minst 150 px från varje insekt, ger 4,7/min, nästan bara via
  den sena autohjälpen. Skicklighet avgör alltså, och ingen fastnar. 0 konsolfel, inklusive exit
  mitt i ett tungdrag och återinträde.
- Två buggar hittades bara med sonden: ① grodan bland vassen fick varje tungskott att fastna
  direkt vid munnen (284 av 286), och ② skötseln spawnade en ny "lätt fluga" var 0,6 s medan
  den förra flög in utifrån (6 flugor efter 4 s). Båda syntes aldrig i ett grönt test.

## 4. Förbättringar & förhöjningar (plan)

### 4a. Teknisk ritning — LEVERANS 1 (det som byggs i nattpasset)

**Motor: matter.js via `PhysicsWorld`, EN motor** (skill **fysik-spel**). Vatten via
`lib/flytkraft.js` (`Flytvolym`). Ingen egen integrator bredvid.

**Filer** (mönster: `unika-knytt/`, `hamburgerbygget/` — flera moduler i spelmappen):
- `index.js` — GameModule, rundflöde, input, röst (**ALLA `voice.say('literal')` HÄR** —
  `check.mjs` läser bara `index.js`), mål, motgångsschema, finish.
- `groda.js` — ragdollen: kroppar + leder + muskler (pose-PD) + ritning per kroppsdel.
- `tunga.js` — tungskottet: stråle, fäste, konstraint, indragning, ritning.
- `insekter.js` — insekterna (flygbeteenden, fångst, sällsynta varianter).
- `dammen.js` — scen: vatten, ytvåg, näckrosblad, vass, grenar, stenar, stockar, tid på dagen,
  grodungarna.
- (ev. `hinder.js` — kotte/sköldpadda/fisk/vind/anka.)

**Ragdollen (`groda.js`):**
- 11 kroppar, alla i samma negativa `collisionFilter.group` (delarna krockar inte med varandra).
  Huvud + kropp tyngst; ben lätta men långa (grodans lår + underben + lång fot = Z-vikning).
- Leder = `Constraint` med `length: 0` mellan ankarpunkter (`pointA/pointB`) på grannarna,
  hög `stiffness`. **Matter har inga vinkelgränser** → egen gräns i `phys.beforeStep()`: läs
  relativ vinkel per led, klämt mot [min,max] med en mjuk korrigering av `angularVelocity`.
- **Muskler = PD mot en målpose** per led, i `beforeStep()` (EN gång per fast steg — aldrig per
  bildruta). Poser: `sitt` (hopkrupen, ben vikta), `hopp` (utsträckt), `sim` (bröstsimscykel),
  `slak` (styrka 0). Muskelstyrkan är ett tal 0…1 som faller till ~0 vid en hård smäll och
  kryper tillbaka på ~0,8–1,2 s → ragdoll-tumlet är äkta, återhämtningen syns.
- Uppräta sig: när grodan ligger stilla på blad/sten med fel sida upp, ett litet vridmoment på
  kroppen + `sitt`-posen (inte en teleport).
- Magen: en skalär `mage` 0…1 som växer per insekt och ritas som magens radie (kroppens
  kollisionsform får gärna vara oförändrad — det är bilden som blir rund).
- **Ritning:** varje kroppsdel är en egen `Container` som följer sin kropp (`link`), med
  ritad silhuett (inte ellips-klumpar): huvud med bulliga ögon ovanpå, bred mun-linje,
  näsborrar, prickig rygg, ljus buk, tåkuddar, simhud mellan tårna på bakfoten. Ögonen tittar
  mot tungans mål / närmaste insekt. Blinkar. **Egna fält får inte heta `_cx/_cy/_sx/_sy`.**
  Bågar via `bage()` ur `lib/form.js` (arc-fällan).

**Tungan (`tunga.js`):**
- Tryck → stråle från munnen mot tryckpunkten, max räckvidd ~420 px (klipp tryckpunkten till
  räckvidden). Första träff: `Matter.Query.ray` mot dammens kroppar + egen punkt-mot-segment-
  test mot insekter (insekter är INTE matter-kroppar — de är lätta, egenstyrda). Skottet tar
  ~0,12–0,18 s ut (tungan syns flyga, rep-ritning med klibbig tjock spets).
- **Fäste på en kropp:** `Constraint` mellan huvudets munpunkt och träffpunkten i kroppens
  lokala rum, låg `stiffness` (fjädrande), och längden dras in i `beforeStep()`. Matter fördelar
  kraften efter invers massa → **tung/statisk = grodan flyger dit, lätt = saken kommer**. Det är
  hela idén i ägarens ord ("tyngre saker med mer massa så åker grodan mot det fortare"), gratis ur
  fysiken. Ingen specialkod per föremålstyp.
- När längden nått sitt minimum: grodan **dinglar kvar** i tungan (svingar) tills nästa tryck.
  Tryck igen → släpp + nytt skott mot den nya punkten. Tryck på grodan medan den hänger →
  släpp + hopp. Auto-släpp efter ~6 s hängande (plask).
- **Insekt:** fastnar på spetsen, tungan dras in snabbt (~0,2 s), insekten följer spetsen in i
  munnen → GULP (kinderna puffas, halsen sväljer, magen växer, grodungarna kvackar).
- **Humla** är en insekt MED massa: den blir en kinematisk dragare som rycker i tungan några
  sekunder innan den ger upp och äts ("En humla! Den drar i tungan!").
- Tomt skott / bom: tungan snärtar ut till räckvidden och tillbaka med en slurp och en liten
  vippning — roligt, aldrig fel-ljud.
- **Munnen äter själv:** en insekt som kommer inom ~40 px från munnen medan grodan flyger äts
  (ägarens "flugor åker in i munnen och äts").

**Hopp:** tryck på grodan (träffyta ≥96 px + 24 px halo runt huvud+kropp — P0) → `hopp`-pose +
impuls på kropp/lår uppåt-framåt i blickriktningen. I vatten: ett simtag + mindre hopp.
Kan hoppa igen först när grodan nuddat något (inget oändligt lufthopp — men tungan funkar i
luften, och DET är kombinationen som ger kreativiteten).

**Dammen (`dammen.js`):** vattenyta ~y 540 över hela bredden (Flytvolym), 2–4 näckrosblad
(flytande, lätt sjunkande under grodans vikt — statiska plattor med fjädrande gupp duger om
flytande blir instabilt; MÄT), vass vid kanterna (tunn statisk kropp som tungan kan fastna i),
en trädgren överst (statisk, tungan fastnar → sving), 1–2 stenar (statiska, hårda — grodan
studsar, använd `studs` opt-in för studs mot statisk kropp), en flytande stock (tung, dynamisk).
Layout slumpas per omgång inom säkra zoner. Ytvåg vid plask: höjdfält (se `pruttbad` +
minnet "Ytvågor via höjdfält" — dämpning SIST, styr omritningen på rörelse).
Tid på dagen: `morgon` / `eftermiddag` / `skymning` (eldflugor lyser, himlen i toner).
Grodungarna: tre små ritade grodor på ett blad vid kanten (EJ i spelytans väg), kvackar i
stigande durskala per insekt (`audio.tone`, ingen UI-blipp), hejar vid tumling.

**Insekter (`insekter.js`):** egenstyrda (wander + sinusflykt, ingen matter). Typer: fluga ·
mygga · trollslända (pilar mellan punkter) · fjäril (fladdrig, högt) · humla (massa) · eldfluga
(skymning) · guldfluga (sällsynt, ~1 av 6 omgångar). Högst ~5 samtidigt. **Alltid minst en lugn
fluga inom räckhåll från grodans nuvarande läge** (autohjälp). Efter ≥4 bommar i rad: en tjock
fluga sjunker ner mot grodan. Surr: mjuk stämd ton-vibrato, inte ett klipp i loop (eller
`audio` loop som stoppas i destroy — se `stopAllLoops`).

**Motgång (tak = EN aktiv):** kotte (dynamisk kropp som faller från grenen), sköldpadda
(kinematisk, simmar längs ytan, hårt skal), fisk (hoppar i en båge ur vattnet), vindpust
(`setWind` kort). Anka = sällsynt wow, tungan kan fastna → vattenskidor. Schemat startar efter
2 insekter, var 10–15 s, och ALDRIG under finish.

**Mål + finish:** 8 insekter. Efter nr 6: "Magen är nästan full!". Nr 8 → spelet släpper
tungan, grodan landar/flyter, rund mage → jätterap (bubbelring som rullar över dammen, ljud:
stämd låg glissando + `pop`-bubblor) → magplask (våg) → grodkören (tre ungar + grodan) kvackar
en kort melodi i durskala → säg "Vilken mätt groda! Kvack kvack!" → `progress.complete()`.
Ny omgång: ny damm, ny tid på dagen, magen tillbaka.

**Kapa-mönster (exit-säkert + återspelnings-säkert):** `ctx.later` för alla fördröjningar ·
`_alive` · alla konstrainter tas bort före `phys.destroy()` · `killTweensOf` på VARJE innernod
som tweenas (barnbarn!) · repliker via `ctx.narTyst` (instruktion) eller `if (!voice.talar)`
(utrop). Spela TVÅ rundor otåligt i sond innan commit.

### 4b. Senare (inte i leverans 1)

- [Medium] Slangbella-hopp (dra från grodan, prickad bana via `predictTrajectory`).
- [Medium] Fler sällsynta händelser: regnskur (droppar som knuffar), näckrosblomma som öppnar
  sig, groda nummer två som tävlar om samma fluga (vänskapligt).
- [Deep] Bredare damm med `lib/kamera.js` (världsbredd 2400).

## 5. Status / loggar

`2026-09-23 · spec-kort godkänt, bygget beställt som nattpass · —`
