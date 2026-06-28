# Tryck och Förvandla (`tryck-och-forvandla`)
> En glad figur står mitt på skärmen och förvandlas till något nytt vid varje tryck — ren orsak-verkan-magi som 2-5-åringar älskar att upprepa i det oändliga.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|----|---------|------|----------|-------|----------|--------|------------|
| `tryck-och-forvandla` | Tryck och Förvandla | ✨ | roligt | tap | [2, 5] | `tryck-och-forvandla` | Tryck på figuren så förvandlas den! |

## Mål & mekanik
Det finns inget mål i traditionell mening — spelet är ren upptäckarlek (orsak-verkan). En stor, glad figur (en emoji renderad i `Text`) står mitt på skärmen i en mjuk "scen-platta". Varje gång barnet trycker på figuren:
1. Figuren gör en kort puff + studs ('pop'-ljud).
2. Den byts ut mot nästa emoji i en blandad förvandlingslista (groda → stjärna → katt → …).
3. Ibland (var n:te förvandling) säger rösten figurens namn ("En katt!").

**Kärnloop:** tryck → pop + förvandling → tryck → pop + förvandling … oändligt.

**"Klart"-tillfälle:** Spelet har inget fail-state. För att ge ett tillfredsställande firande räknar vi antal förvandlingar; efter var 8:e förvandling kör vi `ctx.progress.complete()` (firande 1-2s + stjärna + klistermärke) och fortsätter sedan direkt med nästa figur — leken avbryts aldrig. En subtil ring av "stjärnprickar" runt scenplattan fylls i takt med förvandlingarna så barnet ser firandet närma sig (helt utan siffror/läsning).

## Skärm-layout (1280x720)
Header-knappar (hem/högtalare) ritas av GameHost — rita INTE egna.
- **Bakgrund:** hela `_root` får en mjuk pastellbakgrund via en `Graphics`-rektangel `0,0 → 1280,720` fylld `COLORS.bg` (0xfdf6e3). Dekorativ, `eventMode='none'`.
- **Scenplatta:** en rundad `Graphics`-platta centrerad i `(640, 380)`, storlek `420 x 420`, `roundRect(-210,-210,420,420,48).fill(COLORS.cream).stroke({width:8,color:COLORS.orange})`. Ger figuren en tydlig "scen". `eventMode='none'`.
- **Figur (emoji):** `Text` med `fontSize: 240`, `anchor.set(0.5)`, placerad i `(640, 380)`. Detta är den enda interaktiva ytan. Hit-area utökas (se Interaktion).
- **Förloppsring:** 8 små `Graphics`-cirklar (radie 12) jämnt fördelade på en cirkel med radie 250 runt `(640, 380)` (vinkel `i/8 * 2π - π/2`). Tomma = `COLORS.inkSoft` alpha 0.25; fyllda = `PLAYFUL[i]`. Dekorativa, `eventMode='none'`.
- **Marginaler:** minst 120px från headern (toppen). Scenplattan (380±210 = 170…590) håller sig väl innanför 720 och under headern.

## Interaktion
Endast **TAP**. Inget drag.
- Figuren (`Text`) får `eventMode='static'`, `cursor='pointer'` och en explicit, generös `hitArea = new Rectangle(-200, -200, 400, 400)` (>=96px med stor marginal) så även små/smala emojier är lätta att träffa.
- Lyssnare: `figure.on('pointertap', () => this._transform(ctx))`.
- **Tomt tryck (utanför figuren):** scenplattan och bakgrunden är `eventMode='none'`, så tryck utanför figuren gör inget skadligt. Valfritt (rekommenderas): lägg en heltäckande osynlig bakgrunds-hitruta `eventMode='static'` under figuren som vid tryck ger en mjuk `wiggle(this._figure)` + `audio.sfx('soft')` — så varje pekning får respons <100ms men bara figuren förvandlar.
- **Ingen dubbeltryck/långtryck/pinch** — endast `pointertap`. Under den korta förvandlingsanimationen (~250ms) sätts `this._resolving = true` så snabba upprepade tryck inte staplar tweens; nya tryck ignoreras tills `false`. (Detta är inte ett "fel" — barnet märker bara att figuren hinner studsa klart.)

## Återkoppling & belöning
**Per tryck (<100ms):**
- Ljud: `ctx.services.audio.sfx('pop')` direkt vid tryck (ibland `'pling'` ~20% för variation).
- Bild: `puff(this._root, 640, 380, { count: 9 })` + `pop(this._figure)` (studs-puls). Emoji-texten byts mitt i puffen (när skalan är minst) för en "magisk" övergång.
- Röst: var 3:e förvandling `voice.say('En ' + namn + '!')` (t.ex. "En groda!", "En katt!", "En stjärna!"). Inte varje gång — annars blir det pratigt.

**Korrekt vs fel:** Det finns inga felsteg. Varje tryck på figuren är "rätt". Tryck bredvid figuren = mjuk `wiggle` + `'soft'` (lekfullt, ALDRIG buzzer/rött/scolding).

**`ctx.progress.complete()`:** anropas när förvandlingsräknaren når en multipel av 8. Då: fyll sista ringpricken, kör `complete()` (delat firande + stjärna + klistermärke), `voice.say(randomFrom(PRAISE))`, nollställ ringen efter firandet och fortsätt direkt. Inget avbrott, ingen "nästa nivå"-skärm.

**SFX-namn som används:** `'pop'`, `'pling'`, `'soft'`, `'celebrate'` (valfritt vid firande). **Voice:** `voiceIntro` vid mount + idle, figurnamn-fraser, `PRAISE` vid complete.

## Progression & nivåer
- **Oändlig lek:** aldrig något slut. Efter complete fortsätter samma loop.
- **`custom.forvandlingar`:** total räknare över förvandlingar (sparas via `ctx.progress.setCustom('forvandlingar', n)`). Driver complete-var-8:e-logiken och kan visas i framtida statistik.
- **Mjuk svårighetstrappa via `highestLevel`** (helt osynlig för barnet, ändrar bara variation):
  - Nivå 1 (start): en handfull bekanta figurer (groda, katt, hund, stjärna, blomma).
  - När `forvandlingar` passerar trösklar (t.ex. 16, 40) höjs nivån med `ctx.progress.setLevel(n)` och fler emojier läggs till i poolen (fordon, frukt, väder) → mer överraskning, aldrig svårare att lyckas.
- Emoji-sekvensen `shuffle()`:as så samma figur inte upprepas direkt; nästa väljs så den skiljer sig från nuvarande.

## Tillgångar (programmatiskt)
INGA externa filer. Allt ritas med Pixi Graphics + systememoji i `Text`.
- **Förvandlingsemojier (figurpool):** 🐸 (groda), 🐱 (katt), 🐶 (hund), ⭐ (stjärna), 🌸 (blomma), 🐰 (kanin), 🦋 (fjäril), 🐢 (sköldpadda), 🐝 (bi), 🚗 (bil), 🍎 (äpple), 🌈 (regnbåge), 🐥 (kyckling), 🌟 (glittstjärna), ☀️ (sol). Varje emoji har ett svenskt namn (med åäö) för röst: groda, katt, hund, stjärna, blomma, kanin, fjäril, sköldpadda, bi, bil, äpple, regnbåge, kyckling, stjärna, sol.
- **Scenplatta:** `Graphics` rundad rektangel (cream-fyll, orange kant).
- **Bakgrund:** `Graphics` heltäckande rektangel `COLORS.bg`.
- **Förloppsring:** 8 `Graphics`-cirklar (`PLAYFUL`-färger / `inkSoft`).
- **Partiklar:** via `puff()`/`bigCelebration()` (genereras programmatiskt).

## Återanvänd dessa
- `lib/feedback.js`: `puff` (förvandlingspuff), `pop` (figurstuds), `wiggle` (tomt tryck), `sparkle`/`bigCelebration` (firande — `complete()` kör redan delat firande).
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `PRAISE`.
- `lib/swedish.js`: `randomFrom`, `shuffle`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `complete()`, `setCustom('forvandlingar', n)`, `setLevel(n)`, `get()`.
- `ctx.ticker` för idle-timern; `gsap` för tweens. Ingen DragController (rent tap-spel), ingen Button (header sköts av GameHost).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `this._alive = false` först i `destroy`. Alla `gsap.delayedCall`/`onComplete`-callbacks börjar med `if (!this._alive) return`.
- `this._resolving`-flagga hindrar staplade tweens vid snabba upprepade tryck (undviker "dubbeltryck"-glitch). Återställs i tween-`onComplete`.
- Vid byte av emoji-text: ändra `figure.text` när skalan är 0 (mitt i pop-timeline) så övergången ser ren ut; återanvänd samma `Text`-objekt (skapa inte nya varje gång → ingen läcka).
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; `gsap.killTweensOf(this._figure)`; `gsap.killTweensOf(this._root)`; döda ev. idle-/delayedCalls; `this._root?.destroy({ children: true })`.
- Idle-recue: om ingen interaktion på ~6s, `voice.say(this.voiceIntro)` + en liten `pop(this._figure)` som "vinkar". Nollställ idle-timern vid varje tryck.
- Profilbyte/återinträde: läs `ctx.progress.get().custom.forvandlingar` i `init` för att fortsätta ringfyllningen korrekt (modulo 8).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/tryck-och-forvandla/index.js`, `export default { ... }` enligt modulkontraktet (kopiera strukturen från `src/games/klambubblor/index.js`).
2. Fyll metadata: `id`, `titleSv`, `icon: '✨'`, `category: 'roligt'`, `input: 'tap'`, `ageRange: [2,5]`, `bundle: 'tryck-och-forvandla'`, `voiceIntro`.
3. Definiera figurpoolen som array `[{ emoji: '🐸', namn: 'groda' }, …]` (se Tillgångar).
4. `init(ctx)`: `this._alive = true`; skapa `this._root = new Container()` + `ctx.stage.addChild(this._root)`. Rita bakgrund, scenplatta, förloppsring (spara cirkel-refs i `this._dots`), och figuren (`this._figure = new Text({...fontSize:240})`, `anchor.set(0.5)`, position `(640,380)`, `hitArea`, `eventMode='static'`, `pointertap`-lyssnare). Läs `forvandlingar` från `ctx.progress.get().custom` och fyll ringen modulo 8.
5. Implementera `_transform(ctx)`: returnera om `!this._alive || this._resolving`; sätt `_resolving=true`; `audio.sfx('pop'/'pling')`; `puff(...)`; `pop(this._figure)`; välj nästa emoji (skiljt från nuvarande via `shuffle`/`randomFrom`); byt `figure.text` vid skal-botten; öka räknaren + `setCustom`; fyll nästa ringprick; var 3:e → `voice.say('En '+namn+'!')`; var 8:e → `ctx.progress.complete()` + `voice.say(randomFrom(PRAISE))` + nollställ ring; återställ `_resolving=false` i `onComplete`. Höj `setLevel`/utöka pool vid trösklar.
6. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
7. Idle-tick: `this._tick = (t) => { if(!this._alive) return; this._idle += t.deltaMS/1000; if(this._idle>6){ this._idle=0; voice.say(voiceIntro); pop(this._figure) } }`; `ctx.ticker.add(this._tick)`. Nollställ `this._idle=0` vid varje tryck.
8. `destroy(ctx)`: enligt Städning ovan.
9. Registrera i `src/games/registry.js`: `import tryckOchForvandla from './tryck-och-forvandla/index.js'` och lägg till i `GAMES`-arrayen.
10. `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, förvandling vid varje tryck, firande var 8:e, och att `forvandlingar` finns kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet renderas utan konsolfel (inga felmeddelanden/uncaught i `browser_console_messages`).
- Vid mount visas en figur centrerad runt (640, 380) och `voiceIntro` triggas (Web Speech anropas / mockas utan fel).
- Tap på figuren förvandlar den: emoji-texten ändras och ett `'pop'`-ljud + puff-partiklar uppstår (DOM/Pixi-state observerbart, inget fel).
- Tap utanför figuren ger mjuk respons (`wiggle`/`'soft'`) och förvandlar INTE — ingen buzzer, inget fail-state, inga felmeddelanden.
- Snabba upprepade tap staplar inte tweens (ingen krasch; `_resolving` hindrar dubbelförvandling under animation).
- Efter 8 förvandlingar anropas `ctx.progress.complete()` (firande + stjärna + klistermärke registreras) och leken fortsätter direkt utan avbrottsskärm.
- Progress sparas: `custom.forvandlingar` ökar och kvarstår i localStorage (`pwagames.save.v1`) efter omladdning; ringfyllning återupptas korrekt.
- Hem-knappen (GameHost) avslutar till biblioteket och `destroy` körs utan kvarvarande tickers/tweens (inga "leak"-fel vid återinträde).
