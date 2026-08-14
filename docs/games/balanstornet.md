# Balanstornet (`balanstornet`)

> fysik · drag · 3–5 år · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec

| | |
|---|---|
| **id** | `balanstornet` |
| **titleSv** | Balanstornet |
| **icon** | ⚖️ |
| **kategori** | fysik → flik Fysik |
| **input** | drag |
| **ålder** | [3, 5] |
| **kärnloop** | Dra en kloss från byggbänken ut på plankan som vippar på en rund stödpunkt. Plankan lutar efter viktfördelningen, klossen landar och tornet svajar. Bygg upp mot flaggan. |
| **mål** | Tornets topp når flagghöjden och står stilla i 1,4 s → flaggan hissas, tornet tänds våning för våning underifrån, `progress.complete()`. Nästa runda har flaggan högre. |
| **agens** | VAR klossen läggs (fem kolumner: ±240, ±120, 0 px från stödpunkten) och VILKEN tyngd som väljs (massa 8,6 / 16,3 / 29,2). Uppmätt: en tung kloss ytterst lutar plankan 0,183 rad, en liten 0,043, en i mitten 0. Lägen och tyngder multipliceras — det är hela spelet. |
| **variation** | Stödpunktens bredd (K 48 · 58 · 72, rullens halvbredd 34 · 46 · 60 px) och plankans startlutning (−0,07 … +0,07 rad) slumpas per runda. Sällsynt ballongkloss (14 %, massa 2,5) som väger nästan ingenting och får tornet att svaja lustigt. Målhöjden växer 150 → 320 px. |
| **mottagare** | Bobo (`lib/karaktarer.js`) står vid stödpunkten: `heja` per lagd kloss, `hoppsan` när något ramlar, `jubel` vid mål — och han DUCKAR när plankan lutar ner mot honom. |
| **finish** | Flaggan hissas upp för stången med en stigande ton och viftar; därefter tänds tornet våning för våning UNDERIFRÅN (glanslager + pentatonisk ton per våning) innan konfettin. |

**Röstrepliker**
```
"Bygg ett torn på plankan! Dra en kloss dit du vill."      (intro)
"Dra en kloss ut på plankan!"                              (om-cue ~6 s)
"Var ska nästa kloss stå? Prova mitten!"                   (om-cue ~6 s)
"Oj, plankan lutar! Lägg nästa kloss på andra sidan."      (lutningen når rött band)
"Hoppsan! Allting ramlade ner i höet."                     (tipp)
"Det gör ingenting! Vi bygger vidare."                     (första tippet)
"Vi börjar där du var som högst!"                          (återbygge)
"Nu gör jag stödet bredare. Då står tornet stadigare!"     (no-fail-trappan)
"En ballongkloss! Den väger nästan ingenting."             (sällsynt kloss)
"Hurra! Tornet nådde ända upp till flaggan!"               (mål)
"Så högt!" · "Fint placerat!" · "En våning till!" · "Stadigt och fint!"   (beröm)
```

## 1. Nuläge (sett som spelare)

En äng med en 660 px bred träplanka som balanserar på en rund stenrulle. På stödet sitter ett
**vattenpass** vars bubbla glider åt det håll plankan lutar och byter färg grön → gul → orange.
Längst ner står tre klossar på en byggbänk (spjällåda · målad byggkloss · stenblock, ibland en
ballongkloss). Barnet drar en kloss uppåt; fem gula pilar visar kolumnerna den kan landa i, och
klossen släpps ner därifrån med ett pling som klättrar uppför en pentatonisk skala per våning.
Tung kloss ytterst = plankan sjunker synligt och det knakar; lätt kloss i mitten = nästan
ingenting händer. Blir obalansen för stor i mer än 0,3 s släpper stödet taget, plankan svänger
över och allt ramlar ner i höet — och byggs sedan upp igen från barnets bästa höjd.

Höger i bild står flaggstången med målflaggan och en streckad målsträcka in mot tornet.

## 2. Ursprunglig plan & tankeprocess

Repot hade redan ett staplingsspel (`bygg-tornet`) där en kran släpper klossen rakt ner på FAST
mark — där handlar valet om *timing i sidled*. Det här spelet flyttar hela frågan till
**underlaget**: marken är en vippande planka, och barnet lär sig viktfördelning genom att se
plankan svara direkt på var tyngden hamnar. Draget (i stället för ett tapp) gör att barnet bär
klossen och väljer plats medvetet.

Fysiken är matter.js: plankan är en dynamisk kropp fastnålad i stödpunkten med en
revolut-constraint, så klossarnas egen tyngd ger vridmomentet. Stödets BREDD modelleras som ett
återförande vridmoment per fast fysiksteg:

```
torque += -(vinkel − vila) · STOD_K − vinkelfart · STOD_DAMP
```

Jämvikten blir klossarnas moment delat med `STOD_K` — alltså är lutningen ett ärligt mått på
obalansen, inte en effekt. Alla tal är **mätta i matter utan webbläsare** innan en rad spelkod
skrevs (två sonder: jämviktsmätning per klosstyp och läge, samt en som SPELAR åtta
placeringssekvenser).

## 3. Vad gör det lättjefullt / tunt

- Placeringen är **kvantiserad till fem kolumner**. Det gör tap-tap-fallbacken möjlig (P0 kräver
  ≥96 px träffyta + 24 px mellanrum, vilket ger exakt 120 px kolumnavstånd), men fri placering
  hade gett finare gradering av obalansen.
- **Den säkra strategin är trivial för en vuxen**: allt i mittkolumnen tippar aldrig (uppmätt 0
  tipp i alla stödbredder). Det är medvetet — no-fail — men det gör att spelet inte har någon
  press. Utmaningen kommer från slumpad startlutning och från att bänken bara erbjuder tre
  klossar i taget.
- Klossarna deformeras inte och tornet har ingen egen "personlighet" mellan rundorna.
- Höbalarna är dekor plus två statiska kroppar; klossarna landar oftast i det utspridda höet
  under plankans ändar, inte på själva balen.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- [Medium] Fri placering i sidled med en snäppning som bara *hjälper* (behåll tap-tap via
  kolumnerna) — då blir obalansen kontinuerlig i stället för fem steg.
- [Medium] Ett uppdrag per runda ("bygg med bara två klossar", "nå flaggan utan att använda
  mitten") som ger den vuxna strategin motstånd utan att införa misslyckande.

**Variation**
- [Quick] Fler stödtyper: en rullande boll som DRIVER mot lutningen, ett stöd som långsamt
  glider i sidled.
- [Quick] En vindpust som puttar tornet lite (med tak: högst en per runda).

**Juice**
- [Quick] Damm och strån som yr när en kloss landar i höet.
- [Medium] Klossarna som mjuka kroppar (`lib/mjukkropp.js`) — bara den kloss som just landar.

**Progression**
- [Quick] Spara högsta torn i `progress.custom` och rita en liten "rekordlinje" på flaggstången.

**Karaktär**
- [Quick] Bobo får en tumme upp när bubblan står mitt i vattenpasset.

**Ljud**
- [Quick] Ett eget knak-läge per stödbredd (smalt stöd knakar ljusare).

## 5. Status / loggar

`2026-08-14 · byggt från spelkö-specen (spelko.md §3); fysikkonstanterna kalibrerade mot matter
utan webbläsare (jämvikt per klosstyp + åtta spelade placeringssekvenser) · <commit>`
