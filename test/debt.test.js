import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  buildQuery,
  parseRows,
  fetchDebtSeries,
  dailyRate,
  anchorTime,
  projectNow,
  monthlySeries,
  formatUSD,
  formatRatePerDay,
  formatRecordDate,
} from '../src/debt.js';

// Real rows from the API, fetched 2026-10-08 (newest first, as returned with sort=-record_date).
const ROWS = [
  { record_date: '2026-10-07', tot_pub_debt_out_amt: '40284036147367.19' },
  { record_date: '2026-10-06', tot_pub_debt_out_amt: '40273024579219.17' },
  { record_date: '2026-10-05', tot_pub_debt_out_amt: '40249104431078.48' },
  { record_date: '2026-10-02', tot_pub_debt_out_amt: '40242446619209.33' },
  { record_date: '2026-10-01', tot_pub_debt_out_amt: '40260641972390.03' },
  { record_date: '2026-09-30', tot_pub_debt_out_amt: '40171825101340.31' },
  { record_date: '2026-09-29', tot_pub_debt_out_amt: '40096954633566.68' },
];
const series = parseRows(ROWS);

test('buildQuery requests total public debt since 2000 in one page', () => {
  const url = new URL(buildQuery());
  assert.equal(url.searchParams.get('filter'), 'record_date:gte:2000-01-01');
  assert.equal(url.searchParams.get('fields'), 'record_date,tot_pub_debt_out_amt');
  assert.equal(url.searchParams.get('sort'), 'record_date');
  assert.equal(url.searchParams.get('page[size]'), '10000');
});

test('parseRows converts strings and sorts oldest first', () => {
  assert.equal(series.length, 7);
  assert.equal(series[0].date, Date.UTC(2026, 8, 29));
  assert.equal(series.at(-1).date, Date.UTC(2026, 9, 7));
  assert.equal(series.at(-1).value, 40284036147367.19);
});

test('parseRows drops malformed rows', () => {
  const parsed = parseRows([...ROWS, { record_date: 'bad', tot_pub_debt_out_amt: 'null' }]);
  assert.equal(parsed.length, 7);
});

test('dailyRate uses calendar time across the weekend gap', () => {
  // Sep 30 -> Oct 7 is 5 records but 7 calendar days.
  const perDay = dailyRate(series) * DAY_MS;
  const expected = (40284036147367.19 - 40171825101340.31) / 7;
  assert.ok(Math.abs(perDay - expected) < 1, `${perDay} vs ${expected}`);
  assert.equal(formatRatePerDay(dailyRate(series)), '+$16.0B/day');
});

test('dailyRate goes negative when the debt fell over the window', () => {
  const falling = parseRows([
    { record_date: '2026-01-05', tot_pub_debt_out_amt: '100000000000' },
    { record_date: '2026-01-06', tot_pub_debt_out_amt: '90000000000' },
  ]);
  assert.ok(dailyRate(falling, 1) < 0);
  assert.equal(formatRatePerDay(dailyRate(falling, 1)), '−$10.0B/day');
});

test('dailyRate throws when there are too few records', () => {
  assert.throws(() => dailyRate(series.slice(0, 5)), RangeError);
});

test('projectNow starts at the latest value at the anchor and grows by the rate', () => {
  const rate = dailyRate(series);
  const anchor = anchorTime(series.at(-1));
  assert.equal(anchor, Date.UTC(2026, 9, 8));
  assert.equal(projectNow(series, rate, anchor), series.at(-1).value);
  const oneDayLater = projectNow(series, rate, anchor + DAY_MS);
  assert.ok(Math.abs(oneDayLater - (series.at(-1).value + rate * DAY_MS)) < 0.01);
});

test('monthlySeries keeps the last record of each month', () => {
  const monthly = monthlySeries(series);
  assert.deepEqual(
    monthly.map((p) => new Date(p.date).toISOString().slice(0, 10)),
    ['2026-09-30', '2026-10-07'],
  );
});

test('formatUSD shows whole dollars', () => {
  assert.equal(formatUSD(40284036147367.19), '$40,284,036,147,367');
});

test('formatRecordDate uses the UTC calendar date', () => {
  assert.equal(formatRecordDate(series.at(-1).date), 'Oct 7, 2026');
});

test('fetchDebtSeries parses the response and rejects HTTP errors', async () => {
  let requested;
  const ok = async (url) => {
    requested = url;
    return { ok: true, json: async () => ({ data: ROWS }) };
  };
  const result = await fetchDebtSeries({ fetchImpl: ok });
  assert.equal(requested, buildQuery());
  assert.equal(result.length, 7);

  const failing = async () => ({ ok: false, status: 503 });
  await assert.rejects(fetchDebtSeries({ fetchImpl: failing }), /503/);
});
