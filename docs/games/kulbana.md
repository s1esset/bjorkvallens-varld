# Kulbanan (`kulbana`)
> 🧩 pussel · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En ljus himmel med drivande moln. Uppe till vänster vilar en glansig gul kula vid ett
utsläpps-pip, bredvid en stor grön **SLÄPP ⬇**-knapp som pulsar. Nere på en "Delar"-hylla
ligger banbitar — lutande ramper (med en stor orange ↻-vrid-knapp), en studsplatta och på
högre nivåer en tratt. Jag drar upp delarna i fältet, vrider dem 15° i taget med ↻-knappen,
och bygger en väg mot hinken 🪣 (gul glödring = mål). Tryck SLÄPP → kulan blir en riktig
matter.js-kropp, rullar nedför ramperna, studsar mjukt (`pop`/`pling`) och plumsar
förhoppningsvis ner i hinken → firande + ny, svårare bana. Missar är aldrig fel: kulan får ett
"Hoppsan!", puffar och återvänder själv till utsläppet — oändliga försök. Efter 3 missar lutar
spelet närmaste ramp mot hinken ("Jag hjälper till"); räcker inte det glider kulan hela vägen
hem av sig själv och rundan firas ändå. Tap-tap funkar: markera en del, tryck i fältet, den
glider dit. Idle ~6s → röst + ramp/SLÄPP-knapp vinkar.

**Funkar bra:** detta är ett *riktigt* litet ingenjörsspel — fri placering + vridning ger äkta
agens och olika lösningar; statiska ramper synkas korrekt till matter (`Body.setPosition`/
`setAngle` vid varje drag och vrid); kulan rullar och studsar fint (låg friktion, glansig
highlight som roterar); no-fail är genomtänkt i tre lager (mjuk retur → ramp-luta → glid hem);
hinkens fångväggar gör att kulan stannar i hinken. Mycket exit-säkert (proxy-tweens, alla
kroppar/tweens städas). En av de mest innehållsrika lekarna i pussel-fliken.

*(Skärmdump: himmel, SLÄPP-knapp + kula uppe till vänster, en ramp med ↻-knapp mitt i fältet,
hink i mitten, en ramp + ↻ på "Delar"-hyllan nedtill.)*

## 2. Ursprunglig plan & tankeprocess

"Barnet bygger sin egen kulbana" à la *The Incredible Machine* för småbarn (kodkommentar):
ren ingenjörsglädje med en *mål*-baserad fysiklek (få kulan i hinken) + flera kontroller som
ändrar utfallet (placering via drag, vinkel via ↻, studsplatta/tratt). Medvetet *ingen*
sikt-förhandsvisning — kulan släpps, den siktas inte, så spänningen ligger i "bygg → testa →
justera". No-fail bärs av en trappa av auto-hjälp som garanterar att varje bana till slut går
att klara, så skicklighet *känns* men aldrig *krävs* — helt enligt P0 och fysik-toolkitens
"misses är roliga"-regel.

## 3. Vad gör det lättjefullt / tunt

Imponerande system, men en kräsen spelare/förälder ser tunna fläckar:

- **Auto-hjälpen kan kapa agensen.** Tre lager hjälp är snällt, men trappan är aggressiv: vid
  3 missar *flyttar och lutar* spelet en ramp åt barnet, och vid 4 *glider kulan hem helt själv*.
  För ett barn som experimenterar lugnt kan banan "lösa sig själv" innan man hunnit tänka klart —
  den egna lösningen tas ifrån en. (Detta är precis app-mönstret "auto-hjälp som spelar banan
  åt barnet".)
- **Inert värld, ingen mottagare.** Himlen är en stilla tapet (molnen driver men inget mer).
  Ingen figur bygger med, ingen vid hinken som jublar när kulan plumsar i. Hinken är en blå
  låda med en 🪣-emoji — den vippar inte, skvätter inte, fylls aldrig synligt.
- **Delarna är livlösa plankor.** Ramp, studsplatta och tratt är `roundRect`-block utan
  personlighet. Studsplattans "fjäder-zigzag" är enda antydan till funktion; inget komprimeras
  vid studs, ingen del reagerar på att kulan rör den.
- **Ljudet är generiska blipp.** `tap`/`flip`/`whoosh`/`pop`/`pling` — ett trä-"klonk" när
  kulan rullar på trä, en metallisk "boing" på studsplattan, ett "plums" i hinken saknas helt.
  Kulan låter likadant oavsett vad den träffar.
- **Belöningen är generisk.** `bigCelebration` + `burst` + 🎉-floatText + `progress.complete()`
  — samma firande som alla spel. Inget bana-specifikt ("Vilken bana du byggde!"), ingen
  uppspelning/replay av den lyckade rullningen.
- **Ingen riktig "wow"-överraskning.** Banorna växer linjärt (fler ramper, fler hinder) men
  det finns inga roliga banelement: ingen sväng/loop, ingen studsmatta-kedja, inga snurrande
  hjul, inget mål som blinkar till när kulan närmar sig. Bana 6 är bana 4 med jitter.
- **"SLÄPP" kräver läsning.** Knappen säger SLÄPP i text + ⬇. Texten är överflödig för en
  2–5-åring (pilen + pulsen räcker) — och bryter mot "noll läsning"-idealet en aning, även om
  pilen mildrar det.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Mjuka upp auto-hjälpen.** Skjut upp trappan (fler/longare försök innan hjälp),
  och gör hjälpen *synlig och frivillig*: en "Hjälp mig"-knapp dyker upp efter några missar i
  stället för att banan tyst löser sig. När hjälpen väl kickar in: en tydlig hand-/Bobo-gest
  ("Jag putar lite!") så barnet förstår att det var hjälp, inte deras bygge. Skicklighet ska
  kännas.
- **[Deep] Replay av den lyckade rullningen.** Vid mål: spela kort om kulans väg i slow-motion
  (eller en spår-linje som ritas) så barnet *ser* banan de byggde fungera — belönar bygget,
  inte bara träffen.

### Variation & överraskning
- **[Medium] Roliga banelement.** Lägg in valbara delar med karaktär: en snurrande propeller
  som knuffar kulan, en kort "loop", en studsmatta-kedja, en klocka/blomma som kulan kan slå
  till på vägen (pling + poäng-fri gnista). Ger nya pussel och wow.
- **[Quick] Banbitar med personlighet.** Studsplattan komprimeras vid studs (squash), rampen
  får en liten "swoosh"-rörelse när kulan rullar, tratten "slukar" kulan med en mun-animation.

### Juice
- **[Quick] Material-specifika ljud + skvätt.** Trä-"klonk" på ramp, metallisk "boing" på
  studsplatta, ett saftigt "plums" + vattenskvätt i hinken (se Ljud). Kort skärm-mikroskak vid
  studsplatta och vid mål.
- ✅ **[Quick] Kul-svans + rull-damm.** *(2026-08-12)* En strimma i kulans egen färg bakom
  den, vars styrka följer farten (osynlig under 3 px/steg, full vid 11) — och damm i
  kontaktpunkten vid varje anslag, mängd och färg efter kraft och material. Mätvärden i §5.

### Progression
- **[Quick] Visa målet starkare när kulan närmar sig.** Hinkens glödring pulsar snabbare/
  ljusare när kulan är nära → spänning och tydlig "nästan!"-känsla, fortfarande no-fail.
- **[Medium] Spara favoritbana / "min maskin".** Låt barnet (frivilligt) behålla sin bygge-
  layout mellan släpp i stället för att den nollställs per bana — mer känsla av ägande.

### Karaktär & berättelse
- **[Deep] Bobo som byggkompis + mottagare.** Bobo står vid utsläppet och "tappar i" kulan vid
  SLÄPP, och en figur vid hinken jublar/fångar när kulan plumsar i (skvätt + armar i luften).
  Ger bygget en kompis och målet en publik — ett spel-specifikt slut i stället för generisk
  konfetti.

### Ljud
- **[Quick] Riktiga klipp via SFX-pipelinen.** Trä-klonk, studs-boing, whoosh, plums-i-vatten,
  ett glatt "klart!"-sting (se [[real-audio-sfx]]). Lägg en lugn, lätt verkstads-/utomhus-ambient.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Speltestat med drag (errorCount 0; skärmdump
  verifierad: himmel, SLÄPP + kula, ramper med ↻, hink, "Delar"-hylla). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] mjukare/synlig auto-hjälp + [Quick] material-ljud &
  plums + [Medium] roliga banelement** — bevarar den fina ingenjörs-agensen och gör bygget
  saftigare och mer varierat.
- 2026-07-02: Första-omgång implementerad (errorCount 0).
  - **[Medium] Mjukare/synlig auto-hjälp.** Den tysta trappan (luta ramp vid 3 missar, glid hem
    vid 4) borttagen. Ny frivillig **"Hjälp mig?"**-knapp (`_buildHelpButton`/`_showHelpButton`/
    `_hideHelpButton`/`_useHelp`, orange, 🤚, ≥96px hit-halo) dyker upp efter `HELP_AFTER=3` missar
    med studs + puls. FÖRSTA trycket lutar närmaste ramp (`_assistTiltRamp`, nu röst *"Jag putar
    lite!"* + svävande 🤚-gest via `floatText` så barnet vet att det var hjälp). ANDRA trycket
    glider kulan hem (`_glideHome`). Sista skyddsnätet (no-fail): `AUTO_HELP_AT=8` missar → glid
    hem ändå. `_helpStage` styr stegen; hjälp-knappen döljs vid släpp/mål/ny bana. `destroy` av-
    registrerar `_onHelp` + dödar `_helpPulse`.
  - **[Quick] Material-ljud + plums + skvätt + mikroskak.** `_onCollision` ger nu trä-"klonk"
    (`tone` 160→96 Hz square, throttlat via `_lastWoodAt`) på ramp/tratt/hinder, metallisk "boing"
    (`sfx('pling')` + `tone` 210→660 Hz) på studsplatta, och klock-pling på 🔔. Mål: saftigt
    "plums" (två nedåt-`tone`) + blå vattenskvätt (`burst` med blå/teal-färger) + hink-gupp
    ({}-proxy, exit-säkert) + mjuk `shake(this._root)` (rot nollas först → ingen kvar-offset).
  - **[Quick] Studsplatta med personlighet.** `_squashPart` trycker ihop plattan (scale 1.14×0.7
    → elastic tillbaka) när kulan studsar; liten `shake` + gnistor.
  - **[Medium] Roliga banelement — klockor.** `_buildBell`/`_ringBell`/`_clearBells`: 🔔-sensorer
    (isSensor matter-kroppar, `label:'bell'`) placerade i fallbanan (1 st bana 2–3, 2 st bana 4+,
    med jitter från bana 6). Kulan passerar igenom och *ringer* dem (pling + `wiggle` + `sparkle`,
    per-klocka-throttle). Lagda i `_layoutFor().bells`.
  - **[Quick] Målet lyser vid "nästan".** `_update` intensifierar hinkens glödring (alpha +
    tween-`timeScale`) med `NEAR_TARGET=210` px närhet under fall; nollas vid miss.
  - Test: `node scripts/test-game.mjs kulbana --url http://localhost:5173 --drag "600,660>500,360;900,660>800,420"`
    → errorCount 0; skärmdump verifierad (himmel, SLÄPP + kula, ramp med ↻, hink m. glödring,
    Delar-hylla). Andra körningen med släpp-tryck också errorCount 0.
  - Deferred: [Deep] replay av lyckad rullning, [Deep] Bobo som byggkompis/mottagare vid hinken,
    [Medium] spara favoritbana ("min maskin"), [Medium] fler banelement (propeller/loop/studs-
    kedja), [Quick] kul-svans + rull-damm, [Quick] riktiga SFX-klipp via pipelinen + ambient,
    [Quick] ta bort "SLÄPP"-texten (pil + puls räcker).
- 2026-08-09 ✅ **Karaktärsrigg [Medium]** (v1.71.0): Bobo är en RIGG (`lib/karaktarer.js`), inte en stillbild — `kropp: false` — de blå byxorna och de utsträckta armarna är mottagarens roll och animeras av spelet. Blicken följer kulan hela vägen ner. `_clearCatcher` destroy():ar riggen eftersom mottagaren byggs om per bana (uppmätt: 10 ombyggnader → 0 gamla riggar lever, 0 aktiva tweens kvar). Yttre containern är spelets (läge, hopp, träffyta), riggen äger sin egen skala.
- 2026-08-09 ✅ **Anslaget hörs i kraften** (v1.81.0, spår 3 runda P1, LYFTPLAN B5). Ytorna
  lät redan olika (klocka · studsplatta · trä · neutralt), men **alltid lika hårt**: en kula
  som precis nuddade en ramp gav samma 160 Hz och samma volym som en som dundrade ner i den.
  Nu stiger både volym (0,08→0,19) och tonhöjd (0,86–1,20×) med farten. Studsplattan behåller
  med flit sin fasta boing — den är en designad händelse, inte ett anslag.
  **Kraftskalan är kalibrerad mot uppmätt fart, inte gissad:** kulans fart i rörelse spänner
  3 → 14,6 px/steg (median 7,4 · p90 13,5), och `(fart − 2) / 12` ger då 0,08 vid den
  långsammaste kontakten, 0,45 vid medianen och 0,96 vid p90 — hela spannet används.
- 2026-08-09 ✅ **Studsplattan är en riktig fjäderbräda** (v1.84.0, spår 3 runda P1, LYFTPLAN B5).
  Ny `lib/fjader.js` (`Fjaderbrada`) — plankan har eget tillstånd, **sväljer** kulans anslag,
  dyker undan och kastar tillbaka den med plankans egen fart uppåt. Silhuetten är en mjukkropp
  (`lib/mjukkropp.js`, tredje kunden): plankan BÖJS, foten står still och två rosa fjädrar
  trycks ihop mot undersidan. `physics.js` fick `beforeStep()` — en driven kropp måste röra sig
  i matters takt, inte bildrutans.
  **Vad som var trasigt, mätt:** plattans `restitution: 0.95` hade **aldrig** gjort något (matters
  `setStatic` nollar restitution — se ÅTGÄRDER V10), och squashen satt på `part.scale` och kunde
  inte röra en enda kropp. Plattan var alltså en ramp med zigzag-dekor.
  **Uppmätt nu** (`scripts/_fjaderprobe.mjs`, 19 mått): fall 20 · 60 · 140 · 260 · 400 px ger
  studshöjd **37 · 88 · 183 · 272 · 272 px** mot den styva plattans **3 · 7 · 17 · 31 · 46 px**
  (10,8× vid medianen) · inpressning 6,9 → 19,4 px av taket 22 · utkastet planar ut vid taket
  (max 14,1 px/steg) · ±30° vridning styr utkastet **±323 px** i sidled · tio studsar i rad
  trappar upp och LÅSER sig vid samma tak (platå 271 px) · en kula som rullar över bräddan
  behåller 5,9 av 7 px/steg och lyfts bara 13 px. Bilder: `scripts/_fjaderbild.mjs`.
  Boingen behöll sin karaktär men följer nu kraften (ögat ser plankan sjunka olika djupt).
- 2026-08-12 ✅ **Kul-svans + rull-damm [Quick]** (v1.163.0): kulan bar ingen avläsning av hur
  fort den gick. Nu ritas en strimma i dess egen gula ton bakom den (14 punkter, återanvänd
  `Graphics` under kulan, ny punkt först när den flyttat sig >6 px så bufferten inte fylls av
  dubbletter när den nästan står still), och strimmans styrka följer farten: **osynlig under
  3 px/steg, full vid 11**. Svansen ska säga FART — en kula som rullar sakta eller ligger
  still har ingen alls, annars blir strimman en del av kulans utseende i stället för en
  avläsning. Dammet ligger i **samma anslag som ljudet** (`_onCollision`), i matters
  kontaktpunkt (`supports`) — kulans mittpunkt hade lagt puffen inne i kulan i stället för mot
  ytan — med mängd efter kraft och färg efter material (trä 0xc9a06a, annars ljus grå).
  **Mätt** (`node scripts/_svansprobe.mjs [--bild]`, 9 punkter): svansen **2 401 målade
  pixlar** av 75 600 i ytan, energi **33k vid fart 4 → 205k vid fart 10** (6×) · 0 punkter i
  bufferten när kulan står still · **0 px** från lagret när den slutat fara · ett hårt anslag
  ger **15 nya partiklar**, en nätt beröring (fart 2,6) **0** · exit mitt i ett fall lämnar 0
  konsolfel.
  ⚠️ **TRE mätsätt provades innan ett höll — de två första var gröna nog att luras av:**
  1. **Jämför mot en referensbild** → man mäter KULAN, som står på olika plats i varje arm och
     dränker svansen: energi 1 523k mot 1 715k, alltså "ingen skillnad" i något som i själva
     verket skiljer 6×.
  2. **Växla bara svansens `visible`** → bilderna tas 60 ms isär och allt annat i scenen hinner
     röra sig: **1 132 px "från svanslagret"** när bufferten var bevisat tom.
  3. **Dölj hela scenen utom svanslagret** → 0 px när det är tomt, och tal som faktiskt är
     svansens. Det är den enda av de tre som svarar på frågan.
  ⚠️ Och: **att räkna pixlar över en tröskel mäter YTA, inte styrka.** Bandet täcker ungefär
  samma bana i båda armarna, så pixelantalet växte bara 1 011 → 1 587 medan energin gick 33k →
  205k. Styrkan bor i alfan. `npm run check` 0 fel/0 varningar · `npm run test` grön.
