# Poleringsrundan — ett spel i taget tills alla 70 är genomgångna

**Uppdrag från ägaren:** gå igenom **alla spel**, flik för flik, med samma metod som användes
på ⚙️ Fysik-fliken 2026-08-04 (v1.7.0). Leta buggar och problem, fixa dem, och lyft
**design, assets och omspelsvärde**. En commit per spel.

> ⚙️ **Fysik-fliken är KLAR** (27/27, v1.7.0). 🎉 **Roligt-fliken är KLAR** (14/14, v1.8.0).
> Kvar: 🧩 Pussel (19) → 🔤 Lära (9) = **28 spel**. Bocka av i tabellerna nedan när ett spel
> är committat.

> 💡 **Elfte läckan, hittad i `enhorning-glitterbajs`: loggen ljuger.** Doc §5 påstod sedan
> 2026-07-01 att maten ger olika glitter — men `makePelletView()` **tog inget argument** och
> ignorerade `_glitterKind`, så alla tre maträtterna gav identiska gula prickar. En grön testkörning
> och en nöjd logg-rad räcker inte: **verifiera att den påstådda kopplingen går hela vägen fram
> till pixlarna.** Leta efter funktioner som anropas med ett argument de inte deklarerar.

> 💡 **Tolfte läckan, hittad i `tryck-och-forvandla`: framsteg vid INGÅNG.** `progress.setLevel()`
> låg i `init`, före första trycket, så `_idleprobe` gav `idleFramsteg: 1` utan en enda beröring.
> Det är inte ett spel som spelar sig självt — men det förgiftar sonden och döljer riktiga fall.
> Regel: progress skrivs när barnet klarat något, aldrig när spelet startar. Greppa efter
> `progress.set*(` inuti `init`.

> 💡 **Sjätte läckan, hittad i `bajs-och-kiss`:** `arc()` i en **delad** `Graphics` fortsätter
> den aktuella vägen — utan `moveTo` till bågens startpunkt först ritas ett streck från förra
> formen till bågen (här: ett brunt streck tvärs över båda barnen). Syns bara i skärmdumpen.
> Leta efter `.arc(` som följer på en `.fill(`/`.stroke(` i samma `Graphics`.

> 💡 **Sjunde läckan, hittad i `pizzabageriet`:** när emoji ersätts med ritade Graphics
> försvinner de **ljusa** föremålen (ben, ägg, vitlök, stekt ägg) mot ljusa paneler och
> hyllor — emojin hade en inbyggd mörk kontur som ritningen saknar. Ge allt som är
> ljusare än ~0xf0e8d8 en egen kontur (`stroke` eller en något mörkare form under).
> Syns bara i skärmdumpen, aldrig i koden.

> 💡 **Åttonde läckan, hittad i `hamburgerbygget`:** ett drag-lager med
> `eventMode = 'none'` skär bort **hela subträdet** från händelser. Flyttar man ett
> *interaktivt* objekt dit mitt i ett drag (om-drag av ett redan placerat föremål) slutar
> det följa fingret, och varken `pointerup` eller `pointerupoutside` når fram — greppet kan
> aldrig avslutas och släpp-målen blir omöjliga att träffa. Använd **`'passive'`**: lagret
> självt är genomsläppligt, men interaktiva barn får sina händelser. Syns varken i koden
> eller i skärmdumpen — bara när man faktiskt drar. Leta i spel som flyttar objekt mellan
> containrar under ett drag.

> 💡 **Nionde läckan igen, värre i `pruttbad`:** `idleprobe` gav **4 klarade nivåer på 60 s utan
> ett tryck**. Två *olika* gratis-skum-kranar samverkade: en idle-"auto-hjälp" som födde ett
> riktigt spelobjekt, och en **anti-stuck-vakt** som fyllde mätaren direkt när inget fanns att
> lossa. Vakter som ska garantera att spelet inte kör fast är den farligaste sorten — de ser ut
> som ren no-fail-hygien i koden. Regeln: en vakt får **lossa** det barnet redan skapat, aldrig
> **skapa** framsteg. Och idle-hjälp ska bjuda in (min, ljud, pekande hand), inte spela åt barnet.
> Kör `node scripts/_idleprobe.mjs <id> 60` på varje spel med en mätare som kan fyllas passivt.

> 💡 **Tionde läckan, hittad i `pruttbad`:** **mätaren och scenen är inte samma sanning.** Målet
> växte per nivå (`goalFoam += 18`) men mållinjens y-värde var `clamp(…, 220, …)` — från nivå 3
> bottnade linjen medan kravet fortsatte växa, så badet såg **fullt ut långt innan det var klart**.
> Samma sak i miniatyr: skummets bubbeltoppar sköt 20 px över skumkroppen, så kronan nådde linjen
> vid 74 %. Rita alltid fyllnaden som **andel av vägen till målet**, och dra av det som sticker
> upp över ytan. Syns bara om man jämför mätaren med scenen i samma skärmdump.

> 💡 **Nionde läckan, hittad i `sapbubblor`:** **spelet spelar sig självt.** No-fail hade glidit
> över i att mätaren fylls medan barnet tittar på — en hel nivå klarades på **10 sekunder utan ett
> enda tryck**. Två samverkande orsaker, båda osynliga i kod *och* i skärmdumpen: objekt som föds
> i målets bana (här: var tredje bubbla i ringens lodräta korridor) plus en förlåtande "sug"-radie
> som är bredare än den ser ut. En 4-sekunders testkörning missar det helt — det syns först när
> man låter spelet stå. Använd **`node scripts/_idleprobe.mjs <id> 60`**: den nollställer progress,
> rör inget på 60 s och spelar sedan riktat. Utfallet ska vara `utanInput: 0` och `efterSpel > 0`.
> Gäller varje spel med ett mål som objekt kan driva in i av sig själva.

---

## Metoden (per spel — ~30–60 min)

Följ `/polera <id>`-kedjan i skill **spel-pipeline**. I korthet:

1. **Läs** `docs/games/<id>.md` §3 (vad som är tunt) + §4 (planen) + §5 (vad som redan gjorts).
2. **Kör** `npm run test <id>` och **titta på `.test-shots/<id>.png` som spelare.**
   Det är här nästan alla verkliga fel hittas — inte i koden, inte i harnessen.
3. **Bygg** omgången. Bevara mekanik, kontrakt, exit-säkerhet och sparad progress.
4. **Grind:** `npm run check -- --game <id>` grön · `npm run test <id>` 0 fel.
5. **Commit** `feat(<id>): …` med explicita sökvägar. Uppdatera doc §5 + indexstatus.

### De fem läckorna — leta efter dessa FÖRST

Fysik-omgången visade var kvaliteten systematiskt läcker. Samma mönster gäller
sannolikt de tre återstående flikarna.

1. **Emoji som HELA spelobjekt** (20 av 27 fysikspel), ofta i en ruta eller cirkel — exakt
   det P0 `ASSETS` förbjuder. Sök `new Text({ text:` — men **glöm inte varianten
   `new Text({ text: variabel })`**, som en grep efter `text: '` missar helt. Kolla också
   konstantlistor (`const FRUITS = ['🍎', …]`).
2. **Layoutbuggar som bara syns i skärmdumpen**: mätare bakom ett annat element eller under
   skalets hörnknappar (hem 70,64 · ljud 1210,64), etiketter som klipps av nederkanten
   (y + höjd > 720), mörk text mot mörk bakgrund. Sex sådana i fysikomgången.
3. **Ikoner som ritas först vid interaktion** — en `_toggle`-metod som ritar ikonen men som
   aldrig anropas vid bygget ⇒ tom knapp tills första trycket.
4. **Konkatenerade röstrepliker** (`'Hjälp ' + namn + '…'`) — `check.mjs` hittar dem inte, så
   `/rost` kan aldrig generera ett klipp. Skriv hela repliker som literaler.
5. **Tomma scener** — mekanik ovanpå en gradient. Ett staket, tre träd, grässtrån och en
   figur som *tar emot* lyfter mer än någon mekanisk finess.

Plus de vanliga kodbuggarna: `gsap.delayedCall` → **`ctx.later()`**, oändliga tweens som
skriver direkt till Pixi-objekt som kan förstöras (använd proxy-mönstret), och listor som
växer obegränsat under en lång session.

### Verktyg

- `node scripts/_addphrases.mjs <id>` — läser `check`-utdata och lägger de saknade
  replikerna i `scripts/voice-phrases.json` (hämtar hela strängen ur källan, eftersom
  check trunkerar vid 48 tecken).
  > ⚠️ **Den lägger till precis vad check rapporterar — även skräp.** I ett spel med
  > läcka #4 är "repliken" ofta bara en *bit* av en mall-sträng (`"Tryck på de "`,
  > `" dropparna!"`) eller en ren **platshållare** (`"Hitta {d}!"`). Körs `/rost` efter
  > det får du klipp där rösten läser upp "dropparna!" eller "{d}" högt. **Granska alltid
  > diffen mot `voice-phrases.json` efteråt** — allt som börjar/slutar med blanksteg eller
  > innehåller `{ } $` ska bort, och den riktiga fixen är att skriva om repliken som en
  > hel literal i spelet. (Hände 2026-08-05: 8 platshållare från `peka-pa-kroppen` hann få
  > klipp innan de rensades.)
- `node scripts/test-game.mjs <id> --shot .test-shots/<id>.png --taps "x,y;…"` /
  `--drag "fx,fy>tx,ty;…"` — riktad körning när standardtrycken inte når mekaniken.
  **Obs:** skärmdumpen tas 900 ms efter sista trycket, så ett objekt kan fångas mitt i en
  respawn-animation (skala ~0). Kör om utan tryck om något ser ut att "saknas".

### Klar-definition per spel

`npm run check -- --game <id>` grön · `npm run test <id>` 0 fel · doc §5 uppdaterad ·
committad. Sätt **✅** i `docs/games/README.md` bara om alla **8 grindpunkter** är sanna
(se skill **spel-pipeline**) — annars står spelet kvar som 🔧 med kvarvarande [Deep]-punkter
i sin doc §4. *Var ärlig här; en ✅ som inte håller är värre än ett 🔧.*

---

## Kö 1 — 🎉 Roligt ✅ KLAR (14/14)

Sorterad efter uppmätt asset-skuld (emoji-Text ×3 + dynamisk Text ×2 + emoji-listor).
`zackes-biltvatt` är redan ✅ och hoppas över.

| # | id | skuld | status |
|--:|----|------:|:--:|
| 1 | `bajs-och-kiss` | 17 | ✅ |
| 2 | `pizzabageriet` | 11 | ✅ |
| 3 | `hamburgerbygget` | 11 | ✅ |
| 4 | `sapbubblor` | 10 | ✅ |
| 5 | `pruttbad` | 10 | ✅ |
| 6 | `lagerelden` | 10 | ✅ |
| 7 | `enhorning-glitterbajs` | 9 | ✅ |
| 8 | `loopdjuren` | 9 | ✅ |
| 9 | `regnbagsmalaren` | 6 | ✅ |
| 10 | `fyrverkeri` | 3 | ✅ |
| 11 | `tryck-och-forvandla` | 2 | ✅ |
| 12 | `klambubblor` | 1 | ✅ |
| 13 | `kittla-figuren` | 1 | ✅ |
| 14 | `tarta-i-ansiktet` | 0 | ✅ |

## Kö 2 — 🧩 Pussel (19 spel)

Alla är märkta ✅ i indexet, men det var **första-omgången 2026-07-02 — före att P0-regeln
`ASSETS` fanns** (den kom 2026-07-25). Skulden nedan är uppmätt, inte gissad. Kör dem ändå,
och sänk till 🔧 om något visar sig inte hålla.

| # | id | skuld | status |
|--:|----|------:|:--:|
| 1 | `golvet-ar-lava` | 22 | ✅ |
| 2 | `kulbana` | 18 | ✅ |
| 3 | `magnet-fiske` | 16 | ✅ |
| 4 | `trollblandning` | 16 | ✅ |
| 5 | `plantera-fron` | 12 | ✅ |
| 6 | `folj-sparet` | 12 | ✅ |
| 7 | `vad-forsvann` | 11 | ✅ |
| 8 | `vattenvagen` | 11 | ✅ |
| 9 | `kla-pa-nallen` | 10 | ✅ |
| 10 | `vandkort` | 9 | ✅ |
| 11 | `kugghjulen` | 9 | ✅ |
| 12 | `sortera-skrap` | 8 | ✅ |
| 13 | `skuggmatchning` | 7 | ✅ |
| 14 | `stor-liten` | 5 | ✅ |
| 15 | `enkelt-pussel` | 4 | ✅ |
| 16 | `mata-monstret` | 3 | ✅ |
| 17 | `vart-tog-det-vagen` | 3 | ⬜ |
| 18 | `harma-melodin` | 2 | ⬜ |
| 19 | `glittergrottan` | 0 | ⬜ |

## Kö 3 — 🔤 Lära (9 spel)

| # | id | skuld | status |
|--:|----|------:|:--:|
| 1 | `ballonglyft` | 14 | ⬜ |
| 2 | `vilket-djur-later` | 12 | ⬜ |
| 3 | `blixt-och-dunder` | 8 | ⬜ |
| 4 | `kla-efter-vadret` | 5 | ⬜ |
| 5 | `siffertaget` | 4 | ⬜ |
| 6 | `djurorkester` | 4 | ⬜ |
| 7 | `peka-pa-kroppen` | 3 | ⬜ |
| 8 | `fargregn` | 0 | ⬜ |
| 9 | `rakna-applen` | 0 | ⬜ |

> **Obs om `vilket-djur-later` och `djurorkester`:** där är emoji-djuren delvis *avsiktliga*
> som svarsalternativ på kort. Läs P0 `ASSETS` noga — kort och paneler får bära TEXT och
> UI-kontroller, men ett djur man ska känna igen är ett **spelobjekt** och ska ritas.

---

## Efter varje flik

1. `npm run check` grön · `npm run test:all` (jobs 2) · `npm run test:fx` grön.
2. Bumpa MINOR i `package.json`.
3. Ny post i `docs/SESSIONS.md` + uppdatera `docs/games/README.md`-indexet.
4. Uppdatera minnesfilen `project-status.md`.
5. `npm run backup`.

## När alla 70 är klara

Kör `/rost` (kräver att F5-TTS-narratorn är uppe) för de repliker som väntar på klipp —
136 vid v1.7.0 och det växer med varje omgång. Sedan `npm run build` + `npm run serve`
för en riktig telefontest.
