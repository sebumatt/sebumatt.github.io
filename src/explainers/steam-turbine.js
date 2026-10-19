import { el, lede, notice, verdict } from './kit.js';

// Weighted technical evaluation: the viewer sets the weights, the ranking
// updates. Supplier scores are illustrative.
const CRITERIA = [
  { key: 'eff', label: 'Efficiency at the design point', w: 30 },
  { key: 'capex', label: 'Purchase price', w: 20 },
  { key: 'lead', label: 'Delivery time', w: 15 },
  { key: 'service', label: 'Local service', w: 15 },
  { key: 'comp', label: 'Spec compliance', w: 20 },
];
const SUPPLIERS = [
  { name: 'Supplier A', eff: 9, capex: 5, lead: 6, service: 8, comp: 9 },
  { name: 'Supplier B', eff: 7, capex: 9, lead: 8, service: 5, comp: 7 },
  { name: 'Supplier C', eff: 8, capex: 7, lead: 4, service: 9, comp: 8 },
];

export default function mount(root) {
  const weights = Object.fromEntries(CRITERIA.map((c) => [c.key, c.w]));
  const table = el('table', { class: 'x-table' });
  const v = verdict();
  const totalsRow = el('tr');
  const weightOut = {};

  const head = el('tr', {}, el('th', {}, 'Criterion'), el('th', { style: { width: '32%' } }, 'Weight'), SUPPLIERS.map((s) => el('th', {}, s.name)));
  const body = CRITERIA.map((c) => {
    const out = el('output', {}, `${c.w}%`);
    weightOut[c.key] = out;
    const input = el('input', { type: 'range', min: 0, max: 50, value: c.w, 'aria-label': `Weight for ${c.label}` });
    input.addEventListener('input', () => {
      weights[c.key] = +input.value;
      draw();
    });
    return el('tr', {}, el('td', {}, c.label), el('td', {}, input, ' ', out), SUPPLIERS.map((s) => el('td', {}, `${s[c.key]}/10`)));
  });
  table.append(el('thead', {}, head), el('tbody', {}, body), el('tfoot', {}, totalsRow));

  function draw() {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    for (const c of CRITERIA) weightOut[c.key].textContent = `${Math.round((weights[c.key] / sum) * 100)}%`;
    const totals = SUPPLIERS.map((s) => CRITERIA.reduce((a, c) => a + (s[c.key] * weights[c.key]) / sum, 0));
    const best = totals.indexOf(Math.max(...totals));
    totalsRow.replaceChildren(
      el('th', {}, 'Weighted score'),
      el('td'),
      totals.map((t, i) => el('td', { class: i === best ? 'win' : '' }, t.toFixed(2)))
    );
    v.set(true, `${SUPPLIERS[best].name} ranks first with these weights.`);
  }

  root.append(
    lede('A procurement specification only matters if the evaluation follows it. Weights are agreed before bids open, and then the scoring decides. Change the weights and see how the ranking moves.'),
    table,
    v.node,
    notice([
      'Make purchase price the heaviest weight and the cheapest bid moves up. That is why weights are fixed before anyone sees prices.',
      'The specification was written from scratch for a Tukes-regulated process plant, then followed through installation and commissioning on site.',
    ])
  );
  draw();
}
