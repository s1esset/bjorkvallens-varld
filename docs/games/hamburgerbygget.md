# Hamburgerbygget (`hamburgerbygget`)
> 🎉 roligt · drag · 2–5 år · status: 📝 plan klar

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
