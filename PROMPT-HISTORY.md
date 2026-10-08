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
