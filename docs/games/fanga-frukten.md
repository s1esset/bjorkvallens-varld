# Fånga Frukten (`fanga-frukten`)
> ⚙️ fysik · drag · 2–5 år · status: 📝 plan klar

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
- **[Quick] Specialfrukt.** En glittrande guldfrukt (fyller två platser), en jätteklase
  (studsar roligt), en regnbågsfrukt. Sällsynta wow-ögonblick, rotera per nivå.
- **[Quick] Trädet lever.** Lövverket guppar, och en gren *skakar* + släpper synligt varje
  frukt (liten bladpuff vid släpp) så fallet får en orsak.

### Juice
- **[Quick] Riktigt mums-ljud + knaprande** vid fångst (i stället för `pop`), och en stigande
  pling-kombo om man fångar flera i rad. Korgen squashar tydligare när den slukar.
- **[Quick] Fångad frukt syns i korgen** en kort stund (staplas vid munnen) innan den tuck:as,
  så det känns som att korgen *fylls*.

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
