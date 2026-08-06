# Snöbollen (`snobollen`)
> ⚙️ fysik · drag · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En mjuk vinterbacke som lutar ner åt höger, snöig himmel med sol och moln, glesa fallande
flingor. Högst upp till vänster ligger en liten vit snöboll. Jag håller och drar i sidled
(eller tap-tap:ar en punkt) → bollen följer mitt finger i x medan gravitationen drar den
nerför backen; en liten prickrad visar styr-riktningen. Snabb-tap på bollen ger en
fart-**knuff** nedför. När bollen rullar genom **snöfält** växer den (radie 40 → 110, med
`Body.scale` så massan och momentumet ökar) och en tillväxt-mätare till höger fylls. Stora/
snabba bollar **välter pingviner 🐧 och lådor 📦** som flyger iväg med ett "Wii!"/"Pang!".

Längst ner-höger finns en pulserande mål-ring (snögubbe-platsen). När bollen når dit fryses
den och byggs om till en glad **snögubbe** (mage, huvud, kol-ögon, knappar, morots-näsa,
hatt) → firande + stjärna + klistermärke, sedan en ny, lite längre bana. Är bollen för
liten när den kommer fram trollas extra snö fram tills den räcker (no-fail). Står bollen
still ~2,5 s kommer en mjuk auto-knuff; idle ~6 s ger röst-recue + en ❄-vink mot närmaste
snöfält.

**Funkar bra:** växa-genom-att-rulla är en härligt taktil kärnloop, `Body.scale`-momentumet
gör att en stor boll *känns* tung när den smäller in i mål, snögubbe-bygget är ett riktigt
spel-specifikt finalmoment (inte generisk konfetti), styr+knuff är två begripliga
kontroller, och vinter-scenen med flingor är stämningsfull.

*(Skärmdump: snöboll mitt i rullningen med ❄-glimt, ett 📦-mål som studsar undan med
"Wii!", sol + moln, tillväxt-mätare uppe till höger.)*

## 2. Ursprunglig plan & tankeprocess

Designintentionen (ur kodhuvudet) var **ren bygg-och-växa-tillfredsställelse utan risk** —
den klassiska "snöboll som rullar och blir större"-fantasin. Det kännbara fröet är
orsak-verkan i fysik: mer snö → större boll → större smäll, vilket barnet ser direkt i
både storlek och mätare. Två kontroller (styr i x, knuff för fart) ger agens utan exakt
sikte. No-fail är inbyggt på flera lager: backen lutar alltid nedåt, minst ett snöfält
ligger i vägen, en stilla boll auto-knuffas, en för liten boll auto-växer vid mål.
Snögubben är medvetet ett *unikt* finalmoment så vinsten känns gjord, inte påklistrad.

## 3. Vad gör det lättjefullt / tunt

Charmig kärna, men flera tunna drag:

- **Backen är nästan tom.** Bortsett från snöfälten och 1–4 mål är sluttningen en blank vit
  ramp. Inga träd, inga gran-silhuetter, ingen by, inga backhopp eller gupp, inga djur som
  tittar på. Skärmdumpen visar mest tom himmel + tom backe. En vinterbacke borde myllra.
- **Snöfälten är passiv "mat".** De ligger stilla, glittrar inte, lockar inte. När bollen
  rör dem markeras de `_eaten` och tonas till grå — ett enkelt på/av. Ingen "sug in snön"-
  animation, ingen partikelsvans av snö som virvlar upp i bollen.
- **Målen vinglar bara, de gör inget eget.** En pingvin/låda som träffas av en stor boll
  får en fast `setVelocity` undan + ett `TOPPLE_WORD`. De har inga ansikten, ingen reaktion
  innan smällen, ingen landning som spelar roll (de flyger ur bild och glöms). En liten
  boll får dem att bara "vingla" — knappt märkbart.
- **Tillväxten är diskret och kapad.** Varje fält ger exakt +12 radie tills `MAX_R 110`.
  Ingen acceleration, ingen "den rullar och samlar snö av sig själv"-känsla; bollen växer i
  hopp när den nuddar ett fält och står annars stilla i storlek.
- **Auto-hjälpen tar över.** Auto-knuff var 2,5:e sekund + auto-växt vid mål gör att ett
  barn som inte gör något ändå rullar fram och bygger en snögubbe. Styrningen blir då
  dekoration; mätaren kan "fyllas" av magi snarare än spel.
- **Snögubben är samma varje gång.** Mage + huvud + ögon + 3 knappar + morot + hatt, alltid
  identisk (bara skalad mot `_r`). Inga tillbehör att välja, ingen halsduks-färg, inga ögon-
  varianter — och den försvinner direkt vid nästa bana utan att samlas någonstans.
- **Ljudet är tunt.** Växt = `reveal`, knuff/auto = `whoosh`, väggstuds = `pop`, mål =
  `pop`+`soft`. Inget krasande snö-rull som stiger med farten, inget "plopp" när snö samlas,
  inget glatt pingvin-pip. Auto-knuffens "Jag hjälper till!" är TTS, inte ett ljud.

Kort sagt: kärnan är mysig, men **backen är tom, snöfält och mål är livlösa, och
auto-hjälpen kan spela banan åt barnet**.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Kontinuerlig rull-tillväxt.** Låt bollen samla en aning snö hela tiden den
  rullar på backen (inte bara vid fält), och låt fälten vara feta "bonus-klumpar". Då blir
  *att hålla farten uppe* via styrning/knuff en verklig strategi — bollen växer för att jag
  rullar bra, inte bara för att jag nuddade en fläck.
- ~~**[Medium] Mjuka upp auto-knuffen.** Höj `STUCK`-tröskeln och gör auto-knuffen svagare,
  mer som en "liten puff i ryggen", så barnets egna knuffar bär farten. Behåll garantin men
  gör den till sista utväg.~~ **GJORT 2026-07-25 (2)** — `STUCK` 2,5 → 4,5 s, hjälpen är sen
  och synlig, och pressen mot ett hinder byggs bara av barnets fart/tryck/tap.
- **[Quick] Knuff-laddning syns.** Visa en fart-svans/glow som växer med upprepade knuffar
  så barnet ser att "fler knuffar = kraftigare smäll" (som kodhuvudet lovar).

### Variation & överraskning
- **[Quick] Befolka backen:** granar, snöiga stenar, en stuga med rykande skorsten, ett
  litet gupp/hoppbacke som kastar bollen i en glad båge. Tar bort tom-ramp-känslan.
- **[Medium] Mål med personlighet + förväntan.** Ge pingviner/lådor ögon som tittar mot
  bollen och hoppar undan i sista stund (eller vinkar). Lägg till varianter: en snögubbe att
  krocka i bitar, en hög lösa lådor som rasar, en flock pingviner som sprids.
- **[Deep] Hemliga snö-överraskningar:** ett snöfält gömmer ibland en morot/hatt/halsduk som
  bollen plockar upp och *bär med sig till snögubben* (kopplar till samlaren nedan).

### Juice
- **[Quick] Rull-ljud som stiger med farten** ([[real-audio-sfx]]): ett mjukt knastrande
  snö-rull som blir intensivare ju snabbare/större bollen är, + ett "fwomp" när snö samlas
  och ett pip/"pang" när mål flyger.
- ~~**[Quick] Snö-virvel vid tillväxt.** När bollen äter ett fält, sug in en kort spiral av
  vita partiklar i bollen (i stället för en stillsam `sparkle`)~~ **GJORT 2026-08-06** —
  återstår: + ett litet skärm-skutt vid stora smällar.
- **[Quick] Spår i snön.** Låt bollen lämna ett brett, ljust släpspår på backen — visar fart
  och väg, gör backen mindre tom.

### Progression
- **[Medium] Snögubbe-galleri / samlare.** Spara `custom.snogubbar` (görs redan) som en rad
  små snögubbar på en hylla, och låt insamlade tillbehör (hatt/halsduks-färg) variera nästa
  snögubbe — ett skäl att bygga "en till".
- ~~**[Quick] Bana-variation:** ibland en längre backe, ibland fler mål, ibland kallare/varmare
  ljus, så turerna inte är samma layout-mall.~~ **GJORT 2026-08-06** (väder + layoutprofil).

### Karaktär & berättelse
- **[Medium] En kompis på backen.** Bobo (eller en pingvin) som åker före, hejar när bollen
  växer, och vid snögubbe-platsen "pyntar" gubben tillsammans med barnet (sätter dit hatten)
  i stället för att den bara poppar färdig.

### Ljud
- **[Quick] Ersätt TTS-utrop med klipp.** "Wii!"/"Pang!"/auto-knuffens "Jag hjälper till!"
  blir riktiga, gladare ljud; lägg en lugn vinter-vind-ambient i botten.

## 5. Status / loggar

- 2026-06-30: Doc skriven utifrån kodläsning + playtest (errorCount 0; drag rullade bollen
  och välte ett mål). Ersatte den gamla byggspecen. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] befolka backen + rull-spår + rull-ljud** +
  **[Medium] kontinuerlig rull-tillväxt** — gör backen levande *och* ger styrningen riktig
  betydelse, för rimlig risk.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Byggde en levande backe:
  fjärran gran-siluetter, snöiga stenar, fyra snötäckta granar och en stuga med
  rykande skorsten (`_buildDecor`/`_makeTree`, allt dekorativt bakom fält/boll, rök =
  exit-säker repeterande tween i `_decorTweens`). La till ett brett ljust **rull-spår**
  (`_trail`, ritas per frame där bollen rör backen, nollställs per bana i `_resetBall`),
  **kontinuerlig rull-tillväxt** (bollen samlar lite snö hela tiden den rullar via nya
  `_growBall`; snöfälten blev feta bonus-klumpar +14 i stället för +12), och ett mjukt
  **rull-ljud** (`audio.tone`, tonhöjd/styrka stiger med fart + storlek). Ingen ändrad
  auto-hjälp — kontinuerlig växt gör den till en verklig sista utväg av sig själv.
  Rörde bara `src/games/snobollen/`.
- 2026-07-25: **Buggfix — spelet gick inte att klara** (ägarrapport: "bollen fastnar
  till höger på alla pingviner och sakerna i vägen"). Grundorsak uppmätt i en
  huvudlös matter.js-repro av exakt spelets uppsättning, inte gissad:
  1. Målen var **lätta dynamiska kroppar** som bollen sköt framför sig i stället för
     att passera. Ball + låda malde ner till **0,13 px/steg**; efter 30 s var bollen
     vid x=656 (mål x=1085) — banan gick alltså **aldrig** att klara utan input.
     Med spelets egen auto-knuff (13 knuffar på 40 s) nådde den x=1059 med 2 hinder
     och x=771 med 4. Statiskt underläge: fyra hinder blev till slut en vägg.
  2. **Fri rullning var alldeles för trög**: `gravityY 1.1` + `frictionAir 0.012` gav
     ~1 px/steg. Därför nådde bollen aldrig `frameDist > 1.5` som den kontinuerliga
     rull-tillväxten krävde → radien satt kvar på ~40 → aldrig "stark" (krävde r≥70
     eller fart>6) → målen flög aldrig undan. Cirkeln var sluten.
  3. **"Fastnat"-detektorn var avstängd när barnet höll fingret nere**
     (`!this._steering`) — alltså precis när man kämpade mot ett hinder.
  Fix: hindren är nu **statiska kroppar som VÄLTER och tas bort** (press byggs upp vid
  kontakt, snabbare med storlek/fart/att barnet håller emot eller *bankar* med tap;
  välter efter ~0,6–1,4 s), spillrorna får en dynamisk kropp med kollisionsfilter så
  de aldrig kan blockera igen. Momentum (fart × storlek) avgör om bollen **plöjer rakt
  igenom** (behåller farten, +6 snö, "Pang!") eller **pressar sig förbi** (stannar en
  stund, tappar 6 i radie). Rullfysiken kalibrerad om till `gravityY 2.0` /
  `frictionAir 0.003` (~5 px/steg fri rullning), tillväxten är distansbaserad
  (0,022/px, ackumulerad), stuck-detektorn gäller även under drag, bara ETT hinder kan
  pressas åt gången och hinderavståndet är garanterat ≥150 px.
  **Bevis att det går att klara:** telemetri i webbläsaren (modulen läst live) —
  *helt utan input* klarades nivå 0→4 på 26 s (varje hinder välte på 0,6–0,9 s,
  noll auto-knuffar); med barnlikt drag+tap klarades nivå 0→6 på 24 s. 0 konsolfel.
  Dessutom P0-`ASSETS`: emoji-målen 🐧/📦 ersattes av **ritade** fristående föremål
  (pingvin, trälåda, liten snögubbe att plöja igenom), snögubbens 🥕/🎩 av ritad morot
  och hatt + slumpad halsduksfärg, mätarens ⛄ av en ritad minisnögubbe och mål-ringens
  ❄ av en ritad snöflinga. Ny **mottagare**: en vakt-pingvin vid mållinjen som andas i
  vila, hoppar och ropar "Hurra!" när snögubben står. Mätaren flyttad under ljudknappen.
  Rörde bara `src/games/snobollen/`.
- 2026-07-25 (2): **Längre banor + åtstramad agens** (ägarbeslut efter fixen ovan: banorna
  var ~2 s långa och bollen klarade sig själv). Två mätvärden ur förra omgången drev
  ändringen: aktivt spel klarade en bana på ~2 s, och passivt spel tog nivå 0→4 på 26 s
  helt utan input (mönster #1 i `docs/games/README.md`).
  - **Rullande kamera + lång backe.** Backen är nu en enda sluttning i världskoordinater
    (0…5700 px); allt bandbundet ligger i `this._world` som kameran panorerar i x, medan
    höjden härleds ur den utjämnade x-positionen (`_updateCamera`) så ytan alltid ligger
    på samma skärmlinje — ett hopp från en hoppkulle syns därför tydligt. Banan är
    **4100 px (nivå 0) → 5500 px (nivå 5+)** med 9–14 snöfält, 4–9 hinder, 1–3
    **hoppkullar** (ny elementtyp: en snöramp som kastar en snabb boll i en båge) och 8
    **vimplar** som spelar varsin ton i C-durskalan när man passerar dem (hörbar framfart).
    Backen ritas i SKÄRMRYMD som en statisk polygon (kameran håller ju linjen konstant) och
    fick en blå djupgradient — förut var det vit boll på vit backe.
  - **Barnet driver bollen.** Lutning 0,16 → 0,10 rad och `frictionAir` 0,003 → 0,010:
    gravitationen ger en långsam rullning (~1,5 px/steg) men bär aldrig hela vägen.
    Styrningen (tak 4,4 px/steg) + knuffen (+4,5, som mest var 0,3 s) är motorn.
  - **Pressen mot ett hinder byggs bara av barnets insats** (fart in i hindret + att hålla
    fingret framför + tap-bank). En boll som lämnas ensam mot ett hinder kommer inte förbi
    av sig själv.
  - **Autohjälpen: sen och synlig.** 4,5 s stillastående → "Jag hjälper till!" + gnistror
    + en KORT SKJUTS (inte bara en impuls — en impuls kan inte ta sig uppför en hoppkulle,
    energin räcker inte; det låste bollen i en tidig mätning). Skjutsen växer om samma
    ställe krånglar och "kvitteras" först när bollen tagit sig 160 px vidare.
  - Alla fördröjda anrop bytta till `ctx.later()`; bollens grafik flyttad till ett barn
    (`_ballArt`) så `pop`-squashen inte slåss med tillväxt-skalningen.

  **Uppmätt (telemetri i webbläsaren, spelmodulen läst live):**

  | Mätning | Resultat |
  |---|---|
  | Passivt, 60 s (noll input) | **x = 2637 / 4100 (64 %), banan EJ klarad** — tydliga stopp mot 2 hinder + en hoppkulle, men bollen rullade alltid vidare efter hjälpen |
  | Aktivt barnlikt spel (drag + tap) | **15,6 s · 21,7 s · 24,5 s** för nivå 0, 1, 2 (banan växer med nivån) |
  | Går banan att klara? | Ja — 3 banor i rad i mål: snögubbe + konfetti + vakt-pingvinen hoppar och ropar "Hurra!" |
  | Kilning med längre banor/fler hinder | Ingen. Hindren tas bort när de välter, spillrorna har kollisionsfilter. Längsta stopp i alla körningar: ~10 s vid en hoppkulle under passivt spel, löst av skjutsen |

  0 konsolfel i samtliga körningar. Rörde bara `src/games/snobollen/`.
- 2026-08-06: **Banvariation + backen syntes aldrig (rotorsak hittad).**
  - **Rotorsaken till "slät vit platta".** Backens djupgradient har aldrig synts — inte för
    att den saknades, utan för att **snöfälten låg som en vit matta över hela skärmen**.
    Ett snöfält var en naken `Graphics` med blobbarna ritade kring origo och sedan
    `position.set(x, y)` långt bort i världen; mätt i webbläsaren blev fälten upp till
    **476 000 px breda** (samma fälla som `pixi-graphics-position-bar-bug`). Fixat genom
    att baka världspositionen in i geometrin (`f.circle(x + ox, y + oy, ...)`); logiken
    använde ändå `_cx/_cy`, så inget annat behövde ändras. Samma bakning gjord på stenarna
    i dekoren. **Dessutom** ritades backens fem djupband i EN `Graphics` — då fick hela
    backen det första bandets färg. Varje band har nu en egen `Graphics`.
    *Metod: pixelmätning i skärmdumpen + lager-för-lager-gömning i en Playwright-probe —
    inte gissningar. Ingen av buggarna gav ett enda konsolfel.*
  - **Väder per bana** (`VADER`): klar sol, snöyra, kvällsljus, morgonrodnad. Byter himmel,
    backens färgramp, ett tunt färgat ljus över hela scenen och hur tätt det snöar
    (flingpoolen rymmer det tätaste vädret; `_applyVader` visar bara så många som behövs).
  - **Layoutprofil per bana** (`PROFILER`): jämn, myllrande (kortare backe, 45 % fler
    hinder), öppen (20 % längre, färre hinder, fler hoppkullar), snörik (50 % fler fält).
    Nivån sätter grunden, profilen formar banan — samma nivå kan alltså komma som två
    helt olika turer. Väder och profil lottas om per bana och aldrig samma två gånger i rad.
  - **Snö-virvel vid tillväxt.** Snöfältets `sparkle` bytt mot tio korn som sugs IN i
    bollen i en spiral och FÖLJER den under infarten (`_snowSwirl`, i fxLayer, städas i
    `_clearDynamic` + `destroy`).
  - Auto-hjälpen rördes INTE: den mjukades redan upp 2026-07-25 (2) (4,5 s, sen och synlig,
    press byggs bara av barnets insats). Köposten "mjuka upp auto-hjälpen" var alltså
    redan avklarad — docens §1/§3 beskriver fortfarande versionen före juli-omgångarna.
  - `npm run check` grön, `npm run test snobollen` 0 fel, diagnostikloggen utan fynd.
    Rörde bara `src/games/snobollen/`.
- 2026-08-04: **Snöstruktur i backen.** Nedre halvan av skärmen var en helt slät vit platta
  där känslan av en backe försvann. Backen har nu mjuka drivor (blå skugga + vit ovansida),
  glittrande snökorn och sju små granar längs den nedre delen — djup och en plats, utan att
  konkurrera med snöbollen. errorCount 0.
