// En KARAKTÄR är en rigg, inte en bild (LYFTPLAN A3 / rad 9).
//
// `mascot.js` ger ett statiskt huvud och `figurer.js` en statisk kropp. Bobo står i
// 23 spel, och varenda ett som velat att han REAGERAR har handrullat sin egen lilla
// mimik — fem av dem med var sin `_setMood`/`_drawMouth`. Det är exakt det app-breda
// mönstret "ingen mottagare/publik" i `docs/games/README.md`: det är inte ett
// per-spel-problem, det är en saknad delad rigg.
//
//   const bobo = makeKaraktar({ r: 54 })
//   scen.addChild(bobo.view)
//   bobo.setMood('hungrig')
//   bobo.react('jubel')            // kort reaktion, återgår till humöret
//   bobo.look(fingretX, fingretY)  // ögonen följer det barnet drar
//   ...destroy(): bobo.destroy()
//
// Riggen är LAGER, inte en omritning: huvud · ögon · pupiller · bryn · mun · armar
// lever var för sig, så ett humörbyte är en tween på några få transformer i stället
// för `clear()` + ny geometri varje bildruta.
//
// P0-noter som sitter i koden, inte bara i den här kommentaren:
// · EXIT-SÄKERT — varje tween registreras i `_tw` och dödas i `destroy()`. En rigg
//   som lever kvar efter ett spelbyte är precis den `tween-lacka` gamelog letar efter.
// · ASSETS — allt är ritade former med egen silhuett; ingen emoji bär en karaktär.
// · Reaktionerna är ALDRIG bestraffande. `hoppsan` är en förvånad tillbakalutning med
//   runda ögon, inte en sur min — P0 MOTGÅNG säger att motgång ska vara rolig.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { COLORS } from './theme.js'
import { sphereFill } from './form.js'

// Humören. Varje post är REN DATA — inga ritanrop — så ett byte är en tween mellan
// tal, och en ny min kostar fem rader i tabellen i stället för en ny ritgren.
//
//   ogon    ögonlockets höjd (1 = vidöppet, 0.15 = nästan blundande)
//   pupill  pupillens storlek (stora pupiller läses som glädje/nyfikenhet)
//   bryn    brynens lutning i radianer (+ = arga inåt, − = ledsna utåt) och lyft
//   mun     mun-form (se `_ritaMun`)
//   lut     huvudets lutning
//   grad    hur mycket kroppen lutar framåt (hungrig lutar mot maten)
// ⚠️ BRYNENS TECKEN ÄR INTE EN SMAKFRÅGA — det avgör om figuren ler eller läxar upp.
// Brynet ritas från inre änden (mot näsan) till yttre. I Pixis y-ned-rymd lyfter en
// POSITIV rotation den INRE änden: ledset, oroligt, förvånat. En NEGATIV sänker den
// inre änden, och det är den arga brynryggen. Första utkastet hade `ledsen: −0.3`
// och `forvanad: −0.22` — i skärmdumpen stod Bobo och såg ARG ut, alltså en
// tillsägelse, precis det P0 MOTGÅNG förbjuder. Bilden hittade det; tabellen såg
// alldeles rimlig ut. Rita om du ändrar här: `node scripts/_karaktarbild.mjs`.
export const MOODS = {
  glad: { ogon: 1, pupill: 1, brynLut: 0.02, brynY: 0, mun: 'leende', lut: 0, grad: 0 },
  stolt: { ogon: 0.72, pupill: 0.9, brynLut: 0.04, brynY: -4, mun: 'leende-stort', lut: 0, grad: -0.04 },
  forvanad: { ogon: 1.25, pupill: 1.25, brynLut: 0.06, brynY: -8, mun: 'o', lut: 0.05, grad: -0.03 },
  nyfiken: { ogon: 1.1, pupill: 1.15, brynLut: 0.16, brynY: -3, mun: 'liten-o', lut: 0.13, grad: 0.02 },
  hungrig: { ogon: 1.05, pupill: 1.2, brynLut: 0.07, brynY: -1, mun: 'gap', lut: 0.03, grad: 0.07 },
  ledsen: { ogon: 0.62, pupill: 1.1, brynLut: 0.3, brynY: 2, mun: 'sur', lut: -0.05, grad: 0.05 },
  somnig: { ogon: 0.18, pupill: 0.8, brynLut: 0.04, brynY: 3, mun: 'rak', lut: 0.09, grad: 0.04 },
}

const DEFAULT_MOOD = 'glad'

export class Karaktar {
  // r = ansiktsradien, samma mått som `makeMascot(faceR)` och `makeBobo(faceR)`, så en
  // rigg kan ersätta dem rakt av. Origo = huvudets centrum (också som de två).
  constructor({ r = 50, kropp = true, palett = {}, idle = true } = {}) {
    this._alive = true
    this._r = r
    this._tw = []
    this._mood = DEFAULT_MOOD
    this._reaktion = null
    this.pal = {
      pals: palett.pals ?? COLORS.orange,
      palsMork: palett.palsMork ?? COLORS.orangeDark,
      ansikte: palett.ansikte ?? COLORS.cream,
      kind: palett.kind ?? COLORS.pink,
      drag: palett.drag ?? COLORS.ink,
    }

    this.view = new Container()
    this.view.eventMode = 'none'
    this.view.interactiveChildren = false

    if (kropp) this._byggKropp()
    this._byggHuvud()
    this.setMood(DEFAULT_MOOD, { direkt: true })
    if (idle) this.idle(true)
  }

  // --- rigg ---------------------------------------------------------------

  _byggKropp() {
    const r = this._r
    const p = this.pal
    // Proportionerna kommer ur `figurer.js:makeBoboBody`, som i sin tur kom ur
    // vippbrädans kropp. Skillnaden här: bålen och armarna är EGNA noder, för en
    // arm som ska kunna vinka måste ha en egen pivå i axeln.
    const skugga = new Graphics().ellipse(0, r * 2.36, r * 0.68, r * 0.22).fill({ color: 0x000000, alpha: 0.16 })

    this.bal = new Container()
    const b = new Graphics()
    b.ellipse(-r * 0.34, r * 2.16, r * 0.28, r * 0.18).fill(p.palsMork) // fötter
    b.ellipse(r * 0.34, r * 2.16, r * 0.28, r * 0.18).fill(p.palsMork)
    b.ellipse(0, r * 1.36, r * 0.68, r * 0.8).fill(sphereFill(p.pals))
    b.ellipse(0, r * 1.48, r * 0.42, r * 0.44).fill({ color: p.ansikte, alpha: 0.92 }) // mage
    this.bal.addChild(b)

    // Armarna: ritade FRÅN axeln och utåt, med noden placerad i axeln. Då är en
    // vinkning `rotation`, inte en omritad kurva.
    this.armar = [-1, 1].map((sida) => {
      const arm = new Container()
      arm.position.set(sida * r * 0.54, r * 1.04)
      const g = new Graphics()
      g.moveTo(0, 0).quadraticCurveTo(sida * r * 0.42, -r * 0.24, sida * r * 0.5, -r * 0.8)
      g.stroke({ width: r * 0.26, color: p.pals, cap: 'round' })
      g.circle(sida * r * 0.5, -r * 0.8, r * 0.2).fill(p.ansikte)
      arm.addChild(g)
      arm.pivot.set(0, 0)
      arm._sida = sida
      return arm
    })

    this.view.addChild(skugga, this.bal, this.armar[0], this.armar[1])
  }

  _byggHuvud() {
    const r = this._r
    const p = this.pal
    this.huvud = new Container()

    const g = new Graphics()
    const earR = r * 0.32
    g.circle(-r * 0.78, -r * 0.78, earR).fill(p.ansikte)
    g.circle(r * 0.78, -r * 0.78, earR).fill(p.ansikte)
    g.circle(0, r * 0.06, r).fill(p.palsMork) // mjuk skuggkant under ansiktet
    // Mild klotfyllning, INTE standardvärdena. `sphereFill`s default (dark 0.32) tar
    // grädden hela vägen ner i grått, och tillsammans med skuggkanten ovan blev
    // huvudet ett silverägg i stället för Bobos varma cream — uppmätt i
    // `_karaktarbild.mjs`, osynligt i koden. Volym ja, färgbyte nej.
    g.circle(0, 0, r).fill(sphereFill(p.ansikte, { dark: 0.1, highlight: 0.2, spread: 0.62 }))
    g.circle(-r * 0.56, r * 0.22, r * 0.18).fill(p.kind)
    g.circle(r * 0.56, r * 0.22, r * 0.18).fill(p.kind)
    this.huvud.addChild(g)

    // Ögonen: vitan är fast, PUPILLEN är egen så blicken kan vandra. Blinkningen
    // skalar `ogon`-behållaren i höjd — inte pupillen, annars blir blinket en
    // hopklämd pupill i en orörd vita.
    const eyeR = r * 0.15
    const dx = r * 0.36
    const ey = -r * 0.12
    this.ogon = new Container()
    this.pupiller = [-1, 1].map((s) => {
      const oga = new Container()
      oga.position.set(s * dx, ey)
      oga.addChild(new Graphics().circle(0, 0, eyeR).fill(COLORS.white))
      const pup = new Graphics()
      pup.circle(0, 0, eyeR * 0.62).fill(p.drag)
      pup.circle(eyeR * 0.22, -eyeR * 0.24, eyeR * 0.22).fill(COLORS.white) // glansprick
      oga.addChild(pup)
      this.ogon.addChild(oga)
      return pup
    })
    this._eyeR = eyeR

    // Brynen — den enskilt tydligaste minsignalen i ett litet ansikte.
    // ⚠️ SPEGLA MED ROTATIONENS TECKEN, ALDRIG MED scale.x = −1. Ett negativt
    // x-skalvärde vänder också rotationens VISUELLA riktning, så samma `rotation`
    // gav ett ledset bryn på ena sidan och ett argt på andra — asymmetriskt på ett
    // sätt som är svårt att se men läses direkt som "något är fel med ansiktet".
    // Formen är en symmetrisk rak linje och behöver ingen spegling alls.
    this.bryn = [-1, 1].map((s) => {
      const br = new Graphics()
      br.moveTo(-r * 0.16, 0).lineTo(r * 0.16, 0).stroke({ width: r * 0.075, color: p.drag, cap: 'round' })
      br.position.set(s * dx, ey - eyeR * 1.9)
      br._sida = s
      return br
    })

    this.mun = new Graphics()
    this.huvud.addChild(this.ogon, this.bryn[0], this.bryn[1], this.mun)
    this.view.addChild(this.huvud)
  }

  _ritaMun(form) {
    const r = this._r
    const m = this.mun
    if (!m || m.destroyed) return
    const w = r * 0.1
    m.clear()
    const bage = (radie, a0, a1, y) =>
      m.moveTo(Math.cos(a0) * radie, y + Math.sin(a0) * radie).arc(0, y, radie, a0, a1).stroke({ width: w, color: this.pal.drag, cap: 'round' })
    if (form === 'leende') bage(r * 0.42, 0.14 * Math.PI, 0.86 * Math.PI, r * 0.05)
    else if (form === 'leende-stort') {
      m.moveTo(-r * 0.4, r * 0.1).quadraticCurveTo(0, r * 0.62, r * 0.4, r * 0.1).closePath().fill(this.pal.drag)
      m.ellipse(0, r * 0.34, r * 0.18, r * 0.1).fill(this.pal.kind) // tunga
    } else if (form === 'o') m.circle(0, r * 0.24, r * 0.15).fill(this.pal.drag)
    else if (form === 'liten-o') m.circle(0, r * 0.22, r * 0.09).fill(this.pal.drag)
    else if (form === 'gap') {
      m.ellipse(0, r * 0.28, r * 0.26, r * 0.2).fill(this.pal.drag)
      m.ellipse(0, r * 0.36, r * 0.14, r * 0.08).fill(this.pal.kind)
    } else if (form === 'sur') bage(r * 0.4, 1.16 * Math.PI, 1.84 * Math.PI, r * 0.42)
    else m.moveTo(-r * 0.24, r * 0.24).lineTo(r * 0.24, r * 0.24).stroke({ width: w, color: this.pal.drag, cap: 'round' })
  }

  // --- humör och reaktioner ------------------------------------------------

  // Byt min. `direkt` hoppar över tweenen (bygge, eller när något ska kännas tvärt).
  setMood(namn, { direkt = false } = {}) {
    if (!this._alive) return this
    const m = MOODS[namn] || MOODS[DEFAULT_MOOD]
    this._mood = MOODS[namn] ? namn : DEFAULT_MOOD
    this._ritaMun(m.mun)
    const d = direkt ? 0 : 0.22
    this._to(this.ogon.scale, { y: m.ogon, duration: d })
    for (const pup of this.pupiller) this._to(pup.scale, { x: m.pupill, y: m.pupill, duration: d })
    // Brynens Y mäts från sitt BYGG-läge, aldrig från nuvarande. Läser man det
    // aktuella värdet mitt i en tween blir det förskjutna läget den nya basen och
    // brynen vandrar uppåt för varje humörbyte — exakt fällan som `restScale` i
    // feedback.js finns till för.
    for (const br of this.bryn) {
      if (br._basY == null) br._basY = br.y
      this._to(br, { rotation: m.brynLut * br._sida, y: br._basY + m.brynY, duration: d })
    }
    this._to(this.huvud, { rotation: m.lut, duration: d })
    if (this.bal) this._to(this.bal, { rotation: m.grad * 0.5, duration: d })
    return this
  }

  mood() {
    return this._mood
  }

  // En kort reaktion som ÅTERGÅR till humöret. Det är skillnaden mot setMood:
  // en reaktion är en händelse, ett humör är ett tillstånd.
  //   jubel   rätt svar, mål, klart
  //   heja    barnet HÅLLER PÅ och det går bra — tassarna upp, ingen hoppning
  //   hoppsan något gick fel — förvånad, ALDRIG sur (P0 MOTGÅNG)
  //   nyfiken barnet håller på med något
  //   hej     hälsning vid start
  //   nam     tuggar / tar emot något
  //
  // `heja` och `jubel` är AVSIKTLIGT olika. En knuff i gungan och ett kast i
  // bowlingen händer om och om igen — `jubel`s hopp på var och en gör firandet
  // till bakgrundsljud, och då finns ingenting kvar som markerar att målet
  // faktiskt nåddes. Publikens påhejning är liten och upprepningsbar; firandet
  // är stort och sällsynt.
  // Armgest = svinga UTÅT (`+sida`), aldrig uppåt. Det är kontraintuitivt och därför
  // värt en not: i vila står tassarna redan uppe vid huvudet (axeln på `sida·0.54r`,
  // tassen på `sida·1.04r, 0.24r`) medan huvudet når ut till `0.97r` på den höjden.
  // Marginalen är alltså 0,07·r. **Uppmätt i `_karaktarbild.mjs`:** en gest som
  // roterar armen uppåt — åt vilket håll som helst, redan vid 0,62 rad — för in
  // tassen bakom huvudsilhuetten och Bobo står med armarna BORTA. Utåt syns hela
  // armen. En "hurra"-pose i den här riggen är utsträckta armar, inte höjda.
  _svingArmar(tl, grad, { tid = 0.16, tillbaka = 0.3, start = 0, ater = 0.5 } = {}) {
    if (!this.armar) return
    for (const arm of this.armar) {
      tl.to(arm, { rotation: arm._sida * grad, duration: tid, ease: 'back.out(2)' }, start)
      tl.to(arm, { rotation: 0, duration: tillbaka, ease: 'power2.inOut' }, ater)
    }
  }

  react(handelse) {
    if (!this._alive) return this
    const r = this._r
    const tillbaka = this._mood
    this._reaktion?.kill()
    const tl = gsap.timeline({ onComplete: () => { if (this._alive) this.setMood(tillbaka) } })
    this._tw.push(tl)
    this._reaktion = tl

    if (handelse === 'jubel') {
      this.setMood('stolt', { direkt: true })
      // RELATIVA hopp (`-=`/`+=`), inte absoluta: ett spel får flytta riggen medan
      // reaktionen rullar (Bobo som går, en gunga som svänger), och en absolut
      // slutposition hade då teleporterat honom tillbaka till startpunkten.
      tl.to(this.view, { y: `-=${r * 0.5}`, duration: 0.16, ease: 'power2.out' })
        .to(this.view, { y: `+=${r * 0.5}`, duration: 0.26, ease: 'bounce.out' })
      this._svingArmar(tl, 1.15)
    } else if (handelse === 'heja') {
      this.setMood('glad', { direkt: true })
      // Halva `jubel`s utslag och ett litet lyft. Relativt (`-=`/`+=`) av samma
      // skäl som där: riggen kan flyttas av spelet medan reaktionen rullar.
      this._svingArmar(tl, 0.55, { tid: 0.14, tillbaka: 0.34, ater: 0.36 })
      // Utan kropp (bara ett huvud i ett spel som ritar sin egen figur) finns inga
      // armar att lyfta — då bär huvudets nick hela gesten i stället för ingenting.
      tl.to(this.view, { y: `-=${r * 0.16}`, duration: 0.14, ease: 'power2.out' }, 0)
        .to(this.view, { y: `+=${r * 0.16}`, duration: 0.34, ease: 'bounce.out' }, 0.14)
    } else if (handelse === 'hoppsan') {
      this.setMood('forvanad', { direkt: true })
      tl.to(this.huvud, { rotation: 0.16, duration: 0.08 })
        .to(this.huvud, { rotation: -0.12, duration: 0.08 })
        .to(this.huvud, { rotation: 0.05, duration: 0.08 })
        .to({}, { duration: 0.5 })
    } else if (handelse === 'nyfiken') {
      this.setMood('nyfiken', { direkt: true })
      tl.to({}, { duration: 0.9 })
    } else if (handelse === 'hej') {
      this.setMood('glad', { direkt: true })
      if (this.armar) {
        // Samma riktning som `_svingArmar` — vinkningen sker utanför silhuetten.
        tl.to(this.armar[1], { rotation: 1.0, duration: 0.14 })
          .to(this.armar[1], { rotation: 0.62, duration: 0.16 })
          .to(this.armar[1], { rotation: 1.0, duration: 0.16 })
          .to(this.armar[1], { rotation: 0, duration: 0.2 })
      } else tl.to({}, { duration: 0.6 })
    } else if (handelse === 'nam') {
      this.setMood('hungrig', { direkt: true })
      // Tuggandet är munnens SKALA, inte fyra omritningar — samma form, olika gap.
      tl.to(this.mun.scale, { y: 0.35, duration: 0.1 })
        .to(this.mun.scale, { y: 1, duration: 0.1 })
        .to(this.mun.scale, { y: 0.4, duration: 0.1 })
        .to(this.mun.scale, { y: 1, duration: 0.12 })
    } else {
      tl.to({}, { duration: 0.3 })
    }
    return this
  }

  // Blicken följer en punkt i FÖRÄLDERNS koordinatrymd (samma som riggens egen
  // position ligger i), så ett spel kan skicka in det barnet drar utan omräkning.
  look(x, y) {
    if (!this._alive || this.view.destroyed) return this
    const dx = x - this.view.x
    const dy = y - this.view.y
    const len = Math.hypot(dx, dy) || 1
    const max = this._eyeR * 0.34
    const k = Math.min(1, len / (this._r * 6)) * max
    const mx = (dx / len) * k
    const my = (dy / len) * k
    // Ett spel som följer ett RÖRLIGT mål anropar `look()` varje bildruta, inte bara
    // när fingret flyttar sig. Utan de två spärrarna nedan blev det 120 nya tweens i
    // sekunden på två Graphics: `_track` slängde de äldsta ur `_tw` och `destroy()`
    // saknade pupillerna i sin nodlista, så en tween skrev `.y` på en riven Graphics
    // varje bildruta efter exit — 7 konsolfel + `tween-lacka` i `gungan`.
    if (this._blick && Math.abs(this._blick.x - mx) < 0.3 && Math.abs(this._blick.y - my) < 0.3) return this
    this._blick = { x: mx, y: my }
    for (const pup of this.pupiller) this._to(pup, { x: mx, y: my, duration: 0.18, overwrite: 'auto' })
    return this
  }

  blink() {
    if (!this._alive || this.ogon.destroyed) return this
    const oppen = MOODS[this._mood].ogon
    const tl = gsap.timeline()
    tl.to(this.ogon.scale, { y: 0.08, duration: 0.06 }).to(this.ogon.scale, { y: oppen, duration: 0.09 })
    this._track(tl)
    return this
  }

  // Vilo-liv: andning + slumpade blinkningar. Utan det ser riggen ut som en
  // pappersdocka — P0 ASSETS kräver att spelobjekt har eget liv.
  idle(pa = true) {
    this._idleTl?.kill()
    this._idleBlink?.kill()
    this._idleTl = null
    this._idleBlink = null
    if (!pa || !this._alive) return this
    this._idleTl = this._track(gsap.to(this.view.scale, { y: 1.025, x: 0.988, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
    // Blinkningen schemalägger om sig själv. Bara den SENASTE referensen behöver
    // sparas — de som redan brunnit av är borta — och destroy dödar just den.
    const planera = () => {
      if (!this._alive) return
      this._idleBlink = gsap.delayedCall(1.6 + Math.random() * 3.4, () => {
        if (!this._alive) return
        this.blink()
        planera()
      })
    }
    planera()
    return this
  }

  // Spåra en tween för destroy — och RENSA de som redan spelat klart. Utan rensning
  // växer listan hela spelpasset: ett humörbyte är fem tweens och ett blink ett till,
  // så ett tio minuters pass hade lagt tusentals döda referenser på hög. Ingen krasch,
  // bara minne som aldrig lämnas tillbaka.
  // ⚠️ Mätaren MÅSTE vara `t.parent`, inte `t.isActive()`. `isActive()` är falsk för en
  // VÄNTANDE tween (fördröjd, eller ett steg som köar i en timeline) — filtret kastade
  // alltså ut precis de tweens som ÄNNU inte hunnit skriva något, och `destroy()` såg dem
  // aldrig igen. `parent` är sann för löpande OCH väntande, falsk för både färdiga och
  // dödade (läge för läge i `scripts/_tweenprobe.mjs`). Samma rättning finns redan i
  // `Ansikte._track` och `badrum.js:211`. Inget dödas här — listan komprimeras bara.
  _track(tw) {
    if (this._tw.length > 48) this._tw = this._tw.filter((t) => t?.parent)
    this._tw.push(tw)
    return tw
  }

  _to(mal, vars) {
    return this._track(gsap.to(mal, vars))
  }

  // Exit-säkerhet: ALLT som rör riggen måste dö här. En kvarlevande tween som
  // skriver .y på ett rivet Pixi-objekt kastar varje bildruta (Pixi v8 nollar
  // _position i destroy) — det var precis så bajs-och-kiss gav 112 konsolfel.
  destroy() {
    this._alive = false
    this._idleTl?.kill()
    this._idleBlink?.kill()
    for (const t of this._tw) t?.kill?.()
    this._tw.length = 0
    this._idleTl = null
    this._idleBlink = null
    this._reaktion = null
    // ⚠️ PUPILLERNA MÅSTE STÅ MED. De är de enda noderna `look()` rör, och de saknades
    // här — allt annat i riggen fångades av sin egen rad. Så länge ingen kund använde
    // `look()` syntes hålet inte alls.
    for (const nod of [this.ogon, this.mun, this.huvud, this.bal, ...(this.pupiller || []), ...(this.armar || []), ...(this.bryn || [])]) {
      if (!nod || nod.destroyed) continue
      gsap.killTweensOf(nod)
      // Blink och humörbyten tweenar `.scale`, inte noden — och `killTweensOf(nod)` når
      // inte det objektet. Samma rad finns sedan tidigare för `view.scale` nedan.
      if (nod.scale) gsap.killTweensOf(nod.scale)
    }
    if (this.view && !this.view.destroyed) {
      gsap.killTweensOf(this.view)
      gsap.killTweensOf(this.view.scale)
      this.view.destroy({ children: true })
    }
  }
}

export function makeKaraktar(opts) {
  return new Karaktar(opts)
}
