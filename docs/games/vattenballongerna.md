# Vattenballongerna (`vattenballongerna`)

> ⚙️ fysik · mixed (tap + drag) · 3–5 år · ✅
> Status: ✅ byggt (N1, 2026-10-02) — kärnloopen spelbar och mätt i skärmdump; [Deep]-posterna i §4 är medvetet skurna extras

Ursprung: idélistan (`docs/idelista-fysikspel.html` kort 4, `docs/IDEER.md` §6 post 4). Ägaren
sov; kortet godkändes av orkestreraren enligt beställningen *"gå på alla dina rekommenderade saker
vid varje vägskäl"* (2026-10-02 ~22:40).

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `vattenballongerna` |
| **titleSv** | Vattenballongerna |
| **icon** | 💦 |
| **band** | småbarn [3–5] → fliken Fysik |
| **kategori** | `fysik` → flik Fysik |
| **input** | mixed (tap på kranen + drag för att sikta; tap-tap-reserv: tryck på ett djur → ballongen kastas mot det med en lagom bana) |
| **ålder** | [3, 5] |
| **kärnloop** | Tryck på kranen → en ballong fylls vid kranen, sväller och dallrar (mjukkropp). Dra bakåt från ballongen → en prickad bana visar vart den flyger (AimLauncher). Släpp → ballongen vobblar genom luften och spricker mot ett varmt djur i en kaskad av vatten (SPH, bara där det stänker). Djuret går från rött och svettigt till blått och nöjt. |
| **mål** | Alla fyra djuren är svalkade → finish → `progress.complete()` |
| **agens** | Vilket djur barnet siktar på, vinkel och kraft. Vinden (synlig i en flagga) gör att samma drag landar olika. |
| **variation** | Fyra djur ur en pool på sex (`lib/variation.js` `pase`), slumpade platser, och de vandrar långsamt fram och tillbaka · vindbyar (`lib/vind.js` Vindfalt) som flaggan visar, olika för varje kast · ballongens färg slumpas. |
| **mottagare** | Djuret som träffas skakar sig nöjt, får blå kinder, och elefanten sprutar tillbaka med snabeln (andra djur: skakar vattnet av sig som en hund / hoppar). |
| **finish** | När alla fyra är svala: alla djuren sprutar vatten upp i luften samtidigt och en regnbåge växer fram i vattendimman — spelets EGEN plaskfest. |

**Djurpoolen (sex, fyra per omgång):** elefant, gris, lejon, hund, giraff, isbjörn — ritade djur ur
befintliga spel får återanvändas (`tvatta-djuret`), inga människor behövs.

**Röstrepliker**
```
"Djuren är så varma! Tryck på kranen och fyll en ballong."   (intro, voiceIntro)
"Dra bakåt och sikta!"
"Plask! Nu är det svalt!"                                     (beröm vid träff)
"Plask i gräset! Anden tycker om pölen."                      (miss — roligt)
"Solen värmer igen!"                                          (motgång)
"Tryck på kranen!"                                            (om-cue ~6 s)
"Jag hjälper till!"                                           (sen hjälp)
"Alla djuren är svala! Vilken plaskfest!"                     (finish)
```

**Beslut (orkestreraren, 2026-10-02):**
- **Flygningen** (kortets "mät först"): `lib/mjukkropp.js` har ingen kollision mot mark/väggar.
  En matter-cirkel bär flygningen och träffen; mjukkroppen är bara bild och dallring och följer
  cirkeln (fast tidssteg via `lib/takt.js`). Mät i skärmdumpen att ballongen ser mjuk ut i luften
  och vid nedslaget.
- **Vätskan:** `lib/vatska.js` SPH föds BARA i nedslagszonen och rivs när den har runnit klart
  (lärdomen "simulera bara där vätskan syns", `saftbaren`/`vattenvagen`, FluidView `area`).
- **Motgång:** solen värmer långsamt upp ETT svalt djur igen ibland — aldrig mer än ett åt gången
  (tak), aldrig ett straff, och aldrig efter att det sista djuret blivit svalt.
- **Miss** = roligt: en pöl i gräset, en and kommer och badar i den (pölen försvinner sakta).
- **Hjälp, sent och synligt:** efter tre missar i rad stannar vinden och djuret närmast siktet
  vandrar lite närmare — "Jag hjälper till!". Aldrig automatiskt sikte.
- **Skuret till [Deep]:** ballongen som ibland inte spricker utan studsar och spricker senare ·
  storleksvariation (stor ballong = tung, kommer inte långt) · `luftmotstand.js` · `Varmefalt`.

**Fysik:** `lib/launcher.js` AimLauncher (pricklinje via skuggvärlden G3a — se `bowling`,
`rulla-bollen-hem`) · `lib/vind.js` Vindfalt + flagga (`studsa-ner`) · `lib/mjukkropp.js` +
`lib/takt.js` för ballongen · `lib/vatska.js` SPH i nedslagszonen.

## 1. Nuläge (sett som spelare)

En ljusgrön äng, en stor trädgårdskran till vänster med ett rött vred (en gul ring lyser tills barnet tryckt),
en flagga på en stång som visar vinden och fyra varma djur (röda, svettiga, med värmevågor) ur en pool på sex
(elefant, gris, lejon, hund, giraff, isbjörn) som vandrar långsamt. Tryck på kranen → vredet snurrar, en
ballong i slumpad färg sväller ur pipen (1,25 s, dallrar, vattnet porlar) och hänger sedan redo. Dra bakåt från
ballongen → den dras mot fingret och en prickad bana (genom en skuggvärld: exakt den riktiga flygningen, vinden
inräknad) visar var den spricker. Släpp → ballongen vobblar genom luften, plattas till en kort stund vid
nedslaget och spricker i gummibitar, droppar och en riktig SPH-kaskad. Stänket vid ett djur → det blir svalt:
färgen rensas, ansiktet blundar leende med blå kinder, och det reagerar (elefanten lyfter snabeln och sprutar
tillbaka, hunden skakar sig, de andra hoppar). Miss → en pöl i gräset och en and som kommer och badar. Solen
värmer upp ETT svalt djur i taget (en synlig solstråle, högst två gånger per runda). Alla fyra svala → alla
djuren sprutar vatten uppåt och en regnbåge växer fram, `complete()`, och en ny runda med nya djur.

**Sondkrok** (för orkestreraren): `mod._kran {x,y}` (kranens tryckpunkt) · `mod._ballong {x,y,fylld,flyger,k}` ·
`mod._djur[i]` (`.x`, `.brost`, `.sval` 0..1, `.svalad`, `.art`) · `mod._st` (ingen · fyller · klar · flyger · splat ·
finish) · `mod._vindNu` (px/steg) · skjutplatsen är `SKOTT` (262, 508) i `konst.js`.

## 2. Ursprunglig plan & tankeprocess

Sommarlek som alla barn känner igen: vattenballonger. Kastet är en riktig bana (siktet lär orsak
och verkan), vinden gör att varje kast är nytt, och målet är omsorg — djuren mår bättre.

## 3. Vad gör det lättjefullt / tunt

*(fylls i efter kritiken)*

## 4. Förbättringar & förhöjningar (plan)

**Byggt 2026-10-02 (strukna härifrån):** kranen · fyllningen med dallrande mjukkropp · pricklinjen (skuggvärld) ·
vinden (Vindfalt + flagga) · SPH-kaskaden · djuren som blir svala · pölen + anden · solens uppvärmning (tak) ·
hjälpen efter tre missar · finishen med regnbåge.

**[Deep]** blindgångaren som studsar, rullar och spricker senare på ett oväntat ställe ·
storleksvariation (en stor ballong är tung) · luftmotstånd per ballong · värmen som riktigt
`Varmefalt` per djur · mjukkroppen som egen kollision mot mark/vägg (`lib/mjukkropp.js` saknar den — idag
bär en matter-cirkel flygningen).

## 5. Status / loggar

- 2026-10-02 · spec-kort + stomme (N1, orkestreraren) · —
- 2026-10-02 · byggt (N1, B2): `index.js` (loop, fysik, vind, vätska), `djur.js` (sex ritade djur + värmen),
  `ballong.js` (mjukkropp + mjukmesh, vobbla/platta), `kulisser.js` (kran, flagga, and, pöl, solstråle, regnbåge),
  `konst.js` (tal, vindlottning, lobb-lösaren). Mätt: min egen integrator = matter = skuggvärldens bana (0,0 px);
  mjukkroppens egen drift (−110 px/s med äggform) rättad genom punktsymmetrisk form + `flyttaTill` varje bildruta.
  Skärmdumpar: sikte, flygning, träff, miss + and, solstråle, finish (se `.test-shots/vb-*.png`).
- 2026-10-02 · fixvarv 1 (kritiken): kran/djur/äng svarar på `pointerdown` (P0 <100 ms) · djuren ×0,85,
  210 px isär, snabbare vändning · giraffens ansikte större · tap-reserven väljer ett slumpat varmt djur ·
  lejonet skakar sig, isbjörnen snurrar · varma ansikten utan arga ögonbryn. Mätt (`_natt-vattenballongerna`,
  riktig mus, ett självrättande otåligt barn): två rundor till `complete()` på 7 och 9 kast (4 träffar var),
  drag från tom äng kastar ingenting, 0 konsolfel.
