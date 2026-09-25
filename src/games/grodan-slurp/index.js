// Grodan Slurp 🐸 — en ragdoll-groda med klibbtunga i en damm (fysik, 3–5 år).
//
// Tryck någonstans → tungan skjuts dit och fastnar på det FÖRSTA den träffar. Insekt → in i
// munnen, GULP. Fast eller tung sak → grodan slungas dit och dinglar i tungan. Lätt sak →
// saken kommer farande. Tryck PÅ grodan → hopp. Åtta insekter gör magen rund som en boll.
//
// BAJSLOOPEN (målet): en full mage blir en BAJSKORV (bajs.js) — grodan krystar och korven
// ploppar ut bakom den, randig av det den ätit. Tungan hämtar korven in i munnen, och medan
// grodan bär den kan tungan svinga men inte äta. Tryck på en grodunge så kastas korven dit,
// ungen tuggar och blir rund om magen. Tre matade grodungar → finalen → complete(). Magen fylls
// igen efter varje korv (8 insekter första gången, sedan 5), och rundan tar inte slut förrän
// kören är mätt — vilka tre korvar som helst räcker.
//
// SUPERHOPPET: HÅLL fingret på grodan. Grodan tar sats (hukar, kisar, darrar, en stigande
// skala), och ju längre man håller desto högre och längre hoppar den. I luften gör den en volt
// och lägger sig platt med magen mot oss (stjärnläget, groda.js) medan den snurrar och
// flänger. Tryck i luften → tungan blir ett klibbigt rep (klibbrep.js). Grodan tumlar klart,
// ligger still en sekund, vaknar och slurpar in repet med allt som fastnat. Ett kort tryck på
// grodan är fortfarande ett vanligt hopp, så ingenting kräver att man kan hålla (P0).
//
// GRODKÖREN är mottagaren OCH en håll-knapp: bär grodan en korv (och är nära nog) kastas den
// till ungen man tryckte närmast. Annars: håll på de tre ungarna i 2,5 s så kallas grodan hem
// till startbladet (för en groda som fastnat), och ett kort tryck får kören att heja.
//
// VÄRLDEN (L4) är större än skärmen: VARLD_B bred och upp till VARLD_TOPP (lib/kamera.js).
// Kameran följer grodan. Fyra lager: himlen (står still i skärmen), fjärranbandet (parallax),
// världen (this._scen — allt spelbart, i världskoordinater) och HUD:en (skärmen): HEM-BLADET mitt
// upptill (håll 2,5 s = grodan hem, eftersom kören inte alltid syns) och PILEN mot kören när
// grodan bär en korv och kören är utanför bild (tryck = kameran visar vägen). Effekterna ligger
// i världen (`this._fx`) — `this._fx` är skärmrum och hade ritat dem på fel ställe.
//
// Allt i grodans rörelse är fysik (groda.js: aktiv ragdoll med leder och muskler), tungans drag
// fördelas efter massa (tunga.js), och dammen (dammen.js), insekterna (insekter.js) och
// motgången (hinder.js) är egna moduler. Den här filen äger rundan, inputen, rösten och målet —
// och ALLA voice.say-repliker (check.mjs läser bara index.js).
//
// Exit-säkerhet: allt fördröjt går via ctx.later, fysik-krokar kopplas via phys.beforeStep och
// dör med världen, och varje runda river och bygger om hela världen (fysik + moduler).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter, STEG2 } from '../../lib/physics.js'
import { puff, sparkle, ripple, burst, stadFx } from '../../lib/feedback.js'
import { Camera } from '../../lib/kamera.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { log } from '../../lib/gamelog.js'
import { bage, sphereFill } from '../../lib/form.js'
import { Groda, LUFT_SUPER, SUPER_LATT } from './groda.js'
import { Tunga, RACKVIDD } from './tunga.js'
import { Klibbrep } from './klibbrep.js'
import { Svarm } from './insekter.js'
import { Dammen, YT_Y, TIDER, FJARRAN } from './dammen.js'
import { Hinder } from './hinder.js'
import { Bajs } from './bajs.js'
import { BIOMER, BIOM_ORDNING } from './biomer.js'
import * as DJUR_BILDER from './djur.js'

const { Body, Query } = Matter

// Hindrens bilder för L6/L7 (djur.js) — hinder.js ritar en enkel reserv om en saknas.
const DJUR = { ...DJUR_BILDER }

// Insekter till en full mage (= en bajskorv). Första korven kommer där rundan tog slut förut.
const FORSTA_KORV = 8
// Sänkt från 5 i L5: världen gör resorna längre (sonden 109–212 s per runda), och en treåring är
// långsammare än sonden (spelkritikern L4/L5). Första korven kommer fortfarande vid 8.
const NASTA_KORV = 4
const UNGAR = 3 // matade grodungar → banan klar
// Världen (L4): två skärmar bred, och upp till en skärm ovanför dammen.
const VARLD_B = 2560
const VARLD_TOPP = -720
// Så nära kören (i x) måste grodan vara för att ett tryck ska kasta — "när man är i närheten".
const KAST_RACKVIDD = 800
// HUD: hem-bladet mitt upptill (skärmrum) och körpilen vid skärmkanten.
const HEM_HUD = { x: 640, y: 64, r: 40 }
const HEM_HUD_TRAFF = 64 // radie inkl. osynlig halo (P0: ≥ 96 px diameter + 24 px)
// Grodans kollisionskategori (L4): grenarna är ENVÄGSGRENAR — fasta för grodan bara när den är
// OVANFÖR dem (_envagsgrenar). Allt annat (kotte, repet, korven) krockar med grenarna som förut.
const GRODA_KAT = 0x0008
const ALLT = 0xffffffff
const TAPP_PAUS = 8 // s — en smäll kan knocka ut korven ur munnen högst så här ofta
// Hindren som RÖR SIG och kan träffa grodan (kotte/snöboll/bollar/apelsin heter alla 'kotte').
const HINDER_ETIKETT = new Set(['kotte', 'fisk', 'skoldpadda', 'anka', 'krabba', 'pillerbagge', 'katt', 'mas', 'papper'])
// Hållet: kortare tryck än TAP_GRANS är ett vanligt hopp. Längre = ett SATS-HOPP som växer med
// hållet (samma bana som pilen, landar på benen). Full sats efter LADD_FULL s = MAXFARTEN: grodan
// glittrar, pilen blir tjock och lysande röd, och släppet blir superhoppet (volt, stjärna, ragdoll).
// Ägaren 2026-09-25: man får hålla hur länge som helst — grodan hoppar ALDRIG av sig själv, så
// barnet kan sikta i lugn och ro (förut hoppade den efter 1,2 s full sats, 3 s med sikte).
const TAP_GRANS = 0.3
const LADD_FULL = 1.55
const MAX_ROD = 0xff2d2d // maxfartens pil: lysande röd
const MAX_GLOD = 0xff8a7a
// SIKTET (ägaren 2026-09-24): medan fingret håller på grodan visar en halvgenomskinlig pil var
// hoppet landar, och fingret som drar bort från grodan väljer riktningen (dit fingret är, dit
// grodan hoppar). Inom SIKT_DOD px från tyngdpunkten gäller grodans egen riktning. Hoppet går
// alltid minst SIKT_MIN över vågrätt — ett hopp rakt in i bladet är inget hopp.
const SIKT_DOD = 60
const SIKT_MIN = 0.52 // rad (30°) — vid 20° skrapade benen i grannbladet efter 6 steg (_siktprobe)
const SIKT_STEG = 220 // så många fysiksteg framåt räknas banan (3,7 s)
// Så långt under tyngdpunkten hänger benen i luften — det är de som landar. Uppmätt
// (_siktprobe, sex hopp): 33–56 px som minst, 64–106 i median, upp till 150 i voltens början.
// Med 58 flög pilen över en stock som benen slog i (ett flackt hopp: 500 px för lång).
const SIKT_FOT = 90
const SIKT_BRED = 40 // grodans halva bredd i luften (sten och stam provas så här långt ut)
const LATT_STEG = 8 // fysiksteg som underlaget släpper igenom grodan efter ett superhopp
const SIKT_LUCKA = 24 // px mellan pilens prickar
// VÄNDKNAPPEN nere till höger (ägaren 2026-09-24): grodan vänder sig utan att tungan åker ut —
// ett tryck bredvid grodan vände den också, men sköt samtidigt tungan dit.
const VAND_R = 32 // bildens radie — en LITEN knapp
const VAND_TRAFF = 60 // träffradie: ≥ 96 px diameter + 24 px osynlig halo (P0)
const VAND_KANT = 74 // knappens mitt så här långt in från bildens hörn
const HEM_TID = 2.5 // s att hålla på grodkören — samma som P0-grinden för en nollställning
const LEMMAR = ['fotN', 'fotB', 'underarmN', 'underarmB', 'vadN', 'vadB']
const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const valj = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Durskala (C-dur) för grodans egna små kvack och finishens melodi.
const SKALA = [262, 294, 330, 349, 392, 440, 494, 523]

export default {
  id: 'grodan-slurp',
  titleSv: 'Grodan Slurp',
  icon: '🐸',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'grodan-slurp',
  voiceIntro: 'Tryck där tungan ska fastna! Fånga flugorna!',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._runda = 0
    this._senasteTid = null
    this._idle = 0
    this._cueIdx = 0
    this._hoppsanT = -99
    this._t = 0
    this._firar = false
    this._superAntal = 0
    this._laddAntal = 0
    this._hoppAntal = 0
    this._tipsat = false

    this._root = new Container()
    ctx.stage.addChild(this._root)
    // Kameran (L4). Lagren skapas EN gång; varje runda river och bygger om deras innehåll.
    this._kam = new Camera({ worldW: VARLD_B, worldH: 720 - VARLD_TOPP, worldY0: VARLD_TOPP })
    this._root.addChild(this._kam.root)
    this._L = {}
    this._L.himmel = this._kam.parallax(0, { dekor: true })
    this._L.fjarran = this._kam.parallax(FJARRAN, { dekor: true })
    this._scen = this._kam.parallax(1, { dekor: true })
    for (const n of ['bakom', 'grodaBak', 'grodaMitt', 'grodaFram', 'tunga', 'vatten', 'insekter', 'fram', 'effekt']) {
      const c = new Container()
      c.eventMode = 'none'
      c.interactiveChildren = false
      this._L[n] = c
      this._scen.addChild(c)
    }
    this._fx = this._L.effekt // världsankrade effekter (this._fx är skärmrum)
    this._hud = this._kam.parallax(0, { dekor: true, skak: false })
    this._vyNu = { left: 0, right: 1280, top: 0, bottom: 720 }
    this._vyFn = () => this._vyNu
    this._byggHud()

    // Hela bilden (inkl. bleed) tar emot tryck.
    this._root.eventMode = 'static'
    this._root.hitArea = new Rectangle(-BLEED_X, -BLEED_Y, 1280 + BLEED_X * 2, 720 + BLEED_Y * 2)
    this._onDown = (e) => this._tryck(ctx, e)
    this._root.on('pointerdown', this._onDown)
    // Släppet (sats-hoppet, håll-knappen) sitter på SAMMA rot som trycket — ett släpp når
    // aldrig ett syskon. `pointerupoutside`: fingret gled av bilden innan det lyftes.
    this._onUp = (e) => this._upp(ctx, e)
    for (const ev of ['pointerup', 'pointerupoutside', 'pointercancel']) this._root.on(ev, this._onUp)
    // Fingret som drar medan grodan tar sats siktar superhoppet. `globalpointermove` — ett drag
    // som lämnar rotens träffyta (bleeden) ska fortfarande sikta.
    this._onMove = (e) => this._flytta(e)
    this._root.on('globalpointermove', this._onMove)

    this._byggVarld(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    this._sagBiom(ctx)
  },

  // En kort replik om världen (L5) — efter instruktionen, aldrig över den.
  _sagBiom(ctx) {
    const b = this._biomNamn
    const voice = ctx.services.voice
    ctx.narTyst(() => {
      if (!this._alive || this._biomNamn !== b) return
      if (b === 'is') voice.say('Isen är hal!')
      else if (b === 'fors') voice.say('Strömmen tar med sig allt!')
      else if (b === 'skog') voice.say('Grodan är i skogen!')
      else if (b === 'trask') voice.say('Träsket är tjockt och bubbligt!')
      else if (b === 'oken') voice.say('Oj, vad varm sanden är!')
      else if (b === 'strand') voice.say('Vågorna gungar på stranden!')
      else if (b === 'kok') voice.say('Grodan är i köket!')
      else if (b === 'vardagsrum') voice.say('Grodan är i vardagsrummet!')
      else if (b === 'badrum') voice.say('Grodan är i badrummet!')
    })
  },

  // ── Världen (byggs om varje runda) ─────────────────────────────────────────────────────

  // Vilken biom rundan får (L5). Första rundan när spelet öppnas: nästa i ordningen (damm → is
  // → fors → skog → …), sparad i progress — så ser barnet en ny värld varje gång, och ägaren kan
  // prova alla genom att gå ut och in. Inom en session: slump bland de andra.
  _valjBiom(ctx) {
    if (this._runda === 1) {
      const n = BIOM_ORDNING.length
      let i = 0
      try {
        i = Number(ctx.progress.get()?.custom?.biomNasta) || 0
      } catch {
        i = 0
      }
      const b = BIOM_ORDNING[((i % n) + n) % n]
      try {
        ctx.progress.setCustom('biomNasta', (((i + 1) % n) + n) % n)
      } catch {
        /* progress saknas i en sond — ingen fara */
      }
      return b
    }
    return valj(BIOM_ORDNING.filter((b) => b !== this._biomNamn))
  },

  // Tid på dygnet (morgon · dag · kväll · natt): slumpad varje runda, aldrig samma två gånger i
  // rad — även när spelet öppnas (den förra tiden sparas i progress, som biomen). Förut var första
  // rundan alltid eftermiddag.
  _valjTid(ctx) {
    let forra = this._senasteTid
    if (forra == null) {
      try {
        forra = ctx.progress.get()?.custom?.tidSenast ?? null
      } catch {
        forra = null
      }
    }
    const tid = valj(TIDER.filter((t) => t !== forra))
    this._senasteTid = tid
    try {
      ctx.progress.setCustom('tidSenast', tid)
    } catch {
      /* progress saknas i en sond — ingen fara */
    }
    return tid
  },

  _byggVarld(ctx) {
    this._runda++
    this._biomNamn = this._tvingaBiom && BIOMER[this._tvingaBiom] ? this._tvingaBiom : this._valjBiom(ctx)
    this._biom = BIOMER[this._biomNamn]
    const tid = this._valjTid(ctx)
    this._atna = 0
    this._iMagen = [] // insektstyper sedan förra korven (korvens leder, i ordning)
    this._korvar = 0 // bajsade den här rundan
    this._matade = 0
    this._bajsDags = false
    this._bajsVantat = 0
    this._kryst = null
    this._bar = null // korven grodan bär i munnen
    this._barTipsat = false // "tryck på en grodunge" sägs en gång per runda
    this._bortaTipsat = false // "grodkören väntar där borta" likaså
    this._visar = false // kameran visar kören just nu (körpilen)
    this._tappT = -99
    this._mmfT = -99
    this._senastBajsT = this._t
    this._bommar = 0
    this._firar = false
    this._humla = null
    this._humlaKom = false
    this._guldKom = false
    this._guldRunda = this._runda > 1 && Math.random() < 0.35
    this._ankaKom = false
    this._hinderKlocka = 0
    this._nastaHinder = rnd(9, 13)
    this._senasteHinder = null
    this._skotselKlocka = 0
    this._vattenTid = 0
    this._simKlocka = 0
    this._kvackKlocka = rnd(10, 16)
    this._fallY = null
    this._varPaMark = true
    this._ringar = []
    this._magplask = false
    this._undvikit = new WeakSet()
    this._knuff = new WeakMap() // insekt → när en lem senast knuffade den
    this._senastAt = this._t
    this._smallT = -9
    this._smallStyrka = 0
    this._super = null // { fas: 'luft'|'mark'|'vaknar', t0, landT, vakT, uppe, p }
    this._rep = null
    this._ladd = null // { id, t, not, full, trill }
    this._hem = null // { id, t, steg } — håll på grodkören

    // Väggarna står vid VÄRLDENS kanter (inte skärmens), och taket saknas med flit: ett superhopp
    // från den högsta grenen får gå över världens topp — kameran klämmer, grodan faller tillbaka.
    const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: VARLD_TOPP, right: VARLD_B, bottom: 720 } })
    phys.engine.positionIterations = 8
    phys.engine.velocityIterations = 6
    phys.engine.constraintIterations = 5
    this._phys = phys

    const L = this._L
    this._dammen = new Dammen({
      phys,
      lager: { himmel: L.himmel, fjarran: L.fjarran, bakom: L.bakom, vatten: L.vatten, fram: L.fram },
      audio: ctx.services.audio,
      tid,
      varld: { w: VARLD_B, topp: VARLD_TOPP },
      vy: this._vyFn,
      biom: this._biomNamn,
    })
    // Vassen är BARA ett mål för tungan: den krockar med ingenting (en sensor ger ändå
    // collisionStart — grodan "tumlade" mot vass hon simmade förbi). Query.point bryr sig
    // inte om filtret, så tungan kan fortfarande fastna i den.
    // Stubbens stam (L4) likadant: grodan simmar framför den — som vägg delade den dammen i två.
    for (const f of this._dammen.foremal) {
      if (f.typ === 'vass' || f.typ === 'stubbe') f.body.collisionFilter = { group: 0, category: 0x0004, mask: 0 }
    }
    const sp = this._dammen.startPunkt
    this._groda = new Groda(phys, { bak: L.grodaBak, mitt: L.grodaMitt, fram: L.grodaFram }, { x: sp.x, y: sp.y, riktning: sp.x < VARLD_B / 2 ? 1 : -1 })
    // Kameran börjar längst ned (dammen i bild, som förut) och följer en punkt vid grodan som
    // LYFTS uppåt när grodan är uppe i ett träd (_kamMalUppdatera) — annars låg nästa gren
    // ovanför bildens överkant och gick inte att trycka på (_klatterprobe: 0 av 4 nådde
    // mellangrenen, trots att den var inom tungans räckhåll).
    this._kamMal = { x: sp.x, y: sp.y }
    this._kam.moveTo(sp.x, 360)
    this._kam.follow(this._kamMal, { lead: 90, deadzone: 140 })
    this._vyUppdatera()
    this._groda.ytY = YT_Y
    for (const b of this._groda.delar) b.collisionFilter.category = GRODA_KAT
    // Grenarna (träden + stubbens stumpar) och näckrosbladen — ENVÄGS för grodan, se _envagsgrenar.
    // Varje kropps halva tjocklek (i sin egen lutande ram) läses ur dess hörn: gren 13, stump 11,
    // blad 7 — "ovanpå" betyder olika mycket.
    this._grenar = this._dammen.foremal.filter((f) => f.body.label === 'gren' || f.body.label === 'blad' || f.body.label === 'svamp').map((f) => {
      const b = f.body
      const a = -b.angle
      let halv = 0
      for (const v of b.vertices) halv = Math.max(halv, Math.abs(Math.sin(a) * (v.x - b.position.x) + Math.cos(a) * (v.y - b.position.y)))
      b.plugin = b.plugin || {}
      b.plugin.envagHalv = halv
      return b
    })
    this._startBladFast()
    // Grodan flyter (lite) — huvudet och ryggen över ytan, benen under. Grodan äger sin plats i
    // volymen själv (den kliver ur den under superhoppets luftfas, se groda.js flytIn).
    this._groda.flytIn(this._dammen.flytvolym, (namn) => (namn === 'huvud' ? 2.4 : namn === 'kropp' ? 1.9 : 1.3))

    // Korvarna krockar aldrig med grodan (samma negativa grupp) — tungan hämtar dem.
    this._bajs = new Bajs({ phys, lager: { bakom: L.bakom, bar: L.tunga, luft: L.effekt }, flytvolym: this._dammen.flytvolym, grupp: this._groda._grupp, vw: VARLD_B })

    this._svarm = new Svarm({ lager: L.insekter, ytY: this._dammen.golvY, view: ctx.view, granser: { x0: 40, x1: VARLD_B - 40, y0: VARLD_TOPP + 60 }, vy: this._vyFn })
    if ((tid === 'skymning' || tid === 'natt') && !this._biom.inne) this._svarm.skymning = true // eldflugor bara utomhus

    this._hinder = new Hinder({
      phys,
      lager: { bakom: L.bakom, fram: L.fram },
      dammen: this._dammen,
      ytY: YT_Y,
      vy: this._vyFn,
      djur: DJUR,
      grodPos: () => this._groda?.pos,
      pa: {
        borta: (body) => {
          if (this._tunga?.body === body) this._tunga.slapp()
          this._rep?.lossa(body)
        },
        bubbla: (x, y, r) => this._bubbla(ctx, x, y, r),
      },
    })

    this._tunga = new Tunga({
      groda: this._groda,
      lager: L.tunga,
      ytY: YT_Y,
      hitta: {
        kropp: (ax, ay, bx, by, undanta) => this._hittaKropp(ax, ay, bx, by, undanta),
        inuti: (x, y, tx, ty) => this._inuti(x, y, tx, ty),
        // Smal fångstkorridor: sikthjälpen (tryck NÄRA en insekt) belönar avsikt, men en tunga
        // som sveper förbi i blindo ska inte plocka upp allt i sin väg. Med +30 åt slumptryck
        // i himlen lika många insekter som riktade tryck (_grodspelprobe --kontroll).
        // En fri bajskorv hämtas på samma sätt (tunga.js 'bar') — närmast munnen vinner. Med
        // en korv i munnen fångar tungan ingenting: den kan bara fastna och svinga.
        insekt: (ax, ay, bx, by) => {
          if (this._bar) return null
          const ins = this._svarm.traffSegment(ax, ay, bx, by, 12)
          const k = this._bajs.traffSegment(ax, ay, bx, by, 6)
          if (!k || !ins) return k || ins
          return Math.hypot(k.x - ax, k.y - ay) <= Math.hypot(ins.x - ax, ins.y - ay) ? k : ins
        },
      },
      pa: {
        traffKropp: (body, x, y) => this._traffKropp(ctx, body, x, y),
        traffInsekt: (ins) => this._traffInsekt(ctx, ins),
        at: (ins) => this._at(ctx, ins),
        bom: (x, y) => this._bom(ctx, x, y),
        vatten: (x, y) => this._tungVatten(ctx, x, y),
        slappt: () => {},
      },
    })

    // En gång per fast fysiksteg: grodans muskler, tungans fjäder, hindrens rörelser, humlan.
    phys.beforeStep(() => {
      this._envagsgrenar()
      this._lattaSteg()
      this._groda.steg()
      this._tunga.steg()
      this._rep?.steg()
      this._hinder.steg()
      this._humlaSteg()
      this._bajs.steg(this._groda.pos.x)
    })
    // Byter grodan vy mitt i ett superhopp sitter munnen på ett annat ställe på huvudet.
    this._groda.vidVyByte = () => this._rep?.nyMun()
    // Smällar: grodan tumlar. Materialen låter. Repets länkar nuddar hela tiden — de räknas inte.
    const ejRep = (a, b) => !a.plugin?.repLank && !b.plugin?.repLank
    phys.impactAudio(ctx.services.audio, { minSpeed: 3, vol: 0.2, hardSpeed: 16, filter: ejRep })
    phys.onImpact((h) => this._small(ctx, h), { minSpeed: 5, maxPerFrame: 2, filter: ejRep })

    // Några insekter från start: en lätt fluga nära grodan + en till.
    this._spawnaLatt()
    this._spawnaNagon()
  },

  _rivVarld() {
    this._humla = null
    this._rep?.destroy()
    this._rep = null
    this._super = null
    this._ladd = null
    this._hem = null
    this._hemG = null // ligger i effekt-lagret, rivs med det nedan
    this._siktG = null // likaså
    this._sikt = null
    this._glansG = this._glansStjG = null // maxfartens glans (grodaBak- och effekt-lagret)
    this._glans = null
    this._latt = null
    this._bar = null
    this._kryst = null
    this._bajs?.destroy()
    this._tunga?.destroy()
    this._hinder?.destroy()
    this._svarm?.destroy()
    this._groda?.destroy()
    this._dammen?.destroy()
    this._phys?.destroy()
    this._tunga = this._hinder = this._svarm = this._groda = this._dammen = this._phys = this._bajs = null
    for (const n of Object.keys(this._L)) {
      const c = this._L[n]
      if (c.destroyed) continue
      stadFx(c)
      for (const ch of c.removeChildren()) if (!ch.destroyed) ch.destroy({ children: true })
    }
  },

  // ── Input ──────────────────────────────────────────────────────────────────────────────

  _tryck(ctx, e) {
    if (!this._alive || !this._groda) return
    if (e.isPrimary === false) return // inga flerfingergester (P0)
    // Ett nytt tryck medan grodan tar sats betyder att släppet aldrig kom fram (fingret
    // lämnade skärmen på fel ställe). Hoppa nu, så att grodan inte fastnar i satsen.
    if (this._ladd) {
      this._laddaSlapp(ctx)
      return
    }
    const nu = performance.now()
    if (nu - (this._senastTryck || 0) < 90) return
    this._senastTryck = nu
    this._idle = 0
    const p = this._scen.toLocal(e.global)
    const g = this._groda
    const audio = ctx.services.audio

    if (this._firar) {
      // Under firandet: grodan kvackar tillbaka.
      g.kvacka()
      this._kvackLjud(ctx)
      return
    }

    // HUD (skärmrum): hem-bladet är en HÅLL-knapp (grodan hem), körpilen visar vägen till kören.
    const h = this._hud.toLocal(e.global)
    if (Math.hypot(h.x - HEM_HUD.x, h.y - HEM_HUD.y) < HEM_HUD_TRAFF) {
      this._hem = { id: e.pointerId, t: 0, steg: 0, hud: true }
      this._hemHud.wiggle = 1
      audio.tone({ freq: 330, slideTo: 392, dur: 0.1, type: 'triangle', vol: 0.16 })
      return
    }
    const pil = this._korPil
    if (pil.c.visible && Math.hypot(h.x - pil.c.x, h.y - pil.c.y) < 62) {
      this._visaKoren(ctx)
      return
    }
    const vk = this._vandKnapp
    if (vk.c.visible && Math.hypot(h.x - vk.c.x, h.y - vk.c.y) < VAND_TRAFF) {
      this._vandTryck(ctx)
      return
    }

    // Bär grodan en korv: ett tryck på kören kastar den till ungen närmast fingret — om grodan är
    // i närheten (ägaren: "när man är i närheten av grodkören"). Längre bort vinkar kören bara.
    // Kören går FÖRE grodan här — grodan som simmar ovanför kören täckte annars körens träffyta.
    if (this._bar && this._paKoren(p)) {
      if (this._naraKoren()) this._kasta(ctx, p)
      else this._korVinkar(ctx)
      return
    }

    const paGrodan = g.avstand(p.x, p.y) < 82

    // Grodkören är en HÅLL-knapp som kallar hem grodan. Ett kort tryck får kören att heja.
    if (!paGrodan && this._paKoren(p)) {
      this._hem = { id: e.pointerId, t: 0, steg: 0 }
      this._dammen.grodungar.kvack(0)
      return
    }

    // Mitt i ett superhopp: tungan blir ett klibbigt rep, och fler tryck snärtar det.
    if (this._super) {
      this._superTryck(ctx, p, paGrodan)
      return
    }

    // Tryck PÅ grodan → den tar sats. Släpps fingret fort blir det ett vanligt hopp; hålls
    // det kvar växer satsen mot ett superhopp (_update, _laddaSlapp).
    if (paGrodan) {
      if (this._tunga.fast) this._tunga.slapp()
      if (g.kanHoppa && g.laddaStart()) {
        this._ladd = { id: e.pointerId, t: 0, not: -1, full: false, trill: 0, finger: null, siktat: false }
        audio.tone({ freq: 196, slideTo: 247, dur: 0.1, type: 'triangle', vol: 0.14 })
        return
      }
      // I luften: ett kvack (roligt, aldrig fel).
      g.kvacka()
      this._kvackLjud(ctx)
      return
    }

    // Tungan är på väg ut eller bär en insekt — titta dit och blinka (varje tryck ger svar).
    if (this._tunga.upptagen) {
      g.tittMal = { x: p.x, y: p.y }
      g.blinka()
      audio.tone({ freq: 660, slideTo: 740, dur: 0.06, type: 'sine', vol: 0.08 })
      return
    }

    // Sikthjälp: tryckte barnet nära en insekt siktar tungan dit den är på väg. En korv nära
    // fingret går före (flugorna som surrar runt den ska inte stjäla trycket). Med en korv i
    // munnen finns ingen sikthjälp — tungan ska bara fastna där fingret pekar.
    let mal = { x: p.x, y: p.y }
    const korv = this._bar ? null : this._bajs.narmast(p.x, p.y, 70)
    const ins = this._bar || korv ? null : this._svarm.narmast(p.x, p.y, 84)
    if (korv) mal = { x: korv.x, y: korv.y }
    else if (ins) mal = { x: ins.x + (ins.vx || 0) * 0.09, y: ins.y + (ins.vy || 0) * 0.09 }

    // Insekterna är inte dumma: första gången tungan siktar på en kan den väja (olika ofta per
    // sort). Nästa försök på SAMMA insekt lyckas alltid — försök igen, så går det.
    if (ins && this._atna >= 2 && !this._undvikit.has(ins)) {
      const chans = { fluga: 0.22, mygga: 0.32, trollslanda: 0.5, fjaril: 0.28, eldfluga: 0.18, guldfluga: 0.45, grashoppa: 0.3, fruktfluga: 0.2, mal: 0.25, nyckelpiga: 0.2 }[ins.typ] || 0
      if (Math.random() < chans) {
        this._undvikit.add(ins)
        const m0 = g.mun()
        const d = Math.hypot(ins.x - m0.x, ins.y - m0.y) || 1
        const sida = Math.random() < 0.5 ? -1 : 1
        const nx = (-(ins.y - m0.y) / d) * sida
        const ny = ((ins.x - m0.x) / d) * sida
        this._svarm.skramma(ins.x - nx * 14, ins.y - ny * 14, 50)
        audio.tone({ freq: 1100, slideTo: 1900, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.05 })
        log('grodan', 'undvek', { typ: ins.typ })
      }
    }

    // Uppe i ett träd och barnet trycker på TOM LUFT långt nedanför (tungan skulle inte träffa
    // något — bladen under toppgrenen ligger ~580 px ned, utom räckhåll och utanför bild): grodan
    // hoppar ned dit i stället för att skjuta en tunga som bara bommar. Ett tryck som tungan når
    // (en lägre gren, ett blad, en insekt) går som vanligt.
    if (g.pos.y < 380 && p.y > g.pos.y + 160 && !this._super && !this._bar) {
      const m = g.mun()
      const d = Math.hypot(p.x - m.x, p.y - m.y) || 1
      const r = Math.min(RACKVIDD, d + 46)
      const ex = m.x + ((p.x - m.x) / d) * r
      const ey = m.y + ((p.y - m.y) / d) * r
      const traff = this._hittaKropp(m.x, m.y, ex, ey, this._inuti(m.x, m.y, p.x, p.y)) || this._svarm.traffSegment(m.x, m.y, ex, ey, 40) || this._svarm.narmast(p.x, p.y, 84)
      if (!traff) {
        this._hoppaNed(ctx, p)
        return
      }
    }

    // Sitter grodan och målet ligger bakom den: ett litet vändhopp först. En groda som flyter
    // vänder sig också (ett simtag runt) — annars sköt en groda som flöt mot väggen varje skott
    // rakt genom sitt eget huvud och in i vassen bakom sig.
    const dx = mal.x - g.pos.x
    if ((g.paMark || g.lage === 'vatten') && !this._tunga.fast && Math.sign(dx) !== g.riktning && Math.abs(dx) > 40) {
      g.vand()
      if (g.paMark) g.knuffa(0, -2.6, 0.5)
    }
    g.tittMal = mal
    this._tunga.skjut(mal.x, mal.y)
    if (!audio.sample('thwip')) audio.tone({ freq: 700, slideTo: 1400, dur: 0.09, type: 'sine', vol: 0.2 })
    log('grodan', 'tunga', { x: Math.round(mal.x), y: Math.round(mal.y), sikt: !!ins, korv: !!korv, bar: !!this._bar })
  },

  _upp(ctx, e) {
    if (!this._alive || !this._groda) return
    if (this._ladd && e.pointerId === this._ladd.id) this._laddaSlapp(ctx)
    if (this._hem && e.pointerId === this._hem.id) {
      const kort = this._hem.t < 0.35
      const hud = this._hem.hud
      this._hem = null
      if (kort && !this._firar) {
        // Ett kort tryck: kören hejar / grodungen på hem-bladet kvackar och hoppar till.
        if (hud) {
          this._hemHud.hopp = 1
          this._kvackLjud(ctx, 0.7)
        } else this._dammen?.grodungar.heja()
      }
    }
  },

  // Trycket träffade grodkörens blad (hörnet mitt emot trädet)?
  _paKoren(p) {
    const k = this._dammen?.grodungar?.plats
    return !!k && Math.abs(p.x - k.x) < 125 && p.y > k.y - 88 && p.y < k.y + 45
  },

  // ── Superhoppet ────────────────────────────────────────────────────────────────────────

  _laddaSlapp(ctx) {
    const l = this._ladd
    this._ladd = null
    const g = this._groda
    if (!l || !g) return
    if (!g.kanHoppa) {
      // Släppt precis i ett gupp: hoppet väntar in fästet (högst 0,3 s, se _laddUppdatera).
      if ((l.utan || 0) <= 0.3) {
        l.slappt = true
        this._ladd = l
      } else g.laddaAvbryt()
      return
    }
    // Ett kort tryck är ett vanligt hopp — om fingret inte drog iväg för att sikta (då är det ett
    // sats-hopp dit pilen visade, även med nästan ingen sats). Bara full sats är superhoppet.
    if (l.t < TAP_GRANS && !l.siktat) {
      g.laddaAvbryt()
      this._vanligtHopp(ctx)
      return
    }
    const p = this._laddP(l)
    if (p >= 1) this._superHopp(ctx, 1, this._sikte(l))
    else this._laddHopp(ctx, p, this._sikte(l))
  },

  // Satsen 0…1 (hur långt över tapp-gränsen fingret hållits).
  _laddP(l) {
    return Math.max(0, Math.min(1, (l.t - TAP_GRANS) / (LADD_FULL - TAP_GRANS)))
  },

  // Fingret flyttade sig: medan grodan tar sats är det siktet.
  _flytta(e) {
    const l = this._ladd
    if (!l || e.pointerId !== l.id || !this._scen || this._scen.destroyed) return
    const p = this._scen.toLocal(e.global)
    l.finger = { x: p.x, y: p.y }
    if (!l.siktat && this._groda) {
      const c = this._groda.tyngdpunkt()
      if (Math.hypot(p.x - c.x, p.y - c.y) >= SIKT_DOD) {
        l.siktat = true
        log('grodan', 'siktar', {})
      }
    }
  },

  // Riktningen fingret visar (enhetsvektor), eller null = grodans egen. Dit fingret är, dit
  // hoppar grodan — men aldrig flackare än SIKT_MIN (fingret nedanför grodan ger det flackaste
  // hoppet åt den sidan).
  _sikte(l) {
    const f = l?.finger
    const g = this._groda
    if (!f || !g) return null
    const c = g.tyngdpunkt()
    const dx = f.x - c.x
    const dy = f.y - c.y
    if (Math.hypot(dx, dy) < SIKT_DOD) return null
    let a = Math.atan2(-dy, dx) // höjdvinkeln: 0 = åt höger, π/2 = rakt upp
    if (a < SIKT_MIN) a = a < -Math.PI / 2 ? Math.PI - SIKT_MIN : SIKT_MIN
    else if (a > Math.PI - SIKT_MIN) a = Math.PI - SIKT_MIN
    return { x: Math.cos(a), y: -Math.sin(a) }
  },

  _vanligtHopp(ctx) {
    const g = this._groda
    const audio = ctx.services.audio
    if (g.hoppa(this._bortFranKanten(g))) {
      audio.tone({ freq: 240, slideTo: 560, dur: 0.14, type: 'triangle', vol: 0.22 })
      puff(this._fx, g.pos.x, g.pos.y + 30, { count: 5, color: 0xd9f0c0 })
      log('grodan', 'hopp', { x: Math.round(g.pos.x), vatten: g.iVatten })
      // Andra vanliga hoppet utan att barnet hittat hållet: berätta en gång.
      if (++this._hoppAntal === 2 && !this._superAntal && !this._laddAntal && !this._tipsat) {
        this._tipsat = true
        ctx.narTyst(() => this._alive && !this._firar && !this._superAntal && !this._laddAntal && ctx.services.voice.say('Håll kvar fingret på grodan för ett superhopp!'))
      }
    } else {
      g.kvacka()
      this._kvackLjud(ctx)
    }
  },

  // Sats-hoppet (hållet, men inte full sats): dit pilen visade, och grodan landar på benen.
  _laddHopp(ctx, p, sikt = null) {
    const g = this._groda
    const audio = ctx.services.audio
    this._nollaTunga()
    const blad = g.underlag?.label === 'blad' ? g.underlag : null
    const under = g.paMark ? g.underlag : null
    if (!g.laddHopp(p, g.riktning, sikt)) return
    // Grodan lättar som i superhoppet (pilen räknar med det): underlaget släpper igenom den.
    if (under && under.label !== 'wall' && !under.isSensor) this._latt = { body: under, steg: LATT_STEG, mask: under.collisionFilter.mask }
    this._laddAntal = (this._laddAntal || 0) + 1
    audio.tone({ freq: 240, slideTo: 560 + 260 * p, dur: 0.16 + 0.08 * p, type: 'triangle', vol: 0.22 })
    puff(this._fx, g.pos.x, g.pos.y + 30, { count: Math.round(5 + p * 5), color: 0xd9f0c0 })
    if (blad) this._dammen.bladTryck(blad, 0.45 + 0.4 * p)
    log('grodan', 'laddhopp', { p: Math.round(p * 100) / 100, sikt: sikt ? Math.round(Math.atan2(-sikt.y, sikt.x) * 57.3) : null })
  },

  _superHopp(ctx, p, sikt = null) {
    const g = this._groda
    const audio = ctx.services.audio
    this._nollaTunga()
    const blad = g.underlag?.label === 'blad' ? g.underlag : null
    const under = g.paMark ? g.underlag : null
    // Utan sikte: dit grodan tittar (samma som pilen visade — _siktBana läser samma superFart).
    if (!g.superHopp(p, g.riktning, sikt)) return
    // Grodan LÄTTAR: det den stod på krockar inte med den under de första stegen. Fötterna som
    // skrapade i bladet gav ett snett hopp en extra knuff (_siktprobe: kontakt på steg 4, −0,5 px/steg
    // i x och −0,9 i y), och grodan landade en bit från där pilen visade.
    if (under && under.label !== 'wall' && !under.isSensor) this._latt = { body: under, steg: LATT_STEG, mask: under.collisionFilter.mask }
    this._super = { fas: 'luft', t0: this._t, landT: null, vakT: null, uppe: false, p }
    this._superAntal++
    if (!audio.sample('whoosh')) audio.tone({ freq: 300, slideTo: 900, dur: 0.35, type: 'sine', vol: 0.14 })
    audio.tone({ freq: 220, slideTo: 880 + 300 * p, dur: 0.28, type: 'triangle', vol: 0.2 })
    puff(this._fx, g.pos.x, g.pos.y + 34, { count: Math.round(7 + p * 8), color: 0xd9f0c0 })
    if (blad) this._dammen.bladTryck(blad, 0.6 + 0.4 * p)
    const voice = ctx.services.voice
    if ((this._superAntal <= 2 || Math.random() < 0.35) && !voice.talar) voice.say('Superhopp!')
    log('grodan', 'superhopp', { p: Math.round(p * 100) / 100, sikt: sikt ? Math.round(Math.atan2(-sikt.y, sikt.x) * 57.3) : null })
  },

  // Ett tryck mitt i superhoppet. Första gången åker tungan ut som ett rep: på grodan dit
  // hjässan pekar ("tungan åker bara ut"), annars mot fingret. Sedan snärtar varje tryck repet.
  _superTryck(ctx, p, paGrodan) {
    const s = this._super
    const g = this._groda
    const audio = ctx.services.audio
    if (s.fas === 'vaknar' || s.uppe) {
      g.blinka()
      audio.tone({ freq: 660, slideTo: 740, dur: 0.06, type: 'sine', vol: 0.08 })
      return
    }
    if (!this._rep) {
      let ux
      let uy
      if (paGrodan) {
        const u = g.upp()
        const a = Math.atan2(u.y, u.x) + rnd(-0.5, 0.5)
        ux = Math.cos(a)
        uy = Math.sin(a)
      } else {
        const m = g.mun()
        const d = Math.hypot(p.x - m.x, p.y - m.y) || 1
        ux = (p.x - m.x) / d
        uy = (p.y - m.y) / d
      }
      this._rep = new Klibbrep({
        phys: this._phys,
        groda: g,
        lager: this._L.tunga,
        flytvolym: this._dammen.flytvolym,
        svarm: this._svarm,
        hitta: { maskKroppar: () => this._dammen.foremal.filter((f) => f.typ === 'vass' || f.typ === 'stubbe').map((f) => f.body) },
        pa: {
          fastnade: (body, x, y) => this._repFast(ctx, body, x, y),
          fangade: (ins) => this._repFangade(ctx, ins),
          at: (ins) => this._at(ctx, ins),
        },
      })
      this._rep.fangar = !this._bar
      this._rep.skjut(ux, uy)
      g.oppnaMun(1)
      if (!audio.sample('thwip')) audio.tone({ freq: 700, slideTo: 1400, dur: 0.09, type: 'sine', vol: 0.2 })
      log('grodan', 'rep', { paGrodan })
      return
    }
    this._rep.snart(p.x, p.y)
    g.sprattla()
    audio.tone({ freq: 520, slideTo: 980, dur: 0.1, type: 'sine', vol: 0.14 })
  },

  _repFast(ctx, body, x, y) {
    const audio = ctx.services.audio
    audio.tone({ freq: 430, slideTo: 250, dur: 0.1, type: 'triangle', vol: 0.22 })
    sparkle(this._fx, x, y, { count: 4 })
    // Fast i något som håller grodan kvar: den hänger slak och dinglar (räknas som landning).
    if (this._rep?.ankrad) this._groda.landa()
    if (body.label === 'bubbla') this._hinder?.poppa()
    else this._akaMed(ctx, body)
    log('grodan', 'repFast', { mal: body.label, statisk: !!body.isStatic })
  },

  _repFangade(ctx, ins) {
    ctx.services.audio.tone({ freq: 880, slideTo: 1320, dur: 0.07, type: 'sine', vol: 0.16 })
    sparkle(this._fx, ins.x, ins.y, { count: 3 })
    log('grodan', 'repInsekt', { typ: ins.typ })
  },

  // Per bildruta medan fingret håller på grodan: satsen växer, en stämd skala klättrar, och
  // vid full sats en glittrande "redo"-trill.
  _laddUppdatera(ctx, dtS) {
    const l = this._ladd
    if (!l) return
    const g = this._groda
    const audio = ctx.services.audio
    // Knuffad av bladet mitt i satsen (kotte, fisk) — satsen rinner ut, inget straff. Ett
    // kort ögonblick utan fäste (ett gupp) räknas inte.
    l.utan = g.kanHoppa ? 0 : (l.utan || 0) + dtS
    if (l.utan > 0.3) {
      this._ladd = null
      g.laddaAvbryt()
      return
    }
    if (l.slappt) {
      if (g.kanHoppa) this._laddaSlapp(ctx)
      return
    }
    l.t += dtS
    g.setLaddning(Math.min(1, l.t / LADD_FULL))
    // Grodan tittar dit hoppet går — och vänder sig om fingret drar åt andra sidan (tydligt åt
    // sidan: fingret som drar förbi rakt ovanför ska inte få den att vicka fram och tillbaka).
    const sikt = this._sikte(l)
    if (sikt && Math.abs(sikt.x) > 0.3 && Math.sign(sikt.x) !== g.riktning && (g.paMark || g.lage === 'vatten')) g.vand()
    const tp = g.tyngdpunkt()
    g.tittMal = sikt ? { x: tp.x + sikt.x * 300, y: tp.y + sikt.y * 300 } : { x: g.pos.x + g.riktning * 260, y: g.pos.y - 240 }
    if (l.t > TAP_GRANS) {
      const not = Math.min(7, Math.floor(((l.t - TAP_GRANS) / (LADD_FULL - TAP_GRANS)) * 8))
      if (not > l.not) {
        l.not = not
        audio.tone({ freq: SKALA[not], dur: 0.1, type: 'triangle', vol: 0.12 + not * 0.01 })
      }
    }
    // MAXFARTEN: grodan glittrar och glänser (_ritaMaxGlans), pilen blir röd, en trill går.
    if (l.t >= LADD_FULL && !l.full) {
      l.full = true
      l.fullT = 0
      const k = g.pos
      sparkle(this._fx, k.x, k.y + 20, { count: 12 })
      audio.tone({ freq: 523, dur: 0.18, type: 'triangle', vol: 0.14 })
      audio.tone({ freq: 784, dur: 0.18, type: 'triangle', vol: 0.1, delay: 0.04 })
      audio.tone({ freq: 1047, dur: 0.22, type: 'sine', vol: 0.08, delay: 0.09 })
      log('grodan', 'maxfart', {})
    }
    if (l.full) {
      // Trillen en sekund, sedan ett stilla pling då och då — man får hålla hur länge som helst,
      // och ett evigt tjut vore ett straff för den som siktar noga.
      l.fullT += dtS
      l.trill -= dtS
      if (l.trill <= 0) {
        l.trill = l.fullT < 1 ? 0.13 : 0.9
        l.hog = !l.hog
        audio.tone({ freq: l.hog ? 1047 : 880, dur: 0.07, type: 'sine', vol: l.fullT < 1 ? 0.06 : 0.035 })
      }
      l.glitter = (l.glitter || 0) - dtS
      if (l.glitter <= 0) {
        l.glitter = 0.16
        const c = g.tyngdpunkt()
        sparkle(this._fx, c.x + rnd(-46, 46), c.y + rnd(-40, 30), { count: 2 })
      }
    }
    // Den som håller (och siktar) tänker — ingen om-cue under tiden.
    this._idle = 0
  },

  // ── Siktet: pilen som visar superhoppets bana ─────────────────────────────────────────

  // Banan grodans tyngdpunkt tar efter ett superhopp med sats p åt `sikt`: samma utgångsfart
  // (groda.superFart), samma tyngd, samma luftmotstånd (LUFT_SUPER — grodan i luften) och samma
  // vind som fysiken, steg för steg som matter räknar: v = v·(1 − luft) + a, sedan x += v.
  // Banan slutar där FÖTTERNA (SIKT_FOT under tyngdpunkten) når något fast, ett envägsblad/-gren
  // på väg NED, eller vattnet. Returnerar { pts: [x0, y0, x1, y1, …], landat, vx, vy }.
  _siktBana(p, sikt) {
    const g = this._groda
    const phys = this._phys
    const d = this._dammen
    const c = g.tyngdpunkt()
    const v = g.superFart(p, sikt)
    const under = g.paMark ? g.underlag : null
    const grav = phys.engine.gravity
    const gy = grav.y * (grav.scale ?? 0.001) * STEG2
    const wx = (this._hinder?.vind || 0) * 0.07
    const luft = 1 - LUFT_SUPER
    // Det grodan kan landa på. Vass och stubbens stam är bara tungmål (krockar inte).
    const fast = []
    const envag = []
    for (const f of d.foremal) {
      if (f.typ === 'vass' || f.typ === 'stubbe') continue
      const l = f.body.label
      if (l === 'gren' || l === 'blad' || l === 'svamp') envag.push(f.body)
      else fast.push(f.body)
    }
    // Hoppet lyfter grodan SUPER_LATT px ur underlaget innan det första steget (groda.superHopp).
    const pts = [c.x, c.y - SUPER_LATT]
    let x = c.x
    let y = c.y - SUPER_LATT
    let vx = v.x
    let vy = v.y
    let landat = null
    // Grodan är ingen punkt: ett hopp förbi en sten slog i den med benen medan en punktbana gick
    // fri (_siktprobe: "sten" i kontaktloggen på steg 8, banan 790 px för lång). Fast mark provas
    // därför i fötterna, framför, bakom och ovanför tyngdpunkten; envägsbladen bara med fötterna,
    // på väg ned.
    // Tyngdpunkten själv också: en trädstam (52 px) rymdes mellan sidopunkterna och banan gick
    // rakt igenom den (sett i skärmdumpen).
    const prov = [[0, 0], [0, SIKT_FOT], [-SIKT_BRED, SIKT_FOT * 0.5], [SIKT_BRED, SIKT_FOT * 0.5], [-SIKT_BRED, 0], [SIKT_BRED, 0], [0, -SIKT_BRED]]
    const PROV_TIDIGT = [[0, 0], [0, -SIKT_BRED]]
    const pt = { x: 0, y: 0 }
    // Benen: vid frånskjutet där grodan sitter (dess lägsta punkt, lyft SUPER_LATT), sedan
    // utsträckta mot SIKT_FOT på de första stegen. De envägsblad grodan redan är ovanför när den
    // lättar bär den från början — som i spelet, där ett flackt hopp landade på grannbladet.
    let lag0 = -Infinity
    for (const b of g.delar) lag0 = Math.max(lag0, b.bounds.max.y)
    lag0 = Math.min(SIKT_FOT, lag0 - SUPER_LATT - c.y)
    const ovanfor = new Set()
    for (const b of envag) if (b !== under && c.y + lag0 < b.bounds.min.y - 2) ovanfor.add(b)
    for (let i = 0; i < SIKT_STEG; i++) {
      vx = vx * luft + wx
      vy = vy * luft + gy
      x += vx
      y += vy
      pts.push(x, y)
      if (x < -60 || x > VARLD_B + 60 || y > 780) break
      if (i < 3) continue // grodan står på något just nu — det är inte ett nedslag
      // Under lättningen (LATT_STEG) provas bara tyngdpunkten och det ovanför: ett ben som snuddar
      // grannstenen på väg UPP stoppar inte grodan (_siktprobe 2026-09-25: pilen slutade efter 4
      // steg vid en sten intill startbladet medan grodan flög 100–340 px längre).
      for (const [ox, oy] of i < LATT_STEG ? PROV_TIDIGT : prov) {
        pt.x = x + ox
        pt.y = y + oy
        if (Query.point(fast, pt).some((b) => i >= LATT_STEG || (b.parent || b) !== under)) {
          landat = 'mark'
          break
        }
      }
      if (landat) break
      // Envägsbladen och -grenarna bär grodan först när HELA grodan varit ovanför dem
      // (_envagsgrenar) — här: när fötterna en gång passerat ovanför deras ovansida. Då räknas de
      // även på väg upp (ett flackt hopp skrapade benen i nästa näckrosblad), men inte en gren
      // grodan fortfarande stiger förbi.
      // "Ovanför" bedöms med grodans form som den är: de första stegen sitter benen kvar
      // hopkrupna (lag0) — spelets regel ser då hela grodan ovanför grannbladet — och SEDAN
      // sträcks de ned mot SIKT_FOT och slår i det.
      const strackt = Math.min(1, i / 6)
      pt.x = x
      pt.y = y + (i < 6 ? lag0 : SIKT_FOT)
      for (const b of envag) if (pt.y < b.bounds.min.y - 2) ovanfor.add(b)
      pt.y = y + lag0 + (SIKT_FOT - lag0) * strackt
      if (Query.point(envag, pt).some((b) => (i >= LATT_STEG || b !== under) && ovanfor.has(b))) {
        landat = 'mark'
        break
      }
      if (vy > 0 && pt.y >= YT_Y && x > d._vx0 && x < d._vx1) {
        landat = 'vatten'
        break
      }
    }
    return { pts, landat, vx, vy }
  },

  // Pilen: prickar som glider längs banan från grodan mot nedslaget, en pilspets i änden och en
  // liten skugga där fötterna landar. Diskret: halvgenomskinlig, tunnare närmast grodan.
  // Syns medan fingret håller (efter tapp-gränsen, eller direkt när fingret drar) och bleknar
  // bort på 0,15 s efter släppet.
  _ritaSikt(dtS) {
    const l = this._ladd
    const g = this._groda
    const visa = !!l && !l.slappt && !this._firar && g?.kanHoppa && (l.t > TAP_GRANS || l.siktat)
    const s = this._sikt || (this._sikt = { a: 0, fas: 0, bana: null })
    s.a = visa ? Math.min(1, s.a + dtS * 7) : Math.max(0, s.a - dtS * 7)
    if (visa) s.bana = this._siktBana(this._laddP(l), this._sikte(l))
    let sg = this._siktG
    if (s.a <= 0.01 || !s.bana) {
      if (sg && !sg.destroyed && s.ritad) {
        sg.clear()
        s.ritad = false
      }
      return
    }
    if (!sg || sg.destroyed) {
      sg = this._siktG = new Graphics()
      this._L.effekt.addChild(sg)
    }
    s.ritad = true
    s.fas = (s.fas + dtS * 70) % SIKT_LUCKA // prickarna glider framåt, 70 px/s
    sg.clear()
    const pts = s.bana.pts
    const n = pts.length / 2
    // Längs banan: en prick var SIKT_LUCKA px, förskjutna med fasen.
    const langd = []
    let L = 0
    langd.push(0)
    for (let i = 1; i < n; i++) {
      L += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1])
      langd.push(L)
    }
    // MAXFARTEN (full sats): pilen blir TJOCK och LYSANDE RÖD — ett glödande band längs hela
    // banan, större röda prickar med glans, och allt pulserar. Under full sats: diskret och vit.
    const full = !!(l?.full || (l && this._laddP(l) >= 1))
    const bas = (full ? 0.95 : 0.6) * s.a
    const puls = full ? 0.5 + 0.5 * Math.sin(this._t * 9) : 0
    if (full) {
      const i0 = Math.min(n - 1, 2)
      sg.moveTo(pts[i0 * 2], pts[i0 * 2 + 1])
      for (let i = i0 + 1; i < n - 2; i++) sg.lineTo(pts[i * 2], pts[i * 2 + 1])
      sg.stroke({ width: 24 + 6 * puls, color: MAX_GLOD, alpha: bas * 0.3, cap: 'round', join: 'round' })
      sg.moveTo(pts[i0 * 2], pts[i0 * 2 + 1])
      for (let i = i0 + 1; i < n - 2; i++) sg.lineTo(pts[i * 2], pts[i * 2 + 1])
      sg.stroke({ width: 8, color: MAX_ROD, alpha: bas * (0.35 + 0.15 * puls), cap: 'round', join: 'round' })
    }
    let j = 1
    for (let d = s.fas + 14; d < L - 22; d += SIKT_LUCKA) {
      while (j < n - 1 && langd[j] < d) j++
      const f = (d - langd[j - 1]) / Math.max(0.001, langd[j] - langd[j - 1])
      const x = pts[j * 2 - 2] + (pts[j * 2] - pts[j * 2 - 2]) * f
      const y = pts[j * 2 - 1] + (pts[j * 2 + 1] - pts[j * 2 - 1]) * f
      const u = d / L
      const a = bas * Math.min(1, (d - 14) / 50)
      const r = 2.6 + 2 * Math.min(1, u * 2.5)
      if (full) {
        const R = r * 1.6 + 1.5
        sg.circle(x, y, R + 1.6).fill({ color: 0x5c0a0a, alpha: a * 0.55 })
        sg.circle(x, y, R).fill({ color: MAX_ROD, alpha: Math.min(1, a * 1.1) })
        sg.circle(x - R * 0.3, y - R * 0.3, R * 0.38).fill({ color: 0xffe2dc, alpha: a * (0.7 + 0.3 * puls) })
      } else {
        sg.circle(x, y, r + 1.4).fill({ color: 0x1d3a26, alpha: a * 0.45 })
        sg.circle(x, y, r).fill({ color: 0xffffff, alpha: a })
      }
    }
    // Pilspetsen i änden, längs banans sista riktning.
    const ex = pts[(n - 1) * 2]
    const ey = pts[(n - 1) * 2 + 1]
    const px = pts[Math.max(0, n - 4) * 2]
    const py = pts[Math.max(0, n - 4) * 2 + 1]
    const dd = Math.hypot(ex - px, ey - py) || 1
    const ux = (ex - px) / dd
    const uy = (ey - py) / dd
    const S = full ? 1.6 : 1 // maxfartens pilspets är större
    const spets = (k, w) => [ex + ux * k * S, ey + uy * k * S, ex - ux * (18 - k) * S - uy * w * S, ey - uy * (18 - k) * S + ux * w * S, ex - ux * (12 - k) * S, ey - uy * (12 - k) * S, ex - ux * (18 - k) * S + uy * w * S, ey - uy * (18 - k) * S - ux * w * S]
    if (full) sg.poly(spets(-4, 17)).fill({ color: MAX_GLOD, alpha: bas * (0.25 + 0.15 * puls) })
    sg.poly(spets(1.5, 13)).fill({ color: full ? 0x5c0a0a : 0x1d3a26, alpha: bas * (full ? 0.6 : 0.35) })
    sg.poly(spets(0, 11)).fill({ color: full ? MAX_ROD : 0xffffff, alpha: Math.min(1, bas * 1.3) })
    // Där fötterna landar: en platt skugga (en ring på vattnet) — röd vid maxfarten.
    if (s.bana.landat) {
      const ly = s.bana.landat === 'vatten' ? YT_Y : ey + SIKT_FOT
      const pl = 1 + 0.08 * Math.sin(this._t * 6)
      if (s.bana.landat === 'vatten') sg.ellipse(ex, ly, 30 * pl, 8 * pl).stroke({ width: full ? 4 : 2.5, color: full ? MAX_ROD : 0xffffff, alpha: bas })
      else sg.ellipse(ex, ly, 26 * pl, 7 * pl).fill({ color: full ? MAX_ROD : 0x1d3a26, alpha: bas * 0.4 })
    }
  },

  // MAXFARTEN syns på grodan (ägaren 2026-09-25: "grodan börjar glittra och glänsa"): en varm
  // glans som pulserar runt kroppen (bakom den) och små stjärnor som tindrar till och slocknar
  // ovanpå. Glittret (sparkle) kommer ur _laddUppdatera. Tonar in på 0,15 s, ut på 0,2 s.
  _ritaMaxGlans(dtS) {
    const l = this._ladd
    const g = this._groda
    const full = !!l?.full && !l.slappt && !this._firar && !!g?.kanHoppa
    const m = this._glans || (this._glans = { a: 0, stj: [], ny: 0 })
    m.a = full ? Math.min(1, m.a + dtS * 6.5) : Math.max(0, m.a - dtS * 5)
    let aura = this._glansG
    let stj = this._glansStjG
    if (m.a <= 0.01 || !g) {
      if (m.ritad) {
        if (aura && !aura.destroyed) aura.clear()
        if (stj && !stj.destroyed) stj.clear()
        m.ritad = false
      }
      m.stj.length = 0
      return
    }
    if (!aura || aura.destroyed) {
      aura = this._glansG = new Graphics()
      this._L.grodaBak.addChildAt(aura, 0)
    }
    if (!stj || stj.destroyed) {
      stj = this._glansStjG = new Graphics()
      this._L.effekt.addChild(stj)
    }
    m.ritad = true
    const c = g.tyngdpunkt()
    const puls = 0.5 + 0.5 * Math.sin(this._t * 7)
    aura.clear()
    for (let i = 0; i < 5; i++) {
      const k = 1 - i / 5
      const sk = 1 + 0.07 * puls
      aura.ellipse(c.x, c.y - 4, (60 + 44 * k) * sk, (50 + 34 * k) * sk).fill({ color: 0xfff0a0, alpha: m.a * (0.07 + 0.04 * puls) })
    }
    // Stjärnorna föds på en slumpad kroppsdel och lever 0,5 s: växer, vrider sig, slocknar.
    m.ny -= dtS
    if (full && m.ny <= 0) {
      m.ny = 0.07
      const d = valj(g.delar)
      m.stj.push({ x: d.position.x - c.x + rnd(-12, 12), y: d.position.y - c.y + rnd(-10, 10), t: 0, r: rnd(5, 9), v: rnd(-3, 3) })
    }
    stj.clear()
    for (let i = m.stj.length - 1; i >= 0; i--) {
      const st = m.stj[i]
      st.t += dtS / 0.5
      if (st.t >= 1) {
        m.stj.splice(i, 1)
        continue
      }
      const r = st.r * Math.sin(st.t * Math.PI)
      const x = c.x + st.x
      const y = c.y + st.y
      const a0 = st.v * st.t
      const pts = []
      for (let k = 0; k < 8; k++) {
        const rr = k % 2 ? r * 0.28 : r
        const a = a0 + (k / 8) * TAU
        pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      stj.poly(pts).fill({ color: st.r > 7 ? 0xffffff : 0xfff3b0, alpha: m.a * 0.95 })
    }
  },

  // Superhoppets förlopp: luft → mark (tumlar) → vaknar (en sekund stilla) → uppe (på benen,
  // repet slurpas in) → klart.
  _superUppdatera(ctx) {
    const s = this._super
    if (!s || this._firar) return
    const g = this._groda
    const audio = ctx.services.audio
    if (s.fas === 'luft' && g.landat) {
      s.fas = 'mark'
      s.landT = this._t
    }
    if (s.fas === 'luft' || s.fas === 'mark') {
      const vilat = g.vilSteg >= 60
      const lange = s.landT !== null && this._t - s.landT > 5.5
      const evigt = this._t - s.t0 > 11
      if (vilat || lange || evigt) {
        s.fas = 'vaknar'
        s.vakT = this._t
        g.vaknaTill()
        audio.tone({ freq: 392, slideTo: 523, dur: 0.12, type: 'triangle', vol: 0.18 })
        log('grodan', 'vaknarTill', { vilat, lange, evigt })
      }
      return
    }
    if (s.fas === 'vaknar' && !s.uppe) {
      if (this._t - s.vakT < 0.45) return
      s.uppe = true
      // Vänd mot närmaste insekt (annars mot dammens mitt) när den kommer på benen.
      const ins = this._svarm.narmast(g.pos.x, g.pos.y, 900)
      const dir = Math.sign((ins ? ins.x : VARLD_B / 2) - g.pos.x) || 1
      const antal = this._rep?.antalInsekter ?? 0
      this._rep?.slurpa()
      g.vakna(dir)
      puff(this._fx, g.pos.x, g.pos.y + 24, { count: 6, color: 0xd9f0c0 })
      audio.tone({ freq: 262, slideTo: 523, dur: 0.16, type: 'triangle', vol: 0.2 })
      if (antal && !audio.sample('slurp')) audio.tone({ freq: 900, slideTo: 300, dur: 0.3, type: 'sine', vol: 0.16 })
      log('grodan', 'vaknar', { insekter: antal })
      return
    }
    if (s.uppe && (!this._rep || this._rep.klar)) {
      this._rep?.destroy()
      this._rep = null
      this._super = null
      if (Math.random() < 0.5 && !ctx.services.voice.talar) ctx.services.voice.say('Vilken volt!')
    }
  },

  // Mitt i superhoppet äter grodan det den far in i — med munnen, huvudet eller magen — och
  // lemmarna som sveper förbi knuffar undan insekter.
  _superAta(ctx) {
    const g = this._groda
    const m = g.mun()
    const hp = g.b.huvud.position
    const k = g.pos
    const ins = this._bar ? null : this._svarm.narmast(m.x, m.y, 50) || this._svarm.narmast(hp.x, hp.y, 44) || this._svarm.narmast(k.x, k.y, 44)
    if (ins) {
      g.oppnaMun(1)
      this._svarm.fanga(ins)
      ins.x = m.x
      ins.y = m.y
      log('grodan', 'munnen', { typ: ins.typ, super: true })
      this._at(ctx, ins)
      ctx.later(0.18, () => this._alive && this._groda === g && !this._rep && this._tunga?.lage === 'av' && g.oppnaMun(0))
    }
    for (const namn of LEMMAR) {
      const b = g.b[namn]
      if (Math.hypot(b.velocity.x, b.velocity.y) < 4.5) continue
      const n = this._svarm.narmast(b.position.x, b.position.y, 34)
      if (!n || (this._knuff.get(n) ?? -9) > this._t - 0.5) continue
      this._knuff.set(n, this._t)
      this._svarm.skramma(b.position.x, b.position.y, 34 + n.r)
      ctx.services.audio.tone({ freq: 1200, slideTo: 1600, dur: 0.05, type: 'sine', vol: 0.06 })
    }
  },

  // Avbryt superhoppet direkt (grodan kallas hem eller rymde). Läget sätts av anroparen.
  _avslutaSuper() {
    this._rep?.destroy()
    this._rep = null
    this._super = null
    if (this._ladd) {
      this._ladd = null
      this._groda?.laddaAvbryt()
    }
    this._groda?.avbrytSuper()
  },

  // ── Grodkören: håll för att kalla hem grodan ───────────────────────────────────────────

  _hemUppdatera(ctx, dtS) {
    const h = this._hem
    if (h) {
      h.t += dtS
      const steg = Math.floor(h.t / 0.45)
      if (steg > h.steg && steg < 6) {
        h.steg = steg
        this._dammen.grodungar.kvack(steg)
      }
      if (h.t >= HEM_TID) this._kallaHem(ctx)
    }
    this._ritaHemRing()
  },

  // En ring som fylls runt kören (eller hem-bladet) medan fingret håller — föräldern ser att
  // något händer.
  _ritaHemRing() {
    const h = this._hem
    const hudG = this._hemHud?.ring
    if (hudG && !hudG.destroyed && !h?.hud) hudG.clear()
    if (!h || h.hud) {
      if (this._hemG && !this._hemG.destroyed) this._hemG.clear()
      if (h?.hud && hudG && !hudG.destroyed) {
        const u = Math.min(1, h.t / HEM_TID)
        hudG.clear()
        hudG.circle(HEM_HUD.x, HEM_HUD.y, HEM_HUD.r + 14).stroke({ width: 8, color: 0xffffff, alpha: 0.35 })
        if (u > 0.01) bage(hudG, HEM_HUD.x, HEM_HUD.y, HEM_HUD.r + 14, -Math.PI / 2, -Math.PI / 2 + u * TAU).stroke({ width: 8, color: 0xfff6c8, alpha: 0.95, cap: 'round' })
      }
      return
    }
    if (!this._hemG || this._hemG.destroyed) {
      this._hemG = new Graphics()
      this._L.effekt.addChild(this._hemG)
    }
    const k = this._dammen.grodungar.plats
    const g = this._hemG
    const u = Math.min(1, h.t / HEM_TID)
    const cx = k.x
    const cy = k.y - 30
    g.clear()
    g.circle(cx, cy, 82).stroke({ width: 10, color: 0xffffff, alpha: 0.28 })
    if (u > 0.01) bage(g, cx, cy, 82, -Math.PI / 2, -Math.PI / 2 + u * TAU).stroke({ width: 10, color: 0xfff6c8, alpha: 0.95, cap: 'round' })
  },

  _kallaHem(ctx) {
    this._hem = null
    const g = this._groda
    if (!g || this._firar) return
    const audio = ctx.services.audio
    puff(this._fx, g.pos.x, g.pos.y, { count: 10, color: 0xd9f0c0 })
    this._avslutaSuper()
    this._nollaTunga()
    const sp = this._dammen.startPunkt
    g.teleportera(sp.x, sp.y, sp.x < VARLD_B / 2 ? 1 : -1)
    this._startBladFast()
    this._kam.moveTo(sp.x, 360)
    this._vyUppdatera()
    puff(this._fx, sp.x, sp.y, { count: 12, color: 0xd9f0c0 })
    sparkle(this._fx, sp.x, sp.y - 20, { count: 8 })
    this._dammen.grodungar.heja()
    ;[523, 659, 784, 1047].forEach((f, i) => audio.tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.16, delay: i * 0.08 }))
    if (!ctx.services.voice.talar) ctx.services.voice.say('Grodan hoppar hem!')
    log('grodan', 'hem', {})
  },

  // ── Tungans träffar ────────────────────────────────────────────────────────────────────

  _klibbKroppar() {
    const lista = this._dammen.foremal.map((f) => f.body)
    for (const b of this._hinder.kroppar()) lista.push(b)
    return lista
  },

  // Kroppar tungan går IGENOM vid ett skott mot (tx, ty):
  //  ⓵ det munnen sitter inne i (vassen grodan simmar bland);
  //  ⓶ SMALA LODRÄTA saker — vass och trädstammar — om fingret inte pekar på dem. En tunga som
  //    passerar ett strå eller en stam på väg mot en fluga fastnade annars i det. Vid kanten blev
  //    det vass-fällan (576 av 578 skott i vassen på 590 s; _vassfalleprobe 2/6 fast), och vid
  //    L4:s döda stam mitt i dammen samma sak (694 av 756 skott i stammen, 1/6 loss —
  //    `_vassfalleprobe --falla stubbe`, kontrollarmen);
  //  ⓷ det munnen TRYCKS MOT (inom 30 px) om fingret inte pekar just dit — en groda som hänger
  //    tätt intill en stam eller under en gren ska kunna skjuta förbi den.
  // Pekar fingret på något av dem är det fortfarande ett mål (man ska kunna svinga i en stam).
  _inuti(x, y, tx, ty) {
    const kroppar = this._klibbKroppar()
    const lista = Query.point(kroppar, { x, y }).map((b) => b.parent || b)
    if (tx === undefined) return lista
    const pekar = (b, m) => tx > b.min.x - m && tx < b.max.x + m && ty > b.min.y - m && ty < b.max.y + m
    for (const f of this._dammen.foremal) {
      if ((f.typ === 'vass' || f.body.label === 'stam') && !lista.includes(f.body) && !pekar(f.body.bounds, 26)) lista.push(f.body)
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8
      for (const hit of Query.point(kroppar, { x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30 })) {
        const b = hit.parent || hit
        if (!lista.includes(b) && !pekar(b.bounds, 20)) lista.push(b)
      }
    }
    // ⓸ Det grodan STÅR på (grenen, stenen) — ett skott ned mot bladet under ska inte fastna i den.
    const u = this._groda?.underlag
    if (u && !lista.includes(u) && !pekar(u.bounds, 20)) lista.push(u)
    return lista
  },

  _hittaKropp(ax, ay, bx, by, undanta = []) {
    const kroppar = this._klibbKroppar().filter((b) => !undanta.includes(b))
    const d = Math.hypot(bx - ax, by - ay)
    const n = Math.max(1, Math.ceil(d / 7))
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n
      const y = ay + ((by - ay) * i) / n
      const traff = Query.point(kroppar, { x, y })
      if (traff.length) return { body: traff[0].parent || traff[0], x, y }
    }
    return null
  },

  _traffKropp(ctx, body, x, y) {
    const audio = ctx.services.audio
    // Såpbubblan (badrummet): tungan spräcker den i stället för att fastna.
    if (body.label === 'bubbla' && this._hinder?.poppa()) {
      this._tunga.slapp()
      return
    }
    audio.tone({ freq: 430, slideTo: 250, dur: 0.1, type: 'triangle', vol: 0.24 })
    sparkle(this._fx, x, y, { count: 4 })
    const tung = body.isStatic || body.mass >= this._groda.massa * 0.7
    if (tung) this._groda.lage = 'dingla'
    this._akaMed(ctx, body)
    log('grodan', 'fast', { mal: body.label, statisk: !!body.isStatic })
  },

  // Tungan fastnade i något som rör sig av sig självt: grodan åker med. I vattnet vattenskidor,
  // på land (krabban, pillerbaggen, katten) åker den bara med.
  _akaMed(ctx, body) {
    const voice = ctx.services.voice
    if (voice.talar) return
    if (body.label === 'skoldpadda' || body.label === 'anka') voice.say('Grodan åker vattenskidor!')
    else if (body.label === 'krabba' || body.label === 'pillerbagge' || body.label === 'katt') voice.say('Grodan åker med!')
  },

  // En bubbla sprack (träskets gasbubbla vid ytan, badrummets såpbubbla): det som är nära får en
  // knuff uppåt — grodan, korven och insekterna. Tydlig orsak (blubb + stänk), aldrig farligt.
  _bubbla(ctx, x, y, r) {
    const g = this._groda
    const audio = ctx.services.audio
    audio.tone({ freq: 180, slideTo: 420, dur: 0.16, type: 'sine', vol: 0.2 })
    audio.tone({ freq: 620, slideTo: 900, dur: 0.07, type: 'sine', vol: 0.1, delay: 0.1 })
    sparkle(this._fx, x, y, { count: 7 })
    puff(this._fx, x, y, { count: 6, color: 0xeef6d8 })
    this._svarm?.skramma(x, y, r + 60)
    for (const k of this._bajs?.fria || []) {
      if (k.body && Math.hypot(k.x - x, k.y - y) < r + 40) Body.setVelocity(k.body, { x: k.body.velocity.x + (k.x - x) * 0.03, y: -5 })
    }
    if (!g || this._super || this._firar) return
    const d = Math.hypot(g.pos.x - x, g.pos.y - y)
    if (d > r + 50) return
    const s = 1 - d / (r + 50)
    g.knuffa(Math.sign(g.pos.x - x || 1) * (1.5 + 2 * s), -(4.5 + 5 * s), 0.8)
    if (s > 0.5) g.slappna(0.35)
    if (!ctx.services.voice.talar && this._t - (this._blubbT ?? -99) > 15) {
      this._blubbT = this._t
      ctx.services.voice.say('Blubb! En bubbla!')
    }
    log('grodan', 'bubbla', { d: Math.round(d) })
  },

  _traffInsekt(ctx, ins) {
    if (ins.korv) {
      // Tungan fick tag i en korv: den rullas in som en insekt, men äts inte (_at → _taKorv).
      this._bajs.gripTunga(ins)
      ctx.services.audio.tone({ freq: 300, slideTo: 420, dur: 0.1, type: 'triangle', vol: 0.2 })
      log('grodan', 'korvTunga', {})
      return
    }
    this._svarm.fanga(ins)
    ctx.services.audio.tone({ freq: 880, slideTo: 1320, dur: 0.07, type: 'sine', vol: 0.16 })
    if (ins.typ === 'humla') this._startaHumla(ctx, ins)
  },

  _at(ctx, ins) {
    if (!ins || ins.dod) return
    if (ins.korv) {
      this._taKorv(ctx, ins)
      return
    }
    const g = this._groda
    const audio = ctx.services.audio
    this._svarm.ata(ins)
    this._atna++
    this._iMagen.push(ins.typ)
    this._bommar = 0
    this._senastAt = this._t
    g.svalj()
    const grans = this._korvar ? NASTA_KORV : FORSTA_KORV
    const fyllt = this._iMagen.length
    g.setMage(Math.min(1, fyllt / grans))
    const m = g.mun()
    sparkle(this._fx, m.x, m.y, { count: ins.sallsynt ? 14 : 6 })
    if (ins.sallsynt) burst(this._fx, m.x, m.y, { count: 16, colors: [0xffd84a, 0xfff2a8, 0xf5b83a], power: 0.8 })
    if (!audio.sample('svalj')) audio.tone({ freq: 330, slideTo: 150, dur: 0.18, type: 'sine', vol: 0.26 })
    // Skalan klättrar mot toppen när magen blir full — oavsett om det är 8 eller 5 insekter.
    const steg = Math.min(7, Math.round(((Math.min(fyllt, grans) - 1) * 7) / Math.max(1, grans - 1)))
    audio.tone({ freq: SKALA[steg] * 2, dur: 0.12, type: 'triangle', vol: 0.14, delay: 0.12 })
    this._dammen.grodungar.kvack(steg)
    log('grodan', 'at', { typ: ins.typ, atna: this._atna, magen: fyllt })

    const voice = ctx.services.voice
    // Full mage: korven kommer när grodan fått fotfäste (_bajsUppdatera). Repet kan bära flera
    // insekter förbi gränsen — de hamnar i samma korv.
    if (fyllt >= grans) {
      this._bajsDags = true
      return
    }
    if (ins.sallsynt && !voice.talar) voice.say('Oj, en guldfluga!')
    else if (!this._korvar && fyllt === grans - 2) ctx.narTyst(() => this._alive && !this._firar && voice.say('Magen är nästan full!'))
    else if ((this._atna === 1 || Math.random() < 0.35) && !voice.talar) voice.say('Mums! En fluga till!')
  },

  // ── Bajsloopen ─────────────────────────────────────────────────────────────────────────

  // Tungan nollställs (hopp, hem, runda slut): en korv som var på väg in på tungan får inte
  // bli hängande i luften — den blir en fri korv där den är.
  _nollaTunga() {
    this._tunga?.nollstall()
    for (const k of this._bajs?.lista || []) if (k.lage === 'tunga') this._bajs.tappa(k, 0, 0)
  },

  // Full mage: vänta tills grodan sitter eller flyter (högst 6 s), krysta, och ploppa ut korven.
  _bajsUppdatera(ctx, dtS) {
    const g = this._groda
    if (this._kryst) {
      this._kryst.t += dtS
      if (this._kryst.t >= 0.95) {
        this._kryst = null
        this._plopp(ctx)
      }
      return
    }
    if (!this._bajsDags || this._firar || this._bajs.fullt) return
    this._bajsVantat += dtS
    const lugn = (g.lage === 'sitt' || g.lage === 'vatten') && !this._ladd && !this._super && !g.superFas && this._tunga.lage === 'av'
    if (!lugn && this._bajsVantat < 6) return
    this._bajsVantat = 0
    this._kryst = { t: 0 }
    g.krysta(0.95)
    const audio = ctx.services.audio
    // Ett ansträngt, stigande "nnnngh" i tre små tag.
    for (let i = 0; i < 3; i++) audio.tone({ freq: 175 + i * 22, slideTo: 205 + i * 22, dur: 0.22, type: 'triangle', vol: 0.12, delay: i * 0.27 })
    if (!this._korvar && !ctx.services.voice.talar) ctx.services.voice.say('Oj! Grodan måste bajsa!')
    log('grodan', 'krystar', { magen: this._iMagen.length })
  },

  _plopp(ctx) {
    const g = this._groda
    if (!g) return
    const audio = ctx.services.audio
    const k = g.b.kropp
    const fx = Math.cos(k.angle)
    const fy = Math.sin(k.angle)
    // Bakänden: kroppens lokala −x (lokal +x pekar mot huvudet åt båda hållen grodan tittar).
    const x = k.position.x - fx * 46
    const y = k.position.y - fy * 46 + 6
    const kost = this._iMagen
    this._iMagen = []
    this._bajsDags = false
    g.setMage(0)
    const korv = this._bajs.skapa(x, y, kost, -fx * 2.2 + k.velocity.x, -1.4 + k.velocity.y)
    if (!korv) return
    this._korvar++
    this._senastBajsT = this._t
    if (!audio.sample('fart')) audio.tone({ freq: 120, slideTo: 80, dur: 0.35, type: 'sawtooth', vol: 0.12 })
    ctx.later(0.3, () => this._alive && !audio.sample('plopp') && audio.tone({ freq: 520, slideTo: 260, dur: 0.12, type: 'sine', vol: 0.2 }))
    puff(this._fx, x, y, { count: 7, color: 0xd9c9a6 })
    audio.tone({ freq: 523, slideTo: 392, dur: 0.24, type: 'triangle', vol: 0.12, delay: 0.35 }) // grodans lättade suck
    this._dammen.grodungar.heja()
    const voice = ctx.services.voice
    if (korv.guld && !voice.talar) voice.say('En guldbajs!')
    else if (this._korvar === 1) ctx.narTyst(() => this._alive && !this._firar && korv.lage === 'fri' && !this._bar && voice.say('Ta bajskorven med tungan!'))
    log('grodan', 'bajs', { leder: kost.length, typer: [...new Set(kost)].join(','), nr: this._korvar })
  },

  // Korven är framme i munnen: grodan bär den, och de omatade ungarna längtar.
  _taKorv(ctx, k) {
    this._bajs.iMun(k)
    this._bar = k
    this._bommar = 0
    this._senastBajsT = this._t
    if (this._rep) this._rep.fangar = false
    this._dammen.grodungar.langta(true)
    const audio = ctx.services.audio
    audio.tone({ freq: 294, slideTo: 392, dur: 0.14, type: 'triangle', vol: 0.2 })
    audio.tone({ freq: 392, slideTo: 494, dur: 0.12, type: 'triangle', vol: 0.14, delay: 0.12 })
    if (!this._naraKoren()) {
      if (!this._bortaTipsat) {
        this._bortaTipsat = true
        ctx.narTyst(() => this._alive && !this._firar && this._bar === k && ctx.services.voice.say('Grodkören väntar där borta!'))
      }
    } else if (!this._barTipsat) {
      this._barTipsat = true
      ctx.narTyst(() => this._alive && !this._firar && this._bar === k && ctx.services.voice.say('Tryck på en grodunge, så kastar grodan bajset!'))
    }
    log('grodan', 'bar', {})
  },

  // Tryck på kören med en korv i munnen: korven flyger i en båge till ungen närmast fingret
  // (eller närmaste omatade). Siktet är gratis — det är ett småbarnsspel.
  _kasta(ctx, p) {
    const k = this._bar
    const kor = this._dammen.grodungar
    const i = kor.omatad(p.x)
    if (!k || i < 0) return
    this._bar = null
    if (this._rep) this._rep.fangar = true
    const g = this._groda
    const m = g.mun()
    g.oppnaMun(1)
    g.kvacka()
    ctx.later(0.22, () => this._alive && this._groda === g && this._tunga?.lage === 'av' && g.oppnaMun(0))
    kor.langta(false)
    kor.gapa(i, 1)
    this._bajs.kasta(k, m.x, m.y, () => kor.munVarld(i), (korv) => this._matad(ctx, korv, i))
    const audio = ctx.services.audio
    audio.tone({ freq: 440, slideTo: 880, dur: 0.16, type: 'sine', vol: 0.18 })
    if (!audio.sample('whoosh')) audio.tone({ freq: 300, slideTo: 700, dur: 0.3, type: 'sine', vol: 0.1 })
    log('grodan', 'kast', { unge: i })
  },

  _matad(ctx, k, i) {
    if (!this._alive || !this._dammen) return
    const kor = this._dammen.grodungar
    const mv = kor.munVarld(i)
    this._bajs.bort(k)
    kor.mata(i, k.farg)
    this._matade++
    this._senastBajsT = this._t
    sparkle(this._fx, mv.x, mv.y, { count: 10 })
    if (k.guld) burst(this._fx, mv.x, mv.y, { count: 16, colors: [0xffd84a, 0xfff2a8, 0xf5b83a], power: 0.8 })
    log('grodan', 'matad', { unge: i, matade: this._matade })
    const voice = ctx.services.voice
    if (this._matade >= UNGAR) {
      // Sista ungen tuggar klart (1 s) innan finalen börjar.
      this._firar = true
      this._hinder.avsluta()
      ctx.later(1.25, () => this._alive && this._mal(ctx))
      return
    }
    if (this._matade === 1 && !voice.talar) voice.say('Mums, sa grodungen!')
    else if (this._matade === 2) ctx.narTyst(() => this._alive && !this._firar && voice.say('Två mätta grodungar! En kvar!'))
  },

  _bom(ctx, x, y) {
    this._bommar++
    ctx.services.audio.tone({ freq: 380, slideTo: 820, dur: 0.15, type: 'sine', vol: 0.18 })
    this._svarm.skramma(x, y, 120)
    if (this._bommar >= 5 && this._t - this._senastAt > 12) this._autohjalp()
  },

  _tungVatten(ctx, x, y) {
    this._bommar++
    this._dammen.plask(x, 0.35)
    // I den stora dammen (L4) ska man kunna SIMMA dit man vill: en groda som flyter och trycker
    // ned i vattnet tar ett simtag åt det hållet (ingen annan väg framåt kräver något att fastna i).
    const g = this._groda
    if (g?.lage === 'vatten' && !this._super) {
      const d = Math.sign(x - g.pos.x) || g.riktning
      if (d !== g.riktning) g.vand()
      g.knuffa(d * 4.4, -0.8, 0.7)
      g.simtag(d)
    }
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.tone({ freq: 520, slideTo: 260, dur: 0.12, type: 'sine', vol: 0.2 })
    if (this._bommar >= 5 && this._t - this._senastAt > 12) this._autohjalp()
  },

  // ── Humlan: en insekt med massa som drar i tungan ─────────────────────────────────────

  _startaHumla(ctx, ins) {
    const r = 16
    const massa = this._groda.massa * 0.5
    const body = this._phys.circle(ins.x, ins.y, r, {
      density: massa / (Math.PI * r * r),
      frictionAir: 0.04,
      collisionFilter: { group: 0, category: 0x0002, mask: 0 },
      label: 'humla',
    })
    body.plugin = body.plugin || {}
    body.plugin.hallFast = true
    this._humla = { ins, body, tid: 0, trott: false, dir: -Math.PI / 2 + rnd(-0.8, 0.8) }
    this._tunga.fastPa(body)
    this._groda.lage = 'dingla'
    if (!ctx.services.audio.sample('djur_bi')) ctx.services.audio.tone({ freq: 180, dur: 0.4, type: 'sawtooth', vol: 0.08 })
    if (!ctx.services.voice.talar) ctx.services.voice.say('En humla! Den drar i tungan!')
  },

  _humlaSteg() {
    const h = this._humla
    if (!h) return
    const b = h.body
    const tunga = this._tunga
    if (tunga.body !== b) {
      // Tungan släpptes — humlan flyger fri igen.
      this._phys.removeBody(b)
      if (!h.ins.dod) {
        h.ins.fangad = false
        this._svarm.slapp(h.ins)
      }
      this._humla = null
      return
    }
    h.tid++
    const antiG = b.mass * this._phys.engine.gravity.y * 0.001
    if (!h.trott) {
      h.dir += rnd(-0.22, 0.22)
      h.dir = Math.max(-Math.PI + 0.2, Math.min(-0.2, h.dir)) // uppåt-ish
      const a = 0.4
      Body.applyForce(b, b.position, { x: (Math.cos(h.dir) * a * b.mass) / STEG2, y: (Math.sin(h.dir) * a * b.mass) / STEG2 - antiG })
      if (h.tid > 60 * 2.6) h.trott = true
    } else {
      Body.applyForce(b, b.position, { x: 0, y: -antiG * 0.55 })
      if (tunga.langd < 74) {
        tunga.nollstall()
        this._phys.removeBody(b)
        this._humla = null
        this._at(this._ctx, h.ins)
        return
      }
    }
    h.ins.x = b.position.x
    h.ins.y = b.position.y
  },

  // ── Smällar ────────────────────────────────────────────────────────────────────────────

  _small(ctx, h) {
    const g = this._groda
    if (!g || this._firar) return
    const aG = g.ar(h.a)
    const bG = g.ar(h.b)
    if (aG === bG) return
    const annan = aG ? h.b : h.a
    if (annan.label === 'wall' || annan.isSensor) return
    const hart = annan.label === 'kotte' || annan.label === 'fisk' || annan.label === 'skoldpadda' || annan.label === 'sten' || annan.label === 'anka' || annan.label === 'stock' || annan.label === 'stam' || annan.label === 'krabba' || annan.label === 'pillerbagge'
    const vilken = aG ? h.a : h.b
    const del = vilken.plugin?.grodDel || ''
    const hinder = HINDER_ETIKETT.has(annan.label)
    let fart = h.speed
    let trosk
    if (this._super || hinder) {
      // Superhoppets tumlande är meningen, och ett hinder som träffar grodan är alltid en smäll:
      // ben som tar emot har hög tröskel, huvud eller kropp in i något låg — hårda saker lägre.
      const ben = /^(fot|vad|lar)/.test(del)
      trosk = ben ? (hart ? 13 : 16) : hart ? 6.5 : 11
    } else {
      // Ett VANLIGT hopp (tapp, sats-hopp, sving) landar som vanligt (ägaren 2026-09-25: "Grodan
      // slår och tumlar för ofta vid vanliga hopp"). Fötterna och vristerna är landningsställ och
      // känner aldrig av något ("höja hitbox-detekteringen på fötterna upp mot anklarna"), och en
      // landning OVANPÅ något — med vilken del som helst — är en landning, utom ett riktigt fall
      // från högt. Bara ett rakt slag in i något från sidan eller underifrån tar ut grodan, och då
      // räknas farten LÄNGS kontaktnormalen: ett snuddande glid längs en sten är inget slag.
      // _tumlaprobe (HEAD): 4 av 60 vanliga hopp tumlade — kropp→sten, huvud→stam, underarm→bänk.
      const fotZon = del.startsWith('fot') || (del.startsWith('vad') && this._motVristen(vilken, h.x, h.y))
      if (fotZon) return
      const lem = /^(vad|lar|overarm|underarm)/.test(del)
      const under = h.y > vilken.position.y + 2
      if (under && lem) return
      fart = h.normalFart ?? h.speed
      trosk = under ? 19 : lem ? 16 : hart ? 8.5 : 12
    }
    if (fart < trosk) return
    const styrka = Math.min(1, (fart - trosk + 2) / 10)
    // Flera kroppsdelar slår i samma sten i samma ögonblick — det är EN smäll, inte åtta.
    if (this._t - (this._smallT ?? -9) < 0.6 && styrka <= (this._smallStyrka ?? 0) + 0.25) return
    this._smallT = this._t
    this._smallStyrka = styrka
    g.slappna(styrka)
    // En kotte, fisk, sköldpadda eller anka som smäller till grodan knockar ut korven ur munnen
    // (tydlig orsak, och den går att hämta igen direkt). Aldrig i superhoppet — där är tumlandet
    // meningen — och högst var TAPP_PAUS s.
    if (this._bar && hinder && styrka > 0.45 && !this._super && this._t - this._tappT > TAPP_PAUS) {
      const k = this._bar
      this._bar = null
      this._tappT = this._t
      const hv = g.b.huvud.velocity
      this._bajs.tappa(k, hv.x * 0.6 + (Math.random() - 0.5) * 3, Math.min(-3, hv.y * 0.5 - 3))
      this._dammen.grodungar.langta(false)
      if (!ctx.services.voice.talar) {
        this._hoppsanT = this._t
        ctx.services.voice.say('Hoppsan! Bajset trillade ut!')
      }
      log('grodan', 'tappade', { mot: annan.label })
    }
    if (del === 'huvud' || styrka > 0.6) g.yr(1.2 + styrka)
    puff(this._fx, h.x, h.y, { count: 6, color: 0xfff4c8 })
    if (!ctx.services.audio.sample(styrka > 0.5 ? 'traff_hard' : 'traff_mjuk')) {
      ctx.services.audio.tone({ freq: 200, slideTo: 120, dur: 0.12, type: 'triangle', vol: 0.22 })
    }
    this._dammen.grodungar.heja()
    // Superhoppets tumlande är meningen, inte en olycka — där säger ingen "hoppsan".
    if (!this._super && this._t - this._hoppsanT > 12 && !ctx.services.voice.talar) {
      this._hoppsanT = this._t
      ctx.services.voice.say('Hoppsan! Grodan tumlade runt!')
    }
    log('grodan', 'small', { mot: annan.label, del, fart: Math.round(fart) })
  },

  // Ligger kontaktpunkten på underbenets nedre halva, mot vristen? Underbenets lokala +x är
  // vristen (LEDER: fotleden sitter på vadens pa [19, 0]) åt båda hållen — speglingen negerar bara y.
  _motVristen(vad, x, y) {
    const a = vad.angle
    return (x - vad.position.x) * Math.cos(a) + (y - vad.position.y) * Math.sin(a) > -4
  },

  // ── Insekterna ─────────────────────────────────────────────────────────────────────────

  // Lätt fluga inom räckhåll från där grodan är nu.
  _spawnaLatt() {
    const g = this._groda
    const m = g.mun()
    const v = this._vyNu
    const hx = Math.max(160, Math.min(VARLD_B - 160, m.x + g.riktning * rnd(90, 200)))
    const hy = Math.max(v.top + 140, Math.min(YT_Y - 150, m.y - rnd(150, 240)))
    const fran = Math.random() < 0.5 ? v.left - 60 : v.right + 60
    const typ = this._svarm.skymning && Math.random() < 0.5 ? 'eldfluga' : 'fluga'
    return this._svarm.spawn(typ, { x: fran, y: v.top + rnd(120, 300), hem: { x: hx, y: hy, r: 90 } })
  },

  // En insekt någonstans i dammen — typen följer hur långt barnet kommit.
  _spawnaNagon() {
    const a = this._atna
    let typ = 'fluga'
    if (a >= 2) {
      // Biomens insekter (L5): vinterns flugor, forsens trollsländor, skogens fjärilar och humlor.
      // I skymningen blir myggorna eldflugor, som förut.
      const pool = (this._biom?.insekter || ['fluga', 'fjaril', 'trollslanda', 'mygga']).map((t) => (t === 'mygga' && this._svarm.skymning ? 'eldfluga' : t))
      typ = valj(pool)
    }
    if (!this._humlaKom && a >= 3 && a <= 6 && Math.random() < 0.45 && ['damm', 'fors', 'skog', 'trask', 'strand'].includes(this._biomNamn)) {
      typ = 'humla'
      this._humlaKom = true
    }
    if (this._guldRunda && !this._guldKom && a >= 3 && Math.random() < 0.5) {
      typ = 'guldfluga'
      this._guldKom = true
    }
    // Hem: högt uppe eller långt bort — de svåra insekterna kräver att grodan tar sig dit. I den
    // stora världen (L4) bor hälften i det barnet ser och hälften någonstans i dammen, och av de
    // högt flygande sätter sig hälften uppe bland trädens grenar — något att klättra efter.
    const hoga = typ === 'fjaril' || typ === 'trollslanda' || typ === 'guldfluga' || Math.random() < 0.4
    const m = this._groda.mun()
    const v = this._vyNu
    const iBild = Math.random() < 0.5
    let hem = null
    // Andra halvan: helst ett hem UTOM räckhåll från där grodan sitter nu.
    for (let forsok = 0; forsok < 8; forsok++) {
      const uppe = hoga && Math.random() < 0.5
      hem = {
        x: iBild ? rnd(Math.max(200, v.left + 120), Math.min(VARLD_B - 200, v.right - 120)) : rnd(200, VARLD_B - 200),
        y: uppe ? rnd(-470, -80) : hoga ? rnd(170, 250) : rnd(230, YT_Y - 120),
        r: typ === 'trollslanda' ? 200 : typ === 'fjaril' || typ === 'grashoppa' ? 150 : 110,
      }
      if (a < 4 || Math.hypot(hem.x - m.x, hem.y - m.y) > RACKVIDD + 40) break
    }
    const fran = hem.x < (v.left + v.right) / 2 ? v.left - 70 : v.right + 70
    const ins = this._svarm.spawn(typ, { x: fran, y: Math.max(v.top + 80, Math.min(hem.y, YT_Y - 150)), hem })
    if (typ === 'guldfluga' && !this._ctx.services.voice.talar) this._ctx.services.voice.say('Oj, en guldfluga!')
    return ins
  },

  _skotsel() {
    if (this._firar) return
    const m = this._groda.mun()
    const lista = this._svarm.lista
    // Räkna på insektens HEM, inte var den är just nu: en fluga som är på väg in utifrån är
    // redan "nära" — annars spawnades en ny var 0,6 s tills den första hunnit fram.
    const lattNara = lista.some((i) => {
      if (i.typ !== 'fluga' && i.typ !== 'tjockfluga' && i.typ !== 'eldfluga') return false
      const h = i.hem || i
      return Math.hypot(h.x - m.x, h.y - m.y) < RACKVIDD - 60
    })
    // Första halvan: alltid en lätt fluga inom räckhåll (även en 3-åring får sitt GULP).
    // Andra halvan: insekterna sätter sig där grodan måste TA SIG dit — hoppa, svinga, dra
    // stocken närmare. Hjälpen kommer då först efter bommar eller lång tid (_autohjalp).
    if (!lattNara && lista.length < 6 && this._atna < 4) {
      this._spawnaLatt()
      return
    }
    const mal = Math.min(5, 3 + Math.floor(this._atna / 3))
    if (lista.length < mal) this._spawnaNagon()
    // Inget händer på länge (barnet hoppar bara, eller siktar ingenstans): hjälpen kommer, sent.
    const senast = Math.max(this._senastAt, this._senastBajsT)
    if (this._t - senast > 25 && this._t - (this._hjalpT ?? -99) > 25) this._autohjalp()
  },

  // Efter fyra bommar i rad: en tjock, trött fluga sjunker ned framför grodan.
  _autohjalp() {
    this._bommar = 0
    this._hjalpT = this._t
    const g = this._groda
    // En korv som ligger och väntar: vattnet för den långsamt mot grodan, och den glittrar.
    const fri = this._bajs.fria[0]
    if (!this._bar && fri) {
      this._bajs.hjalp(fri, g.pos.x)
      log('grodan', 'autohjalp', { korv: true })
      return
    }
    // Grodan vid kanten (i vassen, mot väggen): den vänder och hoppar ut av sig själv.
    if (Math.min(g.pos.x, VARLD_B - g.pos.x) < 200 && g.kanHoppa && !this._super) {
      this._nollaTunga()
      if (g.hoppa(this._bortFranKanten(g))) {
        this._ctx.services.audio.tone({ freq: 240, slideTo: 560, dur: 0.14, type: 'triangle', vol: 0.22 })
        puff(this._fx, g.pos.x, g.pos.y + 30, { count: 6, color: 0xd9f0c0 })
        log('grodan', 'autohjalp', { kanten: true })
      }
    }
    // Grodan bär en korv men kören är långt bort: kameran visar vägen (pilen pulsar).
    if (this._bar) {
      if (!this._naraKoren()) this._visaKoren(this._ctx)
      return
    }
    const m = g.mun()
    const hem = { x: Math.max(150, Math.min(VARLD_B - 150, m.x + g.riktning * 130)), y: Math.max(this._vyNu.top + 120, Math.min(YT_Y - 110, m.y - 110)), r: 40 }
    const finns = this._svarm.lista.find((i) => i.typ === 'tjockfluga')
    if (finns) this._svarm.setHem(finns, hem)
    else this._svarm.spawn('tjockfluga', { x: hem.x + rnd(-80, 80), y: 40, hem })
    log('grodan', 'autohjalp', {})
  },

  // ── Målet ──────────────────────────────────────────────────────────────────────────────

  _mal(ctx) {
    this._firar = true
    this._hinder.avsluta()
    const g = this._groda
    const audio = ctx.services.audio
    ctx.later(0.2, () => {
      if (!this._alive || !this._groda) return
      // Mitt i ett superhopp: repet släpper det det bär och grodan kommer på benen direkt.
      if (this._super || g.superFas) {
        this._rep?.destroy()
        this._rep = null
        this._super = null
        this._ladd = null
        g.laddaAvbryt()
        g.vakna(g.riktning)
      }
      this._nollaTunga()
      // 1. Tre mätta rapar: varje unge blåser en bubbelring i färgen på sin korv, en i taget.
      const kor = this._dammen.grodungar
      for (let i = 0; i < UNGAR; i++) {
        ctx.later(0.28 * i, () => {
          if (!this._alive || !this._dammen) return
          const m = kor.rap(i)
          if (m) this._ringar.push({ x: m.x, y: m.y - 6, r: 6, t: 0, fart: 170, skala: 0.45, farg: kor.magfarg(i) })
          if (m) puff(this._fx, m.x, m.y - 6, { count: 3, color: 0xdff4ff })
        })
      }
      // …och grodan svarar med en jätterap som rullar ut över dammen.
      ctx.later(0.95, () => {
        if (!this._alive || !this._groda) return
        g.oppnaMun(1)
        g.kvacka()
        const m = g.mun()
        this._ringar.push({ x: m.x, y: m.y, r: 10, t: 0, fart: 420, skala: 1, farg: 0xe8f7ff })
        for (let i = 0; i < 9; i++) {
          audio.tone({ freq: 104 + (i % 3) * 6, dur: 0.07, type: 'triangle', vol: 0.3, delay: i * 0.055 })
        }
        audio.tone({ freq: 150, slideTo: 70, dur: 0.5, type: 'sine', vol: 0.3, delay: 0.1 })
        for (let i = 0; i < 6; i++) puff(this._fx, m.x + g.riktning * 20, m.y - 10, { count: 3, color: 0xdff4ff })
      })
    })
    ctx.later(2.1, () => {
      if (!this._alive || !this._groda) return
      g.oppnaMun(0)
      // 2. Magplask: ett högt hopp rakt upp mot vattnet.
      g.kraft = 1
      g.knuffa(g.riktning * 1.5, -13.5, 1)
      this._magplask = true
      audio.tone({ freq: 220, slideTo: 660, dur: 0.3, type: 'triangle', vol: 0.22 })
    })
    ctx.later(3.7, () => {
      if (!this._alive || !this._groda) return
      // 3. Grodkören + grodans egen replik FÖRE complete().
      ctx.services.voice.say('Alla grodungar är mätta! Kvack kvack!')
      const dur = this._dammen.grodungar.kor() || 2.2
      if (!audio.sample('djur_groda')) audio.tone({ freq: 140, slideTo: 110, dur: 0.3, type: 'triangle', vol: 0.3 })
      for (let i = 0; i < 4; i++) ctx.later(0.5 * i, () => this._alive && this._groda?.kvacka())
      ctx.later(dur + 0.2, () => {
        if (!this._alive) return
        ctx.progress.complete()
        ctx.later(3.2, () => ctx.narTyst(() => this._nyRunda(ctx)))
      })
    })
  },

  _nyRunda(ctx) {
    if (!this._alive) return
    const rot = this._kam.root
    gsap.killTweensOf(rot)
    gsap.to(rot, {
      alpha: 0,
      duration: 0.35,
      onComplete: () => {
        if (!this._alive || rot.destroyed) return
        this._rivVarld()
        this._byggVarld(ctx)
        gsap.to(rot, { alpha: 1, duration: 0.4 })
        ctx.narTyst(() => this._alive && ctx.services.voice.say(this.voiceIntro))
        this._sagBiom(ctx)
      },
    })
  },

  // ── Per bildruta ───────────────────────────────────────────────────────────────────────

  _update(ctx, ticker) {
    if (!this._alive || !this._phys) return
    const dtS = Math.min(0.05, ticker.deltaMS / 1000)
    this._t += dtS
    const t = this._t
    const g = this._groda
    const voice = ctx.services.voice

    // Vinden (hinder) blåser på insekterna och på en groda i luften.
    const vind = this._hinder.vind
    this._svarm.setVind(vind * 160)
    this._phys.setWind(g.paMark ? 0 : (vind * 0.07) / STEG2, 0)

    this._dammen.steg(t)
    this._phys.update(ticker.deltaMS)
    // Kameran efter fysiken (samma bildruta), och den synliga världsytan som allt annat läser.
    this._kamMalUppdatera()
    this._kam.update(ticker.deltaMS)
    this._vyUppdatera()

    this._laddUppdatera(ctx, dtS)
    this._superUppdatera(ctx)
    this._hemUppdatera(ctx, dtS)
    this._bajsUppdatera(ctx, dtS)

    g.rita(dtS)
    this._tunga.rita()
    this._rep?.rita(dtS)
    this._svarm.uppdatera(dtS, t)
    this._dammen.rita(dtS, t)
    this._hinder.rita(dtS, t)
    const hv = g.b.huvud
    this._bajs.rita(dtS, this._bar ? { ...g.mun(), vinkel: hv.angle, riktning: g.riktning } : null)
    this._ritaRingar(dtS)
    this._ritaSikt(dtS)
    this._ritaMaxGlans(dtS)
    // Kören tittar på det som angår dem: grodan med korven, en korv som ligger och väntar.
    const kor = this._dammen.grodungar
    const fri = this._bar ? null : this._bajs.fria[0]
    if (fri) kor.titta(fri.x, fri.y)
    else kor.titta(g.pos.x, g.pos.y)
    this._ritaHud(dtS)
    // Framme vid kören med korven: nu (först nu) är det dags för "tryck på en grodunge".
    if (this._bar && !this._barTipsat && this._naraKoren() && !this._firar) {
      this._barTipsat = true
      ctx.narTyst(() => this._alive && !this._firar && this._bar && voice.say('Tryck på en grodunge, så kastar grodan bajset!'))
    }

    // Grodan rymde / blev trasig → tillbaka på startbladet med en puff.
    const p = g.pos
    if (g.trasig() || p.x < -120 || p.x > VARLD_B + 120 || p.y > 800 || p.y < VARLD_TOPP - 600) {
      this._avslutaSuper()
      this._nollaTunga()
      const sp = this._dammen.startPunkt
      g.teleportera(sp.x, sp.y)
      this._startBladFast()
      this._kam.moveTo(sp.x, 360)
      this._vyUppdatera()
      puff(this._fx, sp.x, sp.y, { count: 10, color: 0xd9f0c0 })
      log('grodan', 'aterstall', {})
    }

    // Plask när grodan slår i vattnet.
    const vy = g.b.kropp.velocity.y
    if (this._fallY !== null && this._fallY < YT_Y - 4 && p.y >= YT_Y - 4 && vy > 2) {
      const styrka = Math.min(1, vy / 13 + (this._magplask ? 0.6 : 0))
      this._dammen.plask(p.x, styrka)
      puff(this._fx, p.x, YT_Y - 6, { count: Math.round(4 + styrka * 8), color: 0xcfeeff })
      if (!ctx.services.audio.sample('plopp')) ctx.services.audio.tone({ freq: 480, slideTo: 200, dur: 0.16, type: 'sine', vol: 0.24 })
      if (this._magplask) ripple(this._fx, p.x, YT_Y, { color: 0xffffff, maxR: 180, duration: 0.8, width: 8 })
      this._magplask = false
    }
    this._fallY = p.y

    // Landning på ett blad: bladet gungar. På en studsig möbel (gelén, soffan, puffen, parasollet)
    // darrar den, och det säger boing.
    const paMark = g.paMark
    if (paMark && !this._varPaMark && g.underlag?.label === 'blad') this._dammen.bladTryck(g.underlag, Math.min(1, Math.abs(vy) / 8 + 0.3))
    if (paMark && !this._varPaMark && g.underlag?.label === 'svamp') {
      const m = this._dammen.mobler.find((o) => o.body === g.underlag)
      this._dammen.mobelTryck(g.underlag, Math.min(1, Math.abs(vy) / 8 + 0.3))
      if (m && m.studs >= 0.4 && Math.abs(vy) > 2.5) ctx.services.audio.tone({ freq: 220, slideTo: 440 + 200 * m.studs, dur: 0.16, type: 'sine', vol: 0.14 })
    }
    // Öknen (L6): HET SAND — sitter grodan på sanden trippar den.
    if (this._biom?.het) this._hetSand(ctx, dtS)
    if (paMark && !this._varPaMark && this._magplask && g.underlag?.label !== 'blad') this._magplask = false
    this._varPaMark = paMark

    // Munnen äter själv: en groda som far genom luften (hopp, sving, slungad av tungan) med
    // en insekt i vägen gapar och sväljer den — utan tunga. Så kan ett vilt hopp bli ett GULP.
    // Med en korv i munnen studsar insekten av i stället ("mmf").
    if (!this._firar && this._bar && g.fart > 2) {
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, 40)
      if (ins && this._t - this._mmfT > 0.6) {
        this._mmfT = this._t
        this._svarm.skramma(m.x, m.y, 60)
        ctx.services.audio.tone({ freq: 220, slideTo: 180, dur: 0.12, type: 'triangle', vol: 0.18 })
        if (!this._mmfSagt && !voice.talar) {
          this._mmfSagt = true
          voice.say('Mmf! Munnen är full!')
        }
      }
    }
    if (!this._firar && !this._bar && this._tunga.lage !== 'bar' && (g.lage === 'luft' || g.lage === 'dingla' || g.lage === 'slak') && g.fart > 3.5) {
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, 46)
      if (ins && ins.typ !== 'humla') {
        g.oppnaMun(1)
        this._svarm.fanga(ins)
        ins.x = m.x
        ins.y = m.y
        this._flygGulp = true
        log('grodan', 'munnen', { typ: ins.typ })
        this._at(ctx, ins)
        ctx.later(0.18, () => this._alive && this._groda === g && this._tunga?.lage === 'av' && g.oppnaMun(0))
      }
    }
    if (!this._firar && this._super && !this._super.uppe && g.lage === 'super') this._superAta(ctx)

    // Blicken: närmaste insekt när tungan vilar (under satsen tittar grodan dit den ska hoppa).
    if (this._tunga.lage === 'av' && !this._ladd) {
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, 600)
      if (ins) g.tittMal = { x: ins.x, y: ins.y }
    }

    // Grodan i vattnet utan att barnet gör något: simma till närmaste blad och hoppa upp.
    if (g.lage === 'vatten' && !this._tunga.fast && !this._firar) {
      this._vattenTid += dtS
      if (this._vattenTid > 3.5 && this._idle > 2.5) this._simHem(dtS)
    } else this._vattenTid = 0

    // Insekterna sköts var 0,6 s.
    this._skotselKlocka += dtS
    if (this._skotselKlocka > 0.6) {
      this._skotselKlocka = 0
      this._skotsel()
    }

    // Motgången: EN åt gången, först efter två insekter, var 10–15 s.
    if (!this._firar && this._atna >= 2) {
      if (!this._hinder.aktiv) this._hinderKlocka += dtS
      if (this._hinderKlocka > this._nastaHinder) {
        this._hinderKlocka = 0
        this._nastaHinder = rnd(10, 15)
        this._startaHinder(ctx)
      }
    }

    // Grodan kvackar ibland av sig själv när den sitter.
    this._kvackKlocka -= dtS
    if (this._kvackKlocka <= 0 && g.lage === 'sitt' && !this._firar && !this._ladd) {
      this._kvackKlocka = rnd(12, 20)
      g.kvacka()
      if (!voice.talar) this._kvackLjud(ctx, 0.6)
    }

    // Idle: en mjuk om-cue + en ring som visar var en insekt finns.
    if (voice.talar) this._idle = 0
    this._idle += dtS
    if (this._idle > 6.5 && !this._firar && (this._bar || this._bajs.fria.length)) {
      // Bajsloopen går före: det barnet ska göra NU är att hämta eller lämna korven.
      this._idle = 0
      if (this._bar && !this._naraKoren()) {
        voice.say('Grodkören väntar där borta!')
        this._korPil.puls = 1
        this._dammen.grodungar.heja()
      } else if (this._bar) {
        voice.say('Tryck på en grodunge, så kastar grodan bajset!')
        const k = this._dammen.grodungar.plats
        ripple(this._fx, k.x, k.y - 34, { color: 0xffffff, maxR: 110, duration: 0.8, width: 6 })
        this._dammen.grodungar.heja()
      } else {
        voice.say('Ta bajskorven med tungan!')
        const k = this._bajs.fria[0]
        ripple(this._fx, k.x, k.y, { color: 0xffffff, maxR: 80, duration: 0.7, width: 5 })
      }
    } else if (this._idle > 6.5 && !this._firar) {
      this._idle = 0
      const cues = ['Tryck där tungan ska fastna! Fånga flugorna!', 'Tryck på grodan, så hoppar den!', 'Håll kvar fingret på grodan för ett superhopp!', 'Prova att fastna i grenen!']
      const replik = cues[this._cueIdx++ % cues.length]
      if (replik === 'Tryck där tungan ska fastna! Fånga flugorna!') voice.say('Tryck där tungan ska fastna! Fånga flugorna!')
      else if (replik === 'Tryck på grodan, så hoppar den!') voice.say('Tryck på grodan, så hoppar den!')
      else if (replik === 'Håll kvar fingret på grodan för ett superhopp!') voice.say('Håll kvar fingret på grodan för ett superhopp!')
      else voice.say('Prova att fastna i grenen!')
      const m = g.mun()
      const ins = this._svarm.narmast(m.x, m.y, RACKVIDD)
      if (ins) ripple(this._fx, ins.x, ins.y, { color: 0xffffff, maxR: 70, duration: 0.7, width: 5 })
    }
  },

  _startaHinder(ctx) {
    const pool = [...(this._biom?.hinder || ['kotte', 'kotte', 'skoldpadda', 'fisk', 'vind'])]
    if (this._biom?.anka !== false && !this._ankaKom && Math.random() < 0.18) pool.push('anka', 'anka', 'anka')
    let typ = valj(pool)
    if (typ === this._senasteHinder) typ = valj(pool)
    this._senasteHinder = typ
    const h = this._hinder.starta(typ, this._groda.pos.x)
    if (!h) return
    const audio = ctx.services.audio
    if (typ === 'anka') {
      this._ankaKom = true
      if (!audio.sample('djur_anka')) audio.tone({ freq: 500, slideTo: 380, dur: 0.18, type: 'square', vol: 0.1 })
    } else if (typ === 'vind') {
      if (!audio.sample('whoosh')) audio.tone({ freq: 300, slideTo: 900, dur: 0.5, type: 'sine', vol: 0.12 })
    } else if (typ === 'kotte' || typ === 'snoboll') {
      audio.tone({ freq: typ === 'snoboll' ? 700 : 900, slideTo: 600, dur: 0.12, type: 'triangle', vol: 0.1 })
    } else if (typ === 'katt') {
      if (!audio.sample('djur_katt')) audio.tone({ freq: 600, slideTo: 420, dur: 0.3, type: 'triangle', vol: 0.12 })
    } else if (typ === 'badanka') {
      audio.tone({ freq: 880, slideTo: 700, dur: 0.12, type: 'square', vol: 0.06 })
      audio.tone({ freq: 880, slideTo: 700, dur: 0.12, type: 'square', vol: 0.06, delay: 0.16 })
    } else if (typ === 'badboll' || typ === 'leksaksboll' || typ === 'buskboll' || typ === 'apelsin') {
      if (!audio.sample('boing')) audio.tone({ freq: 300, slideTo: 620, dur: 0.18, type: 'sine', vol: 0.12 })
    } else if (typ === 'krabba' || typ === 'pillerbagge') {
      for (let i = 0; i < 4; i++) audio.tone({ freq: 1300 + (i % 2) * 200, dur: 0.03, type: 'square', vol: 0.04, delay: i * 0.09 })
    } else if (typ === 'mas' || typ === 'pappersflygplan' || typ === 'vag' || typ === 'sandvind' || typ === 'flakt' || typ === 'anga') {
      if (!audio.sample('whoosh')) audio.tone({ freq: 300, slideTo: 900, dur: 0.5, type: 'sine', vol: 0.12 })
    } else if (typ === 'gasbubbla') {
      audio.tone({ freq: 90, slideTo: 140, dur: 0.5, type: 'sine', vol: 0.12 })
    }
    log('grodan', 'hinder', { typ })
  },

  // Öknens heta sand: en groda som sitter på sanden står inte still — efter 1,3 s trippar den till
  // (ett litet skutt, ett tripp-tripp) och en gång ibland "Aj, varm sand!". Klipporna och
  // kaktusarmarna är svala (öknen har inget vatten sedan 2026-09-25). Motgång som bara saktar ned (P0): inget går förlorat, och
  // tungan fungerar mitt i tripp-tripp.
  _hetSand(ctx, dtS) {
    const g = this._groda
    const paSand = g.paMark && g.lage === 'sitt' && g.underlag?.label === 'strand' && !this._ladd && !this._super && !g.superFas && this._tunga.lage === 'av' && !this._firar && !this._kryst
    if (!paSand) {
      this._hetT = 0
      return
    }
    this._hetT = (this._hetT || 0) + dtS
    if (this._hetT < 1.3) return
    this._hetT = 0
    g.knuffa(g.riktning * rnd(-0.5, 0.9), -4.4, 0.7)
    const audio = ctx.services.audio
    audio.tone({ freq: 1180, slideTo: 1400, dur: 0.05, type: 'sine', vol: 0.1 })
    audio.tone({ freq: 1320, slideTo: 1560, dur: 0.05, type: 'sine', vol: 0.1, delay: 0.1 })
    puff(this._fx, g.pos.x, g.pos.y + 34, { count: 4, color: 0xf2d9a0 })
    const voice = ctx.services.voice
    if (!voice.talar && this._t - (this._aiT ?? -99) > 14) {
      this._aiT = this._t
      voice.say('Aj, varm sand!')
    }
    log('grodan', 'hetSand', {})
  },

  _simHem(dtS) {
    const g = this._groda
    const blad = this._dammen.landningar ? this._dammen.landningar() : this._dammen.blad
    if (!blad?.length) return
    let bast = null
    let bastD = Infinity
    for (const b of blad) {
      // Sikta på bladets KANT på grodans sida, inte under bladet.
      const kant = b.x + Math.sign(g.pos.x - b.x || 1) * (b.bredd / 2 + 46)
      const d = Math.abs(kant - g.pos.x)
      if (d < bastD) {
        bastD = d
        bast = { x: kant, blad: b }
      }
    }
    if (!bast) return
    const dir = Math.sign(bast.x - g.pos.x) || 1
    if (bastD < 40) {
      const mot = Math.sign(bast.blad.x - g.pos.x) || 1
      if (g.riktning !== mot) g.vand()
      g.hoppa(mot)
      this._vattenTid = 0
      return
    }
    if (g.riktning !== dir && Math.random() < 0.05) g.vand()
    this._simKlocka += dtS
    if (this._simKlocka > 0.8) {
      this._simKlocka = 0
      g.simtag(dir)
    }
  },

  // Hoppets riktning: dit grodan tittar — utom vid kanten, där den hoppar in mot dammen.
  _bortFranKanten(g) {
    if (g.pos.x < 200 && g.riktning < 0) return 1
    if (g.pos.x > VARLD_B - 200 && g.riktning > 0) return -1
    return g.riktning
  },

  // ── Kameran och HUD:en (L4) ────────────────────────────────────────────────────────────

  // Den synliga världsytan just nu (kamerans mitt ± vyn, med telefonens bleed via ctx.view).
  // Ett och samma objekt skrivs om varje bildruta — insekterna och hindren läser det.
  _vyUppdatera() {
    const k = this._kam
    if (!k) return
    const v = this._ctx?.view
    const ox = k.x - 640
    const oy = k.y - 360
    const o = this._vyNu
    o.left = ox + (Number.isFinite(v?.left) ? v.left : 0)
    o.right = ox + (Number.isFinite(v?.right) ? v.right : 1280)
    o.top = oy + (Number.isFinite(v?.top) ? v.top : 0)
    o.bottom = oy + (Number.isFinite(v?.bottom) ? v.bottom : 720)
  },

  // ENVÄGSGRENAR (L4): en gren (eller ett näckrosblad) är fast för grodan bara när grodan är
  // ovanför den — underifrån svingar och drar tungan grodan rakt igenom. Bladen fick samma regel
  // när en groda simmade in UNDER ett blad och flytkraften höll den där i 9 minuter (varje skott
  // åt sidan fastnade i bladets undersida, _bajsloopprobe L4): nu flyter den upp genom bladet och
  // landar på det. Grenarna sticker ut ur samma
  // stam rakt över varandra, och en groda som tungan drog mot grenen ovanför stannade annars
  // stående på grenen under (_klatterprobe: 0 av 4 nådde mellangrenen). Ovanifrån landar grodan
  // och kan sitta på grenen som förut. Ett fast fysiksteg i taget, i grenens egen (lutande) ram.
  _envagsgrenar() {
    const g = this._groda
    if (!g || !this._grenar) return
    const k = g.b.kropp.position
    for (const b of this._grenar) {
      const a = -b.angle
      const sa = Math.sin(a)
      const ca = Math.cos(a)
      const ly = (p) => sa * (p.x - b.position.x) + ca * (p.y - b.position.y)
      const pl = b.plugin || (b.plugin = {})
      const halv = pl.envagHalv || 13
      if (this._t < (this._slappGrenar || 0) && b.label === 'gren') {
        // Grodan hoppar ned (_hoppaNed): alla grenar släpper igenom en stund.
        pl.envagFast = false
      } else if (pl.envagFast) {
        // Fast tills grodans KROPP är nere vid/under ovansidan: då hänger eller faller den förbi,
        // inte står på den. Och drar tungan grodan NEDÅT (fästet under — barnet tryckte på bladet
        // nedanför) släpper grenen igenom den, som "ned för att hoppa av" i ett plattformsspel;
        // annars satt en groda som klättrat upp kvar i trädet.
        const t = this._tunga
        if (ly(k) > -halv || (b.label === 'gren' && t?.fast && ly(t.spets) > 20)) pl.envagFast = false
      } else {
        // Fast först när HELA grodan är ovanför — kroppen ensam räckte inte: benen hängde kvar
        // under grenen när den blev fast och krokade fast grodan underifrån (_grendiag: vad/fot →
        // gren, grodan lyfte aldrig mot toppgrenen).
        let lagst = -Infinity
        for (const d of g.delar) lagst = Math.max(lagst, ly(d.position))
        if (lagst < -(halv + 2)) pl.envagFast = true
      }
      b.collisionFilter.mask = pl.envagFast ? ALLT : ALLT & ~GRODA_KAT
    }
  },

  // Superhoppets lättning: underlaget släpper igenom grodan i LATT_STEG steg, sedan får det
  // tillbaka sin mask (envägsbladen och -grenarna sköts av _envagsgrenar i nästa steg).
  _lattaSteg() {
    const l = this._latt
    if (!l) return
    const f = l.body.collisionFilter
    if (--l.steg > 0) {
      f.mask = f.mask & ~GRODA_KAT
      return
    }
    this._latt = null
    const envag = l.body.label === 'gren' || l.body.label === 'blad' || l.body.label === 'svamp'
    if (!envag) f.mask = l.mask
  },

  // Grodan placeras SITTANDE på startbladet (start, hem, räddning) med fötterna i bladets
  // ovansida — envägsregeln hann aldrig se "hela grodan ovanför", och grodan föll igenom bladet
  // (_startbladdiag: 4 av 4 starter i vattnet). Bladet den placeras på är fast från början.
  _startBladFast() {
    if (!this._dammen?.startPaBlad) return
    const b = this._dammen?.blad?.[0]?.body
    if (b?.plugin) {
      b.plugin.envagFast = true
      b.collisionFilter.mask = ALLT
    }
  },

  // Hoppa ned ur trädet mot p: släpp tungan, ett litet skutt åt det hållet, och grenarna släpper
  // igenom grodan i 0,9 s så att den faller hela vägen (eller landar på ett blad på vägen).
  _hoppaNed(ctx, p) {
    const g = this._groda
    this._nollaTunga()
    this._slappGrenar = this._t + 0.9
    const d = Math.sign(p.x - g.pos.x) || g.riktning
    if (d !== g.riktning) g.vand()
    g.knuffa(d * 3.4, -3.2, 0.8)
    const audio = ctx.services.audio
    audio.tone({ freq: 520, slideTo: 260, dur: 0.22, type: 'triangle', vol: 0.18 })
    puff(this._fx, g.pos.x, g.pos.y + 20, { count: 5, color: 0xd9f0c0 })
    log('grodan', 'hoppaNed', { x: Math.round(p.x) })
  },

  // Kamerans mål: grodan, men lyft uppåt när den är uppe i ett träd — 0 vid vattnet (y ≥ 520),
  // fullt (110 px) från y 300 och uppåt. Mätt mot vad barnet måste SE: under den låga grenen både
  // mellangrenen ovanför och vattnet nedanför (vid 200 px lyft syntes inte vattnet, och vägen
  // ned försvann — _klatterprobe), under toppgrenen kronan och mellangrenen.
  _kamMalUppdatera() {
    const g = this._groda
    const m = this._kamMal
    if (!g || !m) return
    const p = g.pos
    const lyft = Math.max(0, Math.min(1, (520 - p.y) / 220)) * 110
    m.x = p.x
    m.y = p.y - lyft
  },

  // Är grodan i närheten av kören (så att ett tryck kastar)?
  _naraKoren() {
    const k = this._dammen?.grodungar?.plats
    const g = this._groda
    return !!k && !!g && Math.abs(g.pos.x - k.x) <= KAST_RACKVIDD
  },

  // Kören trycktes på långt bortifrån: ungarna vinkar "kom hit", ingen korv flyger.
  _korVinkar(ctx) {
    this._dammen.grodungar.heja()
    this._korPil.puls = 1
    if (!ctx.services.voice.talar) ctx.services.voice.say('Hoppa närmare grodkören!')
    log('grodan', 'korForLangt', {})
  },

  // Körpilen trycktes (eller den sena hjälpen): kameran glider bort och VISAR kören en stund,
  // sedan tillbaka till grodan. Grodan flyttas inte — barnet ser bara vart den ska.
  _visaKoren(ctx) {
    if (this._visar || !this._dammen) return
    const k = this._dammen.grodungar.plats
    this._visar = true
    this._kam.panTo(k.x, 360, { duration: 0.8 })
    this._dammen.grodungar.heja()
    ;[392, 523, 659].forEach((f, i) => ctx.services.audio.tone({ freq: f, dur: 0.1, type: 'triangle', vol: 0.14, delay: 0.3 + i * 0.12 }))
    log('grodan', 'visaKoren', {})
    ctx.later(2.2, () => {
      if (!this._alive || !this._groda || !this._kam) return
      const p = this._groda.pos
      this._kam.panTo(p.x, p.y, { duration: 0.8 })
      ctx.later(0.85, () => {
        this._visar = false
      })
    })
  },

  // HUD:en byggs EN gång (den överlever rundorna — det är skärmens, inte världens).
  _byggHud() {
    const hud = this._hud
    // HEM-BLADET: ett litet näckrosblad sett uppifrån med en grodunge som tittar upp. Det hör
    // till dammen, inte till skalet (som har sina runda-hörn-knappar i hörnen) — ägaren bad om en
    // knapp "som smälter in". Håll 2,5 s = grodan hem.
    const c = new Container()
    c.position.set(HEM_HUD.x, HEM_HUD.y)
    const inre = new Container()
    c.addChild(inre)
    const g = new Graphics()
    const r = HEM_HUD.r
    g.ellipse(3, 6, r + 1, r * 0.86).fill({ color: 0x173a1c, alpha: 0.28 })
    const pts = [0, 0]
    for (let i = 0; i <= 40; i++) {
      const a = 1.42 + ((TAU - 0.44) * i) / 40
      pts.push(Math.cos(a) * r, Math.sin(a) * r * 0.86)
    }
    g.poly(pts).fill(sphereFill(0x5aa845, { lightX: 0.35, lightY: 0.3, dark: 0.3 })).stroke({ width: 3, color: 0x3a7a2c })
    for (let i = 0; i < 7; i++) {
      const a = 1.7 + i * 0.72
      g.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.74)
    }
    g.stroke({ width: 1.5, color: 0x8fd06a, alpha: 0.6 })
    // Grodungen: huvud + två ögonkulor + ett leende.
    g.ellipse(0, 4, 21, 15).fill(sphereFill(0x7cc653, { lightX: 0.4, lightY: 0.25, dark: 0.26 }))
    for (const ex of [-10, 10]) {
      g.circle(ex, -8, 8).fill(sphereFill(0x7cc653, { lightY: 0.25 }))
      g.circle(ex, -9, 6).fill(0xffffff)
      g.circle(ex, -8.5, 3).fill(0x1d2a1a)
      g.circle(ex - 1, -10, 1.1).fill(0xffffff)
    }
    g.moveTo(-9, 7).quadraticCurveTo(0, 13, 9, 7).stroke({ width: 2, color: 0x2c5a24, cap: 'round' })
    inre.addChild(g)
    hud.addChild(c)
    const ring = new Graphics()
    hud.addChild(ring)
    this._hemHud = { c, inre, ring, wiggle: 0, hopp: 0, t: 0 }

    // KÖRPILEN: en rund bubbla med en grodunge och en spets som pekar ut mot kören.
    const pc = new Container()
    const spets = new Graphics()
    spets.poly([30, -16, 58, 0, 30, 16]).fill(0x4f9e3a).stroke({ width: 3, color: 0xffffff, join: 'round' })
    const bub = new Graphics()
    bub.circle(0, 0, 38).fill({ color: 0xffffff, alpha: 0.94 }).stroke({ width: 4, color: 0x4f9e3a })
    bub.ellipse(0, 7, 20, 14).fill(sphereFill(0x7cc653, { lightX: 0.4, lightY: 0.25, dark: 0.26 }))
    for (const ex of [-9, 9]) {
      bub.circle(ex, -5, 7).fill(sphereFill(0x7cc653, { lightY: 0.25 }))
      bub.circle(ex, -6, 5).fill(0xffffff)
      bub.circle(ex, -5.5, 2.6).fill(0x1d2a1a)
    }
    bub.ellipse(0, 12, 6, 4).fill(0x6e1f30) // gapar — den väntar på korven
    pc.addChild(spets, bub)
    pc.visible = false
    hud.addChild(pc)
    this._korPil = { c: pc, spets, bub, puls: 0, t: 0 }

    // VÄNDKNAPPEN nere till höger: en liten ljus bubbla med ett grodhuvude i profil och två
    // böjda pilar runt om. Huvudet tittar åt samma håll som grodan, och vänder sig med den.
    const vc = new Container()
    const vInre = new Container()
    vc.addChild(vInre)
    const vbg = new Graphics()
    vbg.circle(2, 4, VAND_R).fill({ color: 0x173a1c, alpha: 0.22 })
    vbg.circle(0, 0, VAND_R).fill({ color: 0xffffff, alpha: 0.8 }).stroke({ width: 3, color: 0x4f9e3a, alpha: 0.9 })
    // Två böjda pilar (polylinjer — aldrig arc(), se CLAUDE.md), en överst och en nederst.
    const pilar = new Graphics()
    const rr = VAND_R - 7
    for (const [a0, a1] of [[-2.55, -0.55], [0.59, 2.59]]) {
      const pts = []
      for (let i = 0; i <= 10; i++) {
        const a = a0 + ((a1 - a0) * i) / 10
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      pilar.moveTo(pts[0], pts[1])
      for (let i = 2; i < pts.length; i += 2) pilar.lineTo(pts[i], pts[i + 1])
      pilar.stroke({ width: 3, color: 0x4f9e3a, cap: 'round' })
      // Spetsen i bågens slut, längs tangenten.
      const tx = -Math.sin(a1)
      const ty = Math.cos(a1)
      const ex = Math.cos(a1) * rr
      const ey = Math.sin(a1) * rr
      const nx = Math.cos(a1)
      const ny = Math.sin(a1)
      pilar.poly([ex + tx * 6, ey + ty * 6, ex - tx * 2 + nx * 6, ey - ty * 2 + ny * 6, ex - tx * 2 - nx * 6, ey - ty * 2 - ny * 6]).fill(0x4f9e3a)
    }
    // Grodhuvudet i profil, nosen åt +x (ikonen speglas med grodans riktning).
    const ikon = new Container()
    const hg = new Graphics()
    hg.moveTo(-13, 7).bezierCurveTo(-15, -6, -6, -11, 3, -9).bezierCurveTo(12, -8, 15, -2, 15, 3)
      .bezierCurveTo(15, 9, 8, 11, -2, 11).bezierCurveTo(-8, 11, -12, 10, -13, 7).closePath()
      .fill(sphereFill(0x7cc653, { lightX: 0.4, lightY: 0.25, dark: 0.26 })).stroke({ width: 1.5, color: 0x2c5a24 })
    hg.circle(1, -9, 6).fill(sphereFill(0x7cc653, { lightY: 0.25 }))
    hg.circle(2, -10, 4.2).fill(0xffffff)
    hg.circle(3.6, -10, 2.2).fill(0x1d2a1a)
    hg.moveTo(4, 4).quadraticCurveTo(10, 6.5, 14, 3).stroke({ width: 1.6, color: 0x2c5a24, cap: 'round' })
    ikon.addChild(hg)
    vInre.addChild(vbg, pilar, ikon)
    hud.addChild(vc)
    this._vandKnapp = { c: vc, inre: vInre, pilar, ikon, tryck: 0, vick: 0, snurr: 0, t: 0, riktning: 1 }
  },

  // Vändknappen trycktes: grodan vänder sig (ett litet skutt om den sitter) — utan tunga.
  _vandTryck(ctx) {
    const g = this._groda
    const vk = this._vandKnapp
    const audio = ctx.services.audio
    vk.tryck = 1
    this._idle = 0
    // Mitt i ett superhopp har stjärnläget ingen sida: knappen vickar och grodan kvackar.
    if (this._super || g.superFas || g.stjarna) {
      vk.vick = 1
      g.kvacka()
      this._kvackLjud(ctx, 0.6)
      return
    }
    g.vand()
    if (g.paMark) g.knuffa(0, -2.6, 0.5)
    g.tittMal = { x: g.pos.x + g.riktning * 300, y: g.pos.y - 60 }
    g.blinka()
    vk.snurr = 1
    audio.tone({ freq: 392, slideTo: 523, dur: 0.1, type: 'triangle', vol: 0.16 })
    audio.tone({ freq: 523, slideTo: 659, dur: 0.08, type: 'triangle', vol: 0.1, delay: 0.08 })
    puff(this._fx, g.pos.x, g.pos.y + 30, { count: 3, color: 0xd9f0c0 })
    log('grodan', 'vand', { riktning: g.riktning })
  },

  _ritaHud(dtS) {
    const h = this._hemHud
    if (h && !h.c.destroyed) {
      h.t += dtS
      h.wiggle = Math.max(0, h.wiggle - dtS * 3)
      h.hopp = Math.max(0, h.hopp - dtS * 2.5)
      const hoppY = -14 * Math.sin(Math.PI * h.hopp)
      h.inre.y = 1.5 * Math.sin(h.t * 1.6) + hoppY
      h.inre.rotation = 0.03 * Math.sin(h.t * 1.1) + 0.18 * h.wiggle * Math.sin(h.t * 40)
    }
    // Vändknappen: i bildens nedre högra hörn (med telefonens bleed), dold under finalen.
    // Ikonen vänder sig genom skala 0 när grodan vänder sig (stjärnläget har ingen sida — då
    // står ikonen kvar), pilarna snurrar ett varv vid tryck, och hela knappen trycks ihop.
    const vk = this._vandKnapp
    if (vk && !vk.c.destroyed) {
      const vv = this._ctx?.view
      const sr = Number.isFinite(vv?.right) ? vv.right : 1280
      const sb = Number.isFinite(vv?.bottom) ? vv.bottom : 720
      // Står grodkören i hörnet (på stranden sitter den nära land, alltså ofta där) glider knappen
      // upp ovanför den — annars tog knappen trycken på kören.
      const kp = this._dammen?.grodungar?.plats
      const kx = kp ? kp.x - (this._kam.x - 640) : -999
      const ky = kp ? kp.y - (this._kam.y - 360) : -999
      const iVagen = Math.abs(kx - (sr - VAND_KANT)) < 190 && ky > sb - 260 && ky < sb + 120
      vk.lyft = (vk.lyft || 0) + ((iVagen ? 1 : 0) - (vk.lyft || 0)) * Math.min(1, dtS * 6)
      vk.c.position.set(sr - VAND_KANT, sb - VAND_KANT - 170 * vk.lyft)
      vk.c.visible = !this._firar
      vk.t += dtS
      vk.tryck = Math.max(0, vk.tryck - dtS * 5)
      vk.vick = Math.max(0, vk.vick - dtS * 2.5)
      vk.snurr = Math.max(0, vk.snurr - dtS * 2.2)
      const g = this._groda
      if (g && !g.stjarna) vk.riktning = g.riktning
      const mal = vk.riktning
      const nu = vk.ikon.scale.x
      vk.ikon.scale.x = Math.abs(mal - nu) < 0.02 ? mal : nu + (mal - nu) * Math.min(1, dtS * 14)
      vk.pilar.rotation = vk.snurr > 0 ? -mal * (1 - vk.snurr) * TAU * 0.5 : 0
      const sq = Math.sin(Math.PI * vk.tryck)
      vk.inre.scale.set(1 + 0.1 * sq, 1 - 0.12 * sq)
      vk.inre.rotation = 0.22 * vk.vick * Math.sin(vk.t * 34)
      vk.inre.y = 1.2 * Math.sin(vk.t * 1.9)
    }
    // Körpilen: syns när grodan bär en korv och kören är utanför bild.
    const pil = this._korPil
    if (!pil || pil.c.destroyed || !this._dammen) return
    const k = this._dammen.grodungar.plats
    const v = this._vyNu
    const utanfor = k.x < v.left + 60 || k.x > v.right - 60
    const syns = !!this._bar && utanfor && !this._firar
    pil.c.visible = syns
    if (!syns) return
    pil.t += dtS
    pil.puls = Math.max(0, pil.puls - dtS * 0.8)
    const dir = k.x < v.left ? -1 : 1
    const vv = this._ctx?.view
    const sl = Number.isFinite(vv?.left) ? vv.left : 0
    const sr = Number.isFinite(vv?.right) ? vv.right : 1280
    const skarmY = k.y - 40 - (this._kam.y - 360)
    pil.c.position.set(dir < 0 ? sl + 78 : sr - 78, Math.max(200, Math.min(600, skarmY)))
    pil.spets.rotation = dir < 0 ? Math.PI : 0
    const s = 1 + 0.06 * Math.sin(pil.t * 4) + 0.25 * pil.puls * Math.abs(Math.sin(pil.t * 10))
    pil.c.scale.set(s)
  },

  _kvackLjud(ctx, vol = 1) {
    const audio = ctx.services.audio
    const nu = performance.now()
    if (nu - (this._kvackAt || 0) > 1600 && audio.sample('djur_groda')) {
      this._kvackAt = nu
      return
    }
    const f = valj(SKALA)
    audio.tone({ freq: f / 2, slideTo: f / 2.6, dur: 0.14, type: 'triangle', vol: 0.24 * vol })
    audio.tone({ freq: f / 2, slideTo: f / 2.9, dur: 0.12, type: 'triangle', vol: 0.2 * vol, delay: 0.13 })
  },

  // Rapens bubbelringar: vågiga ringar som rullar ut och bleknar (grodans stor, ungarnas små
  // i färgen på korven de fick).
  _ritaRingar(dtS) {
    if (!this._ringar.length) {
      if (this._ringG && !this._ringG.destroyed && this._ringKvar) {
        this._ringG.clear()
        this._ringKvar = false
      }
      return
    }
    if (!this._ringG || this._ringG.destroyed) {
      this._ringG = new Graphics()
      this._L.effekt.addChild(this._ringG)
    }
    const g = this._ringG
    g.clear()
    this._ringKvar = true
    for (const r of this._ringar) {
      r.t += dtS
      r.r += dtS * r.fart
      const a = Math.max(0, 1 - r.t / 1.6)
      if (a <= 0) continue
      const n = r.skala < 1 ? 11 : 18
      for (let i = 0; i < n; i++) {
        const v = (i / n) * TAU + r.t
        const rr = r.r + Math.sin(v * 3 + r.t * 8) * 6 * r.skala
        g.circle(r.x + Math.cos(v) * rr, r.y + Math.sin(v) * rr * 0.55, (7 + (i % 3) * 3) * r.skala).fill({ color: r.farg, alpha: 0.55 * a }).stroke({ width: 2, color: 0xffffff, alpha: 0.8 * a })
      }
    }
    this._ringar = this._ringar.filter((r) => r.t < 1.6)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    if (this._root && !this._root.destroyed) {
      this._root.off('pointerdown', this._onDown)
      for (const ev of ['pointerup', 'pointerupoutside', 'pointercancel']) this._root.off(ev, this._onUp)
      this._root.off('globalpointermove', this._onMove)
    }
    if (this._kam?.root) gsap.killTweensOf(this._kam.root)
    this._rivVarld()
    if (this._hud) stadFx(this._hud)
    this._kam?.destroy()
    this._kam = null
    this._ringG = null
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
  },
}
