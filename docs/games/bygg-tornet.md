# Bygg Tornet (`bygg-tornet`)
> 🧱 fysik · tap · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En glad himmel med sol och moln. Längst upp åker en kran-tralla på en räls och håller en
färgglad LEGO-aktig kloss i en lina; nere på gräset lyser en pulserande spök-markör DÄR
nästa kloss helst ska landa, och en 🚩-flagga vid mål-höjden visar hur högt jag ska bygga.
Jag trycker var som helst → klossen flyttas till fingret och faller RAKT NER där med riktig
matter.js-fysik. Den landar, lutar och vajar, och får sätta sig. **Fysiken avgör vinsten:**
vilade klossen på stapeln (inom dx/dy/vinkel-tolerans) snäpps den fast (statisk) med
'pling' + gnistor + räkneord ("ett, två, tre…"); tippade den av är det ALDRIG ett fall —
den puffar bort glatt och jag får en ny.

Efter 2 missar på samma våning lägger kranen nästa kloss prydligt på plats själv
("Jag hjälper till!") med en svag centrerings-magnet på fallande klossar, så tornet ALLTID
når flaggan. Mål nått (4–7 klossar) → flaggan hoppar, bigCelebration, "Hurra! Vilket högt
torn!", complete + ny högre runda. Mjuk "klack" vid landning (strypt). Idle ~6s → recue.

**Funkar bra:** klossarna är chunky och fina (rundade, studs-cirklar, skuggrad), fysik-
vajet känns äkta, "tryck var som helst → faller där" är intuitivt, spök-markör + flagga gör
målet tydligt utan läsning, no-fail-trappan (puff → magnet → auto-place) är robust.

*(Skärmdump: kran med orange kloss upptill, gul spök-markör nere vid marken, flagga vid mål.)*

## 2. Ursprunglig plan & tankeprocess

Ett bygg-/fysikspel där FYSIKEN — inte en snäpp-zon — avgör om tornet står: klossar som
verkligen vilar på varandra räknas. Designintentionen (kodhuvudet) är att en kloss som
tippar av aldrig blir ett "fall", bara en glad puff och en ny, och att auto-hjälpen
garanterar att flaggan alltid nås. Räkneorden gör stapeln till en mjuk siffer-övning, och
"tryck var som helst" sänker motorik-kravet för 3-åringar.

## 3. Vad gör det lättjefullt / tunt

- **Auto-hjälpen spelar tornet åt en.** Efter 2 missar lägger kranen klossen perfekt själv,
  och en växande "magnet" drar fallande klossar mot stödpunkten. Ett barn som bara trycker
  random får tornet byggt åt sig — agensen urholkas och utmaningen försvinner.
- **Spök-markören gör valet trivialt.** Den lyser exakt där klossen ska hamna, så "var ska
  jag trycka?" är redan besvarat; det blir att-prick-träffa snarare än att-bedöma-balans.
- **Tornet är abstrakt och tomt.** Färgade rektanglar på en bar gräsremsa. Ingen bor i
  tornet, inget ska UPP dit (ingen katt att rädda, ingen fågel på toppen), ingen figur
  reagerar när det växer. Scenen är tapet + mekanik.
- **Inget visas av vad man bygger.** Det är "en stapel klossar", aldrig ett hus, ett torn
  med fönster, en pepparkaksstapel — ingen form/berättelse växer fram.
- **Ljudet är UI-blipp.** 'pling'/'pop'/'tap'/'whoosh' — ingen tyngd-känsla, ingen träklack,
  ingen stigande ton ju högre tornet blir.
- **Generisk belöning.** Samma bigCelebration + stjärna; tornet rivs direkt och nästa börjar
  — inget sparas, ingen "stad" av byggda torn att återse.
- **Klossarna ser likadana ut.** Olika `PLAYFUL`-färg men identisk form/storlek hela vägen —
  ingen variation i vad man staplar.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Dämpa auto-magneten.** Behåll no-fail men gör hjälpen mindre "spela åt mig":
  låt magneten/auto-place bara träda in efter fler missar, och låt en lyckad egen placering
  kännas tydligt mer firad än en hjälpt — så barnets träff betyder något.
- **[Quick] Markör som vägledning, inte facit.** Låt spök-markören visa en *bredare* trygg
  zon (eller blekna när barnet siktar bra) i stället för en exakt klossruta, så det finns en
  liten bedömning kvar.

### Variation & överraskning
- **[Quick] Varierade klossar.** Olika bredd/höjd (smala, breda, en rund tunna som rullar
  lite) gör balansen levande och stapeln unik varje gång — fortfarande generösa träffytor.
- **[Medium] Topp-belöning.** På toppen väntar något att nå: en fågel/ballong/stjärna som
  klossen "når upp till" och som reagerar när tornet är klart.

### Juice
- **[Quick] Tyngd-ljud.** Riktig träklack/duns vid landning (skalar med fart) via
  SFX-pipelinen ([[real-audio-sfx]]); en stigande "pling"-skala där varje våning är en ton
  högre — tornet får en hörbar höjd.
- **[Quick] Vaj-juice.** Liten dammpuff + mikroskak när en tung kloss sätter sig; klossarna
  guppar mjukt en stund efter placering.

### Progression
- **[Medium] Bestående bygge.** Spara silhuetter av byggda torn i en liten "stad"-rad
  nedtill som växer över rundor — något att samla och vara stolt över i stället för rivning.
- **[Quick] Tema per runda.** Klossfärg/bakgrund byter mjukt (dag → kväll, stad → slott) så
  varje torn känns som en ny plats.

### Karaktär & berättelse
- **[Deep] Någon som bor/klättrar.** En liten figur (Bobo) som klättrar uppför tornet medan
  det byggs och vinkar från toppen vid mål, eller en katt på toppen som ska räddas — ger
  bygget mening och en egen vinst-animation i stället för generisk konfetti.

### Ljud
- **[Quick] Kran-ambient** (mjukt gnissel/motor) medan klossen bärs + varierat berömsting.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; kran + kloss + spök-markör + flagga renderar korrekt).
- Rekommenderad första-omgång: **[Quick] varierade klossar + tyngd-ljud + bredare (icke-facit)
  markör** — återinför lite bedömning och taktil tyngd för minst risk.
