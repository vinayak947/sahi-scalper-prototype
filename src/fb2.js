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
    def: 'amt',        // the saved choice: 'qty' | 'amt'. ₹ Amount by default (Figma 10439:13626, 17 Nov)
    input: 'amt',      // what the bar and form use right now (the form can switch it for one order)
    amt: 1000,         // ₹ the user puts in (margin). Starts at the chart's minimum (see minAmt), never a fixed number.
    amtSym: null,      // the stock this amount belongs to; a different chart starts again from its own minimum
    lev: null,         // picked intraday leverage; null = the stock's highest
    switchAt: 'bar',   // prototype setting: where Qty / ₹ is switched ('defaults' | 'bar'). Default 'bar': the switcher sits in the keypad sheet
    pos: 0,            // prototype setting: shares already bought in this stock (for the exit case)
  }
  const inr = (n, dp) => '₹' + (dp ?? (n < 100 ? 2 : 0) ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-IN'))
  // short form for the order bar: ₹806, ₹4.8K, ₹24.2K, ₹2.5L, ₹1.2Cr (1 decimal, truncated, trailing .0 dropped)
  const inrK = n => { const u = n >= 1e7 ? [1e7, 'Cr'] : n >= 1e5 ? [1e5, 'L'] : n >= 1e3 ? [1e3, 'K'] : null
    return u ? '₹' + (Math.floor(n / u[0] * 10) / 10).toString() + u[1] : inr(n) }
  const sh = n => `${n.toLocaleString('en-IN')} share${n === 1 ? '' : 's'}`
  const plu = n => `${n.toLocaleString('en-IN')} ${n === 1 ? 'Share' : 'Shares'}` // PM copy: "1 Share", "99 Shares"
  const fmt2 = n => inr(n, 2)
  const shA = n => n === 1 ? '1 Share' : sh(n) // ₹ Amount copy as in Figma: "1 Share", "99 shares"

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
        <!-- Quantity: DLS Stepper field, Size=large, outlined (Figma 10493:178366): − value + with "Value ₹4K" under the number.
             ₹ Amount: the same control as a plain outlined box (no − / +). Tapping the number opens the sheet in both. -->
        <div class="fb-ctl" id="fbCtl">
          <button id="fbMinus" class="press" aria-label="Decrease quantity"><i class="i">&#xe09a;</i></button>
          <button class="fb-box press" id="fbInBtn"><span id="fbIn" class="bmb num"></span><span class="bx num" id="fbInSub"></span></button>
          <button id="fbPlus" class="press" aria-label="Increase quantity"><i class="i">&#xe0bc;</i></button>
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
    sub.textContent = short ? (amt ? `Min ${inr(c.min)}` : 'Min 1 Share') : amt ? plu(c.q) : `Value ${inrK(c.value)}`; sub.classList.toggle('neg', short)
    $('#fbInBtn').setAttribute('aria-label', amt ? `Amount ${inr(fb.amt)}, buys ${short ? 'less than 1 share' : sh(c.q)}, change` : `Quantity ${st.qty}, trade value ${inr(c.value)}, change`)
    $('#fbCtl').classList.toggle('amt', amt); $('#fbMinus').hidden = $('#fbPlus').hidden = amt // − / + only in Quantity
    $('#fbMinus').disabled = !amt && st.qty <= 1
    $('#fbInBtn').title = short ? `Min ${inr(c.min)} for 1 share at ${c.L}x` : `Trade value ${inr(c.value)}`
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
  $('#fbMinus').onclick = () => (setQty(st.qty - 1), renderForm()); $('#fbPlus').onclick = () => (setQty(st.qty + 1), renderForm())
  $('#fbInBtn').onclick = () => openKp(); $('#fbSumBtn').onclick = () => openKp()

  function switchInput(v, keep) {
    // carry the size across so switching doesn't change the order (keep: the keypad sheet flips the mode and keeps both typed values as they are)
    if (!keep) {
      const c = calc(price())
      if (v === 'qty' && fb.input === 'amt' && c.q >= 1) setQty(c.q)
      if (v === 'amt' && fb.input === 'qty') { fb.amt = minAmt(); fb.amtSym = st.sym } // starts at the chart's minimum, not at what the quantity cost
    }
    fb.input = v
    $$('[data-fbunit]').forEach(b => b.textContent = v === 'amt' ? 'Enter quantity instead' : 'Enter amount instead')
    renderPanel(); renderForm()
  }

  // ---------- Order size keypad sheet (opened from the bar) ----------
  // Layout from the PM's 1-Tap prototype (17 Nov): "Enter Amount ⇕" + leverage badge, a big number with a caret (selected on open, so typing
  // replaces it), an Order value card that opens a breakdown, one note line, Apply, then the keypad. Colours, type and shapes are DLS tokens.
  $('#phone').insertAdjacentHTML('beforeend', `
  <div class="sheet kp" id="sh-kp" hidden role="dialog" aria-label="Order size">
    <div class="kq-top">
      <!-- Stacked and centred: "Enter Amount ⇕" on top, the DLS field below it -->
      <div class="kq-head">
        <button class="kq-swap bm press" id="kpSwap"><span class="sec">Enter</span><span class="kq-word" id="kpWord">Amount</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4.29988 8.83353C4.43321 8.72242 4.58877 8.68464 4.76655 8.7202C4.93543 8.73797 5.06877 8.8202 5.16655 8.96686C5.93099 10.0024 6.55321 10.7802 7.03321 11.3002C7.49988 11.7891 7.8221 12.0335 7.99988 12.0335C8.17766 12.0335 8.49988 11.7891 8.96655 11.3002C9.44655 10.7802 10.0688 10.0024 10.8332 8.96686C10.9354 8.8202 11.0688 8.73797 11.2332 8.7202C11.411 8.68464 11.5665 8.72242 11.6999 8.83353C11.8465 8.93575 11.931 9.06908 11.9532 9.23353C11.9843 9.41131 11.9443 9.57353 11.8332 9.7202C10.9665 10.898 10.2177 11.7802 9.58655 12.3669C8.9421 12.9802 8.41321 13.2869 7.99988 13.2869C7.59099 13.2869 7.0621 12.9802 6.41321 12.3669C5.7821 11.7802 5.03321 10.898 4.16655 9.7202C4.05543 9.57353 4.01766 9.41131 4.05321 9.23353C4.07099 9.06908 4.15321 8.93575 4.29988 8.83353ZM4.16655 6.28686C5.03321 5.10908 5.7821 4.22464 6.41321 3.63353C7.0621 3.01131 7.59099 2.7002 7.99988 2.7002C8.41321 2.7002 8.9421 3.01131 9.58655 3.63353C10.2177 4.22464 10.9665 5.10908 11.8332 6.28686C11.9443 6.42908 11.9843 6.58908 11.9532 6.76686C11.931 6.93575 11.8465 7.06908 11.6999 7.16686C11.5665 7.27797 11.411 7.31797 11.2332 7.28686C11.0688 7.26464 10.9354 7.1802 10.8332 7.03353C10.0688 5.99797 9.44655 5.2202 8.96655 4.7002C8.49988 4.20242 8.17766 3.95353 7.99988 3.95353C7.8221 3.95353 7.49988 4.20242 7.03321 4.7002C6.55321 5.2202 5.93099 5.99797 5.16655 7.03353C5.06877 7.1802 4.93543 7.26464 4.76655 7.28686C4.58877 7.31797 4.43321 7.27797 4.29988 7.16686C4.15321 7.06908 4.07099 6.93575 4.05321 6.76686C4.01766 6.58908 4.05543 6.42908 4.16655 6.28686Z"/></svg></button>
      <div class="kq-hero">
        <!-- ₹ Amount: DLS Number field, Size=xLarge, State=focused (144 default, stretched to 200), value centred -->
        <div class="kq-numf" id="kpNumf" role="textbox" aria-label="Amount in rupees"><output class="num" id="kpAmtVal" aria-live="polite"></output><span class="kp-caret" aria-hidden="true"></span></div>
        <!-- Quantity: DLS Stepper field, Size=large, outlined (Figma 10493:178366): 144 × 48 pill, − value + -->
        <div class="kq-step" id="kpStep"><button id="kpMinus" class="press" aria-label="Decrease quantity"><i class="i">&#xe09a;</i></button><div class="kq-stepv"><output class="num" id="kpVal" aria-live="polite"></output></div><button id="kpPlus" class="press" aria-label="Increase quantity"><i class="i">&#xe0bc;</i></button></div>
      </div>
      </div>
      <!-- DLS Card (filled, compact): label / value rows; the note sits under a Divider inside the card, like the Margin check in the Figma frames -->
      <!-- DLS Card (filled, compact): three label / value rows (order value, price per share, trade value); the note sits under a Divider inside the card -->
      <div class="kq-card">
        <div class="kq-r bs"><span id="kpOvL"></span><b class="num" id="kpOvV"></b></div>
        <div class="kq-r bs"><span>Price per share</span><b class="num" id="kpPx"></b></div>
        <div class="kq-r bs"><span class="kq-l">Trade value<span class="lev-badge" id="kpTvLev">5X</span></span><b class="num" id="kpTv"></b></div>
        <div class="kq-msg" id="kpMsg" hidden><div class="kq-div"></div><div class="bs" id="kpNote" aria-live="polite"></div></div>
      </div>
    </div>
    <div class="kp-foot"><button class="btn primary bm press" id="kpApply">Apply</button></div>
    <div class="kp-pad" id="kpPad">${['1','2','3','4','5','6','7','8','9','00','0','del'].map(k => `<button class="press ${k === 'del' ? 'i' : 'h4'}" data-k="${k}"${k === 'del' ? ' aria-label="Delete"' : ''}>${k === 'del' ? BACKSPACE : k}</button>`).join('')}</div>
  </div>`)
  const kp = { input: 'amt', qty: 1, amt: 1000, lev: null, fresh: false, seen: { amt: true, qty: true } } // fresh = replace on the first key. Off: keys edit the shown number in place (the DLS Number field has no "selected" look)
  const kpSize = () => kp.input === 'amt' ? kp.amt : kp.qty
  function renderKp() {
    const p = price(), L = levFor(kp.lev), amt = kp.input === 'amt', n = kpSize() || 0, c = calcWith(p, kp.input, n, L), short = c.q < 1
    const swap = fb.switchAt === 'bar', word = amt ? 'Amount' : 'Quantity'
    $('#sh-kp').classList.toggle('amt', amt)
    // "Enter Amount ⇕" is the Qty / ₹ switch (when the prototype setting puts it here; otherwise it is a plain label)
    $('#kpSwap').disabled = !swap; $('#kpWord').textContent = word
    $('#kpSwap').setAttribute('aria-label', swap ? `Enter ${word}. Switch to ${amt ? 'quantity' : 'amount'}` : `Enter ${word}`)
    $('#kpTvLev').hidden = L <= 1; $('#kpTvLev').textContent = `${L}X`
    // the input: DLS Number field for ₹ Amount, DLS Stepper field for Quantity
    $('#kpNumf').hidden = !amt; $('#kpStep').hidden = amt
    $('#kpAmtVal').textContent = inr(n, 0)
    $('#kpVal').textContent = n.toLocaleString('en-IN')
    // card: order value = the margin you actually put in; trade value = shares × price
    $('#kpOvL').textContent = amt ? `Order value (${sh(c.q)})` : 'Order value'
    $('#kpOvV').textContent = fmt2(c.margin); $('#kpTv').textContent = fmt2(c.value); $('#kpPx').textContent = fmt2(p)
    // one note line, under a divider in the card
    const over = c.margin > FUNDS; let tx = '', neg = false
    if (short) { neg = n > 0; tx = n === 0 ? (amt ? 'Enter how much you want to put in' : 'Enter number of shares') : amt ? `${inr(n)} is not enough for 1 share. Min ${fmt2(p / L)}.` : 'Enter at least 1 share.' }
    else if (over) { neg = true; tx = amt ? `Insufficient funds add ${inr(c.margin - FUNDS)}` : `Margin is ${inr(c.margin - FUNDS)} more than your available funds (${inr(FUNDS)}).` }
    else if (amt && c.left >= 0.005) tx = `${fmt2(c.left)} left over, less than 1 share`
    else if (barNotice?.()) tx = barNotice().text // market state (AMO / pre-open), like the live order form's strip
    $('#kpMsg').hidden = !tx; $('#kpNote').textContent = tx; $('#kpNote').classList.toggle('neg', neg)
    $('#kpApply').disabled = short
  }
  function openKp() {
    Object.assign(kp, { input: fb.input, qty: st.qty, amt: fb.amt, lev: levFor(fb.lev), fresh: false, seen: { amt: fb.input === 'amt', qty: fb.input === 'qty' } })
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
  $('#kpMinus').onclick = () => { kp.fresh = false; kpSet(Math.max(1, kp.qty - 1)) }
  $('#kpPlus').onclick = () => { kp.fresh = false; kpSet(kp.qty + 1) }
  function kpSwitchTo(v) {
    if (v === kp.input) return
    // Each mode keeps what was typed in it, so flipping Amount ⇄ Quantity never resets either one.
    // A mode visited for the first time since the sheet opened is seeded from the other: shares carry across, ₹ Amount starts at the minimum for 1 share.
    if (!kp.seen[v]) {
      const c = calcWith(price(), kp.input, kpSize(), levFor(kp.lev))
      if (v === 'qty') kp.qty = Math.max(1, c.q); else kp.amt = minAmt()
      kp.seen[v] = true
    }
    kp.input = v; kp.fresh = false
    // The switch itself needs no Apply: the bar changes mode straight away (the sheet stays open only to fine-tune the size)
    if (fb.switchAt === 'bar') { fb.def = kp.input; switchInput(kp.input, true) }
    renderKp()
  }
  $('#kpSwap').onclick = () => kpSwitchTo(kp.input === 'amt' ? 'qty' : 'amt')
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
