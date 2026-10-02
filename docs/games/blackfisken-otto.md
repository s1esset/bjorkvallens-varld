# Bläckfisken Otto (`blackfisken-otto`)

> ⚙️ fysik · drag · 3–5 år · ✅
> Status: ✅ byggt i nattkörningen (N1, 2026-10-02) — [Deep]-listan i §4 återstår som utbyggnad

Ursprung: idélistan (`docs/idelista-fysikspel.html` kort 3, `docs/IDEER.md` §6 post 3). Ägaren
sov; kortet godkändes av orkestreraren enligt beställningen *"gå på alla dina rekommenderade saker
vid varje vägskäl"* (2026-10-02 ~22:40).

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `blackfisken-otto` |
| **titleSv** | Bläckfisken Otto |
| **icon** | 🐙 |
| **band** | småbarn [3–5] → fliken Fysik |
| **kategori** | `fysik` → flik Fysik |
| **input** | drag (tap-tap-reserv) |
| **ålder** | [3, 5] |
| **kärnloop** | Barnet sätter fingret i vattnet → den arm vars SPETS ligger närmast fingret (inom ≥ 120 px) sträcker sig efter fingret. Sugkoppen fastnar i det FÖRSTA föremålet spetsen nuddar. Drar barnet vidare följer föremålet med armen; släpps det över en vän som vill ha just det tar vännen emot det. Släpps det någon annanstans rullar armen in och Otto håller saken hos sig (kan tas igen). Lätta saker följer armen; den TUNGA saken (skattkistan) drar i stället Otto långsamt dit. |
| **mål** | Tre havsvänner har fått hjälp → finish → `progress.complete()` |
| **agens** | Vilken arm, vilken sak barnet griper, vilken vän som får hjälp först. Fel sak till en vän = vännen skakar vänligt på huvudet, saken guppar tillbaka till Otto (roligt, aldrig fel). |
| **variation** | Havsbotten slumpas (tång, stenar, sjunket skepp, bildäcksrev — lägen och urval) · tre vänner ur en pool på fyra (`lib/variation.js` `pase`, aldrig samma trio två omgångar i rad) · föremålens lägen + 2–3 slumpade "lekgrejer" (sjöstjärna, flaska, snäcka) som går att greppa och leka med · Ottos färg följer humöret. |
| **mottagare** | Vännen som får hjälp jublar (hopp, bubblor, ljud); Otto blir rosa och glad. |
| **finish** | Alla tre vännerna simmar fram till Otto, skattkistan öppnas och pärlor och bubblor stiger upp i en ring runt Otto som snurrar nöjt (Ottos EGEN fest, inte generisk konfetti). |

**Vännerna (pool på fyra, tre per omgång)** — varje behov löses med samma grepp-och-dra:
- **Krabban** vill ha tillbaka sitt **skal** (snäckskalet ligger någonstans på botten) → dra skalet till krabban.
- **Fisken** sitter fast i en **burk** → greppa burken och dra den bort från fisken; när den lossnat simmar fisken fri och burken landar på botten.
- **Sjöhästen** har tappat **ungen** i tången → greppa den lilla sjöhästen och dra den till mamman.
- **Sköldpaddan** har tappat sin **boll** (som ligger högt på skeppsvraket) → dra bollen till sköldpaddan.

**Röstrepliker**
```
"Hjälp Otto att hjälpa sina vänner! Dra i en arm."   (intro, voiceIntro)
"Krabban vill ha sitt skal!"
"Fisken sitter fast i burken!"
"Sjöhästen har tappat sin unge!"
"Sköldpaddan har tappat sin boll!"
"Tack, Otto!"                                        (beröm vid delmål)
"Oj, vilken tung skattkista!"
"Dra i en arm, så sträcker sig Otto."                (om-cue ~6 s)
"Jag hjälper till!"                                  (sen hjälp)
"Alla vännerna är glada! Hurra för Otto!"            (finish)
```

**Beslut (orkestreraren, 2026-10-02):**
- **Träffytan** (kortets "mät först"): åtta tunna armar kan inte ha 96 px var. Hela vattnet är EN
  greppyta; armen väljs efter SPETSENS avstånd till fingret. Tap-tap: tryck på en sak → närmaste
  arm sträcker sig dit och greppar; tryck på en vän → armen bär saken dit.
- **Hjälp, sent och synligt:** står spelet still på samma vän ~12 s (efter om-cuen) lyser den sak
  vännen vill ha, och närmaste arm pekar dit — "Jag hjälper till!". Den greppar aldrig själv.
- **Motgång** (lugn): saken som släpps utanför en vän sjunker långsamt i flytvolymen och landar på
  botten — går alltid att greppa igen. Ingenting försvinner ur bild.
- **Skuret till [Deep]** (ryms inte i en byggares pass): tjuvkrabban, hajskuggan + bläckmolnet,
  båten som tappar saker, havsströmmar, grottan för skatten, mjukkroppshuvudet (huvudet får
  squash-och-stretch med `feedback.squash` i stället).

**Fysik:** `lib/rep.js` ×8 (≈12 punkter per arm, stegas med `lib/takt.js`) · föremålen är
matter-kroppar i en `Flytvolym` (`lib/flytkraft.js`, lugnt sjunkande) · greppet = spetsen driver
föremålet med `drivPunkt`-mönstret (aldrig ett `Constraint`). Mönster: `spindelnatet`,
`vattenvagen` (rep), `magnet-fiske`/`plask-i-vattnet` (flytvolym), `popcornkalaset` (drivPunkt).

## 1. Nuläge (sett som spelare)

Otto sitter på havsbotten med åtta armar som ligger hopkrupna. Barnet sätter fingret var som helst i
vattnet: den arm vars SPETS ligger närmast fingret sträcker sig dit (armen är teleskopisk — den blir
precis så lång som avståndet kräver). Sugkoppen fastnar i det FÖRSTA föremålet spetsen nuddar (efter ~80 px
rörelse, så en arm som ligger intill en sak inte griper den av sig själv). Lätta saker följer fingret till en
vän; släpps de utanför sjunker de lugnt och går alltid att ta igen. Skattkistan är tung: den står kvar och
Otto glider dit. När fingret dras bortom räckvidden (≈ 490 px) simmar Otto efter, så hela havet är nåbart.
Tap-tap: tryck på en sak → närmaste arm sträcker sig dit och griper (saken ringas in), tryck sedan på en vän →
armen bär dit. Tryck på en vän ger vingel + vännens önskan som replik.

Tre av fyra vänner per runda (aldrig samma trio två gånger i rad): krabban (skal), fisken (burk — dras ≥ 150 px
bort), sjöhästen (ungen i tången) och sköldpaddan (bollen på skeppsvraket). Fel sak till en vän → vännen
vinglar, saken guppar tillbaka mot Otto och sjunker. Rätt sak → vännen hoppar, bubblor, stämd ton (C-dur
pentatonisk, olika ackord per vän), Otto blir rosa. När alla tre är glada simmar de fram, kistan öppnas,
pärlor och bubblor snurrar i en ring runt Otto som snurrar nöjt; sedan ny runda med ny havsbotten.

Havsbotten slumpas: skeppsvrak (alltid när sköldpaddan är med), 3–5 tångruskor (en alltid där ungen ligger),
2–4 stenar, bildäcksrev (50 %), 2–3 lekgrejer ur sjöstjärna/flaska/snäcka (aldrig samma sort två gånger i en runda).
Hjälpen kommer sent och synligt: ~6 s stillhet → "Dra i en arm"-cue + en arm vinkar; ~14 s → saken vännen vill
ha lyser gult och närmaste arm pekar dit ("Jag hjälper till!"). Armen griper aldrig själv.

Filer: `index.js` (rundor, peknings- och greppslogik) · `konst.js` (all ritning) · `fysik.js` (`Arm`, rep) ·
`fest.js` (finishen) · `omgivning.js` (bubblor, hjälp, Ottos humör/blick). Sondkrok: `_armar[i].spets`,
`_saker[i]` {id,x,y,r,behov,klar,hallen,tung,lost}, `_vanner[i]` {typ,x,y,zon,klar}, `_otto`, `_g`, `_fas`, `_klara`.

## 2. Ursprunglig plan & tankeprocess

Ett mjukt, lugnt fysikspel för de minsta där handen blir en bläckfiskarm: barnet känner att armen
är ett rep som följer fingret och att sugkoppen faktiskt fastnar. Omsorg som mål — man hjälper
vänner, ingen tävlar.

## 3. Vad gör det lättjefullt / tunt

*(fylls i efter kritiken)*

## 4. Förbättringar & förhöjningar (plan)

**Byggt i N1:** armarna (rep ×8, teleskopiska), sugkopparna (kontaktgrepp + drivPunkt), flytvolymen, havsbotten som slumpas, vännerna ur poolen, hjälpen, finishen, tap-tap.

**[Deep]** tjuvkrabban som norpar en sak (kittla den så släpper den) · hajskuggan som skrämmer
Otto → bläckmoln som klarnar på 2 s · båten ovanför som tappar slumpade saker · havsströmmar som
kommer och går · skatten in i grottan som eget slutmål · huvudet som mjukkropp (`lib/mjukkropp.js`)
som trycks ihop när armarna drar.

## 5. Status / loggar

- 2026-10-02 · spec-kort + stomme (N1, orkestreraren) · —
- 2026-10-02 · bygge (N1, B1): hela kärnloopen — åtta teleskopiska rep-armar, kontaktgrepp (spetsen nuddar → sugkoppen fastnar), Flytvolym, fyra vänner/tre per runda, slumpad havsbotten, sen hjälp, Ottos egen fest. Huvudet fick squash-och-stretch i stället för mjukkropp (spec). Delat mönster som borde lyftas: den teleskopiska armen (`Rep.seg` följer avståndet) kan bli `Rep.teleskop()`.
- 2026-10-02 · fixvarv 1 (N1): kammusslan utesluts när krabban är med · fel sak → vännen upprepar sin önskan · burken lossnar vid 110 px och svävar annars tillbaka med squash/puff + fiskens vingel · festen 5,5 s · vilande armar krullar ihop spetsen och ritas under sakerna · ackord och gest per vän (krabban skuttar, sköldpaddan rullar, sjöhästen gungar).
