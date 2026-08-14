# Skattjakt i Mörkret (`skattjakt-i-morkret`)

> pussel · mixed · 2–5 år · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `skattjakt-i-morkret` |
| **titleSv** | Skattjakt i Mörkret |
| **icon** | 🔦 |
| **kategori** | `pussel` → flik **Pussel** |
| **input** | mixed (fritt drag av ficklampan + tap på fynden) |
| **ålder** | [2, 5] |
| **kärnloop** | Dra (eller tryck) ficklampan över ett mörkt, mysigt vindsrum. Ljuskäglan avslöjar det som ligger under. Tryck på en upplyst sak → den flyger i en båge till Bobos skattkista och bockas av på hyllan längst ner. |
| **mål** | Alla 3–5 saker på hyllan hittade → kistan slås upp, guldet sprutar och mörkret LYFTS som en gardin över hela rummet → `progress.complete()` |
| **agens** | Var barnet lyser. Gömställena slumpas per runda, ljuset styrs helt fritt, och vilken sak man tar först bestämmer melodins ordning. |
| **variation** | Nya saker ur en pool på 12, nya gömställen, ny bråt-layout (lådstapel, tunna, böcker, kvast, matta, tavla jittras), och i ~45 % av rundorna en sovande katt som ligger ovanpå en av sakerna. |
| **mottagare** | Bobo står vid kistan, följer ljuset med blicken, är `nyfiken` när något upptäcks och `jubel` för varje fynd. |
| **finish** | Locket slås upp och stannar öppet, guld ur kistan i två salvor, durtreklang C–E–G–C, och mörkret glider uppåt + tonar bort — rummet står plötsligt i varmt ljus. |

**Röstrepliker**
```
"Det är mörkt på vinden! Lys med ficklampan och hitta sakerna."
"Lys runt i rummet. Vad hittar du?"
"Där är något! Tryck på den."
"Lägg den i skattkistan!"
"En katt som sover! Titta vad den gömmer."
"Oj, lampan blinkar!"
"Kistan lyser upp hela rummet!"
"Lys i mörkret, sakerna gömmer sig."
"Titta, något glimmar där!"
```
Beröm vid fynd tas ur delade `PRAISE` (theme.js).

## 1. Nuläge (sett som spelare)

Skärmen är en varm vind i mörker: trävägg, takbjälke, golvplankor, ett runt fönster med
måne uppe till höger och en lykt-glöd kring skattkistan där Bobo står. Längst ner ligger en
hylla (UI) med små ritade ikoner på de saker som ska hittas — ingen text, ingen läsning.

Ficklampan är ett ritat föremål (grepp, ring, huvud, lins) som hålls nedanför käglan så att
varken lampan eller fingret ligger ovanpå det man tittar efter. Ett tryck var som helst
flyttar ljuset dit med en mjuk glidning; att dra fungerar likadant. Käglan avslöjar rummet
under sig, saker gnistrar till när de först nås av ljuset och blir tryckbara. Ett tryck
skickar dem i en båge till kistan med nästa ton i en pentatonisk stege.

Motgången är ett kort flimmer (~0,9 s) med två låga blip och en vinglande lampa. Katten
spinner när man lyser på den, sträcker på sig och går undan — och lämnar en sak bar.

## 2. Ursprunglig plan & tankeprocess

Idén kommer ur ägarens spelkö (`.claude/state/spelko.md` §2). Poängen är att göra
**upptäckande** till hela mekaniken: barnet får ett verktyg (ljus) som är roligt i sig,
och rummet svarar direkt. Ett mörkt rum är dessutom exakt den situation där ett litet barn
vill ha kontroll — därför äger barnet ljuset helt, det finns inget som jagar, ingen timer,
och rummet är varmt och mysigt i tonen (vinden är brun/orange, mörkret är en varm violett,
aldrig svart).

Checklistan på hyllan gör målet konkret utan ett enda ord, och kistan + Bobo ger fynden en
mottagare i stället för en poängräknare.

### Tekniskt: mörkret

Mörkret är en **SPRITE med en Canvas2D-bakad ljustextur** (256×256) plus **fyra
heltäckande rektanglar** som täcker resten av BLEED-ytan.

* Texturen bakas i tre steg: (1) hela duken full mörk, (2) hålet punsas med
  `destination-out` och en radiell toning (smoothstep i tio stopp, helt klar inom 0,40·R,
  full mörk vid 0,88·R), (3) en varm glöd ritas i hålet, klippt till cirkeln.
* **Ingen radiell `FillGradient` som hål** (Pixis kan inte ha genomskinlig mitt —
  CLAUDE.md), **ingen `generateTexture`** (byter rendermål och destabiliserar sviten).
  Canvas2D rör inte GL-tillståndet. Texturen bakas EN gång i `init` och rivs i `destroy`.
* Spriten skalas till 2·R och följer fingret varje bildruta; ramens fyra rektanglar ritas
  om i samma andetag och möter spritens kvadrat med 1 px överlapp.
* Finalen mörkerlyft: containern tweenas uppåt + alpha 0 (en gardin).

**Första versionen var ett rutnät** av ~180 rektanglar med alfa per ruta (32×30 px). Testet
var grönt, men skärmdumpen visade vad talen inte kunde: ljuskäglans kant gick i fyrkantiga
trappsteg och de upplysta sakerna fick en rutig slöja. Rutnätet ligger kvar som reservläge
(`_ritaRutnat`) om Canvas2D-texturen inte kan bakas.

**Tre mätningar som styrde formen** (alla ur skärmdumpens pixlar, ingen av dem synlig i tal):

| Fynd | Mätning | Åtgärd |
|---|---|---|
| Hårdkantad slöja över ljuset | `circle(R·0,86)` alfa 0,07 gav 111 → 150 i luminans på EN pixel | glöden flyttad in i ljustexturen |
| Andra ramen runt pölen | egen glöd-sprite mätte +11 över hela sin kvadrat (36,27,46 → 47,39,57) | glöden bor i samma duk, klippt till cirkeln |
| Mörkare ram runt pölen | ramens insteg på 8 % av R mörkade samma yta två gånger | insteget nere på 1 px (kvarvarande steg: 2/255) |

## 3. Vad gör det lättjefullt / tunt

Ärlig kritik av nuläget:

* **Bråten är EN `Graphics` med jittrade positioner** — den varierar, men möblerna är alltid
  samma sex saker på ungefär samma platser. Ett riktigt vindsrum hade haft utbytbara möbler.
* **Katten går bara i sidled.** Den har ingen egen väg och kan hamna ovanpå en annan sak
  (kosmetiskt).
* **Fynden har ingen egen personlighet** — alla saker flyger likadant till kistan. Jämför
  `vart-tog-det-vagen` där varje leksak gör sitt eget lilla nummer.
* **Rummet har ingen egen ljudbild.** Inget knarr i golvet, inget regn mot fönstret; all
  ljudsättning sitter på händelserna.
* **Bara ett rum.** Nivå 1–3 skiljer sig i antal saker och ljusradie, inte i miljö.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
* [Medium] Gömställen som *interagerar*: en låda vars lock går att lyfta med ljuset, en
  matta som rullas upp — så ljuset avslöjar i två steg.
* [Quick] Låt saken som ligger under katten få en extra fanfar när den avslöjas.

**Variation**
* [Medium] Två–tre rums-teman (vind · källare · vindsgarderob) med egen palett och egen
  bråt-uppsättning.
* [Quick] Fler sällsynta gäster vid sidan av katten (en fladdrande nattfjäril som leder
  ljuset, en mus som tittar upp).

**Juice**
* [Quick] Per-sak-reaktion vid fynd (klockan tickar, ballongen guppar, tåget tutar).
* [Medium] Dammkorn som virvlar i ljuskäglan (partiklar bundna till käglans mitt).

**Progression**
* [Quick] Nivå 3+: två saker gömda bakom samma möbel så käglan måste svepa.

**Karaktär**
* [Quick] Bobo håller en egen liten lykta som pulserar när barnet är nära en sak.

**Ljud**
* [Medium] En lugn vind-/regnbädd via `audio.loop` (kom ihåg `stopAllLoops`).

## 5. Status / loggar

`2026-08-14 · byggt från spelkö §2 (checklista på hylla, katt, flimmer med tak,
gardin-final) · <commit>`
`2026-08-14 · mörkret bytt från rutnät till Canvas2D-bakad ljustextur efter ägarens
skärmdumpsläsning (trappstegskant + rutig slöja); glöden infälld i samma duk · <commit>`
