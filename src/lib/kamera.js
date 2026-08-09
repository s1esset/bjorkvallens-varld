// Kamera: gör en 1280×720-diorama till en värld.
//
// Kameran äger INGA spelobjekt. Den äger ett antal LAGER (Container) som var och ett har en
// parallaxfaktor: 0 = fastspikat i skärmen (vinjett, HUD), 1 = samma plan som spelaren,
// däremellan = bakgrund som rör sig långsammare. Spelet bygger i lagret med faktor 1 och
// tänker i världskoordinater; kameran flyttar lagren, aldrig innehållet.
//
//   const kam = new Camera({ worldW: 2560 })
//   ctx.stage.addChild(kam.root)
//   kam.adopt(createScene('meadow', { kamera: { bredd: 2560 } }))  // scenens djupband
//   const varld = kam.parallax(1)                                   // spelplanet
//   kam.follow(spelaren, { lead: 90, deadzone: 140 })
//   kam.attach(ctx.ticker)
//   ...destroy(): kam.destroy()
//
// Pekpunkter: spelet får `e.global` i skärmrymd. `varld.toLocal(e.global)` ger världspunkten —
// kameran behöver ingen egen omräkning eftersom lagren är riktiga Pixi-containrar.
//
// P0 i kod, inte bara i kommentar:
//   • Ingen rotation. Kameran exponerar den inte och sätter den aldrig.
//   • Mjuk följning (exponentiell utjämning) + dödzon, så små studsar inte gungar bilden.
//   • Fartsspärr (`maxSpeed`) — en kropp som accelererar rycker inte iväg bilden.
//   • Men en HÅRD ruta (`hardBox`) går före spärren: målet kan aldrig lämna bilden, för en
//     kamera som tappar bort barnets figur är värre än en kamera som rör sig snabbt.
//     Priset är mätt: TELEPORTERAR målet (ny runda, respawn) hoppar bilden med, eftersom
//     rutan klämmer mot målets NUVARANDE läge. Ett spel som flyttar sin figur långt på en
//     bildruta ska därför flytta kameran själv med `moveTo()` i samma andetag.
//   • Zoom är klämd till [minZoom, maxZoom] och tar ALLTID minst `MIN_ZOOM_TID` sekunder.
//   • Skak har ett tak (`maxShake`) och avklingar mjukt — det är juice, inte en jordbävning.
import { Container } from 'pixi.js'
import { DESIGN_W, DESIGN_H } from './theme.js'

// Delad djupstege. scene.js taggar sina lager med dessa värden, så ett spel som lägger till
// egen dekor kan sätta den på rätt avstånd utan att gissa. Stegen är små längst bak (0.18 ·
// 0.22) och stora längst fram (0.52 · 1.0), för det är så avstånd faktiskt beter sig: två
// berg vid horisonten glider knappt isär hur långt man än går, medan ett träd tio meter bort
// rusar förbi ett träd trettio meter bort. En jämnt fördelad stege ser ut som kulisser på
// skenor — det är SKILLNADEN i hastighet, inte antalet lager, som ögat läser som djup.
export const DJUP = {
  himmel: 0,
  sol: 0.02,
  stjarnor: 0.05,
  moln: 0.12,
  fjarran: 0.18,
  dis: 0.22,
  mellan: 0.34,
  nara: 0.52,
  mark: 1,
}

const MIN_ZOOM_TID = 0.5 // s — en zoom som går fortare än så överraskar (P0)

const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
// Mjuk in/ut utan gsap: kameran ska inte ha tweens att döda vid exit.
const mjuk = (t) => t * t * (3 - 2 * t)

export class Camera {
  // width/height = vyn (designkoordinater). worldW/worldH = världens storlek; lika stor som
  // vyn (default) betyder att kameran står stilla och blir en ren no-op — ett spel kan alltså
  // adoptera kameran utan att bygga en större värld och få exakt samma bild som förut.
  constructor({
    width = DESIGN_W,
    height = DESIGN_H,
    worldW = width,
    worldH = height,
    // Zoom-IN är gratis: den visar mindre, så inget lager behöver extra bredd (kontrollräknat
    // — vid 1.6 hamnar markens högerkant exakt på världens). Zoom-UT under 1 är det inte:
    // då sträcker sig varje lager utanför vyn åt BÅDA håll, och `lagerBredd` (som bara ger
    // marginal åt höger) räcker inte. Därför är golvet 1. Ett spel som verkligen vill zooma
    // ut sätter `minZoom` själv och får då rita sin bakgrund med marginal på båda sidor —
    // `createScene`s `kamera`-flagga gör det inte.
    minZoom = 1,
    maxZoom = 1.6,
    ease = 4.5, // 1/s — högre = snabbare infångning
    maxSpeed = 900, // px/s i världsrymd
    // Andel av halva vyn som målet som mest får ligga från mitten. 0.75 = drygt 160 px in
    // från kanten. Första försöket var 0.42, och det MÄTTES vara fel: rutan klämmer varje
    // bildruta mot målets läge, så en snäv ruta gör kameran klistrad vid figuren och sätter
    // både dödzon, lead och fartsspärr ur spel — de får bara verka inne i rutan.
    hardBox = 0.75,
    maxShake = 10, // px
  } = {}) {
    this.view = { w: width, h: height }
    this.world = { w: Math.max(width, worldW), h: Math.max(height, worldH) }
    this.minZoom = minZoom
    this.maxZoom = maxZoom
    this.zoom = 1
    this._ease = ease
    this._maxSpeed = maxSpeed
    this._hardBox = hardBox
    this._maxShake = maxShake

    // Kamerans läge = världspunkten i vyns MITT. Mitten (inte hörnet) är det som håller
    // under en zoom, och det är så man tänker när man placerar en kamera ("på spelaren").
    this.x = width / 2
    this.y = height / 2

    this._alive = true
    this._layers = []
    this._target = null
    this._follow = null
    this._lastT = null
    this._vx = 0
    this._vy = 0

    this._pan = null
    this._zoomTw = null
    this._shake = null

    this.root = new Container()
    this.root.label = 'kamera'
  }

  // --- lager ---

  // Skapa ett parallaxlager. `faktor` är antingen ett tal (samma på båda axlarna) eller
  // { x, y } — scenens lager har y: 0, eftersom en horisont ska ligga still i höjdled även
  // när bilden panorerar i sidled.
  // opts.dekor (default false) sätter eventMode 'none' + interactiveChildren false.
  // opts.skak (default: allt utom faktor 0) — vinjett och HUD ska inte skaka med.
  parallax(faktor = 1, opts = {}) {
    const c = taggaLager(new Container(), faktor, opts)
    this._layers.push(c)
    this.root.addChild(c)
    this._applyLayer(c)
    return c
  }

  // Ta över lagren ur en scen byggd med createScene(tema, { kamera: … }). Scenroten töms och
  // förstörs; dess lager blir kamerans understa och behåller sin inbördes ordning, så det
  // spelet lägger till efter adopt() hamnar ovanpå — samma ordning som utan kamera.
  adopt(sceneRoot) {
    const lager = sceneRoot?._kamLager
    if (!lager || !lager.length) {
      // Scen utan kameraflagga: lägg in den som ett vanligt markplan hellre än att tappa den.
      if (sceneRoot) {
        const c = this.parallax(1, { dekor: true })
        c.addChild(sceneRoot)
      }
      return this
    }
    // Scenens lager är låsta i HÖJDLED (`_kamFy = 0`) — en horisont ska ligga still när
    // bilden panorerar i sidled. Har världen vertikalt utrymme panorerar spelets eget
    // faktor-1-lager i höjd medan scenens mark står kvar, och figuren glider av marken.
    // Det syns bara i rörelse, aldrig i en stillbild, så det får inte vara tyst.
    if (import.meta.env?.DEV && this.world.h > this.view.h) {
      console.warn(
        '[kamera] createScene-lagren är låsta i höjdled men världen är högre än vyn ' +
        `(${this.world.h} > ${this.view.h}). Marken följer inte med i höjd — rita egen ` +
        'bakgrund i ett parallax()-lager, eller håll worldH == vyns höjd.',
      )
    }
    for (const l of lager) {
      this._layers.push(l)
      this.root.addChild(l)
      this._applyLayer(l)
    }
    sceneRoot.destroy({ children: false })
    return this
  }

  // --- styrning ---

  // Följ ett Pixi-objekt (eller vad som helst med .x/.y i världskoordinater).
  //   lead     px — hur långt före målet bilden lägger sig i färdriktningen
  //   deadzone px i skärmrymd — inuti den rör sig kameran inte alls
  follow(target, { lead = 0, deadzone = 120, ease = this._ease } = {}) {
    this._target = target
    this._follow = { lead, deadzone, ease }
    this._lastT = null
    this._vx = 0
    this._vy = 0
    return this
  }

  unfollow() {
    this._target = null
    this._follow = null
    return this
  }

  // Ändra världens storlek mellan omgångar.
  //
  // Lagren ritas för den STÖRSTA värld spelet kan bygga, EN gång — att rita om dem per
  // nivå vore att baka nya texturer mitt i leken. Den här klämmer bara hur långt kameran
  // får panorera, så en kort bana inte visar tom värld till höger om målet.
  setWorld(w, h = this.world.h) {
    this.world.w = Math.max(this.view.w, w)
    this.world.h = Math.max(this.view.h, h)
    this._set(this.x, this.y) // klämningen beror på världen — räkna om mot de nya kanterna
    this._applyAll()
    return this
  }

  // Sätt kameran direkt (uppstart, ny nivå).
  moveTo(x, y = this.y) {
    this._pan = null
    this._set(x, y)
    this._applyAll()
    return this
  }

  // Mjuk, explicit panorering (t.ex. "titta på målet" innan rundan börjar).
  // `y` är valfri, så `panTo(x, { duration: 2 })` ligger nära till hands och skulle annars
  // tolka optionsobjektet som en y-koordinat (NaN, tyst trasig kamera). Fånga det i stället.
  panTo(x, y, opts) {
    if (y !== null && typeof y === 'object') { opts = y; y = undefined }
    const { duration = 1 } = opts || {}
    this._pan = { fx: this.x, fy: this.y, tx: x, ty: y ?? this.y, t: 0, d: Math.max(0.2, duration) }
    return this
  }

  // Skak som juice: två sinusvågor med olika frekvens (per-bildruta-slump känns som brus och
  // är obehagligt på en platta), amplitud kvadratiskt avklingande, tak enligt maxShake.
  shake(amp = 6, duration = 0.4) {
    const a = klamp(amp, 0, this._maxShake)
    if (a <= 0) return this
    const d = klamp(duration, 0.1, 0.6)
    // Ett pågående skak förlängs/förstärks i stället för att nollställas — annars hackar det
    // när två träffar landar tätt.
    if (this._shake && this._shake.t < this._shake.d) {
      this._shake.a = Math.max(this._shake.a, a)
      this._shake.d = Math.max(this._shake.d - this._shake.t, d)
      this._shake.t = 0
      return this
    }
    this._shake = { a, d, t: 0, f1: 17 + Math.random() * 5, f2: 23 + Math.random() * 7, p: Math.random() * 6.28 }
    return this
  }

  // Zooma mjukt. x/y (världspunkt) är valfritt: anges de panorerar kameran dit samtidigt.
  zoomTo(skala, { duration = 0.9, x, y } = {}) {
    const to = klamp(skala, this.minZoom, this.maxZoom)
    const d = Math.max(MIN_ZOOM_TID, duration)
    this._zoomTw = { from: this.zoom, to, t: 0, d }
    if (x != null) this.panTo(x, y ?? this.y, { duration: d })
    return this
  }

  // --- körning ---

  attach(ticker) {
    this._ticker = ticker
    this._tickRef = (t) => this.update(t.deltaMS)
    ticker.add(this._tickRef)
    return this
  }

  detach() {
    if (this._ticker && this._tickRef) this._ticker.remove(this._tickRef)
    this._ticker = null
    this._tickRef = null
    return this
  }

  update(dtMs) {
    if (!this._alive || this.root.destroyed) return
    // Taket på 50 ms: efter en flikväxling kommer ett jättesteg, och kameran ska inte
    // teleportera för att appen legat i bakgrunden.
    const dt = Math.min(0.05, Math.max(0.001, (dtMs || 16.7) / 1000))
    this._stepZoom(dt)
    this._stepPan(dt)
    this._stepShake(dt)
    this._applyAll()
  }

  destroy() {
    this._alive = false
    this.detach()
    this._target = null
    this._layers.length = 0
    if (!this.root.destroyed) this.root.destroy({ children: true })
  }

  // --- internt ---

  // Halva den SYNLIGA världsytan (krymper när man zoomar in). Dödzon och hård ruta mäts mot
  // den, inte mot vyns halva bredd — annars ändrar de betydelse när zoomen ändras.
  _halfW() { return this.view.w / (2 * this.zoom) }
  _halfH() { return this.view.h / (2 * this.zoom) }

  // Klämning mot världens kanter. Ryms världen inte i den synliga ytan centreras den —
  // annars skulle ett zoom-ut visa tomrum utanför världen.
  _set(x, y) {
    const hw = this._halfW()
    const hh = this._halfH()
    this.x = this.world.w <= hw * 2 ? this.world.w / 2 : klamp(x, hw, this.world.w - hw)
    this.y = this.world.h <= hh * 2 ? this.world.h / 2 : klamp(y, hh, this.world.h - hh)
  }

  _stepZoom(dt) {
    const z = this._zoomTw
    if (!z) return
    z.t += dt
    const k = mjuk(klamp(z.t / z.d, 0, 1))
    this.zoom = z.from + (z.to - z.from) * k
    this._set(this.x, this.y) // klämningen beror på zoomen — räkna om mot de nya kanterna
    if (z.t >= z.d) this._zoomTw = null
  }

  _stepPan(dt) {
    if (this._pan) {
      const p = this._pan
      p.t += dt
      const k = mjuk(klamp(p.t / p.d, 0, 1))
      this._set(p.fx + (p.tx - p.fx) * k, p.fy + (p.ty - p.fy) * k)
      if (p.t >= p.d) this._pan = null
      return
    }
    const t = this._target
    const f = this._follow
    if (!t || !f || t.destroyed) return

    // Farten mäts, inte gissas — `lead` ska peka åt det håll figuren FAKTISKT rör sig.
    const tx = t.x
    const ty = t.y
    if (this._lastT) {
      const k = 1 - Math.exp(-6 * dt)
      this._vx += ((tx - this._lastT.x) / dt - this._vx) * k
      this._vy += ((ty - this._lastT.y) / dt - this._vy) * k
    }
    this._lastT = { x: tx, y: ty }

    const lx = klamp(this._vx * 0.35, -f.lead, f.lead)
    const ly = klamp(this._vy * 0.35, -f.lead, f.lead)
    const cx = this.x
    const cy = this.y
    const dz = f.deadzone / (2 * this.zoom)

    let ax = this._aim(cx, tx + lx, dz)
    let ay = this._aim(cy, ty + ly, dz)

    // Exponentiell utjämning: bildrutefri (samma resultat vid 30 som vid 60 FPS).
    const k = 1 - Math.exp(-f.ease * dt)
    const capp = this._maxSpeed * dt
    let nx = cx + klamp((ax - cx) * k, -capp, capp)
    let ny = cy + klamp((ay - cy) * k, -capp, capp)

    // Hård ruta: fartsspärren får aldrig kosta att målet lämnar bilden.
    const mx = this._halfW() * this._hardBox
    const my = this._halfH() * this._hardBox
    nx = klamp(nx, tx - mx, tx + mx)
    ny = klamp(ny, ty - my, ty + my)

    this._set(nx, ny)
  }

  // Dödzon: inuti den rör sig kameran inte alls, utanför siktar den på zonens kant (inte på
  // målet) — annars skulle kameran hoppa till varje gång målet passerar gränsen.
  _aim(cur, mal, dz) {
    const d = mal - cur
    if (Math.abs(d) <= dz) return cur
    return mal - Math.sign(d) * dz
  }

  _stepShake(dt) {
    const s = this._shake
    if (!s) return
    s.t += dt
    if (s.t >= s.d) {
      this._shake = null
      this._sx = 0
      this._sy = 0
      return
    }
    const k = 1 - s.t / s.d
    const a = s.a * k * k
    this._sx = Math.sin(s.t * s.f1 + s.p) * a
    this._sy = Math.cos(s.t * s.f2) * a * 0.7
  }

  _applyAll() {
    for (const l of this._layers) if (!l.destroyed) this._applyLayer(l)
  }

  // Lagerformeln. Innehållet i ett lager är ritat i den rymd där "kameran i utgångsläget"
  // betyder "innehållets koordinat == skärmkoordinat" — för faktor 1 är det världsrymden,
  // eftersom kameran startar i världens vänsterkant.
  //
  //   skärm = mitt + (q − mitt − pan·f) · zoom
  //
  // Zoomen är UNIFORM och skalar kring vyns mitt, inte kring lagrets origo. Första versionen
  // skalade varje lager med sin egen faktor (`1 + (zoom−1)·f`), vilket lät fysikaliskt men
  // var fel: vid zoom 1.4 hamnade markens horisont på skärm-y 874 och fjärranbandets på 673,
  // alltså gled scenen isär i höjdled. En zoom ändrar brännvidd — den flyttar inte lagren
  // i förhållande till varandra. Det gör bara PANORERINGEN, och den bär faktorn.
  _applyLayer(l) {
    const s = this.zoom
    const sh = l._kamSkak
    const cx = this.view.w / 2
    const cy = this.view.h / 2
    const x = cx - (cx + (this.x - cx) * l._kamFx) * s + (this._sx || 0) * sh
    const y = cy - (cy + (this.y - cy) * l._kamFy) * s + (this._sy || 0) * sh
    l.scale.set(s)
    // Heltalsläge när inget skalas: annars skimrar tunna streck (grässtrån) när bilden glider.
    l.position.set(s === 1 ? Math.round(x) : x, s === 1 ? Math.round(y) : y)
  }
}

// Tagga en Container som parallaxlager. Egen funktion, inte en metod, eftersom scene.js
// bygger sina lager själv (den vet ritordningen) men fältnamnen måste ha EN ägare.
// Egna fält på ett Pixi-objekt får ALDRIG heta som Pixis transformcache (_cx/_cy/_sx/_sy)
// — se CLAUDE.md. Prefixet `_kam` är vårt eget och krockar inte.
export function taggaLager(c, faktor = 1, opts = {}) {
  const fx = typeof faktor === 'number' ? faktor : (faktor.x ?? 1)
  const fy = typeof faktor === 'number' ? faktor : (faktor.y ?? 0)
  c._kamFx = fx
  c._kamFy = fy
  c._kamSkak = opts.skak ?? (fx > 0 || fy > 0 ? 1 : 0)
  if (opts.dekor) {
    c.eventMode = 'none'
    c.interactiveChildren = false
  }
  return c
}

// Hur brett ett lager med faktor `f` måste ritas för att täcka vyn hela vägen genom världen.
// Kameran startar i världens vänsterkant, så lagret förskjuts bara ÅT VÄNSTER och all extra
// bredd behövs till höger. Delas av scene.js och av spel som ritar egen bakgrundsdekor.
export function lagerBredd(f, viewW = DESIGN_W, worldW = viewW) {
  return Math.round(viewW + f * Math.max(0, worldW - viewW))
}
