// Förladdning för _superhoppprobe: gör Math.random deterministisk (mulberry32) så HEAD och ändring
// kan jämföras tal för tal.  node --import ./scripts/_sparrseed.mjs scripts/_superhoppprobe.mjs
let a = 123456789
Math.random = () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
