# Spindelnätet (`spindelnatet`)
> ⚙️ motorik · tap · 2–4 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En stjärnhimmel med en mörk markremsa nederst. Mitt i bilden sitter en gosig, helt egen liten
**webb-hjälte** (pytteliten figur i röd dräkt med svarta nät-linjer och stora vita ögon — INTE
Marvels Spindelmannen) i sitt vita spindelnät. Godis och krypljus (🍬🍭🍫🐛🪲) regnar ner som
riktiga matter.js-kroppar under mjuk gravitation. Jag trycker nära ett fallande föremål → en vit
nättråd skjuts ut med ett "whoosh", fångar kroppen (tas ur fysiken) och drar in den glidande i
nätet; en nät-mätare uppe till vänster tickar upp ett godis-steg. Tre kontroller ändrar utfallet:
(A) **var/när** jag trycker (sikte + timing), (B) en stor lila **"Bredare nät"-knapp** nere till
höger som i ett svep fångar ALLA föremål inom en stor radie och laddar långsamt om (synlig
ladd-ring), (C) jag kan **dra spindeln i sidled** för bättre vinkel. Missar studsar mjukt i marken
(kvar fångbara en stund, sedan pensioneras de), och en snäll auto-hjälp fångar själv om jag väntar
för länge. Samla X godis → stort firande + ny, lite svårare omgång (snabbare regn, hårdare
gravitation, fler på skärmen).

**Funkar bra:** nät-skottet (utskjut → indrag → "landa i nätet") är en härlig tvåstegs-juice, den
egna webb-hjälten är charmig och tydligt icke-Marvel, three-kontroll-djupet (sikte + bred + drag)
är ovanligt rikt, no-fail är robust (golv-garanti håller ≥2 föremål i luften, auto-hjälp vid 6 s).
Exit-säkert (matter.js + strand-tweens städas).

*(Skärmdump: natthimmel, röd webb-hjälte i nät, mätare med 1 godis ifylld, krypljus fallande, lila bred-knapp med ladd-ring.)*

## 2. Ursprunglig plan & tankeprocess

Designintentionen (ur kodhuvudet): en **skördarlek** med ren orsak-verkan-glädje — tryck, tråd
flyger, fångst glider in, mätaren fylls. Den valde matter.js för att fallet ska kännas levande
och oförutsägbart (varierad fart, liten rotation, studs). De ≥2 utfalls-ändrande kontrollerna är
medvetet *tre* (tryck-sikte, bred-svep med omladdning som kostnad, drag för vinkel) för att ge
äldre 2–4-åringar något att bemästra utan att straffa de minsta. Den röda webb-hjälten ritades
helt programmatiskt för att vara "superhjälte-cool" men juridiskt och tematiskt fristående.

## 3. Vad gör det lättjefullt / tunt

Genuint rikt spel, men några tunna kanter:

- **Hjälten gör nästan inget av sig själv.** Han sitter still i nätet, `pop`:ar vid fångst och
  `wiggle`:ar vid tomt tryck — men han **flaxar inte med armen, vänder sig inte mot bytet, följer
  inte fallande godis med blicken**. Skjut-posen är fryst. En levande jägare som lutar sig och
  siktar vore mycket mer närvarande.
- **Trådens ursprung är fast.** Tråden skjuts alltid från `_baseX, BASE_Y` (spindelns mitt), inte
  från hans lyfta hand — kopplingen "han kastar nätet" blir lite frånkopplad.
- **Mätaren är abstrakt.** Fångster blir identiska 🍬-prickar i ringar, oavsett om jag fångade en
  🐛 eller 🍭. Det jag faktiskt fångade tappas — ingen "skafferi/skattkista" där de samlade
  godisarna/krypen ligger kvar som något att se tillbaka på.
- **Golv-föremål är döda.** Det som landar studsar lite, jitter-kryper slumpvis (`Math.random()
  < 0.008`) och pensioneras tyst efter 9 s. De är fortfarande fångbara men känns som skräp som
  städas bort snarare än kryp som lever/kryper iväg målmedvetet.
- **Auto-hjälpen kan ta över.** Vid 6 s idle fångar `_autoHelp` det lägsta föremålet själv med
  "Titta, jag hjälper till!" — bra no-fail, men för ett barn som tvekar lite kan spelet spela sig
  självt. Lockningen (`breathe` vid 3 s) är enda mellansteget.
- **Ljudet är generiskt.** `whoosh`/`pling`/`pop`/`match`/`soft`/`reveal` — inget klistrigt
  "tjong/sproing" när tråden fäster, inget mums/knapr när godiset landar i nätet, ingen stigande
  ton vid bred-fångst-kaskaden. TTS säger "Bra fångat!".
- **Belöningen är standard** `bigCelebration` + stjärna; hjälten gör bara dubbel-`pop`. Ingen
  egen "full mage / nätet bågnar"-finish.

Kort sagt: mekaniskt ett av de djupare spelen, men **jägaren och bytet saknar liv**, och det jag
fångar försvinner in i abstrakta prickar.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Levande jägare.** Låt hjälten vrida torso/huvud mot närmaste fallande föremål och
  luta sig lätt åt det hållet (billig lerp av rotation/skew mot `_lowestItem`), och faktiskt
  **flaxa skjut-armen** vid varje skott. Skjut tråden från handens världsposition, inte basens.
- **[Medium] Kombo-fångst.** Två föremål nära varandra som fångas i samma tråd-skott (eller inom
  ~0,4 s) ger en synlig "dubbel!" + extra gnista — belönar sikte utan svårighetsstraff.
- **[Deep] Levande byte.** Ge krypen (🐛🪲) egen krypbana på marken (mot en spricka/hål) i stället
  för slump-jitter; godis (🍬🍭) ligger still och glittrar. Att de *vill iväg* gör fångsten mer
  meningsfull (fortfarande no-fail — auto-hjälp kvar).

### Variation & överraskning
- **[Quick] Sällsynt guldgodis** (✨-omramat) som ger en liten gnistkaskad + fyller två
  mätar-steg — ett "wow" likt regnbågsbubblan.
- **[Quick] Väder/scen-variation per nivå:** månfas, eldflugor, ett dis — så natthimlen inte är
  identisk varje omgång.

### Juice
- **[Quick] Klistrigt trådljud.** Lägg ett "tjong/sproing" vid trådfäste och ett mjukt "mums/
  plopp" när bytet landar i nätet; vid bred-kaskaden en stigande ton per fångst.
- **[Quick] Nätet reagerar.** Låt `_web` darra/svikta lätt (kort scale-puls) varje gång ett byte
  landar — nätet "tar emot" tyngden.
- **[Quick] Trådens indrag** kan få en liten elastisk översläng (`back.out`) så fångsten studsar
  in i nätet i stället för rak glidning.

### Progression
- **[Medium] Skafferi/skattkista.** De faktiska fångade emojierna samlas i en liten rad/burk vid
  mätaren (inte bara 🍬-prickar) som fylls över omgångar — något att minnas och återkomma till.
- **[Quick] Mätaren bågnar vid full** (hela panelen studsar + glittrar) som tydlig "klart!".

### Karaktär & berättelse
- **[Deep] Hjälten äter/firar.** Vid målet: nätet fylls synligt och hjälten gör en egen
  glädje-gest (hoppar i nätet, kramar om en godisbunt) i stället för generisk konfetti — en
  spelspecifik finish.
- **[Quick] Bobo eller en kompis-insekt** som hejar från kanten när mätaren fylls.

### Ljud
- **[Quick] Riktiga SFX från [[real-audio-sfx]]:** tjong/sproing, mums, kryp-prassel — ersätt de
  syntetiska blippen och TTS-"Bra fångat!" med förgenererade klipp.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan, ersätter gammal bygg-spec). Testat headless
  (errorCount 0), skärmdump läst. Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] levande jägare (vrid mot byte + flaxa armen, skjut från
  handen) + [Quick] klistrigt tråd-/mums-ljud** — ger jägaren och fångsten det liv kärnloopen saknar.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Levande jägare: hjälten lutar sig nu mjukt
  (billig rotations-lerp i ticker) mot närmaste/lägsta fallande föremål, och skjut-armen bröts ut i
  en egen container med pivå vid axeln så den **flaxar** vid varje skott. Nättråden ritas nu från
  **handens världsposition** (`_handPos` via toGlobal/toLocal) i stället för basen — den följer drag,
  luta och flax live. Klistrigt ljud: ett stigande "tjong/sproing" (`audio.tone`) när tråden fäster,
  ett mjukt "mums/plopp" när bytet landar i nätet, och en stigande ton per fångst i bred-kaskaden
  (`_capture({cascade})` tystar då per-fäste-tjonget så det inte blir rörigt). Allt exit-säkert:
  arm-tween pushad i `_tweens` + `gsap.killTweensOf(this._shootArm)` i destroy. Testat headless med
  taps + spindel-drag (errorCount 0), skärmdump läst.
- 2026-08-04: **P0 ASSETS — bytena är riktiga föremål.** Alla fem byten ritas nu (`makeTreat`):
  karamell med snurrade ändar, **klubba med färgspiral**, chokladkaka med rutor och omslag,
  larv med antenner och skalbagge med prickar — de var 🍬/🍭/🍫/🐛/🪲-emoji. Även den breda
  fångstknappens nät-emblem och mätarens nät-ikon ritas (åtta ekrar + tre spiralringar) i
  stället för 🕸️, och mätarens fångst-prickar är ritade karameller i stället för 🍬.
  errorCount 0.
