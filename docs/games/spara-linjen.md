# Spåra Linjen (`spara-linjen`)
> ✏️ motorik · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

Ett ritbord: en gräddvit pappersyta med gul ram, och under den en trälåda med fem ritade
vaxkritor (röd, gul, grön, blå, lila). Den krita som är vald står lyft ur lådan och andas —
de andra vilar nedtonade. På pappret ligger en blek konturskiss av det jag ska rita och en
rad prickar i ordning, med en ritad pennspets i kritans färg vid den första.

Jag sätter fingret på startpricken och drar längs vägen: ENDAST nästa prick i ordningen är
aktiv — när fingret når den "tänds" den (fylls med kritans färg), ett färgat segment ritas
från föregående prick, och pennan flyttas dit med 'pling' + pop + gnista + nästa ton i en
stigande pentatonisk slinga. Byter jag krita mitt i behåller redan dragna streck sin färg,
så teckningen blir min egen färgblandning. Att hoppa till en prick längre fram gör INGET
(man kan inte fuska framåt) — den rätta nästa-pricken vinkar i stället (vingel + puls +
mjukt ljud). Strayar fingret stannar pennan kvar, aldrig omstart. Funkar lika bra med
tap-tap som med drag.

Står jag stilla ~6s → vänlig recue + vink; ~14s → EN prick tänds automatiskt (auto-hjälp),
sedan väntar spelet på mig igen, så rundan ALLTID blir klar utan att rita sig själv. Hela
linjen färglagd → motivet vaknar (fylls, får ögon och ett leende, hoppar till, säger vad det
är) eller — i kurv-rundorna — pennan hoppar till och gnistor vandrar längs spåret. Sedan ny,
svårare form. Trappan börjar på ett **motiv** (berg) och varvar sedan motiv med kurvor i 18
steg; bortom planen är ~65 % motiv.

**Funkar bra:** "endast nästa prick"-regeln är genialt no-fail (ingen kan rita fel), det
växande färgade spåret känns som att man RITAR, motivet som vaknar gör att man ritade NÅGOT,
kritvalet ger ett eget bestående avtryck, formbiblioteket är rikt och stigande, pennspetsen +
pulsen visar tydligt vart man ska, tap-tap-fallbacket gör det tillgängligt.

*(Skärmdump: `.test-shots/spara-linjen.png` — berg-skiss på pappret, kritlådan under, röd
krita lyft. `.test-shots/_krit-klar.png` — färdigt berg med ögon, ritat i grönt + lila.)*

## 2. Ursprunglig plan & tankeprocess

En lugn motorik-/"rita-själv"-lek (kodhuvudet): följ prickar i ordning och se linjen
färgläggas, helt förlåtande. Designvalet att bygga en egen pekar-lyssnare (inte
DragController, som snäpper föremål) gör spårningen till en korridor man drar i. Stigande
former (vågor, spiraler, stjärna i ett drag med korsande ordning) ger handträning och
upptäckarglädje, och auto-hjälpen garanterar att varje runda går att slutföra.

## 3. Vad gör det lättjefullt / tunt

*Kvar (öppet):*

- **Prickarna är identiska grå cirklar.** Ingen siffra, ingen färg-tell, inget som skiljer
  prick 1 från prick 7 — ordningen är osynlig tills man råkar träffa rätt; en yngre tittar
  bara efter pulsen. (Puls + vingel kompenserar, så låg prioritet.)
- **Teckningen sparas inte.** Den färdiga bilden försvinner vid ny runda — ingen
  "ritbok"/galleri att bläddra i och vara stolt över.
- **Ingen rit-kompis.** Ingen figur som ritar med en och hejar; mottagaren är motivet självt,
  och kurv-rundorna har bara pennans egen glädjerörelse.
- **Inget krit-krafs.** Melodin finns, men inget riktigt "krafs" av krita mot papper
  (väntar på SFX-pipelinen).
- **Vald krita syns bäst i rörelse.** Lyft + andning + nedtonade grannar är en äkta tell, men
  i en stillbild är den diskret. Blir det otydligt i verklig speltest: en färgad platta i
  lådbotten bakom vald krita.

*Åtgärdat:* ~~linjen blir aldrig en bild~~ (motiv, 08-04) · ~~auto-hjälpen ritar åt en~~
(07-01) · ~~tom, statisk scen~~ (ritbord + kritlåda, 08-07) · ~~ljudet är UI-blipp~~
(pentatonisk melodi + stämd kritlåda) · ~~generisk belöning~~ (motivet vaknar / pennan firar)
· ~~färgen är slumpad och oförklarad~~ (barnet väljer krita, 08-07).

## 4. Förbättringar & förhöjningar (plan)

> **~~Mätt fynd 2026-08-06 (`bildkoll.mjs`)~~ — ÅTGÄRDAT 2026-08-07 (`77902dd`).**
> `gles-scen`: bara **4,3 %** av skärmen hade innehåll, repots lägsta av 71 spel (näst lägst:
> fyrverkeri 9,8 %) och det enda spel som slog ut bildkollen. **Rätt diagnos var inte att
> motiven saknades** — de fanns sedan 2026-08-04, men svårighetsplanen började på
> `genLine(4)`, så det första ett barn såg var fyra grå prickar på tomt papper. (Noteringen om
> "✏️-emoji som hela verktyget" var redan inaktuell: pennan ritades fristående sedan 08-04 —
> `icon: '✏️'` är bara brickan i biblioteket.) Fix: motiv redan från runda 1 + kritlåda under
> pappret. Mätt efter: inga bildkollsfynd.

### Kärnloop & agens
- ✅ **[Medium] Prickarna bildar en bild.** *(2026-08-04)* Blek motiv-silhuett bakom prickarna;
  vid sluten linje fylls motivet, får ögon och liv.
- ✅ **[Quick] Senarelägg/mjuka auto-hjälpen.** *(2026-07-01)* Tänder EN prick, sedan full
  idle-reset. Teckningen ritar inte längre sig själv.
- ✅ **[Quick] Välj krita.** *(2026-08-07)* Fem ritade vaxkritor i en trälåda under pappret.
  Vald krita lyfts ur lådan och andas; färgen är linjens färg, bytbar mitt i en teckning,
  och valet minns sig mellan besök.

### Variation & överraskning
- **[Quick] Numrerade/färgtonade prickar.** Visa en svag siffra eller en gradvis ljusnande
  ton så ordningen syns även utan att gissa via pulsen.
- **[Medium] Överraskningsprick.** En glitterprick på vägen som ger extra gnistor + ett litet
  ljud, eller en prick som "släpper" en fjäril när den tänds.

### Juice
- ✅ **[Quick] Stigande melodi.** *(2026-08-04)* Varje tänd prick spelar nästa ton i en
  pentatonisk slinga; kritlådan är stämd i samma skala *(2026-08-07)*. Kvar: riktigt
  krit-/tuschkrafs via SFX-pipelinen ([[real-audio-sfx]]).
- ✅ **[Quick] Levande spår.** *(2026-08-04/08-07)* Kritdamm vid pennspetsen; kurv-rundor
  avslutas med att pennan hoppar till och gnistor vandrar längs hela spåret.

### Progression
- **[Deep] Ritbok/galleri.** Spara varje färdig teckning som en miniatyr i en bok (bakom
  parental gate i Settings, eller en in-game hylla) — något att samla och vara stolt över.
- **[Quick] Tema per motiv.** Bakgrunden byter mjukt med motivet (hav för fisken, natthimmel
  för stjärnan) så varje runda känns som en ny sida.

### Karaktär & berättelse
- **[Deep] En rit-kompis.** En liten figur (Bobo med en krita / Elvira) som "ritar med", följer
  pennspetsen och hejar, och vaknar till liv i den färdiga teckningen — ger en egen
  vinst-animation i stället för generisk konfetti.

### Ljud
- **[Quick] Lugn pyssel-ambient** + varierat berömsting (PRAISE varieras redan — verifiera).

## 5. Status / loggar

- 2026-08-10 🎨 **D1: pappret ligger på ett bord i stället för att vara ett hål**
  (`3e239b4`, v1.96.0). `_plattprobe`s eget filhuvud kallar ett vitt ritpapper *legitimt*
  platt — och det stämmer så länge det ser ut som PAPPER. Det gjorde det inte: **342 352 px
  (37 % av skärmen) i EN ton**, utan skugga och utan yta under.
  Arket fick en svag lodrät toning (`verticalFill`) och en mjuk skugga — skuggan som en
  EGEN Graphics, eftersom den i papprets egen hade vuxit den interaktiva spårningsytan.
  Toningen är medvetet mycket svagare än t.ex. fotbollsplanens: **barnets kritstreck är
  innehållet här, och arket får aldrig konkurrera med det.**
  Spelet ritar nu också sitt SKRIVBORD. Filhuvudet har alltid sagt att scenen är ett bord
  med papper och kritor, men ingen yta ritades — spelet lutade sig mot skalets `COLORS.bg`.
  Så fort pappret slutade vara platt blev bordet spelets största fält (335 511 px).
  **Mätt** (största enskilda fältet, bakgrunden medräknad): **342 352 → 49 444 px**. Före
  låg papper + bord på 677 863 px i två toner = 73 % av skärmen; efter är det största
  fältet kritlådans trä (5,4 %), och det är legitimt platt.
- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; drag tände prickar och ritade färgat segment till pennan).
- Rekommenderad första-omgång: **[Medium] prickar som bildar ett motiv + [Quick] krit-ljud/
  stigande melodi + [Quick] mjukare auto-hjälp** — gör spårandet till att rita NÅGOT.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Quick]:** auto-hjälpen ritade förut hela
  formen själv vid passivitet (tände en prick var ~5:e s via `_idle = IDLE_DELAY`-återarmering).
  Nu tänds bara EN prick, sedan full idle-reset (`_idle=0`, `_cued=false`) → ny recue och lång
  väntan på barnet igen; AUTO_DELAY 11→14 s. Teckningen ritar inte längre sig själv, men rundan
  går ändå alltid att slutföra (no-fail). Städning: oanvänd `ctx`-param bort ur `_buildRound`.
  errorCount 0.
- 2026-08-04: **Andra omgången** (errorCount 0) — **linjen blir en bild**. Detta var §3:s
  tyngsta punkt och är nu åtgärdad.
  - **Motiv** (§4 [Medium], det stora lyftet): åtta motiv (`MOTIFS`) vars kontur barnet
    spårar — **berg · hus · moln · fisk · hjärta · katt · stjärna · blomma**. En blek
    konturskiss ligger bakom prickarna så man ser vad det ska bli. När linjen sluts
    **fylls motivet med färg, får ögon och ett leende, hoppar till och säger vad det är**
    ("Titta, ett berg!"). Vägledningsprickarna tonar bort så bilden syns ren.
    Berget får snötopp, huset dörr och fönster, katten nos och morrhår.
  - **Svårighetsplanen varvar** nu motiv med kurvor (18 steg), och bortom planen är ~65 %
    av rundorna motiv — det är dem barnet vill rita. Handträningen finns kvar i vågor,
    sicksack, spiral och trappa.
  - **Stigande melodi** (§4 [Quick]): varje tänd prick spelar nästa ton i en pentatonisk
    slinga, så en färdig linje låter som en liten låt i stället för samma blipp.
    Kritdamm gnistrar vid pennspetsen.
  - **P0 ASSETS:** pennan ritas nu (trä, stift, hylsa, suddgummi) i stället för ✏️-emoji.
  - **Bugg:** `gsap.delayedCall` → `ctx.later()`; `_dotsLayer.alpha` nollställs vid ny runda
    så borttoningen inte följer med in i nästa bild.
- 2026-08-07 ✅ **Tredje omgången — ritbord med kritval** (`77902dd`, v1.27.0). Utlöst av
  bildkollens `gles-scen` (4,3 %, repots lägsta av 71). **Diagnosen i verktygsfyndet var fel i
  sak:** motiven och den ritade pennan fanns redan sedan 08-04 — felet var att
  svårighetsplanen började på `genLine(4)`, så det första ett barn såg var fyra grå prickar på
  tomt papper. (Lärdomen står i CLAUDE.md: läs koden före planen.)
  - **Motiv redan från runda 1** (berg), sedan motiv/kurva varvat i 18 steg.
  - **Kritlåda** (§4 [Quick] *Välj krita*): fem ritade vaxkritor — kropp, spets, sliten udd,
    pappersetikett, dager — i en trälåda under pappret. Vald krita lyfts 24 px, får full
    opacitet och **andas**; grannarna vilar på alpha 0,84. Träffytor 124×180 px, 36 px isär.
    `PAPER.h` 520 → 424 för att ge plats (BOX/MOTIF_BOX flyttade med).
  - **Färgen är barnets:** kritans färg är linjens färg; byte mitt i en teckning låter redan
    dragna segment behålla sin (`d._wcol` per prick, `_redrawInk` ritar segment för segment),
    pennan i handen får samma färg, och valet sparas i `progress.custom.krita`.
  - **Kritorna är stämda** i samma pentatonik som linjens melodi (`MELODY[i]`).
  - **Kurv-rundorna fick en egen finish** (`_celebrateLine`, spelkritikerns enda BÖR-punkt):
    pennan hoppar till och gnistor vandrar längs spåret i stället för bara `PRAISE` + konfetti.
  - **Exit-säkerhet:** `destroy()` dödar tweens på hela displayträdet i stället för en
    handhållen lista med `if (!x.destroyed)`-vakter — samma lärdom som V5 i `bajs-och-kiss`.
    `breathe()` tweenar en proxy och inte `.scale`, så dess tween sparas och dödas explicit.
  - **Mätt** (`scripts/_kritprobe.mjs`): kritval ✓ · flerfärgat spår (grön + lila i samma
    berg) ✓ · runda klar → nivå 1 ✓ · kritan följer med till nästa runda ✓ · minns valet efter
    återbesök ✓ · 0 konsolfel vid exit mitt i firandet. Bildkoll: inga fynd (gles-scen borta).
    `check` 0 fel · `test:all` 71/71.
  - **Öppet:** 5 nya repliker ("Röd krita!" m.fl.) väntar på röstklipp — kör `/rost`.

