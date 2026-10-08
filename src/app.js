// Page wiring: view switching, the dumpster's shrink transition, and the live debt ticker.
import {
  fetchDebtSeries,
  dailyRate,
  projectNow,
  formatUSD,
  formatRatePerDay,
  formatRecordDate,
} from './debt.js';

const SOURCE_URL = 'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const body = document.body;
const button = document.querySelector('.dumpster-button');
const ticker = document.querySelector('.ticker');
const summary = document.querySelector('[data-ticker-summary]');
const caption = document.querySelector('[data-caption]');

// Start fetching on load so the data is usually ready before the first click.
const data = fetchDebtSeries().then((series) => ({ series, rate: dailyRate(series) }));
data.then(renderCaption, renderError);

let stopTicker = () => {};

button.addEventListener('click', () => {
  const showDebt = body.dataset.view !== 'debt';
  flip(button, () => {
    body.dataset.view = showDebt ? 'debt' : 'landing';
  });
  button.setAttribute('aria-label', showDebt ? 'Back to the dumpster' : 'Show the current US national debt');
  if (showDebt) data.then(startTicker, () => {});
  else stopTicker();
});

function startTicker({ series, rate }) {
  if (body.dataset.view !== 'debt') return;
  stopTicker();
  const draw = () => {
    ticker.textContent = formatUSD(projectNow(series, rate));
  };
  draw();
  if (reducedMotion.matches) {
    const id = setInterval(draw, 1000);
    stopTicker = () => clearInterval(id);
  } else {
    let id = requestAnimationFrame(function frame() {
      draw();
      id = requestAnimationFrame(frame);
    });
    stopTicker = () => cancelAnimationFrame(id);
  }
}

function renderCaption({ series, rate }) {
  const latest = series.at(-1);
  const official = formatUSD(latest.value);
  const date = formatRecordDate(latest.date);
  const perDay = formatRatePerDay(rate);
  // Every interpolated value comes from our own number/date formatters, never raw API text.
  caption.innerHTML =
    `<span><span class="rate">${perDay}</span> · 5-day average</span>` +
    `<span>Official ${official} · ${date}</span>` +
    `<span>Source: Treasury's <a href="${SOURCE_URL}" target="_blank" rel="noopener">Debt to the Penny</a></span>`;
  summary.textContent = `Official figure ${official} on ${date}, changing about ${perDay}.`;
}

function renderError() {
  ticker.textContent = '—';
  caption.textContent = "Couldn't reach fiscaldata.treasury.gov.";
  summary.textContent = 'The debt figure could not be loaded.';
}

// FLIP: apply the layout change, then animate the element from its old box to its new one.
function flip(element, change) {
  const first = element.getBoundingClientRect();
  change();
  if (reducedMotion.matches) return;
  const last = element.getBoundingClientRect();
  element.animate(
    [
      {
        transformOrigin: 'top left',
        transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width})`,
      },
      { transformOrigin: 'top left', transform: 'none' },
    ],
    { duration: 450, easing: 'cubic-bezier(.2, .7, .2, 1)' },
  );
}
