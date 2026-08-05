---
name: fysik-spel
description: Use when building or changing physics-based games in this repo. Covers choosing between the three engines (own ticker integrator / matter.js / p2-es) and three.js for 3D, PhysicsWorld (bodies, MATERIALS, wind, gravity, collisions, fixed timestep, exit-safe destroy), AimLauncher (drag to aim + power with live dotted trajectory preview), the measured preview-calibration constants that make the preview match the real flight, goal-based no-fail design, and which existing game to copy. Triggers on - fysik, physics, matter, matter-js, p2, p2-es, motor, engine, PhysicsWorld, AimLauncher, trajectory, bana, sikte, slingshot, gravity, gravitation, wind, vind, restitution, studs, bounce, collision, kollision, spring, fjäder, constraint, led, predictTrajectory, previewGravity.
---

# Fysikspel (matter.js · p2-es · egen integrator)

## Välj motor FÖRST — de tre är verktyg, inte en rangordning

| Motor | Nå efter den när | I repot |
|---|---|---|
| **egen ticker-integrator** | banan ska vara **exakt förutsägbar**: parabelhopp, styrd bana, partiklar, en förhandsvisning som måste stämma på pixeln | `golvet-ar-lava` (hoppbåge + lavabubblor), `fyrverkeri` (egen `GY`) |
| **matter.js** | *stelkroppsvärlden*: staplade lådor, kedjereaktioner, studs, rullande bollar, kast med sikte | `src/lib/physics.js` → **23 spel**, varav 8 med `AimLauncher` |
| **p2-es** | det matter är dåligt på: **fjädrar och leder** (`Spring`, `RevoluteConstraint`, `DistanceConstraint`), tyg-/repkedjor, kontinuerlig kollision för snabba små kroppar, per-material friktionspar | *inget spel än — först ut får skriva `src/lib/physics2.js`* |
| **three.js** | 3D-scenen bakom Pixi | `src/lib/three3d.js` → `glittergrottan`; se skill **threejs-games** |

Regler som gäller alla:

- **Ett spel = en motor.** Blanda aldrig matter och p2 i samma modul — två fasta tidssteg som
  driver samma vy ger skakningar som är omöjliga att felsöka.
- **Enklast som duger vinner.** Behöver du bara en parabel: skriv parabeln. En fysikmotor för
  ett förutsägbart hopp gör bara utfallet slumpartat, och no-fail svårare att garantera.
- **p2 importeras dynamiskt** (`const p2 = await import('p2-es')`) precis som three.js — 66 KB
  minifierat ska inte ligga i huvudbundeln för de ~47 spel som inte har någon fysik alls.
  matter ligger kvar statiskt i `physics.js`; det är redan prissatt.
- **Exit-säkerhet gäller motorn med.** Skriver du `physics2.js`: kopiera `PhysicsWorld`s
  kontrakt — fast tidssteg i `update(deltaMS)`, `link(body, view)`, och en `destroy()` som
  nollar världen OCH släpper alla vy-referenser. En halvstädad fysikvärld överlever ett
  spelbyte och läcker.
- p2:s API är samma som klassiska `p2.js` (`World`/`Body`/`Box`/`Circle`/`Plane`). **Använd
  `p2-es`, inte `p2`** — originalet är UMD och orört sedan 2017. p2 räknar y **uppåt**; Pixi
  räknar y nedåt. Vänd tecknet i `link`, en gång, på ett ställe.

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

## AimLauncher

Den återanvändbara **"dra för att sätta riktning + kraft, med levande prickad bana"**-kontrollen.
`slingshot` (dra bakåt) eller kast. Tap-fallback siktar mot `defaultAim` — obligatorisk för
under-4-år. `setWind` / `setPreview` håller förhandsvisningen ärlig.

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
