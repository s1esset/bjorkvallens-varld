# ARCHITECTURE.md — levande arkitekturbeslut

Vad som är bestämt och **fortfarande gäller**. Operativa regler bor i `CLAUDE.md`,
kontraktet i skill `spelkontrakt`, arbetsflödet i `docs/PIPELINE.md`.

> Den ursprungliga forskningsrapporten (marknadsanalys, mekanikmönster, asset-tabeller,
> spelbacklogg) ligger arkiverad i **`docs/arkiv/architecture-2026-06.md`**. Den satte
> riktningen och är historiskt intressant, men backloggen är byggd och tabellerna är
> frusna i juni 2026 — läs den för *varför*, inte för *hur*.

## Systemform

En **Pixi `Application`**, ett design-rot på 1280×720 med letterbox-skalning. Ett tunt
**skal** (splash → meny → inställningar/bibliotek → spel) som kör hot-swappbara
**spelmoduler**, alla mot ett kontrakt (`GameModule`) och delade **tjänster** (Audio, Voice,
Save, Profiles, Assets, Stickers, Scaler, Gate). Skalet når aldrig in i ett spel; ett spel
når världen bara via injicerat `ctx`.

3D-spel får en egen transparent three.js-canvas **bakom** Pixi-canvasen (`ThreeLayer`) —
Pixi ritar fortfarande all UI och all input går via Pixi. Fysikspel kör matter.js i en
`PhysicsWorld` med fast tidssteg.

Detaljer: skill `spelkontrakt` (kontrakt), `skal-och-data` (skal + spardata),
`fysik-spel`, `threejs-games`.

## Låsta teknikval

| Val | Varför |
|---|---|
| **PixiJS v8, `preference: 'webgl'`** | WebGPU är inte moget nog på de plattor målgruppen faktiskt har. |
| **Vanilla ESM, inget ramverk** | Ett spel är en fil med tre livscykelmetoder. Ett ramverk hade bara lagt sig i vägen — och kostat startup-tid på svag hårdvara. |
| **Vite + vite-plugin-pwa (`generateSW`)** | Precache av skal + spel; SW-uppdatering appliceras **bara vid menyn**, aldrig mitt i ett spel. |
| **GSAP** | All juice. Kräver disciplin: tweens måste dödas i `destroy` (se exit-säkerhet). |
| **matter.js** | Ärlig fysik ger agens; scriptade utfall känns döda. |
| **three.js, dynamiskt importerad** | Statisk import drar in ~170 kB gzip i huvudbundlen för alla spel. Alltid `await import()` i `init`. |
| **`localStorage`, en nyckel + backup** | Enklaste lagringen som räcker. Ingen PII lämnar enheten → renaste GDPR-K/COPPA-läget. |
| **Förgenererat offline-ljud** | F5-TTS-röst + MOSS-SoundEffect-SFX som mp3. Inga nätanrop, inga attributionskrav. Web Speech/syntes som fallback. |

## Beslut som stängde risker

| # | Risk | Beslut (gäller) |
|---|---|---|
| R1 | Svensk TTS offline | Förgenererade klipp, exakt textnyckel-matchning. Web Speech `sv-SE` som fallback — spel blockeras aldrig på röstgenerering. |
| R2 | PWA kan inte avslutas | `window.close()` är en no-op installerat → grind → "Avsluta? Ja/Nej" → best-effort close → annars splash + "Du kan stänga appen nu". |
| R3 | Grind vs tillgänglighet | Tryck-och-håll 2,5 s som standard. |
| R4 | iOS ignorerar `display: fullscreen` | `display_override: ['fullscreen','standalone']`. |
| R5 | Precache-storlek | Precacha skal + spel; `maximumFileSizeToCacheInBytes` 8 MiB; stora media via runtime-cache. |
| R6 | SW-uppdatering mitt i spel | `prompt`-läge, appliceras bara vid meny/bibliotek. Versionspillret visar att den landat. |
| R8 | Licenshygien | CC0-först, `ASSET_LICENSES.md`. **Mål: noll attributionskrav.** All spelgrafik ritas programmatiskt (emoji + Pixi Graphics). |
| R9 | localStorage-kvot/korruption | En nyckel + backup, try/catch, validera vid läsning, sekventiella migreringar. |
| R10 | Värdfigur / IP | Egen maskot (**Bobo**). Avbildade människor heter bara Zacke/Alissa/Elvira/Lova. |
| R11 | Drag för under 4 år | `DragController`: halo + snäpp + snäpp-tillbaka + **tap-tap-fallback**. |
| R12 | Överstimulering | Belöningar 1–2 s. Inga poäng, inga streaks, ingen FOMO. |

## Designlagen bakom allt

Från varje framgångsrik 2–5-titel (Toca Boca, Sago Mini, Pok Pok, Endless Alphabet):
**inga fel-lägen, inga bestraffande timers, ingen poäng som sjunker, ingen läsning.**
Röst och animation *är* belöningen. Uppgifter tar 3–10 s. Varje pekning ger positiv eller
neutral multisensorisk återkoppling under 100 ms.

Det som gör ett spel *bra* snarare än bara korrekt — agens, variation, juice, mottagare,
riktig ton, mjuk progression, egen finish — är formaliserat som kvalitetsgrinden i
`docs/PIPELINE.md` och bevakas av `npm run check` + agenten `spelkritiker`.

## Prestandabudget (svaga plattor)

Atlas framför lösa texturer · undvik filter/blur/skuggor · explicit `hitArea` ·
förstör och avlasta vid exit · `app.ticker.maxFPS = 60` · 3D: pixelRatio ≤2, inga skuggor,
<50k trianglar, ingen postprocessing.
