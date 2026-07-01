# Enkelt Pussel (`enkelt-pussel`)
> 🧩 pussel · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En varm cream-rampaltta till vänster (`BOARD` 500×500), en spridningsyta (tray) till höger.
Inuti ramen ligger en svagt nedtonad **förhandsvisning** av hela motivet (`alpha 0.12`) plus
ljusa spök-konturer av varje pusselbit. I trayn ligger bitarna utspridda — varje bit är en
bit av motivet, maskad till en äkta pussel-form (`tracePiece` ritar knopp/hål-bezier-kanter)
med vit kant. Jag **drar** en bit mot sin lucka (eller tap-tap); inom en generös snäpp-radie
(`max(w,h)/2 + 70`) snäpper den på plats med "match" + gnistra + `pop`, och spök-konturen
under tonar bort. Fel plats: mjuk vingel + snäpp tillbaka (DragController). Varannan rätt bit
ger en glad röst-cue ("Den passar!").

Alla bitar i → "reveal"-ljud, en glad **studs-våg** över bitarna, en stor gnistra i mitten,
beröm ("Titta, bilden är klar!") + delat firande + stjärna + klistermärke. Ny runda: **en bit
mer** (`MIN_PIECES 2 → MAX_PIECES 9`) och **nytt motiv** ur 9 teman (trädgård, katt, hus, båt,
tåg, raket, regnbåge, glass, hav), rad-baserad layout (`_rowCounts`: 5→[3,2], 9→[3,3,3]).
Nivå/runda sparas i `custom.round` så svårigheten fortsätter där man slutade.

**Funkar bra:** detta är ett *riktigt* pussel — äkta knopp/hål-bitar, maskad motivgrafik, en
förhandsvisnings-ledtråd, växande svårighet och 9 fina programritade motiv. Den magnetiska
snäpp-radien + tap-tap-fallback gör det överkomligt för 3-åringar, MAX 9 bitar håller dem
stora (≥96px). Att motivet "vaknar" med en studs-våg vid klart är en fin liten final. Solid,
genomtänkt MVP med verklig progression.

*(Skärmdump: 2-bitars trädgårdsmotiv — vänster bit på plats, höger bit dragen mot sin lucka.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: "dra 2–4 stora pusselbitar på rätt plats i ramen så att en glad bild blir hel".
Designtanken är den klassiska pussel-tillfredsställelsen (rumslig pass-ihop + helhetsbild som
avslöjas) anpassad nedåt: stora bitar, magnetiskt snäpp, förhandsvisning som ledtråd, och en
mjuk en-bit-i-taget-trappa upp till 3×3 så det aldrig blir för svårt. Maskad motivgrafik (i
stället för enfärgade bitar) valdes för att varje bit ska *betyda* något — barnet ser solen,
blomman, katten ta form. Tema-cykeln ger variation över rundor.

## 3. Vad gör det lättjefullt / tunt

- **Förhandsvisningen + spök-konturerna gör pusslet nästan löst åt barnet.** Med hela bilden
  synlig (om än blek) inuti ramen *och* en formad spök-kontur i varje lucka, reduceras
  uppgiften till "para ihop form med form" — barnet behöver inte resonera om var en bit hör
  hemma utifrån bildinnehållet. För en 3-åring rimligt; för en 5-åring tar det bort tankearbetet.
- **En-utfalls-snäpp.** Varje rätt bit gör exakt samma sak: 'match' + `sparkle` + `pop` +
  spök-tona. Ingen bit reagerar utifrån *vad* den föreställer (sol-biten lyser inte, kattens
  öra rör sig inte), och bilden i ramen gör inget förrän den allra sista biten — fram till dess
  är varje placering identisk.
- **Bitformerna är "platta" på ojämna nivåer.** `edgesFor` gör topp/botten-kanter platta så
  fort raderna är ojämna (t.ex. 5 = 3+2) — då blir det rena remsor utan interlock, vilket ser
  mindre ut som ett pussel. Bara regelbundna rutnät (2,4,6,9) får riktiga knopp/hål uppåt/nedåt.
- **Bilden "vaknar" inte på riktigt.** Finalen är en studs-våg (`pop` på varje bit i tur) +
  en gnistra. Motivet animeras inte (solen går inte upp, tåget kör inte, raketen lyfter inte) —
  trots att flera teman *bjuder* på en självklar liten animation. Belöningen är generisk konfetti.
- **Tom, statisk scen.** Ramen + tray på en enfärgad bakgrund. Ingen karaktär, ingen värld,
  ingen mottagare. Pusslet sker i ett vakuum.
- **Ljudet är tunt.** 'whoosh' när bitarna kommer, 'match' per bit, 'reveal' vid klart + TTS-
  beröm. Ingen stigande ton ju fler bitar som sitter, inget "klick" med klang, inga
  motiv-ljud (fågelkvitter när trädgården blir hel, tågvissla när tåget är klart).

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Quick] Dämpa ledtråden gradvis.** Låt förhandsvisningen tona bort efter de första
  rundorna (eller bli valbar via svårighet), och gör spök-konturerna svagare på högre nivåer —
  så att de äldre barnen faktiskt resonerar om bildinnehållet. Behåll full ledtråd för de yngsta.
- **[Medium] Rotation som mjuk option.** På de högsta nivåerna: låt bitar ligga lätt vridna i
  trayn och snäppa rätt rotation vid placering (med generös tolerans) — en extra dimension av
  agens utan fel-läge.

### Variation & överraskning
- **[Quick] Bit-reaktion vid placering.** Låt en placerad bit som innehåller ett nyckelmotiv ge
  en mikro-reaktion: sol-biten blinkar till, kattens öga glittrar, raket-biten gnistrar i
  munstycket. Bryter en-utfalls-känslan med per-bit-karaktär.
- **[Medium] Motivet börjar reagera halvvägs.** Låt redan placerade bitar visa liv innan hela
  pusslet är klart (fågeln i trädgården kvittrar när dess bit sitter), så varje placering känns
  som att man väcker bilden bit för bit.

### Juice
- **[Quick] Stigande ton + riktigt "klick".** Låt match-tonen klättra ju fler bitar som sitter,
  och lägg ett mjukt trä-/klick-ljud vid snäpp ([[real-audio-sfx]]). Skärm-mikroskak vid sista
  biten.
- **[Medium] Bilden vaknar på riktigt vid klart.** Animera varje motivs självklara liv: solen
  stiger, tåget rullar in/visslar, raketen lyfter med rök, regnbågen tonar in, fisken simmar.
  Det är spelets klimax — gör det motiv-specifikt i stället för generisk studs-våg.

### Progression
- **[Quick] Visa "min pusselbok".** Spara vilka motiv barnet klarat (`custom`) och visa dem som
  små klara miniatyrer i ett hörn/galleri — en samlar-känsla och anledning att klara fler motiv.
- **[Medium] Fler/ rikare motiv** (djur, fordon, årstider) så att 9-temas-cykeln inte upprepar
  sig lika snabbt för ett barn som spelar mycket.

### Karaktär & berättelse
- **[Deep] En pussel-kompis.** Bobo (eller motivets egen figur — katten, tåget) som sitter
  bredvid ramen, "tittar" på rätt lucka som ledtråd, hejar vid varje bit och firar med en egen
  animation vid klart. Ger scenen en själ och firandet en mottagare.

### Ljud
- **[Quick] Verifiera varierat vinst-sting** vid `complete()` och lägg en lugn ambient som
  passar aktuellt motiv (havsbrus för hav, fåglar för trädgård).

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + huvudlöst speltest (errorCount 0; 2-bitars
  trädgårdsmotiv, snäpp + förhandsvisning verifierade). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] motiv-specifik "bilden vaknar"-final + [Quick]
  gradvis dämpad ledtråd** — lyfter den generiska finalen till spelets höjdpunkt och ger de
  äldre barnen verkligt tankearbete, utan att göra det svårare för de yngsta.
- 2026-07-02: **Första-omgång genomförd.** Kärnan (9 motiv, +1 bit per runda 2→9, snäpp,
  förhandsvisning, oändlig cykel — inkl. ägarens "fler pussel + en bit till per nivå") var redan
  byggd; denna omgång lyfte finalen och ledtråden:
  - **[Medium] Motiv-specifik "bilden vaknar"-final** (`_wakePicture` + `WAKE`-map per
    `theme.id`): när pusslet är klart spelar en stor hjälte-emoji en kort scen ovanpå ramen —
    **solen stiger** (hus), **tåget rullar in och visslar** (tåg: slide + sågtands-vissla),
    **raketen lyfter med rök** (raket: rise + puff-rök), **fisken/båten simmar över** (hav/båt:
    sine-swim), **regnbågen skimrar** (shimmer + gnist-svep), **fjärilen fladdrar upp** (trädgård),
    katten/glassen studsar. Ersätter den generiska studs-vågen (som finns kvar som grund).
    Exit-säkert: proxy-tween kopieras till Text-objektet bara om det lever, destrueras i
    onComplete om det lever.
  - **[Quick] Gradvis dämpad ledtråd**: förhandsvisningen inne i ramen startar svagare för varje
    klarad runda (`0.16 − round·0.012`, golv 0.05) OCH tonar ytterligare ned inom rundan när
    bitar placeras (mot ~30 % vid sista biten) → mer verkligt tankearbete för de äldre barnen,
    utan att bli svårare för de yngsta.
  - Test: `errorCount 0`; **drag-test som la båda bitarna** → skärmdump bekräftar hel
    trädgårds-bild + konfetti-firande + fjärilen mitt i sin "vakna"-flykt.
  - **Deferred:** [Quick] "min pusselbok" (klarade motiv som miniatyrer); [Medium] fler/rikare
    motiv (djur/fordon/årstider); [Deep] pussel-kompis (Bobo som tittar/hejar); [Quick] motiv-
    anpassad ambient + stigande snäpp-ton.
</content>
