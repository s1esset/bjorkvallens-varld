# Klä på Nallen (`kla-pa-nallen`)
> Barnet drar mössa, tröja och stövlar till rätt ställe på en glad nalle som blir varm, mysig och nöjd — påklädning är vardagsmagi som 3–5-åringar älskar att härma och bemästra.

## Metadata
| Fält | Värde |
|------|-------|
| id | `kla-pa-nallen` |
| titleSv | Klä på Nallen |
| icon | 🧸 |
| category | drag |
| input | drag |
| ageRange | [3, 5] |
| bundle | `kla-pa-nallen` |
| voiceIntro | "Hjälp nallen att klä på sig! Dra mössan på huvudet." |

## Mål & mekanik
Barnet ser en stor nalle i mitten och några klädesplagg liggande nedtill. Kärnloopen:
1. Ett eller flera plagg ligger som "drag-items" längst ner. Nallen har osynliga **snäppzoner** (drop-targets) vid huvud, kropp och fötter.
2. Barnet **drar** ett plagg till rätt kroppsdel (eller använder **tap-tap**: tryck plagget, tryck sedan kroppsdelen).
3. Rätt plats → plagget snäpper på plats, blir en del av nallen, `correct`-ljud + glad röst, kroppsdelen studsar (pop). Ett moln (✨ sparkle) pyser.
4. Fel plats → plagget vinglar mjukt och snäpper tillbaka till sin hemposition (`soft`-ljud). Aldrig bestraffning.
5. När **alla plagg** för rundan sitter på → nallen blir "klar": den hoppar till av glädje, säger en mysig fras, `celebrate`, konfetti via `ctx.fxLayer`, och `ctx.progress.complete()`.
6. Efter ~1,3 s startar en **ny runda** med (på högre nivåer) fler plagg → oändlig lek.

Inga poäng, ingen timer, inget fel-tillstånd. Tomt tryck på bakgrunden ger inget straff (ev. mjukt `tap`).

## Skärm-layout (1280x720)
GameHost ritar header (hem-/repetera-knapp). Rita INTE egna sådana. Allt nedan ligger i `this._root` (designkoordinater).

- **Nalle (container `_bear`)**: centrerad horisontellt, `x=640`. Byggd av Pixi Graphics:
  - Huvud: cirkel centrum `(640, 250)`, radie 90 (brun `0xb07a4a`), två öron (cirklar r=34) vid `(580,180)` och `(700,180)`, nos/ögon som små cirklar. Snäppzon "huvud" centrum `(640, 235)`.
  - Kropp/mage: rundad rektangel centrum `(640, 410)`, bredd 200, höjd 200, radie 60. Snäppzon "kropp" centrum `(640, 410)`.
  - Fötter: två cirklar/ovaler vid `(585, 560)` och `(695, 560)`, r≈46. Snäppzon "fötter" centrum `(640, 560)`.
- **Snäppzoner (osynliga targets)**: tomma `Container` placerade på centrumen ovan, `hitRadius: 150` (stor och förlåtande). De ritas inte; en valfri svag streckad ring kan visas som ledtråd (alpha 0.25) på den kroppsdel som väntar.
- **Plagghylla (drag-items)**: längs nederkanten, y≈660. Fördela jämnt: 2 plagg → x = 430, 850; 3 plagg → x = 320, 640, 960. Varje plagg ligger på en vit rund "bricka" (cirkel r=72, `0xffffff` alpha 0.9, stroke `0xeadfca`) med emoji-Text fontSize 92 ovanpå. Hemposition = startposition.
- **Marginaler**: minst 40 px från kanter; plagg-brickor ≥ 96 px diameter (de är 144 px) med generös hit-halo via DragControllerns träffyta.

## Interaktion
- Drag och tap-tap hanteras helt av **`DragController`** (`src/lib/DragController.js`). Skapa en instans i `init`: `this._drag = new DragController({ space: this._root, services: ctx.services })`.
- **Targets**: för varje kroppsdel `this._drag.addTarget(zoneView, (data) => data.slot === zoneKey, { hitRadius: 150 })`. `zoneKey` ∈ `'huvud' | 'kropp' | 'fotter'`.
- **Items**: för varje plagg `this._drag.addItem(view, { slot, emoji }, { onCorrect, onWrong })`.
  - `view.eventMode='static'` sätts av DragController. Brickans träffyta är hela cirkeln (≥96 px) — räcker för småbarn.
- **Drag**: greppa plagg → följer fingret (globalpointermove, överlever att fingret lämnar). Släpp inom 150 px från rätt zon = korrekt; annars snäpp tillbaka.
- **Tap-tap-fallback** (inbyggd): tryck plagg (det börjar pulsera/markeras, `tap`-ljud), tryck sedan kroppsdel → DragController kör samma resolve. Perfekt för 3-åringar som inte klarar drag.
- Förhindra dubbel-interaktion under "resolving": sätt `this._resolving=true` under firande mellan rundor och bygg inte nya items förrän klart.

## Återkoppling & belöning
Per handling, < 100 ms:
- **Plagg greppas/markeras**: DragController spelar `tap` + skalpuls automatiskt.
- **Rätt plats** (`onCorrect(rec, target)`):
  - `ctx.services.audio.sfx('correct')`
  - `ctx.services.voice.say(randomFrom(['Vad fin!', 'Mössan sitter!', 'Så mysigt!', 'Bra jobbat!']))` (anpassa frasen till plagget)
  - `pop(target.view)` på kroppsdelen + `sparkle(ctx.fxLayer, x, y)`
  - Plagget "fastnar": flytta in det i `_bear` (eller rita motsvarande plagg-Graphics på kroppsdelen), `eventMode='none'`.
- **Fel plats** (`onWrong(rec)`): `wiggle(rec.view)` (DragController har redan spelat `soft`). Plagget snäpper tillbaka. Ingen röst-tillrättavisning.
- **Tomt tryck/bakgrund**: valfritt mjukt `tap`, annars inget.
- **Runda klar** (alla plagg på):
  - `ctx.services.audio.sfx('celebrate')`
  - `ctx.services.voice.say(randomFrom(['Nallen är klar! Så fin nalle!', 'Nu är nallen varm och glad!']))`
  - nallen hoppar (gsap `_bear.y` liten studs), `bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })`
  - `ctx.progress.setLevel(this._level + 1)` sedan `ctx.progress.complete()` (delat firande + stjärna + klistermärke)
- **Idle ~6 s** utan handling: `ctx.services.voice.say('Dra ett plagg på nallen!')` och låt väntande zon pulsera lätt. Återställ idle-timern vid varje interaktion.

Använd endast dessa sfx: `tap`, `correct`, `soft`, `celebrate` (ev. `pling` vid sparkle).

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`.
- **Antal plagg per runda** växer mjukt:
  - Nivå 0–1: 2 plagg (t.ex. mössa + stövlar).
  - Nivå 2+: 3 plagg (mössa + tröja + stövlar).
  - Aldrig fler än 3 (3 snäppzoner). Variera vilka plagg/emoji som visas för omväxling.
- Varje fullbordad runda: `setLevel(this._level + 1)`, `complete()`, sedan `gsap.delayedCall(1.3, () => this._newRound(ctx))`.
- Oändlig lek: rundor fortsätter; svårigheten planar ut vid 3 plagg men plaggvarianten randomiseras (`randomFrom`/`shuffle` från `lib/swedish.js`).
- Spara ev. valfri data i `custom` (t.ex. `setCustom('rundor', n)`) — ej nödvändigt.

## Tillgångar (programmatiskt)
Inga externa filer. Emoji renderas som `Text`.
- **Plagg-emoji**: 🧢 (mössa, slot `huvud`), 👕 (tröja, slot `kropp`), 🥾 (stövlar, slot `fotter`). Alternativ för variation: 🎩/👒 (huvud), 🧥/👚 (kropp), 👟/🧦 (fötter).
- **Nallen**: byggd av Pixi `Graphics` — cirklar (huvud, öron, nos, fötter), rundad rektangel (mage), små cirklar (ögon `0x3a2a1a`), bruna toner (`0xb07a4a`, mörkare `0x8a5e34`). Glad mun = `g.arc(...)` eller liten rundad form.
- **Plagg-brickor**: `Graphics` cirkel vit (alpha 0.9) + stroke `0xeadfca`.
- **Snäppzon-ledtråd** (valfri): streckad/svag ring via `g.circle(...).stroke({width:4,color:0xffffff,alpha:0.25})`.
- **FX**: `sparkle`/`bigCelebration` från `lib/feedback.js` på `ctx.fxLayer`.
- Färger/typsnitt från `lib/theme.js` (`COLORS`, `FONT`).

## Återanvänd dessa
- `src/lib/DragController.js` — all drag + tap-tap + snäpp/snäpp-tillbaka. Uppfinn INTE eget drag.
- `src/lib/feedback.js` — `pop`, `wiggle`, `sparkle`, `bigCelebration`.
- `src/lib/theme.js` — `COLORS`, `FONT`, ev. `PLAYFUL`.
- `src/lib/swedish.js` — `randomFrom`, `shuffle`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say/replayLast`, `ctx.fxLayer`.
- `ctx.progress.get/setLevel/complete` — aldrig localStorage direkt.
- (Button behövs ej; GameHost äger header-knapparna.)

## Edge-cases & städning
- `this._alive = true` i `init`; sätt `false` först i `destroy`. Skydda ALLA async-callbacks (`gsap.delayedCall`, `onComplete`, idle-timer) med `if (!this._alive) return`.
- Undvik dubbeltryck/dubbel-resolve under firande: håll `this._resolving=true` mellan runda-klar och `_newRound`; bygg/aktivera nya items först efteråt.
- Spelaren kan avsluta mitt i animation → `destroy` måste:
  - `this._drag?.destroy()` (tar bort alla item/target-lyssnare)
  - `this._idle && clearTimeout(this._idle)` (eller `gsap` delayedCall-referens `.kill()`)
  - `gsap.killTweensOf(this._root)` samt killTweens på nallen/plagg
  - `this._root?.destroy({ children: true })`
- Idle-timer: rensa och starta om vid varje interaktion; rensa i `destroy`.
- Vid `_newRound`: rensa gamla item-vyer (destroy) och nollställ DragControllerns items om du återskapar dem (eller skapa ny `DragController` per runda och förstör den gamla — enklast: behåll targets, lägg till nya items; men säkrast är `this._drag.clear()` + bygg om targets + items).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/kla-pa-nallen/index.js`. Default-exportera GameModule-objektet med metadata enligt tabellen ovan.
2. I `init(ctx)`: sätt `this._alive=true`, skapa `this._root=new Container()`, `ctx.stage.addChild(this._root)`. Skapa `this._drag = new DragController({ space:this._root, services:ctx.services })`.
3. Bygg `this._bear` (Graphics: huvud, öron, ögon, nos, mun, mage, fötter) och addera till `_root`. Skapa tre osynliga snäppzon-containrar på `huvud`/`kropp`/`fotter`-centrumen.
4. Läs `this._level = Math.max(0, ctx.progress.get().highestLevel|0)`. Implementera `_newRound(ctx)`: bestäm plagg-set utifrån nivå, registrera targets (`addTarget` med `accepts: data.slot===zoneKey`, `hitRadius:150`), skapa plagg-brickor på hyllan och registrera dem (`addItem` med `onCorrect`/`onWrong`). Räkna kvarvarande plagg.
5. I `onCorrect`: spela `correct`, säg glad fras, `pop` + `sparkle`, "fäst" plagget på nallen, minska räknaren; när 0 kvar → firande + `setLevel` + `complete()` + `gsap.delayedCall(1.3, () => this._newRound(ctx))` (guarda med `_alive`). I `onWrong`: `wiggle`.
6. I `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`, starta idle-timer (var 6:e s om ingen interaktion → re-cue).
7. I `destroy(ctx)`: sätt `_alive=false`, rensa idle-timer, `this._drag?.destroy()`, `gsap.killTweensOf(...)`, `this._root?.destroy({children:true})`.
8. Registrera i `src/games/registry.js`: importera modulen och lägg till i `GAMES`-arrayen.
9. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repetera, drag + tap-tap, firande, och att progress (highestLevel) kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas i GameHost **utan konsolfel** (inga uncaught errors/warnings från Pixi/gsap).
- Canvas finns och nallen + minst två plagg-brickor syns (verifiera via spelets exponerade tillstånd eller pixel/snapshot; minst att inga fel kastas vid mount).
- **Drag korrekt**: simulera drag av ett plagg till rätt snäppzon → plagget fastnar, inget snäpp-tillbaka, `correct`-feedback triggas (verifierbar via mockad `audio.sfx`/`voice.say` spy om testharness tillåter).
- **Tap-tap-fallback**: tryck plagg, tryck rätt kroppsdel → samma korrekta resultat.
- **Fel placering**: släpp plagg på fel zon → plagget återvänder till hemposition (mjuk respons), inget `correct`-ljud, ingen "game over"/rött kryss, inget straff.
- **Runda klar**: när alla plagg sitter → `ctx.progress.complete()` anropas (spy), konfetti läggs i `fxLayer`, ny runda startar efter delay.
- **Progress sparas**: efter minst en klar runda ökar `highestLevel`; värdet kvarstår efter sidomladdning (localStorage `pwagames.save.v1`).
- **Städning**: navigera hem (exitToLibrary) mitt i en runda → inga kvarvarande tickers/tweens kastar fel, inga konsolfel efter destroy.
- **Endast tillåtna gester**: inga lyssnare för dubbeltryck/långtryck/pinch; endast pointerdown/move/up/tap används.