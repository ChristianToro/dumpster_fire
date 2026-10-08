# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Use the `prompt-history` skill to maintain PROMPT-HISTORY.md — invoke it at the
start of the session and keep it updated as work progresses.

## Project

A lightweight, minimalist single-page site that shows the current US national debt, using data from Treasury's fiscaldata `debt_to_penny` API. The landing view shows only the animated pixel-art dumpster fire from `asset/`. Clicking it reveals two things: a live debt ticker that rises at the 5-day calendar-time average rate, and a 2000–present debt chart.

`PLAN.md` holds the approved design: the file layout, the API query, and the user's decisions on rate math, ticker anchoring, the chart approach and the post-click behavior. Work proceeds in milestones on branch `v1_prototype`, and each milestone is committed separately after the user reviews it. Read `PLAN.md` before implementing, and don't re-open the decisions it records.

The project is plain HTML, CSS and ES modules, with no build step and no dependencies.

## Running and testing

There is no build step, package manager or linter. Serve the repo root and open http://localhost:8000/. ES modules don't load over `file://`.

    python3 -m http.server 8000

The component demo alone can be opened directly at `asset/index.html`.

Tests use Node's built-in runner (Node 24) and need no dependencies:

    node --test                                   # all test/**/*.test.js
    node --test --test-name-pattern="dailyRate"   # a single test by name

Pass no path argument: Node 24 reads `node --test test/` as a file pattern and fails.

## Data layer (`src/debt.js`)

These are pure functions with no DOM access, which is why Node can test them.

- **Units:** points are `{ date, value }`. `date` is ms at 00:00 UTC of `record_date` and `value` is dollars. Rates are **dollars per millisecond**.
- **`dailyRate`:** divides by elapsed calendar time, not by the number of records. This is a decision the user made, so don't "fix" it to a per-record average.
- **`projectNow`:** measures from `anchorTime` (the next midnight UTC after the last record), not from the moment the page loads.

## Page (`index.html`, `site.css`, `src/app.js`)

- **View switching:** `body[data-view]` is either `landing` or `debt`, and CSS swaps the layout. The dumpster `<button>` is the only control: it toggles the view and updates its `aria-label`.
- **Shrink transition:** a FLIP in `app.js` (`flip()`). It measures the button, flips `data-view`, then uses the Web Animations API to animate from the old box to the new one. Size and position live in `site.css`, not in JS.
- **Data loading:** the API fetch starts on page load, not on click.
- **Ticker:** redraws every `requestAnimationFrame` while the debt view is open, or once a second under `prefers-reduced-motion`. It stops on returning to landing. The visible number is `aria-hidden`; screen readers get the static `[data-ticker-summary]` text instead.

## Dumpster component (`asset/`)

- `asset/dumpster.js`: an IIFE that holds the whole artwork as one inline SVG string (`artwork`). `mountDumpsterFires(root = document)` puts that SVG into every `[data-dumpster-fire]` element that doesn't already contain an `<svg>`, so it is safe to call more than once. It runs automatically on DOMContentLoaded and is also exposed as `window.mountDumpsterFires`.
- `asset/dumpster.css`: all animation lives here, not in the SVG. CSS classes on SVG groups drive the keyframes:
  - `.flame` (variants `.two`, `.three`)
  - `.smoke` (`.s2`, `.s3`)
  - `.ember` (`.e2`–`.e4`)
  - `.glow`
  Variants differ only in `animation-delay`/`animation-duration`. To add an animated element, add a classed `<g>` in the SVG string and a matching rule in the CSS. Keep the `prefers-reduced-motion` block up to date when you do.
- Component styles are all scoped under `.dumpster-fire`. The rules after the "Demo page only" comment (`body`, `main`, `h1`) style only the demo. They live in `asset/index.html`, so `dumpster.css` is safe to load on the real site.

## Gotchas

- Pixel-art look: the SVG uses `shape-rendering="crispEdges"`, the CSS uses `image-rendering: pixelated`, and every animation uses `steps(n)` timing. Keep using stepped timing; smooth easing breaks the style.
- The 320×240 `viewBox` matches the container's `aspect-ratio: 320 / 240`. Change both together.
- The SVG's first `<rect>` paints the full background as `#141827`, the same value as `--dumpster-background`. Changing the CSS variable alone has no visible effect. That rect has to be changed or removed too.
- API data:
  - `debt_to_penny` has rows for business days only.
  - Amounts are strings: parse them, and display whole dollars, since ~$40T with cents exceeds double precision.
  - The 5-record rate can include negative days.
  - The endpoint sends `Access-Control-Allow-Origin: *`, so the browser calls it directly.
- **Headless browser testing:** Treasury's WAF answers the `HeadlessChrome` user agent with an HTML 500 that has no CORS header, so the page shows its error state. Give Playwright/Chrome a normal user agent (e.g. replace `HeadlessChrome` with `Chrome` in `navigator.userAgent`).
