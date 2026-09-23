# Mata Monstret (`mata-monstret`)
> 🧩 drag · mixed · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

Ett gosigt, skepnadsbytande monster (egen färg/form/öron/namn per runda — Gnaffsa/Bubbel/
Lurvas/Sötis) på en äng. Det ska matas med handritad, glänsande mat (frukt/grönsak/godis). Fyra
**lägen** roterar med rundräknaren: (1) **klassiskt** — dra maten från bordet upp till munnen;
(2) **promenad** — monstret strosar fram och tillbaka, munzonen rör sig med det; (3) **hylla** —
en glidande hylla högst upp; släpp maten så faller den (matter.js) och monstret glider in och
fångar; (4) **plinko** — välj en lucka högst upp (tryck), maten trillar genom ett pinnfält ner i
munnen. Ögonen följer maten, munnen *gapar* när den närmar sig, ett saftigt **tugg** stänger
käken, magen skvalpar, gnistor yr, blink emellanåt. Strikt no-fail: missar ger mjukt ljud +
vingel/puff, och monstret hjälper alltid så maten *alltid* blir uppäten. Allt uppätet → tugg +
mag-skvalp + skutt + konfetti + "Mätt och belåten!", och en ny runda (nytt läge + ny skepnad).
Från runda 3 kan monstret "vilja ha" en favoritkategori (talat).

**Funkar bra:** det är ett av de rikaste spelen i appen — eyetracking, gapande mun, mag-wobble,
blink, fyra distinkta lägen, monster-reskins, riktig fysik i hylla/plinko. Genuint charmigt och
levande, väl städat och exit-säkert.

*(Skärmdump: lila monster med gapande tandad mun mitt på ängen, tomat på bordet, muffins till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodens intent: ett skepnadsbytande monster som matas via *fyra* mekaniker som växlar med barnets
framsteg, så samma "mata"-kärna känns ny gång på gång. Strikt no-fail med generös auto-hjälp
(maten kan aldrig fastna; rundan kan aldrig hänga sig). Favoritkategorin (från nivå 2) sår ett
pedagogiskt frö (frukt/grönsak/godis) utan straff. Allt ritat programmatiskt, återanvänder
DragController, physics, scene och de delade firande-/ljud-tjänsterna. (En äldre build-spec för
detta spel beskrev en enklare 3-bitars en-läges-mun; den är nu överspelad av fyra-läges-bygget.)

## 3. Vad gör det lättjefullt / tunt

- **Auto-hjälpen äter upp agensen (appens återkommande synd).** I hylla/plinko *glider monstret
  alltid till maten* (`_slideMonster` mot `_catchX`) och en hård garanti teleporterar fastnad mat
  rakt ner mot munnen. Följden: i plinko spelar det knappt någon roll *vilken lucka* jag väljer —
  monstret hamnar under ändå. I klassiskt läge flyger maten själv in efter tre missar. Skicklighet
  ska *kännas*, inte krävas — men här krävs den heller aldrig, och valet känns sällan.
- **Favoriten är osynlig och nästan konsekvenslös.** "Idag vill monstret ha frukt" sägs *bara*
  med rösten; ett barn som inte lyssnar ser ingen ledtråd om vad som önskas. Och matar jag fel
  kategori händer inget annat än lite mindre gnistor — preferensen är i praktiken kosmetisk.
- **Ingen synlig mättnad.** Monstret äter 4–6 saker men magen *byggs* aldrig upp — den skvalpar
  och återgår. Vid rundslut är monstret lika smalt som vid start. "Mätt och belåten" sägs men
  syns inte. En växande, rund mage vore den naturligaste belöningsmätaren.
- **Maten försvinner spårlöst.** Den krymper in i munnen och blir inget — ingen "favoritmat-
  hög", ingen tallrik som töms synligt utöver att färre bitar finns kvar.
- **Ljudet är syntetiskt där det skriker efter riktigt.** Tugget är 'match', studsen 'boing',
  yum-frasen är TTS. Ett riktigt mums/krasch/rap (knyt an till [[real-audio-sfx]]) skulle göra
  matandet dubbelt så belönande.
- **Reward generisk.** Trots all egen-animation avslutas rundan med samma delade bigCelebration
  som alla andra spel.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Låt valet avgöra — dämpa auto-glidet.**~~ Redan byggd 2026-07-02 (ren fångst
  inom `CATCH_CLEAN_R`, synlig sträckning + "Jag sträcker mig!") — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Synlig favorit.**~~ Redan byggd 2026-07-02 (`makePrefBubble` :1689) — uppdagat 2026-09-23.

### Variation & överraskning
- **[Medium] Smak-reaktioner.** Monstret gör en rolig "äsch men gott ändå"-grimas på icke-
  favorit och stora glittriga hjärtögon på favorit — utfall som beror på *vad* jag valde, inte
  bara mängd gnistor.
- ✅ ~~**[Quick] Sällsynt jätte-godbit**~~ Klar 2026-09-23 (v1.251.0) i hyll-läget: var 8:e servering
  (aldrig den första) är 1,5× i konsten med samma gripyta, kroppen växer när den släpps, och
  monstret tuggar två varv, skakar och sväljer med ett djupt glupp (`_serveShelf` :425, `_onEatMade`
  :681). Inte i plinko: en större kropp fastnar mellan pinnarna (lucka 91 px, se `_buildPegs`),
  och bara större konst hade synligt gått igenom dem.

### Juice
- **[Quick] Riktig mat-SFX** (mums/krasch/slurp + ett belåtet *rap* vid rundslut) via
  [[real-audio-sfx]] — ersätter 'match'/'boing'/TTS-yum. *(2026-09-23: blockerad — kräver nya
  SFX-klipp, MOSS nere.)*
- ✅ ~~**[Quick] Mage som fylls**~~ Redan byggd (mjuk mage som växer per bit, `_bellyScale` :677)
  — uppdagat 2026-09-23.

### Progression
- **[Medium] Mättnadsmätare som figur.** Den växande magen *är* mätaren; vid full mage rapar
  monstret nöjt och klappar sig — egen vinst-animation istället för generisk konfetti.

### Karaktär & berättelse
- ✅ ~~**[Quick] Visa monstrets namn**~~ Redan byggd 2026-07-02 (`floatText` med `mon.name` vid varje
  rundstart :263) — uppdagat 2026-09-23.
- **[Deep] Små personlighetsrepliker** per monster (Gnaffsa fnissar, Sötis blir blyg) för
  återkommande igenkänning.

### Ljud
- **[Quick] Variera fullmätt-frasen + lägg en lugn ambient.** Frasen varieras redan (`FULL` :68,
  tre varianter). Ambienten kräver ett SFX-klipp (MOSS nere) — öppen.

## 5. Status / loggar

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_finishRound` spelade eget vinstljud och
  eget konfettiregn i samma tick som `complete()` — strukna. "Mätt"-repliken (3,4–4,4 s) stod
  redan före `complete()` men kapades av nästa rundas intro efter 1,9 s. Introt köas nu med
  `ctx.narTyst` (:276, runda-token). Nytt: sällsynt jätte-godbit i hyll-läget. Introt saknar
  klipp för flera meningar och går till talsyntesen (fanns före ändringen). `check` 0/0.

- 2026-08-12 🧠 **N4: maten går att TUGGA, och magen tar emot den** (v1.181.0). Två mjuka
  kroppar (`lib/mjukkropp.js`) ersätter två skal-tweens.
  **Tuggan.** Maten nådde munnen och krympte till noll på 0,26 s — käken tuggade i luften. Nu
  föds en mjuk klick i matens egen färg (`foodColor()`, ny i `food.js`) mellan tandraderna och
  **käkens två tandrader trycker faktiskt ihop den**: `_tuggprobe` mäter **68,6 → 14,8 px** hög
  vid gap 0,22 och den hoptryckningen ÄR gapet (14,8 mot beräknade 14,8), medan den **buktar ut
  90 → 109,5 px** i sidled. Munnen ritas därför i två lager med tuggan emellan — bakom munnen
  är maten helt dold, framför täcker den tänderna. Isolerat lager: **3 272 px synligt** mot
  **0 px** i kontrollen.
  **Magen.** Den var en ellips som skalades och som vid "mätt" hängde ut under kroppen över
  fötterna. Nu är den en mjuk kropp med spikad mittpunkt: viloformen är exakt den gamla ellipsen
  (**226×184 px**), `rorelse` **0,0000** i vila, den **växer sin viloform** per uppäten bit
  (`skala()`, ny i libbet) **226 → 258 → 291 → 326 px** och kommer aldrig under den tomma magens
  underkant (**224,0 mot golvet 224**) — den breder ut sig i stället. Skuttet skakar den av
  tröghet (`skjut`).
  **Kedjan syns nu:** bett → tugg → svälj → mage. Magen växer INTE av bettet (26 av 26 tugg-rutor
  på viloskala 1,000) utan när tuggan sväljs. Kostnaden är inte mätbar (16,67 → 16,63 ms; att
  mätaren biter bevisat med 25 ms barlast → 26,40 ms).
  ⚠️ Magens `rorelse` duger INTE som mått på sväljet — monstret skuttar vid varje tugga, och
  toppen efteråt varierade 27 → 217 mellan två körningar av samma sak. Viloformen är det
  entydiga måttet.

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`566e63a`, v1.118.0).
  `_plattprobe --medbakgrund` mätte **123 654 px = 13 % av skärmen** i EN ton.
  Himlen bakom var redan tonad; bordsskivan tonades först. **MONSTRET var det verkliga
  fyndet, och det syntes först när bordet var fixat:** kroppen låg på 97 405 px (10,6 %) i EN
  ton, och det är spelets huvudfigur. Varje del får nu den fyllning som matchar sin FORM —
  armarna är stående rör (`cylinderFill`), bålen ett klot (`sphereFill`). Värt att notera om
  mätningen: monsterfärgen slumpas per runda, så första bilden visade ett TEAL monster och
  andra ett ORANGE — talet gav samma svar båda gångerna. Det är formen som var platt, inte en
  viss färg.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **123 654 → 14 534 px** (13 % → 1,6 %).

- 2026-06-30: Doc skriven (granskning + plan; ersätter äldre build-spec). Inga kodändringar.
  Testkörning ren (errorCount 0), skärmdump verifierad (monster med gapande mun, mat på bord).
- Rekommenderad första-omgång: **[Medium] dämpa plinko/hylla-auto-glidet så luckval/timing
  räknas + [Quick] synlig favorit-bubbla + [Quick] mage som fylls** — återför agens och gör
  favoriten begriplig, utan att röra no-fail.
- 2026-07-02: **Första-omgången implementerad** (hela rekommendationen + en billig identitets-touch).
  - **[Medium] Agens i hylla/plinko — valet räknas.** `_slideMonster` glider inte längre alltid
    till maten; monstret STÅR vid sitt vilo-x (`_homeX`, satt i `_placeMonster`) och glider bara
    hit när det behöver `_reaching`. Nytt fångst-beslut i `_updateFlight` vid munhöjd: inom
    `CATCH_CLEAN_R` (155px) = REN fångst (monstret står kvar, `_hop(12)` som nöjd belöning →
    luckval/släpp-timing avgör träffen); längre bort → monstret sträcker sig synligt mot `_reachX`
    och säger "Jag sträcker mig!" en gång (`_reachSaid`), sedan `_catchEat` (nollar rotation +
    äter). Ny föraning: monstret lutar sig (`_monster.rotation`) mot inkommande mat medan den
    faller. Den hårda stuck-garantin i `_updateFlight` är oförändrad → fortfarande strikt no-fail.
    `_reaching`/`_reachSaid` nollas per serverad mat (`_dropShelf`/`_dropSlot`) och i teardown.
  - **[Quick] Synlig favorit-bubbla.** Ny `makePrefBubble(cat)` (moln + `PREF_ICON`
    🍎/🥕/🍬 + tanke-prickar) skapas i `_startRound` när `_prefCat` finns, positioneras varje
    frame ovanför huvudet av `_positionPrefBubble` (följer skepnadens skala/läge). Rätt kategori
    → bubblan `pop`:ar + `sparkle` i `_onEatMade` (aldrig straff för fel). Röjs via `_fgLayer`.
  - **[Quick] Mage som fylls.** `_bellyScale` (nollställs per runda i `_startRound`) växer
    `BELLY_FULL` (0.42) i steg per uppäten bit i `_onEatMade` (`eaten/_roundCount`); `_bellyWobble`
    landar nu på den nya basen istället för 1 → magen är tom vid start och rund vid "mätt".
  - **[Quick, extra] Namn-skylt.** `_startRound` visar `mon.name` som exit-säker `floatText`
    över monstret vid varje rund-start → varje skepnad får synlig identitet (namnet sägs redan).
  - Test: `node scripts/test-game.mjs mata-monstret --url http://localhost:5173 --drag
    "640,602>640,366;200,602>640,366"` → errorCount 0. Skärmdump (klassiskt läge) visar Lurvas
    med rund, fylld mage efter två uppätna bitar och kvarvarande tomat — inga strida barer.
  - Deferred: [Medium] smak-grimas/hjärtögon per utfall, [Medium] mättnad som egen rap+klapp-
    vinstanimation (magen är nu mätaren men firandet är ännu delat bigCelebration), [Quick]
    jätte-godbit, [Quick] riktig mat-SFX (mums/krasch/slurp/rap — kräver MOSS, se real-audio-sfx),
    [Deep] personlighetsrepliker per monster, [Quick] lugn ambient mellan rundor.
