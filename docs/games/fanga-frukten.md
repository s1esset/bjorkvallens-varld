# Fånga Frukten (`fanga-frukten`)
> ⚙️ fysik · drag · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En glad äng (gradient-himmel, sol, moln, kullar) med ett lövverk längst upp så frukten ser
ut att falla ur ett träd. Frukter (🍎🍌🍓🍐🍊🍇) faller som riktiga matter.js-kroppar under
mjuk gravitation. Jag tar i **var som helst** på skärmen och drar — en flätad korg glider
mjukt i sidled dit. Faller en frukt i korgmunnen (en osynlig sensor som följer korgen)
fångas den med en saftig plopp, gnistor och räknas upp i en mätare (korg + N platser uppe i
mitten); frukt som nuddar kanten studsar lekfullt; missad frukt landar med en mjuk puff.

En snäll, **växande "magnet"** drar fallande frukt mot korgen, och efter ett par missar
släpps frukten rakt över korgen — så målet alltid nås. Fånga N frukter (3→6 med nivån) →
delat firande + stjärna + klistermärke + ny nivå (frukt släpps lite tätare). Idle ~6s → röst.

**Funkar bra:** fångst-känslan är mjuk och generös (stor sensor, fartgränsat fall), no-fail är
solitt, mätaren visar *vilka* frukter man fångat (emoji), exit-säkert.

*(Skärmdump: ängsscen, lövverk i topp, ett päron på väg ner, flätkorg nere till höger, mätare
med korg + 3 tomma platser uppe i mitten.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver en klassisk "fånga-fallande-saker"-motoriklek, men byggd på *riktig*
fysik (frukten är matter-kroppar, korgen en öppen skål med studsiga kant-knoppar + sensor)
i stället för skript. Avsikten: hand-öga-koordination för småttingar, med generösa marginaler
och en osynlig hjälp-magnet som garanterar succé. Den uppräknande mätaren med fångade
frukt-emoji ger en liten "titta vad jag samlat"-känsla.

## 3. Vad gör det lättjefullt / tunt

En trevlig MVP, men loopen är tunn och scenen folktom:

- **En enda kontroll, ett enda utfall.** Dra korg → fånga. Det finns inget *val* som ändrar
  utfallet (ingen storlek/snabbhet att växla, inga olika korgar). Det är ren reaktion.
- **Magneten + över-korg-spawn spelar spelet åt dig.** `assistA = 0.0005 * (1 + m*1.3)` växer
  med varje miss och drar frukten mot korgens x; vid `misses >= 3` föds frukten rakt ovanför
  korgen. En passiv spelare fyller mätaren ändå — agensen tunnas ut till noll.
- **Ingen mottagare/publik.** Korgen *fylls* men ingen äter frukten, ingen figur blir mätt
  eller jublar. Frukten ploppar ner och försvinner (`_tuck`) — den blir inget.
- **Frukten saknar variation.** Tre nästan omärkliga storlekar, ingen specialfrukt (guldäpple,
  jätteklase, regnbågsfrukt), inga roliga "vad var det?"-överraskningar.
- **Trädet är en bluff.** Lövverket är statiska gröna cirklar i toppen; det skakar inte,
  släpper inte synligt frukten, har ingen stam. Resten är tom himmel.
- **Generisk belöning + tunt ljud.** `correct`/`celebrate` + standardkonfetti; fångst är
  `pop`, miss/studs är `soft`. Inget mums-ljud, inget knaprande, ingen kombo för snabba fångster.

Kort sagt: *mjuk och snäll, men ingen anledning att bry sig* — man fångar frukt åt ingen,
i en tom värld, och hjälpen gör att man knappt behöver röra korgen.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] En hungrig mottagare som behöver din hjälp.** Sätt ett djur/Bobo vid korgen som
  vill ha *vissa* frukter ("Jag vill ha bananer!") — då blir dra-och-fånga ett val (fånga rätt
  sort) och frukten har en mening. Fel frukt är fortfarande kul (djuret fnissar, ingen poäng).
- **[Quick] Dämpa hjälpen lite.** Behåll no-fail, men låt magneten kicka in senare/svagare så
  barnet känner att *det* fångade frukten de första gångerna. Glid-hjälpen kvar som backstop.

### Variation & överraskning
- ✅ **[Quick] Specialfrukt — guldfrukten.** *(2026-08-12)* En glittrande guldfrukt (~1 på 9
  släpp) som fyller **två** platser i mätaren, faller långsammare och firas med en stigande
  treklang. Aldrig nivåns första frukt och aldrig två samtidigt. Mätvärden i §5.
  *(Jätteklase och regnbågsfrukt är INTE byggda — en sällsynthet till som konkurrerar om
  samma ögonblick gör ingen av dem sällsynt. Tas om guldfrukten visar sig bära.)*
- ✅ **[Quick] Trädet lever.** *(byggt sedan tidigare, aldrig struket här — verifierat i kod
  2026-08-12)* Lövverket andas (`index.js:174`) och `_shakeBranch` skakar grenen + släpper en
  bladpuff där frukten lossnar (`:421-430`).

### Juice
- **[Quick] Riktigt mums-ljud + knaprande** vid fångst (i stället för `pop`), och en stigande
  pling-kombo om man fångar flera i rad. Korgen squashar tydligare när den slukar.
- ✅ **[Quick] Fångad frukt syns** *(byggt sedan tidigare, verifierat 2026-08-12)* — mätaren
  ritar de faktiska frukterna barnet fångat (`_drawMeter`, `:630`), inte abstrakta prickar.

### Progression
- **[Medium] Korgen blir full på riktigt.** I stället för en abstrakt prick-mätare: en korg
  som visuellt fylls med de fångade frukterna, och vid nivåklart bär man fram den till djuret.

### Karaktär & berättelse
- **[Deep] Liten skördehistoria.** Mata djuret/Bobo nivå för nivå (mätt-mätare, glad min) — en
  egen finish (djuret rapar belåtet, klappar) i stället för generisk konfetti.

### Ljud
- **[Quick] Riktiga SFX** (knapr, plopp, "mums") via SFX-pipelinen ([[real-audio-sfx]]) när
  MOSS kör; variera vinst-stinget.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] hungrig mottagare (väljer frukt) + [Quick] specialfrukt
  + mums-ljud** — ger både agens, variation och en själ åt en idag funktionell men tom lek.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Quick]:** magneten är nu HELT av de första
  försöken (ingen baslinje-dragning vid 0 missar); den smyger in först från misses≥2 och svagt
  (0.00045·(m−1)) som backstop. Över-korg-spawn kvar vid misses≥3 som sista garanti → barnet
  fångar själv först. Städning: tog bort oanvänd `ctx`-param i `_loadLevel`. errorCount 0.
- 2026-08-04: **Andra omgången** (errorCount 0) — mottagare, riktigt träd och ritade frukter.
  - **En hungrig kompis** (§4 [Medium], det stora lyftet): en ritad **ekorre sitter på grenen**
    och önskar sig en sort ("Jag vill ha en banan!") som visas som ritad frukt i en önskebubbla.
    Den önskade sorten faller oftare (42 %) så önskan går att uppfylla; fångar man rätt sort
    hoppar ekorren högt, viftar på svansen och får en glad treklang, sedan önskar den sig något
    nytt. Fel sort är fortfarande kul — ekorren guppar till, ingenting går förlorat.
    Att välja VILKEN frukt man fångar blev därmed ett riktigt val.
  - **P0 ASSETS:** alla sex frukter ritas nu med egen silhuett (äpple, banan, jordgubbe med
    frön, päron, apelsin med skalstruktur, vindruvsklase) — även mätarens frukt- och korgikon.
    Inga emoji-rekvisita kvar bland spelobjekten.
  - **Trädet är ett riktigt träd** (§3 "trädet är en bluff"): tjock stam till vänster, tre
    grenar ut över scenen och ett lövverk som andas. **Grenen skakar + en bladpuff** vid varje
    släpp, så fallet får en synlig orsak.
  - **Bugg:** `gsap.delayedCall` → `ctx.later()`; lövverkets, ekorrens och önskebubblans
    tweens dödas i `destroy`.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): lövverkets nio stora cirklar (r 86–110) fick `sphereFill` — de var platta skivor och är nu kronor med volym.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-12 ✅ **Specialfrukt: guldfrukten [Quick]** (v1.162.0): ett sällsynt wow-ögonblick i
  ett spel där alla frukter tidigare var värda exakt lika mycket. Guldfrukten ritas som
  spelets EGEN äppelsilhuett i guld med en glansstjärna (P0 ASSETS — den ska läsas som "en av
  frukterna, fast sällsynt", inte som ett främmande föremål), gnistrar hela vägen ner, faller
  långsammare och **fyller två platser i mätaren**. Fångst firas med en stigande treklang
  (523·659·784·1047 Hz) och repliken *"En guldfrukt! Den räknas dubbelt!"* (klipp genererat).
  Ekorren blir lika glad som av en uppfylld önskan, men **önskan nollställs inte** — guld är
  inte en genväg förbi valet, det är en bonus vid sidan av det.
  **Mätt** (`node scripts/_guldprobe.mjs [--bild]`, 10 punkter): **96 av 900 släpp = 10,7 %** ·
  **0 av 200** släpp före första fångsten (aldrig nivåns första frukt) · mest **1** i luften
  samtidigt över 400 släpp · faller **175 px mot en vanlig frukts 211 px** på 70 bildrutor
  (samma storlek, sluthastighet 2,75 mot 4,49) · **4 gnist-emissioner** mot 0 för en vanlig
  frukt · **+2** i räknaren och två poster i mätaren mot en vanlig frukts +1 · exit medan en
  guldfrukt faller lämnar 0 konsolfel.
  ⚠️ **BÅDA de röda sonderna var sondens fel, inte spelets** (nionde gången i repot):
  1. **Räkna aldrig `fxLayer.children` för att mäta partiklar.** `sparkle()` går genom
     partikelvägen (`lib/partiklar.js` → `ParticleContainer`), alltså ETT återanvänt fält vars
     innehåll ligger i `particleChildren`. Mätningen såg "1 ny fx-nod" och läste som att
     glittret inte fungerade — den räknade fältet, inte gnistorna.
  2. **Ett mätsteg måste städa efter det förra.** Bild-steget lämnade en guldfrukt i luften,
     och spelets egen spärr ("aldrig två samtidigt") gjorde då att nästa steg aldrig fick sin
     tvingade guldfrukt: rapporten blev "+1" och läste som att dubbelräkningen var trasig.
  ⚠️ **Två §4-punkter var redan byggda och stryks samtidigt** (verifierat i kod, ingen
  ändring): "Trädet lever" (lövverket andas + `_shakeBranch`) och "Fångad frukt syns i korgen"
  (mätaren ritar de faktiska frukterna). `npm run check` 0 fel/0 varningar · `npm run test` grön.
