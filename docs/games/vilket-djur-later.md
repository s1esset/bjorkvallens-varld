# Vilket Djur Låter Så? (`vilket-djur-later`)
> Ett djurläte spelas upp och barnet trycker på rätt djur bland några stora glada bilder — 2–4-åringar älskar att para ihop ljud med djur och få djuret att "svara" med sitt namn.

## Metadata
| Fält | Värde |
|---|---|
| id | `vilket-djur-later` |
| titleSv | Vilket Djur Låter Så? |
| icon | 🐮 |
| category | pedagogiskt |
| input | tap |
| ageRange | [2, 4] |
| bundle | `vilket-djur-later` |
| voiceIntro | "Lyssna! Vilket djur låter så?" |

## Mål & mekanik
Kärnloop:
1. En **fråge-bricka högst upp** (en stor 🔊/öra-symbol) spelar upp ett djurs läte (röst säger lätet, t.ex. "Mu! Mu!") när rundan startar och när barnet trycker på den (repris).
2. Nere på scenen visas **2–4 stora djurkort** (emoji-djur i färgglada rundade rutor). Ett av dem är rätt svar (det djur vars läte spelades).
3. Barnet **trycker på det djur som låter så**.
4. **Rätt djur**: kortet hoppar/pulserar, gnistror, ljud `correct`, och rösten säger djurets namn glatt ("Det är en ko! Kon säger muu!"). Sedan firande och ny runda.
5. **Fel djur**: kortet vinglar mjukt (`wiggle`) + ljud `soft`, ingen bestraffning. Barnet kan fortsätta trycka tills rätt hittas. Frågan upprepas vänligt.

En runda "blir klar" när barnet trycker på rätt djur → `ctx.progress.complete()` (delat firande + klistermärke), sedan byggs en ny runda med ett nytt slumpat djur (oändlig lek).

## Skärm-layout (1280x720)
Bygg allt i `this._root` (Container i ctx.stage). Header-knappar (hem/repetera) ritas INTE — GameHost äger dem.

- **Bakgrund**: hela `this._root` får en mjuk Graphics-yta (valfritt) eller lämnas till appens bg. Lägg ev. en stor lugn `roundRect(40,40,1200,640,40).fill(COLORS.cream, alpha 0.0)` som ej-interaktiv.
- **Frågebricka (ljudknapp)**: centrerad högt upp.
  - Container på `x=640, y=170`.
  - Cirkel `circle(0,0,90).fill(COLORS.yellow).stroke({width:8,color:0xffffff})`.
  - Emoji `🔊` som Text fontSize 96, anchor 0.5, i mitten.
  - Hit-area: hela cirkeln (radie 90 + halo) → eventMode `static`, tryck = spela om lätet.
  - Liten textfri "ljudvåg"-puls (skala-pulserande ring) medan lätet spelas.
- **Djurkort (svarsalternativ)**: en horisontell rad, centrerad vertikalt runt `y=470`.
  - Kortstorlek `w=210, h=240`, hörnradie 28.
  - Antal n = 2–4 (nivåberoende). Gap = 50.
  - gridW = `n*210 + (n-1)*50`; startX = `(1280 - gridW)/2 + 105`.
  - Kort i lägger på `x = startX + i*(210+50)`, `y = 470`.
  - Varje kort: `roundRect(-105,-120,210,240,28).fill(<färg ur PLAYFUL>).stroke({width:6,color:0xffffff,alpha:0.8})` + djur-emoji som Text fontSize 130, anchor 0.5.
- Marginaler: minst 60px från kanterna; korten hamnar mellan y≈350 och y≈590, väl under header.

## Interaktion
- **Frågebricka**: `eventMode='static'`, `cursor='pointer'`, `on('pointertap', () => this._playSound(ctx))`. Spelar om aktuellt djurs läte via röst, ljud `tap`/`pling`, och pulserar ringen. Detta är "repetera"-mekaniken inuti spelet (utöver GameHosts globala repetera).
- **Djurkort**: varje kort `eventMode='static'`, `cursor='pointer'`, `on('pointertap', () => this._choose(ctx, card))`.
  - Hit-area: hela kortet är ≥210×240 (långt över 96px). Lägg ev. en osynlig `hitArea` (Rectangle) med +24px halo runt om.
- Inga drag, inga dubbeltryck, inga långtryck. Endast `pointertap`.
- **Resolving-skydd**: medan rätt svar firas sätts `this._busy = true` så att vidare tryck ignoreras tills nästa runda byggs.

## Återkoppling & belöning
Per-tryck (<100ms):
- Varje tryck på ett kort ger omedelbart `audio.sfx('tap')` + en liten `pop(card)`-puls.
- **Frågebricka-tryck**: `audio.sfx('pling')` + ring-puls + `voice.say(<lätesfras>)`.

Rätt djur:
- `audio.sfx('correct')` direkt, sedan `sparkle(ctx.fxLayer, card.x+root.x, card.y+root.y)` (eller sparkle på `this._root` i lokala koordinater), `pop(card)` och en glad studs.
- `voice.say('Det är en ' + namn + '! ' + lätesNamn)` t.ex. "Det är en ko! Kon säger muu!"
- `ctx.progress.complete()` (delat firande + stjärna + klistermärke). Vänta ~1.4s (`gsap.delayedCall`) → bygg ny runda.

Fel djur (ALDRIG bestraffning):
- `audio.sfx('soft')` + `wiggle(card)`. Inget rött, ingen "fel"-röst.
- Efter kort paus upprepa lätet vänligt (valfritt) så barnet får en ny chans. Frågan/rundan fortsätter — inget tappas.

Idle ~6s utan korrekt val: `voice.say(this.voiceIntro)` igen + spela lätet + låt rätt kort göra en liten lockande studs (`pop`). Återställ idle-timer vid varje tryck.

Använda sfx-namn: `tap`, `pling`, `correct`, `soft`. Voice-fraser: voiceIntro, lätesfras ("Mu! Mu!"), namnfras ("Det är en ko! Kon säger muu!").

## Progression & nivåer
- Lagra svårighet i `highestLevel` (0-indexerad).
- LEVELS styr antal svarsalternativ:
  - Nivå 0: 2 kort
  - Nivå 1: 3 kort
  - Nivå 2: 4 kort
- Vid `init`: `this._level = clampLevel(ctx.progress.get().highestLevel | 0)`.
- Efter varje klarad runda: höj nivå med 1 var ~2:a runda (eller varje runda tills max), `ctx.progress.setLevel(this._level)` + `ctx.progress.complete()`.
- `custom.rundor` räknar totalt antal klarade rundor (`setCustom('rundor', n+1)`).
- Varje runda väljer slumpat rätt-djur + slumpade distraktorer ur DJUR-listan (`shuffle`, inga dubbletter i samma runda). Oändlig lek — alltid en ny runda efter firandet.

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas med emoji (Text) + Pixi Graphics.

Djurdata (emoji + svenskt namn + läte-fras + lätesnamn):
| emoji | namn | lätesfras (voice) | lätesnamn |
|---|---|---|---|
| 🐮 | ko | "Mu! Muu!" | "muu" |
| 🐶 | hund | "Voff! Voff!" | "voff" |
| 🐱 | katt | "Mjau! Mjau!" | "mjau" |
| 🐷 | gris | "Nöff! Nöff!" | "nöff" |
| 🐑 | får | "Bää! Bää!" | "bää" |
| 🐸 | groda | "Kvack! Kvack!" | "kvack" |
| 🐔 | höna | "Pock pock!" | "pock" |
| 🐴 | häst | "Gnägg!" | "gnägg" |
| 🦆 | anka | "Kvack kvack!" | "kvack" |
| 🐝 | bi | "Bzzz!" | "surr" |

Grafik:
- Frågebricka: `circle` (gul) + `🔊` Text + puls-ring (`circle().stroke(...)`).
- Djurkort: `roundRect` (PLAYFUL-färg) + vit stroke + djur-emoji Text (fontSize 130).
- Konfetti/gnistror via `feedback.js` (sparkle, puff, bigCelebration sker i complete()).

## Återanvänd dessa
- `feedback.js`: `pop`, `wiggle`, `sparkle`, `puff`.
- `swedish.js`: `shuffle`, `randomFrom`.
- `theme.js`: `COLORS`, `FONT`, `PLAYFUL`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress.get/setLevel/setCustom/complete`.
- `ctx.ticker` för idle-timern, `ctx.fxLayer` för firande/gnistror.
- Pixi v8: `Container`, `Graphics` (fluent), `Text` ({text, style}).
- (Button.js behövs ej — frågebrickan byggs som egen Container.)

## Edge-cases & städning
- `this._alive = true` i init, sätts `false` först i destroy; alla `gsap.delayedCall`/`onComplete`-callbacks börjar med `if (!this._alive) return`.
- `this._busy`-flagga hindrar dubbla val under firande/upplösning (motverkar effektivt dubbeltryck).
- Vid `_build`: döda gamla tweens (`gsap.killTweensOf` på kort + ring), `this._root.removeChildren().forEach(o => o.destroy({children:true}))`, nollställ `this._busy=false`, `this._idle=0`.
- `destroy(ctx)`:
  - `this._alive = false`
  - `ctx.ticker.remove(this._tick)`
  - `gsap.killTweensOf(this._root)` + döda kort-/ring-tweens
  - `ctx.services.voice.cancel()` (avbryt pågående tal)
  - `this._root?.destroy({ children: true })`
- Röst/ljud får inte staplas: `voice.cancel()` innan ny `voice.say` om lätet spelas snabbt om.
- Idle-timer återställs vid varje interaktion så den inte triggar mitt i tal.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/vilket-djur-later/index.js`. Kopiera strukturen från `src/games/klambubblor/index.js` (idle-ticker) och `vandkort/index.js` (nivå/`_build`/`clampLevel`-mönster).
2. Definiera `DJUR`-arrayen (emoji/namn/lätesfras/lätesnamn) och `LEVELS = [{n:2},{n:3},{n:4}]` överst i filen.
3. Default-exportera modulobjektet med metadata-fälten ovan (`id`, `titleSv`, `icon:'🐮'`, `category:'pedagogiskt'`, `input:'tap'`, `ageRange:[2,4]`, `bundle:'vilket-djur-later'`, `voiceIntro`).
4. `init(ctx)`: sätt `_alive=true`, skapa `_root` och addera till `ctx.stage`, läs `_level` från progress, anropa `_build(ctx)`, registrera idle-ticker (`this._tick = (t)=>this._update(ctx,t); ctx.ticker.add(this._tick)`).
5. `_build(ctx)`: städa gammalt, välj rätt-djur + distraktorer via `shuffle`, bygg frågebrickan (`_makeSoundButton`) och n djurkort (`_makeCard`), studsa in dem (`bounceIn`/`gsap.to scale`). Sätt `this._answer = rättDjur`, `this._busy=false`, `this._idle=0`. Spela lätet en gång.
6. `_makeSoundButton(ctx)`: gul cirkel + 🔊 + puls-ring; `pointertap` → `_playSound`.
7. `_makeCard(ctx, djur, color)`: roundRect + djur-emoji; `pointertap` → `_choose`.
8. `_playSound(ctx)`: `audio.sfx('pling')`, puls-ring, `voice.say(answer.lätesfras)`, `_idle=0`.
9. `_choose(ctx, card)`: om `_busy` return; `audio.sfx('tap')`+`pop(card)`+`_idle=0`. Om rätt → `_busy=true`, `correct`, `sparkle`, `voice.say` namnfras, höj nivå, `progress.complete()`, `setCustom('rundor', ...)`, `gsap.delayedCall(1.4, ()=>this._build(ctx))`. Om fel → `audio.sfx('soft')` + `wiggle(card)`.
10. `mount(ctx)`: `voice.say(this.voiceIntro)` och spela lätet (liten delay efter intron).
11. `_update(ctx, ticker)`: idle-räknare; vid >6s och ej busy → upprepa intro + läte + lockande `pop` på rätt kort.
12. `destroy(ctx)`: enligt städlistan ovan.
13. Registrera spelet i `src/games/registry.js`: importera modulen och lägg till i `GAMES`-arrayen.
14. `npm run dev` → öppna biblioteket → spela: verifiera ljudknapp, rätt → firande + klistermärke, fel → vingel, progress kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas i biblioteket och startar utan konsolfel (inga uncaught errors/warnings i `browser_console_messages`).
- Frågebrickan och 2–4 djurkort syns och är interaktiva (eventMode static / cursor pointer).
- Tryck på frågebrickan triggar ljud/röst-uppspelning igen (ljudvåg/puls observerbar, inget fel).
- Tryck på **rätt** djur → firande (gnistror/konfetti), `ctx.progress.complete()` anropas (stjärna/klistermärke), och en ny runda byggs efter ~1.4s.
- Tryck på **fel** djur → mjuk vingel + `soft`-ljud, ingen "game over", ingen röd/bestraffande feedback, rundan fortsätter.
- Dubbla snabba tryck under firande ger inga dubbla rundor (`_busy`-skydd verifieras).
- Progress sparas: `highestLevel`/`custom.rundor` ökar och kvarstår efter sidomladdning (localStorage `pwagames.save.v1`).
- Att lämna spelet (hem-knapp) mitt i ett firande kastar inga fel (destroy städar tweens/ticker/röst, `_alive`-skydd håller).
