# Byggplan — 25 nya spel

Genererad från designresearch. Varje spel har en fristående byggspec i `docs/games/<id>.md`.
Byggs en i taget i ordning (yngre/enklare först). Status spåras i `game-progress.md` (rot).

Redan byggda (ej i denna plan): `klambubblor`, `sortera-skrap`, `vandkort`.

| # | id | Titel | Kategori | Input | Ålder | Svårighet |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [`poppa-ballonger`](games/poppa-ballonger.md) | Poppa Ballongerna 🎈 | motorik | tap | 2–3 | ★☆☆☆☆ |
| 2 | [`tryck-och-forvandla`](games/tryck-och-forvandla.md) | Tryck och Förvandla ✨ | roligt | tap | 2–5 | ★☆☆☆☆ |
| 3 | [`kittla-figuren`](games/kittla-figuren.md) | Kittla Figuren 😄 | roligt | tap | 2–4 | ★☆☆☆☆ |
| 4 | [`fargregn`](games/fargregn.md) | Färgregn 🌈 | larande | tap | 2–4 | ★★☆☆☆ |
| 5 | [`mata-monstret`](games/mata-monstret.md) | Mata Monstret 🍬 | drag | drag | 2–4 | ★★☆☆☆ |
| 6 | [`rakna-applen`](games/rakna-applen.md) | Räkna Äpplena 🍎 | larande | tap | 3–5 | ★★☆☆☆ |
| 7 | [`klappa-mullvaden`](games/klappa-mullvaden.md) | Klappa Mullvaden 🐹 | motorik | tap | 2–4 | ★★☆☆☆ |
| 8 | [`peka-pa-kroppen`](games/peka-pa-kroppen.md) | Peka på Kroppen 👦 | pedagogiskt | tap | 2–4 | ★★☆☆☆ |
| 9 | [`vilket-djur-later`](games/vilket-djur-later.md) | Vilket Djur Låter Så? 🐮 | pedagogiskt | tap | 2–4 | ★★☆☆☆ |
| 10 | [`stor-liten`](games/stor-liten.md) | Stor och Liten 📏 | pussel | drag | 2–4 | ★★☆☆☆ |
| 11 | [`tarta-i-ansiktet`](games/tarta-i-ansiktet.md) | Tårta i Ansiktet 🎂 | roligt | mixed | 3–5 | ★★☆☆☆ |
| 12 | [`kla-pa-nallen`](games/kla-pa-nallen.md) | Klä på Nallen 🧸 | drag | drag | 3–5 | ★★★☆☆ |
| 13 | [`plantera-fron`](games/plantera-fron.md) | Plantera Frön 🌱 | drag | drag | 2–4 | ★★★☆☆ |
| 14 | [`skuggmatchning`](games/skuggmatchning.md) | Skuggmatchning 🌑 | pussel | drag | 2–4 | ★★★☆☆ |
| 15 | [`enkelt-pussel`](games/enkelt-pussel.md) | Enkelt Pussel 🧩 | pussel | drag | 3–5 | ★★★☆☆ |
| 16 | [`plask-i-vattnet`](games/plask-i-vattnet.md) | Plask i Vattnet 💧 | fysik | drag | 3–5 | ★★★☆☆ |
| 17 | [`kla-efter-vadret`](games/kla-efter-vadret.md) | Klä efter Vädret ☔ | pedagogiskt | mixed | 3–5 | ★★★☆☆ |
| 18 | [`vart-tog-det-vagen`](games/vart-tog-det-vagen.md) | Vart Tog Det Vägen? 🥤 | minne | tap | 3–5 | ★★★☆☆ |
| 19 | [`vad-forsvann`](games/vad-forsvann.md) | Vad Försvann? 🔍 | minne | tap | 3–5 | ★★★☆☆ |
| 20 | [`bygg-tornet`](games/bygg-tornet.md) | Bygg Tornet 🧱 | fysik | drag | 3–5 | ★★★★☆ |
| 21 | [`rulla-bollen-hem`](games/rulla-bollen-hem.md) | Rulla Bollen Hem ⚽ | fysik | drag | 3–5 | ★★★★☆ |
| 22 | [`siffertaget`](games/siffertaget.md) | Siffertåget 🚂 | larande | mixed | 3–5 | ★★★★☆ |
| 23 | [`spara-linjen`](games/spara-linjen.md) | Spåra Linjen ✏️ | motorik | drag | 3–5 | ★★★★☆ |
| 24 | [`harma-melodin`](games/harma-melodin.md) | Härma Melodin 🎵 | minne | tap | 3–5 | ★★★★☆ |
| 25 | [`folj-sparet`](games/folj-sparet.md) | Följ Spåret 👣 | minne | tap | 3–5 | ★★★★☆ |

## Bygg-loop per fas
1. Färsk session bygger spelet enligt `docs/games/<id>.md` + `CLAUDE.md`, registrerar i `src/games/registry.js`, `npm run build` ska passera.
2. `/simplify` på den nya kodens diff.
3. Playwright-test: ladda spelet, skärmdump, inga konsolfel, testa kärninteraktion.
4. Fixa buggar + UI/grafik. Re-testa.
5. Uppdatera `game-progress.md`, committa, nästa fas.
