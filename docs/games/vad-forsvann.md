# Vad Försvann? (`vad-forsvann`)
> 🔍 minne · tap · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En lugn minneslek. 3–6 gulliga saker (🍎🐶⭐🚗🧸🎈…) studsar in på en rad/rutnät, var och en
på en tryckbar ruta. Barnet tittar i **egen takt** och trycker på en stor orange "🙈 Göm
dem!"-knapp (ingen press). En mjuk lila **filt** (🧺) glider in från höger över sakerna,
"whoosh"; bakom filten göms EN slumpvald sak (`_removeOne`) — dess ruta blir en blek
platshållare (cream-cirkel med svagt "❔") — och filten glider undan igen ("reveal"). Nu kommer
en rad **svarskort** nedtill: den borta saken + 2–3 "lurar" *bland de som fortfarande syns
uppe*. Eftersom lurarna fortfarande finns kvar är den borta saken det enda kortet som inte
längre syns — ett äkta minnesval, inte "tryck på den tomma rutan".

Rätt kort → saken studsar tillbaka på sin plats, **säger sitt namn** ("Ja! Det var ju
äpplet!"), gnistror + beröm + delat firande + stjärna + klistermärke. Fel kort → lekfull
vingel + 'soft' + mild ledtråd ("Nästan! Titta vad som finns kvar"). Efter 2 fel (eller idle)
→ rätt kort får en grön glödring + andnings-puls och väljs till slut automatiskt → kan aldrig
fastna. Svårighet: `LEVELS` 3→6 saker, sista nivån 2 rader; lurar 2→3 från nivå 2.

**Funkar bra:** den centrala designinsikten är riktigt bra — genom att lurorna är *kvarvarande
synliga* saker blir uppgiften ett äkta igenkännings-/minnesval, inte att peka på ett tomt hål.
Barn-styrt tempo (Göm dem-knappen) tar bort all stress. Filt-mekaniken (kik-titt-borta) är
charmig och tydlig. Namnet sägs i bestämd form ("äpplet") → ordinlärning. Auto-hjälpen
garanterar att ingen misslyckas. Omsorgsfull fas-maskin (`show → covering → answer → resolved`)
och tween-städning. En genomtänkt, komplett loop.

*(Skärmdump: täck-fasen mitt i — filten glider in från höger, banan + boll syns, en
platshållar-"❔" där en sak just gömts.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver "kuk-titt-borta"-leken: saker visas, filt glider över, EN försvinner,
barnet kommer ihåg vilken via svarskort. Den uttryckliga (nyligen fixade) finessen är att
svaret ges på *kort* med kvarvarande synliga lurar — så att det inte går att "ha rätt" genom
att bara trycka på den tomma rutan; det kräver verkligt minne. Den pedagogiska kärnan är
arbetsminne + igenkänning + ordförråd (namnet i bestämd form). Barn-styrt tempo och garanterad
auto-hjälp är medvetna no-fail-val för 3–5 år.

## 3. Vad gör det lättjefullt / tunt

- **Bara en sak försvinner, alltid.** `count`-saker visas men alltid exakt 1 göms (medvetet för
  åldern). Det håller det enkelt men gör varje runda strukturellt identisk: titta → göm → välj
  rätt kort. Ingen variation i *uppgiftstyp* (vad bytte plats? vad är NYTT? vilken blev större?).
- **Sakerna är inert rekvisita.** Emoji på rutor som studsar in och sitter stilla. Ingen sak
  har en egen idle-rörelse, ljud eller personlighet medan man memorerar — och `_onTap` på en
  ruta är *alltid* bara en `pop` + 'pop'-ljud (svaret ligger på korten). Sakerna gör aldrig
  något meningsfullt; de är minneskort, inte varelser.
- **Den försvunna saken väljs helt slumpmässigt** (`randomFrom(this._slots)`) — ingen logik som
  gör den "intressantast" att minnas, ingen narrativ krok ("nallen blev rädd och gömde sig").
- **Platshållaren spoilar lite.** En tom cream-cirkel med "❔" lyser exakt där saken fanns. Även
  om svaret ges på kort, ger den synliga luckan + dess *position* en stark ledtråd om vad som
  saknades (barnet minns "den där borta") — vilket gör minnesarbetet lättare än designen avser.
- **Auto-hjälpen är generös och syns snabbt.** Redan efter 2 fel ELLER 2 idle-cykler tänds grön
  glödring + namnet sägs + kortet väljs efter 2,8s. Skyddsnätet är rätt, men tröskeln gör att
  ett tvekande barn snabbt får facit serverat.
- **Ljudet är tunt och TTS-tungt.** 'pop'/'whoosh'/'reveal'/'pling'/'soft'/'correct' + alla
  fraser via röst. Inget mjukt tyg-frasande när filten glider, ingen "magisk försvinn"-effekt
  (pluff/glitter) när saken göms, inga sak-specifika ljud när den kommer tillbaka (hund → voff).
- **Generisk final + ingen karaktär.** Delad konfetti + stjärna; `custom.rundor` räknas men
  visas aldrig. Tom bakgrund, ingen figur som gömmer/avslöjar, ingen mottagare.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Variera uppgiftstypen.** Behåll "vad försvann" som grund men varva in systrar:
  **vad är NYTT?** (en sak läggs till), **vad bytte plats?** (två saker swappar), **vilken blev
  större?** — alla med samma kort-svarsmekanik. Bryter den strukturellt identiska rundan och
  tränar fler minnesfärdigheter.
- **[Deep] Två saker försvinner** på de högsta nivåerna (välj båda korten) — en mjuk
  utvidgning av arbetsminnet för de äldre, fortfarande no-fail.

### Variation & överraskning
- **[Quick] Liv medan man memorerar.** Låt sakerna ha en lätt egen idle (en mjuk gupp/andning,
  nallen blinkar, bilen vippar) så raden känns levande, inte som statiska kort.
- **[Quick] "Magiskt försvinnande".** När saken göms bakom filten: lägg en liten glitter-pluff
  + ett mjukt "poff" så att försvinnandet känns trolskt i stället för att rutan bara tystnar.

### Juice
- **[Quick] Riktiga ljud.** Mjukt tyg-frasande medan filten glider ([[real-audio-sfx]]), ett
  "poff"/gnist-ljud vid försvinnandet, och ett sak-specifikt ljud när den kommer tillbaka
  (hund → voff, bil → tut) ovanpå namn-TTS via `audio.sample`.
- **[Quick] Tydligare "rätt"-ögonblick.** När saken studsar tillbaka: en stråle/ring kring dess
  ruta + stigande pling, så att återkomsten känns som en liten triumf, inte bara en `bounceIn`.

### Progression
- **[Medium] Dämpa platshållar-spoilern på högre nivåer.** Låt den tomma rutan bli mer neutral
  (eller försvinna helt) på nivå 2+, så att barnet verkligen måste minnas *vad* och inte luta
  sig mot *var* luckan är. Behåll tydlig "❔" för de yngsta.
- **[Quick] Visa "rundor klarade".** Gör `custom.rundor` synligt som små samlade ikoner — en
  växande behållning mellan rundor.

### Karaktär & berättelse
- **[Deep] En figur som gömmer sakerna.** Bobo (eller en busig skata 🐦 / trollkarl) som drar
  filten, "snor" en sak med ett finurligt leende och blir glatt avslöjad när barnet gissar
  rätt. Ger filt-mekaniken en aktör och firandet en mottagare i stället för generisk konfetti.

### Ljud
- **[Quick] Verifiera varierat vinst-sting** vid `complete()` och lägg en lugn, lite mysteriös
  bakgrunds-ambient som passar "vad göms"-tonen.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + huvudlöst speltest (errorCount 0; täck-fas med
  filt + platshållare + kvarvarande lurar verifierad). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] varierad uppgiftstyp (vad är nytt / bytte plats) +
  [Quick] magiskt försvinnande & sak-specifika ljud** — angriper den strukturellt identiska
  rundan och inerta rekvisitan, de två tydligaste tunnheterna.

- 2026-07-02: **Första-omgången implementerad.**
  - **[Medium] Varierad uppgiftstyp.** Ny `this._mode` sätts i `_build`: `'gone'` (grund — en
    sak försvinner) eller `'added'` (en NY sak dyker upp). Nivå 0 är alltid `'gone'` (yngsta);
    från nivå 1 slumpas läget (`Math.random() < 0.5`). I `'added'`-läget märks sista rutan
    (`newcomerIndex = lvl.count - 1`) som `this._newcomer`: den ligger gömd i visa-fasen
    (ingen studs-in, `_emoji.visible = false`) och *dyker upp* bakom filten i `_removeOne`.
    Samma kort-svarsmekanik: `_showChoices` filtrerar `remaining = slots ≠ _missing` och drar
    lurar därifrån, så `_missing` = svarsrutan funkar för båda lägena (nykomlingen är
    svaret i `'added'`). Fas-/röst-texterna följer läget via nya `_introLine()` (mount +
    `_newRound`), `_askLine()` (svarsfasen), samt mode-grenar i `_onChoice` (fel-ledtrådar),
    `_resolveCorrect` (beröm) och `_autoHelp`. `_onTap` guardar den gömda nykomlingen så en
    tryckning på dess tomma ruta i visa-fasen ignoreras.
  - **[Quick] Magiskt försvinnande.** I `_removeOne` spelas nu ett fallande "poff" via
    `audio.tone({freq:320, slideTo:150})` medan filten täcker, och när filten glidit undan
    läggs en `sparkle(ctx.fxLayer, …)` på platsen där saken försvann/dök upp.
  - **[Quick] Sak-specifika ljud + tydligare rätt-ögonblick.** Ny `SAMPLES`-karta
    (🐶→`djur_hund`, 🐱→`djur_katt`, 🐸→`djur_groda`, 🚗→`bil_tut`); i `_resolveCorrect`
    försöker `audio.sample()` spela läten ovanpå namn-TTS (faller tyst bort om klippet saknas).
    Dessutom en stigande "rätt"-`audio.tone({freq:520, slideTo:900})` + en grön triumf-`ripple`
    (ny import) kring rutan när saken kommer tillbaka.
  - Test: `node scripts/test-game.mjs vad-forsvann --url http://localhost:5173 --taps "…"`
    (visa→göm→svara→välj-kort samt visa-fas + svars-fas separat) → **errorCount 0** i samtliga
    körningar; skärmdumpar bekräftade täck-fasen (filt utan strö-staplar) och svars-fasen (3
    stora kort, ren platshållare). Enstaka blanka rutor = övergående HMR-omladdning av
    dev-servern (bekräftat av transient `__barnspel`-undefined, ej spel-fel).
  - Deferred: [Deep] figur som gömmer sakerna (Bobo/skata) + [Deep] två saker försvinner;
    [Medium] dämpa platshållar-spoilern på högre nivåer; [Quick] "liv medan man memorerar"
    (idle-rörelse per sak); [Quick] synlig "rundor klarade"-räknare; [Quick] tyg-frasande
    filtljud + lugn bakgrunds-ambient; [Medium] "vad bytte plats?"-varianten.
</content>
