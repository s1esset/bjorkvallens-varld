// Positiv återkoppling: studs, puls, vingel, konfetti, gnistror.
// All "belöning" är kort (1–2s) och aldrig bestraffande (se CLAUDE.md).
import { Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PLAYFUL, FONT } from './theme.js'
import { spray, rain } from './partiklar.js'

// Partikeleffekterna nedan (puff/burst/sparkle/bigCelebration) kör i första hand via
// lib/partiklar.js: ETT ParticleContainer per lager och EN tween per svärm, i stället
// för en Graphics + en tween per partikel. Kan arket inte byggas (ingen DOM, inget
// 2D-context) returnerar spray()/rain() false och Graphics-vägen nedanför tar över
// oförändrad — de gamla kropparna står kvar just för att den fallbacken ska finnas.
//
// Rörelsekurvorna är medvetet identiska (samma power2.out på avstånd, alpha och
// skala), så växlingen i sig syns inte. Det som syns är TÄTHETEN: partiklarna är
// numera så billiga att DENSITY i partiklar.js sätter tre gånger så många i luften.

// --- Vilolägen -------------------------------------------------------------
// Effekterna nedan (pop/wiggle/shake/breathe) återgår till objektets VILOLÄGE när de
// är klara. Läser man viloläget medan en effekt redan pågår blir det uppblåsta/
// förskjutna värdet den nya basen, och objektet drar iväg för varje ny trigger:
// pop gav 1.18 -> 1.39 -> 1.64 -> 1.94 ... tills objektet täckte skärmen (rapporterat
// i enhorning-glitterbajs och loopdjuren; pop används i 64 av spelen).
// Därför: basen läses BARA när ingen effekt av samma sort pågår. Ett spel som
// medvetet ändrar vilo-skalan (t.ex. en snöboll som växer) fångas alltså upp
// nästa gång objektet står stilla.
function restScale(target) {
  if (!target._fxScaleBusy || !target._fxRestScale) {
    target._fxRestScale = { x: target.scale.x || 1, y: target.scale.y || 1 }
  }
  return target._fxRestScale
}

// Studsar in ett objekt (skala 0 -> 1).
export function bounceIn(target, { delay = 0, duration = 0.45 } = {}) {
  if (!target || target.destroyed) return
  const base = restScale(target)
  target._fxScaleBusy = true
  target.scale.set(0)
  return gsap.to(target.scale, {
    x: base.x, y: base.y, duration, delay, ease: 'back.out(1.7)',
    onComplete: () => { target._fxScaleBusy = false },
  })
}

// Snabb glad puls (vid lyckad handling).
export function pop(target, { scale = 1.18 } = {}) {
  if (!target || target.destroyed) return
  // VIKTIGT: döda den FÖRRA timelinen explicit. gsap.killTweensOf(scale) dödar bara
  // barn-tweensen — timelinen lever vidare och fyrar sin onComplete mitt under nästa
  // puls, nollställer "pågår"-flaggan, och då läses den uppblåsta skalan som ny bas.
  target._fxPopTl?.kill()
  const base = restScale(target)
  gsap.killTweensOf(target.scale)
  target._fxScaleBusy = true
  const tl = gsap
    .timeline({
      onComplete: () => {
        target._fxScaleBusy = false
        target._fxPopTl = null
        if (!target.destroyed) target.scale.set(base.x, base.y)
      },
    })
    .to(target.scale, { x: base.x * scale, y: base.y * scale, duration: 0.12, ease: 'power2.out' })
    .to(target.scale, { x: base.x, y: base.y, duration: 0.22, ease: 'back.out(2.4)' })
  target._fxPopTl = tl
  return tl
}

// Vänlig vingel (vid "fel"/tomt — aldrig en bestraffning, bara lekfullt).
export function wiggle(target) {
  if (!target || target.destroyed) return
  // Samma fälla som pop: mitt i en vingel är rotationen förskjuten, och att läsa den
  // som bas gör att objektet vrider sig längre och längre för varje tryck.
  target._fxWiggleTl?.kill()
  if (!target._fxWiggleBusy) target._fxRestRot = target.rotation
  const r = target._fxRestRot || 0
  gsap.killTweensOf(target, 'rotation')
  target._fxWiggleBusy = true
  const wtl = gsap
    .timeline({
      onComplete: () => {
        target._fxWiggleBusy = false
        target._fxWiggleTl = null
        if (!target.destroyed) target.rotation = r
      },
    })
    .to(target, { rotation: r + 0.12, duration: 0.06 })
    .to(target, { rotation: r - 0.12, duration: 0.06 })
    .to(target, { rotation: r + 0.08, duration: 0.06 })
    .to(target, { rotation: r, duration: 0.06 })
  target._fxWiggleTl = wtl
  return wtl
}

// Liten partikelpuff på en plats (t.ex. när en bubbla poppas).
export function puff(layer, x, y, { count = 8, color } = {}) {
  if (
    spray(layer, x, y, {
      count,
      former: ['cirkel'],
      colors: color != null ? [color] : PLAYFUL,
      size: 10,
      sizeVar: 0.4,
      sizeTo: 0.2,
      dist: 75,
      distVar: 0.47,
      life: 0.65,
      lifeVar: 0.23,
    })
  ) {
    return
  }
  for (let i = 0; i < count; i++) {
    const p = new Graphics().circle(0, 0, 6 + Math.random() * 8).fill(color ?? PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
    p.x = x
    p.y = y
    p.eventMode = 'none'
    layer.addChild(p)
    const ang = Math.random() * Math.PI * 2
    const dist = 40 + Math.random() * 70
    // Tweena ett vanligt JS-objekt och kopiera till Pixi-objektet endast om det
    // lever. Ett förstört objekt (t.ex. vid spel-exit) hoppas över -> kan ALDRIG
    // krascha på null-transform.
    const st = { x, y, s: 1, a: 1 }
    const tw = gsap.to(st, {
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      s: 0.2,
      a: 0,
      duration: 0.5 + Math.random() * 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (p.destroyed) {
          tw.kill()
          return
        }
        p.x = st.x
        p.y = st.y
        p.alpha = st.a
        p.scale.set(st.s)
      },
      onComplete: () => {
        if (!p.destroyed) p.destroy()
      },
    })
  }
}

// Stor men kort hyllning: konfetti regnar över skärmen.
export function bigCelebration(layer, { width = 1280, height = 720 } = {}) {
  const N = 60
  if (rain(layer, { width, height, count: N })) return
  for (let i = 0; i < N; i++) {
    const size = 12 + Math.random() * 14
    const c = new Graphics()
    if (Math.random() < 0.5) c.rect(-size / 2, -size / 2, size, size).fill(PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
    else c.circle(0, 0, size / 2).fill(PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
    const x0 = Math.random() * width
    const y0 = -20 - Math.random() * height * 0.5
    const rot0 = Math.random() * Math.PI
    c.x = x0
    c.y = y0
    c.rotation = rot0
    c.eventMode = 'none'
    layer.addChild(c)
    // Samma robusta mönster: tweena ett JS-objekt, kopiera bara om konfettin lever.
    const st = { x: x0, y: y0, r: rot0 }
    const tw = gsap.to(st, {
      x: x0 + (Math.random() * 160 - 80),
      y: height + 40,
      r: rot0 + (Math.random() * 6 - 3),
      duration: 1.6 + Math.random() * 1.2,
      delay: Math.random() * 0.4,
      ease: 'power1.in',
      onUpdate: () => {
        if (c.destroyed) {
          tw.kill()
          return
        }
        c.x = st.x
        c.y = st.y
        c.rotation = st.r
      },
      onComplete: () => {
        if (!c.destroyed) c.destroy()
      },
    })
  }
}

// Svävande text/emoji som stiger och tonar bort (t.ex. "Hihi!" eller 😄).
// Exit-säker: tweenar ett vanligt objekt och rör Pixi-objektet bara om det lever.
export function floatText(layer, x, y, text, { fontSize = 54, rise = 90, duration = 0.9, fontFamily = FONT.body } = {}) {
  const t = new Text({ text, style: { fontFamily, fontSize } })
  t.anchor.set(0.5)
  t.position.set(x, y)
  t.eventMode = 'none'
  layer.addChild(t)
  const st = { y, a: 1 }
  const tw = gsap.to(st, {
    y: y - rise,
    a: 0,
    duration,
    ease: 'power1.out',
    onUpdate: () => {
      if (t.destroyed) {
        tw.kill()
        return
      }
      t.y = st.y
      t.alpha = st.a
    },
    onComplete: () => {
      if (!t.destroyed) t.destroy()
    },
  })
  return t
}

// Expanderande ring vid en pekning (mjuk, "vatten-ring"-känsla). Exit-säker.
export function ripple(layer, x, y, { color = 0xffffff, maxR = 80, duration = 0.5, width = 6, alpha = 0.6 } = {}) {
  const g = new Graphics()
  g.position.set(x, y)
  g.eventMode = 'none'
  layer.addChild(g)
  const st = { r: Math.max(4, maxR * 0.12), a: alpha }
  const tw = gsap.to(st, {
    r: maxR,
    a: 0,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      if (g.destroyed) {
        tw.kill()
        return
      }
      g.clear().circle(0, 0, st.r).stroke({ width, color, alpha: st.a })
    },
    onComplete: () => {
      if (!g.destroyed) g.destroy()
    },
  })
}

// Mjuk, kort skärmskakning (ALDRIG hård) — för en stor krock/firande. Exit-säker.
export function shake(target, { intensity = 8, duration = 0.4 } = {}) {
  if (!target || target.destroyed) return
  // Samma fälla igen: mitt i en skakning ligger objektet på en förskjuten position.
  // Läses den som bas vandrar objektet iväg lite för varje ny skakning.
  // Shakes tween ligger på ett lokalt proxy-objekt, så killTweensOf(target) rör den inte —
  // överlappande skakningar slåss annars om target.x/y och basen vandrar.
  target._fxShakeTw?.kill()
  if (!target._fxShakeBusy) target._fxRestPos = { x: target.x, y: target.y }
  const bx = target._fxRestPos.x
  const by = target._fxRestPos.y
  target._fxShakeBusy = true
  const st = { p: 1 }
  const tw = gsap.to(st, {
    p: 0,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      if (target.destroyed) {
        tw.kill()
        return
      }
      const m = st.p * intensity
      target.x = bx + (Math.random() * 2 - 1) * m
      target.y = by + (Math.random() * 2 - 1) * m
    },
    onComplete: () => {
      target._fxShakeBusy = false
      target._fxShakeTw = null
      if (!target.destroyed) {
        target.x = bx
        target.y = by
      }
    },
  })
  target._fxShakeTw = tw
  return tw
}

// Saftig partikel-explosion (mix av cirklar + stjärnor i glada färger), något
// kraftigare än puff — för delfiranden/milstolpar. Exit-säker.
export function burst(layer, x, y, { count = 14, colors = PLAYFUL, power = 1 } = {}) {
  if (
    spray(layer, x, y, {
      count,
      // 2 av 5 = 40 % stjärnor, samma blandning som Graphics-vägen nedan.
      former: ['stjarna', 'stjarna', 'cirkel', 'cirkel', 'cirkel'],
      colors,
      size: 8.5,
      sizeVar: 0.41,
      sizeTo: 0.3,
      dist: 95 * power,
      distVar: 0.47,
      spin: 3,
      life: 0.8,
      lifeVar: 0.25,
    })
  ) {
    return
  }
  for (let i = 0; i < count; i++) {
    const col = colors[(Math.random() * colors.length) | 0]
    const p = new Graphics()
    const r = 5 + Math.random() * 7
    if (Math.random() < 0.4 && p.star) p.star(0, 0, 5, r, r * 0.5).fill(col)
    else p.circle(0, 0, r).fill(col)
    p.position.set(x, y)
    p.eventMode = 'none'
    layer.addChild(p)
    const ang = Math.random() * Math.PI * 2
    const dist = (50 + Math.random() * 90) * power
    const st = { x, y, a: 1, s: 1, rot: 0 }
    const tw = gsap.to(st, {
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      a: 0,
      s: 0.3,
      rot: (Math.random() * 2 - 1) * 3,
      duration: 0.6 + Math.random() * 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (p.destroyed) {
          tw.kill()
          return
        }
        p.x = st.x
        p.y = st.y
        p.alpha = st.a
        p.scale.set(st.s)
        p.rotation = st.rot
      },
      onComplete: () => {
        if (!p.destroyed) p.destroy()
      },
    })
  }
}

// Lugn idle-puls (skala andas) för att locka pekning på rätt objekt. Returnerar
// tween:en så anroparen kan döda den (eller låt exit-vakten döda den). Exit-säker.
export function breathe(target, { scale = 1.08, duration = 0.9 } = {}) {
  if (!target || target.destroyed) return
  // Andningen loopar för alltid, så den får INTE ärva ett pågående pop-läge som bas.
  const base = restScale(target)
  const sx = base.x
  const sy = base.y
  const st = { s: 1 }
  const tw = gsap.to(st, {
    s: scale,
    duration,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    onUpdate: () => {
      if (target.destroyed) {
        tw.kill()
        return
      }
      target.scale.set(sx * st.s, sy * st.s)
    },
  })
  return tw
}

// Gnistor runt en punkt (vid match).
export function sparkle(layer, x, y, { count = 6 } = {}) {
  if (
    spray(layer, x, y, {
      count,
      former: ['gnista'],
      colors: [0xfff3b0],
      size: 7.5,
      sizeVar: 0.33,
      sizeTo: 1, // gnistor krympte aldrig, de tonade bara bort
      dist: 50,
      distVar: 0,
      jamn: true, // jämnt fördelade runt punkten, som förut
      life: 0.6,
      lifeVar: 0,
    })
  ) {
    return
  }
  for (let i = 0; i < count; i++) {
    const s = new Graphics()
    const r = 5 + Math.random() * 5
    s.star?.(0, 0, 4, r, r * 0.45)
    if (!s.star) s.circle(0, 0, r).fill(0xfff3b0)
    else s.fill(0xfff3b0)
    s.x = x
    s.y = y
    s.eventMode = 'none'
    layer.addChild(s)
    const ang = (i / count) * Math.PI * 2
    const st = { x, y, a: 1 }
    const tw = gsap.to(st, {
      x: x + Math.cos(ang) * 50,
      y: y + Math.sin(ang) * 50,
      a: 0,
      duration: 0.6,
      onUpdate: () => {
        if (s.destroyed) {
          tw.kill()
          return
        }
        s.x = st.x
        s.y = st.y
        s.alpha = st.a
      },
      onComplete: () => {
        if (!s.destroyed) s.destroy()
      },
    })
  }
}
