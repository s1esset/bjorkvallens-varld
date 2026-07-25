---
description: Generera alla väntande röstklipp (och SFX) offline när tjänsterna är uppe
---

Generera de röstrepliker som saknar klipp.

Läs skill **ljud-och-rost**. Kör kommandona från **PowerShell** — venv-sökvägen med snedstreck
fungerar inte under git-bash.

## 1. Se vad som väntar

```bash
npm run check          # rapporterar "♪ N repliker väntar på röstklipp"
```

Kontrollera också att varje replik som spelen säger faktiskt ligger i
`scripts/voice-phrases.json` — `npm run check` varnar för dem som saknas (de får aldrig ett
klipp och fastnar på Web Speech för alltid). Lägg till dem först.

## 2. Kör generatorn

```powershell
npm run voice          # F5-TTS via narrator-venv → public/audio/voice/*.mp3 + manifest.json
```

Idempotent: befintliga klipp hoppas över. Är tjänsten nere (venv saknas, modellen laddas inte)
— **avbryt utan att ändra något** och rapportera att kön ligger kvar. Appen fungerar under
tiden via Web Speech-fallback; ingenting är trasigt.

## 3. SFX (om användaren ber om det)

```powershell
npm run sfx                          # alla saknade nycklar i scripts/sfx-phrases.json
npm run sfx -- --force --only <key>  # slå om ett enskilt ljud
```

Kräver MOSS-SoundEffect på `:8003`. Små UI-blipp (`tap·pling·flip·correct·match·soft`) ska
medvetet förbli procedurella — generera dem inte.

## 4. Verifiera och landa

- `npm run check` — antalet väntande klipp ska ha gått ner.
- Lyssna översiktligt: rätt språk, rimlig längd, ingen avhuggen mening.
- `feat(voice): <N> nya klipp` (eller `feat(sfx): …`) — inkludera `public/audio/**` och
  ev. ändrad `scripts/voice-phrases.json`.
- Bumpa MINOR, `npm run build` && `npm run serve`, post i `docs/SESSIONS.md`, `npm run backup`.

Rapportera hur många klipp som gjordes, hur många som återstår, och om något misslyckades.
