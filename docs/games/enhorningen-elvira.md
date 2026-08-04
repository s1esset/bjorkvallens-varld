# Enhörningen Elvira (`enhorningen-elvira`)
> ⚙️ fysik · mixed · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En pastell-godisscen. Uppe till vänster står **Elvira**, en söt programmatiskt ritad
enhörning (vit/rosa kropp, regnbågsman & -svans, gyllene horn, stort glatt öga). Längst ner
finns en **molnhylla** med 2–3 fluffiga studsmoln ☁️ och knapparna **Hoppa!**, **Lätt/Tung**
(vikt) och — på högre nivåer — en vind-växlare. Målet är **regnbågen 🌈** till höger, med
glittrande 💎/⭐-ädelstenar på vägen.

Jag **drar molnen** ut i luften (ett förlåtande drag, mjuk snäpp; släpps de under en linje
åker de tillbaka till hyllan) där de blir studsiga statiska plattformar. Sedan **drar jag
Elvira** för att sikta (riktning + kraft, prickad bana visar var hon hamnar) eller trycker
**Hoppa!** för ett standardskott — hon flyger som en matter.js-kropp, **studsar mot molnen**
mot regnbågen och plockar ädelstenar. Vikt-knappen ändrar gravitation + massa (lätt =
flygig båge, tung = snabbt fall/längre kast); vinden ger med-/motvind. Når hon regnbågen →
firande, stjärnor, nästa nivå (regnbågen längre bort/högre, färre moln, mer vind).

No-fail är noggrant byggt: molnstudsar är **avtagande och takade** (`MAX_BOUNCES`, garanterad
men krympande boost) så hon aldrig fastnar i en evighetsloop; landar hon utan att nå målet
svävar hon tillbaka, och efter 2 försök glider hon i en mjuk Bézier-båge genom kvarvarande
ädelstenar ända fram.

**Funkar bra:** moln-placering + sikte + vikt/vind är *mycket* agens — ett riktigt litet
fysikpussel; den kalibrerade prickbanan lär ut bana; studs-takningen är en smart no-fail-
lösning; Elvira är gullig och egen; exit-säkert. En av de rikare fysik-MVP:erna.

*(Skärmdump: blek godisbakgrund, Elvira nere till höger vid regnbågen, tre moln i hyllan, Lätt + Hoppa-knappar.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: ett **placerings-pussel** där barnet bygger sin egen studsbana av moln och sedan
skjuter Elvira till regnbågen — två kopplade kontroller (placera plattformar + sikta/kraft)
plus modifierare (vikt, vind). Det pedagogiska: bygg-och-testa-fysik, förutse en studsbana,
upptäck hur tyngd/vind ändrar allt. Designen lägger stor möda på att studsar ska dö ut
kontrollerat (ingen evighetsloop, inget vilt skott ur bild via MAXV) och på att
prick-förhandsvisningen matchar matter.js exakt. No-fail via återflyt → garanterad glid-båge.
Allt programmatiskt, exit-säkert.

## 3. Vad gör det lättjefullt / tunt

- **Bakgrunden är nästan tom.** `createScene('candy')` ger en blek, ljus rymd där största
  delen av skärmen (hela vänstra/övre 60 %) är intetsägande pastell med några svaga bubblor.
  Elvira, molnen och regnbågen trängs nere till höger; scenen känns gles och oförankrad.
- **Hoppa-knappen kortsluter pusslet.** Standardskottet (`_defaultLaunchVel`) siktar alltid
  med lagom kraft mot regnbågen. På låga nivåer kan ett barn trycka Hoppa, ignorera molnen
  helt, och ofta nå målet ändå — hela bygg-din-bana-kärnan blir valfri pynt.
- **Hjälp-glidet spelar klart åt en.** Efter 2 settlingar utan vinst glider Elvira i en
  scriptad båge genom alla ädelstenar till regnbågen (`_autoHelpGlide`). Två misslyckade
  Hoppa-tryck → garanterad vinst utan att molnen rörts. Snäll garanti, men passivitets-väg.
- **Molnen är identiska och statiska.** Tre likadana studsmoln; ingen variation i storlek/
  studsighet/form, inget moln som rör sig, ingen begränsning som tvingar smart placering.
  De är studsytor, inte karaktär.
- **Ädelstenarna och regnbågen reagerar inte.** Stenen krymper bort (fin), men regnbågen är
  ett statiskt mål (andas bara) — den **öppnar sig inte, lyser inte upp, sänker ingen
  glittertrappa** när Elvira närmar sig. Ankomsten är en `pop` + generisk konfetti.
- **Vinst = delad celebration.** Ingen Elvira-specifik finish (galopp över regnbågen,
  glitterbajs-spår, kompis som möter henne).
- **Ljudet är procedurellt och sparsamt.** `pop`/`pling`/`magi`/`soft`; ingen
  enhörnings-"gnägg", inget mjukt studs-"poäng", ingen stigande ton när hon klättrar moln
  för moln, ingen regnbågs-shimmer vid mål.
- **Vikt/vind talas men förklaras inte visuellt för icke-läsare** utöver knappens ikon.
  (Bättre än bara röst — ikonerna 🪶/🪨/➡️/⬅️ finns — men ingen tydlig "så här ändras banan".)

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gör molnen *nödvändiga*.** Justera standard-Hoppa så den utan minst ett placerat
  moln tydligt faller kort (mjuk "hoppsan" + studs på marken), så barnet upptäcker att moln =
  vägen fram. Behåll no-fail-garantin, men låt pusslet faktiskt vara pusslet.
- **[Medium] Variera molnen.** En liten studsig "trampolin"-sky, ett stort mjukt "kudd"-moln
  (låg studs), ett som långsamt driver. Då blir *vilket* moln man lägger var ett val.
- **[Deep] Låt hjälp-glidet bjuda in.** Efter 2 försök: lägg automatiskt ett extra hjälp-moln
  i en perfekt position och låt barnet trycka Hoppa självt, istället för en scriptad båge —
  framgång garanteras men handlingen stannar hos barnet.

### Variation & överraskning
- **[Quick] Fyll scenen.** Flytta startpunkten/regnbågen så banan spänner över hela ytan;
  strö in moln-pelare, en sol med ansikte, fjärilar — gör den tomma vänster/övre delen levande.
- **[Medium] Gömd överraskning:** var 3:e bana en regnbågs-ädelsten som ger en glittersvans
  eller studsar Elvira vidare i en extra studs.

### Juice
- **[Quick] Klättrings-ljud som stiger.** Varje molnstuds uppåt ger en ton ett snäpp högre
  (`_bounceFx` kan ta studs-nummer) — en kaskad som belönar en fin bana.
- **[Quick] Regnbågen vaknar.** När Elvira är inom ~250px: regnbågen lyser upp, foten-molnen
  pulserar, ✨ gnistrar — en "nästan framme!"-signal.
- **[Quick] Glitterspår** efter Elvira i luften (liten regnbågs-trail) så hennes bana syns.

### Progression
- **[Medium] Visa hur vikt/vind ändrar banan.** När man växlar vikt/vind: rita om prickbanan
  *direkt* (görs redan i `_drawPreview`!) och lägg en kort "se skillnaden"-blink mellan gamla
  och nya banan, så orsak-verkan blir tydlig utan läsning.

### Karaktär & berättelse
- **[Deep] Elvira-specifik finish.** Vid mål: hon galopperar i en båge över regnbågen, släpper
  ett kort glitter-/regnbågsspår, en kompis (Bobo/föl) möter henne — ersätt generisk konfetti.
- **[Quick] Elvira reagerar i luften** (glad min vid ädelsten, "ojj" vid väggstuds).

### Ljud
- **[Quick] Riktiga klipp** ([[real-audio-sfx]]): mjukt gnägg, studs-"poff", regnbågs-shimmer,
  ädelsten-"pling". Idag allt syntat.
- **[Quick] Lugn pastell-ambient** + varierat vinst-sting.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad mot studs-takning + preview-kalibrering i koden; bekräftad
  med playtest — scenen är märkbart glest komponerad). Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] fyll scenen + regnbågen vaknar + klättrings-ljud**,
  följt av **[Medium] gör molnen nödvändiga** — adresserar tomheten och kortslutningen.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Deep-lite]:** det scriptade hjälp-glidet
  (`_autoHelpGlide` vid `_tries>=2`) BJUDER nu IN i stället för att spela banan: efter 2 egna
  försök lägger `_placeHelperCloud` automatiskt ETT extra hjälp-moln som stegsten mitt i banan
  och lämnar tillbaka kontrollen — barnet trycker Hoppa självt. Glid-bågen är kvar men FÖRST
  som sista utväg (`_tries>=3`). Städning: tog bort oanvänd `DESIGN_H`-import + oanvända
  `ctx`/`e`-params i `_loadLevel`/`_buildGems`/`_enterPlacing`/`_cloudUp`. errorCount 0.
- 2026-08-04: **P0 ASSETS + bakgrundsdjup.** (1) Ädelstenarna och stjärnorna ritas nu (slipad
  sten med krona/tavla/pavillon respektive tiouddig guldstjärna) i stället för 💎/⭐-emoji,
  och regnbågens glitter är en ritad fyrudd. **Bugg i samma veva:** insamlings-effekten
  skickade ikon-strängen till `floatText`, så efter bytet skrev spelet ut ordet "gem" som
  text över scenen — den stigande effekten ritar nu en riktig kopia av stenen (`_floatGem`).
  (2) Bakgrunden var en nästan tom pastellyta (§3 första punkten); nu finns djup: svävande
  godis-öar, fjärran molnbankar och en ström av glitterstjärnor. errorCount 0.
