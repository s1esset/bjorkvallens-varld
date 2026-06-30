# Snöbollen (`snobollen`)
> ⚙️ fysik · drag · 3–5 år · status: 📝 plan klar

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
- **[Medium] Mjuka upp auto-knuffen.** Höj `STUCK`-tröskeln och gör auto-knuffen svagare,
  mer som en "liten puff i ryggen", så barnets egna knuffar bär farten. Behåll garantin men
  gör den till sista utväg.
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
- **[Quick] Snö-virvel vid tillväxt.** När bollen äter ett fält, sug in en kort spiral av
  vita partiklar i bollen (i stället för en stillsam `sparkle`) + ett litet skärm-skutt vid
  stora smällar.
- **[Quick] Spår i snön.** Låt bollen lämna ett brett, ljust släpspår på backen — visar fart
  och väg, gör backen mindre tom.

### Progression
- **[Medium] Snögubbe-galleri / samlare.** Spara `custom.snogubbar` (görs redan) som en rad
  små snögubbar på en hylla, och låt insamlade tillbehör (hatt/halsduks-färg) variera nästa
  snögubbe — ett skäl att bygga "en till".
- **[Quick] Bana-variation:** ibland en längre backe, ibland fler mål, ibland kallare/varmare
  ljus, så turerna inte är samma layout-mall.

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
