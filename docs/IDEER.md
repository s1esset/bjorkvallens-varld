# IDEER.md — idébank (spel som inte är planerade än)

Parkerade spelidéer, **nyast överst**. En idé här är *inte* ett spec-kort — den är råmaterialet
som `/spel <idé>` får som indata när vi bestämmer oss för att bygga den. Varje post fångar
idén som ägaren beskrev den, plus de frågor en planerare måste svara på först.

När en idé byggs: flytta den till `docs/games/<id>.md` (§0 Spec) och stryk posten här.

---

## 1. Pappa får en KROPP — 15 idéer med fysik, mjuka kroppar och miljö

*Inlagd 2026-08-15. Status: ⬜ ej planerade — **idébank**, inga spec-kort. Framtagna i samma
session som nattpassets tre spel (post 2, numera byggda). Tillhör `ansiktssektionen` (post 4).*

### ▶ Tre mätta fakta som styr HELA listan — läs dem först

**⓵ Pappa kan aldrig få en fotograferad kropp.** Fotoshooten är 129 porträtt i 768×1024 —
huvud och hals, inget mer. Allt nedanför halsen måste **ritas** (P0 `ASSETS` kräver det ändå).
Alltså: fotohuvud på ritad kropp, ungefär som Herr Potatishuvud. För 2–5-åringar läser det
sannolikt som roligt snarare än kusligt — men **det är ett antagande om BILD**, och sådana har
fallit i det här repot förr (brynens tecken fick Bobo att se ut att läxa upp; ellipsen runt
ansiktet var fel åt båda hållen samtidigt). Det avgörs i en bild, se "Vad som ska göras först".

**⓶ Fotomaterialet är slut I REPOT.** Av 129 bilder ligger **75 i `assets-src/ansikte/pappa/`**
(64 från shoot 1 + 11 från shoot 2), och **72 av dem är redan tilldelade** de 19 rollerna i
`roller.json`. Fria bilder: **45, 94 och 112 — tre stycken.** Resten (~54 bilder ur shoot 1)
står kvar i ComfyUI:s output-katalog på ägarens maskin och har aldrig granskats.
➜ **Fler ansiktsuttryck är en ÄGARUPPGIFT först:** kopiera in resten, så görs kontaktkartor och
nya roller skärs med `npm run ansikte`. Disken är inget hinder — riggen ligger på **1 416 kB av
budgetens 3 072** (34 filer).

**⓷ Åtta motorer står oanvända eller nästan.** Listan nedan är medvetet fördelad över dem, så
att varje idé betalar tillbaka något som redan är byggt och mätt:
`mjukkropp.js` · `rep.js` (verlet) · `fjader.js` · `flytkraft.js` · `varme.js` · `magnet.js` ·
`luftmotstand.js` · `kamera.js` (en enda kund). Plus en möjlighet **ingen har prövat**: fotot som
`MeshPlane` — då kan själva ansiktet deformeras av en mjukkropp.

---

### A · Där den MJUKA KROPPEN är själva spelet

**1. `trasdocke-pappa` — Trasdockan** ⏱M · `rep.js`
Pappa som verlet-trasdocka (hals, armar, ben som rep) på en lekplats. Barnet drar honom i
handen, resten slänger efter. Ner för rutschkanan, upp i gungan, ner i bollhavet. `skratt` när
han svänger, `chock` i fritt fall, `nojd` vid landning. **Det här är kropps-unlocket självt** —
byggs den först ärver resten av listan en färdig kropp.

**2. `klampappa` — Klämpappa** ⏱L · `mjukkropp.js` + `MeshPlane` · **hög risk**
Han är en stressboll. Tryck → `Mjukkropp` plattar bålen **och ansiktet med** (fotot som mesh,
hörnen drivna av mjukkroppens punkter). Mål: klämma honom genom hål i olika former — rund,
fyrkantig, stjärna. En `passa-formerna` för mjuka kroppar. ⚠️ **Risken är fotomeshen:** riggen är
8 lager som måste deformeras samstämmigt. **Mät på ETT lager (`bas`) innan något byggs ovanpå.**

**3. `ballongpappa` — Ballongpappa** ⏱M · `mjukkropp.js` + matter
Barnet pumpar. Bålen sväller (mjukkroppens viloform `skala()`), kinderna puttar ut, `hetta`
stiger, `chock` när han blir enorm — och så **släpper han taget** och far runt i rummet som en
lös ballong, med ett pruttande läte, och dimper ner. **Smäller aldrig.** Mål: nå tre höga hyllor.

**4. `studs-pappa` — Studsa högt** ⏱S · `fjader.js` + `mjukkropp.js`
`Fjaderbrada` under honom, mjuk bål som trycks ihop vid varje landning. Varje tryck ger fart;
trycker man när han är nere blir det högre — upptäckbart, aldrig ett krav (ingen tajmingpress,
P0). Höjden är en **min-trappa**: `nojd` → `forvanad` → `gasp` → `chock` → `skratt`.

### B · Huvudet mot fysiken

**5. `stapla-pa-pappa` — Balansera på pappa** ⏱M · matter
Huvudet är **plattformen**. Barnet drar honom i sidled och staplar saker på hjässan; halsen är en
mjuk fjäder så tornet svajar med. Ansiktet räknar med: `fundersam` vid tre, `gasp` vid fem,
`chock` vid sju. Rasar det → `skratt`, allt studsar, ingenting förloras.

**6. `pappa-kanonen` — Kanonen** ⏱M · `launcher.js` (AimLauncher) + `mjukkropp.js`
Sikta med banförhandsvisning, skjut iväg pappa mot hö, madrass, vatten eller tårta —
**landningsmaterialet väljer minen**, och mjukkroppen plattar honom mot underlaget innan han
studsar tillbaka. Mål: landa i tre olika mål. Saknad roll: `skrik`.

**7. `paraply-pappa` — Håll pappa torr** ⏱S · matter + `traffar()`
Saker faller: regn, löv, äpplen, en sockerkaka. Barnet drar ett paraply över honom.
**`traffar()` avgör exakt var** det som smiter förbi landar — panna, öra, näsa — och varje zon
har sin min. En träff är aldrig ett misslyckande, bara en rolig grimas.

**8. `promenad-med-hunden` — Hunden drar** ⏱M · `rep.js` + `kamera.js`
Koppel som verlet-rep, hund i andra änden, rullande gata. Hunden ser en katt och **drar iväg
pappa** — barnet bromsar, styr, lockar med godis. Ren fysikkomik, och kameran får sin andra kund.

### C · Vätska, värme och väder

**9. `badpappa` — Badet** ⏱L · `vatska.js` (SPH) + `flytkraft.js`
Barnet fyller karet, han **flyter upp och guppar** på riktigt. Kranarna styr temperaturen: kallt
ger `kyla` + huttring + `chock`, hett ger `hetta` + **ånga ur öronen** (`oron()` har noll kunder
idag). Ankor, skum, bubblor. Mål: lagom varmt och alla ankor i vattnet.

**10. `bastu-pappa` — Bastun** ⏱M · `varme.js`
Barnet slår vatten på stenarna, ångan stiger, han blir röd, svettas, flämtar
(`liv({ takt: 1.1 })`), `gasp` — och sen **ut i snön**: `kyla`, `chock`, in igen. Mål: tre lagom
bastuvarv. Nya roller värda att skära: `svettig`, `frusen`.

**11. `vindtunneln` — Blåsvädret** ⏱S · `luftmotstand.js`
Barnet riktar en fläkt. Luggen står rakt upp, kinderna fladdrar, löv och papper far genom bild.
Mål: blåsa löven i högen utan att blåsa bort pappas hatt — och blåser man bort den ändå är det
själva skämtet.

**12. `pulkabacken` — Utför** ⏱M · `kamera.js`
Nedför en backe. Farten är en **min-trappa**, hoppen ger `chock` i luften och `skratt` vid
landning. Snön är mjuk. Mål: samla pepparkakor på vägen ner; inget fall som avslutar.

### D · Ansiktet som leksak

**13. `magnet-mustaschen` — Magnetskägget** ⏱S · `magnet.js` + `traffar()`
Woolly Willy. Magneten drar järnfilspån; **`traffar()` avgör vad som fastnar på ansiktet** och
vad som ramlar. Barnet bygger skägg, ögonbryn, kalufs. En kameraknapp sparar porträttet till en
vägg som ligger kvar mellan omgångar. Han reagerar löpande på var magneten är.

**14. `fotobasar` — Fotoautomaten** ⏱M · `rep.js` — **den som använder FLEST foton**
Ett kort visar en min ("gör en sur min!"). Barnet hjälper honom dit med verktyg: citronen →
`sur`, isen → `chock`, fjädern → `skratt`, chilin → `het`. Blixten smäller, kortet trillar ut och
**hängs på en tvättlina av verlet-rep** som går att dra i. Mål: fylla remsan med fyra olika
miner. Det här är spelet som motiverar hela den nya rollistan.

**15. `hangmattan` — Hängmattan** ⏱S · `rep.js`
Hängmatta mellan två träd. Han halvsover (`liv({ takt: 3.4 })`), barnet gungar honom, och saker
landar på honom — ett löv, ett äpple, en fågel på näsan. Låg intensitet, hög charm; den lugna
motsatsen till resten av listan.

---

### Nya ansiktsroller som listan vill ha (kräver ägaruppgiften, se ⓶)

Utöver de 19 som finns: **`skrik`** (kanonen, pulkan) · **`blas`/putade kinder** (fläkten,
ballongen) · **`svettig`** (bastun) · **`frusen`** (snön, badet) · **`blot`** (badet) ·
**`jubel`** (finaler) · **`vindogd`** (`flugan-pa-nasan`) · **`puss`** (belöning) ·
**`sover-djupt`** med öppen mun (`vakna-pappa`). Nio roller.

⚠️ **Kostnaden är app-bred, inte per spel:** `laddaAnsikte()` laddar ALLA miner i manifestet åt
varje spel som använder riggen. Nio nya roller ligger inom diskbudgeten (1 416 → uppskattningsvis
~1 800 kB av 3 072) men GPU-minnet är det som ska mätas innan de läggs in permanent — samma fråga
som varför variantminerna aldrig hålls laddade samtidigt (3 × riggen ≈ 40 MB).

### Vad som ska göras FÖRST — och det är inte ett spel

**`node scripts/_kroppbild.mjs`**: fotohuvudet på tre ritade kroppar i tre proportioner, i ett
rutnät. En kvart, och den svarar på frågan som annars sitter under alla femton idéerna —
*fungerar en fotograferad pappa på en ritad kropp, eller ser det kusligt ut?* Huvud-mot-kropp-
skalan är dessutom ren komik när den är fel, så bilden är värd att titta på oavsett.

Näst efter den: **`trasdocke-pappa` (1)**, för den bygger kroppen som tolv av de andra lånar.

### Ägaruppgifter som listan väntar på

1. **Kopiera in resten av fotoshooten** (~54 bilder ur shoot 1) till `assets-src/ansikte/pappa/`
   — annars går det inte att skära en enda ny min.
2. **Uttrycksljud** till de nya rollerna om de skärs: `skrik` · `puh` · `brr` · `hurra`.
   (De 17 som finns räcker för idéerna som inte kräver nya roller.)

---

## ~~2. Tre nya ansiktsspel — `titt-ut-pappa` · `vakna-pappa` · `flugan-pa-nasan`~~ ✅ BYGGDA

*Inlagd 2026-08-15. **Alla tre byggda i nattpasset 2026-08-16** (v1.225.0). Spec-korten bor
nu i respektive `docs/games/<id>.md` §0, där de hör hemma, tillsammans med det som faktiskt
mättes fram under bygget. Posten står kvar som en rad i stället för att raderas helt, för
att den bar en mätfråga vars SVAR är värt att komma ihåg:*

**Blickflimret var inte ett problem.** Spec-kortet varnade för att `blick()`s hysteres
(inställd på en långsamt dragen matbit) skulle få ögonlappen att flimra när målet är en
fluga, och pekade ut ett lågpassfilter som känd reserv. Uppmätt med `scripts/_blickprobe.mjs`:
**1,55 lappbyten/s mot gränsen 3**, med en kontrollarm (samma bana i 1/5 farten) på 0,55.
Filtret är därför medvetet INTE inkopplat — det hade fördröjt blicken, och att blicken följer
flugan är själva själen i spelet. Reserven (`Blickfilter` i `fluga.js`) står kvar som sondens
tredje arm, så talet går att mäta om den dag flugbanan görs ryckigare.

Ansiktssektionen är därmed uppe i **fyra** spel, och tröskeln i post 4 beslut 5 är passerad:
**om spelen ska lyftas till en egen flik är ett ägarbeslut, inte ett byggbeslut.**
## 3. Egna ansikten & röster från telefonen (arbets-id: `egna-ansikten`)

*Inlagd 2026-08-07. Status: ⬜ ej planerad. Utbruten ur `ansiktssektionen` (beslut 2026-08-07).*

**Idén, som den beskrevs:** kunna **fota ett ansikte och spela in röstljud direkt i telefonen**,
förbereda dem där, och lägga in **vilken karaktär som helst** (vilket ansikte + vilken röst
som helst) i ansiktssektionens spel.

### Frågor att svara på i planeringen (INTE nu)
1. **Lagring.** P0 DATA tillåter endast localStorage JSON (~5 MB). Foton skapade i körning
   kräver antingen hård komprimering eller en medveten P0-omförhandling (IndexedDB).
   Ingenting får lämna enheten.
2. **Friläggning på enheten.** Klippa bort bakgrunden utan nätanrop — telefonens "lyft motiv"
   ger PNG manuellt, men ett i-appen-flöde kräver egen lösning.
3. **Delning i lager på enheten.** Halvorna/ögonen måste klippas och riktas in — kräver ett
   enkelt inriktnings-UI bakom föräldragrinden.
4. **Grind.** Kamera + mikrofon hör hemma bakom tryck-och-håll-grinden (P0 GRIND).
5. **Beroende:** ansiktsriggen (`lib/ansikte.js`) och minst ett spel måste finnas först —
   funktionen är ett påbyggnadslager, inte grunden.

---

## 4. Ansiktssektionen — riktiga foton som spelfigur (arbets-id: `ansiktssektionen`)

*Inlagd 2026-08-06. Status: 🟢 **SEKTIONEN ÖPPNAD 2026-08-13 (v1.186.0)** — riggen byggd och
första spelet `mata-munnen` levererat (`docs/games/mata-munnen.md`). Posten står kvar för att
sektionen ska ha FLER spel (se tabellen längre ner). Omfattning: en hel ny sektion.*

### ▶ LÄGET 2026-08-13 — läs detta först, resten av posten är PLANEN

**`mata-munnen` ÄR BYGGT** (v1.186.0) och mätt med `node scripts/_munprobe.mjs`, som spelar
spelet på riktigt — testharnessen rör aldrig en matbit, så kärnloopen var grön och omätt.
Sonden hittade en återvändsgränd som ingen läsning av koden hade gett: busad mat lämnade
tallriken men räknades in i mättnadsmålet, så ett barn som busade en bit av sex kunde tömma
tallriken utan att finalen kunde komma. Tallriken fyller nu på sig själv. **Läs spelets doc
§3 innan nästa spel i sektionen byggs** — den bär vad riggen faktiskt klarar.

Kvar i sektionen: `harma-grimasen` · `borsta-tanderna` · `prat-ansiktet` (tabellen nedan), plus
**ägarens inspelningsuppgift**: pappas uttrycksljud. Kopplingen finns redan och tar klippen i
bruk automatiskt (`ROST`-tabellen + `audio.harSample()`).

**Fotoshooten är levererad:** 129 frilagda PNG, **768×1024** (inte 1024×1024 som det sades),
ren alfakant, i ComfyUI:s egen output-katalog (`s1face__NNNNN_.png`, nummer 1-129).
De 49 som används ligger i repot under `assets-src/ansikte/pappa/`.

**Tre ägarbeslut 2026-08-13:**
1. **Rigg först, sedan spelet** — riggen är det hela sektionen står på.
2. **Ögon-följningen är STRUKEN.** Blickserien (8 riktningar) finns inte i materialet;
   jag gick igenom ögonbandet i alla 129 och alla tittar mot kameran eller blundar.
   Ansiktet lever på blink, andning, käkens gap och minerna i stället.
3. **Egna uttrycksljud finns inte än** — spelet byggs utan dem, sample-namnen förbereds.

**Byggt (`e55db82` + `b477d0a`):** `scripts/ansikte.mjs` (`npm run ansikte`) klipper 15
inriktade lager på 586 kB av budgetens 3072, och `src/lib/ansikte.js` bär riggen:
`gap(0–1)` · `tugga(n)` · `blink()` · `min(namn)` (korsblekning) · `liv()`. Sond:
`node scripts/_ansiktebild.mjs` (14 lägen i ett rutnät + exit-koll).

⚠️ **Det materialet TVINGADE fram — kopiera inte planen nedan rakt av:**
- **Huvudet driver mellan bilderna** (hjässan y 159–319, höjd 705–865, flera lutar), så
  varje roll riktas in mot neutralbilden. Måttet måste läsa **pose** (silhuett-IoU), inte
  utseende: intensitet och gradient i ögonbandet blandar ihop fel läge med annan min, och
  5 av 11 bilder blev dubbelexponerade innan måttet byttes.
- **En roll = flera kandidater.** Fem foton gick inte att rätta alls (personen hade lutat
  sig fram — en 3D-rotation). `roller.json` listar kandidater; skriptet väljer på pose och
  ger aldrig samma foto åt två roller.
- **Käken translateras, den roterar inte.** En 2D-rotation svänger käken i sidled i frontvy.
  Taket är ~40 px; över det glider underkäkens kontur utanför basens.
- **Ett bas-lager måste ligga underst**, annars syns bakgrunden som ett ljust streck tvärs
  kinderna när käken sjunker.
- **Minerna klipps som ovala lappar** och nederkanten tonas ut — tröjan BYTS mitt i
  fotoserien (13–42, 49–57, 81, 121–122 bär ett tryck).
- `P0 KARAKTÄRER` har fått sitt undantag: `theme.js` bär `ROLLER = ['Pappa', 'Mamma']`.

**Idén, som den beskrevs:** En helt ny sektion i biblioteket där **riktiga foton av ägarens
ansikte** är spelfiguren. Ansiktet **grimaserar som svar på vad spelaren gör** — grimasen är
återkopplingen. Fotot är inte en stillbild: det **skärs upp i delar** så att det blir
interaktivt — **mun och käke** lyfts ut som egna bitar så ansiktet kan se ut att **prata**
och kunna **äta genom att gapa**.

**Första spelet i sektionen:** dra-och-släpp **mat i munnen**. Munnen gapar när maten närmar
sig, tuggar, och **ansiktet/grimasen ändras beroende på vad man matade det med** — citron ger
sur min, chili ger het min, tårta ger lycksalig min, broccoli ger en fundersam min.

### Ägarens detaljering (2026-08-07)

- **Riggen:** ett frilagt porträtt delas i **två halvor** — övre ansiktet (övre läppen och
  uppåt) och nedre ansiktet (nedre läppen + hakan). Prat/tugg = nedre halvan flyttas upp/ner
  i 2D; mun-inre som eget lager bakom. Flera foton med olika uttryck/grimaser gör personen
  levande (minbyte ovanpå riggen).
- **Ögonen följer** det man drar: ögon-lagret växlar mellan foton som tittar åt olika håll,
  i ~45°-steg hela varvet runt (8 riktningar).
- **Matning:** dra-och-släpp mat på munnen → gap, tugg, smask; grimas + uttryck beroende på
  maten. **Smulor** sprutar ur munnen när den tuggar.
- **Bus är en feature:** släpper man mat på resten av ansiktet (ögon, näsa, öron, hår) så
  **fastnar det** och det blir geggigt/kladdigt på ansiktet; ansiktet reagerar med olika miner.
- **Ljud:** ägaren spelar in många korta uttrycksljud i egen röst (blää, aj, oj, ohh) som hör
  ihop med vissa miner.
- **Önskad framtida feature:** kunna **fota ansikten och spela in röst direkt i telefonen** och
  lägga in vilken karaktär som helst. (Obs: P0 DATA = endast localStorage JSON — foton skapade
  i körning kräver ett medvetet lagringsbeslut; troligen en egen, senare idé.)

### Varför den är intressant
- **Ingenting i biblioteket ser ut så här.** 70 spel är ritad vektorgrafik. Ett riktigt ansikte
  som reagerar är en helt annan sorts belöning — och det är *pappas* ansikte, vilket för ett
  2–5-åring slår varje tecknad figur.
- **Grimasen ÄR återkopplingen.** P0 kräver ljud+bild <100 ms per pekning; ett ansikte som
  ändrar min är den mest avläsbara feedback som finns för en 2-åring — noll läsning, noll ikoner.
- **Motgång blir rolig av sig själv.** P0 `MOTGÅNG` vill hinder som är roliga och aldrig
  skambelagda: "fel" mat = en jättegrimas + ett spott-ljud, aldrig ett rött kryss. Sur min är
  en belöning i sig, inte ett misslyckande.
- **En uppskuren ansiktsrigg är återanvändbar** — samma käke/mun/ögon-rigg driver hela
  sektionen: mata, härma grimasen, tandborstning, prat-docka, ansiktet som sjunger med.

### Möjliga spel i sektionen (att välja bland senare)
| Arbets-id | Vad det är |
|---|---|
| `mata-munnen` | dra mat till munnen → gap, tugg, grimas efter smak — ✅ **BYGGT v1.186.0** |
| `titt-ut-pappa` | leta rätt på pappa bland gömställen — ✅ **BYGGT v1.225.0** |
| `vakna-pappa` | väck honom med ljud; sömnmätare + ett öga i taget — ✅ **BYGGT v1.225.0** |
| `flugan-pa-nasan` | han följer flugan med blicken; vifta ut den — ✅ **BYGGT v1.225.0** |
| `harma-grimasen` | ansiktet gör en min, barnet trycker på rätt min bland tre |
| `borsta-tanderna` | dra tandborsten i den gapande munnen, ansiktet reagerar på var man är |
| `prat-ansiktet` | tryck på ord/ikoner → käken rör sig i takt med röstklippet |

### Beslut (2026-08-07)
1. **Rigg:** frilagt porträtt i **två halvor** (delning vid överläppen) + mun-inre bakom;
   nedre halvan translateras upp/ner för gap/tugg/prat. **Endast neutralfotot klipps.**
   Grimaser är **helbildsfoton** som korsbleknar in efter svalt tugg (~120 ms), hålls ~1,5 s
   med tillhörande ljud, och bleknar tillbaka. Ögon-följningen (8 riktningar, eget ögonlager)
   sker bara i neutralläget medan man drar.
2. **Namn:** karaktären heter **"Pappa"** — en roll, inte ett namn. `lib/theme.js`-regeln får
   tillägget "roller (Pappa/Mamma) är tillåtna för fotokaraktärer" i samma commit som sektionen.
3. **Ansikten:** bara ägarens nu; riggen byggs så fler ansikten kan läggas till senare med
   samma fotolista. Telefon-funktionen är utbruten till egen idé (`egna-ansikten`, post 3).
4. **Mål i `mata-munnen`:** **mättnadsmätare** — tallrik med 4–6 matbitar per runda, full mage
   → rap-final → ny tallrik. Bus fyller inte mätaren men geggan sitter kvar till finalen.
5. **Flik:** spelen ligger i **Roligt** tills sektionen har 2–3 spel; då lyfts en egen flik.
6. **Fallback/integritet:** fotona checkas in som vanliga assets (repot är lokalt, ingen PII
   lämnar enheten); ingen ritad fallback byggs.
7. **Bildbudget:** webp, maxhöjd ~800 px per lager, hela sektionen ≤3 MB.
8. **P0 `ASSETS`** gäller som noterat: friskuren silhuett med eget liv (andning, blink),
   aldrig ett rektangulärt foto i en ram. Maten ritas som vanligt (`artikoner.js`).

### Fotoshoot-lista (ägarens produktionsuppgift — allt i EN session)
Stativ, samma ljus/avstånd/vinkel, huvudet stilla (sätt ett märke att titta på), enfärgad
bakgrund. Frilägg helst med telefonens "lyft motiv" (sker lokalt på enheten) → PNG; annars
levereras råbilder så klipper vi här.

| # | Fil | Vad |
|---|---|---|
| 1 | `neutral` | mun stängd, ögon mot kameran (klipps i halvor — basriggen) |
| 2 | `gap` | munnen vidöppen, säg "aaah" (härifrån klipps mun-inre: tänder/tunga) |
| 3–10 | `ogon-<riktning>` | endast ögonen flyttas: upp · upp-hoger · hoger · ner-hoger · ner · ner-vanster · vanster · upp-vanster |
| 11 | `ogon-stangda` | för blink i vila |
| 12 | `sur` | citron |
| 13 | `acklad` | blää |
| 14 | `het` | chili — flämtande |
| 15 | `lycksalig` | tårta/glass |
| 16 | `fundersam` | broccoli |
| 17 | `forvanad` | oj! (bus-släpp) |
| 18 | `aj` | något studsade på näsan (bus) |
| 19 | `nojd-matt` | stor belåten min (rund-finalen) |
| 20 | `skratt` | valfri bonus — bus i hår/öron |

**Ljudinspelningar (egen röst, telefonen räcker, tyst rum, ett uttryck per fil):**
`blaa` · `aj` · `oj` · `ohh` · `mmm` · `nam-nam` · `rap` · `fniss` · `aaah`.
Tugg/smask kan tas ur sfx-pipelinen om egna inte blir bra.

**Leverans:** lägg allt i `assets-src/ansikte/pappa/` (utanför `public/`) — ett skript under
`scripts/` klipper, komprimerar till webp och genererar lager + manifest med ankarpunkter.

### Kvarvarande öppna punkter
- Exakt matlista + mat→min-mappning (avgörs i spec/bygge mot `artikoner.js`).
- Klippskriptets form: helautomatiskt eller skript + handsatta koordinater i en JSON.

### Spec-kort `mata-munnen` (framlagt 2026-08-07 — ✅ **JA från ägaren 2026-08-13**)
⚠️ **Ögon-följningen i kärnloopen nedan är struken** (se LÄGET överst) — allt annat står.
`mata-munnen` · **Mata Pappa** · 😋 · Roligt · drag (tap-tap-fallback) · 2–5 · ingen
fysikmotor (DragController + GSAP). **Kärnloop:** tallrik med 4–6 matbitar → dra (ögonen
följer i 8 riktningar, munnen gapar när maten närmar sig) → släpp på munnen → tugg + smask +
smulor → helbilds-grimas per mat + ägarens inspelade ljud (~1,5 s) → mättnadsmätaren fyller.
Bus: släpp på ögon/näsa/öron/hår → fastnar + gegga (tak 6 samtidigt, äldsta ploppar av),
fyller inte mätaren. **Variation:** matpool ~14, 4–6 slumpas per tallrik; sällsynt wow
(~1 på 8): jättegrimas/dubbelrap. **Finish:** rap-finalen — nöjd-mätt-minen, inspelat rap,
fniss, smul-konfetti, geggan kvar. Klistermärke. **Repliker (7 literaler):** "Mata pappa med
maten på tallriken!" · "Mmm, det där var gott!" · "Oj! Vad surt det var!" · "Titta, pappa
tuggar och tuggar!" · "Hihi, nu blev det kladdigt!" · "Vad tror du händer om pappa smakar
chilin?" · "Nu är pappa mätt och belåten!" — pappas egna uttrycksljud är **samples**
(`audio.sample()`), inte narrator-repliker.

### Tekniska hållpunkter
- **Ansiktsriggen blir en delad modul** (`lib/ansikte.js`-aktig), inte kod i ett spel — lager:
  övre halva · nedre halva (translateras vertikalt för gap/tugg/prat) · mun-inre bakom ·
  ögonlager (8 riktningar + stängda) · helbilds-grimaslager för korsblekning · dekal-lager
  för gegga/fastnad mat. Pixi v8: vanliga `Sprite`-lager räcker; ingen mesh-deformation behövs.
- **Uppskärningen görs offline**, inte i körning: ett skript under `scripts/` som klipper ut
  delarna ur källfotona till färdiga PNG/webp-lager — samma mönster som `npm run voice`/`sfx`.
- **Käken kan drivas av rösten.** `VoiceService` spelar redan mp3-klipp; enklast är
  tidsbaserat käkflaxande medan ett klipp spelas, dyrare är amplitud från `AudioService`.
  Se skill **ljud-och-rost**.
- **Grimasbyte** = korsblekning över ~120 ms + en liten skalpuff, aldrig ett hårt klipp.
  `feedback.js`-hjälparna och `_alive`-flaggan gäller som vanligt (P0 `EXIT-SÄKERT`).
- **Maten** dras med `DragController` (samma som övriga dra-spel) med mun-området som mottagare
  — träffytan runt munnen måste vara ≥96px även om munnen på fotot är mindre.

---

## ~~5. Nätskott från bilfönstret (arbets-id: `natskott-pa-stan`)~~ ✅ BYGGD

*Inlagd 2026-08-06. **Byggd 2026-08-08 och polerad samma kväll** — se
`docs/games/natskott-pa-stan.md`. Posten stod kvar som "väntar på spec-ja" i två dagar
efter att spelet fanns i registret; filens egen regel är att stryka den vid bygge.*

**Idén, som den beskrevs:** Förstapersonsvy där man ser **sin egen arm och hand** nere i bild,
i webb-skjutar-posen (pek- och lillfinger ut, mellanfingrarna in mot handflatan), med
hjältedräkt på underarmen. Man **trycker var som helst på skärmen → ett nät skjuts dit**.
Scenen är en **sidscrollande gatuvy sett från ett bilfönster** — bakgrunden glider från höger
till vänster och skiftar mellan stad och förort medan man åker. Längs vägen passerar saker
man kan skjuta nät på och **påverka med fysik**: gummor som går på trottoaren, katter, hundar,
blomkrukor i fönsterbleck, brevlådor, fåglar, paket, fönster som går sönder, m.m.

**Två nättyper** (kärnvalet i spelet):
- **Klibbnät** — det man träffar fastnar i bakgrunden/väggen där det är.
- **Dragnät** — det man träffar dras tillbaka mot spelaren.

### Varför den är intressant
- Ett **helt nytt kameraperspektiv** i biblioteket — alla 70 spel är sidovy eller ovanifrån.
  Förstaperson + åkande bakgrund ger en resa-känsla ingen annan titel har.
- **Ett enda gest-verb** (tap där du vill) men **två utfall** via lägesknappen → äkta agens
  utan mer motorik. Passar 2–5 år rakt av.
- Bakgrunden som rullar ger gratis **variation och progression** (stad → förort → …) utan att
  vi behöver nivåer med fail-tillstånd.

### Avgränsa mot de tre spindelspel som redan finns
| Finns redan | Vad det är | Hur den nya skiljer sig |
|---|---|---|
| `spindelhjalten` | slangbella, drar hjälten själv genom luften | här skjuter man nät, hjälten rör sig inte |
| `spindel-zacke-svingar` | pendel, timing-släpp mellan hustak | här ingen svingning, ingen timing-press |
| `spindelnatet` | står still, fångar fallande föremål i ett nät | här rullar världen förbi och nätet påverkar *världen* |

### Beslut (2026-08-07)
1. **Varumärke:** armen/dräkten är **Spindel-Zackes** — röd/blå med svarta nät-linjer, egna
   designen (INTE Marvels). Samma hjälte som i `spindel-zacke-svingar`.
2. **Fönster krossas på riktigt** (ägarens val). Tonram som håller P0: tecknat glitter-splitter
   + glatt "hoppsan"-ljud, rutan **självlagas med ett skimmer efter ~5 s** (världen förblir
   aldrig trasig = tak), och ibland tittar ett **litet monster ut ur den trasiga rutan och
   vinkar** — mottagar-ögonblick, aldrig tillsägelse.
3. **Inga människor** — målen är djur, monster och föremål (katter, hundar, fåglar, paket,
   blomkrukor, ballonger). KARAKTÄRER-frågan bortfaller helt.
4. **Mål: uppdragsrundor** som roterar och använder båda näten — "fånga katten som rymt"
   (dragnät) · "fäst paketen innan de blåser iväg" (klibbnät) · "hämta hem 3 ballonger".
   Fri lek mellan uppdragen; alltid utan fail.
5. **Nätval: stor växelknapp** (≥96px) med egna ritade ikoner. Båda näten gör alltid NÅGOT
   roligt på varje mål — inget felval, bara olika utfall.
6. **Bilen: antydd ram** — smal dörrkant/fönsterkarm nertill där armen vilar, inte full ram
   (skärmytan i 1280×720 ska gå till gatan).
7. **Mottagare:** hemdragna djur/saker landar i **baksätet** och jublar där; rund-finalen är
   **hemkomsten** — bilen stannar, alla hoppar ur och firar.
8. **Fysik:** matter.js (`PhysicsWorld`); kroppar följer scrollen och städas utanför bild.
   Klibbnät = kroppen blir statisk i bakgrundslagret (scrollar med). Dragnät = constraint mot
   kameran; kroppen plockas ur fysiken nära bilen och landar i baksätet.

### Spec-kort `natskott-pa-stan` (framlagt 2026-08-07 — väntar på ägarens ja)
`natskott-pa-stan` · **Nätskott på stan** · 🚙 (byggaren verifierar unikhet i registryt) ·
Fysik · tap + stor växelknapp (inga drag alls) · 2–5 · matter.js. **Kärnloop:** bilen rullar
(parallax hus · trottoar · vägkant, stad→förort), Spindel-Zacke-armen nere i bild med
vilo-guppning; tryck var som helst → nät dit med whoosh + rekyl <100 ms; klibbnät fäster
saker där de är, dragnät drar hem dem till baksätet som jublar. Uppdragsrundor roterar
("fånga katten" · "fäst paketen" · "hämta 3 ballonger"); fri lek emellan, aldrig fail.
Fönster krossas i glitter-splitter, självlagas ~5 s, ibland vinkar ett monster ur hålet.
**Motgång:** vindby (max 2 lösa samtidigt) + skata som knycker paket (1 åt gången, går att
näta). **Variation:** kuliss + målpool roterar; sällsynt wow (~1 på 8): guldpaket som regnar
stjärnor. **Finish:** hemkomsten — bilen stannar vid huset, alla insamlade hoppar ur och
firar. Klistermärke. **Repliker (7 literaler):** "Tryck där du vill skjuta nätet!" · "Byt nät
med den stora knappen!" · "Fånga katten med dragnätet!" · "Fäst paketen så de inte blåser
iväg!" · "Hoppsan! Där rök en ruta!" · "Titta, baksätet blir fullt med vänner!" · "Nu är vi
hemma — vilket äventyr!"

### Tekniska hållpunkter
- matter.js (`PhysicsWorld`) för de påverkade föremålen; bakgrunden som parallax-lager
  (TilingSprite eller egna ritade lager) i tre djup: hus · trottoar · vägkant.
- Nätet självt: en dragen linje som skjuts ut från handen till träffpunkten, med `whoosh` +
  träffljud <100 ms. Klibbnät = kroppen blir statisk där den är. Dragnät = constraint som
  drar kroppen mot kameran och plockar bort den ur fysiken när den kommer nära.
- Armen/handen är ett **fristående ritat objekt** (P0 `ASSETS`), aldrig en emoji — med
  vilo-rörelse och rekyl vid skott.
