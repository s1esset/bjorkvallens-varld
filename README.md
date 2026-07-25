# Björkvallens Värld 🐻

En offline-first, installerbar **PWA med 69 minispel för barn 2–5 år**, helt på svenska.
Tablet-först. **Ingen reklam, ingen spårning, inga nätanrop under körning, inga fel-lägen.**
Byggd med PixiJS v8 + three.js + matter.js + Vite.

> Ett tunt skal (splash → meny → bibliotek → spel) kör fristående **spelmoduler** som alla
> följer ett kontrakt. Ett nytt spel = en mapp under `src/games/` + en rad i registret.

## Snabbstart

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # PWA-bygge (service worker + manifest)
npm run serve      # servera bygget på :4173 — testa på platta/telefon
npm run serve:stop
```

## Så byggs spelen

Projektet drivs av en pipeline: **du skriver en spelidé på svenska, godkänner ett spec-kort,
och nästa gång du hör något är spelet byggt, testat, committat och serverat.**

```
/spel Elvira flyger genom moln och plockar stjärnor, man drar för att styra
   → spec-kort ✋ du godkänner
   → plan · bygg · registrera · kontroll · test · kritik · fix
   → commit · version · bygge · logg · backup
   → "✅ Stjärnflykten ⭐ ligger i Roligt. Ladda om appen — leta efter v1.12."
```

| Kommando | Gör |
|---|---|
| `/spel <idé>` | ny idé → färdigt spel i biblioteket |
| `/polera <id>` | lyfter ett befintligt spel en nivå |
| `/felsok <id>` | granskar efter buggar och fixar dem |
| `/fixa <id> <fel>` | riktad fix på något du sett när du spelat |
| `/testa [id\|alla]` | headless-test + skärmdumpar |
| `/rost` | genererar väntande röstklipp |
| `/avsluta` · `/aterta` | avslutar / återupptar en session |

Hela flödet, kvalitetsgrinden och krasch-återhämtningen: **`docs/PIPELINE.md`**.

## Verktyg

```bash
npm run check        # kontrakt, register, P0-regler, docs, röst-täckning
npm run test <id>    # headless: tryck/dra, skärmdump, exit-säkerhetscykel
npm run test:all     # alla 69 spel parallellt
npm run backup       # robocopy-spegel till E:\backup\pwagames
npm run voice        # generera röstklipp offline (F5-TTS, kör från PowerShell)
npm run sfx          # generera ljudeffekter offline (MOSS-SoundEffect)
npm run icons        # app-ikoner
```

## Vad som finns

- **Skal:** splash, huvudmeny, inställningar, spelbibliotek med fyra flikar
  (🎉 Roligt · ⚙️ Fysik · 🧩 Pussel · 🔤 Lära), swipe mellan flikar, Nyast/A–Ö-sortering.
- **69 spel** — tap, drag och fysik, inklusive 3D (three.js) och två matlagningsspel.
- **Sparsystem:** flera barnprofiler i `localStorage` (skapa, byt namn/avatar, nollställ,
  exportera/importera JSON). Per-profil framsteg, stjärnor och klistermärken.
- **Föräldragrind:** tryck-och-håll 2,5 s före alla vuxenhandlingar.
- **Svensk röst & ljud:** förgenererade offline-mp3 (F5-TTS + MOSS-SoundEffect) med
  procedurell Web Audio och Web Speech som fallback — inga nätanrop, inga attributionskrav.

## Designlagar (urval)

Inga fel-lägen · ingen reklam · ingen läsning krävs · träffytor ≥96px · talad svenska ·
varje pekning ger positiv återkoppling <100 ms · all data stannar på enheten.
Fullständig lista i **`CLAUDE.md`**.

## Dokument

| | |
|---|---|
| `CLAUDE.md` | arbetsregler, P0, kommandoyta, routing |
| `docs/PIPELINE.md` | idé → spelbart, kvalitetsgrind, krasch-återhämtning |
| `docs/DESIGN.md` | globalt UI-designsystem (tokens, komponenter, versionering) |
| `docs/games/README.md` | index över alla 69 spel + återkommande förbättringsmönster |
| `docs/games/<id>.md` | per spel: spec, nuläge, ärlig kritik, plan, logg |
| `docs/SESSIONS.md` | sessionslogg — vad som hänt, senast överst |
| `ARCHITECTURE.md` | levande arkitekturbeslut |
| `ASSET_LICENSES.md` | licensliggare (mål: noll attributionskrav) |
| `.claude/skills/` | djupdykningar som laddas vid behov (kontrakt, fysik, ljud, 3D, skal) |

## Licens

Kod: din att äga. Typsnitt: SIL OFL 1.1 (Fredoka, Baloo 2, Nunito), egen-hostade.
Spelgrafiken ritas programmatiskt (emoji + Pixi Graphics) → inga externa tillgångar.
