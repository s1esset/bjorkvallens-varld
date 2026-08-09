# Plantera Frön (`plantera-fron`)
> 🌿 drag · drag · 2–4 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En lugn trädgårdsscen: ljusblå himmel med sol och mjuka moln överst, en bred brun
jordrabatt nederst. I "fröförrådet" uppe (bakom en svag vit panel) ligger 1–3 stora
🌰-frön i vita cirkelbrickor; nere i jorden gapar lika många mörka jordhål. Jag **drar**
ett frö ner i ett hål (eller tap-tap, via DragController) → "pop", en liten jordhög
poppar fram, en brun puff, fröet tonar bort: "Plopp!".

När allt är sått byter spelet fas: en programritad **vattenkanna** studsar in uppe i
mitten. Jag drar kannan över en planta och **håller kvar** → kannan lutar (`rotation -0.32`),
blå droppar regnar ur pipen och plantan **växer kontinuerligt** under pipen: grodd → stjälk →
blad → knopp → blomma (`POUR_MS = 2600` ms sammanhängande vattning per planta). När en planta
blommar: "pling" + gnistror + en liten studs. Alla blommor ute → 🦋 fjärilar fladdrar in över
scenen + delat firande + stjärna + klistermärke, och en ny (ev. större) runda startar.
Nivåtrappa: `1 + floor(level/2)` hål, klamrat till 3.

**Funkar bra:** två tydliga, lugna faser (så → vattna) med en *verklig* kontroll i mitten —
att hålla kannan över rätt planta och se den växa i realtid är taktilt och belönande. Den
ticker-drivna dropppartikeln är exit-säker (ren positions-integration, ingen gsap). Vattnet
växer *alltid* — inget felsteg. Kontinuerlig tillväxt (`_renderPlant(grow 0→1)`) ger en
mjuk, organisk känsla snarare än hoppiga steg. Sol/moln/fjärilar ger scenen liv.

*(Skärmdump: 1 frö i förrådet, 1 jordhål i rabatten — nivå 0, sådd-fasen.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver en "lugn dra + vattna-lek" i tre steg utan press: så, vattna, klart —
med uttrycklig regel att vattnet *alltid* växer och att en mjuk auto-hjälp vattnar lite om
barnet pausar, "så det alltid blir klart". Designtanken är dubbel pedagogik: dels finmotorik
(dra frö i hål, styra kannan), dels en första känsla för orsak-verkan över *tid* (vatten →
växt) som de flesta tryck-spel saknar. Två faser ger variation inom en runda och en naturlig
berättelsebåge (frö → blomma) som passar 2–4 år. Fjärilarna är "skörden" — en mjuk final.

## 3. Vad gör det lättjefullt / tunt

- **Allt-eller-inget-tillväxt utan platsval.** Vattenfasen letar bara "närmaste ovattnade
  planta vars hål ligger nedanför pipen" (`_pourTick`) och pumpar `grow`. Resultatet: man
  håller kannan ungefär över raden och plantorna fyller på i tur och ordning. Det finns inget
  *val* som påverkar utfallet — ingen planta kan bli vackrare/annorlunda, ingen får för mycket
  eller för lite. Kärnloopen är "håll kvar tills allt blommar".
- **Auto-hjälpen tar över för snabbt och osynligt.** Efter bara 6s idle vattnar `_autoHelp`
  `+0.22 grow` på minst vuxna plantan *och* upprepas var 6:e sekund — ett barn som tittar på
  ser plantorna växa "av sig själva". Tröskeln är låg och hjälpen kraftig nog att spela klart
  banan utan barnet.
- **Fröna är identiska och hålen tomma.** Varje runda är samma 🌰 → samma hål → samma blomma
  ur en liten slumppool (`FLOWERS`). Ingen variation i vad man planterar (morötter? träd?
  grönsaker?), ingen i jorden (stenar, maskar). Sådd-fasen är ren transport: dra n frön till
  n hål, klart.
- **Blomman "ploppar" bara fram.** När `grow` når 1 körs `pling` + `sparkle` + `pop` — samma
  generiska gnistra som varje annat spel. Ingen blom-specifik utveckling (knopp som spricker
  upp kronblad ett i taget), ingen doft-/pollen-känsla, ingen variation i blomstorlek.
- **Inert scen.** Sol och moln rör sig inte, det finns inga bin/maskar/fåglar förrän
  fjärilarna kommer i finalen. Jorden reagerar inte på vatten (ingen mörknande fuktfläck).
  Inget liv mellan handlingarna.
- **Ljudet är tunt och TTS-lutat.** "Plopp!" och "Vattna blommorna!" sägs av rösten i stället
  för riktiga klipp; vattnandet är ett enda `whoosh` vid grepp + tystnad sedan. Inget
  porlande/rinnande vattenljud medan man häller, inget jord-"pluff", ingen stigande ton när
  en blomma slår ut.
- **Belöningen är generisk.** Fjärilar + delad konfetti + stjärna. `custom.flowers` räknas upp
  men *visas aldrig* — ingen trädgård som växer mellan rundor, inget galleri av odlade blommor,
  ingen anledning att minnas vad man planterat.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Platsval som spelar roll i sådd-fasen.** Ge fröna olika *sorter* (🌻 sol, 🌷 tulpan,
  🥕 morot) och hålen små ikon-ledtrådar — eller låt barnet välja *var* en blomma ska stå.
  Inför ett enkelt "rätt jord för rätt frö" (sol vid solen, morot djupt) utan fel-läge: fel
  plats ger ändå en blomma men "rätt" plats ger en extra gnista. Sätter ett *val* i loopen.
- **[Medium] Vattning med riktning/mängd.** Låt `grow`-takten bero på hur nära pipen är plantan
  (en "söt fläck") och visa en liten vatten-mätare per planta som fylls — så att rikta kannan
  blir en skicklighet man *känner*, inte bara "håll kvar". Fortfarande no-fail (för lite vatten
  = växer långsammare, aldrig dör).
- **[Deep] Sol & vatten som två behov.** Vissa plantor vill ha mer sol (dra ett moln undan),
  andra mer vatten. Två lätta spakar → utfallet (blomstorlek/färg) varierar med barnets val.

### Variation & överraskning
- **[Quick] Variera blommor rejält per planta** (redan slumpat ur `FLOWERS`/`BUD_COLORS`) men
  lägg till sällsynta överraskningar: ibland växer en **jättesolros**, ett **litet träd** eller
  en blomma som en 🐝/🦋 genast landar på.
- **[Quick] Liv i jorden vid sådd:** en mask 🪱 som tittar upp ur ett hål, en sten man flyttar,
  en fjäril som redan sitter — små variationer så ingen runda ser exakt likadan ut.
- **[Medium] Vädervariation per runda:** ett moln som ger gratis regn, en regnbåge efter
  vattningen, kvällsljus där blommorna lyser. Byt bakgrundston mjukt mellan rundor.

### Juice
- **[Quick] Riktigt vatten-ljud.** Knyt an till SFX-pipelinen ([[real-audio-sfx]]): ett mjukt
  porlande/rinnande loop medan kannan hålls, ett "pluff" när fröet landar i jorden, ett
  stigande "pling" när en blomma slår ut. Ersätt TTS-"Plopp!".
- **[Quick] Fuktig jord:** måla en mörkare, växande fuktfläck runt plantan medan man vattnar,
  och låt jordhögen "andas" lite. Droppar som studsar ger redan bra känsla — lägg en liten
  vattenpöl-glimt där de landar.
- **[Medium] Blomman slår ut steg för steg.** I stället för en `pop` på hela blomman: låt
  kronbladen veckla ut sig ett i taget med back.out, knoppen spricka, en liten pollen-pluff.
  Det är spelets klimax — gör det till ett litet skådespel.

### Progression
- **[Medium] En trädgård som minns.** Visa `custom.flowers` som en faktisk **rabatt** längst ner
  som fylls med de blommor man odlat över tur (eller på en "min trädgård"-skärm). Ger en
  samlar-känsla och en anledning att komma tillbaka.
- **[Quick] Mjuka upp auto-hjälpen.** Höj idle-tröskeln (t.ex. 9–10s), låt första cue vara
  *bara* en vinkande kanna + röst ("Håll kannan över blomman!"), och låt själva
  auto-vattningen kicka in *sent* och *synligt* ("Jag hjälper lite!") med svagare dos, så
  barnets hållande faktiskt avgör.

### Karaktär & berättelse
- **[Deep] En trädgårdsmästare/Bobo i scenen.** En liten figur (Bobo eller en mullvad) som
  pekar på nästa hål i sådd-fasen, kikar fram när en blomma slår ut och i finalen "luktar" på
  blommorna. Ger fjärilarnas ankomst en mottagare och firandet en egen karaktär i stället för
  generisk konfetti.

### Ljud
- **[Quick] Verifiera varierat vinst-sting** vid `complete()` och lägg en lugn, låg
  trädgårds-ambient (fågelkvitter, lätt vind) som botten — passar spelets stillsamma ton.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + huvudlöst speltest (errorCount 0; nivå 0 = 1 frö/
  1 hål, dra-i-hål verifierad). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] riktigt vatten-/blom-ljud + steg-för-steg-blomning +
  mjukare auto-hjälp** — störst lyft för minst risk, och adresserar de tre tydligaste
  "lättjefulla" dragen (tunt ljud, generisk blom-pop, för ivrig auto-hjälp).
- 2026-07-02: **Första-omgång genomförd.** Kärnan (så → vattenkanna dyker upp → dra + håll för
  att vattna → plantan växer kontinuerligt → blomning → fjärilar → firande) var redan byggd av
  den avbrutna passagen; denna omgång slutförde de kvarvarande rekommendationerna + snyggade
  växten:
  - **[Quick] Mjukare, TRAPPAD auto-hjälp** (`_autoHelp` + `_helpStage`): scaffoldet fanns men
    var oanvänt — hjälpen vattnade förr direkt vid varje idle. Nu: idle-tröskeln höjd 6 → **9s**,
    och första idle-stöten **vinkar bara kannan + röst** ("Håll kannan över blomman!") utan att
    vattna — barnet får chansen. Först vid **stadie ≥2** vattnar auto-hjälpen på riktigt, synligt
    och uttalat ("Jag hjälper till lite!") med en **svagare dos** (0.22 → 0.16). `_helpStage`
    nollställs så fort barnet greppar kannan, så barnets eget hållande avgör — men det blir
    alltid klart (aldrig ett felsteg).
  - **[Quick] Organisk växt** (`_renderPlant`): stjälk/blad/knopp-faserna smoothstep:as
    (`smooth()`) så plantan skjuter upp med mjuk start/stopp i stället för linjärt; knoppen når
    ändå FULL vid grow=1 (`smooth(1)=1`) så blomningens tajming är oförändrad.
  - Redan på plats sedan tidigare (bekräftat): riktigt "plopp"-klipp vid sådd, porlande
    vatten-ton medan man vattnar, växande/mörknande fuktfläck, och steg-för-steg-blomning
    (knoppen spricker → kronbladen vecklar ut ett i taget med stigande pling → blomman poppar in
    med magi-klipp + gnistror + pollen-pluff).
  - Test: `errorCount 0` (statisk + drag-test som sår ett frö → vattenkannan dyker upp).
  - **Deferred:** [Medium] trädgård som minns (`custom.flowers` som faktisk rabatt/samlarskärm);
    [Deep] trädgårdsmästare/Bobo som pekar + luktar i finalen; [Quick] lugn trädgårds-ambient
    (fågelkvitter/vind — central ljud-hantering).
</content>
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): **jordprofilen fick en lodrät gradient** (ljusare vid ytan, mörkare på djupet). Den var 301 300 px i en enda brun ton — den största enfärgade ytan i hela appen (uppmätt med nya `scripts/_plattprobe.mjs`), och en jordprofil sedd i genomskärning är just det som INTE ska vara enfärgad.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): himmel/jord breddade (jordgradienten bara i sidled — bbox-höjden styr mappningen — plus remsa under i slutton), gräskanten fortsätter deterministiskt i bleed-zonerna. Testad båda viewports: 0 fel.
