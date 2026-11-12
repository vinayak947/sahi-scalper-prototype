// Stock Scalper order bar + order form (was "Feedback v2", now always on).
//  1. Order size is Quantity (SAHI app default) or ₹ Amount.
//     PM feedback (11 Nov): people think in the money they put in (₹500, ₹5,000), not in trade value. So ₹ Amount is the
//     MARGIN: trade value = amount × leverage, shares = whole shares that trade value buys. Margin actually used and trade
//     value are shown as outputs under Buy/Sell only.
//  2. Fractional shares: shares are recomputed from the amount at the live price, so the amount is a cap that is never
//     exceeded; what a whole share can't use stays unused and is shown.
//  3. Tapping the size on the bar opens a keypad sheet (as in the SAHI app). No leverage picker: as in prod (SAHI 968), leverage
//     comes from the product. Intraday always uses the stock's own leverage (the 5X on the Intraday pill); Delivery is 1x.
//     Prototype setting (tap the clock): the Qty / ₹ switch lives either in Order Defaults → Order size, or in the keypad sheet.
//  4. Exit: with an open position, Sell exits it and frees margin instead of blocking new margin.
import './fb2.css'

const FUNDS = 25000 // sample available funds
const AMT_STEP = 100
const BACKSPACE = ''

export function initFb2({ $, $$, S, st, fmt, chgTxt, showSheet, hideSheet, toast, bindSeg, placeThumb, price, levOf, product, barNotice, mountProducts, setQty, enterScalper }) {
  const fb = {
    def: 'qty',        // the saved choice: 'qty' | 'amt'
    input: 'qty',      // what the bar and form use right now (the form can switch it for one order)
    amt: 1000,         // ₹ the user puts in (margin). Starts at the chart's minimum (see minAmt), never a fixed number.
    amtSym: null,      // the stock this amount belongs to; a different chart starts again from its own minimum
    lev: null,         // picked intraday leverage; null = the stock's highest
    switchAt: 'defaults', // prototype setting (default: in Order defaults): where Qty / ₹ is switched ('defaults' | 'bar')
    pos: 0,            // prototype setting: shares already bought in this stock (for the exit case)
  }
  const inr = (n, dp) => '₹' + (dp ?? (n < 100 ? 2 : 0) ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-IN'))
  // short form for the order bar: ₹806, ₹4.8K, ₹24.2K, ₹2.5L, ₹1.2Cr (1 decimal, truncated, trailing .0 dropped)
  const inrK = n => { const u = n >= 1e7 ? [1e7, 'Cr'] : n >= 1e5 ? [1e5, 'L'] : n >= 1e3 ? [1e3, 'K'] : null
    return u ? '₹' + (Math.floor(n / u[0] * 10) / 10).toString() + u[1] : inr(n) }
  const sh = n => `${n.toLocaleString('en-IN')} share${n === 1 ? '' : 's'}`

  // leverage is never picked (prod parity): it's the product's leverage for the open stock
  const maxLev = () => levOf(st.sym)
  const levFor = () => maxLev()

  // qty / trade value / margin for a price, input, size and leverage
  function calcWith(p, input, size, L) {
    if (input === 'qty') { const q = size; return { q, value: q * p, margin: q * p / L, L } }
    const q = Math.floor(size * L / p + 1e-9), margin = q * p / L
    return { q, value: q * p, margin, L, budget: size, left: size - margin, min: p / L }
  }
  const calc = p => calcWith(p, fb.input, fb.input === 'amt' ? fb.amt : st.qty, levFor(fb.lev))
  // Prototype rule (user, 12 Nov): ₹ Amount starts at the chart's own minimum, the margin that buys 1 share (price ÷ leverage, rounded
  // up), so nobody has to type or apply anything to get a valid order.
  const minAmt = () => Math.ceil(price() / levFor(fb.lev))

  // ---------- 1-Tap order panel ----------
  const row2 = $('#orderPanel .op-row2'); row2.classList.add('fb-off')
  row2.insertAdjacentHTML('afterend', `
  <div class="fb-on fb-panel">
    <div class="op-row2 fb-row">
      <div class="col"><button class="bs-btn buy press" id="fbBuy"><span class="bs" id="fbBuyTop">Buy at</span><span class="bmb" id="fbBuyLbl">Mkt</span></button><span class="bx num fb-m" id="fbMBuy"></span></div>
      <div class="col">
        <div class="stepper fb-step">
          <button id="fbMinus" aria-label="Decrease"><i class="i">&#xe09a;</i></button>
          <button class="fb-in" id="fbInBtn"><span id="fbIn" class="bmb num"></span><span class="bx ter num" id="fbInSub"></span></button>
          <button id="fbPlus" aria-label="Increase"><i class="i">&#xe0bc;</i></button>
        </div>
        <button class="fb-sum press" id="fbSumBtn" aria-label="Change order size"><span class="bx fb-sumtx num" id="fbSum" aria-live="polite"></span></button>
      </div>
      <div class="col"><button class="bs-btn sell press" id="fbSell"><span class="bs" id="fbSellTop">Sell at</span><span class="bmb" id="fbSellLbl">Mkt</span></button><span class="bx num fb-m" id="fbMSell"></span></div>
    </div>
  </div>`)

  function renderPanel() {
    if (fb.input === 'amt' && fb.amtSym !== st.sym) { fb.amt = minAmt(); fb.amtSym = st.sym } // a new chart starts at its own minimum
    const p = price(), c = calc(p), amt = fb.input === 'amt'
    $('#fbBuyLbl').textContent = $('#buyLbl').textContent; $('#fbSellLbl').textContent = $('#sellLbl').textContent
    // Same as the SAHI app's commodity bar: the size you set is the big number, with a small caption under it (there: "1" over "10 bbl").
    // Quantity mode: the quantity, and its trade value underneath. Amount mode: the amount, and the shares it buys underneath.
    const v = $('#fbIn'); v.textContent = amt ? inr(fb.amt) : st.qty.toLocaleString('en-IN'); v.style.fontSize = v.textContent.length > 9 ? '12px' : ''
    const short = c.q < 1, pos = fb.pos, sub = $('#fbInSub')
    sub.textContent = short ? `Min ${inr(c.min)}` : amt ? sh(c.q) : `Value ${inrK(c.value)}`; sub.classList.toggle('neg', short)
    $('#fbInBtn').setAttribute('aria-label', amt ? `Amount ${inr(fb.amt)}, buys ${short ? 'less than 1 share' : sh(c.q)}, change` : `Quantity ${st.qty}, trade value ${inr(c.value)}, change`)
    $('#fbInBtn').title = short ? `Min ${inr(c.min)} for 1 share at ${c.L}x` : `Trade value ${inr(c.value)}`
    $('.fb-step').classList.toggle('amt', amt) // amount mode: just the value, no − / + steppers
    // Under the stepper only what the caption doesn't say: the product and its leverage, worded as in the SAHI app ("Intraday: 5X"). Margin sits under each button, because Buy and Sell need different margin.
    const s = $('#fbSum'); s.textContent = !short && c.L > 1 ? `Intraday: ${c.L}X` : ''; $('#fbSumBtn').hidden = !s.textContent
    // With an open position (as in the SAHI app) Buy becomes Add and Sell becomes Exit.
    // Add needs margin like a buy; Exit closes shares you already hold, so it needs none.
    $('#fbBuyTop').textContent = pos ? 'Add at' : 'Buy at'
    $('#fbSellTop').textContent = pos ? 'Exit at' : 'Sell at'
    const mTx = short ? 'Margin: –' : `Margin: ${c.margin >= 1e5 ? inrK(c.margin) : inr(c.margin)}`
    $('#fbMBuy').textContent = mTx
    $('#fbMSell').textContent = pos ? 'Margin: ₹0' : mTx
    $('#fbBuy').disabled = short || !product()
    $('#fbSell').disabled = (short && !pos) || !product()
  }
  const setAmt = v => { fb.amt = Math.max(0, Math.min(1e7, Math.round(v) || 0)); fb.amtSym = st.sym; renderPanel(); renderForm() }
  const step = d => fb.input === 'amt' ? setAmt((Math.round(fb.amt / AMT_STEP) + d) * AMT_STEP) : (setQty(st.qty + d), renderForm())
  $('#fbMinus').onclick = () => step(-1); $('#fbPlus').onclick = () => step(1)
  $('#fbInBtn').onclick = () => openKp(); $('#fbSumBtn').onclick = () => openKp()

  function switchInput(v) {
    // carry the size across so switching doesn't change the order
    const c = calc(price())
    if (v === 'qty' && fb.input === 'amt' && c.q >= 1) setQty(c.q)
    if (v === 'amt' && fb.input === 'qty') { fb.amt = minAmt(); fb.amtSym = st.sym } // starts at the chart's minimum, not at what the quantity cost
    fb.input = v
    $$('[data-fbunit]').forEach(b => b.textContent = v === 'amt' ? 'Enter quantity instead' : 'Enter amount instead')
    renderPanel(); renderForm()
  }

  // ---------- Order size keypad sheet (opened from the bar) ----------
  $('#phone').insertAdjacentHTML('beforeend', `
  <div class="sheet kp" id="sh-kp" hidden role="dialog" aria-label="Order size">
    <div class="kp-top">
      <!-- Rows follow the live SAHI order form (968): label left, control right — like its "Order type" and "Quantity" rows -->
      <div class="of-field kp-row" id="kpUnitRow"><span class="bm sec">Trade in</span>
        <div class="seg subtle bm kp-unit" id="kpUnit" role="radiogroup" aria-label="Trade in"><span class="thumb"></span><button data-v="qty">Quantity</button><button data-v="amt">&#8377; Amount</button></div></div>
      <div class="of-field kp-row kp-step-wrap"><span class="bm sec" id="kpLbl"></span>
        <!-- Quantity: DLS Stepper field (filled pill, − value +) -->
        <div class="stepper kp-step" id="kpStep"><button id="kpMinus" class="press" aria-label="Decrease"><i class="i">&#xe09a;</i></button><output class="num kp-val" id="kpVal" aria-live="polite"></output><button id="kpPlus" class="press" aria-label="Increase"><i class="i">&#xe0bc;</i></button></div>
        <!-- ₹ Amount: DLS Number field (outlined, ₹ prefix, right-aligned, no step buttons), shown focused like the live Trigger price box -->
        <div class="kp-numf" id="kpNumf" role="textbox" aria-label="Amount in rupees"><span class="kp-numf-pre">&#8377;</span><output class="num kp-numf-val" id="kpAmtVal" aria-live="polite"></output><span class="kp-caret" aria-hidden="true"></span></div>
      </div>
      <div class="kp-card"><!-- breakdown + its note in one card, a divider between them -->
        <div class="kp-kv bs" id="kpKv" aria-live="polite"></div>
        <div class="bs kp-strip" id="kpNote" hidden></div>
      </div>
    </div>
    <div class="kp-pad" id="kpPad">${['1','2','3','4','5','6','7','8','9','00','0','del'].map(k => `<button class="press ${k === 'del' ? 'i' : 'h4'}" data-k="${k}"${k === 'del' ? ' aria-label="Delete"' : ''}>${k === 'del' ? BACKSPACE : k}</button>`).join('')}</div>
    <div class="kp-foot"><button class="btn primary bm press" id="kpApply">Apply</button></div>
  </div>`)
  const kp = { input: 'qty', qty: 1, amt: 1000, lev: null, fresh: true }
  const kpSize = () => kp.input === 'amt' ? kp.amt : kp.qty
  function renderKp() {
    const p = price(), L = levFor(kp.lev), amt = kp.input === 'amt', c = calcWith(p, kp.input, kpSize(), L), short = c.q < 1
    // Qty / ₹ switch shows here only when the prototype setting puts it on the bar
    const unit = $('#kpUnit'); $('#kpUnitRow').hidden = fb.switchAt !== 'bar'
    unit.querySelectorAll('button').forEach(b => { const on = b.dataset.v === kp.input; b.classList.toggle('on', on); b.setAttribute('aria-checked', on) }); if (fb.switchAt === 'bar') placeThumb(unit)
    // No product title on this sheet (user, 11 Nov): the labels below say intraday / delivery
    const pr = product(), mis = pr?.k === 'mis'
    $('#kpLbl').textContent = amt ? (mis ? 'Intraday margin you put in' : 'Amount you invest') : (mis ? 'Shares to trade intraday' : 'Shares')
    $('#kpVal').textContent = kp.qty.toLocaleString('en-IN')
    $('#kpAmtVal').textContent = kp.amt ? Math.round(kp.amt).toLocaleString('en-IN') : ''
    $('#kpStep').hidden = amt; $('#kpNumf').hidden = !amt // Quantity → stepper; ₹ Amount → number field, no −/+ (user, 11 Nov)
    // margin first: what you put in → × leverage → trade value → whole shares
    const row = (k, v, cls = '') => `<div class="${cls}"><span class="sec">${k}</span><span class="num">${v}</span></div>`
    $('#kpKv').innerHTML = amt
      ? (mis ? row('Your intraday margin', inr(kp.amt)) + row(`Trade value with ${L}x intraday leverage`, inr(kp.amt * L)) : row('You invest', inr(kp.amt)))
        + row('Shares at ' + inr(p, 2), short ? 'Below 1' : sh(c.q), 'em')
      : row('Trade value', inr(c.value)) + row(mis ? `Intraday margin at ${L}x` : 'You pay (full value)', inr(c.margin), 'em')
    const n = $('#kpNote'), over = c.margin > FUNDS
    n.classList.toggle('neg', short || over)
    n.hidden = false
    if (short) n.textContent = amt ? `Put in at least ${inr(c.min)} for 1 share${mis ? ` at ${L}x intraday` : ''}.` : 'Enter at least 1 share.'
    else if (over) n.textContent = `Margin is ${inr(c.margin - FUNDS)} more than your available funds (${inr(FUNDS)}).`
    else if (amt && c.left >= 0.5) n.textContent = `Uses ${inr(c.margin)}. ${inr(c.left)} is left over, less than 1 share. Never goes over ${inr(kp.amt)} as the price moves.`
    else if (barNotice?.()) n.textContent = barNotice().text // market state (AMO / pre-open), like the live order form's strip
    else n.hidden = true
    $('#kpApply').disabled = short
  }
  function openKp() {
    Object.assign(kp, { input: fb.input, qty: st.qty, amt: fb.amt, lev: levFor(fb.lev), fresh: true })
    renderKp(); showSheet('kp')
  }
  const kpSet = v => { if (kp.input === 'amt') kp.amt = Math.max(0, Math.min(1e7, v)); else kp.qty = Math.max(0, Math.min(99999, v)); renderKp() }
  function key(k) {
    const cur = kp.fresh ? '' : String(kpSize() || '')
    kp.fresh = false
    if (k === 'del') return kpSet(+cur.slice(0, -1) || 0)
    kpSet(+(cur + k))
  }
  $('#kpPad').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) key(b.dataset.k) })
  $('#kpMinus').onclick = () => { kp.fresh = false; kp.input === 'amt' ? kpSet((Math.round(kp.amt / AMT_STEP) - 1) * AMT_STEP) : kpSet(kp.qty - 1) }
  $('#kpPlus').onclick = () => { kp.fresh = false; kp.input === 'amt' ? kpSet((Math.round(kp.amt / AMT_STEP) + 1) * AMT_STEP) : kpSet(kp.qty + 1) }
  $('#kpUnit').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.v === kp.input) return
    const c = calcWith(price(), kp.input, kpSize(), levFor(kp.lev)) // carry the size across
    if (b.dataset.v === 'qty') kp.qty = Math.max(1, c.q); else kp.amt = minAmt() // ₹ Amount opens at the chart's minimum: nothing to type
    kp.input = b.dataset.v; kp.fresh = true
    // The switch itself needs no Apply: the bar changes straight away (the sheet stays open only to fine-tune the size)
    if (fb.switchAt === 'bar') { fb.def = kp.input; switchInput(kp.input); kp.qty = st.qty; kp.amt = fb.amt }
    renderKp()
  })
  $('#kpApply').onclick = () => {
    if (fb.switchAt === 'bar' && kp.input !== fb.input) { fb.def = kp.input; switchInput(kp.input) }
    if (kp.input === 'amt') setAmt(kp.amt); else { setQty(kp.qty); renderForm() }
    renderPanel(); hideSheet('kp')
  }
  // hardware keys work too (desktop review)
  addEventListener('keydown', e => {
    if ($('#sh-kp').hidden) return
    if (/^\d$/.test(e.key)) { key(e.key); e.preventDefault() }
    else if (e.key === 'Backspace') { key('del'); e.preventDefault() }
    else if (e.key === 'Enter' && !$('#kpApply').disabled) $('#kpApply').click()
  })

  const send = () => toast('Prototype: no order is sent to the exchange.')
  $('#fbBuy').onclick = () => { const c = calc(price()); toast(`${fb.pos ? 'Add' : 'Buy'} ${sh(c.q)} · margin ${inr(c.margin)}. Prototype: no order is sent.`) }
  $('#fbSell').onclick = () => {
    const p = price(), c = calc(p)
    toast(fb.pos ? `Exit ${sh(fb.pos)} · frees ${inr(fb.pos * p / c.L)} margin. Prototype: no order is sent.` : `Sell ${sh(c.q)} · margin ${inr(c.margin)}. Prototype: no order is sent.`)
  }

  // ---------- Order form (redesign) ----------
  $('#phone').insertAdjacentHTML('beforeend', `
  <div class="sheet tall fbf" id="sh-fbform" hidden role="dialog" aria-label="Order form">
    <div class="fbf-head">
      <div style="min-width:0"><div class="bm nm" id="ffName"></div><div class="bs fbf-pr"><span class="num" id="ffLtp"></span><span class="num" id="ffChg"></span><span class="sec">NSE</span></div></div>
      <span class="bx fbf-tag" id="ffProdTag">Intraday</span><span class="lev-badge bxb" id="ffLev">5x</span>
      <button class="i fbf-x press" data-close aria-label="Close">&#xe103;</button>
    </div>
    <div class="fbf-body">
      <div class="seg inverse bm fbf-side" id="ffSide"><span class="thumb"></span><button class="on" data-v="buy">Buy</button><button data-v="sell">Sell</button></div>
      <div class="fbf-line"><span class="bm">Product</span><div class="seg subtle bs prodseg" id="ffProd" role="radiogroup" aria-label="Product"></div></div>
      <div class="notice bs" id="ffProdNote" hidden role="status"></div>
      <div class="fbf-line"><span class="bm">Order type</span><div class="seg subtle bm" id="ffType"><span class="thumb"></span><button class="on" data-v="mkt">Market</button><button data-v="lmt">Limit</button></div></div>
      <label class="fbf-field" id="ffPriceF" hidden><span class="bs sec">Limit price</span><input class="bl num" id="ffPrice" inputmode="decimal"></label>
      <div class="fbf-field fbf-amt">
        <div class="fbf-amt-top"><span class="bs sec" id="ffInLbl">Amount (margin)</span><button class="bs fbf-link" data-fbunit>Enter quantity instead</button></div>
        <input class="num" id="ffIn" inputmode="numeric" aria-label="Amount in rupees">
        <div class="fbf-chips" id="ffChips"></div>
      </div>
      <div class="fbf-kv bm">
        <div><span class="sec">Quantity</span><span class="num" id="kvQ"></span></div>
        <div><span class="sec">Trade value</span><span class="num" id="kvV"></span></div>
        <div><span class="sec">Margin required <span class="lev-badge bxb" id="kvL">5x</span></span><span class="num" id="kvM"></span></div>
        <div class="fbf-div"></div>
        <div><span class="sec">Available funds</span><span class="num" id="kvF"></span></div>
      </div>
      <div class="fbf-notice bs" id="ffNotice" hidden><span id="ffNoticeTx"></span></div>
      <p class="bx ter fbf-ref">Layout is a placeholder until Dale's sample order form is shared.</p>
    </div>
    <div class="fbf-foot">
      <button class="bs-btn buy press bmb" id="ffGo"></button>
      <span class="bx sec" id="ffFootTx">Intraday (MIS) · auto square-off at 3:20 PM</span>
    </div>
  </div>`)

  const ff = { side: 'buy', type: 'mkt', price: null }
  const ffIn = $('#ffIn'), ffPrice = $('#ffPrice')
  const ffP = () => ff.type === 'lmt' && ff.price > 0 ? ff.price : S[st.sym][1]
  function renderForm() {
    if ($('#sh-fbform').hidden) return
    const [n, l, ch] = S[st.sym], p = ffP(), c = calc(p)
    $('#ffName').textContent = n; $('#ffLtp').textContent = fmt(l)
    const cg = $('#ffChg'); cg.textContent = chgTxt(st.sym); cg.className = 'num ' + (ch >= 0 ? 'pos' : 'neg')
    $('#ffLev').textContent = $('#kvL').textContent = c.L + 'x'; $('#ffLev').hidden = $('#kvL').hidden = c.L <= 1
    $('#ffInLbl').textContent = fb.input === 'amt' ? 'Amount (margin)' : 'Quantity'
    if (document.activeElement !== ffIn) ffIn.value = fb.input === 'amt' ? inr(fb.amt) : st.qty.toLocaleString('en-IN')
    ffIn.setAttribute('aria-label', fb.input === 'amt' ? 'Amount in rupees' : 'Quantity')
    const chips = fb.input === 'amt' ? [500, 1000, 5000] : [1, 10, 100]
    $('#ffChips').innerHTML = chips.map(v => `<button class="chip bs press" data-add="${v}">+${fb.input === 'amt' ? inr(v) : v}</button>`).join('')
    $('#kvQ').textContent = c.q.toLocaleString('en-IN')
    $('#kvV').textContent = inr(c.value, c.value < 1000 ? 2 : 0); $('#kvM').textContent = inr(c.margin, c.margin < 1000 ? 2 : 0); $('#kvF').textContent = inr(FUNDS)
    const short = c.q < 1, over = c.margin > FUNDS
    $('#ffNotice').hidden = !(short || over)
    $('#ffNoticeTx').textContent = short ? `Amount is below 1 share. Put in at least ${inr(c.min)}.` : `Margin is ${inr(c.margin - FUNDS)} more than your available funds.`
    // Product pills + "why intraday is shut" come from the shared eligibility rules (main.js → eligibility.js)
    const pr = mountProducts($('#ffProd'), $('#ffProdNote')).prod
    $('#ffProdTag').textContent = pr ? pr.label : 'Pick a product'
    $('#ffFootTx').textContent = !pr ? 'Pick a product above to place this order' : pr.k === 'mis' ? 'Intraday (MIS) · auto square-off at square-off time' : 'Delivery (CNC) · shares go to your demat'
    const go = $('#ffGo'); go.className = `bs-btn ${ff.side} press bmb`; go.disabled = short || over || !pr
    go.textContent = short ? (ff.side === 'buy' ? 'Buy' : 'Sell') : `${ff.side === 'buy' ? 'Buy' : 'Sell'} ${c.q.toLocaleString('en-IN')} share${c.q > 1 ? 's' : ''} · ${inr(c.value)}`
  }
  $('#ffChips').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; const v = +b.dataset.add; fb.input === 'amt' ? setAmt(fb.amt + v) : (setQty(st.qty + v), renderForm()) })
  ffIn.addEventListener('focus', () => { ffIn.value = fb.input === 'amt' ? (fb.amt || '') : st.qty; ffIn.select() })
  ffIn.addEventListener('input', () => { const n = +ffIn.value.replace(/\D/g, ''); if (fb.input === 'amt') { fb.amt = n; renderPanel(); renderForm() } })
  ffIn.addEventListener('change', () => { const n = +ffIn.value.replace(/\D/g, ''); fb.input === 'amt' ? setAmt(n) : (setQty(n), renderForm()) })
  ffIn.addEventListener('blur', renderForm)
  ffPrice.addEventListener('input', () => { ff.price = +ffPrice.value || null; renderForm() })
  $$('[data-fbunit]').forEach(b => b.onclick = () => switchInput(fb.input === 'amt' ? 'qty' : 'amt'))
  bindSeg($('#ffSide'), v => { ff.side = v; renderForm() })
  bindSeg($('#ffType'), v => { ff.type = v; $('#ffPriceF').hidden = v !== 'lmt'; if (v === 'lmt') { ff.price = price(); ffPrice.value = fmt(ff.price) } renderForm() })
  // "Enter amount/quantity instead" in the form is for that one order; closing the form goes back to the Order Defaults choice
  const closeForm = cb => hideSheet('fbform', () => { if (fb.input !== fb.def) switchInput(fb.def); cb && cb() })
  $('#sh-fbform [data-close]').onclick = () => closeForm()
  $('#ffGo').onclick = () => closeForm(send)

  // The full order form isn't part of this prototype: the expand button only says so
  $('#btnForm').onclick = () => toast('The full order form is not covered in this prototype.')

  // ---------- 4. More sheet: trade settings only ----------
  $('#openTour').parentElement.classList.add('fb-off')

  document.body.classList.add('fb2')
  switchInput(fb.def)

  return {
    update() { renderPanel(); renderForm(); if (!$('#sh-kp').hidden) renderKp() },
    setInput(v) { fb.def = v; switchInput(v) }, // from Order Defaults → Order size
    input: () => fb.def,
    lev: () => levFor(fb.lev),
    setSwitchAt(v) { fb.switchAt = v; if (!$('#sh-kp').hidden) renderKp() },
    setPos(n) { fb.pos = n; renderPanel() },
  }
}
