# ÅTGÄRDER.md — rapporterade buggar som väntar på fix

Buggar som **ägaren har sett när hen spelat**, i väntan på `/fixa <id> <fel>` eller `/felsok <id>`.
Nyast överst. En rad per fel, inte per spel.

Status: ⬜ ej påbörjad · 🟨 pågår · ✅ fixad (rad flyttas till "Avklarat" med commit).

> Rutan **Första spår** är en *ledtråd från kodläsning*, inte en verifierad diagnos. `/fixa`
> ska alltid reproducera felet i harnessen först — ett plausibelt men falskt spår får inte
> generera en ändring. Se `.claude/commands/fixa.md`.

---

## Öppna

*Inga öppna ägarrapporter. Allt ägaren rapporterat hittills (#1–#16) är fixat och står under Avklarat.*

| # | Spel | Fel (som det rapporterades) | Första spår | Status |
|---|------|------------------------------|-------------|:--:|

## Verktygsfynd

Hittade av harnessen/bildkollen, **inte** rapporterade av ägaren — därför i egen tabell. Samma
regel gäller: reproducera innan du ändrar.

| # | Var | Fynd | Bevis | Status |
|---|-----|------|-------|:--:|
| V-R1 | `PhysicsWorld._diagSample` (R1:s vakter) i `npm run test:all` | **Baslinjen är NOLL: inget av 87 spel bär `statisk-fart` eller `snurr`** (v1.363.0, 2026-10-02). Tabellen spel · kod · kropp · äkta/falsk blev alltså tom — två loggar innehöll ordet `snurr` men som data (`loopdjuren`s dragföremål "snurr", `roliga-snurran`s id), inga fynd. Vakten samplar på riktigt: 289 `fysik/prov` i 27 fysikspel (`grodan-slurp` 21), så nollan är inte en död mätare. ⚠️ Gränsen är harnessens, inte vaktens: 6 s generiska tryck, `drag/ratt 0`, x ≤ 950 — `grodan-slurp`s `setPosition(…, true)`-hinder som STÅR STILL, Constraint-grepp och lång lek når testet aldrig. En nolla här betyder "ingen fälla på harnessens väg", inte "ingen fälla". Enda varningen i samma svit: `kla-efter-vadret` `snal-snappyta` ×1 (egen punkt). | `.test-logs/<id>.json` `fynd[].kod`, 87/87 gröna | 📋 baslinje |
| V14b | `scripts/test-game.mjs` (harnessen) | **Hypotesen i V14 är MÄTT FALSK, och harnessen bär nu sin egen diagnos.** V14 stod i tre svep på att `golvet-ar-lava` har svitens tyngsta montering (enda spelet med BÅDE `FluidWorld`/`FluidView` OCH full `createScene`) och att skärmdumpen därför hinner före första målade bildrutan. Ny sond **`scripts/_montageprobe.mjs`** mäter monteringskostnaden som **längsta gapet mellan två `requestAnimationFrame`** efter navigeringen (`nav.go()` är asynkron — en synkron mätning av anropet självt visar ~0 och säger ingenting). Utfall över alla 72 spel, CPU 4× strypt, median av 3 varv: **`golvet-ar-lava` 16,8 ms = svitens median (1,0×)**, alltså EN bildruta, precis som 69 andra spel. De enda som sticker ut är `pizzabageriet` **50,0 ms (3,0×)** och `hamburgerbygget` **33,4 ms (2,0×)** — och ingen av dem är spelet som faller. Dessutom: skärmdumpen tas efter tryck, drag OCH 900 ms, alltså flera sekunder efter monteringen — monteringskostnad kan omöjligt förklara den. **Vad som byggdes i stället för en fix på en död hypotes:** (1) omtagningen höjd från EN till **upp till tre**, (2) en **vakt för `webglcontextlost`/`webglcontextrestored`** som sätts före spelet monteras — en förlorad GL-kontext ger en helt tom duk utan ett enda konsolfel och är en av få mekanismer som kan tömma en duk som REDAN varit målad, (3) när en bild är tom samlas bevis i **samma ögonblick** (gl-kontext förlorad? gl-händelser? antal barn på stage och i världen? dukens storlek? `visibilityState`?) och (4) om omtagningen löser det rapporteras en **varning `tom-bild-omtagen`** med hela diagnosen i stället för tystnad. Vägen är självtestad, inte hoppad: `--tvinga-tom N` låtsas att de N första bilderna var tomma → `gl-kontext levande, stage 2 barn, varld 3 barn, duk 1280x720, sida visible`. Nästa träff kommer alltså med sin orsak. **✅ TRÄFFEN KOM 2026-08-11, och den bar sin orsak: `tom-bild-omtagen ×2 — gl-kontext FORLORAD (forlorad), stage 2 barn, varld 3 barn, duk 1280x720, sida visible` i `tvatta-djuret`.** Det är precis den mekanism vakten byggdes för, nu MÄTT i stället för gissad: scenen var byggd (stage och värld hade sina barn, duken hade rätt storlek, sidan var synlig) — det var **WebGL-kontexten som försvann**, vilket tömmer en redan målad duk utan ett enda konsolfel. Omtagningen räddade bilden, så svepet blev 72/72 och fyndet landade som en VARNING med diagnos i stället för ett rött `tom-scen`. Två följder: (1) hypotesen om monteringskostnad är därmed dubbelt begravd — det här händer långt efter monteringen, (2) fyndet hörde till `tvatta-djuret` den här gången och till `golvet-ar-lava` svepet före, alltså **vandrar det igen** precis som V12b:s signatur. Kvar att avgöra: varför tappas kontexten? Fyra parallella Chrome-instanser med WebGL på en maskin är den uppenbara misstänkta (GPU-processens minne), och i så fall är det en egenskap hos SVITEN, inte hos något spel. | `_montageprobe.mjs` (72 spel, `--cpu 4 --varv 3`): `golvet-ar-lava` 16,8 ms mot medianen 16,9 ms · topp: `pizzabageriet` 50,0 · `hamburgerbygget` 33,4 · `spindelhjalten` 17,3. `test:all` efter harnessändringen: **72/72 gröna, noll `tom-scen`, noll `tom-bild-omtagen`** (svepet träffade inte flaket — frekvensen är ~1 av 7). | 🟨 |
| V10b | `PhysicsWorld._make` (opt-in byggd) | **`{ isStatic: true, studs: 0.75 }` finns nu — den form V10 rekommenderade, byggd och mätt.** `_make` sätter restitution EFTER `Body.setStatic` (och uppdaterar `_original`, så en kropp som senare väcks behåller sin studs), loopar över `parts` som matter själv gör, klämmer till 0..1 och strippar nyckeln ur matters options så den inte hamnar i matters namnrymd (samma fälla som `mat` i B4). **Ingen global återställning** — 50 tal i 19 spel är fortfarande nollade, precis som förut, eftersom en global fix hade väckt 25 kombinationer på en gång i handtrimmade spel. `npm run check` skriver nu EN sammanfattningsrad över talen (`-- --studs` ger hela listan) i stället för att låta dem ligga tysta; det är migreringslistan. **Två gränsdragningar som listan själv tvingade fram:** `restitution: 0` räknas inte (det säger vad `setStatic` ändå gör), och raden säger *"medan kroppen är statisk"* — `kulbana:140` skapar spelets KULA statisk med 0,42 och får tillbaka talet ur `_original` när den väcks, alltså är listan en läslista, inte en fixlista. ✅ **FÖRSTA KUNDEN HAR LANDAT 2026-08-11: `flipperspel`s stolpar** (ägaren valde spelet i sitt speltest). Genomgången gav ett annat svar än frågan förutsatte och är värd att läsa innan nästa kund väljs: **sex av spelets åtta statiska tal kan aldrig väckas, av ett ANDRA oberoende skäl** — parets regel är `max(A,B)` och kulan bär **0,62**, så `wall` 0,3/0,4 · `sling` 0,5 · `spinner` 0,55 · `flipper` 0,3 hade förlorat mot kulan även utan `setStatic`. Kontrollmätning: ett statiskt 0,5 ger 59,4 px hopp både nollat och väckt, **0,0 px skillnad**. Kvar över kulan: `peg` 0,7 och dynorna 0,68–0,82 — och **dynorna har en egen impuls** (`_kickOff`), alltså exakt den dubblering V10b varnade för. Stolpen var spelets enda yta som både låg över kulan och saknade egen impuls. **MÄTT** (`_flipperprobe.mjs`, naken fysik med spelets geometri): hoppet **59,4 → 75,4 px (+27 %)**, parets studs **0,62 → 0,70**, listan **50 → 49**. ⬜ **Kvar:** dynorna ger **+26,8 px** om de väcks — ägarbeslut, kräver att någon spelar bordet. ✅ **ANDRA KUNDEN 2026-09-12: `bowling`s kantstöd** (blockcitatets ①): `studs: 0.75` + räckets egen friktion 0,1 återställd efter skapandet. `setStatic` sätter även friktionen till 1, paret tog klotets 0,5 och studsen åt upp farten LÄNGS räcket — pricklinjens största fel **214 → 79 px med bara studsen → 9 px med båda** (`_studsprobe.mjs` §7, kontrollskott 0,0 px). Samtidigt strukna: V10:s 15 döda tal i 7 spel — utom `natskott-pa-stan`s kruka (0,2), som listan hade fel om: den väcks via `rec.sill` → `setStatic(false)` och talet lever. `check --studs` **48 → 31**. ⚠️ **Lärdom som gäller varje framtida kund: den rörliga kroppens EGET studstal är ett golv.** Läs det först; ligger den statiska ytans tal under, är `studs` fel verktyg oavsett hur avsiktligt talet ser ut. | `node scripts/_studsprobe.mjs` **13/13 gröna** (6 nya mått): `studs: 0.9` ger 143,3 px hopp mot den simulerade fixens 143,3 (identiskt) och mot 4,7 px utan opten — **+139 px**. UTAN opten står kroppen på `restitution 0` och hoppar 4,7 px, alltså är de 50 talen orörda. `_original.restitution` bär 0,9 · `body.studs === undefined` · `studs: 2 → 1` · `studs: 0` är ett medvetet dött golv. `test:all` 72/72. | 🟨 |
| V10 | `PhysicsWorld._make` (18 spel, 44 tal) | **`restitution` på en STATISK kropp är en nullhandling.** `_make` skapar kroppen dynamisk och sätter den statisk efteråt (medvetet — NaN-fixen vid rad 213), och matters `Body.setStatic` **nollar då `restitution` och sätter `friction` till 1**, med originalen undanlagda i `body._original`. Varje `restitution` ett spel satt på en ramp, vägg, studsplatta eller hink har alltså aldrig gjort något. | **BLASTRADIEN ÄR NU MÄTT** (`node scripts/_studsprobe.mjs`, 6 mått, ingen webbläsare) och den är mycket mindre än raden ovan påstod. Tre fynd: **(1) parets regel är `max(A, B)`** — uppmätt 0,90 mot 0,30 → 0,90 (medel hade gett 0,60, produkt 0,27). Alltså är **varje statiskt tal som ligger PÅ ELLER UNDER den rörliga kroppens egen studs en ren no-op**: 35 av 60 mätta kombinationer rör sig **0,0 px**. **(2) De 25 som ändras gör det mycket:** en `heavy`-kropp (0,18) mot en 1,00-platta går från 5 → 176 px hopp; 0,50 → 44, 0,70 → 87, 0,92 → 150. **(3) VÄRLDSVÄGGARNA BERÖRS INTE** — `_buildWalls` skickar `{isStatic, restitution: 0.4}` rakt in i `Bodies.rectangle` och lägger kroppen med `Composite.add`, alltså aldrig genom `_make`; matter slutar där med `_original === null`, så 0,4 är **borta, inte undanlagt**. "Varje vägg i varje fysikspel blir studsig på en gång" var det tyngsta argumentet mot fixen, och det **kan inte hända**. | 🟨 |

> ### V10b — underlag för NÄSTA kund *(nattköns N13, skrivet 2026-08-12 — enbart kodläsning,
> ingen speländring)*
>
> Fyra kandidater lästes mot koden med `flipperspel`-lärdomen som filter: **den rörliga
> kroppens eget studstal är ett GOLV** (parets regel är `max(A,B)`), och **en yta som redan
> lägger på en egen impuls får inte också få `studs`** — det blev en dubblering på dynorna.
> Resultatet: två av de fyra faller på de två reglerna, och rangordningen blev en annan än
> den kön gissade.
>
> **① `bowling` — starkast, och det är inte studsen som är fyndet.** Klotet är
> `MATERIALS.heavy`, alltså golv **0,18** (`index.js:113`). Spelet har **ingen
> kollisionshanterare alls** — inget `_onCollision`, ingen egen impuls någonstans — så
> dubbleringsrisken är noll. Lanväggarnas 0,2 (`:432-433`) ligger i praktiken på golvet och
> är inte värt en ändring. Men **kantstöden deklarerar 0,75** (`:589-590`), och de är
> spelets TILLGÄNGLIGHETSHJÄLP: hela poängen med "Kantstöd PÅ" är att klotet ska studsa in
> mot käglorna i stället för i rännan. Effektivt studsar de på **0,18**. Och värre:
> `_previewBounds` matar `predictTrajectory` med **`restitution: 0.75` när kantstödet är
> på** (`:441`) — **den prickade banförhandsvisningen lovar alltså en studs som är drygt
> 4× den klotet faktiskt får**, i ett spel vars egen filhuvud påstår att pricklinjen
> matchar den verkliga studsbanan "till ~några px" (`:15-18`). Det är inte en känsla, det
> är ett sikte som ljuger, och bara för barn som behöver hjälpen. **Föreslaget värde:
> `studs: 0.75`** — inte valt för att det känns rätt, utan för att det är talet
> förhandsvisningen redan ritar; då blir sikte och verklighet samma sak utan att någon
> behöver trimma om banorna.
>
> **② `spindelhjalten` — äkta men litet.** Hjälten är `MATERIALS.bouncy`, golv **0,86**.
> `_onCollision` (`:895`) gör bara ljud, `_heroOof`, `puff` och `pop` — **ingen egen
> impuls**, alltså ren väg. Världsväggarna kommer från `PhysicsWorld({ walls: [...] })` och
> är oberörda av V10b (0,4, dessutom under golvet). Kvar: **studsknoppen/studsmolnen på 1,0**
> (`:328`) — spelets enda tal över golvet. Lyftet är alltså 0,86 → 1,00, mycket mindre än
> `flipperspel`s stolpe fick. ⚠️ Ett SEPARAT fynd på vägen, som inte är V10b: `BOUNDS`
> matar förhandsvisningen med **0,72** (`:30`) medan hjälten i verkligheten bär 0,86 mot
> golv och väggar — pricklinjen **under**lovar. (Att den inte känner studsknoppen alls är
> däremot avsiktligt och dokumenterat i koden, `:782-785`.)
>
> **③ `rulla-bollen-hem` — bara ETT smalt fall, resten stängt av de två reglerna.**
> Bollens studs skrivs om per bana (`_applyMaterials:651`): normal **0,55** · studsboll
> **0,82** · tung boll **0,40**. Dynorna (0,92, `:533`) **har en egen radiell impuls**
> — `boost = min(fart × 1,1 + 1,5, 26)` (`:986`) — alltså exakt `flipperspel`-dynans
> dubblering, och de ska lämnas. Klossarna (0,32) ligger under varje boll. Väggarna (0,55)
> ligger PÅ golvet för normalbollen och UNDER för studsbollen. Enda kombinationen som
> faktiskt skulle ändras är alltså **tunga bollen (0,40) mot väggen (0,55)**. Och just den
> är dessutom spelets enda pricklinje-lögn: `Math.max(ball.rest, WALL_REST)` (`:652`) —
> koden härmar matters parregel korrekt, men den räknar med ett väggtal som `setStatic` har
> nollat, så tunga bollen får en pricklinje ritad på 0,55 och en verklighet på 0,40.
>
> **④ `flipperspel` — klar** (stolpen, `43d71b4`). Enda öppna resten är dynornas +26,8 px,
> som står som ett ägarbeslut i raden ovan.
>
> **Vilken sond skulle vakta bytet?** `scripts/_studsprobe.mjs` finns redan och mäter naken
> fysik utan webbläsare — den är rätt verktyg för ①, eftersom `bowling`s kantstöd är två
> raka statiska rektanglar och klotets skottfart sätts med `Body.setVelocity`: en arm med
> kantstöd PÅ, skott mot vänsterkanten, och måttet är **klotets x-läge när det når
> käglornas y** mot vad `predictTrajectory` ritade med samma indata. Att sikte och utfall
> går ihop är hela fyndet, alltså är det också måttet. ⚠️ Kör den mot HEAD först — röd sond
> har varit sondens eget fel nio gånger i det här repot.
>
> **Ägarnära kvar:** vilket av ① och ② som ska byggas. ① är den enda av de fyra där en
> funktion barnet kan slå PÅ inte gör vad den utger sig för att göra.

> **Lärdomen från V12 → V12b är värd mer än fixen.** Fyndet såg i två svep ut att höra till
> `tvatta-djuret` — samma spel båda gångerna, vilket "talar emot slump". Det gjorde det
> också: mönstret var inte slumpmässigt, men det hörde till HARNESSEN, inte till spelet.
> Först när ett tredje svep la fyndet på två helt andra spel blev orsaken synlig. **Ett
> återkommande fynd på samma plats är inte bevis för att platsen är orsaken** — och
> hade jag "fixat" `tvatta-djuret` efter två svep hade jag ändrat ett friskt spel och ändå
> haft kvar felet.

> **Så A/B:ar man något som redan är committat** (gjordes för V11). `_ab.sh` bygger sina armar
> av *ostagade* ändringar, så lägg den GAMLA filen i arbetskopian —
> `git checkout HEAD~1 -- <fil>` — och kör svepet på samma fil. Armarna byter då etikett:
> raden **HEAD** är den nya koden och **ANDRING** är den gamla. Städa efteråt med
> `git checkout HEAD -- <fil>` och kontrollera att `git stash list` är tom.

> **V10: så bör fixen se ut, efter mätningen (`_studsprobe.mjs`).** En global "återställ
> `_original` i `_make`" är fortfarande fel form — inte för att den är farlig överallt, utan
> för att den ändrar **25 kombinationer på en gång** i spel som är handtrimmade mot dagens
> beteende. Men mätningen delar upp arbetet i två högar, och den ena är tom:
> · **Dött på riktigt** (statiskt tal ≤ den rörliga kroppens studs): `glasstornet` 0,05 ·
>   `knuffa-tornet` 0,05 · `plask-i-vattnet` 0,04 · `kulbana` 0,1–0,2 · `natskott-pa-stan`
>   0,18–0,2 · `magnet-fiske` 0,3 · `fanga-frukten` 0,35. De kan aldrig regressa — talen kan
>   lika gärna **strykas** som vilseledande, utan en enda mätning.
> · **Kandidater som faktiskt skulle vakna:** `spindelhjalten` 1,0 · `rulla-bollen-hem` 0,92 ·
>   `bowling` 0,75 · `flipperspel` 0,5–0,7 · `studsbollar` 0,55 · `bajs-och-kiss`,
>   `mata-monstret`, `spindelnatet`, `studsa-ner`, `vippbradan` 0,5 · `enhorningen-elvira` 0,6.
>   Flera av dem är uppenbart AVSIKTLIGA och har aldrig fungerat (en flipperkudde som inte
>   studsar, en bowlingbumper som inte studsar) — där är fixen en förbättring, inte en risk.
> **Rekommenderad form: opt-in per kropp**, t.ex. `{ isStatic: true, studs: 0.75 }` som `_make`
> återställer, i stället för att väcka alla 44 tal samtidigt. Då migreras ett spel i taget med
> en sond per spel, och de döda talen kan strykas direkt. **Kvar att göra av C1:** genomgången
> spel för spel av vilka tal som är avsiktliga — den kräver att man SPELAR spelen, och är
> därför en ägarnära uppgift snarare än en mätning.

> **V10 var medvetet inte fixad i samma svep som den hittades.** Att återställa `_original` efter
> `setStatic` vore två rader, men det ändrar fysiken i 23 spel samtidigt — varje ramp, vägg och
> hink som bär ett `restitution`-tal skulle plötsligt börja studsa, och flera av dem är
> handtrimmade mot dagens beteende (exakt `mat()`-fällan: skriv ut talen du vill BEHÅLLA).
> Fixen kräver A/B över hela sviten (`scripts/_ab.sh`) och en genomgång spel för spel av vilka
> tal som är avsiktliga. `kulbana` behövde ingen sådan fix: en fjäderbräda (`lib/fjader.js`) ger
> en riktig studs oberoende av matters restitution.

> ⚠️ **En sond ger ledtrådar, inte domar** — den läser text, inte beteende, och rapporterar den
> FÖRSTA vakten i en hanterare. Reproducera i harnessen innan du ändrar. Fixmönstret när fyndet
> är äkta: `kvittera(ctx.fxLayer, x, y, ctx.services.audio)` ur `lib/feedback.js`.

## Avklarat

Äldre avklarade poster (ägarrapporterna #1–#16 och de stängda verktygsfynden V1–V24) står i
[`docs/arkiv/ATGARDER-avklarat.md`](arkiv/ATGARDER-avklarat.md). Nya fixar läggs här under.
