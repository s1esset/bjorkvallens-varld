---
name: fysik-spel
description: Use when building or changing physics-based games in this repo (matter.js). Covers PhysicsWorld (bodies, MATERIALS, wind, gravity, collisions, fixed timestep, exit-safe destroy), AimLauncher (drag to aim + power with live dotted trajectory preview), the measured preview-calibration constants that make the preview match the real flight, goal-based no-fail design, and which existing game to copy. Triggers on - fysik, physics, matter, matter-js, PhysicsWorld, AimLauncher, trajectory, bana, sikte, slingshot, gravity, gravitation, wind, vind, restitution, studs, bounce, collision, kollision, predictTrajectory, previewGravity.
---

# Fysikspel (matter.js)

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
- **Aldrig fail-state.** Missar är roliga (wiggle, puff, fniss) och mjuk autohjälp garanterar
  att det till slut lyckas.
- **Men autohjälpen får inte spela banan åt barnet** — det var appens vanligaste designfel.
  Hjälpen ska komma **sent och synligt** ("Jag hjälper till!") så att barnets sikte/kraft/
  placering faktiskt avgör. Skicklighet ska kännas, aldrig krävas.
- Bygg-/släpp-spel: låt fysiken vara ärlig (riktiga kedjereaktioner, naturliga stopp) i stället
  för scriptade utfall — det är där agenskänslan sitter.
