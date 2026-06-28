# Härma Melodin (`harma-melodin`)
> Fyra stora färgglada plattor lyser och spelar varsin glad ton i en sekvens som barnet sedan härmar genom att trycka — ett mjukt, förlåtande Simon-minnesspel där sekvensen växer långsamt och alltid kan visas igen, utan att man någonsin kan "förlora".

## Metadata
| Fält | Värde |
|---|---|
| id | `harma-melodin` |
| titleSv | Härma Melodin |
| icon | 🎵 |
| category | `minne` |
| input | `tap` |
| ageRange | `[3, 5]` |
| bundle | `harma-melodin` |
| voiceIntro | `Titta och lyssna! Härma sedan melodin.` |

## Mål & mekanik
Barnet ska titta/lyssna på en kort melodisekvens som spelas upp på fyra färgade plattor och sedan **härma den** genom att trycka på plattorna i samma ordning.

**Kärnloop:**
1. **VISA** — spelet spelar upp sekvensen: varje platta i tur och ordning "tänds" (lyser upp + studsar) och spelar sin ton. Plattorna är icke-tryckbara under uppspelning (`_state = 'showing'`).
2. **HÄRMA** — när sekvensen är klar växlar spelet till `_state = 'listening'`. Maskoten i mitten ler och rösten säger "Din tur!". Barnet trycker på plattorna i ordning.
3. **Korrekt tryck** → plattan tänds, spelar sin ton, en liten gnistra (`sparkle`). Pekaren (`_step`) flyttas fram.
4. **Hela sekvensen rätt** → kort firande (`audio.sfx('correct')` + beröm + `ctx.progress.complete()`), sedan växer sekvensen med ETT steg och nästa runda visas automatiskt. **Oändlig lek.**
5. **Fel tryck** → ALDRIG straff: plattan (och rätt platta) vinglar mjukt (`wiggle`), `audio.sfx('soft')`, rösten säger "Nästan! Titta igen.", och **samma sekvens visas om från början** så barnet får försöka igen. Inget tas bort, inget "game over".

En runda "blir klar" när barnet härmat hela den aktuella sekvensen i rätt ordning.

## Skärm-layout (1280x720)
Header-knappar (hem + repetera-röst) ritas av GameHost — rita INGA egna sådana.

**Bakgrund:** mjuk heldekal i `COLORS.bg` (0xfdf6e3) som fyller 1280x720 (`Graphics().rect(0,0,1280,720).fill(COLORS.bg)`), `eventMode='static'` så tomma tryck fångas och ger lekfull respons.

**Pad-rutnät (2x2), plattor 280x280, gap 40, rutnätets mitt (640,320):**
| Platta | Färg (COLORS) | Mitt (x,y) | Ikon-emoji |
|---|---|---|---|
| 0 grön | `green` 0x5bbf6a | (480, 160) | 🐸 |
| 1 röd | `red` 0xff6b6b | (800, 160) | 🍎 |
| 2 blå | `blue` 0x4aa3df | (480, 480) | 💧 |
| 3 gul | `yellow` 0xffd35c | (800, 480) | ⭐ |

Varje platta = `roundRect(-140,-140,280,280,40).fill(<grundfärg, alpha 0.85>).stroke({width:8,color:0xffffff,alpha:0.7})` plus centrerad ikon-`Text` (fontSize 96, `anchor.set(0.5)`). Hit-yta täcker hela 280x280 (>=96px med marginal); ingen extra hit-halo behövs men `eventMode='static'`, `cursor='pointer'`.

**Maskot i mitten (640,320):** liten glad cirkelfigur (`Graphics().circle(0,0,70).fill(COLORS.cream).stroke(...)` + ögon/mun, eller emoji 🎶 i `Text` fontSize 72). Reagerar: ler/studsar under "Din tur", blundar/lyssnar under uppspelning. `eventMode='none'`.

**"Visa igen"-knapp:** `lib/Button.js` centrerad nederst vid (640, 672), width 300, height 76, color `COLORS.purple`, icon '👀', label 'Visa igen', sound `'tap'`. Spelar upp sekvensen på nytt utan straff. `eventMode` hanteras av Button; inaktiveras (alpha 0.5, `eventMode='none'`) medan `_state==='showing'`.

## Interaktion
**Endast TAP.** Inget drag.

- Varje platta lyssnar på `'pointertap'` → `_onPadTap(ctx, padIndex)`.
- `_onPadTap` ignoreras om `!this._alive` eller `this._state !== 'listening'` (skyddar mot tryck under uppspelning/firande — undvik dubbeltryck under "resolving").
- **Korrekt:** `padIndex === this._sequence[this._step]` → tänd plattan (`_lightPad`), `_step++`. Om `_step >= _sequence.length` → `_onRoundComplete(ctx)`.
- **Fel:** annars → `_onWrong(ctx, padIndex)` (mjuk respons, se nedan), `_state='showing'`, visa sekvensen om från början via `_playSequence(ctx)`.
- **Tomt tryck** (bakgrund eller maskot): mjuk neutral studs på maskoten + ev. inget ljud eller mycket lågt — aldrig fel.
- **"Visa igen"-knapp:** sätt `_state='showing'`, `_step=0`, kör `_playSequence(ctx)`.
- **Tap-tap-fallback:** ej relevant (inget drag), men plattorna är så stora (280px) att felträff är osannolikt.

`_lightPad(index)`: `gsap.to(pad.scale,{x:1.12,y:1.12,duration:0.12,yoyo:true,repeat:1})`, höj fyllningens ljusstyrka kort (rita om med alpha 1.0 i 250ms, sedan tillbaka till 0.85), och `audio.sfx(PAD_SFX[index])`.

## Återkoppling & belöning
**Per tryck (<100ms):** varje plattryck ger omedelbart ljus (studs/ljusning) + plattans egen ton. Ton-mappning ger fyra olika ljud så melodin upplevs som musik:
```
PAD_SFX = ['pling', 'pop', 'reveal', 'flip']   // grön, röd, blå, gul
```

**Korrekt delsteg:** `audio.sfx(PAD_SFX[index])` + `sparkle(ctx.fxLayer, pad.x, pad.y)`.

**Hela sekvensen klar (`_onRoundComplete`):** `audio.sfx('correct')`, maskoten studsar (`pop`), `voice.say(randomFrom(PRAISE))` (t.ex. "Bravo!", "Jättebra!"), `bigCelebration(ctx.fxLayer,{width,height})`, sedan `ctx.progress.complete()` (delat firande 1–2s + stjärna + klistermärke).

**Fel (`_onWrong`) — ALDRIG bestraffning:** `audio.sfx('soft')`, `wiggle(felaktigPlatta)` och `wiggle(rättPlatta)` (vänlig vink om vilken som var rätt), maskoten lutar nyfiket, `voice.say('Nästan! Titta igen.')`. Ingen poäng sjunker, inget tas bort, sekvensen visas bara om.

**Idle (~6s i `listening`):** `voice.say('Din tur — tryck på plattorna!')` och spela en mjuk hint: tänd nästa förväntade platta (`this._sequence[this._step]`) en gång utan att räkna det som tryck.

**Röstfraser som används:**
- Intro/mount: `Titta och lyssna! Härma sedan melodin.`
- Vid "Din tur": `Din tur!`
- Fel: `Nästan! Titta igen.`
- Idle: `Din tur — tryck på plattorna!`
- Klart: en slumpad fras ur `PRAISE`.

## Progression & nivåer
- Sekvenslängd lagras i `ctx.progress`. Konstanter: `START_LEN = 2`, `MAX_LEN = 6`.
- Vid init: `this._len = Math.max(START_LEN, Math.min(MAX_LEN, ctx.progress.get().highestLevel || START_LEN))` (återuppta ungefär där barnet var).
- Sekvensen byggs slumpmässigt: `this._sequence = Array.from({length:this._len},()=>Math.floor(Math.random()*4))`.
- **Efter varje lyckad runda:** `ctx.progress.complete()`, sedan `this._len = Math.min(MAX_LEN, this._len + 1)`, `ctx.progress.setLevel(this._len)`, bygg ny slumpsekvens, `gsap.delayedCall(1.6, () => { _state='showing'; _playSequence(ctx) })`.
- Vid `MAX_LEN`: längden stannar men nya slumpsekvenser fortsätter genereras → **oändlig lek** utan tak.
- Valfritt: `ctx.progress.setCustom('rundor', (custom.rundor||0)+1)` för statistik.
- **Visningstempo skalar mjukt med längd:** kortare paus vid korta sekvenser, aldrig stressande. T.ex. lit-tid 450ms, gap 280ms (oförändrat — tempot ska förbli lugnt för 3–5-åringar).

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas med Pixi Graphics + systememoji (renderade som `Text`).

**Emoji (Text):** 🐸 🍎 💧 ⭐ (platt-ikoner), 🎶 (maskot, valfritt), 👀 (knapp-ikon), 🎵 (modulens `icon`).

**Pixi Graphics-former:**
- Bakgrund: `rect(0,0,1280,720).fill(COLORS.bg)`.
- 4 plattor: `roundRect(-140,-140,280,280,40).fill(<färg>,alpha).stroke({width:8,color:0xffffff})`.
- Maskot: `circle(0,0,70).fill(COLORS.cream).stroke(...)` + två ögon (`circle` 0x4a3526) + mun (`arc`/`roundRect`), alternativt enbart emoji 🎶.
- Gnistra/firande/puff via `lib/feedback.js` (rita inget eget partikelsystem).

**Färger:** `COLORS.green/red/blue/yellow` för plattor, `COLORS.purple` för knapp, `COLORS.bg/cream/ink/white` för bakgrund/maskot.

## Återanvänd dessa
- `lib/Button.js` — "Visa igen"-knappen (`new Button({label:'Visa igen',icon:'👀',width:300,height:76,color:COLORS.purple,services:ctx.services,sound:'tap',onTap:()=>{...}})`).
- `lib/feedback.js` — `sparkle`, `pop`, `wiggle`, `bigCelebration` (och ev. `puff`).
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`.
- `lib/swedish.js` — `randomFrom` (slumpa berömfras), ev. `shuffle`.
- `ctx.services.audio.sfx` — `'pling','pop','reveal','flip','correct','soft'`.
- `ctx.services.voice` — `say`, (header sköter `replayLast`).
- `ctx.progress` — `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.fxLayer` — gnistror/firande ovanpå.
- `gsap` — tänd-animationer, sekvens-timeline, `delayedCall`.

## Edge-cases & städning
- **`this._alive`-flagga:** sätt `true` i `init`, `false` i `destroy`. Kontrollera i ALLA fördröjda callbacks (`gsap.delayedCall`, timeline `onComplete`, idle-tick) — barnet kan lämna mitt i en uppspelning.
- **Dubbeltryck under upplösning:** `_onPadTap` returnerar direkt om `_state !== 'listening'`. Sätt `_state='showing'` direkt när uppspelning/firande startar, så snabba upprepade tryck ignoreras. Inaktivera "Visa igen"-knappen (`eventMode='none'`, alpha 0.5) under `'showing'`.
- **Sekvens-timeline:** håll en referens (`this._seqTl = gsap.timeline()`); döda den i `destroy` och innan en ny uppspelning startar (`this._seqTl?.kill()`).
- **Idle-timer:** räkna upp `this._idle += ticker.deltaMS/1000` i tick-callback endast när `_state==='listening'`; nollställ vid varje tryck och vid statusbyte.
- **destroy(ctx):**
  ```js
  this._alive = false
  ctx.ticker.remove(this._tick)
  this._seqTl?.kill()
  gsap.killTweensOf(this._root)
  this._pads?.forEach(p => gsap.killTweensOf(p.scale))
  this._root?.destroy({ children: true })
  ```
- **Inga nätanrop, ingen localStorage direkt** — endast `ctx.progress`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/harma-melodin/index.js` med default-export enligt GameModule-kontraktet (kopiera strukturen från `src/games/vandkort/index.js` som mall — samma state-maskin-mönster passar).
2. Importera: `import { Container, Graphics, Text } from 'pixi.js'`, `import { gsap } from 'gsap'`, `import { sparkle, pop, wiggle, bigCelebration } from '../../lib/feedback.js'`, `import { COLORS, FONT, PRAISE } from '../../lib/theme.js'`, `import { randomFrom } from '../../lib/swedish.js'`, `import { Button } from '../../lib/Button.js'`.
3. Definiera konstanter på modulnivå: `PAD_DEFS` (färg, mitt-koordinat, ikon-emoji för de 4 plattorna), `PAD_SFX = ['pling','pop','reveal','flip']`, `START_LEN=2`, `MAX_LEN=6`, `LIT_MS=450`, `GAP_MS=280`.
4. `init(ctx)`: sätt `this._alive=true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`; rita bakgrund; bygg de 4 plattorna (`_makePad`) och lägg i `this._pads`; bygg maskot; bygg "Visa igen"-Button; läs `this._len` från `ctx.progress`; generera `this._sequence`; sätt `this._state='showing'`, `this._step=0`, `this._idle=0`; lägg till tick-callback (`this._tick = (t)=>this._update(ctx,t); ctx.ticker.add(this._tick)`).
5. `_playSequence(ctx)`: bygg `this._seqTl = gsap.timeline()` som för varje index i `this._sequence` tänder plattan (`_lightPad`) och spelar tonen, åtskilt av `GAP_MS`. I timelinens `onComplete`: om `this._alive`, sätt `this._state='listening'`, `this._step=0`, `this._idle=0`, aktivera knappen, `voice.say('Din tur!')`, maskot ler.
6. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`, sedan `gsap.delayedCall(0.8, ()=>{ if(this._alive) this._playSequence(ctx) })`.
7. `_onPadTap(ctx, i)`: guard `_alive` + `_state==='listening'`; jämför mot `_sequence[_step]`; korrekt → `_lightPad`, `sparkle`, `_step++`, kolla klar; fel → `_onWrong`.
8. `_onRoundComplete(ctx)`: sätt `_state='showing'`; `audio.sfx('correct')`; `pop(maskot)`; `voice.say(randomFrom(PRAISE))`; `bigCelebration(ctx.fxLayer,{width:ctx.width,height:ctx.height})`; `ctx.progress.complete()`; väx `_len`, `setLevel`, ny sekvens; `gsap.delayedCall(1.6, ()=>{ if(this._alive) this._playSequence(ctx) })`.
9. `_onWrong(ctx, i)`: `audio.sfx('soft')`; `wiggle` på fel + rätt platta; `voice.say('Nästan! Titta igen.')`; `_state='showing'`; `gsap.delayedCall(1.0,()=>{ if(this._alive){ this._step=0; this._playSequence(ctx) }})`.
10. `_update(ctx,t)`: guard `_alive`; om `_state==='listening'` öka `_idle`; vid `>6s` nollställ, säg idle-fras och tänd förväntad platta som hint.
11. `destroy(ctx)`: enligt städlistan ovan.
12. Registrera i `src/games/registry.js`: `import harmaMelodin from './harma-melodin/index.js'` och lägg `harmaMelodin` i `GAMES`-arrayen.
13. `npm run dev`, öppna biblioteket, spela: verifiera uppspelning, härmning, firande vid rätt, mjuk respons vid fel, "Visa igen", hem-knapp, och att `highestLevel` finns kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderas i GameHost **utan konsolfel** (ingen Pixi/JS-error i `browser_console_messages`).
- Canvas finns och fyra plattor renderas; bakgrund täcker hela ytan.
- Vid mount spelas en sekvens upp (plattorna animeras) och växlar därefter till lyssnar-läge (tryck registreras).
- **Tap på rätt platta i ordning** ger ljud/ljus och flyttar fram steget; att fullfölja hela sekvensen utlöser **firande** (bigCelebration syns i fxLayer) och `ctx.progress.complete()` anropas (stjärna/klistermärke).
- **Tap på fel platta** ger en **mjuk, lekfull respons** (wiggle + 'soft'-ljud, idle-/felfras) och leder till att sekvensen visas om — ALDRIG buzzer, rött kryss eller "game over".
- Tryck på plattorna under uppspelning (`_state==='showing'`) ignoreras (inget dubbeltryck-fel).
- "Visa igen"-knappen spelar upp sekvensen på nytt utan att påverka progress.
- Tomt tryck på bakgrunden/maskoten ger neutral/positiv respons, aldrig fel.
- Efter en lyckad runda **växer sekvenslängden** (upp till MAX_LEN) och en ny runda startar automatiskt (oändlig lek).
- `progress` persisterar: efter en lyckad runda och sidladdning är `highestLevel` >= tidigare (verifiera via localStorage-nyckel `pwagames.save.v1`).
- Efter `destroy` (lämna spelet) finns inga kvarvarande tweens/ticker-callbacks som loggar fel (byt spel och tillbaka utan konsolfel).
