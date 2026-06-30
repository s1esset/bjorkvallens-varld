# Bajs och Kiss (`bajs-och-kiss`)
> 🎉 roligt · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Ett ljust badrum med kaklat golv. Elvira och Zacke står till vänster och turas om att hålla
en söt bajskorv 💩. Jag *drar* korven (slunga-fritt, AimLauncher) → en prickad kastbåge visar
var den hamnar, jag släpper → korven flyger som en riktig matter.js-kropp i en båge, studsar
mot pottkanten och golvet och — om den landar i skålen — **PLOPP!** En liten mätare uppe i
mitten fylls med en 💩 per lyckat kast (3–5 behövs). Full mätare → stort firande, båda barnen
hoppar, nästa nivå (pottan flyttas längre bort + krymper).

Två kontroller styr utfallet: tre **storleksknappar** (Liten/Mellan/Stor = lätt/normal/tung →
kort eller lång båge via MATERIALS), och en **pruttvind** 💨-knapp som blåser korven åt höger
(och håller pricklinjen ärlig via `setPreview`). En busig **spol-knopp** på toalettlådan är ett
gömt påsk-ägg: tryck → "pappa" 👨 ramlar ner uppifrån och spolas ner i en snurrvirvel medan
barnen skrattar. Missar är ofarliga (puff + "Hihi!"/"Hoppsan!"), och efter 4 missar tar
kompisen ett garanterat plopp. Mätaren går bara uppåt.

**Funkar bra:** kärnloopen har äkta agens — storlek + vind förändrar bågen mätbart, och
pricklinjen är kalibrerad (`previewGravity 0.42`). No-fail är generöst (assist efter 4 missar,
inte 2). Turordningen Elvira/Zacke och spol-knoppens pappa-gag ger värme och skratt. Allt ritas
programmatiskt och städas exit-säkert.

*(Skärmdump: badrum, Elvira + Zacke till vänster, potta till höger, Liten/Mellan/Stor-knappar
nere, tom 3-platsers mätare uppe.)*

## 2. Ursprunglig plan & tankeprocess

Toaletthumor är *guld* för 3–5-åringar — den busiga, lite förbjudna skratt-tändaren. Designen
tar den fniss-energin och hänger den på ett riktigt sikt-och-kasta-mål (AimLauncher + matter.js)
så att leken har djup: barnet *väljer* båge, kraft, storlek och vind, ser konsekvensen och får
ett tillfredsställande plopp. Pott-träning bakas in mjukt och positivt (bajs hör hemma i pottan,
aldrig skam). Spol-knoppens pappa-gag finns för det där extra fniss-wow:et som får barn att visa
en vuxen. Allt är no-fail by design: kompisen räddar alltid till slut.

## 3. Vad gör det lättjefullt / tunt

Stark mekanik, men en kräsen spelare/förälder märker det billiga:

- **Badrummet är en tom blå tapet.** Scenen är bara en vatten-gradient + kaklat golv. Inget
  handfat, ingen spegel, inga handdukar, ingen toarulle, ingen badrumskänsla. För ett spel som
  *handlar* om ett badrum är rummet anonymt och kalt (se skärmdumpen — stora tomma blå ytor).
- **Barnen är kartong-figurer som bara guppar.** Elvira/Zacke har fasta ansikten och en
  liten studs vid plopp. De *strängar inte an* före kastet (ingen knip-anticipation, ingen
  rolig min), grimaserar inte, byter inte uttryck. Toaletthumorns bästa skämt — själva
  "uuuh… PLOPP!"-uppladdningen — saknas helt.
- **Pruttvinden slås på automatiskt från nivå 2 och blir bakgrund.** Den ena av de "två extra
  kontrollerna" sköter sig själv → barnet trycker den sällan medvetet. Agensen blir i praktiken
  bara storleksvalet.
- **Bara ETT mål, alltid samma potta.** Nivåvariationen är "flytta pottan längre + krymp den".
  Ingen variation i *vad* man siktar på, inga hinder, inget rörligt mål, inga olika bajs-typer.
- **Mätaren är abstrakta cirklar.** Att fylla 3–5 vita ringar säger inte "pottan blir full" på
  ett tematiskt eller roligt sätt; pottan i skålen ser likadan ut hela tiden.
- **Belöningen är generisk.** Samma `bigCelebration` som alla spel; ingen egen pott-/badrums-
  vinstanimation (t.ex. spolning, glad potta-figur).
- **Spol-gagen är gömd och osammanhängande.** Pappa-virveln är härlig men knoppen är liten och
  grön, lätt att missa, och kopplad till inget i kärnloopen. Många barn upptäcker den aldrig.
- **Ljudpaletten är tunn.** `fart`/`plopp`/`pop`/`soft` räcker till grunden men det finns ingen
  stigande "plopp-kombo", ingen variation i plopp-klangen, inget spol-svisch som belöning.

Kort sagt: *mekaniskt rikt, scenografiskt och karaktärsmässigt fattigt*. Humorn bor i koden
(röstfraser, pappa-gag) men inte i bilden — barnen och rummet bär den inte.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Knip-anticipation före kast.** Låt den aktiva ungen göra en kort, fnissig
  "stånka"-pose (lutar fram, kinder puffar, 💨-pip) precis innan korven föds — så blir varje
  kast en liten komisk uppladdning istället för att korven bara dyker upp i handen.
- **[Medium] Gör pruttvinden till ett aktivt val igen.** Slå inte på den automatiskt; låt den
  istället *erbjudas* (knappen guppar/lyser) när pottan står långt bort, så barnet känner att
  *det* löste kastet med vinden. Behåll auto-assist som säkerhetsnät.
- **[Deep] Fler siktemål & lekfulla hinder.** Variera vad man siktar på per nivå: en gungande
  potta på hjul, en pall i vägen att studsa över, två pottor (välj vilken). Allt fortfarande
  no-fail — hinder gör bara bågen roligare att lista ut.

### Variation & överraskning
- **[Quick] Olika bajs-typer per kast/nivå.** Glitterbajs ✨, regnbågsbajs 🌈, jätte-plums-bajs
  som ger extra-stor ploppe. Rotera så tur 2 inte ser ut som tur 1.
- **[Medium] Knyt spol-gagen till loopen.** Låt spol-knoppen lysa upp som en *belöning* efter
  full mätare ("spola allt!") så pappa-virveln blir en upptäckt alla får se, inte en gömd
  slump. Lägg fler spolbara busgäster (badanka, en strumpa, en leksak) för upprepningsvärde.

### Juice
- **[Quick] Saftigare plopp.** Stigande tonhöjd vid plopp-i-rad (kombo som klättrar) + ett
  litet stänk av "pott-vatten"-droppar + en mikroskak som skalar med bajs-storleken.
- **[Quick] Tematisk mätare.** Byt de abstrakta ringarna mot en liten potta som *fylls*
  synligt korv för korv (och puttrar nöjt när den är full), så framsteget blir begripligt utan
  läsning.

### Progression
- **[Quick] Mjuk scenövergång mellan nivåer.** Cross-fada bakgrunden / låt ett nytt badrums-
  tema glida in istället för hård ompositionering av pottan, så världen känns sammanhängande.

### Karaktär & berättelse
- **[Medium] Levande badrum.** Bygg in handfat, spegel (där barnens min syns!), handdukshängare,
  toarulle, en kackel-vägg och kanske en nyfiken katt — så rummet bär humorn. Använd bara
  godkända namn (Elvira/Zacke/Alissa/Lova) på avbildade personer.
- **[Deep] Reaktiva barn.** Ge Elvira/Zacke uttryck som byter med utfallet: stora ögon under
  flygningen, jubel-min vid plopp, fnitter-min vid miss, "heja"-vift mot kompisen. Det är här
  spelets själ skulle vakna.

### Ljud
- **[Quick] Spol-svisch som vinstljud** + variera plopp- och fart-klippen så de inte blir
  monotona; lägg en lugn badrums-ambient (droppande kran) i botten.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] knip-anticipation + reaktiva barn + [Quick] tematisk
  pott-mätare** — lyfter humorn och karaktären där spelet är som tunnast, utan att röra den
  redan starka kast-mekaniken.
