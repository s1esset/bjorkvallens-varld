---
name: spel-pipeline
description: Use when running any of the project pipelines - building a new game from an idea, upgrading/polishing an existing game, auditing for bugs, fixing a reported issue, testing, or wrapping up a session. Covers the staged pipeline, the checkpoint/resume protocol that survives crashes and power cuts, the market-quality gate, commit and version conventions, and the session log. Triggers on - pipeline, /spel, /polera, /felsok, /fixa, /testa, /avsluta, /aterta, nytt spel, spec-kort, kvalitetsgrind, checkpoint, resume, återuppta, wrap up, session log.
---

# Pipeline: idé → spelbart

Alla pipelines delar samma stomme: **checkpoint → arbete → grind → checkpoint**.
Grinden är alltid `npm run check` + `npm run test` med **0 fel** innan något committas.

## Checkpoint-protokollet (överlever krasch/strömavbrott)

Varje pipeline skriver `.claude/state/korning.json` **innan** varje steg börjar:

```jsonc
{
  "kommando": "/spel", "id": "stjarnflykten", "titel": "Stjärnflykten",
  "startad": "2026-07-25T13:40:00Z", "uppdaterad": "…",
  "steg": "bygg",                       // aktuellt steg
  "klara": ["spec", "plan"],            // avklarade steg
  "artefakter": { "spec": "docs/games/stjarnflykten.md", "commits": [] },
  "nasta": "npm run test stjarnflykten", // exakt nästa handling
  "anteckningar": "drag-spel, testa med --drag"
}
```

Regler:
- Skriv filen **före** steget, uppdatera `klara` **efter**. Aldrig batcha.
- Sista steget sätter `"steg": "klar"` — då är körningen avslutad och filen får raderas.
- `scripts/session-start.mjs` lyfter en oavslutad körning vid varje ny session.
- **`/aterta`** läser filen, verifierar verkligt läge mot disk (`git status`, finns filerna?
  passerar `npm run check`?) och fortsätter från `nasta` — den litar aldrig blint på `steg`.
- Om verkligheten och filen inte stämmer: verkligheten vinner, uppdatera filen, fortsätt.

## Kvalitetsgrinden (ett nytt/polerat spel får ALDRIG landa som 🔧)

Ur `docs/games/README.md`-rubriken. Alla sju ska vara sanna, annars är spelet inte klart:

1. **Agens** — varje tryck/drag är ett *val* som påverkar utfallet, inte en knapp med samma
   animation varje gång.
2. **Variation** — omgång 2 ≠ omgång 1 (innehåll, positioner, händelser). Sällsynta wow-ögonblick.
3. **Juice** — ljud+bild <100 ms, squash/stretch, partiklar, efterklang.
4. **Mottagare** — någon tar emot skapelsen och jublar (Bobo/Elvira/figur). Tomma scener = billigt.
5. **Riktig ton/SFX** — `audio.tone()` stämd skala för musik, `audio.sample()` där riktiga klipp
   finns. Aldrig generiska UI-blipp som "musik".
6. **Mjuk progression + motstånd** — fältet växer lugnt och har alltid *nytt att upptäcka*.
   Hinder som barnet kan anpassa sig runt hör hit och gör spelet bättre; de får sakta ner,
   aldrig stoppa, och ska ha ett tak (hur mycket kan gå fel samtidigt?) och lagom takt.
   Aldrig ett misslyckande som avslutar eller nollställer.
7. **Spel-specifik finish** — inte samma konfetti+stjärna som alla andra.
8. **Fristående objekt** (P0 `ASSETS`) — spelobjekt är riktiga ritade föremål med egen
   silhuett och eget liv, aldrig en emoji/ikon i en ruta eller bricka.

Plus P0 (se CLAUDE.md) och exit-säkerhet (se skill **spelkontrakt**).

## `/spel` — ny idé → spelbart

| # | Steg | Vad som händer |
|---|---|---|
| 0 | `spec` | Härled ur en fri svensk mening: `id` (asciiFold), `titleSv`, `icon`, `category`, `input`, `ageRange`, kärnloop, **mål**, mottagare, variationsaxel, finish, 4–8 röstrepliker. Visa **spec-kortet**. ✋ **Enda grinden** — vänta på ja. |
| 1 | `plan` | Skriv `docs/games/<id>.md` ur `docs/games/_MALL.md` (nuläge→plan, taggat [Quick]/[Medium]/[Deep]). |
| 2 | `bygg` | Parallella `spelbyggare`-agenter: **mekanik+mål**, **scen+juice+mottagare**, **ljud+röst**. En äger filen, övriga levererar block. Vid enklare spel: bygg själv. |
| 3 | `registrera` | Import + rad i `src/games/registry.js`. Nya repliker → `scripts/voice-phrases.json` (pending). |
| 4 | `kontroll` | `npm run check` — kontrakt, registry, P0, doc, röst-täckning. Måste vara grön. |
| 5 | `test` | `npm run test <id>` (dragspel: `--drag`). **0 konsolfel**, inkl. exit-mitt-i-animation-cykeln. Loopa fix→test tills grönt. |
| 6 | `kritik` | `spelkritiker`-agent: spelar som 3-åring mot skärmdump+kod, listar vad som är tunt mot de 7 punkterna. |
| 7 | `fix` | Åtgärda kritiken. Om-testa. |
| 8 | `commit` | `feat(<id>): <kort svensk beskrivning>` — **explicita sökvägar**, aldrig `git add -A`. |
| 9 | `version` | Bumpa MINOR i `package.json` (versionspillret `vM.NN` är förälderns kvitto). |
| 10 | `leverans` | `npm run build` → `npm run serve`. Rapportera: *"✅ &lt;Titel&gt; &lt;ikon&gt; ligger i &lt;flik&gt;. Ladda om appen — leta efter v1.NN."* |
| 11 | `logg` | Rad i `docs/SESSIONS.md`, rad i `docs/games/README.md`-indexet (status ✅), spegel via `npm run backup`. `steg: klar`. |

## `/polera <id>` — lyft ett befintligt spel

Som `/spel` men: steg 0 = läs `docs/games/<id>.md` §4 (planen finns redan) och föreslå vilka
punkter som tas nu → ✋ grind → bygg → samma grind/test/kritik/commit-kedja.
Commit: `feat(<id>): <vad som lyftes>`. Uppdatera §5 Status/loggar + indexstatus.

## `/felsok <id>` — granskning + fixa allt som hittas

Ingen ny funktionalitet. Fan-out över dimensioner: **exit-säkerhet** (tweens/timeouts utan
`_alive`), **P0-brott** (träffytor <96px, misslyckande som avslutar, poäng, timer, hinder utan
tak), **Pixi-läckor** (ticker/
lyssnare/tweens som inte städas), **kontrakt**, **prestanda** (per-frame-allokering, ostrypta
omritningar), **ljud/röst** (saknade klipp, TTS-uttalade ljudeffekter). Verifiera varje fynd
adversariellt innan fix — plausibla men falska fynd får inte generera ändringar.
Commit: `fix(<id>): …`.

## `/fixa <id> <beskrivning>` — riktad fix

Reproducera först (harness + riktad `--taps`/`--drag`), hitta grundorsaken, minsta möjliga
ändring, om-testa, `fix(<id>): …`. Ingen scope-glidning: hittar du annat → notera i spelets doc §4,
fixa inte oombett.

## `/testa [id|alla]`

`npm run test <id>` eller `npm run test:all` (parallellt, sammanfattningstabell). Kräver
dev-servern (`window.__barnspel` är DEV-only — funkar EJ mot preview-bygget på 4173).

## `/avsluta` — sessionsavslut utan dataförlust

1. `git status` — inget okommittat kvar (committa eller redovisa varför inte).
2. `npm run check` grön.
3. `docs/SESSIONS.md`: en post (datum, version, vad som byggdes, commits, öppna trådar).
4. `docs/games/README.md`-index i takt med verkligheten.
5. Minnesfilen `project-status.md` uppdaterad.
6. `npm run backup` (robocopy → `E:\backup\pwagames`).
7. Radera/stäng `.claude/state/korning.json`.

## Konventioner

- **Commits:** `feat(<id>)` · `fix(<id>)` · `docs(…)` · `chore(…)`. En commit per spel.
  Explicita sökvägar. Aldrig `git push` (repo är lokalt; backup sker med robocopy).
- **Version:** MINOR per hopslagen ändringsomgång; MAJOR vid milstolpe.
- **Parallella agenter:** `registry.js` importerar ALLA spel — en agents halvsparade syntaxfel
  gör harness-körningar flakiga för alla. Kör därför verifieringen **efter** att hela batchen
  landat, och behandla PAGEERROR som nämner symboler utanför din fil som transienta.
- **Röst:** nya repliker läggs till i `scripts/voice-phrases.json` och körs i klump med `/rost`
  när narrator-tjänsten är uppe. Spelet ska alltid funka direkt via Web Speech-fallback.
