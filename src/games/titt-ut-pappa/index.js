// TITT UT, PAPPA! — spel 2 i ansiktssektionen (`docs/games/titt-ut-pappa.md`).
//
// Spelfiguren är samma riktiga foto som i `mata-munnen`, riggat av `lib/ansikte.js`. Här är
// det INTE munnen som bär spelet utan `blick()` och minerna: pappa gömmer sig, och ögonen
// som tittar upp över kanten **tittar dit barnet senast tryckte**. Det är riggens finaste
// oanvända funktion, och hela leken hänger på den.
//
// ⚠️ ANSIKTET MASKAS ALDRIG, OCH `view` FLYTTAS ALDRIG FÖR ATT DÖLJA HONOM. Varje gömställe
//    har en `bak`- och en `fram`-del, och ansiktslagret ligger MELLAN dem: möbeln skymmer
//    honom av sig själv. En titt över kanten blir då en tween uppåt och ingenting annat.
//    (En mask hade dessutom betytt en till renderpass per bildruta för noll vinst.)
//
// ⚠️ RUMMET HAR DJUP, OCH DET FINNS EXAKT EN SKALFUNKTION. `layout.skala(djup)` sätter
//    storleken på MÖBELN, på PAPPAS HUVUD i just det gömstället och på KOMPISEN som bor
//    där. Två oberoende skalor blir inkonsekventa i bild direkt — och `layout.golvY(djup)`
//    är på samma sätt den enda källan till var något står. Djupet syns bara för att golvet
//    har tre band att stå på (golvlist · löpare · matta), se `rummet.byggRum`.
//
// ⚠️ P0 VINNER ÖVER DJUPET. En nedskalad möbel får inte ge en nedskalad träffyta:
//    `layout.varldsHit()` skalar först och KLÄMMER sedan upp till 96 px, och
//    `layout.validera()` mäter både storleken, avståndet mellan ytorna (uppmätt minsta 53 px)
//    och att ingen halo når in under skalets hem- eller högtalarknapp.
//
// ⚠️ "FEL" GÖMSTÄLLE ÄR EN BELÖNING, INTE ETT FEL (P0 MOTGÅNG). Där bor en strumpa, katten,
//    ankan, en ballong, en vällingtetra, nallen eller en boll — var sak med egen reaktion och
//    eget ljud, och den FÖLJER MED till finalen som en insamlad kompis.
//
// ⚠️ NARRATORN FÅR ALDRIG KAPAS. `voice.say()` kallar `cancel()` som första sak, och klippen är
//    2,3–4,1 s medan spelets `later()` ligger på 2–3 s. Allt tal går därför genom `_narTyst`.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { byggRum, makeGomstalle } from './rummet.js'
import { KOMPISAR, makeKompis } from './kompisar.js'
import { ANS_H, HALO, MOBLER, SLOTS, bytbaraPar, platsInfo, validera, valjUppsattning, varldsHit } from './layout.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { burst, kvittera, puff, ripple, sparkle, wiggle } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

const MAL = 5 // fem fynd av pappa = en omgång

// Platserna i DJUPLED, bakifrån och fram. Ansiktslagret skjuts in precis under den plats
// pappa sitter i, så han hamnar framför alla möbler UTOM den han gömmer sig i. Utan den
// ordningen skär fönsterskåpet genom ansiktet när han står i krukan nedanför (uppmätt:
// avslöjandet visade 6 639 px mot 28 000–33 000 för de andra, se docen).
const DJUP_ORDNING = [...SLOTS].sort((a, b) => a.djup - b.djup)

// SKVALLRET — spelets enda "svårighet", och den mäts i sekunder, aldrig i press.
const SKVALLER = {
  kikaMin: 3.2, kikaMax: 5.0,  // s mellan två tittar över kanten
  kikaHall: 0.6,               // s som ögonen står kvar uppe
  fnissMin: 5.5, fnissMax: 9.0,
  lockMin: 7.0, lockMax: 11.0, // en kompis egen lilla vinkning (runda ≥ 4)
  smitEfter: 24,               // s utan fynd innan han smiter — HÖGST en gång per runda
  bukt: 1,                     // andningsbuktens styrka (skalas ner i sena rundor)
}

// Pappas röst. Klippnamnet får finnas innan filen gör det — `harSample()` faller tillbaka
// på den stämda reserven.
const ROST = {
  forvanad: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  skratt: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  retas: { klipp: 'pappa_retas', ton: [560, 700], typ: 'triangle' },
  gasp: { klipp: 'pappa_gasp', ton: [300, 200], typ: 'sine' },
  huh: { klipp: 'pappa_huh', ton: [430, 330], typ: 'sine' },
}
const FYND_MINER = ['forvanad', 'skratt', 'retas', 'gasp']

// Rummet byter om sig mellan rundorna — och det ska HÖRAS, annars är det bara en möbel som
// hoppade. Två repliker så det inte blir tapet av den femte gången.
const BYT_REPLIKER = ['Oj, saker har bytt plats i rummet!', 'Titta, möblerna flyttade på sig!']

export default {
  id: 'titt-ut-pappa',
  titleSv: 'Titt ut, pappa!',
  icon: '🫣',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  voiceIntro: 'Var är pappa? Tryck där du tror att han gömmer sig!',

  async init(ctx) {
    this._alive = true
    // Spelmodulerna är SINGLETONS — varje räknare måste nollas här, annars ärver nästa
    // omgång förra rundans tillstånd (mätaren halvfull, pappa i ett gömställe som inte finns).
    this._busy = false
    this._idle = 0
    this._fynd = 0
    this._runda = 1
    this._andT = 0
    this._kikaT = 0
    this._fnissT = 0
    this._lockT = 0
    this._smitT = 0
    this._smitKvar = 1
    // TAK på hur mycket rummet får ändra sig i EN omgång (P0 MOTGÅNG: lagom takt). Två
    // möbelbyten på fem rundor är en överraskning barnet hinner glädjas åt; fyra hade blivit
    // ett rum som aldrig står stilla.
    this._bytKvar = 2
    this._platser = []
    this._samlade = []
    // ⚠️ VARJE SKAPAD KOMPIS BOKFÖRS HÄR, inte bara de som hunnit till hyllan. En kompis är
    //    ÄGARLÖS i drygt en sekund mellan fyndet och hyllan (och för alltid om den flög in i
    //    sin tvilling), och en `gsap.to` på en nod som `_root.destroy()` just rivit kraschar
    //    på en nollad transform utan att `_alive` någonsin ser det.
    this._kompisar = new Set()
    this._markeNoder = []
    this._sistTryck = { x: 640, y: 300 }
    this._sistPlatsKey = null
    this._pappaPlats = null
    this._pappaTill = 0
    this._kikar = false
    this._cueVaxel = 0

    // Layouten är packad mot P0 och den mätningen ska larma HÖGT om någon flyttar en plats.
    // `validera()` importerar ingenting och kostar inget att köra en gång.
    if (import.meta.env?.DEV) {
      for (const f of validera()) console.warn('titt-ut-pappa/layout:', f)
    }

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lagerordningen ÄR illusionen — se filhuvudet.
    const rum = byggRum(ctx)
    this._root.addChild(rum.bak)

    // ⚠️ ETT LAGER PER PLATS, i djupordning — inte per möbel. Möblerna byter plats mellan
    //    rundorna, och en lagerordning som följde MÖBELN hade fått en bortre bokhylla att
    //    ritas framför en närliggande kartong så fort de bytte. Platsen äger djupet; möbeln
    //    flyttar bara in i platsens lager.
    this._bakLager = new Map()
    for (const slot of DJUP_ORDNING) this._bakLager.set(slot.id, this._nyttLager())
    this._pappaL = this._nyttLager()
    this._framLager = new Map()
    for (const slot of DJUP_ORDNING) this._framLager.set(slot.id, this._nyttLager())
    this._kompisL = this._nyttLager()
    this._root.addChild(rum.fram)
    this._hyllL = this._nyttLager()
    this._klickL = new Container()
    this._root.addChild(this._klickL)

    this._byggPlatser(ctx)
    this._ritaMatare(ctx)

    // Ansiktet. Foton kan saknas i ett halvbyggt bygge — då ska spelet inte krascha, bara
    // sakna sin figur (samma medvetna val som i `mata-munnen`).
    try {
      const data = await laddaAnsikte('pappa')
      if (!this._alive) return
      this._ans = new Ansikte(data, { hojd: ANS_H })
      this._pappaL.addChild(this._ans.view)
      // Var ögonlinjen ligger i ansiktets EGNA koordinater, räknat ur manifestet i stället
      // för stämt i sonden: den skillnaden är hela kikandet.
      const k = ANS_H / data.manifest.ruta.h
      this._ogonDy = (data.manifest.geometri.ogonlinje - data.manifest.ruta.h / 2) * k
    } catch (e) {
      console.warn('titt-ut-pappa: ansiktet kunde inte laddas —', e?.message || e)
      this._ogonDy = -22
    }

    this._nyRunda(ctx, true)

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)

    // Varje pekning ska ge ljud+bild inom 100 ms (P0 ÅTERKOPPLING) — även den som landar på
    // tapeten. Träffytorna ligger i ett eget lager ovanför och bubblar hit.
    this._root.eventMode = 'static'
    this._root.hitArea = new Rectangle(-400, -300, 2080, 1320)
    this._vakna = (e) => this._tomtTryck(ctx, e)
    this._root.on('pointerdown', this._vakna)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._ans?.liv(true)
  },

  _nyttLager() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._root.addChild(c)
    return c
  },

  // ---------------------------------------------------------------- rummet ---

  /**
   * Möblerar rummet — EN uppsättning per omgång.
   *
   * Det är den här som gör att omgång 2 inte är omgång 1: elva möbler delar på sju platser,
   * så några saker byts ut varje gång och de som är kvar står någon annanstans. Själva
   * lottningen bor i `layout.valjUppsattning()` för att den ska gå att MÄTA i ren Node —
   * uppmätt över 20 000 dragningar: alla sju platser fyllda, skämtet alltid med.
   */
  _byggPlatser(ctx) {
    const val = valjUppsattning(shuffle)
    for (const slot of SLOTS) {
      const key = val[slot.id]
      if (!key) continue
      let g = null
      try {
        g = makeGomstalle(key)
      } catch (e) {
        console.warn('titt-ut-pappa: kunde inte bygga', key, e?.message || e)
        continue
      }

      // Träffytan: en osynlig, ORÖRLIG nod i sitt eget lager, ritad i VÄRLDSkoordinater.
      // Den får aldrig sitta som barn till möbeln — möbeln buktar och skakar som skvaller,
      // och en träffyta som guppar med är exakt felet som sänkte `sortera-skrap`s tunnor.
      const klick = new Graphics()
      klick.eventMode = 'static'
      klick.cursor = 'pointer'
      this._klickL.addChild(klick)

      const plats = { key, slot, g, klick, ankare: { x: 0, y: 0 }, s: 1, innehall: null, kompis: null }
      klick.on('pointertap', () => this._tryck(ctx, plats))
      this._platser.push(plats)
      this._staPlats(plats)
      g.liv?.()
    }
  },

  /**
   * Ställ en möbel på sin plats: läge, djupskala, lager OCH träffyta i ett svep.
   * Allt spelet sedan räknar på (`ankare`, `s`) läses härifrån, så ett platsbyte kan aldrig
   * lämna halva tillståndet kvar på det gamla stället.
   */
  _staPlats(plats) {
    const slot = plats.slot
    const info = platsInfo(slot)
    plats.ankare.x = info.x
    plats.ankare.y = info.y
    plats.s = info.s
    plats.g.placera(slot)
    this._bakLager.get(slot.id)?.addChild(plats.g.bak)
    this._framLager.get(slot.id)?.addChild(plats.g.fram)

    const h = varldsHit(plats.key, slot)
    const k = plats.klick
    if (k && !k.destroyed) {
      k.clear().rect(h.x, h.y, h.w, h.h).fill({ color: 0xffffff, alpha: 0 })
      k.hitArea = new Rectangle(h.x - HALO, h.y - HALO, h.w + HALO * 2, h.h + HALO * 2)
    }
  },

  _rivPlatser() {
    for (const plats of this._platser) {
      if (plats.kompis) this._rivKompis(plats.kompis)
      plats.kompis = null
      gsap.killTweensOf(plats.g.fram)
      gsap.killTweensOf(plats.g.bak)
      plats.g.destroy?.()
      if (plats.klick && !plats.klick.destroyed) {
        plats.klick.removeAllListeners()
        plats.klick.destroy()
      }
    }
    this._platser = []
    this._pappaPlats = null
  },

  /**
   * PLATSBYTET — två möbler byter plats mellan rundorna.
   *
   * Reglerna som hindrar att något hamnar på ett omöjligt ställe är inte kontroller "efteråt":
   * bytet går BARA mellan två färdigmätta platser, och `layout.passar()` kräver samma sort
   * och att träffytan ryms. Därmed kan ingenting hamna på väggen om det står på golvet, inget
   * kan hamna ovanpå något annat (platserna överlappar aldrig), inget kan hamna under skalets
   * knappar och inget kan skymma pappas ansikte — allt det följer av att platserna är
   * förhandsmätta i `layout.validera()`.
   *
   * Bytet SKER direkt (state + läge i samma bildruta) och tonas sedan in. Ett byte som
   * animerades hade flyttat en levande träffyta under fingret på ett barn — det är precis den
   * regel som säger "animera aldrig noden som bär hitArea".
   */
  _bytPlatser(ctx) {
    if (this._bytKvar <= 0) return false
    const uppsattning = {}
    for (const p of this._platser) uppsattning[p.slot.id] = p.key
    const par = bytbaraPar(uppsattning)
      .map(([sa, sb]) => [this._platser.find((p) => p.slot.id === sa.id), this._platser.find((p) => p.slot.id === sb.id)])
      .filter(([a, b]) => a && b)
    if (!par.length) return false
    this._bytKvar -= 1

    const [a, b] = randomFrom(par)
    const gamla = [{ x: a.ankare.x, y: a.ankare.y }, { x: b.ankare.x, y: b.ankare.y }]
    const slotA = a.slot
    a.slot = b.slot
    b.slot = slotA
    this._staPlats(a)
    this._staPlats(b)

    ctx.services.audio.tone({ freq: 330, dur: 0.26, type: 'triangle', vol: 0.16, slideTo: 495 })
    for (let i = 0; i < 2; i++) {
      const p = i === 0 ? a : b
      puff(ctx.fxLayer, gamla[i].x, gamla[i].y - 40, { count: 7, color: 0xffffff })
      puff(ctx.fxLayer, p.ankare.x, p.ankare.y - 40, { count: 7, color: 0xe8ded0 })
      for (const nod of [p.g.bak, p.g.fram]) {
        if (!nod || nod.destroyed) continue
        // ⚠️ BARA `alpha`. `killTweensOf(nod)` utan filter hade dödat en pågående `wiggle()`
        //    mitt i steget och lämnat möbeln snedvriden med `_fxWiggleBusy` kvar på true.
        gsap.killTweensOf(nod, 'alpha')
        nod.alpha = 0.15
        gsap.to(nod, { alpha: 1, duration: 0.34, ease: 'sine.out' })
      }
      p.g.liv?.()
    }
    return true
  },

  // Mätaren: fem små ritade pappa-huvuden som TÄNDS. Ingen siffra, ingen stapel som sjunker.
  // Panelen bär bara UI — spelobjekten står i rummet (P0 ASSETS).
  //
  // ⚠️ LÄGET ÄR RÄTTAT EFTER SKÄRMDUMPEN, inte valt. Mätaren stod först uppe till vänster
  //    — rakt på gardinstången, och de fem släckta ringarna läste som ytterligare fem
  //    GARDINRINGAR bland de riktiga. Den ligger nu på den tomma tapetytan höger om
  //    taklampan (x 778–1134), utanför både lampans halo och högtalarknappens zon.
  _ritaMatare(ctx) {
    const lager = new Container()
    lager.eventMode = 'none'
    lager.interactiveChildren = false
    this._root.addChild(lager)
    this._matareL = lager

    const x0 = 820
    const panel = new Graphics()
      .roundRect(x0 - 42, 22, 68 * (MAL - 1) + 84, 66, 26)
      .fill({ color: 0xffffff, alpha: 0.42 })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.6 })
    lager.addChild(panel)

    for (let i = 0; i < MAL; i++) {
      const n = this._markeNod()
      n.position.set(x0 + i * 68, 55)
      lager.addChild(n)
      this._markeNoder.push(n)
    }
  },

  // Ett litet ansikte: släckt = blek kontur, tänt = varm hy med ögon och ett leende.
  _markeNod() {
    const c = new Container()
    const g = new Graphics()
    g.circle(0, 0, 25).fill({ color: 0xffffff, alpha: 0.28 }).stroke({ width: 3, color: 0xffffff, alpha: 0.5 })
    c.addChild(g)
    const ans = new Graphics()
    ans.circle(0, 0, 25).fill(0xf3c9a4)
    ans.circle(-8, -4, 3.4).fill(0x3b2b22)
    ans.circle(8, -4, 3.4).fill(0x3b2b22)
    ans.moveTo(-9, 7).quadraticCurveTo(0, 15, 9, 7).stroke({ width: 3.2, color: 0x3b2b22, cap: 'round' })
    ans.alpha = 0
    c.addChild(ans)
    c._wTand = ans
    return c
  },

  _tandMarke(ctx, i) {
    const n = this._markeNoder[i]
    if (!n || n.destroyed) return
    const ans = n._wTand
    if (ans && !ans.destroyed) gsap.to(ans, { alpha: 1, duration: 0.3, ease: 'sine.out' })
    const st = { s: 1 }
    gsap.to(st, {
      s: 1.45, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out',
      onUpdate: () => { if (this._alive && !n.destroyed) n.scale.set(st.s) },
    })
    sparkle(ctx.fxLayer, n.x, n.y, { count: 8 })
  },

  // ---------------------------------------------------------------- rundan ---

  /** Möbelns kant i VÄRLDSkoordinater — den linje pappa tittar över, skalad av djupet. */
  _kantVarld(plats) {
    return plats.ankare.y + MOBLER[plats.key].kantY * plats.s
  },

  /**
   * Var gömmer han sig? Rundan styr det, inte bara slumpen:
   *   · runda 3 = SKÄMTET (den för lilla krukan), alltid — den finns alltid i rummet.
   *   · annars ~1 på 8: TAKLAMPAN (wow-läget). Ingen letar i taket första gången.
   *   · annars ett av de andra gömställena, aldrig samma som förra rundan.
   */
  _valjGomma(forra) {
    if (this._runda === 3) {
      const skamt = this._platser.find((p) => MOBLER[p.key].skamt)
      if (skamt) return skamt
    }
    const tak = this._platser.filter((p) => p.slot.sort === 'tak')
    if (tak.length && Math.random() < 0.125) return randomFrom(tak)
    const vanliga = this._platser.filter((p) => p.slot.sort !== 'tak' && !MOBLER[p.key].skamt)
    const val = vanliga.filter((p) => p !== forra)
    if (val.length) return randomFrom(val)
    return randomFrom(vanliga.length ? vanliga : this._platser)
  },

  _nyRunda(ctx, forsta = false) {
    if (!this._alive) return
    if (!this._platser.length) return
    const forra = this._pappaPlats
    const gomma = this._valjGomma(forra)

    // Överraskningarna lottas om varje runda — det är variationsaxeln (kvalitetsgrind 2).
    const pool = shuffle([...KOMPISAR])
    let pi = 0
    for (const plats of this._platser) {
      this._tomPlats(plats)
      if (plats === gomma) {
        plats.innehall = 'pappa'
        this._pappaPlats = plats
      } else if (plats.slot.sort === 'tak') {
        plats.innehall = null // taklampan står tom när pappa inte sitter i den
      } else {
        const key = pool[pi++ % pool.length]
        plats.innehall = key
        const kompis = makeKompis(key)
        if (kompis) {
          // Kompisen får PLATSENS skala — samma funktion som möbeln och pappas huvud.
          kompis.view.scale.set(plats.s)
          const M = MOBLER[plats.key]
          kompis.view.position.set(plats.ankare.x + (M.ansX || 0) * plats.s, this._kantVarld(plats) + 40 * plats.s)
          kompis.view.visible = false
          this._kompisL.addChild(kompis.view)
          this._kompisar.add(kompis)
          plats.kompis = kompis
        }
      }
    }

    this._flyttaPappa(this._pappaPlats, { direkt: true })
    this._smitKvar = 1
    this._smitT = 0
    this._kikaT = forsta ? 2.6 : 1.6
    this._fnissT = SKVALLER.fnissMin
    this._lockT = SKVALLER.lockMin
    this._busy = false
  },

  _tomPlats(plats) {
    plats.innehall = null
    if (plats.kompis) {
      this._rivKompis(plats.kompis)
      plats.kompis = null
    }
    plats.g.stang?.()
    plats.g.bukt?.(0)
  },

  /**
   * Skjut in ansiktslagret precis UNDER den plats han sitter i — alltså framför alla möbler
   * som står längre bort, bakom just den han gömmer sig i. Se `DJUP_ORDNING`.
   */
  _satZDjup(slot) {
    const mal = this._framLager.get(slot?.id) || this._framLager.get(DJUP_ORDNING[0].id)
    if (!mal || mal.destroyed || !this._root || this._root.destroyed) return
    const m = this._root.getChildIndex(mal)
    const p = this._root.getChildIndex(this._pappaL)
    if (m < 0 || p < 0 || p === m) return
    // ⚠️ `setChildIndex` PLOCKAR BORT noden först och sätter in den på indexet — alltså
    // flyttar sig målet ett steg ner när pappa kommer bakifrån. Räknar man inte med det
    // hamnar ansiktet ÖVER möbeln han gömmer sig i, tvärtemot avsikten.
    this._root.setChildIndex(this._pappaL, p < m ? m - 1 : m)
  },

  /** Riv en kompis och allt spelet självt tweenar på dess nod. */
  _rivKompis(kompis) {
    if (!kompis) return
    this._kompisar.delete(kompis)
    if (kompis.view && !kompis.view.destroyed) gsap.killTweensOf(kompis.view)
    kompis.destroy?.()
  },

  /**
   * Ställ ansiktet i ett gömställe. `direkt` = utan tween (ny runda).
   *
   * ⚠️ HUVUDET SKALAS AV PLATSENS DJUP, med samma `skala(djup)` som möbeln. Därför håller
   *    de två reglerna i `rummet.js` (`ansY >= kantY + 152` och täckning till `ansY + 134`)
   *    på VARJE djup utan ett enda extra tal: allt i uttrycken multipliceras med samma `s`.
   */
  _flyttaPappa(plats, { direkt = false } = {}) {
    const a = this._ans
    if (!a || !plats || a.view.destroyed) return
    this._satZDjup(plats.slot)
    const M = MOBLER[plats.key]
    const s = plats.s
    a.view.scale.set(s)
    const x = plats.ankare.x + (M.ansX || 0) * s
    const y = plats.ankare.y + M.ansY * s
    this._gomdY = y
    // Var ansiktet ska stå när ögonen precis tittar över kanten: ögonlinjen 26 px OVANFÖR
    // möbelns överkant (i möbelns egen skala).
    this._kikY = this._kantVarld(plats) - (26 + (this._ogonDy || 0)) * s
    // …och när han är HITTAD: hakan strax ovanför kanten, hela ansiktet fritt.
    this._uppY = this._kantVarld(plats) - ANS_H * 0.42 * s
    if (this._kikY > y) this._kikY = y // aldrig "kika" nedåt
    gsap.killTweensOf(a.view)
    if (direkt) {
      a.view.position.set(x, y)
    } else {
      a.view.x = x
      gsap.to(a.view, { y, duration: 0.35, ease: 'power2.in' })
    }
    a.blick(0, 0)
  },

  // ---------------------------------------------------------------- skvaller ---

  /**
   * Ögonen över kanten. Han åker upp precis så mycket att ögonen syns, TITTAR DIT BARNET
   * SENAST TRYCKTE, och duckar igen.
   */
  _kika(ctx) {
    const a = this._ans
    const plats = this._pappaPlats
    if (!a || !plats || this._busy || this._kikar || a.view.destroyed) return
    this._kikar = true
    const dx = Math.max(-1, Math.min(1, (this._sistTryck.x - a.view.x) / 420))
    const dy = Math.max(0, Math.min(1, (this._sistTryck.y - this._kikY) / 340))
    const tl = gsap.timeline({
      onComplete: () => { this._kikar = false },
    })
    tl.to(a.view, {
      y: this._kikY, duration: 0.3, ease: 'back.out(1.6)',
      onComplete: () => { if (this._alive) a.blick(dx, dy) },
    })
    tl.to(a.view, {
      y: this._gomdY, duration: 0.26, delay: SKVALLER.kikaHall, ease: 'power2.in',
      onStart: () => { if (this._alive) a.blick(0, 0) },
    })
    this._tl = tl
  },

  /** Fnisset: pappas eget skratt UR gömstället, plus en synlig skakning i just det möblet. */
  _fniss(ctx) {
    const plats = this._pappaPlats
    if (!plats || this._busy) return
    plats.g.skaka?.()
    this._sagPappa(ctx, 'skratt')
    // Ett litet dammoln vid kanten — skvallret ska synas i en STILLBILD också.
    puff(ctx.fxLayer, plats.ankare.x, this._kantVarld(plats), { count: 5, color: 0xffffff })
  },

  /**
   * Lockbetet (runda ≥ 4): ett ANNAT gömställe rör lite på sig. Det är inte en fälla —
   * där bor en kompis, och att hitta en kompis är en belöning. Poängen är att skvallret nu
   * måste LÄSAS: lockbetet skakar bara, det buktar aldrig i andningens takt och fnissar aldrig.
   */
  _lockbete() {
    if (this._runda < 4 || this._busy) return
    const kandidater = this._platser.filter((p) => p.innehall && p.innehall !== 'pappa')
    if (!kandidater.length) return
    const p = randomFrom(kandidater)
    wiggle(p.g.fram)
  },

  /**
   * MOTGÅNGEN: han smiter till ett annat gömställe. HÖGST EN GÅNG PER RUNDA (taket), alltid
   * förvarnat med ett prassel och en synlig skakning i BÅDA möblerna, och aldrig till det
   * gömställe barnet nyss tryckte på. Den saktar ner, den stoppar aldrig.
   */
  _smit(ctx) {
    const fran = this._pappaPlats
    if (!fran || this._busy || this._smitKvar <= 0) return
    const val = this._platser.filter((p) => p !== fran && p.slot.sort !== 'tak' && p.key !== this._sistPlatsKey)
    if (!val.length) return
    this._smitKvar = 0
    this._busy = true
    const till = randomFrom(val)

    // Förvarningen: prasslet och skakningen kommer FÖRE flytten, så orsaken är synlig.
    ctx.services.audio.sfx('soft')
    fran.g.skaka?.()
    this._sagPappa(ctx, 'huh')

    ctx.later(0.55, () => {
      if (!this._alive) return
      // Byt innehåll: kompisen som bodde i det nya gömstället flyttar till det gamla, så
      // ingen plats blir tom av att han smiter. Den får det NYA gömställets djupskala.
      const kompis = till.kompis
      const innehall = till.innehall
      till.kompis = null
      fran.innehall = innehall
      fran.kompis = kompis
      if (kompis && kompis.view && !kompis.view.destroyed) {
        kompis.view.scale.set(fran.s)
        const M = MOBLER[fran.key]
        kompis.view.position.set(fran.ankare.x + (M.ansX || 0) * fran.s, this._kantVarld(fran) + 40 * fran.s)
      }
      till.innehall = 'pappa'
      this._pappaPlats = till
      this._flyttaPappa(till, { direkt: true })
      till.g.skaka?.()
      puff(ctx.fxLayer, till.ankare.x, this._kantVarld(till), { count: 7, color: 0xffffff })
      this._busy = false
      this._kikaT = 1.1
      this._fnissT = 2.4
    })
  },

  // ---------------------------------------------------------------- tryck ---

  _tryck(ctx, plats) {
    this._idle = 0
    if (!this._alive) return
    // ⚠️ EN UPPTAGEN-FLAGGA FÅR ALDRIG SVÄLJA EN PEKNING TYST. `_busy` står under hela
    // avslöjandet, smitet och finalen — flera sekunder där barnet garanterat trycker igen —
    // och ett `return` här är exakt P0-brottet `dod-traffyta`. Handlingen får vänta;
    // ÅTERKOPPLINGEN får inte.
    const px = plats.ankare.x
    const py = this._kantVarld(plats)
    if (this._busy) {
      kvittera(ctx.fxLayer, px, py, ctx.services.audio)
      wiggle(plats.g.fram)
      return
    }
    this._sistTryck = { x: px, y: py }
    this._sistPlatsKey = plats.key
    ripple(ctx.fxLayer, px, py, { color: 0xffffff, maxR: 96 })

    if (plats.innehall === 'pappa') return this._hittaPappa(ctx, plats)
    if (plats.innehall) return this._hittaKompis(ctx, plats)
    return this._tomtGomstalle(ctx, plats)
  },

  /** Tomt gömställe: aldrig ett fel, aldrig en summer. Ett dammoln och en mjuk ton. */
  _tomtGomstalle(ctx, plats) {
    plats.g.oppna?.()
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, plats.ankare.x, this._kantVarld(plats), { count: 8, color: 0xe8ded0 })
    wiggle(plats.g.fram)
    ctx.later(0.7, () => { if (this._alive) plats.g.stang?.() })
  },

  _hittaPappa(ctx, plats) {
    const a = this._ans
    this._busy = true
    plats.g.oppna?.()
    ctx.services.audio.sfx('reveal')
    const min = randomFrom(FYND_MINER)

    if (a && !a.view.destroyed) {
      gsap.killTweensOf(a.view)
      this._kikar = false
      a.blick(0, 0)
      a.slappMin?.()
      gsap.to(a.view, {
        y: this._uppY, duration: 0.34, ease: 'back.out(1.7)',
        onComplete: () => {
          if (!this._alive) return
          a.min(min, { hall: 1.2 })
          a.ryck({ styrka: 0.8 })
        },
      })
      ctx.later(1.5, () => { if (this._alive) a.blinkning('h') })
    }
    this._sagPappa(ctx, min)
    burst(ctx.fxLayer, plats.ankare.x, this._kantVarld(plats) - 40 * plats.s, { count: 18, colors: PLAYFUL, power: 1.1 })

    this._fynd += 1
    this._tandMarke(ctx, this._fynd - 1)
    this._sag(ctx, 'Titt ut! Där var han!')

    if (this._fynd >= MAL) {
      ctx.later(1.9, () => { if (this._alive) this._final(ctx) })
      return
    }
    ctx.later(2.6, () => {
      if (!this._alive) return
      this._runda += 1
      // Alla gömställen skakar till samtidigt när han byter — så det går INTE att se vart
      // han tog vägen, och skvallret får göra sitt jobb igen.
      for (const p of this._platser) p.g.skaka?.()
      ctx.services.audio.sfx('whoosh')
      // …och ibland byter rummet självt om sig. Bytet sker i skakningen, så det läser som
      // att rummet är med i leken i stället för som att en möbel hoppade.
      const bytte = this._runda >= 2 && Math.random() < 0.6 ? this._bytPlatser(ctx) : false
      this._sag(ctx, bytte ? randomFrom(BYT_REPLIKER) : 'Hihi, nu gömde han sig igen!')
      this._nyRunda(ctx)
    })
  },

  _hittaKompis(ctx, plats) {
    const kompis = plats.kompis
    plats.innehall = null
    plats.kompis = null
    plats.g.oppna?.()
    ctx.services.audio.sfx('pop')
    if (!kompis) return

    const k = kompis.view
    const s = plats.s
    const M = MOBLER[plats.key]
    k.visible = true
    k.position.set(plats.ankare.x + (M.ansX || 0) * s, this._kantVarld(plats) + 30 * s)
    gsap.to(k, {
      y: this._kantVarld(plats) - 62 * s, duration: 0.34, ease: 'back.out(2)',
      onComplete: () => { if (this._alive && !k.destroyed) kompis.reagera?.() },
    })
    this._kompisLjud(ctx, kompis)
    sparkle(ctx.fxLayer, k.x, k.y - 30 * s, { count: 10 })

    this._sag(ctx, kompis.key === 'strumpa'
      ? 'Oj, en strumpa! Leta vidare.'
      : 'Titta vad du hittade! Leta vidare.')

    // Har den här sortens kompis redan flyttat in? Då hoppar nykomlingen bort till sin
    // tvilling och försvinner in i den i stället för att lägga sig som en till på raden.
    //
    // ⚠️ UTAN DEN HÄR GRENEN VÄXER RADEN UTAN TAK. Poolen är sju saker och en omgång är fem
    //    rundor med upp till fem fynd i varje — raden hade kunnat bli 25 kompisar tryckta på
    //    620 px. Fyndet ska ändå ALLTID belönas (P0 ÅTERKOPPLING).
    const tvilling = this._samlade.find((s2) => s2.key === kompis.key)
    ctx.later(1.15, () => {
      if (!this._alive || k.destroyed) return
      plats.g.stang?.()
      if (tvilling && tvilling.view && !tvilling.view.destroyed) {
        gsap.to(k, {
          x: tvilling.view.x, y: tvilling.view.y, duration: 0.42, ease: 'power2.in',
          onComplete: () => {
            if (!this._alive) return
            if (!tvilling.view.destroyed) {
              tvilling.reagera?.()
              sparkle(ctx.fxLayer, tvilling.view.x, tvilling.view.y - 24, { count: 8 })
            }
            this._rivKompis(kompis)
          },
        })
        return
      }
      this._samlade.push(kompis)
      this._hyllL.addChild(k)
      this._ordnaHylla()
    })
  },

  /**
   * Kompisarnas rad längst ner. Den växer och nollställs aldrig — den är kvittot.
   *
   * ⚠️ `y = 686` klippte dem mot bildkanten (skalade ~68 px höga → 652–720). Raden ligger
   *    därför på 662, ovanför mattkanten och innanför 720 även på en smal skärm.
   */
  _ordnaHylla() {
    const n = this._samlade.length
    const bredd = Math.min(96, 620 / Math.max(1, n))
    const x0 = 640 - ((n - 1) * bredd) / 2
    this._samlade.forEach((kompis, i) => {
      const k = kompis.view
      if (!k || k.destroyed) return
      gsap.to(k, { x: x0 + i * bredd, y: 662, duration: 0.5, ease: 'power2.inOut' })
      const st = { s: k.scale.x }
      gsap.to(st, {
        s: 0.62, duration: 0.5, ease: 'power2.inOut',
        onUpdate: () => { if (this._alive && !k.destroyed) k.scale.set(st.s) },
      })
      // Vilorörelsen startas EN gång per kompis. `liv()` slumpar om fasen varje anrop, så
      // att kalla den på hela raden vid varje nytt fynd hade fått alla att hoppa till i takt.
      if (!kompis._wLever) {
        kompis._wLever = true
        kompis.liv?.()
      }
    })
  },

  // ---------------------------------------------------------------- finalen ---

  /**
   * FINALEN — spelets egen, inte samma konfetti som alla andra (kvalitetsgrind 7): allt
   * barnet hittat far upp ur sina gömställen SAMTIDIGT och jublar.
   */
  _final(ctx) {
    if (!this._alive) return
    this._busy = true
    this._idle = 0
    const a = this._ans
    ctx.services.audio.sfx('celebrate')

    // ⚠️ `progress.complete()` SÄGER SJÄLV EN REPLIK — och den kapar spelets egen.
    //    Ordningen är därför complete() FÖRST, och spelets replik efter; `_narTyst` ställer
    //    sig då i kö bakom PRAISE i stället för att bli överkörd av den.
    ctx.progress.setLevel((ctx.progress.get().highestLevel || 0) + 1)
    ctx.progress.complete()
    this._sag(ctx, 'Du hittade pappa fem gånger! Vilken mästare du är.')

    for (const p of this._platser) p.g.oppna?.()
    if (a && !a.view.destroyed) {
      gsap.killTweensOf(a.view)
      a.slappMin?.()
      gsap.to(a.view, { y: this._uppY - 26, duration: 0.4, ease: 'back.out(1.8)' })
      a.min('skratt', { hall: 2.2 })
      ctx.later(1.2, () => { if (this._alive) a.blinkning('h') })
    }
    this._sagPappa(ctx, 'skratt')

    // Kompisarna hoppar upp ur raden och jublar, en aning förskjutet så det läser som en
    // publik och inte som en enda animation.
    this._samlade.forEach((kompis, i) => {
      const k = kompis.view
      if (!k || k.destroyed) return
      ctx.later(0.12 * i, () => {
        if (!this._alive || k.destroyed) return
        kompis.jubla?.()
        burst(ctx.fxLayer, k.x, k.y - 24, { count: 8, colors: PLAYFUL, power: 0.8 })
      })
    })

    ctx.later(3.4, () => {
      if (!this._alive) return
      this._sag(ctx, 'Titta så många kompisar du hittade!')
    })
    // …och så börjar en ny omgång: mätaren nollas som en NY LEK, aldrig som ett bakslag —
    // och rummet möbleras om från katalogen, så nästa omgång är ett annat rum.
    ctx.later(6.2, () => {
      if (!this._alive) return
      this._fynd = 0
      this._runda = 1
      this._bytKvar = 2
      for (const n of this._markeNoder) {
        if (n?._wTand && !n._wTand.destroyed) gsap.to(n._wTand, { alpha: 0, duration: 0.3 })
      }
      ctx.services.audio.sfx('whoosh')
      this._rivPlatser()
      this._byggPlatser(ctx)
      this._sag(ctx, 'Nu ser rummet nytt ut. Var är pappa?')
      this._nyRunda(ctx)
    })
  },

  // ---------------------------------------------------------------- ljud & röst ---

  /** Pappas eget läte. Returnerar hur länge han låter, så narratorn kan vänta in honom. */
  _sagPappa(ctx, namn) {
    const r = ROST[namn] || ROST.huh
    const audio = ctx.services.audio
    const klart = (sek) => {
      this._pappaTill = Math.max(this._pappaTill || 0, performance.now() + sek * 1000)
      return sek
    }
    if (audio.harSample?.(r.klipp) && audio.sample(r.klipp)) {
      return klart(audio.sampleDuration?.(r.klipp) || 0)
    }
    audio.tone({ freq: r.ton[0], dur: 0.3, type: r.typ, vol: 0.22, slideTo: r.ton[1] })
    return klart(0.3)
  },

  _kompisLjud(ctx, kompis) {
    const l = kompis.ljud || {}
    const audio = ctx.services.audio
    if (l.klipp && audio.harSample?.(l.klipp) && audio.sample(l.klipp)) return
    const ton = l.ton || [520, 700]
    audio.tone({ freq: ton[0], dur: 0.26, type: 'triangle', vol: 0.2, slideTo: ton[1] })
  },

  /** All narratortext går här — så inget kapar något annat. Se filhuvudet. */
  _sag(ctx, text) {
    this._narTyst(ctx, () => {
      if (this._alive) ctx.services.voice.say(text)
    })
  },

  _narTyst(ctx, fn, varv = 0) {
    if (!this._alive) return
    const kvar = Math.max(
      ((this._pappaTill || 0) - performance.now()) / 1000,
      ctx.services.voice.kvar || 0,
      ctx.services.voice.talar ? 0.25 : 0,
    )
    if (kvar > 0.06 && varv < 10) {
      ctx.later(kvar + 0.12, () => this._narTyst(ctx, fn, varv + 1))
      return
    }
    fn()
  },

  // ---------------------------------------------------------------- loopen ---

  _tomtTryck(ctx, e) {
    this._idle = 0
    if (!this._alive) return
    // Träffytorna har sin egen återkoppling och bubblar hit — dem rör vi inte.
    if (e?.target && e.target !== this._root) return
    const p = e.global ? this._root.toLocal(e.global) : null
    if (!p) return
    this._sistTryck = { x: p.x, y: p.y }
    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffffff, maxR: 58 })
    ctx.services.audio.tone({ freq: 440, dur: 0.12, type: 'sine', vol: 0.12, slideTo: 560 })
  },

  _update(ctx, dtMS) {
    if (!this._alive) return
    const dt = Math.min(0.05, dtMS / 1000)
    // ⚠️ TYSTNAD RÄKNAS BARA NÄR BARNET FAKTISKT KAN GÖRA NÅGOT. `_idle` tickade förut även
    //    under avslöjandet, smitet och finalen — flera sekunder då spelet självt håller på.
    if (!this._busy) this._idle += dt

    const plats = this._pappaPlats
    if (plats && !this._busy) {
      // BUKTEN — gömstället andas i pappas takt. Samma klocka som `liv()`s andetag (2,4 s),
      // och det är hela poängen: skvallret är inte en dekoration ovanpå figuren, det ÄR
      // figuren som syns genom möbeln.
      this._andT += dt
      const fas = (this._andT / 2.4) % 1
      const v = (0.5 - 0.5 * Math.cos(fas * Math.PI * 2)) * this._buktStyrka()
      plats.g.bukt?.(v)

      this._kikaT -= dt
      if (this._kikaT <= 0) {
        this._kika(ctx)
        this._kikaT = SKVALLER.kikaMin + Math.random() * (SKVALLER.kikaMax - SKVALLER.kikaMin)
      }
      this._fnissT -= dt
      if (this._fnissT <= 0) {
        this._fniss(ctx)
        this._fnissT = SKVALLER.fnissMin + Math.random() * (SKVALLER.fnissMax - SKVALLER.fnissMin)
      }
      this._lockT -= dt
      if (this._lockT <= 0) {
        this._lockbete()
        this._lockT = SKVALLER.lockMin + Math.random() * (SKVALLER.lockMax - SKVALLER.lockMin)
      }
      this._smitT += dt
      if (this._smitT > SKVALLER.smitEfter && this._smitKvar > 0) {
        this._smitT = 0
        this._smit(ctx)
      }
    }

    // Mjuk om-cue: aldrig en tillsägelse. Varannan gång orden, varannan gång bara ett extra
    // skvaller — en röst som säger samma sak var sjätte sekund blir tapet, en möbel som rör
    // sig gör det inte.
    if (this._idle > 6.5 && !this._busy) {
      this._idle = 0
      this._cueVaxel = (this._cueVaxel + 1) % 2
      if (this._cueVaxel === 0) this._sag(ctx, 'Titta, något rör sig där borta!')
      else this._fniss(ctx)
      this._kikaT = Math.min(this._kikaT, 0.4)
    }
  },

  /** Runda 3 (skämtet) skvallrar mindre — han SYNS ju. */
  _buktStyrka() {
    if (this._runda === 3) return 0.45
    return SKVALLER.bukt
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._root?.off('pointerdown', this._vakna)
    this._tl?.kill()
    this._tl = null
    if (this._ans && !this._ans.view.destroyed) gsap.killTweensOf(this._ans.view)
    for (const n of this._markeNoder) {
      if (n && !n.destroyed) {
        gsap.killTweensOf(n)
        if (n._wTand) gsap.killTweensOf(n._wTand)
      }
    }
    this._markeNoder = []
    for (const p of this._platser) {
      gsap.killTweensOf(p.g.fram)
      gsap.killTweensOf(p.g.bak)
      p.g.destroy?.()
    }
    this._platser = []
    this._pappaPlats = null
    this._bakLager = new Map()
    this._framLager = new Map()
    // Mängden bär ALLA skapade kompisar, även den som flyger mellan gömstället och hyllan
    // och den som är på väg in i sin tvilling — de två ägs av ingen lista.
    for (const kompis of [...this._kompisar]) this._rivKompis(kompis)
    this._kompisar = new Set()
    this._samlade = []
    this._ans?.destroy()
    this._ans = null
    this._root?.destroy({ children: true })
    this._root = null
  },
}
