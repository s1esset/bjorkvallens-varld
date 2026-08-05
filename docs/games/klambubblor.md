# Klämbubblor (`klambubblor`)
> 🎉 roligt · tap · 2–4 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

Ett rutnät av glansiga, halvgenomskinliga bubblor svävar och guppar lugnt på en vatten-/
himmelsscen. Jag trycker på en bubbla → den squashar, spricker med en vattenring + färgad
partikel-burst + "pop", och försvinner. Ungefär 1 av 8 bubblor gömmer en söt emoji (⭐🦋🍓…)
som flyter upp. En sällsynt **regnbågsbubbla** kedjepoppar sina 6 närmaste grannar i en
gnistvåg. Från nivå 2 kan en talad **färgmål**-instruktion dyka upp ("Tryck på de gröna!")
som ger extra gnistor vid rätt färg — men inget blir fel om jag trycker på en annan.

När fältet är tomt: skärmen ger en mjuk "duns"-skak, konfetti + beröm + stjärna + klistermärke,
och ett nytt, lite större/rikare fält fylls på (fler kolumner/rader, ny bakgrundsscen ur en
6-temas-cykel). Idle ~6s → instruktionen upprepas och en bubbla "andas" som ledtråd.

**Funkar bra:** juicen per pop är riktigt bra (ring + burst + squash + ljud <100ms), bubblorna
är vackra (gloss, sheen, skugga, inre ring), no-fail är intakt, progression och scen-variation
finns, regnbåge + gömda överraskningar ger wow. Exit-säkert. Detta är en *stark* MVP — själva
referensspelet som redan fått en uppgradering.

*(Skärmdump: rutnät av färgglada glansbubblor på vattenscen, mid-pop.)*

## 2. Ursprunglig plan & tankeprocess

Det allra första/enklaste spelet (orsak-verkan-tryck för 2-åringar): "tryck → något kul händer,
alltid". Tanken var att bevisa kärnkontraktet (mount/destroy, progress.complete, delad feedback)
*och* visa att även det enklaste spelet kan kännas marknadsmässigt med juice + djup. Färgmålet
från nivå 2 sår ett frö av pedagogik (färgord på svenska) utan att någonsin straffa. Regnbåge +
gömda emoji finns för att skapa "en till!"-känsla.

## 3. Vad gör det lättjefullt / tunt

Trots stark grund finns "billiga" drag som en kräsen spelare/förälder märker:

- **Bubblorna gör inget förrän jag rör dem.** De guppar men *lever* inte — de driver inte,
  krockar inte, växer inte, släpper inga små bubblor uppåt. Scenen är statisk tapet bakom ett
  rutnät. En riktig bubbel-känsla (flyt uppåt, lätt vandring, studs mot kanter) saknas.
- **Rutnäts-layouten avslöjar att det är ett rutnät.** Jämn rad/kolumn-placering (med liten
  jitter) ser "genererat" ut, inte lekfullt. Riktiga bubbelmassor klumpar och varierar i storlek.
- **Färgmålet är osynligt.** Det är *enbart talat* ("tryck på de gröna") — ett barn som inte
  lyssnar eller spelar utan ljud ser ingen ledtråd om vilket mål som gäller. Ingen visuell måltavla.
- **Tomt-fält → vänta → nytt fält.** Övergången är en konfetti + 1,3s paus. Ingen figur, ingen
  maskot som reagerar, ingen "samlat"-känsla. Belöningen är generisk (samma som alla spel).
- **Ljudpaletten är tunn.** Mest 'pop'/'pling'. Inga stigande tonhöjder vid kombo, ingen
  bubbel-specifik klang. Regnbåge-kedjan låter inte som en kaskad.
- **Inget att samla/återkomma till.** De gömda emojierna flyter upp och försvinner — de blir
  inget. Ingen "bubbelbok", inget galleri, ingen anledning att minnas.

Kort sagt: det är *snyggt och korrekt*, men bubblorna är **rekvisita, inte varelser**, och
loopen är "töm rutnät → töm större rutnät".

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Levande bubblor.** Ge varje bubbla en långsam egen drift uppåt + svaj (sin-bana),
  mjuk studs mot väggar/varandra (billig cirkel-kollision, ingen matter.js). Då blir varje pop
  ett *rörligt* mål — lite sikte, mer levande. Behåll generösa hit-halos så 2-åringar klarar det.
- **[Quick] Storleksspridning + klustring.** Placera i lekfulla kluster (poisson-ish) med större
  spridning i radie istället för jämnt rutnät. Tar bort "genererat"-känslan direkt.
- **[Deep] Sammanslagning/kombo.** Två bubblor som rör vid varandra kan smälta till en större
  (som ger en fetare pop). Belönar att vänta = en grund av strategi utan svårighet.

### Variation & överraskning
- **[Quick] Fler bubbeltyper:** dubbel-bubbla (poppar i två steg), liten yngel-svärm (en pop →
  3 mini-bubblor sprutar ut), "tung" bubbla som sjunker. Rotera per nivå.
- **[Medium] Gömda överraskningar blir minnesvärda:** den uppflytande emojin landar i en liten
  hylla/"bubbelbok" längst ner som fylls över tur — något att samla (se Karaktär).

### Juice
- **[Quick] Stigande tonhöjd vid snabba pop i rad** (kombo-pling som klättrar) + en mjuk
  bubbel-"blubb" istället för bara 'pop'. Regnbåge-kedjan = uppåtgående kaskad-ljud.
- **[Quick] Pop-efterklang:** en kvardröjande, krympande färgdimma + en eller två mikro-bubblor
  som studsar bort. Skärm-mikroskak skalar med bubbelstorlek.

### Progression
- **[Medium] Visuellt färgmål.** När ett färgmål är aktivt: visa en liten "måltavla"-bubbla i
  hörnet i målfärgen (talad + *visuell*). Rätt färg → den fylls; klart → den studsar. Gör målet
  begripligt utan ljud, fortfarande no-fail.
- **[Quick] Tema-progression känns:** låt bakgrunden byta *mjukt* (cross-fade) vid nytt fält
  istället för hård rebuild, så världen känns sammanhängande.

### Karaktär & berättelse
- **[Deep] Maskoten Bobo i scenen.** En liten figur (fisk/Bobo) som simmar bakom bubblorna,
  tittar på, och vid tomt fält simmar fram och "samlar in" de gömda fynden i bubbelboken. Ger en
  anledning att bry sig och en egen vinst-animation istället för generisk konfetti.

### Ljud
- **[Quick] Variera vinst-stinget** (redan globalt varierat — verifiera att det triggas här) och
  lägg en mjuk vatten-ambient-loop i bakgrunden för lugn.

## 5. Status / loggar

- 2026-06-30: Doc skriven (exempel-doc, sätter kvalitetsribban). Inga kodändringar ännu.
- Rekommenderad första-omgång om vi bygger: **[Quick] kluster-layout + stigande kombo-ljud +
  visuell måltavla** — störst upplevd lyft för minst risk.
- 2026-07-01 🔧 **Första-omgången byggd (alla tre [Quick]):** (1) **kluster-layout** — hex-
  förskjutna rader + större slumphopp (jitter 0.08→0.24·cell) + bredare radie-spridning
  (0.68–1.22·baseR), klampat på skärmen → rutnäts-känslan borta. (2) **Stigande kombo-ton** —
  ny publik `AudioService.tone()` (pitchad synt-blip); varje snabb pop i rad klättrar ett
  halvtonsteg (392 Hz · 2^(kombo/12), upp till oktav), ersätter den slumpade pling-variationen.
  (3) **Visuell måltavla** — mål-bubbla i målfärgen + pil uppe i mitten (nivå ≥2), studsar när
  rätt färg poppas. Testat errorCount 0, skärmdump bekräftar kluster-layouten.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).** Tog de tre kvarvarande
  punkterna ur §3 (kluster-layout, kombo-ton och visuell måltavla byggdes 2026-07-01):
  - **"Bubblorna gör inget förrän jag rör dem"** — den gamla `gsap`-y-bobben rörde dem men gav
    inget liv. Nu ticker-driven drift: varje bubbla vandrar mjukt i sidled, guppar i egen takt
    och **studsar mot kanterna**. Ingen gsap på bubblorna alls längre (enklare exit-säkerhet).
  - **"Statisk tapet"** — 26 små bubblor stiger genom scenen och lindar om längst upp.
  - **"Inget att samla/återkomma till"** — Bobo står i vattnet nere till vänster med en
    **glasburk som fylls med en pärla i bubblans färg för varje popp**. Han mumsar till vid
    varje fångst (throttlat) och hoppar av glädje när hela fältet är tomt. Förut försvann allt
    man samlade spårlöst och övergången saknade helt en figur som reagerade.
  - Bubblornas y-clamp höjdes så de aldrig lägger sig över Bobo och burken.
  - **Grind:** `npm run check --game klambubblor` 0 fel · `npm run test` grönt ·
    `_idleprobe 20s` → `idleFramsteg: 0`.
