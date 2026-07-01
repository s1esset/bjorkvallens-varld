# Regnbågsmålaren Elvira (`regnbagsmalaren`)
> 🎉 roligt · drag · 2–4 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En gråmulen himmel över en grön äng. En 🦄-enhörning svävar uppe vid regnbågens topp och en
grå mall av 6 bågar väntar på färg. Jag sveper fingret över himlen → enhörningen följer
draget och målar den **aktiva färgens** båge som en tjock, glänsande rand med gnistor under
penseln. Fyllningen är *vinkelbaserad* (vänster fäste → topp → höger fäste), så ett enda svep
längs vilken båge som helst täcker hela halvcirkeln — även de innersta, smala. När en båge är
~90 % full **snäpper** den till hel med en liten gnistburst + "En till färg!", och nästa färg
tar vid. Jag kan också byta färg själv via de 6 färgburkarna nere och måla i valfri ordning.
De minsta kan **tap-tappa** istället för att svepa (ett tryck målar en rejäl klick).

När alla bågar är klara: grå himmel **ljusnar mjukt till solig äng**, solen går upp med
back-ease, blommor 🌸🌷🌼 poppar längs marken, konfetti + beröm → ny, lite rikare regnbåge
(nivå 2 = dubbel inre regnbåge; nivå 3 = finare celler + två moln att måla bort som bonus).
Inget kan bli fel: svep utanför ger bara en gnista, ingen poäng, ingen timer. Idle ~6 s →
röst-recue + enhörningen glider in och målar ~4 celler själv (garanterat framsteg).

**Funkar bra:** den nyligen fixade vinkel-fyllningen gör att alla bågar — inte bara de yttre —
kan målas helt (verifierat: den röda bågen fylls hela vägen i skärmdumpen). Snäpp-till-hel
känns tillfredsställande, grå→äng-payoffen är genuint fin, och tap-tap-fallbacken gör det
spelbart för 2-åringar. Exit-säkert (proxy-tweens, killSnapTweens).

*(Skärmdump: grå himmel, röd båge helt målad över toppen, grå mall under, 🦄 vid penseln,
6 färgburkar nere.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodkommentaren): **ren skaparglädje** för de allra minsta — svep → färg växer fram,
alltid vackert, aldrig fel. Den vinkelbaserade fyllningen valdes medvetet så att fyllningen är
radie-oberoende: ett barn som inte kan följa en exakt bana ska ändå kunna måla en hel båge.
Färgordningen röd→lila sår ett frö av färglära (och färgord via röst), och grå→solig-äng-
förvandlingen ger ett känslomässigt "jag fixade det!"-payoff som motiverar en till regnbåge.
Dubbelregnbåge + bortmålbara moln finns för att hålla högre nivåer nyfikna.

## 3. Vad gör det lättjefullt / tunt

Vacker grund, men "skaparglädje" är en överskrift spelet inte riktigt infriar:

- **Det är måla-efter-siffror, inte skapande.** Trots titeln är regnbågen helt förutbestämd:
  fast form, fast färgordning, en "aktiv" båge i taget. Barnet får byta färg men inte *välja*
  vad eller var — det fyller en mall. Den lovade fria skaparglädjen är i praktiken guidad
  ifyllnad.
- **Enhörningen är en livlös emoji.** 🦄 är bara en `Text` med en halvgenomskinlig cirkel
  bakom. Den galopperar inte, manen vajar inte, den lämnar inget magiskt spår — penselns enda
  "magi" är generiska `sparkle`-prickar. För en *enhörning som målar regnbågar* är det
  förvånansvärt inert.
- **Själva färgbandet har ingen lyster.** Det är en solid `stroke` i en platt färg. Ingen
  skimrande gradient, inget glitter längs randen, ingen våt-färg-glans — det ser ut som en
  tjock tuschpenna, inte en magisk regnbåge.
- **Grå himlen är en stillbild.** Inget regn, inga dystra moln som rör sig, ingen "trist
  väntar-på-färg"-stämning som gör payoffen större. Förvandlingen är fin men startläget bär
  ingen karaktär.
- **Liten variation mellan rundor.** Samma 6 färger, samma bågar, samma platser varje gång.
  Nivå 2/3 lägger till en inre regnbåge och moln, men kärn-rundan är identisk runda efter runda.
- **Belöningen är generisk.** `bigCelebration` + PRAISE som överallt; ingen egen regnbågs-
  vinst (t.ex. enhörningen som galopperar längs den färdiga bågen).
- **Ljudet "sjunger" inte.** `pling`/`soft`/`reveal`/`match` är trevliga men slumpartade. En
  regnbåge *ber* om en stigande skala — varje färg en ton uppåt — så den färdiga bågen blir en
  liten melodi. Det missas helt.

Kort sagt: *tekniskt elegant ifyllnad* med en payoff som lyfter, men penseln, enhörningen och
ljudet saknar den magi titeln lovar — och den fasta mallen begränsar agensen.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Magiskt penselspår.** Låt enhörningen lämna ett kort, lysande glitter-/stjärn-
  spår som tonar ut bakom draget (egen lätt partikelslinga, exit-säker), så svepet *känns*
  som att måla med magi — inte bara avslöja en mall.
- **[Deep] Lite verklig valfrihet.** Behåll den guidade regnbågen men lägg en fri "måla-vad-
  du-vill"-yta ovanpå (moln, solen, blommor som färgas där barnet sveper) så skapandet blir
  mindre låst utan att tappa no-fail-strukturen.

### Variation & överraskning
- **[Quick] Gömda överraskningar i bågarna.** När en båge snäpper hel kan en fjäril 🦋, en
  fågel eller en liten stjärna ibland flyga ut längs den — en "wow"-krydda som varierar rundan.
- **[Medium] Olika himlar/teman per runda.** Natthimmel med stjärnor, regnig himmel som
  klarnar, solnedgång — så tur 2 ser annorlunda ut än tur 1 och payoffen byter skrud.

### Juice
- **[Quick] Regnbågen sjunger.** Mappa de 6 färgerna till en stigande skala (röd = låg → lila =
  hög); varje snäppt båge spelar sin ton, och full regnbåge spelar hela ackordet/melodin.
  Störst upplevd magi för minst kod.
- **[Quick] Skimrande band.** Ge bandet en lätt gradient/glans + små gnistor som vandrar längs
  den färdiga bågen, så den ser *våt och magisk* ut istället för platt.

### Progression
- **[Quick] Behåll fler spår av tidigare regnbågar.** Låt en svag, färdig regnbåge dröja kvar
  i bakgrunden mellan rundor (en "regnbågshimmel" som byggs upp) så återkomst känns belönande.

### Karaktär & berättelse
- **[Medium] Levande enhörning.** Ge 🦄 en mjuk galopp/sväv-animation, vajande man och blink,
  och låt den vid klart **galoppera längs den färdiga regnbågen** som egen vinstanimation. Det
  är här Elviras enhörning skulle få själ.
- **[Quick] Elvira i bild.** Låt Elvira (godkänt namn) stå i ängen och jubla/peka när
  regnbågen blir klar, så spelet får en avsändare och inte bara en sväv-emoji.

### Ljud
- **[Quick] Lugn ambient + variera vinst-stinget** (regn som tystnar → fågelkvitter när solen
  går upp) för en tydligare känslomässig båge.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0; den vinkelbaserade inner-arch-fixen
  verifierad — röda bågen fylls helt). Inga kodändringar ännu. (Ersatte den äldre bygg-specen i
  samma fil med review-format enligt mallen.)
- Rekommenderad första-omgång: **[Quick] regnbågen sjunger (stigande skala) + magiskt
  penselspår + skimrande band** — billigast väg till den magi titeln lovar.
- 2026-07-01 🔧 **Första-omgången byggd (alla tre [Quick]):** (1) **Regnbågen sjunger** —
  `RAINBOW_NOTES` (C D E G A B); varje snäppt båge spelar sin ton via `audio.tone()` (ersätter
  slump-`match`), och full regnbåge spelar hela den stigande melodin i `_onComplete`. (2) **Magiskt
  penselspår** — throttlat ✨ som driver upp bakom enhörningen under svepet (`_paintAt`), plus
  skimrande gnistor som vandrar längs de färdiga bågarna i tickern. (3) **Skimrande band** — en vit
  glans-rand längs bandets utsida i `_strokeBand` → våt-magisk look. Städning: oanvända `ctx`/`e`-
  params bort ur `_setActive`/`_pointerUp`/`_buildRound`. Verifierat: svep målade röda bågen med
  glans, errorCount 0.
