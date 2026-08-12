# Klä efter Vädret (`kla-efter-vadret`)
> 🔤 pedagogiskt · mixed · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

Hela skärmen tonas mjukt i väderfärg (varmt gult för sol, dimblått för regn, ljust
för snö). Uppe en stor pulserande vädersymbol (☀️/🌧️/❄️) med glow; vid regn/snö
faller pooled regn-streck eller virvlande snöflingor. I mitten står **Elvira** — en
glad blond tjej byggd av Pixi Graphics med tofsar. Nederst en garderobshylla med
plagg (rena emoji): de passande + distraktorer från andra årstider. Rösten säger "Det
är sol idag. Klä på Elvira så hon blir lagom!". Jag drar (eller tap-tap:ar via
DragController) ett plagg till en kroppszon (huvud/överkropp/fötter). Rätt plagg +
rätt zon → snäpper fast på figuren, hon hoppar, gnistor, rösten säger plaggnamnet
("Solhatten!"). Opassande plagg → mjuk vink ("Brr, då fryser vi!") och snäpper tillbaka.
Alla obligatoriska zoner fyllda → hon hoppar, firande + stjärna + klistermärke, nytt väder.

**Funkar bra:** konceptet är starkt och scenen marknadsmässig — väderomslaget
(bakgrund + symbol + partiklar tonar mjukt), figuren har riktig karaktär (rätt
karaktärsnamn Elvira), snäpp + tap-tap-fallback är förlåtande, distraktorerna är
genuint säsongsbundna (badbyxor/halsduk/paraply) och mismatch-vinkarna är varma och
vädersspecifika. Svårighet växer i antal zoner (1→2→3) och hyll-plagg. Exit-säkert.

*(Skärmdump: Elvira i sol-väder, solhatt på huvudet, t-shirt på väg ner; halsduk + stövel som distraktorer.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som **omsorgs- och resonemangslek**: barnet kopplar väder →
lämpliga kläder (kategorisering + enkel slutledning) genom att klä Elvira "lagom".
Väderomslaget och partiklarna ska göra vädret kännbart, mismatch-repliker ("Oj, då
blir det för varmt!") lär ut *varför* utan att straffa. NO-FAIL: fel plagg snäpper
bara tillbaka med en vänlig vink. Väder cyklas sol→regn→snö de första rundorna (med
offset så ny session inte upprepar), sedan slumpat ≠ förra.

## 3. Vad gör det lättjefullt / tunt

- **Resonemanget är grunt — det är egentligen emoji-till-zon-matchning.** Varje väder
  har exakt *ett* rätt plagg per zon och distraktorerna är uppenbart fel årstid, så barnet
  lär sig mest "hatten sitter på huvudet" snarare än "varför man tar stövlar i regn". Det
  finns ingen riktig valfrihet (flera dugliga plagg) eller gråzon att resonera kring.
- **Ingen payoff som sluter resonemanget.** När Elvira är klädd hoppar hon bara — hon
  **går aldrig ut** i vädret för att visa att hon nu är torr/varm/lagom. Just det (se henne
  glad i regnet *med* stövlar, frysande *utan* jacka i snön) vore beviset på att klädvalet
  betydde något. Belöningen är frånkopplad från lärandet.
- **Vädret är tyst.** Regnet faller och snön virvlar helt ljudlöst; ingen regn-ambient,
  inget vind-sus, inget "brr". Mismatch-vinken "Brr, då fryser vi!" är TTS, inget riktigt ljud.
- **Liten variation i innehåll.** Bara 3 väder, 3 zoner, och 1–2 extra-distraktorer per
  väder. Efter några rundor har barnet sett alla kombinationer; inget halvkallt/blåsigt väder,
  ingen "för varm/för kall"-nyans.
- **Allt ljud är syntetiskt/TTS** ('correct'/'soft' + röst). Inget mjukt tyg-frasande,
  inget snäpp-"klick" när plagget sätter sig.
- **Generisk belöning.** Samma konfetti+stjärna; ingen vädersspecifik finish (sol-stråle,
  regnbåge efter regnet, snögubbe i snön).

Kort sagt: en *fin, varm omsorgs-loop med snygg scen*, men slutledningen är tunn
(en-rätt-per-zon-matchning) och **klädvalets konsekvens visas aldrig** — hon går inte ut.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Lägg till en "gå ut"-payoff.** När alla zoner är fyllda: Elvira tar ett par
  steg ut i vädret och visar att hon är lagom — torr under regnhatten, varm i snön, sval i
  solen — med en glad replik ("Nu blir jag lagom i regnet!"). Sluter resonemangs-loopen och
  gör belöningen *om* lärandet.
- **[Medium] Tillåt flera dugliga val per zon** (t.ex. både keps och regnhatt funkar i regn)
  så barnet faktiskt resonerar i stället för att hitta det enda rätta. Behåll uppenbart fel
  som mjuk vink.

### Variation & överraskning
- **[Medium] Fler väder/nyanser:** blåsigt (behöver något som sitter fast), halvkallt höst
  (jacka men ingen mössa), regnbåge efter regn. Ger nya kombinationer att tänka kring.
- **[Quick] Variera figuren ibland** (Elvira / Zacke / Lova) så omsorgen känns bredare —
  alla är tillåtna karaktärsnamn.

### Juice
- **[Quick] Snäpp-"klick" + tyg-frasande** när ett plagg sätter sig, och en liten studs på
  zonen. Idag är fastsättningen ljudmässigt platt.
- ~~**[Quick] Elvira reagerar på fel:** huttrar till vid för lite kläder, viftar bort för
  varmt — per-plagg-reaktion gör vinken levande i stället för bara wiggle + TTS.~~
  ✅ **BYGGD 2026-08-12 (v1.176.0)** — och byggd bredare än punkten bad om: obehaget är
  inte bara en reaktion på FEL utan ett LÖPANDE tillstånd som avtar per rätt plagg. Se §5.

### Progression
- **[Quick] Bygg en liten "garderob" som fylls** över rundor (samlade plagg/väder), något
  att återkomma till — och lås upp roliga extra-plagg (solglasögon, paraply) som bonus.

### Karaktär & berättelse
- **[Deep] En liten berättelse-ram:** Elvira ska "ut och leka" — vädret är dagens utmaning,
  och payoff:en är att hon kommer ut och leker glatt rätt klädd. Ger ett *varför* bakom omsorgen.

### Ljud
- **[Quick] Riktig väder-ambient via SFX-pipelinen** ([[real-audio-sfx]]): mjukt regn,
  vind-sus, fågelkvitter i sol; ett "brr"-huttrande och snäpp-ljud. Gör vädret kännbart i örat.

## 5. Status / loggar

- 2026-08-12 🥶 **Elvira känner vädret** (v1.176.0). Punkten valdes av **mätning**:
  `_stillaprobe` läste scenen som nästan död — 84 noder, **3** i rörelse, största utslag
  **4,1–4,2 px i tre svep av tre**, och de tre var de fallande regn-/snöflingorna. Spelets
  enda karaktär, och hela dess anledning, stod blick stilla medan barnet skulle bry sig om
  henne.
  Obehaget är nu ett **löpande tillstånd**, inte bara en reaktion på fel: andelen ofyllda
  obligatoriska zoner, uttryckt i kroppen med **vädrets egen takt** — snabbt smått köldskalv
  i snö (21 rad/s), långsammare hukning i regn (8,5), trög värmevaggning i sol (3,0). Det
  avtar för varje plagg som sätter sig och är **borta** när hon är lagom klädd, så
  "Nu blir jag lagom varm i snön!" blir något barnet *ser*, inte bara hör. Ett opassande
  plagg lägger på en extra huttring ovanpå — §4:s ursprungliga "reagerar på fel".
  ⚠️ **Skalvet ligger i ett INRE lager.** `_figure` ägs av gsap (hoppet vid rätt plagg och
  "gå ut"-payoffen); en ticker som skrev samma `x/y` hade slagits med den om varje bildruta.
  Plaggen fästs numera i det inre lagret också, så en påsatt mössa skakar med henne.
  ⚠️ **Två fel som mätningen respektive skärmdumpen fångade, båda med grönt test:**
  ① Första utslagen (3,6 / 1,7 / 2,3 px) gav i **sol** ett svängningsrum på 4,6 px — mindre
  än flingorna scenen redan hade, alltså precis det `_stillaprobe` kallar "nästan stilla".
  Tableauet hade varit halvt löst. Utslagen höjdes; **takterna rördes inte**, för det är
  frekvensen som skiljer väderslagen åt. Sonden har nu en egen rad som kräver att skalvet
  syns i **alla tre** väderslagen. ② Kroppsdelarna ritas i absoluta koordinater kring x=640,
  så `rotation` på lagret svängde henne i en cirkelbåge kring scenens origo **640 px bort**
  i stället för att luta henne. Pivoten ligger nu vid **fötterna** — en människa vaggar kring
  marken hon står på.
  **MÄTT** (`node scripts/_ryserprobe.mjs`, **7/7** mot HEADs 1/2 där rad 1 är röd):
  svängningsrum **9,6 px** oklädd i snö (HEAD: figuren helt stilla) · **9,6 → 6,4 px** efter
  ETT riktigt drag genom DragController, alltså 0,67 mot lagens förväntade 2/3 ·
  **6,4 → 17,2 px** direkt efter ett opassande plagg · köldskalv **6,4 vändningar/s** mot
  värmevaggningens **0,8** · alla tre väderslagen över flingornas 4,2 px (9,6 · 6,8 · 10,8).
  `_stillaprobe` efteråt: **4,2 → 10,8 px** och 3 → 13 noder i rörelse.
  ⚠️ Raderna 5–6 är **vakter, inte bevis** — gröna på HEAD också. Bevisen är 1–4b.

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`004232f`, v1.100.0).
  `_plattprobe --medbakgrund` mätte **693 298 px = 75 % av skärmen** i EN ton.
  Bakgrunden var en enda VIT rektangel som tintas per väder, så Elvira stod i en färgad
  void utan mark under fötterna. Fixen måste bevara tint-mekaniken — och gör mer än så: en
  tonad fyllning behåller sin variation när den tintas, och **en mark som ritas i SAMMA
  Graphics tintas därför automatiskt med vädret** (sandvarm i sol, fuktigt gråblå i regn,
  kall i snö) utan en enda extra rad väderlogik. GROUND_Y = 606 är satt mot figuren, inte
  gissat: fötternas underkant ligger på 616. Dekorativa moln valdes BORT — vädersymbolen är
  hela ledtråden i spelet och ett moln hade konkurrerat med regnmoln-tecknet.
  Nästa lager om spelet tas upp igen: överkroppen är nu spelets plattaste yta.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **693 298 → 41 521 px** (75 % → 4,5 %).

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] "gå ut"-payoff + flera dugliga plagg per zon** och
  **[Quick] snäpp-klick + väder-ambient** — kopplar belöningen till lärandet, störst lyft för minst risk.
- 2026-07-02: Första-omgång IMPLEMENTERAD ✅. (1) **"Gå ut"-payoff**: när alla zoner
  fyllts säger Elvira "Nu går Elvira ut!", tar två små steg-bobbar ut i vädret och visar
  sedan att hon blivit lagom (vädersspecifik replik + svävande bevis-emoji 😎/☂️/⛄ + gnistor
  + glädjehopp) innan nytt väder. (2) **Flera dugliga plagg per zon**: `good`→`valid`-listor
  (sol-huvud solhatt/keps, sol-kropp tröja/klänning, sol-fötter sandaler/skor; regn-kropp
  regnjacka/paraply, regn-fötter gummistövlar/stövlar; snö-fötter vinterstövlar/kängor). En
  slumpad zon per runda får ETT extra dugligt plagg på hyllan → barnet resonerar. Target
  godkänner tills zonen är fylld (ingen dubbelfyllning); uppenbart fel = mjuk vingel som förr.
  (3) **Snäpp-"klick" + tyg-fras** (audio.tone) + **zon-studs** (pop på ringen) vid fastsättning.
  (4) **Lugn väder-ambient** via audio.tone: fågelkvitter (sol), mjuka droppar (regn), vind-sus
  (snö) — låg volym, gles takt. Självtest: errorCount 0.
- 2026-08-06: **P0 ASSETS + två layoutfel** (poleringsrundan, 🔤 Lära-fliken).
  - **Alla 13 plagg ritas nu** via `drawIcon` — de dras runt, de ÄR spelobjekt, och var
    tidigare naken emoji-Text. Ny `wear`-mall i `src/lib/artikoner.js` med 17 nycklar
    (12 former): solhatt · keps · regnhatt · vintermössa · tröja · klänning · regnjacka ·
    vinterjacka · sandaler · skor · gummistövlar · stövlar · vinterstövlar · kängor ·
    solglasögon · badbyxor · halsduk. Paraplyet återanvänder befintliga ☂️.
  - **Nyckelkrock rättad.** `🧢` var nyckel för TRE olika plagg (keps, regnhatt,
    vintermössa) och `🧥` för två jackor — en emoji-nyckel kunde omöjligt skilja dem åt,
    och distraktor-poolens dedup (`seen.has`) slog därför bort giltiga plagg. Fältet
    heter nu `art` och nycklarna är ord, inte emoji.
  - **Vädertecknet ritas** (`☀️` / nya `regnmoln` / `snoflinga`). Det är hela ledtråden i
    spelet och renderades av systemfonten. `_symbol` är nu en Container som ritas om vid
    väderbyte i stället för en Text vars `.text` byttes.
  - **Layoutfel 1 — plaggen låg ovanpå Elvira.** Jämnt centrerad utläggning gav alltid ett
    plagg på x=640. Värre än det ser ut: fot-zonens träffyta är Ø260 med centrum (640,560),
    så ett plagg som SPAWNADE där låg redan inuti släppzonen och en liten knuff kunde
    räknas som en placering barnet aldrig gjort. Ny `_layoutShelf(n)` lägger halva
    gruppen vänster om Elvira (slutar x=470) och halva höger (börjar x=810) — mitten fri.
  - **Layoutfel 2 — plaggen svävade ovanför hyllan.** `SHELF_Y` 600 → 668 och hyllplanet
    breddat till x 80..1200 så sex plagg ryms i två grupper. Nu ligger de PÅ hyllan.
  - `npm run test` 0 fel; skärmdump verifierad i alla tre väder.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): vita tint-bakgrunden breddad; regn/snö spawnar och wrappar över `ctx.view` (läst vid användning) — inga torra kolumner i kantremsorna. Testad båda viewports: 0 fel.
- 2026-08-09 ✅ **Tyngd i draget [Quick]** (v1.69.0): föremålet följer fingret med en liten eftersläpning, lutar åt dragets håll och landar med en tryckning i målet (delat i `DragController`). Här tändes dessutom lyft-skuggan (`skugga: true`) — spelet ritar ingen egen. Mätt med `_dragprobe`: 12 px släp, 0,098 rad lutning, skuggan borta och lagret tillbaka efter släpp, 0 konsolfel vid exit mitt i drag.
