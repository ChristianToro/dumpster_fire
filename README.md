# US Debt Dumpster Fire

A lightweight, minimalist single-page site that shows the US national debt as a live, ever-rising number. It draws on Treasury's official [Debt to the Penny](https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/) data.

The landing page shows only an animated pixel-art dumpster fire. Click it, and the dumpster shrinks into a small header icon. In its place appear:

- a **live ticker**: the debt projected to this moment, counting up continuously;
- a **chart** of total public debt from 2000 to 2026, with hover and keyboard readouts and a year-end table.

The site is plain HTML, CSS and ES modules. There is no build step, no framework, no API key and no runtime dependency.

---

## Contents

- [Running it](#running-it)
- [How it works](#how-it-works)
- [How the Treasury API is used](#how-the-treasury-api-is-used)
- [Design decisions](#design-decisions)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Accessibility and motion](#accessibility-and-motion)
- [Gotchas](#gotchas)
- [How this project was built](#how-this-project-was-built)

---

## Running it

You need Python 3, or any other static file server, and a modern browser.

```bash
git clone https://github.com/ChristianToro/dumpster_fire.git
cd dumpster_fire
python3 -m http.server 8000
```

Open <http://localhost:8000/> and click the dumpster.

> Serve the files over HTTP. Opening `index.html` directly from disk (`file://`) won't work, because browsers refuse to load ES modules (`<script type="module">`) that way.

To stop the server, press `Ctrl+C` in its terminal.

The dumpster component on its own has a demo page at <http://localhost:8000/asset/index.html>. That page has no modules, so it also works when opened directly from disk.

### Deploying

Any static host works, for example GitHub Pages, Netlify or an S3 bucket: upload the repo root as-is. The browser calls Treasury's API directly. That API allows cross-origin requests and needs no key, so no server-side code or proxy is required.

---

## How it works

```
 Landing view                 Debt view
┌──────────────────┐  click  ┌───────────────────────────────────────────┐
│                  │ ──────► │              [dumpster icon]  ◄── back    │
│  ┌────────────┐  │         │              US NATIONAL DEBT             │
│  │  ▲▲ ▲▲▲ ▲  │  │         │      $40,299,240,197,335   (ticking)      │
│  │ ┌────────┐ │  │         │       +$16.0B/day · 5-day average         │
│  │ │HOT MESS│ │  │         │ Official $40,284,036,147,367 · Oct 7, 2026│
│  │ └────────┘ │  │         │  Source: Treasury's Debt to the Penny     │
│  └────────────┘  │         │                                           │
│                  │         │  Total public debt outstanding since 2000 │
│                  │         │  $40T ┤                            ___●   │
│                  │         │  $20T ┤               ______------        │
│                  │         │    $0 ┼─────────────────────────────────  │
│                  │         │       2000     2010     2020              │
│                  │         │            ▸ Year-end values              │
└──────────────────┘         └───────────────────────────────────────────┘
```

1. **On page load**, `src/app.js` starts fetching the whole dataset in the background. By the time a visitor clicks, the data is usually already there.
2. **On click**, the dumpster `<button>` switches `body[data-view]` from `landing` to `debt`. A FLIP animation (see [Design decisions](#design-decisions)) shrinks it smoothly into the header, and the debt section fades in.
3. **The ticker** recomputes the projected debt on every animation frame and prints it in whole dollars.
4. **The chart** draws itself as an inline SVG at the container's real pixel width. It redraws whenever that width changes.
5. **Clicking the header icon** returns to the landing view and stops the ticker.

If the API can't be reached within 15 seconds, the page shows *"Couldn't reach fiscaldata.treasury.gov."* with a **Retry** button.

---

## How the Treasury API is used

### Endpoint

The site uses one endpoint from the U.S. Treasury's [Fiscal Data API](https://fiscaldata.treasury.gov/api-documentation/):

```
GET https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny
```

The dataset publishes the total public debt outstanding for each business day.

### One request for everything

`buildQuery()` in `src/debt.js` builds a single request that serves both the ticker and the chart:

| Parameter | Value | Why |
|---|---|---|
| `filter` | `record_date:gte:2000-01-01` | The chart starts in 2000. |
| `fields` | `record_date,tot_pub_debt_out_amt` | Only the two columns we need, which keeps the payload small. |
| `sort` | `record_date` | Oldest first, the order the chart draws in. |
| `page[size]` | `10000` | All ~6,700 rows since 2000 fit in one page, so there is no pagination. |

That returns about 480 KB of JSON in roughly a second:

```json
{
  "data": [
    { "record_date": "2000-01-03", "tot_pub_debt_out_amt": "5751743092605.50" },
    "…",
    { "record_date": "2026-10-07", "tot_pub_debt_out_amt": "40284036147367.19" }
  ],
  "meta": { "count": 6719, "total-count": 6719, "total-pages": 1 }
}
```

**`tot_pub_debt_out_amt`** is *Total Public Debt Outstanding*: debt held by the public plus intragovernmental holdings. This is the headline "national debt" figure.

### Parsing

`parseRows()` turns each row into `{ date, value }`:

- `date` is milliseconds at **00:00 UTC** of `record_date`. UTC keeps a record's date from shifting with the viewer's timezone.
- `value` is the amount as a JavaScript number. The API sends amounts as **strings**.
- Malformed rows are dropped, and the result is sorted oldest first.

### The 5-day rate

The ticker climbs at the average rate of change over the **last 5 record-to-record intervals**, which uses the 6 most recent records:

```
rate = (latest value − value 5 records earlier) ÷ (time between those two records)
```

`dailyRate()` divides by **elapsed calendar time**, not by the number of records. The API has no rows for weekends or holidays, so a Friday → Monday step really covers three days.

Worked example with the data on 2026-10-08:

| record_date | Total public debt |
|---|---|
| 2026-09-30 | $40,171,825,101,340.31 |
| 2026-10-01 | $40,260,641,972,390.03 |
| 2026-10-02 | $40,242,446,619,209.33 (a decrease) |
| 2026-10-05 | $40,249,104,431,078.48 (after a weekend) |
| 2026-10-06 | $40,273,024,579,219.17 |
| 2026-10-07 | $40,284,036,147,367.19 |

```
(40,284,036,147,367.19 − 40,171,825,101,340.31) ÷ 7 days
  = $112.2B ÷ 7 days
  ≈ $16.0B per day  ≈ $185,500 per second
```

A per-record average would divide by 5 instead and claim about $22.4B/day. That overstates the pace by 40%, because it counts the weekend as a single day.

The rate can be **negative**: the debt does fall on some days (Oct 1 → Oct 2 above). The page shows the computed rate honestly, so if the 5-interval average is negative, the ticker counts down.

### Projecting to "now"

Each `record_date` amount is an end-of-day figure, so `anchorTime()` places it at the **following midnight UTC**. `projectNow()` then extrapolates:

```
displayed value = latest official value + rate × (now − anchor)
```

So the ticker shows an estimate of the debt *right now*, not the official figure from a day or two ago. Every visitor sees the same number at the same moment. The caption always shows the last official figure and its date next to the estimate.

### Chart data

- **Chart:** `monthlySeries()` reduces the ~6,700 daily rows to the **last record of each month** (~322 points). That is plenty of detail for a chart a few hundred pixels wide.
- **Table:** `yearEndSeries()` keeps the **last record of each year** for the table view. The current year shows its latest record.

### Formatting

- **Ticker:** whole dollars, through `Intl.NumberFormat`. Cents are dropped on purpose: ~$40 trillion with cents has about 16 significant digits, slightly more than a JavaScript double holds exactly.
- **Chart labels:** `$40.3T`.
- **Rate:** `+$16.0B/day`.
- **Dates:** `Oct 7, 2026`, formatted in UTC.

### CORS and keys

The API responds with `Access-Control-Allow-Origin: *` and needs no authentication, so the browser calls it directly with `fetch`. The request has a 15-second `AbortSignal.timeout`.

---

## Design decisions

The project was planned before any code was written. The full plan is in [`PLAN.md`](PLAN.md). Four questions had more than one reasonable answer, and the project owner settled each one before implementation:

| Question | Decision | Reasoning |
|---|---|---|
| How is the "average of the previous 5 consecutive days" calculated, given that the data skips weekends? | **Calendar-time average** over the last 5 intervals | Counts weekend gaps correctly, so the ticker keeps pace with the real trend instead of running ~40% fast. |
| Where does the ticker start? | **Projected to now** from the end of the last record's day | The number estimates the debt at this moment, and everyone sees the same value at the same instant. |
| How is the chart built? | **Hand-built inline SVG**, no charting library | Keeps the site dependency-free and tiny, and suits the minimalist goal. |
| What happens to the dumpster after the click? | **Shrinks into a header icon** that returns to landing | Keeps the visual identity on the data view and gives an obvious way back. |

### Visual design

- **Minimalist and dark:** the page background (`#0c101b`) matches the dumpster's palette. Text is either light or muted gray, and orange is the only accent.
- **The dumpster is the only control.** The landing page has no text and no other buttons.
- **Pixel-art integrity:** the SVG uses `shape-rendering="crispEdges"` and every sprite animation uses `steps()` timing, so flames flicker in discrete frames. The FLIP shrink is the one smooth animation, because it moves the whole card rather than animating the art.
- **Ticker typography:** a monospace font with `tabular-nums`, so the rapidly changing digits don't jitter sideways.
- **Chart styling:**
  - one 2px line with a 10% area wash, hairline gridlines every $10T, and an end-point label;
  - no legend, because a single series is named by the chart's title;
  - the line color `#fa541c` is the dumpster's own outer-flame orange.
- **Chart color validation:** `#fa541c` was checked with a palette validator for lightness and contrast on the dark background. The site's lighter accent orange failed that check, so it is used only for text.

### The FLIP transition

Moving the dumpster from "centered and large" to "top and small" means changing the layout, and a CSS transition can't animate that kind of change. `flip()` in `src/app.js` uses the FLIP technique (*First, Last, Invert, Play*):

1. It measures the button.
2. It switches `data-view`.
3. It measures the button again.
4. It plays a Web Animation from the old box back to the new one.

All sizes and positions stay in `site.css`.

### A responsive chart

The chart redraws at the container's real width through a `ResizeObserver`, instead of scaling a fixed-size image, so axis text stays the same size on a phone as on a desktop. Below 480px, year labels drop from every 5 years to every 10.

---

## Project structure

```
.
├── index.html          # The site: dumpster button, ticker, caption, chart figure
├── site.css            # Page layout, views, ticker, chart, retry button (design tokens on :root)
├── src/
│   ├── debt.js         # Pure data layer: query, parsing, rate, projection, downsampling, formatting
│   ├── chart.js        # SVG chart (mountDebtChart) and year-end table (renderYearTable)
│   └── app.js          # Wiring: load/retry, view switching, FLIP, ticker loop, caption
├── asset/              # Self-contained dumpster-fire component (also usable on its own)
│   ├── dumpster.js     # Inline SVG artwork; mounts into every [data-dumpster-fire] element
│   ├── dumpster.css    # All sprite animations (flames, smoke, embers, glow)
│   └── index.html      # Standalone component demo
├── test/
│   └── debt.test.js    # Unit tests for src/debt.js (node --test)
├── PLAN.md             # The approved implementation plan
├── CLAUDE.md           # Guidance for AI coding agents working in this repo
└── PROMPT-HISTORY.md   # Engineering log of how the project was built
```

`src/debt.js` never touches the DOM, which is why Node can test it directly. Everything that touches the page lives in `src/app.js` and `src/chart.js`.

### Reusing the dumpster component

The component in `asset/` is independent of the debt site. To drop it into any page:

```html
<link rel="stylesheet" href="asset/dumpster.css">
<div class="dumpster-fire" data-dumpster-fire></div>
<script src="asset/dumpster.js" defer></script>
```

It mounts itself on `DOMContentLoaded`. For content added later, call `window.mountDumpsterFires(rootElement)`. It is safe to call more than once.

---

## Testing

The data layer has unit tests that run on Node's built-in test runner. There is nothing to install.

You need Node 22.7 or newer (or 20.19 or newer); the project was developed on Node 24. The source files use `import`/`export`, and the repo has no `package.json` declaring them as modules, so the tests rely on Node recognizing ES-module syntax automatically, which older versions don't do.

```bash
node --test                                   # all tests in test/**/*.test.js
node --test --test-name-pattern="dailyRate"   # a single test by name
```

> Don't pass the folder (`node --test test/`). Newer Node versions read that argument as a file pattern, and the run fails.

The tests use real API rows as fixtures. They cover:
- the weekend gap in the rate calculation;
- a negative rate;
- too few records;
- the projection anchor;
- monthly and year-end downsampling;
- all formatters;
- handling of HTTP errors.

The page itself was verified by driving it in headless Chrome with Playwright, at desktop (1280px) and phone (375/390/320px) widths. Those checks covered:
- the click and return flow, and the ticker's rate;
- chart hover and keyboard navigation;
- the error and Retry path, plus a hung request hitting the timeout;
- reduced motion;
- resizing from desktop to phone width with no sideways scroll.

These browser checks are not committed as automated tests.

---

## Accessibility and motion

- **Keyboard:** the dumpster is a real `<button>`, and its label updates ("Show the current US national debt" / "Back to the dumpster"). The chart is focusable:
  - `←` / `→` step one month;
  - `PgUp` / `PgDn` step one year;
  - `Home` / `End` jump to the first and latest points;
  - `Esc` hides the readout.
- **Screen readers:**
  - The rapidly changing ticker is `aria-hidden`, so it can't flood the reader with announcements. A static summary carries the official figure, its date and the rate instead.
  - The chart has a descriptive label, and its readout is `aria-live`.
  - Every value on the chart is also in the **Year-end values** table, so nothing depends on hovering.
- **`prefers-reduced-motion`** turns off:
  - the flame, smoke and ember animations;
  - the FLIP shrink and the fade-in.

  The ticker then updates once per second instead of every frame.

---

## Gotchas

- **Headless browsers are blocked by Treasury's firewall.** The API answers the `HeadlessChrome` user agent with an HTML `500` that has no CORS header, which looks like a CORS error in the console. Real browsers are unaffected. In automated browser tests, set a normal Chrome user agent.
- **Official data lags behind today.** The latest record is usually a business day or more old. On 2026-10-08, for example, it was dated Oct 7. The ticker's projection bridges that gap, and the caption always shows which official date it builds on.
- **The hidden attribute needs help.** Rules like `.chart { display: grid }` override the browser's built-in `[hidden]` style, so `site.css` has a global `[hidden] { display: none !important }`. Toggle visibility with `element.hidden`.
- **Grid items around the chart need `min-width: 0`.** Without it, a chart drawn at desktop width pins its column open after the window narrows. Test narrow layouts by *resizing down* from desktop, not only by loading at phone width.

---

## How this project was built

The project was built in collaboration with an AI coding agent (Claude Code), in reviewed steps:

1. **Planning:** requirements, a check of the live API, the four design decisions above, and then [`PLAN.md`](PLAN.md).
2. **Milestones**, each reviewed by the project owner before being committed:
   1. data layer and tests;
   2. landing page, transition and ticker;
   3. chart;
   4. error retry, reduced motion and docs.
3. **A bug-fix branch** (`fix-UI-graph-error`) for a chart overflow on mobile, merged through a pull request.

[`PROMPT-HISTORY.md`](PROMPT-HISTORY.md) records the requests, decisions, rejected approaches and verification for every step.

---

*Data: U.S. Department of the Treasury, Bureau of the Fiscal Service, [Debt to the Penny](https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/). The ticker is an estimate based on recent official figures, not an official real-time number.*
