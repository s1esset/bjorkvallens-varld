// Små DOM-overlayer ovanpå canvasen — de enda ställena appen använder DOM, och bara där
// Pixi inte räcker: textinmatning (kräver OS-tangentbordet, visas alltid bakom
// föräldra-grinden) och nyhetsrutan (löptext som ska kunna scrollas med fingret).
export function promptText({ title = 'Skriv ett namn', value = '', placeholder = '', maxLength = 16 } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'dom-modal'

    const card = document.createElement('div')
    card.className = 'dom-modal__card'

    const h = document.createElement('div')
    h.className = 'dom-modal__title'
    h.textContent = title

    const input = document.createElement('input')
    input.className = 'dom-modal__input'
    input.type = 'text'
    input.value = value
    input.placeholder = placeholder
    input.maxLength = maxLength
    input.autocomplete = 'off'

    const row = document.createElement('div')
    row.className = 'dom-modal__row'
    const cancel = document.createElement('button')
    cancel.className = 'dom-modal__btn dom-modal__btn--cancel'
    cancel.textContent = 'Avbryt'
    const ok = document.createElement('button')
    ok.className = 'dom-modal__btn dom-modal__btn--ok'
    ok.textContent = 'Klar'
    row.append(cancel, ok)

    card.append(h, input, row)
    overlay.append(card)
    document.body.append(overlay)

    const close = (val) => {
      overlay.remove()
      resolve(val)
    }
    const submit = () => {
      const v = input.value.trim()
      close(v ? v : null)
    }
    ok.addEventListener('click', submit)
    cancel.addEventListener('click', () => close(null))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit()
      else if (e.key === 'Escape') close(null)
    })
    setTimeout(() => {
      input.focus()
      input.select()
    }, 30)
  })
}

// Nyhetsrutan från menyn: en rubrik per version, nyast först. Stängs med ✖, ett tryck
// utanför kortet eller Escape — ETT tryck, som all annan navigering (P0). Ingen grind: den
// visar bara text och ändrar ingenting. Returnerar ett Promise som löses när den stängts.
export function showNews({ nyheter = [], version = '', full = '' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'dom-modal'

    const card = document.createElement('div')
    card.className = 'dom-modal__card nyheter'
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.setAttribute('aria-label', 'Nyheter')

    const head = document.createElement('div')
    head.className = 'nyheter__head'
    const h = document.createElement('div')
    h.className = 'dom-modal__title nyheter__title'
    h.textContent = '✨ Nyheter'
    const stang = document.createElement('button')
    stang.className = 'nyheter__stang'
    stang.setAttribute('aria-label', 'Stäng')
    stang.textContent = '✖'
    head.append(h, stang)

    const lista = document.createElement('div')
    lista.className = 'nyheter__lista'
    for (const n of nyheter) {
      const post = document.createElement('section')
      post.className = 'nyheter__post'
      if (n.version === version) post.classList.add('nyheter__post--nu')
      const rad = document.createElement('div')
      rad.className = 'nyheter__rad'
      const v = document.createElement('span')
      v.className = 'nyheter__version'
      v.textContent = n.fran ? `v${n.fran}–v${n.version}` : `v${n.version}`
      const d = document.createElement('span')
      d.className = 'nyheter__datum'
      d.textContent = n.datum || ''
      rad.append(v, d)
      const t = document.createElement('div')
      t.className = 'nyheter__rubrik'
      t.textContent = n.titel || ''
      const ul = document.createElement('ul')
      for (const p of n.punkter || []) {
        const li = document.createElement('li')
        li.textContent = p
        ul.append(li)
      }
      post.append(rad, t, ul)
      lista.append(post)
    }

    const fot = document.createElement('div')
    fot.className = 'nyheter__fot'
    fot.textContent = full ? `Du har ${full}` : ''

    card.append(head, lista, fot)
    overlay.append(card)
    document.body.append(overlay)

    let stangd = false
    const close = () => {
      if (stangd) return
      stangd = true
      document.removeEventListener('keydown', onKey)
      overlay.remove()
      resolve()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    stang.addEventListener('click', close)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close()
    })
    document.addEventListener('keydown', onKey)
  })
}
