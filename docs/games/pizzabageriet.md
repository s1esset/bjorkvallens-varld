# Pizzabageriet (`pizzabageriet`)
> 🎉 roligt · drag · 2–5 år · status: ✅ marknadsklar

> **Uppdatering (v1.0 UX-svep):** Ny layout — Bobo-loggan centrerad högst upp, pizzan till
> vänster, mindre ugn till höger, gräddaknappen (nu **ikon ➡️🔥** utan text) i kolumnen mitt
> emellan med en **soptunna 🗑️** rakt under. Placerade toppings kan nu **dras om** på pizzan,
> dras till soptunnan för att tas bort (puff + glad tunna), eller släppas utanför → studsar
> tillbaka med en vingel. Hyllan **slumpas** varje start och har utökats till 65 ingredienser
> (+10 goda toppings, +10 äckligt-roliga, + specialarna Pappa/Mamma/Fluga/Gulligt monster/
> Kissdroppe/Använd blöja/Potta/Prutt). Verifierad i webbläsare: placering, omflytt, soptunna,
> gräddning och exit-mid-animation utan fel.

## 1. Nuläge (sett som spelare)

Ett varmt kök. Till vänster ligger en rund pizza på ett fat (skorpa, tomatsås, ost med små
ost-fläckar); till höger en stor grå ugn med mörk lucka. Längst ner en hylla med tolv ingredienser
i fullstorlek — tomat, svamp, paprika, ost, majs, ananas, fisk, räka … och roliga grejer som 💩
🧦 🦷 ⭐. Mitt på en stor knapp: **Grädda 🔥**.

Jag drar valfri ingrediens från hyllan upp på degen och släpper var som helst → den fastnar i
fullstorlek där jag släppte, lätt roterad, med ett "pop" och små gnistor. Jag kan lägga hur många
jag vill (upp till 60) i vilket mönster som helst — fri skaparlek. När jag trycker **Grädda** åker
pizzan in i ugnen, krymper för att passa hålan, och **mörknar långsamt** längs en ton-gradient
(ljus → gyllene → brun → kol). En **ton-mätare** under ugnen visar färgen med en glidande markör
och en 😋 över den gyllene zonen. Jag tittar och trycker **Ta ut 🧤** när den ser god ut. Vad jag än
väljer är det rätt: även becksvart är bara roligt ("Hoppsan, alldeles bränd! Hihi!"), och firande +
klistermärke kommer varje gång. Sedan en ny, ren pizza.

**Funkar bra:** fri placering i fullstorlek (ingen ikon-bricka) känns generöst och kreativt, de
roliga ingredienserna ger fniss, ton-gradienten + mätaren lär ut "titta på färgen" utan press, och
no-fail är total (becksvart tas ut automatiskt efter 1,8s). Allt programmatiskt, exit-säkert.

*(Skärmdump: pizza med fisk + tomat på degen, ugn till höger, ingredienshylla nere, Grädda-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Intentionen (ur kodkommentaren) var **fri skaparlek + "passa färgen"**: först pynta pizzan med vad
som helst (allt går — mat, fisk, bajs, strumpa), sedan ett lugnt timing-moment där barnet *tittar på
färgen* och tar ut när det ser gott ut. Det pedagogiska fröet är observation och självreglering
(när är det lagom?) utan rätt/fel — även bränt firas. Den delade `lib/cooking.js` (ton-gradient,
ton-replik, ton-mätare) återanvänds av burgar-spelet så de två matspelen delar samma snälla
tillaga-till-ton-loop. Att visa själva saken i fullstorlek (inte en ikon) var ett medvetet val för
de minsta.

## 3. Vad gör det lättjefullt / tunt

Charmig och snäll, men loopen är tunnare än den ser ut:

- **Ingen äter pizzan — ingen beställer den.** Loopen är dekorera → grädda → reveal → reset, i
  oändlighet. Det finns ingen kund som väntar, ingen order ("en pizza med tre svampar"), ingen som
  tuggar och blir glad. Pizzan görs och … försvinner. Hela fantasin "bagare som lagar åt någon"
  saknar mottagare, vilket gör tillagningen till en färg-titt utan syfte.
- **Topparna bakas inte — de bara mörknar med.** Hela `_pizza`-containern tintas som en enhet, så
  topparna blir mörkare på köpet, men de *reagerar inte individuellt*: osten smälter inte, tomaten
  bubblar inte, inget krymper eller fräser. De ligger som klistermärken ovanpå.
- **Fast ingrediens-set, en enda gest.** Tolv emoji, samma varje gång. Ingen sås att breda, ingen
  ost att riva, inget att skiva — bara "stämpla emoji på degen". Variationen sitter helt i barnets
  mönster, inte i mekaniken.
- **Mätaren och maten är åtskilda.** Ton-mätaren sitter långt till höger (under ugnen, `OVEN.x,600`)
  medan pizzan är *inne i den mörka ugnen*. Barnet måste titta på mätaren ELLER på pizzan — de är
  inte på samma ställe, så "titta på färgen" blir egentligen "titta på en markör".
- **Ugnen är en stillbild.** Pizzan glider in och tintas; ugnen snurrar inte, lyser bara svagt
  (glöd-alpha), pizzan bubblar inte, ingen lucka öppnas/stängs. Gräddningen är en färgramp, inte en
  scen.
- **Ingen finish-handling.** Reveal är generisk `sparkle` + 😋. Pizzan skärs aldrig i bitar (en
  klassisk, tillfredsställande payoff), läggs aldrig i en kartong, serveras aldrig.
- **Tunt ljud.** `tap`/`pop`/`whoosh`/`reveal`. Ingen fräsande ugn, inget bubbel, ingen knastrande
  skorpa. Köket låter inte som ett kök.

Kort sagt: en fin *målarlek på en pizza* med ett lugnt timing-moment, men **ingen att baka åt och
inga ingredienser som lever i ugnen** — och den självklara belöningen (skära & servera) saknas.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] En kund med en bild-order.** Sätt en hungrig figur (Elvira/Bobo) vid sidan med en liten
  pratbubbla som visar t.ex. "🍄🍄⭐" — barnet *kan* uppfylla önskan men straffas aldrig för att låta
  bli. Vid servering tuggar kunden och blir lycklig. Ger tillagningen en mottagare och ett (mjukt,
  frivilligt) mål utan att bryta sandlådan.
- **[Deep] Skär & servera som final.** Efter "Ta ut": ett drag-moment där barnet skär pizzan i
  bitar (dra en pizzaskärare över) och drar en bit till kunden. En riktig, fysisk payoff i stället
  för en automatisk reset.

### Variation & överraskning
- **[Quick] Sås- och ostval.** Lägg ett par baser (vit/röd sås, mer/mindre ost) som dras/bres
  innan topping — ett enkelt extra val som ändrar pizzans utseende och känns som "min pizza".
- **[Medium] Roterande dagspizza / specialingrediens.** En sällsynt glittrig ingrediens (regnbågs-ost)
  eller en "dagens" som dyker upp ibland och ger extra gnistor — en liten wow-krok.

### Juice
- **[Medium] Ingredienser som lever i ugnen.** Låt osten *smälta* (flyter ut lite), pepperoni
  krympa/krulla och kanterna bubbla under gräddningen — per-topping-reaktion, inte bara helhets-tint.
- **[Quick] Flytta mätaren till pizzan.** Lägg ton-mätaren (eller en liten färgring) precis vid
  ugnsluckan/under pizzan så blick och färg är på samma plats. Lägg en värme-flimmer-effekt över
  hålan.

### Progression
- **[Quick] Pizzabok/galleri.** Spara en liten miniatyr av varje gräddad pizza i en "meny" (i
  `custom`) så barnet kan bläddra sina skapelser — något att samla och komma tillbaka till.

### Karaktär & berättelse
- **[Medium] En bagar-maskot.** Bobo i kockmössa som tar emot, sätter in i ugnen och räcker fram
  pizzan — reagerar på topping ("Oj, en strumpa! Hihi") och firar med barnet. Befolkar köket.

### Ljud
- **[Quick] Köks-ambient + fräs.** En lågmäld ugnshum + ett fräsande/bubblande ljud som tilltar med
  `_bake`, och ett mjukt "knaster" när skorpan blir gyllene. Gör köket levande.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter källäsning (inkl. `lib/cooking.js`) + playtest (errorCount 0, drag
  placerade toppings, skärmdump granskad). Inga kodändringar. Rekommenderad första-omgång:
  **[Medium] kund med bild-order + [Deep] skär & servera + [Quick] mätaren till pizzan** — ger
  loopen en mottagare och en payoff, vilket är den största bristen.
- 2026-08-05 ✅ **Poleringsrundan (Roligt #2) — assets, scen och finish.** Spelet var
  mekaniskt helt men visuellt tunt; skärmdumpen visade en gradient utan kök, ett svävande
  Bobo-huvud och 65 emoji-ingredienser.
  1. **P0 `ASSETS` löst helt [Deep]** — ny `src/games/pizzabageriet/ingredienser.js` med
     **alla 65 ingredienser ritade** som fristående Graphics (egen silhuett, glans,
     glada ansikten på djuren). Även soptunnan, pizzabiten som serveras och pizzaskäraren
     är nu ritade. Ingen emoji är längre ett spelobjekt — kvar finns bara knapp-ikoner
     (➡️🔥, 🧤), hint-text och fx-detaljer (💨/😋), vilket P0 tillåter.
  2. **Tomma scenen → ett riktigt bageri [Medium]** — kaklad vägg, mjölig bänkskiva med
     träådring, golv, kavel, mjölsäck och degskål. Ersätter den nakna gradienten.
  3. **Bagar-Bobo [Medium]** — huvudet har fått kropp, förkläde med hängslen och band,
     tassar, armar och kockmössa, plus en vilo-guppning (P0: eget liv).
  4. **Kund med bild-order [Medium]** (planens första punkt, tidigare oskriven) — en
     pratbubbla visar 1–2 ritade önskade ingredienser. Helt frivilligt: lägger man på en
     önskad sak jublar Bobo direkt, uppfyller man hela önskan blir serveringen extra glad.
     Aldrig ett krav, aldrig ett misslyckande. Ny önskan varje omgång = variationsaxel.
  5. **Ingredienser som lever i ugnen [Medium]** — osten smälter ut, topparna puttrar ur
     fas, ostbubblor stiger, plus ugnsfräs (`audio.tone`), ugnshum vid start och ett pling
     när den når gyllene. Köket låter som ett kök [Quick].
  6. **Spel-specifik finish [Deep]** — en ritad pizzaskärare far över pizzan, den delas i
     sex bitar med riktiga snitt, och en bit flyger till Bobo som mumsar. Ersätter generisk
     sparkle-reveal.
  7. **Layoutfel ur skärmdumpen** — hint-texten låg under hemknappen och bakom Bobos mössa
     (kortad + flyttad till x=400); det tomma fatet dominerade scenen under gräddningen
     (tonas nu ner till 0.4 och tillbaka vid reveal); ljusa ingredienser (ben/ägg/vitlök/
     stekt ägg) försvann mot den ljusa hyllan (fick konturer).
  8. `gsap.delayedCall` → **`ctx.later()`** genomgående (exit-säkerhet).
  Kvar i §4: sås-/ostval [Quick] och pizzabok/galleri [Quick].
  `npm run check -- --game pizzabageriet` grön · `npm run test pizzabageriet` 0 fel ·
  skärmdumpar granskade i alla tre faser (pynta / ugn / klar).
- 2026-07-01 🔧 **Första-omgången byggd (scoped, mönster #2):** (1) **Hungrig kund [Medium]** — en
  `makeMascot`-Bobo uppe till vänster; vid "Ta ut" flyger en bit pizza (med rätt gräddad ton) till
  kunden som mumsar (`_serveToCustomer`: pop + 😋/Mums! + röst) → man bakar åt NÅGON. (2) **Färgen
  på pizzan [Quick]** — en doneness-ring ritas runt pizzan i ugnen i den aktuella tonen (`bakeTint`),
  så blick + färg är på samma plats (utöver ton-mätaren). Kund-order (bild) + skär&servera (Deep)
  lämnade till senare. errorCount 0, skärmdump bekräftar kunden.
