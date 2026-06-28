# Barnspel — PWA Mini-Games Architecture (Ages 2-5, Swedish)

> Source of truth produced from 6 parallel research tracks (Market, Assets, Tech, UX, Mechanics, PWA).
> `CLAUDE.md` distills the operational rules from this document — read both before building games.

---

## 1. Executive Summary

We are building **Barnspel** — an offline-first, installable Progressive Web App that is a library of small, self-contained mini-games for children aged 2-5, fully in Swedish (UI, voice, text), tablet-first, no ads, no third-party tracking, no runtime network calls.

**Core decisions locked by this document:**

- **Stack:** PixiJS v8 (WebGL preference) + Vite + vite-plugin-pwa + vanilla JS (ES modules), GSAP for UI juice, procedural Web Audio (upgrade path: `@pixi/sound` + bundled clips). No framework, no interact.js, no analytics SDK.
- **Architecture:** A thin **shell** (splash → menu → settings/library → game) hosting hot-swappable **game modules** that all implement one contract (`GameModule`) and consume **shared services** (Audio, Save, Scaler, Voice, Gate, Assets, Stickers). One Pixi `Application`, one design-resolution root container, scale-to-fit letterbox.
- **Design law (from every successful 2-5 title):** no fail states, no timers-as-punishment, no scores-that-drop, no reading required. Voice + animation are the reward. Tasks are 3-10s. Every touch yields positive/neutral multi-sensory feedback <100ms.
- **Assets:** CC0-first (Kenney.nl primary art + audio), OFL fonts (Fredoka/Baloo 2 + Nunito), Swedish voice via pre-generated Piper TTS (MIT) or human recordings, bundled for offline. Web Speech `sv-SE` is the implemented fallback in this scaffold.
- **Safety:** Fully offline = cleanest COPPA/GDPR-K posture (no PII leaves device). All saves in `localStorage` JSON, multi-profile. Every adult action (settings, exit, profile delete/reset) behind a **press-and-hold parental gate**.
- **First 3 games:** **Klämbubblor** (tap/cause-effect), **Sortera Skräp** (drag-drop sort), **Vändkort** (memory pairs).

---

## 2. Market Insights — Games That Inform Our Design

| Title | Studio | What we reuse |
|---|---|---|
| Toca Boca / Toca Boca Jr | Toca Boca (Swedish) | "Play without rules" — no win/lose, everything reacts on tap. Cultural & tonal north star. |
| Sago Mini World / School | Sago Mini | Library-of-gentle-minigames model; slow deliberate animations; caretaking loops; zero fail states. |
| Peekaboo Barn | Night & Day | Pure tap-to-reveal cause-and-effect — lowest-threshold 2-3yo primitive (Game 1). |
| Endless Alphabet | Originator | Drag-letter-into-slot with phoneme voice + payoff animation. No scores/timers. |
| Busy Shapes / Fisher-Price | Edoki | Self-correcting drag-to-hole sorter; forgiving trial-and-error (Game 2 drag engine). |
| Pok Pok Playroom | Pok Pok (Apple Design Award) | Calm, low-stimulation "digital toy" mode. |
| Dr. Panda | TribePlay | "Be the grown-up" role-play job loops. |
| Monkey Preschool Lunchbox | THUP | 3-5s per-task pacing + sticker-between-rounds rhythm. |
| Hey Duggee / CBeebies | BBC | Collectible badge/sticker reward loop spanning the library. |
| Khan Academy Kids / Lola Panda | Khan / BeiZ | Warm recurring host character + Swedish voice praise. |
| PBS Kids / Duck Duck Moose | PBS / DDM | Many tiny single-concept games in one ad-free container (our exact model). |

### The 11 mechanic patterns (= our backlog primitives)

1. Cause-and-effect tap-to-reveal — **build first**
2. Drag-to-target / shape-sorter matching
3. Sort / match by attribute; memory pairs
4. Open-ended sandbox / dollhouse role-play (highest retention)
5. Dress-up / decorate / customize
6. Feed / care-for / role-play a job
7. Tracing & guided-path drawing
8. Tap-to-hear phonics / letter-sound board
9. Count-by-tapping / simple number play
10. Pattern completion / "what comes next"
11. Collectible reward loop (cross-library layer, not a game)

**Cross-cutting rules:** no fail states / no timers / no high scores for 2-4; snack-sized tasks (~3-10s); voice + animation as reward, not points/text; ad-free, no pop-ups, no external links; child-navigable UI, big targets, audio cues; recurring host character.

---

## 3. Tech Stack

| Concern | Choice | Version | Reasoning |
|---|---|---|---|
| Renderer | PixiJS | `^8` | WebGL preference for cheap Android tablets; WebGPU uneven on low-end hardware. |
| Build/dev | Vite | `^5` | Fast HMR, ESM, first-class PWA plugin. |
| PWA/SW | vite-plugin-pwa | `^0.20` | Wraps Workbox `generateSW`; precache + runtime caching declaratively. |
| Language | vanilla JS (ESM) | ES2022 | No framework overhead; Pixi owns the render tree. |
| Tweening | GSAP | `^3` | Bounce/pop/transition juice; tween Pixi props directly. |
| Audio (scaffold) | Web Audio procedural | — | Zero-asset SFX synth; upgrade to `@pixi/sound` + clips. |
| Voice | Web Speech `sv-SE` (now) → Piper TTS bundled (prod) | MIT | Offline, license-clear in production. |

**Rejected:** interact.js (DOM-only, can't see Pixi sprites — use Pixi federated `globalpointermove` drag). Mixkit music (license bans games). Runtime cloud TTS (not offline / tracking).

### PixiJS v8 specifics baked into the shell
- `const app = new Application(); await app.init({ resizeTo: window, preference: 'webgl', resolution: devicePixelRatio, autoDensity: true })`. Canvas is `app.canvas`.
- Events: `eventMode` (`'static'` buttons, `'dynamic'` draggables, `'none'` decorative). Use `pointertap`. Drag via `globalpointermove` so it survives a finger leaving the sprite.
- Ticker callback receives the **Ticker instance** → read `ticker.deltaTime`. `app.ticker.maxFPS = 60`.
- Graphics: fluent `roundRect(...).fill(...).stroke(...)`.
- Assets: `Assets.load` / `loadBundle` / `backgroundLoadBundle` / `unloadBundle` — one bundle per game.

### Responsive scale (non-negotiable)
Fixed design resolution **1280×720 landscape**, all content in one root `Container`, uniform scale `Math.min(w/1280, h/720)` (letterbox/contain so nothing is cropped), centered, background painted so bars look intentional.

### Performance laws (low-end tablets)
Atlases per game; `BitmapText` for repeated/changing text; **no filters/blurs/shadows**; `eventMode='none'` + `interactiveChildren=false` on decorative layers; explicit `hitArea` on buttons; pool particles; `Assets.unloadBundle` on game exit; `@0.5x` texture variants for cheap devices.

---

## 4. Asset Sources

### 4.1 CC0-first table

| Source | Type | License | Attribution? | URL |
|---|---|---|---|---|
| Kenney.nl ⭐ | Sprites, UI, characters | CC0 1.0 | No | https://kenney.nl/assets |
| Kenney audio ⭐ | SFX, UI beeps | CC0 1.0 | No | https://kenney.nl/assets |
| Open Doodles | Hand-drawn humans | CC0 | No | https://www.opendoodles.com/about |
| Humaaans | Mix-and-match figures | CC0 | No | https://www.humaaans.com |
| Reshot | Vector illustrations/icons | Custom free | No | https://www.reshot.com |
| unDraw | Flat SVG illustrations | Custom (MIT-like) | No¹ | https://undraw.co/license |
| Freesound (CC0 filter) | SFX | CC0 | No | https://freesound.org |
| Pixabay | SFX + music | Pixabay License | No² | https://pixabay.com/service/license-summary/ |
| OpenGameArt.org | Mixed | Per-asset | Filter to CC0 | https://opengameart.org |
| Game-icons.net | Game icons | CC-BY 3.0 | Yes (per author) | https://game-icons.net/about.html |

¹ unDraw: no attribution, but forbids AI/ML training & repackaging into a competing library.
² Pixabay: no attribution, but can't redistribute clips standalone; now mixes in AI content.

**AVOID:** OpenMoji (CC-BY-**SA**), Flaticon/Freepik free tiers (mandatory attribution), **Mixkit music** (bans games). Always confirm per-asset CC0 on OpenGameArt/SVGRepo/Freesound.

**Project rule:** prefer CC0/no-attribution everywhere → ship zero attribution obligations. Any CC-BY asset must be logged in `ASSET_LICENSES.md` and add a "Krediter/Tack" screen.

å/ä/ö are in Latin-1 Supplement — covered by essentially every font. Glyph support is **not** a risk; attribution and share-alike clauses are.

### 4.2 Fonts (all SIL OFL 1.1, self-hosted WOFF2)
- **Fredoka** — big playful titles
- **Baloo 2** — headings / buttons (heavy rounded)
- **Nunito** — body / instruction text

Self-host WOFF2 (never the Google CDN — must work offline). Keep `OFL.txt`.

### 4.3 Swedish TTS
- **Production:** Piper TTS (MIT) → generate `.mp3/.ogg` at build, bundle as static assets. Or human recordings.
- **Scaffold (now):** Web Speech `SpeechSynthesis` `sv-SE`, feature-detected, fallback-only in prod.
- **Reject** runtime cloud TTS.
- Audio filenames use ASCII-folded keys (å/ä/ö → a/a/o).

---

## 5. Toddler UX/UI Design Rules

### P0 — Non-negotiable
- **Parental gate on EVERY adult action** (settings, exit, profile delete/reset, external links). A 2-5yo must not pass; a parent passes in <5s.
- **Gate = press-and-hold a marked button 2-3s with a filling ring** ("Håll inne knappen"). Lifting resets. Never a bare PIN.
- **No accidental exits:** `display: fullscreen/standalone`, `touch-action: none`, `user-scalable=no`, suppress context menu/long-press, orientation locked. Only gated Exit leaves.
- **No ads, no third-party tracking, no analytics, no runtime network.** Fully offline.
- **All data local** (`localStorage` JSON). Profile names are parent-entered labels on-device. No accounts/email/child PII.
- **No ungated external links** anywhere.
- **No fail states.** No Game Over, no losing, no punishing timers, no lives, no scores that drop.

### P1 — Touch / gesture / navigation
- Touch targets **≥96px (≥2cm); ≥24px spacing; +24px invisible hit-halo**. Snap drops to nearest valid target.
- Gestures: **TAP and simple DRAG(snap) only.** Forbidden: double-tap, long-press, pinch, rotate, multitouch, fast swipe-nav, precise drag. Every drag has a **tap-tap fallback** and snap-back on miss.
- **Zero reading required.** Navigation by large recognizable icons/imagery.
- **Spoken Swedish drives everything:** auto-play a short prompt on game entry ("Tryck på katten!"); persistent replay button; gentle re-cue if idle 5-8s.
- **Show, don't tell:** bounce/pulse/wiggle the target; pointing-hand/sparkle; one-time ghost demo of a drag path.
- **Icon-first menus:** library = grid of large distinct colorful tiles, one concept each.

### P1 — Feedback & visual
- **Every touch → multi-sensory feedback <100ms** (scale/glow/particle + friendly sound).
- **Positive reinforcement only.** Wrong/empty taps still fun (object giggles/wiggles) — never a buzzer, red X, or scolding. Reward = the activity + short (1-2s) celebrations.
- **Calm, high-contrast, simple visuals:** one focal activity per screen, large simple shapes, limited palette, muted backgrounds. No rapid auto scene-cuts, no neon flashing, no nonstop loud music. Text ≥24px.

### P2 — Healthy engagement
No dark patterns (no infinite scroll, daily-streak guilt, notifications, FOMO). Natural stopping points. Optional parent-set soft session reminder behind the gate. Per-game + global mute near gated settings.

### "Exit App" reality
`window.close()` is a no-op for installed PWAs. So: Exit → **parental gate** → "Avsluta? Ja/Nej" → on Ja, best-effort `window.close()`; if still open, navigate to splash + show "Du kan stänga appen nu".

---

## 6. App Architecture

See `CLAUDE.md` for the folder structure, the `GameModule` contract, screen flow, and the save-data JSON schema (kept in sync with code).

---

## 7. Prioritized Game Backlog (35 concepts)

**drag:** Sortera Skräp ⭐, Mata Monstret, Klä på Nallen, Lägga in Tvätten, Plantera Frön
**lärande:** Formhål, Räkna Äpplena, Hitta Bokstaven, Färgregn, Siffertåget
**pedagogiskt:** Vilket Djur Låter Så?, Peka på Kroppen, Var Bor Djuret?, Klä efter Vädret, Dag och Natt
**roligt:** Klämbubblor ⭐, Pruttknappen, Tryck och Förvandla, Kittla Figuren, Tårta i Ansiktet
**fysik:** Bygg Tornet, Dominoraset, Bubbeljakt, Plask i Vattnet, Rulla Bollen Hem
**pussel:** Enkelt Pussel, Skuggmatchning, Stor/Liten Sortering, Para Ihop, Vad Hör Inte Hemma?
**motorik:** Poppa Ballongerna, Klappa Mullvaden, Fånga Fjärilarna, Spåra Linjen, Måla med Fingret
**minne:** Vändkort ⭐, Vart Tog Det Vägen?, Vad Försvann?, Härma Melodin, Följ Spåret

**First 3 built:** Klämbubblor (tap), Sortera Skräp (drag), Vändkort (memory) — span both input types and yield three reusable building blocks (cause-effect loop, DragController, state/grid logic).

---

## 8. Open Risks & Decisions

| # | Risk | Decision |
|---|---|---|
| R1 | Swedish TTS offline | Pre-generate Piper/human, bundle. Web Speech `sv-SE` is scaffold fallback. |
| R2 | No reliable PWA exit | Gated "Avsluta? Ja/Nej" → best-effort close → fall back to splash. |
| R3 | Gate strength vs accessibility | Press-and-hold 2-3s default; spoken-3-digit alt option. |
| R4 | iOS ignores `display: fullscreen` | `display_override: ['fullscreen','standalone']`. |
| R5 | Precache size | Precache shell + core games; `maximumFileSizeToCacheInBytes` 8 MiB; runtime-cache large media. |
| R6 | SW update mid-game | `prompt` mode; apply only at menu/library boundary. |
| R7 | WebGL vs WebGPU | `preference: 'webgl'`; real-device test before scaling. |
| R8 | Asset license hygiene | CC0-first; maintain `ASSET_LICENSES.md`. |
| R9 | localStorage quota/corruption | Single key + backup; try/catch; validate-on-load; migrations; `storage.persist()`. |
| R10 | Host character / IP | Original CC0-derived mascot. |
| R11 | Drag usability under-4 | DragController: halo + snap + snap-back + tap-tap fallback. |
| R12 | Reward overstimulation | Rewards capped 1-2s; no points/streaks. |
