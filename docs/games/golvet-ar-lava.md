# Golvet är Lava (`golvet-ar-lava`)
> 🧩 pussel · drag · 3–5 år · status: ✅ marknadsklar

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
- 2026-07-02: Första-omgång implementerad (errorCount 0, skärmdump läst).
  - **[Medium] Sent, synligt, vinkande moln.** `_beginStep` cloud-grenen sätter nu
    `this._hesitate = 0.7` — figuren tvekar synligt på kanten (`_updateWalk` ny hesitations-
    gren lutar `_heroEmoji.rotation` med sin-våg) medan `_spawnCloud` bygger en Container med
    `☁️` + vinkande `👋` (`this._cloudHand`, sin-roterad) som glider ner ovanifrån. Text bytt
    från "Hihi!" vid start → "Jag hjälper till!" (`floatText`); "Hihi!"-fnisset flyttat till
    `_onLand` när molnet faktiskt lyft klart. Hjälpen känns nu som ett tydligt, sällsynt
    ingripande, inte en osynlig auto-lösning.
  - **[Quick] Distinkt sten-arsenal per nivå.** Ny `_stoneKindsFor(level)` (studs → bro →
    lilja: nivå 0–1 = 3 normal+studs, 2–3 = +bro, 4+ = +lilja). `_makeStone` generaliserad
    till fyra kinds; ny `REACH`-tabell (`normal 280`, `bounce 460`, `bro 360`, `lilja 300`)
    driver hoppet via `c._reach` (seq/`_beginStep` läser `a.reach` i st.f. hårdkodat
    `isBounce?460:280`). Bro = bred plank-Graphics, lilja = näckros-ellips + `🌸`.
  - **[Quick] Lava reagerar.** Ny `_lavaReact(x)` (stänk-`puff` + glöd-`ripple` vid ytan) körs
    i `_settleStone` när en sten läggs; `_onLand` ger glöd-`ripple` + mjuk `shake(this._root)`
    (skalar med fallhöjd `this._H`) när figuren landar över floden.
  - **Billiga extrafynd som passade:** varierat skatt-fynd per nivå (`FYND`-array, `this._gem`
    text-byte i `_buildLevel`, fyndet flyger ut via `floatText` i `_onWin`); armar-upp-pose
    (`🙌`) på vinst; mjukt fjäder-"boing" (`audio.tone`) vid avstamp från studs-stenen.
  - Deferred: [Deep] förhandsvisad hoppbåge före Gå!, [Deep] väntande mottagare (Bobo/drake)
    vid skatten, [Medium] mjuk scen-cykel (vulkan→grotta→natt), vinglig sten, samt riktiga
    MOSS-SFX (lava-blubb/boing/duns/ambient) och barnfniss — alla utanför denna låg-risk-omgång.
- 2026-08-06: **Poleringsrundan** (commit `14e8294`). Båda [Deep]-punkterna tagna + hela
  asset-skulden.
  - ✅ **[Deep] Förhandsvisad hoppbana.** `_drawPreview()` ritar en prickad bana som ritas om
    vid varje stenflytt (`_settleStone`, `_returnHome`, `_placeInSlot`, `_stoneDown` på en redan
    lagd sten, `_buildLevel`). Vit = klarar hoppet själv, blek blå + ritad molnmarkör = molnet
    bär. Nyckeln till att den inte kan ljuga: `_buildSeq()` och `_arcHeightFor()` delas av
    förhandsvisningen OCH `_startWalk`/`_beginStep`. `stone._px` (stenens MÅL-x) används i
    stället för `stone.x`, som ljuger under den 0,16 s långa glidningen.
  - ✅ **[Deep] Mottagare.** Ritad drake vid kistan: `breathe`-idle, `_dragonCheer()` per klarat
    hopp (studs + vingslag) och ett större firande + rök-puff i `_onWin`. Yttre container bär
    position/skala, andningen tweenar den inre — annars skrev `breathe()` över skalan vid varje
    nivåbygge.
  - ✅ **P0 ASSETS — all emoji borta ur spelobjekten.** `_buildHeroArt(name)` ritar Zacke/Alissa
    (ben, bål, armar, hår, blick åt höger mot skatten) med fötterna i y=0, samma ankare som
    emojin hade, så `_updateWalk`s squash/stretch fungerar oförändrat. `_setHeroPose('cheer')`
    lyfter armarna vid vinst i st.f. att byta till 🙌. Dessutom ritade: fem fynd (`_makeFynd`),
    hjälpmolnet med vinkande hand, liljans blomma, studspilen, Gå!-fötterna, brickans vulkan.
  - ✅ **Tre buggar som bara syntes i skärmdumpen.** (1) Gå!-knappen låg mitt i lavafloden →
    flyttad till vänstra klippan. (2) **Sista klivet gick bakåt** på breda banor: `treasureNodeX`
    kunde hamna vänster om `rightLandingX` och `gap = max(0, b.x - a.x)` gjorde steget till en
    no-op. Floden växer nu åt vänster (`lavaRight` låst på 1040) så högra klippan alltid rymmer
    landning + kista + drake, och noden tvingas ligga höger om landningen. (3) Bubblorna föddes
    240 px ner och växte till stora genomskinliga klot som läste som bokeh → grunda (`BUBBLE_DEPTH`
    110), mindre, med glans och djupdämpad alpha.
  - ✅ **Riktig ton.** Landningen spelar en stigande pentatonisk skala steg för steg, så vägen
    över floden bildar en melodi i st.f. samma `pop`. `sample('duns')` hookad + prompt tillagd i
    `scripts/sfx-phrases.json`. `gsap.delayedCall` → `ctx.later()`.
  - Kontroll: `check` grön · `test` 0 fel · `_idleprobe 60` = 0 framsteg utan tryck.
  - Kvar (medvetet): [Medium] scen-cykel vulkan→grotta→natt, vinglig sten, och de riktiga
    MOSS-klippen (lava-blubb/ambient/barnfniss) som väntar på en samlad `/rost`-körning.
</content>
