# Plantera Frön (`plantera-fron`)
> Barnet drar små frön ner i jordhål och vattnar dem så blommor långsamt växer upp och fjärilar fladdrar — den lugna, omhändertagande "odla något"-leken som 2-4-åringar älskar att upprepa om och om igen.

## Metadata
| Fält | Värde |
| --- | --- |
| id | `plantera-fron` |
| titleSv | Plantera Frön |
| icon | 🌱 |
| category | drag |
| input | drag |
| ageRange | [2, 4] |
| bundle | `plantera-fron` |
| voiceIntro | "Dra fröna ner i jorden!" |

## Mål & mekanik
Kärnloop i tre steg, helt utan press:
1. **Så**: 1-3 jordhål (gropar i en jordrabatt) väntar tomma. Ett eller flera frön ligger redo längst upp. Barnet drar (eller tap-tap) ett frö till ett hål. Fröet snäpper ner, hålet stängs med en liten jordhög och ett mjukt "plopp".
2. **Vattna**: När alla hål för rundan är sådda dyker en stor vattenkanna 🪣/💧-knapp upp och guppar för att locka tryck. Barnet trycker på vattenkannan → vattendroppar regnar, och varje sått frö gror.
3. **Växa & fira**: Varje blomma växer långsamt upp (stjälk skjuter i höjd, blomma blommar ut) med 'pling'. När alla blommor i rundan blommat ut fladdrar fjärilar 🦋 in och `ctx.progress.complete()` anropas (delat firande + klistermärke).

Därefter startar automatiskt en **ny runda** efter ~1,3s med (eventuellt) fler hål — oändlig lek. Inget fel finns: ett frö som släpps fel snäpper mjukt tillbaka, ett tryck i tomma luften ger lekfull återkoppling.

## Skärm-layout (1280x720)
Designkoordinater. GameHost ritar header (hem-/högtalarknapp) — rita INGA egna sådana.

- **Bakgrund**: himmel (ljusblå `0xbfe6ff` rektangel 0,0 → 1280×460) + jordrabatt (brun `COLORS.brown` rundad rektangel) som täcker `y=440` till `y=720`, hela bredden. En tunnare mörkare jordkant (`shade(brown,0.18)`) överst på rabatten vid y≈440 för djup. Dekorlager: `eventMode='none'`, `interactiveChildren=false`.
- **Fröförråd (källa)**: en liten "frökorg"-zon centrerad upptill i himlen runt `y=210`. Fröna spawnas här på rad, jämnt fördelade kring `x=640` (t.ex. för 3 frön: x = 520, 640, 760). Varje frö är en `Container` ~140×140 träffyta.
- **Jordhål (mål)**: placerade i rabatten på rad vid `y=560`. Antal = rundans hålantal (1-3). Centrerade: för n hål, `startX = 640 - (n-1)*230/2`... använd jämn fördelning med 230px mellanrum. Varje hål är en mörk oval ~150×60 (grop) med snäpp-`hitRadius: 160`.
- **Vattenkanna-knapp**: visas först när allt är sått, centrerad nederst vid `x=640, y=665`, stor `Button` (width 260, height 110) eller egen Container ≥ 96px hög. Döljs/avaktiveras under sådd-fasen.
- **Marginaler**: minst 24px mellan interaktiva element; varje träffyta ≥96px med extra osynlig hit-halo (rita transparent cirkel/rektangel i träffytan eller sätt `hitArea`).

## Interaktion
**Sådd-fas (drag):** Använd `lib/DragController.js`.
- `this._drag = new DragController({ space: this._root, services: ctx.services })`.
- Varje frö: `this._drag.addItem(seedView, { idx }, { onCorrect, onWrong })`. Fröet får automatiskt: skala-upp vid grepp, drag som överlever att fingret lämnar, snäpp till mål, snäpp tillbaka vid miss, och **tap-tap-fallback** (tryck frö → tryck hål) inbyggt.
- Varje hål: `this._drag.addTarget(holeView, (data) => !holeView._filled, { hitRadius: 160 })`. `accepts` returnerar true så länge hålet är tomt — vilket frö som helst får ner i vilket tomt hål som helst (inga "fel" frön; det enda "fel" är att sikta bredvid alla hål, vilket snäpper tillbaka).
- För att undvika att två frön hamnar i samma hål: i `onCorrect` markeras `target.view._filled = true` direkt.

**Vattna-fas (tap):** Vattenkannan är en `Button` med `onTap` (pekar på `pointertap`) som triggar växt-sekvensen. Stor hit-halo via Button-defaults.

**Tomt tryck / sikta bredvid:** DragController hanterar redan miss → 'soft'-ljud + snäpp hem. Lägg dessutom `wiggle` på fröet i `onWrong`.

## Återkoppling & belöning
Allt < 100ms från pekning.
- **Greppa frö**: DragController spelar 'tap' + skalar upp (inbyggt).
- **Frö ner i hål (onCorrect)**: `audio.sfx('pop')` ("plopp"), göm fröet (`gsap.to(view,{alpha:0...})` → destroy), rita en liten jordhög över hålet med `pop()`-studs, `feedback.puff(ctx.fxLayer, holeX, holeY, {count:6, color: COLORS.brown})`. Valfri kort röst första gången: `voice.say('Plopp!')`.
- **Fel/miss (onWrong)**: `wiggle(rec.view)` + DragControllerns inbyggda 'soft'. Aldrig buzzer/rött/“nej”.
- **Vattenkanna-tryck**: `audio.sfx('whoosh')` (vattenskvätt) + animera lutande kanna och blå droppar (`puff(ctx.fxLayer, x, y, {color:0x4aa3df})`). Röst: `voice.say('Vattna blommorna!')` (en gång).
- **Varje blomma blommar ut**: `audio.sfx('pling')` + `sparkle(ctx.fxLayer, flowerX, flowerY)`.
- **Runda klar (alla blommor ute)**: släpp in 2-4 fjärilar 🦋 som fladdrar (gsap sine-rörelse), `audio.sfx('celebrate')`, slumpad röst ur `PRAISE` (t.ex. `voice.say(randomFrom(PRAISE))`), och **`ctx.progress.complete()`** (delat firande + stjärna + klistermärke). Höj nivå: `ctx.progress.setLevel(this._level + 1)`.

SFX-namn som används: `tap`, `pop`, `whoosh`, `pling`, `soft`, `celebrate`. Röstfraser: voiceIntro, "Plopp!", "Vattna blommorna!", `PRAISE`-fras.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` läses i `init`.
- **Antal hål per runda** växer mjukt: `holes = Math.min(3, 1 + Math.floor(this._level / 2))` → nivå 0-1 = 1 hål, 2-3 = 2 hål, 4+ = 3 hål. Aldrig fler än 3 (håller det lugnt för 2-4 år).
- Antal frön = antal hål (alltid lösbart; inga överblivna frön som kan kännas som "fel").
- Efter `complete()`: `gsap.delayedCall(1.3, () => this._newRound(ctx))` (skyddad av `this._alive`). Oändlig lek.
- Spara valfritt blomfärg-variation via `ctx.progress.setCustom('flowers', n)` — ej krav.
- `highestLevel` höjs varje avklarad runda; svårigheten självreglerar och planar ut vid 3 hål.

## Tillgångar (programmatiskt)
Inga externa filer. Allt = Pixi `Graphics` + emoji via `Text`.
- **Himmel**: `Graphics().rect(0,0,1280,460).fill(0xbfe6ff)`. Ev. 2-3 moln 🌥️ eller vita rundade rektanglar (dekor).
- **Sol**: `Text` ☀️ uppe i hörnet (dekor, eventMode none).
- **Jordrabatt**: `Graphics().roundRect(...).fill(COLORS.brown)` + mörkare kantlinje (`shade`-hjälpare, kopiera från sortera-skrap).
- **Frö**: `Container` med `Graphics().circle(0,0,46).fill(0xffffff,0.9).stroke({width:4,color:0xeadfca})` som bakgrund + `Text` 🌰 (eller 🫘) fontSize ~70, `anchor.set(0.5)`. Hit-halo: transparent cirkel r≈70 eller `hitArea`.
- **Jordhål (tomt)**: `Graphics().ellipse(0,0,75,30).fill(0x3a2616)` (mörk grop).
- **Jordhög (sått)**: liten `Graphics().ellipse(0,0,60,26).fill(shade(brown,0.15))` ovanpå hålet.
- **Stjälk**: `Graphics().rect(-6,0,12,H).fill(COLORS.green)` där H animeras 0→~140.
- **Blomma**: `Text` ur `['🌸','🌺','🌻','🌷','🌼']` (randomFrom), fontSize 0→~90 vid utblomning.
- **Vattenkanna**: `Button` med `icon:'🪣'` (eller `💧`) och `label:'Vattna'` — eller egen Container med `Text` 🪣.
- **Fjärilar**: `Text` 🦋 fontSize ~64.
- **Partiklar/konfetti**: `feedback.puff/sparkle/bigCelebration` + `ctx.progress.complete()`s firande.

## Återanvänd dessa
- `lib/DragController.js` — sådd-fasens drag + tap-tap-fallback + snäpp/snäpp-tillbaka. **Uppfinn inget eget drag.**
- `lib/Button.js` — vattenkanne-knappen (hit-halo, studs, ljud).
- `lib/feedback.js` — `pop`, `wiggle`, `puff`, `sparkle`, ev. `bounceIn` för spawnande frön.
- `lib/swedish.js` — `randomFrom`, `shuffle`.
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`.
- `ctx.services.audio.sfx`, `ctx.services.voice.say/replayLast`, `ctx.fxLayer`.
- `ctx.progress` — `get()/setLevel()/complete()/setCustom()` (rör ALDRIG localStorage direkt).
- `gsap` för all animation (växt, fjärilar, droppar).

## Edge-cases & städning
- Sätt `this._alive = true` i `init`, `this._alive = false` först i `destroy`. Vakta ALLA fördröjda callbacks (`gsap.delayedCall`, `onComplete`, växt-timeline-slut) med `if (!this._alive) return`.
- **Dubbeltryck under "resolving"**: medan vattenkannan animerar växt-sekvensen, sätt `this._watering = true` och ignorera ytterligare kanntryck (avaktivera Button / `eventMode='none'`). Sätt `this._filled` på hål direkt i `onCorrect` så samma hål inte tar två frön (`accepts` returnerar false när fyllt).
- Visa/aktivera vattenkannan endast när `sownCount === holeCount`; annars dold.
- Idle-recue: starta en timer (t.ex. via ticker-ackumulator eller `gsap.delayedCall`) som efter ~6s utan handling kör `ctx.services.voice.replayLast()` eller upprepar fas-instruktionen; nollställ vid varje interaktion. Vakta med `_alive`.
- `destroy(ctx)`:
  - `this._alive = false`
  - `this._drag?.destroy()`
  - `this._idleTimer?.kill()` och alla `gsap.delayedCall`-referenser sparade och dödade
  - `gsap.killTweensOf(this._root)` (och ev. per-blomma/frötweens — spara referenser eller `gsap.killTweensOf` på respektive view)
  - `ctx.ticker.remove(this._tick)` om en ticker-callback registrerats
  - `this._root?.destroy({ children: true })`
- Fjärilar/partiklar ligger i `ctx.fxLayer` (delas av shellen) — destrueras av sina egna `onComplete`; lägg inga kvardröjande lyssnare där.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/plantera-fron/index.js`. Kopiera strukturen från `src/games/sortera-skrap/index.js` som mall (drag-spel med rundor).
2. Importera: `{ Container, Graphics, Text }` från `pixi.js`, `gsap`, `DragController`, `{ wiggle, pop, puff, sparkle }` från feedback, `{ randomFrom }` från swedish, `{ COLORS, FONT, PRAISE }` från theme. Lägg lokal `shade(hex,amt)`-hjälpare.
3. Default-exportera GameModule-objektet med metadata enligt tabellen ovan.
4. `init(ctx)`: sätt `_alive=true`, skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Rita himmel + jordrabatt (dekor, eventMode none). Skapa `this._drag`. Läs `this._level`. Anropa `this._newRound(ctx)`.
5. `_newRound(ctx)`: rensa förra rundans noder (frön/hål/blommor — destroya och nollställ `_drag` via ny instans eller `clear()`), beräkna `holeCount`, bygg hål (`addTarget`), spawna frön (`addItem` + `bounceIn`), dölj vattenkannan, sätt `this._sown = 0`.
6. `onCorrect(rec,target)`: markera `target.view._filled=true`, spela 'pop', puff, jordhög med `pop()`, göm fröet, öka `this._sown`; om `this._sown === holeCount` → visa vattenkannan (`bounceIn`/guppa).
7. `onWrong(rec)`: `wiggle(rec.view)` (soft-ljud sköter DragController).
8. Vattenkanna `onTap`: gärda mot dubbeltryck (`this._watering`), spela 'whoosh', droppar-puff, kör per hål en växt-timeline (stjälk höjd 0→140, blomma skala 0→1, 'pling', sparkle) med liten stagger.
9. Efter sista blomman: släpp fjärilar 🦋, `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `ctx.progress.setLevel(this._level+1)`, `ctx.progress.complete()`, sedan `gsap.delayedCall(1.3, ()=>{ if(this._alive){ this._level++; this._newRound(ctx) }})`.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`; starta idle-recue.
11. `destroy(ctx)`: enligt städ-checklistan ovan.
12. Registrera i `src/games/registry.js`: `import planteraFron from './plantera-fron/index.js'` och lägg `planteraFron` i `GAMES`-arrayen.
13. `npm run dev`, öppna biblioteket, spela: verifiera dra+tap-tap, vattenkanna, blomma växer, firande + klistermärke, ny runda, och att `highestLevel` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras från biblioteket och renderar canvas **utan konsolfel** (lyssna på `page.on('console')`/`pageerror`).
- voiceIntro/`mount` körs utan kastade fel; ingen nätverksbegäran sker vid körning (offline-regel).
- Minst ett frö och minst ett jordhål finns i scenen vid start (verifiera via exponerat test-hook eller pixel/snapshot — annars via drag-interaktion nedan).
- **Drag korrekt**: simulerad drag från fröets position till hålets position resulterar i att fröet snäpper in (hålet markeras fyllt); 'pop'-ljud/feedback triggas (verifiera via stub på `audio.sfx`).
- **Tap-tap-fallback**: tryck på frö och sedan på hål ger samma sådd-resultat som drag.
- **Mjuk fel-respons**: släpp ett frö i tom yta (inte på hål) → fröet snäpper tillbaka till sin startposition och INGET firande/buzzer; 'soft' spelas.
- **Vattenkanna**: visas/aktiveras först när alla hål är sådda; tryck startar växt-sekvensen och blommor skalas upp.
- **Klart → firande**: när alla blommor blommat ut anropas `ctx.progress.complete()` exakt en gång per runda (spionera på `progress.complete`).
- **Progress sparas**: efter en avklarad runda är `highestLevel` ökat och kvarstår efter en sidomladdning (verifiera localStorage-nyckel `pwagames.save.v1`).
- **Dubbeltrycksskydd**: upprepade snabba tryck på vattenkannan startar inte flera parallella växt-sekvenser och anropar inte `complete()` flera gånger.
- **Städning**: vid retur till biblioteket (destroy) kastas inga fel och inga kvarvarande tweens/tickrar uppdaterar förstörda noder.
