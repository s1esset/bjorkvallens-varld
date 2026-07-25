# SESSIONS.md — sessionslogg

En post per avslutad session, **nyast överst**. Skrivs av `/avsluta`. Syftet: nästa session
(eller nästa person) ska förstå var projektet står utan att läsa chatthistorik eller git-log.

Format:

```
## ÅÅÅÅ-MM-DD · v<version>
**Byggt:** vad som gjordes, i klartext
**Commits:** <hash> <ämne> · <hash> <ämne>
**Öppet:** vad som återstår / nästa naturliga steg
```

---

## 2026-07-25 · v1.2.0

**Byggt:** Projektet fick en riktig pipeline. Kunskapen som tidigare låg som prosa i en
261-raders `CLAUDE.md` (och i minnesfiler) är nu **körbara verktyg och laddas-vid-behov-skills**.

- **`CLAUDE.md` 261 → 59 rader** — bara P0-reglerna, kommandoytan och en routingtabell.
  Allt djup flyttat till fem nya skills: `spelkontrakt`, `spel-pipeline`, `fysik-spel`,
  `ljud-och-rost`, `skal-och-data` (plus de befintliga `threejs-*`).
- **8 svenska slash-kommandon** — `/spel` `/polera` `/felsok` `/fixa` `/testa` `/rost`
  `/avsluta` `/aterta`.
- **3 subagenter** — `spelbyggare` (bygger en slice), `spelkritiker` (spelar som 3-åring,
  kvalitetsgrind), `felsokare` (buggjakt med adversariell verifiering).
- **`npm run check`** (`scripts/check.mjs`) — validerar kontrakt, registret åt båda hållen,
  P0-brott, docs och röst-täckning. Strikt läge per spel. Hittade 52 verkliga varningar:
  50 repliker som aldrig kan få ett röstklipp + 2 spel utan `voiceIntro`.
- **`npm run test` / `test:all`** (`scripts/test-games.mjs`) — parallell headless-körning över
  ett/flera/alla spel, med automatiska musdrag för dragspel. **Baslinje: 69/69 gröna.**
- **Krasch-återhämtning** — `.claude/state/korning.json` (checkpoint före varje steg) +
  `scripts/session-start.mjs` som lyfter avbrutna körningar vid sessionsstart + `/aterta`
  som verifierar mot disken innan den fortsätter.
- **`npm run backup`** — robocopy-spegel till `E:\backup\pwagames` (inkl. `.git`, exkl.
  `node_modules`/`dist`). Hoppar tyst över om disken saknas.
- **Docs:** `docs/PIPELINE.md` (människoläsbar pipeline), den här loggen,
  `docs/games/_MALL.md` (spec-mall), omskriven `README.md`, `ARCHITECTURE.md` trimmad till
  levande beslut med forskningen arkiverad i `docs/arkiv/`.

**Öppet:**
- 50 röstrepliker saknas i `scripts/voice-phrases.json` → kör `/rost` när narratorn är uppe.
- 2 spel saknar `voiceIntro` (`npm run check` pekar ut dem).
- Pipelinen är byggd men ännu inte körd skarpt — första riktiga testet är nästa `/spel`.
