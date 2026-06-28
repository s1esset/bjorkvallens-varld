# Tillgångar & licenser (liggare)

**Mål: noll attributionskrav.** Föredra CC0 / public domain överallt. Om en CC-BY-tillgång
någonsin används MÅSTE den loggas här och en "Krediter/Tack"-skärm läggas till i appen.

## Nuvarande tillgångar

| Tillgång | Var | Typ | Källa | Licens | Attribution? |
|---|---|---|---|---|---|
| App-ikoner (Bobo) | `public/icons/` | PNG | Egengenererade (`npm run icons`) | Egen / CC0 | Nej |
| Maskot "Bobo" | `src/lib/mascot.js` | Pixi Graphics | Egenritad | Egen / CC0 | Nej |
| Spelgrafik (Klämbubblor, Sortera Skräp, Vändkort) | `src/games/**` | Pixi Graphics + emoji | Egenritad / systememoji | Egen / CC0 | Nej |
| Ljudeffekter | `src/services/AudioService.js` | Procedurell Web Audio | Egensyntetiserad | Egen / CC0 | Nej |
| Röst | runtime | Web Speech `sv-SE` | Webbläsare/OS | n/a (ingen fil) | Nej |
| Fredoka, Baloo 2, Nunito | `public/fonts/` | WOFF2 | Google Fonts / Fontsource | SIL OFL 1.1 | Nej (behåll OFL.txt) |

> Emoji renderas av enhetens egna emoji-typsnitt (ingen fil bundlas), så ingen emoji-licens gäller.

## Godkända CC0-källor (ingen attribution) för framtida tillgångar

- **Kenney.nl** — sprites, UI, ljud (CC0 1.0)
- **OpenGameArt.org** — filtrera till CC0
- **Freesound** — filtrera till CC0
- **Open Doodles**, **Humaaans** — CC0

## UNDVIK (attribution eller share-alike)

- OpenMoji (CC-BY-**SA**), Flaticon / Freepik gratisnivå (kräver attribution),
  **Mixkit-musik** (förbjuder spel), Game-icons.net / Twemoji (CC-BY).

Verifiera ALLTID enskild CC0-status på OpenGameArt/SVGRepo/Freesound — anta aldrig att hela sajten är CC0.
