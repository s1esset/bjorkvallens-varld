# Följ Spåret (`folj-sparet`)
> Lysande fotspår tänds ett i taget i en bestämd ordning och barnet trycker på dem i samma följd för att hjälpa en liten figur hela vägen hem — ett mjukt, repeterbart sekvensminne som 2-5-åringar älskar eftersom varje rätt tryck "tänder" vägen och figuren tar ett glatt skutt framåt.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|----|---------|------|----------|-------|----------|--------|------------|
| `folj-sparet` | Följ Spåret | 👣 | minne | tap | [3,5] | `folj-sparet` | `Titta var fötterna lyser! Tryck på dem i samma ordning för att hjälpa kaninen hem.` |

## Mål & mekanik
- En rad/slinga med fotspår (👣) ligger utspridda på en äng. En figur (🐰 kaninen) står vid startpunkten och vill hem till sitt hus (🏠).
- **Demofas:** Spelet "spelar upp" sekvensen genom att tända fotspåren ett i taget i ordning (varje tänds = ljust + studs + ton). Barnet tittar.
- **Härmfas:** Barnet trycker på fotspåren i exakt samma ordning som de tändes.
  - Rätt nästa fotspår i följden -> det lyser upp, ger ett pling, och kaninen hoppar fram till det fotspåret.
  - Tryck på fel fotspår (eller ett redan tänt) -> mjukt vingel + 'soft'-ljud, INGEN nollställning, ingen bestraffning. Barnet kan bara trycka igen.
- En **runda blir klar** när hela sekvensen tryckts i rätt ordning: kaninen når 🏠, firande spelas (`ctx.progress.complete()`), och en ny längre/svårare runda byggs.
- Det finns ingen timer, inget tappande av framsteg, ingen "game over". Spelet är oändligt: efter klart byggs ny runda.

## Skärm-layout (1280x720)
GameHost ritar header (hem-knapp + högtalare/repetera). Rita INTE egna sådana. Allt nedan i designkoordinater.

- **Spelyta (äng):** ett `Graphics`-bakgrundsfält (mjuk grön) från y=120 till y=720 ritat i `_root` botten (valfritt; bg-lagret finns redan, så en lätt halvtransparent matta räcker). Lekområde: x ∈ [120, 1160], y ∈ [200, 620].
- **Startpunkt (kanin):** vänster, vid (140, 410). Kaninen 🐰 som `Text` fontSize 86.
- **Mål (hus):** höger, vid (1150, 410). Huset 🏠 som `Text` fontSize 96.
- **Fotspår:** N stycken (se nivåer) placerade längs en mjuk bana mellan kanin och hus. Bana genereras som punkter jämnt fördelade i x från 280 till 1010, med y som varierar i en mjuk våg (t.ex. `y = 410 + sin(i)*120`, klampat till [220, 600]). Varje fotspår är en `Container` med:
  - rund "platta" `Graphics().circle(0,0,58)` (träffyta-bas, radie 58 => diameter 116 ≥ 96px).
  - emoji 👣 som `Text` fontSize 64, anchor 0.5.
  - osynlig hit-halo: `hitArea = new Circle(0,0,72)` för extra marginal.
- **Repetera-spår-knapp (i spelytan, valfritt utöver header-högtalaren):** en `Button` "Visa igen" 🔁 längst ned till vänster vid (170, 660), width 240, height 84, color COLORS.blue. Spelar upp demofasen igen. (Header-högtalaren repeterar rösten; denna knapp repeterar den visuella sekvensen.)
- Marginaler: minst 24px mellan fotspår; banpunkter genereras med minst 120px centeravstånd så träffytor aldrig överlappar.

## Interaktion
- **Input = tap.** Inga drag, inga dubbeltryck, inga långtryck.
- Varje fotspårs `Container`: `eventMode = 'static'`, `cursor = 'pointer'`, `hitArea = Circle(0,0,72)`, lyssnar på `'pointertap'`.
- Under **demofasen** är alla fotspår `eventMode = 'none'` (inga tryck registreras medan sekvensen visas). Sätts till `'static'` när härmfasen börjar.
- Under **upplösning** (kaninen hoppar / firande) sätts en `this._busy = true`-flagga; `pointertap`-handlern returnerar tidigt om `this._busy` — förhindrar dubbeltryck-buggar.
- Tap-logik: håll `this._expected` = index i sekvensen barnet ska trycka härnäst. Vid tap på ett fotspår med sekvensposition `p`:
  - om `p === sekvens[this._expected]` -> rätt (se nedan), `this._expected++`.
  - annars -> fel/mjukt vingel.
- Tap-tap-fallback behövs ej (rent tap-spel, ingen drag).

## Återkoppling & belöning
Per-tryck-feedback alltid < 100ms (ljud + bild i samma handler):
- **Demofas tänd:** `audio.sfx('pling')` + fotspåret skala-studs (`feedback.pop` eller gsap scale 1->1.3->1) + `Graphics`-plattan byter till ljus färg (COLORS.yellow) kort. Tonhöjd kan varieras via olika sfx ('pling' räcker i grundbygget).
- **Rätt tryck:** `audio.sfx('correct')` + `feedback.pop(footprint)` + `feedback.sparkle(ctx.fxLayer, x, y)`. Fotspåret stannar tänt (COLORS.green-glöd). Kaninen tween:as till det fotspårets position (`gsap.to(rabbit, {x,y, duration:0.35, ease:'power2.out'})`) med ett litet hopp (y dippar). Valfri röst för första par tryck: `voice.say('Ja!')` sparsamt (inte varje tryck, för att undvika tjat).
- **Fel tryck (fel fotspår eller redan tänt):** `audio.sfx('soft')` + `feedback.wiggle(footprint)`. Ingen nollställning, ingen röd markering, inget ljud som låter negativt. Valfritt mjukt röstcue efter 2 fel i rad: `voice.say('Titta noga var fötterna lyser. Tryck på den som lyser nu.')`.
- **Runda klar:** kaninen hoppar in i 🏠 (skala ner + puff), `audio.sfx('celebrate')`, `feedback.bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, `voice.say(randomFrom(PRAISE))` (t.ex. "Hurra! Kaninen kom hem!"), och `ctx.progress.complete()` (delat firande + stjärna + klistermärke). Efter ~1.4s `gsap.delayedCall` byggs nästa runda.
- **Idle ~6s** (ingen tap under härmfasen): repetera röst `voice.say('Tryck på fötterna i samma ordning som de lyste.')` och spela upp demofasen igen automatiskt (eller bara pulsa nästa förväntade fotspår med en mjuk skala-yoyo så barnet får en ledtråd, utan att avslöja för hårt).

sfx-namn använda: `pling`, `correct`, `soft`, `celebrate` (+ ev. `pop`, `whoosh` för kaninhopp).

## Progression & nivåer
- `this._level = clampLevel(ctx.progress.get().highestLevel | 0)`.
- Nivåtabell styr sekvenslängd och banform:
  ```
  LEVELS = [
    { steps: 3 },   // nivå 0 (start för 3-åring)
    { steps: 4 },
    { steps: 5 },
    { steps: 6 },
    { steps: 7 },   // nivå 4, för 5-åring
  ]
  ```
  - **`steps`** = antal fotspår OCH längden på sekvensen (alla fotspår ingår i sekvensen, i banordning, vilket gör det visuellt logiskt: vägen hem). För mer ren minnesutmaning på högre nivåer kan sekvensordningen göras icke-linjär (shuffle av ordningen i vilken de tänds) från nivå 3 — men placeringen följer alltid banan kanin->hus.
- Vid klarad runda: `this._level = clampLevel(this._level + 1)`, `ctx.progress.setLevel(this._level)`, `ctx.progress.complete()`, sedan ny runda. På sista nivån stannar `steps` på max och spelet fortsätter oändligt med nya slumpade banor/vågformer.
- `ctx.progress.setCustom('rundor', (custom?.rundor||0)+1)` för att räkna rundor (valfritt, för statistik).
- Demohastighet kan öka mjukt med nivå (kortare paus mellan tändningar), men aldrig så snabbt att det stressar; håll minst 450ms per steg.

## Tillgångar (programmatiskt)
INGA externa filer. Endast emoji (`Text`) + Pixi `Graphics`.
- Emoji: 👣 (fotspår), 🐰 (kanin/figur), 🏠 (mål/hus). Valfri variation: figuren kan slumpas bland 🐰🐶🐱🦊 per runda via `randomFrom`.
- Graphics:
  - Ängmatta: `roundRect`/`rect` fylld med ljusgrön (COLORS.green alpha 0.18) eller lämna bg-lagret.
  - Fotspårsplatta: `circle(0,0,58).fill(COLORS.cream).stroke({width:5,color:COLORS.green})`; tänd = `.fill(COLORS.yellow)`; klar = `.fill(COLORS.green, alpha 0.4)`.
  - Bana-ledtråd (valfritt): en svagt prickad linje mellan fotspåren ritad med små `circle`-prickar (eventMode='none').
- Text-stil: `{ fontFamily: FONT.body, fontSize: <as above> }`, `anchor.set(0.5)`.

## Återanvänd dessa
- `ctx.services.audio.sfx(...)` och `ctx.services.voice.say/replayLast`.
- `ctx.progress` (get/setLevel/setCustom/complete) — ALDRIG localStorage direkt.
- `ctx.fxLayer` för `sparkle` / `bigCelebration`.
- `lib/feedback.js`: `pop`, `wiggle`, `sparkle`, `bigCelebration`, ev. `puff`.
- `lib/Button.js`: "Visa igen"-knappen (`new Button({ label:'Visa igen', icon:'🔁', width:240, height:84, color:COLORS.blue, services:ctx.services, onTap:()=>this._playDemo(ctx) })`).
- `lib/theme.js`: COLORS, FONT, PRAISE.
- `lib/swedish.js`: `randomFrom`, `shuffle` (för icke-linjär sekvens på högre nivåer / figurval).
- `gsap` för tweens (kaninhopp, fotspårsstuds, demotiming via `gsap.delayedCall`/timeline).
- Pixi: `Container`, `Graphics`, `Text`, `Circle` (för hitArea).
- INGEN egen DragController (rent tap-spel).

## Edge-cases & städning
- `this._alive = true` i `init`; sätt `false` FÖRST i `destroy`. Alla `gsap.delayedCall`/`onComplete`-callbacks och tickern ska börja med `if (!this._alive) return`.
- Förhindra dubbeltryck under upplösning/firande och under demofas via `this._busy` + `eventMode='none'`.
- Demofasen körs som en `gsap.timeline` ELLER kedja av `gsap.delayedCall` lagrad i `this._demoCalls`/`this._demoTl` så den kan dödas i `destroy` och om barnet trycker "Visa igen" mitt i (avbryt pågående demo innan ny startas).
- Idle-timer hanteras i ticker (`this._idle += ticker.deltaMS/1000`), nollställs vid varje tap; sätt `this._tick` och `ctx.ticker.add(this._tick)` i init, `ctx.ticker.remove(this._tick)` i destroy.
- `destroy(ctx)`:
  ```
  this._alive = false
  ctx.ticker.remove(this._tick)
  this._demoTl?.kill(); this._demoCalls?.forEach(c=>c.kill())
  gsap.killTweensOf(this._rabbit)
  this._footprints?.forEach(f => gsap.killTweensOf(f.scale))
  gsap.killTweensOf(this._root)
  this._root?.destroy({ children: true })
  ```
- Om barnet avslutar (`exitToLibrary`) mitt i firande: `_alive`-flaggan stoppar `delayedCall` som annars bygger ny runda.
- `_build`: döda gamla tweens/footprint-bobbar och `removeChildren().forEach(o=>o.destroy({children:true}))` innan ny runda byggs, nollställ `_expected=0`, `_busy=false`, `_idle=0`, `_wrongStreak=0`.
- Banpunktsgenerering måste garantera ≥120px centeravstånd och hålla alla fotspår inom [120,1160]×[220,600] så de aldrig hamnar under headern eller utanför skärm.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/folj-sparet/index.js`. Default-exportera GameModule-objektet med metadata enligt tabellen ovan.
2. Importera: `import { Container, Graphics, Text, Circle } from 'pixi.js'`, `import { gsap } from 'gsap'`, `import { pop, wiggle, sparkle, bigCelebration } from '../../lib/feedback.js'`, `import { COLORS, FONT, PRAISE } from '../../lib/theme.js'`, `import { randomFrom, shuffle } from '../../lib/swedish.js'`, `import { Button } from '../../lib/Button.js'`.
3. Definiera `const LEVELS = [...]` och `function clampLevel(l){ return Math.max(0, Math.min(LEVELS.length-1, l)) }`.
4. `init(ctx)`: sätt `this._alive=true`, skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Läs `this._level = clampLevel(ctx.progress.get().highestLevel|0)`. Skapa kanin (`this._rabbit`), hus, ev. ängmatta. Skapa "Visa igen"-knappen. Anropa `this._build(ctx)`. Skapa `this._tick = (t)=>this._update(ctx,t)` och `ctx.ticker.add(this._tick)`.
5. `_build(ctx)`: städa gammalt fält, generera banpunkter för `LEVELS[this._level].steps` fotspår, skapa fotspårs-containrar med hitArea + `pointertap`-handler (`()=>this._onTap(ctx, footprint)`), placera kaninen vid start. Bygg `this._sequence` (linjär för låga nivåer, `shuffle`-ordning av tändning för höga). Sätt `_expected=0`, `_busy=false`. Sätt fotspår `eventMode='none'`, kör `this._playDemo(ctx)`.
6. `_playDemo(ctx)`: avbryt ev. tidigare demo, `this._busy=true`, alla fotspår `eventMode='none'`. Bygg en `gsap.timeline()` (`this._demoTl`) som för varje steg i sekvensordning tänder fotspåret (färgskifte + `pop` + `audio.sfx('pling')`) med paus mellan. På `onComplete`: släck ledtrådsfärgerna, sätt fotspår `eventMode='static'`, `this._busy=false`, `this._expected=0`, säg ev. en kort röstinstruktion.
7. `_onTap(ctx, fp)`: `if(!this._alive||this._busy) return`. Nollställ `_idle`. Om `fp.seqPos === this._sequence[this._expected]` -> rätt: `audio.sfx('correct')`, `pop(fp)`, `sparkle(ctx.fxLayer,...)`, tween kanin till fp, tänd fp grönt, `this._expected++`; om `_expected >= steps` -> `this._win(ctx)`. Annars -> fel: `audio.sfx('soft')`, `wiggle(fp)`, öka `_wrongStreak`, ev. röstcue.
8. `_win(ctx)`: `this._busy=true`, kanin in i hus, `audio.sfx('celebrate')`, `bigCelebration(ctx.fxLayer,{width:ctx.width,height:ctx.height})`, `voice.say('Hurra! '+randomFrom(PRAISE))`, `this._level=clampLevel(this._level+1)`, `ctx.progress.setLevel(this._level)`, `ctx.progress.complete()`, `ctx.progress.setCustom('rundor',(ctx.progress.get().custom?.rundor||0)+1)`, `gsap.delayedCall(1.4, ()=>{ if(this._alive) this._build(ctx) })`.
9. `_update(ctx,ticker)`: `if(!this._alive||this._busy) return`; `this._idle += ticker.deltaMS/1000`; om `_idle>6` -> nollställ, `voice.say(...)` och pulsa nästa förväntade fotspår (eller spela demo igen).
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
11. `destroy(ctx)`: enligt städ-blocket ovan.
12. Registrera i `src/games/registry.js`: `import foljSparet from './folj-sparet/index.js'` och lägg `foljSparet` i `GAMES`-arrayen.
13. `npm run dev`, öppna biblioteket, spela: verifiera demofas tänds, rätt ordning hjälper kaninen hem, fel ger mjukt vingel, "Visa igen" + header-högtalare fungerar, firande + klistermärke vid klart, och att highestLevel ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras via biblioteket utan konsolfel (inga uncaught errors / Pixi-varningar) och canvas renderas.
- Efter mount syns N fotspår (matchande `LEVELS[0].steps`), en kanin och ett hus; demofasen tänder fotspår i ordning (verifierbart via exponerat teststate eller genom att vänta tills `eventMode` blir interaktivt).
- Tap på rätt nästa fotspår i sekvensen: kaninen flyttar sig (x/y ändras) och `_expected` ökar (spela `correct`-ljud). Simulera klick på fotspårens scenkoordinater.
- Tap på fel fotspår: ingen progress-förändring (`_expected` oförändrat), ett mjukt vingel sker, INGET "game over", spelet förblir spelbart.
- Fullföljd sekvens i rätt ordning -> firande triggas och `ctx.progress.complete()` anropas (verifiera via stub/spy eller via att sticker/stjärna registreras), ny runda byggs efteråt.
- Progress sparas: efter klarad runda ökar `highestLevel` i localStorage (`pwagames.save.v1`, aktiv profils `games['folj-sparet'].highestLevel`) och kvarstår efter reload.
- "Visa igen"-knappen och header-repetera kan tryckas utan fel och spelar upp demo/röst igen.
- Inga förbjudna gester krävs (endast enkla tap fungerar); snabba dubbeltryck under demo/firande orsakar inga fel eller dubbel-progress (skyddat av `_busy`).
- Efter `exitToLibrary` mitt i en runda/firande sker inga fel (inga callbacks kör efter destroy; `_alive`-skydd verifierat genom att inga tweens/timeouts manipulerar förstörda objekt).