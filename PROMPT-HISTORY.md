# Prompt History

This document records meaningful development interactions between the user and
AI coding agents working on this project. It focuses on requests, outcomes,
implementation decisions, verification, and human-agent collaboration rather
than preserving a raw conversation transcript.

Generated code is included verbatim when reasonably concise. Extensive
implementations are referenced through their canonical repository files.

> This file is an engineering collaboration record, not a source of truth for
> application behavior. The repository itself remains authoritative.

---

## Session: 2026-10-08

**Objective:** Plan a lightweight, minimalist single-page site. Its landing page is the existing pixel-art dumpster-fire animation, and clicking the dumpster reveals a live US national debt ticker and a 2000–2026 debt chart built from fiscaldata `debt_to_penny`.

### Interaction 1 — Repository init

**User Prompt**

> /init

**Agent Outcome**

Inspected the repo. It is a git repo with no commits, containing only `asset/index.html`, `asset/dumpster.css` and `asset/dumpster.js`: a self-contained SVG and CSS dumpster-fire component. There is no build step, tests, README or other agent configs. Drafted a CLAUDE.md in the plan file. The draft points out a gotcha: the SVG's own background `<rect>` hides any change to `--dumpster-background`.

**Collaboration**

The user rejected exiting plan mode at this point:

> the init was ran for procedural repo starting. We are still going to maintain the planning phase. Begin the /prompt-history skill as we continue to plan this project

Claude can't invoke `prompt-history` itself, so the user ran `/prompt-history` directly.

### Interaction 2 — Site requirements and design decisions

**User Prompt**

> The files within the directory serve as the main icon that will appear at the landing page for a lightweight, single page website.
>
> The purpose of the webpage is to display the current US debt by leveraging fiscaldata.gov APIs, specifically the debt_to_penny endpoint.
>
> The landing page will only display the animation. The goal is to have a user click the dumpster icon, and for the current debt amount to appear on screen as a ticker. Data is updated on a daily basis, but I want the dollar amount to continually increase once displayed: the rate of increase must be calculated as an average of increase from the previous 5 consecutive days.
>
> The middle section of the new page will display a graph covering the national debt from 2000 to the current year 2026.
>
> The design is minimalist.

**Agent Outcome**

Queried the live API with curl. Findings:
- One request covers the whole chart: `filter=record_date:gte:2000-01-01`, `fields=record_date,tot_pub_debt_out_amt`, `page[size]=10000`. It returns 6,719 rows in about 482 KB and about 1 s.
- The API sends `Access-Control-Allow-Origin: *`, so no proxy is needed.
- There are rows for business days only.
- The latest record is 2026-10-07, at $40,284,036,147,367.19.
- The last 5 intervals include a negative day (Oct 1 → Oct 2, −$18B).

Asked four design questions, then wrote the plan. The plan is now [`PLAN.md`](PLAN.md):
- Static ES modules: `src/debt.js` (pure data and rate logic), `src/chart.js` and `src/app.js`.
- Tests with `node --test`.
- The component's demo-only CSS moves out of `asset/dumpster.css`.

**Rationale**

"5 consecutive days" is ambiguous because the data skips weekends. With today's data, a per-record average gives about $22.4B/day and a calendar-time average gives about $16.0B/day, a gap big enough to need the user's call.

**Collaboration**

The user chose every option Claude recommended:
- **Rate:** calendar-day rate = (latest − value 5 records earlier) ÷ elapsed time.
- **Ticker start:** projected to now from the last record's end of day, not started from the stale official figure.
- **Chart:** hand-built inline SVG instead of Chart.js.
- **After the click:** the dumpster shrinks to a header icon that returns to landing when clicked.

Claude set one default without asking: a negative 5-day average is shown honestly, so the ticker counts down.

### Interaction 3 — Plan written to PLAN.md

**User Prompt**

> write this plan into a PLAN.md file at the root of the directory

**Agent Outcome**

Copied the approved plan verbatim to `PLAN.md`. Created `CLAUDE.md`, based on the `/init` draft, with the prompt-history opt-in line, a pointer to `PLAN.md`, and API gotchas. Created this file. No site code was written, because planning is still ongoing.

**Changes**

- [`PLAN.md`](PLAN.md): created; the approved implementation plan.
- [`CLAUDE.md`](CLAUDE.md): created.
- [`PROMPT-HISTORY.md`](PROMPT-HISTORY.md): created.

**Verification**

Not applicable. These are documentation files only, and there is no code to test yet.

### Interaction 4 — Milestone 1: data layer

**User Prompt**

> execute the plan with manual approve edits. We will code in milestones. After my review of the completed work, I will either suggest modifications or to continue. Each milestone will be committed separately.
>
> Begin the execution on a new branch titled "v1_prototype"

**Agent Outcome**

Created the branch `v1_prototype`. `main` had no commits, so the branch has no history yet. Split the plan into four milestones:
1. Data layer
2. Page and ticker
3. Chart
4. Polish

Built milestone 1, the pure data module and its tests. No commit yet: commits happen after the user reviews each milestone.

**Implementation**

- [`src/debt.js`](src/debt.js)
- [`test/debt.test.js`](test/debt.test.js)

Key symbols:
- `buildQuery()` and `fetchDebtSeries()` (takes an injectable `fetchImpl`)
- `parseRows()`
- `dailyRate()`: dollars per ms over the last 5 intervals, using calendar time
- `anchorTime()` and `projectNow()`
- `monthlySeries()`
- `formatUSD()` and `formatRatePerDay()`

**Changes**

- `src/debt.js`: created.
- `test/debt.test.js`: created. 10 tests using the 7 real API rows from 2026-10-08. They cover the weekend gap, a negative rate, too few records, the anchor and projection, monthly downsampling, formatting, and HTTP errors.
- `PLAN.md`: corrected the test command from `node --test test/` to `node --test`.
- `CLAUDE.md`: added test commands and data-layer notes on units, rate semantics and the anchor.

**Verification**

- `node --test` gives 10 passed, 0 failed. `node --test --test-name-pattern="dailyRate"` gives 3 passed.
- Running the helpers on the full API response saved earlier gave 6,719 rows (first 2000-01-03), 322 monthly points, `+$16.0B/day` (185,534 $/s), and a projection of $40,299,240,197,335. These match the figures in the plan.

**Attempted Approach / Resolution**

`node --test test/`, the command in the plan, fails on Node 24 because it reads the argument as a file pattern (`MODULE_NOT_FOUND`). Plain `node --test` finds the test files automatically.

### Interaction 5 — Commits, then Milestone 2: page and ticker

**User Prompt**

> separate baseline commit, then commit milestone 1 and continue

**Agent Outcome**

Made two commits on `v1_prototype`:
- `e68345e` is the baseline: `asset/` plus the planning docs as they stood before milestone 1. The docs had been edited during milestone 1, so their earlier versions were reconstructed and staged with `git update-index --cacheinfo`.
- `02677a1` is milestone 1.

Then built milestone 2, which is not committed yet and is waiting for review:
- **Landing view:** shows only the dumpster, which is a `<button>`.
- **Click:** a FLIP animation shrinks the dumpster from 520px in the center to an 88px header icon over about 450ms, and the debt section fades in.
- **Ticker:** redraws every animation frame from `projectNow()`. Under reduced motion it redraws once a second.
- **Caption:** three short lines: the rate (`+$16.0B/day · 5-day average`), the official figure and its date, and a source link.
- **Return:** clicking the header icon goes back to landing and stops the ticker.
- **Errors:** a basic error state ("Couldn't reach fiscaldata.treasury.gov.") is in place. Retry is still planned for milestone 4.

**Implementation**

- [`index.html`](index.html)
- [`site.css`](site.css)
- [`src/app.js`](src/app.js)

Key symbols: `startTicker()`, `renderCaption()`, `renderError()`, `flip()`.

**Changes**

- `index.html`, `site.css`, `src/app.js`: created. `index.html` includes an inline SVG favicon, which stops the `/favicon.ico` 404.
- `src/debt.js`: added `formatRecordDate()`, which formats in UTC so the record date never shifts with the viewer's timezone. Covered by a new test.
- `asset/dumpster.css`, `asset/index.html`: moved the demo-only `body`/`main`/`h1` rules into an inline `<style>` in the demo page.
- `CLAUDE.md`: added a section on the page architecture and the headless-browser WAF gotcha.

**Verification**

- `node --test`: 11 passed.
- Drove the real page in headless Chrome (Playwright from a local install, with the system Chrome) at 1280px and 375px:
  - **Landing:** the debt section is hidden.
  - **After click:** the ticker rose about $373K in 2 s, matching 2 × $185.5K/s, and the caption and screen-reader summary rendered correctly.
  - **Layout and console:** no horizontal scroll at either width, and no console errors.
  - **Return:** clicking back restores the landing view.
- Sampled the shrink animation mid-flight: width went 520 → 226 → 122 → 92 → 88px.
- The component demo at `asset/index.html` still has its own styles.
- Screenshots of both views were reviewed.

**Attempted Approach / Resolution**

The first browser run showed the error state, with Chrome reporting a CORS block. curl had shown `Access-Control-Allow-Origin: *`. The cause turned out to be Treasury's WAF: it answers the `HeadlessChrome` user agent with an HTML 500 that has no CORS header, while a normal Chrome user agent gets the JSON. This only affects automated testing, not real visitors. The test driver now sends a normal user agent.

The caption first wrapped badly at 375px, so it was rewritten as three short lines.

### Interaction 6 — Commit milestone 2, then Milestone 3: chart

**User Prompt**

> commit milestone 2 and continue

**Agent Outcome**

Committed milestone 2 as `29787dd`. Built milestone 3, which is not committed yet and is waiting for review. It adds a hand-built SVG chart, "Total public debt outstanding since 2000", in the middle of the debt view:
- **Plot:** a 2px line with a 10% area wash over 322 month-end points. Y gridlines every $10T, x labels every 5 years (every 10 below 480px wide), and an end dot labeled `$40.3T`.
- **Hover:** a crosshair snaps to the nearest month and shows a tooltip such as `$23.41T · Feb 28, 2020`.
- **Keyboard:** the chart is focusable and navigable with ←/→, PgUp/PgDn and Home/End.
- **Table view:** a "Year-end values" `<details>` table lists full-dollar figures from 2000 to 2026.
- **Errors:** the chart is hidden on fetch failure.

**Implementation**

- [`src/chart.js`](src/chart.js): `mountDebtChart()`, `renderYearTable()`

**Rationale**

The dataviz skill guided the details:
- **No legend:** with a single series, the title names it.
- **Table view:** a table backs up the tooltip, so no value is available only on hover.
- **Color:** chosen by running the validator, not by eye.

The site accent `#ff941e` failed the dark-mode lightness band (L 0.764, band 0.48–0.67). `#fa541c`, the outer flame color already in the dumpster SVG, passes, so it became `--series`. The chart redraws at the real container width instead of scaling a fixed viewBox, so axis text keeps its size on phones.

**Changes**

- `src/chart.js`: created.
- `src/debt.js`: added `yearEndSeries()` and `formatTrillions()`, each with a test.
- `index.html`: added the chart `<figure>` and the table markup.
- `src/app.js`: mounts the chart and table when data arrives, and hides the chart on error.
- `site.css`: added chart styles and tokens (`--series`, `--grid`, `--raised`).
- `CLAUDE.md`: added a chart section.

**Verification**

- `node --test`: 13 passed.
- Headless Chrome at 1280px and 375px:
  - **Rendering:** the SVG renders at 960×360 and 343×220 with the expected ticks.
  - **Hover:** hovering near March 2020 shows `$23.41T` for Feb 28, 2020.
  - **Keyboard:** focus shows the latest value (`$40.28T`, Oct 7, 2026). ArrowLeft moves to Sep 30, 2026, and Home to Jan 31, 2000.
  - **Table:** 27 rows, Dec 29, 2000 ($5,662,216,013,697) through Oct 7, 2026.
  - **Layout and console:** no horizontal scroll and no console errors.
- Screenshots were reviewed.

**Attempted Approach / Resolution**

The first render showed an empty pill under the chart. The hidden tooltip was still visible because `.chart-tooltip { display: grid }` overrode the `hidden` attribute. Fixed with a `[hidden] { display: none }` rule. The top plot margin was also cut from 24px to 12px.

### Interaction 7 — Milestone 3 committed; pause before milestone 4

**User Prompt**

> Only commit milestone 3

> I pushed the v1_prototpye branch and set it as upstream, but I may have lost the progress that was on the main branch.

**Agent Outcome**

Committed milestone 3 as `b4a581c` and did not start milestone 4. Checked the user's worry about lost work on `main` using the reflog, `git fsck` and `git ls-remote`. Nothing was lost. `main` never had commits of its own: it was unborn when `v1_prototype` was created, and the reflog shows all four commits on `v1_prototype`. Explained the options for publishing `main`.

**Collaboration**

The user chose to pause after milestone 3. The user then set up `main` themselves in a terminal. Afterwards, local `main` and `origin/main` both point at `b4a581c`.

### Interaction 8 — Fix: chart overflows the page on mobile

**User Prompt**

> I handled the changes on my end via a terminal. Create a new branch titled "/fix-UI-graph-error" to work where we will address the following:
>
> during an inspection of the deploy via the browser in localhost:8000, when the window is switched to a mobile screen (iPhone or Samsung), the landing page looks correct and is clickable, and correctly shrinks to the header. Once in view, the graph is not displaying correctly: it skews the view of the page to the left, away from the center. The graph should fit across the page without side scrolling for a better design and UX.
>
> Make the correction, detailing what needed changing, and log this into prompt-history.

**Agent Outcome**

Created branch `fix-UI-graph-error` from `main` (`b4a581c`). Git rejects a branch name that starts with `/`, so the slash was dropped.

Reproduced the bug in headless Chrome:

| Scenario | Before | After |
|---|---|---|
| Fresh load, iPhone 13 emulation (390px) | fits (chart 358px) | fits (358px) |
| Fresh load, Galaxy S9+ emulation (320px) | no scroll, but section 300px wide (gutters eaten) | 288px, correct 16px gutters |
| Chart open at 1280px → switch to 390px | **page 976px wide, chart stuck at 960px** | 390px, chart redrawn at 358px |
| Chart drawn at 1280px → landing → 390px → open | **page 976px wide, chart stuck at 960px** | 390px, chart redrawn at 358px |

This explains why the milestone 3 check at a fixed 375px passed. The bug needs the chart to have been drawn wider first, which is what switching DevTools to a phone does.

**Root cause:** the chart sits in nested CSS grids (`main` → `.debt` → `.chart` → `.chart-plot`). Grid items default to `min-width: auto`, so they can't shrink below their content's minimum width. The SVG keeps an explicit `width` attribute from its last render, `960`. That pins every ancestor column at 960px, so the page overflows to the right and looks shifted left. And because the container never gets narrower, the `ResizeObserver` in `mountDebtChart()` never fires and the chart never redraws at the new width.

**Fix (CSS only):**

`site.css`

```css
.debt { display: none; width: min(960px, 100%); min-width: 0; text-align: center; }
.chart { margin: 2.5rem 0 0; display: grid; gap: .75rem; min-width: 0; }
.chart-plot { position: relative; min-width: 0; min-height: 220px; touch-action: pan-y; }
/* Scales the previous render down for the frame before the ResizeObserver redraws it. */
.chart-svg { display: block; max-width: 100%; height: auto; overflow: visible; }
```

- `min-width: 0` on the three grid items lets the columns shrink to the viewport. The `ResizeObserver` then sees the new width and redraws the chart at the real pixel size.
- `max-width: 100%; height: auto` on the SVG scales the old render proportionally through its `viewBox` for the one frame before the redraw, so the page never overflows even briefly.

**Changes**

- `site.css`: `min-width: 0` on `.debt`, `.chart` and `.chart-plot`; `max-width: 100%; height: auto` on `.chart-svg`; a comment explaining why.
- `CLAUDE.md`: added a chart gotcha. Grid ancestors of the SVG need `min-width: 0`, and narrow-screen layout has to be tested by resizing down from desktop, not only by a fresh phone-width load.

**Verification**

- Re-ran the four scenarios above in headless Chrome using Playwright's built-in `iPhone 13` and `Galaxy S9+` device profiles. All fit with `scrollWidth == innerWidth`.
- Round trip 390 → 1280 → 768 → 390px with the chart open: it redraws at 960, 736 and 358px, never scrolls sideways, and stays centered (screenshot reviewed).
- Desktop regression at 1280px: the chart is still 960×360, the hover tooltip still reads `$23.41T · Feb 28, 2020`, and there are no console errors.
- No JS changed, so `node --test` was not affected and was not re-run.
- Not tested on a physical iPhone or Samsung device, only Chrome's device emulation.

### Interaction 9 — Fix committed; Milestone 4: error retry, reduced motion, final docs

**User Prompt**

> commit the fix

> The fix branch was pushed, and merged to main. Begin milestone 4 on a new branch off main titled "v2_refinement"

**Agent Outcome**

Committed the mobile fix as `2c7f7fe` on `fix-UI-graph-error`. The user pushed it and merged it into `main` as PR #1 (merge commit `70d6ee5`). Created `v2_refinement` from that `main` and built milestone 4. It is not committed yet and is waiting for review.

- **Retryable loading:** `load()` replaces the one-shot fetch, with a 15 s `AbortSignal.timeout` so a hung request can't leave "Loading…" up forever. On failure the caption shows "Couldn't reach fiscaldata.treasury.gov." and a **Retry** button that calls `load()` again. On success, `render()` fills the caption, mounts the chart and table, shows the chart, and starts the ticker if the debt view is open.
- **Chart hidden until data arrives:** before, a user who clicked before the fetch finished saw an empty chart title and an empty table. The `<figure>` now starts `hidden`.
- **Fixed a latent bug found while reading the code:** `renderError()` set `hidden` on the chart, but `.chart { display: grid }` overrode the attribute, so the chart never hid. This was the same mechanism as the milestone 3 tooltip pill, and was found by reading the CSS, not by running the old code. A global `[hidden] { display: none !important }` now covers every element, and the tooltip-specific rule was removed.
- **Reduced motion audited:** no code changes were needed. The dumpster animations, the FLIP, and the fade-in are all off, and the ticker updates once a second.

**Changes**

- `src/app.js`: `load()`, `render()` and a rewritten `renderError()` with a Retry button (built with DOM APIs). `stopTicker` is now declared before the first `load()` call.
- `index.html`: the chart `<figure>` starts `hidden`.
- `site.css`: global `[hidden]` rule, `.retry` button styles, and removal of the `.chart-tooltip[hidden]` rule.
- `CLAUDE.md`: documented the load/retry/timeout flow, the `[hidden]` rule, the reduced-motion behavior, and the branch-per-change workflow with merges by the user's pull requests.

**Verification**

- `node --test`: 13 passed.
- Headless Chrome at 390px:
  - **Failure, then Retry:** the first API request was aborted through Playwright routing. The page showed `—`, the error message and Retry, with the chart hidden and the screen-reader summary set. Clicking Retry made a second request, after which the ticker showed a dollar amount, the chart was drawn, Retry was gone, and the caption was restored. The ticker then changed about 20 times per second. No page errors.
  - **Hung request:** with an API call that never responds, the page shows "Loading…" and no chart, then switches to the error state after about 15 s.
  - **Reduced motion** (`reducedMotion: 'reduce'`): the flame `animation-name` is `none`, the button has 0 Web Animations after the click, the `.debt` animation is `none`, and the ticker showed 3 distinct values in 3 s.
  - **Normal motion:** the flame animation is `dumpster-flicker`, and the ticker showed 20 distinct values in 1 s.
- **Regression:** all four mobile-resize scenarios from Interaction 8 still fit. Chart checks at 1280px and 375px pass: hover, keyboard, the 27-row table, no horizontal scroll, and no errors.

**Attempted Approach / Resolution**

The first error-state screenshot looked like the landing page. It was taken in the instant after the click, when the FLIP's first frame puts the dumpster back at its landing position and the debt section hasn't started fading in yet. Re-capturing after 600 ms showed the correct error state. This was a test-timing artifact, not a page bug.

### Interaction 10 — Milestone 4 committed; README

**User Prompt**

> commit milestone 4

> stop the local server

> Write a detailed README.md file for this project explaining its design (through the planning), how the APIs are utilized, and how to run it

**Agent Outcome**

- Committed milestone 4 as `ce6825d` on `v2_refinement`, which the user then pushed. It is not merged into `main` at the time of writing.
- Stopped the `python3 -m http.server 8000` process.
- Wrote [`README.md`](README.md) on `v2_refinement`, since it documents the finished milestone 4 code. Sections:
  - running and deploying;
  - how the page works (with a diagram);
  - how the Treasury API is used: endpoint, query parameters, response shape, parsing, the 5-interval calendar-time rate with a worked example using the 2026-10-08 rows (≈ $16.0B/day, compared with ≈ $22.4B/day for a per-record average), projection anchoring, downsampling, formatting, and CORS;
  - the four planning decisions and their reasoning;
  - visual design and the FLIP transition;
  - project structure and reuse of the dumpster component;
  - testing;
  - accessibility and reduced motion;
  - gotchas;
  - how the project was built.

**Rationale**

The README explains the *why* behind the user's planning decisions and the API usage. `CLAUDE.md` stays focused on what an agent needs to edit the code.

**Changes**

- `README.md`: created.

**Verification**

- Checked the README's claims against the code and the observed data. Two drafting errors were caught and fixed:
  - The minimum Node version had been "18+". The tests depend on Node's automatic ES-module detection, because the repo has no `package.json`, so the README now says 22.7+ or 20.19+.
  - The caption in the diagram showed `$40.28T`, but the page prints full dollars.
- Ran the README's commands. `node --test` passed 13 tests and the name-filtered run passed 3. `python3 -m http.server 8000` served `/`, `/asset/index.html` and `/src/app.js` with HTTP 200. The server was stopped afterwards.
- Did not test the `git clone` step or a deployment to a static host.
