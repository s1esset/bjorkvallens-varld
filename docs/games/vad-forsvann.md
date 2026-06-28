# Vad Försvann? (`vad-forsvann`)
> Några gulliga saker visas, täcks över med en filt, och när filten lyfts har en försvunnit — barnet trycker på tomma platsen/saken som saknas och får jubel. 3–5-åringar älskar den lilla spänningen i "kuk-titt-borta" och känslan av att vara den som löser gåtan.

## Metadata
| Fält | Värde |
|---|---|
| id | `vad-forsvann` |
| titleSv | Vad Försvann? |
| icon | 🔍 |
| category | minne |
| input | tap |
| ageRange | [3, 5] |
| bundle | `vad-forsvann` |
| voiceIntro | "Titta noga på sakerna! Snart försvinner en — vilken?" |

## Mål & mekanik
Kärnloop (en runda):
1. **Visa-fas:** N saker (emoji-figurer) studsar in på en rad/rutnät. Rösten säger voiceIntro och benämner gärna sakerna. Barnet får titta i lugn takt (ingen press).
2. **Täck-fas:** En mjuk filt (Graphics-rektangel med rundade hörn) glider in över alla saker (whoosh). Korta paus (~0,8 s).
3. **Borttagning:** Bakom filten görs EN slumpvald sak osynlig. Filten glider bort igen (reveal). En tom, lätt streckad platshållare lyser där saken fanns.
4. **Svarsfas:** Rösten frågar "Vad försvann? Tryck på den tomma platsen!". Barnet trycker. Alla synliga saker + den tomma platsen är tryckbara.
   - Tryck på **tomma platsen** (rätt) → den försvunna saken studsar tillbaka glatt, säger sitt namn, `correct`-ljud, gnistror.
   - Tryck på en **synlig sak** (fel) → saken vinglar lekfullt + `soft`-ljud, mild röst-vink ("Den är ju kvar! Vilken syns inte?"). Ingen bestraffning, obegränsade försök.
5. **Klart:** När rätt svar getts → kort firande, `ctx.progress.complete()`, och efter ~1,4 s startar en ny runda (ev. höjd nivå). Oändlig lek.

Generös tid: ingen timer som straffar. Barnet kan stirra hur länge som helst i visa-fasen (en stor "Göm dem!"-knapp triggar täck-fasen, så barnet styr tempot själv).

## Skärm-layout (1280x720)
GameHost ritar header (hem-knapp + repetera/högtalare) överst — rita INGA egna sådana.

- **Spelyta:** centrerad inom x: 140–1140, y: 170–620 (under headern, marginal 140 i sidled, 100 nedtill).
- **Saker (slots):** placeras i ett rutnät centrerat i spelytan. Varje slot är en cell ~190×190 px med saken (emoji) i fontSize 110, ankare 0.5.
  - Nivå 1 (3 saker): 1 rad, 3 kolumner. cellW=200, gap=60 → gridbredd=720. startX = (1280−720)/2 + 100 = 380; y = 400.
  - Nivå 2 (4 saker): 1 rad, 4 kolumner. cellW=190, gap=44 → gridbredd=4·190+3·44=892. startX=(1280−892)/2+95=289; y=400.
  - Nivå 3 (5 saker): 1 rad, 5 kolumner. cellW=180, gap=30 → gridbredd=5·180+4·30=1020. startX=(1280−1020)/2+90=220; y=400.
  - Nivå 4 (6 saker): 2 rader × 3 kolumner. cellW=190, gap=50. gridbredd=3·190+2·50=670; gridhöjd=2·190+50=430. startX=(1280−670)/2+95=400; startY=290; radsteg=240.
- **Tom platshållare:** samma cellposition, en streckad/ljus rundad cirkel (radie 80) i COLORS.cream med streck-kant COLORS.inkSoft alpha 0.5 + ett blekt "?" (Text "❔" eller "?", fontSize 70, alpha 0.4).
- **Filt:** Graphics rundad rektangel som täcker hela gridytan + 40 px marginal runt om, färg COLORS.purple (alpha 0.95) med ljus kant; ett dekorativt "🛏️"/"🧺"-motiv valfritt centrerat. Startar utanför skärmen till höger (x = 1280 + bredd) och glider in.
- **"Göm dem!"-knapp:** lib/Button, centrerad nederst vid x=640, y=650, width=300, height=92, color=COLORS.orange, label "Göm dem!", icon "🙈". Syns endast i visa-fasen.

## Interaktion
Endast TAP (ingen drag).

- **Varje slot** (synlig sak) är en Container med `eventMode='static'`, `cursor='pointer'`, generös `hitArea` (Pixi `Rectangle(-95,-95,190,190)` eller `Circle(0,0,96)`), och lyssnar på `'pointertap'`.
- **Tomma platsen** är likadant en tryckbar Container med samma stora hitArea (minst 96 px), markerad `_isGap = true`.
- "Göm dem!"-knappen (Button) har `onTap` som går från visa-fas → täck-fas.
- **Dubbeltrycks-/tävlingsskydd:** under firande/övergångar sätts `this._busy = true`; alla pointertap-handlers returnerar tidigt om `!this._alive || this._busy || this._phase !== 'answer'`.
- Ingen drag → DragController används INTE i detta spel.
- Allt sker i designkoordinater; `ctx.stage` är redan skalad.

## Återkoppling & belöning
Per-tryck (<100 ms ljud+bild):
- Tryck på synlig sak (fel): `audio.sfx('soft')` + `wiggle(slot)`. Efter 1:a felet per runda: `voice.say('Den är ju kvar! Vilken sak syns inte?')`. Aldrig rött kryss/buzzer.
- Tryck på tom plats (rätt): `audio.sfx('correct')`, den försvunna saken görs synlig och `bounceIn`/`pop` på den, `sparkle(ctx.fxLayer, x, y)`, `voice.say('Ja! Det var ju ' + namn + '!')` följt av kort beröm `randomFrom(PRAISE)`.
- Filt in: `audio.sfx('whoosh')`. Filt ut/avslöja: `audio.sfx('reveal')`.
- Knapp "Göm dem!": `audio.sfx('tap')` (Button spelar eget ljud via `sound`-param, sätt sound:'tap').
- Visa-fas inträde: varje sak studsar in (`bounceIn`) med liten `audio.sfx('pop')`-kaskad (valfritt, dämpat).

`ctx.progress.complete()` anropas EN gång när barnet trycker rätt (tom plats) → delat firande (konfetti via `bigCelebration(ctx.fxLayer,...)` sker i complete-flödet) + stjärna + klistermärke. Höj nivå med `ctx.progress.setLevel(nästaNivå)`.

## Progression & nivåer
- Nivåer styrs av `LEVELS = [{count:3,cols:3,rows:1},{count:4,cols:4,rows:1},{count:5,cols:5,rows:1},{count:6,cols:3,rows:2}]`.
- Startnivå: `clampLevel(ctx.progress.get().highestLevel | 0)`.
- Vid rätt svar: `this._level = clampLevel(this._level + 1)`, `ctx.progress.setLevel(this._level)`, `ctx.progress.complete()`, sedan `gsap.delayedCall(1.4, () => this._build(ctx))`.
- Svårighet växer genom fler saker (3→6) och 2-radsuppställning på högsta nivån. Antalet "som försvinner" är alltid 1 (passar 3–5 år).
- `ctx.progress.setCustom('rundor', (custom.rundor||0)+1)` för att räkna avklarade rundor (valfri statistik).
- Oändlig lek: efter högsta nivån stannar man kvar på nivå 4 men med nya slumpade saker varje runda (`shuffle(MOTIFS).slice(0,count)`).

## Tillgångar (programmatiskt)
Inga externa filer. Allt = systememoji (renderas som Pixi `Text`) + Pixi `Graphics`.
- **Saker (MOTIFS, slumpas per runda):** `['🍎','🐶','⭐','🚗','🌸','🧸','🎈','🍌','🐱','🦋','🍓','🎩','🐸','⚽','🌈','🍰']`.
- **Tom platshållare:** Graphics rundad cirkel/ruta (COLORS.cream-fyllning, streckad kant) + blek `'❔'` Text.
- **Filt:** Graphics `roundRect(...).fill(COLORS.purple).stroke({width:6,color:0xffffff,alpha:0.8})`, valfritt dekor-emoji `'🧺'` centrerat.
- **Knapp:** lib/Button med icon `'🙈'`.
- **Partiklar/firande:** `sparkle`, `puff`, `bigCelebration` (Graphics, redan i lib).

## Återanvänd dessa
- `lib/Button.js` — "Göm dem!"-knapp (`{label,icon,width,height,color,services,sound:'tap',onTap,radius}`).
- `lib/feedback.js` — `bounceIn`, `pop`, `wiggle`, `sparkle`, `puff`, `bigCelebration`.
- `lib/swedish.js` — `shuffle`, `randomFrom`.
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`, `PLAYFUL`.
- `ctx.services.audio.sfx` (`'tap','pop','whoosh','reveal','correct','soft'`), `ctx.services.voice.say/replayLast`.
- `ctx.progress` (`get/setLevel/setCustom/complete`), `ctx.fxLayer`, `ctx.ticker` (idle-recue), `gsap`.
- Inkludera namn-uppläsning: en `NAMES`-map från emoji → svenskt ord (t.ex. `'🍎':'äpplet','🐶':'hunden','⭐':'stjärnan',...`) för voice.

## Edge-cases & städning
- `this._alive = true` i `init`; sätt `false` först i `destroy`. Alla `gsap.delayedCall`/`onComplete`-callbacks börjar med `if (!this._alive) return`.
- `this._busy` blockerar tap under filt-animation, borttagning och firande → undviker dubbeltryck/dubbel-complete.
- `this._phase` (`'show' | 'covering' | 'answer' | 'resolved'`) styr vilka tryck som är giltiga.
- **Idle-recue:** ticker räknar sekunder; >6 s i `answer`-fas → upprepa frågan via `voice.say` och låt tomma platsen pulsera (`pop`).
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `gsap.killTweensOf` på filt, slots och `_root`; per-slot kill av eventuella bob-tweens; `this._root.destroy({children:true})`. Button städas när root förstörs (kontrollera att Button ej registrerar globala lyssnare; annars anropa dess egen destroy om sådan finns).
- Vid `_build` mitt i en runda: kill gamla tweens + `this._root.removeChildren().forEach(o => o.destroy({children:true}))` innan ny scen byggs.
- Garantera att "den som försvinner" aldrig är samma slot som redan är tom; välj ny slumpindex varje runda.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/vad-forsvann/index.js` och default-exportera GameModule-objektet med metadata enligt tabellen.
2. Definiera modulkonstanter överst: `MOTIFS`, `NAMES` (emoji→svenskt ord), `LEVELS`, hjälp `clampLevel`.
3. `init(ctx)`: sätt `this._alive=true`, skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`, läs startnivå från `ctx.progress`, anropa `this._build(ctx)`, registrera `this._tick` på `ctx.ticker` för idle-recue.
4. `_build(ctx)`: städa gammalt, slumpa `count` saker, lägg ut slots enligt nivårutnät, skapa "Göm dem!"-Button, sätt `this._phase='show'`, studsa in saker (`bounceIn`), säg voiceIntro i flow.
5. `_makeSlot(ctx, motif, x, y)`: Container med emoji-Text (fontSize~110), stor `hitArea`, `eventMode='static'`, `'pointertap'` → `this._onTap(ctx, slot)`.
6. `_hide(ctx)` (knappens onTap): `this._phase='covering'`, glid in filt (`whoosh`), efter delay göm slumpad slot (`slot.visible=false`, markera `_isGap`, lägg streckad platshållare), glid ut filt (`reveal`), `this._phase='answer'`, `voice.say('Vad försvann? Tryck på den tomma platsen!')`.
7. `_onTap(ctx, slot)`: returnera om `!this._alive||this._busy||this._phase!=='answer'`; om `slot._isGap` → rätt-flöde (visa sak, `correct`, `sparkle`, beröm, `complete`, höj nivå, `delayedCall(1.4,_build)`); annars fel-flöde (`wiggle`, `soft`, mild vink).
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `_update(ctx,ticker)`: idle-räknare → repetera fråga + pulsera tom plats i answer-fas.
10. `destroy(ctx)`: enligt städ-sektionen.
11. Registrera i `src/games/registry.js`: `import vadForsvann from './vad-forsvann/index.js'` och lägg `vadForsvann` i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: kontrollera hem-knapp, röst-repris, firande, och att highestLevel består efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras från biblioteket och renderas **utan konsolfel** (lyssna på `console` / `pageerror`).
- Efter mount syns N saker (nivå 1 = 3) och en synlig "Göm dem!"-knapp.
- Tryck på "Göm dem!" → filt animerar in och ut, exakt **en** sak blir osynlig och en tom platshållare visas; ett `reveal`/`whoosh`-ljudanrop sker (verifiera via stubbed `audio.sfx`-spårning eller exponerad testhook).
- Tryck på en **synlig** sak (fel) → saken vinglar, `soft`-ljud, INGEN `complete()`, scenen kvarstår, fortsatt tryckbar (obegränsade försök).
- Tryck på **tomma platsen** (rätt) → försvunna saken blir synlig igen, `correct`-ljud + firande, `ctx.progress.complete()` anropas exakt en gång.
- Efter rätt svar startar en **ny runda** inom ~1,5 s (nya/omslumpade saker), och `highestLevel` har ökat.
- Progress sparas: efter rätt svar och sidomladdning är `highestLevel` i localStorage (`pwagames.save.v1`, aktiv profil, spel `vad-forsvann`) ≥ värdet före.
- Dubbeltryck under övergång/firande triggar inte dubbel `complete()` eller fel-flöde (busy-skydd).
- Idle ~6 s i svarsfas → röstfråga upprepas och tom plats pulserar (verifiera via voice-stub-anrop).
- Att lämna spelet mitt i en animation (hem-knapp) kastar inga fel (this._alive-skydd, tweens/ticker rensas).
