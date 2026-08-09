// Lättviktig brygga mellan matter.js (fysik) och Pixi (rendering).
// Bygg scenen i designkoordinater (1280x720); kropparna lever i samma rymd.
// Stega motorn på Pixi-tickern, synka display-objekt till kroppar, städa exit-säkert.
//
// Användning i ett spel:
//   this._phys = new PhysicsWorld({ gravityY: 1.4 })
//   const body = this._phys.circle(x, y, r, { restitution: 0.7 })
//   this._phys.link(body, pixiSprite)          // sprite.anchor.set(0.5)
//   ctx.ticker.add(this._tick = (t) => this._phys.update(t.deltaMS))
//   ...destroy(): ctx.ticker.remove(this._tick); this._phys.destroy()
import Matter from 'matter-js'
import { DESIGN_W, DESIGN_H } from './theme.js'
import { ON as DIAG, logPhysics } from './gamelog.js'

const { Engine, Composite, Bodies, Body, Vector, Events } = Matter

// Materialförval (kropp-opts) — ger spelen "olika egenskaper" utan magiska tal:
// studsighet (restitution), täthet/massa (density), friktion, luftmotstånd.
export const MATERIALS = {
  // lätt & studsig (boll, gummi)
  bouncy: { restitution: 0.86, friction: 0.05, frictionAir: 0.004, density: 0.0010 },
  // standard
  normal: { restitution: 0.45, friction: 0.25, frictionAir: 0.01, density: 0.0015 },
  // tung & trög (sten, stor bajskorv) — mer massa = mer momentum, mindre studs
  heavy: { restitution: 0.18, friction: 0.5, frictionAir: 0.008, density: 0.0045 },
  // lätt & luftig (fjäder, liten korv) — bromsas av luft, lätt att blåsa iväg
  light: { restitution: 0.5, friction: 0.2, frictionAir: 0.05, density: 0.0005 },
  // klistrig (fastnar, studsar nästan inte)
  sticky: { restitution: 0.02, friction: 0.9, frictionAir: 0.02, density: 0.002 },
}

// MATERIAL — samma sak, fast med en RÖST och ett SPÅR (LYFTPLAN B4).
//
// `MATERIALS` ovan är fyra tal: hur en kropp rör sig. Ett material i verkligheten
// låter också, och lämnar märken. Skillnaden mellan "trä" och "metall" ska höras i
// samma sekund som något slår i, inte bara synas i studshöjden.
//
// **Rösten är syntes, inte klipp — och det är ett mätresultat, inte en genväg.**
// Repot har inga klipp som heter knack/klang/duns/studs/klirr (tillgängliga namn:
// boing · celebrate · correct · djur_* · fart · flip · kristall_klirr · magi ·
// match · plopp · pling · pop · reveal · soft · tap · thwip · whoosh). Ett klipp
// har dessutom EN dynamik: det kan inte bli mjukare när träffen är mjuk. `tone()`
// kan, och det är hela poängen med B5 nedan. Samma skäl som CLAUDE.md ger för att
// `correct`/`match`/`pling` är stämda intervall och inte får bytas mot samplade blipp.
//
// Signaturen ligger under EN nyckel (`mat`) på kroppen i stället för lösa fält:
// matter kopierar okända options rakt på kroppen (`Common.extend`), så `ljud` eller
// `spar` hade fungerat — men matter äger namnrymden och kan ta vilket ord som helst
// i en framtida version. Samma fälla som Pixis `_cx`/`_sx`, en våning ned.
export const MATERIAL = {
  tra: {
    fysik: { restitution: 0.28, friction: 0.55, frictionAir: 0.012, density: 0.0018 },
    ton: 240, typ: 'triangle', dur: 0.09, glid: 0.55, traff: 0x8a5a3b,
  },
  metall: {
    fysik: { restitution: 0.52, friction: 0.12, frictionAir: 0.006, density: 0.0038 },
    ton: 760, typ: 'triangle', dur: 0.22, glid: 0.94, traff: 0xc3ccd4,
  },
  sten: {
    fysik: { restitution: 0.18, friction: 0.62, frictionAir: 0.01, density: 0.0045 },
    ton: 120, typ: 'sine', dur: 0.12, glid: 0.5, traff: 0x9aa4b0,
  },
  gummi: {
    fysik: { restitution: 0.86, friction: 0.35, frictionAir: 0.008, density: 0.0012 },
    ton: 320, typ: 'sine', dur: 0.11, glid: 1.7, traff: null,
  },
  glas: {
    fysik: { restitution: 0.4, friction: 0.08, frictionAir: 0.005, density: 0.0026 },
    ton: 1180, typ: 'sine', dur: 0.14, glid: 1.02, traff: 0xbfe6ff,
  },
}

// Kropp-options ur ett material: fysiken spridd som vanligt (så inget anropsställe
// behöver ändras) + `mat` kvar på kroppen så kollisionen vet vad som slog i vad.
//   this._phys.rectangle(x, y, w, h, mat('tra', { label: 'kloss' }))
export function mat(namn, extra = {}) {
  const m = MATERIAL[namn]
  return m ? { ...m.fysik, mat: namn, ...extra } : { ...extra }
}

export class PhysicsWorld {
  // walls: vilka osynliga väggar som skapas ('floor','left','right','ceiling').
  // wallThickness/extra: tjocklek + hur långt utanför skärmen väggarna sträcker sig.
  // windAx/windAy: konstant vind-ACCELERATION (px/steg²) på alla dynamiska kroppar.
  // bounds: var väggarna står ({left,top,right,bottom}, default designrektangeln).
  //   MEDVETET opt-in, aldrig automatiskt från ctx.view: automatiska view-väggar hade
  //   låtit fysiken på en bred telefon tyst avvika från den testade (1280×720), och
  //   låtit kroppar vila i bleed-zonen där inget spel har någon interaktion. Ett spel
  //   som VILL låta hela den synliga ytan vara spelplan skickar `bounds: { ...ctx.view }`
  //   (ögonblicksbild vid skapandet — väggarna är statiska kroppar).
  constructor({ gravityY = 1, gravityX = 0, walls = ['floor', 'left', 'right'], wallThickness = 120, wallExtra = 200, windAx = 0, windAy = 0, bounds = null } = {}) {
    this.engine = Engine.create()
    this.engine.gravity.x = gravityX
    this.engine.gravity.y = gravityY
    this.world = this.engine.world
    this._links = [] // { body, view, onUpdate? }
    this._alive = true
    this._acc = 0 // ackumulerad realtid för fast tidssteg
    this._frames = 0 // bildruteräknare (alltid på — anslagstaket i onImpact vilar på den)
    this._windAx = windAx
    this._windAy = windAy
    this.walls = []
    this._buildWalls(walls, wallThickness, wallExtra, bounds)
    if (DIAG) this._diagInit({ gravityX, gravityY, walls, windAx, windAy, bounds })
  }

  // --- diagnostik (DEV-only; hela blocket viker ihop till inget i bygget) ---

  _diagInit(opts) {
    this._diag = { frames: 0, bodies: 0, collisions: 0, escaped: new Set(), maxSpeed: 0 }
    logPhysics('skapad', opts)
    // Lyssna på ALLA kollisioner, inte bara de spelet självt bryr sig om.
    Events.on(this.engine, 'collisionStart', (e) => {
      const d = this._diag
      d.collisions += e.pairs.length
      const p = e.pairs[0]
      if (!p) return
      const a = p.bodyA
      const b = p.bodyB
      const rel = Math.hypot((a.velocity.x - b.velocity.x), (a.velocity.y - b.velocity.y))
      logPhysics('kollision', {
        par: e.pairs.length,
        a: a.label || 'kropp',
        b: b.label || 'kropp',
        fartDiff: Number(rel.toFixed(1)),
        studs: Number(((a.restitution + b.restitution) / 2).toFixed(2)),
        friktion: Number(((a.friction + b.friction) / 2).toFixed(2)),
        totalt: d.collisions,
      })
    })
  }

  // Kör var 30:e bildruta: kroppsräkning, sovande, utrymningar, NaN, toppfart.
  _diagSample() {
    const d = this._diag
    const all = Composite.allBodies(this.world)
    let dyn = 0
    let sleeping = 0
    let maxSpeed = 0
    for (const b of all) {
      if (b.isStatic) continue
      dyn++
      if (b.isSleeping) sleeping++
      const { x, y } = b.position
      if (!isFinite(x) || !isFinite(y)) {
        logPhysics('nan-kropp', { label: b.label || 'kropp', x, y })
        continue
      }
      const s = Math.hypot(b.velocity.x, b.velocity.y)
      if (s > maxSpeed) maxSpeed = s
      const ute = x < -600 || x > DESIGN_W + 600 || y > DESIGN_H + 600 || y < -1200
      if (ute && !d.escaped.has(b.id)) {
        d.escaped.add(b.id)
        logPhysics('rymde', { label: b.label || 'kropp', x: Math.round(x), y: Math.round(y) })
      } else if (!ute && d.escaped.has(b.id)) {
        d.escaped.delete(b.id)
      }
    }
    if (maxSpeed > d.maxSpeed) d.maxSpeed = maxSpeed
    // >40 px/steg ≈ 2400 px/s: en boll kan hoppa förbi en tunn vägg mellan två steg.
    if (maxSpeed > 40) logPhysics('hog-fart', { fart: Math.round(maxSpeed), risk: 'tunnling' })
    logPhysics('prov', {
      kroppar: dyn,
      sovande: sleeping,
      statiska: all.length - dyn,
      lankar: this._links.length,
      toppfart: Math.round(d.maxSpeed),
      gravitation: this.engine.gravity.y,
      vind: this._windAx,
    })
  }

  // Sätt vind-acceleration (px/steg²). Verkar på alla dynamiska kroppar oavsett massa
  // (force = massa × acceleration), så lätta saker blåser iväg lika "naturligt".
  setWind(ax, ay = 0) {
    this._windAx = ax
    this._windAy = ay
  }

  get gravityY() {
    return this.engine.gravity.y
  }
  setGravity(y, x = this.engine.gravity.x) {
    this.engine.gravity.y = y
    this.engine.gravity.x = x
  }

  _buildWalls(which, t, ex, bounds) {
    const L = bounds?.left ?? 0
    const T = bounds?.top ?? 0
    const R = bounds?.right ?? DESIGN_W
    const B = bounds?.bottom ?? DESIGN_H
    const W = R - L
    const H = B - T
    const opt = { isStatic: true, restitution: 0.4, friction: 0.6, label: 'wall' }
    const defs = {
      floor: [L + W / 2, B + t / 2, W + ex * 2, t],
      ceiling: [L + W / 2, T - t / 2, W + ex * 2, t],
      left: [L - t / 2, T + H / 2, t, H + ex * 2],
      right: [R + t / 2, T + H / 2, t, H + ex * 2],
    }
    for (const name of which) {
      const d = defs[name]
      if (!d) continue
      const b = Bodies.rectangle(d[0], d[1], d[2], d[3], opt)
      this.walls.push(b)
      Composite.add(this.world, b)
    }
  }

  // --- kropp-fabriker (designkoordinater) ---
  //
  // isStatic HANTERAS SEPARAT, aldrig via options. En kropp som skapas med
  // `{ isStatic: true }` får flaggan satt som en vanlig egenskap — Body.setStatic()
  // körs aldrig, så `_original` (massa · tröghet · densitet) fångas ALDRIG. Ett senare
  // `Body.setStatic(kropp, false)` hittar då inget att återställa: kroppen blir dynamisk
  // med massa och tröghet kvar på Infinity, och första simsteget ger Infinity/Infinity
  // = NaN-position. Kroppen försvinner, dess länkade Pixi-vy följer med, och INGET
  // konsolfel skrivs. Bygg-tornets klossar dog exakt så (mätt: nan-kropp ×5 per körning).
  // Genom att skapa dynamiskt och sätta statiskt EFTERÅT går kroppen alltid att väcka.
  _make(body, opts) {
    if (opts.isStatic) Body.setStatic(body, true)
    return this._add(body)
  }

  rectangle(x, y, w, h, opts = {}) {
    const { isStatic, ...rest } = opts
    return this._make(Bodies.rectangle(x, y, w, h, rest), opts)
  }

  circle(x, y, r, opts = {}) {
    const { isStatic, ...rest } = opts
    return this._make(Bodies.circle(x, y, r, rest), opts)
  }

  polygon(x, y, sides, r, opts = {}) {
    const { isStatic, ...rest } = opts
    return this._make(Bodies.polygon(x, y, sides, r, rest), opts)
  }

  _add(body) {
    Composite.add(this.world, body)
    return body
  }

  add(body) {
    return this._add(body)
  }

  // Koppla en Pixi-display till en kropp så den följer position+rotation varje steg.
  // onUpdate(view, body) kör efter synk om du vill lägga till egen logik.
  link(body, view, onUpdate) {
    const rec = { body, view, onUpdate }
    this._links.push(rec)
    return rec
  }

  // Ta bort en kropp (och sluta synka dess display). Förstör INTE Pixi-objektet.
  removeBody(body) {
    if (!body) return
    Composite.remove(this.world, body)
    const i = this._links.findIndex((l) => l.body === body)
    if (i >= 0) this._links.splice(i, 1)
  }

  // Antal aktiva (icke-statiska, länkade) kroppar.
  get count() {
    return this._links.length
  }

  onCollision(handler) {
    if (!this._alive) return
    Events.on(this.engine, 'collisionStart', handler)
    return () => Events.off(this.engine, 'collisionStart', handler)
  }

  // ---- Anslag: hur HÅRT något slog i (LYFTPLAN B5) -------------------------
  //
  // Den billigaste juicen som finns. `rel = |vA − vB|` räknades redan ut, men bara
  // för diagnostikloggen — inget av de 23 fysikspelen mappade den till något barnet
  // kan höra. En kloss som nuddar och en kloss som dundrar lät exakt likadant.
  //
  // handler får { a, b, speed, styrka, x, y, material, traff }:
  //   speed    px/steg (matters enhet). ~1 = nuddar, ~14 = riktig smäll.
  //   styrka   0…1, redan klämd — det värdet ett spel vill tuna volym/skala mot.
  //   x, y     kontaktpunkten (matters `supports`, annars kropparnas mittpunkt).
  //   material materialnyckeln för den kropp som bär en (`mat()`), annars null.
  //
  // TAKET ÄR INTE VALFRITT. En domino-kedja eller en rasande stapel ger tiotals
  // par i EN bildruta; utan tak blir det ett skrik, inte en duns — och P0 säger
  // uttryckligen att återkoppling ska vara rolig, aldrig en summer.
  onImpact(handler, { minSpeed = 1.6, hardSpeed = 14, maxPerFrame = 3 } = {}) {
    if (!this._alive) return
    let ruta = -1
    let iRutan = 0
    return this.onCollision((e) => {
      if (!this._alive) return
      if (this._frames !== ruta) {
        ruta = this._frames
        iRutan = 0
      }
      for (const p of e.pairs) {
        if (iRutan >= maxPerFrame) return
        const a = p.bodyA
        const b = p.bodyB
        const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y)
        if (!(rel >= minSpeed)) continue // NaN faller ut här med, inte bara små tal
        iRutan++
        const s = p.collision?.supports?.[0]
        const namn = a.mat || b.mat || null
        handler({
          a,
          b,
          speed: rel,
          styrka: Math.min(1, (rel - minSpeed) / Math.max(0.001, hardSpeed - minSpeed)),
          x: s ? s.x : (a.position.x + b.position.x) / 2,
          y: s ? s.y : (a.position.y + b.position.y) / 2,
          material: namn,
          traff: namn ? MATERIAL[namn]?.traff ?? null : null,
        })
      }
    })
  }

  // En rad ger ett helt spel hörbar tyngd:  this._phys.impactAudio(ctx.services.audio)
  //
  // Hårdare anslag = högre OCH ljusare. Bara volym räcker inte: örat läser tonhöjd
  // som kraft, och två träffar med samma tonhöjd men olika volym låter som samma
  // träff på olika avstånd. `standard` används för kroppar utan eget material.
  impactAudio(audio, { standard = 'tra', minSpeed = 1.6, hardSpeed = 14, vol = 0.24, maxPerFrame = 3, minGapMs = 28 } = {}) {
    if (!audio?.tone) return
    let sistAt = -1e9
    return this.onImpact(
      (h) => {
        // Egen paus mellan toner: audio.tone() går med flit förbi sfx():s 30 ms-golv
        // (varje ton har egen tonhöjd), så taket måste sitta här. VÄGGKLOCKA, inte
        // bildrutor: vid 30 fps hade ett bildrutebaserat golv blivit dubbelt så långt
        // i verklig tid, alltså tystare juice på svagare enheter — precis tvärtemot.
        const nu = typeof performance !== 'undefined' ? performance.now() : Date.now()
        if (nu - sistAt < minGapMs) return
        sistAt = nu
        const m = MATERIAL[h.material || standard] || MATERIAL.tra
        const f = m.ton * (0.86 + 0.34 * h.styrka)
        audio.tone({
          freq: f,
          slideTo: f * m.glid,
          dur: m.dur * (0.7 + 0.5 * h.styrka),
          type: m.typ,
          vol: vol * (0.3 + 0.7 * h.styrka),
        })
      },
      { minSpeed, hardSpeed, maxPerFrame }
    )
  }

  // Stega fysiken och synka rendering. deltaMS från ctx.ticker.
  // matter.js vill ha ETT FAST tidssteg — variabelt dt gör kollisioner/impulser
  // opålitliga (t.ex. en domino-kedja som inte fortplantar sig). Vi ackumulerar
  // realtid och kör fasta 1/60-steg (max 5 per bildruta för att undvika dödsspiral).
  update(deltaMS) {
    if (!this._alive) return
    this._frames++
    const FIXED = 1000 / 60
    this._acc += Math.min(deltaMS || FIXED, 100) // klamp stora hopp (flik-byte)
    let steps = 0
    const windy = this._windAx !== 0 || this._windAy !== 0
    while (this._acc >= FIXED && steps < 5) {
      if (windy) {
        const bodies = Composite.allBodies(this.world)
        for (let b = 0; b < bodies.length; b++) {
          const body = bodies[b]
          if (body.isStatic || body.isSleeping) continue
          Body.applyForce(body, body.position, { x: body.mass * this._windAx, y: body.mass * this._windAy })
        }
      }
      Engine.update(this.engine, FIXED)
      this._acc -= FIXED
      steps++
    }
    if (steps >= 5) this._acc = 0 // släpp efterskott istället för att spiralera
    if (DIAG) {
      if (steps >= 5) logPhysics('svalt', { steg: steps, deltaMS: Math.round(deltaMS) })
      if (++this._diag.frames % 30 === 0) this._diagSample()
    }
    const links = this._links
    for (let i = 0; i < links.length; i++) {
      const l = links[i]
      const v = l.view
      if (!v || v.destroyed) continue
      v.x = l.body.position.x
      v.y = l.body.position.y
      v.rotation = l.body.angle
      if (l.onUpdate) l.onUpdate(v, l.body)
    }
  }

  destroy() {
    this._alive = false
    if (DIAG && this._diag) {
      logPhysics('riven', { kollisioner: this._diag.collisions, toppfart: Math.round(this._diag.maxSpeed), rutor: this._diag.frames })
    }
    try {
      Events.off(this.engine)
      Composite.clear(this.world, false)
      Engine.clear(this.engine)
    } catch {
      /* noop */
    }
    this._links = []
    this.walls = []
  }
}

// Bekvämt omslag: skjut en impuls/hastighet på en kropp.
export function nudge(body, vx, vy) {
  Body.setVelocity(body, { x: vx, y: vy })
}

export function applyForce(body, fx, fy) {
  Body.applyForce(body, body.position, { x: fx, y: fy })
}

// KRAFTENHETER — den enskilt dyraste fällan i repots fysikkod, nu på ETT ställe.
//
// matter räknar `velocity += (force / massa) · dt²` med fast dt = 16,667 ms, och drar
// av `frictionAir` varje steg. En konstant acceleration `a` ger därför sluthastigheten
//
//     v∞ = a · 277,78 / frictionAir
//
// Ett tal som ser ut som "0,7 px/steg drift" blir alltså ~280× för starkt om det skickas
// rakt in som kraft. Det hände på riktigt: `magnet-fiske` sög in hela dammen i den
// PARKERADE magneten på under en sekund (uppmätt toppfart 79 px/steg, saker for rakt
// igenom dammens 40 px tjocka väggar). Skriv konstanter i **px/steg — den fart de ska
// ge** — och gå genom den här funktionen.
//
// Utan luftmotstånd finns ingen sluthastighet alls; då tolkas talet som den fart kroppen
// når efter ETT steg.
export const STEG2 = (1000 / 60) ** 2 // 277,78 — matters dt² vid fast tidssteg

export function speedToAccel(pxPerStep, frictionAir = 0) {
  return frictionAir > 0 ? (pxPerStep * frictionAir) / STEG2 : pxPerStep / STEG2
}

// Förutsäg en kastbana (för en prickad sikt-förhandsvisning). Lättviktig Euler-sim av
// en punktmassa under gravitation + vind, med valfri studs mot golv/väggar. Detta är
// en VISUELL guide (matchar matter ungefär, inte exakt) — spelen är ändå no-fail.
// gy/wx = px per steg² (tuna gy ~0.4–0.6 så pricklinjen följer kroppens verkliga fall).
export function predictTrajectory({ x, y, vx, vy, gy = 0.5, wx = 0, steps = 60, every = 3, floorY = null, leftX = null, rightX = null, restitution = 0.55, damp = 0.995 }) {
  const pts = []
  let px = x
  let py = y
  let pvx = vx
  let pvy = vy
  for (let i = 0; i < steps; i++) {
    pvy += gy
    pvx += wx
    pvx *= damp
    pvy *= damp
    px += pvx
    py += pvy
    if (floorY != null && py > floorY) {
      py = floorY
      pvy = -Math.abs(pvy) * restitution
    }
    if (leftX != null && px < leftX) {
      px = leftX
      pvx = Math.abs(pvx) * restitution
    }
    if (rightX != null && px > rightX) {
      px = rightX
      pvx = -Math.abs(pvx) * restitution
    }
    if (i % every === 0) pts.push({ x: px, y: py })
  }
  return pts
}

export { Matter, Body, Composite, Bodies, Vector }
