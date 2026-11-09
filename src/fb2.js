// Stock Scalper order bar + order form (was "Feedback v2", now always on).
//  1. Show the total trade amount (not only margin).
//  2. 1-Tap order size is set in Order Defaults → Order size: Quantity (default, as in the SAHI app) or ₹ Amount.
//     Qty: you enter shares, the bar shows trade value and margin. ₹: you enter the trade value, the bar shows shares and margin.
//  3. Redesigned order form (Dale's sample is the reference; it was not found, so this is a placeholder layout).
//  4. Non-trade features removed from the scalper More sheet (Guided tour).
import './fb2.css'

const FUNDS = 25000 // sample available funds
const STEP = 1000

export function initFb2({ $, $$, S, st, fmt, chgTxt, showSheet, hideSheet, toast, bindSeg, placeThumb, price, levOf, product, mountProducts, setQty, enterScalper }) {
  const fb = {
    def: 'qty',                           // the Order Defaults choice: 'qty' | 'amt'
    input: 'qty',                         // what the bar and form use right now (the form can switch it for one order)
    amt: 10000,
  }
  const inr = (n, dp) => '₹' + (dp ?? (n < 100 ? 2 : 0) ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-IN'))

  // qty / value / margin for a price and the current input
  function calc(p) {
    const L = levOf(st.sym)
    if (fb.input === 'qty') { const q = st.qty; return { q, value: q * p, margin: q * p / L, L } }
    // ₹ amount = trade value (agreed with Manish); margin = value ÷ leverage
    const q = Math.floor(fb.amt / p + 1e-9)
    return { q, value: q * p, margin: q * p / L, L, min: p }
  }

  // ---------- 1-Tap order panel ----------
  const row2 = $('#orderPanel .op-row2'); row2.classList.add('fb-off')
  row2.insertAdjacentHTML('afterend', `
  <div class="fb-on fb-panel">
    <div class="op-row2 fb-row">
      <button class="bs-btn buy press" id="fbBuy"><span class="bs">Buy at</span><span class="bmb" id="fbBuyLbl">Mkt</span></button>
      <div class="stepper fb-step">
        <button id="fbMinus" aria-label="Decrease"><i class="i">&#xe09a;</i></button>
        <label class="fb-in"><span class="bxx sec" id="fbInLbl">Amount</span><input id="fbIn" class="bmb num" inputmode="numeric" aria-label="Amount in rupees"></label>
        <button id="fbPlus" aria-label="Increase"><i class="i">&#xe0bc;</i></button>
      </div>
      <button class="bs-btn sell press" id="fbSell"><span class="bs">Sell at</span><span class="bmb" id="fbSellLbl">Mkt</span></button>
    </div>
    <div class="fb-sum">
      <span class="fb-sumpad" aria-hidden="true"></span>
      <span class="bx fb-sumtx num" id="fbSum" aria-live="polite"></span>
      <span class="lev-badge bxb" id="fbLev">5x</span>
    </div>
  </div>`)

  const inEl = $('#fbIn')
  function renderPanel() {
    const p = price(), c = calc(p)
    $('#fbBuyLbl').textContent = $('#buyLbl').textContent; $('#fbSellLbl').textContent = $('#sellLbl').textContent
    $('#fbInLbl').textContent = fb.input === 'amt' ? 'Trade value' : 'Quantity'
    if (document.activeElement !== inEl) inEl.value = fb.input === 'amt' ? inr(fb.amt) : st.qty.toLocaleString('en-IN')
    inEl.setAttribute('aria-label', fb.input === 'amt' ? 'Amount in rupees' : 'Quantity')
    const lev = $('#fbLev'); lev.textContent = c.L + 'x'; lev.hidden = c.L <= 1
    const s = $('#fbSum'), short = c.q < 1
    s.classList.toggle('neg', short)
    if (short) s.textContent = `Min ${inr(c.min)} for 1 share`
    else if (fb.input === 'qty') s.textContent = `Trade value ${inr(c.value)} · Margin ${inr(c.margin)}`
    else s.textContent = `${c.q.toLocaleString('en-IN')} shares · Margin ${inr(c.margin)}`
    // Founder feedback (product eligibility): no product picked (intraday shut / not offered) → no 1-tap order
    $('#fbBuy').disabled = $('#fbSell').disabled = short || !product()
  }
  const setAmt = v => { fb.amt = Math.max(0, Math.min(1e7, Math.round(v) || 0)); renderPanel(); renderForm() }
  const step = d => fb.input === 'amt' ? setAmt((Math.round(fb.amt / STEP) + d) * STEP) : (setQty(st.qty + d), renderForm())
  $('#fbMinus').onclick = () => step(-1); $('#fbPlus').onclick = () => step(1)
  inEl.addEventListener('focus', () => { inEl.value = fb.input === 'amt' ? (fb.amt || '') : st.qty; inEl.select() })
  inEl.addEventListener('input', () => { const n = +inEl.value.replace(/\D/g, ''); fb.input === 'amt' ? (fb.amt = n) : null; if (fb.input === 'amt') { renderPanel(); renderForm() } })
  inEl.addEventListener('change', () => { const n = +inEl.value.replace(/\D/g, ''); fb.input === 'amt' ? setAmt(n) : (setQty(n), renderForm()) })
  inEl.addEventListener('blur', renderPanel)
  inEl.addEventListener('keydown', e => { if (e.key === 'Enter') inEl.blur() })
  function switchInput(v) {
    // carry the size across so switching doesn't change the order
    const c = calc(price())
    if (v === 'qty' && fb.input === 'amt' && c.q >= 1) setQty(c.q)
    if (v === 'amt' && fb.input === 'qty') fb.amt = Math.round(c.value)
    fb.input = v
    $$('[data-fbunit]').forEach(b => b.textContent = v === 'amt' ? 'Enter quantity instead' : 'Enter amount instead')
    renderPanel(); renderForm()
  }
  const send = () => toast('Prototype: no order is sent to the exchange.')
  $('#fbBuy').onclick = send; $('#fbSell').onclick = send

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
        <div class="fbf-amt-top"><span class="bs sec" id="ffInLbl">Trade value</span><button class="bs fbf-link" data-fbunit>Enter quantity instead</button></div>
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
    $('#ffInLbl').textContent = fb.input === 'amt' ? 'Trade value' : 'Quantity'
    if (document.activeElement !== ffIn) ffIn.value = fb.input === 'amt' ? inr(fb.amt) : st.qty.toLocaleString('en-IN')
    ffIn.setAttribute('aria-label', fb.input === 'amt' ? 'Amount in rupees' : 'Quantity')
    const chips = fb.input === 'amt' ? [1000, 5000, 10000] : [1, 10, 100]
    $('#ffChips').innerHTML = chips.map(v => `<button class="chip bs press" data-add="${v}">+${fb.input === 'amt' ? inr(v) : v}</button>`).join('')
    $('#kvQ').textContent = c.q.toLocaleString('en-IN')
    $('#kvV').textContent = inr(c.value, c.value < 1000 ? 2 : 0); $('#kvM').textContent = inr(c.margin, c.margin < 1000 ? 2 : 0); $('#kvF').textContent = inr(FUNDS)
    const short = c.q < 1, over = c.margin > FUNDS
    $('#ffNotice').hidden = !(short || over)
    $('#ffNoticeTx').textContent = short ? `Amount is below 1 share. Enter at least ${inr(c.min)}.` : `Margin is ${inr(c.margin - FUNDS)} more than your available funds.`
    // Product pills + "why intraday is shut" come from the shared eligibility rules (main.js → eligibility.js)
    const pr = mountProducts($('#ffProd'), $('#ffProdNote')).prod
    $('#ffProdTag').textContent = pr ? pr.label : 'Pick a product'
    $('#ffFootTx').textContent = !pr ? 'Pick a product above to place this order' : pr.k === 'mis' ? 'Intraday (MIS) · auto square-off at square-off time' : pr.k === 'mtf' ? 'MTF · held with margin funding' : 'Delivery (CNC) · shares go to your demat'
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
    update() { renderPanel(); renderForm() },
    setInput(v) { fb.def = v; switchInput(v) }, // from Order Defaults → Order size
    input: () => fb.def,
  }
}
