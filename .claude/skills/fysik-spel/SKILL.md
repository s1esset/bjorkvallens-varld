---
name: fysik-spel
description: Use when building or changing physics-based games in this repo. Covers choosing between the engines (own ticker integrator / matter.js / SPH-vätska) and three.js for 3D, PhysicsWorld (bodies, MATERIALS, wind, gravity, collisions, fixed timestep, exit-safe destroy), AimLauncher (drag to aim + power with live dotted trajectory preview), the measured preview-calibration constants that make the preview match the real flight, goal-based no-fail design, and which existing game to copy. Triggers on - fysik, physics, matter, matter-js, motor, engine, PhysicsWorld, AimLauncher, trajectory, bana, sikte, slingshot, gravity, gravitation, wind, vind, restitution, studs, bounce, collision, kollision, spring, fjäder, constraint, led, predictTrajectory, previewGravity.
---

# Fysikspel (matter.js · egen integrator · SPH-vätska)

## Välj motor FÖRST — de här är verktyg, inte en rangordning

| Motor | Nå efter den när | I repot |
|---|---|---|
| **egen ticker-integrator** | banan ska vara **exakt förutsägbar**: parabelhopp, styrd bana, partiklar, en förhandsvisning som måste stämma på pixeln | `golvet-ar-lava` (hoppbåge + lavabubblor), `fyrverkeri` (egen `GY`) |
| **matter.js** | *stelkroppsvärlden*: staplade lådor, kedjereaktioner, studs, rullande bollar, kast med sikte | `src/lib/physics.js` → **23 spel**, varav 8 med `AimLauncher` |
| **three.js** | 3D-scenen bakom Pixi | `src/lib/three3d.js` → `glittergrottan`; se skill **threejs-games** |
| **vätska** | det som **rinner, skvalpar, fyller och stänker**: vatten, saft, gegga, honung, lava | `src/lib/vatska.js` (`FluidWorld` + `FluidView`) → `saftbaren`, `vattenvagen`, `golvet-ar-lava` |

Regler som gäller alla:

- **Ett spel = en motor.** Blanda aldrig två fasta tidssteg i samma modul — två solvers som
  driver samma vy ger skakningar som är omöjliga att felsöka. (Vätskan är undantaget som
  bekräftar regeln: den simulerar bara sin egen partikelsvärm och läser matter-kärlen som
  statiska kanter.)
- **Enklast som duger vinner.** Behöver du bara en parabel: skriv parabeln. En fysikmotor för
  ett förutsägbart hopp gör bara utfallet slumpartat, och no-fail svårare att garantera.
- **Exit-säkerhet gäller motorn med.** Skriver du en ny solver: kopiera `PhysicsWorld`s
  kontrakt — fast tidssteg i `update(deltaMS)`, `link(body, view)`, och en `destroy()` som
  nollar världen OCH släpper alla vy-referenser. En halvstädad fysikvärld överlever ett
  spelbyte och läcker.
- **`p2-es` finns INTE längre i repot** (borttagen 2026-08-09, LYFTPLAN rad 12). Den låg som
  beroende i två månader utan en enda import, och ett dokumenterat teknikval som ingen kod
  använder är en lögn om appen. Behöver ett framtida spel det matter är dåligt på — mjuka
  fjäderleder, kontinuerlig kollision för små snabba kroppar — så finns tre vägar, i den här
  ordningen: (1) matters egen `Constraint` med `stiffness`/`damping`, (2) en egen verlet-lösare
  i `src/lib/` (samma mönster som `vatska.js`), (3) återinför p2-es **i samma commit som det
  spel som faktiskt importerar den**, aldrig före.

## matter.js

`src/lib/physics.js` (`PhysicsWorld`) + `src/lib/launcher.js` (`AimLauncher`).
Mallar: **`rulla-bollen-hem`** (top-down minigolf, underlagsväxling), **`spindelhjalten`**,
**`enhorningen-elvira`**, **`bajs-och-kiss`**, **`fanga-frukten`** (fånga), **`bygg-tornet`**
(lyftkran-släpp/stapling), **`plask-i-vattnet`** (flyta/sjunka), **`mata-monstret`** (4 lägen).

## PhysicsWorld

- Kroppsfabriker `circle/rectangle/polygon` som tar fulla matter-opts.
- `MATERIALS`-presets: `bouncy · normal · heavy · light · sticky` → restitution/density/**mass**/
  friction/frictionAir.
- `setWind(ax, ay)` (kraftfält) · `setGravity(y, x?)`.
- `link(body, view)` — Pixi-vyn följer kroppen.
- `onCollision(cb)` — matcha på `body.label`. Skickas FÖRE hastighetslösaren, så en fart du
  ändrar där är den lösaren räknar på (det är så `Fjaderbrada.taEmot` sväljer ett anslag).
- `beforeStep(cb)` — EN gång per fast steg, inte per bildruta. Allt som spelet självt driver med
  en fart (fjäderbräda, hiss, åra) måste röra sig i matters takt: farten är px/STEG och en
  bildruta rymmer 1–5 steg.
- **Kraftfält per fysiksteg (T1):** matter nollar krafterna efter varje steg och en bildruta har 0–2
  steg, så en kraft som läggs per BILDRUTA blir 0/1/2× för stark (flyt-1,6-jämvikt 0,625 → 0,656 vid
  57 fps → 1,000 vid 30 Hz). `new Flytvolym({ varld: phys, … })` registrerar sig SJÄLV i
  `phys.beforeStep` (egen stegklocka för gupp/vaggning) — kalla ALDRIG `steg(t)` (no-op + dev-varning);
  `perSteg: false` eller en rå matter-Engine ger gamla per-bildruta-vägen. `destroy()` avregistrerar.
  **`lagg(body, { sparr: 'vatten' })` (R4, opt-in):** fartspärren (`maxFart`) och `vridDamp` gäller bara när
  nedsänkningen > 0; förval `'alltid'` = spärr även ovanför ytan (tunnlingsskyddet, oförändrat).
  Ovanför ytan finns då INGEN spärr — spelet äger tunnlingen (`hog-fart`). OBS grodan-slurp ska INTE
  använda den utan mer: grodans delar ligger i volymen även på land, och där bär `vridDamp` 0,9 den
  inställda ragdoll-känslan (vanligt hopp 188,9 → 192,2 px, studs 4 → 7 steg i `_superhoppprobe`).
  Mät: `node scripts/_sparrprobe.mjs`.
  Egna kraftfält (`Magnetfalt.dra`, simning, knuffar): lägg dem i `phys.beforeStep` (spara unbindern,
  kalla den i `destroy`); ljud/bild/röst sätter en flagga i steget och löses in i tickern, ett fält
  per kropp. Mät: `node scripts/_flytsteg.mjs` (Pixis Ticker vid 30–90 Hz, kontrollarm = HEAD-kopian).
- `update(deltaMS)` fast tidssteg · exit-säker `destroy()`. **Ackumulatorsnäpp (T4, gäller även
  `FluidWorld.update`):** en bildruta inom 0,5 ms från 16,67 ms räknas som exakt ett steg. Utan det
  slår vsync-jitter (±0,1 ms) restens tröskel fram och tillbaka → 32 % noll- och 34 % dubbelstegsrutor
  vid 60,00 Hz (ryck), med snäpp 0 / 98 / 2 %. Andra bildtakter (30/45/50/90/120 Hz) steg som förut,
  bildruta för bildruta. 57 fps går alltså numera på 60 Hz-fysik. Mät: `node scripts/_snappmatt.mjs`.
- ⚠️ `restitution` på en **statisk** kropp är nollad av `Body.setStatic` — se fällistan i
  CLAUDE.md. Studsen blir alltid den dynamiska kroppens egen. **Ska ytan studsa: `{ isStatic:
  true, studs: 0.75 }`** — opt-in, sätts efter `setStatic` och bärs även av `_original`, så en
  kropp som väcks behåller den. Uppmätt: 4,7 → 143,3 px hopp mot en `heavy`-kropp.
  De gamla talen är fortfarande nollade med flit (`npm run check -- --studs`); de som aldrig
  kunde göra något ens väckta är strukna (2026-09-12).
  ⚠️ **`studs` väcker BARA studsen — friktionen står kvar på 1.** Paret tar `min` av
  friktionerna, alltså den rörliga kroppens egen, och en studs med hög friktion äter farten
  LÄNGS ytan. `bowling`s kantstöd: pricklinjens fel 214 px idag → 79 px med bara `studs` → 9 px
  när räckets deklarerade 0,1 också sattes tillbaka. Ska en förhandsvisning stämma mot en
  studsande statisk yta: sätt båda. Mätt i `node scripts/_studsprobe.mjs` §7.
  **R3: `{ isStatic: true, studs: 0.75, friktion: 0.1 }`** — samma opt-in för friktionen (sätts efter
  `setStatic`, bärs av `_original`; `bowling`s räcke använder den, bit-identiskt mot handraden).
  Ett deklarerat `friction` på en statisk kropp gör INGET (`npm run check -- --studs` listar dem);
  den rörliga kroppens egen friktion är taket (`min`), så läs den först (flipperspels kula står på
  0,02 — dess statiska 0,02/0,05 är redan no-ops). `_buildWalls`-väggar = restitution 0 · friction 1.
  Matters friktion håller en kloss stilla på en lutning redan vid 0,01 — mät glid på platt yta + knuff.
- **R5/R6 (physics.js, opt-in, förval = dagens):** `new PhysicsWorld({ iterationer: { position, fart,
  villkor }, sova })` (utelämnat tal = matters 6/4/2; `sova` bara om en mätning visar vilokryp — en
  sovande kropp utan stöd hänger kvar, `_fysikbank` S1). `phys.fartTak(body, max|null)` klämmer
  före OCH efter varje fast steg (S3: bara efter-steget släpper igenom en kick intill en vägg).
  `phys.paKontakt('kula', 'kagla', (kula, kagla, par) => …)` båda ordningarna, etikett ur
  `part.parent` (en handmatchning på delens etikett missar sammansatta par: 39 av 139).
  `phys.konvex(punkter, opts)` (hörn exakt på punkterna; konkav → konvext hölje, ingen varning) ·
  `phys.sammansatt(delar, opts)` · `phys.grupp()` — alla genom `_make`, alltså väckbara och med
  `studs`/`friktion`. Mät: `node scripts/_fysikbank.mjs --bara S1,S3,S10`.
- **R2 kinematisk (physics.js, opt-in):** `const k = phys.kinematisk(body, { maxFart: 12, maxVinkel, avvikelse })` →
  `k.till(x, y, vinkel?)` (målet — kroppen går dit i fysiksteget med `setPosition(…, true)`, förflyttningen ÄR
  farten, klämd till `maxFart` px/steg; `setVelocity(0)` + `setAngularVelocity(0)` när den står still) ·
  `k.flytta(x, y)` (bär utan kastkraft) · `k.stopp()` · `k.bas`/`k.mal`/`k.vilar` · `k.destroy()` (världen river
  den ändå; `removeBody` också). `avvikelse: () => ({x, y})` läggs OKLAMPAD ovanpå basen — för en Fjaderbrada
  (`avvikelse: () => { fj.steg(); return { x: 0, y: fj.komp } }`). Ersätter teleport-per-bildruta av statiska
  kanter: mätt i `_fysikbank` S8 (40 px/ruta genom 12 fallande bollar: teleport 12 IGENOM, mötesfart 1,6 →
  kinematisk 0 IGENOM, mötesfart 15,9). Kroppen märks `_kinematisk` så fallvakten (`statisk-fart`) litar på den.
  Mönstret för en studsmatta/trampolin i ett spel: `src/games/studsmatta/matta.js` (mät: `_studsmattaprobe.mjs`).
- **F3 brytbar (physics.js, opt-in):** `const h = phys.brytbar(body, { grans: 6, bitar: 6 | (body, {w,h,cx,cy}) => [{dx,dy,r}],
  livstid: 3, tak: 12, utkast: 1, tona: 0.6, filter: (annan, par) => bool, onBryt({ kropp, bitar, x, y, fore, efter }),
  onTona(bit, alfa), onBort(bit) })` · `h.bryt()` (tvinga) · `h.bruten` · `h.bitar` · `h.ta()` · `phys.brytBitar`. Kontakt över `grans`
  (NORMALfart före lösaren, som `onImpact`) köar kroppen; i `beforeUpdate` av NÄSTA steg byts den mot RUNDADE cirkelbitar som
  ärver `v + ω × r` + utkast (≤ 2 px/steg), Σm = kroppens massa, rörelsemängden bevarad EXAKT (`_fysikbank` S9: 0,0000 %).
  Skapa bitarnas vyer i `onBryt` (`phys.link(bit, vy)`), `onTona` sätter alfa, `onBort` river vyn. Världen håller högst `tak` bitar
  (de äldsta viker). Bitarna är inskrivna i kroppens yta (ingen föds i en vägg) — ge egen `bitar`-funktion för en icke-rektangel.
  Kunder: `knuffa-tornet` (glas → godisbitar) · `snobollen` (snögubben → snöklumpar).
- **Fjäderbräda som studsyta (P1):** kaninen måste ÅKA MED brädan ner (`setVelocity(y: fj.kompFart)` efter `taEmot`) —
  annars är kontakten borta när brädan vänder och kastet blir 4 i stället för 14 px/steg; `overslag` 0,6 (förval
  0,3 klipper utkastet till 0,84 ×); sätt kaninens `restitution` 0; ett tryck får aldrig laddas OVANPÅ en landning.
- `predictTrajectory(…)` + re-exporterade `Body` / `Composite` / `Vector`.

## Material som LÅTER (`MATERIAL` + `onImpact` / `impactAudio`)

Två tabeller som svarar på olika frågor. `MATERIALS` beskriver **rörelse** (bouncy · normal ·
heavy · light · sticky). `MATERIAL` beskriver **ämne** — `tra · metall · sten · gummi · glas` —
och bär både fysik och en **röst**.

```js
import { PhysicsWorld, mat } from '../../lib/physics.js'

// mat() lägger DINA tal sist: materialet ger identitet + röst, aldrig en omtuning.
const body = this._phys.rectangle(x, y, w, h, mat('tra', { friction: 0.4, label: 'bricka' }))

// En rad ger hela spelet hörbar tyngd — hårdare anslag = högre OCH ljusare.
this._phys.impactAudio(ctx.services.audio, { hardSpeed: 11 })

// Vill du ha partiklar med: kontaktpunkt + styrka (0–1) + materialets träff-färg.
this._unbindSlag = this._phys.onImpact((h) => {
  if (h.styrka > 0.5) puff(ctx.fxLayer, h.x, h.y, { count: 5, color: h.traff })
})
```

- **Rösten är `audio.tone()`, inte ett klipp.** Ett klipp har EN dynamik och kan inte bli
  mjukare när träffen är mjuk — och repot har inga klipp som heter `knack`/`duns`/`klirr`.
- **Taket är inbyggt och ska inte tas bort:** max 3 anslag/bildruta + 28 ms mellan toner
  (väggklocka, inte bildrutor). Utan det blir ett ras ett skrik, inte en duns.
- **Mät med `node scripts/_slagprobe.mjs`** — fart→volym/tonhöjd, materialens röster, taket
  och exit-säkerheten, allt utan webbläsare.

## AimLauncher

Den återanvändbara **"dra för att sätta riktning + kraft, med levande prickad bana"**-kontrollen.
`slingshot` (dra bakåt) eller kast. Tap-fallback siktar mot `defaultAim` — obligatorisk för
under-4-år. `setWind` / `setPreview` håller förhandsvisningen ärlig.

### Skuggvärlden (AimLauncher, G3a)

- **`new AimLauncher({ …, skuggvarld: { varld: phys, kula: ballBody, filter?, vindMinFart? } })`** (opt-in; utan nyckeln är banan byte-för-byte `predict()`). En liten matter-motor DELAR världens statiska kroppar (deras `studs`/`friktion`, ramper, räcken — och en kropp som läggs till/tas bort följer med) och kör en provkula med den riktiga kulans tal, LIVE (restitution, friktion, frictionAir, låst tröghet). 64 motorsteg, en prick var 3:e; gravitationen läses ur `varld.engine.gravity` (utan `varld`: `kroppar: () => Body[]` + `previewGravity`). `previewDamp`/`bounds` blir reserv om motorn faller.
- **Uppmätt (`node scripts/_skuggprobe.mjs`): 0,0 px fel mot verklig bana** (bowling HEAD 298 → 0; rulla-bollen-hem HEAD 1 072 → 0, alla yta/boll/vind-varianter), 0,03 ms per omritning (24 statiska: 0,05). Högst en omräkning per bildruta; sista fingerläget köas till nästa bildruta.
- **`filter(b)`** väljer kroppar (rulla-bollen-hem: bara `'wall'` — hindren är medvetet inte med i pricklinjen). Sensorer är aldrig med, utom med `forhandsStopp`.
- **`{ forhandsStopp: true }`** på en kropp med egna impulser (studsmoln, flipperdyna): den tas med och banan SLUTAR vid kontakten i stället för att ljuga. Spelets egna kraftfält (en `beforeStep`-knuff) syns inte i skuggvärlden — markera dem.
- Riv: `AimLauncher.destroy()` river motorn (`Skuggvarld.destroy()`); en egen `Skuggvarld` kan även användas fristående (`bana(x, y, vx, vy, { gy, wx })` → `[{x,y}]` eller `null`). Kula som matter-kropp läser `circleRadius`; en plain `{ r, restitution, … ineria: Infinity }` går också.

## Rep och kedjor (`src/lib/rep.js`)

Verlet-tråd (PBD) för allt långt och böjligt: slangar, nätlinor, svingar, vinschar, kedjor.

```js
const rep = new Rep({ n: 20, seg: 42, grav: 0.62, damp: 0.93, golv: 620 })
rep.bygg(x, y, (i) => (i < 3 ? -0.3 : 0.78))   // startform
rep.tyngd(rep.sista, 3.2)                       // tungt munstycke → dinglar nedåt
// varje bildruta:
rep.fast(0, ANCHOR.x, ANCHOR.y)                 // fästpunkten
rep.dra(rep.sista - 1, finger.x, finger.y)      // greppet följer handen
rep.steg(dtF)
ritaRep(g.clear(), rep, { width: 12, color: 0x3a7d44 })
```

- **Två lägen:** fast `seg` (egen längd, tar mjukt stopp) eller `spann(ax,ay,bx,by,sag)`
  (vilolängd ur avståndet; `sag < 1` spänt, `> 1` slakt och hängande).
- **Kedjan kan inte tänjas.** Efter relaxationen kör ett strikt längdpass i två riktningar
  (FABRIK). Utan det blev en kedja med vilolängd 760 px **2870 px** lång vid ett hårt drag;
  med bara ett enkelriktat pass 546 px (den ångrade draget). Rör inte det passet.
- `rackvidd(x, y)` klipper ett mål till kedjans längd — slangen ska ta stopp, inte tänjas.
- **`MeshRope` finns inte än:** den kräver en textur, och `generateTexture()` destabiliserar
  sviten (se LYFTPLAN C2/C3). `ritaRep()` ritar i stället repet som ett MATERIAL med tre drag.
- **Mät med `node scripts/_repprobe.mjs`.**

## Mjuka kroppar (`src/lib/mjukkropp.js`)

Saker som sjunker ihop, buktar och tar tillbaka sin form. En ring av punkter + en mittpunkt,
hållna av avståndsvillkor OCH ett tryckvillkor.

```js
const m = new Mjukkropp({ w: 40, h: 52, punkter: 14, grav: 0.34 })
m.fast(m.mitt, 0, 0)      // pinnen går IGENOM marshmallowen → fast mittpunkt
m.mjukhet(rostning)       // 0 = fast, 1 = nästan rinnande
m.steg(dtF)
m.path(g.clear()).fill(col).stroke({ width: 3, color: edge })
```

- **Trycket verkar längs kantens NORMALER, inte längs radien.** En radiell puff är ingen
  volym utan en formåterställare — den drar formen mot en cirkel och håller emot precis den
  tillplattning mjukheten ska ge. Rör inte den detaljen.
- **`mjukhet()` sänker BÅDE styvhet och tryck.** Fast omkrets + fast area = i praktiken en
  stel kropp (isoperimetri); med bara sänkt styvhet sjönk en "helt mjuk" kropp 0,7 px.
- **Mät med `node scripts/_mjukprobe.mjs`** — och mät rätt sak: underkantens absoluta läge
  blandar ihop hoptryckning och dropp. Använd massans läge i förhållande till fästpunkten.
- Första kund: `lagerelden`. Sedan `glasstornet` (kopans wobble) och `fjader.js` (plankans
  silhuett). Väntar: `sapbubblor` · `mata-monstret` · `hamburgerbygget` · `pruttbad`.
- **En kropp, N lager.** Ett föremål byggt av flera lager (skugga, band, glans) måste ritas ur
  SAMMA kropp med `path(g, skala)`, annars glider lagren isär i deformationen. Och allt som
  SITTER FAST i kroppen (en fjäder under en planka) ska läsa kroppen — `Fjaderbrada.undersida(x)`
  finns just därför — inte räkna på skalären som driver den.

### Mjuk kropp som mesh (`src/lib/mjukmesh.js`, O1)

- `mjukMesh(kropp, { farg, tathet = 3, kontur: { farg, bredd }, glans: { alpha, skala }, gradient: [topp, botten] })`
  → `{ mesh (Container), uppdatera(), setFarg(fyll, kontur), setGlans(alpha), destroy() }`. Samma kurva som `path()`
  (sampling 0,04–0,07 px från den vid `tathet` 4), men hörnen skrivs i en återanvänd Float32Array i stället för
  `Graphics.clear()` + triangulering. Lägg `mesh` där Graphics låg (kroppens punkter är i lokalt rum).
- Mätt (`node scripts/_popcornomrit.mjs --o1|--spel-ab --url :5174`): bildrutearbete +över golv 2,7–4,6× lägre än
  Graphics+`path()` vid 8/16/24 samtidiga. Anropa `uppdatera()` varje bildruta efter kroppens `steg`; `destroy()` är OBLIGATORISK
  (Pixis `Mesh.destroy` river varken geometrin eller `geometry.destroy()` buffertarna — `_meshlackprobe`).
- Första kund: `popcornkalaset` (`konst.js:ritaPopcornMjukMesh`). Sätt kroppen på startskalan med ~30 `steg(1)` INNAN den växer.

## Fast takt (`src/lib/takt.js`, T3)

- **`steg(dtF)` med variabelt `dtF` är fel för `Mjukkropp` och `Rep`:** `damp`/styvhet räknas per STEG
  men `grav`/`falt` per `dtF²`, så jämvikten flyttar sig med bildfrekvensen (marshmallow kollapsar ≤ 40 fps,
  spänt rep hänger 1,73× djupare vid 30 fps). Använd **`kropp.uppdatera(ticker.deltaMS)`** (opt-in; `steg()` orört).
- `new Takt({ steg: 1000/60, max: 3, snapp: 0.5 })` · `takt.kor(deltaMS, fn) → antal steg` · `takt.alfa` (0..1,
  resten). Samma snäpp som `PhysicsWorld.update`; kastar överskott vid `max`. `fjader1d(w, zeta)` = grodans
  fjäder med fasta delsteg 1/120 s. `kropp.takt` ger den inbyggda Takten.
- `fast()`/`dra()`/`skjut()` sätts per bildruta FÖRE `uppdatera` — noll steg (> 60 Hz) eller flera (< 60 Hz) körs.
  Mät: `node scripts/_taktlib.mjs` (Pixis Ticker vid 30–90 Hz, kontrollarm = dagens `steg(dtF)`).

## Vippa (`src/lib/vippa.js`, P2)

- `vippa(innerBarn, { axel: 'rot'|'y'|'skev', max, k, damp, ticker })` → `{ stot(−1..1), destroy() }` — en detalj som
  fjädrar efter en stöt (`fjader1d` på en `Takt`: samma kurva vid 30/60 Hz). `max` = utslaget vid full stöt OCH taket
  (rot 0,3 rad · y 14 px · skev 0,35). `ticker` = `ctx.ticker` (utelämnad → `Ticker.shared`; `null` → driv med `v.steg(deltaMS)`).
- **Vippa ALDRIG noden som bär `hitArea` eller är `addTarget`-mål** — lägg bilden i ett inre barn (dev-varning vid `hitArea`).
  Sätt noden på plats FÖRE `vippa()` (startvärdet läses då). I vila skrivs inget; `destroy()` i spelets `destroy()`.
- Mät: `node scripts/_vippaprobe.mjs` (kontrollarm `damp 0` går aldrig till vila).

## Fjäderbräda (`src/lib/fjader.js`)

En planka som LAGRAR ett anslag och ger tillbaka det. Fjäder med eget tillstånd (`komp`,
`kompFart` i px/steg) + en mjukkropp för den böjda silhuetten.

```js
const f = new Fjaderbrada({ bredd: 140, hojd: 32, maxAnslag: 10, maxKomp: 22 })
// vid collisionStart:      const last = f.taEmot(kula, part.rotation)   // 0…1 → ljud/skak
// i phys.beforeStep():     if (f.steg()) f.driv(kropp, part.x, part.y, part.rotation)
// vid drag/vridning:       f.flytta(kropp, part.x, part.y, part.rotation)
// varje bildruta:          f.path(g.clear()).fill(col)   ·   f.undersida(x) för fästen
```

- **`restitution` kan inte göra det här jobbet** — på en statisk kropp är den nollad (se
  CLAUDE.mds fällista + ÅTGÄRDER V10). Utkastet kommer i stället ur att plankans kropp
  FLYTTAS uppåt genom kulan, och det är `updateVelocity`-flaggan som är mekaniken
  (uppmätt 10,83 px/steg med, 3,87 utan, 3,67 för en stillastående planka).
- **`taEmot` är inte valfri.** Utan den studsar kulan bort på sin egen restitution i samma
  steg och plankans återgång sker i tomma luften (uppmätt: 85 · 79 · 56 · 31 · 103 px för allt
  hårdare anslag — inte bara svagt utan icke-monotont). Den sväljer normalfarten, behåller
  tangenten (kulan rullar vidare) och lagrar exakt vad den tog.
- **Grinden är återgången, inte vilan:** `taEmot` avvisar bara medan plankan går uppåt (då ÄR
  kontakten utkastet). Krav på full vila gjorde bräddan avvisande i 1,7 s — längre än kulans
  eget kast.
- **Styvhet, djup och tak är samma tal tre gånger.** Ange `maxAnslag` (mätt fart för full
  inpressning) + `maxKomp` (hur djupt det får synas); styvheten räknas fram. Tre fria rattar
  åt upp varandra: taket hamnade under en normal träff och bräddan bottnade vid fyra av fem
  fallhöjder.
- Kinematiken går inte att förhandla med: en matta som stoppar farten v inom djupet d gör det
  på ~π·d/(2v) steg. Djup + långsam finns inte utan att kasta svagare — det springiga INTRYCKET
  bär efterskalvet (mjukkroppen ringer ~0,3 s efter att kulan lämnat).
- **Mät med `node scripts/_fjaderprobe.mjs`** (19 mått, ingen webbläsare) och titta på bräddan
  med `node scripts/_fjaderbild.mjs`. Första kund: `kulbana`. Kandidater: `vippbradan` ·
  `flipperspel` (studsare) · `studsbollar`.

## Vätska (`src/lib/vatska.js`)

Partikelvätska (double density relaxation, Clavet) + **metaboll-rendering**: varje partikel
ritas som en mjuk klick, lagret suddas och tröskeltestas i ett filter → klickarna smälter ihop
till sammanhängande vätska. Samma enheter som resten av repot: **px/steg**, fast 1/60-steg.

- `new FluidWorld({ max, radius, gravityY, ...FLUIDS.vatten })` — `spawn` · `splash` ·
  `attract(x,y,r,styrka)` (fingret som rör om) · `addBox(x,y,w,h,angle)/addCircle` (kärl och
  hinder, **centrerade** som `PhysicsWorld.rectangle`; `c.angle` får ändras i farten → ett
  lutat glas häller ur sig) · `countIn(x,y,w,h)` (mål: "fyll glaset") · `drain(...)`
  (avlopp/mun/svamp) · `update(deltaMS)` · `destroy()`.
- `new FluidView(parent, world, FLUIDS.saft)` → `update()` varje bildruta · `setColor()` ·
  `setBlobScale(skala, tröskel)` (droppstorlek i farten) · `destroy()`.
  `FLUIDS`: `vatten · saft · gegga · honung · choklad · tval`.
- **Färg per partikel:** `new FluidView(..., { palette: [hex, …] })` + `world.pal[i]`.
  `world.setChannels(3, rate)` ger varje partikel blandbara MÄNGDER (t.ex. rött/gult/blått)
  som jämnas ut vid kontakt — riktig utspädning, mängden bevaras. Spelet läser `world.ch[k][i]`
  och skriver visningsfärgen i `world.pal[i]`. **Byt aldrig bara färgnamn vid kontakt**: en enda
  grön droppe färgar då hela glaset grönt (sedd bugg i `saftbaren`).
- **Rita kärlet OVANPÅ vätskelagret.** Metabollen sväller ~30 px utanför partiklarna, så
  vätskan bleder igenom golv och väggar om kärlet ligger under.
- **Ett kärl som FLYTTAS måste bära med sig sin vätska.** Väggarna hinner svepa förbi
  partiklarna på en bildruta, och innehållet blir stående kvar i luften. Flytta både
  `x/y` och `px/py` på partiklarna inuti — och ge varje partikel EN ägare, annars stjäl ett
  glas som flyger förbi innehållet ur ett som står stilla. Se `_carryAll()` i `saftbaren`.
- **Hinder som följer matter-kroppar (F6a):** `const fk = fluid.foljKroppar(phys, [{ body, form, nar?, bar? }])` →
  handtag `fk.lagg(post)` (returnerar posten, `post.coll` = hindret just nu eller `null`) · `fk.ta(body)` ·
  `fk.rensa()` · `fk.stoppa()`. `form` = `{type:'circle',r,dx,dy}` | `{type:'box',w,h,dx,dy,angle}` (eller en LISTA: glas =
  botten + två sidor; offsets i kroppens eget system, vrids med `body.angle`). `nar(body)` = hindret finns bara medan den är
  sann (inget spöke). `bar:{w,h,dx,dy,upp}` = kärlet BÄR sin vätska (förflyttning + vridning, EN ägare per partikel, djupast
  vinner). Synkas en gång i början av `fluid.update()` — kalla `phys.update()` FÖRE den. Förstörd `phys` stoppar följaren.
  Vätskan läser kropparna, den knuffar dem aldrig (reaktionskraft = F6b, ej byggd). Opt-in: utan anropet är allt som förut.
  Mät: `node scripts/_foljprobe.mjs` (port bit-identisk med handsynk · bär ≥ 90 % mot 0 % utan `bar` · ägare · livscykel).
- Uppmätt i riktig Chrome (headless, mjukvaru-GL) på 1280×720: solvern kostar **0,25 ms/bildruta
  vid 200 partiklar · 0,54 vid 400 · 1,12 vid 800 · 5,3 vid 3000**, renderingen ≈0,02 ms JS
  (resten är GPU, filtret körs i halv upplösning). Full 60 fps hela vägen. **400–600 partiklar
  räcker för ett kärl eller en rinnande kran** — ta inte mer bara för att det går.
- Fallgropar som redan kostat tid: `Filter.from` fyller **inte** i någon vertex-shader
  (skicka `defaultFilterVert`), och en skenande partikel som blir `NaN` spränger filtrets
  renderingstextur → 0,5 fps. Därför: hastighetstak, tak på viskositetens kvadratterm,
  `Number.isFinite`-vakt i `_cull()` och låst `boundsArea`. Rör inte de spärrarna.

## Fjädergrepp och kast (`lib/grepp.js` G1 · `lib/pekspar.js` G2)

- `new Grepp({ phys, yta, kroppar: () => [...], halo: 24, punkt: 'fingret'|'mitten', k: 0.35, tak: {dv,v}|null, fartTak: (b)=>n, kast: false|{max:18,min:6}, tapTap, grupp, onLyft, onSlapp(b,{tryck,kast,framme?}), onMarkera, onAvmarkera, onMal(b,p) })` · `grepp.destroy()` (exit-säkert, inga anrop). `yta` = gemensam `static` förälder (pekare.js; ge `hitArea` om tap-tap ska ta mål i tomma ytan). Per fast steg: handen följer fingret med accelerationstak (`handSteg`, `HAND_ACC` 0,8) + `drivPunkt` med krafttak (`TAK_FORVAL` 3/22).
- **Greppet är ALDRIG ett matter-`Constraint`** (r²·m/I > 2/stiffness − 1 skjuter över; mätt 630 572° mot 141°). `drivPunkt(b, r, hand, k, tak)` ligger i `grepp.js` (re-exporteras av `karl.js`). `tak: null` = stelt grepp: trycker igenom golvet (302 px, 59 px/steg) — använd bara som kontrollarm.
- En driven kropp är en murbräcka: `grupp: phys.grupp()` sätts på FÖRÄLDERN medan den hålls (återställs vid släpp/`destroy`). Tap-tap: `onLyft` vid nedtrycket (vippning + ljud < 100 ms), `onMarkera` när det var ett tryck, andra trycket = mål, handen bär dit i `barFart` — aldrig en teleport; fastnat > `barStall` steg utan framsteg → släpp (`framme:false`).
- `new Pekspar()` · `.lagg(performance.now(), x, y)` (FINGRETS läge) · `.fart(nu?)` → `{vx,vy,fart,x,y}` px/ms eller `null` (90 ms fönster, 130 ms ålder, provet bortom två fönster hoppas över). `kastSteg(k, max)` → px/steg. `DragController` använder samma klass (`_slappFart` är en tunn omväg).
- Mät: `node scripts/_greppprobe.mjs` (Node; kontrollarmar: Constraint skenar vid 3,0 · tak null genom golvet · teleport · utan destroy · utan kast-läge). Port av ett spel = `_popcornhandtag` + `_popcornhall` identiska tal.

## Leder: gångjärn · pendel · stiftled (`phys.gangjarn/pendel/led`, F1)

- `const g = phys.gangjarn(kropp, {x,y}, { med?, styvhet: 1, damp: 0 })` · `phys.pendel({x,y}, kropp, { langd, styvhet: 1, damp: 0, ankare })` · `phys.led(a, b, { ankA, ankB, styvhet: 0.95, damp: 0 })`. Handtaget: `.constraint` (rå) · `.punkt` (flyttbart ankare i världen) · `.satt({langd,styvhet,damp})` · `.vinkel` · `.vinkelfart` · `.ta()`. `phys.destroy()`/`removeBody` tar leden. Port = samma tal som rå `Constraint`: ge spelets EXAKTA styvhet/damp (knuffa-tornets rep: 0,96/0,04 — inte förvalet 0).
- `g.vridfjader({ vila, k, damp })` → `τ = −(vinkel − vila)·k − relativ vinkelfart·damp` per FAST steg på `body.torque` (balanstornets `STOD_K` är samma enhet; Δω = τ·277,78/tröghet). Varje tal får vara en funktion `() => tal`. `g.motor({ fart, maxMoment })`: rad/steg mot målfart med TAK på motorns moment (`g.moment` = senaste; utelämnat tak = fart/10 per steg). Moment läggs som ett PAR (+τ på B, −τ på A) — leden mellan två kroppar bevarar vinkelmomentet.
- ⚠️ `damp` ≠ 0 på en led med LÄNGD 0 bromsar stel rotation (mätt: 0,3 % kvar efter 40 steg vid 0,18 mot 87 % vid 0), därför förval 0. På en pendel med längd verkar `damp` bara radiellt: en svängande kula tappar ändå ~64 % energi på 10 s av matters egen lösare (rå Constraint lika) — vill du ha en pendel som SVÄNGER LÄNGE är det inte leden som hjälper.
- ⚠️ En TUNG massa långt från leden (56 kg 240 px bort) får matters lösare att skena (ω 400 rad/steg, även rå `Constraint`). Lägg leden nära tyngdpunkten; kedjor av leder vill ha `iterationer: { villkor: 5 }` (töjning 20,6 → 9,7 px på 6 leder). Mät: `node scripts/_fysikbank.mjs --bara S4`.

## Vev: dra runt en axel (`lib/vev.js`, G8)

- `new Vev({ yta, hitArea, x, y, hitRadie: 66, rMin: 28, tapVinkel: π/2, damp: .03, acc: .012, maxFart: .3, gain: .35, klick: π/4, phys?, gangjarn?, maxMoment?, onNed, onGrepp, onKnuff, onKlick(n,rikt), onSlapp({tryck,drag,avbruten}) })` · `vev.uppdatera(dtMs)` (egen integrator, fast steg 1/60 s) · `vev.vinkel` (rad, medurs, ALDRIG modulo) · `.fart` (rad/steg) · `.varvPerS` · `.knuff()` · `.vrid(rad)` (hjälpen: en impuls som glider rad) · `.gripen` · `.destroy()`. `yta` = gemensam `static` förälder (K3). Ingen matter krävs; `phys + gangjarn: phys.gangjarn(hjul, {x,y})` kopplar den till en riktig kropp (momentet läggs på `body.torque`, `maxMoment` = tak i matters enhet).
- DRAG: fingrets vinkelfart (tangentialfart / max(r, rMin), 90 ms fönster) → `dv = gain·(ω_finger − ω)` klämt till `acc`, farten klämd till `maxFart` — utan taken skenar en vild snurr (mätt 16 varv/s mot taket 2,9). Greppet tar först efter 12 px rörelse: ett stilla nedtryck bromsar aldrig ratten.
- TAP = KNUFF: fartimpuls `tapVinkel·damp` (+ dödzonens svans) som glider ett kvarts varv på en stilla ratt; knuffar ADDERAS (taket gäller) → 10 tryck à 250 ms når 1,25 varv/s mot ett drags 1,0. Tryck hållet > 600 ms eller > 12 px är ingen knuff.
- Mät: `node scripts/_vevlibprobe.mjs` (Node; kontroller: ingen input = 0 · damp 0 snurrar vidare · utan tak skenar · tung ratt med momenttak är långsammare). `_vevprobe.mjs` är KUGGHJULENS egen vev i webbläsaren — en annan sond. Första kund: `vattenvagen`s ventil (`_dag-vattenvagen.mjs`).

## Ytvågor (`lib/ytvag.js`, F5)

Ytan som ett 1D-höjdfält, rena tal (ingen Pixi/matter): `new Ytvag({ n, x0, x1, ytY, sprid, k, damp, max })` + opt-in `stotProfil` (förval 1·0,6·0,25), `stotKlamma`, `vilaKop` (0,9), `vilaTrosk` (> 0 = grind: hojd/avvikelse ger 0 under den), `rorTrosk` (0,02).
- `stot(x, kraft)` — fart in (+ nedåt). **Per bildruta är det en konstant kraft** (jämvikt ≈ 36× insatsen): ge ~1/36 av önskat utslag.
- `vila(x, djup, bredd_px)` — en dell som fältets VILOLÄGE (trekant). **Deklarera den varje bildruta medan den ska finnas** (utan anrop = borta); vågor kommer av att den FLYTTAR sig, en stilla dell gör inga. Aldrig "dra h mot ett måldjup" — det är en energikälla.
- `uppdatera(deltaMS)` — fast steg via `Takt`; returnerar sant medan ytan rör sig (+ en sista gång) → rita bara om då. `hojd(x)` = våg + dell · `avvikelse(x)` = bara vågen (en flytare som själv gör dellen ska läsa denna) · `path(g, { x0, x1, steg, dy, extra })` lägger moveTo/lineTo · `nollstall()` fyller på plats. `h`/`v`/`rest` är publika Float32Array.
- Långt läge klingar av på ~6 s (vänta ≥ 10 s i en sond). En dell dragen med vågens egen fart (~6 px/steg) resonerar (2,2 px → 10 px våg). Kunder: pruttbad, grodan-slurp/dammen. Mätning: `node scripts/_ytvagprobe.mjs` (gamla fälten som kontrollarmar).

## Vindfält (`lib/vind.js`, F4)

- `new Vindfalt({ varld: phys, form: { typ: 'band'|'kon'|'fn', x, y, rackvidd, halvhojd, vidgning?, vinkel?, sug?: { rackvidd, halvhojd, del, tvars } }, luft: { x, y }, avtag: { langs, tvars }, filter(body) → false|true|fångfaktor, kroppar?, aktiv: bool|fn, styrka, puff: { period, djup, fas } })` — stegar SJÄLV per fysiksteg (`beforeStep`); `.flytta(x,y)` · `.rikta(vinkel)` · `.luft` · `.pust(steg, styrka)` (enstaka by) · `.luftVid(x,y)` → `{vx,vy,s}` · `.medelAcc(punkter, fa)` (ETT vind-tal för en förhandsbana) · `.rita(g, { t, … })` (strömmen SYNS) · `.destroy()`.
- Vinden är luftens FART `w` (px/steg), aldrig en kraft: Δv = `fa·(w − v)` — matter drar redan `fa·v`, Vindfalt lägger `massa·speedToAccel(w, fa)`. Sluthastighet = w; lätt (stort `frictionAir`) följer med, tung släpar; `frictionAir` 0 → `reservFa`. Vill du ha DAGENS massablinda vind: `filter` returnerar `FANG_FA / b.frictionAir`.
- `kon` = band som vidgar sig (0,42); `sug` lägger luft BAKOM källan som strömmar mot den (flugan-pa-nasan: en ren kon nådde 22 av 200, kon + sug når allt); `fn` = egen `(x,y) → {vx,vy,s}`. Axel = `vinkel`, annars `luft`s riktning. Flera fält på en värld går bra (egen `filter` per fält).
- Kunder: studsa-ner (port, kraften BIT FÖR BIT lika dagens `_fanForce`), bajs-och-kiss (pruttvind = kon ur kompisens hand). Mät: `node scripts/_vindprobe.mjs` (A–F, kontrollarmar; E mäter förhandsbanans fel mot dagens). Fällor: ett `filter` som pekar på spelets egna listor måste släppa avklarade kroppar; en kort kon dimensioneras inte i sluthastighet — släpp föremål och mät var de landar.

## Förhandsvisningens kalibrering (uppmätt mot matter.js vid fast 1/60-steg)

Matters nedåtriktade hastighetsökning ≈ `0.2778 × gravityY` px/steg, och luftfriktionen dämpar
hastigheten ≈ `(1 − frictionAir)` per steg. Alltså:

```
previewGravity = 0.2778 × gravityY
previewDamp    = 1 − frictionAir        // launcher-opt, default 1
ax             = previewWind / (1000/60)²   ≈ previewWind / 277.8
```

Fel värden = förhandsvisningen ljuger. Med `gy = 0.5` utan dämpning pekade spindelns bana
**~380 px fel** och autohjälpen missade; kalibrerat stämmer det på ~2 px.

⚠️ **Retuna inte blint de äldre spelen.** `bajs-och-kiss` (0.42) och `studsbollar` (0.44) är
handtrimmade mot sin högre `gravityY` — **mät först**. `fyrverkeri` integrerar sin egen rörelse
vid `GY` och har därför en exakt förhandsvisning per konstruktion.

## Designregler för fysikspel

- Bygg kring ett **mål** (nå/samla/fylla) **plus minst en extra kontroll** som ändrar utfallet:
  placeringsdrag, vikt-/vind-/studsväxling, underlagsbyte.
- **Aldrig ett misslyckande som avslutar eller nollställer.** Missar är roliga (wiggle, puff,
  fniss) och mjuk autohjälp garanterar att det till slut lyckas. Men missen ska *märkas* —
  hinder och bakslag som barnet kan anpassa sig runt (vind, studsande föremål, något som
  kommer i vägen) hör hemma här; de får sakta ner, aldrig stoppa. Sätt alltid ett tak på hur
  mycket som kan gå fel samtidigt.
- **Men autohjälpen får inte spela banan åt barnet** — det var appens vanligaste designfel.
  Hjälpen ska komma **sent och synligt** ("Jag hjälper till!") så att barnets sikte/kraft/
  placering faktiskt avgör. Skicklighet ska kännas, aldrig krävas.
- Bygg-/släpp-spel: låt fysiken vara ärlig (riktiga kedjereaktioner, naturliga stopp) i stället
  för scriptade utfall — det är där agenskänslan sitter.

## Luft och vind på partiklar (`lib/partiklar.js`)

- `new Emitter(lager, { gravity, luft: k, vind: w })` — `luft` = linjärt motstånd (1/s),
  `vind` = lufthastighet i sidled (px/s). `dv/dt = −k·(v − w) + g`, så sluthastigheten blir
  **w sidled och g/k nedåt**: gnistor och rök hänger och driver i stället för att falla.
- Banan är fortfarande SLUTEN (`luftbana(x0, v0, w, k, g, t)` är exporterad) — samma kostnad per
  partikel som förr. Utan `luft` (default 0) är banan bit för bit den gamla, och `vind` utan
  `luft` gör ingenting. `luft`/`vind` fastnar vid födseln (ändra dem → nästa partikel).
- Luften bromsar utspridningen (på 0,9 s ≈ hälften av sträckan vid k 1,6): höj starthastigheten
  med `t/E(t)` om smällen ska vara lika stor — linjär luft skalar hela formen lika, så en ring
  eller ett hjärta behåller formen (`fyrverkeri` `LUFT_FART`). Mät med `node scripts/_partikelvind.mjs`.

## Landa-intro (`lib/landa.js`, P4)

- `landa(inreBarn, { ticker, fran, markY, tyngd: 'stor'|'liten', fordrojning, onLand })` → `{ klar, avbryt(), destroy(), tick(ms), ar }`.
  Stor = duns (1–2 slag), liten = studs (5 slag). Fast steg via `Takt`, ingen matter. `fran`/`markY` = `nod.y` i nodens eget
  föräldrarum — kör den i ett INRE BARN så att `DragController`s mål och `hitArea` står still.
- `avbryt()` ur pekhanteraren lägger noden på `markY` direkt; `destroy()` gör samma på en levande nod och rör inte en riven.
  `klar` resolvas alltid ('landad' | 'avbruten' | 'riven'). Efter landning: exakt `markY`, lyssnaren lossad.
- Ljud och skak är kundens: `onLand(tyngd, { nr, fart })` vid varje nedslag. Mät: `node scripts/_landaprobe.mjs`.

## Inspelning och repris (`lib/inspelning.js`, F8)

- `const rec = spelaIn(phys, kropp, { max: 900 })` hakar på `phys.beforeStep` (physics.js orörd) och skriver `{ x, y, vinkel }` per FAST steg i en `Float64Array`-ringbuffert (exakt, 21,6 KB fast). Skriver inget förrän `rec.start()` (rensar) — `stopp()`, `rensa()`, `fanga()` (NU-läget som sista post: beforeStep ligger ett steg efter spelets egen koll), `ta()` (lossar kroken). `rec.langd`, `rec.steg(i)` (0 = äldsta).
- `rep = rec.spelaUpp(vy, { fart: 0.4, sista: 60, spar: true, lage: true, ticker, onKlar })` snapshotar de `sista` stegen och interpolerar linjärt (0,4× blir mjukt; på helsteg EXAKT inspelat läge, 0,0 px). Driv med `rep.tick(deltaMS)` i spelets update EFTER `phys.update` (länken skriver annars över vyn), eller ge `ticker`. `rep.hoppa()` = ett tryck: avsluta direkt + `onKlar`; `rep.ta()` = riv utan `onKlar` (idempotent, kalla vid rundbyte/destroy).
- `spar` = mjuk avtagande linje i en egen Graphics strax BAKOM `vy` (kräver `vy.parent`), riven vid slut/hoppa/ta/död vy. Ingen gsap — inget som kan överleva en rivning. `lage: false` = bara `rotation` (en propeller i takt med kulan: två `spelaIn` på samma värld skriver samma steg).
- Fällor: reprisen får inte låsa nästa runda (tryck = `hoppa()`); en replik under reprisen får `complete()` att hoppa över berömmet; kroppar som INTE spelats in (fjäderbräda, klockor) går vidare i verkligheten medan reprisen rullar. Kund: `kulbana` (`_startaRepris`). Mät: `node scripts/_inspelningprobe.mjs` (21 rader, kontrollarmar K1–K3) · webbläsare `scripts/_dag-repris.mjs`.

## Hög: det barnet samlar syns (`lib/hog.js`, P3)

- `new Hog({ kanter: { x0, x1, y1, y0?, hornrund? }, tak: 30, sova: true, gravitation, tona, bort })` → `lagg({ cirkel: r | rekt: [w,h] | poly: [n,r], vy, studs, friktion, uppdatera }, x, y, v)` → post `{ body, vy, id }`; `tom(snabbt?)`, `update(deltaMS)` (varje bildruta), `paSlag(fn)`, `destroy()`. `antal` = poster som inte tonar bort (det spelet jämför mot antalet fångade), `synliga`, `topp`, `vilar`, `rymt`.
- Allt i behållarens EGET rum (en burk = Container på burkens plats, koordinater relativt den). Statiska kanter (fångväggar 60 px tjocka, valfritt lock, rundade hörn) bär `studs`/`friktion` — aldrig `restitution`; behållaren står STILL (rör den sig: `phys.kinematisk()` och `varld`).
- Taket: fler än `tak` → den ÄLDSTA tonar bort (alfa på vyn, `tona` s), lyfts ur världen och ALLA andra väcks (en sovande hög som mist sin bärare hänger annars kvar — uppmätt 0 px fall utan väckning, 20,6 px med). Sömn = stabilitet: 30 bollar 1,7 px kryp/10 s utan, 0,000 med.
- `bort(post)` anropas när en post lämnar högen (default `vy.destroy`); ett spel med gsap på sina vyer anger egen `bort` som dödar tweens FÖRE rivningen. Rymde något lyfts det tillbaka (`rymt`, ska vara 0).
- Kunder: `rakna-applen` (frukt i korg, tak 10 = mest en runda räknar; platser via `_hogSlot` så raderna blir ≤ 5 och nästlade) · `klambubblor` (pärlor i burk, tak 20). Mät: `node scripts/_hogprobe.mjs` (kontrollarmar A–G).

## Fysiköverlägg (`lib/fysikdebug.js`, F9) — DEV, bara med `?fysik`

- Öppna `http://localhost:5173/?fysik` (eller :5174): kroppskonturer (cyan vaken · blågrå sovande · grå statisk · magenta sensor),
  leder (gul + ankare), kontaktpunkter (röda), fartpilar (gröna), **röd ring = `statisk-fart`** (R1), orange ring = `snurr`,
  bärnsten = `hitArea` på synliga static/dynamic-noder. Ritas i varje kropps EGET rum (länkad vys förälder → kamera följer med).
- Räknare att läsa: `window.__fysikdebug` → `konturer === kroppar` (kroppar = `Composite.allBodies`, oberoende av ritningen).
  Inga levande världar → inget ritas. Hakar på `PhysicsWorld.prototype` utifrån (physics.js orörd); bygget har noll spår (markör `fysikdebug-markor-q7x3`).
- Mät utan webbläsare: `node scripts/_fysikdebugprobe.mjs`. Bra första spel: `vippbradan` (led + sensor) och `grodan-slurp` (ragdoll, sensorer).

## Tysta fällor (flyttade hit ur CLAUDE.md 2026-10-02 — indexet står kvar där)

- **`restitution` på en STATISK kropp gör INGENTING.** `PhysicsWorld._make` skapar kroppen
  dynamisk och sätter den statisk efteråt (NaN-fixen), och matters `Body.setStatic` nollar då
  `restitution` och sätter `friction` till 1 (originalen hamnar i `body._original`). Studsen blir
  alltså alltid den DYNAMISKA kroppens egen. `kulbana`s studsplatta stod på `0.95` och studsade
  exakt som en ramp — uppmätt: plattans 0,02 och 0,95 ger identiskt studshopp. **Vill du ha en
  studsande statisk yta: `{ isStatic: true, studs: 0.75 }`** (opt-in, sätts efter `setStatic`,
  uppmätt +139 px mot samma yta utan den). Eller `lib/fjader.js` (`Fjaderbrada`) när ytan ska
  kasta iväg något. De 31 kvarvarande `restitution`-talen på statiska kroppar är fortfarande
  nollade med flit — `npm run check -- --studs` listar dem (15 döda strukna 2026-09-12).
  ⚠️ `studs` väcker BARA studsen — friktionen står kvar på 1 (se `bowling`s kantstöd och skill
  **fysik-spel**). → ÅTGÄRDER V10/V10b.
- **En förflyttning av en statisk kropp kan bli en fart som ligger kvar för alltid.**
  `Body.setPosition(body, p, true)` sätter farten till förflyttningen, och matter räknar aldrig om
  hastigheten på en statisk kropp. Ett drag på 230 px gav (−651, −230) i hela byggfasen, och
  lösaren läste sedan kontakten som **separerande** → ingen impuls → kulan föll rakt genom
  plankan, utan konsolfel. Driv med fart bara i `phys.beforeStep()`; bär med fart = 0.
- **matter-ledernas `damping` bromsar varje STEL rotation.** Konstraintens dämpning jämför
  kropparnas MITTPUNKTER, inte ankarpunkterna, så en ragdoll som snurrar som en stel kropp tappar
  snurret: 0,18 → 0,002 rad/steg på 40 steg med musklerna, gränserna och luften avstängda
  (`_superhoppprobe`). Med `damping 0` höll halva. Sänk den bara medan något ska snurra fritt
  (`grodan-slurp`s superhopp: 0,01 i luften, 0,08 igen vid landning).
- **`Flytvolym` verkar även OVANFÖR ytan.** Fartspärren (`maxFart`) och `vridDamp` (0,9 per
  BILDRUTA) läggs på varje kropp i volymen, var den än är. En kropp som ska snurra eller flyga fort
  i luften måste tas UR volymen och läggas tillbaka vid landning. Och en Node-sond utan spelets
  flytvolym mäter en snällare värld: där överlevde grodans volt, i spelet gjorde den det inte.
- **En mjuk kropp måste stega med FAST tidssteg.** `Mjukkropp` (som `PhysicsWorld`) räknar `damp`
  och villkorsstyvhet per STEG men kraftfält per `f²`. Ett för stort steg fyrdubblar tyngden utan
  att lösaren får mer att säga till om (`dtF` 2 = en tappad bildruta vek ihop hamburgerbullen
  **34,9 px av 50**, för gott); ett för litet ger en helt annan JÄMVIKT (3,1 px i spelet mot 7,0 i
  sonden — Chrome gick på 58 fps och `dtF` blev 1,03). Använd en ackumulator som alltid stegar
  med exakt 1, annars mäter sonden aldrig samma sak som spelet gör.
- **`Mjukkropp.path()` är INTE en polygon — invändningen "en tiohörning läser som en kantig
  klump" gäller den inte.** Kurvan lägger kvadratiska mellansteg genom kantmittpunkterna och
  avviker **0,01–0,12 px** från en perfekt cirkel för 10–16 punkter över hela spannet 17–100 px
  radie; den råa polygonen ligger på 0,33–4,89, alltså 40× mer. Formhalvan av `sapbubblor`s
  strykning var ett antagande om renderingen. **Kostnadshalvan står kvar** (en full omritning
  per kropp och bildruta), så svaret är att göra bara de kroppar mjuka som faktiskt deformeras
  just nu — i `pruttbad` bara bubblorna vid ytan, uppmätt högst 3 samtidigt.
