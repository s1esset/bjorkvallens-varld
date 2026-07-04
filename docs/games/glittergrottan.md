# Glittergrottan (`glittergrottan`)
> 🎉 roligt · tap · 2–4 år · status: 🔧 nybyggt (2026-07-04)

> **Appens första 3D-spel** och **mallen för nya 3D-spel** (three.js via `lib/three3d.js` +
> shaders i `lib/three-shaders.js`). Byggt direkt mot mönstret i `.claude/skills/threejs-games`:
> ThreeLayer bakom Pixi, natthimmels-backdrop-shader, glitter/regnbågs-shadermaterial,
> tap→raycast via Pixi-hityta, Pixi-feedback (sparkle/burst/floatText) ovanpå 3D-objekten,
> exit-säker destroy med full GPU-städning.

## 1. Nuläge (sett som spelare)

En mörk, mysig grotta under en tindrande stjärnhimmel. Sex–tolv glittrande kristaller i
palettens färger svävar och roterar långsamt i olika djup — riktig 3D med perspektiv.
Tryck på en kristall → den studsar upp, spricker i gnistor och en stigande kombo-ton
klättrar när man poppar snabbt i rad. Från nivå 1 dyker ibland en **regnbågskristall** upp
(skimrande hue-shader) som kedjepoppar sina tre närmaste grannar med 🌈. Miss är kul:
mjukt ljud, liten gnista där man tryckte och närmaste kristall vickar lekfullt. Tomt fält →
delat firande + klistermärke, och ett nytt, lite rikare fält växer fram (upp till 12 kristaller).
Idle ~6s → rösten repeterar och en kristall pulserar som ledtråd.

**Funkar bra:** djupet/parallaxen känns genuint nytt mot resten av biblioteket; glitter-shadern
gör varje kristall levande; kombo-tonen ger samma "en till!"-sug som Klämbubblor.

## 2. Ursprunglig tanke

Bevisa hela three.js-kedjan (lager, shaders, picking, feedback, städning) i ett äkta, skeppbart
spel i stället för en teknikdemo — och ge 3D-spel samma no-fail-kärnloop som referensspelet.

## 3. Vad som är tunt

- Grottan är bara backdrop + kristaller — ingen mark/stalagmiter/dekor i letterbox-zonerna.
- Ingen karaktär (Bobo skulle kunna åka gruvvagn förbi / reagera på regnbågen).
- Kristallerna har bara två former (oktaeder/isokaeder); ingen sällsynt "jättekristall".
- Ljud: generiska pling/reveal — ett riktigt "kristall-klirr" (MOSS-SFX) vore lyft.

## 4. Förbättringsplan

- **[Quick]** Dekor-kristaller/stenar utanför designytan (syns i letterbox på plattor).
- **[Quick]** Riktigt kristallklirr-SFX via `scripts/sfx-phrases.json` (`kristall_klirr`).
- **[Medium]** Bobo-cameo: tittar fram bakom en sten, jublar vid regnbågskedjan.
- **[Medium]** Sällsynt jättekristall (1 av ~10 fält) som kräver tre tryck → tre gnistregn.
- **[Deep]** Mjuk kamera-drift (subtil parallax på idle) för mer "plats"-känsla — utan att
  bryta designToWorld-mappningen (drifta runt origo och lerpa tillbaka före pick).
