# Björkvallens Värld 🐻

En offline-first **PWA med minispel för barn 2–5 år**, helt på svenska. Tablet-först, **ingen reklam, ingen spårning, inga nätanrop under körning**. Byggd med PixiJS v8 + Vite + vite-plugin-pwa.

> Modulär arkitektur: ett tunt skal (splash → meny → inställningar/bibliotek → spel) som kör fristående **spel-moduler**. Lägg till ett nytt spel = en mapp under `src/games/` + en rad i registret.

## Snabbstart

```bash
npm install
npm run assets   # (valfritt, en gång) hämta typsnitt för offline-bruk
npm run dev      # http://localhost:5173
```

Bygg för produktion (genererar service worker + manifest):

```bash
npm run build
npm run preview  # testa installerbar PWA + offline
```

## Vad som finns

- **Skal:** Splash, Huvudmeny (Spela / Inställningar⚙ / Avsluta🚪), Inställningar, Spelbibliotek (rutnät).
- **Spar-system:** flera barnprofiler i `localStorage` (skapa, byt namn, byt avatar, nollställ, ta bort, exportera/importera JSON). Per-profil framsteg och stjärnor.
- **Föräldra-grind:** tryck-och-håll före alla vuxen-handlingar.
- **Svensk röst:** instruktioner talas (Web Speech `sv-SE` i grundbygget; byt till förgenererade klipp för produktion).
- **Tre spel:**
  - 🫧 **Klämbubblor** — tryck/orsak-verkan (2–3 år)
  - ♻️ **Sortera Skräp** — dra och släpp i rätt tunna (3–5 år)
  - 🃏 **Vändkort** — minne/par, växande rutnät (3–5 år)

## Lägga till ett spel

Se **`CLAUDE.md`** (GameModule-kontraktet + checklista). I korthet: kopiera `src/games/klambubblor/`, ändra `id`/`titleSv`/`category`/`icon`, bygg scenen i `init/mount/destroy`, lägg till i `src/games/registry.js`.

## Dokument

- **`CLAUDE.md`** — arbetsregler, GameModule-kontrakt, save-schema, Pixi v8-konventioner.
- **`ARCHITECTURE.md`** — research, marknadsinsikter, full stack-/asset-/UX-genomgång, backlog (35 spelidéer).
- **`ASSET_LICENSES.md`** — licens-liggare (mål: noll attributionskrav).

## Designlagar (urval)

Inga felsteg · ingen reklam · ingen läsning krävs · stora träffytor · talad svenska · varje pekning ger positiv återkoppling < 100 ms · all data stannar på enheten. Fullständig lista i `CLAUDE.md`.

## Licens

Kod: din att äga. Typsnitt: SIL OFL 1.1. Spel-grafik i de tre första spelen ritas programmatiskt (emoji + Pixi Graphics) → inga externa tillgångar/attributionskrav.
