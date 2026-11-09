// Live prices. Every ~0.9 s some instruments tick: a small random step, rounded to the tick size (₹0.05, or ₹0.01 under ₹50),
// pulled gently back towards the captured price so the sample data never drifts far. Change is always LTP − previous close.
// Any element on any screen updates in place when it carries:
//   data-px="SYM"                 → the LTP text (data-pf="1" for one decimal, as on the mini-chart tags); flashes green / red
//   data-ch="SYM" data-cf="…"     → the change text, pos/neg colour kept in sync
//      full  "+12.30 (1.25%)"   abs "+12.30"   pct "+1.25%"   pill "+1.25%" (− sign)   wl "+12.30<span>(1.25%)</span>"
// Prices are sample data; nothing here talks to a market feed.
const EVERY = 900, P = 0.3

export function initLive({ $$, books, fmt, onTick }) {
  const prev = {}, base = {}
  const each = f => books.forEach(B => Object.keys(B).forEach(k => f(B, k)))
  each((B, k) => { prev[k] = +(B[k][1] - B[k][2]).toFixed(2); base[k] = B[k][1] })
  const find = k => books.find(B => B[k])
  const tickSize = l => l < 50 ? 0.01 : 0.05
  const sign = n => (n >= 0 ? '+' : '') + n.toFixed(2)
  const pct = k => { const B = find(k); return B[k][2] / prev[k] * 100 }
  const fmtCh = (k, f) => {
    const c = find(k)[k][2], p = pct(k)
    if (f === 'abs') return sign(c)
    if (f === 'pct') return sign(p) + '%'
    if (f === 'pill') return (c >= 0 ? '+' : '−') + Math.abs(p).toFixed(2) + '%'
    if (f === 'wl') return `${sign(c)}<span class="wl-pct">(${Math.abs(p).toFixed(2)}%)</span>`
    return `${sign(c)} (${Math.abs(p).toFixed(2)}%)`
  }

  // paint one instrument everywhere it's on screen
  function paint(k, dir) {
    const sel = CSS.escape(k), c = find(k)[k][2]
    $$(`[data-px="${sel}"]`).forEach(el => {
      const l = find(k)[k][1]; el.textContent = el.dataset.pf === '1' ? l.toFixed(1) : fmt(l)
      if (!dir) return
      el.classList.remove('tk-up', 'tk-dn'); void el.offsetWidth; el.classList.add(dir > 0 ? 'tk-up' : 'tk-dn')
    })
    $$(`[data-ch="${sel}"]`).forEach(el => {
      const f = el.dataset.cf || 'full', v = fmtCh(k, f)
      if (f === 'wl') el.innerHTML = v; else el.textContent = v
      el.classList.toggle('pos', c >= 0); el.classList.toggle('neg', c < 0)
    })
  }

  function step() {
    const moved = []
    each((B, k) => {
      if (Math.random() > P) return
      const l = B[k][1], t = tickSize(l), vol = Math.max(t, l * 0.00035)
      const n = +(Math.round((l + (Math.random() - 0.5) * 2 * vol + (base[k] - l) * 0.03) / t) * t).toFixed(2)
      if (Math.abs(n - l) < t / 2) return
      B[k][1] = n; B[k][2] = +(n - prev[k]).toFixed(2); moved.push(k); paint(k, n > l ? 1 : -1)
    })
    if (moved.length) onTick && onTick(moved)
  }
  setInterval(() => { if (!document.hidden) step() }, EVERY)
  return { paint, prev: k => prev[k] }
}
