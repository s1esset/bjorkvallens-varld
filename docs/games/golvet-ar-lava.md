# Golvet är Lava (`golvet-ar-lava`)
> 🧩 pussel · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En varm vulkanscen: två gröna klipphyllor med en bubblande lavaflod emellan, Alissa
(eller Zacke på udda nivå) väntar till vänster, en glittrande skattkista 💎 lockar till
höger. I en bricka högst upp ligger 3 grå trampstenar + 1 grön **studs-sten** (fjäder +
uppåtpil). Jag drar en sten ut över lavan — den snäpper till en av de gula spök-slottarna
(eller lägger sig fritt var jag vill över floden) med ett "pop" + gnistra. Tap-tap funkar
också (välj sten → tryck på slot/yta). När jag tycker det räcker trycker jag på den stora
gröna **Gå!**-knappen: figuren hoppar i fina parabelbågar från sten till sten, squashar vid
avstamp/landning, och når skatten → konfetti + beröm + stjärna. Är ett gap för stort sveper
ett snällt vitt moln in och lyfter figuren över med "Hihi!". Nästa nivå = bredare flod, fler
slottar. Lavan lever: bubblor stiger och poppar vid ytan, ytlinjen vågar sig fram i tickern.

Funkar bra: scenen är vacker och varm, lavan känns levande, drag + tap-tap är förlåtande,
hoppbågarna är charmiga, studs-stenen ger ett genuint val, och no-fail är vattentätt. En
stark, välbyggd bana-pusslare.

*(Skärmdump: vulkanscen, Alissa vänster, skattkista höger, en sten lagd på lavaytan, Gå!-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): barnet **bygger sin egen väg** över ett hinder så figuren kan ta sig
till skatten — orsak-verkan med planering, men utan ett enda misslyckande. Två kontroller som
*ändrar utfallet* var designkravet: (1) VAR stenarna placeras (kort/långt mellan stegen) och
(2) studs-stenen som kastar nästa hopp 460 px i stället för 280 → barnet kan brygga ett stort
gap med flit. Allt med egna, exit-säkra ticker-integratorer (hoppbåge + lavabubblor) i stället
för matter.js. Molnet är no-fail-garantin: figuren faller aldrig i lavan, hoppet lyckas alltid.

## 3. Vad gör det lättjefullt / tunt

Stark grund, men en kräsen förälder ser de billiga dragen:

- **Hjälp-molnet underminerar hela placerings-pusslet.** Så fort ett gap > räckvidd (280)
  sveper molnet in och bär figuren över — och med 5 slottar utspridda över en ~800px-flod blir
  glappen mellan utvalda stenar ofta stora. Barnet kan trycka Gå! med EN sten (eller nästan
  inga) och molnet broar resten. `_startWalk` kräver bara att man placerat *någon gång*
  (`_hasPlacedEver`), inte att vägen faktiskt håller. Skickligheten blir valfri snarare än
  belönad — exakt det app-breda auto-hjälp-mönstret.
- **Stenarna är utbytbara.** De tre grå stenarna är identiska cirklar; att lägga "sten A"
  eller "sten B" gör samma sak. Det enda riktiga valet är studs-stenen — och den finns alltid
  i exakt ett exemplar. Inga nya stentyper tillkommer med nivåerna (bara fler slottar/bredare
  flod), så tur 6 leker likadant som tur 2.
- **Figuren är en stillastående emoji.** 🧒/👧 hoppar i en parabel med squash/stretch men har
  ingen personlighet — inga armar som far upp, ingen blick mot skatten, ingen "äntligen!"-pose.
- **Lavan är ren tapet.** Den bubblar snyggt men figuren rör den aldrig (rätt — no-fail), och
  den *reagerar* aldrig: ingen stänk när en sten landar i den, ingen glöd som pulsar när
  figuren hoppar över. Floden är ett vackert hinder som inget händer med.
- **Skatten är inert och generisk.** Samma kista 💎 varje nivå; den öppnas aldrig, visar aldrig
  vad som finns inuti, och det jag "vinner" samlas inte någonstans. Belöningen är delad
  standard-konfetti (samma som alla spel).
- **Ljudet är tunt.** `pop`/`whoosh`/`soft` + TTS-"Hej hopp!"/"Hihi!". Inget hopp-"boing", ingen
  distinkt lava-fräsning (bubblan låter `soft`), ingen landnings-duns som skalar med fallhöjd.

Kort sagt: snyggt och korrekt, men **stenarna är utbytbar rekvisita, molnet löser banan, och
loopen är "töm bricka → bredare flod".**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gör molnet sent, synligt och sällsynt.** Låt barnets placeringar faktiskt avgöra:
  molnet kickar bara in om ett gap är ohjälpligt stort *och* visar tydligt "Jag hjälper till!"
  (vinkande moln-figur) — och bara efter att figuren tvekat en sekund på kanten. När barnet
  byggt en hel kedja ska den känna sig som *deras* hopp, inte molnets. Skicklighet ska kännas.
- **[Medium] Distinkta stenar med olika egenskaper.** Förutom studs: en bred **bro-platta**
  (täcker ett dubbelt gap), en **vinglig sten** som vippar lite (lite spänning, fortfarande
  no-fail), en **flytande lilja** som guppar. Då blir VILKEN sten ett val, inte bara var.
- **[Deep] Låt barnet se bygget testas innan Gå!.** En spök-figur (eller streckad båge) som
  förhandsvisar hoppvägen när en sten läggs — så barnet förstår "det här gapet är för långt"
  och vill lägga en sten till. Gör pusslet begripligt utan att lösa det.

### Variation & överraskning
- **[Quick] Stigande sten-arsenal per nivå.** Introducera en ny stentyp var-/vartannat nivå
  (studs → bro → lilja) så brickan känns rikare ju längre man kommer.
- **[Quick] Variera skatten.** Kistan innehåller olika fynd (💎/👑/🏆/🪙) som flyger ut vid
  vinst — små överraskningar i stället för samma 💎.

### Juice
- **[Quick] Lava som reagerar.** Stänk + kort glöd-puls när en sten landar över ytan; ringar på
  lavan när figuren hoppar förbi; mikroskak vid landning som skalar med fallhöjden.
- **[Quick] Hopp-juice.** Ett mjukt "boing" vid avstamp (extra fjäderton på studs-stenen), en
  liten dammpuff vid landning (finns redan — förstärk), och en svans/streck efter figuren i
  toppen av bågen.

### Progression
- **[Quick] Synlig "samlad sträcka".** En liten mätare/stig-ikon som fylls för varje klarad
  flod, så barnet ser att floderna blir bredare och att det "går framåt".
- **[Medium] Mjuk scen-cykel.** Låt bakgrunden växla tema mellan nivåer (vulkan → grotta →
  natt-lava) med cross-fade så världen känns som en resa, inte en upprepad rebuild.

### Karaktär & berättelse
- **[Deep] En väntande mottagare vid skatten.** Maskoten Bobo (eller en glad drake) sitter på
  höger klippa, hejar när figuren hoppar, och firar tillsammans vid kistan — en anledning att
  bry sig och en spel-specifik vinst-animation i stället för generisk konfetti.
- **[Quick] Figuren reagerar.** Liten "titta mot skatten"-vridning vid start och en armar-upp-
  pose vid vinst (byt emoji till 🙌/🎉 ett kort ögonblick).

### Ljud
- **[Quick] Riktiga lava/hopp-SFX via MOSS-pipelinen** ([[real-audio-sfx]]): bubbel-"blubb",
  hopp-"boing", landnings-"duns", och en låg lava-ambient-loop för värme. Byt TTS-"Hihi!" mot
  ett riktigt litet barnfniss.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Speltest grönt (errorCount 0), skärmdump läst.
  Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] sent/synligt moln + [Quick] distinkt sten-arsenal +
  [Quick] lava-reaktion** — störst lyft för agens och liv, låg risk.
</content>
