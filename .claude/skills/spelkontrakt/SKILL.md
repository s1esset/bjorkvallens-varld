---
name: spelkontrakt
description: Use when writing, reading or changing ANY game module under src/games/. Covers the GameModule contract (metadata + init/mount/destroy), the injected GameContext and services, ProgressApi, exit-safe teardown, the shared toolkit (feedback/scene/DragController/mascot), Pixi v8 gotchas, and the add-a-game checklist. Triggers on - game module, GameModule, ctx, init, mount, destroy, registry, nytt spel, new game, exit-safe, exit-säker, DragController, feedback.js, scene.js, progress.complete, Pixi v8, Graphics, Container, ticker.
---

# GameModule-kontraktet

Ett spel = en mapp `src/games/<id>/` vars `index.js` **default-exporterar ett objekt**.
Skalet når aldrig in i spelet; spelet når världen bara via injicerat `ctx`.
Mallar: **`klambubblor`** (enkelt tap), **`rulla-bollen-hem`** (fysik), **`glittergrottan`** (3D).

## Metadata (statisk — läses av LibraryScreen + AssetService)

```js
id          // ASCII, == mappnamn == bundle, t.ex. "klambubblor"
titleSv     // svensk titel MED åäö, "Klämbubblor"
icon        // emoji till brickan, "🫧"
category    // 'drag'|'larande'|'pedagogiskt'|'roligt'|'fysik'|'pussel'|'motorik'|'minne'
input       // 'tap'|'drag'|'mixed'
ageRange    // [2,4] småbarn · [6,12] storbarn (fliken Utmaning). ETT band per spel —
            // check.mjs vägrar ett ageRange som går över 6. Bandet avgör vilka P0-regler
            // som gäller (CLAUDE.md "P0 per åldersband")
bundle      // Assets-bundle (oftast == id; valfritt)
voiceIntro  // svensk fras som spelas vid mount
```

## Livscykel (anropas av GameHost; alla får vara async)

```js
init(ctx)     // bygg scenen i ctx.stage (bundle redan laddad)
mount(ctx)    // starta: säg voiceIntro, starta ticker, idle-recue
destroy(ctx)  // ta bort lyssnare, gsap.killTweensOf, förstör barn
```

## GameContext

```js
ctx.stage     // spelets rot, redan letterbox-skalad/centrerad i 1280×720
ctx.ticker    // läs ticker.deltaMS / ticker.deltaTime (callback får Ticker-instansen)
ctx.width     // 1280
ctx.height    // 720
ctx.view      // SYNLIG designyta {left,top,right,bottom,width,height} (lib/view.js).
              // På en bred telefon är left<0 och right>1280 (upp till ±240/±160).
              // LEVANDE objekt som muteras vid resize: läs vid ANVÄNDNING (spawn/
              // wrap/cull-marginaler), cachea aldrig fälten, mutera aldrig.
              // Allt som "parkerar utanför skärmen" ska stå utanför ctx.view,
              // inte utanför 0..1280 — annars syns det i bild på telefonen.
ctx.band      // 'sma' | 'stor' — ur ageRange (bandFor i theme.js). Ett basspel som fått ett
              // storbarnsläge (/storbarn) läser den för att veta vilket läge det kör i
ctx.fxLayer   // för konfetti/firande OVANPÅ spelet
ctx.exitToLibrary()
ctx.later(sekunder, fn)  // fördröjt anrop som DÖR med spelomgången — använd i stället
                         // för gsap.delayedCall/setTimeout (se nedan)
ctx.narTyst(fn)          // kör fn när berättaren tystnat, i KÖORDNING (dör med omgången) — för en
                         // replik som ska höras EFTER beröm eller en annan replik
ctx.services  // se nedan
ctx.progress  // se nedan
```

### `ctx.later()` — obligatoriskt för fördröjda anrop

Spelmodulerna är **singletons** (`registry.js` exporterar objekt, inte klasser). En
`gsap.delayedCall` eller `setTimeout` från förra omgången överlever därför `destroy`, och när
samma spel startas igen är `this._alive` åter `true` — vakten `if (!this._alive) return`
**släpper alltså igenom** den gamla callbacken, som kör mitt i den nya omgången (bygger om
rundan, dubblerar objekt, talar fel replik). Fönstret är precis så långt som fördröjningen,
och att gå ut och in snabbt är exakt vad ett barn gör.

```js
ctx.later(1.3, () => this._nextRound(ctx))   // dör automatiskt vid exit
```

`_alive` behövs fortfarande för tweens och andra callbacks — men för fördröjda anrop är
`ctx.later()` det enda som är säkert.

### ctx.services

| Tjänst | Användning |
|---|---|
| `audio` | `sfx(name)` riktigt klipp annars syntes (`pop·pling·correct·match·soft·flip·celebrate·whoosh·reveal·tap`) · `sample('djur_ko')` spelar ENDAST riktigt klipp, returnerar `true`/`false` → falla tillbaka på rösten · `tone({freq,dur,type,vol,slideTo,delay})` stämd blip |
| `voice` | `say('svensk fras')` · `replayLast()` · `cancel()` |
| `assets` | `get(key)` (bundle redan laddad av GameHost) |
| `stickers` | `award/list/has` |
| `profiles` · `save` · `scaler` · `gate` | använd hellre `ctx.progress` än `save` |

### ctx.progress (scopad till aktiv profil + detta spel)

```js
get()                 // { unlocked, highestLevel, stars, custom }
update(patch) · setLevel(n) · addStars(n=1) · setCustom(key, value)
complete()            // ETT tillfredsställande "klart": firande 1–2 s + stjärna + klistermärke
```

Storbarnsspelens poäng och rekord sparas med `setCustom('rekord', …)` / `setLevel(n)` — de
rörs aldrig av ett misslyckat försök (P0 `ALDRIG`: sparade framsteg går inte förlorade).

**`complete()` FIRAR SJÄLV** — vinstljud (`sfx('celebrate')`) + ett slumpat `PRAISE` (i
storbarnsbandet `PRAISE_STOR`) +
`bigCelebration`. Upprepa inte de tre i spelet i samma ögonblick. Värden tål det (ljudet och
regnet spärrar dubbletter i ett 1,5 s-fönster, och berömmet hoppas över om något redan talar),
men koden ljuger om vad som händer. Två regler för rösten runt complete():
- Har spelet en **egen** vinstreplik: säg den **före** `complete()` — då får den stå kvar och
  berömmet utgår. Sägs den efter, kapar den berömmet.
- En replik som ska komma **efter** firandet (nästa rundas instruktion, en reaktion) läggs i
  `ctx.narTyst(() => voice.say(...))`, aldrig på ett fast `later(t)`. Berömklippen är
  1,0–2,3 s och `say()` kallar `cancel()`. Bilden ska inte vänta — bara orden.

## Regler för spelmoduler

- Rita i **designkoordinater 1280×720**. `ctx.stage` är redan skalad — bygg bara barn.
- **Aldrig `localStorage` direkt** → `ctx.progress`. Aldrig egen ljudmotor → `ctx.services.audio`.
- **Åldersbandets regler** (fullt i `CLAUDE.md` "P0 per åldersband"). `ctx.progress.complete()`
  vid ett tillfredsställande "klart" i båda banden.
  - **Småbarn:** ingen synlig poäng, ingen tidspress, inget misslyckande som avslutar eller
    nollställer. **Motgång är tillåten och önskvärd** — hinder som barnet kan anpassa sig runt
    (något blir smutsigt igen, välter, kommer i vägen) gör spelet bättre. De får som mest
    **sakta ner**, aldrig stoppa. Krav: rolig ton, tydlig orsak, går att åtgärda direkt, och
    ett **tak** på hur mycket som kan gå fel samtidigt (t.ex. max 3 aktiva fläckar; därutöver
    missar hindret). Fel/tomma tryck ska vara **roliga** (wiggle + mjukt neutralt ljud).
    Hjälpen får komma själv, sent och synligt.
  - **Storbarn:** poäng, liv, stjärnor, rekord och tidslopp är tillåtna. Ett försök får
    misslyckas → omstart från checkpoint på under 2 s, med tydlig orsak. Svårigheten får
    KRÄVA skicklighet. **Ingen auto-hjälp** — bara ett enkelt tips efter upprepade
    misslyckanden på samma ställe eller på en tipsknapp. Rak, sportslig ton; ett miss får
    synas ärligt ("Nästan!") men aldrig som skam.
  - Båda: aldrig sur summer, rött kryss eller tillrättavisning.
- **Fristående objekt (P0 `ASSETS`).** Rita spelobjekt som riktiga föremål med egen silhuett —
  aldrig en emoji i en `roundRect`. En svamp är en svamp med porer och rundade hörn, inte en
  bricka med 🧽 i. Ge dem eget liv: vilo-guppning (`liv` — egen fas per föremål; `breathe`
  är skala och synkron), reaktion vid tryck (`pop`,
  `wiggle`), skugga för djup. Paneler/kort är till för TEXT och UI-kontroller, inte för
  spelobjekt. Emoji får ligga som detalj *ovanpå* ett ritat föremål, aldrig vara föremålet.
- Talad svenska vid `mount`; reaktion (ljud+bild) på VARJE tryck. Mjuk om-cue vid ~6 s
  inaktivitet — **bara småbarn**; storbarnsspel har inga påminnelser.

### Storbarnsläge av ett befintligt spel = en variantmodul

Byggs **bara** på ägarens begäran, med kommandot `/storbarn <id>`. Varianten är ett eget spel
i registret (egen bricka i Utmaning, egen progress, eget klistermärke, eget test) som ärver
hela livscykeln ur basspelet:

```js
// src/games/<id>-stor/index.js
import bas from '../<id>/index.js'
export default {
  ...bas,
  id: '<id>-stor', titleSv: '<Titel> Proffs', icon: '🎳', category: 'fysik', input: 'drag',
  ageRange: [6, 12],
  voiceIntro: '<egen, kortare instruktion>',
}
```

Metadatan skrivs som LITERALER (check.mjs läser dem med regex, inte med import). Skillnaderna
bor i BASSPELETS fil bakom `ctx.band === 'stor'` — så småbarnsläget är oförändrat.
`check.mjs` godkänner att `init`/`destroy` saknas i varianten när den sprider en importerad bas.
⚠️ Modulnivå-variabler (utanför objektet) DELAS mellan bas och variant — nollställ dem i `init`.

## Exit-säkerhet (den vanligaste kraschkällan)

Spelaren kan lämna mitt i en animation. Två regler:

1. **`this._alive`-flagga** sätts `true` i `init`, `false` i `destroy`. Alla fördröjda callbacks
   (`gsap.delayedCall`, `setTimeout`, promise-then) börjar med `if (!this._alive) return`.
2. **Transienta partiklar** (konfetti, puffar, flytande emoji/text) som skapas *och* förstörs i sin
   egen tween-`onComplete` kan även förstöras av att spelaren går ut — en rå `gsap.to(pixiObj, …)`
   kraschar då på en null-transform. Använd **`lib/feedback.js`** (redan exit-säkra), ELLER tweena
   ett vanligt `{}`-proxy och kopiera till Pixi-objektet bara `if (!obj.destroyed)`, med
   `onComplete: () => { if (!obj.destroyed) obj.destroy() }`.

```js
destroy(ctx) {
  this._alive = false
  ctx.ticker.remove(this._tick, this)
  gsap.killTweensOf(this._things)
  this._root?.destroy({ children: true })
}
```

## Delad verktygslåda — återuppfinn inte detta

| Fil | Ger dig |
|---|---|
| `lib/feedback.js` | `bounceIn·pop·wiggle·shake·breathe·squash·landa·stegra·liv` (egna objekt — döda tweens i destroy) · `puff·sparkle·burst·ripple·bigCelebration·floatText` (självstädande, exit-säkra). `squash(t,{intensity,hop})` = squash-and-stretch (+ hopp), `landa(t)` = landningstryckning, `stegra(list, fx)` = förskjuten start via `ANIM.stagger`, `liv(t,{bob,sway})` = **vilorörelse med egen fas** (gupp + vaggning; `breathe` är skala och synkron). **Handrulla dem inte** — tiderna bor i `ANIM` |
| `lib/scene.js` | `createScene('sky'|…)` bakgrundsvärld + `lerpColor`. **Opt-in (förval `false`, inget spel ändras av sig självt):** `silhuett: 'skog'\|'gran'\|'stad'` ger fjärran- och mellanbandet en trädlinje/stadssiluett (PÅ kullarna, mörkare, disas av disbandet) · `forgrund: true` strån + blomtuvor längst ned i scenroten, alltså BAKOM spelytan (bara teman med `gras`: meadow/sky/warm) · `fro` byter utseende, samma `fro` = samma bild (fast pseudoslump, drar aldrig `Math.random`). Noll texturbakningar, kamerasäker (ritas per lagerbredd; `forgrund` blir ett extra lager). Inget högt bakom skalets knappar: x < 230 kläms till y ≥ 170 — ändå: sätt `groundH` så horisonten ligger lågt. Exporterar även `tradlinje`·`stadlinje`·`slump(fro)`. Mät: `node scripts/_natt-b3-scene.mjs` (Node, räknar bakningar) |
| `lib/kamera.js` | `Camera` — parallaxlager, `follow`/`moveTo`/`panTo`/`shake`/`zoomTo`; världar bredare än rutan (se nedan) |
| `lib/DragController.js` | drag med snäpp / snäpp-tillbaka / **tap-tap-fallback** + `onMiss` — obligatorisk för dragspel. Tyngd ingår (eftersläpning, lutning, landning); `skugga: true` tänder lyft-skuggan — **bara om spelet inte redan ritar en egen skugga under föremålet**. **Ett finger i taget (K2):** greppet minns `pointerId` och ignorerar andra fingrar; ett nytt tryck på samma föremål efter > 2 s utan rörelse avslutar det gamla greppet (samma regler i `AimLauncher`) |
| `lib/pekare.js` | **`pekGrepp(yta, { traff(p,e), ned(p,mal,e), flytta(p,mal,e), slapp(p,mal,{avbruten,utanfor,e}), hitArea?, fastnat? })` → unbinder `av()`** (K3). Ett grepp åt gången med id-vakt; alla lyssnare på EN `static` förälder (`yta`), så ett släpp aldrig tappas på ett syskon; `pointerupoutside` + `pointercancel` ingår, `slapp` kommer exakt en gång efter varje `ned`. `av()` rör inget spelobjekt och anropar inget (exit-säkert); `av.aktiv`, `av.slappa()`. En bar `yta` utan träffbart barn träffas aldrig → ge `hitArea`. Bryggad cancel (K1) syns som `utanfor`. Prov i Node: `node scripts/_pekareprobe.mjs` · `_pekidprobe.mjs` |
| `lib/grepp.js` · `lib/pekspar.js` | **`new Grepp({ phys, yta, kroppar, halo, punkt, tak, kast, tapTap, onLyft, onSlapp, … })`** (G1) — fingret tar tag i en matter-kropp (handen med accelerationstak + `drivPunkt` med krafttak, aldrig ett `Constraint`); tap-tap bär kroppen till ett mål, aldrig en teleport; `destroy()` exit-säkert. **`Pekspar`** (G2) = fingrets spår → `fart()` px/ms eller `null` (samma mätning som `DragController`s `onKast`). Detaljer + API: skill **fysik-spel** · prov: `node scripts/_greppprobe.mjs` |
| `lib/Button.js` | stor barnknapp (hit-halo, studs, ljud) |
| `lib/mascot.js` · `lib/figurer.js` | Bobo som **stillbild** — huvud (`makeMascot`) resp. hel figur (`makeBobo`, `makeElvira`, …) |
| `lib/karaktarer.js` | Bobo som **RIGG**: `makeKaraktar({ r, kropp })` → `setMood('glad'\|'stolt'\|'forvanad'\|'nyfiken'\|'hungrig'\|'ledsen'\|'somnig')` · `react('jubel'\|'hoppsan'\|'nyfiken'\|'hej'\|'nam')` · `look(x,y)` · `blink()` · `idle()` · `destroy()`. **Välj den här när figuren ska REAGERA** — det app-breda mönstret "ingen mottagare/publik" löses här, inte med en egen `_setMood` i spelet |
| `lib/theme.js` | `DESIGN_W/H · FONT · COLORS · PLAYFUL · CATEGORIES · TAB_GROUPS · PRAISE · PRAISE_STOR · bandFor() · SPACING · RADIUS · ANIM · shade() · tint()` |
| `lib/swedish.js` | `asciiFold · AVATARS · shuffle · randomFrom` |
| `lib/physics.js` · `lib/launcher.js` | se skill **fysik-spel** |
| `lib/three3d.js` | se skill **threejs-games** |
| `lib/cooking.js` | delad grädda/grilla-tonmodell |
| `lib/variation.js` | **Omspelning utan att svårigheten flyttar sig** (allt via `Math.random`). `pase(lista, forra?)` → påse; `.nasta()` ger varje post exakt en gång per varv, aldrig samma två i rad (även över varvsgränsen) — för INNEHÅLL (motiv, sorter, djur, regler); skapa den i `mount()`. `nastaVariant(lista, forra)` = lotta men aldrig förra (id, värde eller post) — när inget ska "tas slut". `slumpIBand(mitt, spann, {heltal, steg, golv, tak, forra})` = slump runt nivåns värde (`spann` = ±tal eller `{min,max}` som avstånd) — för LAYOUT/SVÅRHET i stället för `mitt` rakt av; golv/tak klipper bandet före dragningen. `rundprofil(runda, forra?)` → `{sida,a,b,c}` (a/b/c 0..1, minst 0,25 från förra) när nivåvariationen tar slut vid taket. Mät: `node scripts/_variationprobe.mjs <id> --expr "g._fält" --n 6` → `olika: k av n` (1 av n = fortfarande fast); logik: `node scripts/_variationtest.mjs` |

### Värld bredare än rutan → `lib/kamera.js`

Kameran äger inga spelobjekt, bara **lager**. Faktor 0 = fastspikat i skärmen, 1 = spelarens
plan, däremellan = bakgrund som glider långsammare. Bygg i faktor 1 och tänk i
världskoordinater.

```js
this._kam = new Camera({ worldW: 3200 })
ctx.stage.addChild(this._kam.root)
this._kam.adopt(createScene('meadow', { kamera: { bredd: 3200 } })) // scenens djupband
this._varld = this._kam.parallax(1)                                  // allt spelbart här
this._kam.follow(this._figur, { lead: 90, deadzone: 140 })
this._kam.attach(ctx.ticker)
// destroy(): this._kam.destroy()   ← river lager OCH ticker-callbacken
```

- **Pekpunkter:** `this._varld.toLocal(e.global)` — lagren är riktiga containrar, ingen egen
  omräkning behövs.
- **Flyttar du figuren långt på en bildruta** (ny runda, respawn): anropa `moveTo()` i samma
  andetag, annars rycker bilden med (kameran släpper aldrig målet ur bild — medvetet val).
- **`worldW` == vyn ⇒ kameran är en no-op.** Adoptera den utan att bygga en större värld och
  bilden blir exakt som förut.
- Scenens parallax är **i sidled**; horisonten ligger still i höjdled. Egna lager
  (`parallax(f)`) rör sig på båda axlarna. **Vill du panorera i höjd** (`worldH` > 720) duger
  därför inte `adopt(createScene(...))` — marken följer inte med och figuren glider av den.
  Kameran varnar i DEV; rita egen bakgrund i ett `parallax()`-lager i stället.
- Zoom är klämd till [1, 1.6] och tar alltid ≥0,5 s. Zoom-ut under 1 kräver att bakgrunden
  ritas med marginal åt båda håll — sätt `minZoom` själv och rita därefter.

## Pixi v8-fallgropar

- `await app.init({…})`; canvasen är `app.canvas`. `eventMode`, inte `interactive`.
- Graphics är flytande och **form-sedan-färg**: `g.roundRect(…).fill(c).stroke({width,color})`.
  `g.clear()` nollställer.
- **Bar Graphics ritad i origo + stor `.position` renderas som helskärmsstapel** — baka in
  geometrin centrerad i en container istället. (Sedd bugg i `sortera-skrap`.)
- Text: `new Text({ text, style: {…} })`, `t.anchor.set(0.5)`.
- Knappar/brickor: `pointertap`. Drag: `globalpointermove` på objektet (överlever att fingret
  lämnar spriten). Dekorlager: `eventMode='none'` + `interactiveChildren=false`.
- Perf: atlas framför lösa texturer; undvik filter/blur/skuggor; explicit `hitArea`;
  förstör/avlasta vid exit; `app.ticker.maxFPS = 60`.

## Lägga till ett spel

1. `src/games/<id>/index.js` — default-exportera en GameModule (`id` ASCII == mappnamn).
2. Välj `category` ur `CATEGORIES` (styr brickans färg) + en `icon`-emoji, och **åldersband**
   via `ageRange` ([2–5] småbarn → kategorins flik · [6–12] storbarn → fliken Utmaning).
3. Bygg i `init`, tala i `mount`, riv i `destroy`.
4. Dragspel → `lib/DragController.js`.
5. Registrera: import + rad i `src/games/registry.js`.
6. Egna assets → `public/assets/games/<id>/` + `assets.registerBundle('<id>', manifest)`.
   Icke-CC0 loggas i `ASSET_LICENSES.md`.
7. `npm run check` (kontrakt + P0) och `npm run test <id>` (headless, 0 fel) innan commit.

### Minimal skelett

```js
import { Container } from 'pixi.js'
export default {
  id: 'mitt_spel', titleSv: 'Mitt Spel', icon: '🎈',
  category: 'roligt', input: 'tap', ageRange: [2, 4], bundle: 'mitt_spel',
  voiceIntro: 'Tryck på ballongen!',
  init(ctx) { this._alive = true; this._root = new Container(); ctx.stage.addChild(this._root) },
  mount(ctx) { ctx.services.voice.say(this.voiceIntro) },
  destroy() { this._alive = false; this._root?.destroy({ children: true }) },
}
```

## Tysta fällor (flyttade hit ur CLAUDE.md 2026-10-02 — indexet står kvar där)

- **Ett släpp når ALDRIG ett syskon — och en bubblande förälder måste vara `static`.** Har ett
  spel TVÅ greppytor måste `pointerup`/`pointerupoutside` sitta på deras gemensamma FÖRÄLDER.
  Pixis båda släppvägar går uppför en föräldrakedja, aldrig i sidled: `mapPointerUp` bubblar
  längs SLÄPP-MÅLETS kedja och `mapPointerUpOutside` bara uppför **pressTargets egen**
  (`EventBoundary.mjs:559,634`). `skattjakt-i-morkret` lyssnade på `_catcher` medan ficklampan
  bodde i `_front` — ett syskon — så greppet på lampan släpptes aldrig: `_drar` stod kvar `true`
  och `_pekId` på ett dött finger-id, och eftersom varje ny fingerpekning får ett **nytt**
  pointerId avvisades allt därefter som "andra fingret". **Permanent död träffyta utan ett enda
  konsolfel**, grönt test hela tiden — bara en pekare med två olika id:n hittar den.
  ⚠️ Andra halvan var inte gratis: `notifyTarget` (`:370`) bortar tyst på allt som inte är
  `static`/`dynamic`, så en bubblande förälder på default `'passive'` får **ingenting** — utan
  `eventMode = 'static'` fastnade även kontrollarmen. En bar `Container` utan `hitArea`
  träfftestar ändå alltid falskt, så roten blir inte själv ett träffmål av raden.
- **Egna fält på ett Pixi-objekt får inte heta som Pixis egna.** `f._cx = x` såg ofarligt ut,
  men `_cx`/`_cy`/`_sx`/`_sy` är Container-transformens interna cache: `lt.a = _cx * scale.x`.
  Snöbollens snöfält renderades därför med vågrät skala 3660 — osynliga, utan ett enda
  konsolfel. `check.mjs` felar numera på hela namnlistan; använd ett eget prefix (`_wx`).
- **`Graphics.arc()` drar ett streck från PENNAN till bågens start.** ⚠️ *Rättat 2026-09-23:*
  inte "när ingen moveTo står före" — en färsk Graphics eller en efter `clear()` ritar rent.
  Fällan är att `arc()` fortsätter en ÖPPEN väg, och Pixi 8.19 lämnar pennan kvar på två sätt:
  ⓵ efter varje `fill()`/`stroke()` sår den nästa väg med `moveTo(förra vägens sista punkt)` —
  efter en SLUTEN form (circle, rect, ellipse …) är den punkten **origo** (`getLastPoint` har
  inget fall för den); ⓶ två kedjade bågar `g.arc(A).arc(B)` får ett streck mellan sig.
  `kugghjulen`s Elvira fick en gul kil över ansiktet, gungans Lova ett streck genom kroppen,
  `rulla-bollen-hem` ett 172 px streck från skärmens hörn — i varje skärmdump, noll konsolfel.
  **Använd `bage(g, cx, cy, r, a0, a1, ccw)` ur `lib/form.js`.** En tårtbit skriver
  `moveTo(mitten).arc(…)` själv (sapbubblornas fläktblad) — därför lappas inte Pixi centralt.
  Mät med `scripts/_bagprobe.mjs` (körtid, penna → start per båge; `_bagscan.mjs` är bara
  statiska kandidater, 88 st varav 32 var äkta). Latent: en båge direkt efter en båge sås med
  (undefined, undefined) — Pixi läser `data[5..6]` av sex argument — och den ritar i dag
  ingenting (`_bagnanprobe.mjs`). Rättar Pixi sin bugg vaknar ~15 bågloopar; **kör `_bagprobe`
  efter varje Pixi-uppgradering.** → ÅTGÄRDER V23.
- **`renderer.generateTexture()` fäller hela testsviten, inte spelet.** Att baka en form till en
  textur byter rendermål mitt i en bildruta. Ensamt syns inget; i `npm run test:all` (72 spel,
  fyra parallella webbläsare) gav det **`tom-scen` i 5 av 7 körningar mot 0 av 7 på HEAD**, plus
  "WebGL context could not be created" i `glittergrottan`. Att baka tidigt vid uppstart hjälpte
  inte. **Rita formen med Canvas2D i stället** — det rör inte GL-tillståndet och behöver ingen
  renderare. Samma regel gäller nästa gång något vill baka: fråga först om Pixi behövs alls.
- **Ett vilande `ParticleContainer` på `fxLayer` dör aldrig.** `fxLayer` lever hela appens
  livstid, så ett fält som cachas där behåller sina GPU-buffertar för alltid. Med kvarliggande
  fält flakade sviten 1 av 3; med `stad()` som river tomma fält: 0 av 4. Allt som cachas på ett
  app-långlivat lager måste kunna rivas när det är tomt.
- **En `new FillGradient` per scen/objekt destabiliserar sviten precis som `generateTexture`.**
  Varje gradient bakar en egen duk och laddar upp en textur — sker det vid varje montering
  gav det `tom-scen` i 1 av 3 rundor mot 0 av 3 på HEAD. **Cacha varje gradient per färg**
  (`lib/form.js`, `scene.js`); en scen ska göra NOLL texturbakningar när den monteras.
- **En radiell gradient kan inte ha genomskinlig mitt.** `buildRadialGradient` fyller först
  HELA duken med sista färgstoppet och ritar gradienten ovanpå — en genomskinlig källa raderar
  ingenting i source-over. En vinjett byggd så blir en **jämn** mörkning över hela ytan
  (uppmätt: himlens mitt [176,227,250] → [146,189,208], samma faktor överallt). `buildLinear-
  Gradient` har ingen sådan förifyllning: bygg kanttoningar av **linjära** gradienter.
- **Radiella gradienter kostar 256× linjära.** Pixi bakar en linjär till `256×1` (~1 KB) och en
  radiell till `256×256` (~256 KB). Ikonbiblioteket låg på 15,3 MB innan `textureSize: 64`
  tog ner det till 1,0 MB — utan synlig banding ens på 300px. Mät med `_ikonkostnad.mjs`.
- **Animera aldrig containern som `addTarget` fick — det flyttar snäppytan.** `DragController`
  mäter avståndet till `target.view.x/y` **när saken släpps**. `sortera-skrap`s tunnor fick en
  tyngdkänsla som sänkte dem upp till 13 px i guppet, och då flyttade målet undan sig självt
  mitt i ett släpp: loggfyndet `snal-snappyta` (släpp **2 px** utanför radien). Samma sak gäller
  `hitArea`, som sitter på samma nod. **Animera i ett BARN** — då står både släppmål och
  träffyta still medan bilden rör sig. Sonden såg det inte; `test:all`-loggen gjorde det.
- **En ringbuffert av tweens dödar den EVIGA tweenen först.** `Ansikte._track` höll 24 tweens
  och kastade den ÄLDSTA när listan blev full — och den äldsta är `liv()`s oändliga andetag,
  som registreras vid uppstart och aldrig tar slut av sig självt. Med bara tugg och miner
  räckte 24 platser länge; med huvudgester (en nick per min, ett ryck per bus) fylls de på en
  halv minut, och ansiktet slutar andas **utan ett konsolfel**. Uppmätt med den gamla koden
  inlagd som kontrollarm: **1,66 ‰ svängning före 40 gester → 0 ‰ efter**. Rensa FÄRDIGA
  tweens i stället för de äldsta, och skydda `repeat: -1`. Samma fråga gäller varje tak på en
  lista av levande saker: är det yngsta eller det VIKTIGASTE som ryker?
  — **och den rättningen läckte i sin tur.** `isActive() || totalProgress() < 1` kan inte
  skilja LEVANDE från DÖDAD: en dödad `repeat: -1`-tween ger `isActive() === false` men
  `totalProgress() === 0`, alltså < 1, och slapp igenom filtret — medan while-loopen hoppade
  över allt evigt och aldrig kunde vräka den. `liv()` anropas en gång per tugga, så listan
  växte med **en permanent död post per tugga** (uppmätt 1 → 33 över 60 tuggor). Vid mättnad
  dödades LEVANDE tweens: en hel grimaslapp frös på alfa 1 med `visible: true` medan en annan
  min var aktiv — **två ansikten på en gång, permanent, med noll konsolfel**. Måttet som
  faktiskt svarar är **`tw.parent`** (sann för löpande OCH väntande, falsk för både färdiga
  och dödade — `_tweenprobe.mjs` prövar alla lägena). Och samma fråga gäller varje flagga som
  betyder "lever": `if (this._blinkTimer)` frågade om fältet var SATT, inte om timern LEVDE.
- **`killTweensOf(figuren)` når BARA figurens rot — barnbarnen städas aldrig.** Armar som
  vinkar, ögon som kisar och en del som studsar in ligger en nivå längre in, och en rivning
  som bara tar roten lämnar dem levande. I `bygg-en-kompis` hann en vinkning (0,72 s) nästan
  alltid vara igång när nästa knapp rev figuren; harnessen larmade `tween-mot-forstort`, men
  **sonden var helt tyst** — gsap skriver bara på en nollad transform och Pixi v8 kastar
  ingenting. "0 konsolfel efter exit" är alltså blind för precis den här läckan (fyra
  exit-tider gav 0 fel i BÅDA armarna). Ge sammansatta figurer en städhjälpare som tar alla
  animerade innernoder och kalla den före varje rivning — även för kopior i ett galleri.
  **Mät den:** plocka undan innernoderna i en array FÖRE `destroy()` och räkna
  `gsap.isTweening` efteråt (uppmätt **2 → 0**). Sonden måste använda SPELETS gsap — en
  nyimporterad kopia har en egen global tidslinje och rapporterar 0 oavsett vad som pågår
  (hämta url:en ur `performance.getEntriesByType('resource')`).
- **Konstens utbredning och träffytans utbredning är två olika budgetar.** `bygg-en-kompis`
  vingar var måttade mot kamerans synliga STATIV — men kamerans `hitArea` börjar 100 px till
  vänster om benen, så vingspetsen låg **inne i kameraknappen** och ett tryck på den tog
  kortet i stället för att kittla. Ingen skärmdump visar det, `check.mjs` mäter ingen geometri
  och en `hitArea` ritas aldrig. Ritar du nära en knapp: mät mot grannens **hitArea**, läs
  spetsen ur den RITADE geometrin (`getBounds()`, inte ett tal i sonden — en hårdkodad spets
  rapporterade samma tal efter att vingen krympts) och peka med riktiga muspekningar i varje
  skalläge. Och P0-avståndet vinner: rätt fix var att krympa vingen, inte att vidga ytan.
