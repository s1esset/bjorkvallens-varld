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
- `onCollision(cb)` — matcha på `body.label`.
- `update(deltaMS)` fast tidssteg · exit-säker `destroy()`.
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
- Första kund: `lagerelden`. Väntar: `sapbubblor` · `glasstornet` · `mata-monstret` ·
  `hamburgerbygget` · `pruttbad`.

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
- Uppmätt i riktig Chrome (headless, mjukvaru-GL) på 1280×720: solvern kostar **0,25 ms/bildruta
  vid 200 partiklar · 0,54 vid 400 · 1,12 vid 800 · 5,3 vid 3000**, renderingen ≈0,02 ms JS
  (resten är GPU, filtret körs i halv upplösning). Full 60 fps hela vägen. **400–600 partiklar
  räcker för ett kärl eller en rinnande kran** — ta inte mer bara för att det går.
- Fallgropar som redan kostat tid: `Filter.from` fyller **inte** i någon vertex-shader
  (skicka `defaultFilterVert`), och en skenande partikel som blir `NaN` spränger filtrets
  renderingstextur → 0,5 fps. Därför: hastighetstak, tak på viskositetens kvadratterm,
  `Number.isFinite`-vakt i `_cull()` och låst `boundsArea`. Rör inte de spärrarna.

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
