# SAHI Stock Scalper prototype (source)

Mobile prototype of Stock Scalper and the Stock Scanner ("Stocks on the move", formerly "Switch symbol") inside the SAHI app, rebuilt from the Android app with SAHI DLS tokens. Vite, plain JavaScript. All prices are sample data captured on 9 Nov 2026; no order is ever sent.

## Run it

```bash
npm install
npm run dev        # http://localhost:8444  (set PORT=xxxx to change)
```

Open it at phone width (browser device mode, 412 wide) or on a desktop, where it shows in a phone frame. The first screen is Home; tap **Trade**, then **Stock Scalper**. That opens the full **Stocks on the move** page (also what the Home widget's View all opens); the chart opens once you pick a stock. On the chart, slide the stock strip under it to move through the same list.
Shortcuts: `/#stocks` opens the scanners landing page, `/#scalper` opens the scalper directly, `/#scanner` opens the Stocks on the move sheet. Every time the chart opens on a list of 2+ stocks, the stock strip nudges sideways once to show it slides.

## Where things are

| You want to change | Look in |
|---|---|
| Colours, spacing, radius, fonts | `src/tokens.css` (SAHI Base · DLS). Nothing else should hold a colour value. |
| Screens and sheets (Home, Trade with SAHI, Scanners landing, Scalper, Stocks on the move, Filter, P&L, Positions, Orders, More, Order defaults, Guided tour) | `index.html` |
| Styles for all of the above | `src/scalper.css` |
| Sample stocks, scanners, holdings, chart, order bar, sheets, tour | `src/main.js` |
| Fonts (SAHI Sans, SAHI Season Display Mix, DlsIcons) | `public/fonts` |
| Images | `public/assets` |

## Deploy

`npm run deploy` builds and publishes to the `gh-pages` branch (GitHub Pages), same as the Mutual Funds prototype. Needs a GitHub `origin` remote.

## Feedback v2 (dev only)

The 1-Tap bar always shows the trade value and margin. **More → Order Defaults → Order size** picks what you type: **Quantity** (default, as in the SAHI app; the bar shows trade value and margin) or **₹ Amount** (you type the trade value; the bar shows shares and margin). The bar and the order form live in `src/fb2.js` / `src/fb2.css`. Tap the clock at the top to pick the market time (pre-open, open, square-off, closed, Muhurat); it starts at 11:30 AM.

- Rupee amount is the main input on the 1-Tap bar (switch `₹ / Qty`); shares and margin are worked out from it.
- Total trade value is always shown, not only margin.
- The order-form button opens a redesigned order form (placeholder layout until Dale's sample is shared).
- The More sheet keeps trade settings only (Guided tour removed).
- The ₹ amount is the trade value (agreed with Manish); margin = trade value ÷ leverage (5x).
