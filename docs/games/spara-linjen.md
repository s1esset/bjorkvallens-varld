# Spåra Linjen (`spara-linjen`)
> ✏️ motorik · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En gräddvit pappersyta med gul ram. På den ligger en rad bleka prickar i ordning och en
✏️-pennspets vid den första. Jag sätter fingret på startpricken och drar längs vägen:
ENDAST nästa prick i ordningen är aktiv — när fingret når den "tänds" den (fylls med rundans
färg), ett färgat segment ritas från föregående prick, och pennan flyttas dit med 'pling' +
pop + gnista. Att hoppa till en prick längre fram gör INGET (man kan inte fuska framåt) —
den rätta nästa-pricken vinkar i stället (vingel + puls + mjukt ljud). Strayar fingret
stannar pennan kvar, aldrig omstart. Funkar lika bra med tap-tap som med drag.

Står jag stilla ~6s → vänlig recue + vink; ~11s → nästa prick tänds automatiskt
(auto-hjälp), så rundan ALLTID blir klar. Hela linjen färglagd → "linjen vaknar" (varje
prick pulsar i följd) + bigCelebration + complete + ny, svårare form. Formerna trappar:
rak → diagonal → våg → båge → sicksack → trappa → triangel → fyrkant → spiral → stjärna,
sedan oändligt slumpade tätare former.

**Funkar bra:** "endast nästa prick"-regeln är genialt no-fail (ingen kan rita fel), det
växande färgade spåret känns som att man RITAR, formbiblioteket är rikt och stigande,
pennspetsen + pulsen visar tydligt vart man ska, tap-tap-fallbacket gör det tillgängligt.

*(Skärmdump: papper med startprick + ett målat segment till pennan, två bleka prickar kvar.)*

## 2. Ursprunglig plan & tankeprocess

En lugn motorik-/"rita-själv"-lek (kodhuvudet): följ prickar i ordning och se linjen
färgläggas, helt förlåtande. Designvalet att bygga en egen pekar-lyssnare (inte
DragController, som snäpper föremål) gör spårningen till en korridor man drar i. Stigande
former (vågor, spiraler, stjärna i ett drag med korsande ordning) ger handträning och
upptäckarglädje, och auto-hjälpen garanterar att varje runda går att slutföra.

## 3. Vad gör det lättjefullt / tunt

- **Linjen blir aldrig en bild.** Man spårar en abstrakt form (triangel, spiral) men den
  fylls aldrig i till NÅGOT — ingen katt, ingen stjärna som tänds, ingen blomma, inget djur
  som "ritas klart". Belöningen för en klar form är bara samma färgade streck + konfetti.
- **Auto-hjälpen ritar åt en.** Efter ~11s stillastående tänds nästa prick själv, och den
  åter-armeras (`_idle = IDLE_DELAY`) så hela formen kan ritas av timern medan barnet inte
  rör något. Bra skyddsnät men gör att inget engagemang krävs.
- **Prickarna är identiska grå cirklar.** Ingen siffra, ingen färg-tell, inget som skiljer
  prick 1 från prick 7 — ordningen är osynlig tills man råkar träffa rätt; en yngre tittar
  bara efter pulsen.
- **Tom, statisk scen.** Papper på platt bakgrund. Ingen figur som ritar med en, ingen
  hand/krita-karaktär, inget som händer i kanterna.
- **Ljudet är UI-blipp.** 'pling'/'pop' per prick — ingen kritklang, ingen stigande melodi
  längs linjen, inget "krafs" av penna mot papper.
- **Generisk belöning + inget sparas.** Samma bigCelebration; den färdiga teckningen
  försvinner direkt vid ny runda — ingen "ritbok"/galleri att spara och bläddra i.
- **Färgen är slumpad men oförklarad.** En färg per runda utan koppling till motiv eller val
  — barnet får inte välja kritfärg.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Prickarna bildar en bild.** Lägg en blek motiv-silhuett (katt, fisk, stjärna,
  hus) bakom prickarna; när linjen sluts fylls motivet med färg + får ögon/liv. Då RITAR man
  något, inte bara ett streck — enorm meningsskillnad för 3–5 år.
- **[Quick] Senarelägg/mjuka auto-hjälpen.** Höj `AUTO_DELAY`, eller låt auto bara tända EN
  prick och sedan vänta på barnet igen, så teckningen inte ritar sig själv vid passivitet.
- **[Quick] Välj krita.** 3–4 stora färgknappar så barnet väljer pennfärg — ett litet ägande-val.

### Variation & överraskning
- **[Quick] Numrerade/färgtonade prickar.** Visa en svag siffra eller en gradvis ljusnande
  ton så ordningen syns även utan att gissa via pulsen.
- **[Medium] Överraskningsprick.** En glitterprick på vägen som ger extra gnistor + ett litet
  ljud, eller en prick som "släpper" en fjäril när den tänds.

### Juice
- **[Quick] Krit-ljud + stigande melodi.** Riktigt krit-/tuschkrafs via SFX-pipelinen
  ([[real-audio-sfx]]); låt varje tänd prick spela nästa ton i en liten uppåtgående slinga så
  hela linjen blir en melodi när den är klar.
- **[Quick] Levande spår.** Lite glitter-damm som faller från pennspetsen medan man drar; det
  färdiga spåret skimrar till vid completion.

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

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; drag tände prickar och ritade färgat segment till pennan).
- Rekommenderad första-omgång: **[Medium] prickar som bildar ett motiv + [Quick] krit-ljud/
  stigande melodi + [Quick] mjukare auto-hjälp** — gör spårandet till att rita NÅGOT.

