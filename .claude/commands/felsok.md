---
description: Granska ett spel (eller hela appen) efter buggar och fixa det som hittas
argument-hint: <spel-id | alla>
---

Felsök: **$ARGUMENTS**

Ingen ny funktionalitet — bara hitta och fixa fel. Läs skill **spel-pipeline** och
**spelkontrakt**.

Checkpoint: `node scripts/korning.mjs start felsok <id>`

## 1. Mät först

- `npm run check -- --game <id>` (eller `npm run check` för hela appen).
- `npm run test <id>` — konsolfel + skärmdump. Kör exit-cykeln medvetet mitt i animationer.

## 2. Granska dimensionerna

Gå igenom spelets fil mot var och en. Vid `alla`: prioritera de spel som `npm run check`
redan klagar på, och de största filerna.

| Dimension | Leta efter |
|---|---|
| **Exit-säkerhet** | `gsap.to()` direkt på Pixi-objekt som förstörs i sin egen `onComplete`; fördröjda callbacks utan `_alive`-vakt; tweens som inte dödas i `destroy` |
| **Läckor** | ticker-callbacks, lyssnare, `PhysicsWorld`, `ThreeLayer` som inte städas; containrar utan `destroy({children:true})` |
| **P0-brott** | träffytor <96px, saknad hit-halo, misslyckande som avslutar/nollställer, synlig poäng, timer, tillrättavisande återkoppling, ogrindad vuxenhandling · **hinder utan tak** (kan låsa spelet) — men hinder man kan anpassa sig runt är tillåtna |
| **Kontrakt** | metadata som inte matchar mappen, `localStorage` direkt, egen ljudmotor, statisk three-import |
| **Prestanda** | allokering per frame, omritning utan förändringsvakt, filter/blur, otextade Graphics-omritningar i tickern |
| **Ljud/röst** | repliker som saknas i `voice-phrases.json`, TTS-uttalade ljudeffekter ("plask!") där ett riktigt klipp finns, `sample()` som aldrig kopplats in |
| **Logik** | tillstånd som inte nollställs mellan omgångar, off-by-one i nivåer, hjälp som aldrig triggar |

## 3. Verifiera innan du fixar

För varje misstänkt fynd: **bevisa det** (läs koden noga, reproducera via harnessen med riktade
`--taps`/`--drag`, eller resonera igenom exakt anropskedja). Plausibla men obevisade fynd
fixas **inte** — de noteras i spelets doc §4. Ett falskt fynd som ändrar kod är värre än ett
missat.

## 4. Fixa och verifiera

Minsta möjliga ändring per fel. Efter varje fix: `npm run check -- --game <id>` +
`npm run test <id>` gröna. Ingen scope-glidning till förbättringar — det är `/polera`.

## 5. Landa

- `fix(<id>): <vad som var fel>` — en commit per spel, explicita sökvägar.
- Notera i `docs/games/<id>.md` §5 vad som var trasigt.
- Bumpa MINOR, `npm run build` && `npm run serve`, post i `docs/SESSIONS.md`,
  `npm run backup`, `node scripts/korning.mjs klar`.

Rapportera: vad som var fel, vad det gjorde för barnet som spelade, och vad som nu är
åtgärdat. Hittade du inget: säg det rakt — det är ett giltigt resultat.
