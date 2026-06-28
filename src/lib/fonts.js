// Försöker ladda de egen-hostade typsnitten innan vi ritar text i canvasen.
// Saknas WOFF2-filerna faller vi snabbt tillbaka till systemtypsnitt (CSS-stacken).
export async function loadFonts() {
  if (!('fonts' in document)) return
  const wanted = ['600 1em Fredoka', '700 1em "Baloo 2"', '400 1em Nunito', '700 1em Nunito']
  const timeout = (ms) => new Promise((r) => setTimeout(r, ms))
  try {
    await Promise.race([
      Promise.allSettled(wanted.map((f) => document.fonts.load(f))),
      timeout(1500),
    ])
    await Promise.race([document.fonts.ready, timeout(400)])
  } catch {
    /* strunt samma — fallback-typsnitt duger */
  }
}
