# Plask i Vattnet (`plask-i-vattnet`)
> Barnet släpper saker i en glasvattentank och upptäcker, med roligt plask, vad som flyter och vad som sjunker — ren utforskande fysiklek där inget svar är fel, vilket gör 3–5-åringar trygga och nyfikna.

## Metadata
| Fält | Värde |
| --- | --- |
| id | `plask-i-vattnet` |
| titleSv | Plask i Vattnet |
| icon | 💧 |
| category | `fysik` |
| input | `drag` |
| ageRange | `[3, 5]` |
| bundle | `plask-i-vattnet` |
| voiceIntro | `Släpp sakerna i vattnet och se vad som händer!` |

## Mål & mekanik
- **Vad barnet gör:** Drar (eller tap-tap:ar) föremål från en hylla upptill ner i en stor vattentank i mitten.
- **Kärnloop:** Plocka föremål → släpp i tanken → *plask!* → föremålet visar sin fysik: **flyter** (studsar/guppar vid ytan) eller **sjunker** (glider mjukt ner till botten). Rösten benämner vad som hände. Nästa föremål kan släppas direkt.
- **Inget är fel:** Tanken accepterar ALLA föremål. Det finns inget "rätt" mål — själva poängen är att se utfallet. Att släppa utanför tanken snäpper bara mjukt tillbaka till hyllan (med `soft`-ljud), aldrig en bestraffning.
- **Runda blir klar:** När alla 6 föremål i hyllan har hamnat i vattnet anropas `ctx.progress.complete()` (delat firande + klistermärke). Efter ~1,3 s töms tanken och en ny hylla med nya föremål dyker upp (oändlig lek).

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalarknapparna i headern — rita INGA egna sådana. Allt nedan i designkoordinater.

- **Bakgrund:** Hela ytan fylls med `COLORS.bg` (0xfdf6e3). Ett mjukt "golv"-band kan ritas men är valfritt; håll det dekorativt (`eventMode='none'`).
- **Vattentank (mål):** Centrerad glasbehållare.
  - Tankrektangel: x från **390 till 890** (bredd **500**), topp y=**250**, botten y=**690** (höjd **440**), hörnradie 28.
  - Glas: `g.roundRect(390,250,500,440,28).fill({color:0x9fd8f0, alpha:0.18}).stroke({width:8,color:0xffffff,alpha:0.7})`.
  - Vattenyta vid y=**330**. Vatten: `g.roundRect(398,330,484,352,18).fill({color:0x4aa3df, alpha:0.45})` (lite indrag innanför glaset).
  - En ljusare yt-linje (Graphics rect, alpha 0.35) vid y=330 som lätt guppar via gsap yoyo (`y: 330±4`, duration 1.4, repeat -1) — dekorativ, `eventMode='none'`.
  - **Tankens mittpunkt för DragController-target:** ett osynligt/centrerat target-view placerat på (**640, 470**) med `hitRadius: 280` så hela tankytan blir en generös träffzon.
- **Hylla (föremålskälla):** Längs ovankanten, y-rad ≈ **150**.
  - 6 platser jämnt fördelade i x: **190, 326, 462, 818, 954, 1090** (lämnar mittutrymme 540–740 fritt för tankens topp/headern). Varje platsbricka: vit cirkel r=64, `fill({color:0xffffff, alpha:0.85}).stroke({width:4,color:0xeadfca})`.
  - Föremålet (emoji `Text`, fontSize 96, anchor 0.5) ligger ovanpå sin bricka. Hela föremåls-`Container` (bricka+emoji) är drag-item, hitbox ≈128px → uppfyller ≥96px.
- **Bottenlager (sjunkna saker):** föremål som sjunkit landar staplade nära y=**640–660**, x sprids 430–850 så de inte överlappar exakt.

## Interaktion
- **DragController** (`lib/DragController.js`) sköter allt: `const drag = new DragController({ space: this._root, services: ctx.services })`.
- **Ett target:** `drag.addTarget(tankView, () => true, { hitRadius: 280 })` — accepterar alla föremål (utforskande, inget fel).
- **Items:** för varje hyllföremål `drag.addItem(view, { emoji, floats }, { onCorrect, onWrong, onSelect })`.
  - **Drag:** dra föremålet över tanken och släpp inom 280px från (640,470) → `onCorrect` (plask + fysik).
  - **tap-tap-fallback (inbyggt):** tryck på föremålet (markeras med puls + `tap`-ljud), tryck sedan på tanken → samma `onCorrect`. Krävs för <4 år.
  - Släpp utanför tanken → DragController snäpper hem automatiskt; ej `onWrong` (eftersom inget target träffas). Släpp som "tap" utan rörelse → markerar för tap-tap.
- **Hit-halo:** brickans cirkel (r=64) + emojin ger naturligt >96px; ingen extra hitArea krävs, men sätt `view.eventMode='static'` (DragController gör detta).
- **Under "resolving"** (medan ett föremål animerar plask/sjunk) tillåts nästa föremål dras parallellt — DragController hanterar bara ett aktivt drag åt gången (`this.active`), så inga dubbelträffar uppstår.

## Återkoppling & belöning
Varje pekning ger ljud+bild <100ms, alltid positivt.
- **Plocka upp / markera:** `audio.sfx('tap')` + lätt puls (DragController gör puls vid markering).
- **Plask (vid släpp i tank), onCorrect:**
  1. `audio.sfx('pop')` direkt (plask-ljud).
  2. Visuellt plask vid ytan: `puff(ctx.fxLayer, dropX, 330, { count: 10, color: 0x9fd8f0 })` + en kort växande/försvinnande ringa-Graphics (cirkel som skalar 0→2 och fadar) vid (dropX, 330).
  3. **Om `floats`:** föremålet animeras till ytnivå (y≈**360**, strax under ytan) och guppar lugnt (gsap yoyo `y±10`, duration 0.9, repeat 2–3). `audio.sfx('pling')` + `voice.say('Den flyter!')`.
  4. **Om sjunker:** föremålet glider mjukt ner till botten (gsap `y: 640 + sprid`, duration 0.9, ease `power1.in`) med lätt vingel. `audio.sfx('reveal')` + `voice.say('Den sjunker!')`.
- **"Fel"/tomt (släpp utanför tank eller tom hylla-tryck):** DragController spelar `soft` och snäpper hem; lägg dessutom `wiggle(view)` i `onWrong` om du registrerar ett sekundärt "fel"-target (ej nödvändigt här). Ingen buzzer, inget rött, ingen tillrättavisning.
- **Runda klar:** när räknaren `_dropped === 6` → `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.complete()` (delat firande 1–2s + stjärna + klistermärke; spelar `celebrate` internt). Valfritt `voice.say(randomFrom(PRAISE))`.
- **Idle ~6s:** om inget hänt på 6 s, `voice.replayLast()` eller `voice.say(this.voiceIntro)` + lätt puls på ett kvarvarande hyllföremål.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`.
- Varje avslutad runda → `setLevel(this._level + 1)`; `this._level++`.
- **Svårighet växer mjukt** (alltid 6 föremål, inget tidskrav):
  - Nivå 0–1: tydliga, välkända föremål (anka, sten).
  - Nivå 2+: blanda in mer "överraskande" föremål (äpple flyter, nyckel sjunker) så barnet upptäcker mönster. Håll alltid ~3 flytare + 3 sjunkare per hylla (`shuffle`).
- `setCustom('totalDropped', n)` kan spara totalt antal släppta för statistik (valfritt). Ingen synlig poäng.
- **Oändlig lek:** efter `complete()` → `gsap.delayedCall(1.3, () => this._newRound(ctx))` som rensar tank/botten och bygger ny hylla.

## Tillgångar (programmatiskt)
INGA externa filer. Allt = Pixi `Graphics` + system-emoji som `Text`.
- **Emoji-föremål (fontSize 96):**
  - Flyter (`floats:true`): 🦆 (anka), 🍃 (löv), 🪵 (träklots), 🛟 (badring), ⛵ (båt), 🍎 (äpple).
  - Sjunker (`floats:false`): 🪨 (sten), 🔑 (nyckel), 🥄 (sked), 🪙 (mynt), 🔩 (skruv), ⚙️ (kugghjul).
- **Graphics:** tankens glas (`roundRect` + `stroke`), vattenkroppen (`roundRect` halvtransparent), guppande ytlinje (`rect`), föremålsbrickor (vit `circle` + `stroke`), plask-ringar (`circle` som skalar/fadar), partiklar via `puff`/`sparkle`.
- **Text:** föremåls-emoji (FONT.body), ev. ingen läskrävande text på skärmen.

## Återanvänd dessa
- `lib/DragController.js` — drag + snäpp + snäpp-tillbaka + tap-tap (kärnan).
- `lib/feedback.js` — `puff` (plask), `sparkle` (vid flytande gupp), `bounceIn` (hyllföremål in), `wiggle` (lekfullt fel).
- `lib/swedish.js` — `shuffle`, `randomFrom`.
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`, `PLAYFUL`.
- `ctx.services.audio.sfx('tap'|'pop'|'pling'|'reveal'|'soft')`, `ctx.services.voice.say(...)` / `replayLast()`.
- `ctx.progress.setLevel`, `ctx.progress.complete`, `ctx.progress.get`, `ctx.progress.setCustom`.
- `ctx.fxLayer` för plask/konfetti, `ctx.ticker` (om du vill ha kontinuerlig vattenanimation istället för gsap-yoyo).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `this._alive = false` först i `destroy`. Varje async-callback (`gsap.delayedCall`, `onComplete`, idle-timer) börjar med `if (!this._alive) return`.
- **Förhindra dubbel-resolve:** efter att ett föremål hamnat i vattnet, sätt `rec.view.eventMode='none'` (DragController gör detta vid `placed`) så det inte kan dras igen.
- **Räkna säkert:** öka `this._dropped` exakt en gång per föremål i `onCorrect`; trigga `complete()` endast när `_dropped === antalHyllföremål` och inte redan firat (`this._celebrating`-flagga).
- **destroy():**
  - `this._alive = false`
  - `this._idleTimer && clearTimeout(this._idleTimer)` (eller `gsap.killTweensOf` om gsap-baserad)
  - `this._drag?.destroy()`
  - `gsap.killTweensOf(this._root)` samt kill per-objekt-tweens (gupp/sjunk/ytlinje)
  - `this._root?.destroy({ children: true })`
- Barnet kan avsluta mitt i en plask-animation → alla `onComplete` skyddas av `_alive`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/plask-i-vattnet/index.js`. Default-exportera GameModule-objektet med metadata enligt tabellen ovan (kopiera strukturen från `sortera-skrap`).
2. Importera: `Container, Graphics, Text` från `pixi.js`; `gsap`; `DragController`; `shuffle, randomFrom` från `swedish.js`; `puff, sparkle, bounceIn, wiggle` från `feedback.js`; `COLORS, FONT, PRAISE` från `theme.js`.
3. Definiera föremålspoolen: `const POOL = [{emoji:'🦆',floats:true}, ...]` (6 flytare + 6 sjunkare).
4. `init(ctx)`: `this._alive=true`; skapa `this._root`, lägg i `ctx.stage`; läs `this._level`; skapa `this._drag`; bygg `_buildTank(ctx)` (glas, vatten, guppande ytlinje, osynligt target-view på 640,470 med `addTarget(view, ()=>true, {hitRadius:280})`); kör `_newRound(ctx)`.
5. `_newRound(ctx)`: `if(!this._alive)return`; rensa förra rundans föremål/botten; `this._dropped=0`; `this._celebrating=false`; välj `shuffle(POOL).slice(0,6)` med ~3 flytare/3 sjunkare; lägg ut på hyllpositionerna med `bounceIn`; `drag.addItem(...)` per föremål.
6. I `addItem`-hooks: `onSelect` → liten markering (DragController ger redan puls/`tap`); `onCorrect(rec,target)` → kör `_splash(ctx, rec)` (plask-ljud `pop`, `puff` + ring vid ytan, sedan flyt- eller sjunk-animation + röst), öka `_dropped`, om klart → `_finishRound(ctx)`; `onWrong` → `wiggle(rec.view)` (vid behov).
7. `_finishRound(ctx)`: `if(this._celebrating)return; this._celebrating=true`; `ctx.progress.setLevel(this._level+1); this._level++; ctx.progress.complete();` `gsap.delayedCall(1.3, ()=>this._newRound(ctx))`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`; starta idle-timer (6s) som re-cue:ar.
9. `destroy(ctx)`: enligt städlistan ovan.
10. Registrera i `src/games/registry.js`: `import plaskIVattnet from './plask-i-vattnet/index.js'` och lägg in i `GAMES`-arrayen.
11. `npm run dev` → öppna biblioteket → spela. Verifiera plask, flyt/sjunk, röst, hem-knapp, firande och att `highestLevel` består efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras från biblioteket och renderar **utan konsolfel** (inga Pixi-/JS-undantag).
- `voiceIntro` (eller motsvarande say-anrop) sker vid mount; en repris sker efter ~6 s idle.
- Hyllan visar 6 dragbara föremål; varje föremåls träffyta är ≥96px.
- **Drag:** att dra ett föremål till tanken triggar plask (`pop`-ljud) och korrekt fysik — flytare guppar nära ytan (y≈360), sjunkare hamnar nära botten (y≈640).
- **tap-tap:** tryck på föremål och sedan på tanken ger samma utfall som drag.
- **"Fel"/utanför:** släpp utanför tanken snäpper mjukt tillbaka till hyllan med `soft`-ljud; ingen buzzer, inget rött, inget game-over-tillstånd, inga sjunkande poäng.
- När alla 6 föremål är i vattnet anropas `ctx.progress.complete()` (firande + klistermärke synligt via fxLayer/konfetti) exakt en gång per runda.
- Efter firandet startar en **ny runda** automatiskt (oändlig lek), tanken är tömd och en ny hylla visas.
- `highestLevel` ökar efter avklarad runda och **kvarstår efter sidomladdning** (progress sparas via ctx.progress / localStorage).
- `destroy()` lämnar inga aktiva tweens/timers (inga "tween after destroy"-varningar vid snabb hem-navigering mitt i en animation).
