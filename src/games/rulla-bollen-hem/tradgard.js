// Trädgården runt planen i Rulla Bollen Hem (L2). Planen är en minigolfbana i en omgärdad
// trädgård: en vedkant som reser sig ur gräset, en tät häck runt hela banan (i flera djupled —
// bakre och främre rad), ett litet hus bakom målet där bollen ska "hem", ett äppelträd, en
// blomsterrabatt längst ned och en fjäril som fladdrar förbi.
//
// ALLT är dekor: eventMode 'none', ritas en gång (noll texturbakningar — bara platta fyllningar),
// och de få rörliga delarna är gsap-tweens som samlas i `tweens` och dödas i `destroy()`.
// Tweens på barn (rökpuffar, vingar, rabatt) når inte `killTweensOf(root)`, därför listan.
//
// Inget högt bakom skalets knappar uppe till vänster (x < 200, y < 160): där ligger bara
// häcken, träd och hus står längre in. Allt ligger BAKOM planen och spelobjekten.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

const W = 1280
const H = 720
const FIELD = { x: 60, y: 120, w: 1160, h: 560, r: 32 }

const HEDGE_DARK = 0x2f7a35
const HEDGE_MID = 0x3f9140
const HEDGE_LIGHT = 0x58aa4b
const HEDGE_HI = 0x86c96a
const PETALS = [0xff9ec4, 0xffd35c, 0xffffff, 0xff8a6b, 0xc9a8ff]

const rnd = (a, b) => a + Math.random() * (b - a)

function bush(g, x, y, r, base, hi) {
  g.circle(x, y, r).fill(base)
  g.circle(x - r * 0.28, y - r * 0.3, r * 0.56).fill({ color: hi, alpha: 0.55 })
}

function smallFlower(g, x, y, r, col) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    g.circle(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.62).fill(col)
  }
  g.circle(x, y, r * 0.55).fill(0xffe27a)
}

// Häcken: bakre rad (mörk, högre) + främre rad (ljusare, lägre) uppe, två kolumner på varje
// sida. Bleed-ytorna utanför 0..1280 fylls med samma rader så en bred telefon inte ser kala kanter.
function buildHedge() {
  const X0 = -BLEED_X
  const X1 = W + BLEED_X
  const g = new Graphics()
  // Mörk botten så ingen gräsglugg lyser mellan buskarna.
  g.rect(X0, -BLEED_Y, X1 - X0, 100 + BLEED_Y).fill(HEDGE_DARK)
  g.rect(X0, 90, FIELD.x - 6 - X0, H + BLEED_Y - 90).fill(HEDGE_DARK)
  g.rect(FIELD.x + FIELD.w + 6, 90, X1 - (FIELD.x + FIELD.w + 6), H + BLEED_Y - 90).fill(HEDGE_DARK)

  // Bakre rad uppe.
  for (let x = X0 - 10; x < X1 + 40; x += 54) bush(g, x + rnd(-6, 6), rnd(24, 34), rnd(34, 40), HEDGE_DARK, HEDGE_MID)

  // Sidorna: yttre kolumner först (längst bort), de inre sist.
  const sidor = (xs, dir) => {
    for (let k = xs.length - 1; k >= 0; k--) {
      const col = k === 0 ? HEDGE_LIGHT : k === 1 ? HEDGE_MID : HEDGE_DARK
      for (let y = 80 + (k % 2) * 22; y < H + BLEED_Y + 40; y += 46) {
        bush(g, xs[k] + dir * rnd(-3, 3), y + rnd(-4, 4), rnd(28, 33), col, HEDGE_HI)
      }
    }
  }
  const left = []
  for (let x = 24; x > X0 - 40; x -= 40) left.push(x)
  const right = []
  for (let x = W - 24; x < X1 + 40; x += 40) right.push(x)
  sidor(left, 1)
  sidor(right, -1)
  return g
}

// Främre häckraden uppe — med en lucka där huset står, så fasaden syns.
function buildHedgeFront(gapA, gapB) {
  const g = new Graphics()
  for (let x = -BLEED_X - 10; x < W + BLEED_X + 40; x += 50) {
    if (x > gapA && x < gapB) continue
    bush(g, x + rnd(-5, 5), rnd(78, 88), rnd(30, 35), HEDGE_LIGHT, HEDGE_HI)
  }
  // Blommor i häcken.
  for (let i = 0; i < 46; i++) {
    const x = rnd(-BLEED_X, W + BLEED_X)
    if (x > gapA - 10 && x < gapB + 10) continue
    smallFlower(g, x, rnd(60, 100), rnd(3.5, 5.5), PETALS[(Math.random() * PETALS.length) | 0])
  }
  for (let i = 0; i < 40; i++) {
    const left = Math.random() < 0.5
    const x = left ? rnd(-BLEED_X, 40) : rnd(W - 40, W + BLEED_X)
    smallFlower(g, x, rnd(110, H + BLEED_Y - 10), rnd(3.5, 5.5), PETALS[(Math.random() * PETALS.length) | 0])
  }
  return g
}

// Vedkanten: en rest träbräda runt hela banan med mörk undersida och ljus kant. Planens egen
// gräskant ligger innanför. Bollens studskanter (WALL) är orörda — det här är bara bilden.
function buildBoard() {
  const g = new Graphics()
  const { x, y, w, h, r } = FIELD
  // Mjuk skugga mot gräset/häcken.
  g.roundRect(x - 14, y - 4, w + 28, h + 28, r + 14).fill({ color: 0x14300d, alpha: 0.3 })
  // Brädans tjocklek (undersida) och ovansida.
  g.roundRect(x - 16, y - 8, w + 32, h + 32, r + 16).fill(0x6c4826)
  g.roundRect(x - 16, y - 16, w + 32, h + 32, r + 16).fill(0xa4723f)
  // Ljus kant och träådring.
  g.roundRect(x - 15, y - 15, w + 30, h + 30, r + 15).stroke({ width: 2, color: 0xd0985c, alpha: 0.8 })
  for (let gx = x + 40; gx < x + w - 40; gx += 96) {
    g.moveTo(gx, y - 12).lineTo(gx + 30, y - 12).stroke({ width: 2, color: 0x7e5530, alpha: 0.55, cap: 'round' })
    g.moveTo(gx + 44, y + h + 8).lineTo(gx + 76, y + h + 8).stroke({ width: 2, color: 0x7e5530, alpha: 0.55, cap: 'round' })
  }
  // Fyra skruvhuvuden i hörnen.
  for (const [sx, sy] of [[x - 6, y - 6], [x + w + 6, y - 6], [x - 6, y + h + 6], [x + w + 6, y + h + 6]]) {
    g.circle(sx, sy, 3.5).fill(0x5a3a1c)
    g.circle(sx - 1, sy - 1, 1.4).fill({ color: 0xffffff, alpha: 0.4 })
  }
  return g
}

// Huset bakom målet. Origo = fasadens nederkant (vilar mot vedkanten).
function buildCottage(tweens) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  g.rect(36, -90, 16, 36).fill(0xb5523c) // skorsten
  g.rect(33, -96, 22, 8).fill(0x8f3f2e)
  g.rect(-64, -66, 128, 66).fill(0xfff1d6) // vägg
  g.rect(-64, -12, 128, 12).fill({ color: 0xe9d3a8, alpha: 0.7 }) // sockel
  g.poly([-80, -60, 0, -98, 80, -60]).fill(0xd9544d) // tak
  g.poly([-80, -60, 0, -98, 0, -90, -70, -60]).fill({ color: 0xffffff, alpha: 0.16 })
  g.moveTo(-80, -60).lineTo(0, -98).lineTo(80, -60).stroke({ width: 5, color: 0xa73a36, join: 'round', cap: 'round' })
  g.rect(-14, -32, 28, 32).fill(0x8a5a3b) // dörr
  g.circle(0, -32, 14).fill(0x8a5a3b)
  g.circle(7, -22, 2.6).fill(0xffd35c)
  for (const wx of [-50, 26]) {
    g.roundRect(wx, -52, 24, 24, 4).fill(0x9bd7f5).stroke({ width: 3, color: 0xfffdf7 })
    g.moveTo(wx + 12, -52).lineTo(wx + 12, -28).stroke({ width: 2, color: 0xfffdf7 })
    g.moveTo(wx, -40).lineTo(wx + 24, -40).stroke({ width: 2, color: 0xfffdf7 })
    g.roundRect(wx - 3, -26, 30, 7, 3).fill(0x8a5a3b)
    smallFlower(g, wx + 4, -29, 3.4, 0xff9ec4)
    smallFlower(g, wx + 20, -29, 3.4, 0xffd35c)
  }
  c.addChild(g)

  // Rök ur skorstenen: tre puffar i förskjuten loop.
  for (let i = 0; i < 3; i++) {
    const p = new Graphics().circle(0, 0, 9).fill({ color: 0xffffff, alpha: 0.7 })
    p.position.set(44, -98)
    p.alpha = 0
    c.addChild(p)
    const st = { t: 0 }
    const tw = gsap.to(st, {
      t: 1,
      duration: 2.6,
      delay: i * 0.87,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        if (p.destroyed) { tw.kill(); return }
        p.x = 44 + st.t * 46 + i * 2
        p.y = -98 - st.t * 12
        p.alpha = Math.sin(st.t * Math.PI) * 0.7
        p.scale.set(0.5 + st.t * 0.8)
      },
    })
    tweens.push(tw)
  }
  return c
}

// Äppelträd: stam + krona som vajar lätt kring foten.
function buildTree(tweens) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  g.roundRect(-9, -68, 18, 68, 5).fill(0x7a5230)
  g.circle(-26, -56, 30).fill(HEDGE_MID)
  g.circle(26, -56, 30).fill(HEDGE_MID)
  g.circle(0, -80, 38).fill(0x4aa84a)
  g.circle(-12, -92, 20).fill({ color: HEDGE_HI, alpha: 0.5 })
  for (const [ax, ay] of [[-22, -62], [18, -74], [30, -50], [-4, -50]]) {
    g.circle(ax, ay, 6).fill(0xe84a4a)
    g.circle(ax - 2, ay - 2, 2).fill({ color: 0xffffff, alpha: 0.6 })
  }
  c.addChild(g)
  tweens.push(gsap.to(c, { rotation: 0.025, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  return c
}

// Blomsterrabatt längst ned: jord + tre rader blommor som vajar i var sin takt.
function buildBed(tweens) {
  const X0 = -BLEED_X
  const X1 = W + BLEED_X
  const c = new Container()
  c.eventMode = 'none'
  const soil = new Graphics().rect(X0, FIELD.y + FIELD.h + 10, X1 - X0, H + BLEED_Y - (FIELD.y + FIELD.h + 10) + 40).fill(0x6e4b2b)
  soil.rect(X0, FIELD.y + FIELD.h + 10, X1 - X0, 8).fill({ color: 0x000000, alpha: 0.18 })
  c.addChild(soil)
  const rows = Math.max(1, Math.ceil((H + BLEED_Y - 720) / 34) + 1)
  for (let k = 0; k < rows; k++) {
    const rowY = 738 + k * 34
    const row = new Container()
    row.position.set(0, rowY)
    const g = new Graphics()
    for (let x = X0 + rnd(0, 20); x < X1; x += rnd(40, 56)) {
      const hgt = rnd(18, 28)
      g.moveTo(x, 0).lineTo(x, -hgt).stroke({ width: 3, color: 0x3f8f43, cap: 'round' })
      g.ellipse(x + 8, -hgt * 0.4, 8, 3.5).fill(0x4aa84a)
      smallFlower(g, x, -hgt, rnd(6, 9), PETALS[(Math.random() * PETALS.length) | 0])
    }
    row.addChild(g)
    c.addChild(row)
    tweens.push(gsap.to(row.skew, { x: 0.07, duration: 1.8 + k * 0.35, delay: k * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  }
  return c
}

// Fjäril som fladdrar fram och tillbaka över häcken. Banan går via ett vanligt proxy-objekt;
// Pixi-noden rörs bara om den lever.
function buildButterfly(tweens) {
  const c = new Container()
  c.eventMode = 'none'
  const wings = new Graphics()
  wings.ellipse(-9, -5, 10, 7).fill(0xff9ec4)
  wings.ellipse(9, -5, 10, 7).fill(0xff9ec4)
  wings.ellipse(-7, 5, 7, 5).fill(0xffd35c)
  wings.ellipse(7, 5, 7, 5).fill(0xffd35c)
  const body = new Graphics().roundRect(-1.8, -9, 3.6, 18, 2).fill(0x5a3a5c)
  c.addChild(wings, body)
  tweens.push(gsap.to(wings.scale, { x: 0.25, duration: 0.14, yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  const st = { p: 0 }
  const tw = gsap.to(st, {
    p: 1,
    duration: 11,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
    onUpdate: () => {
      if (c.destroyed) { tw.kill(); return }
      c.x = 360 + st.p * 560
      c.y = 20 + Math.sin(st.p * 17) * 6 // över hålraden (y 40–88), aldrig genom den
      c.rotation = Math.cos(st.p * 17) * 0.25
    },
  })
  tweens.push(tw)
  return c
}

export function buildGarden() {
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false
  const tweens = []

  const COTTAGE_X = 1040
  root.addChild(buildHedge())

  const tree = buildTree(tweens)
  tree.position.set(310, 112)
  tree.scale.set(0.85)
  const cottage = buildCottage(tweens)
  cottage.position.set(COTTAGE_X, 112)
  root.addChild(tree, cottage)

  root.addChild(buildHedgeFront(COTTAGE_X - 86, COTTAGE_X + 86))
  root.addChild(buildBed(tweens))
  root.addChild(buildBoard())

  const fly = buildButterfly(tweens)
  fly.position.set(360, 20)
  root.addChild(fly)

  return {
    root,
    destroy() {
      for (const t of tweens) t.kill()
      tweens.length = 0
    },
  }
}
