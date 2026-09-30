# Djurorkester (`djurorkester`)
> 🔤 pedagogiskt · tap · 2–4 år · status: ✅ (applåd-klippet väntar på MOSS)

## 1. Nuläge (sett som spelare)

Sex stora, färgglada djurkort i ett 2×3-rutnät (ko, hund, katt, groda, gris, anka), var och
en i sin egen distinkta PLAYFUL-färg, studsar in med `back.out`. Jag trycker på ett djur →
det gör en härlig **squash-and-stretch** (tryck-ihop → sträck-upp → studs tillbaka) + ett
litet hopp uppåt, en svävande 🎵-nottecken stiger från kortets topp, ett mjukt `pop`-ljud,
och djuret "sjunger" sitt svenska läte — ett **riktigt förinspelat klipp** (`djur_<id>`) om
det finns, annars sjunger rösten frasen ("Mu! Muu!", "Voff! Voff!"). Inget mål, inga fel —
det är ett instrument. Var 8:e tryck → delat firande (stjärna + klistermärke). Idle ~6s →
instruktionen upprepas + ett slumpat djur studsar lockande.

**Funkar bra:** djur-emojierna är vackra och tydliga (3D-stil), kort-studsen är riktigt
saftig, färgkodningen gör varje kort distinkt, och kopplingen till **riktiga djurläten** via
`audio.sample` är en stor styrka jämfört med ren TTS. Omedelbar (<100ms) multisensorisk
återkoppling per tryck. Exit-säkert, oändlig lek, ingen press.

*(Skärmdump: 2×3-rutnät av djurkort i orange/grön/blå/gul/lila/röd, konfetti efter 8 tryck.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet kallar det "pedagogiskt tryck-spel/leksak (2–4 år)" — ett **instrument**, inte ett
mål-spel. Tanken: orsak-verkan för de yngsta (tryck → djuret hoppar och låter), med ett frö
av pedagogik (djur ↔ läte, en delmängd av `vilket-djur-later`). "Olika djur i följd bildar en
kör" är den tänkta leken: barnet upptäcker att det kan spela en melodi av djurläten. Firandet
var 8:e tryck finns bara för att leverera klistermärket — själva poängen är fri lek.

## 3. Vad gör det lättjefullt / tunt

Charmig leksak, men tunn som *pedagogiskt* spel och som *instrument*:

- **Ett kort = ett utfall, för alltid.** Ko-kortet gör exakt samma hopp + samma läte varje
  gång. Ingen variation i tonhöjd, ingen "kortet blir gladare ju mer man spelar", inget som
  belönar en *sekvens*. Efter 30 sekunder har barnet sett allt kortet kan.
- **"Kören" finns bara i kommentaren.** Inget i koden bygger faktiskt en kör: tryck staplas
  inte, det finns ingen rytm, inget tempo, ingen looping-bakgrundstakt att spela ovanpå. Sex
  oberoende knappar — ingen *orkester*, bara sex separata leksaker.
- **Ingen progression alls.** Samma sex kort, samma layout, för evigt. Var 8:e tryck poppar
  ett klistermärke ur tomma intet (ingen synlig räknare, ingen "samling", ingen anledning).
  Firandet känns godtyckligt eftersom inget byggdes upp till det.
- **Ingen dirigent/karaktär.** Tom `COLORS.bg` bakom rutnätet. Ingen scen (orkesterdike,
  scen, publik), ingen maskot som dirigerar eller dansar med. Djuren håller inga instrument —
  trots titeln "orkester" finns inga trummor, fioler, trumpeter.
- **Nottecknet är generiskt.** Samma 🎵 för alla djur. Ingen koppling mellan ljud och bild
  (låg ko-ton = stort tecken, hög fågel = litet), ingen färgad ton som matchar kortet.
- **Pedagogiken är ytlig.** Det lär ut "ko säger mu" — men namnger aldrig djuret med röst
  ("Kon!"), frågar aldrig, varierar aldrig. Som lärande är det en envägs-ljudknapp.

Kort sagt: en söt **ljudknapps-bräda**, men varken en orkester eller ett lärande — *kören*,
*progressionen* och *dirigenten* som titeln lovar finns inte.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Gör det till en riktig orkester — lägg en takt.**~~ Redan byggd
  (`index.js:56` `BEAT` 0,75 s + slag-ton och kortpuls i `_update`) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Sekvens-belöning ("kören").**~~ Redan byggd (`index.js:210–246`,
  `_trackSequence` → `_chorus`: gung, ackord, gnistor, KOR_BEROM) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Varierad tonhöjd per tryck.**~~ Redan byggd (`index.js:179`, ±3 % på djurets
  ton) — uppdagat 2026-09-23.

### Variation & överraskning
- ✅ ~~**[Quick] Ge djuren instrument.**~~ REDAN BYGGD (kontrollerad mot koden 2026-08-12,
  `DJUR[].instr` + `index.js:133`): varje kort bär sin rekvisita i nedre högra hörnet.
- ✅ ~~**[Medium] Byt djur-uppsättning per "konsert".**~~ Klar 2026-10-01: tolv djur, konsert 2 = helt
  nya, konsert 3+ = fyra nya + två kvarvarande. Se §5.

### Juice
- ✅ ~~**[Quick] Koppla nottecknet till ljudet.**~~ REDAN BYGGD (kontrollerad mot koden
  2026-08-12, `index.js:162–164`): `noteSize`/`noteRise` räknas ur djurets ton.
- ✅ ~~**[Quick] Grannkort-vibration.**~~ Klar 2026-08-12 (v1.172.0): utslaget avtar med
  avståndet, en djup röst skakar mer än en ljus, och det finns ett tak. Se §5.

### Progression
- ✅ ~~**[Medium] Synlig samling/konsert-mätare.**~~ Klar 2026-10-01: åtta noter tänds på notlinjen i
  scenbågen, och efter firandet spelar djuren upp barnets melodi som tack. Se §5.

### Karaktär & berättelse
- ✅ ~~**[Deep] Dirigent Bobo.**~~ Klar 2026-10-01 (scen, ridå, rampljus, Bobo med taktpinne i
  orkestergraven som slår takten, hejar vid kör och jublar vid konsertslut). Se §5. Ej byggt:
  en liten publik (mottagaren är Bobo).

### Ljud
- **[Quick] Tack-melodin blir en monoton rad om barnet trycker på SAMMA djur åtta gånger** (åtta lika
  toner). Räkna bara noter från olika djur, eller låt tack-melodin stiga. Konsert 1 har dessutom
  alltid samma sex djur. (DYR, inte nu — kritikerns fynd 2026-10-01.)
- ✅ ~~**[Quick] Verifiera att alla sex `djur_<id>`-klipp finns**~~ Redan byggd — alla sex
  ligger i `public/audio/sfx/` som egna klipp (anka och groda är olika filer), så inget djur
  faller till TTS — uppdagat 2026-09-23.
- **[Quick] Mjukt "applåd"-klipp vid konsert-firandet.** ⏸ Blockerad: kräver ett nytt
  SFX-klipp (MOSS nere) — en applåd är brus, inte något `audio.tone()` kan stämma.

## 5. Status / loggar

- 2026-10-01 🎭 **Från knappbräda till orkester** (natt-körning, fyra punkter). Sex djurkort i
  färgade rutor (brott mot P0 ASSETS) är borta; spelet är en teaterscen.
  ⓵ **Rutorna bort.** Djuren STÅR FRITT på podietunnor i en mjuk båge på ett trägolv (mitten
  längre bak och mindre = djup), inför en mörk vägg med målad måne, lampgirlang, röda ridåer och en
  valance. Varje djur = ritad kropp (konst.js, mönster för ko/bi) + huvud ur drawIcon + ett
  RITAT instrument (nio: trumpet, trumma, klaviatur, maracas, saxofon, fiol, tamburin, xylofon,
  triangel — ingen emoji) + händer över instrumentet, rampljuskon och ljuspöl, podiets skugga.
  Vilo-guppning (liv på `vila`), taktpuls, och vid tryck: squash + hopp på `figur`, huvud och
  instrument vinglar, rampljuset flammar. **Rörelsen ligger i BARN — djur-behållaren med
  träffytan står still** (140 px bred, ≥ 96 + halo; 150 px mellan djuren). Djuren sorteras på
  tonhöjd vänster → höger och podierna får regnbågens färger i samma ordning.
  ⓶ **Dirigent-Bobo** (makeKaraktar, r 42) i orkestergraven med taktpinne (barn till högra
  armen). Pinnen slår vid varje taktslag (kraftigare medan barnet spelar), ögonen följer trycket,
  heja vid kören, jubel vid konsertslut, hej när ridån går upp. Han står under scenkanten
  (y ≥ 600) och överlappar ingen träffyta.
  ⓷ **Konsertmätare:** åtta skuggnoter på en notlinje i scenbågen; varje tryck skickar en not i båge
  från djuret till sin plats, där den tänds i djurets färg och på en höjd som följer tonen. Ingen
  siffra, ingen poäng. Åttonde noten → complete(), alla noter pulserar, sedan spelar djuren upp
  barnets melodi (tack), ridån dras för, djuren byts, ridån går upp.
  ⓸ **Nya djur per konsert** ur alla tolv med djur_<id>-klipp: konsert 1 = ko/hund/katt/groda/
  gris/anka (som förut), 2 = får/häst/höna/bi/tupp/uggla, 3+ = fyra som INTE var med förra + två som
  var det. Nio instrument delas ut utan dubbletter på samma scen. Tonerna är tolv unika toner ur
  C-dur-pentaton (häst G3 … bi A5).
  Återspelssäkert: varje fördröjt anrop går via ctx.later + en konsert-token (_tok), proxy-
  tweens (flygande noter, ridå, gung) spåras och dödas, stadFx() städar innernoderna före rivning,
  träffytorna är av medan ridån är för. Grafik ritas PÅ plats (ingen .position på ett löv-Graphics).
  ⚠️ Ej mätt: byggaren fick inte köra webbläsare/test — bild, tidtabell och exit-cykeln var
  otestade när det här skrevs (se orkestreraren).

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): ingen kodändring. Spelet firade
  aldrig dubbelt — kören säger sin rad FÖRE `complete()` i samma tick (berömmet utgår), och
  inget talar på en fast fördröjning efteråt. §4 städad: takt, kör och tonvariation var redan
  byggda; applåden väntar på MOSS.

- 2026-08-12 🥁 **Dånet sprider sig till grannkorten** (v1.172.0, N10 pass 8).
  Fyndet kom ur `scripts/_stillaprobe.mjs`: 24 av 33 noder "rörde sig", men **största utslaget
  var 7,2 px** — identiskt i tre svep i rad. Scenen stod alltså i praktiken still: sex öar som
  inte visste om varandra. Nu skälver grannkorten när ett djur sjunger.
  **Skälvet är fysiskt, inte dekorativt** — och det är hela skillnaden mot en slumpvis
  vibration: ⓵ utslaget **avtar med avståndet** (ett dån sprids och tunnas ut), ⓶ en **djup**
  röst skakar grannarna mer än en ljus och svänger långsammare (svängningstalet är djurets egen
  ton nedskalad: ko ≈ 9,3 Hz, anka ≈ 18,7 Hz — basen bär), ⓷ det finns ett **tak**, så ett barn
  som trummar på alla sex korten får en scen som lever, aldrig en som skakar sönder.
  **Skälvet ligger i `_inner.x`.** Kortet självt bär `hitArea` och får aldrig vandra (P0), och
  `_inner.scale` skrivs av takt-pulsen medan `_inner.rotation` skrivs av kören — x är den enda
  fria kanalen. Det drivs i tickern, inte med gsap, så det aldrig slåss med de två andra.
  **MÄTT** (`scripts/_skalvprobe.mjs`, 7/7 mot HEADs 4/7): 5 av 5 grannar skälver (HEAD 0 av 5) ·
  **6,7 px närmast (306 px bort) mot 3,8 px längst bort (775 px)** · ko (C4) 6,7 px mot anka (C5)
  3,2 px · grannkortens egen rörelse **0,00 px** · 18 tryck i rad gav som mest 10,3 px mot taket
  11 · 0,000 px kvar 2 s efter sista trycket.
  ⚠️ Raderna 4/5/6/7 är gröna på HEAD också (där rör sig ingenting, så inget tak kan spricka och
  inget behöver dö ut) — **vakter, inte bevis**. Bevisen är 1, 2 och 3.
  ⚠️ "Ge djuren instrument" och "Koppla nottecknet till ljudet" var **redan byggda** (kontrollerat
  mot koden 2026-08-12) och är strukna i §4.


- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`3a31d59`, v1.106.0).
  `_plattprobe --medbakgrund` mätte **387 774 px = 42 % av skärmen** i EN ton.
  De sex djurkorten låg tryckta på ett platt papper utan yta under sig. Bakgrunden är nu
  en cachad `verticalFill` som spänner OM 0xfff0d6 — samma varma ton, bara med scenljus i.
  De tre största fälten är därefter tre av korten, alltså riktiga föremål.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **387 774 → 44 976 px** (42 % → 4,9 %).

- 2026-06-30: Doc skriven efter kodläsning + headless playtest (errorCount 0; skärmdump
  verifierad: 2×3 djurkort i distinkta färger, konfetti efter ~8 tryck). Ny doc (ingen
  tidigare build-spec).
- Rekommenderad första-omgång: **[Medium] takt/groove + [Medium] sekvens-kör + [Quick]
  instrument-emoji** — uppfyller titelns löfte (orkester + kör) och lyfter det från
  ljudknapps-bräda till musiklek, helt inom no-fail.
- 2026-07-02: **Första-omgång IMPLEMENTERAD** (errorCount 0, skärmdump verifierad —
  6 djurkort med instrument-rekvisita, kör-sväng + konfetti syns):
  - **[Medium] Takt/groove.** Lugn bakgrundstakt (~80 bpm, `BEAT=0.75s`) drivs i
    `_update`: ett mjukt bas-slag varannan takt (C3/G3, `audio.tone` vol 0.05) och
    alla korts inre behållare (`card._inner`) "andas" med en liten accent-puls i
    början av varje slag → barnet känner pulsen och tryck hamnar i en groove.
  - **[Medium] Sekvens-kör.** `_trackSequence` håller ett glidande fönster; tre OLIKA
    djur i följd → `_chorus`: de tre kortens `_inner` gungar synkront (proxy-tween,
    exit-säkert), deras pentatoniska toner staplas i ett litet ackord (grundton +
    oktav-glans, arpeggierat), extra gnistor + 🎶 + beröm ("Wow, de sjunger ihop!").
  - **[Quick] Instrument-emoji.** Varje kort har nu en rekvisita i hörnet
    (ko 🎺, hund 🥁, katt 🎹, groda 🪇, gris 🎷, anka 🎻) — läser som en orkester.
  - **[Quick, bonus] Varierad tonhöjd + not kopplad till ljudet.** Varje tryck spelar
    djurets pentatonton via `audio.tone` med ±3% slumpvariation (aldrig mekaniskt
    likadant); 🎵-notens storlek/stig-höjd följer tonhöjden (låg ton = stort tecken
    lågt, hög = litet högt).
  - Kvar till senare (ej i denna omgång): djur-rotation per konsert, synlig
    konsert-mätare, Dirigent Bobo + scen, grannkort-vibration.
- 2026-08-06: **P0 ASSETS — de sex djuren ritas** (poleringsrundan, 🔤 Lära-fliken).
  - Djuren var emoji-Text (fontSize 150) ovanpå en heltäckande färgad kortplatta —
    dubbelt brott: emoji som spelobjekt, och objektet inne i en bricka. Nu `drawIcon`
    (168 px); emoji-strängen är kvar som nyckel. Anka (🦆) fick sin ritning i samma
    poleringsrunda som `vilket-djur-later`.
  - **Kortplattan bleks** (`lerpColor(färg, vitt, 0.68)` + 10px färgad kant + topp-glans)
    i stället för full färg. Grön groda på grön platta och rosa gris på rosa platta föll
    annars ihop med sin egen bricka — samma fel som `harma-melodin` och
    `vilket-djur-later` hade. Varje kort är fortfarande tydligt sin egen färg via kanten.
  - Instrument-rekvisitan (🥁🎺🎻🎹🪇🎷) är kvar som emoji — P0 tillåter en emoji som
    *detalj ovanpå* ett riktigt ritat föremål, och det är precis vad den är.
  - Kvar sedan tidigare (ej i denna omgång): djur-rotation per konsert, synlig
    konsert-mätare, Dirigent Bobo + scen, grannkort-vibration.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): spelet hade INGEN egen bakgrund (vilade på skalets creme — det var hela kant-cream-fyndet): ny full-bleed-bakgrund i varm ton, rutnät/kort orörda. Testad båda viewports: 0 fel.
- 2026-08-09 ✅ **Delat squash-recept [Quick]** (v1.69.0): kortets `_hop` var originalreceptet för nya `feedback.squash()` — spelet anropar nu lib-versionen med samma tal (1.16/0.84 → 0.9/1.18 → back.out(2.6), hopp 46 px) och blev 18 rader kortare. Testad: 0 fel.
