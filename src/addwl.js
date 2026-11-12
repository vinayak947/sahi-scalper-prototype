// "Add to watchlist" sheet: what the SAHI app opens when you tap a bookmark (checked on SAHI 968 + the screen the user shared, 12 Nov 2026).
// Lists every watchlist the user has with a checkbox (checked = the stock is already in it), a "+ Create new watchlist" chip and Save.
// Used by every bookmark in the prototype (Home widget, Select stock to scalp page and sheet), so the bookmark never adds in one tap.
import './addwl.css'

export function initAddWatchlist({ $, $$, LISTS, showSheet, hideSheet, vibrate, openCreate, onSaved }) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  $('#phone').insertAdjacentHTML('beforeend', `
  <div class="sheet" id="sh-addwl" hidden role="dialog" aria-label="Add to watchlist">
    <div class="sheet-title h3">Add to watchlist</div>
    <div class="aw-list bm" id="awList" role="group" aria-label="Your watchlists"></div>
    <button class="aw-new bs press" id="awNew"><i class="i" aria-hidden="true">&#xe0bc;</i>Create new watchlist</button>
    <div class="aw-foot"><button class="btn primary bm press" id="awSave">Save</button></div>
  </div>`)

  let sym = null, draft = new Set(), known = 0 // draft = indexes of the watchlists that will hold the stock after Save

  function render() {
    $('#awList').innerHTML = LISTS.map((l, i) => {
      const on = draft.has(i)
      return `<button class="aw-row press" role="checkbox" aria-checked="${on}" data-i="${i}"><span class="aw-nm">${esc(l.name)}</span><span class="aw-cb${on ? ' on' : ''}" aria-hidden="true"><i class="i">&#xe029;</i></span></button>`
    }).join('')
  }

  function open(k) {
    sym = k; known = LISTS.length
    draft = new Set(LISTS.map((l, i) => l.items.includes(k) ? i : -1).filter(i => i >= 0))
    render(); showSheet('addwl')
  }

  $('#awList').addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return
    const i = +b.dataset.i; draft.has(i) ? draft.delete(i) : draft.add(i)
    b.setAttribute('aria-checked', draft.has(i)); b.querySelector('.aw-cb').classList.toggle('on', draft.has(i))
  })

  $('#awNew').onclick = () => openCreate()
  // A list created from here comes back ticked, so the stock lands in it on Save
  $('#wcGo').addEventListener('click', () => setTimeout(() => {
    if (!$('#sh-addwl').classList.contains('show') || LISTS.length <= known) return
    for (let i = known; i < LISTS.length; i++) draft.add(i)
    known = LISTS.length; render()
    const l = $('#awList'); l.scrollTop = l.scrollHeight
  }, 0))

  $('#awSave').onclick = () => {
    LISTS.forEach((l, i) => {
      const has = l.items.includes(sym), want = draft.has(i)
      if (want && !has) l.items.push(sym); else if (!want && has) l.items.splice(l.items.indexOf(sym), 1)
    })
    vibrate && vibrate(8)
    hideSheet('addwl', () => onSaved(sym))
  }

  return { open }
}
