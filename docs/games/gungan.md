# Gungan (`gungan`)
> ⚙️ fysik · tap · 2–4 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

Lova sitter på en gunga som hänger i en stadig brun A-ram på en grön äng med sol och moln.
Hon gungar lugnt fram och tillbaka i en egen pendel-integrator (period ≈ 2,5 s). Jag trycker
**var som helst** på skärmen i takt med gungandet → hon pumpas högre (resonans: en knuff nära
ytterläget tillför mest energi, men *aldrig* negativ energi, så fel timing skadar inte). Ett
prick-bågspår fylls i gult upp mot målet, och högt upp på en gren sitter ett mål (🎈/🐦/🍎…)
i en pulserande gul ring. När hon nuddar målet plockas det med gnistor + en uppflytande emoji;
sista målet på nivån → konfetti + beröm + stjärna + klistermärke, och en ny, lite svårare nivå
(längre rep, högre/fler mål) byggs. En 💪-knapp nere till vänster (grå→orange) dubblar
knuffstyrkan; ett svep > 60px ger en extra-stor knuff. Väntar jag ~5 s börjar en mjuk
auto-medvind knuffa i bästa fas och garanterar att målen nås.

**Funkar bra:** pendeln känns äkta och lugn, no-fail är vattentätt (hård vinkelspärr `THETA_MAX`,
alltid ΔE ≥ 0), bågspåret + ringen drar blicken mot målet, fler-mål-nivåerna och den fördröjda
auto-hjälpen ger genuint stigande svårighet. Lova är en namngiven, sympatisk figur. Exit-säkert
(egen integrator, inga GSAP-tweens på pendeln).

*(Skärmdump: A-ram med Lova på gungan, röd ballong i gul ring på grenen, prickigt bågspår, grå 💪-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): en **rytm-/resonanslek** där barnet upptäcker att *takt* — inte kraft —
får gungan högre. Det är fysik-pedagogik förklädd till lek: en knuff i rätt fas bygger amplitud.
Kontraktets krav på ≥2 utfalls-ändrande kontroller löses med (1) timing av trycken (`q`) och
(2) 💪-toggle + svep-knuff. No-fail garanteras av en auto-medvind som "spelar klart" om barnet
inte hittar takten, och som medvetet dröjer längre på högre nivåer så den som *kan* takta får
göra mer själv. Lova är den namngivna föraren (P0: avbildade människor heter Zacke/Alissa/
Elvira/Lova).

## 3. Vad gör det lättjefullt / tunt

Stark mekanisk grund, men flera tunna drag en kräsen förälder märker:

- **Målet är inert dekor.** 🎈/🐦/🍎 hänger orörligt i sin ring och pulsar (`breathe`) tills hon
  nuddar det. Det reagerar inte när hon närmar sig (utöver en throttlad `reveal`-gnista vid 70 %
  höjd), väntar inte, gör ingenting. Ett mål som *vinkade*, flaxade eller ryggade undan vore levande.
- **Auto-medvinden kan spela hela spelet.** Tittar barnet bara på vänder gungan, `_autoPush`
  knuffar vid varje nollgenomgång och målen samlas av sig själva. Pedagogiskt rätt (no-fail) men
  agensen kan helt försvinna — det syns ingen skillnad mellan "jag gör det" och "spelet gör det
  åt mig" annat än hur snabbt det går.
- **Endast Lova, ingen publik.** Scenen är en tom äng. Ingen som puttar bakifrån, ingen kompis i
  kö till gungan, ingen som jublar när hon når toppen. Maskoten Bobo saknas helt.
- **Trycket är platslöst.** Hela skärmen är knuff-yta — barnet ser *inte* att det puttar Lova,
  bara att hon plötsligt går högre. Ingen hand/Bobo som faktiskt skjuter på sitsen vid trycket;
  reaktionen (`pop` på Lova + gnista) är subtil.
- **Svep-knuffen är osynlig.** "Svep > 60px = extra-stor knuff" — men inget i bilden lär barnet
  detta, och skillnaden mot ett vanligt tryck syns knappt. En dold mekanik = bortkastad.
- **Ljudet är generiskt UI.** `whoosh`/`soft`/`pling`/`reveal` — inga gung-gnissel, inget
  vind-sus som stiger med farten, inget "iiih!" från Lova på toppen, ingen tonhöjd som följer
  amplituden.
- **Belöningen är standard.** Samma konfetti + stjärna som alla spel; Lova gör ingen egen
  vinstgest utöver en `pop`.

Kort sagt: en **äkta liten fysikmotor med ett dött mål och osynlig input** — kärnan är bättre än
upplevelsen runt den.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Synlig knuff.** Vid varje tryck: en liten hand/Bobo-tass (eller en färgad
  "push"-puff) bakom sitsen som skjuter till, så barnet *ser* sin handling driva Lova. Skala
  puffen med fas-kvaliteten `q` (stor puff nära ytterläget).
- **[Medium] Belöna takten tydligare.** Vid 2–3 bra knuffar i rad (`q ≥ 0.7`): en synlig
  kombo-glöd runt sitsen + stigande ton, och auto-medvinden skjuts upp ännu längre ("du klarar
  det själv!"). Gör skillnaden mellan egen rytm och auto-hjälp *kännbar*.
- **[Deep] Mål som lever.** Låt målet reagera: fågeln flaxar och hoppar ett snäpp högre när hon
  närmar sig (sikta-spänning), ballongen guppar undan i vinden, äpplet darrar. Fortfarande
  no-fail (hon når det till slut), men nu finns ett *möte*, inte bara en kollision.

### Variation & överraskning
- **[Quick] Variera målen mer.** Rotera in fjäril som lyfter, stjärna som gnistrar, kompis-emoji
  som vinkar — med olika plock-ljud per typ.
- **[Medium] Tema-cykel** som i `klambubblor`: äng → solnedgång → stjärnhimmel → höstlöv per
  några nivåer, så världen känns ny när man kommer långt.

### Juice
- **[Quick] Vind-sus som stiger med amplituden** (loopande brus vars volym/tonhöjd följer
  `this._maxAbs`) + ett mjukt gung-gnissel vid varje vändning; `whoosh` får klättra i tonhöjd ju
  högre hon redan är.
- ✅ **[Quick] Lova reagerar — håret.** *(2026-08-12)* `back`-grafiken pivoterar kring HUVUDETS
  mitt (inte höfterna) och släpar `-tanh(omega / (cap·0,5)) · 0,34`, alltså motsatt
  färdriktningen och mättat så tofsarna aldrig slår runt. Största utslag **18,8°**. Håret ligger
  mest bakom huvudet, så `_gungprobe.mjs` mäter inte rotationen utan de SYNLIGA pixlarna:
  786 i vila → 908 i full fart, **568 px byter plats**.
  ⬜ Kvar av punkten: hon skrattar/säger "iiih!" på topparna (kräver ett röstklipp).
- ✅ **[Quick] Fartstreck.** *(2026-08-12)* Tre bågar bakom sitsen, kring samma upphängningspunkt
  som gungan — alltså exakt den väg sitsen tar. Tröskel vid 34 % av fartaket; under den ritas
  ingenting alls. **Avsteg från förslaget:** de ligger i en återanvänd `Graphics` i `_root`, inte
  som streck i `fxLayer` — det allokerar noll per bildruta, har inga tweens att städa och rivs
  med roten, alltså exit-säkert av konstruktion i stället för av disciplin.
  Uppmätt (målade pixlar, allt annat dolt): 0 · 0 · **502 · 834 · 1111 · 1125** vid 0 / 0,25 /
  0,34 / 0,50 / 0,75 / 1,0 av taket. Första versionen tonade in från noll och var **helt
  osynlig** ända upp till halva farten (alfa 0,16 mot himlen ändrar färre än 6 nivåer per
  kanal) — styrkan startar därför på 0,5. Spelet når 100 % av taket med spelets egen knuff.

### Progression
- **[Medium] "Samlat"-känsla.** Plockade mål landar i en liten krans/hylla längst ner som fylls
  över nivåer — något att återkomma till (jfr bubbelboken i `klambubblor`).
- **[Quick] Mjuk scen-crossfade** mellan nivåer i stället för hård ombyggnad.

### Karaktär & berättelse
- **[Deep] Bobo som puttar.** Maskoten Bobo står bakom gungan, ger den synliga knuffen vid varje
  tryck, hejar vid toppen och fångar de nedfallande målen i en korg vid nivåslut — en egen
  vinst-animation i stället för generisk konfetti.
- **[Quick] En kompis i kö** vid sidan som klappar händerna när Lova når ett mål (levande scen).

### Ljud
- **[Quick] Spelspecifik vinst-stinger** + verifiera att gung-/vind-/barn-SFX hämtas från
  [[real-audio-sfx]]-pipelinen (gnissel, vind, skratt) i stället för syntetiska UI-blipp.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan, ersätter gammal bygg-spec). Testat headless
  (errorCount 0), skärmdump läst. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] synlig knuff-puff + Lova-hår i farten + stigande
  vind-/knuff-ljud** — gör barnets input synlig och hörbar, störst lyft för minst risk.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Medium]:** auto-medvinden dröjer längre
  (assistDelay 5→6,5 s bas, strong 12→15 s), och EGEN takt belönas nu: bra knuffar nära
  ytterläget (q≥0.7) bygger `_goodStreak` som ger auto-hjälpen en negativ "head start"-idle
  (−upp till 3 s) → den som taktar själv skjuter hjälpen längre bort. Kombo-cue (pling + större
  pop på Lova) vid 2–3 bra i rad gör skillnaden mellan egen rytm och auto-hjälp kännbar.
  Städning: tog bort oanvänd `ctx`-param i `_pumpDown`. errorCount 0.
- 2026-08-04: **P0 ASSETS + en lekplats i stället för en tom äng.** (1) Kraft-knappens ikon var
  en 💪-emoji **inuti en grå cirkel** — exakt det ASSETS-regeln förbjuder; den ritas nu som en
  arm med ärm, biceps och knytnäve. (2) Scenen var en helt tom äng (§3 "ingen publik"): nu finns
  två träd, en sandlåda med sandkorn och grässtrån runt gungställningen. errorCount 0.
- 2026-08-06: **Båda [Deep]-punkterna + P0 ASSETS** (spår "20 spel från 🔧 till ✅").
  - **[Deep] Bobo som puttar.** Scenen hade ingen mottagare alls. Bobo står nu på gräset
    mellan trädet och ställningens vänstra ben (`BOBO_X = 300`), andas i vila, **kastar upp
    tassarna vid varje knuff** (`_boboPush(q)` — gesten skalas med fas-kvaliteten) och
    **jublar när ett mål nuddas** (`_boboCheer`). Han ritas via nya `lib/figurer.js`.
    *Första placeringen (x=178) lade honom rakt under "starkare knuff"-knappen* (centrum 150,
    radie 80) — syntes bara i skärmdumpen.
  - **[Deep] Mål som lever.** Nästa osamlade mål känner att hon närmar sig: `near` beräknas ur
    `_maxAbs / t.amp` och styr både hoppfrekvens och hopphöjd, plus en liten lutning. Vid
    halva vägen guppar det lugnt, vid full höjd hoppar det ivrigt — ett *möte* i stället för
    en kollision. Rent per-frame i `_update` (inga tweens att städa) och helt no-fail: målet
    flyttar sig aldrig utom räckhåll, det hoppar på stället.
  - **[Quick] Synlig knuff.** En puff trycker till BAKOM sitsen vid varje pump, skalad med `q`.
  - **P0 ASSETS:** målen (🐦🍎🎈🦋🌟🍏) var emoji-Text i fontSize 90 — det är sakerna Lova ska
    nudda, alltså spelobjekt. Nu `drawIcon`. 🍏 saknades i biblioteket och lades till.
  - Exit-säkert: `_boboIdle` och Bobos skal-tweens dödas i `destroy`.
