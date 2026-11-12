// Watchlist page — rebuilt from SAHI 968 on the signed-in emulator (9 Nov 2026), every state:
//  · My Lists: list tabs (⋮ on the open one: Edit items / Rename / Delete), + Create new watchlist, ⚙ Manage watchlist,
//    list / chart / table views, Sort by (filter button), Search & Add, and the telescope empty state.
//  · Stock Scanners: the app's 23 scanner tabs with an ⓘ explainer, the "Select stock category" index picker, three views.
//  · Recently viewed: what you opened last (a Crude Oil Mini future on this account).
// Prices are sample data. Tapping an NSE stock opens it in Stock Scalper with that list in the stock strip.
import './watchlist.css'

// The 23 scanner tabs, in the app's order. Gainers holds the stocks captured from the app; the rest are sample lists.
const SCANNERS = [
  ['Gainers', 'Stocks that have increased in price compared to the previous trading day\'s close.', 'Sorted by percentage price change, from highest to lowest.', 'up'],
  ['Losers', 'Stocks that have fallen in price compared to the previous trading day\'s close.', 'Sorted by percentage price change, from lowest to highest.', 'dn'],
  ['Stocks in news', 'Stocks with company news or announcements today.', 'Sorted by percentage price change, from highest to lowest.', 'up'],
  ['Volume Shockers', 'Stocks trading at a much higher volume than their usual daily average.', 'Sorted by volume compared to average, from highest to lowest.', 'up'],
  ['Daily Breakouts', 'Stocks that moved above the previous day\'s high.', 'Sorted by percentage price change, from highest to lowest.', 'up'],
  ['Gap Up', 'Stocks that opened above the previous day\'s high.', 'Sorted by the size of the gap, from highest to lowest.', 'up'],
  ['Gap Down', 'Stocks that opened below the previous day\'s low.', 'Sorted by the size of the gap, from highest to lowest.', 'dn'],
  ['Bullish Engulfing', 'Stocks where today\'s green candle fully covers the previous day\'s red candle.', 'Sorted by percentage price change, from highest to lowest.', 'up'],
  ['Bearish Engulfing', 'Stocks where today\'s red candle fully covers the previous day\'s green candle.', 'Sorted by percentage price change, from lowest to highest.', 'dn'],
  ['Near 52-Week High', 'Stocks trading close to their highest price of the last 52 weeks.', 'Sorted by distance from the 52-week high, closest first.', 'up'],
  ['Near 52-Week Low', 'Stocks trading close to their lowest price of the last 52 weeks.', 'Sorted by distance from the 52-week low, closest first.', 'dn'],
  ['Open=High', 'Stocks whose opening price is also the day\'s high so far.', 'Sorted by percentage price change, from lowest to highest.', 'dn'],
  ['Open=Low', 'Stocks whose opening price is also the day\'s low so far.', 'Sorted by percentage price change, from highest to lowest.', 'up'],
  ['RSI Oversold', 'Stocks with a 14-day RSI below 30.', 'Sorted by RSI, from lowest to highest.', 'dn'],
  ['RSI Overbought', 'Stocks with a 14-day RSI above 70.', 'Sorted by RSI, from highest to lowest.', 'up'],
  ['Golden Cross', 'Stocks where the 50-day average crossed above the 200-day average.', 'Sorted by percentage price change, from highest to lowest.', 'up'],
  ['Bulk Deals', 'Stocks with bulk deals reported on the exchange today.', 'Sorted by deal value, from highest to lowest.', 'up'],
  ['Block Deals', 'Stocks with block deals reported on the exchange today.', 'Sorted by deal value, from highest to lowest.', 'up'],
  ['Death Cross', 'Stocks where the 50-day average crossed below the 200-day average.', 'Sorted by percentage price change, from lowest to highest.', 'dn'],
  ['Long Buildup', 'F&O stocks where price and open interest are both rising.', 'Sorted by change in open interest, from highest to lowest.', 'up'],
  ['Short Covering', 'F&O stocks where price is rising and open interest is falling.', 'Sorted by change in open interest, from highest to lowest.', 'up'],
  ['Short Buildup', 'F&O stocks where price is falling and open interest is rising.', 'Sorted by change in open interest, from highest to lowest.', 'dn'],
  ['Long Unwinding', 'F&O stocks where price and open interest are both falling.', 'Sorted by change in open interest, from highest to lowest.', 'dn'],
]
const GAINERS = ['DATAPATTNS', 'IREDA', 'GLAXO', 'UNIONBANK', 'SANSERA', 'GLAND', 'IRB']
const INDICES = ['NIFTY 500', 'NIFTY 50', 'NIFTY 100', 'NIFTY BANK', 'NIFTY MIDCAP 50', 'NIFTY MIDCAP 100', 'NIFTY SMALLCAP 50', 'NIFTY SMALLCAP 100', 'ALL F&O STOCKS']
const SECTORAL = ['NIFTY AUTO', 'NIFTY BANK', 'NIFTY COMMODITIES', 'NIFTY CONSUMER DURABLE', 'NIFTY ENERGY', 'NIFTY FMCG', 'NIFTY HEALTHCARE', 'NIFTY INFRA', 'NIFTY IT', 'NIFTY MEDIA', 'NIFTY METAL', 'NIFTY OIL & GAS', 'NIFTY PHARMA']
const SORTS = [['az', 'A to Z'], ['za', 'Z to A'], ['cha', '% Price change (Low to high)'], ['chd', '% Price change (High to low)'], ['ltpd', 'Last traded price (High to low)'], ['ltpa', 'Last traded price (Low to high)']]
const OPTION_CHAIN = [['Crude Oil Mini'], ['Natural Gas Mini'], ['Gold Mini'], ['Silver Mini'], ['Crude Oil'], ['Natural Gas'], ['Crude Oil', 'NSE'], ['NIFTY50'], ['SENSEX']]
const MCX = new Set(['CRUDEOILM'])
const MAXLEN = 18

export function initWatchlist(c) {
  const { $, $$, S, LISTS, fmt, sign, showSheet, hideSheet, toast, bindSeg, placeThumb, enterScalper, setBack, st, chart, xAxis } = c
  const w = { src: 'lists', list: 0, scan: 0, view: 'list', sort: null, index: 'NIFTY 500', recent: ['CRUDEOILM'], menu: false, scanInfo: false }
  const pct = k => { const [, l, ch] = S[k]; return ch / (l - ch) * 100 }
  const cls = k => S[k][2] >= 0 ? 'pos' : 'neg'
  const chg = k => `${sign(S[k][2])}<span class="wl-pct">(${Math.abs(pct(k)).toFixed(2)}%)</span>`
  const exch = k => MCX.has(k) ? 'MCX' : 'NSE'
  const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))

  // sample members for the other 22 scanner tabs: up-movers for bullish scans, down-movers for bearish ones
  const ups = Object.keys(S).filter(k => S[k][2] > 0 && !MCX.has(k)).sort((a, b) => pct(b) - pct(a))
  const dns = Object.keys(S).filter(k => S[k][2] < 0 && !MCX.has(k)).sort((a, b) => pct(a) - pct(b))
  const scanItems = i => {
    if (i === 0) return GAINERS
    const pool = SCANNERS[i][3] === 'up' ? ups : dns, n = 4 + (i * 3) % 4, start = (i * 5) % pool.length
    return Array.from({ length: Math.min(n, pool.length) }, (_, j) => pool[(start + j) % pool.length])
  }
  const sortBy = { az: (a, b) => S[a][0].localeCompare(S[b][0]), za: (a, b) => S[b][0].localeCompare(S[a][0]), cha: (a, b) => pct(a) - pct(b), chd: (a, b) => pct(b) - pct(a), ltpd: (a, b) => S[b][1] - S[a][1], ltpa: (a, b) => S[a][1] - S[b][1] }
  function items() {
    const it = w.src === 'lists' ? [...LISTS[w.list].items] : w.src === 'scan' ? [...scanItems(w.scan)] : [...w.recent]
    return w.src === 'lists' && w.sort ? it.sort(sortBy[w.sort]) : it
  }

  // ---------- screen ----------
  $('#phone').insertAdjacentHTML('beforeend', `
  <section class="screen" id="watch" hidden>
    <h1 class="wl-title">Watchlist</h1>
    <div class="wl-chips" id="wlSrc" role="tablist" aria-label="Watchlist source">
      <button class="schip bs" data-src="lists" role="tab">My Lists</button>
      <button class="schip bs" data-src="scan" role="tab">Stock Scanners</button>
      <button class="schip bs" data-src="recent" role="tab">Recently viewed</button>
    </div>
    <div class="wl-tabrow" id="wlTabRow">
      <div class="tabs bm wl-tabs" id="wlTabs" role="tablist"></div>
      <div class="wl-tabact" id="wlTabAct">
        <button class="wl-circ press" id="wlAdd" aria-label="Create new watchlist"><i class="i">&#xe0bc;</i></button>
        <button class="wl-circ press" id="wlGear" aria-label="Manage watchlist"><i class="i">&#xe0d5;</i></button>
      </div>
    </div>
    <div class="wl-tools" id="wlTools">
      <div class="seg subtle" id="wlView"><span class="thumb"></span><button class="on" data-v="list" aria-label="List view"><i class="i">&#xe07b;</i></button><button data-v="chart" aria-label="Chart view"><i class="i">&#xe107;</i></button><button data-v="table" aria-label="Table view"><i class="i">&#xe072;</i></button></div>
      <span class="sa-chip bs" data-wlchart><i class="i">&#xe3aa;</i><i class="i">&#xe170;</i></span><span class="sa-chip bs" data-wlchart>1D<i class="i">&#xe170;</i></span>
      <button class="wl-circ sm press" data-wltable aria-label="Choose columns"><i class="i">&#xe3a9;</i></button>
      <button class="sa-chip bs wl-index press" id="wlIndex"><span id="wlIndexTx">NIFTY 500</span><i class="i">&#xe170;</i></button>
    </div>
    <div class="wl-body" id="wlBody"></div>
    <div class="wl-float" id="wlFloat">
      <button class="wl-fbtn press" id="wlSort" aria-label="Sort"><i class="i">&#xe1df;</i><span class="wl-dot" id="wlSortDot" hidden></span></button>
      <span class="wl-fdiv"></span>
      <button class="wl-search bs press" data-wlsearch><i class="i">&#xe30a;</i>Search &amp; Add</button>
    </div>
    <div class="wl-menu bs" id="wlMenu" hidden role="menu">
      <button role="menuitem" data-m="edit"><i class="i">&#xe0ae;</i>Edit watchlist items</button>
      <button role="menuitem" data-m="rename"><i class="i">&#xe2bc;</i>Rename watchlist</button>
      <button role="menuitem" data-m="delete" class="neg"><i class="i">&#xe1ad;</i>Delete watchlist</button>
    </div>
    <div class="wl-tip bs" id="wlTip" hidden role="tooltip"><div><p id="wlTipA"></p><p id="wlTipB"></p></div><button class="i" id="wlTipX" aria-label="Close">&#xe103;</button></div>
    <nav class="bnav bxx" aria-label="Main">
      <button data-nav="home"><i class="i">&#xe220;</i><span class="bx">Home</span></button>
      <button class="on" data-nav="watch"><i class="i">&#xe144;</i><span class="bx">Watchlist</span></button>
      <button data-nav="trade"><i class="i">&#xe3b1;</i><span class="bx">Trade</span></button>
      <button data-nav="x"><i class="i">&#xe13e;</i><span class="bx">Orders</span></button>
      <button data-nav="x"><i class="i">&#xe013;</i><span class="bx">Portfolio</span></button>
    </nav>
  </section>

  <section class="screen" id="wlManage" hidden>
    <header class="appbar"><button class="appbar-btn" id="wmBack" aria-label="Back"><i class="i">&#xe02a;</i></button><h1 class="appbar-title wm-title">Manage watchlist</h1></header>
    <div class="wm-list" id="wmList"></div>
  </section>

  <section class="screen" id="wlSearchScr" hidden>
    <div class="ws-bar"><button class="i ws-back" id="wsBack" aria-label="Back">&#xe02a;</button><input class="bm" id="wsIn" placeholder="Search for name or symbol" autocomplete="off" aria-label="Search for name or symbol"></div>
    <div class="ws-body" id="wsBody"></div>
  </section>

  <div class="sheet" id="sh-wlcreate" hidden role="dialog" aria-label="Create new watchlist">
    <div class="sheet-title h3" id="wcTitle">Create new watchlist</div>
    <div class="wc-body">
      <input class="bm wc-in" id="wcIn" maxlength="${MAXLEN}" placeholder="Watchlist name" autocomplete="off" aria-label="Watchlist name">
      <span class="bx ter wc-count" id="wcCount">0/${MAXLEN}</span>
      <button class="btn primary bm press" id="wcGo" disabled>Create</button>
    </div>
  </div>
  <div class="sheet" id="sh-wlsort" hidden role="dialog" aria-label="Sort by">
    <div class="h3 wl-shtitle">Sort by</div>
    <div class="sortlist" id="wsortList"></div>
  </div>
  <div class="sheet tall" id="sh-wlindex" hidden role="dialog" aria-label="Select stock category">
    <div class="sheet-title h3">Select stock category</div>
    <div class="wl-idxlist" id="wiList"></div>
  </div>`)

  const body = $('#wlBody'), tabs = $('#wlTabs')
  const row = k => `<button class="row" data-sym="${k}"><span class="l"><span class="bm">${S[k][0]}${MCX.has(k) ? '' : '<i class="i wl-ai" aria-label="AI signals">&#xe000;</i>'}</span><span class="bs ter">${exch(k)}</span></span><span class="r"><span class="bm num" data-px="${k}">${fmt(S[k][1])}</span><span class="bs num ${cls(k)}" data-ch="${k}" data-cf="wl">${chg(k)}</span></span></button>`
  const card = k => `<div class="sa-card press" role="button" tabindex="0" data-sym="${k}"><span class="hd"><span class="bm">${S[k][0]}</span><span class="tags"><span class="bxx tf">5m</span></span></span><span class="bm num"><span data-px="${k}">${fmt(S[k][1])}</span> <span class="bs ${cls(k)}" data-ch="${k}" data-cf="wl">${chg(k)}</span> <span class="bs sec">today</span></span>${chart(k, 340, 170, 1)}${xAxis(['9 Nov', '11:15', '13:15'])}</div>`
  const table = it => `<div class="wl-tblwrap"><table class="sa-tbl bs"><tr class="bs"><th>Instrument</th><th>LTP</th><th>Change</th><th>Change %</th></tr>${it.map(k => `<tr data-sym="${k}"><td>${k}</td><td class="num" data-px="${k}">${fmt(S[k][1])}</td><td class="num ${cls(k)}" data-ch="${k}" data-cf="abs">${sign(S[k][2])}</td><td class="num ${cls(k)}" data-ch="${k}" data-cf="pct">${sign(pct(k))}%</td></tr>`).join('')}</table></div>`
  const empty = `<div class="wl-empty"><img src="${import.meta.env.BASE_URL}assets/wl_empty.png" alt="" width="174" height="219"><span class="bmb">Your watchlist is empty</span><span class="bs sec">Add Stocks, ETFs or F&amp;O you want to track.</span><button class="wl-emptybtn bs press" data-wlsearch><i class="i">&#xe0bc;</i>Search &amp; Add</button></div>`

  function render() {
    // source chips (selected one gets the check, like the app)
    $$('#wlSrc .schip').forEach(ch => { const on = ch.dataset.src === w.src; ch.classList.toggle('on', on); ch.setAttribute('aria-selected', on); ch.querySelector('.ck')?.remove(); if (on) ch.insertAdjacentHTML('beforeend', '<i class="i ck">&#xe029;</i>') })
    // tabs: list names (⋮ on the open list) or the 23 scanners (ⓘ on the open one); none for Recently viewed
    $('#wlTabRow').hidden = w.src === 'recent'; $('#wlTabAct').hidden = w.src !== 'lists'
    if (w.src === 'lists') tabs.innerHTML = LISTS.map((l, i) => `<button class="tab${i === w.list ? ' on' : ''}" role="tab" data-i="${i}">${esc(l.name)}${i === w.list ? '<i class="i wl-kebab" data-kebab aria-label="Watchlist options">&#xe09f;</i>' : ''}</button>`).join('')
    else if (w.src === 'scan') tabs.innerHTML = SCANNERS.map((s, i) => `<button class="tab${i === w.scan ? ' on' : ''}" role="tab" data-i="${i}">${s[0]}${i === w.scan ? '<i class="i info" data-scinfo aria-label="About this scanner">&#xe065;</i>' : ''}</button>`).join('')
    const it = items(), isEmpty = !it.length
    body.classList.toggle('lines', w.src === 'scan') // the app draws row dividers on scanner lists only
    // toolbar: view switcher always (except an empty list), chart chips in chart view, column chip in table view, index picker on scanners
    $('#wlTools').hidden = isEmpty && w.src === 'lists'
    $$('[data-wlchart]').forEach(e => e.hidden = w.view !== 'chart' || w.src === 'scan')
    $$('[data-wltable]').forEach(e => e.hidden = w.view !== 'table')
    $('#wlIndex').hidden = w.src !== 'scan'; $('#wlIndexTx').textContent = w.index
    $('#wlFloat').hidden = w.src !== 'lists' || isEmpty
    $('#wlSortDot').hidden = !w.sort
    $$('#wlView button').forEach(b => b.classList.toggle('on', b.dataset.v === w.view)); placeThumb($('#wlView'))
    body.innerHTML = isEmpty ? empty : w.view === 'chart' ? it.map(card).join('') : w.view === 'table' ? table(it) : it.map(row).join('')
    body.classList.toggle('pad', !$('#wlFloat').hidden)
    $('#wlMenu').hidden = !w.menu; $('#wlTip').hidden = !w.scanInfo
    if (w.menu) placeMenu()
    if (w.scanInfo) { $('#wlTipA').textContent = SCANNERS[w.scan][1]; $('#wlTipB').textContent = SCANNERS[w.scan][2]; placeTip() }
  }
  const anchor = (el, pop, dx = 0) => { const ph = $('#watch').getBoundingClientRect(), r = el.getBoundingClientRect(); pop.style.top = (r.bottom - ph.top + 4) + 'px'; pop.style.left = Math.max(16, Math.min(r.left - ph.left + dx, ph.width - pop.offsetWidth - 16)) + 'px' }
  const placeMenu = () => { const k = tabs.querySelector('[data-kebab]'); k && anchor(k, $('#wlMenu'), -20) }
  const placeTip = () => { const k = tabs.querySelector('[data-scinfo]'); k && anchor(k, $('#wlTip'), -60) }

  // ---------- interactions ----------
  $$('#wlSrc .schip').forEach(ch => ch.onclick = () => { w.src = ch.dataset.src; w.menu = w.scanInfo = false; body.scrollTop = 0; tabs.scrollLeft = 0; render() })
  tabs.addEventListener('click', e => {
    if (e.target.closest('[data-kebab]')) { w.menu = !w.menu; w.scanInfo = false; return render() }
    if (e.target.closest('[data-scinfo]')) { w.scanInfo = !w.scanInfo; return render() }
    const t = e.target.closest('.tab'); if (!t) return
    const i = +t.dataset.i; w.menu = w.scanInfo = false
    if (w.src === 'lists') w.list = i; else w.scan = i
    body.scrollTop = 0; render()
    tabs.querySelector('.tab.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  })
  bindSeg($('#wlView'), v => { w.view = v; render() })
  $('#wlTipX').onclick = () => { w.scanInfo = false; render() }
  $('#watch').addEventListener('pointerdown', e => { if (w.menu && !e.target.closest('#wlMenu,[data-kebab]')) { w.menu = false; render() } })

  // rows → Stock Scalper with this list in the strip (MCX futures aren't part of the stock scalper)
  body.addEventListener('click', e => {
    if (e.target.closest('[data-wlsearch]')) return openSearch()
    const r = e.target.closest('[data-sym]'); if (!r) return
    const k = r.dataset.sym
    if (MCX.has(k)) return toast('Commodity futures are not covered in this prototype.')
    st.group = items().filter(x => !MCX.has(x)); if (w.src === 'lists') { st.src = 'lists'; st.list = w.list }
    setBack('#watch'); enterScalper(k)
  })
  $$('[data-wlsearch]').forEach(b => b.onclick = openSearch)
  $('[data-wltable]').onclick = () => toast('Column settings are not covered in this prototype.')

  // ⋮ menu on the open list
  $('#wlMenu').onclick = e => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return
    w.menu = false
    if (m === 'edit') { render(); toast('Editing list items is not covered in this prototype.') }
    if (m === 'rename') { render(); openCreate(w.list) }
    if (m === 'delete') deleteList(w.list)
  }
  function deleteList(i) {
    if (LISTS.length === 1) { render(); return toast('You need at least one watchlist.') }
    const n = LISTS[i].name; LISTS.splice(i, 1); w.list = Math.min(w.list, LISTS.length - 1)
    render(); renderManage(); toast(`Deleted "${n}"`)
  }

  // + Create new watchlist / Rename (same sheet)
  let editing = null
  function openCreate(i = null) {
    editing = i; const name = i == null ? '' : LISTS[i].name
    $('#wcTitle').textContent = i == null ? 'Create new watchlist' : 'Rename watchlist'; $('#wcGo').textContent = i == null ? 'Create' : 'Save'
    $('#wcIn').value = name; wcSync(); showSheet('wlcreate'); setTimeout(() => $('#wcIn').focus({ preventScroll: true }), 340)
  }
  function wcSync() { const v = $('#wcIn').value; $('#wcCount').textContent = `${v.length}/${MAXLEN}`; $('#wcGo').disabled = !v.trim() || (editing != null && v.trim() === LISTS[editing].name) }
  $('#wcIn').addEventListener('input', wcSync)
  $('#wcIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#wcGo').disabled) $('#wcGo').click() })
  $('#wcGo').onclick = () => {
    const v = $('#wcIn').value.trim()
    if (editing == null) { LISTS.push({ name: v, items: [] }); w.list = LISTS.length - 1; w.src = 'lists'; toast(`Created "${v}"`) }
    else { LISTS[editing].name = v; toast('Watchlist renamed') }
    $('#wcIn').blur(); hideSheet('wlcreate', () => { render(); renderManage() })
  }
  $('#wlAdd').onclick = () => openCreate()

  // ⚙ Manage watchlist
  function renderManage() {
    $('#wmList').innerHTML = LISTS.map((l, i) => `<div class="wm-row"><button class="i wm-del press" data-del="${i}" aria-label="Delete ${esc(l.name)}">&#xe288;</button><span class="bs">${esc(l.name)}</span><i class="i wm-drag" aria-hidden="true">&#xe05b;</i></div>`).join('')
      + `<button class="wm-new bs press" id="wmNew"><i class="i">&#xe0bc;</i>Create new watchlist</button>`
    $('#wmNew').onclick = () => openCreate()
  }
  $('#wmList').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) deleteList(+d.dataset.del) })
  $('#wlGear').onclick = () => { renderManage(); $('#watch').hidden = true; $('#wlManage').hidden = false }
  $('#wmBack').onclick = () => { $('#wlManage').hidden = true; $('#watch').hidden = false; render() }

  // Sort by (filter button on My Lists)
  function renderSort() {
    $('#wsortList').innerHTML = SORTS.map(([k, t]) => `<button class="opt bs${w.sort === k ? ' on' : ''}" data-s="${k}">${t}<span class="radio"></span></button>`).join('')
  }
  $('#wsortList').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; w.sort = w.sort === b.dataset.s ? null : b.dataset.s; renderSort(); hideSheet('wlsort', render) }
  $('#wlSort').onclick = () => { renderSort(); showSheet('wlsort') }

  // Select stock category (index picker on scanners)
  function renderIndex() {
    const o = n => `<button class="opt bs${w.index === n ? ' on' : ''}" data-ix="${n}">${n}<span class="radio"></span></button>`
    $('#wiList').innerHTML = INDICES.map(o).join('') + '<div class="bs sec wl-idxhead">Sectoral indices</div>' + SECTORAL.map(o).join('')
  }
  $('#wiList').onclick = e => { const b = e.target.closest('[data-ix]'); if (!b) return; w.index = b.dataset.ix; renderIndex(); hideSheet('wlindex', render) }
  $('#wlIndex').onclick = () => { renderIndex(); showSheet('wlindex') }

  // Search & Add
  function openSearch() {
    $('#watch').hidden = true; $('#wlSearchScr').hidden = false; $('#wsIn').value = ''; renderSearch(); setTimeout(() => $('#wsIn').focus({ preventScroll: true }), 50)
  }
  function renderSearch() {
    const q = $('#wsIn').value.trim().toLowerCase(), list = LISTS[w.list]
    if (!q) {
      $('#wsBody').innerHTML = `<div class="ws-head"><span class="bm">Add from Option Chain</span><span class="badge-new bxx">New</span></div>
        <div class="ws-chips">${OPTION_CHAIN.map(([n, x]) => `<button class="ws-chip bs press" data-oc>${n}${x ? ` <span class="bxx ws-ex">${x}</span>` : ''}</button>`).join('')}</div>
        <div class="ws-tip bs" id="wsTip"><span>Tap an index to pick multiple strikes in one go from the option chain.</span><button class="i" id="wsTipX" aria-label="Close">&#xe103;</button></div>`
      $('#wsTipX').onclick = () => $('#wsTip').remove()
      return
    }
    const hits = Object.keys(S).filter(k => k.toLowerCase().includes(q) || S[k][0].toLowerCase().includes(q)).slice(0, 12)
    $('#wsBody').innerHTML = hits.length ? hits.map(k => { const on = list.items.includes(k); return `<div class="ws-row"><span class="l"><span class="bm">${S[k][0]}</span><span class="bs ter">${k} · ${exch(k)}</span></span><button class="wl press" data-add="${k}" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} ${esc(list.name)}"><i class="i">${on ? '&#xe144;' : '&#xe012;'}</i></button></div>` }).join('')
      : `<div class="wl-empty"><span class="bmb">No results for "${esc($('#wsIn').value.trim())}"</span><span class="bs sec">Try a company name or symbol.</span></div>`
  }
  $('#wsIn').addEventListener('input', renderSearch)
  $('#wsBody').addEventListener('click', e => {
    if (e.target.closest('[data-oc]')) return toast('The option chain is not covered in this prototype.')
    const b = e.target.closest('[data-add]'); if (!b) return
    const k = b.dataset.add, list = LISTS[w.list], i = list.items.indexOf(k)
    if (i < 0) list.items.push(k); else list.items.splice(i, 1)
    navigator.vibrate && navigator.vibrate(8); toast(`${i < 0 ? 'Added to' : 'Removed from'} ${list.name}`); renderSearch()
  })
  $('#wsBack').onclick = () => { $('#wlSearchScr').hidden = true; $('#watch').hidden = false; w.src = 'lists'; render() }

  // bottom nav
  const open = () => { $$('.screen').forEach(s => s.hidden = true); $('#watch').hidden = false; w.menu = w.scanInfo = false; render() }
  $$('#watch [data-nav]').forEach(b => b.onclick = () => {
    const n = b.dataset.nav
    if (n === 'home') { $('#watch').hidden = true; $('#home').hidden = false }
    if (n === 'trade') showSheet('trade')
    if (n === 'x') toast('Not captured from the app in this prototype.')
  })
  render()
  return { open, render, openCreate }
}
