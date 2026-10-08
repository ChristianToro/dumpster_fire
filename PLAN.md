# Plan: US Debt "Dumpster Fire" single-page site

## Context
`asset/` holds a self-contained animated pixel-art dumpster-fire component (`dumpster.js` mounts an inline SVG into `[data-dumpster-fire]`, and `dumpster.css` animates it). That animation becomes the landing page of a lightweight, minimalist single-page site:

1. **Landing:** shows only the animated dumpster.
2. **Click the dumpster:** the current US national debt appears as a live ticker that keeps rising.
3. **Middle section:** a graph of the national debt from 2000 to 2026.

**Data source:** Treasury's fiscaldata API, endpoint `debt_to_penny`.

The user explicitly started `/prompt-history`, so this project opts in: CLAUDE.md names the skill, and `PROMPT-HISTORY.md` records the work. Plan mode allows no writes, so both files are created in step 1 of execution.

### Decisions (made by the user via AskUserQuestion)
- **Rate:** calendar-day average over the last 5 record intervals: `(latest − value 5 records earlier) ÷ elapsed time`. Weekend and holiday gaps are counted correctly.
- **Ticker start:** projected to now: `latest + rate × (now − anchor)`. Every visitor sees the same number at the same moment.
- **Chart:** hand-built inline SVG with no dependencies.
- **After the click:** the dumpster shrinks into a header icon. Clicking it returns to the landing view.

### API facts (verified with curl today)
- **Request:** `GET https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?filter=record_date:gte:2000-01-01&fields=record_date,tot_pub_debt_out_amt&sort=record_date&page[size]=10000`
- **Response:** 6,719 rows in one page, about 482 KB in about 1 s. `Access-Control-Allow-Origin: *`, so the browser can call it directly with no proxy and no key.
- **Fields:** amounts are strings such as `"40284036147367.19"`. Use `tot_pub_debt_out_amt` (Total Public Debt Outstanding). Rows exist for business days only.
- **Latest record:** 2026-10-07. Today's 5-interval rate is about $16.0B/day (about $185K/s).
- **Rates can go negative:** one of the 5 deltas is negative (Oct 1 → Oct 2, −$18B). Default: show the computed rate honestly. If the average is negative, the ticker counts down.

## Execution order
1. **Now (the user's request):** write this plan verbatim to `PLAN.md` at the repo root. Create `PROMPT-HISTORY.md` (header, session heading, Interactions 1–3; Interaction 3 is the PLAN.md request) and `CLAUDE.md` with the prompt-history opt-in line. **Then stop.** Planning is still ongoing, so no site code is written until the user says to implement.
2. **Later, on the user's go-ahead:** implement the Approach below and log each step in `PROMPT-HISTORY.md`.

## Approach
One `fetch` covers both the ticker and the chart. It starts on page load so the data is usually ready before the user clicks. If the user clicks first, the ticker shows "Loading…". The site stays static: plain ES modules and no build step.

### Files
| File | Change |
|---|---|
| `index.html` (new, repo root) | The site. `<body data-view="landing">`. A `<button class="dumpster-button" aria-label="Show the current US national debt">` wraps `<div class="dumpster-fire" data-dumpster-fire>`. A `<section class="debt">` holds the ticker, caption and chart. Loads `asset/dumpster.css`, `site.css`, `asset/dumpster.js` (defer) and `src/app.js` (`type="module"`). |
| `site.css` (new) | Minimalist dark layout that matches the dumpster palette (`#0c101b` page). Two views switch on `body[data-view]`. The dumpster animates from about 520px centered down to about 72px in the header (transform transition, turned off under `prefers-reduced-motion`). The ticker uses a large monospace font with `font-variant-numeric: tabular-nums` so digits don't jitter. 16px side gutters and no horizontal scroll at phone width. |
| `src/debt.js` (new, pure, no DOM) | `fetchDebtSeries()` returns `[{date: ms, value: number}]`. `dailyRate(series, n = 5)` returns $/ms from the last n+1 rows. `anchorTime(row)` returns the end of the record's day. `projectNow(series, rate, now)`. `monthlySeries(series)` keeps the last row of each month (about 322 points) for the chart. `formatUSD()` uses `Intl.NumberFormat`, whole dollars. |
| `src/chart.js` (new) | `renderDebtChart(svgEl, monthly)` draws a line and a light area fill. X ticks every 5 years (2000…2025). Y gridlines every $10T with `$10T` labels. Hover/touch shows a vertical rule, a point and a readout (`Mar 2020 · $23.5T`). A `ResizeObserver` redraws at the real pixel width so text never stretches. |
| `src/app.js` (new) | Starts the fetch on load. Handles view switching (the button sets `data-view="debt"`, the header icon sets it back). The ticker loop updates `textContent` on `requestAnimationFrame`, or once a second under reduced motion. Caption: "Projected from Treasury's Debt to the Penny · last official figure $X on Oct 7, 2026 · +$16.0B/day (5-day avg)". Error state: "Couldn't reach fiscaldata.treasury.gov" plus a Retry button. |
| `test/debt.test.js` (new) | `node --test` tests (Node 24 is installed, so no dependencies) for `dailyRate` (weekend gap, negative delta), `projectNow`, `monthlySeries` and `formatUSD`. Uses a fixed fixture made from the 7 real rows fetched today. |
| `asset/dumpster.css` | Move the "Demo page only" rules (`body`, `main`, `h1`) into a `<style>` in `asset/index.html`. Otherwise they would restyle the real site. |
| `asset/index.html` | Gets those demo rules inline. The component demo keeps working. |
| `asset/dumpster.js` | No change. It auto-mounts on DOMContentLoaded and is reused as is. |
| `CLAUDE.md` (new) | The draft from the `/init` pass, updated for the new structure (site vs. component, run/test commands, rate and anchor semantics, the SVG background-rect gotcha) and with the prompt-history opt-in line. |
| `PROMPT-HISTORY.md` (new) | Skill header, then **Session: 2026-10-08**. Interaction 1 records the `/init` repo setup and the user keeping planning open. Interaction 2 records the site requirements prompt verbatim, the API findings and the four user decisions. Further entries are appended as implementation proceeds. |

### Notes
- **Anchor time:** `record_date` is an end-of-day figure, so `anchorTime` = record_date + 1 day at 00:00 UTC. This is close enough to Treasury's ET close for a per-second ticker.
- **Precision:** about $40T with cents is roughly 16 significant digits, slightly past what a double holds exactly. Displaying whole dollars avoids visible error.
- **Accessibility:** no `aria-live` on the ticker, which would be too chatty. The ticker carries an `aria-label` with the official figure and its date.
- **Load the `dataviz` skill** before writing `chart.js`, as the environment requires.

## Verification
1. `node --test test/` passes.
2. `python3 -m http.server 8000` from the repo root (ES modules don't load over `file://`), then open `http://localhost:8000/`:
   - Landing shows only the animated dumpster.
   - Click: the dumpster shrinks to the header, the ticker appears and rises at about `rate × 1000` dollars per second, and the chart spans 2000–2026.
   - Clicking the header icon returns to landing.
3. Check the ticker's first value against a manual calculation from the API (`latest + rate × elapsed`).
4. Simulate an offline fetch (point the URL at an invalid host) and confirm the error state and Retry work.
5. Use the `run` skill or the browser to screenshot both views at desktop and 375px width.
6. Confirm the latest work is logged in `PROMPT-HISTORY.md` before finishing.
