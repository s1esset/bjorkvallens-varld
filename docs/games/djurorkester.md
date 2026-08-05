# Djurorkester (`djurorkester`)
> 🔤 pedagogiskt · tap · 2–4 år · status: 🔧 förbättringar pågår

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
- **[Medium] Gör det till en riktig orkester — lägg en takt.** En lugn rytmisk
  bakgrundsloop (ljus puls-beat) gör att tryck *hamnar i takt* och bildar en groove. Då blir
  "spela flera djur i följd" en faktisk musikupplevelse, inte sex isolerade pip. Kortet kan
  pulsera i takt så barnet känner pulsen.
- **[Medium] Sekvens-belöning ("kören").** Spela 3 olika djur i rad → de tre korten gungar
  *tillsammans* och lätena lägger sig i harmoni (en liten ackord-stack) + extra gnistor. Ger
  ett "wow, de sjunger ihop!" och belönar utforskande utan att kräva det.
- **[Quick] Varierad tonhöjd per tryck.** Små slumpmässiga pitch-skift (eller en stigande
  skala vid snabba tryck) gör att samma djur inte låter mekaniskt likadant — instrumentet
  känns levande.

### Variation & överraskning
- **[Quick] Ge djuren instrument.** Lägg en liten emoji-rekvisita per kort (🥁🎺🎻🎹🪇) —
  nu *är* det en orkester, och trycket "spelar instrumentet" snarare än bara djurlätet.
- **[Medium] Byt djur-uppsättning per "konsert".** Efter ett firande: rotera in andra djur
  (får, häst, tupp, bi, uggla) ur en större pool. Samma mekanik, ny upptäckt — bryter
  "samma sex för evigt".

### Juice
- **[Quick] Koppla nottecknet till ljudet.** Låt 🎵 stiga högt + litet för ljusa läten, lågt
  + stort för mörka (ko), och tinta det i kortets färg. Visuell ton-höjd = enkel musikteori.
- **[Quick] Grannkort-vibration.** När ett djur sjunger, låt grannkorten skälva lätt i takt
  (som ett verkligt dån som sprider sig) — scenen känns sammankopplad, inte sex öar.

### Progression
- **[Medium] Synlig samling/konsert-mätare.** En liten rad noter/stjärnor fylls per tryck så
  firandet *byggs upp synligt* (barnet ser målet närma sig) i stället för att poppa ur intet.
  Efter en konsert: en kort auto-spelad melodi av djuren som "tack".

### Karaktär & berättelse
- **[Deep] Dirigent Bobo.** Maskoten står framme med taktpinne, dansar/vinglar i takt och
  pekar (vid idle) på nästa djur att prova. Lägg en enkel scen (scengolv + ridå + ev. liten
  publik) så det blir en *föreställning*, inte en bräda. Ger karaktär och en mottagare som
  jublar vid konsert-slut.

### Ljud
- **[Quick] Verifiera att alla sex `djur_<id>`-klipp finns** i SFX-pipelinen
  ([[real-audio-sfx]]) så inget djur faller tillbaka till TTS (anka/groda delar "kvack" —
  ge dem distinkta klipp). Lägg ett mjukt "applåd"-klipp vid konsert-firandet.

## 5. Status / loggar

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
