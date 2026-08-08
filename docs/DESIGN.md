# DESIGN.md — Björkvallens Värld, globalt UI-designsystem

Det här dokumentet styr **appens skal** (splash, meny, bibliotek, inställningar, dialoger,
delade komponenter). Spelen ärver tokens och komponenter härifrån men designas inte om av
det här dokumentet. P0-reglerna i `CLAUDE.md` gäller alltid och vinner vid konflikt.
Alla tokens finns som kod i `src/lib/theme.js` — **hårdkoda aldrig ett värde som har en token.**

---

## 1. Designprinciper

1. **Ikon först, noll läsning.** Varje åtgärd förstås av form + färg + ikon; text är en bonus.
   Rösten bär instruktionen.
2. **Knubbigt och mjukt.** Allt tryckbart är stort (≥96 px), rundat och ser "godisaktigt" ut
   (tvålagers lip + face + glans). Inga vassa hörn, inga tunna linjer.
3. **En sak per skärm.** En primär åtgärd får vara störst och grönast. Sekundära åtgärder är
   mindre och sitter i hörnen. Vuxen-åtgärder är minst och alltid grindade.
4. **Allt svarar.** Varje pekning ger ljud + rörelse < 100 ms — alltid positivt. Ingenting i
   skalet står helt stilla: den primära knappen andas, maskoten guppar.
5. **Lugn generositet.** Hellre luft än fler saker. Marginaler och mellanrum kommer från
   spacing-skalan — aldrig "det som blev över".

## 2. Layout

- Designyta **1280×720** (landskap), letterbox-skalad med "contain". Allt författas i
  designkoordinater.
- **Kantmarginal:** `SPACING.edge = 24` px till skärmkant för allt innehåll.
- **Hörnknappar** (hem/avsluta vänster, kugghjul/högtalare höger): 96–104 px, centrerade
  `edge + storlek/2` från hörnet → position `(76, 76)` resp. `(1204, 76)` för 104 px-knappar.
- **Topp-band** (y 0–140): navigering + skärmtitel. Titeln centreras på `y ≈ 70`.
- **Innehållszon** (y ≈ 160 → 720−edge): skärmens egentliga innehåll. Håll ≥ 40 px lodrätt
  avstånd mellan topp-bandet och första innehållsraden.
- Snappa positioner till 4 px-rutnät när det går.

## 3. Spacing-skala (`SPACING`)

| Token | px | Används till |
|---|---|---|
| `xs` | 8 | inre luft i chips, ikon↔text |
| `sm` | 16 | luft inuti kort/paneler |
| `md` | 24 | standard-gap mellan syskon-element; kantmarginal (`edge`) |
| `lg` | 32 | gap mellan grupper |
| `xl` | 48 | gap mellan sektioner (t.ex. topp-band → innehåll) |
| `xxl` | 64 | stora scenavstånd (titel → primärknapp) |

Minsta avstånd mellan två tryckbara ytor: **24 px** (P0).

## 4. Färgroller

Paletten ligger i `COLORS` (theme.js). Rollerna:

| Roll | Token | Not |
|---|---|---|
| App-bakgrund | `bg` (0xfdf6e3) | varm äggskal — aldrig ren vit |
| Yta/kort/panel | `cream` (0xfffdf7) | paneler, dialogkort, chips |
| Primär åtgärd | `green` | EN per skärm (Spela, Ja, Klar) |
| Varumärke/rubrik | `orange` | titlar, hem-knapp, ramar |
| Vuxet/tekniskt | `teal` | uppdatera, sortera, export |
| Fara-vuxen | `red` | avsluta, ta bort (alltid grindad + bekräftad) |
| Text | `ink` / `inkSoft` | rubriker / sekundärtext. Vit text på färgade plattor |
| Kategorifärger | `CATEGORIES`/`TAB_GROUPS` | brickor + flikar färgkodas per kategori |

**Skuggning:** aldrig filter/skuggor. Djup görs med tvålagers-tricket: en "lip" i samma färg
mörknad 18–20 % förskjuten +8 px nedåt, face 6 px kortare, plus en vit glansremsa (alpha 0.18)
upptill. `shade()`-hjälpare finns i theme.js.

**Gradienter är fyllningar, inte filter** — `FillGradient` (`lib/form.js`: `sphereFill`/
`cylinderFill`, `lib/scene.js`: himmelsgradienten) krockar inte med regeln ovan. Använd dem
för att ge runda/cylindriska SPELOBJEKT volym (klot i stället för skiva); lip-tricket äger
fortfarande allt tryckbart i skalet (knappar, kort, brickor).

## 5. Typografi

Familjer (`FONT`): **Fredoka** (display), **Baloo 2** (titlar/knappar), **Nunito** (brödtext).
Alltid `fontWeight: '700'` i skalet — barn-UI har inga tunna vikter.

| Nivå | px | Används till |
|---|---|---|
| Display | 64 | app-titeln på menyn |
| H1 | 48 | skärmtitel ("Välj ett spel") |
| H2 | 40 | dialogrubriker |
| Knapp stor | 60 | primärknappen (Spela) |
| Knapp | 32–42 | vanliga knappar (Button skalar med höjden) |
| Etikett | 26–28 | brick-titlar, fliketiketter |
| Sekundär | 20–22 | hints, "byt", underrubriker |
| Finstilt | 16 | versionsstämpel, teknisk info (endast vuxenytor) |

Text som kan spilla: `wordWrap` + krymp-skala (aldrig klippa/ellipsis).

## 6. Radier (`RADIUS`)

| Token | px | Används till |
|---|---|---|
| `chip` | 16 | små chips, badge |
| `card` | 28 | spelbrickor, kort |
| `panel` | 36 | stora paneler, dialogkort |
| knapp | `min(höjd/2, 36)` | Button räknar själv |

## 7. Rörelse (`ANIM`)

GSAP överallt. Tokens:

| Token | Värde | Används till |
|---|---|---|
| `press` | 0.08 s, `power2.out`, skala 0.92 | pekning ned |
| `release` | 0.28 s, `back.out(3)`, skala 1 | pekning upp |
| `enter` | 0.5 s, `back.out(1.7)` från skala 0 | element som dyker upp |
| `stagger` | 0.03 s/element, max 0.4 s totalt | rutnät/listor |
| `fade` | 0.16–0.22 s | overlays, skärmbyte (Nav) |
| `breathe` | 1.4–1.8 s, `sine.inOut`, yoyo | idle-liv (maskot, primärknapp, pil-hint) |

Regler: rörelse bekräftar eller bjuder in — aldrig distraherar. Max en idle-animation per
skärmzon. Döda alla tweens i `destroy` (P0).

## 8. Komponenter

- **Button** (`lib/Button.js`): godis-look, hit-halo +24 px, ljud + studs inbyggt. Varianter:
  ikon, text, ikon+text, `stacked`. Små vuxenknappar (< 96 px grafik) förlitar sig på halon
  för träffytan och måste vara grindade.
- **Flikar** (bibliotek): full bredd, `edge`-marginal, 12 px gap. Aktiv flik = full
  kategorifärg, något högre, ansluter till innehållspanelen (panelens ram har flikens färg).
  Inaktiv flik = urblekt (alpha ~0.55), något lägre. Flikbyte: tap ELLER vågrätt svep på
  innehållsytan (mjukt drag, axellåst mot lodrät skroll).
- **Innehållspanel:** cream, `RADIUS.panel`, ram 5 px i aktiv kategorifärg. Innehåll får
  `SPACING.sm`–`md` inre luft.
- **Spelbricka:** kategorifärgad, `RADIUS.card`, lip-djup, ikon 36 % av höjden + titel.
  Stjärn-badge nere till höger när klistermärke finns.
- **Profil-chip:** cream-pill med orange ram; öppnar ogrindad profilväljare.
- **Dialog** (`confirm.js`): mörk backdrop (alpha 0.5), cream-kort `RADIUS.panel`, H2-rubrik,
  två knappar (positiv färgad, neutral grå/cream).
- **Toast** (`toast.js`): lugn, kort, aldrig blockerande.
- **Versionsknapp** (meny, nere höger): liten teal-pill som visar `vM.NN` — se §9. Grindad;
  tvingar fram senaste versionen.

### 8.1 Fristående spelobjekt (P0 `ASSETS`)

Komponenterna ovan är **skalets UI**. Inne i ett spel gäller motsatsen: **spelobjekt får inte
bo i rutor.**

- Ett föremål ritas som sig självt, med **egen silhuett** — en svamp har rundade hörn, porer
  och en ljusare ovansida; en slang är en slang. Inte 🧽 i en `roundRect`.
- **Eget liv:** vilo-guppning eller andning (`breathe`), tydlig reaktion vid tryck (`pop`,
  `wiggle`), mjuk skugga för djup. Ett stilla föremål ser ut som en knapp.
- **Ingen bricka bakom** för att markera träffytan — använd `hitArea` med osynlig halo i
  stället. Träffytan ska vara stor, inte synlig.
- Kort och paneler är till för **text och UI-kontroller** (knappar, flikar, dialoger).
- Emoji får ligga som **detalj ovanpå** ett ritat föremål (glassen på glassbilen), aldrig
  utgöra hela föremålet.

## 9. Versionsnummer

- **Format:** `v` + `MAJOR.MINOR` där MINOR alltid skrivs med två siffror: `v1.00`, `v1.01`,
  `v1.13`, `v2.00`. Källa: `version` i `package.json` (semver `MAJOR.MINOR.PATCH`;
  visningen är `vMAJOR.(MINOR zero-paddat till 2)` via `appVersion()` i `src/lib/pwa.js`).
- **Bumpa vid varje release:** +1 MINOR per hopslagen ändringsomgång (feature-omgång,
  buggfix-svep). Större omgångar får gärna hoppa flera MINOR (motsvarande antal "riktiga"
  ändringar). MAJOR bumpas vid milstolpar (stor redesign, breaking i sparformatet).
- Syfte: föräldern ska med en blick på menyns versionsknapp se om "Hämta senaste" gav en
  ny version. **Glöm inte bumpa `package.json` i samma commit som ändringen.**

## 10. Checklista för ny skal-yta

- [ ] Tokens från theme.js (spacing/radius/färg/typografi/anim) — inga magiska tal
- [ ] Alla tryckytor ≥ 96 px (eller grindad vuxenknapp med halo), ≥ 24 px isär
- [ ] En primär åtgärd, ikon-först, talad svensk instruktion + högtalar-repetition
- [ ] Positiv feedback < 100 ms på allt tryckbart; en idle-animation max per zon
- [ ] Vuxenåtgärder grindade; destruktiva dessutom bekräftade
- [ ] `destroy()` städar tweens/lyssnare; text spiller aldrig (wrap + krymp)
