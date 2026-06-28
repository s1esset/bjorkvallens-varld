# Rulla Bollen Hem (`rulla-bollen-hem`)
> Barnet drar och släpper en boll så den rullar genom enkla hinder till sitt mål — bollen kommer alltid hem och firas med jubel, så känslan är ren triumf utan risk att misslyckas.

## Metadata
| Fält | Värde |
|---|---|
| id | `rulla-bollen-hem` |
| titleSv | Rulla Bollen Hem |
| icon | ⚽ |
| category | fysik |
| input | drag |
| ageRange | [3, 5] |
| bundle | `rulla-bollen-hem` |
| voiceIntro | Dra bollen till målet och släpp! |

## Mål & mekanik
Barnet ska få en boll att rulla in i ett mål (en målbur 🥅 / glad gubbe 🏠) på andra sidan banan.

Kärnloop:
1. En boll (⚽) ligger till vänster på en "gräsplan". Ett mål står till höger.
2. Barnet drar bollen i valfri riktning och **släpper**. Vid släpp får bollen en hastighet baserad på dragvektorn (drag = "sikta och knuffa"). Bollen rullar med lätt friktion och studsar mjukt mot kanter och hinder.
3. Når bollen målzonen: jubel, ljud, bollen "går in", och rundan räknas som klar.
4. **Bollen kan aldrig misslyckas.** Om bollen stannar utan att nå målet (för svag knuff eller fastnar) startar en mjuk "hjälp-puff": efter ~2,5s stillastående rullar bollen själv en bit mot målet, och efter ytterligare en stillastående period (eller 3 misslyckade knuffar) glider den hela vägen hem av sig själv med jubel. Resultatet: alltid framgång.

En runda "blir klar" när bollen når målzonen → `ctx.progress.complete()` (delat firande + klistermärke) → ny bana laddas efter ~1,5s.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna sådana. Håll allt spelinnehåll under y≈90.

- **Gräsplan / bakgrund**: heltäckande `Graphics` rektangel 0,0 → 1280,720, fyll grön `0x7ec850`. Ovanpå en ljusare gräs-remsa och en mjuk markskugga längst ner. Eventmode `none`.
- **Banram (väggar)**: en spelyta-rektangel med rundade hörn, x:60, y:120, bredd:1160, höjd:560 (alltså innerväggar vid vänster=60, höger=1220, topp=120, botten=680). Rita som `roundRect(60,120,1160,560,32).fill(0x8fd65e).stroke({width:10,color:0x5fa83c})`. Innerväggarna är studsväggar för bollens fysik.
- **Boll** (⚽): startposition x:180, y:400 (vänster mitt). Radie 56 (hit-halo via osynlig hitArea-cirkel r=80). Container med en vit cirkelskugga + emoji-Text fontSize 96, anchor 0.5.
- **Mål** (🥅): position x:1090, y:400 (höger mitt). Målzon = cirkel radie 110 runt målet. Rita en "nät"-ruta `roundRect` 150×170 i halvtransparent vit `0xffffff alpha 0.5` med emoji 🥅 (fontSize 120) ovanpå. En subtil glödring (cirkel r=110, stroke gul `0xffd84a` alpha 0.5) markerar målzonen.
- **Hinder** (nivåberoende, 0–3 st): rundade klossar (`roundRect`, brun `0xb5793a`, stroke `0x8a5a28`) storlek ~120×120, placerade mitt på banan. Varje hinder är en studskropp. Exempelpositioner nivå-beroende (se Progression).
- **Riktningshint**: när bollen ligger stilla och barnet håller fingret nere och drar, rita en streckad/prickad pil (liten serie cirklar `0xffffff alpha 0.7`) från boll mot finger som visar knuff-riktning. Tas bort vid släpp.

Marginaler: minst 24px mellan hinder och väggar; målzon och startposition har fri sikt så en rak knuff alltid är möjlig på nivå 0.

## Interaktion
Bara **drag** (med tap-tap-fallback), via `lib/DragController.js`.

- Bollen registreras som drag-item: `this._drag.addItem(ballView, {}, hooks)`.
- Bollen är också "siktet". I praktiken används DragControllerns drag för att fånga gest-start/-slut, men släppet ska ge en **knuff** snarare än en snäpp. Enklaste robusta lösning: lyssna själv på bollens egna pointer-events ovanpå (eller använd DragController för tap-tap mot målet) — se nedan.

Rekommenderad implementation (drag = sikta-knuffa):
- Sätt `ball.eventMode = 'static'`, `ball.cursor = 'pointer'`, hitArea = `new Circle(0,0,80)`.
- `pointerdown` på bollen: spara startpunkt (i `_root`-koordinater via `_root.toLocal(e.global)`), sätt `this._aiming=true`, nollställ bollens hastighet, lyfta-skala 1.12, ljud `tap`.
- `globalpointermove` (registrerad på bollen vid down): uppdatera siktpilen från boll till finger.
- `pointerup` / `pointerupoutside`: beräkna dragvektor `dx = fingerNow.x - down.x`, `dy = ...`. Sätt bollens hastighet `vx = clamp(dx*0.18, ±28)`, `vy = clamp(dy*0.18, ±28)`. Liten gest (|drag|<14px) räknas som tap → tap-tap-fallback: markera bollen "vald" (puls) och nästa tap var som helst på banan skickar bollen mot den punkten med lagom fart. Ta bort siktpil, återställ skala, ljud `whoosh`.

Tap-tap-fallback (för de minsta, drag är svårt <4 år): första tap på bollen → bollen pulserar (vald). Andra tap på banan/målet → bollen rullar mot den tappade punkten. Ett tap direkt på målet skickar bollen rakt mot målet.

Hit-areor: boll r=80 (osynlig halo runt visuell r=56). Målzon r=110. Inga små klickytor.

Fysik (i ticker, läs `ctx.ticker.deltaMS`, normalisera `const dt = ticker.deltaMS/16.67`):
- `ball.x += vx*dt; ball.y += vy*dt`.
- Friktion: `vx *= 0.985; vy *= 0.985` per frame (mjuk inbromsning).
- Väggstuds: om boll överskrider innervägg (60+r, 1220−r, 120+r, 680−r), klampa position och invertera komponent ×0.7 (mjuk studs), ljud `pop` vid studs (throttlat).
- Hinderstuds: cirkel-vs-rektangel grov kollision; vid träff knuffa boll ut och spegla hastighet ×0.6, ljud `soft`.
- Rotation: rotera boll-emoji proportionellt mot hastighet för rull-känsla.

## Återkoppling & belöning
Per gest, <100ms:
- Bollen tas tag i: `audio.sfx('tap')` + skala-pop.
- Släpp/knuff: `audio.sfx('whoosh')` + siktpil försvinner.
- Väggstuds: `audio.sfx('pop')` (max var ~180ms). Hinderstuds: `audio.sfx('soft')`.
- Bollen når målet: `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`, `voice.say('Mål! Du klarade det!')`, bollen skalar in i målet, `feedback.bigCelebration(ctx.fxLayer, {width, height})` + `puff(ctx.fxLayer, mål.x, mål.y, {count:14, color:0xffd84a})`.

Fel/svag knuff finns **inte som straff**. Om bollen stannar utan mål:
- Efter 2,5s stilla: `voice.say('Nästan! Jag hjälper till.')` + bollen får en mjuk auto-knuff mot målet (`soft`-ljud, liten sparkle).
- Om fortfarande inte i mål efter ytterligare auto-knuff eller 3 stillastående perioder: bollen glider hela vägen hem (gsap till målpunkt) och rundan firas ändå. Ingen buzzer, inget rött, ingen "förlust".

`ctx.progress.complete()` anropas EN gång när bollen registreras i målzonen (oavsett om det var barnets knuff eller auto-hjälpen). Direkt efter: `ctx.progress.setLevel(this._level + 1)`.

Idle-recue: om ingen interaktion på ~6s medan bollen ligger stilla → `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + boll pulserar en gång.

Använda sfx: `tap, whoosh, pop, soft, correct, celebrate`. Voice: voiceIntro samt 'Mål! Du klarade det!', 'Nästan! Jag hjälper till.'.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init; styr antal/placering av hinder.
- Banor (cykliska, oändlig lek):
  - **Nivå 0–1**: 0 hinder, rak väg boll→mål. Lär ut knuffen.
  - **Nivå 2–3**: 1 hinder mitt på banan (x:640, y:400, 120×120).
  - **Nivå 4–5**: 2 hinder (x:520,y:300 och x:780,y:500), målet längre upp (x:1090, y:240).
  - **Nivå 6+**: 3 hinder i lätt slalom + lite mindre målzon (r=95, aldrig under 90). Därefter mönstren upprepas/varieras (modulo med slumpad jitter ±30px via `randomFrom`/Math.random).
- Efter `complete()`: `setLevel(this._level+1)`, vänta ~1,5s, `_loadLevel(ctx, this._level)` återanvänder samma noder (flytta boll till start, ny hinderlayout). Oändligt.
- `setCustom('rounds', n)` kan räkna totalt antal hemrullningar (frivilligt). Inga sjunkande värden, ingen poäng synlig.

## Tillgångar (programmatiskt)
Endast emoji (renderas som `Text`) + Pixi `Graphics`. Inga externa filer.
- Emoji: ⚽ (boll), 🥅 (mål; alternativt 🏠 eller 🐶 som "kompis som väntar"), valfri 🌟 vid firande.
- Graphics: grön bakgrund (rect), banram med rundade hörn + stroke (studsväggar), målets nät-ruta (roundRect, halvtransparent) + gul målzon-glödring (circle stroke), hinder-klossar (roundRect brun + stroke), bollens vita skuggcirkel, siktpil (serie små vita cirklar), markskugga under boll (mörk ellips/cirkel alpha).
- Firande via `feedback.bigCelebration` + `puff`/`sparkle` (konfetti i `ctx.fxLayer`).

## Återanvänd dessa
- `lib/DragController.js` — för tap-tap-fallback och drag-gestens fångst (eller egen pointer-logik ovanpå med samma snäll-principer).
- `lib/feedback.js` — `bigCelebration`, `puff`, `sparkle`, `pop`, `wiggle`.
- `lib/theme.js` — `COLORS`, `FONT`, `DESIGN_W`, `DESIGN_H`, `PRAISE`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (för hinderjitter/banval).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `complete`, `setCustom`.
- `ctx.ticker` (fysikloop, läs `deltaMS`), `ctx.fxLayer` (firande), `gsap` (tweens/auto-hjälp).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`setTimeout`/auto-knuff-callbacks samt ticker-loopen kollar `if (!this._alive) return`.
- **Dubbeltryck/"resolving"-skydd**: när bollen är i målzonen, sätt `this._resolving = true` → ignorera nya pointerdown på bollen och stäng av fysik-knuffar tills nästa bana laddas. Förhindrar att `complete()` triggas flera gånger.
- Begränsa max hastighet (clamp) så bollen aldrig "skjuts ut" ur banan i ett frame; gör väggklamp efter positionsuppdatering varje frame.
- Throttla studsljud så snabba multistudsar inte spammar audio.
- Avregistrera pekarlyssnare på bollen i destroy; `this._drag?.destroy()`.
- `destroy()`: `this._alive=false; ctx.ticker.remove(this._tick); gsap.killTweensOf(this._ball); gsap.killTweensOf(this._root); this._drag?.destroy(); this._root?.destroy({children:true})`. Spara referens till tick-funktionen (`this._tick`) för att kunna ta bort den.
- Auto-hjälp-timer nollställs varje gång barnet rör bollen (förhindra att den "hjälper" mitt under en knuff).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/rulla-bollen-hem/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `DragController`, feedback-hjälpare, `COLORS, FONT` från theme, `randomFrom` från swedish.
2. `export default { id:'rulla-bollen-hem', titleSv:'Rulla Bollen Hem', icon:'⚽', category:'fysik', input:'drag', ageRange:[3,5], bundle:'rulla-bollen-hem', voiceIntro:'Dra bollen till målet och släpp!', ... }`.
3. `init(ctx)`: sätt `_alive=true`, skapa `_root = new Container()` och `ctx.stage.addChild(_root)`. Bygg bakgrund + banram (studsväggar). Skapa `_drag = new DragController({space:_root, services:ctx.services})` (för tap-tap). Läs `_level` från `ctx.progress.get().highestLevel`. Anropa `_loadLevel(ctx, _level)`.
4. `_loadLevel(ctx, level)`: rensa ev. gamla hinder, bygg mål + målzon, bygg hinder enligt nivå (jitter), placera bollen på start, nollställ `vx,vy=0`, `_resolving=false`, starta auto-hjälp-timer.
5. Bygg `_makeBall()` (container: skuggcirkel + ⚽ Text, hitArea Circle r=80), registrera pointerdown/move/up för sikta-knuffa samt tap-tap-fallback via DragController/egen logik.
6. Lägg till fysik i ticker: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: integrera position, friktion, väggstuds, hinderstuds, rotation, målzon-koll, idle/auto-hjälp-timers. Allt bakom `if(!this._alive||this._resolving) return` där relevant.
7. Målträff → `_resolving=true`, ljud+voice, animera boll in i mål, `bigCelebration(ctx.fxLayer,...)`, `ctx.progress.setLevel(_level+1)`, `ctx.progress.complete()`, `gsap.delayedCall(1.5, ()=> _alive && _loadLevel(ctx, ++this._level))`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: enligt städnings-checklistan ovan.
10. Registrera i `src/games/registry.js`: `import rullaBollenHem from './rulla-bollen-hem/index.js'` och lägg till i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera knuff, väggstuds, mål-firande, auto-hjälp, tap-tap, hem-knapp, röst-repris och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Rulla Bollen Hem"). Canvas finns; inga uncaught errors/warnings i `browser_console_messages`.
- Bollen reagerar på drag: en `browser_drag` (eller pointer down→move→up via `browser_run_code_unsafe`) på bollens position ger rörelse — bollens x/y förändras efter släpp (verifiera via exponerad teststate eller pixel/snapshot-skillnad).
- Tap-tap-fallback: tap på boll, sedan tap nära målet → bollen rör sig mot målet.
- Korrekt resultat: när bollen når målzonen triggas firande (konfetti i fxLayer) och `progress.complete()` anropas exakt en gång (ingen dubbeltrigg vid snabba upprepade tryck under "resolving").
- Mjuk respons på svag/utebliven knuff: en mycket kort drag leder ALDRIG till felljud/buzzer; efter idle-timern rullar bollen hem av sig själv och rundan firas ändå.
- Ingen fail-state: inga "game over"-element; bollen lämnar aldrig banan (positionen håller sig inom innerväggarna efter studsar).
- Progress sparas: efter en avklarad runda är `highestLevel` ökat; värdet kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Städning: vid retur till biblioteket (hem-knapp) tas ticker-loopen bort och inga tweens/timeouts fortsätter logga eller kasta fel.
