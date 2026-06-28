# Klä efter Vädret (`kla-efter-vadret`)
> En vänlig figur står ute och barnet drar (eller tap-tap:ar) rätt kläder på den efter vädret — sol, regn eller snö. 3–5-åringar älskar att "ta hand om" figuren och se den le när den är lagom klädd; ren omsorgs- och kopplingslek utan rätt/fel-stress.

## Metadata
| fält | värde |
|---|---|
| id | `kla-efter-vadret` |
| titleSv | Klä efter Vädret |
| icon | ☔ |
| category | pedagogiskt |
| input | mixed |
| ageRange | [3, 5] |
| bundle | `kla-efter-vadret` |
| voiceIntro | Det är {väder} idag. Klä på {namn} så hen blir lagom!  (t.ex. "Det är regn idag. Klä på Bobo så hen blir lagom!") |

## Mål & mekanik
- En **figur** (kropp/maskot) står i mitten. Uppe visas dagens **väder** (en stor vädersymbol + mjuk bakgrundston). Längst ner ligger 4–6 **plagg** på en "garderobshylla".
- **Kärnloop:** rösten säger vilket väder det är. Barnet drar plagg till figurens **rätt kroppszon** (huvud, överkropp, fötter). Plagg som **passar vädret** snäpper på plats, figuren ler/hoppar till och säger plaggets namn. Plagg som inte passar (t.ex. badbyxor i snö) ger en **mjuk vink** ("Brr, det är kallt!") och snäpper tillbaka till hyllan — aldrig en bestraffning.
- **Lyckad handling:** plagget fäster på kroppszonen, `correct`-ljud + glad röst, figuren får ett litet hopp/leende.
- **Runda klar:** när alla **obligatoriska zoner** för dagens väder är fyllda med passande plagg (t.ex. regn = huvud(regnhatt) + överkropp(regnjacka) + fötter(stövlar)), firar figuren stort: `complete()` (delat firande + klistermärke), rösten berömmer, och efter ~1,3 s startar nästa runda med **nytt väder**.

## Skärm-layout (1280x720)
GameHost ritar header (hem-knapp + repetera/högtalare) själv — rita INGA egna sådana.

- **Bakgrund:** heltäckande `Graphics`-rektangel `0,0 → 1280,720`, fylld med vädrets toningsfärg (sol = ljusgul 0xfff3c4, regn = ljusblå/grå 0xcfe3ef, snö = ljus iskall 0xeaf4fb). Byts mjukt vid nytt väder.
- **Vädersymbol (header-zon, undvik knapphörn):** centrerad upptill vid `x=640, y=96`, emoji-Text fontSize ~120. En liten rund "panel" bakom (Graphics circle r=80, vit alpha 0.5).
- **Figuren (klädnings-dummy):** centrerad vid `x=640, y=400`. Byggd av Pixi Graphics:
  - Huvud: circle `(640, 250) r=70`.
  - Kropp: roundRect centrerad `(640, 400)` bredd 180 höjd 220 radius 40.
  - Ben/fötter-zon nederst kring `y=540`.
  - Tre **kroppszoner (osynliga snäpp-mål)** definierade som Containers med world-position:
    - `huvud`  → `(640, 230)`
    - `overkropp` → `(640, 400)`
    - `fotter` → `(640, 560)`
  - Varje zon har en svag highlight-ring (Graphics circle r=70, alpha 0) som tonas upp när ett plagg snäpper dit.
- **Garderobshylla (plagg-källa):** en rad nedtill. Hylla = roundRect `x=140,y=620,bredd=1000,höjd=90,radius=24`, fyll 0xffffff alpha 0.6. Plaggen läggs ovanpå med centrum vid `y=600`.
- **Plagg-rutnät:** upp till 6 plagg jämnt fördelade. startX beräknas: `total = n*150 + (n-1)*40; startX = (1280 - total)/2 + 75; varje plagg x = startX + i*190, y = 600`. Varje plagg = Container med rund vit bricka (circle r=66, vit alpha 0.85, stroke 4 0xeadfca) + emoji-Text fontSize ~84.

## Interaktion
- **Drag (primär):** använd `DragController` (`new DragController({ space: this._root, services: ctx.services })`).
  - Varje plagg: `drag.addItem(plaggView, { slot:'huvud'|'overkropp'|'fotter', fits:bool, namn:'regnjacka' }, hooks)`.
  - Varje kroppszon: `drag.addTarget(zonView, (data) => data.slot === zon.slot && data.fits, { hitRadius: 130 })`. Zonen accepterar bara plagg som hör till **den zonen OCH passar vädret** → opassande plagg landar i `onWrong`/snäpper tillbaka automatiskt.
  - DragController sköter förstoring vid grepp, snäpp till zon, mjuk snäpp-tillbaka vid miss, och att draget överlever att fingret lämnar plagget.
- **Tap-tap-fallback (inbyggd i DragController):** tryck på ett plagg (det börjar pulsa + `tap`-ljud via `onSelect`), tryck sedan på en kroppszon → samma `_resolveDrop`. Gör zonerna stora med `hitRadius: 130` så även de minsta lyckas.
- **Hit-areor:** plagg-bricka effektiv radie ~66 px (visuellt) men hela Containern är `eventMode='static'`; zonernas snäpp-radie 130 px ger generös marginal (>96 px krav uppfyllt). Sätt dekorlager (bakgrund, hylla, vädersymbol) `eventMode='none'` + `interactiveChildren=false`.
- **Inga förbjudna gester:** endast tap + enkel drag. Ingen dubbeltryck/långtryck/pinch.

## Återkoppling & belöning
- **Per grepp/val (<100ms):** DragController spelar `tap` och pulsar plagget vid select; vid grepp förstoras plagget 1.12x direkt.
- **Korrekt (passar zon + väder):**
  - `ctx.services.audio.sfx('correct')` + `ctx.services.voice.say('<plaggnamn>!')` (t.ex. "Regnjacka!").
  - Plagget snäpper till zonen, `pop(plaggView)` och `feedback.sparkle(ctx.fxLayer, x, y)`; zonens highlight-ring tonas upp kort, figuren gör ett litet hopp (gsap y -8 → 0).
  - Plagget blir `eventMode='none'` (kan inte flyttas igen).
- **Fel/opassande (ALDRIG bestraffning):**
  - DragController spelar redan `soft`. I `onWrong`: `wiggle(rec.view)` + en mjuk vänlig röstvink beroende på fel: opassande väder → "Brr, det är kallt!" / "Oj, för varmt!"; fel zon men rätt väder → "Stövlarna på fötterna!". Plagget snäpper tillbaka till hyllan. Ingen röd markering, inget buzzer-ljud, inget tapp i poäng.
  - Tomt tryck på bakgrund/figur utan plagg valt: ignoreras lugnt (inget negativt).
- **Runda klar:** när alla obligatoriska zoner fyllda:
  - `ctx.services.voice.say(randomFrom(PRAISE))` + `ctx.services.audio.sfx('celebrate')`.
  - `feedback.bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })`.
  - `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.addStars(1)` (frivilligt), **`ctx.progress.complete()`**.
- **Idle ~6s:** om ingen interaktion, återupprepa instruktionen via `ctx.services.voice.say(...)` (samma fras som voiceIntro för aktuellt väder). Nollställs vid varje pointerdown.
- **SFX som används:** `tap`, `soft`, `correct`, `celebrate` (+ ev. `pling` vid zon-snäpp). **Röst:** voiceIntro per väder, plaggnamn, mjuka vinkar, PRAISE vid klart.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- **Väder-cykel:** sol → regn → snö → (slumpas därefter). Lagra senaste via `ctx.progress.setCustom('lastWeather', key)` så ny session inte upprepar samma direkt.
- **Svårighet växer mjukt med level:**
  - Level 0–1: 1 obligatorisk zon (t.ex. bara huvud/överkropp) + 3 plagg på hyllan (1 passande per zon, 1 distraktor).
  - Level 2–3: 2 obligatoriska zoner + 4 plagg (1 opassande väder-distraktor).
  - Level 4+: alla 3 zoner + 5–6 plagg med 2 distraktorer (fel väder + fel storlek/säsong).
- **Oändlig lek:** efter `complete()` och ~1,3 s → `_newRound(ctx)` rensar plagg/zoner och bygger nytt väder. Aldrig "game over"; barnet kan klä om hur länge som helst.

## Tillgångar (programmatiskt)
Endast emoji (renderas som `Text`) + Pixi `Graphics`. Inga externa filer.
- **Vädersymboler:** sol ☀️, regn 🌧️, snö ❄️ (alt. 🌨️).
- **Plagg (emoji):**
  - huvud: regnhatt/keps 🧢, vintermössa 🧶 (eller 👒 solhatt), 🎩.
  - överkropp: regnjacka/jacka 🧥, t-shirt 👕, vinterjacka 🧥, tröja 🧣 (halsduk).
  - fötter: gummistövlar 🥾, sandaler 🩴, vinterskor 👢.
  - distraktorer: badbyxor/baddräkt 🩳/👙, solglasögon 🕶️.
- **Figuren:** Pixi Graphics (huvud circle, kropp roundRect, ben) i COLORS-paletten; enkelt leende ritas med Graphics (två ögon-circles + en arc/roundRect-mun). Maskoten "Bobo" från `lib/mascot.js` kan återanvändas som figur om den passar.
- **Bakgrund/hylla/paneler:** Graphics roundRect/circle med COLORS + per-väder toningsfärger ovan.
- **Konfetti/gnistor:** `feedback.bigCelebration` / `sparkle` / `puff` (ritar egna Graphics-partiklar).

## Återanvänd dessa
- `lib/DragController.js` — drag + snäpp + snäpp-tillbaka + tap-tap-fallback (kärnan i interaktionen).
- `lib/feedback.js` — `pop`, `wiggle`, `sparkle`, `puff`, `bigCelebration`, `bounceIn`.
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`, `CATEGORIES`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom`, `shuffle`, `asciiFold` (för id/ljudnycklar).
- `lib/mascot.js` (valfritt) — figur.
- `ctx.services.audio` / `voice`; `ctx.progress` (`get/setLevel/addStars/setCustom/complete`); `ctx.fxLayer`; `ctx.exitToLibrary` (via header, ej egen knapp).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`; `false` i `destroy`. Varje `gsap.delayedCall`/timeout-callback (t.ex. nästa runda efter complete, idle-recue) börjar med `if (!this._alive) return`.
- **Undvik dubbeltryck under "resolving":** sätt en flagga `this._resolving = true` från det att sista zonen fylls tills nästa runda byggts; ignorera nya drop/select under tiden. DragController hindrar redan parallella drag via `this.active`.
- `destroy(ctx)`:
  - `this._alive = false`
  - `this._drag?.destroy()`
  - `gsap.killTweensOf(this._root)` samt kill av per-objekt-tweens (figur-hopp, highlight-ringar, plagg-pulser) — enklast `this._root.children.forEach(c => gsap.killTweensOf(c))` innan destroy.
  - Avbryt idle-timer: `if (this._idle) { this._idle.kill?.(); clearTimeout(this._idle) }` (beroende på vald timer-typ; använd `gsap.delayedCall` och spara referensen).
  - `ctx.services.voice.cancel?.()`
  - `this._root?.destroy({ children: true })`
- Idempotent runda-byggnad: rensa gamla plagg/zoner och kalla `this._drag.clear()` (eller skapa ny controller) innan ny runda byggs, så lyssnare inte dubbleras.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/kla-efter-vadret/index.js` och kopiera strukturen från `src/games/sortera-skrap/index.js` som mall (DragController-uppsättning, `_alive`, städning).
2. Definiera väderdata överst: `const WEATHERS = { sol:{symbol:'☀️', bg:0xfff3c4, intro:'Det är sol idag...', good:{huvud:['👒'],overkropp:['👕'],fotter:['🩴']}}, regn:{...}, snö:{...} }` plus en distraktor-pool per väder.
3. `init(ctx)`: sätt `this._alive=true`, skapa `this._root` och addera till `ctx.stage`; skapa `this._drag`; bygg bakgrund, figur (Graphics) och tre kroppszon-Containers; läs `this._level` från `ctx.progress.get().highestLevel`; anropa `this._newRound(ctx)`.
4. `_newRound(ctx)`: välj nytt väder (≠ `lastWeather`, spara via `setCustom`), uppdatera bakgrundsfärg + vädersymbol, bestäm obligatoriska zoner och plagg-uppsättning utifrån `this._level`, lägg ut plagg på hyllan, registrera `drag.addTarget` per zon och `drag.addItem` per plagg, nollställ `this._placed=0`/`this._needed=N`, starta idle-timer.
5. `mount(ctx)`: `ctx.services.voice.say(<aktuell väder-intro>)`.
6. I `onCorrect`: spela `correct` + säg plaggnamn, kör `pop`+`sparkle`, tona zon-highlight, öka `this._placed`; om `this._placed >= this._needed` → fira: `setLevel`, `complete()`, `bigCelebration`, sätt `this._resolving=true`, `gsap.delayedCall(1.3, () => this._alive && this._newRound(ctx))`.
7. I `onWrong`: `wiggle(rec.view)` + mjuk röstvink (väder/zon-anpassad); DragController snäpper tillbaka automatiskt.
8. Implementera idle-recue med `gsap.delayedCall(6, ...)` som återupprepar intro; nollställ den vid varje `pointerdown` (lyssna på `this._root` eller stage).
9. `destroy(ctx)`: enligt sektionen "Edge-cases & städning".
10. Registrera spelet i `src/games/registry.js`: `import klaEfterVadret from './kla-efter-vadret/index.js'` och lägg till i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera drag + tap-tap, hem-knapp, röst-repetera, firande vid klart, samt att `highestLevel` består efter reload.

## Acceptanskriterier (Playwright-test)
- Spelet **renderas utan konsolfel** (inga errors/warnings i console) efter att biblioteket startat spelet.
- **Canvas finns** och spelet monteras; voiceIntro försöker spelas vid mount (Web Speech kan mockas/ignoreras).
- **Korrekt drag/tap-tap:** att dra ett passande plagg till rätt kroppszon (eller tap-plagg → tap-zon) resulterar i att plagget snäpper på plats och stannar (position nära zonens koordinater), utan att kunna flyttas igen.
- **Fel = mjuk respons:** att släppa ett opassande plagg (fel väder/fel zon) leder till att plagget **återvänder till hyllan** (nära ursprungspositionen) — ingen röd markering, inget "game over", spelet fortsätter svara.
- **Runda blir klar → firande:** när alla obligatoriska zoner fyllts triggas firande (fxLayer får barn / `complete` anropas). Verifiera via en testkrok eller genom att observera celebrate-partiklar.
- **Progress sparas:** efter en klarad runda ökar `highestLevel` i `localStorage` (`pwagames.save.v1`) för aktiv profil under spelets id, och värdet kvarstår efter sidladdning.
- **Inga förbjudna gester krävs:** all framgång nås med enbart tap och enkel drag (inga dubbeltryck/långtryck behövs).
- **Städning:** att lämna spelet (hem) avmonterar utan kvarvarande fel; inga lösa tickers/tweens orsakar konsolfel efteråt.