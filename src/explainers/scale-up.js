import { el, lede, slider, controls, readout, steps, chart, C } from './kit.js';

// Capacity planning: how many stations a target output needs, and the gates
// every new piece of equipment passes before it runs volume.
export default function mount(root) {
  const KW_PER_STACK = 5; // representative
  const STACKS_PER_STATION_YEAR = 400; // representative, after OEE
  const target = slider({ label: 'Annual output target', min: 0.05, max: 20, step: 0.05, value: 2, format: (v) => (v < 1 ? `${Math.round(v * 1000)} kW` : `${v.toFixed(1)} MW`), onInput: draw });
  const oee = slider({ label: 'Overall equipment effectiveness', min: 40, max: 90, value: 65, format: (v) => `${v}%`, onInput: draw });
  const out = readout([
    ['stacks', 'Stacks per year'],
    ['stations', 'Assembly stations'],
    ['shifts', 'Shift pattern'],
  ]);
  const c = chart({ x: [0, 20], y: [0, 30], xLabel: 'Output (MW per year)', yLabel: 'Stations', xFmt: (v) => v, yFmt: (v) => v });

  function stationsFor(mw, e) {
    const stacks = (mw * 1000) / KW_PER_STACK;
    return Math.ceil(stacks / (STACKS_PER_STATION_YEAR * (e / 65)));
  }

  function draw() {
    const mw = target.value;
    const stacks = Math.round((mw * 1000) / KW_PER_STACK);
    const n = stationsFor(mw, oee.value);
    out.set('stacks', stacks.toLocaleString('en-US'));
    out.set('stations', String(n));
    out.set('shifts', n <= 2 ? 'One shift' : n <= 8 ? 'Two shifts' : 'Three shifts, plan for redundancy');
    const pts = [];
    for (let x = 0.05; x <= 20; x += 0.1) pts.push([x, stationsFor(x, oee.value)]);
    c.draw({ series: [{ pts, color: C.gold, label: `Stations at ${oee.value}% OEE` }], marks: [{ x: mw, y: n, color: C.cyan, label: `${n}` }] });
  }

  const gates = steps([
    { title: 'Specify', body: 'Write specifications for each station and utility: assembly stations, pumps, blowers, heat exchangers, mixers and imaging systems.' },
    { title: 'Qualify the supplier', body: 'Qualification plan, process audit and agreed component traceability before any order is released.' },
    { title: 'First article inspection', body: 'The first parts are measured against every drawing requirement. Nothing ships in volume until FAI is closed.' },
    { title: 'IQ, OQ, PQ', body: 'Installation qualification (is it installed right?), operational (does it work across its range?), performance (does it make good parts, repeatably, in production?).' },
    { title: 'PFMEA and control plan', body: 'Rank what can go wrong in each critical process and decide how it is measured and controlled on the shop floor.' },
  ]);

  root.append(
    lede('Going from a kilowatt pilot to megawatt production is first a counting problem: how many stations, how many shifts. Then every new machine goes through the same gates before it is trusted.'),
    controls(target.node, oee.node),
    out.node,
    c.node,
    el('h4', { class: 'x-step-title' }, 'The path every new machine follows'),
    gates.node
  );
  draw();
}
