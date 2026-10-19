import { lede, slider, controls, readout, chart, notice, C } from './kit.js';

// Unit cost against annual volume for making parts in-house (two processes)
// or buying them. Representative numbers.
const FB = { tooling: 180000, var: 0.9 }; // fine blanking
const HF = { tooling: 420000, var: 0.55 }; // hydroforming
const SCRAP_PROCESSING = 0.08; // € per scrapped part handled

export default function mount(root) {
  const vol = slider({ label: 'Annual volume', min: 20000, max: 1000000, step: 10000, value: 300000, format: (v) => `${(v / 1000).toFixed(0)}k parts`, onInput: draw });
  const scrap = slider({ label: 'Scrap rate in-house', min: 0, max: 20, step: 0.5, value: 6, format: (v) => `${v}%`, onInput: draw });
  const buy = slider({ label: 'Supplier price incl. logistics', min: 0.8, max: 3, step: 0.05, value: 1.6, format: (v) => `€${v.toFixed(2)}`, onInput: draw });
  const out = readout([
    ['best', 'Cheapest at this volume'],
    ['makeBuy', 'Make beats buy above'],
    ['hf', 'Hydroforming beats fine blanking above'],
  ]);
  const c = chart({ x: [20000, 1000000], y: [0, 5], xLabel: 'Annual volume (parts)', yLabel: '€ per good part', xFmt: (x) => `${Math.round(x / 1000)}k`, yFmt: (y) => `€${y}` });

  const unit = (p, v, s) => p.tooling / 5 / v + p.var / (1 - s) + (s / (1 - s)) * SCRAP_PROCESSING;

  function crossing(f, g) {
    for (let v = 20000; v <= 1000000; v += 2000) if (f(v) <= g(v)) return v;
    return null;
  }

  function draw() {
    const s = scrap.value / 100;
    const fb = (v) => unit(FB, v, s);
    const hf = (v) => unit(HF, v, s);
    const make = (v) => Math.min(fb(v), hf(v));
    const b = () => buy.value;
    const series = (f) => {
      const pts = [];
      for (let v = 20000; v <= 1000000; v += 10000) pts.push([v, f(v)]);
      return pts;
    };
    const v = vol.value;
    const options = [
      ['Make, fine blanking', fb(v)],
      ['Make, hydroforming', hf(v)],
      ['Buy', b()],
    ].sort((a, b2) => a[1] - b2[1]);
    out.set('best', `${options[0][0]} (€${options[0][1].toFixed(2)})`);
    const mb = crossing(make, b);
    out.set('makeBuy', mb ? `${Math.round(mb / 1000)}k parts/yr` : 'Not in this range');
    const th = crossing(hf, fb);
    out.set('hf', th ? `${Math.round(th / 1000)}k parts/yr` : 'Not in this range');
    c.draw({
      series: [
        { pts: series(fb), color: C.gold, label: 'Make, fine blanking' },
        { pts: series(hf), color: C.copper, label: 'Make, hydroforming' },
        { pts: series(b), color: C.cyan, dash: '6 5', label: 'Buy' },
      ],
      vlines: [{ x: v, color: C.frost, label: 'your volume' }],
    });
  }

  root.append(
    lede('Making a part spreads the tooling over every piece you make; buying it costs the same per piece at any volume. Scrap quietly raises the cost of every good part. Find where the lines cross.'),
    controls(vol.node, scrap.node, buy.node),
    c.node,
    out.node,
    notice([
      'Raise scrap and both make lines lift; the make-or-buy threshold moves to higher volume.',
      'Hydroforming has dearer tooling but cheaper parts. It only pays off past its threshold volume.',
      'The real study also weighed lead time, tolerance control and how fast capacity can ramp.',
    ])
  );
  draw();
}
