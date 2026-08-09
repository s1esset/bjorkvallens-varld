# Knuffa Tornet (`knuffa-tornet`)
> ⚙️ fysik · drag · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En glad himmel med sol och moln. En riktig kran står på planen: en mast + horisontell
skena med en stor gul **krankärra** som hänger en tung grå **rivningskula** i ett RIKTIGT
rep (matter.js `Constraint` = pendel). På en stenavsats till höger står ett torn av
färgglada klossar med en 👑-krona överst. Jag kan: **greppa kulan** och dra den bakåt/upp
längs pendelbanan (en prickad båge visar svinget, färgen går vit→gul→orange med kraften)
och släppa → gravitationen svingar ner den i tornet; **dra krankärran** i sidled för att
välja var kulan hänger; trycka **Tyngd** (Liten/Mellan/Stor — riktig matter-massa via
`Body.scale`) och **Byt rep** (Styvt = stel pendel / Elastiskt = töjbar slangbella med
startfart ∝ töjning). En grön mätare längst ner fylls per kloss som ramlar av avsatsen;
när alla ligger nere + kronan fallit → firande, stjärna, klistermärke och ett större torn.

Missar är mjuka: en tyst puff + gnistror. Efter 2 missar kommer en automatisk hjälp-sving
(styvt rep, stor kula, full spänning), efter 3 knuffas alla kvarvarande klossar av sig
själva — tornet faller ALLTID. Idle ~6s → röst-recue + kulan studsar.

**Funkar bra:** den riktiga pendel-/repfysiken känns trovärdig och rolig; tre genuina
kontroller (greppa+sikta, flytta kran, tyngd, rep) ger äkta agens över *hur och var*;
prickbågen och kraftfärgen lär ut kraft; no-fail-trappan är genomtänkt; exit-säkert.
En stark fysik-MVP som nyligen fått rep/pendel-uppgraderingen.

*(Skärmdump: kran med rep + grå kula uppe till vänster, 3-kloss-torn med krona på stenavsats, Tyngd/Byt rep-knappar nere.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver målet tydligt: ge barnet **mer makt över hur OCH var kulan faller** —
inte bara "släpp och titta". Därför tre lager av kontroll (sikt-drag, kran-position, tyngd,
rep-typ) ovanpå en trovärdig matter.js-pendel, så samma scen kan lösas på många sätt. Den
pedagogiska kärnan är orsak-verkan i fysik: tyngre kula → mer rörelsemängd → fler klossar;
elastiskt rep → slangbella → annan bana. No-fail-trappan (puff → hjälp-sving → knuffa allt)
garanterar succé utan att straffa. Krock-ljuden togs medvetet bort på begäran för att hålla
känslan mjuk. Allt ritas programmatiskt (Pixi + emoji), inga externa assets.

## 3. Vad gör det lättjefullt / tunt

Trots stark fysik finns billiga drag en kräsen spelare/förälder märker:

- **Smällen är stum.** En rivningskula som krossar ett torn är *hela* fantasin — men
  `_onCollision` spelar med flit INGET slagljud (bara en tyst puff var 0,12s). Det mest
  tillfredsställande ögonblicket i spelet saknar sitt "KRASCH". Mjukt ≠ ljudlöst; en duns
  kan vara rund och snäll utan att vara en buzzer.
- **Hjälp-trappan spelar banan åt en.** Vid 2 missar svingar spelet automatiskt, vid 3
  flyger alla klossar av sig själva (`_knockAllOff`). Garantin är rätt, men ett barn som
  bara tittar får full vinst på ~10s utan att ha knuffat något — agensen som planen hyllar
  kan kringgås helt passivt.
- **Klossarna är döda rekvisita.** Det är färgade rundade rektanglar utan ansikte, utan
  reaktion, utan ljud. De "lever" inte (vinglar inte när kulan närmar sig, ler inte, piper
  inte när de ramlar). Tornet har ingen karaktär att bry sig om — bara kronan är speciell.
- **Tornet är en enkel stapel.** `_layoutFor` ger rader×kolumner med stigande täthet — men
  alltid samma rektangulära mur. Inga former, inga specialklossar (tung sockel, studsig,
  ömtålig glaskloss, fastlimmad), ingen variation som gör att *valet* av tyngd/rep spelar
  olika roll bana för bana.
- **Mätaren är abstrakt.** En grön stapel som fylls säger lite för en 2-åring. Ingen
  räkning, ingen "X klossar kvar", ingen figur som reagerar när den fylls.
- **Scenen är statisk tapet.** Sol + moln rör sig inte, ingen publik, ingen maskot. Vid
  vinst kommer den *generiska* konfettin (samma som alla spel) — ingen spel-specifik finish
  (kran som bockar, arbetar-Bobo som jublar, dammoln när muren rasar).
- **Ljudpaletten är tunn.** `whoosh` vid släpp, `plopp` vid kloss-nere (strypt), `magi`
  vid krona/hjälp. Ingen stigande kombo-ton när flera klossar ramlar i rad, inget
  rep-spänn-ljud när man drar, ingen "rasande mur"-kaskad.

Kort sagt: fysiken är äkta och kontrollerna rika, men **slaget är ljudlöst, klossarna
är själlösa, och hjälpen kan spela klart åt barnet**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Ge tillbaka en *snäll* smäll.** Lägg ett mjukt, rundat duns-/träklots-ljud vid
  kraftig kula-träffar-kloss i `_onCollision` (skala volym med `pair.speed`, behåll
  throttlen). Det är ingen buzzer — det är belöningen för en bra sving. Lägg en liten
  skärm-mikroskak som skalar med slagkraft.
- **[Medium] Låt hjälpen *bjuda in* istället för att spela klart.** Innan auto-svinget:
  flytta kulan till perfekt läge och låt den **blinka/andas "släpp mig!"** så barnet gör
  sista trycket självt. Auto-knuffa-allt blir då sista, sällsynta utvägen — inte ett
  resultat passivitet ger på 10s.
- **[Deep] Special-klossar som gör tyngd/rep meningsfullt.** Tung sockelkloss (kräver Stor
  kula), studsig kloss (elastiskt rep studsar vidare), staplad "ömtålig" glaskloss som
  spricker i gnistror. Då blir *valet* av verktyg ett pussel, inte bara smak.

### Variation & överraskning
- **[Quick] Tornform varierar per nivå.** Pyramid, bro, två torn med glapp, krona längst
  bak — `_layoutFor` returnerar en form-mall istället för bara rader×kolumner. Tur 2 ≠ tur 1.
- **[Medium] Gömda fynd i tornet.** Var 3:e bana göms en ⭐/🎈 bakom en kloss som flyger
  upp när den ramlar — en liten "en till!"-morot.

### Juice
- **[Quick] Klossarna lever inför slaget.** När kulan är nära: närmsta klossar **vinglar
  lätt** (förväntan). När en ramlar: snabb squash + en liten "aj/hoppsan"-piip-emoji.
- **[Quick] Rasande-mur-kaskad.** När ≥3 klossar ramlar inom kort: stigande pling-kaskad +
  ett litet dammoln (`puff`) vid avsatsens kant. Belönar en fet sving.
- **[Quick] Rep-spänn-feedback.** Mjukt stigande "gnissel/spänn"-ljud medan man drar kulan
  bakåt (tonhöjd ∝ kraft), släpp-whoosh som idag.

### Progression
- **[Medium] Konkret mål-räknare.** Byt/komplettera den abstrakta stapeln mot små
  kloss-ikoner som tänds (som `valpens-bajs` slot-prickar) eller "klossar kvar: 3" i
  ikon-form — läs-fritt men begripligt.

### Karaktär & berättelse
- **[Deep] En anledning att riva.** En liten arbetar-Bobo i hjälm som väntar, hejar vid
  bra sving och jublar/bockar med kranen vid vinst — ersätt den generiska konfettin med en
  spel-specifik finish (muren rasar i dammoln, Bobo planterar en flagga på rivningsplatsen).
- **[Quick] Ge klossarna ansikten.** Två prickögon + leende på varje kloss gör tornet till
  "gänget" man knuffar — direkt mer charm, noll fysik-risk.

### Ljud
- **[Quick] Riktiga klipp via SFX-pipelinen** ([[real-audio-sfx]]): trä-duns, sten-skrap,
  rep-spänn, mur-ras. Idag är allt procedurella blippar.
- **[Quick] Variera vinst-stinget** + lägg en lugn bakgrunds-ambient (fågel/vind) så scenen
  inte är ljudtyst mellan svingar.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad mot rep/pendel-bygget i commit 33178c3). Inga
  kodändringar i denna omgång.
- Rekommenderad första-omgång: **[Quick] snäll smäll + skärmskak + klossar med ansikten/
  vinglar** — återinför spelets saknade kärn-belöning och ger tornet själ till låg risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Återinförde en *snäll* smäll i
  `_onCollision`: en mjuk, rundad träduns via `audio.tone` (sine 150→78 Hz) vars volym
  skalar med slagfarten, plus en mjuk skärm-mikroskak (`_screenShake` → exit-säkra
  `shake` på scenroten, intensitet ∝ kraft, kappad ≤10px) — behåller 0,12s-strypningen så
  inget distar. Gav klossarna själ: `makeBlock` ritar nu ett glatt ansikte (två prickögon
  + leende); nya `_spookBlocks` låter närmaste stående kloss darra av förväntan (SCALE-tween
  — fysik-länken rör bara position/rotation) när kulan svingar nära; `_onClear` ger en snabb
  squash + en liten "hoppsan"-emoji (strypt som plopp). Allt exit-säkert (shake-tween dödas
  i `destroy`, scale-tweens städas via befintlig `killTweensOf` i `_clearTower`/`destroy`).
- 2026-08-04: **Andra omgången** (errorCount 0) — tre layoutbuggar och P0 ASSETS.
  - **Layoutbugg 1:** kloss-mätaren låg på `y = height − 40`, alltså **bakom avsatsen** och
    delvis under de två stora knapparna — den var i praktiken osynlig. Flyttad till den fria
    toppmitten (y=64) mellan hem- och ljudknappen.
  - **Layoutbugg 2:** etiketterna "Mellan"/"Styvt" satt UNDER knapparna på y=700, där
    avsatsen täckte den högra helt. De sitter nu ovanför knapparna (y=546).
  - **Layoutbugg 3:** etiketterna var mörk text direkt mot avsatsens bruna sten och gick inte
    att läsa — de har nu en ljus pill bakom sig.
  - **P0 ASSETS:** båda kronorna (tornets topp + mätarens ikon) ritas nu med spetsar, band och
    ädelstenar i stället för 👑-emoji.
  - **Avsatsen** var en tom brun platta över en fjärdedel av skärmen; den har nu murade
    stenblock och gräs som växer över kanten.
- 2026-08-06: **[Deep] En anledning att riva** (spår "20 spel från 🔧 till ✅").
  - **Arbetar-Bobo med bygghjälm** står nu på marken och väntar på rivningen (gate-punkt 4).
    Han **hejar vid varje nedknuffad kloss** (`_workerCheer`) och **jublar stort vid vinst**,
    så firandet får någon som bryr sig i stället för att bara vara konfetti. Hjälmen ritas
    ovanpå `makeBobo` ur `lib/figurer.js`.
  - **Placeringen krävde två försök.** x=150 lade honom helt bakom Tyngd-knappen (centrum
    150,624) — han var praktiskt taget osynlig och det syntes bara i skärmdumpen. x=330
    ligger mitt emellan knappen och kranmasten (x≈515). Klosslagret ritas efter honom, så en
    kloss som ramlar dit landar framför honom.
  - Exit-säkert: `_workerIdle` + skal-tween dödas i `destroy`.
  - Kvar sedan tidigare: [Deep] specialklossar (tung sockel / studsig / ömtålig) som gör
    valet av tyngd och rep till ett pussel — den punkten hör till variations-högen.
- 2026-08-07: **Variation & agens** (hög 2, spåret "20 spel från 🔧 till ✅") — status 🔧→✅.
  Fyra §4-punkter avbockade: *hjälpen bjuder in*, *tornform per nivå*, *specialklossar*,
  *konkret mål-räknare*, plus den spel-specifika finishen ur *En anledning att riva*.
  - **[Medium] Hjälpen bjuder in i stället för att spela klart.** Efter 2 missar ställer
    spelet kulan i perfekt läge (styvt rep, stor kula, kranen **siktad på närmaste
    kvarvarande kloss**) och låter den blinka i en gul ring — barnet gör sista
    handgreppet självt. Först efter 7 s utan handling svingar spelet (`_autoAssistSwing`),
    och `_knockAllOff` är sista utvägen vid 3 missar. Vinsten förblir barnets.
  - **[Quick] Fem tornformer roterar per nivå** (`torn · trappa · port · pyramid · dubbel`)
    och växer på höjden först när alla visats en gång. `_layoutFor` returnerar celler i
    stället för rader×kolumner. Port-formen har en bro som vilar 24 px på varje pelare.
  - **[Deep] Specialklossar** med egen silhuett och eget uttryck: **sten** (grå, sprucken,
    bistra ögonbryn, 2,2× massa — den kloss tyngdknappen finns till för), **studs**
    (grönt gummi, restitution 0,72), **glas** (genomskinlig, spricker i gnistror vid en
    hård träff och räknas som nedknuffad). Står bara sten kvar säger spelet *"Prova den
    stora kulan!"* och puffar på tyngdknappen — hjälp som pekar, inte tar över.
  - **[Medium] Mätaren är nu en prick per kloss** (sista pricken är kronan) uppe till
    vänster. Varje kloss äger sin prick, så räkningen stämmer även när kronan ramlar
    först. Placering nr 3: toppmitten var upptagen av krankärran som åker på skenan.
  - **[Deep] Spel-specifik finish:** dammoln rullar längs den tomma avsatsen → en flagga
    hissas på rivningsplatsen till en durtreklang (C–E–G) → arbetar-Bobo jublar → först
    därefter konfetti. (Flaggan är hög med flit — en kort flagga hamnade bakom kulan.)
  - **Balansen är mätt, inte gissad** (`scripts/_tornprobe.mjs` spelar varje nivå med full
    kraft utan att flytta kranen). Fem fynd som inget grönt test hade visat:
    1. **Repets längd var hela balansen.** 330 px lade kulans underkant 24 px OVANFÖR
       understa klossraden — ett fullt sving nöp bara toppen. 348 sveper genom bottenraden
       och halverade antalet svingar per nivå.
    2. **Friktion 0,7/1,4 limmade ihop stapeln** så tornet GLED 80 px i sidled per sving i
       stället för att rasa. Nu 0,4/0,7 (stenen behåller sitt grepp).
    3. **Springan mellan avsatsen (1180) och skärmkanten var exakt en kloss bred** — en
       kloss kilade fast där på y≈491 och räknades aldrig som nere. Målet mäts nu i x
       ("av avsatsen"), inte bara i fallhöjd, och avsatsen slutar vid 1090.
    4. **En hjälp som siktar på den bortersta klossen flyttar kranen och lämnar den där**,
       så varje följande sving svepte förbi resten av tornet (nivå 1: 4 → 8 svingar).
    5. **`_drawChain` måste ritas SIST i bildrutan** — `_freezeBall` teleporterar kulan
       efter att repet ritats, vilket frös fast på skärmdumpen som ett rep hängande i
       tomma luften bredvid kulan.
    Utfall: nivå 0–13 klaras på 2–8 svingar, inget dödläge, garantin behövs sällan.
  - **P0-fix på vägen:** fältets "tryck bredvid" svarade på `pointertap` (alltså vid
    släpp) — harnessen mätte 262 ms. Nu `pointerdown`.
  - **Kritikerns två fynd, båda åtgärdade:** (1) rivningskulan lämnades hängande där
    sista svinget stannade den — ofta rakt framför den nyresta flaggan; kulan och repet
    tonar nu bort när finishen börjar och kommer tillbaka med nästa torn. (2) Nedknuffade
    klossar togs aldrig ur fysiken, gled tvärs över golvet och blev liggande **ovanpå
    "Byt rep"-knappen**; en sopare i tickern (`_sweepCleared`, tak två klossar per
    bildruta) plockar bort dem 0,8 s efter fallet. Kritikerns tredje punkt — mätaren blev
    18 px risgryn vid 13 klossar — löstes med två rader över åtta klossar.
  - **Medvetet kvar:** kontrollerna låses INTE under den blinkande inbjudan. Ett barn som
    trycker på Tyngd eller Byt rep där använder spelet; kulan står kvar spänd och redo.
  - **Känd signal:** loggen flaggar ibland `tween-per-ruta` (~125) i bildrutan där vinsten
    infaller. Det är firandets engångsskur (rivningsdamm + flagga + konfetti + skalets
    stjärna), inte en tween per bildruta. Skuren är redan gles-lagd; resten är avsiktlig.
  - Kvar till en senare omgång: gömda fynd bakom en kloss, rasande-mur-kaskad med stigande
    pling, rep-spänn-ljud, riktiga SFX-klipp (MOSS) och en lugn bakgrunds-ambient.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): bollen ritas av delade `makeBoll` (`lib/foremal.js`); kronan fick `topLightFill` på plats. Kronan delades medvetet INTE med `klappa-mullvaden`s: de har olika proportioner och en gemensam version hade krävt sex parametrar för att bevara båda.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
