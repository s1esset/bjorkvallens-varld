# Mata Monstret (`mata-monstret`)
> Barnet drar godsaker och frukt in i ett glupskt, gulligt monsters öppna mun som tuggar och säger "mums" — pekglädje, omsorg och rolig ljudåterkoppling som 2–4-åringar älskar att upprepa om och om igen.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|----|---------|------|----------|-------|----------|--------|------------|
| mata-monstret | Mata Monstret | 🍬 | drag | drag | [2,4] | mata-monstret | "Mata monstret! Dra maten till munnen." |

## Mål & mekanik
- **Vad barnet gör:** Det ligger 3 matbitar (emoji på rund "tallrik") längst ner på skärmen. Barnet drar en matbit upp till monstrets öppna mun mitt på skärmen. När biten släpps i munzonen "äter" monstret den (mun stänger/tuggar, ögon blir glada, ljud "mums").
- **Kärnloop:** spawna 3 matbitar → barnet drar/tap-tapar in dem en i taget → varje lyckad matning ger tugg-animation + beröm → när alla 3 i en omgång är uppätna är **omgången klar**.
- **Lyckad handling:** Matbiten flyger in i munnen, krymper och försvinner med ett "munch"-tugg på monstret (käken öppnas/stängs, magen guppar). `audio.sfx('match')` + slumpad röstfras ("Mums!", "Nam nam!", "Så gott!").
- **Runda klar:** När den tredje biten är uppäten: monstret klappar magen/rapar lekfullt, `ctx.progress.complete()` (delat firande + klistermärke), sedan `gsap.delayedCall(1.4, ...)` → ny omgång med ny mat (oändlig lek).
- **Inga fel finns:** Det finns bara EN målzon (munnen) och ALL mat accepteras. "Fel" uppstår bara om barnet släpper utanför munnen → biten snäpper mjukt tillbaka till sin tallrik (DragController gör detta automatiskt, inget straff).

## Skärm-layout (1280x720)
Designkoordinater. GameHost ritar header (hem/högtalare) — rita INGA egna sådana.
- **Bakgrund:** mjuk heltäckande `Graphics`-rektangl (0,0,1280,720) i en lugn färg (t.ex. `COLORS.bg` eller 0xfdf3e3). Dekorlager `eventMode='none'`, `interactiveChildren=false`.
- **Monster:** container centrerad högt upp, `x=640, y=300`.
  - Kropp: stor rundad `roundRect` ca 360x340 (alltså -180..180 i x, -170..170 i y) i glad färg (0x7fc7ad), `radius=90`, vit stroke 8 alpha 0.5.
  - Två horn/öron: små cirklar/trianglar överst (valfritt).
  - Ögon: två vita cirklar r=46 vid (-80,-70) och (80,-70), pupiller mörka cirklar r=22.
  - **Mun:** egen `Graphics` (mörkröd 0x8b2f3a) ellips/rundad rektangl centrerad ca (0, 60), öppen storlek ca 200 bred x 120 hög. Tänder: små vita rundrect överst i munnen. Munnen är den synliga målzonen.
  - Mage: ljusare rundrect nedtill för "guppning".
- **Munzon (drag-target):** osynlig/munnens container vid monsterlokal (640, 360 i världskoordinater). `hitRadius=170` (stor och förlåtande).
- **Matbrickor (3 st):** längst ner, jämnt fördelade.
  - y = 600.
  - x-positioner: 320, 640, 960 (gap ~320, varje tallrik r=78 → träffyta >96px med hit-halo).
  - Varje matbit: container med vit "tallrik"-cirkel r=78 (alpha 0.85, stroke 0xeadfca 4) + emoji som `Text` fontSize 98, anchor 0.5.
- **Marginaler:** minst 120px topp för GameHost-header; matbrickor minst 24px isär (uppfyllt med 320 gap).

## Interaktion
- **DragController:** `new DragController({ space: this._root, services: ctx.services })`.
  - **Ett mål:** `this._drag.addTarget(this._monster.mouthHit, () => true, { hitRadius: 170 })` — accepterar allt (ingen kan göra fel).
  - **Items:** för varje matbit `this._drag.addItem(view, { emoji }, { onCorrect, onWrong })`.
- **Drag:** dra tallriken till munnen; släpp inom hitRadius → `onCorrect`. DragController lyfter/skalar item, snäpper in mot målet och snäpper mjukt tillbaka vid miss.
- **Tap-tap-fallback (inbyggt):** tryck på en matbit (utan att dra) → den markeras (pulserar, `audio.sfx('tap')`); tryck sedan på monstrets mun → samma `onCorrect` körs. Avgörande för de yngsta.
- **Hit-areor:** tallrik r=78 (+ DragControllers generösa beteende), munzon hitRadius=170. Allt över min 96px.
- **Inga förbjudna gester:** endast tap + enkel drag. Ingen dubbeltryck/långtryck/pinch.

## Återkoppling & belöning
- **Per-tryck (<100ms):** tryck/markera matbit → `audio.sfx('tap')` + liten skala-puls (DragController sköter pulsen). Lyft vid dragstart → skala 1.12.
- **Korrekt (mat i mun):**
  - `audio.sfx('match')` (alternativt `'pop'` när tuggen sätter igång).
  - Monster-tugg: gsap-timeline som krymper munnens höjd 2–3 gånger snabbt (käke), magen guppar (scale.y yoyo), ögonen kisar glatt kort.
  - Matbiten: gsap till munnens position, `scale → 0`, `alpha → 0`, sedan `destroy({children:true})`.
  - `voice.say(randomFrom(['Mums!','Nam nam!','Så gott!','Åh vad gott!']))`.
  - `feedback.puff(ctx.fxLayer, x, y, { count: 8 })` vid munnen för smul-effekt.
- **"Fel"/miss (släpp utanför munnen):** Det finns inget felmål. Släpp i tomma luften → DragController snäpper biten hem (back.out). Om barnet ändå råkar släppa nära men utanför → samma mjuka snäpp-tillbaka. `onWrong` (om DragController kallar det) → `wiggle(rec.view)` + `audio.sfx('soft')`. ALDRIG buzzer/rött/röst som tillrättavisar.
- **Runda klar:** efter 3:e biten → monster-jubel (hoppa/klappa mage), `voice.say('Mätt och belåten! Tack för maten!')`, `ctx.progress.complete()`. complete() ger delat firande (konfetti via fxLayer) + stjärna + klistermärke.
- **SFX-namn som används:** `'tap'`, `'match'`, `'pop'`, `'soft'`, `'celebrate'` (via complete), ev. `'whoosh'` när biten flyger in.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- Efter varje klar omgång: `ctx.progress.setLevel(this._level + 1)` (höjer highestLevel), `this._level++`, sedan ny omgång.
- **Svårighetsväxt (mjuk, aldrig pressande):**
  - Nivå 0–2: 3 matbitar per omgång, lugnt.
  - Nivå 3+: spawna 4 matbitar (x-positioner 240/480/720/960... eller lägg 4 jämnt: 256,512,768,1024) och slumpa lite mer varierade emoji.
  - Tempo ändras aldrig till barnets nackdel; ingen timer.
- **custom (valfritt):** `ctx.progress.setCustom('matningar', n)` för totalt antal matade bitar (kul statistik, ej synlig poäng).
- **Oändlig lek:** efter complete + 1.4s delay → `_newRound(ctx)` med ny slumpad mat. Aldrig något slut.

## Tillgångar (programmatiskt)
- **Emoji (matbitar, slumpas):** 🍬 🍎 🍌 🍓 🍪 🧁 🍇 🥕 🍒 🍩 🥦 🍐. Slumpa 3–4 unika per omgång med `randomFrom`/`shuffle`.
- **Monster:** byggs helt med Pixi `Graphics` (kropp `roundRect`, ögon/pupiller `circle`, mun `roundRect`/ellips, tänder små `roundRect`, mage `roundRect`). Ingen monster-emoji krävs (men 👹/👾 kan användas som ikon — använd Graphics för animerbar mun).
- **Tallrikar:** vit `circle` r=78 + stroke.
- **Effekter:** `feedback.puff`/`sparkle` på `ctx.fxLayer`. INGA externa bild-/ljudfiler.

## Återanvänd dessa
- `lib/DragController.js` — drag + snäpp + snäpp-tillbaka + tap-tap-fallback (en target = munnen, accepterar allt).
- `lib/feedback.js` — `puff`, `sparkle`, ev. `bounceIn`/`pop`/`wiggle`.
- `lib/swedish.js` — `randomFrom`, `shuffle`.
- `lib/theme.js` — `COLORS`, `FONT`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say(...)`.
- `ctx.progress.get/setLevel/complete/setCustom`.
- `ctx.fxLayer` för firande. `gsap` för animationer (`gsap.delayedCall`, timelines).

## Edge-cases & städning
- **`this._alive`:** sätt `true` i init, `false` i destroy. Vakta ALLA async-callbacks (`gsap.delayedCall`, `onComplete`, `onCorrect`, `_newRound`, `_spawnNext`) med `if (!this._alive) return`.
- **Dubbeltryck under "resolving":** DragController har redan `this.active`-lås och sätter `rec.placed=true` + `eventMode='none'` när en bit accepteras, så samma bit kan inte matas två gånger. Sätt en `this._resolving`-flagg under firandet (mellan sista biten och `complete`) så inga nya drag startar; nollställ i `_newRound`.
- **Exit mitt i animation:** barnet kan trycka hem-knappen när som helst → `destroy` måste tåla halvfärdiga tweens.
- **destroy():**
  ```js
  destroy() {
    this._alive = false
    this._drag?.destroy()
    gsap.killTweensOf(this._root)
    // kill per-objekt tweens på mun/mage/aktuella matbitar om de sparats
    this._root?.destroy({ children: true })
  }
  ```
- Töm/återskapa items per omgång; gamla item-views ska destroyas (de görs i `onCorrect` och vid `destroy({children:true})`).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/mata-monstret/index.js`. Default-exportera GameModule-objektet med metadata enligt tabellen.
2. `init(ctx)`: sätt `this._alive = true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`; rita bakgrund (dekor, `eventMode='none'`).
3. Bygg `_buildMonster(ctx)`: container på (640,300) med kropp/ögon/mun/tänder/mage via Graphics. Spara referenser till mun (`this._mouth`), mage (`this._belly`) och en munzon-vy för target. Lägg munzon-vy i `_root` på munnens världsposition.
4. `this._drag = new DragController({ space: this._root, services: ctx.services })`; `this._drag.addTarget(mouthHit, () => true, { hitRadius: 170 })`.
5. `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)`; anropa `_newRound(ctx)`.
6. `_newRound(ctx)`: guard `_alive`; nollställ `_resolving=false`; bestäm antal (3 eller 4 efter nivå); slumpa unika emoji; skapa matbit-tallrikar på x-positionerna, y=600; för varje: `_makeFood(data)`, `bounceIn`, och `this._drag.addItem(...)` med `onCorrect`/`onWrong`; håll räknare `this._left`.
7. `onCorrect(rec, target)`: guard `_alive`; `audio.sfx('match')`; tugg-animation på mun/mage; `voice.say(randomFrom([...]))`; `puff` vid munnen; försvinn-tween + destroy av rec.view; `this._left--`; om `_left===0` → `_finishRound(ctx)`.
8. `onWrong(rec)`: guard; `wiggle(rec.view)` (DragController spelar redan `'soft'`). (Sällan triggat eftersom målet accepterar allt.)
9. `_finishRound(ctx)`: `this._resolving=true`; monster-jubel; `voice.say('Mätt och belåten! Tack för maten!')`; `ctx.progress.setLevel(this._level+1)`; `this._level++`; `ctx.progress.complete()`; `gsap.delayedCall(1.4, () => this._alive && this._newRound(ctx))`.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`. Sätt ev. idle-recue: en `gsap.delayedCall(6, ...)` som upprepar voiceIntro om inget hänt (nollställ vid interaktion).
11. `destroy(ctx)`: enligt städ-sektionen.
12. Registrera i `src/games/registry.js`: lägg `import mataMonstret from './mata-monstret/index.js'` och in i `GAMES`-listan.
13. `npm run dev` → öppna biblioteket → spela: verifiera hem-knapp, röst-repris, matning, firande och att highestLevel kvarstår efter reload.

## Acceptanskriterier (Playwright-test)
- Spelet renderas i biblioteket och startar utan konsolfel (lyssna på `page.on('console')` / pageerror — noll errors).
- Vid mount syns monstret och 3 matbrickor; canvas finns och voiceIntro försöker spelas (ingen krasch om Web Speech saknas).
- En matbit kan dras (drag/drop) till munnen → biten försvinner, monstret tuggar, antal kvarvarande matbitar minskar.
- Tap-tap-fallback fungerar: klick på matbit + klick på munnen → samma matning sker (biten matas).
- Släpp utanför munnen → biten snäpper tillbaka till sin tallrik, inget felljud/straff, inga konsolfel.
- När alla bitar i omgången matats triggas firande (complete) och en ny omgång med matbitar dyker upp (oändlig lek).
- Progress sparas: efter en klar omgång och sidladdning är `highestLevel` i localStorage (`pwagames.save.v1`) ökat.
- Inga felsteg-element renderas (inget rött kryss/"game over"); inga nätanrop görs under körning.
- Efter `exitToLibrary`/hem-knapp städas spelet utan kvarvarande fel (destroy körs, inga tween-fel i konsolen).