# Ballonglyft (`ballonglyft`)
> 🔤 larande · tap · 2–4 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

Elvira (🧒) står på en träbalkong högt upp till höger, med en **tankebubbla** som visar
målet: ett tal + 🎈 (t.ex. "4 🎈"). Bobos present (🎁, rödrosa med gult band) vilar på en
solig ängsbakgrund nedanför, och en blek **spök-present** vid balkongen visar hela tiden
vart den ska. Jag trycker på den stora gröna knappen "Fäst ballong" (eller direkt på
presenten) → en heliumballong dyker upp i en solfjäder ovanför paketet, snören ritas till
den, räknaren uppe till vänster tickar upp, rösten **räknar på svenska** ("en", "två",
"tre"…), och presenten lyfts ETT tydligt, lugnt gsap-steg uppåt. När sista ballongen sitter
glider paketet in i Elviras famn → `correct`, burst, hon poppar glatt, firande + klistermärke,
och en ny nivå med fler ballonger laddas (N växer 3→8, balkongen lite högre). Trycker man när
alla redan sitter → bara en wiggle + `soft`. Efter ~5,5s utan tryck fäster en mjuk auto-hjälp
en ballong åt barnet.

**Funkar bra (nyligen ombyggt → berikning, inte räddning):** målet är *synligt* (tankebubblan
+ räknare + spök-present), inte bara talat — utmärkt för icke-läsare. Räknandet är knutet till
en konkret, tydlig handling (1 tryck = 1 ballong = 1 steg upp). Solfjäder-ballongerna med
bobbande snören ser fina ut. No-fail, exit-säkert, generös träffyta.

*(Skärmdump: Elvira på balkong med "4 🎈"-bubbla, present med 3 röda ballonger lyft halvvägs,
räknare "3", grön "Fäst ballong"-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: räkna ballonger som lyfter (2–4 år). Elvira önskar sig ett antal; varje tryck
fäster en ballong som lyfter presenten ett *tydligt steg*, räknat högt. Designvalet är
medvetet **avskalat** mot en tidigare, mer fysik-tung idé (sväva, "lagom/för många", studsa i
tak): den nuvarande versionen valde bort fjäder/studs till förmån för enkla, läsbara
gsap-steg så att 2-åringen *förstår* exakt vad som händer — 1:1-mappning mellan tryck, tal och
höjd. Spök-present + tankebubbla + auto-hjälp är no-fail-grepp. Pedagogiken: räkneramsan
1→N med synligt antal (ballonger) ↔ siffra (räknare) ↔ talord (röst).

## 3. Vad gör det lättjefullt / tunt

Polerat och tydligt — men som *räknespel* och *scen* finns tunna drag:

- **Bara framåträkning av identiska tryck.** Varje tryck är exakt likadant: samma knapp,
  samma ballong, samma steg. Det lär "rabbla 1→N", men aldrig *antalsuppfattning* (subitize),
  jämförelse ("räcker 3?"), eller att räkna *föremål* — barnet trycker en knapp N gånger.
- **Målet kräver inget val.** Tankebubblan säger "4", barnet trycker tills det stannar. Det
  finns ingen bedömning av "hur många behövs" (den ursprungliga lagom/för-många-spänningen
  ströks). Auto-hjälpen efter 5,5s gör dessutom jobbet om barnet pausar — agensen är tunn.
- **Alla ballonger är identiska röda 🎈.** Ingen färg-/storleksvariation, inget att räkna
  *olika* sorter, ingen "två röda och en blå". En enda emoji upprepad N gånger.
- **Elvira är en generisk 🧒-emoji.** Hon "är" Elvira bara via en namnskylt — inget ansikte,
  ingen karaktär, ingen idle-animation (hon väntar orörlig). Hon poppar en gång vid mottagning
  och det är hela hennes roll.
- **Tunn, statisk scen.** En `meadow`-bakgrund och en balkong. Inga moln som driver, ingen
  vind, inga fåglar, inget som händer mellan tryck. Presenten bobbar inte ens på väg upp.
- **Generisk finish + grunt innehåll i presenten.** Paketet når Elvira → standard-firande.
  Presenten öppnas aldrig, inget kommer ur den, ingen "vad var det i paketet?"-nyfikenhet.
- **Ljudet är UI-blip.** `pop`/`pling`/`correct`. Inget ballong-gnissel vid fäst, inget
  helium-"fffp", ingen stigande ton ju fler ballonger (lyft-känslan saknar ljudkurva).

Kort sagt: en **tydlig räkneknapp med fin presentation**, men räknandet är mekaniskt,
ballongerna och Elvira är rekvisita, och paketets innehåll (anledningen att bry sig) visas
aldrig.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Räkna riktiga ballonger, inte knapptryck.** Visa N "lösa" ballonger som flyter
  i nederkanten; barnet *trycker på var och en* för att skicka upp den. Då räknar barnet
  **föremål** (ett-till-ett-korrespondens, kärnan i tidig matematik), inte en knapp.
- **[Medium] Inför ett mjukt val ("räcker det?").** Behåll no-fail men låt barnet *bestämma
  sig*: en "Skicka iväg!"-knapp som lyfter paketet baserat på antalet just nu. För få →
  paketet stiger glatt en bit, dansar och kommer ner igen ("nästan! en till?") — aldrig fel,
  men nu *betyder* antalet något och barnet jämför.
- **[Quick] Skjut upp auto-hjälpen** från 5,5s till ~9s och låt den först *peka/locka*
  (Elvira vinkar, en ballong studsar) innan den fäster åt barnet — så barnets räknande får
  utrymme.

### Variation & överraskning
- **[Quick] Färgade ballonger** ur PLAYFUL i stället för identiska röda — vackrare, och öppnar
  "räkna de röda" / mönster (röd-blå-röd) i högre nivåer.
- **[Medium] Variera önskemålet.** Ibland önskar Elvira "2 röda + 1 gul" (tankebubblan visar
  det) → barnet räknar *sorter*. Samma mekanik, rikare räkning.

### Juice
- **[Quick] Ljudkurva för lyft.** Stigande tonhöjd per ballong (klättrar mot målet) + ett
  mjukt helium-"fffp" vid fäst och ett litet gnissel. Gör räknandet hörbart som en uppåtgång.
- **[Quick] Levande paket + ballonger.** Låt paketet gunga/vrida sig lätt medan det stiger
  och ballongerna studsa till vid varje ny — i stället för ett stelt steg. Litet damm-/
  glitterspår uppåt.

### Progression
- **[Quick] Mjuk parallax-himmel.** Driv moln, en sol som ler, kanske en fågel — så väntan
  mellan tryck inte är en stillbild. Vid nivåbyte: en mjuk höjning av kameran/balkongen.
- **[Medium] Paketet öppnas.** När Elvira tar emot → paketet spricker upp och en överraskning
  hoppar ut (ett djur, en leksak ur en pool) som hon kramar. Gör leveransen meningsfull och
  ger en "en till!"-anledning.

### Karaktär & berättelse
- **[Deep] Levande Elvira.** Ersätt 🧒 med en liten ritad Elvira (eller åtminstone idle-
  animationer: hon tittar ner, vinkar, hoppar av otålighet, sträcker sig efter paketet). Låt
  henne *räkna med* ("…tre! En till!") och jubla vid mottagning — en mottagare som bryr sig.

### Ljud
- **[Quick] Variera räkne-frasen + lägg pop-vid-fäst som riktigt klipp** ([[real-audio-sfx]]).
  Ett mjukt "tack!" från Elvira (förinspelat) vid leverans i stället för generiskt `correct`.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + headless playtest (errorCount 0; skärmdump
  verifierad: Elvira + tankebubbla "4 🎈", present lyft med 3 ballonger, räknare "3"). Ersatte
  gammal build-spec med granskningsdoc. (Spelet nyligen ombyggt → fokus på *berikning*.)
- Rekommenderad första-omgång: **[Medium] räkna lösa ballonger (ett-till-ett) + [Medium]
  paketet öppnas med överraskning + [Quick] stigande lyft-ljud** — gör räknandet riktigt
  matematiskt och leveransen meningsfull, helt inom no-fail.
- 2026-07-02: **Första-omgång IMPLEMENTERAD** (errorCount 0, skärmdump verifierad):
  - **Räkna riktiga ballonger (ett-till-ett).** Den gröna "Fäst ballong"-knappen är borttagen.
    Nu spawnas N *lösa, färgglada* ballonger (ritade i Pixi Graphics, färger ur `PLAYFUL`)
    längs nederkanten — en per önskad ballong. Barnet trycker på en ballong i taget (generös
    hitArea 104×130 ≥96px); den flyger upp och fäster i buketten ovanför paketet, räknaren
    tickar, rösten räknar på svenska och paketet lyfts ett steg. Barnet räknar nu FÖREMÅL.
  - **Paketet öppnas med överraskning.** Vid mottagning glider paketet in i Elviras famn,
    `🎁` göms, `reveal`+burst+sparkle spelas, och en överraskning ur en pool (🐻🐰🐤🐶🐱🦊🧸🐧)
    hoppar upp ur paketet och in i Elviras famn — hon poppar/kramar. Röst: "Titta, en <djur>!
    Tack så mycket!" Nivåbytet skjuts till 2,7s så överraskningen hinner spelas.
  - **Stigande lyft-ljud.** Per fäst ballong: mjukt helium-"fffp" (`audio.tone` 680→1500 Hz)
    + en STIGANDE lyft-ton vars tonhöjd klättrar med antalet mot målet (~380→900 Hz).
  - **Mjukare, senare auto-hjälp.** Skjuten från 5,5s till 9s och tvåfasad: LOCKAR först
    (Elvira vinklar, en ballong studsar, 👆 + röst "Tryck på en ballong till!"), och först
    efter ytterligare 3,5s fäster den en ballong åt barnet ("Jag hjälper dig — en ballong
    till!"). Att trycka på paketet är rent lekfullt (wiggle + soft + "Tryck på en ballong!").
    Allt exit-säkert (proxy-tweenad överraskning, `_alive`/`destroyed`-vakter, städat i
    destroy + vid nivåbyte).
