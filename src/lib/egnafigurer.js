// lib/egnafigurer.js — barnets EGNA figurer i andra spel (LYFTPLAN §10, Spår F).
//
// Knytten barnet kläckt i `unika-knytt` och kompisarna det fotograferat i `bygg-en-kompis`
// lånas ut till andra spels figurroller: publiken, mottagaren som äter, det som hittas.
// Tre delar:
//
// 1. LÄSNING — `lasEgna(services)` läser den AKTIVA profilens samlingar genom källspelens egen
//    sanering (`rensaPost` i dna.js, `rensaCfg` i varelse.js). Läser bara, skriver aldrig i ett
//    annat spels post (P0: sparade framsteg).
// 2. SESSIONSMINNET — `minns(services, typ, data)` anropas av källspelen när en ny figur blivit
//    till. En modulvariabel: överlever spelbyten, dör med sidan. Nycklad på PROFIL-id, så två
//    syskon med var sin profil aldrig får varandras figurer.
// 3. URVALET — `valjEgna(services, spelId, { antal, typer })`. Ägarbesluten 2026-10-01 (§F5):
//    ⓵ en figur barnet skapat i sessionen kommer i nästa omgång av VARJE spel tills den visats
//    där, ⓶ därefter växlar spelet mellan barnets figurer och sina egna (varannan omgång),
//    ⓷ har barnet inga står spelets egen figur kvar — svaret är då en tom lista.
//
// Och FASADEN `byggEgenFigur(ctx, beskrivning, opts)`: EN yta oavsett om figuren är ett knytt
// eller en kompis, så spelet aldrig behöver veta vad det fått (mönstret från
// `popcornkalaset/gaster.js`). Den är Karaktar-kompatibel — `look · react · setMood · mood ·
// blink · idle · destroy` — och med `{ r }` står den i samma rum som `makeKaraktar({ r })`
// (origo = huvudets mitt, fötterna på 2,16·r, höjden ≈ 3,2·r), så en publikroll byter figur
// med en rad. Den tickar SJÄLV på `ctx.ticker`: en Karaktar behöver ingen tick, och en
// ersättare som kräver en är ingen ersättare.
//
// Det här är den enda fil i `lib/` som importerar ur ett spel. Avsiktligt: knyttet och
// kompisen ÄGS av sina spel (ritningen bor där den byggs), och den här filen är bryggan.
import { Container, Point } from 'pixi.js'
import { byggKnytt } from '../games/unika-knytt/knytt.js'
import { dnaFranPost, rensaPost } from '../games/unika-knytt/dna.js'
import { byggKompis, rensaCfg } from '../games/bygg-en-kompis/varelse.js'
import { stadFx } from './feedback.js'

export const KNYTT_SPEL = 'unika-knytt'
export const KOMPIS_SPEL = 'bygg-en-kompis'
const TYPER = ['knytt', 'kompis']

const tal = (v, reserv) => (typeof v === 'number' && Number.isFinite(v) ? v : reserv)

// --- 1. läsningen ---------------------------------------------------------------------------

function profilId(services) {
  try {
    return services?.profiles?.activeId?.() ?? null
  } catch {
    return null
  }
}

function rensa(typ, data) {
  if (typ === 'knytt') return rensaPost(data)
  if (typ === 'kompis') return data && typeof data === 'object' ? rensaCfg(data) : null
  return null
}

/** Stabilt id per figur: knyttets frö, kompisens sex val. Två identiska kompisar är samma. */
export function figurId(typ, data) {
  if (typ === 'knytt') return `k${data[0] >>> 0}`
  return `c${data.kropp}.${data.ogon}.${data.mun}.${data.topp}.${data.farg}.${data.storlek}`
}

/** Den aktiva profilens samlingar, sanerade och kopierade. Nyast sist, som i källspelen. */
export function lasEgna(services) {
  let p = null
  try {
    p = services?.profiles?.active?.() ?? null
  } catch {
    p = null
  }
  const knytt = []
  const lista = p?.games?.[KNYTT_SPEL]?.custom?.knytt?.lista
  if (Array.isArray(lista)) {
    for (const post of lista) {
      const r = rensaPost(post)
      if (r) knytt.push(r)
    }
  }
  const kompisar = []
  const galleri = p?.games?.[KOMPIS_SPEL]?.custom?.galleri
  if (Array.isArray(galleri)) {
    for (const c of galleri) if (c && typeof c === 'object') kompisar.push(rensaCfg(c))
  }
  return { knytt, kompisar }
}

// --- 2. sessionsminnet ----------------------------------------------------------------------

// profilId → { skapade: [{ typ, data, id }], visad: Map(spelId → Set(id)),
//              nastaEgen: Map(spelId → bool), senast: Map(id → klocka) }
const SESSION = new Map()
let klocka = 0

function sess(pid) {
  let s = SESSION.get(pid)
  if (!s) {
    s = { skapade: [], visad: new Map(), nastaEgen: new Map(), senast: new Map() }
    SESSION.set(pid, s)
  }
  return s
}

/** Källspelen: en ny figur har blivit till (kläckt / fotograferad och upphängd). */
export function minns(services, typ, data) {
  const pid = profilId(services)
  if (pid == null || !TYPER.includes(typ)) return
  const rent = rensa(typ, data)
  if (!rent) return
  const s = sess(pid)
  const id = figurId(typ, rent)
  s.skapade = s.skapade.filter((f) => f.id !== id)
  s.skapade.push({ typ, data: rent, id })
  // En nyskapad figur är OSEDD överallt — även om en likadan kompis visats förut.
  for (const set of s.visad.values()) set.delete(id)
}

/** För sonderna: glöm hela sessionen (som en omladdning av sidan). */
export function glomSessionen() {
  SESSION.clear()
  klocka = 0
}

// --- 3. urvalet -----------------------------------------------------------------------------

function blanda(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Vilka av barnets figurer ska stå i den här omgången av `spelId`? Returnerar en lista med
 * beskrivningar `{ typ, data, id, ny }` (högst `antal`), eller en TOM lista — då står spelets
 * egen figur kvar (ägarbeslut F5.2). Anropa en gång per omgång: anropet räknar takten.
 *
 * opts: { antal = 1, typer = ['knytt', 'kompis'], rng = Math.random }
 */
export function valjEgna(services, spelId, { antal = 1, typer = TYPER, rng = Math.random } = {}) {
  const pid = profilId(services)
  const n = Math.max(0, Math.round(tal(antal, 1)))
  if (pid == null || !n || !spelId) return []
  const tillatna = TYPER.filter((t) => typer.includes(t))
  const sparat = lasEgna(services)
  // Bara figurer som FINNS i samlingen — en nollställd profil eller en kompis som ramlat ner
  // från en full bildvägg visas inte ur minnet.
  const pool = new Map()
  if (tillatna.includes('knytt')) for (const d of sparat.knytt) pool.set(figurId('knytt', d), { typ: 'knytt', data: d })
  if (tillatna.includes('kompis')) for (const d of sparat.kompisar) pool.set(figurId('kompis', d), { typ: 'kompis', data: d })
  if (!pool.size) return []

  const s = sess(pid)
  let visad = s.visad.get(spelId)
  if (!visad) {
    visad = new Set()
    s.visad.set(spelId, visad)
  }

  // ⓵ Nya: skapade i sessionen och inte visade i DET HÄR spelet än — nyast först.
  const ut = []
  for (let i = s.skapade.length - 1; i >= 0 && ut.length < n; i--) {
    const f = s.skapade[i]
    if (!pool.has(f.id) || visad.has(f.id)) continue
    ut.push({ ...pool.get(f.id), id: f.id, ny: true })
  }

  // ⓶ Takten: varannan omgång är barnets, varannan spelets egen. En omgång med en ny figur
  // räknas som barnets — nästa blir då spelets egen.
  const egenRunda = ut.length > 0 || s.nastaEgen.get(spelId) !== false
  if (!egenRunda) {
    s.nastaEgen.set(spelId, true)
    return []
  }

  // Fyll på ur samlingen: den som visats längst sedan först (aldrig visad allra först),
  // slumpen avgör vid lika. sort() är stabil, så blandningen står kvar som skiljelinje.
  if (ut.length < n) {
    const kvar = blanda([...pool.entries()].filter(([id]) => !ut.some((u) => u.id === id)), rng)
    kvar.sort((a, b) => (s.senast.get(a[0]) ?? -1) - (s.senast.get(b[0]) ?? -1))
    for (const [id, d] of kvar) {
      if (ut.length >= n) break
      ut.push({ ...d, id, ny: false })
    }
  }
  for (const u of ut) {
    visad.add(u.id)
    s.senast.set(u.id, ++klocka)
  }
  s.nastaEgen.set(spelId, false)
  return ut
}

// --- fasaden ----------------------------------------------------------------------------------

// Utan ett nytt `look()` på så här länge släpper figuren målet och tittar sig omkring själv.
const MAL_SLAPP_S = 2.5

class EgenFigur {
  constructor(ctx, beskr, opts = {}) {
    this._alive = true
    this.typ = beskr?.typ === 'kompis' ? 'kompis' : 'knytt'
    this.id = beskr?.id ?? null
    this.ny = !!beskr?.ny
    this._mood = 'glad'
    const audio = opts.ljud === false ? null : ctx?.services?.audio || null

    this.view = new Container()
    this.view.eventMode = 'none'
    this.view.interactiveChildren = false
    // `_norm` äger normaliseringen (skala + fötternas läge). `view` är anroparens.
    this._norm = new Container()
    this.view.addChild(this._norm)

    let topp
    let vanster
    let hoger
    let ansikte
    let mun
    if (this.typ === 'knytt') {
      const dna = dnaFranPost(beskr?.data)
      this.namn = typeof dna.namn === 'string' ? dna.namn : null
      this._fig = byggKnytt(dna, { r: 60, audio, senare: ctx?.later, somnar: opts.somnar === true })
      const m = this._fig._m || {}
      const bas = tal(this._fig._bas, 1)
      const b = this._fig.view.getLocalBounds()
      topp = b.minY
      vanster = b.minX
      hoger = b.maxX
      ansikte = tal(m.faceY, -80) * bas
      mun = tal(m.munY, -60) * bas
    } else {
      this.namn = null
      this._fig = byggKompis(beskr?.data, { audio, skugga: opts.skugga !== false })
      const mt = this._fig.matt
      topp = mt.topp
      vanster = mt.vanster
      hoger = mt.hoger
      ansikte = mt.ansikte
      mun = mt.mun
    }

    // Normaliseringen. Knytt varierar 0,5–1,7× i storlek och en kompis är 200–260 px, så
    // varje figur skalas till den höjd rollen begär — mätt på den RITADE figuren (öron,
    // horn, vingar, prydnad och knyttets egen kompis med).
    const h0 = Math.max(1, -topp)
    const b0 = Math.max(1, hoger - vanster)
    let hojd
    let fotY
    if (Number.isFinite(opts.r)) {
      // Karaktar-rummet: origo = huvudets mitt, fötterna på 2,16·r (lib/karaktarer.js).
      hojd = opts.r * 3.2
      fotY = opts.r * 2.16
    } else {
      hojd = tal(opts.hojd, 180)
      fotY = 0
    }
    let k = hojd / h0
    if (Number.isFinite(opts.maxBredd)) k = Math.min(k, opts.maxBredd / b0)
    this._k = k
    this._norm.scale.set(k)
    this._norm.y = fotY
    this._norm.addChild(this._fig.view)

    // Måtten i VIEW-rymden.
    this.matt = {
      hojd: h0 * k,
      bredd: b0 * k,
      topp: fotY + topp * k,
      vanster: vanster * k,
      hoger: hoger * k,
      fot: { x: 0, y: fotY },
      huvud: { x: 0, y: fotY + ansikte * k },
      mun: { x: 0, y: fotY + mun * k },
    }
    this.kan = { armar: this.typ === 'kompis', sova: this.typ === 'knytt', ata: true, sjunga: !!audio }

    this._mal = null
    this._malT = 0
    this._malPt = new Point()
    this._lok = new Point()
    this._ticker = opts.tick === false ? null : ctx?.ticker || null
    if (this._ticker) {
      this._tickFn = (tk) => this.tick(tk.deltaMS)
      this._ticker.add(this._tickFn)
    }
  }

  /** En bildruta. Anropas av tickern själv — bara med `{ tick: false }` driver spelet den. */
  tick(dtMS) {
    if (!this._alive) return
    // Spelet rev trädet utan att fråga oss: städa och släpp tickern.
    if (!this.view || this.view.destroyed) {
      this.destroy()
      return
    }
    let lok = null
    if (this._mal) {
      this._malT += tal(dtMS, 16) / 1000
      if (this._malT > MAL_SLAPP_S) this._mal = null
      else if (this.view.parent) {
        this._malPt.set(this._mal.x, this._mal.y)
        lok = this._norm.toLocal(this._malPt, this.view.parent, this._lok)
        if (!Number.isFinite(lok.x) || !Number.isFinite(lok.y)) lok = null
      }
    }
    this._fig.tick(dtMS, lok)
  }

  /** Blicken mot en punkt i FÖRÄLDERNS rum (som `Karaktar.look`). Anropa gärna varje bildruta. */
  look(x, y) {
    if (!this._alive || !Number.isFinite(x) || !Number.isFinite(y)) return this
    if (!this._mal) this._mal = { x, y }
    else {
      this._mal.x = x
      this._mal.y = y
    }
    this._malT = 0
    return this
  }

  /**
   * Karaktar-händelserna: 'jubel' · 'heja' · 'hej' · 'nam' · 'hoppsan' · 'nyfiken'.
   * Knytt: jubel = glädjeskutt + eget motiv, nam = gapar/tuggar/rapar, resten ett skutt.
   * Kompis: jubel = armarna upp + melodin, heja = halvt jubel, hej = vinkning, nam = tugga.
   */
  react(handelse) {
    if (!this._alive) return this
    const f = this._fig
    if (this.typ === 'knytt') {
      if (handelse === 'jubel') f.glad()
      else if (handelse === 'nam') f.at()
      else if (handelse === 'heja' || handelse === 'hej' || handelse === 'hoppsan') f.hoppa(1)
    } else if (handelse === 'jubel') f.jubla()
    else if (handelse === 'heja') f.heja()
    else if (handelse === 'hej') f.vinka()
    else if (handelse === 'nam') f.tugga()
    else if (handelse === 'hoppsan') f.hoppa(1)
    return this
  }

  glad() {
    return this.react('jubel')
  }

  at() {
    return this.react('nam')
  }

  vinka() {
    return this.react(this.typ === 'kompis' ? 'hej' : 'heja')
  }

  sjung() {
    if (this._alive) this._fig.sjung()
    return this
  }

  /** Bara sömnen betyder något för ett knytt; allt annat är ett humör figurerna inte ritar. */
  setMood(namn) {
    if (!this._alive) return this
    this._mood = namn
    if (this.typ === 'knytt') {
      if (namn === 'somnig' || namn === 'sover') this._fig.somna()
      else if (this._fig.lage === 'somnig' || this._fig.lage === 'sover') this._fig.vakna()
    }
    return this
  }

  mood() {
    return this._mood
  }

  // Karaktar-ytan: riggarna blinkar och andas av sig själva.
  blink() {
    return this
  }

  idle() {
    return this
  }

  destroy() {
    if (!this._alive) return
    this._alive = false
    if (this._ticker && this._tickFn) this._ticker.remove(this._tickFn)
    this._ticker = null
    if (this.view && !this.view.destroyed) stadFx(this.view)
    this._fig?.destroy?.()
    if (this.view && !this.view.destroyed) this.view.destroy({ children: true })
  }
}

/**
 * En av barnets figurer, levande och normaliserad.
 * @param ctx    spelets ctx (ticker, services.audio, later)
 * @param beskr  en post ur `valjEgna` ({ typ, data, id, ny })
 * @param opts   { hojd = 180 | r (Karaktar-rummet), maxBredd, ljud = true, somnar = false,
 *                 skugga = true (kompisen), tick = true }
 */
export function byggEgenFigur(ctx, beskr, opts = {}) {
  return new EgenFigur(ctx, beskr, opts)
}

/**
 * Figuren för EN omgång av en roll som annars har en egen figur (publiken, mottagaren):
 * barnets knytt eller kompis när takten säger det, annars `reserv()` — spelets egen.
 * Båda svarar på samma Karaktar-yta, så spelet behöver inte veta vilken det fick.
 *
 * opts: { reserv: () => figur, typer, ...byggEgenFigurs opts (r / hojd / maxBredd …) }
 */
export function figurForOmgang(ctx, spelId, { reserv = null, typer = TYPER, ...opts } = {}) {
  const [beskr] = valjEgna(ctx?.services, spelId, { antal: 1, typer })
  if (beskr) return byggEgenFigur(ctx, beskr, opts)
  return typeof reserv === 'function' ? reserv() : null
}

/** Är det här en av barnets egna figurer (och inte spelets reserv)? */
export function arEgen(fig) {
  return fig instanceof EgenFigur
}

/**
 * Presentera en figur barnet NYSS skapat, första gången den dyker upp i ett spel: spelets egen
 * replik (en LITERAL i spelets index.js — annars hittar `check.mjs` den aldrig och den får
 * inget klipp), och för ett knytt dess namn som ett EGET klipp efteråt (alla 24 namn har
 * klipp). Köas bakom det som redan talar (`ctx.narTyst`) och tystnar om figuren hunnit rivas.
 * En figur som inte är ny presenteras inte — bilden räcker, och spelets egna repliker får plats.
 */
export function presentera(ctx, fig, repliker = {}) {
  if (!arEgen(fig) || !fig.ny || typeof ctx?.narTyst !== 'function') return
  const voice = ctx.services?.voice
  const rad = fig.typ === 'knytt' ? repliker.knytt : repliker.kompis
  if (!voice || !rad) return
  ctx.narTyst(() => {
    if (fig._alive) voice.say(rad)
  })
  if (fig.namn) {
    ctx.narTyst(() => {
      if (fig._alive) voice.say(fig.namn)
    })
  }
}
