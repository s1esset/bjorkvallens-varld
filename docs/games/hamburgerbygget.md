# Hamburgerbygget (`hamburgerbygget`)
> 🎉 roligt · drag · 2–5 år · status: ✅ marknadskvalitet (2026-08-05)

> **Uppdatering (v1.0 UX-svep):** Ny spegelvänd layout — Bobo-loggan centrerad högst upp,
> bygget till höger, mindre grill till vänster, grillknappen (nu **ikon 🔥⬅️** utan text) i
> kolumnen mitt emellan med en **soptunna 🗑️** rakt under. Staplade lager kan nu **dras om**
> (dras ut ur stapeln och läggas tillbaka på ny höjd), dras till soptunnan för att tas bort
> (puff + glad tunna), eller släppas utanför → snäpper tillbaka med en vingel. Hyllan
> **slumpas** varje start och har utökats (+10 goda ingredienser, +10 äckligt-roliga, +
> specialarna Pappa/Mamma/Fluga/Gulligt monster/Kissdroppe/Använd blöja/Potta/Prutt).
> Verifierad i webbläsare: stapling (tap + drag), omflytt, soptunna, grillning och
> exit-mid-animation utan fel.

## 1. Nuläge (sett som spelare)

Ett varmt kök, sett **från sidan**. På ett fat till vänster ligger en underbulle; till höger en
grill med ben, glödande kol och flimrande lågor. Längst ner en hylla med tio ingredienser i
sidoprofil — sallad, ost, biff, tomat, bacon (alla finstämt ritade med Pixi Graphics) plus roliga
emoji-grejer 💩 🧦 🐟 🦴 ⭐. En orange **Grilla 🔥**-knapp vid grillen.

Jag drar en ingrediens upp mot bygget och släpper nära kolumnen → den **staplas** prydligt mellan
bröden, lager på lager, med ett "pop" och gnistor; överbullen med sesamfrön lägger sig alltid
överst och flyttar upp när stapeln växer. Jag bygger en hög, rolig burgare (tills den blir
jättehög → "Den är jättehög! Dags att grilla?"). När jag trycker **Grilla** glider burgaren till
grillen, krymper lite och **mörknar längs en ton-gradient** (rå → grillad → mörk → kol) medan en
**ton-mätare** visar färgen med en glidande markör och en 😋 över den gyllene zonen. Jag trycker
**Ta av 🧤** när den ser god ut. Allt är rätt: även becksvart är bara roligt, firande + klistermärke
varje gång, sedan en ny burgare.

**Funkar bra:** sidoprofil-stapling är genuint tilltalande och de handritade ingredienserna
(smältande ost-droppar, sesamfrön, sallads-volang) ser läckra ut — visuellt det starkaste av
matspelsparet. Auto-stapling gör det lätt för små händer, no-fail är total, ton-loopen delas snällt
med pizzan via `lib/cooking.js`. Exit-säkert.

*(Skärmdump: burgare med sallad + tomat staplad mellan bröd på fat, grill med lågor till höger,
ingredienshylla nere, Grilla-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Intentionen (ur kodkommentaren) var **bygg & grilla från sidan**: stapla fritt mellan bröden (allt
får plats, även bajs och strumpa), sedan samma "passa färgen"-grillning som pizzan. Sidoprofilen
valdes så att stapeln *läses* som en växande burgare och locket alltid kröner toppen. Den
pedagogiska kärnan är sekvens/stapling + observation (ta av när färgen är lagom), helt utan rätt/fel
— bränt firas också. Ton-modellen (gradient, replik, mätare) återanvänds från `lib/cooking.js` så
pizza och burgare delar en gemensam, snäll tillaga-loop.

## 3. Vad gör det lättjefullt / tunt

Snyggast i paret, men loopen lutar sig på samma genvägar:

- **Hela burgaren mörknar som EN klump.** `_burger`-containern tintas som en enhet på grillen — så
  *salladen, tomaten och bröden kolnar lika mycket som biffen*. En becksvart salladsblad är fysiskt
  konstigt och bryter illusionen. Det är en genväg: bara köttet/baconet borde brynas, osten smälta,
  brödet rostas lätt.
- **Ingen äter burgaren — ingen beställer den.** Bygg → grilla → reveal → reset, om och om. Ingen
  kund, ingen order, ingen som tuggar. Fantasin "bygg åt någon hungrig" saknar mottagare, så
  grillningen blir en färg-titt utan syfte.
- **Placeringen ignoreras — allt hamnar överst.** Man släpper "nära kolumnen" (`Math.abs(p.x-BUILD.x)<170`)
  och lagret läggs alltid på toppen med slumpad jitter. Barnet kan inte välja *var* i stapeln något
  ska in, inte byta ordning, inte klämma. Enda agensen är *vilken* ingrediens och i *vilken
  turordning* — själva släpp-positionen spelar ingen roll.
- **Ingredienserna interagerar inte.** Osten smälter inte över biffen på grillen, tomaten plattas
  inte, baconet krullar inte. De staplade lagren är stela brickor som bara tintas.
- **Mätaren sitter bredvid, inte på maten.** Ton-mätaren ligger i den tomma vänsterytan (`BUILD.x,470`)
  medan burgaren är borta vid grillen — blicken delas mellan markör och mat.
- **Fast set, ingen krydda-agens.** Tio ingredienser, samma varje gång. Ingen ketchup att klämma,
  inget antal-biffar-som-spelar-roll, inga tillbehör — bara stapla och grilla.
- **Ingen serverings-finish.** Reveal är generisk `sparkle` + 😋; burgaren slås aldrig in, sätts
  aldrig på en bricka med pommes, ges aldrig bort.
- **Tunt ljud.** `tap`/`pop`/`whoosh`/`reveal`; lågorna ritas om men *låter* inget. Ingen fräsande
  grill, inget sizzel när biffen läggs på.

Kort sagt: ett vackert *stapel-pyssel* med ett lugnt timing-moment, men **hela burgaren kolnar
likadant, placeringen är meningslös och ingen äter** — payoff och realism offras för enkelhet.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ~~**[Medium] Per-lager grill-respons.**~~ ✅ 2026-08-05
- ~~**[Medium] En kund med en bild-order.**~~ ✅ 2026-08-05
- ~~**[Quick] Låt släpp-positionen betyda något.**~~ ✅ v1.0 UX-svep
- ~~**[Quick] Sizzel + rök vid pålägg.**~~ ✅ (rök nu ritad, inte 💨)
- ~~**[Quick] Flytta mätaren till grillen.**~~ ✅
- ~~**[Medium] En grill-maskot.**~~ ✅ 2026-08-05 (Bobo med kropp, förkläde, kockmössa)

Originaltexten för de avbockade punkterna står kvar nedan.

- **[Medium] Per-lager grill-respons.** Tinta lagren individuellt: bara biff/bacon brynas mot mörkt,
  osten *smälter* (rinner ut lite) och bröden rostas svagt — sallad/tomat ändras knappt. Tar bort
  den konstiga "svarta salladen" och gör grillningen trovärdig. (Kräver att stapla vy:erna med egna
  tint-mål i stället för helhets-tint på containern.)
- **[Medium] En kund med en bild-order.** Sätt en hungrig figur (Zacke/Bobo) med en pratbubbla som
  visar en önskad stapel; vid servering tuggar och jublar hen. Frivilligt mål, ingen bestraffning —
  ger bygget en mottagare.
- **[Deep] Ketchup/senap-klämma + servera.** Ett kläm-drag som ritar en slingrande sås på ett lager,
  och en serverings-gest (dra burgaren till en bricka/kund) som avslutning i stället för auto-reset.

### Variation & överraskning
- **[Quick] Låt släpp-positionen betyda något.** Om man släpper lågt i stapeln, skjut in lagret där
  (inte alltid överst) — ett litet men kännbart val. Behåll snäpp-hjälp så små händer ändå lyckas.
- **[Medium] Specialtillbehör.** En sällsynt glittrig ingrediens (regnbågsbiff) eller en
  "extra-hög"-utmaning som ibland dyker upp och firas — en liten wow-krok per runda.

### Juice
- **[Quick] Sizzel + rök vid pålägg.** När en ingrediens läggs på grillen: en liten rök-puff och ett
  fräs-ljud. Lågorna (redan flimrande) kan slicka högre ett ögonblick.
- **[Quick] Flytta mätaren till grillen.** Lägg ton-mätaren/färgringen precis vid grillen där
  burgaren ligger, så blick och färg möts. Värme-flimmer över gallret.

### Progression
- **[Quick] Burgar-galleri.** Spara en miniatyr av varje grillad burgare (i `custom.burgare`-bok) —
  "mina burgare" att bläddra, en anledning att återkomma.

### Karaktär & berättelse
- **[Medium] En grill-maskot.** Bobo i förkläde som tar emot bygget, vänder på grillen och räcker
  fram den klara burgaren — kommenterar roliga pålägg ("En strumpa?! Hihi"). Befolkar köket.

### Ljud
- **[Quick] Grill-ambient.** En lågmäld fräsande grill-loop (volym/intensitet följer `_bake`) och
  ett mjukt sizzel när maten läggs på. Gör scenen levande.

## 5. Status / loggar

- 2026-08-11 🍞 **LYFTPLAN B2: bröden är MJUKA KROPPAR** (natt VI N4).
  §3:s "ingredienserna interagerar inte" hade en tvilling ingen skrivit ner: en burgare med nio
  lager såg exakt lika lätt ut som en tom, för bullarna var två `roundRect` som aldrig ändrade
  form. Nu bär **underbullen stapelns tyngd** — den plattas, breder ut sig, och hela stapeln
  sätter sig med den — och **locket får en impuls** varje gång stapeln växer.
  Formen ligger i `bulle.js`: `Mjukkropp` med en rundad-rektangel-`form()`, glansband skurna ur
  kroppens egen kurva, sesamfrön fästa i kupolens egen rymd. Vikten är lagrens totala tjocklek.
  **MÄTT** (`_stapelprobe`, tre körningar i spelet): sammantryckning **8,4–10,3 px monotont**
  lager för lager · bredd 224 → 229,5 px · **glapp mot understa lagret 0,00 px** · `rorelse`
  tillbaka på **exakt 0,000** · exit mitt i vobbeln lämnar ingenting igång · 0 konsolfel.
  **Den tomma burgaren är oförändrad** — den ritade kurvan mäter 224,0 × 50,0 px mot den gamla
  `roundRect`:ens 224 × 50, verifierat både i tal (`_bullprobe`) och på skärmdumpen.
  ⚠️ Fyra fällor på vägen, alla gröna i `npm run test`: en golvklämma räckte inte (den plana
  botten måste PINNAS, annars en gränscykel med `rorelse` 9,9 som aldrig avtog) · tidssteget
  måste vara FAST (`dtF` 2 vek ihop bullen 34,9 px för gott, och för små delsteg gav en helt
  annan jämvikt — 3,1 px i spelet mot 7,0 i sonden, för att Chrome gick på 58 fps) · stapelns
  bas måste läsas ur bullens LEVANDE ovansida (annars svävar understa lagret) · och ett glansband
  måste vara ett **vågrätt snitt**, inte en förskjuten kant — en förskjuten kant får en diagonal
  skarv vid gaveln och gjorde bröden till båtar med kant. Bara skärmdumpen såg det sista.
  Bonus: de gamla banden var bredare än brödet på sin egen höjd och la en ljus flik **utanför**
  silhuetten; det slutade de med när de skars ur kroppen.
  Nya sonder: `scripts/_bullprobe.mjs` (formen i tal, utan webbläsare) och
  `scripts/_stapelprobe.mjs` (bygger en riktig burgare och mäter vad tyngden gör).

- 2026-08-10 🎨 **D1: ingrediensbrädan fick ljus** (`924387f`, v1.125.0).
  Brädan låg på **53 821 px i EN ton** — spelets största fält. `pizzabageriet` har EXAKT samma
  konstruktion och fick den tonad i ett tidigare D1-pass; den här missades då.
  ⚠️ **Första försöket tonade KAKLET**, på en gissning om var fältet låg — talet rörde sig då
  knappt alls (55 584 → 53 821). Det är signalen att hypotesen om PLATSEN är fel.
  `scripts/_bbox.mjs` (skriven i samma veva, `429654d`) pekade direkt ut `73,630 → 1206,712`,
  alltså brädan. Kakel-ändringen backades.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **55 584 → 48 525 px.**

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`526fafb`, v1.107.0).
  `_plattprobe --medbakgrund` mätte **368 274 px = 40 % av skärmen** i EN ton.
  Fyndet är lärorikt: det var KAKLET. Rutorna BRYTER ytan för ögat, så väggen ser inte
  platt ut — men varje ruta har exakt samma färg, så väggen saknade helt ljus uppifrån-ned.
  Måttet räknar färg, inte sammanhängande ytor, och hade rätt ändå. Ett lågalfa-ark med
  lodrät toning ligger nu över HELA väggen; det måste vara ett eget objekt eftersom `alpha`
  inte gick att kombinera med en gradientfyllning. Bänkskivan lämnades — den har redan en
  handgjord toning i tre band.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **368 274 → 55 851 px** (40 % → 6,1 %).

- 2026-08-05 ✅ **Poleringsrundan, Roligt #3 — spelet var mekaniskt helt men visuellt tunt.**
  1. **P0 ASSETS [blockerande]** — 54 av 63 ingredienser var emoji i en `Text`. Ny
     `ingredienser.js` ritar **alla 63 i sidoprofil** som fristående Graphics (egen silhuett,
     glans, kontur på allt ljust). Även soptunnan, grillknappens ikon (`🔥⬅️` lästes som en
     blå ruta), röken (`💨`) och den serverade burgaren är nu ritade. Ingen emoji är längre
     ett spelobjekt.
  2. **Per-lager grillning [Medium]** — §3:s största brist är borta. Varje lager har ett eget
     `bake`-värde: biff/bacon/korv går mot mörkt, sallad och gurka ändras knappt, osten
     *smälter* (sjunker ihop och breder ut sig), bröden rostas svagt. Ingen becksvart sallad.
  3. **Bobos önskelista [Medium]** — pratbubbla med 1–2 ritade önskningar ur de 23 "goda"
     ingredienserna. Träff ger extra fest direkt; uppfylld order ger en gladare servering.
     Ny önskan varje omgång. Helt frivillig — aldrig ett krav, aldrig ett misslyckande.
  4. **Riktigt kök [Quick]** — kaklad vägg, fläkt med lampa över grillen, bänkskiva, golv,
     ketchup-/senapsflaskor, upphängda redskap och en **serveringslucka** bakom Bobo (utan
     den försvann en cream-färgad björn mot en cream-färgad vägg — sjunde läckan).
  5. **Grillmästaren Bobo [Medium]** — var ett svävande huvud, har nu kropp, rutigt förkläde,
     tassar, kockmössa och vilo-guppning.
  6. **Stapeln läser som EN burgare** — lagertjockleken mäts nu på den *ritade* formen
     (`layerThickness`, min av mätt höjd × 0,84 och ingrediensens `th`) i stället för en
     handskriven siffra, och varje ritning centreras kring sin egen massa. Tidigare svävade
     lagren isär som lösa brickor.
  7. **Bugg [blockerande, hittad av `spelkritiker`]** — ett redan staplat lager gick inte att
     dra om eller slänga: `_dragLayer` hade `eventMode = 'none'`, vilket skär bort **hela
     subträdet** från händelser. Lagret frös mitt i draget och greppet kunde aldrig avslutas.
     Nu `'passive'` (samma lösning som `pizzabageriet` redan hade). Verifierat: släpp i
     soptunnan tar bort lagret, släpp utanför snäpper tillbaka, och nästa drag fungerar.
  8. `gsap.delayedCall` → **`ctx.later()`** (exit-säkerhet) · ton-mätaren flyttad ur
     redskapshyllans väg · alla 63 ingrediensnamn ligger nu som literaler i
     `voice-phrases.json` (talas via `item.sv` — check hittar dem inte).
  Kvar i §4: ketchup-/senapsklämma [Deep], burgar-galleri [Quick], sällsynt specialingrediens
  [Medium], och ett riktigt fräs-*sample* när MOSS är uppe (i dag procedurell ton).
  `npm run check -- --game hamburgerbygget` grön · `npm run test hamburgerbygget` 0 fel ·
  skärmdumpar granskade i alla faser (bygg / stapel / grill / servering) + riktade drag-tester.
- 2026-06-30: Doc skriven efter källäsning (inkl. `lib/cooking.js`) + playtest (errorCount 0, drag
  staplade sallad/tomat mellan bröden, skärmdump granskad). Inga kodändringar. Rekommenderad
  första-omgång: **[Medium] per-lager grill-respons + [Medium] kund med order + [Quick] sizzel/rök**
  — adresserar den största bristen (allt kolnar likadant och ingen äter), höjer trovärdighet och
  payoff på en gång.
- 2026-07-01 🔧 **Första-omgången byggd (scoped, mönster #2):** (1) **Hungrig kund [Medium]** — en
  `makeMascot`-Bobo uppe till vänster; vid "Ta av" flyger burgaren (med sin grillade ton) till kunden
  som mumsar (`_serveToCustomer`: pop + 😋/Mums! + röst) → man bygger åt NÅGON. (2) **Sizzel/grill-
  ambient [Quick]** — litet sizzel när ett lager läggs på + subtil grill-fräs (tätare ju hetare) via
  `audio.tone()`. (3) **Mätaren till grillen [Quick]** — ton-mätaren flyttad från tomma vänsterytan
  till grillen (blick + färg på samma sida). Per-lager grillning + kund-order + skär&servera (Deep)
  lämnade till senare. errorCount 0, skärmdump bekräftar kunden.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): kakelvägg (loop från row −3, samma 64-rutnät) + bänkskiva/golv breddade. Hyllan var redan maskad. Testad båda viewports: 0 fel.
- 2026-08-09 ✅ **Vilorörelse [Quick]** (v1.70.0): hyllans 63 ingredienser guppar var för sig — rörelsen ligger på den inre vyn, `slot` äger tryck och svep. Delad `feedback.liv()` med egen fas per föremål. Mätt med `_livprobe`: 9,1 px / 0,44, 0 tweens kvar efter exit.
- 2026-08-09 ✅ **Karaktärsrigg [Medium]** (v1.71.0): Bobo är en RIGG (`lib/karaktarer.js`), inte en stillbild — `kropp: false` — förklädet ÄR grillmästarens roll. Han väntar `hungrig`, följer med blicken det barnet drar (annars bygget) och reagerar `nam` när burgaren serveras, `stolt` om den matchade önskelistan. Yttre containern är spelets (läge, hopp, träffyta), riggen äger sin egen skala.
