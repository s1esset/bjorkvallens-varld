---
name: ljud-och-rost
description: Use when working with sound, music or spoken Swedish in this repo. Covers AudioService (sfx/sample/tone, procedural fallback), VoiceService (say/replayLast, exact-text clip manifest, Web Speech fallback), the offline generation pipelines (npm run voice via F5-TTS, npm run sfx via MOSS-SoundEffect), the pending-phrase queue used when those services are down, and how to give a game real musical pitch. Triggers on - ljud, audio, sound, SFX, röst, voice, tal, TTS, voice.say, voiceIntro, audio.sfx, audio.sample, audio.tone, tone, ton, pitch, melodi, djurläte, manifest, voice-phrases, sfx-phrases, MOSS, F5-TTS, narrator, npm run voice, npm run sfx.
---

# Ljud & röst

Allt ljud är **förgenererat lokalt och paketerat som offline-mp3** — inga nätanrop under
körning, inga attributionskrav. Saknas ett klipp faller appen alltid tillbaka mjukt.

## API i spelet

```js
audio.sfx('pop')          // riktigt klipp om det finns, annars procedurell syntes
                          // pop·pling·correct·match·soft·flip·celebrate·whoosh·reveal·tap
audio.sample('djur_ko')   // ENDAST riktigt klipp → true om spelat, false → falla tillbaka på rösten
audio.tone({ freq, dur, type, vol, slideTo, delay })   // stämd blip — grunden för riktig musik
voice.say('Tryck på bubblorna!')   // exakt text → klipp om det finns, annars Web Speech sv-SE
voice.replayLast(true)             // uttrycklig repetera-knapp (kringgår anti-upprepning)
voice.cancel()
voice.kvar    // sekunder KVAR av klippet som spelas just nu (0 vid tystnad/talsyntes)
voice.talar   // sant även för köade meningar som ännu inte fått ett Audio-objekt
```

`voice.say` matchar på **exakt sträng** mot `public/audio/voice/manifest.json`
(`{ "<exakt text>": "<md5>.mp3" }`). Ändrar du en replik ändras nyckeln → nytt klipp behövs.

### ⚠️ Rösten får aldrig kapas — schemalägg aldrig tal på ett fast tal

`say()` anropar `cancel()` som första sak: **varje ny replik avbryter den som spelas.** De
F5-genererade klippen är **2,3–4,1 s** medan spelens `ctx.later(...)` nästan alltid står på
2–3 s, så en fast konstant kapar rutinmässigt föregående mening. Uppmätt i `mata-munnen`:
introt (3,65 s) kapades av nästa replik, och belöningsraden (2,71 s) hann höras till 54 %.
Ett barn hör det som att någon blev avbruten — samma bugfamilj som "två röster samtidigt"
(`mata-munnen.md` §5 v1.194), fast åt andra hållet.

- Vänta in `voice.kvar` / `voice.talar` i stället för att gissa.
- Figurens EGNA klipp går genom `AudioService`; deras längd kommer från
  `audio.sampleDuration(namn)`. Vänta in **båda** (mönstret heter `_narTyst` i `mata-munnen`).
- **BILDEN väntar inte.** P0 kräver återkoppling <100 ms — ring, gest och glitter kommer
  genast; bara orden köar.
- Mät det så här: haka på `voice.say` och logga `voice.kvar` FÖRE anropet — ett tal > 0 är en
  mening barnet aldrig hörde klart. Kontrollarm = den gamla schemaläggningen kortsluten i
  samma session. Räkna bort anti-upprepningsfönstret (samma text inom 8 s släpps av tjänsten
  **före** `cancel()` och kapar alltså ingenting). Facit: `scripts/_onskeprobe.mjs`.

## Riktig tonhöjd (mönster #4 i kvalitetsgrinden)

"Musik"-spel som använder `pling/pop/flip` låter aldrig som musik. Ge plattor/klossar/djur en
**stämd skala** (C-dur pentatonisk fungerar utmärkt för 2–5 år) via `audio.tone()`, så att en
sekvens eller stapel bildar en verklig melodi. Stigande skala är också det naturliga
kombo-/förvandlings-/rostningsljudet. Facit: `loopdjuren`, `djurorkester`, `harma-melodin`,
`folj-sparet`, `glasstornet`.

## Generering (offline, lokalt)

| | Röst | SFX |
|---|---|---|
| Kommando | `npm run voice` | `npm run sfx` |
| Motor | F5-TTS (narrator-venv i `C:/repos/storygen`) | MOSS-SoundEffect, FastAPI `:8003` |
| Källa | `scripts/voice-phrases.json` (platt array av exakta svenska strängar) | `scripts/sfx-phrases.json` (`key → { prompt, duration }`) |
| Utdata | `public/audio/voice/<md5>.mp3` + `manifest.json` | `public/audio/sfx/<key>.mp3` + `manifest.json` |

Båda är **idempotenta** (hoppar över det som redan finns). `npm run sfx --force --only <key>`
slår om ett enskilt ljud. Båda använder en venv-sökväg med snedstreck → **kör dem från
PowerShell** (cmd/npm sväljer inte sökvägen under git-bash).

Små UI-blipp (`tap · pling · flip · correct · match · soft`) stannar medvetet procedurella —
MOSS är foley-orienterad och brusig för knastertorra musikaliska blipp.

## Kö-protokollet när tjänsterna är nere (normalläget)

Tjänsterna körs inte alltid. Pipelinen får **aldrig** blockera ett spel på dem:

1. Nya svenska repliker läggs till i `scripts/voice-phrases.json` direkt när spelet skrivs.
2. Spelet levereras och är fullt spelbart via **Web Speech-fallback**.
3. `npm run check` rapporterar hur många repliker som saknar klipp (varning, inte fel).
4. När narratorn är uppe: **`/rost`** genererar alla pending klipp i klump och committar
   `feat(voice): N nya klipp`.

Samma sak för djurläten/textur-SFX mot MOSS: lägg in nyckel+prompt, koppla `audio.sample()` i
spelet redan nu (den faller tillbaka av sig själv), generera senare.

## Svenska

UI- och rösttext behåller **å/ä/ö**. Id:n, filnamn och ljudnycklar `asciiFold()`:as (å/ä→a, ö→o).
Röstrepliker är hela svenska meningar, inte nyckelord.
