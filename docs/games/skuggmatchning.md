# Skuggmatchning (`skuggmatchning`)
> 🌑 pussel · drag · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En mjuk äng (sol, moln, kullar, gräs via `createScene('meadow')`). Upptill en rad
färgglada föremål (🐶🦋🐸🍌…), nedtill på gräset en rad **svarta silhuetter** — samma
föremål tintade helt svarta, *utan* platta eller ring bakom (silhuetten ÄR målet). Varje
föremål har en liten markskugga under sig. Jag **drar** ett föremål → det lyfter (`body.y -20`),
markskuggan växer och tonar (känns lyft). Släpper jag det på rätt silhuett: "match"-ljud +
**föremålets svenska namn sägs** ("Fjäril!"), en varm ring + gnistror, slotten tänds i ett
gult sken, och den svarta silhuetten **blommar ut i full färg** (`back.out(2.2)`) medan det
dragna föremålet poppar och tonar bort. Fel silhuett: mjuk vingel + liten studs + ibland en
positiv röst-cue ("Prova en annan skugga!"), snäpper hem (DragController).

Alla skuggor fyllda → mild skakning + delat firande + stjärna + klistermärke, och en ny,
något större runda. Djup: `2 → 6` föremål, figurerna krymper (`scale` 1 → 0.74), bred pool
(djur, frukt, fordon, verktyg, former) med anti-upprepning (`_recent`). Idle ~6s →
instruktion upprepas + ett kvarvarande föremål "andas".

**Funkar bra:** den svarta-silhuett-mot-färg-morfen är *exakt rätt* feedback — barnet ser sin
handling förvandla en skugge till en levande figur. Lyft-känslan (markskugga som växer) är en
fin liten detalj. Bred pool + anti-upprepning gör rundorna fräscha. Att namnet sägs vid rätt
ger ordinlärning utan press. Skuggor och föremål blandas oberoende → äkta matchningsuppgift.
Allt exit-säkert (omsorgsfull tween-städning per objekt).

*(Skärmdump: groda + fjäril upptill, deras svarta silhuetter nedtill — en ren 2-föremåls-runda.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: "dra varje sak till sin svarta skugga" — ett klassiskt form-/igenkännings-pussel.
Det uttalade greppet (efter en tidigare fix) är att ta bort ikon-containrar/plattor så att
*silhuetten själv* är målet — ren ägaråterkoppling där barnet matchar form mot form, inte
"lägg kortet på rutan". Den pedagogiska kärnan är visuell diskriminering (känna igen en sak på
dess kontur) + ordförråd (namnet sägs). Färg-blomningen valdes som belöning för att den
*visar* matchningen: skugga → färg = "du hittade rätt". Djuptrappan 2→6 + krympande figurer
håller det utmanande utan att bli svårt.

## 3. Vad gör det lättjefullt / tunt

- **En-utfalls-match: varje rätt gör exakt samma sak.** Oavsett om det är en hund eller en
  raket: samma ring, samma gnistra, samma morf, samma `pop`+tona-bort. Föremålet och dess
  skugga har ingen egen personlighet — en hund skäller inte, en bil tutar inte, ett bi surrar
  inte när det landar i sin skugga. Belöningen är frikopplad från *vad* man matchade.
- **Matchningen är ren formigenkänning utan resonemang.** Eftersom silhuetten är samma emoji
  bara svart, är "matchen" trivial pixel-likhet — barnet behöver inte tänka "vad är detta för
  djur", bara para ihop två identiska former. Det är enkelt (bra för 2-åringar) men tunt för
  en 5-åring: ingen kategorisering, ingen "vilken skugga hör till vilket djur"-lurig vridning.
- **Skuggorna är statiska brickor.** De ligger blickstilla på en rad tills de fylls. De rör
  sig inte, byter inte plats, gömmer sig inte — så fort föremålet lyfts är målet uppenbart
  (samma form rakt under). Ingen rumslig utmaning, ingen blick-följning.
- **Ljudet är tunt.** 'pop' vid lyft, 'match' vid rätt, 'soft' vid fel + TTS-namn. Inga
  föremåls-specifika ljud (djurläten finns redan i `audio.sample('djur_…')`!), ingen stigande
  ton när raden fylls, ingen "klick"-känsla när skuggan snäpper.
- **Ingen karaktär eller värld.** Ängen är vacker men tom — inga djur som strövar, ingen
  maskot som tar emot de matchade sakerna. De färglagda figurerna sitter bara kvar i sina
  skuggor; inget händer med dem.
- **Generisk final.** `shake` + delad konfetti + stjärna. Inget firande som knyter an till
  *vad* man samlat (en hel äng med djur som vaknar, en parad av de matchade sakerna).

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Skuggorna lever.** Låt silhuetterna sakta vandra/guppa på gräset, eller byta plats
  en gång efter att föremålen visats — så att matcha blir en liten blick-följning, inte
  "föremålet ligger rakt ovanför sin skugga". Behåll generösa hit-radier (`hitR`) så små
  fingrar klarar det.
- **[Deep] Kategori-läge för de äldre.** Från en högre nivå: matcha på *typ* i stället för exakt
  form — t.ex. en silhuett av "ett djur" som accepterar valfritt djur, eller para frukt med en
  fruktkorgs-skugga. Lägger ett verkligt val/resonemang ovanpå formigenkänningen, fortfarande
  no-fail.

### Variation & överraskning
- **[Quick] Föremåls-reaktion vid match.** Låt den framblommade figuren göra något eget:
  grodan hoppar till, bilen rullar en bit, fjärilen fladdrar upp ett ögonblick, stjärnan
  snurrar. Liten per-objekt-animation (tabell key → effekt) bryter en-utfalls-känslan direkt.
- **[Quick] Sällsynt "gyllene skugga".** En skimrande skugga då och då som ger extra gnistor +
  en glad röst — ett litet wow utan att ändra reglerna.

### Juice
- **[Quick] Riktiga föremåls-ljud.** `audio.sample('djur_hund')` finns redan — spela djurläte
  vid rätt djur, bil-tut vid bil, surr vid bi (falla tillbaka på namn-TTS om inget klipp). En
  [Quick]-vinst när SFX-pipelinen kör ([[real-audio-sfx]]).
- **[Quick] Stigande ton när raden fylls** (komboklättring), och ett tydligt "snäpp"-ljud när
  silhuetten morfar — gör förvandlingen ännu mer tillfredsställande.

### Progression
- **[Medium] Ängen fylls över rundor.** Låt matchade djur/saker *bli kvar* i en liten samling
  längst ner (eller springa ut på ängen) i stället för att tona bort — en synlig "så mycket
  har jag hittat"-känsla mellan rundor.

### Karaktär & berättelse
- **[Deep] En mottagar-maskot.** Bobo (eller en glad sol) som sitter på ängen, pekar på en
  skugga som ledtråd, och vid varje match "väcker" figuren till liv med en glad reaktion.
  Finalen: alla figurer + Bobo dansar tillsammans i stället för generisk konfetti. Ger en
  anledning att bry sig och en spel-specifik vinst.

### Ljud
- **[Quick] Verifiera varierat vinst-sting** vid `complete()` och lägg en mjuk äng-ambient
  (fågel/insekt-sus) som lugn botten.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + huvudlöst speltest (errorCount 0; ren 2-föremåls-
  runda med tydliga svarta silhuetter verifierad). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] per-objekt-reaktion vid match + riktiga föremåls-/
  djurljud** — slår direkt mot den tydligaste svagheten (en-utfalls-match) och utnyttjar redan
  byggd `audio.sample`-infrastruktur.
- 2026-07-01: **Första-omgång genomförd** — bröt "en-utfalls-matchen" med föremåls-EGEN
  återkoppling i både bild och ljud:
  - **[Quick] Per-objekt-reaktion vid match** (`REACTION`-tabell + `_reactFigure`): den
    framblommade figuren gör nu något eget i sin skugg-slott — grodan/kaninen **hoppar**
    (dubbelstuds), fordon (bil/buss/traktor/tåg/cykel) **rullar** (x-skift + rotation),
    flygare (bi/fjäril/fågel/flygplan/raket/ballong) **fladdrar upp**, stjärna/sol/måne/boll/
    klocka **snurrar** ett varv, allt annat får en glad **squish**-studs. Rör bara `sh._color`
    (y/x/rotation eller skala) → exit-säkert via befintliga `_killShadowTweens` (killTweensOf
    på `sh._color` + `sh._color.scale`, samma mönster som morfen). Squish-delayen (0.44s) ligger
    efter blomningens skal-tween (0.4s) så de inte krockar.
  - **[Quick] Riktiga föremåls-/djurljud** (`SAMPLE`-tabell + `_objectSound`): hund/katt/gris/
    groda/bi/uggla spelar sitt riktiga `audio.sample('djur_…')`-klipp (faller tillbaka på
    'match' + talat namn om klippet ännu inte avkodats). Fordon får passande syntes via
    `audio.tone`/`sfx` (tut-tut för bil/buss/traktor, tåg-vissla, cykel-ringklocka, whoosh för
    flygplan/raket, mistlur för båt) och fågel ett kvitter. Namnet sägs alltid (ordinlärning).
  - **[Quick] Stigande kombo-ton + "snäpp"** (`_matchSound`): ett kort square-wave-"snäpp"
    klingar när silhuetten morfar, och en pentatonisk kombo-ton klättrar (`523·2^(semi/12)`)
    för varje matchning i rundan — raden som fylls "sjunger uppåt".
  - Test: `errorCount 0` (statisk + drag-match); skärmdump bekräftar bloom (svart silhuett →
    full färg) + rullande/snurrande figur i slotten.
  - **Deferred:** [Quick] gyllene skugga; [Medium] skuggorna lever (vandra/byta plats);
    [Medium] ängen fylls över rundor (samlade figurer stannar kvar); [Deep] kategori-läge;
    [Deep] mottagar-maskot (Bobo); [Quick] äng-ambient (kräver ny ljud-loop → central hantering).
</content>
