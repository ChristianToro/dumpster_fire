// Hand-built SVG line chart of the debt since 2000, with a crosshair readout and a year-end table.
import { formatTrillions, formatRecordDate, formatUSD } from './debt.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARGIN = { top: 12, right: 12, bottom: 28, left: 48 };
const GRID_STEP = 10e12;
const START = Date.UTC(2000, 0, 1);

// Draws into `container` at its real pixel width and redraws on resize, so text never stretches.
export function mountDebtChart(container, points) {
  const first = points[0];
  const last = points.at(-1);
  const svg = svgEl('svg', {
    class: 'chart-svg',
    tabindex: 0,
    role: 'img',
    'aria-label':
      `Line chart of total public debt outstanding, from ${formatTrillions(first.value)} in ` +
      `${new Date(first.date).getUTCFullYear()} to ${formatTrillions(last.value)} on ${formatRecordDate(last.date)}. ` +
      'Use the arrow keys to read monthly values.',
  });
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.setAttribute('aria-live', 'polite');
  tooltip.hidden = true;
  const tooltipValue = document.createElement('strong');
  const tooltipDate = document.createElement('span');
  tooltip.append(tooltipValue, tooltipDate);
  container.replaceChildren(svg, tooltip);

  let scale = null;
  let active = null;
  let crosshair = null;

  function draw() {
    const width = container.clientWidth;
    if (!width) return; // Hidden (landing view); the ResizeObserver redraws once it has a size.
    const height = Math.round(Math.min(360, Math.max(220, width * 0.45)));
    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const yMax = Math.ceil(Math.max(...points.map((p) => p.value)) / 5e12) * 5e12;
    const x = (t) => MARGIN.left + ((t - START) / (last.date - START)) * plotW;
    const y = (v) => MARGIN.top + plotH - (v / yMax) * plotH;
    scale = { x, y, width };

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.replaceChildren();

    for (let v = 0; v <= yMax; v += GRID_STEP) {
      svg.append(
        svgEl('line', { class: 'chart-grid', x1: MARGIN.left, x2: width - MARGIN.right, y1: y(v), y2: y(v) }),
        svgText(formatTrillions(v, 0), { class: 'chart-axis', x: MARGIN.left - 8, y: y(v), 'text-anchor': 'end', 'dominant-baseline': 'middle' }),
      );
    }
    const yearStep = width < 480 ? 10 : 5;
    for (let year = 2000; Date.UTC(year, 0, 1) <= last.date; year += yearStep) {
      svg.append(svgText(String(year), { class: 'chart-axis', x: x(Date.UTC(year, 0, 1)), y: height - 8, 'text-anchor': 'middle' }));
    }

    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    svg.append(
      svgEl('path', { class: 'chart-area', d: `${line}L${x(last.date).toFixed(1)},${y(0)}L${x(first.date).toFixed(1)},${y(0)}Z` }),
      svgEl('path', { class: 'chart-line', d: line }),
      svgEl('circle', { class: 'chart-dot', cx: x(last.date), cy: y(last.value), r: 4 }),
      svgText(formatTrillions(last.value), { class: 'chart-end-label', x: x(last.date) - 10, y: y(last.value) + 4, 'text-anchor': 'end' }),
    );

    crosshair = svgEl('g', { class: 'chart-crosshair', visibility: 'hidden' });
    crosshair.append(
      svgEl('line', { class: 'chart-rule', y1: MARGIN.top, y2: MARGIN.top + plotH }),
      svgEl('circle', { class: 'chart-dot', r: 4 }),
    );
    svg.append(crosshair);
    if (active !== null) show(active);
  }

  function show(index) {
    active = Math.max(0, Math.min(points.length - 1, index));
    const point = points[active];
    const px = scale.x(point.date);
    const py = scale.y(point.value);
    const [rule, dot] = crosshair.children;
    rule.setAttribute('x1', px);
    rule.setAttribute('x2', px);
    dot.setAttribute('cx', px);
    dot.setAttribute('cy', py);
    crosshair.setAttribute('visibility', 'visible');

    tooltipValue.textContent = formatTrillions(point.value, 2);
    tooltipDate.textContent = formatRecordDate(point.date);
    tooltip.hidden = false;
    const half = tooltip.offsetWidth / 2;
    tooltip.style.left = `${Math.max(0, Math.min(scale.width - 2 * half, px - half))}px`;
    tooltip.style.top = `${Math.max(0, py - tooltip.offsetHeight - 12)}px`;
  }

  function hide() {
    active = null;
    crosshair?.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  }

  // The crosshair snaps to the nearest month, so the pointer only has to be near a date.
  function nearestIndex(clientX) {
    const left = svg.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(scale.x(points[i].date) + left - clientX) < Math.abs(scale.x(points[best].date) + left - clientX)) best = i;
    }
    return best;
  }

  svg.addEventListener('pointermove', (event) => scale && show(nearestIndex(event.clientX)));
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('blur', hide);
  svg.addEventListener('focus', () => scale && show(active ?? points.length - 1));
  svg.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -12, PageUp: 12 }[event.key];
    if (step) show((active ?? points.length - 1) + step);
    else if (event.key === 'Home') show(0);
    else if (event.key === 'End') show(points.length - 1);
    else if (event.key === 'Escape') hide();
    else return;
    event.preventDefault();
  });

  new ResizeObserver(draw).observe(container);
}

// Fills `tbody` with one row per year: the table view carries every value the chart shows.
export function renderYearTable(tbody, yearEnds) {
  tbody.replaceChildren(
    ...yearEnds.map((point) => {
      const row = document.createElement('tr');
      const date = document.createElement('td');
      const value = document.createElement('td');
      date.textContent = formatRecordDate(point.date);
      value.textContent = formatUSD(point.value);
      row.append(date, value);
      return row;
    }),
  );
}

function svgEl(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function svgText(text, attrs) {
  const node = svgEl('text', attrs);
  node.textContent = text;
  return node;
}
