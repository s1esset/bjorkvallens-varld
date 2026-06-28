# Enkelt Pussel (`enkelt-pussel`)
> Barnet drar 2–4 stora pusselbitar på plats så att en glad bild blir hel och vaknar till liv — den taktila "klick, det passar!"-känslan som 3–5-åringar älskar, helt utan läskrav eller felsteg.

## Metadata
| Fält | Värde |
|---|---|
| id | `enkelt-pussel` |
| titleSv | Enkelt Pussel |
| icon | 🧩 |
| category | `pussel` |
| input | `drag` |
| ageRange | `[3, 5]` |
| bundle | `enkelt-pussel` |
| voiceIntro | `Lägg pusselbitarna på rätt plats!` |

## Mål & mekanik
- En enkel, glad bild (t.ex. en sol-och-blomma-trädgård) ligger uppdelad i **2–4 stora pusselbitar**. Bitarna är utspridda till höger; en pusselram med ljusa "spök"-konturer finns till vänster.
- **Kärnloop:** barnet drar (eller tap-tap:ar) en bit mot sin plats i ramen. När biten är nära rätt plats **snäpper den magnetiskt** in med ett mjukt "klick" (`match`), en liten gnistra och en studs. Fel plats = mjuk vingel + snäpp tillbaka (aldrig bestraffning).
- **Klart:** när alla bitar i rundan ligger på plats blir bilden hel, **spök-konturerna släcks**, hela bilden "vaknar till liv" (solen snurrar, blomman växer, figuren blinkar) och `ctx.progress.complete()` körs (delat firande + klistermärke).
- Efter firandet startar en **ny runda** automatiskt med nytt motiv och fler bitar (oändlig lek).

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knapparna i headern — rita **inga** egna sådana.

- **Pusselram (board):** rektangel `x=120, y=110, bredd=500, höjd=500` → mittpunkt `(370, 360)`. Rita en varm ramplatta (rundad rekt, `roundRect(120,110,500,500,28)`, fyll `COLORS.cream`, stroke 6px `COLORS.brown` alpha 0.35).
- **Förhandsvisning (guide):** rita hela scenen en gång inuti ramen med **alpha 0.12** som ledtråd om var bilden hamnar (`eventMode='none'`).
- **Spök-slots:** för varje bit, rita bitens kontur (samma form som biten) centrerad på sin slot-mittpunkt, fylld `COLORS.brown` alpha 0.10, stroke 4px streckad-look (heldragen räcker) alpha 0.25. `eventMode='none'`.
- **Bit-canvas-rutnät** (inom ramens 500×500, board-lokala koordinater, origin = ramens övre vänstra hörn `(120,110)`):
  - `n=2` → 2 kolumner × 1 rad, varje slot `250×500`. Slot-center (board-lokalt): `(125,250)`, `(375,250)`.
  - `n=3` → 3 kolumner × 1 rad, varje slot `~166×500`. Center: `(83,250)`, `(250,250)`, `(417,250)`.
  - `n=4` → 2×2, varje slot `250×250`. Center: `(125,125)`, `(375,125)`, `(125,375)`, `(375,375)`.
  - Världskoordinat för en slot = `(120 + lokalX, 110 + lokalY)`.
- **Spridningsyta (tray):** höger sida, `x 720..1180, y 130..600`. Lägg ut bitarna på slumpade, icke-överlappande punkter (t.ex. ett 2×2-rutnät av ankare `(820,250),(1080,250),(820,520),(1080,520)` + liten jitter ±30px). Alla träffytor ≥96px (bitar är 166–250px breda → uppfyllt).

## Interaktion
- **Drag (primärt):** använd `lib/DragController.js`. En `DragController({ space: this._root, services: ctx.services })`.
  - För varje slot: `drag.addTarget(slotView, (data) => data.slot === slotIndex, { hitRadius })` där `hitRadius = max(slotBredd, slotHöjd)/2 + 70` (generös magnet, ~195–250px). `slotView` är en osynlig liten Container placerad exakt på slottens världs-center (den används bara för position + tap-mål).
  - För varje bit: `drag.addItem(pieceView, { slot: i }, { onCorrect, onWrong, onSelect })`. Bitens origin (0,0) ligger i bitens mitt → snäpper rent till `slotView.x/y`.
- **Tap-tap-fallback (inbyggt i DragController):** tryck på en bit (utan att dra) → den markeras och pulsar (`onSelect` + `tap`-ljud). Tryck sedan på rätt ram-slot → biten flyger dit. Detta gör spelet hanterbart för de yngsta som inte klarar exakt drag.
- **Hit-area:** varje bit har sin form som naturlig träffyta; lägg ev. en osynlig `hitArea` (rundad rekt något större) för extra marginal.
- **Ingen rotation/pinch/dubbeltryck.** Bitar har ingen rotationsgest — de ligger redan rättvända i tray:en (ev. en fast liten visuell lutning som INTE behöver rättas).

## Återkoppling & belöning
- **Per pekning (<100ms):** DragController ger studs (skala 1.12) + `tap`-ljud vid markering. Vid drag-start lyfts biten överst.
- **Rätt drop (onCorrect):** `audio.sfx('match')`, `feedback.sparkle(ctx.fxLayer, worldX, worldY)`, `feedback.pop(pieceView)`, släck motsvarande spök-slot (tween alpha→0), och ibland (var 2:a bit) `voice.say(randomFrom(['Så där ja!','Den passar!','Bra!']))`. Markera `placed`-räknare.
- **Fel drop (onWrong):** DragController spelar redan `soft` och snäpper hem. Lägg `feedback.wiggle(rec.view)`. **Aldrig** buzzer/rött/ord som "fel".
- **Tomt tryck i tray/bakgrund:** ingen bestraffning; bakgrunden är `eventMode='none'`.
- **Runda klar (alla bitar placerade):** kör `_celebrateScene()` (se nedan) → `audio.sfx('reveal')` + `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE) + ' Titta, bilden är klar!')`, `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.complete()`. `complete()` sköter delat firande + stjärna + klistermärke.
- **Ny runda:** `gsap.delayedCall(1.6, () => this._newRound(ctx))`, `audio.sfx('whoosh')` när nya bitar studsar in (`feedback.bounceIn`).

## Progression & nivåer
- `this._level = ctx.progress.get().highestLevel | 0`. `this._round = ctx.progress.get().custom?.round | 0`.
- **Antal bitar:** `n = [2,3,4][this._round % 3]` → 2 → 3 → 4 bitar, sedan cykliskt. (Stigande svårighet utan att någonsin bli "för svårt".)
- **Motiv:** `theme = THEMES[this._round % THEMES.length]` → roterar genom de fyra scenerna så varje runda känns ny.
- Vid varje klar runda: `this._round++`, `ctx.progress.setCustom('round', this._round)`, `setLevel(this._level + 1)` (driver stjärnor/highestLevel), sedan `_newRound`.
- **Oändlig lek:** inget slut, ingen poäng som sjunker, ingen timer.

## Tillgångar (programmatiskt)
Inga externa filer. Allt = Pixi `Graphics` + emoji som `Text`.

- **Bitform / mask / spök-slot:** `Graphics`-rundade rektanglar; valfritt med enkla halvcirkel-"knoppar" på inre kanter (`tracePiece`-hjälpare, se bygg-steg). Vit kant-stroke 5px + skugg-stroke ger pussel-look.
- **Scener (ritas med Graphics + emoji):**
  - **Trädgård:** himmel (rekt, `COLORS.blue` ljus) övre halva, gräs (`COLORS.green`) nedre; emoji-accenter ☀️ 🌻 🦋 🌳.
  - **Katt:** stor cirkel-ansikte (`COLORS.yellow`/orange), öron (trianglar via `poly`), emoji 🐱 🐾 alternativt rita morrhår med `moveTo/lineTo`.
  - **Hus:** husstomme (rekt), tak (triangel `poly`), sol; emoji 🏠 🌳 ☁️ 🌷.
  - **Båt:** hav (`COLORS.blue`) nedre, himmel övre; emoji ⛵ 🌊 ☀️ 🐟.
- **Förhandsvisning:** samma scen-bygge återanvänt med `alpha=0.12`.
- **Belöningspartiklar:** `feedback.sparkle`, `feedback.bigCelebration` (via `complete()`).

## Återanvänd dessa
- `lib/DragController.js` — drag + magnetiskt snäpp + snäpp-tillbaka + tap-tap-fallback (uppfinn inte eget drag).
- `lib/feedback.js` — `bounceIn`, `pop`, `wiggle`, `sparkle` (per-bit-respons + firande).
- `lib/swedish.js` — `shuffle` (sprid bitar/slots), `randomFrom` (beröm).
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say(...)`, `ctx.fxLayer`, och **`ctx.progress`** (`get/setLevel/setCustom/complete`) — rör aldrig `localStorage` direkt.
- Pixi v8: `Graphics` fluent, `Text` med `style`, `container.mask = shape` (masken måste läggas till i display-listan), `eventMode='static'` på bitar, `eventMode='none'` på dekor.

## Edge-cases & städning
- **`this._alive`:** sätt `true` i `init`, `false` i `destroy`. Vakta alla `gsap.delayedCall`/`onComplete`-callbacks (`if (!this._alive) return`).
- **Dubbel-resolve:** håll en `this._resolving`/per-bit `placed`-flagga så att en bit som redan snäppt in inte kan dras igen (DragController sätter `rec.placed=true` och `eventMode='none'` vid korrekt — bygg vidare på det). Räkna placerade bitar mot `n`; trigga klar exakt en gång (`if (this._done) return; this._done = true`).
- **Exit mitt i animation:** möjligt — därför `_alive`-vakt + döda tweens.
- **`destroy(ctx)`:** 
  ```
  this._alive = false
  this._drag?.destroy()
  gsap.killTweensOf(this._root)   // + döda per-bit-tweens om sparade
  this._root?.destroy({ children: true })
  ```
- Masker: när en bit förstörs förstörs dess mask som barn (mask ligger i bit-containern). Säkerställ att inga maskreferenser dröjer kvar.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/enkelt-pussel/index.js`. Default-exportera GameModule-objektet med metadata enligt tabellen ovan.
2. **Hjälpare `tracePiece(g, w, h, edges)`** (modulnivå): ritar en pusselbit-väg centrerad på (0,0): rundad rekt `w×h`; för varje inre kant i `edges` (`'knob' | 'hole' | 'flat'`) lägg en halvcirkel (radie ~`min(w,h)*0.16`) ut/in på mittpunkten av kanten. Returnera `g`. Internt grid: tilldela varje delad kant `knob` på ena biten och `hole` på grannen, yttre kanter `flat`. (För enklast möjliga första version: tillåt enbart `flat` rundade rektanglar — läses ändå som pussel av målgruppen.)
3. **`THEMES`** (modulnivå): array av `{ id, draw(g, w, h), accents:[{emoji,x,y,size}] }` där koordinater är i canvasens 500×500-rymd.
4. **`_buildBoard(ctx)`:** rita rampaltta, lägg förhandsvisning (alpha 0.12) via `_buildScene(theme)` skalad till 500×500.
5. **`_newRound(ctx)`:** bestäm `n` och `theme`; rensa förra rundans bitar/slots (`this._drag.clear()` + förstör gamla containrar); beräkna slot-rektanglar; för varje slot:
   - skapa osynlig `slotView` (Container) på slottens världs-center; `drag.addTarget(slotView, d => d.slot===i, { hitRadius })`.
   - rita spök-slot-kontur på board.
   - skapa **bit-container**: lägg `_buildScene(theme)` förskjuten `(-pieceCenterX, -pieceCenterY)`, skapa mask-`Graphics` via `tracePiece(...)` centrerad (0,0), `piece.mask = mask; piece.addChild(mask)`, lägg vit kant-`Graphics` (samma `tracePiece`-väg, bara stroke) ovanpå.
   - placera biten på en spridningspunkt i tray:en, `feedback.bounceIn(piece)`, `audio.sfx('whoosh')`.
   - `drag.addItem(piece, { slot: i }, { onCorrect, onWrong, onSelect })`.
6. **`onCorrect`:** `match`-ljud, `sparkle`, `pop`, släck spök-slot, öka placerad-räknare; om alla placerade → `_finishRound(ctx)`.
7. **`onWrong`:** `wiggle(rec.view)` (DragController har redan spelat `soft` + snäppt hem).
8. **`_finishRound(ctx)`:** guarda med `this._done`; spela scen-liv-animation (snurra sol / studsa accenter), `reveal`+`celebrate`, beröm-röst, `setLevel`, `setCustom('round', ++round)`, `progress.complete()`, `gsap.delayedCall(1.6, () => this._newRound(ctx))`.
9. **`init(ctx)`:** `this._alive=true`; skapa `this._root`, lägg i `ctx.stage`; skapa `DragController`; `_buildBoard`; läs `_level/_round` från `ctx.progress`; `_newRound`.
10. **`mount(ctx)`:** `ctx.services.voice.say(this.voiceIntro)`; starta idle-timer (~6s utan interaktion) som spelar `voice.replayLast()` eller om-säger intro; nollställ timern vid varje pekning.
11. **`destroy(ctx)`:** enligt städningsblocket ovan; rensa idle-timer/`delayedCall`.
12. Registrera i `src/games/registry.js`: `import enkeltPussel from './enkelt-pussel/index.js'` och lägg `enkeltPussel` i `GAMES`-arrayen.
13. `npm run dev` → öppna biblioteket → spela; verifiera hem-knapp, röst-repris, snäpp, firande, ny runda och att `round`/stjärnor består efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas i GameHost **utan konsolfel** (lyssna på `browser_console_messages`); canvas finns och har storlek > 0.
- Vid mount sägs en svensk instruktion (VoiceService anropas / `voiceIntro` finns) och `n` bitar + `n` spök-slots syns i scenen.
- **Drag rätt:** att dra/släppa en bit nära sin slot snäpper in den (bitens position ≈ slot-center inom några px), spelar `match`, och spök-slotens alpha går mot 0.
- **Tap-tap-fallback:** tryck på bit → tryck på rätt slot flyttar biten dit (samma resultat som drag).
- **Fel drop:** att släppa en bit på fel slot ger mjuk respons (`soft` + vingel) och biten snäpper tillbaka till sin spridningsposition — **inget** felljud/rött/"game over".
- **Klar runda:** när alla bitar är placerade triggas firande exakt en gång (`progress.complete()` anropas en gång), och en ny runda med (potentiellt) annat antal bitar/motiv startar.
- **Persistens:** `custom.round`/`highestLevel` ökar och finns kvar efter sidomladdning (verifiera via sparat state/`localStorage`-nyckeln `pwagames.save.v1`).
- **Städning:** att lämna spelet (hem) mitt i en animation kastar inga fel (inga tweens/timeouts kör mot förstörda objekt).
