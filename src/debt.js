// Pure data helpers for Treasury's Debt to the Penny dataset. No DOM access, so Node can test them.

export const DEBT_URL =
  'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny';

export const DAY_MS = 86_400_000;

// One request returns every business-day record since `since` (about 6,700 rows from 2000).
export function buildQuery(since = '2000-01-01') {
  const params = new URLSearchParams({
    filter: `record_date:gte:${since}`,
    fields: 'record_date,tot_pub_debt_out_amt',
    sort: 'record_date',
    'page[size]': '10000',
  });
  return `${DEBT_URL}?${params}`;
}

// API rows -> [{ date: ms at 00:00 UTC of record_date, value: dollars }], oldest first.
export function parseRows(rows) {
  return rows
    .map((row) => ({
      date: Date.parse(`${row.record_date}T00:00:00Z`),
      value: Number(row.tot_pub_debt_out_amt),
    }))
    .filter((point) => Number.isFinite(point.date) && Number.isFinite(point.value))
    .sort((a, b) => a.date - b.date);
}

export async function fetchDebtSeries({ since, fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(buildQuery(since), { signal });
  if (!response.ok) throw new Error(`fiscaldata responded ${response.status}`);
  const body = await response.json();
  return parseRows(body.data ?? []);
}

// Dollars per millisecond over the last `intervals` record-to-record steps. Uses elapsed calendar
// time, so a Friday -> Monday step counts as 3 days, not 1. Can be negative.
export function dailyRate(series, intervals = 5) {
  if (series.length < intervals + 1) {
    throw new RangeError(`need ${intervals + 1} records, got ${series.length}`);
  }
  const last = series.at(-1);
  const first = series.at(-1 - intervals);
  return (last.value - first.value) / (last.date - first.date);
}

// A record_date's amount is an end-of-day figure, so the projection starts at the following midnight UTC.
export function anchorTime(point) {
  return point.date + DAY_MS;
}

export function projectNow(series, rate, now = Date.now()) {
  const last = series.at(-1);
  return last.value + rate * (now - anchorTime(last));
}

// Last record of each UTC calendar month, for the chart.
export function monthlySeries(series) {
  const months = new Map();
  for (const point of series) {
    const d = new Date(point.date);
    months.set(d.getUTCFullYear() * 12 + d.getUTCMonth(), point);
  }
  return [...months.values()];
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

// Whole dollars: about $40T with cents is more digits than a double holds exactly.
export function formatUSD(value) {
  return usd.format(value);
}

const recordDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

// "Oct 7, 2026". Formatted in UTC so the record date never shifts with the viewer's timezone.
export function formatRecordDate(ms) {
  return recordDate.format(ms);
}

// "+$16.0B/day" from a dollars-per-ms rate.
export function formatRatePerDay(rate) {
  const perDay = rate * DAY_MS;
  const sign = perDay < 0 ? '−' : '+';
  return `${sign}$${(Math.abs(perDay) / 1e9).toFixed(1)}B/day`;
}
