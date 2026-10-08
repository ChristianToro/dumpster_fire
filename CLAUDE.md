# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Use the `prompt-history` skill to maintain PROMPT-HISTORY.md — invoke it at the
start of the session and keep it updated as work progresses.

## Project

A lightweight, minimalist single-page site that shows the current US national debt, using data from Treasury's fiscaldata `debt_to_penny` API. The landing view shows only the animated pixel-art dumpster fire from `asset/`. Clicking it reveals two things: a live debt ticker that rises at the 5-day calendar-time average rate, and a 2000–present debt chart.

`PLAN.md` holds the approved design: the file layout, the API query, and the user's decisions on rate math, ticker anchoring, the chart approach and the post-click behavior. The site itself is **not built yet**. Read `PLAN.md` before implementing, and don't re-open the decisions it records.

The project is plain HTML, CSS and ES modules, with no build step and no dependencies.

## Running

There is no build step, package manager or linter. Once the site exists, serve the repo root. ES modules don't load over `file://`.

    python3 -m http.server 8000

The component demo alone can be opened directly at `asset/index.html`.

## Dumpster component (`asset/`)

- `asset/dumpster.js`: an IIFE that holds the whole artwork as one inline SVG string (`artwork`). `mountDumpsterFires(root = document)` puts that SVG into every `[data-dumpster-fire]` element that doesn't already contain an `<svg>`, so it is safe to call more than once. It runs automatically on DOMContentLoaded and is also exposed as `window.mountDumpsterFires`.
- `asset/dumpster.css`: all animation lives here, not in the SVG. CSS classes on SVG groups drive the keyframes:
  - `.flame` (variants `.two`, `.three`)
  - `.smoke` (`.s2`, `.s3`)
  - `.ember` (`.e2`–`.e4`)
  - `.glow`
  Variants differ only in `animation-delay`/`animation-duration`. To add an animated element, add a classed `<g>` in the SVG string and a matching rule in the CSS. Keep the `prefers-reduced-motion` block up to date when you do.
- Component styles are all scoped under `.dumpster-fire`. The rules after the "Demo page only" comment (`body`, `main`, `h1`) style only the demo and must not leak into the real site. `PLAN.md` moves them into `asset/index.html`.

## Gotchas

- Pixel-art look: the SVG uses `shape-rendering="crispEdges"`, the CSS uses `image-rendering: pixelated`, and every animation uses `steps(n)` timing. Keep using stepped timing; smooth easing breaks the style.
- The 320×240 `viewBox` matches the container's `aspect-ratio: 320 / 240`. Change both together.
- The SVG's first `<rect>` paints the full background as `#141827`, the same value as `--dumpster-background`. Changing the CSS variable alone has no visible effect. That rect has to be changed or removed too.
- API data:
  - `debt_to_penny` has rows for business days only.
  - Amounts are strings: parse them, and display whole dollars, since ~$40T with cents exceeds double precision.
  - The 5-record rate can include negative days.
  - The endpoint sends `Access-Control-Allow-Origin: *`, so the browser calls it directly.
